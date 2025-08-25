import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = vi.fn();
const mockFetch = fetch as MockedFunction<typeof fetch>;

// Mock WebSocket for integration tests
const mockWebSocket = vi.fn();
global.WebSocket = mockWebSocket as any;

// Mock console methods to avoid test noise
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
};

describe('Instance Creation Error Integration Tests', () => {
  const mockApiBaseUrl = 'http://localhost:3001/api';
  const mockWebSocketUrl = 'ws://localhost:3001';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default WebSocket mock
    mockWebSocket.mockImplementation(() => ({
      close: vi.fn(),
      send: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      readyState: 1, // OPEN
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('API Endpoint Unavailable Tests', () => {
    it('should handle server not running scenario', async () => {
      // Mock fetch to simulate server not running
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const createInstance = async (instanceName: string) => {
        try {
          const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: instanceName })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          return await response.json();
        } catch (error) {
          if (error instanceof TypeError && error.message === 'Failed to fetch') {
            throw new Error('Server is not running or unreachable');
          }
          throw error;
        }
      };

      await expect(createInstance('test-instance')).rejects.toThrow('Server is not running or unreachable');
      expect(mockFetch).toHaveBeenCalledWith(`${mockApiBaseUrl}/claude-instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-instance' })
      });
    });

    it('should handle 404 endpoint not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Endpoint not found' })
      } as Response);

      const createInstance = async (instanceName: string) => {
        const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: instanceName })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`API Error ${response.status}: ${errorData.error || response.statusText}`);
        }

        return await response.json();
      };

      await expect(createInstance('test-instance')).rejects.toThrow('API Error 404: Endpoint not found');
    });

    it('should handle 500 internal server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ 
          error: 'Internal server error',
          details: 'Claude CLI service unavailable'
        })
      } as Response);

      const createInstance = async (instanceName: string) => {
        const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: instanceName })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Server Error: ${errorData.details || errorData.error}`);
        }

        return await response.json();
      };

      await expect(createInstance('test-instance')).rejects.toThrow('Server Error: Claude CLI service unavailable');
    });

    it('should handle CORS policy errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch due to CORS policy'));

      const createInstance = async (instanceName: string) => {
        try {
          const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: instanceName })
          });
          return await response.json();
        } catch (error) {
          if (error instanceof TypeError && error.message.includes('CORS')) {
            throw new Error('CORS policy blocked the request. Check server configuration.');
          }
          throw error;
        }
      };

      await expect(createInstance('test-instance')).rejects.toThrow('CORS policy blocked the request');
    });
  });

  describe('Invalid Request Format Tests', () => {
    it('should handle 400 bad request for missing required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ 
          error: 'Validation failed',
          details: 'Instance name is required'
        })
      } as Response);

      const createInstance = async (requestData: any) => {
        const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Validation Error: ${errorData.details}`);
        }

        return await response.json();
      };

      await expect(createInstance({})).rejects.toThrow('Validation Error: Instance name is required');
    });

    it('should handle invalid JSON payload', async () => {
      const createInstanceWithInvalidJson = async () => {
        try {
          const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: 'invalid-json-string{'
          });
          return await response.json();
        } catch (error) {
          throw new Error('Invalid request payload');
        }
      };

      // Mock fetch to simulate JSON parse error
      mockFetch.mockRejectedValueOnce(new SyntaxError('Unexpected token in JSON'));

      await expect(createInstanceWithInvalidJson()).rejects.toThrow('Invalid request payload');
    });

    it('should validate instance name format', async () => {
      const validateInstanceName = (name: string): { valid: boolean; error?: string } => {
        if (!name || name.trim().length === 0) {
          return { valid: false, error: 'Instance name cannot be empty' };
        }
        if (name.length > 50) {
          return { valid: false, error: 'Instance name must be 50 characters or less' };
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
          return { valid: false, error: 'Instance name can only contain letters, numbers, hyphens, and underscores' };
        }
        return { valid: true };
      };

      expect(validateInstanceName('')).toEqual({ valid: false, error: 'Instance name cannot be empty' });
      expect(validateInstanceName('a'.repeat(51))).toEqual({ valid: false, error: 'Instance name must be 50 characters or less' });
      expect(validateInstanceName('invalid name!')).toEqual({ valid: false, error: 'Instance name can only contain letters, numbers, hyphens, and underscores' });
      expect(validateInstanceName('valid-name-123')).toEqual({ valid: true });
    });
  });

  describe('Network Timeout Scenarios', () => {
    it('should handle request timeout', async () => {
      const timeoutMs = 5000;

      const createInstanceWithTimeout = async (instanceName: string, timeout: number) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: instanceName }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return await response.json();
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeout}ms`);
          }
          throw error;
        }
      };

      // Mock a fetch that never resolves
      mockFetch.mockImplementation(() => new Promise(() => {}));

      await expect(createInstanceWithTimeout('test-instance', 100))
        .rejects.toThrow('Request timed out after 100ms');
    });

    it('should handle slow network responses', async () => {
      const slowResponseTime = 3000;
      
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ id: 'slow-instance', status: 'created' })
            } as Response);
          }, slowResponseTime);
        })
      );

      const startTime = Date.now();
      const result = await fetch(`${mockApiBaseUrl}/claude-instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'slow-instance' })
      });
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeGreaterThan(slowResponseTime - 100); // Allow for some variance
      expect(await result.json()).toEqual({ id: 'slow-instance', status: 'created' });
    });

    it('should implement retry logic for network failures', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const createInstanceWithRetry = async (instanceName: string, retries = maxRetries): Promise<any> => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          attemptCount++;
          try {
            const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: instanceName })
            });

            if (response.ok) {
              return await response.json();
            }
            
            if (attempt === retries) {
              throw new Error(`Failed after ${retries + 1} attempts`);
            }
          } catch (error) {
            if (attempt === retries) {
              throw new Error(`Network error after ${retries + 1} attempts: ${error}`);
            }
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }
      };

      // Mock first 2 calls to fail, third to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'retry-success', status: 'created' })
        } as Response);

      const result = await createInstanceWithRetry('retry-test');
      expect(result).toEqual({ id: 'retry-success', status: 'created' });
      expect(attemptCount).toBe(3);
    });
  });

  describe('Server Error Response Handling', () => {
    it('should handle 503 service unavailable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Retry-After': '60'
        }),
        json: async () => ({ 
          error: 'Service temporarily unavailable',
          retryAfter: 60
        })
      } as Response);

      const createInstance = async (instanceName: string) => {
        const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: instanceName })
        });

        if (response.status === 503) {
          const errorData = await response.json();
          const retryAfter = response.headers.get('Retry-After') || errorData.retryAfter;
          throw new Error(`Service unavailable. Retry after ${retryAfter} seconds.`);
        }

        return await response.json();
      };

      await expect(createInstance('test-instance'))
        .rejects.toThrow('Service unavailable. Retry after 60 seconds.');
    });

    it('should handle 429 rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + 60000)
        }),
        json: async () => ({ 
          error: 'Rate limit exceeded',
          limit: 10,
          resetTime: Date.now() + 60000
        })
      } as Response);

      const createInstance = async (instanceName: string) => {
        const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: instanceName })
        });

        if (response.status === 429) {
          const limit = response.headers.get('X-RateLimit-Limit');
          const resetTime = response.headers.get('X-RateLimit-Reset');
          const resetDate = new Date(parseInt(resetTime || '0'));
          throw new Error(`Rate limit of ${limit} requests exceeded. Resets at ${resetDate.toISOString()}.`);
        }

        return await response.json();
      };

      await expect(createInstance('test-instance'))
        .rejects.toMatch(/Rate limit of 10 requests exceeded/);
    });

    it('should handle unexpected server responses', async () => {
      // Mock a response with invalid JSON
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        }
      } as Response);

      const createInstance = async (instanceName: string) => {
        try {
          const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: instanceName })
          });

          if (response.ok) {
            return await response.json();
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            throw new Error('Server returned invalid response format');
          }
          throw error;
        }
      };

      await expect(createInstance('test-instance'))
        .rejects.toThrow('Server returned invalid response format');
    });
  });

  describe('WebSocket Integration Error Handling', () => {
    it('should handle WebSocket connection failure after instance creation', async () => {
      // Mock successful instance creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          id: 'instance-123',
          status: 'created',
          websocketUrl: `${mockWebSocketUrl}/instance-123`
        })
      } as Response);

      // Mock WebSocket connection failure
      mockWebSocket.mockImplementation(() => {
        const ws = {
          close: vi.fn(),
          send: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          readyState: 3, // CLOSED
          CONNECTING: 0,
          OPEN: 1,
          CLOSING: 2,
          CLOSED: 3
        };

        // Simulate immediate connection failure
        setTimeout(() => {
          const errorEvent = new Event('error');
          ws.addEventListener.mock.calls
            .filter(([event]) => event === 'error')
            .forEach(([, callback]) => callback(errorEvent));
        }, 0);

        return ws;
      });

      const createInstanceWithWebSocket = async (instanceName: string) => {
        // Create instance via API
        const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: instanceName })
        });

        const instanceData = await response.json();

        // Attempt WebSocket connection
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(instanceData.websocketUrl);
          
          ws.addEventListener('open', () => resolve({
            instance: instanceData,
            websocket: ws
          }));

          ws.addEventListener('error', () => reject(
            new Error('Failed to establish WebSocket connection to instance')
          ));
        });
      };

      await expect(createInstanceWithWebSocket('test-instance'))
        .rejects.toThrow('Failed to establish WebSocket connection to instance');
    });

    it('should handle partial system failures gracefully', async () => {
      const systemState = {
        apiAvailable: true,
        websocketAvailable: false,
        instanceCreated: false,
        connectionEstablished: false
      };

      const attemptFullInstanceCreation = async (instanceName: string) => {
        try {
          // Step 1: Create instance via API
          if (!systemState.apiAvailable) {
            throw new Error('API service unavailable');
          }

          const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: instanceName })
          });

          if (!response.ok) {
            throw new Error('Failed to create instance');
          }

          systemState.instanceCreated = true;
          const instanceData = await response.json();

          // Step 2: Establish WebSocket connection
          if (!systemState.websocketAvailable) {
            return {
              instance: instanceData,
              status: 'partial',
              warning: 'Instance created but WebSocket connection failed. Terminal functionality limited.'
            };
          }

          systemState.connectionEstablished = true;
          return {
            instance: instanceData,
            status: 'complete',
            message: 'Instance created and connected successfully'
          };

        } catch (error) {
          return {
            instance: null,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      };

      // Mock successful API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'partial-instance', status: 'created' })
      } as Response);

      const result = await attemptFullInstanceCreation('partial-test');
      
      expect(result.status).toBe('partial');
      expect(result.warning).toContain('WebSocket connection failed');
      expect(systemState.instanceCreated).toBe(true);
      expect(systemState.connectionEstablished).toBe(false);
    });
  });

  describe('Error Recovery and Cleanup', () => {
    it('should clean up resources on creation failure', async () => {
      const resourceTracker = {
        createdInstances: [] as string[],
        openConnections: [] as WebSocket[],
        
        async createInstance(name: string) {
          try {
            const response = await fetch(`${mockApiBaseUrl}/claude-instances`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });

            if (!response.ok) {
              throw new Error('Instance creation failed');
            }

            const instance = await response.json();
            this.createdInstances.push(instance.id);
            return instance;
          } catch (error) {
            // Cleanup any partial resources
            await this.cleanup();
            throw error;
          }
        },

        async cleanup() {
          // Close any open WebSocket connections
          this.openConnections.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          });

          // Attempt to delete any created instances
          for (const instanceId of this.createdInstances) {
            try {
              await fetch(`${mockApiBaseUrl}/claude-instances/${instanceId}`, {
                method: 'DELETE'
              });
            } catch (error) {
              console.warn(`Failed to cleanup instance ${instanceId}`);
            }
          }

          this.createdInstances = [];
          this.openConnections = [];
        }
      };

      // Mock failed instance creation
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(resourceTracker.createInstance('cleanup-test'))
        .rejects.toThrow('Instance creation failed');

      expect(resourceTracker.createdInstances).toHaveLength(0);
      expect(resourceTracker.openConnections).toHaveLength(0);
    });
  });
});
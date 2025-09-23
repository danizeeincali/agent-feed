import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock WebSocket globally
const mockWebSocket = vi.fn();
const mockWebSocketInstance = {
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

global.WebSocket = mockWebSocket as any;

// Mock the components we'll be testing
vi.mock('../../src/components/SimpleLauncher', () => ({
  default: vi.fn(() => 'div')
}));

describe('WebSocket Error Handling', () => {
  let mockOnOpen: MockedFunction<any>;
  let mockOnError: MockedFunction<any>;
  let mockOnClose: MockedFunction<any>;
  let mockOnMessage: MockedFunction<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnOpen = vi.fn();
    mockOnError = vi.fn();
    mockOnClose = vi.fn();
    mockOnMessage = vi.fn();
    
    mockWebSocket.mockImplementation(() => {
      const ws = { ...mockWebSocketInstance };
      ws.addEventListener = vi.fn((event, callback) => {
        switch (event) {
          case 'open':
            mockOnOpen.mockImplementation(callback);
            break;
          case 'error':
            mockOnError.mockImplementation(callback);
            break;
          case 'close':
            mockOnClose.mockImplementation(callback);
            break;
          case 'message':
            mockOnMessage.mockImplementation(callback);
            break;
        }
      });
      return ws;
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Connection Failure Scenarios', () => {
    it('should handle WebSocket connection failure on initial connect', async () => {
      // Simulate connection failure
      const errorEvent = new Event('error');
      
      // Create a mock WebSocket connection utility
      const createWebSocketConnection = (url: string) => {
        const ws = new WebSocket(url);
        return new Promise((resolve, reject) => {
          ws.addEventListener('open', () => resolve(ws));
          ws.addEventListener('error', (error) => reject(error));
        });
      };

      // Test connection failure
      mockWebSocket.mockImplementation(() => {
        const ws = { ...mockWebSocketInstance };
        ws.readyState = WebSocket.CLOSED;
        setTimeout(() => mockOnError(errorEvent), 0);
        return ws;
      });

      await expect(createWebSocketConnection('ws://localhost:3001')).rejects.toThrow();
      expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:3001');
    });

    it('should handle network timeout during connection', async () => {
      const timeoutMs = 5000;
      
      const createWebSocketWithTimeout = (url: string, timeout: number) => {
        return new Promise((resolve, reject) => {
          const ws = new WebSocket(url);
          const timeoutId = setTimeout(() => {
            ws.close();
            reject(new Error('Connection timeout'));
          }, timeout);

          ws.addEventListener('open', () => {
            clearTimeout(timeoutId);
            resolve(ws);
          });

          ws.addEventListener('error', () => {
            clearTimeout(timeoutId);
            reject(new Error('Connection failed'));
          });
        });
      };

      // Mock a connection that never opens
      mockWebSocket.mockImplementation(() => {
        const ws = { ...mockWebSocketInstance };
        ws.readyState = WebSocket.CONNECTING;
        // Never trigger open event to simulate timeout
        return ws;
      });

      await expect(
        createWebSocketWithTimeout('ws://localhost:3001', 100)
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle connection refused error', async () => {
      const connectionRefusedError = {
        type: 'error',
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      };

      mockWebSocket.mockImplementation(() => {
        const ws = { ...mockWebSocketInstance };
        ws.readyState = WebSocket.CLOSED;
        setTimeout(() => mockOnError(connectionRefusedError), 0);
        return ws;
      });

      const ws = new WebSocket('ws://localhost:3001');
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(connectionRefusedError);
      });
    });
  });

  describe('Reconnection Logic', () => {
    it('should implement exponential backoff for reconnection attempts', async () => {
      let reconnectAttempts = 0;
      const maxRetries = 3;
      const baseDelay = 1000;

      const reconnectWithBackoff = async (url: string, attempt = 0): Promise<WebSocket> => {
        if (attempt >= maxRetries) {
          throw new Error('Max reconnection attempts reached');
        }

        try {
          reconnectAttempts++;
          const ws = new WebSocket(url);
          return new Promise((resolve, reject) => {
            ws.addEventListener('open', () => resolve(ws));
            ws.addEventListener('error', async () => {
              const delay = baseDelay * Math.pow(2, attempt);
              await new Promise(resolve => setTimeout(resolve, delay));
              try {
                const retryWs = await reconnectWithBackoff(url, attempt + 1);
                resolve(retryWs);
              } catch (error) {
                reject(error);
              }
            });
          });
        } catch (error) {
          throw error;
        }
      };

      // Mock consecutive failures then success
      let callCount = 0;
      mockWebSocket.mockImplementation(() => {
        callCount++;
        const ws = { ...mockWebSocketInstance };
        
        if (callCount < 3) {
          ws.readyState = WebSocket.CLOSED;
          setTimeout(() => mockOnError(new Event('error')), 0);
        } else {
          ws.readyState = WebSocket.OPEN;
          setTimeout(() => mockOnOpen(), 0);
        }
        return ws;
      });

      await expect(reconnectWithBackoff('ws://localhost:3001')).resolves.toBeDefined();
      expect(reconnectAttempts).toBe(3);
    });

    it('should stop reconnection attempts after max retries', async () => {
      const maxRetries = 2;
      let attempts = 0;

      const reconnectWithLimit = async (url: string): Promise<WebSocket> => {
        while (attempts < maxRetries) {
          attempts++;
          try {
            const ws = new WebSocket(url);
            return new Promise((resolve, reject) => {
              ws.addEventListener('open', () => resolve(ws));
              ws.addEventListener('error', () => {
                if (attempts >= maxRetries) {
                  reject(new Error(`Failed after ${maxRetries} attempts`));
                } else {
                  // Continue to next attempt
                  setTimeout(() => reject(new Error('Retry')), 10);
                }
              });
            });
          } catch (error) {
            if (attempts >= maxRetries) {
              throw new Error(`Failed after ${maxRetries} attempts`);
            }
          }
        }
        throw new Error(`Failed after ${maxRetries} attempts`);
      };

      // Mock all attempts to fail
      mockWebSocket.mockImplementation(() => {
        const ws = { ...mockWebSocketInstance };
        ws.readyState = WebSocket.CLOSED;
        setTimeout(() => mockOnError(new Event('error')), 0);
        return ws;
      });

      await expect(reconnectWithLimit('ws://localhost:3001')).rejects.toThrow('Failed after 2 attempts');
      expect(attempts).toBe(2);
    });

    it('should handle connection drops during active session', async () => {
      const connectionStates: string[] = [];
      
      const handleConnectionDrop = (ws: WebSocket) => {
        ws.addEventListener('close', (event: any) => {
          connectionStates.push('closed');
          
          if (event.code === 1006) {
            connectionStates.push('abnormal_closure');
            // Attempt reconnection
            setTimeout(() => {
              connectionStates.push('reconnecting');
            }, 1000);
          }
        });
      };

      mockWebSocket.mockImplementation(() => {
        const ws = { ...mockWebSocketInstance };
        ws.readyState = WebSocket.OPEN;
        connectionStates.push('connected');
        
        // Simulate connection drop after 100ms
        setTimeout(() => {
          ws.readyState = WebSocket.CLOSED;
          mockOnClose({ code: 1006, reason: 'Connection lost' });
        }, 100);
        
        return ws;
      });

      const ws = new WebSocket('ws://localhost:3001');
      handleConnectionDrop(ws);

      await waitFor(() => {
        expect(connectionStates).toContain('connected');
        expect(connectionStates).toContain('closed');
        expect(connectionStates).toContain('abnormal_closure');
      }, { timeout: 2000 });
    });
  });

  describe('Error Message Display', () => {
    it('should display appropriate error messages for different failure types', () => {
      const getErrorMessage = (errorType: string, errorCode?: number) => {
        switch (errorType) {
          case 'connection_refused':
            return 'Unable to connect to Claude CLI. Please check if the server is running.';
          case 'network_error':
            return 'Network error occurred. Please check your internet connection.';
          case 'timeout':
            return 'Connection timed out. Please try again.';
          case 'websocket_close':
            switch (errorCode) {
              case 1000:
                return 'Connection closed normally';
              case 1006:
                return 'Connection lost unexpectedly. Attempting to reconnect...';
              case 1011:
                return 'Server error occurred. Please try again later.';
              default:
                return 'Connection closed unexpectedly';
            }
          default:
            return 'An unexpected error occurred. Please try again.';
        }
      };

      expect(getErrorMessage('connection_refused')).toBe(
        'Unable to connect to Claude CLI. Please check if the server is running.'
      );
      expect(getErrorMessage('network_error')).toBe(
        'Network error occurred. Please check your internet connection.'
      );
      expect(getErrorMessage('timeout')).toBe(
        'Connection timed out. Please try again.'
      );
      expect(getErrorMessage('websocket_close', 1006)).toBe(
        'Connection lost unexpectedly. Attempting to reconnect...'
      );
    });

    it('should track error frequency for debugging', () => {
      const errorTracker = {
        errors: [] as Array<{ type: string; timestamp: number; details?: any }>,
        
        logError(type: string, details?: any) {
          this.errors.push({
            type,
            timestamp: Date.now(),
            details
          });
        },
        
        getErrorFrequency(timeWindow = 60000) {
          const cutoff = Date.now() - timeWindow;
          return this.errors.filter(error => error.timestamp > cutoff).length;
        },
        
        getMostFrequentErrors(limit = 5) {
          const errorCounts = new Map<string, number>();
          this.errors.forEach(error => {
            errorCounts.set(error.type, (errorCounts.get(error.type) || 0) + 1);
          });
          
          return Array.from(errorCounts.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit);
        }
      };

      // Simulate various errors
      errorTracker.logError('connection_refused');
      errorTracker.logError('network_error');
      errorTracker.logError('connection_refused');
      errorTracker.logError('timeout');
      errorTracker.logError('connection_refused');

      expect(errorTracker.getErrorFrequency()).toBe(5);
      expect(errorTracker.getMostFrequentErrors(2)).toEqual([
        ['connection_refused', 3],
        ['network_error', 1]
      ]);
    });
  });

  describe('Fallback Behavior', () => {
    it('should provide offline mode when WebSocket is unavailable', () => {
      const applicationState = {
        isOnline: true,
        connectionStatus: 'connecting' as 'connecting' | 'connected' | 'disconnected' | 'error',
        offlineMode: false,
        
        handleConnectionError() {
          this.isOnline = false;
          this.connectionStatus = 'error';
          this.offlineMode = true;
        },
        
        getAvailableFeatures() {
          if (this.offlineMode) {
            return ['local_commands', 'file_operations', 'syntax_highlighting'];
          }
          return ['all_features'];
        }
      };

      // Simulate connection error
      applicationState.handleConnectionError();

      expect(applicationState.isOnline).toBe(false);
      expect(applicationState.connectionStatus).toBe('error');
      expect(applicationState.offlineMode).toBe(true);
      expect(applicationState.getAvailableFeatures()).toEqual([
        'local_commands',
        'file_operations', 
        'syntax_highlighting'
      ]);
    });

    it('should queue commands when connection is temporarily unavailable', () => {
      const commandQueue = {
        queue: [] as Array<{ command: string; timestamp: number; retryCount: number }>,
        maxRetries: 3,
        
        enqueue(command: string) {
          this.queue.push({
            command,
            timestamp: Date.now(),
            retryCount: 0
          });
        },
        
        processQueue(connectionAvailable: boolean) {
          if (!connectionAvailable) return [];
          
          const processed = [];
          this.queue = this.queue.filter(item => {
            if (item.retryCount < this.maxRetries) {
              item.retryCount++;
              processed.push(item.command);
              return false; // Remove from queue
            }
            return true; // Keep in queue
          });
          
          return processed;
        },
        
        getQueueLength() {
          return this.queue.length;
        }
      };

      // Simulate commands being queued while offline
      commandQueue.enqueue('start-claude-instance');
      commandQueue.enqueue('run-test-command');
      commandQueue.enqueue('check-status');

      expect(commandQueue.getQueueLength()).toBe(3);

      // Process queue when connection is restored
      const processedCommands = commandQueue.processQueue(true);
      expect(processedCommands).toHaveLength(3);
      expect(processedCommands).toContain('start-claude-instance');
      expect(commandQueue.getQueueLength()).toBe(0);
    });

    it('should provide graceful degradation for UI components', () => {
      interface ComponentState {
        websocketConnected: boolean;
        showLimitedUI: boolean;
        enabledFeatures: string[];
      }

      const getComponentState = (wsConnected: boolean): ComponentState => {
        return {
          websocketConnected: wsConnected,
          showLimitedUI: !wsConnected,
          enabledFeatures: wsConnected 
            ? ['terminal', 'claude-instances', 'real-time-updates', 'streaming']
            : ['basic-commands', 'file-browser', 'settings']
        };
      };

      // Test connected state
      const connectedState = getComponentState(true);
      expect(connectedState.websocketConnected).toBe(true);
      expect(connectedState.showLimitedUI).toBe(false);
      expect(connectedState.enabledFeatures).toContain('terminal');
      expect(connectedState.enabledFeatures).toContain('claude-instances');

      // Test disconnected state
      const disconnectedState = getComponentState(false);
      expect(disconnectedState.websocketConnected).toBe(false);
      expect(disconnectedState.showLimitedUI).toBe(true);
      expect(disconnectedState.enabledFeatures).toContain('basic-commands');
      expect(disconnectedState.enabledFeatures).not.toContain('terminal');
    });
  });

  describe('Connection State Management', () => {
    it('should properly track connection lifecycle', () => {
      const connectionManager = {
        state: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed',
        lastError: null as Error | null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        
        connect() {
          this.state = 'connecting';
          this.lastError = null;
        },
        
        onConnected() {
          this.state = 'connected';
          this.reconnectAttempts = 0;
        },
        
        onError(error: Error) {
          this.lastError = error;
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.state = 'reconnecting';
            this.reconnectAttempts++;
          } else {
            this.state = 'failed';
          }
        },
        
        onDisconnected() {
          if (this.state === 'connected') {
            this.state = 'reconnecting';
          } else {
            this.state = 'disconnected';
          }
        }
      };

      // Test connection flow
      connectionManager.connect();
      expect(connectionManager.state).toBe('connecting');

      connectionManager.onConnected();
      expect(connectionManager.state).toBe('connected');
      expect(connectionManager.reconnectAttempts).toBe(0);

      // Test error handling
      connectionManager.onError(new Error('Connection lost'));
      expect(connectionManager.state).toBe('reconnecting');
      expect(connectionManager.reconnectAttempts).toBe(1);

      // Test max retry limit
      for (let i = 1; i < 5; i++) {
        connectionManager.onError(new Error('Still failing'));
      }
      expect(connectionManager.state).toBe('failed');
      expect(connectionManager.reconnectAttempts).toBe(5);
    });
  });
});
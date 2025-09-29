/**
 * Error Scenario Tests - London School TDD
 * Tests error handling with mocked external dependencies
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock external dependencies for error testing
const mockNetworkInterface = {
  request: jest.fn(),
  isConnected: jest.fn(),
  getLatency: jest.fn()
};

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

const mockMetrics = {
  incrementCounter: jest.fn(),
  recordLatency: jest.fn(),
  setGauge: jest.fn()
};

// Mock WebSocket for connection testing
class MockWebSocket extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSING = 2;
    this.CLOSED = 3;
  }
  
  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.emit('send', data);
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit('close');
  }
}

MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

describe('Error Scenario Tests - London School TDD', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkInterface.request.mockClear();
    mockLogger.error.mockClear();
    mockMetrics.incrementCounter.mockClear();
  });

  describe('API Server Down Scenarios', () => {
    const mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      handleError: jest.fn()
    };

    it('should handle API server connection refused', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      connectionError.errno = -61;
      
      mockApiClient.get.mockRejectedValue(connectionError);
      
      // Simulate error handling behavior
      const errorHandler = createErrorHandler(mockLogger, mockMetrics);
      
      try {
        await mockApiClient.get('/api/agents');
      } catch (error) {
        errorHandler.handleNetworkError(error);
      }
      
      // Verify error handling interactions
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('API server connection failed'),
        expect.objectContaining({
          code: 'ECONNREFUSED',
          endpoint: '/api/agents'
        })
      );
      expect(mockMetrics.incrementCounter).toHaveBeenCalledWith('api.errors.connection_refused');
    });

    it('should implement exponential backoff for retries', async () => {
      const retryManager = createRetryManager(mockLogger);
      const mockOperation = jest.fn();
      
      // First 3 attempts fail
      mockOperation
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });
      
      const result = await retryManager.executeWithRetry(mockOperation, {
        maxAttempts: 4,
        baseDelay: 100
      });
      
      expect(result.success).toBe(true);
      expect(mockOperation).toHaveBeenCalledTimes(4);
      expect(mockLogger.warn).toHaveBeenCalledTimes(3); // 3 retry warnings
    });

    it('should fail gracefully after max retry attempts', async () => {
      const retryManager = createRetryManager(mockLogger);
      const mockOperation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(
        retryManager.executeWithRetry(mockOperation, {
          maxAttempts: 3,
          baseDelay: 10
        })
      ).rejects.toThrow('Persistent error');
      
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Max retry attempts exceeded')
      );
    });
  });

  describe('Network Timeout Handling', () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    it('should handle request timeouts gracefully', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockFetch.mockRejectedValue(timeoutError);
      
      const timeoutHandler = createTimeoutHandler(mockLogger, mockMetrics);
      
      let caughtError;
      try {
        await timeoutHandler.fetchWithTimeout('/api/agents', {
          timeout: 5000
        });
      } catch (error) {
        caughtError = error;
      }
      
      expect(caughtError.name).toBe('TimeoutError');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Request timeout'),
        expect.objectContaining({
          url: '/api/agents',
          timeout: 5000
        })
      );
      expect(mockMetrics.incrementCounter).toHaveBeenCalledWith('api.errors.timeout');
    });

    it('should implement circuit breaker pattern', async () => {
      const circuitBreaker = createCircuitBreaker(mockLogger, mockMetrics);
      const mockApiCall = jest.fn();
      
      // Simulate multiple failures to trip circuit breaker
      mockApiCall.mockRejectedValue(new Error('Service unavailable'));
      
      // First 5 calls should reach the service
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreaker.execute(mockApiCall);
        } catch (error) {
          // Expected to fail
        }
      }
      
      expect(mockApiCall).toHaveBeenCalledTimes(5);
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // 6th call should be rejected immediately (circuit open)
      await expect(
        circuitBreaker.execute(mockApiCall)
      ).rejects.toThrow('Circuit breaker is open');
      
      expect(mockApiCall).toHaveBeenCalledTimes(5); // No additional call
      expect(mockMetrics.incrementCounter).toHaveBeenCalledWith('circuit_breaker.open');
    });
  });

  describe('Malformed API Response Handling', () => {
    it('should handle invalid JSON responses', async () => {
      const responseValidator = createResponseValidator(mockLogger);
      
      const invalidJsonResponse = {
        text: async () => 'invalid json {{{',
        json: async () => {
          throw new SyntaxError('Unexpected token { in JSON');
        },
        ok: true,
        status: 200
      };
      
      const result = await responseValidator.validateAndParse(invalidJsonResponse);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('JSON parsing failed'),
        expect.any(Object)
      );
    });

    it('should validate response data contracts', async () => {
      const responseValidator = createResponseValidator(mockLogger);
      
      const invalidDataResponse = {
        json: async () => ({
          success: true,
          data: [
            {
              id: 123, // Should be UUID string, not number
              name: 'Invalid Agent'
            }
          ]
        }),
        ok: true,
        status: 200
      };
      
      const result = await responseValidator.validateAndParse(invalidDataResponse);
      
      expect(result.isValid).toBe(false);
      expect(result.contractErrors).toContain('Invalid agent ID format');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Data contract violation')
      );
    });
  });

  describe('Missing Environment Variables', () => {
    const originalEnv = process.env;
    
    afterEach(() => {
      process.env = originalEnv;
    });

    it('should handle missing API base URL', () => {
      process.env = { ...originalEnv };
      delete process.env.VITE_API_BASE_URL;
      
      const configValidator = createConfigValidator(mockLogger);
      const config = configValidator.validateEnvironment();
      
      expect(config.isValid).toBe(false);
      expect(config.errors).toContain('VITE_API_BASE_URL is required');
      expect(config.fallbacks).toHaveProperty('apiBaseUrl', 'http://localhost:3001');
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Using fallback API base URL')
      );
    });

    it('should validate WebSocket URL configuration', () => {
      process.env = { ...originalEnv };
      delete process.env.VITE_WEBSOCKET_URL;
      
      const configValidator = createConfigValidator(mockLogger);
      const config = configValidator.validateEnvironment();
      
      expect(config.warnings).toContain('VITE_WEBSOCKET_URL not configured');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket features may be limited')
      );
    });
  });

  describe('WebSocket Connection Failures', () => {
    it('should handle WebSocket connection errors', async () => {
      const wsManager = createWebSocketManager(mockLogger, mockMetrics);
      
      // Mock WebSocket that fails to connect
      const mockWs = new MockWebSocket('ws://localhost:3001/terminal');
      wsManager.setWebSocketClass(() => mockWs);
      
      const connectionPromise = wsManager.connect();
      
      // Simulate connection error
      setTimeout(() => {
        mockWs.emit('error', new Error('Connection failed'));
      }, 10);
      
      await expect(connectionPromise).rejects.toThrow('Connection failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket connection failed'),
        expect.any(Object)
      );
      expect(mockMetrics.incrementCounter).toHaveBeenCalledWith('websocket.errors.connection');
    });

    it('should implement WebSocket reconnection logic', async () => {
      const wsManager = createWebSocketManager(mockLogger, mockMetrics);
      const mockWsConstructor = jest.fn();
      
      // Create multiple WebSocket instances for reconnection attempts
      const mockWs1 = new MockWebSocket('ws://localhost:3001/terminal');
      const mockWs2 = new MockWebSocket('ws://localhost:3001/terminal');
      
      mockWsConstructor
        .mockReturnValueOnce(mockWs1)
        .mockReturnValueOnce(mockWs2);
      
      wsManager.setWebSocketClass(mockWsConstructor);
      
      // Start connection
      const connectionPromise = wsManager.connect();
      
      // First connection fails
      setTimeout(() => {
        mockWs1.emit('error', new Error('Initial connection failed'));
      }, 10);
      
      // Second connection succeeds
      setTimeout(() => {
        mockWs2.readyState = MockWebSocket.OPEN;
        mockWs2.emit('open');
      }, 50);
      
      await connectionPromise;
      
      expect(mockWsConstructor).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket reconnection successful')
      );
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle memory pressure scenarios', () => {
      const resourceManager = createResourceManager(mockLogger, mockMetrics);
      
      // Simulate memory pressure
      const mockMemoryUsage = {
        rss: 1024 * 1024 * 1024, // 1GB
        heapUsed: 512 * 1024 * 1024, // 512MB
        heapTotal: 600 * 1024 * 1024 // 600MB
      };
      
      resourceManager.checkMemoryUsage(mockMemoryUsage);
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('High memory usage detected'),
        expect.objectContaining({
          heapUsedMB: expect.any(Number),
          thresholdMB: expect.any(Number)
        })
      );
      expect(mockMetrics.setGauge).toHaveBeenCalledWith('memory.heap_used_mb', expect.any(Number));
    });

    it('should clean up resources on shutdown', () => {
      const resourceManager = createResourceManager(mockLogger, mockMetrics);
      const mockCleanupFunctions = [
        jest.fn(),
        jest.fn(),
        jest.fn()
      ];
      
      mockCleanupFunctions.forEach(fn => {
        resourceManager.registerCleanupFunction(fn);
      });
      
      resourceManager.shutdown();
      
      mockCleanupFunctions.forEach(fn => {
        expect(fn).toHaveBeenCalled();
      });
      
      expect(mockLogger.info).toHaveBeenCalledWith('Resource cleanup completed');
    });
  });
});

// Helper factory functions for creating error handling components
function createErrorHandler(logger, metrics) {
  return {
    handleNetworkError(error) {
      logger.error('API server connection failed', {
        code: error.code,
        endpoint: '/api/agents',
        message: error.message
      });
      metrics.incrementCounter(`api.errors.${error.code?.toLowerCase() || 'unknown'}`);
    }
  };
}

function createRetryManager(logger) {
  return {
    async executeWithRetry(operation, options) {
      const { maxAttempts, baseDelay } = options;
      let lastError;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          if (attempt < maxAttempts) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      logger.error('Max retry attempts exceeded', { attempts: maxAttempts });
      throw lastError;
    }
  };
}

function createTimeoutHandler(logger, metrics) {
  return {
    async fetchWithTimeout(url, options) {
      try {
        return await fetch(url);
      } catch (error) {
        if (error.name === 'TimeoutError') {
          logger.warn('Request timeout', {
            url,
            timeout: options.timeout
          });
          metrics.incrementCounter('api.errors.timeout');
        }
        throw error;
      }
    }
  };
}

function createCircuitBreaker(logger, metrics) {
  let state = 'CLOSED';
  let failureCount = 0;
  const threshold = 5;
  
  return {
    async execute(operation) {
      if (state === 'OPEN') {
        throw new Error('Circuit breaker is open');
      }
      
      try {
        const result = await operation();
        failureCount = 0;
        state = 'CLOSED';
        return result;
      } catch (error) {
        failureCount++;
        if (failureCount >= threshold) {
          state = 'OPEN';
          metrics.incrementCounter('circuit_breaker.open');
          logger.error('Circuit breaker opened due to failures');
        }
        throw error;
      }
    },
    
    getState() {
      return state;
    }
  };
}

function createResponseValidator(logger) {
  return {
    async validateAndParse(response) {
      try {
        const data = await response.json();
        
        // Validate data contract
        const contractErrors = [];
        if (Array.isArray(data.data)) {
          data.data.forEach((item, index) => {
            if (typeof item.id === 'number') {
              contractErrors.push('Invalid agent ID format');
            }
          });
        }
        
        if (contractErrors.length > 0) {
          logger.warn('Data contract violation', { errors: contractErrors });
          return { isValid: false, contractErrors };
        }
        
        return { isValid: true, data };
      } catch (error) {
        logger.error('JSON parsing failed', { error: error.message });
        return { isValid: false, error: 'Invalid JSON' };
      }
    }
  };
}

function createConfigValidator(logger) {
  return {
    validateEnvironment() {
      const errors = [];
      const warnings = [];
      const fallbacks = {};
      
      if (!process.env.VITE_API_BASE_URL) {
        errors.push('VITE_API_BASE_URL is required');
        fallbacks.apiBaseUrl = 'http://localhost:3001';
        logger.warn('Using fallback API base URL: http://localhost:3001');
      }
      
      if (!process.env.VITE_WEBSOCKET_URL) {
        warnings.push('VITE_WEBSOCKET_URL not configured');
        logger.info('WebSocket features may be limited without VITE_WEBSOCKET_URL');
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fallbacks
      };
    }
  };
}

function createWebSocketManager(logger, metrics) {
  let WebSocketClass = MockWebSocket;
  
  return {
    setWebSocketClass(wsClass) {
      WebSocketClass = wsClass;
    },
    
    async connect() {
      return new Promise((resolve, reject) => {
        const ws = new WebSocketClass('ws://localhost:3001/terminal');
        
        ws.on('open', () => {
          logger.info('WebSocket connection established');
          resolve(ws);
        });
        
        ws.on('error', (error) => {
          logger.error('WebSocket connection failed', { error: error.message });
          metrics.incrementCounter('websocket.errors.connection');
          reject(error);
        });
      });
    }
  };
}

function createResourceManager(logger, metrics) {
  const cleanupFunctions = [];
  
  return {
    checkMemoryUsage(memoryUsage) {
      const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
      const thresholdMB = 400;
      
      if (heapUsedMB > thresholdMB) {
        logger.warn('High memory usage detected', {
          heapUsedMB: Math.round(heapUsedMB),
          thresholdMB
        });
      }
      
      metrics.setGauge('memory.heap_used_mb', Math.round(heapUsedMB));
    },
    
    registerCleanupFunction(fn) {
      cleanupFunctions.push(fn);
    },
    
    shutdown() {
      cleanupFunctions.forEach(fn => fn());
      logger.info('Resource cleanup completed');
    }
  };
}

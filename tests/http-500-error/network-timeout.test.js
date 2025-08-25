/**
 * Network Failure and Timeout Tests for API Endpoints
 * Tests network connectivity issues, timeouts, and error handling
 */

const axios = require('axios');
const request = require('supertest');
const express = require('express');
const { AbortController } = require('abort-controller');

// Mock axios for network simulation
jest.mock('axios');

describe('Network Failure and Timeout Tests', () => {
  let app;
  let server;

  beforeEach(() => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Setup test endpoints that simulate network calls
    app.post('/api/claude/launch', async (req, res) => {
      try {
        // Simulate network call to external service
        const response = await axios.post('http://claude-service/launch', {
          command: req.body.command
        }, {
          timeout: 5000
        });
        
        res.json({
          success: true,
          message: 'Launch successful',
          data: response.data
        });
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          res.status(500).json({
            success: false,
            error: 'Request timeout',
            message: 'Claude service did not respond in time'
          });
        } else if (error.code === 'ENOTFOUND') {
          res.status(500).json({
            success: false,
            error: 'Service unavailable',
            message: 'Claude service not found'
          });
        } else {
          res.status(500).json({
            success: false,
            error: error.message,
            message: 'Network error occurred'
          });
        }
      }
    });

    app.post('/api/claude/stop', async (req, res) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await axios.post('http://claude-service/stop', {
          processId: req.body.processId
        }, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        res.json({ success: true, data: response.data });
      } catch (error) {
        if (error.name === 'AbortError') {
          res.status(500).json({
            success: false,
            error: 'Operation timeout',
            message: 'Stop operation timed out'
          });
        } else {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      }
    });

    app.get('/api/claude/status', async (req, res) => {
      try {
        const response = await axios.get('http://claude-service/status', {
          timeout: 2000
        });
        res.json({ success: true, status: response.data });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Status check failed',
          details: error.message
        });
      }
    });
  });

  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Connection Timeout Scenarios', () => {
    test('should handle connection timeout on launch', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      axios.post.mockRejectedValue(timeoutError);

      const response = await request(app)
        .post('/api/claude/launch')
        .send({ command: 'claude --help' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Request timeout',
        message: 'Claude service did not respond in time'
      });

      expect(axios.post).toHaveBeenCalledWith(
        'http://claude-service/launch',
        { command: 'claude --help' },
        { timeout: 5000 }
      );
    });

    test('should handle DNS resolution failure', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND claude-service');
      dnsError.code = 'ENOTFOUND';
      axios.post.mockRejectedValue(dnsError);

      const response = await request(app)
        .post('/api/claude/launch')
        .send({ command: 'claude' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Service unavailable',
        message: 'Claude service not found'
      });
    });

    test('should handle connection refused', async () => {
      const connRefusedError = new Error('connect ECONNREFUSED 127.0.0.1:80');
      connRefusedError.code = 'ECONNREFUSED';
      axios.post.mockRejectedValue(connRefusedError);

      const response = await request(app)
        .post('/api/claude/launch')
        .send({ command: 'claude' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'connect ECONNREFUSED 127.0.0.1:80',
        message: 'Network error occurred'
      });
    });

    test('should handle network unreachable', async () => {
      const networkError = new Error('network is unreachable');
      networkError.code = 'ENETUNREACH';
      axios.post.mockRejectedValue(networkError);

      const response = await request(app)
        .post('/api/claude/launch')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('network is unreachable');
    });
  });

  describe('Request Abort and Timeout Handling', () => {
    test('should handle aborted requests on stop operation', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      axios.post.mockRejectedValue(abortError);

      const response = await request(app)
        .post('/api/claude/stop')
        .send({ processId: '12345' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Operation timeout',
        message: 'Stop operation timed out'
      });
    });

    test('should handle slow network responses', async () => {
      // Mock slow response that exceeds timeout
      axios.get.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => {
            const error = new Error('timeout of 2000ms exceeded');
            error.code = 'ECONNABORTED';
            reject(error);
          }, 2500);
        })
      );

      const response = await request(app)
        .get('/api/claude/status')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Status check failed'
      });
    });

    test('should handle intermittent connectivity issues', async () => {
      let requestCount = 0;
      axios.get.mockImplementation(() => {
        requestCount++;
        if (requestCount % 2 === 0) {
          // Every second request fails
          const error = new Error('socket hang up');
          error.code = 'ECONNRESET';
          return Promise.reject(error);
        }
        return Promise.resolve({ data: { isRunning: true } });
      });

      // First request should succeed
      const response1 = await request(app)
        .get('/api/claude/status')
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Second request should fail
      const response2 = await request(app)
        .get('/api/claude/status')
        .expect(500);

      expect(response2.body.success).toBe(false);
    });
  });

  describe('Server-Side Timeout Handling', () => {
    test('should implement server-side request timeouts', (done) => {
      const timeoutApp = express();
      timeoutApp.use(express.json());

      // Middleware to add timeout to all requests
      timeoutApp.use((req, res, next) => {
        res.setTimeout(1000, () => {
          res.status(500).json({
            success: false,
            error: 'Server timeout',
            message: 'Request processing timeout'
          });
        });
        next();
      });

      timeoutApp.post('/api/claude/launch', (req, res) => {
        // Simulate long-running operation
        setTimeout(() => {
          res.json({ success: true });
        }, 2000); // Longer than timeout
      });

      server = timeoutApp.listen(0, () => {
        const port = server.address().port;

        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .expect(500)
          .expect((res) => {
            expect(res.body.error).toBe('Server timeout');
          })
          .end(done);
      });
    });

    test('should handle client disconnection during processing', (done) => {
      const disconnectApp = express();
      disconnectApp.use(express.json());

      disconnectApp.post('/api/claude/launch', (req, res) => {
        // Check if client disconnected
        req.on('close', () => {
          console.log('Client disconnected');
        });

        req.on('aborted', () => {
          console.log('Request aborted by client');
        });

        // Long operation
        setTimeout(() => {
          if (!res.headersSent) {
            res.json({ success: true });
          }
        }, 1000);
      });

      server = disconnectApp.listen(0, () => {
        const port = server.address().port;
        const req = request(`http://localhost:${port}`)
          .post('/api/claude/launch');

        // Abort request after 500ms
        setTimeout(() => {
          req.abort();
          setTimeout(done, 100);
        }, 500);
      });
    });
  });

  describe('Network Recovery and Retry Logic', () => {
    test('should implement exponential backoff for retries', async () => {
      let attemptCount = 0;
      const maxRetries = 3;
      const baseDelay = 100;

      const retryWithBackoff = async (operation, retries = maxRetries) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            attemptCount++;
            const result = await operation();
            return result;
          } catch (error) {
            if (attempt === retries) {
              throw new Error(`Failed after ${retries + 1} attempts: ${error.message}`);
            }

            const delay = baseDelay * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };

      const flakyOperation = () => {
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return Promise.resolve({ success: true });
      };

      const result = await retryWithBackoff(flakyOperation);
      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    test('should handle circuit breaker pattern', async () => {
      let failureCount = 0;
      let circuitOpen = false;
      const failureThreshold = 3;

      const circuitBreakerRequest = async () => {
        if (circuitOpen) {
          throw new Error('Circuit breaker is open - service unavailable');
        }

        try {
          // Simulate network request
          if (Math.random() < 0.7) { // 70% failure rate
            throw new Error('Network error');
          }
          
          // Success - reset failure count
          failureCount = 0;
          return { success: true };
        } catch (error) {
          failureCount++;
          
          if (failureCount >= failureThreshold) {
            circuitOpen = true;
            // Reset circuit after timeout
            setTimeout(() => {
              circuitOpen = false;
              failureCount = 0;
            }, 5000);
          }
          
          throw error;
        }
      };

      // Make requests until circuit opens
      let circuitOpenError;
      for (let i = 0; i < 10; i++) {
        try {
          await circuitBreakerRequest();
        } catch (error) {
          if (error.message.includes('Circuit breaker is open')) {
            circuitOpenError = error;
            break;
          }
        }
      }

      expect(circuitOpenError).toBeDefined();
      expect(circuitOpenError.message).toContain('Circuit breaker is open');
    });
  });

  describe('Real-time Connection Monitoring', () => {
    test('should detect connection quality degradation', (done) => {
      const connectionMonitor = {
        latencies: [],
        errorCount: 0,
        
        recordLatency(startTime) {
          const latency = Date.now() - startTime;
          this.latencies.push(latency);
          if (this.latencies.length > 10) {
            this.latencies.shift(); // Keep only last 10
          }
        },
        
        recordError() {
          this.errorCount++;
        },
        
        getAverageLatency() {
          if (this.latencies.length === 0) return 0;
          return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
        },
        
        isConnectionDegraded() {
          const avgLatency = this.getAverageLatency();
          const recentErrors = this.errorCount;
          
          return avgLatency > 1000 || recentErrors > 5;
        }
      };

      // Simulate requests with varying latencies
      const simulateRequest = (latency, willError = false) => {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          
          setTimeout(() => {
            if (willError) {
              connectionMonitor.recordError();
              reject(new Error('Network error'));
            } else {
              connectionMonitor.recordLatency(startTime);
              resolve({ success: true });
            }
          }, latency);
        });
      };

      // Test with good connections
      Promise.all([
        simulateRequest(100),
        simulateRequest(150),
        simulateRequest(80)
      ]).then(() => {
        expect(connectionMonitor.isConnectionDegraded()).toBe(false);

        // Test with degraded connections
        return Promise.allSettled([
          simulateRequest(2000), // High latency
          simulateRequest(100, true), // Error
          simulateRequest(1500), // High latency
          simulateRequest(100, true), // Error
        ]);
      }).then(() => {
        expect(connectionMonitor.isConnectionDegraded()).toBe(true);
        done();
      }).catch(done);
    });

    test('should handle WebSocket connection failures with fallback', (done) => {
      const WebSocketMock = jest.fn().mockImplementation(() => ({
        readyState: 3, // CLOSED
        close: jest.fn(),
        send: jest.fn(() => {
          throw new Error('WebSocket is not open');
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }));

      const createConnectionWithFallback = () => {
        let primaryWs;
        let fallbackInterval;
        
        try {
          primaryWs = new WebSocketMock('ws://claude-service/terminal');
          
          if (primaryWs.readyState !== 1) { // Not OPEN
            throw new Error('WebSocket connection failed');
          }
          
          return { connection: primaryWs, type: 'websocket' };
        } catch (error) {
          // Fallback to polling
          fallbackInterval = setInterval(() => {
            // Simulate polling
            console.log('Polling for updates...');
          }, 1000);
          
          return { 
            connection: { interval: fallbackInterval },
            type: 'polling'
          };
        }
      };

      const result = createConnectionWithFallback();
      
      expect(result.type).toBe('polling');
      expect(result.connection.interval).toBeDefined();
      
      // Cleanup
      clearInterval(result.connection.interval);
      done();
    });
  });

  describe('Error Aggregation and Reporting', () => {
    test('should aggregate network errors for monitoring', () => {
      const errorAggregator = {
        errors: [],
        
        recordError(endpoint, error, timestamp = Date.now()) {
          this.errors.push({
            endpoint,
            error: error.message,
            code: error.code,
            timestamp
          });
        },
        
        getErrorStats(timeWindow = 60000) {
          const cutoff = Date.now() - timeWindow;
          const recentErrors = this.errors.filter(e => e.timestamp > cutoff);
          
          const stats = {
            total: recentErrors.length,
            byEndpoint: {},
            byErrorCode: {},
            errorRate: 0
          };
          
          recentErrors.forEach(error => {
            stats.byEndpoint[error.endpoint] = (stats.byEndpoint[error.endpoint] || 0) + 1;
            stats.byErrorCode[error.code] = (stats.byErrorCode[error.code] || 0) + 1;
          });
          
          return stats;
        }
      };

      // Record various errors
      const now = Date.now();
      errorAggregator.recordError('/api/claude/launch', { message: 'Timeout', code: 'ECONNABORTED' }, now);
      errorAggregator.recordError('/api/claude/launch', { message: 'Connection refused', code: 'ECONNREFUSED' }, now);
      errorAggregator.recordError('/api/claude/status', { message: 'Timeout', code: 'ECONNABORTED' }, now);
      
      const stats = errorAggregator.getErrorStats();
      
      expect(stats.total).toBe(3);
      expect(stats.byEndpoint['/api/claude/launch']).toBe(2);
      expect(stats.byEndpoint['/api/claude/status']).toBe(1);
      expect(stats.byErrorCode['ECONNABORTED']).toBe(2);
      expect(stats.byErrorCode['ECONNREFUSED']).toBe(1);
    });

    test('should detect error patterns and trends', () => {
      const errorPattern = {
        timeWindows: [],
        
        addTimeWindow(timestamp, errorCount) {
          this.timeWindows.push({ timestamp, errorCount });
          // Keep only last 10 windows
          if (this.timeWindows.length > 10) {
            this.timeWindows.shift();
          }
        },
        
        detectTrend() {
          if (this.timeWindows.length < 3) return 'insufficient_data';
          
          const recent = this.timeWindows.slice(-3);
          const isIncreasing = recent.every((window, index) => {
            if (index === 0) return true;
            return window.errorCount >= recent[index - 1].errorCount;
          });
          
          const isDecreasing = recent.every((window, index) => {
            if (index === 0) return true;
            return window.errorCount <= recent[index - 1].errorCount;
          });
          
          if (isIncreasing && recent[recent.length - 1].errorCount > recent[0].errorCount) {
            return 'increasing';
          }
          if (isDecreasing && recent[recent.length - 1].errorCount < recent[0].errorCount) {
            return 'decreasing';
          }
          
          return 'stable';
        }
      };

      // Simulate increasing error pattern
      const baseTime = Date.now();
      errorPattern.addTimeWindow(baseTime, 1);
      errorPattern.addTimeWindow(baseTime + 60000, 3);
      errorPattern.addTimeWindow(baseTime + 120000, 5);
      errorPattern.addTimeWindow(baseTime + 180000, 8);

      expect(errorPattern.detectTrend()).toBe('increasing');
    });
  });
});
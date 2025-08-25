/**
 * Mock Server Tests for Simulating HTTP 500 Errors
 * Creates mock server scenarios to test error handling and validation
 */

const express = require('express');
const http = require('http');
const request = require('supertest');
const WebSocket = require('ws');

describe('Mock Server HTTP 500 Error Simulation Tests', () => {
  let mockServer;
  let mockApp;

  beforeEach(() => {
    mockApp = express();
    mockApp.use(express.json());
  });

  afterEach((done) => {
    if (mockServer) {
      mockServer.close(done);
    } else {
      done();
    }
  });

  describe('Simulated Server Failures', () => {
    test('should simulate complete server crash during launch', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        // Simulate server crash - close connection without response
        res.socket.destroy();
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .expect((res) => {
            // Should handle connection reset
            expect(res.error).toBeDefined();
          })
          .end(done);
      });
    });

    test('should simulate memory exhaustion errors', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        res.status(500).json({
          success: false,
          error: 'ENOMEM: Cannot allocate memory',
          message: 'Server out of memory'
        });
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .expect(500)
          .expect((res) => {
            expect(res.body.error).toContain('ENOMEM');
          })
          .end(done);
      });
    });

    test('should simulate file system errors', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        res.status(500).json({
          success: false,
          error: 'ENOSPC: no space left on device',
          message: 'Disk full'
        });
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .expect(500)
          .expect((res) => {
            expect(res.body.error).toContain('ENOSPC');
          })
          .end(done);
      });
    });

    test('should simulate process limit exceeded', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        res.status(500).json({
          success: false,
          error: 'EAGAIN: Resource temporarily unavailable',
          message: 'Process limit exceeded'
        });
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .expect(500)
          .expect((res) => {
            expect(res.body.error).toContain('EAGAIN');
          })
          .end(done);
      });
    });
  });

  describe('Intermittent Failure Scenarios', () => {
    test('should simulate sporadic 500 errors', (done) => {
      let requestCount = 0;
      
      mockApp.get('/api/claude/status', (req, res) => {
        requestCount++;
        
        if (requestCount % 3 === 0) {
          res.status(500).json({
            success: false,
            error: 'Intermittent server error'
          });
        } else {
          res.json({
            success: true,
            status: { isRunning: false, status: 'stopped' }
          });
        }
      });

      mockServer = mockApp.listen(0, async () => {
        const port = mockServer.address().port;
        const baseUrl = `http://localhost:${port}`;
        
        // Make multiple requests to trigger intermittent failures
        const responses = await Promise.all([
          request(baseUrl).get('/api/claude/status'),
          request(baseUrl).get('/api/claude/status'),
          request(baseUrl).get('/api/claude/status'), // This should fail
          request(baseUrl).get('/api/claude/status'),
          request(baseUrl).get('/api/claude/status'),
          request(baseUrl).get('/api/claude/status') // This should fail
        ]);

        // Check that some requests succeeded and some failed
        const successCount = responses.filter(r => r.status === 200).length;
        const errorCount = responses.filter(r => r.status === 500).length;
        
        expect(successCount).toBe(4);
        expect(errorCount).toBe(2);
        done();
      });
    });

    test('should simulate cascading failures', (done) => {
      let healthStatus = 'healthy';
      
      mockApp.get('/api/claude/check', (req, res) => {
        if (healthStatus === 'degraded') {
          res.status(500).json({
            success: false,
            error: 'Service degraded'
          });
        } else {
          res.json({ success: true, claudeAvailable: true });
        }
      });

      mockApp.post('/api/claude/launch', (req, res) => {
        // Simulate a launch that causes system degradation
        healthStatus = 'degraded';
        
        res.status(500).json({
          success: false,
          error: 'Launch caused system instability'
        });
      });

      mockServer = mockApp.listen(0, async () => {
        const port = mockServer.address().port;
        const baseUrl = `http://localhost:${port}`;
        
        // Initial check should succeed
        const checkResponse1 = await request(baseUrl).get('/api/claude/check');
        expect(checkResponse1.status).toBe(200);
        
        // Launch should fail and degrade system
        const launchResponse = await request(baseUrl).post('/api/claude/launch');
        expect(launchResponse.status).toBe(500);
        
        // Subsequent check should now fail
        const checkResponse2 = await request(baseUrl).get('/api/claude/check');
        expect(checkResponse2.status).toBe(500);
        
        done();
      });
    });
  });

  describe('Timeout and Hanging Request Scenarios', () => {
    test('should simulate hanging requests', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        // Never respond - simulate hanging
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .timeout(1000) // 1 second timeout
          .expect((res) => {
            expect(res.error).toBeDefined();
            expect(res.error.code).toBe('ECONNABORTED');
          })
          .end(done);
      });
    });

    test('should simulate slow responses leading to timeout', (done) => {
      mockApp.post('/api/claude/stop', (req, res) => {
        // Delay response for 3 seconds
        setTimeout(() => {
          res.status(500).json({
            success: false,
            error: 'Process termination timeout'
          });
        }, 3000);
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/stop')
          .timeout(1500) // Shorter timeout
          .expect((res) => {
            expect(res.error).toBeDefined();
          })
          .end(done);
      });
    });
  });

  describe('Malformed Response Scenarios', () => {
    test('should simulate corrupted JSON responses', (done) => {
      mockApp.get('/api/claude/status', (req, res) => {
        res.status(500);
        res.set('Content-Type', 'application/json');
        res.send('{"success": false, "error": "Corrupted JSON"'); // Missing closing brace
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .get('/api/claude/status')
          .expect(500)
          .expect((res) => {
            // Should be treated as a 500 error even with malformed JSON
            expect(res.status).toBe(500);
          })
          .end(done);
      });
    });

    test('should simulate HTML error pages instead of JSON', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        res.status(500);
        res.set('Content-Type', 'text/html');
        res.send(`
          <html>
            <body>
              <h1>Internal Server Error</h1>
              <p>The server encountered an unexpected condition.</p>
            </body>
          </html>
        `);
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .expect(500)
          .expect('Content-Type', /text\/html/)
          .expect((res) => {
            expect(res.text).toContain('Internal Server Error');
          })
          .end(done);
      });
    });

    test('should simulate mixed content type responses', (done) => {
      mockApp.post('/api/claude/stop', (req, res) => {
        res.status(500);
        res.set('Content-Type', 'application/json');
        res.send('Error: Process termination failed'); // Plain text instead of JSON
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/stop')
          .expect(500)
          .expect((res) => {
            expect(res.text).toContain('Process termination failed');
          })
          .end(done);
      });
    });
  });

  describe('WebSocket Error Scenarios', () => {
    test('should simulate WebSocket connection failures', (done) => {
      const server = http.createServer(mockApp);
      const wss = new WebSocket.Server({ server, path: '/terminal' });

      wss.on('connection', (ws) => {
        // Immediately close connection to simulate error
        ws.close(1011, 'Server error');
      });

      server.listen(0, () => {
        const port = server.address().port;
        const wsUrl = `ws://localhost:${port}/terminal`;
        
        const ws = new WebSocket(wsUrl);
        
        ws.on('error', (error) => {
          expect(error).toBeDefined();
          server.close(done);
        });

        ws.on('close', (code, reason) => {
          expect(code).toBe(1011);
          expect(reason.toString()).toBe('Server error');
          server.close(done);
        });
      });
    });

    test('should simulate WebSocket data corruption', (done) => {
      const server = http.createServer(mockApp);
      const wss = new WebSocket.Server({ server, path: '/terminal' });

      wss.on('connection', (ws) => {
        // Send corrupted data
        ws.send('{"type":"error","corrupted');
        ws.send(Buffer.from([0xFF, 0xFE, 0xFD])); // Invalid UTF-8
        
        setTimeout(() => {
          ws.close();
        }, 100);
      });

      server.listen(0, () => {
        const port = server.address().port;
        const wsUrl = `ws://localhost:${port}/terminal`;
        
        const ws = new WebSocket(wsUrl);
        let messageCount = 0;
        
        ws.on('message', (data) => {
          messageCount++;
          // Should handle corrupted messages gracefully
        });

        ws.on('close', () => {
          expect(messageCount).toBeGreaterThan(0);
          server.close(done);
        });
      });
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should simulate file descriptor exhaustion', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        res.status(500).json({
          success: false,
          error: 'EMFILE: too many open files',
          message: 'File descriptor limit exceeded'
        });
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        // Simulate multiple rapid requests
        const requests = Array(10).fill().map(() =>
          request(`http://localhost:${port}`).post('/api/claude/launch')
        );

        Promise.all(requests).then(responses => {
          responses.forEach(response => {
            expect(response.status).toBe(500);
            expect(response.body.error).toContain('EMFILE');
          });
          done();
        }).catch(done);
      });
    });

    test('should simulate port exhaustion', (done) => {
      mockApp.post('/api/claude/launch', (req, res) => {
        res.status(500).json({
          success: false,
          error: 'EADDRINUSE: address already in use',
          message: 'Port exhaustion'
        });
      });

      mockServer = mockApp.listen(0, () => {
        const port = mockServer.address().port;
        
        request(`http://localhost:${port}`)
          .post('/api/claude/launch')
          .expect(500)
          .expect((res) => {
            expect(res.body.error).toContain('EADDRINUSE');
          })
          .end(done);
      });
    });
  });

  describe('Recovery and Resilience Testing', () => {
    test('should simulate server recovery after failures', (done) => {
      let failureCount = 0;
      const maxFailures = 3;
      
      mockApp.post('/api/claude/launch', (req, res) => {
        failureCount++;
        
        if (failureCount <= maxFailures) {
          res.status(500).json({
            success: false,
            error: 'Temporary server instability'
          });
        } else {
          res.json({
            success: true,
            message: 'Server recovered, launch successful'
          });
        }
      });

      mockServer = mockApp.listen(0, async () => {
        const port = mockServer.address().port;
        const baseUrl = `http://localhost:${port}`;
        
        // First few requests should fail
        for (let i = 0; i < maxFailures; i++) {
          const response = await request(baseUrl).post('/api/claude/launch');
          expect(response.status).toBe(500);
        }
        
        // Final request should succeed
        const finalResponse = await request(baseUrl).post('/api/claude/launch');
        expect(finalResponse.status).toBe(200);
        expect(finalResponse.body.success).toBe(true);
        
        done();
      });
    });

    test('should simulate graceful degradation', (done) => {
      let systemLoad = 'normal';
      
      mockApp.get('/api/claude/check', (req, res) => {
        switch (systemLoad) {
          case 'high':
            res.status(503).json({
              success: false,
              error: 'Service temporarily unavailable - high load'
            });
            break;
          case 'critical':
            res.status(500).json({
              success: false,
              error: 'System overloaded'
            });
            break;
          default:
            res.json({ success: true, claudeAvailable: true });
        }
      });

      mockApp.post('/api/claude/launch', (req, res) => {
        // Simulate increasing system load
        if (systemLoad === 'normal') {
          systemLoad = 'high';
          res.json({ success: true, message: 'Launched successfully' });
        } else if (systemLoad === 'high') {
          systemLoad = 'critical';
          res.status(500).json({
            success: false,
            error: 'System under high load'
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'System critical - launch rejected'
          });
        }
      });

      mockServer = mockApp.listen(0, async () => {
        const port = mockServer.address().port;
        const baseUrl = `http://localhost:${port}`;
        
        // Check should succeed initially
        const check1 = await request(baseUrl).get('/api/claude/check');
        expect(check1.status).toBe(200);
        
        // Launch should succeed but increase load
        const launch1 = await request(baseUrl).post('/api/claude/launch');
        expect(launch1.status).toBe(200);
        
        // Check should show high load (503)
        const check2 = await request(baseUrl).get('/api/claude/check');
        expect(check2.status).toBe(503);
        
        // Launch should fail due to high load
        const launch2 = await request(baseUrl).post('/api/claude/launch');
        expect(launch2.status).toBe(500);
        
        // Check should show critical state
        const check3 = await request(baseUrl).get('/api/claude/check');
        expect(check3.status).toBe(500);
        
        done();
      });
    });
  });
});
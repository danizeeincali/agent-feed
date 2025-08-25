/**
 * WebSocket Load Tests
 * Tests multiple concurrent WebSocket connections and performance
 * 
 * TDD Requirements:
 * ✅ Test multiple concurrent WebSocket connections
 * ✅ Test connection performance under load
 * ✅ Test server stability with high connection count
 * ✅ Test resource usage and memory leaks
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

describe('WebSocket Load Tests', () => {
  let serverProcess;
  const TERMINAL_PORT = 3002;
  const MAX_CONNECTIONS = 50;
  const STRESS_CONNECTIONS = 100;

  beforeAll(async () => {
    // Start server with increased limits
    serverProcess = spawn('node', ['backend-terminal-server.js'], {
      cwd: '/workspaces/agent-feed',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        TERMINAL_PORT: TERMINAL_PORT,
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    });

    // Wait for server startup
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 20000);

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Terminal WebSocket Server running')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 10000);
      });
    }
  });

  describe('Concurrent Connection Tests', () => {
    test('should handle 10 concurrent connections successfully', async () => {
      const connectionCount = 10;
      const connections = [];
      const connectionPromises = [];

      try {
        // Create multiple connections
        for (let i = 0; i < connectionCount; i++) {
          const connectionPromise = new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
            const timeout = setTimeout(() => {
              reject(new Error(`Connection ${i} timeout`));
            }, 15000);

            let connected = false;
            let initialized = false;

            ws.on('open', () => {
              connected = true;
              connections.push(ws);
              
              // Send init message
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: `load-test-${i}`
              }));
            });

            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                if (message.type === 'init_ack' && !initialized) {
                  initialized = true;
                  clearTimeout(timeout);
                  resolve(i);
                }
              } catch (error) {
                // Ignore non-JSON messages
              }
            });

            ws.on('error', (error) => {
              clearTimeout(timeout);
              reject(new Error(`Connection ${i} error: ${error.message}`));
            });

            ws.on('close', (code, reason) => {
              if (!initialized) {
                clearTimeout(timeout);
                reject(new Error(`Connection ${i} closed: ${code} ${reason}`));
              }
            });
          });

          connectionPromises.push(connectionPromise);
        }

        // Wait for all connections
        const results = await Promise.all(connectionPromises);
        expect(results).toHaveLength(connectionCount);

        // Verify server status
        const response = await fetch(`http://localhost:${TERMINAL_PORT}/api/terminals`);
        const statusData = await response.json();
        expect(statusData.success).toBe(true);
        expect(statusData.count).toBe(connectionCount);

        // Test sending messages on all connections
        const messagePromises = connections.map((ws, index) => {
          return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Message test ${index} timeout`));
            }, 5000);

            let responseReceived = false;

            ws.on('message', (data) => {
              if (!responseReceived) {
                responseReceived = true;
                clearTimeout(timeout);
                resolve(index);
              }
            });

            // Send test command
            ws.send(JSON.stringify({
              type: 'input',
              data: `echo "test-${index}"\\n`,
              timestamp: Date.now()
            }));
          });
        });

        const messageResults = await Promise.all(messagePromises);
        expect(messageResults).toHaveLength(connectionCount);

      } finally {
        // Clean up connections
        connections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        });
      }
    }, 30000);

    test('should handle 25 concurrent connections with performance tracking', async () => {
      const connectionCount = 25;
      const connections = [];
      const metrics = {
        connectionTimes: [],
        initializationTimes: [],
        messagingTimes: []
      };

      try {
        // Create connections with timing
        const connectionPromises = [];
        
        for (let i = 0; i < connectionCount; i++) {
          const startTime = Date.now();
          
          const connectionPromise = new Promise((resolve, reject) => {
            const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
            const timeout = setTimeout(() => {
              reject(new Error(`Connection ${i} timeout`));
            }, 20000);

            let connectTime;
            let initTime;

            ws.on('open', () => {
              connectTime = Date.now() - startTime;
              metrics.connectionTimes.push(connectTime);
              connections.push(ws);
              
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: `perf-test-${i}`,
                timestamp: Date.now()
              }));
            });

            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                if (message.type === 'init_ack') {
                  initTime = Date.now() - startTime;
                  metrics.initializationTimes.push(initTime);
                  clearTimeout(timeout);
                  resolve({ index: i, connectTime, initTime });
                }
              } catch (error) {
                // Ignore non-JSON messages
              }
            });

            ws.on('error', (error) => {
              clearTimeout(timeout);
              reject(new Error(`Connection ${i} error: ${error.message}`));
            });
          });

          connectionPromises.push(connectionPromise);
        }

        const results = await Promise.all(connectionPromises);
        expect(results).toHaveLength(connectionCount);

        // Analyze performance metrics
        const avgConnectionTime = metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length;
        const avgInitTime = metrics.initializationTimes.reduce((a, b) => a + b, 0) / metrics.initializationTimes.length;
        
        console.log(`Performance Metrics for ${connectionCount} connections:`);
        console.log(`Average connection time: ${avgConnectionTime.toFixed(2)}ms`);
        console.log(`Average initialization time: ${avgInitTime.toFixed(2)}ms`);
        console.log(`Max connection time: ${Math.max(...metrics.connectionTimes)}ms`);
        console.log(`Min connection time: ${Math.min(...metrics.connectionTimes)}ms`);

        // Performance assertions
        expect(avgConnectionTime).toBeLessThan(5000); // < 5 seconds average
        expect(avgInitTime).toBeLessThan(8000); // < 8 seconds average
        expect(Math.max(...metrics.connectionTimes)).toBeLessThan(15000); // < 15 seconds max

        // Test concurrent messaging
        const messagingStartTime = Date.now();
        const messagePromises = connections.map((ws, index) => {
          return new Promise((resolve) => {
            const msgStartTime = Date.now();
            
            ws.on('message', (data) => {
              const responseTime = Date.now() - msgStartTime;
              metrics.messagingTimes.push(responseTime);
              resolve(responseTime);
            });

            ws.send(JSON.stringify({
              type: 'input',
              data: `echo "concurrent-test-${index}"\\n`,
              timestamp: Date.now()
            }));
          });
        });

        await Promise.all(messagePromises);
        const totalMessagingTime = Date.now() - messagingStartTime;
        
        console.log(`Concurrent messaging completed in: ${totalMessagingTime}ms`);
        console.log(`Average message response time: ${(metrics.messagingTimes.reduce((a, b) => a + b, 0) / metrics.messagingTimes.length).toFixed(2)}ms`);

        expect(totalMessagingTime).toBeLessThan(30000); // < 30 seconds for all messages

      } finally {
        // Clean up
        connections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        });
      }
    }, 60000);
  });

  describe('Server Stability Tests', () => {
    test('should maintain stable memory usage during load', async () => {
      const initialHealth = await fetch(`http://localhost:${TERMINAL_PORT}/health`);
      const initialHealthData = await initialHealth.json();
      const initialMemory = initialHealthData.memory.heapUsed;

      // Create moderate load
      const connections = [];
      const connectionCount = 15;

      try {
        // Establish connections
        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
          connections.push(ws);
          
          await new Promise(resolve => {
            ws.on('open', () => {
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: `stability-${i}`
              }));
              resolve();
            });
          });
        }

        // Simulate activity for 10 seconds
        const activityPromises = connections.map((ws, index) => {
          return new Promise(resolve => {
            let messageCount = 0;
            const interval = setInterval(() => {
              if (messageCount < 5) {
                ws.send(JSON.stringify({
                  type: 'input',
                  data: `echo "activity-${index}-${messageCount}"\\n`,
                  timestamp: Date.now()
                }));
                messageCount++;
              } else {
                clearInterval(interval);
                resolve();
              }
            }, 2000);
          });
        });

        await Promise.all(activityPromises);

        // Check memory after load
        const finalHealth = await fetch(`http://localhost:${TERMINAL_PORT}/health`);
        const finalHealthData = await finalHealth.json();
        const finalMemory = finalHealthData.memory.heapUsed;

        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

        console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (+${memoryIncrease} bytes, +${memoryIncreasePercent.toFixed(2)}%)`);

        // Memory increase should be reasonable
        expect(memoryIncreasePercent).toBeLessThan(500); // Less than 500% increase
        expect(finalMemory).toBeLessThan(500 * 1024 * 1024); // Less than 500MB

      } finally {
        connections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        });
      }
    }, 45000);

    test('should handle rapid connection/disconnection cycles', async () => {
      const cycleCount = 20;
      const cycles = [];

      for (let cycle = 0; cycle < cycleCount; cycle++) {
        const cyclePromise = new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
          const timeout = setTimeout(() => {
            reject(new Error(`Cycle ${cycle} timeout`));
          }, 8000);

          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'init',
              cols: 80,
              rows: 24,
              clientId: `cycle-${cycle}`
            }));
          });

          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === 'init_ack') {
                // Close immediately after initialization
                ws.close();
              }
            } catch (error) {
              // Ignore non-JSON
            }
          });

          ws.on('close', () => {
            clearTimeout(timeout);
            resolve(cycle);
          });

          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        cycles.push(cyclePromise);
        
        // Small delay between connections
        if (cycle % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const results = await Promise.all(cycles);
      expect(results).toHaveLength(cycleCount);

      // Verify server is still healthy
      const healthResponse = await fetch(`http://localhost:${TERMINAL_PORT}/health`);
      const healthData = await healthResponse.json();
      expect(healthData.status).toBe('healthy');
    }, 30000);
  });

  describe('Connection Quality Tests', () => {
    test('should maintain connection quality under moderate load', async () => {
      const connectionCount = 20;
      const connections = [];
      const qualityMetrics = [];

      try {
        // Establish connections
        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
          connections.push(ws);
          
          await new Promise(resolve => {
            ws.on('open', () => {
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: `quality-${i}`
              }));
              resolve();
            });
          });
        }

        // Test quality by measuring response times
        const qualityTests = connections.map((ws, index) => {
          return new Promise(resolve => {
            const startTime = Date.now();
            
            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                if (message.type === 'data') {
                  const responseTime = Date.now() - startTime;
                  qualityMetrics.push(responseTime);
                  resolve(responseTime);
                }
              } catch (error) {
                const responseTime = Date.now() - startTime;
                qualityMetrics.push(responseTime);
                resolve(responseTime);
              }
            });

            // Send test command
            ws.send(JSON.stringify({
              type: 'input',
              data: `echo "quality-test-${index}"\\n`,
              timestamp: Date.now()
            }));
          });
        });

        await Promise.all(qualityTests);

        // Analyze quality metrics
        const avgResponseTime = qualityMetrics.reduce((a, b) => a + b, 0) / qualityMetrics.length;
        const maxResponseTime = Math.max(...qualityMetrics);
        const minResponseTime = Math.min(...qualityMetrics);

        console.log(`Connection Quality Metrics:`);
        console.log(`Average response time: ${avgResponseTime.toFixed(2)}ms`);
        console.log(`Max response time: ${maxResponseTime}ms`);
        console.log(`Min response time: ${minResponseTime}ms`);

        // Quality assertions
        expect(avgResponseTime).toBeLessThan(2000); // < 2 seconds average
        expect(maxResponseTime).toBeLessThan(5000); // < 5 seconds max
        
        // Verify consistency (standard deviation)
        const variance = qualityMetrics.reduce((sum, time) => {
          return sum + Math.pow(time - avgResponseTime, 2);
        }, 0) / qualityMetrics.length;
        const standardDeviation = Math.sqrt(variance);
        
        console.log(`Response time standard deviation: ${standardDeviation.toFixed(2)}ms`);
        expect(standardDeviation).toBeLessThan(1000); // Reasonable consistency

      } finally {
        connections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        });
      }
    }, 40000);
  });
});
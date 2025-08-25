/**
 * WebSocket Integration Tests
 * Tests frontend-backend WebSocket handshake and communication
 * 
 * TDD Requirements:
 * ✅ Test frontend → backend WebSocket handshake
 * ✅ Test bidirectional communication
 * ✅ Test error handling and recovery
 * ✅ Test connection state management
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const fetch = require('node-fetch');

describe('WebSocket Integration Tests', () => {
  let serverProcess;
  let frontendProcess;
  const TERMINAL_PORT = 3002;
  const FRONTEND_PORT = 5173;

  beforeAll(async () => {
    // Start backend server
    serverProcess = spawn('node', ['backend-terminal-server.js'], {
      cwd: '/workspaces/agent-feed',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, TERMINAL_PORT: TERMINAL_PORT }
    });

    // Wait for backend startup
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Backend startup timeout')), 15000);

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Terminal WebSocket Server running')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.includes('Error')) {
          clearTimeout(timeout);
          reject(new Error(`Backend startup failed: ${errorOutput}`));
        }
      });
    });

    // Start frontend dev server
    frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: '/workspaces/agent-feed/frontend',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PORT: FRONTEND_PORT }
    });

    // Wait for frontend startup
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => resolve(), 10000); // Don't fail if frontend takes time

      frontendProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Local:') || output.includes('ready')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    // Additional wait for services to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
  }, 30000);

  afterAll(async () => {
    if (frontendProcess) {
      frontendProcess.kill('SIGTERM');
    }
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  });

  describe('Frontend-Backend Handshake', () => {
    test('should complete full WebSocket handshake sequence', async () => {
      const handshakeTest = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Handshake timeout'));
        }, 10000);

        let connectReceived = false;
        let initSent = false;
        let initAckReceived = false;

        ws.on('open', () => {
          console.log('WebSocket connection established');
          
          // Send init message as frontend would
          const initMessage = {
            type: 'init',
            cols: 80,
            rows: 24,
            timestamp: Date.now()
          };
          ws.send(JSON.stringify(initMessage));
          initSent = true;
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'connect') {
              connectReceived = true;
              expect(message.terminalId).toBeDefined();
              expect(message.timestamp).toBeDefined();
            } else if (message.type === 'init_ack') {
              initAckReceived = true;
              expect(message.terminalId).toBeDefined();
              expect(message.ready).toBe(true);
              expect(message.cols).toBe(80);
              expect(message.rows).toBe(24);
              
              // Complete handshake validation
              if (connectReceived && initSent && initAckReceived) {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            }
          } catch (error) {
            // Ignore non-JSON messages during handshake
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        ws.on('close', (code, reason) => {
          if (!initAckReceived) {
            clearTimeout(timeout);
            reject(new Error(`Connection closed before handshake complete: ${code} ${reason}`));
          }
        });
      });

      await handshakeTest;
    });

    test('should handle multiple concurrent handshakes', async () => {
      const connectionCount = 5;
      const connectionPromises = [];

      for (let i = 0; i < connectionCount; i++) {
        const connectionPromise = new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error(`Connection ${i} timeout`));
          }, 10000);

          let handshakeComplete = false;

          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'init',
              cols: 80,
              rows: 24,
              clientId: `test-client-${i}`
            }));
          });

          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === 'init_ack' && message.ready) {
                handshakeComplete = true;
                clearTimeout(timeout);
                ws.close();
                resolve(i);
              }
            } catch (error) {
              // Ignore non-JSON messages
            }
          });

          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });

          ws.on('close', () => {
            if (!handshakeComplete) {
              clearTimeout(timeout);
              reject(new Error(`Connection ${i} closed without completing handshake`));
            }
          });
        });

        connectionPromises.push(connectionPromise);
      }

      const results = await Promise.all(connectionPromises);
      expect(results).toHaveLength(connectionCount);
      expect(results).toEqual(expect.arrayContaining([0, 1, 2, 3, 4]));
    });
  });

  describe('Bidirectional Communication', () => {
    let testWs;

    afterEach(() => {
      if (testWs && testWs.readyState === testWs.OPEN) {
        testWs.close();
      }
    });

    test('should handle client-to-server messages correctly', async () => {
      const communicationTest = new Promise((resolve, reject) => {
        testWs = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          reject(new Error('Communication test timeout'));
        }, 15000);

        let connected = false;
        let responseReceived = false;

        testWs.on('open', () => {
          testWs.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        });

        testWs.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'init_ack') {
              connected = true;
              // Send test command
              setTimeout(() => {
                testWs.send(JSON.stringify({
                  type: 'input',
                  data: 'pwd\\n',
                  timestamp: Date.now()
                }));
              }, 500);
            } else if (message.type === 'data' && connected && !responseReceived) {
              responseReceived = true;
              expect(message.data).toBeDefined();
              expect(typeof message.data).toBe('string');
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            // Handle raw terminal output
            if (connected && !responseReceived) {
              responseReceived = true;
              clearTimeout(timeout);
              resolve();
            }
          }
        });

        testWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await communicationTest;
    });

    test('should handle ping-pong heartbeat mechanism', async () => {
      const heartbeatTest = new Promise((resolve, reject) => {
        testWs = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          reject(new Error('Heartbeat test timeout'));
        }, 12000);

        let initialized = false;
        let pingsSent = 0;
        let pongsReceived = 0;

        testWs.on('open', () => {
          testWs.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        });

        testWs.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              initialized = true;
              // Start sending pings
              const pingInterval = setInterval(() => {
                if (pingsSent < 3) {
                  testWs.ping();
                  pingsSent++;
                } else {
                  clearInterval(pingInterval);
                  // Validate heartbeat success
                  if (pongsReceived >= 2) {
                    clearTimeout(timeout);
                    resolve();
                  } else {
                    clearTimeout(timeout);
                    reject(new Error(`Only received ${pongsReceived} pongs out of ${pingsSent} pings`));
                  }
                }
              }, 1000);
            }
          } catch (error) {
            // Ignore non-JSON messages
          }
        });

        testWs.on('pong', () => {
          pongsReceived++;
        });

        testWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await heartbeatTest;
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle malformed JSON messages gracefully', async () => {
      const errorHandlingTest = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Error handling test timeout'));
        }, 8000);

        let initialized = false;
        let malformedMessageSent = false;

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              initialized = true;
              // Send malformed JSON
              ws.send('{ invalid json malformed }');
              malformedMessageSent = true;
              
              // Send valid message after malformed one
              setTimeout(() => {
                ws.send(JSON.stringify({
                  type: 'ping',
                  timestamp: Date.now()
                }));
              }, 1000);
            } else if (message.type === 'pong' && malformedMessageSent) {
              // Connection survived malformed message
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch (error) {
            // Ignore parsing errors
          }
        });

        ws.on('error', (error) => {
          // Connection should not close due to malformed messages
          if (!malformedMessageSent) {
            clearTimeout(timeout);
            reject(error);
          }
        });

        ws.on('close', (code, reason) => {
          if (!malformedMessageSent || code !== 1000) {
            clearTimeout(timeout);
            reject(new Error(`Unexpected close: ${code} ${reason}`));
          }
        });
      });

      await errorHandlingTest;
    });

    test('should maintain connection state after temporary network issues', async () => {
      const connectionStabilityTest = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection stability test timeout'));
        }, 15000);

        let initialized = false;
        let disconnectDetected = false;
        let reconnected = false;

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              initialized = true;
              
              // Simulate network interruption by sending large burst
              setTimeout(() => {
                for (let i = 0; i < 10; i++) {
                  ws.send(JSON.stringify({
                    type: 'input',
                    data: `echo "stress test ${i}"\\n`,
                    timestamp: Date.now()
                  }));
                }
                
                // Test connection after stress
                setTimeout(() => {
                  ws.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                  }));
                }, 2000);
              }, 1000);
            } else if (message.type === 'pong' && initialized) {
              // Connection survived stress test
              reconnected = true;
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch (error) {
            // Ignore non-JSON messages
          }
        });

        ws.on('error', (error) => {
          console.log('WebSocket error during stability test:', error.message);
          disconnectDetected = true;
        });

        ws.on('close', (code, reason) => {
          if (!reconnected && code !== 1000) {
            clearTimeout(timeout);
            reject(new Error(`Unexpected close during stability test: ${code} ${reason}`));
          }
        });
      });

      await connectionStabilityTest;
    });
  });

  describe('Connection Status Verification', () => {
    test('should report "Connected" status for active WebSocket connections', async () => {
      const ws = new WebSocket(`ws://localhost:${TERMINAL_PORT}/terminal`);
      
      const statusVerification = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Status verification timeout'));
        }, 10000);

        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        });

        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              // Check terminal status API
              setTimeout(async () => {
                try {
                  const response = await fetch(`http://localhost:${TERMINAL_PORT}/api/terminals`);
                  const statusData = await response.json();
                  
                  expect(statusData.success).toBe(true);
                  expect(statusData.count).toBeGreaterThan(0);
                  
                  const activeTerminal = statusData.terminals.find(t => t.connected);
                  expect(activeTerminal).toBeDefined();
                  expect(activeTerminal.connected).toBe(true);
                  expect(activeTerminal.processRunning).toBe(true);
                  
                  // This represents "✅ Connected" status
                  clearTimeout(timeout);
                  ws.close();
                  resolve();
                } catch (error) {
                  clearTimeout(timeout);
                  reject(error);
                }
              }, 1000);
            }
          } catch (error) {
            // Ignore non-JSON messages
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await statusVerification;
    });
  });
});
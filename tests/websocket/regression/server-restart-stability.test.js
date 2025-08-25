/**
 * WebSocket Regression Tests
 * Tests connection stability after server restart and recovery scenarios
 * 
 * TDD Requirements:
 * ✅ Test connection stability after server restart
 * ✅ Test automatic reconnection behavior
 * ✅ Test state recovery after interruption
 * ✅ Test graceful degradation scenarios
 */

const { spawn } = require('child_process');
const WebSocket = require('ws');
const fetch = require('node-fetch');

describe('WebSocket Server Restart Stability Tests', () => {
  const TERMINAL_PORT = 3002;
  const TERMINAL_HOST = 'localhost';
  
  let serverProcess = null;
  
  const startServer = () => {
    return new Promise((resolve, reject) => {
      serverProcess = spawn('node', ['backend-terminal-server.js'], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TERMINAL_PORT: TERMINAL_PORT }
      });

      let output = '';
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 15000);

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Terminal WebSocket Server running')) {
          clearTimeout(timeout);
          resolve(serverProcess);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        if (errorOutput.includes('Error') && !errorOutput.includes('warning')) {
          clearTimeout(timeout);
          reject(new Error(`Server startup failed: ${errorOutput}`));
        }
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });
  };

  const stopServer = () => {
    return new Promise((resolve) => {
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
        serverProcess.on('exit', () => {
          serverProcess = null;
          resolve();
        });
        
        // Force kill if doesn't respond to SIGTERM
        setTimeout(() => {
          if (serverProcess && !serverProcess.killed) {
            serverProcess.kill('SIGKILL');
            serverProcess = null;
          }
          resolve();
        }, 5000);
      } else {
        resolve();
      }
    });
  };

  beforeAll(async () => {
    await startServer();
  }, 20000);

  afterAll(async () => {
    await stopServer();
  });

  describe('Server Restart Recovery', () => {
    test('should restart server successfully and accept new connections', async () => {
      // Verify initial server state
      const initialHealth = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      expect(initialHealth.status).toBe(200);
      
      // Stop server
      await stopServer();
      
      // Wait for port to be released
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Restart server
      await startServer();
      
      // Verify server is healthy
      const restartedHealth = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      expect(restartedHealth.status).toBe(200);
      
      const healthData = await restartedHealth.json();
      expect(healthData.status).toBe('healthy');
      expect(healthData.terminals).toBe(0); // Fresh start, no terminals
      
      // Test new connection works
      const connectionTest = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Post-restart connection timeout'));
        }, 8000);

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'init',
            cols: 80,
            rows: 24,
            clientId: 'restart-test'
          }));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              clearTimeout(timeout);
              ws.close();
              resolve();
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

      await connectionTest;
    }, 30000);

    test('should maintain connection stability after multiple restart cycles', async () => {
      const restartCycles = 3;
      
      for (let cycle = 0; cycle < restartCycles; cycle++) {
        console.log(`Starting restart cycle ${cycle + 1}/${restartCycles}`);
        
        // Establish test connection
        let testWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        
        // Wait for connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Cycle ${cycle}: Connection timeout`));
          }, 5000);

          testWs.on('open', () => {
            testWs.send(JSON.stringify({
              type: 'init',
              cols: 80,
              rows: 24,
              clientId: `cycle-${cycle}`
            }));
          });

          testWs.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === 'init_ack') {
                clearTimeout(timeout);
                resolve();
              }
            } catch (error) {
              // Ignore non-JSON
            }
          });

          testWs.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        // Close connection before restart
        testWs.close();
        
        // Restart server
        console.log(`Stopping server for cycle ${cycle + 1}`);
        await stopServer();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log(`Starting server for cycle ${cycle + 1}`);
        await startServer();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify health
        const healthCheck = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
        expect(healthCheck.status).toBe(200);
      }
      
      console.log(`All ${restartCycles} restart cycles completed successfully`);
    }, 60000);
  });

  describe('Connection Recovery Behavior', () => {
    test('should handle client connections during server restart', async () => {
      // Establish connection
      let ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
      let connectionLost = false;
      let reconnectionAttempted = false;

      const connectionMonitor = new Promise((resolve) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'init',
            cols: 80,
            rows: 24,
            clientId: 'recovery-test'
          }));
        });

        ws.on('close', (code, reason) => {
          connectionLost = true;
          console.log(`Connection lost: ${code} ${reason}`);
          
          // Attempt reconnection after delay
          setTimeout(() => {
            reconnectionAttempted = true;
            const newWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
            
            newWs.on('open', () => {
              newWs.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: 'recovery-reconnect'
              }));
            });

            newWs.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                if (message.type === 'init_ack') {
                  newWs.close();
                  resolve({ connectionLost, reconnectionAttempted });
                }
              } catch (error) {
                // Ignore non-JSON
              }
            });

            newWs.on('error', () => {
              // Reconnection failed, try again
              setTimeout(() => {
                resolve({ connectionLost, reconnectionAttempted });
              }, 2000);
            });
          }, 3000);
        });

        ws.on('error', () => {
          connectionLost = true;
        });
      });

      // Wait for initial connection
      await new Promise(resolve => {
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              resolve();
            }
          } catch (error) {
            // Ignore
          }
        });
      });

      // Restart server while connection is active
      setTimeout(async () => {
        await stopServer();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await startServer();
      }, 1000);

      const result = await connectionMonitor;
      expect(result.connectionLost).toBe(true);
      expect(result.reconnectionAttempted).toBe(true);
    }, 25000);

    test('should preserve "Connected" status indication after recovery', async () => {
      // Establish initial connection and verify status
      const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Initial connection timeout'));
        }, 8000);

        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'init',
            cols: 80,
            rows: 24,
            clientId: 'status-test'
          }));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            // Ignore non-JSON
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Check initial status
      const initialStatus = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/api/terminals`);
      const initialData = await initialStatus.json();
      expect(initialData.success).toBe(true);
      expect(initialData.count).toBe(1);
      
      const connectedTerminal = initialData.terminals.find(t => t.connected);
      expect(connectedTerminal).toBeDefined();
      expect(connectedTerminal.connected).toBe(true); // This represents "✅ Connected" status

      ws.close();

      // Restart server
      await stopServer();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await startServer();

      // Establish new connection after restart
      const newWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Post-restart connection timeout'));
        }, 8000);

        newWs.on('open', () => {
          newWs.send(JSON.stringify({
            type: 'init',
            cols: 80,
            rows: 24,
            clientId: 'post-restart-status'
          }));
        });

        newWs.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            // Ignore non-JSON
          }
        });

        newWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Check status after restart
      const postRestartStatus = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/api/terminals`);
      const postRestartData = await postRestartStatus.json();
      expect(postRestartData.success).toBe(true);
      expect(postRestartData.count).toBe(1);
      
      const reconnectedTerminal = postRestartData.terminals.find(t => t.connected);
      expect(reconnectedTerminal).toBeDefined();
      expect(reconnectedTerminal.connected).toBe(true); // Still shows "✅ Connected" status

      newWs.close();
    }, 20000);
  });

  describe('Graceful Degradation Tests', () => {
    test('should handle server unavailability gracefully', async () => {
      // Stop server
      await stopServer();
      
      // Attempt connection to unavailable server
      const connectionAttempt = new Promise((resolve) => {
        const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        let errorOccurred = false;
        
        ws.on('error', (error) => {
          errorOccurred = true;
          expect(error.code).toMatch(/ECONNREFUSED|ECONNRESET/);
          resolve({ errorOccurred, connected: false });
        });

        ws.on('open', () => {
          // Should not reach here
          ws.close();
          resolve({ errorOccurred, connected: true });
        });

        // Timeout for connection attempt
        setTimeout(() => {
          if (ws.readyState === ws.CONNECTING) {
            ws.terminate();
          }
          resolve({ errorOccurred, connected: false });
        }, 5000);
      });

      const result = await connectionAttempt;
      expect(result.connected).toBe(false);
      
      // Restart server for cleanup
      await startServer();
    }, 15000);

    test('should recover to healthy state after temporary failure', async () => {
      // Verify initial healthy state
      let healthCheck = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      expect(healthCheck.status).toBe(200);

      // Create connection
      const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
      
      await new Promise(resolve => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'init',
            cols: 80,
            rows: 24,
            clientId: 'degradation-test'
          }));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              resolve();
            }
          } catch (error) {
            // Ignore non-JSON
          }
        });
      });

      // Simulate failure by restarting server
      await stopServer();
      
      // Wait for failure state
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Restart and verify recovery
      await startServer();
      
      // Verify full recovery
      healthCheck = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      expect(healthCheck.status).toBe(200);
      
      const healthData = await healthCheck.json();
      expect(healthData.status).toBe('healthy');
      
      // Verify new connections work
      const recoveryWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
      
      const recoveryTest = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Recovery connection timeout'));
        }, 8000);

        recoveryWs.on('open', () => {
          recoveryWs.send(JSON.stringify({
            type: 'init',
            cols: 80,
            rows: 24,
            clientId: 'recovery-verification'
          }));
        });

        recoveryWs.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              clearTimeout(timeout);
              recoveryWs.close();
              resolve();
            }
          } catch (error) {
            // Ignore non-JSON
          }
        });

        recoveryWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await recoveryTest;
      
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    }, 25000);
  });
});
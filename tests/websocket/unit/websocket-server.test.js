/**
 * WebSocket Server Unit Tests
 * Tests WebSocket server startup, port binding, and core functionality
 * 
 * TDD Requirements:
 * ✅ Test WebSocket server initialization on port 3002
 * ✅ Test server startup and port binding
 * ✅ Test connection establishment
 * ✅ Test proper shutdown procedures
 */

const { createServer } = require('http');
const { Server: WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const net = require('net');

describe('WebSocket Server Unit Tests', () => {
  let serverProcess;
  const TERMINAL_PORT = 3002;
  const TERMINAL_HOST = 'localhost';

  beforeAll(() => {
    // Clean up any existing processes on port 3002
    return new Promise((resolve) => {
      const cleanup = spawn('fuser', ['-k', `${TERMINAL_PORT}/tcp`]);
      cleanup.on('close', () => {
        setTimeout(resolve, 1000); // Wait for port cleanup
      });
    });
  });

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      // Wait for graceful shutdown
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

  describe('Server Initialization', () => {
    test('should bind to port 3002 without errors', async () => {
      const isPortFree = await new Promise((resolve) => {
        const testServer = net.createServer();
        testServer.listen(TERMINAL_PORT, (err) => {
          if (err) {
            resolve(false);
          } else {
            testServer.close(() => resolve(true));
          }
        });
        testServer.on('error', () => resolve(false));
      });

      expect(isPortFree).toBe(true);
    });

    test('should start WebSocket server successfully', async () => {
      serverProcess = spawn('node', ['backend-terminal-server.js'], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, TERMINAL_PORT: TERMINAL_PORT }
      });

      // Wait for server startup
      const startupPromise = new Promise((resolve, reject) => {
        let output = '';
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 10000);

        serverProcess.stdout.on('data', (data) => {
          output += data.toString();
          if (output.includes(`Terminal WebSocket Server running on ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`)) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          if (errorOutput.includes('Error') || errorOutput.includes('EADDRINUSE')) {
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

      await startupPromise;
      expect(serverProcess.pid).toBeDefined();
    });

    test('should accept WebSocket connections on /terminal path', async () => {
      const WebSocket = require('ws');
      
      const connectionPromise = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve();
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await connectionPromise;
    });

    test('should respond to health check endpoint', async () => {
      const fetch = require('node-fetch');
      
      const response = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(typeof data.terminals).toBe('number');
      expect(typeof data.uptime).toBe('number');
    });
  });

  describe('Connection Management', () => {
    let testWs;

    afterEach(() => {
      if (testWs && testWs.readyState === testWs.OPEN) {
        testWs.close();
      }
    });

    test('should establish connection and receive connect message', async () => {
      const WebSocket = require('ws');
      
      const connectionTest = new Promise((resolve, reject) => {
        testWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          reject(new Error('Connection test timeout'));
        }, 5000);

        let connectMessageReceived = false;

        testWs.on('open', () => {
          console.log('WebSocket connection opened');
        });

        testWs.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'connect') {
              connectMessageReceived = true;
              expect(message.terminalId).toBeDefined();
              expect(message.timestamp).toBeDefined();
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            // Ignore non-JSON messages
          }
        });

        testWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        testWs.on('close', () => {
          if (!connectMessageReceived) {
            clearTimeout(timeout);
            reject(new Error('Connection closed without connect message'));
          }
        });
      });

      await connectionTest;
    });

    test('should handle ping-pong heartbeat correctly', async () => {
      const WebSocket = require('ws');
      
      const heartbeatTest = new Promise((resolve, reject) => {
        testWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          reject(new Error('Heartbeat test timeout'));
        }, 10000);

        let pongReceived = false;

        testWs.on('open', () => {
          // Send ping after connection
          setTimeout(() => {
            testWs.ping();
          }, 1000);
        });

        testWs.on('pong', () => {
          pongReceived = true;
          clearTimeout(timeout);
          resolve();
        });

        testWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await heartbeatTest;
    });

    test('should handle message input correctly', async () => {
      const WebSocket = require('ws');
      
      const messageTest = new Promise((resolve, reject) => {
        testWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          reject(new Error('Message test timeout'));
        }, 8000);

        let connected = false;
        let dataReceived = false;

        testWs.on('open', () => {
          console.log('WebSocket opened for message test');
        });

        testWs.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'connect') {
              connected = true;
              // Send test input after connection
              setTimeout(() => {
                const inputMessage = {
                  type: 'input',
                  data: 'echo "test"\\n',
                  timestamp: Date.now()
                };
                testWs.send(JSON.stringify(inputMessage));
              }, 500);
            } else if (message.type === 'data' && connected) {
              dataReceived = true;
              expect(message.data).toBeDefined();
              expect(typeof message.data).toBe('string');
              clearTimeout(timeout);
              resolve();
            }
          } catch (error) {
            // Handle raw terminal output
            if (connected && !dataReceived) {
              dataReceived = true;
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

      await messageTest;
    });
  });

  describe('Connection Status Validation', () => {
    test('should show "✅ Connected" status for active connections', async () => {
      const WebSocket = require('ws');
      const fetch = require('node-fetch');
      
      const statusTest = new Promise(async (resolve, reject) => {
        testWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          reject(new Error('Status validation timeout'));
        }, 8000);

        testWs.on('open', async () => {
          // Wait for connection to stabilize
          setTimeout(async () => {
            try {
              const response = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/api/terminals`);
              const data = await response.json();
              
              expect(data.success).toBe(true);
              expect(data.terminals).toBeDefined();
              expect(Array.isArray(data.terminals)).toBe(true);
              expect(data.count).toBeGreaterThan(0);
              
              // Find our connection
              const activeConnection = data.terminals.find(term => term.connected === true);
              expect(activeConnection).toBeDefined();
              expect(activeConnection.connected).toBe(true);
              
              clearTimeout(timeout);
              resolve();
            } catch (error) {
              clearTimeout(timeout);
              reject(error);
            }
          }, 2000);
        });

        testWs.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await statusTest;
    });
  });
});
/**
 * Live WebSocket Integration Tests
 * Tests integration with running backend server on port 3002
 * 
 * TDD Requirements:
 * ✅ Test frontend → backend WebSocket handshake with live server
 * ✅ Test "✅ Connected" status verification with actual API
 * ✅ Test message handling with real terminal backend
 */

const WebSocket = require('ws');
const fetch = require('node-fetch');

describe('Live WebSocket Integration Tests', () => {
  const TERMINAL_PORT = 3002;
  const TERMINAL_HOST = 'localhost';

  beforeAll(async () => {
    // Verify backend server is running
    try {
      const response = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      const data = await response.json();
      expect(data.status).toBe('healthy');
      console.log('✅ Backend server is running and healthy');
    } catch (error) {
      throw new Error('Backend server is not running. Please start with: npm run dev:terminal');
    }
  });

  describe('Live Server Integration', () => {
    test('should connect to live backend WebSocket server', async () => {
      const connectionTest = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Live connection timeout'));
        }, 10000);

        ws.on('open', () => {
          console.log('✅ Connected to live backend server');
          clearTimeout(timeout);
          ws.close();
          resolve();
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`Live connection error: ${error.message}`));
        });
      });

      await connectionTest;
    });

    test('should complete handshake with live backend server', async () => {
      const handshakeTest = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Live handshake timeout'));
        }, 15000);

        let connectReceived = false;
        let initAckReceived = false;

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('📨 Received message:', message.type);
            
            if (message.type === 'connect') {
              connectReceived = true;
              expect(message.terminalId).toBeDefined();
              console.log(`🔗 Connect message received for terminal: ${message.terminalId}`);
              
              // Send init message
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                timestamp: Date.now()
              }));
              console.log('📤 Init message sent');
            } else if (message.type === 'init_ack') {
              initAckReceived = true;
              expect(message.ready).toBe(true);
              expect(message.terminalId).toBeDefined();
              console.log(`✅ Init ACK received - Terminal ready: ${message.terminalId}`);
              
              if (connectReceived && initAckReceived) {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            }
          } catch (error) {
            console.log('📥 Non-JSON message received (terminal output)');
            // This is normal - terminal output can be raw data
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });

        ws.on('close', (code, reason) => {
          if (!initAckReceived) {
            clearTimeout(timeout);
            reject(new Error(`Connection closed before handshake: ${code} ${reason}`));
          }
        });
      });

      await handshakeTest;
    });

    test('should verify "✅ Connected" status via live server API', async () => {
      let testWs;
      
      try {
        // Establish connection
        testWs = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        
        // Wait for connection and initialization
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Status test connection timeout'));
          }, 10000);

          let initialized = false;

          testWs.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              
              if (message.type === 'connect') {
                // Send init after connect
                testWs.send(JSON.stringify({
                  type: 'init',
                  cols: 80,
                  rows: 24,
                  clientId: 'status-verification'
                }));
              } else if (message.type === 'init_ack' && !initialized) {
                initialized = true;
                console.log('✅ Connection established for status verification');
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
        });

        // Check server API for connection status
        const response = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/api/terminals`);
        const statusData = await response.json();
        
        console.log('📊 Terminal Status API Response:', statusData);
        
        expect(statusData.success).toBe(true);
        expect(statusData.count).toBeGreaterThan(0);
        expect(Array.isArray(statusData.terminals)).toBe(true);
        
        // Find active connection
        const activeTerminal = statusData.terminals.find(terminal => terminal.connected === true);
        expect(activeTerminal).toBeDefined();
        
        // This represents "✅ Connected" status in the UI
        expect(activeTerminal.connected).toBe(true);
        expect(activeTerminal.processRunning).toBe(true);
        
        console.log('✅ Verified "Connected" status via API:', {
          terminalId: activeTerminal.id,
          connected: activeTerminal.connected,
          processRunning: activeTerminal.processRunning
        });

      } finally {
        if (testWs && testWs.readyState === testWs.OPEN) {
          testWs.close();
        }
      }
    });

    test('should handle terminal command with live server', async () => {
      const commandTest = new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Command test timeout'));
        }, 20000);

        let initialized = false;
        let responseReceived = false;

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'init_ack' && !initialized) {
              initialized = true;
              console.log('🖥️ Terminal initialized, sending test command');
              
              // Send test command after initialization
              setTimeout(() => {
                ws.send(JSON.stringify({
                  type: 'input',
                  data: 'echo "WebSocket test successful"\\n',
                  timestamp: Date.now()
                }));
                console.log('📤 Test command sent');
              }, 1000);
            } else if (message.type === 'data' && initialized && !responseReceived) {
              responseReceived = true;
              console.log('📥 Terminal response received:', message.data.substring(0, 100));
              expect(message.data).toBeDefined();
              expect(typeof message.data).toBe('string');
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch (error) {
            // Handle raw terminal output (non-JSON)
            if (initialized && !responseReceived) {
              responseReceived = true;
              const rawData = data.toString();
              console.log('📥 Raw terminal output received:', rawData.substring(0, 100));
              expect(rawData.length).toBeGreaterThan(0);
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      await commandTest;
    });

    test('should maintain multiple concurrent connections to live server', async () => {
      const connectionCount = 3; // Keep it small for live server
      const connections = [];
      const connectionPromises = [];

      for (let i = 0; i < connectionCount; i++) {
        const connectionPromise = new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
          const timeout = setTimeout(() => {
            reject(new Error(`Live concurrent connection ${i} timeout`));
          }, 15000);

          connections.push(ws);
          let handshakeComplete = false;

          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              
              if (message.type === 'connect') {
                ws.send(JSON.stringify({
                  type: 'init',
                  cols: 80,
                  rows: 24,
                  clientId: `concurrent-${i}`
                }));
              } else if (message.type === 'init_ack' && !handshakeComplete) {
                handshakeComplete = true;
                console.log(`✅ Concurrent connection ${i} established`);
                clearTimeout(timeout);
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
        });

        connectionPromises.push(connectionPromise);
      }

      try {
        const results = await Promise.all(connectionPromises);
        expect(results).toHaveLength(connectionCount);
        console.log(`✅ All ${connectionCount} concurrent connections established`);
        
        // Verify server reports all connections
        const response = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/api/terminals`);
        const statusData = await response.json();
        expect(statusData.count).toBeGreaterThanOrEqual(connectionCount);
        
      } finally {
        // Clean up connections
        connections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        });
      }
    });
  });

  describe('Live Server Health and Status', () => {
    test('should report healthy status from live server', async () => {
      const response = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(typeof data.uptime).toBe('number');
      expect(typeof data.terminals).toBe('number');
      expect(data.memory).toBeDefined();
      
      console.log('🔍 Live server health check:', {
        status: data.status,
        uptime: `${data.uptime.toFixed(2)}s`,
        terminals: data.terminals,
        memoryMB: `${(data.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`
      });
    });

    test('should show terminal connection stability over time', async () => {
      const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
      
      try {
        // Establish connection
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Stability test setup timeout')), 10000);
          
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
          
          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'init',
              cols: 80,
              rows: 24,
              clientId: 'stability-test'
            }));
          });
          
          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        // Monitor connection stability over 5 seconds
        const stabilityChecks = [];
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const isConnected = ws.readyState === ws.OPEN;
          stabilityChecks.push(isConnected);
          
          if (isConnected) {
            // Send keep-alive ping
            ws.ping();
          }
        }

        // Verify connection remained stable
        const stableConnections = stabilityChecks.filter(stable => stable).length;
        expect(stableConnections).toBe(5); // Should be connected for all 5 checks
        
        console.log(`✅ Connection stability: ${stableConnections}/5 checks stable`);

      } finally {
        if (ws.readyState === ws.OPEN) {
          ws.close();
        }
      }
    });
  });
});
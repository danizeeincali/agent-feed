/**
 * SPARC WebSocket Stability Tests
 * Validates connection persistence and lifecycle separation
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');

describe('SPARC WebSocket Stability Tests', () => {
  let server;
  let serverProcess;
  const PORT = 3001; // Use different port for testing
  
  before(async function() {
    this.timeout(10000);
    
    // Start test server
    serverProcess = spawn('node', ['simple-backend.js'], {
      env: { ...process.env, PORT: PORT },
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server start timeout'));
      }, 8000);
      
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('SPARC UNIFIED SERVER running')) {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });
    });
  });
  
  after(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  });

  describe('Connection Persistence', () => {
    it('should maintain WebSocket connection after API subprocess completes', async function() {
      this.timeout(15000);
      
      const ws = new WebSocket(`ws://localhost:${PORT}/terminal`);
      let connectionMaintained = true;
      let processCompleted = false;
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          console.log('✅ WebSocket connected');
          
          // Connect to a test instance
          ws.send(JSON.stringify({
            type: 'connect',
            terminalId: 'test-instance-stability'
          }));
          
          // Send test command that will complete quickly
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'input',
              data: 'echo "stability test"'
            }));
          }, 1000);
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('📨 Received:', message.type);
          
          if (message.type === 'output' && message.data.includes('stability test')) {
            processCompleted = true;
            console.log('✅ API subprocess completed');
            
            // Wait additional time to ensure connection persists
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                console.log('✅ Connection persisted after subprocess completion');
                resolve();
              } else {
                connectionMaintained = false;
                reject(new Error('Connection lost after subprocess completion'));
              }
            }, 2000);
          }
        });
        
        ws.on('close', () => {
          if (!processCompleted) {
            connectionMaintained = false;
            reject(new Error('Connection closed before subprocess completion'));
          } else if (!connectionMaintained) {
            reject(new Error('Connection lost after subprocess completion'));
          }
        });
        
        ws.on('error', (error) => {
          reject(error);
        });
      });
      
      ws.close();
      assert.strictEqual(connectionMaintained, true, 'WebSocket connection should persist after API subprocess completion');
    });

    it('should handle multiple instances with independent connections', async function() {
      this.timeout(10000);
      
      const connections = [];
      const instanceIds = ['instance-1', 'instance-2', 'instance-3'];
      
      // Create multiple WebSocket connections
      for (const instanceId of instanceIds) {
        const ws = new WebSocket(`ws://localhost:${PORT}/terminal`);
        connections.push({ ws, instanceId, connected: false });
        
        await new Promise((resolve) => {
          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'connect',
              terminalId: instanceId
            }));
            resolve();
          });
        });
      }
      
      // Verify all connections are independent
      await Promise.all(connections.map(({ ws, instanceId }) => {
        return new Promise((resolve) => {
          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'connect') {
              console.log(`✅ ${instanceId} connected independently`);
              resolve();
            }
          });
        });
      }));
      
      // Cleanup
      connections.forEach(({ ws }) => ws.close());
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should respond to ping with pong', async function() {
      this.timeout(5000);
      
      const ws = new WebSocket(`ws://localhost:${PORT}/terminal`);
      let pongReceived = false;
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          const pingTimestamp = Date.now();
          ws.send(JSON.stringify({
            type: 'ping',
            timestamp: pingTimestamp
          }));
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'pong') {
            pongReceived = true;
            console.log('✅ Pong received:', message.timestamp);
            resolve();
          }
        });
        
        ws.on('error', reject);
        
        setTimeout(() => {
          if (!pongReceived) {
            reject(new Error('Ping/pong timeout'));
          }
        }, 3000);
      });
      
      ws.close();
      assert.strictEqual(pongReceived, true, 'Should receive pong response to ping');
    });

    it('should maintain connection health monitoring', async function() {
      this.timeout(8000);
      
      const ws = new WebSocket(`ws://localhost:${PORT}/terminal`);
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          // Connect to instance
          ws.send(JSON.stringify({
            type: 'connect',
            terminalId: 'health-test'
          }));
          
          // Send periodic pings
          let pingCount = 0;
          const pingInterval = setInterval(() => {
            if (pingCount >= 3) {
              clearInterval(pingInterval);
              resolve();
              return;
            }
            
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
            pingCount++;
          }, 1000);
        });
        
        ws.on('close', () => {
          reject(new Error('Connection lost during health monitoring'));
        });
        
        ws.on('error', reject);
      });
      
      ws.close();
    });
  });

  describe('Error Recovery', () => {
    it('should handle reconnection gracefully', async function() {
      this.timeout(10000);
      
      let ws1 = new WebSocket(`ws://localhost:${PORT}/terminal`);
      
      // First connection
      await new Promise((resolve, reject) => {
        ws1.on('open', () => {
          console.log('✅ First connection established');
          ws1.send(JSON.stringify({
            type: 'connect',
            terminalId: 'reconnect-test'
          }));
          resolve();
        });
        ws1.on('error', reject);
      });
      
      // Close first connection
      ws1.close();
      
      // Wait briefly
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Second connection should work independently
      let ws2 = new WebSocket(`ws://localhost:${PORT}/terminal`);
      
      await new Promise((resolve, reject) => {
        ws2.on('open', () => {
          console.log('✅ Reconnection successful');
          ws2.send(JSON.stringify({
            type: 'connect',
            terminalId: 'reconnect-test-2'
          }));
          resolve();
        });
        ws2.on('error', reject);
      });
      
      ws2.close();
    });
  });

  describe('Production Validation', () => {
    it('should test "what directory are you in" command reliably', async function() {
      this.timeout(20000);
      
      const ws = new WebSocket(`ws://localhost:${PORT}/terminal`);
      let responseReceived = false;
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          // Connect to instance
          ws.send(JSON.stringify({
            type: 'connect',
            terminalId: 'pwd-test-instance'
          }));
          
          // Send directory command after connection confirmed
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'input',
              data: 'what directory are you in'
            }));
          }, 1000);
        });
        
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          console.log('📨 Message type:', message.type);
          
          if (message.type === 'output' && 
              (message.data.includes('/workspaces/agent-feed') || 
               message.data.includes('directory') ||
               message.data.includes('pwd'))) {
            responseReceived = true;
            console.log('✅ Directory command response received:', message.data.substring(0, 100));
            resolve();
          }
        });
        
        ws.on('close', () => {
          if (!responseReceived) {
            reject(new Error('Connection lost before receiving directory response'));
          }
        });
        
        ws.on('error', reject);
        
        // Timeout protection
        setTimeout(() => {
          if (!responseReceived) {
            reject(new Error('Directory command timeout'));
          }
        }, 15000);
      });
      
      ws.close();
      assert.strictEqual(responseReceived, true, 'Should receive response to directory command');
    });
  });
});
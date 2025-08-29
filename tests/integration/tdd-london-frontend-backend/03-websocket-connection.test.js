/**
 * TDD London School Test 3: WebSocket Connection
 * 
 * Purpose: Expose WebSocket connectivity issues for real-time terminal communication
 * Expected: FAIL - to reveal exact WebSocket problems
 */

import WebSocket from 'ws';
import colors from 'colors';

const WEBSOCKET_URL = 'ws://localhost:3002/terminal';
const BACKEND_BASE_URL = 'http://localhost:3002';

class WebSocketConnectionTest {
  async run() {
    console.log(colors.blue('🔍 Testing WebSocket Connection...'));
    
    // Test 1: Can we establish WebSocket connection?
    await this.testWebSocketConnection();
    
    // Test 2: Can we send messages through WebSocket?
    await this.testWebSocketMessaging();
    
    // Test 3: Can we receive terminal output through WebSocket?
    await this.testWebSocketTerminalOutput();
    
    // Test 4: Does WebSocket handle connection errors properly?
    await this.testWebSocketErrorHandling();
    
    // Test 5: Can we connect WebSocket to specific instance?
    await this.testWebSocketInstanceConnection();
  }

  async testWebSocketConnection() {
    console.log(colors.yellow('  Testing WebSocket connection establishment...'));
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WEBSOCKET_URL);
      let connectionTimedOut = false;
      
      const timeout = setTimeout(() => {
        connectionTimedOut = true;
        ws.terminate();
        reject(new Error(`❌ WEBSOCKET ERROR: Connection timeout after 5 seconds to ${WEBSOCKET_URL}`));
      }, 5000);
      
      ws.on('open', () => {
        if (connectionTimedOut) return;
        clearTimeout(timeout);
        console.log(colors.green('    ✅ WebSocket connection established'));
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        if (connectionTimedOut) return;
        clearTimeout(timeout);
        if (error.code === 'ECONNREFUSED') {
          reject(new Error(`❌ WEBSOCKET ERROR: Connection refused to ${WEBSOCKET_URL}. Is the WebSocket server running?`));
        } else {
          reject(new Error(`❌ WEBSOCKET ERROR: ${error.message}`));
        }
      });
      
      ws.on('close', (code, reason) => {
        if (connectionTimedOut) return;
        if (code !== 1000) {
          reject(new Error(`❌ WEBSOCKET ERROR: Connection closed with code ${code}: ${reason || 'No reason provided'}`));
        }
      });
    });
  }

  async testWebSocketMessaging() {
    console.log(colors.yellow('  Testing WebSocket message sending...'));
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WEBSOCKET_URL);
      let messageReceived = false;
      
      const timeout = setTimeout(() => {
        ws.terminate();
        if (!messageReceived) {
          reject(new Error('❌ WEBSOCKET MESSAGING ERROR: No response received within 5 seconds'));
        }
      }, 5000);
      
      ws.on('open', () => {
        console.log(colors.gray('    WebSocket connected, sending test message...'));
        
        const testMessage = {
          type: 'test',
          data: 'TDD London School WebSocket Test',
          timestamp: new Date().toISOString()
        };
        
        ws.send(JSON.stringify(testMessage));
      });
      
      ws.on('message', (data) => {
        clearTimeout(timeout);
        messageReceived = true;
        
        try {
          const message = JSON.parse(data.toString());
          console.log(colors.green('    ✅ WebSocket message exchange successful'));
          console.log(colors.gray(`    Received: ${JSON.stringify(message, null, 2)}`));
          ws.close();
          resolve();
        } catch (parseError) {
          reject(new Error(`❌ WEBSOCKET MESSAGING ERROR: Invalid JSON response: ${data.toString()}`));
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`❌ WEBSOCKET MESSAGING ERROR: ${error.message}`));
      });
      
      ws.on('close', (code) => {
        if (!messageReceived && code !== 1000) {
          reject(new Error(`❌ WEBSOCKET MESSAGING ERROR: Connection closed unexpectedly with code ${code}`));
        }
      });
    });
  }

  async testWebSocketTerminalOutput() {
    console.log(colors.yellow('  Testing WebSocket terminal output streaming...'));
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(WEBSOCKET_URL);
      let terminalOutputReceived = false;
      
      const timeout = setTimeout(() => {
        ws.terminate();
        if (!terminalOutputReceived) {
          reject(new Error('❌ WEBSOCKET TERMINAL ERROR: No terminal output received within 10 seconds'));
        }
      }, 10000);
      
      ws.on('open', () => {
        console.log(colors.gray('    WebSocket connected, requesting terminal output...'));
        
        const terminalRequest = {
          type: 'execute',
          command: 'echo "TDD London School Terminal Test"',
          instanceId: 'test-terminal'
        };
        
        ws.send(JSON.stringify(terminalRequest));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'output' || message.type === 'stdout') {
            clearTimeout(timeout);
            terminalOutputReceived = true;
            console.log(colors.green('    ✅ WebSocket terminal output received'));
            console.log(colors.gray(`    Terminal output: ${JSON.stringify(message, null, 2)}`));
            ws.close();
            resolve();
          } else if (message.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(`❌ WEBSOCKET TERMINAL ERROR: ${message.error || message.message}`));
          }
        } catch (parseError) {
          console.log(colors.yellow(`    ⚠️  Non-JSON message received: ${data.toString()}`));
        }
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`❌ WEBSOCKET TERMINAL ERROR: ${error.message}`));
      });
    });
  }

  async testWebSocketErrorHandling() {
    console.log(colors.yellow('  Testing WebSocket error handling...'));
    
    return new Promise((resolve, reject) => {
      // Try to connect to a non-existent WebSocket endpoint
      const badWS = new WebSocket('ws://localhost:3002/nonexistent');
      
      const timeout = setTimeout(() => {
        badWS.terminate();
        reject(new Error('❌ WEBSOCKET ERROR HANDLING: Connection should have failed but timed out instead'));
      }, 5000);
      
      badWS.on('open', () => {
        clearTimeout(timeout);
        badWS.close();
        reject(new Error('❌ WEBSOCKET ERROR HANDLING: Connection to non-existent endpoint should have failed'));
      });
      
      badWS.on('error', (error) => {
        clearTimeout(timeout);
        console.log(colors.green('    ✅ WebSocket properly handles connection errors'));
        console.log(colors.gray(`    Expected error: ${error.message}`));
        resolve();
      });
      
      badWS.on('close', (code) => {
        if (code !== 1000) {
          clearTimeout(timeout);
          console.log(colors.green('    ✅ WebSocket properly closes on invalid connection'));
          resolve();
        }
      });
    });
  }

  async testWebSocketInstanceConnection() {
    console.log(colors.yellow('  Testing WebSocket instance-specific connection...'));
    
    // First, launch a test instance
    let testInstanceId;
    try {
      const launchResponse = await fetch(`${BACKEND_BASE_URL}/api/launch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: `websocket-test-${Date.now()}`,
          command: 'echo "WebSocket Instance Test"'
        })
      });
      
      if (launchResponse.ok) {
        const launchResult = await launchResponse.json();
        testInstanceId = launchResult.instanceId || launchResult.id;
      }
    } catch (error) {
      console.log(colors.yellow('    ⚠️  Could not launch test instance, testing generic connection...'));
    }
    
    return new Promise((resolve, reject) => {
      const instanceWSURL = testInstanceId ? 
        `ws://localhost:3002/terminal/${testInstanceId}` : 
        `ws://localhost:3002/terminal/generic`;
        
      const ws = new WebSocket(instanceWSURL);
      
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error(`❌ WEBSOCKET INSTANCE ERROR: Connection timeout to ${instanceWSURL}`));
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log(colors.green('    ✅ WebSocket instance connection established'));
        console.log(colors.gray(`    Connected to: ${instanceWSURL}`));
        ws.close();
        resolve();
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`❌ WEBSOCKET INSTANCE ERROR: ${error.message}`));
      });
      
      ws.on('close', (code) => {
        if (code !== 1000) {
          reject(new Error(`❌ WEBSOCKET INSTANCE ERROR: Connection closed with code ${code}`));
        }
      });
    });
  }
}

export default new WebSocketConnectionTest();
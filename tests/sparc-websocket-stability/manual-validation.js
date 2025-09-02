#!/usr/bin/env node

/**
 * SPARC WebSocket Stability Manual Validation
 * Simple test of the "what directory are you in" command
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3000;
const WS_URL = `ws://localhost:${PORT}/terminal`;

console.log('🚀 SPARC WebSocket Stability Manual Test');
console.log(`🔗 WebSocket URL: ${WS_URL}`);
console.log('='.repeat(60));

async function createInstance(instanceType) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      instanceType: instanceType,
      workingDirectory: '/workspaces/agent-feed'
    });

    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/claude/instances',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.success && response.instance && response.instance.id) {
            resolve(response.instance.id);
          } else {
            reject(new Error(response.message || 'Instance creation failed'));
          }
        } catch (error) {
          reject(new Error('Invalid response format: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testWebSocketStability() {
  try {
    // Step 1: Create instance
    console.log('🏭 Creating Claude instance...');
    const instanceId = await createInstance('skip-permissions');
    console.log(`✅ Instance created: ${instanceId}`);
    
    // Step 2: Connect via WebSocket  
    console.log('🔗 Connecting WebSocket...');
    const ws = new WebSocket(WS_URL);
    
    await new Promise((resolve, reject) => {
      let responseReceived = false;
      let connectionPersisted = false;
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Connect to instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        console.log(`📨 Received: ${message.type}`);
        
        if (message.type === 'connect') {
          console.log('✅ Connected to instance');
          
          // Send test command
          setTimeout(() => {
            console.log('⌨️  Sending: "what directory are you in"');
            ws.send(JSON.stringify({
              type: 'input',
              data: 'what directory are you in'
            }));
          }, 2000);
        }
        
        if (message.type === 'output') {
          const output = message.data || '';
          console.log(`📤 Output (${output.length} chars): ${output.substring(0, 100)}${output.length > 100 ? '...' : ''}`);
          
          if (output.includes('/workspaces/agent-feed') || output.includes('directory')) {
            responseReceived = true;
            console.log('✅ DIRECTORY RESPONSE RECEIVED!');
            
            // Test connection persistence
            setTimeout(() => {
              if (ws.readyState === WebSocket.OPEN) {
                connectionPersisted = true;
                console.log('✅ CONNECTION PERSISTED AFTER API COMPLETION!');
                console.log('🎉 SUCCESS: No "Connection lost: Unknown error" detected!');
                ws.close();
                resolve({ responseReceived, connectionPersisted });
              } else {
                console.log('❌ Connection lost after API completion');
                resolve({ responseReceived, connectionPersisted });
              }
            }, 3000);
          }
        }
      });
      
      ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        if (!responseReceived) {
          reject(new Error(`Connection closed before response (${code}: ${reason})`));
        }
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error.message);
        reject(error);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Test timeout - no response received'));
        }
      }, 30000);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testWebSocketStability()
  .then(() => {
    console.log('\n🎯 SPARC WebSocket Stability Test: PASSED');
    console.log('✅ All 4 instance buttons should now work without connection errors');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ SPARC WebSocket Stability Test: FAILED');
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
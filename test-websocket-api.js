#!/usr/bin/env node

/**
 * WebSocket API Integration Test
 * Tests the complete Claude Code API integration through WebSocket
 */

const WebSocket = require('ws');

async function testClaudeWebSocketAPI() {
  console.log('🧪 Testing Claude Code WebSocket API Integration...\n');

  // Get the instance we just created
  const instanceResponse = await fetch('http://localhost:3000/api/claude/instances');
  const instanceData = await instanceResponse.json();
  
  if (!instanceData.success || instanceData.instances.length === 0) {
    console.error('❌ No Claude instances found');
    return;
  }
  
  const instanceId = instanceData.instances[0].id;
  console.log(`✅ Using Claude instance: ${instanceId}\n`);

  // Connect to WebSocket
  const ws = new WebSocket(`ws://localhost:3000/terminal?instanceId=${instanceId}`);

  return new Promise((resolve) => {
    let responseReceived = false;
    
    ws.on('open', () => {
      console.log('🔗 WebSocket connected');
      
      // Set up response handler
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          if (message.type === 'output' && message.data) {
            console.log('📤 Received Claude output:', message.data);
            
            // Check if this looks like an AI response (not just echo)
            if (message.data.includes('4') || message.data.includes('2+2')) {
              console.log('✅ REAL AI RESPONSE DETECTED!');
              console.log('🎉 Claude Code API Integration is working!');
              responseReceived = true;
              ws.close();
              resolve(true);
            }
          }
          
          if (message.type === 'connect') {
            console.log('✅ WebSocket connected to instance');
            // Send test prompt after connection is established
            setTimeout(() => {
              console.log('📝 Sending test prompt: "What is 2+2?"');
              ws.send(JSON.stringify({
                type: 'input',
                data: 'What is 2+2?',
                terminalId: instanceId
              }));
            }, 1000);
          }
          
          if (message.type === 'status') {
            console.log('📊 Status update:', message);
          }
          
        } catch (error) {
          console.log('📡 Raw message:', data.toString());
        }
      });
      
      // First send connect message to establish instance association
      console.log(`🤝 Connecting to instance: ${instanceId}`);
      ws.send(JSON.stringify({
        type: 'connect',
        terminalId: instanceId
      }));
      
      // Timeout after 15 seconds if no response
      setTimeout(() => {
        if (!responseReceived) {
          console.log('⏰ Timeout waiting for response');
          ws.close();
          resolve(false);
        }
      }, 15000);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      resolve(false);
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket connection closed');
      if (!responseReceived) {
        resolve(false);
      }
    });
  });
}

// Run test
if (require.main === module) {
  testClaudeWebSocketAPI()
    .then((success) => {
      if (success) {
        console.log('\n🎉 TEST PASSED: Claude Code API integration working!');
        process.exit(0);
      } else {
        console.log('\n❌ TEST FAILED: No real AI response received');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}
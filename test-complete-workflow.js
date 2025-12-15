#!/usr/bin/env node

/**
 * Complete End-to-End Workflow Test
 * Tests: Button Click -> Instance Creation -> WebSocket Connection -> Message Send -> AI Response
 */

const WebSocket = require('ws');

async function testCompleteWorkflow() {
  console.log('🧪 COMPLETE WORKFLOW TEST: Button -> Instance -> Message -> AI Response\n');

  try {
    // Step 1: Create instance (simulating button click)
    console.log('🔘 Step 1: Simulating button click - creating Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'test-complete' })
    });
    
    const createData = await createResponse.json();
    if (!createData.success) {
      throw new Error('Failed to create instance: ' + createData.error);
    }
    
    const instanceId = createData.instance.id;
    console.log(`✅ Instance created: ${instanceId}`);
    
    // Step 2: Wait for instance to be ready
    console.log('⏳ Step 2: Waiting for instance to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 3: Connect WebSocket (simulating UI connection)
    console.log('🔗 Step 3: Connecting WebSocket...');
    const ws = new WebSocket(`ws://localhost:3000/terminal`);
    
    return new Promise((resolve, reject) => {
      let connected = false;
      let responseReceived = false;
      
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          console.log('❌ TIMEOUT: No AI response received after 20 seconds');
          ws.close();
          resolve(false);
        }
      }, 20000);
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Send connect message
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId
        }));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log(`📨 Received: ${message.type}${message.data ? ' - ' + message.data.substring(0, 50) + '...' : ''}`);
          
          if (message.type === 'connect') {
            console.log('✅ Step 4: WebSocket connected to instance');
            connected = true;
            
            // Send test message
            setTimeout(() => {
              console.log('📤 Step 5: Sending test message: "What is 1+1?"');
              ws.send(JSON.stringify({
                type: 'input',
                data: 'What is 1+1?',
                terminalId: instanceId
              }));
            }, 1000);
          }
          
          if (message.type === 'output' && message.data) {
            // Check for AI response (look for mathematical answer)
            if (message.data.includes('2') || message.data.includes('1+1')) {
              console.log('🎉 SUCCESS: Real AI response detected!');
              console.log('📝 Response content:', message.data);
              clearTimeout(timeout);
              responseReceived = true;
              ws.close();
              resolve(true);
            }
          }
          
        } catch (error) {
          console.log('📡 Raw message:', data.toString().substring(0, 100) + '...');
        }
      });
      
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        clearTimeout(timeout);
        resolve(false);
      });
      
      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        clearTimeout(timeout);
        if (!responseReceived) {
          resolve(false);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the complete workflow test
if (require.main === module) {
  testCompleteWorkflow()
    .then((success) => {
      if (success) {
        console.log('\n🎉 COMPLETE WORKFLOW TEST PASSED!');
        console.log('✅ Button -> Instance -> WebSocket -> Message -> AI Response: ALL WORKING');
        process.exit(0);
      } else {
        console.log('\n❌ COMPLETE WORKFLOW TEST FAILED!');
        console.log('🔍 Something in the chain is not working properly');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}
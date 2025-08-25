#!/usr/bin/env node

/**
 * Test Specific Hang Pattern: cd prod && claude\n
 * 
 * This tests the exact command pattern that was still hanging
 */

const WebSocket = require('ws');

function testSpecificHangPattern() {
  return new Promise((resolve, reject) => {
    console.log('🔍 TESTING SPECIFIC HANG PATTERN');
    console.log('===============================\n');

    const ws = new WebSocket('ws://localhost:3002/terminal');
    let hangPreventionTriggered = false;
    
    ws.on('open', () => {
      console.log('📡 Connected to terminal server');
      
      // Send init
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'init_ack') {
          console.log('✅ Terminal initialized, testing hang pattern...');
          
          // Test the exact pattern that was hanging
          const hangingCommand = {
            type: 'input',
            data: 'cd prod && claude\\n'  // This is what was sent
          };
          
          console.log('📤 Sending:', JSON.stringify(hangingCommand));
          ws.send(JSON.stringify(hangingCommand));
          
          // Wait for response
          setTimeout(() => {
            if (!hangPreventionTriggered) {
              console.log('❌ HANG PREVENTION DID NOT TRIGGER - COMMAND WILL HANG!');
              ws.close();
              resolve({ success: false, reason: 'Hang prevention failed' });
            }
          }, 3000);
          
        } else if (message.type === 'data') {
          console.log('📨 Received data:', JSON.stringify(message.data.substring(0, 100) + '...'));
          
          if (message.data.includes('Claude CLI Usage Help')) {
            console.log('✅ HANG PREVENTION TRIGGERED SUCCESSFULLY!');
            hangPreventionTriggered = true;
            
            setTimeout(() => {
              ws.close();
              resolve({ success: true, reason: 'Hang prevention worked' });
            }, 500);
          }
        }
      } catch (error) {
        console.error('❌ Parse error:', error);
        reject(error);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      reject(error);
    });
  });
}

// Run the test
testSpecificHangPattern().then((result) => {
  console.log('\n🎯 TEST RESULT:');
  console.log('==============');
  console.log(`Success: ${result.success}`);
  console.log(`Reason: ${result.reason}`);
  
  if (result.success) {
    console.log('\n✅ The hang pattern is now properly detected and prevented!');
  } else {
    console.log('\n❌ The hang pattern is still not being caught - needs more work');
  }
}).catch(error => {
  console.error('💥 Test error:', error);
});
#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🎯 TESTING WEBSOCKET FIX VALIDATION\n');

async function validateFix() {
  try {
    console.log('🔗 Connecting WebSocket to test fix...');
    const ws = new WebSocket(`ws://localhost:3000/terminal`);
    
    return new Promise((resolve) => {
      let connectionStable = true;
      let messagesReceived = 0;
      
      const timeout = setTimeout(() => {
        console.log('\n📊 FIX VALIDATION RESULTS:');
        console.log(`✅ Connection stable for 60+ seconds: ${connectionStable ? 'SUCCESS' : 'FAILED'}`);
        console.log(`✅ Messages received: ${messagesReceived}`);
        console.log(`✅ No connection drops: ${connectionStable ? 'SUCCESS' : 'FAILED'}`);
        
        if (connectionStable && messagesReceived > 0) {
          console.log('\n🎉 WEBSOCKET FIX VALIDATION PASSED!');
          console.log('✅ No 30-second connection drops detected');
          console.log('✅ Connections remain stable during processing');
        } else {
          console.log('\n❌ Fix validation failed');
        }
        
        ws.close();
        resolve(connectionStable);
      }, 65000); // Test for 65 seconds
      
      ws.on('open', () => {
        console.log('✅ WebSocket connected successfully');
        
        // Test directory command at 30 seconds (critical threshold)
        setTimeout(() => {
          console.log('📤 Testing at 30-second mark (critical threshold)...');
          ws.send(JSON.stringify({
            type: 'input',
            data: 'pwd'
          }));
        }, 30000);
      });
      
      ws.on('message', (data) => {
        messagesReceived++;
        const message = JSON.parse(data.toString());
        if (message.type === 'terminal') {
          console.log(`📨 Message received: ${message.data.substring(0, 50)}...`);
        }
      });
      
      ws.on('error', (error) => {
        console.error('🚨 Connection error:', error.message);
        connectionStable = false;
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000) {
          console.log(`🔌 Connection closed unexpectedly: ${code} ${reason}`);
          connectionStable = false;
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Validation error:', error.message);
    return false;
  }
}

validateFix()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
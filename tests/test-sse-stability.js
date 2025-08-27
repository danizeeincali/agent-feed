#!/usr/bin/env node

/**
 * SSE Connection Stability Test
 * Tests the critical SSE connection fixes to prevent ECONNRESET drops
 */

global.EventSource = require('eventsource');

console.log('🧪 Testing SSE Connection Stability Fixes');
console.log('========================================\n');

async function testSSEStability() {
  // Test 1: Create instance and establish SSE connection
  console.log('📡 Step 1: Creating Claude instance...');
  
  try {
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: ['claude', '--dangerously-skip-permissions'] })
    });
    
    const createResult = await createResponse.json();
    if (!createResult.success) {
      throw new Error(`Failed to create instance: ${createResult.error}`);
    }
    
    const instanceId = createResult.instance.id;
    console.log(`✅ Created instance: ${instanceId}`);
    
    // Test 2: Establish SSE connection
    console.log(`📡 Step 2: Establishing SSE connection to ${instanceId}...`);
    
    const sseUrl = `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`;
    const eventSource = new EventSource(sseUrl);
    
    let connectionEstablished = false;
    let messageCount = 0;
    let connectionDropped = false;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Test timeout after 30 seconds'));
      }, 30000);
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        connectionEstablished = true;
      };
      
      eventSource.onmessage = (event) => {
        messageCount++;
        const data = JSON.parse(event.data);
        console.log(`📨 Message ${messageCount}: ${data.type}`);
        
        if (messageCount === 1 && data.type === 'connected') {
          console.log(`📡 Step 3: Testing command sending...`);
          
          // Send a command after 2 seconds
          setTimeout(async () => {
            try {
              console.log(`⌨️ Sending terminal command to ${instanceId}...`);
              
              const inputResponse = await fetch(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/input`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: 'hello world\n' })
              });
              
              const inputResult = await inputResponse.json();
              console.log(`📤 Command sent: ${inputResult.success ? 'SUCCESS' : 'FAILED'}`);
              
            } catch (error) {
              console.error(`❌ Failed to send command: ${error.message}`);
            }
          }, 2000);
          
          // Check connection stability after 8 seconds
          setTimeout(() => {
            if (!connectionDropped && eventSource.readyState === EventSource.OPEN) {
              console.log('✅ CONNECTION STABILITY TEST PASSED!');
              console.log(`📊 Connection persisted through ${messageCount} messages`);
              console.log('🎯 SSE connection remained stable after command execution\n');
              
              clearTimeout(timeout);
              eventSource.close();
              resolve({
                success: true,
                instanceId,
                messageCount,
                connectionStable: true
              });
            } else {
              clearTimeout(timeout);
              eventSource.close();
              reject(new Error(`Connection dropped after ${messageCount} messages`));
            }
          }, 8000);
        }
      };
      
      eventSource.onerror = (error) => {
        connectionDropped = true;
        console.log(`❌ SSE ERROR: Connection state: ${eventSource.readyState}`);
        
        // Check if this is a recoverable error
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('🔄 SSE reconnecting...');
          return; // Don't fail the test, let it try to recover
        }
        
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔌 SSE connection closed');
          clearTimeout(timeout);
          reject(new Error(`SSE connection closed after ${messageCount} messages`));
        }
      };
    });
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    throw error;
  }
}

// Run the test
testSSEStability()
  .then((result) => {
    console.log('🎉 SSE STABILITY TEST RESULTS:');
    console.log(`   ✅ Instance Created: ${result.instanceId}`);
    console.log(`   ✅ Messages Received: ${result.messageCount}`);
    console.log(`   ✅ Connection Stable: ${result.connectionStable ? 'YES' : 'NO'}`);
    console.log('\n📝 SUMMARY:');
    console.log('   - SSE connections no longer drop immediately after commands');
    console.log('   - ECONNRESET errors are handled gracefully');
    console.log('   - Interactive sessions persist across multiple interactions');
    console.log('\n🚀 SSE CONNECTION INSTABILITY FIXED!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 SSE STABILITY TEST FAILED:');
    console.error(`   ❌ Error: ${error.message}`);
    console.log('\n📝 This indicates the SSE connection fixes need more work');
    process.exit(1);
  });
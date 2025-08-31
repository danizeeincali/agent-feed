const WebSocket = require('ws');

/**
 * QUICK WEBSOCKET DIAGNOSIS
 * Test the reported "No connections for claude-6038" issue
 */

const WEBSOCKET_URL = 'ws://localhost:3000/terminal';
const BACKEND_URL = 'http://localhost:3000';

async function quickDiagnosis() {
  console.log('🔍 Quick WebSocket Connection Diagnosis');
  console.log('======================================');

  // Step 1: Check backend instances
  console.log('1️⃣ Checking existing Claude instances...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
    const data = await response.json();
    
    if (data.instances && data.instances.length > 0) {
      console.log(`✅ Found ${data.instances.length} instances:`);
      data.instances.forEach(instance => {
        console.log(`   - ${instance.id}: ${instance.status} (PID: ${instance.pid})`);
      });
      
      // Test with the first available instance
      const testInstance = data.instances[0];
      await testWebSocketConnection(testInstance.id);
      
    } else {
      console.log('⚠️ No existing instances, creating a new one...');
      await createAndTestInstance();
    }
    
  } catch (error) {
    console.error('❌ Failed to check instances:', error.message);
    return;
  }
}

async function testWebSocketConnection(instanceId) {
  console.log(`\n2️⃣ Testing WebSocket connection to ${instanceId}...`);
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WEBSOCKET_URL);
    const testResults = {
      connectionOpened: false,
      connectMessageSent: false,
      connectAckReceived: false,
      messagesSent: 0,
      messagesReceived: 0,
      errors: []
    };
    
    let testTimeout = setTimeout(() => {
      console.log('⏰ Test timeout reached');
      ws.close();
      resolve(testResults);
    }, 15000);

    ws.on('open', () => {
      testResults.connectionOpened = true;
      console.log('✅ WebSocket connection opened');
      
      // Send connect message
      const connectMessage = {
        type: 'connect',
        terminalId: instanceId,
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(connectMessage));
      testResults.connectMessageSent = true;
      testResults.messagesSent++;
      console.log(`📤 Connect message sent for ${instanceId}`);
    });

    ws.on('message', (data) => {
      testResults.messagesReceived++;
      
      try {
        const message = JSON.parse(data);
        console.log(`📥 Received message: ${message.type} (${message.terminalId})`);
        
        if (message.type === 'connect' && message.terminalId === instanceId) {
          testResults.connectAckReceived = true;
          console.log('✅ Connection acknowledgment received');
          
          // Send a test input
          setTimeout(() => {
            const inputMessage = {
              type: 'input',
              data: 'echo "WebSocket diagnosis test"',
              terminalId: instanceId,
              timestamp: Date.now()
            };
            
            ws.send(JSON.stringify(inputMessage));
            testResults.messagesSent++;
            console.log('📤 Test input sent');
          }, 1000);
        }
        
        if (message.type === 'output' && message.data) {
          console.log(`📥 Output received: ${message.data.substring(0, 100)}`);
        }
        
      } catch (e) {
        console.error('❌ Message parse error:', e.message);
        testResults.errors.push(`Parse error: ${e.message}`);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      testResults.errors.push(`WebSocket error: ${error.message}`);
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      clearTimeout(testTimeout);
      
      // Print final results
      console.log('\n📊 Test Results:');
      console.log('================');
      console.log(`Connection Opened: ${testResults.connectionOpened}`);
      console.log(`Connect Message Sent: ${testResults.connectMessageSent}`);
      console.log(`Connect Ack Received: ${testResults.connectAckReceived}`);
      console.log(`Messages Sent: ${testResults.messagesSent}`);
      console.log(`Messages Received: ${testResults.messagesReceived}`);
      console.log(`Errors: ${testResults.errors.length}`);
      
      if (testResults.errors.length > 0) {
        console.log('\nErrors:');
        testResults.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      }
      
      // Critical diagnosis
      if (testResults.connectMessageSent && !testResults.connectAckReceived) {
        console.error('\n❌ ISSUE REPRODUCED: Backend not acknowledging connection');
        console.error('This confirms the "No connections for claude-xxxx" issue');
      } else if (testResults.connectAckReceived) {
        console.log('\n✅ Connection flow working correctly');
      } else {
        console.error('\n❌ Connection could not be established');
      }
      
      resolve(testResults);
    });
  });
}

async function createAndTestInstance() {
  console.log('Creating new Claude instance for testing...');
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/claude/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceType: 'interactive',
        usePty: true
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Created instance: ${data.instance.id}`);
      
      // Wait for instance to be ready
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await testWebSocketConnection(data.instance.id);
      
      // Cleanup
      console.log('\n🧹 Cleaning up test instance...');
      const deleteResponse = await fetch(`${BACKEND_URL}/api/claude/instances/${data.instance.id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Test instance deleted');
      }
      
    } else {
      console.error('❌ Failed to create test instance:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Instance creation error:', error.message);
  }
}

// Add fetch polyfill for Node.js if needed
if (!global.fetch) {
  try {
    global.fetch = require('node-fetch');
  } catch (e) {
    console.error('❌ node-fetch not available. Install with: npm install node-fetch');
    process.exit(1);
  }
}

// Run diagnosis
quickDiagnosis().catch(error => {
  console.error('❌ Diagnosis failed:', error);
  process.exit(1);
});
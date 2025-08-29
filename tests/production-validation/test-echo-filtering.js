#!/usr/bin/env node

/**
 * Test Echo Filtering in PTY Mode
 * Validates that character-by-character echo is filtered out
 */

const WebSocket = require('ws');
const http = require('http');

async function testEchoFiltering() {
  console.log('🎯 TESTING ECHO FILTERING (NO CHARACTER-BY-CHARACTER)');
  console.log('===================================================\n');

  let commandEchoed = false;
  let properResponseReceived = false;
  let characterByCharacterDetected = false;
  const receivedMessages = [];

  try {
    // Step 1: Get latest instance
    console.log('1️⃣ Getting latest Claude instance...');
    const instancesResponse = await makeRequest('http://localhost:3000/api/claude/instances');
    const latestInstance = instancesResponse.instances[instancesResponse.instances.length - 1];
    const instanceId = latestInstance.id;
    console.log(`   ✅ Using instance: ${instanceId} (${latestInstance.status})`);

    // Step 2: Connect to WebSocket
    console.log('\n2️⃣ Connecting to WebSocket terminal...');
    const ws = new WebSocket('ws://localhost:3000/terminal');
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('   ✅ WebSocket connected');
        
        // Connect to instance
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId,
          timestamp: Date.now()
        }));
        
        resolve();
      });
      ws.on('error', reject);
    });

    // Step 3: Monitor messages for echo patterns
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        receivedMessages.push(message);
        
        if (message.type === 'output' && message.data) {
          const output = message.data;
          
          // Check for character-by-character patterns
          if (output.length === 1 && /[a-zA-Z]/.test(output)) {
            characterByCharacterDetected = true;
            console.log(`   ❌ SINGLE CHARACTER DETECTED: "${output}"`);
          }
          
          // Check for command echo (our test command)
          if (output.includes('test-echo-command-12345')) {
            commandEchoed = true;
            console.log(`   📝 Command echoed in output: ${output.substring(0, 50)}...`);
          }
          
          // Check for actual Claude response (not just echo)
          if (output.includes('Claude') || output.includes('Welcome') || output.includes('help')) {
            properResponseReceived = true;
            console.log(`   ✅ Proper Claude response received`);
          }
        }
      } catch (e) {
        // Raw messages are fine
      }
    });

    // Step 4: Send test command
    console.log('\n3️⃣ Sending test command...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection
    
    ws.send(JSON.stringify({
      type: 'input',
      data: 'test-echo-command-12345\n',
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    console.log('   📤 Sent: test-echo-command-12345');

    // Step 5: Wait and analyze
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    ws.close();

    // Results
    console.log('\n' + '='.repeat(50));
    console.log('📊 ECHO FILTERING TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total messages received: ${receivedMessages.length}`);
    
    if (characterByCharacterDetected) {
      console.log('❌ CHARACTER-BY-CHARACTER ECHO DETECTED');
      console.log('   The echo filtering is not working properly');
      return false;
    } else {
      console.log('✅ NO CHARACTER-BY-CHARACTER ECHO');
      console.log('   Echo filtering is working correctly');
    }
    
    if (commandEchoed && properResponseReceived) {
      console.log('⚠️  Both command echo AND response detected');
      console.log('   Some echo filtering may still be needed');
    } else if (properResponseReceived) {
      console.log('✅ CLEAN OUTPUT - Only responses, no echo');
      console.log('   Perfect echo filtering');
    }
    
    return !characterByCharacterDetected;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.get({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

// Run test
testEchoFiltering().then(success => {
  console.log(success ? '\n🎉 ECHO FILTERING TEST PASSED' : '\n💥 ECHO FILTERING TEST FAILED');
  process.exit(success ? 0 : 1);
});
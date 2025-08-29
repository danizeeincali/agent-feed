#!/usr/bin/env node

/**
 * Test Single Command Sending (No Triple Commands)
 * Validates the fix for duplicate/triple command sending
 */

const WebSocket = require('ws');
const http = require('http');

async function testSingleCommandSend() {
  console.log('🧪 TESTING SINGLE COMMAND SEND (NO DUPLICATES)');
  console.log('================================================\n');

  let commandCount = 0;
  let duplicateDetected = false;
  const sentCommands = new Set();

  try {
    // Step 1: Create instance
    console.log('1️⃣ Creating Claude instance...');
    const instance = await createInstance();
    const instanceId = instance.id;
    console.log(`   ✅ Instance created: ${instanceId}`);

    // Step 2: Connect to WebSocket
    console.log('\n2️⃣ Connecting to WebSocket terminal...');
    const ws = new WebSocket('ws://localhost:3000/terminal');
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('   ✅ WebSocket connected');
        resolve();
      });
      ws.on('error', reject);
    });

    // Step 3: Monitor messages for duplicates
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'input' || message.data === 'test-command-unique-12345') {
          commandCount++;
          const cmdSignature = `${message.type}-${message.data}`;
          
          if (sentCommands.has(cmdSignature)) {
            duplicateDetected = true;
            console.log(`   ❌ DUPLICATE DETECTED: ${cmdSignature}`);
          }
          sentCommands.add(cmdSignature);
        }
      } catch (e) {
        // Raw messages are fine
      }
    });

    // Step 4: Send test command
    console.log('\n3️⃣ Sending test command...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'test-command-unique-12345\n',
      terminalId: instanceId,
      timestamp: Date.now()
    }));

    // Step 5: Wait and analyze
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    ws.close();

    // Results
    console.log('\n' + '='.repeat(40));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(40));
    
    if (duplicateDetected) {
      console.log('❌ DUPLICATE COMMANDS DETECTED');
      console.log(`   Commands sent: ${commandCount}`);
      return false;
    } else if (commandCount > 1) {
      console.log('⚠️  MULTIPLE COMMANDS SENT (not necessarily duplicates)');
      console.log(`   Commands sent: ${commandCount}`);
      return false;
    } else {
      console.log('✅ SINGLE COMMAND SENT - NO DUPLICATES');
      console.log('✅ Triple command issue RESOLVED');
      return true;
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    return false;
  }
}

async function createInstance() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ instanceType: 'prod', command: ['claude'] });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/claude/instances',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (result.success) {
            resolve(result.instance);
          } else {
            reject(new Error('Failed to create instance'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Run test
testSingleCommandSend().then(success => {
  console.log(success ? '\n🎉 TEST PASSED' : '\n💥 TEST FAILED');
  process.exit(success ? 0 : 1);
});
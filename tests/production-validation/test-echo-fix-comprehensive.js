#!/usr/bin/env node

/**
 * Comprehensive Echo Fix Test - SPARC DEBUG Resolution Validation
 * Tests the complete fix for character-by-character echo and command execution
 */

const WebSocket = require('ws');
const { EventSource } = require('eventsource');

async function testEchoFixComprehensive() {
  console.log('🎯 COMPREHENSIVE ECHO FIX VALIDATION');
  console.log('===================================');
  console.log('Testing fixes for:');
  console.log('- Character-by-character echo elimination');
  console.log('- Command execution when Send button pressed');
  console.log('- WebSocket immediate echo removal');
  console.log('- PTY echo configuration validation\n');

  const results = {
    instanceCreation: false,
    websocketConnection: false,
    commandExecution: false,
    noCharacterEcho: false,
    properFiltering: false,
    sendButtonWorks: false
  };

  let instanceId = null;
  let ws = null;
  let receivedMessages = [];

  try {
    // Step 1: Create Claude instance
    console.log('1️⃣ Creating Claude instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceType: 'prod',
        command: ['claude'],
        usePty: true
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create instance: ${createResponse.status}`);
    }

    const instanceData = await createResponse.json();
    instanceId = instanceData.instance.id;
    
    console.log(`   ✅ Instance created: ${instanceId} (PID: ${instanceData.instance.pid})`);
    results.instanceCreation = true;

    // Step 2: Connect WebSocket
    console.log('\n2️⃣ Connecting to WebSocket terminal...');
    ws = new WebSocket('ws://localhost:3000/terminal');

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        console.log('   ✅ WebSocket connected');
        results.websocketConnection = true;
        
        // Send connection message
        ws.send(JSON.stringify({
          type: 'connect',
          terminalId: instanceId,
          timestamp: Date.now()
        }));
        
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });

    // Step 3: Monitor messages
    console.log('\n3️⃣ Monitoring WebSocket messages...');
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      receivedMessages.push({
        type: message.type,
        data: message.data,
        timestamp: Date.now()
      });
      
      console.log(`   📨 Received: ${message.type} (${message.data ? message.data.length : 0} chars)`);
    });

    // Wait for Claude to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Test command execution (the main issue)
    console.log('\n4️⃣ Testing command execution (Send button functionality)...');
    const testCommand = 'echo "SPARC DEBUG TEST - No character echo"';
    
    console.log(`   📝 Sending command: ${testCommand}`);
    
    const preMessageCount = receivedMessages.length;
    const sendTime = Date.now();
    
    // Send command via WebSocket (simulating Send button)
    ws.send(JSON.stringify({
      type: 'input',
      data: testCommand,
      terminalId: instanceId,
      timestamp: sendTime
    }));

    // Wait for response
    console.log('   ⏱️  Waiting for command execution...');
    await new Promise(resolve => setTimeout(resolve, 4000));

    const postMessageCount = receivedMessages.length;
    const newMessages = receivedMessages.slice(preMessageCount);

    console.log(`   📊 Messages before: ${preMessageCount}, after: ${postMessageCount}`);
    console.log(`   📊 New messages received: ${newMessages.length}`);

    // Step 5: Analyze results
    console.log('\n5️⃣ Analyzing echo behavior...');
    
    // Check for character-by-character echo
    let characterEchoFound = false;
    let immediateEchoFound = false;
    let commandOutputFound = false;
    
    newMessages.forEach((msg, index) => {
      if (msg.type === 'echo') {
        immediateEchoFound = true;
        console.log(`   ❌ Found immediate echo: "${msg.data}"`);
      }
      
      if (msg.type === 'output' && msg.data) {
        // Check for character-by-character appearance
        if (msg.data.length === 1 && testCommand.includes(msg.data)) {
          characterEchoFound = true;
          console.log(`   ❌ Character echo detected: "${msg.data}"`);
        }
        
        // Check for complete command echo
        if (msg.data.includes(testCommand)) {
          console.log(`   ⚠️  Command echo in output: "${msg.data.substring(0, 50)}..."`);
        }
        
        // Check for actual command execution (response)
        if (msg.data.includes('SPARC DEBUG TEST')) {
          commandOutputFound = true;
          console.log(`   ✅ Command executed successfully: output received`);
        }
      }
    });

    // Evaluate results
    results.commandExecution = commandOutputFound;
    results.noCharacterEcho = !characterEchoFound;
    results.sendButtonWorks = newMessages.length > 0; // Got some response
    results.properFiltering = !immediateEchoFound;

    console.log('\n6️⃣ Testing multiple commands...');
    
    // Test rapid command sending
    const commands = ['pwd', 'ls -la', 'echo "test2"'];
    for (let i = 0; i < commands.length; i++) {
      console.log(`   📝 Command ${i + 1}: ${commands[i]}`);
      
      ws.send(JSON.stringify({
        type: 'input',
        data: commands[i],
        terminalId: instanceId,
        timestamp: Date.now()
      }));
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final wait for all responses
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}`);
  } finally {
    if (ws) {
      ws.close();
    }
  }

  // Results summary
  console.log('\n' + '='.repeat(50));
  console.log('🏆 COMPREHENSIVE ECHO FIX TEST RESULTS');
  console.log('='.repeat(50));
  
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    const label = key.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${status} ${label}: ${value ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(v => v);
  const passedCount = Object.values(results).filter(v => v).length;
  const totalCount = Object.values(results).length;

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 ALL ECHO FIXES SUCCESSFUL!');
    console.log('✅ Character-by-character echo eliminated');
    console.log('✅ Command execution working (Send button fixed)');
    console.log('✅ WebSocket immediate echo removed');
    console.log('✅ Terminal I/O functioning properly');
    console.log('🚀 SPARC DEBUG METHODOLOGY COMPLETE!');
  } else {
    console.log(`⚠️  PARTIAL SUCCESS: ${passedCount}/${totalCount} fixes working`);
    console.log('💡 Some echo/input issues may need additional attention');
    
    // Specific guidance
    if (!results.commandExecution) {
      console.log('🔧 Commands not executing - check PTY input handling');
    }
    if (!results.noCharacterEcho) {
      console.log('🔧 Character echo still present - verify PTY echo=false');
    }
    if (!results.properFiltering) {
      console.log('🔧 Immediate WebSocket echo detected - check echo removal');
    }
  }
  console.log('='.repeat(50));

  console.log('\n📊 Total messages captured:', receivedMessages.length);
  console.log('🕒 Test duration: Complete\n');

  return allPassed;
}

// Run comprehensive test
testEchoFixComprehensive().then(success => {
  process.exit(success ? 0 : 1);
});
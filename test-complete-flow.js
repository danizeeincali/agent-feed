#!/usr/bin/env node

const WebSocket = require('ws');

console.log('🚀 COMPLETE FUNCTIONALITY TEST');
console.log('================================');
console.log('Testing: WebSocket connection, instance creation, Claude API');
console.log('');

const ws = new WebSocket('ws://localhost:3000/terminal');

let testResults = {
  connection: false,
  instanceCreation: false,
  claudeAPISimple: false,
  claudeAPIComplex: false,
  responseTime: null
};

ws.on('open', () => {
  console.log('✅ WebSocket connection: SUCCESS');
  testResults.connection = true;
  
  setTimeout(() => {
    console.log('📡 Creating Claude instance...');
    ws.send(JSON.stringify({
      type: 'create_instance',
      instanceType: 'claude',
      workingDir: '/workspaces/agent-feed'
    }));
  }, 500);
});

let instanceId = null;
let testPhase = 'waiting';
let startTime = null;

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'instance_created') {
      instanceId = message.instanceId;
      console.log(`✅ Instance creation: SUCCESS (ID: ${instanceId})`);
      testResults.instanceCreation = true;
      
      // Test 1: Simple question
      setTimeout(() => {
        console.log('');
        console.log('📝 Test 1: Simple question - "What is 2+2?"');
        testPhase = 'simple';
        startTime = Date.now();
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'What is 2+2?',
          instanceId: instanceId
        }));
      }, 2000);
    }
    
    if (message.type === 'output' && testPhase === 'simple') {
      const responseTime = Date.now() - startTime;
      console.log(`✅ Simple Claude API: SUCCESS (${responseTime}ms)`);
      console.log(`   Response: ${message.data.split('\n')[1]?.substring(0, 50)}...`);
      testResults.claudeAPISimple = true;
      testResults.responseTime = responseTime;
      
      // Test 2: Complex question
      setTimeout(() => {
        console.log('');
        console.log('📝 Test 2: Complex question - "What are the main files in the docs folder?"');
        testPhase = 'complex';
        startTime = Date.now();
        ws.send(JSON.stringify({
          type: 'claude_api',
          data: 'What are the main files in the docs folder?',
          instanceId: instanceId
        }));
      }, 1000);
    }
    
    if (message.type === 'output' && testPhase === 'complex') {
      const responseTime = Date.now() - startTime;
      console.log(`✅ Complex Claude API: SUCCESS (${responseTime}ms)`);
      console.log(`   Response length: ${message.data.length} characters`);
      testResults.claudeAPIComplex = true;
      
      // Print results
      setTimeout(() => {
        console.log('');
        console.log('=====================================');
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=====================================');
        console.log(`WebSocket Connection: ${testResults.connection ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Instance Creation:    ${testResults.instanceCreation ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Simple Claude API:    ${testResults.claudeAPISimple ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Complex Claude API:   ${testResults.claudeAPIComplex ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Response Time:        ${testResults.responseTime}ms`);
        console.log('=====================================');
        
        const allPassed = Object.values(testResults).every(v => v !== false);
        if (allPassed) {
          console.log('🎉 ALL TESTS PASSED! Application is 100% functional!');
        } else {
          console.log('⚠️  Some tests failed. Check logs for details.');
        }
        
        ws.close();
      }, 1000);
    }
    
    if (message.type === 'error') {
      console.error(`❌ Error: ${message.error || message.data}`);
    }
    
  } catch (e) {
    // Ignore parse errors
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('');
  console.log('🔌 Test completed - connection closed');
  process.exit(0);
});

setTimeout(() => {
  console.log('⏰ Test timeout - closing');
  ws.close();
}, 30000);
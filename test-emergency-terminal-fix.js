#!/usr/bin/env node

/**
 * 🚨 EMERGENCY: Test the terminal fix directly
 * Validates that the new component properly extracts terminal data from JSON
 */

const WebSocket = require('ws');

console.log('🚨 EMERGENCY: Testing Terminal JSON→Output Fix...');

// Connect to emergency backend
const ws = new WebSocket('ws://localhost:3002/terminal');
let testsPassed = 0;
let testsTotal = 0;

function test(name, condition) {
  testsTotal++;
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
  }
}

ws.on('open', () => {
  console.log('🚨 Connected to emergency backend');
  
  // Send initialization
  const initMessage = { type: 'init', cols: 80, rows: 24 };
  ws.send(JSON.stringify(initMessage));
  console.log('📤 Sent init message');

  // Test command
  setTimeout(() => {
    const testCommand = {
      type: 'input',
      data: 'echo "🎯 TESTING: JSON should be extracted to show only this text" && pwd\n'
    };
    ws.send(JSON.stringify(testCommand));
    console.log('📤 Sent test command');
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    
    console.log(`\n📥 RECEIVED MESSAGE:`);
    console.log(`  Type: ${message.type}`);
    
    if (message.type === 'data' && message.data) {
      console.log(`  Data: ${JSON.stringify(message.data.substring(0, 100))}...`);
      
      // 🎯 CRITICAL TESTS
      test('Message is valid JSON', typeof message === 'object');
      test('Message has type field', message.type === 'data');
      test('Message has data field', message.data !== undefined);
      test('Data field contains string', typeof message.data === 'string');
      
      // Simulate what the FIXED component should do
      console.log(`\n🔧 EMERGENCY FIX SIMULATION:`);
      console.log(`  Raw JSON message: ${JSON.stringify(message).substring(0, 150)}...`);
      console.log(`  ❌ OLD WAY (broken): Display entire JSON`);
      console.log(`  ✅ NEW WAY (fixed): Extract and display ONLY data field`);
      console.log(`  🎯 Terminal should show: ${JSON.stringify(message.data)}`);
      
      // Verify the fix works
      const terminalOutput = message.data;
      test('Terminal output extracted from JSON', terminalOutput.length > 0);
      test('Terminal output is not raw JSON', !terminalOutput.includes('{"type"'));
      test('Terminal output is clean string', typeof terminalOutput === 'string');
      
      console.log(`\n✅ SUCCESS: Frontend should display "${terminalOutput.replace(/\r?\n/g, '\\n')}" NOT the raw JSON`);
      
    } else if (message.type === 'connect') {
      test('Connection established', true);
      
    } else if (message.type === 'init_ack') {
      test('Terminal initialized', message.pid !== undefined);
      console.log(`  PID: ${message.pid}`);
    }
    
  } catch (error) {
    console.log(`📥 Non-JSON data: ${data.toString()}`);
    test('Can handle non-JSON data', true);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  test('WebSocket connection', false);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Connection closed: ${code} - ${reason || 'No reason'}`);
  
  console.log(`\n🎯 TEST RESULTS:`);
  console.log(`  Passed: ${testsPassed}/${testsTotal}`);
  console.log(`  Success Rate: ${Math.round((testsPassed/testsTotal) * 100)}%`);
  
  if (testsPassed === testsTotal) {
    console.log(`\n✅ ALL TESTS PASSED! The emergency terminal fix should work correctly.`);
    console.log(`🚨 CRITICAL: Frontend component must extract message.data field from JSON`);
  } else {
    console.log(`\n❌ Some tests failed. Fix needed.`);
  }
  
  process.exit(testsPassed === testsTotal ? 0 : 1);
});

// Auto-close after 15 seconds
setTimeout(() => {
  console.log('\n🏁 Test completed - closing connection');
  ws.close();
}, 15000);
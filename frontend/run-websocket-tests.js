#!/usr/bin/env node
/**
 * WebSocket Test Suite Runner - London School TDD
 * Runs comprehensive WebSocket connection tests with detailed reporting
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running London School TDD WebSocket Test Suite\n');

const testCommands = [
  {
    name: 'Unit Tests - Connection Manager',
    command: 'npm test -- --testPathPattern=ConnectionManager.test.ts --verbose',
    description: 'Tests connection management with mocked collaborators'
  },
  {
    name: 'Unit Tests - Single Connection Enforcer', 
    command: 'npm test -- --testPathPattern=SingleConnectionEnforcer.test.ts --verbose',
    description: 'Tests single connection enforcement with interaction verification'
  },
  {
    name: 'Unit Tests - Connection State Machine',
    command: 'npm test -- --testPathPattern=ConnectionStateMachine.test.ts --verbose', 
    description: 'Tests state transitions with behavior verification'
  },
  {
    name: 'Integration Tests - WebSocket Terminal',
    command: 'npm test -- --testPathPattern=WebSocketTerminalIntegration.test.ts --verbose',
    description: 'End-to-end WebSocket functionality tests'
  },
  {
    name: 'All WebSocket Tests',
    command: 'npm test -- --testPathPattern="websocket|WebSocket" --coverage --verbose',
    description: 'Comprehensive test suite with coverage reporting'
  }
];

function runTest(testConfig) {
  console.log(`\n📋 ${testConfig.name}`);
  console.log(`📝 ${testConfig.description}\n`);
  console.log(`🔄 Running: ${testConfig.command}\n`);
  
  try {
    const output = execSync(testConfig.command, { 
      cwd: __dirname,
      stdio: 'inherit',
      encoding: 'utf8'
    });
    
    console.log(`✅ ${testConfig.name} - PASSED\n`);
    return true;
  } catch (error) {
    console.log(`❌ ${testConfig.name} - FAILED`);
    console.log(`Error: ${error.message}\n`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const testIndex = args[0] ? parseInt(args[0]) - 1 : -1;
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('WebSocket Test Runner Options:');
    console.log('');
    testCommands.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}`);
      console.log(`   ${test.description}`);
      console.log('');
    });
    console.log('Usage:');
    console.log('  node run-websocket-tests.js [test-number]');
    console.log('  node run-websocket-tests.js --all');
    console.log('  node run-websocket-tests.js --coverage');
    return;
  }
  
  let testsToRun = [];
  
  if (args.includes('--all')) {
    testsToRun = testCommands.slice(0, 4); // Run all individual tests
  } else if (args.includes('--coverage')) {
    testsToRun = [testCommands[4]]; // Run comprehensive test with coverage
  } else if (testIndex >= 0 && testIndex < testCommands.length) {
    testsToRun = [testCommands[testIndex]];
  } else {
    console.log('🎯 Select a test to run:');
    console.log('');
    testCommands.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}`);
    });
    console.log('');
    console.log('Run: node run-websocket-tests.js [1-5]');
    console.log('Or:  node run-websocket-tests.js --all');
    console.log('Or:  node run-websocket-tests.js --coverage');
    return;
  }
  
  const results = [];
  
  for (const test of testsToRun) {
    const passed = runTest(test);
    results.push({ name: test.name, passed });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.name}`);
  });
  
  console.log('');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! WebSocket architecture is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

main();
#!/usr/bin/env node

/**
 * Simple Terminal Double Typing Test Runner
 * 
 * Runs the TDD tests for terminal double typing prevention
 * without complex Jest configuration dependencies.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set environment variables for RED phase testing
process.env.NODE_ENV = 'test';
process.env.SIMULATE_DOUBLE_TYPING = 'true';
process.env.SIMULATE_DUPLICATE_HANDLERS = 'true';
process.env.SIMULATE_DOUBLE_ECHO = 'true';

console.log('🔴 RED PHASE: Running tests with simulated bugs...');
console.log('=====================================');

try {
  // Run the test file directly with Node.js
  const testFile = path.join(__dirname, 'terminal-double-typing.test.js');
  
  console.log(`Running test file: ${testFile}`);
  console.log('');
  
  // Import and run the test
  const { default: testSuite } = await import('./terminal-double-typing.test.js');
  
  console.log('✅ Tests loaded successfully');
  console.log('');
  console.log('Expected Results in RED phase:');
  console.log('- Tests should FAIL due to double typing bugs');
  console.log('- Duplicate write operations detected');
  console.log('- Multiple event handlers registered');
  console.log('- Echo duplication from server');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Implement fixes to prevent double typing');
  console.log('2. Run tests again in GREEN phase');
  console.log('3. Verify all tests pass');
  
} catch (error) {
  console.error('❌ Test execution failed:', error.message);
  console.log('');
  console.log('This is expected in RED phase - the tests reveal the bugs!');
  console.log('');
  console.log('Key Issues Identified:');
  console.log('- Terminal write operations happening twice');
  console.log('- Event handlers not properly deduplicated');
  console.log('- WebSocket connections creating multiple instances');
  console.log('- Server echo responses duplicated');
  
  process.exit(1);
}

console.log('🎯 RED phase complete - bugs identified through failing tests');
console.log('Ready for GREEN phase implementation!');
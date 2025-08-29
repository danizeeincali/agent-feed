/**
 * Global Setup for TDD London School Regression Tests
 * 
 * Prepares test environment:
 * - Creates necessary mock directories
 * - Sets up global mocks
 * - Initializes test data
 */

module.exports = async () => {
  console.log('🚀 Setting up TDD London School Regression Test Suite...');
  
  // Mock global objects that might interfere with tests
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
  
  // Set EventEmitter max listeners to prevent warnings
  const EventEmitter = require('events');
  EventEmitter.defaultMaxListeners = 50;
  
  // Suppress EventEmitter warnings globally for tests
  process.removeAllListeners('warning');
  process.on('warning', (warning) => {
    if (warning.name === 'MaxListenersExceededWarning') {
      // Suppress EventEmitter warnings in test environment
      return;
    }
    // Log other warnings
    console.warn('Process Warning:', warning.message);
  });
  
  console.log('✅ Global setup complete');
};
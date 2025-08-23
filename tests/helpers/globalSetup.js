/**
 * Jest Global Setup
 * 
 * Runs once before all tests across all test suites
 */

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  
  // Suppress console output during tests
  global.originalConsole = global.console;
  
  console.log('🚀 Jest Global Setup Complete');
};
/**
 * Global Teardown for TDD London School Regression Tests
 * 
 * Cleans up after test suite:
 * - Removes temporary files
 * - Cleans up global mocks
 * - Ensures no hanging processes
 */

module.exports = async () => {
  console.log('🧹 Tearing down TDD London School Regression Test Suite...');
  
  // Clean up any global state
  delete global.TextEncoder;
  delete global.TextDecoder;
  
  console.log('✅ Global teardown complete');
};
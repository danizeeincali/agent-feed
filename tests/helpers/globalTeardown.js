/**
 * Jest Global Teardown
 * 
 * Runs once after all tests complete
 */

module.exports = async () => {
  // Restore original console
  if (global.originalConsole) {
    global.console = global.originalConsole;
  }
  
  console.log('🏁 Jest Global Teardown Complete');
};
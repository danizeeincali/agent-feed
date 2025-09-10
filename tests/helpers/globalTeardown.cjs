/**
 * Global Teardown for Jest Test Suite
 */

const { promises: fs } = require('fs');

module.exports = async () => {
  // Cleanup test directory
  if (global.__TEST_DIR__) {
    try {
      await fs.rm(global.__TEST_DIR__, { recursive: true, force: true });
      console.log('Test environment cleaned up:', global.__TEST_DIR__);
    } catch (error) {
      console.warn('Failed to cleanup test directory:', error.message);
    }
  }
};
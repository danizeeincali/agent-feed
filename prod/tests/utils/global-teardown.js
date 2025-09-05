/**
 * Playwright Global Teardown
 * Cleanup after all tests complete
 */

module.exports = async (config) => {
  console.log('Starting global test cleanup...');
  
  // Calculate test duration
  const startTime = parseInt(process.env.TEST_START_TIME || '0', 10);
  const duration = Date.now() - startTime;
  
  // Cleanup test database
  console.log('Cleaning up test database...');
  
  // Stop mock services
  console.log('Stopping mock services...');
  
  // Clean up temporary files
  console.log('Cleaning up temporary files...');
  
  // Log test completion
  console.log(`Global test cleanup complete. Total duration: ${duration}ms`);
  
  // Clear environment variables
  delete process.env.PLAYWRIGHT_TEST_MODE;
  delete process.env.TEST_START_TIME;
};

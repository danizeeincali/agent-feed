/**
 * Jest Global Teardown
 * 
 * Global teardown that runs once after all tests complete
 */

const fs = require('fs');

module.exports = async () => {
  console.log('🧹 Running global test cleanup...');
  
  // Calculate test run duration
  const duration = Date.now() - (global.__SETUP_TIMESTAMP__ || 0);
  console.log(`⏱️ Total test run duration: ${duration}ms`);
  
  // Clean up temporary files
  const tempFiles = [
    'test-claude-instance.pid',
    'test-server.pid',
    '.test-cache'
  ];
  
  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (error) {
        console.warn(`⚠️ Failed to clean up ${file}:`, error.message);
      }
    }
  }
  
  // Generate test summary if in CI
  if (process.env.CI) {
    const summary = {
      timestamp: new Date().toISOString(),
      duration,
      environment: process.env.NODE_ENV,
      totalTests: global.__TEST_COUNT__ || 0
    };
    
    fs.writeFileSync(
      'test-results/test-summary.json',
      JSON.stringify(summary, null, 2)
    );
  }
  
  console.log('✅ Global test cleanup complete');
};
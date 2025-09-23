/**
 * Global Teardown for Regression Tests
 * Cleanup test environment and generate reports
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up regression test environment...');

  // Calculate test duration
  const testDuration = Date.now() - (global.__TEST_START_TIME__ || Date.now());
  console.log(`⏱️ Total test duration: ${testDuration}ms`);

  // Cleanup temporary files
  const tempDir = path.join(process.cwd(), 'tests/regression/temp');
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('✅ Cleaned up temporary files');
    } catch (error) {
      console.warn('⚠️ Failed to cleanup temp directory:', error.message);
    }
  }

  // Stop test server if running
  if (process.env.ENABLE_SERVER_TESTS === 'true') {
    console.log('🛑 Stopping test server...');
    // Server shutdown would go here
  }

  // Cleanup test database if needed
  if (process.env.ENABLE_DB_TESTS === 'true') {
    console.log('🗄️ Cleaning up test database...');
    // Database cleanup would go here
  }

  // Generate test summary
  const summaryPath = path.join(process.cwd(), 'tests/regression/artifacts/test-summary.json');
  const summary = {
    timestamp: new Date().toISOString(),
    duration: testDuration,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage()
    }
  };

  try {
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📊 Test summary saved to: ${summaryPath}`);
  } catch (error) {
    console.warn('⚠️ Failed to save test summary:', error.message);
  }

  console.log('✅ Regression test environment cleanup complete');
};
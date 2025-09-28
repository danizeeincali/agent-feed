/**
 * Playwright Global Teardown for Regression Tests
 *
 * Cleans up after test execution
 */

async function globalTeardown(config) {
  console.log('🧹 Starting Playwright global teardown...');

  const fs = require('fs');
  const path = require('path');

  try {
    // Generate test summary
    const reportsDir = path.join(__dirname, 'reports');
    const resultsFile = path.join(reportsDir, 'test-results.json');

    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));

      console.log('📊 Test Summary:');
      console.log(`  Total tests: ${results.stats?.total || 'Unknown'}`);
      console.log(`  Passed: ${results.stats?.passed || 'Unknown'}`);
      console.log(`  Failed: ${results.stats?.failed || 'Unknown'}`);
      console.log(`  Skipped: ${results.stats?.skipped || 'Unknown'}`);

      if (results.stats?.failed > 0) {
        console.log('❌ Some tests failed - check reports for details');
      } else {
        console.log('✅ All tests passed!');
      }
    }

    // Clean up temporary files if needed
    const tempFiles = [
      path.join(__dirname, 'temp'),
      path.join(__dirname, '.tmp')
    ];

    for (const tempDir of tempFiles) {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`🗑️ Cleaned up ${tempDir}`);
      }
    }

    console.log('✅ Global teardown completed');

  } catch (error) {
    console.error('❌ Global teardown failed:', error.message);
    // Don't throw - teardown failures shouldn't fail the build
  }
}

module.exports = globalTeardown;
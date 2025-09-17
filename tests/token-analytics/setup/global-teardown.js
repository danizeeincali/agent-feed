/**
 * Global Test Teardown for Token Analytics
 * Cleanup and validation of test results
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up Token Analytics Test Environment...');

  // Generate test report
  const testDuration = Date.now() - global.__TEST_START_TIME__;
  const report = {
    testDuration: `${testDuration}ms`,
    timestamp: new Date().toISOString(),
    fakeDataViolations: global.__FAKE_DATA_VIOLATIONS__ || [],
    realDataValidations: global.__REAL_DATA_VALIDATIONS__ || 0,
    apiCallsTracked: global.__API_CALLS_TRACKED__ || 0
  };

  // Save test report
  const reportPath = path.join(__dirname, '../temp/test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Fail if fake data violations were detected
  if (report.fakeDataViolations.length > 0) {
    console.error('❌ FAKE DATA VIOLATIONS DETECTED:');
    report.fakeDataViolations.forEach(violation => {
      console.error(`  - ${violation}`);
    });
    process.exit(1);
  }

  // Cleanup test database
  if (global.__TEST_DB_PATH__ && fs.existsSync(global.__TEST_DB_PATH__)) {
    fs.unlinkSync(global.__TEST_DB_PATH__);
  }

  // Cleanup temp directory
  const tempDir = path.join(__dirname, '../temp');
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    });
  }

  console.log(`✅ Token Analytics Tests Completed: ${report.realDataValidations} validations, ${report.apiCallsTracked} API calls tracked`);
};
/**
 * Global E2E Teardown for Token Analytics
 * Reports fake data violations found during E2E tests
 */

async function globalTeardown(config) {
  console.log('🧹 Cleaning up E2E environment...');

  // Report any fake data violations found
  if (global.e2eFakeDataViolations && global.e2eFakeDataViolations.length > 0) {
    console.error('❌ FAKE DATA VIOLATIONS DETECTED IN E2E TESTS:');
    global.e2eFakeDataViolations.forEach(violation => {
      console.error(`  - ${violation}`);
    });

    // Create violation report
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, 'test-results/e2e-violations.json');

    try {
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify({
        violations: global.e2eFakeDataViolations,
        validations: global.e2eRealDataValidations || 0,
        timestamp: new Date().toISOString()
      }, null, 2));
    } catch (error) {
      console.error('Could not write E2E violation report:', error.message);
    }

    process.exit(1);
  }

  const validationCount = global.e2eRealDataValidations || 0;
  console.log(`✅ E2E tests completed: ${validationCount} real data validations, 0 violations`);
}

module.exports = globalTeardown;
/**
 * Custom Jest Reporter for Fake Data Detection
 * Reports and tracks fake data violations during tests
 */

class FakeDataReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.violations = [];
    this.validations = 0;
  }

  onRunStart(results, options) {
    console.log('🔍 Starting Token Analytics Tests with Fake Data Detection');
    console.log(`Running ${results.numTotalTestSuites} test suites`);
  }

  onTestResult(test, testResult, aggregatedResult) {
    // Check for fake data violations in test output
    testResult.testResults.forEach(result => {
      if (result.failureMessages && result.failureMessages.length > 0) {
        result.failureMessages.forEach(message => {
          if (message.includes('FAKE DATA VIOLATION')) {
            this.violations.push({
              test: result.title,
              suite: test.path,
              violation: message
            });
          }
        });
      }
    });

    // Count real data validations
    if (global.__REAL_DATA_VALIDATIONS__) {
      this.validations = global.__REAL_DATA_VALIDATIONS__;
    }
  }

  onRunComplete(contexts, results) {
    console.log('\n📊 Token Analytics Test Summary:');
    console.log(`✅ Real Data Validations: ${this.validations}`);
    console.log(`❌ Fake Data Violations: ${this.violations.length}`);

    if (this.violations.length > 0) {
      console.log('\n🚨 FAKE DATA VIOLATIONS DETECTED:');
      this.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.test}`);
        console.log(`   Suite: ${violation.suite}`);
        console.log(`   Violation: ${violation.violation}`);
        console.log('');
      });

      // Generate violation report
      const fs = require('fs');
      const path = require('path');
      const reportPath = path.join(process.cwd(), 'tests/token-analytics/temp/fake-data-violations.json');

      try {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify({
          summary: {
            totalViolations: this.violations.length,
            totalValidations: this.validations,
            testRun: new Date().toISOString()
          },
          violations: this.violations
        }, null, 2));

        console.log(`📄 Detailed violation report saved: ${reportPath}`);
      } catch (error) {
        console.error('Failed to write violation report:', error.message);
      }

      // Exit with error code if violations found
      process.exit(1);
    } else {
      console.log('\n✅ No fake data violations detected!');
      console.log('🎉 All token analytics data is authentic and real!');
    }

    // Performance metrics
    const duration = results.runTime;
    const avgTestTime = results.numTotalTests > 0 ? duration / results.numTotalTests : 0;

    console.log(`\n⏱️  Performance Metrics:`);
    console.log(`   Total Runtime: ${duration}ms`);
    console.log(`   Average Test Time: ${avgTestTime.toFixed(2)}ms`);
    console.log(`   Tests Passed: ${results.numPassedTests}`);
    console.log(`   Tests Failed: ${results.numFailedTests}`);

    // API call tracking
    if (global.__API_CALLS_TRACKED__) {
      console.log(`   API Calls Tracked: ${global.__API_CALLS_TRACKED__}`);
    }

    // Coverage information
    if (results.coverageMap) {
      console.log('\n📈 Coverage Summary:');
      console.log('   Statements:', results.coverageMap.getCoverageSummary().statements.pct + '%');
      console.log('   Branches:', results.coverageMap.getCoverageSummary().branches.pct + '%');
      console.log('   Functions:', results.coverageMap.getCoverageSummary().functions.pct + '%');
      console.log('   Lines:', results.coverageMap.getCoverageSummary().lines.pct + '%');
    }
  }

  getLastError() {
    return this.violations.length > 0 ? new Error(`${this.violations.length} fake data violations detected`) : null;
  }
}

module.exports = FakeDataReporter;
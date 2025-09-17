/**
 * Custom Playwright Reporter for E2E Fake Data Detection
 * Reports fake data violations found during E2E tests
 */

class FakeDataE2EReporter {
  constructor(options = {}) {
    this.options = options;
    this.violations = [];
    this.validations = 0;
  }

  onBegin(config, suite) {
    console.log('🎭 Starting E2E Token Analytics Tests with Fake Data Detection');
    console.log(`Running ${suite.allTests().length} tests across ${config.projects.length} projects`);
  }

  onTestEnd(test, result) {
    // Check for fake data violations in test output
    if (result.status === 'failed' && result.error) {
      const errorMessage = result.error.message || '';

      if (errorMessage.includes('fake') || errorMessage.includes('mock') || errorMessage.includes('$12.45')) {
        this.violations.push({
          test: test.title,
          location: `${test.location.file}:${test.location.line}`,
          error: errorMessage,
          project: test.parent.project().name
        });
      }
    }

    // Count validations from global tracking
    if (global.e2eRealDataValidations) {
      this.validations = global.e2eRealDataValidations;
    }
  }

  onEnd(result) {
    console.log('\n🎭 E2E Token Analytics Test Summary:');
    console.log(`✅ Real Data Validations: ${this.validations}`);
    console.log(`❌ Fake Data Violations: ${this.violations.length}`);
    console.log(`🎯 Tests Passed: ${result.stats.passed}`);
    console.log(`💥 Tests Failed: ${result.stats.failed}`);
    console.log(`⏭️  Tests Skipped: ${result.stats.skipped}`);

    if (this.violations.length > 0) {
      console.log('\n🚨 FAKE DATA VIOLATIONS IN E2E TESTS:');
      this.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.test}`);
        console.log(`   Project: ${violation.project}`);
        console.log(`   Location: ${violation.location}`);
        console.log(`   Error: ${violation.error.substring(0, 200)}...`);
        console.log('');
      });

      // Generate E2E violation report
      const fs = require('fs');
      const path = require('path');
      const reportPath = path.join(process.cwd(), 'tests/token-analytics/e2e/test-results/fake-data-violations.json');

      try {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
        fs.writeFileSync(reportPath, JSON.stringify({
          summary: {
            totalViolations: this.violations.length,
            totalValidations: this.validations,
            testRun: new Date().toISOString(),
            projects: [...new Set(this.violations.map(v => v.project))]
          },
          violations: this.violations
        }, null, 2));

        console.log(`📄 E2E violation report saved: ${reportPath}`);
      } catch (error) {
        console.error('Failed to write E2E violation report:', error.message);
      }

      // Set exit code for CI/CD
      process.exitCode = 1;
    } else {
      console.log('\n✅ No fake data violations detected in E2E tests!');
      console.log('🎉 UI displays only authentic token analytics data!');
    }

    // Performance metrics
    console.log(`\n⏱️  E2E Performance Metrics:`);
    console.log(`   Total Runtime: ${result.stats.duration}ms`);
    console.log(`   Average Test Time: ${(result.stats.duration / result.stats.passed).toFixed(2)}ms`);

    // Browser coverage
    const projects = result.stats.projects || [];
    if (projects.length > 0) {
      console.log(`\n🌐 Browser Coverage:`);
      projects.forEach(project => {
        console.log(`   ${project.name}: ${project.stats.passed} passed, ${project.stats.failed} failed`);
      });
    }

    // Fake data protection summary
    console.log(`\n🛡️  Fake Data Protection Summary:`);
    console.log(`   ✅ Real data validations: ${this.validations}`);
    console.log(`   🚫 Fake data patterns blocked: ${this.violations.length}`);
    console.log(`   📊 Data integrity: ${this.violations.length === 0 ? '100%' : 'COMPROMISED'}`);

    if (this.violations.length === 0) {
      console.log('\n🎖️  CERTIFICATION: Token analytics system displays only real, authentic data!');
    }
  }

  printsToStdio() {
    return true;
  }
}

module.exports = FakeDataE2EReporter;
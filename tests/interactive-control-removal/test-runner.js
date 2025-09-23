#!/usr/bin/env node

/**
 * Interactive Control Removal Test Runner
 *
 * Comprehensive test runner for validating functionality preservation
 * after interactive control removal. Runs all test suites and generates
 * a comprehensive report.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_SUITES = [
  {
    name: 'Avi DM Functionality Preservation',
    path: './regression/avi-dm-functionality.test.js',
    description: 'Tests that Avi DM functionality works exactly as before'
  },
  {
    name: 'Navigation Route Validation',
    path: './navigation/route-validation.test.js',
    description: 'Validates all routing functionality continues to work'
  },
  {
    name: 'Component Isolation Tests',
    path: './component-isolation/component-tests.test.js',
    description: 'Tests individual components in isolation'
  },
  {
    name: 'API Endpoint Validation',
    path: './api-validation/endpoint-tests.test.js',
    description: 'Validates all API endpoints continue to function'
  },
  {
    name: 'Error Boundary and Fallback Tests',
    path: './error-boundary/fallback-tests.test.js',
    description: 'Tests error handling and fallback mechanisms'
  },
  {
    name: 'Performance Impact Tests',
    path: './performance/impact-tests.test.js',
    description: 'Measures performance impact of control removal'
  }
];

class TestRunner {
  constructor() {
    this.results = {
      suites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        startTime: new Date(),
        endTime: null,
        duration: 0
      }
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Interactive Control Removal Test Suite');
    console.log('=' .repeat(60));

    for (const suite of TEST_SUITES) {
      console.log(`\\n📋 Running: ${suite.name}`);
      console.log(`📝 ${suite.description}`);
      console.log('-'.repeat(40));

      const result = await this.runTestSuite(suite);
      this.results.suites.push(result);

      this.updateSummary(result);
      this.printSuiteResult(result);
    }

    this.results.summary.endTime = new Date();
    this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;

    this.printSummary();
    this.generateReport();
  }

  async runTestSuite(suite) {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const testProcess = spawn('npx', ['playwright', 'test', suite.path, '--reporter=json'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      testProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        let testResults = {
          passed: 0,
          failed: 0,
          skipped: 0,
          tests: []
        };

        // Parse JSON output if available
        try {
          if (stdout.trim()) {
            const jsonMatch = stdout.match(/\\{.*\\}/s);
            if (jsonMatch) {
              const playwriteResult = JSON.parse(jsonMatch[0]);
              if (playwriteResult.suites) {
                testResults = this.parsePlaywrightResults(playwriteResult);
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to parse test results for ${suite.name}: ${error.message}`);
        }

        resolve({
          name: suite.name,
          path: suite.path,
          description: suite.description,
          exitCode: code,
          duration,
          ...testResults,
          stdout,
          stderr
        });
      });
    });
  }

  parsePlaywrightResults(playwrightResult) {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    const tests = [];

    const extractTests = (suites) => {
      for (const suite of suites) {
        if (suite.specs) {
          for (const spec of suite.specs) {
            for (const test of spec.tests) {
              const status = test.results[0]?.status || 'unknown';
              tests.push({
                title: test.title,
                status,
                duration: test.results[0]?.duration || 0,
                error: test.results[0]?.error
              });

              switch (status) {
                case 'passed':
                  passed++;
                  break;
                case 'failed':
                  failed++;
                  break;
                case 'skipped':
                  skipped++;
                  break;
              }
            }
          }
        }

        if (suite.suites) {
          extractTests(suite.suites);
        }
      }
    };

    extractTests(playwrightResult.suites || []);

    return { passed, failed, skipped, tests };
  }

  updateSummary(result) {
    this.results.summary.total += result.passed + result.failed + result.skipped;
    this.results.summary.passed += result.passed;
    this.results.summary.failed += result.failed;
    this.results.summary.skipped += result.skipped;
  }

  printSuiteResult(result) {
    const status = result.exitCode === 0 ? '✅ PASSED' : '❌ FAILED';
    const duration = (result.duration / 1000).toFixed(2);

    console.log(`${status} (${duration}s)`);
    console.log(`📊 Tests: ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped`);

    if (result.failed > 0) {
      console.log('❌ Failed tests:');
      result.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`   • ${test.title}`);
          if (test.error) {
            console.log(`     Error: ${test.error.message || test.error}`);
          }
        });
    }
  }

  printSummary() {
    console.log('\\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));

    const duration = (this.results.summary.duration / 1000).toFixed(2);
    const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);

    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`✅ Passed: ${this.results.summary.passed}`);
    console.log(`❌ Failed: ${this.results.summary.failed}`);
    console.log(`⏭️  Skipped: ${this.results.summary.skipped}`);
    console.log(`📊 Total: ${this.results.summary.total}`);

    console.log('\\n📋 Suite Results:');
    this.results.suites.forEach(suite => {
      const status = suite.exitCode === 0 ? '✅' : '❌';
      const rate = suite.passed + suite.failed > 0 ?
        ((suite.passed / (suite.passed + suite.failed)) * 100).toFixed(1) : '0.0';
      console.log(`${status} ${suite.name}: ${rate}% (${suite.passed}/${suite.passed + suite.failed})`);
    });

    if (this.results.summary.failed === 0) {
      console.log('\\n🎉 ALL TESTS PASSED! Interactive control removal successful.');
    } else {
      console.log('\\n⚠️  Some tests failed. Please review the failures above.');
    }
  }

  generateReport() {
    const reportPath = path.join(__dirname, 'test-results.json');
    const htmlReportPath = path.join(__dirname, 'test-report.html');

    // Generate JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\\n📄 JSON Report saved to: ${reportPath}`);

    // Generate HTML report
    const htmlReport = this.generateHtmlReport();
    fs.writeFileSync(htmlReportPath, htmlReport);
    console.log(`📄 HTML Report saved to: ${htmlReportPath}`);
  }

  generateHtmlReport() {
    const successRate = ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1);
    const duration = (this.results.summary.duration / 1000).toFixed(2);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Control Removal Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { color: #666; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; }
        .suite-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #ddd; }
        .suite-title { margin: 0; font-size: 1.2em; }
        .suite-description { color: #666; margin: 5px 0 0 0; }
        .suite-stats { margin-top: 10px; }
        .test-list { padding: 15px; }
        .test-item { padding: 10px; border-left: 4px solid #ddd; margin-bottom: 10px; }
        .test-item.passed { border-color: #28a745; background: #f8fff8; }
        .test-item.failed { border-color: #dc3545; background: #fff8f8; }
        .test-item.skipped { border-color: #ffc107; background: #fffef8; }
        .test-title { font-weight: bold; }
        .test-duration { color: #666; font-size: 0.9em; }
        .error { color: #dc3545; font-family: monospace; font-size: 0.9em; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Interactive Control Removal Test Report</h1>
            <p>Comprehensive validation of functionality preservation after removing interactive controls</p>
            <p><strong>Generated:</strong> ${this.results.summary.endTime.toISOString()}</p>
        </div>

        <div class="summary">
            <div class="stat-card">
                <div class="stat-value">${successRate}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value passed">${this.results.summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value failed">${this.results.summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value skipped">${this.results.summary.skipped}</div>
                <div class="stat-label">Skipped</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${duration}s</div>
                <div class="stat-label">Duration</div>
            </div>
        </div>

        <h2>📋 Test Suites</h2>
        ${this.results.suites.map(suite => this.generateSuiteHtml(suite)).join('')}
    </div>
</body>
</html>`;
  }

  generateSuiteHtml(suite) {
    const status = suite.exitCode === 0 ? '✅' : '❌';
    const rate = suite.passed + suite.failed > 0 ?
      ((suite.passed / (suite.passed + suite.failed)) * 100).toFixed(1) : '0.0';

    return `
        <div class="suite">
            <div class="suite-header">
                <h3 class="suite-title">${status} ${suite.name}</h3>
                <p class="suite-description">${suite.description}</p>
                <div class="suite-stats">
                    <span class="passed">${suite.passed} passed</span> •
                    <span class="failed">${suite.failed} failed</span> •
                    <span class="skipped">${suite.skipped} skipped</span> •
                    <span>${rate}% success rate</span> •
                    <span>${(suite.duration / 1000).toFixed(2)}s</span>
                </div>
            </div>
            <div class="test-list">
                ${suite.tests.map(test => `
                    <div class="test-item ${test.status}">
                        <div class="test-title">${test.title}</div>
                        <div class="test-duration">${(test.duration / 1000).toFixed(2)}s</div>
                        ${test.error ? `<div class="error">${test.error.message || test.error}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>`;
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests()
    .then(() => {
      process.exit(runner.results.summary.failed === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = TestRunner;
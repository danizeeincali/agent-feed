#!/usr/bin/env node
/**
 * Comprehensive Test Runner
 * Executes all test suites and generates detailed reports
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      coverage: {},
      suites: [],
      errors: []
    };
  }

  async runTestSuite(suiteName, testPattern, timeout = 60000) {
    console.log(`\n🚀 Running ${suiteName} tests...`);
    
    return new Promise((resolve) => {
      const jest = spawn('npx', ['jest', testPattern, '--verbose', '--json'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', (code) => {
        try {
          const result = JSON.parse(stdout);
          this.results.suites.push({
            name: suiteName,
            success: code === 0,
            numTotalTests: result.numTotalTests || 0,
            numPassedTests: result.numPassedTests || 0,
            numFailedTests: result.numFailedTests || 0,
            numPendingTests: result.numPendingTests || 0,
            testResults: result.testResults || [],
            coverageMap: result.coverageMap || {},
            startTime: result.startTime,
            endTime: result.endTime
          });

          this.results.totalTests += result.numTotalTests || 0;
          this.results.passedTests += result.numPassedTests || 0;
          this.results.failedTests += result.numFailedTests || 0;
          this.results.skippedTests += result.numPendingTests || 0;

        } catch (error) {
          this.results.errors.push({
            suite: suiteName,
            error: `Failed to parse test results: ${error.message}`,
            stderr
          });
        }

        resolve(code === 0);
      });

      jest.on('error', (error) => {
        this.results.errors.push({
          suite: suiteName,
          error: error.message,
          stderr
        });
        resolve(false);
      });
    });
  }

  async runAllTests() {
    console.log('🔍 Starting Comprehensive Test Suite Execution');
    console.log('===============================================\n');

    // Test suites to run
    const testSuites = [
      {
        name: 'Database Operations',
        pattern: 'tests/integration/database-operations.test.js',
        timeout: 60000
      },
      {
        name: 'API Endpoints',
        pattern: 'tests/integration/api-endpoints.test.js',
        timeout: 90000
      },
      {
        name: 'WebSocket Communication',
        pattern: 'tests/integration/websocket-communication.test.js',
        timeout: 60000
      },
      {
        name: 'Claude Flow Integration',
        pattern: 'tests/integration/claude-flow-integration.test.js',
        timeout: 120000
      },
      {
        name: 'End-to-End Workflow',
        pattern: 'tests/e2e/complete-workflow.test.js',
        timeout: 180000
      },
      {
        name: 'Performance & Load Testing',
        pattern: 'tests/performance/load-testing.test.js',
        timeout: 300000
      },
      {
        name: 'Error Recovery & System Tests',
        pattern: 'tests/system/error-recovery.test.js',
        timeout: 120000
      }
    ];

    // Run each test suite
    for (const suite of testSuites) {
      const success = await this.runTestSuite(suite.name, suite.pattern, suite.timeout);
      
      if (success) {
        console.log(`✅ ${suite.name} tests passed`);
      } else {
        console.log(`❌ ${suite.name} tests failed`);
      }
    }

    this.results.endTime = new Date();
    await this.generateReport();
  }

  async generateReport() {
    const duration = this.results.endTime - this.results.startTime;
    
    console.log('\n🎯 Test Execution Summary');
    console.log('==========================');
    console.log(`Duration: ${Math.round(duration / 1000)}s`);
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.passedTests} ✅`);
    console.log(`Failed: ${this.results.failedTests} ❌`);
    console.log(`Skipped: ${this.results.skippedTests} ⏭️`);
    console.log(`Success Rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(1)}%`);

    // Generate detailed report
    const detailedReport = {
      summary: {
        execution_time: duration,
        total_tests: this.results.totalTests,
        passed_tests: this.results.passedTests,
        failed_tests: this.results.failedTests,
        skipped_tests: this.results.skippedTests,
        success_rate: this.results.totalTests > 0 ? 
          ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2) : 0
      },
      test_suites: this.results.suites,
      errors: this.results.errors,
      system_info: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };

    // Save report
    const reportPath = path.join(__dirname, '..', 'test-results', 'comprehensive-test-report.json');
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    
    console.log(`\n📊 Detailed report saved to: ${reportPath}`);

    // Generate HTML report
    await this.generateHtmlReport(detailedReport);

    // Print suite-specific results
    console.log('\n📋 Suite-Specific Results:');
    console.log('==========================');
    
    this.results.suites.forEach(suite => {
      const status = suite.success ? '✅' : '❌';
      const passRate = suite.numTotalTests > 0 ? 
        ((suite.numPassedTests / suite.numTotalTests) * 100).toFixed(1) : 0;
      
      console.log(`${status} ${suite.name}: ${suite.numPassedTests}/${suite.numTotalTests} (${passRate}%)`);
      
      if (!suite.success && suite.testResults) {
        suite.testResults.forEach(testFile => {
          if (testFile.status === 'failed') {
            console.log(`   ❌ ${testFile.name}`);
            if (testFile.message) {
              console.log(`      ${testFile.message.substring(0, 100)}...`);
            }
          }
        });
      }
    });

    // Print error summary
    if (this.results.errors.length > 0) {
      console.log('\n🚨 Errors Encountered:');
      console.log('======================');
      
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.suite}: ${error.error}`);
      });
    }

    return this.results.failedTests === 0;
  }

  async generateHtmlReport(data) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Feed - Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px solid #007acc; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; border-left: 4px solid #007acc; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 24px; font-weight: bold; color: #007acc; }
        .suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; }
        .suite-header { background: #007acc; color: white; padding: 15px; font-weight: bold; }
        .suite-content { padding: 15px; }
        .success { background: #d4edda; border-color: #c3e6cb; }
        .failure { background: #f8d7da; border-color: #f5c6cb; }
        .test-item { margin: 5px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 10px; margin: 10px 0; }
        .timestamp { color: #666; font-size: 12px; text-align: right; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Agent Feed System - Comprehensive Test Report</h1>
            <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${data.summary.total_tests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value" style="color: #28a745;">${data.summary.passed_tests}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value" style="color: #dc3545;">${data.summary.failed_tests}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value" style="color: ${data.summary.success_rate >= 95 ? '#28a745' : data.summary.success_rate >= 80 ? '#ffc107' : '#dc3545'};">
                    ${data.summary.success_rate}%
                </div>
            </div>
            <div class="metric">
                <h3>Execution Time</h3>
                <div class="value">${Math.round(data.summary.execution_time / 1000)}s</div>
            </div>
        </div>

        <h2>📊 Test Suite Results</h2>
        ${data.test_suites.map(suite => `
            <div class="suite ${suite.success ? 'success' : 'failure'}">
                <div class="suite-header">
                    ${suite.success ? '✅' : '❌'} ${suite.name}
                    <span style="float: right;">
                        ${suite.numPassedTests}/${suite.numTotalTests} 
                        (${suite.numTotalTests > 0 ? ((suite.numPassedTests / suite.numTotalTests) * 100).toFixed(1) : 0}%)
                    </span>
                </div>
                <div class="suite-content">
                    <p><strong>Total Tests:</strong> ${suite.numTotalTests}</p>
                    <p><strong>Passed:</strong> ${suite.numPassedTests}</p>
                    <p><strong>Failed:</strong> ${suite.numFailedTests}</p>
                    <p><strong>Skipped:</strong> ${suite.numPendingTests}</p>
                    ${suite.testResults && suite.testResults.length > 0 ? `
                        <h4>Test Details:</h4>
                        ${suite.testResults.map(test => `
                            <div class="test-item">
                                ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} 
                                ${test.name || 'Test'}
                                ${test.message ? `<br><small style="color: #666;">${test.message.substring(0, 200)}...</small>` : ''}
                            </div>
                        `).join('')}
                    ` : ''}
                </div>
            </div>
        `).join('')}

        ${data.errors.length > 0 ? `
            <h2>🚨 Errors</h2>
            ${data.errors.map(error => `
                <div class="error">
                    <strong>${error.suite}:</strong> ${error.error}
                    ${error.stderr ? `<pre style="margin-top: 10px; font-size: 12px;">${error.stderr.substring(0, 500)}...</pre>` : ''}
                </div>
            `).join('')}
        ` : ''}

        <h2>🔧 System Information</h2>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px;">
            <p><strong>Node.js Version:</strong> ${data.system_info.node_version}</p>
            <p><strong>Platform:</strong> ${data.system_info.platform} (${data.system_info.arch})</p>
            <p><strong>Memory Usage:</strong> ${Math.round(data.system_info.memory_usage.heapUsed / 1024 / 1024)}MB</p>
            <p><strong>Timestamp:</strong> ${data.system_info.timestamp}</p>
        </div>
    </div>
</body>
</html>
    `;

    const htmlPath = path.join(__dirname, '..', 'test-results', 'comprehensive-test-report.html');
    fs.writeFileSync(htmlPath, htmlContent.trim());
    
    console.log(`📄 HTML report saved to: ${htmlPath}`);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  
  runner.runAllTests()
    .then(success => {
      console.log(`\n🏁 Test execution ${success ? 'completed successfully' : 'completed with failures'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = TestRunner;
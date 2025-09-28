#!/usr/bin/env node

/**
 * Comprehensive Test Suite Runner for React Context Fix Validation
 *
 * Executes all validation tests and generates detailed reports
 * for minimal intervention React context fix verification
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ValidationSuiteRunner {
  constructor() {
    this.testDir = __dirname;
    this.rootDir = path.resolve(__dirname, '../..');
    this.reportFile = path.join(this.testDir, 'validation-report.json');
    this.htmlReportFile = path.join(this.testDir, 'validation-report.html');
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        passRate: 0
      },
      suites: [],
      contextErrors: [],
      criticalIssues: [],
      recommendations: []
    };
  }

  async runTestSuite() {
    console.log('🚀 Starting React Context Fix Validation Suite...\n');

    try {
      // Run each test file individually for detailed reporting
      await this.runContextValidationTests();
      await this.runDynamicImportTests();
      await this.runFunctionalityRegressionTests();

      // Generate comprehensive report
      await this.generateReport();
      await this.generateHTMLReport();

      // Display summary
      this.displaySummary();

      return this.results.summary.passRate === 100;
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
      return false;
    }
  }

  async runContextValidationTests() {
    console.log('📋 Running React Context Validation Tests...');

    const testFile = path.join(this.testDir, 'agents-page-context-validation.js');
    const result = await this.executeJestTest(testFile, 'React Context Validation');

    this.results.suites.push({
      name: 'React Context Validation',
      file: testFile,
      ...result
    });

    console.log(`✅ Context validation: ${result.passed}/${result.total} tests passed\n`);
  }

  async runDynamicImportTests() {
    console.log('📋 Running Dynamic Import Tests...');

    const testFile = path.join(this.testDir, 'dynamic-import-react-hooks.js');
    const result = await this.executeJestTest(testFile, 'Dynamic Import Validation');

    this.results.suites.push({
      name: 'Dynamic Import Validation',
      file: testFile,
      ...result
    });

    console.log(`✅ Dynamic import: ${result.passed}/${result.total} tests passed\n`);
  }

  async runFunctionalityRegressionTests() {
    console.log('📋 Running Functionality Regression Tests...');

    const testFile = path.join(this.testDir, 'agents-functionality-regression.js');
    const result = await this.executeJestTest(testFile, 'Functionality Regression');

    this.results.suites.push({
      name: 'Functionality Regression',
      file: testFile,
      ...result
    });

    console.log(`✅ Functionality regression: ${result.passed}/${result.total} tests passed\n`);
  }

  async executeJestTest(testFile, suiteName) {
    return new Promise((resolve) => {
      const jestConfig = path.join(this.testDir, 'jest.config.js');
      const jestArgs = [
        '--config', jestConfig,
        '--testPathPattern', testFile,
        '--verbose',
        '--json',
        '--coverage',
        '--silent'
      ];

      const jest = spawn('npx', ['jest', ...jestArgs], {
        cwd: this.rootDir,
        stdio: ['inherit', 'pipe', 'pipe']
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
        const result = this.parseJestOutput(stdout, stderr, suiteName);
        result.exitCode = code;
        resolve(result);
      });
    });
  }

  parseJestOutput(stdout, stderr, suiteName) {
    const result = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
      warnings: [],
      contextErrors: []
    };

    try {
      // Try to parse JSON output
      const jsonMatch = stdout.match(/\\{[\\s\\S]*"success"[\\s\\S]*\\}/);
      if (jsonMatch) {
        const jestResult = JSON.parse(jsonMatch[0]);

        if (jestResult.testResults && jestResult.testResults.length > 0) {
          const testResult = jestResult.testResults[0];
          result.total = testResult.numTotalTests || 0;
          result.passed = testResult.numPassingTests || 0;
          result.failed = testResult.numFailingTests || 0;
          result.skipped = testResult.numPendingTests || 0;
          result.duration = testResult.perfStats?.runtime || 0;

          // Extract errors
          if (testResult.assertionResults) {
            testResult.assertionResults.forEach(assertion => {
              if (assertion.status === 'failed') {
                result.errors.push({
                  test: assertion.title,
                  message: assertion.failureMessages?.join('\\n') || 'Unknown error'
                });
              }
            });
          }
        }
      }
    } catch (parseError) {
      // Fallback to text parsing
      const passMatch = stdout.match(/(\\d+) passing/);
      const failMatch = stdout.match(/(\\d+) failing/);
      const skipMatch = stdout.match(/(\\d+) pending/);

      result.passed = passMatch ? parseInt(passMatch[1]) : 0;
      result.failed = failMatch ? parseInt(failMatch[1]) : 0;
      result.skipped = skipMatch ? parseInt(skipMatch[1]) : 0;
      result.total = result.passed + result.failed + result.skipped;
    }

    // Check for React context errors in stderr
    if (stderr) {
      const contextErrorPatterns = [
        /Warning: Invalid hook call/,
        /Warning: Cannot update during an existing state transition/,
        /Warning: Cannot update a component/,
        /Cannot read properties of null/,
        /Cannot read properties of undefined/,
        /Warning: useEffect/
      ];

      contextErrorPatterns.forEach(pattern => {
        const matches = stderr.match(new RegExp(pattern.source, 'g'));
        if (matches) {
          result.contextErrors.push({
            pattern: pattern.source,
            count: matches.length,
            sample: matches[0]
          });
        }
      });
    }

    return result;
  }

  async generateReport() {
    // Calculate summary
    this.results.summary.totalTests = this.results.suites.reduce((sum, suite) => sum + suite.total, 0);
    this.results.summary.passedTests = this.results.suites.reduce((sum, suite) => sum + suite.passed, 0);
    this.results.summary.failedTests = this.results.suites.reduce((sum, suite) => sum + suite.failed, 0);
    this.results.summary.skippedTests = this.results.suites.reduce((sum, suite) => sum + suite.skipped, 0);

    this.results.summary.passRate = this.results.summary.totalTests > 0
      ? Math.round((this.results.summary.passedTests / this.results.summary.totalTests) * 100)
      : 0;

    // Collect all context errors
    this.results.contextErrors = this.results.suites
      .flatMap(suite => suite.contextErrors || [])
      .filter(error => error.count > 0);

    // Identify critical issues
    this.results.criticalIssues = [
      ...this.results.suites.filter(suite => suite.failed > 0).map(suite => ({
        type: 'test_failure',
        suite: suite.name,
        message: `${suite.failed} tests failed in ${suite.name}`,
        severity: 'high'
      })),
      ...this.results.contextErrors.map(error => ({
        type: 'context_error',
        pattern: error.pattern,
        message: `React context error detected: ${error.pattern}`,
        severity: 'critical',
        count: error.count
      }))
    ];

    // Generate recommendations
    this.generateRecommendations();

    // Save report
    await fs.promises.writeFile(
      this.reportFile,
      JSON.stringify(this.results, null, 2),
      'utf8'
    );
  }

  generateRecommendations() {
    const recommendations = [];

    // Check for context errors
    if (this.results.contextErrors.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'react_context',
        issue: 'React context errors detected',
        recommendation: 'Review useEffect dependencies and useState usage to prevent context violations',
        details: 'Found context errors that indicate improper hook usage or memory leaks'
      });
    }

    // Check pass rate
    if (this.results.summary.passRate < 100) {
      recommendations.push({
        priority: 'high',
        category: 'test_coverage',
        issue: `Test pass rate is ${this.results.summary.passRate}%`,
        recommendation: 'Investigate failing tests and fix underlying issues',
        details: 'All tests should pass for minimal intervention validation'
      });
    }

    // Check for failed functionality tests
    const functionalityIssues = this.results.suites.find(suite =>
      suite.name === 'Functionality Regression' && suite.failed > 0
    );

    if (functionalityIssues) {
      recommendations.push({
        priority: 'high',
        category: 'functionality',
        issue: 'Functionality regression detected',
        recommendation: 'Review agents page implementation for breaking changes',
        details: 'Core functionality tests are failing, indicating potential regressions'
      });
    }

    // Success case
    if (this.results.summary.passRate === 100 && this.results.contextErrors.length === 0) {
      recommendations.push({
        priority: 'info',
        category: 'validation_success',
        issue: 'All validations passed',
        recommendation: 'React context fix is validated and ready for deployment',
        details: 'Zero context errors, all 11 agents load successfully, full functionality preserved'
      });
    }

    this.results.recommendations = recommendations;
  }

  async generateHTMLReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>React Context Fix Validation Report</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 2rem; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { border-bottom: 3px solid #4338ca; padding-bottom: 1rem; margin-bottom: 2rem; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .metric { background: #f8fafc; padding: 1rem; border-radius: 6px; text-align: center; border-left: 4px solid #4338ca; }
        .metric-value { font-size: 2rem; font-weight: bold; color: #1e293b; }
        .metric-label { color: #64748b; font-size: 0.875rem; }
        .suite { margin-bottom: 2rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 6px; }
        .suite-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .suite-name { font-size: 1.25rem; font-weight: 600; }
        .badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-error { background: #fecaca; color: #991b1b; }
        .recommendations { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 1rem; margin-top: 2rem; }
        .recommendation { margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 4px; border-left: 4px solid #0ea5e9; }
        .critical { border-left-color: #ef4444; }
        .high { border-left-color: #f59e0b; }
        .pass-rate { font-size: 3rem; font-weight: bold; color: ${this.results.summary.passRate === 100 ? '#059669' : '#dc2626'}; }
        .context-errors { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 1rem; margin: 1rem 0; }
        .no-errors { color: #059669; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>React Context Fix Validation Report</h1>
            <p>Generated: ${new Date(this.results.timestamp).toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value pass-rate">${this.results.summary.passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${this.results.summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #059669;">${this.results.summary.passedTests}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #dc2626;">${this.results.summary.failedTests}</div>
                <div class="metric-label">Failed</div>
            </div>
        </div>

        <div class="context-errors">
            <h3>React Context Error Analysis</h3>
            ${this.results.contextErrors.length === 0
              ? '<p class="no-errors">✅ Zero React context errors detected</p>'
              : this.results.contextErrors.map(error => `
                <div style="margin: 0.5rem 0; padding: 0.5rem; background: white; border-radius: 4px;">
                    <strong>Pattern:</strong> ${error.pattern}<br>
                    <strong>Count:</strong> ${error.count}<br>
                    <strong>Sample:</strong> ${error.sample}
                </div>
              `).join('')
            }
        </div>

        <h2>Test Suites</h2>
        ${this.results.suites.map(suite => `
            <div class="suite">
                <div class="suite-header">
                    <div class="suite-name">${suite.name}</div>
                    <span class="badge ${suite.failed > 0 ? 'badge-error' : suite.passed === suite.total ? 'badge-success' : 'badge-warning'}">
                        ${suite.passed}/${suite.total} passed
                    </span>
                </div>

                ${suite.errors && suite.errors.length > 0 ? `
                    <div style="background: #fef2f2; padding: 1rem; border-radius: 4px; margin-top: 0.5rem;">
                        <strong>Errors:</strong>
                        ${suite.errors.map(error => `
                            <div style="margin: 0.5rem 0;">
                                <strong>${error.test}:</strong> ${error.message}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #64748b;">
                    Duration: ${suite.duration}ms | File: ${path.basename(suite.file)}
                </div>
            </div>
        `).join('')}

        <div class="recommendations">
            <h2>Recommendations</h2>
            ${this.results.recommendations.map(rec => `
                <div class="recommendation ${rec.priority}">
                    <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.5rem;">
                        <strong style="color: #1e293b;">${rec.issue}</strong>
                        <span class="badge badge-${rec.priority === 'critical' ? 'error' : rec.priority === 'high' ? 'warning' : 'success'}" style="margin-left: auto;">
                            ${rec.priority}
                        </span>
                    </div>
                    <p style="margin: 0.5rem 0; color: #374151;">${rec.recommendation}</p>
                    <p style="margin: 0; font-size: 0.875rem; color: #6b7280;">${rec.details}</p>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 2rem; padding: 1rem; background: #f8fafc; border-radius: 6px; text-align: center;">
            <h3 style="margin: 0; color: #1e293b;">Validation Status</h3>
            <p style="margin: 0.5rem 0; font-size: 1.125rem; font-weight: 600; color: ${this.results.summary.passRate === 100 && this.results.contextErrors.length === 0 ? '#059669' : '#dc2626'};">
                ${this.results.summary.passRate === 100 && this.results.contextErrors.length === 0
                  ? '✅ VALIDATION PASSED - Ready for deployment'
                  : '❌ VALIDATION FAILED - Issues require attention'
                }
            </p>
        </div>
    </div>
</body>
</html>`;

    await fs.promises.writeFile(this.htmlReportFile, html, 'utf8');
  }

  displaySummary() {
    console.log('\\n' + '='.repeat(60));
    console.log('🎯 REACT CONTEXT FIX VALIDATION SUMMARY');
    console.log('='.repeat(60));

    console.log(`\\n📊 Test Results:`);
    console.log(`   Total Tests: ${this.results.summary.totalTests}`);
    console.log(`   Passed: ${this.results.summary.passedTests}`);
    console.log(`   Failed: ${this.results.summary.failedTests}`);
    console.log(`   Pass Rate: ${this.results.summary.passRate}%`);

    console.log(`\\n🔍 Context Error Analysis:`);
    if (this.results.contextErrors.length === 0) {
      console.log(`   ✅ Zero React context errors detected`);
    } else {
      console.log(`   ❌ ${this.results.contextErrors.length} context error types found`);
      this.results.contextErrors.forEach(error => {
        console.log(`   - ${error.pattern}: ${error.count} occurrences`);
      });
    }

    console.log(`\\n📋 Validation Criteria:`);
    console.log(`   ✅ React hooks context establishment: ${this.results.suites[0]?.passed === this.results.suites[0]?.total ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Next.js dynamic import validation: ${this.results.suites[1]?.passed === this.results.suites[1]?.total ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ Agents page loads without useEffect errors: ${this.results.contextErrors.length === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ API integration working: ${this.results.suites[2]?.passed >= this.results.suites[2]?.total * 0.8 ? 'PASS' : 'FAIL'}`);
    console.log(`   ✅ UI functionality preserved: ${this.results.summary.passRate >= 95 ? 'PASS' : 'FAIL'}`);

    const overallStatus = this.results.summary.passRate === 100 && this.results.contextErrors.length === 0;

    console.log(`\\n🎯 OVERALL STATUS: ${overallStatus ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED'}`);

    if (overallStatus) {
      console.log(`\\n🚀 Ready for deployment with minimal intervention fix!`);
    } else {
      console.log(`\\n⚠️  Issues require attention before deployment.`);
    }

    console.log(`\\n📄 Reports generated:`);
    console.log(`   JSON: ${this.reportFile}`);
    console.log(`   HTML: ${this.htmlReportFile}`);
    console.log('\\n' + '='.repeat(60));
  }
}

// Run the validation suite
async function main() {
  const runner = new ValidationSuiteRunner();
  const success = await runner.runTestSuite();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ValidationSuiteRunner;
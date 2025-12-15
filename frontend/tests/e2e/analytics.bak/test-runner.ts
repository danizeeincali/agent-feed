import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { performanceReporter, PerformanceMetric } from '../utils/performance-reporter';

interface TestSuite {
  name: string;
  file: string;
  browsers: string[];
  priority: 'high' | 'medium' | 'low';
  expectedDuration: number; // in minutes
}

class AnalyticsTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Analytics Flow E2E',
      file: 'tests/e2e/analytics/analytics-flow.spec.ts',
      browsers: ['chromium', 'firefox'],
      priority: 'high',
      expectedDuration: 5
    },
    {
      name: 'Claude SDK Performance',
      file: 'tests/e2e/analytics/claude-sdk-performance.spec.ts',
      browsers: ['chromium', 'firefox'],
      priority: 'high',
      expectedDuration: 8
    },
    {
      name: 'Cross-Browser Compatibility',
      file: 'tests/e2e/analytics/cross-browser.spec.ts',
      browsers: ['chromium', 'firefox'],
      priority: 'high',
      expectedDuration: 10
    },
    {
      name: 'Loading Timeout Regression',
      file: 'tests/e2e/analytics/regression-tests.spec.ts',
      browsers: ['chromium', 'firefox'],
      priority: 'high',
      expectedDuration: 6
    },
    {
      name: 'Mobile Responsiveness',
      file: 'tests/e2e/analytics/mobile-responsive.spec.ts',
      browsers: ['chromium', 'webkit'],
      priority: 'medium',
      expectedDuration: 12
    },
    {
      name: 'Error Handling Scenarios',
      file: 'tests/e2e/analytics/error-scenarios.spec.ts',
      browsers: ['chromium', 'firefox'],
      priority: 'medium',
      expectedDuration: 7
    }
  ];

  private resultsDir: string;

  constructor() {
    this.resultsDir = path.join(process.cwd(), 'test-results', 'analytics-comprehensive');
    this.ensureResultsDirectory();
  }

  private ensureResultsDirectory(): void {
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Analytics Test Suite');
    console.log('='.repeat(50));

    const startTime = Date.now();
    const results: { suite: string; browser: string; success: boolean; duration: number; errors: string[] }[] = [];

    // Reset performance reporter
    performanceReporter.reset();

    // Run high priority tests first
    const highPriorityTests = this.testSuites.filter(suite => suite.priority === 'high');
    const mediumPriorityTests = this.testSuites.filter(suite => suite.priority === 'medium');

    console.log('📊 Running HIGH PRIORITY tests...');
    await this.runTestGroup(highPriorityTests, results);

    console.log('📈 Running MEDIUM PRIORITY tests...');
    await this.runTestGroup(mediumPriorityTests, results);

    const totalTime = Date.now() - startTime;
    console.log(`✅ All tests completed in ${Math.round(totalTime / 1000)}s`);

    // Generate comprehensive report
    await this.generateComprehensiveReport(results, totalTime);
  }

  private async runTestGroup(testSuites: TestSuite[], results: any[]): Promise<void> {
    for (const suite of testSuites) {
      console.log(`\n🔍 Running: ${suite.name}`);

      for (const browser of suite.browsers) {
        const suiteStart = Date.now();

        try {
          console.log(`  └─ ${browser}: Running...`);

          // Run the test suite
          const command = `npx playwright test "${suite.file}" --project=${browser} --reporter=json --output-dir="${this.resultsDir}/${suite.name.replace(/\s+/g, '-')}-${browser}"`;

          const output = execSync(command, {
            encoding: 'utf8',
            cwd: process.cwd(),
            timeout: suite.expectedDuration * 60 * 1000 // Convert to milliseconds
          });

          const duration = Date.now() - suiteStart;
          console.log(`  └─ ${browser}: ✅ Passed (${Math.round(duration / 1000)}s)`);

          results.push({
            suite: suite.name,
            browser,
            success: true,
            duration,
            errors: []
          });

          // Add performance metrics
          this.addPerformanceMetric(suite.name, browser, duration, true, []);

        } catch (error: any) {
          const duration = Date.now() - suiteStart;
          const errorMessage = error.message || 'Unknown error';

          console.log(`  └─ ${browser}: ❌ Failed (${Math.round(duration / 1000)}s)`);
          console.log(`     Error: ${errorMessage.substring(0, 100)}...`);

          results.push({
            suite: suite.name,
            browser,
            success: false,
            duration,
            errors: [errorMessage]
          });

          // Add failed performance metrics
          this.addPerformanceMetric(suite.name, browser, duration, false, [errorMessage]);
        }
      }
    }
  }

  private addPerformanceMetric(testName: string, browser: string, duration: number, success: boolean, errors: string[]): void {
    const metric: PerformanceMetric = {
      testName,
      duration,
      timestamp: Date.now(),
      browser,
      viewport: { width: 1920, height: 1080 },
      url: '/analytics',
      success,
      errors: errors.length > 0 ? errors : undefined
    };

    performanceReporter.addMetric(metric);
  }

  private async generateComprehensiveReport(results: any[], totalTime: number): Promise<void> {
    console.log('\n📋 Generating Comprehensive Report...');

    // Generate performance report
    const performanceReport = performanceReporter.generateReport();
    performanceReporter.generateHTMLReport(performanceReport);

    // Generate summary report
    const summary = this.generateSummary(results, totalTime);

    // Save summary as JSON
    const summaryPath = path.join(this.resultsDir, 'comprehensive-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // Generate HTML summary
    const htmlSummary = this.generateHTMLSummary(summary, performanceReport);
    const htmlPath = path.join(this.resultsDir, 'comprehensive-report.html');
    fs.writeFileSync(htmlPath, htmlSummary);

    // Generate timeout validation report
    const timeoutReport = this.generateTimeoutValidationReport(results);
    const timeoutPath = path.join(this.resultsDir, 'timeout-validation-report.json');
    fs.writeFileSync(timeoutPath, JSON.stringify(timeoutReport, null, 2));

    console.log(`📊 Reports generated:`);
    console.log(`  - Performance: ${path.join(this.resultsDir, 'performance-reports')}`);
    console.log(`  - Summary: ${summaryPath}`);
    console.log(`  - HTML Report: ${htmlPath}`);
    console.log(`  - Timeout Validation: ${timeoutPath}`);

    // Print quick summary to console
    this.printConsoleSummary(summary);
  }

  private generateSummary(results: any[], totalTime: number): any {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    const byBrowser = results.reduce((acc, result) => {
      if (!acc[result.browser]) {
        acc[result.browser] = { passed: 0, failed: 0, totalDuration: 0 };
      }

      if (result.success) {
        acc[result.browser].passed++;
      } else {
        acc[result.browser].failed++;
      }
      acc[result.browser].totalDuration += result.duration;

      return acc;
    }, {});

    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

    return {
      overview: {
        totalTests,
        passedTests,
        failedTests,
        passRate: Math.round((passedTests / totalTests) * 100),
        totalDuration: totalTime,
        averageTestDuration: Math.round(avgDuration)
      },
      byBrowser,
      detailedResults: results,
      timeoutValidation: {
        testsWithTimeoutErrors: results.filter(r =>
          r.errors.some((e: string) => e.toLowerCase().includes('timeout'))
        ).length,
        expectedTimeoutErrors: 0, // We expect ZERO timeout errors
        timeoutValidationPassed: results.every(r =>
          !r.errors.some((e: string) => e.toLowerCase().includes('loading timeout'))
        )
      },
      generatedAt: new Date().toISOString()
    };
  }

  private generateTimeoutValidationReport(results: any[]): any {
    const timeoutRelatedFailures = results.filter(r =>
      r.errors.some((e: string) => e.toLowerCase().includes('timeout'))
    );

    const loadingTimeoutFailures = results.filter(r =>
      r.errors.some((e: string) => e.toLowerCase().includes('loading timeout'))
    );

    return {
      summary: {
        totalTests: results.length,
        timeoutRelatedFailures: timeoutRelatedFailures.length,
        loadingTimeoutFailures: loadingTimeoutFailures.length,
        timeoutValidationStatus: loadingTimeoutFailures.length === 0 ? 'PASSED' : 'FAILED',
        criticalIssuesFound: loadingTimeoutFailures.length > 0
      },
      details: {
        timeoutRelatedFailures,
        loadingTimeoutFailures,
        recommendedActions: loadingTimeoutFailures.length > 0 ? [
          'Review loading timeout implementation',
          'Check API response times',
          'Verify loading state management',
          'Test network error handling'
        ] : [
          'Timeout validation successful',
          'Continue monitoring in production',
          'Consider performance optimizations for faster loading'
        ]
      },
      validation: {
        passed: loadingTimeoutFailures.length === 0,
        message: loadingTimeoutFailures.length === 0
          ? 'SUCCESS: No "Loading Timeout" messages detected in any test'
          : `FAILURE: ${loadingTimeoutFailures.length} tests still showing "Loading Timeout" messages`
      }
    };
  }

  private generateHTMLSummary(summary: any, performanceReport: any): string {
    const passRate = summary.overview.passRate;
    const statusColor = passRate >= 95 ? '#4CAF50' : passRate >= 80 ? '#ff9800' : '#f44336';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid ${statusColor}; padding-bottom: 10px; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; margin-left: 10px; }
        .success { background-color: #4CAF50; }
        .warning { background-color: #ff9800; }
        .error { background-color: #f44336; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; }
        .summary-card h3 { margin: 0 0 10px 0; color: #555; }
        .summary-card .value { font-size: 24px; font-weight: bold; color: #333; }
        .browser-results { margin: 20px 0; }
        .browser-card { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .timeout-validation { background: ${summary.timeoutValidation.timeoutValidationPassed ? '#e8f5e8' : '#ffe8e8'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${summary.timeoutValidation.timeoutValidationPassed ? '#4CAF50' : '#f44336'}; }
        .test-details { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .test-passed { color: #4CAF50; }
        .test-failed { color: #f44336; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Analytics Comprehensive Test Report
            <span class="status-badge ${passRate >= 95 ? 'success' : passRate >= 80 ? 'warning' : 'error'}">
                ${passRate}% Pass Rate
            </span>
        </h1>

        <div class="timeout-validation">
            <h2>🎯 Timeout Validation Status: ${summary.timeoutValidation.timeoutValidationPassed ? '✅ PASSED' : '❌ FAILED'}</h2>
            <p><strong>Critical Check:</strong> ${summary.timeoutValidation.timeoutValidationPassed
              ? 'No "Loading Timeout" messages detected across all tests!'
              : 'Some tests still show "Loading Timeout" messages - requires attention!'}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${summary.overview.totalTests}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value" style="color: #4CAF50;">${summary.overview.passedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value" style="color: #f44336;">${summary.overview.failedTests}</div>
            </div>
            <div class="summary-card">
                <h3>Total Duration</h3>
                <div class="value">${Math.round(summary.overview.totalDuration / 1000)}s</div>
            </div>
        </div>

        <div class="browser-results">
            <h2>Browser Results</h2>
            ${Object.entries(summary.byBrowser).map(([browser, stats]: [string, any]) => `
                <div class="browser-card">
                    <h3>${browser}</h3>
                    <p>Passed: ${stats.passed} | Failed: ${stats.failed} | Duration: ${Math.round(stats.totalDuration / 1000)}s</p>
                </div>
            `).join('')}
        </div>

        <div class="test-details">
            <h2>Detailed Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Suite</th>
                        <th>Browser</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${summary.detailedResults.map((result: any) => `
                        <tr>
                            <td>${result.suite}</td>
                            <td>${result.browser}</td>
                            <td class="${result.success ? 'test-passed' : 'test-failed'}">
                                ${result.success ? '✅ PASS' : '❌ FAIL'}
                            </td>
                            <td>${Math.round(result.duration / 1000)}s</td>
                            <td>${result.errors.length > 0 ? result.errors[0].substring(0, 100) + '...' : 'No issues'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="recommendations">
            <h3>📋 Key Findings & Recommendations</h3>
            <ul>
                <li><strong>Timeout Validation:</strong> ${summary.timeoutValidation.timeoutValidationPassed ?
                  'SUCCESS - No loading timeout errors detected' :
                  'ATTENTION NEEDED - Loading timeout errors still present'}</li>
                <li><strong>Performance:</strong> Average test duration: ${Math.round(summary.overview.averageTestDuration / 1000)}s</li>
                <li><strong>Browser Compatibility:</strong> ${Object.keys(summary.byBrowser).length} browsers tested</li>
                <li><strong>Overall Health:</strong> ${passRate >= 95 ? 'Excellent' : passRate >= 80 ? 'Good' : 'Needs Improvement'}</li>
            </ul>
        </div>

        <p style="text-align: center; color: #666; margin-top: 40px;">
            Generated on ${new Date(summary.generatedAt).toLocaleString()}
        </p>
    </div>
</body>
</html>
    `;
  }

  private printConsoleSummary(summary: any): void {
    console.log('\n' + '='.repeat(50));
    console.log('📊 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${summary.overview.passedTests}/${summary.overview.totalTests} (${summary.overview.passRate}%)`);
    console.log(`⏱️  Total Duration: ${Math.round(summary.overview.totalDuration / 1000)}s`);
    console.log(`🎯 Timeout Validation: ${summary.timeoutValidation.timeoutValidationPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (summary.timeoutValidation.timeoutValidationPassed) {
      console.log('🎉 SUCCESS: No "Loading Timeout" messages detected!');
    } else {
      console.log('⚠️  WARNING: Some tests still show "Loading Timeout" messages');
    }

    console.log('='.repeat(50));
  }
}

// Export for use in package.json scripts
export { AnalyticsTestRunner };

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new AnalyticsTestRunner();
  runner.runAllTests().catch(console.error);
}
#!/usr/bin/env node

/**
 * White Screen Prevention Test Runner
 *
 * Purpose: Execute all white screen prevention tests and generate comprehensive report
 * This script runs all TDD tests and provides analysis of potential white screen issues
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  errors: string[];
  warnings: string[];
}

interface TestSuiteResult {
  suiteName: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalDuration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

class WhiteScreenTestRunner {
  private results: TestSuiteResult[] = [];
  private startTime: number = Date.now();

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting White Screen Prevention Test Suite...\n');

    const testFiles = [
      'dom-mounting.test.tsx',
      'app-component.test.tsx',
      'import-resolution.test.tsx',
      'error-boundaries.test.tsx',
      'router-validation.test.tsx',
      'hydration-errors.test.tsx',
      'regression-tests.test.tsx',
      'console-validation.test.tsx',
    ];

    for (const testFile of testFiles) {
      await this.runTestFile(testFile);
    }

    this.generateReport();
  }

  private async runTestFile(testFile: string): Promise<void> {
    const suiteName = testFile.replace('.test.tsx', '').replace('-', ' ').toUpperCase();
    console.log(`📋 Running ${suiteName} tests...`);

    try {
      const testPath = join(__dirname, testFile);

      if (!existsSync(testPath)) {
        console.log(`⚠️  Test file not found: ${testFile}`);
        return;
      }

      const startTime = Date.now();

      // Run the test using vitest
      const command = `npx vitest run ${testPath} --reporter=json`;
      const output = execSync(command, {
        encoding: 'utf-8',
        cwd: process.cwd(),
        timeout: 60000
      });

      const duration = Date.now() - startTime;
      const result = this.parseTestOutput(output, suiteName, duration);

      this.results.push(result);

      if (result.failedTests === 0) {
        console.log(`✅ ${suiteName}: ${result.passedTests}/${result.totalTests} tests passed (${duration}ms)`);
      } else {
        console.log(`❌ ${suiteName}: ${result.failedTests}/${result.totalTests} tests failed (${duration}ms)`);
      }

    } catch (error) {
      console.log(`💥 ${suiteName}: Test execution failed`);
      console.error(error.message);

      this.results.push({
        suiteName,
        tests: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 1,
        skippedTests: 0,
        totalDuration: 0,
      });
    }
  }

  private parseTestOutput(output: string, suiteName: string, duration: number): TestSuiteResult {
    try {
      const jsonOutput = JSON.parse(output);

      const tests: TestResult[] = [];
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;
      let skippedTests = 0;

      // Parse vitest JSON output
      if (jsonOutput.testResults) {
        jsonOutput.testResults.forEach((testFile: any) => {
          testFile.assertionResults.forEach((test: any) => {
            totalTests++;

            const testResult: TestResult = {
              name: test.title,
              status: test.status === 'passed' ? 'passed' :
                     test.status === 'skipped' ? 'skipped' : 'failed',
              duration: test.duration || 0,
              errors: test.failureMessages || [],
              warnings: [],
            };

            tests.push(testResult);

            if (testResult.status === 'passed') passedTests++;
            else if (testResult.status === 'failed') failedTests++;
            else if (testResult.status === 'skipped') skippedTests++;
          });
        });
      }

      return {
        suiteName,
        tests,
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        totalDuration: duration,
        coverage: jsonOutput.coverageMap ? this.parseCoverage(jsonOutput.coverageMap) : undefined,
      };

    } catch (parseError) {
      // Fallback parsing for non-JSON output
      return {
        suiteName,
        tests: [],
        totalTests: 1,
        passedTests: output.includes('PASS') ? 1 : 0,
        failedTests: output.includes('FAIL') ? 1 : 0,
        skippedTests: 0,
        totalDuration: duration,
      };
    }
  }

  private parseCoverage(coverageMap: any): { lines: number; functions: number; branches: number; statements: number } {
    // Extract coverage information from coverage map
    let totalLines = 0, coveredLines = 0;
    let totalFunctions = 0, coveredFunctions = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalStatements = 0, coveredStatements = 0;

    Object.values(coverageMap).forEach((file: any) => {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter((count: any) => count > 0).length;
      }
      if (file.f) {
        totalFunctions += Object.keys(file.f).length;
        coveredFunctions += Object.values(file.f).filter((count: any) => count > 0).length;
      }
      if (file.b) {
        totalBranches += Object.keys(file.b).length;
        coveredBranches += Object.values(file.b).filter((branches: any) =>
          branches.some((count: number) => count > 0)
        ).length;
      }
    });

    return {
      lines: totalLines > 0 ? Math.round((coveredLines / totalLines) * 100) : 0,
      functions: totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0,
      branches: totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0,
      statements: totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0,
    };
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;

    const summary = {
      totalSuites: this.results.length,
      totalTests: this.results.reduce((sum, suite) => sum + suite.totalTests, 0),
      totalPassed: this.results.reduce((sum, suite) => sum + suite.passedTests, 0),
      totalFailed: this.results.reduce((sum, suite) => sum + suite.failedTests, 0),
      totalSkipped: this.results.reduce((sum, suite) => sum + suite.skippedTests, 0),
      totalDuration,
      successRate: 0,
    };

    summary.successRate = summary.totalTests > 0
      ? Math.round((summary.totalPassed / summary.totalTests) * 100)
      : 0;

    // Generate console report
    this.printConsoleReport(summary);

    // Generate detailed JSON report
    this.generateJSONReport(summary);

    // Generate HTML report
    this.generateHTMLReport(summary);

    // Generate markdown report
    this.generateMarkdownReport(summary);
  }

  private printConsoleReport(summary: any): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 WHITE SCREEN PREVENTION TEST RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📊 Overall Summary:`);
    console.log(`   Test Suites: ${summary.totalSuites}`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   ✅ Passed: ${summary.totalPassed}`);
    console.log(`   ❌ Failed: ${summary.totalFailed}`);
    console.log(`   ⏭️  Skipped: ${summary.totalSkipped}`);
    console.log(`   🎯 Success Rate: ${summary.successRate}%`);
    console.log(`   ⏱️  Total Duration: ${summary.totalDuration}ms`);

    console.log(`\n📋 Test Suite Breakdown:`);
    this.results.forEach(suite => {
      const status = suite.failedTests === 0 ? '✅' : '❌';
      console.log(`   ${status} ${suite.suiteName}: ${suite.passedTests}/${suite.totalTests} passed`);

      if (suite.coverage) {
        console.log(`      Coverage: ${suite.coverage.statements}% statements, ${suite.coverage.functions}% functions`);
      }
    });

    console.log(`\n🚨 White Screen Risk Assessment:`);
    const riskLevel = this.assessWhiteScreenRisk();
    console.log(`   Risk Level: ${riskLevel.level}`);
    console.log(`   Confidence: ${riskLevel.confidence}%`);

    if (riskLevel.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      riskLevel.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  private assessWhiteScreenRisk(): { level: string; confidence: number; recommendations: string[] } {
    const recommendations: string[] = [];
    let riskScore = 0;

    // Assess based on test results
    const domMountingSuite = this.results.find(s => s.suiteName.includes('DOM MOUNTING'));
    const appComponentSuite = this.results.find(s => s.suiteName.includes('APP COMPONENT'));
    const errorBoundariesSuite = this.results.find(s => s.suiteName.includes('ERROR BOUNDARIES'));

    if (domMountingSuite && domMountingSuite.failedTests > 0) {
      riskScore += 30;
      recommendations.push('Fix DOM mounting issues - critical for preventing white screen');
    }

    if (appComponentSuite && appComponentSuite.failedTests > 0) {
      riskScore += 25;
      recommendations.push('Resolve App component loading issues');
    }

    if (errorBoundariesSuite && errorBoundariesSuite.failedTests > 0) {
      riskScore += 20;
      recommendations.push('Implement proper error boundaries');
    }

    const totalFailures = this.results.reduce((sum, suite) => sum + suite.failedTests, 0);
    if (totalFailures > 5) {
      riskScore += 15;
      recommendations.push('Multiple test failures indicate systemic issues');
    }

    const level = riskScore >= 50 ? 'HIGH' :
                 riskScore >= 25 ? 'MEDIUM' : 'LOW';

    const confidence = Math.min(95, 60 + (this.results.length * 5));

    return { level, confidence, recommendations };
  }

  private generateJSONReport(summary: any): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      results: this.results,
      riskAssessment: this.assessWhiteScreenRisk(),
    };

    const reportPath = join(process.cwd(), 'white-screen-test-results.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 JSON report saved: ${reportPath}`);
  }

  private generateHTMLReport(summary: any): void {
    const riskAssessment = this.assessWhiteScreenRisk();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>White Screen Prevention Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #495057; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .risk-assessment { background: #e9ecef; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
        .risk-level { font-size: 1.2em; font-weight: bold; margin-bottom: 10px; }
        .risk-high { color: #dc3545; }
        .risk-medium { color: #ffc107; }
        .risk-low { color: #28a745; }
        .test-suites { margin-top: 30px; }
        .test-suite { background: #f8f9fa; margin-bottom: 15px; border-radius: 6px; overflow: hidden; }
        .suite-header { background: #343a40; color: white; padding: 15px; font-weight: bold; }
        .suite-body { padding: 15px; }
        .test-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
        .test-item:last-child { border-bottom: none; }
        .recommendations { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin-top: 20px; }
        .recommendations h3 { color: #0c5460; margin-top: 0; }
        .recommendations ul { margin: 0; padding-left: 20px; }
        .recommendations li { margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ White Screen Prevention Test Report</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${summary.totalPassed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${summary.totalFailed}</div>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <div class="value">${summary.successRate}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${summary.totalDuration}ms</div>
            </div>
        </div>

        <div class="risk-assessment">
            <h2>🚨 White Screen Risk Assessment</h2>
            <div class="risk-level risk-${riskAssessment.level.toLowerCase()}">
                Risk Level: ${riskAssessment.level} (${riskAssessment.confidence}% confidence)
            </div>

            ${riskAssessment.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                <ul>
                    ${riskAssessment.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>

        <div class="test-suites">
            <h2>📋 Test Suite Results</h2>
            ${this.results.map(suite => `
                <div class="test-suite">
                    <div class="suite-header">
                        ${suite.failedTests === 0 ? '✅' : '❌'} ${suite.suiteName}
                        (${suite.passedTests}/${suite.totalTests} passed)
                    </div>
                    <div class="suite-body">
                        ${suite.tests.map(test => `
                            <div class="test-item">
                                <span>
                                    ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'}
                                    ${test.name}
                                </span>
                                <span>${test.duration}ms</span>
                            </div>
                        `).join('')}
                        ${suite.coverage ? `
                            <div style="margin-top: 15px; font-size: 0.9em; color: #6c757d;">
                                Coverage: ${suite.coverage.statements}% statements,
                                ${suite.coverage.functions}% functions,
                                ${suite.coverage.branches}% branches
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

    const reportPath = join(process.cwd(), 'white-screen-test-report.html');
    writeFileSync(reportPath, html);
    console.log(`📄 HTML report saved: ${reportPath}`);
  }

  private generateMarkdownReport(summary: any): void {
    const riskAssessment = this.assessWhiteScreenRisk();

    const markdown = `# 🛡️ White Screen Prevention Test Report

Generated on: ${new Date().toLocaleString()}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${summary.totalTests} |
| Passed | ${summary.totalPassed} ✅ |
| Failed | ${summary.totalFailed} ❌ |
| Skipped | ${summary.totalSkipped} ⏭️ |
| Success Rate | ${summary.successRate}% |
| Total Duration | ${summary.totalDuration}ms |

## 🚨 White Screen Risk Assessment

**Risk Level:** ${riskAssessment.level} (${riskAssessment.confidence}% confidence)

${riskAssessment.recommendations.length > 0 ? `
### 💡 Recommendations

${riskAssessment.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}

## 📋 Test Suite Results

${this.results.map(suite => `
### ${suite.failedTests === 0 ? '✅' : '❌'} ${suite.suiteName}

**Results:** ${suite.passedTests}/${suite.totalTests} passed (${suite.totalDuration}ms)

${suite.tests.map(test =>
  `- ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} ${test.name} (${test.duration}ms)`
).join('\n')}

${suite.coverage ? `
**Coverage:** ${suite.coverage.statements}% statements, ${suite.coverage.functions}% functions, ${suite.coverage.branches}% branches
` : ''}
`).join('\n')}

## 🔍 White Screen Prevention Checklist

- [${this.results.find(s => s.suiteName.includes('DOM MOUNTING'))?.failedTests === 0 ? 'x' : ' '}] React DOM mounting works correctly
- [${this.results.find(s => s.suiteName.includes('APP COMPONENT'))?.failedTests === 0 ? 'x' : ' '}] App component loads without errors
- [${this.results.find(s => s.suiteName.includes('IMPORT RESOLUTION'))?.failedTests === 0 ? 'x' : ' '}] All critical imports resolve
- [${this.results.find(s => s.suiteName.includes('ERROR BOUNDARIES'))?.failedTests === 0 ? 'x' : ' '}] Error boundaries catch failures gracefully
- [${this.results.find(s => s.suiteName.includes('ROUTER'))?.failedTests === 0 ? 'x' : ' '}] Router components load properly
- [${this.results.find(s => s.suiteName.includes('HYDRATION'))?.failedTests === 0 ? 'x' : ' '}] No hydration errors detected
- [${this.results.find(s => s.suiteName.includes('REGRESSION'))?.failedTests === 0 ? 'x' : ' '}] Regression tests pass
- [${this.results.find(s => s.suiteName.includes('CONSOLE'))?.failedTests === 0 ? 'x' : ' '}] No critical console errors

---
*This report was generated by the White Screen Prevention Test Suite*
`;

    const reportPath = join(process.cwd(), 'WHITE_SCREEN_PREVENTION_REPORT.md');
    writeFileSync(reportPath, markdown);
    console.log(`📄 Markdown report saved: ${reportPath}`);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  const runner = new WhiteScreenTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default WhiteScreenTestRunner;
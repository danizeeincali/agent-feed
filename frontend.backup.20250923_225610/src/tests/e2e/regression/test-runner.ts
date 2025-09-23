#!/usr/bin/env node

/**
 * Comprehensive E2E Regression Test Runner
 * 
 * Runs all Claude Instance Management regression tests and provides detailed reporting
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  totalDuration: number;
  passCount: number;
  failCount: number;
  skipCount: number;
}

interface RegressionTestReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    playwrightVersion: string;
    browser: string;
  };
  suites: TestSuite[];
  overall: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  regressionChecks: {
    whiteScreenPrevention: boolean;
    websocketSseMigration: boolean;
    instanceStatusSync: boolean;
    errorRecovery: boolean;
    performanceBaselines: boolean;
  };
}

class RegressionTestRunner {
  private testSuites: string[] = [
    'claude-instance-management.spec.ts',
    'claude-instance-performance.spec.ts', 
    'claude-instance-error-scenarios.spec.ts'
  ];

  private baseDir = path.join(__dirname);
  private reportsDir = path.join(__dirname, '../reports');

  async runAllTests(): Promise<RegressionTestReport> {
    console.log('🚀 Starting Claude Instance Management E2E Regression Tests');
    console.log('=' .repeat(70));
    
    const startTime = Date.now();
    const report: RegressionTestReport = {
      timestamp: new Date().toISOString(),
      environment: await this.getEnvironmentInfo(),
      suites: [],
      overall: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      regressionChecks: {
        whiteScreenPrevention: false,
        websocketSseMigration: false,
        instanceStatusSync: false,
        errorRecovery: false,
        performanceBaselines: false
      }
    };

    // Ensure reports directory exists
    await this.ensureReportsDir();

    // Check if servers are running
    await this.checkPrerequisites();

    // Run each test suite
    for (const testSuite of this.testSuites) {
      console.log(`\n📋 Running test suite: ${testSuite}`);
      console.log('-'.repeat(50));
      
      const suiteResult = await this.runTestSuite(testSuite);
      report.suites.push(suiteResult);
      
      // Update overall stats
      report.overall.totalTests += suiteResult.results.length;
      report.overall.passed += suiteResult.passCount;
      report.overall.failed += suiteResult.failCount;
      report.overall.skipped += suiteResult.skipCount;
    }

    const endTime = Date.now();
    report.overall.duration = endTime - startTime;

    // Analyze regression checks
    report.regressionChecks = await this.analyzeRegressionChecks(report);

    // Generate and save report
    await this.generateReport(report);
    
    // Print summary
    this.printSummary(report);

    return report;
  }

  private async getEnvironmentInfo() {
    try {
      const { stdout: nodeVersion } = await execAsync('node --version');
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../package.json'), 'utf8'));
      const playwrightVersion = packageJson.devDependencies?.['@playwright/test'] || 'unknown';
      
      return {
        nodeVersion: nodeVersion.trim(),
        playwrightVersion,
        browser: 'chromium' // Default browser for tests
      };
    } catch (error) {
      return {
        nodeVersion: 'unknown',
        playwrightVersion: 'unknown',
        browser: 'chromium'
      };
    }
  }

  private async checkPrerequisites(): Promise<void> {
    console.log('🔍 Checking prerequisites...');
    
    // Check if backend is running
    try {
      const response = await fetch('http://localhost:3333/health');
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      console.log('✅ Backend server is running');
    } catch (error) {
      console.log('❌ Backend server not responding. Please start with: npm run dev');
      throw error;
    }

    // Check if frontend is running  
    try {
      const response = await fetch('http://localhost:3000');
      if (!response.ok) {
        throw new Error(`Frontend health check failed: ${response.status}`);
      }
      console.log('✅ Frontend server is running');
    } catch (error) {
      console.log('❌ Frontend server not responding. Please start with: cd frontend && npm run dev');
      throw error;
    }
  }

  private async runTestSuite(testSuite: string): Promise<TestSuite> {
    const suitePath = path.join(this.baseDir, testSuite);
    const suiteStartTime = Date.now();
    
    const result: TestSuite = {
      name: testSuite,
      results: [],
      totalDuration: 0,
      passCount: 0,
      failCount: 0,
      skipCount: 0
    };

    try {
      // Run Playwright tests with JSON reporter
      const command = `npx playwright test "${suitePath}" --reporter=json --timeout=60000`;
      console.log(`Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: path.join(__dirname, '../../../'),
        timeout: 300000 // 5 minutes timeout
      });

      // Parse JSON output
      if (stdout) {
        try {
          const playwrightResults = JSON.parse(stdout);
          result.results = this.parsePlaywrightResults(playwrightResults);
        } catch (parseError) {
          console.log('⚠️ Failed to parse test results, using stderr output');
          result.results = this.parseTextResults(stderr);
        }
      }

    } catch (error: any) {
      console.log(`❌ Test suite failed: ${error.message}`);
      
      // Try to extract results from error output
      if (error.stdout) {
        try {
          const playwrightResults = JSON.parse(error.stdout);
          result.results = this.parsePlaywrightResults(playwrightResults);
        } catch {
          result.results = this.parseTextResults(error.stderr || error.message);
        }
      }
    }

    const suiteEndTime = Date.now();
    result.totalDuration = suiteEndTime - suiteStartTime;
    
    // Calculate counts
    result.passCount = result.results.filter(r => r.status === 'passed').length;
    result.failCount = result.results.filter(r => r.status === 'failed').length;
    result.skipCount = result.results.filter(r => r.status === 'skipped').length;

    console.log(`📊 Suite Results: ${result.passCount} passed, ${result.failCount} failed, ${result.skipCount} skipped`);
    
    return result;
  }

  private parsePlaywrightResults(playwrightOutput: any): TestResult[] {
    const results: TestResult[] = [];
    
    if (playwrightOutput.suites) {
      for (const suite of playwrightOutput.suites) {
        if (suite.specs) {
          for (const spec of suite.specs) {
            if (spec.tests) {
              for (const test of spec.tests) {
                results.push({
                  name: test.title || 'Unknown Test',
                  status: this.mapPlaywrightStatus(test.outcome),
                  duration: test.duration || 0,
                  error: test.error?.message
                });
              }
            }
          }
        }
      }
    }
    
    return results;
  }

  private parseTextResults(textOutput: string): TestResult[] {
    const results: TestResult[] = [];
    
    // Simple parsing of text output for basic results
    const lines = textOutput.split('\n');
    
    for (const line of lines) {
      if (line.includes('✓') || line.includes('passed')) {
        results.push({
          name: line.trim(),
          status: 'passed',
          duration: 0
        });
      } else if (line.includes('✗') || line.includes('failed')) {
        results.push({
          name: line.trim(),
          status: 'failed',
          duration: 0,
          error: 'Test failed (details in full output)'
        });
      }
    }
    
    return results;
  }

  private mapPlaywrightStatus(outcome: string): 'passed' | 'failed' | 'skipped' {
    switch (outcome) {
      case 'expected':
      case 'passed':
        return 'passed';
      case 'unexpected':
      case 'failed':
        return 'failed';
      case 'skipped':
        return 'skipped';
      default:
        return 'failed';
    }
  }

  private async analyzeRegressionChecks(report: RegressionTestReport) {
    const checks = {
      whiteScreenPrevention: false,
      websocketSseMigration: false,
      instanceStatusSync: false,
      errorRecovery: false,
      performanceBaselines: false
    };

    // Analyze test results to determine if regression checks passed
    for (const suite of report.suites) {
      for (const result of suite.results) {
        const testName = result.name.toLowerCase();
        
        if (testName.includes('white screen') && result.status === 'passed') {
          checks.whiteScreenPrevention = true;
        }
        
        if (testName.includes('websocket') || testName.includes('sse migration')) {
          if (result.status === 'passed') {
            checks.websocketSseMigration = true;
          }
        }
        
        if (testName.includes('instance status') && result.status === 'passed') {
          checks.instanceStatusSync = true;
        }
        
        if (testName.includes('error recovery') && result.status === 'passed') {
          checks.errorRecovery = true;
        }
        
        if (testName.includes('performance') && result.status === 'passed') {
          checks.performanceBaselines = true;
        }
      }
    }

    return checks;
  }

  private async ensureReportsDir(): Promise<void> {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  private async generateReport(report: RegressionTestReport): Promise<void> {
    const reportPath = path.join(this.reportsDir, `regression-test-report-${Date.now()}.json`);
    const htmlReportPath = path.join(this.reportsDir, `regression-test-report-${Date.now()}.html`);
    
    // Save JSON report
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 JSON report saved to: ${reportPath}`);
    
    // Generate HTML report
    const htmlContent = this.generateHtmlReport(report);
    fs.writeFileSync(htmlReportPath, htmlContent);
    console.log(`🌐 HTML report saved to: ${htmlReportPath}`);
  }

  private generateHtmlReport(report: RegressionTestReport): string {
    const passRate = ((report.overall.passed / report.overall.totalTests) * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Claude Instance Management - E2E Regression Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e3f2fd; padding: 15px; border-radius: 5px; text-align: center; }
        .suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #f9f9f9; padding: 10px; font-weight: bold; }
        .test-result { padding: 8px; border-bottom: 1px solid #eee; }
        .passed { color: green; }
        .failed { color: red; }
        .skipped { color: orange; }
        .regression-checks { background: #f0f8ff; padding: 15px; border-radius: 5px; }
        .check { margin: 5px 0; }
        .check.passed::before { content: "✅ "; }
        .check.failed::before { content: "❌ "; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Claude Instance Management - E2E Regression Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: Node ${report.environment.nodeVersion}, Playwright ${report.environment.playwrightVersion}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <div style="font-size: 2em;">${report.overall.totalTests}</div>
        </div>
        <div class="metric">
            <h3>Pass Rate</h3>
            <div style="font-size: 2em; color: ${report.overall.failed === 0 ? 'green' : 'orange'};">${passRate}%</div>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <div style="font-size: 2em;">${Math.round(report.overall.duration / 1000)}s</div>
        </div>
    </div>

    <div class="regression-checks">
        <h2>🔍 Regression Checks</h2>
        <div class="check ${report.regressionChecks.whiteScreenPrevention ? 'passed' : 'failed'}">
            White Screen Prevention
        </div>
        <div class="check ${report.regressionChecks.websocketSseMigration ? 'passed' : 'failed'}">
            WebSocket → SSE Migration
        </div>
        <div class="check ${report.regressionChecks.instanceStatusSync ? 'passed' : 'failed'}">
            Instance Status Synchronization
        </div>
        <div class="check ${report.regressionChecks.errorRecovery ? 'passed' : 'failed'}">
            Error Recovery Mechanisms
        </div>
        <div class="check ${report.regressionChecks.performanceBaselines ? 'passed' : 'failed'}">
            Performance Baselines
        </div>
    </div>

    <h2>📋 Test Suite Results</h2>
    ${report.suites.map(suite => `
        <div class="suite">
            <div class="suite-header">
                ${suite.name} - ${suite.passCount}/${suite.results.length} passed (${Math.round(suite.totalDuration / 1000)}s)
            </div>
            ${suite.results.map(result => `
                <div class="test-result ${result.status}">
                    <strong>${result.name}</strong> - ${result.status}
                    ${result.duration > 0 ? ` (${result.duration}ms)` : ''}
                    ${result.error ? `<br><small>Error: ${result.error}</small>` : ''}
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  private printSummary(report: RegressionTestReport): void {
    console.log('\n' + '='.repeat(70));
    console.log('🎯 REGRESSION TEST SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`📊 Overall Results:`);
    console.log(`   Total Tests: ${report.overall.totalTests}`);
    console.log(`   Passed: ${report.overall.passed} ✅`);
    console.log(`   Failed: ${report.overall.failed} ${report.overall.failed > 0 ? '❌' : ''}`);
    console.log(`   Skipped: ${report.overall.skipped} ${report.overall.skipped > 0 ? '⏭️' : ''}`);
    console.log(`   Duration: ${Math.round(report.overall.duration / 1000)}s`);
    console.log(`   Pass Rate: ${((report.overall.passed / report.overall.totalTests) * 100).toFixed(1)}%`);
    
    console.log(`\n🔍 Regression Checks:`);
    Object.entries(report.regressionChecks).forEach(([check, passed]) => {
      const icon = passed ? '✅' : '❌';
      const status = passed ? 'PASSED' : 'FAILED';
      console.log(`   ${icon} ${check}: ${status}`);
    });

    if (report.overall.failed > 0) {
      console.log(`\n❌ ${report.overall.failed} tests failed. Check detailed report for more information.`);
      process.exit(1);
    } else {
      console.log(`\n🎉 All tests passed! Claude Instance Management is regression-free.`);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new RegressionTestRunner();
  runner.runAllTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export default RegressionTestRunner;
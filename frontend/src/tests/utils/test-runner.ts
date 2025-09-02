/**
 * Automated Test Execution Pipeline
 * Orchestrates all test suites for the SSE migration
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_TEST_CONFIG, TEST_SCENARIOS } from '../config/sse-migration-test-config';

export interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  errors: string[];
}

export interface TestSuite {
  name: string;
  command: string;
  args: string[];
  timeout: number;
  dependencies: string[];
  retries: number;
}

export class TestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Unit Tests',
      command: 'npm',
      args: ['run', 'test:unit'],
      timeout: 60000,
      dependencies: [],
      retries: 2,
    },
    {
      name: 'Integration Tests',
      command: 'npm',
      args: ['run', 'test:integration'],
      timeout: 120000,
      dependencies: ['Unit Tests'],
      retries: 2,
    },
    {
      name: 'Performance Tests',
      command: 'npm',
      args: ['run', 'test:performance'],
      timeout: 180000,
      dependencies: ['Unit Tests'],
      retries: 1,
    },
    {
      name: 'E2E Tests',
      command: 'npm',
      args: ['run', 'test:e2e'],
      timeout: 300000,
      dependencies: ['Unit Tests', 'Integration Tests'],
      retries: 3,
    },
    {
      name: 'Regression Tests',
      command: 'npm',
      args: ['run', 'test:regression'],
      timeout: 240000,
      dependencies: ['Unit Tests', 'Integration Tests'],
      retries: 2,
    },
  ];

  private results: Map<string, TestResult> = new Map();
  private startTime: number = 0;

  async runAllTests(): Promise<TestResult[]> {
    this.startTime = Date.now();
    console.log('🚀 Starting SSE Migration Test Pipeline');
    
    await this.setupTestEnvironment();
    
    // Run tests in dependency order
    const executionOrder = this.calculateExecutionOrder();
    
    for (const suiteName of executionOrder) {
      const suite = this.testSuites.find(s => s.name === suiteName)!;
      
      console.log(`\n📋 Running ${suite.name}...`);
      const result = await this.runTestSuite(suite);
      this.results.set(suite.name, result);
      
      if (result.failed > 0 && this.shouldStopOnFailure(suite.name)) {
        console.log(`❌ ${suite.name} failed, stopping pipeline`);
        break;
      }
    }
    
    await this.generateReport();
    return Array.from(this.results.values());
  }

  async runSpecificSuite(suiteName: string): Promise<TestResult> {
    const suite = this.testSuites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Test suite "${suiteName}" not found`);
    }
    
    await this.setupTestEnvironment();
    return this.runTestSuite(suite);
  }

  async runTestSuite(suite: TestSuite): Promise<TestResult> {
    let attempt = 0;
    let lastResult: TestResult;
    
    do {
      attempt++;
      console.log(`  Attempt ${attempt}/${suite.retries + 1}`);
      
      lastResult = await this.executeTestSuite(suite);
      
      if (lastResult.failed === 0 || attempt > suite.retries) {
        break;
      }
      
      console.log(`  ⚠️ ${lastResult.failed} tests failed, retrying...`);
      await this.delay(2000 * attempt); // Exponential backoff
      
    } while (attempt <= suite.retries);
    
    return lastResult;
  }

  private async executeTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const process = spawn(suite.command, suite.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' },
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
        // Show real-time output for long-running tests
        if (suite.timeout > 120000) {
          process.stdout.write(data);
        }
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        resolve({
          suite: suite.name,
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: Date.now() - startTime,
          errors: ['Test suite timed out'],
        });
      }, suite.timeout);
      
      process.on('close', (code) => {
        clearTimeout(timeout);
        
        const result = this.parseTestOutput(suite.name, stdout, stderr, code);
        result.duration = Date.now() - startTime;
        
        resolve(result);
      });
    });
  }

  private parseTestOutput(suiteName: string, stdout: string, stderr: string, exitCode: number | null): TestResult {
    const result: TestResult = {
      suite: suiteName,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: [],
    };
    
    // Parse Vitest output
    const vitestMatch = stdout.match(/Tests?\s+(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/i);
    if (vitestMatch) {
      result.passed = parseInt(vitestMatch[1], 10);
      result.failed = parseInt(vitestMatch[2], 10);
      result.skipped = parseInt(vitestMatch[3], 10);
    }
    
    // Parse Jest output
    const jestMatch = stdout.match(/Tests:\s*(\d+)\s*failed[,\s]*(\d+)\s*passed[,\s]*(\d+)\s*total/i);
    if (jestMatch) {
      result.failed = parseInt(jestMatch[1], 10);
      result.passed = parseInt(jestMatch[2], 10) - result.failed;
      result.skipped = parseInt(jestMatch[3], 10) - result.passed - result.failed;
    }
    
    // Parse Playwright output
    const playwrightMatch = stdout.match(/(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/i);
    if (playwrightMatch) {
      result.passed = parseInt(playwrightMatch[1], 10);
      result.failed = parseInt(playwrightMatch[2], 10);
      result.skipped = parseInt(playwrightMatch[3], 10);
    }
    
    // Parse coverage information
    const coverageMatch = stdout.match(/All files\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/);
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4]),
      };
    }
    
    // Extract errors
    if (stderr) {
      result.errors.push(stderr);
    }
    
    if (exitCode !== 0 && result.failed === 0) {
      result.failed = 1;
      result.errors.push(`Process exited with code ${exitCode}`);
    }
    
    return result;
  }

  private calculateExecutionOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    
    const visit = (suiteName: string) => {
      if (visited.has(suiteName)) return;
      
      const suite = this.testSuites.find(s => s.name === suiteName);
      if (!suite) return;
      
      // Visit dependencies first
      for (const dep of suite.dependencies) {
        visit(dep);
      }
      
      visited.add(suiteName);
      order.push(suiteName);
    };
    
    // Visit all suites
    for (const suite of this.testSuites) {
      visit(suite.name);
    }
    
    return order;
  }

  private shouldStopOnFailure(suiteName: string): boolean {
    // Stop on unit test failures (foundational)
    // Continue on E2E failures (can be flaky)
    const criticalSuites = ['Unit Tests', 'Integration Tests'];
    return criticalSuites.includes(suiteName);
  }

  private async setupTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up test environment...');
    
    // Ensure test directories exist
    const testDirs = [
      'src/tests/coverage',
      'src/tests/reports',
      'src/tests/screenshots',
      'src/tests/artifacts',
    ];
    
    for (const dir of testDirs) {
      const fullPath = path.join(process.cwd(), 'frontend', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    
    // Clean up old artifacts
    await this.cleanupOldArtifacts();
    
    // Verify test dependencies
    await this.verifyTestDependencies();
  }

  private async cleanupOldArtifacts(): Promise<void> {
    const artifactDirs = [
      'frontend/src/tests/coverage',
      'frontend/src/tests/screenshots',
      'frontend/playwright-report',
      'frontend/test-results',
    ];
    
    for (const dir of artifactDirs) {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }

  private async verifyTestDependencies(): Promise<void> {
    const requiredFiles = [
      'frontend/package.json',
      'frontend/vitest.config.ts',
      'frontend/playwright.config.js',
    ];
    
    for (const file of requiredFiles) {
      const fullPath = path.join(process.cwd(), file);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Required test file not found: ${file}`);
      }
    }
  }

  private async generateReport(): Promise<void> {
    const reportPath = path.join(process.cwd(), 'frontend/src/tests/reports/test-pipeline-report.json');
    const htmlReportPath = path.join(process.cwd(), 'frontend/src/tests/reports/test-pipeline-report.html');
    
    const totalDuration = Date.now() - this.startTime;
    const allResults = Array.from(this.results.values());
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalDuration,
      totalTests: allResults.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: allResults.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: allResults.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: allResults.reduce((sum, r) => sum + r.skipped, 0),
      suites: allResults,
      config: DEFAULT_TEST_CONFIG,
      scenarios: Object.keys(TEST_SCENARIOS),
    };
    
    // JSON report
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    
    // HTML report
    const htmlReport = this.generateHTMLReport(summary);
    fs.writeFileSync(htmlReportPath, htmlReport);
    
    // Console summary
    this.printSummary(summary);
    
    console.log(`\n📊 Reports generated:`);
    console.log(`  JSON: ${reportPath}`);
    console.log(`  HTML: ${htmlReportPath}`);
  }

  private generateHTMLReport(summary: any): string {
    const passRate = ((summary.totalPassed / (summary.totalPassed + summary.totalFailed)) * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>SSE Migration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .suite { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .coverage { margin-top: 10px; }
        .progress-bar { width: 100%; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 20px; background: #28a745; text-align: center; line-height: 20px; color: white; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🧪 SSE Migration Test Report</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Generated:</strong> ${summary.timestamp}</p>
        <p><strong>Total Duration:</strong> ${(summary.totalDuration / 1000).toFixed(2)}s</p>
        <p><strong>Pass Rate:</strong> ${passRate}%</p>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${passRate}%">${passRate}%</div>
        </div>
        
        <table style="margin-top: 15px;">
            <tr>
                <td><span class="passed">✅ Passed:</span> ${summary.totalPassed}</td>
                <td><span class="failed">❌ Failed:</span> ${summary.totalFailed}</td>
                <td><span class="skipped">⏭️ Skipped:</span> ${summary.totalSkipped}</td>
                <td><strong>Total:</strong> ${summary.totalTests}</td>
            </tr>
        </table>
    </div>
    
    <h2>Test Suites</h2>
    ${summary.suites.map((suite: any) => `
        <div class="suite">
            <h3>${suite.suite}</h3>
            <p>
                <span class="passed">Passed: ${suite.passed}</span> | 
                <span class="failed">Failed: ${suite.failed}</span> | 
                <span class="skipped">Skipped: ${suite.skipped}</span> | 
                Duration: ${(suite.duration / 1000).toFixed(2)}s
            </p>
            
            ${suite.coverage ? `
                <div class="coverage">
                    <strong>Coverage:</strong>
                    Statements: ${suite.coverage.statements}% | 
                    Branches: ${suite.coverage.branches}% | 
                    Functions: ${suite.coverage.functions}% | 
                    Lines: ${suite.coverage.lines}%
                </div>
            ` : ''}
            
            ${suite.errors.length > 0 ? `
                <div style="margin-top: 10px;">
                    <strong>Errors:</strong>
                    <pre style="background: #f8f8f8; padding: 10px; border-radius: 3px; overflow-x: auto;">${suite.errors.join('\n')}</pre>
                </div>
            ` : ''}
        </div>
    `).join('')}
    
    <h2>Configuration</h2>
    <pre style="background: #f8f8f8; padding: 15px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(summary.config, null, 2)}</pre>
    
    <h2>Test Scenarios</h2>
    <ul>
        ${summary.scenarios.map((scenario: string) => `<li>${scenario}</li>`).join('')}
    </ul>
    
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
        Generated by SSE Migration Test Pipeline on ${new Date().toLocaleString()}
    </footer>
</body>
</html>
    `.trim();
  }

  private printSummary(summary: any): void {
    const passRate = ((summary.totalPassed / (summary.totalPassed + summary.totalFailed)) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 SSE MIGRATION TEST PIPELINE SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    console.log(`📊 Pass Rate: ${passRate}%`);
    console.log(`✅ Passed: ${summary.totalPassed}`);
    console.log(`❌ Failed: ${summary.totalFailed}`);
    console.log(`⏭️  Skipped: ${summary.totalSkipped}`);
    console.log(`📝 Total Tests: ${summary.totalTests}`);
    
    console.log('\n📋 Suite Results:');
    for (const suite of summary.suites) {
      const status = suite.failed === 0 ? '✅' : '❌';
      const duration = (suite.duration / 1000).toFixed(1);
      console.log(`  ${status} ${suite.suite}: ${suite.passed}P/${suite.failed}F/${suite.skipped}S (${duration}s)`);
    }
    
    if (summary.totalFailed > 0) {
      console.log('\n❌ PIPELINE FAILED');
      console.log('Review the detailed report for error information');
    } else {
      console.log('\n✅ PIPELINE PASSED');
      console.log('All tests completed successfully!');
    }
    
    console.log('='.repeat(60));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
export async function runTestPipeline(options: { suite?: string; config?: any } = {}) {
  const runner = new TestRunner();
  
  try {
    if (options.suite) {
      console.log(`Running specific test suite: ${options.suite}`);
      const result = await runner.runSpecificSuite(options.suite);
      console.log(result);
      process.exit(result.failed > 0 ? 1 : 0);
    } else {
      console.log('Running full test pipeline');
      const results = await runner.runAllTests();
      const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
      process.exit(totalFailed > 0 ? 1 : 0);
    }
  } catch (error) {
    console.error('❌ Test pipeline failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { TestRunner };
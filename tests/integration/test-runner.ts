/**
 * Integration Test Runner
 * Orchestrates execution of all integration tests with proper setup and teardown
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface TestSuite {
  name: string;
  path: string;
  description: string;
  timeout?: number;
  dependencies?: string[];
  parallel?: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

interface TestRunnerConfig {
  parallel: boolean;
  timeout: number;
  retries: number;
  verbose: boolean;
  coverage: boolean;
  outputDir: string;
}

class IntegrationTestRunner {
  private config: TestRunnerConfig;
  private testSuites: TestSuite[];
  private results: TestResult[] = [];

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = {
      parallel: false,
      timeout: 30000,
      retries: 1,
      verbose: true,
      coverage: false,
      outputDir: path.join(process.cwd(), 'test-results'),
      ...config
    };

    this.testSuites = this.loadTestSuites();
  }

  private loadTestSuites(): TestSuite[] {
    return [
      {
        name: 'Mock Server Tests',
        path: './mock-servers/mock-api-server.test.ts',
        description: 'Tests for mock server functionality',
        timeout: 15000
      },
      {
        name: 'Avi Streaming Chat API',
        path: './api-endpoints/avi-streaming-chat.test.ts',
        description: 'Integration tests for Avi chat API endpoint',
        timeout: 30000,
        dependencies: ['Mock Server Tests']
      },
      {
        name: 'Claude Code Streaming Chat API',
        path: './api-endpoints/claude-code-streaming-chat.test.ts',
        description: 'Integration tests for Claude Code API endpoint',
        timeout: 45000,
        dependencies: ['Mock Server Tests']
      },
      {
        name: 'Streaming Ticker SSE',
        path: './api-endpoints/streaming-ticker-sse.test.ts',
        description: 'Integration tests for Server-Sent Events',
        timeout: 60000,
        dependencies: ['Mock Server Tests']
      },
      {
        name: 'WebSocket Connections',
        path: './api-endpoints/websocket-connections.test.ts',
        description: 'Integration tests for WebSocket functionality',
        timeout: 90000,
        dependencies: ['Mock Server Tests']
      },
      {
        name: 'Comprehensive API Validation',
        path: './api-endpoints/comprehensive-validation.test.ts',
        description: 'Schema validation, performance, and security tests',
        timeout: 120000,
        dependencies: ['Avi Streaming Chat API', 'Claude Code Streaming Chat API']
      },
      {
        name: 'SDK Integration Tests',
        path: './sdk-functionality/avi-sdk-integration.test.ts',
        description: 'Frontend SDK component integration tests',
        timeout: 45000,
        dependencies: ['Avi Streaming Chat API'],
        parallel: false // UI tests should run sequentially
      }
    ];
  }

  private async ensureOutputDirectory(): Promise<void> {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();

    if (this.config.verbose) {
      console.log(`\n🧪 Running: ${suite.name}`);
      console.log(`📝 Description: ${suite.description}`);
      console.log(`📁 Path: ${suite.path}`);
    }

    try {
      // Check dependencies
      if (suite.dependencies) {
        const missingDeps = suite.dependencies.filter(dep =>
          !this.results.some(r => r.suite === dep && r.passed)
        );

        if (missingDeps.length > 0) {
          throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
        }
      }

      // Construct Jest command
      const jestArgs = [
        '--testPathPattern=' + suite.path.replace(/\\/g, '/'),
        '--verbose',
        '--detectOpenHandles',
        '--forceExit',
        '--maxWorkers=1', // Ensure sequential execution for integration tests
        `--testTimeout=${suite.timeout || this.config.timeout}`
      ];

      if (this.config.coverage) {
        jestArgs.push('--coverage', '--coverageDirectory=' + path.join(this.config.outputDir, 'coverage'));
      }

      // Run the test
      const command = `npx jest ${jestArgs.join(' ')}`;

      if (this.config.verbose) {
        console.log(`🚀 Command: ${command}`);
      }

      const output = execSync(command, {
        cwd: path.dirname(__dirname), // Run from tests directory
        encoding: 'utf8',
        timeout: suite.timeout || this.config.timeout,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          CI: 'true' // Ensure consistent test environment
        }
      });

      const duration = Date.now() - startTime;
      const result: TestResult = {
        suite: suite.name,
        passed: true,
        duration,
        output
      };

      if (this.config.verbose) {
        console.log(`✅ ${suite.name} completed in ${duration}ms`);
      }

      return result;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        suite: suite.name,
        passed: false,
        duration,
        output: error.stdout || '',
        error: error.stderr || error.message
      };

      if (this.config.verbose) {
        console.log(`❌ ${suite.name} failed after ${duration}ms`);
        console.log(`Error: ${error.message}`);
      }

      return result;
    }
  }

  private async runTestSuiteWithRetries(suite: TestSuite): Promise<TestResult> {
    let lastResult: TestResult;

    for (let attempt = 1; attempt <= this.config.retries + 1; attempt++) {
      if (this.config.verbose && attempt > 1) {
        console.log(`🔄 Retry attempt ${attempt - 1} for ${suite.name}`);
      }

      lastResult = await this.runTestSuite(suite);

      if (lastResult.passed) {
        return lastResult;
      }

      if (attempt <= this.config.retries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return lastResult!;
  }

  private generateReport(): void {
    const reportPath = path.join(this.config.outputDir, 'integration-test-report.json');
    const htmlReportPath = path.join(this.config.outputDir, 'integration-test-report.html');

    const summary = {
      timestamp: new Date().toISOString(),
      config: this.config,
      totalSuites: this.testSuites.length,
      passedSuites: this.results.filter(r => r.passed).length,
      failedSuites: this.results.filter(r => !r.passed).length,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      results: this.results
    };

    // JSON Report
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    // HTML Report
    const htmlContent = this.generateHtmlReport(summary);
    fs.writeFileSync(htmlReportPath, htmlContent);

    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  private generateHtmlReport(summary: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; margin-bottom: 20px; }
        .metric { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center; flex: 1; }
        .metric.passed { border-color: #4caf50; }
        .metric.failed { border-color: #f44336; }
        .test-suite { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .test-suite.passed { border-color: #4caf50; background: #f8fff8; }
        .test-suite.failed { border-color: #f44336; background: #fff8f8; }
        .status { font-weight: bold; }
        .status.passed { color: #4caf50; }
        .status.failed { color: #f44336; }
        .output { background: #f5f5f5; padding: 10px; border-radius: 3px; margin-top: 10px; font-family: monospace; font-size: 12px; max-height: 300px; overflow-y: auto; }
        .error { background: #ffebee; border: 1px solid #f44336; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Integration Test Report</h1>
        <p><strong>Generated:</strong> ${summary.timestamp}</p>
        <p><strong>Total Duration:</strong> ${Math.round(summary.totalDuration / 1000)}s</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Suites</h3>
            <div style="font-size: 24px; font-weight: bold;">${summary.totalSuites}</div>
        </div>
        <div class="metric passed">
            <h3>Passed</h3>
            <div style="font-size: 24px; font-weight: bold; color: #4caf50;">${summary.passedSuites}</div>
        </div>
        <div class="metric failed">
            <h3>Failed</h3>
            <div style="font-size: 24px; font-weight: bold; color: #f44336;">${summary.failedSuites}</div>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <div style="font-size: 24px; font-weight: bold;">${Math.round((summary.passedSuites / summary.totalSuites) * 100)}%</div>
        </div>
    </div>

    <h2>Test Suite Results</h2>
    ${summary.results.map((result: TestResult) => `
        <div class="test-suite ${result.passed ? 'passed' : 'failed'}">
            <h3>${result.suite} <span class="status ${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASSED' : 'FAILED'}</span></h3>
            <p><strong>Duration:</strong> ${Math.round(result.duration / 1000)}s</p>

            ${result.output ? `
                <details>
                    <summary>Test Output</summary>
                    <div class="output">${result.output.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </details>
            ` : ''}

            ${result.error ? `
                <details open>
                    <summary>Error Details</summary>
                    <div class="output error">${result.error.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                </details>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  private printSummary(): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;
    const duration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n' + '='.repeat(60));
    console.log('🧪 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Total Suites: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Duration: ${Math.round(duration / 1000)}s`);
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\n❌ Failed Test Suites:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   • ${r.suite}: ${r.error || 'Unknown error'}`);
        });
    }
  }

  public async run(): Promise<boolean> {
    console.log('🚀 Starting Integration Test Suite');
    console.log(`📁 Output Directory: ${this.config.outputDir}`);
    console.log(`⚙️  Configuration:`, this.config);

    await this.ensureOutputDirectory();

    const startTime = Date.now();

    try {
      if (this.config.parallel) {
        // Run tests in parallel (be careful with this for integration tests)
        console.log('🔄 Running tests in parallel...');
        const promises = this.testSuites.map(suite => this.runTestSuiteWithRetries(suite));
        this.results = await Promise.all(promises);
      } else {
        // Run tests sequentially (recommended for integration tests)
        console.log('🔄 Running tests sequentially...');
        for (const suite of this.testSuites) {
          const result = await this.runTestSuiteWithRetries(suite);
          this.results.push(result);

          // Stop on first failure if configured
          if (!result.passed && process.env.FAIL_FAST === 'true') {
            console.log('💥 Stopping on first failure (FAIL_FAST=true)');
            break;
          }
        }
      }

      const totalDuration = Date.now() - startTime;
      console.log(`\n⏱️  Total execution time: ${Math.round(totalDuration / 1000)}s`);

      this.generateReport();
      this.printSummary();

      const allPassed = this.results.every(r => r.passed);

      if (allPassed) {
        console.log('\n🎉 All integration tests passed!');
      } else {
        console.log('\n💥 Some integration tests failed!');
      }

      return allPassed;

    } catch (error) {
      console.error('\n💥 Test runner error:', error);
      return false;
    }
  }
}

// CLI execution
if (require.main === module) {
  const config: Partial<TestRunnerConfig> = {
    verbose: process.env.VERBOSE !== 'false',
    parallel: process.env.PARALLEL === 'true',
    coverage: process.env.COVERAGE === 'true',
    retries: parseInt(process.env.RETRIES || '1'),
    timeout: parseInt(process.env.TIMEOUT || '30000'),
    outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'test-results')
  };

  const runner = new IntegrationTestRunner(config);

  runner.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Runner failed:', error);
    process.exit(1);
  });
}

export default IntegrationTestRunner;
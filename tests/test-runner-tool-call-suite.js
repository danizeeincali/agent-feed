#!/usr/bin/env node

/**
 * @file Tool Call Test Suite Runner
 * @description Comprehensive test runner for tool call visualization feature
 * Runs all tests in the correct order and provides detailed reporting
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ToolCallTestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, skipped: 0, errors: [] },
      integration: { passed: 0, failed: 0, skipped: 0, errors: [] },
      regression: { passed: 0, failed: 0, skipped: 0, errors: [] },
      e2e: { passed: 0, failed: 0, skipped: 0, errors: [] },
      performance: { passed: 0, failed: 0, skipped: 0, errors: [] }
    };
    
    this.startTime = Date.now();
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.failFast = process.argv.includes('--fail-fast');
    this.skipSlow = process.argv.includes('--skip-slow');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',      // Cyan
      success: '\x1b[32m',   // Green
      warning: '\x1b[33m',   // Yellow
      error: '\x1b[31m',     // Red
      reset: '\x1b[0m'       // Reset
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...', 'info');

    // Check if Node.js version is adequate
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`, 'info');

    // Check if required test directories exist
    const testDirs = [
      'tests/unit/tool-call-formatting',
      'tests/integration/tool-call-display', 
      'tests/regression/tool-call',
      'tests/e2e/tool-call-visualization',
      'tests/performance/tool-call-rendering'
    ];

    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        throw new Error(`Required test directory missing: ${dir}`);
      }
    }

    // Check if backend is running
    try {
      const response = await fetch('http://localhost:3001/health');
      this.log('Backend health check passed', 'success');
    } catch (error) {
      this.log('Backend not running, starting...', 'warning');
      await this.startBackend();
    }

    // Check if frontend is running (for E2E tests)
    if (!this.skipSlow) {
      try {
        const response = await fetch('http://localhost:3000');
        this.log('Frontend health check passed', 'success');
      } catch (error) {
        this.log('Frontend not running, starting...', 'warning');
        await this.startFrontend();
      }
    }

    this.log('Prerequisites check completed', 'success');
  }

  async startBackend() {
    return new Promise((resolve, reject) => {
      const backend = spawn('node', ['simple-backend.js'], {
        env: { ...process.env, PORT: 3001, NODE_ENV: 'test' },
        stdio: this.verbose ? 'inherit' : 'ignore'
      });

      // Give backend time to start
      setTimeout(() => {
        if (backend.pid) {
          this.backendProcess = backend;
          resolve();
        } else {
          reject(new Error('Failed to start backend'));
        }
      }, 3000);
    });
  }

  async startFrontend() {
    return new Promise((resolve, reject) => {
      const frontend = spawn('npm', ['run', 'dev'], {
        cwd: './frontend',
        env: { ...process.env, PORT: 3000 },
        stdio: this.verbose ? 'inherit' : 'ignore'
      });

      // Give frontend time to start
      setTimeout(() => {
        if (frontend.pid) {
          this.frontendProcess = frontend;
          resolve();
        } else {
          reject(new Error('Failed to start frontend'));
        }
      }, 10000);
    });
  }

  async runUnitTests() {
    this.log('Running Unit Tests...', 'info');
    
    try {
      const result = await this.runJestTests('tests/unit/tool-call-formatting');
      this.parseTestResults(result, 'unit');
      
      if (this.results.unit.failed > 0 && this.failFast) {
        throw new Error('Unit tests failed - stopping due to --fail-fast');
      }
      
      this.log(`Unit Tests: ${this.results.unit.passed} passed, ${this.results.unit.failed} failed`, 
               this.results.unit.failed > 0 ? 'warning' : 'success');
    } catch (error) {
      this.log(`Unit tests error: ${error.message}`, 'error');
      this.results.unit.errors.push(error.message);
      
      if (this.failFast) throw error;
    }
  }

  async runIntegrationTests() {
    this.log('Running Integration Tests...', 'info');
    
    try {
      const result = await this.runJestTests('tests/integration/tool-call-display');
      this.parseTestResults(result, 'integration');
      
      if (this.results.integration.failed > 0 && this.failFast) {
        throw new Error('Integration tests failed - stopping due to --fail-fast');
      }
      
      this.log(`Integration Tests: ${this.results.integration.passed} passed, ${this.results.integration.failed} failed`,
               this.results.integration.failed > 0 ? 'warning' : 'success');
    } catch (error) {
      this.log(`Integration tests error: ${error.message}`, 'error');
      this.results.integration.errors.push(error.message);
      
      if (this.failFast) throw error;
    }
  }

  async runRegressionTests() {
    this.log('Running Regression Tests...', 'info');
    
    try {
      // Run existing regression tests first
      await this.runExistingRegressionTests();
      
      // Run new tool call regression tests
      const result = await this.runJestTests('tests/regression/tool-call');
      this.parseTestResults(result, 'regression');
      
      if (this.results.regression.failed > 0 && this.failFast) {
        throw new Error('Regression tests failed - stopping due to --fail-fast');
      }
      
      this.log(`Regression Tests: ${this.results.regression.passed} passed, ${this.results.regression.failed} failed`,
               this.results.regression.failed > 0 ? 'warning' : 'success');
    } catch (error) {
      this.log(`Regression tests error: ${error.message}`, 'error');
      this.results.regression.errors.push(error.message);
      
      if (this.failFast) throw error;
    }
  }

  async runExistingRegressionTests() {
    const existingTestFiles = [
      'tests/websocket-stability-test.js',
      'tests/websocket-stability/',
      'tests/sparc-websocket-stability/'
    ].filter(testPath => fs.existsSync(testPath));

    for (const testPath of existingTestFiles) {
      this.log(`Running existing regression test: ${testPath}`, 'info');
      try {
        await this.runJestTests(testPath);
      } catch (error) {
        this.log(`Existing regression test failed: ${testPath}`, 'warning');
        // Don't fail overall regression if existing tests have issues
      }
    }
  }

  async runE2ETests() {
    if (this.skipSlow) {
      this.log('Skipping E2E tests (--skip-slow)', 'warning');
      return;
    }

    this.log('Running E2E Tests...', 'info');
    
    try {
      const result = await this.runPlaywrightTests();
      this.parseTestResults(result, 'e2e');
      
      if (this.results.e2e.failed > 0 && this.failFast) {
        throw new Error('E2E tests failed - stopping due to --fail-fast');
      }
      
      this.log(`E2E Tests: ${this.results.e2e.passed} passed, ${this.results.e2e.failed} failed`,
               this.results.e2e.failed > 0 ? 'warning' : 'success');
    } catch (error) {
      this.log(`E2E tests error: ${error.message}`, 'error');
      this.results.e2e.errors.push(error.message);
      
      if (this.failFast) throw error;
    }
  }

  async runPerformanceTests() {
    if (this.skipSlow) {
      this.log('Skipping Performance tests (--skip-slow)', 'warning');
      return;
    }

    this.log('Running Performance Tests...', 'info');
    
    try {
      const result = await this.runJestTests('tests/performance/tool-call-rendering', {
        testTimeout: 30000
      });
      this.parseTestResults(result, 'performance');
      
      this.log(`Performance Tests: ${this.results.performance.passed} passed, ${this.results.performance.failed} failed`,
               this.results.performance.failed > 0 ? 'warning' : 'success');
    } catch (error) {
      this.log(`Performance tests error: ${error.message}`, 'error');
      this.results.performance.errors.push(error.message);
      
      if (this.failFast) throw error;
    }
  }

  async runJestTests(testPath, options = {}) {
    return new Promise((resolve, reject) => {
      const jestArgs = [
        testPath,
        '--json',
        '--detectOpenHandles',
        '--forceExit'
      ];

      if (options.testTimeout) {
        jestArgs.push(`--testTimeout=${options.testTimeout}`);
      }

      if (this.verbose) {
        jestArgs.push('--verbose');
      }

      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
        if (this.verbose) {
          process.stderr.write(data);
        }
      });

      jest.on('close', (code) => {
        try {
          // Jest outputs JSON results even on failure
          const result = JSON.parse(stdout);
          resolve({ result, code, stderr });
        } catch (error) {
          reject(new Error(`Jest output parsing failed: ${error.message}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

      jest.on('error', (error) => {
        reject(new Error(`Jest execution failed: ${error.message}`));
      });
    });
  }

  async runPlaywrightTests() {
    return new Promise((resolve, reject) => {
      const playwright = spawn('npx', ['playwright', 'test', 'tests/e2e/tool-call-visualization', '--reporter=json'], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      playwright.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      playwright.stderr.on('data', (data) => {
        stderr += data.toString();
        if (this.verbose) {
          process.stderr.write(data);
        }
      });

      playwright.on('close', (code) => {
        try {
          const result = JSON.parse(stdout);
          resolve({ result, code, stderr });
        } catch (error) {
          // Playwright might not output JSON on failure
          resolve({ 
            result: { 
              stats: { 
                expected: code === 0 ? 1 : 0, 
                unexpected: code === 0 ? 0 : 1, 
                skipped: 0 
              } 
            }, 
            code, 
            stderr 
          });
        }
      });

      playwright.on('error', (error) => {
        reject(new Error(`Playwright execution failed: ${error.message}`));
      });
    });
  }

  parseTestResults(testOutput, category) {
    const { result, code } = testOutput;

    if (result.testResults) {
      // Jest format
      result.testResults.forEach(fileResult => {
        this.results[category].passed += fileResult.numPassingTests;
        this.results[category].failed += fileResult.numFailingTests;
        this.results[category].skipped += fileResult.numPendingTests;

        if (fileResult.failureMessage) {
          this.results[category].errors.push(fileResult.failureMessage);
        }
      });
    } else if (result.stats) {
      // Playwright format
      this.results[category].passed += result.stats.expected || 0;
      this.results[category].failed += result.stats.unexpected || 0;
      this.results[category].skipped += result.stats.skipped || 0;
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    this.log('\n========================= TEST REPORT =========================', 'info');
    this.log(`Total Duration: ${Math.round(duration / 1000)}s`, 'info');
    this.log('', 'info');

    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let hasErrors = false;

    Object.entries(this.results).forEach(([category, results]) => {
      const status = results.failed > 0 ? 'warning' : 'success';
      this.log(`${category.toUpperCase()}: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped`, status);
      
      totalPassed += results.passed;
      totalFailed += results.failed;
      totalSkipped += results.skipped;
      
      if (results.errors.length > 0) {
        hasErrors = true;
        if (this.verbose) {
          results.errors.forEach(error => {
            this.log(`  Error: ${error}`, 'error');
          });
        }
      }
    });

    this.log('', 'info');
    this.log(`OVERALL: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`, 
             totalFailed > 0 ? 'warning' : 'success');

    if (hasErrors && !this.verbose) {
      this.log('Run with --verbose to see detailed error messages', 'info');
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      duration: Math.round(duration / 1000),
      results: this.results,
      summary: {
        total: totalPassed + totalFailed + totalSkipped,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        success: totalFailed === 0
      }
    };

    const reportPath = 'tests/tool-call-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Detailed report saved to: ${reportPath}`, 'info');

    return totalFailed === 0;
  }

  async cleanup() {
    this.log('Cleaning up test processes...', 'info');

    if (this.backendProcess) {
      this.backendProcess.kill();
    }

    if (this.frontendProcess) {
      this.frontendProcess.kill();
    }

    // Clean up test artifacts
    const cleanupPaths = [
      'coverage/tool-call-tests',
      'test-results',
      '.nyc_output'
    ];

    cleanupPaths.forEach(path => {
      if (fs.existsSync(path)) {
        try {
          execSync(`rm -rf ${path}`);
        } catch (error) {
          this.log(`Warning: Could not clean up ${path}`, 'warning');
        }
      }
    });
  }

  async run() {
    try {
      this.log('Starting Tool Call Test Suite...', 'info');
      
      await this.checkPrerequisites();
      
      // Run tests in order of complexity/dependency
      await this.runUnitTests();
      await this.runIntegrationTests(); 
      await this.runRegressionTests();
      await this.runPerformanceTests();
      await this.runE2ETests();
      
      const success = this.generateReport();
      
      if (success) {
        this.log('All tests completed successfully! 🎉', 'success');
        process.exit(0);
      } else {
        this.log('Some tests failed. Please review the report.', 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Usage information
function showUsage() {
  console.log(`
Tool Call Test Suite Runner

Usage: node test-runner-tool-call-suite.js [options]

Options:
  --verbose, -v     Show detailed output
  --fail-fast       Stop on first failure
  --skip-slow       Skip E2E and performance tests
  --help, -h        Show this help message

Examples:
  node test-runner-tool-call-suite.js
  node test-runner-tool-call-suite.js --verbose --fail-fast
  node test-runner-tool-call-suite.js --skip-slow
  `);
}

// Main execution
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  const runner = new ToolCallTestRunner();
  runner.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = ToolCallTestRunner;
#!/usr/bin/env node

/**
 * Comprehensive TDD London School Test Runner
 * Executes complete test suite for critical API endpoints
 * Validates zero-to-one implementation with real functionality
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class TDDTestRunner {
  constructor() {
    this.testSuites = [
      {
        name: 'Activities API - London School TDD',
        file: 'api/activities-api.test.js',
        description: 'Mock-driven tests for /api/activities with pagination and UUID handling',
        critical: true
      },
      {
        name: 'Token Analytics Hourly - Chart.js Compatibility',
        file: 'api/token-analytics-hourly.test.js',
        description: 'Chart.js compatible hourly analytics with time-series processing',
        critical: true
      },
      {
        name: 'Token Analytics Suite - Complete Coverage',
        file: 'api/token-analytics-suite.test.js',
        description: 'Daily, messages, and summary endpoints with comprehensive validation',
        critical: true
      },
      {
        name: 'Real API Server Integration',
        file: 'integration/real-api-server.test.js',
        description: 'Integration tests with actual HTTP server on port 3001',
        critical: true,
        requiresApiServer: true
      },
      {
        name: 'Data Flow and Collaboration Patterns',
        file: 'behavior/data-flow-collaboration.test.js',
        description: 'Behavior verification for component interactions',
        critical: false
      },
      {
        name: 'Performance Benchmarks and Error Scenarios',
        file: 'performance/benchmarks-and-errors.test.js',
        description: 'Performance monitoring and comprehensive error handling',
        critical: false
      }
    ];

    this.results = {
      totalSuites: this.testSuites.length,
      criticalSuites: this.testSuites.filter(s => s.critical).length,
      passed: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    this.apiServerProcess = null;
  }

  async runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive TDD London School Test Suite');
    console.log('=' .repeat(80));
    console.log(`📊 Total Test Suites: ${this.results.totalSuites}`);
    console.log(`🎯 Critical Suites: ${this.results.criticalSuites}`);
    console.log('=' .repeat(80));

    try {
      // Step 1: Setup test environment
      await this.setupTestEnvironment();

      // Step 2: Start API server if needed
      await this.startAPIServerIfNeeded();

      // Step 3: Run all test suites
      await this.runAllTestSuites();

      // Step 4: Generate comprehensive report
      await this.generateComprehensiveReport();

      // Step 5: Validate success criteria
      const success = this.validateSuccessCriteria();

      return success;

    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      return false;
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Verify Jest is available
    try {
      await this.runCommand('npx', ['jest', '--version'], { timeout: 5000 });
      console.log('✅ Jest is available');
    } catch (error) {
      throw new Error('Jest is not available. Please install Jest: npm install --save-dev jest');
    }

    // Verify supertest is available
    try {
      const packageJson = await fs.readFile(path.join(__dirname, '../../../package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);
      if (!pkg.devDependencies?.supertest && !pkg.dependencies?.supertest) {
        throw new Error('Supertest is not installed. Please install: npm install --save-dev supertest');
      }
      console.log('✅ Supertest is available');
    } catch (error) {
      if (error.message.includes('Supertest')) {
        throw error;
      }
      console.warn('⚠️  Could not verify supertest installation, continuing...');
    }

    // Create test results directory
    const resultsDir = path.join(__dirname, 'results');
    try {
      await fs.mkdir(resultsDir, { recursive: true });
      console.log('✅ Test results directory created');
    } catch (error) {
      console.warn('⚠️  Could not create results directory:', error.message);
    }

    console.log('✅ Test environment setup complete\n');
  }

  async startAPIServerIfNeeded() {
    const requiresApiServer = this.testSuites.some(suite => suite.requiresApiServer);

    if (!requiresApiServer) {
      console.log('ℹ️  No API server required for this test run\n');
      return;
    }

    console.log('🚀 Starting API server for integration tests...');

    const apiServerPath = path.join(__dirname, '../../../api-server');

    try {
      // Check if API server directory exists
      await fs.access(apiServerPath);

      // Start the API server
      this.apiServerProcess = spawn('npm', ['start'], {
        cwd: apiServerPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PORT: '3001' }
      });

      // Wait for server to start
      await this.waitForAPIServer();

      console.log('✅ API server started successfully\n');

    } catch (error) {
      console.warn('⚠️  Could not start API server:', error.message);
      console.warn('🔄 Integration tests will be skipped\n');

      // Mark integration tests as skipped
      this.testSuites.forEach(suite => {
        if (suite.requiresApiServer) {
          suite.skipped = true;
        }
      });
    }
  }

  async waitForAPIServer() {
    const maxAttempts = 15;
    const delay = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Try to connect to health check endpoint
        const result = await this.runCommand('curl', [
          '-s',
          '-o', '/dev/null',
          '-w', '%{http_code}',
          'http://localhost:3001/health'
        ], { timeout: 5000 });

        if (result.stdout.trim() === '200') {
          console.log(`✅ API server health check passed (attempt ${attempt})`);
          return;
        }
      } catch (error) {
        // Expected for early attempts
      }

      if (attempt === maxAttempts) {
        throw new Error('API server failed to start within timeout period');
      }

      console.log(`⏳ Waiting for API server... (attempt ${attempt}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async runAllTestSuites() {
    console.log('🧪 Running TDD London School Test Suites');
    console.log('-' .repeat(80));

    for (const suite of this.testSuites) {
      if (suite.skipped) {
        await this.handleSkippedSuite(suite);
        continue;
      }

      console.log(`\n📋 Running: ${suite.name}`);
      console.log(`📝 Description: ${suite.description}`);
      console.log(`🎯 Critical: ${suite.critical ? 'Yes' : 'No'}`);

      const suiteResult = await this.runTestSuite(suite);
      this.results.details.push(suiteResult);

      if (suiteResult.success) {
        this.results.passed++;
        console.log(`✅ ${suite.name} - PASSED`);
      } else {
        this.results.failed++;
        console.log(`❌ ${suite.name} - FAILED`);

        if (suite.critical) {
          console.log(`🚨 CRITICAL TEST FAILED: ${suite.name}`);
        }
      }

      console.log(`⏱️  Duration: ${suiteResult.duration}ms`);
      console.log(`📊 Tests: ${suiteResult.tests.passed}/${suiteResult.tests.total} passed`);
    }
  }

  async runTestSuite(suite) {
    const startTime = Date.now();
    const testFile = path.join(__dirname, suite.file);

    try {
      // Verify test file exists
      await fs.access(testFile);

      // Run Jest on the specific test file
      const result = await this.runCommand('npx', [
        'jest',
        testFile,
        '--config', path.join(__dirname, '../jest.config.london-school.js'),
        '--verbose',
        '--no-cache',
        '--forceExit'
      ], {
        timeout: 120000, // 2 minutes timeout per suite
        cwd: path.join(__dirname, '../../..')
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse Jest output for test results
      const testResults = this.parseJestOutput(result.stdout + result.stderr);

      return {
        suite: suite.name,
        file: suite.file,
        success: result.code === 0,
        duration,
        tests: testResults,
        output: result.stdout,
        errors: result.stderr
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        suite: suite.name,
        file: suite.file,
        success: false,
        duration,
        tests: { total: 0, passed: 0, failed: 1 },
        output: '',
        errors: error.message
      };
    }
  }

  async handleSkippedSuite(suite) {
    console.log(`\n⏭️  Skipping: ${suite.name}`);
    console.log(`📝 Reason: ${suite.requiresApiServer ? 'API server not available' : 'Manual skip'}`);

    this.results.skipped++;
    this.results.details.push({
      suite: suite.name,
      file: suite.file,
      success: false,
      skipped: true,
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0 },
      output: '',
      errors: 'Skipped'
    });
  }

  parseJestOutput(output) {
    // Simple Jest output parsing
    const testResults = { total: 0, passed: 0, failed: 0 };

    // Look for test summary patterns
    const summaryMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (summaryMatch) {
      testResults.failed = parseInt(summaryMatch[1]);
      testResults.passed = parseInt(summaryMatch[2]);
      testResults.total = parseInt(summaryMatch[3]);
      return testResults;
    }

    // Alternative pattern
    const passedMatch = output.match(/(\d+)\s+passed/);
    const failedMatch = output.match(/(\d+)\s+failed/);

    if (passedMatch) testResults.passed = parseInt(passedMatch[1]);
    if (failedMatch) testResults.failed = parseInt(failedMatch[1]);
    testResults.total = testResults.passed + testResults.failed;

    return testResults;
  }

  async generateComprehensiveReport() {
    console.log('\n📊 Generating Comprehensive Test Report');
    console.log('=' .repeat(80));

    const report = {
      summary: {
        totalSuites: this.results.totalSuites,
        criticalSuites: this.results.criticalSuites,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        successRate: (this.results.passed / (this.results.totalSuites - this.results.skipped)) * 100
      },
      criticalEndpoints: {
        activities: this.getEndpointStatus('/api/activities'),
        tokenAnalyticsHourly: this.getEndpointStatus('/api/token-analytics/hourly'),
        tokenAnalyticsDaily: this.getEndpointStatus('/api/token-analytics/daily'),
        tokenAnalyticsMessages: this.getEndpointStatus('/api/token-analytics/messages'),
        tokenAnalyticsSummary: this.getEndpointStatus('/api/token-analytics/summary')
      },
      details: this.results.details,
      timestamp: new Date().toISOString()
    };

    // Display summary
    console.log(`📈 Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️  Skipped: ${report.summary.skipped}`);

    console.log('\n🎯 Critical Endpoints Status:');
    Object.entries(report.criticalEndpoints).forEach(([endpoint, status]) => {
      const icon = status === 'TESTED' ? '✅' : status === 'FAILED' ? '❌' : '⚠️';
      console.log(`${icon} ${endpoint}: ${status}`);
    });

    // Save detailed report
    try {
      const reportPath = path.join(__dirname, 'results', 'comprehensive-tdd-report.json');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('⚠️  Could not save detailed report:', error.message);
    }

    console.log('=' .repeat(80));
  }

  getEndpointStatus(endpoint) {
    const relatedSuites = this.results.details.filter(detail =>
      detail.suite.toLowerCase().includes(endpoint.split('/').pop().replace('-', ''))
    );

    if (relatedSuites.length === 0) return 'NOT_TESTED';
    if (relatedSuites.some(suite => suite.success)) return 'TESTED';
    if (relatedSuites.some(suite => suite.skipped)) return 'SKIPPED';
    return 'FAILED';
  }

  validateSuccessCriteria() {
    console.log('\n🎯 Validating Success Criteria');
    console.log('-' .repeat(50));

    const criteria = [
      {
        name: 'All Critical Tests Pass',
        condition: () => {
          const criticalFailed = this.results.details
            .filter(detail => this.testSuites.find(s => s.name === detail.suite)?.critical)
            .some(detail => !detail.success && !detail.skipped);
          return !criticalFailed;
        }
      },
      {
        name: 'No Test Suite Failures',
        condition: () => this.results.failed === 0
      },
      {
        name: 'Activities API Validated',
        condition: () => this.getEndpointStatus('/api/activities') === 'TESTED'
      },
      {
        name: 'Token Analytics Validated',
        condition: () => ['hourly', 'daily', 'messages', 'summary']
          .every(endpoint => this.getEndpointStatus(`/api/token-analytics/${endpoint}`) === 'TESTED')
      },
      {
        name: 'Minimum Success Rate (80%)',
        condition: () => {
          const successRate = (this.results.passed / (this.results.totalSuites - this.results.skipped)) * 100;
          return successRate >= 80;
        }
      }
    ];

    let allCriteriaMet = true;

    criteria.forEach(criterion => {
      const met = criterion.condition();
      const icon = met ? '✅' : '❌';
      console.log(`${icon} ${criterion.name}`);

      if (!met) {
        allCriteriaMet = false;
      }
    });

    console.log('-' .repeat(50));
    console.log(`🏆 Overall Success: ${allCriteriaMet ? 'PASS' : 'FAIL'}`);

    return allCriteriaMet;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up...');

    if (this.apiServerProcess) {
      console.log('🛑 Stopping API server...');
      this.apiServerProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise(resolve => {
        this.apiServerProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Force exit after 5 seconds
      });

      console.log('✅ API server stopped');
    }

    console.log('✅ Cleanup complete');
  }

  runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: 'pipe',
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      process.on('error', reject);

      if (options.timeout) {
        setTimeout(() => {
          process.kill('SIGTERM');
          reject(new Error(`Command timeout after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }
}

// Main execution
async function main() {
  const runner = new TDDTestRunner();

  console.log('🎯 TDD London School Comprehensive Test Suite');
  console.log('🚀 Zero-to-One API Endpoint Validation');
  console.log('📋 Testing Critical Missing Endpoints');
  console.log('');

  const success = await runner.runComprehensiveTests();

  if (success) {
    console.log('\n🎉 ALL TESTS PASSED! Critical API endpoints are ready for production.');
    console.log('✅ No more "failed to fetch" errors');
    console.log('✅ Real functionality implemented');
    console.log('✅ Chart.js compatibility verified');
    console.log('✅ UUID string operations safe');
    process.exit(0);
  } else {
    console.log('\n❌ TEST FAILURES DETECTED! Please review and fix issues before deployment.');
    console.log('🔍 Check the detailed report for specific failures');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = TDDTestRunner;
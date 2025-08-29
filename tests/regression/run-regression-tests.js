#!/usr/bin/env node

/**
 * TDD London School Regression Test Runner
 * 
 * Comprehensive test execution with:
 * - Coverage reporting
 * - Performance metrics
 * - Failure analysis
 * - CI/CD integration
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class RegressionTestRunner {
  constructor() {
    this.testDir = __dirname;
    this.rootDir = path.resolve(__dirname, '../..');
    this.results = {
      startTime: Date.now(),
      endTime: null,
      duration: null,
      tests: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      coverage: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0
      },
      performance: {
        slowestTests: [],
        averageTestTime: 0
      },
      errors: []
    };
  }

  async run() {
    console.log('🚀 Starting TDD London School Regression Test Suite');
    console.log('=' .repeat(60));
    console.log(`Test Directory: ${this.testDir}`);
    console.log(`Root Directory: ${this.rootDir}`);
    console.log('=' .repeat(60));

    try {
      await this.validateEnvironment();
      await this.runTests();
      await this.generateReports();
      await this.analyzeResults();
    } catch (error) {
      console.error('❌ Test runner failed:', error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating test environment...');
    
    // Check if Jest is available
    try {
      require('jest');
      console.log('✅ Jest is available');
    } catch (error) {
      console.log('⚠️ Jest not found, installing...');
      await this.installDependencies();
    }

    // Check test files exist
    const testFiles = [
      'claude-process-spawning.test.js',
      'working-directory-resolution.test.js',
      'authentication-flow.test.js',
      'sse-integration.test.js',
      'error-handling.test.js'
    ];

    for (const file of testFiles) {
      const filePath = path.join(this.testDir, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Test file not found: ${file}`);
      }
      console.log(`✅ Found test file: ${file}`);
    }

    console.log('✅ Environment validation complete');
  }

  async installDependencies() {
    return new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', 'jest', 'jest-junit', 'jest-html-reporters', '--save-dev'], {
        cwd: this.rootDir,
        stdio: 'inherit'
      });

      npm.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
  }

  async runTests() {
    console.log('🧪 Running regression tests...');
    
    const jestArgs = [
      '--config', path.join(this.testDir, 'jest.config.js'),
      '--rootDir', this.testDir,
      '--coverage',
      '--verbose',
      '--json',
      '--outputFile', path.join(this.testDir, 'test-results', 'results.json')
    ];

    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', ...jestArgs], {
        cwd: this.rootDir,
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });

      jest.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });

      jest.on('close', (code) => {
        this.results.endTime = Date.now();
        this.results.duration = this.results.endTime - this.results.startTime;

        if (code === 0) {
          console.log('✅ All tests passed!');
          resolve({ code, stdout, stderr });
        } else {
          console.log(`⚠️ Tests completed with exit code ${code}`);
          resolve({ code, stdout, stderr }); // Don't reject, we want to analyze results
        }
      });

      jest.on('error', (error) => {
        reject(error);
      });
    });
  }

  async generateReports() {
    console.log('📊 Generating test reports...');

    // Ensure test-results directory exists
    const resultsDir = path.join(this.testDir, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    try {
      // Read Jest JSON output if available
      const resultsPath = path.join(resultsDir, 'results.json');
      if (fs.existsSync(resultsPath)) {
        const jestResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        this.parseJestResults(jestResults);
      }

      // Generate summary report
      await this.generateSummaryReport();
      
      // Generate performance report
      await this.generatePerformanceReport();
      
      console.log('✅ Reports generated successfully');
    } catch (error) {
      console.error('⚠️ Error generating reports:', error.message);
    }
  }

  parseJestResults(jestResults) {
    this.results.tests.total = jestResults.numTotalTests || 0;
    this.results.tests.passed = jestResults.numPassedTests || 0;
    this.results.tests.failed = jestResults.numFailedTests || 0;
    this.results.tests.skipped = jestResults.numPendingTests || 0;

    // Extract performance data
    if (jestResults.testResults) {
      const testTimes = [];
      
      jestResults.testResults.forEach(testFile => {
        if (testFile.assertionResults) {
          testFile.assertionResults.forEach(test => {
            if (test.duration) {
              testTimes.push({
                name: test.title,
                file: testFile.name,
                duration: test.duration
              });
            }
          });
        }
      });

      // Sort by duration and get slowest tests
      testTimes.sort((a, b) => b.duration - a.duration);
      this.results.performance.slowestTests = testTimes.slice(0, 10);
      
      if (testTimes.length > 0) {
        this.results.performance.averageTestTime = 
          testTimes.reduce((sum, test) => sum + test.duration, 0) / testTimes.length;
      }
    }

    // Extract errors
    if (jestResults.testResults) {
      jestResults.testResults.forEach(testFile => {
        if (testFile.message) {
          this.results.errors.push({
            file: testFile.name,
            message: testFile.message
          });
        }
      });
    }
  }

  async generateSummaryReport() {
    const summary = {
      timestamp: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        workingDirectory: process.cwd()
      },
      execution: {
        startTime: new Date(this.results.startTime).toISOString(),
        endTime: this.results.endTime ? new Date(this.results.endTime).toISOString() : null,
        durationMs: this.results.duration,
        durationFormatted: this.formatDuration(this.results.duration)
      },
      results: this.results.tests,
      performance: this.results.performance,
      status: this.results.tests.failed === 0 ? 'PASSED' : 'FAILED',
      criticalRegression: this.detectCriticalRegression()
    };

    const summaryPath = path.join(this.testDir, 'test-results', 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('📋 Test Summary:');
    console.log(`   Status: ${summary.status}`);
    console.log(`   Total Tests: ${summary.results.total}`);
    console.log(`   Passed: ${summary.results.passed}`);
    console.log(`   Failed: ${summary.results.failed}`);
    console.log(`   Skipped: ${summary.results.skipped}`);
    console.log(`   Duration: ${summary.execution.durationFormatted}`);
    console.log(`   Average Test Time: ${Math.round(summary.performance.averageTestTime)}ms`);
  }

  async generatePerformanceReport() {
    const performance = {
      timestamp: new Date().toISOString(),
      totalDuration: this.results.duration,
      averageTestTime: this.results.performance.averageTestTime,
      slowestTests: this.results.performance.slowestTests,
      recommendations: this.generatePerformanceRecommendations()
    };

    const performancePath = path.join(this.testDir, 'test-results', 'performance.json');
    fs.writeFileSync(performancePath, JSON.stringify(performance, null, 2));

    if (performance.slowestTests.length > 0) {
      console.log('⏱️  Slowest Tests:');
      performance.slowestTests.slice(0, 5).forEach((test, index) => {
        console.log(`   ${index + 1}. ${test.name} - ${test.duration}ms`);
      });
    }
  }

  generatePerformanceRecommendations() {
    const recommendations = [];
    
    if (this.results.performance.averageTestTime > 100) {
      recommendations.push({
        type: 'performance',
        message: 'Average test time exceeds 100ms. Consider optimizing mocks and test setup.',
        priority: 'medium'
      });
    }

    if (this.results.performance.slowestTests.length > 0) {
      const slowest = this.results.performance.slowestTests[0];
      if (slowest.duration > 1000) {
        recommendations.push({
          type: 'performance',
          message: `Slowest test "${slowest.name}" takes ${slowest.duration}ms. Consider breaking into smaller tests.`,
          priority: 'high'
        });
      }
    }

    return recommendations;
  }

  detectCriticalRegression() {
    const criticalTests = [
      'should spawn prod button WITHOUT --print flag (CRITICAL)',
      'should resolve prod button to /workspaces/agent-feed/prod (CRITICAL)',
      'should detect authentication via credentials file (CRITICAL)',
      'should establish SSE connection with correct headers (CRITICAL)'
    ];

    return this.results.errors.some(error => 
      criticalTests.some(test => error.message?.includes(test))
    );
  }

  async analyzeResults() {
    console.log('🔍 Analyzing test results...');

    const analysis = {
      timestamp: new Date().toISOString(),
      passRate: this.results.tests.total > 0 ? 
        (this.results.tests.passed / this.results.tests.total * 100).toFixed(2) : 0,
      criticalRegression: this.detectCriticalRegression(),
      recommendations: [],
      nextSteps: []
    };

    // Generate recommendations based on results
    if (this.results.tests.failed > 0) {
      analysis.recommendations.push({
        type: 'failure',
        message: `${this.results.tests.failed} test(s) failed. Review test output and fix regressions.`,
        priority: 'high'
      });
    }

    if (analysis.criticalRegression) {
      analysis.recommendations.push({
        type: 'critical',
        message: 'Critical regression detected in core Claude process functionality!',
        priority: 'critical'
      });
      
      analysis.nextSteps.push('Stop deployment pipeline');
      analysis.nextSteps.push('Review failed critical tests');
      analysis.nextSteps.push('Fix Claude process spawning issues');
    }

    if (parseFloat(analysis.passRate) < 95) {
      analysis.recommendations.push({
        type: 'quality',
        message: 'Test pass rate below 95%. Investigate failing tests.',
        priority: 'high'
      });
    }

    const analysisPath = path.join(this.testDir, 'test-results', 'analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

    console.log('📊 Analysis Results:');
    console.log(`   Pass Rate: ${analysis.passRate}%`);
    console.log(`   Critical Regression: ${analysis.criticalRegression ? 'YES' : 'NO'}`);
    
    if (analysis.recommendations.length > 0) {
      console.log('   Recommendations:');
      analysis.recommendations.forEach(rec => {
        console.log(`     ${rec.priority.toUpperCase()}: ${rec.message}`);
      });
    }

    // Exit with appropriate code
    const exitCode = this.results.tests.failed === 0 && !analysis.criticalRegression ? 0 : 1;
    console.log(`\n${exitCode === 0 ? '✅' : '❌'} Test suite completed with exit code ${exitCode}`);
    process.exit(exitCode);
  }

  formatDuration(ms) {
    if (!ms) return '0ms';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else if (seconds > 0) {
      return `${seconds}s`;
    } else {
      return `${ms}ms`;
    }
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new RegressionTestRunner();
  runner.run().catch(console.error);
}

module.exports = RegressionTestRunner;
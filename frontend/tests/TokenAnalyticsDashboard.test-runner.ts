/**
 * TokenAnalyticsDashboard Test Runner
 *
 * Comprehensive test execution script that validates all aspects of the
 * TokenAnalyticsDashboard component. This script will:
 *
 * 1. Run dependency validation tests
 * 2. Execute unit tests
 * 3. Run integration tests
 * 4. Execute Playwright E2E tests
 * 5. Generate comprehensive coverage report
 *
 * The tests MUST fail if dynamic import errors persist
 * The tests MUST pass only when the component is fully functional
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestResult {
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  details?: any;
  errors?: string[];
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

class TokenAnalyticsDashboardTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Run all test suites for TokenAnalyticsDashboard
   */
  async runAllTests(): Promise<TestSummary> {
    console.log('🚀 Starting TokenAnalyticsDashboard Test Suite');
    console.log('=' .repeat(50));

    try {
      // 1. Dependency validation tests
      await this.runDependencyTests();

      // 2. Unit tests
      await this.runUnitTests();

      // 3. Integration tests
      await this.runIntegrationTests();

      // 4. E2E tests (if environment supports it)
      if (await this.canRunE2ETests()) {
        await this.runE2ETests();
      } else {
        console.log('⚠️  Skipping E2E tests (environment not suitable)');
        this.results.push({
          suite: 'E2E Tests',
          status: 'skipped',
          duration: 0,
        });
      }

      // 5. Generate coverage report
      await this.generateCoverageReport();

      // 6. Generate final summary
      return this.generateSummary();

    } catch (error) {
      console.error('❌ Test runner failed:', error);
      throw error;
    }
  }

  /**
   * Run dependency validation tests
   */
  private async runDependencyTests(): Promise<void> {
    console.log('\n📦 Running Dependency Validation Tests...');
    const startTime = Date.now();

    try {
      // Run dependency tests with vitest
      const result = execSync(
        'npx vitest run tests/unit/TokenAnalyticsDashboard.dependency.test.ts --reporter=json',
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 30000,
        }
      );

      const testResults = JSON.parse(result);
      const duration = Date.now() - startTime;

      if (testResults.numFailedTests === 0) {
        console.log('✅ Dependency tests passed');
        this.results.push({
          suite: 'Dependency Validation',
          status: 'passed',
          duration,
          details: testResults,
        });
      } else {
        console.log('❌ Dependency tests failed');
        this.results.push({
          suite: 'Dependency Validation',
          status: 'failed',
          duration,
          details: testResults,
          errors: testResults.failureMessages || [],
        });
      }
    } catch (error) {
      console.log('❌ Dependency tests failed with error');
      this.results.push({
        suite: 'Dependency Validation',
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error.message],
      });
    }
  }

  /**
   * Run unit tests
   */
  private async runUnitTests(): Promise<void> {
    console.log('\n🧪 Running Unit Tests...');
    const startTime = Date.now();

    try {
      // Run unit tests with custom config
      const result = execSync(
        'npx vitest run tests/unit/TokenAnalyticsDashboard.test.tsx --config=tests/unit/TokenAnalyticsDashboard.vitest.config.ts --reporter=json',
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 60000,
        }
      );

      const testResults = JSON.parse(result);
      const duration = Date.now() - startTime;

      if (testResults.numFailedTests === 0) {
        console.log('✅ Unit tests passed');
        this.results.push({
          suite: 'Unit Tests',
          status: 'passed',
          duration,
          details: testResults,
        });
      } else {
        console.log('❌ Unit tests failed');
        this.results.push({
          suite: 'Unit Tests',
          status: 'failed',
          duration,
          details: testResults,
          errors: testResults.failureMessages || [],
        });
      }
    } catch (error) {
      console.log('❌ Unit tests failed with error');
      this.results.push({
        suite: 'Unit Tests',
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error.message],
      });
    }
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(): Promise<void> {
    console.log('\n🔗 Running Integration Tests...');
    const startTime = Date.now();

    try {
      const result = execSync(
        'npx vitest run tests/integration/TokenAnalyticsDashboard.integration.test.tsx --reporter=json',
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 120000,
        }
      );

      const testResults = JSON.parse(result);
      const duration = Date.now() - startTime;

      if (testResults.numFailedTests === 0) {
        console.log('✅ Integration tests passed');
        this.results.push({
          suite: 'Integration Tests',
          status: 'passed',
          duration,
          details: testResults,
        });
      } else {
        console.log('❌ Integration tests failed');
        this.results.push({
          suite: 'Integration Tests',
          status: 'failed',
          duration,
          details: testResults,
          errors: testResults.failureMessages || [],
        });
      }
    } catch (error) {
      console.log('❌ Integration tests failed with error');
      this.results.push({
        suite: 'Integration Tests',
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error.message],
      });
    }
  }

  /**
   * Run E2E tests with Playwright
   */
  private async runE2ETests(): Promise<void> {
    console.log('\n🌐 Running E2E Tests...');
    const startTime = Date.now();

    try {
      // Check if dev server is running
      const isDevServerRunning = await this.checkDevServer();

      if (!isDevServerRunning) {
        console.log('⚠️  Dev server not running, starting it...');
        await this.startDevServer();
      }

      const result = execSync(
        'npx playwright test tests/e2e/TokenAnalyticsDashboard.spec.ts --reporter=json',
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 180000,
        }
      );

      const testResults = JSON.parse(result);
      const duration = Date.now() - startTime;

      if (testResults.stats?.failures === 0) {
        console.log('✅ E2E tests passed');
        this.results.push({
          suite: 'E2E Tests',
          status: 'passed',
          duration,
          details: testResults,
        });
      } else {
        console.log('❌ E2E tests failed');
        this.results.push({
          suite: 'E2E Tests',
          status: 'failed',
          duration,
          details: testResults,
          errors: testResults.errors || [],
        });
      }
    } catch (error) {
      console.log('❌ E2E tests failed with error');
      this.results.push({
        suite: 'E2E Tests',
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error.message],
      });
    }
  }

  /**
   * Generate test coverage report
   */
  private async generateCoverageReport(): Promise<void> {
    console.log('\n📊 Generating Coverage Report...');
    const startTime = Date.now();

    try {
      // Run tests with coverage
      execSync(
        'npx vitest run tests/unit/TokenAnalyticsDashboard.test.tsx --coverage --config=tests/unit/TokenAnalyticsDashboard.vitest.config.ts',
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: 60000,
        }
      );

      console.log('✅ Coverage report generated');
      this.results.push({
        suite: 'Coverage Report',
        status: 'passed',
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.log('⚠️  Coverage report generation failed');
      this.results.push({
        suite: 'Coverage Report',
        status: 'failed',
        duration: Date.now() - startTime,
        errors: [error.message],
      });
    }
  }

  /**
   * Check if development server is running
   */
  private async checkDevServer(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:5173');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start development server
   */
  private async startDevServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const devServer = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      const timeout = setTimeout(() => {
        devServer.kill();
        reject(new Error('Dev server startup timeout'));
      }, 30000);

      devServer.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Local:') && output.includes('5173')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      devServer.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Check if E2E tests can be run
   */
  private async canRunE2ETests(): Promise<boolean> {
    try {
      // Check if Playwright is installed
      execSync('npx playwright --version', { stdio: 'pipe' });

      // Check if browsers are installed
      execSync('npx playwright install --dry-run', { stdio: 'pipe' });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate final test summary
   */
  private generateSummary(): TestSummary {
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(50));
    console.log('📋 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Suites: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);

    // Print detailed results
    this.results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' :
                   result.status === 'failed' ? '❌' : '⏭️';
      console.log(`${icon} ${result.suite}: ${result.status} (${(result.duration / 1000).toFixed(2)}s)`);

      if (result.errors && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   ⚠️  ${error}`);
        });
      }
    });

    // Overall status
    if (failed > 0) {
      console.log('\n❌ OVERALL STATUS: FAILED');
      console.log('TokenAnalyticsDashboard has issues that need to be resolved.');
    } else if (passed === total) {
      console.log('\n✅ OVERALL STATUS: PASSED');
      console.log('TokenAnalyticsDashboard is fully functional.');
    } else {
      console.log('\n⚠️  OVERALL STATUS: PARTIAL');
      console.log('Some tests were skipped, manual verification may be needed.');
    }

    // Save results to file
    const reportPath = path.join(process.cwd(), 'test-results', 'TokenAnalyticsDashboard-test-summary.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: { total, passed, failed, skipped, duration },
      results: this.results,
    }, null, 2));

    console.log(`\n📁 Full report saved to: ${reportPath}`);

    return {
      total,
      passed,
      failed,
      skipped,
      duration,
      results: this.results,
    };
  }
}

// CLI execution
if (require.main === module) {
  const runner = new TokenAnalyticsDashboardTestRunner();

  runner.runAllTests()
    .then((summary) => {
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

export { TokenAnalyticsDashboardTestRunner };
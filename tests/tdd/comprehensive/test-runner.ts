/**
 * TDD London School: Comprehensive Test Runner
 * 
 * Orchestrates all test suites and provides unified reporting.
 * Executes unit tests, integration tests, and regression validation.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  command: string;
  timeout: number;
  retries: number;
  required: boolean;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

interface TestReport {
  timestamp: string;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalDuration: number;
  results: TestResult[];
  coverage: CoverageReport;
  regressionDetected: boolean;
}

interface CoverageReport {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Component Unit Tests',
      command: 'jest tests/tdd/comprehensive/component-tests.test.tsx --coverage',
      timeout: 60000,
      retries: 1,
      required: true
    },
    {
      name: 'API Integration Tests',
      command: 'jest tests/tdd/comprehensive/api-integration-tests.test.ts --coverage',
      timeout: 120000,
      retries: 2,
      required: true
    },
    {
      name: 'WebSocket Integration Tests',
      command: 'jest tests/tdd/comprehensive/websocket-integration-tests.test.ts --coverage',
      timeout: 90000,
      retries: 2,
      required: true
    },
    {
      name: 'User Workflow Tests',
      command: 'playwright test tests/tdd/comprehensive/user-workflow-tests.test.ts',
      timeout: 300000,
      retries: 3,
      required: true
    },
    {
      name: 'Regression Test Suite',
      command: 'jest tests/tdd/comprehensive/regression-test-suite.test.ts --coverage',
      timeout: 180000,
      retries: 1,
      required: false // Don't fail if regression tests fail
    }
  ];

  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Comprehensive TDD Test Suite');
    console.log('=' .repeat(60));
    
    const startTime = Date.now();
    const results: TestResult[] = [];
    let passedSuites = 0;
    let failedSuites = 0;
    let regressionDetected = false;

    for (const suite of this.testSuites) {
      console.log(`\n📋 Running: ${suite.name}`);
      console.log('-'.repeat(40));
      
      const result = await this.runTestSuite(suite);
      results.push(result);
      
      if (result.passed) {
        passedSuites++;
        console.log(`✅ ${suite.name} - PASSED (${result.duration}ms)`);
      } else {
        failedSuites++;
        console.log(`❌ ${suite.name} - FAILED (${result.duration}ms)`);
        
        if (suite.name === 'Regression Test Suite') {
          regressionDetected = true;
        }
        
        if (suite.required) {
          console.log(`🚨 Required test suite failed: ${suite.name}`);
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    const coverage = await this.generateCoverageReport();

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalSuites: this.testSuites.length,
      passedSuites,
      failedSuites,
      totalDuration,
      results,
      coverage,
      regressionDetected
    };

    this.printSummary(report);
    await this.saveReport(report);

    return report;
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    let attempts = 0;
    let lastError: string = '';

    while (attempts <= suite.retries) {
      try {
        const startTime = Date.now();
        
        const output = execSync(suite.command, {
          cwd: process.cwd(),
          timeout: suite.timeout,
          encoding: 'utf8'
        });
        
        const duration = Date.now() - startTime;
        
        return {
          suite: suite.name,
          passed: true,
          duration,
          output
        };
      } catch (error: any) {
        attempts++;
        lastError = error.message || error.toString();
        
        if (attempts <= suite.retries) {
          console.log(`⚠️  Attempt ${attempts} failed, retrying... (${suite.retries - attempts + 1} attempts remaining)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }

    return {
      suite: suite.name,
      passed: false,
      duration: 0,
      output: '',
      error: lastError
    };
  }

  private async generateCoverageReport(): Promise<CoverageReport> {
    try {
      // Read Jest coverage report if it exists
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      
      if (fs.existsSync(coveragePath)) {
        const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const total = coverageData.total;
        
        return {
          statements: total.statements.pct,
          branches: total.branches.pct,
          functions: total.functions.pct,
          lines: total.lines.pct
        };
      }
    } catch (error) {
      console.warn('Could not read coverage report:', error);
    }

    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    };
  }

  private printSummary(report: TestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`🕐 Total Duration: ${Math.round(report.totalDuration / 1000)}s`);
    console.log(`📋 Total Suites: ${report.totalSuites}`);
    console.log(`✅ Passed: ${report.passedSuites}`);
    console.log(`❌ Failed: ${report.failedSuites}`);
    console.log(`📈 Success Rate: ${Math.round((report.passedSuites / report.totalSuites) * 100)}%`);
    
    if (report.regressionDetected) {
      console.log('🔍 Regression Detected: YES');
    }
    
    console.log('\n📊 CODE COVERAGE:');
    console.log(`  Statements: ${report.coverage.statements}%`);
    console.log(`  Branches: ${report.coverage.branches}%`);
    console.log(`  Functions: ${report.coverage.functions}%`);
    console.log(`  Lines: ${report.coverage.lines}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    for (const result of report.results) {
      const status = result.passed ? '✅' : '❌';
      const duration = result.duration > 0 ? `(${result.duration}ms)` : '';
      console.log(`  ${status} ${result.suite} ${duration}`);
      
      if (!result.passed && result.error) {
        console.log(`    Error: ${result.error.slice(0, 100)}...`);
      }
    }
    
    const requiredFailures = report.results.filter(r => 
      !r.passed && this.testSuites.find(s => s.name === r.suite)?.required
    );
    
    if (requiredFailures.length === 0) {
      console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
    } else {
      console.log(`\n🚨 ${requiredFailures.length} CRITICAL TEST(S) FAILED!`);
    }
    
    console.log('='.repeat(60));
  }

  private async saveReport(report: TestReport): Promise<void> {
    try {
      const reportsDir = path.join(process.cwd(), 'tests', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const reportPath = path.join(reportsDir, `test-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      // Also save as latest report
      const latestPath = path.join(reportsDir, 'latest-report.json');
      fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
      
      console.log(`\n📄 Report saved to: ${reportPath}`);
    } catch (error) {
      console.warn('Could not save test report:', error);
    }
  }

  async runContinuousValidation(): Promise<void> {
    console.log('🔄 Starting Continuous Validation Mode');
    
    const runTests = async () => {
      try {
        const report = await this.runAllTests();
        
        if (report.regressionDetected) {
          console.log('🚨 REGRESSION DETECTED! Review latest changes.');
        }
        
        const requiredFailures = report.results.filter(r => 
          !r.passed && this.testSuites.find(s => s.name === r.suite)?.required
        );
        
        if (requiredFailures.length > 0) {
          console.log('🚨 CRITICAL TESTS FAILING! Immediate attention required.');
        }
      } catch (error) {
        console.error('Error in continuous validation:', error);
      }
    };
    
    // Run tests every 30 minutes
    setInterval(runTests, 30 * 60 * 1000);
    
    // Run initial test
    await runTests();
  }

  async validateRequiredTests(): Promise<boolean> {
    const report = await this.runAllTests();
    
    const requiredFailures = report.results.filter(r => 
      !r.passed && this.testSuites.find(s => s.name === r.suite)?.required
    );
    
    return requiredFailures.length === 0;
  }

  async runSmokeTests(): Promise<boolean> {
    console.log('💨 Running Smoke Tests');
    
    const smokeTestSuites = this.testSuites.filter(s => 
      s.name === 'Component Unit Tests' || s.name === 'API Integration Tests'
    );
    
    let allPassed = true;
    
    for (const suite of smokeTestSuites) {
      const result = await this.runTestSuite(suite);
      
      if (!result.passed) {
        allPassed = false;
        console.log(`❌ Smoke test failed: ${suite.name}`);
      } else {
        console.log(`✅ Smoke test passed: ${suite.name}`);
      }
    }
    
    return allPassed;
  }
}

// CLI interface
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  const command = process.argv[2];
  
  switch (command) {
    case 'all':
      runner.runAllTests()
        .then(report => {
          const requiredFailures = report.results.filter(r => 
            !r.passed && runner['testSuites'].find(s => s.name === r.suite)?.required
          );
          process.exit(requiredFailures.length > 0 ? 1 : 0);
        })
        .catch(error => {
          console.error('Test runner failed:', error);
          process.exit(1);
        });
      break;
      
    case 'smoke':
      runner.runSmokeTests()
        .then(passed => {
          process.exit(passed ? 0 : 1);
        })
        .catch(error => {
          console.error('Smoke tests failed:', error);
          process.exit(1);
        });
      break;
      
    case 'continuous':
      runner.runContinuousValidation()
        .catch(error => {
          console.error('Continuous validation failed:', error);
          process.exit(1);
        });
      break;
      
    case 'validate':
      runner.validateRequiredTests()
        .then(valid => {
          console.log(valid ? '✅ All required tests pass' : '❌ Required tests failing');
          process.exit(valid ? 0 : 1);
        })
        .catch(error => {
          console.error('Validation failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node test-runner.ts [all|smoke|continuous|validate]');
      console.log('  all        - Run all test suites');
      console.log('  smoke      - Run smoke tests only');
      console.log('  continuous - Run continuous validation');
      console.log('  validate   - Validate required tests pass');
      process.exit(1);
  }
}

export { ComprehensiveTestRunner, TestReport, TestResult };
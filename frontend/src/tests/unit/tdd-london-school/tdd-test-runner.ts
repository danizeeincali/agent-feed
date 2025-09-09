/**
 * TDD London School Test Runner
 * 
 * Executes mock-driven behavior verification tests for SSE connection lifecycle
 * Runs tests in sequence and provides detailed reporting
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  coverage?: any;
  errors?: string[];
}

interface TestSuiteResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
  timestamp: string;
}

class TDDLondonSchoolRunner {
  private testFiles = [
    'sse-connection-lifecycle.test.ts',
    'sse-econnreset-recovery.test.ts', 
    'sse-connection-bridge.test.ts'
  ];

  private testDirectory = '/workspaces/agent-feed/frontend/tests/tdd-london-school';
  private resultsDirectory = '/workspaces/agent-feed/frontend/test-results/tdd-london-school';

  constructor() {
    // Ensure results directory exists
    try {
      mkdirSync(this.resultsDirectory, { recursive: true });
    } catch (error) {
      console.warn('Results directory creation warning:', error);
    }
  }

  async runAllTests(): Promise<TestSuiteResults> {
    console.log('🧪 Starting TDD London School Test Suite');
    console.log('📋 Tests focus on mock-driven behavior verification');
    console.log('🎯 Target: Stable SSE connections without ECONNRESET drops\\n');

    const suiteStartTime = Date.now();
    const results: TestResult[] = [];

    for (const testFile of this.testFiles) {
      console.log(`\\n🔍 Running ${testFile}...`);
      const result = await this.runSingleTest(testFile);
      results.push(result);
      
      if (result.passed) {
        console.log(`✅ ${testFile} - PASSED (${result.duration}ms)`);
      } else {
        console.log(`❌ ${testFile} - FAILED (${result.duration}ms)`);
        if (result.errors) {
          result.errors.forEach(error => console.log(`   Error: ${error}`));
        }
      }
    }

    const suiteResults: TestSuiteResults = {
      totalTests: results.length,
      passedTests: results.filter(r => r.passed).length,
      failedTests: results.filter(r => !r.passed).length,
      totalDuration: Date.now() - suiteStartTime,
      results,
      timestamp: new Date().toISOString()
    };

    this.generateReport(suiteResults);
    this.displaySummary(suiteResults);

    return suiteResults;
  }

  private async runSingleTest(testFile: string): Promise<TestResult> {
    const testPath = join(this.testDirectory, testFile);
    const startTime = Date.now();

    return new Promise((resolve) => {
      const jestProcess = spawn('npx', ['jest', testPath, '--verbose', '--passWithNoTests'], {
        cwd: '/workspaces/agent-feed/frontend',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      jestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jestProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const passed = code === 0;
        const errors = stderr ? stderr.split('\\n').filter(line => line.trim()) : [];

        resolve({
          testFile,
          passed,
          duration,
          errors: errors.length > 0 ? errors : undefined
        });
      });

      jestProcess.on('error', (error) => {
        resolve({
          testFile,
          passed: false,
          duration: Date.now() - startTime,
          errors: [error.message]
        });
      });
    });
  }

  private generateReport(results: TestSuiteResults): void {
    const reportPath = join(this.resultsDirectory, 'tdd-london-school-report.json');
    
    const report = {
      metadata: {
        testSuite: 'TDD London School - SSE Connection Lifecycle',
        methodology: 'Mock-driven behavior verification',
        focus: 'Stable SSE connections without ECONNRESET drops',
        timestamp: results.timestamp,
        duration: `${results.totalDuration}ms`
      },
      summary: {
        totalTests: results.totalTests,
        passed: results.passedTests,
        failed: results.failedTests,
        successRate: `${Math.round((results.passedTests / results.totalTests) * 100)}%`
      },
      results: results.results.map(result => ({
        testFile: result.testFile,
        status: result.passed ? 'PASSED' : 'FAILED',
        duration: `${result.duration}ms`,
        ...(result.errors && { errors: result.errors })
      })),
      testContacts: {
        'sse-connection-lifecycle.test.ts': [
          'SSEConnectionManager',
          'ConnectionStateMonitor', 
          'ErrorRecoveryStrategy',
          'ClaudeSessionManager'
        ],
        'sse-econnreset-recovery.test.ts': [
          'ConnectionLifecycleManager',
          'HTTPPollingFallback',
          'BackendSSEManager',
          'ConnectionRecoveryOrchestrator'
        ],
        'sse-connection-bridge.test.ts': [
          'UseHTTPSSEHook',
          'ClaudeInstanceManagerIntegration',
          'BackendSSEBroadcaster',
          'ConnectionStateSynchronizer'
        ]
      },
      recommendations: this.generateRecommendations(results)
    };

    try {
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\\n📊 Test report generated: ${reportPath}`);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  }

  private generateRecommendations(results: TestSuiteResults): string[] {
    const recommendations: string[] = [];

    if (results.failedTests > 0) {
      recommendations.push('❌ Failed tests indicate missing implementation contracts');
      recommendations.push('🔧 Implement collaborator objects based on defined mock interfaces');
      recommendations.push('🔗 Focus on HOW objects collaborate, not what they contain');
    }

    if (results.passedTests === results.totalTests) {
      recommendations.push('✅ All mock contracts verified - implement real collaborators');
      recommendations.push('🚀 Ready for implementation phase based on defined behaviors');
      recommendations.push('🧪 Run integration tests after implementation');
    }

    // Always add London School methodology reminders
    recommendations.push('📋 London School TDD: Outside-in development with mocks');
    recommendations.push('🎯 Focus on interaction patterns between objects');
    recommendations.push('🔄 Iterate: Red -> Green -> Refactor with behavior verification');

    return recommendations;
  }

  private displaySummary(results: TestSuiteResults): void {
    console.log('\\n' + '='.repeat(60));
    console.log('📈 TDD London School Test Suite Summary');
    console.log('='.repeat(60));
    console.log(`📊 Total Tests: ${results.totalTests}`);
    console.log(`✅ Passed: ${results.passedTests}`);
    console.log(`❌ Failed: ${results.failedTests}`);
    console.log(`🕐 Total Duration: ${results.totalDuration}ms`);
    console.log(`📈 Success Rate: ${Math.round((results.passedTests / results.totalTests) * 100)}%`);
    
    console.log('\\n🎯 Test Focus Areas:');
    console.log('  • Connection persistence across multiple commands');
    console.log('  • ECONNRESET error detection and recovery');
    console.log('  • HTTP polling fallback mechanisms');
    console.log('  • Frontend/backend state synchronization');
    console.log('  • Claude session state preservation');

    if (results.failedTests === 0) {
      console.log('\\n🎉 All tests passed! Mock contracts are well-defined.');
      console.log('📋 Next steps:');
      console.log('  1. Implement real collaborator objects');
      console.log('  2. Follow mock-defined interaction patterns');
      console.log('  3. Ensure ECONNRESET handling prevents connection drops');
      console.log('  4. Test with real SSE connections');
    } else {
      console.log('\\n⚠️  Some tests failed. Review mock contracts and test setup.');
      console.log('📋 London School TDD requires:');
      console.log('  1. Well-defined mock collaborators');
      console.log('  2. Clear interaction patterns');
      console.log('  3. Behavior verification over state testing');
    }

    console.log('\\n' + '='.repeat(60));
  }

  // Method to run tests with coverage
  async runWithCoverage(): Promise<TestSuiteResults> {
    console.log('🧪 Running TDD London School tests with coverage...');
    
    // This would require additional Jest configuration for coverage
    // For now, we'll run the standard tests
    return this.runAllTests();
  }

  // Method to run specific test file
  async runSingleTestFile(testFileName: string): Promise<TestResult> {
    if (!this.testFiles.includes(testFileName)) {
      throw new Error(`Test file ${testFileName} not found in suite`);
    }

    console.log(`🔍 Running single test: ${testFileName}`);
    return this.runSingleTest(testFileName);
  }

  // Method to validate test setup
  validateTestSetup(): boolean {
    console.log('🔧 Validating TDD London School test setup...');
    
    const checks = [
      { name: 'Jest installed', check: () => this.checkJestInstallation() },
      { name: 'Test files exist', check: () => this.checkTestFilesExist() },
      { name: 'Results directory', check: () => this.checkResultsDirectory() }
    ];

    let allValid = true;
    checks.forEach(({ name, check }) => {
      try {
        const isValid = check();
        console.log(`${isValid ? '✅' : '❌'} ${name}`);
        if (!isValid) allValid = false;
      } catch (error) {
        console.log(`❌ ${name}: ${error}`);
        allValid = false;
      }
    });

    return allValid;
  }

  private checkJestInstallation(): boolean {
    try {
      const packageJson = JSON.parse(readFileSync('/workspaces/agent-feed/frontend/package.json', 'utf8'));
      return !!(packageJson.devDependencies?.jest || packageJson.dependencies?.jest);
    } catch {
      return false;
    }
  }

  private checkTestFilesExist(): boolean {
    return this.testFiles.every(file => {
      try {
        const testPath = join(this.testDirectory, file);
        readFileSync(testPath);
        return true;
      } catch {
        return false;
      }
    });
  }

  private checkResultsDirectory(): boolean {
    try {
      mkdirSync(this.resultsDirectory, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }
}

// Export for use as module
export default TDDLondonSchoolRunner;

// CLI execution
if (require.main === module) {
  const runner = new TDDLondonSchoolRunner();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      const isValid = runner.validateTestSetup();
      process.exit(isValid ? 0 : 1);
      break;
      
    case 'single':
      const testFile = process.argv[3];
      if (!testFile) {
        console.error('❌ Please specify test file name');
        process.exit(1);
      }
      runner.runSingleTestFile(testFile)
        .then(result => {
          console.log(`Test completed: ${result.passed ? 'PASSED' : 'FAILED'}`);
          process.exit(result.passed ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Test execution failed:', error);
          process.exit(1);
        });
      break;
      
    case 'coverage':
      runner.runWithCoverage()
        .then(results => {
          process.exit(results.failedTests === 0 ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Coverage test failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      runner.runAllTests()
        .then(results => {
          process.exit(results.failedTests === 0 ? 0 : 1);
        })
        .catch(error => {
          console.error('❌ Test suite failed:', error);
          process.exit(1);
        });
      break;
  }
}
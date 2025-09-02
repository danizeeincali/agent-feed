#!/usr/bin/env node

/**
 * WebSocket Stability Test Runner
 * 
 * This script orchestrates the WebSocket stability tests and provides
 * detailed reporting on connection drop issues.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class WebSocketTestRunner {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      connectionDropTests: [],
      regressionTests: [],
      errors: [],
      summary: {}
    };
    
    this.testSuites = [
      {
        name: 'Connection Stability',
        file: 'websocket-connection-stability.test.js',
        expectedToFail: true,
        description: 'Tests that should FAIL, exposing the 30-second drop issue'
      },
      {
        name: 'Claude API Concurrent',
        file: 'claude-api-concurrent-test.test.js',
        expectedToFail: true,
        description: 'Tests concurrent API calls that trigger connection drops'
      },
      {
        name: 'Regression Prevention',
        file: 'regression-prevention-tests.test.js',
        expectedToFail: true, // Until fix is implemented
        description: 'Tests that will PASS only after the fix is implemented'
      }
    ];
  }

  async runTests() {
    console.log('🚀 WebSocket Stability Test Suite Starting...');
    console.log('═'.repeat(60));
    console.log(`Start Time: ${this.testResults.startTime.toISOString()}`);
    console.log('Expected Behavior: Most tests should FAIL, proving the issue exists');
    console.log('═'.repeat(60));

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    this.testResults.endTime = new Date();
    await this.generateReport();
    this.printSummary();
  }

  async runTestSuite(suite) {
    console.log(`\n📋 Running ${suite.name}...`);
    console.log(`   File: ${suite.file}`);
    console.log(`   Expected to fail: ${suite.expectedToFail ? 'YES' : 'NO'}`);
    console.log(`   Description: ${suite.description}`);
    console.log('─'.repeat(50));

    return new Promise((resolve) => {
      const testProcess = spawn('npx', ['mocha', suite.file, '--timeout', '150000', '--reporter', 'json'], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      testProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        // Real-time output for long-running tests
        if (data.toString().includes('WebSocket') || data.toString().includes('API call')) {
          console.log(`   📡 ${data.toString().trim()}`);
        }
      });

      testProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`   ⚠️  ${data.toString().trim()}`);
      });

      testProcess.on('close', (code) => {
        try {
          if (stdout.trim()) {
            const results = JSON.parse(stdout);
            this.processTestResults(suite, results, code);
          } else {
            // Handle case where no JSON output was produced
            this.processTestResults(suite, { 
              stats: { tests: 0, passes: 0, failures: 0 },
              failures: [{ title: 'Test execution failed', err: { message: stderr || 'No output produced' } }]
            }, code);
          }
        } catch (error) {
          console.log(`   ❌ Failed to parse test results: ${error.message}`);
          this.testResults.errors.push({
            suite: suite.name,
            error: `Failed to parse results: ${error.message}`,
            stdout,
            stderr
          });
        }

        resolve();
      });

      testProcess.on('error', (error) => {
        console.log(`   💥 Process error: ${error.message}`);
        this.testResults.errors.push({
          suite: suite.name,
          error: error.message
        });
        resolve();
      });
    });
  }

  processTestResults(suite, results, exitCode) {
    const stats = results.stats || {};
    const failures = results.failures || [];
    const passes = results.passes || [];

    console.log(`   📊 Results: ${stats.passes || 0} passed, ${stats.failures || 0} failed, ${stats.tests || 0} total`);
    console.log(`   ⏱️  Duration: ${stats.duration || 0}ms`);
    console.log(`   🚪 Exit code: ${exitCode}`);

    this.testResults.totalTests += stats.tests || 0;
    this.testResults.passedTests += stats.passes || 0;
    this.testResults.failedTests += stats.failures || 0;

    const suiteResult = {
      name: suite.name,
      file: suite.file,
      expectedToFail: suite.expectedToFail,
      actualResult: exitCode === 0 ? 'PASSED' : 'FAILED',
      behaviorCorrect: suite.expectedToFail ? exitCode !== 0 : exitCode === 0,
      stats,
      failures: failures.map(f => ({
        title: f.title,
        message: f.err?.message || 'Unknown error',
        stack: f.err?.stack
      })),
      passes: passes.map(p => ({
        title: p.title,
        duration: p.duration
      }))
    };

    if (suite.name.includes('Regression')) {
      this.testResults.regressionTests.push(suiteResult);
    } else {
      this.testResults.connectionDropTests.push(suiteResult);
    }

    // Analyze failure patterns
    if (failures.length > 0) {
      console.log(`   🔍 Failure Analysis:`);
      failures.forEach((failure, index) => {
        console.log(`      ${index + 1}. ${failure.title}`);
        if (failure.err?.message) {
          const message = failure.err.message;
          if (message.includes('Connection dropped') || message.includes('WebSocket closed')) {
            console.log(`      🎯 CONNECTION DROP DETECTED: ${message.substring(0, 100)}...`);
          } else if (message.includes('timeout')) {
            console.log(`      ⏰ TIMEOUT DETECTED: ${message.substring(0, 100)}...`);
          } else {
            console.log(`      ❓ Other error: ${message.substring(0, 100)}...`);
          }
        }
      });
    }

    if (suiteResult.behaviorCorrect) {
      console.log(`   ✅ Behavior is CORRECT for this test phase`);
    } else {
      console.log(`   ⚠️  Unexpected behavior - investigate further`);
    }
  }

  async generateReport() {
    const reportData = {
      ...this.testResults,
      generatedAt: new Date().toISOString(),
      testDuration: this.testResults.endTime - this.testResults.startTime,
      summary: this.generateSummary()
    };

    const reportPath = path.join(__dirname, 'test-results', 'websocket-stability-report.json');
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
      
      // Generate human-readable report
      const humanReport = this.generateHumanReport(reportData);
      const humanReportPath = path.join(__dirname, 'test-results', 'websocket-stability-report.md');
      await fs.writeFile(humanReportPath, humanReport);
      
      console.log(`\n📄 Reports generated:`);
      console.log(`   JSON: ${reportPath}`);
      console.log(`   Markdown: ${humanReportPath}`);
    } catch (error) {
      console.error(`Failed to generate report: ${error.message}`);
    }
  }

  generateSummary() {
    const connectionDropIssuesDetected = this.testResults.connectionDropTests.some(
      test => test.failures.some(f => 
        f.message.includes('Connection dropped') || 
        f.message.includes('WebSocket closed')
      )
    );

    const apiTimeoutIssuesDetected = this.testResults.connectionDropTests.some(
      test => test.failures.some(f => f.message.includes('timeout'))
    );

    const regressionTestsReady = this.testResults.regressionTests.length > 0;
    const regressionTestsPassing = this.testResults.regressionTests.some(
      test => test.actualResult === 'PASSED'
    );

    return {
      connectionDropIssuesDetected,
      apiTimeoutIssuesDetected,
      regressionTestsReady,
      regressionTestsPassing,
      totalFailures: this.testResults.failedTests,
      issuesExposed: connectionDropIssuesDetected || apiTimeoutIssuesDetected,
      readyForFix: regressionTestsReady && !regressionTestsPassing
    };
  }

  generateHumanReport(data) {
    return `# WebSocket Stability Test Report

## Executive Summary

**Test Execution Date:** ${data.startTime.toISOString()}  
**Total Duration:** ${Math.floor(data.testDuration / 1000)} seconds  
**Tests Run:** ${data.totalTests}  
**Tests Passed:** ${data.passedTests}  
**Tests Failed:** ${data.failedTests}  

## Issue Detection Status

- **Connection Drop Issues Detected:** ${data.summary.connectionDropIssuesDetected ? '✅ YES' : '❌ NO'}
- **API Timeout Issues Detected:** ${data.summary.apiTimeoutIssuesDetected ? '✅ YES' : '❌ NO'}
- **Regression Tests Ready:** ${data.summary.regressionTestsReady ? '✅ YES' : '❌ NO'}
- **Ready for Fix Implementation:** ${data.summary.readyForFix ? '✅ YES' : '❌ NO'}

## Test Suite Results

### Connection Drop Detection Tests
${data.connectionDropTests.map(test => `
#### ${test.name}
- **Expected to Fail:** ${test.expectedToFail ? 'YES' : 'NO'}
- **Actual Result:** ${test.actualResult}
- **Behavior Correct:** ${test.behaviorCorrect ? 'YES' : 'NO'}
- **Tests:** ${test.stats.tests || 0} total, ${test.stats.passes || 0} passed, ${test.stats.failures || 0} failed

**Key Failures:**
${test.failures.map(f => `- ${f.title}: ${f.message.substring(0, 200)}...`).join('\n')}
`).join('\n')}

### Regression Prevention Tests
${data.regressionTests.map(test => `
#### ${test.name}
- **Expected to Fail:** ${test.expectedToFail ? 'YES (until fix)' : 'NO'}
- **Actual Result:** ${test.actualResult}
- **Behavior Correct:** ${test.behaviorCorrect ? 'YES' : 'NO'}
- **Tests:** ${test.stats.tests || 0} total, ${test.stats.passes || 0} passed, ${test.stats.failures || 0} failed

**Status:** ${test.actualResult === 'PASSED' ? 'Fix appears to be working!' : 'Still failing as expected - fix not yet implemented'}
`).join('\n')}

## Next Steps

${data.summary.issuesExposed ? `
✅ **Issue Successfully Exposed**
The tests have successfully detected the WebSocket connection drop issues. This proves the problem exists and provides a reliable way to test fixes.

**Recommended Actions:**
1. Analyze the failure patterns in the test results
2. Implement fixes for the identified issues
3. Re-run the regression tests to validate the fixes
4. The regression tests should PASS after successful fix implementation
` : `
⚠️ **Issue Not Detected**
The tests did not expose the expected WebSocket connection drops. This could mean:
1. The issue has already been fixed
2. The tests need adjustment to better reproduce the problem
3. The server environment differs from production conditions

**Recommended Actions:**
1. Review test conditions and server setup
2. Compare with production environment settings
3. Adjust test parameters if needed
`}

## Technical Details

**Errors Encountered:**
${data.errors.map(err => `- ${err.suite}: ${err.error}`).join('\n') || 'None'}

**Test Environment:**
- Node.js WebSocket connections
- Real API calls (not mocked)
- Extended duration testing (60+ seconds)
- Concurrent operation stress testing

---
*Report generated automatically by WebSocket Stability Test Runner*
`;
  }

  printSummary() {
    console.log('\n🎯 WEBSOCKET STABILITY TEST SUMMARY');
    console.log('═'.repeat(60));
    console.log(`📊 Total Tests: ${this.testResults.totalTests}`);
    console.log(`✅ Passed: ${this.testResults.passedTests}`);
    console.log(`❌ Failed: ${this.testResults.failedTests}`);
    console.log(`⏱️  Duration: ${Math.floor((this.testResults.endTime - this.testResults.startTime) / 1000)}s`);
    
    const summary = this.testResults.summary;
    
    console.log('\n🔍 ISSUE DETECTION STATUS:');
    console.log(`Connection Drops Detected: ${summary.connectionDropIssuesDetected ? '✅ YES' : '❌ NO'}`);
    console.log(`API Timeout Issues: ${summary.apiTimeoutIssuesDetected ? '✅ YES' : '❌ NO'}`);
    console.log(`Regression Tests Ready: ${summary.regressionTestsReady ? '✅ YES' : '❌ NO'}`);
    
    if (summary.issuesExposed) {
      console.log('\n🎯 SUCCESS: WebSocket connection drop issues have been EXPOSED!');
      console.log('   These failing tests prove the problem exists.');
      console.log('   Implement fixes, then re-run regression tests to validate.');
    } else {
      console.log('\n⚠️  WARNING: Expected issues were not detected.');
      console.log('   Review test conditions or server configuration.');
    }
    
    if (summary.regressionTestsPassing) {
      console.log('\n🚀 EXCELLENT: Regression tests are PASSING!');
      console.log('   This indicates the WebSocket stability issues have been FIXED!');
    } else {
      console.log('\n📋 Regression tests are failing as expected.');
      console.log('   They will pass once the root cause is fixed.');
    }
    
    console.log('\n📄 Detailed reports saved to tests/websocket-stability/test-results/');
    console.log('═'.repeat(60));
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new WebSocketTestRunner();
  runner.runTests().catch(console.error);
}

module.exports = WebSocketTestRunner;
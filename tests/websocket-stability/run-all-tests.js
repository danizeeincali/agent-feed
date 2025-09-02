/**
 * WebSocket Stability Test Suite Runner
 * Runs all WebSocket stability tests and generates comprehensive report
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testResults = {};
    this.overallStartTime = Date.now();
    this.testSuites = [
      {
        name: 'Connection Persistence',
        path: './unit/connection-persistence.test.js',
        category: 'unit',
        priority: 'high'
      },
      {
        name: 'Multiple Commands',
        path: './unit/multiple-commands.test.js',
        category: 'unit',
        priority: 'high'
      },
      {
        name: 'API Isolation',
        path: './unit/api-isolation.test.js',
        category: 'unit',
        priority: 'critical'
      },
      {
        name: 'Error Recovery',
        path: './unit/error-recovery.test.js',
        category: 'unit',
        priority: 'high'
      },
      {
        name: 'Frontend Integration',
        path: './integration/frontend-integration.test.js',
        category: 'integration',
        priority: 'high'
      },
      {
        name: 'Performance Benchmarks',
        path: './performance/connection-benchmarks.test.js',
        category: 'performance',
        priority: 'medium'
      }
    ];
  }

  async runAllTests() {
    console.log('🚀 Starting WebSocket Stability Test Suite');
    console.log('==========================================');
    
    for (const suite of this.testSuites) {
      console.log(`\n📋 Running ${suite.name} (${suite.category})...`);
      await this.runTestSuite(suite);
    }

    await this.generateReport();
    this.printSummary();
  }

  async runTestSuite(suite) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const jestProcess = spawn('npx', ['jest', suite.path, '--verbose', '--json'], {
        cwd: path.resolve(__dirname),
        stdio: ['ignore', 'pipe', 'pipe']
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
        
        try {
          // Try to parse Jest JSON output
          const results = JSON.parse(stdout);
          
          this.testResults[suite.name] = {
            category: suite.category,
            priority: suite.priority,
            success: code === 0,
            duration: duration,
            numTotalTests: results.numTotalTests || 0,
            numPassedTests: results.numPassedTests || 0,
            numFailedTests: results.numFailedTests || 0,
            testResults: results.testResults || [],
            errors: stderr ? [stderr] : [],
            code: code
          };

          if (code === 0) {
            console.log(`✅ ${suite.name}: ${results.numPassedTests}/${results.numTotalTests} tests passed (${duration}ms)`);
          } else {
            console.log(`❌ ${suite.name}: ${results.numPassedTests}/${results.numTotalTests} tests passed, ${results.numFailedTests} failed (${duration}ms)`);
            if (stderr) {
              console.log(`   Error: ${stderr.substring(0, 200)}...`);
            }
          }

        } catch (parseError) {
          // Fallback if JSON parsing fails
          this.testResults[suite.name] = {
            category: suite.category,
            priority: suite.priority,
            success: code === 0,
            duration: duration,
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            testResults: [],
            errors: [parseError.message, stderr].filter(Boolean),
            code: code,
            rawOutput: stdout
          };

          console.log(`⚠️  ${suite.name}: Test completed but output parsing failed (exit code: ${code})`);
        }

        resolve();
      });

      jestProcess.on('error', (error) => {
        this.testResults[suite.name] = {
          category: suite.category,
          priority: suite.priority,
          success: false,
          duration: Date.now() - startTime,
          numTotalTests: 0,
          numPassedTests: 0,
          numFailedTests: 0,
          testResults: [],
          errors: [error.message],
          code: -1
        };

        console.log(`💥 ${suite.name}: Failed to run (${error.message})`);
        resolve();
      });
    });
  }

  async generateReport() {
    const reportPath = path.join(__dirname, 'test-results');
    
    // Ensure results directory exists
    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }

    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.overallStartTime,
      summary: this.generateSummary(),
      testSuites: this.testResults,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: process.cwd()
      }
    };

    // Write JSON report
    const jsonReportPath = path.join(reportPath, 'websocket-stability-report.json');
    fs.writeFileSync(jsonReportPath, JSON.stringify(report, null, 2));

    // Write human-readable report
    const htmlReportPath = path.join(reportPath, 'websocket-stability-report.html');
    fs.writeFileSync(htmlReportPath, this.generateHTMLReport(report));

    console.log(`\n📊 Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
  }

  generateSummary() {
    const allTests = Object.values(this.testResults);
    
    return {
      totalSuites: allTests.length,
      successfulSuites: allTests.filter(t => t.success).length,
      failedSuites: allTests.filter(t => !t.success).length,
      totalTests: allTests.reduce((sum, t) => sum + t.numTotalTests, 0),
      totalPassedTests: allTests.reduce((sum, t) => sum + t.numPassedTests, 0),
      totalFailedTests: allTests.reduce((sum, t) => sum + t.numFailedTests, 0),
      totalDuration: Date.now() - this.overallStartTime,
      categories: {
        unit: allTests.filter(t => t.category === 'unit').length,
        integration: allTests.filter(t => t.category === 'integration').length,
        performance: allTests.filter(t => t.category === 'performance').length
      }
    };
  }

  generateHTMLReport(report) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Stability Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f8ff; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .test-suite { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; }
        .suite-header { background: #e8f4f8; padding: 10px; font-weight: bold; }
        .suite-content { padding: 15px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        .metric { display: inline-block; margin-right: 20px; }
        .error { background: #ffe6e6; padding: 10px; border-radius: 3px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>WebSocket Stability Test Report</h1>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
        <p><strong>Total Duration:</strong> ${(report.duration / 1000).toFixed(2)}s</p>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <div class="metric"><strong>Test Suites:</strong> ${report.summary.successfulSuites}/${report.summary.totalSuites} passed</div>
        <div class="metric"><strong>Individual Tests:</strong> ${report.summary.totalPassedTests}/${report.summary.totalTests} passed</div>
        <div class="metric"><strong>Categories:</strong> ${report.summary.categories.unit} unit, ${report.summary.categories.integration} integration, ${report.summary.categories.performance} performance</div>
    </div>

    <h2>Test Suite Results</h2>
    ${Object.entries(report.testSuites).map(([name, result]) => `
    <div class="test-suite">
        <div class="suite-header ${result.success ? 'success' : 'failure'}">
            ${result.success ? '✅' : '❌'} ${name} (${result.category})
        </div>
        <div class="suite-content">
            <p><strong>Duration:</strong> ${result.duration}ms</p>
            <p><strong>Tests:</strong> ${result.numPassedTests}/${result.numTotalTests} passed</p>
            <p><strong>Priority:</strong> ${result.priority}</p>
            ${result.errors.length > 0 ? `
            <div class="error">
                <strong>Errors:</strong><br>
                ${result.errors.map(error => `<pre>${error.substring(0, 500)}${error.length > 500 ? '...' : ''}</pre>`).join('')}
            </div>
            ` : ''}
        </div>
    </div>
    `).join('')}

    <div class="summary">
        <h2>Environment</h2>
        <p><strong>Node.js:</strong> ${report.environment.nodeVersion}</p>
        <p><strong>Platform:</strong> ${report.environment.platform} ${report.environment.arch}</p>
        <p><strong>Working Directory:</strong> ${report.environment.cwd}</p>
    </div>
</body>
</html>`;
  }

  printSummary() {
    const summary = this.generateSummary();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 WEBSOCKET STABILITY TEST SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`📊 Test Suites: ${summary.successfulSuites}/${summary.totalSuites} passed`);
    console.log(`🧪 Individual Tests: ${summary.totalPassedTests}/${summary.totalTests} passed`);
    console.log(`⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    
    console.log('\n📋 Categories:');
    console.log(`   Unit Tests: ${summary.categories.unit} suites`);
    console.log(`   Integration Tests: ${summary.categories.integration} suites`);
    console.log(`   Performance Tests: ${summary.categories.performance} suites`);

    if (summary.failedSuites > 0) {
      console.log('\n❌ Failed Suites:');
      Object.entries(this.testResults).forEach(([name, result]) => {
        if (!result.success) {
          console.log(`   - ${name}: ${result.numFailedTests} test(s) failed`);
        }
      });
    }

    const overallSuccess = summary.failedSuites === 0;
    console.log(`\n${overallSuccess ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
    console.log('='.repeat(50));

    // Exit with appropriate code
    process.exit(overallSuccess ? 0 : 1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
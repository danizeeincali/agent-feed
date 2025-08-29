#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Escape Sequence Storm Prevention Tests
 * 
 * This script orchestrates all the Playwright E2E tests for validating
 * escape sequence storm prevention mechanisms across browsers and devices.
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestRunner {
  constructor() {
    this.testSuites = [
      {
        name: 'Main E2E Suite',
        file: 'main-e2e-suite.spec.ts',
        description: 'Core user journey validation and basic storm prevention',
        priority: 'high',
        estimatedDuration: '5-10 minutes'
      },
      {
        name: 'Storm Simulation Tests',
        file: 'storm-simulation.spec.ts',
        description: 'Intentional storm condition testing and prevention validation',
        priority: 'high',
        estimatedDuration: '10-15 minutes'
      },
      {
        name: 'Multi-Instance Concurrent Tests',
        file: 'multi-instance-concurrent.spec.ts',
        description: 'Multiple Claude instances running simultaneously',
        priority: 'medium',
        estimatedDuration: '15-20 minutes'
      },
      {
        name: 'Stress Testing',
        file: 'stress-testing.spec.ts',
        description: 'High-load scenarios and system limits testing',
        priority: 'medium',
        estimatedDuration: '20-30 minutes'
      },
      {
        name: 'Cross-Browser Validation',
        file: 'cross-browser-validation.spec.ts',
        description: 'Browser compatibility and device-specific testing',
        priority: 'low',
        estimatedDuration: '30-45 minutes'
      }
    ];

    this.browsers = ['chromium', 'firefox', 'webkit'];
    this.devices = ['Desktop Chrome', 'iPad Pro', 'iPhone 13'];
    
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suiteResults: [],
      startTime: null,
      endTime: null,
      duration: 0
    };
  }

  async run(options = {}) {
    const {
      browsers = this.browsers,
      suites = 'all',
      parallel = true,
      headless = true,
      generateReport = true,
      outputDir = './test-results/escape-sequence-storm',
      timeout = 300000, // 5 minutes per test file
      retries = 1
    } = options;

    console.log('🚀 Starting Escape Sequence Storm Prevention Test Suite');
    console.log('=' .repeat(80));
    
    this.results.startTime = new Date();
    
    try {
      // Create output directory
      await this.ensureOutputDirectory(outputDir);
      
      // Determine which test suites to run
      const suitesToRun = this.determineSuitesToRun(suites);
      
      console.log(`📊 Test Configuration:`);
      console.log(`   Browsers: ${browsers.join(', ')}`);
      console.log(`   Test Suites: ${suitesToRun.length}/${this.testSuites.length}`);
      console.log(`   Parallel Execution: ${parallel ? 'Yes' : 'No'}`);
      console.log(`   Headless Mode: ${headless ? 'Yes' : 'No'}`);
      console.log(`   Output Directory: ${outputDir}`);
      console.log();

      // Run test suites
      if (parallel) {
        await this.runTestsParallel(suitesToRun, browsers, {
          headless, timeout, retries, outputDir
        });
      } else {
        await this.runTestsSequential(suitesToRun, browsers, {
          headless, timeout, retries, outputDir
        });
      }

      // Generate comprehensive report
      if (generateReport) {
        await this.generateComprehensiveReport(outputDir);
      }

      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;

      // Print summary
      this.printSummary();

      // Return results for CI/CD integration
      return {
        success: this.results.failedTests === 0,
        results: this.results
      };

    } catch (error) {
      console.error('❌ Test runner failed:', error);
      throw error;
    }
  }

  determineSuitesToRun(suites) {
    if (suites === 'all') {
      return this.testSuites;
    }
    
    if (Array.isArray(suites)) {
      return this.testSuites.filter(suite => suites.includes(suite.name));
    }
    
    if (typeof suites === 'string') {
      const requestedSuites = suites.split(',').map(s => s.trim());
      return this.testSuites.filter(suite => 
        requestedSuites.includes(suite.name) || 
        requestedSuites.includes(suite.file)
      );
    }
    
    return this.testSuites;
  }

  async runTestsParallel(suitesToRun, browsers, options) {
    console.log('🔄 Running tests in parallel mode...\n');
    
    const testPromises = [];
    
    for (const suite of suitesToRun) {
      for (const browser of browsers) {
        testPromises.push(
          this.runSingleTest(suite, browser, options)
        );
      }
    }
    
    // Run all tests concurrently
    const results = await Promise.allSettled(testPromises);
    
    // Process results
    results.forEach((result, index) => {
      const suite = suitesToRun[Math.floor(index / browsers.length)];
      const browser = browsers[index % browsers.length];
      
      if (result.status === 'fulfilled') {
        this.results.suiteResults.push({
          suite: suite.name,
          browser,
          ...result.value
        });
      } else {
        console.error(`❌ Failed to run ${suite.name} on ${browser}:`, result.reason);
        this.results.suiteResults.push({
          suite: suite.name,
          browser,
          success: false,
          error: result.reason.message
        });
      }
    });
  }

  async runTestsSequential(suitesToRun, browsers, options) {
    console.log('🔄 Running tests in sequential mode...\n');
    
    for (const suite of suitesToRun) {
      console.log(`\n📋 Running Test Suite: ${suite.name}`);
      console.log(`   Description: ${suite.description}`);
      console.log(`   Estimated Duration: ${suite.estimatedDuration}`);
      
      for (const browser of browsers) {
        console.log(`\n🌐 Testing on ${browser}...`);
        
        try {
          const result = await this.runSingleTest(suite, browser, options);
          this.results.suiteResults.push({
            suite: suite.name,
            browser,
            ...result
          });
          
          if (result.success) {
            console.log(`   ✅ ${browser}: ${result.passed}/${result.total} tests passed`);
          } else {
            console.log(`   ❌ ${browser}: ${result.failed} tests failed`);
          }
        } catch (error) {
          console.error(`   ❌ ${browser}: Test execution failed -`, error.message);
          this.results.suiteResults.push({
            suite: suite.name,
            browser,
            success: false,
            error: error.message
          });
        }
      }
    }
  }

  async runSingleTest(suite, browser, options) {
    const { headless, timeout, retries, outputDir } = options;
    
    const testFile = path.join(__dirname, suite.file);
    const reportFile = path.join(outputDir, `${suite.name.replace(/\s+/g, '-').toLowerCase()}-${browser}-results.json`);
    
    const playwrightConfig = {
      testDir: __dirname,
      testMatch: suite.file,
      timeout,
      retries,
      use: {
        headless,
        browserName: browser
      },
      reporter: [
        ['json', { outputFile: reportFile }],
        ['line']
      ]
    };
    
    // Write temporary Playwright config
    const configFile = path.join(outputDir, `playwright-${suite.name}-${browser}.config.js`);
    await fs.writeFile(configFile, `module.exports = ${JSON.stringify(playwrightConfig, null, 2)};`);
    
    return new Promise((resolve, reject) => {
      const playwrightProcess = spawn('npx', ['playwright', 'test', '--config', configFile], {
        stdio: 'pipe',
        cwd: __dirname
      });
      
      let stdout = '';
      let stderr = '';
      
      playwrightProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      playwrightProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      playwrightProcess.on('close', async (code) => {
        try {
          // Parse results
          let testResults = { tests: [] };
          try {
            const reportContent = await fs.readFile(reportFile, 'utf8');
            testResults = JSON.parse(reportContent);
          } catch (parseError) {
            console.warn(`Warning: Could not parse results for ${suite.name} on ${browser}`);
          }
          
          const result = {
            success: code === 0,
            exitCode: code,
            total: testResults.tests?.length || 0,
            passed: testResults.tests?.filter(t => t.status === 'passed').length || 0,
            failed: testResults.tests?.filter(t => t.status === 'failed').length || 0,
            skipped: testResults.tests?.filter(t => t.status === 'skipped').length || 0,
            stdout,
            stderr,
            reportFile
          };
          
          // Update global results
          this.results.totalTests += result.total;
          this.results.passedTests += result.passed;
          this.results.failedTests += result.failed;
          this.results.skippedTests += result.skipped;
          
          // Cleanup temp config
          try {
            await fs.unlink(configFile);
          } catch (e) {
            // Ignore cleanup errors
          }
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      playwrightProcess.on('error', (error) => {
        reject(new Error(`Failed to start Playwright: ${error.message}`));
      });
    });
  }

  async ensureOutputDirectory(outputDir) {
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async generateComprehensiveReport(outputDir) {
    console.log('\n📊 Generating comprehensive test report...');
    
    const report = {
      summary: {
        testRun: {
          startTime: this.results.startTime,
          endTime: this.results.endTime,
          duration: this.results.duration
        },
        totals: {
          totalTests: this.results.totalTests,
          passedTests: this.results.passedTests,
          failedTests: this.results.failedTests,
          skippedTests: this.results.skippedTests,
          successRate: this.results.totalTests > 0 ? 
            ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2) : 0
        }
      },
      suiteResults: this.results.suiteResults,
      browserCompatibility: this.analyzeBrowserCompatibility(),
      stormPreventionEffectiveness: this.analyzeStormPrevention(),
      performanceMetrics: this.analyzePerformanceMetrics(),
      recommendations: this.generateRecommendations()
    };
    
    // Write JSON report
    const jsonReportPath = path.join(outputDir, 'comprehensive-report.json');
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));
    
    // Write HTML report
    const htmlReportPath = path.join(outputDir, 'comprehensive-report.html');
    await this.generateHTMLReport(report, htmlReportPath);
    
    console.log(`   ✅ JSON Report: ${jsonReportPath}`);
    console.log(`   ✅ HTML Report: ${htmlReportPath}`);
  }

  analyzeBrowserCompatibility() {
    const compatibility = {};
    
    for (const browser of this.browsers) {
      const browserResults = this.results.suiteResults.filter(r => r.browser === browser);
      const totalTests = browserResults.reduce((sum, r) => sum + (r.total || 0), 0);
      const passedTests = browserResults.reduce((sum, r) => sum + (r.passed || 0), 0);
      
      compatibility[browser] = {
        successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0,
        issues: browserResults.filter(r => !r.success).map(r => r.error).filter(Boolean)
      };
    }
    
    return compatibility;
  }

  analyzeStormPrevention() {
    const stormTests = this.results.suiteResults.filter(r => 
      r.suite.includes('Storm') || r.suite.includes('Stress')
    );
    
    return {
      totalStormTests: stormTests.length,
      successfulPrevention: stormTests.filter(r => r.success).length,
      failedPrevention: stormTests.filter(r => !r.success).length,
      effectivenessRate: stormTests.length > 0 ? 
        ((stormTests.filter(r => r.success).length / stormTests.length) * 100).toFixed(2) : 0
    };
  }

  analyzePerformanceMetrics() {
    // This would typically include actual performance data collected during tests
    return {
      averageTestDuration: this.results.duration / Math.max(this.results.suiteResults.length, 1),
      browserPerformance: this.browsers.reduce((acc, browser) => {
        const browserResults = this.results.suiteResults.filter(r => r.browser === browser);
        acc[browser] = {
          averageExecutionTime: 'N/A', // Would be calculated from actual metrics
          memoryUsage: 'N/A',
          resourceEfficiency: browserResults.filter(r => r.success).length / Math.max(browserResults.length, 1)
        };
        return acc;
      }, {})
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.failedTests > 0) {
      recommendations.push({
        type: 'fix',
        priority: 'high',
        description: `${this.results.failedTests} test(s) failed. Review failed tests and fix underlying issues.`
      });
    }
    
    const browserIssues = this.analyzeBrowserCompatibility();
    for (const [browser, data] of Object.entries(browserIssues)) {
      if (parseFloat(data.successRate) < 90) {
        recommendations.push({
          type: 'compatibility',
          priority: 'medium',
          description: `${browser} has lower success rate (${data.successRate}%). Consider browser-specific optimizations.`
        });
      }
    }
    
    const stormPrevention = this.analyzeStormPrevention();
    if (parseFloat(stormPrevention.effectivenessRate) < 95) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        description: `Storm prevention effectiveness is ${stormPrevention.effectivenessRate}%. Strengthen prevention mechanisms.`
      });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'success',
        priority: 'info',
        description: 'All tests passed successfully! The escape sequence storm prevention is working effectively.'
      });
    }
    
    return recommendations;
  }

  async generateHTMLReport(report, htmlPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Escape Sequence Storm Prevention Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { color: #27ae60; }
        .warning { color: #f39c12; }
        .error { color: #e74c3c; }
        .chart { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #34495e; color: white; }
        .recommendations { background: #ecf0f1; padding: 20px; border-radius: 8px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Escape Sequence Storm Prevention Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Test Duration: ${Math.round(report.summary.testRun.duration / 1000 / 60)} minutes</p>
    </div>

    <div class="summary">
        <div class="card">
            <h3>📊 Test Results</h3>
            <div class="success"><strong>${report.summary.totals.passedTests}</strong> Passed</div>
            <div class="error"><strong>${report.summary.totals.failedTests}</strong> Failed</div>
            <div class="warning"><strong>${report.summary.totals.skippedTests}</strong> Skipped</div>
            <div><strong>${report.summary.totals.successRate}%</strong> Success Rate</div>
        </div>

        <div class="card">
            <h3>🌐 Browser Compatibility</h3>
            ${Object.entries(report.browserCompatibility).map(([browser, data]) => `
                <div class="${parseFloat(data.successRate) > 90 ? 'success' : 'warning'}">
                    <strong>${browser}:</strong> ${data.successRate}%
                </div>
            `).join('')}
        </div>

        <div class="card">
            <h3>🛡️ Storm Prevention</h3>
            <div class="${parseFloat(report.stormPreventionEffectiveness.effectivenessRate) > 95 ? 'success' : 'error'}">
                <strong>${report.stormPreventionEffectiveness.effectivenessRate}%</strong> Effective
            </div>
            <div>${report.stormPreventionEffectiveness.successfulPrevention}/${report.stormPreventionEffectiveness.totalStormTests} Tests Passed</div>
        </div>
    </div>

    <div class="card">
        <h3>📋 Test Suite Results</h3>
        <table>
            <thead>
                <tr>
                    <th>Test Suite</th>
                    <th>Browser</th>
                    <th>Status</th>
                    <th>Passed</th>
                    <th>Failed</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${report.suiteResults.map(result => `
                    <tr>
                        <td>${result.suite}</td>
                        <td>${result.browser}</td>
                        <td class="${result.success ? 'success' : 'error'}">${result.success ? '✅ PASS' : '❌ FAIL'}</td>
                        <td>${result.passed || 0}</td>
                        <td>${result.failed || 0}</td>
                        <td>${result.total || 0}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="recommendations">
        <h3>💡 Recommendations</h3>
        ${report.recommendations.map(rec => `
            <div class="${rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'success'}">
                <strong>${rec.type.toUpperCase()}:</strong> ${rec.description}
            </div>
        `).join('')}
    </div>
</body>
</html>`;

    await fs.writeFile(htmlPath, html);
  }

  printSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`⏱️  Duration: ${Math.round(this.results.duration / 1000 / 60)} minutes`);
    console.log(`📈 Total Tests: ${this.results.totalTests}`);
    console.log(`✅ Passed: ${this.results.passedTests}`);
    console.log(`❌ Failed: ${this.results.failedTests}`);
    console.log(`⏭️  Skipped: ${this.results.skippedTests}`);
    
    const successRate = this.results.totalTests > 0 ? 
      ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2) : 0;
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    if (this.results.failedTests === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Escape sequence storm prevention is working correctly.');
    } else {
      console.log(`\n⚠️  ${this.results.failedTests} test(s) failed. Please review the detailed report.`);
    }
    
    console.log('='.repeat(80));
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--browsers') {
      options.browsers = args[++i].split(',');
    } else if (arg === '--suites') {
      options.suites = args[++i];
    } else if (arg === '--no-parallel') {
      options.parallel = false;
    } else if (arg === '--no-headless') {
      options.headless = false;
    } else if (arg === '--output-dir') {
      options.outputDir = args[++i];
    } else if (arg === '--timeout') {
      options.timeout = parseInt(args[++i]);
    } else if (arg === '--retries') {
      options.retries = parseInt(args[++i]);
    } else if (arg === '--help') {
      console.log(`
Usage: node run-all-tests.js [options]

Options:
  --browsers <list>     Comma-separated list of browsers (chromium,firefox,webkit)
  --suites <list>       Comma-separated list of test suites to run (or 'all')
  --no-parallel        Run tests sequentially instead of in parallel
  --no-headless        Run tests with browser UI visible
  --output-dir <dir>    Output directory for test results
  --timeout <ms>        Test timeout in milliseconds (default: 300000)
  --retries <n>         Number of retries for failed tests (default: 1)
  --help               Show this help message

Examples:
  node run-all-tests.js
  node run-all-tests.js --browsers chromium,firefox --suites "Main E2E Suite,Storm Simulation Tests"
  node run-all-tests.js --no-parallel --no-headless --timeout 600000
      `);
      process.exit(0);
    }
  }
  
  // Run tests
  const runner = new TestRunner();
  runner.run(options)
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = TestRunner;
/**
 * SSR/CSR Test Runner
 * Orchestrates all SSR/CSR compatibility tests and generates comprehensive reports
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class SSRCSRTestRunner {
  constructor() {
    this.testDir = __dirname;
    this.resultsDir = path.join(this.testDir, 'results');
    this.reportPath = path.join(this.resultsDir, 'comprehensive-ssr-csr-report.json');

    // Ensure results directory exists
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }

    this.testResults = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        testDirectory: this.testDir
      },
      tests: {},
      summary: {},
      recommendations: []
    };
  }

  /**
   * Check if servers are running
   */
  async checkServerStatus() {
    console.log('🔍 Checking server status...');

    const checkServer = (url) => {
      return new Promise((resolve) => {
        const http = require('http');
        const urlObj = new URL(url);

        const req = http.request({
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname,
          method: 'GET',
          timeout: 5000
        }, (res) => {
          resolve(res.statusCode === 200);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => resolve(false));
        req.end();
      });
    };

    const frontendRunning = await checkServer('http://localhost:3000');
    const backendRunning = await checkServer('http://localhost:3001');

    this.testResults.environment.servers = {
      frontend: frontendRunning,
      backend: backendRunning
    };

    if (!frontendRunning) {
      throw new Error('Frontend server (port 3000) is not running. Please start with: npm run dev');
    }

    if (!backendRunning) {
      console.warn('⚠️ Backend server (port 3001) is not running. Some tests may fail.');
    }

    console.log(`✅ Frontend server: ${frontendRunning ? 'Running' : 'Not running'}`);
    console.log(`✅ Backend server: ${backendRunning ? 'Running' : 'Not running'}`);
  }

  /**
   * Run Playwright SSR/Hydration tests
   */
  async runPlaywrightTests() {
    console.log('🎭 Running Playwright SSR/Hydration tests...');

    return new Promise((resolve) => {
      const playwrightTest = spawn('npx', [
        'playwright',
        'test',
        path.join(this.testDir, 'ssr-hydration-validation.spec.js'),
        '--reporter=json'
      ], {
        stdio: 'pipe',
        cwd: path.resolve(this.testDir, '../..')
      });

      let output = '';
      let errorOutput = '';

      playwrightTest.stdout.on('data', (data) => {
        output += data.toString();
      });

      playwrightTest.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      playwrightTest.on('close', (code) => {
        const result = {
          exitCode: code,
          passed: code === 0,
          output,
          errorOutput,
          tests: []
        };

        // Try to parse Playwright JSON output
        try {
          const lines = output.split('\n');
          const jsonLine = lines.find(line => line.trim().startsWith('{') && line.includes('tests'));
          if (jsonLine) {
            const jsonResult = JSON.parse(jsonLine);
            result.tests = jsonResult.tests || [];
            result.stats = jsonResult.stats || {};
          }
        } catch (parseError) {
          console.log('Could not parse Playwright JSON output, using raw output');
        }

        this.testResults.tests.playwright = result;
        resolve(result);
      });
    });
  }

  /**
   * Run comprehensive SSR/CSR test suite
   */
  async runComprehensiveTests() {
    console.log('🧪 Running comprehensive SSR/CSR tests...');

    return new Promise((resolve) => {
      const comprehensiveTest = spawn('node', [
        path.join(this.testDir, 'ssr-csr-comprehensive-test-suite.js')
      ], {
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      comprehensiveTest.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(text);
        output += text;
      });

      comprehensiveTest.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      comprehensiveTest.on('close', (code) => {
        const result = {
          exitCode: code,
          passed: code === 0,
          output,
          errorOutput
        };

        // Try to load the generated report
        try {
          const reportPath = path.join(this.testDir, 'ssr-csr-test-report.json');
          if (fs.existsSync(reportPath)) {
            result.detailedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
          }
        } catch (reportError) {
          console.log('Could not load detailed test report');
        }

        this.testResults.tests.comprehensive = result;
        resolve(result);
      });
    });
  }

  /**
   * Run performance comparison tests
   */
  async runPerformanceTests() {
    console.log('⚡ Running performance comparison tests...');

    return new Promise((resolve) => {
      const performanceTest = spawn('node', [
        path.join(this.testDir, 'performance-comparison-test.js')
      ], {
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      performanceTest.stdout.on('data', (data) => {
        const text = data.toString();
        console.log(text);
        output += text;
      });

      performanceTest.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      performanceTest.on('close', (code) => {
        const result = {
          exitCode: code,
          passed: code === 0,
          output,
          errorOutput
        };

        // Try to load the performance report
        try {
          const perfReportPath = path.join(this.testDir, 'performance-comparison-report.json');
          if (fs.existsSync(perfReportPath)) {
            result.performanceReport = JSON.parse(fs.readFileSync(perfReportPath, 'utf8'));
          }
        } catch (reportError) {
          console.log('Could not load performance report');
        }

        this.testResults.tests.performance = result;
        resolve(result);
      });
    });
  }

  /**
   * Analyze test results and generate summary
   */
  generateSummary() {
    console.log('📊 Generating test summary...');

    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      overallStatus: 'UNKNOWN',
      criticalIssues: [],
      performanceStatus: 'UNKNOWN',
      recommendations: []
    };

    // Analyze Playwright tests
    if (this.testResults.tests.playwright) {
      const playwrightPassed = this.testResults.tests.playwright.passed;
      summary.totalTests += 1;
      if (playwrightPassed) {
        summary.passedTests += 1;
      } else {
        summary.failedTests += 1;
        summary.criticalIssues.push('Playwright SSR/Hydration tests failed');
      }
    }

    // Analyze comprehensive tests
    if (this.testResults.tests.comprehensive?.detailedReport) {
      const compReport = this.testResults.tests.comprehensive.detailedReport;
      summary.totalTests += compReport.summary.totalTests || 0;
      summary.passedTests += compReport.summary.passedTests || 0;
      summary.failedTests += compReport.summary.failedTests || 0;

      if (compReport.summary.overallStatus === 'FAILED') {
        summary.criticalIssues.push('Comprehensive SSR/CSR tests failed');
      }

      if (compReport.recommendations) {
        summary.recommendations.push(...compReport.recommendations);
      }
    }

    // Analyze performance tests
    if (this.testResults.tests.performance?.performanceReport) {
      const perfReport = this.testResults.tests.performance.performanceReport;
      summary.performanceStatus = perfReport.summary.overallRecommendation || 'UNKNOWN';

      if (perfReport.summary.overallRecommendation === 'NEEDS_OPTIMIZATION') {
        summary.criticalIssues.push('Performance optimization needed');
      }

      if (perfReport.analysis?.recommendations) {
        summary.recommendations.push(...perfReport.analysis.recommendations);
      }
    }

    // Determine overall status
    if (summary.criticalIssues.length === 0 && summary.failedTests === 0) {
      summary.overallStatus = 'PASSED';
    } else if (summary.criticalIssues.length > 2 || summary.failedTests > summary.passedTests) {
      summary.overallStatus = 'FAILED';
    } else {
      summary.overallStatus = 'PARTIAL';
    }

    this.testResults.summary = summary;
    return summary;
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport() {
    const summary = this.testResults.summary;

    const report = {
      title: 'SSR/CSR Compatibility Validation Report',
      timestamp: this.testResults.timestamp,
      summary: {
        overallStatus: summary.overallStatus,
        testResults: `${summary.passedTests}/${summary.totalTests} tests passed`,
        performanceStatus: summary.performanceStatus,
        criticalIssues: summary.criticalIssues.length
      },
      findings: {
        ssrCompatibility: this.analyzeSSRCompatibility(),
        csrFunctionality: this.analyzeCSRFunctionality(),
        performanceImpact: this.analyzePerformanceImpact(),
        errorHandling: this.analyzeErrorHandling()
      },
      recommendations: {
        immediate: this.getImmediateRecommendations(),
        future: this.getFutureRecommendations()
      },
      technicalDetails: this.testResults
    };

    return report;
  }

  analyzeSSRCompatibility() {
    const comprehensive = this.testResults.tests.comprehensive?.detailedReport;
    if (!comprehensive) return { status: 'UNKNOWN', details: 'No comprehensive test data available' };

    const ssrRendering = comprehensive.details.ssrRendering;
    const issues = [];

    if (!ssrRendering?.homepage?.passed) {
      issues.push('Homepage SSR rendering failed');
    }
    if (!ssrRendering?.agentsPage?.passed) {
      issues.push('Agents page SSR rendering failed');
    }
    if (ssrRendering?.documentErrors?.length > 0) {
      issues.push('Document errors detected during SSR');
    }

    return {
      status: issues.length === 0 ? 'GOOD' : 'NEEDS_ATTENTION',
      issues,
      details: ssrRendering
    };
  }

  analyzeCSRFunctionality() {
    const comprehensive = this.testResults.tests.comprehensive?.detailedReport;
    if (!comprehensive) return { status: 'UNKNOWN', details: 'No comprehensive test data available' };

    const hydration = comprehensive.details.clientHydration;
    const navigation = comprehensive.details.routeNavigation;
    const issues = [];

    if (!hydration?.hydrationComplete) {
      issues.push('Client-side hydration failed');
    }
    if (!hydration?.reactMounted) {
      issues.push('React failed to mount properly');
    }
    if (!navigation?.browserNavigation) {
      issues.push('Browser navigation not working after hydration');
    }

    return {
      status: issues.length === 0 ? 'GOOD' : 'NEEDS_ATTENTION',
      issues,
      details: { hydration, navigation }
    };
  }

  analyzePerformanceImpact() {
    const performance = this.testResults.tests.performance?.performanceReport;
    if (!performance) return { status: 'UNKNOWN', details: 'No performance data available' };

    return {
      status: performance.summary.overallRecommendation,
      ssrPerformance: performance.summary.ssrPerformance,
      csrPerformance: performance.summary.csrPerformance,
      details: performance.metrics
    };
  }

  analyzeErrorHandling() {
    const comprehensive = this.testResults.tests.comprehensive?.detailedReport;
    if (!comprehensive) return { status: 'UNKNOWN', details: 'No comprehensive test data available' };

    const errorHandling = comprehensive.details.errorHandling;
    const issues = [];

    if (!errorHandling?.errorBoundaryWorks) {
      issues.push('Error boundaries not functioning properly');
    }
    if (errorHandling?.consoleErrors?.length > 0) {
      issues.push(`${errorHandling.consoleErrors.length} console errors detected`);
    }

    return {
      status: issues.length === 0 ? 'GOOD' : 'NEEDS_ATTENTION',
      issues,
      details: errorHandling
    };
  }

  getImmediateRecommendations() {
    const recommendations = [];
    const criticalIssues = this.testResults.summary.criticalIssues;

    if (criticalIssues.includes('Playwright SSR/Hydration tests failed')) {
      recommendations.push('Fix SSR rendering and hydration issues immediately');
    }

    if (criticalIssues.includes('Performance optimization needed')) {
      recommendations.push('Optimize loading performance - current metrics exceed acceptable thresholds');
    }

    if (this.testResults.summary.failedTests > 0) {
      recommendations.push('Address failing test cases to ensure SSR/CSR compatibility');
    }

    return recommendations;
  }

  getFutureRecommendations() {
    const recommendations = [
      'Implement continuous monitoring of SSR/CSR performance',
      'Add automated regression testing for SSR compatibility',
      'Consider implementing service worker for improved performance',
      'Monitor and optimize bundle size impact on performance',
      'Set up performance budgets for load time and hydration time'
    ];

    return recommendations;
  }

  /**
   * Save comprehensive report
   */
  saveReport(report) {
    fs.writeFileSync(this.reportPath, JSON.stringify(report, null, 2));

    // Also save a markdown version for easier reading
    const markdownPath = path.join(this.resultsDir, 'ssr-csr-validation-report.md');
    const markdown = this.generateMarkdownReport(report);
    fs.writeFileSync(markdownPath, markdown);

    console.log(`\n📄 Comprehensive report saved to: ${this.reportPath}`);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }

  generateMarkdownReport(report) {
    return `# SSR/CSR Compatibility Validation Report

Generated: ${report.timestamp}

## Summary

- **Overall Status:** ${report.summary.overallStatus}
- **Test Results:** ${report.summary.testResults}
- **Performance Status:** ${report.summary.performanceStatus}
- **Critical Issues:** ${report.summary.criticalIssues}

## Findings

### SSR Compatibility
- **Status:** ${report.findings.ssrCompatibility.status}
- **Issues:** ${report.findings.ssrCompatibility.issues.join(', ') || 'None'}

### CSR Functionality
- **Status:** ${report.findings.csrFunctionality.status}
- **Issues:** ${report.findings.csrFunctionality.issues.join(', ') || 'None'}

### Performance Impact
- **Status:** ${report.findings.performanceImpact.status}
- **SSR Performance:** ${report.findings.performanceImpact.ssrPerformance}
- **CSR Performance:** ${report.findings.performanceImpact.csrPerformance}

### Error Handling
- **Status:** ${report.findings.errorHandling.status}
- **Issues:** ${report.findings.errorHandling.issues.join(', ') || 'None'}

## Recommendations

### Immediate Actions
${report.recommendations.immediate.map(rec => `- ${rec}`).join('\n')}

### Future Improvements
${report.recommendations.future.map(rec => `- ${rec}`).join('\n')}

---
*Report generated by SSR/CSR Test Suite*
`;
  }

  /**
   * Run all tests and generate report
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive SSR/CSR validation...');
    console.log('=' .repeat(60));

    try {
      // Check server status
      await this.checkServerStatus();

      // Run all test suites
      await this.runPlaywrightTests();
      await this.runComprehensiveTests();
      await this.runPerformanceTests();

      // Generate summary and report
      this.generateSummary();
      const report = this.generateValidationReport();

      // Save report
      this.saveReport(report);

      // Print final summary
      console.log('\n' + '=' .repeat(60));
      console.log('🎯 FINAL VALIDATION SUMMARY');
      console.log('=' .repeat(60));
      console.log(`📊 Overall Status: ${report.summary.overallStatus}`);
      console.log(`✅ Test Results: ${report.summary.testResults}`);
      console.log(`⚡ Performance: ${report.summary.performanceStatus}`);
      console.log(`🚨 Critical Issues: ${report.summary.criticalIssues}`);

      if (report.recommendations.immediate.length > 0) {
        console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
        report.recommendations.immediate.forEach(rec => console.log(`  - ${rec}`));
      }

      return report;

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      throw error;
    }
  }
}

// Export for use in other files
module.exports = SSRCSRTestRunner;

// Run if called directly
if (require.main === module) {
  (async () => {
    const runner = new SSRCSRTestRunner();
    try {
      const report = await runner.runAllTests();
      process.exit(report.summary.overallStatus === 'PASSED' ? 0 : 1);
    } catch (error) {
      console.error('Test runner failed:', error.message);
      process.exit(1);
    }
  })();
}
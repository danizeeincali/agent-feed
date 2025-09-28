/**
 * SSR Comprehensive Test Runner
 *
 * This test runner orchestrates all SSR compatibility tests and generates
 * a comprehensive validation report.
 *
 * Test Requirements:
 * 1. Runs all SSR compatibility tests in sequence
 * 2. Validates API integration remains functional
 * 3. Generates comprehensive compatibility report
 * 4. Provides executive summary with pass/fail status
 */

const SSRBrowserRouterTester = require('./ssr-browser-router-test');
const DynamicImportValidator = require('./dynamic-import-validation');
const ClientHydrationTester = require('./client-hydration-test');
const fs = require('fs');
const path = require('path');

class SSRComprehensiveTestRunner {
  constructor() {
    this.testResults = {
      overview: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        overallStatus: 'PENDING',
        executionTime: 0,
        timestamp: new Date().toISOString()
      },
      testSuites: {
        ssrBrowserRouter: null,
        dynamicImport: null,
        clientHydration: null,
        apiIntegration: null
      },
      ssrCompatibility: {
        hasDocumentErrors: false,
        hasWindowErrors: false,
        hasSSRErrors: false,
        browserRouterClientOnly: false,
        dynamicImportWorking: false,
        hydrationSuccessful: false,
        apiEndpointsAccessible: false
      },
      recommendations: [],
      executiveSummary: ''
    };
    this.errors = [];
  }

  async runAllTests() {
    console.log('🚀 Starting SSR Comprehensive Test Suite...\n');
    console.log('========================================\n');

    const startTime = Date.now();

    try {
      // Test Suite 1: SSR Browser Router Compatibility
      console.log('📋 Test Suite 1: SSR Browser Router Compatibility');
      console.log('─'.repeat(50));
      const ssrTester = new SSRBrowserRouterTester();
      this.testResults.testSuites.ssrBrowserRouter = await ssrTester.runTests();

      console.log('\n');

      // Test Suite 2: Dynamic Import Validation
      console.log('📋 Test Suite 2: Dynamic Import Validation');
      console.log('─'.repeat(50));
      const importValidator = new DynamicImportValidator();
      this.testResults.testSuites.dynamicImport = await importValidator.runTests();

      console.log('\n');

      // Test Suite 3: Client Hydration Testing
      console.log('📋 Test Suite 3: Client Hydration Testing');
      console.log('─'.repeat(50));
      const hydrationTester = new ClientHydrationTester();
      this.testResults.testSuites.clientHydration = await hydrationTester.runTests();

      console.log('\n');

      // Test Suite 4: API Integration Validation
      console.log('📋 Test Suite 4: API Integration Validation');
      console.log('─'.repeat(50));
      await this.validateAPIIntegration();

      // Calculate execution time
      this.testResults.overview.executionTime = Date.now() - startTime;

      // Analyze results and generate report
      this.analyzeResults();
      this.generateExecutiveSummary();
      this.generateRecommendations();
      this.saveComprehensiveReport();

      console.log('\n');
      console.log('🏁 SSR Comprehensive Test Suite Completed!');
      console.log('==========================================');

    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      this.errors.push(`Test suite execution failed: ${error.message}`);
      this.testResults.overview.overallStatus = 'FAILED';
    }

    return this.testResults;
  }

  async validateAPIIntegration() {
    console.log('🧪 API Integration Validation');

    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track API responses
      const apiResponses = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('/api/')) {
          apiResponses.push({
            url,
            status: response.status(),
            method: response.request().method(),
            timestamp: Date.now()
          });
        }
      });

      // Test API endpoints directly
      const apiTests = [];

      // Test 1: Agents API
      try {
        const agentsResponse = await page.goto('http://localhost:3000/api/agents', {
          waitUntil: 'networkidle0',
          timeout: 10000
        });

        apiTests.push({
          endpoint: '/api/agents',
          status: agentsResponse.status(),
          accessible: agentsResponse.status() < 500,
          responseTime: Date.now()
        });
      } catch (error) {
        apiTests.push({
          endpoint: '/api/agents',
          status: 0,
          accessible: false,
          error: error.message
        });
      }

      // Test 2: Activities API
      try {
        const activitiesResponse = await page.goto('http://localhost:3000/api/activities', {
          waitUntil: 'networkidle0',
          timeout: 10000
        });

        apiTests.push({
          endpoint: '/api/activities',
          status: activitiesResponse.status(),
          accessible: activitiesResponse.status() < 500,
          responseTime: Date.now()
        });
      } catch (error) {
        apiTests.push({
          endpoint: '/api/activities',
          status: 0,
          accessible: false,
          error: error.message
        });
      }

      // Test 3: Main app with API integration
      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for app to load and potentially make API calls
      await page.waitForTimeout(5000);

      // Check if app made any successful API calls
      const successfulApiCalls = apiResponses.filter(response => response.status < 400);
      const failedApiCalls = apiResponses.filter(response => response.status >= 400);

      const accessibleEndpoints = apiTests.filter(test => test.accessible);
      const testPassed = accessibleEndpoints.length > 0;

      this.testResults.testSuites.apiIntegration = {
        passed: testPassed,
        apiResponses: apiResponses.length,
        successfulApiCalls: successfulApiCalls.length,
        failedApiCalls: failedApiCalls.length,
        accessibleEndpoints: accessibleEndpoints.length,
        totalEndpoints: apiTests.length,
        details: {
          apiTests,
          apiResponses,
          successfulApiCalls,
          failedApiCalls
        }
      };

      await browser.close();

      console.log(`   ✅ API Integration: ${testPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Accessible Endpoints: ${accessibleEndpoints.length}/${apiTests.length}`);
      console.log(`   📊 Successful API Calls: ${successfulApiCalls.length}`);
      console.log(`   📊 Failed API Calls: ${failedApiCalls.length}\n`);

    } catch (error) {
      console.log(`   ❌ API Integration Validation: FAILED - ${error.message}\n`);
      this.testResults.testSuites.apiIntegration = {
        passed: false,
        error: error.message
      };
      this.errors.push(`API Integration Validation: ${error.message}`);
    }
  }

  analyzeResults() {
    const testSuites = this.testResults.testSuites;

    // Count total tests and successes
    let totalTests = 0;
    let passedTests = 0;

    Object.values(testSuites).forEach(suite => {
      if (suite && typeof suite === 'object') {
        totalTests++;
        if (suite.passed === true) {
          passedTests++;
        }
      }
    });

    this.testResults.overview.totalTests = totalTests;
    this.testResults.overview.passedTests = passedTests;
    this.testResults.overview.failedTests = totalTests - passedTests;
    this.testResults.overview.overallStatus = passedTests === totalTests ? 'PASSED' : 'FAILED';

    // Analyze SSR compatibility indicators
    const compatibility = this.testResults.ssrCompatibility;

    // Check for document/window errors
    if (testSuites.ssrBrowserRouter?.testResults?.documentWindowErrors) {
      const docErrors = testSuites.ssrBrowserRouter.testResults.documentWindowErrors;
      compatibility.hasDocumentErrors = docErrors.documentErrors > 0;
      compatibility.hasWindowErrors = docErrors.windowErrors > 0;
      compatibility.hasSSRErrors = docErrors.criticalErrors > 0;
    }

    // Check browser router client-only
    if (testSuites.ssrBrowserRouter?.testResults?.browserRouterClientOnly) {
      compatibility.browserRouterClientOnly = testSuites.ssrBrowserRouter.testResults.browserRouterClientOnly.passed;
    }

    // Check dynamic import functionality
    if (testSuites.dynamicImport?.testResults?.dynamicImportValidation) {
      compatibility.dynamicImportWorking = testSuites.dynamicImport.testResults.dynamicImportValidation.passed;
    }

    // Check hydration success
    if (testSuites.clientHydration?.testResults?.hydrationProcess) {
      compatibility.hydrationSuccessful = testSuites.clientHydration.testResults.hydrationProcess.passed;
    }

    // Check API accessibility
    if (testSuites.apiIntegration) {
      compatibility.apiEndpointsAccessible = testSuites.apiIntegration.passed;
    }
  }

  generateExecutiveSummary() {
    const { overview, ssrCompatibility } = this.testResults;
    const passRate = (overview.passedTests / overview.totalTests * 100).toFixed(1);

    let summary = `SSR COMPATIBILITY VALIDATION EXECUTIVE SUMMARY\n`;
    summary += `=============================================\n\n`;
    summary += `Overall Status: ${overview.overallStatus}\n`;
    summary += `Pass Rate: ${passRate}% (${overview.passedTests}/${overview.totalTests} test suites)\n`;
    summary += `Execution Time: ${(overview.executionTime / 1000).toFixed(2)} seconds\n`;
    summary += `Test Date: ${overview.timestamp}\n\n`;

    summary += `SSR COMPATIBILITY CHECKLIST:\n`;
    summary += `✓ = Pass, ✗ = Fail, ⚠ = Warning\n\n`;
    summary += `${ssrCompatibility.hasDocumentErrors ? '✗' : '✓'} No "document is not defined" errors\n`;
    summary += `${ssrCompatibility.hasWindowErrors ? '✗' : '✓'} No "window is not defined" errors\n`;
    summary += `${ssrCompatibility.hasSSRErrors ? '✗' : '✓'} No critical SSR errors\n`;
    summary += `${ssrCompatibility.browserRouterClientOnly ? '✓' : '✗'} BrowserRouter client-only initialization\n`;
    summary += `${ssrCompatibility.dynamicImportWorking ? '✓' : '✗'} Dynamic imports functioning properly\n`;
    summary += `${ssrCompatibility.hydrationSuccessful ? '✓' : '✗'} Client-side hydration successful\n`;
    summary += `${ssrCompatibility.apiEndpointsAccessible ? '✓' : '✗'} API endpoints accessible and functional\n\n`;

    if (overview.overallStatus === 'PASSED') {
      summary += `✅ CONCLUSION: Application is SSR-compatible and ready for production deployment.\n`;
      summary += `All critical SSR requirements have been met and validated.\n`;
    } else {
      summary += `❌ CONCLUSION: Application has SSR compatibility issues that need to be addressed.\n`;
      summary += `Review the detailed test results and recommendations for remediation steps.\n`;
    }

    this.testResults.executiveSummary = summary;

    console.log('\n📊 EXECUTIVE SUMMARY:');
    console.log('=====================');
    console.log(summary);
  }

  generateRecommendations() {
    const { ssrCompatibility, testSuites } = this.testResults;
    const recommendations = [];

    if (ssrCompatibility.hasDocumentErrors) {
      recommendations.push({
        priority: 'HIGH',
        category: 'SSR Errors',
        issue: 'Document errors detected',
        recommendation: 'Wrap all DOM-dependent code in useEffect hooks or client-side checks (typeof document !== "undefined")',
        codeExample: 'if (typeof document !== "undefined") { /* DOM code here */ }'
      });
    }

    if (ssrCompatibility.hasWindowErrors) {
      recommendations.push({
        priority: 'HIGH',
        category: 'SSR Errors',
        issue: 'Window errors detected',
        recommendation: 'Add window checks before accessing window object',
        codeExample: 'if (typeof window !== "undefined") { /* window code here */ }'
      });
    }

    if (!ssrCompatibility.browserRouterClientOnly) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Routing',
        issue: 'BrowserRouter not properly client-only',
        recommendation: 'Ensure BrowserRouter is wrapped in dynamic import with ssr: false',
        codeExample: 'const Router = dynamic(() => import("react-router-dom"), { ssr: false });'
      });
    }

    if (!ssrCompatibility.dynamicImportWorking) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Dynamic Imports',
        issue: 'Dynamic imports not functioning properly',
        recommendation: 'Verify Next.js dynamic import configuration and loading fallbacks',
        codeExample: 'const Component = dynamic(() => import("./Component"), { ssr: false, loading: () => <div>Loading...</div> });'
      });
    }

    if (!ssrCompatibility.hydrationSuccessful) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Hydration',
        issue: 'Client-side hydration failing',
        recommendation: 'Check for hydration mismatches and ensure server/client render same content',
        codeExample: 'Use suppressHydrationWarning={true} sparingly and only for acceptable differences'
      });
    }

    if (!ssrCompatibility.apiEndpointsAccessible) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'API Integration',
        issue: 'API endpoints not accessible',
        recommendation: 'Verify API server is running and endpoints are properly configured',
        codeExample: 'Check next.config.js rewrites and ensure backend server is running on correct port'
      });
    }

    // Performance recommendations
    if (testSuites.clientHydration?.testResults?.performanceMetrics) {
      const perf = testSuites.clientHydration.testResults.performanceMetrics;
      if (perf.navigationTime > 5000) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'Performance',
          issue: 'Slow page load time',
          recommendation: 'Optimize bundle size and implement code splitting',
          codeExample: 'Use React.lazy() and Suspense for code splitting large components'
        });
      }
    }

    // General SSR best practices
    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'LOW',
        category: 'Best Practices',
        issue: 'All tests passed',
        recommendation: 'Consider implementing additional performance optimizations',
        codeExample: 'Add static generation where possible and optimize images'
      });
    }

    this.testResults.recommendations = recommendations;

    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`);
      console.log(`   → ${rec.recommendation}`);
      if (rec.codeExample) {
        console.log(`   💻 ${rec.codeExample}`);
      }
      console.log('');
    });
  }

  saveComprehensiveReport() {
    const reportPath = path.join(__dirname, 'ssr-comprehensive-test-report.json');
    const summaryPath = path.join(__dirname, 'ssr-executive-summary.txt');

    // Save detailed JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));

    // Save executive summary as text
    fs.writeFileSync(summaryPath, this.testResults.executiveSummary);

    console.log('\n📄 REPORTS GENERATED:');
    console.log('=====================');
    console.log(`Detailed Report: ${reportPath}`);
    console.log(`Executive Summary: ${summaryPath}`);

    // Also save to root tests directory for easy access
    const rootReportPath = path.join(__dirname, '../../ssr-compatibility-validation-report.json');
    fs.writeFileSync(rootReportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`Root Report: ${rootReportPath}`);
  }
}

// Run comprehensive tests if called directly
if (require.main === module) {
  const runner = new SSRComprehensiveTestRunner();
  runner.runAllTests().then(() => {
    const exitCode = runner.testResults.overview.overallStatus === 'PASSED' ? 0 : 1;
    console.log(`\n🏁 Test execution completed with exit code: ${exitCode}`);
    process.exit(exitCode);
  }).catch(error => {
    console.error('❌ Comprehensive test execution failed:', error);
    process.exit(1);
  });
}

module.exports = SSRComprehensiveTestRunner;
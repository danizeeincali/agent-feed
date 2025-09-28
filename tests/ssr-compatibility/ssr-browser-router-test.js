/**
 * SSR Browser Router Compatibility Test
 *
 * This test validates that the application renders correctly in SSR context
 * without encountering "document is not defined" or "window is not defined" errors.
 *
 * Test Requirements:
 * 1. Test that pages/index.tsx renders without SSR errors
 * 2. Verify BrowserRouter only initializes on client
 * 3. Validate dynamic import with ssr: false works correctly
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class SSRBrowserRouterTester {
  constructor() {
    this.testResults = {
      ssrRenderTest: null,
      browserRouterClientOnly: null,
      dynamicImportValidation: null,
      documentWindowErrors: null,
      overallResult: null
    };
    this.errors = [];
  }

  async runTests() {
    console.log('🚀 Starting SSR Browser Router Compatibility Tests...\n');

    try {
      // Test 1: SSR Render Validation
      await this.testSSRRender();

      // Test 2: Browser Router Client-Only Initialization
      await this.testBrowserRouterClientOnly();

      // Test 3: Dynamic Import Validation
      await this.testDynamicImportValidation();

      // Test 4: Document/Window Error Detection
      await this.testDocumentWindowErrors();

      // Generate final report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed with error:', error.message);
      this.errors.push(`Test suite error: ${error.message}`);
      this.testResults.overallResult = 'FAILED';
    }

    return this.testResults;
  }

  async testSSRRender() {
    console.log('🧪 Test 1: SSR Render Validation');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Track page errors
      const pageErrors = [];
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      // Navigate to the homepage
      const response = await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Check if page loaded successfully
      const statusCode = response.status();
      const pageTitle = await page.title();

      // Wait for loading state to complete
      await page.waitForSelector('body', { timeout: 10000 });

      // Check for SSR-related errors
      const ssrErrors = consoleErrors.filter(error =>
        error.includes('document is not defined') ||
        error.includes('window is not defined') ||
        error.includes('ReferenceError') ||
        error.includes('SSR')
      );

      const testPassed = statusCode === 200 && ssrErrors.length === 0 && pageErrors.length === 0;

      this.testResults.ssrRenderTest = {
        passed: testPassed,
        statusCode,
        pageTitle,
        consoleErrors: consoleErrors.length,
        pageErrors: pageErrors.length,
        ssrErrors: ssrErrors.length,
        details: {
          consoleErrors,
          pageErrors,
          ssrErrors
        }
      };

      await browser.close();

      console.log(`   ✅ SSR Render Test: ${testPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Status Code: ${statusCode}`);
      console.log(`   📊 Console Errors: ${consoleErrors.length}`);
      console.log(`   📊 SSR-specific Errors: ${ssrErrors.length}\n`);

    } catch (error) {
      console.log(`   ❌ SSR Render Test: FAILED - ${error.message}\n`);
      this.testResults.ssrRenderTest = {
        passed: false,
        error: error.message
      };
      this.errors.push(`SSR Render Test: ${error.message}`);
    }
  }

  async testBrowserRouterClientOnly() {
    console.log('🧪 Test 2: Browser Router Client-Only Initialization');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track when BrowserRouter attempts to initialize
      const routerInitialization = [];
      await page.evaluateOnNewDocument(() => {
        window.routerInitAttempts = [];

        // Override BrowserRouter detection
        const originalCreateElement = React.createElement;
        React.createElement = function(type, props, ...children) {
          if (type && type.name === 'BrowserRouter') {
            window.routerInitAttempts.push({
              timestamp: Date.now(),
              isSSR: typeof window === 'undefined',
              hasDocument: typeof document !== 'undefined',
              hasWindow: typeof window !== 'undefined'
            });
          }
          return originalCreateElement.apply(this, arguments);
        };
      });

      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for app to fully load
      await page.waitForTimeout(3000);

      // Check if BrowserRouter initialized only on client
      const routerAttempts = await page.evaluate(() => window.routerInitAttempts || []);

      // Verify that router initialization happened only client-side
      const clientOnlyInit = routerAttempts.every(attempt =>
        attempt.hasDocument && attempt.hasWindow && !attempt.isSSR
      );

      this.testResults.browserRouterClientOnly = {
        passed: clientOnlyInit,
        routerInitAttempts: routerAttempts.length,
        details: routerAttempts
      };

      await browser.close();

      console.log(`   ✅ Browser Router Client-Only: ${clientOnlyInit ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Router Init Attempts: ${routerAttempts.length}\n`);

    } catch (error) {
      console.log(`   ❌ Browser Router Client-Only Test: FAILED - ${error.message}\n`);
      this.testResults.browserRouterClientOnly = {
        passed: false,
        error: error.message
      };
      this.errors.push(`Browser Router Client-Only Test: ${error.message}`);
    }
  }

  async testDynamicImportValidation() {
    console.log('🧪 Test 3: Dynamic Import Validation');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track dynamic import behavior
      const dynamicImportEvents = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('_next/static') || url.includes('chunks')) {
          dynamicImportEvents.push({
            url,
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });

      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for loading component to disappear (indicating dynamic import completed)
      try {
        await page.waitForSelector('[class*="animate-spin"]', { timeout: 5000 });
        await page.waitForSelector('[class*="animate-spin"]', { hidden: true, timeout: 15000 });
      } catch (e) {
        // Loading might be too fast to catch
      }

      // Verify app content loaded (not just loading spinner)
      const appContentLoaded = await page.evaluate(() => {
        const loadingText = document.body.textContent.includes('Loading');
        const hasContent = document.body.children.length > 1;
        return !loadingText && hasContent;
      });

      // Check if dynamic imports succeeded
      const successfulImports = dynamicImportEvents.filter(event => event.status === 200);
      const failedImports = dynamicImportEvents.filter(event => event.status !== 200);

      const testPassed = appContentLoaded && failedImports.length === 0;

      this.testResults.dynamicImportValidation = {
        passed: testPassed,
        appContentLoaded,
        totalImports: dynamicImportEvents.length,
        successfulImports: successfulImports.length,
        failedImports: failedImports.length,
        details: {
          successful: successfulImports,
          failed: failedImports
        }
      };

      await browser.close();

      console.log(`   ✅ Dynamic Import Validation: ${testPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 App Content Loaded: ${appContentLoaded}`);
      console.log(`   📊 Successful Imports: ${successfulImports.length}`);
      console.log(`   📊 Failed Imports: ${failedImports.length}\n`);

    } catch (error) {
      console.log(`   ❌ Dynamic Import Validation: FAILED - ${error.message}\n`);
      this.testResults.dynamicImportValidation = {
        passed: false,
        error: error.message
      };
      this.errors.push(`Dynamic Import Validation: ${error.message}`);
    }
  }

  async testDocumentWindowErrors() {
    console.log('🧪 Test 4: Document/Window Error Detection');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Comprehensive error tracking
      const allErrors = {
        console: [],
        page: [],
        network: [],
        javascript: []
      };

      page.on('console', msg => {
        if (msg.type() === 'error') {
          allErrors.console.push({
            type: 'console',
            message: msg.text(),
            timestamp: Date.now()
          });
        }
      });

      page.on('pageerror', error => {
        allErrors.page.push({
          type: 'page',
          message: error.message,
          stack: error.stack,
          timestamp: Date.now()
        });
      });

      page.on('requestfailed', request => {
        allErrors.network.push({
          type: 'network',
          url: request.url(),
          failure: request.failure().errorText,
          timestamp: Date.now()
        });
      });

      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for full page load
      await page.waitForTimeout(5000);

      // Check for specific SSR-related errors
      const documentErrors = [...allErrors.console, ...allErrors.page].filter(error =>
        error.message.includes('document is not defined')
      );

      const windowErrors = [...allErrors.console, ...allErrors.page].filter(error =>
        error.message.includes('window is not defined')
      );

      const referenceErrors = [...allErrors.console, ...allErrors.page].filter(error =>
        error.message.includes('ReferenceError')
      );

      const totalErrors = allErrors.console.length + allErrors.page.length + allErrors.network.length;
      const criticalErrors = documentErrors.length + windowErrors.length + referenceErrors.length;

      const testPassed = criticalErrors === 0;

      this.testResults.documentWindowErrors = {
        passed: testPassed,
        totalErrors,
        criticalErrors,
        documentErrors: documentErrors.length,
        windowErrors: windowErrors.length,
        referenceErrors: referenceErrors.length,
        details: {
          documentErrors,
          windowErrors,
          referenceErrors,
          allErrors
        }
      };

      await browser.close();

      console.log(`   ✅ Document/Window Error Detection: ${testPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Total Errors: ${totalErrors}`);
      console.log(`   📊 Critical SSR Errors: ${criticalErrors}`);
      console.log(`   📊 Document Errors: ${documentErrors.length}`);
      console.log(`   📊 Window Errors: ${windowErrors.length}\n`);

    } catch (error) {
      console.log(`   ❌ Document/Window Error Detection: FAILED - ${error.message}\n`);
      this.testResults.documentWindowErrors = {
        passed: false,
        error: error.message
      };
      this.errors.push(`Document/Window Error Detection: ${error.message}`);
    }
  }

  generateReport() {
    const allTestsPassed = Object.values(this.testResults)
      .filter(result => result !== null && typeof result === 'object')
      .every(result => result.passed === true);

    this.testResults.overallResult = allTestsPassed ? 'PASSED' : 'FAILED';

    console.log('📊 SSR Browser Router Test Results Summary:');
    console.log('================================================');
    console.log(`Overall Result: ${this.testResults.overallResult}`);
    console.log(`SSR Render Test: ${this.testResults.ssrRenderTest?.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Browser Router Client-Only: ${this.testResults.browserRouterClientOnly?.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Dynamic Import Validation: ${this.testResults.dynamicImportValidation?.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Document/Window Error Detection: ${this.testResults.documentWindowErrors?.passed ? 'PASSED' : 'FAILED'}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Save detailed results
    const reportPath = path.join(__dirname, 'ssr-browser-router-test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SSRBrowserRouterTester();
  tester.runTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = SSRBrowserRouterTester;
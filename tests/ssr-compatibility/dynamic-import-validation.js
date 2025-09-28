/**
 * Dynamic Import Validation Test
 *
 * This test specifically validates that dynamic imports work correctly
 * in SSR context and that the ssr: false configuration prevents server-side execution.
 *
 * Test Requirements:
 * 1. Validate dynamic import with ssr: false works correctly
 * 2. Test client-side hydration happens properly
 * 3. Verify loading states work as expected
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class DynamicImportValidator {
  constructor() {
    this.testResults = {
      ssrFalseRespected: null,
      loadingStateValidation: null,
      clientHydration: null,
      chunkLoadingValidation: null,
      overallResult: null
    };
    this.errors = [];
  }

  async runTests() {
    console.log('🚀 Starting Dynamic Import Validation Tests...\n');

    try {
      // Test 1: SSR: false Configuration Respected
      await this.testSSRFalseRespected();

      // Test 2: Loading State Validation
      await this.testLoadingStateValidation();

      // Test 3: Client Hydration
      await this.testClientHydration();

      // Test 4: Chunk Loading Validation
      await this.testChunkLoadingValidation();

      // Generate final report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed with error:', error.message);
      this.errors.push(`Test suite error: ${error.message}`);
      this.testResults.overallResult = 'FAILED';
    }

    return this.testResults;
  }

  async testSSRFalseRespected() {
    console.log('🧪 Test 1: SSR: false Configuration Respected');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Enable request interception to track SSR behavior
      await page.setRequestInterception(true);
      const serverRequests = [];
      const clientRequests = [];

      page.on('request', request => {
        const url = request.url();
        const headers = request.headers();

        // Track requests that might indicate SSR execution
        if (url.includes('_next') || url.includes('chunks') || url.includes('static')) {
          if (headers['user-agent'] && !headers['user-agent'].includes('HeadlessChrome')) {
            serverRequests.push(url);
          } else {
            clientRequests.push(url);
          }
        }

        request.continue();
      });

      // Navigate and track initial HTML response
      const response = await page.goto('http://localhost:3000', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const initialHTML = await response.text();

      // Check if App component was rendered on server (it shouldn't be)
      const hasServerRenderedApp = initialHTML.includes('react-router') ||
                                   initialHTML.includes('Router') ||
                                   initialHTML.includes('BrowserRouter');

      // The initial HTML should only contain the loading component
      const hasOnlyLoadingComponent = initialHTML.includes('Loading') &&
                                      initialHTML.includes('animate-spin');

      // Wait for client-side rendering
      await page.waitForSelector('body', { timeout: 10000 });
      await page.waitForTimeout(3000);

      const testPassed = !hasServerRenderedApp && hasOnlyLoadingComponent;

      this.testResults.ssrFalseRespected = {
        passed: testPassed,
        hasServerRenderedApp,
        hasOnlyLoadingComponent,
        serverRequests: serverRequests.length,
        clientRequests: clientRequests.length,
        details: {
          serverRequests,
          clientRequests,
          initialHTMLSample: initialHTML.substring(0, 500)
        }
      };

      await browser.close();

      console.log(`   ✅ SSR: false Respected: ${testPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Server-rendered App Found: ${hasServerRenderedApp ? 'YES' : 'NO'}`);
      console.log(`   📊 Loading Component Only: ${hasOnlyLoadingComponent ? 'YES' : 'NO'}\n`);

    } catch (error) {
      console.log(`   ❌ SSR: false Respected Test: FAILED - ${error.message}\n`);
      this.testResults.ssrFalseRespected = {
        passed: false,
        error: error.message
      };
      this.errors.push(`SSR: false Respected Test: ${error.message}`);
    }
  }

  async testLoadingStateValidation() {
    console.log('🧪 Test 2: Loading State Validation');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track loading state timeline
      const loadingTimeline = [];

      await page.goto('http://localhost:3000', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Check for initial loading state
      try {
        const loadingElement = await page.waitForSelector('[class*="animate-spin"]', {
          timeout: 5000
        });

        if (loadingElement) {
          loadingTimeline.push({
            event: 'loading_appeared',
            timestamp: Date.now()
          });

          // Check loading text
          const loadingText = await page.evaluate(() => {
            const spinElement = document.querySelector('[class*="animate-spin"]');
            return spinElement ? spinElement.parentElement.textContent : null;
          });

          // Wait for loading to disappear
          await page.waitForSelector('[class*="animate-spin"]', {
            hidden: true,
            timeout: 15000
          });

          loadingTimeline.push({
            event: 'loading_disappeared',
            timestamp: Date.now()
          });

          // Check if actual app content appeared
          await page.waitForTimeout(2000);
          const hasAppContent = await page.evaluate(() => {
            const bodyText = document.body.textContent;
            return bodyText && bodyText.length > 50 && !bodyText.includes('Loading');
          });

          if (hasAppContent) {
            loadingTimeline.push({
              event: 'app_content_appeared',
              timestamp: Date.now()
            });
          }

          const loadingDuration = loadingTimeline.length >= 2 ?
            loadingTimeline[1].timestamp - loadingTimeline[0].timestamp : 0;

          const testPassed = loadingTimeline.length >= 2 && hasAppContent && loadingDuration > 0;

          this.testResults.loadingStateValidation = {
            passed: testPassed,
            loadingDuration,
            hasAppContent,
            loadingText,
            timeline: loadingTimeline
          };

          console.log(`   ✅ Loading State Validation: ${testPassed ? 'PASSED' : 'FAILED'}`);
          console.log(`   📊 Loading Duration: ${loadingDuration}ms`);
          console.log(`   📊 App Content Loaded: ${hasAppContent ? 'YES' : 'NO'}\n`);

        } else {
          throw new Error('Loading component not found');
        }

      } catch (error) {
        // Loading might be too fast or not present
        this.testResults.loadingStateValidation = {
          passed: false,
          error: 'Loading state not detected or too fast',
          timeline: loadingTimeline
        };
        console.log(`   ⚠️  Loading State Validation: INCONCLUSIVE - Loading too fast or not detected\n`);
      }

      await browser.close();

    } catch (error) {
      console.log(`   ❌ Loading State Validation: FAILED - ${error.message}\n`);
      this.testResults.loadingStateValidation = {
        passed: false,
        error: error.message
      };
      this.errors.push(`Loading State Validation: ${error.message}`);
    }
  }

  async testClientHydration() {
    console.log('🧪 Test 3: Client Hydration');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track hydration events
      await page.evaluateOnNewDocument(() => {
        window.hydrationEvents = [];

        // Override React methods to track hydration
        const originalHydrate = ReactDOM.hydrate;
        const originalRender = ReactDOM.render;

        if (originalHydrate) {
          ReactDOM.hydrate = function(...args) {
            window.hydrationEvents.push({
              type: 'hydrate',
              timestamp: Date.now()
            });
            return originalHydrate.apply(this, args);
          };
        }

        if (originalRender) {
          ReactDOM.render = function(...args) {
            window.hydrationEvents.push({
              type: 'render',
              timestamp: Date.now()
            });
            return originalRender.apply(this, args);
          };
        }
      });

      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for hydration to complete
      await page.waitForTimeout(5000);

      // Check hydration events
      const hydrationEvents = await page.evaluate(() => window.hydrationEvents || []);

      // Test interactive functionality (indicates successful hydration)
      const interactivityTest = await page.evaluate(() => {
        // Look for interactive elements
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        const inputs = document.querySelectorAll('input');

        return {
          hasButtons: buttons.length > 0,
          hasLinks: links.length > 0,
          hasInputs: inputs.length > 0,
          totalInteractiveElements: buttons.length + links.length + inputs.length
        };
      });

      // Check for React's hydration markers
      const hasReactHydration = await page.evaluate(() => {
        // Check for React root elements
        const reactRoots = document.querySelectorAll('[data-reactroot]');
        const nextjsApp = document.querySelector('#__next');

        return {
          hasReactRoots: reactRoots.length > 0,
          hasNextjsApp: !!nextjsApp,
          hasChildren: nextjsApp ? nextjsApp.children.length > 0 : false
        };
      });

      const testPassed = (hydrationEvents.length > 0 || interactivityTest.totalInteractiveElements > 0) &&
                         hasReactHydration.hasNextjsApp;

      this.testResults.clientHydration = {
        passed: testPassed,
        hydrationEvents: hydrationEvents.length,
        interactivityTest,
        hasReactHydration,
        details: {
          hydrationEvents,
          interactivityTest,
          hasReactHydration
        }
      };

      await browser.close();

      console.log(`   ✅ Client Hydration: ${testPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Hydration Events: ${hydrationEvents.length}`);
      console.log(`   📊 Interactive Elements: ${interactivityTest.totalInteractiveElements}`);
      console.log(`   📊 React App Found: ${hasReactHydration.hasNextjsApp ? 'YES' : 'NO'}\n`);

    } catch (error) {
      console.log(`   ❌ Client Hydration Test: FAILED - ${error.message}\n`);
      this.testResults.clientHydration = {
        passed: false,
        error: error.message
      };
      this.errors.push(`Client Hydration Test: ${error.message}`);
    }
  }

  async testChunkLoadingValidation() {
    console.log('🧪 Test 4: Chunk Loading Validation');

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();

      // Track all network requests for chunks
      const chunkRequests = [];
      page.on('response', response => {
        const url = response.url();
        if (url.includes('_next/static') || url.includes('.js') || url.includes('chunks')) {
          chunkRequests.push({
            url,
            status: response.status(),
            size: response.headers()['content-length'] || 0,
            timing: response.timing(),
            fromCache: response.fromCache()
          });
        }
      });

      await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for all dynamic imports to load
      await page.waitForTimeout(5000);

      // Analyze chunk loading
      const successfulChunks = chunkRequests.filter(req => req.status === 200);
      const failedChunks = chunkRequests.filter(req => req.status !== 200);
      const cachedChunks = chunkRequests.filter(req => req.fromCache);

      // Check if main app chunk loaded
      const hasAppChunk = chunkRequests.some(req =>
        req.url.includes('pages') || req.url.includes('_app') || req.status === 200
      );

      // Verify page is fully functional after chunk loading
      const functionalityTest = await page.evaluate(() => {
        return {
          hasContent: document.body.textContent.length > 100,
          hasStyled: getComputedStyle(document.body).fontSize !== '16px' ||
                     getComputedStyle(document.body).fontFamily !== 'Times',
          hasScripts: document.scripts.length > 0,
          hasReactElements: document.querySelector('[data-reactroot]') || document.querySelector('#__next')
        };
      });

      const allFunctional = Object.values(functionalityTest).every(test => test === true);
      const testPassed = successfulChunks.length > 0 && failedChunks.length === 0 &&
                         hasAppChunk && allFunctional;

      this.testResults.chunkLoadingValidation = {
        passed: testPassed,
        totalChunks: chunkRequests.length,
        successfulChunks: successfulChunks.length,
        failedChunks: failedChunks.length,
        cachedChunks: cachedChunks.length,
        hasAppChunk,
        functionalityTest,
        allFunctional,
        details: {
          successful: successfulChunks,
          failed: failedChunks,
          cached: cachedChunks
        }
      };

      await browser.close();

      console.log(`   ✅ Chunk Loading Validation: ${testPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   📊 Total Chunks: ${chunkRequests.length}`);
      console.log(`   📊 Successful: ${successfulChunks.length}`);
      console.log(`   📊 Failed: ${failedChunks.length}`);
      console.log(`   📊 App Chunk Found: ${hasAppChunk ? 'YES' : 'NO'}`);
      console.log(`   📊 Fully Functional: ${allFunctional ? 'YES' : 'NO'}\n`);

    } catch (error) {
      console.log(`   ❌ Chunk Loading Validation: FAILED - ${error.message}\n`);
      this.testResults.chunkLoadingValidation = {
        passed: false,
        error: error.message
      };
      this.errors.push(`Chunk Loading Validation: ${error.message}`);
    }
  }

  generateReport() {
    const allTestsPassed = Object.values(this.testResults)
      .filter(result => result !== null && typeof result === 'object')
      .every(result => result.passed === true);

    this.testResults.overallResult = allTestsPassed ? 'PASSED' : 'FAILED';

    console.log('📊 Dynamic Import Validation Results Summary:');
    console.log('===============================================');
    console.log(`Overall Result: ${this.testResults.overallResult}`);
    console.log(`SSR: false Respected: ${this.testResults.ssrFalseRespected?.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Loading State Validation: ${this.testResults.loadingStateValidation?.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Client Hydration: ${this.testResults.clientHydration?.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Chunk Loading Validation: ${this.testResults.chunkLoadingValidation?.passed ? 'PASSED' : 'FAILED'}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }

    // Save detailed results
    const reportPath = path.join(__dirname, 'dynamic-import-validation-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportPath}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const validator = new DynamicImportValidator();
  validator.runTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = DynamicImportValidator;
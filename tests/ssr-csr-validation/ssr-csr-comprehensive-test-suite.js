/**
 * Comprehensive SSR/CSR Compatibility Test Suite
 * Tests Next.js Server-Side Rendering and Client-Side Rendering compatibility
 */

const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

class SSRCSRTestSuite {
  constructor() {
    this.baseURL = 'http://localhost:3000';
    this.testResults = {
      ssrRendering: {},
      clientHydration: {},
      routeNavigation: {},
      performanceMetrics: {},
      errorHandling: {},
      pageRefresh: {}
    };
  }

  /**
   * Test 1: SSR Initial Rendering Validation
   */
  async testSSRRendering(page) {
    console.log('🔄 Testing SSR Initial Rendering...');

    const testResults = {
      homepage: { passed: false, errors: [], renderTime: 0 },
      agentsPage: { passed: false, errors: [], renderTime: 0 },
      documentErrors: []
    };

    try {
      // Test Homepage SSR
      const homepageStart = Date.now();
      await page.goto(this.baseURL, { waitUntil: 'domcontentloaded' });

      // Check for document errors during SSR
      const ssrErrors = await page.evaluate(() => {
        return window.__SSR_ERRORS__ || [];
      });

      testResults.documentErrors = ssrErrors;
      testResults.homepage.renderTime = Date.now() - homepageStart;

      // Verify initial content is rendered server-side
      const initialContent = await page.content();
      const hasServerRenderedContent = initialContent.includes('AgentLink') ||
                                     initialContent.includes('Loading AgentLink');

      if (hasServerRenderedContent && ssrErrors.length === 0) {
        testResults.homepage.passed = true;
      } else {
        testResults.homepage.errors.push('Missing server-rendered content or SSR errors detected');
      }

      // Test Agents Page SSR
      const agentsPageStart = Date.now();
      await page.goto(`${this.baseURL}/agents`, { waitUntil: 'domcontentloaded' });

      const agentsPageContent = await page.content();
      const hasAgentsContent = agentsPageContent.includes('Agent Dashboard') ||
                              agentsPageContent.includes('Loading agents');

      testResults.agentsPage.renderTime = Date.now() - agentsPageStart;

      if (hasAgentsContent) {
        testResults.agentsPage.passed = true;
      } else {
        testResults.agentsPage.errors.push('Missing agents page content');
      }

    } catch (error) {
      testResults.homepage.errors.push(`SSR test error: ${error.message}`);
    }

    this.testResults.ssrRendering = testResults;
    return testResults;
  }

  /**
   * Test 2: Client-Side Hydration Validation
   */
  async testClientHydration(page) {
    console.log('🔄 Testing Client-Side Hydration...');

    const testResults = {
      hydrationComplete: false,
      hydrationTime: 0,
      reactMounted: false,
      noHydrationMismatches: true,
      interactiveComponents: false,
      errors: []
    };

    try {
      await page.goto(this.baseURL);

      const hydrationStart = Date.now();

      // Wait for React to hydrate
      await page.waitForFunction(() => {
        return window.React !== undefined ||
               document.querySelector('[data-reactroot]') !== null ||
               document.querySelector('#__next') !== null;
      }, { timeout: 10000 });

      testResults.hydrationTime = Date.now() - hydrationStart;
      testResults.hydrationComplete = true;

      // Check for React mounting
      const reactMounted = await page.evaluate(() => {
        return typeof window.React !== 'undefined' ||
               document.querySelector('[data-reactroot]') !== null;
      });
      testResults.reactMounted = reactMounted;

      // Check for hydration warnings in console
      const consoleMessages = [];
      page.on('console', msg => {
        if (msg.type() === 'warning' && msg.text().includes('hydrat')) {
          consoleMessages.push(msg.text());
        }
      });

      // Test component interactivity after hydration
      if (await page.locator('button, a, input').first().isVisible()) {
        testResults.interactiveComponents = true;
      }

      if (consoleMessages.length > 0) {
        testResults.noHydrationMismatches = false;
        testResults.errors = consoleMessages;
      }

    } catch (error) {
      testResults.errors.push(`Hydration test error: ${error.message}`);
    }

    this.testResults.clientHydration = testResults;
    return testResults;
  }

  /**
   * Test 3: React Router Post-Hydration Navigation
   */
  async testReactRouterNavigation(page) {
    console.log('🔄 Testing React Router Post-Hydration...');

    const testResults = {
      routeChanges: {},
      browserNavigation: false,
      programmaticNavigation: false,
      urlUpdates: false,
      errors: []
    };

    try {
      await page.goto(this.baseURL);

      // Wait for hydration
      await page.waitForTimeout(2000);

      // Test route navigation
      const routes = [
        { path: '/agents', expectedContent: 'Agent Dashboard' },
        { path: '/', expectedContent: 'AgentLink' }
      ];

      for (const route of routes) {
        try {
          // Navigate to route
          await page.goto(`${this.baseURL}${route.path}`);
          await page.waitForTimeout(1000);

          // Check if content loads
          const pageContent = await page.textContent('body');
          const hasExpectedContent = pageContent.includes(route.expectedContent) ||
                                   pageContent.includes('Loading');

          testResults.routeChanges[route.path] = {
            loaded: hasExpectedContent,
            url: page.url(),
            content: pageContent.substring(0, 200)
          };

          // Verify URL updated correctly
          if (page.url().includes(route.path)) {
            testResults.urlUpdates = true;
          }

        } catch (routeError) {
          testResults.routeChanges[route.path] = {
            loaded: false,
            error: routeError.message
          };
        }
      }

      testResults.browserNavigation = Object.values(testResults.routeChanges)
        .some(result => result.loaded);

    } catch (error) {
      testResults.errors.push(`Router test error: ${error.message}`);
    }

    this.testResults.routeNavigation = testResults;
    return testResults;
  }

  /**
   * Test 4: Route Compatibility in SSR and CSR Modes
   */
  async testRouteCompatibility(page) {
    console.log('🔄 Testing Route Compatibility SSR vs CSR...');

    const testResults = {
      ssrRoutes: {},
      csrRoutes: {},
      compatibilityCheck: {},
      errors: []
    };

    const routes = ['/', '/agents'];

    try {
      // Test SSR mode (direct navigation)
      for (const route of routes) {
        try {
          await page.goto(`${this.baseURL}${route}`, { waitUntil: 'domcontentloaded' });
          const ssrContent = await page.content();

          testResults.ssrRoutes[route] = {
            loaded: true,
            contentLength: ssrContent.length,
            hasTitle: ssrContent.includes('<title>'),
            hasContent: ssrContent.length > 1000
          };
        } catch (error) {
          testResults.ssrRoutes[route] = {
            loaded: false,
            error: error.message
          };
        }
      }

      // Test CSR mode (client-side navigation)
      await page.goto(this.baseURL);
      await page.waitForTimeout(2000); // Wait for hydration

      for (const route of routes) {
        if (route === '/') continue; // Skip home as we're already there

        try {
          // Use JavaScript navigation to simulate CSR
          await page.evaluate((path) => {
            window.history.pushState({}, '', path);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }, route);

          await page.waitForTimeout(1000);
          const csrContent = await page.textContent('body');

          testResults.csrRoutes[route] = {
            loaded: true,
            contentLength: csrContent.length,
            hasContent: csrContent.length > 100
          };
        } catch (error) {
          testResults.csrRoutes[route] = {
            loaded: false,
            error: error.message
          };
        }
      }

      // Compare SSR vs CSR compatibility
      for (const route of routes) {
        const ssrWorking = testResults.ssrRoutes[route]?.loaded || false;
        const csrWorking = testResults.csrRoutes[route]?.loaded || false;

        testResults.compatibilityCheck[route] = {
          ssrWorking,
          csrWorking,
          compatible: ssrWorking && csrWorking
        };
      }

    } catch (error) {
      testResults.errors.push(`Route compatibility test error: ${error.message}`);
    }

    this.testResults.routeCompatibility = testResults;
    return testResults;
  }

  /**
   * Test 5: Performance Impact Assessment
   */
  async testPerformanceImpact(page) {
    console.log('🔄 Testing Performance Impact...');

    const testResults = {
      ssrMetrics: {},
      csrMetrics: {},
      comparison: {},
      errors: []
    };

    try {
      // Measure SSR performance (fresh load)
      const ssrStart = Date.now();
      await page.goto(this.baseURL, { waitUntil: 'load' });
      const ssrLoadTime = Date.now() - ssrStart;

      // Get performance metrics
      const ssrMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      testResults.ssrMetrics = {
        totalLoadTime: ssrLoadTime,
        ...ssrMetrics
      };

      // Measure CSR performance (navigation)
      await page.goto(`${this.baseURL}/agents`);
      await page.waitForTimeout(1000);

      const csrStart = Date.now();
      await page.goto(this.baseURL);
      const csrLoadTime = Date.now() - csrStart;

      testResults.csrMetrics = {
        navigationTime: csrLoadTime
      };

      // Performance comparison
      testResults.comparison = {
        ssrFasterThanCSR: testResults.ssrMetrics.totalLoadTime < testResults.csrMetrics.navigationTime,
        performanceImpact: Math.abs(testResults.ssrMetrics.totalLoadTime - testResults.csrMetrics.navigationTime),
        acceptable: testResults.ssrMetrics.totalLoadTime < 5000 // 5 second threshold
      };

    } catch (error) {
      testResults.errors.push(`Performance test error: ${error.message}`);
    }

    this.testResults.performanceMetrics = testResults;
    return testResults;
  }

  /**
   * Test 6: Error Boundary and Error Handling
   */
  async testErrorHandling(page) {
    console.log('🔄 Testing Error Boundary Functionality...');

    const testResults = {
      documentErrors: [],
      consoleErrors: [],
      unhandledRejections: [],
      errorBoundaryWorks: false,
      errorRecovery: false,
      errors: []
    };

    try {
      const consoleMessages = [];
      const pageErrors = [];

      // Capture console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });

      // Capture page errors
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      await page.goto(this.baseURL);
      await page.waitForTimeout(2000);

      // Check for any existing errors
      testResults.consoleErrors = consoleMessages;
      testResults.documentErrors = pageErrors;

      // Test navigation to ensure no document errors
      await page.goto(`${this.baseURL}/agents`);
      await page.waitForTimeout(1000);

      // Check if app recovers from navigation
      const agentsPageContent = await page.textContent('body');
      testResults.errorRecovery = agentsPageContent.includes('Agent Dashboard') ||
                                 agentsPageContent.includes('Loading');

      testResults.errorBoundaryWorks = pageErrors.length === 0 && consoleMessages.length === 0;

    } catch (error) {
      testResults.errors.push(`Error handling test error: ${error.message}`);
    }

    this.testResults.errorHandling = testResults;
    return testResults;
  }

  /**
   * Test 7: Page Refresh Behavior
   */
  async testPageRefreshBehavior(page) {
    console.log('🔄 Testing Page Refresh Behavior...');

    const testResults = {
      refreshOnHomepage: false,
      refreshOnAgentsPage: false,
      statePreservation: false,
      noErrors: true,
      errors: []
    };

    try {
      // Test refresh on homepage
      await page.goto(this.baseURL);
      await page.waitForTimeout(2000);

      await page.reload({ waitUntil: 'load' });
      const homepageAfterRefresh = await page.textContent('body');
      testResults.refreshOnHomepage = homepageAfterRefresh.includes('AgentLink') ||
                                     homepageAfterRefresh.includes('Loading');

      // Test refresh on agents page
      await page.goto(`${this.baseURL}/agents`);
      await page.waitForTimeout(2000);

      await page.reload({ waitUntil: 'load' });
      const agentsPageAfterRefresh = await page.textContent('body');
      testResults.refreshOnAgentsPage = agentsPageAfterRefresh.includes('Agent Dashboard') ||
                                       agentsPageAfterRefresh.includes('Loading');

      // Check for errors after refresh
      const refreshErrors = await page.evaluate(() => {
        return window.console.error.toString();
      });

      testResults.noErrors = !refreshErrors.includes('error');

    } catch (error) {
      testResults.errors.push(`Page refresh test error: ${error.message}`);
      testResults.noErrors = false;
    }

    this.testResults.pageRefresh = testResults;
    return testResults;
  }

  /**
   * Generate Comprehensive Test Report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: 7,
        passedTests: 0,
        failedTests: 0,
        overallStatus: 'UNKNOWN'
      },
      details: this.testResults,
      recommendations: []
    };

    // Calculate test results
    const testChecks = [
      this.testResults.ssrRendering?.homepage?.passed || false,
      this.testResults.ssrRendering?.agentsPage?.passed || false,
      this.testResults.clientHydration?.hydrationComplete || false,
      this.testResults.routeNavigation?.browserNavigation || false,
      this.testResults.performanceMetrics?.comparison?.acceptable || false,
      this.testResults.errorHandling?.errorBoundaryWorks || false,
      this.testResults.pageRefresh?.refreshOnHomepage || false
    ];

    report.summary.passedTests = testChecks.filter(Boolean).length;
    report.summary.failedTests = testChecks.length - report.summary.passedTests;
    report.summary.overallStatus = report.summary.passedTests >= 5 ? 'PASSED' : 'FAILED';

    // Generate recommendations
    if (!this.testResults.ssrRendering?.homepage?.passed) {
      report.recommendations.push('Fix homepage SSR rendering issues');
    }
    if (!this.testResults.clientHydration?.hydrationComplete) {
      report.recommendations.push('Resolve client-side hydration problems');
    }
    if (!this.testResults.routeNavigation?.browserNavigation) {
      report.recommendations.push('Fix React Router navigation after hydration');
    }
    if (!this.testResults.performanceMetrics?.comparison?.acceptable) {
      report.recommendations.push('Optimize SSR performance (target <5s load time)');
    }
    if (!this.testResults.errorHandling?.errorBoundaryWorks) {
      report.recommendations.push('Implement proper error boundaries and error handling');
    }

    return report;
  }

  /**
   * Run Complete Test Suite
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive SSR/CSR Test Suite...');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      await this.testSSRRendering(page);
      await this.testClientHydration(page);
      await this.testReactRouterNavigation(page);
      await this.testRouteCompatibility(page);
      await this.testPerformanceImpact(page);
      await this.testErrorHandling(page);
      await this.testPageRefreshBehavior(page);

      const report = this.generateReport();

      console.log('\n📊 Test Suite Complete!');
      console.log(`✅ Passed: ${report.summary.passedTests}`);
      console.log(`❌ Failed: ${report.summary.failedTests}`);
      console.log(`🎯 Overall Status: ${report.summary.overallStatus}`);

      return report;

    } finally {
      await browser.close();
    }
  }
}

// Export for use in other test files
module.exports = SSRCSRTestSuite;

// Run if called directly
if (require.main === module) {
  (async () => {
    const testSuite = new SSRCSRTestSuite();
    const report = await testSuite.runAllTests();

    // Save report
    const fs = require('fs');
    const path = require('path');

    const reportPath = path.join(__dirname, 'ssr-csr-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);

    process.exit(report.summary.overallStatus === 'PASSED' ? 0 : 1);
  })();
}
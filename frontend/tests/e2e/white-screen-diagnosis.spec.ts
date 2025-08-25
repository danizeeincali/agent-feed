import { test, expect, Page, ConsoleMessage } from '@playwright/test';

interface DiagnosticResult {
  path: string;
  consoleErrors: string[];
  consoleWarnings: string[];
  consoleMessages: string[];
  networkErrors: any[];
  domElements: {
    root: boolean;
    reactRoot: boolean;
    body: boolean;
    head: boolean;
  };
  javascriptExecuted: boolean;
  reactMounted: boolean;
  pageContent: string;
  htmlStructure: {
    title: string;
    metaTags: number;
    scriptTags: number;
    styleTags: number;
  };
  timing: {
    domContentLoaded: number;
    load: number;
    firstContentfulPaint?: number;
  };
}

test.describe('White Screen Diagnosis', () => {
  let consoleMessages: ConsoleMessage[] = [];
  let networkErrors: any[] = [];
  let diagnosticResults: DiagnosticResult[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    networkErrors = [];

    // Capture console messages
    page.on('console', (msg) => {
      consoleMessages.push(msg);
      console.log(`Console [${msg.type()}]: ${msg.text()}`);
    });

    // Capture network failures
    page.on('requestfailed', (request) => {
      const error = {
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      };
      networkErrors.push(error);
      console.log(`Network failure: ${error.url} - ${error.failure}`);
    });

    // Capture uncaught exceptions
    page.on('pageerror', (error) => {
      console.log(`Page error: ${error.message}`);
    });
  });

  async function diagnoseRoute(page: Page, path: string): Promise<DiagnosticResult> {
    console.log(`\n=== Diagnosing route: ${path} ===`);
    
    const startTime = Date.now();
    
    // Navigate to the route
    const response = await page.goto(path, { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });

    // Wait a bit for React to potentially render
    await page.waitForTimeout(2000);

    // Capture timing metrics
    const timing = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
        load: perfData.loadEventEnd - perfData.navigationStart,
      };
    });

    // Check DOM elements
    const domElements = await page.evaluate(() => {
      return {
        root: !!document.getElementById('root'),
        reactRoot: !!document.querySelector('[data-reactroot]') || !!document.querySelector('#root > *'),
        body: !!document.body,
        head: !!document.head,
      };
    });

    // Check if JavaScript is working
    const javascriptExecuted = await page.evaluate(() => {
      try {
        // Test basic JavaScript execution
        const testArray = [1, 2, 3];
        const result = testArray.map(x => x * 2);
        return result.length === 3 && result[0] === 2;
      } catch (error) {
        return false;
      }
    });

    // Check if React is mounted
    const reactMounted = await page.evaluate(() => {
      // Check for React DevTools or React fiber
      return !!(window as any).React || 
             !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
             !!document.querySelector('#root')?.hasChildNodes();
    });

    // Get page content
    const pageContent = await page.content();
    
    // Get HTML structure info
    const htmlStructure = await page.evaluate(() => {
      return {
        title: document.title || 'No title',
        metaTags: document.querySelectorAll('meta').length,
        scriptTags: document.querySelectorAll('script').length,
        styleTags: document.querySelectorAll('style, link[rel="stylesheet"]').length,
      };
    });

    // Categorize console messages
    const consoleErrors = consoleMessages
      .filter(msg => msg.type() === 'error')
      .map(msg => msg.text());
    
    const consoleWarnings = consoleMessages
      .filter(msg => msg.type() === 'warning')
      .map(msg => msg.text());
    
    const consoleInfo = consoleMessages
      .filter(msg => ['log', 'info', 'debug'].includes(msg.type()))
      .map(msg => `[${msg.type()}] ${msg.text()}`);

    const result: DiagnosticResult = {
      path,
      consoleErrors,
      consoleWarnings,
      consoleMessages: consoleInfo,
      networkErrors: [...networkErrors],
      domElements,
      javascriptExecuted,
      reactMounted,
      pageContent,
      htmlStructure,
      timing
    };

    // Take screenshot for evidence
    await page.screenshot({ 
      path: `test-results/screenshot-${path.replace('/', 'root')}.png`,
      fullPage: true 
    });

    console.log(`Route ${path} diagnosis completed in ${Date.now() - startTime}ms`);
    return result;
  }

  test('Diagnose Root Path (/)', async ({ page }) => {
    const result = await diagnoseRoute(page, '/');
    diagnosticResults.push(result);

    // Assertions to provide clear test results
    console.log('\n=== ROOT PATH DIAGNOSIS RESULTS ===');
    console.log(`Console Errors: ${result.consoleErrors.length}`);
    console.log(`Network Errors: ${result.networkErrors.length}`);
    console.log(`JavaScript Working: ${result.javascriptExecuted}`);
    console.log(`React Mounted: ${result.reactMounted}`);
    console.log(`DOM Root Present: ${result.domElements.root}`);
    console.log(`Title: "${result.htmlStructure.title}"`);

    if (result.consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      result.consoleErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (result.networkErrors.length > 0) {
      console.log('\nNetwork Errors:');
      result.networkErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.url} - ${error.failure}`);
      });
    }

    // These are diagnostic checks, not hard failures
    expect.soft(result.javascriptExecuted).toBe(true);
    expect.soft(result.domElements.root).toBe(true);
    expect.soft(result.domElements.body).toBe(true);
  });

  test('Diagnose Simple Launcher Path (/simple-launcher)', async ({ page }) => {
    const result = await diagnoseRoute(page, '/simple-launcher');
    diagnosticResults.push(result);

    console.log('\n=== SIMPLE LAUNCHER PATH DIAGNOSIS RESULTS ===');
    console.log(`Console Errors: ${result.consoleErrors.length}`);
    console.log(`Network Errors: ${result.networkErrors.length}`);
    console.log(`JavaScript Working: ${result.javascriptExecuted}`);
    console.log(`React Mounted: ${result.reactMounted}`);
    console.log(`DOM Root Present: ${result.domElements.root}`);
    console.log(`Title: "${result.htmlStructure.title}"`);

    if (result.consoleErrors.length > 0) {
      console.log('\nConsole Errors:');
      result.consoleErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
    }

    if (result.networkErrors.length > 0) {
      console.log('\nNetwork Errors:');
      result.networkErrors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.url} - ${error.failure}`);
      });
    }

    // These are diagnostic checks, not hard failures
    expect.soft(result.javascriptExecuted).toBe(true);
    expect.soft(result.domElements.root).toBe(true);
    expect.soft(result.domElements.body).toBe(true);
  });

  test('Compare Route Behaviors', async ({ page }) => {
    // This test runs after the other two and compares results
    if (diagnosticResults.length < 2) {
      test.skip('Not enough diagnostic data to compare');
    }

    const rootResult = diagnosticResults.find(r => r.path === '/');
    const launcherResult = diagnosticResults.find(r => r.path === '/simple-launcher');

    console.log('\n=== ROUTE COMPARISON ===');
    
    if (rootResult && launcherResult) {
      console.log(`Root errors: ${rootResult.consoleErrors.length}, Launcher errors: ${launcherResult.consoleErrors.length}`);
      console.log(`Root React mounted: ${rootResult.reactMounted}, Launcher React mounted: ${launcherResult.reactMounted}`);
      console.log(`Root JS working: ${rootResult.javascriptExecuted}, Launcher JS working: ${launcherResult.javascriptExecuted}`);

      // Compare content length as a basic check
      console.log(`Root content length: ${rootResult.pageContent.length}, Launcher content length: ${launcherResult.pageContent.length}`);
      
      // Log if there are significant differences
      if (Math.abs(rootResult.consoleErrors.length - launcherResult.consoleErrors.length) > 0) {
        console.log('⚠️  Different error counts between routes');
      }
      
      if (rootResult.reactMounted !== launcherResult.reactMounted) {
        console.log('⚠️  React mount status differs between routes');
      }
    }

    // Always pass this test as it's just for reporting
    expect(true).toBe(true);
  });

  test('Detailed Resource Analysis', async ({ page }) => {
    console.log('\n=== DETAILED RESOURCE ANALYSIS ===');
    
    // Test root path with detailed resource tracking
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Get all loaded resources
    const resources = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return entries.map(entry => ({
        name: entry.name,
        type: entry.initiatorType,
        size: entry.transferSize,
        duration: entry.responseEnd - entry.requestStart,
        status: entry.responseStatus || 'unknown'
      }));
    });

    console.log('\nLoaded Resources:');
    resources.forEach((resource, i) => {
      console.log(`  ${i + 1}. ${resource.type.toUpperCase()}: ${resource.name} (${resource.size} bytes, ${Math.round(resource.duration)}ms)`);
    });

    // Check for specific critical resources
    const criticalResources = {
      html: resources.filter(r => r.name.includes('.html') || r.type === 'document'),
      js: resources.filter(r => r.name.includes('.js') || r.type === 'script'),
      css: resources.filter(r => r.name.includes('.css') || r.type === 'stylesheet'),
    };

    console.log(`\nCritical Resource Counts:`);
    console.log(`  HTML/Documents: ${criticalResources.html.length}`);
    console.log(`  JavaScript: ${criticalResources.js.length}`);
    console.log(`  CSS: ${criticalResources.css.length}`);

    // Check if main application bundle is loading
    const mainBundle = resources.find(r => 
      r.name.includes('main') || 
      r.name.includes('index') || 
      r.name.includes('app') ||
      (r.type === 'script' && r.size > 1000) // Assume main bundle is reasonably sized
    );

    if (mainBundle) {
      console.log(`\n✅ Found potential main bundle: ${mainBundle.name} (${mainBundle.size} bytes)`);
    } else {
      console.log(`\n❌ No main application bundle detected`);
    }

    expect(resources.length).toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    // Generate final diagnostic report
    console.log('\n=== FINAL DIAGNOSTIC SUMMARY ===');
    
    const reportPath = 'test-results/white-screen-diagnosis.json';
    const report = {
      timestamp: new Date().toISOString(),
      routes: diagnosticResults,
      summary: {
        totalRoutesTested: diagnosticResults.length,
        routesWithErrors: diagnosticResults.filter(r => r.consoleErrors.length > 0).length,
        routesWithNetworkIssues: diagnosticResults.filter(r => r.networkErrors.length > 0).length,
        routesWithReactIssues: diagnosticResults.filter(r => !r.reactMounted).length,
        routesWithJSIssues: diagnosticResults.filter(r => !r.javascriptExecuted).length,
      }
    };

    console.log(JSON.stringify(report, null, 2));
  });
});
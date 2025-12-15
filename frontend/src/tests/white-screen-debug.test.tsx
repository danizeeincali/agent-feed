import { test, expect, Page, BrowserContext } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// Handle __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ConsoleMessage {
  type: string;
  text: string;
  location?: string;
  timestamp: number;
}

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  error?: string;
  responseTime?: number;
  timestamp: number;
}

interface DiagnosticData {
  console: ConsoleMessage[];
  network: NetworkRequest[];
  domState: {
    hasRootElement: boolean;
    rootElementContent: string;
    bodyContent: string;
    headContent: string;
    scriptTags: string[];
    linkTags: string[];
  };
  performance: {
    loadTime: number;
    domContentLoaded: number;
    networkIdleTime: number;
  };
  reactState: {
    reactDevToolsDetected: boolean;
    reactRootMounted: boolean;
    routerMounted: boolean;
    currentRoute: string;
  };
  screenshots: {
    initial: string;
    afterLoad: string;
    afterWait: string;
  };
}

class WhiteScreenDiagnostic {
  private diagnosticData: DiagnosticData;
  private page: Page;
  private startTime: number;

  constructor(page: Page) {
    this.page = page;
    this.startTime = Date.now();
    this.diagnosticData = {
      console: [],
      network: [],
      domState: {
        hasRootElement: false,
        rootElementContent: '',
        bodyContent: '',
        headContent: '',
        scriptTags: [],
        linkTags: []
      },
      performance: {
        loadTime: 0,
        domContentLoaded: 0,
        networkIdleTime: 0
      },
      reactState: {
        reactDevToolsDetected: false,
        reactRootMounted: false,
        routerMounted: false,
        currentRoute: ''
      },
      screenshots: {
        initial: '',
        afterLoad: '',
        afterWait: ''
      }
    };
  }

  async setupDiagnosticListeners(): Promise<void> {
    // Console message listener
    this.page.on('console', (msg) => {
      const consoleMessage: ConsoleMessage = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined,
        timestamp: Date.now()
      };
      this.diagnosticData.console.push(consoleMessage);
      
      // Log to test output for immediate visibility
      console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
      if (consoleMessage.location) {
        console.log(`  at ${consoleMessage.location}`);
      }
    });

    // Page error listener
    this.page.on('pageerror', (error) => {
      const errorMessage: ConsoleMessage = {
        type: 'pageerror',
        text: error.message,
        location: error.stack,
        timestamp: Date.now()
      };
      this.diagnosticData.console.push(errorMessage);
      console.log(`[PAGE ERROR] ${error.message}`);
      console.log(`Stack: ${error.stack}`);
    });

    // Network request/response listener
    this.page.on('request', (request) => {
      const networkRequest: NetworkRequest = {
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      };
      this.diagnosticData.network.push(networkRequest);
    });

    this.page.on('response', (response) => {
      const request = this.diagnosticData.network.find(req => 
        req.url === response.url() && !req.status
      );
      if (request) {
        request.status = response.status();
        request.responseTime = Date.now() - request.timestamp;
        
        if (!response.ok()) {
          request.error = `HTTP ${response.status()} ${response.statusText()}`;
          console.log(`[NETWORK ERROR] ${request.url} - ${request.error}`);
        }
      }
    });

    this.page.on('requestfailed', (request) => {
      const networkRequest = this.diagnosticData.network.find(req => 
        req.url === request.url() && !req.error
      );
      if (networkRequest) {
        networkRequest.error = request.failure()?.errorText || 'Request failed';
        console.log(`[NETWORK FAILED] ${request.url()} - ${networkRequest.error}`);
      }
    });
  }

  async captureInitialScreenshot(): Promise<void> {
    const screenshotPath = path.join(__dirname, '../screenshots/white-screen-initial.png');
    await this.page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    this.diagnosticData.screenshots.initial = screenshotPath;
    console.log(`[SCREENSHOT] Initial screenshot saved to: ${screenshotPath}`);
  }

  async captureDOMState(): Promise<void> {
    try {
      // Check if root element exists
      const rootElement = await this.page.$('#root');
      this.diagnosticData.domState.hasRootElement = !!rootElement;

      if (rootElement) {
        this.diagnosticData.domState.rootElementContent = await rootElement.innerHTML() || '';
      }

      // Get body content
      this.diagnosticData.domState.bodyContent = await this.page.evaluate(() => 
        document.body.innerHTML
      );

      // Get head content
      this.diagnosticData.domState.headContent = await this.page.evaluate(() => 
        document.head.innerHTML
      );

      // Get script tags
      this.diagnosticData.domState.scriptTags = await this.page.evaluate(() => 
        Array.from(document.scripts).map(script => ({
          src: script.src,
          type: script.type,
          content: script.innerHTML ? script.innerHTML.substring(0, 100) + '...' : ''
        }))
      );

      // Get link tags
      this.diagnosticData.domState.linkTags = await this.page.evaluate(() => 
        Array.from(document.querySelectorAll('link')).map(link => ({
          href: link.href,
          rel: link.rel,
          type: link.type
        }))
      );

      console.log(`[DOM STATE] Root element exists: ${this.diagnosticData.domState.hasRootElement}`);
      console.log(`[DOM STATE] Root content length: ${this.diagnosticData.domState.rootElementContent.length}`);
      console.log(`[DOM STATE] Body content length: ${this.diagnosticData.domState.bodyContent.length}`);
    } catch (error) {
      console.log(`[DOM STATE ERROR] ${error}`);
    }
  }

  async checkReactState(): Promise<void> {
    try {
      // Check if React DevTools are available
      this.diagnosticData.reactState.reactDevToolsDetected = await this.page.evaluate(() => {
        return typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
      });

      // Check if React root is mounted
      this.diagnosticData.reactState.reactRootMounted = await this.page.evaluate(() => {
        const root = document.getElementById('root');
        return root && root.children.length > 0;
      });

      // Check if React Router is working
      this.diagnosticData.reactState.routerMounted = await this.page.evaluate(() => {
        return !!document.querySelector('[data-testid="header"]') || 
               !!document.querySelector('nav') ||
               !!document.querySelector('[role="navigation"]');
      });

      // Get current route
      this.diagnosticData.reactState.currentRoute = await this.page.evaluate(() => {
        return window.location.pathname;
      });

      console.log(`[REACT STATE] DevTools detected: ${this.diagnosticData.reactState.reactDevToolsDetected}`);
      console.log(`[REACT STATE] Root mounted: ${this.diagnosticData.reactState.reactRootMounted}`);
      console.log(`[REACT STATE] Router mounted: ${this.diagnosticData.reactState.routerMounted}`);
      console.log(`[REACT STATE] Current route: ${this.diagnosticData.reactState.currentRoute}`);
    } catch (error) {
      console.log(`[REACT STATE ERROR] ${error}`);
    }
  }

  async checkSpecificErrors(): Promise<void> {
    // Check for common React/Vite errors
    const errorPatterns = [
      'Failed to fetch dynamically imported module',
      'Loading chunk',
      'ChunkLoadError',
      'Module not found',
      'Cannot resolve module',
      'Unexpected token',
      'SyntaxError',
      'ReferenceError',
      'TypeError',
      'Failed to import',
      'CORS error',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED'
    ];

    const foundErrors = this.diagnosticData.console.filter(msg => 
      errorPatterns.some(pattern => 
        msg.text.toLowerCase().includes(pattern.toLowerCase())
      )
    );

    if (foundErrors.length > 0) {
      console.log(`[SPECIFIC ERRORS FOUND] ${foundErrors.length} matching error patterns:`);
      foundErrors.forEach(error => {
        console.log(`  - ${error.type}: ${error.text}`);
      });
    }
  }

  async waitAndCaptureScreenshots(): Promise<void> {
    // Wait for potential async operations
    await this.page.waitForTimeout(2000);

    const afterLoadPath = path.join(__dirname, '../screenshots/white-screen-after-load.png');
    await this.page.screenshot({ 
      path: afterLoadPath, 
      fullPage: true 
    });
    this.diagnosticData.screenshots.afterLoad = afterLoadPath;

    // Wait for network idle
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
      this.diagnosticData.performance.networkIdleTime = Date.now() - this.startTime;
    } catch {
      console.log('[NETWORK] Network idle timeout - continuing...');
    }

    const afterWaitPath = path.join(__dirname, '../screenshots/white-screen-after-wait.png');
    await this.page.screenshot({ 
      path: afterWaitPath, 
      fullPage: true 
    });
    this.diagnosticData.screenshots.afterWait = afterWaitPath;

    console.log(`[SCREENSHOTS] Captured at: ${afterLoadPath} and ${afterWaitPath}`);
  }

  async capturePerformanceMetrics(): Promise<void> {
    try {
      const performanceData = await this.page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadEventEnd: perfData.loadEventEnd,
          domContentLoadedEventEnd: perfData.domContentLoadedEventEnd,
          responseEnd: perfData.responseEnd
        };
      });

      this.diagnosticData.performance.loadTime = Date.now() - this.startTime;
      this.diagnosticData.performance.domContentLoaded = performanceData.domContentLoadedEventEnd;

      console.log(`[PERFORMANCE] Load time: ${this.diagnosticData.performance.loadTime}ms`);
      console.log(`[PERFORMANCE] DOM Content Loaded: ${this.diagnosticData.performance.domContentLoaded}ms`);
    } catch (error) {
      console.log(`[PERFORMANCE ERROR] ${error}`);
    }
  }

  generateDiagnosticReport(): string {
    const report = `
=== WHITE SCREEN DIAGNOSTIC REPORT ===
Generated at: ${new Date().toISOString()}
URL: ${this.page.url()}
Total Load Time: ${this.diagnosticData.performance.loadTime}ms

=== DOM STATE ===
Root Element Exists: ${this.diagnosticData.domState.hasRootElement}
Root Content Length: ${this.diagnosticData.domState.rootElementContent.length} characters
Body Content Length: ${this.diagnosticData.domState.bodyContent.length} characters
Script Tags Count: ${this.diagnosticData.domState.scriptTags.length}
Link Tags Count: ${this.diagnosticData.domState.linkTags.length}

=== REACT STATE ===
React DevTools Detected: ${this.diagnosticData.reactState.reactDevToolsDetected}
React Root Mounted: ${this.diagnosticData.reactState.reactRootMounted}
Router Mounted: ${this.diagnosticData.reactState.routerMounted}
Current Route: ${this.diagnosticData.reactState.currentRoute}

=== CONSOLE MESSAGES (${this.diagnosticData.console.length} total) ===
${this.diagnosticData.console.map(msg => 
  `[${msg.type.toUpperCase()}] ${msg.text}${msg.location ? ` (${msg.location})` : ''}`
).join('\n')}

=== NETWORK REQUESTS (${this.diagnosticData.network.length} total) ===
${this.diagnosticData.network.map(req => 
  `${req.method} ${req.url} ${req.status ? `-> ${req.status}` : '(pending)'}${req.error ? ` ERROR: ${req.error}` : ''}`
).join('\n')}

=== FAILED REQUESTS ===
${this.diagnosticData.network.filter(req => req.error).map(req => 
  `${req.method} ${req.url} - ${req.error}`
).join('\n') || 'None'}

=== SCRIPT TAGS ===
${this.diagnosticData.domState.scriptTags.map((script, index) => 
  `${index + 1}. ${script.src || 'inline'} (${script.type || 'no type'})`
).join('\n')}

=== SCREENSHOTS ===
Initial: ${this.diagnosticData.screenshots.initial}
After Load: ${this.diagnosticData.screenshots.afterLoad}
After Wait: ${this.diagnosticData.screenshots.afterWait}

=== RECOMMENDATIONS ===
${this.generateRecommendations()}
`;

    return report;
  }

  private generateRecommendations(): string {
    const recommendations: string[] = [];

    if (!this.diagnosticData.domState.hasRootElement) {
      recommendations.push("- Root element #root is missing from DOM");
    }

    if (this.diagnosticData.domState.hasRootElement && this.diagnosticData.domState.rootElementContent.length === 0) {
      recommendations.push("- Root element exists but is empty - React app failed to mount");
    }

    if (!this.diagnosticData.reactState.reactRootMounted) {
      recommendations.push("- React root did not mount successfully");
    }

    if (!this.diagnosticData.reactState.routerMounted) {
      recommendations.push("- React Router did not mount - check routing configuration");
    }

    const jsErrors = this.diagnosticData.console.filter(msg => 
      msg.type === 'error' && (
        msg.text.includes('js') || 
        msg.text.includes('module') || 
        msg.text.includes('import')
      )
    );

    if (jsErrors.length > 0) {
      recommendations.push("- JavaScript/Module loading errors detected - check console errors");
    }

    const networkErrors = this.diagnosticData.network.filter(req => req.error);
    if (networkErrors.length > 0) {
      recommendations.push(`- ${networkErrors.length} network requests failed - check network tab`);
    }

    if (this.diagnosticData.performance.loadTime > 5000) {
      recommendations.push("- Page load time is excessive (>5s) - investigate performance issues");
    }

    if (recommendations.length === 0) {
      recommendations.push("- No obvious issues detected - may be a timing or race condition issue");
    }

    return recommendations.join('\n');
  }

  getDiagnosticData(): DiagnosticData {
    return this.diagnosticData;
  }
}

test.describe('White Screen Debugging - Dual Instance Page', () => {
  let diagnostic: WhiteScreenDiagnostic;

  test.beforeEach(async ({ page }) => {
    diagnostic = new WhiteScreenDiagnostic(page);
    await diagnostic.setupDiagnosticListeners();
  });

  test('Comprehensive white screen diagnosis', async ({ page }) => {
    console.log('=== STARTING WHITE SCREEN DIAGNOSTIC ===');
    
    // Navigate to the dual-instance page
    console.log('Navigating to dual-instance page...');
    await page.goto('http://127.0.0.1:3001/dual-instance', { 
      waitUntil: 'commit',
      timeout: 10000 
    });

    // Capture initial state immediately
    await diagnostic.captureInitialScreenshot();
    
    // Wait for initial DOM parsing
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    } catch {
      console.log('[WARNING] DOM content loaded timeout');
    }

    // Capture DOM state early
    await diagnostic.captureDOMState();

    // Check React mounting state
    await diagnostic.checkReactState();

    // Look for specific error patterns
    await diagnostic.checkSpecificErrors();

    // Wait and capture additional screenshots
    await diagnostic.waitAndCaptureScreenshots();

    // Capture performance metrics
    await diagnostic.capturePerformanceMetrics();

    // Generate and display comprehensive report
    const report = diagnostic.generateDiagnosticReport();
    console.log(report);

    // Write report to file for persistence
    const reportPath = path.join(__dirname, '../diagnostic-reports/white-screen-report.txt');
    await page.evaluate((reportContent) => {
      // Using page context to write file through Node.js APIs
      console.log('=== DIAGNOSTIC REPORT CONTENT ===');
      console.log(reportContent);
    }, report);

    // Attempt to interact with the page to see if it responds
    try {
      console.log('=== TESTING PAGE INTERACTIONS ===');
      
      // Check if sidebar navigation is present and clickable
      const sidebarLinks = await page.$$('nav a');
      console.log(`Found ${sidebarLinks.length} navigation links`);

      // Try clicking on various elements to see if they respond
      const clickableElements = await page.$$('button, a, [role="button"]');
      console.log(`Found ${clickableElements.length} clickable elements`);

      // Check if any React components are actually rendered
      const reactElements = await page.$$('[data-testid], [data-component]');
      console.log(`Found ${reactElements.length} React elements with test IDs`);

    } catch (error) {
      console.log(`[INTERACTION ERROR] ${error}`);
    }

    // Final check - is anything visible at all?
    const bodyText = await page.textContent('body');
    console.log(`[FINAL CHECK] Body text content length: ${bodyText?.length || 0}`);
    
    if (bodyText && bodyText.length > 0) {
      console.log(`[FINAL CHECK] First 200 characters: ${bodyText.substring(0, 200)}`);
    }

    // The test doesn't need to "pass" or "fail" - it's purely diagnostic
    // But we can add some basic checks for test framework compatibility
    const diagnosticData = diagnostic.getDiagnosticData();
    
    // Log summary for test output
    console.log('=== DIAGNOSTIC SUMMARY ===');
    console.log(`Console errors: ${diagnosticData.console.filter(m => m.type === 'error').length}`);
    console.log(`Network failures: ${diagnosticData.network.filter(r => r.error).length}`);
    console.log(`React mounted: ${diagnosticData.reactState.reactRootMounted}`);
    console.log(`Root element exists: ${diagnosticData.domState.hasRootElement}`);
    console.log(`Root content length: ${diagnosticData.domState.rootElementContent.length}`);
  });

  test('Component-specific loading test', async ({ page }) => {
    console.log('=== TESTING DUAL INSTANCE COMPONENT LOADING ===');

    await page.goto('http://127.0.0.1:3001/dual-instance');
    
    // Wait for potential component loading
    await page.waitForTimeout(3000);

    // Check for specific dual instance component markers
    const componentMarkers = [
      '[data-testid*="dual"]',
      '[class*="dual"]',
      '[class*="instance"]',
      'h1, h2, h3',
      '[role="main"]',
      '[data-component]'
    ];

    console.log('Checking for component markers...');
    for (const marker of componentMarkers) {
      try {
        const elements = await page.$$(marker);
        console.log(`${marker}: ${elements.length} elements found`);
        
        if (elements.length > 0) {
          const text = await elements[0].textContent();
          console.log(`  First element text: "${text?.substring(0, 100)}"`);
        }
      } catch (error) {
        console.log(`  Error checking ${marker}: ${error}`);
      }
    }

    // Check for error boundaries
    const errorBoundaries = await page.$$('[data-error-boundary], [class*="error"]');
    console.log(`Error boundary elements: ${errorBoundaries.length}`);

    // Check for loading states
    const loadingElements = await page.$$('[class*="loading"], [class*="spinner"], [aria-label*="loading"]');
    console.log(`Loading state elements: ${loadingElements.length}`);
  });

  test('Route-specific navigation test', async ({ page }) => {
    console.log('=== TESTING ROUTE NAVIGATION ===');

    // Start from home page
    await page.goto('http://127.0.0.1:3001/');
    await page.waitForTimeout(1000);

    console.log('Starting from home page...');
    const homeTitle = await page.textContent('h1');
    console.log(`Home page title: ${homeTitle}`);

    // Navigate to dual-instance via link click if possible
    try {
      const dualInstanceLink = await page.$('a[href="/dual-instance"]');
      if (dualInstanceLink) {
        console.log('Found dual-instance link, clicking...');
        await dualInstanceLink.click();
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        console.log(`After click, current URL: ${currentUrl}`);
        
        const pageTitle = await page.textContent('h1');
        console.log(`Page title after navigation: ${pageTitle}`);
      } else {
        console.log('No dual-instance link found in navigation');
      }
    } catch (error) {
      console.log(`Navigation click error: ${error}`);
    }

    // Direct navigation as fallback
    console.log('Direct navigation to /dual-instance...');
    await page.goto('http://127.0.0.1:3001/dual-instance');
    await page.waitForTimeout(2000);

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
  });
});
/**
 * Production Validation: Browser Console Error Detection
 *
 * Purpose: Capture all browser errors after hard refresh and cache disable
 * Context: Recent changes to AgentPostsFeed.tsx and new utility modules
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  screenshotDir: path.join(__dirname, 'debug-screenshots'),
  reportPath: path.join(__dirname, 'console-error-report.json'),
  timeout: 30000,
  waitForStability: 5000
};

// Error collectors
const errorCollector = {
  consoleErrors: [],
  consoleWarnings: [],
  consoleLogs: [],
  pageErrors: [],
  networkErrors: [],
  moduleErrors: [],
  reactErrors: []
};

/**
 * Categorize error type for better diagnosis
 */
function categorizeError(error) {
  const errorText = error.toString();

  if (errorText.includes('Module') || errorText.includes('import') || errorText.includes('Cannot find module')) {
    return 'MODULE_ERROR';
  }
  if (errorText.includes('React') || errorText.includes('component') || errorText.includes('render')) {
    return 'REACT_ERROR';
  }
  if (errorText.includes('fetch') || errorText.includes('network') || errorText.includes('CORS')) {
    return 'NETWORK_ERROR';
  }
  if (errorText.includes('timeUtils') || errorText.includes('useRelativeTime') || errorText.includes('formatRelativeTime')) {
    return 'TIME_UTILS_ERROR';
  }
  if (errorText.includes('TypeError') || errorText.includes('ReferenceError')) {
    return 'RUNTIME_ERROR';
  }

  return 'GENERIC_ERROR';
}

/**
 * Main debug script
 */
async function debugConsoleErrors() {
  console.log('Starting Browser Console Error Detection...\n');
  console.log(`Target URL: ${CONFIG.baseUrl}`);
  console.log(`Screenshot Directory: ${CONFIG.screenshotDir}\n`);

  // Ensure screenshot directory exists
  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }

  let browser;
  let context;
  let page;

  try {
    // Launch browser with specific flags to disable cache
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-cache',
        '--disable-application-cache',
        '--disable-offline-load-stale-cache',
        '--disk-cache-size=0'
      ]
    });

    // Create context with cache disabled
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
      // Disable cache at context level
      serviceWorkers: 'block'
    });

    // Enable request interception to track network
    await context.route('**/*', route => {
      route.continue();
    });

    page = await context.newPage();

    console.log('Browser launched successfully');
    console.log('Cache disabled, monitoring console output...\n');

    // ==========================================
    // LISTENER: Console Messages
    // ==========================================
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();

      const logEntry = {
        type,
        text,
        location: {
          url: location.url,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber
        },
        timestamp: new Date().toISOString(),
        args: msg.args().length
      };

      if (type === 'error') {
        errorCollector.consoleErrors.push(logEntry);
        console.log(`[CONSOLE ERROR] ${text}`);
        console.log(`  Location: ${location.url}:${location.lineNumber}:${location.columnNumber}\n`);
      } else if (type === 'warning') {
        errorCollector.consoleWarnings.push(logEntry);
        console.log(`[CONSOLE WARNING] ${text}`);
      } else if (type === 'log') {
        errorCollector.consoleLogs.push(logEntry);
      }
    });

    // ==========================================
    // LISTENER: Page Errors (Uncaught Exceptions)
    // ==========================================
    page.on('pageerror', error => {
      const errorType = categorizeError(error);

      const errorEntry = {
        message: error.message,
        name: error.name,
        stack: error.stack,
        category: errorType,
        timestamp: new Date().toISOString()
      };

      errorCollector.pageErrors.push(errorEntry);

      console.log(`[PAGE ERROR - ${errorType}]`);
      console.log(`  Message: ${error.message}`);
      console.log(`  Stack: ${error.stack}\n`);

      // Categorize specific errors
      if (errorType === 'MODULE_ERROR') {
        errorCollector.moduleErrors.push(errorEntry);
      } else if (errorType === 'REACT_ERROR') {
        errorCollector.reactErrors.push(errorEntry);
      }
    });

    // ==========================================
    // LISTENER: Network Requests
    // ==========================================
    page.on('requestfailed', request => {
      const failure = request.failure();

      const networkError = {
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        failure: failure ? failure.errorText : 'Unknown',
        timestamp: new Date().toISOString()
      };

      errorCollector.networkErrors.push(networkError);

      console.log(`[NETWORK ERROR]`);
      console.log(`  URL: ${request.url()}`);
      console.log(`  Method: ${request.method()}`);
      console.log(`  Type: ${request.resourceType()}`);
      console.log(`  Error: ${failure ? failure.errorText : 'Unknown'}\n`);
    });

    // ==========================================
    // LISTENER: Response Status Codes
    // ==========================================
    page.on('response', response => {
      const status = response.status();

      // Track 4xx and 5xx errors
      if (status >= 400) {
        const responseError = {
          url: response.url(),
          status,
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        };

        errorCollector.networkErrors.push(responseError);

        console.log(`[HTTP ERROR ${status}]`);
        console.log(`  URL: ${response.url()}`);
        console.log(`  Status: ${status} ${response.statusText()}\n`);
      }
    });

    // ==========================================
    // NAVIGATION: Open page with cache disabled
    // ==========================================
    console.log('Navigating to application...\n');

    const response = await page.goto(CONFIG.baseUrl, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout
    });

    console.log(`Page loaded with status: ${response.status()}`);

    // ==========================================
    // VALIDATION: Check for specific modules
    // ==========================================
    console.log('\nValidating module imports...');

    const moduleValidation = await page.evaluate(() => {
      const results = {
        timeUtils: false,
        useRelativeTime: false,
        formatRelativeTime: false,
        formatExactDateTime: false,
        errors: []
      };

      try {
        // Check if timeUtils functions are available in window scope
        // (they won't be, but we can check for errors)
        results.timeUtils = typeof window !== 'undefined';
      } catch (e) {
        results.errors.push(`timeUtils check failed: ${e.message}`);
      }

      return results;
    });

    console.log('Module validation:', moduleValidation);

    // ==========================================
    // SCREENSHOT: Initial state
    // ==========================================
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '01-initial-load.png'),
      fullPage: true
    });
    console.log('Screenshot captured: 01-initial-load.png');

    // ==========================================
    // WAIT: For stability and potential async errors
    // ==========================================
    console.log(`\nWaiting ${CONFIG.waitForStability}ms for page stability...`);
    await page.waitForTimeout(CONFIG.waitForStability);

    // ==========================================
    // SCREENSHOT: After stability wait
    // ==========================================
    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '02-after-stability.png'),
      fullPage: true
    });
    console.log('Screenshot captured: 02-after-stability.png');

    // ==========================================
    // HARD REFRESH: Simulate user action
    // ==========================================
    console.log('\nPerforming hard refresh (Ctrl+Shift+R)...');
    await page.reload({
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout
    });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '03-after-hard-refresh.png'),
      fullPage: true
    });
    console.log('Screenshot captured: 03-after-hard-refresh.png');

    // ==========================================
    // INTERACTION: Scroll to trigger lazy loading
    // ==========================================
    console.log('\nScrolling page to trigger any lazy-loaded errors...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(CONFIG.screenshotDir, '04-after-scroll.png'),
      fullPage: true
    });
    console.log('Screenshot captured: 04-after-scroll.png');

    // ==========================================
    // DOM INSPECTION: Check for React error boundaries
    // ==========================================
    const domInspection = await page.evaluate(() => {
      const results = {
        hasErrorBoundary: false,
        errorMessages: [],
        componentCount: 0,
        bodyContent: document.body.innerText.substring(0, 500)
      };

      // Check for common React error messages in DOM
      const errorPatterns = [
        'error',
        'failed to compile',
        'module not found',
        'cannot find module',
        'unexpected token',
        'syntax error'
      ];

      const bodyText = document.body.innerText.toLowerCase();

      errorPatterns.forEach(pattern => {
        if (bodyText.includes(pattern)) {
          results.errorMessages.push(pattern);
        }
      });

      // Count React components (rough estimate)
      results.componentCount = document.querySelectorAll('[class*="component"], [class*="Component"]').length;

      return results;
    });

    console.log('\nDOM Inspection:', domInspection);

    // ==========================================
    // NETWORK ANALYSIS: Check for failed imports
    // ==========================================
    const networkAnalysis = await page.evaluate(() => {
      if (window.performance) {
        const entries = window.performance.getEntriesByType('resource');

        return entries
          .filter(entry => entry.name.includes('.ts') || entry.name.includes('.tsx') || entry.name.includes('.js'))
          .map(entry => ({
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            type: entry.initiatorType
          }));
      }
      return [];
    });

    console.log('\nModule Resources Loaded:');
    networkAnalysis.forEach(resource => {
      console.log(`  - ${resource.name} (${resource.duration.toFixed(2)}ms, ${resource.size} bytes)`);
    });

  } catch (error) {
    console.error('\n[FATAL ERROR]');
    console.error(`Message: ${error.message}`);
    console.error(`Stack: ${error.stack}`);

    errorCollector.pageErrors.push({
      message: error.message,
      stack: error.stack,
      category: 'FATAL',
      timestamp: new Date().toISOString()
    });

    // Screenshot error state
    if (page) {
      try {
        await page.screenshot({
          path: path.join(CONFIG.screenshotDir, '99-error-state.png'),
          fullPage: true
        });
      } catch (screenshotError) {
        console.error('Failed to capture error state screenshot:', screenshotError.message);
      }
    }
  } finally {
    // ==========================================
    // REPORT GENERATION
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('ERROR DETECTION SUMMARY');
    console.log('='.repeat(60));

    console.log(`\nConsole Errors: ${errorCollector.consoleErrors.length}`);
    console.log(`Console Warnings: ${errorCollector.consoleWarnings.length}`);
    console.log(`Page Errors: ${errorCollector.pageErrors.length}`);
    console.log(`Network Errors: ${errorCollector.networkErrors.length}`);
    console.log(`Module Errors: ${errorCollector.moduleErrors.length}`);
    console.log(`React Errors: ${errorCollector.reactErrors.length}`);

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      url: CONFIG.baseUrl,
      summary: {
        consoleErrors: errorCollector.consoleErrors.length,
        consoleWarnings: errorCollector.consoleWarnings.length,
        pageErrors: errorCollector.pageErrors.length,
        networkErrors: errorCollector.networkErrors.length,
        moduleErrors: errorCollector.moduleErrors.length,
        reactErrors: errorCollector.reactErrors.length
      },
      details: errorCollector,
      screenshots: fs.readdirSync(CONFIG.screenshotDir)
    };

    fs.writeFileSync(CONFIG.reportPath, JSON.stringify(report, null, 2));
    console.log(`\nDetailed report saved to: ${CONFIG.reportPath}`);

    // ==========================================
    // RECOMMENDATIONS
    // ==========================================
    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(60));

    if (errorCollector.moduleErrors.length > 0) {
      console.log('\nMODULE IMPORT ISSUES DETECTED:');
      console.log('- Verify that timeUtils.ts and useRelativeTime.ts exist');
      console.log('- Check TypeScript compilation in Vite dev server');
      console.log('- Ensure file paths in imports are correct');
      console.log('- Check for circular dependencies');
    }

    if (errorCollector.reactErrors.length > 0) {
      console.log('\nREACT RENDERING ISSUES DETECTED:');
      console.log('- Check formatRelativeTime() implementation');
      console.log('- Verify useRelativeTime hook usage');
      console.log('- Look for null/undefined values in render');
    }

    if (errorCollector.networkErrors.length > 0) {
      console.log('\nNETWORK ISSUES DETECTED:');
      console.log('- Verify backend API is running on expected port');
      console.log('- Check CORS configuration');
      console.log('- Verify API endpoints are accessible');
    }

    if (errorCollector.consoleErrors.length === 0 && errorCollector.pageErrors.length === 0) {
      console.log('\nNO ERRORS DETECTED - Application appears healthy');
    }

    console.log('\n' + '='.repeat(60));

    // Cleanup
    if (browser) {
      await browser.close();
    }

    // Exit with appropriate code
    const hasErrors =
      errorCollector.consoleErrors.length > 0 ||
      errorCollector.pageErrors.length > 0;

    process.exit(hasErrors ? 1 : 0);
  }
}

// Run the debug script
debugConsoleErrors().catch(error => {
  console.error('Unhandled error in debug script:', error);
  process.exit(1);
});

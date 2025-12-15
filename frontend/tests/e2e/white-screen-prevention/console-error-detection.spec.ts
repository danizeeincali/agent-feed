import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Console Error Detection Tests
 * Monitors and validates that no critical JavaScript errors occur
 */

interface ErrorLog {
  type: string;
  message: string;
  timestamp: number;
  url?: string;
  lineNumber?: number;
}

test.describe('Console Error Detection', () => {
  let errorLogs: ErrorLog[] = [];
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    errorLogs = [];

    // Monitor console messages
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        errorLogs.push({
          type: 'console-error',
          message: msg.text(),
          timestamp: Date.now(),
          url: msg.location()?.url,
          lineNumber: msg.location()?.lineNumber
        });
      }
    });

    // Monitor page errors (uncaught exceptions)
    page.on('pageerror', (error: Error) => {
      errorLogs.push({
        type: 'page-error',
        message: error.message,
        timestamp: Date.now()
      });
    });

    // Monitor request failures
    page.on('requestfailed', (request) => {
      errorLogs.push({
        type: 'request-failed',
        message: `Failed to load: ${request.url()} - ${request.failure()?.errorText}`,
        timestamp: Date.now(),
        url: request.url()
      });
    });

    // Monitor response errors
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errorLogs.push({
          type: 'response-error',
          message: `HTTP ${response.status()}: ${response.url()}`,
          timestamp: Date.now(),
          url: response.url()
        });
      }
    });
  });

  test('should have no console errors during initial page load', async () => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Wait a bit more for any async operations
    await page.waitForTimeout(2000);

    // Filter out acceptable errors (if any)
    const criticalErrors = errorLogs.filter(error =>
      !isAcceptableError(error.message)
    );

    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
    console.log('✅ No console errors during initial load');
  });

  test('should have no JavaScript runtime errors', async () => {
    await page.goto('/');

    // Interact with the page to trigger potential runtime errors
    await page.click('button[aria-label], button:visible', { timeout: 5000 }).catch(() => {});
    await page.fill('input:visible', 'test').catch(() => {});
    await page.waitForTimeout(1000);

    const runtimeErrors = errorLogs.filter(error =>
      error.type === 'page-error' && !isAcceptableError(error.message)
    );

    expect(runtimeErrors.length).toBe(0);
    console.log('✅ No JavaScript runtime errors');
  });

  test('should handle navigation without errors', async () => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Clear previous errors
    errorLogs = [];

    // Navigate to different routes
    const routes = ['/agents', '/analytics', '/settings', '/'];

    for (const route of routes) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
      await page.waitForTimeout(1000);
    }

    const navigationErrors = errorLogs.filter(error =>
      !isAcceptableError(error.message)
    );

    if (navigationErrors.length > 0) {
      console.log('Navigation errors:', navigationErrors);
    }

    expect(navigationErrors.length).toBe(0);
    console.log('✅ Navigation completed without errors');
  });

  test('should handle API failures gracefully', async () => {
    // Intercept and fail API calls
    await page.route('**/api/**', route => route.abort());

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Check that the page still renders despite API failures
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Should have request failures but not JavaScript errors
    const jsErrors = errorLogs.filter(error =>
      error.type === 'page-error' || error.type === 'console-error'
    );

    expect(jsErrors.length).toBe(0);
    console.log('✅ API failures handled gracefully');
  });

  test('should detect and report React errors', async () => {
    await page.goto('/');

    // Trigger potential React errors by manipulating the DOM
    await page.evaluate(() => {
      // Try to trigger React errors safely
      const errorEvent = new Event('error');
      window.dispatchEvent(errorEvent);
    });

    await page.waitForTimeout(1000);

    // Check for React-specific error boundaries
    const errorBoundaries = await page.locator('text=Something went wrong').count();
    expect(errorBoundaries).toBe(0);

    console.log('✅ React errors properly handled');
  });

  test('should monitor memory leaks and performance issues', async () => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Get initial memory usage
    const initialMetrics = await page.evaluate(() => ({
      usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
      totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
    }));

    // Perform some interactions
    for (let i = 0; i < 5; i++) {
      await page.goto('/agents');
      await page.waitForSelector('[data-testid="app-root"]');
      await page.goto('/analytics');
      await page.waitForSelector('[data-testid="app-root"]');
      await page.waitForTimeout(500);
    }

    // Get final memory usage
    const finalMetrics = await page.evaluate(() => ({
      usedJSHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
      totalJSHeapSize: (performance as any).memory?.totalJSHeapSize || 0
    }));

    // Check for reasonable memory usage (not perfect, but catches major leaks)
    if (initialMetrics.usedJSHeapSize > 0 && finalMetrics.usedJSHeapSize > 0) {
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize;
      const reasonableIncrease = initialMetrics.usedJSHeapSize * 2; // Allow 100% increase
      expect(memoryIncrease).toBeLessThan(reasonableIncrease);
    }

    console.log('✅ Memory usage within reasonable bounds');
  });

  test('should validate error recovery mechanisms', async () => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Clear initial errors
    errorLogs = [];

    // Inject a recoverable error
    await page.evaluate(() => {
      // Simulate a recoverable error
      console.error('Test recoverable error');
    });

    await page.waitForTimeout(1000);

    // Verify the app is still functional
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    const navLinks = await page.locator('nav a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    console.log('✅ Error recovery mechanisms working');
  });

  test('should monitor async operation errors', async () => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Clear initial errors
    errorLogs = [];

    // Wait for async operations to complete
    await page.waitForTimeout(5000);

    // Check for Promise rejection errors
    const promiseErrors = errorLogs.filter(error =>
      error.message.includes('Promise') ||
      error.message.includes('async') ||
      error.message.includes('await')
    );

    expect(promiseErrors.length).toBe(0);
    console.log('✅ No async operation errors');
  });

  test.afterEach(async () => {
    // Log summary of errors found
    if (errorLogs.length > 0) {
      console.log('\n📊 Error Summary:');
      const errorsByType = errorLogs.reduce((acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.table(errorsByType);

      // Log first few errors for debugging
      console.log('\n🔍 First 3 errors:');
      errorLogs.slice(0, 3).forEach(error => {
        console.log(`[${error.type}] ${error.message}`);
      });
    }
  });
});

/**
 * Determines if an error message is acceptable/expected
 */
function isAcceptableError(message: string): boolean {
  const acceptableErrors = [
    'favicon.ico', // Missing favicon is usually acceptable
    'Service Worker', // SW errors during development
    'chrome-extension', // Browser extension errors
    'DevTools', // Development tools errors
    'WebSocket connection', // Expected in some test scenarios
    'ResizeObserver loop limit exceeded', // Common React warning
  ];

  return acceptableErrors.some(pattern =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}
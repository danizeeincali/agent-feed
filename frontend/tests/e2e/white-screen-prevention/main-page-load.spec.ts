import { test, expect, Page } from '@playwright/test';

/**
 * Main Page Load Validation Tests
 * Tests critical page loading and ensures no white screen occurs
 */

test.describe('Main Page Load Validation', () => {
  let consoleErrors: string[] = [];
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    consoleErrors = [];

    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor page errors
    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });
  });

  test('should load main page with visible content within 5 seconds', async () => {
    const startTime = Date.now();

    // Navigate to main page
    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Verify load time is reasonable
    expect(loadTime).toBeLessThan(5000);

    // Verify #root element exists and is visible
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Verify main content is present
    const mainContent = await page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    // Verify no white screen - check for actual content
    const appContainer = await page.locator('[data-testid="app-container"]');
    await expect(appContainer).toBeVisible();

    // Verify the page has rendered meaningful content
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100); // Should have substantial content

    // Check that the layout has rendered
    const sidebar = await page.locator('[data-testid="app-root"] .w-64'); // Sidebar
    await expect(sidebar).toBeVisible();

    console.log(`✅ Main page loaded successfully in ${loadTime}ms`);
  });

  test('should verify #root element is properly mounted', async () => {
    await page.goto('/');

    // Check #root element exists
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeAttached();
    await expect(rootElement).toBeVisible();

    // Verify #root has content
    const rootContent = await rootElement.innerHTML();
    expect(rootContent.length).toBeGreaterThan(0);

    // Verify React has mounted
    const reactRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.children.length > 0;
    });
    expect(reactRoot).toBe(true);

    console.log('✅ #root element properly mounted with React content');
  });

  test('should have no JavaScript errors during initial load', async () => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for React to fully mount
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Check for console errors
    expect(consoleErrors.length).toBe(0);

    if (consoleErrors.length > 0) {
      console.error('Console errors found:', consoleErrors);
    }

    console.log('✅ No JavaScript errors during initial load');
  });

  test('should render critical UI elements immediately', async () => {
    await page.goto('/');

    // Check for essential UI components
    const header = await page.locator('[data-testid="header"]');
    await expect(header).toBeVisible({ timeout: 5000 });

    const sidebar = await page.locator('.w-64'); // Sidebar navigation
    await expect(sidebar).toBeVisible({ timeout: 5000 });

    const mainContent = await page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible({ timeout: 5000 });

    // Verify app branding is visible
    const appTitle = await page.locator('text=AgentLink');
    await expect(appTitle).toBeVisible();

    console.log('✅ Critical UI elements rendered successfully');
  });

  test('should handle slow network conditions gracefully', async () => {
    // Simulate slow 3G network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    // Should still load within reasonable time even with delays
    expect(loadTime).toBeLessThan(10000);

    // Verify content is still visible
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    console.log(`✅ Page loaded gracefully under slow network in ${loadTime}ms`);
  });

  test('should display loading states appropriately', async () => {
    // Intercept and delay API calls to see loading states
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/');

    // Look for loading indicators
    const loadingSpinner = await page.locator('.animate-spin');
    if (await loadingSpinner.count() > 0) {
      await expect(loadingSpinner.first()).toBeVisible();
      console.log('✅ Loading spinner displayed during API calls');
    }

    // Verify final content loads
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 15000 });

    console.log('✅ Loading states handled appropriately');
  });

  test('should recover from temporary network failures', async () => {
    let failCount = 0;

    // Fail first 2 requests, then succeed
    await page.route('**/*', async route => {
      if (failCount < 2 && route.request().url().includes('localhost:5173')) {
        failCount++;
        await route.abort();
        return;
      }
      await route.continue();
    });

    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });

    // Should eventually load successfully
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible({ timeout: 20000 });

    console.log('✅ Recovered from temporary network failures');
  });

  test.afterEach(async () => {
    // Log any errors found during test
    if (consoleErrors.length > 0) {
      console.log('Console errors during test:', consoleErrors);
    }
  });
});
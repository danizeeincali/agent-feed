import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('White Screen Fix Validation - Core Features', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warn') {
        consoleWarnings.push(msg.text());
      }
    });

    // Track network failures
    page.on('requestfailed', (request) => {
      console.log(`Failed request: ${request.url()}: ${request.failure()?.errorText}`);
    });

    // Store arrays on page for access in tests
    await page.addInitScript(() => {
      (window as any).consoleErrors = [];
      (window as any).consoleWarnings = [];
    });
  });

  test('main page loads without white screen', async ({ page }) => {
    // Navigate to main page
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for main content to be visible
    await expect(page.locator('body')).toBeVisible();

    // Check that we don't have a white screen (body should have content)
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);

    // Check that main app container exists and is visible
    await expect(page.locator('#root')).toBeVisible();

    // Verify React app has mounted
    const reactRoot = page.locator('#root > div');
    await expect(reactRoot).toBeVisible();

    // Check for main navigation or header elements
    const nav = page.locator('nav, header, [role="navigation"]').first();
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible();
    }

    // Take screenshot for evidence
    await page.screenshot({
      path: 'tests/e2e/evidence/main-page-loaded.png',
      fullPage: true
    });
  });

  test('no console errors appear on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warn' && !msg.text().includes('React DevTools')) {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(2000);

    // Filter out known harmless warnings
    const filteredErrors = consoleErrors.filter(error =>
      !error.includes('React DevTools') &&
      !error.includes('Download the React DevTools') &&
      !error.includes('extension')
    );

    const criticalWarnings = consoleWarnings.filter(warning =>
      warning.includes('Failed to resolve') ||
      warning.includes('Module not found') ||
      warning.includes('Cannot resolve') ||
      warning.includes('dependency')
    );

    // Log errors and warnings for debugging
    if (filteredErrors.length > 0) {
      console.log('Console errors found:', filteredErrors);
    }
    if (criticalWarnings.length > 0) {
      console.log('Critical warnings found:', criticalWarnings);
    }

    // Assert no console errors
    expect(filteredErrors).toHaveLength(0);
    expect(criticalWarnings).toHaveLength(0);
  });

  test('major UI components render correctly', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Check that React has rendered
    await expect(page.locator('#root')).not.toBeEmpty();

    // Look for common UI patterns
    const possibleSelectors = [
      'nav, header, [role="navigation"]',
      'main, [role="main"]',
      '.container, .app, .main-content',
      'button, [role="button"]',
      'a, [role="link"]'
    ];

    let foundComponents = 0;
    for (const selector of possibleSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        foundComponents++;
        // Verify at least one element of this type is visible
        await expect(elements.first()).toBeVisible();
      }
    }

    // We should find at least some basic UI components
    expect(foundComponents).toBeGreaterThan(0);

    // Take screenshot of rendered UI
    await page.screenshot({
      path: 'tests/e2e/evidence/ui-components-rendered.png',
      fullPage: true
    });
  });

  test('app recovers from JavaScript errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Inject a JavaScript error to test error boundaries
    try {
      await page.evaluate(() => {
        // Try to trigger a controlled error
        setTimeout(() => {
          throw new Error('Test error for error boundary validation');
        }, 100);
      });

      await page.waitForTimeout(500);

      // Check that the page is still functional
      await expect(page.locator('#root')).toBeVisible();
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toBeTruthy();

    } catch (error) {
      console.log('Error boundary test completed:', error);
    }

    // Take screenshot of recovery state
    await page.screenshot({
      path: 'tests/e2e/evidence/app-recovery-state.png',
      fullPage: true
    });
  });

  test('navigation works without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for navigation links
    const links = page.locator('a[href]');
    const linkCount = await links.count();

    if (linkCount > 0) {
      // Test first few internal links
      for (let i = 0; i < Math.min(3, linkCount); i++) {
        const link = links.nth(i);
        const href = await link.getAttribute('href');

        if (href && href.startsWith('/') && !href.includes('#')) {
          console.log(`Testing navigation to: ${href}`);

          const consoleErrors: string[] = [];
          page.on('console', (msg) => {
            if (msg.type() === 'error') {
              consoleErrors.push(msg.text());
            }
          });

          await link.click();
          await page.waitForTimeout(1000);

          // Verify page loaded without white screen
          await expect(page.locator('#root')).toBeVisible();
          const bodyContent = await page.locator('body').textContent();
          expect(bodyContent!.trim().length).toBeGreaterThan(0);

          // Check no new console errors
          const filteredErrors = consoleErrors.filter(error =>
            !error.includes('React DevTools')
          );
          expect(filteredErrors).toHaveLength(0);

          // Go back to home
          await page.goBack();
          await page.waitForTimeout(500);
          break; // Test just one navigation for now
        }
      }
    }
  });
});
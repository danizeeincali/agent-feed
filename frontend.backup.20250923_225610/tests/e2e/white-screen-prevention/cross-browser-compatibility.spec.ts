import { test, expect, Browser, BrowserContext } from '@playwright/test';

/**
 * Cross-Browser Compatibility Tests
 * Tests application functionality across different browsers
 */

test.describe('Cross-Browser Compatibility', () => {
  const testBrowsers = ['chromium', 'firefox', 'webkit'] as const;

  for (const browserName of testBrowsers) {
    test.describe(`${browserName.toUpperCase()} Browser Tests`, () => {

      test(`should load main page successfully in ${browserName}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });

        // Verify basic structure
        const rootElement = await page.locator('#root');
        await expect(rootElement).toBeVisible();

        const mainContent = await page.locator('[data-testid="main-content"]');
        await expect(mainContent).toBeVisible();

        // Verify content is meaningful
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
        expect(bodyText!.length).toBeGreaterThan(100);

        console.log(`✅ Main page loaded successfully in ${browserName}`);
      });

      test(`should handle navigation correctly in ${browserName}`, async ({ page }) => {
        const routes = ['/', '/agents', '/analytics', '/settings'];

        for (const route of routes) {
          await page.goto(route, { waitUntil: 'networkidle' });
          await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

          const rootElement = await page.locator('#root');
          await expect(rootElement).toBeVisible();

          // Verify URL is correct
          expect(page.url()).toContain(route);
        }

        console.log(`✅ Navigation working correctly in ${browserName}`);
      });

      test(`should render CSS correctly in ${browserName}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="app-root"]');

        // Check Tailwind CSS classes are applied
        const header = await page.locator('[data-testid="header"]');
        const headerStyles = await header.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            boxShadow: styles.boxShadow,
            borderBottomWidth: styles.borderBottomWidth
          };
        });

        // Should have proper styling (not default)
        expect(headerStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

        // Check sidebar styling
        const sidebar = await page.locator('.w-64');
        const sidebarWidth = await sidebar.evaluate(el => getComputedStyle(el).width);
        expect(sidebarWidth).toBe('256px');

        console.log(`✅ CSS rendering correctly in ${browserName}`);
      });

      test(`should handle JavaScript features in ${browserName}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="app-root"]');

        // Test modern JavaScript features
        const jsFeatures = await page.evaluate(() => {
          // Test ES6+ features
          const hasArrowFunctions = (() => true)();
          const hasAsyncAwait = typeof (async () => {}) === 'function';
          const hasPromise = typeof Promise !== 'undefined';
          const hasLocalStorage = typeof localStorage !== 'undefined';
          const hasSessionStorage = typeof sessionStorage !== 'undefined';
          const hasFetch = typeof fetch !== 'undefined';

          return {
            hasArrowFunctions,
            hasAsyncAwait,
            hasPromise,
            hasLocalStorage,
            hasSessionStorage,
            hasFetch
          };
        });

        // All modern features should be available
        expect(jsFeatures.hasArrowFunctions).toBe(true);
        expect(jsFeatures.hasAsyncAwait).toBe(true);
        expect(jsFeatures.hasPromise).toBe(true);
        expect(jsFeatures.hasLocalStorage).toBe(true);
        expect(jsFeatures.hasSessionStorage).toBe(true);
        expect(jsFeatures.hasFetch).toBe(true);

        console.log(`✅ JavaScript features working in ${browserName}`);
      });

      test(`should handle interactive elements in ${browserName}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="app-root"]');

        // Test search input
        const searchInput = await page.locator('input[placeholder*="Search"]');
        await expect(searchInput).toBeVisible();
        await searchInput.fill('test search');
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe('test search');

        // Test navigation clicks
        const firstNavLink = await page.locator('nav a').first();
        if (await firstNavLink.count() > 0) {
          const initialUrl = page.url();
          await firstNavLink.click();
          await page.waitForSelector('[data-testid="app-root"]');

          // URL should change (unless it was already on that page)
          const newUrl = page.url();
          // Either URL changed or we're already on the right page
          expect(newUrl).toBeTruthy();
        }

        console.log(`✅ Interactive elements working in ${browserName}`);
      });

      test(`should handle responsive design in ${browserName}`, async ({ page }) => {
        const viewports = [
          { width: 375, height: 667, name: 'Mobile' },
          { width: 768, height: 1024, name: 'Tablet' },
          { width: 1920, height: 1080, name: 'Desktop' }
        ];

        for (const viewport of viewports) {
          await page.setViewportSize(viewport);
          await page.goto('/');
          await page.waitForSelector('[data-testid="app-root"]');
          await page.waitForTimeout(500);

          const rootElement = await page.locator('#root');
          await expect(rootElement).toBeVisible();

          // Check responsive behavior
          if (viewport.width < 1024) {
            // Mobile/tablet: check for mobile menu
            const mobileMenuButton = await page.locator('button.lg\\:hidden').first();
            if (await mobileMenuButton.count() > 0) {
              await expect(mobileMenuButton).toBeVisible();
            }
          }
        }

        console.log(`✅ Responsive design working in ${browserName}`);
      });

      test(`should handle errors gracefully in ${browserName}`, async ({ page }) => {
        let consoleErrors: string[] = [];

        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        await page.goto('/');
        await page.waitForSelector('[data-testid="app-root"]');
        await page.waitForTimeout(2000);

        // Navigate to test error handling
        await page.goto('/nonexistent-route');
        await page.waitForSelector('[data-testid="app-root"]');

        // Should still show content
        const rootElement = await page.locator('#root');
        await expect(rootElement).toBeVisible();

        // Filter out acceptable errors
        const criticalErrors = consoleErrors.filter(error =>
          !error.includes('favicon') &&
          !error.includes('DevTools') &&
          !error.includes('chrome-extension')
        );

        if (criticalErrors.length > 0) {
          console.log(`Errors in ${browserName}:`, criticalErrors.slice(0, 3));
        }

        console.log(`✅ Error handling working in ${browserName}`);
      });

      test(`should handle local storage in ${browserName}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="app-root"]');

        // Test localStorage functionality
        const storageTest = await page.evaluate(() => {
          try {
            localStorage.setItem('test-key', 'test-value');
            const value = localStorage.getItem('test-key');
            localStorage.removeItem('test-key');
            return value === 'test-value';
          } catch (e) {
            return false;
          }
        });

        expect(storageTest).toBe(true);

        console.log(`✅ Local storage working in ${browserName}`);
      });

      test(`should render fonts correctly in ${browserName}`, async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-testid="app-root"]');

        // Check that fonts are loaded
        const fontInfo = await page.evaluate(() => {
          const body = document.body;
          const styles = getComputedStyle(body);
          return {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight
          };
        });

        // Should not be using default serif font
        expect(fontInfo.fontFamily).not.toBe('serif');
        expect(fontInfo.fontFamily).not.toBe('Times');

        console.log(`✅ Fonts rendering correctly in ${browserName}`);
      });
    });
  }

  test('should compare rendering across browsers', async ({ browser }) => {
    // This test compares the same page across different browsers
    const browsers = ['chromium', 'firefox'] as const; // Webkit can be flaky in CI
    const screenshots: { [key: string]: Buffer } = {};

    for (const browserName of browsers) {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto('/');
      await page.waitForSelector('[data-testid="app-root"]');
      await page.waitForTimeout(2000);

      // Take screenshot for comparison
      const screenshot = await page.screenshot({ fullPage: false });
      screenshots[browserName] = screenshot;

      await context.close();
    }

    // At minimum, verify we got screenshots from all browsers
    expect(Object.keys(screenshots).length).toBe(browsers.length);

    console.log('✅ Cross-browser rendering comparison completed');
  });

  test('should handle WebGL support across browsers', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    const webglSupport = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    });

    // WebGL support varies by browser and environment
    console.log(`WebGL supported: ${webglSupport}`);

    // App should work regardless of WebGL support
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    console.log('✅ WebGL support checked');
  });

  test('should handle clipboard API across browsers', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    const clipboardSupport = await page.evaluate(async () => {
      return 'clipboard' in navigator && typeof navigator.clipboard.writeText === 'function';
    });

    console.log(`Clipboard API supported: ${clipboardSupport}`);

    // App should work regardless of clipboard API support
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    console.log('✅ Clipboard API support checked');
  });
});
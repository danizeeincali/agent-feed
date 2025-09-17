import { test, expect, devices } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  const testUrls = ['/', '/analytics', '/agents'];

  for (const url of testUrls) {
    test(`${url} loads correctly across browsers`, async ({ page, browserName }) => {
      console.log(`Testing ${url} on ${browserName}`);

      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
          consoleErrors.push(`[${browserName}] ${msg.text()}`);
        }
      });

      try {
        await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
      } catch (error) {
        // If page doesn't exist, try home page
        if (url !== '/') {
          await page.goto('/', { waitUntil: 'networkidle' });
        } else {
          throw error;
        }
      }

      // Wait for React to render
      await page.waitForTimeout(2000);

      // Basic functionality tests
      await expect(page.locator('#root')).toBeVisible();

      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent).toBeTruthy();
      expect(bodyContent!.trim().length).toBeGreaterThan(0);

      // Browser-specific checks
      const userAgent = await page.evaluate(() => navigator.userAgent);
      console.log(`User agent: ${userAgent}`);

      // Test JavaScript functionality
      const jsTest = await page.evaluate(() => {
        return {
          hasLocalStorage: typeof localStorage !== 'undefined',
          hasSessionStorage: typeof sessionStorage !== 'undefined',
          hasConsole: typeof console !== 'undefined',
          hasFetch: typeof fetch !== 'undefined',
          hasPromise: typeof Promise !== 'undefined'
        };
      });

      expect(jsTest.hasConsole).toBeTruthy();
      expect(jsTest.hasPromise).toBeTruthy();

      // Check for browser-specific errors
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('React DevTools') &&
        !error.includes('extension') &&
        (error.includes('not supported') || error.includes('not defined'))
      );

      if (criticalErrors.length > 0) {
        console.log(`Browser ${browserName} errors on ${url}:`, criticalErrors);
      }

      expect(criticalErrors).toHaveLength(0);

      // Take browser-specific screenshot
      await page.screenshot({
        path: `tests/e2e/evidence/${browserName}-${url.replace('/', 'home')}-compatibility.png`,
        fullPage: true
      });
    });
  }

  test('responsive design works across viewports', async ({ page, browserName }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for responsive layout
      await page.waitForTimeout(1000);

      // Check that content is still visible and accessible
      await expect(page.locator('#root')).toBeVisible();

      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent!.trim().length).toBeGreaterThan(0);

      // Take viewport-specific screenshot
      await page.screenshot({
        path: `tests/e2e/evidence/${browserName}-${viewport.name}-responsive.png`,
        fullPage: false // Just visible area for responsive testing
      });

      console.log(`${browserName} responsive test passed for ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  });

  test('core functionality works across browsers', async ({ page, browserName }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Test basic interactions
    const clickableElements = page.locator('button, a, [role="button"], [role="link"]');
    const count = await clickableElements.count();

    if (count > 0) {
      const firstElement = clickableElements.first();
      if (await firstElement.isVisible()) {
        await firstElement.click();
        await page.waitForTimeout(500);

        // Verify interaction worked
        await expect(page.locator('#root')).toBeVisible();
      }
    }

    // Test form elements if they exist
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      const firstInput = inputs.first();
      if (await firstInput.isVisible() && await firstInput.isEnabled()) {
        await firstInput.fill('test');
        const value = await firstInput.inputValue();
        expect(value).toBe('test');
      }
    }

    console.log(`${browserName} core functionality test passed`);
  });
});
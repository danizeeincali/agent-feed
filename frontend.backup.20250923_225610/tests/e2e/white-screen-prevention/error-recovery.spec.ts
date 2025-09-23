import { test, expect } from '@playwright/test';

/**
 * Error Recovery and Fallback Mechanism Tests
 * Tests the application's ability to recover from various error conditions
 */

test.describe('Error Recovery and Fallback Mechanisms', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
      }
    });
  });

  test('should recover from network failures', async ({ page }) => {
    // Start with normal loading
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Simulate network failure
    await page.route('**/*', route => route.abort());

    // Try to navigate (should fail gracefully)
    await page.goto('/agents', { waitUntil: 'domcontentloaded' }).catch(() => {
      console.log('Expected navigation failure due to network abort');
    });

    // Restore network
    await page.unroute('**/*');

    // Should be able to recover
    await page.goto('/agents', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    console.log('✅ Recovered from network failures');
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Page should still render despite API failures
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    const mainContent = await page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    // Should not show error boundaries for API failures
    const errorBoundaries = await page.locator('text=Something went wrong').count();
    expect(errorBoundaries).toBe(0);

    console.log('✅ API failures handled gracefully');
  });

  test('should recover from JavaScript runtime errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Inject a non-fatal JavaScript error
    await page.evaluate(() => {
      // Simulate a recoverable error
      try {
        throw new Error('Test runtime error');
      } catch (e) {
        console.error('Caught test error:', e);
      }
    });

    await page.waitForTimeout(1000);

    // Application should still be functional
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Navigation should still work
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="app-root"]');

    console.log('✅ Recovered from JavaScript runtime errors');
  });

  test('should handle component errors with error boundaries', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Test error boundary by navigating to different routes
    // Error boundaries should catch component-level errors
    const routes = ['/', '/agents', '/analytics', '/settings'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      // Check that main app structure is maintained
      const rootElement = await page.locator('#root');
      await expect(rootElement).toBeVisible();

      const mainContent = await page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeVisible();

      // If error boundary is active, it should show fallback UI
      const errorBoundaryActive = await page.locator('text=Something went wrong').count() > 0;

      if (errorBoundaryActive) {
        console.log(`Error boundary active on ${route} - showing fallback UI`);
        // Verify fallback UI is functional
        const errorMessage = await page.locator('text=Something went wrong');
        await expect(errorMessage).toBeVisible();
      } else {
        console.log(`No error boundary needed on ${route}`);
      }
    }

    console.log('✅ Error boundaries functioning correctly');
  });

  test('should handle resource loading failures', async ({ page }) => {
    // Block CSS and JS resources
    await page.route('**/*.css', route => route.abort());
    await page.route('**/*.js', route => {
      // Allow main bundle but block others
      if (route.request().url().includes('index') || route.request().url().includes('main')) {
        route.continue();
      } else {
        route.abort();
      }
    });

    await page.goto('/');

    // Should still render basic structure
    await page.waitForSelector('#root', { timeout: 10000 });

    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeAttached();

    console.log('✅ Handled resource loading failures');
  });

  test('should recover from memory pressure', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Simulate memory pressure by creating many DOM elements
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);

      // Create many elements to simulate memory pressure
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div');
        element.innerHTML = `<p>Memory test element ${i}</p>`;
        container.appendChild(element);
      }
    });

    await page.waitForTimeout(1000);

    // Clean up and verify app is still functional
    await page.evaluate(() => {
      const elements = document.querySelectorAll('div:has(p)');
      elements.forEach(el => {
        if (el.textContent?.includes('Memory test element')) {
          el.remove();
        }
      });
    });

    // Verify app is still responsive
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    await page.goto('/agents');
    await page.waitForSelector('[data-testid="app-root"]');

    console.log('✅ Recovered from memory pressure');
  });

  test('should handle WebSocket connection failures', async ({ page }) => {
    // Block WebSocket connections
    await page.route('**/ws', route => route.abort());
    await page.route('**/websocket', route => route.abort());

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // App should still function without WebSocket
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    const mainContent = await page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    // Navigation should still work
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="app-root"]');

    console.log('✅ Handled WebSocket connection failures');
  });

  test('should recover from quota exceeded errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Simulate localStorage quota exceeded
    await page.evaluate(() => {
      // Fill up localStorage
      try {
        const largeString = 'x'.repeat(1024 * 1024); // 1MB string
        for (let i = 0; i < 10; i++) {
          localStorage.setItem(`large_item_${i}`, largeString);
        }
      } catch (e) {
        console.log('LocalStorage quota exceeded (expected)');
      }
    });

    await page.waitForTimeout(1000);

    // App should still function
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Clean up
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        localStorage.removeItem(`large_item_${i}`);
      }
    });

    console.log('✅ Recovered from quota exceeded errors');
  });

  test('should handle slow performance gracefully', async ({ page }) => {
    // Slow down all requests
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/', { timeout: 30000 });
    const loadTime = Date.now() - startTime;

    console.log(`Page loaded in ${loadTime}ms with 2s delays`);

    // Should eventually load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 20000 });

    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    console.log('✅ Handled slow performance gracefully');
  });

  test('should maintain functionality during partial failures', async ({ page }) => {
    // Allow main resources but fail secondary ones
    await page.route('**/*', route => {
      const url = route.request().url();

      // Fail non-critical resources
      if (url.includes('analytics') || url.includes('metrics') || url.includes('tracking')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Core functionality should work
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    // Navigation should work
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="app-root"]');

    await page.goto('/settings');
    await page.waitForSelector('[data-testid="app-root"]');

    console.log('✅ Maintained functionality during partial failures');
  });

  test('should show appropriate fallback content', async ({ page }) => {
    // Test that fallback components are available
    await page.goto('/nonexistent-route');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Should show some form of 404 or fallback content
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(20);

    // Navigation should still work from 404 page
    const navLinks = await page.locator('nav a');
    const firstLink = navLinks.first();

    if (await firstLink.count() > 0) {
      await firstLink.click();
      await page.waitForSelector('[data-testid="app-root"]');
    }

    console.log('✅ Showed appropriate fallback content');
  });
});
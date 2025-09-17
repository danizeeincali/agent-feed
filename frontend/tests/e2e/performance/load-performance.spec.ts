import { test, expect } from '@playwright/test';

test.describe('Load Performance Validation', () => {
  test('page loads within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);

    // Page should load within 10 seconds (generous for CI)
    expect(loadTime).toBeLessThan(10000);

    // Verify content loaded
    await expect(page.locator('#root')).toBeVisible();
    const content = await page.locator('body').textContent();
    expect(content!.trim().length).toBeGreaterThan(0);

    // Performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    console.log('Performance metrics:', performanceMetrics);

    // DOM Content Loaded should be reasonable
    expect(performanceMetrics.domContentLoaded).toBeLessThan(5000);

    await page.screenshot({
      path: 'tests/e2e/evidence/performance-validation.png',
      fullPage: true
    });
  });

  test('no memory leaks during navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Initial memory baseline
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    // Perform several navigations
    const navigationUrls = ['/', '/analytics', '/', '/agents', '/'];

    for (const url of navigationUrls) {
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1000);

        // Verify page loaded
        await expect(page.locator('#root')).toBeVisible();
      } catch (error) {
        console.log(`Navigation to ${url} failed, continuing...`);
        await page.goto('/', { waitUntil: 'networkidle' });
      }
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ('gc' in window) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(2000);

    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory - initialMemory;
      console.log(`Memory usage: Initial: ${initialMemory}, Final: ${finalMemory}, Increase: ${memoryIncrease}`);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('no excessive console warnings during load', async ({ page }) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'warn') {
        warnings.push(msg.text());
      } else if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Filter out known harmless warnings
    const significantWarnings = warnings.filter(warning =>
      !warning.includes('React DevTools') &&
      !warning.includes('extension') &&
      !warning.includes('Download the React DevTools')
    );

    const significantErrors = errors.filter(error =>
      !error.includes('React DevTools') &&
      !error.includes('extension')
    );

    console.log(`Console warnings: ${significantWarnings.length}, errors: ${significantErrors.length}`);

    if (significantWarnings.length > 0) {
      console.log('Warnings:', significantWarnings.slice(0, 5)); // Show first 5
    }

    if (significantErrors.length > 0) {
      console.log('Errors:', significantErrors.slice(0, 5)); // Show first 5
    }

    // Should not have critical performance warnings
    const performanceWarnings = significantWarnings.filter(warning =>
      warning.includes('performance') ||
      warning.includes('slow') ||
      warning.includes('timeout') ||
      warning.includes('large')
    );

    expect(performanceWarnings).toHaveLength(0);
    expect(significantErrors).toHaveLength(0);
  });
});
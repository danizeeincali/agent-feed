import { test, expect, devices } from '@playwright/test';

// Cross-browser testing for Chrome and Firefox
const browsers = ['chromium', 'firefox'];

browsers.forEach(browserName => {
  test.describe(`Analytics Cross-Browser Tests - ${browserName}`, () => {
    test.use({
      browserName: browserName as 'chromium' | 'firefox',
      // Use desktop viewport for consistent testing
      viewport: { width: 1920, height: 1080 }
    });

    test(`${browserName}: Complete analytics flow works without timeout errors`, async ({ page }) => {
      await page.goto('/analytics');

      await test.step('System Analytics loads in both browsers', async () => {
        await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      });

      await test.step('Claude SDK tab loads consistently across browsers', async () => {
        const loadStart = Date.now();

        await page.click('[data-testid="claude-sdk-tab"]');
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

        const loadTime = Date.now() - loadStart;
        console.log(`${browserName} - Claude SDK loaded in ${loadTime}ms`);

        // Browser-specific performance expectations
        const maxLoadTime = browserName === 'firefox' ? 6000 : 5000; // Firefox gets slightly more time
        expect(loadTime).toBeLessThan(maxLoadTime);

        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      });

      await test.step('All sub-tabs work in both browsers', async () => {
        const subTabs = [
          'cost-overview-tab',
          'usage-metrics-tab',
          'model-performance-tab',
          'cost-breakdown-tab'
        ];

        for (const tabId of subTabs) {
          const subTabStart = Date.now();

          await page.click(`[data-testid="${tabId}"]`);
          await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 10000 });

          const subTabTime = Date.now() - subTabStart;
          console.log(`${browserName} - ${tabId} loaded in ${subTabTime}ms`);

          // No timeout errors
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
          await expect(page.locator('text=Failed to load')).not.toBeVisible();

          await page.waitForTimeout(500);
        }
      });
    });

    test(`${browserName}: Error handling works consistently`, async ({ page }) => {
      // Simulate API failure
      await page.route('/api/analytics/**', (route) => {
        route.abort('failed');
      });

      await page.goto('/analytics');

      await test.step('Both browsers handle API failures gracefully', async () => {
        await page.click('[data-testid="claude-sdk-tab"]');

        // Should show error state, not timeout
        await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

        // Error message should be present
        await expect(page.locator('text=Unable to load analytics data')).toBeVisible();
      });
    });

    test(`${browserName}: Performance under browser-specific conditions`, async ({ page }) => {
      // Test browser-specific performance characteristics
      await page.goto('/analytics');

      await test.step(`${browserName} specific performance test`, async () => {
        // Chrome: Test with many concurrent requests
        // Firefox: Test with memory constraints
        if (browserName === 'chromium') {
          // Simulate high-load scenario
          await page.route('/api/analytics/**', (route) => {
            // Small delay to simulate load
            setTimeout(() => route.continue(), 100);
          });
        } else {
          // Firefox: Test memory-conscious loading
          await page.route('/api/analytics/**', (route) => {
            // Simulate chunked loading
            setTimeout(() => route.continue(), 50);
          });
        }

        const performanceStart = Date.now();

        await page.click('[data-testid="claude-sdk-tab"]');
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

        // Test all sub-tabs
        const tabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

        for (const tabId of tabs) {
          await page.click(`[data-testid="${tabId}"]`);
          await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 10000 });
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        }

        const totalTime = Date.now() - performanceStart;
        console.log(`${browserName} - Complete flow under load: ${totalTime}ms`);

        // Browser-specific performance expectations
        const maxTotalTime = browserName === 'firefox' ? 30000 : 25000;
        expect(totalTime).toBeLessThan(maxTotalTime);
      });
    });
  });
});

// Mobile responsiveness tests
test.describe('Mobile Analytics Responsiveness', () => {
  test.use({ ...devices['iPhone 12'] });

  test('Analytics components are responsive on mobile', async ({ page }) => {
    await page.goto('/analytics');

    await test.step('Mobile System Analytics displays correctly', async () => {
      await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 10000 });

      // Check mobile-specific layout
      const viewport = page.viewportSize();
      expect(viewport?.width).toBeLessThan(500);

      // Verify mobile navigation works
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
    });

    await test.step('Mobile Claude SDK tab works without timeout', async () => {
      // On mobile, might need to open navigation first
      await page.click('[data-testid="mobile-nav-menu"]').catch(() => {
        // If no mobile menu, proceed normally
      });

      const mobileLoadStart = Date.now();

      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

      const mobileLoadTime = Date.now() - mobileLoadStart;
      console.log(`Mobile Claude SDK loaded in ${mobileLoadTime}ms`);

      // Mobile gets more time due to potentially slower hardware
      expect(mobileLoadTime).toBeLessThan(8000);

      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });

    await test.step('Mobile sub-tabs are accessible and functional', async () => {
      const mobileTabs = [
        'cost-overview-tab',
        'usage-metrics-tab',
        'model-performance-tab',
        'cost-breakdown-tab'
      ];

      for (const tabId of mobileTabs) {
        await page.click(`[data-testid="${tabId}"]`);

        // Wait for mobile layout to adjust
        await page.waitForTimeout(500);

        await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 12000 });

        // Check that content is properly sized for mobile
        const content = page.locator(`[data-testid="${tabId}-content"]`);
        const boundingBox = await content.boundingBox();

        if (boundingBox) {
          expect(boundingBox.width).toBeLessThan(400); // Should fit mobile width
        }

        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      }
    });
  });
});

// Tablet responsiveness test
test.describe('Tablet Analytics Responsiveness', () => {
  test.use({ ...devices['iPad Pro'] });

  test('Analytics work correctly on tablet', async ({ page }) => {
    await page.goto('/analytics');

    await test.step('Tablet layout loads without issues', async () => {
      await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 10000 });

      const tabletLoadStart = Date.now();

      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 12000 });

      const tabletLoadTime = Date.now() - tabletLoadStart;
      console.log(`Tablet Claude SDK loaded in ${tabletLoadTime}ms`);

      expect(tabletLoadTime).toBeLessThan(6000);
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });
});
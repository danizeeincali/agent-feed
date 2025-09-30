import { test, expect, Page } from '@playwright/test';

test.describe('Analytics Loading Timeout - Regression Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Enable console monitoring to catch any timeout-related logs
    page.on('console', (msg) => {
      if (msg.text().includes('timeout') || msg.text().includes('Loading Timeout')) {
        console.warn(`Console warning: ${msg.text()}`);
      }
    });

    await page.goto('/analytics');
  });

  test('REGRESSION: Loading Timeout messages should never appear', async () => {
    await test.step('Navigate through all analytics sections', async () => {
      // Test system analytics first
      await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Navigate to Claude SDK
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

      // Critical assertion: No timeout messages anywhere
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      await expect(page.locator('[data-testid*="timeout"]')).not.toBeVisible();

      // Test all sub-tabs for timeout messages
      const subTabs = [
        'cost-overview-tab',
        'usage-metrics-tab',
        'model-performance-tab',
        'cost-breakdown-tab'
      ];

      for (const tabId of subTabs) {
        await page.click(`[data-testid="${tabId}"]`);
        await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 10000 });

        // Critical: No timeout messages in any sub-tab
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        await expect(page.locator('text=Request timeout')).not.toBeVisible();
        await expect(page.locator('text=Timeout error')).not.toBeVisible();

        await page.waitForTimeout(500);
      }
    });
  });

  test('REGRESSION: Multiple rapid navigation should not cause timeouts', async () => {
    await test.step('Rapid navigation stress test', async () => {
      // Simulate user rapidly clicking between tabs
      for (let cycle = 0; cycle < 5; cycle++) {
        // Switch to Claude SDK
        await page.click('[data-testid="claude-sdk-tab"]');
        await page.waitForTimeout(200); // Don't wait for full load

        // Switch back to System Analytics
        await page.click('[data-testid="system-analytics-tab"]');
        await page.waitForTimeout(200);

        // Check for timeout errors after each cycle
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      }

      // Final verification - everything should still work
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('REGRESSION: Slow network conditions should show loading states, not timeouts', async () => {
    await test.step('Simulate slow network', async () => {
      // Throttle network to simulate slow conditions
      const context = page.context();
      await context.route('/api/analytics/**', (route) => {
        // Delay API responses by 2-4 seconds
        const delay = 2000 + Math.random() * 2000;
        setTimeout(() => route.continue(), delay);
      });

      await page.reload();

      // Navigate to Claude SDK under slow conditions
      await page.click('[data-testid="claude-sdk-tab"]');

      // Should show loading state, not timeout
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Should eventually load successfully
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('REGRESSION: Browser refresh should not cause timeout errors', async () => {
    await test.step('Test refresh scenarios', async () => {
      // Navigate to Claude SDK first
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

      // Refresh the page
      await page.reload();

      // Should load without timeout errors
      await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Navigate back to Claude SDK
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('REGRESSION: Memory pressure should not cause timeout errors', async () => {
    await test.step('Simulate memory pressure', async () => {
      // Create memory pressure by opening many tabs and loading data
      const tabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

      // Navigate to Claude SDK
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

      // Rapidly cycle through all sub-tabs multiple times
      for (let cycle = 0; cycle < 10; cycle++) {
        for (const tabId of tabs) {
          await page.click(`[data-testid="${tabId}"]`);
          await page.waitForTimeout(100); // Minimal wait to create pressure

          // Check for timeout errors during pressure
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        }
      }

      // Final verification - last tab should load properly
      await page.click('[data-testid="cost-breakdown-tab"]');
      await expect(page.locator('[data-testid="cost-breakdown-tab-content"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('REGRESSION: API error handling should not show timeout messages', async () => {
    await test.step('Test API error scenarios', async () => {
      // Simulate various API error responses
      await page.route('/api/analytics/claude-sdk/overview', (route) => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await page.route('/api/analytics/claude-sdk/usage', (route) => {
        route.fulfill({ status: 404, body: 'Not Found' });
      });

      await page.click('[data-testid="claude-sdk-tab"]');

      // Should show appropriate error messages, not timeout
      await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Error should be descriptive
      await expect(page.locator('text=Unable to load analytics data')).toBeVisible();

      // Test sub-tabs with errors
      await page.click('[data-testid="cost-overview-tab"]');
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      await page.click('[data-testid="usage-metrics-tab"]');
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('REGRESSION: Component unmounting should not cause timeout errors', async () => {
    await test.step('Test component lifecycle', async () => {
      // Navigate to Claude SDK
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

      // Quickly navigate away while loading
      await page.click('[data-testid="cost-overview-tab"]');
      await page.waitForTimeout(100);

      // Navigate to different page entirely
      await page.goto('/');
      await page.waitForTimeout(500);

      // Navigate back to analytics
      await page.goto('/analytics');
      await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 10000 });

      // Navigate to Claude SDK again
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

      // Should not have any timeout errors from previous unmounting
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('REGRESSION: Concurrent API calls should not cause timeout race conditions', async () => {
    await test.step('Test concurrent API handling', async () => {
      let apiCallCount = 0;

      // Monitor API calls
      await page.route('/api/analytics/**', (route) => {
        apiCallCount++;
        // Add small random delays to create race conditions
        const delay = Math.random() * 1000;
        setTimeout(() => route.continue(), delay);
      });

      // Navigate to Claude SDK (triggers multiple API calls)
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

      // Rapidly switch between sub-tabs to trigger more concurrent calls
      const tabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

      for (const tabId of tabs) {
        await page.click(`[data-testid="${tabId}"]`);
        await page.waitForTimeout(200); // Quick switching
      }

      // Wait for all API calls to settle
      await page.waitForTimeout(3000);

      console.log(`Total API calls made: ${apiCallCount}`);

      // Final verification - no timeout errors despite race conditions
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      await expect(page.locator('[data-testid="cost-breakdown-tab-content"]')).toBeVisible({ timeout: 10000 });
    });
  });
});
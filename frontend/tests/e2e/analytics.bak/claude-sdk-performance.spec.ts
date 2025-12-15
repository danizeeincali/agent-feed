import { test, expect, Page } from '@playwright/test';

test.describe('Claude SDK Analytics - Performance Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Monitor performance metrics
    await page.addInitScript(() => {
      window.performanceData = {
        navigationStart: performance.now(),
        loadTimes: [],
        apiCalls: []
      };
    });

    await page.goto('/analytics');
  });

  test('Claude SDK tab loads within 5 seconds consistently', async () => {
    // Test multiple loads to ensure consistency
    for (let i = 0; i < 3; i++) {
      await test.step(`Load attempt ${i + 1}`, async () => {
        const loadStart = Date.now();

        // Navigate to Claude SDK tab
        await page.click('[data-testid="claude-sdk-tab"]');

        // Wait for main content to be visible
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

        // Wait for loading states to complete
        await page.waitForFunction(() => {
          const loadingElements = document.querySelectorAll('[data-testid*="loading"]');
          return loadingElements.length === 0 ||
                 Array.from(loadingElements).every(el => el.style.display === 'none');
        }, { timeout: 10000 });

        const loadTime = Date.now() - loadStart;
        console.log(`Claude SDK load attempt ${i + 1}: ${loadTime}ms`);

        // Strict performance requirement
        expect(loadTime).toBeLessThan(5000);

        // Verify no timeout errors
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

        // Navigate away and back for next iteration
        if (i < 2) {
          await page.click('[data-testid="system-analytics-tab"]');
          await page.waitForTimeout(500);
        }
      });
    }
  });

  test('All sub-tabs load within expected timeframes', async () => {
    // Navigate to Claude SDK first
    await page.click('[data-testid="claude-sdk-tab"]');
    await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible();

    const subTabs = [
      { testId: 'cost-overview-tab', maxTime: 3000, name: 'Cost Overview' },
      { testId: 'usage-metrics-tab', maxTime: 4000, name: 'Usage Metrics' },
      { testId: 'model-performance-tab', maxTime: 4000, name: 'Model Performance' },
      { testId: 'cost-breakdown-tab', maxTime: 3500, name: 'Cost Breakdown' }
    ];

    for (const subTab of subTabs) {
      await test.step(`Performance test: ${subTab.name}`, async () => {
        const subTabStart = Date.now();

        await page.click(`[data-testid="${subTab.testId}"]`);

        // Wait for content and data to load
        await expect(page.locator(`[data-testid="${subTab.testId}-content"]`)).toBeVisible({ timeout: 10000 });

        // Wait for any charts or heavy components to render
        await page.waitForFunction(() => {
          const charts = document.querySelectorAll('[data-testid*="chart"], [data-testid*="graph"]');
          const tables = document.querySelectorAll('[data-testid*="table"]');
          return charts.length > 0 || tables.length > 0;
        }, { timeout: 8000 }).catch(() => {
          // Some tabs might not have charts/tables, continue
        });

        const subTabLoadTime = Date.now() - subTabStart;
        console.log(`${subTab.name} loaded in ${subTabLoadTime}ms (max: ${subTab.maxTime}ms)`);

        expect(subTabLoadTime).toBeLessThan(subTab.maxTime);

        // No error states
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        await expect(page.locator('text=Failed to load')).not.toBeVisible();
      });
    }
  });

  test('Performance under concurrent data loading', async () => {
    await test.step('Test concurrent sub-tab data loading', async () => {
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible();

      // Rapidly switch between sub-tabs to test concurrent loading
      const rapidSwitchStart = Date.now();

      const tabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

      for (const tabId of tabs) {
        await page.click(`[data-testid="${tabId}"]`);
        // Don't wait for full load, just click and move on
        await page.waitForTimeout(200);
      }

      // Now wait for final tab to fully load
      await expect(page.locator('[data-testid="cost-breakdown-tab-content"]')).toBeVisible({ timeout: 10000 });

      const rapidSwitchTime = Date.now() - rapidSwitchStart;
      console.log(`Rapid switching completed in ${rapidSwitchTime}ms`);

      // Should handle rapid switching without errors
      expect(rapidSwitchTime).toBeLessThan(8000);
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('Memory usage stays stable during extended usage', async () => {
    await test.step('Extended usage memory test', async () => {
      await page.click('[data-testid="claude-sdk-tab"]');

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Simulate extended usage - 10 cycles of tab switching
      for (let cycle = 0; cycle < 10; cycle++) {
        const tabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

        for (const tabId of tabs) {
          await page.click(`[data-testid="${tabId}"]`);
          await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 8000 });
          await page.waitForTimeout(500);
        }

        // No timeout errors during extended usage
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      }

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;

        console.log(`Memory usage: ${initialMemory} -> ${finalMemory} (${memoryIncreasePercent.toFixed(2)}% increase)`);

        // Memory increase should be reasonable (less than 50% increase)
        expect(memoryIncreasePercent).toBeLessThan(50);
      }
    });
  });

  test('API response time monitoring', async () => {
    await test.step('Monitor API response times', async () => {
      const apiTimes: { url: string; duration: number }[] = [];

      // Monitor API calls
      page.on('response', async (response) => {
        if (response.url().includes('/api/analytics/')) {
          const request = response.request();
          const timing = response.timing();

          apiTimes.push({
            url: response.url(),
            duration: timing.responseEnd
          });
        }
      });

      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible();

      // Test all sub-tabs to trigger API calls
      const tabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

      for (const tabId of tabs) {
        await page.click(`[data-testid="${tabId}"]`);
        await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000); // Allow API calls to complete
      }

      // Analyze API performance
      apiTimes.forEach(api => {
        console.log(`API ${api.url}: ${api.duration}ms`);
        expect(api.duration).toBeLessThan(5000); // Each API call under 5 seconds
      });

      if (apiTimes.length > 0) {
        const avgApiTime = apiTimes.reduce((sum, api) => sum + api.duration, 0) / apiTimes.length;
        console.log(`Average API response time: ${avgApiTime}ms`);
        expect(avgApiTime).toBeLessThan(3000);
      }
    });
  });
});
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { performanceReporter } from '../utils/performance-reporter';

test.describe('Analytics Flow - Complete End-to-End Tests', () => {
  let page: Page;
  let context: BrowserContext;
  const performanceMetrics: any[] = [];

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Enable performance monitoring
    await page.route('**/*', (route) => {
      const startTime = Date.now();
      route.continue().then(() => {
        const endTime = Date.now();
        performanceMetrics.push({
          url: route.request().url(),
          method: route.request().method(),
          duration: endTime - startTime,
          timestamp: startTime
        });
      });
    });

    await page.goto('/analytics');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Should navigate through complete analytics flow without timeout errors', async () => {
    const startTime = Date.now();

    // Step 1: Verify System Analytics loads first
    await test.step('System Analytics loads successfully', async () => {
      await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      const systemLoadTime = Date.now() - startTime;
      expect(systemLoadTime).toBeLessThan(5000);
      console.log(`System Analytics loaded in ${systemLoadTime}ms`);
    });

    // Step 2: Navigate to Claude SDK Cost Analytics
    await test.step('Navigate to Claude SDK Cost Analytics tab', async () => {
      const tabClickTime = Date.now();

      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });

      const tabLoadTime = Date.now() - tabClickTime;
      expect(tabLoadTime).toBeLessThan(5000);
      console.log(`Claude SDK tab loaded in ${tabLoadTime}ms`);

      // Verify no timeout errors
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      await expect(page.locator('text=Failed to load')).not.toBeVisible();
    });

    // Step 3: Test all four sub-tabs
    const subTabs = [
      { testId: 'cost-overview-tab', name: 'Cost Overview' },
      { testId: 'usage-metrics-tab', name: 'Usage Metrics' },
      { testId: 'model-performance-tab', name: 'Model Performance' },
      { testId: 'cost-breakdown-tab', name: 'Cost Breakdown' }
    ];

    for (const subTab of subTabs) {
      await test.step(`Test ${subTab.name} sub-tab loading`, async () => {
        const subTabStartTime = Date.now();

        await page.click(`[data-testid="${subTab.testId}"]`);
        await expect(page.locator(`[data-testid="${subTab.testId}-content"]`)).toBeVisible({ timeout: 8000 });

        const subTabLoadTime = Date.now() - subTabStartTime;
        expect(subTabLoadTime).toBeLessThan(5000);
        console.log(`${subTab.name} loaded in ${subTabLoadTime}ms`);

        // Verify no error states
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        await expect(page.locator('text=Error loading data')).not.toBeVisible();

        // Wait a moment for data to stabilize
        await page.waitForTimeout(500);
      });
    }

    const totalFlowTime = Date.now() - startTime;
    console.log(`Complete analytics flow completed in ${totalFlowTime}ms`);
    expect(totalFlowTime).toBeLessThan(25000); // Total flow under 25 seconds
  });

  test('Should handle network failures gracefully', async () => {
    await test.step('Test offline error handling', async () => {
      // Simulate network failure
      await page.route('/api/analytics/**', (route) => {
        route.abort('failed');
      });

      await page.reload();

      // Should show appropriate error message, not timeout
      await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Error message should be user-friendly
      await expect(page.locator('text=Unable to load analytics data')).toBeVisible();
    });
  });

  test('Should handle slow API responses without timeout errors', async () => {
    await test.step('Test slow API response handling', async () => {
      // Simulate slow API responses
      await page.route('/api/analytics/claude-sdk/**', (route) => {
        setTimeout(() => route.continue(), 3000); // 3 second delay
      });

      const slowLoadStart = Date.now();
      await page.click('[data-testid="claude-sdk-tab"]');

      // Should show loading state but not timeout
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Should eventually load successfully
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

      const slowLoadTime = Date.now() - slowLoadStart;
      console.log(`Slow API response handled in ${slowLoadTime}ms`);
      expect(slowLoadTime).toBeLessThan(10000);
    });
  });

  test('Should maintain performance under rapid tab switching', async () => {
    await test.step('Test rapid tab switching performance', async () => {
      const switchingMetrics: number[] = [];

      // Rapid switching between tabs
      for (let i = 0; i < 5; i++) {
        const switchStart = Date.now();

        await page.click('[data-testid="claude-sdk-tab"]');
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 8000 });

        await page.click('[data-testid="system-analytics-tab"]');
        await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 8000 });

        const switchTime = Date.now() - switchStart;
        switchingMetrics.push(switchTime);

        // No timeout errors during rapid switching
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      }

      const averageSwitchTime = switchingMetrics.reduce((a, b) => a + b, 0) / switchingMetrics.length;
      console.log(`Average tab switch time: ${averageSwitchTime}ms`);
      expect(averageSwitchTime).toBeLessThan(3000);
    });
  });
});
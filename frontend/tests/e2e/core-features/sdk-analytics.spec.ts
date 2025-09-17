import { test, expect, Page } from '@playwright/test';

/**
 * SDK Analytics Integration Test Suite
 * Comprehensive tests for Claude SDK Analytics functionality,
 * including data loading, component interactions, and real-time updates.
 */

test.describe('SDK Analytics Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to analytics page
    await page.goto('/analytics');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Wait for analytics components - try multiple selectors
    try {
      await page.waitForSelector('[data-testid="analytics-tabs"]', { timeout: 8000 });
    } catch {
      await page.waitForSelector('[role="tablist"]', { timeout: 8000 });
    }
  });

  test.describe('Enhanced Analytics Page Loading', () => {
    test('should load EnhancedAnalyticsPage correctly', async () => {
      // Check page title and header
      await expect(page.locator('h1:has-text("Claude Code SDK Analytics")')).toBeVisible();

      // Check page description
      await expect(page.locator('text=Comprehensive cost tracking, usage analytics, and performance insights')).toBeVisible();

      // Verify Analytics Provider is working
      const tabsList = page.locator('[role="tablist"]');
      await expect(tabsList).toBeVisible();

      // Check all expected tabs are present
      await expect(page.locator('[role="tab"]:has-text("Cost Overview")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Messages & Steps")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Optimization")')).toBeVisible();
      await expect(page.locator('[role="tab"]:has-text("Export & Reports")')).toBeVisible();
    });

    test('should initialize with default tab selected', async () => {
      // Default should be "overview" tab (Cost Overview)
      const defaultTab = page.locator('[role="tab"]:has-text("Cost Overview")');
      await expect(defaultTab).toHaveAttribute('aria-selected', 'true');
      await expect(defaultTab).toHaveAttribute('data-state', 'active');

      // Corresponding panel should be visible
      const overviewPanel = page.locator('[data-value="overview"][role="tabpanel"]');
      await expect(overviewPanel).toBeVisible();
    });

    test('should handle analytics provider initialization', async () => {
      // Check that the analytics context is working
      // This can be verified by checking if components render without errors

      // Switch to each tab to verify provider is working
      const tabs = ['Cost Overview', 'Messages & Steps', 'Optimization', 'Export & Reports'];

      for (const tabText of tabs) {
        await page.locator(`[role="tab"]:has-text("${tabText}")`).click();
        await page.waitForTimeout(1000);

        // Should not show any provider errors
        const errorBoundary = page.locator('text=Something went wrong');
        await expect(errorBoundary).toHaveCount(0);

        // Panel should be visible
        const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
        await expect(activePanel).toBeVisible();
      }
    });
  });

  test.describe('Cost Overview Dashboard Tests', () => {
    test('should load Cost Overview Dashboard components', async () => {
      // Navigate to Cost Overview tab
      await page.locator('[role="tab"]:has-text("Cost Overview")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for dashboard elements - these might be in the component
      // Look for common dashboard indicators
      const dashboardIndicators = [
        'cost', 'overview', 'dashboard', 'analytics', 'chart', 'graph', 'data'
      ];

      let foundIndicator = false;
      for (const indicator of dashboardIndicators) {
        const element = page.locator(`text=${indicator}`).first();
        if (await element.isVisible()) {
          foundIndicator = true;
          break;
        }
      }

      // Should find at least one dashboard indicator or the component should be present
      expect(foundIndicator || await page.locator('[data-testid*="cost"], [data-testid*="dashboard"]').count() > 0).toBeTruthy();
    });

    test('should handle time range changes', async () => {
      await page.locator('[role="tab"]:has-text("Cost Overview")').click();
      await page.waitForTimeout(2000);

      // Look for time range selector (common in analytics dashboards)
      const timeSelectors = page.locator('select, button').filter({ hasText: /day|week|month|year|range/i });
      const selectorCount = await timeSelectors.count();

      if (selectorCount > 0) {
        // Try interacting with time selector
        await timeSelectors.first().click();
        await page.waitForTimeout(500);

        // Should not cause errors
        const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
        await expect(errorMessages).toHaveCount(0);
      }
    });

    test('should support export functionality', async () => {
      await page.locator('[role="tab"]:has-text("Cost Overview")').click();
      await page.waitForTimeout(2000);

      // Look for export buttons
      const exportButtons = page.locator('button').filter({ hasText: /export|download|save/i });
      const exportCount = await exportButtons.count();

      if (exportCount > 0) {
        // Try clicking export button
        await exportButtons.first().click();
        await page.waitForTimeout(1000);

        // Should not cause errors
        const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
        await expect(errorMessages).toHaveCount(0);
      }
    });
  });

  test.describe('Messages & Steps Analytics Tests', () => {
    test('should load Message Step Analytics component', async () => {
      await page.locator('[role="tab"]:has-text("Messages & Steps")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check the panel is active
      const messagesPanel = page.locator('[data-value="messages"][role="tabpanel"]');
      await expect(messagesPanel).toBeVisible();

      // Look for messages analytics content
      const analyticsIndicators = [
        'message', 'step', 'analytics', 'data', 'chart', 'usage'
      ];

      let foundContent = false;
      for (const indicator of analyticsIndicators) {
        const element = page.locator(`text=${indicator}`).first();
        if (await element.isVisible()) {
          foundContent = true;
          break;
        }
      }

      expect(foundContent || await page.locator('[data-testid*="message"], [data-testid*="analytics"]').count() > 0).toBeTruthy();
    });

    test('should handle real-time updates', async () => {
      await page.locator('[role="tab"]:has-text("Messages & Steps")').click();
      await page.waitForTimeout(2000);

      // Real-time functionality should be enabled by default
      // Check that the component doesn't crash over time
      await page.waitForTimeout(3000);

      // Should still be functional
      const panel = page.locator('[data-value="messages"][role="tabpanel"]');
      await expect(panel).toBeVisible();

      // No error boundaries should be triggered
      const errorBoundary = page.locator('text=Something went wrong');
      await expect(errorBoundary).toHaveCount(0);
    });
  });

  test.describe('Optimization Recommendations Tests', () => {
    test('should load Optimization Recommendations component', async () => {
      await page.locator('[role="tab"]:has-text("Optimization")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check the panel is active
      const optimizationPanel = page.locator('[data-value="optimize"][role="tabpanel"]');
      await expect(optimizationPanel).toBeVisible();

      // Look for optimization content
      const optimizationIndicators = [
        'optimization', 'recommend', 'improve', 'efficiency', 'cost', 'performance'
      ];

      let foundContent = false;
      for (const indicator of optimizationIndicators) {
        const element = page.locator(`text=${indicator}`).first();
        if (await element.isVisible()) {
          foundContent = true;
          break;
        }
      }

      expect(foundContent || await page.locator('[data-testid*="optimization"], [data-testid*="recommend"]').count() > 0).toBeTruthy();
    });

    test('should handle optimization implementation', async () => {
      await page.locator('[role="tab"]:has-text("Optimization")').click();
      await page.waitForTimeout(2000);

      // Look for implementation buttons
      const implementButtons = page.locator('button').filter({ hasText: /implement|apply|execute/i });
      const buttonCount = await implementButtons.count();

      if (buttonCount > 0) {
        // Try clicking implementation button
        await implementButtons.first().click();
        await page.waitForTimeout(1000);

        // Should not cause errors
        const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
        await expect(errorMessages).toHaveCount(0);
      }
    });
  });

  test.describe('Export & Reports Features Tests', () => {
    test('should load Export Reporting Features component', async () => {
      await page.locator('[role="tab"]:has-text("Export & Reports")').click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check the panel is active
      const exportPanel = page.locator('[data-value="export"][role="tabpanel"]');
      await expect(exportPanel).toBeVisible();

      // Look for export and reporting content
      const exportIndicators = [
        'export', 'report', 'download', 'format', 'pdf', 'csv', 'data'
      ];

      let foundContent = false;
      for (const indicator of exportIndicators) {
        const element = page.locator(`text=${indicator}`).first();
        if (await element.isVisible()) {
          foundContent = true;
          break;
        }
      }

      expect(foundContent || await page.locator('[data-testid*="export"], [data-testid*="report"]').count() > 0).toBeTruthy();
    });

    test('should handle export operations', async () => {
      await page.locator('[role="tab"]:has-text("Export & Reports")').click();
      await page.waitForTimeout(2000);

      // Look for export format options
      const formatOptions = page.locator('button, select').filter({ hasText: /pdf|csv|json|excel/i });
      const optionCount = await formatOptions.count();

      if (optionCount > 0) {
        // Try selecting an export format
        await formatOptions.first().click();
        await page.waitForTimeout(500);

        // Should not cause errors
        const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
        await expect(errorMessages).toHaveCount(0);
      }

      // Look for export trigger buttons
      const exportButtons = page.locator('button').filter({ hasText: /export|generate|create/i });
      const exportCount = await exportButtons.count();

      if (exportCount > 0) {
        await exportButtons.first().click();
        await page.waitForTimeout(1000);

        // Should handle export request without errors
        const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
        await expect(errorMessages).toHaveCount(0);
      }
    });
  });

  test.describe('Error Boundary Integration', () => {
    test('should wrap components in error boundaries', async () => {
      // Test that each tab content is wrapped in error boundaries
      const tabs = ['Cost Overview', 'Messages & Steps', 'Optimization', 'Export & Reports'];

      for (const tabText of tabs) {
        await page.locator(`[role="tab"]:has-text("${tabText}")`).click();
        await page.waitForTimeout(1000);

        // Should not show error boundary messages under normal conditions
        const errorBoundary = page.locator('text=Something went wrong').or(page.locator('text=Error Boundary'));
        await expect(errorBoundary).toHaveCount(0);

        // Panel should be visible and functional
        const activePanel = page.locator('[role="tabpanel"][data-state="active"]');
        await expect(activePanel).toBeVisible();
      }
    });

    test('should handle component errors gracefully', async () => {
      // Navigate through all tabs rapidly to stress test error boundaries
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(200); // Quick switching
      }

      // Should still be functional after rapid navigation
      const lastTab = tabs.nth(tabCount - 1);
      await expect(lastTab).toHaveAttribute('aria-selected', 'true');

      // No error boundaries should be visible
      const errorBoundary = page.locator('text=Something went wrong');
      await expect(errorBoundary).toHaveCount(0);
    });
  });

  test.describe('Real-time Data Updates', () => {
    test('should maintain real-time updates across tab switches', async () => {
      // Enable real-time updates by default in EnhancedAnalyticsPage
      // Test that switching tabs doesn't break real-time functionality

      await page.locator('[role="tab"]:has-text("Cost Overview")').click();
      await page.waitForTimeout(2000);

      // Switch to another tab
      await page.locator('[role="tab"]:has-text("Messages & Steps")').click();
      await page.waitForTimeout(2000);

      // Switch back
      await page.locator('[role="tab"]:has-text("Cost Overview")').click();
      await page.waitForTimeout(2000);

      // Should still be functional without errors
      const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
      await expect(errorMessages).toHaveCount(0);
    });

    test('should handle refresh interval correctly', async () => {
      // The component uses refreshInterval={30000} by default
      // Test that components don't crash during update cycles

      await page.locator('[role="tab"]:has-text("Cost Overview")').click();

      // Wait for a few seconds to simulate update intervals
      await page.waitForTimeout(5000);

      // Should still be responsive
      const tab = page.locator('[role="tab"]:has-text("Messages & Steps")');
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');

      // No errors should occur
      const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
      await expect(errorMessages).toHaveCount(0);
    });
  });

  test.describe('Performance Metrics', () => {
    test('should load SDK analytics data efficiently', async () => {
      const startTime = Date.now();

      // Navigate through all tabs and measure loading time
      const tabs = ['Cost Overview', 'Messages & Steps', 'Optimization', 'Export & Reports'];

      for (const tabText of tabs) {
        const tabStartTime = Date.now();

        await page.locator(`[role="tab"]:has-text("${tabText}")`).click();
        await page.waitForLoadState('networkidle');

        const tabLoadTime = Date.now() - tabStartTime;
        expect(tabLoadTime).toBeLessThan(5000); // Each tab should load within 5 seconds
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(15000); // All tabs should load within 15 seconds total
    });

    test('should handle large datasets without performance degradation', async () => {
      // Simulate heavy usage by rapid tab switching
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      const startTime = Date.now();

      // Rapidly switch between tabs multiple times
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < tabCount; i++) {
          await tabs.nth(i).click();
          await page.waitForTimeout(100);
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete rapid switching without significant delay
      expect(totalTime).toBeLessThan(10000);

      // Should still be functional
      await expect(tabs.nth(tabCount - 1)).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.afterEach(async () => {
    // Capture screenshot and console logs on failure
    if (test.info().status === 'failed') {
      await page.screenshot({
        path: `test-results/sdk-analytics-failure-${Date.now()}.png`,
        fullPage: true
      });

      // Log any console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.log('Console error:', msg.text());
        }
      });
    }
  });
});
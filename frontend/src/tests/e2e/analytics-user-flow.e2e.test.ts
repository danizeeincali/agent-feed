/**
 * End-to-End Tests for Analytics User Flow
 * Tests the complete user journey in a real browser environment
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Analytics User Flow E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to the application
    await page.goto('/');

    // Wait for the application to load
    await page.waitForSelector('[data-testid="app"]', { timeout: 10000 });
  });

  test.describe('Initial Analytics Page Load', () => {
    test('should load analytics page without timeout issues', async () => {
      // Start timing the navigation
      const startTime = Date.now();

      // Navigate to analytics (assuming it's accessible via route or menu)
      await page.click('[data-testid="analytics-link"]', { timeout: 5000 });

      // Wait for analytics page to load
      await page.waitForSelector('[data-testid="real-analytics"]', { timeout: 5000 });

      const loadTime = Date.now() - startTime;

      // Should load much faster than the previous 30-second timeout
      expect(loadTime).toBeLessThan(5000);

      // Verify the page loaded correctly
      await expect(page.getByTestId('real-analytics')).toBeVisible();
    });

    test('should display system analytics by default', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.waitForSelector('[data-testid="real-analytics"]');

      // Should show system analytics by default
      await expect(page.getByTestId('system-tab')).toHaveClass(/active/);
      await expect(page.getByTestId('system-analytics-content')).toBeVisible();
    });
  });

  test.describe('Claude SDK Tab Navigation', () => {
    test('should switch to Claude SDK tab immediately', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.waitForSelector('[data-testid="real-analytics"]');

      const startTime = Date.now();

      // Click Claude SDK tab
      await page.click('[data-testid="claude-sdk-tab"]');

      // Wait for the analytics page to load without timeout
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]', { timeout: 2000 });

      const switchTime = Date.now() - startTime;

      // Should switch very quickly
      expect(switchTime).toBeLessThan(1000);

      // Verify the content loaded
      await expect(page.getByTestId('enhanced-analytics-page')).toBeVisible();
      await expect(page.getByTestId('claude-sdk-tab')).toHaveClass(/active/);
    });

    test('should show all sub-tabs immediately', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');

      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // All sub-tabs should be visible
      const subTabs = [
        'cost-overview-tab',
        'messages-steps-tab',
        'optimization-tab',
        'export-tab'
      ];

      for (const tabId of subTabs) {
        await expect(page.getByTestId(tabId)).toBeVisible();
      }
    });

    test('should not show loading indicators for extended periods', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');

      // Wait for content to load
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Check that no loading indicators are persistently visible
      const loadingElements = await page.$$('[data-testid*="loading"]');

      for (const element of loadingElements) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          // If loading element is visible, it should disappear quickly
          await expect(element).toBeHidden({ timeout: 1000 });
        }
      }
    });
  });

  test.describe('Sub-tab Navigation Performance', () => {
    test('should navigate through all sub-tabs efficiently', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      const subTabs = [
        { tab: 'cost-overview-tab', content: 'cost-overview-content' },
        { tab: 'messages-steps-tab', content: 'messages-steps-content' },
        { tab: 'optimization-tab', content: 'optimization-content' },
        { tab: 'export-tab', content: 'export-content' }
      ];

      for (const { tab, content } of subTabs) {
        const startTime = Date.now();

        await page.click(`[data-testid="${tab}"]`);

        // Wait for content to appear
        await page.waitForSelector(`[data-testid="${content}"]`, { timeout: 1000 });

        const switchTime = Date.now() - startTime;
        expect(switchTime).toBeLessThan(500);

        // Verify content is visible
        await expect(page.getByTestId(content)).toBeVisible();
      }
    });

    test('should display correct content for Cost Overview tab', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      await page.click('[data-testid="cost-overview-tab"]');

      // Should show cost-related content
      await expect(page.getByTestId('cost-overview-content')).toBeVisible();

      // Check for cost-specific elements
      const costElements = [
        'total-cost',
        'cost-chart',
        'cost-breakdown'
      ];

      for (const element of costElements) {
        await expect(page.getByTestId(element)).toBeVisible();
      }
    });

    test('should display correct content for Messages & Steps tab', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      await page.click('[data-testid="messages-steps-tab"]');

      await expect(page.getByTestId('messages-steps-content')).toBeVisible();

      // Check for message-specific elements
      const messageElements = [
        'message-history',
        'step-breakdown',
        'token-usage'
      ];

      for (const element of messageElements) {
        await expect(page.getByTestId(element)).toBeVisible();
      }
    });

    test('should display correct content for Optimization tab', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      await page.click('[data-testid="optimization-tab"]');

      await expect(page.getByTestId('optimization-content')).toBeVisible();

      // Check for optimization-specific elements
      const optimizationElements = [
        'optimization-suggestions',
        'efficiency-metrics',
        'cost-savings'
      ];

      for (const element of optimizationElements) {
        await expect(page.getByTestId(element)).toBeVisible();
      }
    });

    test('should display correct content for Export tab', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      await page.click('[data-testid="export-tab"]');

      await expect(page.getByTestId('export-content')).toBeVisible();

      // Check for export-specific elements
      const exportElements = [
        'export-options',
        'export-csv',
        'export-json',
        'export-pdf'
      ];

      for (const element of exportElements) {
        await expect(page.getByTestId(element)).toBeVisible();
      }
    });
  });

  test.describe('Performance Verification', () => {
    test('should complete full navigation flow within performance thresholds', async () => {
      const startTime = Date.now();

      // Complete user flow
      await page.click('[data-testid="analytics-link"]');
      await page.waitForSelector('[data-testid="real-analytics"]');

      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Navigate through all sub-tabs
      const subTabs = ['messages-steps-tab', 'optimization-tab', 'export-tab', 'cost-overview-tab'];

      for (const tab of subTabs) {
        await page.click(`[data-testid="${tab}"]`);
        await page.waitForTimeout(100); // Brief pause for stability
      }

      const totalTime = Date.now() - startTime;

      // Complete flow should be fast
      expect(totalTime).toBeLessThan(5000);
    });

    test('should handle rapid tab switching without performance degradation', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      const startTime = Date.now();

      // Perform rapid tab switches
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="cost-overview-tab"]');
        await page.click('[data-testid="messages-steps-tab"]');
        await page.click('[data-testid="optimization-tab"]');
        await page.click('[data-testid="export-tab"]');
      }

      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(3000);
    });

    test('should maintain responsiveness during navigation', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Test that UI remains responsive
      await page.click('[data-testid="cost-overview-tab"]');

      // Check that other elements are still interactive
      const messagesTab = page.getByTestId('messages-steps-tab');
      await expect(messagesTab).toBeEnabled();

      await messagesTab.click();
      await expect(page.getByTestId('messages-steps-content')).toBeVisible();
    });
  });

  test.describe('Error Handling Verification', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      await page.click('[data-testid="analytics-link"]');

      // Should still load with fallback data
      await page.waitForSelector('[data-testid="real-analytics"]', { timeout: 5000 });

      // Navigation should still work
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.getByTestId('enhanced-analytics-page')).toBeVisible();
    });

    test('should recover from temporary loading failures', async () => {
      let requestCount = 0;

      // Fail first 2 requests, then succeed
      await page.route('**/api/analytics', route => {
        requestCount++;
        if (requestCount <= 2) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.click('[data-testid="analytics-link"]');

      // Should eventually succeed
      await page.waitForSelector('[data-testid="real-analytics"]', { timeout: 10000 });
    });
  });

  test.describe('Accessibility Verification', () => {
    test('should maintain keyboard navigation throughout flow', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.waitForSelector('[data-testid="real-analytics"]');

      // Use keyboard to navigate to Claude SDK tab
      await page.press('[data-testid="claude-sdk-tab"]', 'Tab');
      await page.press('[data-testid="claude-sdk-tab"]', 'Enter');

      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Navigate sub-tabs with keyboard
      await page.press('[data-testid="cost-overview-tab"]', 'Tab');
      await page.press('[data-testid="cost-overview-tab"]', 'Enter');

      await expect(page.getByTestId('cost-overview-content')).toBeVisible();
    });

    test('should provide proper ARIA labels and roles', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Check for proper ARIA attributes
      const tabElements = await page.$$('[data-testid$="-tab"]');

      for (const tab of tabElements) {
        const hasRole = await tab.getAttribute('role');
        const hasTabIndex = await tab.getAttribute('tabindex');

        // Tabs should be properly accessible
        expect(hasRole || hasTabIndex).toBeTruthy();
      }
    });

    test('should support screen reader navigation', async () => {
      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Verify that content has proper heading structure
      const headings = await page.$$('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);

      // Check for proper labeling of interactive elements
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        // Buttons should have descriptive text or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="analytics-link"]');
      await page.waitForSelector('[data-testid="real-analytics"]');

      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Verify that tabs are accessible on mobile
      await expect(page.getByTestId('cost-overview-tab')).toBeVisible();

      // Test tab navigation on mobile
      await page.click('[data-testid="messages-steps-tab"]');
      await expect(page.getByTestId('messages-steps-content')).toBeVisible();
    });

    test('should handle touch interactions properly', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="analytics-link"]');
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForSelector('[data-testid="enhanced-analytics-page"]');

      // Use touch events instead of clicks
      await page.tap('[data-testid="optimization-tab"]');
      await expect(page.getByTestId('optimization-content')).toBeVisible();

      await page.tap('[data-testid="export-tab"]');
      await expect(page.getByTestId('export-content')).toBeVisible();
    });
  });
});
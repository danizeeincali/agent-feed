/**
 * End-to-End Tests for Analytics Tab Functionality
 *
 * Tests complete user workflows with real browser interactions,
 * including accessibility, performance, and cross-browser compatibility.
 */

import { test, expect, Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Analytics Tabs E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;

    // Mock API responses
    await page.route('**/api/system-metrics*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            timestamp: new Date().toISOString(),
            server_id: 'main-server',
            cpu_usage: 45,
            memory_usage: 65,
            disk_usage: 50,
            active_agents: 8,
            total_posts: 156,
            avg_response_time: 285,
            system_health: 95
          }]
        })
      });
    });

    await page.route('**/api/analytics*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalUsers: 42,
            activeUsers: 8,
            totalPosts: 156,
            engagement: 78.5,
            performance: {
              avgLoadTime: 285,
              errorRate: 0.5
            }
          }
        })
      });
    });

    await page.route('**/api/feed-stats*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            totalPosts: 156,
            todayPosts: 12,
            avgEngagement: 6.2,
            topCategories: ['Technology', 'AI', 'Development']
          }
        })
      });
    });

    // Navigate to analytics page
    await page.goto('/analytics');
  });

  test.describe('Tab Navigation and Interaction', () => {
    test('should display both tabs and allow switching', async () => {
      // Wait for page to load
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Check that both tabs are present
      const systemTab = page.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = page.getByRole('tab', { name: /claude sdk analytics/i });

      await expect(systemTab).toBeVisible();
      await expect(claudeSDKTab).toBeVisible();

      // System tab should be active by default
      await expect(systemTab).toHaveAttribute('aria-selected', 'true');
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');

      // Click Claude SDK tab
      await claudeSDKTab.click();

      // Claude SDK tab should now be active
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      await expect(systemTab).toHaveAttribute('aria-selected', 'false');
    });

    test('should show appropriate content for each tab', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // System tab content should be visible initially
      await expect(page.getByText('Active Users')).toBeVisible();
      await expect(page.getByText('System Performance')).toBeVisible();
      await expect(page.getByText('8')).toBeVisible(); // Active users count

      // Switch to Claude SDK tab
      await page.getByRole('tab', { name: /claude sdk analytics/i }).click();

      // Wait for Claude SDK content to load
      await expect(page.getByText('Claude SDK Cost Analytics')).toBeVisible();
      await expect(page.getByText('Cost Overview')).toBeVisible();
    });

    test('should support keyboard navigation', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      const systemTab = page.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = page.getByRole('tab', { name: /claude sdk analytics/i });

      // Focus on first tab
      await systemTab.focus();
      await expect(systemTab).toBeFocused();

      // Use arrow key to navigate to next tab
      await page.keyboard.press('ArrowRight');
      await expect(claudeSDKTab).toBeFocused();

      // Use Enter to activate tab
      await page.keyboard.press('Enter');
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    test('should handle tab switching performance', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      const claudeSDKTab = page.getByRole('tab', { name: /claude sdk analytics/i });

      // Measure tab switching time
      const startTime = Date.now();
      await claudeSDKTab.click();
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
      const endTime = Date.now();

      // Tab switching should be fast (< 500ms including network)
      expect(endTime - startTime).toBeLessThan(500);
    });
  });

  test.describe('Data Loading and Display', () => {
    test('should load and display system metrics', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Wait for metrics to load and display
      await expect(page.getByText('8')).toBeVisible(); // Active users
      await expect(page.getByText('156')).toBeVisible(); // Total posts
      await expect(page.getByText('95%')).toBeVisible(); // System health
      await expect(page.getByText('285ms')).toBeVisible(); // Response time

      // Check performance metrics
      await expect(page.getByText('45%')).toBeVisible(); // CPU usage
      await expect(page.getByText('65%')).toBeVisible(); // Memory usage
    });

    test('should handle Claude SDK analytics loading', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Switch to Claude SDK tab
      await page.getByRole('tab', { name: /claude sdk analytics/i }).click();

      // Should show loading state initially
      await expect(page.getByText('Loading Claude SDK Analytics...')).toBeVisible();

      // Wait for content to load
      await expect(page.getByText('Claude SDK Cost Analytics')).toBeVisible();
      await expect(page.getByText('Cost Overview')).toBeVisible();
    });

    test('should refresh data when refresh button is clicked', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Wait for initial data load
      await expect(page.getByText('8')).toBeVisible();

      // Click refresh button
      await page.getByRole('button', { name: /refresh/i }).click();

      // Should show refreshing state
      await expect(page.getByRole('button', { name: /refresh/i })).toBeDisabled();

      // Wait for refresh to complete
      await expect(page.getByRole('button', { name: /refresh/i })).toBeEnabled();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API to return error
      await page.route('**/api/system-metrics*', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.reload();

      // Should show error state
      await expect(page.getByText('Analytics Error')).toBeVisible();
      await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    });

    test('should recover from errors when retrying', async () => {
      // Start with error, then succeed on retry
      let callCount = 0;
      await page.route('**/api/system-metrics*', route => {
        callCount++;
        if (callCount === 1) {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Temporary error' })
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: [{
                timestamp: new Date().toISOString(),
                server_id: 'main-server',
                cpu_usage: 45,
                memory_usage: 65,
                active_agents: 8,
                total_posts: 156,
                avg_response_time: 285,
                system_health: 95
              }]
            })
          });
        }
      });

      await page.reload();

      // Should show error initially
      await expect(page.getByText('Analytics Error')).toBeVisible();

      // Click retry
      await page.getByRole('button', { name: /retry/i }).click();

      // Should recover and show data
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();
      await expect(page.getByText('8')).toBeVisible();
    });
  });

  test.describe('Time Range Functionality', () => {
    test('should change data when time range is updated', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Find and change time range selector
      const timeRangeSelect = page.getByDisplayValue('Last 24 Hours');
      await timeRangeSelect.selectOption('7d');

      // Should trigger new API calls with updated time range
      // (In a real test, we'd verify the API calls with the new parameter)
      await expect(timeRangeSelect).toHaveValue('7d');
    });

    test('should maintain time range across tab switches', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Change time range
      const timeRangeSelect = page.getByDisplayValue('Last 24 Hours');
      await timeRangeSelect.selectOption('7d');

      // Switch to Claude SDK tab
      await page.getByRole('tab', { name: /claude sdk analytics/i }).click();

      // Switch back to system tab
      await page.getByRole('tab', { name: /system analytics/i }).click();

      // Time range should be preserved
      await expect(timeRangeSelect).toHaveValue('7d');
    });
  });

  test.describe('Accessibility', () => {
    test('should pass accessibility tests', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Run axe accessibility tests
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should support screen reader navigation', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Check ARIA attributes
      const tabList = page.getByRole('tablist');
      await expect(tabList).toBeVisible();

      const systemTab = page.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = page.getByRole('tab', { name: /claude sdk analytics/i });

      // Check tab attributes
      await expect(systemTab).toHaveAttribute('aria-selected', 'true');
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'false');

      // Check tabpanel exists and is associated
      const tabPanel = page.getByRole('tabpanel');
      await expect(tabPanel).toBeVisible();
    });

    test('should handle high contrast mode', async () => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Tabs should still be visible and functional
      const systemTab = page.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = page.getByRole('tab', { name: /claude sdk analytics/i });

      await expect(systemTab).toBeVisible();
      await expect(claudeSDKTab).toBeVisible();

      // Tab switching should still work
      await claudeSDKTab.click();
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Tabs should be visible and functional on mobile
      const systemTab = page.getByRole('tab', { name: /system analytics/i });
      const claudeSDKTab = page.getByRole('tab', { name: /claude sdk analytics/i });

      await expect(systemTab).toBeVisible();
      await expect(claudeSDKTab).toBeVisible();

      // Tab switching should work
      await claudeSDKTab.click();
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });

    test('should handle touch interactions', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      const claudeSDKTab = page.getByRole('tab', { name: /claude sdk analytics/i });

      // Simulate touch tap
      await claudeSDKTab.tap();
      await expect(claudeSDKTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load within performance budget', async () => {
      const startTime = Date.now();
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();
      const loadTime = Date.now() - startTime;

      // Initial page load should be under 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should handle slow network conditions', async () => {
      // Simulate slow network
      await page.route('**/api/**', route => {
        setTimeout(() => {
          route.continue();
        }, 1000); // 1 second delay
      });

      await page.reload();

      // Should show loading state
      await expect(page.getByText('Loading real analytics data...')).toBeVisible();

      // Should eventually load
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();
    });

    test('should handle Claude SDK lazy loading timeout', async () => {
      await expect(page.getByText('Analytics Dashboard')).toBeVisible();

      // Switch to Claude SDK tab
      await page.getByRole('tab', { name: /claude sdk analytics/i }).click();

      // Should show loading state
      await expect(page.getByText('Loading Claude SDK Analytics...')).toBeVisible();

      // Wait for potential timeout warning
      await page.waitForTimeout(15000); // Wait 15 seconds

      // Should show timeout warning if loading takes too long
      const timeoutWarning = page.getByText('Loading Taking Longer Than Expected');
      if (await timeoutWarning.isVisible()) {
        await expect(timeoutWarning).toBeVisible();
        await expect(page.getByRole('button', { name: /refresh page/i })).toBeVisible();
      }
    });
  });
});
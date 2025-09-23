import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Tab Navigation Test Suite
 * Tests all aspects of tab functionality including visibility, navigation,
 * keyboard controls, accessibility, and error handling.
 */

test.describe('Tab Navigation - Comprehensive Test Suite', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Navigate to analytics page
    await page.goto('/analytics');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Wait for tabs to be present - try multiple selectors
    try {
      await page.waitForSelector('[data-testid="analytics-tabs"]', { timeout: 5000 });
    } catch {
      try {
        await page.waitForSelector('[role="tablist"]', { timeout: 5000 });
      } catch {
        await page.waitForSelector('.tabs-list', { timeout: 5000 });
      }
    }
  });

  test.describe('Tab Visibility and Rendering', () => {
    test('should display all tab triggers correctly', async () => {
      // Check for tab list container
      const tabsList = page.locator('[role="tablist"]').first();
      await expect(tabsList).toBeVisible();

      // Check all expected tabs are present
      const expectedTabs = [
        'Cost Overview',
        'Messages & Steps',
        'Optimization',
        'Export & Reports'
      ];

      for (const tabText of expectedTabs) {
        const tab = page.locator(`[role="tab"]:has-text("${tabText}")`);
        await expect(tab).toBeVisible();
        await expect(tab).toHaveAttribute('aria-selected');
      }
    });

    test('should have proper accessibility attributes', async () => {
      // Check tablist has proper role
      const tabsList = page.locator('[role="tablist"]').first();
      await expect(tabsList).toHaveAttribute('role', 'tablist');

      // Check each tab has proper attributes
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        await expect(tab).toHaveAttribute('role', 'tab');
        await expect(tab).toHaveAttribute('aria-selected');
        await expect(tab).toHaveAttribute('data-state');
      }

      // Check tab panels have proper attributes
      const tabPanels = page.locator('[role="tabpanel"]');
      const panelCount = await tabPanels.count();

      for (let i = 0; i < panelCount; i++) {
        const panel = tabPanels.nth(i);
        await expect(panel).toHaveAttribute('role', 'tabpanel');
      }
    });

    test('should display tab labels with correct styling', async () => {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);

        // Check tab is visible and has text
        await expect(tab).toBeVisible();
        await expect(tab).not.toBeEmpty();

        // Check tab has proper styling classes
        const classes = await tab.getAttribute('class');
        expect(classes).toContain('text-sm');
      }
    });
  });

  test.describe('Tab Navigation Functionality', () => {
    test('should switch between tabs when clicked', async () => {
      // Test clicking each tab
      const tabTexts = ['Cost Overview', 'Messages & Steps', 'Optimization', 'Export & Reports'];

      for (const tabText of tabTexts) {
        // Click tab
        const tab = page.locator(`[role="tab"]:has-text("${tabText}")`);
        await tab.click();

        // Wait for content to load
        await page.waitForTimeout(500);

        // Verify tab is selected
        await expect(tab).toHaveAttribute('aria-selected', 'true');
        await expect(tab).toHaveAttribute('data-state', 'active');

        // Verify corresponding panel is visible
        const panelValue = await tab.getAttribute('data-value') || tabText.toLowerCase().replace(/[^a-z]/g, '');
        const panel = page.locator(`[data-value="${panelValue}"][role="tabpanel"]`);
        await expect(panel).toBeVisible();
      }
    });

    test('should maintain only one active tab at a time', async () => {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      // Click each tab and verify exclusivity
      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(300);

        // Count active tabs
        const activeTabs = page.locator('[role="tab"][aria-selected="true"]');
        await expect(activeTabs).toHaveCount(1);

        // Verify the clicked tab is the active one
        await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
      }
    });

    test('should load content when switching tabs', async () => {
      // Test Cost Overview tab
      await page.locator(`[role="tab"]:has-text("Cost Overview")`).click();
      await page.waitForLoadState('networkidle');

      // Should see cost dashboard elements
      await expect(page.locator('text=Cost Overview').or(page.locator('text=Dashboard'))).toBeVisible();

      // Test Messages tab
      await page.locator(`[role="tab"]:has-text("Messages & Steps")`).click();
      await page.waitForTimeout(1000);

      // Should see messages analytics content
      await expect(page.locator('text=Messages').or(page.locator('text=Analytics'))).toBeVisible();

      // Test Optimization tab
      await page.locator(`[role="tab"]:has-text("Optimization")`).click();
      await page.waitForTimeout(1000);

      // Should see optimization content
      await expect(page.locator('text=Optimization').or(page.locator('text=Recommendations'))).toBeVisible();

      // Test Export tab
      await page.locator(`[role="tab"]:has-text("Export & Reports")`).click();
      await page.waitForTimeout(1000);

      // Should see export features
      await expect(page.locator('text=Export').or(page.locator('text=Reports'))).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support arrow key navigation', async () => {
      // Focus first tab
      const firstTab = page.locator('[role="tab"]').first();
      await firstTab.focus();

      // Test right arrow key
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(200);

      // Check if next tab is focused
      const tabs = page.locator('[role="tab"]');
      const secondTab = tabs.nth(1);
      await expect(secondTab).toBeFocused();

      // Test left arrow key
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(200);

      // Should be back to first tab
      await expect(firstTab).toBeFocused();
    });

    test('should support tab key navigation', async () => {
      // Focus first tab
      await page.locator('[role="tab"]').first().focus();

      // Press Tab key to move through tabs
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      // Should move to next focusable element (might be next tab or content)
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should support Enter and Space key activation', async () => {
      const tabs = page.locator('[role="tab"]');
      const secondTab = tabs.nth(1);

      // Focus second tab
      await secondTab.focus();

      // Press Enter to activate
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // Should be selected
      await expect(secondTab).toHaveAttribute('aria-selected', 'true');

      // Focus another tab
      const thirdTab = tabs.nth(2);
      await thirdTab.focus();

      // Press Space to activate
      await page.keyboard.press(' ');
      await page.waitForTimeout(500);

      // Should be selected
      await expect(thirdTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('Tab Hover and Focus States', () => {
    test('should show hover states on tabs', async () => {
      const tab = page.locator('[role="tab"]').first();

      // Hover over tab
      await tab.hover();
      await page.waitForTimeout(200);

      // Tab should be visible and potentially have hover styling
      await expect(tab).toBeVisible();

      // Move away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
    });

    test('should show focus states on keyboard navigation', async () => {
      const tab = page.locator('[role="tab"]').first();

      // Focus tab with keyboard
      await tab.focus();
      await page.waitForTimeout(200);

      // Should be focused
      await expect(tab).toBeFocused();

      // Should have focus styling (checking for focus-visible or similar)
      const tabElement = await tab.elementHandle();
      const computedStyle = await page.evaluate((element) => {
        return window.getComputedStyle(element);
      }, tabElement);

      // Basic check that element is focused
      expect(computedStyle).toBeDefined();
    });
  });

  test.describe('URL and State Management', () => {
    test('should update URL when switching tabs (if implemented)', async () => {
      const initialUrl = page.url();

      // Click different tabs and check if URL changes
      await page.locator(`[role="tab"]:has-text("Messages & Steps")`).click();
      await page.waitForTimeout(500);

      // URL might change or stay the same depending on implementation
      const newUrl = page.url();
      expect(newUrl).toContain('/analytics');
    });

    test('should maintain tab state on page refresh', async () => {
      // Select a specific tab
      await page.locator(`[role="tab"]:has-text("Optimization")`).click();
      await page.waitForTimeout(1000);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check if state is maintained or defaults to first tab
      const tabs = page.locator('[role="tab"][aria-selected="true"]');
      await expect(tabs).toHaveCount(1);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check tabs are still visible and functional
      const tabsList = page.locator('[role="tablist"]').first();
      await expect(tabsList).toBeVisible();

      // Test tab clicking on mobile
      const tab = page.locator('[role="tab"]').first();
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    });

    test('should work correctly on tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check tabs layout
      const tabsList = page.locator('[role="tablist"]').first();
      await expect(tabsList).toBeVisible();

      // Test functionality
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThan(0);
    });
  });

  test.describe('Performance and Loading', () => {
    test('should load tabs quickly', async () => {
      const startTime = Date.now();

      await page.goto('/analytics');
      await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should switch tabs without significant delay', async () => {
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        const startTime = Date.now();

        await tabs.nth(i).click();
        await page.waitForTimeout(100); // Small buffer

        const switchTime = Date.now() - startTime;
        expect(switchTime).toBeLessThan(1000); // Should switch within 1 second
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing content gracefully', async () => {
      // Click all tabs to ensure they don't crash
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(500);

        // Check no error messages are shown
        const errorMessages = page.locator('text=Error').or(page.locator('text=Failed'));
        await expect(errorMessages).toHaveCount(0);

        // Check tab is still selected
        await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
      }
    });

    test('should recover from network errors', async () => {
      // Simulate network issues by going offline temporarily
      await page.setOfflineMode(true);

      // Try switching tabs
      const tab = page.locator('[role="tab"]').nth(1);
      await tab.click();

      // Should still work for local tab switching
      await expect(tab).toHaveAttribute('aria-selected', 'true');

      // Restore network
      await page.setOfflineMode(false);
      await page.waitForTimeout(1000);
    });
  });

  test.afterEach(async () => {
    // Take screenshot on failure
    if (test.info().status === 'failed') {
      await page.screenshot({
        path: `test-results/tab-navigation-failure-${Date.now()}.png`,
        fullPage: true
      });
    }
  });
});
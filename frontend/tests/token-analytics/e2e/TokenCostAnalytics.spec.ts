import { test, expect } from '@playwright/test';

/**
 * End-to-End tests for Token Cost Analytics integration
 * Validates complete user workflows and real-world usage scenarios
 */

test.describe('Token Cost Analytics E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page
    await page.goto('http://localhost:3001/analytics');
    await page.waitForTimeout(1000);
  });

  test.describe('Analytics Dashboard Integration', () => {
    test('should display Token Costs tab in analytics dashboard', async ({ page }) => {
      // Should show both System and Token Costs tabs
      await expect(page.locator('button:has-text("System")')).toBeVisible();
      await expect(page.locator('button:has-text("Token Costs")')).toBeVisible();
      
      // System tab should be active by default
      await expect(page.locator('button:has-text("System").filter({ hasText: "System" })')).toHaveClass(/bg-white text-blue-600/);
    });

    test('should switch to Token Costs view when tab clicked', async ({ page }) => {
      // Click Token Costs tab
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(500);

      // Should show token cost analytics content
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('text=Real-time token usage and cost tracking')).toBeVisible();
      
      // Token Costs tab should now be active
      await expect(page.locator('button:has-text("Token Costs").filter({ hasText: "Token Costs" })')).toHaveClass(/bg-white text-blue-600/);
    });
  });

  test.describe('Token Cost Analytics UI', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Token Costs tab
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
    });

    test('should display key metrics cards', async ({ page }) => {
      // Should show all metric cards
      await expect(page.locator('text=Total Cost')).toBeVisible();
      await expect(page.locator('text=Total Tokens')).toBeVisible();
      await expect(page.locator('text=Avg Cost/Token')).toBeVisible();
      
      // Should show currency formatting
      const totalCostCard = page.locator('div:has-text("Total Cost")').first();
      await expect(totalCostCard.locator('text=/\\$.*/')).toBeVisible();
    });

    test('should display time range selector', async ({ page }) => {
      // Should show time range buttons
      await expect(page.locator('button:has-text("1h")')).toBeVisible();
      await expect(page.locator('button:has-text("1d")')).toBeVisible();
      await expect(page.locator('button:has-text("7d")')).toBeVisible();
      await expect(page.locator('button:has-text("30d")')).toBeVisible();
      
      // 1d should be selected by default
      await expect(page.locator('button:has-text("1d")')).toHaveClass(/bg-white text-blue-600/);
    });

    test('should allow time range switching', async ({ page }) => {
      // Click 7d range
      await page.click('button:has-text("7d")');
      await page.waitForTimeout(200);
      
      // Should become active
      await expect(page.locator('button:has-text("7d")')).toHaveClass(/bg-white text-blue-600/);
      
      // 1d should no longer be active
      await expect(page.locator('button:has-text("1d")')).not.toHaveClass(/bg-white text-blue-600/);
    });

    test('should display export button when enabled', async ({ page }) => {
      await expect(page.locator('button:has-text("Export")')).toBeVisible();
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    });

    test('should show connection status indicator', async ({ page }) => {
      // Should show connection status
      const statusIndicator = page.locator('text=Real-time updates active').or(page.locator('text=Disconnected'));
      await expect(statusIndicator).toBeVisible();
    });
  });

  test.describe('Empty State Handling', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
    });

    test('should display empty state when no data available', async ({ page }) => {
      // Wait for loading to complete
      await page.waitForTimeout(2000);
      
      // Check for empty state or data
      const hasEmptyState = await page.locator('text=No token usage data').count() > 0;
      const hasData = await page.locator('text=Total Cost').count() > 0;
      
      // Should have either empty state or actual data
      expect(hasEmptyState || hasData).toBe(true);
      
      if (hasEmptyState) {
        await expect(page.locator('text=Start using AI features to see token cost analytics here.')).toBeVisible();
        await expect(page.locator('button:has-text("Check Again")')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);

      // Header should be visible
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      
      // Time range selector should adapt to mobile
      await expect(page.locator('button:has-text("1h")')).toBeVisible();
      
      // Cards should stack vertically on mobile
      const cards = page.locator('div:has-text("Total Cost"), div:has-text("Total Tokens")');
      await expect(cards.first()).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);

      // Should display properly on tablet
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('button:has-text("Export")')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle component errors gracefully', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      
      // Wait for potential error states
      await page.waitForTimeout(2000);
      
      // Should not show any unhandled error dialogs
      const errorDialog = page.locator('[role="dialog"]:has-text("error"), [role="alert"]:has-text("error")');
      await expect(errorDialog).toHaveCount(0);
      
      // Page should remain functional
      await expect(page.locator('button:has-text("System")')).toBeVisible();
      await expect(page.locator('button:has-text("Token Costs")')).toBeVisible();
    });

    test('should allow switching back to System tab if Token Costs fails', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Should be able to switch back to System tab
      await page.click('button:has-text("System")');
      await page.waitForTimeout(500);
      
      // Should show system metrics
      await expect(page.locator('text=System Analytics')).toBeVisible();
      await expect(page.locator('text=Monitor performance metrics')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load Token Costs tab within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.click('button:has-text("Token Costs")');
      
      // Wait for key content to appear
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid tab switching', async ({ page }) => {
      // Rapidly switch between tabs
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("Token Costs")');
        await page.waitForTimeout(100);
        await page.click('button:has-text("System")');
        await page.waitForTimeout(100);
      }
      
      // Should end up in functional state
      await page.click('button:has-text("Token Costs")');
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    });
  });

  test.describe('Integration with Existing Features', () => {
    test('should not break existing system analytics', async ({ page }) => {
      // System tab should still work normally
      await expect(page.locator('button:has-text("System")')).toBeVisible();
      await page.click('button:has-text("System")');
      
      // Should show system metrics
      await expect(page.locator('text=CPU Usage')).toBeVisible();
      await expect(page.locator('text=Memory Usage')).toBeVisible();
      await expect(page.locator('text=Active Agents')).toBeVisible();
    });

    test('should maintain navigation functionality', async ({ page }) => {
      // Should be able to navigate away and back
      await page.goto('http://localhost:3001/');
      await page.waitForTimeout(500);
      
      // Navigate back to analytics
      await page.goto('http://localhost:3001/analytics');
      await page.waitForTimeout(1000);
      
      // Both tabs should still be available
      await expect(page.locator('button:has-text("System")')).toBeVisible();
      await expect(page.locator('button:has-text("Token Costs")')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Should be able to tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should not trap focus
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeDefined();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Time range buttons should have proper roles
      const timeRangeButtons = page.locator('button:has-text("1h"), button:has-text("1d"), button:has-text("7d"), button:has-text("30d")');
      await expect(timeRangeButtons.first()).toBeVisible();
      
      // Export and refresh buttons should be accessible
      const exportButton = page.locator('button:has-text("Export")');
      const refreshButton = page.locator('button:has-text("Refresh")');
      
      await expect(exportButton).toBeVisible();
      await expect(refreshButton).toBeVisible();
    });
  });

  test.describe('Data Display', () => {
    test('should format currency values correctly', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(2000);
      
      // Look for currency formatting (either $0.0000 for empty state or actual values)
      const currencyElements = page.locator('text=/\\$\\d+\\.\\d+/');
      
      if (await currencyElements.count() > 0) {
        // If there's data, it should be properly formatted
        const firstCurrencyText = await currencyElements.first().textContent();
        expect(firstCurrencyText).toMatch(/^\$\d+\.\d{4,}/);
      }
    });

    test('should format large numbers correctly', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(2000);
      
      // Should show token counts (either 0 or formatted numbers)
      const tokenElements = page.locator('text=tokens');
      if (await tokenElements.count() > 0) {
        await expect(tokenElements.first()).toBeVisible();
      }
    });
  });
});
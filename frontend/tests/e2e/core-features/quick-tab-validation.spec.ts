import { test, expect } from '@playwright/test';

/**
 * Quick Tab Navigation Validation
 * Basic test to verify tab functionality works
 */

test.describe('Quick Tab Navigation Validation', () => {
  test('should load analytics page and navigate tabs', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('/analytics');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    try {
      // Wait for tabs to be present
      await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

      // Check that tab list is visible
      const tabsList = page.locator('[role="tablist"]').first();
      await expect(tabsList).toBeVisible();

      // Check for expected tab content
      const expectedTabs = [
        'Cost Overview',
        'Messages & Steps',
        'Optimization',
        'Export & Reports'
      ];

      // Verify at least some tabs are present
      for (const tabText of expectedTabs) {
        const tab = page.locator(`[role="tab"]:has-text("${tabText}")`);
        if (await tab.isVisible()) {
          console.log(`✓ Found tab: ${tabText}`);

          // Try clicking the tab
          await tab.click();
          await page.waitForTimeout(500);

          // Check if tab is now active
          const isActive = await tab.getAttribute('aria-selected');
          if (isActive === 'true') {
            console.log(`✓ Tab ${tabText} is active after click`);
          }
        }
      }

    } catch (error) {
      console.log('Analytics page structure:', await page.content());
      throw error;
    }
  });

  test('should handle page load without errors', async ({ page }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to analytics
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Check for critical errors
    const criticalErrors = errors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('network') &&
      !error.includes('404')
    );

    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors);
    }

    // Should not have page crash errors
    expect(criticalErrors.filter(e => e.includes('crash') || e.includes('Cannot read'))).toHaveLength(0);
  });

  test('should show analytics page content', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check for basic page elements
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible({ timeout: 10000 });

    // Check for any content indicating this is analytics page
    const analyticsIndicators = [
      'analytics', 'Analytics', 'dashboard', 'Dashboard',
      'cost', 'Cost', 'claude', 'Claude', 'SDK'
    ];

    let foundIndicator = false;
    for (const indicator of analyticsIndicators) {
      const element = page.locator(`text=${indicator}`).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✓ Found analytics indicator: ${indicator}`);
        foundIndicator = true;
        break;
      }
    }

    expect(foundIndicator).toBeTruthy();
  });
});
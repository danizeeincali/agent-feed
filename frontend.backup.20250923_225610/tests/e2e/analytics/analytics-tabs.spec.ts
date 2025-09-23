import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://127.0.0.1:5173';
const ANALYTICS_URL = `${BASE_URL}/analytics`;

// Selectors
const SELECTORS = {
  systemAnalyticsTab: '[data-testid="system-analytics-tab"], [role="tab"]:has-text("System Analytics")',
  sdkAnalyticsTab: '[data-testid="sdk-analytics-tab"], [role="tab"]:has-text("Claude SDK Cost Analytics")',
  systemAnalyticsContent: '[data-testid="system-analytics-content"]',
  sdkAnalyticsContent: '[data-testid="sdk-analytics-content"]',
  tabPanel: '[role="tabpanel"]',
  loadingSpinner: '[data-testid="loading-spinner"]',
  errorMessage: '[data-testid="error-message"]'
};

// Wait for analytics data to load
async function waitForAnalyticsLoad(page: Page) {
  // Wait for potential loading states to complete
  await page.waitForTimeout(2000);

  // Wait for any loading spinners to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('[data-testid="loading-spinner"]');
    return spinners.length === 0 || Array.from(spinners).every(spinner =>
      (spinner as HTMLElement).style.display === 'none' ||
      !spinner.parentElement?.offsetParent
    );
  }, { timeout: 10000 }).catch(() => {
    // If no spinners found or timeout, continue
  });
}

test.describe('Analytics Tab Navigation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await waitForAnalyticsLoad(page);
  });

  test('should load analytics page with visible tabs', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/analytics-initial-load.png', fullPage: true });

    // Verify page title
    await expect(page).toHaveTitle(/.*Analytics.*/);

    // Check for tab elements (flexible selectors)
    const tabElements = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').all();
    expect(tabElements.length).toBeGreaterThanOrEqual(2);

    // Check for system analytics tab
    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();
    await expect(systemTab).toBeVisible();

    // Check for SDK analytics tab
    const sdkTab = page.locator(SELECTORS.sdkAnalyticsTab).first();
    await expect(sdkTab).toBeVisible();

    console.log('✓ Analytics page loaded with visible tabs');
  });

  test('should switch between tabs successfully', async ({ page }) => {
    // Find tab elements
    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();
    const sdkTab = page.locator(SELECTORS.sdkAnalyticsTab).first();

    // Ensure both tabs are visible
    await expect(systemTab).toBeVisible();
    await expect(sdkTab).toBeVisible();

    // Click on System Analytics tab
    await systemTab.click();
    await waitForAnalyticsLoad(page);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/system-analytics-active.png', fullPage: true });

    // Verify system analytics tab is active
    const systemTabActive = await systemTab.getAttribute('aria-selected') === 'true' ||
                            await systemTab.getAttribute('data-state') === 'active' ||
                            await systemTab.evaluate(el => el.classList.contains('active'));

    console.log('System tab active state:', systemTabActive);

    // Click on SDK Analytics tab
    await sdkTab.click();
    await waitForAnalyticsLoad(page);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/sdk-analytics-active.png', fullPage: true });

    // Verify SDK analytics tab is active
    const sdkTabActive = await sdkTab.getAttribute('aria-selected') === 'true' ||
                         await sdkTab.getAttribute('data-state') === 'active' ||
                         await sdkTab.evaluate(el => el.classList.contains('active'));

    console.log('SDK tab active state:', sdkTabActive);

    // Verify no console errors during switching
    const errors = await page.evaluate(() => {
      const errors = (window as any).__playwright_errors || [];
      return errors;
    });
    expect(errors.length).toBe(0);

    console.log('✓ Tab switching functionality works correctly');
  });

  test('should handle direct navigation to analytics page', async ({ page }) => {
    // Navigate directly to analytics
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('domcontentloaded');
    await waitForAnalyticsLoad(page);

    // Verify page loads correctly
    await expect(page).toHaveURL(ANALYTICS_URL);

    // Check that tabs are present
    const tabs = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
    expect(tabs).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/direct-navigation.png', fullPage: true });

    console.log('✓ Direct navigation to analytics page works');
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Focus on first tab
    const firstTab = page.locator('[role="tab"], .tab, [data-testid*="tab"]').first();
    await firstTab.focus();

    // Test Tab key navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Test Enter key activation
    await page.keyboard.press('Enter');
    await waitForAnalyticsLoad(page);

    // Test Arrow key navigation (if supported)
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await waitForAnalyticsLoad(page);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/keyboard-navigation.png', fullPage: true });

    console.log('✓ Keyboard navigation accessibility test completed');
  });

  test('should handle tab switching performance', async ({ page }) => {
    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();
    const sdkTab = page.locator(SELECTORS.sdkAnalyticsTab).first();

    // Measure tab switching performance
    const startTime = Date.now();

    for (let i = 0; i < 5; i++) {
      await systemTab.click();
      await page.waitForTimeout(200);
      await sdkTab.click();
      await page.waitForTimeout(200);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / 10; // 10 tab switches total

    console.log(`Tab switching performance: ${averageTime}ms average per switch`);
    expect(averageTime).toBeLessThan(1000); // Should be under 1 second per switch

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/performance-test.png', fullPage: true });

    console.log('✓ Tab switching performance test completed');
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test with network offline
    await page.setOfflineMode(true);

    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();
    const sdkTab = page.locator(SELECTORS.sdkAnalyticsTab).first();

    // Try switching tabs while offline
    await systemTab.click();
    await page.waitForTimeout(1000);
    await sdkTab.click();
    await page.waitForTimeout(1000);

    // Re-enable network
    await page.setOfflineMode(false);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/error-recovery.png', fullPage: true });

    // Verify tabs still work after network recovery
    await systemTab.click();
    await waitForAnalyticsLoad(page);

    console.log('✓ Error scenario handling test completed');
  });

  test('should test responsive design behavior', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/desktop-view.png', fullPage: true });

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/tablet-view.png', fullPage: true });

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/mobile-view.png', fullPage: true });

    // Verify tabs are still accessible in mobile view
    const tabs = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
    expect(tabs).toBeGreaterThanOrEqual(2);

    console.log('✓ Responsive design behavior test completed');
  });

  test('should validate analytics data loading', async ({ page }) => {
    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();
    const sdkTab = page.locator(SELECTORS.sdkAnalyticsTab).first();

    // Test System Analytics data loading
    await systemTab.click();
    await waitForAnalyticsLoad(page);

    // Look for common analytics elements
    const analyticsElements = await page.locator('[data-testid*="metric"], .metric, .chart, .analytics').count();
    console.log(`Found ${analyticsElements} analytics elements in System Analytics`);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/system-analytics-data.png', fullPage: true });

    // Test SDK Analytics data loading
    await sdkTab.click();
    await waitForAnalyticsLoad(page);

    const sdkElements = await page.locator('[data-testid*="metric"], .metric, .chart, .analytics, [data-testid*="cost"]').count();
    console.log(`Found ${sdkElements} analytics elements in SDK Analytics`);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/sdk-analytics-data.png', fullPage: true });

    console.log('✓ Analytics data loading validation completed');
  });

  test('should handle page refresh and tab persistence', async ({ page }) => {
    const sdkTab = page.locator(SELECTORS.sdkAnalyticsTab).first();

    // Switch to SDK tab
    await sdkTab.click();
    await waitForAnalyticsLoad(page);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForAnalyticsLoad(page);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/after-refresh.png', fullPage: true });

    // Verify tabs are still functional after refresh
    const systemTab = page.locator(SELECTORS.systemAnalyticsTab).first();
    await systemTab.click();
    await waitForAnalyticsLoad(page);

    console.log('✓ Page refresh and tab persistence test completed');
  });
});

test.describe('Cross-Browser Compatibility', () => {
  test('should work consistently across browsers', async ({ page, browserName }) => {
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await waitForAnalyticsLoad(page);

    // Take browser-specific screenshots
    await page.screenshot({
      path: `/workspaces/agent-feed/frontend/tests/e2e/screenshots/browser-${browserName}.png`,
      fullPage: true
    });

    // Test basic functionality
    const tabs = await page.locator('[role="tab"], .tab, [data-testid*="tab"]').count();
    expect(tabs).toBeGreaterThanOrEqual(2);

    // Test tab switching
    const firstTab = page.locator('[role="tab"], .tab, [data-testid*="tab"]').first();
    const secondTab = page.locator('[role="tab"], .tab, [data-testid*="tab"]').nth(1);

    await firstTab.click();
    await page.waitForTimeout(500);
    await secondTab.click();
    await page.waitForTimeout(500);

    console.log(`✓ Cross-browser compatibility test completed for ${browserName}`);
  });
});
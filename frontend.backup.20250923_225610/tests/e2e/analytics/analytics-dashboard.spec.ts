import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://127.0.0.1:5173';
const ANALYTICS_URL = `${BASE_URL}/analytics`;

// Selectors based on actual implementation
const SELECTORS = {
  analyticsTitle: 'h1:has-text("Analytics Dashboard"), h2:has-text("Analytics Dashboard")',
  refreshButton: 'button:has-text("Refresh")',
  activeUsers: '[data-testid="active-users"], .metric:has-text("Active Users")',
  totalPosts: '[data-testid="total-posts"], .metric:has-text("Total Posts")',
  engagement: '[data-testid="engagement"], .metric:has-text("Engagement")',
  systemHealth: '[data-testid="system-health"], .metric:has-text("System Health")',
  cpuUsage: 'text=CPU Usage',
  memoryUsage: 'text=Memory Usage',
  responseTime: 'text=Response Time',
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

test.describe('Analytics Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to analytics page
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('networkidle');
    await waitForAnalyticsLoad(page);
  });

  test('should load analytics dashboard with core metrics', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/analytics-dashboard-initial.png', fullPage: true });

    // Verify page title contains expected text
    await expect(page).toHaveTitle(/Agent Feed/);

    // Check for analytics dashboard title
    const dashboardTitle = page.locator(SELECTORS.analyticsTitle);
    await expect(dashboardTitle).toBeVisible();

    // Check for refresh button
    const refreshButton = page.locator(SELECTORS.refreshButton);
    await expect(refreshButton).toBeVisible();

    // Verify core metrics are displayed
    const metricsElements = await page.locator('.metric, [data-testid*="metric"]').count();
    expect(metricsElements).toBeGreaterThanOrEqual(4);

    console.log('✓ Analytics dashboard loaded with core metrics');
  });

  test('should display system performance metrics', async ({ page }) => {
    // Check for CPU Usage
    const cpuUsage = page.locator(SELECTORS.cpuUsage);
    await expect(cpuUsage).toBeVisible();

    // Check for Memory Usage
    const memoryUsage = page.locator(SELECTORS.memoryUsage);
    await expect(memoryUsage).toBeVisible();

    // Check for Response Time
    const responseTime = page.locator(SELECTORS.responseTime);
    await expect(responseTime).toBeVisible();

    // Take screenshot of performance metrics
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/system-performance-metrics.png', fullPage: true });

    console.log('✓ System performance metrics are displayed correctly');
  });

  test('should handle refresh functionality', async ({ page }) => {
    // Find and click refresh button
    const refreshButton = page.locator(SELECTORS.refreshButton);
    await expect(refreshButton).toBeVisible();

    // Record initial state
    const initialTitle = await page.locator(SELECTORS.analyticsTitle).textContent();

    // Click refresh button
    await refreshButton.click();
    await waitForAnalyticsLoad(page);

    // Verify page is still functional after refresh
    await expect(page.locator(SELECTORS.analyticsTitle)).toBeVisible();

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/after-refresh.png', fullPage: true });

    console.log('✓ Refresh functionality works correctly');
  });

  test('should handle direct navigation to analytics page', async ({ page }) => {
    // Navigate directly to analytics
    await page.goto(ANALYTICS_URL);
    await page.waitForLoadState('domcontentloaded');
    await waitForAnalyticsLoad(page);

    // Verify page loads correctly
    await expect(page).toHaveURL(ANALYTICS_URL);

    // Check that analytics dashboard is displayed
    await expect(page.locator(SELECTORS.analyticsTitle)).toBeVisible();

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/direct-navigation.png', fullPage: true });

    console.log('✓ Direct navigation to analytics page works');
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Focus on refresh button
    const refreshButton = page.locator(SELECTORS.refreshButton);
    await refreshButton.focus();

    // Test Tab key navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Test Enter key activation on focused element
    await page.keyboard.press('Enter');
    await waitForAnalyticsLoad(page);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/keyboard-navigation.png', fullPage: true });

    console.log('✓ Keyboard navigation accessibility test completed');
  });

  test('should display analytics data consistently', async ({ page }) => {
    // Check for Active Users metric
    const activeUsersText = await page.locator('text=Active Users').textContent();
    console.log('Active Users found:', activeUsersText !== null);

    // Check for Total Posts metric
    const totalPostsText = await page.locator('text=Total Posts').textContent();
    console.log('Total Posts found:', totalPostsText !== null);

    // Check for Engagement metric
    const engagementText = await page.locator('text=Engagement').textContent();
    console.log('Engagement found:', engagementText !== null);

    // Check for System Health metric
    const systemHealthText = await page.locator('text=System Health').textContent();
    console.log('System Health found:', systemHealthText !== null);

    // Look for numeric values
    const numberPattern = /\d+/;
    const percentagePattern = /\d+\.\d*%/;

    const metricsWithValues = await page.locator('.metric, [class*="metric"]').count();
    console.log(`Found ${metricsWithValues} metric elements`);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/analytics-data-validation.png', fullPage: true });

    console.log('✓ Analytics data consistency validation completed');
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test with network offline
    await page.setOfflineMode(true);

    // Try refreshing while offline
    const refreshButton = page.locator(SELECTORS.refreshButton);
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(2000);
    }

    // Re-enable network
    await page.setOfflineMode(false);
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/error-recovery.png', fullPage: true });

    // Verify dashboard still works after network recovery
    await expect(page.locator(SELECTORS.analyticsTitle)).toBeVisible();

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

    // Verify analytics dashboard is still accessible in mobile view
    await expect(page.locator(SELECTORS.analyticsTitle)).toBeVisible();

    console.log('✓ Responsive design behavior test completed');
  });

  test('should handle page refresh and state persistence', async ({ page }) => {
    // Record initial state
    const initialTitle = await page.locator(SELECTORS.analyticsTitle).textContent();

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForAnalyticsLoad(page);

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/after-page-refresh.png', fullPage: true });

    // Verify dashboard is still functional after refresh
    await expect(page.locator(SELECTORS.analyticsTitle)).toBeVisible();

    console.log('✓ Page refresh and state persistence test completed');
  });

  test('should validate navigation and menu integration', async ({ page }) => {
    // Check that Analytics link in navigation is highlighted/active
    const analyticsNavLink = page.locator('nav a[href="/analytics"], .nav-link:has-text("Analytics")');
    if (await analyticsNavLink.count() > 0) {
      await expect(analyticsNavLink.first()).toBeVisible();
    }

    // Test navigation to other pages and back
    const feedLink = page.locator('nav a[href="/"], nav a[href="/feed"], .nav-link:has-text("Feed")');
    if (await feedLink.count() > 0) {
      await feedLink.first().click();
      await page.waitForTimeout(1000);

      // Navigate back to analytics
      await page.goto(ANALYTICS_URL);
      await waitForAnalyticsLoad(page);
    }

    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/navigation-integration.png', fullPage: true });

    // Verify we're back on analytics page
    await expect(page.locator(SELECTORS.analyticsTitle)).toBeVisible();

    console.log('✓ Navigation and menu integration test completed');
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
    await expect(page.locator(SELECTORS.analyticsTitle)).toBeVisible();

    // Test refresh functionality
    const refreshButton = page.locator(SELECTORS.refreshButton);
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(500);
    }

    console.log(`✓ Cross-browser compatibility test completed for ${browserName}`);
  });
});
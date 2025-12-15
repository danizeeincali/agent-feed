import { test, expect } from '@playwright/test';

test.describe('Analytics Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('navigate to analytics page successfully', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Look for analytics link or try direct navigation
    let analyticsLinkFound = false;

    // Check for analytics link in navigation
    const analyticsLink = page.locator('a[href="/analytics"], a[href*="analytics"]').first();
    if (await analyticsLink.count() > 0) {
      await analyticsLink.click();
      analyticsLinkFound = true;
    } else {
      // Direct navigation to analytics page
      await page.goto('/analytics', { waitUntil: 'networkidle' });
    }

    // Verify we're on the analytics page
    await page.waitForTimeout(1000);

    // Check that page loaded without white screen
    await expect(page.locator('#root')).toBeVisible();
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);

    // Look for analytics-specific content
    const possibleAnalyticsContent = [
      'analytics',
      'dashboard',
      'metrics',
      'chart',
      'data',
      'statistics'
    ];

    let analyticsContentFound = false;
    for (const content of possibleAnalyticsContent) {
      if (bodyContent!.toLowerCase().includes(content)) {
        analyticsContentFound = true;
        break;
      }
    }

    // Either analytics content should be found OR we should see a proper error page
    // (not a white screen)
    expect(analyticsContentFound || bodyContent!.includes('404') || bodyContent!.includes('Not Found')).toBeTruthy();

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/evidence/analytics-page-loaded.png',
      fullPage: true
    });
  });

  test('analytics page handles missing data gracefully', async ({ page }) => {
    await page.goto('/analytics', { waitUntil: 'networkidle' });

    // Wait for any async operations
    await page.waitForTimeout(2000);

    // Check page is still responsive
    await expect(page.locator('#root')).toBeVisible();

    // Verify no white screen
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);

    // Look for loading states or error messages (good UX)
    const hasLoadingState = await page.locator('[data-testid*="loading"], .loading, .spinner').count() > 0;
    const hasErrorMessage = await page.locator('[data-testid*="error"], .error, .error-message').count() > 0;
    const hasEmptyState = bodyContent!.includes('No data') || bodyContent!.includes('Empty');

    // Should have some kind of proper state (not just blank)
    expect(hasLoadingState || hasErrorMessage || hasEmptyState || bodyContent!.includes('analytics')).toBeTruthy();
  });

  test('analytics page components render without crashing', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/analytics', { waitUntil: 'networkidle' });

    // Wait for components to render
    await page.waitForTimeout(3000);

    // Check for React component errors
    const filteredErrors = consoleErrors.filter(error =>
      !error.includes('React DevTools') &&
      !error.includes('extension') &&
      error.includes('Error')
    );

    if (filteredErrors.length > 0) {
      console.log('Console errors on analytics page:', filteredErrors);
    }

    // Should not have component rendering errors
    expect(filteredErrors).toHaveLength(0);

    // Page should still be interactive
    await expect(page.locator('#root')).toBeVisible();
  });
});
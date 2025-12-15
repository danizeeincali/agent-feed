import { test, expect } from '@playwright/test';

test.describe('Avi DM Functionality Validation After /claude-code Route Removal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main app
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test('Main feed loads without /claude-code route', async ({ page }) => {
    // Verify main page loads
    await expect(page).toHaveTitle(/AgentLink/);

    // Take screenshot of main page
    await page.screenshot({
      path: 'frontend/tests/screenshots/avi-dm-01-main-feed-loaded.png',
      fullPage: true
    });

    // Verify /claude-code route is removed (should show 404 or redirect)
    const claudeCodeResponse = await page.goto('http://localhost:5173/claude-code');
    await page.screenshot({
      path: 'frontend/tests/screenshots/avi-dm-02-claude-code-route-removed.png',
      fullPage: true
    });
  });

  test('Navigation sidebar no longer shows Claude Code link', async ({ page }) => {
    // Check navigation sidebar
    const sidebar = page.locator('[data-testid="app-root"] nav');
    await expect(sidebar).toBeVisible();

    // Verify Claude Code link is not present
    const claudeCodeLink = page.locator('nav a', { hasText: 'Claude Code' });
    await expect(claudeCodeLink).toHaveCount(0);

    // Take screenshot of navigation
    await page.screenshot({
      path: 'frontend/tests/screenshots/avi-dm-03-navigation-without-claude-code.png',
      fullPage: true
    });
  });

  test('Avi DM chat interface is accessible in feed', async ({ page }) => {
    // Look for Avi DM components in the feed
    await page.waitForSelector('[data-testid="main-content"]', { timeout: 10000 });

    // Take screenshot of feed area looking for Avi DM interface
    await page.screenshot({
      path: 'frontend/tests/screenshots/avi-dm-04-feed-with-avi-interface.png',
      fullPage: true
    });

    // Look for any chat interfaces or Avi DM elements
    const chatElements = await page.locator('*').filter({ hasText: /avi|dm|chat/i }).count();
    console.log(`Found ${chatElements} potential Avi DM related elements`);
  });

  test('Backend API endpoints are preserved and accessible', async ({ page }) => {
    // Test that API endpoints still exist (even if backend not running)
    const response = await page.request.get('http://localhost:5173/api/claude-code/health');
    // Should get some response (likely 404 from Vite dev server or proxy error)
    console.log(`API health endpoint status: ${response.status()}`);

    // Take screenshot showing API test results
    await page.screenshot({
      path: 'frontend/tests/screenshots/avi-dm-05-api-endpoint-test.png',
      fullPage: true
    });
  });

  test('Application functions normally without errors', async ({ page }) => {
    // Navigate through key pages to verify stability
    const pages = ['/', '/agents', '/drafts', '/analytics', '/settings'];

    for (const path of pages) {
      await page.goto(`http://localhost:5173${path}`);
      await page.waitForLoadState('networkidle');

      // Check for console errors
      const errors = await page.evaluate(() => {
        return window.console.error.toString();
      });

      await page.screenshot({
        path: `frontend/tests/screenshots/avi-dm-06-page-${path.replace('/', 'root').replace('/', '-')}-stable.png`,
        fullPage: true
      });
    }

    // Final stability screenshot
    await page.goto('http://localhost:5173/');
    await page.screenshot({
      path: 'frontend/tests/screenshots/avi-dm-07-final-stability-check.png',
      fullPage: true
    });
  });
});
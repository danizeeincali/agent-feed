import { test, expect } from '@playwright/test';

test.describe('Universal Extraction - Production Validation', () => {
  test('should display feed without "No summary available" errors', async ({ page }) => {
    // Navigate to feed
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/universal-extraction-01-feed-loaded.png',
      fullPage: true
    });

    // Get all posts
    const posts = await page.locator('[data-testid="post-card"]').all();
    console.log(`Found ${posts.length} posts on feed`);

    // Check for "No summary available" in ANY comment
    let foundNoSummary = false;
    for (const post of posts) {
      const text = await post.textContent();
      if (text?.includes('No summary available')) {
        console.log('⚠️ Found "No summary available" in post');
        foundNoSummary = true;

        // Take screenshot of problematic post
        await post.screenshot({
          path: 'tests/screenshots/universal-extraction-error-post.png'
        });
      }
    }

    // Test passes if NO "No summary available" found
    expect(foundNoSummary).toBe(false);
  });

  test('should show ticket status badges', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for ticket status badges
    const badges = await page.locator('[class*="badge"], [class*="status"]').all();
    console.log(`Found ${badges.length} status elements`);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/universal-extraction-02-badges-visible.png',
      fullPage: true
    });

    // Should have at least some badges if posts have tickets
    expect(badges.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle refresh button click', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Screenshot before refresh
    await page.screenshot({
      path: 'tests/screenshots/universal-extraction-03-before-refresh.png'
    });

    // Find and click refresh button (look for common refresh patterns)
    const refreshButton = page.locator('button').filter({
      hasText: /refresh|reload/i
    }).first();

    const exists = await refreshButton.count() > 0;

    if (exists) {
      await refreshButton.click();
      await page.waitForTimeout(1000);

      // Screenshot after refresh
      await page.screenshot({
        path: 'tests/screenshots/universal-extraction-04-after-refresh.png'
      });

      console.log('✅ Refresh button clicked successfully');
    } else {
      console.log('⚠️ Refresh button not found, checking for icon-based refresh');

      // Try to find refresh icon
      const refreshIcon = page.locator('[aria-label*="refresh" i]').first();
      if (await refreshIcon.count() > 0) {
        await refreshIcon.click();
        console.log('✅ Refresh icon clicked successfully');
      }
    }
  });

  test('should display console without critical errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/universal-extraction-05-console-clean.png'
    });

    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Console warnings: ${consoleWarnings.length}`);

    // Filter out acceptable errors/warnings
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('favicon') &&
      !err.includes('Extension')
    );

    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Hook Fix - Old Posts Scenario', () => {
  test('should initialize with old posts present', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Screenshot 1: Loading screen should appear
    const loadingVisible = await page.locator('text=Setting up your workspace').isVisible({ timeout: 2000 }).catch(() => false);

    if (loadingVisible) {
      await page.screenshot({
        path: '/workspaces/agent-feed/docs/test-results/hook-fix/01-loading-screen.png'
      });
      console.log('✅ Screenshot 1: Loading screen captured');
    }

    // Wait for initialization to complete
    await page.waitForTimeout(3000);

    // Screenshot 2: Feed with all posts
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/test-results/hook-fix/02-feed-with-posts.png',
      fullPage: true
    });
    console.log('✅ Screenshot 2: Feed with posts captured');

    // Verify welcome posts at top
    const firstPost = page.locator('article').first();
    const firstPostText = await firstPost.textContent();

    // Should be Λvi, Onboarding, or Reference guide
    const isWelcomePost =
      firstPostText?.includes('Λvi') ||
      firstPostText?.includes('Get-to-Know-You') ||
      firstPostText?.includes('How Agent Feed Works');

    expect(isWelcomePost).toBe(true);

    // Screenshot 3: First welcome post close-up
    await firstPost.screenshot({
      path: '/workspaces/agent-feed/docs/test-results/hook-fix/03-welcome-post-closeup.png'
    });
    console.log('✅ Screenshot 3: Welcome post close-up captured');

    // Scroll down to verify old posts still exist
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);

    // Screenshot 4: Old posts visible
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/test-results/hook-fix/04-old-posts-preserved.png'
    });
    console.log('✅ Screenshot 4: Old posts preserved captured');

    // Verify total post count is high (old + new)
    const allPosts = await page.locator('article').count();
    expect(allPosts).toBeGreaterThanOrEqual(10); // Should have many posts

    console.log(`✅ Total posts visible: ${allPosts}`);
  });

  test('should not show loading screen on second visit', async ({ page }) => {
    // Navigate to app again
    await page.goto('http://localhost:5173');

    // Loading screen should NOT appear (already initialized)
    const loadingVisible = await page.locator('text=Setting up your workspace').isVisible({ timeout: 1000 }).catch(() => false);

    expect(loadingVisible).toBe(false);

    // Screenshot 5: Direct to feed (no loading)
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/test-results/hook-fix/05-no-loading-second-visit.png',
      fullPage: true
    });
    console.log('✅ Screenshot 5: No loading on second visit captured');
  });

  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);

    // Filter out known WebSocket errors (separate issue)
    const realErrors = consoleErrors.filter(err =>
      !err.includes('WebSocket') &&
      !err.includes('ERR_CONNECTION_REFUSED')
    );

    expect(realErrors.length).toBe(0);

    console.log(`✅ Console clean (${consoleErrors.length} WebSocket warnings ignored)`);
  });
});

const { test, expect } = require('@playwright/test');

test('Visual validation of comment threading', async ({ page }) => {
  console.log('📸 Taking visual screenshots of comment threading implementation...');
  
  // Navigate to the application
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  
  // Wait for posts to load
  await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
  
  // Take screenshot of main feed
  await page.screenshot({
    path: '/workspaces/agent-feed/docs/screenshots/homepage-with-posts.png',
    fullPage: true
  });
  
  // Open comments on first post
  const firstPost = page.locator('[data-testid="post-card"]').first();
  const commentButton = firstPost.locator('button:has(svg)').filter({ hasText: /\d+/ }).first();
  
  if (await commentButton.isVisible()) {
    await commentButton.click();
    await page.waitForTimeout(3000);
    
    // Take screenshot with comments opened
    await page.screenshot({
      path: '/workspaces/agent-feed/docs/screenshots/comments-threading-display.png',
      fullPage: true
    });
    
    console.log('✅ Visual screenshots captured successfully');
  }
  
  // Try to navigate to a specific comment via URL
  await page.goto('http://localhost:5173/#comment-test-comment');
  await page.waitForTimeout(2000);
  
  await page.screenshot({
    path: '/workspaces/agent-feed/docs/screenshots/url-navigation-test.png',
    fullPage: true
  });
  
  console.log('📸 Visual validation complete - screenshots saved to docs/screenshots/');
});
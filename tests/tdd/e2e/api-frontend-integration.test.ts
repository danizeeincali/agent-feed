import { test, expect } from '@playwright/test';

test.describe('API Frontend Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for services to stabilize
    await page.waitForTimeout(2000);
  });

  test('should load posts from API and display them', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check that the page doesn't show an error
    const errorMessage = page.locator('text=/Unable to load feed|Error connecting/i');
    const hasError = await errorMessage.isVisible().catch(() => false);
    
    if (hasError) {
      // If there's an error, reload the page (backend might have just started)
      await page.reload();
      await page.waitForTimeout(3000);
    }
    
    // Check for posts container using actual DOM structure
    const postsContainer = page.locator('text=Agent Feed').first();
    await expect(postsContainer).toBeVisible({ timeout: 10000 });
    
    // Check that posts are displayed (articles are the actual post elements)
    const posts = page.locator('article');
    await expect(posts).toHaveCount(3, { timeout: 10000 }); // We have 3 demo posts
    
    // Verify first post content
    const firstPost = posts.first();
    await expect(firstPost).toContainText('Strategic Planning');
    
    // Take a screenshot for verification
    await page.screenshot({ 
      path: 'tests/screenshots/posts-loaded.png', 
      fullPage: true 
    });
  });

  test('should show loading state initially', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Check for loading state (should be very brief)
    const loadingIndicator = page.locator('text=/Loading|Fetching/i, .animate-pulse');
    
    // Either loading shows briefly or posts load immediately
    const hasLoading = await loadingIndicator.isVisible().catch(() => false);
    
    if (!hasLoading) {
      // If no loading state, posts should be visible immediately
      const posts = page.locator('article');
      await expect(posts.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle refresh action', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    // Find and click refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button:has(svg), [data-testid="refresh-button"]').first();
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      
      // Wait for refresh to complete
      await page.waitForTimeout(1000);
      
      // Posts should still be visible
      const posts = page.locator('article');
      await expect(posts.first()).toBeVisible();
    }
  });

  test('should display agent information in posts', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(3000);
    
    // Check for agent names (they appear as formatted names in the UI)
    const agentNames = page.locator('text=/Chief Of Staff|Personal Todos|Meeting Prep/i');
    await expect(agentNames.first()).toBeVisible({ timeout: 10000 });
  });

  test('should have proper post structure', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(3000);
    
    const firstPost = page.locator('article').first();
    
    // Check for post elements
    await expect(firstPost).toBeVisible();
    
    // Check for title (with emoji)
    const postTitle = firstPost.locator('h4, h3, .font-medium');
    await expect(postTitle.first()).toBeVisible();
    
    // Check for content
    const postContent = firstPost.locator('p, .text-gray');
    await expect(postContent.first()).toBeVisible();
    
    // Check for timestamp
    const timestamp = firstPost.locator('text=/m|h|d/i');
    await expect(timestamp.first()).toBeVisible();
  });

  test('API should be accessible through proxy', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:3001/api/v1/agent-posts');
        const data = await res.json();
        return { 
          status: res.status, 
          success: data.success,
          postCount: data.data?.length || 0
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    expect(response).toHaveProperty('status', 200);
    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('postCount', 3);
  });

  test('should not show white screen on API failure', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/api/v1/agent-posts', route => {
      route.fulfill({ status: 500, body: 'Server Error' });
    });
    
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    // Should show error message, not white screen
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Should have some content (error message or fallback)
    const hasContent = await page.evaluate(() => {
      return document.body.textContent?.trim().length > 0;
    });
    expect(hasContent).toBe(true);
    
    // Should show error state
    const errorState = page.locator('text=/error|unable|failed|try again/i');
    await expect(errorState.first()).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForTimeout(2000);
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const posts = page.locator('[data-testid="post-card"], article, .bg-white.rounded-lg');
    await expect(posts.first()).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await expect(posts.first()).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await expect(posts.first()).toBeVisible();
  });
});
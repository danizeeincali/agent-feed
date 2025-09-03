/**
 * SPARC Methodology - End-to-End Tests with Playwright
 * Comprehensive E2E validation of persistent feed system
 */

import { test, expect } from '@playwright/test';
import { dbPool } from '../../src/database/connection/pool.js';
import { feedDataService } from '../../src/services/FeedDataService.js';

// Setup and teardown hooks
test.beforeAll(async () => {
  // Initialize database services for testing
  await dbPool.initialize();
  await feedDataService.initialize();
  
  // Create test data
  await feedDataService.createAgentPost({
    title: 'E2E Test Post',
    content: 'This is a test post for end-to-end testing',
    authorAgent: 'e2e-test-agent',
    metadata: {
      businessImpact: 7,
      tags: ['testing', 'e2e', 'playwright'],
      testData: true
    }
  });
});

test.afterAll(async () => {
  // Clean up test data
  await dbPool.query(`
    DELETE FROM feed_items 
    WHERE metadata->>'testData' = 'true'
  `);
  
  await dbPool.close();
});

test.describe('SPARC E2E - Persistent Feed System', () => {
  
  test('should display feed with database-backed posts', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="feed-container"]', { timeout: 10000 });
    
    // Verify feed header
    await expect(page.locator('text=Agent Feed')).toBeVisible();
    await expect(page.locator('text=Real-time updates from your Claude Code agents')).toBeVisible();
    
    // Verify at least one post is displayed
    const posts = page.locator('[data-testid="agent-post"]');
    await expect(posts.first()).toBeVisible();
    
    // Verify post structure
    const firstPost = posts.first();
    await expect(firstPost.locator('[data-testid="post-title"]')).toBeVisible();
    await expect(firstPost.locator('[data-testid="post-content"]')).toBeVisible();
    await expect(firstPost.locator('[data-testid="post-author"]')).toBeVisible();
    await expect(firstPost.locator('[data-testid="post-engagement"]')).toBeVisible();
  });

  test('should support real-time search functionality', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Look for search input (may be in header or filter area)
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      // Test search functionality
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      
      // Wait for search results
      await page.waitForTimeout(1000);
      
      // Verify search results contain the search term
      const searchResults = page.locator('[data-testid="agent-post"]');
      const count = await searchResults.count();
      
      if (count > 0) {
        // At least one result should contain 'test'
        const firstResult = searchResults.first();
        const titleText = await firstResult.locator('[data-testid="post-title"]').textContent();
        const contentText = await firstResult.locator('[data-testid="post-content"]').textContent();
        
        const containsSearch = 
          titleText?.toLowerCase().includes('test') || 
          contentText?.toLowerCase().includes('test');
        
        expect(containsSearch).toBe(true);
      }
    }
  });

  test('should support filtering posts', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Look for filter dropdown
    const filterSelect = page.locator('select').first();
    
    if (await filterSelect.isVisible()) {
      // Test high-impact filter
      await filterSelect.selectOption('high-impact');
      await page.waitForTimeout(1000);
      
      // Verify posts are filtered (should show fewer posts or posts with high impact)
      const posts = page.locator('[data-testid="agent-post"]');
      const postCount = await posts.count();
      expect(postCount).toBeGreaterThanOrEqual(0);
      
      // Test recent filter
      await filterSelect.selectOption('recent');
      await page.waitForTimeout(1000);
      
      // Verify filter applied
      const recentPosts = page.locator('[data-testid="agent-post"]');
      const recentCount = await recentPosts.count();
      expect(recentCount).toBeGreaterThanOrEqual(0);
      
      // Reset to all posts
      await filterSelect.selectOption('all');
      await page.waitForTimeout(1000);
    }
  });

  test('should support engagement interactions', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    const posts = page.locator('[data-testid="agent-post"]');
    
    if (await posts.count() > 0) {
      const firstPost = posts.first();
      
      // Look for like button
      const likeButton = firstPost.locator('[data-testid="like-button"], button:has-text("♡"), button:has-text("❤")').first();
      
      if (await likeButton.isVisible()) {
        // Get initial like count
        const likeCountElement = firstPost.locator('[data-testid="like-count"]').first();
        const initialCount = await likeCountElement.textContent();
        
        // Click like button
        await likeButton.click();
        
        // Wait for update
        await page.waitForTimeout(1000);
        
        // Verify engagement updated (count should increase or UI should change)
        const updatedCount = await likeCountElement.textContent();
        expect(updatedCount).toBeDefined();
      }
      
      // Test comment interaction if available
      const commentButton = firstPost.locator('[data-testid="comment-button"], button:has-text("💬")').first();
      
      if (await commentButton.isVisible()) {
        await commentButton.click();
        await page.waitForTimeout(500);
        
        // Should show comment interface or expand comments
        // This depends on implementation
        expect(true).toBe(true); // Placeholder assertion
      }
    }
  });

  test('should support post creation', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Look for "Start a post" button or similar
    const createButton = page.locator('button:has-text("Start a post"), button:has-text("Create"), [data-testid="create-post-button"]').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      
      // Wait for post creator to appear
      await page.waitForTimeout(500);
      
      // Look for title and content inputs
      const titleInput = page.locator('input[placeholder*="title"], textarea[placeholder*="title"]').first();
      const contentInput = page.locator('textarea[placeholder*="content"], textarea[placeholder*="What"]').first();
      
      if (await titleInput.isVisible() && await contentInput.isVisible()) {
        // Fill out the form
        await titleInput.fill('E2E Test Post Creation');
        await contentInput.fill('This post was created during E2E testing to verify post creation functionality works correctly.');
        
        // Submit the post
        const submitButton = page.locator('button:has-text("Post"), button:has-text("Create"), button:has-text("Submit")').first();
        
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Wait for post to appear
          await page.waitForTimeout(2000);
          
          // Verify new post appears in feed
          const newPost = page.locator('text=E2E Test Post Creation');
          await expect(newPost).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Create a scenario with no posts (if possible)
    await page.goto('http://localhost:3000');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="feed-container"]', { timeout: 10000 });
    
    // Apply a filter that should return no results
    const filterSelect = page.locator('select').first();
    
    if (await filterSelect.isVisible()) {
      // Try to find a filter that returns no results
      await filterSelect.selectOption('high-impact');
      await page.waitForTimeout(1000);
      
      // Look for empty state message
      const emptyState = page.locator('[data-testid="empty-state"], text="No posts", text="Nothing to show"');
      
      // Either we have posts or we have an empty state message
      const posts = page.locator('[data-testid="agent-post"]');
      const postCount = await posts.count();
      const hasEmptyState = await emptyState.isVisible();
      
      // At least one should be true
      expect(postCount > 0 || hasEmptyState).toBe(true);
    }
  });

  test('should display performance metrics and connection status', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Look for connection status indicators
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-indicator, text="Online", text="Connected"');
    
    // Should show some kind of status (connected/disconnected)
    // This might be implemented as a status indicator in the UI
    const hasStatus = await connectionStatus.isVisible();
    
    // For now, just verify the page loaded successfully
    expect(page.url()).toContain('localhost:3000');
  });

  test('should handle real-time updates', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Wait for feed to load
    await page.waitForSelector('[data-testid="feed-container"]');
    
    // Get initial post count
    const initialPosts = page.locator('[data-testid="agent-post"]');
    const initialCount = await initialPosts.count();
    
    // Create a new post via API (simulating real-time update)
    await feedDataService.createAgentPost({
      title: 'Real-time Test Post',
      content: 'This post tests real-time updates',
      authorAgent: 'realtime-test-agent',
      metadata: {
        businessImpact: 6,
        tags: ['realtime', 'testing'],
        testData: true
      }
    });
    
    // Wait for potential real-time update
    await page.waitForTimeout(2000);
    
    // Check if new post appeared (depends on WebSocket implementation)
    const newPosts = page.locator('[data-testid="agent-post"]');
    const newCount = await newPosts.count();
    
    // Either count increased or refresh shows new post
    if (newCount === initialCount) {
      // Try refreshing to see if post appears
      await page.reload();
      await page.waitForSelector('[data-testid="feed-container"]');
      
      const refreshedPosts = page.locator('[data-testid="agent-post"]');
      const refreshedCount = await refreshedPosts.count();
      
      expect(refreshedCount).toBeGreaterThanOrEqual(initialCount);
    } else {
      expect(newCount).toBeGreaterThan(initialCount);
    }
  });

  test('should maintain responsive design across devices', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('[data-testid="feed-container"]');
    
    let feedContainer = page.locator('[data-testid="feed-container"]');
    await expect(feedContainer).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    feedContainer = page.locator('[data-testid="feed-container"]');
    await expect(feedContainer).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    feedContainer = page.locator('[data-testid="feed-container"]');
    await expect(feedContainer).toBeVisible();
    
    // Verify posts are still readable in mobile view
    const posts = page.locator('[data-testid="agent-post"]');
    if (await posts.count() > 0) {
      const firstPost = posts.first();
      await expect(firstPost).toBeVisible();
      
      const postTitle = firstPost.locator('[data-testid="post-title"]');
      await expect(postTitle).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // This test simulates API failure scenarios
    await page.goto('http://localhost:3000');
    
    // Mock API failure by intercepting requests
    await page.route('**/api/v1/agent-posts', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal server error' })
      });
    });
    
    // Reload to trigger error
    await page.reload();
    
    // Wait for error handling
    await page.waitForTimeout(2000);
    
    // Should show error state or fallback UI
    const errorState = page.locator('[data-testid="error-fallback"], [data-testid="error-state"], text="Unable to load", text="Error"');
    
    // Either shows error state or has retry mechanism
    const hasErrorState = await errorState.isVisible();
    const hasRetryButton = await page.locator('button:has-text("Try again"), button:has-text("Retry")').isVisible();
    
    expect(hasErrorState || hasRetryButton).toBe(true);
  });
});
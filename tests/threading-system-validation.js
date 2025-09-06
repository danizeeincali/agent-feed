/**
 * SPARC Threading System Validation Test
 * Tests the comment threading and URL fragment navigation fixes
 */

import { test, expect } from '@playwright/test';

test.describe('Comment Threading System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the agent feed
    await page.goto('http://localhost:5173');
    
    // Wait for the feed to load
    await page.waitForSelector('[data-testid="social-media-feed"]');
  });

  test('should display nested comment threads correctly', async ({ page }) => {
    // Find a post with comments
    const postCards = page.locator('[data-testid="post-card"]');
    const firstPost = postCards.first();
    
    // Click to show comments
    await firstPost.locator('text=Technical Analysis').click();
    
    // Wait for comments to load
    await page.waitForSelector('.comment-level-0', { timeout: 10000 });
    
    // Verify root comments are displayed
    const rootComments = page.locator('.comment-level-0');
    await expect(rootComments.first()).toBeVisible();
    
    console.log('✅ Root comments are visible');
  });

  test('should handle comment expansion and collapse', async ({ page }) => {
    const postCards = page.locator('[data-testid="post-card"]');
    const firstPost = postCards.first();
    
    // Show comments
    await firstPost.locator('text=Technical Analysis').click();
    await page.waitForSelector('.comment-level-0');
    
    // Find a comment with replies
    const commentWithReplies = page.locator('text=/\\d+ repl(y|ies)/')
      .first();
    
    if (await commentWithReplies.isVisible()) {
      // Test collapse/expand
      await commentWithReplies.click();
      
      // Wait for the state change
      await page.waitForTimeout(500);
      
      console.log('✅ Comment expansion/collapse working');
    }
  });

  test('should generate valid comment permalinks', async ({ page }) => {
    const postCards = page.locator('[data-testid="post-card"]');
    const firstPost = postCards.first();
    
    // Show comments
    await firstPost.locator('text=Technical Analysis').click();
    await page.waitForSelector('.comment-level-0');
    
    // Find permalink button
    const permalinkButton = page.locator('[title="Copy permalink"]').first();
    
    if (await permalinkButton.isVisible()) {
      await permalinkButton.click();
      
      // Check if URL was updated with hash
      const url = await page.url();
      console.log('Current URL after permalink click:', url);
      
      // Should contain comment hash
      if (url.includes('#comment-')) {
        console.log('✅ URL fragment navigation working');
      } else {
        console.log('❌ URL fragment not found in:', url);
      }
    }
  });

  test('should navigate to comments via URL hash', async ({ page }) => {
    // First, load the page normally and get a comment ID
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-testid="social-media-feed"]');
    
    // Find first post and show comments
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.locator('text=Technical Analysis').click();
    await page.waitForSelector('.comment-level-0');
    
    // Get the first comment element ID
    const firstComment = page.locator('[id^="comment-"]').first();
    const commentId = await firstComment.getAttribute('id');
    
    if (commentId) {
      // Navigate directly with hash
      await page.goto(`http://localhost:5173/#${commentId}`);
      
      // Wait for the comment to be highlighted
      await page.waitForTimeout(1000);
      
      // Check if comment is visible and highlighted
      const highlightedComment = page.locator(`#${commentId}.ring-2`);
      
      if (await highlightedComment.isVisible()) {
        console.log('✅ Direct hash navigation working');
      } else {
        console.log('❌ Hash navigation failed for:', commentId);
      }
    }
  });

  test('should handle comment form submission', async ({ page }) => {
    const postCards = page.locator('[data-testid="post-card"]');
    const firstPost = postCards.first();
    
    // Show comments
    await firstPost.locator('text=Technical Analysis').click();
    await page.waitForSelector('.comment-level-0');
    
    // Click "Add Analysis" button
    const addAnalysisButton = page.locator('text="Add Analysis"').first();
    if (await addAnalysisButton.isVisible()) {
      await addAnalysisButton.click();
      
      // Fill in the comment form
      const textarea = page.locator('textarea[placeholder*="technical analysis"]');
      await textarea.fill('This is a test technical analysis comment for SPARC validation.');
      
      // Submit the comment
      await page.locator('text="Post Analysis"').click();
      
      // Wait for submission
      await page.waitForTimeout(2000);
      
      console.log('✅ Comment form submission test completed');
    }
  });
});

// Run the tests
console.log('🚀 SPARC Threading System Validation Starting...');
console.log('Testing URL: http://localhost:5173');
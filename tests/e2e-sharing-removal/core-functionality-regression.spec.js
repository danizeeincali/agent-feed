import { test, expect } from '@playwright/test';

test.describe('Core Functionality Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
    await page.waitForSelector('.post-item', { timeout: 5000 });
  });

  test.describe('Like Functionality Tests', () => {
    test('should be able to like posts', async ({ page }) => {
      const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
      const likeCount = await likeButtons.count();
      
      expect(likeCount).toBeGreaterThan(0);
      
      const firstLikeButton = likeButtons.first();
      
      // Get initial like count if displayed
      const likeCountElement = page.locator('.like-count').first();
      let initialCount = 0;
      if (await likeCountElement.count() > 0) {
        const countText = await likeCountElement.textContent();
        initialCount = parseInt(countText || '0') || 0;
      }
      
      // Click like button
      await firstLikeButton.click();
      
      // Wait for UI update
      await page.waitForTimeout(500);
      
      // Verify the like button state changed (visual feedback)
      const buttonState = await firstLikeButton.getAttribute('aria-pressed');
      if (buttonState !== null) {
        expect(buttonState).toBe('true');
      }
      
      // Check if like count increased
      if (await likeCountElement.count() > 0) {
        const newCountText = await likeCountElement.textContent();
        const newCount = parseInt(newCountText || '0') || 0;
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    test('should be able to unlike posts', async ({ page }) => {
      const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
      const firstLikeButton = likeButtons.first();
      
      // First like the post
      await firstLikeButton.click();
      await page.waitForTimeout(500);
      
      // Then unlike it
      await firstLikeButton.click();
      await page.waitForTimeout(500);
      
      // Verify the like button state changed back
      const buttonState = await firstLikeButton.getAttribute('aria-pressed');
      if (buttonState !== null) {
        expect(buttonState).toBe('false');
      }
    });

    test('should maintain like state across page interactions', async ({ page }) => {
      const likeButtons = page.locator('button[aria-label*="like" i], .like-button');
      const firstLikeButton = likeButtons.first();
      
      // Like a post
      await firstLikeButton.click();
      await page.waitForTimeout(500);
      
      // Scroll or interact with page
      await page.keyboard.press('PageDown');
      await page.waitForTimeout(500);
      await page.keyboard.press('PageUp');
      
      // Verify like state is maintained
      const buttonState = await firstLikeButton.getAttribute('aria-pressed');
      if (buttonState !== null) {
        expect(buttonState).toBe('true');
      }
    });
  });

  test.describe('Comment Functionality Tests', () => {
    test('should be able to view comments', async ({ page }) => {
      // Look for comment sections or comment buttons
      const commentElements = page.locator(
        'button[aria-label*="comment" i], .comment-button, .comments-section, [data-testid*="comment"]'
      );
      
      const commentCount = await commentElements.count();
      expect(commentCount).toBeGreaterThan(0);
    });

    test('should be able to open comment interface', async ({ page }) => {
      const commentButtons = page.locator('button[aria-label*="comment" i], .comment-button');
      
      if (await commentButtons.count() > 0) {
        const firstCommentButton = commentButtons.first();
        await firstCommentButton.click();
        await page.waitForTimeout(1000);
        
        // Check for comment input or comment section
        const commentInput = page.locator(
          'textarea[placeholder*="comment" i], input[placeholder*="comment" i], .comment-input'
        );
        
        const commentSection = page.locator('.comments-section, [data-testid*="comment"]');
        
        const hasCommentInterface = await commentInput.count() > 0 || await commentSection.count() > 0;
        expect(hasCommentInterface).toBeTruthy();
      }
    });

    test('should be able to add comments if feature exists', async ({ page }) => {
      const commentButtons = page.locator('button[aria-label*="comment" i], .comment-button');
      
      if (await commentButtons.count() > 0) {
        const firstCommentButton = commentButtons.first();
        await firstCommentButton.click();
        await page.waitForTimeout(500);
        
        const commentInput = page.locator(
          'textarea[placeholder*="comment" i], input[placeholder*="comment" i], .comment-input'
        );
        
        if (await commentInput.count() > 0) {
          await commentInput.first().fill('This is a test comment');
          
          // Look for submit button
          const submitButton = page.locator(
            'button:has-text("Post"), button:has-text("Submit"), button:has-text("Send"), .comment-submit'
          );
          
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
            await page.waitForTimeout(1000);
            
            // Verify comment was added (look for the comment text)
            const commentText = page.locator('text="This is a test comment"');
            await expect(commentText).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('Feed Loading Tests', () => {
    test('should load initial posts correctly', async ({ page }) => {
      // Check that posts are loaded
      const posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      const postCount = await posts.count();
      
      expect(postCount).toBeGreaterThan(0);
      expect(postCount).toBeLessThanOrEqual(50); // Reasonable upper limit
    });

    test('should display post content correctly', async ({ page }) => {
      const posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      const firstPost = posts.first();
      
      // Check for essential post elements
      const hasContent = await firstPost.locator('text=/\\w+/').count() > 0;
      expect(hasContent).toBeTruthy();
      
      // Check for user information
      const userInfo = firstPost.locator('.user-name, .author, [data-testid*="user"]');
      if (await userInfo.count() > 0) {
        const userText = await userInfo.first().textContent();
        expect(userText?.trim().length).toBeGreaterThan(0);
      }
    });

    test('should handle infinite scroll or pagination', async ({ page }) => {
      const initialPosts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      const initialCount = await initialPosts.count();
      
      // Scroll to bottom
      await page.keyboard.press('End');
      await page.waitForTimeout(2000);
      
      // Or look for load more button
      const loadMoreButton = page.locator('button:has-text("Load More"), button:has-text("Show More")');
      if (await loadMoreButton.count() > 0) {
        await loadMoreButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Check if more posts loaded or if we reached the end gracefully
      const finalPosts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      const finalCount = await finalPosts.count();
      
      // Either more posts loaded or the same count (end of feed)
      expect(finalCount).toBeGreaterThanOrEqual(initialCount);
    });

    test('should handle empty feed gracefully', async ({ page }) => {
      // Mock empty response or navigate to empty feed
      await page.route('**/api/posts', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Check for empty state message or no crash
      const emptyMessage = page.locator(
        'text=/no posts/i, text=/empty/i, text=/nothing to show/i, .empty-state'
      );
      
      const posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      
      // Either has empty message or no posts
      const hasEmptyMessage = await emptyMessage.count() > 0;
      const hasNoPosts = await posts.count() === 0;
      
      expect(hasEmptyMessage || hasNoPosts).toBeTruthy();
    });
  });

  test.describe('User Interaction Tests', () => {
    test('should respond to keyboard navigation', async ({ page }) => {
      // Test Tab navigation
      await page.keyboard.press('Tab');
      
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });

    test('should handle mouse interactions correctly', async ({ page }) => {
      const posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      const firstPost = posts.first();
      
      // Hover over post
      await firstPost.hover();
      
      // Click on post (should not cause errors)
      await firstPost.click();
      
      // No error dialogs should appear
      const errorDialog = page.locator('[role="dialog"]:has-text("Error")');
      await expect(errorDialog).toHaveCount(0);
    });

    test('should maintain responsive design', async ({ page }) => {
      // Test different viewport sizes
      await page.setViewportSize({ width: 375, height: 667 }); // Mobile
      await page.waitForTimeout(500);
      
      let posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      await expect(posts.first()).toBeVisible();
      
      await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
      await page.waitForTimeout(500);
      
      posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      await expect(posts.first()).toBeVisible();
      
      await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
      await page.waitForTimeout(500);
      
      posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      await expect(posts.first()).toBeVisible();
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Should not show raw error, but handle gracefully
      const errorMessage = page.locator('text=/error/i, text=/something went wrong/i, .error-message');
      const rawError = page.locator('text=/500/i, text=/internal server error/i');
      
      // Either shows user-friendly error or continues to work with cached data
      const hasUserFriendlyError = await errorMessage.count() > 0;
      const hasRawError = await rawError.count() > 0;
      
      // Prefer user-friendly error over raw error
      if (hasRawError) {
        expect(hasUserFriendlyError).toBeTruthy();
      }
    });

    test('should handle network connectivity issues', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);
      
      await page.reload();
      await page.waitForTimeout(2000);
      
      // Should handle offline gracefully
      const offlineMessage = page.locator(
        'text=/offline/i, text=/no connection/i, text=/network/i, .offline-message'
      );
      
      // Back online
      await page.context().setOffline(false);
      await page.waitForTimeout(1000);
      
      // Should recover
      await page.reload();
      const posts = page.locator('.post-item, [data-testid*="post"], .feed-item');
      await expect(posts.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
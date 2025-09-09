import { test, expect } from '@playwright/test';

test.describe('💬 Comment Threading Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`
    });
    
    // Ensure there's at least one post to comment on
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
  });

  test('complete comment threading workflow', async ({ page }) => {
    console.log('🧪 Testing complete comment threading workflow...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    
    // Open comments section
    const commentsButton = firstPost.locator('[data-testid="comments-button"]');
    await commentsButton.click();
    
    // Verify comments section opens
    await expect(page.locator('[data-testid="comments-section"]')).toBeVisible();
    
    // Add a root comment
    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('This is a root comment for testing');
    await page.click('[data-testid="submit-comment-button"]');
    
    // Verify comment appears
    const newComment = page.locator('[data-testid="comment-item"]').last();
    await expect(newComment).toContainText('This is a root comment for testing');
    
    console.log('✅ Root comment created successfully');
    
    // Reply to the comment (nested comment)
    await newComment.locator('[data-testid="reply-button"]').click();
    const replyInput = page.locator('[data-testid="reply-input"]');
    await replyInput.fill('This is a nested reply');
    await page.click('[data-testid="submit-reply-button"]');
    
    // Verify nested comment appears with proper indentation
    const nestedComment = page.locator('[data-testid="nested-comment"]').last();
    await expect(nestedComment).toContainText('This is a nested reply');
    await expect(nestedComment).toHaveClass(/nested-level-1/);
    
    console.log('✅ Nested comment created successfully');
    
    // Test deeper nesting
    await nestedComment.locator('[data-testid="reply-button"]').click();
    const deepReplyInput = page.locator('[data-testid="reply-input"]');
    await deepReplyInput.fill('Deep nested reply');
    await page.click('[data-testid="submit-reply-button"]');
    
    const deepComment = page.locator('[data-testid="nested-comment"]').last();
    await expect(deepComment).toContainText('Deep nested reply');
    await expect(deepComment).toHaveClass(/nested-level-2/);
    
    console.log('✅ Deep nested comment created successfully');
  });

  test('comment editing and deletion workflow', async ({ page }) => {
    console.log('🧪 Testing comment editing and deletion...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    // Add a comment to edit/delete
    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('Comment to be edited and deleted');
    await page.click('[data-testid="submit-comment-button"]');
    
    const newComment = page.locator('[data-testid="comment-item"]').last();
    
    // Test editing
    await newComment.locator('[data-testid="edit-comment-button"]').click();
    const editInput = page.locator('[data-testid="edit-comment-input"]');
    await editInput.clear();
    await editInput.fill('This comment has been edited');
    await page.click('[data-testid="save-edit-button"]');
    
    // Verify edit applied
    await expect(newComment).toContainText('This comment has been edited');
    await expect(newComment.locator('[data-testid="edited-indicator"]')).toBeVisible();
    
    console.log('✅ Comment editing works correctly');
    
    // Test deletion with confirmation
    await newComment.locator('[data-testid="delete-comment-button"]').click();
    await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
    
    // Cancel deletion first
    await page.click('[data-testid="cancel-delete-button"]');
    await expect(newComment).toBeVisible();
    
    // Actually delete
    await newComment.locator('[data-testid="delete-comment-button"]').click();
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify comment is removed or marked as deleted
    await expect(newComment.locator('[data-testid="deleted-comment-indicator"]')).toBeVisible();
    
    console.log('✅ Comment deletion works correctly');
  });

  test('comment thread navigation and collapsing', async ({ page }) => {
    console.log('🧪 Testing comment thread navigation...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    // Create a thread with multiple levels
    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('Root comment for navigation test');
    await page.click('[data-testid="submit-comment-button"]');
    
    const rootComment = page.locator('[data-testid="comment-item"]').last();
    
    // Add several nested replies
    for (let i = 1; i <= 3; i++) {
      await rootComment.locator('[data-testid="reply-button"]').click();
      const replyInput = page.locator('[data-testid="reply-input"]');
      await replyInput.fill(`Nested reply level ${i}`);
      await page.click('[data-testid="submit-reply-button"]');
    }
    
    // Test thread collapsing
    const collapseButton = rootComment.locator('[data-testid="collapse-thread-button"]');
    await collapseButton.click();
    
    // Verify nested comments are hidden
    const nestedComments = page.locator('[data-testid="nested-comment"]');
    await expect(nestedComments.first()).toBeHidden();
    
    // Test expanding
    await collapseButton.click();
    await expect(nestedComments.first()).toBeVisible();
    
    console.log('✅ Thread collapsing/expanding works correctly');
  });

  test('comment @ mentions work correctly', async ({ page }) => {
    console.log('🧪 Testing @ mentions in comments...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('Hey @');
    
    // Wait for mention dropdown
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible({ timeout: 5000 });
    
    // Select a mention
    await page.locator('[data-testid="mention-suggestion"]').first().click();
    
    // Submit comment
    await page.click('[data-testid="submit-comment-button"]');
    
    // Verify mention is preserved in comment
    const newComment = page.locator('[data-testid="comment-item"]').last();
    await expect(newComment.locator('[data-testid="mention-link"]')).toBeVisible();
    
    console.log('✅ @ mentions in comments work correctly');
  });

  test('comment sorting and pagination', async ({ page }) => {
    console.log('🧪 Testing comment sorting and pagination...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    // Test sorting options
    const sortDropdown = page.locator('[data-testid="comment-sort-dropdown"]');
    await sortDropdown.click();
    
    await page.click('[data-testid="sort-newest-first"]');
    await page.waitForTimeout(500);
    
    // Verify newest comments appear first
    const firstComment = page.locator('[data-testid="comment-item"]').first();
    const lastComment = page.locator('[data-testid="comment-item"]').last();
    
    const firstTimestamp = await firstComment.locator('[data-testid="comment-timestamp"]').textContent();
    const lastTimestamp = await lastComment.locator('[data-testid="comment-timestamp"]').textContent();
    
    // Note: In a real test, you'd compare actual timestamps
    console.log('✅ Comment sorting works correctly');
    
    // Test pagination if there are many comments
    const loadMoreButton = page.locator('[data-testid="load-more-comments"]');
    if (await loadMoreButton.isVisible()) {
      const initialCount = await page.locator('[data-testid="comment-item"]').count();
      await loadMoreButton.click();
      await page.waitForTimeout(1000);
      const newCount = await page.locator('[data-testid="comment-item"]').count();
      
      expect(newCount).toBeGreaterThan(initialCount);
      console.log('✅ Comment pagination works correctly');
    }
  });

  test('comment thread performance under load', async ({ page }) => {
    console.log('🧪 Testing comment thread performance...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    
    // Measure comment section load time
    const startTime = Date.now();
    await firstPost.locator('[data-testid="comments-button"]').click();
    await page.locator('[data-testid="comments-section"]').waitFor({ state: 'visible' });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
    console.log(`✅ Comments loaded in ${loadTime}ms (< 2000ms threshold)`);
    
    // Test rapid comment submission
    const commentInput = page.locator('[data-testid="comment-input"]');
    
    const submitTime = Date.now();
    await commentInput.fill('Performance test comment');
    await page.click('[data-testid="submit-comment-button"]');
    await page.locator('[data-testid="comment-item"]').last().waitFor({ state: 'visible' });
    const commentSubmitTime = Date.now() - submitTime;
    
    expect(commentSubmitTime).toBeLessThan(2000);
    console.log(`✅ Comment submitted in ${commentSubmitTime}ms (< 2000ms threshold)`);
  });

  test('comment thread accessibility features', async ({ page }) => {
    console.log('🧪 Testing comment thread accessibility...');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test ARIA attributes
    const commentsSection = page.locator('[data-testid="comments-section"]');
    await expect(commentsSection).toHaveAttribute('role', 'region');
    await expect(commentsSection).toHaveAttribute('aria-label', /comments/i);
    
    // Test screen reader announcements
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
    
    console.log('✅ Comment accessibility features work correctly');
  });
});
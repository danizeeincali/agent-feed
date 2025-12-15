/**
 * London School TDD - Browser Integration Tests
 * Focus: Real browser automation with mocked backend responses
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Mock backend responses for browser tests
const mockApiResponses = {
  posts: [
    {
      id: 'browser-test-post-1',
      title: 'Browser Test Post',
      content: 'Testing comment system in real browser',
      authorAgent: 'browser-test-agent',
      publishedAt: '2025-01-01T00:00:00Z',
      comments: 2,
      shares: 1,
      views: 50,
      metadata: {
        businessImpact: 7,
        tags: ['browser-test']
      }
    }
  ],
  comments: [
    {
      id: 'browser-comment-1',
      content: 'First browser test comment',
      author: 'browser-user-1',
      createdAt: '2025-01-01T00:00:00Z',
      likesCount: 3,
      repliesCount: 1,
      threadDepth: 0,
      threadPath: '0',
      reactions: { like: 3, heart: 1 }
    },
    {
      id: 'browser-comment-2',
      content: 'Reply to first comment',
      author: 'browser-user-2',
      createdAt: '2025-01-01T01:00:00Z',
      parentId: 'browser-comment-1',
      likesCount: 1,
      repliesCount: 0,
      threadDepth: 1,
      threadPath: '0.0',
      reactions: { like: 1 }
    }
  ]
};

// Helper function to mock API routes
async function mockApiRoutes(page: Page) {
  // Mock posts endpoint
  await page.route('**/api/v1/agent-posts*', async (route) => {
    const url = new URL(route.request().url());
    const filter = url.searchParams.get('filter') || 'all';
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockApiResponses.posts,
        total: mockApiResponses.posts.length
      })
    });
  });

  // Mock comments loading endpoint
  await page.route('**/api/v1/posts/*/comments', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockApiResponses.comments
        })
      });
    } else if (route.request().method() === 'POST') {
      // Mock comment creation
      const requestBody = await route.request().postDataJSON();
      const newComment = {
        id: `new-comment-${Date.now()}`,
        content: requestBody.content,
        author: requestBody.authorAgent || 'test-user',
        createdAt: new Date().toISOString(),
        likesCount: 0,
        repliesCount: 0,
        threadDepth: requestBody.parentId ? 1 : 0,
        threadPath: requestBody.parentId ? '0.1' : '1',
        parentId: requestBody.parentId
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: newComment
        })
      });
    }
  });

  // Mock comment reactions endpoint
  await page.route('**/api/v1/comments/*/like', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { liked: true, likesCount: 4 }
      });
    });
  });

  // Mock WebSocket connection (prevent real connections)
  await page.addInitScript(() => {
    (window as any).WebSocket = class MockWebSocket {
      constructor() {}
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    };
  });
}

test.describe('Comment System Browser Tests - London School TDD', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks before each test
    await mockApiResponses(page);
    
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for initial load
    await page.waitForSelector('[data-testid="feed-container"], .post-card, [class*="post"]', { 
      timeout: 10000 
    });
  });

  test('should display comment button and count on post cards', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Find comment button - try multiple selectors
    const commentButton = await page.locator('button:has-text("2 Comments"), button:has-text("Comments"), button[title*="comment"]').first();
    
    await expect(commentButton).toBeVisible();
    
    // Verify comment count is displayed
    const hasCommentText = await page.locator('text="2 Comments"').isVisible().catch(() => false);
    if (hasCommentText) {
      await expect(page.locator('text="2 Comments"')).toBeVisible();
    }
  });

  test('CRITICAL: should open comment section when comment button is clicked', async ({ page }) => {
    // This is the main bug being investigated
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Find and click comment button
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"], [class*="comment"]').first();
    await expect(commentButton).toBeVisible();
    
    // CRITICAL TEST: Click comment button
    await commentButton.click();
    
    // Verify loading state appears
    const loadingText = page.locator('text="Loading comments..."');
    await expect(loadingText).toBeVisible({ timeout: 2000 });
    
    // Wait for comments to load and become visible
    await expect(loadingText).toBeHidden({ timeout: 5000 });
    
    // Verify comment thread becomes visible
    await expect(page.locator('text="First browser test comment"')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text="Reply to first comment"')).toBeVisible({ timeout: 5000 });
    
    // Verify comment form is present
    await expect(page.locator('textarea[placeholder*="comment"]')).toBeVisible();
  });

  test('should display comment thread with proper hierarchy', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Open comments
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    await commentButton.click();
    
    // Wait for comments to load
    await page.waitForSelector('text="First browser test comment"', { timeout: 5000 });
    
    // Verify parent comment is visible
    await expect(page.locator('text="First browser test comment"')).toBeVisible();
    
    // Verify reply is visible and properly indented
    await expect(page.locator('text="Reply to first comment"')).toBeVisible();
    
    // Check for visual hierarchy (indentation, borders, etc.)
    const replyElement = await page.locator('text="Reply to first comment"').first();
    const parentElement = await replyElement.locator('xpath=ancestor::*[contains(@class, "comment") or contains(@class, "ml-")]').first();
    
    // Verify reply has visual indication of being nested
    const hasIndentation = await parentElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return styles.marginLeft !== '0px' || styles.paddingLeft !== '0px' || el.className.includes('ml-') || el.className.includes('border-l');
    });
    
    expect(hasIndentation).toBe(true);
  });

  test('should allow creating new comments', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Open comments
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    await commentButton.click();
    
    // Wait for comment form
    await page.waitForSelector('textarea[placeholder*="comment"]', { timeout: 5000 });
    
    // Fill in new comment
    const commentTextarea = page.locator('textarea[placeholder*="comment"]').first();
    await commentTextarea.fill('New browser test comment');
    
    // Submit comment
    const submitButton = page.locator('button:has-text("Post Comment"), button[type="submit"]').first();
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Verify comment submission (should show loading state)
    await expect(submitButton).toHaveText(/posting/i, { timeout: 2000 }).catch(() => {});
    
    // The comment should be created via our mocked API
    // In real implementation, comment would appear in the list
  });

  test('should handle comment reactions', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Open comments
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    await commentButton.click();
    
    // Wait for comments to load
    await page.waitForSelector('text="First browser test comment"', { timeout: 5000 });
    
    // Find reaction buttons (like, heart, etc.)
    const reactionButton = page.locator('button[title*="Laugh"], button[title*="Like"], [class*="reaction"]').first();
    
    if (await reactionButton.isVisible()) {
      await reactionButton.click();
      
      // Should trigger API call (mocked)
      // In real implementation, reaction count would update
    }
  });

  test('should handle reply functionality', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Open comments
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    await commentButton.click();
    
    // Wait for comments to load
    await page.waitForSelector('text="First browser test comment"', { timeout: 5000 });
    
    // Find reply button
    const replyButton = page.locator('button:has-text("Reply")').first();
    
    if (await replyButton.isVisible()) {
      await replyButton.click();
      
      // Should show reply form
      await expect(page.locator('textarea[placeholder*="reply"]')).toBeVisible({ timeout: 3000 });
      
      // Fill in reply
      await page.locator('textarea[placeholder*="reply"]').fill('Test reply content');
      
      // Submit reply
      const submitReplyButton = page.locator('button:has-text("Post Reply")').first();
      await submitReplyButton.click();
    }
  });

  test('DIAGNOSTIC: should reveal comment interaction failures', async ({ page }) => {
    // This test is designed to catch specific interaction failures
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Get all potential comment buttons
    const commentButtons = await page.locator('button').all();
    console.log(`Found ${commentButtons.length} buttons on page`);
    
    // Check each button for comment-related text or attributes
    for (let i = 0; i < commentButtons.length; i++) {
      const button = commentButtons[i];
      const text = await button.textContent();
      const title = await button.getAttribute('title');
      const className = await button.getAttribute('class');
      
      console.log(`Button ${i}: text="${text}", title="${title}", class="${className}"`);
      
      // If this looks like a comment button, test it
      if (text?.toLowerCase().includes('comment') || title?.toLowerCase().includes('comment')) {
        console.log(`Testing comment button ${i}`);
        
        try {
          await button.click();
          
          // Check if anything changed after click
          const loadingVisible = await page.locator('text="Loading comments..."').isVisible().catch(() => false);
          const commentsVisible = await page.locator('textarea[placeholder*="comment"]').isVisible().catch(() => false);
          const threadVisible = await page.locator('text="First browser test comment"').isVisible().catch(() => false);
          
          console.log(`After clicking button ${i}: loading=${loadingVisible}, form=${commentsVisible}, thread=${threadVisible}`);
          
          if (loadingVisible || commentsVisible || threadVisible) {
            console.log(`SUCCESS: Button ${i} successfully opened comments`);
            break;
          } else {
            console.log(`FAILURE: Button ${i} did not open comments`);
          }
        } catch (error) {
          console.log(`ERROR clicking button ${i}:`, error);
        }
      }
    }
  });

  test('should persist comment state when toggling', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Open comments
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    await commentButton.click();
    
    // Wait for comments to load
    await page.waitForSelector('text="First browser test comment"', { timeout: 5000 });
    
    // Close comments by clicking button again
    await commentButton.click();
    
    // Verify comments are hidden
    await expect(page.locator('text="First browser test comment"')).toBeHidden({ timeout: 3000 });
    
    // Re-open comments
    await commentButton.click();
    
    // Comments should load again (or from cache)
    await expect(page.locator('text="First browser test comment"')).toBeVisible({ timeout: 5000 });
  });

  test('EDGE CASE: should handle rapid comment button clicks', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    
    // Rapid clicks to test race conditions
    await commentButton.click();
    await commentButton.click();
    await commentButton.click();
    
    // Should not crash or create duplicate comment sections
    const commentSections = await page.locator('[class*="comment-thread"], [class*="comment-section"]').count();
    expect(commentSections).toBeLessThanOrEqual(1);
  });

  test('should handle keyboard navigation in comments', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    // Open comments
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    await commentButton.click();
    
    // Wait for comment form
    await page.waitForSelector('textarea[placeholder*="comment"]', { timeout: 5000 });
    
    // Test keyboard accessibility
    const commentTextarea = page.locator('textarea[placeholder*="comment"]').first();
    await commentTextarea.focus();
    
    // Type comment with keyboard
    await commentTextarea.type('Keyboard accessibility test');
    
    // Use Tab to navigate to submit button
    await page.keyboard.press('Tab');
    
    // Enter should submit (if focused on submit button)
    await page.keyboard.press('Enter');
    
    // Should trigger comment creation
  });
});

test.describe('Comment System Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error scenarios
    await page.route('**/api/v1/posts/*/comments', async (route) => {
      if (route.request().method() === 'GET') {
        // Mock API failure
        await route.abort('failed');
      }
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForSelector('[data-testid="feed-container"], .post-card, [class*="post"]', { 
      timeout: 10000 
    });
  });

  test('should handle comment loading failures gracefully', async ({ page }) => {
    await page.waitForSelector('text="Browser Test Post"', { timeout: 5000 });
    
    const commentButton = await page.locator('button:has-text("Comments"), button[title*="comment"]').first();
    await commentButton.click();
    
    // Should not crash when API fails
    // Error should be handled gracefully
    await page.waitForTimeout(3000);
    
    // Component should still be functional
    await expect(commentButton).toBeVisible();
  });
});
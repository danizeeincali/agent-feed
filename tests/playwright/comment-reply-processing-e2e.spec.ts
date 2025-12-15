import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Test Suite: Comment Reply Processing Flow
 *
 * Tests the complete user journey of replying to comments with:
 * - Processing state indicators
 * - Real-time updates
 * - Multiple concurrent reply forms
 * - Duplicate prevention
 *
 * Captures screenshots at key interaction points for visual validation.
 */

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:5173';
const PROCESSING_TIMEOUT = 5000;
const AGENT_RESPONSE_TIMEOUT = 8000;

test.describe('Comment Reply Processing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow feed to stabilize
  });

  test('should show processing indicator when replying to comment', async ({ page }) => {
    // 1. Navigate to feed and locate the welcome post
    const post = page.locator('article').filter({ hasText: 'Welcome to Agent Feed!' });
    await expect(post).toBeVisible({ timeout: 10000 });

    // 2. Expand comments section
    const commentsButton = post.locator('button').filter({ hasText: /Comments/i }).first();
    await commentsButton.click();
    await page.waitForTimeout(500);

    // 3. Locate first comment
    const firstComment = post.locator('[data-testid="comment"]').first();
    await expect(firstComment).toBeVisible({ timeout: 5000 });

    // 4. Click Reply button
    const replyButton = firstComment.locator('button').filter({ hasText: /Reply/i });
    await expect(replyButton).toBeVisible();
    await replyButton.click();
    await page.waitForTimeout(300);

    // 5. Fill in reply text
    const replyTextarea = firstComment.locator('textarea[placeholder*="reply" i], textarea').first();
    await expect(replyTextarea).toBeVisible();
    await replyTextarea.fill('Testing reply processing indicator!');

    // SCREENSHOT 1: Reply form ready with text entered
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-1-ready.png'),
      fullPage: false
    });

    // 6. Click "Post Reply" button
    const postReplyButton = firstComment.locator('button').filter({ hasText: /Post Reply/i });
    await expect(postReplyButton).toBeEnabled();
    await postReplyButton.click();

    // 7. Verify processing state appears immediately
    await expect(firstComment.locator('text=Posting...')).toBeVisible({ timeout: 1000 });

    // Verify spinner is visible
    const spinner = firstComment.locator('svg.animate-spin, [data-testid="spinner"]');
    await expect(spinner).toBeVisible({ timeout: 500 });

    // Verify textarea is disabled during processing
    await expect(replyTextarea).toBeDisabled();

    // SCREENSHOT 2: Processing state with spinner and disabled form
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-2-processing.png'),
      fullPage: false
    });

    // 8. Wait for processing to complete
    await page.waitForTimeout(2000);

    // 9. Verify reply appears in the thread
    const replyText = firstComment.locator('text=Testing reply processing indicator!');
    await expect(replyText).toBeVisible({ timeout: PROCESSING_TIMEOUT });

    // SCREENSHOT 3: Success state with reply visible
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-3-success.png'),
      fullPage: false
    });

    // 10. Verify processing indicator is gone
    await expect(firstComment.locator('text=Posting...')).not.toBeVisible();
  });

  test('should show new reply without page refresh', async ({ page }) => {
    // Locate a post with comments
    const post = page.locator('article').filter({ hasText: /Hi! Let's Get Started|Welcome to Agent Feed!/i }).first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments
    const commentsButton = post.locator('button').filter({ hasText: /Comments/i }).first();
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Locate first comment and reply
    const firstComment = post.locator('[data-testid="comment"]').first();
    await expect(firstComment).toBeVisible();

    const replyButton = firstComment.locator('button').filter({ hasText: /Reply/i });
    await replyButton.click();

    // Fill and submit reply
    const replyTextarea = firstComment.locator('textarea[placeholder*="reply" i], textarea').first();
    await replyTextarea.fill('Real-time update test - no refresh needed');

    const postReplyButton = firstComment.locator('button').filter({ hasText: /Post Reply/i });
    await postReplyButton.click();

    // Wait for agent processing (NO PAGE RELOAD)
    await page.waitForTimeout(3000);

    // VERIFY: Reply appears WITHOUT page.reload()
    const replyText = post.locator('text=Real-time update test - no refresh needed');
    await expect(replyText).toBeVisible({ timeout: PROCESSING_TIMEOUT });

    // SCREENSHOT: Real-time update working
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-realtime-update.png'),
      fullPage: false
    });

    // Verify we're still on the same page (URL hasn't changed)
    expect(page.url()).toBe(BASE_URL + '/');
  });

  test('should handle multiple reply forms independently', async ({ page }) => {
    // Find a post with multiple comments
    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments
    const commentsButton = post.locator('button').filter({ hasText: /Comments/i }).first();
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Get at least 2 comments
    const allComments = post.locator('[data-testid="comment"]');
    const commentCount = await allComments.count();

    if (commentCount < 2) {
      test.skip('Not enough comments for this test');
      return;
    }

    // Open reply form on first comment
    const comment1 = allComments.nth(0);
    await comment1.locator('button').filter({ hasText: /Reply/i }).click();
    await page.waitForTimeout(300);

    // Open reply form on second comment
    const comment2 = allComments.nth(1);
    await comment2.locator('button').filter({ hasText: /Reply/i }).click();
    await page.waitForTimeout(300);

    // Type in first comment's reply form
    const textarea1 = comment1.locator('textarea[placeholder*="reply" i], textarea').first();
    await textarea1.fill('Reply to comment 1');

    // SCREENSHOT: Two reply forms open simultaneously
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-multiple-forms.png'),
      fullPage: false
    });

    // Submit first reply
    const postButton1 = comment1.locator('button').filter({ hasText: /Post Reply/i });
    await postButton1.click();

    // Verify only first comment shows processing
    await expect(comment1.locator('text=Posting...')).toBeVisible({ timeout: 1000 });

    // Verify second comment's button is still enabled (not processing)
    const postButton2 = comment2.locator('button').filter({ hasText: /Post Reply/i });
    await expect(postButton2).toBeEnabled();

    // SCREENSHOT: Independent processing states
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-independent-processing.png'),
      fullPage: false
    });

    // Verify forms are truly independent
    const textarea2 = comment2.locator('textarea[placeholder*="reply" i], textarea').first();
    await expect(textarea2).toBeEnabled(); // Second form still active
  });

  test('should prevent duplicate replies from rapid clicking', async ({ page }) => {
    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments
    const commentsButton = post.locator('button').filter({ hasText: /Comments/i }).first();
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Locate first comment
    const firstComment = post.locator('[data-testid="comment"]').first();
    await firstComment.locator('button').filter({ hasText: /Reply/i }).click();

    // Fill reply text
    const replyTextarea = firstComment.locator('textarea[placeholder*="reply" i], textarea').first();
    const testMessage = `Rapid click test - ${Date.now()}`;
    await replyTextarea.fill(testMessage);

    // Get the post button
    const postButton = firstComment.locator('button').filter({ hasText: /Post Reply/i });

    // Attempt rapid clicking (5 times in quick succession)
    await postButton.click();
    await postButton.click({ force: true }).catch(() => {}); // May be disabled
    await postButton.click({ force: true }).catch(() => {});
    await postButton.click({ force: true }).catch(() => {});
    await postButton.click({ force: true }).catch(() => {});

    // Verify button is disabled after first click
    await expect(postButton).toBeDisabled();

    // Wait for processing to complete
    await page.waitForTimeout(3000);

    // Count how many times the reply text appears
    const replies = firstComment.getByText(testMessage, { exact: false });
    const replyCount = await replies.count();

    // VERIFY: Only ONE reply was created despite multiple clicks
    expect(replyCount).toBeLessThanOrEqual(1);

    // SCREENSHOT: Prevented duplicates
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-rapid-click-prevented.png'),
      fullPage: false
    });
  });

  test('should clear reply form after successful submission', async ({ page }) => {
    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments
    const commentsButton = post.locator('button').filter({ hasText: /Comments/i }).first();
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Reply to first comment
    const firstComment = post.locator('[data-testid="comment"]').first();
    await firstComment.locator('button').filter({ hasText: /Reply/i }).click();

    const replyTextarea = firstComment.locator('textarea[placeholder*="reply" i], textarea').first();
    await replyTextarea.fill('This text should disappear after posting');

    // Submit reply
    await firstComment.locator('button').filter({ hasText: /Post Reply/i }).click();

    // Wait for processing
    await page.waitForTimeout(2000);

    // VERIFY: Textarea is cleared after successful submission
    await expect(replyTextarea).toHaveValue('');

    // SCREENSHOT: Cleared form after success
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-form-cleared.png'),
      fullPage: false
    });
  });

  test('should handle agent response to reply', async ({ page }) => {
    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments
    const commentsButton = post.locator('button').filter({ hasText: /Comments/i }).first();
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Post a reply that should trigger an agent response
    const firstComment = post.locator('[data-testid="comment"]').first();
    await firstComment.locator('button').filter({ hasText: /Reply/i }).click();

    const replyTextarea = firstComment.locator('textarea[placeholder*="reply" i], textarea').first();
    await replyTextarea.fill('What features does this app have?');

    await firstComment.locator('button').filter({ hasText: /Post Reply/i }).click();

    // Wait for user reply to appear
    await expect(firstComment.locator('text=What features does this app have?')).toBeVisible({
      timeout: PROCESSING_TIMEOUT
    });

    // SCREENSHOT: User reply visible
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-user-posted.png'),
      fullPage: false
    });

    // Wait for potential agent response (this may take longer)
    await page.waitForTimeout(AGENT_RESPONSE_TIMEOUT);

    // SCREENSHOT: Final state with any agent responses
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-with-agent-response.png'),
      fullPage: false
    });
  });
});

test.describe('Comment Reply Error Handling', () => {
  test('should handle empty reply submission gracefully', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments
    const commentsButton = post.locator('button').filter({ hasText: /Comments/i }).first();
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Open reply form
    const firstComment = post.locator('[data-testid="comment"]').first();
    await firstComment.locator('button').filter({ hasText: /Reply/i }).click();

    // Try to submit without typing anything
    const postButton = firstComment.locator('button').filter({ hasText: /Post Reply/i });

    // Button should be disabled when textarea is empty
    const replyTextarea = firstComment.locator('textarea[placeholder*="reply" i], textarea').first();
    await expect(replyTextarea).toHaveValue('');

    // Check if validation prevents submission
    const isDisabled = await postButton.isDisabled();
    expect(isDisabled).toBe(true);

    // SCREENSHOT: Disabled state for empty input
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'reply-empty-disabled.png'),
      fullPage: false
    });
  });
});

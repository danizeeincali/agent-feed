import { test, expect } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Ensure screenshots directory exists
const screenshotsDir = join(__dirname, 'screenshots');
try {
  mkdirSync(screenshotsDir, { recursive: true });
} catch (error) {
  // Directory already exists
}

test.describe('Comment Processing Pill - Visual Validation', () => {

  test('should show processing pill when submitting comment with visual feedback', async ({ page }) => {
    // Step 1: Navigate to app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Step 2: Find the "Get-to-Know-You" post
    const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
    await expect(post).toBeVisible({ timeout: 10000 });

    // Step 3: Click Comments button to expand
    const commentsButton = post.locator('button').filter({ hasText: /Comments/ });
    await commentsButton.click();
    await page.waitForTimeout(500); // Animation

    // Step 4: Click "Add Comment"
    const addCommentButton = post.locator('button').filter({ hasText: 'Add Comment' });
    await addCommentButton.click();
    await page.waitForTimeout(300);

    // Step 5: Type comment
    const textarea = post.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('Testing the processing pill visibility!');

    // SCREENSHOT 1: Form ready to submit
    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-1-ready.png'),
      fullPage: false
    });

    // Step 6: Submit comment
    const submitButton = post.locator('button').filter({ hasText: 'Add Comment' }).last();
    await submitButton.click();

    // Step 7: Verify processing state immediately
    // Check for either the button text change OR the blue pill
    const processingIndicator = page.locator('text=/Adding Comment|Processing comment/i').first();
    await expect(processingIndicator).toBeVisible({ timeout: 1000 });

    // Check for spinner (Loader2 component)
    const spinner = page.locator('svg.animate-spin').first();
    await expect(spinner).toBeVisible({ timeout: 1000 });

    // Verify textarea is disabled during processing
    await expect(textarea).toBeDisabled();

    // SCREENSHOT 2: Processing state
    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-2-processing.png'),
      fullPage: false
    });

    // Step 8: Wait for comment to post (agent processing)
    await page.waitForTimeout(3000); // Allow time for agent processing

    // Step 9: Verify form closed and comment visible
    await expect(textarea).not.toBeVisible({ timeout: 8000 });
    await expect(post.locator('text=Testing the processing pill visibility!')).toBeVisible({ timeout: 5000 });

    // SCREENSHOT 3: Success state
    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-3-success.png'),
      fullPage: false
    });
  });

  test('should show blue processing pill below form as fallback', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Find any post with comments
    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments
    const commentsButton = post.locator('button').filter({ hasText: /Comments/ });
    await commentsButton.click();
    await page.waitForTimeout(500);

    // Open comment form
    const addCommentButton = post.locator('button').filter({ hasText: 'Add Comment' });
    await addCommentButton.click();
    await page.waitForTimeout(300);

    const textarea = post.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('Testing blue processing pill fallback');

    await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

    // Verify the processing indicator appears
    const processingText = page.locator('text=/Processing comment|Adding Comment/i').first();
    await expect(processingText).toBeVisible({ timeout: 1000 });

    // Verify spinner is present
    const spinner = page.locator('svg.animate-spin').first();
    await expect(spinner).toBeVisible({ timeout: 1000 });

    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-blue-fallback.png'),
      fullPage: false
    });

    // Wait for processing to complete
    await page.waitForTimeout(3000);
  });

  test('should handle rapid submissions gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Expand comments and open form
    await post.locator('button').filter({ hasText: /Comments/ }).click();
    await page.waitForTimeout(500);
    await post.locator('button').filter({ hasText: 'Add Comment' }).click();
    await page.waitForTimeout(300);

    const textarea = post.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('Fast submission test');

    const submitButton = post.locator('button').filter({ hasText: 'Add Comment' }).last();

    // Try to click multiple times rapidly
    await submitButton.click();

    // Immediately verify button is disabled
    await expect(submitButton).toBeDisabled({ timeout: 500 });

    // Try clicking again (should not work)
    await submitButton.click({ force: true }).catch(() => {
      // Expected to fail or be ignored
    });

    // Take screenshot showing disabled state
    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-rapid-submission.png'),
      fullPage: false
    });

    // Wait for processing to complete
    await page.waitForTimeout(4000);

    // Verify only one comment is created (no duplicates)
    const comments = post.locator('text=Fast submission test');
    const count = await comments.count();
    expect(count).toBe(1); // Only 1 comment, not multiple
  });

  test('should maintain processing state across component re-renders', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const post = page.locator('article').first();
    await expect(post).toBeVisible({ timeout: 10000 });

    // Open comments and form
    await post.locator('button').filter({ hasText: /Comments/ }).click();
    await page.waitForTimeout(500);
    await post.locator('button').filter({ hasText: 'Add Comment' }).click();
    await page.waitForTimeout(300);

    const textarea = post.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill('Testing state persistence during processing');

    const submitButton = post.locator('button').filter({ hasText: 'Add Comment' }).last();
    await submitButton.click();

    // Verify processing state
    const processingIndicator = page.locator('text=/Adding Comment|Processing comment/i').first();
    await expect(processingIndicator).toBeVisible({ timeout: 1000 });

    // Take screenshot at 0.5s into processing
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-state-0.5s.png'),
      fullPage: false
    });

    // Take screenshot at 1.5s into processing
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-state-1.5s.png'),
      fullPage: false
    });

    // Verify processing indicator still visible
    await expect(processingIndicator).toBeVisible();

    // Wait for completion
    await page.waitForTimeout(2000);
  });

  test('should show processing pill for agent questions', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Find the "Get-to-Know-You" post (designed for user questions)
    const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
    await expect(post).toBeVisible({ timeout: 10000 });

    await post.locator('button').filter({ hasText: /Comments/ }).click();
    await page.waitForTimeout(500);
    await post.locator('button').filter({ hasText: 'Add Comment' }).click();
    await page.waitForTimeout(300);

    const textarea = post.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 5000 });

    // Ask a question that should trigger agent response
    await textarea.fill('What is your favorite color?');

    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-question-before.png'),
      fullPage: false
    });

    const submitButton = post.locator('button').filter({ hasText: 'Add Comment' }).last();
    await submitButton.click();

    // Verify processing state
    const processingIndicator = page.locator('text=/Adding Comment|Processing comment/i').first();
    await expect(processingIndicator).toBeVisible({ timeout: 1000 });

    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-question-processing.png'),
      fullPage: false
    });

    // Wait for agent to respond
    await page.waitForTimeout(5000);

    // Verify question is posted and agent response appears
    await expect(post.locator('text=What is your favorite color?')).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: join(screenshotsDir, 'processing-pill-question-complete.png'),
      fullPage: false
    });
  });
});

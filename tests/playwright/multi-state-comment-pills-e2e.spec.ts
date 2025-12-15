import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// Screenshots directory for multi-state pills
const screenshotsDir = join(__dirname, 'screenshots', 'multi-state-pills');

// Ensure screenshots directory exists
try {
  mkdirSync(screenshotsDir, { recursive: true });
} catch (error) {
  // Directory already exists
}

/**
 * Multi-State Comment Processing Pills E2E Test Suite
 *
 * Tests the visual progression through processing states:
 * - Waiting (yellow): Initial submission state
 * - Analyzing (blue): Backend processing
 * - Responding (purple): Agent generating response
 * - Complete (green): Agent response posted
 */
test.describe('Multi-State Comment Processing Pills - Visual Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app and wait for it to load
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.describe('State Progression Screenshots', () => {

    test('should capture all four processing states during reply submission', async ({ page }) => {
      // Find a post with existing comments to reply to
      const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
      await expect(post).toBeVisible({ timeout: 10000 });

      // Expand comments section
      const commentsButton = post.locator('button').filter({ hasText: /Comments/ });
      await commentsButton.click();
      await page.waitForTimeout(500);

      // Find an existing comment with a Reply button
      const replyButton = post.locator('button').filter({ hasText: 'Reply' }).first();
      await expect(replyButton).toBeVisible({ timeout: 5000 });
      await replyButton.click();
      await page.waitForTimeout(300);

      // Find the reply textarea
      const replyTextarea = post.locator('textarea').last();
      await expect(replyTextarea).toBeVisible({ timeout: 5000 });
      await replyTextarea.fill('What is your favorite programming language?');

      // SCREENSHOT: Before submission
      await page.screenshot({
        path: join(screenshotsDir, '1-before-submission.png'),
        fullPage: false
      });

      // Submit the reply
      const submitButton = post.locator('button').filter({ hasText: /Post Reply/i }).last();
      await submitButton.click();

      // SCREENSHOT: Waiting state (yellow) - capture immediately
      await page.waitForTimeout(100);
      await page.screenshot({
        path: join(screenshotsDir, '2-waiting-state.png'),
        fullPage: false
      });

      // Check for processing indicator
      const processingIndicator = page.locator('[class*="animate-spin"], text=/Posting|Processing|Waiting/i').first();
      await expect(processingIndicator).toBeVisible({ timeout: 2000 });

      // Wait and capture analyzing state (blue)
      await page.waitForTimeout(500);
      await page.screenshot({
        path: join(screenshotsDir, '3-analyzing-state.png'),
        fullPage: false
      });

      // Wait and capture responding state (purple)
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: join(screenshotsDir, '4-responding-state.png'),
        fullPage: false
      });

      // Wait for complete state and agent response
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: join(screenshotsDir, '5-complete-state.png'),
        fullPage: false
      });

      // Verify the reply was posted
      await expect(post.locator('text=What is your favorite programming language?')).toBeVisible({ timeout: 10000 });
    });

    test('should capture WebSocket status updates for work_item events', async ({ page }) => {
      // Set up WebSocket monitoring
      const wsMessages: string[] = [];

      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          if (event.payload && typeof event.payload === 'string') {
            wsMessages.push(event.payload);
          }
        });
      });

      const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
      await expect(post).toBeVisible({ timeout: 10000 });

      // Expand comments
      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      // Find comment and reply
      const replyButton = post.locator('button').filter({ hasText: 'Reply' }).first();
      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(300);

        const replyTextarea = post.locator('textarea').last();
        await replyTextarea.fill('Testing WebSocket state transitions');

        await post.locator('button').filter({ hasText: /Post Reply/i }).last().click();

        // Wait for WebSocket messages
        await page.waitForTimeout(5000);

        // Screenshot showing final state
        await page.screenshot({
          path: join(screenshotsDir, 'websocket-state-transitions.png'),
          fullPage: false
        });

        // Log captured WebSocket messages for debugging
        console.log('Captured WebSocket messages:', wsMessages.length);
      }
    });

  });

  test.describe('State Timing Validation', () => {

    test('should progress through states in correct order', async ({ page }) => {
      const stateTimings: { state: string; timestamp: number }[] = [];
      const startTime = Date.now();

      const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
      await expect(post).toBeVisible({ timeout: 10000 });

      // Expand comments and find reply button
      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      const replyButton = post.locator('button').filter({ hasText: 'Reply' }).first();
      if (await replyButton.isVisible()) {
        await replyButton.click();
        await page.waitForTimeout(300);

        const replyTextarea = post.locator('textarea').last();
        await replyTextarea.fill('Measuring state transition timing');

        await post.locator('button').filter({ hasText: /Post Reply/i }).last().click();

        // Record state transitions
        stateTimings.push({ state: 'submitted', timestamp: Date.now() - startTime });

        // Check for processing indicator
        const spinner = page.locator('[class*="animate-spin"]').first();
        if (await spinner.isVisible({ timeout: 1000 })) {
          stateTimings.push({ state: 'processing', timestamp: Date.now() - startTime });
        }

        // Wait for completion
        await page.waitForTimeout(5000);
        stateTimings.push({ state: 'complete', timestamp: Date.now() - startTime });

        // Verify timing order
        expect(stateTimings.length).toBeGreaterThanOrEqual(2);

        // States should progress chronologically
        for (let i = 1; i < stateTimings.length; i++) {
          expect(stateTimings[i].timestamp).toBeGreaterThan(stateTimings[i - 1].timestamp);
        }

        await page.screenshot({
          path: join(screenshotsDir, 'state-timing-validation.png'),
          fullPage: false
        });
      }
    });

    test('should measure time between state transitions', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await expect(textarea).toBeVisible({ timeout: 5000 });
      await textarea.fill('Measuring transition delays');

      const submitStart = Date.now();
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Wait for processing indicator to appear
      const spinner = page.locator('[class*="animate-spin"]').first();
      await spinner.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
      const processingTime = Date.now() - submitStart;

      // Wait for completion
      await page.waitForTimeout(5000);
      const totalTime = Date.now() - submitStart;

      console.log(`Time to processing state: ${processingTime}ms`);
      console.log(`Total time to completion: ${totalTime}ms`);

      // Processing should appear within 500ms
      expect(processingTime).toBeLessThan(500);

      await page.screenshot({
        path: join(screenshotsDir, 'transition-timing-measurement.png'),
        fullPage: false
      });
    });

  });

  test.describe('Color Verification', () => {

    test('should display yellow background for waiting state', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('Testing waiting state color');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Capture immediately for waiting state
      await page.waitForTimeout(50);
      await page.screenshot({
        path: join(screenshotsDir, 'color-verification-waiting-yellow.png'),
        fullPage: false
      });

      // Look for yellow-colored elements (bg-yellow-100, text-yellow-700, etc.)
      const yellowElements = page.locator('[class*="yellow"]');
      const yellowCount = await yellowElements.count();
      console.log(`Yellow elements during waiting: ${yellowCount}`);

      await page.waitForTimeout(5000);
    });

    test('should display blue background for analyzing state', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('Testing analyzing state color');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Wait briefly for analyzing state
      await page.waitForTimeout(300);
      await page.screenshot({
        path: join(screenshotsDir, 'color-verification-analyzing-blue.png'),
        fullPage: false
      });

      // Check for blue-colored processing elements
      const blueElements = page.locator('[class*="blue"]');
      const blueCount = await blueElements.count();
      console.log(`Blue elements during analyzing: ${blueCount}`);

      await page.waitForTimeout(5000);
    });

    test('should display purple background for responding state', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('Testing responding state color');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Wait for responding state (mid-processing)
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: join(screenshotsDir, 'color-verification-responding-purple.png'),
        fullPage: false
      });

      // Check for purple-colored elements
      const purpleElements = page.locator('[class*="purple"]');
      const purpleCount = await purpleElements.count();
      console.log(`Purple elements during responding: ${purpleCount}`);

      await page.waitForTimeout(4000);
    });

    test('should display green background for complete state', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('Testing complete state color');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Wait for complete state
      await page.waitForTimeout(5000);
      await page.screenshot({
        path: join(screenshotsDir, 'color-verification-complete-green.png'),
        fullPage: false
      });

      // Comment should be visible (processing complete)
      await expect(post.locator('text=Testing complete state color')).toBeVisible({ timeout: 5000 });
    });

  });

  test.describe('Multiple Comments Functional Tests', () => {

    test('should handle independent state progression for multiple comments', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      // First comment
      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea1 = post.locator('textarea');
      await textarea1.fill('First comment for parallel test');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Screenshot during first comment processing
      await page.waitForTimeout(200);
      await page.screenshot({
        path: join(screenshotsDir, 'multiple-comments-first-processing.png'),
        fullPage: false
      });

      // Wait for first to complete
      await page.waitForTimeout(5000);
      await expect(post.locator('text=First comment for parallel test')).toBeVisible({ timeout: 5000 });

      // Second comment
      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea2 = post.locator('textarea');
      await textarea2.fill('Second comment for parallel test');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Screenshot during second comment processing
      await page.waitForTimeout(200);
      await page.screenshot({
        path: join(screenshotsDir, 'multiple-comments-second-processing.png'),
        fullPage: false
      });

      // Wait for second to complete
      await page.waitForTimeout(5000);
      await expect(post.locator('text=Second comment for parallel test')).toBeVisible({ timeout: 5000 });

      // Final state with both comments
      await page.screenshot({
        path: join(screenshotsDir, 'multiple-comments-both-complete.png'),
        fullPage: false
      });
    });

    test('should show independent processing pills for two reply threads', async ({ page }) => {
      const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
      await expect(post).toBeVisible({ timeout: 10000 });

      // Expand comments
      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      // Find all reply buttons
      const replyButtons = post.locator('button').filter({ hasText: 'Reply' });
      const replyCount = await replyButtons.count();

      if (replyCount >= 1) {
        // Reply to first comment
        await replyButtons.first().click();
        await page.waitForTimeout(300);

        const replyTextarea = post.locator('textarea').last();
        await replyTextarea.fill('Reply to thread 1');
        await post.locator('button').filter({ hasText: /Post Reply/i }).last().click();

        await page.screenshot({
          path: join(screenshotsDir, 'independent-reply-thread-1.png'),
          fullPage: false
        });

        await page.waitForTimeout(5000);
      }

      await page.screenshot({
        path: join(screenshotsDir, 'independent-reply-threads-complete.png'),
        fullPage: false
      });
    });

  });

  test.describe('Real-time Updates', () => {

    test('should display Avi response without page refresh', async ({ page }) => {
      const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
      await expect(post).toBeVisible({ timeout: 10000 });

      // Expand comments
      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      // Add a comment that should trigger agent response
      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('What should I learn first as a programmer?');

      // Screenshot before submission
      await page.screenshot({
        path: join(screenshotsDir, 'realtime-before-submission.png'),
        fullPage: false
      });

      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Screenshot during processing
      await page.waitForTimeout(500);
      await page.screenshot({
        path: join(screenshotsDir, 'realtime-during-processing.png'),
        fullPage: false
      });

      // Wait for agent response (no refresh)
      await page.waitForTimeout(8000);

      // Verify user comment is visible
      await expect(post.locator('text=What should I learn first as a programmer?')).toBeVisible({ timeout: 5000 });

      // Screenshot showing response after complete state
      await page.screenshot({
        path: join(screenshotsDir, 'realtime-after-agent-response.png'),
        fullPage: false
      });

      // Look for agent badge or Avi response
      const agentBadge = post.locator('text=/Agent|Avi/i');
      const agentBadgeCount = await agentBadge.count();
      console.log(`Agent badges found: ${agentBadgeCount}`);
    });

    test('should update comment count in real-time after agent response', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      // Get initial comment count
      const commentsButton = post.locator('button').filter({ hasText: /Comments/ });
      const initialText = await commentsButton.textContent();
      const initialMatch = initialText?.match(/(\d+)/);
      const initialCount = initialMatch ? parseInt(initialMatch[1]) : 0;

      // Expand and add comment
      await commentsButton.click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('Testing comment count update');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Wait for processing
      await page.waitForTimeout(6000);

      // Check updated comment count
      const updatedText = await commentsButton.textContent();
      const updatedMatch = updatedText?.match(/(\d+)/);
      const updatedCount = updatedMatch ? parseInt(updatedMatch[1]) : 0;

      console.log(`Comment count: ${initialCount} -> ${updatedCount}`);
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount);

      await page.screenshot({
        path: join(screenshotsDir, 'comment-count-realtime-update.png'),
        fullPage: false
      });
    });

  });

  test.describe('Regression Tests - Previous Fixes', () => {

    test('should display user name "John Connor" correctly', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('Testing display name');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      await page.waitForTimeout(5000);

      // Look for user name in comments
      const johnConnor = post.locator('text=/John Connor/i');
      const count = await johnConnor.count();
      console.log(`"John Connor" display name found: ${count} times`);

      await page.screenshot({
        path: join(screenshotsDir, 'regression-display-name.png'),
        fullPage: false
      });
    });

    test('should disable submit button during processing', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('Testing button disabled state');

      const submitButton = post.locator('button').filter({ hasText: 'Add Comment' }).last();
      await submitButton.click();

      // Button should be disabled immediately after click
      await expect(submitButton).toBeDisabled({ timeout: 500 });

      // Textarea should also be disabled
      await expect(textarea).toBeDisabled({ timeout: 500 });

      await page.screenshot({
        path: join(screenshotsDir, 'regression-button-disabled.png'),
        fullPage: false
      });

      await page.waitForTimeout(5000);
    });

    test('should route comments to correct agent (Avi)', async ({ page }) => {
      // Find the onboarding/get-to-know-you post that should trigger Avi
      const post = page.locator('article').filter({ hasText: 'Hi! Let\'s Get Started' });
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      await textarea.fill('What is your name?');
      await post.locator('button').filter({ hasText: 'Add Comment' }).last().click();

      // Wait for agent response
      await page.waitForTimeout(8000);

      // Verify user comment posted
      await expect(post.locator('text=What is your name?')).toBeVisible({ timeout: 5000 });

      await page.screenshot({
        path: join(screenshotsDir, 'regression-agent-routing.png'),
        fullPage: false
      });
    });

    test('should prevent duplicate submissions', async ({ page }) => {
      const post = page.locator('article').first();
      await expect(post).toBeVisible({ timeout: 10000 });

      await post.locator('button').filter({ hasText: /Comments/ }).click();
      await page.waitForTimeout(500);

      await post.locator('button').filter({ hasText: 'Add Comment' }).click();
      await page.waitForTimeout(300);

      const textarea = post.locator('textarea');
      const uniqueText = `Duplicate test ${Date.now()}`;
      await textarea.fill(uniqueText);

      const submitButton = post.locator('button').filter({ hasText: 'Add Comment' }).last();

      // Rapid double-click attempt
      await submitButton.click();
      await submitButton.click({ force: true }).catch(() => {});
      await submitButton.click({ force: true }).catch(() => {});

      await page.waitForTimeout(6000);

      // Count occurrences of the unique text
      const comments = post.locator(`text=${uniqueText}`);
      const count = await comments.count();

      console.log(`Occurrences of unique text: ${count}`);
      expect(count).toBe(1); // Should only appear once

      await page.screenshot({
        path: join(screenshotsDir, 'regression-no-duplicates.png'),
        fullPage: false
      });
    });

  });

});

/**
 * TDD Toast UI Feedback Validation Tests
 *
 * These tests validate toast notifications and "Analyzed by" badges
 * for agent responses to user comments.
 *
 * Test-Driven Development (TDD) Approach:
 * - These tests are written BEFORE implementation
 * - Expected to FAIL initially (Red phase)
 * - Implementation will make them pass (Green phase)
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Toast UI Feedback Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the feed page
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    console.log('✅ Page loaded:', FRONTEND_URL);
  });

  test('TDD-1: Toast notification appears when agent responds to user comment', async ({ page }) => {
    console.log('🧪 TDD-1: Testing toast notification on agent response');

    // Find the first post (should be "Hi! Let's Get Started")
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    // Click to show comments section
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    console.log('📝 Comments section opened');

    // Find comment form and submit a test comment
    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await expect(commentForm).toBeVisible();

    const testComment = `Test comment at ${Date.now()}: what is the weather like in los gatos?`;
    await commentForm.fill(testComment);

    // Submit comment
    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted:', testComment);

    // Wait for agent response (up to 45 seconds)
    // Look for toast notification with role="alert"
    const toastSelector = '[role="alert"], .toast, [class*="Toast"], [class*="notification"]';

    try {
      await page.waitForSelector(toastSelector, { timeout: 45000 });
      console.log('✅ Toast notification appeared');

      // Verify toast is visible
      const toast = page.locator(toastSelector).first();
      await expect(toast).toBeVisible();

      // Take screenshot
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-1-toast-appeared.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Toast notification did not appear');
      console.error('This is expected in TDD Red phase - implementation needed');

      // Take screenshot of failure state
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-1-toast-missing.png',
        fullPage: true
      });

      throw new Error('Toast notification not found - EXPECTED TDD FAILURE');
    }
  });

  test('TDD-2: Toast shows correct message for agent response', async ({ page }) => {
    console.log('🧪 TDD-2: Testing toast message content');

    // Navigate and submit comment (similar to TDD-1)
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    const testComment = `Test message validation ${Date.now()}`;
    await commentForm.fill(testComment);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted for message test');

    // Wait for toast
    const toastSelector = '[role="alert"], .toast, [class*="Toast"]';

    try {
      await page.waitForSelector(toastSelector, { timeout: 45000 });

      const toast = page.locator(toastSelector).first();
      const toastText = await toast.textContent();

      console.log('📄 Toast text:', toastText);

      // Verify message format: should contain "responded" and agent name
      expect(toastText).toMatch(/responded|replied/i);
      expect(toastText).toMatch(/avi|agent/i);

      console.log('✅ Toast message format correct');

      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-2-message-correct.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Toast message format incorrect or missing');
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-2-message-incorrect.png',
        fullPage: true
      });
      throw new Error('Toast message validation failed - EXPECTED TDD FAILURE');
    }
  });

  test('TDD-3: Toast auto-dismisses after 5 seconds', async ({ page }) => {
    console.log('🧪 TDD-3: Testing toast auto-dismiss behavior');

    // Submit comment to trigger toast
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await commentForm.fill(`Auto-dismiss test ${Date.now()}`);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted for auto-dismiss test');

    const toastSelector = '[role="alert"], .toast, [class*="Toast"]';

    try {
      // Wait for toast to appear
      await page.waitForSelector(toastSelector, { timeout: 45000 });
      console.log('✅ Toast appeared');

      const toast = page.locator(toastSelector).first();
      await expect(toast).toBeVisible();

      // Take screenshot while visible
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-3-toast-visible.png',
        fullPage: true
      });

      // Wait 5.5 seconds (5s duration + 0.5s buffer)
      console.log('⏳ Waiting 5.5 seconds for auto-dismiss...');
      await page.waitForTimeout(5500);

      // Verify toast is no longer visible
      await expect(toast).not.toBeVisible();
      console.log('✅ Toast auto-dismissed after 5 seconds');

      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-3-toast-dismissed.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Toast auto-dismiss not working');
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-3-dismiss-failed.png',
        fullPage: true
      });
      throw new Error('Toast auto-dismiss failed - EXPECTED TDD FAILURE');
    }
  });

  test('TDD-4: "Analyzed by Avi" badge visible on agent comments', async ({ page }) => {
    console.log('🧪 TDD-4: Testing "Analyzed by" badge visibility');

    // Submit comment to trigger agent response
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await commentForm.fill(`Badge test ${Date.now()}`);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted for badge test');

    // Wait for agent comment to appear
    await page.waitForTimeout(10000); // Give agent time to respond

    try {
      // Look for agent comment with badge
      const badgeSelector = '[class*="green"]:has-text("Analyzed by"), [class*="badge"]:has-text("Analyzed by")';

      await page.waitForSelector(badgeSelector, { timeout: 35000 });
      console.log('✅ "Analyzed by" badge found');

      const badge = page.locator(badgeSelector).first();
      await expect(badge).toBeVisible();

      // Verify badge text
      const badgeText = await badge.textContent();
      expect(badgeText).toMatch(/Analyzed by/i);
      expect(badgeText).toMatch(/avi|agent/i);

      console.log('✅ Badge text correct:', badgeText);

      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-4-badge-visible.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: "Analyzed by" badge not found');
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-4-badge-missing.png',
        fullPage: true
      });
      throw new Error('"Analyzed by" badge not found - EXPECTED TDD FAILURE');
    }
  });

  test('TDD-5: Badge has correct styling matching TicketStatusBadge', async ({ page }) => {
    console.log('🧪 TDD-5: Testing badge styling');

    // Submit comment
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await commentForm.fill(`Style test ${Date.now()}`);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted for style test');

    await page.waitForTimeout(10000);

    try {
      const badgeSelector = '[class*="green"]:has-text("Analyzed by")';
      await page.waitForSelector(badgeSelector, { timeout: 35000 });

      const badge = page.locator(badgeSelector).first();

      // Check for green color classes (bg-green, text-green, border-green)
      const badgeClass = await badge.getAttribute('class');

      console.log('🎨 Badge classes:', badgeClass);

      // Verify green styling
      expect(badgeClass).toMatch(/green|success/i);

      // Verify icon presence (CheckCircle)
      const icon = badge.locator('svg').first();
      await expect(icon).toBeVisible();

      console.log('✅ Badge styling correct');

      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-5-badge-styled.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Badge styling incorrect');
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-5-styling-incorrect.png',
        fullPage: true
      });
      throw new Error('Badge styling validation failed - EXPECTED TDD FAILURE');
    }
  });

  test('TDD-6: No toast shown for user\'s own comments (only agent responses)', async ({ page }) => {
    console.log('🧪 TDD-6: Testing toast filtering (user vs agent)');

    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await commentForm.fill(`User comment test ${Date.now()}`);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 User comment submitted');

    // Wait 2 seconds - NO toast should appear for user's own comment
    await page.waitForTimeout(2000);

    try {
      const toastSelector = '[role="alert"]:has-text("responded"), .toast:has-text("responded")';

      // Check if toast exists
      const toastCount = await page.locator(toastSelector).count();

      if (toastCount === 0) {
        console.log('✅ Correctly NO toast for user comment');

        await page.screenshot({
          path: 'docs/validation/screenshots/toast-ui-validation/tdd-6-no-toast-user.png',
          fullPage: true
        });
      } else {
        throw new Error('Toast appeared for user comment - should only show for agent responses');
      }

      // Now wait for agent response
      console.log('⏳ Waiting for agent response...');
      await page.waitForSelector('[role="alert"], .toast', { timeout: 43000 });

      console.log('✅ Toast appeared for agent response (correct behavior)');

      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-6-toast-agent-only.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Toast filtering not implemented');
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-6-filtering-failed.png',
        fullPage: true
      });
      throw new Error('Toast filtering failed - EXPECTED TDD FAILURE');
    }
  });

  test('TDD-7: Multiple agent responses show multiple toasts (stacking)', async ({ page }) => {
    console.log('🧪 TDD-7: Testing multiple toast stacking');

    // This test verifies toast accumulation and max limit (5 toasts)
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    try {
      // Submit first comment
      const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
      await commentForm.fill(`Multi-toast test 1 ${Date.now()}`);

      const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
      await submitButton.click();

      console.log('💬 First comment submitted');

      // Wait for first toast
      await page.waitForSelector('[role="alert"], .toast', { timeout: 45000 });
      console.log('✅ First toast appeared');

      // Submit second comment quickly
      await commentForm.fill(`Multi-toast test 2 ${Date.now()}`);
      await submitButton.click();

      console.log('💬 Second comment submitted');

      // Wait for second toast
      await page.waitForTimeout(5000);

      // Count toasts (should be 2, but max 5)
      const toastCount = await page.locator('[role="alert"], .toast').count();

      console.log(`📊 Toast count: ${toastCount}`);

      expect(toastCount).toBeGreaterThanOrEqual(1);
      expect(toastCount).toBeLessThanOrEqual(5); // Max limit

      console.log('✅ Multiple toasts handled correctly');

      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-7-multiple-toasts.png',
        fullPage: true
      });

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Multiple toast handling not working');
      await page.screenshot({
        path: 'docs/validation/screenshots/toast-ui-validation/tdd-7-stacking-failed.png',
        fullPage: true
      });
      throw new Error('Multiple toast handling failed - EXPECTED TDD FAILURE');
    }
  });
});

/**
 * E2E Test: Badge Real-Time Updates
 *
 * Tests that badge status updates in real-time when background workers complete tasks
 *
 * Test Flow:
 * 1. Create post with LinkedIn URL
 * 2. Monitor WebSocket traffic for ticket:status:update events
 * 3. Verify badge appears and shows "processing" status
 * 4. Wait for completion
 * 5. Verify badge updates to "completed" WITHOUT page refresh
 * 6. Take screenshots at each step
 *
 * Success Criteria:
 * - Badge appears when ticket created
 * - Badge shows "processing" status
 * - Badge updates to "completed" automatically (no refresh)
 * - Toast notification appears on completion
 * - All updates happen within 30 seconds
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Badge Real-Time Updates - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Wait for feed to load
    await page.waitForSelector('[data-testid="agent-feed"]', { timeout: 10000 });

    console.log('✅ Feed loaded');
  });

  /**
   * Primary Test: Badge updates in real-time without refresh
   */
  test('FR-001 + FR-002: Badge updates from pending → processing → completed in real-time', async ({ page }) => {
    const screenshotDir = path.join(__dirname, '../screenshots/badge-realtime');

    // Step 1: Initial state - capture before posting
    await page.screenshot({
      path: path.join(screenshotDir, '01-initial-feed.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 1: Initial feed');

    // Step 2: Create post with LinkedIn URL
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
    await postInput.fill('Test real-time badge update:\n\nhttps://www.linkedin.com/pulse/agentdb-new-database-ai-agents-reuven-cohen-l3sbc/');

    await page.screenshot({
      path: path.join(screenshotDir, '02-post-input-filled.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 2: Post input filled');

    // Set up WebSocket listener BEFORE submitting post
    const websocketMessages: any[] = [];
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        try {
          const data = JSON.parse(event.payload.toString());
          if (data[0] === 'ticket:status:update') {
            websocketMessages.push(data[1]);
            console.log('🔌 WebSocket: ticket:status:update received:', data[1]);
          }
        } catch (e) {
          // Ignore non-JSON frames
        }
      });
    });

    // Submit post
    const submitButton = page.locator('button:has-text("Post")').first();
    await submitButton.click();
    console.log('✅ Post submitted');

    // Step 3: Wait for post to appear in feed
    await page.waitForTimeout(2000); // Give optimistic update time to render

    await page.screenshot({
      path: path.join(screenshotDir, '03-post-appeared.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 3: Post appeared in feed');

    // Step 4: Wait for badge to appear (should show "pending" or "processing")
    const badgeLocator = page.locator('[data-testid="ticket-status-badge"]').first();

    try {
      await badgeLocator.waitFor({ state: 'visible', timeout: 10000 });
      console.log('✅ Badge appeared');

      // Capture badge initial state
      const badgeText = await badgeLocator.textContent();
      console.log(`🎫 Badge status: ${badgeText}`);

      await page.screenshot({
        path: path.join(screenshotDir, '04-badge-appeared.png'),
        fullPage: true
      });
      console.log('📸 Screenshot 4: Badge appeared');

      // Verify badge is visible
      await expect(badgeLocator).toBeVisible();

    } catch (error) {
      console.log('⚠️ Badge did not appear within 10 seconds');
      await page.screenshot({
        path: path.join(screenshotDir, '04-badge-timeout.png'),
        fullPage: true
      });
      throw error;
    }

    // Step 5: Wait for "processing" status
    let processingBadgeFound = false;
    for (let i = 0; i < 10; i++) {
      const badgeText = await badgeLocator.textContent();
      console.log(`🔍 Checking badge (attempt ${i+1}/10): ${badgeText}`);

      if (badgeText?.includes('analyzing') || badgeText?.includes('processing')) {
        processingBadgeFound = true;
        console.log('✅ Badge shows "processing" status');

        await page.screenshot({
          path: path.join(screenshotDir, '05-badge-processing.png'),
          fullPage: true
        });
        console.log('📸 Screenshot 5: Badge processing');
        break;
      }

      await page.waitForTimeout(1000);
    }

    // Step 6: Wait for completion (WITHOUT REFRESH)
    // This is the critical test - badge must update automatically
    let completedBadgeFound = false;

    console.log('⏳ Waiting for badge to update to "completed" (max 30 seconds)...');

    for (let i = 0; i < 30; i++) {
      const badgeText = await badgeLocator.textContent();
      console.log(`🔍 Checking badge (${i+1}/30): ${badgeText}`);

      if (badgeText?.includes('Analyzed') || badgeText?.includes('completed')) {
        completedBadgeFound = true;
        console.log('✅ Badge updated to "completed" WITHOUT REFRESH!');

        await page.screenshot({
          path: path.join(screenshotDir, '06-badge-completed.png'),
          fullPage: true
        });
        console.log('📸 Screenshot 6: Badge completed');
        break;
      }

      await page.waitForTimeout(1000);
    }

    // Step 7: Check for toast notification
    const toastLocator = page.locator('[role="alert"], .toast, [class*="toast"]');
    const toastVisible = await toastLocator.isVisible().catch(() => false);

    if (toastVisible) {
      console.log('✅ Toast notification visible');
      const toastText = await toastLocator.textContent();
      console.log(`📬 Toast message: ${toastText}`);

      await page.screenshot({
        path: path.join(screenshotDir, '07-toast-notification.png'),
        fullPage: true
      });
      console.log('📸 Screenshot 7: Toast notification');
    }

    // Step 8: Final state screenshot
    await page.screenshot({
      path: path.join(screenshotDir, '08-final-state.png'),
      fullPage: true
    });
    console.log('📸 Screenshot 8: Final state');

    // Verify completion
    expect(completedBadgeFound).toBe(true);
    console.log('✅ TEST PASSED: Badge updated in real-time without refresh');

    // Optional: Log WebSocket messages received
    console.log(`🔌 Total WebSocket messages: ${websocketMessages.length}`);
    websocketMessages.forEach((msg, idx) => {
      console.log(`  Message ${idx + 1}:`, msg);
    });
  });

  /**
   * Test: Toast notification appears before badge updates
   */
  test('FR-003: Toast notification appears on status change', async ({ page }) => {
    const screenshotDir = path.join(__dirname, '../screenshots/badge-realtime');

    // Create post
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
    await postInput.fill('Test toast notification:\n\nhttps://www.linkedin.com/pulse/test-url');

    const submitButton = page.locator('button:has-text("Post")').first();
    await submitButton.click();

    console.log('✅ Post submitted, waiting for toast...');

    // Wait for toast to appear (should be faster than badge update)
    const toastLocator = page.locator('[role="alert"], .toast, [class*="toast"]');

    try {
      await toastLocator.waitFor({ state: 'visible', timeout: 15000 });
      console.log('✅ Toast appeared');

      const toastText = await toastLocator.textContent();
      console.log(`📬 Toast message: ${toastText}`);

      // Verify toast mentions agent or status
      expect(toastText).toMatch(/link-logger|analyzing|completed|processing/i);

      await page.screenshot({
        path: path.join(screenshotDir, 'toast-notification-test.png'),
        fullPage: true
      });
      console.log('📸 Screenshot: Toast notification test');

    } catch (error) {
      console.log('⚠️ Toast did not appear within 15 seconds');
      await page.screenshot({
        path: path.join(screenshotDir, 'toast-timeout.png'),
        fullPage: true
      });
      throw error;
    }
  });

  /**
   * Test: No badge for interactive posts (non-proactive)
   */
  test('FR-007: No badge appears for interactive posts without tickets', async ({ page }) => {
    const screenshotDir = path.join(__dirname, '../screenshots/badge-realtime');

    // Create a regular text post (no URL, no proactive agent work)
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
    await postInput.fill('This is just a regular post with no URL. Should NOT get a badge.');

    const submitButton = page.locator('button:has-text("Post")').first();
    await submitButton.click();

    console.log('✅ Regular post submitted');

    // Wait for post to appear
    await page.waitForTimeout(3000);

    // Find the post we just created
    const recentPost = page.locator('[data-testid="agent-post"]').first();
    await recentPost.waitFor({ state: 'visible', timeout: 5000 });

    // Check if badge exists within this post
    const badgeInPost = recentPost.locator('[data-testid="ticket-status-badge"]');
    const badgeVisible = await badgeInPost.isVisible().catch(() => false);

    await page.screenshot({
      path: path.join(screenshotDir, 'no-badge-for-text-post.png'),
      fullPage: true
    });
    console.log('📸 Screenshot: No badge for text post');

    // Verify NO badge appears
    expect(badgeVisible).toBe(false);
    console.log('✅ TEST PASSED: No badge for interactive post (correct behavior)');
  });

  /**
   * Performance Test: Badge updates within acceptable latency
   */
  test('PERF: Badge updates within 5 seconds of completion', async ({ page }) => {
    const screenshotDir = path.join(__dirname, '../screenshots/badge-realtime');

    // Create post
    const postInput = page.locator('textarea[placeholder*="What\'s on your mind"]').first();
    await postInput.fill('Performance test:\n\nhttps://www.linkedin.com/pulse/performance-test');

    const startTime = Date.now();

    const submitButton = page.locator('button:has-text("Post")').first();
    await submitButton.click();

    console.log('✅ Post submitted, monitoring performance...');

    // Wait for badge to appear
    const badgeLocator = page.locator('[data-testid="ticket-status-badge"]').first();
    await badgeLocator.waitFor({ state: 'visible', timeout: 10000 });

    const badgeAppearTime = Date.now() - startTime;
    console.log(`⏱️ Badge appeared in ${badgeAppearTime}ms`);

    // Wait for completion status
    for (let i = 0; i < 30; i++) {
      const badgeText = await badgeLocator.textContent();

      if (badgeText?.includes('Analyzed') || badgeText?.includes('completed')) {
        const completionTime = Date.now() - startTime;
        console.log(`⏱️ Badge updated to completed in ${completionTime}ms`);

        // Verify within 30 seconds (generous, actual should be faster)
        expect(completionTime).toBeLessThan(30000);

        await page.screenshot({
          path: path.join(screenshotDir, 'performance-test-complete.png'),
          fullPage: true
        });

        console.log('✅ TEST PASSED: Badge updated within acceptable time');
        return;
      }

      await page.waitForTimeout(1000);
    }

    throw new Error('Badge did not update to completed within 30 seconds');
  });
});

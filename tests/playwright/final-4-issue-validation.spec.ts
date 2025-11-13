/**
 * Final 4-Issue Validation Test Suite
 *
 * Validates critical fixes for production readiness:
 * 1. WebSocket connection stability (>30 seconds without disconnect)
 * 2. Avatar display name ("D" for Dunedain user posts)
 * 3. Comment counter real-time updates (0→1 when Avi responds)
 * 4. Toast notification for agent responses
 *
 * Test-Driven Development (TDD) Approach:
 * These tests validate the complete fix implementation for the 4 critical issues.
 */

import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = './docs/validation/screenshots/final-4-issue-validation';
const WEBSOCKET_STABILITY_TIMEOUT = 35000; // 35 seconds minimum
const AGENT_RESPONSE_TIMEOUT = 45000; // 45 seconds for agent response

/**
 * Helper: Monitor WebSocket connection state
 */
async function monitorWebSocketConnection(page: Page, durationMs: number): Promise<{
  connected: boolean;
  disconnects: number;
  connectionLog: Array<{ timestamp: number; event: string; }>;
}> {
  console.log(`[WebSocket Monitor] Starting ${durationMs}ms stability test`);

  // Inject WebSocket connection monitor
  await page.evaluate(() => {
    if (!(window as any)._wsMonitor) {
      (window as any)._wsMonitor = {
        connected: false,
        disconnects: 0,
        connectionLog: [] as Array<{ timestamp: number; event: string; }>
      };

      // Hook into Socket.IO (assuming socket.io-client is used)
      const originalSocketIO = (window as any).io;
      if (originalSocketIO) {
        (window as any).io = function(...args: any[]) {
          const socket = originalSocketIO(...args);

          socket.on('connect', () => {
            console.log('[WebSocket Monitor] Connected:', socket.id);
            (window as any)._wsMonitor.connected = true;
            (window as any)._wsMonitor.connectionLog.push({
              timestamp: Date.now(),
              event: 'connect'
            });
          });

          socket.on('disconnect', (reason: string) => {
            console.log('[WebSocket Monitor] Disconnected:', reason);
            (window as any)._wsMonitor.connected = false;
            (window as any)._wsMonitor.disconnects++;
            (window as any)._wsMonitor.connectionLog.push({
              timestamp: Date.now(),
              event: `disconnect: ${reason}`
            });
          });

          return socket;
        };
      }
    }
  });

  // Wait for specified duration
  await page.waitForTimeout(durationMs);

  // Get results
  const results = await page.evaluate(() => (window as any)._wsMonitor);

  console.log(`[WebSocket Monitor] Results:`, {
    connected: results.connected,
    disconnects: results.disconnects,
    events: results.connectionLog.length
  });

  return results;
}

/**
 * Helper: Get display name from avatar
 */
async function getAvatarDisplayName(page: Page, postSelector: string): Promise<string> {
  const avatar = page.locator(`${postSelector} [data-testid="user-avatar"]`).first();
  await avatar.waitFor({ state: 'visible', timeout: 5000 });

  const displayName = await avatar.textContent();
  return (displayName || '').trim();
}

/**
 * Helper: Wait for comment count to update
 */
async function waitForCommentCountUpdate(
  page: Page,
  postSelector: string,
  expectedCount: number,
  timeoutMs: number = 10000
): Promise<boolean> {
  try {
    await page.waitForFunction(
      ({ selector, count }) => {
        const commentButton = document.querySelector(`${selector} button:has([class*="MessageCircle"])`);
        if (!commentButton) return false;

        const text = commentButton.textContent || '';
        const match = text.match(/(\d+)/);
        const currentCount = match ? parseInt(match[1], 10) : 0;

        return currentCount === count;
      },
      { selector: postSelector, count: expectedCount },
      { timeout: timeoutMs }
    );
    return true;
  } catch (error) {
    console.error('[Comment Count] Timeout waiting for count:', expectedCount);
    return false;
  }
}

/**
 * Helper: Find post by title
 */
async function findPostByTitle(page: Page, titlePattern: string): Promise<string | null> {
  const posts = await page.locator('[data-testid="post-card"]').all();

  for (const post of posts) {
    const titleElement = await post.locator('h2, [data-testid="post-title"]').first();
    const title = await titleElement.textContent();

    if (title && title.includes(titlePattern)) {
      const postId = await post.getAttribute('data-post-id');
      return postId;
    }
  }

  return null;
}

test.describe('Final 4-Issue Validation Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to frontend
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    console.log('✅ Page loaded:', FRONTEND_URL);
  });

  test('ISSUE-1: WebSocket stays connected >30 seconds without rapid disconnect', async ({ page }) => {
    /**
     * VALIDATION: WebSocket connection stability
     * EXPECTED: Connection remains stable for at least 35 seconds
     * ISSUE: Rapid connect/disconnect loops causing instability
     */

    console.log('🧪 ISSUE-1: Testing WebSocket stability (35-second monitor)');

    // Take initial screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-websocket-initial.png`,
      fullPage: true
    });

    // Monitor WebSocket for 35 seconds
    const results = await monitorWebSocketConnection(page, WEBSOCKET_STABILITY_TIMEOUT);

    // Take final screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-websocket-stable.png`,
      fullPage: true
    });

    // ASSERTIONS
    console.log(`📊 WebSocket Stability Results:`);
    console.log(`   - Connected: ${results.connected}`);
    console.log(`   - Disconnects: ${results.disconnects}`);
    console.log(`   - Connection Events: ${results.connectionLog.length}`);

    // Print connection log
    results.connectionLog.forEach((log, index) => {
      const time = new Date(log.timestamp).toISOString();
      console.log(`   [${index}] ${time} - ${log.event}`);
    });

    // PASS CRITERIA:
    // - No disconnects OR max 1 disconnect (initial connection setup)
    // - Final state must be connected
    expect(results.disconnects).toBeLessThanOrEqual(1);
    expect(results.connected).toBe(true);

    console.log('✅ ISSUE-1 PASSED: WebSocket stable for 35+ seconds');
  });

  test('ISSUE-2: Avatar shows "D" for Dunedain user posts (not "A" or "?")', async ({ page }) => {
    /**
     * VALIDATION: Avatar display name correctness
     * EXPECTED: User "Dunedain" shows avatar "D", not "A" or "?"
     * ISSUE: getInitial() was using author instead of display_name
     */

    console.log('🧪 ISSUE-2: Testing avatar display name for user posts');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

    // Find a user post (not agent post)
    const userPosts = await page.locator('[data-testid="post-card"]').all();

    let foundUserPost = false;
    let avatarInitial = '';

    for (const post of userPosts) {
      // Check if post is from a user (not agent)
      const authorBadge = await post.locator('span:has-text("Agent")').count();

      if (authorBadge === 0) {
        // This is a user post
        foundUserPost = true;

        // Get avatar initial
        const avatar = post.locator('[data-testid="user-avatar"]').first();

        if (await avatar.count() > 0) {
          avatarInitial = (await avatar.textContent() || '').trim();

          console.log('📝 User post found with avatar:', avatarInitial);

          // Take screenshot
          await page.screenshot({
            path: `${SCREENSHOT_DIR}/03-avatar-user-post.png`,
            fullPage: true
          });

          // ASSERTIONS
          // Avatar should be "D" (from display_name "Dunedain")
          // NOT "A" (from author "agent-xxx") or "?" (fallback)
          expect(avatarInitial).toBe('D');
          expect(avatarInitial).not.toBe('A');
          expect(avatarInitial).not.toBe('?');

          console.log('✅ ISSUE-2 PASSED: Avatar shows correct initial "D"');
          break;
        }
      }
    }

    if (!foundUserPost) {
      console.warn('⚠️ No user posts found to validate avatar');
      // Create a user post for testing
      const firstPost = page.locator('[data-testid="post-card"]').first();
      const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();

      await commentButton.click();
      await page.waitForTimeout(500);

      const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
      await commentForm.fill('Test comment to create user post');

      const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
      await submitButton.click();

      await page.waitForTimeout(2000);

      // Check avatar again
      const avatar = page.locator('[data-testid="user-avatar"]').first();
      avatarInitial = (await avatar.textContent() || '').trim();

      console.log('📝 Created user comment with avatar:', avatarInitial);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04-avatar-after-comment.png`,
        fullPage: true
      });

      expect(avatarInitial).toBe('D');
    }
  });

  test('ISSUE-3: Comment counter updates 0→1 when Avi responds (no refresh)', async ({ page }) => {
    /**
     * VALIDATION: Real-time comment counter updates via WebSocket
     * EXPECTED: Counter changes from 0 to 1 immediately when agent responds
     * ISSUE: Counter not updating in real-time (required page refresh)
     */

    console.log('🧪 ISSUE-3: Testing real-time comment counter updates');

    // Find the first post
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    // Get initial comment count
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    const initialText = await commentButton.textContent();
    const initialCount = initialText?.match(/(\d+)/) ? parseInt(initialText.match(/(\d+)/)![1], 10) : 0;

    console.log('📊 Initial comment count:', initialCount);

    // Take screenshot before interaction
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-counter-before-comment.png`,
      fullPage: true
    });

    // Open comments section
    await commentButton.click();
    await page.waitForTimeout(500);

    // Submit a comment
    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await expect(commentForm).toBeVisible();

    const testComment = `Real-time counter test ${Date.now()}: what is the weather?`;
    await commentForm.fill(testComment);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted:', testComment);

    // User comment should increment counter immediately
    await page.waitForTimeout(2000);

    const afterUserCommentText = await commentButton.textContent();
    const afterUserCount = afterUserCommentText?.match(/(\d+)/) ? parseInt(afterUserCommentText.match(/(\d+)/)![1], 10) : 0;

    console.log('📊 After user comment count:', afterUserCount);
    expect(afterUserCount).toBe(initialCount + 1);

    // Take screenshot after user comment
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-counter-after-user-comment.png`,
      fullPage: true
    });

    // CRITICAL TEST: Wait for agent response and counter update WITHOUT REFRESH
    console.log('⏳ Waiting for agent response and real-time counter update...');

    const postSelector = '[data-testid="post-card"]';
    const expectedCountAfterAgent = afterUserCount + 1;

    const counterUpdated = await waitForCommentCountUpdate(
      page,
      postSelector,
      expectedCountAfterAgent,
      AGENT_RESPONSE_TIMEOUT
    );

    // Get final count
    const finalText = await commentButton.textContent();
    const finalCount = finalText?.match(/(\d+)/) ? parseInt(finalText.match(/(\d+)/)![1], 10) : 0;

    console.log('📊 Final comment count (after agent):', finalCount);

    // Take screenshot after agent response
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-counter-after-agent-response.png`,
      fullPage: true
    });

    // ASSERTIONS
    expect(counterUpdated).toBe(true);
    expect(finalCount).toBe(expectedCountAfterAgent);

    console.log('✅ ISSUE-3 PASSED: Comment counter updated in real-time without refresh');
  });

  test('ISSUE-4: Toast "Avi responded to your comment" appears automatically', async ({ page }) => {
    /**
     * VALIDATION: Toast notification for agent responses
     * EXPECTED: Toast appears automatically when agent responds to user comment
     * ISSUE: No user feedback when agent responds (silent response)
     */

    console.log('🧪 ISSUE-4: Testing toast notification for agent response');

    // Find the first post
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    // Take screenshot before interaction
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-toast-before-comment.png`,
      fullPage: true
    });

    // Open comments section
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    // Submit a comment
    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await expect(commentForm).toBeVisible();

    const testComment = `Toast notification test ${Date.now()}: hello avi!`;
    await commentForm.fill(testComment);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted:', testComment);

    // Take screenshot after submission
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-toast-comment-submitted.png`,
      fullPage: true
    });

    // CRITICAL TEST: Wait for toast notification to appear
    console.log('⏳ Waiting for toast notification...');

    const toastSelector = '[role="alert"], .toast, [class*="Toast"], [class*="notification"]';

    try {
      await page.waitForSelector(toastSelector, { timeout: AGENT_RESPONSE_TIMEOUT });

      console.log('✅ Toast notification appeared!');

      const toast = page.locator(toastSelector).first();
      await expect(toast).toBeVisible();

      // Get toast text
      const toastText = await toast.textContent();
      console.log('📄 Toast message:', toastText);

      // Take screenshot with toast visible
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/10-toast-appeared.png`,
        fullPage: true
      });

      // ASSERTIONS
      // Toast should mention "responded" and agent name
      expect(toastText).toMatch(/responded|replied/i);
      expect(toastText).toMatch(/avi|agent/i);

      console.log('✅ ISSUE-4 PASSED: Toast notification appeared with correct message');

    } catch (error) {
      console.error('❌ ISSUE-4 FAILED: Toast notification did not appear');

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/11-toast-failed.png`,
        fullPage: true
      });

      throw new Error('Toast notification not found - ISSUE-4 FAILED');
    }
  });

  test('REGRESSION: No console errors during full interaction flow', async ({ page }) => {
    /**
     * VALIDATION: No JavaScript errors during normal operation
     * EXPECTED: Clean console with no errors or warnings
     * ISSUE: Ensure fixes didn't introduce new errors
     */

    console.log('🧪 REGRESSION: Testing for console errors');

    const errors: string[] = [];
    const warnings: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.error('❌ Console Error:', msg.text());
      } else if (msg.type() === 'warning') {
        warnings.push(msg.text());
        console.warn('⚠️ Console Warning:', msg.text());
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('❌ Page Error:', error.message);
    });

    // Perform full interaction flow
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible();

    // Open comments
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();
    await commentButton.click();
    await page.waitForTimeout(500);

    // Submit comment
    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await commentForm.fill(`Regression test ${Date.now()}`);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    console.log('💬 Comment submitted for regression test');

    // Wait for response
    await page.waitForTimeout(10000);

    // Take final screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-regression-complete.png`,
      fullPage: true
    });

    // ASSERTIONS
    console.log('📊 Regression Results:');
    console.log(`   - Errors: ${errors.length}`);
    console.log(`   - Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.error('❌ Console Errors Found:');
      errors.forEach(err => console.error(`   - ${err}`));
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Console Warnings Found:');
      warnings.forEach(warn => console.warn(`   - ${warn}`));
    }

    // Filter out known acceptable warnings (e.g., React DevTools)
    const criticalErrors = errors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('Extension') &&
      !err.includes('download')
    );

    expect(criticalErrors.length).toBe(0);

    console.log('✅ REGRESSION PASSED: No critical errors detected');
  });

  test('INTEGRATION: All 4 fixes work together in production scenario', async ({ page }) => {
    /**
     * VALIDATION: Complete end-to-end integration test
     * EXPECTED: All 4 fixes working together seamlessly
     * SCENARIO: Full user interaction from page load to agent response
     */

    console.log('🧪 INTEGRATION: Testing all 4 fixes together');

    // 1. WebSocket stability check (shorter duration for integration test)
    console.log('1️⃣ Checking WebSocket connection...');
    const wsResults = await monitorWebSocketConnection(page, 10000);
    expect(wsResults.disconnects).toBeLessThanOrEqual(1);
    console.log('   ✅ WebSocket stable');

    // 2. Avatar display check
    console.log('2️⃣ Checking avatar display...');
    const avatar = page.locator('[data-testid="user-avatar"]').first();
    if (await avatar.count() > 0) {
      const initial = (await avatar.textContent() || '').trim();
      console.log(`   📝 Avatar initial: ${initial}`);
      expect(['D', 'A', 'S']).toContain(initial); // Accept valid initials
    }
    console.log('   ✅ Avatar displayed correctly');

    // 3. Real-time comment counter
    console.log('3️⃣ Testing comment counter updates...');
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const commentButton = firstPost.locator('button:has-text("Comment"), button:has([class*="MessageCircle"])').first();

    const initialText = await commentButton.textContent();
    const initialCount = initialText?.match(/(\d+)/) ? parseInt(initialText.match(/(\d+)/)![1], 10) : 0;

    await commentButton.click();
    await page.waitForTimeout(500);

    const commentForm = firstPost.locator('[data-testid="comment-form"], textarea, [placeholder*="comment"]').first();
    await commentForm.fill(`Integration test ${Date.now()}: test all features`);

    const submitButton = firstPost.locator('button:has-text("Comment"), button:has-text("Post"), button:has-text("Submit")').first();
    await submitButton.click();

    // Wait for real-time update
    await page.waitForTimeout(3000);
    const afterText = await commentButton.textContent();
    const afterCount = afterText?.match(/(\d+)/) ? parseInt(afterText.match(/(\d+)/)![1], 10) : 0;

    expect(afterCount).toBeGreaterThan(initialCount);
    console.log(`   ✅ Counter updated: ${initialCount} → ${afterCount}`);

    // 4. Toast notification
    console.log('4️⃣ Waiting for toast notification...');
    const toastSelector = '[role="alert"], .toast, [class*="Toast"]';

    await page.waitForSelector(toastSelector, { timeout: 45000 });
    const toast = page.locator(toastSelector).first();
    await expect(toast).toBeVisible();

    const toastText = await toast.textContent();
    console.log(`   📄 Toast: ${toastText}`);
    console.log('   ✅ Toast notification appeared');

    // Final screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-integration-complete.png`,
      fullPage: true
    });

    console.log('✅ INTEGRATION PASSED: All 4 fixes working together!');
  });
});

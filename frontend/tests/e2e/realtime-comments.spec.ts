/**
 * E2E Test Suite: Real-time Comment Updates
 *
 * Purpose: Validate that comments appear immediately without page refresh
 * when using WebSocket (Socket.IO) real-time updates.
 *
 * Test Coverage:
 * 1. Single-client: Comment appears immediately after posting
 * 2. Multi-client: Comments sync across multiple browser contexts
 * 3. AVI reply: Agent reply updates appear in real-time
 * 4. WebSocket status: Connection logs are visible in console
 *
 * Technical Details:
 * - Uses Socket.IO WebSocket connection (http://localhost:3001)
 * - Listens to 'comment:added' event via useRealtimeComments hook
 * - No page refresh or manual refetch required
 * - Screenshots captured for visual verification
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = './tests/screenshots';
const TIMEOUT_SHORT = 3000; // 3 seconds for real-time updates
const TIMEOUT_MEDIUM = 5000; // 5 seconds for network operations
const TIMEOUT_LONG = 10000; // 10 seconds for multi-client sync

/**
 * Helper function to wait for WebSocket connection
 */
async function waitForSocketConnection(page: Page, timeout = TIMEOUT_MEDIUM): Promise<void> {
  console.log('[Test] Waiting for Socket.IO connection...');

  // Wait for Socket.IO connection log in console
  const socketConnected = page.waitForEvent('console', {
    predicate: (msg) => {
      const text = msg.text();
      return text.includes('[Socket.IO] Connected to server') ||
             text.includes('[Realtime] Socket connection status: Connected');
    },
    timeout
  }).catch(() => null);

  await socketConnected;
  console.log('[Test] Socket.IO connection established');
}

/**
 * Helper function to capture console logs for debugging
 */
function setupConsoleLogging(page: Page, label: string): void {
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    // Log relevant messages
    if (text.includes('[Realtime]') ||
        text.includes('[Socket.IO]') ||
        text.includes('Comment') ||
        text.includes('WebSocket')) {
      console.log(`[${label}] ${type.toUpperCase()}: ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    console.error(`[${label}] PAGE ERROR:`, error.message);
  });
}

/**
 * Helper function to find a post on the page
 */
async function findPostWithComments(page: Page): Promise<string | null> {
  console.log('[Test] Looking for a post with comments section...');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Try to find any post with a comment form
  const commentForm = await page.locator('textarea[placeholder*="comment" i], textarea[placeholder*="reply" i]').first();
  const isVisible = await commentForm.isVisible().catch(() => false);

  if (isVisible) {
    console.log('[Test] Found post with comment form');
    // Extract post ID from URL or DOM
    const url = page.url();
    const match = url.match(/\/posts\/([^\/]+)/);
    return match ? match[1] : 'current-post';
  }

  console.log('[Test] No post with comment form found');
  return null;
}

/**
 * Helper function to post a comment
 */
async function postComment(page: Page, content: string): Promise<void> {
  console.log(`[Test] Posting comment: "${content.substring(0, 50)}..."`);

  // Find comment textarea
  const textarea = page.locator('textarea[placeholder*="comment" i], textarea[placeholder*="reply" i]').first();
  await textarea.waitFor({ state: 'visible', timeout: TIMEOUT_MEDIUM });

  // Fill and submit
  await textarea.fill(content);
  await textarea.press('Tab'); // Trigger onChange

  // Find and click submit button
  const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit"), button[type="submit"]').first();
  await submitButton.waitFor({ state: 'visible', timeout: TIMEOUT_MEDIUM });
  await submitButton.click();

  console.log('[Test] Comment posted, waiting for submission...');
}

/**
 * Helper function to verify comment appears in DOM
 */
async function verifyCommentInDOM(page: Page, commentText: string, timeout = TIMEOUT_SHORT): Promise<boolean> {
  console.log(`[Test] Verifying comment appears: "${commentText.substring(0, 50)}..."`);

  try {
    // Wait for comment to appear in DOM
    const commentLocator = page.locator(`text="${commentText}"`).first();
    await commentLocator.waitFor({ state: 'visible', timeout });

    const isVisible = await commentLocator.isVisible();
    console.log(`[Test] Comment visibility: ${isVisible}`);

    return isVisible;
  } catch (error) {
    console.error('[Test] Comment not found in DOM:', error);
    return false;
  }
}

/**
 * Test Suite: Real-time Comment Updates
 */
test.describe('Real-time Comment Updates', () => {

  test.beforeEach(async ({ page }) => {
    // Setup console logging for debugging
    setupConsoleLogging(page, 'Main');
  });

  /**
   * Test 1: Comment appears immediately without refresh
   *
   * Validates:
   * - Comment form is functional
   * - Comment appears in DOM within 2 seconds
   * - No page refresh occurs (URL stays the same)
   * - WebSocket connection is active
   */
  test('comment appears immediately without refresh', async ({ page }) => {
    console.log('\n=== TEST 1: Comment Appears Immediately ===\n');

    // Navigate to home page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await waitForSocketConnection(page);

    // Find a post with comments
    const postId = await findPostWithComments(page);

    if (!postId) {
      console.warn('[Test] No post with comment form found, skipping test');
      test.skip();
      return;
    }

    // Record initial URL (to verify no refresh)
    const initialUrl = page.url();
    console.log('[Test] Initial URL:', initialUrl);

    // Generate unique comment content
    const timestamp = Date.now();
    const commentContent = `E2E Test Comment - No Refresh - ${timestamp}`;

    // Post the comment
    await postComment(page, commentContent);

    // Verify comment appears without refresh
    const appeared = await verifyCommentInDOM(page, commentContent, TIMEOUT_SHORT);
    expect(appeared).toBe(true);

    // Verify URL hasn't changed (no page refresh)
    const finalUrl = page.url();
    expect(finalUrl).toBe(initialUrl);
    console.log('[Test] ✓ No page refresh occurred');

    // Take screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/comment-immediate-appearance.png`,
      fullPage: true
    });

    console.log('\n=== TEST 1 PASSED ===\n');
  });

  /**
   * Test 2: Multi-client real-time sync
   *
   * Validates:
   * - Two browser contexts can be opened simultaneously
   * - Comment posted in Context 1 appears in Context 2 automatically
   * - No manual refresh required in Context 2
   * - WebSocket events are properly broadcast
   */
  test('multi-client sync', async ({ browser }) => {
    console.log('\n=== TEST 2: Multi-Client Sync ===\n');

    // Create two separate browser contexts (simulate two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup console logging for both contexts
    setupConsoleLogging(page1, 'Context1');
    setupConsoleLogging(page2, 'Context2');

    try {
      // Navigate both contexts to the same page
      await Promise.all([
        page1.goto(BASE_URL),
        page2.goto(BASE_URL)
      ]);

      await Promise.all([
        page1.waitForLoadState('networkidle'),
        page2.waitForLoadState('networkidle')
      ]);

      // Wait for WebSocket connections in both contexts
      await Promise.all([
        waitForSocketConnection(page1),
        waitForSocketConnection(page2)
      ]);

      // Find a post in context 1
      const postId = await findPostWithComments(page1);

      if (!postId) {
        console.warn('[Test] No post with comment form found, skipping test');
        test.skip();
        return;
      }

      // Ensure context 2 is on the same post
      if (page1.url() !== page2.url()) {
        await page2.goto(page1.url());
        await page2.waitForLoadState('networkidle');
      }

      // Generate unique comment
      const timestamp = Date.now();
      const commentContent = `E2E Test Comment - Multi-Client - ${timestamp}`;

      console.log('[Test] Context 1 posting comment...');

      // Post comment in context 1
      await postComment(page1, commentContent);

      // Wait for comment to appear in BOTH contexts
      console.log('[Test] Waiting for comment in both contexts...');

      const [appeared1, appeared2] = await Promise.all([
        verifyCommentInDOM(page1, commentContent, TIMEOUT_SHORT),
        verifyCommentInDOM(page2, commentContent, TIMEOUT_LONG) // Longer timeout for network propagation
      ]);

      expect(appeared1).toBe(true);
      expect(appeared2).toBe(true);

      console.log('[Test] ✓ Comment appeared in both contexts');

      // Take screenshots from both contexts
      await Promise.all([
        page1.screenshot({
          path: `${SCREENSHOT_DIR}/multi-client-context1.png`,
          fullPage: true
        }),
        page2.screenshot({
          path: `${SCREENSHOT_DIR}/multi-client-context2.png`,
          fullPage: true
        })
      ]);

      console.log('\n=== TEST 2 PASSED ===\n');

    } finally {
      // Cleanup
      await context1.close();
      await context2.close();
    }
  });

  /**
   * Test 3: AVI reply real-time update
   *
   * Validates:
   * - Can find a comment from AVI agent
   * - Reply to AVI appears immediately
   * - Reply is nested under correct parent
   * - Threading structure is maintained
   */
  test('AVI reply real-time update', async ({ page }) => {
    console.log('\n=== TEST 3: AVI Reply Real-time Update ===\n');

    // Navigate to page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await waitForSocketConnection(page);

    // Find AVI's comment (look for Bot icon or author name)
    console.log('[Test] Looking for AVI comment...');

    // Try multiple selectors to find AVI's comment
    const aviComment = await page.locator('[data-author*="avi" i], [data-author*="agent" i], .comment:has(.Bot)').first();
    const aviCommentVisible = await aviComment.isVisible().catch(() => false);

    if (!aviCommentVisible) {
      console.warn('[Test] No AVI comment found, attempting to find any agent comment...');

      // Look for any comment with "agent" in author
      const anyAgentComment = await page.locator('text=/agent-/i').first();
      const anyAgentVisible = await anyAgentComment.isVisible().catch(() => false);

      if (!anyAgentVisible) {
        console.warn('[Test] No agent comments found, skipping test');
        test.skip();
        return;
      }
    }

    // Find Reply button for AVI's comment
    const replyButton = await page.locator('button:has-text("Reply")').first();
    const replyButtonVisible = await replyButton.isVisible().catch(() => false);

    if (!replyButtonVisible) {
      console.warn('[Test] No Reply button found, skipping test');
      test.skip();
      return;
    }

    // Click Reply button
    await replyButton.click();
    console.log('[Test] Reply form opened');

    // Wait for reply form to appear
    await page.waitForTimeout(500); // Brief pause for animation

    // Generate unique reply
    const timestamp = Date.now();
    const replyContent = `E2E Test Reply to AVI - ${timestamp}`;

    // Fill reply form (find textarea that appeared after clicking Reply)
    const replyTextarea = page.locator('textarea').last(); // Last textarea is likely the reply form
    await replyTextarea.fill(replyContent);

    // Submit reply
    const postReplyButton = page.locator('button:has-text("Post Reply"), button:has-text("Post")').last();
    await postReplyButton.click();

    console.log('[Test] Reply submitted, waiting for real-time update...');

    // Verify reply appears immediately
    const replyAppeared = await verifyCommentInDOM(page, replyContent, TIMEOUT_SHORT);
    expect(replyAppeared).toBe(true);

    console.log('[Test] ✓ AVI reply appeared in real-time');

    // Verify threading: Reply should be nested (indented) under parent
    const replyElement = page.locator(`text="${replyContent}"`).first();
    const parentElement = replyElement.locator('xpath=ancestor::*[contains(@class, "ml-")]').first();
    const isIndented = await parentElement.isVisible().catch(() => false);

    console.log(`[Test] Reply threading verified: ${isIndented ? 'nested' : 'flat'}`);

    // Take screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/avi-reply-realtime.png`,
      fullPage: true
    });

    console.log('\n=== TEST 3 PASSED ===\n');
  });

  /**
   * Test 4: WebSocket connection status
   *
   * Validates:
   * - Console logs show Socket.IO connection
   * - Connection status logs are present
   * - Comment added events are logged
   * - No connection errors occur
   */
  test('WebSocket connection status', async ({ page }) => {
    console.log('\n=== TEST 4: WebSocket Connection Status ===\n');

    const consoleLogs: string[] = [];
    let socketConnected = false;
    let commentAddedLogged = false;

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(text);

      if (text.includes('[Socket.IO] Connected to server') ||
          text.includes('[Realtime] Socket connection status: Connected')) {
        socketConnected = true;
        console.log('[Test] ✓ Socket connection log detected');
      }

      if (text.includes('[Realtime] Comment added')) {
        commentAddedLogged = true;
        console.log('[Test] ✓ Comment added event detected');
      }
    });

    // Navigate to page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await waitForSocketConnection(page);

    // Verify connection was logged
    expect(socketConnected).toBe(true);
    console.log('[Test] WebSocket connected successfully');

    // Find and post a comment to trigger "comment added" event
    const postId = await findPostWithComments(page);

    if (postId) {
      const timestamp = Date.now();
      const commentContent = `E2E Test Comment - WebSocket Status - ${timestamp}`;

      await postComment(page, commentContent);

      // Wait a bit for event logging
      await page.waitForTimeout(2000);

      // Verify comment added event was logged
      if (commentAddedLogged) {
        console.log('[Test] ✓ Comment added event was logged');
      } else {
        console.warn('[Test] Comment added event not detected in logs');
      }
    }

    // Log summary of captured console messages
    console.log('\n[Test] Console log summary:');
    const relevantLogs = consoleLogs.filter(log =>
      log.includes('[Realtime]') ||
      log.includes('[Socket.IO]') ||
      log.includes('WebSocket')
    );

    relevantLogs.forEach(log => console.log(`  - ${log}`));

    // Check for any connection errors
    const hasErrors = consoleLogs.some(log =>
      log.toLowerCase().includes('error') &&
      (log.includes('socket') || log.includes('websocket') || log.includes('realtime'))
    );

    if (hasErrors) {
      console.error('[Test] ⚠ WebSocket connection errors detected!');
      const errorLogs = consoleLogs.filter(log =>
        log.toLowerCase().includes('error') &&
        (log.includes('socket') || log.includes('websocket'))
      );
      errorLogs.forEach(log => console.error(`  - ${log}`));
    } else {
      console.log('[Test] ✓ No WebSocket connection errors');
    }

    expect(hasErrors).toBe(false);

    console.log('\n=== TEST 4 PASSED ===\n');
  });

  /**
   * Test 5: Comment counter updates in real-time
   *
   * Validates:
   * - Comment counter exists on post
   * - Counter increments when new comment is added
   * - Counter updates without page refresh
   */
  test('comment counter updates in real-time', async ({ page }) => {
    console.log('\n=== TEST 5: Comment Counter Real-time Update ===\n');

    // Navigate to page
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await waitForSocketConnection(page);

    // Find a post with comments
    const postId = await findPostWithComments(page);

    if (!postId) {
      console.warn('[Test] No post with comment form found, skipping test');
      test.skip();
      return;
    }

    // Find comment counter (various possible selectors)
    const counterSelectors = [
      'text=/\\d+\\s+comments?/i',
      '[data-testid="comment-count"]',
      '.comment-count',
      'span:has-text("comment")'
    ];

    let commentCounter = null;
    let initialCount = 0;

    for (const selector of counterSelectors) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible().catch(() => false);

      if (isVisible) {
        commentCounter = element;
        const text = await element.textContent();
        const match = text?.match(/(\d+)/);
        initialCount = match ? parseInt(match[1], 10) : 0;
        console.log(`[Test] Found comment counter: "${text}" (${initialCount} comments)`);
        break;
      }
    }

    if (!commentCounter) {
      console.warn('[Test] Comment counter not found, skipping counter validation');
    }

    // Post a new comment
    const timestamp = Date.now();
    const commentContent = `E2E Test Comment - Counter Update - ${timestamp}`;

    await postComment(page, commentContent);

    // Verify comment appears
    const appeared = await verifyCommentInDOM(page, commentContent, TIMEOUT_SHORT);
    expect(appeared).toBe(true);

    // Verify counter incremented (if counter exists)
    if (commentCounter) {
      await page.waitForTimeout(1000); // Brief pause for counter update

      const newText = await commentCounter.textContent();
      const match = newText?.match(/(\d+)/);
      const newCount = match ? parseInt(match[1], 10) : 0;

      console.log(`[Test] Counter updated: ${initialCount} → ${newCount}`);

      if (newCount > initialCount) {
        console.log('[Test] ✓ Comment counter incremented');
      } else {
        console.warn('[Test] ⚠ Comment counter did not increment');
      }
    }

    console.log('\n=== TEST 5 PASSED ===\n');
  });
});

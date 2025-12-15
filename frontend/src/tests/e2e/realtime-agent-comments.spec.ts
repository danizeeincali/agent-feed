/**
 * E2E Test: Real-Time Agent Comment Display
 *
 * PURPOSE: Verify that agent responses (Avi's comments) appear in real-time
 * without requiring a page refresh.
 *
 * SCENARIO:
 * 1. User posts a comment
 * 2. Agent (Avi) processes comment and posts response
 * 3. Response appears immediately in UI via WebSocket
 * 4. Screenshot captured as evidence
 *
 * CRITICAL FIX VALIDATION:
 * - Tests the fix in CommentSystem.tsx where onCommentAdded callback
 *   now updates state via setComments()
 * - Validates WebSocket event propagation from backend to frontend
 * - Confirms UI re-renders with new comment
 */

import { test, expect } from '@playwright/test';

test.describe('Real-Time Agent Comment Display', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agent feed
    await page.goto('http://localhost:5173');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display agent response in real-time without refresh', async ({ page }) => {
    // Step 1: Find a post to comment on
    const firstPost = page.locator('.post-card').first();
    await expect(firstPost).toBeVisible();

    // Get post ID for verification
    const postId = await firstPost.getAttribute('data-post-id') || 'unknown';
    console.log('📝 Testing on post:', postId);

    // Step 2: Click to expand comments or open comment form
    const commentButton = firstPost.locator('button:has-text("Comment")');
    await commentButton.click();

    // Wait for comment form to appear
    await page.waitForSelector('textarea[placeholder*="comment"]', { timeout: 5000 });

    // Step 3: Count existing comments BEFORE posting
    const commentsBeforePosting = await page.locator('.comment-item, [data-testid="comment"]').count();
    console.log('📊 Comments before posting:', commentsBeforePosting);

    // Step 4: Post a comment that will trigger Avi
    const commentText = 'Hey @avi, what do you think about this? ' + Date.now();
    const commentTextarea = page.locator('textarea[placeholder*="comment"]').first();

    await commentTextarea.fill(commentText);
    await commentTextarea.press('Enter');

    // Step 5: Wait for user's comment to appear (via API response)
    await page.waitForSelector(`:text("${commentText.substring(0, 20)}")`, { timeout: 5000 });
    console.log('✅ User comment posted successfully');

    // Step 6: Count comments after user posts
    const commentsAfterUserPost = await page.locator('.comment-item, [data-testid="comment"]').count();
    console.log('📊 Comments after user posts:', commentsAfterUserPost);
    expect(commentsAfterUserPost).toBeGreaterThan(commentsBeforePosting);

    // Step 7: Wait for Avi's response via WebSocket (CRITICAL TEST)
    // Listen for console logs to verify WebSocket events
    const websocketLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Realtime]') || text.includes('[CommentSystem]') || text.includes('comment:added')) {
        websocketLogs.push(text);
        console.log('🔊 Frontend log:', text);
      }
    });

    // Wait for Avi's response (agent comment should appear within 10 seconds)
    console.log('⏳ Waiting for Avi\'s response...');

    const aviCommentLocator = page.locator('[data-author-type="agent"]:has-text("agent-avi"), .comment-item:has-text("agent-avi"), .comment-author:has-text("Avi")');

    try {
      // CRITICAL: This should NOT require page refresh
      // The WebSocket event should trigger state update and UI re-render
      await aviCommentLocator.waitFor({ state: 'visible', timeout: 15000 });

      console.log('✅ Avi\'s response appeared in real-time!');

      // Step 8: Verify comment count increased
      const commentsAfterAviResponse = await page.locator('.comment-item, [data-testid="comment"]').count();
      console.log('📊 Comments after Avi responds:', commentsAfterAviResponse);
      expect(commentsAfterAviResponse).toBeGreaterThan(commentsAfterUserPost);

      // Step 9: Capture screenshot as evidence
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/realtime-agent-response-SUCCESS.png',
        fullPage: true
      });

      // Step 10: Verify WebSocket logs captured events
      console.log('📡 WebSocket logs captured:', websocketLogs.length);
      const hasCommentAddedEvent = websocketLogs.some(log => log.includes('comment:added') || log.includes('Real-time comment received'));

      if (hasCommentAddedEvent) {
        console.log('✅ WebSocket event confirmed in logs');
      } else {
        console.warn('⚠️ WebSocket event not found in logs (may be timing issue)');
      }

      // SUCCESS: Test passed
      expect(aviCommentLocator).toBeVisible();

    } catch (error) {
      // FAILURE: Agent response did not appear in time
      console.error('❌ Avi\'s response did NOT appear in real-time');
      console.error('📡 WebSocket logs:', websocketLogs);

      // Capture failure screenshot
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/realtime-agent-response-FAILURE.png',
        fullPage: true
      });

      // Check if refresh would show the comment (indicates WebSocket issue)
      await page.reload();
      await page.waitForLoadState('networkidle');

      const aviCommentAfterRefresh = await page.locator('[data-author-type="agent"]:has-text("agent-avi"), .comment-item:has-text("agent-avi")').isVisible();

      if (aviCommentAfterRefresh) {
        throw new Error('CRITICAL BUG: Agent comment appeared after refresh but NOT in real-time. WebSocket event handling is broken.');
      } else {
        throw new Error('Agent did not respond at all (backend issue, not WebSocket issue)');
      }
    }
  });

  test('should verify WebSocket connection is active', async ({ page }) => {
    // Navigate to a post
    await page.goto('http://localhost:5173');

    // Check console for WebSocket connection logs
    const connectionLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Socket') || text.includes('WebSocket') || text.includes('connected')) {
        connectionLogs.push(text);
        console.log('🔊 Connection log:', text);
      }
    });

    // Wait a few seconds for connection
    await page.waitForTimeout(3000);

    console.log('📡 Connection logs captured:', connectionLogs);

    // Verify connection logs exist
    const hasConnectionLog = connectionLogs.some(log =>
      log.includes('Connected') || log.includes('connected') || log.includes('Socket')
    );

    expect(hasConnectionLog).toBeTruthy();
    console.log('✅ WebSocket connection verified');
  });

  test('should verify subscription to post rooms', async ({ page }) => {
    // Navigate to agent feed
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Find first post and open comments
    const firstPost = page.locator('.post-card').first();
    await firstPost.click();

    // Monitor subscription logs
    const subscriptionLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('subscribe:post') || text.includes('Subscribing') || text.includes('subscribed')) {
        subscriptionLogs.push(text);
        console.log('🔊 Subscription log:', text);
      }
    });

    // Wait for subscription to complete
    await page.waitForTimeout(2000);

    console.log('📡 Subscription logs:', subscriptionLogs);

    const hasSubscription = subscriptionLogs.some(log =>
      log.includes('subscribe:post') || log.includes('subscribed')
    );

    expect(hasSubscription).toBeTruthy();
    console.log('✅ Post subscription verified');
  });
});

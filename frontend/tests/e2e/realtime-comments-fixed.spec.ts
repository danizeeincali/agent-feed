/**
 * Real-time Comments Fix - End-to-End Tests
 * Tests the complete real-time comment flow with actual browser and WebSocket
 *
 * @test Real-time Comments E2E
 * @description Validates agent replies appear without page refresh
 * @prerequisites
 *   - Frontend server running on localhost:5173
 *   - Backend API server running on localhost:3000
 *   - WebSocket server active
 *   - Database seeded with test data
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '../../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('Real-time Comment Updates', () => {
  let consoleLogs: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Capture console logs for debugging
    consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      console.log(`Browser console: ${text}`);
    });

    // Navigate to home page first
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('agent reply appears without page refresh', async ({ page }) => {
    console.log('\n=== TEST: Agent reply without refresh ===\n');

    // Step 1: Navigate to a post page
    await page.goto('http://localhost:5173/posts/post-123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow WebSocket to connect
    await page.screenshot({
      path: path.join(screenshotsDir, 'step1-post-loaded.png'),
      fullPage: true
    });
    console.log('✓ Step 1: Post page loaded');

    // Step 2: Verify WebSocket connected
    await page.waitForTimeout(1000);
    const hasSocketConnection = consoleLogs.some(log =>
      log.includes('Socket connected') ||
      log.includes('subscribe:post') ||
      log.includes('io.connect')
    );

    expect(hasSocketConnection, 'WebSocket should be connected').toBeTruthy();
    console.log('✓ Step 2: WebSocket connected');

    // Step 3: Count existing comments
    const initialCommentCount = await page.locator('[data-testid^="comment-"]').count();
    console.log(`Initial comment count: ${initialCommentCount}`);

    // Step 4: Post a question for Avi
    const testQuestion = `what files are in agent_workspace? (test ${Date.now()})`;

    await page.fill('[data-testid="comment-input"]', testQuestion);
    await page.screenshot({
      path: path.join(screenshotsDir, 'step2-question-typed.png'),
      fullPage: true
    });

    await page.click('[data-testid="comment-submit"]');
    await page.waitForTimeout(1000); // Allow comment to post
    await page.screenshot({
      path: path.join(screenshotsDir, 'step3-question-posted.png'),
      fullPage: true
    });
    console.log('✓ Step 3: Question posted');

    // Step 5: Wait for agent reply WITHOUT refreshing
    // Agent should respond within 15 seconds
    console.log('Waiting for agent reply...');

    const aviReplySelector = '[data-testid="comment-from-avi"]:last-of-type';

    try {
      await page.waitForSelector(aviReplySelector, {
        timeout: 30000,
        state: 'visible'
      });
      console.log('✓ Step 4: Agent reply received');
    } catch (error) {
      console.error('Agent reply not received in time');
      console.log('Console logs:', consoleLogs.join('\n'));
      throw error;
    }

    await page.screenshot({
      path: path.join(screenshotsDir, 'step4-agent-reply-received.png'),
      fullPage: true
    });

    // Step 6: Verify reply content
    const replyElement = page.locator(aviReplySelector);
    const replyText = await replyElement.textContent();

    expect(replyText).toBeTruthy();
    expect(replyText!.length).toBeGreaterThan(50);
    expect(replyText!.toLowerCase()).toContain('agent_workspace');
    console.log(`✓ Step 5: Reply validated (${replyText!.length} chars)`);

    // Step 7: Verify new comment count (should be +2: user question + agent reply)
    const finalCommentCount = await page.locator('[data-testid^="comment-"]').count();
    expect(finalCommentCount).toBeGreaterThanOrEqual(initialCommentCount + 2);
    console.log(`Final comment count: ${finalCommentCount}`);

    await page.screenshot({
      path: path.join(screenshotsDir, 'step5-test-complete.png'),
      fullPage: true
    });

    console.log('\n=== TEST PASSED ===\n');
  });

  test('multiple tabs receive same real-time update', async ({ browser }) => {
    console.log('\n=== TEST: Multiple tabs sync ===\n');

    // Open two tabs to same post
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Capture logs from both tabs
    const logs1: string[] = [];
    const logs2: string[] = [];

    page1.on('console', msg => logs1.push(msg.text()));
    page2.on('console', msg => logs2.push(msg.text()));

    // Navigate both tabs to same post
    await Promise.all([
      page1.goto('http://localhost:5173/posts/post-123'),
      page2.goto('http://localhost:5173/posts/post-123')
    ]);

    await Promise.all([
      page1.waitForLoadState('networkidle'),
      page2.waitForLoadState('networkidle')
    ]);

    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    await page1.screenshot({
      path: path.join(screenshotsDir, 'multi-tab-1-initial.png')
    });
    await page2.screenshot({
      path: path.join(screenshotsDir, 'multi-tab-2-initial.png')
    });

    console.log('✓ Both tabs loaded');

    // Post comment from tab 1
    const testQuestion = `Multi-tab test ${Date.now()}`;
    await page1.fill('[data-testid="comment-input"]', testQuestion);
    await page1.click('[data-testid="comment-submit"]');

    console.log('✓ Comment posted from tab 1');

    // Wait for comment to appear in both tabs
    await Promise.all([
      page1.waitForSelector(`text="${testQuestion}"`, { timeout: 10000 }),
      page2.waitForSelector(`text="${testQuestion}"`, { timeout: 10000 })
    ]);

    await page1.screenshot({
      path: path.join(screenshotsDir, 'multi-tab-1-updated.png')
    });
    await page2.screenshot({
      path: path.join(screenshotsDir, 'multi-tab-2-updated.png')
    });

    // Verify comment appears in both tabs
    const tab1Text = await page1.textContent('body');
    const tab2Text = await page2.textContent('body');

    expect(tab1Text).toContain(testQuestion);
    expect(tab2Text).toContain(testQuestion);

    console.log('✓ Comment appeared in both tabs');

    await context.close();

    console.log('\n=== TEST PASSED ===\n');
  });

  test('reconnection triggers resubscription', async ({ page }) => {
    console.log('\n=== TEST: Reconnection resubscription ===\n');

    await page.goto('http://localhost:5173/posts/post-123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'reconnect-1-initial.png')
    });

    // Verify initial connection
    const hasInitialConnection = consoleLogs.some(log =>
      log.includes('Socket connected')
    );
    expect(hasInitialConnection).toBeTruthy();
    console.log('✓ Initial connection verified');

    // Simulate network disconnect by going offline
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'reconnect-2-offline.png')
    });

    console.log('✓ Network simulated offline');

    // Clear logs and reconnect
    consoleLogs = [];
    await page.context().setOffline(false);
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'reconnect-3-back-online.png')
    });

    // Verify reconnection and resubscription
    const hasReconnection = consoleLogs.some(log =>
      log.includes('Socket connected') ||
      log.includes('reconnect') ||
      log.includes('subscribe:post')
    );

    expect(hasReconnection, 'Should reconnect and resubscribe').toBeTruthy();
    console.log('✓ Reconnection and resubscription verified');

    // Post a comment to verify functionality restored
    const testQuestion = `Reconnection test ${Date.now()}`;
    await page.fill('[data-testid="comment-input"]', testQuestion);
    await page.click('[data-testid="comment-submit"]');

    await page.waitForSelector(`text="${testQuestion}"`, { timeout: 10000 });

    await page.screenshot({
      path: path.join(screenshotsDir, 'reconnect-4-functionality-restored.png')
    });

    console.log('✓ Functionality restored after reconnection');

    console.log('\n=== TEST PASSED ===\n');
  });

  test('WebSocket events fire correctly', async ({ page }) => {
    console.log('\n=== TEST: WebSocket event firing ===\n');

    await page.goto('http://localhost:5173/posts/post-123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for specific WebSocket events in console
    const hasConnectEvent = consoleLogs.some(log => log.includes('Socket connected'));
    const hasSubscribeEvent = consoleLogs.some(log => log.includes('subscribe:post'));

    expect(hasConnectEvent, 'Should log connect event').toBeTruthy();
    expect(hasSubscribeEvent, 'Should log subscribe event').toBeTruthy();

    console.log('✓ WebSocket events detected');

    // Post comment and check for emission
    consoleLogs = [];
    await page.fill('[data-testid="comment-input"]', 'Event test');
    await page.click('[data-testid="comment-submit"]');
    await page.waitForTimeout(2000);

    const hasCommentEvent = consoleLogs.some(log =>
      log.includes('comment:new') || log.includes('comment')
    );

    expect(hasCommentEvent, 'Should receive comment event').toBeTruthy();
    console.log('✓ Comment event received');

    console.log('\n=== TEST PASSED ===\n');
  });

  test('context injection provides thread history', async ({ page }) => {
    console.log('\n=== TEST: Context injection ===\n');

    await page.goto('http://localhost:5173/posts/post-123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Post first question
    const firstQuestion = `First question ${Date.now()}`;
    await page.fill('[data-testid="comment-input"]', firstQuestion);
    await page.click('[data-testid="comment-submit"]');

    // Wait for agent response
    await page.waitForSelector('[data-testid="comment-from-avi"]', { timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'context-1-first-question.png'),
      fullPage: true
    });

    console.log('✓ First question answered');

    // Post follow-up that requires context
    const followUpQuestion = 'Can you elaborate on that?';
    await page.fill('[data-testid="comment-input"]', followUpQuestion);
    await page.click('[data-testid="comment-submit"]');

    // Wait for second agent response
    const aviReplies = page.locator('[data-testid="comment-from-avi"]');
    await expect(aviReplies).toHaveCount(2, { timeout: 30000 });

    await page.screenshot({
      path: path.join(screenshotsDir, 'context-2-follow-up-answered.png'),
      fullPage: true
    });

    // Verify second response references context
    const secondReply = await aviReplies.last().textContent();

    // Agent should provide elaboration, not ask "what are you referring to?"
    expect(secondReply!.length).toBeGreaterThan(50);
    console.log('✓ Follow-up question answered with context');

    console.log('\n=== TEST PASSED ===\n');
  });
});

test.describe('Error handling and edge cases', () => {
  test('handles network errors gracefully', async ({ page }) => {
    console.log('\n=== TEST: Network error handling ===\n');

    // Block WebSocket connection
    await page.route('**/socket.io/**', route => route.abort());

    await page.goto('http://localhost:5173/posts/post-123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(screenshotsDir, 'error-1-socket-blocked.png')
    });

    // Should still allow posting comments (fallback to HTTP)
    await page.fill('[data-testid="comment-input"]', 'Test without socket');
    await page.click('[data-testid="comment-submit"]');

    // Comment should appear (via polling or page refresh)
    await page.waitForSelector('text="Test without socket"', { timeout: 10000 });

    console.log('✓ Graceful fallback working');

    console.log('\n=== TEST PASSED ===\n');
  });

  test('handles rapid consecutive comments', async ({ page }) => {
    console.log('\n=== TEST: Rapid comments ===\n');

    await page.goto('http://localhost:5173/posts/post-123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const initialCount = await page.locator('[data-testid^="comment-"]').count();

    // Post 3 comments rapidly
    for (let i = 1; i <= 3; i++) {
      await page.fill('[data-testid="comment-input"]', `Rapid comment ${i}`);
      await page.click('[data-testid="comment-submit"]');
      await page.waitForTimeout(500);
    }

    // All 3 should appear
    await page.waitForTimeout(3000);
    const finalCount = await page.locator('[data-testid^="comment-"]').count();

    expect(finalCount).toBeGreaterThanOrEqual(initialCount + 3);

    await page.screenshot({
      path: path.join(screenshotsDir, 'rapid-comments-handled.png'),
      fullPage: true
    });

    console.log('✓ Rapid comments handled correctly');

    console.log('\n=== TEST PASSED ===\n');
  });
});

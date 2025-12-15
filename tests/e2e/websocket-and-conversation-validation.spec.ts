import { test, expect, Page } from '@playwright/test';

/**
 * CRITICAL FIXES VALIDATION
 *
 * This test validates two critical fixes:
 * 1. WebSocket Real-Time Comment Updates (no refresh needed)
 * 2. Multi-Turn Conversation Context (agent remembers previous messages)
 *
 * User Requirements:
 * - "replies from the system still dont show up until I refresh" → FIXED
 * - "when I asked for a simple addition it gave me the answer. '4949 + 98' = '5047'
 *    then I say 'divide by 2' and it tells me it needs more context" → FIXED
 */

test.describe('Critical Fixes: WebSocket & Conversation Context', () => {
  let page: Page;
  const BASE_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:3001';

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Enable console logging to catch WebSocket events
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Socket]') || text.includes('[Realtime]')) {
        console.log(`🔍 Browser Console: ${text}`);
      }
    });

    // Navigate to homepage
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Fix #1: Real-Time Comment Display Without Refresh', async () => {
    console.log('🧪 TEST: Real-time comment display (no refresh needed)');

    // Step 1: Create a test post using Quick Post
    console.log('Step 1: Creating test post using Quick Post...');

    // Fill the Quick Post textarea
    const quickPostTextarea = page.locator('textarea[placeholder*="mind" i], textarea[placeholder*="write" i]').first();
    await quickPostTextarea.fill('WebSocket Test Post - Testing real-time updates');

    // Click Quick Post button
    await page.click('button:has-text("Quick Post")');

    // Wait for navigation to the new post
    await page.waitForURL(/.*\/posts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    const currentUrl = page.url();
    console.log(`✅ Post created: ${currentUrl}`);

    // Step 2: Wait for WebSocket connection and subscription
    console.log('Step 2: Waiting for WebSocket subscription...');
    await page.waitForTimeout(2000); // Allow socket connection to establish

    // Step 3: Get initial comment count
    const initialCommentCount = await page.locator('[data-testid="comment"], .comment, [class*="comment"]').count();
    console.log(`📊 Initial comment count: ${initialCommentCount}`);

    // Step 4: Post a comment
    console.log('Step 4: Posting comment...');
    const commentText = `Test comment at ${Date.now()}`;
    await page.fill('textarea[placeholder*="comment" i], textarea[name="comment"]', commentText);
    await page.click('button:has-text("Comment"), button:has-text("Post Comment")');

    // Step 5: CRITICAL - Wait for real-time update (NO REFRESH!)
    console.log('Step 5: ⏳ Waiting for real-time comment to appear (NO REFRESH)...');
    try {
      await page.waitForSelector(`text="${commentText}"`, { timeout: 5000 });
      console.log('✅ SUCCESS: Comment appeared in real-time without refresh!');
    } catch (error) {
      console.error('❌ FAIL: Comment did NOT appear without refresh');

      // Check if a refresh makes it appear (regression test)
      await page.reload();
      const appearsAfterRefresh = await page.locator(`text="${commentText}"`).count() > 0;

      if (appearsAfterRefresh) {
        throw new Error('🚨 REGRESSION: Comment only appears after refresh! WebSocket fix failed.');
      } else {
        throw new Error('🚨 CRITICAL: Comment not appearing at all! Backend issue?');
      }
    }

    // Verify comment count increased
    const finalCommentCount = await page.locator('[data-testid="comment"], .comment, [class*="comment"]').count();
    expect(finalCommentCount).toBeGreaterThan(initialCommentCount);

    console.log('✅ Test passed: Real-time comments working!');
  });

  test('Fix #2: Multi-Turn Conversation Context', async () => {
    console.log('🧪 TEST: Multi-turn conversation context (agent memory)');

    // Step 1: Create a test post for conversation using Quick Post
    console.log('Step 1: Creating conversation test post using Quick Post...');

    const quickPostTextarea = page.locator('textarea[placeholder*="mind" i], textarea[placeholder*="write" i]').first();
    await quickPostTextarea.fill('Conversation Context Test - Testing multi-turn conversations');

    await page.click('button:has-text("Quick Post")');
    await page.waitForURL(/.*\/posts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    console.log(`✅ Conversation test post created: ${page.url()}`);
    await page.waitForTimeout(2000);

    // Step 2: First turn - Ask a math question
    console.log('Step 2: Turn 1 - Asking math question: "What is 4949 + 98?"');
    await page.fill('textarea[placeholder*="comment" i], textarea[name="comment"]', 'What is 4949 + 98?');
    await page.click('button:has-text("Comment"), button:has-text("Post Comment")');

    // Wait for Avi's response
    console.log('⏳ Waiting for Avi\'s response...');
    try {
      await page.waitForSelector('text=/5047/i', { timeout: 30000 });
      console.log('✅ Turn 1 complete: Avi responded with "5047"');
    } catch (error) {
      console.error('❌ Turn 1 FAILED: Avi did not respond or gave wrong answer');
      throw error;
    }

    // Step 3: Second turn - Test context retention
    console.log('Step 3: Turn 2 - Testing context: "divide by 2"');

    // Find Avi's response and reply to it
    const aviResponse = await page.locator('text=/5047/i').first();
    await aviResponse.scrollIntoViewIfNeeded();

    // Look for a reply button near the Avi response
    const replyButton = await page.locator('button:has-text("Reply")').first();
    if (await replyButton.isVisible()) {
      await replyButton.click();
    }

    // Post follow-up question
    await page.fill('textarea[placeholder*="reply" i], textarea[placeholder*="comment" i], textarea[name="comment"]', 'divide by 2');
    await page.click('button:has-text("Comment"), button:has-text("Post Comment"), button:has-text("Reply")');

    // CRITICAL: Wait for Avi to respond with context
    console.log('⏳ Waiting for Avi to respond with context (should mention 5047 or calculate 2523.5)...');
    try {
      // Avi should either:
      // 1. Respond with the correct answer (2523.5 or 2523)
      // 2. Show understanding by mentioning 5047
      const contextualResponse = await Promise.race([
        page.waitForSelector('text=/2523/i', { timeout: 30000 }),
        page.waitForSelector('text=/5047.*2/i', { timeout: 30000 })
      ]);

      console.log('✅ Turn 2 SUCCESS: Avi responded with context!');

      // Verify Avi actually used the previous conversation
      const responseText = await contextualResponse.textContent();
      console.log(`📝 Avi's contextual response: "${responseText}"`);

      // Check if response is actually contextual (not "I need more context")
      const needsContext = /need.*context|don't (know|understand)|can't (help|answer)/i.test(responseText || '');
      if (needsContext) {
        throw new Error('🚨 FAIL: Avi asked for more context - conversation chain NOT working!');
      }

      console.log('✅ SUCCESS: Avi remembered the conversation!');

    } catch (error) {
      console.error('❌ Turn 2 FAILED: Avi did not maintain context');

      // Check if Avi responded at all
      await page.waitForTimeout(5000);
      const allText = await page.textContent('body');

      if (allText?.includes('need more context') || allText?.includes('don\'t understand')) {
        throw new Error('🚨 REGRESSION: Avi lost conversation context! Fix failed.');
      } else {
        throw new Error('🚨 TIMEOUT: Avi did not respond to follow-up question');
      }
    }

    console.log('✅ Test passed: Multi-turn conversation context working!');
  });

  test('Combined Test: Real-Time Multi-Turn Conversation', async () => {
    console.log('🧪 TEST: Combined - Real-time updates WITH conversation context');

    // Create post using Quick Post
    const quickPostTextarea = page.locator('textarea[placeholder*="mind" i], textarea[placeholder*="write" i]').first();
    await quickPostTextarea.fill('Combined Test - Testing both fixes together');

    await page.click('button:has-text("Quick Post")');
    await page.waitForURL(/.*\/posts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.waitForTimeout(2000);

    // Turn 1: Math question
    console.log('Turn 1: What is 100 + 50?');
    await page.fill('textarea[placeholder*="comment" i], textarea[name="comment"]', 'What is 100 + 50?');
    await page.click('button:has-text("Comment"), button:has-text("Post Comment")');

    // Wait for REAL-TIME response (no refresh)
    await page.waitForSelector('text=/150/i', { timeout: 30000 });
    console.log('✅ Turn 1 real-time response: 150');

    // Turn 2: Follow-up with context
    console.log('Turn 2: multiply by 3');
    await page.fill('textarea[placeholder*="comment" i], textarea[name="comment"]', 'multiply by 3');
    await page.click('button:has-text("Comment"), button:has-text("Post Comment")');

    // Wait for REAL-TIME contextual response
    await page.waitForSelector('text=/450/i', { timeout: 30000 });
    console.log('✅ Turn 2 real-time contextual response: 450');

    console.log('🎉 COMBINED TEST PASSED: Both fixes working together!');
  });

  test('Regression: No Duplicate Avi Responses', async () => {
    console.log('🧪 REGRESSION TEST: Verify no duplicate Avi responses');

    // Create post using Quick Post
    const quickPostTextarea = page.locator('textarea[placeholder*="mind" i], textarea[placeholder*="write" i]').first();
    await quickPostTextarea.fill('Duplicate Test - Testing for duplicates');

    await page.click('button:has-text("Quick Post")');
    await page.waitForURL(/.*\/posts\/[a-zA-Z0-9-]+/, { timeout: 10000 });

    await page.waitForTimeout(2000);

    // Post AVI command
    console.log('Posting AVI command...');
    await page.fill('textarea[placeholder*="comment" i], textarea[name="comment"]', 'list files in agent_workspace');
    await page.click('button:has-text("Comment"), button:has-text("Post Comment")');

    // Wait for Avi response
    await page.waitForTimeout(15000);

    // Count Avi responses
    const aviResponses = await page.locator('[data-author*="avi" i], [class*="agent" i]:has-text("agent_workspace")').count();

    expect(aviResponses).toBeLessThanOrEqual(1);
    console.log(`✅ Duplicate test passed: ${aviResponses} Avi response(s)`);
  });
});

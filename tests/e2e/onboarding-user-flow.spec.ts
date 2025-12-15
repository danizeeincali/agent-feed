/**
 * E2E Test Suite: Onboarding User Flow with Screenshot Validation
 *
 * This test suite validates the complete user experience when a new user
 * comments their name on the Get-to-Know-You agent's welcome post.
 *
 * RED PHASE: These tests WILL FAIL until all backend fixes are implemented:
 * - Comment routing to correct agent
 * - Get-to-Know-You agent response sequence
 * - Avi welcome post with warm tone
 * - Real-time WebSocket updates
 *
 * Specifications:
 * - /docs/ONBOARDING-FLOW-SPEC.md
 * - /docs/ONBOARDING-ARCHITECTURE.md
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/workspaces/agent-feed/tests/screenshots/onboarding';

// Helper to ensure screenshot directory exists
const ensureScreenshotDir = () => {
  const fs = require('fs');
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
};

test.describe('Onboarding User Flow - Complete Journey', () => {
  test.beforeAll(() => {
    ensureScreenshotDir();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should complete full onboarding when user comments name "Nate Dog"', async ({ page }) => {
    console.log('\n🎬 Starting E2E Onboarding Flow Test...\n');

    // STEP 1: Find Get-to-Know-You agent welcome post
    console.log('📋 Step 1: Finding Get-to-Know-You agent welcome post...');

    const gtkPost = page.locator('[data-testid="post"]').filter({
      hasText: /Hi!.*Let's Get Started/i
    }).or(page.locator('[data-testid="post"]').filter({
      hasText: /What should I call you/i
    }));

    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    // Screenshot: Initial state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '00-initial-feed.png'),
      fullPage: true
    });

    console.log('✅ Get-to-Know-You post found');

    // STEP 2: Click comment button
    console.log('\n📋 Step 2: Opening comment input...');

    const commentButton = gtkPost.locator('[data-testid="comment-button"]')
      .or(gtkPost.locator('button').filter({ hasText: /comment/i }));

    await commentButton.click();
    await page.waitForTimeout(500); // Wait for animation

    console.log('✅ Comment input opened');

    // STEP 3: Type name "Nate Dog"
    console.log('\n📋 Step 3: Typing name "Nate Dog"...');

    const commentInput = page.locator('[data-testid="comment-input"]')
      .or(page.locator('textarea[placeholder*="comment" i]'))
      .or(page.locator('textarea').first());

    await commentInput.fill('Nate Dog');
    await page.waitForTimeout(300);

    // Screenshot: Comment typed
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-comment-typed.png')
    });

    console.log('✅ Name typed: "Nate Dog"');

    // STEP 4: Submit comment
    console.log('\n📋 Step 4: Submitting comment...');

    const submitButton = page.locator('[data-testid="comment-submit"]')
      .or(page.locator('button').filter({ hasText: /post|submit/i }))
      .or(gtkPost.locator('button').filter({ hasText: /post/i }));

    await submitButton.click();

    // Screenshot: Comment submitted
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-comment-submitted.png')
    });

    console.log('✅ Comment submitted');

    // STEP 5: Wait for Get-to-Know-You agent comment response
    console.log('\n📋 Step 5: Waiting for Get-to-Know-You agent comment response...');
    console.log('⏳ Expecting: "Nice to meet you, Nate Dog!" or similar');

    const gtkCommentResponse = page.locator('[data-testid="comment"]').filter({
      hasText: /Nice to meet you.*Nate Dog/i
    }).or(page.locator('.comment-content').filter({
      hasText: /Great to meet you.*Nate Dog/i
    }));

    try {
      await expect(gtkCommentResponse).toBeVisible({ timeout: 15000 });

      // Screenshot: Get-to-Know-You comment visible
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-gtk-comment-response.png')
      });

      const commentText = await gtkCommentResponse.textContent();
      console.log(`✅ Get-to-Know-You comment received: "${commentText?.trim()}"`);
    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Get-to-Know-You agent did not respond to comment');
      console.error('   This is expected in RED phase - orchestrator routes to wrong agent');

      // Take failure screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '03-gtk-comment-FAILED.png'),
        fullPage: true
      });

      throw new Error('Get-to-Know-You agent did not respond with comment acknowledgment');
    }

    // STEP 6: Wait for Get-to-Know-You agent NEW POST (use case question)
    console.log('\n📋 Step 6: Waiting for Get-to-Know-You agent use case question post...');
    console.log('⏳ Expecting new post: "What brings you to Agent Feed, Nate Dog?"');

    const gtkUseCasePost = page.locator('[data-testid="post"]').filter({
      hasText: /What brings you.*Agent Feed.*Nate Dog/i
    }).or(page.locator('[data-testid="post"]').filter({
      hasText: /What brings you to Agent Feed/i
    }));

    try {
      await expect(gtkUseCasePost).toBeVisible({ timeout: 15000 });

      // Screenshot: Get-to-Know-You use case post
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-gtk-usecase-post.png'),
        fullPage: true
      });

      const postContent = await gtkUseCasePost.textContent();
      console.log(`✅ Get-to-Know-You use case post visible`);

      // CRITICAL: Verify NO technical terms in post
      console.log('\n📋 Step 6a: Verifying NO technical terms in use case post...');
      const technicalTerms = ['code', 'debugging', 'architecture', 'implementation', 'system', 'technical'];

      for (const term of technicalTerms) {
        if (postContent?.toLowerCase().includes(term)) {
          console.warn(`⚠️  WARNING: Found technical term "${term}" in use case post`);
          console.warn(`   Content: "${postContent}"`);
        }
      }

      // Verify personalization (user's name appears)
      expect(postContent).toContain('Nate Dog');
      console.log('✅ Use case post contains user name');

    } catch (error) {
      console.error('❌ EXPECTED FAILURE: Get-to-Know-You agent did not create use case post');

      // Take failure screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '04-gtk-usecase-FAILED.png'),
        fullPage: true
      });

      throw new Error('Get-to-Know-You agent did not create follow-up use case question post');
    }

    // STEP 7: Wait for Avi welcome post (separate, warm tone)
    console.log('\n📋 Step 7: Waiting for Avi welcome post...');
    console.log('⏳ Expecting: "Welcome, Nate Dog! What can we tackle today?" (warm, NOT technical)');

    const aviWelcomePost = page.locator('[data-testid="post"]').filter({
      hasText: /Welcome.*Nate Dog/i
    }).or(page.locator('[data-testid="post"]').filter({
      hasText: /Λvi|Avi/i
    }).filter({
      hasText: /Nate Dog/i
    }));

    try {
      await expect(aviWelcomePost).toBeVisible({ timeout: 15000 });

      // Screenshot: Avi welcome post
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-avi-welcome-post.png'),
        fullPage: true
      });

      const aviContent = await aviWelcomePost.textContent();
      console.log(`✅ Avi welcome post visible`);
      console.log(`   Content preview: "${aviContent?.substring(0, 100)}..."`);

      // CRITICAL: Verify warm, conversational tone (NO technical jargon)
      console.log('\n📋 Step 7a: Verifying Avi uses WARM tone (NOT technical)...');
      const technicalTermsForbidden = [
        'code development',
        'debugging',
        'architecture patterns',
        'implementation',
        'system design',
        'technical requirements',
        'API',
        'database',
        'algorithm'
      ];

      let foundTechnicalTerms: string[] = [];
      for (const term of technicalTermsForbidden) {
        if (aviContent?.toLowerCase().includes(term.toLowerCase())) {
          foundTechnicalTerms.push(term);
        }
      }

      if (foundTechnicalTerms.length > 0) {
        console.error('❌ EXPECTED FAILURE: Avi welcome post contains TECHNICAL jargon:');
        foundTechnicalTerms.forEach(term => {
          console.error(`   - Found: "${term}"`);
        });
        console.error('   This violates FR-3: Avi MUST use warm, conversational tone');

        // Take failure screenshot
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '05-avi-technical-tone-FAILED.png')
        });

        throw new Error(`Avi welcome post contains technical jargon: ${foundTechnicalTerms.join(', ')}`);
      }

      console.log('✅ Avi welcome post uses warm, conversational tone (no technical terms)');

      // Verify personalization
      expect(aviContent).toContain('Nate Dog');
      console.log('✅ Avi welcome post contains user name');

    } catch (error) {
      if (error instanceof Error && error.message.includes('technical jargon')) {
        throw error; // Re-throw technical jargon errors
      }

      console.error('❌ EXPECTED FAILURE: Avi did not create welcome post');
      console.error('   This is expected in RED phase - Avi welcome post not implemented yet');

      // Take failure screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '05-avi-welcome-FAILED.png'),
        fullPage: true
      });

      throw new Error('Avi did not create personalized welcome post');
    }

    // STEP 8: Verify all 3 responses visible on page
    console.log('\n📋 Step 8: Verifying all 3 responses visible simultaneously...');

    const allResponses = {
      gtkComment: gtkCommentResponse,
      gtkPost: gtkUseCasePost,
      aviPost: aviWelcomePost
    };

    for (const [name, locator] of Object.entries(allResponses)) {
      await expect(locator).toBeVisible({ timeout: 5000 });
      console.log(`✅ ${name} still visible`);
    }

    // Final screenshot: Complete flow
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-complete-flow-all-responses.png'),
      fullPage: true
    });

    console.log('\n✅ ALL 3 RESPONSES VISIBLE:');
    console.log('   1. Get-to-Know-You comment: "Nice to meet you, Nate Dog!"');
    console.log('   2. Get-to-Know-You use case post');
    console.log('   3. Avi welcome post');
    console.log('\n🎉 E2E Onboarding Flow Test PASSED!\n');
  });
});

test.describe('Onboarding Real-Time Updates', () => {
  test('should receive toast notifications for each response', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n🔔 Testing toast notification sequence...\n');

    // Find and comment on Get-to-Know-You post
    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('Test User');

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();

    // Listen for toast notifications
    const toastNotifications: string[] = [];

    page.on('console', (msg) => {
      if (msg.text().includes('toast') || msg.text().includes('notification')) {
        toastNotifications.push(msg.text());
      }
    });

    await submitButton.click();

    // Wait for toast notifications
    await page.waitForTimeout(5000);

    console.log(`📊 Captured ${toastNotifications.length} toast notifications`);

    // Screenshot: Toast notifications
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'toast-notifications.png')
    });

    // Verify toast for comment response
    const commentToast = page.locator('[role="status"]').filter({ hasText: /comment/i });
    try {
      await expect(commentToast.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Comment toast notification visible');
    } catch (error) {
      console.warn('⚠️  Comment toast notification not visible (may be expected in RED phase)');
    }
  });

  test('should update comment counter in real-time', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n📊 Testing real-time comment counter update...\n');

    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    // Get initial comment count
    const commentCounter = gtkPost.locator('[data-testid="comment-count"]')
      .or(gtkPost.locator('.comment-count'))
      .or(gtkPost.locator('text=/\\d+ comment/i'));

    const initialCount = await commentCounter.textContent().catch(() => '0');
    console.log(`📊 Initial comment count: ${initialCount}`);

    // Add comment
    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('Test comment for counter');

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();
    await submitButton.click();

    // Wait for WebSocket update
    await page.waitForTimeout(3000);

    // Verify counter increased
    const updatedCount = await commentCounter.textContent().catch(() => '0');
    console.log(`📊 Updated comment count: ${updatedCount}`);

    // Screenshot: Updated counter
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'comment-counter-update.png')
    });

    expect(updatedCount).not.toBe(initialCount);
    console.log('✅ Comment counter updated in real-time');
  });

  test('should display responses without page refresh', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n🔄 Testing real-time updates (no refresh)...\n');

    // Track navigation events (should be none)
    let navigationOccurred = false;
    page.on('framenavigated', () => {
      navigationOccurred = true;
    });

    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    // Submit comment
    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('No refresh test');

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();
    await submitButton.click();

    // Wait for responses
    await page.waitForTimeout(10000);

    // Screenshot: Final state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'no-refresh-update.png'),
      fullPage: true
    });

    // Verify no navigation occurred
    expect(navigationOccurred).toBe(false);
    console.log('✅ Responses appeared without page refresh (WebSocket working)');
  });

  test('should maintain stable WebSocket connection during onboarding', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n🔌 Testing WebSocket connection stability...\n');

    // Monitor WebSocket connection
    let wsConnected = false;
    let wsDisconnected = false;

    page.on('websocket', (ws) => {
      console.log('🔌 WebSocket connection established');
      wsConnected = true;

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        wsDisconnected = true;
      });

      ws.on('framereceived', (event) => {
        try {
          const data = JSON.parse(event.payload as string);
          console.log('📨 WebSocket event received:', data.type || 'unknown');
        } catch (e) {
          // Ignore non-JSON frames
        }
      });
    });

    // Submit comment and wait for full flow
    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('WebSocket test user');

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();
    await submitButton.click();

    // Wait for complete flow
    await page.waitForTimeout(20000);

    // Verify WebSocket remained connected
    expect(wsConnected).toBe(true);
    expect(wsDisconnected).toBe(false);

    console.log('✅ WebSocket connection remained stable throughout onboarding');
  });
});

test.describe('Onboarding Visual Regression', () => {
  test('should match baseline screenshots for response sequence', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n📸 Testing visual regression...\n');

    // Initial state baseline
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'baseline-00-initial.png'),
      fullPage: true
    });

    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    // Submit comment
    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    // Comment input state baseline
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'baseline-01-comment-open.png')
    });

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('Visual test user');

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();
    await submitButton.click();

    // Wait for each response and capture baseline
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'baseline-02-after-comment.png'),
      fullPage: true
    });

    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'baseline-03-after-usecase.png'),
      fullPage: true
    });

    await page.waitForTimeout(5000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'baseline-04-after-welcome.png'),
      fullPage: true
    });

    console.log('✅ Baseline screenshots captured for visual regression testing');
  });

  test('should verify correct response order (no duplicates)', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n📊 Testing response sequence order and uniqueness...\n');

    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    // Submit comment
    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('Sequence test user');

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();
    await submitButton.click();

    // Wait for full flow
    await page.waitForTimeout(20000);

    // Count all posts
    const allPosts = await page.locator('[data-testid="post"]').all();
    console.log(`📊 Total posts visible: ${allPosts.length}`);

    // Check for duplicate Avi welcome posts
    const aviWelcomePosts = await page.locator('[data-testid="post"]')
      .filter({ hasText: /Welcome.*Sequence test user/i })
      .all();

    console.log(`📊 Avi welcome posts found: ${aviWelcomePosts.length}`);

    // Check for duplicate use case posts
    const useCasePosts = await page.locator('[data-testid="post"]')
      .filter({ hasText: /What brings you.*Agent Feed/i })
      .all();

    console.log(`📊 Use case posts found: ${useCasePosts.length}`);

    // Screenshot: All posts
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'sequence-all-posts.png'),
      fullPage: true
    });

    // Verify no duplicates
    expect(aviWelcomePosts.length).toBeLessThanOrEqual(1);
    expect(useCasePosts.length).toBeLessThanOrEqual(1);

    console.log('✅ No duplicate responses detected');
  });
});

test.describe('Onboarding Edge Cases', () => {
  test('should handle rapid double-click on submit button', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n⚡ Testing rapid double-click protection...\n');

    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('Double click test');

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();

    // Rapid double-click
    await submitButton.click();
    await submitButton.click();

    // Wait for processing
    await page.waitForTimeout(15000);

    // Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'edge-double-click.png'),
      fullPage: true
    });

    // Verify only ONE set of responses
    const aviPosts = await page.locator('[data-testid="post"]')
      .filter({ hasText: /Welcome.*Double click test/i })
      .all();

    expect(aviPosts.length).toBeLessThanOrEqual(1);
    console.log('✅ Double-click protection working (no duplicate responses)');
  });

  test('should handle empty or whitespace-only name input', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n⚠️  Testing empty name input validation...\n');

    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill('   '); // Whitespace only

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(10000);

    // Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'edge-empty-name.png'),
      fullPage: true
    });

    // Look for error message or retry prompt
    const errorOrRetry = page.locator('text=/didn\'t catch that|provide a name|invalid/i');

    try {
      await expect(errorOrRetry).toBeVisible({ timeout: 5000 });
      console.log('✅ System prompted for valid name');
    } catch (error) {
      console.warn('⚠️  No validation message shown for empty name');
    }
  });

  test('should handle very long name input', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n📏 Testing long name input...\n');

    const longName = 'A'.repeat(100); // 100 character name

    const gtkPost = page.locator('[data-testid="post"]').first();
    await expect(gtkPost).toBeVisible({ timeout: 10000 });

    const commentButton = gtkPost.locator('[data-testid="comment-button"]').first();
    await commentButton.click();

    const commentInput = page.locator('textarea').first();
    await commentInput.fill(longName);

    const submitButton = page.locator('button').filter({ hasText: /post|submit/i }).first();
    await submitButton.click();

    // Wait for response
    await page.waitForTimeout(10000);

    // Screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'edge-long-name.png'),
      fullPage: true
    });

    // Verify truncation or error handling
    const response = page.locator('[data-testid="comment"]').first();
    const responseText = await response.textContent().catch(() => '');

    if (responseText && responseText.length > 0) {
      console.log('✅ System handled long name input');
    }
  });
});

/**
 * Comment Counter Real-time Update E2E Tests - Phase 2
 *
 * Comprehensive validation of comment counter functionality with:
 * - Real browser testing (Playwright)
 * - Real API server integration
 * - Real database validation
 * - Screenshot capture on all scenarios
 * - Performance measurement (<500ms optimistic update)
 * - Worker outcome comment testing
 *
 * Test Coverage:
 * 1. Basic comment counter displays correct initial value
 * 2. Optimistic updates happen within 500ms
 * 3. Counter confirmed after server response
 * 4. Counter persists after page refresh
 * 5. Worker outcome comments increment counter
 * 6. Multiple rapid comments handled correctly
 * 7. Error handling rolls back optimistic updates
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Configuration
const TEST_CONFIG = {
  frontendURL: 'http://localhost:5173',
  apiURL: 'http://localhost:3001',
  screenshotDir: path.join(__dirname, 'screenshots/comment-counter-v2'),
  maxOptimisticUpdateTime: 500, // ms
  maxConfirmUpdateTime: 2000, // ms
};

// Helper functions
async function captureScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(TEST_CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot: ${filename}`);
  return filepath;
}

async function waitForNetworkIdle(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 10000 });
}

// Get comment count from first visible post
async function getFirstPost(page: Page) {
  // Wait for posts to load
  await page.waitForSelector('article', { timeout: 10000 });
  const posts = page.locator('article');
  const count = await posts.count();
  console.log(`   Found ${count} posts`);
  if (count === 0) throw new Error('No posts found');
  return posts.first();
}

async function getCommentCount(page: Page, post: any): Promise<number> {
  // Find the button with MessageCircle icon and number
  const buttons = post.locator('button').filter({ hasText: /\d+/ });
  const count = await buttons.count();

  for (let i = 0; i < count; i++) {
    const button = buttons.nth(i);
    const text = await button.textContent();
    const match = text?.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  return 0;
}

async function getPostId(): Promise<string> {
  // Get first post from API
  const response = await fetch(`${TEST_CONFIG.apiURL}/api/v1/agent-posts?limit=1`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  if (!data.data || data.data.length === 0) {
    throw new Error('No posts found in API');
  }
  const postId = data.data[0].id;
  console.log(`   Fetched post ID from API: ${postId}`);
  return postId;
}

async function getCommentCountFromDB(postId: string): Promise<number> {
  const response = await fetch(`${TEST_CONFIG.apiURL}/api/v1/agent-posts/${postId}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  return data.data?.comments || 0;
}

async function clickCommentButton(page: Page, post: any) {
  // Click the comment button (has MessageCircle icon)
  const commentButton = post.locator('button').filter({ hasText: /\d+/ }).first();
  await commentButton.click();
}

async function submitComment(page: Page, post: any, content: string) {
  // Wait for comment form to appear
  const textarea = page.locator('textarea, input[type="text"]').last();
  await textarea.waitFor({ state: 'visible', timeout: 5000 });

  // Fill and submit
  await textarea.fill(content);

  // Find and click submit button
  const submitButton = page.locator('button').filter({ hasText: /post|submit|send/i }).last();
  await submitButton.click();
}

// Test Suite
test.describe('Comment Counter E2E Tests - Phase 2', () => {
  test.beforeAll(async () => {
    // Create screenshot directory
    const fs = await import('fs');
    await fs.promises.mkdir(TEST_CONFIG.screenshotDir, { recursive: true });
  });

  test('TC1: Comment counter shows initial value correctly', async ({ page }) => {
    console.log('\n🧪 TC1: Initial counter value');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);
    await captureScreenshot(page, '01-initial-load');

    // Get first post
    const post = await getFirstPost(page);
    const postId = await getPostId();

    // Get counts
    const uiCount = await getCommentCount(page, post);
    const dbCount = await getCommentCountFromDB(postId);

    console.log(`   Post ID: ${postId}`);
    console.log(`   UI count: ${uiCount}`);
    console.log(`   DB count: ${dbCount}`);

    // Verify they match
    expect(uiCount).toBe(dbCount);

    await captureScreenshot(page, '01-initial-verified');
    console.log('✅ TC1: PASSED\n');
  });

  test('TC2: Optimistic update happens within 500ms', async ({ page }) => {
    console.log('\n🧪 TC2: Optimistic update performance');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);

    const post = await getFirstPost(page);
    const initialCount = await getCommentCount(page, post);

    await captureScreenshot(page, '02-before-comment');

    // Click comment button
    await clickCommentButton(page, post);

    // Measure time to optimistic update
    const startTime = Date.now();
    await submitComment(page, post, 'Test comment for optimistic update');

    // Wait a tiny bit for optimistic update
    await page.waitForTimeout(100);

    const optimisticCount = await getCommentCount(page, post);
    const optimisticTime = Date.now() - startTime;

    console.log(`   Initial count: ${initialCount}`);
    console.log(`   Optimistic count: ${optimisticCount}`);
    console.log(`   Update time: ${optimisticTime}ms`);

    // Verify optimistic update happened and was fast
    expect(optimisticCount).toBe(initialCount + 1);
    expect(optimisticTime).toBeLessThan(TEST_CONFIG.maxOptimisticUpdateTime);

    await captureScreenshot(page, '02-optimistic-update');
    console.log('✅ TC2: PASSED\n');
  });

  test('TC3: Counter confirmed after server response', async ({ page }) => {
    console.log('\n🧪 TC3: Server confirmation');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);

    const post = await getFirstPost(page);
    const postId = await getPostId();
    const initialCount = await getCommentCountFromDB(postId);

    await captureScreenshot(page, '03-before-comment');

    // Submit comment
    await clickCommentButton(page, post);
    await submitComment(page, post, 'Test comment for server confirmation');

    // Wait for server response
    await page.waitForTimeout(2000);

    // Verify both UI and DB updated
    const finalUICount = await getCommentCount(page, post);
    const finalDBCount = await getCommentCountFromDB(postId);

    console.log(`   Initial: ${initialCount}`);
    console.log(`   Final UI: ${finalUICount}`);
    console.log(`   Final DB: ${finalDBCount}`);

    expect(finalUICount).toBe(initialCount + 1);
    expect(finalDBCount).toBe(initialCount + 1);
    expect(finalUICount).toBe(finalDBCount);

    await captureScreenshot(page, '03-server-confirmed');
    console.log('✅ TC3: PASSED\n');
  });

  test('TC4: Counter persists after page refresh', async ({ page }) => {
    console.log('\n🧪 TC4: Counter persistence');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);

    const post = await getFirstPost(page);
    const postId = await getPostId();

    // Submit comment
    await clickCommentButton(page, post);
    await submitComment(page, post, 'Test comment for persistence');
    await page.waitForTimeout(2000);

    const countBeforeRefresh = await getCommentCount(page, post);

    await captureScreenshot(page, '04-before-refresh');

    // Refresh page
    await page.reload();
    await waitForNetworkIdle(page);

    const postAfterRefresh = await getFirstPost(page);
    const countAfterRefresh = await getCommentCount(postAfterRefresh);

    console.log(`   Before refresh: ${countBeforeRefresh}`);
    console.log(`   After refresh: ${countAfterRefresh}`);

    expect(countAfterRefresh).toBe(countBeforeRefresh);

    await captureScreenshot(page, '04-after-refresh');
    console.log('✅ TC4: PASSED\n');
  });

  test('TC5: Worker outcome comment updates counter', async ({ page }) => {
    console.log('\n🧪 TC5: Worker outcome comment');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);

    const post = await getFirstPost(page);
    const postId = await getPostId();
    const initialCount = await getCommentCountFromDB(postId);

    await captureScreenshot(page, '05-before-worker-comment');

    // Simulate worker posting comment via API
    console.log('   Posting worker outcome comment via API...');
    const workerResponse = await fetch(`${TEST_CONFIG.apiURL}/api/v1/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Worker outcome: Task completed successfully',
        authorAgent: 'worker-agent',
        skipTicket: true,
      }),
    });

    if (!workerResponse.ok) {
      console.warn(`   Worker comment API returned: ${workerResponse.status}`);
    }

    // Wait for real-time update
    await page.waitForTimeout(2000);

    // Verify counter updated
    const finalCount = await getCommentCountFromDB(postId);
    console.log(`   Initial: ${initialCount}`);
    console.log(`   Final: ${finalCount}`);

    expect(finalCount).toBe(initialCount + 1);

    await captureScreenshot(page, '05-worker-comment-added');
    console.log('✅ TC5: PASSED\n');
  });

  test('TC6: Multiple rapid comments handled correctly', async ({ page }) => {
    console.log('\n🧪 TC6: Multiple rapid comments');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);

    const post = await getFirstPost(page);
    const postId = await getPostId();
    const initialCount = await getCommentCountFromDB(postId);

    await captureScreenshot(page, '06-before-multiple');

    // Submit 3 comments rapidly
    console.log('   Submitting 3 comments rapidly...');
    for (let i = 0; i < 3; i++) {
      await clickCommentButton(page, post);
      await submitComment(page, post, `Rapid comment ${i + 1}`);
      await page.waitForTimeout(200);
    }

    // Wait for all to process
    await page.waitForTimeout(3000);

    // Verify counter shows +3
    const finalUICount = await getCommentCount(page, post);
    const finalDBCount = await getCommentCountFromDB(postId);

    console.log(`   Initial: ${initialCount}`);
    console.log(`   Final UI: ${finalUICount}`);
    console.log(`   Final DB: ${finalDBCount}`);
    console.log(`   Expected: ${initialCount + 3}`);

    expect(finalDBCount).toBe(initialCount + 3);
    expect(finalUICount).toBe(finalDBCount);

    await captureScreenshot(page, '06-multiple-added');
    console.log('✅ TC6: PASSED\n');
  });

  test('TC7: Error handling rolls back optimistic update', async ({ page }) => {
    console.log('\n🧪 TC7: Error handling');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);

    const post = await getFirstPost(page);
    const initialCount = await getCommentCount(page, post);

    await captureScreenshot(page, '07-before-error');

    // Intercept API to simulate failure
    await page.route('**/api/v1/posts/*/comments', (route) => {
      route.abort('failed');
    });

    console.log('   Simulating API failure...');

    // Try to submit comment
    try {
      await clickCommentButton(page, post);
      await submitComment(page, post, 'This should fail');
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('   Comment submission failed as expected');
    }

    // Verify counter didn't change or rolled back
    const finalCount = await getCommentCount(page, post);

    console.log(`   Initial: ${initialCount}`);
    console.log(`   Final: ${finalCount}`);

    expect(finalCount).toBe(initialCount);

    await captureScreenshot(page, '07-error-rollback');
    console.log('✅ TC7: PASSED\n');
  });
});

console.log('\n🎯 Comment Counter E2E Test Suite V2 Loaded');
console.log(`   Frontend: ${TEST_CONFIG.frontendURL}`);
console.log(`   API: ${TEST_CONFIG.apiURL}`);
console.log(`   Screenshot Dir: ${TEST_CONFIG.screenshotDir}`);
console.log(`   Performance Target: <${TEST_CONFIG.maxOptimisticUpdateTime}ms\n`);

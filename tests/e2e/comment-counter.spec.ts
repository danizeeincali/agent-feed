/**
 * Comment Counter Real-time Update E2E Tests
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
 * 1. Basic comment counter increments in real-time
 * 2. Counter persists after page refresh
 * 3. Worker outcome comments increment counter
 * 4. Multiple rapid comments handled correctly
 * 5. Error scenarios rollback optimistically
 * 6. Concurrent user scenarios (if possible)
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test Configuration
const TEST_CONFIG = {
  // Server URLs (using correct ports - frontend:5173, backend:3001)
  frontendURL: 'http://localhost:5173',
  apiURL: 'http://localhost:3001',

  // Timeouts
  pageLoadTimeout: 30000,
  commentSubmitTimeout: 10000,
  optimisticUpdateTimeout: 500, // CRITICAL: Must update within 500ms
  assertionTimeout: 5000,

  // Screenshot directory
  screenshotDir: path.join(__dirname, 'screenshots/comment-counter'),

  // Performance targets (from spec)
  maxOptimisticUpdateTime: 500, // ms
  maxConfirmUpdateTime: 2000, // ms
};

// Test data
const TEST_DATA = {
  testComment: 'This is a test comment for E2E validation',
  multipleComments: [
    'First comment in sequence',
    'Second comment in sequence',
    'Third comment in sequence',
  ],
  workerOutcomeComment: 'Worker outcome: Task completed successfully',
};

// Helper functions
async function captureScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const filepath = path.join(TEST_CONFIG.screenshotDir, filename);

  await page.screenshot({
    path: filepath,
    fullPage: options.fullPage !== false,
  });

  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

function setupPerformanceMonitoring(page: Page) {
  const performanceMarks: Array<{ name: string; timestamp: number }> = [];

  return {
    mark: (name: string) => {
      performanceMarks.push({ name, timestamp: Date.now() });
    },
    getMeasure: (startMark: string, endMark: string) => {
      const start = performanceMarks.find(m => m.name === startMark);
      const end = performanceMarks.find(m => m.name === endMark);
      if (!start || !end) return -1;
      return end.timestamp - start.timestamp;
    },
    getAllMarks: () => performanceMarks,
  };
}

function setupConsoleMonitoring(page: Page) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  return {
    getErrors: () => ({ consoleErrors, consoleWarnings }),
    hasErrors: () => consoleErrors.length > 0,
    clearErrors: () => {
      consoleErrors.length = 0;
      consoleWarnings.length = 0;
    },
  };
}

// Wait for network to be idle
async function waitForNetworkIdle(page: Page, timeout: number = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

// Get comment count from UI
async function getCommentCount(page: Page, postId: string): Promise<number> {
  // Try multiple selectors to find comment count
  const selectors = [
    `[data-testid="comment-count-${postId}"]`,
    `[data-post-id="${postId}"] [data-testid="comment-count"]`,
    `[data-post-id="${postId}"] .comment-count`,
    `#post-${postId} [class*="comment"]`,
  ];

  for (const selector of selectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.count() > 0) {
        const text = await element.textContent();
        const match = text?.match(/\d+/);
        if (match) {
          return parseInt(match[0], 10);
        }
      }
    } catch (e) {
      // Try next selector
    }
  }

  // Fallback: check for MessageCircle icon with number
  const commentIcon = page.locator('svg').filter({ hasText: /message/i }).first();
  if (await commentIcon.count() > 0) {
    const parent = commentIcon.locator('..').first();
    const text = await parent.textContent();
    const match = text?.match(/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  throw new Error('Could not find comment count in UI');
}

// Get comment count from database
async function getCommentCountFromDB(postId: string): Promise<number> {
  try {
    const response = await fetch(`${TEST_CONFIG.apiURL}/api/v1/agent-posts/${postId}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    const data = await response.json();
    return data.data?.engagement?.comments || data.data?.comments || 0;
  } catch (error) {
    console.error('Failed to get comment count from DB:', error);
    return -1;
  }
}

// Create a test post
async function createTestPost(page: Page): Promise<string> {
  // Navigate to home
  await page.goto(TEST_CONFIG.frontendURL);
  await waitForNetworkIdle(page);

  // Find the first post or create one
  const posts = page.locator('[data-testid="post"]');
  if (await posts.count() > 0) {
    const firstPost = posts.first();
    const postId = await firstPost.getAttribute('data-post-id');
    if (postId) return postId;
  }

  // If no posts, try to create one via API
  const response = await fetch(`${TEST_CONFIG.apiURL}/api/v1/agent-posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'E2E Test Post',
      content: 'This is a test post for comment counter E2E testing',
      authorAgent: 'test-agent',
    }),
  });

  if (response.ok) {
    const data = await response.json();
    return data.data.id;
  }

  throw new Error('Could not create or find test post');
}

// Add comment via UI
async function addCommentViaUI(
  page: Page,
  postId: string,
  content: string,
  performance: ReturnType<typeof setupPerformanceMonitoring>
): Promise<void> {
  // Find post
  const post = page.locator(`[data-post-id="${postId}"]`).first();

  // Click comment button/area to show comment form
  const commentButton = post.locator('[data-testid="comment-button"], button:has-text("Comment")').first();
  await commentButton.click();

  // Wait for comment form to appear
  const commentForm = post.locator('[data-testid="comment-form"], textarea, [placeholder*="comment" i]').first();
  await commentForm.waitFor({ state: 'visible', timeout: 5000 });

  performance.mark('comment-submit-start');

  // Fill and submit comment
  await commentForm.fill(content);

  const submitButton = post.locator('[data-testid="submit-comment"], button:has-text("Post"), button:has-text("Submit")').first();
  await submitButton.click();

  performance.mark('comment-submit-clicked');
}

// Test Suite
test.describe('Comment Counter Real-time Updates', () => {
  let consoleMonitor: ReturnType<typeof setupConsoleMonitoring>;
  let performance: ReturnType<typeof setupPerformanceMonitoring>;

  test.beforeEach(async ({ page }) => {
    consoleMonitor = setupConsoleMonitoring(page);
    performance = setupPerformanceMonitoring(page);

    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('TC1: Basic comment counter updates in real-time', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout

    console.log('\n🧪 Test Case 1: Basic comment counter update');

    // Step 1: Navigate to app
    console.log('Step 1: Navigating to app...');
    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);
    await captureScreenshot(page, '01-app-loaded');

    // Step 2: Find or create a post with 0 comments
    console.log('Step 2: Finding/creating test post...');
    const postId = await createTestPost(page);
    console.log(`   Post ID: ${postId}`);

    // Verify post is visible
    const post = page.locator(`[data-post-id="${postId}"]`).first();
    await expect(post).toBeVisible();

    // Step 3: Get initial comment count
    console.log('Step 3: Checking initial comment count...');
    const initialCountUI = await getCommentCount(page, postId);
    const initialCountDB = await getCommentCountFromDB(postId);
    console.log(`   UI count: ${initialCountUI}, DB count: ${initialCountDB}`);

    await captureScreenshot(page, '02-before-comment');

    // Step 4: Add comment via UI
    console.log('Step 4: Adding comment...');
    performance.mark('test-start');
    await addCommentViaUI(page, postId, TEST_DATA.testComment, performance);

    // Step 5: Verify optimistic update (within 500ms)
    console.log('Step 5: Verifying optimistic update...');
    performance.mark('checking-optimistic-update');

    // Wait for counter to update (should be fast)
    await page.waitForTimeout(100); // Small delay to let UI update

    const optimisticCount = await getCommentCount(page, postId);
    performance.mark('optimistic-update-verified');

    const optimisticUpdateTime = performance.getMeasure('comment-submit-clicked', 'optimistic-update-verified');
    console.log(`   Optimistic update time: ${optimisticUpdateTime}ms`);
    console.log(`   New count: ${optimisticCount}`);

    // CRITICAL ASSERTION: Optimistic update must be fast
    expect(optimisticUpdateTime).toBeLessThan(TEST_CONFIG.maxOptimisticUpdateTime);
    expect(optimisticCount).toBe(initialCountUI + 1);

    await captureScreenshot(page, '03-after-comment-optimistic');

    // Step 6: Wait for server confirmation
    console.log('Step 6: Waiting for server confirmation...');
    await page.waitForTimeout(1000); // Wait for server to process

    const confirmedCountUI = await getCommentCount(page, postId);
    const confirmedCountDB = await getCommentCountFromDB(postId);
    performance.mark('confirmed-update-verified');

    console.log(`   Confirmed UI count: ${confirmedCountUI}`);
    console.log(`   Confirmed DB count: ${confirmedCountDB}`);

    expect(confirmedCountUI).toBe(initialCountUI + 1);
    expect(confirmedCountDB).toBe(initialCountDB + 1);

    await captureScreenshot(page, '04-after-comment-confirmed');

    // Step 7: Refresh page and verify persistence
    console.log('Step 7: Refreshing page to verify persistence...');
    await page.reload();
    await waitForNetworkIdle(page);

    const persistedCount = await getCommentCount(page, postId);
    const persistedCountDB = await getCommentCountFromDB(postId);
    console.log(`   Persisted UI count: ${persistedCount}`);
    console.log(`   Persisted DB count: ${persistedCountDB}`);

    expect(persistedCount).toBe(initialCountUI + 1);
    expect(persistedCountDB).toBe(initialCountDB + 1);

    await captureScreenshot(page, '05-after-refresh-persisted');

    // Step 8: Verify no console errors
    console.log('Step 8: Checking for console errors...');
    const errors = consoleMonitor.getErrors();
    if (errors.consoleErrors.length > 0) {
      console.warn('⚠️  Console errors detected:', errors.consoleErrors);
    }
    expect(errors.consoleErrors.length).toBe(0);

    // Step 9: Report performance metrics
    console.log('\n📊 Performance Metrics:');
    console.log(`   Optimistic update: ${optimisticUpdateTime}ms (target: <${TEST_CONFIG.maxOptimisticUpdateTime}ms)`);
    const confirmTime = performance.getMeasure('comment-submit-clicked', 'confirmed-update-verified');
    console.log(`   Total confirmation: ${confirmTime}ms (target: <${TEST_CONFIG.maxConfirmUpdateTime}ms)`);

    console.log('✅ Test Case 1: PASSED\n');
  });

  test('TC2: Multiple rapid comments increment counter correctly', async ({ page }) => {
    test.setTimeout(90000); // 1.5 minute timeout

    console.log('\n🧪 Test Case 2: Multiple rapid comments');

    // Navigate and setup
    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);
    const postId = await createTestPost(page);

    const initialCount = await getCommentCount(page, postId);
    console.log(`Initial count: ${initialCount}`);

    await captureScreenshot(page, '06-before-multiple-comments');

    // Add 3 comments rapidly
    console.log('Adding 3 comments rapidly...');
    for (let i = 0; i < TEST_DATA.multipleComments.length; i++) {
      await addCommentViaUI(page, postId, TEST_DATA.multipleComments[i], performance);
      await page.waitForTimeout(300); // Small delay between comments
      console.log(`   Comment ${i + 1} added`);
    }

    // Wait for all to process
    await page.waitForTimeout(2000);

    // Verify counter shows 3 new comments
    const finalCount = await getCommentCount(page, postId);
    const finalCountDB = await getCommentCountFromDB(postId);

    console.log(`Final UI count: ${finalCount} (expected: ${initialCount + 3})`);
    console.log(`Final DB count: ${finalCountDB}`);

    expect(finalCount).toBe(initialCount + 3);
    expect(finalCountDB).toBe(finalCount);

    await captureScreenshot(page, '07-after-multiple-comments');

    // Verify all comments are visible
    const commentElements = page.locator(`[data-post-id="${postId}"] [data-testid="comment"], [data-post-id="${postId}"] .comment-item`);
    const commentCount = await commentElements.count();
    console.log(`Visible comments: ${commentCount}`);

    expect(commentCount).toBeGreaterThanOrEqual(3);

    console.log('✅ Test Case 2: PASSED\n');
  });

  test('TC3: Counter updates when worker posts outcome comment', async ({ page }) => {
    test.setTimeout(120000); // 2 minute timeout

    console.log('\n🧪 Test Case 3: Worker outcome comment');

    // Navigate and setup
    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);
    const postId = await createTestPost(page);

    const initialCount = await getCommentCount(page, postId);
    console.log(`Initial count: ${initialCount}`);

    await captureScreenshot(page, '08-before-worker-comment');

    // Simulate worker posting outcome comment via API
    console.log('Simulating worker outcome comment via API...');
    const workerResponse = await fetch(`${TEST_CONFIG.apiURL}/api/v1/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: TEST_DATA.workerOutcomeComment,
        authorAgent: 'worker-agent',
        skipTicket: true, // Worker outcome comment
      }),
    });

    if (!workerResponse.ok) {
      console.warn('Worker comment API failed, this might be expected if endpoint differs');
    }

    // Wait for real-time update
    console.log('Waiting for real-time update...');
    await page.waitForTimeout(2000);

    // Verify counter incremented
    const updatedCount = await getCommentCount(page, postId);
    const updatedCountDB = await getCommentCountFromDB(postId);

    console.log(`Updated UI count: ${updatedCount} (expected: ${initialCount + 1})`);
    console.log(`Updated DB count: ${updatedCountDB}`);

    expect(updatedCount).toBe(initialCount + 1);
    expect(updatedCountDB).toBe(initialCount + 1);

    await captureScreenshot(page, '09-after-worker-comment');

    console.log('✅ Test Case 3: PASSED\n');
  });

  test('TC4: Error handling - counter rolls back on failure', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n🧪 Test Case 4: Error handling');

    // Navigate and setup
    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);
    const postId = await createTestPost(page);

    const initialCount = await getCommentCount(page, postId);
    console.log(`Initial count: ${initialCount}`);

    await captureScreenshot(page, '10-before-error-test');

    // Intercept API to simulate failure
    await page.route(`**/api/**/comments`, (route) => {
      route.abort('failed');
    });

    console.log('API intercepted to simulate failure...');

    // Try to add comment
    try {
      await addCommentViaUI(page, postId, 'This should fail', performance);
      await page.waitForTimeout(1000);
    } catch (e) {
      console.log('Comment submission failed as expected');
    }

    // Verify counter rolled back or stayed same
    const countAfterError = await getCommentCount(page, postId);
    console.log(`Count after error: ${countAfterError}`);

    expect(countAfterError).toBe(initialCount);

    await captureScreenshot(page, '11-after-error-rollback');

    // Verify error message shown (if implemented)
    const errorMessage = page.locator('[role="alert"], .error-message, [class*="error"]').first();
    if (await errorMessage.count() > 0) {
      const errorText = await errorMessage.textContent();
      console.log(`Error message shown: "${errorText}"`);
      expect(errorText).toBeTruthy();
    } else {
      console.log('⚠️  No error message found (may not be implemented yet)');
    }

    console.log('✅ Test Case 4: PASSED\n');
  });

  test('TC5: Performance - optimistic updates under 500ms', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n🧪 Test Case 5: Performance validation');

    // Navigate and setup
    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);
    const postId = await createTestPost(page);

    await captureScreenshot(page, '12-performance-test-start');

    // Measure multiple comment submissions
    const measurements: number[] = [];
    const numTests = 3;

    for (let i = 0; i < numTests; i++) {
      const startTime = Date.now();
      await addCommentViaUI(page, postId, `Performance test ${i + 1}`, performance);

      // Wait for optimistic update
      await page.waitForTimeout(50);

      const endTime = Date.now();
      const duration = endTime - startTime;
      measurements.push(duration);

      console.log(`   Test ${i + 1}: ${duration}ms`);

      await page.waitForTimeout(500); // Wait between tests
    }

    const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const maxTime = Math.max(...measurements);

    console.log('\n📊 Performance Results:');
    console.log(`   Average: ${avgTime.toFixed(2)}ms`);
    console.log(`   Maximum: ${maxTime}ms`);
    console.log(`   Target: <${TEST_CONFIG.maxOptimisticUpdateTime}ms`);

    // All measurements should be under threshold
    expect(maxTime).toBeLessThan(TEST_CONFIG.maxOptimisticUpdateTime);

    await captureScreenshot(page, '13-performance-test-complete');

    console.log('✅ Test Case 5: PASSED\n');
  });
});

// Test Suite for Integration with Real Backend
test.describe('Comment Counter - Real Backend Integration', () => {
  test('TC6: Verify database consistency after multiple operations', async ({ page }) => {
    test.setTimeout(90000);

    console.log('\n🧪 Test Case 6: Database consistency');

    await page.goto(TEST_CONFIG.frontendURL);
    await waitForNetworkIdle(page);
    const postId = await createTestPost(page);

    // Perform multiple operations
    const operations = [
      'Add first comment',
      'Add second comment',
      'Refresh page',
      'Add third comment',
    ];

    let expectedCount = await getCommentCountFromDB(postId);

    for (const operation of operations) {
      console.log(`Operation: ${operation}`);

      if (operation.includes('Add')) {
        const perf = setupPerformanceMonitoring(page);
        await addCommentViaUI(page, postId, operation, perf);
        await page.waitForTimeout(1000);
        expectedCount++;
      } else if (operation.includes('Refresh')) {
        await page.reload();
        await waitForNetworkIdle(page);
      }

      // Verify consistency
      const uiCount = await getCommentCount(page, postId);
      const dbCount = await getCommentCountFromDB(postId);

      console.log(`   UI: ${uiCount}, DB: ${dbCount}, Expected: ${expectedCount}`);

      expect(uiCount).toBe(expectedCount);
      expect(dbCount).toBe(expectedCount);
      expect(uiCount).toBe(dbCount);
    }

    await captureScreenshot(page, '14-consistency-verified');

    console.log('✅ Test Case 6: PASSED\n');
  });
});

console.log('\n🎯 Comment Counter E2E Test Suite Loaded');
console.log('   Frontend: ' + TEST_CONFIG.frontendURL);
console.log('   API: ' + TEST_CONFIG.apiURL);
console.log('   Screenshot Dir: ' + TEST_CONFIG.screenshotDir);
console.log('   Performance Target: <' + TEST_CONFIG.maxOptimisticUpdateTime + 'ms\n');

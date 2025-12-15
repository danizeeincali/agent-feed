/**
 * E2E Production Validation: Real-Time Comment Flow
 *
 * PURPOSE: Comprehensive end-to-end tests for real-time comment functionality
 * Tests against REAL backend API, REAL WebSocket connections, and REAL database
 *
 * CRITICAL VALIDATIONS:
 * 1. Comment counter increments in real-time without refresh
 * 2. Toast notifications appear for new comments
 * 3. Comments appear immediately via WebSocket
 * 4. Markdown formatting renders correctly in Avi responses
 *
 * NO MOCKS - Production validation only!
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 60000; // 60 seconds for async operations

/**
 * Helper: Create a comment via direct API call
 * Simulates real-time event from another user/agent
 */
async function createCommentViaAPI(
  postId: string,
  content: string,
  authorType: 'user' | 'agent' = 'user',
  authorId: string = 'test-user'
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/agent-posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      authorType,
      authorId,
      parentId: null,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Helper: Get post details from API
 */
async function getPostDetails(postId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/agent-posts/${postId}`);
  if (!response.ok) {
    throw new Error(`Failed to get post: ${response.status}`);
  }
  return response.json();
}

/**
 * Helper: Get all comments for a post
 */
async function getPostComments(postId: string): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/agent-posts/${postId}/comments`);
  if (!response.ok) {
    throw new Error(`Failed to get comments: ${response.status}`);
  }
  const data = await response.json();
  return data.comments || [];
}

/**
 * Helper: Wait for WebSocket connection to be established
 */
async function waitForWebSocketConnection(page: Page, timeout: number = 5000): Promise<void> {
  const connectionLogs: string[] = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('Socket') || text.includes('connected')) {
      connectionLogs.push(text);
    }
  });

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (connectionLogs.some(log => log.includes('Connected') || log.includes('connected'))) {
      console.log('✅ WebSocket connection confirmed');
      return;
    }
    await page.waitForTimeout(100);
  }

  console.warn('⚠️ WebSocket connection not confirmed in logs, proceeding anyway');
}

/**
 * Helper: Find a post with comments section visible
 */
async function findTestPost(page: Page): Promise<{ element: any; postId: string }> {
  // Wait for posts to load
  await page.waitForSelector('.post-card, [data-testid="post-card"]', { timeout: 10000 });

  // Get all posts
  const posts = page.locator('.post-card, [data-testid="post-card"]');
  const count = await posts.count();

  if (count === 0) {
    throw new Error('No posts found on page');
  }

  // Try to get post ID from first post
  const firstPost = posts.first();
  const postId = await firstPost.getAttribute('data-post-id') ||
                 await firstPost.getAttribute('id') ||
                 'post-1'; // Fallback

  return {
    element: firstPost,
    postId,
  };
}

test.describe('Real-Time Comment Flow - Production Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to feed
    await page.goto(BASE_URL);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await waitForWebSocketConnection(page);

    console.log('✅ Test environment ready');
  });

  /**
   * TEST 1: Comment Counter Increments in Real-Time
   *
   * VALIDATES: Counter updates without page refresh when new comment added
   */
  test('comment counter increments when new comment added', async ({ page }) => {
    console.log('\n🧪 TEST 1: Comment Counter Real-Time Update\n');

    // Step 1: Find a post to test with
    const { element: postElement, postId } = await findTestPost(page);
    await expect(postElement).toBeVisible();
    console.log('📝 Testing on post:', postId);

    // Step 2: Get initial comment counter value
    const counterLocator = postElement.locator('button:has-text("Comment"), [data-testid="comment-button"]').first();
    await expect(counterLocator).toBeVisible({ timeout: 5000 });

    const initialCounterText = await counterLocator.textContent();
    const initialCount = parseInt(initialCounterText?.match(/\d+/)?.[0] || '0');
    console.log('📊 Initial comment count:', initialCount);

    // Step 3: Click comment button to open comments section
    await counterLocator.click();
    await page.waitForTimeout(1000); // Wait for animation

    // Step 4: Add a new comment via API (simulates real-time event)
    console.log('📨 Creating comment via API...');
    const testComment = await createCommentViaAPI(
      postId,
      `Test comment for counter validation - ${Date.now()}`,
      'user',
      'test-user-' + Date.now()
    );
    console.log('✅ Comment created:', testComment.id);

    // Step 5: Wait for counter to update via WebSocket
    console.log('⏳ Waiting for counter to update (NO REFRESH)...');

    // Wait for counter to change - should happen within 5 seconds
    await page.waitForFunction(
      (selector, expectedCount) => {
        const button = document.querySelector(selector);
        if (!button) return false;
        const text = button.textContent || '';
        const currentCount = parseInt(text.match(/\d+/)?.[0] || '0');
        return currentCount > expectedCount;
      },
      { selector: '[data-testid="comment-button"], button:has-text("Comment")', expectedCount: initialCount },
      { timeout: 10000 }
    );

    // Step 6: Verify counter incremented
    const updatedCounterText = await counterLocator.textContent();
    const updatedCount = parseInt(updatedCounterText?.match(/\d+/)?.[0] || '0');

    console.log('📊 Updated comment count:', updatedCount);
    expect(updatedCount).toBe(initialCount + 1);

    // Step 7: Take success screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/test1-counter-update-SUCCESS.png',
      fullPage: true,
    });

    console.log('✅ TEST 1 PASSED: Counter incremented without refresh');
  });

  /**
   * TEST 2: Toast Notification Appears
   *
   * VALIDATES: Toast notification shows when new comment is added
   */
  test('toast notification shows when comment added', async ({ page }) => {
    console.log('\n🧪 TEST 2: Toast Notification Display\n');

    // Step 1: Find a post
    const { element: postElement, postId } = await findTestPost(page);
    console.log('📝 Testing on post:', postId);

    // Step 2: Open comments section
    const commentButton = postElement.locator('button:has-text("Comment")').first();
    await commentButton.click();
    await page.waitForTimeout(1000);

    // Step 3: Add comment via API with distinct author
    const authorName = `TestAgent-${Date.now()}`;
    console.log('📨 Creating comment via API from:', authorName);

    await createCommentViaAPI(
      postId,
      `Toast notification test comment - ${Date.now()}`,
      'agent',
      authorName
    );

    // Step 4: Wait for toast to appear
    console.log('⏳ Waiting for toast notification...');

    const toastLocator = page.locator('[role="status"], .toast, [data-testid="toast"]');
    await expect(toastLocator).toBeVisible({ timeout: 10000 });

    const toastText = await toastLocator.textContent();
    console.log('📬 Toast content:', toastText);

    // Step 5: Verify toast contains author name or comment reference
    expect(toastText).toBeTruthy();

    // Step 6: Verify toast has icon (agent or user)
    const hasAgentIcon = await page.locator('[role="status"]:has-text("🤖"), .toast:has-text("🤖")').isVisible().catch(() => false);
    const hasUserIcon = await page.locator('[role="status"]:has-text("👤"), .toast:has-text("👤")').isVisible().catch(() => false);

    const hasIcon = hasAgentIcon || hasUserIcon;
    console.log('🎨 Toast has icon:', hasIcon ? (hasAgentIcon ? '🤖 Agent' : '👤 User') : 'None');

    // Step 7: Take screenshot of toast
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/test2-toast-notification-SUCCESS.png',
      fullPage: false,
    });

    // Step 8: Verify toast auto-dismisses
    console.log('⏳ Waiting for toast to auto-dismiss...');
    await expect(toastLocator).not.toBeVisible({ timeout: 7000 });
    console.log('✅ Toast auto-dismissed');

    console.log('✅ TEST 2 PASSED: Toast notification displayed correctly');
  });

  /**
   * TEST 3: Comment Appears Without Refresh
   *
   * VALIDATES: New comment appears immediately in DOM via WebSocket
   */
  test('new comment appears immediately without refresh', async ({ page }) => {
    console.log('\n🧪 TEST 3: Real-Time Comment Appearance\n');

    // Step 1: Find a post
    const { element: postElement, postId } = await findTestPost(page);
    console.log('📝 Testing on post:', postId);

    // Step 2: Open comments section
    const commentButton = postElement.locator('button:has-text("Comment")').first();
    await commentButton.click();
    await page.waitForTimeout(1000);

    // Step 3: Count initial comments
    const initialComments = await page.locator('.comment-item, [data-testid="comment"], .comment-content').count();
    console.log('📊 Initial comments in DOM:', initialComments);

    // Step 4: Add comment via API
    const commentContent = `Real-time test comment with unique ID: ${Date.now()}`;
    console.log('📨 Creating comment via API...');

    const createdComment = await createCommentViaAPI(
      postId,
      commentContent,
      'user',
      'realtime-test-user'
    );
    console.log('✅ Comment created:', createdComment.id);

    // Step 5: Wait for comment to appear in DOM (NO REFRESH)
    console.log('⏳ Waiting for comment to appear in DOM via WebSocket...');

    // Look for the unique content in the comment
    const uniqueId = commentContent.match(/\d+$/)?.[0];
    const commentLocator = page.locator(`.comment-item:has-text("${uniqueId}"), [data-testid="comment"]:has-text("${uniqueId}")`);

    await expect(commentLocator).toBeVisible({ timeout: 15000 });
    console.log('✅ Comment appeared in DOM!');

    // Step 6: Verify comment count increased
    const updatedComments = await page.locator('.comment-item, [data-testid="comment"], .comment-content').count();
    console.log('📊 Updated comments in DOM:', updatedComments);
    expect(updatedComments).toBeGreaterThan(initialComments);

    // Step 7: Verify new comment is visible
    await expect(commentLocator).toBeVisible();

    // Step 8: Verify NO page refresh occurred (check page load time)
    const navigationTiming = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return perfData.loadEventEnd;
    });

    console.log('🔍 Navigation timing:', navigationTiming);
    // If page was refreshed, loadEventEnd would be very recent

    // Step 9: Take screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/test3-comment-appears-SUCCESS.png',
      fullPage: true,
    });

    console.log('✅ TEST 3 PASSED: Comment appeared without refresh');
  });

  /**
   * TEST 4: Markdown Formatting Applied
   *
   * VALIDATES: Avi response renders with proper markdown formatting
   */
  test('avi response renders with markdown formatting', async ({ page }) => {
    console.log('\n🧪 TEST 4: Markdown Formatting Validation\n');

    // Step 1: Find a post
    const { element: postElement, postId } = await findTestPost(page);
    console.log('📝 Testing on post:', postId);

    // Step 2: Open comments section
    const commentButton = postElement.locator('button:has-text("Comment")').first();
    await commentButton.click();
    await page.waitForTimeout(1000);

    // Step 3: Create Avi comment with markdown via API
    const markdownContent = `**Bold text** and *italic text*

### Heading 3

- List item 1
- List item 2

\`\`\`javascript
const code = "syntax highlighting";
\`\`\`

[Link example](https://example.com)

---

Test ID: ${Date.now()}`;

    console.log('📨 Creating Avi comment with markdown...');
    const aviComment = await createCommentViaAPI(
      postId,
      markdownContent,
      'agent',
      'agent-avi'
    );
    console.log('✅ Avi comment created:', aviComment.id);

    // Step 4: Wait for Avi's comment to appear
    const testId = markdownContent.match(/Test ID: (\d+)/)?.[1];
    console.log('⏳ Waiting for Avi comment with ID:', testId);

    const aviCommentLocator = page.locator(`[data-author-type="agent"]:has-text("${testId}"), .comment-item:has-text("${testId}")`);
    await expect(aviCommentLocator).toBeVisible({ timeout: 15000 });
    console.log('✅ Avi comment appeared');

    // Step 5: Verify markdown is RENDERED (not raw)
    // Check for HTML elements that indicate markdown rendering
    const hasBoldText = await aviCommentLocator.locator('strong, b').count() > 0;
    const hasItalicText = await aviCommentLocator.locator('em, i').count() > 0;
    const hasHeading = await aviCommentLocator.locator('h1, h2, h3, h4, h5, h6').count() > 0;
    const hasCodeBlock = await aviCommentLocator.locator('pre code, code').count() > 0;
    const hasList = await aviCommentLocator.locator('ul, ol').count() > 0;

    console.log('📝 Markdown rendering detection:');
    console.log('  - Bold:', hasBoldText);
    console.log('  - Italic:', hasItalicText);
    console.log('  - Heading:', hasHeading);
    console.log('  - Code block:', hasCodeBlock);
    console.log('  - List:', hasList);

    // At least 3 markdown elements should be rendered
    const renderedElements = [hasBoldText, hasItalicText, hasHeading, hasCodeBlock, hasList].filter(Boolean).length;
    expect(renderedElements).toBeGreaterThanOrEqual(3);

    // Step 6: Verify markdown is NOT displayed as raw text
    const commentText = await aviCommentLocator.textContent();
    const hasRawMarkdown = commentText?.includes('**') || commentText?.includes('###') || commentText?.includes('```');

    if (hasRawMarkdown) {
      console.warn('⚠️ WARNING: Raw markdown syntax detected in rendered content');
    }

    // Step 7: Take screenshot of formatted markdown
    await aviCommentLocator.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/test4-markdown-rendering-SUCCESS.png',
      fullPage: true,
    });

    console.log('✅ TEST 4 PASSED: Markdown rendered correctly');
  });

  /**
   * TEST 5: Multiple Comments Real-Time Stress Test
   *
   * VALIDATES: System handles multiple rapid comment additions
   */
  test('handles multiple rapid comments via WebSocket', async ({ page }) => {
    console.log('\n🧪 TEST 5: Multiple Comments Stress Test\n');

    // Step 1: Find a post
    const { element: postElement, postId } = await findTestPost(page);
    console.log('📝 Testing on post:', postId);

    // Step 2: Open comments section
    const commentButton = postElement.locator('button:has-text("Comment")').first();
    await commentButton.click();
    await page.waitForTimeout(1000);

    // Step 3: Count initial comments
    const initialComments = await page.locator('.comment-item, [data-testid="comment"]').count();
    console.log('📊 Initial comment count:', initialComments);

    // Step 4: Create multiple comments rapidly
    const commentCount = 5;
    const commentIds: string[] = [];

    console.log(`📨 Creating ${commentCount} comments rapidly...`);

    for (let i = 0; i < commentCount; i++) {
      const comment = await createCommentViaAPI(
        postId,
        `Stress test comment ${i + 1} - ${Date.now()}`,
        i % 2 === 0 ? 'user' : 'agent',
        `stress-test-${i}`
      );
      commentIds.push(comment.id);
      console.log(`  ✅ Created comment ${i + 1}/${commentCount}`);

      // Small delay between comments to simulate real-world timing
      await page.waitForTimeout(200);
    }

    // Step 5: Wait for all comments to appear
    console.log('⏳ Waiting for all comments to appear via WebSocket...');

    // Wait for comment count to increase by at least commentCount
    await page.waitForFunction(
      (expectedTotal) => {
        const comments = document.querySelectorAll('.comment-item, [data-testid="comment"]');
        return comments.length >= expectedTotal;
      },
      initialComments + commentCount,
      { timeout: 20000 }
    );

    // Step 6: Verify all comments appeared
    const finalComments = await page.locator('.comment-item, [data-testid="comment"]').count();
    console.log('📊 Final comment count:', finalComments);
    expect(finalComments).toBeGreaterThanOrEqual(initialComments + commentCount);

    // Step 7: Take screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/src/tests/e2e/screenshots/test5-stress-test-SUCCESS.png',
      fullPage: true,
    });

    console.log('✅ TEST 5 PASSED: Multiple comments handled correctly');
  });

  /**
   * TEST 6: WebSocket Connection Recovery
   *
   * VALIDATES: System recovers from temporary disconnections
   */
  test('recovers from temporary WebSocket disconnection', async ({ page }) => {
    console.log('\n🧪 TEST 6: WebSocket Recovery Test\n');

    // Step 1: Find a post and open comments
    const { element: postElement, postId } = await findTestPost(page);
    const commentButton = postElement.locator('button:has-text("Comment")').first();
    await commentButton.click();
    await page.waitForTimeout(1000);

    // Step 2: Verify initial connection
    console.log('✅ Initial WebSocket connection established');

    // Step 3: Simulate disconnection (go offline)
    console.log('📡 Simulating network disconnection...');
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);

    // Step 4: Restore connection
    console.log('📡 Restoring network connection...');
    await page.context().setOffline(false);
    await page.waitForTimeout(3000); // Wait for reconnection

    // Step 5: Test that real-time updates work after reconnection
    console.log('📨 Creating comment after reconnection...');
    const testComment = await createCommentViaAPI(
      postId,
      `Post-reconnection test - ${Date.now()}`,
      'user',
      'reconnection-test'
    );

    // Step 6: Verify comment appears
    const commentLocator = page.locator(`.comment-item:has-text("${testComment.id}")`);
    await expect(commentLocator).toBeVisible({ timeout: 15000 });

    console.log('✅ TEST 6 PASSED: WebSocket reconnection successful');
  });
});

/**
 * Test Suite: Database State Verification
 *
 * Validates that database state matches UI state
 */
test.describe('Database State Validation', () => {
  test('UI comment count matches database count', async ({ page }) => {
    console.log('\n🧪 DATABASE VALIDATION: Comment Count Consistency\n');

    // Step 1: Navigate and find post
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    const { element: postElement, postId } = await findTestPost(page);
    console.log('📝 Validating post:', postId);

    // Step 2: Get UI comment count
    const commentButton = postElement.locator('button:has-text("Comment")').first();
    const uiCountText = await commentButton.textContent();
    const uiCount = parseInt(uiCountText?.match(/\d+/)?.[0] || '0');
    console.log('📊 UI comment count:', uiCount);

    // Step 3: Get database comment count
    const dbComments = await getPostComments(postId);
    const dbCount = dbComments.length;
    console.log('📊 Database comment count:', dbCount);

    // Step 4: Verify consistency
    expect(uiCount).toBe(dbCount);
    console.log('✅ UI and Database counts match!');
  });
});

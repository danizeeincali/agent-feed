/**
 * Comment-Agent Response Validation Test Suite
 * TDD Approach - Tests written BEFORE implementation
 *
 * Purpose: Validate that user comments trigger agent responses that appear in the UI
 * Expected: Initial test runs will FAIL - this guides implementation
 */

import { test, expect, Page } from '@playwright/test';
import { setTimeout } from 'timers/promises';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = './docs/validation/screenshots/comment-agent-validation';
const AGENT_RESPONSE_TIMEOUT = 30000; // 30 seconds for agent to respond
const WEBSOCKET_TIMEOUT = 5000; // 5 seconds for WebSocket events

/**
 * Helper: Wait for agent response on a post
 * Polls the backend API for new comments from agent
 */
async function waitForAgentResponse(
  page: Page,
  postId: string,
  initialCommentCount: number,
  timeoutMs: number = AGENT_RESPONSE_TIMEOUT
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    // Query backend API for comments
    const response = await page.request.get(`${BACKEND_URL}/api/posts/${postId}/comments`);
    const comments = await response.json();

    // Look for agent comments added after user comment
    const agentComments = comments.filter((c: any) =>
      c.author_type === 'agent' &&
      c.created_at > new Date(Date.now() - timeoutMs).toISOString()
    );

    if (agentComments.length > 0) {
      return agentComments[0];
    }

    // Wait 1 second before next poll
    await setTimeout(1000);
  }

  throw new Error(`Agent response not found within ${timeoutMs}ms`);
}

/**
 * Helper: Find the "Hi! Let's Get Started" post
 */
async function findStarterPost(page: Page): Promise<{ id: string; element: any }> {
  // Wait for posts to load
  await page.waitForSelector('[data-testid="post-card"]', { timeout: 10000 });

  // Find post by content
  const posts = await page.locator('[data-testid="post-card"]').all();

  for (const post of posts) {
    const content = await post.locator('[data-testid="post-content"]').textContent();
    if (content?.includes("Hi! Let's Get Started")) {
      const postId = await post.getAttribute('data-post-id');
      if (!postId) {
        throw new Error('Post ID not found on starter post');
      }
      return { id: postId, element: post };
    }
  }

  throw new Error('Starter post "Hi! Let\'s Get Started" not found');
}

/**
 * Helper: Setup WebSocket event listener
 */
async function setupWebSocketListener(page: Page): Promise<any[]> {
  const wsEvents: any[] = [];

  // Inject WebSocket event capture
  await page.evaluateHandle(() => {
    const originalWebSocket = window.WebSocket;
    const events: any[] = [];

    (window as any).wsEvents = events;

    window.WebSocket = class extends originalWebSocket {
      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);

        this.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            events.push({
              type: 'message',
              timestamp: Date.now(),
              data: data
            });
          } catch (e) {
            events.push({
              type: 'message',
              timestamp: Date.now(),
              data: event.data
            });
          }
        });
      }
    };
  });

  return wsEvents;
}

test.describe('Comment-Agent Response Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to frontend
    await page.goto(FRONTEND_URL);

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Verify backend is accessible
    const healthCheck = await page.request.get(`${BACKEND_URL}/health`);
    expect(healthCheck.ok()).toBeTruthy();
  });

  test('TDD-1: User comment triggers agent response visible in UI', async ({ page }) => {
    /**
     * TEST GOAL: Verify end-to-end comment-to-agent-response flow
     * EXPECTED: Will FAIL initially - guides implementation
     */

    // ARRANGE: Find the starter post
    const { id: postId, element: postElement } = await findStarterPost(page);

    console.log(`Found starter post with ID: ${postId}`);

    // Take screenshot before commenting
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-before-comment.png`,
      fullPage: true
    });

    // Get initial comment count
    const commentsBefore = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();
    console.log(`Initial comment count: ${commentsBefore}`);

    // ACT: Add a user comment
    const commentInput = postElement.locator('[data-testid="comment-input"]');
    await commentInput.waitFor({ state: 'visible', timeout: 5000 });
    await commentInput.fill('This is a test comment to trigger agent response');

    const submitButton = postElement.locator('[data-testid="comment-submit"]');
    await submitButton.click();

    console.log('User comment submitted');

    // Take screenshot after comment submission
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-after-user-comment.png`,
      fullPage: true
    });

    // Wait for user comment to appear in UI
    await expect(
      page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`)
    ).toHaveCount(commentsBefore + 1, { timeout: 5000 });

    console.log('User comment appeared in UI');

    // ASSERT: Wait for agent response
    console.log('Waiting for agent response...');
    const agentComment = await waitForAgentResponse(page, postId, commentsBefore);

    console.log(`Agent response received: ${JSON.stringify(agentComment)}`);

    // Verify agent comment appears in UI
    await page.waitForSelector(
      `[data-post-id="${postId}"] [data-testid="comment-item"][data-comment-id="${agentComment.id}"]`,
      { timeout: 10000 }
    );

    console.log('Agent comment visible in UI');

    // Take screenshot with agent response
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-after-agent-response.png`,
      fullPage: true
    });

    // Verify agent comment has correct author type
    const agentCommentElement = page.locator(
      `[data-post-id="${postId}"] [data-testid="comment-item"][data-comment-id="${agentComment.id}"]`
    );

    const authorBadge = agentCommentElement.locator('[data-testid="author-badge"]');
    await expect(authorBadge).toContainText('Agent', { ignoreCase: true });

    // Verify comment count increased by 2 (user + agent)
    const commentsAfter = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();
    expect(commentsAfter).toBe(commentsBefore + 2);

    console.log('✅ Test passed: Agent response visible in UI');
  });

  test('TDD-2: Agent responses update in real-time via WebSocket', async ({ page }) => {
    /**
     * TEST GOAL: Verify WebSocket real-time updates without page refresh
     * EXPECTED: Will FAIL initially - guides implementation
     */

    // ARRANGE: Setup WebSocket listener
    await setupWebSocketListener(page);

    // Navigate to feed
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Find starter post
    const { id: postId, element: postElement } = await findStarterPost(page);

    console.log(`Found starter post with ID: ${postId}`);

    // Take screenshot before interaction
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-websocket-before.png`,
      fullPage: true
    });

    // Get initial comment count
    const commentsBefore = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    // ACT: Add a user comment
    const commentInput = postElement.locator('[data-testid="comment-input"]');
    await commentInput.fill('WebSocket test comment for real-time updates');

    const submitButton = postElement.locator('[data-testid="comment-submit"]');
    await submitButton.click();

    console.log('Comment submitted for WebSocket test');

    // ASSERT: Wait for WebSocket event
    await page.waitForFunction(() => {
      const events = (window as any).wsEvents || [];
      return events.some((e: any) =>
        e.type === 'message' &&
        e.data?.type === 'new_comment'
      );
    }, { timeout: WEBSOCKET_TIMEOUT });

    console.log('WebSocket event detected');

    // Verify UI updates without refresh
    await expect(
      page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`)
    ).toHaveCount(commentsBefore + 1, { timeout: 5000 });

    // Take screenshot after WebSocket update
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-websocket-after.png`,
      fullPage: true
    });

    // Retrieve WebSocket events
    const wsEvents = await page.evaluate(() => (window as any).wsEvents || []);

    // Verify WebSocket events were received
    expect(wsEvents.length).toBeGreaterThan(0);

    const commentEvents = wsEvents.filter((e: any) => e.data?.type === 'new_comment');
    expect(commentEvents.length).toBeGreaterThan(0);

    console.log(`✅ Test passed: WebSocket events received: ${commentEvents.length}`);
  });

  test('TDD-3: Agent comment has correct author metadata', async ({ page }) => {
    /**
     * TEST GOAL: Verify agent comments display correct author information
     * EXPECTED: Will FAIL initially - guides implementation
     */

    // ARRANGE: Find starter post
    const { id: postId, element: postElement } = await findStarterPost(page);

    // ACT: Submit comment
    const commentInput = postElement.locator('[data-testid="comment-input"]');
    await commentInput.fill('Testing agent author metadata');

    const submitButton = postElement.locator('[data-testid="comment-submit"]');
    await submitButton.click();

    // Wait for user comment
    await page.waitForTimeout(2000);

    const commentsBefore = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    // ASSERT: Wait for agent response
    const agentComment = await waitForAgentResponse(page, postId, commentsBefore);

    // Verify agent comment in UI
    const agentCommentElement = page.locator(
      `[data-post-id="${postId}"] [data-testid="comment-item"][data-comment-id="${agentComment.id}"]`
    );

    await agentCommentElement.waitFor({ state: 'visible', timeout: 10000 });

    // Take screenshot of agent comment
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-agent-metadata.png`,
      fullPage: true
    });

    // Verify author name contains agent identifier
    const authorName = agentCommentElement.locator('[data-testid="author-name"]');
    const authorText = await authorName.textContent();

    expect(authorText).toMatch(/agent|bot|ai/i);

    // Verify author badge exists
    const authorBadge = agentCommentElement.locator('[data-testid="author-badge"]');
    await expect(authorBadge).toBeVisible();

    console.log(`✅ Test passed: Agent metadata correct - ${authorText}`);
  });

  test('TDD-4: No infinite loop in comment processing', async ({ page }) => {
    /**
     * TEST GOAL: Verify agents don't create infinite comment loops
     * EXPECTED: Will FAIL if infinite loops exist
     */

    // ARRANGE: Find starter post
    const { id: postId, element: postElement } = await findStarterPost(page);

    // Get initial comment count
    const commentsBefore = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    // ACT: Submit comment
    const commentInput = postElement.locator('[data-testid="comment-input"]');
    await commentInput.fill('Testing for infinite loops');

    const submitButton = postElement.locator('[data-testid="comment-submit"]');
    await submitButton.click();

    console.log('Comment submitted for infinite loop test');

    // Wait for initial agent response
    await page.waitForTimeout(5000);

    // ASSERT: Count comments after initial response
    const commentsAfterFirst = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    console.log(`Comments after first response: ${commentsAfterFirst}`);

    // Wait additional time to detect infinite loops
    await page.waitForTimeout(10000);

    // Take screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-infinite-loop-check.png`,
      fullPage: true
    });

    // Count final comments
    const commentsFinal = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    console.log(`Final comment count: ${commentsFinal}`);

    // ASSERT: Should have exactly user comment + 1 agent response
    // If more comments appear, infinite loop detected
    expect(commentsFinal).toBeLessThanOrEqual(commentsBefore + 2);

    // Additional check: No excessive comment creation
    expect(commentsFinal - commentsBefore).toBeLessThanOrEqual(2);

    console.log('✅ Test passed: No infinite loop detected');
  });

  test('TDD-5: Multiple users commenting triggers separate agent responses', async ({ page, context }) => {
    /**
     * TEST GOAL: Verify agents respond to multiple users independently
     * EXPECTED: Will FAIL initially - guides implementation
     */

    // ARRANGE: Open second page (simulating second user)
    const page2 = await context.newPage();
    await page2.goto(FRONTEND_URL);
    await page2.waitForLoadState('networkidle');

    // Find starter post on both pages
    const { id: postId, element: postElement1 } = await findStarterPost(page);
    const { element: postElement2 } = await findStarterPost(page2);

    const commentsBefore = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    // ACT: User 1 comments
    const commentInput1 = postElement1.locator('[data-testid="comment-input"]');
    await commentInput1.fill('User 1 comment');
    await postElement1.locator('[data-testid="comment-submit"]').click();

    await page.waitForTimeout(2000);

    // User 2 comments
    const commentInput2 = postElement2.locator('[data-testid="comment-input"]');
    await commentInput2.fill('User 2 comment');
    await postElement2.locator('[data-testid="comment-submit"]').click();

    console.log('Two users posted comments');

    // Take screenshots
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-multi-user-page1.png`,
      fullPage: true
    });
    await page2.screenshot({
      path: `${SCREENSHOT_DIR}/09-multi-user-page2.png`,
      fullPage: true
    });

    // ASSERT: Wait for both agent responses
    await page.waitForTimeout(15000);

    const commentsFinal = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    // Should have: 2 user comments + at least 1 agent response
    expect(commentsFinal).toBeGreaterThanOrEqual(commentsBefore + 3);

    console.log(`✅ Test passed: Multi-user comments handled - ${commentsFinal} total comments`);

    await page2.close();
  });

  test('TDD-6: Agent response contains relevant content', async ({ page }) => {
    /**
     * TEST GOAL: Verify agent responses are contextual and relevant
     * EXPECTED: Will FAIL initially - guides implementation
     */

    // ARRANGE: Find starter post
    const { id: postId, element: postElement } = await findStarterPost(page);

    // ACT: Submit specific question
    const testQuestion = 'What features does this app have?';
    const commentInput = postElement.locator('[data-testid="comment-input"]');
    await commentInput.fill(testQuestion);

    const submitButton = postElement.locator('[data-testid="comment-submit"]');
    await submitButton.click();

    console.log(`Posted question: ${testQuestion}`);

    const commentsBefore = await page.locator(`[data-post-id="${postId}"] [data-testid="comment-item"]`).count();

    // ASSERT: Wait for agent response
    const agentComment = await waitForAgentResponse(page, postId, commentsBefore);

    // Take screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-agent-content-relevance.png`,
      fullPage: true
    });

    // Verify response has content
    expect(agentComment.content).toBeTruthy();
    expect(agentComment.content.length).toBeGreaterThan(10);

    // Verify response is not just an echo
    expect(agentComment.content).not.toBe(testQuestion);

    console.log(`✅ Test passed: Agent response has relevant content: "${agentComment.content.substring(0, 50)}..."`);
  });
});

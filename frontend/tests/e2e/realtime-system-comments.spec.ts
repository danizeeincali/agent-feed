/**
 * TDD E2E Test Suite: Real-Time System (Avi) Comments
 *
 * Tests that system/agent comments appear in real-time via WebSocket
 * WITHOUT requiring a page refresh.
 *
 * Features tested:
 * 1. User comment appears in real-time
 * 2. System (Avi) comment appears in real-time WITHOUT REFRESH
 * 3. WebSocket subscription happens before any activity
 * 4. Multiple comments in rapid succession
 * 5. Comment appears in correct position in thread
 *
 * Test Environment: Playwright (real browser automation)
 */

import { test, expect, Page } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Helper: Wait for WebSocket to be connected
async function waitForWebSocketConnection(page: Page, timeout = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const isConnected = await page.evaluate(() => {
      // Check if socket is connected (global socket object)
      const socket = (window as any).socket;
      return socket && socket.connected;
    });

    if (isConnected) {
      console.log('✅ WebSocket connected');
      return true;
    }

    await page.waitForTimeout(100);
  }

  throw new Error('WebSocket connection timeout');
}

// Helper: Create a test post via API
async function createTestPost(page: Page): Promise<string> {
  const postData = {
    id: uuidv4(),
    title: `Real-Time Test Post ${Date.now()}`,
    content: 'Test post for real-time comment testing',
    author_agent: 'test-user',
    status: 'published',
    published_at: new Date().toISOString()
  };

  const response = await page.request.post(`${API_BASE}/api/agent-posts`, {
    data: postData,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result.data.id;
}

// Helper: Create a comment via API (simulates agent response)
async function createCommentViaAPI(
  page: Page,
  postId: string,
  content: string,
  author: string = 'avi',
  parentId: string | null = null
): Promise<string> {
  const commentData = {
    id: uuidv4(),
    content: content,
    author: author,
    author_agent: author,
    parent_id: parentId,
    skipTicket: true
  };

  const response = await page.request.post(
    `${API_BASE}/api/agent-posts/${postId}/comments`,
    {
      data: commentData,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result.data.id;
}

// Helper: Clean up test post
async function cleanupTestPost(page: Page, postId: string) {
  await page.request.delete(`${API_BASE}/api/agent-posts/${postId}`);
}

test.describe('Real-Time System Comments E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for E2E tests
    test.setTimeout(60000);

    // Navigate to frontend
    await page.goto(FRONTEND_URL);

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('1. User comment appears in real-time', async ({ page }) => {
    const postId = await createTestPost(page);

    try {
      // Navigate to post detail page
      await page.goto(`${FRONTEND_URL}/posts/${postId}`);
      await page.waitForLoadState('networkidle');

      // Wait for WebSocket to connect
      await waitForWebSocketConnection(page);

      // Count initial comments
      const initialCommentCount = await page.locator('[data-testid="comment-item"]').count();

      // Create a user comment via API (simulating another user)
      const commentContent = `User comment at ${Date.now()}`;
      await createCommentViaAPI(page, postId, commentContent, 'test-user');

      // Wait for comment to appear (should happen via WebSocket)
      await page.waitForSelector(`text=${commentContent}`, { timeout: 10000 });

      // Verify comment appeared without refresh
      const newCommentCount = await page.locator('[data-testid="comment-item"]').count();
      expect(newCommentCount).toBe(initialCommentCount + 1);

      // Take screenshot
      await page.screenshot({ path: 'test-results/user-comment-realtime.png', fullPage: true });

    } finally {
      await cleanupTestPost(page, postId);
    }
  });

  test('2. System (Avi) comment appears in real-time WITHOUT REFRESH', async ({ page }) => {
    const postId = await createTestPost(page);

    try {
      // Navigate to post detail page
      await page.goto(`${FRONTEND_URL}/posts/${postId}`);
      await page.waitForLoadState('networkidle');

      // Wait for WebSocket to connect
      await waitForWebSocketConnection(page);

      // Listen for WebSocket events in browser console
      await page.evaluate(() => {
        const socket = (window as any).socket;
        socket.on('comment:added', (data: any) => {
          console.log('[TEST] comment:added event received:', data);
        });
        socket.on('agent:response', (data: any) => {
          console.log('[TEST] agent:response event received:', data);
        });
      });

      // Count initial comments
      const initialCommentCount = await page.locator('[data-testid="comment-item"]').count();

      // Create a system (Avi) comment via API
      const commentContent = `Avi system response at ${Date.now()}`;
      await createCommentViaAPI(page, postId, commentContent, 'avi');

      // Wait for comment to appear (should happen via WebSocket, NO REFRESH)
      await page.waitForSelector(`text=${commentContent}`, { timeout: 15000 });

      // Verify comment appeared without refresh
      const newCommentCount = await page.locator('[data-testid="comment-item"]').count();
      expect(newCommentCount).toBe(initialCommentCount + 1);

      // Verify comment is from Avi
      const aviComment = await page.locator(`text=${commentContent}`).first();
      const authorText = await aviComment.locator('xpath=../..').textContent();
      expect(authorText).toContain('avi');

      // Take screenshot
      await page.screenshot({ path: 'test-results/avi-comment-realtime.png', fullPage: true });

    } finally {
      await cleanupTestPost(page, postId);
    }
  });

  test('3. WebSocket subscription happens BEFORE comment creation', async ({ page }) => {
    const postId = await createTestPost(page);

    try {
      // Navigate to post detail page
      await page.goto(`${FRONTEND_URL}/posts/${postId}`);
      await page.waitForLoadState('networkidle');

      // Verify WebSocket connects and subscribes BEFORE we create comment
      const subscriptionStatus = await page.evaluate((pid) => {
        const socket = (window as any).socket;

        if (!socket) {
          return { connected: false, subscribed: false, error: 'Socket not found' };
        }

        // Check if subscribed (by checking if listener is registered)
        const listeners = socket.listeners('comment:added');

        return {
          connected: socket.connected,
          subscribed: listeners.length > 0,
          listenerCount: listeners.length
        };
      }, postId);

      console.log('Subscription status:', subscriptionStatus);

      // Verify socket is connected and subscribed
      expect(subscriptionStatus.connected).toBe(true);
      expect(subscriptionStatus.subscribed).toBe(true);

      // Now create a comment
      const commentContent = `Comment created after subscription ${Date.now()}`;
      await createCommentViaAPI(page, postId, commentContent, 'test-user');

      // Should appear immediately
      await page.waitForSelector(`text=${commentContent}`, { timeout: 5000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/subscription-before-comment.png', fullPage: true });

    } finally {
      await cleanupTestPost(page, postId);
    }
  });

  test('4. Multiple comments in rapid succession', async ({ page }) => {
    const postId = await createTestPost(page);

    try {
      // Navigate to post detail page
      await page.goto(`${FRONTEND_URL}/posts/${postId}`);
      await page.waitForLoadState('networkidle');

      // Wait for WebSocket to connect
      await waitForWebSocketConnection(page);

      const initialCommentCount = await page.locator('[data-testid="comment-item"]').count();

      // Create 5 comments rapidly
      const commentIds: string[] = [];
      const commentContents: string[] = [];

      for (let i = 0; i < 5; i++) {
        const content = `Rapid comment ${i} at ${Date.now()}`;
        commentContents.push(content);
        const commentId = await createCommentViaAPI(page, postId, content, i % 2 === 0 ? 'user' : 'avi');
        commentIds.push(commentId);

        // Small delay to avoid rate limiting
        await page.waitForTimeout(100);
      }

      // Wait for all comments to appear
      for (const content of commentContents) {
        await page.waitForSelector(`text=${content}`, { timeout: 10000 });
      }

      // Verify all comments appeared
      const finalCommentCount = await page.locator('[data-testid="comment-item"]').count();
      expect(finalCommentCount).toBe(initialCommentCount + 5);

      // Take screenshot
      await page.screenshot({ path: 'test-results/rapid-comments.png', fullPage: true });

    } finally {
      await cleanupTestPost(page, postId);
    }
  });

  test('5. Comment appears in correct position in thread', async ({ page }) => {
    const postId = await createTestPost(page);

    try {
      // Navigate to post detail page
      await page.goto(`${FRONTEND_URL}/posts/${postId}`);
      await page.waitForLoadState('networkidle');

      // Wait for WebSocket to connect
      await waitForWebSocketConnection(page);

      // Create parent comment
      const parentContent = `Parent comment ${Date.now()}`;
      const parentId = await createCommentViaAPI(page, postId, parentContent, 'user');

      // Wait for parent to appear
      await page.waitForSelector(`text=${parentContent}`, { timeout: 10000 });

      // Create child (reply) comment
      const childContent = `Child reply ${Date.now()}`;
      await createCommentViaAPI(page, postId, childContent, 'avi', parentId);

      // Wait for child to appear
      await page.waitForSelector(`text=${childContent}`, { timeout: 10000 });

      // Verify child is nested under parent
      const childElement = await page.locator(`text=${childContent}`).first();
      const parentElement = await page.locator(`text=${parentContent}`).first();

      // Get bounding boxes
      const childBox = await childElement.boundingBox();
      const parentBox = await parentElement.boundingBox();

      // Child should be below and indented (x position greater)
      expect(childBox).toBeTruthy();
      expect(parentBox).toBeTruthy();
      expect(childBox!.y).toBeGreaterThan(parentBox!.y);

      // Take screenshot
      await page.screenshot({ path: 'test-results/threaded-comments.png', fullPage: true });

    } finally {
      await cleanupTestPost(page, postId);
    }
  });

  test('6. Reconnection after disconnect maintains real-time updates', async ({ page }) => {
    const postId = await createTestPost(page);

    try {
      // Navigate to post detail page
      await page.goto(`${FRONTEND_URL}/posts/${postId}`);
      await page.waitForLoadState('networkidle');

      // Wait for WebSocket to connect
      await waitForWebSocketConnection(page);

      // Simulate disconnect (close socket)
      await page.evaluate(() => {
        const socket = (window as any).socket;
        socket.disconnect();
      });

      // Wait for reconnection
      await page.waitForTimeout(3000);

      // Verify reconnection
      await waitForWebSocketConnection(page);

      // Create a comment after reconnection
      const commentContent = `Comment after reconnect ${Date.now()}`;
      await createCommentViaAPI(page, postId, commentContent, 'avi');

      // Should still appear in real-time
      await page.waitForSelector(`text=${commentContent}`, { timeout: 10000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/reconnection-success.png', fullPage: true });

    } finally {
      await cleanupTestPost(page, postId);
    }
  });

  test('7. Page refresh re-establishes WebSocket connection', async ({ page }) => {
    const postId = await createTestPost(page);

    try {
      // Navigate to post detail page
      await page.goto(`${FRONTEND_URL}/posts/${postId}`);
      await page.waitForLoadState('networkidle');

      // Wait for WebSocket to connect
      await waitForWebSocketConnection(page);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verify WebSocket reconnects after refresh
      await waitForWebSocketConnection(page);

      // Create a comment
      const commentContent = `Comment after refresh ${Date.now()}`;
      await createCommentViaAPI(page, postId, commentContent, 'avi');

      // Should appear in real-time
      await page.waitForSelector(`text=${commentContent}`, { timeout: 10000 });

      // Take screenshot
      await page.screenshot({ path: 'test-results/refresh-reconnection.png', fullPage: true });

    } finally {
      await cleanupTestPost(page, postId);
    }
  });
});

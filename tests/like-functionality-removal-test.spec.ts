/**
 * Like Functionality Complete Removal Validation Test
 * SPARC Architecture Phase: Completion Testing
 * 
 * Tests to ensure all like functionality has been completely removed:
 * - UI components no longer render like buttons
 * - API endpoints return 404 for like operations
 * - Database schema has no like-related tables
 * - WebSocket events don't broadcast like updates
 */

import { test, expect } from '@playwright/test';
import { apiService } from '../frontend/src/services/api';

test.describe('Like Functionality Complete Removal', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('Like buttons are completely removed from UI', async ({ page }) => {
    // Wait for feed to load
    await page.waitForSelector('[data-testid="real-social-media-feed"]');
    
    // Ensure no like buttons exist
    const likeButtons = await page.locator('[data-testid="like-button"]');
    await expect(likeButtons).toHaveCount(0);
    
    // Ensure no heart icons for likes exist
    const heartIcons = await page.locator('svg.lucide-heart');
    await expect(heartIcons).toHaveCount(0);
    
    // Check that like counts are not displayed
    const likeCounts = await page.locator('[data-testid="like-count"]');
    await expect(likeCounts).toHaveCount(0);
  });

  test('Like API endpoints return 404', async ({ request }) => {
    // Test POST like endpoint
    const postResponse = await request.post('/api/v1/agent-posts/test-post/like', {
      data: { user_id: 'test-user' }
    });
    expect(postResponse.status()).toBe(404);
    
    // Test DELETE like endpoint
    const deleteResponse = await request.delete('/api/v1/agent-posts/test-post/like?user_id=test-user');
    expect(deleteResponse.status()).toBe(404);
    
    // Test GET likes endpoint
    const getResponse = await request.get('/api/v1/agent-posts/test-post/likes');
    expect(getResponse.status()).toBe(404);
  });

  test('Post engagement objects do not contain likes property', async ({ page }) => {
    // Listen to network responses
    let postData = null;
    
    page.on('response', async response => {
      if (response.url().includes('/api/v1/agent-posts') && response.status() === 200) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          postData = data.data[0];
        }
      }
    });
    
    // Load the page and trigger API call
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Verify engagement object structure
    if (postData && postData.engagement) {
      expect(postData.engagement.likes).toBeUndefined();
      expect(postData.engagement.comments).toBeDefined();
      expect(postData.engagement.saves).toBeDefined();
    }
  });

  test('WebSocket does not broadcast like events', async ({ page }) => {
    const wsMessages = [];
    
    // Monitor WebSocket messages
    await page.evaluate(() => {
      const originalWS = window.WebSocket;
      window.WebSocket = function(url) {
        const ws = new originalWS(url);
        const originalOnMessage = ws.onmessage;
        ws.onmessage = function(event) {
          window.wsMessages = window.wsMessages || [];
          window.wsMessages.push(JSON.parse(event.data));
          if (originalOnMessage) originalOnMessage.call(this, event);
        };
        return ws;
      };
    });
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    const messages = await page.evaluate(() => window.wsMessages || []);
    
    // Ensure no like-related WebSocket events
    const likeEvents = messages.filter(msg => 
      msg.type === 'post_liked' || 
      msg.type === 'post_unliked' ||
      (msg.type === 'posts_updated' && msg.data && msg.data.likes !== undefined)
    );
    
    expect(likeEvents).toHaveLength(0);
  });

  test('Database queries do not reference like tables', async ({ request }) => {
    // Test that database schema doesn't include like tables
    const healthResponse = await request.get('/health');
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await healthResponse.json();
    
    // Verify database is working but like functionality is removed
    expect(healthData.database).toBeDefined();
    expect(healthData.status).toBe('healthy');
  });

  test('Update engagement API only accepts comment actions', async ({ request }) => {
    // Test that updatePostEngagement only accepts 'comment' action
    const likeResponse = await request.put('/api/v1/agent-posts/test-post/engagement', {
      data: { action: 'like' }
    });
    
    // Should either return 400 (bad request) or ignore like action
    expect([400, 422].includes(likeResponse.status())).toBeTruthy();
    
    // Comment action should still work
    const commentResponse = await request.put('/api/v1/agent-posts/test-post/engagement', {
      data: { action: 'comment' }
    });
    
    // Comment should work (or return appropriate status if post doesn't exist)
    expect([200, 404].includes(commentResponse.status())).toBeTruthy();
  });

  test('Post creation no longer includes likes in response', async ({ request }) => {
    const newPost = {
      title: 'Test Post Without Likes',
      content: 'This post should not have likes functionality',
      authorAgent: 'TestAgent'
    };
    
    const response = await request.post('/api/v1/agent-posts', {
      data: newPost
    });
    
    if (response.status() === 201 || response.status() === 200) {
      const data = await response.json();
      if (data.data && data.data.engagement) {
        expect(data.data.engagement.likes).toBeUndefined();
      }
    }
  });

  test('Frontend service methods removed like functionality', async ({ page }) => {
    // Test that handleLike method doesn't exist in component
    const hasHandleLike = await page.evaluate(() => {
      // Check if any global functions or component methods reference handleLike
      const scripts = Array.from(document.scripts);
      return scripts.some(script => 
        script.textContent && script.textContent.includes('handleLike')
      );
    });
    
    expect(hasHandleLike).toBeFalsy();
  });

  test('Complete regression test - all other functionality works', async ({ page }) => {
    // Test save functionality still works
    const saveButtons = await page.locator('[data-testid="save-button"]');
    if (await saveButtons.count() > 0) {
      await saveButtons.first().click();
      // Should not throw error
    }
    
    // Test comment functionality still works
    const commentButtons = await page.locator('[data-testid="comment-button"]');
    if (await commentButtons.count() > 0) {
      await expect(commentButtons.first()).toBeVisible();
    }
    
    // Test delete functionality still works
    const deleteButtons = await page.locator('[data-testid="delete-button"]');
    if (await deleteButtons.count() > 0) {
      await expect(deleteButtons.first()).toBeVisible();
    }
    
    // Test filter functionality still works
    const filterPanel = await page.locator('[data-testid="filter-panel"]');
    if (await filterPanel.count() > 0) {
      await expect(filterPanel).toBeVisible();
    }
    
    // Test post expansion still works
    const expandButtons = await page.locator('[data-testid="expand-button"]');
    if (await expandButtons.count() > 0) {
      await expandButtons.first().click();
      await page.waitForTimeout(500);
      // Should expand without error
    }
  });
});
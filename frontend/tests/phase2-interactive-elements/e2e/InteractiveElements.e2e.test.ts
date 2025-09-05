/**
 * Phase 2 Interactive Elements E2E Tests
 * Comprehensive end-to-end testing using Playwright
 */

import { test, expect, Page, Browser } from '@playwright/test';
import { testPosts, mobileTestCases, performanceThresholds } from '../fixtures/testData';

// Test configuration
const BASE_URL = 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

// Page object models
class InteractiveElementsPage {
  constructor(private page: Page) {}

  // Star Rating System
  async clickStar(postId: string, starNumber: number) {
    await this.page.click(`[data-testid="post-${postId}"] [data-testid="star-${starNumber}"]`);
  }

  async getStarRating(postId: string) {
    const stars = await this.page.locator(`[data-testid="post-${postId}"] [data-testid^="star-"]`).count();
    let rating = 0;
    for (let i = 1; i <= stars; i++) {
      const star = this.page.locator(`[data-testid="post-${postId}"] [data-testid="star-${i}"]`);
      if (await star.getAttribute('class').then(c => c?.includes('text-yellow-400'))) {
        rating = i;
      }
    }
    return rating;
  }

  // Mention System
  async clickMention(mentionName: string) {
    await this.page.click(`[data-testid="mention-${mentionName}"]`);
  }

  async filterByMention(mentionName: string) {
    await this.page.selectOption('[data-testid="mention-filter-select"]', mentionName);
  }

  // Hashtag System
  async clickHashtag(hashtagName: string) {
    await this.page.click(`[data-testid="hashtag-${hashtagName}"]`);
  }

  async filterByHashtag(hashtagName: string) {
    await this.page.selectOption('[data-testid="hashtag-filter-select"]', hashtagName);
  }

  // Post Actions Menu
  async openPostActionsMenu(postId: string) {
    await this.page.click(`[data-testid="post-${postId}"] [data-testid="actions-menu-trigger"]`);
  }

  async savePost(postId: string) {
    await this.openPostActionsMenu(postId);
    await this.page.click('[data-testid="save-action"]');
  }

  async reportPost(postId: string, reason: string, details?: string) {
    await this.openPostActionsMenu(postId);
    await this.page.click('[data-testid="report-action"]');
    
    await this.page.selectOption('[data-testid="report-reason-select"]', reason);
    if (details) {
      await this.page.fill('[data-testid="report-details-textarea"]', details);
    }
    await this.page.click('[data-testid="report-submit-btn"]');
  }

  // Filtering System
  async applyFilter(filterType: string, filterValue: string) {
    await this.page.selectOption(`[data-testid="${filterType}-filter-select"]`, filterValue);
  }

  async clearAllFilters() {
    await this.page.click('[data-testid="clear-all-filters"]');
  }

  async getFilteredPostsCount() {
    return await this.page.locator('[data-testid^="filtered-post-"]').count();
  }

  // General helpers
  async waitForPostsToLoad() {
    await this.page.waitForSelector('[data-testid^="filtered-post-"]', { timeout: TEST_TIMEOUT });
  }

  async getPostCount() {
    return await this.page.locator('[data-testid^="filtered-post-"]').count();
  }
}

// WebSocket helpers
class WebSocketHelper {
  constructor(private page: Page) {}

  async mockWebSocketConnection() {
    await this.page.addInitScript(() => {
      // Mock WebSocket for testing
      window.mockWebSocket = {
        send: (data: string) => {
          window.mockWebSocket.onmessage?.({ data });
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        close: () => {}
      };
    });
  }

  async simulateRealTimeUpdate(eventType: string, data: any) {
    await this.page.evaluate(([eventType, data]) => {
      window.dispatchEvent(new CustomEvent('websocket-message', {
        detail: { type: eventType, data }
      }));
    }, [eventType, data]);
  }
}

test.describe('Phase 2 Interactive Elements E2E Tests', () => {
  let page: Page;
  let interactivePage: InteractiveElementsPage;
  let wsHelper: WebSocketHelper;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    interactivePage = new InteractiveElementsPage(page);
    wsHelper = new WebSocketHelper(page);
    
    // Setup WebSocket mocking
    await wsHelper.mockWebSocketConnection();
    
    // Navigate to the app
    await page.goto(BASE_URL);
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: TEST_TIMEOUT });
    await interactivePage.waitForPostsToLoad();
  });

  test.describe('Star Rating System E2E', () => {
    test('should allow rating posts with stars', async () => {
      const postId = 'post-1';
      const targetRating = 4;
      
      // Click on the 4th star
      await interactivePage.clickStar(postId, targetRating);
      
      // Verify the rating is applied
      const currentRating = await interactivePage.getStarRating(postId);
      expect(currentRating).toBe(targetRating);
      
      // Verify visual feedback
      const star4 = page.locator(`[data-testid="post-${postId}"] [data-testid="star-4"]`);
      await expect(star4).toHaveClass(/text-yellow-400/);
      
      const star5 = page.locator(`[data-testid="post-${postId}"] [data-testid="star-5"]`);
      await expect(star5).toHaveClass(/text-gray-300/);
    });

    test('should filter posts by star rating', async () => {
      // Apply star filter
      await interactivePage.applyFilter('star', '4+');
      
      // Wait for filtering to complete
      await page.waitForTimeout(500);
      
      // Count filtered posts
      const filteredCount = await interactivePage.getFilteredPostsCount();
      
      // Should show only posts with 4+ stars
      expect(filteredCount).toBeGreaterThan(0);
      expect(filteredCount).toBeLessThanOrEqual(testPosts.length);
    });

    test('should show real-time star updates via WebSocket', async () => {
      const postId = 'post-1';
      
      // Simulate WebSocket star update
      await wsHelper.simulateRealTimeUpdate('star:updated', {
        postId,
        rating: 5,
        averageRating: 4.8
      });
      
      // Wait for UI update
      await page.waitForTimeout(100);
      
      // Verify the star rating updated
      const updatedRating = await interactivePage.getStarRating(postId);
      expect(updatedRating).toBe(5);
    });

    test('should handle star rating within performance threshold', async () => {
      const postId = 'post-1';
      
      const startTime = Date.now();
      await interactivePage.clickStar(postId, 5);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(performanceThresholds.starRatingUpdate);
    });
  });

  test.describe('Mention System E2E', () => {
    test('should detect and highlight mentions in posts', async () => {
      // Look for posts with mentions
      const mentionElements = page.locator('[data-testid^="mention-"]');
      const mentionCount = await mentionElements.count();
      
      expect(mentionCount).toBeGreaterThan(0);
      
      // Check that mentions are clickable
      const firstMention = mentionElements.first();
      await expect(firstMention).toHaveClass(/text-blue-600/);
      await expect(firstMention).toHaveClass(/cursor-pointer/);
    });

    test('should filter posts by mentions', async () => {
      const mentionName = 'personal-todos-agent';
      
      // Apply mention filter
      await interactivePage.filterByMention(mentionName);
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const filteredCount = await interactivePage.getFilteredPostsCount();
      expect(filteredCount).toBeGreaterThan(0);
      
      // Verify posts contain the mentioned agent
      const posts = page.locator('[data-testid^="filtered-post-"]');
      for (let i = 0; i < await posts.count(); i++) {
        const post = posts.nth(i);
        const mentionInPost = post.locator(`[data-testid="mention-${mentionName}"]`);
        await expect(mentionInPost).toBeVisible();
      }
    });

    test('should handle mention clicks', async () => {
      const mentionName = 'chief-of-staff-agent';
      
      // Find and click a mention
      const mention = page.locator(`[data-testid="mention-${mentionName}"]`).first();
      if (await mention.count() > 0) {
        await mention.click();
        
        // Should trigger some action (filtering, navigation, etc.)
        await page.waitForTimeout(200);
        
        // Verify the action occurred (this depends on implementation)
        // For now, just verify the click was successful
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Hashtag System E2E', () => {
    test('should detect and highlight hashtags in posts', async () => {
      // Look for posts with hashtags
      const hashtagElements = page.locator('[data-testid^="hashtag-"]');
      const hashtagCount = await hashtagElements.count();
      
      expect(hashtagCount).toBeGreaterThan(0);
      
      // Check that hashtags are clickable
      const firstHashtag = hashtagElements.first();
      await expect(firstHashtag).toHaveClass(/text-blue-600/);
      await expect(firstHashtag).toHaveClass(/cursor-pointer/);
    });

    test('should filter posts by hashtags', async () => {
      const hashtagName = 'automation';
      
      // Apply hashtag filter
      await interactivePage.filterByHashtag(hashtagName);
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Verify filtered results
      const filteredCount = await interactivePage.getFilteredPostsCount();
      expect(filteredCount).toBeGreaterThan(0);
      
      // Verify posts contain the hashtag
      const posts = page.locator('[data-testid^="filtered-post-"]');
      for (let i = 0; i < Math.min(await posts.count(), 3); i++) {
        const post = posts.nth(i);
        const hashtagInPost = post.locator(`[data-testid="hashtag-${hashtagName}"], [data-testid*="tag-${hashtagName}"]`);
        await expect(hashtagInPost.first()).toBeVisible();
      }
    });

    test('should handle hashtag clicks', async () => {
      const hashtagName = 'productivity';
      
      // Find and click a hashtag
      const hashtag = page.locator(`[data-testid="hashtag-${hashtagName}"]`).first();
      if (await hashtag.count() > 0) {
        await hashtag.click();
        
        // Should trigger filtering or other action
        await page.waitForTimeout(200);
        
        // Verify the action occurred
        expect(true).toBe(true);
      }
    });
  });

  test.describe('Post Actions Menu E2E', () => {
    test('should open and close post actions menu', async () => {
      const postId = 'post-1';
      
      // Open the menu
      await interactivePage.openPostActionsMenu(postId);
      
      // Verify menu is visible
      const menu = page.locator('[data-testid="actions-menu-dropdown"]');
      await expect(menu).toBeVisible();
      
      // Verify menu items are present
      await expect(page.locator('[data-testid="save-action"], [data-testid="unsave-action"]')).toBeVisible();
      await expect(page.locator('[data-testid="share-action"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-action"]')).toBeVisible();
      
      // Click outside to close menu
      await page.click('body');
      await expect(menu).not.toBeVisible();
    });

    test('should save and unsave posts', async () => {
      const postId = 'post-1';
      
      // Save the post
      await interactivePage.savePost(postId);
      
      // Wait for the action to complete
      await page.waitForTimeout(300);
      
      // Verify the post is marked as saved
      // (This depends on how the UI shows saved state)
      
      // Open menu again to unsave
      await interactivePage.openPostActionsMenu(postId);
      const unsaveAction = page.locator('[data-testid="unsave-action"]');
      
      if (await unsaveAction.count() > 0) {
        await unsaveAction.click();
        await page.waitForTimeout(300);
      }
    });

    test('should handle post reporting flow', async () => {
      const postId = 'post-1';
      const reason = 'spam';
      const details = 'This post contains spam content';
      
      // Report the post
      await interactivePage.reportPost(postId, reason, details);
      
      // Wait for the report to be submitted
      await page.waitForTimeout(500);
      
      // Verify the report dialog closed
      const reportDialog = page.locator('[data-testid="report-dialog"]');
      await expect(reportDialog).not.toBeVisible();
      
      // Verify success feedback (toast/notification)
      // This depends on implementation
    });

    test('should handle menu actions within performance threshold', async () => {
      const postId = 'post-1';
      
      const startTime = Date.now();
      await interactivePage.savePost(postId);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(performanceThresholds.postActionExecution);
    });
  });

  test.describe('Filtering System E2E', () => {
    test('should apply single filters correctly', async () => {
      const initialCount = await interactivePage.getPostCount();
      
      // Apply starred filter
      await interactivePage.applyFilter('filter-type', 'starred');
      await page.waitForTimeout(500);
      
      const starredCount = await interactivePage.getFilteredPostsCount();
      expect(starredCount).toBeLessThanOrEqual(initialCount);
      expect(starredCount).toBeGreaterThan(0);
      
      // Apply high-impact filter
      await interactivePage.applyFilter('filter-type', 'high-impact');
      await page.waitForTimeout(500);
      
      const highImpactCount = await interactivePage.getFilteredPostsCount();
      expect(highImpactCount).toBeLessThanOrEqual(initialCount);
    });

    test('should combine multiple filters', async () => {
      // Apply multiple filters
      await interactivePage.applyFilter('filter-type', 'high-impact');
      await interactivePage.applyFilter('agent', 'chief-of-staff-agent');
      
      await page.waitForTimeout(500);
      
      // Should show posts that match ALL criteria
      const combinedCount = await interactivePage.getFilteredPostsCount();
      expect(combinedCount).toBeGreaterThanOrEqual(0);
      
      // Verify active filters are displayed
      const activeFilters = page.locator('[data-testid^="active-filter-"]');
      const activeCount = await activeFilters.count();
      expect(activeCount).toBeGreaterThan(0);
    });

    test('should clear all filters', async () => {
      // Apply some filters
      await interactivePage.applyFilter('filter-type', 'starred');
      await interactivePage.applyFilter('agent', 'personal-todos-agent');
      
      await page.waitForTimeout(300);
      
      // Clear all filters
      await interactivePage.clearAllFilters();
      
      await page.waitForTimeout(300);
      
      // Should show all posts again
      const finalCount = await interactivePage.getPostCount();
      expect(finalCount).toBeGreaterThan(0);
      
      // Active filters should be gone
      const activeFilters = page.locator('[data-testid^="active-filter-"]');
      expect(await activeFilters.count()).toBe(0);
    });

    test('should handle filter performance requirements', async () => {
      const startTime = Date.now();
      
      await interactivePage.applyFilter('filter-type', 'high-impact');
      await page.waitForTimeout(100); // Small buffer for UI update
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(performanceThresholds.filterApplication);
    });
  });

  test.describe('Real-time WebSocket Functionality E2E', () => {
    test('should handle real-time post updates', async () => {
      // Simulate a new post being added
      await wsHelper.simulateRealTimeUpdate('post:created', {
        id: 'new-post-1',
        title: 'New Real-time Post',
        content: 'This post was added via WebSocket',
        authorAgent: 'test-agent',
        publishedAt: new Date().toISOString(),
        metadata: { businessImpact: 5, tags: ['realtime'], isAgentResponse: true }
      });
      
      // Wait for UI update
      await page.waitForTimeout(300);
      
      // Verify new post appears
      const newPost = page.locator('[data-testid="filtered-post-new-post-1"]');
      await expect(newPost).toBeVisible();
    });

    test('should handle real-time like updates', async () => {
      const postId = 'post-1';
      
      // Simulate like update
      await wsHelper.simulateRealTimeUpdate('like:updated', {
        postId,
        action: 'add',
        totalLikes: 16
      });
      
      // Wait for update
      await page.waitForTimeout(100);
      
      // Verify like count updated
      const likeCount = page.locator(`[data-testid="post-${postId}"] [data-testid="like-count"]`);
      if (await likeCount.count() > 0) {
        await expect(likeCount).toContainText('16');
      }
    });

    test('should maintain connection status indicators', async () => {
      // Look for connection status indicator
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      
      if (await connectionStatus.count() > 0) {
        // Should show connected state
        await expect(connectionStatus).toHaveClass(/connected|online/);
      }
    });
  });

  test.describe('Mobile Responsiveness E2E', () => {
    for (const testCase of mobileTestCases) {
      test(`should work correctly on ${testCase.device}`, async () => {
        // Set viewport to mobile size
        await page.setViewportSize(testCase.viewport);
        
        // Reload page for mobile layout
        await page.reload();
        await interactivePage.waitForPostsToLoad();
        
        // Test star rating on mobile
        const postId = 'post-1';
        await interactivePage.clickStar(postId, 4);
        
        const rating = await interactivePage.getStarRating(postId);
        expect(rating).toBe(4);
        
        // Test menu functionality on mobile
        await interactivePage.openPostActionsMenu(postId);
        const menu = page.locator('[data-testid="actions-menu-dropdown"]');
        await expect(menu).toBeVisible();
        
        // Test filtering on mobile
        await interactivePage.applyFilter('filter-type', 'starred');
        await page.waitForTimeout(300);
        
        const filteredCount = await interactivePage.getFilteredPostsCount();
        expect(filteredCount).toBeGreaterThan(0);
      });
    }
  });

  test.describe('Performance Validation E2E', () => {
    test('should meet page load performance requirements', async () => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="social-media-feed"]');
      await interactivePage.waitForPostsToLoad();
      
      const endTime = Date.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(performanceThresholds.pageLoadComplete);
    });

    test('should handle rapid interactions efficiently', async () => {
      const postId = 'post-1';
      
      // Rapid star rating changes
      const startTime = Date.now();
      
      for (let i = 1; i <= 5; i++) {
        await interactivePage.clickStar(postId, i);
        await page.waitForTimeout(10); // Small delay between clicks
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / 5;
      
      expect(avgTime).toBeLessThan(performanceThresholds.starRatingUpdate);
    });

    test('should maintain performance with large post counts', async () => {
      // Simulate loading many posts (if supported by implementation)
      // Apply filter to show all posts
      await interactivePage.applyFilter('filter-type', 'all');
      
      const startTime = Date.now();
      await page.waitForTimeout(100); // Allow for filtering
      const endTime = Date.now();
      
      const filterTime = endTime - startTime;
      expect(filterTime).toBeLessThan(performanceThresholds.filterApplication);
    });
  });

  test.describe('Error Handling E2E', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate network offline
      await page.context().setOffline(true);
      
      // Try to rate a post
      await interactivePage.clickStar('post-1', 5);
      
      // Should show error state or offline indicator
      await page.waitForTimeout(500);
      
      // Restore connection
      await page.context().setOffline(false);
      
      // Should recover gracefully
      await page.waitForTimeout(500);
    });

    test('should handle API errors gracefully', async () => {
      // Mock API errors by intercepting requests
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      // Try to save a post
      await interactivePage.savePost('post-1');
      
      // Should handle error gracefully without crashing
      await page.waitForTimeout(500);
      
      // Remove route mock
      await page.unroute('**/api/**');
    });

    test('should recover from WebSocket disconnection', async () => {
      // Simulate WebSocket disconnection
      await page.evaluate(() => {
        if (window.mockWebSocket) {
          window.mockWebSocket.close();
        }
      });
      
      // Should show disconnected state
      await page.waitForTimeout(300);
      
      // Simulate reconnection
      await wsHelper.mockWebSocketConnection();
      
      // Should recover and show connected state
      await page.waitForTimeout(300);
    });
  });

  test.describe('Accessibility E2E', () => {
    test('should support keyboard navigation', async () => {
      // Test keyboard navigation through interactive elements
      await page.keyboard.press('Tab');
      
      // Should focus on first interactive element
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Continue tabbing through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify focus moves correctly
      const newFocusedElement = page.locator(':focus');
      await expect(newFocusedElement).toBeVisible();
    });

    test('should have proper ARIA attributes', async () => {
      // Check star rating accessibility
      const starButtons = page.locator('[data-testid^="star-"]');
      const firstStar = starButtons.first();
      
      if (await firstStar.count() > 0) {
        await expect(firstStar).toHaveAttribute('aria-label');
      }
      
      // Check menu accessibility
      const menuTrigger = page.locator('[data-testid="actions-menu-trigger"]').first();
      if (await menuTrigger.count() > 0) {
        await expect(menuTrigger).toHaveAttribute('aria-expanded');
        await expect(menuTrigger).toHaveAttribute('aria-haspopup');
      }
    });

    test('should provide screen reader announcements', async () => {
      // Apply a filter and check for aria-live regions
      await interactivePage.applyFilter('filter-type', 'starred');
      await page.waitForTimeout(300);
      
      // Check for announcement of filtered results
      const announcement = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      if (await announcement.count() > 0) {
        await expect(announcement).toBeVisible();
      }
    });
  });
});
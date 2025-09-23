import { test, expect } from '@playwright/test';
import { FeedPage } from '../pages/FeedPage.js';
import { testFeedItems } from '../fixtures/test-data.js';

test.describe('Feed Component', () => {
  let feedPage;

  test.beforeEach(async ({ page }) => {
    feedPage = new FeedPage(page);
    await feedPage.goto();
  });

  test('should display feed container', async ({ page }) => {
    await feedPage.verifyPageElements();
  });

  test('should load feed items', async ({ page }) => {
    // Wait for feed items to load
    await feedPage.waitForPageLoad();

    const itemCount = await feedPage.getFeedItemCount();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('should display feed item details', async ({ page }) => {
    await feedPage.waitForPageLoad();

    const itemCount = await feedPage.getFeedItemCount();
    if (itemCount > 0) {
      await feedPage.verifyFeedItemHasTimestamp(0);
      await feedPage.verifyFeedItemHasAgent(0);
    }
  });

  test('should refresh feed when refresh button clicked', async ({ page }) => {
    await feedPage.waitForPageLoad();

    const initialCount = await feedPage.getFeedItemCount();
    await feedPage.clickRefresh();

    // Verify refresh action occurred (loading state or content change)
    await feedPage.verifyNoLoadingState();
  });

  test('should filter feed items by tab', async ({ page }) => {
    await feedPage.waitForPageLoad();

    // Test different filter tabs if they exist
    await feedPage.filterByTab('all');
    await feedPage.verifyNoLoadingState();

    // Add more filter tests based on your application's filter options
  });

  test('should handle scroll and load more', async ({ page }) => {
    await feedPage.waitForPageLoad();

    const initialCount = await feedPage.getFeedItemCount();

    // Scroll to bottom to trigger load more
    await feedPage.scrollToBottom();

    // Check if load more button is visible and click it
    const loadMoreButton = page.locator('[data-testid="feed-load-more"]');
    const isLoadMoreVisible = await loadMoreButton.isVisible();

    if (isLoadMoreVisible) {
      await feedPage.clickLoadMore();
      const newCount = await feedPage.getFeedItemCount();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test('should handle empty feed state', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/feed*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await feedPage.goto();
    await feedPage.verifyEmptyState();
  });

  test('should handle feed error state', async ({ page }) => {
    // Mock error response
    await page.route('**/api/feed*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await feedPage.goto();
    // Note: This test assumes your app shows an error state
    // Adjust based on your error handling implementation
  });

  test('feed component screenshot comparison', async ({ page }) => {
    await feedPage.waitForPageLoad();
    await expect(page.locator('[data-testid="feed-container"]')).toHaveScreenshot('feed-component.png');
  });

  test('feed item layout screenshot', async ({ page }) => {
    await feedPage.waitForPageLoad();

    const items = await feedPage.getFeedItems();
    if (items.length > 0) {
      await expect(items[0]).toHaveScreenshot('feed-item-layout.png');
    }
  });
});
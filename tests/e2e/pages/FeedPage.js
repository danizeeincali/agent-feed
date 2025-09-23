// Page Object Model for the Feed Page
import { expect } from '@playwright/test';

export class FeedPage {
  constructor(page) {
    this.page = page;

    // Selectors
    this.feedContainer = '[data-testid="feed-container"]';
    this.feedItem = '[data-testid="feed-item"]';
    this.feedItemTitle = '[data-testid="feed-item-title"]';
    this.feedItemContent = '[data-testid="feed-item-content"]';
    this.feedItemTimestamp = '[data-testid="feed-item-timestamp"]';
    this.feedItemAgent = '[data-testid="feed-item-agent"]';
    this.refreshButton = '[data-testid="feed-refresh"]';
    this.loadMoreButton = '[data-testid="feed-load-more"]';
    this.filterTabs = '[data-testid="feed-filter-tabs"]';
    this.loadingState = '[data-testid="feed-loading"]';
    this.emptyState = '[data-testid="feed-empty"]';
    this.errorState = '[data-testid="feed-error"]';
  }

  async goto() {
    await this.page.goto('/feed');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for either feed container or empty state to be visible
    await this.page.waitForSelector(`${this.feedContainer}, ${this.emptyState}`, { state: 'visible' });
  }

  async getFeedItems() {
    return await this.page.locator(this.feedItem).all();
  }

  async getFeedItemCount() {
    return await this.page.locator(this.feedItem).count();
  }

  async clickRefresh() {
    await this.page.click(this.refreshButton);
    await this.page.waitForTimeout(1000); // Wait for refresh to complete
  }

  async clickLoadMore() {
    await this.page.click(this.loadMoreButton);
    await this.page.waitForTimeout(1000); // Wait for new items to load
  }

  async filterByTab(tabName) {
    await this.page.click(`${this.filterTabs} [data-tab="${tabName}"]`);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  async verifyFeedItem(index, expectedTitle) {
    const items = await this.getFeedItems();
    if (items.length > index) {
      const itemTitle = items[index].locator(this.feedItemTitle);
      await expect(itemTitle).toHaveText(expectedTitle);
    }
  }

  async verifyFeedItemHasTimestamp(index) {
    const items = await this.getFeedItems();
    if (items.length > index) {
      const timestamp = items[index].locator(this.feedItemTimestamp);
      await expect(timestamp).toBeVisible();
      await expect(timestamp).not.toBeEmpty();
    }
  }

  async verifyFeedItemHasAgent(index) {
    const items = await this.getFeedItems();
    if (items.length > index) {
      const agent = items[index].locator(this.feedItemAgent);
      await expect(agent).toBeVisible();
    }
  }

  async scrollToBottom() {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(500);
  }

  async verifyPageElements() {
    await expect(this.page.locator(this.refreshButton)).toBeVisible();
    await expect(this.page.locator(this.filterTabs)).toBeVisible();
  }

  async verifyEmptyState() {
    await expect(this.page.locator(this.emptyState)).toBeVisible();
    await expect(this.page.locator(this.feedContainer)).not.toBeVisible();
  }

  async verifyErrorState() {
    await expect(this.page.locator(this.errorState)).toBeVisible();
  }

  async verifyLoadingState() {
    await expect(this.page.locator(this.loadingState)).toBeVisible();
  }

  async verifyNoLoadingState() {
    await expect(this.page.locator(this.loadingState)).not.toBeVisible();
  }

  async takeScreenshot(name) {
    return await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }
}
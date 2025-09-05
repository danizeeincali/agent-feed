import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Feed Page Object Model
 * Handles interactions with the agent feed interface
 */
export class FeedPage extends BasePage {
  // Page elements
  readonly feedContainer: Locator;
  readonly postsList: Locator;
  readonly createPostButton: Locator;
  readonly feedFilters: Locator;
  readonly searchInput: Locator;
  readonly sortOptions: Locator;
  readonly loadMoreButton: Locator;
  readonly feedMetrics: Locator;
  readonly qualityIndicator: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    super(page);
    this.feedContainer = page.locator('[data-testid="feed-container"]');
    this.postsList = page.locator('[data-testid="posts-list"]');
    this.createPostButton = page.locator('[data-testid="create-post-btn"]');
    this.feedFilters = page.locator('[data-testid="feed-filters"]');
    this.searchInput = page.locator('[data-testid="feed-search"]');
    this.sortOptions = page.locator('[data-testid="sort-options"]');
    this.loadMoreButton = page.locator('[data-testid="load-more-btn"]');
    this.feedMetrics = page.locator('[data-testid="feed-metrics"]');
    this.qualityIndicator = page.locator('[data-testid="quality-indicator"]');
    this.refreshButton = page.locator('[data-testid="refresh-feed-btn"]');
  }

  async navigateToFeed() {
    await this.goto('/feed');
    await this.waitForElementVisible(this.feedContainer);
  }

  async createPost(postData: {
    title: string;
    content: string;
    tags?: string[];
    agentId?: string;
    priority?: 'low' | 'medium' | 'high';
  }) {
    await this.createPostButton.click();
    
    // Fill post creation form
    await this.fillInput('[data-testid="post-title-input"]', postData.title);
    await this.fillInput('[data-testid="post-content-textarea"]', postData.content);
    
    if (postData.agentId) {
      await this.selectOption('[data-testid="agent-select"]', postData.agentId);
    }
    
    if (postData.priority) {
      await this.selectOption('[data-testid="priority-select"]', postData.priority);
    }
    
    if (postData.tags) {
      const tagsInput = this.page.locator('[data-testid="tags-input"]');
      await tagsInput.fill(postData.tags.join(', '));
    }
    
    await this.clickElement('[data-testid="create-post-submit"]');
    
    // Wait for post to be created
    await this.waitForText('Post created successfully');
  }

  async getPostCount(): Promise<number> {
    const posts = this.postsList.locator('[data-testid^="post-item-"]');
    return await posts.count();
  }

  async getPost(postId: string): Promise<{
    title: string;
    content: string;
    author: string;
    timestamp: string;
    qualityScore: number;
    status: string;
  }> {
    const postElement = this.page.locator(`[data-testid="post-item-${postId}"]`);
    
    const title = await postElement.locator('[data-testid="post-title"]').textContent();
    const content = await postElement.locator('[data-testid="post-content"]').textContent();
    const author = await postElement.locator('[data-testid="post-author"]').textContent();
    const timestamp = await postElement.locator('[data-testid="post-timestamp"]').textContent();
    const qualityScore = await postElement.locator('[data-testid="quality-score"]').textContent();
    const status = await postElement.locator('[data-testid="post-status"]').textContent();
    
    return {
      title: title || '',
      content: content || '',
      author: author || '',
      timestamp: timestamp || '',
      qualityScore: parseFloat(qualityScore || '0'),
      status: status || ''
    };
  }

  async filterPostsByAgent(agentId: string) {
    await this.feedFilters.locator(`[data-filter="agent"][value="${agentId}"]`).click();
    await this.waitForElementVisible(this.postsList);
  }

  async filterPostsByQuality(minQuality: number) {
    const qualitySlider = this.feedFilters.locator('[data-testid="quality-slider"]');
    await qualitySlider.fill(minQuality.toString());
    await this.waitForElementVisible(this.postsList);
  }

  async searchPosts(searchTerm: string) {
    await this.searchInput.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.waitForElementVisible(this.postsList);
  }

  async sortPosts(sortBy: 'newest' | 'oldest' | 'quality' | 'engagement') {
    await this.sortOptions.locator(`[value="${sortBy}"]`).click();
    await this.waitForElementVisible(this.postsList);
  }

  async loadMorePosts() {
    const initialCount = await this.getPostCount();
    await this.loadMoreButton.click();
    
    // Wait for more posts to load
    await this.page.waitForFunction(
      (expectedCount) => {
        const posts = document.querySelectorAll('[data-testid^="post-item-"]');
        return posts.length > expectedCount;
      },
      initialCount
    );
  }

  async likePost(postId: string) {
    const likeButton = this.page.locator(`[data-testid="like-post-${postId}"]`);
    await likeButton.click();
    
    // Wait for like count to update
    await this.waitForElementVisible(
      this.page.locator(`[data-testid="post-item-${postId}"] [data-testid="like-count"].liked`)
    );
  }

  async sharePost(postId: string, platform: 'twitter' | 'linkedin' | 'facebook') {
    const shareButton = this.page.locator(`[data-testid="share-post-${postId}"]`);
    await shareButton.click();
    
    const platformButton = this.page.locator(`[data-testid="share-${platform}"]`);
    await platformButton.click();
    
    // Handle popup/new tab
    await this.handlePopup(async () => {
      // Share action handled in popup
    });
  }

  async reportPost(postId: string, reason: string) {
    const reportButton = this.page.locator(`[data-testid="report-post-${postId}"]`);
    await reportButton.click();
    
    await this.selectOption('[data-testid="report-reason-select"]', reason);
    await this.clickElement('[data-testid="submit-report-btn"]');
    
    await this.waitForText('Report submitted successfully');
  }

  async getFeedMetrics(): Promise<{
    totalPosts: number;
    activeAgents: number;
    averageQuality: number;
    engagementRate: number;
  }> {
    const totalPosts = await this.feedMetrics.locator('[data-metric="total-posts"]').textContent();
    const activeAgents = await this.feedMetrics.locator('[data-metric="active-agents"]').textContent();
    const averageQuality = await this.feedMetrics.locator('[data-metric="avg-quality"]').textContent();
    const engagementRate = await this.feedMetrics.locator('[data-metric="engagement-rate"]').textContent();
    
    return {
      totalPosts: parseInt(totalPosts || '0'),
      activeAgents: parseInt(activeAgents || '0'),
      averageQuality: parseFloat(averageQuality || '0'),
      engagementRate: parseFloat(engagementRate || '0')
    };
  }

  async waitForRealTimeUpdate() {
    // Wait for WebSocket connection indicator
    await this.waitForElementVisible(this.page.locator('[data-testid="realtime-connected"]'));
  }

  async enableAutoRefresh() {
    const autoRefreshToggle = this.page.locator('[data-testid="auto-refresh-toggle"]');
    await autoRefreshToggle.click();
    
    // Verify auto-refresh is enabled
    await this.waitForElementVisible(this.page.locator('[data-testid="auto-refresh-indicator"]'));
  }

  async refreshFeed() {
    await this.refreshButton.click();
    await this.waitForPageLoad();
  }

  async scrollToBottom() {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
  }

  async waitForInfiniteScroll() {
    const initialCount = await this.getPostCount();
    await this.scrollToBottom();
    
    // Wait for new posts to load
    await this.page.waitForFunction(
      (expectedCount) => {
        const posts = document.querySelectorAll('[data-testid^="post-item-"]');
        return posts.length > expectedCount;
      },
      initialCount
    );
  }

  async getQualityDistribution(): Promise<{ [key: string]: number }> {
    const qualityBars = this.qualityIndicator.locator('[data-testid^="quality-bar-"]');
    const distribution: { [key: string]: number } = {};
    
    const count = await qualityBars.count();
    for (let i = 0; i < count; i++) {
      const bar = qualityBars.nth(i);
      const quality = await bar.getAttribute('data-quality');
      const value = await bar.getAttribute('data-value');
      
      if (quality && value) {
        distribution[quality] = parseFloat(value);
      }
    }
    
    return distribution;
  }
}
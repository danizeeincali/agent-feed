// Page Object Model for the Home Page
import { expect } from '@playwright/test';

export class HomePage {
  constructor(page) {
    this.page = page;

    // Selectors
    this.navigationMenu = '[data-testid="navigation"]';
    this.feedSection = '[data-testid="feed-section"]';
    this.agentsSection = '[data-testid="agents-section"]';
    this.mainContent = '[data-testid="main-content"]';
    this.logo = '[data-testid="logo"]';
    this.searchBar = '[data-testid="search-bar"]';
    this.loadingSpinner = '[data-testid="loading"]';
  }

  async goto() {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    // Wait for the page to be fully loaded
    await this.page.waitForLoadState('networkidle');

    // Wait for main content to be visible
    await this.page.waitForSelector(this.mainContent, { state: 'visible' });
  }

  async navigateToFeed() {
    await this.page.click('[data-testid="nav-feed"]');
    await this.page.waitForURL('**/feed');
  }

  async navigateToAgents() {
    await this.page.click('[data-testid="nav-agents"]');
    await this.page.waitForURL('**/agents');
  }

  async searchFor(query) {
    await this.page.fill(this.searchBar, query);
    await this.page.press(this.searchBar, 'Enter');
  }

  async takeScreenshot(name) {
    return await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage: true
    });
  }

  async verifyPageElements() {
    await expect(this.page.locator(this.navigationMenu)).toBeVisible();
    await expect(this.page.locator(this.mainContent)).toBeVisible();
  }

  async verifyNoLoadingState() {
    await expect(this.page.locator(this.loadingSpinner)).not.toBeVisible();
  }
}
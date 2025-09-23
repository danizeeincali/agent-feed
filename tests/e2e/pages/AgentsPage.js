// Page Object Model for the Agents Page
import { expect } from '@playwright/test';

export class AgentsPage {
  constructor(page) {
    this.page = page;

    // Selectors
    this.agentsList = '[data-testid="agents-list"]';
    this.agentCard = '[data-testid="agent-card"]';
    this.agentName = '[data-testid="agent-name"]';
    this.agentType = '[data-testid="agent-type"]';
    this.agentDescription = '[data-testid="agent-description"]';
    this.createAgentButton = '[data-testid="create-agent-btn"]';
    this.filterDropdown = '[data-testid="agent-filter"]';
    this.searchInput = '[data-testid="agent-search"]';
    this.loadingState = '[data-testid="agents-loading"]';
    this.emptyState = '[data-testid="agents-empty"]';
  }

  async goto() {
    await this.page.goto('/agents');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for either agents list or empty state to be visible
    await this.page.waitForSelector(`${this.agentsList}, ${this.emptyState}`, { state: 'visible' });
  }

  async getAgentCards() {
    return await this.page.locator(this.agentCard).all();
  }

  async getAgentCount() {
    return await this.page.locator(this.agentCard).count();
  }

  async clickCreateAgent() {
    await this.page.click(this.createAgentButton);
  }

  async filterByType(type) {
    await this.page.selectOption(this.filterDropdown, type);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  async searchForAgent(query) {
    await this.page.fill(this.searchInput, query);
    await this.page.press(this.searchInput, 'Enter');
    await this.page.waitForTimeout(500); // Wait for search results
  }

  async clickAgent(index = 0) {
    const agents = await this.getAgentCards();
    if (agents.length > index) {
      await agents[index].click();
    }
  }

  async verifyAgentCard(index, expectedName) {
    const agents = await this.getAgentCards();
    if (agents.length > index) {
      const agentName = agents[index].locator(this.agentName);
      await expect(agentName).toHaveText(expectedName);
    }
  }

  async verifyPageElements() {
    await expect(this.page.locator(this.createAgentButton)).toBeVisible();
    await expect(this.page.locator(this.filterDropdown)).toBeVisible();
    await expect(this.page.locator(this.searchInput)).toBeVisible();
  }

  async verifyEmptyState() {
    await expect(this.page.locator(this.emptyState)).toBeVisible();
    await expect(this.page.locator(this.agentsList)).not.toBeVisible();
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
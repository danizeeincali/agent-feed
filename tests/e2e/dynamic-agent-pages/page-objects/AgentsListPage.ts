import { Page, Locator, expect } from '@playwright/test';
import { TestAgent } from '../fixtures/test-data';

/**
 * Page Object Model for Agents List Page
 * Handles interactions with the main agents listing page
 */
export class AgentsListPage {
  readonly page: Page;
  readonly agentsList: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.agentsList = page.locator('[data-testid="agent-list"]');
    this.loadingSpinner = page.locator('.spinner, [data-testid="loading"]');
    this.errorMessage = page.locator('.agents-error, [data-testid="error-message"]');
    this.pageTitle = page.locator('.agents-title, h1').first();
    this.pageSubtitle = page.locator('.agents-subtitle, .subtitle').first();
  }

  async goto(): Promise<void> {
    await this.page.goto('/agents');
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    // Wait for either loading spinner to disappear or agents list to appear
    await Promise.race([
      this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }),
      this.agentsList.waitFor({ state: 'visible', timeout: 15000 })
    ]);
    
    // Ensure network is idle
    await this.page.waitForLoadState('networkidle');
  }

  async getAgentCards(): Promise<Locator> {
    return this.page.locator('[data-testid="agent-card"]');
  }

  async getAgentCard(agentId: string): Promise<Locator> {
    return this.page.locator(`[data-testid="agent-card"][data-agent-id="${agentId}"], [data-testid="agent-card"]:has-text("${agentId}")`);
  }

  async getAgentCardCount(): Promise<number> {
    await this.agentsList.waitFor({ state: 'visible', timeout: 10000 });
    const cards = await this.getAgentCards();
    return await cards.count();
  }

  async getAgentCardInfo(agentId: string): Promise<{
    name: string;
    status: string;
    description: string;
    priority?: string;
  }> {
    const card = await this.getAgentCard(agentId);
    await expect(card).toBeVisible();

    const name = await card.locator('h3, .agent-name').first().textContent() || '';
    const statusElement = card.locator('[class*="status"], .status-indicator').first();
    const status = await statusElement.textContent() || 'unknown';
    const description = await card.locator('p, .agent-description, .description').first().textContent() || '';
    
    // Try to get priority if present
    const priorityElement = card.locator('[class*="priority"]').first();
    const priority = await priorityElement.textContent().catch(() => undefined);

    return {
      name: name.trim(),
      status: status.trim().toLowerCase(),
      description: description.trim(),
      priority: priority?.trim()
    };
  }

  async clickAgentCard(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await expect(card).toBeVisible();
    await card.click();
  }

  async clickAgentHomeButton(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await expect(card).toBeVisible();
    
    // Try multiple selectors for home button
    const homeButton = card.locator('button:has-text("Home"), [title*="Home"], [aria-label*="Home"]').first();
    await expect(homeButton).toBeVisible();
    await homeButton.click();
  }

  async clickAgentDetailsButton(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await expect(card).toBeVisible();
    
    // Try multiple selectors for details button
    const detailsButton = card.locator('button:has-text("Details"), [title*="Details"], [aria-label*="Details"]').first();
    await expect(detailsButton).toBeVisible();
    await detailsButton.click();
  }

  async hoverAgentCard(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await expect(card).toBeVisible();
    await card.hover();
    await this.page.waitForTimeout(300); // Allow hover effects to apply
  }

  async isAgentCardActive(agentId: string): Promise<boolean> {
    const card = await this.getAgentCard(agentId);
    const classes = await card.getAttribute('class') || '';
    return classes.includes('active') || classes.includes('is-active');
  }

  async getAgentCardStatus(agentId: string): Promise<string> {
    const card = await this.getAgentCard(agentId);
    const statusElement = card.locator('.status-indicator, [class*="status"]').first();
    const statusText = await statusElement.textContent();
    return statusText?.toLowerCase().trim() || 'unknown';
  }

  async getAgentCardMetadata(agentId: string): Promise<Record<string, string>> {
    const card = await this.getAgentCard(agentId);
    const metadata: Record<string, string> = {};
    
    // Look for metadata items
    const metaItems = card.locator('.meta-item, .metadata, [class*="meta"]');
    const count = await metaItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = metaItems.nth(i);
      const label = await item.locator('.meta-label, .label').first().textContent();
      const value = await item.locator('.meta-value, .value').first().textContent();
      
      if (label && value) {
        metadata[label.trim().replace(':', '')] = value.trim();
      }
    }
    
    return metadata;
  }

  async scrollToAgentCard(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await card.scrollIntoViewIfNeeded();
  }

  async waitForAgentCardsToLoad(): Promise<void> {
    await this.agentsList.waitFor({ state: 'visible', timeout: 15000 });
    
    // Wait for at least one agent card to be visible
    const firstCard = this.page.locator('[data-testid="agent-card"]').first();
    await firstCard.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for any loading animations to complete
    await this.page.waitForTimeout(500);
  }

  async isErrorDisplayed(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorMessage(): Promise<string> {
    await expect(this.errorMessage).toBeVisible();
    return await this.errorMessage.textContent() || '';
  }

  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  async getPageTitle(): Promise<string> {
    return await this.pageTitle.textContent() || '';
  }

  async getPageSubtitle(): Promise<string> {
    return await this.pageSubtitle.textContent() || '';
  }

  async getVisibleAgentIds(): Promise<string[]> {
    const cards = await this.getAgentCards();
    const count = await cards.count();
    const ids: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const id = await card.getAttribute('data-agent-id') || 
                 await card.locator('h3, .agent-name').textContent() || 
                 `agent-${i}`;
      ids.push(id.trim());
    }
    
    return ids;
  }

  async filterAgentsByStatus(status: string): Promise<string[]> {
    const cards = await this.getAgentCards();
    const count = await cards.count();
    const filteredIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const cardStatus = await card.locator('.status-indicator, [class*="status"]').first().textContent();
      
      if (cardStatus?.toLowerCase().includes(status.toLowerCase())) {
        const id = await card.getAttribute('data-agent-id') || `agent-${i}`;
        filteredIds.push(id);
      }
    }
    
    return filteredIds;
  }

  async searchAgents(searchTerm: string): Promise<void> {
    const searchInput = this.page.locator('input[placeholder*="search"], [data-testid="search-input"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.clear();
      await searchInput.fill(searchTerm);
      await this.page.waitForTimeout(500); // Allow search to filter results
    }
  }

  async assertAgentCardVisible(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await expect(card).toBeVisible();
  }

  async assertAgentCardNotVisible(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await expect(card).not.toBeVisible();
  }

  async assertMinimumAgentCards(minCount: number): Promise<void> {
    const cards = await this.getAgentCards();
    await expect(cards).toHaveCount(await cards.count(), { timeout: 10000 });
    
    const actualCount = await cards.count();
    expect(actualCount).toBeGreaterThanOrEqual(minCount);
  }
}
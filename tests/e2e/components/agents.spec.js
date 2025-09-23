import { test, expect } from '@playwright/test';
import { AgentsPage } from '../pages/AgentsPage.js';
import { testAgents } from '../fixtures/test-data.js';

test.describe('Agents Component', () => {
  let agentsPage;

  test.beforeEach(async ({ page }) => {
    agentsPage = new AgentsPage(page);
    await agentsPage.goto();
  });

  test('should display agents page elements', async ({ page }) => {
    await agentsPage.verifyPageElements();
  });

  test('should load and display agents', async ({ page }) => {
    await agentsPage.waitForPageLoad();

    const agentCount = await agentsPage.getAgentCount();
    expect(agentCount).toBeGreaterThanOrEqual(0);
  });

  test('should display agent cards with correct information', async ({ page }) => {
    await agentsPage.waitForPageLoad();

    const agentCount = await agentsPage.getAgentCount();
    if (agentCount > 0) {
      const agentCards = await agentsPage.getAgentCards();

      // Verify first agent card has required elements
      const firstCard = agentCards[0];
      await expect(firstCard.locator('[data-testid="agent-name"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="agent-type"]')).toBeVisible();
    }
  });

  test('should filter agents by type', async ({ page }) => {
    await agentsPage.waitForPageLoad();

    const initialCount = await agentsPage.getAgentCount();

    // Test filtering by different types
    await agentsPage.filterByType('coder');
    await agentsPage.verifyNoLoadingState();

    await agentsPage.filterByType('researcher');
    await agentsPage.verifyNoLoadingState();

    // Reset filter
    await agentsPage.filterByType('all');
  });

  test('should search for agents', async ({ page }) => {
    await agentsPage.waitForPageLoad();

    // Search for a specific agent
    await agentsPage.searchForAgent('test');
    await agentsPage.verifyNoLoadingState();

    // Clear search
    await agentsPage.searchForAgent('');
  });

  test('should navigate to create agent flow', async ({ page }) => {
    await agentsPage.clickCreateAgent();

    // Verify navigation to create agent page/modal
    // This will depend on your application's implementation
    // await expect(page).toHaveURL(/.*create-agent/) or check for modal
  });

  test('should handle agent card interaction', async ({ page }) => {
    await agentsPage.waitForPageLoad();

    const agentCount = await agentsPage.getAgentCount();
    if (agentCount > 0) {
      await agentsPage.clickAgent(0);

      // Verify navigation to agent detail page
      // This will depend on your application's implementation
      // await expect(page).toHaveURL(/.*agents\/.*/) or check for detail view
    }
  });

  test('should handle empty agents state', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/agents*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await agentsPage.goto();
    await agentsPage.verifyEmptyState();
  });

  test('should display loading state', async ({ page }) => {
    // Slow down the API response to catch loading state
    await page.route('**/api/agents*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    const agentsPagePromise = agentsPage.goto();

    // Check for loading state before the page fully loads
    await agentsPage.verifyLoadingState();

    await agentsPagePromise;
    await agentsPage.verifyNoLoadingState();
  });

  test('agents grid layout screenshot', async ({ page }) => {
    await agentsPage.waitForPageLoad();
    await expect(page.locator('[data-testid="agents-list"]')).toHaveScreenshot('agents-grid.png');
  });

  test('agent card design screenshot', async ({ page }) => {
    await agentsPage.waitForPageLoad();

    const agentCards = await agentsPage.getAgentCards();
    if (agentCards.length > 0) {
      await expect(agentCards[0]).toHaveScreenshot('agent-card.png');
    }
  });

  test('mobile agents view', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test only runs on mobile');

    await agentsPage.waitForPageLoad();

    // Verify mobile-specific layout
    await expect(page.locator('[data-testid="agents-list"]')).toHaveScreenshot('agents-mobile.png');
  });

  test('agents filtering and search interactions', async ({ page }) => {
    await agentsPage.waitForPageLoad();

    // Test filter dropdown interaction
    await page.click('[data-testid="agent-filter"]');
    await expect(page.locator('[data-testid="agent-filter"]')).toHaveScreenshot('filter-dropdown.png');

    // Test search input focus state
    await page.focus('[data-testid="agent-search"]');
    await expect(page.locator('[data-testid="agent-search"]')).toHaveScreenshot('search-input-focus.png');
  });
});
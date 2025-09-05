/**
 * Agent Discovery End-to-End Tests
 * London School TDD - User Journey Testing
 */

const { test, expect } = require('@playwright/test');

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  agentWorkspacePath: '/agent_workspace',
  webSocketURL: 'ws://localhost:3001'
};

/**
 * Test Data Setup
 */
const testAgents = {
  personalTodos: {
    id: 'personal-todos-agent',
    name: 'Personal TODOs Agent',
    status: 'active',
    description: 'Manages and tracks personal tasks and objectives'
  },
  meetingNextSteps: {
    id: 'meeting-next-steps-agent',
    name: 'Meeting Next Steps Agent',
    status: 'active',
    description: 'Captures and tracks action items from meetings'
  },
  agentIdeas: {
    id: 'agent-ideas-agent',
    name: 'Agent Ideas Generator',
    status: 'inactive',
    description: 'Generates and refines agent enhancement ideas'
  }
};

/**
 * Page Object Model - Agents Page
 */
class AgentsPagePOM {
  constructor(page) {
    this.page = page;
    this.agentsPage = page.locator('[data-testid="agents-page"]');
    this.searchInput = page.locator('[data-testid="agent-search"] input');
    this.filterButtons = page.locator('[data-testid="agent-filters"] button');
    this.refreshButton = page.locator('[data-testid="refresh-agents"]');
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
    this.agentGrid = page.locator('[data-testid="agents-grid"]');
    this.agentCards = page.locator('[data-testid^="agent-card-"]');
    this.agentDetails = page.locator('[data-testid="agent-details"]');
  }

  async navigateToAgentsPage() {
    await this.page.goto(`${TEST_CONFIG.baseURL}/agents`);
    await expect(this.agentsPage).toBeVisible();
  }

  async waitForInitialLoad() {
    await expect(this.loadingSpinner).toBeVisible();
    await expect(this.loadingSpinner).not.toBeVisible({ timeout: 10000 });
  }

  async searchForAgent(searchTerm) {
    await this.searchInput.fill(searchTerm);
    await this.searchInput.press('Enter');
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.searchInput.press('Enter');
  }

  async selectFilter(filterName) {
    const filterButton = this.filterButtons.filter({ hasText: filterName });
    await filterButton.click();
  }

  async refreshAgents() {
    await this.refreshButton.click();
  }

  async selectAgent(agentId) {
    const agentCard = this.page.locator(`[data-testid="agent-card-${agentId}"]`);
    await agentCard.click();
  }

  async toggleAgentStatus(agentId) {
    const statusToggle = this.page.locator(`[data-testid="status-toggle-${agentId}"]`);
    await statusToggle.click();
  }

  async getAgentCards() {
    return await this.agentCards.all();
  }

  async getVisibleAgentCount() {
    return await this.agentCards.count();
  }

  async isAgentVisible(agentId) {
    const agentCard = this.page.locator(`[data-testid="agent-card-${agentId}"]`);
    return await agentCard.isVisible();
  }

  async getAgentStatus(agentId) {
    const statusElement = this.page.locator(`[data-testid="status-${agentId}"]`);
    return await statusElement.textContent();
  }
}

test.describe('Agent Discovery E2E Tests', () => {
  let page;
  let agentsPage;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    agentsPage = new AgentsPagePOM(page);
    
    // Setup viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Initial Page Load and Agent Discovery', () => {
    test('should load agents page and discover agents automatically', async () => {
      await test.step('Navigate to agents page', async () => {
        await agentsPage.navigateToAgentsPage();
      });

      await test.step('Wait for agent discovery to complete', async () => {
        await agentsPage.waitForInitialLoad();
      });

      await test.step('Verify agents are displayed', async () => {
        const agentCount = await agentsPage.getVisibleAgentCount();
        expect(agentCount).toBeGreaterThan(0);
      });

      await test.step('Verify known agents are present', async () => {
        await expect(agentsPage.page.locator(`[data-testid="agent-card-${testAgents.personalTodos.id}"]`))
          .toBeVisible();
        await expect(agentsPage.page.locator(`[data-testid="agent-card-${testAgents.meetingNextSteps.id}"]`))
          .toBeVisible();
      });
    });

    test('should display agent cards with correct information', async () => {
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();

      await test.step('Verify Personal TODOs Agent card content', async () => {
        const personalTodosCard = agentsPage.page.locator(`[data-testid="agent-card-${testAgents.personalTodos.id}"]`);
        
        await expect(personalTodosCard.locator('.agent-name')).toContainText(testAgents.personalTodos.name);
        await expect(personalTodosCard.locator('.agent-description')).toContainText(testAgents.personalTodos.description);
        await expect(personalTodosCard.locator(`[data-testid="status-${testAgents.personalTodos.id}"]`))
          .toContainText(testAgents.personalTodos.status);
      });

      await test.step('Verify agent performance metrics are displayed', async () => {
        const metricsElement = agentsPage.page.locator(`[data-testid="agent-card-${testAgents.personalTodos.id}"] .agent-metrics`);
        await expect(metricsElement).toBeVisible();
        await expect(metricsElement.locator('.performance')).toContainText('Performance:');
      });
    });

    test('should handle agent discovery errors gracefully', async () => {
      // Mock network failure for agent discovery
      await page.route('**/api/agents/discover', route => {
        route.abort('failed');
      });

      await agentsPage.navigateToAgentsPage();

      await test.step('Verify error state is displayed', async () => {
        await expect(agentsPage.errorMessage).toBeVisible();
        await expect(agentsPage.errorMessage).toContainText('Failed to load agents');
      });

      await test.step('Verify retry mechanism is available', async () => {
        await expect(agentsPage.refreshButton).toBeVisible();
      });
    });
  });

  test.describe('Agent Search Functionality', () => {
    test.beforeEach(async () => {
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();
    });

    test('should filter agents by search term', async () => {
      await test.step('Search for "personal" agents', async () => {
        await agentsPage.searchForAgent('personal');
      });

      await test.step('Verify only personal agents are visible', async () => {
        await expect(agentsPage.page.locator(`[data-testid="agent-card-${testAgents.personalTodos.id}"]`))
          .toBeVisible();
        await expect(agentsPage.page.locator(`[data-testid="agent-card-${testAgents.meetingNextSteps.id}"]`))
          .not.toBeVisible();
      });

      await test.step('Verify search results count', async () => {
        const visibleCount = await agentsPage.getVisibleAgentCount();
        expect(visibleCount).toBe(1);
      });
    });

    test('should show all agents when search is cleared', async () => {
      await agentsPage.searchForAgent('personal');
      
      await test.step('Clear search', async () => {
        await agentsPage.clearSearch();
      });

      await test.step('Verify all agents are visible again', async () => {
        const visibleCount = await agentsPage.getVisibleAgentCount();
        expect(visibleCount).toBeGreaterThan(1);
      });
    });

    test('should handle search with no results', async () => {
      await test.step('Search for non-existent agent', async () => {
        await agentsPage.searchForAgent('nonexistent');
      });

      await test.step('Verify no results message', async () => {
        const noResultsMessage = agentsPage.page.locator('[data-testid="no-results"]');
        await expect(noResultsMessage).toBeVisible();
        await expect(noResultsMessage).toContainText('No agents found matching your search');
      });
    });

    test('should search across multiple agent properties', async () => {
      await test.step('Search by capability', async () => {
        await agentsPage.searchForAgent('task');
      });

      await test.step('Verify agents with task capabilities are shown', async () => {
        const visibleAgents = await agentsPage.getVisibleAgentCount();
        expect(visibleAgents).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Agent Filtering Functionality', () => {
    test.beforeEach(async () => {
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();
    });

    test('should filter agents by status', async () => {
      await test.step('Filter by active status', async () => {
        await agentsPage.selectFilter('Active');
      });

      await test.step('Verify only active agents are visible', async () => {
        const visibleCards = await agentsPage.getAgentCards();
        
        for (const card of visibleCards) {
          const statusElement = card.locator('[class*="agent-status"]');
          await expect(statusElement).toContainText('active');
        }
      });
    });

    test('should combine search and filter', async () => {
      await test.step('Apply search and filter', async () => {
        await agentsPage.searchForAgent('agent');
        await agentsPage.selectFilter('Active');
      });

      await test.step('Verify combined filtering results', async () => {
        const visibleCount = await agentsPage.getVisibleAgentCount();
        expect(visibleCount).toBeGreaterThan(0);
        
        // All visible agents should be active and match search
        const visibleCards = await agentsPage.getAgentCards();
        for (const card of visibleCards) {
          await expect(card.locator('[class*="agent-status"]')).toContainText('active');
        }
      });
    });

    test('should filter by agent tags', async () => {
      await test.step('Filter by productivity tag', async () => {
        await agentsPage.selectFilter('Productivity');
      });

      await test.step('Verify productivity agents are shown', async () => {
        await expect(agentsPage.page.locator(`[data-testid="agent-card-${testAgents.personalTodos.id}"]`))
          .toBeVisible();
      });
    });
  });

  test.describe('Agent Selection and Details', () => {
    test.beforeEach(async () => {
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();
    });

    test('should open agent details when agent is selected', async () => {
      await test.step('Select an agent', async () => {
        await agentsPage.selectAgent(testAgents.personalTodos.id);
      });

      await test.step('Verify details panel opens', async () => {
        await expect(agentsPage.agentDetails).toBeVisible();
      });

      await test.step('Verify correct agent details are displayed', async () => {
        await expect(agentsPage.agentDetails.locator('.agent-name'))
          .toContainText(testAgents.personalTodos.name);
        await expect(agentsPage.agentDetails.locator('.agent-description'))
          .toContainText(testAgents.personalTodos.description);
      });

      await test.step('Verify detailed metrics are shown', async () => {
        const metricsSection = agentsPage.agentDetails.locator('[data-testid="agent-metrics-detailed"]');
        await expect(metricsSection).toBeVisible();
        await expect(metricsSection.locator('.performance')).toBeVisible();
        await expect(metricsSection.locator('.reliability')).toBeVisible();
      });
    });

    test('should close agent details when close button is clicked', async () => {
      await agentsPage.selectAgent(testAgents.personalTodos.id);
      
      await test.step('Close details panel', async () => {
        const closeButton = agentsPage.agentDetails.locator('[data-testid="close-details"]');
        await closeButton.click();
      });

      await test.step('Verify details panel is closed', async () => {
        await expect(agentsPage.agentDetails).not.toBeVisible();
      });
    });

    test('should highlight selected agent card', async () => {
      await test.step('Select an agent', async () => {
        await agentsPage.selectAgent(testAgents.personalTodos.id);
      });

      await test.step('Verify agent card is highlighted', async () => {
        const selectedCard = agentsPage.page.locator(`[data-testid="agent-card-${testAgents.personalTodos.id}"]`);
        await expect(selectedCard).toHaveClass(/selected/);
      });
    });
  });

  test.describe('Real-time Agent Status Updates', () => {
    test.beforeEach(async () => {
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();
    });

    test('should update agent status in real-time via WebSocket', async () => {
      // Simulate WebSocket connection and status change
      await page.evaluate(async (config) => {
        const ws = new WebSocket(config.webSocketURL);
        
        ws.onopen = () => {
          // Simulate agent status change
          ws.send(JSON.stringify({
            type: 'agent-status-change',
            data: {
              agentId: 'personal-todos-agent',
              status: 'inactive',
              timestamp: Date.now()
            }
          }));
        };
      }, TEST_CONFIG);

      await test.step('Verify status update is reflected in UI', async () => {
        const statusElement = agentsPage.page.locator(`[data-testid="status-${testAgents.personalTodos.id}"]`);
        await expect(statusElement).toContainText('inactive', { timeout: 5000 });
      });

      await test.step('Verify visual indicator changes', async () => {
        const agentCard = agentsPage.page.locator(`[data-testid="agent-card-${testAgents.personalTodos.id}"]`);
        await expect(agentCard).toHaveClass(/inactive/);
      });
    });

    test('should handle WebSocket connection failures gracefully', async () => {
      // Mock WebSocket connection failure
      await page.addInitScript(() => {
        window.WebSocket = class extends EventTarget {
          constructor() {
            super();
            setTimeout(() => {
              this.dispatchEvent(new Event('error'));
            }, 100);
          }
        };
      });

      await agentsPage.navigateToAgentsPage();

      await test.step('Verify page still functions without WebSocket', async () => {
        await agentsPage.waitForInitialLoad();
        const agentCount = await agentsPage.getVisibleAgentCount();
        expect(agentCount).toBeGreaterThan(0);
      });

      await test.step('Verify connection status indicator shows offline', async () => {
        const connectionStatus = agentsPage.page.locator('[data-testid="connection-status"]');
        await expect(connectionStatus).toContainText('Offline');
      });
    });
  });

  test.describe('Agent Status Toggle', () => {
    test.beforeEach(async () => {
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();
    });

    test('should toggle agent status when status button is clicked', async () => {
      const initialStatus = await agentsPage.getAgentStatus(testAgents.personalTodos.id);
      
      await test.step('Toggle agent status', async () => {
        await agentsPage.toggleAgentStatus(testAgents.personalTodos.id);
      });

      await test.step('Verify status has changed', async () => {
        const newStatus = await agentsPage.getAgentStatus(testAgents.personalTodos.id);
        expect(newStatus).not.toBe(initialStatus);
      });

      await test.step('Verify visual feedback during status change', async () => {
        const statusElement = agentsPage.page.locator(`[data-testid="status-${testAgents.personalTodos.id}"]`);
        await expect(statusElement).toHaveClass(/updating/);
      });
    });

    test('should handle status toggle failures', async () => {
      // Mock API failure for status toggle
      await page.route('**/api/agents/*/status', route => {
        route.fulfill({ status: 500, body: 'Status update failed' });
      });

      await test.step('Attempt to toggle status', async () => {
        await agentsPage.toggleAgentStatus(testAgents.personalTodos.id);
      });

      await test.step('Verify error notification is shown', async () => {
        const errorNotification = agentsPage.page.locator('[data-testid="error-notification"]');
        await expect(errorNotification).toBeVisible();
        await expect(errorNotification).toContainText('Failed to update agent status');
      });

      await test.step('Verify status reverts to original state', async () => {
        const statusElement = agentsPage.page.locator(`[data-testid="status-${testAgents.personalTodos.id}"]`);
        await expect(statusElement).toContainText(testAgents.personalTodos.status);
      });
    });
  });

  test.describe('Performance and Responsiveness', () => {
    test('should load agents page within acceptable time', async () => {
      const startTime = Date.now();
      
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
    });

    test('should handle large number of agents efficiently', async () => {
      // Mock API to return many agents
      await page.route('**/api/agents/discover', route => {
        const manyAgents = Array.from({ length: 100 }, (_, i) => ({
          id: `test-agent-${i}`,
          name: `Test Agent ${i}`,
          status: i % 2 === 0 ? 'active' : 'inactive',
          description: `Test agent number ${i}`
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: manyAgents })
        });
      });

      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();

      await test.step('Verify page remains responsive with many agents', async () => {
        const agentCount = await agentsPage.getVisibleAgentCount();
        expect(agentCount).toBe(100);
        
        // Test that search still works efficiently
        await agentsPage.searchForAgent('50');
        const searchResults = await agentsPage.getVisibleAgentCount();
        expect(searchResults).toBeGreaterThan(0);
      });
    });
  });

  test.describe('Accessibility Compliance', () => {
    test.beforeEach(async () => {
      await agentsPage.navigateToAgentsPage();
      await agentsPage.waitForInitialLoad();
    });

    test('should support keyboard navigation', async () => {
      await test.step('Navigate with Tab key', async () => {
        await page.keyboard.press('Tab');
        await expect(agentsPage.searchInput).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(agentsPage.refreshButton).toBeFocused();
      });

      await test.step('Select agent with Enter key', async () => {
        const firstAgentCard = agentsPage.agentCards.first();
        await firstAgentCard.focus();
        await page.keyboard.press('Enter');
        
        await expect(agentsPage.agentDetails).toBeVisible();
      });
    });

    test('should have proper ARIA labels', async () => {
      await test.step('Verify search input has proper label', async () => {
        await expect(agentsPage.searchInput).toHaveAttribute('aria-label', /search/i);
      });

      await test.step('Verify agent cards have descriptive labels', async () => {
        const firstCard = agentsPage.agentCards.first();
        await expect(firstCard).toHaveAttribute('aria-label', /agent card/i);
      });

      await test.step('Verify filter buttons have labels', async () => {
        const filterButton = agentsPage.filterButtons.first();
        await expect(filterButton).toHaveAttribute('aria-label');
      });
    });

    test('should provide screen reader friendly content', async () => {
      await test.step('Verify heading hierarchy', async () => {
        const mainHeading = agentsPage.page.locator('h1');
        await expect(mainHeading).toBeVisible();
        await expect(mainHeading).toContainText('Agents');
      });

      await test.step('Verify status changes are announced', async () => {
        const statusRegion = agentsPage.page.locator('[aria-live="polite"]');
        await expect(statusRegion).toBeVisible();
      });
    });
  });
});
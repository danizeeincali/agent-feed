import { Page, Locator, expect } from '@playwright/test';
import { TestAgent, testAgents } from '../fixtures/test-data';

/**
 * Helper functions for Dynamic Agent Pages E2E tests
 * Provides reusable utilities for testing agent functionality
 */

export class AgentTestHelpers {
  constructor(private page: Page) {}

  // Navigation helpers
  async navigateToAgentsPage(): Promise<void> {
    await this.page.goto('/agents');
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('[data-testid="agent-list"]')).toBeVisible({ timeout: 10000 });
  }

  async navigateToAgentHome(agentId: string): Promise<void> {
    await this.page.goto(`/agents/${agentId}/home`);
    await this.page.waitForLoadState('networkidle');
    await this.waitForAgentHomePageLoad(agentId);
  }

  async navigateToAgentDetail(agentId: string): Promise<void> {
    await this.page.goto(`/agents/${agentId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // Agent card interactions
  async getAgentCard(agentId: string): Promise<Locator> {
    return this.page.locator(`[data-testid="agent-card"][data-agent-id="${agentId}"]`);
  }

  async clickAgentCard(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    await card.click();
  }

  async clickAgentHomeButton(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    const homeButton = card.locator('[title="Go to Agent Home"], button:has-text("Home")');
    await homeButton.click();
  }

  async clickAgentDetailsButton(agentId: string): Promise<void> {
    const card = await this.getAgentCard(agentId);
    const detailsButton = card.locator('[title="View Details"], button:has-text("Details")');
    await detailsButton.click();
  }

  // Agent home page interactions
  async waitForAgentHomePageLoad(agentId: string): Promise<void> {
    // Wait for main elements to be visible
    await expect(this.page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });
    
    // Wait for status indicator
    await expect(this.page.locator('.status-indicator, [class*="status"]').first()).toBeVisible({ timeout: 10000 });
    
    // Wait for stats/metrics to load
    await expect(this.page.locator('[data-testid="agent-stats"], .agent-stats').first()).toBeVisible({ timeout: 10000 });
  }

  async getAgentStatus(): Promise<string> {
    const statusElement = this.page.locator('.status-indicator, [class*="status"]').first();
    const statusText = await statusElement.textContent();
    return statusText?.toLowerCase().trim() || 'unknown';
  }

  async getAgentMetrics(): Promise<Record<string, string | number>> {
    const metrics: Record<string, string | number> = {};
    
    // Look for common metric patterns
    const metricElements = this.page.locator('[data-testid*="metric"], .metric, .stat');
    const count = await metricElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = metricElements.nth(i);
      const label = await element.locator('.metric-label, .stat-label, label').first().textContent();
      const value = await element.locator('.metric-value, .stat-value, .value').first().textContent();
      
      if (label && value) {
        metrics[label.trim()] = value.trim();
      }
    }
    
    return metrics;
  }

  // Tabs and navigation within agent home page
  async clickTab(tabName: string): Promise<void> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
    await tab.click();
    await this.page.waitForTimeout(500); // Allow tab content to load
  }

  async isTabActive(tabName: string): Promise<boolean> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
    const isActive = await tab.getAttribute('data-state') === 'active' || 
                     await tab.getAttribute('aria-selected') === 'true' ||
                     await tab.getAttribute('class')?.includes('active');
    return Boolean(isActive);
  }

  // Widget interactions
  async getWidgets(): Promise<Locator> {
    return this.page.locator('.widget, [data-testid*="widget"]');
  }

  async clickWidget(widgetId: string): Promise<void> {
    const widget = this.page.locator(`[data-widget-id="${widgetId}"], [data-testid="widget-${widgetId}"]`);
    await widget.click();
  }

  async isWidgetVisible(widgetId: string): Promise<boolean> {
    const widget = this.page.locator(`[data-widget-id="${widgetId}"], [data-testid="widget-${widgetId}"]`);
    return await widget.isVisible();
  }

  // Quick actions
  async clickQuickAction(actionLabel: string): Promise<void> {
    const action = this.page.locator(`.quick-action:has-text("${actionLabel}"), button:has-text("${actionLabel}")`);
    await action.click();
  }

  async getQuickActions(): Promise<string[]> {
    const actions = this.page.locator('.quick-action, [data-testid*="quick-action"]');
    const count = await actions.count();
    const actionLabels: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const label = await actions.nth(i).textContent();
      if (label) {
        actionLabels.push(label.trim());
      }
    }
    
    return actionLabels;
  }

  // Posts and content
  async getPosts(): Promise<Locator> {
    return this.page.locator('.post, [data-testid*="post"], article');
  }

  async getPostCount(): Promise<number> {
    const posts = await this.getPosts();
    return await posts.count();
  }

  async clickPostInteraction(postId: string, interactionType: 'like' | 'comment' | 'share' | 'bookmark'): Promise<void> {
    const post = this.page.locator(`[data-post-id="${postId}"]`);
    const interactionButton = post.locator(`button[data-interaction="${interactionType}"], button:has([data-testid*="${interactionType}"])`);
    await interactionButton.click();
  }

  // Edit mode and customization
  async enableEditMode(): Promise<void> {
    const editButton = this.page.locator('button:has-text("Edit"), [data-testid="edit-mode"]');
    await editButton.click();
    await this.page.waitForTimeout(500);
  }

  async disableEditMode(): Promise<void> {
    const doneButton = this.page.locator('button:has-text("Done"), button:has-text("Save")');
    await doneButton.click();
    await this.page.waitForTimeout(500);
  }

  async isEditModeEnabled(): Promise<boolean> {
    const editIndicators = this.page.locator('.edit-mode, [data-edit-mode="true"], button:has-text("Done")');
    return await editIndicators.first().isVisible();
  }

  // Settings and configuration
  async updateAgentName(newName: string): Promise<void> {
    const nameInput = this.page.locator('input[name="name"], input[placeholder*="name"]');
    await nameInput.clear();
    await nameInput.fill(newName);
  }

  async updateAgentDescription(newDescription: string): Promise<void> {
    const descInput = this.page.locator('textarea[name="description"], textarea[placeholder*="description"]');
    await descInput.clear();
    await descInput.fill(newDescription);
  }

  async toggleVisibilitySetting(setting: string): Promise<void> {
    const checkbox = this.page.locator(`input[type="checkbox"][name*="${setting}"], input[type="checkbox"] + label:has-text("${setting}") + input`);
    await checkbox.click();
  }

  // Responsive design helpers
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
    await this.page.waitForTimeout(500); // Allow reflow
  }

  async isMobileView(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width <= 768 : false;
  }

  async isTabletView(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width > 768 && viewport.width <= 1024 : false;
  }

  async isDesktopView(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width > 1024 : false;
  }

  // Performance helpers
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }

  async measureInteractionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  // Accessibility helpers
  async checkKeyboardNavigation(): Promise<boolean> {
    try {
      // Test Tab navigation
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);
      
      // Check if focus is visible
      const focusedElement = await this.page.locator(':focus').first();
      return await focusedElement.isVisible();
    } catch {
      return false;
    }
  }

  async checkAriaLabels(): Promise<string[]> {
    const elementsWithAriaLabels = this.page.locator('[aria-label]');
    const count = await elementsWithAriaLabels.count();
    const labels: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const label = await elementsWithAriaLabels.nth(i).getAttribute('aria-label');
      if (label) {
        labels.push(label);
      }
    }
    
    return labels;
  }

  // WebSocket and real-time testing helpers
  async waitForWebSocketConnection(): Promise<void> {
    await this.page.waitForFunction(() => {
      return (window as any).webSocketConnected === true;
    }, { timeout: 10000 });
  }

  async simulateWebSocketEvent(event: string, data: any): Promise<void> {
    await this.page.evaluate(({ event, data }) => {
      if ((window as any).mockWebSocket) {
        (window as any).mockWebSocket.emit(event, data);
      }
    }, { event, data });
  }

  // Screenshot and visual comparison helpers
  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ 
      fullPage: true,
      path: `./screenshots/${name}-${Date.now()}.png`
    });
  }

  async compareVisual(name: string, options?: { threshold?: number }): Promise<void> {
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      threshold: options?.threshold || 0.2,
      mode: 'diff-pixels'
    });
  }

  // Wait helpers
  async waitForAnimation(): Promise<void> {
    await this.page.waitForTimeout(300); // Standard animation duration
  }

  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible({ timeout });
    return element;
  }
}

// Utility functions for test data management
export class TestDataHelpers {
  static getTestAgent(id: string): TestAgent | undefined {
    return testAgents.find(agent => agent.id === id);
  }

  static getActiveAgents(): TestAgent[] {
    return testAgents.filter(agent => agent.status === 'active');
  }

  static getAgentsByType(type: string): TestAgent[] {
    return testAgents.filter(agent => agent.type === type);
  }

  static createMockAgent(overrides: Partial<TestAgent> = {}): TestAgent {
    return {
      id: `mock-agent-${Date.now()}`,
      name: 'Mock Test Agent',
      type: 'test',
      status: 'active',
      specialization: 'Testing and validation',
      description: 'A mock agent for testing purposes',
      capabilities: ['Testing', 'Validation'],
      stats: {
        tasksCompleted: 100,
        successRate: 95.0,
        averageResponseTime: 1.0,
        uptime: 99.0,
        todayTasks: 5,
        weeklyTasks: 35
      },
      avatar_color: '#6B7280',
      ...overrides
    };
  }
}

// Performance measurement utilities
export class PerformanceHelpers {
  static async measureWebVitals(page: Page): Promise<{
    fcp: number;
    lcp: number;
    cls: number;
    fid: number;
  }> {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          fcp: 0,
          lcp: 0,
          cls: 0,
          fid: 0
        };

        // Measure performance metrics using Performance Observer
        if ('PerformanceObserver' in window) {
          // First Contentful Paint
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            vitals.fcp = entries[0]?.startTime || 0;
          }).observe({ entryTypes: ['paint'] });

          // Largest Contentful Paint
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            vitals.lcp = entries[entries.length - 1]?.startTime || 0;
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // Cumulative Layout Shift
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            vitals.cls = entries.reduce((cls, entry) => cls + (entry as any).value, 0);
          }).observe({ entryTypes: ['layout-shift'] });

          setTimeout(() => resolve(vitals), 2000);
        } else {
          resolve(vitals);
        }
      });
    });
  }

  static async checkResourceLoading(page: Page): Promise<{
    totalRequests: number;
    failedRequests: number;
    slowRequests: number;
    averageLoadTime: number;
  }> {
    const requests: any[] = [];
    
    page.on('response', (response) => {
      requests.push({
        url: response.url(),
        status: response.status(),
        loadTime: 0 // Would need to track request timing
      });
    });

    await page.waitForLoadState('networkidle');

    return {
      totalRequests: requests.length,
      failedRequests: requests.filter(r => r.status >= 400).length,
      slowRequests: requests.filter(r => r.loadTime > 1000).length,
      averageLoadTime: requests.reduce((sum, r) => sum + r.loadTime, 0) / requests.length
    };
  }
}

export { TestAgent, testAgents };
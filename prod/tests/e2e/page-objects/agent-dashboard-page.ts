import { Page, Locator } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Agent Dashboard Page Object Model
 * Handles interactions with the agent dashboard interface
 */
export class AgentDashboardPage extends BasePage {
  // Page elements
  readonly agentList: Locator;
  readonly createAgentButton: Locator;
  readonly agentSearch: Locator;
  readonly agentFilters: Locator;
  readonly refreshButton: Locator;
  readonly statusIndicator: Locator;
  readonly performanceMetrics: Locator;

  constructor(page: Page) {
    super(page);
    this.agentList = page.locator('[data-testid="agent-list"]');
    this.createAgentButton = page.locator('[data-testid="create-agent-btn"]');
    this.agentSearch = page.locator('[data-testid="agent-search"]');
    this.agentFilters = page.locator('[data-testid="agent-filters"]');
    this.refreshButton = page.locator('[data-testid="refresh-btn"]');
    this.statusIndicator = page.locator('[data-testid="status-indicator"]');
    this.performanceMetrics = page.locator('[data-testid="performance-metrics"]');
  }

  async navigateToAgentDashboard() {
    await this.goto('/dashboard/agents');
    await this.waitForElementVisible(this.agentList);
  }

  async createNewAgent(agentConfig: {
    name: string;
    type: string;
    capabilities: string[];
  }) {
    await this.createAgentButton.click();
    
    // Fill agent creation form
    await this.fillInput('[data-testid="agent-name-input"]', agentConfig.name);
    await this.selectOption('[data-testid="agent-type-select"]', agentConfig.type);
    
    // Select capabilities
    for (const capability of agentConfig.capabilities) {
      await this.clickElement(`[data-testid="capability-${capability}"]`);
    }
    
    await this.clickElement('[data-testid="create-agent-submit"]');
    
    // Wait for agent to be created
    await this.waitForText(`Agent "${agentConfig.name}" created successfully`);
  }

  async getAgentStatus(agentId: string): Promise<string> {
    const statusElement = this.page.locator(`[data-testid="agent-${agentId}-status"]`);
    return await statusElement.textContent() || '';
  }

  async getActiveAgentCount(): Promise<number> {
    const activeAgents = this.page.locator('[data-testid^="agent-"][data-status="active"]');
    return await activeAgents.count();
  }

  async searchAgents(searchTerm: string) {
    await this.agentSearch.fill(searchTerm);
    await this.page.keyboard.press('Enter');
    await this.waitForElementVisible(this.agentList);
  }

  async filterAgentsByType(type: string) {
    await this.agentFilters.locator(`[value="${type}"]`).click();
    await this.waitForElementVisible(this.agentList);
  }

  async startAgent(agentId: string) {
    const startButton = this.page.locator(`[data-testid="start-agent-${agentId}"]`);
    await startButton.click();
    
    // Wait for status to change to active
    await this.waitForText('active');
  }

  async stopAgent(agentId: string) {
    const stopButton = this.page.locator(`[data-testid="stop-agent-${agentId}"]`);
    await stopButton.click();
    
    // Wait for status to change to inactive
    await this.waitForText('inactive');
  }

  async getAgentPerformanceMetrics(agentId: string): Promise<{
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  }> {
    const metricsElement = this.page.locator(`[data-testid="agent-${agentId}-metrics"]`);
    
    const tasksCompleted = await metricsElement.locator('[data-metric="tasks-completed"]').textContent();
    const successRate = await metricsElement.locator('[data-metric="success-rate"]').textContent();
    const avgResponseTime = await metricsElement.locator('[data-metric="avg-response-time"]').textContent();
    
    return {
      tasksCompleted: parseInt(tasksCompleted || '0'),
      successRate: parseFloat(successRate || '0'),
      avgResponseTime: parseFloat(avgResponseTime || '0')
    };
  }

  async assignTaskToAgent(agentId: string, task: {
    type: string;
    priority: string;
    description: string;
    deadline?: string;
  }) {
    const agentCard = this.page.locator(`[data-testid="agent-card-${agentId}"]`);
    await agentCard.locator('[data-testid="assign-task-btn"]').click();
    
    // Fill task form
    await this.selectOption('[data-testid="task-type-select"]', task.type);
    await this.selectOption('[data-testid="task-priority-select"]', task.priority);
    await this.fillInput('[data-testid="task-description-textarea"]', task.description);
    
    if (task.deadline) {
      await this.fillInput('[data-testid="task-deadline-input"]', task.deadline);
    }
    
    await this.clickElement('[data-testid="assign-task-submit"]');
    
    // Wait for task assignment confirmation
    await this.waitForText('Task assigned successfully');
  }

  async refreshDashboard() {
    await this.refreshButton.click();
    await this.waitForPageLoad();
  }

  async waitForSystemHealthy() {
    await this.waitForElementVisible(this.statusIndicator.locator('.status-healthy'));
  }

  async getSystemAlerts(): Promise<string[]> {
    const alertElements = this.page.locator('[data-testid="system-alert"]');
    const alerts: string[] = [];
    
    const count = await alertElements.count();
    for (let i = 0; i < count; i++) {
      const alertText = await alertElements.nth(i).textContent();
      if (alertText) {
        alerts.push(alertText);
      }
    }
    
    return alerts;
  }

  async enableRealTimeMonitoring() {
    const realtimeToggle = this.page.locator('[data-testid="realtime-monitoring-toggle"]');
    await realtimeToggle.click();
    
    // Verify real-time updates are working
    await this.waitForElementVisible(this.page.locator('[data-testid="realtime-indicator"]'));
  }
}
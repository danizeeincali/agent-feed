/**
 * Agent Dashboard Page Object Model
 * Handles agent management, coordination, and feed overview interactions
 */

import { BasePage } from './base-page.js';

export class AgentDashboardPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Page selectors
    this.selectors = {
      // Navigation
      dashboardHeader: '[data-testid="dashboard-header"]',
      agentsList: '[data-testid="agents-list"]',
      addAgentButton: '[data-testid="add-agent-button"]',
      
      // Agent tiles
      agentTile: '[data-testid="agent-tile"]',
      agentName: '[data-testid="agent-name"]',
      agentStatus: '[data-testid="agent-status"]',
      agentMetrics: '[data-testid="agent-metrics"]',
      agentActions: '[data-testid="agent-actions"]',
      
      // Feed overview
      feedOverview: '[data-testid="feed-overview"]',
      totalPosts: '[data-testid="total-posts"]',
      activeAgents: '[data-testid="active-agents"]',
      engagementRate: '[data-testid="engagement-rate"]',
      
      // Quick actions
      quickActions: '[data-testid="quick-actions"]',
      createPostButton: '[data-testid="create-post-button"]',
      schedulePostButton: '[data-testid="schedule-post-button"]',
      analyticsButton: '[data-testid="analytics-button"]',
      
      // Coordination panel
      coordinationPanel: '[data-testid="coordination-panel"]',
      coordinationStatus: '[data-testid="coordination-status"]',
      strategicPosts: '[data-testid="strategic-posts"]',
      coordinationActions: '[data-testid="coordination-actions"]'
    };
  }

  /**
   * Navigate to dashboard
   */
  async navigate() {
    await this.navigateTo('/dashboard');
    await this.waitForElement(this.selectors.dashboardHeader);
  }

  /**
   * Get list of agents
   */
  async getAgentsList() {
    await this.waitForElement(this.selectors.agentsList);
    const agentTiles = await this.page.locator(this.selectors.agentTile).all();
    
    const agents = [];
    for (const tile of agentTiles) {
      const name = await tile.locator(this.selectors.agentName).textContent();
      const status = await tile.locator(this.selectors.agentStatus).textContent();
      const metricsText = await tile.locator(this.selectors.agentMetrics).textContent();
      
      agents.push({
        name: name?.trim(),
        status: status?.trim(),
        metrics: this.parseMetrics(metricsText)
      });
    }
    
    return agents;
  }

  /**
   * Add new agent
   * @param {Object} agentData - Agent configuration
   */
  async addAgent(agentData) {
    await this.click(this.selectors.addAgentButton);
    
    // Wait for agent creation modal/form
    await this.waitForElement('[data-testid="agent-creation-form"]');
    
    // Fill agent details
    await this.fill('[data-testid="agent-name-input"]', agentData.name);
    await this.selectOption('[data-testid="agent-type-select"]', agentData.type);
    
    if (agentData.specialization) {
      await this.selectOption('[data-testid="agent-specialization-select"]', agentData.specialization);
    }
    
    if (agentData.platforms) {
      for (const platform of agentData.platforms) {
        await this.click(`[data-testid="platform-${platform}"]`);
      }
    }
    
    // Save agent
    await this.click('[data-testid="save-agent-button"]');
    
    // Wait for success confirmation
    await this.waitForElement('[data-testid="agent-created-success"]');
    
    // Close modal if needed
    const closeButton = '[data-testid="close-modal-button"]';
    if (await this.isVisible(closeButton)) {
      await this.click(closeButton);
    }
  }

  /**
   * Get agent by name
   * @param {string} agentName - Name of the agent
   */
  async getAgentByName(agentName) {
    const agents = await this.getAgentsList();
    return agents.find(agent => agent.name === agentName);
  }

  /**
   * Get agent status
   * @param {string} agentName - Name of the agent
   */
  async getAgentStatus(agentName) {
    const agentTile = await this.page.locator(this.selectors.agentTile)
      .filter({ has: this.page.locator(this.selectors.agentName, { hasText: agentName }) });
    
    if (await agentTile.count() === 0) {
      throw new Error(`Agent "${agentName}" not found`);
    }
    
    return await agentTile.locator(this.selectors.agentStatus).textContent();
  }

  /**
   * Start agent
   * @param {string} agentName - Name of the agent
   */
  async startAgent(agentName) {
    await this.performAgentAction(agentName, 'start');
  }

  /**
   * Stop agent
   * @param {string} agentName - Name of the agent
   */
  async stopAgent(agentName) {
    await this.performAgentAction(agentName, 'stop');
  }

  /**
   * Configure agent
   * @param {string} agentName - Name of the agent
   * @param {Object} config - Agent configuration
   */
  async configureAgent(agentName, config) {
    await this.performAgentAction(agentName, 'configure');
    
    // Handle configuration form
    await this.waitForElement('[data-testid="agent-config-form"]');
    
    if (config.postingFrequency) {
      await this.fill('[data-testid="posting-frequency-input"]', config.postingFrequency.toString());
    }
    
    if (config.contentStyle) {
      await this.selectOption('[data-testid="content-style-select"]', config.contentStyle);
    }
    
    if (config.targetAudience) {
      await this.fill('[data-testid="target-audience-input"]', config.targetAudience);
    }
    
    // Save configuration
    await this.click('[data-testid="save-config-button"]');
    await this.waitForElement('[data-testid="config-saved-success"]');
  }

  /**
   * Get feed overview metrics
   */
  async getFeedOverview() {
    await this.waitForElement(this.selectors.feedOverview);
    
    return {
      totalPosts: await this.getTextContent(this.selectors.totalPosts),
      activeAgents: await this.getTextContent(this.selectors.activeAgents),
      engagementRate: await this.getTextContent(this.selectors.engagementRate)
    };
  }

  /**
   * Create new post via dashboard
   */
  async createPost() {
    await this.click(this.selectors.createPostButton);
    // This would typically navigate to post creation page
    // Return page object for chaining
    const { PostCreationPage } = await import('./post-creation-page.js');
    return new PostCreationPage(this.page);
  }

  /**
   * Schedule post via dashboard
   */
  async schedulePost() {
    await this.click(this.selectors.schedulePostButton);
    // Navigate to scheduling interface
    const { PostSchedulingPage } = await import('./post-scheduling-page.js');
    return new PostSchedulingPage(this.page);
  }

  /**
   * View analytics
   */
  async viewAnalytics() {
    await this.click(this.selectors.analyticsButton);
    const { AnalyticsPage } = await import('./analytics-page.js');
    return new AnalyticsPage(this.page);
  }

  /**
   * Get coordination status
   */
  async getCoordinationStatus() {
    await this.waitForElement(this.selectors.coordinationPanel);
    
    const statusElement = await this.page.locator(this.selectors.coordinationStatus);
    const status = await statusElement.textContent();
    
    const strategicPostsCount = await this.page.locator(this.selectors.strategicPosts).count();
    
    return {
      status: status?.trim(),
      strategicPosts: strategicPostsCount
    };
  }

  /**
   * Initiate coordination between agents
   * @param {Array<string>} agentNames - Names of agents to coordinate
   */
  async initiateCoordination(agentNames) {
    await this.click('[data-testid="initiate-coordination-button"]');
    
    // Select agents for coordination
    await this.waitForElement('[data-testid="agent-selection-modal"]');
    
    for (const agentName of agentNames) {
      await this.click(`[data-testid="select-agent-${agentName}"]`);
    }
    
    await this.click('[data-testid="start-coordination-button"]');
    
    // Wait for coordination to begin
    await this.waitForElement('[data-testid="coordination-active"]');
  }

  /**
   * Wait for agents to be loaded
   */
  async waitForAgentsLoad() {
    await this.waitForElement(this.selectors.agentsList);
    // Wait for at least one agent or empty state
    await this.page.waitForFunction(() => {
      const agentsList = document.querySelector('[data-testid="agents-list"]');
      const agents = agentsList?.querySelectorAll('[data-testid="agent-tile"]');
      const emptyState = document.querySelector('[data-testid="no-agents-message"]');
      return (agents && agents.length > 0) || emptyState;
    });
  }

  /**
   * Perform action on specific agent
   * @param {string} agentName - Name of the agent
   * @param {string} action - Action to perform
   */
  async performAgentAction(agentName, action) {
    const agentTile = await this.page.locator(this.selectors.agentTile)
      .filter({ has: this.page.locator(this.selectors.agentName, { hasText: agentName }) });
    
    if (await agentTile.count() === 0) {
      throw new Error(`Agent "${agentName}" not found`);
    }
    
    // Click on agent actions dropdown/menu
    await agentTile.locator(this.selectors.agentActions).click();
    
    // Click specific action
    await this.click(`[data-testid="agent-action-${action}"]`);
  }

  /**
   * Parse metrics text into structured data
   * @param {string} metricsText - Raw metrics text
   */
  parseMetrics(metricsText) {
    const metrics = {};
    if (!metricsText) return metrics;
    
    // Parse different metric formats
    const patterns = {
      posts: /(\d+)\s*posts?/i,
      engagement: /([\d.]+)%\s*engagement/i,
      followers: /([\d,]+)\s*followers?/i
    };
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = metricsText.match(pattern);
      if (match) {
        metrics[key] = key === 'engagement' ? parseFloat(match[1]) : 
                      key === 'followers' ? parseInt(match[1].replace(/,/g, '')) :
                      parseInt(match[1]);
      }
    }
    
    return metrics;
  }
}
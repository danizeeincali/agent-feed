import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Agent Home Page
 * Handles interactions with individual agent home pages
 */
export class AgentHomePage {
  readonly page: Page;
  readonly agentAvatar: Locator;
  readonly agentName: Locator;
  readonly agentDescription: Locator;
  readonly agentStatus: Locator;
  readonly backButton: Locator;
  readonly editButton: Locator;
  readonly shareButton: Locator;
  readonly refreshButton: Locator;
  readonly tabsList: Locator;
  readonly welcomeMessage: Locator;
  readonly quickActionsSection: Locator;
  readonly widgetsSection: Locator;
  readonly postsSection: Locator;
  readonly metricsSection: Locator;
  readonly settingsSection: Locator;

  constructor(page: Page) {
    this.page = page;
    this.agentAvatar = page.locator('.agent-avatar, [data-testid="agent-avatar"]');
    this.agentName = page.locator('h1, h2').first();
    this.agentDescription = page.locator('.agent-description, .specialization').first();
    this.agentStatus = page.locator('.status-indicator, [class*="status"]').first();
    this.backButton = page.locator('button:has([class*="ArrowLeft"]), [aria-label*="back"]');
    this.editButton = page.locator('button:has-text("Edit"), [data-testid="edit-button"]');
    this.shareButton = page.locator('button:has-text("Share")');
    this.refreshButton = page.locator('button:has-text("Refresh")');
    this.tabsList = page.locator('[role="tablist"], .tabs-list');
    this.welcomeMessage = page.locator('.welcome-message, [data-testid="welcome-message"]');
    this.quickActionsSection = page.locator('[data-testid="quick-actions"], .quick-actions');
    this.widgetsSection = page.locator('[data-testid="widgets"], .widgets, .dashboard');
    this.postsSection = page.locator('[data-testid="posts"], .posts, .recent-updates');
    this.metricsSection = page.locator('[data-testid="metrics"], .metrics, .performance-metrics');
    this.settingsSection = page.locator('[data-testid="settings"], .settings');
  }

  async goto(agentId: string): Promise<void> {
    await this.page.goto(`/agents/${agentId}/home`);
    await this.waitForLoad();
  }

  async waitForLoad(): Promise<void> {
    // Wait for main content to be visible
    await this.agentName.waitFor({ state: 'visible', timeout: 15000 });
    
    // Wait for status indicator
    await this.agentStatus.waitFor({ state: 'visible', timeout: 10000 });
    
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');
  }

  // Header interactions
  async getAgentName(): Promise<string> {
    return await this.agentName.textContent() || '';
  }

  async getAgentDescription(): Promise<string> {
    return await this.agentDescription.textContent() || '';
  }

  async getAgentStatus(): Promise<string> {
    const statusText = await this.agentStatus.textContent();
    return statusText?.toLowerCase().trim() || 'unknown';
  }

  async clickBackButton(): Promise<void> {
    await expect(this.backButton).toBeVisible();
    await this.backButton.click();
  }

  async clickEditButton(): Promise<void> {
    await expect(this.editButton).toBeVisible();
    await this.editButton.click();
  }

  async clickShareButton(): Promise<void> {
    await expect(this.shareButton).toBeVisible();
    await this.shareButton.click();
  }

  async clickRefreshButton(): Promise<void> {
    await expect(this.refreshButton).toBeVisible();
    await this.refreshButton.click();
  }

  async isEditModeEnabled(): Promise<boolean> {
    const editModeIndicators = [
      this.page.locator('button:has-text("Done")'),
      this.page.locator('[data-edit-mode="true"]'),
      this.page.locator('.edit-mode')
    ];
    
    for (const indicator of editModeIndicators) {
      if (await indicator.isVisible()) {
        return true;
      }
    }
    return false;
  }

  // Tab navigation
  async clickTab(tabName: string): Promise<void> {
    const tab = this.page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
    await expect(tab).toBeVisible();
    await tab.click();
    await this.page.waitForTimeout(300); // Allow tab content to load
  }

  async getActiveTab(): Promise<string> {
    const activeTab = this.page.locator('[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]');
    return await activeTab.textContent() || '';
  }

  async getAvailableTabs(): Promise<string[]> {
    const tabs = this.page.locator('[role="tab"], .tab-trigger');
    const count = await tabs.count();
    const tabNames: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const tabName = await tabs.nth(i).textContent();
      if (tabName) {
        tabNames.push(tabName.trim());
      }
    }
    
    return tabNames;
  }

  // Home tab content
  async getWelcomeMessage(): Promise<string> {
    if (await this.welcomeMessage.isVisible()) {
      return await this.welcomeMessage.textContent() || '';
    }
    return '';
  }

  async getQuickActions(): Promise<string[]> {
    const actions = this.page.locator('.quick-action, [data-testid*="quick-action"] button');
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

  async clickQuickAction(actionLabel: string): Promise<void> {
    const action = this.page.locator(`button:has-text("${actionLabel}")`);
    await expect(action).toBeVisible();
    await action.click();
  }

  async getVisibleWidgets(): Promise<string[]> {
    const widgets = this.page.locator('.widget, [data-testid*="widget"]');
    const count = await widgets.count();
    const widgetTitles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const widget = widgets.nth(i);
      const title = await widget.locator('h3, .widget-title, .title').first().textContent();
      if (title) {
        widgetTitles.push(title.trim());
      }
    }
    
    return widgetTitles;
  }

  async getWidgetValue(widgetTitle: string): Promise<string> {
    const widget = this.page.locator(`.widget:has-text("${widgetTitle}"), [data-widget-title="${widgetTitle}"]`);
    const value = await widget.locator('.value, .metric-value, .widget-value').first().textContent();
    return value?.trim() || '';
  }

  // Posts tab content
  async getPostCount(): Promise<number> {
    await this.clickTab('Posts');
    const posts = this.page.locator('.post, [data-testid*="post"], article');
    return await posts.count();
  }

  async getPostTitles(): Promise<string[]> {
    const posts = this.page.locator('.post, [data-testid*="post"], article');
    const count = await posts.count();
    const titles: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const post = posts.nth(i);
      const title = await post.locator('h3, h4, .post-title, .title').first().textContent();
      if (title) {
        titles.push(title.trim());
      }
    }
    
    return titles;
  }

  async clickPostInteraction(postIndex: number, interactionType: 'like' | 'comment' | 'share' | 'bookmark'): Promise<void> {
    const post = this.page.locator('.post, article').nth(postIndex);
    const interactionButton = post.locator(`button:has([data-testid*="${interactionType}"])`);
    await expect(interactionButton).toBeVisible();
    await interactionButton.click();
  }

  async getPostInteractionCount(postIndex: number, interactionType: string): Promise<number> {
    const post = this.page.locator('.post, article').nth(postIndex);
    const interactionElement = post.locator(`[data-testid*="${interactionType}"], button:has-text("${interactionType}")`);
    const countText = await interactionElement.textContent();
    const match = countText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Metrics tab content
  async getMetricsData(): Promise<Record<string, string | number>> {
    await this.clickTab('Metrics');
    const metrics: Record<string, string | number> = {};
    
    const metricElements = this.page.locator('.metric, [data-testid*="metric"], .stat');
    const count = await metricElements.count();
    
    for (let i = 0; i < count; i++) {
      const element = metricElements.nth(i);
      const label = await element.locator('.metric-label, .stat-label, .label').first().textContent();
      const value = await element.locator('.metric-value, .stat-value, .value').first().textContent();
      
      if (label && value) {
        const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
        metrics[label.trim()] = isNaN(numericValue) ? value.trim() : numericValue;
      }
    }
    
    return metrics;
  }

  async getCapabilities(): Promise<string[]> {
    await this.clickTab('Metrics');
    const capabilities = this.page.locator('.capability, [data-testid*="capability"]');
    const count = await capabilities.count();
    const capabilityList: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const capability = await capabilities.nth(i).textContent();
      if (capability) {
        capabilityList.push(capability.trim());
      }
    }
    
    return capabilityList;
  }

  // Settings tab content (if editable)
  async updateAgentName(newName: string): Promise<void> {
    await this.clickTab('Settings');
    const nameInput = this.page.locator('input[name="name"], input[placeholder*="name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.clear();
    await nameInput.fill(newName);
  }

  async updateAgentSpecialization(newSpecialization: string): Promise<void> {
    await this.clickTab('Settings');
    const specInput = this.page.locator('input[name="specialization"], input[placeholder*="specialization"]');
    await expect(specInput).toBeVisible();
    await specInput.clear();
    await specInput.fill(newSpecialization);
  }

  async updateWelcomeMessage(newMessage: string): Promise<void> {
    await this.clickTab('Settings');
    const messageTextarea = this.page.locator('textarea[name="welcomeMessage"], textarea[placeholder*="welcome"]');
    await expect(messageTextarea).toBeVisible();
    await messageTextarea.clear();
    await messageTextarea.fill(newMessage);
  }

  async toggleVisibilitySetting(setting: string, enabled: boolean): Promise<void> {
    await this.clickTab('Settings');
    const checkbox = this.page.locator(`input[type="checkbox"]:near(:text("${setting}"))`);
    await expect(checkbox).toBeVisible();
    
    const isChecked = await checkbox.isChecked();
    if (isChecked !== enabled) {
      await checkbox.click();
    }
  }

  async saveSettings(): Promise<void> {
    const saveButton = this.page.locator('button:has-text("Save"), button:has-text("Done")');
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await this.page.waitForTimeout(1000); // Allow save to complete
    }
  }

  // Real-time updates validation
  async waitForStatusUpdate(expectedStatus: string, timeout: number = 10000): Promise<void> {
    await expect(this.agentStatus).toContainText(expectedStatus, { timeout });
  }

  async waitForMetricUpdate(metricName: string, expectedValue: string | number, timeout: number = 10000): Promise<void> {
    const metricElement = this.page.locator(`.metric:has-text("${metricName}") .value, [data-metric="${metricName}"] .value`);
    await expect(metricElement).toContainText(String(expectedValue), { timeout });
  }

  async waitForNewPost(timeout: number = 15000): Promise<void> {
    await this.clickTab('Posts');
    const initialPostCount = await this.getPostCount();
    
    await expect(async () => {
      const currentPostCount = await this.getPostCount();
      expect(currentPostCount).toBeGreaterThan(initialPostCount);
    }).toPass({ timeout });
  }

  // Responsive design validation
  async validateMobileLayout(): Promise<void> {
    const viewport = this.page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(768);
    
    // Check for mobile-specific elements or layout changes
    const mobileMenu = this.page.locator('.mobile-menu, [data-mobile="true"]');
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  }

  async validateTabletLayout(): Promise<void> {
    const viewport = this.page.viewportSize();
    expect(viewport?.width).toBeGreaterThan(768);
    expect(viewport?.width).toBeLessThanOrEqual(1024);
    
    // Validate tablet-specific layout adjustments
    const tabletLayout = this.page.locator('[data-tablet="true"], .tablet-layout');
    if (await tabletLayout.isVisible()) {
      await expect(tabletLayout).toBeVisible();
    }
  }

  async validateDesktopLayout(): Promise<void> {
    const viewport = this.page.viewportSize();
    expect(viewport?.width).toBeGreaterThan(1024);
    
    // All desktop elements should be visible
    await expect(this.quickActionsSection).toBeVisible();
    await expect(this.widgetsSection).toBeVisible();
  }

  // Performance validation
  async measurePageLoad(): Promise<number> {
    const startTime = Date.now();
    await this.waitForLoad();
    return Date.now() - startTime;
  }

  async measureTabSwitch(): Promise<number> {
    const startTime = Date.now();
    await this.clickTab('Posts');
    await this.page.waitForTimeout(100); // Minimum time for tab switch
    return Date.now() - startTime;
  }

  // Accessibility validation
  async validateKeyboardNavigation(): Promise<void> {
    // Test Tab navigation through interactive elements
    await this.page.keyboard.press('Tab');
    await this.page.waitForTimeout(100);
    
    const focusedElement = this.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  }

  async validateAriaLabels(): Promise<string[]> {
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

  // Visual regression helpers
  async takeFullPageScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({ 
      fullPage: true,
      path: `./screenshots/${name}-${Date.now()}.png`
    });
  }

  async compareWithBaseline(baselineName: string): Promise<void> {
    await expect(this.page).toHaveScreenshot(`${baselineName}.png`, {
      threshold: 0.2,
      mode: 'diff-pixels'
    });
  }
}
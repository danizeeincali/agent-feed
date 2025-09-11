import { test, expect } from '@playwright/test';
import { AgentHomePage } from '../../page-objects';
import { testAgents, mockAgentHomePageData } from '../../fixtures/test-data';

/**
 * Dynamic Content Rendering Tests for Agent Home Pages
 * Tests content rendering, updates, and dynamic behavior
 */
test.describe('Dynamic Content Rendering', () => {
  let agentHomePage: AgentHomePage;

  test.beforeEach(async ({ page }) => {
    agentHomePage = new AgentHomePage(page);
    await agentHomePage.goto(testAgents[0].id);
  });

  test('should render agent profile information correctly', async () => {
    // Verify agent name is displayed
    const agentName = await agentHomePage.getAgentName();
    expect(agentName).toBeTruthy();
    expect(agentName.length).toBeGreaterThan(0);
    
    // Verify agent description/specialization
    const description = await agentHomePage.getAgentDescription();
    expect(description).toBeTruthy();
    
    // Verify agent status is displayed with appropriate styling
    const status = await agentHomePage.getAgentStatus();
    expect(['active', 'inactive', 'busy', 'error']).toContain(status);
  });

  test('should render welcome message and quick actions', async () => {
    await agentHomePage.clickTab('Home');
    
    // Check welcome message
    const welcomeMessage = await agentHomePage.getWelcomeMessage();
    expect(welcomeMessage).toBeTruthy();
    expect(welcomeMessage.length).toBeGreaterThan(20); // Should be descriptive
    
    // Check quick actions
    const quickActions = await agentHomePage.getQuickActions();
    expect(quickActions.length).toBeGreaterThan(0);
    
    // Verify quick actions are interactive
    for (const action of quickActions.slice(0, 2)) { // Test first 2 actions
      const actionButton = agentHomePage.page.locator(`button:has-text("${action}")`);
      await expect(actionButton).toBeVisible();
      await expect(actionButton).toBeEnabled();
    }
  });

  test('should render dashboard widgets with data', async () => {
    await agentHomePage.clickTab('Home');
    
    // Get visible widgets
    const widgets = await agentHomePage.getVisibleWidgets();
    expect(widgets.length).toBeGreaterThan(0);
    
    // Verify each widget has content
    for (const widget of widgets) {
      const widgetValue = await agentHomePage.getWidgetValue(widget);
      expect(widgetValue).toBeTruthy();
      
      // Widget values should contain meaningful data (numbers, percentages, etc.)
      expect(widgetValue).toMatch(/\d+|%|\w+/);
    }
  });

  test('should render posts with complete information', async () => {
    await agentHomePage.clickTab('Posts');
    
    const postCount = await agentHomePage.getPostCount();
    expect(postCount).toBeGreaterThanOrEqual(0);
    
    if (postCount > 0) {
      // Verify post titles
      const postTitles = await agentHomePage.getPostTitles();
      expect(postTitles.length).toBeGreaterThan(0);
      
      for (const title of postTitles) {
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(5);
      }
      
      // Check post interactions
      const firstPostInteractions = await agentHomePage.getPostInteractionCount(0, 'like');
      expect(firstPostInteractions).toBeGreaterThanOrEqual(0);
    }
  });

  test('should render metrics with accurate data', async () => {
    await agentHomePage.clickTab('Metrics');
    
    // Get metrics data
    const metricsData = await agentHomePage.getMetricsData();
    expect(Object.keys(metricsData).length).toBeGreaterThan(0);
    
    // Verify common metrics are present
    const expectedMetrics = ['Tasks', 'Success', 'Response', 'Uptime'];
    const metricKeys = Object.keys(metricsData).join(' ');
    
    let foundMetrics = 0;
    for (const expectedMetric of expectedMetrics) {
      if (metricKeys.toLowerCase().includes(expectedMetric.toLowerCase())) {
        foundMetrics++;
      }
    }
    
    expect(foundMetrics).toBeGreaterThan(0);
    
    // Verify metrics have reasonable values
    for (const [key, value] of Object.entries(metricsData)) {
      if (typeof value === 'number') {
        expect(value).toBeGreaterThanOrEqual(0);
      } else {
        expect(value.toString().length).toBeGreaterThan(0);
      }
    }
  });

  test('should render capabilities list', async () => {
    await agentHomePage.clickTab('Metrics');
    
    const capabilities = await agentHomePage.getCapabilities();
    expect(capabilities.length).toBeGreaterThan(0);
    
    // Each capability should be meaningful
    for (const capability of capabilities) {
      expect(capability).toBeTruthy();
      expect(capability.length).toBeGreaterThan(3);
    }
  });

  test('should handle empty or missing content gracefully', async ({ page }) => {
    // Navigate to potentially non-existent agent
    await agentHomePage.goto('non-existent-agent');
    
    // Page should either show error message or fallback content
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    
    // Should not show blank page
    expect(pageContent?.length).toBeGreaterThan(100);
  });

  test('should render content responsively on different screen sizes', async () => {
    // Test desktop layout
    await agentHomePage.page.setViewportSize({ width: 1280, height: 720 });
    await agentHomePage.page.waitForTimeout(300);
    
    await agentHomePage.validateDesktopLayout();
    
    // Test tablet layout
    await agentHomePage.page.setViewportSize({ width: 768, height: 1024 });
    await agentHomePage.page.waitForTimeout(300);
    
    await agentHomePage.validateTabletLayout();
    
    // Test mobile layout
    await agentHomePage.page.setViewportSize({ width: 375, height: 667 });
    await agentHomePage.page.waitForTimeout(300);
    
    await agentHomePage.validateMobileLayout();
  });

  test('should update content dynamically', async ({ page }) => {
    await agentHomePage.clickTab('Home');
    
    // Get initial widget values
    const widgets = await agentHomePage.getVisibleWidgets();
    const initialValues: Record<string, string> = {};
    
    for (const widget of widgets.slice(0, 2)) {
      initialValues[widget] = await agentHomePage.getWidgetValue(widget);
    }
    
    // Simulate a page refresh or data update
    await page.reload();
    await agentHomePage.waitForLoad();
    await agentHomePage.clickTab('Home');
    
    // Values should be consistent or updated appropriately
    for (const widget of Object.keys(initialValues)) {
      const newValue = await agentHomePage.getWidgetValue(widget);
      expect(newValue).toBeTruthy();
      // Value should either be the same or a valid update
      expect(newValue).toMatch(/\d+|%|\w+/);
    }
  });

  test('should handle content loading errors gracefully', async ({ page }) => {
    // Simulate network issues by intercepting requests
    await page.route('**/api/agents/**', route => {
      route.abort();
    });
    
    // Try to navigate to agent page
    await agentHomePage.goto(testAgents[0].id);
    
    // Should show error state or fallback content, not blank page
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    
    // Should contain some indication of the issue
    const hasErrorIndicator = content?.toLowerCase().includes('error') || 
                             content?.toLowerCase().includes('loading') ||
                             content?.toLowerCase().includes('not found');
    expect(hasErrorIndicator).toBe(true);
  });

  test('should render interactive elements correctly', async () => {
    await agentHomePage.clickTab('Home');
    
    // Test quick action interactions
    const quickActions = await agentHomePage.getQuickActions();
    
    if (quickActions.length > 0) {
      const firstAction = quickActions[0];
      
      // Click the first quick action
      await agentHomePage.clickQuickAction(firstAction);
      
      // Should either navigate somewhere or show some feedback
      await agentHomePage.page.waitForTimeout(500);
      
      // Page should still be functional after interaction
      const pageContent = await agentHomePage.page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('should maintain content hierarchy and accessibility', async () => {
    // Check for proper heading hierarchy
    const headings = await agentHomePage.page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
    
    // Should have a main h1 or h2
    const mainHeading = headings[0];
    expect(mainHeading).toBeTruthy();
    expect(mainHeading.length).toBeGreaterThan(0);
    
    // Check for aria labels on interactive elements
    const ariaLabels = await agentHomePage.validateAriaLabels();
    expect(ariaLabels.length).toBeGreaterThan(0);
  });

  test('should handle very long content appropriately', async () => {
    // Navigate to agent with potentially long descriptions or content
    const agent = testAgents.find(a => a.description.length > 100) || testAgents[0];
    await agentHomePage.goto(agent.id);
    
    // Long content should be handled with proper layout
    const description = await agentHomePage.getAgentDescription();
    expect(description).toBeTruthy();
    
    // Check that long content doesn't break layout
    await agentHomePage.clickTab('Posts');
    const postTitles = await agentHomePage.getPostTitles();
    
    if (postTitles.length > 0) {
      // Titles should be visible and not overflowing
      for (const title of postTitles.slice(0, 3)) {
        const titleElement = agentHomePage.page.locator(`text=${title}`);
        await expect(titleElement).toBeVisible();
      }
    }
  });
});
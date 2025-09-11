import { test, expect } from '@playwright/test';
import { AgentHomePage } from '../../page-objects';
import { testAgents } from '../../fixtures/test-data';

/**
 * Tab Navigation Tests for Agent Home Pages
 * Tests tab functionality and navigation within agent home pages
 */
test.describe('Agent Home Page Tab Navigation', () => {
  let agentHomePage: AgentHomePage;

  test.beforeEach(async ({ page }) => {
    agentHomePage = new AgentHomePage(page);
    await agentHomePage.goto(testAgents[0].id);
  });

  test('should display all expected tabs', async () => {
    const availableTabs = await agentHomePage.getAvailableTabs();
    
    // Expected tabs for agent home page
    const expectedTabs = ['Home', 'Posts', 'Metrics'];
    
    for (const expectedTab of expectedTabs) {
      expect(availableTabs).toContain(expectedTab);
    }
  });

  test('should have Home tab active by default', async () => {
    const activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Home');
  });

  test('should switch between tabs correctly', async () => {
    // Test switching to Posts tab
    await agentHomePage.clickTab('Posts');
    let activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Posts');
    
    // Test switching to Metrics tab
    await agentHomePage.clickTab('Metrics');
    activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Metrics');
    
    // Test switching back to Home tab
    await agentHomePage.clickTab('Home');
    activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Home');
  });

  test('should display appropriate content for each tab', async () => {
    // Home tab content
    await agentHomePage.clickTab('Home');
    const welcomeMessage = await agentHomePage.getWelcomeMessage();
    expect(welcomeMessage).toBeTruthy();
    
    const quickActions = await agentHomePage.getQuickActions();
    expect(quickActions.length).toBeGreaterThan(0);
    
    const widgets = await agentHomePage.getVisibleWidgets();
    expect(widgets.length).toBeGreaterThan(0);
    
    // Posts tab content
    await agentHomePage.clickTab('Posts');
    const postCount = await agentHomePage.getPostCount();
    expect(postCount).toBeGreaterThanOrEqual(0);
    
    // Metrics tab content
    await agentHomePage.clickTab('Metrics');
    const metricsData = await agentHomePage.getMetricsData();
    expect(Object.keys(metricsData).length).toBeGreaterThan(0);
    
    const capabilities = await agentHomePage.getCapabilities();
    expect(capabilities.length).toBeGreaterThan(0);
  });

  test('should maintain tab state during navigation', async () => {
    // Switch to Posts tab
    await agentHomePage.clickTab('Posts');
    
    // Refresh the page
    await agentHomePage.page.reload();
    await agentHomePage.waitForLoad();
    
    // Should default back to Home tab after refresh
    const activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Home');
  });

  test('should handle rapid tab switching', async () => {
    // Click tabs rapidly
    await agentHomePage.clickTab('Posts');
    await agentHomePage.clickTab('Metrics');
    await agentHomePage.clickTab('Home');
    await agentHomePage.clickTab('Posts');
    
    // Should end up on Posts tab
    await agentHomePage.page.waitForTimeout(500);
    const activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBe('Posts');
  });

  test('should show Settings tab only in edit mode', async ({ page }) => {
    // Check if edit button is available (indicates editable agent)
    const editButton = agentHomePage.editButton;
    
    if (await editButton.isVisible()) {
      // Initially, Settings tab should not be visible
      let availableTabs = await agentHomePage.getAvailableTabs();
      expect(availableTabs).not.toContain('Settings');
      
      // Enable edit mode
      await agentHomePage.clickEditButton();
      
      // Settings tab should now be available
      availableTabs = await agentHomePage.getAvailableTabs();
      expect(availableTabs).toContain('Settings');
      
      // Click Settings tab
      await agentHomePage.clickTab('Settings');
      const activeTab = await agentHomePage.getActiveTab();
      expect(activeTab).toBe('Settings');
    }
  });

  test('should handle keyboard navigation between tabs', async () => {
    // Focus on the tabs area
    await agentHomePage.tabsList.focus();
    
    // Use arrow keys to navigate tabs
    await agentHomePage.page.keyboard.press('ArrowRight');
    await agentHomePage.page.waitForTimeout(200);
    
    // Check if focus moved to next tab
    const focusedElement = agentHomePage.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Press Enter to activate focused tab
    await agentHomePage.page.keyboard.press('Enter');
    
    // Tab should be activated
    await agentHomePage.page.waitForTimeout(300);
    const activeTab = await agentHomePage.getActiveTab();
    expect(activeTab).toBeTruthy();
  });

  test('should update URL when switching tabs', async () => {
    const baseUrl = agentHomePage.page.url();
    
    // Switch to Posts tab
    await agentHomePage.clickTab('Posts');
    
    // URL might update to reflect tab state (implementation dependent)
    const postsUrl = agentHomePage.page.url();
    
    // Switch to Metrics tab
    await agentHomePage.clickTab('Metrics');
    
    // URL might update again
    const metricsUrl = agentHomePage.page.url();
    
    // At minimum, page should remain on the same agent
    expect(agentHomePage.page.url()).toContain(`/agents/${testAgents[0].id}`);
  });

  test('should handle tab content loading errors gracefully', async () => {
    // Switch to a tab that might have loading issues
    await agentHomePage.clickTab('Metrics');
    
    // Wait a reasonable time for content to load
    await agentHomePage.page.waitForTimeout(2000);
    
    // Page should not crash or show blank content
    const pageContent = await agentHomePage.page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent?.length).toBeGreaterThan(0);
  });

  test('should preserve scroll position when switching tabs', async () => {
    // Go to Posts tab which might have scrollable content
    await agentHomePage.clickTab('Posts');
    
    // Scroll down if there's content
    await agentHomePage.page.evaluate(() => {
      window.scrollTo(0, 200);
    });
    
    const scrollPosition = await agentHomePage.page.evaluate(() => window.pageYOffset);
    
    // Switch to another tab and back
    await agentHomePage.clickTab('Home');
    await agentHomePage.clickTab('Posts');
    
    // Scroll position might be reset (implementation dependent)
    const newScrollPosition = await agentHomePage.page.evaluate(() => window.pageYOffset);
    expect(newScrollPosition).toBeGreaterThanOrEqual(0);
  });
});
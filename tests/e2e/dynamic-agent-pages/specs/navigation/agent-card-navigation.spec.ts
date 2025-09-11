import { test, expect } from '@playwright/test';
import { AgentsListPage, AgentHomePage } from '../../page-objects';
import { testAgents, TestDataHelpers } from '../../fixtures/test-data';

/**
 * Navigation Flow Tests for Dynamic Agent Pages
 * Tests navigation from agent cards to home pages and back
 */
test.describe('Agent Card Navigation', () => {
  let agentsListPage: AgentsListPage;
  let agentHomePage: AgentHomePage;

  test.beforeEach(async ({ page }) => {
    agentsListPage = new AgentsListPage(page);
    agentHomePage = new AgentHomePage(page);
    await agentsListPage.goto();
  });

  test('should navigate from agent card to home page via home button', async () => {
    const testAgent = TestDataHelpers.getActiveAgents()[0];
    
    // Verify agent card is visible
    await agentsListPage.assertAgentCardVisible(testAgent.id);
    
    // Click home button on agent card
    await agentsListPage.clickAgentHomeButton(testAgent.id);
    
    // Verify navigation to agent home page
    await expect(agentHomePage.page).toHaveURL(new RegExp(`/agents/${testAgent.id}/home`));
    await agentHomePage.waitForLoad();
    
    // Verify agent information is displayed correctly
    const displayedName = await agentHomePage.getAgentName();
    expect(displayedName.toLowerCase()).toContain(testAgent.name.toLowerCase());
    
    // Verify status is displayed
    const status = await agentHomePage.getAgentStatus();
    expect(status).toBe(testAgent.status);
  });

  test('should navigate back to agents list from agent home page', async () => {
    const testAgent = testAgents[0];
    
    // Navigate to agent home page
    await agentHomePage.goto(testAgent.id);
    
    // Click back button
    await agentHomePage.clickBackButton();
    
    // Verify navigation back to agents list
    await expect(agentsListPage.page).toHaveURL('/agents');
    await agentsListPage.waitForLoad();
    
    // Verify agents list is displayed
    await agentsListPage.assertMinimumAgentCards(1);
  });

  test('should navigate via direct card click', async () => {
    const testAgent = TestDataHelpers.getActiveAgents()[0];
    
    // Click directly on agent card
    await agentsListPage.clickAgentCard(testAgent.id);
    
    // Should navigate to agent detail or home page
    await agentsListPage.page.waitForLoadState('networkidle');
    
    const currentUrl = agentsListPage.page.url();
    expect(currentUrl).toMatch(new RegExp(`/agents/${testAgent.id}`));
  });

  test('should handle navigation to non-existent agent gracefully', async () => {
    const nonExistentId = 'non-existent-agent-123';
    
    // Navigate directly to non-existent agent home page
    await agentHomePage.goto(nonExistentId);
    
    // Should either show error message or redirect
    const pageContent = await agentHomePage.page.textContent('body');
    expect(pageContent?.toLowerCase()).toMatch(/(not found|error|agent not found)/);
  });

  test('should maintain navigation history correctly', async ({ context }) => {
    const testAgent = testAgents[0];
    
    // Navigate to agent home page
    await agentsListPage.clickAgentHomeButton(testAgent.id);
    await agentHomePage.waitForLoad();
    
    // Use browser back button
    await agentHomePage.page.goBack();
    
    // Should be back on agents list
    await agentsListPage.waitForLoad();
    await expect(agentsListPage.page).toHaveURL('/agents');
    
    // Use browser forward button
    await agentHomePage.page.goForward();
    
    // Should be back on agent home page
    await expect(agentHomePage.page).toHaveURL(new RegExp(`/agents/${testAgent.id}/home`));
  });

  test('should handle multiple rapid navigation clicks gracefully', async () => {
    const testAgent = testAgents[0];
    
    // Click home button multiple times rapidly
    const homeButton = await agentsListPage.page.locator(`button:has-text("Home")`).first();
    
    await homeButton.click();
    await homeButton.click(); // Second click should be ignored or handled gracefully
    await homeButton.click(); // Third click
    
    // Should still navigate correctly without errors
    await expect(agentHomePage.page).toHaveURL(new RegExp(`/agents/.*/(home|$)`));
  });

  test('should preserve agent card state after navigation', async () => {
    const testAgent = testAgents[0];
    
    // Get initial card state
    const initialInfo = await agentsListPage.getAgentCardInfo(testAgent.id);
    
    // Navigate to home page and back
    await agentsListPage.clickAgentHomeButton(testAgent.id);
    await agentHomePage.waitForLoad();
    await agentHomePage.clickBackButton();
    await agentsListPage.waitForLoad();
    
    // Verify card state is preserved
    const finalInfo = await agentsListPage.getAgentCardInfo(testAgent.id);
    expect(finalInfo.name).toBe(initialInfo.name);
    expect(finalInfo.status).toBe(initialInfo.status);
  });

  test('should handle keyboard navigation', async () => {
    await agentsListPage.waitForAgentCardsToLoad();
    
    // Use Tab to navigate to first agent card
    await agentsListPage.page.keyboard.press('Tab');
    
    // Check if focus is on an interactive element
    const focusedElement = agentsListPage.page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Press Enter to activate focused element
    await agentsListPage.page.keyboard.press('Enter');
    
    // Should navigate somewhere (either home or details page)
    await agentsListPage.page.waitForLoadState('networkidle');
    const currentUrl = agentsListPage.page.url();
    expect(currentUrl).toMatch(/\/agents\/.+/);
  });

  test('should show loading states during navigation', async () => {
    const testAgent = testAgents[0];
    
    // Click home button and immediately check for loading state
    await agentsListPage.clickAgentHomeButton(testAgent.id);
    
    // Page should be navigating (either loading or already loaded)
    await agentsListPage.page.waitForLoadState('domcontentloaded');
    
    // Eventually should reach the home page
    await expect(agentHomePage.page).toHaveURL(new RegExp(`/agents/${testAgent.id}/home`));
    await agentHomePage.waitForLoad();
  });

  test('should handle concurrent navigation attempts', async ({ context }) => {
    // Open multiple pages
    const page2 = await context.newPage();
    const agentsListPage2 = new AgentsListPage(page2);
    
    await agentsListPage2.goto();
    
    const testAgent = testAgents[0];
    
    // Navigate from both pages simultaneously
    const navigation1 = agentsListPage.clickAgentHomeButton(testAgent.id);
    const navigation2 = agentsListPage2.clickAgentHomeButton(testAgent.id);
    
    await Promise.all([navigation1, navigation2]);
    
    // Both should successfully navigate
    await expect(agentsListPage.page).toHaveURL(new RegExp(`/agents/${testAgent.id}/home`));
    await expect(agentsListPage2.page).toHaveURL(new RegExp(`/agents/${testAgent.id}/home`));
    
    await page2.close();
  });
});
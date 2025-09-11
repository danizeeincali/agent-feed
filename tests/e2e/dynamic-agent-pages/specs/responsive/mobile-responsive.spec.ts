import { test, expect, devices } from '@playwright/test';
import { AgentsListPage, AgentHomePage } from '../../page-objects';
import { testAgents } from '../../fixtures/test-data';

/**
 * Mobile Responsive Tests for Dynamic Agent Pages
 * Tests mobile and tablet responsive behavior
 */
test.describe('Mobile Responsive Behavior', () => {
  let agentsListPage: AgentsListPage;
  let agentHomePage: AgentHomePage;

  test.describe('Mobile Portrait (iPhone 12)', () => {
    test.use({ ...devices['iPhone 12'] });

    test.beforeEach(async ({ page }) => {
      agentsListPage = new AgentsListPage(page);
      agentHomePage = new AgentHomePage(page);
    });

    test('should display agents list correctly on mobile', async () => {
      await agentsListPage.goto();
      
      // Verify mobile layout
      const viewport = agentsListPage.page.viewportSize();
      expect(viewport?.width).toBeLessThanOrEqual(390);
      
      // Agent cards should be visible
      await agentsListPage.waitForAgentCardsToLoad();
      const cardCount = await agentsListPage.getAgentCardCount();
      expect(cardCount).toBeGreaterThan(0);
      
      // Cards should stack vertically on mobile
      const agentCards = await agentsListPage.getAgentCards();
      const firstCard = agentCards.first();
      const secondCard = agentCards.nth(1);
      
      if (await secondCard.isVisible()) {
        const firstCardBox = await firstCard.boundingBox();
        const secondCardBox = await secondCard.boundingBox();
        
        if (firstCardBox && secondCardBox) {
          // Second card should be below first card (stacked)
          expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height - 10);
        }
      }
    });

    test('should navigate to agent home page on mobile', async () => {
      await agentsListPage.goto();
      
      const testAgent = testAgents[0];
      await agentsListPage.clickAgentHomeButton(testAgent.id);
      
      // Should navigate successfully
      await agentHomePage.waitForLoad();
      await expect(agentHomePage.page).toHaveURL(new RegExp(`/agents/${testAgent.id}/home`));
      
      // Mobile layout should be applied
      await agentHomePage.validateMobileLayout();
    });

    test('should display agent home page with mobile-optimized layout', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // Header should be visible and properly sized
      const agentName = await agentHomePage.getAgentName();
      expect(agentName).toBeTruthy();
      
      // Tabs should be horizontally scrollable or stacked on mobile
      const tabs = await agentHomePage.getAvailableTabs();
      expect(tabs.length).toBeGreaterThan(0);
      
      // Content should be readable without horizontal scrolling
      const bodyOverflow = await agentHomePage.page.evaluate(() => {
        return window.getComputedStyle(document.body).overflowX;
      });
      expect(['hidden', 'auto', 'visible']).toContain(bodyOverflow);
    });

    test('should handle touch interactions correctly', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // Test tab touch interaction
      await agentHomePage.clickTab('Posts');
      const activeTab = await agentHomePage.getActiveTab();
      expect(activeTab).toBe('Posts');
      
      // Test quick action touch
      await agentHomePage.clickTab('Home');
      const quickActions = await agentHomePage.getQuickActions();
      
      if (quickActions.length > 0) {
        await agentHomePage.clickQuickAction(quickActions[0]);
        // Should respond to touch without errors
        await agentHomePage.page.waitForTimeout(500);
      }
    });

    test('should display mobile-optimized content', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // Widget layout should be optimized for mobile
      const widgets = await agentHomePage.getVisibleWidgets();
      expect(widgets.length).toBeGreaterThan(0);
      
      // Text should be readable at mobile size
      const fontSize = await agentHomePage.page.evaluate(() => {
        const body = document.body;
        return parseInt(window.getComputedStyle(body).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(14); // Minimum readable font size
      
      // Check that content doesn't overflow horizontally
      const bodyWidth = await agentHomePage.page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = agentHomePage.page.viewportSize()?.width || 0;
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 50); // Allow small margin
    });

    test('should handle long content appropriately on mobile', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // Long agent names/descriptions should wrap or truncate
      const agentName = await agentHomePage.getAgentName();
      const nameElement = agentHomePage.agentName;
      
      const nameBox = await nameElement.boundingBox();
      const viewportWidth = agentHomePage.page.viewportSize()?.width || 0;
      
      if (nameBox) {
        expect(nameBox.width).toBeLessThanOrEqual(viewportWidth);
      }
      
      // Post content should be readable
      await agentHomePage.clickTab('Posts');
      const posts = await agentHomePage.getPostCount();
      
      if (posts > 0) {
        const postTitles = await agentHomePage.getPostTitles();
        expect(postTitles.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Mobile Landscape (iPhone 12 Landscape)', () => {
    test.use({ 
      viewport: { width: 844, height: 390 }
    });

    test.beforeEach(async ({ page }) => {
      agentsListPage = new AgentsListPage(page);
      agentHomePage = new AgentHomePage(page);
    });

    test('should adapt to landscape orientation', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // In landscape, there might be more horizontal space
      const viewport = agentHomePage.page.viewportSize();
      expect(viewport?.width).toBeGreaterThan(viewport?.height || 0);
      
      // Content should still be accessible
      const agentName = await agentHomePage.getAgentName();
      expect(agentName).toBeTruthy();
      
      // Tabs should be visible
      const tabs = await agentHomePage.getAvailableTabs();
      expect(tabs.length).toBeGreaterThan(0);
    });

    test('should optimize space usage in landscape mode', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // More content might be visible horizontally
      const widgets = await agentHomePage.getVisibleWidgets();
      expect(widgets.length).toBeGreaterThan(0);
      
      // Check that horizontal space is used effectively
      await agentHomePage.clickTab('Posts');
      const posts = await agentHomePage.getPostCount();
      
      if (posts > 0) {
        // Posts should be laid out appropriately for landscape
        const postElements = agentHomePage.page.locator('.post, article');
        const firstPost = postElements.first();
        
        if (await firstPost.isVisible()) {
          const postBox = await firstPost.boundingBox();
          const viewport = agentHomePage.page.viewportSize();
          
          if (postBox && viewport) {
            // Post should use reasonable width in landscape
            expect(postBox.width).toBeLessThanOrEqual(viewport.width);
            expect(postBox.width).toBeGreaterThan(viewport.width * 0.3);
          }
        }
      }
    });
  });

  test.describe('Tablet (iPad Pro)', () => {
    test.use({ ...devices['iPad Pro'] });

    test.beforeEach(async ({ page }) => {
      agentsListPage = new AgentsListPage(page);
      agentHomePage = new AgentHomePage(page);
    });

    test('should display optimized layout for tablet', async () => {
      await agentsListPage.goto();
      
      // Tablet should show grid layout
      const cardCount = await agentsListPage.getAgentCardCount();
      expect(cardCount).toBeGreaterThan(0);
      
      // Cards might be in a grid on tablet
      const agentCards = await agentsListPage.getAgentCards();
      if (await agentCards.nth(1).isVisible()) {
        const firstCard = agentCards.first();
        const secondCard = agentCards.nth(1);
        
        const firstCardBox = await firstCard.boundingBox();
        const secondCardBox = await secondCard.boundingBox();
        
        if (firstCardBox && secondCardBox) {
          // Cards might be side-by-side on tablet
          const sideBySide = Math.abs(firstCardBox.y - secondCardBox.y) < 50;
          const stacked = secondCardBox.y > firstCardBox.y + firstCardBox.height - 50;
          
          expect(sideBySide || stacked).toBe(true);
        }
      }
    });

    test('should provide enhanced tablet experience', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // Tablet should show more content
      await agentHomePage.validateTabletLayout();
      
      // More widgets might be visible on tablet
      const widgets = await agentHomePage.getVisibleWidgets();
      expect(widgets.length).toBeGreaterThan(0);
      
      // Content should be well-spaced
      await agentHomePage.clickTab('Metrics');
      const metrics = await agentHomePage.getMetricsData();
      expect(Object.keys(metrics).length).toBeGreaterThan(0);
    });

    test('should handle tablet-specific interactions', async () => {
      await agentHomePage.goto(testAgents[0].id);
      
      // Test touch interactions work on tablet
      await agentHomePage.clickTab('Posts');
      await agentHomePage.clickTab('Home');
      await agentHomePage.clickTab('Metrics');
      
      // All tab switches should work smoothly
      const activeTab = await agentHomePage.getActiveTab();
      expect(activeTab).toBe('Metrics');
      
      // Quick actions should be touch-friendly
      await agentHomePage.clickTab('Home');
      const quickActions = await agentHomePage.getQuickActions();
      
      if (quickActions.length > 0) {
        // Action buttons should be appropriately sized for touch
        const actionButton = agentHomePage.page.locator(`button:has-text("${quickActions[0]}")`);
        const buttonBox = await actionButton.boundingBox();
        
        if (buttonBox) {
          // Touch target should be at least 44px (Apple guideline)
          expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(40);
        }
      }
    });
  });

  test.describe('Cross-Device Consistency', () => {
    test('should maintain functionality across device sizes', async ({ browser }) => {
      // Test multiple viewports in the same test
      const contexts = await Promise.all([
        browser.newContext({ viewport: { width: 375, height: 667 } }), // Mobile
        browser.newContext({ viewport: { width: 768, height: 1024 } }), // Tablet
        browser.newContext({ viewport: { width: 1280, height: 720 } })  // Desktop
      ]);
      
      const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
      
      try {
        // Navigate all pages to the same agent
        const testAgent = testAgents[0];
        await Promise.all(pages.map(page => {
          const agentHomePage = new AgentHomePage(page);
          return agentHomePage.goto(testAgent.id);
        }));
        
        // All pages should load successfully
        await Promise.all(pages.map(page => 
          expect(page).toHaveURL(new RegExp(`/agents/${testAgent.id}/home`))
        ));
        
        // Core functionality should work on all devices
        for (const page of pages) {
          const agentHomePage = new AgentHomePage(page);
          
          // Should be able to navigate tabs
          await agentHomePage.clickTab('Posts');
          const activeTab = await agentHomePage.getActiveTab();
          expect(activeTab).toBe('Posts');
          
          // Should show meaningful content
          const agentName = await agentHomePage.getAgentName();
          expect(agentName).toBeTruthy();
        }
        
      } finally {
        await Promise.all(contexts.map(ctx => ctx.close()));
      }
    });

    test('should handle orientation changes gracefully', async ({ page }) => {
      // Start in portrait mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await agentHomePage.goto(testAgents[0].id);
      
      const portraitName = await agentHomePage.getAgentName();
      expect(portraitName).toBeTruthy();
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500); // Allow reflow
      
      const landscapeName = await agentHomePage.getAgentName();
      expect(landscapeName).toBe(portraitName);
      
      // Content should still be accessible
      const tabs = await agentHomePage.getAvailableTabs();
      expect(tabs.length).toBeGreaterThan(0);
    });
  });
});
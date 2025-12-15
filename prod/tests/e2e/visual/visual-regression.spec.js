/**
 * Visual Regression Testing Suite
 * Tests UI components and layouts for visual consistency across browsers and screen sizes
 */

import { test, expect } from '@playwright/test';
import { AgentDashboardPage } from '../pages/agent-dashboard-page.js';
import { PostCreationPage } from '../pages/post-creation-page.js';
import { AnalyticsPage } from '../pages/analytics-page.js';
import { AuthHelpers } from '../utils/auth-helpers.js';
import { VisualHelpers, WaitHelpers } from '../utils/test-helpers.js';
import { TestDataGenerator } from '../fixtures/test-data-generator.js';

test.describe('Visual Regression Testing', () => {
  let authHelpers;
  let visualHelpers;
  let waitHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    visualHelpers = new VisualHelpers(page);
    waitHelpers = new WaitHelpers(page);
    
    await authHelpers.loginAsUser();
  });

  test.afterEach(async () => {
    await authHelpers.logout();
  });

  test('should maintain dashboard layout consistency', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    // Wait for visual stability
    await visualHelpers.waitForVisualStability('[data-testid="dashboard-header"]');
    await waitHelpers.waitForLoadingComplete();
    
    // Take full dashboard screenshot
    await expect(page).toHaveScreenshot('dashboard-full-layout.png', {
      fullPage: true,
      threshold: 0.3
    });
    
    // Test individual dashboard components
    await visualHelpers.compareElement('[data-testid="dashboard-header"]', 'dashboard-header');
    await visualHelpers.compareElement('[data-testid="agents-list"]', 'agents-list');
    await visualHelpers.compareElement('[data-testid="feed-overview"]', 'feed-overview');
    await visualHelpers.compareElement('[data-testid="quick-actions"]', 'quick-actions');
    
    // Test coordination panel if visible
    const coordinationPanel = '[data-testid="coordination-panel"]';
    if (await page.locator(coordinationPanel).isVisible()) {
      await visualHelpers.compareElement(coordinationPanel, 'coordination-panel');
    }
  });

  test('should maintain post creation form layout', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    const postPage = new PostCreationPage(page);
    
    await dashboardPage.navigate();
    const creationPage = await dashboardPage.createPost();
    
    // Wait for form to load completely
    await waitHelpers.waitForLoadingComplete();
    await visualHelpers.waitForVisualStability('[data-testid="content-editor"]');
    
    // Full post creation page
    await expect(page).toHaveScreenshot('post-creation-full.png', {
      fullPage: true,
      threshold: 0.3
    });
    
    // Individual form components
    await visualHelpers.compareElement('[data-testid="post-creation-header"]', 'post-creation-header');
    await visualHelpers.compareElement('[data-testid="content-editor"]', 'content-editor');
    await visualHelpers.compareElement('[data-testid="template-selector"]', 'template-selector');
    await visualHelpers.compareElement('[data-testid="platform-selector"]', 'platform-selector');
    
    // Fill form to test filled state
    await creationPage.createPost({
      title: 'Visual Test Post',
      content: 'This is a test post for visual regression testing with various UI states.',
      hashtags: ['#visual', '#test', '#ui'],
      platforms: ['twitter', 'facebook']
    });
    
    await creationPage.waitForOptimization();
    
    // Test optimization panel
    await visualHelpers.compareElement('[data-testid="content-optimizer"]', 'content-optimizer');
    await visualHelpers.compareElement('[data-testid="quality-score"]', 'quality-score');
    
    // Test preview panel
    await visualHelpers.compareElement('[data-testid="preview-panel"]', 'preview-panel');
    
    // Test with different platform previews
    await creationPage.previewPost('twitter');
    await page.waitForTimeout(1000);
    await visualHelpers.compareElement('[data-testid="preview-content"]', 'preview-twitter');
    
    await creationPage.previewPost('facebook');
    await page.waitForTimeout(1000);
    await visualHelpers.compareElement('[data-testid="preview-content"]', 'preview-facebook');
  });

  test('should maintain analytics dashboard layout', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    const analyticsPage = await dashboardPage.viewAnalytics();
    
    // Wait for analytics data to load
    await analyticsPage.waitForDataLoad();
    await visualHelpers.waitForVisualStability('[data-testid="analytics-header"]');
    
    // Full analytics page
    await expect(page).toHaveScreenshot('analytics-full.png', {
      fullPage: true,
      threshold: 0.3
    });
    
    // Individual analytics components
    await visualHelpers.compareElement('[data-testid="analytics-header"]', 'analytics-header');
    await visualHelpers.compareElement('[data-testid="overview-metrics"]', 'overview-metrics');
    
    // Charts (wait for rendering)
    await page.waitForFunction(() => {
      const charts = document.querySelectorAll('[data-testid*="chart"] canvas');
      return charts.length > 0;
    });
    
    await visualHelpers.compareElement('[data-testid="engagement-chart"]', 'engagement-chart');
    await visualHelpers.compareElement('[data-testid="performance-charts"]', 'performance-charts');
    
    // Tables and lists
    await visualHelpers.compareElement('[data-testid="top-posts-table"]', 'top-posts-table');
    await visualHelpers.compareElement('[data-testid="platform-performance"]', 'platform-performance');
    
    // Intelligence panel
    if (await page.locator('[data-testid="intelligence-panel"]').isVisible()) {
      await visualHelpers.compareElement('[data-testid="intelligence-panel"]', 'intelligence-panel');
    }
  });

  test('should handle responsive design layouts', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1366, height: 768, name: 'desktop-medium' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 375, height: 667, name: 'mobile' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      await dashboardPage.navigate();
      await dashboardPage.waitForAgentsLoad();
      await waitHelpers.waitForLoadingComplete();
      
      // Wait for layout adjustment
      await page.waitForTimeout(1000);
      
      // Take responsive screenshots
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, {
        fullPage: true,
        threshold: 0.3
      });
      
      // Test post creation responsiveness
      const postPage = await dashboardPage.createPost();
      await waitHelpers.waitForLoadingComplete();
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot(`post-creation-${viewport.name}.png`, {
        fullPage: true,
        threshold: 0.3
      });
    }
    
    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle dark mode visual consistency', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    // Enable dark mode (assuming there's a theme toggle)
    await dashboardPage.navigate();
    
    // Look for theme toggle
    const themeToggle = '[data-testid="theme-toggle"]';
    if (await page.locator(themeToggle).isVisible()) {
      await page.click(themeToggle);
      await page.waitForTimeout(1000); // Wait for theme transition
    } else {
      // Set dark mode via localStorage if no toggle
      await page.evaluate(() => {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
      });
      await page.reload();
    }
    
    await dashboardPage.waitForAgentsLoad();
    await waitHelpers.waitForLoadingComplete();
    
    // Dark mode dashboard
    await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
      fullPage: true,
      threshold: 0.3
    });
    
    // Dark mode post creation
    const postPage = await dashboardPage.createPost();
    await waitHelpers.waitForLoadingComplete();
    
    await expect(page).toHaveScreenshot('post-creation-dark-mode.png', {
      fullPage: true,
      threshold: 0.3
    });
    
    // Dark mode analytics
    await dashboardPage.navigate();
    const analyticsPage = await dashboardPage.viewAnalytics();
    await analyticsPage.waitForDataLoad();
    
    await expect(page).toHaveScreenshot('analytics-dark-mode.png', {
      fullPage: true,
      threshold: 0.3
    });
  });

  test('should handle loading states consistently', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    // Capture loading states
    await page.goto('/dashboard');
    
    // Capture initial loading state
    if (await page.locator('[data-testid="dashboard-loading"]').isVisible()) {
      await visualHelpers.compareElement('[data-testid="dashboard-loading"]', 'dashboard-loading');
    }
    
    await dashboardPage.waitForAgentsLoad();
    
    // Create post and capture optimization loading
    const postPage = await dashboardPage.createPost();
    
    await postPage.createPost({
      title: 'Loading State Test',
      content: 'Testing loading states for visual consistency.',
      platforms: ['twitter']
    });
    
    // Try to capture optimization loading state
    const optimizationLoading = '[data-testid="optimization-loading"]';
    if (await page.locator(optimizationLoading).isVisible()) {
      await visualHelpers.compareElement(optimizationLoading, 'optimization-loading');
    }
    
    await postPage.waitForOptimization();
    
    // Test analytics loading
    await dashboardPage.navigate();
    const analyticsPage = await dashboardPage.viewAnalytics();
    
    // Try to capture analytics loading
    const analyticsLoading = '[data-testid="analytics-loading"]';
    if (await page.locator(analyticsLoading).isVisible()) {
      await visualHelpers.compareElement(analyticsLoading, 'analytics-loading');
    }
  });

  test('should handle error states visually', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    
    // Test various error states if they can be triggered
    
    // Try to create invalid post to trigger validation errors
    const postPage = await dashboardPage.createPost();
    
    // Submit empty form to trigger validation
    await page.click('[data-testid="publish-now-button"]');
    
    // Wait for validation errors
    await page.waitForTimeout(1000);
    
    // Capture validation error state
    if (await page.locator('[data-testid="validation-error"]').isVisible()) {
      await expect(page).toHaveScreenshot('post-validation-errors.png', {
        fullPage: true,
        threshold: 0.3
      });
    }
    
    // Test network error state (if possible to simulate)
    // This would require specific test setup to simulate network failures
  });

  test('should maintain agent card layouts', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    // Wait for all agent cards to load
    await page.waitForFunction(() => {
      const agentCards = document.querySelectorAll('[data-testid="agent-tile"]');
      return agentCards.length > 0;
    });
    
    // Test individual agent card layouts
    const agentCards = await page.locator('[data-testid="agent-tile"]').all();
    
    for (let i = 0; i < Math.min(agentCards.length, 5); i++) {
      await expect(agentCards[i]).toHaveScreenshot(`agent-card-${i + 1}.png`, {
        threshold: 0.3
      });
    }
    
    // Test different agent states if available
    const agents = await dashboardPage.getAgentsList();
    const activeAgents = agents.filter(agent => agent.status === 'active');
    const inactiveAgents = agents.filter(agent => agent.status === 'inactive');
    
    if (activeAgents.length > 0) {
      const activeAgentCard = page.locator('[data-testid="agent-tile"]')
        .filter({ has: page.locator('[data-testid="agent-name"]', { hasText: activeAgents[0].name }) });
      
      await expect(activeAgentCard).toHaveScreenshot('agent-card-active.png', {
        threshold: 0.3
      });
    }
    
    if (inactiveAgents.length > 0) {
      const inactiveAgentCard = page.locator('[data-testid="agent-tile"]')
        .filter({ has: page.locator('[data-testid="agent-name"]', { hasText: inactiveAgents[0].name }) });
      
      await expect(inactiveAgentCard).toHaveScreenshot('agent-card-inactive.png', {
        threshold: 0.3
      });
    }
  });

  test('should handle animation states consistently', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    // Test hover states
    const firstAgentCard = page.locator('[data-testid="agent-tile"]').first();
    
    // Capture normal state
    await expect(firstAgentCard).toHaveScreenshot('agent-card-normal.png', {
      threshold: 0.3
    });
    
    // Capture hover state
    await firstAgentCard.hover();
    await page.waitForTimeout(500); // Wait for hover animation
    
    await expect(firstAgentCard).toHaveScreenshot('agent-card-hover.png', {
      threshold: 0.3
    });
    
    // Test button states
    const createPostButton = '[data-testid="create-post-button"]';
    if (await page.locator(createPostButton).isVisible()) {
      // Normal button state
      await expect(page.locator(createPostButton)).toHaveScreenshot('create-post-button-normal.png', {
        threshold: 0.3
      });
      
      // Hover button state
      await page.hover(createPostButton);
      await page.waitForTimeout(300);
      
      await expect(page.locator(createPostButton)).toHaveScreenshot('create-post-button-hover.png', {
        threshold: 0.3
      });
    }
  });

  test('should handle coordination panel visual states', async ({ page }) => {
    const dashboardPage = new AgentDashboardPage(page);
    
    await dashboardPage.navigate();
    await dashboardPage.waitForAgentsLoad();
    
    const agents = await dashboardPage.getAgentsList();
    const activeAgents = agents.filter(agent => agent.status === 'active');
    
    if (activeAgents.length >= 2) {
      // Capture coordination panel before activation
      if (await page.locator('[data-testid="coordination-panel"]').isVisible()) {
        await visualHelpers.compareElement('[data-testid="coordination-panel"]', 'coordination-panel-inactive');
      }
      
      // Start coordination
      await dashboardPage.initiateCoordination(activeAgents.slice(0, 2).map(agent => agent.name));
      
      // Wait for coordination to activate
      await waitHelpers.waitForLoadingComplete(['[data-testid="coordination-loading"]']);
      
      // Capture active coordination panel
      if (await page.locator('[data-testid="coordination-panel"]').isVisible()) {
        await visualHelpers.compareElement('[data-testid="coordination-panel"]', 'coordination-panel-active');
      }
      
      // Capture coordination status indicators
      if (await page.locator('[data-testid="coordination-status"]').isVisible()) {
        await visualHelpers.compareElement('[data-testid="coordination-status"]', 'coordination-status');
      }
    }
  });
});
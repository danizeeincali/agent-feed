import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { AgentsPage } from './pages/AgentsPage.js';
import { FeedPage } from './pages/FeedPage.js';

test.describe('Agent Feed Application - Full User Flow', () => {
  test('complete user journey through the application', async ({ page }) => {
    // Start at home page
    const homePage = new HomePage(page);
    await homePage.goto();
    await homePage.verifyPageElements();

    // Take initial screenshot
    await homePage.takeScreenshot('home-page-initial');

    // Navigate to agents page
    await homePage.navigateToAgents();
    const agentsPage = new AgentsPage(page);
    await agentsPage.verifyPageElements();
    await agentsPage.takeScreenshot('agents-page-loaded');

    // Interact with agents
    const agentCount = await agentsPage.getAgentCount();
    if (agentCount > 0) {
      await agentsPage.filterByType('coder');
      await agentsPage.takeScreenshot('agents-filtered-coder');

      await agentsPage.searchForAgent('test');
      await agentsPage.takeScreenshot('agents-search-results');
    }

    // Navigate to feed page
    await homePage.navigateToFeed();
    const feedPage = new FeedPage(page);
    await feedPage.verifyPageElements();
    await feedPage.takeScreenshot('feed-page-loaded');

    // Interact with feed
    await feedPage.clickRefresh();
    await feedPage.verifyNoLoadingState();
    await feedPage.takeScreenshot('feed-after-refresh');

    // Test responsive behavior
    await page.setViewportSize({ width: 768, height: 1024 });
    await feedPage.takeScreenshot('feed-tablet-view');

    await page.setViewportSize({ width: 375, height: 667 });
    await feedPage.takeScreenshot('feed-mobile-view');
  });

  test('accessibility testing across pages', async ({ page }) => {
    // Home page accessibility
    const homePage = new HomePage(page);
    await homePage.goto();

    // Basic accessibility checks
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[role="navigation"]')).toBeVisible();

    // Keyboard navigation test
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Check for ARIA labels and proper semantic HTML
    const navigation = page.locator('[data-testid="navigation"]');
    await expect(navigation).toHaveAttribute('role', 'navigation');
  });

  test('error handling and edge cases', async ({ page }) => {
    // Test network failure scenarios
    await page.route('**/api/**', route => route.abort());

    const feedPage = new FeedPage(page);
    await feedPage.goto();

    // Should handle network errors gracefully
    // Verify error state is shown appropriately
  });

  test('performance and loading states', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();

    const homePage = new HomePage(page);
    await homePage.goto();

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // Page should load within 5 seconds

    // Test loading states
    await page.route('**/api/feed*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    const feedPage = new FeedPage(page);
    await feedPage.goto();
    await feedPage.verifyLoadingState();
    await feedPage.verifyNoLoadingState();
  });
});
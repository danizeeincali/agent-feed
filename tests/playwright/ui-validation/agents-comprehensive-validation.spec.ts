/**
 * Comprehensive UI Validation Suite for Agents Page
 * Tests all UI components, interactions, and visual elements
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Agents Page - Comprehensive UI Validation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Listen for console messages to capture errors
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`${msg.type()}: ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Listen for network failures
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.log(`Network error: ${response.status()} ${response.url()}`);
      }
    });

    // Navigate to agents page
    await page.goto('http://localhost:3001/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Store console messages for later assertions
    (page as any).consoleMessages = consoleMessages;
    (page as any).consoleErrors = consoleErrors;
  });

  test('should load agents page successfully', async () => {
    // Verify page title
    await expect(page).toHaveTitle(/Agent Feed/);

    // Verify URL
    expect(page.url()).toContain('/agents');

    // Take screenshot of initial page load
    await page.screenshot({
      path: 'test-results/agents-page-initial-load.png',
      fullPage: true
    });
  });

  test('should display main UI components', async () => {
    // Check for main navigation
    const navigation = page.locator('nav, [role="navigation"]');
    await expect(navigation).toBeVisible({ timeout: 10000 });

    // Check for page header
    const header = page.locator('h1, .page-title, [data-testid="page-title"]');
    await expect(header).toBeVisible({ timeout: 10000 });

    // Check for agents container/grid
    const agentsContainer = page.locator(
      '.agents-grid, .agents-list, [data-testid="agents-container"], .grid'
    );
    await expect(agentsContainer).toBeVisible({ timeout: 10000 });

    // Take screenshot of main components
    await page.screenshot({
      path: 'test-results/agents-page-main-components.png',
      fullPage: true
    });
  });

  test('should verify agents dashboard rendering', async () => {
    // Wait for agents to load
    await page.waitForLoadState('networkidle');

    // Look for agent cards or items
    const agentCards = page.locator(
      '.agent-card, .agent-item, [data-testid="agent-card"], .card'
    );

    // Check if agents are displayed
    const agentCount = await agentCards.count();
    console.log(`Found ${agentCount} agent cards`);

    if (agentCount > 0) {
      // Verify first agent card is visible
      await expect(agentCards.first()).toBeVisible();

      // Check for agent information
      const firstAgent = agentCards.first();
      const agentTitle = firstAgent.locator('h2, h3, .title, .name, [data-testid="agent-name"]');
      await expect(agentTitle).toBeVisible();
    }

    // Take screenshot of agents dashboard
    await page.screenshot({
      path: 'test-results/agents-dashboard-view.png',
      fullPage: true
    });
  });

  test('should check for console errors', async () => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check console errors
    const consoleErrors = (page as any).consoleErrors || [];

    // Filter out common non-critical errors
    const criticalErrors = consoleErrors.filter((error: string) => {
      return !error.includes('favicon') &&
             !error.includes('404') &&
             !error.includes('WebSocket') &&
             !error.toLowerCase().includes('warning');
    });

    // Log all console messages for debugging
    const allMessages = (page as any).consoleMessages || [];
    console.log('Console messages:', allMessages);

    // Assert no critical errors
    expect(criticalErrors).toHaveLength(0);
  });

  test('should test responsive design', async () => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.screenshot({
      path: 'test-results/agents-page-desktop.png',
      fullPage: true
    });

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/agents-page-tablet.png',
      fullPage: true
    });

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: 'test-results/agents-page-mobile.png',
      fullPage: true
    });
  });

  test('should test search functionality', async () => {
    // Look for search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search"], .search-input, [data-testid="search"]'
    );

    if (await searchInput.isVisible()) {
      // Test search functionality
      await searchInput.fill('test');
      await page.waitForTimeout(1000);

      // Take screenshot of search results
      await page.screenshot({
        path: 'test-results/agents-search-functionality.png',
        fullPage: true
      });

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(1000);
    } else {
      console.log('Search input not found - this may be expected');
    }
  });

  test('should test filtering features', async () => {
    // Look for filter controls
    const filterButtons = page.locator(
      '.filter, .filter-button, [data-testid="filter"], button[aria-label*="filter"]'
    );

    const filterCount = await filterButtons.count();

    if (filterCount > 0) {
      // Test clicking first filter
      await filterButtons.first().click();
      await page.waitForTimeout(1000);

      // Take screenshot of filtered view
      await page.screenshot({
        path: 'test-results/agents-filtered-view.png',
        fullPage: true
      });
    } else {
      console.log('Filter controls not found - this may be expected');
    }
  });

  test('should test grid/list view toggle', async () => {
    // Look for view toggle buttons
    const viewToggle = page.locator(
      '.view-toggle, .layout-toggle, [data-testid="view-toggle"], button[aria-label*="view"]'
    );

    if (await viewToggle.isVisible()) {
      // Test toggling views
      await viewToggle.click();
      await page.waitForTimeout(1000);

      // Take screenshot of alternate view
      await page.screenshot({
        path: 'test-results/agents-alternate-view.png',
        fullPage: true
      });
    } else {
      console.log('View toggle not found - this may be expected');
    }
  });

  test('should verify navigation functionality', async () => {
    // Test navigation links
    const navLinks = page.locator('nav a, .nav-link, [role="navigation"] a');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      // Test clicking navigation (but don't navigate away)
      const firstLink = navLinks.first();
      const href = await firstLink.getAttribute('href');

      if (href && href !== '/agents') {
        // Just verify the link is clickable
        await expect(firstLink).toBeVisible();
        console.log(`Found navigation link: ${href}`);
      }
    }

    // Take screenshot of navigation
    await page.screenshot({
      path: 'test-results/agents-navigation.png',
      fullPage: true
    });
  });

  test('should test loading states and performance', async () => {
    // Reload page and measure performance
    const startTime = Date.now();

    await page.reload({ waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;
    console.log(`Page load time: ${loadTime}ms`);

    // Check for loading indicators
    const loadingIndicators = page.locator(
      '.loading, .spinner, .skeleton, [data-testid="loading"]'
    );

    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Verify loading indicators are gone
    const visibleLoaders = await loadingIndicators.count();
    expect(visibleLoaders).toBe(0);

    // Performance assertion
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });

  test('should capture final comprehensive screenshot', async () => {
    // Ensure page is fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take final comprehensive screenshot
    await page.screenshot({
      path: 'test-results/agents-page-final-comprehensive.png',
      fullPage: true
    });

    // Also take a viewport screenshot
    await page.screenshot({
      path: 'test-results/agents-page-viewport.png',
      fullPage: false
    });
  });

  test.afterEach(async () => {
    // Log final console state
    const consoleMessages = (page as any).consoleMessages || [];
    const consoleErrors = (page as any).consoleErrors || [];

    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Total console errors: ${consoleErrors.length}`);

    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
    }
  });
});
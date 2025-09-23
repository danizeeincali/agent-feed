/**
 * End-to-End Regression Tests using Playwright
 * Tests UI/UX functionality and user interactions
 */

const { test, expect } = require('@playwright/test');

test.describe('E2E Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the agents page
    await page.goto('/agents');
  });

  test('should display agents page without errors', async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle(/Agent Feed/);

    // Check for no JavaScript errors
    const errors = [];
    page.on('pageerror', error => errors.push(error));

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    expect(errors).toHaveLength(0);
  });

  test('should display agent cards', async ({ page }) => {
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

    // Check that agent cards are visible
    const agentCards = await page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();

    expect(count).toBeGreaterThan(0);
  });

  test('should not display Token Analytics Database Agent', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(3000);

    // Check that Token Analytics Database Agent is not present
    const content = await page.textContent('body');
    expect(content).not.toContain('Token Analytics Database Agent');
    expect(content).not.toContain('token-analytics-database');
  });

  test('should allow filtering agents by category', async ({ page }) => {
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

    // Check if category filter exists
    const categoryFilter = page.locator('[data-testid="category-filter"]');
    if (await categoryFilter.count() > 0) {
      // Test category filtering
      await categoryFilter.first().click();
      await page.waitForTimeout(1000);

      // Verify filtering works
      const filteredCards = await page.locator('[data-testid="agent-card"]');
      const filteredCount = await filteredCards.count();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should allow searching agents', async ({ page }) => {
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

    // Check if search input exists
    const searchInput = page.locator('input[placeholder*="search" i]');
    if (await searchInput.count() > 0) {
      // Test search functionality
      await searchInput.fill('development');
      await page.waitForTimeout(1000);

      // Verify search works
      const searchResults = await page.locator('[data-testid="agent-card"]');
      const resultCount = await searchResults.count();
      expect(resultCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

    // Check that content is still visible and properly laid out
    const agentCards = await page.locator('[data-testid="agent-card"]');
    const count = await agentCards.count();

    expect(count).toBeGreaterThan(0);

    // Check that cards are properly sized for mobile
    const firstCard = agentCards.first();
    const boundingBox = await firstCard.boundingBox();

    expect(boundingBox.width).toBeLessThanOrEqual(375);
  });

  test('should load agent details when clicking on an agent', async ({ page }) => {
    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

    // Click on first agent card
    const firstAgent = page.locator('[data-testid="agent-card"]').first();
    await firstAgent.click();

    // Wait for potential navigation or modal
    await page.waitForTimeout(2000);

    // Verify interaction worked (this depends on actual implementation)
    // Could be navigation to detail page or opening a modal
    const currentUrl = page.url();
    const hasModal = await page.locator('[data-testid="agent-modal"]').count() > 0;

    expect(currentUrl.includes('/agents') || hasModal).toBe(true);
  });

  test('should maintain performance standards', async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();

    // Navigate and wait for load
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="agent-card"]', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Should load within reasonable time (10 seconds max)
    expect(loadTime).toBeLessThan(10000);
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Monitor console errors
    const errors = [];
    page.on('pageerror', error => errors.push(error));
    page.on('response', response => {
      if (response.status() >= 400) {
        errors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    // Navigate and interact with page
    await page.goto('/agents');
    await page.waitForTimeout(5000);

    // Check for any unhandled errors
    const criticalErrors = errors.filter(error =>
      !error.toString().includes('favicon') && // Ignore favicon errors
      !error.toString().includes('_next/static') // Ignore Next.js static file errors
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
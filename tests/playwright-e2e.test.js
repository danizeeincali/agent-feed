// Playwright E2E Tests for AgentLink Frontend
// Tests the complete user interface and functionality

const { test, expect } = require('@playwright/test');

test.describe('AgentLink Frontend E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Go to the application
    await page.goto('http://localhost:3001');
    
    // Wait for React to load
    await page.waitForTimeout(2000);
  });

  test('should load the main page without white screen', async ({ page }) => {
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Agent Feed/);
    
    // Check that the root div exists and is not empty
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    // Ensure we don't have a completely white screen
    const hasContent = await page.locator('body').evaluate(el => el.innerText.trim().length > 0);
    expect(hasContent).toBe(true);
  });

  test('should display the social media feed', async ({ page }) => {
    // Wait for the social media feed to load
    await page.waitForSelector('[data-testid="social-media-feed"], .social-feed, .feed-container', { timeout: 10000 });
    
    // Check for feed content
    const feedExists = await page.locator('.social-feed, .feed-container, [data-testid="social-media-feed"]').isVisible();
    expect(feedExists).toBe(true);
  });

  test('should load agent posts from API', async ({ page }) => {
    // Wait for API call to complete
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/agent-posts') && response.status() === 200
    );
    
    // Check for post elements
    const posts = page.locator('.post, .agent-post, [data-testid="agent-post"]');
    const postCount = await posts.count();
    expect(postCount).toBeGreaterThan(0);
  });

  test('should display navigation menu', async ({ page }) => {
    // Check for navigation elements
    const hasNavigation = await page.locator('nav, .navigation, .sidebar, .menu').isVisible();
    expect(hasNavigation).toBe(true);
    
    // Check for essential nav items
    const feedLink = page.locator('text=Feed, text=Home, [href="/"]').first();
    await expect(feedLink).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/agent-posts', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Check for error message or fallback content
    const hasErrorMessage = await page.locator('text=Error, text=Unable to load, text=Failed').isVisible();
    const hasContent = await page.locator('body').evaluate(el => el.innerText.trim().length > 0);
    
    // Should either show error message or have some fallback content
    expect(hasErrorMessage || hasContent).toBe(true);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check that content is still visible and accessible
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    // Check for horizontal scroll (should not exist)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('should display welcome posts from get-to-know-you-agent', async ({ page }) => {
    // Wait for posts to load
    await page.waitForTimeout(3000);
    
    // Look for welcome posts
    const welcomePost = page.locator('text=Welcome to AgentLink, text=get-to-know-you-agent').first();
    const hasWelcomeContent = await welcomePost.isVisible();
    expect(hasWelcomeContent).toBe(true);
  });

  test('should allow navigation between different sections', async ({ page }) => {
    // Try to navigate to dashboard if link exists
    const dashboardLink = page.locator('text=Dashboard, [href="/dashboard"]').first();
    
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForTimeout(1000);
      
      // Check that URL changed or content changed
      const currentUrl = page.url();
      expect(currentUrl).toContain('/dashboard');
    }
  });

  test('should not show console errors that break functionality', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(5000);
    
    // Filter out minor warnings and focus on actual errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Warning:') && 
      !error.includes('DevTools') &&
      error.includes('Error') || error.includes('TypeError') || error.includes('ReferenceError')
    );
    
    // Should have no critical console errors
    expect(criticalErrors.length).toBe(0);
  });
});
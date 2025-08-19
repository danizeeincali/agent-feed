import { test, expect } from '@playwright/test';

test.describe('Feed Loading E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the frontend application
    await page.goto('http://localhost:3001');
  });

  test('should load feed without "Unable to load feed" error', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page doesn't show the error message
    const errorMessage = page.locator('text=Unable to load feed');
    await expect(errorMessage).not.toBeVisible();
    
    // Check that the API error message is not present
    const apiErrorMessage = page.locator('text=Error connecting to AgentLink API');
    await expect(apiErrorMessage).not.toBeVisible();
  });

  test('should display agent posts from API', async ({ page }) => {
    // Wait for the feed to load
    await page.waitForLoadState('networkidle');
    
    // Look for test posts that should be loaded from our mock API
    const testPost1 = page.locator('text=Test Agent Post 1');
    const testPost2 = page.locator('text=Test Agent Post 2');
    
    // At least one of the test posts should be visible
    await expect(testPost1.or(testPost2)).toBeVisible({ timeout: 10000 });
  });

  test('should have working refresh functionality', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Look for a refresh button and click it
    const refreshButton = page.locator('button:has-text("Refresh")').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      
      // Verify no error appears after refresh
      const errorMessage = page.locator('text=Unable to load feed');
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test('should show healthy API connection', async ({ page }) => {
    // Check API health directly
    const response = await page.request.get('http://localhost:3000/health');
    const health = await response.json();
    
    expect(response.status()).toBe(200);
    expect(health.status).toBe('healthy');
    expect(health.services.api).toBe('up');
  });

  test('should successfully fetch agent posts via API', async ({ page }) => {
    // Test the API endpoint directly
    const response = await page.request.get('http://localhost:3000/api/v1/agent-posts');
    const data = await response.json();
    
    expect(response.status()).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    
    // Verify structure of first post
    const firstPost = data.data[0];
    expect(firstPost).toHaveProperty('id');
    expect(firstPost).toHaveProperty('title');
    expect(firstPost).toHaveProperty('content');
    expect(firstPost).toHaveProperty('authorAgent');
    expect(firstPost).toHaveProperty('metadata');
  });

  test('should handle CORS correctly', async ({ page }) => {
    // Make a request from the frontend origin
    const response = await page.request.get('http://localhost:3000/api/v1/agent-posts', {
      headers: {
        'Origin': 'http://localhost:3001'
      }
    });
    
    expect(response.status()).toBe(200);
  });
});
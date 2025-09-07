import { test, expect } from '@playwright/test';

test.describe('Basic App Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should load app container successfully', async ({ page }) => {
    // Wait for app container (adjusted selector)
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
    
    // Check if the app header is visible
    const header = page.locator('[data-testid="header"]');
    await expect(header).toBeVisible();
    
    // Check if main content is visible
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();
  });

  test('should show navigation', async ({ page }) => {
    // Check if AgentLink title is visible
    const title = page.locator('text=AgentLink');
    await expect(title.first()).toBeVisible();
    
    // Check if navigation items are present (use first() to avoid multiple matches)
    const feedLink = page.locator('text=Feed').first();
    await expect(feedLink).toBeVisible();
  });

  test('should show post creator on feed page', async ({ page }) => {
    // Navigate to feed page (already on it by default)
    
    // Click "Start a post" button to show post creator
    const startPostButton = page.locator('[data-testid="start-post-button"]');
    await expect(startPostButton).toBeVisible({ timeout: 10000 });
    await startPostButton.click();
    
    // Wait for post creator to appear
    const postCreator = page.locator('[data-testid="post-creator"]');
    await expect(postCreator).toBeVisible({ timeout: 10000 });
  });
});
import { test, expect, Page } from '@playwright/test';

/**
 * Phase 1 Features - Focused Test Suite
 * Streamlined tests with better selectors and shorter timeouts
 */

const BASE_URL = 'http://localhost:5173';

async function setupPage(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  return { consoleErrors };
}

test.describe('Phase 1 Features - Focused Tests', () => {
  
  test('1. Post Creator Expand/Collapse - Basic Functionality', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Test collapsed state
    await expect(page.locator('text=Start a post')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Create New Post')).not.toBeVisible();
    
    // Expand post creator
    await page.click('text=Start a post');
    
    // Verify expanded state
    await expect(page.locator('text=Create New Post')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder*="title"]')).toBeVisible();
    await expect(page.locator('textarea[placeholder*="insights"]')).toBeVisible();
    
    // Test collapse
    await page.click('button[title="Close"]');
    await expect(page.locator('text=Create New Post')).not.toBeVisible();
    await expect(page.locator('text=Start a post')).toBeVisible();
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('2. Character Count - Real-time Updates', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Expand post creator
    await page.click('text=Start a post');
    await expect(page.locator('text=Create New Post')).toBeVisible({ timeout: 5000 });
    
    // Test title character count
    const titleInput = page.locator('input[placeholder*="title"]');
    await titleInput.fill('Test Title');
    
    // Check for character count display
    await expect(page.locator('text=/\\d+\\/200/')).toBeVisible({ timeout: 2000 });
    
    // Test content character count
    const contentTextarea = page.locator('textarea[placeholder*="insights"]');
    await contentTextarea.fill('This is test content');
    
    // Check for content character count
    await expect(page.locator('text=/\\d+\\/5000/')).toBeVisible({ timeout: 2000 });
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('3. No Sharing Buttons - UI Verification', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Check that no sharing elements exist
    const sharingSelectors = [
      'text=Share',
      'text=share',
      'text=Twitter',
      'text=Facebook',
      'text=LinkedIn',
      '[aria-label*="share" i]',
      '[title*="share" i]'
    ];
    
    for (const selector of sharingSelectors) {
      const elements = page.locator(selector);
      expect(await elements.count()).toBe(0);
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('4. Post Order - Chronological Display', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Wait for posts to load or empty state to appear
    await page.waitForSelector('article, [data-testid="empty-state"], [data-testid="loading-state"]', { timeout: 10000 });
    
    // Check if loading state appears and disappears
    const loadingState = page.locator('[data-testid="loading-state"]');
    if (await loadingState.isVisible()) {
      await loadingState.waitFor({ state: 'hidden', timeout: 10000 });
    }
    
    // Verify sort selector defaults to newest first
    const sortSelect = page.locator('select').nth(1);
    if (await sortSelect.isVisible()) {
      await expect(sortSelect).toHaveValue('published_at-DESC');
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('5. JavaScript Error-Free Interactions', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Test various interactions that should not produce errors
    
    // Expand/collapse post creator
    await page.click('text=Start a post');
    await page.waitForTimeout(500);
    await page.click('button[title="Close"]');
    await page.waitForTimeout(500);
    
    // Test refresh button
    const refreshButton = page.locator('button[title="Refresh feed"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Test filter changes
    const filterSelect = page.locator('select').first();
    if (await filterSelect.isVisible()) {
      await filterSelect.selectOption('high-impact');
      await page.waitForTimeout(500);
      await filterSelect.selectOption('all');
      await page.waitForTimeout(500);
    }
    
    // Test search toggle
    const searchButton = page.locator('button[title="Search posts"]');
    if (await searchButton.isVisible()) {
      await searchButton.click();
      await page.waitForTimeout(500);
      await searchButton.click();
      await page.waitForTimeout(500);
    }
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('6. Form Validation - Submit Button State', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Expand post creator
    await page.click('text=Start a post');
    await expect(page.locator('text=Create New Post')).toBeVisible({ timeout: 5000 });
    
    // Submit button should be disabled initially
    const submitButton = page.locator('button:has-text("Publish Post")');
    await expect(submitButton).toBeDisabled();
    
    // Fill only title - should still be disabled
    await page.fill('input[placeholder*="title"]', 'Test Title');
    await expect(submitButton).toBeDisabled();
    
    // Fill content - should become enabled
    await page.fill('textarea[placeholder*="insights"]', 'Test content');
    await expect(submitButton).not.toBeDisabled();
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('7. Mobile Responsive - Viewport Changes', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    
    // Expand post creator
    await page.click('text=Start a post');
    await expect(page.locator('text=Create New Post')).toBeVisible({ timeout: 5000 });
    
    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Post creator should still be functional
    await expect(page.locator('input[placeholder*="title"]')).toBeVisible();
    
    // Switch back to desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('8. Word Count and Reading Time Display', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    
    // Expand post creator
    await page.click('text=Start a post');
    await expect(page.locator('text=Create New Post')).toBeVisible({ timeout: 5000 });
    
    // Fill content
    const contentTextarea = page.locator('textarea[placeholder*="insights"]');
    await contentTextarea.fill('This is a test with multiple words for counting functionality testing.');
    
    // Check for word count display
    await expect(page.locator('text=/\\d+ words/')).toBeVisible({ timeout: 2000 });
    
    // Check for reading time display
    await expect(page.locator('text=/\\d+ min read/')).toBeVisible({ timeout: 2000 });
    
    expect(consoleErrors).toHaveLength(0);
  });
});
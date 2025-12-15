import { test, expect } from '@playwright/test';

test.describe('🎯 Critical @ Mention System Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to be fully loaded
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 30000 });
    // Disable animations for consistent testing
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('@ mentions work consistently across PostCreator', async ({ page }) => {
    console.log('🧪 Testing PostCreator @ mentions...');
    
    // Navigate to PostCreator
    await page.click('[data-testid="create-post-button"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();
    
    // Test @ mention in title
    const titleInput = page.locator('[data-testid="post-title"]');
    await titleInput.fill('Hey @');
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible({ timeout: 5000 });
    
    // Verify dropdown contains suggestions
    const suggestions = page.locator('[data-testid="mention-suggestion"]');
    await expect(suggestions.first()).toBeVisible();
    
    // Select first suggestion
    await suggestions.first().click();
    await expect(titleInput).toContainText('@');
    
    console.log('✅ PostCreator title @ mentions work');
    
    // Test @ mention in content
    const contentInput = page.locator('[data-testid="post-content"]');
    await contentInput.fill('Content with @');
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible({ timeout: 5000 });
    
    // Select first suggestion in content
    await page.locator('[data-testid="mention-suggestion"]').first().click();
    await expect(contentInput).toContainText('@');
    
    console.log('✅ PostCreator content @ mentions work');
  });

  test('@ mentions work consistently in Comment system', async ({ page }) => {
    console.log('🧪 Testing Comment @ mentions...');
    
    // Find first post and click reply
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });
    
    const replyButton = firstPost.locator('[data-testid="reply-button"]');
    await replyButton.click();
    
    // Wait for comment form to appear
    const commentInput = page.locator('[data-testid="comment-input"]');
    await expect(commentInput).toBeVisible({ timeout: 5000 });
    
    // Type @ to trigger mentions
    await commentInput.fill('@');
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible({ timeout: 5000 });
    
    // Verify dropdown positioning (should be near input)
    const dropdown = page.locator('[data-testid="mention-dropdown"]');
    const inputBox = await commentInput.boundingBox();
    const dropdownBox = await dropdown.boundingBox();
    
    if (inputBox && dropdownBox) {
      expect(Math.abs(dropdownBox.y - inputBox.y)).toBeLessThan(100);
      console.log('✅ Comment dropdown positioning correct');
    }
    
    // Select mention
    await page.locator('[data-testid="mention-suggestion"]').first().click();
    await expect(commentInput).toContainText('@');
    
    console.log('✅ Comment @ mentions work');
  });

  test('@ mentions work consistently in QuickPost', async ({ page }) => {
    console.log('🧪 Testing QuickPost @ mentions...');
    
    // Navigate to posting interface
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    
    // Find quick post input
    const quickPostInput = page.locator('[data-testid="quick-post-input"]');
    await expect(quickPostInput).toBeVisible({ timeout: 10000 });
    
    // Type @ to trigger mentions
    await quickPostInput.fill('Quick post with @');
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible({ timeout: 5000 });
    
    // Verify suggestions load
    const suggestions = page.locator('[data-testid="mention-suggestion"]');
    await expect(suggestions.first()).toBeVisible();
    
    // Select mention
    await suggestions.first().click();
    await expect(quickPostInput).toContainText('@');
    
    console.log('✅ QuickPost @ mentions work');
  });

  test('@ mention dropdown appears within performance threshold', async ({ page }) => {
    console.log('🧪 Testing @ mention performance...');
    
    await page.click('[data-testid="create-post-button"]');
    const contentInput = page.locator('[data-testid="post-content"]');
    
    // Measure dropdown appearance time
    const startTime = Date.now();
    await contentInput.fill('@');
    await page.locator('[data-testid="mention-dropdown"]').waitFor({ state: 'visible', timeout: 1000 });
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(500);
    console.log(`✅ @ mention dropdown appeared in ${responseTime}ms (< 500ms threshold)`);
  });

  test('@ mention system handles rapid typing without errors', async ({ page }) => {
    console.log('🧪 Testing @ mention rapid typing handling...');
    
    await page.click('[data-testid="create-post-button"]');
    const contentInput = page.locator('[data-testid="post-content"]');
    
    // Rapid typing simulation
    const rapidText = '@test @user @admin @someone';
    await contentInput.type(rapidText, { delay: 50 });
    
    // Should not throw any errors or crash
    await page.waitForTimeout(1000);
    
    // Verify final state
    await expect(contentInput).toHaveValue(rapidText);
    
    console.log('✅ Rapid typing handled without errors');
  });

  test('@ mention system maintains state during component switching', async ({ page }) => {
    console.log('🧪 Testing @ mention state persistence...');
    
    // Start in PostCreator
    await page.click('[data-testid="create-post-button"]');
    const contentInput = page.locator('[data-testid="post-content"]');
    await contentInput.fill('Content with @user');
    
    // Switch to another tab/section and back
    await page.goto('/');
    await page.goto('/posting');
    await page.goto('/');
    
    // Return to PostCreator
    await page.click('[data-testid="create-post-button"]');
    
    // Verify @ mention still works
    const newContentInput = page.locator('[data-testid="post-content"]');
    await newContentInput.fill('@');
    await expect(page.locator('[data-testid="mention-dropdown"]')).toBeVisible({ timeout: 5000 });
    
    console.log('✅ @ mention system maintains state across navigation');
  });

  test('@ mention accessibility features work correctly', async ({ page }) => {
    console.log('🧪 Testing @ mention accessibility...');
    
    await page.click('[data-testid="create-post-button"]');
    const contentInput = page.locator('[data-testid="post-content"]');
    
    await contentInput.fill('@');
    await page.locator('[data-testid="mention-dropdown"]').waitFor({ state: 'visible' });
    
    // Test keyboard navigation
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Verify selection worked
    await expect(contentInput).toContainText('@');
    
    // Test ARIA attributes
    const dropdown = page.locator('[data-testid="mention-dropdown"]');
    await expect(dropdown).toHaveAttribute('role', 'listbox');
    
    console.log('✅ @ mention accessibility features work');
  });
});
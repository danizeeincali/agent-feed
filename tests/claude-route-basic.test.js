const { test, expect } = require('@playwright/test');

test.describe('Claude Instance Manager Route Test', () => {
  test('should load Claude Instance Manager page correctly', async ({ page }) => {
    // Navigate to the Claude Instance Manager
    await page.goto('http://localhost:5173/claude-instances');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page title/header contains the expected text
    await expect(page.locator('h2')).toContainText('Claude Instance Manager', { timeout: 10000 });
    
    // Check if launch buttons are visible
    const launchButtons = page.locator('.launch-buttons button');
    await expect(launchButtons).toHaveCount(4, { timeout: 10000 });
    
    // Verify specific button texts
    await expect(page.locator('button:has-text("prod/claude")')).toBeVisible();
    await expect(page.locator('button:has-text("skip-permissions")')).toBeVisible();
    await expect(page.locator('button:has-text("skip-permissions -c")')).toBeVisible();
    await expect(page.locator('button:has-text("skip-permissions --resume")')).toBeVisible();
    
    console.log('✅ Claude Instance Manager page loaded successfully with all buttons');
  });
});
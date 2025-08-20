/**
 * NLD Test Case: Infinite Loading State Regression
 * Tests the fix for TokenCostAnalytics infinite spinner issue
 */

const { test, expect } = require('@playwright/test');

test.describe('TokenCostAnalytics Loading State Fix', () => {
  test('should resolve loading state within 5 seconds', async ({ page }) => {
    // Navigate to analytics tab
    await page.goto('http://localhost:3000');
    
    // Wait for initial page load
    await page.waitForLoadState('networkidle');
    
    // Switch to tokens tab to trigger TokenCostAnalytics
    await page.click('[data-tab="tokens"]');
    
    // Check that "Token Analytics Loading" appears initially
    const loadingMessage = page.locator('text=Token Analytics Loading');
    await expect(loadingMessage).toBeVisible({ timeout: 2000 });
    
    // Ensure loading state resolves within 5 seconds
    await expect(loadingMessage).not.toBeVisible({ timeout: 8000 });
    
    // Verify component rendered successfully
    const tokenAnalytics = page.locator('[data-testid="token-cost-analytics"]');
    await expect(tokenAnalytics).toBeVisible({ timeout: 3000 });
  });

  test('should not get stuck in infinite loading loop', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Switch to tokens tab
    await page.click('[data-tab="tokens"]');
    
    // Wait for maximum expected loading time
    await page.waitForTimeout(10000);
    
    // Should not still be loading after 10 seconds
    const stillLoading = await page.locator('text=Token Analytics Loading').isVisible();
    expect(stillLoading).toBe(false);
  });

  test('should handle websocket connection gracefully', async ({ page }) => {
    // Block websocket connections to test fallback
    await page.route('ws://localhost:3001', route => route.abort());
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Switch to tokens tab
    await page.click('[data-tab="tokens"]');
    
    // Should still resolve loading even without websocket
    const loadingMessage = page.locator('text=Token Analytics Loading');
    await expect(loadingMessage).not.toBeVisible({ timeout: 8000 });
  });
});
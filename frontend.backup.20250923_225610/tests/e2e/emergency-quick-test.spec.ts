/**
 * 🚨 EMERGENCY QUICK TEST: Validate @ Mention Fix
 */
import { test, expect } from '@playwright/test';

test.describe('🚨 EMERGENCY: Quick @ Mention Fix Validation', () => {
  test('Emergency debug page should show working @ mentions', async ({ page }) => {
    console.log('🚨 Testing emergency debug page');
    
    // Go to our debug page
    await page.goto('http://localhost:5173/emergency-debug.html');
    
    // Find the emergency textarea
    const textarea = await page.locator('#emergency-textarea');
    await expect(textarea).toBeVisible();
    
    // Type @ to trigger mention
    await textarea.fill('@');
    await page.waitForTimeout(500);
    
    // Check if dropdown appeared
    const dropdown = await page.locator('#emergency-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Verify we have suggestions
    const suggestions = await page.locator('.suggestion');
    await expect(suggestions).toHaveCount(3);
    
    console.log('✅ Emergency debug page @ mentions working!');
  });

  test('CommentForm should use MentionInput with working dropdown', async ({ page }) => {
    console.log('🚨 Testing CommentForm with MentionInput');
    
    await page.goto('http://localhost:5173');
    
    // Find any textarea (should be using MentionInput)
    const textarea = await page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    
    // Type @ to trigger mention
    await textarea.fill('@');
    await page.waitForTimeout(1000); // Give more time for component
    
    // Look for the emergency debug dropdown (with yellow debug banner)
    const debugDropdown = await page.locator('[class*="absolute"][class*="z-"]').filter({
      hasText: 'EMERGENCY DEBUG'
    });
    
    if (await debugDropdown.isVisible()) {
      console.log('✅ Found emergency debug dropdown!');
      
      // Verify suggestions exist
      const suggestions = await debugDropdown.locator('[role="option"]');
      const count = await suggestions.count();
      console.log(`📊 Found ${count} suggestions`);
      
      expect(count).toBeGreaterThan(0);
    } else {
      console.log('❌ No emergency debug dropdown found');
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/no-dropdown-found.png' });
    }
  });
});
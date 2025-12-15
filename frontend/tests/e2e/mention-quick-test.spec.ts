/**
 * Quick @ Mention Test - Isolate the dropdown issue
 */

import { test, expect, Page } from '@playwright/test';

test.describe('🎯 Quick @ Mention Test', () => {
  test('Direct MentionInput dropdown test', async ({ page }) => {
    console.log('🎯 Testing @ mentions directly');
    
    // Navigate to live system
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/quick-test-initial.png' });
    
    // Look for any textarea that might have MentionInput
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    console.log(`Found ${count} textareas`);
    
    // Test each textarea
    for (let i = 0; i < count; i++) {
      const textarea = textareas.nth(i);
      const placeholder = await textarea.getAttribute('placeholder');
      console.log(`Testing textarea ${i}: ${placeholder}`);
      
      try {
        await textarea.click();
        await textarea.type('@');
        await page.waitForTimeout(500);
        
        // Check for dropdown
        const dropdown = page.locator('[role="listbox"]');
        const dropdownVisible = await dropdown.isVisible().catch(() => false);
        
        console.log(`Textarea ${i} @ result: dropdown=${dropdownVisible}`);
        
        // Clear
        await textarea.fill('');
        
        if (dropdownVisible) {
          console.log('✅ FOUND WORKING MENTION INPUT!');
          await page.screenshot({ path: `test-results/working-mention-${i}.png` });
        }
        
      } catch (error) {
        console.log(`Error testing textarea ${i}: ${error.message}`);
      }
    }
    
    expect(true).toBe(true); // Always pass, just gather info
  });
});
import { test, expect } from '@playwright/test';

test.describe('Quick Comment @ Mention Test', () => {
  test.setTimeout(30000); // 30 second timeout

  test('Quick validation: Compare PostCreator vs Comment mention behavior', async ({ page }) => {
    console.log('🚨 EMERGENCY: Quick comment @ mention validation');
    
    await page.goto('/');
    await page.waitForTimeout(2000);

    // STEP 1: Test PostCreator (should work)
    console.log('📝 Testing PostCreator @ mention...');
    const postTextarea = page.locator('textarea').first();
    await postTextarea.click();
    await postTextarea.type('@');
    await page.waitForTimeout(1000);

    // Look for any dropdown/suggestion elements
    const postDropdown = await page.locator('.mention-dropdown, [data-testid="mention-dropdown"], .dropdown, .suggestions, [role="listbox"]').count();
    console.log(`✅ PostCreator dropdowns found: ${postDropdown}`);

    // Clear for next test
    await postTextarea.clear();

    // STEP 2: Test Comment form (expected to fail)
    console.log('💬 Testing Comment form @ mention...');
    
    // Find and click first reply button
    const replyButton = page.locator('button').filter({ hasText: /reply|comment/i }).first();
    const replyExists = await replyButton.count();
    
    if (replyExists === 0) {
      console.log('⚠️  No reply buttons found - checking for existing comment forms');
      // Look for existing comment inputs
      const commentInputs = page.locator('textarea[placeholder*="comment"], input[placeholder*="comment"], .comment-input');
      const commentCount = await commentInputs.count();
      console.log(`Found ${commentCount} existing comment inputs`);
      
      if (commentCount > 0) {
        await commentInputs.first().click();
        await commentInputs.first().type('@');
        await page.waitForTimeout(1000);
        
        const commentDropdown = await page.locator('.mention-dropdown, [data-testid="mention-dropdown"], .dropdown, .suggestions, [role="listbox"]').count();
        console.log(`💬 Comment form dropdowns found: ${commentDropdown}`);
        
        // Compare results
        console.log('\n🎯 COMPARISON RESULTS:');
        console.log(`PostCreator @ dropdowns: ${postDropdown}`);
        console.log(`Comment form @ dropdowns: ${commentDropdown}`);
        console.log(`Bug confirmed: ${postDropdown > 0 && commentDropdown === 0 ? 'YES' : 'NO'}`);
        
        // Expect both to be equal (this will fail if bug exists)
        expect(commentDropdown).toBe(postDropdown);
      } else {
        console.log('❌ No comment inputs found to test');
        expect.fail('No comment inputs available for testing');
      }
    } else {
      await replyButton.click();
      await page.waitForTimeout(1000);
      
      // Find comment input after clicking reply
      const commentInput = page.locator('textarea, input').last();
      await commentInput.click();
      await commentInput.type('@');
      await page.waitForTimeout(1000);
      
      const commentDropdown = await page.locator('.mention-dropdown, [data-testid="mention-dropdown"], .dropdown, .suggestions, [role="listbox"]').count();
      console.log(`💬 Comment form dropdowns found: ${commentDropdown}`);
      
      // Compare results
      console.log('\n🎯 COMPARISON RESULTS:');
      console.log(`PostCreator @ dropdowns: ${postDropdown}`);
      console.log(`Comment form @ dropdowns: ${commentDropdown}`);
      console.log(`Bug confirmed: ${postDropdown > 0 && commentDropdown === 0 ? 'YES' : 'NO'}`);
      
      // Expect both to be equal (this will fail if bug exists)
      expect(commentDropdown).toBe(postDropdown);
    }
  });
});
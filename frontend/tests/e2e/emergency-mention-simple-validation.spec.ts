import { test, expect } from '@playwright/test';

test.describe('EMERGENCY: Simple @ Mention System Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the live application with proper wait
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  });

  test('Emergency Validation: @ Mention System Current State', async ({ page }) => {
    console.log('🚨 EMERGENCY SIMPLE VALIDATION: Starting...');

    // Step 1: Verify application loads
    await expect(page).toHaveTitle(/Agent Feed/i);
    await page.screenshot({ path: 'test-results/emergency-simple-initial.png', fullPage: true });
    console.log('✅ Application loaded');

    // Step 2: Find ALL input elements on the page
    const allInputs = await page.locator('textarea, input[type="text"]').all();
    console.log(`🔍 Total input elements found: ${allInputs.length}`);

    // Step 3: Test each input for @ mention behavior
    for (let i = 0; i < Math.min(allInputs.length, 5); i++) {
      const input = allInputs[i];
      
      try {
        await input.scrollIntoViewIfNeeded();
        await input.click();
        await input.clear();
        
        console.log(`🧪 Testing input ${i + 1}: Typing @`);
        await input.type('@');
        
        // Wait for potential dropdowns
        await page.waitForTimeout(2000);
        
        // Check for any mention-related elements
        const dropdowns = await page.locator('[role="listbox"], [class*="dropdown"], [class*="suggestion"], [class*="mention"]').all();
        const dropdownCount = dropdowns.length;
        
        console.log(`📋 Input ${i + 1} after @: Found ${dropdownCount} potential dropdown(s)`);
        
        if (dropdownCount > 0) {
          await page.screenshot({ path: `test-results/emergency-simple-dropdown-${i}.png` });
          console.log(`✅ SUCCESS: Dropdown appeared for input ${i + 1}!`);
          
          // Try to find specific mention items
          const mentionItems = await page.locator('[role="option"], [class*="mention"], li').all();
          console.log(`🎯 Mention items in dropdown: ${mentionItems.length}`);
          
          // If we found mentions, try to click one
          if (mentionItems.length > 0) {
            await mentionItems[0].click();
            await page.waitForTimeout(500);
            const inputValue = await input.inputValue();
            console.log(`🎉 After clicking mention - Input value: "${inputValue}"`);
          }
        } else {
          console.log(`❌ No dropdown for input ${i + 1}`);
        }
        
        await page.screenshot({ path: `test-results/emergency-simple-test-${i}.png` });
        
      } catch (error) {
        console.log(`❌ Error testing input ${i + 1}: ${error.message}`);
      }
    }

    // Step 4: Look for specific components
    const mentionComponents = await page.locator('[data-testid*="mention"], [class*="MentionInput"], [class*="mention"]').all();
    console.log(`🎯 MentionInput components found: ${mentionComponents.length}`);

    // Step 5: Look for comment forms specifically
    const commentForms = await page.locator('form').filter({ hasText: /comment|reply/i }).all();
    console.log(`💬 Comment forms found: ${commentForms.length}`);

    if (commentForms.length > 0) {
      const commentInput = commentForms[0].locator('textarea, input');
      const commentInputCount = await commentInput.count();
      console.log(`💬 Inputs in first comment form: ${commentInputCount}`);
      
      if (commentInputCount > 0) {
        await commentInput.first().scrollIntoViewIfNeeded();
        await commentInput.first().click();
        await commentInput.first().type('Testing @mention');
        await page.waitForTimeout(2000);
        
        const dropdownAfterComment = await page.locator('[role="listbox"], [class*="dropdown"]').count();
        console.log(`💬 Comment form @ test - Dropdowns: ${dropdownAfterComment}`);
        
        await page.screenshot({ path: 'test-results/emergency-simple-comment-test.png' });
      }
    }

    // Step 6: Final assessment
    console.log('\n🚨 EMERGENCY SIMPLE VALIDATION SUMMARY:');
    console.log(`📱 App loaded: ✅`);
    console.log(`🔍 Total inputs: ${allInputs.length}`);
    console.log(`🎯 Mention components: ${mentionComponents.length}`);
    console.log(`💬 Comment forms: ${commentForms.length}`);
    console.log(`📋 Look for screenshots in test-results/emergency-simple-*.png`);

    await page.screenshot({ path: 'test-results/emergency-simple-final.png', fullPage: true });
  });

  test('Emergency Test: Check MentionInput Debug Messages', async ({ page }) => {
    console.log('🚨 EMERGENCY: Looking for MentionInput debug messages...');

    // Capture console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('EMERGENCY') || msg.text().includes('DEBUG') || msg.text().includes('mention')) {
        consoleMessages.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Look for any input and try typing @
    const anyInput = page.locator('textarea, input[type="text"]').first();
    if (await anyInput.count() > 0) {
      await anyInput.click();
      await anyInput.type('@test');
      await page.waitForTimeout(3000);
    }

    console.log('\n📝 Console messages captured:');
    consoleMessages.forEach(msg => console.log(msg));
    
    if (consoleMessages.length === 0) {
      console.log('❌ No debug messages found - MentionInput may not be loading');
    }
  });
});
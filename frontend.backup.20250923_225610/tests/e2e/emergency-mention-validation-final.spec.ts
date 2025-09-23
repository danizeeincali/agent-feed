import { test, expect } from '@playwright/test';

test.describe('Emergency Mention Validation Final', () => {
  test.setTimeout(30000);

  test('Direct validation of @ mention functionality in app', async ({ page }) => {
    console.log('🚨 FINAL VALIDATION: Testing @ mention functionality');
    
    // Go directly to our validation page
    await page.goto('http://localhost:5173/emergency-comment-mention-validation.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('✅ Validation page loaded');
    
    // Run the validation automatically
    await page.click('button:has-text("Run @ Mention Validation")');
    await page.waitForTimeout(1000);
    
    // Check the results
    const validationResults = await page.locator('#validation-results').textContent();
    console.log('📊 Validation Results:', validationResults);
    
    // Now test the real application
    console.log('🌐 Testing real application...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Test PostCreator @ mention functionality
    console.log('📝 Testing PostCreator @ mentions...');
    
    // Find any textarea (PostCreator)
    const textareas = page.locator('textarea');
    const textareaCount = await textareas.count();
    console.log(`Found ${textareaCount} textareas`);
    
    if (textareaCount > 0) {
      // Force click and type without waiting for overlays
      await textareas.first().focus();
      await page.keyboard.type('@');
      await page.waitForTimeout(2000);
      
      // Check for dropdown elements
      const dropdownElements = await page.locator('[role="listbox"], .mention-dropdown, .dropdown').count();
      console.log(`✅ PostCreator: Found ${dropdownElements} dropdown elements`);
      
      // Clear textarea
      await page.keyboard.selectAll();
      await page.keyboard.press('Delete');
      
      // Look for existing posts to test comments
      const posts = await page.locator('[data-testid="post"], .post, article').count();
      console.log(`Found ${posts} posts for comment testing`);
      
      // Summary
      console.log('\n🎯 FINAL VALIDATION SUMMARY:');
      console.log(`PostCreator @ mention dropdowns: ${dropdownElements > 0 ? 'WORKING ✅' : 'BROKEN ❌'}`);
      console.log(`Posts available for comment testing: ${posts}`);
      
      if (dropdownElements === 0) {
        console.log('⚠️  PostCreator @ mentions not working - this suggests MentionInput component issue');
      }
      
      // The assertion
      expect(dropdownElements).toBeGreaterThan(0);
      
    } else {
      console.log('❌ No textareas found');
      expect.fail('No textareas found in application');
    }
  });

  test('DOM inspection for mention components', async ({ page }) => {
    console.log('🔬 DOM INSPECTION: Looking for MentionInput components');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Inspect DOM for mention-related components
    const mentionElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const mentionRelated = [];
      
      elements.forEach((el, index) => {
        const className = el.className;
        const id = el.id;
        const tagName = el.tagName.toLowerCase();
        
        if (typeof className === 'string' && className.includes('mention')) {
          mentionRelated.push({
            index,
            tag: tagName,
            class: className,
            id: id,
            text: el.textContent?.slice(0, 50) || ''
          });
        }
      });
      
      return mentionRelated;
    });
    
    console.log('🔍 Mention-related elements found:', mentionElements.length);
    mentionElements.forEach(el => {
      console.log(`  - ${el.tag}.${el.class} (${el.text.substring(0, 30)}...)`);
    });
    
    // Check for MentionInput specifically
    const mentionInputs = await page.locator('[class*="MentionInput"], [data-component="mention-input"]').count();
    console.log(`📊 MentionInput components found: ${mentionInputs}`);
    
    // Check textareas with mention attributes
    const mentionTextareas = await page.locator('textarea[data-mention-context], textarea[aria-haspopup="listbox"]').count();
    console.log(`📝 Textareas with mention attributes: ${mentionTextareas}`);
    
    // Take screenshot for analysis
    await page.screenshot({ 
      path: 'frontend/test-results/dom-inspection-mention-elements.png',
      fullPage: true
    });
    
    // Test typing @ in the first textarea with mention attributes
    if (mentionTextareas > 0) {
      console.log('⌨️  Testing @ typing in mention-enabled textarea...');
      const mentionTextarea = page.locator('textarea[data-mention-context]').first();
      
      await mentionTextarea.focus();
      await page.keyboard.type('@test');
      await page.waitForTimeout(2000);
      
      // Check for any dropdown that might appear
      const dropdownsAfterTyping = await page.locator('[role="listbox"], .mention-dropdown, [class*="dropdown"], [class*="suggestion"]').count();
      console.log(`📋 Dropdowns after typing @: ${dropdownsAfterTyping}`);
      
      await page.screenshot({ 
        path: 'frontend/test-results/dom-after-typing-mention.png',
        fullPage: true
      });
      
      expect(dropdownsAfterTyping).toBeGreaterThan(0);
    } else {
      console.log('⚠️  No mention-enabled textareas found');
      expect.fail('No mention-enabled textareas found');
    }
  });
});
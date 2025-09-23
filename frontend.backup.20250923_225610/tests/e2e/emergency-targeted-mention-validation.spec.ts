import { test, expect } from '@playwright/test';

test.describe('🎯 TARGETED @ Mention Integration Investigation', () => {
  
  test('🔍 Main Feed QuickPost @ Mention Analysis', async ({ page }) => {
    console.log('🔍 Investigating main feed @ mention functionality...');
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'test-results/targeted-main-feed-initial.png',
      fullPage: true 
    });
    
    // Look for the actual text input that exists (from screenshot analysis)
    const quickPostInput = page.locator('input[placeholder*="What\'s on your mind"], textarea[placeholder*="What\'s on your mind"]');
    
    // Verify the input exists
    const inputExists = await quickPostInput.isVisible();
    console.log(`📝 QuickPost input exists: ${inputExists}`);
    
    if (inputExists) {
      // Click and focus the input
      await quickPostInput.click();
      await page.waitForTimeout(500);
      
      // Take screenshot after focus
      await page.screenshot({ 
        path: 'test-results/targeted-quickpost-focused.png',
        fullPage: true 
      });
      
      // Type @ symbol and check for dropdown
      await quickPostInput.type('@');
      await page.waitForTimeout(1500); // Wait for dropdown
      
      // Take screenshot after @ symbol
      await page.screenshot({ 
        path: 'test-results/targeted-quickpost-at-symbol.png',
        fullPage: true 
      });
      
      // Look for mention dropdown
      const dropdownSelectors = [
        '[data-testid="mention-dropdown"]',
        '.mention-dropdown',
        '.suggestions-dropdown',
        '[class*="dropdown"]',
        '[class*="suggestion"]',
        '[class*="mention"]'
      ];
      
      let dropdownFound = false;
      for (const selector of dropdownSelectors) {
        const dropdown = page.locator(selector);
        const isVisible = await dropdown.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`✅ Found dropdown with selector: ${selector}`);
          dropdownFound = true;
          break;
        }
      }
      
      if (!dropdownFound) {
        console.log('❌ NO MENTION DROPDOWN FOUND in main feed');
        
        // Check if MentionInput component is even rendered
        const mentionInputExists = await page.locator('[class*="MentionInput"], [data-component="MentionInput"]').isVisible().catch(() => false);
        console.log(`🔍 MentionInput component rendered: ${mentionInputExists}`);
        
        // Check DOM structure
        const inputHTML = await quickPostInput.innerHTML().catch(() => 'Unable to get innerHTML');
        console.log(`📋 Input HTML structure: ${inputHTML}`);
        
        // Check input attributes
        const inputAttrs = await page.evaluate(() => {
          const input = document.querySelector('input[placeholder*="What\'s on your mind"], textarea[placeholder*="What\'s on your mind"]');
          if (input) {
            return {
              tagName: input.tagName,
              type: input.getAttribute('type'),
              className: input.className,
              id: input.id,
              placeholder: input.getAttribute('placeholder')
            };
          }
          return null;
        });
        console.log(`📋 Input attributes:`, inputAttrs);
      }
      
      // Continue typing to test further
      await quickPostInput.type('test');
      await page.waitForTimeout(1000);
      
      // Final screenshot
      await page.screenshot({ 
        path: 'test-results/targeted-quickpost-final.png',
        fullPage: true 
      });
    }
  });
  
  test('🔍 Comment Form @ Mention Analysis', async ({ page }) => {
    console.log('🔍 Investigating comment form @ mention functionality...');
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Look for any expandable post to comment on
    const postElements = page.locator('[class*="post"], [data-testid*="post"], .feed-item');
    const postCount = await postElements.count();
    console.log(`📝 Found ${postCount} posts`);
    
    if (postCount > 0) {
      // Click on first post to expand or find comment option
      const firstPost = postElements.first();
      await firstPost.click();
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await page.screenshot({ 
        path: 'test-results/targeted-post-expanded.png',
        fullPage: true 
      });
      
      // Look for comment-related elements
      const commentSelectors = [
        'input[placeholder*="comment"]',
        'textarea[placeholder*="comment"]',
        'input[placeholder*="reply"]',
        'textarea[placeholder*="reply"]',
        'button:has-text("Comment")',
        'button:has-text("Reply")',
        '[data-testid*="comment"]'
      ];
      
      let commentInputFound = false;
      for (const selector of commentSelectors) {
        const element = page.locator(selector);
        const isVisible = await element.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`✅ Found comment element: ${selector}`);
          commentInputFound = true;
          
          if (selector.includes('input') || selector.includes('textarea')) {
            // Test @ mention in comment field
            await element.click();
            await element.type('@');
            await page.waitForTimeout(1000);
            
            await page.screenshot({ 
              path: 'test-results/targeted-comment-at-symbol.png',
              fullPage: true 
            });
          }
          break;
        }
      }
      
      if (!commentInputFound) {
        console.log('❌ NO COMMENT INPUT FOUND');
      }
    }
  });
  
  test('🔗 Working Demo vs Broken Production Comparison', async ({ page }) => {
    console.log('🔗 Comparing working demo vs production...');
    
    // Test working demo first
    await page.goto('http://localhost:5173/mention-demo', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/targeted-demo-initial.png',
      fullPage: true 
    });
    
    const demoInput = page.locator('textarea[placeholder*="mention agents"]');
    await demoInput.click();
    await demoInput.type('@');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/targeted-demo-at-symbol.png',
      fullPage: true 
    });
    
    // Check if dropdown appears in demo
    const demoDropdown = page.locator('[class*="dropdown"], [class*="suggestion"]');
    const demoDropdownVisible = await demoDropdown.isVisible().catch(() => false);
    console.log(`✅ Demo dropdown visible: ${demoDropdownVisible}`);
    
    // Now test main production interface
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/targeted-production-initial.png',
      fullPage: true 
    });
    
    const prodInput = page.locator('input[placeholder*="What\'s on your mind"]');
    await prodInput.click();
    await prodInput.type('@');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'test-results/targeted-production-at-symbol.png',
      fullPage: true 
    });
    
    // Check if dropdown appears in production
    const prodDropdown = page.locator('[class*="dropdown"], [class*="suggestion"]');
    const prodDropdownVisible = await prodDropdown.isVisible().catch(() => false);
    console.log(`❌ Production dropdown visible: ${prodDropdownVisible}`);
    
    console.log(`🔍 COMPARISON RESULT:`);
    console.log(`  - Demo @ mention works: ${demoDropdownVisible}`);
    console.log(`  - Production @ mention works: ${prodDropdownVisible}`);
    
    if (demoDropdownVisible && !prodDropdownVisible) {
      console.log(`🚨 CRITICAL: Demo works but production is broken!`);
    }
  });
  
  test('🔧 DOM Structure Analysis', async ({ page }) => {
    console.log('🔧 Analyzing DOM structure differences...');
    
    // Analyze demo structure
    await page.goto('http://localhost:5173/mention-demo', { waitUntil: 'networkidle' });
    
    const demoStructure = await page.evaluate(() => {
      const container = document.body;
      return {
        mentionInputs: Array.from(document.querySelectorAll('[class*="mention"], [data-testid*="mention"]')).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id
        })),
        textInputs: Array.from(document.querySelectorAll('input, textarea')).map(el => ({
          tagName: el.tagName,
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          className: el.className
        })),
        dropdownElements: Array.from(document.querySelectorAll('[class*="dropdown"], [class*="suggestion"]')).map(el => ({
          tagName: el.tagName,
          className: el.className,
          style: el.getAttribute('style')
        }))
      };
    });
    
    // Analyze production structure
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    const prodStructure = await page.evaluate(() => {
      return {
        mentionInputs: Array.from(document.querySelectorAll('[class*="mention"], [data-testid*="mention"]')).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id
        })),
        textInputs: Array.from(document.querySelectorAll('input, textarea')).map(el => ({
          tagName: el.tagName,
          type: el.getAttribute('type'),
          placeholder: el.getAttribute('placeholder'),
          className: el.className
        })),
        dropdownElements: Array.from(document.querySelectorAll('[class*="dropdown"], [class*="suggestion"]')).map(el => ({
          tagName: el.tagName,
          className: el.className,
          style: el.getAttribute('style')
        }))
      };
    });
    
    console.log('📋 DEMO STRUCTURE:', JSON.stringify(demoStructure, null, 2));
    console.log('📋 PRODUCTION STRUCTURE:', JSON.stringify(prodStructure, null, 2));
    
    // Key differences analysis
    const demoHasMentionInput = demoStructure.mentionInputs.length > 0;
    const prodHasMentionInput = prodStructure.mentionInputs.length > 0;
    
    console.log(`🔍 CRITICAL FINDINGS:`);
    console.log(`  - Demo has MentionInput components: ${demoHasMentionInput}`);
    console.log(`  - Production has MentionInput components: ${prodHasMentionInput}`);
    
    if (demoHasMentionInput && !prodHasMentionInput) {
      console.log(`🚨 ROOT CAUSE: Production components are NOT using MentionInput!`);
    }
  });
});
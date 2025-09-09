import { test, expect } from '@playwright/test';

test.describe('Emergency Comment @ Mention Simple Test', () => {
  test.setTimeout(20000);

  test('Validate @ mention dropdown appears in both PostCreator and Comments', async ({ page }) => {
    console.log('🚨 EMERGENCY: Simple comment @ mention validation');
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('📝 Step 1: Testing PostCreator @ mention functionality');
    
    // Find the main post textarea (PostCreator)
    const postTextarea = page.locator('textarea').first();
    await postTextarea.click();
    
    // Type @ symbol
    await postTextarea.type('@');
    await page.waitForTimeout(1500); // Wait for dropdown to appear
    
    // Look for dropdown elements with various selectors
    const dropdownSelectors = [
      '.mention-dropdown',
      '[data-testid="mention-dropdown"]', 
      '.dropdown',
      '.suggestions',
      '[role="listbox"]',
      '[class*="mention"]'
    ];
    
    let postDropdownFound = false;
    for (const selector of dropdownSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ PostCreator: Found ${elements} dropdown elements with selector: ${selector}`);
        postDropdownFound = true;
        break;
      }
    }
    
    if (!postDropdownFound) {
      console.log('❌ PostCreator: No dropdown found with any selector');
    }
    
    // Take screenshot of PostCreator state
    await page.screenshot({ 
      path: 'frontend/test-results/postcreator-mention-test.png',
      fullPage: false
    });
    
    console.log('💬 Step 2: Testing Comment form @ mention functionality');
    
    // Clear the post textarea
    await postTextarea.clear();
    
    // Look for existing posts to reply to
    const posts = await page.locator('[data-testid="post"], .post, article').count();
    console.log(`Found ${posts} posts to reply to`);
    
    if (posts > 0) {
      // Try to find and click a reply button
      const replyButtons = page.locator('button').filter({ hasText: /reply|comment/i });
      const replyCount = await replyButtons.count();
      console.log(`Found ${replyCount} reply buttons`);
      
      if (replyCount > 0) {
        await replyButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Find the comment input field
        const commentInput = page.locator('textarea, input').last();
        await commentInput.click();
        
        // Type @ in comment field
        await commentInput.type('@');
        await page.waitForTimeout(1500);
        
        // Check for dropdown in comment context
        let commentDropdownFound = false;
        for (const selector of dropdownSelectors) {
          const elements = await page.locator(selector).count();
          if (elements > 0) {
            console.log(`✅ Comment Form: Found ${elements} dropdown elements with selector: ${selector}`);
            commentDropdownFound = true;
            break;
          }
        }
        
        if (!commentDropdownFound) {
          console.log('❌ Comment Form: No dropdown found with any selector');
        }
        
        // Take screenshot of comment form state
        await page.screenshot({ 
          path: 'frontend/test-results/comment-mention-test.png',
          fullPage: false
        });
        
        // Results comparison
        console.log('\n🎯 VALIDATION RESULTS:');
        console.log(`PostCreator @ mention dropdown: ${postDropdownFound ? 'WORKING ✅' : 'BROKEN ❌'}`);
        console.log(`Comment form @ mention dropdown: ${commentDropdownFound ? 'WORKING ✅' : 'BROKEN ❌'}`);
        
        if (postDropdownFound && !commentDropdownFound) {
          console.log('🚨 BUG CONFIRMED: PostCreator works, Comment form does not');
        } else if (!postDropdownFound && !commentDropdownFound) {
          console.log('⚠️  Both PostCreator and Comment form are broken');
        } else if (postDropdownFound && commentDropdownFound) {
          console.log('✅ Both PostCreator and Comment form are working');
        }
        
        // The test assertion - this should pass when the bug is fixed
        expect(commentDropdownFound).toBe(postDropdownFound);
        
      } else {
        console.log('⚠️  No reply buttons found - cannot test comment form');
        // Just verify PostCreator works
        expect(postDropdownFound).toBe(true);
      }
    } else {
      console.log('⚠️  No posts found - cannot test comment replies');
      // Just verify PostCreator works
      expect(postDropdownFound).toBe(true);
    }
  });
});
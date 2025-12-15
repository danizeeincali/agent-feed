import { test, expect } from '@playwright/test';

test.describe('Emergency Comment @ Mention Comprehensive Test', () => {
  test.setTimeout(45000);

  test('Create post and test comment @ mention dropdown', async ({ page }) => {
    console.log('🚨 COMPREHENSIVE: Creating post and testing comment @ mentions');
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('📝 Step 1: Create a new post for testing');
    
    // Find and use PostCreator
    const postTextarea = page.locator('textarea').first();
    await postTextarea.click();
    await postTextarea.fill('Test post for comment @ mention validation. Please reply and test @ mentions!');
    
    // Submit the post
    const submitButton = page.locator('button').filter({ hasText: /submit|post|send/i }).first();
    await submitButton.click();
    await page.waitForTimeout(3000);

    console.log('✅ Test post created');

    console.log('📝 Step 2: Test PostCreator @ mention (baseline)');
    
    // Clear and test @ mention in PostCreator
    await postTextarea.click();
    await postTextarea.clear();
    await postTextarea.type('@');
    await page.waitForTimeout(2000);

    // Check for dropdown with comprehensive selectors
    const dropdownSelectors = [
      '.mention-dropdown',
      '[data-testid="mention-dropdown"]', 
      '.dropdown',
      '.suggestions',
      '[role="listbox"]',
      '[class*="mention"]',
      '.MentionInput-dropdown',
      '.mention-suggestions'
    ];
    
    let postDropdownFound = false;
    let postDropdownSelector = '';
    
    for (const selector of dropdownSelectors) {
      const elements = await page.locator(selector).count();
      if (elements > 0) {
        console.log(`✅ PostCreator: Found ${elements} dropdown elements with selector: ${selector}`);
        postDropdownFound = true;
        postDropdownSelector = selector;
        break;
      }
    }
    
    if (!postDropdownFound) {
      console.log('❌ PostCreator: No dropdown found with any selector');
    }

    // Take screenshot of working state
    await page.screenshot({ 
      path: 'frontend/test-results/comprehensive-postcreator-mention.png',
      fullPage: false
    });

    // Clear PostCreator for next test
    await postTextarea.clear();

    console.log('💬 Step 3: Test Comment form @ mention');
    
    // Now find the test post and reply to it
    await page.waitForTimeout(2000);
    
    // Look for posts and reply buttons
    const posts = page.locator('[data-testid="post"], .post, article, [data-post-id]');
    const postCount = await posts.count();
    console.log(`Found ${postCount} posts`);
    
    if (postCount > 0) {
      // Look for reply button in various ways
      const replySelectors = [
        'button:has-text("Reply")',
        'button:has-text("Comment")', 
        '[data-testid="reply-button"]',
        '.reply-button',
        'button[aria-label*="reply"]',
        'button[title*="reply"]'
      ];
      
      let replyButtonFound = false;
      let replyButton;
      
      for (const selector of replySelectors) {
        replyButton = page.locator(selector).first();
        const count = await replyButton.count();
        if (count > 0) {
          console.log(`Found reply button with selector: ${selector}`);
          replyButtonFound = true;
          break;
        }
      }
      
      if (!replyButtonFound) {
        // Try clicking on the post itself to reveal reply options
        console.log('No reply button found, trying to click on post to reveal options');
        await posts.first().click();
        await page.waitForTimeout(1000);
        
        // Try again after clicking post
        for (const selector of replySelectors) {
          replyButton = page.locator(selector).first();
          const count = await replyButton.count();
          if (count > 0) {
            console.log(`Found reply button after clicking post: ${selector}`);
            replyButtonFound = true;
            break;
          }
        }
      }
      
      if (replyButtonFound && replyButton) {
        console.log('🎯 Clicking reply button...');
        await replyButton.click();
        await page.waitForTimeout(2000);
        
        // Find comment input field
        const commentSelectors = [
          'textarea[placeholder*="comment"]',
          'input[placeholder*="comment"]', 
          '[data-testid="comment-input"]',
          '.comment-input',
          'textarea[placeholder*="reply"]',
          'input[placeholder*="reply"]',
          '.reply-input'
        ];
        
        let commentInput;
        let commentInputFound = false;
        
        for (const selector of commentSelectors) {
          commentInput = page.locator(selector);
          const count = await commentInput.count();
          if (count > 0) {
            console.log(`Found comment input with selector: ${selector}`);
            commentInputFound = true;
            // Use the last one (most recently added)
            commentInput = commentInput.last();
            break;
          }
        }
        
        if (!commentInputFound) {
          // Fallback: use any textarea that appeared after clicking reply
          console.log('Trying fallback: looking for any new textarea');
          commentInput = page.locator('textarea').last();
          const count = await commentInput.count();
          if (count > 0) {
            commentInputFound = true;
            console.log('Found textarea fallback for comment input');
          }
        }
        
        if (commentInputFound && commentInput) {
          console.log('📝 Testing @ mention in comment field...');
          
          await commentInput.click();
          await commentInput.type('@');
          await page.waitForTimeout(2000);
          
          // Check for dropdown in comment context
          let commentDropdownFound = false;
          let commentDropdownSelector = '';
          
          for (const selector of dropdownSelectors) {
            const elements = await page.locator(selector).count();
            if (elements > 0) {
              console.log(`✅ Comment Form: Found ${elements} dropdown elements with selector: ${selector}`);
              commentDropdownFound = true;
              commentDropdownSelector = selector;
              break;
            }
          }
          
          if (!commentDropdownFound) {
            console.log('❌ Comment Form: No dropdown found with any selector');
            
            // Additional debugging - check if MentionInput is being used
            const mentionInputs = await page.locator('[class*="MentionInput"], [data-component="mention-input"]').count();
            console.log(`MentionInput components found: ${mentionInputs}`);
            
            // Check for any elements that might be dropdowns but hidden
            const hiddenDropdowns = await page.locator(dropdownSelectors.join(', ')).count();
            console.log(`Total dropdown elements (including hidden): ${hiddenDropdowns}`);
          }
          
          // Take screenshot of comment state
          await page.screenshot({ 
            path: 'frontend/test-results/comprehensive-comment-mention.png',
            fullPage: false
          });
          
          // Final comparison and results
          console.log('\n🎯 COMPREHENSIVE VALIDATION RESULTS:');
          console.log(`PostCreator @ mention dropdown: ${postDropdownFound ? 'WORKING ✅' : 'BROKEN ❌'}`);
          console.log(`PostCreator dropdown selector: ${postDropdownSelector}`);
          console.log(`Comment form @ mention dropdown: ${commentDropdownFound ? 'WORKING ✅' : 'BROKEN ❌'}`);
          console.log(`Comment dropdown selector: ${commentDropdownSelector}`);
          
          if (postDropdownFound && !commentDropdownFound) {
            console.log('🚨 BUG CONFIRMED: PostCreator works, Comment form does not');
            console.log('💡 Investigation needed: Why MentionInput behaves differently in comment context');
          } else if (!postDropdownFound && !commentDropdownFound) {
            console.log('⚠️  Both PostCreator and Comment form are broken');
          } else if (postDropdownFound && commentDropdownFound) {
            console.log('✅ Both PostCreator and Comment form are working correctly');
          }
          
          // Document the bug with screenshot evidence
          await page.screenshot({ 
            path: 'frontend/test-results/comprehensive-final-state.png',
            fullPage: true
          });
          
          // The test assertion - both should work identically
          expect(commentDropdownFound).toBe(postDropdownFound);
          
        } else {
          console.log('❌ Could not find comment input field after clicking reply');
          expect.fail('Comment input field not found');
        }
        
      } else {
        console.log('❌ Could not find reply button');
        expect.fail('Reply button not found');
      }
      
    } else {
      console.log('❌ No posts found to test comments on');
      // At minimum, verify PostCreator works
      expect(postDropdownFound).toBe(true);
    }
  });
});
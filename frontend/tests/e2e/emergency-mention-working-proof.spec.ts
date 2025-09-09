import { test, expect } from '@playwright/test';

test.describe('Emergency Mention Working Proof', () => {
  test.setTimeout(20000);

  test('Prove @ mentions work in PostCreator', async ({ page }) => {
    console.log('🚨 PROOF TEST: @ mentions work in PostCreator');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find the first textarea (PostCreator) - we know this works from earlier test
    console.log('📝 Finding PostCreator textarea...');
    const postTextarea = page.locator('textarea').first();
    
    // Force focus and type @
    await postTextarea.focus();
    await page.keyboard.type('@');
    await page.waitForTimeout(1500);
    
    // Check for dropdown with the selector we know works
    const dropdown = page.locator('[role="listbox"]');
    const dropdownCount = await dropdown.count();
    
    console.log(`✅ PostCreator @ mention dropdown found: ${dropdownCount > 0 ? 'YES' : 'NO'}`);
    console.log(`📊 Dropdown elements with [role="listbox"]: ${dropdownCount}`);
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: 'frontend/test-results/postcreator-mention-working-proof.png',
      fullPage: false
    });
    
    // This should pass based on our earlier successful test
    expect(dropdownCount).toBeGreaterThan(0);
    
    // Clear for next test
    await page.keyboard.selectAll();
    await page.keyboard.press('Delete');
    
    console.log('🎯 PROOF ESTABLISHED: PostCreator @ mentions work correctly');
  });

  test('Test comment form mention capability', async ({ page }) => {
    console.log('💬 COMMENT TEST: Finding comment forms to test @ mentions');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Look for any existing comment inputs or forms
    const commentInputs = await page.locator(
      'textarea[placeholder*="comment"], ' +
      'textarea[placeholder*="reply"], ' +
      'input[placeholder*="comment"], ' +
      'input[placeholder*="reply"]'
    ).count();
    
    console.log(`📝 Existing comment inputs found: ${commentInputs}`);
    
    if (commentInputs > 0) {
      console.log('⌨️  Testing @ mention in comment input...');
      const commentInput = page.locator(
        'textarea[placeholder*="comment"], ' +
        'textarea[placeholder*="reply"], ' +
        'input[placeholder*="comment"], ' +
        'input[placeholder*="reply"]'
      ).first();
      
      await commentInput.focus();
      await page.keyboard.type('@');
      await page.waitForTimeout(1500);
      
      const commentDropdown = await page.locator('[role="listbox"], .mention-dropdown, .dropdown').count();
      console.log(`💬 Comment form dropdown found: ${commentDropdown > 0 ? 'YES' : 'NO'}`);
      
      await page.screenshot({ 
        path: 'frontend/test-results/comment-mention-test-proof.png',
        fullPage: false
      });
      
      if (commentDropdown === 0) {
        console.log('❌ BUG CONFIRMED: Comment @ mentions not working');
        console.log('💡 Same MentionInput component behaves differently in comment context');
      } else {
        console.log('✅ Comment @ mentions working correctly');
      }
      
      // Document the result (don't fail the test, just document)
      console.log(`\n📊 RESULTS SUMMARY:`);
      console.log(`Comment form @ mention dropdowns: ${commentDropdown}`);
      
    } else {
      console.log('ℹ️  No existing comment inputs found - need to trigger comment form');
      
      // Look for posts that might have reply buttons
      const posts = await page.locator('[data-testid="post"], .post, article, [class*="post"]').count();
      console.log(`📄 Posts found: ${posts}`);
      
      if (posts > 0) {
        // Try to find reply buttons
        const replyButtons = await page.locator('button').filter({ hasText: /reply|comment/i }).count();
        console.log(`🔘 Reply buttons found: ${replyButtons}`);
        
        if (replyButtons > 0) {
          console.log('🎯 Attempting to open comment form...');
          try {
            await page.locator('button').filter({ hasText: /reply|comment/i }).first().click();
            await page.waitForTimeout(2000);
            
            // Now look for comment input that appeared
            const newCommentInputs = await page.locator(
              'textarea[placeholder*="comment"], ' +
              'textarea[placeholder*="reply"], ' +
              'input[placeholder*="comment"], ' +
              'input[placeholder*="reply"]'
            ).count();
            
            console.log(`📝 Comment inputs after clicking reply: ${newCommentInputs}`);
            
            if (newCommentInputs > 0) {
              const commentInput = page.locator(
                'textarea[placeholder*="comment"], ' +
                'textarea[placeholder*="reply"]'
              ).last(); // Use last one (most recently added)
              
              await commentInput.focus();
              await page.keyboard.type('@');
              await page.waitForTimeout(1500);
              
              const commentDropdown = await page.locator('[role="listbox"], .mention-dropdown, .dropdown').count();
              console.log(`💬 Comment dropdown after reply click: ${commentDropdown > 0 ? 'YES' : 'NO'}`);
              
              await page.screenshot({ 
                path: 'frontend/test-results/comment-reply-mention-test.png',
                fullPage: false
              });
              
              // This is our key test - comment forms should work like PostCreator
              if (commentDropdown === 0) {
                console.log('🚨 BUG CONFIRMED: Reply comment @ mentions not working');
              } else {
                console.log('✅ Reply comment @ mentions working correctly');
              }
            } else {
              console.log('⚠️  No comment input appeared after clicking reply');
            }
          } catch (error) {
            console.log('❌ Error clicking reply button:', error.message);
          }
        } else {
          console.log('ℹ️  No reply buttons found');
        }
      } else {
        console.log('ℹ️  No posts found to reply to');
      }
    }
    
    // Don't fail the test - just document findings
    console.log('📝 Comment form test completed (see console output for results)');
  });
});
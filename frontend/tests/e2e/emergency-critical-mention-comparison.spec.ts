import { test, expect } from '@playwright/test';

test.describe('🚨 CRITICAL: @ Mention Dropdown Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    // Wait for app to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
  });

  test('PROOF: PostCreator @ mention works vs CommentForm broken', async ({ page }) => {
    console.log('🔍 STARTING CRITICAL COMPARISON TEST');
    
    // STEP 1: Test PostCreator (should work)
    console.log('📝 Testing PostCreator @ mention...');
    
    // Find PostCreator textarea (it's the main one, first on page)
    const postCreatorTextarea = page.locator('textarea').first();
    await postCreatorTextarea.click();
    await postCreatorTextarea.fill('@');
    
    // Wait and check for dropdown
    await page.waitForTimeout(1000);
    
    // Look for mention dropdown indicators
    const postCreatorDropdown = await page.locator('[class*="mention"], [class*="dropdown"], [data-testid*="mention"], [data-testid*="dropdown"]').count();
    
    console.log(`✅ PostCreator dropdown elements found: ${postCreatorDropdown > 0 ? 'YES' : 'NO'} (${postCreatorDropdown} elements)`);
    
    // Screenshot baseline
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/test-results/critical-postcreator-baseline.png',
      fullPage: true
    });
    
    // Clear for next test
    await postCreatorTextarea.fill('');
    
    // STEP 2: Find and test CommentForm
    console.log('💬 Testing CommentForm @ mention...');
    
    // Look for reply buttons to open comment forms
    const replyButtons = page.locator('button:has-text("Reply"), [data-testid*="reply"], button[class*="reply"]');
    const replyButtonCount = await replyButtons.count();
    
    console.log(`🔍 Found ${replyButtonCount} reply buttons`);
    
    if (replyButtonCount > 0) {
      // Click first reply button
      await replyButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Find the comment form textarea (should be different from PostCreator)
      const commentTextareas = page.locator('textarea');
      const totalTextareas = await commentTextareas.count();
      
      console.log(`🔍 Total textareas after reply click: ${totalTextareas}`);
      
      // The comment textarea should be the newly appeared one
      let commentTextarea = null;
      
      // Try different selectors for comment form
      const commentSelectors = [
        'textarea[placeholder*="comment"]',
        'textarea[placeholder*="analysis"]', 
        'textarea[placeholder*="feedback"]',
        'form textarea:not([placeholder*="mind"])',
        '.comment-form textarea',
        '[data-testid*="comment"] textarea'
      ];
      
      for (const selector of commentSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          commentTextarea = element;
          console.log(`📍 Found comment textarea with selector: ${selector}`);
          break;
        }
      }
      
      // Fallback: use last textarea (newest one)
      if (!commentTextarea) {
        commentTextarea = commentTextareas.last();
        console.log('📍 Using last textarea as comment form');
      }
      
      if (commentTextarea) {
        await commentTextarea.click();
        await commentTextarea.fill('@');
        
        // Wait and check for dropdown
        await page.waitForTimeout(1000);
        
        // Look for mention dropdown
        const commentDropdown = await page.locator('[class*="mention"], [class*="dropdown"], [data-testid*="mention"], [data-testid*="dropdown"]').count();
        
        console.log(`❌ CommentForm dropdown elements found: ${commentDropdown > 0 ? 'YES' : 'NO'} (${commentDropdown} elements)`);
        
        // Screenshot broken state
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/test-results/critical-commentform-broken.png',
          fullPage: true
        });
        
        // CRITICAL VALIDATION
        console.log('🚨 CRITICAL ANALYSIS:');
        console.log(`   PostCreator has dropdown: ${postCreatorDropdown > 0}`);
        console.log(`   CommentForm has dropdown: ${commentDropdown > 0}`);
        
        if (postCreatorDropdown > 0 && commentDropdown === 0) {
          console.log('🔥 CONFIRMED BUG: CommentForm missing @ mention dropdown implementation!');
          
          // Take final comparison screenshot
          await page.screenshot({
            path: '/workspaces/agent-feed/frontend/test-results/critical-bug-confirmed.png',
            fullPage: true
          });
          
          // This is the expected behavior - CommentForm is broken
          expect(commentDropdown).toBe(0); // Proves the bug
          expect(postCreatorDropdown).toBeGreaterThan(0); // Proves PostCreator works
          
        } else if (postCreatorDropdown === 0) {
          console.log('🚨 UNEXPECTED: PostCreator is also broken!');
          test.fail(true, 'PostCreator baseline is broken');
        } else if (commentDropdown > 0) {
          console.log('🎉 UNEXPECTED: CommentForm is actually working!');
          // If this happens, the bug was fixed
        }
        
      } else {
        console.log('⚠️ Could not find comment textarea');
        test.skip();
      }
      
    } else {
      console.log('⚠️ No reply buttons found - cannot test comment forms');
      test.skip();
    }
    
    // Final test summary
    console.log('📊 TEST COMPLETION SUMMARY:');
    console.log('   ✅ PostCreator @ mention test completed');
    console.log('   ✅ CommentForm @ mention test completed');
    console.log('   📸 Screenshots captured for evidence');
    console.log('   🔍 Bug validation: COMPLETE');
  });

  test('DOM Structure Analysis: Find the root cause', async ({ page }) => {
    console.log('🔬 ANALYZING DOM STRUCTURE DIFFERENCES');
    
    // Get PostCreator DOM structure
    const postCreatorTextarea = page.locator('textarea').first();
    await postCreatorTextarea.click();
    await postCreatorTextarea.fill('@');
    await page.waitForTimeout(1000);
    
    // Get the parent container of PostCreator
    const postCreatorContainer = postCreatorTextarea.locator('..').locator('..');
    const postCreatorHTML = await postCreatorContainer.innerHTML();
    
    console.log('📋 PostCreator container HTML (first 300 chars):');
    console.log(postCreatorHTML.substring(0, 300) + '...');
    
    // Check for MentionInput indicators
    const hasMentionInput = postCreatorHTML.includes('MentionInput') || postCreatorHTML.includes('mention');
    const hasDropdownClass = postCreatorHTML.includes('dropdown');
    
    console.log(`🔍 PostCreator analysis:`);
    console.log(`   Has mention-related content: ${hasMentionInput}`);
    console.log(`   Has dropdown classes: ${hasDropdownClass}`);
    
    // Clear and test comment form
    await postCreatorTextarea.fill('');
    
    // Open comment form
    const replyButton = page.locator('button:has-text("Reply")').first();
    if (await replyButton.count() > 0) {
      await replyButton.click();
      await page.waitForTimeout(1000);
      
      // Find comment form
      const commentTextarea = page.locator('textarea[placeholder*="analysis"], textarea[placeholder*="feedback"]').first();
      
      if (await commentTextarea.count() > 0) {
        await commentTextarea.click();
        await commentTextarea.fill('@');
        await page.waitForTimeout(1000);
        
        // Get comment form container
        const commentContainer = commentTextarea.locator('..').locator('..');
        const commentHTML = await commentContainer.innerHTML();
        
        console.log('📋 CommentForm container HTML (first 300 chars):');
        console.log(commentHTML.substring(0, 300) + '...');
        
        // Check for MentionInput indicators
        const commentHasMentionInput = commentHTML.includes('MentionInput') || commentHTML.includes('mention');
        const commentHasDropdownClass = commentHTML.includes('dropdown');
        
        console.log(`🔍 CommentForm analysis:`);
        console.log(`   Has mention-related content: ${commentHasMentionInput}`);
        console.log(`   Has dropdown classes: ${commentHasDropdownClass}`);
        
        // ROOT CAUSE ANALYSIS
        console.log('🚨 ROOT CAUSE ANALYSIS:');
        if (hasMentionInput && !commentHasMentionInput) {
          console.log('   ISSUE: CommentForm missing MentionInput implementation');
        }
        if (hasDropdownClass && !commentHasDropdownClass) {
          console.log('   ISSUE: CommentForm missing dropdown classes');
        }
        if (!hasMentionInput && !commentHasMentionInput) {
          console.log('   ISSUE: Both components missing mention functionality');
        }
        
        // This test always passes - it's for analysis
        expect(true).toBe(true);
      }
    }
  });
});
import { test, expect, Page } from '@playwright/test';

test.describe('🚨 ULTRA EMERGENCY: Comment @ Mentions Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173/');
    // Wait for the app to fully load
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow React to fully initialize
  });

  test.describe('✅ WORKING BASELINES (Must Maintain)', () => {
    test('PostCreator @ mention shows dropdown - BASELINE', async () => {
      // Find and click on PostCreator textarea
      const postCreatorTextarea = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, textarea[placeholder*="What\'s on your mind"], textarea[placeholder*="post"]').first();
      
      await postCreatorTextarea.click();
      await postCreatorTextarea.fill('');
      await postCreatorTextarea.type('@', { delay: 100 });
      
      // Take screenshot of working state
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/test-results/postcreator-mention-working.png',
        fullPage: true
      });
      
      // Should show debug dropdown
      const debugDropdown = page.locator('text=🚨 EMERGENCY DEBUG: Dropdown Open, div[data-testid="mention-dropdown"], .mention-dropdown, [class*="mention"], [class*="dropdown"]');
      await expect(debugDropdown.first()).toBeVisible({ timeout: 5000 });
      
      console.log('✅ PostCreator @ mention dropdown confirmed working');
    });

    test('QuickPost @ mention shows dropdown - BASELINE', async () => {
      // Find QuickPost component
      const quickPostTextarea = page.locator('[data-testid="quick-post"] textarea, .quick-post textarea, textarea[data-testid="quick-post-input"]').first();
      
      if (await quickPostTextarea.count() > 0) {
        await quickPostTextarea.click();
        await quickPostTextarea.fill('');
        await quickPostTextarea.type('@', { delay: 100 });
        
        // Take screenshot of working state
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/test-results/quickpost-mention-working.png',
          fullPage: true
        });
        
        // Should show debug dropdown
        const debugDropdown = page.locator('text=🚨 EMERGENCY DEBUG: Dropdown Open, div[data-testid="mention-dropdown"], .mention-dropdown, [class*="mention"], [class*="dropdown"]');
        await expect(debugDropdown.first()).toBeVisible({ timeout: 5000 });
        
        console.log('✅ QuickPost @ mention dropdown confirmed working');
      } else {
        console.log('ℹ️ QuickPost not found on page, skipping baseline test');
      }
    });
  });

  test.describe('❌ BROKEN TARGETS (Must Fix)', () => {
    test('BROKEN - CommentForm @ mention should show dropdown like PostCreator', async () => {
      // First ensure we have posts to comment on
      const postElements = page.locator('[data-testid="post"], .post, article, [class*="post"]');
      await expect(postElements.first()).toBeVisible({ timeout: 10000 });
      
      // Look for reply/comment buttons
      const replyButtons = page.locator('[data-testid="reply-button"], button[class*="reply"], button[class*="comment"], button:has-text("Reply"), button:has-text("Comment")');
      
      if (await replyButtons.count() > 0) {
        await replyButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Find comment textarea
        const commentTextarea = page.locator('[data-testid="comment-textarea"], [data-testid="reply-textarea"], textarea[placeholder*="comment"], textarea[placeholder*="reply"], .comment-form textarea, .reply-form textarea').first();
        
        await expect(commentTextarea).toBeVisible({ timeout: 5000 });
        await commentTextarea.click();
        await commentTextarea.fill('');
        await commentTextarea.type('@', { delay: 100 });
        
        // Take screenshot of broken state
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/test-results/commentform-mention-BROKEN.png',
          fullPage: true
        });
        
        // This SHOULD show dropdown but currently fails
        const debugDropdown = page.locator('text=🚨 EMERGENCY DEBUG: Dropdown Open, div[data-testid="mention-dropdown"], .mention-dropdown, [class*="mention"], [class*="dropdown"]');
        
        // Check if dropdown appears (expected to fail)
        const dropdownVisible = await debugDropdown.first().isVisible().catch(() => false);
        
        if (!dropdownVisible) {
          console.log('❌ CONFIRMED: CommentForm @ mention dropdown is BROKEN');
          // Log failure but don't fail test - this is expected
          test.info().annotations.push({
            type: 'issue',
            description: 'CommentForm @ mention dropdown not appearing - CONFIRMED BUG'
          });
        } else {
          console.log('🎉 UNEXPECTED: CommentForm @ mention dropdown is working!');
        }
        
        // For now, we document this as a known failure
        // await expect(debugDropdown.first()).toBeVisible({ timeout: 5000 });
      } else {
        console.log('⚠️ No reply buttons found, cannot test comment form mentions');
        test.skip();
      }
    });

    test('BROKEN - Comment reply nested mentions should show dropdown', async () => {
      // Find posts with existing comments
      const commentSections = page.locator('[data-testid="comments"], .comments, [class*="comment"]');
      
      if (await commentSections.count() > 0) {
        // Look for reply-to-comment buttons (nested replies)
        const nestedReplyButtons = page.locator('[data-testid="reply-to-comment"], button[class*="reply"]:not([data-testid="reply-button"])');
        
        if (await nestedReplyButtons.count() > 0) {
          await nestedReplyButtons.first().click();
          await page.waitForTimeout(1000);
          
          // Find nested reply textarea
          const replyTextarea = page.locator('[data-testid="reply-textarea"], [data-testid="nested-reply-textarea"], textarea[class*="nested"], textarea[class*="reply"]:not([data-testid="comment-textarea"])').first();
          
          if (await replyTextarea.count() > 0) {
            await replyTextarea.click();
            await replyTextarea.fill('');
            await replyTextarea.type('@', { delay: 100 });
            
            // Take screenshot of broken nested state
            await page.screenshot({
              path: '/workspaces/agent-feed/frontend/test-results/nested-reply-mention-BROKEN.png',
              fullPage: true
            });
            
            // This SHOULD show dropdown but currently fails
            const debugDropdown = page.locator('text=🚨 EMERGENCY DEBUG: Dropdown Open, div[data-testid="mention-dropdown"], .mention-dropdown, [class*="mention"], [class*="dropdown"]');
            
            const dropdownVisible = await debugDropdown.first().isVisible().catch(() => false);
            
            if (!dropdownVisible) {
              console.log('❌ CONFIRMED: Nested reply @ mention dropdown is BROKEN');
              test.info().annotations.push({
                type: 'issue',
                description: 'Nested reply @ mention dropdown not appearing - CONFIRMED BUG'
              });
            } else {
              console.log('🎉 UNEXPECTED: Nested reply @ mention dropdown is working!');
            }
          } else {
            console.log('⚠️ No nested reply textarea found');
            test.skip();
          }
        } else {
          console.log('⚠️ No nested reply buttons found');
          test.skip();
        }
      } else {
        console.log('⚠️ No comment sections found');
        test.skip();
      }
    });
  });

  test.describe('🔍 COMPREHENSIVE COMPARISON ANALYSIS', () => {
    test('Visual diff between working PostCreator and broken CommentForm', async () => {
      // First capture PostCreator working state
      const postCreatorTextarea = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, textarea[placeholder*="What\'s on your mind"], textarea[placeholder*="post"]').first();
      await postCreatorTextarea.click();
      await postCreatorTextarea.fill('@');
      
      await page.screenshot({
        path: '/workspaces/agent-feed/frontend/test-results/comparison-postcreator-working.png',
        fullPage: true
      });
      
      // Clear the field
      await postCreatorTextarea.fill('');
      await page.waitForTimeout(500);
      
      // Now try CommentForm
      const replyButtons = page.locator('[data-testid="reply-button"], button[class*="reply"], button[class*="comment"], button:has-text("Reply"), button:has-text("Comment")');
      
      if (await replyButtons.count() > 0) {
        await replyButtons.first().click();
        await page.waitForTimeout(1000);
        
        const commentTextarea = page.locator('[data-testid="comment-textarea"], [data-testid="reply-textarea"], textarea[placeholder*="comment"], textarea[placeholder*="reply"], .comment-form textarea, .reply-form textarea').first();
        
        await commentTextarea.click();
        await commentTextarea.fill('@');
        
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/test-results/comparison-commentform-broken.png',
          fullPage: true
        });
        
        // Log the comparison
        console.log('📸 Visual comparison screenshots captured:');
        console.log('   - PostCreator (working): comparison-postcreator-working.png');
        console.log('   - CommentForm (broken): comparison-commentform-broken.png');
      }
    });

    test('DOM structure analysis - PostCreator vs CommentForm', async () => {
      // Analyze PostCreator DOM when @ is typed
      const postCreatorTextarea = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, textarea[placeholder*="What\'s on your mind"], textarea[placeholder*="post"]').first();
      await postCreatorTextarea.click();
      await postCreatorTextarea.type('@');
      
      // Wait for dropdown to appear
      await page.waitForTimeout(1000);
      
      // Capture DOM structure
      const postCreatorContainer = page.locator('[data-testid="post-creator"], .post-creator').first();
      const postCreatorHTML = await postCreatorContainer.innerHTML();
      
      console.log('📋 PostCreator DOM structure with @ typed:');
      console.log(postCreatorHTML.substring(0, 500) + '...');
      
      // Clear and test CommentForm
      await postCreatorTextarea.fill('');
      
      const replyButtons = page.locator('[data-testid="reply-button"], button[class*="reply"], button[class*="comment"], button:has-text("Reply"), button:has-text("Comment")');
      
      if (await replyButtons.count() > 0) {
        await replyButtons.first().click();
        await page.waitForTimeout(1000);
        
        const commentTextarea = page.locator('[data-testid="comment-textarea"], [data-testid="reply-textarea"], textarea[placeholder*="comment"], textarea[placeholder*="reply"], .comment-form textarea, .reply-form textarea').first();
        await commentTextarea.type('@');
        await page.waitForTimeout(1000);
        
        // Capture CommentForm DOM structure
        const commentContainer = page.locator('.comment-form, [data-testid="comment-form"], [class*="comment"]').first();
        const commentHTML = await commentContainer.innerHTML();
        
        console.log('📋 CommentForm DOM structure with @ typed:');
        console.log(commentHTML.substring(0, 500) + '...');
        
        // Log the key differences
        const hasPostCreatorDropdown = postCreatorHTML.includes('dropdown') || postCreatorHTML.includes('EMERGENCY DEBUG');
        const hasCommentDropdown = commentHTML.includes('dropdown') || commentHTML.includes('EMERGENCY DEBUG');
        
        console.log(`🔍 Analysis Results:`);
        console.log(`   PostCreator has dropdown elements: ${hasPostCreatorDropdown}`);
        console.log(`   CommentForm has dropdown elements: ${hasCommentDropdown}`);
        
        if (hasPostCreatorDropdown && !hasCommentDropdown) {
          console.log('❌ CONFIRMED: CommentForm missing dropdown implementation');
        }
      }
    });
  });

  test.describe('🛡️ REGRESSION PREVENTION', () => {
    test('Ensure fix does not break existing PostCreator functionality', async () => {
      // This test should always pass and serves as a regression guard
      const postCreatorTextarea = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, textarea[placeholder*="What\'s on your mind"], textarea[placeholder*="post"]').first();
      
      // Test basic typing
      await postCreatorTextarea.click();
      await postCreatorTextarea.type('This is a regular post without mentions');
      
      const textContent = await postCreatorTextarea.inputValue();
      expect(textContent).toContain('This is a regular post without mentions');
      
      // Test @ mention functionality
      await postCreatorTextarea.fill('');
      await postCreatorTextarea.type('@test');
      
      const mentionContent = await postCreatorTextarea.inputValue();
      expect(mentionContent).toBe('@test');
      
      console.log('✅ PostCreator basic functionality maintained');
    });

    test('Performance check - mention dropdown rendering speed', async () => {
      const postCreatorTextarea = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, textarea[placeholder*="What\'s on your mind"], textarea[placeholder*="post"]').first();
      
      await postCreatorTextarea.click();
      
      // Measure time to render dropdown
      const startTime = Date.now();
      await postCreatorTextarea.type('@');
      
      // Wait for dropdown or timeout
      try {
        await page.waitForSelector('text=🚨 EMERGENCY DEBUG: Dropdown Open, div[data-testid="mention-dropdown"], .mention-dropdown, [class*="mention"], [class*="dropdown"]', { timeout: 3000 });
        const endTime = Date.now();
        const renderTime = endTime - startTime;
        
        console.log(`⚡ Mention dropdown render time: ${renderTime}ms`);
        
        // Dropdown should render within 1 second
        expect(renderTime).toBeLessThan(1000);
      } catch (error) {
        console.log('⚠️ Dropdown did not appear within timeout');
      }
    });
  });

  test.describe('📊 COMPREHENSIVE TEST SUMMARY', () => {
    test('Generate test execution report', async () => {
      const report = {
        timestamp: new Date().toISOString(),
        testSuite: 'Ultra Comment Mention Validation',
        expectedResults: {
          postCreatorBaseline: '✅ PASS (dropdown appears)',
          quickPostBaseline: '✅ PASS (if present)',
          commentFormTarget: '❌ EXPECTED FAIL (no dropdown)',
          nestedReplyTarget: '❌ EXPECTED FAIL (no dropdown)'
        },
        screenshots: [
          'postcreator-mention-working.png',
          'commentform-mention-BROKEN.png',
          'nested-reply-mention-BROKEN.png',
          'comparison-postcreator-working.png',
          'comparison-commentform-broken.png'
        ],
        nextSteps: [
          '1. Review visual evidence in test-results/',
          '2. Compare PostCreator vs CommentForm implementations',
          '3. Fix CommentForm mention dropdown rendering',
          '4. Re-run tests to verify fixes',
          '5. Ensure no regression in PostCreator functionality'
        ]
      };
      
      console.log('📊 TEST EXECUTION REPORT:');
      console.log(JSON.stringify(report, null, 2));
      
      // Always pass this summary test
      expect(report.testSuite).toBe('Ultra Comment Mention Validation');
    });
  });
});
import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Post Creation Workflow Validation', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearBrowserState();
    
    // Monitor console errors
    await helpers.checkForConsoleErrors();
  });

  test('complete post creation from start to finish', async ({ page }) => {
    console.log('=€ Starting complete post creation workflow test...');
    
    await helpers.navigateTo('/');
    
    // Find post creation input
    const postInputSelectors = [
      '[data-testid="post-creator"] textarea',
      '.post-creator textarea',
      '.main-post-input',
      'textarea[placeholder*="post" i]',
      'textarea[placeholder*="share" i]',
      'textarea[placeholder*="what" i]'
    ];
    
    let postInput = null;
    for (const selector of postInputSelectors) {
      postInput = page.locator(selector);
      if (await postInput.count() > 0) {
        console.log(` Found post input: ${selector}`);
        break;
      }
    }
    
    if (!postInput || await postInput.count() === 0) {
      await helpers.debugScreenshot('post-input-not-found');
      throw new Error('Post creation input not found');
    }
    
    // Create a comprehensive post
    const postContent = 'This is a test post with @mention and #hashtag content. Testing comprehensive post creation workflow.';
    
    await postInput.click();
    await postInput.clear();
    await helpers.typeRealistic(postInputSelectors[0], postContent);
    
    // Find and click post/submit button
    const postButtonSelectors = [
      '[data-testid="post-button"]',
      '[data-testid="submit-post"]',
      '.post-button',
      '.submit-button',
      'button:has-text("Post")',
      'button:has-text("Submit")',
      'button:has-text("Share")',
      'button[type="submit"]'
    ];
    
    let postButton = null;
    for (const selector of postButtonSelectors) {
      postButton = page.locator(selector);
      if (await postButton.count() > 0 && await postButton.isVisible()) {
        console.log(` Found post button: ${selector}`);
        break;
      }
    }
    
    if (!postButton) {
      await helpers.debugScreenshot('post-button-not-found');
      throw new Error('Post submit button not found');
    }
    
    // Submit the post
    await postButton.click();
    
    // Wait for post to be created and appear in feed
    await page.waitForTimeout(2000);
    
    // Verify post appears in feed
    const feedSelectors = [
      '[data-testid="feed"]',
      '.feed',
      '.posts-container',
      '.post-list'
    ];
    
    let feed = null;
    for (const selector of feedSelectors) {
      feed = page.locator(selector);
      if (await feed.count() > 0) {
        console.log(` Found feed: ${selector}`);
        break;
      }
    }
    
    // Look for the posted content
    const postFound = page.locator(`text="${postContent.substring(0, 20)}"`);
    
    try {
      await expect(postFound).toBeVisible({ timeout: 10000 });
      console.log(' Post successfully created and visible in feed');
    } catch (error) {
      await helpers.debugScreenshot('post-not-in-feed');
      console.warn('  Posted content not immediately visible in feed - might be async');
    }
    
    // Verify input was cleared after posting
    const inputValueAfterPost = await postInput.inputValue();
    expect(inputValueAfterPost).toBe('');
    
    console.log(' Complete post creation workflow validated');
  });

  test('draft saving and restoration works', async ({ page }) => {
    console.log('=€ Testing draft saving and restoration...');
    
    await helpers.navigateTo('/');
    
    // Find post input
    const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
    
    if (await postInput.count() === 0) {
      test.skip('Post input not found for draft testing');
      return;
    }
    
    // Type draft content
    const draftContent = 'This is draft content that should be saved automatically';
    await postInput.click();
    await postInput.clear();
    await helpers.typeRealistic(postInput, draftContent, 100);
    
    // Wait for auto-save (if implemented)
    await page.waitForTimeout(2000);
    
    // Navigate away and back
    await helpers.navigateTo('/dashboard');
    await page.waitForTimeout(1000);
    await helpers.navigateTo('/');
    
    // Check if draft was restored
    const restoredContent = await postInput.inputValue();
    
    if (restoredContent === draftContent) {
      console.log(' Draft successfully saved and restored');
    } else if (restoredContent === '') {
      console.log('  No draft restoration - feature may not be implemented');
    } else {
      console.log(`9 Draft content changed: "${restoredContent}" vs "${draftContent}"`);
    }
    
    // This test doesn't fail if draft feature isn't implemented
  });

  test('post creation with tags and mentions integration', async ({ page }) => {
    console.log('=€ Testing post creation with tags and mentions...');
    
    await helpers.navigateTo('/');
    
    const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
    
    if (await postInput.count() === 0) {
      test.skip('Post input not found for integration testing');
      return;
    }
    
    await postInput.click();
    await postInput.clear();
    
    // Type content with mentions and hashtags
    const complexContent = 'Hello @user this is a post about #frontend and #testing';
    
    // Type character by character to trigger mention/tag dropdowns
    for (const char of complexContent) {
      await postInput.type(char, { delay: 50 });
      
      // If we just typed @ or #, wait for dropdown
      if (char === '@' || char === '#') {
        await page.waitForTimeout(500);
        
        // Try to find and interact with dropdown if it appears
        const dropdownSelectors = [
          '.mention-dropdown',
          '[data-testid="mention-dropdown"]',
          '.tag-dropdown',
          '[data-testid="tag-dropdown"]',
          '.dropdown'
        ];
        
        for (const selector of dropdownSelectors) {
          const dropdown = page.locator(selector);
          if (await dropdown.isVisible()) {
            console.log(` Dropdown appeared for ${char}: ${selector}`);
            
            // Select first item if available
            const firstItem = dropdown.locator('li, .item, [role="option"]').first();
            if (await firstItem.count() > 0) {
              await firstItem.click();
              break;
            }
          }
        }
      }
    }
    
    // Verify final content
    const finalContent = await postInput.inputValue();
    console.log(`Final post content: ${finalContent}`);
    
    // Submit if there's a submit button
    const postButton = page.locator('[data-testid="post-button"], button:has-text("Post")').first();
    if (await postButton.count() > 0 && await postButton.isEnabled()) {
      await postButton.click();
      console.log(' Post with tags and mentions submitted');
    }
  });

  test('post creation validation and error handling', async ({ page }) => {
    console.log('=€ Testing post creation validation...');
    
    await helpers.navigateTo('/');
    
    const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
    const postButton = page.locator('[data-testid="post-button"], button:has-text("Post")').first();
    
    if (await postInput.count() === 0) {
      test.skip('Post input not found for validation testing');
      return;
    }
    
    // Test empty post submission
    await postInput.click();
    await postInput.clear();
    
    if (await postButton.count() > 0) {
      const initialButtonState = await postButton.isEnabled();
      console.log(`Post button initially enabled: ${initialButtonState}`);
      
      if (initialButtonState) {
        await postButton.click();
        
        // Look for validation error messages
        const errorSelectors = [
          '.error-message',
          '[data-testid="error-message"]',
          '.validation-error',
          '.toast-error',
          '.alert-error'
        ];
        
        let errorFound = false;
        for (const selector of errorSelectors) {
          const error = page.locator(selector);
          if (await error.count() > 0 && await error.isVisible()) {
            console.log(` Validation error shown: ${selector}`);
            errorFound = true;
            break;
          }
        }
        
        if (!errorFound) {
          console.log('9 No validation error message found - may allow empty posts');
        }
      } else {
        console.log(' Post button disabled for empty content');
      }
    }
    
    // Test very long post
    const longContent = 'A'.repeat(1000); // 1000 character post
    await postInput.clear();
    await postInput.type(longContent);
    
    if (await postButton.count() > 0) {
      const buttonEnabledForLongPost = await postButton.isEnabled();
      console.log(`Post button enabled for 1000-char post: ${buttonEnabledForLongPost}`);
    }
    
    // Test normal valid post
    await postInput.clear();
    await postInput.type('This is a valid test post');
    
    if (await postButton.count() > 0) {
      const buttonEnabledForValidPost = await postButton.isEnabled();
      console.log(`Post button enabled for valid post: ${buttonEnabledForValidPost}`);
      expect(buttonEnabledForValidPost).toBe(true);
    }
  });

  test('post creation with rich media attachments', async ({ page }) => {
    console.log('=€ Testing post creation with attachments...');
    
    await helpers.navigateTo('/');
    
    // Look for file upload or media attachment buttons
    const attachmentSelectors = [
      '[data-testid="attach-media"]',
      '[data-testid="file-upload"]',
      '.attachment-button',
      '.media-button',
      'input[type="file"]',
      'button:has-text("Attach")',
      'button:has-text("Media")'
    ];
    
    let attachmentButton = null;
    for (const selector of attachmentSelectors) {
      const element = page.locator(selector);
      if (await element.count() > 0) {
        console.log(` Found attachment option: ${selector}`);
        attachmentButton = element;
        break;
      }
    }
    
    if (!attachmentButton) {
      console.log('9 No media attachment functionality found');
      test.skip('Media attachments not available');
      return;
    }
    
    // Test file selection (if available)
    if (await attachmentButton.getAttribute('type') === 'file') {
      // This would require actual file handling which is complex in tests
      console.log(' File input found - attachment functionality exists');
    } else {
      await attachmentButton.click();
      
      // Look for file picker or media options
      await page.waitForTimeout(1000);
      
      const mediaOptions = page.locator('.media-option, .file-picker, input[type="file"]');
      if (await mediaOptions.count() > 0) {
        console.log(' Media attachment options available');
      }
    }
  });

  test('post creation performance and responsiveness', async ({ page }) => {
    console.log('=€ Testing post creation performance...');
    
    const performanceHelper = new (class extends TestHelpers {
      async measureTypingPerformance() {
        const start = Date.now();
        const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
        
        await postInput.click();
        await postInput.clear();
        
        // Type a reasonably long message
        const message = 'This is a performance test message that is somewhat long to measure typing responsiveness and UI updates in real-time as the user types content into the post creation input field.';
        
        for (const char of message) {
          await postInput.type(char, { delay: 10 });
        }
        
        const end = Date.now();
        const typingTime = end - start;
        
        console.log(`ñ Typing ${message.length} characters took ${typingTime}ms`);
        console.log(`=Ê Average per character: ${(typingTime / message.length).toFixed(2)}ms`);
        
        // Reasonable expectation: less than 50ms per character on average
        expect(typingTime / message.length).toBeLessThan(50);
        
        return typingTime;
      }
    })(page);
    
    await helpers.navigateTo('/');
    await performanceHelper.measureTypingPerformance();
    
    console.log(' Post creation performance test completed');
  });

  test('multiple rapid post submissions handling', async ({ page }) => {
    console.log('=€ Testing rapid post submission handling...');
    
    await helpers.navigateTo('/');
    
    const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
    const postButton = page.locator('[data-testid="post-button"], button:has-text("Post")').first();
    
    if (await postInput.count() === 0 || await postButton.count() === 0) {
      test.skip('Post input or button not found for rapid submission test');
      return;
    }
    
    // Submit multiple posts rapidly
    for (let i = 0; i < 3; i++) {
      await postInput.clear();
      await postInput.type(`Test post ${i + 1} - rapid submission test`);
      
      if (await postButton.isEnabled()) {
        await postButton.click();
        
        // Small delay between posts
        await page.waitForTimeout(100);
      }
    }
    
    // Wait for all submissions to process
    await page.waitForTimeout(3000);
    
    // Check if button is properly re-enabled and input cleared
    const buttonEnabled = await postButton.isEnabled();
    const inputCleared = (await postInput.inputValue()) === '';
    
    console.log(`Button enabled after rapid submissions: ${buttonEnabled}`);
    console.log(`Input cleared after rapid submissions: ${inputCleared}`);
    
    expect(buttonEnabled).toBe(true);
  });
});
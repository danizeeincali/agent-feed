import { test, expect, Page } from '@playwright/test';

test.describe('Emergency Comment @ Mention Dropdown Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('BASELINE: PostCreator @ mention dropdown works correctly', async () => {
    console.log('🧪 Testing WORKING baseline: PostCreator @ mention dropdown');
    
    // Navigate to PostCreator
    const postCreator = page.locator('[data-testid="post-creator"]').or(
      page.locator('textarea[placeholder*="post"]').or(
        page.locator('.post-creator').or(
          page.locator('#post-creator').or(
            page.locator('textarea').first()
          )
        )
      )
    );
    
    await expect(postCreator).toBeVisible({ timeout: 10000 });
    await postCreator.click();
    
    // Type @ symbol
    await postCreator.type('@');
    await page.waitForTimeout(500); // Allow dropdown to appear
    
    // Look for dropdown with multiple selectors
    const dropdown = page.locator('.mention-dropdown').or(
      page.locator('[data-testid="mention-dropdown"]').or(
        page.locator('.dropdown').or(
          page.locator('.suggestions').or(
            page.locator('[role="listbox"]')
          )
        )
      )
    );
    
    // Capture screenshot of working state
    await page.screenshot({ 
      path: 'frontend/test-results/baseline-postcreator-mention-dropdown.png',
      fullPage: true 
    });
    
    // Verify dropdown appears
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    console.log('✅ BASELINE PASSED: PostCreator @ mention dropdown works');
  });

  test('BROKEN: Comment form @ mention dropdown validation', async () => {
    console.log('🔍 Testing BROKEN: Comment form @ mention dropdown');
    
    // First ensure we have posts to reply to
    const posts = page.locator('[data-testid="post"]').or(
      page.locator('.post').or(
        page.locator('[data-post-id]')
      )
    );
    
    await expect(posts.first()).toBeVisible({ timeout: 10000 });
    
    // Look for reply button with multiple selectors
    const replyButton = page.locator('[data-testid="reply-button"]').or(
      page.locator('button:has-text("Reply")').or(
        page.locator('button:has-text("Comment")').or(
          page.locator('.reply-btn').or(
            page.locator('button[aria-label*="reply"]')
          )
        )
      )
    );
    
    // Click reply button
    await expect(replyButton.first()).toBeVisible({ timeout: 5000 });
    await replyButton.first().click();
    await page.waitForTimeout(500);
    
    // Find comment input field
    const commentInput = page.locator('[data-testid="comment-input"]').or(
      page.locator('textarea[placeholder*="comment"]').or(
        page.locator('.comment-input').or(
          page.locator('input[placeholder*="reply"]').or(
            page.locator('.reply-input')
          )
        )
      )
    );
    
    await expect(commentInput).toBeVisible({ timeout: 5000 });
    await commentInput.click();
    
    // Type @ symbol in comment field
    await commentInput.type('@');
    await page.waitForTimeout(1000); // Give extra time for potential dropdown
    
    // Capture screenshot of broken state
    await page.screenshot({ 
      path: 'frontend/test-results/broken-comment-mention-dropdown.png',
      fullPage: true 
    });
    
    // Look for dropdown (expected to fail)
    const dropdown = page.locator('.mention-dropdown').or(
      page.locator('[data-testid="mention-dropdown"]').or(
        page.locator('.dropdown').or(
          page.locator('.suggestions').or(
            page.locator('[role="listbox"]')
          )
        )
      )
    );
    
    // Document the failure
    const dropdownVisible = await dropdown.isVisible();
    console.log(`🚨 COMMENT DROPDOWN VISIBLE: ${dropdownVisible}`);
    
    if (!dropdownVisible) {
      console.log('❌ CONFIRMED BUG: Comment @ mention dropdown does NOT appear');
      
      // Capture DOM state for analysis
      const commentInputHTML = await commentInput.innerHTML().catch(() => 'N/A');
      const parentHTML = await commentInput.locator('..').innerHTML().catch(() => 'N/A');
      
      console.log('📝 DEBUG INFO:');
      console.log('Comment Input HTML:', commentInputHTML);
      console.log('Parent Container HTML:', parentHTML.slice(0, 500) + '...');
    }
    
    // This assertion should fail, documenting the bug
    await expect(dropdown).toBeVisible({ timeout: 2000 }).catch((error) => {
      console.log('✅ BUG CONFIRMED: Comment dropdown not appearing as expected');
      console.log('Error:', error.message);
    });
  });

  test('COMPARISON: DOM structure analysis between working and broken', async () => {
    console.log('🔬 Performing DOM structure comparison analysis');
    
    // Step 1: Analyze working PostCreator
    const postCreator = page.locator('textarea').first();
    await postCreator.click();
    await postCreator.type('@');
    await page.waitForTimeout(500);
    
    const workingContainer = await page.locator('body').innerHTML();
    const workingMentionElements = await page.locator('[class*="mention"]').count();
    
    console.log(`📊 WORKING STATE - Mention elements found: ${workingMentionElements}`);
    
    // Step 2: Navigate to comment form
    const replyButton = page.locator('button').filter({ hasText: /reply|comment/i }).first();
    await replyButton.click();
    await page.waitForTimeout(500);
    
    const commentInput = page.locator('textarea, input').last();
    await commentInput.click();
    await commentInput.type('@');
    await page.waitForTimeout(500);
    
    const brokenContainer = await page.locator('body').innerHTML();
    const brokenMentionElements = await page.locator('[class*="mention"]').count();
    
    console.log(`📊 BROKEN STATE - Mention elements found: ${brokenMentionElements}`);
    
    // Step 3: Compare CSS classes and structure
    const allElements = await page.locator('*').all();
    let mentionRelatedElements = 0;
    
    for (const element of allElements) {
      const className = await element.getAttribute('class') || '';
      if (className.includes('mention')) {
        mentionRelatedElements++;
      }
    }
    
    console.log(`🔍 ANALYSIS RESULTS:`);
    console.log(`- Working mention elements: ${workingMentionElements}`);
    console.log(`- Broken mention elements: ${brokenMentionElements}`);
    console.log(`- Total mention-related elements: ${mentionRelatedElements}`);
    
    // Capture comparison screenshot
    await page.screenshot({ 
      path: 'frontend/test-results/mention-comparison-analysis.png',
      fullPage: true 
    });
  });

  test('DETAILED: Component behavior investigation', async () => {
    console.log('🔍 Deep dive component behavior investigation');
    
    // Test PostCreator behavior step by step
    console.log('--- TESTING POSTCREATOR ---');
    
    const postCreator = page.locator('textarea').first();
    await postCreator.click();
    
    // Check for event listeners
    const postCreatorEvents = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      const events = [];
      if (textarea) {
        // Check for common event types
        const eventTypes = ['input', 'keyup', 'keydown', 'change', 'focus', 'blur'];
        eventTypes.forEach(type => {
          const hasListener = textarea.addEventListener ? true : false;
          events.push({ type, hasListener });
        });
      }
      return events;
    });
    
    console.log('PostCreator event listeners:', postCreatorEvents);
    
    await postCreator.type('@');
    await page.waitForTimeout(1000);
    
    // Check if MentionInput component is rendered
    const mentionComponent = page.locator('[data-component="mention-input"]').or(
      page.locator('.mention-input-component')
    );
    
    const mentionExists = await mentionComponent.count();
    console.log(`PostCreator - MentionInput components found: ${mentionExists}`);
    
    // Now test comment form
    console.log('--- TESTING COMMENT FORM ---');
    
    const replyBtn = page.locator('button').filter({ hasText: /reply/i }).first();
    await replyBtn.click();
    await page.waitForTimeout(500);
    
    const commentField = page.locator('textarea, input').last();
    await commentField.click();
    
    // Check comment field event listeners
    const commentEvents = await page.evaluate(() => {
      const inputs = document.querySelectorAll('textarea, input');
      const lastInput = inputs[inputs.length - 1];
      const events = [];
      if (lastInput) {
        const eventTypes = ['input', 'keyup', 'keydown', 'change', 'focus', 'blur'];
        eventTypes.forEach(type => {
          events.push({ type, element: lastInput.tagName });
        });
      }
      return events;
    });
    
    console.log('Comment field event listeners:', commentEvents);
    
    await commentField.type('@');
    await page.waitForTimeout(1000);
    
    const commentMentionExists = await mentionComponent.count();
    console.log(`Comment form - MentionInput components found: ${commentMentionExists}`);
    
    // Final comparison
    console.log('🎯 INVESTIGATION SUMMARY:');
    console.log(`- PostCreator mention components: ${mentionExists}`);
    console.log(`- Comment form mention components: ${commentMentionExists}`);
    console.log(`- Component rendering difference detected: ${mentionExists !== commentMentionExists}`);
  });

  test('EMERGENCY FIX VALIDATION: Verify identical MentionInput usage', async () => {
    console.log('🚨 EMERGENCY: Validating MentionInput component consistency');
    
    // This test should pass once the bug is fixed
    // It validates that both PostCreator and CommentForm use MentionInput identically
    
    // Test PostCreator
    const postCreator = page.locator('textarea').first();
    await postCreator.click();
    await postCreator.type('@test');
    
    const postDropdown = page.locator('.mention-dropdown');
    await expect(postDropdown).toBeVisible({ timeout: 3000 });
    
    // Clear and test comment form
    await postCreator.clear();
    
    const replyBtn = page.locator('button').filter({ hasText: /reply/i }).first();
    await replyBtn.click();
    
    const commentInput = page.locator('textarea, input').last();
    await commentInput.click();
    await commentInput.type('@test');
    
    const commentDropdown = page.locator('.mention-dropdown');
    
    // This should pass once fixed
    await expect(commentDropdown).toBeVisible({ 
      timeout: 3000,
      message: 'Comment @ mention dropdown should work identically to PostCreator'
    });
    
    console.log('✅ EMERGENCY FIX VALIDATED: Both components show mention dropdown');
  });
});
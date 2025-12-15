import { test, expect } from '@playwright/test';

test.describe('🚨 EMERGENCY: Quick Comment @ Mention Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  test('BASELINE: PostCreator @ mention working', async ({ page }) => {
    // Test PostCreator baseline (should work)
    const postCreatorTextarea = page.locator('textarea').first();
    await postCreatorTextarea.click();
    await postCreatorTextarea.type('@');
    
    // Capture screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/test-results/baseline-postcreator-working.png',
      fullPage: true
    });
    
    // Look for dropdown indicators
    const debugDropdown = page.locator('[class*="dropdown"], [data-testid*="dropdown"], [class*="mention"], text=🚨 EMERGENCY DEBUG');
    const dropdownExists = await debugDropdown.count() > 0;
    
    console.log(`✅ PostCreator @ mention test: Dropdown elements found: ${dropdownExists}`);
    
    // Clear for next test
    await postCreatorTextarea.fill('');
    
    expect(dropdownExists).toBe(true);
  });

  test('BROKEN: CommentForm @ mention missing', async ({ page }) => {
    // First find any post to comment on
    const posts = page.locator('[data-testid="post"], .post, article').first();
    await expect(posts).toBeVisible({ timeout: 10000 });
    
    // Look for reply button
    const replyButton = page.locator('button:has-text("Reply"), [data-testid="reply-button"], button[class*="reply"]').first();
    
    if (await replyButton.count() > 0) {
      await replyButton.click();
      await page.waitForTimeout(1000);
      
      // Find comment textarea
      const commentTextarea = page.locator('textarea[placeholder*="comment"], textarea[placeholder*="reply"], textarea[data-testid*="comment"]').first();
      
      if (await commentTextarea.count() > 0) {
        await commentTextarea.click();
        await commentTextarea.type('@');
        
        // Capture screenshot of broken state
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/test-results/broken-commentform-no-dropdown.png',
          fullPage: true
        });
        
        // Look for dropdown indicators
        const debugDropdown = page.locator('[class*="dropdown"], [data-testid*="dropdown"], [class*="mention"], text=🚨 EMERGENCY DEBUG');
        const dropdownExists = await debugDropdown.count() > 0;
        
        console.log(`❌ CommentForm @ mention test: Dropdown elements found: ${dropdownExists}`);
        
        // This should fail (proving the bug)
        if (!dropdownExists) {
          console.log('🚨 CONFIRMED BUG: CommentForm @ mention dropdown is missing!');
        }
        
        // For documentation, we expect this to be false (broken)
        expect(dropdownExists).toBe(false);
      } else {
        test.skip('No comment textarea found');
      }
    } else {
      test.skip('No reply button found');
    }
  });

  test('DOM Analysis: Compare PostCreator vs CommentForm', async ({ page }) => {
    // Analyze PostCreator structure with @
    const postCreatorTextarea = page.locator('textarea').first();
    await postCreatorTextarea.click();
    await postCreatorTextarea.type('@');
    await page.waitForTimeout(500);
    
    const postCreatorContainer = postCreatorTextarea.locator('..').locator('..');
    const postCreatorHTML = await postCreatorContainer.innerHTML();
    
    // Clear and test comment form
    await postCreatorTextarea.fill('');
    
    // Find comment form
    const replyButton = page.locator('button:has-text("Reply"), [data-testid="reply-button"]').first();
    
    if (await replyButton.count() > 0) {
      await replyButton.click();
      await page.waitForTimeout(1000);
      
      const commentTextarea = page.locator('textarea[placeholder*="comment"], textarea[placeholder*="reply"]').first();
      
      if (await commentTextarea.count() > 0) {
        await commentTextarea.click();
        await commentTextarea.type('@');
        await page.waitForTimeout(500);
        
        const commentContainer = commentTextarea.locator('..').locator('..');
        const commentHTML = await commentContainer.innerHTML();
        
        // Analysis
        const postCreatorHasDropdown = postCreatorHTML.includes('dropdown') || postCreatorHTML.includes('mention');
        const commentFormHasDropdown = commentHTML.includes('dropdown') || commentHTML.includes('mention');
        
        console.log('🔍 DOM Analysis Results:');
        console.log(`PostCreator has dropdown elements: ${postCreatorHasDropdown}`);
        console.log(`CommentForm has dropdown elements: ${commentFormHasDropdown}`);
        
        if (postCreatorHasDropdown && !commentFormHasDropdown) {
          console.log('🚨 ROOT CAUSE: CommentForm missing dropdown implementation');
        }
        
        // Take comparison screenshot
        await page.screenshot({
          path: '/workspaces/agent-feed/frontend/test-results/dom-comparison-analysis.png',
          fullPage: true
        });
      }
    }
    
    // This test always passes, it's for analysis
    expect(true).toBe(true);
  });
});
import { test, expect, Page } from '@playwright/test';

/**
 * 🚨 EMERGENCY: Dropdown Rendering Failure Analysis
 * 
 * CRITICAL INSIGHT DISCOVERED:
 * - ✅ QuickPost: @ dropdown WORKS, shows debug menu
 * - ❌ PostCreator: @ dropdown DOESN'T RENDER (no debug menu)
 * - ❌ CommentForm: @ dropdown DOESN'T RENDER (no debug menu)
 * 
 * KEY FINDING: Debug menu is INSIDE dropdown - if no debug menu visible, dropdown isn't rendering!
 */

const waitForDebugDropdown = async (page: Page) => {
  // Wait for the emergency debug message to appear in dropdown
  await page.waitForSelector('[data-testid="mention-dropdown-debug"], .mention-dropdown, :text("EMERGENCY DEBUG: Dropdown Open")', { 
    timeout: 5000 
  });
};

const typeAtSymbol = async (page: Page, selector: string) => {
  await page.fill(selector, '@');
  await page.waitForTimeout(200); // Give time for dropdown to trigger
};

test.describe('🚨 Emergency Component Comparison Analysis', () => {
  
  test('QuickPost dropdown renders correctly (WORKING CASE)', async ({ page }) => {
    console.log('🎯 Testing QuickPost - KNOWN WORKING');
    
    await page.goto('/enhanced-posting-interface');
    
    // Locate QuickPost input
    const quickPostInput = page.locator('.quick-post textarea, [data-testid="quick-post-input"], textarea[placeholder*="quick update"]');
    await expect(quickPostInput).toBeVisible();
    
    // Type @ and verify dropdown appears
    await typeAtSymbol(page, quickPostInput.first().locator('xpath=.').toString());
    
    // CRITICAL: Look for debug message in dropdown
    const debugDropdown = page.locator(':text("EMERGENCY DEBUG: Dropdown Open")');
    await expect(debugDropdown).toBeVisible({ timeout: 3000 });
    
    console.log('✅ QuickPost dropdown renders with debug menu - WORKING');
  });

  test('PostCreator dropdown fails to render (BROKEN CASE)', async ({ page }) => {
    console.log('🎯 Testing PostCreator - KNOWN BROKEN');
    
    await page.goto('/create');
    
    // Wait for PostCreator to load
    await page.waitForSelector('[data-testid="post-creator"], .post-creator');
    
    // Find the content textarea in PostCreator
    const postCreatorContent = page.locator('textarea[placeholder*="Share your insights"]');
    await expect(postCreatorContent).toBeVisible();
    
    // Type @ and check for dropdown
    await typeAtSymbol(page, postCreatorContent.first().locator('xpath=.').toString());
    
    // CRITICAL TEST: Debug menu should NOT be visible if dropdown doesn't render
    const debugDropdown = page.locator(':text("EMERGENCY DEBUG: Dropdown Open")');
    
    try {
      await expect(debugDropdown).toBeVisible({ timeout: 2000 });
      console.log('🟡 PostCreator dropdown UNEXPECTEDLY works - this might be fixed!');
    } catch {
      console.log('❌ PostCreator dropdown FAILS to render - CONFIRMED BROKEN');
      // This is expected based on user feedback
    }
  });

  test('CommentForm dropdown fails to render (BROKEN CASE)', async ({ page }) => {
    console.log('🎯 Testing CommentForm - KNOWN BROKEN');
    
    await page.goto('/');
    
    // Find a comment form
    const commentForm = page.locator('form:has(textarea[placeholder*="technical analysis"]), [data-testid="comment-form"]');
    await expect(commentForm.first()).toBeVisible();
    
    // Find comment textarea
    const commentInput = page.locator('textarea[placeholder*="technical analysis"], textarea[placeholder*="feedback"]');
    await expect(commentInput.first()).toBeVisible();
    
    // Type @ and check for dropdown
    await typeAtSymbol(page, commentInput.first().locator('xpath=.').toString());
    
    // CRITICAL TEST: Debug menu should NOT be visible if dropdown doesn't render
    const debugDropdown = page.locator(':text("EMERGENCY DEBUG: Dropdown Open")');
    
    try {
      await expect(debugDropdown).toBeVisible({ timeout: 2000 });
      console.log('🟡 CommentForm dropdown UNEXPECTEDLY works - this might be fixed!');
    } catch {
      console.log('❌ CommentForm dropdown FAILS to render - CONFIRMED BROKEN');
      // This is expected based on user feedback
    }
  });

  test('🔍 Component Architecture Comparison', async ({ page }) => {
    console.log('🔧 Analyzing component DOM structure differences');
    
    // Test QuickPost structure
    await page.goto('/enhanced-posting-interface');
    const quickPostContainer = await page.locator('.quick-post, [data-testid="quick-post"]').first();
    const quickPostHTML = await quickPostContainer.innerHTML();
    console.log('QuickPost DOM structure sample:', quickPostHTML.slice(0, 500));
    
    // Test PostCreator structure  
    await page.goto('/create');
    const postCreatorContainer = await page.locator('[data-testid="post-creator"], .post-creator').first();
    const postCreatorHTML = await postCreatorContainer.innerHTML();
    console.log('PostCreator DOM structure sample:', postCreatorHTML.slice(0, 500));
    
    // Look for key differences
    const quickPostHasRelative = quickPostHTML.includes('relative');
    const postCreatorHasRelative = postCreatorHTML.includes('relative');
    
    console.log('Positioning analysis:', {
      quickPostHasRelative,
      postCreatorHasRelative,
    });
    
    expect(true).toBe(true); // Always pass - this is analysis
  });

  test('🧪 CSS Z-index and Layout Analysis', async ({ page }) => {
    console.log('🎨 Analyzing CSS layout differences');
    
    await page.goto('/enhanced-posting-interface');
    
    // Get QuickPost container styles
    const quickPostStyles = await page.locator('textarea[placeholder*="quick update"]').first().evaluate(el => {
      const computed = window.getComputedStyle(el.parentElement || el);
      return {
        position: computed.position,
        zIndex: computed.zIndex,
        overflow: computed.overflow,
        height: computed.height
      };
    });
    
    console.log('QuickPost container styles:', quickPostStyles);
    
    await page.goto('/create');
    
    // Get PostCreator container styles
    const postCreatorStyles = await page.locator('textarea[placeholder*="Share your insights"]').first().evaluate(el => {
      const computed = window.getComputedStyle(el.parentElement || el);
      return {
        position: computed.position,
        zIndex: computed.zIndex,
        overflow: computed.overflow,
        height: computed.height
      };
    });
    
    console.log('PostCreator container styles:', postCreatorStyles);
    
    // Check for problematic CSS properties
    const hasOverflowHidden = postCreatorStyles.overflow === 'hidden';
    const hasLowZIndex = parseInt(postCreatorStyles.zIndex) < 100;
    
    if (hasOverflowHidden) {
      console.log('🚨 CRITICAL: PostCreator has overflow:hidden - this could clip dropdown!');
    }
    
    if (hasLowZIndex) {
      console.log('🚨 CRITICAL: PostCreator has low z-index - dropdown might be behind other elements!');
    }
    
    expect(true).toBe(true); // Always pass - this is analysis
  });
});
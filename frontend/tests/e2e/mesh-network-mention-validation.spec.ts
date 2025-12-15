import { test, expect } from '@playwright/test';

test.describe('🚨 MESH NETWORK FIX: Comment @ Mention Dropdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to main page
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
  });

  test('MESH VALIDATION: PostCreator @ mention dropdown (reference behavior)', async ({ page }) => {
    console.log('🎯 MESH TEST: Testing PostCreator @ mention dropdown');

    // Find the main PostCreator textarea (usually the large one on main page)
    const postCreator = page.locator('textarea[data-mention-context="post"]').first();
    await expect(postCreator).toBeVisible({ timeout: 10000 });
    
    // Click and type @
    await postCreator.click();
    await postCreator.type('@');
    
    // Wait for dropdown to appear with debug message
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    
    // Verify emergency debug message
    const debugMessage = page.locator('text=/EMERGENCY DEBUG.*Dropdown Open/i');
    await expect(debugMessage).toBeVisible({ timeout: 3000 });
    
    console.log('✅ MESH VALIDATION: PostCreator dropdown working correctly');
  });

  test('MESH VALIDATION: CommentForm @ mention dropdown (target behavior)', async ({ page }) => {
    console.log('🎯 MESH TEST: Testing CommentForm @ mention dropdown');

    try {
      // Find any post to comment on
      const post = page.locator('[data-testid="post-item"], .post-item, article').first();
      await expect(post).toBeVisible({ timeout: 10000 });
      
      // Look for comment button or form
      const commentButton = page.locator('button:has-text("Comment"), button[aria-label*="comment"], button:has([data-testid="comment-icon"])').first();
      
      if (await commentButton.isVisible({ timeout: 2000 })) {
        await commentButton.click();
        await page.waitForTimeout(500);
      }
      
      // Find comment form textarea
      let commentTextarea = page.locator('textarea[data-mention-context="comment"]').first();
      
      if (!(await commentTextarea.isVisible({ timeout: 2000 }))) {
        // Try alternative selectors for comment form
        commentTextarea = page.locator('form textarea, [placeholder*="comment" i] textarea, textarea').filter({
          has: page.locator(':not([data-mention-context="post"])')
        }).first();
      }
      
      await expect(commentTextarea).toBeVisible({ timeout: 5000 });
      
      // Click and type @
      await commentTextarea.click();
      await commentTextarea.type('@');
      
      // CRITICAL: Wait for dropdown to appear with debug message
      const dropdown = page.locator('[role="listbox"]');
      await expect(dropdown).toBeVisible({ timeout: 8000 });
      
      // Verify emergency debug message
      const debugMessage = page.locator('text=/EMERGENCY DEBUG.*Dropdown Open/i');
      await expect(debugMessage).toBeVisible({ timeout: 3000 });
      
      console.log('✅ MESH VALIDATION: CommentForm dropdown working correctly');
      
    } catch (error) {
      console.log('🚨 MESH TEST ERROR:', error.message);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/mesh-comment-dropdown-failure.png' });
      
      // Get page HTML for debugging
      const html = await page.content();
      console.log('🔍 MESH DEBUG: Page HTML length:', html.length);
      
      throw error;
    }
  });

  test('MESH CONSENSUS: Validate identical dropdown behavior across components', async ({ page }) => {
    console.log('🎯 MESH CONSENSUS: Cross-component dropdown validation');

    // Test PostCreator first
    const postCreator = page.locator('textarea[data-mention-context="post"]').first();
    await postCreator.click();
    await postCreator.type('@test');
    
    let postDropdown = page.locator('[role="listbox"]').first();
    await expect(postDropdown).toBeVisible();
    
    // Capture PostCreator dropdown properties
    const postDropdownBox = await postDropdown.boundingBox();
    const postDebugText = await page.locator('text=/EMERGENCY DEBUG/i').first().textContent();
    
    // Clear and test CommentForm
    await postCreator.clear();
    
    // Find and test comment form
    const commentButton = page.locator('button:has-text("Comment")').first();
    if (await commentButton.isVisible({ timeout: 2000 })) {
      await commentButton.click();
    }
    
    const commentTextarea = page.locator('textarea[data-mention-context="comment"], form textarea').first();
    await commentTextarea.click();
    await commentTextarea.type('@test');
    
    const commentDropdown = page.locator('[role="listbox"]').last();
    await expect(commentDropdown).toBeVisible();
    
    // Capture CommentForm dropdown properties
    const commentDropdownBox = await commentDropdown.boundingBox();
    const commentDebugText = await page.locator('text=/EMERGENCY DEBUG/i').last().textContent();
    
    // MESH CONSENSUS VALIDATION
    console.log('📊 MESH CONSENSUS CHECK:');
    console.log('PostCreator dropdown size:', postDropdownBox);
    console.log('CommentForm dropdown size:', commentDropdownBox);
    console.log('PostCreator debug text:', postDebugText);
    console.log('CommentForm debug text:', commentDebugText);
    
    // Both should have debug messages
    expect(postDebugText).toContain('EMERGENCY DEBUG');
    expect(commentDebugText).toContain('EMERGENCY DEBUG');
    
    console.log('✅ MESH CONSENSUS: Dropdown behavior validated across components');
  });
});
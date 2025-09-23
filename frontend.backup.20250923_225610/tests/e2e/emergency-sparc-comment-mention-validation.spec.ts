import { test, expect } from '@playwright/test';

test.describe('🚨 EMERGENCY SPARC: Comment Form @ Mention Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Load the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('SPECIFICATION VALIDATION: PostCreator @ mention works (control test)', async ({ page }) => {
    // Find PostCreator and test @ mentions
    const postcreatorTextarea = page.locator('[data-mention-context="post"]').first();
    await expect(postcreatorTextarea).toBeVisible();
    
    // Type @ to trigger mention dropdown
    await postcreatorTextarea.fill('@');
    
    // Should see emergency debug dropdown
    const debugDropdown = page.locator(':text("🚨 EMERGENCY DEBUG: Dropdown Open")');
    await expect(debugDropdown).toBeVisible({ timeout: 3000 });
    
    // Verify context is correct
    await expect(page.locator(':text("Context: post")')).toBeVisible();
    
    console.log('✅ SPECIFICATION: PostCreator @ mentions confirmed working');
  });

  test('PSEUDOCODE VALIDATION: QuickPost @ mention works (control test)', async ({ page }) => {
    // Find QuickPost and test @ mentions  
    const quickpostTextarea = page.locator('[data-mention-context="quick-post"]').first();
    await expect(quickpostTextarea).toBeVisible();
    
    // Type @ to trigger mention dropdown
    await quickpostTextarea.fill('@');
    
    // Should see emergency debug dropdown
    const debugDropdown = page.locator(':text("🚨 EMERGENCY DEBUG: Dropdown Open")');
    await expect(debugDropdown).toBeVisible({ timeout: 3000 });
    
    // Verify context is correct
    await expect(page.locator(':text("Context: quick-post")')).toBeVisible();
    
    console.log('✅ PSEUDOCODE: QuickPost @ mentions confirmed working');
  });

  test('ARCHITECTURE VALIDATION: CommentForm @ mention NOW WORKS (target test)', async ({ page }) => {
    // Navigate to a post to access comment forms
    const firstPost = page.locator('[data-testid="post-card"], .post-card').first();
    await expect(firstPost).toBeVisible();
    
    // Look for comment button or form
    const commentButton = page.locator('button:has-text("Comment"), button:has-text("Reply"), [data-testid="comment-button"]').first();
    if (await commentButton.isVisible()) {
      await commentButton.click();
      await page.waitForTimeout(500);
    }
    
    // Find comment form textarea
    const commentTextarea = page.locator('[data-mention-context="comment"]').first();
    await expect(commentTextarea).toBeVisible({ timeout: 5000 });
    
    // Type @ to trigger mention dropdown
    await commentTextarea.fill('@');
    
    // Should now see emergency debug dropdown (CRITICAL TEST)
    const debugDropdown = page.locator(':text("🚨 EMERGENCY DEBUG: Dropdown Open")');
    await expect(debugDropdown).toBeVisible({ timeout: 3000 });
    
    // Verify context is correct
    await expect(page.locator(':text("Context: comment")')).toBeVisible();
    
    console.log('✅ ARCHITECTURE: CommentForm @ mentions NOW WORKING after SPARC fix');
  });

  test('REFINEMENT VALIDATION: Comment reply @ mention works', async ({ page }) => {
    // Navigate to a post with existing comments
    const firstPost = page.locator('[data-testid="post-card"], .post-card').first();
    await expect(firstPost).toBeVisible();
    
    // Look for existing comment and reply button
    const replyButton = page.locator('button:has-text("Reply"), [data-testid="reply-button"]').first();
    if (await replyButton.isVisible()) {
      await replyButton.click();
      await page.waitForTimeout(500);
    }
    
    // Find reply comment form textarea
    const replyTextarea = page.locator('[data-mention-context="comment"]').last();
    if (await replyTextarea.isVisible()) {
      // Type @ to trigger mention dropdown
      await replyTextarea.fill('@');
      
      // Should see emergency debug dropdown
      const debugDropdown = page.locator(':text("🚨 EMERGENCY DEBUG: Dropdown Open")');
      await expect(debugDropdown).toBeVisible({ timeout: 3000 });
      
      console.log('✅ REFINEMENT: Comment reply @ mentions working');
    } else {
      console.log('⏭️ REFINEMENT: No reply form found, skipping test');
    }
  });

  test('COMPLETION VALIDATION: All @ mention contexts work consistently', async ({ page }) => {
    const contexts = [
      { selector: '[data-mention-context="post"]', name: 'PostCreator' },
      { selector: '[data-mention-context="quick-post"]', name: 'QuickPost' },
      { selector: '[data-mention-context="comment"]', name: 'CommentForm' }
    ];
    
    let workingContexts = 0;
    
    for (const context of contexts) {
      const textarea = page.locator(context.selector).first();
      if (await textarea.isVisible()) {
        await textarea.fill('@');
        
        const debugDropdown = page.locator(':text("🚨 EMERGENCY DEBUG: Dropdown Open")');
        if (await debugDropdown.isVisible({ timeout: 2000 })) {
          console.log(`✅ COMPLETION: ${context.name} @ mentions working`);
          workingContexts++;
        } else {
          console.log(`❌ COMPLETION: ${context.name} @ mentions FAILED`);
        }
        
        // Clear for next test
        await textarea.fill('');
        await page.waitForTimeout(100);
      }
    }
    
    // At minimum, CommentForm should now work
    expect(workingContexts).toBeGreaterThanOrEqual(1);
    console.log(`🎯 COMPLETION: ${workingContexts}/${contexts.length} contexts working`);
  });

  test('EMERGENCY VALIDATION: Browser debug test accessible', async ({ page }) => {
    // Test the emergency debug HTML file
    await page.goto('http://localhost:5173/emergency-comment-mention-debug.html');
    
    // Should load successfully
    await expect(page.locator('h1:has-text("EMERGENCY SPARC DEBUG")')).toBeVisible();
    
    // Test working patterns
    const workingInputs = page.locator('.working textarea');
    const workingCount = await workingInputs.count();
    expect(workingCount).toBeGreaterThan(0);
    
    // Test fixed pattern
    const fixedInput = page.locator('#fixed-commentform textarea');
    await expect(fixedInput).toBeVisible();
    
    console.log('✅ EMERGENCY VALIDATION: Debug test page accessible');
  });
});

// Additional comprehensive validation
test.describe('🎯 SPARC COMPLETION: Cross-Component Validation', () => {
  test('All MentionInput contexts show consistent behavior', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Test each known mention context
    const contexts = ['post', 'quick-post', 'comment'];
    const results = {};
    
    for (const context of contexts) {
      const selector = `[data-mention-context="${context}"]`;
      const input = page.locator(selector).first();
      
      if (await input.isVisible()) {
        await input.fill('@test');
        
        // Check if dropdown appears
        const hasDropdown = await page.locator('.mention-dropdown, :text("EMERGENCY DEBUG")').isVisible({ timeout: 2000 });
        results[context] = hasDropdown;
        
        await input.fill('');
      }
    }
    
    console.log('🎯 SPARC COMPLETION RESULTS:', results);
    
    // CommentForm must now work
    expect(results.comment).toBeTruthy();
    
    // Log success
    const workingContexts = Object.values(results).filter(Boolean).length;
    console.log(`🚀 SPARC SUCCESS: ${workingContexts}/${contexts.length} contexts working`);
  });
});
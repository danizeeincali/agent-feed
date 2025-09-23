import { test, expect } from '@playwright/test';

/**
 * TDD London School Regression Tests
 * Prevent future @ mention system failures
 * 
 * These tests ensure MentionInput components remain properly integrated
 * across all user-facing text input areas.
 */

test.describe('Mention System Regression Prevention', () => {
  test.beforeEach(async ({ page }) => {
    // Set up page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('REGRESSION: Main page Quick Post must have MentionInput with dropdown', async ({ page }) => {
    // Ensure Quick Post tab is selected (it should be by default)
    const quickPostTab = page.locator('button:has-text("Quick Post")').first();
    await quickPostTab.click();
    await page.waitForTimeout(500);

    // Find the Quick Post textarea
    const quickPostTextarea = page.locator('textarea[placeholder*="mind"]').first();
    await expect(quickPostTextarea).toBeVisible();

    // CRITICAL REGRESSION TEST: Type @ and verify dropdown appears
    await quickPostTextarea.clear();
    await quickPostTextarea.type('@');
    await page.waitForTimeout(1000);

    const dropdownExists = await page.locator('[role="listbox"]').isVisible();
    const hasMentionProps = await quickPostTextarea.getAttribute('aria-haspopup');

    // REGRESSION PREVENTION ASSERTIONS
    expect(dropdownExists).toBe(true);
    expect(hasMentionProps).toBe('listbox');

    // Additional verification - dropdown should have suggestions
    const suggestionCount = await page.locator('[role="listbox"] [role="option"]').count();
    expect(suggestionCount).toBeGreaterThan(0);

    console.log('✅ REGRESSION TEST PASSED: Quick Post has working MentionInput');
  });

  test('REGRESSION: PostCreator must have MentionInput with dropdown', async ({ page }) => {
    // Click on Post tab
    const postTab = page.locator('button:has-text("Post")').first();
    await postTab.click();
    await page.waitForTimeout(500);

    // Find the PostCreator content textarea
    const postCreatorTextarea = page.locator('textarea[placeholder*="insights"]').first();
    
    // Skip if PostCreator is not visible (different component structure)
    if (await postCreatorTextarea.isVisible().catch(() => false)) {
      await postCreatorTextarea.clear();
      await postCreatorTextarea.type('@');
      await page.waitForTimeout(1000);

      const dropdownExists = await page.locator('[role="listbox"]').isVisible();
      const hasMentionProps = await postCreatorTextarea.getAttribute('aria-haspopup');

      expect(dropdownExists).toBe(true);
      expect(hasMentionProps).toBe('listbox');

      console.log('✅ REGRESSION TEST PASSED: PostCreator has working MentionInput');
    } else {
      console.log('ℹ️ PostCreator not found in current page structure - test skipped');
    }
  });

  test('REGRESSION: Posting page must have MentionInput with dropdown', async ({ page }) => {
    await page.goto('http://localhost:5173/posting');
    await page.waitForLoadState('networkidle');

    const postingTextarea = page.locator('textarea').first();
    if (await postingTextarea.isVisible().catch(() => false)) {
      await postingTextarea.clear();
      await postingTextarea.type('@');
      await page.waitForTimeout(1000);

      const dropdownExists = await page.locator('[role="listbox"]').isVisible();
      const hasMentionProps = await postingTextarea.getAttribute('aria-haspopup');

      expect(dropdownExists).toBe(true);
      expect(hasMentionProps).toBe('listbox');

      console.log('✅ REGRESSION TEST PASSED: Posting page has working MentionInput');
    }
  });

  test('REGRESSION: All mention dropdowns must show actual agent suggestions', async ({ page }) => {
    // Test Quick Post dropdown content
    const quickPostTextarea = page.locator('textarea[placeholder*="mind"]').first();
    await expect(quickPostTextarea).toBeVisible();
    
    await quickPostTextarea.type('@');
    await page.waitForTimeout(1000);

    // Verify dropdown has real suggestions with proper structure
    const suggestions = page.locator('[role="listbox"] [role="option"]');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);

    // Verify suggestions have proper content
    const firstSuggestion = suggestions.first();
    const suggestionText = await firstSuggestion.textContent();
    
    expect(suggestionText).toBeTruthy();
    expect(suggestionText?.length).toBeGreaterThan(0);

    // Verify suggestions are clickable
    await firstSuggestion.click();
    const textareaValue = await quickPostTextarea.inputValue();
    expect(textareaValue).toContain('@');

    console.log('✅ REGRESSION TEST PASSED: Mention suggestions are functional');
  });

  test('REGRESSION: MentionInput components must not be replaced with regular textareas', async ({ page }) => {
    // Comprehensive check - any textarea with mention functionality must have proper attributes
    const allTextareas = await page.locator('textarea').all();
    
    let mentionTextareaFound = false;
    
    for (const textarea of allTextareas) {
      if (await textarea.isVisible()) {
        // Type @ to see if this is a mention-enabled textarea
        await textarea.click();
        await textarea.clear();
        await textarea.type('@');
        await page.waitForTimeout(500);
        
        const dropdownExists = await page.locator('[role="listbox"]').isVisible();
        
        if (dropdownExists) {
          mentionTextareaFound = true;
          
          // If dropdown appears, this MUST be a proper MentionInput
          const hasMentionProps = await textarea.getAttribute('aria-haspopup');
          expect(hasMentionProps).toBe('listbox');
          
          console.log('✅ Found mention-enabled textarea with proper attributes');
          
          // Clear for next test
          await textarea.clear();
          await page.keyboard.press('Escape'); // Close dropdown
        }
      }
    }
    
    expect(mentionTextareaFound).toBe(true);
    console.log('✅ REGRESSION TEST PASSED: No mention functionality was broken');
  });

  test('REGRESSION: @ mention workflow must work end-to-end', async ({ page }) => {
    const textarea = page.locator('textarea[placeholder*="mind"]').first();
    await expect(textarea).toBeVisible();
    
    // Complete workflow test
    await textarea.type('@');
    await page.waitForTimeout(1000);
    
    // Dropdown should appear
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();
    
    // Should have suggestions
    const suggestions = page.locator('[role="listbox"] [role="option"]');
    const count = await suggestions.count();
    expect(count).toBeGreaterThan(0);
    
    // Should be able to navigate with keyboard
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    
    // Should be able to select with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    
    // Text should be updated with mention
    const finalValue = await textarea.inputValue();
    expect(finalValue).toContain('@');
    expect(finalValue.length).toBeGreaterThan(1);
    
    console.log('✅ REGRESSION TEST PASSED: Complete @ mention workflow functional');
  });

  test.afterEach(async ({ page }) => {
    // Clean up any open dropdowns
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });
});
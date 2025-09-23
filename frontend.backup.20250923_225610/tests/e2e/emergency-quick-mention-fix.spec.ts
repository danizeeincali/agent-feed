import { test, expect, Page } from '@playwright/test';

test.describe('EMERGENCY: Quick Mention Fix', () => {
  test('CRITICAL: Test @ behavior on main page vs mention demo', async ({ page }) => {
    console.log('🚨 TESTING: Main page @ behavior vs demo');

    // STEP 1: Test main page textarea
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    const mainPageTextarea = page.locator('textarea[placeholder*="mind"]').first();
    await expect(mainPageTextarea).toBeVisible({ timeout: 5000 });
    
    await mainPageTextarea.clear();
    await mainPageTextarea.type('@');
    await page.waitForTimeout(1000);

    const mainPageResult = await page.evaluate(() => {
      const textarea = document.querySelector('textarea[placeholder*="mind"]');
      const dropdown = document.querySelector('[role="listbox"]');
      return {
        component: 'MAIN_PAGE',
        value: textarea?.value,
        dropdownExists: !!dropdown,
        dropdownVisible: dropdown ? dropdown.offsetHeight > 0 : false,
        hasMentionProps: textarea?.hasAttribute('aria-haspopup'),
        componentType: textarea?.closest('[class*="MentionInput"]') ? 'MentionInput' : 'RegularTextarea'
      };
    });
    
    console.log('📊 MAIN PAGE RESULTS:', mainPageResult);

    // STEP 2: Test mention demo page
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');

    const demoTextarea = page.locator('textarea').first();
    await expect(demoTextarea).toBeVisible({ timeout: 5000 });
    
    await demoTextarea.clear();
    await demoTextarea.type('@');
    await page.waitForTimeout(1000);

    const demoResult = await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      const dropdown = document.querySelector('[role="listbox"]');
      return {
        component: 'DEMO_PAGE',
        value: textarea?.value,
        dropdownExists: !!dropdown,
        dropdownVisible: dropdown ? dropdown.offsetHeight > 0 : false,
        hasMentionProps: textarea?.hasAttribute('aria-haspopup'),
        componentType: textarea?.closest('[class*="MentionInput"]') ? 'MentionInput' : 'RegularTextarea'
      };
    });

    console.log('📊 DEMO RESULTS:', demoResult);

    // STEP 3: Test posting page
    await page.goto('http://localhost:5173/posting');
    await page.waitForLoadState('networkidle');

    const postingTextarea = page.locator('textarea').first();
    if (await postingTextarea.isVisible().catch(() => false)) {
      await postingTextarea.clear();
      await postingTextarea.type('@');
      await page.waitForTimeout(1000);

      const postingResult = await page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        const dropdown = document.querySelector('[role="listbox"]');
        return {
          component: 'POSTING_PAGE',
          value: textarea?.value,
          dropdownExists: !!dropdown,
          dropdownVisible: dropdown ? dropdown.offsetHeight > 0 : false,
          hasMentionProps: textarea?.hasAttribute('aria-haspopup'),
          componentType: textarea?.closest('[class*="MentionInput"]') ? 'MentionInput' : 'RegularTextarea'
        };
      });

      console.log('📊 POSTING RESULTS:', postingResult);
    }

    // CRITICAL COMPARISON
    console.log('🎯 CRITICAL FINDINGS:');
    console.log(`Main page dropdown: ${mainPageResult.dropdownExists}`);
    console.log(`Demo page dropdown: ${demoResult.dropdownExists}`);
    console.log(`Main page component: ${mainPageResult.componentType}`);
    console.log(`Demo page component: ${demoResult.componentType}`);

    // THE KEY INSIGHT
    if (demoResult.dropdownExists && !mainPageResult.dropdownExists) {
      console.log('🚨 CONFIRMED BUG: Demo works, main page broken');
      console.log('💡 FIX: Copy demo implementation to main page');
    } else if (!demoResult.dropdownExists && !mainPageResult.dropdownExists) {
      console.log('🚨 CONFIRMED BUG: Both components broken');
      console.log('💡 FIX: MentionInput component not working anywhere');
    }

    // Test assertions to expose the issue
    expect(mainPageResult.value).toBe('@');
    expect(demoResult.value).toBe('@');
    
    // This will show us which components are broken
    console.log('DROPDOWN COMPARISON:');
    console.log(`Demo works: ${demoResult.dropdownExists}`);
    console.log(`Main works: ${mainPageResult.dropdownExists}`);
  });
});
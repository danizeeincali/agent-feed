import { test, expect } from '@playwright/test';

test.describe('EMERGENCY: Live @ Mention System Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the live application
    await page.goto('http://localhost:5173');
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test('Emergency Validation: @ Mention System Live State', async ({ page }) => {
    console.log('🚨 EMERGENCY VALIDATION: Starting live system inspection...');

    // Step 1: Check if the application loads
    await expect(page).toHaveTitle(/Agent Feed/i);
    console.log('✅ Application loaded successfully');

    // Step 2: Take initial screenshot
    await page.screenshot({ path: 'frontend/test-results/emergency-initial-state.png', fullPage: true });
    console.log('📸 Initial screenshot captured');

    // Step 3: Look for comment forms and QuickPost
    const commentForms = await page.locator('textarea, input[type="text"]').all();
    console.log(`🔍 Found ${commentForms.length} input elements`);

    // Step 4: Check for MentionInput components specifically
    const mentionInputs = await page.locator('[data-testid*="mention"], [class*="mention"], [id*="mention"]').all();
    console.log(`🎯 Found ${mentionInputs.length} mention-related elements`);

    // Step 5: Try to find QuickPost component
    const quickPost = page.locator('[data-testid="quickpost"], [class*="quickpost"], [class*="QuickPost"]');
    const quickPostExists = await quickPost.count() > 0;
    console.log(`📝 QuickPost component exists: ${quickPostExists}`);

    if (quickPostExists) {
      await quickPost.scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'frontend/test-results/emergency-quickpost-found.png' });
      
      // Try to find input within QuickPost
      const quickPostInput = quickPost.locator('textarea, input');
      const quickPostInputCount = await quickPostInput.count();
      console.log(`📝 QuickPost inputs found: ${quickPostInputCount}`);
      
      if (quickPostInputCount > 0) {
        // Test @ input in QuickPost
        await quickPostInput.first().click();
        await quickPostInput.first().type('@');
        await page.waitForTimeout(1000);
        
        // Check for dropdown
        const dropdown = page.locator('[class*="dropdown"], [class*="suggestion"], [class*="mention-list"]');
        const dropdownVisible = await dropdown.isVisible().catch(() => false);
        console.log(`📋 Dropdown visible after @ in QuickPost: ${dropdownVisible}`);
        
        await page.screenshot({ path: 'frontend/test-results/emergency-quickpost-at-test.png' });
      }
    }

    // Step 6: Look for comment forms
    const postThreads = page.locator('[data-testid*="post"], [class*="post"], article');
    const postCount = await postThreads.count();
    console.log(`📰 Found ${postCount} posts`);

    if (postCount > 0) {
      // Try to find comment forms
      const commentForm = page.locator('form').filter({ hasText: /comment|reply/i }).first();
      const commentFormExists = await commentForm.count() > 0;
      console.log(`💬 Comment form exists: ${commentFormExists}`);

      if (commentFormExists) {
        await commentForm.scrollIntoViewIfNeeded();
        const commentInput = commentForm.locator('textarea, input');
        const commentInputCount = await commentInput.count();
        console.log(`💬 Comment inputs found: ${commentInputCount}`);

        if (commentInputCount > 0) {
          // Test @ input in comment form
          await commentInput.first().click();
          await commentInput.first().type('@');
          await page.waitForTimeout(1000);
          
          // Check for dropdown
          const dropdown = page.locator('[class*="dropdown"], [class*="suggestion"], [class*="mention-list"]');
          const dropdownVisible = await dropdown.isVisible().catch(() => false);
          console.log(`📋 Dropdown visible after @ in comment: ${dropdownVisible}`);
          
          await page.screenshot({ path: 'frontend/test-results/emergency-comment-at-test.png' });
        }
      }
    }

    // Step 7: Check JavaScript console for errors
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(`❌ Console Error: ${msg.text()}`);
      }
    });

    // Step 8: Check for network errors
    const networkErrors = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`🌐 Network Error: ${response.url()} - ${response.status()}`);
      }
    });

    // Step 9: Inspect actual DOM structure
    const bodyHTML = await page.locator('body').innerHTML();
    const hasMentionComponents = bodyHTML.includes('mention') || bodyHTML.includes('Mention');
    console.log(`🔍 DOM contains mention-related code: ${hasMentionComponents}`);

    // Step 10: Final comprehensive screenshot
    await page.screenshot({ path: 'frontend/test-results/emergency-final-state.png', fullPage: true });

    // Log all findings
    console.log('\n🚨 EMERGENCY VALIDATION SUMMARY:');
    console.log(`📱 Application loaded: ✅`);
    console.log(`🔍 Input elements found: ${commentForms.length}`);
    console.log(`🎯 Mention elements found: ${mentionInputs.length}`);
    console.log(`📝 QuickPost exists: ${quickPostExists}`);
    console.log(`📰 Posts found: ${postCount}`);
    console.log(`💬 Comment forms accessible: ${commentFormExists || 'Not tested'}`);
    console.log(`🔍 DOM has mention code: ${hasMentionComponents}`);
    
    if (logs.length > 0) {
      console.log('\n❌ JavaScript Errors:');
      logs.forEach(log => console.log(log));
    }
    
    if (networkErrors.length > 0) {
      console.log('\n🌐 Network Errors:');
      networkErrors.forEach(error => console.log(error));
    }
  });

  test('Emergency Test: Direct @ Input Validation', async ({ page }) => {
    console.log('🚨 EMERGENCY: Testing direct @ input behavior...');

    // Find any textarea or input
    const inputs = await page.locator('textarea, input[type="text"]').all();
    
    for (let i = 0; i < Math.min(inputs.length, 3); i++) {
      const input = inputs[i];
      const inputId = await input.getAttribute('id') || await input.getAttribute('class') || `input-${i}`;
      
      console.log(`🧪 Testing input: ${inputId}`);
      
      try {
        await input.scrollIntoViewIfNeeded();
        await input.click();
        await input.clear();
        await input.type('@test');
        
        // Wait and check for any dropdowns or suggestions
        await page.waitForTimeout(1500);
        
        const dropdown = page.locator('[role="listbox"], [class*="dropdown"], [class*="suggestion"], [class*="mention"]');
        const dropdownCount = await dropdown.count();
        
        console.log(`📋 Input ${inputId} - Dropdowns found: ${dropdownCount}`);
        
        if (dropdownCount > 0) {
          await page.screenshot({ path: `frontend/test-results/emergency-dropdown-${i}.png` });
        }
        
        await page.screenshot({ path: `frontend/test-results/emergency-input-test-${i}.png` });
      } catch (error) {
        console.log(`❌ Error testing input ${inputId}: ${error.message}`);
      }
    }
  });
});
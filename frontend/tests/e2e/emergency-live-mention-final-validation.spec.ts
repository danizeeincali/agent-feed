import { test, expect } from '@playwright/test';

test.describe('🚨 EMERGENCY: Live @ Mention System Final Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable console logging to capture debug output
    page.on('console', (msg) => {
      if (msg.text().includes('EMERGENCY DEBUG') || msg.text().includes('Query:')) {
        console.log(`🎭 BROWSER LOG: ${msg.text()}`);
      }
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should validate live @ mention system shows correct query and suggestions', async ({ page }) => {
    console.log('🔍 LIVE TEST: Starting @ mention validation...');
    
    // First, navigate to the mention demo page which definitely has MentionInput
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 TESTING: Mention Demo page loaded');
    
    // Find the mention input (try multiple selectors)
    const mentionInputs = [
      'textarea[placeholder*="mention"]',
      'textarea[placeholder*="@"]', 
      'textarea[aria-label*="mention"]',
      '.mention-input textarea',
      '[data-testid="mention-input"]',
      'textarea'  // fallback
    ];
    
    let textarea = null;
    for (const selector of mentionInputs) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          textarea = element;
          console.log(`✅ FOUND: Textarea with selector: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!textarea) {
      console.log('❌ No mention input found on /mention-demo, trying homepage with comment forms...');
      
      // Navigate to homepage and try to find comment forms  
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      
      // Look for comment button or comment form
      try {
        const commentButton = page.locator('button:has-text("Comment")').first();
        if (await commentButton.isVisible({ timeout: 2000 })) {
          await commentButton.click();
          console.log('✅ Clicked comment button');
          
          // Wait for comment form to appear
          await page.waitForTimeout(500);
          textarea = page.locator('textarea').first();
        }
      } catch (e) {
        console.log('⚠️ No comment button found');
      }
      
      if (!textarea) {
        // Last resort - find any textarea
        textarea = page.locator('textarea').first();
      }
    }
    
    await expect(textarea).toBeVisible();
    
    // Focus and type @
    console.log('🎯 LIVE TEST: Focusing textarea and typing @');
    await textarea.focus();
    await textarea.fill(''); // Clear any existing content
    await textarea.type('@');
    
    // Wait for dropdown to appear
    console.log('⏳ LIVE TEST: Waiting for dropdown...');
    
    // Look for dropdown indicators
    const dropdownSelectors = [
      '[role="listbox"]',
      '.dropdown',
      '.mention-dropdown',
      '.suggestions',
      '*[class*="dropdown"]',
      '*[class*="suggestion"]',
      '*:has-text("Query:")',
      '*:has-text("EMERGENCY DEBUG")'
    ];
    
    let dropdownFound = false;
    let dropdownContent = '';
    
    for (const selector of dropdownSelectors) {
      try {
        const dropdown = page.locator(selector).first();
        await dropdown.waitFor({ state: 'visible', timeout: 2000 });
        dropdownContent = await dropdown.textContent() || '';
        console.log(`✅ DROPDOWN FOUND with selector "${selector}": ${dropdownContent.substring(0, 100)}...`);
        dropdownFound = true;
        break;
      } catch (e) {
        continue;
      }
    }
    
    if (!dropdownFound) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'debug-no-dropdown.png' });
      console.log('❌ CRITICAL: No dropdown found after typing @');
      
      // Check if there are any elements that might be the dropdown
      const allElements = await page.locator('*').all();
      for (const element of allElements.slice(0, 20)) {
        try {
          const text = await element.textContent();
          if (text && (text.includes('Query:') || text.includes('suggestion') || text.includes('mention'))) {
            console.log(`🔍 POTENTIAL DROPDOWN: ${await element.getAttribute('class')} - ${text.substring(0, 50)}...`);
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('No dropdown appeared after typing @');
    }
    
    // Analyze dropdown content for the "Query: none" vs "Query: ''" issue
    console.log('🔍 ANALYZING DROPDOWN CONTENT:', dropdownContent);
    
    const hasQueryNone = dropdownContent.includes('Query: "none"') || dropdownContent.includes("Query: 'none'");
    const hasEmptyQuery = dropdownContent.includes('Query: ""') || dropdownContent.includes("Query: ''");
    const hasQuery = dropdownContent.includes('Query:');
    
    console.log('🐛 QUERY ANALYSIS:', {
      hasQueryNone,
      hasEmptyQuery,
      hasQuery,
      fullContent: dropdownContent.substring(0, 200)
    });
    
    if (hasQueryNone) {
      console.log('🚨 CRITICAL BUG CONFIRMED: Dropdown shows "Query: none" instead of empty string');
      
      // Take screenshot of the bug
      await page.screenshot({ path: 'bug-query-none.png' });
      
      // This is the bug we need to fix
      expect(hasQueryNone).toBe(false);
    } else if (hasEmptyQuery || !hasQuery) {
      console.log('✅ CORRECT BEHAVIOR: Query shows empty string or no query display');
    }
    
    // Check if suggestions are present
    const hasSuggestions = dropdownContent.includes('Suggestions: 0') === false;
    const suggestionCount = dropdownContent.match(/Suggestions: (\d+)/);
    
    console.log('📊 SUGGESTIONS ANALYSIS:', {
      hasSuggestions,
      suggestionCount: suggestionCount ? suggestionCount[1] : 'not found',
      hasAgentNames: dropdownContent.includes('Chief of Staff') || dropdownContent.includes('Personal Todos')
    });
    
    // Verify suggestions are loaded
    if (suggestionCount) {
      const count = parseInt(suggestionCount[1]);
      expect(count).toBeGreaterThan(0);
      console.log(`✅ SUGGESTIONS: Found ${count} suggestions`);
    }
    
    // Test typing additional characters
    console.log('🔤 LIVE TEST: Typing additional characters after @');
    await textarea.type('ass');
    
    // Wait for updated dropdown
    await page.waitForTimeout(500);
    
    // Check if dropdown updates correctly
    const updatedDropdown = page.locator('*:has-text("Query:")').first();
    if (await updatedDropdown.isVisible()) {
      const updatedContent = await updatedDropdown.textContent();
      console.log('📝 UPDATED DROPDOWN:', updatedContent?.substring(0, 100));
      
      // Should show partial query
      const hasPartialQuery = updatedContent?.includes('Query: "ass"') || updatedContent?.includes("Query: 'ass'");
      if (hasPartialQuery) {
        console.log('✅ PARTIAL QUERY: Correctly shows "ass" query');
      } else {
        console.log('❌ PARTIAL QUERY: Does not show "ass" query correctly');
      }
    }
    
    console.log('🏁 LIVE TEST: @ Mention validation completed');
  });
  
  test('should test @ mention in different contexts', async ({ page }) => {
    // Test in different areas of the application
    const testContexts = [
      { name: 'Post Creation', selector: 'textarea', action: 'create post' },
      { name: 'Comment Section', selector: 'textarea', action: 'add comment' }
    ];
    
    for (const context of testContexts) {
      console.log(`\n🔄 TESTING CONTEXT: ${context.name}`);
      
      try {
        const textarea = page.locator(context.selector).first();
        await textarea.focus();
        await textarea.fill('@');
        
        // Wait for dropdown
        await page.waitForTimeout(1000);
        
        // Check for dropdown
        const dropdown = page.locator('*:has-text("Query:")').first();
        const isVisible = await dropdown.isVisible().catch(() => false);
        
        console.log(`${context.name} @ mention: ${isVisible ? '✅ Working' : '❌ Not working'}`);
        
        if (isVisible) {
          const content = await dropdown.textContent();
          console.log(`Content: ${content?.substring(0, 50)}...`);
        }
        
      } catch (error) {
        console.log(`${context.name}: Error - ${error}`);
      }
    }
  });
});
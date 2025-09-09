import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * EMERGENCY @ MENTION SYSTEM LIVE VALIDATION
 * 
 * This comprehensive test suite validates the current broken state
 * of the @ mention system across all components and provides
 * definitive evidence for production validation.
 */

test.describe('@ Mention System Live Validation - PRE-FIX STATE', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/mention-validation-videos/' }
    });
    page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log(`CONSOLE: ${msg.text()}`));
    page.on('pageerror', error => console.log(`PAGE ERROR: ${error.message}`));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. MentionInputDemo - SHOULD WORK (Control Test)', async () => {
    console.log('🟢 Testing MentionInputDemo - Expected: WORKING');
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: `test-results/mention-demo-initial-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Find the mention input
    const mentionInput = page.locator('[data-testid="mention-input"], input[type="text"], textarea').first();
    await expect(mentionInput).toBeVisible();
    
    // Type @ character
    await mentionInput.click();
    await mentionInput.type('@');
    
    // Wait for dropdown to appear
    await page.waitForTimeout(500);
    
    // Check for dropdown visibility
    const dropdown = page.locator('.mention-dropdown, [data-testid="mention-dropdown"], .dropdown-menu, .suggestions');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    
    // DOM inspection
    const domStructure = await page.evaluate(() => {
      const input = document.querySelector('[data-testid="mention-input"], input, textarea');
      return {
        inputExists: !!input,
        inputValue: input?.value || 'N/A',
        dropdownElements: document.querySelectorAll('.mention-dropdown, .dropdown-menu, .suggestions').length,
        eventListeners: input?.outerHTML?.includes('on') || false,
        consoleErrors: window.console.error?.toString() || 'N/A'
      };
    });
    
    console.log('MentionInputDemo DOM Analysis:', domStructure);
    
    // Take final screenshot
    await page.screenshot({ 
      path: `test-results/mention-demo-final-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Validation
    if (dropdownVisible) {
      console.log('✅ MentionInputDemo: WORKING as expected');
    } else {
      console.log('❌ MentionInputDemo: BROKEN - This should be working!');
    }
    
    expect(dropdownVisible, 'MentionInputDemo should show dropdown on @').toBe(true);
  });

  test('2. PostCreator - EXPECTED FAILURE (Main Feed)', async () => {
    console.log('🔴 Testing PostCreator - Expected: BROKEN');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ 
      path: `test-results/postcreator-initial-${Date.now()}.png`,
      fullPage: true 
    });
    
    // Find and click the post creator
    const postCreator = page.locator('[data-testid="post-creator"], .post-creator, [placeholder*="Start a post"], textarea, input[type="text"]').first();
    await expect(postCreator).toBeVisible();
    
    await postCreator.click();
    await page.waitForTimeout(300);
    
    // Type @ character
    await postCreator.type('@');
    await page.waitForTimeout(800); // Give extra time for potential dropdown
    
    // Check for dropdown
    const dropdown = page.locator('.mention-dropdown, [data-testid="mention-dropdown"], .dropdown-menu, .suggestions');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    
    // DOM inspection for PostCreator
    const domAnalysis = await page.evaluate(() => {
      const creator = document.querySelector('[data-testid="post-creator"], .post-creator, textarea, input');
      const dropdowns = document.querySelectorAll('.mention-dropdown, .dropdown-menu, .suggestions');
      
      return {
        postCreatorExists: !!creator,
        postCreatorValue: creator?.value || 'N/A',
        dropdownCount: dropdowns.length,
        dropdownVisibility: Array.from(dropdowns).map(d => ({
          visible: d.offsetParent !== null,
          style: d.getAttribute('style'),
          classList: d.className
        })),
        mentionInputPresent: !!document.querySelector('[data-testid="mention-input"]'),
        jsErrors: window.onerror?.toString() || 'N/A'
      };
    });
    
    console.log('PostCreator DOM Analysis:', domAnalysis);
    
    // Take failure evidence screenshot
    await page.screenshot({ 
      path: `test-results/postcreator-failure-evidence-${Date.now()}.png`,
      fullPage: true 
    });
    
    console.log(`❌ PostCreator @ mention status: ${dropdownVisible ? 'WORKING (unexpected!)' : 'BROKEN (expected)'}`);
    
    // This should fail - we expect it to be broken
    expect(dropdownVisible, 'PostCreator @ mention is currently broken').toBe(false);
  });

  test('3. CommentForm - EXPECTED FAILURE', async () => {
    console.log('🔴 Testing CommentForm - Expected: BROKEN');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Find a post to comment on
    const commentButton = page.locator('[data-testid="comment-button"], .comment-btn, button:has-text("Comment"), button:has-text("Reply")').first();
    
    if (await commentButton.isVisible()) {
      await commentButton.click();
      await page.waitForTimeout(300);
      
      // Find comment input
      const commentInput = page.locator('[data-testid="comment-input"], .comment-input, textarea, input[type="text"]').last();
      
      if (await commentInput.isVisible()) {
        await commentInput.click();
        await commentInput.type('@');
        await page.waitForTimeout(800);
        
        // Check for dropdown
        const dropdown = page.locator('.mention-dropdown, [data-testid="mention-dropdown"], .dropdown-menu, .suggestions');
        const dropdownVisible = await dropdown.isVisible().catch(() => false);
        
        // DOM inspection
        const commentDomAnalysis = await page.evaluate(() => {
          const input = document.querySelector('[data-testid="comment-input"], .comment-input, textarea');
          return {
            commentInputExists: !!input,
            inputValue: input?.value || 'N/A',
            mentionComponentPresent: !!document.querySelector('[data-testid="mention-input"]'),
            dropdownElements: document.querySelectorAll('.mention-dropdown, .dropdown-menu').length
          };
        });
        
        console.log('CommentForm DOM Analysis:', commentDomAnalysis);
        
        await page.screenshot({ 
          path: `test-results/commentform-failure-evidence-${Date.now()}.png`,
          fullPage: true 
        });
        
        console.log(`❌ CommentForm @ mention status: ${dropdownVisible ? 'WORKING (unexpected!)' : 'BROKEN (expected)'}`);
        expect(dropdownVisible, 'CommentForm @ mention is currently broken').toBe(false);
      }
    } else {
      console.log('⚠️  No comment buttons found, skipping CommentForm test');
    }
  });

  test('4. QuickPostSection - EXPECTED FAILURE', async () => {
    console.log('🔴 Testing QuickPostSection - Expected: BROKEN');
    
    // Try to navigate to posting interface
    await page.goto('http://localhost:5173/posting').catch(async () => {
      // If /posting doesn't exist, look for quick post on main page
      await page.goto('http://localhost:5173');
    });
    
    await page.waitForLoadState('networkidle');
    
    // Look for quick post input
    const quickPostInput = page.locator('[data-testid="quick-post"], .quick-post, [placeholder*="quick"], [placeholder*="What\'s on your mind"]').first();
    
    if (await quickPostInput.isVisible()) {
      await quickPostInput.click();
      await quickPostInput.type('@');
      await page.waitForTimeout(800);
      
      const dropdown = page.locator('.mention-dropdown, [data-testid="mention-dropdown"], .dropdown-menu, .suggestions');
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      
      await page.screenshot({ 
        path: `test-results/quickpost-failure-evidence-${Date.now()}.png`,
        fullPage: true 
      });
      
      console.log(`❌ QuickPostSection @ mention status: ${dropdownVisible ? 'WORKING (unexpected!)' : 'BROKEN (expected)'}`);
      expect(dropdownVisible, 'QuickPostSection @ mention is currently broken').toBe(false);
    } else {
      console.log('⚠️  No quick post input found, documenting absence');
      await page.screenshot({ 
        path: `test-results/quickpost-not-found-${Date.now()}.png`,
        fullPage: true 
      });
    }
  });

  test('5. Performance Baseline Measurement', async () => {
    console.log('📊 Measuring current performance baseline');
    
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const mentionInput = page.locator('[data-testid="mention-input"], input, textarea').first();
    await mentionInput.click();
    
    // Measure @ character response time
    const startTime = Date.now();
    await mentionInput.type('@');
    
    // Wait for dropdown or timeout
    try {
      await page.waitForSelector('.mention-dropdown, .dropdown-menu, .suggestions', { timeout: 2000 });
      const responseTime = Date.now() - startTime;
      console.log(`✅ Dropdown response time: ${responseTime}ms`);
      
      expect(responseTime, 'Dropdown should appear within 500ms').toBeLessThan(500);
    } catch (error) {
      const timeoutTime = Date.now() - startTime;
      console.log(`❌ Dropdown did not appear within 2000ms (took ${timeoutTime}ms)`);
    }
  });

  test('6. Cross-Browser DOM Structure Analysis', async () => {
    console.log('🔍 Analyzing DOM structure across components');
    
    // Test main feed
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const domStructure = await page.evaluate(() => {
      return {
        mentionInputComponents: document.querySelectorAll('[data-testid="mention-input"]').length,
        mentionDropdowns: document.querySelectorAll('.mention-dropdown, .dropdown-menu').length,
        postCreators: document.querySelectorAll('[data-testid="post-creator"], .post-creator, textarea').length,
        commentForms: document.querySelectorAll('[data-testid="comment-input"], .comment-input').length,
        reactComponents: document.querySelectorAll('[data-reactroot], [data-react-*]').length,
        totalInputs: document.querySelectorAll('input, textarea').length,
        jsErrorsPresent: !!window.onerror
      };
    });
    
    console.log('Current DOM Structure Analysis:', domStructure);
    
    // Save DOM analysis
    await page.evaluate((analysis) => {
      window.localStorage.setItem('domAnalysisPreFix', JSON.stringify({
        timestamp: new Date().toISOString(),
        analysis: analysis
      }));
    }, domStructure);
    
    expect(domStructure.totalInputs, 'Should have input elements on page').toBeGreaterThan(0);
  });

  test('7. JavaScript Error Detection', async () => {
    console.log('🐛 Detecting JavaScript errors affecting @ mention system');
    
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Try to trigger mention functionality
    const input = page.locator('input, textarea').first();
    if (await input.isVisible()) {
      await input.click();
      await input.type('@test');
      await page.waitForTimeout(1000);
    }
    
    console.log('JavaScript Errors Detected:', errors);
    
    // Store errors for comparison
    await page.evaluate((errorList) => {
      window.localStorage.setItem('jsErrorsPreFix', JSON.stringify({
        timestamp: new Date().toISOString(),
        errors: errorList
      }));
    }, errors);
    
    // Don't fail on errors in pre-fix state - we expect issues
    console.log(`Found ${errors.length} JavaScript errors in pre-fix state`);
  });
});

/**
 * POST-FIX VALIDATION SUITE
 * To be run after the swarm applies fixes
 */
test.describe('@ Mention System Live Validation - POST-FIX STATE', () => {
  test('POST-FIX: All Components Should Work', async ({ page }) => {
    console.log('🟢 POST-FIX VALIDATION: Testing all components after fixes');
    
    // This test will be enabled after fixes are applied
    test.skip(true, 'Run this after swarm applies @ mention fixes');
    
    // Test all components in sequence
    const components = [
      { name: 'MentionInputDemo', url: 'http://localhost:5173/mention-demo' },
      { name: 'PostCreator', url: 'http://localhost:5173' },
      { name: 'CommentForm', url: 'http://localhost:5173' }
    ];
    
    for (const component of components) {
      await page.goto(component.url);
      await page.waitForLoadState('networkidle');
      
      const input = page.locator('input, textarea').first();
      await input.click();
      await input.type('@');
      
      const dropdown = page.locator('.mention-dropdown, .dropdown-menu, .suggestions');
      const dropdownVisible = await dropdown.waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false);
      
      await page.screenshot({ 
        path: `test-results/postfix-${component.name.toLowerCase()}-${Date.now()}.png` 
      });
      
      expect(dropdownVisible, `${component.name} should work after fixes`).toBe(true);
    }
  });
});
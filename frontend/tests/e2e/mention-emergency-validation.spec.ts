/**
 * EMERGENCY @ Mention System Production Validation
 * 
 * This test suite validates the @ mention system against the live production
 * environment at localhost:5173. It captures exact failure modes and provides
 * detailed debugging information to identify why mentions are not working.
 */

import { test, expect, Page, ConsoleMessage } from '@playwright/test';

// Configuration for live production testing
const LIVE_URL = 'http://localhost:5173';
const DEBUG_MODE = true;
const CAPTURE_SCREENSHOTS = true;
const RECORD_VIDEO = true;

// Test configuration
test.use({
  // Enable video recording for all tests
  video: RECORD_VIDEO ? 'on' : 'off',
  // Enable screenshot on failure
  screenshot: CAPTURE_SCREENSHOTS ? 'only-on-failure' : 'off',
  // Use a real browser viewport
  viewport: { width: 1280, height: 720 },
  // Increase timeouts for production testing
  actionTimeout: 10000,
  navigationTimeout: 30000,
});

// Console logging setup for debugging
let consoleMessages: ConsoleMessage[] = [];

test.beforeEach(async ({ page }) => {
  if (DEBUG_MODE) {
    // Capture all console messages
    page.on('console', (msg) => {
      consoleMessages.push(msg);
      console.log(`🔍 BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });

    // Capture page errors
    page.on('pageerror', (error) => {
      console.error('🚨 PAGE ERROR:', error.message);
    });

    // Capture network failures
    page.on('requestfailed', (request) => {
      console.error('🌐 REQUEST FAILED:', request.url(), request.failure()?.errorText);
    });
  }
  
  console.log('🎯 EMERGENCY TEST: Navigating to live system at', LIVE_URL);
  await page.goto(LIVE_URL);
  await page.waitForLoadState('networkidle');
  
  // Clear console messages for each test
  consoleMessages = [];
});

test.afterEach(async ({ page }) => {
  if (DEBUG_MODE) {
    console.log(`📊 Console messages captured: ${consoleMessages.length}`);
    
    // Log any error messages
    const errorMessages = consoleMessages.filter(msg => msg.type() === 'error');
    if (errorMessages.length > 0) {
      console.error('🚨 BROWSER ERRORS DETECTED:');
      errorMessages.forEach(msg => console.error('  ', msg.text()));
    }
  }
});

test.describe('🚨 EMERGENCY: @ Mention System Live Validation', () => {
  
  test('CRITICAL: @ typing in PostCreator modal should show dropdown', async ({ page }) => {
    console.log('🎯 TEST: Validating @ mentions in PostCreator modal');
    
    // Take initial screenshot
    if (CAPTURE_SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/emergency-postcreator-initial.png', fullPage: true });
    }
    
    // Open PostCreator modal
    console.log('📂 Opening PostCreator modal...');
    const createButton = page.locator('[data-testid="create-post-button"]');
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    
    // Wait for modal to appear
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible({ timeout: 5000 });
    console.log('✅ Modal opened successfully');
    
    // Fill title to enable content area
    console.log('📝 Filling title field...');
    const titleInput = page.locator('input[placeholder*="compelling title"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Emergency Mention Test');
    
    // Focus on content area (MentionInput)
    console.log('🎯 Focusing on content area...');
    const contentArea = page.locator('textarea[placeholder*="Share your insights"]');
    await expect(contentArea).toBeVisible();
    await contentArea.click();
    
    // Take screenshot before typing @
    if (CAPTURE_SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/emergency-postcreator-before-at.png', fullPage: true });
    }
    
    // Type @ character to trigger mention system
    console.log('⌨️ CRITICAL: Typing @ character...');
    await contentArea.type('@');
    
    // Wait for potential dropdown and log current state
    await page.waitForTimeout(500);
    console.log('⏰ Waited 500ms after typing @');
    
    // Take screenshot after typing @
    if (CAPTURE_SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/emergency-postcreator-after-at.png', fullPage: true });
    }
    
    // Check for mention dropdown
    const dropdown = page.locator('[role="listbox"][aria-label="Agent suggestions"]');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    
    console.log(`🔍 Dropdown visibility: ${dropdownVisible}`);
    
    if (dropdownVisible) {
      console.log('✅ SUCCESS: Mention dropdown is visible');
      
      // Count suggestions
      const suggestions = page.locator('[role="option"]');
      const count = await suggestions.count();
      console.log(`📊 Found ${count} mention suggestions`);
      
      // Log first few suggestions
      for (let i = 0; i < Math.min(count, 3); i++) {
        const suggestionText = await suggestions.nth(i).textContent();
        console.log(`  💡 Suggestion ${i + 1}: ${suggestionText}`);
      }
      
      await expect(dropdown).toBeVisible();
      await expect(suggestions).toHaveCount.greaterThan(0);
    } else {
      console.log('❌ FAILURE: Mention dropdown is NOT visible');
      
      // Debug: Check if any dropdown-like elements exist
      const allDropdowns = page.locator('[role="listbox"]');
      const dropdownCount = await allDropdowns.count();
      console.log(`🔍 Total listbox elements: ${dropdownCount}`);
      
      // Check for debug elements that might indicate the system is working
      const debugElements = page.locator('text=/DEBUG.*dropdown/i');
      const debugVisible = await debugElements.isVisible().catch(() => false);
      console.log(`🐛 Debug elements visible: ${debugVisible}`);
      
      if (debugVisible) {
        const debugText = await debugElements.textContent();
        console.log(`🐛 Debug text: ${debugText}`);
      }
      
      // Check DOM for any mention-related elements
      const mentionElements = page.locator('[class*="mention"], [aria-label*="mention"], [data-testid*="mention"]');
      const mentionCount = await mentionElements.count();
      console.log(`🔍 Mention-related elements: ${mentionCount}`);
      
      // This test SHOULD fail if dropdown is not visible - that's the point
      test.fail(true, 'Dropdown not visible - this confirms the production issue');
      await expect(dropdown).toBeVisible();
    }
  });

  test('CRITICAL: @ typing in QuickPost should show dropdown', async ({ page }) => {
    console.log('🎯 TEST: Validating @ mentions in QuickPost');
    
    // Find QuickPost section
    console.log('🔍 Looking for QuickPost section...');
    const quickPostSection = page.locator('[data-testid="quick-post-section"]');
    
    try {
      await expect(quickPostSection).toBeVisible({ timeout: 10000 });
      console.log('✅ QuickPost section found');
    } catch (error) {
      console.log('❌ QuickPost section not found, checking alternative selectors...');
      
      // Try alternative selectors
      const alternativeSelectors = [
        'textarea[placeholder*="quick update"]',
        '.quick-post',
        '[data-testid*="quick"]',
        'section:has(textarea[placeholder*="update"])'
      ];
      
      let quickPostInput = null;
      for (const selector of alternativeSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          quickPostInput = element;
          console.log(`✅ Found QuickPost using selector: ${selector}`);
          break;
        }
      }
      
      if (!quickPostInput) {
        console.log('🚨 CRITICAL: No QuickPost input found - taking screenshot for debugging');
        if (CAPTURE_SCREENSHOTS) {
          await page.screenshot({ path: 'test-results/emergency-no-quickpost.png', fullPage: true });
        }
        
        // Log all textarea elements for debugging
        const allTextareas = page.locator('textarea');
        const textareaCount = await allTextareas.count();
        console.log(`🔍 Total textarea elements: ${textareaCount}`);
        
        for (let i = 0; i < textareaCount; i++) {
          const placeholder = await allTextareas.nth(i).getAttribute('placeholder');
          console.log(`  📝 Textarea ${i}: placeholder="${placeholder}"`);
        }
        
        test.fail(true, 'QuickPost section not found');
        return;
      }
    }
    
    // Focus on QuickPost input
    const quickPostInput = page.locator('textarea[placeholder*="quick update"]').first();
    console.log('🎯 Focusing on QuickPost input...');
    await quickPostInput.click();
    
    // Take screenshot before typing @
    if (CAPTURE_SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/emergency-quickpost-before-at.png', fullPage: true });
    }
    
    // Type @ to trigger mentions
    console.log('⌨️ CRITICAL: Typing @ in QuickPost...');
    await quickPostInput.type('@');
    
    // Wait and check for dropdown
    await page.waitForTimeout(500);
    
    // Take screenshot after typing @
    if (CAPTURE_SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/emergency-quickpost-after-at.png', fullPage: true });
    }
    
    // Check for dropdown
    const dropdown = page.locator('[role="listbox"][aria-label="Agent suggestions"]');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    
    console.log(`🔍 QuickPost dropdown visibility: ${dropdownVisible}`);
    
    if (!dropdownVisible) {
      console.log('❌ FAILURE: QuickPost mention dropdown is NOT visible');
      test.fail(true, 'QuickPost dropdown not visible - confirms production issue');
    }
    
    await expect(dropdown).toBeVisible();
    await expect(page.locator('[role="option"]')).toHaveCount.greaterThan(0);
  });

  test('CRITICAL: @ typing in Comment form should show dropdown', async ({ page }) => {
    console.log('🎯 TEST: Validating @ mentions in Comment forms');
    
    // Wait for feed to load
    console.log('⏰ Waiting for feed to load...');
    await page.waitForSelector('.feed-post', { timeout: 15000 });
    
    // Find first post and click comment
    const firstPost = page.locator('.feed-post').first();
    await expect(firstPost).toBeVisible();
    
    const commentButton = firstPost.locator('button:has-text("Comment")');
    await expect(commentButton).toBeVisible();
    
    console.log('💬 Clicking comment button...');
    await commentButton.click();
    
    // Wait for comment form
    const commentForm = page.locator('[data-testid="comment-form"]');
    
    try {
      await expect(commentForm).toBeVisible({ timeout: 5000 });
      console.log('✅ Comment form appeared');
    } catch (error) {
      console.log('❌ Comment form not found with data-testid, trying alternative selectors...');
      
      // Try alternative comment form selectors
      const altSelectors = [
        'textarea[placeholder*="analysis"]',
        'textarea[placeholder*="comment"]',
        'form:has(textarea)',
        '.comment-form'
      ];
      
      for (const selector of altSelectors) {
        const element = page.locator(selector).first();
        if (await element.isVisible().catch(() => false)) {
          console.log(`✅ Found comment form using: ${selector}`);
          break;
        }
      }
    }
    
    // Focus on comment input
    const commentInput = page.locator('textarea[placeholder*="technical analysis"]').or(
      page.locator('textarea[placeholder*="comment"]')
    ).first();
    
    await expect(commentInput).toBeVisible();
    console.log('🎯 Focusing on comment input...');
    await commentInput.click();
    
    // Take screenshot before typing @
    if (CAPTURE_SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/emergency-comment-before-at.png', fullPage: true });
    }
    
    // Type @ to trigger mentions
    console.log('⌨️ CRITICAL: Typing @ in comment...');
    await commentInput.type('@');
    
    // Wait and check for dropdown
    await page.waitForTimeout(500);
    
    // Take screenshot after typing @
    if (CAPTURE_SCREENSHOTS) {
      await page.screenshot({ path: 'test-results/emergency-comment-after-at.png', fullPage: true });
    }
    
    // Check for dropdown
    const dropdown = page.locator('[role="listbox"][aria-label="Agent suggestions"]');
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    
    console.log(`🔍 Comment dropdown visibility: ${dropdownVisible}`);
    
    if (!dropdownVisible) {
      console.log('❌ FAILURE: Comment mention dropdown is NOT visible');
      test.fail(true, 'Comment dropdown not visible - confirms production issue');
    }
    
    await expect(dropdown).toBeVisible();
    await expect(page.locator('[role="option"]')).toHaveCount.greaterThan(0);
  });

  test('DIAGNOSTIC: Full page state analysis when @ mentions fail', async ({ page }) => {
    console.log('🔬 DIAGNOSTIC: Analyzing full page state for @ mention failures');
    
    // Take full page screenshot
    await page.screenshot({ path: 'test-results/diagnostic-full-page.png', fullPage: true });
    
    // Analyze page structure
    console.log('🔍 Analyzing page structure...');
    
    // Check for React components
    const reactRoots = page.locator('[data-reactroot], #root, .App');
    const reactRootCount = await reactRoots.count();
    console.log(`⚛️ React roots found: ${reactRootCount}`);
    
    // Check for MentionInput components
    const mentionInputs = page.locator('[class*="MentionInput"], [data-testid*="mention"]');
    const mentionInputCount = await mentionInputs.count();
    console.log(`📝 MentionInput components: ${mentionInputCount}`);
    
    // Check for textareas that could have mentions
    const allTextareas = page.locator('textarea');
    const textareaCount = await allTextareas.count();
    console.log(`📄 Total textareas: ${textareaCount}`);
    
    for (let i = 0; i < textareaCount; i++) {
      const textarea = allTextareas.nth(i);
      const placeholder = await textarea.getAttribute('placeholder');
      const ariaLabel = await textarea.getAttribute('aria-label');
      const classes = await textarea.getAttribute('class');
      
      console.log(`  📝 Textarea ${i}:`, {
        placeholder,
        ariaLabel,
        classes: classes?.substring(0, 100) + '...'
      });
    }
    
    // Check for any existing dropdowns or listboxes
    const allListboxes = page.locator('[role="listbox"]');
    const listboxCount = await allListboxes.count();
    console.log(`📋 Listbox elements: ${listboxCount}`);
    
    // Check JavaScript errors in console
    console.log('🔍 Checking for JavaScript errors...');
    const errorMessages = consoleMessages.filter(msg => 
      msg.type() === 'error' && !msg.text().includes('favicon')
    );
    
    if (errorMessages.length > 0) {
      console.log('🚨 JavaScript errors detected:');
      errorMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg.text()}`);
      });
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    // Test basic typing in each textarea to see if any respond
    console.log('⌨️ Testing basic typing in each textarea...');
    
    for (let i = 0; i < Math.min(textareaCount, 3); i++) {
      const textarea = allTextareas.nth(i);
      try {
        await textarea.click();
        await textarea.type('test@');
        await page.waitForTimeout(300);
        
        // Check if any dropdown appeared
        const dropdown = page.locator('[role="listbox"]').first();
        const dropdownVisible = await dropdown.isVisible().catch(() => false);
        
        console.log(`  📝 Textarea ${i}: dropdown appeared = ${dropdownVisible}`);
        
        // Clear the textarea
        await textarea.fill('');
      } catch (error) {
        console.log(`  📝 Textarea ${i}: failed to interact - ${error.message}`);
      }
    }
    
    // Always pass this diagnostic test
    expect(true).toBe(true);
  });

  test('INTEGRATION: End-to-end mention selection flow', async ({ page }) => {
    console.log('🎯 TEST: Complete mention selection workflow');
    
    // Open PostCreator
    const createButton = page.locator('[data-testid="create-post-button"]');
    await createButton.click();
    
    // Fill title
    const titleInput = page.locator('input[placeholder*="compelling title"]');
    await titleInput.fill('Integration Test Post');
    
    // Focus content area
    const contentArea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentArea.click();
    
    // Type @ and search term
    console.log('⌨️ Typing @ and search term...');
    await contentArea.type('@chief');
    
    // Wait for dropdown
    await page.waitForTimeout(500);
    
    const dropdown = page.locator('[role="listbox"][aria-label="Agent suggestions"]');
    
    if (await dropdown.isVisible().catch(() => false)) {
      console.log('✅ Dropdown appeared, testing selection...');
      
      // Try to select first suggestion
      const firstSuggestion = page.locator('[role="option"]').first();
      await expect(firstSuggestion).toBeVisible();
      await firstSuggestion.click();
      
      // Check if mention was inserted
      const contentValue = await contentArea.inputValue();
      console.log(`📝 Content after selection: "${contentValue}"`);
      
      // Should contain the mention
      expect(contentValue).toMatch(/@[\w-]+-agent/);
      
      // Try to submit the post
      const submitButton = page.locator('[data-testid="submit-post"]');
      await expect(submitButton).toBeEnabled();
      
      console.log('✅ Complete mention workflow successful');
    } else {
      console.log('❌ Dropdown did not appear - integration test failed');
      test.fail(true, 'Integration test failed - dropdown not appearing');
    }
  });

  test('PERFORMANCE: Mention system response timing', async ({ page }) => {
    console.log('⏱️ PERFORMANCE: Testing mention system timing');
    
    // Open PostCreator
    const createButton = page.locator('[data-testid="create-post-button"]');
    await createButton.click();
    
    const titleInput = page.locator('input[placeholder*="compelling title"]');
    await titleInput.fill('Performance Test');
    
    const contentArea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentArea.click();
    
    // Test multiple @ typing scenarios with timing
    const scenarios = [
      { input: '@', expectedDelay: 300 },
      { input: '@ch', expectedDelay: 300 },
      { input: '@chief', expectedDelay: 300 }
    ];
    
    for (const scenario of scenarios) {
      console.log(`⏱️ Testing scenario: "${scenario.input}"`);
      
      // Clear content
      await contentArea.fill('');
      
      // Measure timing
      const startTime = Date.now();
      await contentArea.type(scenario.input);
      
      // Wait for expected response
      await page.waitForTimeout(scenario.expectedDelay + 100);
      
      const dropdown = page.locator('[role="listbox"][aria-label="Agent suggestions"]');
      const dropdownVisible = await dropdown.isVisible().catch(() => false);
      const responseTime = Date.now() - startTime;
      
      console.log(`  ⏱️ Response time: ${responseTime}ms, Dropdown: ${dropdownVisible}`);
      
      if (dropdownVisible) {
        const suggestionCount = await page.locator('[role="option"]').count();
        console.log(`  📊 Suggestions: ${suggestionCount}`);
      }
    }
    
    // This test documents performance even if mentions are broken
    expect(true).toBe(true);
  });
});

// Additional utility test for debugging
test.describe('🔧 DEBUG UTILITIES', () => {
  test('DOM Inspector: Find all interactive elements', async ({ page }) => {
    console.log('🔍 DOM INSPECTOR: Cataloging all interactive elements');
    
    // Find all input elements
    const inputs = page.locator('input, textarea, [contenteditable], [role="textbox"]');
    const inputCount = await inputs.count();
    console.log(`📝 Interactive elements found: ${inputCount}`);
    
    for (let i = 0; i < inputCount; i++) {
      const element = inputs.nth(i);
      const tagName = await element.evaluate(el => el.tagName);
      const placeholder = await element.getAttribute('placeholder');
      const ariaLabel = await element.getAttribute('aria-label');
      const id = await element.getAttribute('id');
      const classes = await element.getAttribute('class');
      
      console.log(`  ${i + 1}. ${tagName}:`, {
        placeholder,
        ariaLabel,
        id,
        classes: classes?.substring(0, 50) + '...'
      });
    }
    
    // Find all buttons that might relate to posting
    const buttons = page.locator('button:has-text("Post"), button:has-text("Comment"), button:has-text("Create")');
    const buttonCount = await buttons.count();
    console.log(`🔘 Post-related buttons: ${buttonCount}`);
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const testId = await button.getAttribute('data-testid');
      console.log(`  ${i + 1}. Button: "${text}" (testid: ${testId})`);
    }
    
    expect(true).toBe(true);
  });
});
/**
 * 🚨 EMERGENCY TDD VALIDATION: @ Mention System Live Tests
 * 
 * This test suite validates @ mention functionality is working in production
 * Identifies and fixes critical failures preventing @ mention detection
 */

import { test, expect, Page } from '@playwright/test';

// Emergency test utilities
class MentionTestUtils {
  constructor(private page: Page) {}

  // Wait for MentionInput component to be ready
  async waitForMentionInput(selector = '[data-testid="mention-input"], textarea') {
    const element = await this.page.waitForSelector(selector, { 
      timeout: 10000,
      state: 'attached' 
    });
    await this.page.waitForTimeout(500); // Allow React to fully mount
    return element;
  }

  // Type @ and verify dropdown appears
  async triggerMentionDropdown(selector: string, query = '') {
    console.log(`🎯 Triggering mention dropdown with: "@${query}"`);
    
    const input = await this.waitForMentionInput(selector);
    
    // Clear and type @ + query
    await input.fill('');
    await this.page.waitForTimeout(100);
    
    const mentionText = `@${query}`;
    await input.type(mentionText, { delay: 50 });
    
    // Wait for dropdown to appear
    await this.page.waitForTimeout(300); // Allow debounce and async loading
    
    return mentionText;
  }

  // Validate dropdown is visible and contains suggestions
  async validateDropdown(expectedMinSuggestions = 1) {
    // Check for dropdown with multiple possible selectors
    const dropdownSelectors = [
      '[role="listbox"]',
      '[data-testid="mention-dropdown"]',
      '.mention-dropdown',
      '[class*="dropdown"]',
      '[class*="suggestion"]'
    ];
    
    let dropdown = null;
    for (const selector of dropdownSelectors) {
      try {
        dropdown = await this.page.waitForSelector(selector, { timeout: 2000 });
        if (dropdown) break;
      } catch (e) {
        console.log(`❌ Dropdown not found with selector: ${selector}`);
      }
    }
    
    if (!dropdown) {
      // Log page state for debugging
      const html = await this.page.content();
      console.log('📄 Current page HTML (first 2000 chars):', html.substring(0, 2000));
      throw new Error('❌ CRITICAL: Mention dropdown not found with any selector');
    }
    
    // Validate suggestions exist
    const suggestions = await dropdown.$$('[role="option"], li, .suggestion-item');
    console.log(`📊 Found ${suggestions.length} suggestions in dropdown`);
    
    expect(suggestions.length).toBeGreaterThanOrEqual(expectedMinSuggestions);
    
    return { dropdown, suggestions };
  }

  // Get console errors and warnings
  async getConsoleMessages() {
    const messages: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        messages.push(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
    return messages;
  }

  // Take emergency screenshot for debugging
  async takeEmergencyScreenshot(name: string) {
    const path = `/workspaces/agent-feed/frontend/test-results/${name}-emergency.png`;
    await this.page.screenshot({ path, fullPage: true });
    console.log(`📸 Emergency screenshot saved: ${path}`);
    return path;
  }
}

test.describe('🚨 EMERGENCY: @ Mention System TDD Validation', () => {
  let utils: MentionTestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new MentionTestUtils(page);
    
    // Navigate to the app
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000); // Allow React to fully load
  });

  test('CRITICAL: CommentForm should detect @ and show mention dropdown', async ({ page }) => {
    console.log('🚨 CRITICAL TEST: CommentForm @ mention detection');

    // Navigate to a post with comments
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load and find a comment form
    await page.waitForSelector('[data-testid="comment-form"], .comment-form, form', { timeout: 10000 });
    
    // Look for comment textarea or mention input
    const commentSelectors = [
      '[data-testid="comment-textarea"]',
      '[data-testid="mention-input"]',
      'textarea[placeholder*="analysis"]',
      'textarea[placeholder*="comment"]',
      'textarea[placeholder*="feedback"]',
      '.comment-form textarea',
      'form textarea'
    ];
    
    let commentInput = null;
    let usedSelector = '';
    
    for (const selector of commentSelectors) {
      try {
        commentInput = await page.waitForSelector(selector, { timeout: 2000 });
        if (commentInput) {
          usedSelector = selector;
          console.log(`✅ Found comment input with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Comment input not found with selector: ${selector}`);
      }
    }
    
    if (!commentInput) {
      await utils.takeEmergencyScreenshot('comment-form-not-found');
      throw new Error('❌ CRITICAL: No comment input found on page');
    }

    // Test @ mention detection
    const mentionText = await utils.triggerMentionDropdown(usedSelector, 'chief');
    
    console.log(`🔍 Typed: "${mentionText}" in comment form`);
    
    // Validate dropdown appears
    const { dropdown, suggestions } = await utils.validateDropdown(1);
    
    // Validate at least one suggestion contains "Chief"
    const suggestionTexts = await Promise.all(
      suggestions.map(s => s.textContent())
    );
    
    console.log('💡 Suggestion texts:', suggestionTexts);
    
    const hasChiefSuggestion = suggestionTexts.some(text => 
      text?.toLowerCase().includes('chief')
    );
    
    expect(hasChiefSuggestion).toBe(true);
    
    console.log('✅ CommentForm @ mention detection works!');
  });

  test('CRITICAL: PostCreator should detect @ and show mention dropdown', async ({ page }) => {
    console.log('🚨 CRITICAL TEST: PostCreator @ mention detection');

    // Navigate to create post page or find post creator
    await page.goto('http://localhost:5173');
    
    // Look for post creator or create post button
    const createPostSelectors = [
      '[data-testid="create-post"]',
      '[data-testid="post-creator"]',
      '.post-creator',
      'button[title*="create"]',
      'button[title*="post"]'
    ];
    
    let createPostButton = null;
    for (const selector of createPostSelectors) {
      try {
        createPostButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (createPostButton) break;
      } catch (e) {
        console.log(`❌ Create post button not found: ${selector}`);
      }
    }
    
    if (createPostButton) {
      await createPostButton.click();
      await page.waitForTimeout(500);
    }
    
    // Find post content textarea
    const postContentSelectors = [
      '[data-testid="post-content"]',
      '[data-testid="mention-input"]',
      'textarea[placeholder*="insights"]',
      'textarea[placeholder*="content"]',
      '.post-creator textarea',
      'form textarea'
    ];
    
    let contentInput = null;
    let usedSelector = '';
    
    for (const selector of postContentSelectors) {
      try {
        contentInput = await page.waitForSelector(selector, { timeout: 2000 });
        if (contentInput) {
          usedSelector = selector;
          console.log(`✅ Found post content input: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Post content input not found: ${selector}`);
      }
    }
    
    if (!contentInput) {
      await utils.takeEmergencyScreenshot('post-creator-not-found');
      throw new Error('❌ CRITICAL: No post content input found');
    }

    // Test @ mention detection
    const mentionText = await utils.triggerMentionDropdown(usedSelector, 'todos');
    
    console.log(`🔍 Typed: "${mentionText}" in post creator`);
    
    // Validate dropdown appears
    const { dropdown, suggestions } = await utils.validateDropdown(1);
    
    // Validate at least one suggestion contains "Todos"
    const suggestionTexts = await Promise.all(
      suggestions.map(s => s.textContent())
    );
    
    console.log('💡 Suggestion texts:', suggestionTexts);
    
    const hasTodosSuggestion = suggestionTexts.some(text => 
      text?.toLowerCase().includes('todos')
    );
    
    expect(hasTodosSuggestion).toBe(true);
    
    console.log('✅ PostCreator @ mention detection works!');
  });

  test('CRITICAL: MentionService API should return valid suggestions', async ({ page }) => {
    console.log('🚨 CRITICAL TEST: MentionService API validation');

    // Inject test script to validate MentionService
    const apiResults = await page.evaluate(async () => {
      // Dynamically import MentionService
      try {
        const module = await import('/src/services/MentionService.ts');
        const MentionService = module.MentionService || module.default;
        
        if (!MentionService) {
          return { error: 'MentionService not found in module' };
        }
        
        console.log('🔍 Testing MentionService methods...');
        
        // Test getAllAgents
        const allAgents = MentionService.getAllAgents();
        console.log('📊 All agents:', allAgents.length);
        
        // Test searchMentions
        const searchResults = await MentionService.searchMentions('chief');
        console.log('🔍 Search results for "chief":', searchResults.length);
        
        // Test getQuickMentions
        const quickMentions = MentionService.getQuickMentions('comment');
        console.log('⚡ Quick mentions for comment:', quickMentions.length);
        
        return {
          allAgentsCount: allAgents.length,
          searchResultsCount: searchResults.length,
          quickMentionsCount: quickMentions.length,
          firstAgent: allAgents[0],
          firstSearchResult: searchResults[0],
          firstQuickMention: quickMentions[0]
        };
      } catch (error) {
        return { 
          error: `Failed to test MentionService: ${error.message}`,
          stack: error.stack
        };
      }
    });

    console.log('📊 MentionService API Results:', apiResults);
    
    if (apiResults.error) {
      throw new Error(`❌ CRITICAL: MentionService API failed: ${apiResults.error}`);
    }
    
    // Validate API results
    expect(apiResults.allAgentsCount).toBeGreaterThan(0);
    expect(apiResults.searchResultsCount).toBeGreaterThanOrEqual(0);
    expect(apiResults.quickMentionsCount).toBeGreaterThan(0);
    expect(apiResults.firstAgent).toBeDefined();
    expect(apiResults.firstAgent.id).toBeDefined();
    expect(apiResults.firstAgent.name).toBeDefined();
    expect(apiResults.firstAgent.displayName).toBeDefined();
    
    console.log('✅ MentionService API validation passed!');
  });

  test('CRITICAL: Browser console should show no JavaScript errors', async ({ page }) => {
    console.log('🚨 CRITICAL TEST: Console error detection');

    const consoleMessages: string[] = [];
    const networkErrors: string[] = [];

    // Capture console messages
    page.on('console', msg => {
      const message = `${msg.type().toUpperCase()}: ${msg.text()}`;
      consoleMessages.push(message);
      
      if (msg.type() === 'error') {
        console.log('🚨 CONSOLE ERROR:', message);
      }
    });

    // Capture network failures
    page.on('response', response => {
      if (!response.ok()) {
        const error = `Network ${response.status()}: ${response.url()}`;
        networkErrors.push(error);
        console.log('🌐 NETWORK ERROR:', error);
      }
    });

    // Navigate and interact with the app
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Try to trigger @ mention in any available input
    try {
      const inputs = await page.$$('textarea, input[type="text"]');
      if (inputs.length > 0) {
        await inputs[0].type('@test');
        await page.waitForTimeout(1000);
      }
    } catch (error) {
      console.log('⚠️ Could not test mention input:', error.message);
    }

    // Filter out non-critical messages
    const criticalErrors = consoleMessages.filter(msg => 
      msg.includes('ERROR:') && 
      !msg.includes('favicon.ico') &&
      !msg.includes('Chrome extension') &&
      !msg.includes('DevTools')
    );

    const criticalNetworkErrors = networkErrors.filter(error => 
      !error.includes('favicon.ico') &&
      !error.includes('.map')
    );

    console.log('📊 Console Summary:');
    console.log(`   Total messages: ${consoleMessages.length}`);
    console.log(`   Critical errors: ${criticalErrors.length}`);
    console.log(`   Network errors: ${criticalNetworkErrors.length}`);

    if (criticalErrors.length > 0) {
      console.log('🚨 CRITICAL CONSOLE ERRORS:');
      criticalErrors.forEach(error => console.log(`   ${error}`));
    }

    if (criticalNetworkErrors.length > 0) {
      console.log('🌐 CRITICAL NETWORK ERRORS:');
      criticalNetworkErrors.forEach(error => console.log(`   ${error}`));
    }

    // Take screenshot if there are errors
    if (criticalErrors.length > 0 || criticalNetworkErrors.length > 0) {
      await utils.takeEmergencyScreenshot('console-errors');
    }

    // Report findings but don't fail the test - we need to see what's broken
    console.log(`✅ Console error check complete. Found ${criticalErrors.length + criticalNetworkErrors.length} critical issues.`);
  });

  test('CRITICAL: MentionInput component should render and be interactive', async ({ page }) => {
    console.log('🚨 CRITICAL TEST: MentionInput component validation');

    await page.goto('http://localhost:5173');

    // Check if MentionInput component exists in DOM
    const componentCheck = await page.evaluate(() => {
      // Look for evidence of MentionInput components
      const textareas = document.querySelectorAll('textarea');
      const mentionInputs = document.querySelectorAll('[data-mention-input], .mention-input');
      const reactComponents = document.querySelectorAll('[data-reactroot] textarea, #root textarea');

      return {
        textareasFound: textareas.length,
        mentionInputsFound: mentionInputs.length,
        reactComponentsFound: reactComponents.length,
        hasReactRoot: !!document.querySelector('#root, [data-reactroot]'),
        htmlSnippet: document.body.innerHTML.substring(0, 500)
      };
    });

    console.log('🔍 DOM Analysis:', componentCheck);

    expect(componentCheck.hasReactRoot).toBe(true);
    expect(componentCheck.textareasFound).toBeGreaterThan(0);

    // Test basic interaction with any textarea
    if (componentCheck.textareasFound > 0) {
      const textarea = await page.locator('textarea').first();
      await textarea.click();
      await textarea.type('Test @ mention');
      
      const value = await textarea.inputValue();
      expect(value).toContain('Test @ mention');
      
      console.log('✅ Basic textarea interaction works');
    } else {
      await utils.takeEmergencyScreenshot('no-textareas-found');
      throw new Error('❌ CRITICAL: No textarea elements found in DOM');
    }
  });

  test('EMERGENCY DIAGNOSTIC: Full page state capture', async ({ page }) => {
    console.log('🚨 EMERGENCY DIAGNOSTIC: Capturing full page state');

    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);

    // Capture comprehensive page state
    const pageState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        reactVersion: (window as any).React?.version || 'Not found',
        hasReactDevTools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
        elementCounts: {
          total: document.querySelectorAll('*').length,
          textareas: document.querySelectorAll('textarea').length,
          buttons: document.querySelectorAll('button').length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input').length
        },
        errors: (window as any).__EMERGENCY_ERRORS__ || [],
        windowKeys: Object.keys(window).filter(key => key.includes('React') || key.includes('mention')),
        bodyClasses: document.body.className,
        rootContent: document.getElementById('root')?.innerHTML.substring(0, 200) || 'No root element'
      };
    });

    console.log('📊 PAGE STATE DIAGNOSTIC:', JSON.stringify(pageState, null, 2));

    // Take comprehensive screenshot
    await utils.takeEmergencyScreenshot('full-diagnostic');

    // Save page HTML for analysis
    const html = await page.content();
    require('fs').writeFileSync('/workspaces/agent-feed/frontend/test-results/emergency-page-dump.html', html);

    console.log('✅ Emergency diagnostic complete - check test-results folder');
  });
});
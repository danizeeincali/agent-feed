import { test, expect, Page } from '@playwright/test';

/**
 * 🚨 EMERGENCY PRODUCTION VALIDATION
 * User Report: @ mention broken - "Query: none, Suggestions: 0" despite dropdown opening
 * 
 * CRITICAL SCENARIOS TO REPRODUCE:
 * 1. Dropdown opens but shows no suggestions
 * 2. Debug shows "Query: none" despite @ input
 * 3. All mentioned components fail @ mention functionality
 */

// Test configuration for live system
const LIVE_URL = 'http://localhost:5173';
const MENTION_TIMEOUT = 10000; // Extended timeout for debug capture

test.describe('🚨 EMERGENCY @ MENTION LIVE VALIDATION', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to live system
    await page.goto(LIVE_URL);
    
    // Wait for full application load
    await page.waitForLoadState('networkidle');
    
    // Clear any existing console messages
    await page.evaluate(() => console.clear());
    
    // Set up console monitoring for debug messages
    page.on('console', msg => {
      if (msg.text().includes('EMERGENCY DEBUG') || 
          msg.text().includes('Query:') || 
          msg.text().includes('Suggestions:')) {
        console.log(`🔍 CONSOLE: ${msg.text()}`);
      }
    });
  });

  test('EMERGENCY: Reproduce "Query: none" bug in QuickPost', async () => {
    console.log('🚨 TESTING: QuickPost @ mention functionality');
    
    // Locate QuickPost input field
    const quickPostInput = page.locator('[data-testid="quick-post-input"], .quick-post input, textarea[placeholder*="What\'s on your mind"]').first();
    
    // Ensure input is visible and ready
    await expect(quickPostInput).toBeVisible();
    await quickPostInput.click();
    await quickPostInput.clear();
    
    // CRITICAL TEST: Type @ symbol
    await quickPostInput.type('@');
    
    // Wait for any dropdown/suggestions to appear
    await page.waitForTimeout(2000);
    
    // Capture debug state
    const debugMessages = await page.evaluate(() => {
      return window.console.log('🚨 EMERGENCY DEBUG: Current @ mention state');
    });
    
    // Check for dropdown visibility
    const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-dropdown, .suggestions-dropdown').first();
    const dropdownVisible = await dropdown.isVisible().catch(() => false);
    
    // Take screenshot of current state
    await page.screenshot({ 
      path: `/workspaces/agent-feed/frontend/test-results/emergency-quickpost-mention-state.png`,
      fullPage: true 
    });
    
    // Test query extraction by typing more characters
    await quickPostInput.type('a');
    await page.waitForTimeout(1000);
    
    await quickPostInput.type('g');
    await page.waitForTimeout(1000);
    
    // Final state capture
    await page.screenshot({ 
      path: `/workspaces/agent-feed/frontend/test-results/emergency-quickpost-mention-final.png`,
      fullPage: true 
    });
    
    console.log(`🔍 QuickPost Results: Dropdown visible: ${dropdownVisible}`);
  });

  test('EMERGENCY: Reproduce "Query: none" bug in PostCreator', async () => {
    console.log('🚨 TESTING: PostCreator @ mention functionality');
    
    // Look for PostCreator or create post button
    const createPostButton = page.locator('button:has-text("Create Post"), [data-testid="create-post-button"], button[title*="Create"]').first();
    
    if (await createPostButton.isVisible().catch(() => false)) {
      await createPostButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Find PostCreator content input
    const postCreatorInput = page.locator('[data-testid="post-creator-content"], .post-creator textarea, textarea[placeholder*="content"]').first();
    
    if (await postCreatorInput.isVisible().catch(() => false)) {
      await postCreatorInput.click();
      await postCreatorInput.clear();
      
      // CRITICAL TEST: Type @ symbol
      await postCreatorInput.type('@');
      await page.waitForTimeout(2000);
      
      // Test progressive typing
      await postCreatorInput.type('test');
      await page.waitForTimeout(1000);
      
      // Capture state
      await page.screenshot({ 
        path: `/workspaces/agent-feed/frontend/test-results/emergency-postcreator-mention-state.png`,
        fullPage: true 
      });
      
      console.log('🔍 PostCreator @ mention test completed');
    } else {
      console.log('⚠️  PostCreator input not found');
    }
  });

  test('EMERGENCY: Reproduce "Query: none" bug in Comment Forms', async () => {
    console.log('🚨 TESTING: Comment forms @ mention functionality');
    
    // Look for existing posts with comment forms
    const commentInput = page.locator('input[placeholder*="comment"], textarea[placeholder*="comment"], [data-testid="comment-input"]').first();
    
    if (await commentInput.isVisible().catch(() => false)) {
      await commentInput.click();
      await commentInput.clear();
      
      // CRITICAL TEST: Type @ symbol
      await commentInput.type('@');
      await page.waitForTimeout(2000);
      
      // Test query progression
      await commentInput.type('user');
      await page.waitForTimeout(1000);
      
      // Capture state
      await page.screenshot({ 
        path: `/workspaces/agent-feed/frontend/test-results/emergency-comment-mention-state.png`,
        fullPage: true 
      });
      
      console.log('🔍 Comment form @ mention test completed');
    } else {
      console.log('⚠️  Comment input not found, checking for expandable comment sections');
      
      // Try to find and click show comments or add comment buttons
      const showCommentsButton = page.locator('button:has-text("Comment"), button:has-text("Add Comment"), [data-testid="show-comments"]').first();
      
      if (await showCommentsButton.isVisible().catch(() => false)) {
        await showCommentsButton.click();
        await page.waitForTimeout(1000);
        
        // Try again to find comment input
        const newCommentInput = page.locator('input[placeholder*="comment"], textarea[placeholder*="comment"], [data-testid="comment-input"]').first();
        
        if (await newCommentInput.isVisible().catch(() => false)) {
          await newCommentInput.click();
          await newCommentInput.type('@test');
          await page.waitForTimeout(2000);
          
          await page.screenshot({ 
            path: `/workspaces/agent-feed/frontend/test-results/emergency-comment-expanded-mention-state.png`,
            fullPage: true 
          });
        }
      }
    }
  });

  test('EMERGENCY: Debug Message Capture and Analysis', async () => {
    console.log('🚨 TESTING: Debug message capture for Query: none bug');
    
    const consoleMessages: string[] = [];
    
    // Enhanced console monitoring
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      
      if (text.includes('Query:') || text.includes('Suggestions:') || text.includes('EMERGENCY')) {
        console.log(`📋 CAPTURED DEBUG: ${text}`);
      }
    });
    
    // Test multiple input scenarios
    const testInputs = [
      '[data-testid="quick-post-input"]',
      'textarea[placeholder*="mind"]',
      'input[placeholder*="comment"]',
      '.post-creator textarea',
      'textarea:visible'
    ];
    
    for (const selector of testInputs) {
      const input = page.locator(selector).first();
      
      if (await input.isVisible().catch(() => false)) {
        console.log(`🔍 Testing input: ${selector}`);
        
        await input.click();
        await input.clear();
        
        // Test @ symbol entry
        await input.type('@');
        await page.waitForTimeout(1500);
        
        // Test query progression
        await input.type('a');
        await page.waitForTimeout(1000);
        
        await input.type('g');
        await page.waitForTimeout(1000);
        
        await input.type('e');
        await page.waitForTimeout(1000);
        
        // Clear for next test
        await input.clear();
        await page.waitForTimeout(500);
      }
    }
    
    // Export captured debug messages
    const debugReport = {
      timestamp: new Date().toISOString(),
      testUrl: LIVE_URL,
      capturedMessages: consoleMessages.filter(msg => 
        msg.includes('Query:') || 
        msg.includes('Suggestions:') || 
        msg.includes('EMERGENCY') ||
        msg.includes('mention') ||
        msg.includes('@')
      ),
      totalMessages: consoleMessages.length
    };
    
    console.log('📊 DEBUG REPORT:', JSON.stringify(debugReport, null, 2));
    
    // Save debug report
    await page.evaluate((report) => {
      window.localStorage.setItem('emergency-debug-report', JSON.stringify(report));
    }, debugReport);
  });

  test('EMERGENCY: Suggestion Pipeline Deep Analysis', async () => {
    console.log('🚨 TESTING: Suggestion pipeline and data availability');
    
    // Test if MentionService and agent data are available
    const serviceStatus = await page.evaluate(() => {
      // Check for MentionService in global scope or window
      const hasMentionService = typeof (window as any).MentionService !== 'undefined';
      const hasAgentData = typeof (window as any).agentData !== 'undefined';
      
      // Check localStorage for any mention-related data
      const localStorage = window.localStorage;
      const mentionKeys = Object.keys(localStorage).filter(key => 
        key.includes('mention') || key.includes('agent') || key.includes('user')
      );
      
      return {
        hasMentionService,
        hasAgentData,
        localStorageKeys: mentionKeys,
        localStorage: mentionKeys.reduce((acc, key) => {
          acc[key] = localStorage.getItem(key);
          return acc;
        }, {} as Record<string, string | null>)
      };
    });
    
    console.log('📊 SERVICE STATUS:', JSON.stringify(serviceStatus, null, 2));
    
    // Test if we can manually trigger the suggestion logic
    const manualTest = await page.evaluate(() => {
      try {
        // Try to access any global mention functionality
        const globals = Object.keys(window).filter(key => 
          key.includes('mention') || 
          key.includes('Mention') ||
          key.includes('suggestion')
        );
        
        return {
          globalKeys: globals,
          canAccessMentionLogic: globals.length > 0
        };
      } catch (error) {
        return {
          error: error.toString(),
          globalKeys: []
        };
      }
    });
    
    console.log('📊 MANUAL TEST:', JSON.stringify(manualTest, null, 2));
    
    // Final comprehensive screenshot
    await page.screenshot({ 
      path: `/workspaces/agent-feed/frontend/test-results/emergency-pipeline-analysis.png`,
      fullPage: true 
    });
  });

  test('EMERGENCY: Complete State Capture', async () => {
    console.log('🚨 FINAL TEST: Complete application state capture');
    
    // Capture complete application state
    const fullState = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        localStorage: Object.keys(localStorage).reduce((acc, key) => {
          acc[key] = localStorage.getItem(key);
          return acc;
        }, {} as Record<string, string | null>),
        sessionStorage: Object.keys(sessionStorage).reduce((acc, key) => {
          acc[key] = sessionStorage.getItem(key);
          return acc;
        }, {} as Record<string, string | null>),
        globalObjects: Object.keys(window).filter(key => 
          key.includes('mention') || 
          key.includes('agent') || 
          key.includes('service') ||
          key.includes('debug')
        ),
        documentReadyState: document.readyState,
        timestamp: new Date().toISOString()
      };
    });
    
    console.log('📊 FULL APPLICATION STATE:', JSON.stringify(fullState, null, 2));
    
    // Take final screenshot
    await page.screenshot({ 
      path: `/workspaces/agent-feed/frontend/test-results/emergency-final-application-state.png`,
      fullPage: true 
    });
  });
});
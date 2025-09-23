import { test, expect, Page, Locator } from '@playwright/test';

/**
 * EMERGENCY @ MENTION SYSTEM VALIDATION
 * 
 * Critical TDD approach:
 * 1. Write tests that SHOULD pass but currently fail
 * 2. Identify root cause of failures
 * 3. Fix code to make tests pass
 * 4. Validate user scenarios work
 */

test.describe('EMERGENCY: @ Mention System Validation', () => {
  let page: Page;
  let mentionInput: Locator;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the emergency validation page
    await page.goto('/emergency-mention-validation.html');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify emergency validation page loaded
    await expect(page.locator('h1')).toContainText('EMERGENCY @ MENTION VALIDATION');
  });

  test('CRITICAL: @ character should trigger mention dropdown', async () => {
    console.log('🔥 EMERGENCY TEST: @ character detection');
    
    // Get the test input
    const testInput = page.locator('#test1-input');
    
    // Focus the input
    await testInput.focus();
    
    // Type @ character
    await testInput.type('@');
    
    // Verify @ character is in input
    await expect(testInput).toHaveValue('@');
    
    // Run the emergency test
    await page.click('button:has-text("🔥 Run Emergency Test")');
    
    // Wait for test to complete
    await page.waitForTimeout(1000);
    
    // Check if dropdown appeared
    const dropdown = page.locator('#test1-dropdown');
    await expect(dropdown).toBeVisible();
    
    // Verify dropdown has agent suggestions
    const dropdownItems = dropdown.locator('.dropdown-item');
    await expect(dropdownItems).toHaveCount(5); // Should have 5 mock agents
    
    // Verify test status shows passed
    const status = page.locator('#test1-status');
    await expect(status).toHaveClass(/passed/);
    
    console.log('✅ @ character detection test should pass');
  });

  test('CRITICAL: Live component integration should work', async () => {
    console.log('🚀 EMERGENCY TEST: Live component integration');
    
    // Run live component test
    await page.click('button:has-text("🚀 Test Live Component")');
    
    // Wait for component to be created
    await page.waitForTimeout(1000);
    
    // Get the live input that should be created
    const liveInput = page.locator('#live-mention-input');
    await expect(liveInput).toBeVisible();
    
    // Test real-time @ detection
    await liveInput.focus();
    await liveInput.type('@');
    
    // Should trigger dropdown
    const liveDropdown = page.locator('#live-mention-dropdown');
    await expect(liveDropdown).toBeVisible();
    
    // Type agent name
    await liveInput.type('chief');
    
    // Should filter agents
    const filteredItems = liveDropdown.locator('.dropdown-item');
    await expect(filteredItems.first()).toContainText('Chief of Staff');
    
    // Click first suggestion
    await filteredItems.first().click();
    
    // Should insert mention
    await expect(liveInput).toHaveValue('@chief-of-staff-agent ');
    
    console.log('✅ Live component integration test should pass');
  });

  test('CRITICAL: API endpoints should be accessible', async () => {
    console.log('📡 EMERGENCY TEST: API validation');
    
    // Run API test
    await page.click('button:has-text("📡 Test API Endpoints")');
    
    // Wait for API test to complete
    await page.waitForTimeout(2000);
    
    // Check test results
    const testResults = page.locator('#test3-results');
    await expect(testResults).toBeVisible();
    
    // Should show success for at least mock data availability
    await expect(testResults).toContainText('SUCCESS');
    
    // Verify API call counter increased
    const apiCallCount = page.locator('#api-calls');
    await expect(apiCallCount).toContainText('1');
    
    console.log('✅ API validation test should pass');
  });

  test('CRITICAL: User scenario reproduction', async () => {
    console.log('👤 EMERGENCY TEST: Reproduce user failure scenario');
    
    // Run user scenario test
    await page.click('button:has-text("🔥 REPRODUCE FAILURE")');
    
    // Wait for scenario to run
    await page.waitForTimeout(1000);
    
    // Get user scenario input
    const userInput = page.locator('#user-scenario-input');
    const userDropdown = page.locator('#user-scenario-dropdown');
    
    // Should have @ character
    await expect(userInput).toHaveValue('@');
    
    // Should show dropdown with agents
    await expect(userDropdown).toBeVisible();
    
    // Should have agent suggestions
    const agentItems = userDropdown.locator('.dropdown-item');
    await expect(agentItems.first()).toBeVisible();
    
    // Click first agent to test selection
    await agentItems.first().click();
    
    // Should insert mention
    const inputValue = await userInput.inputValue();
    expect(inputValue).toMatch(/@\w+/); // Should contain @mention
    
    console.log('✅ User scenario should work (or reveal exact failure)');
  });

  test('CRITICAL: Emergency fixes should resolve issues', async () => {
    console.log('🛠️ EMERGENCY TEST: Apply and validate fixes');
    
    // Apply emergency fixes
    await page.click('button:has-text("⚡ Apply Emergency Fixes")');
    
    // Wait for fixes to be applied
    await page.waitForTimeout(2000);
    
    // Check fixes status
    const fixesStatus = page.locator('#fixes-status');
    await expect(fixesStatus).toHaveClass(/passed/);
    
    // Run validation
    await page.click('button:has-text("✅ Validate Fixes")');
    
    // Wait for all tests to re-run
    await page.waitForTimeout(5000);
    
    // All test statuses should be passed after fixes
    const allStatuses = page.locator('.status');
    const statusCount = await allStatuses.count();
    
    for (let i = 0; i < statusCount; i++) {
      const status = allStatuses.nth(i);
      const statusText = await status.textContent();
      
      // Skip pending statuses, focus on test results
      if (statusText && !statusText.includes('PENDING') && !statusText.includes('CHECKING')) {
        await expect(status).toHaveClass(/passed/);
      }
    }
    
    console.log('✅ Emergency fixes should resolve all issues');
  });

  test('PRODUCTION: Real PostCreator integration', async () => {
    console.log('🌍 PRODUCTION TEST: Test actual PostCreator component');
    
    // Navigate to the main app with PostCreator
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Look for PostCreator component or mention input
    const mentionInputs = page.locator('textarea[placeholder*="mention"], textarea[placeholder*="@"]');
    
    if (await mentionInputs.count() > 0) {
      const firstInput = mentionInputs.first();
      await firstInput.focus();
      
      // Type @ to trigger mention
      await firstInput.type('@');
      
      // Look for mention dropdown - it might have different selectors
      const possibleDropdowns = [
        page.locator('[role="listbox"]'),
        page.locator('.dropdown'),
        page.locator('[class*="dropdown"]'),
        page.locator('[class*="suggestion"]'),
        page.locator('[data-testid*="mention"]'),
        page.locator('[data-testid*="dropdown"]')
      ];
      
      let dropdownFound = false;
      for (const dropdown of possibleDropdowns) {
        if (await dropdown.count() > 0 && await dropdown.first().isVisible()) {
          console.log('✅ Found mention dropdown in production');
          
          // Look for agent suggestions
          const suggestions = dropdown.locator('[role="option"], .dropdown-item, [class*="suggestion"]');
          if (await suggestions.count() > 0) {
            console.log(`✅ Found ${await suggestions.count()} agent suggestions`);
            dropdownFound = true;
            
            // Try to click first suggestion
            await suggestions.first().click();
            
            // Verify mention was inserted
            const inputValue = await firstInput.inputValue();
            expect(inputValue).toMatch(/@\w+/);
            console.log('✅ Mention insertion working in production');
          }
          break;
        }
      }
      
      if (!dropdownFound) {
        console.log('❌ CRITICAL: No mention dropdown found in production');
        throw new Error('Mention dropdown not appearing in production - confirms user issue!');
      }
      
    } else {
      console.log('❌ CRITICAL: No mention input found in production app');
      throw new Error('No mention-enabled inputs found in production app');
    }
  });

  test('INTEGRATION: End-to-end mention workflow', async () => {
    console.log('🔄 INTEGRATION TEST: Complete mention workflow');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try to find any text input or textarea where mentions should work
    const textInputs = page.locator('textarea, input[type="text"]');
    const inputCount = await textInputs.count();
    
    console.log(`Found ${inputCount} text inputs to test`);
    
    for (let i = 0; i < Math.min(inputCount, 3); i++) { // Test max 3 inputs
      const input = textInputs.nth(i);
      
      try {
        await input.focus();
        await input.clear();
        
        // Full workflow test
        console.log(`Testing input ${i + 1}: typing @`);
        await input.type('@');
        
        // Wait briefly for dropdown
        await page.waitForTimeout(500);
        
        // Look for any visible dropdown/suggestion elements
        const dropdownVisible = await page.locator('[role="listbox"]:visible, .dropdown:visible').count() > 0;
        
        if (dropdownVisible) {
          console.log(`✅ Input ${i + 1}: Dropdown appeared`);
          
          // Type agent name
          await input.type('chief');
          await page.waitForTimeout(300);
          
          // Look for filtered suggestions
          const suggestions = page.locator('[role="option"]:visible, .dropdown-item:visible');
          const suggestionCount = await suggestions.count();
          
          if (suggestionCount > 0) {
            console.log(`✅ Input ${i + 1}: Found ${suggestionCount} filtered suggestions`);
            
            // Select first suggestion
            await suggestions.first().click();
            
            // Verify mention was inserted
            const finalValue = await input.inputValue();
            if (finalValue.includes('@')) {
              console.log(`✅ Input ${i + 1}: Mention inserted successfully - ${finalValue}`);
            } else {
              console.log(`❌ Input ${i + 1}: Mention not inserted - value: ${finalValue}`);
            }
          } else {
            console.log(`❌ Input ${i + 1}: No suggestions after typing 'chief'`);
          }
        } else {
          console.log(`❌ Input ${i + 1}: No dropdown appeared after typing @`);
        }
        
      } catch (error) {
        console.log(`❌ Input ${i + 1}: Error during test - ${error.message}`);
      }
    }
    
    console.log('🔄 End-to-end workflow test completed');
  });

  test('DEBUGGING: Capture mention system state', async () => {
    console.log('🔍 DEBUG TEST: Capture system state for diagnosis');
    
    await page.goto('/emergency-mention-validation.html');
    
    // Capture all relevant debug information
    const debugInfo = await page.evaluate(() => {
      const info = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        location: window.location.href,
        mentionInputExists: !!document.querySelector('textarea[placeholder*="mention"], textarea[placeholder*="@"]'),
        dropdownExists: !!document.querySelector('[role="listbox"], .dropdown, [class*="dropdown"]'),
        javascriptErrors: [],
        consoleMessages: [],
        availableFunctions: {
          findMentionQuery: typeof window.findMentionQuery,
          showDropdown: typeof window.showDropdown,
          handleLiveMentionInput: typeof window.handleLiveMentionInput
        },
        documentReady: document.readyState,
        mentionServiceAvailable: false
      };
      
      // Try to detect if MentionService is available
      try {
        info.mentionServiceAvailable = !!(window as any).MentionService || 
          !!(window as any).findMentionQuery;
      } catch (e) {
        info.mentionServiceAvailable = false;
      }
      
      return info;
    });
    
    console.log('🔍 System Debug Info:', JSON.stringify(debugInfo, null, 2));
    
    // Save debug info to test results
    await page.evaluate((info) => {
      (window as any).debugInfo = info;
    }, debugInfo);
    
    // Verify we captured useful information
    expect(debugInfo.timestamp).toBeDefined();
    expect(debugInfo.userAgent).toBeDefined();
    expect(debugInfo.documentReady).toBe('complete');
    
    console.log('✅ Debug information captured successfully');
  });

  test.afterEach(async () => {
    // Capture any JavaScript errors or console messages
    const errors = await page.evaluate(() => {
      return (window as any).testErrors || [];
    });
    
    if (errors.length > 0) {
      console.log('JavaScript Errors Detected:', errors);
    }
  });
});

test.describe('REAL-TIME: Live System Monitoring', () => {
  test('Monitor mention system health', async ({ page }) => {
    console.log('📊 MONITORING: Real-time system health');
    
    await page.goto('/emergency-mention-validation.html');
    
    // Monitor for 30 seconds
    const startTime = Date.now();
    const healthChecks = [];
    
    while (Date.now() - startTime < 30000) { // 30 seconds
      const health = await page.evaluate(() => {
        return {
          timestamp: Date.now(),
          frontendStatus: document.getElementById('frontend-status')?.textContent,
          backendStatus: document.getElementById('backend-status')?.textContent,
          mentionStatus: document.getElementById('mention-status')?.textContent,
          apiCalls: document.getElementById('api-calls')?.textContent
        };
      });
      
      healthChecks.push(health);
      
      // Wait 5 seconds between checks
      await page.waitForTimeout(5000);
    }
    
    console.log('📊 Health monitoring results:', healthChecks);
    
    // Verify system remained stable
    expect(healthChecks.length).toBeGreaterThan(5);
    expect(healthChecks[healthChecks.length - 1].frontendStatus).toBe('ONLINE');
  });
});
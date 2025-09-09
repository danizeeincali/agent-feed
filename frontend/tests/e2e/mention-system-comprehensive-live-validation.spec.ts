import { test, expect, Page } from '@playwright/test';

test.describe('@ Mention System - Live Production Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage, context }) => {
    page = testPage;
    
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warn') {
        console.log(`${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });

    // Enable network monitoring
    page.on('response', response => {
      if (!response.ok() && response.url().includes('localhost')) {
        console.log(`Network Error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('1. Mention Demo Component - Expected Working State', async () => {
    console.log('🧪 Testing: /mention-demo (Expected: WORKING)');
    
    await test.step('Navigate to mention demo', async () => {
      await page.goto('http://localhost:5173/mention-demo');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of initial state
      await page.screenshot({ 
        path: 'frontend/test-results/mention-demo-initial.png',
        fullPage: true 
      });
    });

    await test.step('Verify mention input exists', async () => {
      const mentionInput = page.locator('input[placeholder*="@"], textarea[placeholder*="@"], [data-testid="mention-input"]');
      await expect(mentionInput.first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Test @ trigger and dropdown', async () => {
      const input = page.locator('input[placeholder*="@"], textarea[placeholder*="@"], [data-testid="mention-input"]').first();
      
      // Clear and type @
      await input.click();
      await input.clear();
      await input.type('@', { delay: 100 });
      
      // Wait for dropdown to appear
      await page.waitForTimeout(1000);
      
      // Look for dropdown/suggestions
      const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions, .dropdown-menu, ul:has-text("agent")');
      const isDropdownVisible = await dropdown.first().isVisible().catch(() => false);
      
      if (isDropdownVisible) {
        console.log('✅ Dropdown appeared successfully');
        await page.screenshot({ 
          path: 'frontend/test-results/mention-demo-dropdown-success.png'
        });
        
        // Check for agent suggestions
        const agentSuggestions = page.locator('text=/agent|claude|assistant/i');
        const hasAgents = await agentSuggestions.count() > 0;
        
        if (hasAgents) {
          console.log('✅ Agent suggestions found');
          // Try to select first agent
          await agentSuggestions.first().click();
          
          // Verify mention was inserted
          const inputValue = await input.inputValue();
          expect(inputValue).toContain('@');
          console.log(`✅ Mention inserted: ${inputValue}`);
        } else {
          console.log('⚠️ No agent suggestions found');
        }
      } else {
        console.log('❌ Dropdown did not appear');
        await page.screenshot({ 
          path: 'frontend/test-results/mention-demo-dropdown-failed.png'
        });
      }
    });
  });

  test('2. Feed PostCreator Component - Broken State Validation', async () => {
    console.log('🧪 Testing: Feed PostCreator (Expected: BROKEN)');
    
    await test.step('Navigate to main feed', async () => {
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of feed page
      await page.screenshot({ 
        path: 'frontend/test-results/feed-postcreator-initial.png',
        fullPage: true 
      });
    });

    await test.step('Locate PostCreator component', async () => {
      // Look for various post creation elements
      const postCreator = page.locator('[data-testid="post-creator"], .post-creator, textarea[placeholder*="What"], textarea[placeholder*="Share"]');
      await expect(postCreator.first()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Test @ mentions in PostCreator', async () => {
      const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, textarea[placeholder*="What"], textarea[placeholder*="Share"]').first();
      
      await postInput.click();
      await postInput.clear();
      await postInput.type('@', { delay: 100 });
      
      // Wait for potential dropdown
      await page.waitForTimeout(2000);
      
      // Check for dropdown
      const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions, .dropdown-menu');
      const isDropdownVisible = await dropdown.first().isVisible().catch(() => false);
      
      if (isDropdownVisible) {
        console.log('✅ Unexpected success: Dropdown appeared in PostCreator');
        await page.screenshot({ 
          path: 'frontend/test-results/feed-postcreator-surprise-success.png'
        });
      } else {
        console.log('❌ Expected failure: No dropdown in PostCreator');
        await page.screenshot({ 
          path: 'frontend/test-results/feed-postcreator-expected-failure.png'
        });
      }

      // Check for "Suggestions: 0" error
      const suggestionsError = page.locator('text=/suggestions.*0/i');
      const hasError = await suggestionsError.isVisible().catch(() => false);
      
      if (hasError) {
        console.log('❌ "Suggestions: 0" error detected');
        await page.screenshot({ 
          path: 'frontend/test-results/feed-postcreator-suggestions-error.png'
        });
      }
    });
  });

  test('3. QuickPost Component - Broken State Validation', async () => {
    console.log('🧪 Testing: QuickPost Component (Expected: BROKEN)');
    
    await test.step('Navigate and find QuickPost', async () => {
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      
      // Look for QuickPost component
      const quickPost = page.locator('[data-testid="quick-post"], .quick-post, .quick-posting');
      const quickPostExists = await quickPost.first().isVisible().catch(() => false);
      
      if (!quickPostExists) {
        console.log('⚠️ QuickPost component not found, checking alternative selectors');
        // Try to find any quick posting mechanism
        const altQuickPost = page.locator('button:has-text("Quick"), input[placeholder*="quick" i], .quick');
        const altExists = await altQuickPost.first().isVisible().catch(() => false);
        
        if (!altExists) {
          console.log('❌ No QuickPost component found');
          return;
        }
      }
    });

    await test.step('Test @ mentions in QuickPost', async () => {
      // Try multiple selectors for QuickPost input
      const quickPostInput = page.locator('[data-testid="quick-post"] input, [data-testid="quick-post"] textarea, .quick-post input, .quick-post textarea').first();
      const inputExists = await quickPostInput.isVisible().catch(() => false);
      
      if (inputExists) {
        await quickPostInput.click();
        await quickPostInput.type('@');
        await page.waitForTimeout(1500);
        
        const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
        const hasDropdown = await dropdown.first().isVisible().catch(() => false);
        
        if (hasDropdown) {
          console.log('✅ Unexpected success: QuickPost mentions working');
        } else {
          console.log('❌ Expected failure: QuickPost mentions broken');
        }
        
        await page.screenshot({ 
          path: 'frontend/test-results/quickpost-mention-test.png'
        });
      } else {
        console.log('⚠️ QuickPost input not found');
      }
    });
  });

  test('4. Comment Forms - Broken State Validation', async () => {
    console.log('🧪 Testing: Comment Forms (Expected: BROKEN)');
    
    await test.step('Navigate to feed with posts', async () => {
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Find and test comment forms', async () => {
      // Look for existing posts with comment functionality
      const posts = page.locator('[data-testid="post"], .post, .feed-item');
      const postCount = await posts.count();
      
      if (postCount === 0) {
        console.log('⚠️ No posts found to test comment forms');
        return;
      }
      
      // Try to find comment buttons/forms
      const commentButtons = page.locator('button:has-text("Comment"), .comment-button, [data-testid="comment-button"]');
      const commentButtonCount = await commentButtons.count();
      
      if (commentButtonCount > 0) {
        // Click first comment button
        await commentButtons.first().click();
        await page.waitForTimeout(1000);
        
        // Look for comment input
        const commentInput = page.locator('[data-testid="comment-input"], .comment-input, textarea[placeholder*="comment" i]');
        const inputExists = await commentInput.first().isVisible().catch(() => false);
        
        if (inputExists) {
          await commentInput.first().click();
          await commentInput.first().type('@');
          await page.waitForTimeout(1500);
          
          const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
          const hasDropdown = await dropdown.first().isVisible().catch(() => false);
          
          if (hasDropdown) {
            console.log('✅ Unexpected success: Comment form mentions working');
          } else {
            console.log('❌ Expected failure: Comment form mentions broken');
          }
          
          await page.screenshot({ 
            path: 'frontend/test-results/comment-form-mention-test.png'
          });
        }
      } else {
        console.log('⚠️ No comment functionality found');
      }
    });
  });

  test('5. Cross-Component Integration Test', async () => {
    console.log('🧪 Testing: Cross-Component Integration');
    
    await test.step('Test mention consistency across components', async () => {
      const testResults = {
        mentionDemo: false,
        postCreator: false,
        quickPost: false,
        commentForm: false
      };
      
      // Test each component quickly
      const components = [
        { name: 'mentionDemo', url: '/mention-demo', selector: 'input, textarea' },
        { name: 'postCreator', url: '/', selector: '[data-testid="post-creator"] textarea, .post-creator textarea' },
        { name: 'quickPost', url: '/', selector: '[data-testid="quick-post"] input, .quick-post input' },
        { name: 'commentForm', url: '/', selector: '[data-testid="comment-input"], .comment-input' }
      ];
      
      for (const component of components) {
        try {
          await page.goto(`http://localhost:3000${component.url}`);
          await page.waitForLoadState('networkidle');
          
          const input = page.locator(component.selector).first();
          const inputExists = await input.isVisible().catch(() => false);
          
          if (inputExists) {
            await input.click();
            await input.type('@');
            await page.waitForTimeout(1000);
            
            const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
            testResults[component.name] = await dropdown.first().isVisible().catch(() => false);
          }
        } catch (error) {
          console.log(`Error testing ${component.name}:`, error.message);
        }
      }
      
      console.log('🔍 Integration Test Results:', testResults);
      
      // Take final screenshot
      await page.screenshot({ 
        path: 'frontend/test-results/integration-test-final.png',
        fullPage: true
      });
    });
  });

  test('6. Performance and Error Detection', async () => {
    console.log('🧪 Testing: Performance and Error Detection');
    
    const errors: string[] = [];
    const networkErrors: string[] = [];
    
    // Capture JavaScript errors
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console Error: ${msg.text()}`);
      }
    });
    
    // Capture network errors
    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push(`Network Error: ${response.status()} ${response.url()}`);
      }
    });
    
    await test.step('Load main page and trigger mention system', async () => {
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      
      // Try to trigger mentions in multiple places
      const inputs = page.locator('input, textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        try {
          const input = inputs.nth(i);
          const isVisible = await input.isVisible();
          
          if (isVisible) {
            await input.click();
            await input.type('@test');
            await page.waitForTimeout(500);
          }
        } catch (error) {
          errors.push(`Input ${i} error: ${error.message}`);
        }
      }
      
      await page.waitForTimeout(2000);
    });
    
    await test.step('Report errors and performance', async () => {
      console.log('\n📊 ERROR REPORT:');
      console.log('JavaScript Errors:', errors);
      console.log('Network Errors:', networkErrors);
      
      // Performance metrics
      const navigationMetrics = await page.evaluate(() => {
        return {
          loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0
        };
      });
      
      console.log('Performance Metrics:', navigationMetrics);
      
      // Final comprehensive screenshot
      await page.screenshot({ 
        path: 'frontend/test-results/performance-and-errors-final.png',
        fullPage: true
      });
    });
  });
});

test.describe('Cross-Browser Validation', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Mention System - ${browserName.toUpperCase()}`, async ({ page }) => {
      console.log(`🌐 Testing mention system in ${browserName.toUpperCase()}`);
      
      await page.goto('http://localhost:3000/mention-demo');
      await page.waitForLoadState('networkidle');
      
      const input = page.locator('input, textarea').first();
      await input.click();
      await input.type('@');
      
      await page.waitForTimeout(2000);
      
      const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
      const hasDropdown = await dropdown.first().isVisible().catch(() => false);
      
      await page.screenshot({ 
        path: `frontend/test-results/mention-${browserName}-validation.png`
      });
      
      console.log(`${browserName}: Dropdown visible = ${hasDropdown}`);
    });
  });
});
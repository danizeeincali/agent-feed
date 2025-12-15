import { test, expect, Page, Browser } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

interface ValidationResult {
  component: string;
  working: boolean;
  errors: string[];
  screenshots: string[];
  performance: any;
  timestamp: string;
}

interface ProductionValidationReport {
  testSession: string;
  timestamp: string;
  results: ValidationResult[];
  summary: {
    totalComponents: number;
    workingComponents: number;
    brokenComponents: number;
    criticalErrors: string[];
  };
  crossBrowserResults: { [browser: string]: boolean };
}

test.describe('Production Mention System Validator', () => {
  let validationReport: ProductionValidationReport;

  test.beforeAll(async () => {
    validationReport = {
      testSession: `validation-${Date.now()}`,
      timestamp: new Date().toISOString(),
      results: [],
      summary: {
        totalComponents: 0,
        workingComponents: 0,
        brokenComponents: 0,
        criticalErrors: []
      },
      crossBrowserResults: {}
    };
  });

  test.afterAll(async () => {
    // Save comprehensive validation report
    const reportPath = path.join(process.cwd(), 'frontend/test-results/production-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(validationReport, null, 2));
    
    console.log('\n🔍 PRODUCTION VALIDATION COMPLETE');
    console.log('📊 Summary:', validationReport.summary);
    console.log('📁 Full report saved to:', reportPath);
  });

  test('LIVE PRODUCTION: Mention Demo Component Deep Validation', async ({ page }) => {
    const result: ValidationResult = {
      component: 'mention-demo',
      working: false,
      errors: [],
      screenshots: [],
      performance: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Performance monitoring
      const startTime = Date.now();
      
      await page.goto('http://localhost:5173/mention-demo', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      result.performance.loadTime = loadTime;

      // Screenshot initial state
      const initialScreenshot = 'frontend/test-results/prod-mention-demo-initial.png';
      await page.screenshot({ path: initialScreenshot, fullPage: true });
      result.screenshots.push(initialScreenshot);

      // Comprehensive component detection
      const mentionInputs = await page.locator('input, textarea, [contenteditable="true"]').all();
      
      if (mentionInputs.length === 0) {
        result.errors.push('No input elements found on mention demo page');
        validationReport.results.push(result);
        return;
      }

      // Test each input for mention functionality
      for (let i = 0; i < mentionInputs.length; i++) {
        const input = mentionInputs[i];
        
        try {
          await input.click();
          await input.clear();
          await input.type('@', { delay: 50 });
          
          // Wait for dropdown with multiple strategies
          await Promise.race([
            page.waitForSelector('[data-testid="mention-dropdown"]', { timeout: 3000 }),
            page.waitForSelector('.mention-suggestions', { timeout: 3000 }),
            page.waitForSelector('ul:has-text("agent")', { timeout: 3000 }),
            new Promise(resolve => setTimeout(resolve, 3000))
          ]);

          // Check if dropdown appeared
          const dropdownVisible = await page.locator('[data-testid="mention-dropdown"], .mention-suggestions, ul:has-text("agent")').first().isVisible().catch(() => false);
          
          if (dropdownVisible) {
            result.working = true;
            
            // Screenshot successful state
            const successScreenshot = `frontend/test-results/prod-mention-demo-success-${i}.png`;
            await page.screenshot({ path: successScreenshot });
            result.screenshots.push(successScreenshot);
            
            // Test agent selection
            const agents = page.locator('text=/agent|claude|assistant/i');
            const agentCount = await agents.count();
            
            if (agentCount > 0) {
              await agents.first().click();
              const finalValue = await input.inputValue();
              
              if (finalValue.includes('@')) {
                console.log(`✅ Mention Demo Input ${i}: WORKING (${finalValue})`);
              } else {
                result.errors.push(`Input ${i}: Agent selection failed`);
              }
            } else {
              result.errors.push(`Input ${i}: No agent suggestions found`);
            }
            
          } else {
            result.errors.push(`Input ${i}: No dropdown appeared after typing @`);
            
            // Screenshot failed state
            const failScreenshot = `frontend/test-results/prod-mention-demo-fail-${i}.png`;
            await page.screenshot({ path: failScreenshot });
            result.screenshots.push(failScreenshot);
          }
          
        } catch (error) {
          result.errors.push(`Input ${i}: ${error.message}`);
        }
      }

      // Check for JavaScript errors
      page.on('pageerror', error => {
        result.errors.push(`JavaScript Error: ${error.message}`);
        validationReport.summary.criticalErrors.push(error.message);
      });

      // Performance final measurement
      result.performance.totalTestTime = Date.now() - startTime;
      
    } catch (error) {
      result.errors.push(`Critical Error: ${error.message}`);
      validationReport.summary.criticalErrors.push(error.message);
    }

    validationReport.results.push(result);
    validationReport.summary.totalComponents++;
    
    if (result.working) {
      validationReport.summary.workingComponents++;
      console.log('✅ Mention Demo: PRODUCTION READY');
    } else {
      validationReport.summary.brokenComponents++;
      console.log('❌ Mention Demo: PRODUCTION ISSUES DETECTED');
      console.log('Errors:', result.errors);
    }
  });

  test('LIVE PRODUCTION: Feed PostCreator Deep Validation', async ({ page }) => {
    const result: ValidationResult = {
      component: 'feed-postcreator',
      working: false,
      errors: [],
      screenshots: [],
      performance: {},
      timestamp: new Date().toISOString()
    };

    try {
      const startTime = Date.now();
      
      await page.goto('http://localhost:5173/', { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      
      result.performance.loadTime = Date.now() - startTime;

      // Screenshot feed page
      const feedScreenshot = 'frontend/test-results/prod-feed-initial.png';
      await page.screenshot({ path: feedScreenshot, fullPage: true });
      result.screenshots.push(feedScreenshot);

      // Find PostCreator with multiple strategies
      const postCreatorSelectors = [
        '[data-testid="post-creator"]',
        '.post-creator',
        'textarea[placeholder*="What"]',
        'textarea[placeholder*="Share"]',
        'textarea[placeholder*="post" i]',
        '.posting-area textarea'
      ];

      let postCreatorInput = null;
      let selectorUsed = '';

      for (const selector of postCreatorSelectors) {
        const element = page.locator(selector);
        if (await element.first().isVisible().catch(() => false)) {
          postCreatorInput = element.first();
          selectorUsed = selector;
          break;
        }
      }

      if (!postCreatorInput) {
        result.errors.push('PostCreator component not found with any selector');
        validationReport.results.push(result);
        return;
      }

      console.log(`Found PostCreator using selector: ${selectorUsed}`);

      // Test mention functionality
      await postCreatorInput.click();
      await postCreatorInput.clear();
      await postCreatorInput.type('Testing mention system @', { delay: 100 });

      // Wait for dropdown
      await page.waitForTimeout(2000);

      // Check for dropdown
      const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions, .dropdown-menu');
      const dropdownVisible = await dropdown.first().isVisible().catch(() => false);

      if (dropdownVisible) {
        result.working = true;
        console.log('✅ UNEXPECTED SUCCESS: PostCreator mentions working');
        
        const successScreenshot = 'frontend/test-results/prod-postcreator-unexpected-success.png';
        await page.screenshot({ path: successScreenshot });
        result.screenshots.push(successScreenshot);
        
      } else {
        console.log('❌ EXPECTED FAILURE: PostCreator mentions broken');
        result.errors.push('No mention dropdown appears in PostCreator');
        
        const failScreenshot = 'frontend/test-results/prod-postcreator-expected-failure.png';
        await page.screenshot({ path: failScreenshot });
        result.screenshots.push(failScreenshot);
      }

      // Check for "Suggestions: 0" error
      const suggestionsError = page.locator('text=/suggestions.*0/i, text=/no.*suggestions/i');
      const hasError = await suggestionsError.first().isVisible().catch(() => false);
      
      if (hasError) {
        result.errors.push('Suggestions: 0 error detected in PostCreator');
        console.log('❌ Critical: "Suggestions: 0" error found');
      }

      // Check console errors specifically for mention system
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('mention')) {
          result.errors.push(`Console Error: ${msg.text()}`);
        }
      });

      result.performance.totalTestTime = Date.now() - startTime;

    } catch (error) {
      result.errors.push(`Critical Error: ${error.message}`);
    }

    validationReport.results.push(result);
    validationReport.summary.totalComponents++;
    
    if (result.working) {
      validationReport.summary.workingComponents++;
      console.log('✅ PostCreator: PRODUCTION READY');
    } else {
      validationReport.summary.brokenComponents++;
      console.log('❌ PostCreator: PRODUCTION ISSUES CONFIRMED');
    }
  });

  test('LIVE PRODUCTION: Real-Time Functionality Test', async ({ page }) => {
    console.log('🚀 REAL-TIME FUNCTIONALITY VALIDATION');
    
    const realTimeResult: ValidationResult = {
      component: 'real-time-system',
      working: false,
      errors: [],
      screenshots: [],
      performance: {},
      timestamp: new Date().toISOString()
    };

    try {
      // Test real-time mention detection
      await page.goto('http://localhost:5173/mention-demo');
      await page.waitForLoadState('networkidle');

      const input = page.locator('input, textarea').first();
      
      // Real-time typing test
      await input.click();
      
      const testSequence = ['H', 'e', 'l', 'l', 'o', ' ', '@'];
      for (const char of testSequence) {
        await input.type(char, { delay: 200 });
        
        if (char === '@') {
          // Immediate check for dropdown
          await page.waitForTimeout(500);
          const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
          const appeared = await dropdown.first().isVisible().catch(() => false);
          
          if (appeared) {
            realTimeResult.working = true;
            console.log('✅ Real-time mention detection: WORKING');
            
            // Test real-time filtering
            await input.type('a', { delay: 100 });
            await page.waitForTimeout(300);
            
            const filteredSuggestions = page.locator('text=/agent/i');
            const hasFiltered = await filteredSuggestions.count() > 0;
            
            if (hasFiltered) {
              console.log('✅ Real-time filtering: WORKING');
            } else {
              realTimeResult.errors.push('Real-time filtering not working');
            }
          } else {
            realTimeResult.errors.push('Real-time mention detection failed');
          }
        }
      }

      // Performance test - rapid typing
      const rapidTest = async () => {
        await input.clear();
        const rapidSequence = '@agent@user@test';
        
        const startTime = Date.now();
        await input.type(rapidSequence, { delay: 50 });
        const endTime = Date.now();
        
        realTimeResult.performance.rapidTypingTime = endTime - startTime;
        
        // Check if system handles rapid input
        await page.waitForTimeout(1000);
        const finalDropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
        const stillWorking = await finalDropdown.first().isVisible().catch(() => false);
        
        if (!stillWorking) {
          realTimeResult.errors.push('System fails with rapid input');
        }
      };

      await rapidTest();

    } catch (error) {
      realTimeResult.errors.push(`Real-time test error: ${error.message}`);
    }

    validationReport.results.push(realTimeResult);
    
    // Final comprehensive screenshot
    await page.screenshot({ 
      path: 'frontend/test-results/prod-realtime-final.png',
      fullPage: true 
    });
  });

  test('CROSS-BROWSER PRODUCTION VALIDATION', async ({ browserName, page }) => {
    console.log(`🌐 Cross-browser validation: ${browserName.toUpperCase()}`);
    
    try {
      await page.goto('http://localhost:5173/mention-demo');
      await page.waitForLoadState('networkidle');

      const input = page.locator('input, textarea').first();
      await input.click();
      await input.type('@');
      
      await page.waitForTimeout(2000);
      
      const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
      const working = await dropdown.first().isVisible().catch(() => false);
      
      validationReport.crossBrowserResults[browserName] = working;
      
      await page.screenshot({ 
        path: `frontend/test-results/cross-browser-${browserName}-validation.png`
      });
      
      console.log(`${browserName.toUpperCase()}: ${working ? '✅ WORKING' : '❌ BROKEN'}`);
      
    } catch (error) {
      validationReport.crossBrowserResults[browserName] = false;
      validationReport.summary.criticalErrors.push(`${browserName}: ${error.message}`);
    }
  });
});
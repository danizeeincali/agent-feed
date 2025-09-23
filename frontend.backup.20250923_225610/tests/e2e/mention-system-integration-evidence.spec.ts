import { test, expect } from '@playwright/test';

test.describe('Mention System Integration Evidence Collection', () => {
  
  test('Evidence 1: Working Mention Demo vs Broken Feed Components', async ({ page }) => {
    console.log('📸 Collecting visual evidence of working vs broken states');
    
    // Test 1: Mention Demo (Working)
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const demoInput = page.locator('input, textarea').first();
    await demoInput.click();
    await demoInput.type('@');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'frontend/test-results/evidence-working-mention-demo.png',
      fullPage: true 
    });
    
    // Test 2: Main Feed (Broken)
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    
    // Try to find post creator
    const postInput = page.locator('textarea, input[placeholder*="post" i], [data-testid="post-creator"]').first();
    const inputExists = await postInput.isVisible().catch(() => false);
    
    if (inputExists) {
      await postInput.click();
      await postInput.type('@');
      await page.waitForTimeout(1500);
      
      await page.screenshot({ 
        path: 'frontend/test-results/evidence-broken-feed-postcreator.png',
        fullPage: true 
      });
      
      // Check for any mention-related elements
      const mentionElements = page.locator('[data-testid*="mention"], .mention, [class*="mention"]');
      const mentionCount = await mentionElements.count();
      
      console.log(`📊 Mention elements found in feed: ${mentionCount}`);
    }
    
    await page.screenshot({ 
      path: 'frontend/test-results/evidence-main-feed-overview.png',
      fullPage: true 
    });
  });

  test('Evidence 2: Component Architecture Analysis', async ({ page }) => {
    console.log('🔍 Analyzing component architecture for mention integration');
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    
    // Analyze page structure
    const analysisScript = `
      return {
        postCreatorElements: Array.from(document.querySelectorAll('[data-testid="post-creator"], .post-creator, textarea')).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          placeholder: el.placeholder
        })),
        mentionElements: Array.from(document.querySelectorAll('[data-testid*="mention"], [class*="mention"], .mention')).map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id
        })),
        inputElements: Array.from(document.querySelectorAll('input, textarea')).map(el => ({
          tagName: el.tagName,
          type: el.type,
          placeholder: el.placeholder,
          className: el.className
        }))
      };
    `;
    
    const analysis = await page.evaluate(analysisScript);
    console.log('📋 Component Analysis Results:');
    console.log('Post Creator Elements:', JSON.stringify(analysis.postCreatorElements, null, 2));
    console.log('Mention Elements:', JSON.stringify(analysis.mentionElements, null, 2));
    console.log('Input Elements:', JSON.stringify(analysis.inputElements, null, 2));
    
    // Test each input for mention functionality
    const inputs = page.locator('input, textarea');
    const inputCount = await inputs.count();
    
    console.log(`🔢 Testing ${inputCount} input elements for mention functionality`);
    
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      try {
        const input = inputs.nth(i);
        const isVisible = await input.isVisible();
        
        if (isVisible) {
          await input.click();
          await input.type('@test');
          await page.waitForTimeout(500);
          
          const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions, .dropdown');
          const hasDropdown = await dropdown.first().isVisible().catch(() => false);
          
          console.log(`Input ${i}: Dropdown visible = ${hasDropdown}`);
        }
      } catch (error) {
        console.log(`Input ${i}: Error = ${error.message}`);
      }
    }
  });

  test('Evidence 3: Real-time Mention Detection Validation', async ({ page }) => {
    console.log('⏱️ Testing real-time mention detection performance');
    
    // Test on working demo first
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const demoInput = page.locator('input, textarea').first();
    
    // Performance test - measure response time
    await demoInput.click();
    
    const startTime = Date.now();
    await demoInput.type('@');
    
    // Wait for dropdown to appear
    try {
      await page.waitForSelector('[data-testid="mention-dropdown"], .mention-suggestions', { timeout: 3000 });
      const responseTime = Date.now() - startTime;
      console.log(`✅ Mention detection response time: ${responseTime}ms`);
      
      await page.screenshot({ 
        path: 'frontend/test-results/evidence-realtime-mention-working.png'
      });
    } catch (error) {
      console.log('❌ Mention detection failed in demo');
    }
    
    // Test typing sequence
    await demoInput.clear();
    const testSequence = 'Hello @agent, how are you?';
    
    for (let i = 0; i < testSequence.length; i++) {
      await demoInput.type(testSequence[i], { delay: 100 });
      
      if (testSequence[i] === '@') {
        await page.waitForTimeout(300);
        const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
        const visible = await dropdown.first().isVisible().catch(() => false);
        console.log(`@ character typed - Dropdown visible: ${visible}`);
      }
    }
    
    await page.screenshot({ 
      path: 'frontend/test-results/evidence-typing-sequence-complete.png'
    });
  });

  test('Evidence 4: API and Network Integration Issues', async ({ page }) => {
    console.log('🌐 Testing API connectivity and network issues');
    
    const networkErrors: string[] = [];
    const apiCalls: string[] = [];
    
    page.on('response', response => {
      const url = response.url();
      apiCalls.push(`${response.status()} ${url}`);
      
      if (!response.ok()) {
        networkErrors.push(`${response.status()} ${url}`);
        console.log(`❌ Network Error: ${response.status()} ${url}`);
      }
    });
    
    // Test main feed page
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    
    // Try to trigger any mention-related API calls
    const inputs = page.locator('input, textarea');
    const inputCount = await inputs.count();
    
    if (inputCount > 0) {
      const firstInput = inputs.first();
      await firstInput.click();
      await firstInput.type('@');
      await page.waitForTimeout(2000);
    }
    
    console.log('📡 API Calls Made:');
    apiCalls.forEach(call => console.log(`  ${call}`));
    
    console.log('❌ Network Errors Detected:');
    networkErrors.forEach(error => console.log(`  ${error}`));
    
    // Test mention demo for comparison
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const demoInput = page.locator('input, textarea').first();
    await demoInput.click();
    await demoInput.type('@');
    await page.waitForTimeout(1000);
    
    console.log(`🔍 Total API calls: ${apiCalls.length}`);
    console.log(`🔍 Network errors: ${networkErrors.length}`);
  });

  test('Evidence 5: Cross-Component Mention State Consistency', async ({ page }) => {
    console.log('🔄 Testing mention state consistency across components');
    
    // Test data for consistency
    const testMention = '@agent-test';
    const results: any = {};
    
    // Test 1: Mention Demo
    await page.goto('http://localhost:5173/mention-demo');
    await page.waitForLoadState('networkidle');
    
    const demoInput = page.locator('input, textarea').first();
    await demoInput.click();
    await demoInput.clear();
    await demoInput.type(testMention);
    
    results.mentionDemo = {
      value: await demoInput.inputValue(),
      hasDropdown: false
    };
    
    // Check if dropdown appears
    try {
      const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
      results.mentionDemo.hasDropdown = await dropdown.first().isVisible();
    } catch {}
    
    // Test 2: Main Feed
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    
    const feedInputs = page.locator('input, textarea');
    const feedInputCount = await feedInputs.count();
    
    results.mainFeed = {
      inputCount: feedInputCount,
      testedInputs: []
    };
    
    // Test up to 3 inputs in main feed
    for (let i = 0; i < Math.min(feedInputCount, 3); i++) {
      try {
        const input = feedInputs.nth(i);
        const isVisible = await input.isVisible();
        
        if (isVisible) {
          await input.click();
          await input.clear();
          await input.type(testMention);
          
          const value = await input.inputValue();
          const dropdown = page.locator('[data-testid="mention-dropdown"], .mention-suggestions');
          const hasDropdown = await dropdown.first().isVisible().catch(() => false);
          
          results.mainFeed.testedInputs.push({
            index: i,
            value,
            hasDropdown,
            working: hasDropdown
          });
        }
      } catch (error) {
        results.mainFeed.testedInputs.push({
          index: i,
          error: error.message,
          working: false
        });
      }
    }
    
    console.log('🎯 Cross-Component Test Results:');
    console.log(JSON.stringify(results, null, 2));
    
    // Generate final evidence screenshot
    await page.screenshot({ 
      path: 'frontend/test-results/evidence-cross-component-final.png',
      fullPage: true 
    });
    
    // Summary
    const workingComponents = Object.values(results).filter((result: any) => 
      result.hasDropdown || (result.testedInputs && result.testedInputs.some((input: any) => input.working))
    ).length;
    
    console.log(`📊 Working Components: ${workingComponents} / ${Object.keys(results).length}`);
  });
});
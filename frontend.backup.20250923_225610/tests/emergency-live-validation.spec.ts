import { test, expect } from '@playwright/test';

test.describe('EMERGENCY @ Mention Live Validation', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🚀 EMERGENCY: Starting live @ mention validation');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('EMERGENCY: @ mention dropdown should appear in any textarea', async ({ page }) => {
    console.log('🔍 EMERGENCY: Looking for any textarea on page');
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Find any textarea on the page
    const textareas = await page.locator('textarea').all();
    console.log(`📊 EMERGENCY: Found ${textareas.length} textareas`);
    
    if (textareas.length === 0) {
      console.log('⚠️ EMERGENCY: No textareas found, creating test area');
      // If no textareas, look for any input
      const inputs = await page.locator('input[type="text"]').all();
      console.log(`📊 EMERGENCY: Found ${inputs.length} text inputs`);
      
      if (inputs.length > 0) {
        await inputs[0].click();
        await inputs[0].type('@');
        await page.waitForTimeout(1000);
        
        // Check for dropdown
        const dropdown = page.locator('[role="listbox"]').first();
        const dropdownVisible = await dropdown.isVisible().catch(() => false);
        console.log(`🎯 EMERGENCY: Dropdown visible in input: ${dropdownVisible}`);
        
        if (dropdownVisible) {
          expect(dropdown).toBeVisible();
          console.log('✅ EMERGENCY: @ mention working in input!');
          return;
        }
      }
    }
    
    // Test first textarea
    if (textareas.length > 0) {
      const textarea = textareas[0];
      await textarea.click();
      await textarea.type('@');
      
      console.log('🔤 EMERGENCY: Typed @ in textarea, waiting for dropdown...');
      await page.waitForTimeout(1500);
      
      // Check for dropdown with multiple selectors
      const dropdownSelectors = [
        '[role="listbox"]',
        '.mention-dropdown',
        '[data-testid="mention-dropdown"]',
        '.absolute.z-\\[99999\\]'
      ];
      
      let dropdownFound = false;
      for (const selector of dropdownSelectors) {
        const element = page.locator(selector).first();
        const visible = await element.isVisible().catch(() => false);
        console.log(`🔍 EMERGENCY: Checking selector "${selector}": ${visible}`);
        if (visible) {
          dropdownFound = true;
          console.log(`✅ EMERGENCY: Found dropdown with selector: ${selector}`);
          expect(element).toBeVisible();
          break;
        }
      }
      
      if (!dropdownFound) {
        console.log('❌ EMERGENCY: No dropdown found with any selector');
        
        // Take screenshot for debugging
        await page.screenshot({ 
          path: 'test-results/emergency-mention-failure.png',
          fullPage: true 
        });
        
        // Check console for debug messages
        const consoleMessages = [];
        page.on('console', msg => consoleMessages.push(msg.text()));
        await page.waitForTimeout(500);
        
        console.log('🚨 EMERGENCY: Console messages:', consoleMessages);
        
        // Force fail with useful error
        throw new Error(`❌ EMERGENCY: @ mention dropdown did not appear after typing @ in textarea. Found ${textareas.length} textareas. Console: ${consoleMessages.join(', ')}`);
      }
    } else {
      throw new Error('❌ EMERGENCY: No textareas or inputs found on page');
    }
  });
  
  test('EMERGENCY: Check for debug messages in console', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log('📋 CONSOLE:', text);
    });
    
    // Try to find and interact with any mention input
    await page.waitForTimeout(1000);
    const textareas = await page.locator('textarea').all();
    
    if (textareas.length > 0) {
      await textareas[0].click();
      await textareas[0].type('@test');
      await page.waitForTimeout(2000);
    }
    
    // Check for emergency debug messages
    const emergencyMessages = consoleMessages.filter(msg => 
      msg.includes('EMERGENCY') || msg.includes('🚨') || msg.includes('DEBUG')
    );
    
    console.log(`🔍 EMERGENCY: Found ${emergencyMessages.length} debug messages:`, emergencyMessages);
    
    // At minimum, should have some debug output if system is working
    expect(emergencyMessages.length).toBeGreaterThan(0);
  });
});
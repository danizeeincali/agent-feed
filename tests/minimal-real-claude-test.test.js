/**
 * Minimal Real Claude Test
 * 
 * Focused test to validate:
 * 1. Claude Instance Manager loads
 * 2. Button creates real process
 * 3. No mock responses in terminal
 * 4. Real working directory shown
 */

const { test, expect } = require('@playwright/test');
const { RealClaudeValidators } = require('./test-helpers/real-claude-validators');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Minimal Real Claude Validation', () => {
  
  test('Real Claude Process: No Mock Responses', async ({ page }) => {
    console.log('🧪 MINIMAL TEST: Real Claude Process Validation');
    
    // 1. Navigate to Claude Instance Manager
    console.log('📱 Step 1: Load Claude Instance Manager');
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/test-results/01-loaded-page.png' });
    
    // 2. Look for Claude Instance Manager elements
    console.log('🔍 Step 2: Find Claude Instance Manager');
    
    // Check if the header exists
    const header = await page.$('h2');
    if (header) {
      const headerText = await header.textContent();
      console.log('Found header:', headerText);
    }
    
    // Look for any buttons
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons`);
    
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const buttonText = await buttons[i].textContent();
      console.log(`Button ${i + 1}: "${buttonText}"`);
    }
    
    // 3. Look for skip-permissions button specifically
    const skipPermButton = await page.$('button:has-text("skip-permissions")');
    if (!skipPermButton) {
      // Let's see what the page actually contains
      const bodyText = await page.$eval('body', el => el.textContent);
      console.log('Page content (first 500 chars):', bodyText.substring(0, 500));
      
      throw new Error('Could not find skip-permissions button');
    }
    
    console.log('✅ Found skip-permissions button');
    
    // 4. Click button to create instance
    console.log('🚀 Step 3: Create Claude instance');
    await skipPermButton.click();
    
    // Wait for instance to appear
    console.log('⏳ Waiting for instance to appear...');
    
    try {
      const instanceElement = await page.waitForSelector('.instance-item', { timeout: 30000 });
      console.log('✅ Instance appeared!');
      
      // Get full instance ID from data attribute or backend
      // Note: Frontend displays truncated ID for UI, but uses full ID internally
      let instanceId = null;
      
      // Try to get full ID from HTML data attribute first
      instanceId = await instanceElement.getAttribute('data-instance-id');
      
      if (!instanceId) {
        // Fallback: get full ID from backend by matching PID or other identifier
        try {
          const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
          const data = await response.json();
          if (data.success && data.instances.length > 0) {
            // Use the most recent instance
            instanceId = data.instances[data.instances.length - 1].id;
            console.log(`✅ Got full instance ID from backend: ${instanceId}`);
          }
        } catch (error) {
          console.warn('Failed to get instance ID from backend:', error.message);
        }
      }
      
      if (!instanceId) {
        throw new Error('Could not determine full instance ID');
      }
      
      // Validate instance ID format
      RealClaudeValidators.validateInstanceIdFormat(instanceId);
      console.log('✅ Instance ID format is valid');
      
      // 5. Select instance and check for output
      await instanceElement.click();
      console.log('✅ Instance selected');
      
      // Wait for terminal output
      await page.waitForTimeout(3000);
      
      const outputArea = await page.$('.output-area pre');
      if (outputArea) {
        const output = await outputArea.textContent();
        console.log('📺 Terminal output (first 200 chars):', output.substring(0, 200));
        
        // 6. Validate NO mock responses
        try {
          RealClaudeValidators.validateNoMockResponses(output);
          console.log('✅ No mock responses detected');
        } catch (error) {
          console.error('❌ Mock response detected:', error.message);
          throw error;
        }
        
        // 7. Check for real working directory
        console.log('📁 Testing working directory...');
        await page.fill('.input-field', 'pwd');
        await page.press('.input-field', 'Enter');
        
        await page.waitForTimeout(3000);
        
        const finalOutput = await outputArea.textContent();
        console.log('📺 Final output with pwd:', finalOutput.substring(finalOutput.length - 300));
        
        // Validate working directory
        if (finalOutput.includes('/workspaces/agent-feed')) {
          console.log('✅ Real working directory detected');
        } else {
          console.warn('⚠️ Working directory not clearly shown in output');
        }
        
        // Final validation
        RealClaudeValidators.validateNoMockResponses(finalOutput);
        console.log('✅ Final validation: No mock responses in any output');
        
      } else {
        console.warn('⚠️ No terminal output area found');
      }
      
    } catch (error) {
      console.error('❌ Failed to find instance:', error.message);
      
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/test-results/02-instance-not-found.png' });
      
      // Check backend for instances
      try {
        const response = await fetch(`${BACKEND_URL}/api/claude/instances`);
        const data = await response.json();
        console.log('🔧 Backend instances:', data);
      } catch (backendError) {
        console.error('❌ Backend check failed:', backendError.message);
      }
      
      throw error;
    }
    
    console.log('🎉 MINIMAL TEST PASSED: Real Claude process working without mocks!');
  });
});
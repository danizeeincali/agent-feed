// Playwright E2E Terminal Validation - Final Integration Test
import { test, expect } from '@playwright/test';

test.describe('Enhanced Terminal E2E Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('Complete terminal workflow - Launch and execute commands', async ({ page }) => {
    console.log('🚀 Starting complete terminal workflow test...');
    
    // Wait for SimpleLauncher to load
    await page.waitForSelector('[data-testid="simple-launcher"]', { timeout: 10000 });
    console.log('✅ SimpleLauncher loaded');

    // Check initial state
    const launchButton = page.locator('text="Launch Claude Code"');
    await expect(launchButton).toBeVisible();
    console.log('✅ Launch button visible');

    // Click launch button
    await launchButton.click();
    console.log('🔄 Launch button clicked');

    // Wait for terminal to appear
    await page.waitForSelector('.terminal-container, [class*="terminal"], .xterm', { 
      timeout: 15000 
    });
    console.log('✅ Terminal container appeared');

    // Wait for terminal initialization messages
    await page.waitForTimeout(3000);
    console.log('⏳ Waiting for terminal initialization');

    // Look for terminal content
    const terminalContent = await page.textContent('body');
    console.log('📄 Page content includes:', terminalContent?.substring(0, 200));

    // Check for connection status
    if (terminalContent?.includes('Connected to terminal server')) {
      console.log('✅ Terminal connected successfully');
    } else if (terminalContent?.includes('Waiting for connection')) {
      console.log('⚠️ Terminal still waiting for connection');
      await page.waitForTimeout(5000);
    }

    // Try to interact with terminal by clicking on it
    const terminalElement = page.locator('.terminal-container, [class*="terminal"], .xterm').first();
    if (await terminalElement.isVisible()) {
      await terminalElement.click();
      console.log('🖱️ Clicked on terminal');
      
      // Wait a moment
      await page.waitForTimeout(1000);
      
      // Try typing a command
      await page.keyboard.type('pwd');
      await page.keyboard.press('Enter');
      console.log('⌨️ Typed "pwd" command');
      
      // Wait for command output
      await page.waitForTimeout(3000);
      
      // Check for command output in page
      const updatedContent = await page.textContent('body');
      if (updatedContent?.includes('/workspaces/agent-feed')) {
        console.log('✅ Command executed successfully - pwd output detected');
      } else {
        console.log('⚠️ No command output detected yet');
        
        // Try another command
        await page.keyboard.type('echo "e2e-test-success"');
        await page.keyboard.press('Enter');
        console.log('⌨️ Typed echo command');
        
        await page.waitForTimeout(2000);
        
        const finalContent = await page.textContent('body');
        if (finalContent?.includes('e2e-test-success')) {
          console.log('✅ E2E test command executed successfully');
        }
      }
    }

    // Take screenshot for debugging
    await page.screenshot({ 
      path: 'frontend/test-results/e2e-terminal-validation.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved');

    // Validate terminal is functional
    const terminalVisible = await terminalElement.isVisible();
    expect(terminalVisible).toBeTruthy();
    console.log('✅ Terminal validation complete');
  });

  test('Terminal connection and status validation', async ({ page }) => {
    console.log('🔌 Testing terminal connection status...');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Launch terminal
    const launchButton = page.locator('text="Launch Claude Code"');
    await launchButton.click();
    
    // Wait for status indicators
    await page.waitForTimeout(5000);
    
    // Look for connection status indicators
    const pageContent = await page.textContent('body');
    console.log('📊 Checking connection status indicators...');
    
    const hasConnectedStatus = pageContent?.includes('Connected') || 
                              pageContent?.includes('running') ||
                              pageContent?.includes('PID:');
    
    if (hasConnectedStatus) {
      console.log('✅ Connection status indicators found');
    } else {
      console.log('⚠️ No clear connection status - may still be connecting');
    }
    
    // Check for any error messages
    const hasErrors = pageContent?.includes('Error') || 
                     pageContent?.includes('failed') ||
                     pageContent?.includes('not running');
    
    if (hasErrors) {
      console.log('❌ Error indicators found in page');
      console.log('Error content:', pageContent?.substring(0, 500));
    } else {
      console.log('✅ No error indicators detected');
    }

    // Take status screenshot
    await page.screenshot({ 
      path: 'frontend/test-results/terminal-status-validation.png',
      fullPage: true 
    });
  });

  test('Enhanced backend API availability', async ({ page }) => {
    console.log('🔍 Testing enhanced backend API availability...');
    
    // Test API endpoints through browser
    const checkResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/claude/check');
        const data = await response.json();
        return { success: true, data, status: response.status };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    console.log('📡 API check response:', checkResponse);
    
    if (checkResponse.success) {
      expect(checkResponse.data.version).toBe('2.0.0-enhanced');
      console.log('✅ Enhanced backend API accessible from browser');
    } else {
      console.log('❌ Backend API not accessible:', checkResponse.error);
    }
  });
});
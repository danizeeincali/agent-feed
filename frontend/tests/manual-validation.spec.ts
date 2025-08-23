import { test, expect } from '@playwright/test';

test.describe('Manual Validation Scenarios', () => {
  test('should handle all user scenarios from original issue report', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    console.log('🔍 Starting comprehensive user scenario validation...');
    
    // Scenario 1: Initial page load and connection establishment
    await test.step('Validate initial page load and WebSocket connection', async () => {
      await page.waitForTimeout(3000);
      
      // Check for any error messages
      const errors = page.locator('.error, [data-testid="error"], text="Error"');
      const errorCount = await errors.count();
      
      if (errorCount > 0) {
        console.log(`⚠️ Found ${errorCount} potential error elements`);
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errors.nth(i).textContent();
          console.log(`Error ${i + 1}: ${errorText}`);
        }
      }
      
      // Look for positive connection indicators
      const connected = await page.locator('text="Connected"').isVisible();
      const disconnected = await page.locator('text="Disconnected"').isVisible();
      
      console.log(`Connection Status - Connected: ${connected}, Disconnected: ${disconnected}`);
      
      // Expect connected state
      expect(connected).toBeTruthy();
      expect(disconnected).toBeFalsy();
    });
    
    // Scenario 2: Navigation and component rendering
    await test.step('Validate component rendering and navigation', async () => {
      // Check for main navigation elements
      const nav = page.locator('nav, .nav, [role="navigation"]');
      const hasNav = await nav.isVisible();
      
      // Check for main content areas
      const main = page.locator('main, .main, [role="main"]');
      const hasMain = await main.isVisible();
      
      console.log(`Navigation present: ${hasNav}, Main content present: ${hasMain}`);
      
      // Look for interactive elements
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      console.log(`Interactive buttons found: ${buttonCount}`);
      
      expect(buttonCount).toBeGreaterThan(0);
    });
    
    // Scenario 3: Real-time functionality
    await test.step('Validate real-time features', async () => {
      // Look for real-time indicators
      const realTimeElements = page.locator('[data-testid*="real-time"], .real-time, text="Live"');
      const realTimeCount = await realTimeElements.count();
      
      console.log(`Real-time elements found: ${realTimeCount}`);
      
      // Check for activity feeds or live updates
      const activityFeed = page.locator('[data-testid="activity-feed"], .activity-feed, .feed');
      const hasActivityFeed = await activityFeed.isVisible();
      
      console.log(`Activity feed present: ${hasActivityFeed}`);
    });
    
    // Scenario 4: Terminal functionality
    await test.step('Validate terminal functionality', async () => {
      // Look for terminal-related elements
      const terminalElements = page.locator('[data-testid*="terminal"], .terminal, text="Terminal"');
      const terminalCount = await terminalElements.count();
      
      console.log(`Terminal elements found: ${terminalCount}`);
      
      if (terminalCount > 0) {
        // Try to interact with terminal
        const terminalButton = terminalElements.first();
        if (await terminalButton.isVisible()) {
          await terminalButton.click();
          await page.waitForTimeout(2000);
          
          // Check for terminal state changes
          const launching = await page.locator('text="Launching"').isVisible();
          const connecting = await page.locator('text="connecting to terminal"').isVisible();
          
          console.log(`Terminal launching: ${launching}, Terminal connecting: ${connecting}`);
          
          // These should not persist
          if (launching || connecting) {
            await page.waitForTimeout(5000);
            const stillLaunching = await page.locator('text="Launching"').isVisible();
            const stillConnecting = await page.locator('text="connecting to terminal"').isVisible();
            
            expect(stillLaunching).toBeFalsy();
            expect(stillConnecting).toBeFalsy();
          }
        }
      }
    });
    
    // Scenario 5: Agent management and dashboard
    await test.step('Validate agent management features', async () => {
      // Look for agent-related elements
      const agentElements = page.locator('[data-testid*="agent"], .agent, text="Agent"');
      const agentCount = await agentElements.count();
      
      console.log(`Agent-related elements found: ${agentCount}`);
      
      // Check for dashboard elements
      const dashboard = page.locator('[data-testid="dashboard"], .dashboard, text="Dashboard"');
      const hasDashboard = await dashboard.isVisible();
      
      console.log(`Dashboard present: ${hasDashboard}`);
    });
    
    // Scenario 6: Error handling and recovery
    await test.step('Validate error handling', async () => {
      // Check for error boundaries and fallback components
      const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
      const hasErrorBoundary = await errorBoundary.isVisible();
      
      // Check for loading states
      const loading = page.locator('[data-testid="loading"], .loading, text="Loading"');
      const hasLoading = await loading.isVisible();
      
      console.log(`Error boundary visible: ${hasErrorBoundary}, Loading state: ${hasLoading}`);
      
      // Error boundary should not be visible in normal operation
      expect(hasErrorBoundary).toBeFalsy();
    });
    
    console.log('✅ All user scenario validations completed');
  });
  
  test('should maintain state during user interactions', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Perform various user interactions
    await test.step('Simulate user interactions', async () => {
      // Click various elements
      const clickableElements = page.locator('button, a, [role="button"]');
      const clickableCount = await clickableElements.count();
      
      if (clickableCount > 0) {
        // Click first few elements safely
        const maxClicks = Math.min(3, clickableCount);
        for (let i = 0; i < maxClicks; i++) {
          const element = clickableElements.nth(i);
          if (await element.isVisible()) {
            await element.click();
            await page.waitForTimeout(500);
          }
        }
      }
      
      // Check that connection is maintained
      await page.waitForTimeout(2000);
      const connected = await page.locator('text="Connected"').isVisible();
      expect(connected).toBeTruthy();
    });
  });
});
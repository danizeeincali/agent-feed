import { test, expect } from '@playwright/test';

test.describe('WebSocket Connection Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    
    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should display Connected status when WebSocket connects successfully', async ({ page }) => {
    console.log('🔧 PRODUCTION VALIDATION: Testing connection status display...');
    
    // Wait for the app to load and WebSocket to connect
    await page.waitForTimeout(3000);
    
    // Look for connection status element
    const connectionStatus = page.locator('[data-testid="connection-status"]').or(
      page.locator('text=/Connected|Disconnected|Connecting/')
    );
    
    await expect(connectionStatus).toBeVisible({ timeout: 10000 });
    
    // Check the status text
    const statusText = await connectionStatus.textContent();
    console.log('🔧 VALIDATION: Connection status shows:', statusText);
    
    // CRITICAL: Status should show "Connected" not "Disconnected"
    expect(statusText).toContain('Connected');
    expect(statusText).not.toContain('Disconnected');
  });

  test('should show connection indicator with proper styling', async ({ page }) => {
    console.log('🔧 PRODUCTION VALIDATION: Testing connection indicator styling...');
    
    await page.waitForTimeout(3000);
    
    // Look for connection indicator (dot/icon)
    const indicator = page.locator('[class*="bg-green"]').or(
      page.locator('[class*="text-green"]')
    );
    
    await expect(indicator).toBeVisible({ timeout: 10000 });
    
    // Check that indicator has connected styling (green)
    const indicatorClass = await indicator.getAttribute('class');
    console.log('🔧 VALIDATION: Indicator styling:', indicatorClass);
    
    expect(indicatorClass).toContain('green');
  });

  test('should handle WebSocket events without errors', async ({ page }) => {
    console.log('🔧 PRODUCTION VALIDATION: Testing WebSocket event handling...');
    
    let errorCount = 0;
    page.on('pageerror', (error) => {
      console.error('🚨 BROWSER ERROR:', error.message);
      errorCount++;
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('🚨 CONSOLE ERROR:', msg.text());
        errorCount++;
      }
    });
    
    // Wait for connection and activity
    await page.waitForTimeout(5000);
    
    // Try to trigger some WebSocket activity if possible
    const agentButton = page.locator('button:has-text("Agent")').first();
    if (await agentButton.isVisible()) {
      await agentButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Should have no JavaScript errors
    expect(errorCount).toBe(0);
  });

  test('should maintain connection state consistency', async ({ page }) => {
    console.log('🔧 PRODUCTION VALIDATION: Testing connection state consistency...');
    
    // Inject test code to check connection state
    const connectionStates = await page.evaluate(() => {
      return new Promise((resolve) => {
        let states: any[] = [];
        let checkCount = 0;
        const maxChecks = 10;
        
        const checkConnection = () => {
          // Try to get connection status from various sources
          const statusElement = document.querySelector('[data-testid="connection-status"]') ||
                               document.querySelector('*:not(script)');
          
          const statusText = statusElement?.textContent || 'unknown';
          
          states.push({
            check: checkCount + 1,
            timestamp: Date.now(),
            statusText: statusText,
            hasSocket: !!(window as any).socket,
            socketConnected: (window as any).socket?.connected
          });
          
          checkCount++;
          
          if (checkCount >= maxChecks) {
            resolve(states);
          } else {
            setTimeout(checkConnection, 500);
          }
        };
        
        checkConnection();
      });
    });
    
    console.log('🔧 VALIDATION: Connection states over time:', connectionStates);
    
    // Analyze state consistency
    const connectedStates = connectionStates.filter((state: any) => 
      state.statusText.includes('Connected')
    );
    
    // Should have some connected states (at least 50% of checks)
    expect(connectedStates.length).toBeGreaterThan(connectionStates.length * 0.5);
  });

  test('should handle Claude instance launcher without hanging', async ({ page }) => {
    console.log('🔧 PRODUCTION VALIDATION: Testing Claude instance launcher...');
    
    await page.waitForTimeout(3000);
    
    // Look for Claude instance or agent-related buttons
    const claudeButton = page.locator('button:has-text("Claude")').or(
      page.locator('button:has-text("Instance")').or(
        page.locator('button:has-text("Agent")')
      )
    ).first();
    
    if (await claudeButton.isVisible()) {
      console.log('🔧 Found Claude/Instance button, testing...');
      
      // Click the button
      await claudeButton.click();
      
      // Wait a reasonable time and check it doesn't hang
      await page.waitForTimeout(5000);
      
      // Check if there's any loading state that resolves
      const loadingElement = page.locator('text=/Loading|Launching|Starting/');
      
      if (await loadingElement.isVisible()) {
        console.log('🔧 Found loading state, waiting for resolution...');
        
        // Wait for loading to complete (should not hang)
        await expect(loadingElement).toBeHidden({ timeout: 15000 });
      }
      
      console.log('✅ Claude instance launcher completed successfully');
    } else {
      console.log('ℹ️ No Claude instance launcher found in current view');
    }
  });

  test('should recover from connection drops', async ({ page }) => {
    console.log('🔧 PRODUCTION VALIDATION: Testing connection recovery...');
    
    await page.waitForTimeout(3000);
    
    // Simulate network interruption by blocking WebSocket requests
    await page.route('**/socket.io/**', route => route.abort());
    
    await page.waitForTimeout(2000);
    
    // Re-enable WebSocket requests
    await page.unroute('**/socket.io/**');
    
    await page.waitForTimeout(5000);
    
    // Check that connection recovers
    const statusElement = page.locator('text=/Connected|Disconnected|Connecting/');
    await expect(statusElement).toBeVisible();
    
    const finalStatus = await statusElement.textContent();
    console.log('🔧 VALIDATION: Final status after recovery:', finalStatus);
    
    // Should eventually reconnect
    expect(finalStatus).toContain('Connected');
  });
});
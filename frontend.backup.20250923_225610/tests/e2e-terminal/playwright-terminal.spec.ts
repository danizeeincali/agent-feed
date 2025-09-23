/**
 * Playwright E2E Terminal CORS Tests
 * End-to-end testing of terminal functionality with CORS fixes
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Terminal WebSocket CORS E2E Tests', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write']
    });
    page = await context.newPage();
    
    // Monitor console for CORS errors
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CORS')) {
        throw new Error(`CORS Error detected: ${msg.text()}`);
      }
    });
    
    // Monitor network for failed requests
    page.on('requestfailed', request => {
      if (request.url().includes('socket.io') && request.failure()?.errorText.includes('CORS')) {
        throw new Error(`Network CORS Error: ${request.failure()?.errorText}`);
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should establish WebSocket connection without CORS errors', async () => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Look for terminal or connection indicator
    const connectionIndicator = page.locator('[data-testid="websocket-status"]');
    
    if (await connectionIndicator.isVisible()) {
      await expect(connectionIndicator).toContainText('connected');
    }
    
    // Check for WebSocket connection in console
    const logs = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    // Wait a bit for WebSocket connection
    await page.waitForTimeout(3000);
    
    // Verify no CORS errors in console
    const corsErrors = logs.filter(log => 
      log.includes('CORS') || 
      log.includes('Not allowed by CORS') ||
      log.includes('Access-Control-Allow-Origin')
    );
    
    expect(corsErrors).toHaveLength(0);
  });

  test('should handle terminal input/output without CORS interference', async () => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Look for terminal interface
    const terminalInput = page.locator('input[placeholder*="terminal"], textarea[placeholder*="command"], [data-testid="terminal-input"]');
    const terminalOutput = page.locator('[data-testid="terminal-output"], .terminal-output, .xterm-screen');
    
    if (await terminalInput.isVisible()) {
      // Test terminal input
      await terminalInput.fill('echo "WebSocket CORS Test"');
      await terminalInput.press('Enter');
      
      // Wait for output
      await page.waitForTimeout(2000);
      
      // Verify output appears (terminal working)
      if (await terminalOutput.isVisible()) {
        const outputText = await terminalOutput.textContent();
        expect(outputText).toBeTruthy();
      }
    }
    
    // Verify no CORS-related errors
    const errorElements = page.locator('.error, [data-testid="error"], .alert-error');
    for (const element of await errorElements.all()) {
      const errorText = await element.textContent();
      expect(errorText).not.toContain('CORS');
      expect(errorText).not.toContain('Not allowed by CORS');
    }
  });

  test('should maintain WebSocket connection across page interactions', async () => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Check initial connection
    let websocketConnected = false;
    
    // Monitor WebSocket events
    page.on('websocket', ws => {
      websocketConnected = true;
      
      ws.on('close', () => {
        console.log('WebSocket closed');
      });
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload);
      });
    });
    
    // Interact with the page to maintain connection
    if (await page.locator('button').first().isVisible()) {
      await page.locator('button').first().click();
    }
    
    // Wait and verify connection maintained
    await page.waitForTimeout(5000);
    
    // Navigate to different sections if they exist
    const navLinks = page.locator('nav a, [role="tab"]');
    if (await navLinks.first().isVisible()) {
      await navLinks.first().click();
      await page.waitForTimeout(2000);
    }
    
    // Verify WebSocket still active (no CORS issues on navigation)
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    const corsRelatedErrors = consoleErrors.filter(error => 
      error.includes('CORS') || 
      error.includes('WebSocket connection failed')
    );
    
    expect(corsRelatedErrors).toHaveLength(0);
  });

  test('should handle WebSocket reconnection without CORS errors', async () => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Simulate network interruption by going offline/online
    await context.setOffline(true);
    await page.waitForTimeout(2000);
    
    await context.setOffline(false);
    await page.waitForTimeout(5000);
    
    // Check for reconnection success
    const reconnectionErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && (
        msg.text().includes('reconnect') ||
        msg.text().includes('WebSocket') ||
        msg.text().includes('CORS')
      )) {
        reconnectionErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Should not have CORS errors during reconnection
    const corsReconnectErrors = reconnectionErrors.filter(error => 
      error.includes('CORS') || 
      error.includes('Not allowed by CORS')
    );
    
    expect(corsReconnectErrors).toHaveLength(0);
  });

  test('should work across different browser contexts and origins', async () => {
    // Test different origin scenarios
    const origins = [
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];
    
    for (const origin of origins) {
      const testContext = await page.context().browser()?.newContext();
      const testPage = await testContext?.newPage();
      
      if (testPage) {
        let corsErrorDetected = false;
        
        testPage.on('console', msg => {
          if (msg.type() === 'error' && msg.text().includes('CORS')) {
            corsErrorDetected = true;
          }
        });
        
        await testPage.goto(origin);
        await testPage.waitForLoadState('networkidle');
        await testPage.waitForTimeout(3000);
        
        expect(corsErrorDetected).toBe(false);
        
        await testContext?.close();
      }
    }
  });
});
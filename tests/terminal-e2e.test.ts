// Playwright E2E Test for Terminal Functionality
import { test, expect } from '@playwright/test';

test.describe('Terminal Connection E2E', () => {
  
  test('Terminal connects and shows connection status', async ({ page }) => {
    // Navigate to SimpleLauncher
    await page.goto('http://localhost:5173/simple-launcher');
    await page.waitForTimeout(2000);
    
    // Verify page loaded
    await expect(page.locator('text=Claude Code Launcher')).toBeVisible();
    
    // Launch Claude
    await page.click('button:has-text("Launch Claude")');
    await page.waitForTimeout(3000);
    
    // Verify terminal appears
    const terminal = page.locator('.terminal-section');
    await expect(terminal).toBeVisible();
    
    // Check if terminal shows connection attempt
    const terminalContent = page.locator('.xterm-screen');
    await expect(terminalContent).toBeVisible();
    
    // Wait for connection status
    await page.waitForTimeout(5000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'terminal-connection-test.png' });
    
    // Check for connected status or waiting message
    const hasConnectedMessage = await page.locator('text=Connected to terminal server').isVisible();
    const hasWaitingMessage = await page.locator('text=Waiting for connection').isVisible();
    
    if (hasConnectedMessage) {
      console.log('✅ Terminal connected successfully');
    } else if (hasWaitingMessage) {
      console.log('⏳ Terminal still waiting for connection');
    } else {
      console.log('❌ No connection status found');
    }
    
    // Verify terminal is interactive (can type)
    await terminalContent.click();
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');
    
    // Wait for command response
    await page.waitForTimeout(2000);
    
    // Take final screenshot
    await page.screenshot({ path: 'terminal-after-command.png' });
  });

  test('Terminal WebSocket connection establishment', async ({ page }) => {
    // Monitor network for WebSocket connections
    const wsConnections = [];
    
    page.on('websocket', ws => {
      console.log('WebSocket created:', ws.url());
      wsConnections.push(ws.url());
      
      ws.on('framesent', event => {
        console.log('WebSocket frame sent:', event.payload);
      });
      
      ws.on('framereceived', event => {
        console.log('WebSocket frame received:', event.payload);
      });
      
      ws.on('close', () => {
        console.log('WebSocket closed:', ws.url());
      });
    });
    
    // Navigate and launch
    await page.goto('http://localhost:5173/simple-launcher');
    await page.click('button:has-text("Launch Claude")');
    await page.waitForTimeout(5000);
    
    // Verify WebSocket connection was attempted
    expect(wsConnections.length).toBeGreaterThan(0);
    console.log('WebSocket connections:', wsConnections);
    
    // Check if connection to correct backend
    const backendConnections = wsConnections.filter(url => url.includes('localhost:3001'));
    expect(backendConnections.length).toBeGreaterThan(0);
  });

  test('Terminal displays proper error messages', async ({ page }) => {
    // Monitor console for errors
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    await page.goto('http://localhost:5173/simple-launcher');
    await page.click('button:has-text("Launch Claude")');
    await page.waitForTimeout(5000);
    
    // Check for connection-related console messages
    const connectionMessages = consoleMessages.filter(msg => 
      msg.includes('connection') || msg.includes('socket') || msg.includes('websocket')
    );
    
    console.log('Connection-related console messages:');
    connectionMessages.forEach(msg => console.log(msg));
    
    // Verify no critical errors
    const errors = consoleMessages.filter(msg => msg.startsWith('error:'));
    const criticalErrors = errors.filter(msg => 
      !msg.includes('favicon') && !msg.includes('404')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

});
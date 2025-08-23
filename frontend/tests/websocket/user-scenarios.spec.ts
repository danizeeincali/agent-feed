import { test, expect, Page } from '@playwright/test';

test.describe('Real User WebSocket Scenarios', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Capture all console messages for debugging
    page.on('console', msg => {
      console.log(`[${msg.type()}] ${msg.text()}`);
    });

    // Capture WebSocket events
    page.on('websocket', ws => {
      console.log(`WebSocket connection to: ${ws.url()}`);
      ws.on('close', () => console.log('WebSocket connection closed'));
      ws.on('socketerror', error => console.log('WebSocket error:', error));
    });

    // Capture network errors
    page.on('requestfailed', request => {
      console.log(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('User Scenario: Check connection status immediately after page load', async () => {
    console.log('👤 User Scenario: Checking connection status on page load...');
    
    // Simulate user looking for connection status right after page loads
    await page.waitForTimeout(1000); // User takes a moment to scan the page
    
    // User looks for connection status indicators
    const statusElement = await page.locator('text="Live Activity Connection Status"').first();
    await expect(statusElement).toBeVisible({ timeout: 5000 });
    
    // User expects to see "Connected" not "Disconnected"
    const connectedStatus = page.locator('text="Connected"').first();
    await expect(connectedStatus).toBeVisible({ timeout: 10000 });
    
    // Take screenshot of successful connection
    await page.screenshot({ 
      path: 'tests/screenshots/user-scenario-connection-success.png',
      fullPage: true 
    });
    
    console.log('✅ User sees connection status as Connected');
  });

  test('User Scenario: Launch terminal and expect it to work immediately', async () => {
    console.log('👤 User Scenario: Launching terminal expecting immediate functionality...');
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // User clicks on terminal or navigates to terminal section
    const terminalButton = page.locator('button:has-text("Terminal"), [data-testid="terminal-button"], .terminal-trigger').first();
    
    if (await terminalButton.isVisible()) {
      await terminalButton.click();
    } else {
      // Navigate to terminal page directly
      await page.goto('http://localhost:3000/terminal');
      await page.waitForLoadState('networkidle');
    }
    
    console.log('User clicked terminal launcher');
    
    // User expects terminal to launch quickly without getting stuck
    await page.waitForTimeout(1000);
    
    // Check for stuck states that frustrate users
    const stuckStates = [
      page.locator('text="Launching"'),
      page.locator('text="Loading"'),
      page.locator('.loading-spinner:visible')
    ];
    
    // These states should disappear quickly (within 8 seconds)
    for (const stuckState of stuckStates) {
      if (await stuckState.isVisible()) {
        console.log('Found loading state, waiting for it to resolve...');
        await expect(stuckState).not.toBeVisible({ timeout: 8000 });
      }
    }
    
    // User expects to see a working terminal
    const terminalReady = page.locator('.xterm, .terminal-ready, [data-testid="terminal-container"]').first();
    await expect(terminalReady).toBeVisible({ timeout: 15000 });
    
    console.log('✅ User sees functional terminal interface');
    
    // Take screenshot of successful terminal launch
    await page.screenshot({ 
      path: 'tests/screenshots/user-scenario-terminal-success.png',
      fullPage: true 
    });
  });

  test('User Scenario: Terminal connection should establish without hanging', async () => {
    console.log('👤 User Scenario: Expecting terminal connection to establish promptly...');
    
    // Navigate to terminal
    await page.goto('http://localhost:3000/terminal');
    await page.waitForLoadState('networkidle');
    
    // User waits a reasonable amount of time for connection
    await page.waitForTimeout(3000);
    
    // User should NOT see perpetual "connecting" messages
    const connectingMessages = [
      page.locator('text="connecting to terminal"'),
      page.locator('text="Connecting..."'),
      page.locator('.connecting-indicator:visible')
    ];
    
    let foundPersistentConnecting = false;
    for (const connectingMsg of connectingMessages) {
      if (await connectingMsg.isVisible()) {
        console.log('Found connecting message, checking if it resolves...');
        try {
          // If still connecting after 12 seconds, that's a problem
          await expect(connectingMsg).not.toBeVisible({ timeout: 12000 });
        } catch (e) {
          foundPersistentConnecting = true;
          console.log('❌ Terminal stuck in connecting state');
        }
      }
    }
    
    expect(foundPersistentConnecting).toBe(false);
    
    // User expects to see terminal ready for input
    const terminalInput = page.locator('.xterm-cursor, .terminal-cursor, input[type="text"]').first();
    await expect(terminalInput).toBeVisible({ timeout: 10000 });
    
    console.log('✅ User sees terminal ready for input');
    
    // Simulate user typing in terminal
    await page.keyboard.type('ls');
    await page.keyboard.press('Enter');
    
    // Wait for command response
    await page.waitForTimeout(2000);
    
    console.log('✅ User successfully interacted with terminal');
  });

  test('User Scenario: Refresh page and expect everything to work again', async () => {
    console.log('👤 User Scenario: Refreshing page and expecting functionality to persist...');
    
    // Initial load
    await page.waitForTimeout(3000);
    
    // User refreshes the page (common user action)
    await page.reload({ waitUntil: 'networkidle' });
    
    console.log('User refreshed the page');
    
    // After refresh, user expects connection status to show connected again
    await page.waitForTimeout(3000);
    
    const connectionStatus = page.locator('text="Connected"').first();
    await expect(connectionStatus).toBeVisible({ timeout: 15000 });
    
    // User tries terminal again after refresh
    const terminalTrigger = page.locator('button:has-text("Terminal"), [data-testid="terminal-button"]').first();
    
    if (await terminalTrigger.isVisible()) {
      await terminalTrigger.click();
      
      // Terminal should work just as well after refresh
      const terminalInterface = page.locator('.xterm, .terminal-container').first();
      await expect(terminalInterface).toBeVisible({ timeout: 10000 });
    }
    
    console.log('✅ User successfully used application after refresh');
  });

  test('User Scenario: Leave tab open for extended period', async () => {
    console.log('👤 User Scenario: Leaving tab open and returning later...');
    
    // Initial connection
    await page.waitForTimeout(3000);
    
    // Simulate user leaving tab for extended period
    await page.evaluate(() => {
      // Simulate background tab behavior
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    });
    
    console.log('Simulated user leaving tab in background');
    
    // Wait for extended period (simulate user away for 30 seconds)
    await page.waitForTimeout(30000);
    
    // User returns to tab
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    
    console.log('User returned to tab');
    
    // Connection should still work or reconnect quickly
    await page.waitForTimeout(5000);
    
    const connectionStatus = page.locator('text="Connected"').first();
    await expect(connectionStatus).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Connection restored after user returned');
  });

  test('User Scenario: Multiple rapid interactions', async () => {
    console.log('👤 User Scenario: User rapidly clicking around the interface...');
    
    await page.waitForTimeout(3000);
    
    // Simulate user rapidly navigating and clicking
    const rapidActions = [
      () => page.click('body'),
      () => page.keyboard.press('Tab'),
      () => page.keyboard.press('Tab'),
      () => page.mouse.move(200, 200),
      () => page.mouse.move(400, 300),
      () => page.click('[role="button"]', { timeout: 1000 }).catch(() => {}),
      () => page.keyboard.press('Escape'),
    ];
    
    // Execute actions rapidly
    for (const action of rapidActions) {
      await action();
      await page.waitForTimeout(200); // Quick succession
    }
    
    console.log('User performed rapid interactions');
    
    // System should remain stable
    const connectionStatus = page.locator('text="Connected"').first();
    await expect(connectionStatus).toBeVisible({ timeout: 5000 });
    
    // No error messages should appear
    const errorMessages = page.locator('.error, .alert-error, [role="alert"]:has-text("error")');
    await expect(errorMessages).not.toBeVisible();
    
    console.log('✅ System remained stable during rapid interactions');
  });

  test('User Scenario: Slow network simulation', async () => {
    console.log('👤 User Scenario: Using application on slow network...');
    
    // Simulate slow network conditions
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.enable');
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 50000, // 50KB/s
      uploadThroughput: 20000,   // 20KB/s
      latency: 500               // 500ms latency
    });
    
    console.log('Simulated slow network conditions');
    
    // Reload page under slow conditions
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    
    // User should still get connected status, just slower
    const connectionStatus = page.locator('text="Connected"').first();
    await expect(connectionStatus).toBeVisible({ timeout: 20000 });
    
    console.log('✅ Connection established even on slow network');
    
    // Restore normal network
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });
});
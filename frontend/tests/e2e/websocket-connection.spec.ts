import { test, expect, Page } from '@playwright/test';

test.describe('WebSocket Connection Validation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable console logging to capture WebSocket events
    page.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('socket')) {
        console.log(`Browser Console: ${msg.text()}`);
      }
    });

    // Monitor network events for WebSocket connections
    page.on('websocket', ws => {
      console.log(`WebSocket URL: ${ws.url()}`);
      ws.on('framesent', event => console.log('WebSocket Frame Sent:', event.payload));
      ws.on('framereceived', event => console.log('WebSocket Frame Received:', event.payload));
      ws.on('close', () => console.log('WebSocket Closed'));
    });

    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for initial page load
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should show Live Activity Connection Status as Connected', async () => {
    console.log('🔍 Testing Live Activity Connection Status...');
    
    // Wait for the connection status element to be visible
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status, text="Live Activity Connection Status"').first();
    
    // Wait up to 10 seconds for connection to establish
    await expect(connectionStatus).toBeVisible({ timeout: 10000 });
    
    // Check for connected state indicators
    const connectedIndicators = [
      page.locator('text="Connected"'),
      page.locator('.status-connected'),
      page.locator('[data-status="connected"]'),
      page.locator('.connection-indicator.connected')
    ];

    let foundConnected = false;
    for (const indicator of connectedIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 5000 });
        foundConnected = true;
        console.log('✅ Found connected status indicator');
        break;
      } catch (e) {
        continue;
      }
    }

    if (!foundConnected) {
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/screenshots/connection-status-fail.png', fullPage: true });
      
      // Log current page content for debugging
      const pageContent = await page.content();
      console.log('Page content when connection failed:', pageContent.substring(0, 1000));
    }

    expect(foundConnected).toBe(true);

    // Ensure it's NOT showing disconnected
    const disconnectedText = page.locator('text="Disconnected"');
    await expect(disconnectedText).not.toBeVisible();

    console.log('✅ Live Activity Connection Status validation passed');
  });

  test('should successfully launch terminal without getting stuck', async () => {
    console.log('🔍 Testing Terminal Launcher...');
    
    // Look for terminal launcher button or interface
    const terminalTriggers = [
      page.locator('[data-testid="terminal-launcher"]'),
      page.locator('button:has-text("Terminal")'),
      page.locator('.terminal-launcher'),
      page.locator('[role="button"]:has-text("Launch Terminal")'),
      page.locator('text="Terminal"').first()
    ];

    let terminalTrigger = null;
    for (const trigger of terminalTriggers) {
      try {
        await expect(trigger).toBeVisible({ timeout: 3000 });
        terminalTrigger = trigger;
        console.log('✅ Found terminal trigger');
        break;
      } catch (e) {
        continue;
      }
    }

    if (!terminalTrigger) {
      // Navigate to a terminal-specific route if needed
      await page.goto('http://localhost:3000/terminal');
      await page.waitForLoadState('networkidle');
      
      // Try to find terminal interface on dedicated page
      terminalTrigger = page.locator('.terminal-container, .xterm, [data-testid="terminal"]').first();
    }

    expect(terminalTrigger).toBeTruthy();
    
    // Click the terminal trigger
    if (terminalTrigger) {
      await terminalTrigger.click();
    }

    // Wait for terminal to initialize (should NOT get stuck on "Launching")
    const launchingStates = [
      page.locator('text="Launching"'),
      page.locator('.launching'),
      page.locator('[data-status="launching"]')
    ];

    // Give it 2 seconds to show launching state, then it should progress
    await page.waitForTimeout(2000);

    // Check that we're not perpetually stuck in launching state
    let stuckInLaunching = false;
    for (const launchingState of launchingStates) {
      try {
        await expect(launchingState).not.toBeVisible({ timeout: 8000 });
      } catch (e) {
        stuckInLaunching = true;
        console.log('❌ Terminal appears stuck in launching state');
      }
    }

    expect(stuckInLaunching).toBe(false);

    // Look for successful terminal initialization indicators
    const terminalReadyIndicators = [
      page.locator('.xterm-cursor'),
      page.locator('.terminal-ready'),
      page.locator('[data-testid="terminal-ready"]'),
      page.locator('.xterm-viewport')
    ];

    let terminalReady = false;
    for (const indicator of terminalReadyIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 10000 });
        terminalReady = true;
        console.log('✅ Terminal successfully initialized');
        break;
      } catch (e) {
        continue;
      }
    }

    if (!terminalReady) {
      await page.screenshot({ path: 'tests/screenshots/terminal-launch-fail.png', fullPage: true });
    }

    expect(terminalReady).toBe(true);
    console.log('✅ Terminal launcher validation passed');
  });

  test('should establish terminal connection instead of staying in connecting state', async () => {
    console.log('🔍 Testing Terminal Connection Establishment...');
    
    // Navigate to terminal or trigger terminal connection
    await page.goto('http://localhost:3000/terminal');
    await page.waitForLoadState('networkidle');

    // Wait for connection attempt
    await page.waitForTimeout(3000);

    // Check that we're not stuck in "connecting" state
    const connectingStates = [
      page.locator('text="connecting to terminal"'),
      page.locator('text="Connecting"'),
      page.locator('.connecting'),
      page.locator('[data-status="connecting"]')
    ];

    let stuckConnecting = false;
    for (const connectingState of connectingStates) {
      try {
        // If we find connecting state, wait to see if it resolves
        if (await connectingState.isVisible()) {
          console.log('Found connecting state, waiting for resolution...');
          await expect(connectingState).not.toBeVisible({ timeout: 15000 });
        }
      } catch (e) {
        stuckConnecting = true;
        console.log('❌ Terminal connection appears stuck in connecting state');
      }
    }

    expect(stuckConnecting).toBe(false);

    // Look for successful connection indicators
    const connectionSuccessIndicators = [
      page.locator('text="Connected"'),
      page.locator('.terminal-connected'),
      page.locator('[data-status="connected"]'),
      page.locator('.xterm-screen')
    ];

    let connectionEstablished = false;
    for (const indicator of connectionSuccessIndicators) {
      try {
        await expect(indicator).toBeVisible({ timeout: 10000 });
        connectionEstablished = true;
        console.log('✅ Terminal connection successfully established');
        break;
      } catch (e) {
        continue;
      }
    }

    if (!connectionEstablished) {
      await page.screenshot({ path: 'tests/screenshots/terminal-connection-fail.png', fullPage: true });
      
      // Log WebSocket network activity
      const wsConnections = await page.evaluate(() => {
        return (window as any).webSocketConnections || 'No WebSocket tracking available';
      });
      console.log('WebSocket connections:', wsConnections);
    }

    expect(connectionEstablished).toBe(true);
    console.log('✅ Terminal connection establishment validation passed');
  });

  test('should handle WebSocket reconnection scenarios gracefully', async () => {
    console.log('🔍 Testing WebSocket Reconnection...');
    
    // Wait for initial connection
    await page.waitForTimeout(3000);
    
    // Simulate network interruption by closing WebSocket connections
    await page.evaluate(() => {
      // Close all existing WebSocket connections
      if ((window as any).webSocketInstances) {
        (window as any).webSocketInstances.forEach((ws: WebSocket) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    });

    console.log('🔧 Simulated network interruption');
    
    // Wait for reconnection attempt
    await page.waitForTimeout(5000);
    
    // Check that connection is restored
    const connectionRestored = await page.evaluate(() => {
      return new Promise((resolve) => {
        const checkConnection = () => {
          const statusElements = document.querySelectorAll('[data-testid="connection-status"], .connection-status');
          for (const element of statusElements) {
            if (element.textContent?.includes('Connected')) {
              resolve(true);
              return;
            }
          }
          
          // Check for WebSocket connections
          if ((window as any).webSocketInstances) {
            const activeConnections = (window as any).webSocketInstances.filter(
              (ws: WebSocket) => ws.readyState === WebSocket.OPEN
            );
            if (activeConnections.length > 0) {
              resolve(true);
              return;
            }
          }
          
          setTimeout(checkConnection, 1000);
        };
        
        checkConnection();
        
        // Timeout after 15 seconds
        setTimeout(() => resolve(false), 15000);
      });
    });

    expect(connectionRestored).toBe(true);
    console.log('✅ WebSocket reconnection validation passed');
  });

  test('should maintain stable WebSocket connection during user interactions', async () => {
    console.log('🔍 Testing WebSocket Stability During Interactions...');
    
    // Wait for initial connection
    await page.waitForTimeout(3000);
    
    // Perform various user interactions
    const interactions = [
      () => page.click('body'),
      () => page.keyboard.press('Tab'),
      () => page.mouse.move(100, 100),
      () => page.goto('http://localhost:3000/#dashboard'),
      () => page.goBack(),
      () => page.reload({ waitUntil: 'networkidle' })
    ];

    for (const interaction of interactions) {
      await interaction();
      await page.waitForTimeout(1000);
      
      // Check connection is still stable
      const connectionStable = await page.evaluate(() => {
        const statusElements = document.querySelectorAll('[data-testid="connection-status"], .connection-status');
        for (const element of statusElements) {
          if (element.textContent?.includes('Disconnected')) {
            return false;
          }
        }
        return true;
      });
      
      expect(connectionStable).toBe(true);
    }

    console.log('✅ WebSocket stability validation passed');
  });
});
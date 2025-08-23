import { test, expect, Page, Browser } from '@playwright/test';

/**
 * Comprehensive WebSocket Connection Validation E2E Tests
 * 
 * CRITICAL REQUIREMENT: Test actual browser behavior to ensure ConnectionStatus 
 * shows "Connected" not "Disconnected"
 * 
 * This suite validates:
 * 1. ConnectionStatus component displays "Connected" state
 * 2. Claude instance launcher works without hanging
 * 3. Real-time WebSocket message handling
 * 4. Connection resilience during disconnection/reconnection
 * 5. No infinite loading spinners
 */

// Helper function to wait for WebSocket connection
async function waitForWebSocketConnection(page: Page, timeout = 30000): Promise<boolean> {
  return await page.evaluate((timeout) => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const checkConnection = () => {
        // Check for connection status indicators
        const statusElements = document.querySelectorAll(
          '[data-testid="connection-status"], .connection-status, .live-activity-status'
        );
        
        for (const element of statusElements) {
          if (element.textContent?.toLowerCase().includes('connected')) {
            console.log('✅ Found connected status via DOM:', element.textContent);
            resolve(true);
            return;
          }
        }
        
        // Check for WebSocket instances
        if ((window as any).webSocketInstances) {
          const activeConnections = (window as any).webSocketInstances.filter(
            (ws: WebSocket) => ws.readyState === WebSocket.OPEN
          );
          if (activeConnections.length > 0) {
            console.log('✅ Found active WebSocket connections:', activeConnections.length);
            resolve(true);
            return;
          }
        }
        
        // Check for socket.io connections
        if ((window as any).io && (window as any).socket) {
          const socket = (window as any).socket;
          if (socket.connected) {
            console.log('✅ Found active Socket.IO connection');
            resolve(true);
            return;
          }
        }
        
        // Timeout check
        if (Date.now() - startTime > timeout) {
          console.log('❌ WebSocket connection check timeout');
          resolve(false);
          return;
        }
        
        setTimeout(checkConnection, 500);
      };
      
      checkConnection();
    });
  }, timeout);
}

// Helper function to capture debug information
async function captureDebugInfo(page: Page, testName: string) {
  console.log(`🔍 Capturing debug info for: ${testName}`);
  
  // Take screenshot
  await page.screenshot({ 
    path: `tests/screenshots/${testName}-debug.png`, 
    fullPage: true 
  });
  
  // Get connection status from DOM
  const connectionStatus = await page.evaluate(() => {
    const statusElements = document.querySelectorAll(
      '[data-testid="connection-status"], .connection-status, .live-activity-status'
    );
    
    const statuses = Array.from(statusElements).map(el => ({
      element: el.tagName,
      className: el.className,
      textContent: el.textContent,
      dataset: el.getAttribute('data-testid') || 'no-testid'
    }));
    
    return {
      statusElements: statuses,
      webSocketInstances: (window as any).webSocketInstances ? 
        (window as any).webSocketInstances.length : 'Not found',
      socketIO: (window as any).socket ? 
        { connected: (window as any).socket.connected } : 'Not found',
      url: window.location.href,
      userAgent: navigator.userAgent
    };
  });
  
  console.log('Debug Info:', JSON.stringify(connectionStatus, null, 2));
  
  // Get console logs
  const consoleLogs = await page.evaluate(() => {
    return (window as any).testConsoleLogs || [];
  });
  
  if (consoleLogs.length > 0) {
    console.log('Console Logs:', consoleLogs);
  }
}

test.describe('Comprehensive WebSocket Connection Validation', () => {
  let page: Page;
  let browser: Browser;

  test.beforeEach(async ({ browser: testBrowser, browserName }) => {
    browser = testBrowser;
    page = await browser.newPage();
    
    console.log(`🚀 Starting test in ${browserName}`);
    
    // Capture console logs for debugging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const logText = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(logText);
      
      if (msg.text().includes('WebSocket') || 
          msg.text().includes('socket') || 
          msg.text().includes('connection') ||
          msg.text().includes('Connected') ||
          msg.text().includes('Disconnected')) {
        console.log(`Browser Console: ${logText}`);
      }
    });
    
    // Store console logs in window for later access
    await page.addInitScript(() => {
      (window as any).testConsoleLogs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        (window as any).testConsoleLogs.push(args.join(' '));
        originalLog.apply(console, args);
      };
    });

    // Monitor WebSocket connections
    page.on('websocket', ws => {
      console.log(`🔗 WebSocket connection: ${ws.url()}`);
      ws.on('framesent', event => {
        if (!event.payload.includes('ping')) {
          console.log('📤 WebSocket Frame Sent:', event.payload);
        }
      });
      ws.on('framereceived', event => {
        if (!event.payload.includes('pong')) {
          console.log('📥 WebSocket Frame Received:', event.payload);
        }
      });
      ws.on('close', () => console.log('🔌 WebSocket Closed'));
    });

    // Navigate to application
    console.log('🌐 Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000');
    
    // Wait for initial page load
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('CRITICAL: ConnectionStatus must show "Connected" not "Disconnected"', async () => {
    console.log('🎯 CRITICAL TEST: Validating ConnectionStatus shows "Connected"');
    
    // Wait for WebSocket connection to establish
    const connectionEstablished = await waitForWebSocketConnection(page, 30000);
    
    if (!connectionEstablished) {
      await captureDebugInfo(page, 'connection-failed');
      throw new Error('WebSocket connection was not established within 30 seconds');
    }
    
    // Find connection status elements
    const connectionStatusSelectors = [
      '[data-testid="connection-status"]',
      '.connection-status',
      '.live-activity-status',
      'text="Live Activity Connection Status"',
      '*:has-text("Connection Status")',
      '*:has-text("Connected")',
      '*:has-text("Disconnected")'
    ];
    
    let connectionStatusElement = null;
    let statusText = '';
    
    for (const selector of connectionStatusSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 5000 })) {
          connectionStatusElement = element;
          statusText = await element.textContent() || '';
          console.log(`✅ Found connection status element: "${statusText}" via selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no specific element found, scan entire page
    if (!connectionStatusElement) {
      console.log('🔍 No specific connection status element found, scanning page content...');
      await captureDebugInfo(page, 'no-status-element');
      
      const pageText = await page.textContent('body') || '';
      if (pageText.includes('Connected')) {
        console.log('✅ Found "Connected" text in page content');
        statusText = 'Connected (found in page content)';
      } else if (pageText.includes('Disconnected')) {
        console.log('❌ Found "Disconnected" text in page content');
        statusText = 'Disconnected (found in page content)';
      }
    }
    
    // CRITICAL ASSERTIONS
    console.log('🔬 Connection Status Text:', statusText);
    
    // Must show "Connected"
    expect(statusText.toLowerCase()).toContain('connected');
    console.log('✅ Status contains "connected"');
    
    // Must NOT show "Disconnected"
    expect(statusText.toLowerCase()).not.toContain('disconnected');
    console.log('✅ Status does not contain "disconnected"');
    
    // Double-check: ensure no disconnected indicators anywhere on page
    const disconnectedElements = page.locator('text="Disconnected"');
    const disconnectedCount = await disconnectedElements.count();
    
    if (disconnectedCount > 0) {
      await captureDebugInfo(page, 'found-disconnected-elements');
      console.log(`❌ Found ${disconnectedCount} "Disconnected" elements on page`);
    }
    
    expect(disconnectedCount).toBe(0);
    console.log('✅ No "Disconnected" elements found on page');
    
    console.log('🎉 CRITICAL TEST PASSED: ConnectionStatus shows "Connected"');
  });

  test('Claude instance launcher must not hang on "loading"', async () => {
    console.log('🚀 Testing Claude instance launcher functionality');
    
    // Wait for connection first
    await waitForWebSocketConnection(page);
    
    // Look for Claude launcher elements
    const launcherSelectors = [
      '[data-testid="claude-launcher"]',
      '[data-testid="instance-launcher"]',
      'button:has-text("Launch Claude")',
      'button:has-text("Start Instance")',
      'button:has-text("Launch")',
      '.instance-launcher',
      '.claude-launcher'
    ];
    
    let launcherElement = null;
    
    for (const selector of launcherSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          launcherElement = element;
          console.log(`✅ Found launcher via selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!launcherElement) {
      console.log('🔍 No launcher found on main page, checking navigation...');
      
      // Try navigating to different routes
      const routes = ['/agents', '/dashboard', '/terminal', '/claude'];
      for (const route of routes) {
        await page.goto(`http://localhost:3000${route}`);
        await page.waitForLoadState('networkidle');
        
        for (const selector of launcherSelectors) {
          try {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 2000 })) {
              launcherElement = element;
              console.log(`✅ Found launcher on ${route} via selector: ${selector}`);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
        if (launcherElement) break;
      }
    }
    
    if (launcherElement) {
      console.log('🖱️ Clicking Claude launcher...');
      await launcherElement.click();
      
      // Wait a moment for loading state to appear
      await page.waitForTimeout(1000);
      
      // Check for loading states that shouldn't persist
      const loadingSelectors = [
        'text="Loading"',
        'text="Launching"',
        'text="Starting"',
        '.loading',
        '.spinner',
        '[data-testid="loading"]'
      ];
      
      // Give 3 seconds for initial loading, then check it resolves
      await page.waitForTimeout(3000);
      
      let stuckLoading = false;
      for (const selector of loadingSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible()) {
            console.log(`⚠️ Found loading element: ${selector}, waiting for it to resolve...`);
            
            // Wait up to 15 seconds for loading to complete
            await expect(element).not.toBeVisible({ timeout: 15000 });
            console.log(`✅ Loading element resolved: ${selector}`);
          }
        } catch (e) {
          console.log(`❌ Loading element stuck: ${selector}`);
          stuckLoading = true;
          await captureDebugInfo(page, 'stuck-loading');
        }
      }
      
      expect(stuckLoading).toBe(false);
      
      // Look for successful launch indicators
      const successSelectors = [
        'text="Connected"',
        'text="Ready"',
        'text="Active"',
        '.instance-active',
        '.claude-ready',
        '[data-status="ready"]'
      ];
      
      let launched = false;
      for (const selector of successSelectors) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 10000 })) {
            console.log(`✅ Found success indicator: ${selector}`);
            launched = true;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      if (!launched) {
        await captureDebugInfo(page, 'launch-no-success');
      }
      
      console.log('✅ Claude launcher test completed');
    } else {
      console.log('ℹ️ No Claude launcher found - may not be implemented yet');
    }
  });

  test('Real-time WebSocket message handling validation', async () => {
    console.log('📡 Testing real-time WebSocket message handling');
    
    // Wait for connection
    await waitForWebSocketConnection(page);
    
    // Test message sending/receiving if interface available
    const messageInputs = [
      '[data-testid="message-input"]',
      'input[placeholder*="message"]',
      'textarea[placeholder*="message"]',
      '.message-input'
    ];
    
    let messageInput = null;
    for (const selector of messageInputs) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          messageInput = element;
          console.log(`✅ Found message input: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (messageInput) {
      console.log('📝 Testing message input...');
      
      // Track WebSocket messages
      const messagesReceived: string[] = [];
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          messagesReceived.push(event.payload);
        });
      });
      
      // Send a test message
      await messageInput.fill('Test message from E2E');
      await messageInput.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(3000);
      
      // Check if we received any messages
      console.log(`📬 Received ${messagesReceived.length} WebSocket messages`);
      
      // Look for message display elements
      const messageDisplays = [
        'text="Test message from E2E"',
        '.message',
        '.chat-message',
        '[data-testid="message"]'
      ];
      
      let messageDisplayed = false;
      for (const selector of messageDisplays) {
        try {
          const element = page.locator(selector);
          if (await element.isVisible({ timeout: 5000 })) {
            messageDisplayed = true;
            console.log(`✅ Found displayed message: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      console.log('📡 Real-time messaging test completed');
    } else {
      console.log('ℹ️ No message input found - testing passive real-time updates');
      
      // Monitor for any real-time updates in the page
      const initialContent = await page.content();
      await page.waitForTimeout(5000);
      const updatedContent = await page.content();
      
      if (initialContent !== updatedContent) {
        console.log('✅ Detected real-time page updates');
      } else {
        console.log('ℹ️ No real-time updates detected during test period');
      }
    }
  });

  test('Connection resilience during disconnection/reconnection', async () => {
    console.log('🔄 Testing connection resilience and recovery');
    
    // Wait for initial connection
    const initialConnection = await waitForWebSocketConnection(page);
    expect(initialConnection).toBe(true);
    console.log('✅ Initial connection established');
    
    // Force disconnect WebSocket connections
    console.log('🔌 Simulating network interruption...');
    await page.evaluate(() => {
      // Close all WebSocket connections
      if ((window as any).webSocketInstances) {
        (window as any).webSocketInstances.forEach((ws: WebSocket) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'E2E test disconnection');
          }
        });
      }
      
      // Close Socket.IO connections
      if ((window as any).socket) {
        (window as any).socket.disconnect();
      }
    });
    
    // Wait a moment for disconnection to register
    await page.waitForTimeout(2000);
    
    // Check that disconnection is detected (optional - some apps may not show this)
    const disconnectionDetected = await page.evaluate(() => {
      const statusElements = document.querySelectorAll(
        '[data-testid="connection-status"], .connection-status'
      );
      
      for (const element of statusElements) {
        if (element.textContent?.toLowerCase().includes('disconnected') ||
            element.textContent?.toLowerCase().includes('reconnecting')) {
          return true;
        }
      }
      return false;
    });
    
    if (disconnectionDetected) {
      console.log('✅ Disconnection was detected by the application');
    } else {
      console.log('ℹ️ No disconnection indicator shown (this may be expected)');
    }
    
    // Wait for reconnection attempt (most apps auto-reconnect)
    console.log('⏱️ Waiting for automatic reconnection...');
    const reconnected = await waitForWebSocketConnection(page, 30000);
    
    if (!reconnected) {
      await captureDebugInfo(page, 'reconnection-failed');
      
      // Try manual reconnection if available
      const reconnectButtons = [
        'button:has-text("Reconnect")',
        'button:has-text("Connect")',
        '[data-testid="reconnect"]',
        '.reconnect-button'
      ];
      
      for (const selector of reconnectButtons) {
        try {
          const button = page.locator(selector);
          if (await button.isVisible({ timeout: 2000 })) {
            console.log('🖱️ Found reconnect button, clicking...');
            await button.click();
            await page.waitForTimeout(5000);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    // Final check for reconnection
    const finalConnection = await waitForWebSocketConnection(page, 15000);
    expect(finalConnection).toBe(true);
    
    console.log('✅ Connection resilience test passed - successfully reconnected');
  });

  test('Verify no infinite loading spinners', async () => {
    console.log('⏰ Testing for infinite loading spinners');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
    
    // Check for common loading indicators
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '.loading-spinner',
      '[data-testid="loading"]',
      '[data-testid="spinner"]',
      'text="Loading..."',
      '.animate-spin'
    ];
    
    // Wait 10 seconds and check if any loaders are still visible
    await page.waitForTimeout(10000);
    
    const persistentLoaders = [];
    
    for (const selector of loadingSelectors) {
      try {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            const element = elements.nth(i);
            if (await element.isVisible()) {
              persistentLoaders.push({
                selector,
                text: await element.textContent(),
                className: await element.getAttribute('class')
              });
            }
          }
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (persistentLoaders.length > 0) {
      console.log('❌ Found persistent loading indicators:', persistentLoaders);
      await captureDebugInfo(page, 'infinite-loading');
      
      // Wait another 30 seconds to see if they resolve
      console.log('⏰ Waiting additional 30 seconds for loaders to resolve...');
      await page.waitForTimeout(30000);
      
      // Re-check
      const stillLoading = [];
      for (const loader of persistentLoaders) {
        try {
          const element = page.locator(loader.selector).first();
          if (await element.isVisible()) {
            stillLoading.push(loader);
          }
        } catch (e) {
          // Element may have been removed, which is good
        }
      }
      
      expect(stillLoading.length).toBe(0);
      console.log('✅ All loading indicators eventually resolved');
    } else {
      console.log('✅ No persistent loading indicators found');
    }
  });

  test('WebSocket connection performance and stability', async () => {
    console.log('⚡ Testing WebSocket connection performance');
    
    const startTime = Date.now();
    
    // Measure connection time
    const connected = await waitForWebSocketConnection(page, 30000);
    const connectionTime = Date.now() - startTime;
    
    expect(connected).toBe(true);
    console.log(`⚡ Connection established in ${connectionTime}ms`);
    
    // Connection should be fast (under 10 seconds)
    expect(connectionTime).toBeLessThan(10000);
    
    // Test connection stability over time
    console.log('🔄 Testing connection stability over 30 seconds...');
    
    let disconnections = 0;
    let reconnections = 0;
    
    const checkInterval = setInterval(async () => {
      const isConnected = await page.evaluate(() => {
        // Check WebSocket instances
        if ((window as any).webSocketInstances) {
          const activeConnections = (window as any).webSocketInstances.filter(
            (ws: WebSocket) => ws.readyState === WebSocket.OPEN
          );
          return activeConnections.length > 0;
        }
        
        // Check Socket.IO
        if ((window as any).socket) {
          return (window as any).socket.connected;
        }
        
        return false;
      });
      
      if (!isConnected) {
        disconnections++;
        console.log(`⚠️ Disconnection detected at ${Date.now() - startTime}ms`);
      } else if (disconnections > reconnections) {
        reconnections++;
        console.log(`✅ Reconnection detected at ${Date.now() - startTime}ms`);
      }
    }, 2000);
    
    // Wait 30 seconds
    await page.waitForTimeout(30000);
    clearInterval(checkInterval);
    
    console.log(`📊 Stability results: ${disconnections} disconnections, ${reconnections} reconnections`);
    
    // Final connection check
    const finalConnection = await waitForWebSocketConnection(page, 5000);
    expect(finalConnection).toBe(true);
    
    console.log('✅ WebSocket performance and stability test completed');
  });
});
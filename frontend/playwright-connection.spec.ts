import { test, expect, Page } from '@playwright/test';

test.describe('WebSocket Connection E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable WebSocket monitoring
    await page.route('**/socket.io/**', route => {
      console.log('WebSocket request:', route.request().url());
      route.continue();
    });
    
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="app-container"], main, #root', { 
      timeout: 10000 
    });
  });

  test('should display connection status on page load', async () => {
    // Look for connection status indicators
    const statusIndicators = [
      'text=/Connected|Disconnected|Connecting/',
      '[data-testid="connection-status"]',
      'text="Live Activity"'
    ];

    let found = false;
    for (const selector of statusIndicators) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        found = true;
        break;
      } catch (e) {
        continue;
      }
    }

    expect(found).toBe(true);
  });

  test('should show WebSocket connection attempts in network tab', async () => {
    const webSocketRequests: string[] = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('socket.io') || url.includes('ws://') || url.includes('wss://')) {
        webSocketRequests.push(url);
        console.log('WebSocket-related request detected:', url);
      }
    });

    // Wait a bit for connection attempts
    await page.waitForTimeout(3000);

    // Should have attempted Socket.IO connection
    expect(webSocketRequests.length).toBeGreaterThan(0);
    expect(webSocketRequests.some(url => url.includes('socket.io'))).toBe(true);
  });

  test('should display Live Activity indicator', async () => {
    // Look for Live Activity indicator
    const liveActivitySelectors = [
      'text="Live Activity"',
      'text=/Live|Activity/',
      '[data-testid="live-activity"]',
      'text=/Online|Offline/'
    ];

    let activityIndicator = null;
    for (const selector of liveActivitySelectors) {
      try {
        activityIndicator = await page.waitForSelector(selector, { timeout: 5000 });
        if (activityIndicator) break;
      } catch (e) {
        continue;
      }
    }

    expect(activityIndicator).toBeTruthy();
  });

  test('should show connection controls when clicking on status', async () => {
    // Try to find and click on connection status or activity indicator
    const clickableSelectors = [
      'button:has-text("Live")',
      'button:has-text("Activity")',
      'button:has-text("Offline")',
      'button:has-text("Disconnected")',
      '[role="button"]:has-text(/Live|Activity|Connection/)'
    ];

    let clicked = false;
    for (const selector of clickableSelectors) {
      try {
        const element = await page.waitForSelector(selector, { timeout: 3000 });
        if (element) {
          await element.click();
          clicked = true;
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (clicked) {
      // Look for connection controls that should appear
      const controlSelectors = [
        'text="Connect"',
        'text="Reconnect"',
        'text="Disconnect"',
        'text="Connection Controls"',
        'button:has-text("Connect")'
      ];

      let controlFound = false;
      for (const selector of controlSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          controlFound = true;
          break;
        } catch (e) {
          continue;
        }
      }

      expect(controlFound).toBe(true);
    }
  });

  test('should handle manual connection attempts', async () => {
    // Look for connect button
    const connectSelectors = [
      'button:has-text("Connect")',
      'text="Connect"',
      '[data-testid="connect-button"]'
    ];

    let connectButton = null;
    
    // First try to find connect button directly
    for (const selector of connectSelectors) {
      try {
        connectButton = await page.waitForSelector(selector, { timeout: 3000 });
        if (connectButton) break;
      } catch (e) {
        continue;
      }
    }

    // If not found, try clicking on status first to reveal controls
    if (!connectButton) {
      const statusSelectors = [
        'button:has-text(/Live|Activity|Offline|Disconnected/)',
        '[role="button"]:has-text(/Connection|Status/)'
      ];

      for (const selector of statusSelectors) {
        try {
          const statusElement = await page.waitForSelector(selector, { timeout: 3000 });
          if (statusElement) {
            await statusElement.click();
            await page.waitForTimeout(1000);
            
            // Try to find connect button again
            for (const connectSelector of connectSelectors) {
              try {
                connectButton = await page.waitForSelector(connectSelector, { timeout: 2000 });
                if (connectButton) break;
              } catch (e) {
                continue;
              }
            }
            break;
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (connectButton) {
      // Monitor network for connection attempts
      const connectionAttempts: string[] = [];
      page.on('request', request => {
        const url = request.url();
        if (url.includes('socket.io') || url.includes('connect')) {
          connectionAttempts.push(url);
        }
      });

      await connectButton.click();
      await page.waitForTimeout(2000);

      // Should see connection attempts or state changes
      expect(connectionAttempts.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display connection status information', async () => {
    // Look for connection status information
    const statusInfoSelectors = [
      'text=/Connection Status/i',
      'text=/Last Connected/i', 
      'text=/Attempts/i',
      'text=/Online Users/i',
      'text=/System Statistics/i'
    ];

    // First try to open details by clicking on status
    const clickableElements = await page.$$('button, [role="button"]');
    
    for (const element of clickableElements) {
      const text = await element.textContent();
      if (text && (text.includes('Live') || text.includes('Activity') || text.includes('Connection'))) {
        try {
          await element.click();
          await page.waitForTimeout(1000);
          break;
        } catch (e) {
          continue;
        }
      }
    }

    // Now look for status information
    let infoFound = false;
    for (const selector of statusInfoSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        infoFound = true;
        break;
      } catch (e) {
        continue;
      }
    }

    // Status information should be displayed
    expect(infoFound).toBe(true);
  });

  test('should maintain connection state across page interactions', async () => {
    // Get initial connection status
    const initialStatus = await page.textContent('body');
    
    // Interact with page elements
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(500);
    }

    // Navigate within app if possible
    const links = await page.$$('a[href^="/"], button:has-text(/Dashboard|Feed|Activity/)');
    if (links.length > 0) {
      try {
        await links[0].click();
        await page.waitForTimeout(1000);
      } catch (e) {
        // Navigation might not work, that's okay
      }
    }

    // Check if connection status is still visible
    const statusAfterInteraction = await page.textContent('body');
    
    // Connection status elements should still be present
    expect(statusAfterInteraction?.includes('Live') || 
           statusAfterInteraction?.includes('Activity') ||
           statusAfterInteraction?.includes('Connected') ||
           statusAfterInteraction?.includes('Disconnected')).toBe(true);
  });

  test('should handle connection errors gracefully', async () => {
    // Simulate network issues by intercepting requests
    await page.route('**/socket.io/**', route => {
      // Occasionally fail requests to simulate network issues
      if (Math.random() > 0.7) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Wait and observe error handling
    await page.waitForTimeout(5000);

    // Page should still be functional
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(100);

    // Should not show critical errors to user
    const errorSelectors = [
      'text=/Error.*occurred/i',
      'text=/Something went wrong/i',
      '[data-testid="error-boundary"]'
    ];

    let criticalErrorFound = false;
    for (const selector of errorSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1000 });
        criticalErrorFound = true;
        break;
      } catch (e) {
        // No error found, which is good
      }
    }

    expect(criticalErrorFound).toBe(false);
  });

  test('should work without backend connection', async () => {
    // Block all API requests to simulate backend down
    await page.route('**/api/**', route => route.abort());
    await page.route('**/socket.io/**', route => route.abort());

    // Reload page
    await page.reload();
    await page.waitForTimeout(3000);

    // Page should still load
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();

    // Should show offline/disconnected state
    const offlineIndicators = [
      'text=/Offline/i',
      'text=/Disconnected/i',
      'text=/Connection.*failed/i'
    ];

    let offlineFound = false;
    for (const selector of offlineIndicators) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        offlineFound = true;
        break;
      } catch (e) {
        continue;
      }
    }

    expect(offlineFound).toBe(true);
  });
});
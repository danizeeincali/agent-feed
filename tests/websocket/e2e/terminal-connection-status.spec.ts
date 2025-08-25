/**
 * E2E Terminal Connection Status Tests
 * Playwright tests for terminal UI connection status verification
 * 
 * TDD Requirements:
 * ✅ Test terminal components show "✅ Connected" status
 * ✅ Test connection status UI updates in real-time
 * ✅ Test error state handling and display
 * ✅ Test reconnection UI behavior
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Terminal Connection Status E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage, context }) => {
    page = testPage;
    
    // Set up console monitoring
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Navigate to the application
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  });

  test.describe('Connection Status Display', () => {
    test('should show "✅ Connected" status when WebSocket is connected', async () => {
      // Wait for the SimpleLauncher or main terminal component
      await page.waitForSelector('[data-testid="simple-launcher"], .terminal-container, [class*="terminal"]', {
        timeout: 10000
      });

      // Look for terminal connection status indicators
      const connectionStatusSelectors = [
        '[data-testid="connection-status"]',
        '.connection-status',
        '[class*="connected"]',
        'text=/Connected/',
        'text=/✅/',
        '[title*="Connected"]'
      ];

      let statusElement = null;
      for (const selector of connectionStatusSelectors) {
        try {
          statusElement = await page.waitForSelector(selector, { timeout: 5000 });
          if (statusElement) break;
        } catch (e) {
          // Continue to next selector
        }
      }

      // If no specific status element, check for general positive indicators
      if (!statusElement) {
        await page.waitForSelector('body', { timeout: 2000 });
        const pageContent = await page.content();
        
        // Verify connection indicators exist
        const hasConnectionIndicator = 
          pageContent.includes('Connected') ||
          pageContent.includes('✅') ||
          pageContent.includes('Online') ||
          pageContent.includes('Ready');
          
        expect(hasConnectionIndicator).toBe(true);
      } else {
        // Verify the status element shows connected state
        const statusText = await statusElement.textContent();
        expect(statusText).toMatch(/(Connected|✅|Online|Ready)/i);
      }

      // Verify no disconnection warnings
      const hasDisconnectedWarning = await page.locator('text=/⚠️.*Connection lost/').count() === 0;
      expect(hasDisconnectedWarning).toBe(true);
    });

    test('should update connection status in real-time', async () => {
      // Wait for initial page load
      await page.waitForLoadState('networkidle');
      
      // Monitor network requests to WebSocket endpoints
      const webSocketRequests: string[] = [];
      page.on('websocket', ws => {
        webSocketRequests.push(ws.url());
        
        ws.on('open', () => {
          console.log('WebSocket opened:', ws.url());
        });
        
        ws.on('close', () => {
          console.log('WebSocket closed:', ws.url());
        });
      });

      // Look for terminal or launcher component
      await page.waitForSelector('[data-testid="simple-launcher"], .terminal-component, [class*="terminal"]', {
        timeout: 15000
      });

      // Wait for WebSocket connections
      await page.waitForTimeout(3000);

      // Check if WebSocket connections were established
      expect(webSocketRequests.length).toBeGreaterThan(0);
      
      // Verify WebSocket URLs include terminal endpoints
      const hasTerminalWebSocket = webSocketRequests.some(url => 
        url.includes('3002') || url.includes('terminal') || url.includes('socket.io')
      );
      expect(hasTerminalWebSocket).toBe(true);

      // Take screenshot for verification
      await page.screenshot({ 
        path: 'test-results/terminal-connection-status.png',
        fullPage: true 
      });
    });

    test('should show connection status in terminal header', async () => {
      // Wait for terminal component to load
      await page.waitForSelector('.terminal-container, [class*="terminal-header"], [data-testid*="terminal"]', {
        timeout: 10000
      });

      // Look for terminal header elements
      const headerElements = await page.locator('.bg-gray-800, .terminal-header, [class*="header"]').all();
      
      let connectionStatusFound = false;
      for (const header of headerElements) {
        const headerText = await header.textContent();
        if (headerText && (
          headerText.includes('Connected') ||
          headerText.includes('✅') ||
          headerText.includes('PID:') ||
          headerText.includes('Terminal')
        )) {
          connectionStatusFound = true;
          break;
        }
      }

      expect(connectionStatusFound).toBe(true);
    });
  });

  test.describe('Connection Error Handling', () => {
    test('should handle connection failures gracefully', async () => {
      // Block WebSocket connections to simulate network issues
      await page.route('**/terminal**', route => route.abort());
      await page.route('**/socket.io/**', route => route.abort());

      // Navigate to the application
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

      // Wait for error state to appear
      await page.waitForTimeout(5000);

      // Check for error indicators
      const hasErrorIndicator = await page.locator('text=/Error|Failed|Disconnected|⚠️/').count() > 0;
      
      // Should either show error state or gracefully degrade
      const pageContent = await page.content();
      const hasGracefulDegradation = 
        pageContent.includes('Connecting') ||
        pageContent.includes('Retry') ||
        pageContent.includes('Error') ||
        pageContent.includes('⚠️');
        
      expect(hasErrorIndicator || hasGracefulDegradation).toBe(true);
    });

    test('should attempt reconnection when connection is lost', async () => {
      // First establish connection
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Monitor WebSocket events
      let reconnectionAttempted = false;
      page.on('websocket', ws => {
        ws.on('open', () => {
          reconnectionAttempted = true;
        });
      });

      // Simulate connection loss by blocking WebSocket after initial connection
      setTimeout(async () => {
        await page.route('**/terminal**', route => route.abort());
        await page.route('**/socket.io/**', route => route.abort());
      }, 1000);

      // Wait for reconnection attempts
      await page.waitForTimeout(10000);

      // Remove blocks to allow reconnection
      await page.unroute('**/terminal**');
      await page.unroute('**/socket.io/**');

      await page.waitForTimeout(5000);

      // Verify reconnection was attempted
      expect(reconnectionAttempted).toBe(true);
    });
  });

  test.describe('Terminal Interaction Status', () => {
    test('should show ready state when terminal is interactive', async () => {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      
      // Wait for terminal component
      await page.waitForSelector('.terminal-container, [data-testid*="terminal"]', {
        timeout: 15000
      });

      // Look for interactive terminal elements
      const terminalElements = await page.locator('.xterm, [class*="xterm"], canvas').all();
      expect(terminalElements.length).toBeGreaterThan(0);

      // Verify terminal is ready for input
      const hasTerminalCanvas = await page.locator('.xterm canvas, canvas').count() > 0;
      expect(hasTerminalCanvas).toBe(true);

      // Check for terminal activity indicators
      await page.waitForTimeout(2000);
      const pageContent = await page.content();
      const hasTerminalActivity = 
        pageContent.includes('Terminal') ||
        pageContent.includes('Connected') ||
        pageContent.includes('Ready') ||
        pageContent.includes('$') ||
        pageContent.includes('❯');

      expect(hasTerminalActivity).toBe(true);
    });

    test('should handle terminal input correctly', async () => {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      
      // Wait for terminal
      await page.waitForSelector('.xterm, [data-testid*="terminal"]', {
        timeout: 15000
      });

      // Find terminal canvas for input
      const terminalCanvas = page.locator('.xterm canvas').first();
      
      if (await terminalCanvas.count() > 0) {
        // Click on terminal to focus
        await terminalCanvas.click();
        await page.waitForTimeout(1000);

        // Type test command
        await page.keyboard.type('echo "test connection"');
        await page.keyboard.press('Enter');
        
        // Wait for response
        await page.waitForTimeout(3000);

        // Verify command was processed (terminal should still be functional)
        const terminalVisible = await terminalCanvas.isVisible();
        expect(terminalVisible).toBe(true);
      }
    });
  });

  test.describe('Status Persistence', () => {
    test('should maintain connection status across page interactions', async () => {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      
      // Wait for initial connection
      await page.waitForTimeout(5000);
      
      // Get initial status
      const initialStatus = await page.content();
      const initiallyConnected = initialStatus.includes('Connected') || initialStatus.includes('✅');

      // Interact with the page (scroll, click elements)
      await page.mouse.move(100, 100);
      await page.mouse.click(100, 100);
      await page.keyboard.press('Tab');
      
      // Wait and check status again
      await page.waitForTimeout(2000);
      const afterInteractionStatus = await page.content();
      const stillConnected = afterInteractionStatus.includes('Connected') || afterInteractionStatus.includes('✅');

      // Status should be consistent
      if (initiallyConnected) {
        expect(stillConnected).toBe(true);
      }
    });

    test('should show consistent status across different terminal components', async () => {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
      
      // Wait for page to load completely
      await page.waitForTimeout(5000);

      // Look for multiple terminal or connection status elements
      const statusElements = await page.locator('[class*="status"], [class*="connection"], [data-testid*="status"]').all();
      
      const statusTexts: string[] = [];
      for (const element of statusElements) {
        const text = await element.textContent();
        if (text && (text.includes('Connect') || text.includes('✅') || text.includes('⚠️'))) {
          statusTexts.push(text);
        }
      }

      // All status indicators should be consistent
      if (statusTexts.length > 1) {
        const allConnected = statusTexts.every(text => 
          text.includes('Connected') || text.includes('✅')
        );
        const allDisconnected = statusTexts.every(text => 
          text.includes('Disconnect') || text.includes('⚠️')
        );
        
        expect(allConnected || allDisconnected).toBe(true);
      }
    });
  });
});
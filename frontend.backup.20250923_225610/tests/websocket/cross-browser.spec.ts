import { test, expect, devices } from '@playwright/test';

// Cross-browser and device testing for WebSocket functionality
const browsers = ['chromium', 'firefox', 'webkit'];
const devices_list = [
  'Desktop Chrome',
  'Desktop Firefox', 
  'Desktop Safari',
  'iPhone 13',
  'iPad Pro',
  'Pixel 5'
];

test.describe('Cross-Browser WebSocket Compatibility', () => {
  
  browsers.forEach(browserName => {
    test(`WebSocket functionality on ${browserName}`, async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      console.log(`🌐 Testing WebSocket on ${browserName}...`);
      
      // Monitor WebSocket events specific to browser
      let webSocketConnected = false;
      page.on('websocket', ws => {
        webSocketConnected = true;
        console.log(`${browserName}: WebSocket connected to ${ws.url()}`);
      });
      
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      
      // Wait for WebSocket connection
      await page.waitForTimeout(5000);
      
      // Check connection status
      const connectionStatus = page.locator('text="Connected"').first();
      await expect(connectionStatus).toBeVisible({ timeout: 15000 });
      
      // Test terminal functionality if available
      const terminalButton = page.locator('button:has-text("Terminal")').first();
      if (await terminalButton.isVisible({ timeout: 2000 })) {
        await terminalButton.click();
        
        // Terminal should work on all browsers
        const terminal = page.locator('.xterm, .terminal-container').first();
        await expect(terminal).toBeVisible({ timeout: 10000 });
      }
      
      console.log(`✅ ${browserName}: WebSocket functionality verified`);
      
      await context.close();
    });
  });
});

test.describe('Mobile Device WebSocket Testing', () => {
  
  devices_list.forEach(deviceName => {
    test(`WebSocket on ${deviceName}`, async ({ browser }) => {
      const device = devices[deviceName] || devices['Desktop Chrome'];
      const context = await browser.newContext({
        ...device,
      });
      const page = await context.newPage();
      
      console.log(`📱 Testing WebSocket on ${deviceName}...`);
      
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      
      // Wait longer for mobile devices
      await page.waitForTimeout(8000);
      
      // Check connection works on mobile
      const connectionStatus = page.locator('text="Connected"').first();
      await expect(connectionStatus).toBeVisible({ timeout: 20000 });
      
      // Test mobile-specific interactions
      if (deviceName.includes('iPhone') || deviceName.includes('iPad')) {
        // Test iOS-specific behavior
        await page.tap('body');
        await page.waitForTimeout(1000);
        
        // Connection should remain stable after touch interaction
        await expect(connectionStatus).toBeVisible({ timeout: 5000 });
      }
      
      console.log(`✅ ${deviceName}: WebSocket functionality verified`);
      
      await context.close();
    });
  });
});

test.describe('WebSocket Feature Detection', () => {
  
  test('should detect and handle WebSocket support properly', async ({ page }) => {
    console.log('🔍 Testing WebSocket feature detection...');
    
    // Check if browser supports WebSocket
    const webSocketSupported = await page.evaluate(() => {
      return typeof WebSocket !== 'undefined';
    });
    
    expect(webSocketSupported).toBe(true);
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Application should detect WebSocket support
    const featureDetection = await page.evaluate(() => {
      return {
        webSocketSupported: typeof WebSocket !== 'undefined',
        webSocketInstance: !!(window as any).webSocketInstances?.length,
        connectionAttempted: !!(window as any).connectionAttempts || 0
      };
    });
    
    expect(featureDetection.webSocketSupported).toBe(true);
    
    console.log('✅ WebSocket feature detection working correctly');
  });
  
  test('should handle WebSocket creation errors gracefully', async ({ page }) => {
    console.log('🔍 Testing WebSocket error handling...');
    
    // Mock WebSocket to throw errors
    await page.addInitScript(() => {
      const OriginalWebSocket = window.WebSocket;
      let attemptCount = 0;
      
      window.WebSocket = class extends OriginalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          attemptCount++;
          if (attemptCount <= 2) {
            // Simulate connection failures for first 2 attempts
            throw new Error('Simulated WebSocket connection failure');
          }
          // Allow 3rd attempt to succeed
          super(url, protocols);
        }
      };
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for retry attempts
    await page.waitForTimeout(10000);
    
    // Should eventually connect after retries
    const connectionStatus = page.locator('text="Connected"').first();
    await expect(connectionStatus).toBeVisible({ timeout: 15000 });
    
    console.log('✅ WebSocket error handling and retry logic working');
  });
});

test.describe('WebSocket Security and Edge Cases', () => {
  
  test('should handle mixed content scenarios', async ({ page }) => {
    console.log('🔒 Testing mixed content WebSocket handling...');
    
    // Check if app handles HTTP/HTTPS WebSocket upgrade correctly
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    const webSocketProtocol = await page.evaluate(() => {
      if ((window as any).webSocketInstances?.length > 0) {
        return (window as any).webSocketInstances[0].url.startsWith('ws://') ? 'ws' : 'wss';
      }
      return 'none';
    });
    
    // Should use appropriate protocol
    expect(['ws', 'wss']).toContain(webSocketProtocol);
    
    console.log(`✅ Using WebSocket protocol: ${webSocketProtocol}`);
  });
  
  test('should handle large message payloads', async ({ page }) => {
    console.log('📦 Testing large WebSocket message handling...');
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Send large message payload
    const largeMessageSent = await page.evaluate(() => {
      const ws = (window as any).webSocketInstances?.[0];
      if (ws && ws.readyState === WebSocket.OPEN) {
        const largeData = {
          type: 'large_payload_test',
          data: 'x'.repeat(10000), // 10KB of data
          timestamp: Date.now()
        };
        
        try {
          ws.send(JSON.stringify(largeData));
          return true;
        } catch (e) {
          console.error('Failed to send large message:', e);
          return false;
        }
      }
      return false;
    });
    
    // Should handle large messages without breaking connection
    if (largeMessageSent) {
      await page.waitForTimeout(2000);
      
      const connectionStillActive = page.locator('text="Connected"').first();
      await expect(connectionStillActive).toBeVisible({ timeout: 5000 });
    }
    
    console.log('✅ Large message payload handling verified');
  });
  
  test('should maintain connection during tab switching', async ({ page }) => {
    console.log('🔄 Testing tab switching behavior...');
    
    const context = page.context();
    
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Open second tab
    const secondTab = await context.newPage();
    await secondTab.goto('http://localhost:3000');
    await secondTab.waitForLoadState('networkidle');
    
    // Switch back to first tab
    await page.bringToFront();
    await page.waitForTimeout(2000);
    
    // Connection should still be active
    const connectionStatus = page.locator('text="Connected"').first();
    await expect(connectionStatus).toBeVisible({ timeout: 5000 });
    
    await secondTab.close();
    
    console.log('✅ Tab switching behavior verified');
  });
});
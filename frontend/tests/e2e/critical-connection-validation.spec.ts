import { test, expect } from '@playwright/test';

/**
 * CRITICAL WebSocket Connection Validation
 * 
 * This test validates the most important requirement:
 * ConnectionStatus MUST show "Connected" not "Disconnected"
 */

test.describe('Critical WebSocket Connection Validation', () => {
  test('CRITICAL: ConnectionStatus shows "Connected" - WebSocket is working', async ({ page }) => {
    console.log('🎯 CRITICAL VALIDATION: Testing WebSocket connection status');
    
    // Navigate to application
    await page.goto('/');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connection to establish (max 30 seconds)
    console.log('⏳ Waiting for WebSocket connection to establish...');
    
    // Wait for either connection status element or global "Connected" text
    const connectionEstablished = await Promise.race([
      // Look for specific connection status elements
      page.waitForSelector('[data-testid="connection-status"]:has-text("Connected")', { timeout: 30000 }).then(() => true),
      page.waitForSelector('.connection-status:has-text("Connected")', { timeout: 30000 }).then(() => true),
      page.waitForSelector('*:has-text("Live Activity Connection Status"):has-text("Connected")', { timeout: 30000 }).then(() => true),
      
      // Look for any "Connected" text (but not "Disconnected")
      page.waitForFunction(() => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('Connected') && !bodyText.includes('Disconnected');
      }, {}, { timeout: 30000 }).then(() => true),
      
      // Timeout fallback
      new Promise(resolve => setTimeout(() => resolve(false), 30000))
    ]).catch(() => false);
    
    if (!connectionEstablished) {
      // Take debug screenshot
      await page.screenshot({ path: 'tests/screenshots/critical-connection-failed.png', fullPage: true });
      
      // Get page content for debugging
      const bodyText = await page.textContent('body') || '';
      console.log('🔍 Page content sample:', bodyText.substring(0, 1000));
      
      // Check for any connection-related text
      const hasConnectionText = bodyText.includes('Connection') || 
                               bodyText.includes('WebSocket') || 
                               bodyText.includes('Socket');
      
      console.log('🔍 Has connection-related text:', hasConnectionText);
      
      // Check WebSocket activity in browser
      const wsActivity = await page.evaluate(() => {
        return {
          webSocketInstances: (window as any).webSocketInstances ? 
            (window as any).webSocketInstances.length : 'Not found',
          socketIO: (window as any).socket ? {
            connected: (window as any).socket.connected,
            id: (window as any).socket.id
          } : 'Not found'
        };
      });
      
      console.log('🔍 WebSocket activity:', JSON.stringify(wsActivity, null, 2));
    }
    
    // CRITICAL ASSERTION: Must have established connection
    expect(connectionEstablished).toBe(true);
    console.log('✅ CRITICAL TEST PASSED: WebSocket connection established');
    
    // CRITICAL ASSERTION: Must NOT show "Disconnected" anywhere
    const disconnectedText = page.locator('text="Disconnected"');
    const disconnectedCount = await disconnectedText.count();
    expect(disconnectedCount).toBe(0);
    console.log('✅ CRITICAL TEST PASSED: No "Disconnected" status found');
    
    // Additional validation: Look for positive connection indicators
    const positiveIndicators = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      return {
        hasConnected: bodyText.includes('Connected'),
        hasOnline: bodyText.includes('Online'),
        hasReady: bodyText.includes('Ready'),
        hasActive: bodyText.includes('Active')
      };
    });
    
    console.log('✅ Positive connection indicators:', JSON.stringify(positiveIndicators, null, 2));
    
    // At least one positive indicator should be present
    const hasPositiveIndicator = Object.values(positiveIndicators).some(Boolean);
    expect(hasPositiveIndicator).toBe(true);
    
    console.log('🎉 CRITICAL VALIDATION COMPLETE: WebSocket connection is working correctly!');
  });

  test('WebSocket messages are being sent/received', async ({ page }) => {
    console.log('📡 Testing WebSocket message activity');
    
    // Track WebSocket messages
    const messages: string[] = [];
    page.on('websocket', ws => {
      ws.on('framesent', event => {
        if (!event.payload.includes('ping') && !event.payload.includes('probe')) {
          messages.push(`SENT: ${event.payload}`);
        }
      });
      ws.on('framereceived', event => {
        if (!event.payload.includes('pong') && !event.payload.includes('probe')) {
          messages.push(`RECEIVED: ${event.payload}`);
        }
      });
    });
    
    // Navigate and wait
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for some WebSocket activity
    await page.waitForTimeout(10000);
    
    // Should have WebSocket activity
    expect(messages.length).toBeGreaterThan(0);
    console.log(`✅ Captured ${messages.length} WebSocket messages`);
    console.log('📨 Message samples:', messages.slice(0, 5));
  });

  test('Connection is stable over time', async ({ page }) => {
    console.log('⏱️ Testing connection stability over 30 seconds');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check connection every 5 seconds for 30 seconds
    const checks = 6;
    const interval = 5000;
    let stableConnections = 0;
    
    for (let i = 0; i < checks; i++) {
      await page.waitForTimeout(interval);
      
      const isConnected = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        const hasConnected = bodyText.includes('Connected') && !bodyText.includes('Disconnected');
        
        // Also check WebSocket instances
        let hasActiveWS = false;
        if ((window as any).webSocketInstances) {
          const activeConnections = (window as any).webSocketInstances.filter(
            (ws: WebSocket) => ws.readyState === WebSocket.OPEN
          );
          hasActiveWS = activeConnections.length > 0;
        }
        
        // Check Socket.IO
        let hasActiveSocketIO = false;
        if ((window as any).socket) {
          hasActiveSocketIO = (window as any).socket.connected;
        }
        
        return hasConnected || hasActiveWS || hasActiveSocketIO;
      });
      
      if (isConnected) {
        stableConnections++;
      }
      
      console.log(`🔍 Connection check ${i + 1}/${checks}: ${isConnected ? '✅' : '❌'}`);
    }
    
    // Should be stable most of the time (allow 1 temporary disconnect)
    expect(stableConnections).toBeGreaterThanOrEqual(checks - 1);
    console.log(`✅ Connection was stable ${stableConnections}/${checks} times`);
  });
});
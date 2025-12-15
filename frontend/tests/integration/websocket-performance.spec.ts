import { test, expect, Page } from '@playwright/test';

test.describe('WebSocket Performance Integration Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Monitor performance metrics
    await page.addInitScript(() => {
      (window as any).performanceMetrics = {
        connectionTimes: [],
        messageLatencies: [],
        reconnectionAttempts: 0,
        totalMessages: 0
      };

      // Track WebSocket connection timing
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          const startTime = performance.now();
          
          this.addEventListener('open', () => {
            const connectionTime = performance.now() - startTime;
            (window as any).performanceMetrics.connectionTimes.push(connectionTime);
            console.log(`WebSocket connected in ${connectionTime}ms`);
          });

          this.addEventListener('message', (event) => {
            const receivedTime = performance.now();
            (window as any).performanceMetrics.totalMessages++;
            
            // Try to extract timestamp from message for latency calculation
            try {
              const data = JSON.parse(event.data);
              if (data.timestamp) {
                const latency = receivedTime - data.timestamp;
                (window as any).performanceMetrics.messageLatencies.push(latency);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          });

          this.addEventListener('close', (event) => {
            if (event.code !== 1000) { // Not a normal closure
              (window as any).performanceMetrics.reconnectionAttempts++;
            }
          });
        }
      };
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should establish WebSocket connection within acceptable time limits', async () => {
    console.log('🔍 Testing WebSocket Connection Performance...');
    
    // Wait for connection to establish
    await page.waitForTimeout(5000);
    
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    expect(metrics.connectionTimes.length).toBeGreaterThan(0);
    
    // Connection should establish within 3 seconds
    const maxConnectionTime = Math.max(...metrics.connectionTimes);
    expect(maxConnectionTime).toBeLessThan(3000);
    
    console.log(`✅ WebSocket connection established in ${maxConnectionTime}ms`);
  });

  test('should handle high-frequency message exchange efficiently', async () => {
    console.log('🔍 Testing High-Frequency Message Performance...');
    
    // Wait for connection
    await page.waitForTimeout(3000);
    
    // Simulate high-frequency interactions
    await page.evaluate(() => {
      const ws = (window as any).webSocketInstances?.[0];
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send 50 messages rapidly
        for (let i = 0; i < 50; i++) {
          ws.send(JSON.stringify({
            type: 'performance_test',
            sequence: i,
            timestamp: performance.now()
          }));
        }
      }
    });

    // Wait for messages to be processed
    await page.waitForTimeout(5000);
    
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    // Should have processed messages efficiently
    expect(metrics.totalMessages).toBeGreaterThan(10);
    
    if (metrics.messageLatencies.length > 0) {
      const avgLatency = metrics.messageLatencies.reduce((a, b) => a + b, 0) / metrics.messageLatencies.length;
      expect(avgLatency).toBeLessThan(100); // Under 100ms average latency
      console.log(`✅ Average message latency: ${avgLatency}ms`);
    }
  });

  test('should recover quickly from connection interruptions', async () => {
    console.log('🔍 Testing Connection Recovery Performance...');
    
    // Wait for initial connection
    await page.waitForTimeout(3000);
    
    const initialMetrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    // Simulate connection drop
    await page.evaluate(() => {
      if ((window as any).webSocketInstances) {
        (window as any).webSocketInstances.forEach((ws: WebSocket) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(4000, 'Simulated network failure');
          }
        });
      }
    });

    const disconnectTime = Date.now();
    
    // Wait for reconnection
    await page.waitForTimeout(10000);
    
    const finalMetrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    // Should have attempted reconnection
    expect(finalMetrics.reconnectionAttempts).toBeGreaterThan(initialMetrics.reconnectionAttempts);
    
    // Should have new connection times (indicating successful reconnection)
    expect(finalMetrics.connectionTimes.length).toBeGreaterThan(initialMetrics.connectionTimes.length);
    
    const reconnectionTime = finalMetrics.connectionTimes[finalMetrics.connectionTimes.length - 1];
    expect(reconnectionTime).toBeLessThan(5000); // Should reconnect within 5 seconds
    
    console.log(`✅ Reconnection completed in ${reconnectionTime}ms`);
  });

  test('should maintain performance under concurrent tab scenarios', async () => {
    console.log('🔍 Testing Multi-Tab Performance...');
    
    const context = page.context();
    const additionalPages = await Promise.all([
      context.newPage(),
      context.newPage()
    ]);

    // Open same application in multiple tabs
    await Promise.all(additionalPages.map(p => p.goto('http://localhost:3000')));
    await Promise.all(additionalPages.map(p => p.waitForLoadState('networkidle')));
    
    // Wait for all connections to establish
    await page.waitForTimeout(5000);
    
    // Check performance metrics on original page
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    // Performance should not degrade significantly with multiple tabs
    if (metrics.connectionTimes.length > 0) {
      const avgConnectionTime = metrics.connectionTimes.reduce((a, b) => a + b, 0) / metrics.connectionTimes.length;
      expect(avgConnectionTime).toBeLessThan(4000); // Allow slightly more time for multi-tab scenario
    }
    
    // Clean up additional pages
    await Promise.all(additionalPages.map(p => p.close()));
    
    console.log('✅ Multi-tab performance validation passed');
  });

  test('should handle browser focus/blur events without connection issues', async () => {
    console.log('🔍 Testing Focus/Blur Performance...');
    
    // Wait for initial connection
    await page.waitForTimeout(3000);
    
    // Simulate focus/blur cycles
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForTimeout(500);
    }
    
    // Check that connection remains stable
    const connectionStatus = await page.evaluate(() => {
      const statusElements = document.querySelectorAll('[data-testid="connection-status"], .connection-status');
      for (const element of statusElements) {
        if (element.textContent?.includes('Connected')) {
          return 'connected';
        } else if (element.textContent?.includes('Disconnected')) {
          return 'disconnected';
        }
      }
      return 'unknown';
    });
    
    expect(connectionStatus).toBe('connected');
    
    const metrics = await page.evaluate(() => (window as any).performanceMetrics);
    
    // Should not have excessive reconnection attempts due to focus changes
    expect(metrics.reconnectionAttempts).toBeLessThan(3);
    
    console.log('✅ Focus/Blur performance validation passed');
  });
});
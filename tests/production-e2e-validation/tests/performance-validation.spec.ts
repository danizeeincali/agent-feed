import { test, expect } from '@playwright/test';

test.describe('Performance Validation', () => {
  test('WebSocket connection performance metrics', async ({ page }) => {
    console.log('🚀 Starting WebSocket performance validation...');
    
    const performanceMetrics = {
      connectionTime: 0,
      firstMessageTime: 0,
      responseTime: 0,
      totalTime: 0
    };

    // Navigate to application
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Monitor WebSocket connections
    let connectionEstablished = false;
    let firstMessageReceived = false;
    
    page.on('websocket', (ws) => {
      if (!connectionEstablished) {
        performanceMetrics.connectionTime = Date.now() - startTime;
        connectionEstablished = true;
        console.log(`📡 WebSocket connected in ${performanceMetrics.connectionTime}ms`);
      }

      ws.on('framereceived', (data) => {
        if (!firstMessageReceived) {
          performanceMetrics.firstMessageTime = Date.now() - startTime;
          firstMessageReceived = true;
          console.log(`📥 First message received in ${performanceMetrics.firstMessageTime}ms`);
        }
      });
    });

    // Create instance and measure time
    const instanceCreationStart = Date.now();
    const productionButton = page.getByRole('button', { name: /production instance/i });
    await productionButton.click();
    
    // Wait for instance to be ready
    await page.waitForTimeout(3000);
    
    // Send test command and measure response time
    const commandStart = Date.now();
    const commandInput = page.locator('input[type="text"], textarea').first();
    await expect(commandInput).toBeVisible({ timeout: 10000 });
    
    await commandInput.fill('pwd');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(5000);
    performanceMetrics.responseTime = Date.now() - commandStart;
    performanceMetrics.totalTime = Date.now() - startTime;

    console.log('📊 Performance Metrics:');
    console.log(`  Connection Time: ${performanceMetrics.connectionTime}ms`);
    console.log(`  First Message Time: ${performanceMetrics.firstMessageTime}ms`);
    console.log(`  Response Time: ${performanceMetrics.responseTime}ms`);
    console.log(`  Total Time: ${performanceMetrics.totalTime}ms`);

    // Performance assertions
    expect(performanceMetrics.connectionTime).toBeLessThan(5000); // 5 seconds
    expect(performanceMetrics.responseTime).toBeLessThan(15000); // 15 seconds
    expect(performanceMetrics.totalTime).toBeLessThan(30000); // 30 seconds

    // Save metrics to file
    const metricsReport = {
      timestamp: new Date().toISOString(),
      metrics: performanceMetrics,
      thresholds: {
        connectionTime: '< 5000ms',
        responseTime: '< 15000ms',
        totalTime: '< 30000ms'
      },
      status: 'PASSED'
    };

    await page.evaluate((report) => {
      // Store metrics in browser for later retrieval
      window.performanceReport = report;
    }, metricsReport);
  });

  test('Memory usage monitoring', async ({ page }) => {
    console.log('🧠 Starting memory usage monitoring...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    console.log('📏 Initial Memory:', initialMemory);

    // Create multiple instances to test memory usage
    const instances = [];
    for (let i = 0; i < 3; i++) {
      const button = page.getByRole('button', { name: /production instance/i });
      await button.click();
      await page.waitForTimeout(2000);
      instances.push(i);
    }

    // Send multiple commands
    for (let i = 0; i < 5; i++) {
      const input = page.locator('input[type="text"], textarea').first();
      await input.fill(`Test command ${i + 1}`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }

    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    console.log('📏 Final Memory:', finalMemory);

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
      
      console.log(`📈 Memory increase: ${memoryIncrease} bytes (${memoryIncreasePercent.toFixed(2)}%)`);
      
      // Assert memory usage is reasonable
      expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase
    }
  });

  test('Network traffic analysis', async ({ page }) => {
    console.log('🌐 Starting network traffic analysis...');

    const networkEvents: any[] = [];

    // Monitor network traffic
    page.on('request', (request) => {
      networkEvents.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    page.on('response', (response) => {
      networkEvents.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        timestamp: Date.now()
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create instance and interact
    const button = page.getByRole('button', { name: /production instance/i });
    await button.click();
    await page.waitForTimeout(3000);

    const input = page.locator('input[type="text"], textarea').first();
    await input.fill('Hello');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    console.log(`📊 Total network events: ${networkEvents.length}`);
    
    // Filter WebSocket upgrade requests
    const wsRequests = networkEvents.filter(event => 
      event.url && (event.url.includes('ws://') || event.url.includes('wss://'))
    );
    
    console.log(`🔌 WebSocket related events: ${wsRequests.length}`);
    
    // Ensure reasonable number of network calls
    expect(networkEvents.length).toBeLessThan(100); // Reasonable limit
    expect(wsRequests.length).toBeGreaterThan(0); // At least some WebSocket activity
  });
});
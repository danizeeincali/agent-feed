import { test, expect } from '@playwright/test';
import ClaudeCodeTestHelpers from '../utils/test-helpers';

/**
 * Performance Benchmarks and Monitoring
 * 
 * Tests:
 * - Page load performance
 * - Memory usage monitoring
 * - Network request optimization
 * - Real-time interaction latency
 * - WebSocket performance
 * - Concurrent user simulation
 */

test.describe('Performance Benchmarks and Monitoring', () => {
  let helpers: ClaudeCodeTestHelpers;
  let createdInstances: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new ClaudeCodeTestHelpers(page);
  });

  test.afterEach(async () => {
    for (const instanceId of createdInstances) {
      try {
        await helpers.cleanupInstances();
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    createdInstances = [];
  });

  test('should meet page load performance benchmarks', async ({ page }) => {
    test.setTimeout(120000);
    
    const performanceMetrics: any[] = [];
    
    // Monitor performance metrics
    page.on('metrics', metrics => {
      performanceMetrics.push(metrics);
    });
    
    const startTime = performance.now();
    await helpers.navigateToClaudeInstances();
    const loadTime = performance.now() - startTime;
    
    // Performance assertions
    expect(loadTime).toBeLessThan(5000); // Page should load within 5 seconds
    
    // Measure detailed performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalLoadTime: navigation.loadEventEnd - navigation.navigationStart
      };
    });
    
    console.log('Performance Metrics:', metrics);
    
    // Performance benchmarks
    expect(metrics.domContentLoaded).toBeLessThan(2000); // DOM ready within 2 seconds
    expect(metrics.firstContentfulPaint).toBeLessThan(3000); // FCP within 3 seconds
    expect(metrics.totalLoadTime).toBeLessThan(8000); // Total load within 8 seconds
  });

  test('should monitor memory usage during instance operations', async ({ page }) => {
    test.setTimeout(180000);
    
    // Start memory monitoring
    const memoryMetrics: any[] = [];
    
    const collectMemoryMetrics = async () => {
      const metrics = await page.evaluate(() => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          return {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            timestamp: Date.now()
          };
        }
        return null;
      });
      
      if (metrics) {
        memoryMetrics.push(metrics);
      }
    };
    
    // Initial memory reading
    await helpers.navigateToClaudeInstances();
    await collectMemoryMetrics();
    
    // Create multiple instances and monitor memory
    for (let i = 0; i < 3; i++) {
      const instanceId = await helpers.createInstance('claude-interactive');
      createdInstances.push(instanceId);
      
      await collectMemoryMetrics();
      
      // Interact with instance
      const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
      await instanceCard.click();
      await helpers.waitForElement('[data-testid="chat-input"]');
      
      await helpers.sendMessageToInstance(instanceId, `Memory test message ${i + 1}`);
      await collectMemoryMetrics();
      
      // Return to instances list
      await helpers.navigateToClaudeInstances();
    }
    
    // Analyze memory usage
    if (memoryMetrics.length > 0) {
      const initialMemory = memoryMetrics[0].usedJSHeapSize;
      const finalMemory = memoryMetrics[memoryMetrics.length - 1].usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercentage = (memoryIncrease / initialMemory) * 100;
      
      console.log('Memory Analysis:', {
        initialMemory: `${(initialMemory / 1024 / 1024).toFixed(2)} MB`,
        finalMemory: `${(finalMemory / 1024 / 1024).toFixed(2)} MB`,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
        memoryIncreasePercentage: `${memoryIncreasePercentage.toFixed(2)}%`
      });
      
      // Memory usage should not increase dramatically
      expect(memoryIncreasePercentage).toBeLessThan(200); // Less than 200% increase
      expect(finalMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
    }
  });

  test('should optimize network request patterns', async ({ page }) => {
    test.setTimeout(120000);
    
    const networkRequests: any[] = [];
    
    // Monitor network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        resourceType: request.resourceType()
      });
    });
    
    page.on('response', response => {
      const matchingRequest = networkRequests.find(req => 
        req.url === response.url() && !req.responseReceived
      );
      if (matchingRequest) {
        matchingRequest.responseReceived = Date.now();
        matchingRequest.status = response.status();
        matchingRequest.responseTime = matchingRequest.responseReceived - matchingRequest.timestamp;
      }
    });
    
    await helpers.navigateToClaudeInstances();
    await page.waitForTimeout(3000); // Allow all requests to complete
    
    // Analyze network patterns
    const apiRequests = networkRequests.filter(req => 
      req.url.includes('/api/') && req.responseReceived
    );
    
    const duplicateRequests = {};
    apiRequests.forEach(req => {
      const key = `${req.method}:${req.url}`;
      duplicateRequests[key] = (duplicateRequests[key] || 0) + 1;
    });
    
    // Check for excessive duplicate requests
    const excessiveDuplicates = Object.entries(duplicateRequests)
      .filter(([key, count]) => count > 10)
      .map(([key, count]) => ({ endpoint: key, count }));
    
    console.log('Network Request Analysis:', {
      totalRequests: networkRequests.length,
      apiRequests: apiRequests.length,
      averageResponseTime: apiRequests.length > 0 ? 
        apiRequests.reduce((sum, req) => sum + (req.responseTime || 0), 0) / apiRequests.length : 0,
      excessiveDuplicates
    });
    
    // Performance assertions
    expect(excessiveDuplicates.length).toBe(0); // No endpoint should be called excessively
    
    if (apiRequests.length > 0) {
      const averageResponseTime = apiRequests.reduce((sum, req) => sum + (req.responseTime || 0), 0) / apiRequests.length;
      expect(averageResponseTime).toBeLessThan(2000); // Average API response time under 2 seconds
    }
    
    // Check for failed requests
    const failedRequests = apiRequests.filter(req => req.status >= 400);
    expect(failedRequests.length).toBe(0); // No failed API requests
  });

  test('should measure real-time interaction latency', async ({ page }) => {
    test.setTimeout(180000);
    
    await helpers.navigateToClaudeInstances();
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Measure interaction latency
    const latencyMeasurements: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      const startTime = performance.now();
      
      // Send message and wait for response
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill(`Latency test message ${i + 1}`);
      await chatInput.press('Enter');
      
      // Wait for AI response to appear
      const initialMessageCount = await page.$$eval('[data-testid="chat-message"]', 
        elements => elements.length
      );
      
      await page.waitForFunction(
        (expectedCount) => {
          const messages = document.querySelectorAll('[data-testid="chat-message"]');
          return messages.length > expectedCount;
        },
        initialMessageCount,
        { timeout: 30000 }
      );
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencyMeasurements.push(latency);
      
      console.log(`Message ${i + 1} latency: ${latency.toFixed(2)}ms`);
      
      // Small delay between tests
      await page.waitForTimeout(1000);
    }
    
    // Analyze latency
    const averageLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
    const maxLatency = Math.max(...latencyMeasurements);
    const minLatency = Math.min(...latencyMeasurements);
    
    console.log('Latency Analysis:', {
      averageLatency: `${averageLatency.toFixed(2)}ms`,
      maxLatency: `${maxLatency.toFixed(2)}ms`,
      minLatency: `${minLatency.toFixed(2)}ms`
    });
    
    // Performance assertions
    expect(averageLatency).toBeLessThan(10000); // Average response within 10 seconds
    expect(maxLatency).toBeLessThan(15000); // No response should take more than 15 seconds
    
    // Check for consistent performance (no huge spikes)
    const latencyVariation = maxLatency - minLatency;
    expect(latencyVariation).toBeLessThan(20000); // Variation should be reasonable
  });

  test('should handle WebSocket performance under load', async ({ page }) => {
    test.setTimeout(200000);
    
    const websocketMetrics: any[] = [];
    
    // Monitor WebSocket activity
    page.on('websocket', ws => {
      const wsData = {
        url: ws.url(),
        createdAt: Date.now(),
        messagesReceived: 0,
        messagesSent: 0,
        errors: 0
      };
      
      ws.on('framesent', () => wsData.messagesSent++);
      ws.on('framereceived', () => wsData.messagesReceived++);
      ws.on('socketerror', () => wsData.errors++);
      
      websocketMetrics.push(wsData);
    });
    
    await helpers.navigateToClaudeInstances();
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Wait for WebSocket connection
    await helpers.waitForWebSocketConnection();
    
    // Send rapid messages to test WebSocket performance
    const messageCount = 10;
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    const startTime = Date.now();
    
    for (let i = 0; i < messageCount; i++) {
      await chatInput.fill(`WebSocket load test ${i + 1}`);
      await chatInput.press('Enter');
      await page.waitForTimeout(100); // Small delay
    }
    
    // Wait for all responses
    await page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length >= expectedCount * 2;
      },
      messageCount,
      { timeout: 120000 }
    );
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log('WebSocket Performance:', {
      totalTime: `${totalTime}ms`,
      messagesPerSecond: (messageCount * 2 * 1000 / totalTime).toFixed(2),
      websocketConnections: websocketMetrics.length
    });
    
    // Performance assertions
    expect(totalTime).toBeLessThan(60000); // All messages processed within 60 seconds
    expect(websocketMetrics.length).toBeGreaterThan(0); // WebSocket connections established
    
    if (websocketMetrics.length > 0) {
      const wsData = websocketMetrics[0];
      expect(wsData.errors).toBe(0); // No WebSocket errors
      expect(wsData.messagesReceived).toBeGreaterThan(0); // Messages received
    }
  });

  test('should simulate concurrent user performance', async ({ page, browser }) => {
    test.setTimeout(300000); // 5 minutes for concurrent testing
    
    // Create multiple browser contexts to simulate concurrent users
    const contexts: any[] = [];
    const performanceData: any[] = [];
    
    try {
      const userCount = 3;
      
      // Create contexts for concurrent users
      for (let i = 0; i < userCount; i++) {
        const context = await browser.newContext();
        const userPage = await context.newPage();
        contexts.push({ context, page: userPage, userId: i + 1 });
      }
      
      // Simulate concurrent user actions
      const userPromises = contexts.map(async ({ page: userPage, userId }) => {
        const userHelpers = new ClaudeCodeTestHelpers(userPage);
        const userStartTime = Date.now();
        
        try {
          // Navigate to Claude instances
          await userHelpers.navigateToClaudeInstances();
          
          // Create instance
          const instanceId = await userHelpers.createInstance('claude-interactive');
          
          // Navigate to chat
          const instanceCard = userPage.locator(`[data-instance-id="${instanceId}"]`);
          await instanceCard.click();
          await userHelpers.waitForElement('[data-testid="chat-input"]');
          
          // Send messages
          for (let i = 0; i < 3; i++) {
            await userHelpers.sendMessageToInstance(instanceId, `User ${userId} message ${i + 1}`);
            await userPage.waitForTimeout(2000);
          }
          
          const userEndTime = Date.now();
          return {
            userId,
            totalTime: userEndTime - userStartTime,
            success: true
          };
          
        } catch (error) {
          const userEndTime = Date.now();
          return {
            userId,
            totalTime: userEndTime - userStartTime,
            success: false,
            error: error.message
          };
        }
      });
      
      // Wait for all users to complete
      const results = await Promise.all(userPromises);
      performanceData.push(...results);
      
      console.log('Concurrent User Performance:', results);
      
      // Performance assertions
      const successfulUsers = results.filter(r => r.success);
      const failedUsers = results.filter(r => !r.success);
      
      expect(successfulUsers.length).toBeGreaterThanOrEqual(userCount - 1); // At least N-1 users succeed
      expect(failedUsers.length).toBeLessThanOrEqual(1); // At most 1 user fails
      
      if (successfulUsers.length > 0) {
        const averageTime = successfulUsers.reduce((sum, r) => sum + r.totalTime, 0) / successfulUsers.length;
        expect(averageTime).toBeLessThan(120000); // Average completion within 2 minutes
      }
      
    } finally {
      // Cleanup contexts
      for (const { context } of contexts) {
        await context.close();
      }
    }
  });

  test('should monitor resource usage during extended operation', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes
    
    const resourceMetrics: any[] = [];
    
    const collectResourceMetrics = async () => {
      const metrics = await page.evaluate(() => {
        return {
          timestamp: Date.now(),
          documentCount: document.querySelectorAll('*').length,
          imageCount: document.querySelectorAll('img').length,
          scriptCount: document.querySelectorAll('script').length,
          eventListenerCount: getEventListeners ? Object.keys(getEventListeners(document)).length : 0
        };
      });
      resourceMetrics.push(metrics);
    };
    
    await helpers.navigateToClaudeInstances();
    await collectResourceMetrics();
    
    // Create instance and perform extended operations
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Extended conversation simulation
    for (let i = 0; i < 15; i++) {
      await helpers.sendMessageToInstance(instanceId, `Extended operation message ${i + 1} - testing resource usage over time`);
      await collectResourceMetrics();
      await page.waitForTimeout(3000);
    }
    
    // Analyze resource usage trends
    if (resourceMetrics.length > 2) {
      const initialMetrics = resourceMetrics[0];
      const finalMetrics = resourceMetrics[resourceMetrics.length - 1];
      
      const documentGrowth = finalMetrics.documentCount - initialMetrics.documentCount;
      const resourceGrowthRate = documentGrowth / resourceMetrics.length;
      
      console.log('Resource Usage Analysis:', {
        initialDocumentCount: initialMetrics.documentCount,
        finalDocumentCount: finalMetrics.documentCount,
        documentGrowth,
        resourceGrowthRate: resourceGrowthRate.toFixed(2)
      });
      
      // Resource usage should be reasonable
      expect(resourceGrowthRate).toBeLessThan(50); // Less than 50 DOM elements per operation
      expect(finalMetrics.documentCount).toBeLessThan(5000); // Total DOM size reasonable
    }
  });
});
/**
 * PRODUCTION LOAD TESTING SUITE
 * 
 * Tests system under realistic load conditions with multiple concurrent users
 * and validates performance under stress scenarios.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const LOAD_TEST_TIMEOUT = 60000; // 60 seconds

test.describe('Production Load Testing Suite', () => {
  
  test.describe('Concurrent User Load Testing', () => {
    test('should handle 10 concurrent users creating instances', async ({ browser }) => {
      console.log('🚀 Load Testing: 10 concurrent users creating Claude instances');
      
      const contexts: BrowserContext[] = [];
      const pages: Page[] = [];
      const results: any[] = [];
      
      try {
        // Create 10 concurrent browser contexts (simulating users)
        for (let i = 0; i < 10; i++) {
          const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: `LoadTest-User-${i + 1}`,
          });
          contexts.push(context);
          
          const page = await context.newPage();
          pages.push(page);
        }
        
        // Perform concurrent instance creation
        const promises = pages.map(async (page, index) => {
          const startTime = Date.now();
          
          try {
            await page.goto(`${BASE_URL}/claude-instances`);
            await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: LOAD_TEST_TIMEOUT });
            
            // Create instance
            await page.click('[data-testid="create-prod-instance"]');
            
            // Wait for instance to appear
            await page.waitForSelector('text=Claude AI Interactive', { timeout: LOAD_TEST_TIMEOUT });
            
            // Verify no connection errors
            const connectionErrors = await page.locator('text=Connection Error').count();
            
            const endTime = Date.now();
            return {
              userId: index + 1,
              success: connectionErrors === 0,
              responseTime: endTime - startTime,
              error: null
            };
            
          } catch (error) {
            const endTime = Date.now();
            return {
              userId: index + 1,
              success: false,
              responseTime: endTime - startTime,
              error: error.message
            };
          }
        });
        
        const concurrentResults = await Promise.all(promises);
        
        // Analyze results
        const successfulUsers = concurrentResults.filter(r => r.success).length;
        const failedUsers = concurrentResults.filter(r => !r.success).length;
        const averageResponseTime = concurrentResults.reduce((sum, r) => sum + r.responseTime, 0) / concurrentResults.length;
        const maxResponseTime = Math.max(...concurrentResults.map(r => r.responseTime));
        
        console.log('📊 Load Test Results:', {
          totalUsers: 10,
          successfulUsers,
          failedUsers,
          successRate: (successfulUsers / 10) * 100,
          averageResponseTime: `${averageResponseTime.toFixed(0)}ms`,
          maxResponseTime: `${maxResponseTime}ms`
        });
        
        // Validate performance criteria
        expect(successfulUsers).toBeGreaterThanOrEqual(8); // 80% success rate minimum
        expect(averageResponseTime).toBeLessThan(15000); // Average under 15 seconds
        expect(maxResponseTime).toBeLessThan(30000); // Max under 30 seconds
        
      } finally {
        // Clean up all contexts
        await Promise.all(contexts.map(context => context.close()));
      }
    });

    test('should maintain WebSocket stability under concurrent load', async ({ browser }) => {
      console.log('🔌 Load Testing: WebSocket stability with concurrent connections');
      
      const contexts: BrowserContext[] = [];
      const wsMessageCounts: number[] = [];
      
      try {
        // Create 5 concurrent WebSocket connections
        for (let i = 0; i < 5; i++) {
          const context = await browser.newContext();
          contexts.push(context);
          
          const page = await context.newPage();
          
          let messageCount = 0;
          page.on('websocket', ws => {
            ws.on('framereceived', () => {
              messageCount++;
            });
          });
          
          // Navigate and establish connection
          await page.goto(`${BASE_URL}/claude-instances`);
          await page.waitForSelector('[data-testid="instance-item"]', { timeout: LOAD_TEST_TIMEOUT });
          
          // Open terminal to establish WebSocket
          if (await page.locator('[data-testid="instance-item"]').count() > 0) {
            await page.click('[data-testid="instance-item"]');
            await page.waitForSelector('.xterm-screen', { timeout: LOAD_TEST_TIMEOUT });
            
            // Send some data
            await page.type('.xterm-helper-textarea', 'test connection');
            await page.keyboard.press('Enter');
          }
          
          // Wait and collect messages
          await page.waitForTimeout(10000);
          wsMessageCounts.push(messageCount);
        }
        
        // Validate all connections received messages
        const activeConnections = wsMessageCounts.filter(count => count > 0).length;
        const totalMessages = wsMessageCounts.reduce((sum, count) => sum + count, 0);
        
        console.log('🔌 WebSocket Load Results:', {
          activeConnections,
          totalConnections: 5,
          totalMessages,
          averageMessagesPerConnection: totalMessages / 5
        });
        
        expect(activeConnections).toBeGreaterThanOrEqual(3); // At least 60% success rate
        expect(totalMessages).toBeGreaterThan(0);
        
      } finally {
        await Promise.all(contexts.map(context => context.close()));
      }
    });
  });

  test.describe('API Load Testing', () => {
    test('should handle high-frequency API requests', async ({ page }) => {
      console.log('⚡ Load Testing: High-frequency API requests');
      
      const requestResults: any[] = [];
      const concurrentRequests = 20;
      
      // Create concurrent API requests
      const promises = Array.from({ length: concurrentRequests }, async (_, index) => {
        const startTime = Date.now();
        
        try {
          const response = await page.request.get(`${BACKEND_URL}/api/claude/instances`);
          const endTime = Date.now();
          
          return {
            requestId: index + 1,
            success: response.status() === 200,
            responseTime: endTime - startTime,
            statusCode: response.status()
          };
        } catch (error) {
          const endTime = Date.now();
          return {
            requestId: index + 1,
            success: false,
            responseTime: endTime - startTime,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      
      // Analyze API performance
      const successfulRequests = results.filter(r => r.success).length;
      const failedRequests = results.filter(r => !r.success).length;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      
      console.log('⚡ API Load Results:', {
        totalRequests: concurrentRequests,
        successfulRequests,
        failedRequests,
        successRate: (successfulRequests / concurrentRequests) * 100,
        averageResponseTime: `${averageResponseTime.toFixed(0)}ms`,
        maxResponseTime: `${maxResponseTime}ms`
      });
      
      // Performance criteria
      expect(successfulRequests).toBeGreaterThanOrEqual(18); // 90% success rate
      expect(averageResponseTime).toBeLessThan(2000); // Under 2 seconds average
      expect(maxResponseTime).toBeLessThan(5000); // Under 5 seconds max
    });

    test('should handle sustained load over time', async ({ page }) => {
      console.log('⏱️ Load Testing: Sustained load over 60 seconds');
      
      const testDuration = 60000; // 60 seconds
      const requestInterval = 2000; // 2 seconds between requests
      const startTime = Date.now();
      
      const results: any[] = [];
      let requestCount = 0;
      
      while (Date.now() - startTime < testDuration) {
        requestCount++;
        const reqStartTime = Date.now();
        
        try {
          const response = await page.request.get(`${BACKEND_URL}/api/claude/instances`);
          const reqEndTime = Date.now();
          
          results.push({
            requestId: requestCount,
            success: response.status() === 200,
            responseTime: reqEndTime - reqStartTime,
            timestamp: reqEndTime
          });
          
        } catch (error) {
          const reqEndTime = Date.now();
          results.push({
            requestId: requestCount,
            success: false,
            responseTime: reqEndTime - reqStartTime,
            timestamp: reqEndTime,
            error: error.message
          });
        }
        
        // Wait before next request
        await page.waitForTimeout(requestInterval);
      }
      
      // Analyze sustained load results
      const totalRequests = results.length;
      const successfulRequests = results.filter(r => r.success).length;
      const successRate = (successfulRequests / totalRequests) * 100;
      const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      
      console.log('⏱️ Sustained Load Results:', {
        duration: '60 seconds',
        totalRequests,
        successfulRequests,
        successRate: `${successRate.toFixed(1)}%`,
        averageResponseTime: `${averageResponseTime.toFixed(0)}ms`
      });
      
      // Sustained load criteria
      expect(successRate).toBeGreaterThanOrEqual(95); // 95% success rate over time
      expect(averageResponseTime).toBeLessThan(3000); // Under 3 seconds average
    });
  });

  test.describe('Memory and Resource Testing', () => {
    test('should not have memory leaks during extended use', async ({ page }) => {
      console.log('🧠 Testing: Memory leak detection during extended use');
      
      await page.goto(`${BASE_URL}/claude-instances`);
      await page.waitForSelector('[data-testid="claude-instance-manager"]');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        // Create and interact with instances
        await page.click('[data-testid="create-prod-instance"]');
        await page.waitForTimeout(2000);
        
        // Open terminal interactions
        const instances = page.locator('[data-testid="instance-item"]');
        const count = await instances.count();
        if (count > 0) {
          await instances.first().click();
          await page.waitForSelector('.xterm-screen', { timeout: 10000 }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
      
      // Force garbage collection if possible
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      await page.waitForTimeout(5000);
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });
      
      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        console.log('🧠 Memory Usage Analysis:', {
          initialMemory: `${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          finalMemory: `${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
          memoryIncreasePercent: `${memoryIncreasePercent.toFixed(1)}%`
        });
        
        // Memory leak detection - should not increase by more than 50%
        expect(memoryIncreasePercent).toBeLessThan(50);
        
        // Should not exceed heap limit
        expect(finalMemory.usedJSHeapSize).toBeLessThan(finalMemory.jsHeapSizeLimit * 0.8);
      }
    });

    test('should handle rapid navigation without performance degradation', async ({ page }) => {
      console.log('🏃 Testing: Rapid navigation performance');
      
      const navigationTimes: number[] = [];
      const routes = [
        '/claude-instances',
        '/',
        '/agents',
        '/workflows',
        '/analytics',
        '/claude-instances'
      ];
      
      // Perform rapid navigation
      for (let cycle = 0; cycle < 3; cycle++) {
        for (const route of routes) {
          const startTime = Date.now();
          
          await page.goto(`${BASE_URL}${route}`);
          await page.waitForLoadState('domcontentloaded');
          
          const endTime = Date.now();
          navigationTimes.push(endTime - startTime);
          
          await page.waitForTimeout(500); // Brief pause
        }
      }
      
      // Analyze navigation performance
      const averageNavTime = navigationTimes.reduce((sum, time) => sum + time, 0) / navigationTimes.length;
      const maxNavTime = Math.max(...navigationTimes);
      const minNavTime = Math.min(...navigationTimes);
      
      console.log('🏃 Navigation Performance:', {
        totalNavigations: navigationTimes.length,
        averageTime: `${averageNavTime.toFixed(0)}ms`,
        maxTime: `${maxNavTime}ms`,
        minTime: `${minNavTime}ms`
      });
      
      // Performance should remain consistent
      expect(averageNavTime).toBeLessThan(3000); // Under 3 seconds average
      expect(maxNavTime).toBeLessThan(8000); // Under 8 seconds max
      
      // Performance shouldn't degrade significantly over time
      const firstHalf = navigationTimes.slice(0, Math.floor(navigationTimes.length / 2));
      const secondHalf = navigationTimes.slice(Math.floor(navigationTimes.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
      
      const performanceDegradation = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      
      console.log('📈 Performance Degradation:', `${performanceDegradation.toFixed(1)}%`);
      
      // Performance degradation should be minimal
      expect(performanceDegradation).toBeLessThan(25); // Less than 25% degradation
    });
  });
});
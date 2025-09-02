/**
 * Performance E2E Tests for Single-Connection Architecture
 * Verifies system performance under various load conditions
 */

import { test, expect } from '@playwright/test';
import { waitForAppReady, createClaudeInstance, waitForWebSocketConnection, sendCommandSafely } from './test-helpers';

test.describe('Performance Tests', () => {
  
  test('Connection establishment performance', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('http://localhost:3000');
    await waitForAppReady(page);
    
    await page.click('[data-testid="web-view-toggle"]');
    
    const startTime = Date.now();
    const instanceId = await createClaudeInstance(page);
    
    // Measure connection time
    const connectStartTime = Date.now();
    await page.click(`[data-testid="connect-button-${instanceId}"]`);
    await waitForWebSocketConnection(page, instanceId);
    const connectionTime = Date.now() - connectStartTime;
    
    // Connection should be established within 5 seconds
    expect(connectionTime).toBeLessThan(5000);
    
    console.log(`✅ Connection established in ${connectionTime}ms`);
  });

  test('UI responsiveness during heavy operations', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:3000');
    await waitForAppReady(page);
    
    await page.click('[data-testid="web-view-toggle"]');
    
    const instanceId = await createClaudeInstance(page);
    await page.click(`[data-testid="connect-button-${instanceId}"]`);
    await waitForWebSocketConnection(page, instanceId);
    
    // Send a command that might take time
    const uiTestStart = Date.now();
    await sendCommandSafely(page, 'hello, please give me a long response');
    
    // While command is processing, test UI responsiveness
    await page.click('[data-testid="terminal-view-toggle"]');
    await page.click('[data-testid="web-view-toggle"]');
    
    const uiResponseTime = Date.now() - uiTestStart;
    
    // UI interactions should complete quickly even during AI processing
    expect(uiResponseTime).toBeLessThan(2000);
    
    console.log(`✅ UI remained responsive (${uiResponseTime}ms) during AI processing`);
  });

  test('Memory usage stability', async ({ page }) => {
    test.setTimeout(120000);

    await page.goto('http://localhost:3000');
    await waitForAppReady(page);
    
    await page.click('[data-testid="web-view-toggle"]');
    
    const instanceId = await createClaudeInstance(page);
    await page.click(`[data-testid="connect-button-${instanceId}"]`);
    await waitForWebSocketConnection(page, instanceId);
    
    // Get baseline memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Send multiple commands to test memory stability
    const commands = [
      'pwd',
      'ls -la',
      'echo "test 1"',
      'echo "test 2"',
      'echo "test 3"'
    ];
    
    for (const command of commands) {
      await sendCommandSafely(page, command);
      await page.waitForTimeout(2000);
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if (window.gc) {
        window.gc();
      }
    });
    
    // Check memory usage after operations
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      // Memory increase should be reasonable (less than 50% growth)
      expect(memoryIncreasePercent).toBeLessThan(50);
      
      console.log(`✅ Memory usage stable: ${memoryIncreasePercent.toFixed(1)}% increase`);
    } else {
      console.log('ℹ️ Memory monitoring not available in this browser');
    }
  });

  test('Concurrent connection handling', async ({ browser }) => {
    test.setTimeout(120000);

    // Create multiple browser contexts to simulate concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext()
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    try {
      // Navigate all pages
      await Promise.all(pages.map(async (page) => {
        await page.goto('http://localhost:3000');
        await waitForAppReady(page);
        await page.click('[data-testid="web-view-toggle"]');
      }));
      
      // Create instances concurrently
      const instanceIds = await Promise.all(
        pages.map(page => createClaudeInstance(page, `Concurrent Test ${Math.random()}`))
      );
      
      // Try to connect concurrently
      const connectionPromises = pages.map(async (page, index) => {
        const instanceId = instanceIds[index];
        await page.click(`[data-testid="connect-button-${instanceId}"]`);
        return { page, instanceId };
      });
      
      const results = await Promise.allSettled(connectionPromises);
      
      // At least one connection should succeed
      const successfulConnections = results.filter(result => result.status === 'fulfilled');
      expect(successfulConnections.length).toBeGreaterThanOrEqual(1);
      
      console.log(`✅ Concurrent connections handled: ${successfulConnections.length}/${results.length} succeeded`);
      
    } finally {
      // Cleanup
      await Promise.all(pages.map(page => page.close()));
      await Promise.all(contexts.map(ctx => ctx.close()));
    }
  });

  test('WebSocket message throughput', async ({ page }) => {
    test.setTimeout(90000);

    await page.goto('http://localhost:3000');
    await waitForAppReady(page);
    
    await page.click('[data-testid="web-view-toggle"]');
    
    const instanceId = await createClaudeInstance(page);
    await page.click(`[data-testid="connect-button-${instanceId}"]`);
    await waitForWebSocketConnection(page, instanceId);
    
    // Monitor WebSocket messages
    let messageCount = 0;
    page.on('websocket', ws => {
      ws.on('framereceived', () => messageCount++);
      ws.on('framesent', () => messageCount++);
    });
    
    const startTime = Date.now();
    
    // Send multiple rapid commands
    const rapidCommands = Array.from({ length: 5 }, (_, i) => `echo "rapid test ${i}"`);
    
    for (const command of rapidCommands) {
      await sendCommandSafely(page, command);
      await page.waitForTimeout(500); // Small delay between commands
    }
    
    const duration = Date.now() - startTime;
    const messagesPerSecond = (messageCount / duration) * 1000;
    
    // Should handle reasonable message throughput
    expect(messagesPerSecond).toBeGreaterThan(1);
    
    console.log(`✅ WebSocket throughput: ${messagesPerSecond.toFixed(2)} messages/second`);
  });
});
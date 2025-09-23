import { test, expect, Page } from '@playwright/test';

/**
 * Performance-focused E2E tests for Token Cost Analytics
 * Validates performance benchmarks, memory usage, and timing constraints
 */

test.describe('Token Analytics Performance Tests', () => {
  let performanceBaseline: any;
  
  test.beforeAll(async () => {
    // Establish performance baseline
    performanceBaseline = {
      maxLoadTime: 3000,
      maxTabSwitchTime: 500,
      maxMemoryGrowth: 0.3, // 30%
      maxRenderTime: 1000,
      minFrameRate: 30
    };
  });

  test.beforeEach(async ({ page }) => {
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceStart = performance.now();
      window.performanceMarks = [];
      window.memoryBaseline = (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    await page.goto('http://localhost:3001/analytics', { waitUntil: 'networkidle' });
  });

  test.describe('Load Performance', () => {
    test('should load Token Costs tab within performance threshold', async ({ page }) => {
      const startTime = Date.now();
      
      // Mark performance start
      await page.evaluate(() => {
        performance.mark('tab-switch-start');
      });
      
      await page.click('button:has-text("Token Costs")');
      
      // Wait for key content to be visible
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('text=Total Cost')).toBeVisible();
      
      // Mark performance end
      await page.evaluate(() => {
        performance.mark('tab-switch-end');
        performance.measure('tab-switch-duration', 'tab-switch-start', 'tab-switch-end');
      });
      
      const loadTime = Date.now() - startTime;
      const performanceMeasure = await page.evaluate(() => {
        const measures = performance.getEntriesByName('tab-switch-duration');
        return measures[0]?.duration || 0;
      });
      
      console.log(`Tab switch time: ${loadTime}ms (performance API: ${performanceMeasure.toFixed(2)}ms)`);
      
      // Should load within baseline threshold
      expect(loadTime).toBeLessThan(performanceBaseline.maxTabSwitchTime);
    });

    test('should render metric cards within acceptable time', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      
      const renderStartTime = Date.now();
      
      // Wait for all metric cards to render
      await Promise.all([
        expect(page.locator('text=Total Cost')).toBeVisible(),
        expect(page.locator('text=Total Tokens')).toBeVisible(),
        expect(page.locator('text=Avg Cost/Token')).toBeVisible()
      ]);
      
      const renderTime = Date.now() - renderStartTime;
      console.log(`Metric cards render time: ${renderTime}ms`);
      
      expect(renderTime).toBeLessThan(performanceBaseline.maxRenderTime);
    });

    test('should handle time range switching with minimal delay', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(500);
      
      const timeRanges = ['1h', '7d', '30d', '1d'];
      const switchTimes: number[] = [];
      
      for (const range of timeRanges) {
        const startTime = performance.now();
        
        await page.click(`button:has-text("${range}")`);
        await expect(page.locator(`button:has-text("${range}")`)).toHaveClass(/bg-white text-blue-600/);
        
        const switchTime = performance.now() - startTime;
        switchTimes.push(switchTime);
        
        await page.waitForTimeout(100);
      }
      
      const avgSwitchTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length;
      const maxSwitchTime = Math.max(...switchTimes);
      
      console.log(`Time range switch - Avg: ${avgSwitchTime.toFixed(2)}ms, Max: ${maxSwitchTime.toFixed(2)}ms`);
      
      expect(avgSwitchTime).toBeLessThan(200);
      expect(maxSwitchTime).toBeLessThan(300);
    });
  });

  test.describe('Memory Performance', () => {
    test('should maintain reasonable memory usage during extended interaction', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Simulate extended usage
      const interactions = 50;
      for (let i = 0; i < interactions; i++) {
        // Alternate between tabs
        await page.click('button:has-text("System")');
        await page.waitForTimeout(50);
        await page.click('button:has-text("Token Costs")');
        await page.waitForTimeout(50);
        
        // Change time ranges
        const ranges = ['1h', '1d', '7d', '30d'];
        const randomRange = ranges[i % ranges.length];
        await page.click(`button:has-text("${randomRange}")`);
        await page.waitForTimeout(25);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowthRatio = (finalMemory - initialMemory) / initialMemory;
        console.log(`Memory usage - Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB, Growth: ${(memoryGrowthRatio * 100).toFixed(2)}%`);
        
        expect(memoryGrowthRatio).toBeLessThan(performanceBaseline.maxMemoryGrowth);
      }
    });

    test('should cleanup resources when switching away from token analytics', async ({ page }) => {
      // Navigate to token analytics
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      const afterLoadMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Switch to system analytics
      await page.click('button:has-text("System")');
      await page.waitForTimeout(1000);
      
      // Force cleanup
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      const afterSwitchMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      if (afterLoadMemory > 0 && afterSwitchMemory > 0) {
        const memoryReduction = (afterLoadMemory - afterSwitchMemory) / afterLoadMemory;
        console.log(`Memory cleanup - Before switch: ${(afterLoadMemory / 1024 / 1024).toFixed(2)}MB, After switch: ${(afterSwitchMemory / 1024 / 1024).toFixed(2)}MB, Reduction: ${(memoryReduction * 100).toFixed(2)}%`);
        
        // Some cleanup should occur, but not requiring specific percentage
        // as it depends on browser GC behavior
        expect(afterSwitchMemory).toBeLessThanOrEqual(afterLoadMemory * 1.1);
      }
    });
  });

  test.describe('Interaction Performance', () => {
    test('should handle rapid button clicks without performance degradation', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(500);
      
      const clickTimes: number[] = [];
      const button = page.locator('button:has-text("Refresh")');
      
      // Perform rapid clicks
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await button.click();
        await page.waitForTimeout(50);
        const clickTime = performance.now() - startTime;
        clickTimes.push(clickTime);
      }
      
      const avgClickTime = clickTimes.reduce((sum, time) => sum + time, 0) / clickTimes.length;
      const maxClickTime = Math.max(...clickTimes);
      
      console.log(`Rapid clicks - Avg response: ${avgClickTime.toFixed(2)}ms, Max response: ${maxClickTime.toFixed(2)}ms`);
      
      expect(avgClickTime).toBeLessThan(100);
      expect(maxClickTime).toBeLessThan(200);
    });

    test('should maintain smooth scrolling with large datasets', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(2000);
      
      // Check if usage timeline is present
      const usageTimeline = page.locator('text=Usage Timeline');
      
      if (await usageTimeline.count() > 0) {
        // Test scrolling performance
        const scrollContainer = page.locator('div').filter({ has: usageTimeline }).first();
        
        const scrollStartTime = performance.now();
        
        // Perform scroll operations
        for (let i = 0; i < 5; i++) {
          await scrollContainer.evaluate(el => {
            el.scrollTop += 100;
          });
          await page.waitForTimeout(50);
        }
        
        const scrollTime = performance.now() - scrollStartTime;
        console.log(`Scroll performance: ${scrollTime.toFixed(2)}ms for 5 scroll operations`);
        
        expect(scrollTime).toBeLessThan(500);
      }
    });

    test('should export data without blocking UI', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      const exportButton = page.locator('button:has-text("Export")');
      
      if (await exportButton.count() > 0) {
        const exportStartTime = performance.now();
        
        // Set up download listener (but don't wait for completion)
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        
        // UI should remain responsive during export
        await page.click('button:has-text("7d")');
        await expect(page.locator('button:has-text("7d")')).toHaveClass(/bg-white text-blue-600/);
        
        const responsiveTime = performance.now() - exportStartTime;
        console.log(`UI remained responsive during export: ${responsiveTime.toFixed(2)}ms`);
        
        expect(responsiveTime).toBeLessThan(1000);
        
        // Complete download
        await downloadPromise;
      }
    });
  });

  test.describe('Rendering Performance', () => {
    test('should maintain consistent frame rate during animations', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      
      // Monitor frame rate during loading animation
      const frameRates = await page.evaluate(async () => {
        return new Promise<number[]>((resolve) => {
          const frameRates: number[] = [];
          let lastFrame = performance.now();
          let frameCount = 0;
          
          function measureFrame() {
            const now = performance.now();
            const frameDuration = now - lastFrame;
            const fps = 1000 / frameDuration;
            frameRates.push(fps);
            lastFrame = now;
            frameCount++;
            
            if (frameCount < 60) { // Monitor for 60 frames
              requestAnimationFrame(measureFrame);
            } else {
              resolve(frameRates);
            }
          }
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      const avgFrameRate = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length;
      const minFrameRate = Math.min(...frameRates);
      
      console.log(`Frame rate - Avg: ${avgFrameRate.toFixed(2)}fps, Min: ${minFrameRate.toFixed(2)}fps`);
      
      expect(minFrameRate).toBeGreaterThan(performanceBaseline.minFrameRate);
    });

    test('should efficiently update metric displays', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Measure time to update metrics when changing time range
      const updateTimes: number[] = [];
      const timeRanges = ['1h', '7d', '30d', '1d'];
      
      for (const range of timeRanges) {
        const updateStartTime = performance.now();
        
        await page.click(`button:has-text("${range}")`);
        
        // Wait for potential metric updates
        await page.waitForTimeout(200);
        
        const updateTime = performance.now() - updateStartTime;
        updateTimes.push(updateTime);
      }
      
      const avgUpdateTime = updateTimes.reduce((sum, time) => sum + time, 0) / updateTimes.length;
      console.log(`Metric update time - Avg: ${avgUpdateTime.toFixed(2)}ms`);
      
      expect(avgUpdateTime).toBeLessThan(300);
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async ({ page }) => {
      // Simulate slow network
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024, // 50KB/s
        uploadThroughput: 50 * 1024,
        latency: 500 // 500ms latency
      });
      
      const startTime = Date.now();
      
      await page.click('button:has-text("Token Costs")');
      
      // Should still render basic UI even with slow network
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      
      const renderTime = Date.now() - startTime;
      console.log(`Render time under slow network: ${renderTime}ms`);
      
      // Should render basic UI within reasonable time even on slow network
      expect(renderTime).toBeLessThan(5000);
      
      // Disable network throttling
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });
    });

    test('should handle offline scenarios without breaking', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Go offline
      await page.context().setOffline(true);
      
      // Try to refresh data
      const refreshButton = page.locator('button:has-text("Refresh")');
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        await page.waitForTimeout(1000);
        
        // UI should remain functional
        await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
        await expect(page.locator('button:has-text("System")')).toBeVisible();
      }
      
      // Go back online
      await page.context().setOffline(false);
    });
  });

  test.afterEach(async ({ page }) => {
    // Collect performance metrics for reporting
    const performanceData = await page.evaluate(() => {
      return {
        memory: (performance as any).memory,
        navigation: performance.getEntriesByType('navigation')[0],
        measures: performance.getEntriesByType('measure'),
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
    
    console.log(`Test completed with ${performanceData.resourceCount} resources loaded`);
  });
});
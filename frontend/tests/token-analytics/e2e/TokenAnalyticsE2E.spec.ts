/**
 * End-to-End Tests for Token Analytics
 * Playwright automation for comprehensive token cost scenarios
 * 
 * Coverage:
 * - Full user workflow testing
 * - Real WebSocket connections
 * - Performance under load
 * - Cross-browser compatibility
 * - Mobile responsiveness
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3001',
  timeout: 30000,
  webSocketURL: process.env.WS_URL || 'ws://localhost:3001/ws',
  tokenThresholds: {
    budget: 100.00,
    performance: 50, // 50ms response time
    memory: 80 // 80% memory usage
  }
};

test.describe('Token Analytics End-to-End Testing', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // Enable performance monitoring
      recordHar: { path: 'test-results/token-analytics-har.har' },
      recordVideo: { dir: 'test-results/videos/' }
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
    
    // Setup performance monitoring
    await page.coverage.startCSSCoverage();
    await page.coverage.startJSCoverage();
    
    // Navigate to application
    await page.goto(`${TEST_CONFIG.baseURL}/analytics`);
    
    // Wait for WebSocket connection
    await page.waitForFunction(() => {
      return window.WebSocket && window.WebSocket.OPEN;
    }, { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Collect coverage data
    const jsCoverage = await page.coverage.stopJSCoverage();
    const cssCoverage = await page.coverage.stopCSSCoverage();
    
    // Log coverage statistics
    console.log('JS Coverage:', jsCoverage.length, 'files');
    console.log('CSS Coverage:', cssCoverage.length, 'files');
    
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Core Token Analytics Functionality', () => {
    test('should display real-time token cost updates', async () => {
      // Wait for token analytics component to load
      await expect(page.locator('[data-testid="token-analytics"]')).toBeVisible();
      
      // Check initial state
      await expect(page.locator('[data-testid="total-cost"]')).toContainText('$0.00');
      
      // Trigger token usage (simulate API call)
      await page.click('[data-testid="simulate-token-usage"]');
      
      // Verify cost updates in real-time
      await expect(page.locator('[data-testid="total-cost"]')).not.toContainText('$0.00', {
        timeout: 5000
      });
      
      // Verify streaming data
      const costElement = page.locator('[data-testid="current-cost"]');
      const initialCost = await costElement.textContent();
      
      // Wait for cost to change (streaming updates)
      await expect(costElement).not.toHaveText(initialCost || '', { timeout: 3000 });
    });

    test('should handle budget threshold alerts', async () => {
      // Set a low budget threshold for testing
      await page.fill('[data-testid="budget-threshold-input"]', '5.00');
      await page.click('[data-testid="set-budget-button"]');
      
      // Trigger usage that exceeds budget
      await page.click('[data-testid="generate-high-usage"]');
      
      // Verify budget alert appears
      await expect(page.locator('[data-testid="budget-alert"]')).toBeVisible({
        timeout: 10000
      });
      
      // Check alert content
      await expect(page.locator('[data-testid="budget-alert"]'))
        .toContainText('Budget Exceeded');
      
      // Verify alert can be dismissed
      await page.click('[data-testid="dismiss-alert"]');
      await expect(page.locator('[data-testid="budget-alert"]')).not.toBeVisible();
    });

    test('should display token usage charts and analytics', async () => {
      // Generate some token usage data
      await page.click('[data-testid="generate-sample-data"]');
      
      // Wait for chart to render
      await expect(page.locator('[data-testid="token-chart"]')).toBeVisible({
        timeout: 5000
      });
      
      // Verify chart elements
      await expect(page.locator('canvas')).toBeVisible();
      
      // Check chart legend
      await expect(page.locator('[data-testid="chart-legend"]')).toBeVisible();
      
      // Verify data points
      const dataPoints = page.locator('[data-testid^="chart-point-"]');
      await expect(dataPoints.first()).toBeVisible();
      
      // Test chart interactions
      await page.hover('[data-testid="chart-container"]');
      await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle high-frequency token updates without UI lag', async () => {
      // Start performance monitoring
      const startTime = Date.now();
      
      // Enable high-frequency updates
      await page.click('[data-testid="high-frequency-mode"]');
      
      // Monitor UI responsiveness
      const responseTimes = [];
      
      for (let i = 0; i < 10; i++) {
        const clickStart = Date.now();
        await page.click('[data-testid="refresh-button"]');
        await page.waitForSelector('[data-testid="last-updated"]');
        const clickEnd = Date.now();
        
        responseTimes.push(clickEnd - clickStart);
        await page.waitForTimeout(200); // 200ms between clicks
      }
      
      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      // Assert UI remains responsive (< 100ms average response time)
      expect(avgResponseTime).toBeLessThan(100);
      
      const endTime = Date.now();
      console.log(`Performance test duration: ${endTime - startTime}ms`);
      console.log(`Average UI response time: ${avgResponseTime}ms`);
    });

    test('should maintain accuracy under load stress testing', async () => {
      // Setup accuracy validation
      await page.evaluate(() => {
        window.testAccuracyData = [];
      });
      
      // Start stress test
      await page.click('[data-testid="stress-test-button"]');
      
      // Monitor for 10 seconds
      await page.waitForTimeout(10000);
      
      // Collect accuracy data
      const accuracyResults = await page.evaluate(() => {
        return window.testAccuracyData || [];
      });
      
      // Verify accuracy remains high (>95%)
      const accurateCalculations = accuracyResults.filter(result => result.accurate);
      const accuracyRate = accurateCalculations.length / accuracyResults.length;
      
      expect(accuracyRate).toBeGreaterThan(0.95); // 95% accuracy threshold
    });

    test('should detect and prevent memory leaks', async () => {
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      // Run memory-intensive operations
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="generate-large-dataset"]');
        await page.waitForTimeout(1000);
        
        // Trigger garbage collection if available
        await page.evaluate(() => {
          if (window.gc) window.gc();
        });
      }
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });
      
      // Memory increase should be reasonable (<50MB)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  test.describe('WebSocket Connection Resilience', () => {
    test('should handle WebSocket disconnections gracefully', async () => {
      // Verify initial connection
      await expect(page.locator('[data-testid="connection-status"]'))
        .toContainText('Connected');
      
      // Simulate network disconnection
      await page.evaluate(() => {
        // Close WebSocket connection
        if (window.websocketConnection) {
          window.websocketConnection.close();
        }
      });
      
      // Verify disconnection is detected
      await expect(page.locator('[data-testid="connection-status"]'))
        .toContainText('Disconnected', { timeout: 5000 });
      
      // Verify reconnection attempt indicator
      await expect(page.locator('[data-testid="reconnecting-indicator"]'))
        .toBeVisible();
      
      // Wait for automatic reconnection
      await expect(page.locator('[data-testid="connection-status"]'))
        .toContainText('Connected', { timeout: 15000 });
      
      // Verify data streaming resumes
      const costBefore = await page.textContent('[data-testid="total-cost"]');
      await page.waitForTimeout(2000);
      const costAfter = await page.textContent('[data-testid="total-cost"]');
      
      expect(costBefore).not.toBe(costAfter); // Cost should be updating
    });

    test('should queue updates during disconnection and replay on reconnection', async () => {
      // Start monitoring queued updates
      await page.evaluate(() => {
        window.queuedUpdates = [];
      });
      
      // Disconnect WebSocket
      await page.evaluate(() => {
        if (window.websocketConnection) {
          window.websocketConnection.close();
        }
      });
      
      // Generate updates while disconnected
      await page.click('[data-testid="generate-updates-offline"]');
      
      // Verify updates are queued
      const queuedCount = await page.evaluate(() => {
        return window.queuedUpdates ? window.queuedUpdates.length : 0;
      });
      
      expect(queuedCount).toBeGreaterThan(0);
      
      // Reconnect
      await page.click('[data-testid="force-reconnect"]');
      
      // Verify queued updates are processed
      await expect(page.locator('[data-testid="processing-queue"]'))
        .toBeVisible({ timeout: 5000 });
      
      await expect(page.locator('[data-testid="queue-processed"]'))
        .toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Cross-Browser and Mobile Compatibility', () => {
    test('should work correctly on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-token-analytics"]'))
        .toBeVisible();
      
      // Test touch interactions
      await page.tap('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Test swipe gestures on charts
      const chartContainer = page.locator('[data-testid="mobile-chart"]');
      await chartContainer.hover();
      
      // Simulate swipe
      await page.mouse.down();
      await page.mouse.move(100, 0);
      await page.mouse.up();
      
      // Verify chart responds to swipe
      await expect(page.locator('[data-testid="chart-scrolled"]')).toBeVisible();
    });

    test('should maintain functionality across different browsers', async () => {
      // This test runs across all configured browsers in playwright.config.ts
      
      // Test WebSocket support
      const wsSupported = await page.evaluate(() => {
        return typeof WebSocket !== 'undefined';
      });
      expect(wsSupported).toBe(true);
      
      // Test performance APIs
      const perfSupported = await page.evaluate(() => {
        return typeof performance !== 'undefined' && 
               typeof performance.now === 'function';
      });
      expect(perfSupported).toBe(true);
      
      // Test modern JavaScript features
      const modernFeaturesSupported = await page.evaluate(() => {
        try {
          // Test async/await, arrow functions, destructuring
          const test = async () => {
            const { a = 1 } = {};
            return a;
          };
          return typeof test === 'function';
        } catch (e) {
          return false;
        }
      });
      expect(modernFeaturesSupported).toBe(true);
    });
  });

  test.describe('Data Accuracy and Validation', () => {
    test('should calculate token costs accurately across different scenarios', async () => {
      const testCases = [
        { tokens: 100, expectedCost: 1.00 },
        { tokens: 250, expectedCost: 2.50 },
        { tokens: 1000, expectedCost: 10.00 },
        { tokens: 0, expectedCost: 0.00 }
      ];
      
      for (const testCase of testCases) {
        // Input token count
        await page.fill('[data-testid="manual-token-input"]', testCase.tokens.toString());
        await page.click('[data-testid="calculate-cost"]');
        
        // Verify calculated cost
        await expect(page.locator('[data-testid="calculated-cost"]'))
          .toContainText(`$${testCase.expectedCost.toFixed(2)}`);
        
        await page.waitForTimeout(500); // Brief pause between tests
      }
    });

    test('should handle edge cases and invalid inputs gracefully', async () => {
      const edgeCases = [
        { input: 'invalid', expectedError: 'Invalid token count' },
        { input: '-100', expectedError: 'Token count must be positive' },
        { input: '999999999999', expectedError: 'Token count too large' },
        { input: '0.1', expectedResult: '$0.00' } // Rounds to 0 tokens
      ];
      
      for (const edgeCase of edgeCases) {
        await page.fill('[data-testid="manual-token-input"]', edgeCase.input);
        await page.click('[data-testid="calculate-cost"]');
        
        if (edgeCase.expectedError) {
          await expect(page.locator('[data-testid="error-message"]'))
            .toContainText(edgeCase.expectedError);
        } else if (edgeCase.expectedResult) {
          await expect(page.locator('[data-testid="calculated-cost"]'))
            .toContainText(edgeCase.expectedResult);
        }
        
        // Clear error state
        await page.click('[data-testid="clear-input"]');
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe('Accessibility and User Experience', () => {
    test('should be accessible to screen readers', async () => {
      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="token-analytics"]'))
        .toHaveAttribute('role', 'region');
      
      await expect(page.locator('[data-testid="token-analytics"]'))
        .toHaveAttribute('aria-label', /token analytics/i);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test with screen reader simulation
      const ariaDescriptions = await page.locator('[aria-describedby]').count();
      expect(ariaDescriptions).toBeGreaterThan(0);
    });

    test('should provide clear error messages and recovery options', async () => {
      // Trigger an error condition
      await page.evaluate(() => {
        // Simulate network error
        window.fetch = () => Promise.reject(new Error('Network error'));
      });
      
      await page.click('[data-testid="refresh-data"]');
      
      // Verify error message appears
      await expect(page.locator('[data-testid="error-banner"]')).toBeVisible();
      
      // Verify retry option is available
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.click('[data-testid="retry-button"]');
      
      // Verify loading state
      await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    });
  });
});

// Helper test for setting up test data
test('Setup test data', async ({ page }) => {
  await page.goto(`${TEST_CONFIG.baseURL}/test-setup`);
  
  // Clear any existing test data
  await page.click('[data-testid="clear-test-data"]');
  
  // Generate fresh test data
  await page.click('[data-testid="generate-test-data"]');
  
  // Verify test data is ready
  await expect(page.locator('[data-testid="test-data-ready"]')).toBeVisible({
    timeout: 10000
  });
});
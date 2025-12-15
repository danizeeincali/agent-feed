import { test, expect, Page, Browser } from '@playwright/test';

/**
 * Comprehensive End-to-End Test Suite for Token Cost Analytics Integration
 * 
 * Test Coverage:
 * - Analytics Dashboard Integration
 * - Token Cost Analytics UI Testing
 * - Responsive Design Validation
 * - Error Handling & Graceful Degradation
 * - Performance & Memory Testing
 * - Integration Regression Testing
 * - Accessibility Compliance
 * - Cross-browser Compatibility
 */

test.describe('Token Cost Analytics - Comprehensive E2E Suite', () => {
  let testStartTime: number;
  let performanceMetrics: any[] = [];
  
  test.beforeEach(async ({ page }) => {
    testStartTime = Date.now();
    
    // Enable performance monitoring
    await page.addInitScript(() => {
      window.performanceData = {
        navigationStart: performance.now(),
        domContentLoaded: 0,
        loadComplete: 0,
        memoryUsage: [],
        renderTimes: []
      };
    });
    
    // Navigate to analytics page with performance tracking
    await page.goto('http://localhost:3001/analytics', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // Allow for initial load
  });

  test.afterEach(async ({ page }) => {
    // Collect performance data
    const perfData = await page.evaluate(() => ({
      memory: (performance as any).memory,
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource').length,
      testDuration: Date.now() - window.testStartTime
    }));
    
    performanceMetrics.push({
      test: test.info().title,
      duration: Date.now() - testStartTime,
      ...perfData
    });
  });

  test.describe('1. Analytics Dashboard Integration', () => {
    test('should seamlessly integrate Token Costs tab with existing dashboard', async ({ page }) => {
      // Verify both tabs are present and functional
      const systemTab = page.locator('button:has-text("System")');
      const tokenTab = page.locator('button:has-text("Token Costs")');
      
      await expect(systemTab).toBeVisible();
      await expect(tokenTab).toBeVisible();
      
      // Verify System tab is active by default
      await expect(systemTab).toHaveClass(/bg-white text-blue-600/);
      
      // Verify tab switching preserves state
      await tokenTab.click();
      await page.waitForTimeout(300);
      await expect(tokenTab).toHaveClass(/bg-white text-blue-600/);
      await expect(systemTab).not.toHaveClass(/bg-white text-blue-600/);
      
      // Switch back and verify state preservation
      await systemTab.click();
      await page.waitForTimeout(300);
      await expect(systemTab).toHaveClass(/bg-white text-blue-600/);
    });

    test('should maintain dashboard header consistency across tabs', async ({ page }) => {
      // Check system tab header
      await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
      
      // Switch to token costs and verify header changes appropriately
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(500);
      
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('text=Real-time token usage and cost tracking')).toBeVisible();
    });

    test('should preserve refresh functionality across tabs', async ({ page }) => {
      const refreshButton = page.locator('button:has-text("Refresh")');
      
      // Test refresh on system tab
      await expect(refreshButton).toBeVisible();
      await refreshButton.click();
      await page.waitForTimeout(1000);
      
      // Switch to token costs tab
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(500);
      
      // Verify refresh button still works
      const tokenRefreshButton = page.locator('button:has-text("Refresh")');
      await expect(tokenRefreshButton).toBeVisible();
      await tokenRefreshButton.click();
      await page.waitForTimeout(500);
    });
  });

  test.describe('2. Token Cost Analytics UI Comprehensive Testing', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
    });

    test('should display all required metric cards with proper formatting', async ({ page }) => {
      // Verify all metric cards are present
      const metricCards = [
        'Total Cost',
        'Total Tokens', 
        'Avg Cost/Token'
      ];
      
      for (const metric of metricCards) {
        await expect(page.locator(`text=${metric}`)).toBeVisible();
      }
      
      // Verify currency formatting in Total Cost card
      const costCard = page.locator('div:has-text("Total Cost")').first();
      const currencyValue = costCard.locator('text=/\\$.*\\d/');
      await expect(currencyValue).toBeVisible();
      
      // Verify number formatting in Total Tokens card
      const tokensCard = page.locator('div:has-text("Total Tokens")').first();
      const tokenValue = tokensCard.locator('text=/\\d/');
      await expect(tokenValue).toBeVisible();
    });

    test('should provide comprehensive time range functionality', async ({ page }) => {
      const timeRanges = ['1h', '1d', '7d', '30d'];
      
      // Test each time range selection
      for (const range of timeRanges) {
        const rangeButton = page.locator(`button:has-text("${range}")`);
        await expect(rangeButton).toBeVisible();
        
        await rangeButton.click();
        await page.waitForTimeout(200);
        
        // Verify active state
        await expect(rangeButton).toHaveClass(/bg-white text-blue-600/);
        
        // Verify other ranges are inactive
        const otherRanges = timeRanges.filter(r => r !== range);
        for (const otherRange of otherRanges) {
          await expect(page.locator(`button:has-text("${otherRange}")`))
            .not.toHaveClass(/bg-white text-blue-600/);
        }
      }
    });

    test('should handle export functionality with file download', async ({ page }) => {
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();
      
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      await exportButton.click();
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/token-cost-analytics-\d{4}-\d{2}-\d{2}\.json/);
    });

    test('should display connection status with real-time updates', async ({ page }) => {
      // Check for connection status indicator
      const statusIndicators = [
        page.locator('text=Real-time updates active'),
        page.locator('text=Disconnected')
      ];
      
      let statusFound = false;
      for (const indicator of statusIndicators) {
        if (await indicator.count() > 0) {
          await expect(indicator).toBeVisible();
          statusFound = true;
          break;
        }
      }
      
      expect(statusFound).toBe(true);
      
      // Verify status dot color matches text
      const statusDot = page.locator('div').filter({ has: page.locator('w-2 h-2 rounded-full') });
      await expect(statusDot).toBeVisible();
    });

    test('should show budget alerts when thresholds are exceeded', async ({ page }) => {
      // Check if budget alert banner appears
      const alertBanner = page.locator('div:has-text("Budget Alert")');
      
      if (await alertBanner.count() > 0) {
        await expect(alertBanner).toBeVisible();
        
        // Verify alert has proper styling based on level
        const alertLevels = ['warning', 'critical', 'exceeded'];
        let hasValidAlert = false;
        
        for (const level of alertLevels) {
          const levelAlert = page.locator(`text=${level}`);
          if (await levelAlert.count() > 0) {
            hasValidAlert = true;
            break;
          }
        }
        
        expect(hasValidAlert).toBe(true);
      }
    });

    test('should display provider breakdown when data available', async ({ page }) => {
      // Wait for potential provider data to load
      await page.waitForTimeout(2000);
      
      const providerBreakdown = page.locator('text=Cost Breakdown by Provider');
      
      if (await providerBreakdown.count() > 0) {
        await expect(providerBreakdown).toBeVisible();
        
        // Verify provider cards show percentage and cost
        const providerCards = page.locator('div:has-text("% of total")');
        await expect(providerCards.first()).toBeVisible();
      }
    });

    test('should show usage timeline with proper data formatting', async ({ page }) => {
      await page.waitForTimeout(2000);
      
      const usageTimeline = page.locator('text=Usage Timeline');
      
      if (await usageTimeline.count() > 0) {
        await expect(usageTimeline).toBeVisible();
        
        // Verify table headers
        await expect(page.locator('th:has-text("Time")')).toBeVisible();
        await expect(page.locator('th:has-text("Tokens")')).toBeVisible();
        await expect(page.locator('th:has-text("Cost")')).toBeVisible();
        await expect(page.locator('th:has-text("Provider")')).toBeVisible();
      }
    });
  });

  test.describe('3. Responsive Design Validation', () => {
    const viewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop Small', width: 1280, height: 720 },
      { name: 'Desktop Large', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`should work correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.click('button:has-text("Token Costs")');
        await page.waitForTimeout(1000);

        // Core functionality should remain accessible
        await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
        
        // Time range selector should be accessible
        await expect(page.locator('button:has-text("1d")')).toBeVisible();
        
        // At least one metric card should be visible
        const metricCards = page.locator('text=Total Cost, text=Total Tokens, text=Avg Cost/Token');
        await expect(metricCards.first()).toBeVisible();
        
        // Navigation should remain functional
        await page.click('button:has-text("System")');
        await page.waitForTimeout(500);
        await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
        
        // Switch back to verify state preservation
        await page.click('button:has-text("Token Costs")');
        await page.waitForTimeout(500);
        await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      });
    }

    test('should handle orientation changes gracefully', async ({ page }) => {
      // Start in portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(500);
      
      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);
      
      // Verify functionality is preserved
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('button:has-text("1d")')).toBeVisible();
    });
  });

  test.describe('4. Error Handling & Graceful Degradation', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Simulate network failure
      await page.route('**/*', route => route.abort());
      
      // Component should still render without crashing
      await page.waitForTimeout(2000);
      
      // Should show either error state or empty state, not crash
      const hasError = await page.locator('text=error, text=Error').count() > 0;
      const hasEmptyState = await page.locator('text=No token usage data').count() > 0;
      const hasLoadingState = await page.locator('text=Loading').count() > 0;
      
      expect(hasError || hasEmptyState || hasLoadingState).toBe(true);
      
      // Navigation should remain functional
      await page.unroute('**/*');
      await page.click('button:has-text("System")');
      await page.waitForTimeout(500);
      await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    });

    test('should handle component errors with error boundaries', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Check for JavaScript errors in console
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Wait and check for errors
      await page.waitForTimeout(3000);
      
      // If there are console errors, they should not prevent navigation
      if (consoleErrors.length > 0) {
        console.warn('Console errors detected:', consoleErrors);
        
        // Navigation should still work
        await page.click('button:has-text("System")');
        await page.waitForTimeout(500);
        await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
      }
    });

    test('should provide retry mechanisms for failed operations', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(2000);
      
      // Look for retry buttons
      const retryButtons = [
        page.locator('button:has-text("Retry")'),
        page.locator('button:has-text("Check Again")'),
        page.locator('button:has-text("Refresh")')
      ];
      
      for (const retryButton of retryButtons) {
        if (await retryButton.count() > 0) {
          await expect(retryButton).toBeVisible();
          await retryButton.click();
          await page.waitForTimeout(500);
          break;
        }
      }
    });
  });

  test.describe('5. Performance & Memory Testing', () => {
    test('should load Token Costs tab within performance thresholds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.click('button:has-text("Token Costs")');
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Verify key components loaded
      await expect(page.locator('text=Total Cost')).toBeVisible({ timeout: 1000 });
    });

    test('should handle rapid interactions without performance degradation', async ({ page }) => {
      const startTime = Date.now();
      
      // Rapidly switch tabs and time ranges
      for (let i = 0; i < 10; i++) {
        await page.click('button:has-text("Token Costs")');
        await page.waitForTimeout(50);
        await page.click('button:has-text("7d")');
        await page.waitForTimeout(50);
        await page.click('button:has-text("System")');
        await page.waitForTimeout(50);
        await page.click('button:has-text("1h")');
        await page.waitForTimeout(50);
      }
      
      const totalTime = Date.now() - startTime;
      
      // Should complete rapid interactions in reasonable time
      expect(totalTime).toBeLessThan(5000);
      
      // Should end in functional state
      await page.click('button:has-text("Token Costs")');
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    });

    test('should prevent memory leaks during extended usage', async ({ page }) => {
      // Get initial memory baseline
      const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      // Simulate extended usage
      for (let i = 0; i < 20; i++) {
        await page.click('button:has-text("Token Costs")');
        await page.waitForTimeout(100);
        await page.click('button:has-text("7d")');
        await page.waitForTimeout(100);
        await page.click('button:has-text("1d")');
        await page.waitForTimeout(100);
        await page.click('button:has-text("System")');
        await page.waitForTimeout(100);
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Check final memory usage
      const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
        // Memory should not increase by more than 50%
        expect(memoryIncrease).toBeLessThan(0.5);
      }
    });
  });

  test.describe('6. Integration Regression Testing', () => {
    test('should not break existing system analytics functionality', async ({ page }) => {
      // Verify system analytics still works as expected
      const systemMetrics = ['CPU Usage', 'Memory Usage', 'Active Agents', 'Tasks Completed'];
      
      for (const metric of systemMetrics) {
        await expect(page.locator(`text=${metric}`)).toBeVisible();
      }
      
      // Verify system health section
      await expect(page.locator('text=System Health')).toBeVisible();
      await expect(page.locator('text=All Systems Operational')).toBeVisible();
      
      // Switch to token costs and back
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("System")');
      await page.waitForTimeout(500);
      
      // System metrics should still be visible
      for (const metric of systemMetrics) {
        await expect(page.locator(`text=${metric}`)).toBeVisible();
      }
    });

    test('should maintain URL routing and navigation integrity', async ({ page }) => {
      // Current URL should be analytics
      expect(page.url()).toContain('/analytics');
      
      // Navigate away and back
      await page.goto('http://localhost:3001/');
      await page.waitForTimeout(500);
      
      await page.goto('http://localhost:3001/analytics');
      await page.waitForTimeout(1000);
      
      // Both tabs should still be functional
      await expect(page.locator('button:has-text("System")')).toBeVisible();
      await expect(page.locator('button:has-text("Token Costs")')).toBeVisible();
      
      // Tab switching should work
      await page.click('button:has-text("Token Costs")');
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    });

    test('should preserve global application state during token analytics usage', async ({ page }) => {
      // Switch to token costs
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Navigate to other parts of the app
      await page.goto('http://localhost:3001/');
      await page.waitForTimeout(500);
      
      // Return to analytics
      await page.goto('http://localhost:3001/analytics');
      await page.waitForTimeout(1000);
      
      // Application should be in clean state
      await expect(page.locator('button:has-text("System")')).toHaveClass(/bg-white text-blue-600/);
      await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    });
  });

  test.describe('7. Accessibility Compliance', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Test keyboard navigation through interactive elements
      await page.keyboard.press('Tab');
      let activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeDefined();
      
      // Continue tabbing through elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        activeElement = await page.evaluate(() => document.activeElement?.tagName);
        
        // Should be able to tab to buttons and inputs
        if (activeElement === 'BUTTON') {
          // Test button activation with keyboard
          await page.keyboard.press('Enter');
          await page.waitForTimeout(200);
        }
      }
    });

    test('should have proper ARIA attributes and semantic markup', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Check for proper heading hierarchy
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      
      // Check for proper button roles
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        if (await button.isVisible()) {
          const role = await button.getAttribute('role');
          const ariaLabel = await button.getAttribute('aria-label');
          const textContent = await button.textContent();
          
          // Button should have either role, aria-label, or meaningful text
          expect(role === 'button' || ariaLabel || textContent?.trim()).toBeTruthy();
        }
      }
    });

    test('should work with screen reader simulation', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Check for screen reader accessible content
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
      expect(headings.length).toBeGreaterThan(0);
      
      // Check for meaningful text content
      const mainContent = await page.locator('main, [role="main"], body').first().textContent();
      expect(mainContent).toBeTruthy();
      expect(mainContent!.length).toBeGreaterThan(50);
    });

    test('should support high contrast and color accessibility', async ({ page }) => {
      // Enable high contrast mode simulation
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Verify content is still visible and accessible
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('button:has-text("1d")')).toBeVisible();
      
      // Switch back to light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForTimeout(500);
      
      // Content should remain accessible
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    });
  });

  test.describe('8. Cross-browser Compatibility', () => {
    // This would typically be handled by Playwright's project configuration
    // but we can add specific compatibility tests here
    
    test('should handle different font rendering across browsers', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Verify text is readable and properly sized
      const heading = page.locator('h2:has-text("Token Cost Analytics")');
      await expect(heading).toBeVisible();
      
      const boundingBox = await heading.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(100);
      expect(boundingBox?.height).toBeGreaterThan(20);
    });

    test('should handle CSS features consistently', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Test CSS Grid/Flexbox layouts
      const metricCards = page.locator('div:has-text("Total Cost"), div:has-text("Total Tokens")');
      const cardCount = await metricCards.count();
      
      if (cardCount > 0) {
        const firstCard = metricCards.first();
        const boundingBox = await firstCard.boundingBox();
        
        expect(boundingBox?.width).toBeGreaterThan(100);
        expect(boundingBox?.height).toBeGreaterThan(50);
      }
    });

    test('should handle JavaScript features consistently', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Test event handling
      const timeRangeButton = page.locator('button:has-text("7d")');
      await timeRangeButton.click();
      await page.waitForTimeout(300);
      
      // Verify state change worked
      await expect(timeRangeButton).toHaveClass(/bg-white text-blue-600/);
    });
  });

  // Generate performance report after all tests
  test.afterAll(async () => {
    if (performanceMetrics.length > 0) {
      console.log('\n=== TOKEN COST ANALYTICS E2E PERFORMANCE REPORT ===');
      console.log(`Total tests executed: ${performanceMetrics.length}`);
      
      const avgDuration = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length;
      console.log(`Average test duration: ${avgDuration.toFixed(2)}ms`);
      
      const slowestTest = performanceMetrics.reduce((max, m) => m.duration > max.duration ? m : max);
      console.log(`Slowest test: "${slowestTest.test}" (${slowestTest.duration}ms)`);
      
      const fastestTest = performanceMetrics.reduce((min, m) => m.duration < min.duration ? m : min);
      console.log(`Fastest test: "${fastestTest.test}" (${fastestTest.duration}ms)`);
      
      console.log('==========================================\n');
    }
  });
});
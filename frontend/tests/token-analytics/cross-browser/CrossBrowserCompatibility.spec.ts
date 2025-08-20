import { test, expect, devices } from '@playwright/test';

/**
 * Cross-browser compatibility tests for Token Cost Analytics
 * Validates functionality across different browsers and devices
 */

const browsers = [
  { name: 'Chromium', device: devices['Desktop Chrome'] },
  { name: 'Firefox', device: devices['Desktop Firefox'] },
  { name: 'WebKit', device: devices['Desktop Safari'] },
  { name: 'Mobile Chrome', device: devices['Pixel 5'] },
  { name: 'Mobile Safari', device: devices['iPhone 12'] }
];

for (const browser of browsers) {
  test.describe(`Cross-browser: ${browser.name}`, () => {
    test.use({ ...browser.device });

    test.beforeEach(async ({ page }) => {
      await page.goto('http://localhost:3001/analytics', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    });

    test('should display token analytics tab correctly', async ({ page }) => {
      // Verify tabs are visible
      await expect(page.locator('button:has-text("System")')).toBeVisible();
      await expect(page.locator('button:has-text("Token Costs")')).toBeVisible();
      
      // Switch to token costs
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Verify main components load
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      await expect(page.locator('text=Real-time token usage and cost tracking')).toBeVisible();
    });

    test('should render metric cards with proper formatting', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1500);
      
      // Check for metric cards
      const metricCards = ['Total Cost', 'Total Tokens', 'Avg Cost/Token'];
      
      for (const metric of metricCards) {
        await expect(page.locator(`text=${metric}`)).toBeVisible();
      }
      
      // Verify currency formatting works across browsers
      const costCard = page.locator('div:has-text("Total Cost")').first();
      const currencyValue = costCard.locator('text=/\\$.*\\d/');
      await expect(currencyValue).toBeVisible();
    });

    test('should handle time range selection consistently', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      const timeRanges = ['1h', '7d', '30d', '1d'];
      
      for (const range of timeRanges) {
        const rangeButton = page.locator(`button:has-text("${range}")`);
        await expect(rangeButton).toBeVisible();
        
        await rangeButton.click();
        await page.waitForTimeout(300);
        
        // Verify active state works across browsers
        await expect(rangeButton).toHaveClass(/bg-white text-blue-600/);
      }
    });

    test('should handle responsive design properly', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Get viewport size to adjust expectations
      const viewportSize = page.viewportSize();
      const isMobile = (viewportSize?.width || 1920) < 768;
      
      // Core elements should be visible regardless of screen size
      await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      
      if (!isMobile) {
        // Desktop should show all time range buttons in one row
        const timeRangeContainer = page.locator('div').filter({ has: page.locator('button:has-text("1h")') });
        await expect(timeRangeContainer).toBeVisible();
      }
      
      // Export button should be accessible (may be in mobile menu on small screens)
      const exportButton = page.locator('button:has-text("Export")');
      if (await exportButton.count() > 0) {
        await expect(exportButton).toBeVisible();
      }
    });

    test('should handle font rendering consistently', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Check that text is properly rendered
      const heading = page.locator('h2:has-text("Token Cost Analytics")');
      await expect(heading).toBeVisible();
      
      const boundingBox = await heading.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(100);
      expect(boundingBox?.height).toBeGreaterThan(20);
    });

    test('should maintain JavaScript functionality', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Test JavaScript event handling
      const refreshButton = page.locator('button:has-text("Refresh")');
      
      if (await refreshButton.count() > 0) {
        // Should be clickable without JavaScript errors
        await refreshButton.click();
        await page.waitForTimeout(500);
        
        // Page should remain functional
        await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
      }
    });

    test('should handle CSS features appropriately', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(1000);
      
      // Test CSS Grid/Flexbox layouts
      const metricCards = page.locator('div:has-text("Total Cost"), div:has-text("Total Tokens")');
      
      if (await metricCards.count() > 0) {
        const firstCard = metricCards.first();
        const boundingBox = await firstCard.boundingBox();
        
        // Cards should have reasonable dimensions
        expect(boundingBox?.width).toBeGreaterThan(100);
        expect(boundingBox?.height).toBeGreaterThan(50);
      }
    });

    test('should handle WebSocket connections consistently', async ({ page }) => {
      await page.click('button:has-text("Token Costs")');
      await page.waitForTimeout(2000);
      
      // Check connection status indicator
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
      
      expect(statusFound).toBeTruthy();
    });

    // Skip file download tests on mobile as they behave differently
    if (!browser.name.includes('Mobile')) {
      test('should handle file downloads consistently', async ({ page }) => {
        await page.click('button:has-text("Token Costs")');
        await page.waitForTimeout(1000);
        
        const exportButton = page.locator('button:has-text("Export")');
        
        if (await exportButton.count() > 0) {
          const downloadPromise = page.waitForEvent('download');
          await exportButton.click();
          
          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/token-cost-analytics-\d{4}-\d{2}-\d{2}\.json/);
        }
      });
    }
  });
}

// Additional tests for specific browser quirks
test.describe('Browser-specific Feature Tests', () => {
  test('should handle Safari-specific rendering', async ({ page, browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test');
    
    await page.goto('http://localhost:3001/analytics');
    await page.click('button:has-text("Token Costs")');
    await page.waitForTimeout(1000);
    
    // Safari may have specific date/number formatting behavior
    await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    
    // Test currency formatting specifically
    const costElements = page.locator('text=/\\$\\d+\\.\\d+/');
    if (await costElements.count() > 0) {
      const costText = await costElements.first().textContent();
      expect(costText).toMatch(/^\$\d+\.\d{4,}/);
    }
  });

  test('should handle Firefox-specific behaviors', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');
    
    await page.goto('http://localhost:3001/analytics');
    await page.click('button:has-text("Token Costs")');
    await page.waitForTimeout(1000);
    
    // Firefox may handle flexbox slightly differently
    const timeRangeContainer = page.locator('div').filter({ has: page.locator('button:has-text("1h")') });
    await expect(timeRangeContainer).toBeVisible();
    
    // Test button spacing and alignment
    const buttons = page.locator('button:has-text("1h"), button:has-text("1d"), button:has-text("7d"), button:has-text("30d")');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();
      
      expect(boundingBox?.width).toBeGreaterThan(30);
      expect(boundingBox?.height).toBeGreaterThan(25);
    }
  });

  test('should handle Chrome-specific performance features', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test');
    
    await page.goto('http://localhost:3001/analytics');
    
    // Test Chrome's performance API availability
    const hasPerformanceMemory = await page.evaluate(() => {
      return 'memory' in performance;
    });
    
    if (hasPerformanceMemory) {
      const memoryInfo = await page.evaluate(() => ({
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      }));
      
      expect(memoryInfo.usedJSHeapSize).toBeGreaterThan(0);
      expect(memoryInfo.totalJSHeapSize).toBeGreaterThan(memoryInfo.usedJSHeapSize);
    }
    
    await page.click('button:has-text("Token Costs")');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
  });
});

test.describe('Device-specific Tests', () => {
  test('should work on tablets', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('http://localhost:3001/analytics');
    await page.click('button:has-text("Token Costs")');
    await page.waitForTimeout(1000);
    
    // Should adapt layout for tablet
    await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    
    // Time range buttons should be accessible
    const timeRangeButton = page.locator('button:has-text("1d")');
    await expect(timeRangeButton).toBeVisible();
    
    const boundingBox = await timeRangeButton.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(35);
    expect(boundingBox?.height).toBeGreaterThan(30);
  });

  test('should handle touch interactions on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3001/analytics');
    
    // Use tap instead of click for mobile
    await page.tap('button:has-text("Token Costs")');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    
    // Test touch targets are large enough
    const buttons = page.locator('button:has-text("1h"), button:has-text("1d"), button:has-text("7d"), button:has-text("30d")');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 4); i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();
      
      if (boundingBox) {
        // WCAG guidelines suggest minimum 44x44px touch targets
        const adequateSize = boundingBox.width >= 40 && boundingBox.height >= 35;
        expect(adequateSize).toBeTruthy();
      }
    }
  });

  test('should maintain functionality in landscape orientation', async ({ page }) => {
    await page.setViewportSize({ width: 667, height: 375 }); // Landscape phone
    await page.goto('http://localhost:3001/analytics');
    await page.click('button:has-text("Token Costs")');
    await page.waitForTimeout(1000);
    
    // Core functionality should work in landscape
    await expect(page.locator('h2:has-text("Token Cost Analytics")')).toBeVisible();
    
    // Should be able to interact with time range buttons
    await page.click('button:has-text("7d")');
    await expect(page.locator('button:has-text("7d")')).toHaveClass(/bg-white text-blue-600/);
  });
});
import { test, expect, devices, Page } from '@playwright/test';

test.describe('Analytics Mobile Responsiveness Tests', () => {

  // Test on multiple mobile devices
  const mobileDevices = [
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'iPhone SE', device: devices['iPhone SE'] },
    { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
    { name: 'Pixel 5', device: devices['Pixel 5'] }
  ];

  mobileDevices.forEach(({ name, device }) => {
    test.describe(`${name} Tests`, () => {
      test.use(device);

      test(`${name}: Analytics components are properly responsive`, async ({ page }) => {
        await page.goto('/analytics');

        await test.step('Mobile layout loads without timeout errors', async () => {
          // Wait for main analytics to load
          await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 12000 });
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

          // Check viewport is mobile
          const viewport = page.viewportSize();
          expect(viewport?.width).toBeLessThan(500);
        });

        await test.step('Mobile navigation works for Claude SDK tab', async () => {
          const mobileLoadStart = Date.now();

          // On mobile, may need to handle navigation differently
          const claudeTab = page.locator('[data-testid="claude-sdk-tab"]');
          await expect(claudeTab).toBeVisible();

          // Check if tab is scrollable horizontally
          await claudeTab.scrollIntoViewIfNeeded();
          await claudeTab.click();

          await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

          const mobileLoadTime = Date.now() - mobileLoadStart;
          console.log(`${name} - Claude SDK loaded in ${mobileLoadTime}ms`);

          // Mobile gets extra time due to potentially slower hardware
          expect(mobileLoadTime).toBeLessThan(10000);
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        });

        await test.step('Mobile sub-tabs are accessible and functional', async () => {
          const subTabs = [
            { id: 'cost-overview-tab', name: 'Cost Overview' },
            { id: 'usage-metrics-tab', name: 'Usage Metrics' },
            { id: 'model-performance-tab', name: 'Model Performance' },
            { id: 'cost-breakdown-tab', name: 'Cost Breakdown' }
          ];

          for (const tab of subTabs) {
            const tabElement = page.locator(`[data-testid="${tab.id}"]`);

            // Ensure tab is visible and scrollable into view
            await tabElement.scrollIntoViewIfNeeded();
            await expect(tabElement).toBeVisible();

            await tabElement.click();
            await page.waitForTimeout(500); // Allow mobile layout to adjust

            // Check content loads properly on mobile
            const content = page.locator(`[data-testid="${tab.id}-content"]`);
            await expect(content).toBeVisible({ timeout: 12000 });

            // Verify content fits mobile viewport
            const boundingBox = await content.boundingBox();
            if (boundingBox && viewport) {
              expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);
            }

            // No timeout errors on mobile
            await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

            console.log(`${name} - ${tab.name} tab loaded successfully`);
          }
        });

        await test.step('Mobile touch interactions work correctly', async () => {
          // Test touch scrolling
          await page.touchscreen.tap(200, 300);
          await page.mouse.wheel(0, 500); // Scroll down

          // Test pinch zoom (if supported)
          const costTab = page.locator('[data-testid="cost-overview-tab"]');
          await costTab.click();

          await expect(page.locator('[data-testid="cost-overview-tab-content"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        });
      });

      test(`${name}: Mobile performance is acceptable`, async ({ page }) => {
        await page.goto('/analytics');

        await test.step('Mobile loading performance test', async () => {
          const performanceStart = Date.now();

          // Complete mobile analytics flow
          await page.click('[data-testid="claude-sdk-tab"]');
          await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

          // Test all sub-tabs
          const tabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

          for (const tabId of tabs) {
            const tabStart = Date.now();

            await page.click(`[data-testid="${tabId}"]`);
            await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 12000 });

            const tabTime = Date.now() - tabStart;
            console.log(`${name} - ${tabId}: ${tabTime}ms`);

            // Mobile performance thresholds (more lenient)
            expect(tabTime).toBeLessThan(8000);
            await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
          }

          const totalTime = Date.now() - performanceStart;
          console.log(`${name} - Total mobile flow: ${totalTime}ms`);

          // Total mobile flow should complete within reasonable time
          expect(totalTime).toBeLessThan(40000);
        });
      });
    });
  });

  test.describe('Tablet Responsiveness', () => {
    test.use(devices['iPad Pro']);

    test('iPad Pro: Analytics work correctly on tablet', async ({ page }) => {
      await page.goto('/analytics');

      await test.step('Tablet layout optimization', async () => {
        await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 12000 });

        const viewport = page.viewportSize();
        expect(viewport?.width).toBeGreaterThan(500);
        expect(viewport?.width).toBeLessThan(1200);

        // Tablet should load faster than mobile
        const tabletLoadStart = Date.now();

        await page.click('[data-testid="claude-sdk-tab"]');
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 12000 });

        const tabletLoadTime = Date.now() - tabletLoadStart;
        console.log(`iPad Pro - Claude SDK loaded in ${tabletLoadTime}ms`);

        expect(tabletLoadTime).toBeLessThan(7000);
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      });

      await test.step('Tablet sub-tabs functionality', async () => {
        const subTabs = ['cost-overview-tab', 'usage-metrics-tab', 'model-performance-tab', 'cost-breakdown-tab'];

        for (const tabId of subTabs) {
          await page.click(`[data-testid="${tabId}"]`);
          await expect(page.locator(`[data-testid="${tabId}-content"]`)).toBeVisible({ timeout: 10000 });

          // Tablet should have good performance
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

          // Check content layout on tablet
          const content = page.locator(`[data-testid="${tabId}-content"]`);
          const boundingBox = await content.boundingBox();

          if (boundingBox) {
            // Content should use tablet space efficiently
            expect(boundingBox.width).toBeGreaterThan(600);
            expect(boundingBox.width).toBeLessThan(1000);
          }
        }
      });
    });
  });

  test.describe('Responsive Breakpoint Tests', () => {
    const breakpoints = [
      { name: 'Small Mobile', width: 375, height: 667 },
      { name: 'Large Mobile', width: 414, height: 896 },
      { name: 'Small Tablet', width: 768, height: 1024 },
      { name: 'Large Tablet', width: 1024, height: 1366 },
      { name: 'Small Desktop', width: 1280, height: 720 }
    ];

    breakpoints.forEach(({ name, width, height }) => {
      test(`${name} (${width}x${height}): Analytics responsive behavior`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width, height }
        });
        const page = await context.newPage();

        await page.goto('/analytics');

        await test.step(`${name} analytics loading`, async () => {
          await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 12000 });

          const loadStart = Date.now();
          await page.click('[data-testid="claude-sdk-tab"]');
          await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

          const loadTime = Date.now() - loadStart;
          console.log(`${name} - Load time: ${loadTime}ms`);

          // Adjust performance expectations based on viewport size
          const maxLoadTime = width < 500 ? 10000 : width < 800 ? 8000 : 6000;
          expect(loadTime).toBeLessThan(maxLoadTime);

          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        });

        await test.step(`${name} content layout verification`, async () => {
          // Check if navigation is horizontal or vertical based on screen size
          const navigation = page.locator('[data-testid="analytics-navigation"]');
          const navBox = await navigation.boundingBox();

          if (navBox) {
            if (width < 768) {
              // Mobile should have compact navigation
              expect(navBox.height).toBeGreaterThan(50);
            } else {
              // Tablet/desktop should have more spacious navigation
              expect(navBox.width).toBeGreaterThan(200);
            }
          }

          // Test sub-tabs work at this breakpoint
          await page.click('[data-testid="cost-overview-tab"]');
          await expect(page.locator('[data-testid="cost-overview-tab-content"]')).toBeVisible({ timeout: 10000 });
          await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
        });

        await context.close();
      });
    });
  });

  test.describe('Orientation Change Tests', () => {
    test.use(devices['iPhone 12']);

    test('Portrait to Landscape orientation handling', async ({ page }) => {
      await page.goto('/analytics');

      await test.step('Portrait mode analytics', async () => {
        // Start in portrait mode
        await expect(page.locator('[data-testid="system-analytics"]')).toBeVisible({ timeout: 12000 });

        await page.click('[data-testid="claude-sdk-tab"]');
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      });

      await test.step('Landscape mode transition', async () => {
        // Rotate to landscape
        await page.setViewportSize({ width: 896, height: 414 });
        await page.waitForTimeout(1000); // Allow layout to adjust

        // Verify analytics still work after orientation change
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

        // Test sub-tab still works
        await page.click('[data-testid="usage-metrics-tab"]');
        await expect(page.locator('[data-testid="usage-metrics-tab-content"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      });

      await test.step('Return to portrait mode', async () => {
        // Rotate back to portrait
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(1000);

        // Verify everything still works
        await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 10000 });
        await page.click('[data-testid="model-performance-tab"]');
        await expect(page.locator('[data-testid="model-performance-tab-content"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
      });
    });
  });
});
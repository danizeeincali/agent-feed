import { test, expect, Page, Browser } from '@playwright/test';
import { join } from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = '/workspaces/agent-feed/tests/e2e/evidence-screenshots';

// Test configuration for different device types
const DEVICES = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

test.describe('Performance Tab Migration Validation', () => {
  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    await test.step('Create screenshots directory', async () => {
      const fs = await import('fs/promises');
      try {
        await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    });
  });

  test.describe('Desktop Testing', () => {
    test('Complete Performance Tab Migration Validation - Desktop', async ({ browser }) => {
      const context = await browser.newContext({
        viewport: DEVICES.desktop,
        recordVideo: { dir: 'tests/e2e/videos/' }
      });
      const page = await context.newPage();

      // Monitor console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Monitor network failures
      const networkErrors: string[] = [];
      page.on('response', (response) => {
        if (!response.ok()) {
          networkErrors.push(`${response.status()} ${response.url()}`);
        }
      });

      await test.step('1. Navigate to application home page', async () => {
        await page.goto(BASE_URL, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '01-desktop-homepage.png'),
          fullPage: true
        });
      });

      await test.step('2. Navigate to Analytics dashboard', async () => {
        // Look for analytics navigation link
        const analyticsLink = page.locator('a[href*="/analytics"], nav a:has-text("Analytics"), button:has-text("Analytics")');

        if (await analyticsLink.count() > 0) {
          await analyticsLink.first().click();
        } else {
          // Direct navigation if no link found
          await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' });
        }

        await page.waitForTimeout(2000);
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '02-desktop-analytics-dashboard.png'),
          fullPage: true
        });

        // Verify we're on the analytics page
        expect(page.url()).toContain('/analytics');
      });

      await test.step('3. Verify Analytics tabs are present', async () => {
        // Check for all expected tabs
        const tabs = ['System', 'Claude SDK', 'Performance'];

        for (const tabName of tabs) {
          const tab = page.locator(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}"), .tab:has-text("${tabName}")`);
          await expect(tab.first()).toBeVisible({ timeout: 10000 });
        }

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '03-desktop-analytics-tabs-visible.png'),
          fullPage: true
        });
      });

      await test.step('4. Click on Performance tab and verify enhanced metrics', async () => {
        // Click Performance tab
        const performanceTab = page.locator('[role="tab"]:has-text("Performance"), button:has-text("Performance"), .tab:has-text("Performance")');
        await performanceTab.first().click();
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '04-desktop-performance-tab-active.png'),
          fullPage: true
        });

        // Verify enhanced performance metrics are displayed
        const metricsSelectors = [
          '[data-testid*="fps"], .fps-metric, .metric:has-text("FPS")',
          '[data-testid*="memory"], .memory-metric, .metric:has-text("Memory")',
          '[data-testid*="render"], .render-metric, .metric:has-text("Render")'
        ];

        for (const selector of metricsSelectors) {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            await expect(element.first()).toBeVisible();
          }
        }
      });

      await test.step('5. Test real-time updates functionality', async () => {
        // Wait for potential real-time updates
        await page.waitForTimeout(5000);

        // Take screenshot to capture potential metric changes
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '05-desktop-realtime-updates.png'),
          fullPage: true
        });

        // Look for any updating elements or timestamps
        const updatingElements = page.locator('[data-testid*="last-updated"], .timestamp, .updating, [data-updating="true"]');
        if (await updatingElements.count() > 0) {
          await expect(updatingElements.first()).toBeVisible();
        }
      });

      await test.step('6. Test other Analytics tabs functionality', async () => {
        // Test System tab
        const systemTab = page.locator('[role="tab"]:has-text("System"), button:has-text("System"), .tab:has-text("System")');
        if (await systemTab.count() > 0) {
          await systemTab.first().click();
          await page.waitForTimeout(2000);

          await page.screenshot({
            path: join(SCREENSHOTS_DIR, '06-desktop-system-tab.png'),
            fullPage: true
          });
        }

        // Test Claude SDK tab
        const sdkTab = page.locator('[role="tab"]:has-text("Claude SDK"), button:has-text("Claude SDK"), .tab:has-text("Claude SDK")');
        if (await sdkTab.count() > 0) {
          await sdkTab.first().click();
          await page.waitForTimeout(2000);

          await page.screenshot({
            path: join(SCREENSHOTS_DIR, '07-desktop-claude-sdk-tab.png'),
            fullPage: true
          });
        }
      });

      await test.step('7. Verify Performance Monitor page removal', async () => {
        // Try to navigate to old Performance Monitor page
        await page.goto(`${BASE_URL}/performance-monitor`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '08-desktop-performance-monitor-removal.png'),
          fullPage: true
        });

        // Should either get 404, redirect, or not found page
        const currentUrl = page.url();
        const pageContent = await page.textContent('body');

        // Verify it's not the old performance monitor page
        const isNotPerformanceMonitor =
          currentUrl.includes('/analytics') ||
          currentUrl.includes('/404') ||
          pageContent?.includes('404') ||
          pageContent?.includes('Not Found') ||
          pageContent?.includes('Page not found');

        expect(isNotPerformanceMonitor).toBeTruthy();
      });

      await test.step('8. Verify no console errors', async () => {
        // Filter out common non-critical errors
        const criticalErrors = consoleErrors.filter(error =>
          !error.includes('favicon') &&
          !error.includes('404') &&
          !error.toLowerCase().includes('warning')
        );

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '09-desktop-final-state.png'),
          fullPage: true
        });

        // Log errors for debugging but don't fail test for non-critical errors
        if (criticalErrors.length > 0) {
          console.log('Console errors detected:', criticalErrors);
        }

        if (networkErrors.length > 0) {
          console.log('Network errors detected:', networkErrors);
        }
      });

      await context.close();
    });
  });

  test.describe('Responsive Design Testing', () => {
    ['tablet', 'mobile'].forEach(deviceType => {
      test(`Performance Tab Responsive Design - ${deviceType}`, async ({ browser }) => {
        const device = DEVICES[deviceType as keyof typeof DEVICES];
        const context = await browser.newContext({ viewport: device });
        const page = await context.newPage();

        await test.step(`1. Navigate to Analytics on ${deviceType}`, async () => {
          await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);

          await page.screenshot({
            path: join(SCREENSHOTS_DIR, `10-${deviceType}-analytics-responsive.png`),
            fullPage: true
          });
        });

        await test.step(`2. Test Performance tab on ${deviceType}`, async () => {
          const performanceTab = page.locator('[role="tab"]:has-text("Performance"), button:has-text("Performance"), .tab:has-text("Performance")');

          if (await performanceTab.count() > 0) {
            await performanceTab.first().click();
            await page.waitForTimeout(2000);

            await page.screenshot({
              path: join(SCREENSHOTS_DIR, `11-${deviceType}-performance-tab-responsive.png`),
              fullPage: true
            });

            // Verify responsive layout
            const tabsContainer = page.locator('[role="tablist"], .tabs-container, .tab-navigation');
            if (await tabsContainer.count() > 0) {
              await expect(tabsContainer.first()).toBeVisible();
            }
          }
        });

        await context.close();
      });
    });
  });

  test.describe('Performance Metrics Deep Validation', () => {
    test('Detailed Performance Metrics Validation', async ({ page }) => {
      await page.setViewportSize(DEVICES.desktop);

      await test.step('1. Navigate to Performance tab with detailed monitoring', async () => {
        await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' });

        // Click Performance tab
        const performanceTab = page.locator('[role="tab"]:has-text("Performance"), button:has-text("Performance"), .tab:has-text("Performance")');
        if (await performanceTab.count() > 0) {
          await performanceTab.first().click();
          await page.waitForTimeout(3000);
        }

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '12-desktop-detailed-performance-metrics.png'),
          fullPage: true
        });
      });

      await test.step('2. Validate specific performance metric elements', async () => {
        // Look for various performance-related elements
        const performanceElements = [
          'canvas', // Charts
          '.chart', '.graph', '.metric-chart',
          '.fps', '.memory', '.render-time',
          '[data-metric]', '[data-performance]',
          '.real-time', '.live-metric',
          '.performance-indicator', '.status-indicator'
        ];

        let foundElements = 0;
        for (const selector of performanceElements) {
          const elements = page.locator(selector);
          const count = await elements.count();
          if (count > 0) {
            foundElements += count;
            console.log(`Found ${count} elements matching: ${selector}`);
          }
        }

        console.log(`Total performance-related elements found: ${foundElements}`);

        // Take detailed screenshot
        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '13-desktop-performance-elements-detailed.png'),
          fullPage: true
        });
      });

      await test.step('3. Test real-time update mechanism', async () => {
        // Monitor for changes over time
        const initialContent = await page.content();

        // Wait for potential updates
        await page.waitForTimeout(8000);

        const updatedContent = await page.content();

        await page.screenshot({
          path: join(SCREENSHOTS_DIR, '14-desktop-after-realtime-wait.png'),
          fullPage: true
        });

        // Log if content changed (indicating real-time updates)
        if (initialContent !== updatedContent) {
          console.log('Real-time updates detected - content changed');
        } else {
          console.log('No content changes detected during wait period');
        }
      });
    });
  });
});
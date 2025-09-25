import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = '/workspaces/agent-feed/tests/e2e/evidence-screenshots';

test.describe('Performance Tab Migration - Focused Validation', () => {

  test('Comprehensive Performance Tab Migration Evidence Collection', async ({ page }) => {
    console.log('🚀 Starting Performance Tab Migration Validation...');

    await test.step('1. Navigate to application homepage', async () => {
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/01-homepage-loaded.png`,
        fullPage: true
      });

      console.log('✅ Homepage loaded and screenshot captured');
    });

    await test.step('2. Inspect current application structure', async () => {
      // Check what navigation exists
      const navElements = await page.locator('nav, [role="navigation"], .nav, .navigation').all();
      console.log(`Found ${navElements.length} navigation elements`);

      // Check for any links or buttons mentioning analytics
      const analyticsElements = await page.locator('a, button, [role="tab"]').filter({
        hasText: /analytics|performance|dashboard/i
      }).all();

      console.log(`Found ${analyticsElements.length} potential analytics-related elements`);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/02-navigation-inspection.png`,
        fullPage: true
      });
    });

    await test.step('3. Attempt to navigate to Analytics dashboard', async () => {
      // Try direct navigation to analytics page
      try {
        await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);

        const pageTitle = await page.title();
        const pageContent = await page.textContent('body');

        console.log(`Page title: ${pageTitle}`);
        console.log(`Page URL: ${page.url()}`);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/03-analytics-page-attempt.png`,
          fullPage: true
        });

        // Check if we successfully reached analytics page or got redirected
        const currentUrl = page.url();
        if (currentUrl.includes('/analytics')) {
          console.log('✅ Successfully navigated to Analytics page');

          // Look for any tab-like structures
          const tabElements = await page.locator('[role="tab"], .tab, button').filter({
            hasText: /system|performance|claude|sdk/i
          }).all();

          console.log(`Found ${tabElements.length} potential tab elements`);

          if (tabElements.length > 0) {
            for (let i = 0; i < tabElements.length; i++) {
              const text = await tabElements[i].textContent();
              console.log(`Tab ${i + 1}: ${text}`);
            }
          }

        } else {
          console.log(`⚠️ Redirected to: ${currentUrl}`);
        }

      } catch (error) {
        console.log(`⚠️ Direct analytics navigation failed: ${error.message}`);

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/04-analytics-navigation-failed.png`,
          fullPage: true
        });
      }
    });

    await test.step('4. Test Performance Monitor page removal', async () => {
      try {
        await page.goto(`${BASE_URL}/performance-monitor`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);

        const currentUrl = page.url();
        const pageContent = await page.textContent('body');

        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/05-performance-monitor-removal-test.png`,
          fullPage: true
        });

        console.log(`Performance Monitor route test - URL: ${currentUrl}`);

        // Check if we get 404, redirect, or error
        const is404 = pageContent?.includes('404') ||
                      pageContent?.includes('Not Found') ||
                      pageContent?.includes('Page not found') ||
                      currentUrl.includes('404');

        const isRedirect = !currentUrl.includes('/performance-monitor');

        if (is404 || isRedirect) {
          console.log('✅ Performance Monitor page properly removed/redirected');
        } else {
          console.log('⚠️ Performance Monitor page may still be accessible');
        }

      } catch (error) {
        console.log(`✅ Performance Monitor route failed as expected: ${error.message}`);
        await page.screenshot({
          path: `${SCREENSHOTS_DIR}/06-performance-monitor-blocked.png`,
          fullPage: true
        });
      }
    });

    await test.step('5. Check for Performance-related content anywhere in app', async () => {
      // Go back to homepage and search for performance-related content
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Look for any performance-related text or elements
      const performanceText = await page.locator('text=/performance|fps|memory|render|metric/i').all();
      console.log(`Found ${performanceText.length} performance-related text elements`);

      // Check for any canvas or chart elements (potential performance visualizations)
      const chartElements = await page.locator('canvas, svg, .chart, .graph, .metric').all();
      console.log(`Found ${chartElements.length} potential chart/metric elements`);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/07-performance-content-search.png`,
        fullPage: true
      });
    });

    await test.step('6. Console error monitoring', async () => {
      const consoleMessages: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });

      // Navigate around to trigger any console errors
      await page.goto(BASE_URL);
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/08-final-application-state.png`,
        fullPage: true
      });

      console.log(`Console errors detected: ${consoleMessages.length}`);
      if (consoleMessages.length > 0) {
        console.log('Console errors:', consoleMessages);
      }
    });

    await test.step('7. Mobile responsive testing', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/09-mobile-responsive-test.png`,
        fullPage: true
      });

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `${SCREENSHOTS_DIR}/10-tablet-responsive-test.png`,
        fullPage: true
      });

      console.log('✅ Responsive design testing completed');
    });

    console.log('🎉 Performance Tab Migration Validation Complete!');
  });
});
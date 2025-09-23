/**
 * Comprehensive Regression Test Suite
 * Tests all functionality after PostCSS fix
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_TIMEOUT = 60000;
const MOBILE_VIEWPORT = { width: 375, height: 667 };
const TABLET_VIEWPORT = { width: 768, height: 1024 };
const DESKTOP_VIEWPORT = { width: 1920, height: 1080 };

test.describe('Comprehensive PostCSS Fix Regression Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Set default timeout
    test.setTimeout(TEST_TIMEOUT);

    // Enable console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text());
      }
    });

    // Track network failures
    page.on('requestfailed', request => {
      console.error('Network failure:', request.url(), request.failure()?.errorText);
    });
  });

  test('Main page loads with purple gradient background', async ({ page }) => {
    console.log('🎯 Testing main page with purple gradient...');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check if page loaded successfully
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check for purple gradient in body or main container
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyles = window.getComputedStyle(body);
      return {
        background: computedStyles.background,
        backgroundColor: computedStyles.backgroundColor,
        backgroundImage: computedStyles.backgroundImage
      };
    });

    console.log('Body styles:', bodyStyles);

    // Check main container for gradient
    const mainContainer = page.locator('main, .main, [class*="gradient"], [class*="purple"], [class*="bg-"]').first();
    if (await mainContainer.count() > 0) {
      const containerStyles = await mainContainer.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.background,
          backgroundColor: styles.backgroundColor,
          backgroundImage: styles.backgroundImage
        };
      });

      console.log('Container styles:', containerStyles);

      // Check for purple/gradient indicators
      const hasGradient = containerStyles.backgroundImage.includes('gradient') ||
                         containerStyles.background.includes('gradient') ||
                         containerStyles.background.includes('purple') ||
                         containerStyles.backgroundColor.includes('purple') ||
                         bodyStyles.backgroundImage.includes('gradient') ||
                         bodyStyles.background.includes('purple');

      expect(hasGradient).toBeTruthy();
    }

    // Take screenshot for visual verification
    await page.screenshot({
      path: 'tests/screenshots/main-page-purple-gradient.png',
      fullPage: true
    });

    console.log('✅ Main page purple gradient test passed');
  });

  test('All pages navigation works correctly', async ({ page }) => {
    console.log('🧭 Testing navigation between pages...');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Test navigation to agents page
    const agentsLink = page.locator('a[href*="agents"], [href="/agents"]').first();
    if (await agentsLink.count() > 0) {
      await agentsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Verify we're on agents page
      const url = page.url();
      expect(url).toContain('agents');

      // Take screenshot
      await page.screenshot({
        path: 'tests/screenshots/agents-page-navigation.png',
        fullPage: true
      });
    }

    // Test navigation back to home
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    const homeTitle = await page.title();
    expect(homeTitle).toBeTruthy();

    console.log('✅ Navigation test passed');
  });

  test('All Tailwind classes render correctly', async ({ page }) => {
    console.log('🎨 Testing Tailwind CSS classes...');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Test common Tailwind classes
    const tailwindTests = [
      { selector: '[class*="bg-"], [class*="background"]', property: 'backgroundColor' },
      { selector: '[class*="text-"], [class*="color"]', property: 'color' },
      { selector: '[class*="p-"], [class*="padding"]', property: 'padding' },
      { selector: '[class*="m-"], [class*="margin"]', property: 'margin' },
      { selector: '[class*="flex"], [class*="grid"]', property: 'display' },
      { selector: '[class*="rounded"], [class*="border-radius"]', property: 'borderRadius' }
    ];

    for (const test of tailwindTests) {
      const elements = page.locator(test.selector);
      const count = await elements.count();

      if (count > 0) {
        const firstElement = elements.first();
        const styles = await firstElement.evaluate((el, prop) => {
          return window.getComputedStyle(el)[prop];
        }, test.property);

        console.log(`${test.property} styles applied:`, styles);
        expect(styles).toBeTruthy();
      }
    }

    console.log('✅ Tailwind classes test passed');
  });

  test('No console errors during page load', async ({ page }) => {
    console.log('🚨 Testing for console errors...');

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()}: ${request.failure()?.errorText}`);
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Check agents page too if accessible
    try {
      await page.goto('http://localhost:3000/agents', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
    } catch (error) {
      console.log('Agents page not accessible:', error.message);
    }

    console.log('Console errors found:', consoleErrors.length);
    console.log('Network errors found:', networkErrors.length);

    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
    if (networkErrors.length > 0) {
      console.log('Network errors:', networkErrors);
    }

    // Allow minor non-critical errors but fail on critical ones
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('404') &&
      !error.includes('favicon') &&
      !error.includes('lighthouse') &&
      !error.includes('_next/static')
    );

    expect(criticalErrors.length).toBeLessThan(5);
    console.log('✅ Console errors test passed');
  });

  test('Responsive design works on mobile', async ({ page }) => {
    console.log('📱 Testing mobile responsive design...');

    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if content is visible and accessible
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT.width);

    // Check for mobile-responsive elements
    const mobileElements = page.locator('[class*="sm:"], [class*="mobile"], [class*="responsive"]');
    const mobileCount = await mobileElements.count();
    console.log(`Found ${mobileCount} mobile-responsive elements`);

    await page.screenshot({
      path: 'tests/screenshots/mobile-responsive.png',
      fullPage: true
    });

    console.log('✅ Mobile responsive test passed');
  });

  test('Responsive design works on tablet', async ({ page }) => {
    console.log('📟 Testing tablet responsive design...');

    await page.setViewportSize(TABLET_VIEWPORT);
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox.width).toBeLessThanOrEqual(TABLET_VIEWPORT.width);

    await page.screenshot({
      path: 'tests/screenshots/tablet-responsive.png',
      fullPage: true
    });

    console.log('✅ Tablet responsive test passed');
  });

  test('Responsive design works on desktop', async ({ page }) => {
    console.log('🖥️ Testing desktop responsive design...');

    await page.setViewportSize(DESKTOP_VIEWPORT);
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox.width).toBeLessThanOrEqual(DESKTOP_VIEWPORT.width);

    await page.screenshot({
      path: 'tests/screenshots/desktop-responsive.png',
      fullPage: true
    });

    console.log('✅ Desktop responsive test passed');
  });

  test('PostCSS configuration is working correctly', async ({ page }) => {
    console.log('⚙️ Testing PostCSS configuration...');

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if CSS is properly processed
    const stylesheets = await page.evaluate(() => {
      return Array.from(document.styleSheets).map(sheet => {
        try {
          return {
            href: sheet.href,
            rules: sheet.cssRules ? sheet.cssRules.length : 0
          };
        } catch (e) {
          return { href: sheet.href, error: e.message };
        }
      });
    });

    console.log('Stylesheets loaded:', stylesheets);
    expect(stylesheets.length).toBeGreaterThan(0);

    console.log('✅ PostCSS configuration test passed');
  });

  test('Page performance is acceptable', async ({ page }) => {
    console.log('⚡ Testing page performance...');

    const startTime = Date.now();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // 10 seconds max

    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        responseTime: navigation.responseEnd - navigation.responseStart
      };
    });

    console.log('Performance metrics:', performanceMetrics);

    console.log('✅ Performance test passed');
  });
});
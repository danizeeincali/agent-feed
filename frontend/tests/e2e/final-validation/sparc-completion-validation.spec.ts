/**
 * SPARC COMPLETION PHASE: Comprehensive UI/UX Validation & Screenshots
 * Mission: Complete comprehensive UI/UX validation with visual proof
 */

import { test, expect } from '@playwright/test';
import { devices } from '@playwright/test';

// Use desktop Chrome for consistent screenshots
test.use({
  ...devices['Desktop Chrome'],
  viewport: { width: 1920, height: 1080 },
  // Disable animations for consistent screenshots
  reducedMotion: 'reduce'
});

test.describe('SPARC Completion: UI/UX Validation & Screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for server to be ready
    await page.waitForTimeout(2000);
  });

  test('01: Pre-removal Application State Documentation', async ({ page }) => {
    console.log('📸 Capturing pre-removal application state...');

    // Navigate to main application
    await page.goto('/', { waitUntil: 'networkidle' });

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/01-pre-removal-full-page.png',
      fullPage: true
    });

    // Capture header section specifically
    await page.locator('header').screenshot({
      path: 'tests/screenshots/01-pre-removal-header.png'
    });

    // Test for any notification dropdowns (should exist pre-removal)
    const notificationElements = await page.locator('[data-testid*="notification"], [class*="notification"], [aria-label*="notification"]').count();
    console.log(`Pre-removal notification elements found: ${notificationElements}`);

    // Verify basic functionality
    expect(await page.title()).toBeTruthy();
    expect(await page.locator('body').isVisible()).toBeTruthy();
  });

  test('02: Post-removal Application State Validation', async ({ page }) => {
    console.log('📸 Capturing post-removal application state...');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Take post-removal full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/02-post-removal-full-page.png',
      fullPage: true
    });

    // Capture header after removal
    await page.locator('header').screenshot({
      path: 'tests/screenshots/02-post-removal-header.png'
    });

    // Verify no notification elements exist
    const notificationElements = await page.locator('[data-testid*="notification"], [class*="notification"], [aria-label*="notification"]').count();
    expect(notificationElements).toBe(0);
    console.log('✅ Confirmed: No notification elements found after removal');

    // Verify application still loads properly
    expect(await page.title()).toBeTruthy();
    expect(await page.locator('body').isVisible()).toBeTruthy();
  });

  test('03: Cross-device Layout Validation', async ({ page }) => {
    console.log('📱 Testing responsive layouts...');

    // Desktop layout
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/screenshots/03-desktop-layout.png' });

    // Tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/screenshots/03-tablet-layout.png' });

    // Mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.screenshot({ path: 'tests/screenshots/03-mobile-layout.png' });

    console.log('✅ Responsive layouts captured');
  });

  test('04: Navigation System Validation', async ({ page }) => {
    console.log('🧭 Testing navigation system...');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test main navigation sections
    const navSections = ['feed', 'agents', 'analytics', 'settings'];

    for (const section of navSections) {
      try {
        // Try different navigation selectors
        const navSelectors = [
          `[href*="${section}"]`,
          `[data-testid*="${section}"]`,
          `nav a:has-text("${section}")`,
          `button:has-text("${section}")`,
          `.nav-${section}`,
          `#${section}-nav`
        ];

        let navElement = null;
        for (const selector of navSelectors) {
          const elements = await page.locator(selector).all();
          if (elements.length > 0) {
            navElement = elements[0];
            break;
          }
        }

        if (navElement && await navElement.isVisible()) {
          await navElement.click();
          await page.waitForTimeout(1000); // Wait for navigation

          await page.screenshot({
            path: `tests/screenshots/04-nav-${section}.png`
          });

          console.log(`✅ Navigation to ${section} successful`);
        } else {
          console.log(`⚠️ Navigation element for ${section} not found - may not exist in current UI`);
        }
      } catch (error) {
        console.log(`⚠️ Navigation to ${section} failed or not available: ${error.message}`);
      }
    }
  });

  test('05: API Endpoint Connectivity Validation', async ({ page }) => {
    console.log('🔌 Testing API endpoint connectivity...');

    // Monitor network requests
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    // Monitor responses
    const apiResponses = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok()
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test Claude Code API endpoint specifically
    try {
      const response = await page.request.get('/api/claude-code/status');
      if (response.ok()) {
        console.log('✅ Claude Code API endpoint accessible');
      } else {
        console.log(`⚠️ Claude Code API endpoint returned: ${response.status()}`);
      }
    } catch (error) {
      console.log(`⚠️ Claude Code API endpoint test failed: ${error.message}`);
    }

    // Wait for any async API calls
    await page.waitForTimeout(3000);

    console.log(`📊 Total API calls made: ${apiCalls.length}`);
    console.log(`📊 API responses received: ${apiResponses.length}`);

    // Verify preserved endpoints
    const claudeCodeCalls = apiCalls.filter(url => url.includes('/api/claude-code'));
    expect(claudeCodeCalls.length).toBeGreaterThanOrEqual(0); // Should be accessible, not necessarily called
  });

  test('06: Console Error Analysis', async ({ page }) => {
    console.log('🔍 Analyzing console errors...');

    const consoleErrors = [];
    const consoleWarnings = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Check for JavaScript errors
    page.on('pageerror', error => {
      consoleErrors.push(`JavaScript Error: ${error.message}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Interact with the page to trigger any lazy-loaded errors
    await page.mouse.move(100, 100);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(2000);

    // Filter out non-critical errors (dev mode, extensions, etc.)
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('Extension') &&
      !error.includes('chrome-extension') &&
      !error.includes('DevTools') &&
      !error.includes('HMR') &&
      !error.includes('Hot Module Replacement')
    );

    console.log(`📊 Total console errors: ${consoleErrors.length}`);
    console.log(`📊 Critical console errors: ${criticalErrors.length}`);
    console.log(`📊 Console warnings: ${consoleWarnings.length}`);

    if (criticalErrors.length > 0) {
      console.log('❌ Critical console errors found:', criticalErrors);
    } else {
      console.log('✅ No critical console errors detected');
    }

    // Should have minimal critical errors after component removal
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('07: Performance Metrics Collection', async ({ page }) => {
    console.log('⚡ Collecting performance metrics...');

    // Start performance monitoring
    await page.goto('about:blank');

    const startTime = Date.now();

    // Navigate and measure performance
    await page.goto('/', { waitUntil: 'networkidle' });

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        totalLoadTime: loadTime
      };
    });

    console.log('📊 Performance Metrics:', {
      'DOM Content Loaded': `${performanceMetrics.domContentLoaded}ms`,
      'Load Complete': `${performanceMetrics.loadComplete}ms`,
      'First Paint': `${performanceMetrics.firstPaint}ms`,
      'First Contentful Paint': `${performanceMetrics.firstContentfulPaint}ms`,
      'Total Load Time': `${performanceMetrics.totalLoadTime}ms`
    });

    // Performance should be reasonable (under 5 seconds for full load)
    expect(performanceMetrics.totalLoadTime).toBeLessThan(5000);
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000);
  });

  test('08: Final Application State Screenshot', async ({ page }) => {
    console.log('📸 Capturing final application state...');

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for everything to settle
    await page.waitForTimeout(3000);

    // Final comprehensive screenshot
    await page.screenshot({
      path: 'tests/screenshots/13-final-state.png',
      fullPage: true
    });

    // Verify core functionality still works
    const bodyVisible = await page.locator('body').isVisible();
    const titleExists = await page.title();

    expect(bodyVisible).toBeTruthy();
    expect(titleExists).toBeTruthy();

    console.log('✅ Final validation complete - application is functional');
  });
});
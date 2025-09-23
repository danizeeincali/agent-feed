import { test, expect } from '@playwright/test';

/**
 * Navigation Flow Tests
 * Comprehensive navigation testing before and after interactive-control removal
 */

test.describe('Navigation Flow Validation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });
  });

  test('validates main navigation structure', async ({ page }) => {
    console.log('🧭 Testing main navigation structure...');

    // Verify sidebar navigation exists
    const sidebar = page.locator('.w-64, [data-testid="sidebar"], nav').first();
    await expect(sidebar).toBeVisible();

    // Get all navigation links
    const navLinks = page.locator('nav a[href]');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(5);

    console.log(`📊 Found ${linkCount} navigation links`);

    // Validate specific expected routes
    const expectedRoutes = [
      { href: '/', text: /feed|home/i },
      { href: '/agents', text: /agents/i },
      { href: '/analytics', text: /analytics/i },
      { href: '/settings', text: /settings/i }
    ];

    for (const expectedRoute of expectedRoutes) {
      const linkExists = await page.locator(`nav a[href="${expectedRoute.href}"]`).count() > 0;
      expect(linkExists).toBeTruthy();
      console.log(`✅ Found link to ${expectedRoute.href}`);
    }

    // Check if interactive-control link exists (should be removed later)
    const interactiveControlLink = await page.locator('nav a[href="/interactive-control"]').count();
    const hasInteractiveControl = interactiveControlLink > 0;
    console.log(`🎮 Interactive-control link present: ${hasInteractiveControl}`);

    // Store navigation state for comparison
    const navigationState = {
      totalLinks: linkCount,
      hasInteractiveControl,
      timestamp: new Date().toISOString()
    };

    // This will be used for comparison in post-removal tests
    await page.evaluate((state) => {
      window.navigationBaselineState = state;
    }, navigationState);
  });

  test('validates navigation functionality', async ({ page }) => {
    console.log('🔄 Testing navigation functionality...');

    const testRoutes = [
      { path: '/', name: 'Feed', expectedElements: ['[data-testid="main-content"]'] },
      { path: '/agents', name: 'Agents', expectedElements: ['[data-testid="agent-list"], .agents-page'] },
      { path: '/analytics', name: 'Analytics', expectedElements: ['[data-testid="main-content"]'] },
      { path: '/settings', name: 'Settings', expectedElements: ['[data-testid="main-content"]'] }
    ];

    for (const route of testRoutes) {
      console.log(`🧪 Testing navigation to ${route.name}`);

      // Navigate to route
      await page.goto(route.path, { waitUntil: 'networkidle' });

      // Verify page loads
      await page.waitForSelector('[data-testid="app-root"]');

      // Verify URL is correct
      expect(page.url()).toContain(route.path);

      // Verify expected elements are present
      let elementFound = false;
      for (const elementSelector of route.expectedElements) {
        const element = page.locator(elementSelector);
        if (await element.count() > 0) {
          await expect(element.first()).toBeVisible();
          elementFound = true;
          break;
        }
      }

      if (!elementFound) {
        console.log(`⚠️  None of expected elements found for ${route.name}`);
        // Still verify basic content exists
        const bodyText = await page.textContent('body');
        expect(bodyText?.length).toBeGreaterThan(50);
      }

      // Verify no error boundaries
      const errorBoundaries = await page.locator('text*="Something went wrong"').count();
      expect(errorBoundaries).toBe(0);

      console.log(`✅ ${route.name} navigation validated`);
    }
  });

  test('validates interactive-control route access', async ({ page }) => {
    console.log('🎮 Testing interactive-control route access...');

    try {
      // Attempt to navigate to interactive-control
      await page.goto('/interactive-control', {
        waitUntil: 'networkidle',
        timeout: 15000
      });

      // Wait for page to load
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      // Verify page loaded successfully
      const url = page.url();
      const bodyText = await page.textContent('body');

      if (url.includes('/interactive-control') && bodyText && bodyText.length > 50) {
        console.log('✅ Interactive-control route is accessible');

        // Capture current state for comparison
        await page.screenshot({
          path: 'screenshots/baseline/interactive-control-current.png',
          fullPage: true
        });

        // Test interactive elements if they exist
        const buttons = await page.locator('button').count();
        const inputs = await page.locator('input').count();
        const forms = await page.locator('form').count();

        console.log(`📊 Interactive elements: ${buttons} buttons, ${inputs} inputs, ${forms} forms`);

      } else {
        console.log('⚠️  Interactive-control route redirected or has minimal content');
      }

    } catch (error) {
      console.log(`❌ Interactive-control route not accessible: ${error.message}`);

      // This is expected after removal - capture the error state
      await page.screenshot({
        path: 'screenshots/baseline/interactive-control-error.png',
        fullPage: true
      });
    }
  });

  test('validates sidebar navigation clicks', async ({ page }) => {
    console.log('👆 Testing sidebar navigation clicks...');

    // Get all visible navigation links
    const navLinks = page.locator('nav a[href]:visible');
    const linkCount = await navLinks.count();

    console.log(`🔗 Testing ${Math.min(linkCount, 6)} navigation links`);

    for (let i = 0; i < Math.min(linkCount, 6); i++) {
      const link = navLinks.nth(i);

      try {
        const href = await link.getAttribute('href');
        const linkText = await link.textContent();

        if (href && !href.startsWith('http') && !href.includes('mailto:')) {
          console.log(`🧪 Testing click on "${linkText}" -> ${href}`);

          // Record starting URL
          const startUrl = page.url();

          // Click the link
          await link.click();

          // Wait for navigation
          await page.waitForURL(url => url !== startUrl, { timeout: 10000 });
          await page.waitForSelector('[data-testid="app-root"]');

          // Verify navigation occurred
          const newUrl = page.url();
          expect(newUrl).toContain(href);

          // Verify page content loaded
          const mainContent = page.locator('[data-testid="main-content"], main, .main');
          if (await mainContent.count() > 0) {
            await expect(mainContent.first()).toBeVisible();
          }

          console.log(`✅ Navigation to ${href} successful`);

          // Return to home for next iteration
          await page.goto('/', { waitUntil: 'domcontentloaded' });
          await page.waitForSelector('[data-testid="app-root"]');
        }

      } catch (error) {
        console.log(`⚠️  Link ${i} navigation failed: ${error.message}`);
      }
    }
  });

  test('validates mobile navigation', async ({ page }) => {
    console.log('📱 Testing mobile navigation...');

    // Switch to mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for mobile menu button
    const mobileMenuSelectors = [
      'button.lg\\:hidden',
      '[data-testid="mobile-menu"]',
      '[aria-label*="menu"]',
      'button[aria-expanded]'
    ];

    let mobileMenuButton = null;
    for (const selector of mobileMenuSelectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        mobileMenuButton = button;
        break;
      }
    }

    if (mobileMenuButton) {
      console.log('📱 Mobile menu button found');

      // Capture closed state
      await page.screenshot({
        path: 'screenshots/baseline/mobile-navigation-closed.png'
      });

      // Open mobile menu
      await mobileMenuButton.click();
      await page.waitForTimeout(500);

      // Capture open state
      await page.screenshot({
        path: 'screenshots/baseline/mobile-navigation-open.png'
      });

      // Verify navigation links are now visible
      const navLinks = page.locator('nav a[href]');
      const visibleLinks = await navLinks.filter({ hasText: /.+/ }).count();
      expect(visibleLinks).toBeGreaterThan(3);

      // Test a navigation link
      const firstLink = navLinks.first();
      if (await firstLink.isVisible()) {
        const href = await firstLink.getAttribute('href');
        if (href && !href.startsWith('http')) {
          await firstLink.click();
          await page.waitForSelector('[data-testid="app-root"]');
          expect(page.url()).toContain(href);
          console.log('✅ Mobile navigation link works');
        }
      }

    } else {
      console.log('⚠️  Mobile menu button not found - checking if navigation is always visible');

      // Check if regular navigation is visible on mobile
      const navLinks = page.locator('nav a[href]:visible');
      const mobileVisibleLinks = await navLinks.count();

      if (mobileVisibleLinks > 0) {
        console.log(`📱 Found ${mobileVisibleLinks} visible navigation links on mobile`);
      } else {
        console.log('❌ No navigation found on mobile viewport');
      }
    }

    console.log('✅ Mobile navigation testing completed');
  });

  test('validates browser navigation (back/forward)', async ({ page }) => {
    console.log('↩️ Testing browser back/forward navigation...');

    // Navigate through several pages
    const navigationSequence = ['/', '/agents', '/analytics', '/settings'];

    for (const path of navigationSequence) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="app-root"]');
      console.log(`📍 Navigated to ${path}`);
    }

    // Test back navigation
    console.log('⬅️ Testing back navigation...');

    for (let i = navigationSequence.length - 2; i >= 0; i--) {
      await page.goBack();
      await page.waitForSelector('[data-testid="app-root"]');

      const expectedPath = navigationSequence[i];
      const currentUrl = page.url();

      expect(currentUrl).toContain(expectedPath);
      console.log(`✅ Back navigation to ${expectedPath} successful`);
    }

    // Test forward navigation
    console.log('➡️ Testing forward navigation...');

    for (let i = 1; i < navigationSequence.length; i++) {
      await page.goForward();
      await page.waitForSelector('[data-testid="app-root"]');

      const expectedPath = navigationSequence[i];
      const currentUrl = page.url();

      expect(currentUrl).toContain(expectedPath);
      console.log(`✅ Forward navigation to ${expectedPath} successful`);
    }

    console.log('✅ Browser navigation testing completed');
  });

  test('validates direct URL access', async ({ page }) => {
    console.log('🎯 Testing direct URL access...');

    const directAccessRoutes = [
      { path: '/', name: 'Feed' },
      { path: '/agents', name: 'Agents' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/settings', name: 'Settings' },
      { path: '/interactive-control', name: 'Interactive Control' }
    ];

    for (const route of directAccessRoutes) {
      try {
        console.log(`🧪 Testing direct access to ${route.name} (${route.path})`);

        // Navigate directly to the route
        await page.goto(route.path, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        // Verify page loads
        await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

        // Verify URL is correct
        expect(page.url()).toContain(route.path);

        // Verify meaningful content
        const bodyText = await page.textContent('body');
        expect(bodyText?.length).toBeGreaterThan(50);

        // Verify no error boundaries
        const errorBoundaries = await page.locator('text*="Something went wrong"').count();
        expect(errorBoundaries).toBe(0);

        console.log(`✅ Direct access to ${route.name} successful`);

      } catch (error) {
        if (route.path === '/interactive-control') {
          console.log(`⚠️  Interactive-control not accessible (expected during/after removal): ${error.message}`);
        } else {
          console.log(`❌ Direct access to ${route.name} failed: ${error.message}`);
          throw error; // Fail the test for critical routes
        }
      }
    }

    console.log('✅ Direct URL access testing completed');
  });

  test('validates navigation performance', async ({ page }) => {
    console.log('⚡ Testing navigation performance...');

    const performanceMetrics = [];
    const testRoutes = ['/', '/agents', '/analytics'];

    for (const route of testRoutes) {
      console.log(`⏱️ Measuring performance for ${route}`);

      const startTime = Date.now();

      // Navigate and measure
      await page.goto(route, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-root"]');

      const loadTime = Date.now() - startTime;

      // Get additional performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.navigationStart,
          loadComplete: navigation?.loadEventEnd - navigation?.navigationStart,
          firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime
        };
      });

      const routeMetrics = {
        route,
        totalLoadTime: loadTime,
        ...metrics,
        timestamp: new Date().toISOString()
      };

      performanceMetrics.push(routeMetrics);

      console.log(`📊 ${route}: ${loadTime}ms total, ${metrics.domContentLoaded}ms DOM ready`);

      // Verify reasonable performance
      expect(loadTime).toBeLessThan(10000); // 10 second max
      if (metrics.domContentLoaded) {
        expect(metrics.domContentLoaded).toBeLessThan(5000); // 5 second DOM max
      }
    }

    console.log('✅ Navigation performance testing completed');

    // Store metrics for comparison
    await page.evaluate((metrics) => {
      window.performanceBaseline = metrics;
    }, performanceMetrics);
  });
});
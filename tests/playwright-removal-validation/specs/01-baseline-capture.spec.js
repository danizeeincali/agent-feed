import { test, expect } from '@playwright/test';

/**
 * Baseline Capture Tests
 * Captures comprehensive UI state before interactive-control removal
 */

test.describe('Baseline UI/UX Capture', () => {

  test.beforeEach(async ({ page }) => {
    // Ensure clean state for each test
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });
  });

  test('captures baseline feed page with Avi DM section', async ({ page }) => {
    console.log('📸 Capturing baseline feed page...');

    // Navigate to feed and wait for full load
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]');

    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);

    // Verify Avi DM section is present and functional
    const aviDMSection = page.locator('[data-testid="avi-dm-section"]');
    if (await aviDMSection.count() > 0) {
      await expect(aviDMSection).toBeVisible();
      console.log('✅ Avi DM section detected and visible');
    } else {
      console.log('ℹ️  Avi DM section not found - checking for alternative selectors');

      // Look for alternative DM indicators
      const dmIndicators = [
        'text*="Direct Message"',
        'text*="DM"',
        'text*="Avi"',
        '[class*="dm"]',
        '[id*="dm"]'
      ];

      for (const indicator of dmIndicators) {
        const element = page.locator(indicator);
        if (await element.count() > 0) {
          console.log(`✅ Found DM indicator: ${indicator}`);
          break;
        }
      }
    }

    // Capture full page screenshot
    await page.screenshot({
      path: `screenshots/baseline/feed-full-page.png`,
      fullPage: true
    });

    // Capture viewport screenshot
    await page.screenshot({
      path: `screenshots/baseline/feed-viewport.png`,
      fullPage: false
    });

    console.log('📸 Feed page baseline captured');
  });

  test('captures interactive-control page baseline', async ({ page }) => {
    console.log('📸 Capturing interactive-control page baseline...');

    try {
      await page.goto('/interactive-control', { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-root"]');

      // Wait for page to fully render
      await page.waitForTimeout(2000);

      // Capture screenshots
      await page.screenshot({
        path: `screenshots/baseline/interactive-control-full.png`,
        fullPage: true
      });

      await page.screenshot({
        path: `screenshots/baseline/interactive-control-viewport.png`,
        fullPage: false
      });

      // Document interactive elements
      const interactiveElements = await page.locator('button, input, select, textarea, [role="button"]').count();
      console.log(`📊 Found ${interactiveElements} interactive elements`);

      // Check for specific interactive-control features
      const controlFeatures = [
        '[data-testid*="control"]',
        '[class*="interactive"]',
        '[class*="control"]',
        'button[type="submit"]',
        'input[type="text"]'
      ];

      const featureCount = {};
      for (const feature of controlFeatures) {
        const count = await page.locator(feature).count();
        if (count > 0) {
          featureCount[feature] = count;
        }
      }

      console.log('🎮 Interactive control features:', featureCount);
      console.log('✅ Interactive-control page baseline captured');

    } catch (error) {
      console.log('⚠️  Interactive-control page not accessible:', error.message);

      // Capture error state
      await page.screenshot({
        path: `screenshots/baseline/interactive-control-error.png`,
        fullPage: true
      });
    }
  });

  test('captures navigation baseline', async ({ page }) => {
    console.log('📸 Capturing navigation baseline...');

    // Capture main navigation
    const sidebar = page.locator('.w-64, [data-testid="sidebar"], nav');
    if (await sidebar.count() > 0) {
      await sidebar.first().screenshot({
        path: `screenshots/baseline/navigation-sidebar.png`
      });
    }

    // Test all navigation links
    const navLinks = page.locator('nav a[href]');
    const linkCount = await navLinks.count();
    console.log(`🔗 Found ${linkCount} navigation links`);

    const navigationMap = [];
    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();

      if (href) {
        navigationMap.push({
          href,
          text: text?.trim(),
          visible: await link.isVisible()
        });
      }
    }

    console.log('🗺️  Navigation map:', navigationMap);

    // Capture mobile navigation if present
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    const mobileMenuButton = page.locator('button.lg\\:hidden, [data-testid="mobile-menu"]');
    if (await mobileMenuButton.count() > 0) {
      await page.screenshot({
        path: `screenshots/baseline/navigation-mobile-closed.png`
      });

      await mobileMenuButton.first().click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `screenshots/baseline/navigation-mobile-open.png`
      });
    }

    console.log('✅ Navigation baseline captured');
  });

  test('captures responsive design baseline', async ({ page }) => {
    console.log('📸 Capturing responsive design baseline...');

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1280, height: 720, name: 'desktop-standard' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
      { width: 320, height: 568, name: 'mobile-small' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height
      });

      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `screenshots/baseline/responsive-${viewport.name}.png`,
        fullPage: false
      });

      console.log(`📱 Captured ${viewport.name} (${viewport.width}x${viewport.height})`);
    }

    console.log('✅ Responsive design baseline captured');
  });

  test('captures component interaction baseline', async ({ page }) => {
    console.log('📸 Capturing component interaction baseline...');

    // Test common interactive elements
    const interactiveSelectors = [
      'button:not([disabled])',
      'input[type="text"]',
      'input[type="search"]',
      'select',
      '[role="button"]',
      'a[href]'
    ];

    for (const selector of interactiveSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      if (count > 0) {
        console.log(`🎯 Found ${count} ${selector} elements`);

        // Test first few elements
        for (let i = 0; i < Math.min(count, 3); i++) {
          const element = elements.nth(i);
          if (await element.isVisible()) {
            // Hover to show interaction state
            await element.hover();
            await page.waitForTimeout(200);

            await page.screenshot({
              path: `screenshots/baseline/interaction-${selector.replace(/[^a-zA-Z0-9]/g, '-')}-${i}.png`,
              clip: await element.boundingBox()
            });
          }
        }
      }
    }

    console.log('✅ Component interaction baseline captured');
  });

  test('validates current route accessibility', async ({ page }) => {
    console.log('🔍 Validating route accessibility...');

    const routes = [
      { path: '/', name: 'feed', critical: true },
      { path: '/interactive-control', name: 'interactive-control', critical: false },
      { path: '/agents', name: 'agents', critical: true },
      { path: '/analytics', name: 'analytics', critical: true },
      { path: '/settings', name: 'settings', critical: true },
      { path: '/workflows', name: 'workflows', critical: true }
    ];

    const accessibilityResults = [];

    for (const route of routes) {
      try {
        console.log(`🧪 Testing ${route.name} at ${route.path}`);

        await page.goto(route.path, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        // Wait for main content
        await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

        // Verify no error boundaries
        const errorBoundaries = await page.locator('text*="Something went wrong"').count();
        const hasError = errorBoundaries > 0;

        // Verify meaningful content
        const bodyText = await page.textContent('body');
        const hasContent = bodyText && bodyText.length > 50;

        // Verify main content area
        const mainContent = page.locator('[data-testid="main-content"], main, .main');
        const hasMainContent = await mainContent.count() > 0;

        const result = {
          path: route.path,
          name: route.name,
          accessible: !hasError && hasContent,
          critical: route.critical,
          errorBoundaries: errorBoundaries,
          contentLength: bodyText?.length || 0,
          hasMainContent,
          timestamp: new Date().toISOString()
        };

        accessibilityResults.push(result);

        if (result.accessible) {
          console.log(`✅ ${route.name} is accessible`);
        } else {
          console.log(`❌ ${route.name} has accessibility issues`);
          if (route.critical) {
            console.log(`🚨 CRITICAL: ${route.name} is critical and must be functional`);
          }
        }

      } catch (error) {
        console.log(`⚠️  ${route.name} failed to load: ${error.message}`);
        accessibilityResults.push({
          path: route.path,
          name: route.name,
          accessible: false,
          critical: route.critical,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Verify critical routes are accessible
    const criticalIssues = accessibilityResults.filter(r =>
      r.critical && !r.accessible
    );

    expect(criticalIssues.length).toBe(0);

    console.log('✅ Route accessibility validation completed');
  });
});
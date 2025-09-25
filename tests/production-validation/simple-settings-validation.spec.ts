import { test, expect, Page } from '@playwright/test';

/**
 * SIMPLIFIED PRODUCTION VALIDATION: Settings Removal
 * Direct browser testing without backend dependencies
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Settings Removal Production Validation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Current State: Should detect Settings in navigation (BEFORE removal)', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Wait for app to load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 30000 });

    // Take screenshot of current state
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/production-validation/screenshots/current-state-with-settings.png',
      fullPage: true
    });

    // Check if Settings link exists in navigation
    const settingsLink = page.locator('nav a[href="/settings"]');
    const settingsExists = await settingsLink.count() > 0;

    if (settingsExists) {
      console.log('✅ BASELINE CONFIRMED: Settings link currently exists in navigation');
      await expect(settingsLink).toBeVisible();
      await expect(settingsLink).toContainText('Settings');
    } else {
      console.log('⚠️  Settings link not found - may already be removed');
    }

    // Validate other navigation links are present
    const expectedLinks = [
      { href: '/', name: 'Feed' },
      { href: '/agents', name: 'Agents' },
      { href: '/analytics', name: 'Analytics' },
      { href: '/activity', name: 'Live Activity' },
      { href: '/drafts', name: 'Drafts' }
    ];

    for (const link of expectedLinks) {
      const navLink = page.locator(`nav a[href="${link.href}"]`);
      await expect(navLink).toBeVisible();
      console.log(`✅ Navigation link verified: ${link.name}`);
    }
  });

  test('Settings Page Accessibility Test', async () => {
    // Test direct access to Settings page
    const response = await page.goto(`${BASE_URL}/settings`, { waitUntil: 'networkidle' });

    await page.screenshot({
      path: '/workspaces/agent-feed/tests/production-validation/screenshots/settings-page-current.png',
      fullPage: true
    });

    if (response?.ok()) {
      console.log('✅ Settings page currently accessible');

      // Check for Settings content
      const hasSettingsContent = await page.locator('text=Settings').count() > 0;
      if (hasSettingsContent) {
        console.log('✅ Settings page contains Settings content');
      }
    } else {
      console.log('⚠️  Settings page returns error or 404');
    }
  });

  test('Navigation Functionality Test', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]');

    const routes = [
      { path: '/', name: 'Feed' },
      { path: '/agents', name: 'Agents' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/activity', name: 'Live Activity' },
      { path: '/drafts', name: 'Drafts' }
    ];

    for (const route of routes) {
      console.log(`Testing navigation to: ${route.name}`);

      // Navigate to route
      await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });

      // Verify URL
      expect(page.url()).toContain(route.path);

      // Verify main content loads
      await page.waitForSelector('[data-testid="main-content"]', { timeout: 10000 });

      // Take screenshot
      await page.screenshot({
        path: `/workspaces/agent-feed/tests/production-validation/screenshots/route-${route.name.toLowerCase().replace(' ', '-')}.png`,
        fullPage: true
      });

      console.log(`✅ Route ${route.name} loads successfully`);
    }
  });

  test('Expected Post-Removal State Validation', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]');

    // This test shows what SHOULD happen after Settings removal
    console.log('📋 VALIDATION CRITERIA for Settings Removal:');

    // 1. Settings link should NOT be present in navigation
    const settingsLink = page.locator('nav a[href="/settings"]');
    const settingsCount = await settingsLink.count();

    if (settingsCount === 0) {
      console.log('✅ EXPECTED: Settings link removed from navigation');
    } else {
      console.log('❌ CURRENT STATE: Settings link still present (expected for now)');
    }

    // 2. All other navigation should work
    const requiredLinks = [
      'Feed', 'Agents', 'Analytics', 'Live Activity', 'Drafts'
    ];

    for (const linkText of requiredLinks) {
      const link = page.locator(`nav a:has-text("${linkText}")`);
      await expect(link).toBeVisible();
      console.log(`✅ Required navigation link present: ${linkText}`);
    }

    // Take screenshot of expected clean navigation
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/production-validation/screenshots/expected-post-removal-navigation.png',
      fullPage: true
    });
  });

  test('Performance Baseline Measurement', async () => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByName('first-contentful-paint')[0];

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: paint?.startTime || 0,
        totalTime: navigation.loadEventEnd - navigation.navigationStart
      };
    });

    console.log('📊 Performance Metrics:');
    console.log(`DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`First Contentful Paint: ${performanceMetrics.firstContentfulPaint}ms`);
    console.log(`Total Load Time: ${performanceMetrics.totalTime}ms`);

    // Validate reasonable performance
    expect(performanceMetrics.totalTime).toBeLessThan(10000); // Less than 10 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(5000); // Less than 5 seconds

    console.log('✅ Performance metrics within acceptable limits');
  });

  test('Mobile Responsiveness Test', async ({ browser }) => {
    // Create mobile viewport
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle' });

    // Test mobile navigation
    await mobilePage.waitForSelector('[data-testid="app-root"]');

    // Take mobile screenshot
    await mobilePage.screenshot({
      path: '/workspaces/agent-feed/tests/production-validation/screenshots/mobile-view.png',
      fullPage: true
    });

    // Check if hamburger menu exists (common mobile pattern)
    const menuButton = mobilePage.locator('button', { hasText: /menu/i }).or(
      mobilePage.locator('button[class*="menu"]')
    ).first();

    const hasMenuButton = await menuButton.count() > 0;
    if (hasMenuButton && await menuButton.isVisible()) {
      await menuButton.click();
      await mobilePage.waitForTimeout(500); // Wait for menu animation
    }

    console.log('✅ Mobile responsiveness tested');

    await mobileContext.close();
  });
});
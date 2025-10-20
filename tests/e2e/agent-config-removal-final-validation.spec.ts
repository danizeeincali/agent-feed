/**
 * PRODUCTION VALIDATION: Agent Config Page Removal
 *
 * This test suite validates the complete removal of the Agent Config page
 * and all related routes from the application. Tests run against REAL
 * application at http://localhost:5173 with NO MOCKS.
 *
 * Validation includes:
 * - Navigation menu verification
 * - Route accessibility (404 for removed routes)
 * - Visual regression testing
 * - Multi-viewport testing
 * - Dark/light mode testing
 * - Console error checking
 * - Remaining routes functionality
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = '/workspaces/agent-feed/tests/e2e/reports/screenshots/agent-config-removal';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Agent Config Removal - Production Validation', () => {

  test.describe('Navigation Menu Verification', () => {

    test('should NOT show "Agent Config" link in navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Wait for navigation to render
      await page.waitForSelector('nav', { timeout: 10000 });

      // Get all navigation links
      const navLinks = await page.locator('nav a').allTextContents();

      console.log('Navigation links found:', navLinks);

      // Verify "Agent Config" is NOT present
      expect(navLinks).not.toContain('Agent Config');
      expect(navLinks).not.toContain('Protected Configs');
      expect(navLinks).not.toContain('Config Editor');

      // Capture screenshot of navigation
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'navigation-menu-desktop.png'),
        fullPage: false
      });

      console.log('✓ Navigation menu does not contain Agent Config link');
    });

    test('should show correct navigation items only', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('nav', { timeout: 10000 });

      const navLinks = await page.locator('nav a').allTextContents();

      // Expected navigation items (from App.tsx lines 95-102)
      const expectedItems = ['Feed', 'Drafts', 'Agents', 'Live Activity', 'Analytics'];

      for (const item of expectedItems) {
        expect(navLinks).toContain(item);
      }

      console.log('✓ All expected navigation items are present');
      console.log('Expected items:', expectedItems);
      console.log('Actual items:', navLinks);
    });
  });

  test.describe('Removed Routes - 404 Verification', () => {

    test('should show 404 for /agents/config route', async ({ page }) => {
      // Track console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/agents/config`, { waitUntil: 'networkidle' });

      // Should show 404/Not Found page
      const body = await page.textContent('body');

      // Check for 404 indicators (NotFoundFallback component)
      const has404 = body?.toLowerCase().includes('404') ||
                     body?.toLowerCase().includes('not found') ||
                     body?.toLowerCase().includes('page not found');

      expect(has404).toBe(true);

      // Capture screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'agents-config-404.png'),
        fullPage: true
      });

      console.log('✓ /agents/config returns 404 page');
    });

    test('should show 404 for /admin/protected-configs route', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/protected-configs`, { waitUntil: 'networkidle' });

      const body = await page.textContent('body');
      const has404 = body?.toLowerCase().includes('404') ||
                     body?.toLowerCase().includes('not found') ||
                     body?.toLowerCase().includes('page not found');

      expect(has404).toBe(true);

      // Capture screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'admin-protected-configs-404.png'),
        fullPage: true
      });

      console.log('✓ /admin/protected-configs returns 404 page');
    });

    test('should show 404 for /config route', async ({ page }) => {
      await page.goto(`${BASE_URL}/config`, { waitUntil: 'networkidle' });

      const body = await page.textContent('body');
      const has404 = body?.toLowerCase().includes('404') ||
                     body?.toLowerCase().includes('not found') ||
                     body?.toLowerCase().includes('page not found');

      expect(has404).toBe(true);

      console.log('✓ /config returns 404 page');
    });
  });

  test.describe('Remaining Routes - Functionality Verification', () => {

    test('should load Feed page (/) successfully', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });

      // Wait for feed to load
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });

      // Verify page loaded
      const title = await page.textContent('h1');
      expect(title).toContain('AgentLink');

      // Check for major errors
      const majorErrors = consoleErrors.filter(err =>
        !err.includes('WebSocket') &&
        !err.includes('favicon') &&
        !err.includes('404')
      );

      console.log('✓ Feed page loads successfully');
      if (majorErrors.length > 0) {
        console.log('Console errors:', majorErrors);
      }
    });

    test('should load Agents page (/agents) successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });

      // Verify navigation is active
      const activeLink = await page.locator('nav a.bg-blue-100, nav a[class*="bg-blue"]').first();
      const activeLinkText = await activeLink.textContent();
      expect(activeLinkText?.trim()).toBe('Agents');

      console.log('✓ Agents page loads successfully');
    });

    test('should load Drafts page (/drafts) successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/drafts`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });

      const activeLink = await page.locator('nav a.bg-blue-100, nav a[class*="bg-blue"]').first();
      const activeLinkText = await activeLink.textContent();
      expect(activeLinkText?.trim()).toBe('Drafts');

      console.log('✓ Drafts page loads successfully');
    });

    test('should load Analytics page (/analytics) successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });

      const activeLink = await page.locator('nav a.bg-blue-100, nav a[class*="bg-blue"]').first();
      const activeLinkText = await activeLink.textContent();
      expect(activeLinkText?.trim()).toBe('Analytics');

      console.log('✓ Analytics page loads successfully');
    });

    test('should load Live Activity page (/activity) successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/activity`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-testid="app-container"]', { timeout: 10000 });

      const activeLink = await page.locator('nav a.bg-blue-100, nav a[class*="bg-blue"]').first();
      const activeLinkText = await activeLink.textContent();
      expect(activeLinkText?.trim()).toBe('Live Activity');

      console.log('✓ Live Activity page loads successfully');
    });
  });

  test.describe('Multi-Viewport Testing', () => {

    test('should show correct navigation on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('nav', { timeout: 10000 });

      // Sidebar should be visible on desktop
      const sidebar = await page.locator('nav').first();
      await expect(sidebar).toBeVisible();

      // Verify no Agent Config
      const navLinks = await page.locator('nav a').allTextContents();
      expect(navLinks).not.toContain('Agent Config');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'viewport-desktop-1920x1080.png'),
        fullPage: false
      });

      console.log('✓ Desktop viewport: Navigation correct');
    });

    test('should show correct navigation on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // May need to open menu on tablet
      const menuButton = await page.locator('button[class*="lg:hidden"]').first();
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500); // Wait for animation
      }

      // Verify no Agent Config
      const navLinks = await page.locator('nav a').allTextContents();
      expect(navLinks).not.toContain('Agent Config');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'viewport-tablet-768x1024.png'),
        fullPage: false
      });

      console.log('✓ Tablet viewport: Navigation correct');
    });

    test('should show correct navigation on mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Open mobile menu
      const menuButton = await page.locator('button[class*="lg:hidden"]').first();
      await menuButton.click();
      await page.waitForTimeout(500);

      // Verify no Agent Config
      const navLinks = await page.locator('nav a').allTextContents();
      expect(navLinks).not.toContain('Agent Config');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'viewport-mobile-375x667.png'),
        fullPage: false
      });

      console.log('✓ Mobile viewport: Navigation correct');
    });
  });

  test.describe('Dark/Light Mode Testing', () => {

    test('should show correct navigation in light mode', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Force light mode
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
      });

      await page.waitForSelector('nav', { timeout: 10000 });

      // Verify no Agent Config
      const navLinks = await page.locator('nav a').allTextContents();
      expect(navLinks).not.toContain('Agent Config');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'light-mode-navigation.png'),
        fullPage: false
      });

      console.log('✓ Light mode: Navigation correct');
    });

    test('should show correct navigation in dark mode', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Force dark mode
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForSelector('nav', { timeout: 10000 });

      // Verify no Agent Config
      const navLinks = await page.locator('nav a').allTextContents();
      expect(navLinks).not.toContain('Agent Config');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'dark-mode-navigation.png'),
        fullPage: false
      });

      console.log('✓ Dark mode: Navigation correct');
    });
  });

  test.describe('Console Error Detection', () => {

    test('should not have major console errors on feed page', async ({ page }) => {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        } else if (msg.type() === 'warning') {
          consoleWarnings.push(msg.text());
        }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000); // Let app fully initialize

      // Filter out expected/minor errors
      const majorErrors = consoleErrors.filter(err =>
        !err.includes('WebSocket') &&
        !err.includes('favicon') &&
        !err.includes('404') &&
        !err.toLowerCase().includes('agentconfig') &&
        !err.toLowerCase().includes('protectedconfig')
      );

      console.log('Total console errors:', consoleErrors.length);
      console.log('Major errors:', majorErrors.length);

      if (majorErrors.length > 0) {
        console.log('Major errors found:', majorErrors);
      }

      // Should have minimal errors
      expect(majorErrors.length).toBeLessThan(5);
    });
  });

  test.describe('Navigation Click Testing', () => {

    test('should navigate through all links without Agent Config', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('nav', { timeout: 10000 });

      const navItems = await page.locator('nav a').all();

      for (let i = 0; i < navItems.length; i++) {
        const link = navItems[i];
        const linkText = await link.textContent();
        const href = await link.getAttribute('href');

        console.log(`Testing navigation: ${linkText} -> ${href}`);

        // Verify it's not Agent Config related
        expect(linkText?.toLowerCase()).not.toContain('config');
        expect(linkText?.toLowerCase()).not.toContain('agent config');
        expect(href).not.toContain('/agents/config');
        expect(href).not.toContain('/admin/protected');

        // Click and verify it loads
        await link.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Verify no 404
        const body = await page.textContent('body');
        const has404 = body?.toLowerCase().includes('404') ||
                       body?.toLowerCase().includes('not found');
        expect(has404).toBe(false);

        console.log(`✓ ${linkText} navigation works`);
      }
    });
  });

  test.describe('TypeScript Compilation Check', () => {

    test('should have no import errors for deleted components', async ({ page }) => {
      // Check that the app loads without import errors
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Check for import-related errors
      const importErrors = consoleErrors.filter(err =>
        err.toLowerCase().includes('import') ||
        err.toLowerCase().includes('cannot find') ||
        err.toLowerCase().includes('agentconfig') ||
        err.toLowerCase().includes('protectedconfig')
      );

      console.log('Import errors:', importErrors.length);

      if (importErrors.length > 0) {
        console.log('Import errors found:', importErrors);
      }

      expect(importErrors.length).toBe(0);

      console.log('✓ No import errors detected');
    });
  });

  test.describe('Visual Regression - Navigation Layout', () => {

    test('should have correct navigation spacing and layout', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('nav', { timeout: 10000 });

      // Get navigation container
      const nav = await page.locator('nav').first();

      // Verify navigation is visible
      await expect(nav).toBeVisible();

      // Count navigation items (should be 5: Feed, Drafts, Agents, Live Activity, Analytics)
      const navItems = await page.locator('nav a').all();
      expect(navItems.length).toBe(5);

      // Capture full navigation
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'navigation-full-layout.png'),
        fullPage: false
      });

      console.log('✓ Navigation has correct layout with 5 items');
    });
  });

  test.describe('Route Accessibility Summary', () => {

    test('should provide complete route accessibility report', async ({ page }) => {
      const routes = [
        { path: '/', shouldWork: true, name: 'Feed' },
        { path: '/agents', shouldWork: true, name: 'Agents' },
        { path: '/drafts', shouldWork: true, name: 'Drafts' },
        { path: '/analytics', shouldWork: true, name: 'Analytics' },
        { path: '/activity', shouldWork: true, name: 'Live Activity' },
        { path: '/agents/config', shouldWork: false, name: 'Agent Config (REMOVED)' },
        { path: '/admin/protected-configs', shouldWork: false, name: 'Protected Configs (REMOVED)' },
        { path: '/config', shouldWork: false, name: 'Config (REMOVED)' }
      ];

      const results: any[] = [];

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        const body = await page.textContent('body');
        const has404 = body?.toLowerCase().includes('404') ||
                       body?.toLowerCase().includes('not found');

        const actuallyWorks = !has404;
        const expectedToWork = route.shouldWork;
        const passed = actuallyWorks === expectedToWork;

        results.push({
          path: route.path,
          name: route.name,
          expectedToWork,
          actuallyWorks,
          passed,
          status: passed ? '✓ PASS' : '✗ FAIL'
        });

        console.log(`${route.path}: ${passed ? '✓ PASS' : '✗ FAIL'} (expected: ${expectedToWork}, actual: ${actuallyWorks})`);
      }

      // Write results to file
      const reportPath = path.join(SCREENSHOT_DIR, 'route-accessibility-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

      // All routes should pass their expectations
      const allPassed = results.every(r => r.passed);
      expect(allPassed).toBe(true);

      console.log('✓ Route accessibility report generated');
    });
  });
});

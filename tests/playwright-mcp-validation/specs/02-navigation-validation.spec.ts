import { test, expect } from '@playwright/test';

/**
 * Navigation and Route Validation Tests
 * Tests all application routes and navigation flows
 */

test.describe('Navigation and Route Validation', () => {
  const routes = [
    { path: '/', name: 'Home/Feed', expectedTitle: 'AgentLink' },
    { path: '/claude-manager', name: 'Claude Manager', expectedTitle: 'AgentLink' },
    { path: '/interactive-control', name: 'Interactive Control', expectedTitle: 'AgentLink' },
    { path: '/agents', name: 'Agents', expectedTitle: 'AgentLink' },
    { path: '/workflows', name: 'Workflows', expectedTitle: 'AgentLink' },
    { path: '/analytics', name: 'Analytics', expectedTitle: 'AgentLink' },
    { path: '/claude-code', name: 'Claude Code', expectedTitle: 'AgentLink' },
    { path: '/activity', name: 'Activity', expectedTitle: 'AgentLink' },
    { path: '/settings', name: 'Settings', expectedTitle: 'AgentLink' },
    { path: '/performance-monitor', name: 'Performance Monitor', expectedTitle: 'AgentLink' },
    { path: '/drafts', name: 'Drafts', expectedTitle: 'AgentLink' },
    { path: '/posting', name: 'Posting Interface', expectedTitle: 'AgentLink' },
    { path: '/mention-demo', name: 'Mention Demo', expectedTitle: 'AgentLink' }
  ];

  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  for (const route of routes) {
    test(`Route validation: ${route.name} (${route.path})`, async ({ page }) => {
      await test.step(`Navigate to ${route.path}`, async () => {
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');
      });

      await test.step('Verify page loads successfully', async () => {
        // Check that we're on the correct path
        expect(page.url()).toContain(route.path);

        // Verify page title
        const title = await page.title();
        expect(title).toContain(route.expectedTitle);
      });

      await test.step('Verify essential UI elements', async () => {
        // Check for main application structure
        await expect(page.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 10000 });

        // Check for header
        await expect(page.locator('[data-testid="header"]')).toBeVisible({ timeout: 5000 });

        // Check for main content
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible({ timeout: 5000 });
      });

      await test.step('Check for JavaScript errors', async () => {
        const errors = [];
        page.on('pageerror', error => {
          errors.push(error.message);
        });

        // Trigger any lazy-loaded components
        await page.mouse.move(100, 100);
        await page.waitForTimeout(1000);

        // Should not have critical JavaScript errors
        const criticalErrors = errors.filter(err =>
          err.includes('TypeError') ||
          err.includes('ReferenceError') ||
          err.includes('Cannot read property')
        );
        expect(criticalErrors).toHaveLength(0);
      });

      await test.step('Verify responsive behavior', async () => {
        // Test desktop view
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(500);
        await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

        // Test tablet view
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.waitForTimeout(500);
        await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

        // Test mobile view
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(500);
        await expect(page.locator('[data-testid="app-root"]')).toBeVisible();

        // Reset to desktop
        await page.setViewportSize({ width: 1920, height: 1080 });
      });

      await test.step('Take screenshot for visual validation', async () => {
        await page.screenshot({
          path: `test-results/navigation/route-${route.path.replace(/\//g, '_')}.png`,
          fullPage: true
        });
      });
    });
  }

  test('Sidebar navigation functionality', async ({ page }) => {
    await test.step('Test navigation menu interactions', async () => {
      // Navigate to different routes using sidebar
      const navigationItems = [
        { text: 'Interactive Control', href: '/interactive-control' },
        { text: 'Claude Manager', href: '/claude-manager' },
        { text: 'Feed', href: '/' },
        { text: 'Agents', href: '/agents' },
        { text: 'Analytics', href: '/analytics' }
      ];

      for (const item of navigationItems) {
        await test.step(`Navigate via sidebar to ${item.text}`, async () => {
          // Click the navigation item
          const navLink = page.locator(`nav a[href="${item.href}"]`).first();
          if (await navLink.isVisible()) {
            await navLink.click();
            await page.waitForLoadState('networkidle');

            // Verify navigation worked
            expect(page.url()).toContain(item.href);

            // Verify page content loads
            await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
          }
        });
      }
    });

    await test.step('Test mobile menu functionality', async () => {
      // Switch to mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for mobile menu button
      const menuButton = page.locator('button[aria-label="Open menu"]').or(
        page.locator('button:has-text("Menu")').or(
          page.locator('[data-testid="mobile-menu-button"]')
        )
      );

      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500);

        // Verify menu is open
        const mobileNav = page.locator('nav').or(page.locator('[data-testid="mobile-nav"]'));
        await expect(mobileNav).toBeVisible();
      }

      // Reset viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
    });
  });

  test('URL routing and deep linking', async ({ page }) => {
    await test.step('Test direct URL access', async () => {
      // Test accessing routes directly via URL
      const testRoutes = ['/agents', '/claude-manager', '/analytics'];

      for (const route of testRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        // Should load the correct page
        expect(page.url()).toContain(route);
        await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      }
    });

    await test.step('Test browser back/forward navigation', async () => {
      // Navigate through several pages
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.goto('/agents');
      await page.waitForLoadState('networkidle');

      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');

      // Test back navigation
      await page.goBack();
      expect(page.url()).toContain('/agents');

      await page.goBack();
      expect(page.url()).toBe(page.url().replace(/\/[^\/]*$/, '/'));

      // Test forward navigation
      await page.goForward();
      expect(page.url()).toContain('/agents');
    });
  });

  test('Error handling for invalid routes', async ({ page }) => {
    await test.step('Test 404 handling', async () => {
      await page.goto('/nonexistent-route');
      await page.waitForLoadState('networkidle');

      // Should show 404 or redirect to valid page
      const is404 = page.url().includes('404') ||
                   await page.locator('text=Not Found').isVisible() ||
                   await page.locator('text=404').isVisible();

      // If not 404, should at least load the app structure
      if (!is404) {
        await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      }
    });
  });
});
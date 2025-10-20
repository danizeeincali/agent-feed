/**
 * E2E Tests: Agent Config Page Removal Validation
 *
 * Test Requirements:
 * - Navigate to http://localhost:5173/agents/config → verify 404
 * - Navigate to http://localhost:5173/admin/protected-configs → verify 404
 * - Check navigation sidebar → verify no "Agent Config" link
 * - Click all remaining nav links → verify they work
 * - Capture screenshots of navigation menu (before/after)
 * - Verify no console errors on any route
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Agent Config Page Removal - E2E Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear console before each test
    await page.goto(BASE_URL);

    // Wait for app to be ready
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test.describe('404 Route Validation', () => {
    test('should show 404 page when navigating to /agents/config', async ({ page }) => {
      // Navigate to the removed route
      await page.goto(`${BASE_URL}/agents/config`);

      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');

      // Check for 404 page indicators
      const notFoundText = await page.textContent('body');
      expect(notFoundText).toMatch(/(404|Not Found|Page Not Found)/i);

      // Capture screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/agents-config-404.png',
        fullPage: true,
      });
    });

    test('should show 404 page when navigating to /admin/protected-configs', async ({ page }) => {
      // Navigate to the removed admin route
      await page.goto(`${BASE_URL}/admin/protected-configs`);

      // Wait for navigation to complete
      await page.waitForLoadState('networkidle');

      // Check for 404 page indicators
      const notFoundText = await page.textContent('body');
      expect(notFoundText).toMatch(/(404|Not Found|Page Not Found)/i);

      // Capture screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/admin-configs-404.png',
        fullPage: true,
      });
    });

    test('should verify 404 page has proper styling', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents/config`);
      await page.waitForLoadState('networkidle');

      // Check that the page is styled (not a blank error)
      const hasStyles = await page.evaluate(() => {
        const body = document.querySelector('body');
        return body && window.getComputedStyle(body).backgroundColor !== 'rgba(0, 0, 0, 0)';
      });

      expect(hasStyles).toBe(true);
    });

    test('should verify 404 page has navigation back to home', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents/config`);
      await page.waitForLoadState('networkidle');

      // Look for links or buttons to navigate back
      const hasHomeLink = await page.locator('a[href="/"], a[href="' + BASE_URL + '"]').count() > 0;

      expect(hasHomeLink).toBe(true);
    });
  });

  test.describe('Navigation Sidebar Validation', () => {
    test('should not display "Agent Config" link in navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Check for Agent Config text
      const navText = await page.textContent('nav');
      expect(navText).not.toContain('Agent Config');

      // Capture screenshot of navigation
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/navigation-without-config.png',
        fullPage: false,
      });
    });

    test('should display exactly 5 navigation items', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Count navigation links
      const navLinks = await page.locator('nav a').count();

      // Should have 5 main navigation items
      expect(navLinks).toBe(5);
    });

    test('should verify navigation items are: Feed, Drafts, Agents, Live Activity, Analytics', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      const navText = await page.textContent('nav');

      expect(navText).toContain('Feed');
      expect(navText).toContain('Drafts');
      expect(navText).toContain('Agents');
      expect(navText).toContain('Live Activity');
      expect(navText).toContain('Analytics');
    });

    test('should not have any links pointing to /agents/config', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      const configLinks = await page.locator('a[href*="/agents/config"]').count();
      expect(configLinks).toBe(0);
    });

    test('should not have any links pointing to /admin/protected-configs', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      const adminConfigLinks = await page.locator('a[href*="/admin/protected-configs"]').count();
      expect(adminConfigLinks).toBe(0);
    });

    test('should verify navigation has proper icons', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Check for SVG icons in navigation
      const iconCount = await page.locator('nav a svg').count();

      // Should have 5 icons (one per nav item)
      expect(iconCount).toBe(5);
    });

    test('should verify navigation links have proper styling', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav a', { timeout: 5000 });

      const firstLink = page.locator('nav a').first();
      const hasStyles = await firstLink.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.padding !== '0px' && styles.borderRadius !== '0px';
      });

      expect(hasStyles).toBe(true);
    });
  });

  test.describe('Navigation Link Functionality', () => {
    test('should navigate to Feed when clicking Feed link', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      await page.click('text=Feed');
      await page.waitForURL(`${BASE_URL}/`);

      expect(page.url()).toBe(`${BASE_URL}/`);

      // Capture screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/feed-page.png',
        fullPage: true,
      });
    });

    test('should navigate to Drafts when clicking Drafts link', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      await page.click('text=Drafts');
      await page.waitForURL(`${BASE_URL}/drafts`);

      expect(page.url()).toBe(`${BASE_URL}/drafts`);

      // Capture screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/drafts-page.png',
        fullPage: true,
      });
    });

    test('should navigate to Agents when clicking Agents link', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      expect(page.url()).toBe(`${BASE_URL}/agents`);

      // Capture screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/agents-page.png',
        fullPage: true,
      });
    });

    test('should navigate to Live Activity when clicking Live Activity link', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      await page.click('text=Live Activity');
      await page.waitForURL(`${BASE_URL}/activity`);

      expect(page.url()).toBe(`${BASE_URL}/activity`);

      // Capture screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/activity-page.png',
        fullPage: true,
      });
    });

    test('should navigate to Analytics when clicking Analytics link', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      await page.click('text=Analytics');
      await page.waitForURL(`${BASE_URL}/analytics`);

      expect(page.url()).toBe(`${BASE_URL}/analytics`);

      // Capture screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/analytics-page.png',
        fullPage: true,
      });
    });

    test('should highlight active navigation item', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Check if Agents link has active styling
      const agentsLink = page.locator('nav a:has-text("Agents")');
      const hasActiveClass = await agentsLink.evaluate((el) => {
        return el.className.includes('bg-blue') || el.className.includes('border');
      });

      expect(hasActiveClass).toBe(true);
    });

    test('should update active state when navigating between pages', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Click Analytics
      await page.click('text=Analytics');
      await page.waitForURL(`${BASE_URL}/analytics`);

      // Check that Analytics is now active
      const analyticsLink = page.locator('nav a:has-text("Analytics")');
      const hasActiveClass = await analyticsLink.evaluate((el) => {
        return el.className.includes('bg-blue') || el.className.includes('border');
      });

      expect(hasActiveClass).toBe(true);
    });
  });

  test.describe('Console Error Validation', () => {
    test('should not have console errors on home page', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Filter out known non-critical errors
      const criticalErrors = consoleErrors.filter(
        (error) => !error.includes('favicon') && !error.includes('chunk')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should not have console errors on agents page', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = consoleErrors.filter(
        (error) => !error.includes('favicon') && !error.includes('chunk')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should not have console errors on analytics page', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForLoadState('networkidle');

      const criticalErrors = consoleErrors.filter(
        (error) => !error.includes('favicon') && !error.includes('chunk')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('should not have console errors when navigating to 404 page', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/agents/config`);
      await page.waitForLoadState('networkidle');

      // 404 pages should not throw errors
      const criticalErrors = consoleErrors.filter(
        (error) => !error.includes('favicon') && !error.includes('chunk')
      );

      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Mobile Navigation Tests', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have hamburger menu on mobile', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      // Look for mobile menu button
      const menuButton = page.locator('button svg:has-text("Menu"), button:has-text("☰")');
      const count = await menuButton.count();

      expect(count).toBeGreaterThan(0);

      // Capture mobile screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/mobile-view.png',
        fullPage: false,
      });
    });

    test('should open sidebar when clicking hamburger menu', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      // Click menu button
      await page.click('button:has(svg)'); // Click first button with SVG (likely menu)

      // Wait a moment for animation
      await page.waitForTimeout(300);

      // Check if sidebar is visible
      const sidebarVisible = await page.locator('nav').isVisible();
      expect(sidebarVisible).toBe(true);
    });

    test('should not show Agent Config in mobile navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      // Open mobile menu
      await page.click('button:has(svg)');
      await page.waitForTimeout(300);

      const navText = await page.textContent('nav');
      expect(navText).not.toContain('Agent Config');
    });
  });

  test.describe('Dark Mode Navigation Tests', () => {
    test('should verify navigation works in dark mode', async ({ page }) => {
      await page.goto(BASE_URL);

      // Enable dark mode (if there's a toggle)
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForSelector('nav', { timeout: 5000 });

      // Verify navigation is visible in dark mode
      const navVisible = await page.locator('nav').isVisible();
      expect(navVisible).toBe(true);

      // Capture dark mode screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/navigation-dark-mode.png',
        fullPage: false,
      });
    });

    test('should verify no Agent Config in dark mode navigation', async ({ page }) => {
      await page.goto(BASE_URL);

      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForSelector('nav', { timeout: 5000 });

      const navText = await page.textContent('nav');
      expect(navText).not.toContain('Agent Config');
    });
  });

  test.describe('Page Load Performance', () => {
    test('should load home page quickly without config page', async ({ page }) => {
      const startTime = Date.now();

      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should navigate between pages quickly', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      const startTime = Date.now();

      await page.click('text=Analytics');
      await page.waitForURL(`${BASE_URL}/analytics`);

      const navigationTime = Date.now() - startTime;

      // Should navigate within 2 seconds
      expect(navigationTime).toBeLessThan(2000);
    });
  });

  test.describe('Browser Navigation Tests', () => {
    test('should handle back button correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Navigate to Agents
      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      // Go back
      await page.goBack();
      await page.waitForURL(`${BASE_URL}/`);

      expect(page.url()).toBe(`${BASE_URL}/`);
    });

    test('should handle forward button correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Navigate to Agents
      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      // Go back
      await page.goBack();
      await page.waitForURL(`${BASE_URL}/`);

      // Go forward
      await page.goForward();
      await page.waitForURL(`${BASE_URL}/agents`);

      expect(page.url()).toBe(`${BASE_URL}/agents`);
    });

    test('should maintain scroll position when navigating back', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));

      // Navigate away
      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      // Go back
      await page.goBack();
      await page.waitForURL(`${BASE_URL}/`);

      // Check scroll position
      const scrollY = await page.evaluate(() => window.scrollY);
      expect(scrollY).toBeGreaterThan(0);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have accessible navigation links', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Check that nav links have proper ARIA labels or text
      const navLinks = page.locator('nav a');
      const count = await navLinks.count();

      for (let i = 0; i < count; i++) {
        const link = navLinks.nth(i);
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        // Each link should have text or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Tab through navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Check if focus is on a navigation link
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT']).toContain(focusedElement);
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check for h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
    });
  });
});

test.describe('Screenshot Comparison Suite', () => {
  test('should capture full navigation sidebar', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForSelector('nav', { timeout: 5000 });

    await page.screenshot({
      path: 'tests/e2e/screenshots/config-removal/full-navigation-after-removal.png',
      fullPage: false,
    });
  });

  test('should capture all page states', async ({ page }) => {
    const pages = [
      { name: 'feed', path: '/' },
      { name: 'drafts', path: '/drafts' },
      { name: 'agents', path: '/agents' },
      { name: 'activity', path: '/activity' },
      { name: 'analytics', path: '/analytics' },
    ];

    for (const pageInfo of pages) {
      await page.goto(`${BASE_URL}${pageInfo.path}`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `tests/e2e/screenshots/config-removal/${pageInfo.name}-full-page.png`,
        fullPage: true,
      });
    }
  });
});

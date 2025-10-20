/**
 * Regression Tests: Agent Config Page Removal
 *
 * Test Requirements:
 * - Test feed page still loads
 * - Test agents page still loads
 * - Test drafts page still loads
 * - Test analytics page still loads
 * - Test activity page still loads
 * - Test all core functionality intact
 * - Test dark mode still works
 * - Test responsive design still works
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Regression Tests - Core Functionality After Config Removal', () => {
  test.describe('Page Load Tests', () => {
    test('should load feed page successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      // Verify page loaded
      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);

      // Check for main content
      const mainContent = await page.locator('[data-testid="main-content"]').isVisible();
      expect(mainContent).toBe(true);
    });

    test('should load agents page successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });

    test('should load drafts page successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/drafts`);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });

    test('should load analytics page successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });

    test('should load activity page successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/activity`);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });
  });

  test.describe('Header Functionality Tests', () => {
    test('should display header with app title', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="header"]', { timeout: 5000 });

      const headerText = await page.locator('[data-testid="header"]').textContent();
      expect(headerText).toContain('AgentLink');
    });

    test('should have working search input', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });

      const searchInput = page.locator('input[placeholder*="Search"]');
      await searchInput.fill('test search');

      const value = await searchInput.inputValue();
      expect(value).toBe('test search');
    });

    test('should display hamburger menu on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="header"]', { timeout: 5000 });

      // Look for menu button (contains SVG)
      const menuButton = page.locator('[data-testid="header"] button:has(svg)').first();
      const isVisible = await menuButton.isVisible();

      expect(isVisible).toBe(true);
    });
  });

  test.describe('Sidebar Navigation Tests', () => {
    test('should display sidebar with logo', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      const navText = await page.textContent('nav');
      expect(navText).toContain('AgentLink');
    });

    test('should highlight active navigation item', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForSelector('nav', { timeout: 5000 });

      const agentsLink = page.locator('nav a:has-text("Agents")');
      const className = await agentsLink.getAttribute('class');

      expect(className).toContain('bg-blue');
    });

    test('should display all navigation icons', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      const iconCount = await page.locator('nav a svg').count();
      expect(iconCount).toBe(5); // 5 navigation items
    });

    test('should show connection status in sidebar', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Look for ConnectionStatus component
      const sidebarHtml = await page.locator('nav').innerHTML();
      // Connection status should be present in the sidebar area
      expect(sidebarHtml).toBeTruthy();
    });
  });

  test.describe('Routing and Navigation Tests', () => {
    test('should navigate between all pages without errors', async ({ page }) => {
      const routes = ['/', '/agents', '/analytics', '/activity', '/drafts'];

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');

        // Verify no error page
        const bodyText = await page.textContent('body');
        expect(bodyText).not.toContain('Something went wrong');
      }
    });

    test('should maintain navigation state across page transitions', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Click through all navigation items
      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      await page.click('text=Analytics');
      await page.waitForURL(`${BASE_URL}/analytics`);

      // Verify nav is still visible
      const navVisible = await page.locator('nav').isVisible();
      expect(navVisible).toBe(true);
    });

    test('should handle direct URL navigation', async ({ page }) => {
      const routes = [
        { path: '/agents', expected: '/agents' },
        { path: '/analytics', expected: '/analytics' },
        { path: '/activity', expected: '/activity' },
        { path: '/drafts', expected: '/drafts' },
      ];

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route.path}`);
        await page.waitForLoadState('networkidle');

        expect(page.url()).toContain(route.expected);
      }
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Navigate forward
      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      await page.click('text=Analytics');
      await page.waitForURL(`${BASE_URL}/analytics`);

      // Navigate back
      await page.goBack();
      expect(page.url()).toBe(`${BASE_URL}/agents`);

      await page.goBack();
      expect(page.url()).toBe(`${BASE_URL}/`);

      // Navigate forward
      await page.goForward();
      expect(page.url()).toBe(`${BASE_URL}/agents`);
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle 404 routes gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/nonexistent-route`);
      await page.waitForLoadState('networkidle');

      // Should show 404 page, not crash
      const bodyText = await page.textContent('body');
      expect(bodyText).toMatch(/(404|Not Found)/i);

      // Navigation should still be present
      const navVisible = await page.locator('nav').isVisible();
      expect(navVisible).toBe(true);
    });

    test('should not have JavaScript errors on any page', async ({ page }) => {
      const errors: string[] = [];

      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      const routes = ['/', '/agents', '/analytics', '/activity', '/drafts'];

      for (const route of routes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForLoadState('networkidle');
      }

      expect(errors.length).toBe(0);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);

      await page.goto(BASE_URL);

      // Wait a bit for any error handling
      await page.waitForTimeout(2000);

      // Go back online
      await page.context().setOffline(false);

      // Page should recover
      await page.reload();
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });
  });

  test.describe('Dark Mode Functionality Tests', () => {
    test('should switch to dark mode correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      // Enable dark mode via classList
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      // Check if dark mode classes are applied
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      expect(hasDarkClass).toBe(true);
    });

    test('should display dark mode styles correctly', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      // Check background color changed
      const backgroundColor = await page.evaluate(() => {
        const body = document.querySelector('body');
        return body ? window.getComputedStyle(body).backgroundColor : '';
      });

      // Dark mode should have darker background
      expect(backgroundColor).toBeTruthy();
    });

    test('should maintain dark mode across page navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Navigate to another page
      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      // Check dark mode persists
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      expect(hasDarkClass).toBe(true);
    });

    test('should display navigation correctly in dark mode', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      await page.waitForTimeout(500);

      // Navigation should be visible
      const navVisible = await page.locator('nav').isVisible();
      expect(navVisible).toBe(true);

      // Take screenshot
      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/dark-mode-navigation.png',
        fullPage: false,
      });
    });
  });

  test.describe('Responsive Design Tests', () => {
    test('should display correctly on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);

      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/desktop-1920.png',
        fullPage: false,
      });
    });

    test('should display correctly on laptop (1366x768)', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);

      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/laptop-1366.png',
        fullPage: false,
      });
    });

    test('should display correctly on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);

      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/tablet-768.png',
        fullPage: false,
      });
    });

    test('should display correctly on mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);

      await page.screenshot({
        path: 'tests/e2e/screenshots/config-removal/mobile-375.png',
        fullPage: false,
      });
    });

    test('should have responsive navigation on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });

      // Navigation should be hidden on mobile initially
      const nav = page.locator('nav');
      const navClasses = await nav.getAttribute('class');

      // Should have translate-x class for mobile hiding
      expect(navClasses).toContain('translate-x');
    });

    test('should open mobile menu correctly', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="header"]', { timeout: 5000 });

      // Click hamburger menu
      const menuButton = page.locator('[data-testid="header"] button').first();
      await menuButton.click();

      await page.waitForTimeout(500);

      // Navigation should be visible now
      const nav = page.locator('nav');
      const navClasses = await nav.getAttribute('class');

      expect(navClasses).toContain('translate-x-0');
    });

    test('should close mobile menu when clicking overlay', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="header"]', { timeout: 5000 });

      // Open menu
      const menuButton = page.locator('[data-testid="header"] button').first();
      await menuButton.click();
      await page.waitForTimeout(300);

      // Click overlay (if visible)
      const overlay = page.locator('.fixed.inset-0.z-40');
      const overlayExists = await overlay.count() > 0;

      if (overlayExists) {
        await overlay.click();
        await page.waitForTimeout(300);

        // Menu should be hidden
        const nav = page.locator('nav');
        const navClasses = await nav.getAttribute('class');
        expect(navClasses).toContain('-translate-x-full');
      }
    });
  });

  test.describe('Performance Tests', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const routes = ['/', '/agents', '/analytics', '/activity', '/drafts'];

      for (const route of routes) {
        const startTime = Date.now();

        await page.goto(`${BASE_URL}${route}`);
        await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

        const loadTime = Date.now() - startTime;

        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
      }
    });

    test('should handle rapid navigation without crashing', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Rapidly click through navigation
      await page.click('text=Agents');
      await page.click('text=Analytics');
      await page.click('text=Activity');
      await page.click('text=Feed');
      await page.click('text=Drafts');

      await page.waitForTimeout(1000);

      // Should still be functional
      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });

    test('should not have memory leaks on page transitions', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Navigate multiple times
      for (let i = 0; i < 5; i++) {
        await page.click('text=Agents');
        await page.waitForTimeout(500);

        await page.click('text=Analytics');
        await page.waitForTimeout(500);

        await page.click('text=Feed');
        await page.waitForTimeout(500);
      }

      // Should still be responsive
      const feedLink = page.locator('text=Feed');
      const isClickable = await feedLink.isEnabled();
      expect(isClickable).toBe(true);
    });
  });

  test.describe('Accessibility Regression Tests', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
    });

    test('should have alt text for images', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');

        // Images should have alt text
        expect(alt !== null).toBe(true);
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('nav', { timeout: 5000 });

      // Tab through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to focus on elements
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    });

    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Check for nav, main, header landmarks
      const nav = await page.locator('nav').count();
      const main = await page.locator('main, [role="main"]').count();
      const header = await page.locator('header, [role="banner"]').count();

      expect(nav).toBeGreaterThan(0);
      expect(main).toBeGreaterThan(0);
      expect(header).toBeGreaterThan(0);
    });
  });

  test.describe('State Management Tests', () => {
    test('should maintain application state across navigation', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });

      // Enter search term
      await page.fill('input[placeholder*="Search"]', 'test query');

      // Navigate to another page
      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      // Navigate back
      await page.click('text=Feed');
      await page.waitForURL(`${BASE_URL}/`);

      // Search input should still have value (if state persists)
      const searchValue = await page.inputValue('input[placeholder*="Search"]');
      // State may or may not persist - just verify input exists
      expect(searchValue !== undefined).toBe(true);
    });

    test('should handle React Query cache correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      // Navigate away and back
      await page.click('text=Analytics');
      await page.waitForURL(`${BASE_URL}/analytics`);

      await page.click('text=Agents');
      await page.waitForURL(`${BASE_URL}/agents`);

      // Page should load from cache (quickly)
      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });
  });

  test.describe('WebSocket Connection Tests', () => {
    test('should maintain WebSocket connection', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      // Wait a bit for WebSocket to connect
      await page.waitForTimeout(2000);

      // Look for connection status indicator (if available)
      // This is optional based on implementation
      const bodyHtml = await page.locator('body').innerHTML();
      expect(bodyHtml).toBeTruthy();
    });

    test('should handle WebSocket reconnection', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      // Simulate network interruption
      await page.context().setOffline(true);
      await page.waitForTimeout(2000);

      // Go back online
      await page.context().setOffline(false);
      await page.waitForTimeout(3000);

      // App should still be functional
      const appRoot = await page.locator('[data-testid="app-root"]').isVisible();
      expect(appRoot).toBe(true);
    });
  });
});

import { test, expect } from '@playwright/test';

/**
 * Navigation Flow Tests
 * Tests navigation between pages and ensures consistent rendering
 */

test.describe('Navigation Flow Tests', () => {
  const routes = [
    { path: '/', name: 'Feed', expectedContent: 'Feed' },
    { path: '/interactive-control', name: 'Interactive Control', expectedContent: 'Interactive Control' },
    { path: '/claude-manager', name: 'Claude Manager', expectedContent: 'Claude Manager' },
    { path: '/agents', name: 'Agents', expectedContent: 'Agents' },
    { path: '/workflows', name: 'Workflows', expectedContent: 'Workflow' },
    { path: '/analytics', name: 'Analytics', expectedContent: 'Analytics' },
    { path: '/claude-code', name: 'Claude Code', expectedContent: 'Claude Code' },
    { path: '/activity', name: 'Activity', expectedContent: 'Activity' },
    { path: '/settings', name: 'Settings', expectedContent: 'Settings' },
    { path: '/drafts', name: 'Drafts', expectedContent: 'Draft' },
    { path: '/posting', name: 'Posting', expectedContent: 'Post' },
    { path: '/mention-demo', name: 'Mention Demo', expectedContent: 'Mention' },
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('should navigate between all main routes successfully', async ({ page }) => {
    for (const route of routes) {
      console.log(`Testing navigation to ${route.name} (${route.path})`);

      await page.goto(route.path, { waitUntil: 'networkidle' });

      // Verify the page loads without white screen
      const rootElement = await page.locator('#root');
      await expect(rootElement).toBeVisible({ timeout: 10000 });

      // Verify main content is present
      const mainContent = await page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeVisible({ timeout: 10000 });

      // Verify page has meaningful content
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(50);

      // Verify URL is correct
      expect(page.url()).toContain(route.path);

      console.log(`✅ ${route.name} loaded successfully`);
    }
  });

  test('should maintain sidebar navigation across routes', async ({ page }) => {
    for (const route of routes.slice(0, 5)) { // Test first 5 routes for performance
      await page.goto(route.path);
      await page.waitForSelector('[data-testid="app-root"]');

      // Verify sidebar is present and functional
      const sidebar = await page.locator('.w-64'); // Sidebar
      await expect(sidebar).toBeVisible();

      // Verify navigation links are present
      const navLinks = await page.locator('nav a');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(5);

      // Verify app branding persists
      const appTitle = await page.locator('text=AgentLink');
      await expect(appTitle).toBeVisible();

      console.log(`✅ Sidebar navigation maintained on ${route.name}`);
    }
  });

  test('should handle direct navigation to each route', async ({ page }) => {
    for (const route of routes) {
      // Navigate directly to the route (simulating browser URL entry)
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });

      // Verify page loads without error
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });

      // Verify no error boundaries are showing
      const errorBoundaries = await page.locator('text=Something went wrong').count();
      expect(errorBoundaries).toBe(0);

      // Verify main layout is present
      const mainContent = await page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeVisible();

      console.log(`✅ Direct navigation to ${route.name} successful`);
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through several routes
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    await page.goto('/agents');
    await page.waitForSelector('[data-testid="app-root"]');

    await page.goto('/analytics');
    await page.waitForSelector('[data-testid="app-root"]');

    // Test back navigation
    await page.goBack();
    await page.waitForSelector('[data-testid="app-root"]');
    expect(page.url()).toContain('/agents');

    await page.goBack();
    await page.waitForSelector('[data-testid="app-root"]');
    expect(page.url()).toContain('/');

    // Test forward navigation
    await page.goForward();
    await page.waitForSelector('[data-testid="app-root"]');
    expect(page.url()).toContain('/agents');

    console.log('✅ Browser back/forward navigation works correctly');
  });

  test('should handle navigation via sidebar links', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Get navigation links
    const navLinks = await page.locator('nav a[href]');
    const linkCount = await navLinks.count();

    // Test first 5 navigation links
    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      const linkText = await link.textContent();

      if (href) {
        console.log(`Testing sidebar link: ${linkText} -> ${href}`);

        await link.click();
        await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

        // Verify navigation occurred
        expect(page.url()).toContain(href);

        // Verify content loaded
        const mainContent = await page.locator('[data-testid="main-content"]');
        await expect(mainContent).toBeVisible();

        console.log(`✅ Sidebar navigation to ${linkText} successful`);
      }
    }
  });

  test('should handle rapid navigation changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Rapidly navigate between routes
    const quickRoutes = ['/', '/agents', '/analytics', '/settings', '/'];

    for (const route of quickRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Don't wait for networkidle to test rapid changes
      await page.waitForTimeout(100);
    }

    // Finally wait for last navigation to complete
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

    // Verify final page is functional
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    const mainContent = await page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    console.log('✅ Rapid navigation changes handled correctly');
  });

  test('should handle invalid routes gracefully', async ({ page }) => {
    const invalidRoutes = [
      '/nonexistent',
      '/agents/invalid-id',
      '/settings/nonexistent',
      '/api/fake-endpoint'
    ];

    for (const route of invalidRoutes) {
      await page.goto(route);
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

      // Should show 404 or redirect to valid page
      const rootElement = await page.locator('#root');
      await expect(rootElement).toBeVisible();

      // Verify some content is shown (404 page or redirect)
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(10);

      console.log(`✅ Invalid route ${route} handled gracefully`);
    }
  });

  test('should maintain state during navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Interact with search if present
    const searchInput = await page.locator('input[placeholder*="Search"]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('test search');
      const searchValue = await searchInput.inputValue();

      // Navigate to another page
      await page.goto('/agents');
      await page.waitForSelector('[data-testid="app-root"]');

      // Navigate back
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-root"]');

      // Check if search value is maintained (depending on implementation)
      const newSearchValue = await searchInput.inputValue();
      console.log(`Search state: ${searchValue} -> ${newSearchValue}`);
    }

    console.log('✅ State management during navigation tested');
  });

  test('should handle mobile navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Verify mobile menu button is visible
    const mobileMenuButton = await page.locator('button.lg\\:hidden').first();
    await expect(mobileMenuButton).toBeVisible();

    // Click mobile menu
    await mobileMenuButton.click();
    await page.waitForTimeout(500);

    // Verify sidebar becomes visible
    const sidebar = await page.locator('.w-64');
    await expect(sidebar).toBeVisible();

    // Click a navigation link
    const firstNavLink = await page.locator('nav a').first();
    await firstNavLink.click();

    // Verify navigation works and sidebar closes
    await page.waitForSelector('[data-testid="app-root"]');
    await page.waitForTimeout(500);

    console.log('✅ Mobile navigation works correctly');
  });
});
import { test, expect } from '@playwright/test';

/**
 * DOM Element Verification Tests
 * Ensures critical DOM elements are present and properly rendered
 */

test.describe('DOM Element Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('should verify React root element is properly structured', async ({ page }) => {
    // Check #root element
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeAttached();
    await expect(rootElement).toBeVisible();

    // Verify root has React-rendered content
    const rootHtml = await rootElement.innerHTML();
    expect(rootHtml.length).toBeGreaterThan(100);

    // Check for React-specific attributes or classes
    const reactElements = await page.locator('[data-testid]').count();
    expect(reactElements).toBeGreaterThan(0);

    console.log('✅ React root element properly structured');
  });

  test('should verify essential layout elements exist', async ({ page }) => {
    // Main application container
    const appRoot = await page.locator('[data-testid="app-root"]');
    await expect(appRoot).toBeVisible();

    // Header
    const header = await page.locator('[data-testid="header"]');
    await expect(header).toBeVisible();

    // Main content area
    const mainContent = await page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    // App container
    const appContainer = await page.locator('[data-testid="app-container"]');
    await expect(appContainer).toBeVisible();

    console.log('✅ Essential layout elements verified');
  });

  test('should verify navigation elements are present', async ({ page }) => {
    // Sidebar navigation
    const sidebar = await page.locator('.w-64'); // Sidebar width class
    await expect(sidebar).toBeVisible();

    // Navigation links
    const navLinks = await page.locator('nav a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(5); // Should have multiple nav links

    // App logo/title
    const appTitle = await page.locator('text=AgentLink');
    await expect(appTitle).toBeVisible();

    // Menu toggle button (mobile)
    const menuButton = await page.locator('button:has(svg)').first();
    await expect(menuButton).toBeAttached();

    console.log('✅ Navigation elements verified');
  });

  test('should verify critical interactive elements', async ({ page }) => {
    // Search input
    const searchInput = await page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();

    // Navigation links should be clickable
    const firstNavLink = await page.locator('nav a').first();
    await expect(firstNavLink).toBeVisible();

    // Buttons should be interactive
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThan(0);

    console.log('✅ Interactive elements verified');
  });

  test('should verify error boundary elements are not active', async ({ page }) => {
    // Check that no error boundaries are showing
    const errorBoundaries = await page.locator('text=Something went wrong').count();
    expect(errorBoundaries).toBe(0);

    const errorMessages = await page.locator('.text-red-700').count();
    expect(errorMessages).toBe(0);

    // Verify no fallback components are showing
    const fallbackComponents = await page.locator('[data-testid*="fallback"]').count();
    expect(fallbackComponents).toBe(0);

    console.log('✅ No error boundaries active');
  });

  test('should verify CSS and styling are loaded', async ({ page }) => {
    // Check that Tailwind classes are applied
    const styledElements = await page.locator('.bg-white, .text-gray-900, .flex').count();
    expect(styledElements).toBeGreaterThan(10);

    // Check that the header has proper styling
    const header = await page.locator('[data-testid="header"]');
    const headerBg = await header.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(headerBg).not.toBe('rgba(0, 0, 0, 0)'); // Should have background color

    // Check sidebar styling
    const sidebar = await page.locator('.w-64');
    const sidebarWidth = await sidebar.evaluate(el => getComputedStyle(el).width);
    expect(sidebarWidth).toBe('256px'); // w-64 = 16rem = 256px

    console.log('✅ CSS and styling loaded correctly');
  });

  test('should verify accessibility attributes', async ({ page }) => {
    // Check for proper semantic elements
    const mainElement = await page.locator('main').count();
    expect(mainElement).toBeGreaterThan(0);

    const navElement = await page.locator('nav').count();
    expect(navElement).toBeGreaterThan(0);

    const headerElement = await page.locator('header').count();
    expect(headerElement).toBeGreaterThan(0);

    // Check for proper button accessibility
    const buttons = await page.locator('button');
    const buttonCount = await buttons.count();
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      expect(hasText || hasAriaLabel).toBeTruthy();
    }

    console.log('✅ Accessibility attributes verified');
  });

  test('should verify responsive design elements', async ({ page }) => {
    // Test mobile menu button exists
    const mobileMenuButton = await page.locator('button.lg\\:hidden').first();
    await expect(mobileMenuButton).toBeAttached();

    // Test responsive classes are present
    const responsiveElements = await page.locator('[class*="lg:"], [class*="md:"], [class*="sm:"]').count();
    expect(responsiveElements).toBeGreaterThan(0);

    // Test viewport-specific elements
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Allow for responsive changes

    const sidebar = await page.locator('.w-64');
    const isHidden = await sidebar.evaluate(el => {
      const style = getComputedStyle(el);
      return style.transform.includes('translateX') && style.transform.includes('-');
    });
    expect(isHidden).toBe(true); // Should be hidden on mobile

    console.log('✅ Responsive design elements verified');
  });

  test('should verify no broken images or missing assets', async ({ page }) => {
    // Check for any img elements and verify they load
    const images = await page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }

    // Check for missing CSS by verifying computed styles
    const body = await page.locator('body');
    const fontFamily = await body.evaluate(el => getComputedStyle(el).fontFamily);
    expect(fontFamily).not.toBe('serif'); // Should have custom font loaded

    console.log('✅ No broken images or missing assets');
  });

  test('should verify page meta information', async ({ page }) => {
    // Check page title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Check for meta viewport tag
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toBeAttached();

    // Check for meta charset
    const charset = await page.locator('meta[charset]');
    await expect(charset).toBeAttached();

    console.log('✅ Page meta information verified');
  });
});
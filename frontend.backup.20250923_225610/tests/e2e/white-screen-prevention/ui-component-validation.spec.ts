import { test, expect } from '@playwright/test';

/**
 * UI Component Validation Tests
 * Validates that critical UI components render properly and prevent white screen
 */

test.describe('UI Component Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('should validate header component rendering', async ({ page }) => {
    const header = await page.locator('[data-testid="header"]');
    await expect(header).toBeVisible();

    // Check header contents
    const appTitle = await page.locator('text=AgentLink');
    await expect(appTitle).toBeVisible();

    // Check search functionality
    const searchInput = await page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeEditable();

    // Test search input functionality
    await searchInput.fill('test query');
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('test query');

    // Check header styling
    const headerBg = await header.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(headerBg).not.toBe('rgba(0, 0, 0, 0)');

    console.log('✅ Header component validated');
  });

  test('should validate sidebar navigation component', async ({ page }) => {
    const sidebar = await page.locator('.w-64');
    await expect(sidebar).toBeVisible();

    // Check brand logo area
    const brandArea = await page.locator('.w-8.h-8.bg-gradient-to-br');
    await expect(brandArea).toBeVisible();

    // Check navigation links
    const navLinks = await page.locator('nav a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(8); // Should have many navigation options

    // Validate each navigation link
    for (let i = 0; i < linkCount; i++) {
      const link = navLinks.nth(i);
      const href = await link.getAttribute('href');
      const text = await link.textContent();

      expect(href).toBeTruthy();
      expect(text).toBeTruthy();
      await expect(link).toBeVisible();
    }

    // Check sidebar styling
    const sidebarBg = await sidebar.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(sidebarBg).not.toBe('rgba(0, 0, 0, 0)');

    console.log('✅ Sidebar navigation component validated');
  });

  test('should validate main content area component', async ({ page }) => {
    const mainContent = await page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();

    const appContainer = await page.locator('[data-testid="app-container"]');
    await expect(appContainer).toBeVisible();

    // Check content area has proper styling
    const contentHeight = await mainContent.evaluate(el => getComputedStyle(el).height);
    expect(contentHeight).not.toBe('0px');

    // Verify overflow handling
    const overflowY = await mainContent.evaluate(el => getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');

    console.log('✅ Main content area component validated');
  });

  test('should validate feed components on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Wait for feed content to load
    await page.waitForTimeout(3000);

    // Check for feed container or posts
    const feedElements = await page.locator('[data-testid*="feed"], [class*="feed"], .post, [data-testid*="post"]').count();

    if (feedElements > 0) {
      console.log(`Found ${feedElements} feed-related elements`);

      // Validate first feed element
      const firstFeedElement = await page.locator('[data-testid*="feed"], [class*="feed"], .post, [data-testid*="post"]').first();
      await expect(firstFeedElement).toBeVisible();
    } else {
      // Check for loading states or empty states
      const loadingElements = await page.locator('.animate-spin, [data-testid*="loading"]').count();
      const emptyStateElements = await page.locator('[data-testid*="empty"], .empty-state').count();

      expect(loadingElements + emptyStateElements).toBeGreaterThan(0);
      console.log('Feed showing loading or empty state - acceptable');
    }

    console.log('✅ Feed components validated');
  });

  test('should validate agent management components', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.waitForTimeout(2000);

    // Look for agent-related components
    const agentElements = await page.locator('[data-testid*="agent"], [class*="agent"], .agent').count();

    if (agentElements > 0) {
      console.log(`Found ${agentElements} agent-related elements`);

      const firstAgentElement = await page.locator('[data-testid*="agent"], [class*="agent"], .agent').first();
      await expect(firstAgentElement).toBeVisible();
    } else {
      // Check for empty state or loading
      const bodyText = await page.textContent('body');
      expect(bodyText!.length).toBeGreaterThan(50);
    }

    console.log('✅ Agent management components validated');
  });

  test('should validate analytics components', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.waitForTimeout(3000);

    // Look for analytics/chart components
    const analyticsElements = await page.locator('[data-testid*="chart"], [data-testid*="analytics"], .chart, canvas, svg').count();

    if (analyticsElements > 0) {
      console.log(`Found ${analyticsElements} analytics elements`);

      const firstAnalyticsElement = await page.locator('[data-testid*="chart"], [data-testid*="analytics"], .chart, canvas, svg').first();
      await expect(firstAnalyticsElement).toBeVisible();
    }

    // Verify page has meaningful content
    const bodyText = await page.textContent('body');
    expect(bodyText!.length).toBeGreaterThan(100);

    console.log('✅ Analytics components validated');
  });

  test('should validate interactive control components', async ({ page }) => {
    await page.goto('/interactive-control');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.waitForTimeout(3000);

    // Look for interactive elements
    const interactiveElements = await page.locator('button, input, textarea, select').count();
    expect(interactiveElements).toBeGreaterThan(0);

    // Check for control-specific elements
    const controlElements = await page.locator('[data-testid*="control"], [class*="control"], .terminal, .console').count();

    if (controlElements > 0) {
      console.log(`Found ${controlElements} control elements`);
    }

    // Verify content is present
    const bodyText = await page.textContent('body');
    expect(bodyText!.length).toBeGreaterThan(50);

    console.log('✅ Interactive control components validated');
  });

  test('should validate form components', async ({ page }) => {
    await page.goto('/posting');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.waitForTimeout(2000);

    // Look for form elements
    const formElements = await page.locator('form, input, textarea, button[type="submit"]').count();

    if (formElements > 0) {
      console.log(`Found ${formElements} form elements`);

      // Test first input if available
      const firstInput = await page.locator('input, textarea').first();
      if (await firstInput.count() > 0) {
        await expect(firstInput).toBeVisible();
        await expect(firstInput).toBeEditable();

        // Test input functionality
        await firstInput.fill('test content');
        const inputValue = await firstInput.inputValue();
        expect(inputValue).toBe('test content');
      }
    }

    console.log('✅ Form components validated');
  });

  test('should validate error boundary components', async ({ page }) => {
    // Start from a working page
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Check that no error boundaries are currently active
    const errorBoundaries = await page.locator('text=Something went wrong').count();
    expect(errorBoundaries).toBe(0);

    const errorMessages = await page.locator('.text-red-700, .text-red-600').count();
    expect(errorMessages).toBe(0);

    // Test error boundary by injecting an error (safely)
    await page.evaluate(() => {
      // Safely test error handling
      const event = new ErrorEvent('error', {
        error: new Error('Test error'),
        message: 'Test error message'
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(1000);

    // Page should still be functional
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    console.log('✅ Error boundary components validated');
  });

  test('should validate loading components', async ({ page }) => {
    // Intercept requests to show loading states
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.goto('/');

    // Look for loading indicators
    const loadingSpinners = await page.locator('.animate-spin').count();
    const loadingTexts = await page.locator('text=Loading').count();

    if (loadingSpinners > 0 || loadingTexts > 0) {
      console.log(`Found ${loadingSpinners} spinners and ${loadingTexts} loading texts`);

      if (loadingSpinners > 0) {
        const firstSpinner = await page.locator('.animate-spin').first();
        await expect(firstSpinner).toBeVisible();
      }
    }

    // Wait for content to eventually load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });

    console.log('✅ Loading components validated');
  });

  test('should validate responsive components across viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForSelector('[data-testid="app-root"]');
      await page.waitForTimeout(500);

      // Verify main components are still visible
      const rootElement = await page.locator('#root');
      await expect(rootElement).toBeVisible();

      const mainContent = await page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeVisible();

      // Check responsive behavior
      if (viewport.width < 1024) {
        // Mobile/tablet: sidebar should be hidden by default
        const sidebar = await page.locator('.w-64');
        const isHidden = await sidebar.evaluate(el => {
          const style = getComputedStyle(el);
          return style.transform.includes('translateX') && style.transform.includes('-');
        });
        expect(isHidden).toBe(true);

        // Mobile menu button should be visible
        const mobileMenuButton = await page.locator('button.lg\\:hidden').first();
        await expect(mobileMenuButton).toBeVisible();
      } else {
        // Desktop: sidebar should be visible
        const sidebar = await page.locator('.w-64');
        await expect(sidebar).toBeVisible();
      }

      console.log(`✅ Components validated on ${viewport.name} (${viewport.width}x${viewport.height})`);
    }
  });
});
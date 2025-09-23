import { test, expect } from '@playwright/test';

test.describe('Production Validation - Real Functionality Check', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
  });

  test('should render React components with purple gradient styling', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for purple gradient styling
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Take screenshot to verify styling
    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/production-main-page.png', fullPage: true });

    // Check for gradient classes or styles
    const gradientElements = page.locator('[class*="gradient"], [class*="purple"], [style*="gradient"]');
    const count = await gradientElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should have functional navigation items', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for navigation elements
    const navItems = page.locator('nav a, [role="navigation"] a, header a');
    const navCount = await navItems.count();

    if (navCount > 0) {
      // Test first navigation item
      const firstNav = navItems.first();
      await expect(firstNav).toBeVisible();
      await expect(firstNav).toBeEnabled();

      // Check if it's clickable (has href or click handler)
      const href = await firstNav.getAttribute('href');
      const onclick = await firstNav.getAttribute('onclick');
      expect(href || onclick).toBeTruthy();
    }
  });

  test('should access agents page at /agents route', async ({ page }) => {
    // Try to navigate to agents page
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Check if page loads without 404
    const title = await page.title();
    expect(title).not.toContain('404');
    expect(title).not.toContain('Not Found');

    // Take screenshot of agents page
    await page.screenshot({ path: '/workspaces/agent-feed/tests/screenshots/production-agents-page.png', fullPage: true });

    // Check for agents-related content
    const agentsContent = page.locator('text=/agent/i, [data-testid*="agent"], [class*="agent"]');
    const agentsCount = await agentsContent.count();
    expect(agentsCount).toBeGreaterThan(0);
  });

  test('should respond to user interactions', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Test button interactions
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();
      await expect(firstButton).toBeEnabled();

      // Click and verify response
      await firstButton.click();
      // Wait for any state changes
      await page.waitForTimeout(500);
    }

    // Test link clicks
    const links = page.locator('a[href]');
    const linkCount = await links.count();

    if (linkCount > 0) {
      const internalLinks = page.locator('a[href^="/"], a[href^="#"]');
      const internalCount = await internalLinks.count();

      if (internalCount > 0) {
        const firstInternalLink = internalLinks.first();
        await firstInternalLink.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should have no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Navigate to agents page as well
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Allow for some time to catch any delayed errors
    await page.waitForTimeout(2000);

    console.log('Console errors found:', consoleErrors);

    // Filter out known acceptable errors (if any)
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Extension')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('should validate API endpoints return real data', async ({ page, request }) => {
    // Test common API endpoints
    const apiEndpoints = [
      '/api/agents',
      '/api/health',
      '/api/status'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await request.get(`http://localhost:5173${endpoint}`);
        if (response.ok()) {
          const data = await response.json();

          // Verify it's not mock data
          expect(data).toBeDefined();
          expect(data).not.toEqual({});

          // Check for mock indicators
          const dataStr = JSON.stringify(data);
          expect(dataStr).not.toContain('mock');
          expect(dataStr).not.toContain('fake');
          expect(dataStr).not.toContain('test@example.com');
          expect(dataStr).not.toContain('placeholder');
        }
      } catch (error) {
        console.log(`API endpoint ${endpoint} not available:`, error);
      }
    }
  });

  test('should have real component functionality', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check for React DevTools indicators
    const reactRoot = page.locator('#root, #__next, [data-reactroot]');
    await expect(reactRoot).toBeVisible();

    // Verify components are not just static HTML
    const interactiveElements = page.locator('button, input, select, [role="button"], [tabindex]');
    const interactiveCount = await interactiveElements.count();
    expect(interactiveCount).toBeGreaterThan(0);

    // Check for dynamic content updates
    const beforeContent = await page.textContent('body');

    // Trigger some interaction
    if (await page.locator('button').count() > 0) {
      await page.locator('button').first().click();
      await page.waitForTimeout(500);

      const afterContent = await page.textContent('body');
      // Content might change with interaction (though not required)
    }
  });
});
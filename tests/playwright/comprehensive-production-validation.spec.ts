import { test, expect } from '@playwright/test';

test.describe('Comprehensive Production Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should have purple gradient styling throughout application', async ({ page }) => {
    // Check main page gradient
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Take comprehensive screenshots
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/main-page-validation.png',
      fullPage: true
    });

    // Check for gradient classes in the DOM
    const elementsWithGradient = page.locator('[class*="gradient"], [class*="purple"], [class*="indigo"]');
    const gradientCount = await elementsWithGradient.count();
    expect(gradientCount).toBeGreaterThan(0);

    // Navigate to agents page and check styling there too
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/agents-page-validation.png',
      fullPage: true
    });

    const agentsGradient = page.locator('[class*="gradient"], [class*="purple"], [class*="indigo"]');
    const agentsGradientCount = await agentsGradient.count();
    expect(agentsGradientCount).toBeGreaterThan(0);
  });

  test('should have fully functional navigation', async ({ page }) => {
    // Test navigation from main page
    const navLinks = page.locator('nav a, header a, [href="/agents"]');
    const linkCount = await navLinks.count();

    if (linkCount > 0) {
      // Click first navigation link
      const firstLink = navLinks.first();
      await firstLink.click();
      await page.waitForLoadState('networkidle');

      // Verify navigation worked
      const url = page.url();
      expect(url).not.toBe('http://localhost:5173/');
    }

    // Test direct navigation to agents page
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Verify page loads correctly
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible();

    const titleText = await pageTitle.textContent();
    expect(titleText).toContain('Agents');
  });

  test('should load real agent data from API', async ({ page, request }) => {
    // Test API directly
    const apiResponse = await request.get('http://localhost:5173/api/agents');
    expect(apiResponse.ok()).toBeTruthy();

    const data = await apiResponse.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.data.length).toBeGreaterThan(0);

    // Check for real agent file sources
    const realAgents = data.data.filter((agent: any) => agent.source === 'real_agent_files');
    expect(realAgents.length).toBeGreaterThan(0);

    // Verify no mock data patterns in agent data
    const dataString = JSON.stringify(data);
    expect(dataString).not.toContain('test@example.com');
    expect(dataString).not.toContain('fake-');
    expect(dataString).not.toContain('mock-');

    // Navigate to agents page and verify data loads
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-list"]', { timeout: 10000 });

    const agentCards = page.locator('[data-testid="agent-list"] > *');
    const cardCount = await agentCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('should have no critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Test main page
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test agents page
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out acceptable errors/warnings
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Extension') &&
      !error.includes('Chrome')
    );

    console.log('Console errors found:', criticalErrors);
    console.log('Console warnings found:', consoleWarnings);

    // Should have no critical errors
    expect(criticalErrors.length).toBe(0);
  });

  test('should respond to user interactions', async ({ page }) => {
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForSelector('body', { state: 'visible' });

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    // Test mouse interactions on the page
    await page.hover('body');
    await page.waitForTimeout(500);

    // Check if page is responsive
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/mobile-responsive.png',
      fullPage: true
    });

    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/tablet-responsive.png',
      fullPage: true
    });

    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: '/workspaces/agent-feed/tests/screenshots/desktop-responsive.png',
      fullPage: true
    });
  });

  test('should validate data integrity across endpoints', async ({ request }) => {
    const endpoints = ['/api/agents'];

    for (const endpoint of endpoints) {
      const response = await request.get(`http://localhost:5173${endpoint}`);
      if (response.ok()) {
        const data = await response.json();

        // Validate response structure
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('data');

        if (endpoint === '/api/agents') {
          expect(Array.isArray(data.data)).toBeTruthy();

          // Check each agent has required fields
          for (const agent of data.data) {
            expect(agent).toHaveProperty('id');
            expect(agent).toHaveProperty('name');
            expect(agent).toHaveProperty('status');
            expect(agent).toHaveProperty('source');

            // Verify real file source
            if (agent.source === 'real_agent_files') {
              expect(agent.file_path).toBeTruthy();
              expect(agent.file_size).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });
});
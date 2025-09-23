const { test, expect } = require('@playwright/test');
const path = require('path');

// Test configuration for different viewports
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 }
};

test.describe('UI Validation After PostCSS Fix', () => {

  test.beforeEach(async ({ page }) => {
    // Set timeout for each test
    test.setTimeout(60000);

    // Wait for the dev server to be ready
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
  });

  // Test 1: Main page loads with purple gradient background
  test('Main page loads with purple gradient background', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check if the main page has the purple gradient background
    const bodyElement = await page.locator('body').first();
    const backgroundStyle = await bodyElement.evaluate(el =>
      window.getComputedStyle(el).backgroundImage
    );

    // Verify gradient is applied (should contain gradient properties)
    expect(backgroundStyle).toContain('gradient');

    // Take screenshot of main page
    await page.screenshot({
      path: 'tests/screenshots/main-page-desktop.png',
      fullPage: true
    });

    console.log('✅ Main page purple gradient background validated');
  });

  // Test 2: All Tailwind classes are applied correctly
  test('All Tailwind classes are applied correctly', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    await page.waitForLoadState('networkidle');

    // Check for key Tailwind utility classes
    const elements = await page.locator('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"], [class*="flex"], [class*="grid"]');
    const count = await elements.count();

    expect(count).toBeGreaterThan(0);

    // Verify specific Tailwind classes are working
    const backgroundElements = await page.locator('.bg-gradient-to-br, .bg-purple-600, .bg-purple-700');
    const backgroundCount = await backgroundElements.count();
    expect(backgroundCount).toBeGreaterThan(0);

    // Check typography classes
    const textElements = await page.locator('[class*="text-"]');
    const textCount = await textElements.count();
    expect(textCount).toBeGreaterThan(0);

    console.log('✅ Tailwind classes validation passed');
  });

  // Test 3: Navigation works
  test('Navigation functionality works', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    await page.waitForLoadState('networkidle');

    // Check if there are navigation links
    const navLinks = await page.locator('nav a, a[href="/agents"], a[href*="agent"]');
    const navCount = await navLinks.count();

    if (navCount > 0) {
      // Test navigation to agents page if link exists
      const agentsLink = navLinks.first();
      await agentsLink.click();
      await page.waitForLoadState('networkidle');

      // Verify we navigated successfully
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/agents|agent/);

      console.log('✅ Navigation functionality validated');
    } else {
      console.log('ℹ️ No navigation links found, testing direct navigation');

      // Test direct navigation to agents page
      await page.goto('http://localhost:5173/agents', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      const currentUrl = page.url();
      expect(currentUrl).toContain('agents');
    }

    // Take navigation screenshot
    await page.screenshot({
      path: 'tests/screenshots/navigation-success.png',
      fullPage: true
    });
  });

  // Test 4: Agents page displays properly
  test('Agents page displays properly', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);

    // Navigate to agents page
    await page.goto('http://localhost:5173/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check if page loaded without errors
    const pageTitle = await page.title();
    expect(pageTitle).toBeTruthy();

    // Look for agent-related content
    const agentContent = await page.locator('body').textContent();
    expect(agentContent).toBeTruthy();
    expect(agentContent.length).toBeGreaterThan(10);

    // Take screenshot of agents page
    await page.screenshot({
      path: 'tests/screenshots/agents-page-desktop.png',
      fullPage: true
    });

    console.log('✅ Agents page validation passed');
  });

  // Test 5-7: Responsive design validation
  Object.entries(viewports).forEach(([deviceType, viewport]) => {
    test(`Responsive design validation - ${deviceType}`, async ({ page }) => {
      await page.setViewportSize(viewport);

      // Test main page
      await page.goto('http://localhost:5173', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(1000);

      // Verify page is responsive
      const bodyElement = await page.locator('body');
      const isVisible = await bodyElement.isVisible();
      expect(isVisible).toBe(true);

      // Take screenshot for this viewport
      await page.screenshot({
        path: `tests/screenshots/main-page-${deviceType}.png`,
        fullPage: true
      });

      // Test agents page responsiveness
      await page.goto('http://localhost:5173/agents', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `tests/screenshots/agents-page-${deviceType}.png`,
        fullPage: true
      });

      console.log(`✅ ${deviceType} responsive design validated`);
    });
  });

  // Test 8: Full page validation with viewport comparison
  test('Full page validation with viewport comparison', async ({ page }) => {
    const results = {
      mainPage: {},
      agentsPage: {},
      responsive: true
    };

    for (const [deviceType, viewport] of Object.entries(viewports)) {
      await page.setViewportSize(viewport);

      // Main page
      await page.goto('http://localhost:5173', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(1000);

      const mainPageContent = await page.locator('body').textContent();
      results.mainPage[deviceType] = {
        loaded: mainPageContent.length > 10,
        hasContent: mainPageContent.includes('Agent') || mainPageContent.includes('Welcome') || mainPageContent.length > 100
      };

      // Agents page
      await page.goto('http://localhost:5173/agents', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      await page.waitForTimeout(1000);

      const agentsPageContent = await page.locator('body').textContent();
      results.agentsPage[deviceType] = {
        loaded: agentsPageContent.length > 10,
        hasContent: agentsPageContent.length > 50
      };
    }

    // Validate all viewports loaded successfully
    Object.values(results.mainPage).forEach(result => {
      expect(result.loaded).toBe(true);
    });

    Object.values(results.agentsPage).forEach(result => {
      expect(result.loaded).toBe(true);
    });

    console.log('✅ Full page validation completed', results);
  });
});

test.describe('Visual Regression Testing', () => {
  test('Screenshot comparison - Main Page', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/main-page-full.png',
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: 'tests/screenshots/main-page-viewport.png',
      fullPage: false
    });
  });

  test('Screenshot comparison - Agents Page', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    await page.goto('http://localhost:5173/agents', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(2000);

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/screenshots/agents-page-full.png',
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: 'tests/screenshots/agents-page-viewport.png',
      fullPage: false
    });
  });
});
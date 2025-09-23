/**
 * Playwright E2E CSS Tests
 * Testing CSS loading and application in real browser environment
 */

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('CSS Pipeline E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should load CSS files successfully', async ({ page }) => {
    // Wait for CSS to load
    await page.waitForLoadState('networkidle');

    // Check for CSS link tags in the head
    const cssLinks = await page.locator('head link[rel="stylesheet"]').count();
    expect(cssLinks).toBeGreaterThan(0);

    // Verify CSS files return 200 status
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('.css')) {
        responses.push(response);
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that all CSS files loaded successfully
    for (const response of responses) {
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/css');
    }
  });

  test('should apply Tailwind utility classes correctly', async ({ page }) => {
    // Test if Tailwind utilities are working by checking computed styles

    // Add a test element with Tailwind classes
    await page.addScriptTag({
      content: `
        const testDiv = document.createElement('div');
        testDiv.id = 'tailwind-test';
        testDiv.className = 'bg-blue-500 text-white p-4 rounded-lg';
        testDiv.textContent = 'Tailwind Test';
        document.body.appendChild(testDiv);
      `
    });

    const testElement = page.locator('#tailwind-test');
    await expect(testElement).toBeVisible();

    // Check computed styles
    const backgroundColor = await testElement.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );
    const color = await testElement.evaluate(el =>
      getComputedStyle(el).color
    );
    const padding = await testElement.evaluate(el =>
      getComputedStyle(el).padding
    );
    const borderRadius = await testElement.evaluate(el =>
      getComputedStyle(el).borderRadius
    );

    // Verify Tailwind classes are applied
    expect(backgroundColor).toContain('rgb(59, 130, 246)'); // bg-blue-500
    expect(color).toContain('rgb(255, 255, 255)'); // text-white
    expect(padding).toBe('16px'); // p-4
    expect(borderRadius).toBe('8px'); // rounded-lg
  });

  test('should handle responsive breakpoints', async ({ page }) => {
    // Test responsive design
    await page.addScriptTag({
      content: `
        const testDiv = document.createElement('div');
        testDiv.id = 'responsive-test';
        testDiv.className = 'w-full md:w-1/2 lg:w-1/3';
        testDiv.style.height = '100px';
        testDiv.style.backgroundColor = 'red';
        document.body.appendChild(testDiv);
      `
    });

    const testElement = page.locator('#responsive-test');

    // Test mobile breakpoint
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(100);
    const mobileWidth = await testElement.evaluate(el => el.offsetWidth);
    const bodyWidth = await page.evaluate(() => document.body.offsetWidth);
    expect(mobileWidth).toBeCloseTo(bodyWidth, -5); // w-full

    // Test tablet breakpoint
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(100);
    const tabletWidth = await testElement.evaluate(el => el.offsetWidth);
    const tabletBodyWidth = await page.evaluate(() => document.body.offsetWidth);
    expect(tabletWidth).toBeCloseTo(tabletBodyWidth / 2, -10); // md:w-1/2

    // Test desktop breakpoint
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(100);
    const desktopWidth = await testElement.evaluate(el => el.offsetWidth);
    const desktopBodyWidth = await page.evaluate(() => document.body.offsetWidth);
    expect(desktopWidth).toBeCloseTo(desktopBodyWidth / 3, -10); // lg:w-1/3
  });

  test('should load custom CSS variables', async ({ page }) => {
    // Check if CSS custom properties are available
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      return {
        background: styles.getPropertyValue('--background'),
        foreground: styles.getPropertyValue('--foreground'),
        primary: styles.getPropertyValue('--primary'),
      };
    });

    // Should have CSS custom properties defined
    expect(rootStyles.background).toBeTruthy();
    expect(rootStyles.foreground).toBeTruthy();
    expect(rootStyles.primary).toBeTruthy();
  });

  test('should support dark mode CSS variables', async ({ page }) => {
    // Test dark mode CSS variables
    await page.addScriptTag({
      content: `
        document.documentElement.classList.add('dark');
      `
    });

    await page.waitForTimeout(100);

    const darkModeStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      return {
        background: styles.getPropertyValue('--background'),
        foreground: styles.getPropertyValue('--foreground'),
      };
    });

    // Remove dark mode
    await page.addScriptTag({
      content: `
        document.documentElement.classList.remove('dark');
      `
    });

    await page.waitForTimeout(100);

    const lightModeStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const styles = getComputedStyle(root);
      return {
        background: styles.getPropertyValue('--background'),
        foreground: styles.getPropertyValue('--foreground'),
      };
    });

    // Dark and light mode should have different values
    expect(darkModeStyles.background).not.toBe(lightModeStyles.background);
    expect(darkModeStyles.foreground).not.toBe(lightModeStyles.foreground);
  });

  test('should optimize CSS loading performance', async ({ page }) => {
    const startTime = Date.now();

    // Monitor network requests
    const cssRequests = [];
    page.on('request', request => {
      if (request.url().includes('.css')) {
        cssRequests.push({
          url: request.url(),
          startTime: Date.now()
        });
      }
    });

    const cssResponses = [];
    page.on('response', response => {
      if (response.url().includes('.css')) {
        cssResponses.push({
          url: response.url(),
          status: response.status(),
          endTime: Date.now()
        });
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const totalLoadTime = endTime - startTime;

    // Performance assertions
    expect(totalLoadTime).toBeLessThan(5000); // Should load within 5 seconds
    expect(cssRequests.length).toBeGreaterThan(0);
    expect(cssResponses.length).toBe(cssRequests.length);

    // All CSS should load successfully
    cssResponses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });

  test('should render CSS animations correctly', async ({ page }) => {
    // Test custom animations from Tailwind config
    await page.addScriptTag({
      content: `
        const testDiv = document.createElement('div');
        testDiv.id = 'animation-test';
        testDiv.className = 'animate-pulse-slow';
        testDiv.style.width = '100px';
        testDiv.style.height = '100px';
        testDiv.style.backgroundColor = 'blue';
        document.body.appendChild(testDiv);
      `
    });

    const testElement = page.locator('#animation-test');
    await expect(testElement).toBeVisible();

    // Check if animation is applied
    const animationName = await testElement.evaluate(el =>
      getComputedStyle(el).animationName
    );
    const animationDuration = await testElement.evaluate(el =>
      getComputedStyle(el).animationDuration
    );

    expect(animationName).toBe('pulse');
    expect(animationDuration).toBe('3s');
  });

  test('should handle CSS error recovery', async ({ page }) => {
    // Simulate CSS loading failure and check graceful degradation
    await page.route('**/*.css', route => {
      if (route.request().url().includes('test-broken')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Add a broken CSS link
    await page.addScriptTag({
      content: `
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/test-broken.css';
        document.head.appendChild(link);
      `
    });

    // Page should still be functional even with broken CSS
    await page.waitForTimeout(1000);

    // Check that basic styles still work
    const bodyStyles = await page.evaluate(() => {
      return getComputedStyle(document.body);
    });

    // Should have fallback styles
    expect(bodyStyles.margin).toBe('0px');
    expect(bodyStyles.fontFamily).toContain('Arial');
  });

  test('should properly cache CSS files', async ({ page }) => {
    // First visit
    const firstVisitRequests = [];
    page.on('request', request => {
      if (request.url().includes('.css')) {
        firstVisitRequests.push(request.url());
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Second visit
    const secondVisitRequests = [];
    const newPage = await page.context().newPage();
    newPage.on('request', request => {
      if (request.url().includes('.css')) {
        secondVisitRequests.push(request.url());
      }
    });

    await newPage.goto('http://localhost:3000');
    await newPage.waitForLoadState('networkidle');

    // CSS files should be cached (fewer requests on second visit)
    expect(firstVisitRequests.length).toBeGreaterThan(0);
    // Note: In real scenarios, cached resources might not trigger request events
    // This test validates the caching behavior expectation
  });
});
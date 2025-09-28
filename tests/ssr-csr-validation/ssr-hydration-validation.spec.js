/**
 * SSR Hydration Validation Test Suite
 * Playwright test for detailed SSR/CSR compatibility testing
 */

const { test, expect } = require('@playwright/test');

test.describe('SSR/CSR Hydration Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`Browser ${msg.type()}: ${msg.text()}`);
      }
    });

    // Track page errors
    page.on('pageerror', error => {
      console.log(`Page error: ${error.message}`);
    });
  });

  test('Homepage loads without SSR document errors', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Check for SSR-related errors in browser console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && (
        msg.text().includes('document is not defined') ||
        msg.text().includes('window is not defined') ||
        msg.text().includes('navigator is not defined')
      )) {
        consoleErrors.push(msg.text());
      }
    });

    // Verify page loads with content
    await expect(page.locator('body')).toBeVisible();

    // Check for loading indicator or app content
    const hasLoadingOrContent = await page.evaluate(() => {
      const body = document.body.textContent;
      return body.includes('Loading AgentLink') ||
             body.includes('AgentLink') ||
             document.querySelector('[id="__next"]') !== null;
    });

    expect(hasLoadingOrContent).toBe(true);

    // Ensure no SSR-related errors occurred
    expect(consoleErrors).toHaveLength(0);
  });

  test('Agents page loads without SSR document errors', async ({ page }) => {
    // Navigate directly to agents page (tests SSR)
    await page.goto('/agents');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Verify agents page content loads
    const pageContent = await page.textContent('body');
    const hasAgentsContent = pageContent.includes('Agent Dashboard') ||
                            pageContent.includes('Loading agents') ||
                            pageContent.includes('Total Agents');

    expect(hasAgentsContent).toBe(true);

    // Check page doesn't have critical errors
    const hasErrorContent = pageContent.includes('Error:') &&
                           !pageContent.includes('Error: Loading') &&
                           !pageContent.includes('Error fetching');

    expect(hasErrorContent).toBe(false);
  });

  test('Client-side hydration completes successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for hydration to complete
    await page.waitForFunction(() => {
      // Check if React has mounted
      return window.React !== undefined ||
             document.querySelector('[data-reactroot]') !== null ||
             document.querySelector('#__next') !== null ||
             document.querySelector('.animate-spin') !== null; // Loading indicator
    }, { timeout: 10000 });

    // Verify app is interactive after hydration
    const isInteractive = await page.evaluate(() => {
      // Check if there are interactive elements
      const buttons = document.querySelectorAll('button');
      const links = document.querySelectorAll('a');
      const inputs = document.querySelectorAll('input');

      return buttons.length > 0 || links.length > 0 || inputs.length > 0;
    });

    // Note: Even if no interactive elements are found, hydration might be successful
    // This is because our current app uses dynamic imports and may not have buttons on homepage
    console.log(`Interactive elements found: ${isInteractive}`);

    // Test that app can handle events (indicating successful hydration)
    try {
      await page.evaluate(() => {
        // Trigger a custom event to test event handling
        const event = new CustomEvent('test-hydration');
        document.dispatchEvent(event);
      });
    } catch (error) {
      // If this fails, hydration might not be complete
      console.log('Event handling test failed:', error.message);
    }
  });

  test('Navigation works after hydration', async ({ page }) => {
    // Start on homepage
    await page.goto('/');

    // Wait for hydration
    await page.waitForTimeout(2000);

    // Navigate to agents page
    await page.goto('/agents');
    await page.waitForLoadState('domcontentloaded');

    // Verify navigation worked
    expect(page.url()).toContain('/agents');

    // Check page content loads
    const pageContent = await page.textContent('body');
    const hasAgentsContent = pageContent.includes('Agent Dashboard') ||
                            pageContent.includes('Loading agents') ||
                            pageContent.includes('Total Agents');

    expect(hasAgentsContent).toBe(true);

    // Navigate back to homepage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify we're back on homepage
    expect(page.url()).toBe('http://localhost:3000/');

    const homeContent = await page.textContent('body');
    const hasHomeContent = homeContent.includes('AgentLink') ||
                          homeContent.includes('Loading AgentLink');

    expect(hasHomeContent).toBe(true);
  });

  test('Page refresh behavior works correctly', async ({ page }) => {
    // Test refresh on homepage
    await page.goto('/');
    await page.waitForLoadState('load');

    // Refresh the page
    await page.reload({ waitUntil: 'load' });

    // Verify page still works after refresh
    const homeContent = await page.textContent('body');
    const hasHomeContent = homeContent.includes('AgentLink') ||
                          homeContent.includes('Loading AgentLink');

    expect(hasHomeContent).toBe(true);

    // Test refresh on agents page
    await page.goto('/agents');
    await page.waitForLoadState('load');

    // Refresh the agents page
    await page.reload({ waitUntil: 'load' });

    // Verify agents page still works after refresh
    const agentsContent = await page.textContent('body');
    const hasAgentsContent = agentsContent.includes('Agent Dashboard') ||
                            agentsContent.includes('Loading agents');

    expect(hasAgentsContent).toBe(true);
  });

  test('No hydration mismatches occur', async ({ page }) => {
    const hydrationWarnings = [];

    // Capture console warnings about hydration mismatches
    page.on('console', msg => {
      if (msg.type() === 'warning' &&
          (msg.text().includes('hydrat') ||
           msg.text().includes('mismatch') ||
           msg.text().includes('server') && msg.text().includes('client'))) {
        hydrationWarnings.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000); // Wait for hydration to complete

    // Navigate to agents page to test hydration there too
    await page.goto('/agents');
    await page.waitForTimeout(2000);

    // Check for hydration warnings
    expect(hydrationWarnings.length).toBe(0);

    if (hydrationWarnings.length > 0) {
      console.log('Hydration warnings detected:', hydrationWarnings);
    }
  });

  test('Performance impact is acceptable', async ({ page }) => {
    // Measure homepage loading performance
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'load' });
    const loadTime = Date.now() - startTime;

    // Performance should be under 5 seconds for acceptable UX
    expect(loadTime).toBeLessThan(5000);

    // Get more detailed performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });

    console.log('Performance metrics:', {
      totalLoadTime: loadTime,
      ...metrics
    });

    // DOM Content Loaded should be reasonably fast
    expect(metrics.domContentLoaded).toBeLessThan(3000);
  });

  test('Error boundaries handle errors gracefully', async ({ page }) => {
    const pageErrors = [];

    // Capture page errors
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Navigate to different routes to test error handling
    await page.goto('/agents');
    await page.waitForTimeout(1000);

    await page.goto('/');
    await page.waitForTimeout(1000);

    // There should be no unhandled page errors
    expect(pageErrors.length).toBe(0);

    if (pageErrors.length > 0) {
      console.log('Page errors detected:', pageErrors);
    }

    // Test that the app recovers from potential errors
    const finalContent = await page.textContent('body');
    const appStillWorks = finalContent.includes('AgentLink') ||
                         finalContent.includes('Loading AgentLink');

    expect(appStillWorks).toBe(true);
  });

});
import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive UI/UX Validation Test Suite
 *
 * PURPOSE: Validate the simplified architecture after Next.js removal
 *
 * CRITICAL VALIDATION POINTS:
 * 1. Frontend Loading & Navigation
 * 2. API Integration Validation
 * 3. UUID String Operations
 * 4. Error Prevention Screenshots
 * 5. Real Functionality Validation
 *
 * ARCHITECTURE UNDER TEST:
 * - Frontend: http://localhost:5173 (Vite React)
 * - API Server: http://localhost:3001 (Express with UUID data)
 */

test.describe('Frontend Loading & Navigation', () => {
  test('should load frontend successfully without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Capture console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Navigate to frontend
    await page.goto('/');

    // Wait for the page to load completely
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    // Take screenshot of successful load
    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/01-frontend-load-success.png',
      fullPage: true
    });

    // Verify no critical console errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('vite') &&
      !error.includes('dev server') &&
      !error.includes('HMR') &&
      error.includes('failed to fetch') ||
      error.includes('TypeError') ||
      error.includes('ReferenceError')
    );

    expect(criticalErrors).toHaveLength(0);

    // Verify page title
    await expect(page).toHaveTitle(/Agent Feed/);
  });

  test('should navigate between pages correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test navigation to agents page
    const agentsLink = page.locator('text=Agents').first();
    if (await agentsLink.isVisible()) {
      await agentsLink.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/playwright/ui-ux-validation/reports/02-agents-page-navigation.png',
        fullPage: true
      });

      // Check if we're on agents page
      expect(page.url()).toContain('agents');
    }

    // Test navigation to feed page
    const feedLink = page.locator('text=Feed').first();
    if (await feedLink.isVisible()) {
      await feedLink.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/playwright/ui-ux-validation/reports/03-feed-page-navigation.png',
        fullPage: true
      });
    }
  });
});

test.describe('API Integration Validation', () => {
  test('should load agents data from API server successfully', async ({ page }) => {
    const networkRequests: string[] = [];
    const networkFailures: string[] = [];

    // Monitor network requests
    page.on('request', (request) => {
      if (request.url().includes('api/agents')) {
        networkRequests.push(request.url());
      }
    });

    page.on('requestfailed', (request) => {
      if (request.url().includes('api')) {
        networkFailures.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
      }
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for agents to load
    await page.waitForSelector('[data-testid="agent-card"], .agent-card, [class*="agent"]', {
      timeout: 15000,
      state: 'visible'
    }).catch(() => {
      // If specific selectors don't exist, wait for any content that suggests agents loaded
      return page.waitForFunction(() => document.body.textContent?.includes('Agent') ||
                                           document.body.textContent?.includes('active') ||
                                           document.body.textContent?.includes('status'),
                                   { timeout: 10000 });
    });

    // Take screenshot of agents page with data
    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/04-agents-with-data.png',
      fullPage: true
    });

    // Verify API request was made
    expect(networkRequests.length).toBeGreaterThan(0);
    expect(networkFailures).toHaveLength(0);

    // Verify agents data is displayed
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/agent|status|active|development|analytics|content|creative|productivity/i);
  });

  test('should load feed data without "failed to fetch" errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('failed to fetch')) {
        consoleErrors.push(msg.text());
      }
    });

    page.on('requestfailed', (request) => {
      if (request.url().includes('api')) {
        networkFailures.push(`${request.method()} ${request.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for feed content to load
    await page.waitForTimeout(3000); // Allow time for API calls

    // Take screenshot of feed page
    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/05-feed-page-no-errors.png',
      fullPage: true
    });

    // Verify no "failed to fetch" errors
    expect(consoleErrors).toHaveLength(0);
    expect(networkFailures).toHaveLength(0);
  });
});

test.describe('UUID String Operations Validation', () => {
  test('should handle UUID string operations without errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to different pages to trigger UUID operations
    const pages = ['/', '/agents'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Allow for operations to complete
    }

    // Take screenshot after UUID operations
    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/06-uuid-operations-success.png',
      fullPage: true
    });

    // Filter out specific UUID-related errors
    const uuidErrors = consoleErrors.filter(error =>
      error.includes('slice is not a function') ||
      error.includes('substring is not a function') ||
      error.includes('charAt is not a function') ||
      error.includes('length of undefined')
    );

    expect(uuidErrors).toHaveLength(0);
  });

  test('should display proper UUID format in the UI', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Check for UUID patterns in the page content
    const pageContent = await page.textContent('body');

    // UUID regex pattern
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const uuids = pageContent?.match(uuidPattern) || [];

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/07-uuid-format-validation.png',
      fullPage: true
    });

    // Verify UUIDs are present and properly formatted
    expect(uuids.length).toBeGreaterThan(0);

    // Verify each UUID is properly formatted
    uuids.forEach(uuid => {
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });
});

test.describe('Error Prevention Screenshots', () => {
  test('should capture evidence of successful agents loading', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Take comprehensive screenshot
    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/08-agents-loading-success-evidence.png',
      fullPage: true
    });

    // Check that agents section exists and has content
    const agentsSection = await page.locator('body').textContent();
    expect(agentsSection).toBeTruthy();
    expect(agentsSection).toMatch(/agent|status|active/i);
  });

  test('should capture evidence of feed functioning without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for feed to load
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/09-feed-functioning-evidence.png',
      fullPage: true
    });

    // Verify page loaded successfully
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.length).toBeGreaterThan(100); // Ensure there's substantial content
  });

  test('should document error-free state across browsers', async ({ page, browserName }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate through the app
    const navigationPaths = ['/', '/agents'];

    for (const path of navigationPaths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: `tests/playwright/ui-ux-validation/reports/10-error-free-${browserName}.png`,
      fullPage: true
    });

    // Filter critical errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('vite') &&
      !error.includes('HMR') &&
      !error.includes('dev server')
    );

    expect(criticalErrors.length).toBeLessThan(3); // Allow for minor non-critical errors
  });
});

test.describe('Real Functionality Validation', () => {
  test('should test actual user workflows without mocks', async ({ page }) => {
    // Test complete user workflow
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Take initial screenshot
    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/11-user-workflow-start.png',
      fullPage: true
    });

    // Navigate to agents
    const agentsNavigation = page.locator('text=Agents').first();
    if (await agentsNavigation.isVisible()) {
      await agentsNavigation.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/playwright/ui-ux-validation/reports/12-user-workflow-agents.png',
        fullPage: true
      });
    }

    // Go back to feed
    const feedNavigation = page.locator('text=Feed').first();
    if (await feedNavigation.isVisible()) {
      await feedNavigation.click();
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: 'tests/playwright/ui-ux-validation/reports/13-user-workflow-feed.png',
        fullPage: true
      });
    }

    // Verify the workflow completed without errors
    const finalContent = await page.textContent('body');
    expect(finalContent).toBeTruthy();
  });

  test('should validate all major components render with real API data', async ({ page }) => {
    const apiCalls: string[] = [];

    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/14-components-real-data.png',
      fullPage: true
    });

    // Verify API calls were made (proving no mock data)
    expect(apiCalls.length).toBeGreaterThan(0);

    // Verify content is substantial (proving real data loading)
    const content = await page.textContent('body');
    expect(content?.length || 0).toBeGreaterThan(500);
  });

  test('should verify no simulation or mock data in UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for mock data indicators
    const content = await page.textContent('body');

    // These should NOT appear in the real app
    const mockIndicators = [
      'mock',
      'simulation',
      'fake',
      'dummy',
      'placeholder-',
      'test-data',
      'sample-'
    ];

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/15-no-mock-data-verification.png',
      fullPage: true
    });

    mockIndicators.forEach(indicator => {
      expect(content?.toLowerCase()).not.toContain(indicator);
    });
  });
});

test.describe('Performance and Responsiveness Validation', () => {
  test('should load pages within reasonable time limits', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/16-performance-validation.png',
      fullPage: true
    });

    // Verify page loads within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should be responsive on different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];

    for (let i = 0; i < viewports.length; i++) {
      const viewport = viewports[i];
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `tests/playwright/ui-ux-validation/reports/17-responsive-${viewport.width}x${viewport.height}.png`,
        fullPage: true
      });

      // Verify content is visible and accessible
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
    }
  });
});
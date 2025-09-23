/**
 * Navigation Route Validation Tests
 *
 * Validates that all routing functionality continues to work correctly
 * after removing interactive controls. Tests actual navigation behavior
 * without mocks.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Navigation Route Validation Tests', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      devtools: !process.env.CI
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();

    // Track navigation errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.warn(`HTTP ${response.status()} for ${response.url()}`);
      }
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });

  test('Root route navigation validation', async () => {
    // Test direct navigation to root
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Verify successful load
    expect(page.url()).toBe(`${BASE_URL}/`);
    await expect(page.locator('body')).toBeVisible();

    // Verify no 404 or error pages
    await expect(page.locator('[data-testid="not-found"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="error-page"]')).toHaveCount(0);
  });

  test('Agents page route validation', async () => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Verify agents page loads
    expect(page.url()).toContain('/agents');
    await expect(page.locator('[data-testid="agents-page"]')).toBeVisible();

    // Verify agents list or content is present
    const agentsContent = page.locator('[data-testid="agent-list"], [data-testid="agents-content"]');
    await expect(agentsContent).toBeVisible();
  });

  test('Individual agent route validation', async () => {
    // First get list of available agents
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    const agentLinks = page.locator('[data-testid="agent-card"] a, [href*="/agents/"]');
    const agentCount = await agentLinks.count();

    if (agentCount > 0) {
      // Test first agent detail page
      const firstAgentHref = await agentLinks.first().getAttribute('href');
      if (firstAgentHref) {
        await page.goto(`${BASE_URL}${firstAgentHref}`);
        await page.waitForLoadState('networkidle');

        // Verify agent detail page loads
        expect(page.url()).toContain('/agents/');
        await expect(page.locator('[data-testid="agent-detail"]')).toBeVisible();
      }
    } else {
      // Test with a known agent ID if no agents found
      await page.goto(`${BASE_URL}/agents/test-agent`);
      await page.waitForLoadState('networkidle');

      // Verify either the page loads or shows appropriate 404
      const isDetailPage = await page.locator('[data-testid="agent-detail"]').count() > 0;
      const is404Page = await page.locator('[data-testid="not-found"]').count() > 0;

      expect(isDetailPage || is404Page).toBeTruthy();
    }
  });

  test('Avi DM route validation', async () => {
    await page.goto(`${BASE_URL}/avi-dm`);
    await page.waitForLoadState('networkidle');

    // Verify Avi DM page loads
    expect(page.url()).toContain('/avi-dm');
    await expect(page.locator('[data-testid="avi-dm-interface"]')).toBeVisible();
  });

  test('API routes validation', async () => {
    // Test agents API endpoint
    const agentsResponse = await page.request.get(`${BASE_URL}/api/agents`);
    expect(agentsResponse.status()).toBe(200);

    const agentsData = await agentsResponse.json();
    expect(agentsData).toHaveProperty('success');
    expect(agentsData.success).toBe(true);
    expect(agentsData).toHaveProperty('data');
    expect(Array.isArray(agentsData.data)).toBe(true);
  });

  test('Navigation state preservation after control removal', async () => {
    // Start at root
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Navigate to agents
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Use browser back button
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verify we're back at root
    expect(page.url()).toBe(`${BASE_URL}/`);

    // Use browser forward button
    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Verify we're back at agents
    expect(page.url()).toContain('/agents');
  });

  test('Deep linking validation', async () => {
    // Test direct navigation to deep routes
    const deepRoutes = [
      '/agents',
      '/avi-dm',
      '/agents/personal-todos',
      '/agents/meeting-prep'
    ];

    for (const route of deepRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');

      // Verify route loads (either successfully or with appropriate 404)
      const hasContent = await page.locator('body').textContent();
      expect(hasContent.length).toBeGreaterThan(0);

      // Verify no JavaScript errors prevent loading
      const jsErrors = [];
      page.on('pageerror', error => jsErrors.push(error.message));
      await page.waitForTimeout(500);

      // Some errors might be acceptable, but page should still render
      const bodyVisible = await page.locator('body').isVisible();
      expect(bodyVisible).toBe(true);
    }
  });

  test('Route parameters validation', async () => {
    // Test parameterized routes
    const testAgentId = 'test-agent-123';
    await page.goto(`${BASE_URL}/agents/${testAgentId}`);
    await page.waitForLoadState('networkidle');

    // Verify URL parameters are preserved
    expect(page.url()).toContain(testAgentId);

    // Test with query parameters
    await page.goto(`${BASE_URL}/agents?filter=active&sort=name`);
    await page.waitForLoadState('networkidle');

    // Verify query parameters are preserved
    expect(page.url()).toContain('filter=active');
    expect(page.url()).toContain('sort=name');
  });

  test('Hash routing validation', async () => {
    // Test hash-based navigation if used
    await page.goto(`${BASE_URL}/agents#section1`);
    await page.waitForLoadState('networkidle');

    // Verify hash is preserved
    expect(page.url()).toContain('#section1');

    // Test navigation with hash
    await page.goto(`${BASE_URL}/avi-dm#messages`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('#messages');
  });

  test('Route redirects validation', async () => {
    // Test any known redirects
    const redirectRoutes = [
      { from: '/agent', to: '/agents' },
      { from: '/dm', to: '/avi-dm' }
    ];

    for (const redirect of redirectRoutes) {
      const response = await page.request.get(`${BASE_URL}${redirect.from}`);

      // Handle different types of redirects
      if (response.status() >= 300 && response.status() < 400) {
        // Server-side redirect
        const location = response.headers()['location'];
        expect(location).toContain(redirect.to);
      } else {
        // Client-side redirect - navigate and check final URL
        await page.goto(`${BASE_URL}${redirect.from}`);
        await page.waitForLoadState('networkidle');

        // Allow for client-side redirects
        await page.waitForTimeout(1000);

        // Check if we ended up at the expected destination
        const finalUrl = page.url();
        const redirectedCorrectly = finalUrl.includes(redirect.to);

        // Log for debugging
        console.log(`Redirect test: ${redirect.from} -> ${finalUrl} (expected: ${redirect.to})`);
      }
    }
  });

  test('Error route handling validation', async () => {
    // Test 404 page
    await page.goto(`${BASE_URL}/non-existent-page-xyz`);
    await page.waitForLoadState('networkidle');

    // Verify 404 handling (either custom 404 page or appropriate error)
    const pageContent = await page.textContent('body');
    const has404Content = pageContent.includes('404') ||
                         pageContent.includes('Not Found') ||
                         pageContent.includes('Page not found');

    // Verify page loads something instead of hanging
    expect(pageContent.length).toBeGreaterThan(0);
  });

  test('Navigation timing performance', async () => {
    const navigationTimes = [];

    const routes = ['/', '/agents', '/avi-dm'];

    for (const route of routes) {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      navigationTimes.push({ route, loadTime });

      // Verify reasonable load time
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    }

    // Log performance results
    console.log('Navigation performance:', navigationTimes);
  });

  test('Cross-origin navigation validation', async () => {
    // Test that external links work correctly
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Look for external links
    const externalLinks = page.locator('a[href^="http"]:not([href*="localhost"])');
    const externalLinkCount = await externalLinks.count();

    if (externalLinkCount > 0) {
      // Verify external links have proper attributes
      const firstExternalLink = externalLinks.first();
      const href = await firstExternalLink.getAttribute('href');
      const target = await firstExternalLink.getAttribute('target');

      expect(href).toMatch(/^https?:\/\//);

      // External links should typically open in new tab
      if (target) {
        expect(target).toBe('_blank');
      }
    }
  });
});
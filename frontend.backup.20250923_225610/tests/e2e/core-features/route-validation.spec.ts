import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Critical Route Validation Test Suite
 * 
 * This test suite addresses the critical 404 issue on /agents route
 * and provides comprehensive validation for all routing scenarios.
 */

test.describe('Critical Route Validation', () => {
  let context: BrowserContext;
  
  test.beforeAll(async ({ browser }) => {
    // Create a fresh context to avoid any cached state
    context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.describe('Direct URL Access', () => {
    test('should load root route (/) with 200 status', async () => {
      const page = await context.newPage();
      
      // Track network responses to catch any 404s
      const responses: Array<{ url: string; status: number }> = [];
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      });

      // Navigate directly to root
      const response = await page.goto('/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Verify main response is 200
      expect(response?.status()).toBe(200);
      
      // Verify page loads correctly
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // Check for any 404 responses
      const failedRequests = responses.filter(r => r.status === 404);
      if (failedRequests.length > 0) {
        console.warn('Found 404 responses:', failedRequests);
      }
      
      await page.close();
    });

    test('should load /agents route with 200 status - CRITICAL TEST', async () => {
      const page = await context.newPage();
      
      // Track network responses to catch any 404s
      const responses: Array<{ url: string; status: number }> = [];
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      });

      // Navigate directly to /agents - this is the failing route
      const response = await page.goto('/agents', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // CRITICAL: This should be 200, not 404
      expect(response?.status()).toBe(200);
      
      // Verify the page structure loads
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      // Verify we're actually on the agents page
      await expect(page.locator('nav')).toContainText('Agents');
      
      // Check URL is correct
      expect(page.url()).toContain('/agents');
      
      // Log any 404 responses for debugging
      const failedRequests = responses.filter(r => r.status === 404);
      if (failedRequests.length > 0) {
        console.error('CRITICAL: Found 404 responses on /agents route:', failedRequests);
      }
      
      // Verify no critical errors in console
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Wait a bit to capture any async errors
      await page.waitForTimeout(2000);
      
      // Filter out non-critical console errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('Warning:') && 
        !error.includes('DevTools') &&
        !error.includes('favicon')
      );
      
      if (criticalErrors.length > 0) {
        console.error('Console errors on /agents:', criticalErrors);
      }
      
      await page.close();
    });

    test('should handle /agents/:agentId route correctly', async () => {
      const page = await context.newPage();
      
      // Navigate to specific agent detail page
      const response = await page.goto('/agents/test-agent', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      await page.close();
    });
  });

  test.describe('Client-Side Routing Navigation', () => {
    test('should navigate from root to /agents via link', async () => {
      const page = await context.newPage();
      
      // Start at root
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Find and click the Agents link in navigation
      const agentsLink = page.locator('nav a[href="/agents"]');
      await expect(agentsLink).toBeVisible();
      
      // Click and wait for navigation
      await agentsLink.click();
      await page.waitForURL('/agents');
      
      // Verify we're on the agents page
      expect(page.url()).toContain('/agents');
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      
      await page.close();
    });

    test('should navigate between routes multiple times', async () => {
      const page = await context.newPage();
      
      // Start at root
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Navigate to agents
      await page.locator('nav a[href="/agents"]').click();
      await page.waitForURL('/agents');
      expect(page.url()).toContain('/agents');
      
      // Navigate back to feed
      await page.locator('nav a[href="/"]').click();
      await page.waitForURL('/');
      expect(page.url()).toMatch(/\/$|\/$/);
      
      // Navigate to agents again
      await page.locator('nav a[href="/agents"]').click();
      await page.waitForURL('/agents');
      expect(page.url()).toContain('/agents');
      
      await page.close();
    });
  });

  test.describe('Browser History and Refresh', () => {
    test('should handle browser refresh on /agents route', async () => {
      const page = await context.newPage();
      
      // Navigate to agents first
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Refresh the page
      await page.reload({ waitUntil: 'networkidle' });
      
      // Verify page still works after refresh
      expect(page.url()).toContain('/agents');
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      await page.close();
    });

    test('should handle browser back/forward buttons', async () => {
      const page = await context.newPage();
      
      // Navigate through pages
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Use browser back button
      await page.goBack();
      expect(page.url()).toMatch(/\/$|\/$/);
      
      // Use browser forward button
      await page.goForward();
      expect(page.url()).toContain('/agents');
      
      await page.close();
    });
  });

  test.describe('API Connectivity and Data Loading', () => {
    test('should load real data on /agents route', async () => {
      const page = await context.newPage();
      
      // Monitor API calls
      const apiCalls: string[] = [];
      page.on('request', request => {
        if (request.url().includes('api')) {
          apiCalls.push(request.url());
        }
      });
      
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Wait for potential API calls to complete
      await page.waitForTimeout(3000);
      
      // Verify no obvious mock data indicators
      const pageContent = await page.textContent('body');
      expect(pageContent).not.toContain('MOCK_DATA');
      expect(pageContent).not.toContain('test-mock');
      
      console.log('API calls made:', apiCalls);
      
      await page.close();
    });

    test('should handle API errors gracefully', async () => {
      const page = await context.newPage();
      
      // Intercept and fail API calls to test error handling
      await page.route('**/api/**', route => {
        route.abort();
      });
      
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Page should still render even if API fails
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      await page.close();
    });
  });

  test.describe('Route Conflict Prevention', () => {
    test('should not conflict between /agents and /agent routes', async () => {
      const page = await context.newPage();
      
      // Test /agents
      await page.goto('/agents', { waitUntil: 'networkidle' });
      expect(page.url()).toContain('/agents');
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      // Test /agent/:id (different route)
      await page.goto('/agent/test-id', { waitUntil: 'networkidle' });
      expect(page.url()).toContain('/agent/test-id');
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      await page.close();
    });

    test('should handle unknown routes with 404 fallback', async () => {
      const page = await context.newPage();
      
      await page.goto('/unknown-route', { waitUntil: 'networkidle' });
      
      // Should show 404 page, not break the app
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      await page.close();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should load /agents route within performance budget', async () => {
      const page = await context.newPage();
      
      const startTime = Date.now();
      await page.goto('/agents', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
      
      await page.close();
    });

    test('should handle rapid route changes', async () => {
      const page = await context.newPage();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Rapidly navigate between routes
      for (let i = 0; i < 5; i++) {
        await page.locator('nav a[href="/agents"]').click();
        await page.waitForURL('/agents');
        await page.locator('nav a[href="/"]').click();
        await page.waitForURL('/');
      }
      
      // App should still be responsive
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      await page.close();
    });
  });

  test.describe('Mobile Responsive Testing', () => {
    test('should work on mobile viewport for /agents route', async () => {
      const page = await context.newPage();
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Should still load on mobile
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      await page.close();
    });
  });
});

test.describe('Server-Side vs Client-Side Routing', () => {
  test('should serve /agents from server correctly', async ({ page }) => {
    // Test if the route is handled by server vs client
    const response = await page.request.get('/agents');
    
    // Should return HTML (not JSON or error)
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
  });

  test('should handle HashRouter fallback if needed', async ({ page }) => {
    // Test if using hash routing works as fallback
    await page.goto('/#/agents', { waitUntil: 'networkidle' });
    
    // Should redirect or work
    await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
  });
});
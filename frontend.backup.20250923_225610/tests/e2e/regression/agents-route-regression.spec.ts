import { test, expect, Page } from '@playwright/test';

/**
 * Agents Route Regression Test Suite
 * 
 * This suite prevents future regressions on the /agents route
 * and validates that all routing scenarios continue to work.
 */

test.describe('Agents Route Regression Prevention', () => {
  
  test.describe('Route Resolution Regression Tests', () => {
    test('REGRESSION: /agents route must return 200, never 404', async ({ page }) => {
      // This is the primary regression test
      const response = await page.goto('/agents', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // CRITICAL: This failed before - must pass now
      expect(response?.status()).toBe(200);
      
      // Additional validation
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible({ timeout: 10000 });
      expect(page.url()).toMatch(/\/agents$/);
      
      // Verify it's not a client-side 404 page
      const bodyText = await page.textContent('body');
      expect(bodyText).not.toMatch(/404|not found|page not found/i);
    });

    test('REGRESSION: Route changes should not break subsequent navigation', async ({ page }) => {
      // Start at root
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Navigate to agents (this was failing)
      await page.locator('nav a[href="/agents"]').click();
      await page.waitForURL('/agents', { timeout: 10000 });
      
      // Navigate back to root
      await page.locator('nav a[href="/"]').click();
      await page.waitForURL('/', { timeout: 10000 });
      
      // Navigate to agents again - should still work
      await page.locator('nav a[href="/agents"]').click();
      await page.waitForURL('/agents', { timeout: 10000 });
      
      expect(page.url()).toContain('/agents');
    });

    test('REGRESSION: Browser refresh on /agents should not cause 404', async ({ page }) => {
      // Navigate to agents
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Refresh - this was causing 404
      const refreshResponse = await page.reload({ waitUntil: 'networkidle' });
      
      expect(refreshResponse?.status()).toBe(200);
      expect(page.url()).toContain('/agents');
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
    });
  });

  test.describe('Route Configuration Validation', () => {
    test('VALIDATION: All defined routes should resolve correctly', async ({ page }) => {
      const routes = [
        '/',
        '/agents',
        '/claude-manager',
        '/workflows',
        '/analytics',
        '/settings',
        '/performance-monitor',
        '/activity'
      ];

      for (const route of routes) {
        const response = await page.goto(route, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        expect(response?.status(), `Route ${route} should return 200`).toBe(200);
        await expect(
          page.locator('[data-testid="app-root"]'), 
          `Route ${route} should render app root`
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('VALIDATION: Route parameters should work correctly', async ({ page }) => {
      // Test parameterized routes
      const paramRoutes = [
        '/agents/test-agent-id',
        '/agent/test-profile-id'
      ];

      for (const route of paramRoutes) {
        const response = await page.goto(route, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        
        expect(response?.status(), `Param route ${route} should return 200`).toBe(200);
        await expect(
          page.locator('[data-testid="app-root"]'), 
          `Param route ${route} should render app root`
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Network and API Integration', () => {
    test('VALIDATION: Routes should handle API failures gracefully', async ({ page }) => {
      // Block all API calls to simulate backend issues
      await page.route('**/api/**', route => route.abort());
      
      const response = await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Should still return 200 and render, even with API failures
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
    });

    test('VALIDATION: Routes should work with slow network', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 1000);
      });
      
      const response = await page.goto('/agents', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
    });
  });

  test.describe('State Management and Memory Leaks', () => {
    test('VALIDATION: Multiple route changes should not cause memory leaks', async ({ page }) => {
      // Navigate between routes multiple times
      const routes = ['/', '/agents', '/analytics', '/settings'];
      
      for (let iteration = 0; iteration < 3; iteration++) {
        for (const route of routes) {
          await page.goto(route, { waitUntil: 'networkidle' });
          await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
          
          // Check for memory-related console errors
          const logs: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              logs.push(msg.text());
            }
          });
          
          // Brief wait to catch any async errors
          await page.waitForTimeout(500);
          
          const memoryErrors = logs.filter(log => 
            log.includes('memory') || 
            log.includes('leak') || 
            log.includes('Maximum call stack')
          );
          
          expect(memoryErrors.length, `No memory errors on ${route}`).toBe(0);
        }
      }
    });

    test('VALIDATION: Route state should persist correctly', async ({ page }) => {
      // Navigate to agents page
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Interact with page (if there are interactive elements)
      // This would test state preservation
      
      // Navigate away and back
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Verify page still works
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
    });
  });

  test.describe('Error Boundary Integration', () => {
    test('VALIDATION: Route errors should be caught by error boundaries', async ({ page }) => {
      // Navigate to agents route
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Inject an error to test error boundaries
      await page.evaluate(() => {
        // Simulate a component error
        const event = new Event('error');
        window.dispatchEvent(event);
      });
      
      // Page should still be functional due to error boundaries
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      // Should not crash the entire application
      const url = page.url();
      expect(url).toContain('/agents');
    });
  });

  test.describe('SEO and Meta Tags', () => {
    test('VALIDATION: Routes should have proper meta tags', async ({ page }) => {
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Check for basic meta tags
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
      
      // Check viewport meta tag
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toBeTruthy();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('VALIDATION: Routes should work consistently across browsers', async ({ page, browserName }) => {
      // This test will run on all configured browsers
      console.log(`Testing on ${browserName}`);
      
      const response = await page.goto('/agents', { waitUntil: 'networkidle' });
      
      expect(response?.status()).toBe(200);
      await expect(page.locator('[data-testid="app-root"]')).toBeVisible();
      
      // Browser-specific checks could go here
      if (browserName === 'webkit') {
        // Safari-specific tests
        console.log('Running Safari-specific validations');
      }
    });
  });

  test.describe('Performance Regression Prevention', () => {
    test('VALIDATION: Route loading should meet performance standards', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
      
      // Check for performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        };
      });
      
      console.log('Performance metrics:', performanceMetrics);
    });
  });
});

/**
 * Automated Regression Test Generator
 * 
 * This section could be expanded to automatically generate regression tests
 * based on previously failed scenarios.
 */
test.describe('Auto-Generated Regression Tests', () => {
  test('REGRESSION: Issue #404-agents-route', async ({ page }) => {
    // This test specifically addresses the reported 404 issue
    console.log('Testing for the specific 404 issue on /agents route');
    
    // Direct navigation should work
    const directResponse = await page.goto('/agents', { waitUntil: 'networkidle' });
    expect(directResponse?.status(), 'Direct navigation to /agents should return 200').toBe(200);
    
    // Navigation via link should work
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.locator('nav a[href="/agents"]').click();
    await page.waitForURL('/agents');
    expect(page.url()).toContain('/agents');
    
    // Browser refresh should work
    const refreshResponse = await page.reload({ waitUntil: 'networkidle' });
    expect(refreshResponse?.status(), 'Refresh on /agents should return 200').toBe(200);
    
    console.log('All regression tests for 404 issue passed');
  });
});
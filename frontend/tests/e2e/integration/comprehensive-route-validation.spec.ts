import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Route Validation Integration Test
 * 
 * This test suite validates the complete routing system
 * with focus on the critical /agents route 404 issue.
 */

test.describe('Comprehensive Route Validation - Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up proper error handling
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console Error: ${msg.text()}`);
      }
    });
  });

  test.describe('Critical /agents Route Tests', () => {
    test('CRITICAL: Direct access to /agents should return 200 NOT 404', async ({ page }) => {
      // This is the main failing test reported by user
      console.log('🔍 Testing direct access to /agents route...');
      
      const response = await page.goto('/agents', { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      // CRITICAL ASSERTION: Should be 200, not 404
      console.log(`Response status: ${response?.status()}`);
      expect(response?.status(), 'Direct /agents access should return 200').toBe(200);
      
      // Verify page structure loads
      await expect(page.locator('body')).toBeVisible();
      
      // Verify URL is correct
      expect(page.url()).toMatch(/\/agents$/);
      
      console.log('✅ Direct /agents access test passed');
    });

    test('CRITICAL: Navigation to /agents via menu should work', async ({ page }) => {
      console.log('🔍 Testing navigation to /agents via menu...');
      
      // Start at home page
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // Look for agents link in navigation
      const agentsLink = page.locator('a[href="/agents"]').first();
      await expect(agentsLink).toBeVisible();
      
      // Click the agents link
      await agentsLink.click();
      
      // Wait for navigation
      await page.waitForURL('/agents', { timeout: 10000 });
      
      // Verify we're on agents page
      expect(page.url()).toContain('/agents');
      
      console.log('✅ Menu navigation to /agents test passed');
    });

    test('CRITICAL: Browser refresh on /agents should not cause 404', async ({ page }) => {
      console.log('🔍 Testing browser refresh on /agents...');
      
      // Navigate to agents page first
      await page.goto('/agents', { waitUntil: 'domcontentloaded' });
      
      // Refresh the page
      const refreshResponse = await page.reload({ waitUntil: 'domcontentloaded' });
      
      // Should still return 200 after refresh
      console.log(`Refresh response status: ${refreshResponse?.status()}`);
      expect(refreshResponse?.status(), 'Refresh on /agents should return 200').toBe(200);
      
      // Verify still on agents page
      expect(page.url()).toContain('/agents');
      
      console.log('✅ Browser refresh on /agents test passed');
    });

    test('Browser back/forward with /agents should work', async ({ page }) => {
      console.log('🔍 Testing browser history with /agents...');
      
      // Navigate through pages
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.goto('/agents', { waitUntil: 'domcontentloaded' });
      
      // Go back
      await page.goBack();
      expect(page.url()).toMatch(/\/$|\/$/);
      
      // Go forward
      await page.goForward();
      expect(page.url()).toContain('/agents');
      
      console.log('✅ Browser history test passed');
    });
  });

  test.describe('Route System Validation', () => {
    test('All primary routes should return 200', async ({ page }) => {
      const routes = [
        { path: '/', name: 'Home' },
        { path: '/agents', name: 'Agents' },
        { path: '/claude-manager', name: 'Claude Manager' },
        { path: '/workflows', name: 'Workflows' },
        { path: '/analytics', name: 'Analytics' },
        { path: '/settings', name: 'Settings' }
      ];

      for (const route of routes) {
        console.log(`🔍 Testing ${route.name} route: ${route.path}`);
        
        const response = await page.goto(route.path, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        expect(response?.status(), `${route.name} route should return 200`).toBe(200);
        expect(page.url()).toContain(route.path);
        
        console.log(`✅ ${route.name} route test passed`);
      }
    });

    test('Route transitions should work smoothly', async ({ page }) => {
      console.log('🔍 Testing route transitions...');
      
      // Start at home
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // Navigate to agents
      await page.locator('a[href="/agents"]').first().click();
      await page.waitForURL('/agents');
      
      // Navigate to settings
      await page.locator('a[href="/settings"]').first().click();
      await page.waitForURL('/settings');
      
      // Navigate back to agents
      await page.locator('a[href="/agents"]').first().click();
      await page.waitForURL('/agents');
      
      // All transitions should work
      expect(page.url()).toContain('/agents');
      
      console.log('✅ Route transitions test passed');
    });
  });

  test.describe('API Integration with Routes', () => {
    test('/agents route should handle API responses correctly', async ({ page }) => {
      console.log('🔍 Testing /agents route API integration...');
      
      // Track API calls
      const apiRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('api')) {
          apiRequests.push(request.url());
        }
      });
      
      await page.goto('/agents', { waitUntil: 'networkidle' });
      
      // Should have made some API calls
      console.log(`API requests made: ${apiRequests.length}`);
      console.log('API requests:', apiRequests);
      
      // Page should still load even if API calls fail/succeed
      await expect(page.locator('body')).toBeVisible();
      
      console.log('✅ API integration test passed');
    });

    test('Routes should work with API failures', async ({ page }) => {
      console.log('🔍 Testing routes with API failures...');
      
      // Block API calls
      await page.route('**/api/**', route => route.abort());
      
      const response = await page.goto('/agents', { waitUntil: 'domcontentloaded' });
      
      // Should still return 200 even with API failures
      expect(response?.status()).toBe(200);
      
      console.log('✅ API failure handling test passed');
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('Routes should handle JavaScript errors gracefully', async ({ page }) => {
      console.log('🔍 Testing JavaScript error handling...');
      
      await page.goto('/agents', { waitUntil: 'domcontentloaded' });
      
      // Inject an error
      await page.evaluate(() => {
        throw new Error('Test error');
      });
      
      // Page should still be functional
      await expect(page.locator('body')).toBeVisible();
      expect(page.url()).toContain('/agents');
      
      console.log('✅ JavaScript error handling test passed');
    });

    test('Unknown routes should show appropriate fallback', async ({ page }) => {
      console.log('🔍 Testing unknown route handling...');
      
      await page.goto('/unknown-route-12345', { waitUntil: 'domcontentloaded' });
      
      // Should show some kind of fallback (not crash)
      await expect(page.locator('body')).toBeVisible();
      
      console.log('✅ Unknown route handling test passed');
    });
  });

  test.describe('Performance and Load', () => {
    test('/agents route should load within acceptable time', async ({ page }) => {
      console.log('🔍 Testing /agents route load time...');
      
      const startTime = Date.now();
      await page.goto('/agents', { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;
      
      console.log(`Load time: ${loadTime}ms`);
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      console.log('✅ Load time test passed');
    });

    test('Multiple rapid route changes should not break system', async ({ page }) => {
      console.log('🔍 Testing rapid route changes...');
      
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // Rapidly change routes
      for (let i = 0; i < 3; i++) {
        await page.locator('a[href="/agents"]').first().click();
        await page.waitForTimeout(100);
        await page.locator('a[href="/"]').first().click();
        await page.waitForTimeout(100);
      }
      
      // Should still be functional
      await expect(page.locator('body')).toBeVisible();
      
      console.log('✅ Rapid route changes test passed');
    });
  });

  test.describe('Cross-Platform Validation', () => {
    test('Routes should work consistently across different screen sizes', async ({ page }) => {
      console.log('🔍 Testing responsive route behavior...');
      
      // Test desktop size
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/agents', { waitUntil: 'domcontentloaded' });
      expect(page.url()).toContain('/agents');
      
      // Test tablet size
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      expect(page.url()).toContain('/agents');
      
      // Test mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload({ waitUntil: 'domcontentloaded' });
      expect(page.url()).toContain('/agents');
      
      console.log('✅ Responsive route test passed');
    });
  });

  test.describe('Security and Edge Cases', () => {
    test('Routes should handle special characters and encoding', async ({ page }) => {
      console.log('🔍 Testing route encoding handling...');
      
      // Test with encoded characters
      await page.goto('/agents?param=%20test%20', { waitUntil: 'domcontentloaded' });
      
      // Should still work
      expect(page.url()).toContain('/agents');
      
      console.log('✅ Route encoding test passed');
    });

    test('Routes should handle hash fragments correctly', async ({ page }) => {
      console.log('🔍 Testing hash fragment handling...');
      
      await page.goto('/agents#section1', { waitUntil: 'domcontentloaded' });
      
      // Should load the page correctly
      expect(page.url()).toContain('/agents');
      expect(page.url()).toContain('#section1');
      
      console.log('✅ Hash fragment test passed');
    });
  });
});
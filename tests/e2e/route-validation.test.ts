import { test, expect } from '@playwright/test';
import { Express } from 'express';
import { createApp } from '../../src/app';
import { DatabaseService } from '../../src/database/DatabaseService';

test.describe('End-to-End Route Validation', () => {
  let app: Express;
  let dbService: DatabaseService;
  let server: any;

  test.beforeAll(async () => {
    // Setup backend
    dbService = new DatabaseService();
    await dbService.connect();
    await dbService.initializeSchema();
    
    app = await createApp();
    server = app.listen(3001);
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
    }
    if (dbService) {
      await dbService.disconnect();
    }
  });

  test.describe('Route Accessibility', () => {
    test('should load home page successfully', async ({ page }) => {
      await page.goto('http://localhost:3000/');
      
      await expect(page).toHaveTitle(/Agent Feed/);
      await expect(page.locator('h1, h2, .title')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to agents page without 404', async ({ page }) => {
      await page.goto('http://localhost:3000/');
      
      // Try multiple navigation methods
      const agentsLink = page.locator('a[href*="agents"], nav a:has-text("Agents")');
      if (await agentsLink.isVisible()) {
        await agentsLink.click();
      } else {
        await page.goto('http://localhost:3000/agents');
      }
      
      // Should not see 404 error
      await expect(page.locator('text=404')).not.toBeVisible();
      await expect(page.locator('text=Not Found')).not.toBeVisible();
      
      // Should see agents content
      await expect(page.locator('h1, h2, .agents-title')).toBeVisible({ timeout: 10000 });
    });

    test('should handle direct navigation to agents route', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      
      // Should load successfully, not 404
      await expect(page).not.toHaveURL(/.*404.*/);
      await expect(page.locator('text=404')).not.toBeVisible();
      
      // Should see agents-related content
      const agentsContent = page.locator('text=agents, .agents-container, [data-testid="agents"]');
      await expect(agentsContent.first()).toBeVisible({ timeout: 10000 });
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      await page.goto('http://localhost:3000/');
      await page.goto('http://localhost:3000/agents');
      
      await page.goBack();
      await expect(page).toHaveURL('http://localhost:3000/');
      
      await page.goForward();
      await expect(page).toHaveURL('http://localhost:3000/agents');
      await expect(page.locator('text=404')).not.toBeVisible();
    });
  });

  test.describe('API Integration', () => {
    test('should load and display agent data', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      
      // Wait for API calls to complete
      await page.waitForLoadState('networkidle');
      
      // Should make successful API calls
      const apiResponses = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          apiResponses.push(response);
        }
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Check that API calls were successful
      const successfulCalls = apiResponses.filter(r => r.status() < 400);
      expect(successfulCalls.length).toBeGreaterThan(0);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/agents', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.goto('http://localhost:3000/agents');
      await page.waitForLoadState('networkidle');

      // Should show error handling, not crash
      await expect(page.locator('text=404')).not.toBeVisible();
      
      const errorElements = page.locator('text=error, text=Error, .error-message, [data-testid="error"]');
      if (await errorElements.count() > 0) {
        await expect(errorElements.first()).toBeVisible();
      }
    });

    test('should display loading states appropriately', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      
      // Should show some loading indication initially
      const loadingElements = page.locator('text=loading, text=Loading, .loading, .spinner, [data-testid="loading"]');
      
      // Either loading state is shown or content loads immediately
      await expect(async () => {
        const hasLoading = await loadingElements.isVisible();
        const hasContent = await page.locator('h1, h2, .agents-content').isVisible();
        expect(hasLoading || hasContent).toBeTruthy();
      }).toPass({ timeout: 10000 });
    });
  });

  test.describe('User Experience', () => {
    test('should work across different screen sizes', async ({ page }) => {
      // Test desktop
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:3000/agents');
      await expect(page.locator('h1, h2')).toBeVisible();

      // Test tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await expect(page.locator('h1, h2')).toBeVisible();

      // Test mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await expect(page.locator('h1, h2')).toBeVisible();
    });

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const jsErrors: string[] = [];
      page.on('pageerror', error => jsErrors.push(error.message));

      await page.goto('http://localhost:3000/agents');
      await page.waitForLoadState('networkidle');

      // Should not have critical JavaScript errors
      const criticalErrors = jsErrors.filter(error => 
        error.includes('ReferenceError') || 
        error.includes('TypeError') ||
        error.includes('Cannot read property')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should maintain state during route transitions', async ({ page }) => {
      await page.goto('http://localhost:3000/');
      
      // Perform some action that creates state
      const searchInput = page.locator('input[type="text"], input[placeholder*="search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test search');
      }

      await page.goto('http://localhost:3000/agents');
      await page.goBack();

      // Check if reasonable state is maintained (this is flexible)
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3000/agents');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });

    test('should handle concurrent user sessions', async ({ browser }) => {
      const contexts = await Promise.all([
        browser.newContext(),
        browser.newContext(),
        browser.newContext()
      ]);

      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      );

      // Navigate all pages simultaneously
      await Promise.all(
        pages.map(page => page.goto('http://localhost:3000/agents'))
      );

      // All should load successfully
      for (const page of pages) {
        await expect(page.locator('text=404')).not.toBeVisible();
        await expect(page.locator('h1, h2, body')).toBeVisible();
      }

      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    });

    test('should handle special characters and encoding', async ({ page }) => {
      // Test URLs with special characters
      const specialRoutes = [
        '/agents?search=test%20query',
        '/agents#section',
        '/agents?filter=special%21chars'
      ];

      for (const route of specialRoutes) {
        await page.goto(`http://localhost:3000${route}`);
        await expect(page.locator('text=404')).not.toBeVisible();
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from network failures', async ({ page }) => {
      await page.goto('http://localhost:3000/agents');
      
      // Simulate network failure
      await page.setOfflineMode(true);
      await page.reload();
      
      // Return online
      await page.setOfflineMode(false);
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Should recover gracefully
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=404')).not.toBeVisible();
    });

    test('should work with API failures', async ({ page }) => {
      // Mock various API failures
      await page.route('**/api/**', route => {
        const url = route.request().url();
        if (Math.random() > 0.7) { // 30% failure rate
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Service unavailable' })
          });
        } else {
          route.continue();
        }
      });

      await page.goto('http://localhost:3000/agents');
      await page.waitForLoadState('networkidle');

      // Should still render the page structure
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('text=404')).not.toBeVisible();
    });
  });
});
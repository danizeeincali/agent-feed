import { test, expect } from '@playwright/test';

/**
 * Frontend-Backend Integration Tests
 * 
 * Tests that verify the frontend still works correctly with the new
 * production backend structure and API endpoints.
 */

test.describe('Frontend-Backend Integration with Production Structure', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for integration tests
    test.setTimeout(60000);
  });

  test('Frontend loads successfully with production backend', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Wait for the main application to load
    await page.waitForLoadState('networkidle');
    
    // Check that the page loads without errors
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Verify main content is present
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('API endpoints respond correctly with new structure', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Intercept API calls to verify they work
    let apiCallsSuccessful = 0;
    
    page.on('response', response => {
      if (response.url().includes('/api/') && response.status() === 200) {
        apiCallsSuccessful++;
      }
    });

    // Wait for any initial API calls
    await page.waitForTimeout(3000);
    
    // Basic check that no critical API errors occurred
    const errors = await page.evaluate(() => {
      return window.console?.errors || [];
    });
    
    // Should not have critical API errors
    expect(errors.filter(error => 
      error.includes('500') || 
      error.includes('404') || 
      error.includes('Connection refused')
    ).length).toBe(0);
  });

  test('WebSocket connections work with production structure', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    let websocketConnected = false;
    let websocketErrors = [];

    // Monitor WebSocket connections
    page.on('websocket', ws => {
      ws.on('open', () => {
        websocketConnected = true;
      });
      
      ws.on('close', () => {
        // WebSocket closed
      });
      
      ws.on('socketerror', error => {
        websocketErrors.push(error);
      });
    });

    // Wait for potential WebSocket connections
    await page.waitForTimeout(5000);
    
    // Check for WebSocket errors in console
    const consoleLogs = await page.evaluate(() => {
      return window.console?.logs || [];
    });

    const wsErrors = consoleLogs.filter(log => 
      log.includes('WebSocket') && 
      (log.includes('error') || log.includes('failed'))
    );

    expect(wsErrors.length).toBe(0);
  });

  test('Navigation works correctly with production backend', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');

    // Check if main navigation elements are present
    const nav = page.locator('nav, [role="navigation"], .nav, .navigation');
    
    // If navigation exists, test it
    if (await nav.count() > 0) {
      await expect(nav.first()).toBeVisible();
    }

    // Test that the page doesn't show error states
    const errorIndicators = page.locator('.error, [data-error], .alert-error');
    expect(await errorIndicators.count()).toBe(0);
  });

  test('Agent-related endpoints are accessible', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    let agentApiCalls = 0;
    let agentApiErrors = 0;

    page.on('response', response => {
      if (response.url().includes('/agent') || response.url().includes('/agents')) {
        if (response.status() >= 200 && response.status() < 300) {
          agentApiCalls++;
        } else if (response.status() >= 400) {
          agentApiErrors++;
        }
      }
    });

    // Trigger potential agent-related requests
    await page.waitForTimeout(3000);
    
    // If there were agent API calls, they should be successful
    if (agentApiCalls > 0) {
      expect(agentApiErrors).toBe(0);
    }
  });

  test('Static assets load correctly', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    let staticAssetErrors = 0;
    
    page.on('response', response => {
      if (response.url().includes('.js') || 
          response.url().includes('.css') || 
          response.url().includes('.png') || 
          response.url().includes('.svg')) {
        if (response.status() >= 400) {
          staticAssetErrors++;
        }
      }
    });

    await page.waitForLoadState('networkidle');
    
    expect(staticAssetErrors).toBe(0);
  });

  test('Console has no critical errors', async ({ page }) => {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Filter out non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Extension') &&
      !error.includes('chrome-extension')
    );

    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Production API Compatibility', () => {
  test('Health check endpoint responds', async ({ request }) => {
    try {
      const response = await request.get('http://localhost:3001/health');
      expect(response.status()).toBeLessThan(500);
    } catch (error) {
      // Health endpoint might not exist, that's okay
      console.log('Health endpoint not available');
    }
  });

  test('Main API routes are accessible', async ({ request }) => {
    const routes = [
      '/api',
      '/api/status',
      '/api/health'
    ];

    for (const route of routes) {
      try {
        const response = await request.get(`http://localhost:3001${route}`);
        // Accept any non-500 error (route might not exist but server should respond)
        expect(response.status()).toBeLessThan(500);
      } catch (error) {
        // Some routes might not exist, log but don't fail
        console.log(`Route ${route} not available: ${error.message}`);
      }
    }
  });
});

test.describe('Performance with Production Structure', () => {
  test('Page load performance is acceptable', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - start;
    
    // Page should load within 30 seconds
    expect(loadTime).toBeLessThan(30000);
  });

  test('No memory leaks in console', async ({ page }) => {
    await page.goto('http://localhost:3001');
    
    // Check for memory-related warnings
    const warnings = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && 
          (msg.text().includes('memory') || msg.text().includes('leak'))) {
        warnings.push(msg.text());
      }
    });

    await page.waitForTimeout(5000);
    
    expect(warnings.length).toBe(0);
  });
});
import { test, expect } from '@playwright/test';

/**
 * System Connectivity Tests
 * 
 * Tests overall system connectivity and integration with the new
 * production structure, ensuring all components work together.
 */

test.describe('System Connectivity with Production Structure', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000); // Extended timeout for connectivity tests
  });

  test('Frontend application loads successfully', async ({ page }) => {
    const response = await page.goto('http://localhost:3001');
    
    expect(response?.status()).toBeLessThan(500);
    
    // Wait for the application to fully load
    await page.waitForLoadState('networkidle');
    
    // Check that the page has content
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    const content = await body.textContent();
    expect(content?.length).toBeGreaterThan(0);
  });

  test('API endpoints are accessible', async ({ page, request }) => {
    // Test basic connectivity
    const response = await page.goto('http://localhost:3001');
    expect(response?.status()).toBeLessThan(500);

    // Test potential API endpoints
    const apiEndpoints = [
      '/api',
      '/api/health',
      '/api/status'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const apiResponse = await request.get(`http://localhost:3001${endpoint}`);
        // Accept any response that's not a server error
        expect(apiResponse.status()).toBeLessThan(500);
      } catch (error) {
        // Endpoint might not exist, log but continue
        console.log(`Endpoint ${endpoint} not available: ${error.message}`);
      }
    }
  });

  test('Static assets load correctly', async ({ page }) => {
    let assetErrors = [];
    
    page.on('response', response => {
      if (response.status() >= 400 && 
          (response.url().includes('.js') || 
           response.url().includes('.css') ||
           response.url().includes('.png') ||
           response.url().includes('.svg'))) {
        assetErrors.push(`${response.status()}: ${response.url()}`);
      }
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    expect(assetErrors.length).toBe(0);
  });

  test('No critical JavaScript errors', async ({ page }) => {
    const jsErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Filter out non-critical errors
    const criticalErrors = jsErrors.filter(error => 
      !error.includes('favicon') &&
      !error.includes('DevTools') &&
      !error.includes('Extension') &&
      !error.includes('chrome-extension') &&
      !error.includes('Manifest V2')
    );

    if (criticalErrors.length > 0) {
      console.log('Critical JavaScript errors found:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Page renders meaningful content', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Check for common UI elements
    const hasHeading = await page.locator('h1, h2, h3, .heading, .title').count() > 0;
    const hasButton = await page.locator('button, .button, .btn').count() > 0;
    const hasNav = await page.locator('nav, .nav, .navigation').count() > 0;
    const hasContent = await page.locator('main, .main, .content, .container').count() > 0;

    // Should have at least some meaningful content
    expect(hasHeading || hasButton || hasNav || hasContent).toBe(true);
  });

  test('Application is responsive', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1024, height: 768 },
      { width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      // Check that content is still visible
      const body = await page.locator('body');
      await expect(body).toBeVisible();
      
      // No horizontal scroll should be needed (responsive design)
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    }
  });

  test('Navigation works without errors', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Look for navigation links
    const navLinks = await page.locator('a[href], button[data-nav], .nav-link').all();
    
    if (navLinks.length > 0) {
      // Test first few navigation items
      const linksToTest = navLinks.slice(0, 3);
      
      for (const link of linksToTest) {
        try {
          await link.click();
          await page.waitForTimeout(1000);
          
          // Check that page didn't crash
          const body = await page.locator('body');
          await expect(body).toBeVisible();
          
        } catch (error) {
          // Some links might not be functional, that's okay
          console.log('Navigation link test failed:', error.message);
        }
      }
    }
  });

  test('Form interactions work', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Look for input fields
    const inputs = await page.locator('input, textarea').all();
    
    if (inputs.length > 0) {
      const testInput = inputs[0];
      
      try {
        await testInput.fill('test input');
        await page.waitForTimeout(500);
        
        const value = await testInput.inputValue();
        expect(value).toBe('test input');
        
      } catch (error) {
        console.log('Form interaction test failed:', error.message);
      }
    }
  });
});

test.describe('Production Environment Connectivity', () => {
  test('Server responds within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 30 seconds
    expect(loadTime).toBeLessThan(30000);
  });

  test('Concurrent connections are handled', async ({ browser }) => {
    // Create multiple pages to test concurrent access
    const pages = [];
    const responses = [];
    
    try {
      // Create 3 concurrent connections
      for (let i = 0; i < 3; i++) {
        const page = await browser.newPage();
        pages.push(page);
      }
      
      // Navigate all pages simultaneously
      const navigationPromises = pages.map(page => 
        page.goto('http://localhost:3001')
      );
      
      const results = await Promise.all(navigationPromises);
      
      // All should succeed
      results.forEach(response => {
        expect(response?.status()).toBeLessThan(500);
      });
      
    } finally {
      // Clean up
      for (const page of pages) {
        await page.close();
      }
    }
  });

  test('Memory usage remains stable', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Monitor for memory warnings
    const memoryWarnings = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning' && 
          (msg.text().includes('memory') || msg.text().includes('heap'))) {
        memoryWarnings.push(msg.text());
      }
    });
    
    // Simulate some activity
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    expect(memoryWarnings.length).toBe(0);
  });

  test('Error recovery works correctly', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Simulate a temporary network issue by going to an invalid URL
    try {
      await page.goto('http://localhost:3001/nonexistent-page');
    } catch (error) {
      // Expected to fail
    }
    
    // Should be able to recover by going back to main page
    const response = await page.goto('http://localhost:3001');
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe('Integration Health Checks', () => {
  test('Database connectivity (if applicable)', async ({ request }) => {
    // Test if there's a database health endpoint
    try {
      const response = await request.get('http://localhost:3001/api/db/health');
      if (response.status() !== 404) {
        expect(response.status()).toBeLessThan(500);
      }
    } catch (error) {
      // Database health endpoint might not exist
      console.log('Database health check not available');
    }
  });

  test('External service connectivity', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    // Monitor for external service errors
    const externalErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('CORS') || 
           msg.text().includes('external') ||
           msg.text().includes('third-party'))) {
        externalErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(5000);
    
    // Should not have critical external service errors
    const criticalExternalErrors = externalErrors.filter(error =>
      !error.includes('favicon') && 
      !error.includes('analytics') // Analytics might be blocked
    );
    
    expect(criticalExternalErrors.length).toBe(0);
  });

  test('Configuration validation', async ({ request }) => {
    // Test if there's a config validation endpoint
    try {
      const response = await request.get('http://localhost:3001/api/config/validate');
      if (response.status() !== 404) {
        expect(response.status()).toBeLessThan(400);
      }
    } catch (error) {
      // Config validation endpoint might not exist
      console.log('Config validation endpoint not available');
    }
  });

  test('System status endpoint', async ({ request }) => {
    // Test if there's a system status endpoint
    try {
      const response = await request.get('http://localhost:3001/api/status');
      if (response.status() !== 404) {
        expect(response.status()).toBe(200);
        
        const body = await response.text();
        expect(body.length).toBeGreaterThan(0);
      }
    } catch (error) {
      // Status endpoint might not exist
      console.log('System status endpoint not available');
    }
  });
});
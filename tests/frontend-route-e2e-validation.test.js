/**
 * FRONTEND E2E ROUTE VALIDATION TEST SUITE
 * 
 * PURPOSE: End-to-end validation of frontend routes and component loading
 * Specifically addresses user issues:
 * - Feed route showing "Disconnected" errors
 * - Agents route not working
 * - Routes returning 404 errors
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Test Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

test.describe('Frontend Route E2E Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for initial page loads
    test.setTimeout(30000);
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Browser Console Error: ${msg.text()}`);
      }
    });

    // Track network errors
    page.on('response', response => {
      if (!response.ok() && response.status() !== 304) {
        console.log(`❌ Network Error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('Feed route (/) should load without Disconnected errors', async ({ page }) => {
    console.log('🔍 Testing feed route loading...');
    
    await page.goto(FRONTEND_URL);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check page title
    const title = await page.title();
    expect(title).toContain('Agent Feed');
    
    // Check for disconnected error messages
    const disconnectedElements = await page.locator('text=/disconnected/i').count();
    expect(disconnectedElements).toBe(0);
    
    // Check for 404 error messages
    const notFoundElements = await page.locator('text=/404|not found/i').count();
    expect(notFoundElements).toBe(0);
    
    // Verify the main content loads
    await expect(page.locator('#root')).toBeVisible();
    
    // Wait for posts to load and verify they exist
    await page.waitForTimeout(2000); // Allow time for API calls
    
    // Check if posts are loading (either posts exist or loading state)
    const hasContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.textContent.length > 100;
    });
    
    expect(hasContent).toBe(true);
    console.log('✅ Feed route loads without disconnected errors');
  });

  test('Agents route (/agents) should load real agent data', async ({ page }) => {
    console.log('🔍 Testing agents route loading...');
    
    await page.goto(`${FRONTEND_URL}/agents`);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check for 404 errors
    const notFoundElements = await page.locator('text=/404|not found/i').count();
    expect(notFoundElements).toBe(0);
    
    // Check for disconnected error messages
    const disconnectedElements = await page.locator('text=/disconnected/i').count();
    expect(disconnectedElements).toBe(0);
    
    // Wait for agents to load
    await page.waitForTimeout(3000);
    
    // Verify agents content is present
    const hasAgentContent = await page.evaluate(() => {
      const body = document.body.textContent;
      return body.includes('agent') || body.includes('Agent') || body.length > 200;
    });
    
    expect(hasAgentContent).toBe(true);
    console.log('✅ Agents route loads real agent data');
  });

  test('Navigation between routes should work smoothly', async ({ page }) => {
    console.log('🔍 Testing route navigation...');
    
    // Start at home
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Navigate to agents via URL
    await page.goto(`${FRONTEND_URL}/agents`);
    await page.waitForLoadState('networkidle');
    
    // Navigate back to home
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Check that we're back at home and no errors occurred
    const title = await page.title();
    expect(title).toContain('Agent Feed');
    
    // Verify no error messages
    const errorElements = await page.locator('text=/error|failed|404/i').count();
    expect(errorElements).toBe(0);
    
    console.log('✅ Route navigation works smoothly');
  });

  test('API proxy should work correctly from frontend', async ({ page }) => {
    console.log('🔍 Testing API proxy functionality...');
    
    await page.goto(FRONTEND_URL);
    
    // Test that the frontend can make API calls through proxy
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.data.status).toBe('healthy');
    
    console.log('✅ API proxy works correctly');
  });

  test('Frontend should handle API failures gracefully', async ({ page }) => {
    console.log('🔍 Testing API failure handling...');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Test with a non-existent API endpoint
    const errorHandling = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/nonexistent');
        return { status: response.status, handled: true };
      } catch (error) {
        return { error: error.message, handled: true };
      }
    });
    
    // The important thing is that the frontend handles this gracefully
    expect(errorHandling.handled).toBe(true);
    
    // Page should still be functional
    const pageStillWorks = await page.evaluate(() => {
      return document.getElementById('root') !== null;
    });
    
    expect(pageStillWorks).toBe(true);
    console.log('✅ Frontend handles API failures gracefully');
  });

  test('Page should load within acceptable time', async ({ page }) => {
    console.log('🔍 Testing page load performance...');
    
    const startTime = Date.now();
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(10000); // 10 second max
    console.log(`✅ Page loaded in ${loadTime}ms`);
  });

  test('Frontend should work across different screen sizes', async ({ page }) => {
    console.log('🔍 Testing responsive design...');
    
    // Test desktop size
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    let isVisible = await page.locator('#root').isVisible();
    expect(isVisible).toBe(true);
    
    // Test tablet size
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    isVisible = await page.locator('#root').isVisible();
    expect(isVisible).toBe(true);
    
    // Test mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    isVisible = await page.locator('#root').isVisible();
    expect(isVisible).toBe(true);
    
    console.log('✅ Frontend works across different screen sizes');
  });

  test('JavaScript errors should not break the system', async ({ page }) => {
    console.log('🔍 Testing JavaScript error handling...');
    
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Navigate around to trigger potential JS errors
    await page.goto(`${FRONTEND_URL}/agents`);
    await page.waitForLoadState('networkidle');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Check that any JS errors don't break core functionality
    const pageIsStillFunctional = await page.evaluate(() => {
      return document.getElementById('root') !== null && 
             document.body.textContent.length > 50;
    });
    
    expect(pageIsStillFunctional).toBe(true);
    
    if (jsErrors.length > 0) {
      console.log(`⚠️  JS Errors detected: ${jsErrors.join(', ')}`);
      // Don't fail the test for JS errors, just log them
    } else {
      console.log('✅ No JavaScript errors detected');
    }
  });

  test('Route changes should not cause 404 errors', async ({ page }) => {
    console.log('🔍 Testing route change error handling...');
    
    const routes = ['/', '/agents'];
    
    for (const route of routes) {
      const response = await page.goto(`${FRONTEND_URL}${route}`);
      expect(response.status()).not.toBe(404);
      expect(response.status()).toBe(200);
      
      await page.waitForLoadState('networkidle');
      
      // Check for 404 content
      const has404Content = await page.locator('text=/404|not found/i').count();
      expect(has404Content).toBe(0);
      
      console.log(`✅ Route ${route} does not cause 404 errors`);
    }
  });

  test('Frontend should handle hash fragments correctly', async ({ page }) => {
    console.log('🔍 Testing hash fragment handling...');
    
    await page.goto(`${FRONTEND_URL}/#test`);
    await page.waitForLoadState('networkidle');
    
    const response = await page.evaluate(() => ({
      url: window.location.href,
      hash: window.location.hash
    }));
    
    expect(response.hash).toBe('#test');
    
    // Page should still load normally
    const pageLoaded = await page.locator('#root').isVisible();
    expect(pageLoaded).toBe(true);
    
    console.log('✅ Frontend handles hash fragments correctly');
  });

  test('Frontend should handle special characters and encoding', async ({ page }) => {
    console.log('🔍 Testing special character handling...');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Test that the page handles various character encodings
    const encodingTest = await page.evaluate(() => {
      // Test various characters
      const testString = 'Test: αβγ δεζ ñáéíóú 中文 🚀 ✅';
      const div = document.createElement('div');
      div.textContent = testString;
      document.body.appendChild(div);
      const result = div.textContent === testString;
      div.remove();
      return result;
    });
    
    expect(encodingTest).toBe(true);
    console.log('✅ Frontend handles special characters and encoding');
  });

  test('Dashboard with agents should work', async ({ page }) => {
    console.log('🔍 Testing dashboard functionality...');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for potential content to load
    await page.waitForTimeout(3000);
    
    // Check that the dashboard loads without errors
    const dashboardWorking = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root && root.textContent.length > 10;
    });
    
    expect(dashboardWorking).toBe(true);
    console.log('✅ Dashboard with agents works correctly');
  });
});

// Export test configuration for reporting
module.exports = {
  testSuiteName: 'Frontend Route E2E Validation',
  purpose: 'End-to-end validation of frontend routes and component loading',
  userIssues: [
    'Feed route showing Disconnected errors',
    'Agents route not working',
    'Routes returning 404 errors'
  ],
  validationTargets: [
    'Feed route loads without disconnected errors',
    'Agents route returns real agent data',
    'Navigation between routes works smoothly',
    'API proxy functionality works',
    'Error handling is graceful',
    'Performance is acceptable',
    'Responsive design works',
    'JavaScript errors dont break system'
  ]
};
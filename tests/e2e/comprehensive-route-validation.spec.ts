import { test, expect } from '@playwright/test';

/**
 * Comprehensive TDD Route Validation Suite
 * Tests actual browser accessibility vs server status
 */

const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:3000';

test.describe('Critical Route Accessibility Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up error tracking
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser Error:', msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      console.error('Page Error:', error.message);
    });
  });

  test('Root route (/) should load without 404 errors', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    
    // Verify HTTP response
    expect(response?.status()).toBe(200);
    
    // Check for 404 content
    const content = await page.textContent('body');
    expect(content).not.toContain('404');
    expect(content).not.toContain('Not Found');
    
    // Verify page loads actual content
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Check for React app mounting
    await page.waitForSelector('[data-testid], .App, #root > *', { timeout: 5000 });
  });

  test('/agents route should be accessible without 404', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/agents`);
    
    // Verify HTTP response
    expect(response?.status()).toBe(200);
    
    // Check for 404 content
    const content = await page.textContent('body');
    expect(content).not.toContain('404');
    expect(content).not.toContain('Not Found');
    
    // Verify agents page specific content
    await page.waitForLoadState('networkidle');
    
    // Look for agents-related content
    const hasAgentsContent = await page.locator('text=/agents?/i').count() > 0 ||
                            await page.locator('[data-testid*="agent"]').count() > 0 ||
                            await page.locator('.agents, #agents').count() > 0;
    
    expect(hasAgentsContent).toBeTruthy();
  });

  test('Navigation between routes should work properly', async ({ page }) => {
    // Start at root
    await page.goto(BASE_URL);
    
    // Navigate to agents (if link exists)
    const agentsLink = page.locator('a[href*="/agents"], button:has-text("agents")', { timeout: 3000 });
    
    if (await agentsLink.count() > 0) {
      await agentsLink.first().click();
      await page.waitForURL('**/agents');
      
      // Verify we're on agents page
      expect(page.url()).toContain('/agents');
      
      // Check for 404
      const content = await page.textContent('body');
      expect(content).not.toContain('404');
    } else {
      // Direct navigation test
      await page.goto(`${BASE_URL}/agents`);
      expect(page.url()).toContain('/agents');
    }
  });
});

test.describe('API Integration Through Vite Proxy', () => {
  
  test('API endpoints should be accessible through proxy', async ({ page }) => {
    // Test direct API access through Vite proxy
    const apiRoutes = ['/api/posts', '/api/agents', '/api/health'];
    
    for (const route of apiRoutes) {
      const response = await page.request.get(`${BASE_URL}${route}`);
      
      // Should not be 404
      expect(response.status()).not.toBe(404);
      
      // Log response for debugging
      console.log(`${route}: ${response.status()}`);
      
      if (response.status() !== 200) {
        const text = await response.text();
        console.log(`Response body for ${route}:`, text);
      }
    }
  });

  test('Posts API should return data or proper error', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/posts`);
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data) || typeof data === 'object').toBeTruthy();
    } else {
      // Should be proper error, not 404
      expect(response.status()).not.toBe(404);
      console.log('Posts API Status:', response.status());
    }
  });

  test('Frontend should handle API data properly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Wait for any API calls to complete
    await page.waitForLoadState('networkidle');
    
    // Check for loading states or data
    const hasLoadingState = await page.locator('text=/loading/i, .loading, .spinner').count() > 0;
    const hasErrorState = await page.locator('text=/error/i, .error').count() > 0;
    const hasData = await page.locator('[data-testid*="post"], .post, article').count() > 0;
    
    // Should have some indication of state
    expect(hasLoadingState || hasErrorState || hasData).toBeTruthy();
    
    if (hasErrorState) {
      const errorText = await page.locator('text=/error/i, .error').first().textContent();
      console.log('Frontend Error State:', errorText);
    }
  });
});

test.describe('Real Data Loading Validation', () => {
  
  test('Home page should load and display content', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Check for any content beyond basic HTML
    const bodyContent = await page.locator('body').innerHTML();
    
    // Should have more than just basic HTML structure
    expect(bodyContent.length).toBeGreaterThan(1000);
    
    // Should not be completely empty or just loading
    const textContent = await page.textContent('body');
    expect(textContent?.trim().length).toBeGreaterThan(50);
  });

  test('Agents page should show agent data or proper empty state', async ({ page }) => {
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    
    // Look for agent-related content or proper empty state
    const hasAgentData = await page.locator('[data-testid*="agent"], .agent-card, .agent-item').count() > 0;
    const hasEmptyState = await page.locator('text=/no agents/i, text=/empty/i').count() > 0;
    const hasLoadingState = await page.locator('text=/loading/i, .loading').count() > 0;
    
    // Should have one of these states
    expect(hasAgentData || hasEmptyState || hasLoadingState).toBeTruthy();
    
    // Should not show 404
    const content = await page.textContent('body');
    expect(content).not.toContain('404');
    expect(content).not.toContain('Not Found');
  });
});

test.describe('Error Handling and User Experience', () => {
  
  test('Invalid routes should show proper 404 page, not crash', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/this-route-does-not-exist`);
    
    // Could be 404 or redirected to home
    if (response?.status() === 404) {
      // Should show proper 404 page
      const content = await page.textContent('body');
      expect(content).toContain('404');
    } else {
      // If redirected, should be valid page
      expect(response?.status()).toBe(200);
    }
  });

  test('Network errors should be handled gracefully', async ({ page }) => {
    // Block API requests to simulate network issues
    await page.route('**/api/**', route => route.abort());
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Should still render page structure
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
    
    // Should not crash or show white screen
    const hasContent = await page.locator('body > *').count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('JavaScript errors should not break page rendering', async ({ page }) => {
    const jsErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Page should still render even with JS errors
    const hasContent = await page.locator('body > *').count() > 0;
    expect(hasContent).toBeTruthy();
    
    // Log any JS errors for debugging
    if (jsErrors.length > 0) {
      console.log('JavaScript Errors:', jsErrors);
    }
  });
});

test.describe('Performance and Accessibility', () => {
  
  test('Routes should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load within 10 seconds (generous for development)
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`Home page load time: ${loadTime}ms`);
  });

  test('Pages should be responsive across different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    
    const isMobileResponsive = await page.locator('body').isVisible();
    expect(isMobileResponsive).toBeTruthy();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(BASE_URL);
    
    const isDesktopResponsive = await page.locator('body').isVisible();
    expect(isDesktopResponsive).toBeTruthy();
  });
});
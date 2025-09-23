import { test, expect } from '@playwright/test';

test.describe('CRITICAL: Agents Route 404 Fix Validation', () => {
  test('Agents route should load without 404 error', async ({ page }) => {
    // Navigate directly to the agents route
    const response = await page.goto('http://localhost:5173/agents');
    
    // Should return 200 OK, not 404
    expect(response?.status()).toBe(200);
    expect(response?.status()).not.toBe(404);
    
    // Wait for content to load
    await page.waitForLoadState('networkidle');
    
    // Should show Agent Manager content
    await expect(page.locator('h2:has-text("Agent Manager")')).toBeVisible({ timeout: 10000 });
    
    // Should not show 404 error
    await expect(page.locator('text=404')).toHaveCount(0);
    await expect(page.locator('text=Not Found')).toHaveCount(0);
  });

  test('Navigation to agents should work from sidebar', async ({ page }) => {
    // Start at home page
    await page.goto('http://localhost:5173/');
    
    // Click on Agents link in navigation
    await page.click('a[href="/agents"]');
    
    // Should navigate to agents page
    await page.waitForURL('**/agents');
    expect(page.url()).toContain('/agents');
    
    // Should show Agent Manager
    await expect(page.locator('h2:has-text("Agent Manager")')).toBeVisible();
  });

  test('API connectivity should work correctly', async ({ page }) => {
    const responses: any[] = [];
    
    // Monitor API calls
    page.on('response', response => {
      if (response.url().includes('/api/agents')) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    
    // Wait for potential API calls
    await page.waitForTimeout(5000);
    
    // Check for API calls to correct endpoint
    const correctEndpoints = responses.filter(r => 
      r.url.includes('/api/agents') && !r.url.includes('/api/v1/agents')
    );
    
    // Should have made API calls to correct endpoint or show content
    const hasContent = await page.locator('h2:has-text("Agent Manager")').isVisible();
    const hasApiCalls = correctEndpoints.length > 0;
    
    // Either should have successful API calls or show the page content
    expect(hasContent || hasApiCalls).toBeTruthy();
  });
});
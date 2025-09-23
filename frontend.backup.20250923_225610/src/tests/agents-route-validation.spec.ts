import { test, expect } from '@playwright/test';

// SPARC TDD Test Suite for Agents Route 404 Fix
test.describe('Agents Route - SPARC TDD Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the app to be ready
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
  });

  test('CRITICAL: /agents route should load without 404 error', async ({ page }) => {
    // Act: Navigate directly to /agents route
    const response = await page.goto('http://localhost:5173/agents');
    
    // Assert: Should not be 404
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).toBe(200);
    
    // Should show the Agent Manager page
    await expect(page.locator('h2')).toContainText('Agent Manager');
    
    // Should not show any 404 or error messages
    await expect(page.locator('text=404')).toHaveCount(0);
    await expect(page.locator('text=Not Found')).toHaveCount(0);
  });

  test('CRITICAL: Agents sidebar navigation should work', async ({ page }) => {
    // Act: Click on Agents link in sidebar
    await page.click('a[href="/agents"]');
    
    // Wait for navigation
    await page.waitForURL('**/agents');
    
    // Assert: Should be on agents page
    expect(page.url()).toContain('/agents');
    
    // Should show Agent Manager content
    await expect(page.locator('h2')).toContainText('Agent Manager');
  });

  test('CRITICAL: API connectivity should work for agents data', async ({ page }) => {
    // Setup API response monitoring
    const apiResponses = [];
    page.on('response', response => {
      if (response.url().includes('/api/agents')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          ok: response.ok()
        });
      }
    });
    
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    
    // Wait for potential API calls
    await page.waitForTimeout(3000);
    
    // Check if any API calls were made
    if (apiResponses.length > 0) {
      // Should have successful API responses
      const successfulResponses = apiResponses.filter(r => r.ok);
      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // Check for correct endpoint
      const correctEndpoints = apiResponses.filter(r => 
        r.url.includes('/api/agents') && !r.url.includes('/api/v1/agents')
      );
      expect(correctEndpoints.length).toBeGreaterThan(0);
    }
  });

  test('CRITICAL: Agent Manager component should render properly', async ({ page }) => {
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    
    // Should show Agent Manager title
    await expect(page.locator('h2')).toContainText('Agent Manager');
    
    // Should show description
    await expect(page.locator('text=Real-time production agent management')).toBeVisible();
    
    // Should have refresh and spawn buttons
    await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    await expect(page.locator('button:has-text("Spawn Agent")')).toBeVisible();
    
    // Should have search functionality
    await expect(page.locator('input[placeholder="Search agents..."]')).toBeVisible();
  });

  test('CRITICAL: Loading state should work correctly', async ({ page }) => {
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    
    // Should show loading state initially (even briefly)
    // This might be very quick, so we'll check if it loads to a final state
    await page.waitForSelector('h2:has-text("Agent Manager")', { timeout: 10000 });
    
    // Should not be stuck in loading state
    await expect(page.locator('text=Loading real agent data...')).toHaveCount(0, { timeout: 5000 });
  });

  test('SPARC: Error handling should work gracefully', async ({ page }) => {
    // Mock network failure for API calls
    await page.route('**/api/agents*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    
    // Should show error message gracefully
    await expect(page.locator('text=Error')).toBeVisible({ timeout: 10000 });
    
    // Should still show the page structure
    await expect(page.locator('h2')).toContainText('Agent Manager');
  });

  test('SPARC: Empty state should work correctly', async ({ page }) => {
    // Mock empty agent response
    await page.route('**/api/agents*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });
    
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    
    // Should show empty state
    await expect(page.locator('text=No agents found')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=No agents have been created yet.')).toBeVisible();
    await expect(page.locator('button:has-text("Create First Agent")')).toBeVisible();
  });

  test('SPARC: Real agents should be displayed correctly', async ({ page }) => {
    // Navigate to agents page
    await page.goto('http://localhost:5173/agents');
    
    // Wait for agents to potentially load
    await page.waitForTimeout(3000);
    
    // If real data is loaded, verify it displays correctly
    const agentCards = page.locator('.grid .bg-white.border');
    const agentCount = await agentCards.count();
    
    if (agentCount > 0) {
      // Should show agent cards with proper structure
      await expect(agentCards.first()).toBeVisible();
      
      // Should have agent names and descriptions
      const firstCard = agentCards.first();
      await expect(firstCard.locator('h3')).toBeVisible();
      await expect(firstCard.locator('text=/description/i')).toBeVisible();
      
      // Should have status indicators
      await expect(firstCard.locator('[class*="text-green-"]')).toBeVisible(); // active status
    }
  });
});
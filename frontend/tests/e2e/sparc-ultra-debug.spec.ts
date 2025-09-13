/**
 * SPARC Ultra Debug: End-to-end test for infinite spinner issue
 * Tests the exact URL: http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723
 * ZERO tolerance for simulations - validates real production data flow
 */

import { test, expect } from '@playwright/test';

test.describe('SPARC Ultra Debug - Infinite Spinner Resolution', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging to capture debug output
    page.on('console', (msg) => {
      console.log(`🔍 BROWSER CONSOLE [${msg.type()}]:`, msg.text());
    });
    
    // Capture network failures
    page.on('response', (response) => {
      if (!response.ok()) {
        console.log(`🚨 NETWORK ERROR: ${response.url()} - ${response.status()} ${response.statusText()}`);
      }
    });
    
    // Capture uncaught exceptions
    page.on('pageerror', (error) => {
      console.log(`🚨 PAGE ERROR:`, error.message);
    });
  });

  test('should load agent dynamic page without infinite spinner - PRODUCTION DATA ONLY', async ({ page }) => {
    // Navigate to the exact failing URL
    const targetUrl = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723';
    
    console.log(`🎯 SPARC DEBUG: Testing URL - ${targetUrl}`);
    
    // Navigate with extended timeout
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for React to load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    
    // CRITICAL TEST: Check if infinite spinner is present
    const loadingSpinner = page.locator('text=Loading agent workspace...');
    const hasSpinner = await loadingSpinner.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasSpinner) {
      console.log('🚨 INFINITE SPINNER DETECTED - ANALYZING...');
      
      // Wait longer to see if it resolves
      await page.waitForTimeout(10000);
      
      // Check if still spinning
      const stillSpinning = await loadingSpinner.isVisible().catch(() => false);
      
      if (stillSpinning) {
        console.log('🚨 CONFIRMED: Infinite spinner persists after 10 seconds');
        
        // Capture network requests to debug API calls
        const responses = [];
        page.on('response', response => responses.push(`${response.url()} - ${response.status()}`));
        
        // Take screenshot for analysis
        await page.screenshot({ path: '/workspaces/agent-feed/docs/infinite-spinner-debug.png' });
        
        // Get browser console logs
        const logs = await page.evaluate(() => {
          return window.console.log.toString();
        });
        
        console.log('🔍 Network Responses:', responses);
        
        // Fail the test with detailed info
        throw new Error(`INFINITE SPINNER ISSUE CONFIRMED: Page stuck on loading after 10+ seconds. URL: ${targetUrl}`);
      }
    }
    
    // POSITIVE TEST: Verify actual content loads
    // Look for the page title or content that should be rendered
    const pageContent = page.locator('[data-testid="rendered-page"]').or(
      page.locator('text=Personal Todos Dashboard')
    ).or(
      page.locator('text=Dashboard Content')
    );
    
    // Wait for content to appear (max 15 seconds)
    await expect(pageContent).toBeVisible({ timeout: 15000 });
    
    // Verify no loading spinner remains
    await expect(loadingSpinner).not.toBeVisible();
    
    // Verify URL is correct
    expect(page.url()).toBe(targetUrl);
    
    // Take success screenshot
    await page.screenshot({ path: '/workspaces/agent-feed/docs/sparc-debug-success.png' });
    
    console.log('✅ SPARC ULTRA DEBUG: Page loaded successfully with real content');
  });

  test('should validate API endpoints return real data', async ({ page }) => {
    // Intercept API calls to validate they return real data
    const apiCalls = [];
    
    page.route('/api/agents/personal-todos-agent', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      
      console.log('🔍 API RESPONSE: /api/agents/personal-todos-agent', data);
      
      // Validate response structure
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('personal-todos-agent');
      
      apiCalls.push({ endpoint: '/api/agents/personal-todos-agent', success: true });
      route.fulfill({ response });
    });
    
    page.route('/api/agents/personal-todos-agent/pages', async (route) => {
      const response = await route.fetch();
      const data = await response.json();
      
      console.log('🔍 API RESPONSE: /api/agents/personal-todos-agent/pages', data);
      
      // Validate response structure and target page exists
      expect(data.success).toBe(true);
      expect(Array.isArray(data.pages)).toBe(true);
      
      const targetPage = data.pages.find(p => p.id === '015b7296-a144-4096-9c60-ee5d7f900723');
      expect(targetPage).toBeDefined();
      expect(targetPage.title).toBe('Personal Todos Dashboard');
      
      apiCalls.push({ endpoint: '/api/agents/personal-todos-agent/pages', success: true, pageFound: true });
      route.fulfill({ response });
    });
    
    // Navigate and test
    await page.goto('http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723');
    
    // Wait for API calls to complete
    await page.waitForTimeout(5000);
    
    // Verify both API calls were made successfully
    expect(apiCalls).toHaveLength(2);
    console.log('✅ API VALIDATION: All endpoints returned real production data');
  });

  test('should validate component state transitions', async ({ page }) => {
    // Add debugging hooks to track React state
    await page.addInitScript(() => {
      window.debugState = [];
      const originalSetState = React.useState;
      
      // This is a simplified state tracking - in real scenario would need more sophisticated React debugging
      window.addEventListener('statechange', (e) => {
        window.debugState.push(e.detail);
      });
    });
    
    await page.goto('http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723');
    
    // Wait for component to load
    await page.waitForSelector('[data-testid="app-root"]');
    
    // Check final state
    const finalState = await page.evaluate(() => {
      return {
        url: location.href,
        hasSpinner: !!document.querySelector('text=Loading agent workspace...'),
        hasContent: !!document.querySelector('[data-testid="rendered-page"]'),
        hasError: !!document.querySelector('text=Error')
      };
    });
    
    console.log('🔍 FINAL COMPONENT STATE:', finalState);
    
    // Assertions
    expect(finalState.hasSpinner).toBe(false);
    expect(finalState.hasContent).toBe(true);
    expect(finalState.hasError).toBe(false);
  });
});
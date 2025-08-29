import { test, expect, Page } from '@playwright/test';

/**
 * Simple E2E Test for Fixed Frontend
 * 
 * Tests the actual live frontend without complex setup requirements
 * Focuses on core functionality and network error detection
 */

const FRONTEND_URL = 'http://localhost:5173';

test.describe('Simple Frontend E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error monitoring
    const networkErrors: string[] = [];
    
    page.on('requestfailed', (request) => {
      networkErrors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });

    // Store network errors for assertions
    (page as any).networkErrors = networkErrors;
  });

  test('should load homepage without network errors', async ({ page }) => {
    console.log('🚀 Testing homepage load...');
    
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for debugging
    await page.screenshot({
      path: 'test-results/homepage-load.png',
      fullPage: true
    });
    
    // Check for network errors
    const networkErrors = (page as any).networkErrors || [];
    if (networkErrors.length > 0) {
      console.error('Network errors detected:', networkErrors);
    }
    
    // Verify page loaded
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    expect(networkErrors.length).toBe(0);
    expect(pageTitle).toBeTruthy();
  });

  test('should navigate to Claude instances page', async ({ page }) => {
    console.log('🚀 Testing Claude instances page navigation...');
    
    // Try different possible paths
    const paths = [
      '/claude-instances',
      '/instances',
      '/'
    ];
    
    let successfulPath = '';
    for (const path of paths) {
      try {
        const response = await page.goto(`${FRONTEND_URL}${path}`);
        if (response?.ok()) {
          successfulPath = path;
          break;
        }
      } catch (error) {
        console.log(`Path ${path} failed:`, error);
      }
    }
    
    expect(successfulPath).toBeTruthy();
    console.log(`Successfully loaded: ${successfulPath}`);
    
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/claude-instances-page.png',
      fullPage: true
    });
    
    // Check for network errors
    const networkErrors = (page as any).networkErrors || [];
    expect(networkErrors.length).toBe(0);
  });

  test('should find and test buttons', async ({ page }) => {
    console.log('🚀 Testing button interactions...');
    
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Look for any buttons on the page
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on the page`);
    
    if (buttons.length > 0) {
      // Test clicking the first button
      const firstButton = buttons[0];
      const buttonText = await firstButton.textContent();
      console.log(`Testing button: "${buttonText}"`);
      
      // Click the button
      await firstButton.click();
      
      // Wait for any response
      await page.waitForTimeout(2000);
      
      // Check for error messages in UI
      const errorElements = await page.locator('text=/error|failed|network/i').all();
      const visibleErrors = [];
      
      for (const element of errorElements) {
        if (await element.isVisible()) {
          const text = await element.textContent();
          visibleErrors.push(text);
        }
      }
      
      console.log('Visible error messages:', visibleErrors);
      expect(visibleErrors.length).toBe(0);
      
      // Take screenshot after button click
      await page.screenshot({
        path: 'test-results/button-click-result.png',
        fullPage: true
      });
    }
    
    // Check for network errors
    const networkErrors = (page as any).networkErrors || [];
    expect(networkErrors.length).toBe(0);
  });

  test('should check for UI error messages', async ({ page }) => {
    console.log('🚀 Testing for UI error messages...');
    
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Check for common error message patterns
    const errorSelectors = [
      'text="Network error"',
      'text="Connection failed"',
      'text="Failed to fetch"',
      '[data-testid*="error"]',
      '.error',
      '.alert-error'
    ];
    
    let foundErrors = [];
    
    for (const selector of errorSelectors) {
      try {
        const elements = await page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible()) {
            const text = await element.textContent();
            foundErrors.push({
              selector,
              text: text?.trim()
            });
          }
        }
      } catch (error) {
        // Selector might not be valid, continue
      }
    }
    
    console.log('Found error messages:', foundErrors);
    
    // Take screenshot showing current state
    await page.screenshot({
      path: 'test-results/error-check.png',
      fullPage: true
    });
    
    // Critical test: No "Network error" messages should be visible
    expect(foundErrors.length).toBe(0);
    
    // Check for network errors during the test
    const networkErrors = (page as any).networkErrors || [];
    expect(networkErrors.length).toBe(0);
  });

  test('should test terminal interface if present', async ({ page }) => {
    console.log('🚀 Testing terminal interface...');
    
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Look for terminal-like elements
    const terminalSelectors = [
      '[data-testid="terminal"]',
      '.terminal',
      '.xterm',
      'pre',
      'textarea'
    ];
    
    let terminalFound = false;
    for (const selector of terminalSelectors) {
      try {
        const terminal = page.locator(selector).first();
        if (await terminal.isVisible()) {
          console.log(`Found terminal: ${selector}`);
          terminalFound = true;
          
          // Try to interact with terminal
          await terminal.click();
          await terminal.type('echo "test"');
          await page.keyboard.press('Enter');
          
          // Wait for potential response
          await page.waitForTimeout(2000);
          
          break;
        }
      } catch (error) {
        // Terminal might not be interactive, continue
      }
    }
    
    console.log(`Terminal interface found: ${terminalFound}`);
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/terminal-test.png',
      fullPage: true
    });
    
    // Check for network errors
    const networkErrors = (page as any).networkErrors || [];
    expect(networkErrors.length).toBe(0);
  });

  test('should test WebSocket connections', async ({ page }) => {
    console.log('🚀 Testing WebSocket connections...');
    
    const wsConnections: string[] = [];
    
    // Monitor WebSocket connections
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
      console.log(`WebSocket connection: ${ws.url()}`);
    });
    
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connections to establish
    await page.waitForTimeout(5000);
    
    console.log(`WebSocket connections detected: ${wsConnections.length}`);
    wsConnections.forEach(url => console.log(`  - ${url}`));
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/websocket-test.png',
      fullPage: true
    });
    
    // Check for network errors
    const networkErrors = (page as any).networkErrors || [];
    expect(networkErrors.length).toBe(0);
  });

  test('should handle page refresh without errors', async ({ page }) => {
    console.log('🚀 Testing page refresh resilience...');
    
    await page.goto(`${FRONTEND_URL}/claude-instances`);
    await page.waitForLoadState('networkidle');
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that page still works after refresh
    const buttons = await page.locator('button').count();
    console.log(`Buttons found after refresh: ${buttons}`);
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/page-refresh.png',
      fullPage: true
    });
    
    // Check for network errors
    const networkErrors = (page as any).networkErrors || [];
    expect(networkErrors.length).toBe(0);
  });
});
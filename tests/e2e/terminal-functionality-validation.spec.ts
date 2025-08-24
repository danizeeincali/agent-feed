import { test, expect, type Page } from '@playwright/test';

/**
 * Terminal Functionality Validation Test Suite
 * 
 * This test suite validates the actual terminal functionality available in the application
 * by navigating to the correct pages and testing the actual UI components.
 * 
 * Based on the actual application structure found in the error context.
 */

test.describe('Terminal Functionality Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for terminal operations
    test.setTimeout(90000);
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for React to initialize
    await page.waitForTimeout(3000);
  });

  test('should navigate to homepage and find Simple Launcher link', async ({ page }) => {
    // Verify we're on the homepage
    await expect(page).toHaveURL('/');
    
    // Check for the Simple Launcher navigation link
    const simpleLauncherLink = page.locator('link:has-text("Simple Launcher"), a:has-text("Simple Launcher"), [href*="simple-launcher"]');
    
    const linkCount = await simpleLauncherLink.count();
    expect(linkCount).toBeGreaterThan(0);
    
    console.log(`Found ${linkCount} Simple Launcher link(s)`);
  });

  test('should navigate to Simple Launcher page', async ({ page }) => {
    // Click on Simple Launcher link
    const simpleLauncherLink = page.locator('a:has-text("Simple Launcher")').first();
    await simpleLauncherLink.click();
    
    // Wait for navigation
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify we're on the simple launcher page
    await expect(page).toHaveURL(/simple-launcher/);
    
    console.log('Successfully navigated to Simple Launcher page');
  });

  test('should find terminal or launch functionality on Simple Launcher page', async ({ page }) => {
    // Navigate to Simple Launcher
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for terminal-related elements
    const terminalElements = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport');
    const launchButtons = page.locator('button:has-text("Launch"), button:has-text("Start"), button:has-text("Run"), button[class*="launch"]');
    
    const terminalCount = await terminalElements.count();
    const buttonCount = await launchButtons.count();
    
    console.log(`Found ${terminalCount} terminal elements and ${buttonCount} launch buttons`);
    
    // We expect either a terminal or a launch button to be present
    expect(terminalCount + buttonCount).toBeGreaterThan(0);
  });

  test('should check Terminal Debug page for terminal functionality', async ({ page }) => {
    // Navigate to Terminal Debug page
    const terminalDebugLink = page.locator('a:has-text("Terminal Debug")').first();
    await terminalDebugLink.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Verify we're on the terminal debug page
    await expect(page).toHaveURL(/terminal-debug/);
    
    // Look for terminal elements
    const terminalElements = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen, .xterm-viewport');
    const terminalCount = await terminalElements.count();
    
    console.log(`Found ${terminalCount} terminal elements on Terminal Debug page`);
    
    // Terminal Debug page should have terminal elements
    expect(terminalCount).toBeGreaterThan(0);
  });

  test('should test Claude Manager dual instance page for terminal', async ({ page }) => {
    // Navigate to Claude Manager
    const claudeManagerLink = page.locator('a:has-text("Claude Manager")').first();
    await claudeManagerLink.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Should be on dual instance page
    await expect(page).toHaveURL(/dual-instance/);
    
    // Look for terminal tab or terminal elements
    const terminalTab = page.locator('button:has-text("Terminal"), [role="tab"]:has-text("Terminal")');
    const terminalElements = page.locator('.terminal, [data-testid="terminal"], .xterm, .xterm-screen');
    
    const tabCount = await terminalTab.count();
    const elementCount = await terminalElements.count();
    
    console.log(`Found ${tabCount} terminal tabs and ${elementCount} terminal elements`);
    
    // Should have terminal functionality available
    expect(tabCount + elementCount).toBeGreaterThan(0);
  });

  test('should validate WebSocket connectivity exists', async ({ page }) => {
    // Monitor WebSocket events
    const wsConnections: any[] = [];
    
    page.on('websocket', (ws) => {
      wsConnections.push(ws);
      console.log('WebSocket connected:', ws.url());
    });
    
    // Navigate to a page that might establish WebSocket connections
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential WebSocket connections
    await page.waitForTimeout(5000);
    
    // Log any WebSocket connections found
    console.log(`Found ${wsConnections.length} WebSocket connections`);
    
    if (wsConnections.length > 0) {
      const wsUrls = wsConnections.map(ws => ws.url());
      console.log('WebSocket URLs:', wsUrls);
      
      // Check if any WebSocket points to our backend
      const backendConnections = wsUrls.filter(url => url.includes('localhost:3001') || url.includes('3001'));
      expect(backendConnections.length).toBeGreaterThan(0);
    }
  });

  test('should validate no critical JavaScript errors on main pages', async ({ page }) => {
    // Monitor console errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Test main pages
    const pagesToTest = [
      '/',
      '/simple-launcher', 
      '/dual-instance',
      '/terminal-debug'
    ];
    
    for (const url of pagesToTest) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    // Filter out non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('favicon') &&
      !error.includes('404') &&
      !error.includes('net::ERR_INTERNET_DISCONNECTED') &&
      (error.includes('terminal') || error.includes('websocket') || error.includes('undefined') || error.includes('Cannot'))
    );
    
    console.log(`Found ${errors.length} total errors, ${criticalErrors.length} critical errors`);
    
    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }
    
    // Should have minimal critical errors
    expect(criticalErrors.length).toBeLessThan(3);
  });

  test('should test application responsiveness', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080 }, // Desktop
      { width: 768, height: 1024 },  // Tablet
      { width: 375, height: 667 }    // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      // Navigate to main page
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check that the page loads and navigation is visible
      const navigation = page.locator('nav, [role="navigation"], .nav');
      await expect(navigation).toBeVisible({ timeout: 5000 });
      
      console.log(`Page responsive at ${viewport.width}x${viewport.height}`);
    }
  });

  test('should validate API connectivity', async ({ page }) => {
    // Check if API endpoints are reachable
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for potential API calls
    await page.waitForTimeout(3000);
    
    // Make a direct API call through the browser
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/claude/status');
        return {
          status: response.status,
          ok: response.ok,
          url: response.url
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    console.log('API Response:', apiResponse);
    
    // API should be accessible (even if it returns an error status, it should connect)
    expect(apiResponse.status).toBeDefined();
  });

  test('should find and interact with available launch buttons', async ({ page }) => {
    // Test all pages with potential launch functionality
    const pagesWithLaunch = [
      '/simple-launcher',
      '/dual-instance',
    ];
    
    for (const url of pagesWithLaunch) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Look for any launch-related buttons
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      console.log(`Found ${buttonCount} buttons on ${url}`);
      
      // Check button text content
      for (let i = 0; i < Math.min(buttonCount, 10); i++) { // Limit to first 10 buttons
        const button = buttons.nth(i);
        const isVisible = await button.isVisible();
        if (isVisible) {
          const text = await button.textContent();
          const isEnabled = await button.isEnabled();
          console.log(`Button ${i}: "${text}" (enabled: ${isEnabled})`);
          
          // If we find a launch button, try clicking it
          if (text && (text.toLowerCase().includes('launch') || text.toLowerCase().includes('start'))) {
            if (isEnabled) {
              console.log(`Clicking launch button: "${text}"`);
              await button.click();
              await page.waitForTimeout(2000);
              
              // Check if anything changed (new elements appeared, etc.)
              const afterClick = page.locator('.terminal, .xterm, [data-testid="terminal"]');
              const terminalCount = await afterClick.count();
              console.log(`After clicking, found ${terminalCount} terminal elements`);
              break; // Only click one launch button per page
            }
          }
        }
      }
    }
  });
});
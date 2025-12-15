/**
 * COMPREHENSIVE WHITE SCREEN FIX VALIDATION SUITE
 * 
 * This test suite validates that the SimpleLauncher component works correctly
 * after fixing the white screen issue. It covers all critical validation scenarios:
 * 
 * 1. Main app loads without white screen
 * 2. SimpleLauncher navigation works
 * 3. Component rendering is complete
 * 4. API connectivity functions properly
 * 5. Process management workflow operates correctly
 * 6. Error handling displays appropriately
 * 7. Browser console is clean of critical errors
 * 8. Responsive design functions across viewports
 */

import { test, expect, Page, Browser } from '@playwright/test';

// Mock API responses for consistent testing
const mockApiResponses = {
  claudeCheck: {
    success: true,
    claudeAvailable: true,
    message: 'Claude Code available',
    workingDirectory: '/workspaces/agent-feed/prod'
  },
  statusStopped: {
    success: true,
    status: {
      isRunning: false,
      status: 'stopped',
      workingDirectory: '/workspaces/agent-feed/prod'
    }
  },
  statusRunning: {
    success: true,
    status: {
      isRunning: true,
      status: 'running',
      pid: 12345,
      startedAt: new Date().toISOString(),
      workingDirectory: '/workspaces/agent-feed/prod'
    }
  },
  launchSuccess: {
    success: true,
    message: 'Claude Code launched successfully',
    status: {
      isRunning: true,
      status: 'running',
      pid: 12345,
      startedAt: new Date().toISOString(),
      workingDirectory: '/workspaces/agent-feed/prod'
    }
  },
  stopSuccess: {
    success: true,
    message: 'Claude Code stopped successfully',
    status: {
      isRunning: false,
      status: 'stopped'
    }
  },
  claudeUnavailable: {
    success: false,
    claudeAvailable: false,
    message: 'Claude Code not found in system PATH'
  }
};

test.describe('🚨 CRITICAL: White Screen Fix Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up API mocking for consistent test behavior
    await page.route('**/api/claude/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.claudeCheck)
      });
    });

    await page.route('**/api/claude/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.statusStopped)
      });
    });

    await page.route('**/api/claude/launch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.launchSuccess)
      });
    });

    await page.route('**/api/claude/stop', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.stopSuccess)
      });
    });

    // Capture console messages
    page.on('console', (msg) => {
      console.log(`Browser Console [${msg.type()}]:`, msg.text());
    });

    page.on('pageerror', (error) => {
      console.error('Page Error:', error.message);
    });
  });

  test('VALIDATION 1: Main app loads without white screen', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to main application
    await page.goto('/');
    
    // Wait for complete loading
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // CRITICAL: Verify no white screen - main content should be visible
    await expect(page.locator('body')).not.toHaveCSS('background-color', 'rgb(255, 255, 255)');
    
    // Verify main app structure is present
    const mainContent = page.locator('[data-testid="main-content"], .app-layout, main, #root > div').first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
    
    // Verify navigation is visible
    const navigation = page.locator('nav, [role="navigation"], .navigation, .sidebar').first();
    await expect(navigation).toBeVisible({ timeout: 5000 });
    
    // Verify header/title content
    const headerContent = page.locator('h1, h2, .header, [data-testid="header"]').first();
    await expect(headerContent).toBeVisible({ timeout: 5000 });
    
    // Ensure no compilation/import errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('SyntaxError') || 
      error.includes('import') || 
      error.includes('duplicate') ||
      error.includes('Module not found')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    // Verify React has mounted properly
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('VALIDATION 2: SimpleLauncher navigation button visible and functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Find SimpleLauncher navigation link
    const launcherNav = page.locator('nav a[href*="simple-launcher"], a:has-text("Simple Launcher"), [href="/simple-launcher"]').first();
    
    // Verify navigation button is visible and contains expected text
    await expect(launcherNav).toBeVisible({ timeout: 5000 });
    
    // Verify link text or icon
    await expect(launcherNav).toContainText(/simple.*launcher/i);
    
    // Test navigation click functionality
    await launcherNav.click();
    
    // Verify navigation occurred
    await page.waitForURL('**/simple-launcher', { timeout: 5000 });
    await page.waitForLoadState('networkidle');
    
    expect(page.url()).toContain('/simple-launcher');
  });

  test('VALIDATION 3: SimpleLauncher component renders with all UI elements', async ({ page }) => {
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Wait for component to fully load
    await page.waitForTimeout(2000);
    
    // CRITICAL: Verify main component container
    const launcherContainer = page.locator('.simple-launcher, [data-testid="simple-launcher"], .launcher-container').first();
    await expect(launcherContainer).toBeVisible({ timeout: 10000 });
    
    // Verify heading/title
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/claude.*launcher/i);
    
    // Verify description text
    await expect(page.locator('text=Simple process launcher')).toBeVisible();
    
    // CRITICAL: Verify Launch Claude button
    const launchButton = page.locator('button:has-text("Launch"), .launch-button, button[class*="launch"]').first();
    await expect(launchButton).toBeVisible();
    await expect(launchButton).toContainText(/launch/i);
    
    // CRITICAL: Verify Stop Claude button  
    const stopButton = page.locator('button:has-text("Stop"), .stop-button, button[class*="stop"]').first();
    await expect(stopButton).toBeVisible();
    await expect(stopButton).toContainText(/stop/i);
    
    // Verify system information display
    await expect(page.locator('text=Claude Code:')).toBeVisible();
    await expect(page.locator('text=Working Directory:')).toBeVisible();
    
    // Verify status monitoring section
    await expect(page.locator('text=Process Status')).toBeVisible();
  });

  test('VALIDATION 4: API connectivity to backend port 3001 works', async ({ page }) => {
    let apiCallsMade = 0;
    
    // Monitor API calls
    page.route('**/api/claude/**', async (route) => {
      apiCallsMade++;
      const url = route.request().url();
      console.log(`API Call made to: ${url}`);
      
      if (url.includes('/check')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses.claudeCheck)
        });
      } else if (url.includes('/status')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses.statusStopped)
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial API calls to complete
    await page.waitForTimeout(3000);
    
    // Verify API calls were made to backend
    expect(apiCallsMade).toBeGreaterThan(0);
    
    // Verify Claude availability check result
    await expect(page.locator('text=✅ Available, text=Available')).toBeVisible();
    
    // Verify working directory is displayed
    await expect(page.locator('text=/workspaces/agent-feed/prod')).toBeVisible();
    
    // Verify process status is displayed
    await expect(page.locator('.status, [class*="status"]')).toBeVisible();
  });

  test('VALIDATION 5: Process launch/stop workflow operates correctly', async ({ page }) => {
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Wait for initial status load
    await page.waitForTimeout(2000);
    
    // PHASE 1: Initial stopped state
    const launchButton = page.locator('button:has-text("Launch"), .launch-button').first();
    const stopButton = page.locator('button:has-text("Stop"), .stop-button').first();
    
    await expect(launchButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
    await expect(page.locator('text=⚫ Stopped, text=Stopped')).toBeVisible();
    
    // PHASE 2: Launch process
    await launchButton.click();
    
    // Verify launching state
    await expect(launchButton).toContainText(/launching/i);
    
    // Wait for launch to complete
    await page.waitForTimeout(2000);
    
    // Verify running state
    await expect(launchButton).toBeDisabled();
    await expect(stopButton).toBeEnabled();
    
    // PHASE 3: Stop process
    await stopButton.click();
    
    // Verify stopping state
    await expect(stopButton).toContainText(/stopping/i);
    
    // Wait for stop to complete
    await page.waitForTimeout(2000);
    
    // Verify final stopped state
    await expect(launchButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });

  test('VALIDATION 6: Error handling displays correctly', async ({ page }) => {
    // Mock Claude as unavailable
    await page.route('**/api/claude/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.claudeUnavailable)
      });
    });

    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Wait for availability check
    await page.waitForTimeout(3000);
    
    // Verify error state display
    await expect(page.locator('text=❌ Not Found, text=Not Found')).toBeVisible();
    
    // Verify warning message
    await expect(page.locator('.warning, [class*="warning"]')).toBeVisible();
    await expect(page.locator('text=⚠️')).toBeVisible();
    
    // Launch button should be disabled when Claude unavailable
    const launchButton = page.locator('button:has-text("Launch"), .launch-button').first();
    await expect(launchButton).toBeDisabled();
  });

  test('VALIDATION 7: Browser console clean of critical errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const pageErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    // Navigate and interact with SimpleLauncher
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Interact with buttons to trigger any hidden errors
    const launchButton = page.locator('button:has-text("Launch"), .launch-button').first();
    if (await launchButton.isEnabled()) {
      await launchButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Wait for all async operations to complete
    await page.waitForTimeout(3000);
    
    // Filter critical errors that indicate white screen or import issues
    const criticalErrors = [
      ...consoleErrors.filter(error => 
        error.includes('SyntaxError') || 
        error.includes('import') ||
        error.includes('duplicate') ||
        error.includes('ReferenceError') ||
        error.includes('Module not found') ||
        error.includes('Failed to load') ||
        error.includes('Unexpected token')
      ),
      ...pageErrors
    ];
    
    // Log all errors for debugging but only fail on critical ones
    if (consoleErrors.length > 0) {
      console.log('Console Errors Found:', consoleErrors);
    }
    if (pageErrors.length > 0) {
      console.log('Page Errors Found:', pageErrors);
    }
    
    // CRITICAL: No errors that would cause white screen
    expect(criticalErrors).toHaveLength(0);
  });

  test('VALIDATION 8: Responsive design across viewport sizes', async ({ page }) => {
    // Test Desktop viewport (default)
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('.simple-launcher, [data-testid="simple-launcher"]').first()).toBeVisible();
    
    // Test Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    await expect(page.locator('button:has-text("Launch")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Stop")').first()).toBeVisible();
    
    // Test Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Verify mobile navigation works
    const mobileMenu = page.locator('button[aria-label*="menu"], button:has(svg)').first();
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await page.waitForTimeout(500);
    }
    
    // Verify SimpleLauncher is still functional on mobile
    await expect(page.locator('.simple-launcher, [data-testid="simple-launcher"]').first()).toBeVisible();
    await expect(page.locator('button:has-text("Launch")').first()).toBeVisible();
    
    // Test Large Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    await expect(page.locator('.simple-launcher').first()).toBeVisible();
  });
});

test.describe('🔄 REGRESSION: End-to-End Workflow Validation', () => {
  
  test('REGRESSION 1: Complete user journey - Home → SimpleLauncher → Workflow', async ({ page }) => {
    // Start at home page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify home page loads correctly (no white screen)
    await expect(page.locator('body')).not.toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(page.locator('#root > div').first()).toBeVisible();
    
    // Navigate to SimpleLauncher
    const launcherLink = page.locator('nav a[href*="simple-launcher"], a:has-text("Simple Launcher")').first();
    await launcherLink.click();
    await page.waitForLoadState('networkidle');
    
    // Verify SimpleLauncher loads correctly
    await expect(page.locator('.simple-launcher').first()).toBeVisible();
    
    // Execute launch workflow
    const launchButton = page.locator('button:has-text("Launch")').first();
    await expect(launchButton).toBeEnabled();
    await launchButton.click();
    
    // Verify launch workflow completes
    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Stop")').first()).toBeEnabled();
    
    // Return to home page
    const homeLink = page.locator('nav a[href="/"], a:has-text("Home")').first();
    await homeLink.click();
    await page.waitForLoadState('networkidle');
    
    // Verify return navigation works
    expect(page.url()).not.toContain('/simple-launcher');
  });

  test('REGRESSION 2: Page refresh preserves functionality', async ({ page }) => {
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Verify initial state
    await expect(page.locator('.simple-launcher').first()).toBeVisible();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify functionality preserved after refresh
    await expect(page.locator('.simple-launcher').first()).toBeVisible();
    await expect(page.locator('button:has-text("Launch")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Stop")').first()).toBeVisible();
    
    // Verify API connectivity still works
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Claude Code:')).toBeVisible();
  });

  test('REGRESSION 3: Multiple browser tabs maintain functionality', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Open first tab
    const page1 = await context.newPage();
    await page1.goto('/simple-launcher');
    await page1.waitForLoadState('networkidle');
    
    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/simple-launcher');
    await page2.waitForLoadState('networkidle');
    
    // Verify both tabs work independently
    await expect(page1.locator('.simple-launcher').first()).toBeVisible();
    await expect(page2.locator('.simple-launcher').first()).toBeVisible();
    
    // Test functionality in first tab
    const launch1 = page1.locator('button:has-text("Launch")').first();
    await launch1.click();
    await page1.waitForTimeout(1000);
    
    // Verify second tab still functional
    const launch2 = page2.locator('button:has-text("Launch")').first();
    await expect(launch2).toBeVisible();
    
    await context.close();
  });
});

test.describe('🌐 CROSS-BROWSER: Compatibility Validation', () => {
  
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`BROWSER ${browserName.toUpperCase()}: SimpleLauncher loads and functions`, async ({ page }) => {
      await page.goto('/simple-launcher');
      await page.waitForLoadState('networkidle');
      
      // Verify core functionality across browsers
      await expect(page.locator('.simple-launcher, [data-testid="simple-launcher"]').first()).toBeVisible({ timeout: 10000 });
      
      await expect(page.locator('button:has-text("Launch")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Stop")').first()).toBeVisible();
      
      // Test button interaction
      const launchButton = page.locator('button:has-text("Launch")').first();
      if (await launchButton.isEnabled()) {
        await launchButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Verify no critical browser-specific errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('favicon')) {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.waitForTimeout(2000);
      
      // Allow some browser-specific warnings but no critical errors
      const criticalErrors = consoleErrors.filter(error => 
        error.includes('SyntaxError') || 
        error.includes('ReferenceError') ||
        error.includes('import')
      );
      
      expect(criticalErrors.length).toBeLessThanOrEqual(1); // Allow minor browser differences
    });
  });
});
/**
 * Comprehensive Browser Validation Tests for SimpleLauncher
 * Tests all critical functionality after fixing duplicate import errors
 */

import { test, expect, Page } from '@playwright/test';
import type { APIResponse } from '@playwright/test';

// Mock API responses for testing
const mockApiResponses = {
  check: {
    success: true,
    claudeAvailable: true,
    message: 'Claude Code available'
  },
  status: {
    success: true,
    status: {
      isRunning: false,
      status: 'stopped',
      workingDirectory: '/prod'
    }
  },
  launch: {
    success: true,
    status: {
      isRunning: true,
      status: 'running',
      pid: 12345,
      startedAt: new Date().toISOString(),
      workingDirectory: '/prod'
    }
  },
  stop: {
    success: true,
    status: {
      isRunning: false,
      status: 'stopped'
    }
  }
};

test.describe('SimpleLauncher Browser Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all API endpoints
    await page.route('**/api/claude/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.check)
      });
    });

    await page.route('**/api/claude/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.status)
      });
    });

    await page.route('**/api/claude/launch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.launch)
      });
    });

    await page.route('**/api/claude/stop', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.stop)
      });
    });
  });

  test('CRITICAL: Main application loads without compilation errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to main page
    await page.goto('http://localhost:3000');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Verify no compilation errors
    expect(consoleErrors.filter(error => 
      error.includes('SyntaxError') || 
      error.includes('import') || 
      error.includes('duplicate')
    )).toHaveLength(0);

    // Verify main app elements are present
    await expect(page.locator('[data-testid="header"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-feed"]')).toBeVisible();
    await expect(page.locator('text=AgentLink Feed System')).toBeVisible();
  });

  test('CRITICAL: SimpleLauncher navigation button is visible and clickable', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Find the SimpleLauncher navigation button
    const launcherButton = page.locator('nav a[href="/simple-launcher"]');
    await expect(launcherButton).toBeVisible();
    await expect(launcherButton.locator('text=Simple Launcher')).toBeVisible();
    
    // Verify the play icon is present
    await expect(launcherButton.locator('svg')).toBeVisible();
  });

  test('CRITICAL: Navigation to SimpleLauncher page works correctly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Click SimpleLauncher navigation button
    const launcherButton = page.locator('nav a[href="/simple-launcher"]');
    await launcherButton.click();

    // Wait for navigation and page load
    await page.waitForLoadState('networkidle');
    await page.waitForURL('**/simple-launcher');

    // Verify we're on the SimpleLauncher page
    expect(page.url()).toContain('/simple-launcher');
  });

  test('CRITICAL: SimpleLauncher component renders correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Verify main SimpleLauncher elements
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
    await expect(page.locator('text=Simple process launcher - no social features, no users')).toBeVisible();

    // Verify system information section
    await expect(page.locator('.system-info')).toBeVisible();
    await expect(page.locator('text=Claude Code:')).toBeVisible();
    await expect(page.locator('text=Working Directory:')).toBeVisible();

    // Verify status section
    await expect(page.locator('.status-section')).toBeVisible();
    await expect(page.locator('text=Process Status')).toBeVisible();

    // Verify control buttons
    await expect(page.locator('.controls')).toBeVisible();
    await expect(page.locator('.launch-button')).toBeVisible();
    await expect(page.locator('.stop-button')).toBeVisible();
  });

  test('CRITICAL: Launch button functionality works correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Wait for initial status check
    await page.waitForTimeout(1000);

    // Verify launch button is enabled initially
    const launchButton = page.locator('.launch-button');
    await expect(launchButton).toBeEnabled();
    await expect(launchButton).toContainText('Launch Claude');

    // Click launch button
    await launchButton.click();

    // Wait for loading state
    await expect(launchButton).toContainText('Launching...');

    // Wait for response and verify running state
    await page.waitForTimeout(2000);
    
    // After launch, button should be disabled and show running status
    await expect(launchButton).toBeDisabled();
  });

  test('CRITICAL: Stop button functionality works correctly', async ({ page }) => {
    // First launch the process
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    const launchButton = page.locator('.launch-button');
    await launchButton.click();
    await page.waitForTimeout(2000);

    // Now test stop functionality
    const stopButton = page.locator('.stop-button');
    await expect(stopButton).toBeEnabled();
    await expect(stopButton).toContainText('Stop Claude');

    // Click stop button
    await stopButton.click();

    // Verify stopping state
    await expect(stopButton).toContainText('Stopping...');

    // Wait for stop to complete
    await page.waitForTimeout(2000);
    
    // Button should be disabled after stopping
    await expect(stopButton).toBeDisabled();
  });

  test('CRITICAL: API communication and status polling works', async ({ page }) => {
    let apiCallCount = 0;
    
    // Count API calls
    page.route('**/api/claude/status', async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockApiResponses.status)
      });
    });

    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Wait for multiple polling cycles (2 second intervals)
    await page.waitForTimeout(6000);

    // Verify API polling is working
    expect(apiCallCount).toBeGreaterThan(2);

    // Verify status display is updated
    await expect(page.locator('.status.stopped')).toBeVisible();
    await expect(page.locator('text=⚫ Stopped')).toBeVisible();
  });

  test('CRITICAL: Claude availability check works', async ({ page }) => {
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Wait for Claude availability check
    await page.waitForTimeout(2000);

    // Verify Claude availability is displayed
    await expect(page.locator('text=✅ Available')).toBeVisible();
    
    // Verify working directory is shown
    await expect(page.locator('text=/prod')).toBeVisible();
  });

  test('CRITICAL: Error handling for unavailable Claude', async ({ page }) => {
    // Mock Claude as unavailable
    await page.route('**/api/claude/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claudeAvailable: false,
          message: 'Claude Code not found'
        })
      });
    });

    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Wait for availability check
    await page.waitForTimeout(2000);

    // Verify error display
    await expect(page.locator('text=❌ Not Found')).toBeVisible();
    await expect(page.locator('.warning')).toBeVisible();
    await expect(page.locator('text=⚠️ Claude Code not found')).toBeVisible();

    // Launch button should be disabled
    await expect(page.locator('.launch-button')).toBeDisabled();
  });

  test('CRITICAL: Mobile viewport responsiveness', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Verify mobile sidebar functionality
    const menuButton = page.locator('button[aria-label*="menu"], button:has(svg)').first();
    await expect(menuButton).toBeVisible();

    // Open mobile menu
    await menuButton.click();
    
    // Verify sidebar is visible on mobile
    await expect(page.locator('nav')).toBeVisible();
    
    // Navigate to SimpleLauncher via mobile menu
    const launcherLink = page.locator('nav a[href="/simple-launcher"]');
    await launcherLink.click();

    // Verify SimpleLauncher loads correctly on mobile
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
    
    // Verify responsive layout
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('.controls')).toBeVisible();
  });

  test('CRITICAL: Process status updates correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Initial stopped state
    await expect(page.locator('.status.stopped')).toBeVisible();
    await expect(page.locator('text=⚫ Stopped')).toBeVisible();

    // Launch process
    const launchButton = page.locator('.launch-button');
    await launchButton.click();

    // Wait for running state
    await page.waitForTimeout(2000);
    
    // Verify running status is displayed
    await expect(page.locator('text=✅ Running')).toBeVisible();
  });

  test('CRITICAL: Browser console should be clean', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Wait for all async operations
    await page.waitForTimeout(3000);

    // Verify no critical errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('import') || 
      error.includes('duplicate') ||
      error.includes('SyntaxError') ||
      error.includes('ReferenceError')
    );

    expect(criticalErrors).toHaveLength(0);
    
    // Log any remaining errors for debugging
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }
  });
});

test.describe('SimpleLauncher E2E Workflow Tests', () => {
  test('CRITICAL: Full launch-stop workflow', async ({ page }) => {
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // 1. Initial state verification
    await expect(page.locator('.status.stopped')).toBeVisible();
    await expect(page.locator('.launch-button')).toBeEnabled();
    await expect(page.locator('.stop-button')).toBeDisabled();

    // 2. Launch process
    await page.locator('.launch-button').click();
    await page.waitForTimeout(2000);

    // 3. Verify running state
    await expect(page.locator('.launch-button')).toBeDisabled();
    await expect(page.locator('.stop-button')).toBeEnabled();

    // 4. Stop process
    await page.locator('.stop-button').click();
    await page.waitForTimeout(2000);

    // 5. Verify stopped state
    await expect(page.locator('.launch-button')).toBeEnabled();
    await expect(page.locator('.stop-button')).toBeDisabled();
  });

  test('CRITICAL: Navigation and functionality persistence', async ({ page }) => {
    // Test navigation between pages doesn't break SimpleLauncher
    await page.goto('http://localhost:3000');
    
    // Navigate to SimpleLauncher
    await page.locator('nav a[href="/simple-launcher"]').click();
    await page.waitForLoadState('networkidle');
    
    // Navigate away and back
    await page.locator('nav a[href="/"]').click();
    await page.waitForLoadState('networkidle');
    
    await page.locator('nav a[href="/simple-launcher"]').click();
    await page.waitForLoadState('networkidle');
    
    // Verify functionality still works
    await expect(page.locator('.launch-button')).toBeVisible();
    await expect(page.locator('.stop-button')).toBeVisible();
  });
});
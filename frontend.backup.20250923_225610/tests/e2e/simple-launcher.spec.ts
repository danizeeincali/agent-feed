/**
 * Playwright E2E Tests for Simple Claude Launcher
 * Focus: Simple button click workflow - NO complex social features
 */

import { test, expect } from '@playwright/test';

test.describe('Simple Claude Launcher', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the main page
    await page.goto('http://localhost:3000');
  });

  test('should display Simple Launcher navigation', async ({ page }) => {
    // Check that Simple Launcher navigation button exists
    const simpleLauncherButton = page.getByRole('button', { name: /Simple Launcher/i });
    await expect(simpleLauncherButton).toBeVisible();
  });

  test('should navigate to Simple Launcher page', async ({ page }) => {
    // Click Simple Launcher navigation
    const simpleLauncherButton = page.getByRole('button', { name: /Simple Launcher/i });
    await simpleLauncherButton.click();

    // Verify we're on the Simple Launcher page
    await expect(page.getByText('Claude Code Launcher')).toBeVisible();
    await expect(page.getByText('Simple process launcher - no social features, no users')).toBeVisible();
  });

  test('should display system information', async ({ page }) => {
    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Check system information is displayed
    await expect(page.getByText('Claude Code:')).toBeVisible();
    await expect(page.getByText('Working Directory:')).toBeVisible();
    await expect(page.getByText('/prod')).toBeVisible();
  });

  test('should check Claude availability', async ({ page }) => {
    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Wait for Claude availability check to complete
    await page.waitForTimeout(1000);

    // Should show either Available or Not Found
    const claudeStatus = page.locator('text=Claude Code:').locator('..').first();
    await expect(claudeStatus).toContainText(/Available|Not Found/);
  });

  test('should display initial process status as Stopped', async ({ page }) => {
    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Check initial status
    await expect(page.getByText('Process Status')).toBeVisible();
    await expect(page.getByText('⚫ Stopped')).toBeVisible();
  });

  test('should have Launch and Stop buttons', async ({ page }) => {
    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Check buttons exist
    const launchButton = page.getByRole('button', { name: /Launch Claude/i });
    const stopButton = page.getByRole('button', { name: /Stop Claude/i });

    await expect(launchButton).toBeVisible();
    await expect(stopButton).toBeVisible();
  });

  test('should disable Launch button when Claude not available', async ({ page }) => {
    // Mock API to return Claude not available
    await page.route('**/api/simple-claude/check', async route => {
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

    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Wait for availability check
    await page.waitForTimeout(500);

    // Launch button should be disabled
    const launchButton = page.getByRole('button', { name: /Launch Claude/i });
    await expect(launchButton).toBeDisabled();

    // Warning should be displayed
    await expect(page.getByText('⚠️ Claude Code not found')).toBeVisible();
  });

  test('should launch process successfully', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/simple-claude/check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });
    });

    await page.route('**/api/simple-claude/launch', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Claude launched successfully',
          status: {
            isRunning: true,
            status: 'running',
            pid: 12345,
            startedAt: new Date().toISOString(),
            workingDirectory: '/workspaces/agent-feed/prod'
          }
        })
      });
    });

    await page.route('**/api/simple-claude/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: {
            isRunning: true,
            status: 'running',
            pid: 12345,
            startedAt: new Date().toISOString(),
            workingDirectory: '/workspaces/agent-feed/prod'
          }
        })
      });
    });

    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Wait for availability check
    await page.waitForTimeout(500);

    // Click Launch button
    const launchButton = page.getByRole('button', { name: /Launch Claude/i });
    await expect(launchButton).toBeEnabled();
    await launchButton.click();

    // Should show launching state
    await expect(page.getByText('🔄 Launching...')).toBeVisible();

    // Wait for status update
    await page.waitForTimeout(1000);

    // Should show running status
    await expect(page.getByText('✅ Running (PID: 12345)')).toBeVisible();

    // Launch button should be disabled, Stop button enabled
    await expect(launchButton).toBeDisabled();
    await expect(page.getByRole('button', { name: /Stop Claude/i })).toBeEnabled();
  });

  test('should stop process successfully', async ({ page }) => {
    // Mock running state first
    await page.route('**/api/simple-claude/check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });
    });

    await page.route('**/api/simple-claude/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: {
            isRunning: true,
            status: 'running',
            pid: 12345,
            startedAt: new Date().toISOString(),
            workingDirectory: '/workspaces/agent-feed/prod'
          }
        })
      });
    });

    await page.route('**/api/simple-claude/stop', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Claude stopped successfully',
          status: {
            isRunning: false,
            status: 'stopped',
            pid: null,
            startedAt: null,
            workingDirectory: '/workspaces/agent-feed/prod'
          }
        })
      });
    });

    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Wait for status to show running
    await page.waitForTimeout(1000);

    // Click Stop button
    const stopButton = page.getByRole('button', { name: /Stop Claude/i });
    await expect(stopButton).toBeEnabled();
    await stopButton.click();

    // Should show stopping state
    await expect(page.getByText('🔄 Stopping...')).toBeVisible();

    // Should return to stopped state
    await expect(page.getByText('⚫ Stopped')).toBeVisible();
  });

  test('should handle launch errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/simple-claude/check', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code is available'
        })
      });
    });

    await page.route('**/api/simple-claude/launch', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Failed to launch Claude',
          error: 'Process already running'
        })
      });
    });

    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Wait for availability check
    await page.waitForTimeout(500);

    // Set up dialog handler for error alert
    page.on('dialog', dialog => dialog.accept());

    // Click Launch button - should trigger error
    const launchButton = page.getByRole('button', { name: /Launch Claude/i });
    await launchButton.click();
  });

  test('should poll status every 2 seconds', async ({ page }) => {
    let statusCallCount = 0;

    // Mock status endpoint to count calls
    await page.route('**/api/simple-claude/status', async route => {
      statusCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: {
            isRunning: false,
            status: 'stopped',
            pid: null,
            workingDirectory: '/workspaces/agent-feed/prod'
          }
        })
      });
    });

    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Wait for multiple status polls (should happen every 2 seconds)
    await page.waitForTimeout(5000);

    // Should have made multiple status calls
    expect(statusCallCount).toBeGreaterThanOrEqual(2);
  });

  test('should display working directory information', async ({ page }) => {
    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Should display working directory
    await expect(page.getByText('Working Directory:')).toBeVisible();
    await expect(page.getByText(/\/prod/)).toBeVisible();
  });

  test('should have proper responsive design', async ({ page }) => {
    // Navigate to Simple Launcher
    await page.getByRole('button', { name: /Simple Launcher/i }).click();

    // Check that main container is properly sized
    const launcher = page.locator('.simple-launcher');
    await expect(launcher).toBeVisible();

    // Check that buttons are properly styled
    const launchButton = page.getByRole('button', { name: /Launch Claude/i });
    await expect(launchButton).toHaveCSS('background-color', 'rgb(40, 167, 69)'); // Bootstrap green

    const stopButton = page.getByRole('button', { name: /Stop Claude/i });
    await expect(stopButton).toHaveCSS('background-color', 'rgb(108, 117, 125)'); // Bootstrap gray (disabled)
  });
});
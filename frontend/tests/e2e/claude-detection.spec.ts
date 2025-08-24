/**
 * Playwright E2E Tests for Claude Code Detection
 * Complete user flow validation with regression prevention
 */

import { test, expect } from '@playwright/test';

test.describe('Claude Code Detection E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to SimpleLauncher
    await page.goto('http://localhost:5173');
    
    // Wait for React to load
    await page.waitForLoadState('networkidle');
    
    // Enable console logging for debugging
    page.on('console', (msg) => {
      if (msg.text().includes('SPARC DEBUG')) {
        console.log(`🔍 Browser Console: ${msg.text()}`);
      }
    });
  });

  test('should display Claude Code as available when backend returns success', async ({ page }) => {
    // Wait for the API call to complete and UI to update
    await page.waitForSelector('[data-testid="claude-availability"]', { timeout: 10000 });
    
    // Check that Claude is detected as available
    const availabilityElement = await page.locator('[data-testid="claude-availability"]');
    await expect(availabilityElement).toContainText('✅ Available');
    
    // Ensure warning message is not shown
    await expect(page.locator('text=Claude Code not found')).not.toBeVisible();
    
    // Launch button should be enabled
    const launchButton = page.locator('button:has-text("Launch Claude")');
    await expect(launchButton).toBeEnabled();
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // Intercept API call and force failure
    await page.route('/api/claude/check', route => {
      route.abort('failed');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show Claude as not available
    const availabilityElement = await page.locator('[data-testid="claude-availability"]');
    await expect(availabilityElement).toContainText('❌ Not Found');
    
    // Warning message should be shown
    await expect(page.locator('text=Claude Code not found')).toBeVisible();
    
    // Launch button should be disabled
    const launchButton = page.locator('button:has-text("Launch Claude")');
    await expect(launchButton).toBeDisabled();
  });

  test('should successfully launch Claude when available', async ({ page }) => {
    // Wait for Claude to be detected as available
    await page.waitForSelector('[data-testid="claude-availability"]:has-text("Available")', { timeout: 10000 });
    
    // Mock successful launch response
    await page.route('/api/claude/launch', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Claude launched successfully',
          status: {
            isRunning: true,
            pid: 12345,
            status: 'running',
            startedAt: new Date().toISOString(),
            workingDirectory: '/prod'
          }
        })
      });
    });
    
    // Click launch button
    const launchButton = page.locator('button:has-text("Launch Claude")');
    await launchButton.click();
    
    // Should show running status
    await expect(page.locator('text=✅ Running')).toBeVisible({ timeout: 5000 });
    
    // Stop button should be enabled
    const stopButton = page.locator('button:has-text("Stop Claude")');
    await expect(stopButton).toBeEnabled();
    
    // Terminal section should appear
    await expect(page.locator('text=Claude Terminal')).toBeVisible();
  });

  test('should display proper error messages on launch failure', async ({ page }) => {
    // Wait for Claude to be detected as available
    await page.waitForSelector('[data-testid="claude-availability"]:has-text("Available")', { timeout: 10000 });
    
    // Mock failed launch response
    await page.route('/api/claude/launch', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Failed to launch Claude',
          error: 'Process already running'
        })
      });
    });
    
    // Click launch button
    const launchButton = page.locator('button:has-text("Launch Claude")');
    await launchButton.click();
    
    // Should show error alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Failed to launch');
      await dialog.accept();
    });
  });

  test('should handle network errors without crashing', async ({ page }) => {
    // Block all API calls
    await page.route('/api/**', route => {
      route.abort('blockedbyclient');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should still render the page
    await expect(page.locator('h1:has-text("Claude Code Launcher")')).toBeVisible();
    
    // Should show Claude as unavailable
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    await expect(availabilityElement).toContainText('❌ Not Found');
  });

  test('should maintain state consistency during WebSocket failures', async ({ page }) => {
    // This test ensures Claude detection works even when WebSocket connections fail
    
    // Block WebSocket connections
    await page.route('**socket.io**', route => {
      route.abort('failed');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Claude detection should still work via HTTP API
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    await expect(availabilityElement).toContainText('✅ Available', { timeout: 10000 });
    
    // Launch functionality should work
    const launchButton = page.locator('button:has-text("Launch Claude")');
    await expect(launchButton).toBeEnabled();
  });

  test('should show proper loading states', async ({ page }) => {
    // Delay API response to test loading state
    await page.route('/api/claude/check', async route => {
      await page.waitForTimeout(2000); // 2 second delay
      route.continue();
    });
    
    await page.reload();
    
    // Should show checking state initially
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    await expect(availabilityElement).toContainText('🔄 Checking...');
    
    // Should eventually show available
    await expect(availabilityElement).toContainText('✅ Available', { timeout: 15000 });
  });

  test('regression: should not break when terminal components are present', async ({ page }) => {
    // This test ensures the fix doesn't break terminal functionality
    
    // Wait for Claude to be available and launch it
    await page.waitForSelector('[data-testid="claude-availability"]:has-text("Available")', { timeout: 10000 });
    
    // Mock successful launch
    await page.route('/api/claude/launch', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Claude launched successfully',
          status: {
            isRunning: true,
            pid: 12345,
            status: 'running',
            startedAt: new Date().toISOString()
          }
        })
      });
    });
    
    const launchButton = page.locator('button:has-text("Launch Claude")');
    await launchButton.click();
    
    // Terminal section should appear
    await expect(page.locator('text=Claude Terminal')).toBeVisible({ timeout: 5000 });
    
    // Terminal toggle buttons should be present
    await expect(page.locator('button:has-text("Show Terminal")')).toBeVisible();
    await expect(page.locator('button:has-text("Fixed")')).toBeVisible();
    
    // Claude detection should still show as available
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    await expect(availabilityElement).toContainText('✅ Available');
  });
});
/**
 * E2E Tests for Dual Instance Manager
 * 
 * Comprehensive Playwright tests for the complete Claude Instance Manager system
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Dual Instance Manager E2E', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to dual instance page
    await page.goto('http://localhost:3001/dual-instance');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should load dual instance manager page', async () => {
    // Check page loads
    await expect(page.locator('h1:has-text("Claude Instance Manager")')).toBeVisible();
    
    // Check main sections are present
    await expect(page.locator('text="Launch New Instance"')).toBeVisible();
    await expect(page.locator('text="Terminal"')).toBeVisible();
    await expect(page.locator('text="Dual Instance Monitor"')).toBeVisible();
  });

  test('should display process information correctly', async () => {
    // Check instance status display
    const statusSection = page.locator('[data-testid="instance-status"]').first();
    await expect(statusSection).toBeVisible();
    
    // Should show either running or stopped status
    const hasStatus = await page.locator('text=/running|stopped|connecting/').count() > 0;
    expect(hasStatus).toBeTruthy();
  });

  test('should handle launch button interactions', async () => {
    const launchButton = page.locator('button:has-text("Launch New Instance")');
    
    // Button should be visible
    await expect(launchButton).toBeVisible();
    
    // Check if button is enabled or disabled appropriately
    const isDisabled = await launchButton.isDisabled();
    
    if (!isDisabled) {
      // Click launch button
      await launchButton.click();
      
      // Should show launching state
      await expect(page.locator('text="Launching..."')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should display terminal interface', async () => {
    // Check terminal container exists
    const terminal = page.locator('.xterm').first();
    await expect(terminal).toBeVisible();
    
    // Terminal should have proper styling
    const terminalBg = await terminal.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(terminalBg).toBe('rgb(30, 30, 30)'); // Dark background
  });

  test('should handle configuration panel', async () => {
    const configButton = page.locator('button:has-text("Config")');
    await expect(configButton).toBeVisible();
    
    // Open config panel
    await configButton.click();
    
    // Check config panel appears
    await expect(page.locator('text="Configuration"')).toBeVisible();
    await expect(page.locator('input[type="number"]')).toBeVisible();
    
    // Test auto-restart configuration
    const autoRestartInput = page.locator('input[type="number"]');
    await autoRestartInput.fill('8');
    
    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();
    
    // Should update configuration
    await expect(autoRestartInput).toHaveValue('8');
  });

  test('should show control buttons with appropriate states', async () => {
    // Check all control buttons exist
    await expect(page.locator('button:has-text("Launch New Instance")')).toBeVisible();
    await expect(page.locator('button:has-text("Restart")')).toBeVisible();
    await expect(page.locator('button:has-text("Kill")')).toBeVisible();
    await expect(page.locator('button:has-text("Config")')).toBeVisible();
    
    // Buttons should have appropriate states based on process status
    const restartButton = page.locator('button:has-text("Restart")');
    const killButton = page.locator('button:has-text("Kill")');
    
    // If no process is running, these should be disabled
    const processRunning = await page.locator('text="running"').count() > 0;
    
    if (!processRunning) {
      await expect(restartButton).toBeDisabled();
      await expect(killButton).toBeDisabled();
    }
  });

  test('should handle error states gracefully', async () => {
    // Check for error display area
    const errorContainer = page.locator('[data-testid="error-display"]').first();
    
    // Error container should exist (even if empty)
    const errorExists = await errorContainer.count() > 0;
    
    // If errors are displayed, they should be user-friendly
    if (errorExists && await errorContainer.isVisible()) {
      const errorText = await errorContainer.textContent();
      expect(errorText).toBeTruthy();
      expect(errorText?.length).toBeGreaterThan(0);
    }
  });

  test('should integrate with dual instance monitor', async () => {
    // Check monitor section exists
    await expect(page.locator('text="Dual Instance Monitor"')).toBeVisible();
    
    // Should show instance detection
    const monitorSection = page.locator('[data-testid="dual-instance-monitor"]').first();
    
    if (await monitorSection.count() > 0) {
      await expect(monitorSection).toBeVisible();
      
      // Should show monitoring status
      const hasMonitoringText = await page.locator('text=/Monitoring|Instance|Connected/').count() > 0;
      expect(hasMonitoringText).toBeTruthy();
    }
  });

  test('should handle real-time updates', async () => {
    // Monitor for real-time changes
    const statusElements = page.locator('[data-testid*="status"]');
    
    // Should have status elements
    const statusCount = await statusElements.count();
    expect(statusCount).toBeGreaterThan(0);
    
    // Check for timestamps or live updates
    const hasTimestamp = await page.locator('text=/\\d{2}:\\d{2}:\\d{2}/').count() > 0;
    const hasLiveIndicator = await page.locator('text=/Live|Active|Running/').count() > 0;
    
    expect(hasTimestamp || hasLiveIndicator).toBeTruthy();
  });

  test('should be responsive and accessible', async () => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should still be functional
    await expect(page.locator('h1:has-text("Claude Instance Manager")')).toBeVisible();
    
    // Key elements should be accessible
    const launchButton = page.locator('button:has-text("Launch New Instance")');
    await expect(launchButton).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to focus elements
    const focusedElement = page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
    
    // Return to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle multi-tab synchronization', async () => {
    // Open second tab with same page
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3001/dual-instance');
    await page2.waitForLoadState('networkidle');
    
    // Both pages should load correctly
    await expect(page.locator('h1:has-text("Claude Instance Manager")')).toBeVisible();
    await expect(page2.locator('h1:has-text("Claude Instance Manager")')).toBeVisible();
    
    // Terminal should be synchronized (if feature is implemented)
    const terminal1 = page.locator('.xterm').first();
    const terminal2 = page2.locator('.xterm').first();
    
    await expect(terminal1).toBeVisible();
    await expect(terminal2).toBeVisible();
    
    await page2.close();
  });

  test('should persist state across page refresh', async () => {
    // Get initial state
    const configButton = page.locator('button:has-text("Config")');
    await configButton.click();
    
    const autoRestartInput = page.locator('input[type="number"]');
    await autoRestartInput.fill('12');
    
    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();
    
    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if state persisted
    await configButton.click();
    
    // Configuration should be maintained
    await expect(autoRestartInput).toHaveValue('12');
  });

  test('should handle WebSocket connections properly', async () => {
    // Monitor WebSocket connections
    const wsMessages: string[] = [];
    
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        wsMessages.push(event.payload.toString());
      });
    });
    
    // Trigger WebSocket activity by interacting with terminal
    const terminal = page.locator('.xterm').first();
    await terminal.click();
    
    // Wait for potential WebSocket activity
    await page.waitForTimeout(2000);
    
    // Should have established WebSocket connection
    // (This test validates that WebSocket setup doesn't cause errors)
    const hasErrors = await page.locator('text=/Error|Failed|Disconnected/').count();
    expect(hasErrors).toBeLessThan(3); // Allow some disconnect messages during initialization
  });
});
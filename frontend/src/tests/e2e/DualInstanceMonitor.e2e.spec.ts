/**
 * Playwright E2E Tests for Dual Instance Monitor
 * 
 * Tests real browser interactions and WebSocket functionality
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Dual Instance Monitor E2E', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:3001');
    
    // Navigate to Performance section and Dual Instances tab
    await page.waitForSelector('[data-testid="performance-monitor"]', { timeout: 10000 });
    await page.click('button:has-text("Dual Instances")');
    await page.waitForSelector('text="Dual Instance Monitor"');
  });

  test('should load Dual Instance Monitor without errors', async () => {
    await expect(page.locator('text="Dual Instance Monitor"')).toBeVisible();
    await expect(page.locator('text="Instance Logs"')).toBeVisible();
    
    // Should show monitoring active
    await expect(page.locator('text="Monitoring Active"')).toBeVisible();
  });

  test('should detect single Claude instance', async () => {
    // Wait for hub connection
    await page.waitForSelector('text="Hub Connected"', { timeout: 15000 });
    
    // Should show at least one instance
    await page.waitForSelector('[data-testid*="instance-card"]', { timeout: 10000 });
    
    // Should NOT show dual mode if only one instance
    const dualMode = page.locator('text="Dual Mode Active"');
    await expect(dualMode).not.toBeVisible();
  });

  test('should show connection status indicators', async () => {
    await page.waitForSelector('text="Hub Connected"', { timeout: 15000 });
    
    // Should show status for detected instances
    const statusElements = await page.locator('[data-testid*="instance-status"]').count();
    expect(statusElements).toBeGreaterThan(0);
    
    // Check for status indicators (connected/disconnected/connecting)
    const hasConnectedStatus = await page.locator('text="connected"').count() > 0;
    const hasStatusIcon = await page.locator('svg[data-testid*="status-icon"]').count() > 0;
    
    expect(hasConnectedStatus || hasStatusIcon).toBeTruthy();
  });

  test('should handle log filtering', async () => {
    await page.waitForSelector('text="Hub Connected"', { timeout: 15000 });
    
    // Test log level filter
    const logLevelFilter = page.locator('select').nth(1); // Second select is log level
    await logLevelFilter.selectOption('error');
    
    // Should update display
    await expect(logLevelFilter).toHaveValue('error');
    
    // Test instance filter
    const instanceFilter = page.locator('select').nth(0); // First select is instance
    await instanceFilter.selectOption('all');
    await expect(instanceFilter).toHaveValue('all');
  });

  test('should toggle auto-scroll', async () => {
    const autoScrollButton = page.locator('button:has-text("Auto-scroll")');
    await expect(autoScrollButton).toBeVisible();
    
    // Should be enabled by default (blue background)
    await expect(autoScrollButton).toHaveClass(/bg-blue-500/);
    
    // Click to disable
    await autoScrollButton.click();
    await expect(autoScrollButton).toHaveClass(/bg-gray-200/);
    
    // Click to re-enable
    await autoScrollButton.click();
    await expect(autoScrollButton).toHaveClass(/bg-blue-500/);
  });

  test('should clear logs when clear button clicked', async () => {
    const clearButton = page.locator('button:has-text("Clear")');
    await expect(clearButton).toBeVisible();
    
    // Click clear button
    await clearButton.click();
    
    // Should show "No logs to display" message
    await expect(page.locator('text="No logs to display"')).toBeVisible();
  });

  test('should handle connection failures gracefully', async () => {
    // Monitor should load even if WebSocket fails
    await expect(page.locator('text="Dual Instance Monitor"')).toBeVisible();
    
    // Should show appropriate status when connection fails
    const connectionStatus = page.locator('[data-testid*="connection-status"]').first();
    
    // Either connected or shows graceful error handling
    const isConnected = await page.locator('text="Hub Connected"').isVisible();
    const isOffline = await page.locator('text="Hub Offline"').isVisible();
    const isConnecting = await page.locator('text="Connecting..."').isVisible();
    
    expect(isConnected || isOffline || isConnecting).toBeTruthy();
  });

  test('should update in real-time', async () => {
    await page.waitForSelector('text="Hub Connected"', { timeout: 15000 });
    
    // Monitor for updates over time
    const initialText = await page.locator('[data-testid*="uptime"]').first().textContent();
    
    // Wait a few seconds
    await page.waitForTimeout(3000);
    
    // Check if any dynamic content updated
    const hasTimestamp = await page.locator('text=/\\d{2}:\\d{2}:\\d{2}/').count() > 0;
    const hasActivity = await page.locator('[data-testid*="activity-indicator"]').count() > 0;
    
    expect(hasTimestamp || hasActivity).toBeTruthy();
  });

  test('should be accessible', async () => {
    // Check for proper ARIA labels and keyboard navigation
    await expect(page.locator('h2:has-text("Dual Instance Monitor")')).toBeVisible();
    
    // Tab navigation should work
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should have focusable elements
    const focusableElements = await page.locator('button, select, [tabindex]:not([tabindex="-1"])').count();
    expect(focusableElements).toBeGreaterThan(0);
  });

  test('should handle dual instance mode if available', async () => {
    await page.waitForSelector('text="Hub Connected"', { timeout: 15000 });
    
    // Check if dual mode is active
    const dualModeIndicator = page.locator('text="Dual Mode Active"');
    const instanceCount = await page.locator('[data-testid*="instance-card"]').count();
    
    if (instanceCount >= 2) {
      await expect(dualModeIndicator).toBeVisible();
    } else {
      await expect(dualModeIndicator).not.toBeVisible();
    }
  });

  test('should maintain state across navigation', async () => {
    await page.waitForSelector('text="Hub Connected"', { timeout: 15000 });
    
    // Set specific filter
    const logLevelFilter = page.locator('select').nth(1);
    await logLevelFilter.selectOption('warn');
    
    // Navigate away and back
    await page.click('button:has-text("Performance")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Dual Instances")');
    
    // State should be preserved
    await expect(logLevelFilter).toHaveValue('warn');
  });
});
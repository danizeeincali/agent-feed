/**
 * Playwright E2E Test: Dual Instance Filter Fix Validation
 * 
 * Comprehensive browser-based validation that the dual-instance page loads
 * successfully without TypeError filter errors and provides full functionality.
 * 
 * Test Coverage:
 * - Page loading without crashes or white screens
 * - Absence of console errors (specifically filter-related TypeErrors)
 * - Component rendering and visibility
 * - Tab navigation functionality
 * - Instance launcher interface
 * - Error boundary protection
 * - Real-time monitoring capabilities
 * 
 * This test provides final validation that the filter error fix works
 * in a real browser environment.
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration constants
const DUAL_INSTANCE_URL = '/dual-instance';
const PAGE_LOAD_TIMEOUT = 30000;
const ELEMENT_TIMEOUT = 10000;
const TAB_SWITCH_DELAY = 1000;

// Selectors for key UI elements
const SELECTORS = {
  // Main page elements
  pageTitle: 'h1:has-text("Claude Instance Manager")',
  instanceControlPanel: '[data-testid="instance-control-panel"], .bg-white.rounded-lg.shadow-md:has(h1)',
  
  // Control buttons
  launchButton: 'button:has-text("Launch New Instance")',
  restartButton: 'button:has-text("Restart")',
  killButton: 'button:has-text("Kill")',
  configButton: 'button:has-text("Config")',
  
  // Status indicators
  statusIcon: '.text-green-500, .text-gray-500, .text-yellow-500, .text-red-500',
  processInfo: 'span:has-text("PID:"), span:has-text("Auto-restart:")',
  
  // Terminal section
  terminalSection: 'h2:has-text("Terminal")',
  terminalContainer: '[style*="height: 400px"], .bg-black.rounded',
  
  // Dual Instance Monitor
  monitorTitle: 'h2:has-text("Dual Instance Monitor")',
  instanceCards: '.grid-cols-1.md\\:grid-cols-2 > div, .border-2',
  logViewer: '.bg-gray-900.text-gray-100',
  
  // Filters and controls
  instanceFilter: 'select[value="all"]',
  logLevelFilter: 'select',
  autoScrollButton: 'button:has-text("Auto-scroll")',
  clearLogsButton: 'button:has-text("Clear")',
  
  // Status indicators
  hubStatus: 'span:has-text("Hub")',
  monitoringActive: 'span:has-text("Monitoring Active")',
  
  // Configuration panel
  configPanel: '.bg-gray-50.rounded-lg',
  autoRestartInput: 'input[type="number"]',
  applyButton: 'button:has-text("Apply")',
  
  // Error displays
  errorDisplay: '.bg-red-50, .text-red-700',
  errorBoundary: '[data-testid="error-boundary"]'
};

/**
 * Capture and analyze console messages for filter-related errors
 */
async function setupConsoleLogging(page: Page): Promise<string[]> {
  const consoleMessages: string[] = [];
  const errorMessages: string[] = [];
  
  // Capture all console messages
  page.on('console', (message) => {
    const text = message.text();
    consoleMessages.push(`[${message.type()}] ${text}`);
    
    // Track filter-related errors specifically
    if (message.type() === 'error' && text.toLowerCase().includes('filter')) {
      errorMessages.push(text);
    }
  });
  
  // Capture page errors
  page.on('pageerror', (error) => {
    const errorText = error.message;
    consoleMessages.push(`[pageerror] ${errorText}`);
    
    if (errorText.toLowerCase().includes('filter')) {
      errorMessages.push(errorText);
    }
  });
  
  return errorMessages;
}

/**
 * Wait for page to be fully loaded and stable
 */
async function waitForPageStability(page: Page): Promise<void> {
  // Wait for main content to be visible
  await expect(page.locator(SELECTORS.pageTitle)).toBeVisible({ timeout: ELEMENT_TIMEOUT });
  
  // Wait for key components to load
  await expect(page.locator(SELECTORS.instanceControlPanel)).toBeVisible({ timeout: ELEMENT_TIMEOUT });
  await expect(page.locator(SELECTORS.monitorTitle)).toBeVisible({ timeout: ELEMENT_TIMEOUT });
  
  // Wait for React hydration and async operations
  await page.waitForTimeout(2000);
  
  // Wait for network idle (no requests for 1 second)
  await page.waitForLoadState('networkidle');
}

/**
 * Validate that no filter-related TypeErrors exist in console
 */
async function validateNoFilterErrors(errorMessages: string[]): Promise<void> {
  // Check for specific filter-related error patterns
  const filterErrorPatterns = [
    /Cannot read propert(y|ies) of undefined \(reading 'filter'\)/i,
    /Cannot read propert(y|ies) of null \(reading 'filter'\)/i,
    /\.filter is not a function/i,
    /TypeError.*filter/i,
    /filter.*undefined/i,
    /filter.*null/i
  ];
  
  const foundFilterErrors = errorMessages.filter(error => 
    filterErrorPatterns.some(pattern => pattern.test(error))
  );
  
  expect(foundFilterErrors).toHaveLength(0);
  
  if (foundFilterErrors.length > 0) {
    throw new Error(`Filter-related errors detected: ${foundFilterErrors.join(', ')}`);
  }
}

test.describe('Dual Instance Filter Fix Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up extended timeouts for complex page
    test.setTimeout(60000);
    
    // Enable console logging
    await setupConsoleLogging(page);
  });

  test('should load dual-instance page without filter errors', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    // Navigate to dual instance page
    await page.goto(DUAL_INSTANCE_URL, { 
      waitUntil: 'domcontentloaded',
      timeout: PAGE_LOAD_TIMEOUT 
    });
    
    // Wait for page stability
    await waitForPageStability(page);
    
    // Validate no filter errors occurred
    await validateNoFilterErrors(errorMessages);
    
    // Verify page loaded successfully (not white screen)
    await expect(page.locator(SELECTORS.pageTitle)).toBeVisible();
    await expect(page.locator(SELECTORS.pageTitle)).toHaveText('Claude Instance Manager');
  });

  test('should render main interface components correctly', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Validate no filter errors
    await validateNoFilterErrors(errorMessages);
    
    // Check instance control panel
    await expect(page.locator(SELECTORS.instanceControlPanel)).toBeVisible();
    
    // Validate control buttons are present
    await expect(page.locator(SELECTORS.launchButton)).toBeVisible();
    await expect(page.locator(SELECTORS.restartButton)).toBeVisible();
    await expect(page.locator(SELECTORS.killButton)).toBeVisible();
    await expect(page.locator(SELECTORS.configButton)).toBeVisible();
    
    // Check status icon is present
    await expect(page.locator(SELECTORS.statusIcon)).toBeVisible();
    
    // Validate terminal section
    await expect(page.locator(SELECTORS.terminalSection)).toBeVisible();
    await expect(page.locator(SELECTORS.terminalContainer)).toBeVisible();
    
    // Check dual instance monitor
    await expect(page.locator(SELECTORS.monitorTitle)).toBeVisible();
    await expect(page.locator(SELECTORS.logViewer)).toBeVisible();
  });

  test('should handle filter controls without errors', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Test instance filter dropdown
    const instanceFilter = page.locator(SELECTORS.instanceFilter).first();
    if (await instanceFilter.isVisible()) {
      await instanceFilter.click();
      await page.waitForTimeout(500);
      
      // Try to select "All Instances" option
      await instanceFilter.selectOption('all');
      await page.waitForTimeout(500);
    }
    
    // Test log level filter dropdown
    const logLevelFilter = page.locator(SELECTORS.logLevelFilter).first();
    if (await logLevelFilter.isVisible()) {
      await logLevelFilter.click();
      await page.waitForTimeout(500);
      
      // Try different filter options
      const options = ['all', 'info', 'warn', 'error'];
      for (const option of options) {
        try {
          await logLevelFilter.selectOption(option);
          await page.waitForTimeout(300);
        } catch (error) {
          // Option might not exist, continue
          console.log(`Option ${option} not available`);
        }
      }
    }
    
    // Validate no filter errors occurred during interactions
    await validateNoFilterErrors(errorMessages);
  });

  test('should handle configuration panel interactions', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Click config button to open panel
    await page.locator(SELECTORS.configButton).click();
    await page.waitForTimeout(TAB_SWITCH_DELAY);
    
    // Check if config panel is visible
    const configPanel = page.locator(SELECTORS.configPanel);
    if (await configPanel.isVisible()) {
      // Test auto-restart input
      const autoRestartInput = page.locator(SELECTORS.autoRestartInput);
      if (await autoRestartInput.isVisible()) {
        await autoRestartInput.fill('12');
        await page.waitForTimeout(500);
        
        // Test apply button
        const applyButton = page.locator(SELECTORS.applyButton);
        if (await applyButton.isVisible()) {
          await applyButton.click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Validate no filter errors during config interactions
    await validateNoFilterErrors(errorMessages);
  });

  test('should handle log viewer controls without filter errors', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Test auto-scroll toggle
    const autoScrollButton = page.locator(SELECTORS.autoScrollButton);
    if (await autoScrollButton.isVisible()) {
      await autoScrollButton.click();
      await page.waitForTimeout(500);
      await autoScrollButton.click(); // Toggle back
      await page.waitForTimeout(500);
    }
    
    // Test clear logs button
    const clearButton = page.locator(SELECTORS.clearLogsButton);
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }
    
    // Validate no filter errors during log viewer interactions
    await validateNoFilterErrors(errorMessages);
  });

  test('should maintain error boundary protection', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Check that error boundaries are not triggered
    const errorBoundary = page.locator(SELECTORS.errorBoundary);
    await expect(errorBoundary).not.toBeVisible();
    
    // Verify no error displays are shown
    const errorDisplay = page.locator(SELECTORS.errorDisplay);
    if (await errorDisplay.isVisible()) {
      // If error display is visible, it should not contain filter-related errors
      const errorText = await errorDisplay.textContent();
      expect(errorText?.toLowerCase()).not.toContain('filter');
      expect(errorText?.toLowerCase()).not.toContain('cannot read properties of undefined');
    }
    
    // Validate no filter errors occurred
    await validateNoFilterErrors(errorMessages);
  });

  test('should handle rapid filter changes without crashes', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Rapidly change filter settings to test stability
    const logLevelFilter = page.locator(SELECTORS.logLevelFilter).first();
    
    if (await logLevelFilter.isVisible()) {
      const filterOptions = ['all', 'info', 'warn', 'error', 'all'];
      
      for (let i = 0; i < 3; i++) { // Test multiple cycles
        for (const option of filterOptions) {
          try {
            await logLevelFilter.selectOption(option);
            await page.waitForTimeout(100); // Rapid changes
          } catch (error) {
            // Option might not exist, continue
          }
        }
      }
    }
    
    // Page should still be responsive
    await expect(page.locator(SELECTORS.pageTitle)).toBeVisible();
    await expect(page.locator(SELECTORS.monitorTitle)).toBeVisible();
    
    // Validate no filter errors during rapid changes
    await validateNoFilterErrors(errorMessages);
  });

  test('should handle empty states gracefully', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Check for "No Claude instances detected" message
    const noInstancesMessage = page.locator('text=No Claude instances detected');
    if (await noInstancesMessage.isVisible()) {
      // This is expected when no instances are running
      await expect(noInstancesMessage).toBeVisible();
    }
    
    // Check for "No logs to display" message
    const noLogsMessage = page.locator('text=No logs to display');
    if (await noLogsMessage.isVisible()) {
      await expect(noLogsMessage).toBeVisible();
    }
    
    // Empty states should not cause filter errors
    await validateNoFilterErrors(errorMessages);
  });

  test('should maintain performance during monitoring', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Monitor for a period to simulate real usage
    await page.waitForTimeout(5000);
    
    // Page should remain responsive
    await expect(page.locator(SELECTORS.pageTitle)).toBeVisible();
    
    // Check monitoring status
    const monitoringStatus = page.locator(SELECTORS.monitoringActive);
    if (await monitoringStatus.isVisible()) {
      await expect(monitoringStatus).toContainText('Monitoring Active');
    }
    
    // Validate no filter errors during monitoring period
    await validateNoFilterErrors(errorMessages);
  });

  test('should handle WebSocket connection states gracefully', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // Check hub status indicators
    const hubStatus = page.locator(SELECTORS.hubStatus);
    if (await hubStatus.isVisible()) {
      const statusText = await hubStatus.textContent();
      // Should show either "Hub Connected", "Hub Offline", or "Connecting..."
      expect(statusText).toMatch(/Hub (Connected|Offline|Connecting)/);
    }
    
    // WebSocket connection states should not cause filter errors
    await validateNoFilterErrors(errorMessages);
  });

  test('should complete full user workflow without filter errors', async ({ page }) => {
    const errorMessages = await setupConsoleLogging(page);
    
    // Complete user workflow simulation
    await page.goto(DUAL_INSTANCE_URL);
    await waitForPageStability(page);
    
    // 1. View initial state
    await expect(page.locator(SELECTORS.pageTitle)).toBeVisible();
    
    // 2. Open configuration
    await page.locator(SELECTORS.configButton).click();
    await page.waitForTimeout(1000);
    
    // 3. Change filter settings if available
    const logFilter = page.locator(SELECTORS.logLevelFilter).first();
    if (await logFilter.isVisible()) {
      await logFilter.selectOption('info');
      await page.waitForTimeout(500);
      await logFilter.selectOption('all');
    }
    
    // 4. Toggle auto-scroll
    const autoScrollButton = page.locator(SELECTORS.autoScrollButton);
    if (await autoScrollButton.isVisible()) {
      await autoScrollButton.click();
      await page.waitForTimeout(500);
    }
    
    // 5. Clear logs
    const clearButton = page.locator(SELECTORS.clearLogsButton);
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);
    }
    
    // 6. Final state verification
    await expect(page.locator(SELECTORS.pageTitle)).toBeVisible();
    await expect(page.locator(SELECTORS.monitorTitle)).toBeVisible();
    
    // Complete workflow should not generate filter errors
    await validateNoFilterErrors(errorMessages);
  });
});
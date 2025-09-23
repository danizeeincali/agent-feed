/**
 * CLI Error Message E2E Tests
 * Playwright tests reproducing the exact user scenario:
 * - Backend CLI available on port 3002
 * - Frontend showing "Claude Code not found" error
 * 
 * These tests should FAIL initially then PASS after fix
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3002';

/**
 * Helper function to wait for frontend to load completely
 */
async function waitForFrontendReady(page: Page): Promise<void> {
  await page.goto(FRONTEND_URL);
  
  // Wait for main launcher to appear
  await expect(page.locator('h1')).toContainText('Claude Code Launcher');
  
  // Wait for system info section to load
  await expect(page.locator('.system-info')).toBeVisible();
  
  // Wait for claude availability check to complete (not in loading state)
  await expect(page.locator('[data-testid="claude-availability"]')).not.toContainText('Checking...');
}

/**
 * Helper to check if backend is responding
 */
async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/claude/check`);
    return response.ok;
  } catch {
    return false;
  }
}

test.describe('CLI Error Message Bug Reproduction', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('CRITICAL: User-reported scenario - CLI available but frontend shows error', async ({ page }) => {
    // This test reproduces the exact user issue
    
    // ARRANGE - Verify preconditions
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      test.skip('Backend server not available - cannot test frontend error with working backend');
    }

    // Enable console logging to capture debug output
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else {
        consoleLogs.push(text);
      }
    });

    // ACT - Load the frontend
    await waitForFrontendReady(page);
    
    // Wait for API calls to complete
    await page.waitForTimeout(3000);

    // ASSERT - Check the actual UI state
    const claudeAvailabilityElement = page.locator('[data-testid="claude-availability"]');
    const claudeAvailabilityText = await claudeAvailabilityElement.textContent();
    
    console.log('Claude availability display:', claudeAvailabilityText);
    console.log('Console logs:', consoleLogs.filter(log => log.includes('SPARC DEBUG')));
    console.log('Console errors:', consoleErrors);

    // Check for warning message (should NOT be visible if CLI is available)
    const warningMessage = page.locator('.warning');
    const isWarningVisible = await warningMessage.isVisible();
    
    // Check button states
    const launchButton = page.locator('.launch-button').first();
    const isButtonDisabled = await launchButton.isDisabled();

    // CRITICAL ASSERTIONS - These should PASS when working correctly
    // If these FAIL, it confirms the user's reported bug
    
    // 1. Backend should be available (we verified this above)
    expect(backendHealthy).toBe(true);
    
    // 2. Frontend should detect CLI as available (NOT show "Not Found")
    expect(claudeAvailabilityText).toBe('✅ Available');
    
    // 3. Warning message should NOT be visible
    expect(isWarningVisible).toBe(false);
    
    // 4. Launch buttons should NOT be disabled
    expect(isButtonDisabled).toBe(false);
    
    // 5. No network errors in console
    const networkErrors = consoleErrors.filter(error => 
      error.includes('fetch') || 
      error.includes('network') || 
      error.includes('ECONNREFUSED') ||
      error.includes('Failed to fetch')
    );
    expect(networkErrors).toHaveLength(0);
  });

  test('REGRESSION: Backend unavailable should show appropriate error', async ({ page }) => {
    // This test verifies correct behavior when backend is actually down
    
    // ARRANGE - Simulate backend being unavailable by using wrong port
    // Override the API calls to use non-existent backend
    await page.route('**/api/claude/**', route => {
      route.abort('failed');
    });

    // ACT
    await page.goto(FRONTEND_URL);
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
    
    // Wait for API calls to fail and UI to update
    await page.waitForTimeout(2000);

    // ASSERT - Should show appropriate error state
    const claudeAvailabilityElement = page.locator('[data-testid="claude-availability"]');
    const claudeAvailabilityText = await claudeAvailabilityElement.textContent();
    
    expect(claudeAvailabilityText).toBe('❌ Not Found');
    
    // Warning should be visible
    const warningMessage = page.locator('.warning');
    await expect(warningMessage).toBeVisible();
    await expect(warningMessage).toContainText('Claude Code not found');
    
    // Buttons should be disabled
    const launchButton = page.locator('.launch-button').first();
    await expect(launchButton).toBeDisabled();
  });

  test('API endpoint communication verification', async ({ page }) => {
    // Test that verifies the API communication is working correctly
    
    // Intercept API calls to verify they're made correctly
    const apiCalls: any[] = [];
    
    await page.route('**/api/claude/**', async route => {
      const request = route.request();
      apiCalls.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
      
      // Forward the request to actual backend
      const response = await fetch(request.url(), {
        method: request.method(),
        headers: request.headers(),
      });
      
      const body = await response.text();
      
      route.fulfill({
        status: response.status,
        headers: Object.fromEntries([...response.headers.entries()]),
        body: body
      });
    });

    // ACT
    await waitForFrontendReady(page);
    await page.waitForTimeout(2000);

    // ASSERT
    expect(apiCalls).toHaveLength(1);
    expect(apiCalls[0].url).toContain('/api/claude/check');
    expect(apiCalls[0].method).toBe('GET');
  });

  test('Network tab inspection for API calls', async ({ page }) => {
    // Enable request/response tracking
    const requests: any[] = [];
    const responses: any[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/claude/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/claude/')) {
        responses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now()
        });
      }
    });

    // ACT
    await waitForFrontendReady(page);
    await page.waitForTimeout(3000);

    // ASSERT
    console.log('Network requests:', requests);
    console.log('Network responses:', responses);
    
    expect(requests).toHaveLength(1);
    expect(responses).toHaveLength(1);
    
    expect(responses[0].status).toBe(200);
  });

  test('Frontend state changes during CLI detection', async ({ page }) => {
    // Test that tracks the state changes in the UI during CLI detection
    
    const stateChanges: string[] = [];
    
    // Track changes to the claude availability display
    await page.goto(FRONTEND_URL);
    
    // Initial state
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
    
    let availabilityElement = page.locator('[data-testid="claude-availability"]');
    
    // Should start with "Checking..."
    await expect(availabilityElement).toContainText('🔄 Checking...');
    stateChanges.push('Initial: Checking...');
    
    // Wait for final state
    await page.waitForTimeout(3000);
    
    const finalState = await availabilityElement.textContent();
    stateChanges.push(`Final: ${finalState}`);
    
    console.log('State changes:', stateChanges);
    
    // Should not be stuck in checking state
    expect(finalState).not.toContain('Checking...');
    
    // Should show either Available or Not Found
    expect(finalState).toMatch(/✅ Available|❌ Not Found/);
  });

  test('Button enabling/disabling based on CLI availability', async ({ page }) => {
    // Test the button state logic
    
    await waitForFrontendReady(page);
    
    // Wait for CLI detection to complete
    await page.waitForTimeout(2000);
    
    const launchButtons = page.locator('.launch-button');
    const firstButton = launchButtons.first();
    
    // Get the current availability state
    const availabilityText = await page.locator('[data-testid="claude-availability"]').textContent();
    const isAvailable = availabilityText?.includes('Available');
    
    if (isAvailable) {
      // If CLI is available, buttons should be enabled
      await expect(firstButton).not.toBeDisabled();
      
      // Should be able to click (but we won't actually launch)
      await expect(firstButton).toBeEnabled();
    } else {
      // If CLI is not available, buttons should be disabled
      await expect(firstButton).toBeDisabled();
    }
  });

  test('Console debug output analysis', async ({ page }) => {
    // Capture and analyze the SPARC debug output to understand the flow
    
    const debugLogs: string[] = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('🔍 SPARC DEBUG')) {
        debugLogs.push(text);
      }
    });

    await waitForFrontendReady(page);
    await page.waitForTimeout(3000);

    console.log('SPARC Debug Logs:');
    debugLogs.forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });

    // Verify we have debug output indicating API calls
    const apiCallLogs = debugLogs.filter(log => log.includes('apiCall starting'));
    const responseLogs = debugLogs.filter(log => log.includes('JSON parsed successfully'));
    
    expect(apiCallLogs).toHaveLength(1);
    expect(responseLogs).toHaveLength(1);
  });

  test('Visual regression - error message appearance', async ({ page }) => {
    // Test the visual appearance of error states
    
    // Force an error state by blocking API calls
    await page.route('**/api/claude/**', route => {
      route.abort('failed');
    });

    await page.goto(FRONTEND_URL);
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
    await page.waitForTimeout(2000);

    // Screenshot the error state
    await expect(page).toHaveScreenshot('cli-error-state.png');
    
    // Verify warning message styling
    const warningMessage = page.locator('.warning');
    await expect(warningMessage).toBeVisible();
    await expect(warningMessage).toHaveCSS('background', /rgb\(255, 243, 205\)/);
    await expect(warningMessage).toContainText('Claude Code not found');
  });
});

test.describe('CLI Detection Edge Cases', () => {
  test('Slow network response handling', async ({ page }) => {
    // Test behavior with slow API responses
    
    await page.route('**/api/claude/check', async route => {
      // Delay response by 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await fetch(route.request().url(), {
        method: route.request().method()
      });
      const body = await response.text();
      
      route.fulfill({
        status: response.status,
        body: body
      });
    });

    await page.goto(FRONTEND_URL);
    
    // Should show checking state initially
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    await expect(availabilityElement).toContainText('🔄 Checking...');
    
    // Should eventually resolve (wait up to 10 seconds)
    await expect(availabilityElement).not.toContainText('Checking...', { timeout: 10000 });
  });

  test('Invalid JSON response handling', async ({ page }) => {
    // Test handling of malformed API responses
    
    await page.route('**/api/claude/check', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json{'
      });
    });

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(2000);

    // Should handle JSON parse error gracefully
    expect(consoleErrors.some(error => error.includes('JSON') || error.includes('parse'))).toBe(true);
    
    // Should show appropriate error state
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    const availabilityText = await availabilityElement.textContent();
    expect(availabilityText).toBe('❌ Not Found');
  });

  test('CORS error handling', async ({ page }) => {
    // Test handling of CORS errors
    
    await page.route('**/api/claude/**', route => {
      route.abort('accessdenied');
    });

    await page.goto(FRONTEND_URL);
    await page.waitForTimeout(2000);

    // Should show error state
    const availabilityElement = page.locator('[data-testid="claude-availability"]');
    expect(await availabilityElement.textContent()).toBe('❌ Not Found');
  });
});
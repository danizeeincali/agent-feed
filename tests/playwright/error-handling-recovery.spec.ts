import { test, expect, Page } from '@playwright/test';

/**
 * Error Handling and Recovery Tests
 * 
 * Tests comprehensive error scenarios and recovery mechanisms:
 * - Process creation failures
 * - Connection errors and recovery
 * - Invalid instance operations
 * - Network interruption handling
 * - User input validation and error display
 */

test.describe('Error Handling and Recovery', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="claude-instance-manager"]', {
      timeout: 15000
    });
  });

  test.afterEach(async () => {
    // Clean up instances
    try {
      await page.evaluate(async () => {
        const response = await fetch('http://localhost:3000/api/claude/instances');
        const data = await response.json();
        for (const instance of data.instances || []) {
          await fetch(`http://localhost:3000/api/claude/instances/${instance.id}`, {
            method: 'DELETE'
          });
        }
      });
    } catch (error) {
      console.warn('Cleanup warning:', error);
    }
  });

  test('Displays error when backend is unreachable', async () => {
    console.log('🚨 Testing backend unreachable error handling...');
    
    // Intercept API calls to simulate backend failure
    await page.route('**/api/claude/instances', (route) => {
      route.abort('failed');
    });
    
    // Try to create an instance
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Should display error message
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.error')).toContainText(/Failed to create instance|Connection|Network/i);
    
    // Button should no longer be disabled/loading
    await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeEnabled({ timeout: 5000 });
    
    console.log('✅ Backend unreachable error handling test passed');
  });

  test('Handles instance creation failures gracefully', async () => {
    console.log('❌ Testing instance creation failure handling...');
    
    // Mock API to return failure response
    await page.route('**/api/claude/instances', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to spawn Claude process'
        })
      });
    });
    
    // Try to create instance
    await page.click('button:has-text("⚡ skip-permissions")');
    
    // Should show error message
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.error')).toContainText(/Failed to spawn Claude process/i);
    
    // No instance should appear in list
    await page.waitForTimeout(3000);
    await expect(page.locator('.instance-item')).not.toBeVisible();
    
    // Should show "No active instances" message
    await expect(page.locator('.no-instances')).toBeVisible();
    
    console.log('✅ Instance creation failure handling test passed');
  });

  test('Recovers from temporary network interruptions', async () => {
    console.log('🔄 Testing network interruption recovery...');
    
    // Create instance successfully first
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    
    // Wait for stable connection
    await expect(page.locator('.connection-status')).toContainText('Connected', { timeout: 15000 });
    
    // Simulate network interruption by intercepting SSE
    await page.route('**/api/claude/instances/*/terminal/stream', (route) => {
      route.abort('failed');
    });
    
    // Wait for connection error detection
    await page.waitForTimeout(5000);
    
    // Should show connection error or fallback to polling
    const connectionStatus = await page.locator('.connection-status').textContent();
    expect(connectionStatus).toMatch(/Error|Polling|Reconnect/i);
    
    // Remove network interruption
    await page.unroute('**/api/claude/instances/*/terminal/stream');
    
    // Should recover and show connected status again
    await expect(page.locator('.connection-status')).toContainText(/Connected|Polling/, { timeout: 20000 });
    
    console.log('✅ Network interruption recovery test passed');
  });

  test('Handles invalid instance operations', async () => {
    console.log('🚫 Testing invalid instance operation handling...');
    
    // Try to send input without selecting an instance
    await page.fill('.input-field', 'test command');
    await page.click('.btn-send');
    
    // Should show error for no instance selected
    await expect(page.locator('.error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.error')).toContainText(/No.*instance.*selected|Invalid instance/i);
    
    // Clear error and create instance
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Try to send empty input
    await page.click('.instance-item');
    await page.fill('.input-field', '   '); // Just spaces
    await page.click('.btn-send');
    
    // Should not cause errors, just ignore empty input
    const inputValue = await page.locator('.input-field').inputValue();
    expect(inputValue).toBe('   '); // Input not cleared if it was just spaces
    
    console.log('✅ Invalid instance operation handling test passed');
  });

  test('Displays appropriate error for connection timeout', async () => {
    console.log('⏱️ Testing connection timeout error handling...');
    
    // Mock SSE endpoint to be very slow
    await page.route('**/api/claude/instances/*/terminal/stream', (route) => {
      // Never resolve - simulates timeout
      setTimeout(() => {
        route.abort('timedout');
      }, 30000);
    });
    
    // Create instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    
    // Should eventually show connection error or fallback to polling
    await expect(page.locator('.connection-status')).toContainText(/Error|Timeout|Polling/, { timeout: 45000 });
    
    console.log('✅ Connection timeout handling test passed');
  });

  test('Error messages are user-friendly and actionable', async () => {
    console.log('📝 Testing user-friendly error messages...');
    
    // Mock various error scenarios
    await page.route('**/api/claude/instances', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error: Claude binary not found'
        })
      });
    });
    
    // Try to create instance
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Error should be displayed clearly
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
    
    const errorText = await page.locator('.error').textContent();
    
    // Should be descriptive and not just technical jargon
    expect(errorText).toBeTruthy();
    expect(errorText!.length).toBeGreaterThan(10);
    
    // Should not expose internal server details inappropriately
    expect(errorText).not.toContain('stack trace');
    expect(errorText).not.toContain('undefined');
    
    console.log('Error message:', errorText);
    console.log('✅ User-friendly error messages test passed');
  });

  test('Errors clear when operations succeed', async () => {
    console.log('🧹 Testing error message clearing...');
    
    // First cause an error
    await page.route('**/api/claude/instances', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Test error message'
        })
      });
    });
    
    await page.click('button:has-text("🚀 prod/claude")');
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
    
    // Clear the route to allow success
    await page.unroute('**/api/claude/instances');
    
    // Try again - should succeed and clear error
    await page.click('button:has-text("⚡ skip-permissions")');
    
    // Error should disappear
    await expect(page.locator('.error')).not.toBeVisible({ timeout: 15000 });
    
    // Instance should be created successfully
    await expect(page.locator('.instance-item')).toBeVisible({ timeout: 30000 });
    
    console.log('✅ Error clearing test passed');
  });

  test('Handles malformed API responses gracefully', async () => {
    console.log('🔧 Testing malformed API response handling...');
    
    // Mock API to return malformed response
    await page.route('**/api/claude/instances', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });
    
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Should show error for malformed response
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
    
    // Error should be understandable
    const errorText = await page.locator('.error').textContent();
    expect(errorText).toMatch(/Failed|Error|Invalid/i);
    
    console.log('✅ Malformed API response handling test passed');
  });

  test('Instance termination failures are handled properly', async () => {
    console.log('🛑 Testing instance termination failure handling...');
    
    // Create instance first
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Mock DELETE endpoint to fail
    await page.route('**/api/claude/instances/*', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Failed to terminate process'
          })
        });
      } else {
        route.continue();
      }
    });
    
    // Try to terminate instance
    await page.click('.btn-terminate');
    
    // Should show error
    await expect(page.locator('.error')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.error')).toContainText(/Failed to terminate|terminate/i);
    
    // Instance should still be visible since termination failed
    await expect(page.locator('.instance-item')).toBeVisible();
    
    console.log('✅ Instance termination failure handling test passed');
  });

  test('Connection status shows clear error states', async () => {
    console.log('📊 Testing connection status error states...');
    
    // Create instance to establish connection first
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    await page.click('.instance-item');
    
    // Wait for initial connection
    await expect(page.locator('.connection-status')).toContainText('Connected', { timeout: 15000 });
    
    // Simulate connection failure
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    // Wait for connection error to be detected
    await page.waitForTimeout(5000);
    
    // Connection status should show error state
    const connectionStatus = page.locator('.connection-status');
    await expect(connectionStatus).toContainText(/Error|Failed|Disconnected/, { timeout: 10000 });
    
    // Status should have appropriate CSS class for styling
    await expect(connectionStatus).toHaveClass(/error|disconnected|failed/i);
    
    console.log('✅ Connection status error states test passed');
  });
});
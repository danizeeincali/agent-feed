/**
 * SPARC Phase 4: TDD Refinement - E2E Tests for SSE-based Claude Instance Interaction
 * 
 * Playwright integration tests validating real-time terminal interaction
 * via Server-Sent Events for the Interactive Control tab
 */

import { test, expect } from '@playwright/test';

test.describe('Claude Instance SSE Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the SSE-based instance manager
    await page.goto('/instance-manager-sse');
    
    // Wait for the page to load
    await expect(page.locator('[data-testid="claude-instance-manager-sse"]')).toBeVisible();
  });

  test('should display available Claude instances', async ({ page }) => {
    // Wait for instances to load
    await page.waitForSelector('[data-testid^="instance-option-"]', { timeout: 10000 });
    
    // Should show at least one running instance
    const instanceOptions = page.locator('[data-testid^="instance-option-"]');
    await expect(instanceOptions.first()).toBeVisible();
    
    // Instance should have connect button
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await expect(connectButton).toBeVisible();
    await expect(connectButton).toHaveText(/Connect/);
  });

  test('should connect to Claude instance via SSE', async ({ page }) => {
    // Find first available instance
    const firstInstanceOption = page.locator('[data-testid^="instance-option-"]').first();
    await expect(firstInstanceOption).toBeVisible();
    
    const connectButton = firstInstanceOption.locator('[data-testid^="connect-button-"]');
    await connectButton.click();
    
    // Wait for connection to establish
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    await expect(page.locator('.connection-status')).toContainText('SSE');
    
    // Terminal should become visible
    await expect(page.locator('[data-testid="terminal-output"]')).toBeVisible();
    await expect(page.locator('[data-testid="command-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-command-button"]')).toBeVisible();
  });

  test('should send commands and receive real-time output', async ({ page }) => {
    // Connect to instance first
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    
    // Wait for connection
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    // Send a simple command
    const commandInput = page.locator('[data-testid="command-input"]');
    const sendButton = page.locator('[data-testid="send-command-button"]');
    
    await commandInput.fill('help');
    await sendButton.click();
    
    // Should see input echo in output
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    await expect(terminalOutput).toContainText('> help', { timeout: 5000 });
    
    // Should receive real-time response from Claude
    await expect(terminalOutput).toContainText(/Claude|help|commands/i, { timeout: 10000 });
    
    // Input field should be cleared
    await expect(commandInput).toHaveValue('');
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    // Mock network failure by intercepting SSE requests
    await page.route('**/api/v1/claude/instances/*/terminal/stream', route => {
      route.abort('connectionrefused');
    });
    
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    
    // Should show error state
    await expect(page.locator('[data-testid="error-banner"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.connection-status')).toContainText('error');
  });

  test('should reconnect automatically on connection loss', async ({ page }) => {
    // Connect first
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    // Simulate connection loss by intercepting requests temporarily
    let interceptCount = 0;
    await page.route('**/api/v1/claude/instances/*/terminal/stream', route => {
      interceptCount++;
      if (interceptCount <= 2) {
        route.abort('connectionrefused');
      } else {
        route.continue();
      }
    });
    
    // Trigger reconnection (simulate network interruption)
    await page.evaluate(() => {
      // Force close EventSource connection
      (window as any).EventSource.prototype.close.call();
    });
    
    // Should attempt reconnection
    await expect(page.locator('.connection-status')).toContainText(/reconnecting|error/, { timeout: 5000 });
    
    // Should eventually reconnect
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 20000 });
  });

  test('should display reconnection attempts counter', async ({ page }) => {
    // Mock intermittent connection failures
    let attemptCount = 0;
    await page.route('**/api/v1/claude/instances/*/terminal/stream', route => {
      attemptCount++;
      if (attemptCount <= 3) {
        route.abort('connectionrefused');
      } else {
        route.continue();
      }
    });
    
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    
    // Should show reconnection attempts
    await expect(page.locator('.reconnect-attempts')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.reconnect-attempts')).toContainText(/Reconnects: [1-9]/);
  });

  test('should handle multiple commands in sequence', async ({ page }) => {
    // Connect to instance
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    const commandInput = page.locator('[data-testid="command-input"]');
    const sendButton = page.locator('[data-testid="send-command-button"]');
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    
    // Send first command
    await commandInput.fill('status');
    await sendButton.click();
    await expect(terminalOutput).toContainText('> status', { timeout: 5000 });
    
    // Send second command
    await commandInput.fill('help');
    await sendButton.click();
    await expect(terminalOutput).toContainText('> help', { timeout: 5000 });
    
    // Both commands should be visible in output
    await expect(terminalOutput).toContainText('> status');
    await expect(terminalOutput).toContainText('> help');
  });

  test('should clear output when requested', async ({ page }) => {
    // Connect and send a command
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    const commandInput = page.locator('[data-testid="command-input"]');
    const sendButton = page.locator('[data-testid="send-command-button"]');
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    
    await commandInput.fill('test command');
    await sendButton.click();
    await expect(terminalOutput).toContainText('> test command', { timeout: 5000 });
    
    // Clear output
    const clearButton = page.locator('[data-testid="clear-output-button"]');
    await clearButton.click();
    
    // Output should be cleared
    await expect(terminalOutput).not.toContainText('> test command');
    await expect(terminalOutput).toContainText(/Connected to Claude instance via SSE/);
  });

  test('should disconnect cleanly', async ({ page }) => {
    // Connect first
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    // Should show disconnect button
    const disconnectButton = page.locator('[data-testid^="disconnect-button-"]');
    await expect(disconnectButton).toBeVisible();
    
    // Disconnect
    await disconnectButton.click();
    
    // Should return to disconnected state
    await expect(page.locator('.connection-status')).toContainText('disconnected', { timeout: 5000 });
    await expect(page.locator('[data-testid="terminal-output"]')).not.toBeVisible();
    
    // Connect button should be available again
    await expect(page.locator('[data-testid^="connect-button-"]').first()).toBeVisible();
  });

  test('should handle instance status updates', async ({ page }) => {
    // Connect to instance
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    // Monitor for instance status updates via SSE
    // (This would require backend to send status updates)
    
    // Refresh instances to see updated status
    const refreshButton = page.locator('[data-testid="refresh-instances-button"]');
    await refreshButton.click();
    
    // Should still show connected instances
    await expect(page.locator('[data-testid^="instance-option-"]').first()).toBeVisible();
  });

  test('should maintain connection state across page interactions', async ({ page }) => {
    // Connect to instance
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    // Send a command to establish session
    const commandInput = page.locator('[data-testid="command-input"]');
    const sendButton = page.locator('[data-testid="send-command-button"]');
    
    await commandInput.fill('echo "session test"');
    await sendButton.click();
    
    // Verify output received
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    await expect(terminalOutput).toContainText('session test', { timeout: 10000 });
    
    // Connection should remain stable
    await expect(page.locator('.connection-status')).toContainText('connected');
  });

  test('should handle non-existent instance connection gracefully', async ({ page }) => {
    // Mock API to return empty instances list initially, then add non-existent instance
    await page.route('**/api/claude/instances', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          instances: [
            { id: 'claude-nonexistent', status: 'running' }
          ]
        })
      });
    });
    
    // Mock instance validation to fail
    await page.route('**/api/v1/claude/instances/claude-nonexistent', route => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Instance not found'
        })
      });
    });
    
    // Reload to get the mocked instance list
    await page.reload();
    await expect(page.locator('[data-testid="claude-instance-manager-sse"]')).toBeVisible();
    
    // Try to connect to non-existent instance
    const connectButton = page.locator('[data-testid="connect-button-claude-nonexistent"]');
    await connectButton.click();
    
    // Should show error
    await expect(page.locator('[data-testid="error-banner"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="error-banner"]')).toContainText(/not running|does not exist/);
  });

  test('should validate terminal output authenticity', async ({ page }) => {
    // Connect to instance
    const connectButton = page.locator('[data-testid^="connect-button-"]').first();
    await connectButton.click();
    await expect(page.locator('.connection-status')).toContainText('connected', { timeout: 15000 });
    
    // Send command and check output classes
    const commandInput = page.locator('[data-testid="command-input"]');
    const sendButton = page.locator('[data-testid="send-command-button"]');
    
    await commandInput.fill('pwd');
    await sendButton.click();
    
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    
    // Input line should have 'input' class and be marked as 'real'
    await expect(terminalOutput.locator('.output-line.input.real')).toContainText('> pwd');
    
    // Wait for actual output from Claude
    await page.waitForSelector('.output-line.output.real', { timeout: 10000 });
    
    // Real output should have appropriate classes
    const realOutputLines = page.locator('.output-line.output.real');
    await expect(realOutputLines.first()).toBeVisible();
  });
});
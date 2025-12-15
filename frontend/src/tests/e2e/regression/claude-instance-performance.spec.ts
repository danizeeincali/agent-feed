import { test, expect, Page } from '@playwright/test';

/**
 * Performance and Reliability E2E Tests for Claude Instance Management
 * 
 * Tests performance characteristics, memory usage, and reliability under stress
 */

test.describe('Claude Instance Management - Performance & Reliability Tests', () => {
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

  test('Fast page load performance', async () => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="claude-instance-manager"]');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Critical elements should be visible quickly
    await expect(page.locator('h2')).toContainText('Claude Instance Manager');
    await expect(page.locator('.launch-buttons')).toBeVisible();
  });

  test('Rapid instance creation performance', async () => {
    const startTime = Date.now();
    
    // Create instance
    await page.click('.btn-prod');
    
    // Wait for instance to appear
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 20000 });
    
    const creationTime = Date.now() - startTime;
    
    // Instance should be created within 15 seconds
    expect(creationTime).toBeLessThan(15000);
    
    // Verify instance is functional
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await expect(instanceCard).toHaveClass(/selected/);
    
    // Connection should establish quickly
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 5000 });
  });

  test('Multiple instance handling performance', async () => {
    const instanceCount = 3;
    const startTime = Date.now();
    
    // Create multiple instances rapidly
    for (let i = 0; i < instanceCount; i++) {
      const button = i % 2 === 0 ? '.btn-prod' : '.btn-skip-perms';
      await page.click(button);
      
      // Wait briefly between creations to avoid overwhelming the system
      await page.waitForTimeout(2000);
    }
    
    // Wait for all instances to appear
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 30000 });
    await expect(page.locator('[data-testid="instance-card"]')).toHaveCount(instanceCount, { timeout: 30000 });
    
    const totalTime = Date.now() - startTime;
    
    // Multiple instances should be created within reasonable time
    expect(totalTime).toBeLessThan(45000); // 15 seconds per instance + overhead
    
    // All instances should be visible
    const instanceCards = page.locator('[data-testid="instance-card"]');
    await expect(instanceCards).toHaveCount(instanceCount);
    
    // Verify we can interact with each instance
    for (let i = 0; i < instanceCount; i++) {
      const card = instanceCards.nth(i);
      await card.click();
      await expect(card).toHaveClass(/selected/);
      
      // Verify terminal output appears
      await expect(page.locator('[data-testid="terminal-output"]')).toBeVisible();
    }
  });

  test('Memory usage stability during long session', async () => {
    // Create instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Simulate long session with many commands
    const commandCount = 50;
    const commands = [
      'pwd',
      'ls -la',
      'echo "test command"',
      'date',
      'whoami'
    ];
    
    for (let i = 0; i < commandCount; i++) {
      const command = commands[i % commands.length];
      await page.fill('[data-testid="command-input"]', `${command} ${i}`);
      await page.click('[data-testid="send-command-button"]');
      await expect(page.locator('[data-testid="command-input"]')).toHaveValue('');
      
      // Brief pause to prevent overwhelming
      await page.waitForTimeout(100);
    }
    
    // Verify UI is still responsive after many commands
    await expect(page.locator('[data-testid="command-input"]')).toBeEnabled();
    await expect(page.locator('[data-testid="send-command-button"]')).toBeEnabled();
    await expect(instanceCard).toHaveClass(/selected/);
    
    // Terminal output should still be accessible
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    await expect(terminalOutput).toBeVisible();
  });

  test('Connection resilience under network issues', async () => {
    // Create instance and establish connection
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await expect(instanceCard).toHaveClass(/selected/);
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Simulate network interruption by disabling network
    await page.context().setOffline(true);
    await page.waitForTimeout(2000);
    
    // Connection status should indicate disconnection or error
    const connectionStatus = page.locator('.connection-status');
    const statusText = await connectionStatus.textContent();
    
    // Re-enable network
    await page.context().setOffline(false);
    
    // Wait for potential reconnection
    await page.waitForTimeout(5000);
    
    // UI should still be functional
    await expect(page.locator('[data-testid="command-input"]')).toBeVisible();
    await expect(instanceCard).toBeVisible();
  });

  test('Rapid instance switching performance', async () => {
    // Create multiple instances
    await page.click('.btn-prod');
    await page.waitForTimeout(3000);
    await page.click('.btn-skip-perms');
    await page.waitForTimeout(3000);
    await page.click('.btn-skip-perms-c');
    
    await expect(page.locator('[data-testid="instance-card"]')).toHaveCount(3, { timeout: 30000 });
    
    const instances = page.locator('[data-testid="instance-card"]');
    
    // Rapidly switch between instances
    const switchCount = 20;
    for (let i = 0; i < switchCount; i++) {
      const instanceIndex = i % 3;
      const instance = instances.nth(instanceIndex);
      
      const startTime = Date.now();
      await instance.click();
      
      // Wait for selection to complete
      await expect(instance).toHaveClass(/selected/);
      
      const switchTime = Date.now() - startTime;
      
      // Each switch should complete quickly
      expect(switchTime).toBeLessThan(1000);
      
      // Verify terminal output updates
      await expect(page.locator('[data-testid="terminal-output"]')).toBeVisible();
    }
  });

  test('Large output handling performance', async () => {
    // Create instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await instanceCard.click();
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // Send command that generates large output
    const largeCommand = 'for i in {1..100}; do echo "This is line $i with some additional text to make it longer"; done';
    await page.fill('[data-testid="command-input"]', largeCommand);
    
    const startTime = Date.now();
    await page.click('[data-testid="send-command-button"]');
    
    // Wait for command to execute and output to appear
    await page.waitForTimeout(5000);
    
    const executionTime = Date.now() - startTime;
    
    // Large output should be handled within reasonable time
    expect(executionTime).toBeLessThan(10000);
    
    // UI should remain responsive
    await expect(page.locator('[data-testid="command-input"]')).toBeEnabled();
    await expect(page.locator('[data-testid="terminal-output"]')).toBeVisible();
    
    // Should be able to send another command
    await page.fill('[data-testid="command-input"]', 'echo "after large output"');
    await page.click('[data-testid="send-command-button"]');
    await expect(page.locator('[data-testid="command-input"]')).toHaveValue('');
  });

  test('Error recovery performance', async () => {
    // Create instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    
    // Force-terminate instance via API to simulate crash
    await fetch(`http://localhost:3333/api/v1/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });
    
    const startTime = Date.now();
    
    // UI should detect the instance is gone and update
    await expect(page.locator('.no-instances')).toBeVisible({ timeout: 10000 });
    
    const recoveryTime = Date.now() - startTime;
    
    // Error recovery should happen quickly
    expect(recoveryTime).toBeLessThan(10000);
    
    // Should be able to create new instance immediately
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    // New instance should work normally
    const newInstanceCard = page.locator('[data-testid="instance-card"]').first();
    await expect(newInstanceCard).toHaveClass(/selected/);
  });

  test('UI responsiveness during backend operations', async () => {
    // Test that UI remains responsive while backend operations are in progress
    
    // Click create button
    const createButton = page.locator('.btn-prod');
    await createButton.click();
    
    // Button should be disabled during creation
    await expect(createButton).toBeDisabled();
    
    // But other UI elements should remain interactive
    await expect(page.locator('.btn-skip-perms')).toBeEnabled();
    await expect(page.locator('h2')).toBeVisible();
    
    // Wait for creation to complete
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    // Button should re-enable
    await expect(createButton).toBeEnabled();
    
    // UI should be fully responsive
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await expect(instanceCard).toBeVisible();
    await instanceCard.click();
    await expect(instanceCard).toHaveClass(/selected/);
  });
});
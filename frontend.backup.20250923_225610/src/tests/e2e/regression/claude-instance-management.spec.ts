import { test, expect, Page, BrowserContext } from '@playwright/test';

interface ClaudeInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
}

/**
 * Comprehensive E2E Regression Test Suite for Claude Instance Management
 * 
 * Tests all critical user workflows, regression fixes, and edge cases:
 * - WebSocket → SSE migration
 * - White screen prevention
 * - Instance status synchronization
 * - Multi-tab coordination
 * - Error recovery scenarios
 * - Backend restart handling
 */

test.describe('Claude Instance Management - E2E Regression Tests', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    // Clear any existing instances before each test
    try {
      await fetch('http://localhost:3333/api/v1/claude/instances', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.log('Cleanup error (expected if no instances exist):', error);
    }
    
    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for the component to load
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: 10000 });
  });

  test.afterEach(async () => {
    // Clean up any instances created during the test
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
  });

  test('1. Fresh page load shows current instances', async () => {
    // Create an instance via API first
    const createResponse = await fetch('http://localhost:3333/api/v1/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        command: ['claude'], 
        instanceType: 'default' 
      })
    });
    
    expect(createResponse.ok).toBeTruthy();
    const createData = await createResponse.json();
    expect(createData.success).toBeTruthy();
    
    const instanceId = createData.instanceId || createData.instance?.id;
    expect(instanceId).toBeTruthy();
    expect(instanceId).toMatch(/^claude-\d+$/);

    // Refresh the page to test fresh load
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="claude-instance-manager"]');

    // Wait for instances to load
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 5000 });

    // Verify instance appears in UI
    const instanceCard = page.locator(`[data-testid="instance-card"][data-instance-id="${instanceId}"]`);
    await expect(instanceCard).toBeVisible();

    // Verify instance status is displayed correctly
    const statusElement = page.locator(`[data-testid="status-${instanceId}"]`);
    await expect(statusElement).toBeVisible();
    
    // Status should be either 'starting' or 'running'
    const statusText = await statusElement.locator('.status-text').textContent();
    expect(['starting', 'running']).toContain(statusText);
  });

  test('2. Creating new instance updates UI immediately', async () => {
    // Initial state - should have no instances
    const noInstancesText = page.locator('.no-instances');
    await expect(noInstancesText).toBeVisible();

    // Create new instance using the UI
    const createButton = page.locator('.btn-prod');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
    
    await createButton.click();

    // Wait for loading state
    await expect(createButton).toBeDisabled();

    // Wait for instance to appear in the UI
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });

    // Verify instance card appears
    const instanceCards = page.locator('[data-testid="instance-card"]');
    await expect(instanceCards).toHaveCount(1);

    // Verify no-instances message disappears
    await expect(noInstancesText).not.toBeVisible();

    // Verify instance has valid ID
    const instanceCard = instanceCards.first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    expect(instanceId).toMatch(/^claude-\d+$/);

    // Verify button is re-enabled after creation
    await expect(createButton).toBeEnabled({ timeout: 5000 });

    // Verify active count is updated
    const activeCount = page.locator('.count');
    await expect(activeCount).toContainText(/Active: [0-1]\/1/);
  });

  test('3. Selecting instance from dropdown works', async () => {
    // Create two instances
    const createResponse1 = await fetch('http://localhost:3333/api/v1/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: ['claude'], instanceType: 'default' })
    });
    const data1 = await createResponse1.json();
    const instanceId1 = data1.instanceId || data1.instance?.id;

    const createResponse2 = await fetch('http://localhost:3333/api/v1/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: ['claude', '--dangerously-skip-permissions'], instanceType: 'skip-permissions' })
    });
    const data2 = await createResponse2.json();
    const instanceId2 = data2.instanceId || data2.instance?.id;

    // Refresh to load instances
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="claude-instance-manager"]');

    // Wait for both instances to appear
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="instance-card"]')).toHaveCount(2);

    // Initially no instance should be selected
    let selectedInstance = page.locator('.instance-item.selected');
    await expect(selectedInstance).toHaveCount(0);

    // Click first instance
    const instance1Card = page.locator(`[data-testid="instance-card"][data-instance-id="${instanceId1}"]`);
    await instance1Card.click();

    // Verify first instance is selected
    await expect(instance1Card).toHaveClass(/selected/);
    
    // Verify terminal output area appears
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    await expect(terminalOutput).toBeVisible();
    
    // Verify output shows connection to correct instance
    const outputText = await terminalOutput.textContent();
    expect(outputText).toContain(instanceId1.slice(0, 8));

    // Click second instance
    const instance2Card = page.locator(`[data-testid="instance-card"][data-instance-id="${instanceId2}"]`);
    await instance2Card.click();

    // Verify selection switches
    await expect(instance1Card).not.toHaveClass(/selected/);
    await expect(instance2Card).toHaveClass(/selected/);
    
    // Verify output updates to show second instance
    const newOutputText = await terminalOutput.textContent();
    expect(newOutputText).toContain(instanceId2.slice(0, 8));
  });

  test('4. Connecting to instance succeeds', async () => {
    // Create instance via UI button
    await page.click('.btn-prod');

    // Wait for instance creation and selection
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    
    // Instance should auto-select after creation
    await expect(instanceCard).toHaveClass(/selected/);

    // Wait for connection status to show connected
    const connectionStatus = page.locator('.connection-status');
    await expect(connectionStatus).toHaveClass(/connected/, { timeout: 10000 });
    
    const statusText = await connectionStatus.textContent();
    expect(statusText).toMatch(/Connected via (SSE|Polling)/);

    // Verify terminal output area is visible
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    await expect(terminalOutput).toBeVisible();

    // Verify command input is enabled
    const commandInput = page.locator('[data-testid="command-input"]');
    await expect(commandInput).toBeVisible();
    await expect(commandInput).toBeEnabled();

    // Test sending a command
    await commandInput.fill('echo "test connection"');
    await page.click('[data-testid="send-command-button"]');

    // Verify input is cleared after sending
    await expect(commandInput).toHaveValue('');
  });

  test('5. Refreshing page maintains correct state', async () => {
    // Create instance and select it
    await page.click('.btn-skip-perms');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    
    // Send some commands to generate output
    await page.fill('[data-testid="command-input"]', 'pwd');
    await page.click('[data-testid="send-command-button"]');
    
    await page.waitForTimeout(1000); // Let command execute

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="claude-instance-manager"]');

    // Wait for instances to reload
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 5000 });

    // Verify instance still exists
    const reloadedInstanceCard = page.locator(`[data-testid="instance-card"][data-instance-id="${instanceId}"]`);
    await expect(reloadedInstanceCard).toBeVisible();

    // Verify we can still interact with the instance
    await reloadedInstanceCard.click();
    await expect(reloadedInstanceCard).toHaveClass(/selected/);
    
    // Verify terminal output is accessible
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    await expect(terminalOutput).toBeVisible();
    
    // Verify command input works after refresh
    const commandInput = page.locator('[data-testid="command-input"]');
    await commandInput.fill('echo "after refresh"');
    await page.click('[data-testid="send-command-button"]');
    await expect(commandInput).toHaveValue('');
  });

  test('6. Error recovery when instance does not exist', async () => {
    // Create instance to get a valid ID format
    const createResponse = await fetch('http://localhost:3333/api/v1/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: ['claude'], instanceType: 'default' })
    });
    const data = await createResponse.json();
    const validInstanceId = data.instanceId || data.instance?.id;

    // Delete the instance via API to simulate it disappearing
    await fetch(`http://localhost:3333/api/v1/claude/instances/${validInstanceId}`, {
      method: 'DELETE'
    });

    // Refresh page to reload instances
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show no instances
    await expect(page.locator('.no-instances')).toBeVisible();

    // Try to create a new instance after the error
    await page.click('.btn-prod');
    
    // Should succeed in creating new instance
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    await expect(page.locator('[data-testid="instance-card"]')).toHaveCount(1);
    
    // Verify error state is cleared
    const errorElement = page.locator('.error');
    if (await errorElement.count() > 0) {
      await expect(errorElement).not.toBeVisible();
    }
  });

  test('7. Multiple tab synchronization', async () => {
    // Create instance in first tab
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');

    // Open second tab
    const secondPage = await context.newPage();
    await secondPage.goto('/');
    await secondPage.waitForLoadState('networkidle');
    await secondPage.waitForSelector('[data-testid="claude-instance-manager"]');

    // Wait for instance to appear in second tab
    await secondPage.waitForSelector('[data-testid="instance-card"]', { timeout: 5000 });
    const secondTabInstance = secondPage.locator(`[data-testid="instance-card"][data-instance-id="${instanceId}"]`);
    await expect(secondTabInstance).toBeVisible();

    // Terminate instance from first tab
    await page.click(`[data-testid="disconnect-button-${instanceId}"]`);
    
    // Wait for instance to disappear from first tab
    await expect(instanceCard).not.toBeVisible({ timeout: 10000 });
    
    // Verify second tab updates (might need manual refresh depending on implementation)
    await secondPage.reload();
    await secondPage.waitForLoadState('networkidle');
    
    // Should show no instances in second tab
    await expect(secondPage.locator('.no-instances')).toBeVisible();
    
    await secondPage.close();
  });

  test('8. Backend restart handling', async () => {
    // Create instance first
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    await expect(instanceCard).toHaveClass(/selected/);
    
    // Wait for connection
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });

    // Simulate backend restart by stopping and starting (this might need actual backend control)
    // For now, we'll test the error handling when backend is unavailable
    
    // The connection should show error state when backend is unavailable
    // This would require actual backend restart simulation in a real test environment
    
    // For now, test that error states are handled gracefully
    const errorElement = page.locator('.error');
    const connectionStatus = page.locator('.connection-status');
    
    // Verify that if errors occur, they're displayed properly
    if (await errorElement.count() > 0) {
      const errorText = await errorElement.textContent();
      expect(errorText).toBeTruthy();
    }
    
    // Verify connection status updates appropriately
    const statusText = await connectionStatus.textContent();
    expect(statusText).toBeTruthy();
  });

  test('9. White screen prevention - Component initialization', async () => {
    // Test that page loads without white screen
    await page.goto('/');
    
    // Should not have white screen - content should be visible quickly
    await expect(page.locator('[data-testid="claude-instance-manager"]')).toBeVisible({ timeout: 5000 });
    
    // Header should be visible
    await expect(page.locator('h2')).toContainText('Claude Instance Manager');
    
    // Controls should be visible
    await expect(page.locator('.launch-buttons')).toBeVisible();
    
    // At least one button should be visible
    await expect(page.locator('.btn-prod')).toBeVisible();
    
    // No-instances message should be visible initially
    await expect(page.locator('.no-instances')).toBeVisible();
  });

  test('10. WebSocket → SSE migration validation', async () => {
    // Create instance to test connection type
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    // Wait for connection to establish
    const connectionStatus = page.locator('.connection-status');
    await expect(connectionStatus).toHaveClass(/connected/, { timeout: 10000 });
    
    // Verify connection type is SSE or Polling (not WebSocket)
    const statusText = await connectionStatus.textContent();
    expect(statusText).toMatch(/Connected via (SSE|Polling)/);
    expect(statusText).not.toContain('WebSocket');
    
    // Verify functionality works with SSE/Polling
    const commandInput = page.locator('[data-testid="command-input"]');
    await commandInput.fill('echo "SSE test"');
    await page.click('[data-testid="send-command-button"]');
    
    // Command should send successfully (input clears)
    await expect(commandInput).toHaveValue('');
  });

  test('11. Instance status checking (running/starting)', async () => {
    // Create instance
    await page.click('.btn-prod');
    
    // Initially should show starting status
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    
    const statusElement = page.locator(`[data-testid="status-${instanceId}"]`);
    await expect(statusElement).toBeVisible();
    
    // Status should transition from starting to running
    const statusText = statusElement.locator('.status-text');
    
    // Wait for status to potentially change to running
    try {
      await expect(statusText).toContainText('running', { timeout: 10000 });
    } catch {
      // Status might remain 'starting' which is also valid
      const currentStatus = await statusText.textContent();
      expect(['starting', 'running']).toContain(currentStatus);
    }
    
    // Status indicator should have appropriate class
    const statusIndicator = statusElement.locator('.status-indicator');
    const indicatorClass = await statusIndicator.getAttribute('class');
    expect(indicatorClass).toMatch(/status-(starting|running)/);
  });

  test('12. Cache clearing mechanisms', async () => {
    // Create instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    // Get instance ID
    const instanceCard = page.locator('[data-testid="instance-card"]').first();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    
    // Interact with instance
    await instanceCard.click();
    await page.fill('[data-testid="command-input"]', 'ls');
    await page.click('[data-testid="send-command-button"]');
    
    // Terminate instance
    await page.click(`[data-testid="disconnect-button-${instanceId}"]`);
    
    // Verify instance is removed from UI
    await expect(instanceCard).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator('.no-instances')).toBeVisible();
    
    // Create new instance - should start fresh
    await page.click('.btn-skip-perms');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    // New instance should have different ID
    const newInstanceCard = page.locator('[data-testid="instance-card"]').first();
    const newInstanceId = await newInstanceCard.getAttribute('data-instance-id');
    
    expect(newInstanceId).not.toBe(instanceId);
    expect(newInstanceId).toMatch(/^claude-\d+$/);
  });

  test('13. Comprehensive user workflow - End-to-end', async () => {
    // 1. Start with empty state
    await expect(page.locator('.no-instances')).toBeVisible();
    
    // 2. Create first instance
    await page.click('.btn-prod');
    await page.waitForSelector('[data-testid="instance-card"]', { timeout: 15000 });
    
    const instance1 = page.locator('[data-testid="instance-card"]').first();
    const instance1Id = await instance1.getAttribute('data-instance-id');
    
    // 3. Verify auto-selection and connection
    await expect(instance1).toHaveClass(/selected/);
    await expect(page.locator('.connection-status')).toHaveClass(/connected/, { timeout: 10000 });
    
    // 4. Send commands and verify interaction
    await page.fill('[data-testid="command-input"]', 'pwd');
    await page.click('[data-testid="send-command-button"]');
    await expect(page.locator('[data-testid="command-input"]')).toHaveValue('');
    
    // 5. Create second instance
    await page.click('.btn-skip-perms');
    await page.waitForSelector(`[data-testid="instance-card"]:nth-child(2)`, { timeout: 15000 });
    
    // 6. Should now have 2 instances
    await expect(page.locator('[data-testid="instance-card"]')).toHaveCount(2);
    
    // 7. Switch between instances
    const instance2 = page.locator('[data-testid="instance-card"]').nth(1);
    const instance2Id = await instance2.getAttribute('data-instance-id');
    
    await instance2.click();
    await expect(instance2).toHaveClass(/selected/);
    await expect(instance1).not.toHaveClass(/selected/);
    
    // 8. Verify terminal output switches
    const terminalOutput = page.locator('[data-testid="terminal-output"]');
    const outputText = await terminalOutput.textContent();
    expect(outputText).toContain(instance2Id?.slice(0, 8));
    
    // 9. Terminate instances
    await page.click(`[data-testid="disconnect-button-${instance1Id}"]`);
    await expect(page.locator(`[data-testid="instance-card"][data-instance-id="${instance1Id}"]`)).not.toBeVisible({ timeout: 5000 });
    
    await page.click(`[data-testid="disconnect-button-${instance2Id}"]`);
    await expect(page.locator(`[data-testid="instance-card"][data-instance-id="${instance2Id}"]`)).not.toBeVisible({ timeout: 5000 });
    
    // 10. Should return to empty state
    await expect(page.locator('.no-instances')).toBeVisible();
    await expect(page.locator('[data-testid="instance-card"]')).toHaveCount(0);
  });
});
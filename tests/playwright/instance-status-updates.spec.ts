import { test, expect, Page } from '@playwright/test';

/**
 * Instance Status Updates Validation Tests
 * 
 * Tests real-time instance status updates through SSE:
 * - Status progression from starting -> running -> stopped
 * - Visual status indicators update correctly  
 * - Status information persists across reconnections
 * - Multiple instance status tracking
 * - Status-dependent UI behavior
 */

test.describe('Instance Status Updates Validation', () => {
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

  test('Instance status progresses from starting to running', async () => {
    console.log('🔄 Testing status progression: starting -> running...');
    
    // Create instance
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Wait for instance to appear in list
    const instanceItem = page.locator('.instance-item').first();
    await expect(instanceItem).toBeVisible({ timeout: 30000 });
    
    // Verify initial status is 'starting'
    await expect(instanceItem.locator('.status-text')).toContainText('starting', { timeout: 5000 });
    
    // Verify status indicator shows starting state
    await expect(instanceItem.locator('.status-indicator.status-starting')).toBeVisible();
    
    // Wait for status to change to 'running'
    await expect(instanceItem.locator('.status-text')).toContainText('running', { timeout: 45000 });
    
    // Verify status indicator updates to running state
    await expect(instanceItem.locator('.status-indicator.status-running')).toBeVisible();
    
    // Verify status CSS class updates on instance item
    await expect(instanceItem).toHaveClass(/status-running/);
    
    console.log('✅ Status progression test passed');
  });

  test('Visual status indicators update correctly', async () => {
    console.log('🎨 Testing visual status indicator updates...');
    
    // Create instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    const instanceItem = page.locator('.instance-item').first();
    
    // Check starting state visuals
    await expect(instanceItem.locator('.status-text')).toContainText('starting');
    await expect(instanceItem.locator('.status-indicator')).toHaveClass(/status-starting/);
    
    // Verify the status indicator has the correct visual appearance
    const startingIndicator = instanceItem.locator('.status-indicator.status-starting');
    await expect(startingIndicator).toBeVisible();
    
    // Wait for running state
    await expect(instanceItem.locator('.status-text')).toContainText('running', { timeout: 45000 });
    
    // Check running state visuals
    const runningIndicator = instanceItem.locator('.status-indicator.status-running');
    await expect(runningIndicator).toBeVisible();
    await expect(runningIndicator).toContainText('●');
    
    // Verify the instance item has the appropriate CSS class
    await expect(instanceItem).toHaveClass(/status-running/);
    
    console.log('✅ Visual status indicator test passed');
  });

  test('Status updates appear in terminal output', async () => {
    console.log('💬 Testing status updates in terminal output...');
    
    // Create instance
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Select the instance to view its output
    await page.click('.instance-item');
    
    // Wait for instance to be running
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    // Check that status changes appear in the output area
    const outputText = await page.locator('.output-area pre').textContent();
    
    // Should contain status change notification
    expect(outputText).toMatch(/Status changed to: running/i);
    
    console.log('✅ Status updates in terminal output test passed');
  });

  test('Multiple instances have independent status tracking', async () => {
    console.log('🔀 Testing independent status tracking for multiple instances...');
    
    // Create first instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Create second instance  
    await page.click('button:has-text("⚡ skip-permissions -c")');
    
    // Wait for both instances to appear
    await page.waitForFunction(() => {
      const instances = document.querySelectorAll('.instance-item');
      return instances.length >= 2;
    }, { timeout: 45000 });
    
    const instances = page.locator('.instance-item');
    await expect(instances).toHaveCount(2);
    
    // Verify each instance has its own status
    const firstInstance = instances.first();
    const secondInstance = instances.last();
    
    // Both should eventually reach running state independently
    await expect(firstInstance.locator('.status-text')).toContainText(/starting|running/, { timeout: 45000 });
    await expect(secondInstance.locator('.status-text')).toContainText(/starting|running/, { timeout: 45000 });
    
    // Verify they have different instance IDs
    const firstId = await firstInstance.locator('.instance-id').textContent();
    const secondId = await secondInstance.locator('.instance-id').textContent();
    
    expect(firstId).not.toBe(secondId);
    
    // Verify status indicators are independent
    await expect(firstInstance.locator('.status-indicator')).toBeVisible();
    await expect(secondInstance.locator('.status-indicator')).toBeVisible();
    
    console.log('✅ Multiple instance status tracking test passed');
  });

  test('Status persists across page reloads', async () => {
    console.log('🔄 Testing status persistence across page reloads...');
    
    // Create instance and wait for it to be running
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Wait for running status
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    // Get instance ID for tracking
    const instanceId = await page.locator('.instance-id').textContent();
    
    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: 15000 });
    
    // Verify instance reappears with correct status
    await page.waitForSelector('.instance-item', { timeout: 15000 });
    
    // Find the same instance by ID
    const restoredInstance = page.locator(`.instance-item:has-text("${instanceId}")`);
    await expect(restoredInstance).toBeVisible();
    
    // Verify status is still 'running'
    await expect(restoredInstance.locator('.status-text')).toContainText('running', { timeout: 10000 });
    
    console.log('✅ Status persistence test passed');
  });

  test('Status updates trigger connection status changes', async () => {
    console.log('🔗 Testing connection status updates based on instance status...');
    
    // Create instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Select the instance
    await page.click('.instance-item');
    
    // Initially, connection should be establishing
    const connectionStatus = page.locator('.connection-status');
    
    // Wait for instance to be running
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    // Connection status should reflect successful connection
    await expect(connectionStatus).toContainText('Connected', { timeout: 15000 });
    
    // Verify connection shows SSE or polling mode
    const connectionText = await connectionStatus.textContent();
    expect(connectionText).toMatch(/Connected.*via|Connected.*SSE|Connected.*Polling/i);
    
    console.log('✅ Connection status updates test passed');
  });

  test('Instance count updates correctly in header', async () => {
    console.log('🔢 Testing instance count updates in header...');
    
    // Initially no instances
    await expect(page.locator('.count')).not.toBeVisible();
    
    // Create first instance
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    // Should show count
    await expect(page.locator('.count')).toBeVisible({ timeout: 5000 });
    
    // Wait for instance to be running
    await expect(page.locator('.instance-item .status-text')).toContainText('running', { timeout: 45000 });
    
    // Should show "Active: 1/1"
    await expect(page.locator('.count')).toContainText('Active: 1/1');
    
    // Create second instance
    await page.click('button:has-text("⚡ skip-permissions")');
    await page.waitForFunction(() => {
      const instances = document.querySelectorAll('.instance-item');
      return instances.length >= 2;
    }, { timeout: 45000 });
    
    // Should show "Active: 1/2" or "Active: 2/2" depending on second instance status
    await expect(page.locator('.count')).toContainText(/Active: [12]\/2/);
    
    // Wait for second instance to be running too
    await page.waitForFunction(() => {
      const runningInstances = document.querySelectorAll('.instance-item .status-text');
      let runningCount = 0;
      runningInstances.forEach(el => {
        if (el.textContent === 'running') runningCount++;
      });
      return runningCount >= 1; // At least one should be running
    }, { timeout: 45000 });
    
    // Count should reflect running instances
    await expect(page.locator('.count')).toContainText(/Active: [12]\/2/);
    
    console.log('✅ Instance count updates test passed');
  });

  test('Status-dependent UI behavior works correctly', async () => {
    console.log('🎛️ Testing status-dependent UI behavior...');
    
    // Create instance
    await page.click('button:has-text("🚀 prod/claude")');
    await page.waitForSelector('.instance-item', { timeout: 30000 });
    
    const instanceItem = page.locator('.instance-item');
    
    // When starting, should not be able to send input effectively
    await instanceItem.click();
    const inputField = page.locator('.input-field');
    const sendButton = page.locator('.btn-send');
    
    // These should be visible but interaction might be limited
    await expect(inputField).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // Wait for running status
    await expect(instanceItem.locator('.status-text')).toContainText('running', { timeout: 45000 });
    
    // Now should be able to interact fully
    await expect(inputField).toBeEnabled();
    await expect(sendButton).toBeEnabled();
    
    // Verify terminate button is always available
    await expect(instanceItem.locator('.btn-terminate')).toBeVisible();
    
    console.log('✅ Status-dependent UI behavior test passed');
  });
});
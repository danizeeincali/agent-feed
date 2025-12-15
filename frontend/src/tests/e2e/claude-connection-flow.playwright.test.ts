/**
 * Claude Connection Flow E2E Tests
 * 
 * Tests the complete user workflow from browser interaction to backend connection
 * including SSE establishment, real-time communication, and error handling.
 * 
 * Critical Test Cases:
 * - Full Connection Workflow (UI → Backend → SSE)
 * - Instance Selection and Connection State
 * - Real-time Data Flow and Terminal Output
 * - Connection Recovery and Error Handling
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

// Test utilities
class ConnectionFlowTestHelper {
  constructor(private page: Page) {}

  async navigateToApp() {
    await this.page.goto(FRONTEND_URL);
    await this.page.waitForSelector('[data-testid="claude-instance-manager"]', { timeout: 10000 });
    await this.waitForInitialLoad();
  }

  async waitForInitialLoad() {
    await this.page.waitForFunction(() => {
      const instancesList = document.querySelector('.instances-list');
      return instancesList !== null;
    }, { timeout: 10000 });
  }

  async waitForInstancesCount(count: number, timeout = 10000) {
    await this.page.waitForFunction(
      (expectedCount) => {
        const instances = document.querySelectorAll('.instance-item');
        return instances.length === expectedCount;
      },
      count,
      { timeout }
    );
  }

  async createInstanceViaUI(buttonClass: string) {
    await this.page.click(`.${buttonClass}`);
    
    // Wait for instance creation to complete
    await this.page.waitForFunction(() => {
      const loadingButton = document.querySelector('button[disabled]');
      return !loadingButton;
    }, { timeout: 30000 });
  }

  async selectInstance(instanceId: string) {
    await this.page.click(`[data-instance-id="${instanceId}"]`);
    
    // Wait for selection to take effect
    await this.page.waitForSelector('.instance-item.selected', { timeout: 5000 });
  }

  async getConnectionStatus(): Promise<string> {
    const statusElement = await this.page.$('.connection-status');
    return statusElement ? await statusElement.textContent() || '' : '';
  }

  async getTerminalOutput(): Promise<string> {
    const outputElement = await this.page.$('[data-testid="terminal-output"] pre');
    return outputElement ? await outputElement.textContent() || '' : '';
  }

  async sendCommand(command: string) {
    await this.page.fill('[data-testid="command-input"]', command);
    await this.page.click('[data-testid="send-command-button"]');
  }

  async waitForTerminalOutput(expectedText: string, timeout = 10000) {
    await this.page.waitForFunction(
      (text) => {
        const outputElement = document.querySelector('[data-testid="terminal-output"] pre');
        return outputElement && outputElement.textContent && outputElement.textContent.includes(text);
      },
      expectedText,
      { timeout }
    );
  }

  async getSelectedInstanceId(): Promise<string | null> {
    const selectedElement = await this.page.$('.instance-item.selected');
    return selectedElement ? await selectedElement.getAttribute('data-instance-id') : null;
  }

  async verifySSEConnection(instanceId: string): Promise<boolean> {
    // Check if SSE connection is established by looking for connection indicators
    const connectionStatus = await this.getConnectionStatus();
    return connectionStatus.includes('Connected') && connectionStatus.includes('SSE');
  }

  async waitForStatusChange(instanceId: string, expectedStatus: string, timeout = 15000) {
    await this.page.waitForFunction(
      (id, status) => {
        const instanceElement = document.querySelector(`[data-instance-id="${id}"]`);
        const statusElement = instanceElement?.querySelector('.status-text');
        return statusElement && statusElement.textContent && statusElement.textContent.trim() === status;
      },
      instanceId,
      expectedStatus,
      { timeout }
    );
  }

  async terminateInstanceViaUI(instanceId: string) {
    await this.page.click(`[data-testid="disconnect-button-${instanceId}"]`);
    
    // Wait for instance to be removed
    await this.page.waitForFunction(
      (id) => {
        const instanceElement = document.querySelector(`[data-instance-id="${id}"]`);
        return !instanceElement;
      },
      instanceId,
      { timeout: 10000 }
    );
  }

  async interceptNetworkRequests() {
    const requests: any[] = [];
    
    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    return requests;
  }

  async simulateNetworkError() {
    await this.page.route(`${BACKEND_URL}/api/**`, route => {
      route.abort('failed');
    });
  }

  async restoreNetwork() {
    await this.page.unroute(`${BACKEND_URL}/api/**`);
  }
}

test.describe('Claude Connection Flow', () => {
  let helper: ConnectionFlowTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new ConnectionFlowTestHelper(page);
    await helper.navigateToApp();
  });

  test('should complete full instance creation and connection workflow', async ({ page }) => {
    const requests = await helper.interceptNetworkRequests();
    
    // Step 1: Create instance via UI
    await helper.createInstanceViaUI('btn-prod');
    
    // Step 2: Wait for instance to appear
    await helper.waitForInstancesCount(1);
    
    // Step 3: Get instance ID and verify it exists
    const instanceElements = await page.$$('.instance-item');
    expect(instanceElements.length).toBe(1);
    
    const instanceId = await instanceElements[0].getAttribute('data-instance-id');
    expect(instanceId).toBeTruthy();
    expect(instanceId).toMatch(/^claude-\d+$/);
    
    // Step 4: Wait for instance to reach running status
    await helper.waitForStatusChange(instanceId!, 'running');
    
    // Step 5: Select the instance
    await helper.selectInstance(instanceId!);
    
    // Step 6: Verify connection is established
    const connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Connected');
    
    // Step 7: Verify terminal output area is ready
    const terminalOutput = await helper.getTerminalOutput();
    expect(terminalOutput).toBeTruthy();
    
    // Step 8: Verify API calls were made
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.some(r => r.method === 'POST' && r.url.includes('/instances'))).toBe(true);
  });

  test('should handle instance selection and connection switching', async ({ page }) => {
    // Create two instances
    await helper.createInstanceViaUI('btn-prod');
    await helper.waitForInstancesCount(1);
    
    await helper.createInstanceViaUI('btn-skip-perms');
    await helper.waitForInstancesCount(2);
    
    // Get both instance IDs
    const instanceElements = await page.$$('.instance-item');
    const instance1Id = await instanceElements[0].getAttribute('data-instance-id');
    const instance2Id = await instanceElements[1].getAttribute('data-instance-id');
    
    expect(instance1Id).toBeTruthy();
    expect(instance2Id).toBeTruthy();
    expect(instance1Id).not.toBe(instance2Id);
    
    // Wait for both to be running
    await helper.waitForStatusChange(instance1Id!, 'running');
    await helper.waitForStatusChange(instance2Id!, 'running');
    
    // Select first instance
    await helper.selectInstance(instance1Id!);
    let selectedId = await helper.getSelectedInstanceId();
    expect(selectedId).toBe(instance1Id);
    
    // Verify connection status
    let connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Connected');
    expect(connectionStatus).toContain(instance1Id!.slice(0, 8));
    
    // Switch to second instance
    await helper.selectInstance(instance2Id!);
    selectedId = await helper.getSelectedInstanceId();
    expect(selectedId).toBe(instance2Id);
    
    // Verify connection switched
    connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Connected');
    expect(connectionStatus).toContain(instance2Id!.slice(0, 8));
  });

  test('should establish SSE connection and receive real-time data', async ({ page }) => {
    // Create instance
    await helper.createInstanceViaUI('btn-prod');
    await helper.waitForInstancesCount(1);
    
    const instanceElements = await page.$$('.instance-item');
    const instanceId = await instanceElements[0].getAttribute('data-instance-id');
    
    // Wait for running status
    await helper.waitForStatusChange(instanceId!, 'running');
    
    // Select instance
    await helper.selectInstance(instanceId!);
    
    // Verify SSE connection
    const hasSSE = await helper.verifySSEConnection(instanceId!);
    expect(hasSSE).toBe(true);
    
    // Send a command
    await helper.sendCommand('ls');
    
    // Wait for output to appear
    await page.waitForTimeout(2000);
    const output = await helper.getTerminalOutput();
    
    // Should have some output (could be command echo or actual response)
    expect(output.length).toBeGreaterThan(0);
    expect(output).not.toContain('Waiting for real output');
  });

  test('should handle command input and output flow', async ({ page }) => {
    // Setup instance
    await helper.createInstanceViaUI('btn-skip-perms');
    await helper.waitForInstancesCount(1);
    
    const instanceElements = await page.$$('.instance-item');
    const instanceId = await instanceElements[0].getAttribute('data-instance-id');
    
    await helper.waitForStatusChange(instanceId!, 'running');
    await helper.selectInstance(instanceId!);
    
    // Test basic command
    await helper.sendCommand('echo "test"');
    await page.waitForTimeout(1000);
    
    // Input field should be cleared
    const inputValue = await page.inputValue('[data-testid="command-input"]');
    expect(inputValue).toBe('');
    
    // Test Enter key
    await page.fill('[data-testid="command-input"]', 'pwd');
    await page.press('[data-testid="command-input"]', 'Enter');
    
    const inputValueAfterEnter = await page.inputValue('[data-testid="command-input"]');
    expect(inputValueAfterEnter).toBe('');
    
    // Wait for some output
    await page.waitForTimeout(2000);
    const output = await helper.getTerminalOutput();
    expect(output.length).toBeGreaterThan(0);
  });

  test('should handle connection errors and recovery', async ({ page }) => {
    // Create instance first
    await helper.createInstanceViaUI('btn-prod');
    await helper.waitForInstancesCount(1);
    
    const instanceElements = await page.$$('.instance-item');
    const instanceId = await instanceElements[0].getAttribute('data-instance-id');
    
    await helper.waitForStatusChange(instanceId!, 'running');
    await helper.selectInstance(instanceId!);
    
    // Verify initial connection
    let connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Connected');
    
    // Simulate network error
    await helper.simulateNetworkError();
    
    // Try to send command (should fail)
    await helper.sendCommand('test-command');
    await page.waitForTimeout(2000);
    
    // Connection status should show error
    connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Error');
    
    // Restore network
    await helper.restoreNetwork();
    
    // Refresh page to restore connection
    await page.reload();
    await helper.waitForInitialLoad();
    await helper.waitForInstancesCount(1);
    
    // Select instance again
    await helper.selectInstance(instanceId!);
    
    // Connection should be restored
    connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Connected');
  });

  test('should handle instance termination workflow', async ({ page }) => {
    // Create instance
    await helper.createInstanceViaUI('btn-prod');
    await helper.waitForInstancesCount(1);
    
    const instanceElements = await page.$$('.instance-item');
    const instanceId = await instanceElements[0].getAttribute('data-instance-id');
    
    await helper.waitForStatusChange(instanceId!, 'running');
    await helper.selectInstance(instanceId!);
    
    // Verify connection
    let connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Connected');
    
    // Terminate instance
    await helper.terminateInstanceViaUI(instanceId!);
    
    // Verify instance is removed
    await helper.waitForInstancesCount(0);
    
    // Verify no selection
    const selectedId = await helper.getSelectedInstanceId();
    expect(selectedId).toBeNull();
    
    // Should show no-selection message
    const noSelectionElement = await page.$('.no-selection');
    expect(noSelectionElement).toBeTruthy();
  });

  test('should handle rapid instance creation and selection', async ({ page }) => {
    const requests = await helper.interceptNetworkRequests();
    
    // Rapidly create multiple instances
    await Promise.all([
      helper.createInstanceViaUI('btn-prod'),
      helper.createInstanceViaUI('btn-skip-perms')
    ]);
    
    // Wait for both instances
    await helper.waitForInstancesCount(2, 15000);
    
    // Get instance IDs
    const instanceElements = await page.$$('.instance-item');
    const instanceIds = await Promise.all(
      instanceElements.map(el => el.getAttribute('data-instance-id'))
    );
    
    // All should have valid IDs
    instanceIds.forEach(id => {
      expect(id).toBeTruthy();
      expect(id).toMatch(/^claude-\d+$/);
    });
    
    // All should be unique
    expect(new Set(instanceIds).size).toBe(instanceIds.length);
    
    // Wait for running status
    await Promise.all(
      instanceIds.map(id => helper.waitForStatusChange(id!, 'running'))
    );
    
    // Rapidly switch between instances
    for (const instanceId of instanceIds) {
      await helper.selectInstance(instanceId!);
      const selectedId = await helper.getSelectedInstanceId();
      expect(selectedId).toBe(instanceId);
      
      const connectionStatus = await helper.getConnectionStatus();
      expect(connectionStatus).toContain('Connected');
    }
  });

  test('should maintain connection state across page navigation', async ({ page }) => {
    // Create and select instance
    await helper.createInstanceViaUI('btn-prod');
    await helper.waitForInstancesCount(1);
    
    const instanceElements = await page.$$('.instance-item');
    const instanceId = await instanceElements[0].getAttribute('data-instance-id');
    
    await helper.waitForStatusChange(instanceId!, 'running');
    await helper.selectInstance(instanceId!);
    
    // Send a command to generate some output
    await helper.sendCommand('echo "before refresh"');
    await page.waitForTimeout(1000);
    
    const outputBefore = await helper.getTerminalOutput();
    
    // Refresh page
    await page.reload();
    await helper.waitForInitialLoad();
    await helper.waitForInstancesCount(1);
    
    // Instance should still be there
    const newInstanceElements = await page.$$('.instance-item');
    const newInstanceId = await newInstanceElements[0].getAttribute('data-instance-id');
    expect(newInstanceId).toBe(instanceId);
    
    // Select instance again
    await helper.selectInstance(instanceId!);
    
    // Connection should be restored
    const connectionStatus = await helper.getConnectionStatus();
    expect(connectionStatus).toContain('Connected');
  });
});
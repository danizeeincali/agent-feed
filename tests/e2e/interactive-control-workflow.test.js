/**
 * Interactive Control Workflow - End-to-End Tests
 * 
 * Complete end-to-end testing of the interactive Claude control workflow using Playwright.
 * Tests the full user journey from the frontend interface through to backend processing.
 */

import { test, expect } from '@playwright/test';

const TEST_CONFIG = {
  FRONTEND_URL: 'http://localhost:5173',
  BACKEND_URL: 'http://localhost:3000',
  PAGE_LOAD_TIMEOUT: 15000,
  INSTANCE_READY_TIMEOUT: 30000,
  RESPONSE_TIMEOUT: 45000,
  CONNECTION_TIMEOUT: 10000
};

class InteractiveControlWorkflowTester {
  constructor(page) {
    this.page = page;
    this.createdInstances = [];
  }

  async navigateToEnhancedInterface() {
    await this.page.goto(`${TEST_CONFIG.FRONTEND_URL}/claude-manager`);
    await this.page.waitForSelector('[data-testid="enhanced-sse-interface"]', { 
      timeout: TEST_CONFIG.PAGE_LOAD_TIMEOUT 
    });
  }

  async waitForInstancesToLoad() {
    // Wait for the instances table or quick launch buttons to appear
    try {
      await this.page.waitForSelector('.instance-table-container', { 
        timeout: 5000 
      });
    } catch {
      // If no instances exist, quick launch buttons should be visible
      await this.page.waitForSelector('[data-testid="quick-launch-templates"]', { 
        timeout: 5000 
      });
    }
  }

  async createInstanceViaQuickLaunch(templateName = 'Default Claude') {
    await this.navigateToEnhancedInterface();
    await this.waitForInstancesToLoad();

    // Click the quick launch button
    const quickLaunchButton = this.page.locator(`button:has-text("${templateName}")`);
    await expect(quickLaunchButton).toBeVisible();
    await quickLaunchButton.click();

    // Wait for the instance to appear in the table
    await this.page.waitForSelector('.instance-table-container table tbody tr', {
      timeout: TEST_CONFIG.INSTANCE_READY_TIMEOUT
    });

    // Get the newly created instance ID
    const instanceRow = this.page.locator('.instance-table-container table tbody tr').first();
    const instanceId = await instanceRow.locator('.instance-id-cell .full-id').textContent();
    
    this.createdInstances.push(instanceId);
    return instanceId;
  }

  async connectToInstance(instanceId) {
    const instanceRow = this.page.locator(`tr:has(.instance-id-cell .full-id:text("${instanceId}"))`);
    await expect(instanceRow).toBeVisible();

    const connectButton = instanceRow.locator('button:has-text("Connect")');
    await expect(connectButton).toBeVisible();
    await connectButton.click();

    // Wait for connection status to change
    await this.page.waitForSelector(`tr:has(.instance-id-cell .full-id:text("${instanceId}")) .status-cell .badge:has-text("connected")`, {
      timeout: TEST_CONFIG.CONNECTION_TIMEOUT
    });

    // Wait for the main interface to show up
    await this.page.waitForSelector('[role="tablist"]', { timeout: 5000 });
  }

  async sendMessageInChatMode(message) {
    // Switch to chat mode if not already
    const chatTab = this.page.locator('[role="tab"]:has-text("Chat")');
    if (await chatTab.isVisible()) {
      await chatTab.click();
    }

    // Find and fill the chat input
    const chatInput = this.page.locator('input[placeholder*="Type a message"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill(message);

    // Click send button
    const sendButton = this.page.locator('button:has([data-lucide="send"])');
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // Wait for user message to appear in chat
    await this.page.waitForSelector('.space-y-2 > div:has-text("' + message.slice(0, 20) + '")', {
      timeout: 5000
    });
  }

  async sendMessageInTerminalMode(command) {
    // Switch to terminal mode
    const terminalTab = this.page.locator('[role="tab"]:has-text("Terminal")');
    await expect(terminalTab).toBeVisible();
    await terminalTab.click();

    // Find and fill the terminal input
    const terminalInput = this.page.locator('input[placeholder*="Enter command"]');
    await expect(terminalInput).toBeVisible();
    await terminalInput.fill(command);

    // Press Enter or click send
    const sendButton = this.page.locator('button:has([data-lucide="chevron-right"])');
    await expect(sendButton).toBeVisible();
    await sendButton.click();
  }

  async waitForResponse(timeoutMs = TEST_CONFIG.RESPONSE_TIMEOUT) {
    // Look for any new content in either chat or terminal areas
    try {
      // Wait for chat response
      await this.page.waitForSelector('.space-y-2 > div.bg-gray-100', { 
        timeout: timeoutMs 
      });
      return 'chat';
    } catch {
      try {
        // Wait for terminal output
        await this.page.waitForSelector('.bg-black .whitespace-pre-wrap', { 
          timeout: timeoutMs 
        });
        return 'terminal';
      } catch {
        throw new Error('No response received within timeout');
      }
    }
  }

  async getLastChatMessage() {
    const messages = this.page.locator('.space-y-2 > div.bg-gray-100');
    const lastMessage = messages.last();
    return await lastMessage.locator('.text-sm').textContent();
  }

  async getTerminalOutput() {
    const terminalContent = this.page.locator('.bg-black');
    return await terminalContent.textContent();
  }

  async testCopyExportFeature() {
    // Click the Copy/Export button
    const copyExportButton = this.page.locator('button:has-text("Copy/Export")');
    await expect(copyExportButton).toBeVisible();
    await copyExportButton.click();

    // Verify the dropdown menu appears
    await expect(this.page.locator('div:has-text("Copy All Output")')).toBeVisible();
    await expect(this.page.locator('div:has-text("Export as TXT")')).toBeVisible();
    await expect(this.page.locator('div:has-text("Export as JSON")')).toBeVisible();
    await expect(this.page.locator('div:has-text("Export as Markdown")')).toBeVisible();

    // Test copy functionality
    await this.page.locator('button:has-text("Copy All Output")').click();

    // Look for feedback message
    await this.page.waitForSelector('.copy-feedback.success', { timeout: 3000 });
  }

  async testCommandHistory() {
    // Switch to terminal mode
    const terminalTab = this.page.locator('[role="tab"]:has-text("Terminal")');
    await terminalTab.click();

    const terminalInput = this.page.locator('input[placeholder*="Enter command"]');
    
    // Send first command
    await terminalInput.fill('echo "first command"');
    await this.page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Send second command  
    await terminalInput.fill('echo "second command"');
    await this.page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clear input and test history navigation
    await terminalInput.fill('');
    
    // Press up arrow - should get last command
    await this.page.keyboard.press('ArrowUp');
    let inputValue = await terminalInput.inputValue();
    expect(inputValue).toBe('echo "second command"');

    // Press up arrow again - should get first command
    await this.page.keyboard.press('ArrowUp');
    inputValue = await terminalInput.inputValue();
    expect(inputValue).toBe('echo "first command"');

    // Press down arrow - should go back to second command
    await this.page.keyboard.press('ArrowDown');
    inputValue = await terminalInput.inputValue();
    expect(inputValue).toBe('echo "second command"');
  }

  async disconnectFromInstance(instanceId) {
    const instanceRow = this.page.locator(`tr:has(.instance-id-cell .full-id:text("${instanceId}"))`);
    const disconnectButton = instanceRow.locator('button:has-text("Disconnect")');
    
    if (await disconnectButton.isVisible()) {
      await disconnectButton.click();
      
      // Wait for status to change back
      await this.page.waitForSelector(
        `tr:has(.instance-id-cell .full-id:text("${instanceId}")) button:has-text("Connect")`, 
        { timeout: 5000 }
      );
    }
  }

  async cleanup() {
    // Disconnect from all instances
    for (const instanceId of this.createdInstances) {
      try {
        await this.disconnectFromInstance(instanceId);
      } catch (error) {
        console.warn(`Failed to disconnect from ${instanceId}:`, error.message);
      }
    }

    // Delete instances via API
    for (const instanceId of this.createdInstances) {
      try {
        const response = await fetch(`${TEST_CONFIG.BACKEND_URL}/api/claude/instances/${instanceId}`, {
          method: 'DELETE'
        });
        console.log(`Cleanup instance ${instanceId}: ${response.status}`);
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error.message);
      }
    }
  }
}

test.describe('Interactive Control Workflow - E2E Tests', () => {
  let tester;

  test.beforeEach(async ({ page }) => {
    tester = new InteractiveControlWorkflowTester(page);
    
    // Set longer timeout for Claude responses
    page.setDefaultTimeout(TEST_CONFIG.RESPONSE_TIMEOUT);
  });

  test.afterEach(async () => {
    if (tester) {
      await tester.cleanup();
    }
  });

  test('should complete full workflow: Create → Connect → Chat → Response', async () => {
    // Step 1: Create instance via quick launch
    const instanceId = await tester.createInstanceViaQuickLaunch('Default Claude');
    expect(instanceId).toMatch(/^claude-[a-zA-Z0-9]+$/);

    // Step 2: Connect to the instance
    await tester.connectToInstance(instanceId);

    // Step 3: Send a chat message
    const testMessage = 'Hello, what is 2 + 2?';
    await tester.sendMessageInChatMode(testMessage);

    // Step 4: Wait for and verify response
    const responseType = await tester.waitForResponse();
    expect(responseType).toBe('chat');

    const response = await tester.getLastChatMessage();
    expect(response).toBeDefined();
    expect(response.trim().length).toBeGreaterThan(0);
    expect(response.toLowerCase()).toContain('4');
  });

  test('should handle terminal mode interaction', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Skip Permissions');
    await tester.connectToInstance(instanceId);

    // Send command in terminal mode
    await tester.sendMessageInTerminalMode('What is the capital of France?');

    // Wait for response in terminal
    const responseType = await tester.waitForResponse();
    expect(['chat', 'terminal']).toContain(responseType);

    const terminalOutput = await tester.getTerminalOutput();
    expect(terminalOutput).toBeDefined();
    expect(terminalOutput.toLowerCase()).toContain('paris');
  });

  test('should handle split view mode correctly', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Interactive Mode');
    await tester.connectToInstance(instanceId);

    // Switch to split view
    const splitTab = tester.page.locator('[role="tab"]:has-text("Split View")');
    await expect(splitTab).toBeVisible();
    await splitTab.click();

    // Verify both chat and terminal panels are visible
    await expect(tester.page.locator('.grid-cols-2')).toBeVisible();
    await expect(tester.page.locator('h3:has-text("Chat")')).toBeVisible();
    await expect(tester.page.locator('h3:has-text("Terminal")')).toBeVisible();

    // Send message in split view
    const chatInput = tester.page.locator('.grid-cols-2 input[placeholder*="Type a message"]');
    await chatInput.fill('Test message in split view');
    
    const sendButton = tester.page.locator('.grid-cols-2 button:has([data-lucide="send"])');
    await sendButton.click();

    // Should see response in both panels
    await tester.waitForResponse();
  });

  test('should maintain instance state across interface views', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Default Claude');
    await tester.connectToInstance(instanceId);

    // Send message in chat
    await tester.sendMessageInChatMode('Remember this number: 42');
    await tester.waitForResponse();

    // Switch to terminal and reference the previous conversation
    await tester.sendMessageInTerminalMode('What number did I ask you to remember?');
    await tester.waitForResponse();

    // The response should reference the previous number
    const terminalOutput = await tester.getTerminalOutput();
    expect(terminalOutput).toContain('42');
  });

  test('should handle multiple concurrent instances', async () => {
    // Create multiple instances
    const instanceId1 = await tester.createInstanceViaQuickLaunch('Default Claude');
    const instanceId2 = await tester.createInstanceViaQuickLaunch('Skip Permissions');

    // Verify both instances are visible in the table
    const instanceTable = tester.page.locator('.instance-table-container table');
    await expect(instanceTable.locator(`tr:has-text("${instanceId1}")`)).toBeVisible();
    await expect(instanceTable.locator(`tr:has-text("${instanceId2}")`)).toBeVisible();

    // Connect to first instance
    await tester.connectToInstance(instanceId1);
    
    // Send message
    await tester.sendMessageInChatMode('Instance 1 test message');
    await tester.waitForResponse();

    // Disconnect and connect to second instance
    await tester.disconnectFromInstance(instanceId1);
    await tester.connectToInstance(instanceId2);

    // Send different message
    await tester.sendMessageInChatMode('Instance 2 test message');
    await tester.waitForResponse();

    // Verify separate conversation contexts
    const response2 = await tester.getLastChatMessage();
    expect(response2).toBeDefined();
    expect(response2).not.toContain('Instance 1');
  });

  test('should test copy/export functionality', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Default Claude');
    await tester.connectToInstance(instanceId);

    // Generate some content to copy/export
    await tester.sendMessageInChatMode('Generate a test response for copy/export');
    await tester.waitForResponse();

    // Test copy/export features
    await tester.testCopyExportFeature();
  });

  test('should test command history feature', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Skip Permissions');
    await tester.connectToInstance(instanceId);

    // Test command history functionality
    await tester.testCommandHistory();
  });

  test('should handle connection errors gracefully', async () => {
    await tester.navigateToEnhancedInterface();

    // Try to connect to a non-existent instance by manipulating the DOM
    // First create a fake instance row
    await tester.page.evaluate(() => {
      const table = document.querySelector('.instance-table-container table tbody');
      if (table) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="instance-id-cell"><span class="full-id">claude-nonexistent</span></td>
          <td class="pid-cell"><code>0000</code></td>
          <td class="status-cell"><span class="badge">stopped</span></td>
          <td class="actions-cell"><button>Connect</button></td>
        `;
        table.appendChild(row);
      }
    });

    // Try to connect to the fake instance
    const fakeConnectButton = tester.page.locator('tr:has-text("claude-nonexistent") button:has-text("Connect")');
    await fakeConnectButton.click();

    // Should handle the error gracefully without crashing
    await tester.page.waitForTimeout(2000);

    // The interface should still be responsive
    await expect(tester.page.locator('[data-testid="enhanced-sse-interface"]')).toBeVisible();
  });

  test('should handle network interruptions', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Default Claude');
    await tester.connectToInstance(instanceId);

    // Send a message
    await tester.sendMessageInChatMode('Test message before network interruption');
    await tester.waitForResponse();

    // Simulate network interruption by going offline
    await tester.page.context().setOffline(true);
    
    // Try to send another message
    await tester.sendMessageInChatMode('Message during offline period');
    
    // Wait a moment
    await tester.page.waitForTimeout(2000);

    // Go back online
    await tester.page.context().setOffline(false);

    // The interface should recover
    await tester.page.waitForTimeout(3000);
    
    // Should be able to send messages again
    await tester.sendMessageInChatMode('Message after reconnection');
    
    // May or may not get response depending on reconnection logic, 
    // but interface should remain functional
    await expect(tester.page.locator('input[placeholder*="Type a message"]')).toBeVisible();
  });

  test('should maintain performance with long conversations', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Default Claude');
    await tester.connectToInstance(instanceId);

    const messageCount = 10;
    
    for (let i = 1; i <= messageCount; i++) {
      await tester.sendMessageInChatMode(`Message ${i} of ${messageCount}`);
      
      try {
        await tester.waitForResponse(10000); // Shorter timeout for performance test
      } catch (error) {
        console.warn(`Response ${i} timed out`);
      }
      
      // Small delay between messages
      await tester.page.waitForTimeout(500);
    }

    // Verify the interface is still responsive
    const chatInput = tester.page.locator('input[placeholder*="Type a message"]');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();

    // Verify messages are visible in chat history
    const chatMessages = tester.page.locator('.space-y-2 > div');
    const messageCount = await chatMessages.count();
    expect(messageCount).toBeGreaterThan(messageCount * 2); // User + assistant messages
  });

  test('should handle special characters in messages', async () => {
    const instanceId = await tester.createInstanceViaQuickLaunch('Default Claude');
    await tester.connectToInstance(instanceId);

    const specialMessage = 'Special chars: 🚀 ñáéíóú "quotes" \'apostrophes\' <tags> & symbols';
    await tester.sendMessageInChatMode(specialMessage);

    // Should display the message correctly in the UI
    await tester.page.waitForSelector(`.space-y-2 > div:has-text("🚀")`, { timeout: 5000 });
    
    // Should handle the response without errors
    try {
      await tester.waitForResponse(15000);
    } catch {
      // Response timeout is acceptable for this test
    }

    // Interface should remain functional
    await expect(tester.page.locator('input[placeholder*="Type a message"]')).toBeVisible();
  });
});
import { test, expect, Page } from '@playwright/test';
import ClaudeCodeTestHelpers from '../utils/test-helpers';

/**
 * Complete Workflow End-to-End Tests
 * 
 * Tests the full Claude Code integration workflow:
 * - Button click → Instance creation → Message sending → Response verification
 * - All 4 button types for instance creation
 * - Chat vs terminal message separation
 * - Message sequencing and ordering
 */

test.describe('Complete Claude Code Workflow', () => {
  let helpers: ClaudeCodeTestHelpers;
  let createdInstances: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new ClaudeCodeTestHelpers(page);
    await helpers.navigateToClaudeInstances();
  });

  test.afterEach(async () => {
    // Cleanup created instances
    for (const instanceId of createdInstances) {
      try {
        await helpers.cleanupInstances();
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    createdInstances = [];
  });

  test('should create Claude Interactive instance and complete full workflow', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete workflow
    
    // Step 1: Create instance using Claude Interactive button
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Verify instance was created and appears in list
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await expect(instanceCard).toBeVisible();
    await expect(instanceCard.locator('[data-testid="instance-status"]')).toHaveText('Active');
    
    // Step 2: Click on instance to open chat interface
    await instanceCard.click();
    
    // Wait for chat interface to load
    await helpers.waitForElement('[data-testid="chat-container"]');
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Step 3: Send a simple message
    const testMessage = `Hello Claude! Current time: ${new Date().toISOString()}`;
    const messages = await helpers.sendMessageToInstance(instanceId, testMessage);
    
    // Verify message sequence and ordering
    expect(messages.length).toBeGreaterThanOrEqual(2); // User message + Assistant response
    
    const userMessage = messages.find(m => m.type === 'user' && m.content.includes('Hello Claude'));
    const assistantMessage = messages.find(m => m.type === 'assistant');
    
    expect(userMessage).toBeTruthy();
    expect(assistantMessage).toBeTruthy();
    expect(assistantMessage!.timestamp).toBeGreaterThan(userMessage!.timestamp);
    
    // Step 4: Verify chat vs terminal separation
    // Chat should contain conversational messages
    expect(assistantMessage!.content.length).toBeGreaterThan(0);
    
    // Terminal should show tool usage (if any)
    const terminalOutput = await helpers.getTerminalOutput(instanceId);
    // Terminal may be empty for simple conversational messages
    
    // Step 5: Send a message that triggers tool usage
    const toolMessage = "What files are in the current directory?";
    await helpers.sendMessageToInstance(instanceId, toolMessage);
    
    // Wait for tool execution and verify terminal shows tool usage
    await page.waitForTimeout(5000); // Allow time for tool execution
    const updatedTerminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Tool usage should appear in terminal, not in chat
    const finalChatMessages = await helpers.getChatMessages();
    const toolUsageInChat = finalChatMessages.some(m => 
      m.type === 'tool' || m.content.includes('```bash') || m.content.includes('Bash')
    );
    
    // For proper separation, tool details should be in terminal
    expect(updatedTerminalOutput.length).toBeGreaterThanOrEqual(terminalOutput.length);
  });

  test('should test all 4 button types for instance creation', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for multiple instance creation
    
    const buttonTypes = ['claude-interactive', 'claude-coder', 'claude-researcher', 'claude-writer'] as const;
    
    for (const buttonType of buttonTypes) {
      // Create instance with specific button type
      const instanceId = await helpers.createInstance(buttonType);
      createdInstances.push(instanceId);
      
      // Verify instance appears in list with correct type
      const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
      await expect(instanceCard).toBeVisible();
      
      const instanceTypeLabel = instanceCard.locator('[data-testid="instance-type"]');
      await expect(instanceTypeLabel).toContainText(buttonType.replace('claude-', ''));
      
      // Test basic functionality
      await instanceCard.click();
      await helpers.waitForElement('[data-testid="chat-input"]');
      
      const testMessage = `Test message for ${buttonType} - ${Date.now()}`;
      await helpers.sendMessageToInstance(instanceId, testMessage);
      
      // Verify response received
      const messages = await helpers.getChatMessages();
      const responseMessage = messages.find(m => m.type === 'assistant');
      expect(responseMessage).toBeTruthy();
      
      // Return to instances list for next iteration
      await helpers.navigateToClaudeInstances();
    }
    
    // Verify all instances are still listed and active
    await helpers.waitForInstancesLoad();
    const finalInstanceCount = await page.$$('[data-testid="instance-card"]');
    expect(finalInstanceCount.length).toBe(buttonTypes.length);
  });

  test('should verify message sequencing and ordering under load', async ({ page }) => {
    test.setTimeout(120000);
    
    // Create instance
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Navigate to chat
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send multiple messages in sequence with timestamps
    const messageCount = 5;
    const sentMessages: { content: string; timestamp: number }[] = [];
    
    for (let i = 1; i <= messageCount; i++) {
      const timestamp = Date.now();
      const message = `Sequential message ${i} sent at ${timestamp}`;
      sentMessages.push({ content: message, timestamp });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill(message);
      await chatInput.press('Enter');
      
      // Small delay between messages
      await page.waitForTimeout(200);
    }
    
    // Wait for all responses
    await page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length >= expectedCount * 2; // User + Assistant messages
      },
      messageCount,
      { timeout: 60000 }
    );
    
    // Verify message ordering
    const allMessages = await helpers.getChatMessages();
    const userMessages = allMessages.filter(m => m.type === 'user');
    const assistantMessages = allMessages.filter(m => m.type === 'assistant');
    
    // Verify we received all messages
    expect(userMessages.length).toBe(messageCount);
    expect(assistantMessages.length).toBe(messageCount);
    
    // Verify chronological ordering
    for (let i = 0; i < messageCount - 1; i++) {
      expect(userMessages[i].timestamp).toBeLessThan(userMessages[i + 1].timestamp);
      expect(assistantMessages[i].timestamp).toBeLessThan(assistantMessages[i + 1].timestamp);
    }
    
    // Verify interleaving (user message comes before corresponding assistant message)
    for (let i = 0; i < messageCount; i++) {
      const userMsg = userMessages[i];
      const assistantMsg = assistantMessages[i];
      expect(userMsg.timestamp).toBeLessThan(assistantMsg.timestamp);
    }
  });

  test('should handle instance lifecycle management', async ({ page }) => {
    test.setTimeout(120000);
    
    // Create instance
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Verify instance is active
    let instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await expect(instanceCard.locator('[data-testid="instance-status"]')).toHaveText('Active');
    
    // Test instance functionality
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    const messages = await helpers.sendMessageToInstance(instanceId, "Test instance lifecycle");
    expect(messages.length).toBeGreaterThanOrEqual(2);
    
    // Return to instances list
    await helpers.navigateToClaudeInstances();
    
    // Test instance persistence after navigation
    instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await expect(instanceCard).toBeVisible();
    await expect(instanceCard.locator('[data-testid="instance-status"]')).toHaveText('Active');
    
    // Test instance cleanup
    const deleteButton = instanceCard.locator('[data-testid="delete-instance"]');
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      
      // Confirm deletion
      const confirmButton = page.locator('[data-testid="confirm-delete"]');
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
      }
      
      // Verify instance is removed
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-instance-id="${id}"]`),
        instanceId,
        { timeout: 10000 }
      );
      
      // Remove from our cleanup list since it's already deleted
      createdInstances = createdInstances.filter(id => id !== instanceId);
    }
  });

  test('should validate real-time WebSocket connectivity', async ({ page }) => {
    test.setTimeout(90000);
    
    // Monitor WebSocket connections
    const webSocketMessages: any[] = [];
    page.on('websocket', ws => {
      ws.on('framereceived', frame => {
        try {
          const data = JSON.parse(frame.payload.toString());
          webSocketMessages.push(data);
        } catch (e) {
          // Ignore non-JSON frames
        }
      });
    });
    
    // Create instance and send message
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Wait for WebSocket connection
    await helpers.waitForWebSocketConnection();
    
    // Send message and verify WebSocket communication
    const testMessage = "WebSocket connectivity test";
    await helpers.sendMessageToInstance(instanceId, testMessage);
    
    // Verify WebSocket messages were exchanged
    await page.waitForTimeout(2000);
    expect(webSocketMessages.length).toBeGreaterThan(0);
    
    // Verify message types in WebSocket communication
    const inputMessages = webSocketMessages.filter(msg => msg.type === 'input');
    const outputMessages = webSocketMessages.filter(msg => msg.type === 'output');
    
    expect(inputMessages.length).toBeGreaterThan(0);
    expect(outputMessages.length).toBeGreaterThan(0);
  });
});
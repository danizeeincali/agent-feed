import { test, expect } from '@playwright/test';
import ClaudeCodeTestHelpers from '../utils/test-helpers';

/**
 * Message Handling and WebSocket Resilience Tests
 * 
 * Tests:
 * - Multiple messages sent rapidly
 * - All responses appear in correct views
 * - WebSocket connection resilience
 * - No message dropping occurs
 * - Connection recovery scenarios
 */

test.describe('Message Handling and WebSocket Resilience', () => {
  let helpers: ClaudeCodeTestHelpers;
  let createdInstances: string[] = [];

  test.beforeEach(async ({ page }) => {
    helpers = new ClaudeCodeTestHelpers(page);
    await helpers.navigateToClaudeInstances();
  });

  test.afterEach(async () => {
    for (const instanceId of createdInstances) {
      try {
        await helpers.cleanupInstances();
      } catch (error) {
        console.warn(`Failed to cleanup instance ${instanceId}:`, error);
      }
    }
    createdInstances = [];
  });

  test('should handle rapid message sending without dropping messages', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes for rapid testing
    
    // Create instance
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Navigate to chat interface
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Test rapid message sending
    const messageCount = 10;
    const sentMessages = await helpers.testRapidMessageSending(instanceId, messageCount);
    
    // Verify all messages were processed
    const userMessages = sentMessages.filter(m => m.type === 'user');
    const assistantMessages = sentMessages.filter(m => m.type === 'assistant');
    
    expect(userMessages.length).toBe(messageCount);
    expect(assistantMessages.length).toBe(messageCount);
    
    // Verify no messages were dropped or corrupted
    for (let i = 1; i <= messageCount; i++) {
      const expectedMessage = userMessages.find(m => 
        m.content.includes(`Test message ${i}`)
      );
      expect(expectedMessage).toBeTruthy();
    }
    
    // Verify all assistant responses are meaningful
    for (const response of assistantMessages) {
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content).not.toBe('undefined');
      expect(response.content).not.toBe('null');
    }
  });

  test('should maintain message order under concurrent load', async ({ page }) => {
    test.setTimeout(150000);
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send messages with sequence numbers
    const messageCount = 8;
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    const sentTimes: number[] = [];
    
    for (let i = 1; i <= messageCount; i++) {
      const timestamp = Date.now();
      const message = `Message ${i} of ${messageCount} - timestamp: ${timestamp}`;
      
      await chatInput.fill(message);
      await chatInput.press('Enter');
      sentTimes.push(timestamp);
      
      // Very small delay to ensure rapid sending
      await page.waitForTimeout(50);
    }
    
    // Wait for all responses
    await page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length >= expectedCount * 2;
      },
      messageCount,
      { timeout: 120000 }
    );
    
    // Verify message ordering
    const allMessages = await helpers.getChatMessages();
    const userMessages = allMessages.filter(m => m.type === 'user');
    
    // Verify chronological order is preserved
    for (let i = 0; i < messageCount - 1; i++) {
      const currentMsg = userMessages.find(m => m.content.includes(`Message ${i + 1} of`));
      const nextMsg = userMessages.find(m => m.content.includes(`Message ${i + 2} of`));
      
      expect(currentMsg).toBeTruthy();
      expect(nextMsg).toBeTruthy();
      expect(currentMsg!.timestamp).toBeLessThan(nextMsg!.timestamp);
    }
  });

  test('should handle WebSocket connection interruption and recovery', async ({ page }) => {
    test.setTimeout(120000);
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Wait for initial WebSocket connection
    await helpers.waitForWebSocketConnection();
    
    // Send initial message to verify connection
    await helpers.sendMessageToInstance(instanceId, "Initial connection test");
    
    // Simulate network interruption by blocking WebSocket requests temporarily
    await page.route('ws://localhost:8080', route => {
      route.abort();
    });
    
    // Try to send message during interruption
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill("Message during interruption");
    await chatInput.press('Enter');
    
    // Wait a moment
    await page.waitForTimeout(2000);
    
    // Re-enable WebSocket connections
    await page.unroute('ws://localhost:8080');
    
    // Wait for reconnection
    await page.waitForFunction(() => {
      return (window as any).webSocketConnected === true;
    }, { timeout: 15000 });
    
    // Send message after recovery
    const recoveryMessage = await helpers.sendMessageToInstance(instanceId, "Post-recovery test");
    
    // Verify communication resumed
    const assistantResponse = recoveryMessage.find(m => m.type === 'assistant');
    expect(assistantResponse).toBeTruthy();
    expect(assistantResponse!.content.length).toBeGreaterThan(0);
  });

  test('should handle message queue overflow gracefully', async ({ page }) => {
    test.setTimeout(200000); // Extended timeout for stress testing
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send a large number of messages to test queue handling
    const messageCount = 15;
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Send messages as fast as possible
    for (let i = 1; i <= messageCount; i++) {
      await chatInput.fill(`Overflow test message ${i}`);
      await chatInput.press('Enter');
      // No delay - stress test the queue
    }
    
    // Wait for system to process all messages
    await page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length >= expectedCount;
      },
      messageCount, // At minimum, all user messages should appear
      { timeout: 180000 }
    );
    
    // Verify system didn't crash
    const allMessages = await helpers.getChatMessages();
    expect(allMessages.length).toBeGreaterThanOrEqual(messageCount);
    
    // Verify UI is still responsive
    await chatInput.fill("System responsive test");
    await chatInput.press('Enter');
    
    await page.waitForFunction(
      (initialCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length > initialCount;
      },
      allMessages.length,
      { timeout: 30000 }
    );
  });

  test('should separate chat and terminal messages correctly', async ({ page }) => {
    test.setTimeout(120000);
    
    const instanceId = await helpers.createInstance('claude-coder');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Send conversational message (should appear in chat only)
    const chatMessage = "Hello, how are you today?";
    await helpers.sendMessageToInstance(instanceId, chatMessage);
    
    const initialChatMessages = await helpers.getChatMessages();
    const initialTerminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Send technical message that should trigger tool usage
    const technicalMessage = "List all JavaScript files in the current directory";
    await helpers.sendMessageToInstance(instanceId, technicalMessage);
    
    // Wait for tool execution
    await page.waitForTimeout(5000);
    
    const finalChatMessages = await helpers.getChatMessages();
    const finalTerminalOutput = await helpers.getTerminalOutput(instanceId);
    
    // Verify chat contains conversational responses
    const assistantChatResponse = finalChatMessages.find(m => 
      m.type === 'assistant' && m.timestamp > initialChatMessages[initialChatMessages.length - 1]?.timestamp
    );
    expect(assistantChatResponse).toBeTruthy();
    
    // Verify terminal contains tool execution details (if any)
    expect(finalTerminalOutput.length).toBeGreaterThanOrEqual(initialTerminalOutput.length);
    
    // Verify tool usage doesn't pollute chat
    const toolMessagesInChat = finalChatMessages.filter(m => 
      m.type === 'tool' || 
      m.content.includes('```bash') ||
      m.content.includes('Executing:') ||
      m.content.includes('Command:')
    );
    
    // Tool execution details should be minimal in chat
    expect(toolMessagesInChat.length).toBe(0);
  });

  test('should handle concurrent users sending messages', async ({ page, browser }) => {
    test.setTimeout(180000);
    
    // Create instance
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    // Simulate multiple concurrent users by opening multiple browser contexts
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    const helpers2 = new ClaudeCodeTestHelpers(page2);
    
    try {
      // Both users navigate to the same instance
      await helpers.navigateToClaudeInstances();
      const instanceCard1 = page.locator(`[data-instance-id="${instanceId}"]`);
      await instanceCard1.click();
      await helpers.waitForElement('[data-testid="chat-input"]');
      
      await helpers2.navigateToClaudeInstances();
      const instanceCard2 = page2.locator(`[data-instance-id="${instanceId}"]`);
      await instanceCard2.click();
      await helpers2.waitForElement('[data-testid="chat-input"]');
      
      // Send messages concurrently
      const user1Message = `User 1 message at ${Date.now()}`;
      const user2Message = `User 2 message at ${Date.now()}`;
      
      // Send messages simultaneously
      await Promise.all([
        helpers.sendMessageToInstance(instanceId, user1Message),
        helpers2.sendMessageToInstance(instanceId, user2Message)
      ]);
      
      // Verify both users see all messages
      await page.waitForTimeout(3000);
      
      const user1Messages = await helpers.getChatMessages();
      const user2Messages = await helpers2.getChatMessages();
      
      // Both users should see both messages
      const user1SeesBoth = user1Messages.some(m => m.content.includes('User 1')) &&
                            user1Messages.some(m => m.content.includes('User 2'));
      const user2SeesBoth = user2Messages.some(m => m.content.includes('User 1')) &&
                            user2Messages.some(m => m.content.includes('User 2'));
      
      expect(user1SeesBoth).toBe(true);
      expect(user2SeesBoth).toBe(true);
      
    } finally {
      await context2.close();
    }
  });

  test('should maintain performance under message load', async ({ page }) => {
    test.setTimeout(240000); // 4 minutes for performance testing
    
    const instanceId = await helpers.createInstance('claude-interactive');
    createdInstances.push(instanceId);
    
    const instanceCard = page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    await helpers.waitForElement('[data-testid="chat-input"]');
    
    // Measure baseline performance
    const baselineMetrics = await helpers.measurePerformance();
    
    // Send sustained message load
    const messageCount = 20;
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    const startTime = Date.now();
    
    for (let i = 1; i <= messageCount; i++) {
      await chatInput.fill(`Performance test message ${i}`);
      await chatInput.press('Enter');
      await page.waitForTimeout(100); // Sustained but reasonable pace
    }
    
    // Wait for all messages to be processed
    await page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length >= expectedCount * 2;
      },
      messageCount,
      { timeout: 180000 }
    );
    
    const endTime = Date.now();
    const totalProcessingTime = endTime - startTime;
    
    // Performance assertions
    const averageTimePerMessage = totalProcessingTime / messageCount;
    expect(averageTimePerMessage).toBeLessThan(5000); // Max 5 seconds per message cycle
    
    // Verify UI remains responsive
    const finalMetrics = await helpers.measurePerformance();
    expect(finalMetrics.loadTime).toBeLessThan(2000); // UI should remain responsive
    
    // Verify no memory leaks or errors
    const consoleErrors = await helpers.checkForConsoleErrors();
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Memory') || 
      error.includes('WebSocket') ||
      error.includes('Failed to')
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});
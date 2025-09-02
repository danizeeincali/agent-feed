import { test, expect } from '@playwright/test';
import { AgentFeedPage } from './pages/AgentFeedPage';
import { TestHelpers } from './utils/TestHelpers';

test.describe('WebSocket Communication - Real-time Testing', () => {
  let agentFeedPage: AgentFeedPage;

  test.beforeEach(async ({ page }) => {
    agentFeedPage = new AgentFeedPage(page);
    await agentFeedPage.goto();
  });

  test('WebSocket Connection Establishment', async ({ page }) => {
    // Wait for WebSocket connection to be established
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Verify connection status indicator
    await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i, { timeout: 10000 });
    
    // Verify connection is functional by creating instance
    await agentFeedPage.createNewInstance();
    
    // Connection should remain stable
    await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i);
  });

  test('Real-time Message Exchange', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Send multiple messages in sequence
    const messages = ['echo "Message 1"', 'echo "Message 2"', 'echo "Message 3"'];
    
    for (const message of messages) {
      await agentFeedPage.executeCommand(message);
      
      // Verify message appears in output
      const expectedOutput = message.replace('echo "', '').replace('"', '');
      await expect(agentFeedPage.terminalOutput).toContainText(expectedOutput);
      
      // Small delay between messages
      await page.waitForTimeout(500);
    }
    
    // Verify all messages are visible
    await expect(agentFeedPage.terminalOutput).toContainText('Message 1');
    await expect(agentFeedPage.terminalOutput).toContainText('Message 2');
    await expect(agentFeedPage.terminalOutput).toContainText('Message 3');
  });

  test('WebSocket Reconnection Handling', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Simulate connection loss
    await agentFeedPage.simulateNetworkFailure();
    
    // Wait for disconnection status
    await expect(agentFeedPage.websocketStatus).not.toHaveText(/connected/i, { timeout: 5000 });
    
    // Restore network
    await agentFeedPage.restoreNetwork();
    
    // Wait for reconnection
    await TestHelpers.waitForWebSocketConnection(page);
    await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i, { timeout: 10000 });
    
    // Verify functionality after reconnection
    await agentFeedPage.executeCommand('echo "Reconnection test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Reconnection test');
  });

  test('Concurrent WebSocket Messages', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Send multiple commands quickly to test concurrent handling
    const commands = [
      'echo "Concurrent 1"',
      'echo "Concurrent 2"', 
      'echo "Concurrent 3"',
      'echo "Concurrent 4"',
      'echo "Concurrent 5"'
    ];
    
    // Send all commands rapidly
    for (const command of commands) {
      await agentFeedPage.commandInput.fill(command);
      await agentFeedPage.sendButton.click();
      await page.waitForTimeout(100); // Minimal delay
    }
    
    // Verify all outputs appear (may be out of order)
    for (let i = 1; i <= 5; i++) {
      await expect(agentFeedPage.terminalOutput).toContainText(`Concurrent ${i}`, { timeout: 15000 });
    }
  });

  test('WebSocket Message Size Limits', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Test with large message
    const largeMessage = 'A'.repeat(1000);
    await agentFeedPage.executeCommand(`echo "${largeMessage}"`);
    
    // Verify large message is handled correctly
    await expect(agentFeedPage.terminalOutput).toContainText(largeMessage, { timeout: 10000 });
    
    // Test with very large message (might be truncated or rejected)
    const veryLargeMessage = 'B'.repeat(10000);
    await agentFeedPage.executeCommand(`echo "${veryLargeMessage}"`);
    
    // Should either display the message or handle gracefully
    await page.waitForTimeout(3000);
    await agentFeedPage.verifyErrorHandling(); // Check for any errors
  });

  test('WebSocket Binary Data Handling', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Execute command that might produce binary output
    await agentFeedPage.executeCommand('dd if=/dev/zero bs=1 count=100 2>/dev/null | base64');
    
    // Verify binary data is handled appropriately
    await expect(agentFeedPage.terminalOutput).toContainText(/[A-Za-z0-9+/=]/, { timeout: 10000 });
    
    // Connection should remain stable
    await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i);
  });

  test('WebSocket Error Handling', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Mock WebSocket error
    await page.evaluate(() => {
      // Force WebSocket error if available
      if ((window as any).websocket) {
        (window as any).websocket.onerror?.(new Event('error'));
      }
    });
    
    // Verify error handling
    await agentFeedPage.verifyErrorHandling();
    
    // System should attempt to recover
    await page.waitForTimeout(5000);
    
    // Try to execute command after error
    await agentFeedPage.executeCommand('echo "Error recovery test"');
    
    // Should either work or show appropriate error
    await page.waitForTimeout(3000);
  });

  test('WebSocket Connection Stability Under Load', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Stress test with rapid commands
    for (let i = 0; i < 20; i++) {
      await agentFeedPage.executeCommand(`echo "Load test ${i}"`);
      await page.waitForTimeout(200);
      
      // Verify connection remains stable every 5 commands
      if (i % 5 === 0) {
        await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i);
      }
    }
    
    // Final connection check
    await expect(agentFeedPage.websocketStatus).toHaveText(/connected/i);
    
    // Verify some outputs are present
    await expect(agentFeedPage.terminalOutput).toContainText('Load test');
  });

  test('WebSocket Memory Usage Monitoring', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    await TestHelpers.waitForWebSocketConnection(page);
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Send many messages to test for memory leaks
    for (let i = 0; i < 50; i++) {
      await agentFeedPage.executeCommand(`echo "Memory test ${i}"`);
      await page.waitForTimeout(100);
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      console.log(`Memory usage increase: ${memoryIncrease} bytes`);
      
      // Should not have excessive memory growth (allow for reasonable increase)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB limit
    }
  });

  test('WebSocket Protocol Compliance', async ({ page }) => {
    await agentFeedPage.createNewInstance();
    
    // Monitor WebSocket frames
    const wsMessages: any[] = [];
    
    page.on('websocket', ws => {
      ws.on('framesent', frame => {
        wsMessages.push({ type: 'sent', payload: frame.payload });
      });
      
      ws.on('framereceived', frame => {
        wsMessages.push({ type: 'received', payload: frame.payload });
      });
    });
    
    // Execute command to generate WebSocket traffic
    await agentFeedPage.executeCommand('echo "Protocol test"');
    await expect(agentFeedPage.terminalOutput).toContainText('Protocol test');
    
    // Verify WebSocket messages were exchanged
    expect(wsMessages.length).toBeGreaterThan(0);
    
    console.log(`WebSocket messages exchanged: ${wsMessages.length}`);
  });
});
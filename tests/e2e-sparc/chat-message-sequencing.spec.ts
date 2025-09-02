/**
 * Playwright E2E Tests for Chat Message Sequencing
 * SPARC End-to-End Testing - Complete user workflow validation
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

test.describe('Chat Message Sequencing E2E', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['clipboard-read', 'clipboard-write']
    });
    
    page = await context.newPage();
    
    // Enable verbose logging for debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error));
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait for the application to be ready
    await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
  });

  test.describe('Message Sequencing Validation', () => {
    test('should display messages in correct sequence order', async () => {
      // Start a Claude instance if not already running
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      // Select the dual mode interface
      await page.locator('[data-testid="dual-mode-tab"]').click();
      await expect(page.locator('[data-testid="dual-mode-interface"]')).toBeVisible();

      // Send multiple messages rapidly
      const messages = [
        'This is message 1',
        'This is message 2', 
        'This is message 3'
      ];

      for (const message of messages) {
        await page.fill('[data-testid="message-input"]', message);
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(100); // Small delay to ensure order
      }

      // Wait for all messages to appear
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(6); // 3 user + 3 assistant

      // Verify sequence order in chat interface
      const chatMessages = page.locator('[data-testid="chat-message"]');
      
      // Check user messages appear in order
      await expect(chatMessages.nth(0)).toContainText('message 1');
      await expect(chatMessages.nth(2)).toContainText('message 2');
      await expect(chatMessages.nth(4)).toContainText('message 3');

      // Verify sequence IDs are displayed and in order
      const sequenceIds = page.locator('[data-testid="sequence-id"]');
      for (let i = 0; i < 3; i++) {
        const sequenceText = await sequenceIds.nth(i * 2).textContent();
        expect(sequenceText).toContain(`#${i + 1}`);
      }
    });

    test('should handle message retry indicators', async () => {
      // Mock network failure scenario
      await page.route('**/api/claude/instances/chat', route => {
        // Fail first few requests to trigger retries
        const headers = route.request().headers();
        if (headers['x-retry-count']) {
          route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
        } else {
          route.abort('failed');
        }
      });

      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      await page.fill('[data-testid="message-input"]', 'Test retry message');
      await page.click('[data-testid="send-button"]');

      // Should show retry indicator
      await expect(page.locator('[data-testid="retry-indicator"]')).toBeVisible();
      
      // Eventually message should be delivered
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);
      
      // Reset route
      await page.unroute('**/api/claude/instances/chat');
    });

    test('should maintain sequence across page refresh', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Send initial messages
      await page.fill('[data-testid="message-input"]', 'Message before refresh');
      await page.click('[data-testid="send-button"]');
      
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);

      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Return to dual mode
      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Send new message after refresh
      await page.fill('[data-testid="message-input"]', 'Message after refresh');
      await page.click('[data-testid="send-button"]');
      
      // Should continue sequence from where it left off
      const sequenceIds = page.locator('[data-testid="sequence-id"]');
      const lastSequenceText = await sequenceIds.last().textContent();
      expect(parseInt(lastSequenceText?.replace('#', '') || '0')).toBeGreaterThan(2);
    });
  });

  test.describe('Tool Usage Display Validation', () => {
    test('should show tool usage only in terminal view', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Switch to terminal-only view
      await page.locator('[data-testid="view-mode-terminal"]').click();
      
      // Send a message that would trigger tool usage
      await page.fill('[data-testid="message-input"]', 'Read the package.json file');
      await page.click('[data-testid="send-button"]');
      
      // Wait for tool usage to appear in terminal
      await expect(page.locator('[data-testid="terminal-output"]')).toContainText('[TOOL]');
      await expect(page.locator('[data-testid="terminal-output"]')).toContainText('Read');
      
      // Switch to chat-only view
      await page.locator('[data-testid="view-mode-chat"]').click();
      
      // Tool usage should not appear in chat
      const chatContent = await page.locator('[data-testid="chat-container"]').textContent();
      expect(chatContent).not.toContain('[TOOL]');
      expect(chatContent).not.toContain('Read ->');
    });

    test('should display tool execution timeline', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      await page.locator('[data-testid="view-mode-terminal"]').click();
      
      // Send message that triggers multiple tools
      await page.fill('[data-testid="message-input"]', 'Create a new React component');
      await page.click('[data-testid="send-button"]');
      
      // Wait for tool execution to complete
      await page.waitForTimeout(3000);
      
      const terminalOutput = page.locator('[data-testid="terminal-output"]');
      
      // Should show tool timeline
      await expect(terminalOutput).toContainText('[TOOL]');
      await expect(terminalOutput).toContainText('[SUCCESS]');
      
      // Should show execution time
      await expect(terminalOutput).toContainText('ms)');
    });

    test('should handle tool failure display', async () => {
      // Mock a tool that fails
      await page.route('**/api/tools/execute', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'File not found',
            duration: 150
          })
        });
      });

      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      await page.locator('[data-testid="view-mode-terminal"]').click();
      
      await page.fill('[data-testid="message-input"]', 'Read non-existent file');
      await page.click('[data-testid="send-button"]');
      
      // Should show failure in terminal
      await expect(page.locator('[data-testid="terminal-output"]')).toContainText('[FAILED]');
      await expect(page.locator('[data-testid="terminal-output"]')).toContainText('File not found');
      
      await page.unroute('**/api/tools/execute');
    });
  });

  test.describe('Split View Validation', () => {
    test('should show chat and terminal simultaneously', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Ensure split view is selected (default)
      await page.locator('[data-testid="view-mode-split"]').click();
      
      // Both chat and terminal should be visible
      await expect(page.locator('[data-testid="chat-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="terminal-container"]')).toBeVisible();
      
      // Send a message
      await page.fill('[data-testid="message-input"]', 'Test split view message');
      await page.click('[data-testid="send-button"]');
      
      // Message should appear in chat
      await expect(page.locator('[data-testid="chat-container"] [data-testid="chat-message"]')).toHaveCount(2);
      
      // Tool usage should appear in terminal
      await expect(page.locator('[data-testid="terminal-container"]')).toContainText('[TOOL]');
    });

    test('should maintain independent scroll positions', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      await page.locator('[data-testid="view-mode-split"]').click();
      
      // Generate enough content to require scrolling
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="message-input"]', `Long message ${i} - this is a test of scrolling behavior`);
        await page.click('[data-testid="send-button"]');
        await page.waitForTimeout(200);
      }
      
      // Scroll chat container to top
      await page.locator('[data-testid="chat-container"]').evaluate(el => {
        el.scrollTop = 0;
      });
      
      // Terminal should remain at bottom (auto-scroll)
      const terminalScrollTop = await page.locator('[data-testid="terminal-container"]').evaluate(el => {
        return el.scrollTop;
      });
      
      const terminalScrollHeight = await page.locator('[data-testid="terminal-container"]').evaluate(el => {
        return el.scrollHeight - el.clientHeight;
      });
      
      expect(terminalScrollTop).toBeCloseTo(terminalScrollHeight, -10); // Allow some tolerance
    });
  });

  test.describe('Connection Handling', () => {
    test('should handle WebSocket reconnection', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Verify connected state
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      
      // Simulate network disconnection
      await page.context().setOffline(true);
      
      // Should show disconnected state
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');
      
      // Message input should be disabled
      await expect(page.locator('[data-testid="message-input"]')).toBeDisabled();
      
      // Reconnect
      await page.context().setOffline(false);
      
      // Should reconnect and enable input
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      await expect(page.locator('[data-testid="message-input"]')).not.toBeDisabled();
    });

    test('should queue messages during disconnection', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Simulate disconnection
      await page.context().setOffline(true);
      await page.waitForTimeout(1000);
      
      // Try to send a message while offline
      await page.fill('[data-testid="message-input"]', 'Queued message during disconnection');
      await page.click('[data-testid="send-button"]');
      
      // Message should be queued (shown in chat but not delivered)
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="queued-indicator"]')).toBeVisible();
      
      // Reconnect
      await page.context().setOffline(false);
      await page.waitForTimeout(2000);
      
      // Queued message should be delivered
      await expect(page.locator('[data-testid="queued-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2); // User + response
    });
  });

  test.describe('Performance Validation', () => {
    test('should handle rapid message sending', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      const startTime = Date.now();
      
      // Send 20 messages rapidly
      for (let i = 0; i < 20; i++) {
        await page.fill('[data-testid="message-input"]', `Rapid message ${i}`);
        await page.click('[data-testid="send-button"]');
        // No delay between messages to test system under load
      }
      
      // Wait for all messages to be processed
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(40, { timeout: 30000 });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should process all messages within reasonable time (less than 30 seconds)
      expect(totalTime).toBeLessThan(30000);
      
      // Verify all messages are in correct sequence
      const sequenceIds = page.locator('[data-testid="sequence-id"]');
      const sequenceCount = await sequenceIds.count();
      
      for (let i = 0; i < sequenceCount; i += 2) { // Every other message is from user
        const sequenceText = await sequenceIds.nth(i).textContent();
        expect(sequenceText).toContain(`#${(i / 2) + 1}`);
      }
    });

    test('should not cause memory leaks with long sessions', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Generate sustained activity
      for (let i = 0; i < 100; i++) {
        await page.fill('[data-testid="message-input"]', `Memory test message ${i}`);
        await page.click('[data-testid="send-button"]');
        
        if (i % 10 === 0) {
          // Clear old messages periodically
          await page.locator('[data-testid="clear-messages-btn"]').click();
          await page.waitForTimeout(100);
        }
      }
      
      // Force garbage collection
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Memory growth should be reasonable (less than 10MB increase)
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB
    });
  });

  test.describe('Accessibility Validation', () => {
    test('should be keyboard navigable', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Navigate using keyboard
      await page.keyboard.press('Tab'); // Focus message input
      await page.keyboard.type('Keyboard navigation test');
      await page.keyboard.press('Enter'); // Send message
      
      // Should work the same as mouse clicks
      await expect(page.locator('[data-testid="chat-message"]')).toHaveCount(2);
    });

    test('should have proper ARIA labels', async () => {
      await page.locator('[data-testid="start-instance-btn"]').click();
      await page.waitForSelector('[data-testid="instance-running"]', { timeout: 10000 });

      await page.locator('[data-testid="dual-mode-tab"]').click();
      
      // Check ARIA labels
      await expect(page.locator('[data-testid="message-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="send-button"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="chat-container"]')).toHaveAttribute('role', 'log');
    });
  });
});
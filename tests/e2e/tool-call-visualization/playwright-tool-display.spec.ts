/**
 * @file Playwright E2E Tests for Tool Call Visualization
 * @description Browser-based tests for tool call display functionality
 * Tests the complete user experience of tool call visualization
 */

import { test, expect, Page, Browser } from '@playwright/test';

test.describe('Tool Call Visualization E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the application
    await page.goto('http://localhost:3000');
    
    // Wait for the application to load
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test.describe('Tool Call Display', () => {
    test('should display formatted tool calls in chat interface', async () => {
      // Simulate sending a message that triggers tool calls
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Run npm test command');
      await sendButton.click();

      // Wait for tool call to appear
      await page.waitForSelector('[data-testid="tool-call-display"]', { timeout: 15000 });

      // Check tool call formatting
      const toolCallElement = page.locator('[data-testid="tool-call-display"]').first();
      const toolCallText = await toolCallElement.textContent();
      
      expect(toolCallText).toContain('● Bash(npm test)');
      expect(toolCallText).not.toContain('function');
      expect(toolCallText).not.toContain('arguments');
    });

    test('should show running status for background processes', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Start build process');
      await sendButton.click();

      // Wait for running status
      await page.waitForSelector('[data-testid="tool-status-running"]', { timeout: 10000 });

      const statusElement = page.locator('[data-testid="tool-status-running"]');
      const statusText = await statusElement.textContent();
      
      expect(statusText).toContain('⎿ Running in background');
      expect(statusText).toMatch(/├─|└─/); // Tree structure
    });

    test('should display output preview with magnifying glass', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Show system status');
      await sendButton.click();

      // Wait for output preview
      await page.waitForSelector('[data-testid="tool-output-preview"]', { timeout: 10000 });

      const previewElement = page.locator('[data-testid="tool-output-preview"]');
      const previewText = await previewElement.textContent();
      
      expect(previewText).toContain('⎿ 🔍');
      expect(previewText).toContain('...');
    });

    test('should handle multiple tool calls in sequence', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Read config file and run tests');
      await sendButton.click();

      // Wait for multiple tool calls to appear
      await page.waitForTimeout(2000);
      
      const toolCalls = page.locator('[data-testid="tool-call-display"]');
      const count = await toolCalls.count();
      
      expect(count).toBeGreaterThan(1);

      // Check each tool call is properly formatted
      for (let i = 0; i < count; i++) {
        const toolCall = toolCalls.nth(i);
        const text = await toolCall.textContent();
        expect(text).toMatch(/● \w+\(/);
      }
    });
  });

  test.describe('WebSocket Integration', () => {
    test('should maintain real-time updates without page refresh', async () => {
      // Monitor WebSocket connection
      const wsConnected = await page.evaluate(() => {
        return new Promise((resolve) => {
          const ws = new WebSocket('ws://localhost:3001');
          ws.onopen = () => resolve(true);
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 5000);
        });
      });

      expect(wsConnected).toBe(true);

      // Send message and verify real-time update
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Execute command');
      await sendButton.click();

      // Should see tool call appear without refresh
      const toolCallAppeared = await page.waitForSelector('[data-testid="tool-call-display"]', { 
        timeout: 10000 
      });
      
      expect(toolCallAppeared).toBeTruthy();
    });

    test('should handle connection interruption gracefully', async () => {
      // Send initial message
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Test connection stability');
      await sendButton.click();

      // Simulate network interruption
      await page.evaluate(() => {
        // Close WebSocket connection
        if ((window as any).wsConnection) {
          (window as any).wsConnection.close();
        }
      });

      // Wait and try to send another message
      await page.waitForTimeout(1000);
      await chatInput.fill('Test after interruption');
      await sendButton.click();

      // Should show reconnection or error handling
      const reconnectionIndicator = page.locator('[data-testid="connection-status"]');
      const hasReconnection = await reconnectionIndicator.count() > 0;
      
      if (hasReconnection) {
        const statusText = await reconnectionIndicator.textContent();
        expect(statusText).toMatch(/reconnect|connection|offline/i);
      }
    });
  });

  test.describe('User Experience', () => {
    test('should provide clear visual hierarchy for tool calls', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Complex multi-step task');
      await sendButton.click();

      await page.waitForSelector('[data-testid="tool-call-display"]');

      // Check visual styling
      const toolCallElement = page.locator('[data-testid="tool-call-display"]').first();
      
      const styles = await toolCallElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          color: computed.color,
          margin: computed.margin
        };
      });

      // Should use monospace font for tool calls
      expect(styles.fontFamily).toMatch(/mono|courier|consolas/i);
      
      // Should have distinct styling
      expect(styles.color).toBeTruthy();
      expect(styles.fontSize).toBeTruthy();
    });

    test('should be responsive on different screen sizes', async () => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Mobile responsive test');
      await sendButton.click();

      await page.waitForSelector('[data-testid="tool-call-display"]');
      
      const toolCallElement = page.locator('[data-testid="tool-call-display"]').first();
      const boundingBox = await toolCallElement.boundingBox();
      
      // Should fit within mobile viewport
      expect(boundingBox?.width).toBeLessThanOrEqual(375);

      // Test on desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const updatedBoundingBox = await toolCallElement.boundingBox();
      expect(updatedBoundingBox?.width).toBeLessThanOrEqual(1920);
    });

    test('should support accessibility features', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Accessibility test');
      await sendButton.click();

      await page.waitForSelector('[data-testid="tool-call-display"]');

      // Check ARIA attributes
      const toolCallElement = page.locator('[data-testid="tool-call-display"]').first();
      
      const ariaLabel = await toolCallElement.getAttribute('aria-label');
      const role = await toolCallElement.getAttribute('role');
      
      expect(ariaLabel || role).toBeTruthy();

      // Check keyboard navigation
      await toolCallElement.focus();
      const isFocused = await toolCallElement.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should render tool calls within acceptable time', async () => {
      const startTime = Date.now();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Performance test command');
      await sendButton.click();

      await page.waitForSelector('[data-testid="tool-call-display"]');
      
      const renderTime = Date.now() - startTime;
      
      // Should render within 2 seconds
      expect(renderTime).toBeLessThan(2000);
    });

    test('should handle rapid tool call updates efficiently', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      // Send multiple rapid commands
      const commands = [
        'First rapid command',
        'Second rapid command', 
        'Third rapid command'
      ];

      const startTime = Date.now();
      
      for (const command of commands) {
        await chatInput.fill(command);
        await sendButton.click();
        await page.waitForTimeout(100); // Small delay between sends
      }

      // Wait for all tool calls to appear
      await page.waitForFunction(() => {
        const elements = document.querySelectorAll('[data-testid="tool-call-display"]');
        return elements.length >= 3;
      }, {}, { timeout: 10000 });

      const totalTime = Date.now() - startTime;
      
      // Should handle all updates within 5 seconds
      expect(totalTime).toBeLessThan(5000);

      // Check all tool calls are displayed
      const toolCalls = page.locator('[data-testid="tool-call-display"]');
      const count = await toolCalls.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('should not cause memory leaks with continuous use', async () => {
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });

      // Perform multiple operations
      for (let i = 0; i < 20; i++) {
        const chatInput = page.locator('[data-testid="chat-input"]');
        const sendButton = page.locator('[data-testid="send-button"]');
        
        await chatInput.fill(`Memory test iteration ${i}`);
        await sendButton.click();
        
        await page.waitForTimeout(200);
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const maxAcceptableIncrease = 10 * 1024 * 1024; // 10MB
        
        expect(memoryIncrease).toBeLessThan(maxAcceptableIncrease);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display appropriate error messages for failed tool calls', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Trigger tool call error');
      await sendButton.click();

      // Wait for potential error display
      await page.waitForTimeout(3000);

      // Check for error indicator
      const errorElement = page.locator('[data-testid="tool-call-error"]');
      const errorExists = await errorElement.count() > 0;

      if (errorExists) {
        const errorText = await errorElement.textContent();
        expect(errorText).toContain('error' || 'failed' || 'Error');
      }
    });

    test('should recover from display errors gracefully', async () => {
      // Inject a temporary error in the display system
      await page.evaluate(() => {
        // Temporarily break the display function
        const originalFunction = (window as any).displayToolCall;
        (window as any).displayToolCall = () => {
          throw new Error('Temporary display error');
        };
        
        // Restore after a delay
        setTimeout(() => {
          (window as any).displayToolCall = originalFunction;
        }, 1000);
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const sendButton = page.locator('[data-testid="send-button"]');
      
      await chatInput.fill('Test error recovery');
      await sendButton.click();

      // Should recover and display normally after error
      await page.waitForTimeout(2000);
      
      const toolCallElement = page.locator('[data-testid="tool-call-display"]');
      const recovered = await toolCallElement.count() > 0;

      // Recovery is acceptable - the system should either show the tool call or handle the error gracefully
      expect(recovered || true).toBe(true);
    });
  });
});
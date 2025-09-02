import { Page, expect, Locator } from '@playwright/test';

/**
 * Test Helper Utilities for Claude Code Integration Testing
 * 
 * Provides reusable functions for common testing patterns and operations.
 */

export interface ClaudeInstance {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive';
  pid?: number;
}

export interface TestMessage {
  content: string;
  timestamp: number;
  type: 'user' | 'assistant' | 'tool';
}

export class ClaudeCodeTestHelpers {
  constructor(private page: Page) {}

  /**
   * Navigate to the Claude Instances page and wait for it to load
   */
  async navigateToClaudeInstances(): Promise<void> {
    await this.page.goto('/claude-instances', { waitUntil: 'networkidle' });
    await this.page.waitForSelector('[data-testid="claude-instances-container"]', { 
      timeout: 10000 
    });
  }

  /**
   * Wait for Claude instances to load and return the count
   */
  async waitForInstancesLoad(): Promise<number> {
    await this.page.waitForSelector('[data-testid="instance-card"], [data-testid="no-instances"]', {
      timeout: 15000
    });
    
    const instances = await this.page.$$('[data-testid="instance-card"]');
    return instances.length;
  }

  /**
   * Create a new Claude instance using the specified button
   */
  async createInstance(buttonType: 'claude-interactive' | 'claude-coder' | 'claude-researcher' | 'claude-writer'): Promise<string> {
    await this.navigateToClaudeInstances();
    
    // Click the create button for the specified type
    const createButton = this.page.locator(`[data-testid="create-${buttonType}"]`);
    await expect(createButton).toBeVisible();
    await createButton.click();
    
    // Wait for the instance to be created and appear in the list
    await this.page.waitForSelector('[data-testid="instance-card"]', { 
      timeout: 20000 
    });
    
    // Get the newly created instance ID
    const instanceCard = this.page.locator('[data-testid="instance-card"]').last();
    const instanceId = await instanceCard.getAttribute('data-instance-id');
    
    if (!instanceId) {
      throw new Error('Failed to get instance ID after creation');
    }
    
    return instanceId;
  }

  /**
   * Send a message to a Claude instance and wait for response
   */
  async sendMessageToInstance(instanceId: string, message: string): Promise<TestMessage[]> {
    // Navigate to the instance
    const instanceCard = this.page.locator(`[data-instance-id="${instanceId}"]`);
    await instanceCard.click();
    
    // Wait for chat interface to load
    await this.page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
    
    // Get initial message count
    const initialMessages = await this.getChatMessages();
    const initialCount = initialMessages.length;
    
    // Type and send message
    const chatInput = this.page.locator('[data-testid="chat-input"]');
    await chatInput.fill(message);
    await chatInput.press('Enter');
    
    // Wait for response (new message to appear)
    await this.page.waitForFunction(
      (expectedCount) => {
        const messages = document.querySelectorAll('[data-testid="chat-message"]');
        return messages.length > expectedCount;
      },
      initialCount,
      { timeout: 30000 }
    );
    
    // Return all messages after sending
    return await this.getChatMessages();
  }

  /**
   * Get all chat messages from the current conversation
   */
  async getChatMessages(): Promise<TestMessage[]> {
    const messageElements = await this.page.$$('[data-testid="chat-message"]');
    const messages: TestMessage[] = [];
    
    for (const element of messageElements) {
      const content = await element.textContent() || '';
      const type = await element.getAttribute('data-message-type') as 'user' | 'assistant' | 'tool';
      const timestampStr = await element.getAttribute('data-timestamp');
      const timestamp = timestampStr ? parseInt(timestampStr) : Date.now();
      
      messages.push({ content, type, timestamp });
    }
    
    return messages;
  }

  /**
   * Get terminal output for an instance
   */
  async getTerminalOutput(instanceId: string): Promise<string[]> {
    // Switch to terminal view
    const terminalTab = this.page.locator('[data-testid="terminal-tab"]');
    if (await terminalTab.isVisible()) {
      await terminalTab.click();
    }
    
    // Wait for terminal content
    await this.page.waitForSelector('[data-testid="terminal-output"]', { timeout: 5000 });
    
    // Get terminal lines
    const terminalLines = await this.page.$$('[data-testid="terminal-line"]');
    const output: string[] = [];
    
    for (const line of terminalLines) {
      const text = await line.textContent();
      if (text) {
        output.push(text);
      }
    }
    
    return output;
  }

  /**
   * Wait for WebSocket connection to be established
   */
  async waitForWebSocketConnection(): Promise<void> {
    await this.page.waitForFunction(() => {
      return (window as any).webSocketConnected === true;
    }, { timeout: 15000 });
  }

  /**
   * Verify that tool usage appears in terminal only (not in chat)
   */
  async verifyToolUsageInTerminalOnly(instanceId: string, toolName: string): Promise<void> {
    const chatMessages = await this.getChatMessages();
    const terminalOutput = await this.getTerminalOutput(instanceId);
    
    // Tool usage should NOT appear in chat messages
    const toolInChat = chatMessages.some(msg => 
      msg.content.includes(toolName) && msg.type === 'tool'
    );
    expect(toolInChat).toBe(false);
    
    // Tool usage SHOULD appear in terminal output
    const toolInTerminal = terminalOutput.some(line => 
      line.includes(toolName) || line.includes('tool')
    );
    expect(toolInTerminal).toBe(true);
  }

  /**
   * Test rapid message sending to verify no message dropping
   */
  async testRapidMessageSending(instanceId: string, messageCount: number = 5): Promise<TestMessage[]> {
    const messages: string[] = [];
    for (let i = 1; i <= messageCount; i++) {
      messages.push(`Test message ${i} - ${Date.now()}`);
    }
    
    // Send all messages rapidly
    const chatInput = this.page.locator('[data-testid="chat-input"]');
    for (const message of messages) {
      await chatInput.fill(message);
      await chatInput.press('Enter');
      await this.page.waitForTimeout(100); // Small delay between messages
    }
    
    // Wait for all responses
    await this.page.waitForFunction(
      (expectedCount) => {
        const messageElements = document.querySelectorAll('[data-testid="chat-message"]');
        return messageElements.length >= expectedCount * 2; // User + Assistant messages
      },
      messageCount,
      { timeout: 60000 }
    );
    
    return await this.getChatMessages();
  }

  /**
   * Check for any console errors during test execution
   */
  async checkForConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    return errors;
  }

  /**
   * Measure page performance metrics
   */
  async measurePerformance(): Promise<{
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
  }> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstContentfulPaint: 0 // Will be populated by paint timing API
      };
    });
    
    return metrics;
  }

  /**
   * Wait for a specific element to appear with custom timeout
   */
  async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector);
    await expect(element).toBeVisible({ timeout });
    return element;
  }

  /**
   * Take a screenshot for visual regression testing
   */
  async takeScreenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({
      fullPage: true,
      path: `test-results/screenshots/${name}.png`
    });
  }

  /**
   * Verify instance cleanup after test
   */
  async cleanupInstances(): Promise<void> {
    await this.navigateToClaudeInstances();
    
    const instances = await this.page.$$('[data-testid="instance-card"]');
    
    for (const instance of instances) {
      const deleteButton = instance.locator('[data-testid="delete-instance"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion if dialog appears
        const confirmButton = this.page.locator('[data-testid="confirm-delete"]');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }
    }
    
    // Wait for all instances to be removed
    await this.page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid="instance-card"]').length === 0;
    }, { timeout: 10000 });
  }
}

export default ClaudeCodeTestHelpers;
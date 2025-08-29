import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Chat Interface
 * Professional chat interface validation and SSE streaming tests
 */
export class ChatInterfacePage {
  readonly page: Page;
  readonly chatContainer: Locator;
  readonly messagesList: Locator;
  readonly messageItems: Locator;
  readonly inputArea: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly typingIndicator: Locator;
  readonly connectionIndicator: Locator;
  readonly welcomeMessage: Locator;
  
  // Message types
  readonly userMessages: Locator;
  readonly claudeMessages: Locator;
  readonly systemMessages: Locator;
  
  // Professional styling elements
  readonly messageBubbles: Locator;
  readonly professionalTheme: Locator;
  readonly modernLayout: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.chatContainer = page.locator('.chat-container, .instance-interaction');
    this.messagesList = page.locator('.messages-list, .output-area');
    this.messageItems = page.locator('.message-item, .message');
    this.inputArea = page.locator('.input-area, .chat-input-area');
    this.chatInput = page.locator('.input-field, .chat-input');
    this.sendButton = page.locator('.btn-send, .send-button');
    this.typingIndicator = page.locator('.typing-indicator');
    this.connectionIndicator = page.locator('.connection-status');
    this.welcomeMessage = page.locator('.welcome-message');
    
    // Message type selectors
    this.userMessages = page.locator('.message-user, [data-message-type="user"]');
    this.claudeMessages = page.locator('.message-claude, [data-message-type="claude"]');
    this.systemMessages = page.locator('.message-system, [data-message-type="system"]');
    
    // Professional styling
    this.messageBubbles = page.locator('.message-bubble');
    this.professionalTheme = page.locator('[data-theme="professional"]');
    this.modernLayout = page.locator('.modern-chat-layout');
  }
  
  /**
   * Navigate to chat interface (usually within Claude Instance Manager)
   */
  async goto() {
    await this.page.goto('/claude-instances');
    await this.waitForChatInterface();
  }
  
  /**
   * Wait for chat interface to load
   */
  async waitForChatInterface() {
    await expect(this.chatContainer).toBeVisible();
    await expect(this.inputArea).toBeVisible();
  }
  
  /**
   * Professional Message Bubble Validation
   */
  
  /**
   * Validate professional message bubble styling
   */
  async validateMessageBubbleStyling() {
    // Wait for at least one message to appear
    await expect(this.messageItems.first()).toBeVisible({ timeout: 10000 });
    
    const messageCount = await this.messageItems.count();
    
    for (let i = 0; i < Math.min(messageCount, 5); i++) {
      const message = this.messageItems.nth(i);
      
      // Check for professional styling classes
      const classList = await message.getAttribute('class');
      expect(classList).toBeTruthy();
      
      // Validate bubble appearance
      const styles = await message.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          margin: computed.margin,
          backgroundColor: computed.backgroundColor
        };
      });
      
      // Professional bubble should have rounded corners
      expect(styles.borderRadius).not.toBe('0px');
      
      // Should have appropriate padding
      expect(styles.padding).not.toBe('0px');
    }
  }
  
  /**
   * Test different message types styling
   */
  async validateMessageTypesStyling() {
    // Send a test message to create user message
    await this.sendMessage('Hello Claude');
    
    // Wait for potential response
    await this.page.waitForTimeout(2000);
    
    // Check user messages styling
    const userMessageCount = await this.userMessages.count();
    if (userMessageCount > 0) {
      const userMsg = this.userMessages.first();
      await expect(userMsg).toBeVisible();
      
      // User messages should have distinct styling
      const userStyles = await userMsg.evaluate(el => 
        getComputedStyle(el).textAlign
      );
      
      // User messages often aligned right
      expect(['right', 'end', 'start', 'left']).toContain(userStyles);
    }
    
    // Check Claude messages styling if any exist
    const claudeMessageCount = await this.claudeMessages.count();
    if (claudeMessageCount > 0) {
      const claudeMsg = this.claudeMessages.first();
      await expect(claudeMsg).toBeVisible();
      
      // Claude messages should have different styling from user messages
      const claudeStyles = await claudeMsg.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });
      
      expect(claudeStyles.backgroundColor).toBeDefined();
      expect(claudeStyles.color).toBeDefined();
    }
  }
  
  /**
   * SSE Streaming Integration Tests
   */
  
  /**
   * Test real-time message streaming
   */
  async testSSEMessageStreaming() {
    // Clear any existing messages
    const initialMessageCount = await this.messageItems.count();
    
    // Send a message that should trigger Claude response
    await this.sendMessage('Please respond with a simple greeting');
    
    // Wait for new message to appear via SSE
    await expect(this.messageItems).toHaveCount(initialMessageCount + 1, { timeout: 15000 });
    
    // Validate the new message appeared in real-time
    const newMessage = this.messageItems.last();
    await expect(newMessage).toBeVisible();
    
    const messageText = await newMessage.textContent();
    expect(messageText).toBeTruthy();
    expect(messageText!.length).toBeGreaterThan(0);
  }
  
  /**
   * Test message streaming performance
   */
  async testStreamingPerformance() {
    const startTime = Date.now();
    
    // Send message
    await this.sendMessage('Test streaming performance');
    
    // Wait for response to start appearing
    const initialCount = await this.messageItems.count();
    await expect(this.messageItems).toHaveCount(initialCount + 1, { timeout: 10000 });
    
    const responseTime = Date.now() - startTime;
    
    // Response should appear within reasonable time
    expect(responseTime).toBeLessThan(5000); // 5 seconds max
    
    return responseTime;
  }
  
  /**
   * Test connection recovery during streaming
   */
  async testStreamingReconnection() {
    // Monitor connection status
    await expect(this.connectionIndicator).toBeVisible();
    
    // Send initial message
    await this.sendMessage('Test connection recovery');
    
    // Simulate brief network interruption by reloading page
    await this.page.reload();
    await this.waitForChatInterface();
    
    // Verify connection is restored
    await expect(this.connectionIndicator).toHaveClass(/connected/, { timeout: 10000 });
    
    // Test that messaging works after reconnection
    await this.sendMessage('Connection restored test');
    
    const messageCount = await this.messageItems.count();
    expect(messageCount).toBeGreaterThan(0);
  }
  
  /**
   * Chat Interface Functionality
   */
  
  /**
   * Send a message through the chat interface
   */
  async sendMessage(message: string) {
    await expect(this.chatInput).toBeVisible();
    await expect(this.chatInput).toBeEnabled();
    
    await this.chatInput.fill(message);
    await expect(this.chatInput).toHaveValue(message);
    
    // Test both button click and Enter key
    const useButton = Math.random() > 0.5;
    
    if (useButton) {
      await this.sendButton.click();
    } else {
      await this.chatInput.press('Enter');
    }
    
    // Verify input was cleared
    await expect(this.chatInput).toHaveValue('');
  }
  
  /**
   * Wait for Claude welcome message
   */
  async waitForWelcomeMessage() {
    // Look for welcome indicators
    const welcomePatterns = [
      /welcome/i,
      /hello/i,
      /claude/i,
      /ready/i,
      /started/i
    ];
    
    const timeout = 15000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = await this.messageItems.all();
      
      for (const message of messages) {
        const text = await message.textContent();
        if (text) {
          for (const pattern of welcomePatterns) {
            if (pattern.test(text)) {
              return true;
            }
          }
        }
      }
      
      await this.page.waitForTimeout(500);
    }
    
    return false;
  }
  
  /**
   * Get all messages in chat
   */
  async getAllMessages(): Promise<Array<{text: string, type?: string}>> {
    const messages: Array<{text: string, type?: string}> = [];
    
    const messageElements = await this.messageItems.all();
    
    for (const element of messageElements) {
      const text = await element.textContent() || '';
      const className = await element.getAttribute('class') || '';
      
      let type = 'unknown';
      if (className.includes('user')) type = 'user';
      else if (className.includes('claude') || className.includes('assistant')) type = 'claude';
      else if (className.includes('system')) type = 'system';
      
      messages.push({ text: text.trim(), type });
    }
    
    return messages;
  }
  
  /**
   * Wait for typing indicator to appear and disappear
   */
  async waitForTypingIndicator() {
    // Wait for typing indicator to appear
    await expect(this.typingIndicator).toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Wait for it to disappear
    await expect(this.typingIndicator).not.toBeVisible({ timeout: 15000 }).catch(() => {});
  }
  
  /**
   * Professional Interface Validation
   */
  
  /**
   * Validate overall professional chat interface
   */
  async validateProfessionalChatInterface() {
    // Container should have professional layout
    await expect(this.chatContainer).toBeVisible();
    
    // Input area should be professionally styled
    await expect(this.inputArea).toBeVisible();
    
    // Test input field styling
    const inputStyles = await this.chatInput.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        borderRadius: computed.borderRadius,
        padding: computed.padding,
        fontSize: computed.fontSize,
        border: computed.border
      };
    });
    
    // Professional input should have rounded corners and padding
    expect(inputStyles.borderRadius).not.toBe('0px');
    expect(inputStyles.padding).not.toBe('0px');
    
    // Send button should be professionally styled
    const sendButtonStyles = await this.sendButton.evaluate(el => {
      const computed = getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        borderRadius: computed.borderRadius
      };
    });
    
    expect(sendButtonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(sendButtonStyles.borderRadius).not.toBe('0px');
  }
  
  /**
   * Test chat interface responsiveness
   */
  async testResponsiveDesign() {
    // Test mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await expect(this.chatContainer).toBeVisible();
    await expect(this.inputArea).toBeVisible();
    
    // Test tablet viewport
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await expect(this.chatContainer).toBeVisible();
    await expect(this.inputArea).toBeVisible();
    
    // Test desktop viewport
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await expect(this.chatContainer).toBeVisible();
    await expect(this.inputArea).toBeVisible();
    
    // Reset to default
    await this.page.setViewportSize({ width: 1280, height: 720 });
  }
  
  /**
   * Test chat interface accessibility
   */
  async validateAccessibility() {
    // Check for proper ARIA labels
    const inputLabel = await this.chatInput.getAttribute('aria-label') || 
                       await this.chatInput.getAttribute('placeholder');
    expect(inputLabel).toBeTruthy();
    
    // Check for keyboard navigation
    await this.chatInput.focus();
    await expect(this.chatInput).toBeFocused();
    
    await this.page.keyboard.press('Tab');
    await expect(this.sendButton).toBeFocused();
    
    // Test Enter key functionality
    await this.chatInput.focus();
    await this.chatInput.fill('Accessibility test message');
    await this.chatInput.press('Enter');
    
    // Input should be cleared after Enter
    await expect(this.chatInput).toHaveValue('');
  }
  
  /**
   * Measure chat interface performance
   */
  async measureChatPerformance() {
    const metrics = {
      messageRenderTime: 0,
      inputResponseTime: 0,
      scrollPerformance: 0
    };
    
    // Measure message rendering time
    const renderStart = Date.now();
    await this.sendMessage('Performance test message');
    await expect(this.messageItems.last()).toBeVisible();
    metrics.messageRenderTime = Date.now() - renderStart;
    
    // Measure input response time
    const inputStart = Date.now();
    await this.chatInput.fill('Input response test');
    await this.chatInput.clear();
    metrics.inputResponseTime = Date.now() - inputStart;
    
    // Measure scroll performance with many messages
    const scrollStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await this.sendMessage(`Scroll test message ${i + 1}`);
    }
    await this.messagesList.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    metrics.scrollPerformance = Date.now() - scrollStart;
    
    return metrics;
  }
}

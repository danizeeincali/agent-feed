import { test, expect } from '@playwright/test';
import { ClaudeInstancePage } from '../page-objects/ClaudeInstancePage';
import { ChatInterfacePage } from '../page-objects/ChatInterfacePage';

/**
 * Chat Interface Integration Tests
 * 
 * Test Categories:
 * 1. SSE Streaming Works with New Message Bubbles
 * 2. Real-time Message Updates Appear Correctly  
 * 3. Input Field Functionality with Professional Styling
 * 4. Chat Interface Shows Claude Welcome Message
 * 5. Message Formatting and Display Consistency
 */

test.describe('Chat Interface Integration', () => {
  let claudePage: ClaudeInstancePage;
  let chatPage: ChatInterfacePage;
  
  test.beforeEach(async ({ page }) => {
    claudePage = new ClaudeInstancePage(page);
    chatPage = new ChatInterfacePage(page);
    
    await claudePage.goto();
    
    // Create a Claude instance for chat testing
    await claudePage.clickProdButton();
    await claudePage.selectInstance(0);
  });
  
  test.describe('SSE Streaming Integration', () => {
    test('SSE streaming works with new message bubbles', async () => {
      await test.step('Verify SSE connection established', async () => {
        await claudePage.waitForConnection();
        await expect(claudePage.connectionStatus).toHaveClass(/connected/);
      });
      
      await test.step('Test message streaming with professional bubbles', async () => {
        // Send a command that should produce output
        await chatPage.sendMessage('echo "Testing SSE streaming with professional UI"');
        
        // Wait for output to stream in
        await chatPage.waitForOutputContains('Testing SSE streaming with professional UI');
        
        // Validate message bubble styling
        await chatPage.validateMessageBubbleStyling();
      });
      
      await test.step('Test continuous streaming', async () => {
        // Send a command that produces continuous output
        await chatPage.sendMessage('for i in {1..3}; do echo "Stream message $i"; sleep 1; done');
        
        // Verify streaming updates appear in real-time
        await chatPage.waitForOutputContains('Stream message 1');
        await chatPage.waitForOutputContains('Stream message 2');
        await chatPage.waitForOutputContains('Stream message 3');
        
        // Ensure message formatting remains consistent
        const messages = await chatPage.getAllMessages();
        expect(messages.length).toBeGreaterThan(0);
        
        // Validate each message has proper formatting
        for (const message of messages) {
          expect(message.text.trim()).not.toBe('');
        }
      });
    });
    
    test('real-time message updates appear correctly', async () => {
      const initialMessageCount = await chatPage.messageItems.count();
      
      // Send multiple messages to test real-time updates
      await chatPage.sendMessage('echo "Message 1"');
      await chatPage.waitForOutputContains('Message 1');
      
      await chatPage.sendMessage('echo "Message 2"');
      await chatPage.waitForOutputContains('Message 2');
      
      // Verify messages appear in correct order
      const allOutput = await chatPage.getInstanceOutput();
      const message1Index = allOutput.indexOf('Message 1');
      const message2Index = allOutput.indexOf('Message 2');
      
      expect(message1Index).toBeGreaterThan(-1);
      expect(message2Index).toBeGreaterThan(message1Index);
    });
    
    test('SSE streaming performance meets requirements', async () => {
      const performanceMetrics = await chatPage.testStreamingPerformance();
      
      // Response should appear within 5 seconds
      expect(performanceMetrics).toBeLessThan(5000);
    });
    
    test('connection recovery maintains streaming functionality', async () => {
      await chatPage.testStreamingReconnection();
    });
  });
  
  test.describe('Professional Input Field Functionality', () => {
    test('input field functionality with professional styling', async () => {
      await test.step('Validate professional input styling', async () => {
        await expect(chatPage.chatInput).toBeVisible();
        await expect(chatPage.chatInput).toBeEnabled();
        
        // Check professional styling attributes
        const inputStyles = await chatPage.chatInput.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            borderRadius: computed.borderRadius,
            padding: computed.padding,
            fontSize: computed.fontSize,
            border: computed.border,
            backgroundColor: computed.backgroundColor
          };
        });
        
        // Professional input should have rounded corners
        expect(inputStyles.borderRadius).not.toBe('0px');
        
        // Should have adequate padding
        expect(inputStyles.padding).not.toBe('0px');
        
        // Should have professional background
        expect(inputStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      });
      
      await test.step('Test input field functionality', async () => {
        // Test typing in input field
        const testMessage = 'Testing professional input field';
        await chatPage.chatInput.fill(testMessage);
        await expect(chatPage.chatInput).toHaveValue(testMessage);
        
        // Test input clearing after send
        await chatPage.sendButton.click();
        await expect(chatPage.chatInput).toHaveValue('');
        
        // Test Enter key functionality
        await chatPage.chatInput.fill('Testing Enter key');
        await chatPage.chatInput.press('Enter');
        await expect(chatPage.chatInput).toHaveValue('');
      });
      
      await test.step('Test input field responsiveness', async () => {
        // Test rapid typing
        const rapidText = 'abcdefghijklmnopqrstuvwxyz';
        for (const char of rapidText) {
          await chatPage.chatInput.type(char, { delay: 10 });
        }
        
        await expect(chatPage.chatInput).toHaveValue(rapidText);
        await chatPage.chatInput.clear();
      });
    });
    
    test('send button maintains professional appearance and functionality', async () => {
      // Validate send button styling
      await expect(chatPage.sendButton).toBeVisible();
      await expect(chatPage.sendButton).toBeEnabled();
      
      const buttonStyles = await chatPage.sendButton.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          borderRadius: computed.borderRadius,
          padding: computed.padding
        };
      });
      
      // Professional button should have styled background
      expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      
      // Should have rounded corners
      expect(buttonStyles.borderRadius).not.toBe('0px');
      
      // Test button functionality
      await chatPage.chatInput.fill('Testing send button');
      await chatPage.sendButton.click();
      
      // Input should be cleared after clicking send
      await expect(chatPage.chatInput).toHaveValue('');
    });
    
    test('input field accessibility features work correctly', async () => {
      await chatPage.validateAccessibility();
    });
  });
  
  test.describe('Claude Welcome Message Display', () => {
    test('chat interface shows Claude welcome message', async () => {
      // Wait for Claude welcome message to appear
      const hasWelcomeMessage = await chatPage.waitForWelcomeMessage();
      expect(hasWelcomeMessage).toBeTruthy();
      
      // Verify welcome message is properly formatted
      const output = await chatPage.getInstanceOutput();
      expect(output.length).toBeGreaterThan(0);
      
      // Should contain some indication that Claude is ready
      const lowerOutput = output.toLowerCase();
      const welcomeIndicators = [
        'welcome',
        'hello',
        'claude',
        'ready',
        'started',
        'prompt'
      ];
      
      const hasIndicator = welcomeIndicators.some(indicator => 
        lowerOutput.includes(indicator)
      );
      expect(hasIndicator).toBeTruthy();
    });
    
    test('welcome message appears with professional styling', async () => {
      // Wait for initial output to appear
      await expect(chatPage.outputArea).toBeVisible();
      
      // Check for professional output area styling
      const outputStyles = await chatPage.outputArea.evaluate(el => {
        const computed = getComputedStyle(el);
        return {
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          lineHeight: computed.lineHeight,
          backgroundColor: computed.backgroundColor,
          color: computed.color
        };
      });
      
      // Should use monospace font for terminal output
      expect(outputStyles.fontFamily.toLowerCase()).toContain('mono');
      
      // Should have professional background
      expect(outputStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
    
    test('welcome message timing is appropriate', async () => {
      // Measure time for welcome message to appear
      const startTime = Date.now();
      
      const hasWelcomeMessage = await chatPage.waitForWelcomeMessage();
      const welcomeTime = Date.now() - startTime;
      
      expect(hasWelcomeMessage).toBeTruthy();
      
      // Welcome message should appear within 15 seconds
      expect(welcomeTime).toBeLessThan(15000);
    });
  });
  
  test.describe('Message Formatting and Display Consistency', () => {
    test('message formatting and display consistency', async () => {
      // Send various types of messages to test formatting
      const testMessages = [
        'echo "Simple message"',
        'ls -la',
        'echo "Multi-line\nmessage\ntest"',
        'date',
        'echo "Special characters: !@#$%^&*()"'
      ];
      
      for (const message of testMessages) {
        await chatPage.sendMessage(message);
        await chatPage.page.waitForTimeout(1000);
      }
      
      // Validate consistent formatting across all messages
      const allMessages = await chatPage.getAllMessages();
      expect(allMessages.length).toBeGreaterThan(0);
      
      // Check that all messages have content
      for (const message of allMessages) {
        expect(message.text.trim().length).toBeGreaterThan(0);
      }
      
      // Validate message bubble styling consistency
      await chatPage.validateMessageBubbleStyling();
    });
    
    test('different message types display correctly', async () => {
      await chatPage.validateMessageTypesStyling();
    });
    
    test('long messages wrap and display properly', async () => {
      const longMessage = 'echo "' + 'A'.repeat(200) + '"';
      await chatPage.sendMessage(longMessage);
      
      await chatPage.waitForOutputContains('A'.repeat(200));
      
      // Verify long content doesn't break layout
      const outputArea = chatPage.outputArea;
      await expect(outputArea).toBeVisible();
      
      // Check that output area maintains its bounds
      const bounds = await outputArea.boundingBox();
      expect(bounds).toBeTruthy();
      expect(bounds!.width).toBeGreaterThan(0);
      expect(bounds!.height).toBeGreaterThan(0);
    });
    
    test('terminal output maintains readability', async () => {
      // Send commands that produce formatted output
      await chatPage.sendMessage('ls -la /usr/bin | head -10');
      await chatPage.page.waitForTimeout(2000);
      
      const output = await chatPage.getInstanceOutput();
      
      // Output should maintain terminal formatting
      expect(output).toContain('/usr/bin');
      
      // Check that output uses monospace font
      const fontFamily = await chatPage.outputArea.evaluate(el => 
        getComputedStyle(el).fontFamily
      );
      
      expect(fontFamily.toLowerCase()).toMatch(/(mono|courier|consolas)/);
    });
    
    test('special characters and unicode display correctly', async () => {
      const specialChars = [
        'echo "Symbols: ★ ♠ ♣ ♦ ♥"',
        'echo "Math: ∑ ∏ √ ∞ ≈ ≠"',
        'echo "Arrows: → ← ↑ ↓ ⇒ ⇐"',
        'echo "Currency: $ € £ ¥ ₹"'
      ];
      
      for (const cmd of specialChars) {
        await chatPage.sendMessage(cmd);
        await chatPage.page.waitForTimeout(500);
      }
      
      const output = await chatPage.getInstanceOutput();
      
      // Verify special characters are displayed correctly
      expect(output).toContain('★');
      expect(output).toContain('∑');
      expect(output).toContain('→');
      expect(output).toContain('€');
    });
  });
  
  test.describe('Responsive Design', () => {
    test('chat interface responsive design works correctly', async () => {
      await chatPage.testResponsiveDesign();
    });
    
    test('message bubbles adapt to different screen sizes', async ({ page }) => {
      // Send a test message
      await chatPage.sendMessage('echo "Responsive design test"');
      await chatPage.waitForOutputContains('Responsive design test');
      
      const viewports = [
        { width: 375, height: 667 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }  // Desktop
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(300);
        
        // Verify chat interface remains functional
        await expect(chatPage.chatContainer).toBeVisible();
        await expect(chatPage.inputArea).toBeVisible();
        await expect(chatPage.outputArea).toBeVisible();
        
        // Test that messages are still readable
        const output = await chatPage.getInstanceOutput();
        expect(output).toContain('Responsive design test');
      }
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });
  
  test.describe('Performance', () => {
    test('chat interface performance meets requirements', async () => {
      const performanceMetrics = await chatPage.measureChatPerformance();
      
      // Message rendering should be under 1 second
      expect(performanceMetrics.messageRenderTime).toBeLessThan(1000);
      
      // Input response should be immediate (under 100ms)
      expect(performanceMetrics.inputResponseTime).toBeLessThan(100);
      
      // Scroll performance should be reasonable
      expect(performanceMetrics.scrollPerformance).toBeLessThan(2000);
    });
    
    test('multiple messages do not degrade performance', async () => {
      const startTime = Date.now();
      
      // Send multiple messages
      for (let i = 0; i < 10; i++) {
        await chatPage.sendMessage(`echo "Performance test message ${i + 1}"`);
        await chatPage.page.waitForTimeout(200);
      }
      
      const totalTime = Date.now() - startTime;
      
      // Should handle multiple messages efficiently
      expect(totalTime).toBeLessThan(15000); // 15 seconds for 10 messages
      
      // Verify all messages were processed
      const output = await chatPage.getInstanceOutput();
      expect(output).toContain('Performance test message 1');
      expect(output).toContain('Performance test message 10');
    });
  });
  
  // Cleanup after each test
  test.afterEach(async () => {
    try {
      // Clean up created instances
      while (await claudePage.getInstanceCount() > 0) {
        await claudePage.terminateInstance(0);
        await claudePage.page.waitForTimeout(1000);
      }
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  });
});

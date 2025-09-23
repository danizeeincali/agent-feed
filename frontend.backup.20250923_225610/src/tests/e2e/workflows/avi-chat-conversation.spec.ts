/**
 * End-to-End Tests for Avi Chat Conversation Workflows
 * SPARC Phase 4: Refinement - Complete User Journey Testing
 *
 * Test Coverage:
 * - Complete conversation flows
 * - Image upload workflows
 * - Error recovery scenarios
 * - Mobile and desktop experiences
 * - Accessibility compliance
 * - Performance under realistic conditions
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  slowMo: process.env.CI ? 0 : 100
};

test.describe('Avi Chat Conversation Workflows', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      locale: 'en-US'
    });

    page = await context.newPage();

    // Mock API responses for consistent testing
    await page.route('/api/claude-code/streaming-chat', async route => {
      const request = route.request();
      const body = await request.postDataJSON();

      // Simulate realistic response delay
      await new Promise(resolve => setTimeout(resolve, 500));

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          responses: [
            {
              type: 'assistant',
              content: `I received your message: "${body.message}". I'm here to help you with development tasks, answer questions, and assist with your projects.`
            }
          ],
          timestamp: new Date().toISOString(),
          claudeCode: true,
          toolsEnabled: true
        })
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('completes basic text conversation flow', async () => {
    // Navigate to Avi DM interface
    await test.step('Navigate to Avi DM tab', async () => {
      const postingInterface = page.locator('[data-testid="posting-interface"]');
      await expect(postingInterface).toBeVisible();

      const aviDMTab = page.locator('button:has-text("Avi DM")');
      await aviDMTab.click();

      await expect(page.locator('[data-testid="avi-chat-sdk"]')).toBeVisible();
      await expect(page.locator('[data-testid="avi-greeting"]')).toBeVisible();
    });

    // Send initial message
    await test.step('Send initial message', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await expect(messageInput).toBeVisible();

      await messageInput.fill('Hello Avi, can you help me with a coding question?');

      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).toBeEnabled();
      await sendButton.click();
    });

    // Verify message appears in chat
    await test.step('Verify user message appears', async () => {
      await expect(page.locator('text=Hello Avi, can you help me with a coding question?')).toBeVisible();

      // Verify message status indicator
      const messageElement = page.locator('text=Hello Avi, can you help me with a coding question?').locator('..');
      await expect(messageElement.locator('.bg-yellow-400')).toBeVisible(); // Sending status
    });

    // Wait for connection status updates
    await test.step('Verify connection status updates', async () => {
      await expect(page.locator('text=Connecting...')).toBeVisible();
      await expect(page.locator('text=Connected securely')).toBeVisible({ timeout: 10000 });
    });

    // Verify Avi's response
    await test.step('Verify Avi response appears', async () => {
      await expect(page.locator('text=I received your message')).toBeVisible({ timeout: 15000 });

      // Verify message status updated to sent
      const messageElement = page.locator('text=Hello Avi, can you help me with a coding question?').locator('..');
      await expect(messageElement.locator('.bg-green-400')).toBeVisible(); // Sent status
    });

    // Send follow-up message
    await test.step('Send follow-up message', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('Yes, I need help with React components.');

      await page.locator('button:has-text("Send")').click();

      await expect(page.locator('text=Yes, I need help with React components.')).toBeVisible();
      await expect(page.locator('text=I received your message: "Yes, I need help with React components."')).toBeVisible({ timeout: 15000 });
    });

    // Verify conversation history is maintained
    await test.step('Verify conversation history', async () => {
      await expect(page.locator('text=Hello Avi, can you help me with a coding question?')).toBeVisible();
      await expect(page.locator('text=Yes, I need help with React components.')).toBeVisible();

      // Should have 4 messages total (2 user, 2 assistant)
      const allMessages = page.locator('[role="chat"] > div, .flex.justify-start, .flex.justify-end');
      await expect(allMessages).toHaveCount(4);
    });
  });

  test('handles image upload workflow', async () => {
    await test.step('Navigate to Avi DM and prepare for image upload', async () => {
      await page.locator('button:has-text("Avi DM")').click();
      await expect(page.locator('[data-testid="avi-chat-sdk"]')).toBeVisible();
    });

    // Mock image upload response
    await page.route('/api/claude-code/streaming-chat', async route => {
      const request = route.request();
      const body = await request.postDataJSON();

      let responseContent = 'I can help you with that.';

      if (body.message && typeof body.message === 'object' && body.message.images) {
        responseContent = `I can see the ${body.message.images.length} image(s) you uploaded. The images appear to be screenshots or diagrams. How can I help you analyze them?`;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          responses: [{ type: 'assistant', content: responseContent }],
          timestamp: new Date().toISOString(),
          claudeCode: true,
          toolsEnabled: true
        })
      });
    });

    await test.step('Upload image file', async () => {
      // Create a test image file
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );

      // Upload the image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-screenshot.png',
        mimeType: 'image/png',
        buffer: testImageBuffer
      });

      // Verify image appears in selected images area
      await expect(page.locator('text=test-screenshot.png')).toBeVisible();
    });

    await test.step('Send message with image', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('What do you see in this screenshot?');

      await page.locator('button:has-text("Send")').click();

      // Verify message with image indicator
      await expect(page.locator('text=What do you see in this screenshot?')).toBeVisible();
      await expect(page.locator('text=📷 test-screenshot.png')).toBeVisible();
    });

    await test.step('Verify image-aware response', async () => {
      await expect(page.locator('text=I can see the 1 image(s) you uploaded')).toBeVisible({ timeout: 15000 });
    });

    await test.step('Test multiple image upload', async () => {
      // Upload second image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        {
          name: 'test-diagram.png',
          mimeType: 'image/png',
          buffer: testImageBuffer
        },
        {
          name: 'test-code.png',
          mimeType: 'image/png',
          buffer: testImageBuffer
        }
      ]);

      await expect(page.locator('text=test-diagram.png')).toBeVisible();
      await expect(page.locator('text=test-code.png')).toBeVisible();

      await messageInput.fill('Can you compare these images?');
      await page.locator('button:has-text("Send")').click();

      await expect(page.locator('text=I can see the 2 image(s) you uploaded')).toBeVisible({ timeout: 15000 });
    });
  });

  test('handles error recovery scenarios', async () => {
    await page.locator('button:has-text("Avi DM")').click();

    await test.step('Test network error recovery', async () => {
      // Mock network failure
      await page.route('/api/claude-code/streaming-chat', route => {
        route.abort('failed');
      });

      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('This message should fail');
      await page.locator('button:has-text("Send")').click();

      // Verify error state
      await expect(page.locator('text=Connection error')).toBeVisible();
      await expect(page.locator('[class*="red"]')).toBeVisible(); // Error styling

      // Verify retry mechanism
      await expect(page.locator('text=This message should fail')).toBeVisible();
      const messageElement = page.locator('text=This message should fail').locator('..');
      await expect(messageElement.locator('.bg-red-400')).toBeVisible(); // Error status
    });

    await test.step('Test error recovery after successful request', async () => {
      // Restore normal API response
      await page.route('/api/claude-code/streaming-chat', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            responses: [{ type: 'assistant', content: 'Connection restored successfully!' }],
            timestamp: new Date().toISOString()
          })
        });
      });

      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('This should work now');
      await page.locator('button:has-text("Send")').click();

      // Verify recovery
      await expect(page.locator('text=Connected securely')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Connection restored successfully!')).toBeVisible({ timeout: 15000 });
    });

    await test.step('Test error dismissal', async () => {
      // Trigger another error
      await page.route('/api/claude-code/streaming-chat', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Test error message'
          })
        });
      });

      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('Trigger error');
      await page.locator('button:has-text("Send")').click();

      await expect(page.locator('text=Test error message')).toBeVisible();

      // Dismiss error
      const dismissButton = page.locator('button[title*="Close"], button:has([data-lucide="x"])');
      await dismissButton.click();

      await expect(page.locator('text=Test error message')).not.toBeVisible();
    });
  });

  test('validates keyboard shortcuts and accessibility', async () => {
    await page.locator('button:has-text("Avi DM")').click();

    await test.step('Test Enter key to send message', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('Test enter key functionality');
      await messageInput.press('Enter');

      await expect(page.locator('text=Test enter key functionality')).toBeVisible();
    });

    await test.step('Test Shift+Enter for line breaks', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('Line 1');
      await messageInput.press('Shift+Enter');
      await messageInput.type('Line 2');

      const inputValue = await messageInput.inputValue();
      expect(inputValue).toBe('Line 1\nLine 2');
    });

    await test.step('Test tab navigation', async () => {
      await page.keyboard.press('Tab');
      await expect(page.locator('button[title*="Add images"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Send")')).toBeFocused();
    });

    await test.step('Verify ARIA attributes and screen reader support', async () => {
      // Check for proper ARIA labeling
      const chatContainer = page.locator('[data-testid="avi-chat-sdk"]');
      await expect(chatContainer).toHaveAttribute('role', 'region');

      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await expect(messageInput).toHaveAttribute('aria-label');

      // Verify heading structure
      await expect(page.locator('h3:has-text("Avi AI Assistant")')).toBeVisible();
    });

    await test.step('Test keyboard-only navigation', async () => {
      // Focus the message input using Tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Navigate to input
      await expect(page.locator('textarea[placeholder*="Type your message to Avi"]')).toBeFocused();

      // Type message and send with keyboard
      await page.keyboard.type('Keyboard navigation test');
      await page.keyboard.press('Tab'); // Navigate to send button
      await page.keyboard.press('Enter'); // Send message

      await expect(page.locator('text=Keyboard navigation test')).toBeVisible();
    });
  });

  test('validates mobile responsive behavior', async () => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await test.step('Navigate to mobile Avi DM interface', async () => {
      await page.locator('button:has-text("Avi DM")').click();

      const chatContainer = page.locator('[data-testid="avi-chat-sdk"]');
      await expect(chatContainer).toBeVisible();

      // Verify mobile-optimized layout
      const boundingBox = await chatContainer.boundingBox();
      expect(boundingBox?.width).toBeLessThan(400);
    });

    await test.step('Test touch interactions', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');

      // Use tap instead of click for mobile
      await messageInput.tap();
      await expect(messageInput).toBeFocused();

      await messageInput.fill('Mobile touch test message');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.tap();

      await expect(page.locator('text=Mobile touch test message')).toBeVisible();
    });

    await test.step('Test mobile virtual keyboard handling', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.tap();

      // Simulate virtual keyboard appearing (viewport height changes)
      await page.setViewportSize({ width: 375, height: 400 });

      await messageInput.fill('Testing with virtual keyboard');
      await page.locator('button:has-text("Send")').tap();

      await expect(page.locator('text=Testing with virtual keyboard')).toBeVisible();
    });
  });

  test('measures performance under realistic conditions', async () => {
    await page.locator('button:has-text("Avi DM")').click();

    await test.step('Test rapid message sending', async () => {
      const startTime = Date.now();
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send multiple messages in sequence
      for (let i = 1; i <= 5; i++) {
        await messageInput.fill(`Performance test message ${i}`);
        await sendButton.click();

        // Wait for message to appear before sending next
        await expect(page.locator(`text=Performance test message ${i}`)).toBeVisible();

        // Small delay to prevent overwhelming the system
        await page.waitForTimeout(100);
      }

      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Should complete within reasonable time
      expect(totalDuration).toBeLessThan(30000); // 30 seconds

      // Verify all messages are visible
      for (let i = 1; i <= 5; i++) {
        await expect(page.locator(`text=Performance test message ${i}`)).toBeVisible();
      }
    });

    await test.step('Test memory usage stability', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');

      // Send many messages to test for memory leaks
      for (let i = 1; i <= 20; i++) {
        await messageInput.fill(`Memory test ${i} - ${'.'.repeat(100)}`);
        await page.locator('button:has-text("Send")').click();

        // Wait for message to appear
        await expect(page.locator(`text=Memory test ${i}`)).toBeVisible();
      }

      // Verify page is still responsive
      const startTime = Date.now();
      await messageInput.fill('Final responsiveness test');
      await page.locator('button:has-text("Send")').click();
      await expect(page.locator('text=Final responsiveness test')).toBeVisible();
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // Should still be responsive
    });

    await test.step('Test large message handling', async () => {
      const largeMessage = 'This is a very long message that tests how the interface handles large amounts of text. ' + 'x'.repeat(1000);

      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill(largeMessage);
      await page.locator('button:has-text("Send")').click();

      await expect(page.locator(`text=${largeMessage.substring(0, 50)}`)).toBeVisible();
    });
  });

  test('validates streaming ticker integration', async () => {
    await page.locator('button:has-text("Avi DM")').click();

    await test.step('Verify streaming ticker appears during activity', async () => {
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('Test streaming ticker integration');
      await page.locator('button:has-text("Send")').click();

      // Streaming ticker should be visible during processing
      const streamingTicker = page.locator('[data-testid="streaming-ticker"]');
      await expect(streamingTicker).toBeVisible();

      // Should show activity indicators
      await expect(page.locator('text=Active for')).toBeVisible();
    });

    await test.step('Verify ticker updates during different states', async () => {
      // During connection
      await expect(page.locator('text=Connecting')).toBeVisible();

      // During processing (mocked response includes delay)
      await expect(page.locator('text=Active')).toBeVisible();

      // After completion
      await expect(page.locator('text=I received your message')).toBeVisible({ timeout: 15000 });
    });
  });

  test('handles complex conversation scenarios', async () => {
    await page.locator('button:has-text("Avi DM")').click();

    await test.step('Mixed content conversation flow', async () => {
      // Text message
      const messageInput = page.locator('textarea[placeholder*="Type your message to Avi"]');
      await messageInput.fill('Hello, I need help with my project.');
      await page.locator('button:has-text("Send")').click();
      await expect(page.locator('text=Hello, I need help with my project.')).toBeVisible();

      // Image upload
      const testImageBuffer = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'project-screenshot.png',
        mimeType: 'image/png',
        buffer: testImageBuffer
      });

      await messageInput.fill('Here\'s a screenshot of the issue');
      await page.locator('button:has-text("Send")').click();

      // Follow-up question
      await messageInput.fill('What do you think is causing this problem?');
      await page.locator('button:has-text("Send")').click();

      // Verify conversation thread
      await expect(page.locator('text=Hello, I need help with my project.')).toBeVisible();
      await expect(page.locator('text=Here\'s a screenshot of the issue')).toBeVisible();
      await expect(page.locator('text=What do you think is causing this problem?')).toBeVisible();
    });
  });
});

/**
 * Test utilities for E2E testing
 */
export const e2eTestUtils = {
  /**
   * Wait for element with retry logic
   */
  waitForElementWithRetry: async (page: Page, selector: string, maxRetries: number = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await page.waitForTimeout(1000);
      }
    }
  },

  /**
   * Create test image buffer
   */
  createTestImage: (name: string = 'test.png') => ({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    )
  }),

  /**
   * Simulate realistic typing speed
   */
  typeRealistic: async (page: Page, selector: string, text: string) => {
    const element = page.locator(selector);
    await element.click();

    for (const char of text) {
      await element.type(char);
      await page.waitForTimeout(Math.random() * 100 + 50); // 50-150ms per character
    }
  },

  /**
   * Take screenshot for debugging
   */
  debugScreenshot: async (page: Page, name: string) => {
    if (process.env.DEBUG_SCREENSHOTS) {
      await page.screenshot({ path: `test-results/debug-${name}-${Date.now()}.png` });
    }
  }
};
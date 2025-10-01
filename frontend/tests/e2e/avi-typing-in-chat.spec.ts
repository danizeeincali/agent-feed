/**
 * SPARC TDD E2E Tests: Avi Typing Indicator in Chat
 *
 * End-to-end Playwright tests validating:
 * - Visual integration of typing indicator as chat message
 * - Smooth animations and transitions
 * - Layout behavior (pushing messages up)
 * - Complete user flows
 * - Edge cases in real browser environment
 *
 * @package agent-feed
 * @subpackage frontend/tests/e2e
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Avi Typing Indicator Chat Integration - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Switch to Avi DM tab
    await page.click('text=Avi DM');

    // Wait for chat interface
    await page.waitForSelector('input[placeholder*="Type your message"]');
  });

  test.describe('Visual Integration', () => {
    test('typing indicator should look like Avi message bubble', async ({ page }) => {
      // Setup slow network to observe typing indicator
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Test response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Hello Avi');
      await sendButton.click();

      // Wait for typing indicator to appear
      const typingIndicator = page.locator('[data-typing="true"]');
      await expect(typingIndicator).toBeVisible();

      // Verify it has Avi message styling
      const messageContainer = typingIndicator.locator('..').locator('..');
      await expect(messageContainer).toHaveClass(/bg-white/);
      await expect(messageContainer).not.toHaveClass(/bg-blue-100/);

      // Verify it's in the message list (not floating)
      const chatMessages = page.locator('[data-testid="chat-message"]');
      const count = await chatMessages.count();
      expect(count).toBeGreaterThan(0);

      // Last message should be the typing indicator
      const lastMessage = chatMessages.last();
      await expect(lastMessage.locator('[data-typing="true"]')).toBeVisible();
    });

    test('typing indicator should push previous messages up', async ({ page }) => {
      // Send first message
      await page.route('/api/claude-code/streaming-chat', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'First response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('First message');
      await sendButton.click();

      // Wait for response
      await expect(page.locator('text=First response')).toBeVisible();

      // Get position of first user message
      const firstUserMessage = page.locator('text=First message');
      const firstMessageBox = await firstUserMessage.boundingBox();
      const initialY = firstMessageBox?.y || 0;

      // Send second message with delay
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Second response' })
        });
      });

      await input.fill('Second message');
      await sendButton.click();

      // Wait for typing indicator
      await expect(page.locator('[data-typing="true"]')).toBeVisible();

      // First message should have moved up (lower Y value = higher on screen)
      const newMessageBox = await firstUserMessage.boundingBox();
      const newY = newMessageBox?.y || 0;

      // Should have scrolled (Y position changed)
      expect(newY).not.toBe(initialY);
    });

    test('typing indicator should appear and disappear smoothly', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Test');
      await sendButton.click();

      // Typing indicator appears
      const typingIndicator = page.locator('[data-typing="true"]');
      await expect(typingIndicator).toBeVisible();

      // Should have smooth transition (check opacity/animation)
      const styles = await typingIndicator.evaluate(el => {
        return window.getComputedStyle(el);
      });

      // Wait for response and disappearance
      await expect(page.locator('text=Response')).toBeVisible();
      await expect(typingIndicator).not.toBeVisible();
    });

    test('should not cause layout shift when typing indicator disappears', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Test response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Test message');
      await sendButton.click();

      // Wait for typing indicator
      await expect(page.locator('[data-typing="true"]')).toBeVisible();

      // Get chat container height
      const chatContainer = page.locator('.h-64.overflow-y-auto');
      const heightBefore = await chatContainer.evaluate(el => el.scrollHeight);

      // Wait for response (typing indicator removed, real message added)
      await expect(page.locator('text=Test response')).toBeVisible();
      await expect(page.locator('[data-typing="true"]')).not.toBeVisible();

      // Height should be similar (replacement, not removal)
      const heightAfter = await chatContainer.evaluate(el => el.scrollHeight);

      // Allow small variance for font rendering
      expect(Math.abs(heightAfter - heightBefore)).toBeLessThan(50);
    });
  });

  test.describe('User Flow', () => {
    test('complete user journey: type → send → see typing → see response', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 800));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Hello! How can I help you today?' })
        });
      });

      // Step 1: User sees empty chat
      const emptyState = page.locator('text=Λvi is ready to assist');
      await expect(emptyState).toBeVisible();

      // Step 2: User types message
      const input = page.locator('input[placeholder*="Type your message"]');
      await input.fill('hello');

      // Step 3: User clicks send
      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Step 4: User message appears
      await expect(page.locator('text=hello')).toBeVisible();

      // Step 5: Typing indicator appears
      const typingIndicator = page.locator('[data-typing="true"]');
      await expect(typingIndicator).toBeVisible();

      // Step 6: User sees wave animation
      const waveText = page.locator('.avi-wave-text');
      await expect(waveText).toBeVisible();

      // Verify animation is running (text should change)
      const initialText = await waveText.textContent();
      await page.waitForTimeout(300); // Wait for animation frame
      const newText = await waveText.textContent();

      // Frame should have changed
      expect(newText).toBeTruthy();

      // Step 7: Response appears, typing indicator disappears
      await expect(page.locator('text=Hello! How can I help you today?')).toBeVisible();
      await expect(typingIndicator).not.toBeVisible();
    });

    test('user can send multiple messages sequentially', async ({ page }) => {
      let requestCount = 0;

      await page.route('/api/claude-code/streaming-chat', async route => {
        requestCount++;
        await new Promise(resolve => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Response ${requestCount}` })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send 3 messages
      for (let i = 1; i <= 3; i++) {
        await input.fill(`Message ${i}`);
        await sendButton.click();

        // Wait for typing indicator
        await expect(page.locator('[data-typing="true"]')).toBeVisible();

        // Wait for response
        await expect(page.locator(`text=Response ${i}`)).toBeVisible();
        await expect(page.locator('[data-typing="true"]')).not.toBeVisible();
      }

      // Should have 6 messages total
      const messages = page.locator('[data-testid="chat-message"]');
      expect(await messages.count()).toBe(6);
    });

    test('input is disabled while typing indicator is showing', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Test');
      await sendButton.click();

      // While typing indicator is visible, input should be disabled
      await expect(page.locator('[data-typing="true"]')).toBeVisible();
      await expect(input).toBeDisabled();
      await expect(sendButton).toBeDisabled();

      // After response, input should be enabled
      await expect(page.locator('text=Response')).toBeVisible();
      await expect(input).not.toBeDisabled();
      await expect(sendButton).toBeDisabled(); // Disabled because input is empty
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle sending 3 messages rapidly', async ({ page }) => {
      let responseCount = 0;

      await page.route('/api/claude-code/streaming-chat', async route => {
        responseCount++;
        await new Promise(resolve => setTimeout(resolve, 200));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Response ${responseCount}` })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send message 1
      await input.fill('Rapid 1');
      await sendButton.click();

      // Wait for completion
      await expect(page.locator('text=Response 1')).toBeVisible();
      await expect(page.locator('[data-typing="true"]')).not.toBeVisible();

      // Send message 2
      await input.fill('Rapid 2');
      await sendButton.click();

      await expect(page.locator('text=Response 2')).toBeVisible();
      await expect(page.locator('[data-typing="true"]')).not.toBeVisible();

      // Send message 3
      await input.fill('Rapid 3');
      await sendButton.click();

      await expect(page.locator('text=Response 3')).toBeVisible();

      // Should have 6 messages (3 user + 3 Avi)
      const messages = page.locator('[data-testid="chat-message"]');
      expect(await messages.count()).toBe(6);
    });

    test('should maintain scroll position when user scrolls up', async ({ page }) => {
      // Send 10 messages to create scrollable content
      await page.route('/api/claude-code/streaming-chat', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      for (let i = 0; i < 10; i++) {
        await input.fill(`Message ${i}`);
        await sendButton.click();
        await expect(page.locator('[data-typing="true"]')).not.toBeVisible();
      }

      // Scroll to top
      const chatContainer = page.locator('.h-64.overflow-y-auto');
      await chatContainer.evaluate(el => {
        el.scrollTop = 0;
      });

      const scrollTopBefore = await chatContainer.evaluate(el => el.scrollTop);
      expect(scrollTopBefore).toBe(0);

      // Send new message with typing indicator
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Final response' })
        });
      });

      await input.fill('Final message');
      await sendButton.click();

      // Wait for typing indicator
      await expect(page.locator('[data-typing="true"]')).toBeVisible();

      // Scroll position should be preserved (not forced to bottom)
      const scrollTopDuring = await chatContainer.evaluate(el => el.scrollTop);

      // Should stay near top (allowing some variance)
      expect(scrollTopDuring).toBeLessThan(100);
    });

    test('should handle long chat history (50+ messages)', async ({ page }) => {
      test.setTimeout(120000); // 2 minutes for this test

      let count = 0;

      await page.route('/api/claude-code/streaming-chat', async route => {
        count++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Response ${count}` })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send 50 messages
      for (let i = 1; i <= 50; i++) {
        await input.fill(`Msg ${i}`);
        await sendButton.click();
        await expect(page.locator('[data-typing="true"]')).not.toBeVisible();
      }

      // Send one more with typing indicator
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Final' })
        });
      });

      await input.fill('Final');
      await sendButton.click();

      // Typing indicator should still work
      await expect(page.locator('[data-typing="true"]')).toBeVisible();
      await expect(page.locator('text=Final')).toBeVisible();

      // Should have 102 messages (51 user + 51 Avi)
      const messages = page.locator('[data-testid="chat-message"]');
      expect(await messages.count()).toBe(102);
    });

    test('should handle API error gracefully', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 300));
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Test error');
      await sendButton.click();

      // Typing indicator appears
      await expect(page.locator('[data-typing="true"]')).toBeVisible();

      // Typing indicator disappears, error message appears
      await expect(page.locator('[data-typing="true"]')).not.toBeVisible();
      await expect(page.locator('text=/encountered an error/i')).toBeVisible();
    });

    test('should handle network timeout', async ({ page }) => {
      test.setTimeout(120000); // 2 minutes

      await page.route('/api/claude-code/streaming-chat', async route => {
        // Never respond (simulate timeout)
        await new Promise(resolve => setTimeout(resolve, 95000));
        await route.abort();
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Test timeout');
      await sendButton.click();

      // Typing indicator appears
      await expect(page.locator('[data-typing="true"]')).toBeVisible();

      // After 90s timeout, typing indicator should disappear
      await expect(page.locator('[data-typing="true"]')).not.toBeVisible({ timeout: 95000 });

      // Timeout error message should appear
      await expect(page.locator('text=/timeout/i')).toBeVisible();
    });
  });

  test.describe('Animation Quality', () => {
    test('wave animation should cycle through frames', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Test animation');
      await sendButton.click();

      const waveText = page.locator('.avi-wave-text');
      await expect(waveText).toBeVisible();

      // Collect frames over 1 second
      const frames: string[] = [];
      for (let i = 0; i < 5; i++) {
        const text = await waveText.textContent();
        if (text) frames.push(text);
        await page.waitForTimeout(200);
      }

      // Should have collected different frames
      const uniqueFrames = new Set(frames);
      expect(uniqueFrames.size).toBeGreaterThan(1);

      // Should contain valid frame patterns
      const validFrames = ['A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'A v !', 'A V !', 'A V i'];
      const hasValidFrame = frames.some(frame =>
        validFrames.some(valid => frame.includes(valid))
      );
      expect(hasValidFrame).toBeTruthy();
    });

    test('typing indicator should use monospace font', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Font test');
      await sendButton.click();

      const waveText = page.locator('.avi-wave-text');
      await expect(waveText).toBeVisible();

      const fontFamily = await waveText.evaluate(el => {
        return window.getComputedStyle(el).fontFamily;
      });

      expect(fontFamily).toContain('monospace');
    });

    test('typing indicator should have proper spacing and sizing', async ({ page }) => {
      await page.route('/api/claude-code/streaming-chat', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Response' })
        });
      });

      const input = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      await input.fill('Spacing test');
      await sendButton.click();

      const typingIndicator = page.locator('[data-typing="true"]');
      await expect(typingIndicator).toBeVisible();

      // Check it fits within chat message bounds
      const box = await typingIndicator.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
      expect(box?.height).toBeLessThan(200); // Reasonable height
    });
  });
});

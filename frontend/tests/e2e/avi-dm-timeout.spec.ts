/**
 * @test Avi DM Chat Timeout - E2E Tests
 * @description End-to-end tests for Avi DM chat timeout fix using Playwright
 * @prerequisites
 *   - Frontend dev server running (http://localhost:5173)
 *   - Backend API server running (http://localhost:3001)
 *   - Real Claude Code SDK configured
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Avi DM Chat Timeout - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Basic Chat Functionality', () => {
    test('should load page, type message, click send, see response', async ({ page }) => {
      // Navigate to Avi DM tab
      const aviTab = page.locator('button:has-text("Avi DM")');
      await expect(aviTab).toBeVisible();
      await aviTab.click();

      // Wait for chat interface
      await expect(page.locator('text=Chat with Λvi')).toBeVisible();

      // Type message
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await expect(messageInput).toBeVisible();
      await messageInput.fill('hello');

      // Click send
      const sendButton = page.locator('button:has-text("Send")');
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      // Wait for response (max 30s)
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 30000
      });

      // Verify message was sent
      const userMessage = page.locator('[class*="bg-blue-100"]').last();
      await expect(userMessage).toContainText('hello');

      // Verify response received
      const aviResponse = page.locator('[class*="bg-white text-gray-900"]').last();
      await expect(aviResponse).not.toBeEmpty();
    });

    test('should show loading indicator while waiting for response', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      // Type and send message
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await messageInput.fill('what directory are you in?');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Should show "Sending..." immediately
      await expect(page.locator('button:has-text("Sending...")')).toBeVisible({
        timeout: 1000
      });

      // Input should be disabled while sending
      await expect(messageInput).toBeDisabled();

      // Wait for response
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 30000
      });

      // Should re-enable after response
      await expect(messageInput).toBeEnabled();
      await expect(sendButton).toHaveText('Send');
    });

    test('should display user-friendly error message on timeout', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      // Simulate timeout by sending very complex request
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await messageInput.fill('analyze every single file in the entire codebase with full details');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for either success or error response
      await page.waitForSelector('[class*="bg-white text-gray-900"]', {
        timeout: 120000 // Wait up to 2 minutes
      });

      // Check if error message is shown (if timeout occurred)
      const lastResponse = page.locator('[class*="bg-white text-gray-900"]').last();
      const responseText = await lastResponse.textContent();

      // If error occurred, should be user-friendly
      if (responseText?.includes('error')) {
        expect(responseText.toLowerCase()).toMatch(/error|timeout|failed/i);
        expect(responseText.toLowerCase()).toMatch(/try again|please retry/i);
      } else {
        // Success - response should not be empty
        expect(responseText).toBeTruthy();
        expect(responseText!.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Real Claude Response Verification', () => {
    test('should receive real Claude Code response (not mock)', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      // Send message
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await messageInput.fill('what is 2+2?');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      const aviResponse = page.locator('[class*="bg-white text-gray-900"]').last();
      await expect(aviResponse).toBeVisible({ timeout: 30000 });

      // Get response text
      const responseText = await aviResponse.textContent();

      // Should not contain mock indicators
      expect(responseText).not.toMatch(/Thanks for your message/i);
      expect(responseText).not.toMatch(/simulated/i);
      expect(responseText).not.toMatch(/mock/i);

      // Should contain actual answer
      expect(responseText?.toLowerCase()).toContain('4');
    });

    test('should handle contextual conversation', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const messageInput = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // First message
      await messageInput.fill('my favorite color is blue');
      await sendButton.click();

      // Wait for first response
      await expect(page.locator('[class*="bg-white text-gray-900"]').first()).toBeVisible({
        timeout: 30000
      });

      // Second message referencing first
      await messageInput.fill('what is my favorite color?');
      await sendButton.click();

      // Wait for second response
      await expect(page.locator('[class*="bg-white text-gray-900"]').nth(1)).toBeVisible({
        timeout: 30000
      });

      // Should remember context
      const secondResponse = await page.locator('[class*="bg-white text-gray-900"]').nth(1).textContent();
      expect(secondResponse?.toLowerCase()).toContain('blue');
    });

    test('should identify as Λvi (not generic Claude)', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      // Ask identity question
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await messageInput.fill('who are you?');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      const aviResponse = page.locator('[class*="bg-white text-gray-900"]').last();
      await expect(aviResponse).toBeVisible({ timeout: 30000 });

      // Get response text
      const responseText = await aviResponse.textContent();

      // Should NOT identify as generic Claude
      expect(responseText?.toLowerCase()).not.toMatch(/i am claude/i);
      expect(responseText?.toLowerCase()).not.toMatch(/i'm claude/i);

      // Should reference Avi identity
      expect(
        responseText?.toLowerCase().includes('avi') ||
        responseText?.toLowerCase().includes('λvi') ||
        responseText?.toLowerCase().includes('chief of staff')
      ).toBe(true);
    });
  });

  test.describe('Timeout Prevention Tests', () => {
    test('should not timeout on fast message (5-10s)', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const startTime = Date.now();

      // Send fast message
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await messageInput.fill('hello');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 20000 // Should complete within 20s
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Fast message completed in ${duration}ms`);

      // Verify no timeout error
      const lastResponse = await page.locator('[class*="bg-white text-gray-900"]').last().textContent();
      expect(lastResponse).not.toMatch(/timeout|timed out/i);
    });

    test('should not timeout on medium message (10-20s)', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const startTime = Date.now();

      // Send medium complexity message
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await messageInput.fill('what directory are you in?');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 40000 // Should complete within 40s
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Medium message completed in ${duration}ms`);

      // Verify no timeout error
      const lastResponse = await page.locator('[class*="bg-white text-gray-900"]').last().textContent();
      expect(lastResponse).not.toMatch(/timeout|timed out/i);
    });

    test('should not timeout on slow message (30-60s)', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const startTime = Date.now();

      // Send slow/complex message
      const messageInput = page.locator('input[placeholder*="Type your message"]');
      await messageInput.fill('analyze all files in /workspaces/agent-feed/prod');

      const sendButton = page.locator('button:has-text("Send")');
      await sendButton.click();

      // Wait for response (extended timeout)
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 120000 // 2 minutes - Vite proxy should support this
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Slow message completed in ${duration}ms`);

      // Verify no timeout error
      const lastResponse = await page.locator('[class*="bg-white text-gray-900"]').last().textContent();
      expect(lastResponse).not.toMatch(/timeout|timed out/i);
      expect(lastResponse).not.toMatch(/error/i);
    });
  });

  test.describe('Chat History Tests', () => {
    test('should display chat history correctly', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const messageInput = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send first message
      await messageInput.fill('hello');
      await sendButton.click();
      await expect(page.locator('[class*="bg-white text-gray-900"]').first()).toBeVisible({
        timeout: 30000
      });

      // Send second message
      await messageInput.fill('goodbye');
      await sendButton.click();
      await expect(page.locator('[class*="bg-white text-gray-900"]').nth(1)).toBeVisible({
        timeout: 30000
      });

      // Check chat history
      const userMessages = page.locator('[class*="bg-blue-100"]');
      const aviMessages = page.locator('[class*="bg-white text-gray-900"]');

      await expect(userMessages).toHaveCount(2);
      await expect(aviMessages).toHaveCount(2);

      // Verify order
      const firstUserMsg = await userMessages.first().textContent();
      const secondUserMsg = await userMessages.nth(1).textContent();

      expect(firstUserMsg).toContain('hello');
      expect(secondUserMsg).toContain('goodbye');
    });

    test('should clear input after sending', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const messageInput = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Type and send message
      await messageInput.fill('test message');
      await sendButton.click();

      // Input should be cleared immediately
      await expect(messageInput).toHaveValue('');

      // Wait for response to complete
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 30000
      });
    });
  });

  test.describe('Error Recovery Tests', () => {
    test('should allow retry after error', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const messageInput = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Try sending message
      await messageInput.fill('test message');
      await sendButton.click();

      // Wait for response (success or error)
      await page.waitForSelector('[class*="bg-white text-gray-900"]', {
        timeout: 60000
      });

      // Check if error occurred
      const firstResponse = await page.locator('[class*="bg-white text-gray-900"]').last().textContent();

      if (firstResponse?.toLowerCase().includes('error')) {
        // Retry
        await messageInput.fill('retry message');
        await sendButton.click();

        // Should allow retry
        await expect(page.locator('[class*="bg-white text-gray-900"]').nth(1)).toBeVisible({
          timeout: 30000
        });
      }

      // Interface should be functional
      await expect(messageInput).toBeEnabled();
      await expect(sendButton).toBeEnabled();
    });

    test('should maintain UI responsiveness during long requests', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const messageInput = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send slow request
      await messageInput.fill('analyze all TypeScript files');
      await sendButton.click();

      // UI should remain responsive (buttons should be clickable)
      const quickPostTab = page.locator('button:has-text("Quick Post")');
      await expect(quickPostTab).toBeVisible();
      await expect(quickPostTab).toBeEnabled();

      // Can switch tabs while waiting
      await quickPostTab.click();
      await expect(page.locator('text=Quick Post')).toBeVisible();

      // Can switch back to Avi tab
      await page.locator('button:has-text("Avi DM")').click();

      // Wait for response to complete
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 120000
      });
    });
  });

  test.describe('Visual Validation', () => {
    test('should display messages with correct styling', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const messageInput = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send message
      await messageInput.fill('hello');
      await sendButton.click();

      // Wait for response
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 30000
      });

      // Check user message styling (blue background)
      const userMessage = page.locator('[class*="bg-blue-100"]').last();
      await expect(userMessage).toHaveCSS('background-color', /rgb.*blue.*/i);

      // Check Avi message styling (white background)
      const aviMessage = page.locator('[class*="bg-white text-gray-900"]').last();
      await expect(aviMessage).toBeVisible();

      // Check timestamp is displayed
      const timestamp = userMessage.locator('text=/\\d{1,2}:\\d{2}/');
      await expect(timestamp).toBeVisible();
    });

    test('should show loading state visually', async ({ page }) => {
      // Navigate to Avi DM tab
      await page.locator('button:has-text("Avi DM")').click();

      const messageInput = page.locator('input[placeholder*="Type your message"]');
      const sendButton = page.locator('button:has-text("Send")');

      // Send message
      await messageInput.fill('test');
      await sendButton.click();

      // Check button text changed to "Sending..."
      await expect(page.locator('button:has-text("Sending...")')).toBeVisible({
        timeout: 1000
      });

      // Check button is disabled
      await expect(sendButton).toBeDisabled();

      // Wait for completion
      await expect(page.locator('[class*="bg-white text-gray-900"]').last()).toBeVisible({
        timeout: 30000
      });

      // Button should return to normal
      await expect(sendButton).toHaveText('Send');
      await expect(sendButton).toBeEnabled();
    });
  });
});

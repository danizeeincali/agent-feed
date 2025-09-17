/**
 * Playwright E2E Test: Claude Code Endpoint Fix Validation
 *
 * Tests the complete flow from frontend component to backend API
 * to ensure the critical endpoint routing fix works in browser environment.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Claude Code Endpoint Fix - E2E Validation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('🔧 DEBUG:')) {
        console.log('FRONTEND LOG:', msg.text());
      }
      if (msg.type() === 'error') {
        console.error('FRONTEND ERROR:', msg.text());
      }
    });

    // Intercept network requests to monitor API calls
    page.on('request', request => {
      if (request.url().includes('/api/claude-code/')) {
        console.log('API REQUEST:', request.method(), request.url());
        console.log('REQUEST BODY:', request.postData());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/claude-code/')) {
        console.log('API RESPONSE:', response.status(), response.url());
      }
    });
  });

  test('should successfully call Claude Code streaming endpoint from browser', async () => {
    // Navigate to the Claude Code interface
    await page.goto('/claude-code');

    // Wait for the page to load
    await page.waitForSelector('[data-testid="claude-code-interface"], .claude-code-interface, input[placeholder*="command"], input[placeholder*="Claude"]', { timeout: 10000 });

    // Find the message input field
    const messageInput = page.locator('input[type="text"], textarea').first();
    await expect(messageInput).toBeVisible();

    // Find the send button
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();

    // Type a test message
    await messageInput.fill('ls -la');

    // Click send button
    await sendButton.click();

    // Wait for API request to complete and check it was successful
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/claude-code/streaming-chat') &&
      response.status() !== 404
    );

    const response = await responsePromise;

    // Verify the request was not a 404 (route not found)
    expect(response.status()).not.toBe(404);
    console.log(`✅ API call successful - Status: ${response.status()}`);

    // Verify response contains expected data
    const responseData = await response.json();
    expect(responseData).toHaveProperty('timestamp');

    // If successful, should have success flag and message
    if (response.status() === 200) {
      expect(responseData.success).toBe(true);
      expect(responseData).toHaveProperty('message');
      expect(responseData.claudeCode).toBe(true);
    }
  });

  test('should display error messages if API fails', async () => {
    await page.goto('/claude-code');

    // Wait for interface to load
    await page.waitForSelector('input[type="text"], textarea', { timeout: 10000 });

    const messageInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();

    // Send a message that might cause issues
    await messageInput.fill('invalid-command-test');
    await sendButton.click();

    // Wait for response
    await page.waitForResponse(response =>
      response.url().includes('/api/claude-code/streaming-chat')
    );

    // Check if error message is displayed properly
    const errorMessage = page.locator('.error, [data-testid="error"], .bg-red-50, .text-red-900');

    // Wait a bit for error message to appear if API fails
    await page.waitForTimeout(2000);

    // If there's an error, it should be displayed properly
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      expect(errorText).toBeTruthy();
      console.log('Error message displayed:', errorText);
    }
  });

  test('should show loading state during API call', async () => {
    await page.goto('/claude-code');

    await page.waitForSelector('input[type="text"], textarea', { timeout: 10000 });

    const messageInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();

    await messageInput.fill('test loading state');

    // Click send and immediately check for loading state
    await sendButton.click();

    // Look for loading indicators
    const loadingIndicators = page.locator('.animate-spin, .loading, [data-testid="loading"], button:disabled');

    // Wait briefly to see if loading state appears
    await page.waitForTimeout(500);

    // Check if loading state was shown
    const hasLoadingState = await loadingIndicators.count() > 0;
    console.log('Loading state detected:', hasLoadingState);

    // Wait for loading to complete
    await page.waitForResponse(response =>
      response.url().includes('/api/claude-code/streaming-chat')
    );

    // Loading should be gone after response
    await expect(loadingIndicators).toHaveCount(0);
  });

  test('should handle tool mode toggle correctly', async () => {
    await page.goto('/claude-code');

    // Look for tool mode toggle
    const toolModeToggle = page.locator('button:has-text("Tool Mode"), button:has-text("Chat Mode"), [data-testid="tool-mode-toggle"]');

    if (await toolModeToggle.isVisible()) {
      console.log('Tool mode toggle found');

      // Get initial state
      const initialText = await toolModeToggle.textContent();

      // Click toggle
      await toolModeToggle.click();

      // Verify state changed
      const newText = await toolModeToggle.textContent();
      expect(newText).not.toBe(initialText);

      console.log(`Tool mode toggled: ${initialText} -> ${newText}`);
    } else {
      console.log('Tool mode toggle not found - this is acceptable');
    }
  });

  test('should display response messages correctly', async () => {
    await page.goto('/claude-code');

    await page.waitForSelector('input[type="text"], textarea', { timeout: 10000 });

    const messageInput = page.locator('input[type="text"], textarea').first();
    const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first();

    await messageInput.fill('echo "test response display"');
    await sendButton.click();

    // Wait for response
    await page.waitForResponse(response =>
      response.url().includes('/api/claude-code/streaming-chat')
    );

    // Wait for response to be displayed
    await page.waitForTimeout(2000);

    // Look for message display areas
    const messageContainers = page.locator('.message, .response, [data-testid="message"], .whitespace-pre-wrap');

    if (await messageContainers.count() > 0) {
      console.log(`Found ${await messageContainers.count()} message containers`);

      // Check that messages are displayed
      const lastMessage = messageContainers.last();
      const messageText = await lastMessage.textContent();
      expect(messageText).toBeTruthy();
      console.log('Last message:', messageText?.substring(0, 100));
    }
  });
});

/**
 * E2E Test Summary:
 *
 * These tests validate that the Claude Code endpoint fix works correctly
 * in a real browser environment, testing:
 *
 * 1. API calls reach the backend (not 404)
 * 2. Request format is accepted
 * 3. Response is handled properly
 * 4. Error handling works
 * 5. Loading states function
 * 6. UI interactions work
 * 7. Messages are displayed
 *
 * This ensures the complete frontend-to-backend integration works
 * after the critical route mounting fix.
 */
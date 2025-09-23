import { test, expect } from '@playwright/test';
import { AviChatPage } from '../page-objects/AviChatPage';
import { PostingInterfacePage } from '../page-objects/PostingInterfacePage';
import { TestHelpers } from '../utils/test-helpers';
import { testMessages, performanceThresholds } from '../fixtures/test-data';

test.describe('Avi DM Chat Flow', () => {
  let chatPage: AviChatPage;
  let postingInterface: PostingInterfacePage;

  test.beforeEach(async ({ page }) => {
    chatPage = new AviChatPage(page);
    postingInterface = new PostingInterfacePage(page);

    // Setup mock API for consistent testing
    await TestHelpers.setupMockAPI(page, 'success');

    // Navigate to chat
    await postingInterface.navigateToPostingInterface();
    await postingInterface.switchToTab('avi');
  });

  test.afterEach(async ({ page }) => {
    await TestHelpers.clearMockAPI(page);
  });

  test('should display Avi greeting on first load', async () => {
    await expect(chatPage.aviGreeting).toBeVisible();
    await expect(chatPage.aviGreeting).toContainText('Hello! I\'m Avi');

    // Verify initial connection status
    await chatPage.waitForConnectionStatus('disconnected');
  });

  test('should send a simple message successfully', async ({ page }) => {
    const message = testMessages.simple.greeting;
    const startTime = Date.now();

    // Send message
    await chatPage.sendMessage(message);

    // Verify message appears in chat
    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toContainText(message);

    // Wait for response
    await chatPage.waitForResponse();

    // Verify response received
    const messageCount = await chatPage.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(2);

    // Check performance
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(performanceThresholds.messageResponse);
  });

  test('should handle Enter key for message sending', async () => {
    const message = testMessages.simple.question;

    await chatPage.sendMessageWithEnter(message);

    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toContainText(message);

    await chatPage.waitForResponse();
  });

  test('should show typing indicator during response', async () => {
    await chatPage.sendMessage(testMessages.simple.codeRequest);

    // Verify typing indicator appears
    await expect(chatPage.typingIndicator).toBeVisible();

    // Wait for response and verify indicator disappears
    await chatPage.waitForResponse();
    await expect(chatPage.typingIndicator).toBeHidden();
  });

  test('should handle long messages correctly', async () => {
    const longMessage = testMessages.simple.longMessage;

    await chatPage.sendMessage(longMessage);

    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toContainText(longMessage);

    // Verify message formatting and wrapping
    const messageElement = await lastMessage.boundingBox();
    expect(messageElement?.width).toBeGreaterThan(0);
  });

  test('should update connection status appropriately', async () => {
    // Initial state
    await chatPage.waitForConnectionStatus('disconnected');

    // Send message and check connecting state
    await chatPage.sendMessage(testMessages.simple.greeting);
    await chatPage.waitForConnectionStatus('connecting');

    // Wait for connected state after response
    await chatPage.waitForResponse();
    await chatPage.waitForConnectionStatus('connected');
  });

  test('should preserve message history across tab switches', async () => {
    // Send a message
    await chatPage.sendMessage(testMessages.simple.greeting);
    await chatPage.waitForResponse();

    const initialMessageCount = await chatPage.getMessageCount();

    // Switch to another tab and back
    await postingInterface.switchToTab('quick');
    await postingInterface.switchToTab('avi');

    // Verify messages are preserved
    const currentMessageCount = await chatPage.getMessageCount();
    expect(currentMessageCount).toBe(initialMessageCount);
  });

  test('should handle multiline messages', async () => {
    const multilineMessage = testMessages.complex.multiline;

    await chatPage.sendMessage(multilineMessage);

    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toContainText('Line 1');
    await expect(lastMessage).toContainText('Line 2');
    await expect(lastMessage).toContainText('Line 3');
  });

  test('should handle messages with emojis', async () => {
    const emojiMessage = testMessages.complex.withEmojis;

    await chatPage.sendMessage(emojiMessage);

    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toContainText('👋');
    await expect(lastMessage).toContainText('🤖');
  });

  test('should handle special characters correctly', async () => {
    const specialCharsMessage = testMessages.complex.withSpecialChars;

    await chatPage.sendMessage(specialCharsMessage);

    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toContainText(specialCharsMessage);
  });

  test('should display message timestamps', async () => {
    await chatPage.sendMessage(testMessages.simple.greeting);

    const lastMessage = await chatPage.getLastMessage();
    const timestamp = lastMessage.locator('.text-xs');

    await expect(timestamp).toBeVisible();

    const timestampText = await timestamp.textContent();
    expect(timestampText).toMatch(/\d{1,2}:\d{2}/); // Basic time format check
  });

  test('should show message status indicators', async () => {
    await chatPage.sendMessage(testMessages.simple.greeting);

    const lastMessage = await chatPage.getLastMessage();
    const statusIndicator = lastMessage.locator('[class*="rounded-full"]');

    await expect(statusIndicator).toBeVisible();

    // Should start as sending (yellow) and change to sent (green)
    await chatPage.waitForResponse();

    const statusClass = await statusIndicator.getAttribute('class');
    expect(statusClass).toContain('bg-green-400'); // Sent status
  });

  test('should maintain focus management', async ({ page }) => {
    // Send a message
    await chatPage.sendMessage(testMessages.simple.greeting);

    // Focus should return to input after sending
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBe(chatPage.messageInput);
  });

  test('should auto-scroll to latest message', async () => {
    // Send multiple messages to trigger scrolling
    for (let i = 0; i < 5; i++) {
      await chatPage.sendMessage(`Test message ${i + 1}`);
      await chatPage.waitForResponse();
    }

    // Verify the last message is visible
    const lastMessage = await chatPage.getLastMessage();
    await expect(lastMessage).toBeInViewport();
  });

  test('should handle rapid message sending', async () => {
    const messages = [
      'Message 1',
      'Message 2',
      'Message 3'
    ];

    // Send messages rapidly
    for (const message of messages) {
      await chatPage.messageInput.fill(message);
      await chatPage.sendButton.click();
    }

    // Verify all messages appear
    for (const message of messages) {
      await expect(chatPage.messagesContainer).toContainText(message);
    }
  });
});
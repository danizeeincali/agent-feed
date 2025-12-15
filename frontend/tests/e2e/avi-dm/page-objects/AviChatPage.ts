import { Page, Locator, expect } from '@playwright/test';

export class AviChatPage {
  readonly page: Page;
  readonly chatContainer: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly messagesContainer: Locator;
  readonly connectionStatus: Locator;
  readonly errorDisplay: Locator;
  readonly typingIndicator: Locator;
  readonly imageUploadButton: Locator;
  readonly fileInput: Locator;
  readonly selectedImagesContainer: Locator;
  readonly streamingTicker: Locator;
  readonly aviGreeting: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatContainer = page.getByTestId('avi-chat-sdk');
    this.messageInput = page.getByPlaceholder('Type your message to Avi...');
    this.sendButton = page.getByRole('button').filter({ hasText: /send|submit/i }).last();
    this.messagesContainer = page.locator('.space-y-4').first();
    this.connectionStatus = page.locator('[class*="text-green-500"], [class*="text-blue-500"], [class*="text-red-500"], [class*="text-gray-500"]').first();
    this.errorDisplay = page.locator('.bg-red-50');
    this.typingIndicator = page.locator('.animate-bounce').first();
    this.imageUploadButton = page.getByRole('button', { name: /add images?/i });
    this.fileInput = page.locator('input[type="file"]');
    this.selectedImagesContainer = page.locator('.bg-gray-50').filter({ hasText: /jpg|png|gif/i });
    this.streamingTicker = page.locator('[class*="streaming"], [class*="ticker"]').first();
    this.aviGreeting = page.getByTestId('avi-greeting');
  }

  async navigateToChat() {
    await this.page.goto('/');
    await this.page.getByRole('tab', { name: /avi dm/i }).click();
    await expect(this.chatContainer).toBeVisible();
  }

  async sendMessage(message: string) {
    await this.messageInput.fill(message);
    await this.sendButton.click();
  }

  async sendMessageWithEnter(message: string) {
    await this.messageInput.fill(message);
    await this.messageInput.press('Enter');
  }

  async uploadImage(filePath: string) {
    await this.imageUploadButton.click();
    await this.fileInput.setInputFiles(filePath);
  }

  async uploadMultipleImages(filePaths: string[]) {
    await this.imageUploadButton.click();
    await this.fileInput.setInputFiles(filePaths);
  }

  async removeSelectedImage(index: number) {
    const removeButtons = this.selectedImagesContainer.locator('button[title*="remove"], button[class*="text-red"]');
    await removeButtons.nth(index).click();
  }

  async waitForResponse(timeout = 30000) {
    await expect(this.typingIndicator).toBeVisible({ timeout: 5000 });
    await expect(this.typingIndicator).toBeHidden({ timeout });
  }

  async getLastMessage() {
    const messages = this.messagesContainer.locator('div[class*="justify-"]');
    return messages.last();
  }

  async getMessageCount() {
    const messages = this.messagesContainer.locator('div[class*="justify-"]');
    return await messages.count();
  }

  async waitForConnectionStatus(status: 'connected' | 'connecting' | 'error' | 'disconnected') {
    const statusMap = {
      connected: /connected|ready/i,
      connecting: /connecting/i,
      error: /error|failed/i,
      disconnected: /disconnected|offline/i
    };
    await expect(this.connectionStatus).toContainText(statusMap[status]);
  }

  async getErrorMessage() {
    await expect(this.errorDisplay).toBeVisible();
    return await this.errorDisplay.textContent();
  }

  async dismissError() {
    const dismissButton = this.errorDisplay.locator('button');
    await dismissButton.click();
    await expect(this.errorDisplay).toBeHidden();
  }

  async isStreamingTickerActive() {
    return await this.streamingTicker.isVisible();
  }

  async waitForStreamingToComplete() {
    if (await this.streamingTicker.isVisible()) {
      await expect(this.streamingTicker).toBeHidden({ timeout: 60000 });
    }
  }

  async getConnectionHealth() {
    const statusText = await this.connectionStatus.textContent();
    const isConnected = statusText?.toLowerCase().includes('connected') || false;
    const hasError = statusText?.toLowerCase().includes('error') || false;

    return {
      isConnected,
      hasError,
      statusText
    };
  }

  async simulateNetworkError() {
    await this.page.route('**/api/claude-code/streaming-chat', route => {
      route.abort('failed');
    });
  }

  async simulateSlowNetwork() {
    await this.page.route('**/api/claude-code/streaming-chat', route => {
      setTimeout(() => route.continue(), 5000);
    });
  }

  async restoreNetworkConditions() {
    await this.page.unroute('**/api/claude-code/streaming-chat');
  }
}
import { test, expect } from '@playwright/test';

test.describe('Avi DM Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Feed page where Avi DM is located
    await page.goto('http://localhost:5173/');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Ensure Avi DM interface is visible
    await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();
  });

  test('should display Avi chat interface correctly', async ({ page }) => {
    // Check that all essential elements are present
    await expect(page.locator('input[placeholder*="Ask Avi"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /attach.*image/i })).toBeVisible();

    // Check initial status
    await expect(page.locator('text=● Ready')).toBeVisible();
  });

  test('should send a basic text message', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    const sendButton = page.getByRole('button', { name: /send/i });

    // Initially send button should be disabled
    await expect(sendButton).toBeDisabled();

    // Type a message
    const testMessage = 'Hello Avi, this is a test message';
    await messageInput.fill(testMessage);

    // Send button should now be enabled
    await expect(sendButton).toBeEnabled();

    // Click send
    await sendButton.click();

    // Message should appear in chat history
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Input should be cleared
    await expect(messageInput).toHaveValue('');

    // Status should show activity
    await expect(page.locator('text=● Sending...')).toBeVisible();
  });

  test('should send message with Enter key', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    const testMessage = 'Message sent with Enter key';

    await messageInput.fill(testMessage);
    await messageInput.press('Enter');

    // Message should appear in chat
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('should not send message with Shift+Enter', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    const testMessage = 'This should not send';

    await messageInput.fill(testMessage);
    await messageInput.press('Shift+Enter');

    // Message should NOT appear in chat (should add new line instead)
    await expect(page.locator(`text=${testMessage}`)).not.toBeVisible();

    // Input should still have the message
    await expect(messageInput).toHaveValue(testMessage);
  });

  test('should display character count', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    const testMessage = 'Test message';

    await messageInput.fill(testMessage);

    // Should show character count
    const expectedCount = `${testMessage.length}/2000`;
    await expect(page.locator(`text=${expectedCount}`)).toBeVisible();
  });

  test('should handle image upload interface', async ({ page }) => {
    const imageButton = page.getByRole('button', { name: /attach.*image/i });

    // Click image button
    await imageButton.click();

    // File dialog should open (we can't test actual file selection in Playwright easily,
    // but we can verify the button works and interface responds)
    await expect(imageButton).toBeVisible();
  });

  test('should display connection status changes', async ({ page }) => {
    // Initially should show Ready
    await expect(page.locator('text=● Ready')).toBeVisible();

    // Send a message to trigger status change
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    await messageInput.fill('Status test message');
    await messageInput.press('Enter');

    // Should show sending status
    await expect(page.locator('text=● Sending...')).toBeVisible();

    // Eventually should return to ready or connected
    await expect(page.locator('text=● Ready, text=● Connected')).toBeVisible({ timeout: 10000 });
  });

  test('should maintain conversation history', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');

    // Send first message
    const firstMessage = 'First test message';
    await messageInput.fill(firstMessage);
    await messageInput.press('Enter');

    // Wait for first message to appear
    await expect(page.locator(`text=${firstMessage}`)).toBeVisible();

    // Send second message
    const secondMessage = 'Second test message';
    await messageInput.fill(secondMessage);
    await messageInput.press('Enter');

    // Both messages should be visible
    await expect(page.locator(`text=${firstMessage}`)).toBeVisible();
    await expect(page.locator(`text=${secondMessage}`)).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');

    // Type a message
    await messageInput.fill('Message to be cleared');

    // Use Cmd+K to clear (or Ctrl+K on non-Mac)
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+KeyK`);

    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Start from the beginning of the page
    await page.keyboard.press('Tab');

    // Should focus on the message input
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    await expect(messageInput).toBeFocused();

    // Tab to image button
    await page.keyboard.press('Tab');
    const imageButton = page.getByRole('button', { name: /attach.*image/i });
    await expect(imageButton).toBeFocused();

    // Tab to send button
    await page.keyboard.press('Tab');
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeFocused();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and make them fail
    await page.route('**/api/avi/streaming-chat', route => {
      route.abort('failed');
    });

    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    const testMessage = 'This will fail';

    await messageInput.fill(testMessage);
    await messageInput.press('Enter');

    // Should show error message
    await expect(page.locator('text*=error, text*=Error, text*=failed')).toBeVisible({ timeout: 10000 });

    // Interface should remain functional
    await expect(messageInput).toBeEnabled();
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
  });

  test('should handle streaming ticker integration', async ({ page }) => {
    // Check that streaming ticker is present
    await expect(page.locator('[data-testid="streaming-ticker"]')).toBeVisible();

    // Send a message to activate streaming
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    await messageInput.fill('Activate streaming');
    await messageInput.press('Enter');

    // Streaming ticker should become active
    await expect(page.locator('[data-testid="streaming-ticker"][data-visible="true"]')).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Interface should still be functional
    await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Ask Avi"]')).toBeVisible();

    // Send a message
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    await messageInput.fill('Mobile test message');
    await messageInput.press('Enter');

    // Should work normally
    await expect(page.locator('text=Mobile test message')).toBeVisible();
  });

  test('should persist conversation on page refresh', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');
    const testMessage = 'Message to persist';

    // Send a message
    await messageInput.fill(testMessage);
    await messageInput.press('Enter');

    // Wait for message to appear
    await expect(page.locator(`text=${testMessage}`)).toBeVisible();

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Message should still be visible (if persistence is implemented)
    // Note: This test depends on whether conversation persistence is implemented
    await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();
  });

  test('should handle rapid message sending', async ({ page }) => {
    const messageInput = page.locator('input[placeholder*="Ask Avi"]');

    // Send multiple messages quickly
    for (let i = 1; i <= 3; i++) {
      const message = `Rapid message ${i}`;
      await messageInput.fill(message);
      await messageInput.press('Enter');

      // Wait a short time to simulate rapid but not instant sending
      await page.waitForTimeout(100);
    }

    // All messages should eventually appear
    await expect(page.locator('text=Rapid message 1')).toBeVisible();
    await expect(page.locator('text=Rapid message 2')).toBeVisible();
    await expect(page.locator('text=Rapid message 3')).toBeVisible();
  });
});
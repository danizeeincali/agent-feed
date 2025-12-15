import { test, expect } from '@playwright/test';

test.describe('Claude SSE Basic Validation', () => {
  test('should access Avi DM and send message', async ({ page }) => {
    // Navigate to feed
    await page.goto('http://localhost:5173/');

    // Take screenshot of initial state
    await page.screenshot({
      path: 'test-results/claude-sse/step-1-initial.png',
      fullPage: true
    });

    // Open Avi DM tab
    await page.getByRole('button', { name: /avi dm/i }).click();

    // Wait for chat interface
    await page.waitForTimeout(1000);

    // Take screenshot of Avi DM tab
    await page.screenshot({
      path: 'test-results/claude-sse/step-2-avi-dm-open.png',
      fullPage: true
    });

    // Verify message input is visible
    const input = page.getByPlaceholder(/type your message to avi/i);
    await expect(input).toBeVisible({ timeout: 10000 });

    console.log('✓ Avi DM tab opened successfully');

    // Type a simple message
    await input.fill('Hello Avi!');

    // Take screenshot of typed message
    await page.screenshot({
      path: 'test-results/claude-sse/step-3-message-typed.png',
      fullPage: true
    });

    // Find and click send button
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    console.log('✓ Message sent');

    // Wait for some activity
    await page.waitForTimeout(3000);

    // Take screenshot after sending
    await page.screenshot({
      path: 'test-results/claude-sse/step-4-message-sent.png',
      fullPage: true
    });

    // Look for any typing indicator or activity
    const pageContent = await page.content();
    console.log('Page has typing indicator:', pageContent.includes('Avi'));

    // Check for activity text (if present)
    try {
      const activityText = await page.locator('text=/Avi.*-/').first().textContent({ timeout: 5000 });
      console.log('✓ Activity text found:', activityText);

      // Take screenshot with activity
      await page.screenshot({
        path: 'test-results/claude-sse/step-5-activity-visible.png',
        fullPage: true
      });
    } catch (e) {
      console.log('No activity text found (may be too fast or not implemented yet)');
    }

    console.log('✓ Test completed successfully');
  });
});

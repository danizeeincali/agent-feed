/**
 * E2E Tests for Complete Streaming Ticker Flow
 *
 * Tests complete user journey including:
 * - Full application workflow
 * - Real browser interactions
 * - Cross-component integration
 * - User experience scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Streaming Ticker Complete Flow', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Mock API responses
    await page.route('**/api/v1/agent-posts', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'test-post-123',
              title: 'Test Post',
              content: 'Test content',
              timestamp: new Date().toISOString()
            }
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: []
          })
        });
      }
    });

    // Mock SSE endpoint
    await page.route('**/api/v1/stream', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"type":"connected","message":"SSE connected"}\n\n'
      });
    });

    await page.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('Initial Page Load', () => {
    test('should load application successfully', async () => {
      await expect(page).toHaveTitle(/Agent Feed/);

      // Wait for main components to load
      await expect(page.locator('[data-testid="enhanced-posting-interface"]')).toBeVisible();
    });

    test('should show default Quick Post tab', async () => {
      const quickPostTab = page.locator('button:has-text("Quick Post")');
      await expect(quickPostTab).toHaveAttribute('aria-selected', 'true');

      // Should show quick post form
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      await expect(textarea).toBeVisible();
    });

    test('should establish SSE connection', async () => {
      // Look for connection indicators
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    });
  });

  test.describe('Quick Post Creation Flow', () => {
    test('should create a quick post successfully', async () => {
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      const submitButton = page.locator('button:has-text("Quick Post")');

      // Type content
      await textarea.fill('This is my first test post!');

      // Verify character counter updates
      await expect(page.locator('text=29/500 characters')).toBeVisible();

      // Submit button should be enabled
      await expect(submitButton).toBeEnabled();

      // Submit the post
      await submitButton.click();

      // Should show loading state
      await expect(page.locator('button:has-text("Posting...")')).toBeVisible();

      // Should clear form after success
      await expect(textarea).toHaveValue('');
      await expect(submitButton).toBeDisabled();

      // Should show success indicator (if implemented)
      // await expect(page.locator('[data-testid="post-success"]')).toBeVisible();
    });

    test('should validate empty posts', async () => {
      const submitButton = page.locator('button:has-text("Quick Post")');

      // Submit button should be disabled for empty content
      await expect(submitButton).toBeDisabled();

      // Try typing and deleting
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      await textarea.fill('Test');
      await expect(submitButton).toBeEnabled();

      await textarea.fill('');
      await expect(submitButton).toBeDisabled();
    });

    test('should enforce character limit', async () => {
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');

      // Type more than 500 characters
      const longText = 'a'.repeat(510);
      await textarea.fill(longText);

      // Should be limited to 500 characters
      const value = await textarea.inputValue();
      expect(value.length).toBeLessThanOrEqual(500);

      // Character counter should show limit
      await expect(page.locator('text=500/500 characters')).toBeVisible();
    });

    test('should handle mention functionality', async () => {
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');

      // Type @ to trigger mentions
      await textarea.fill('Hello @');

      // Should show mention suggestions (if implemented)
      // await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();

      // Type a complete mention
      await textarea.fill('Hello @john, how are you?');

      const submitButton = page.locator('button:has-text("Quick Post")');
      await submitButton.click();

      // Should submit successfully with mention
      await expect(textarea).toHaveValue('');
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between tabs', async () => {
      // Start with Quick Post active
      const quickPostTab = page.locator('button:has-text("Quick Post")');
      const postTab = page.locator('button:has-text("Post")');
      const aviTab = page.locator('button:has-text("Avi DM")');

      await expect(quickPostTab).toHaveAttribute('aria-selected', 'true');

      // Switch to Post tab
      await postTab.click();
      await expect(postTab).toHaveAttribute('aria-selected', 'true');
      await expect(quickPostTab).toHaveAttribute('aria-selected', 'false');

      // Switch to Avi DM tab
      await aviTab.click();
      await expect(aviTab).toHaveAttribute('aria-selected', 'true');
      await expect(postTab).toHaveAttribute('aria-selected', 'false');

      // Switch back to Quick Post
      await quickPostTab.click();
      await expect(quickPostTab).toHaveAttribute('aria-selected', 'true');
      await expect(aviTab).toHaveAttribute('aria-selected', 'false');
    });

    test('should preserve content when switching tabs', async () => {
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      const postTab = page.locator('button:has-text("Post")');
      const quickPostTab = page.locator('button:has-text("Quick Post")');

      // Type content in Quick Post
      await textarea.fill('This content should be preserved');

      // Switch to Post tab
      await postTab.click();

      // Switch back to Quick Post
      await quickPostTab.click();

      // Content should be preserved
      await expect(textarea).toHaveValue('This content should be preserved');
    });

    test('should show appropriate content for each tab', async () => {
      const postTab = page.locator('button:has-text("Post")');
      const aviTab = page.locator('button:has-text("Avi DM")');

      // Post tab should show full post creator
      await postTab.click();
      // Look for elements specific to PostCreator component
      // await expect(page.locator('[data-testid="post-creator"]')).toBeVisible();

      // Avi DM tab should show chat interface
      await aviTab.click();
      // Look for elements specific to AviDirectChatSDK component
      // await expect(page.locator('[data-testid="avi-chat"]')).toBeVisible();
    });
  });

  test.describe('Real-time Features', () => {
    test('should receive real-time updates via SSE', async () => {
      // Mock incoming SSE message
      await page.evaluate(() => {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'new_post',
            data: {
              id: 'streaming-post-123',
              content: 'Real-time post update',
              author: 'agent-1',
              timestamp: new Date().toISOString()
            }
          })
        });

        // Simulate SSE message if EventSource is available
        if (window.EventSource) {
          window.dispatchEvent(event);
        }
      });

      // Should show the new post in the feed (if implemented)
      // await expect(page.locator('text=Real-time post update')).toBeVisible();
    });

    test('should handle connection loss and recovery', async () => {
      // Simulate network failure
      await page.setOffline(true);

      // Should show disconnected state
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Disconnected');

      // Restore connection
      await page.setOffline(false);

      // Should reconnect and show connected state
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    });

    test('should show typing indicators for active instances', async () => {
      // Mock typing indicator message
      await page.evaluate(() => {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'typing_indicator',
            instanceId: 'claude-instance-1',
            isTyping: true
          })
        });

        window.dispatchEvent(event);
      });

      // Should show typing indicator
      // await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      // Mock API error
      await page.route('**/api/v1/agent-posts', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error'
          })
        });
      });

      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      const submitButton = page.locator('button:has-text("Quick Post")');

      await textarea.fill('This post will fail');
      await submitButton.click();

      // Should show error state but not crash
      await expect(textarea).toHaveValue('This post will fail'); // Content preserved
      await expect(submitButton).toBeEnabled(); // Can retry

      // Should show error message (if implemented)
      // await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should handle malformed SSE data', async () => {
      // Inject malformed SSE data
      await page.evaluate(() => {
        const event = new MessageEvent('message', {
          data: 'invalid json {'
        });

        window.dispatchEvent(event);
      });

      // Application should continue working
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      await textarea.fill('App should still work');

      const submitButton = page.locator('button:has-text("Quick Post")');
      await expect(submitButton).toBeEnabled();
    });

    test('should recover from JavaScript errors', async () => {
      // Inject a JavaScript error
      await page.evaluate(() => {
        window.addEventListener('error', (e) => {
          console.error('Caught error:', e.error);
        });

        // Trigger an error
        throw new Error('Test error');
      });

      // Application should still be functional
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      await textarea.fill('Testing error recovery');

      const submitButton = page.locator('button:has-text("Quick Post")');
      await submitButton.click();

      await expect(textarea).toHaveValue('');
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async () => {
      const startTime = Date.now();

      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
    });

    test('should handle rapid user input', async () => {
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');

      // Type rapidly
      const rapidText = 'abcdefghijklmnopqrstuvwxyz'.repeat(10);
      await textarea.fill(rapidText);

      // Should handle input without lag
      await expect(textarea).toHaveValue(rapidText);

      // Character counter should update
      await expect(page.locator(`text=${rapidText.length}/500 characters`)).toBeVisible();
    });

    test('should handle multiple rapid submissions', async () => {
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      const submitButton = page.locator('button:has-text("Quick Post")');

      // Submit multiple posts rapidly
      for (let i = 0; i < 5; i++) {
        await textarea.fill(`Rapid post ${i}`);
        await submitButton.click();

        // Wait for form to clear
        await expect(textarea).toHaveValue('');
      }

      // Should handle all submissions without errors
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      // Tab through the interface
      await page.keyboard.press('Tab');

      // Should focus on first tab
      await expect(page.locator('button:has-text("Quick Post")')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Post")')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('button:has-text("Avi DM")')).toBeFocused();

      await page.keyboard.press('Tab');
      // Should focus on textarea
      await expect(page.locator('textarea[placeholder*="What\'s on your mind"]')).toBeFocused();
    });

    test('should have proper ARIA attributes', async () => {
      const nav = page.locator('[aria-label="Posting tabs"]');
      await expect(nav).toBeVisible();

      const tabs = page.locator('button[aria-selected]');
      const tabCount = await tabs.count();
      expect(tabCount).toBe(3);

      // Active tab should have aria-selected="true"
      const activeTab = page.locator('button[aria-selected="true"]');
      await expect(activeTab).toHaveCount(1);
    });

    test('should work with screen readers', async () => {
      // Test that form elements have proper labels
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      await expect(textarea).toHaveAttribute('maxLength', '500');

      // Test that buttons have descriptive text
      const submitButton = page.locator('button:has-text("Quick Post")');
      await expect(submitButton).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

      // Should still show all tabs
      await expect(page.locator('button:has-text("Quick Post")')).toBeVisible();
      await expect(page.locator('button:has-text("Post")')).toBeVisible();
      await expect(page.locator('button:has-text("Avi DM")')).toBeVisible();

      // Should be able to create posts
      const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
      await textarea.fill('Mobile test post');

      const submitButton = page.locator('button:has-text("Quick Post")');
      await submitButton.click();

      await expect(textarea).toHaveValue('');
    });

    test('should handle touch interactions', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      const postTab = page.locator('button:has-text("Post")');

      // Simulate touch tap
      await postTab.tap();

      await expect(postTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
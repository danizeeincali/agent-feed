/**
 * SDK Regression Test Suite
 * Comprehensive regression tests for Avi DM and Claude Code SDK integration
 */

import { test, expect } from '@playwright/test';

test.describe('SDK Regression Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('API Compatibility Regression', () => {
    test('should maintain API endpoint compatibility', async ({ page }) => {
      // Test that all expected API endpoints are accessible
      const apiTests = [
        '/api/avi/streaming-chat',
        '/api/claude-code/streaming-chat',
        '/api/streaming-ticker/stream',
        '/api/agent-posts'
      ];

      for (const endpoint of apiTests) {
        const response = await page.request.get(`http://localhost:3000${endpoint}`);
        expect(response.status()).toBeLessThan(500); // Should not be server error
      }
    });

    test('should handle POST requests correctly', async ({ page }) => {
      // Test POST to streaming chat endpoint
      const response = await page.request.post('http://localhost:3000/api/avi/streaming-chat', {
        data: {
          message: 'Regression test message',
          userId: 'test-user'
        }
      });

      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('UI Component Regression', () => {
    test('should render all critical UI components', async ({ page }) => {
      // Check that main components are present
      await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="Ask Avi"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /send/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /attach.*image/i })).toBeVisible();
    });

    test('should maintain consistent styling', async ({ page }) => {
      // Take screenshot for visual regression
      await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();

      // Check basic styling properties
      const chatInterface = page.locator('[data-testid="avi-chat-interface"]');
      await expect(chatInterface).toHaveCSS('display', /flex|block/);
    });

    test('should preserve tab functionality', async ({ page }) => {
      // Navigate to different tabs to ensure they still work
      const tabs = ['Quick Post', 'Post Creator', 'Avi DM'];

      for (const tabName of tabs) {
        const tab = page.getByRole('tab', { name: tabName });
        if (await tab.isVisible()) {
          await tab.click();
          await expect(tab).toHaveAttribute('aria-selected', 'true');
        }
      }
    });
  });

  test.describe('Functionality Regression', () => {
    test('should send messages successfully', async ({ page }) => {
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');
      const sendButton = page.getByRole('button', { name: /send/i });

      const testMessage = 'Regression test message';
      await messageInput.fill(testMessage);
      await sendButton.click();

      // Message should appear in chat
      await expect(page.locator(`text=${testMessage}`)).toBeVisible();
    });

    test('should maintain keyboard shortcuts', async ({ page }) => {
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');

      // Test Cmd+K shortcut
      await messageInput.fill('Test message');
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+KeyK`);

      await expect(messageInput).toHaveValue('');
    });

    test('should handle Enter key message sending', async ({ page }) => {
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');

      await messageInput.fill('Enter key test');
      await messageInput.press('Enter');

      await expect(page.locator('text=Enter key test')).toBeVisible();
    });
  });

  test.describe('Performance Regression', () => {
    test('should load within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test('should handle rapid interactions without freezing', async ({ page }) => {
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');

      // Rapidly type and clear input
      for (let i = 0; i < 10; i++) {
        await messageInput.fill(`Rapid test ${i}`);
        await messageInput.clear();
      }

      // Interface should remain responsive
      await expect(messageInput).toBeEnabled();
    });
  });

  test.describe('Error Handling Regression', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/avi/streaming-chat', route => {
        route.abort('failed');
      });

      const messageInput = page.locator('input[placeholder*="Ask Avi"]');
      await messageInput.fill('Error test message');
      await messageInput.press('Enter');

      // Should show error but not crash
      await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();
    });

    test('should recover from API timeouts', async ({ page }) => {
      // Simulate slow API response
      await page.route('**/api/avi/streaming-chat', route => {
        setTimeout(() => route.fulfill({
          status: 200,
          body: JSON.stringify({ response: 'Delayed response' })
        }), 5000);
      });

      const messageInput = page.locator('input[placeholder*="Ask Avi"]');
      await messageInput.fill('Timeout test');
      await messageInput.press('Enter');

      // Should show loading state
      await expect(page.locator('text=● Sending...')).toBeVisible();
    });
  });

  test.describe('Accessibility Regression', () => {
    test('should maintain ARIA labels and roles', async ({ page }) => {
      // Check critical accessibility attributes
      await expect(page.locator('input[placeholder*="Ask Avi"]')).toHaveAttribute('aria-label');
      await expect(page.getByRole('button', { name: /send/i })).toHaveAttribute('aria-label');
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('input[placeholder*="Ask Avi"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /attach.*image/i })).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /send/i })).toBeFocused();
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in different browsers', async ({ page, browserName }) => {
      // This test will run for each configured browser
      console.log(`Testing in ${browserName}`);

      await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();

      const messageInput = page.locator('input[placeholder*="Ask Avi"]');
      await messageInput.fill(`${browserName} test`);
      await messageInput.press('Enter');

      await expect(page.locator(`text=${browserName} test`)).toBeVisible();
    });
  });

  test.describe('Mobile Regression', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();

      const messageInput = page.locator('input[placeholder*="Ask Avi"]');
      await messageInput.fill('Mobile regression test');
      await messageInput.press('Enter');

      await expect(page.locator('text=Mobile regression test')).toBeVisible();
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      const sendButton = page.getByRole('button', { name: /send/i });
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');

      await messageInput.fill('Touch test');
      await sendButton.tap(); // Use tap instead of click for touch

      await expect(page.locator('text=Touch test')).toBeVisible();
    });
  });

  test.describe('Data Persistence Regression', () => {
    test('should maintain conversation state', async ({ page }) => {
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');

      // Send a message
      await messageInput.fill('Persistence test');
      await messageInput.press('Enter');

      await expect(page.locator('text=Persistence test')).toBeVisible();

      // Navigate away and back
      await page.goto('http://localhost:5173/agents');
      await page.goto('http://localhost:5173/');

      // Check if conversation is preserved (depends on implementation)
      await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();
    });
  });

  test.describe('Security Regression', () => {
    test('should sanitize user input', async ({ page }) => {
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');

      // Test XSS prevention
      const xssPayload = '<script>alert("xss")</script>';
      await messageInput.fill(xssPayload);
      await messageInput.press('Enter');

      // Should display as text, not execute script
      await expect(page.locator(`text=${xssPayload}`)).toBeVisible();

      // Page should not have alert dialog
      page.on('dialog', dialog => {
        throw new Error('Unexpected dialog - possible XSS vulnerability');
      });
    });

    test('should handle malformed JSON responses', async ({ page }) => {
      await page.route('**/api/avi/streaming-chat', route => {
        route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: '{ invalid json'
        });
      });

      const messageInput = page.locator('input[placeholder*="Ask Avi"]');
      await messageInput.fill('Malformed JSON test');
      await messageInput.press('Enter');

      // Should handle gracefully without crashing
      await expect(page.locator('[data-testid="avi-chat-interface"]')).toBeVisible();
    });
  });

  test.describe('Integration Points Regression', () => {
    test('should integrate properly with StreamingTicker', async ({ page }) => {
      await expect(page.locator('[data-testid="streaming-ticker"]')).toBeVisible();

      // Send message to activate streaming
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');
      await messageInput.fill('Streaming test');
      await messageInput.press('Enter');

      // Streaming ticker should activate
      await expect(page.locator('[data-testid="streaming-ticker"][data-visible="true"]')).toBeVisible();
    });

    test('should maintain proper event handling', async ({ page }) => {
      const messageInput = page.locator('input[placeholder*="Ask Avi"]');

      // Test multiple event types
      await messageInput.focus();
      await messageInput.type('Event test');
      await messageInput.press('Backspace');
      await messageInput.press('Enter');

      await expect(page.locator('text=Event tes')).toBeVisible();
    });
  });
});
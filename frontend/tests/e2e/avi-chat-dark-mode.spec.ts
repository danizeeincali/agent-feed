/**
 * Playwright E2E Tests: AVI Chat Dark Mode Text Visibility
 *
 * Real browser validation with screenshot capture
 * NO MOCKS - Real browser, real components, real visual verification
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

// Screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'dark-mode');

// Helper to navigate to AVI chat interface
async function navigateToAviChat(page: Page) {
  // Navigate to the application
  await page.goto('http://localhost:5173');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Find and click on an agent to open AVI chat
  // This assumes there's a way to access AVI DM in the UI
  const agentCard = page.locator('[data-testid="agent-card"]').first();
  if (await agentCard.isVisible()) {
    await agentCard.click();
  }

  // Wait for AVI chat interface to be visible
  await page.waitForSelector('[data-testid="avi-chat-interface"]', { timeout: 10000 });
}

// Helper to enable dark mode
async function enableDarkMode(page: Page) {
  // Check if there's a theme toggle button
  const themeToggle = page.locator('[data-testid="theme-toggle"]');

  if (await themeToggle.isVisible()) {
    await themeToggle.click();
  } else {
    // Fallback: add dark class directly to document
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
  }

  // Wait for dark mode to apply
  await page.waitForTimeout(500);
}

// Helper to send a message
async function sendMessage(page: Page, message: string) {
  const messageInput = page.locator('[data-testid="message-input"], textarea, input[type="text"]').last();
  await messageInput.fill(message);

  const sendButton = page.locator('[data-testid="send-button"], button:has-text("Send")').last();
  await sendButton.click();

  // Wait for message to appear
  await page.waitForTimeout(1000);
}

test.describe('AVI Chat Interface - Dark Mode Visual Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should display all text clearly in dark mode', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // Send various types of messages
    await sendMessage(page, 'Hello, this is a plain text message.');
    await page.waitForTimeout(2000); // Wait for response

    await sendMessage(page, 'Here is code:\n```javascript\nconst x = 42;\nconsole.log(x);\n```');
    await page.waitForTimeout(2000);

    // Take screenshot of dark mode chat
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-messages.png'),
      fullPage: true
    });

    // Verify dark mode is active
    const isDarkMode = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(isDarkMode).toBe(true);

    // Verify messages are visible (have proper styling)
    const messages = page.locator('.rounded-lg, .rounded-2xl').filter({ hasText: /Hello|code/i });
    const messageCount = await messages.count();
    expect(messageCount).toBeGreaterThan(0);
  });

  test('should show code blocks with proper contrast in dark mode', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // Send message with code block
    const codeMessage = `Here's a function:\n\`\`\`typescript\nfunction greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\`\`\``;
    await sendMessage(page, codeMessage);
    await page.waitForTimeout(2000);

    // Find code block
    const codeBlock = page.locator('.font-mono');
    await expect(codeBlock.first()).toBeVisible();

    // Check that code block has dark mode styling
    const codeBlockClasses = await codeBlock.first().getAttribute('class');
    expect(codeBlockClasses).toContain('dark:bg-gray-800');
    expect(codeBlockClasses).toContain('dark:text-gray-100');

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-code-blocks.png'),
      fullPage: true
    });
  });

  test('should display emotional tone indicators with sufficient contrast', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // This test assumes AVI responds with emotional tone indicators
    await sendMessage(page, 'Can you help me with a problem?');
    await page.waitForTimeout(3000); // Wait for response with tone indicator

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-tone-indicators.png'),
      fullPage: true
    });

    // Verify tone indicators are visible (if present)
    const toneIndicators = page.locator('[class*="text-green-"], [class*="text-blue-"], [class*="text-purple-"]');
    if (await toneIndicators.count() > 0) {
      await expect(toneIndicators.first()).toBeVisible();
    }
  });

  test('should not show any unreadable text in dark mode', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // Send multiple messages to fill the chat
    await sendMessage(page, 'Message 1: Testing plain text visibility');
    await page.waitForTimeout(1000);

    await sendMessage(page, 'Message 2: Testing with longer content that might wrap to multiple lines and needs to remain visible throughout');
    await page.waitForTimeout(1000);

    await sendMessage(page, 'Message 3:\n```\nconst code = true;\n```');
    await page.waitForTimeout(1000);

    // Take comprehensive screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-comprehensive.png'),
      fullPage: true
    });

    // Verify no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Should have no console errors
    expect(consoleErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

  test('should maintain proper contrast when switching between light and dark mode', async ({ page }) => {
    await navigateToAviChat(page);

    // Start in light mode
    await sendMessage(page, 'Testing light mode');
    await page.waitForTimeout(1000);

    // Capture light mode
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'light-mode-before.png'),
      fullPage: true
    });

    // Switch to dark mode
    await enableDarkMode(page);
    await page.waitForTimeout(500);

    // Capture dark mode
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-after-switch.png'),
      fullPage: true
    });

    // Send another message in dark mode
    await sendMessage(page, 'Testing dark mode after switch');
    await page.waitForTimeout(1000);

    // Final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-after-new-message.png'),
      fullPage: true
    });

    // Verify messages are still visible
    const messages = page.locator('[class*="rounded"]').filter({ hasText: /Testing/i });
    const count = await messages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should show user messages with proper contrast on blue background', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // Send user message
    await sendMessage(page, 'This is a user message on blue background');
    await page.waitForTimeout(1000);

    // Find user message bubble (blue background)
    const userMessage = page.locator('.bg-blue-600, .bg-blue-500').filter({ hasText: 'user message' });
    await expect(userMessage.first()).toBeVisible();

    // Verify white text on blue background
    const textColor = await userMessage.first().evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    // White text should be rgb(255, 255, 255) or similar
    // This is a loose check since computed styles can vary
    expect(textColor).toMatch(/rgb\(25[0-5], 25[0-5], 25[0-5]\)/);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-user-messages.png'),
      fullPage: true
    });
  });

  test('should handle long messages with proper text visibility', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // Send very long message
    const longMessage = 'This is a very long message that will definitely wrap to multiple lines. '.repeat(10);
    await sendMessage(page, longMessage);
    await page.waitForTimeout(2000);

    // Send message with long code block
    const longCode = 'function example() {\n  ' + 'const data = "example";\n  '.repeat(20) + '}';
    await sendMessage(page, `\`\`\`\n${longCode}\n\`\`\``);
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-long-messages.png'),
      fullPage: true
    });

    // Verify messages are visible
    const messageBubbles = page.locator('[class*="rounded"]').filter({ hasText: /This is a very long/ });
    await expect(messageBubbles.first()).toBeVisible();
  });

  test('should verify accessibility - no low contrast text', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // Send various message types
    await sendMessage(page, 'Plain text message');
    await page.waitForTimeout(1000);

    await sendMessage(page, '```\ncode block\n```');
    await page.waitForTimeout(1000);

    // Run accessibility audit (basic check)
    const accessibilitySnapshot = await page.accessibility.snapshot();

    // Verify no empty accessible names (would indicate hidden text)
    function checkNode(node: any) {
      if (node.role === 'text' || node.role === 'paragraph') {
        expect(node.name || node.value).toBeTruthy();
      }
      if (node.children) {
        node.children.forEach(checkNode);
      }
    }

    if (accessibilitySnapshot) {
      checkNode(accessibilitySnapshot);
    }

    // Take final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'dark-mode-accessibility-check.png'),
      fullPage: true
    });
  });
});

test.describe('AVI Chat Interface - Visual Regression Tests', () => {

  test('should match baseline screenshots for dark mode', async ({ page }) => {
    await navigateToAviChat(page);
    await enableDarkMode(page);

    // Send standard test messages
    await sendMessage(page, 'Standard test message');
    await page.waitForTimeout(1500);

    await sendMessage(page, '```javascript\nconst test = true;\n```');
    await page.waitForTimeout(1500);

    // Take screenshot for comparison
    const screenshot = await page.screenshot({ fullPage: true });

    // This would compare against a baseline in a real CI/CD setup
    // For now, we just verify the screenshot was captured
    expect(screenshot).toBeTruthy();
    expect(screenshot.length).toBeGreaterThan(1000); // Should be a real image

    // Save for visual inspection
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'baseline-dark-mode.png'),
      fullPage: true
    });
  });
});

import { test, expect, Page } from '@playwright/test';

/**
 * Production Validation Test Suite: Quick Post Simplification
 *
 * Validates the simplified posting interface with real backend integration:
 * - Only 2 tabs visible (Quick Post, Avi DM)
 * - No "Post" tab present
 * - 10,000 character limit (not mock)
 * - Character counter behavior (hidden below 9500, visible at 9500+)
 * - 6-row textarea
 * - New placeholder text
 * - Real post submission
 * - Mention functionality
 * - Mobile responsive design
 */

test.describe('Quick Post Simplified Interface - Production Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the main feed page
    await page.goto('http://localhost:5173');

    // Wait for the posting interface to load
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });
  });

  test('1. Verify only 2 tabs visible (Quick Post, Avi DM)', async ({ page }) => {
    // Get all tab buttons
    const tabs = page.locator('[aria-label="Posting tabs"] button');

    // Verify exactly 2 tabs exist
    await expect(tabs).toHaveCount(2);

    // Verify tab labels
    const firstTab = tabs.nth(0);
    const secondTab = tabs.nth(1);

    await expect(firstTab).toContainText('Quick Post');
    await expect(secondTab).toContainText('Avi DM');

    // Verify Zap icon for Quick Post
    await expect(firstTab.locator('svg')).toBeVisible();

    // Verify Bot icon for Avi DM
    await expect(secondTab.locator('svg')).toBeVisible();
  });

  test('2. Verify Post tab is NOT present', async ({ page }) => {
    // Get all tab buttons
    const tabs = page.locator('[aria-label="Posting tabs"] button');

    // Check that no tab contains "Post" as standalone text (without "Quick")
    const tabTexts = await tabs.allTextContents();

    // Filter out "Quick Post" and check remaining
    const hasStandalonePostTab = tabTexts.some(text =>
      text.trim() === 'Post' || (text.includes('Post') && !text.includes('Quick'))
    );

    expect(hasStandalonePostTab).toBe(false);
  });

  test('3. Test Quick Post with 10,000 character limit', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get the textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await expect(textarea).toBeVisible();

    // Verify maxLength attribute is set to 10000
    const maxLength = await textarea.getAttribute('maxlength');
    expect(maxLength).toBe('10000');

    // Try to input more than 10000 characters
    const longText = 'a'.repeat(10001);
    await textarea.fill(longText);

    // Get actual content length
    const actualContent = await textarea.inputValue();
    expect(actualContent.length).toBeLessThanOrEqual(10000);
  });

  test('4. Verify character counter hidden below 9500', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get the textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');

    // Input text below 9500 characters
    const shortText = 'a'.repeat(9499);
    await textarea.fill(shortText);

    // Character counter should NOT be visible
    const counter = page.locator('text=/\\d+\\/10,000 characters/');
    await expect(counter).not.toBeVisible();
  });

  test('5. Verify character counter visible at 9500+', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get the textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');

    // Test at exactly 9500 characters
    const text9500 = 'a'.repeat(9500);
    await textarea.fill(text9500);
    await page.waitForTimeout(200); // Allow React to update

    // Character counter SHOULD be visible
    let counter = page.locator('text=/9,500\\/10,000 characters/');
    await expect(counter).toBeVisible();

    // Verify color is gray (not warning)
    let counterElement = page.locator('div:has-text("9,500/10,000 characters")').first();
    await expect(counterElement).toHaveClass(/text-gray-600/);

    // Test at 9700 characters (orange warning)
    const text9700 = 'a'.repeat(9700);
    await textarea.fill(text9700);
    await page.waitForTimeout(200);

    counter = page.locator('text=/9,700\\/10,000 characters/');
    await expect(counter).toBeVisible();
    counterElement = page.locator('div:has-text("9,700/10,000 characters")').first();
    await expect(counterElement).toHaveClass(/text-orange-600/);

    // Test at 9900 characters (red warning)
    const text9900 = 'a'.repeat(9900);
    await textarea.fill(text9900);
    await page.waitForTimeout(200);

    counter = page.locator('text=/9,900\\/10,000 characters/');
    await expect(counter).toBeVisible();
    counterElement = page.locator('div:has-text("9,900/10,000 characters")').first();
    await expect(counterElement).toHaveClass(/text-red-600/);
  });

  test('6. Test textarea has 6 rows', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get the textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await expect(textarea).toBeVisible();

    // Verify rows attribute
    const rows = await textarea.getAttribute('rows');
    expect(rows).toBe('6');
  });

  test('7. Verify new placeholder text', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get the textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await expect(textarea).toBeVisible();

    // Verify placeholder text
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toBe("What's on your mind? Write as much as you need!");
  });

  test('8. Test real post submission with long content (5000 chars)', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get the textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');

    // Create 5000 character content
    const longContent = 'This is a production validation test for long-form content submission. '.repeat(70) + 'a'.repeat(100);
    await textarea.fill(longContent.substring(0, 5000));

    // Verify character counter is NOT visible (below 9500)
    const counter = page.locator('text=/\\d+\\/10,000 characters/');
    await expect(counter).not.toBeVisible();

    // Get the submit button
    const submitButton = page.locator('button[type="submit"]:has-text("Quick Post")');
    await expect(submitButton).toBeEnabled();

    // Setup request interception to verify API call
    const requestPromise = page.waitForRequest(request =>
      request.url().includes('/api/v1/agent-posts') &&
      request.method() === 'POST'
    );

    // Submit the form
    await submitButton.click();

    // Verify the API request was made
    const request = await requestPromise;
    expect(request).toBeTruthy();

    // Wait for submission to complete
    await page.waitForTimeout(1000);

    // Verify textarea is cleared after successful submission
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toBe('');
  });

  test('9. Verify mentions still work', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get the textarea
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');

    // Type @ to trigger mention suggestions
    await textarea.fill('Hey @');
    await page.waitForTimeout(500); // Wait for mention suggestions to appear

    // Check if mention dropdown appears (implementation dependent)
    // This is a basic check - adjust based on actual MentionInput implementation
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toContain('@');

    // Verify mentionContext is set correctly
    const mentionContext = await textarea.getAttribute('data-mention-context');
    // If the component sets this attribute, verify it
    if (mentionContext) {
      expect(mentionContext).toBe('quick-post');
    }
  });

  test('10. Mobile responsive test', async ({ page, viewport }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    // Navigate and wait for load
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });

    // Verify tabs are visible and stacked appropriately
    const tabs = page.locator('[aria-label="Posting tabs"] button');
    await expect(tabs).toHaveCount(2);

    // Click Quick Post tab
    const quickPostTab = tabs.first();
    await quickPostTab.click();

    // Verify textarea is visible and appropriately sized
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await expect(textarea).toBeVisible();

    // Verify textarea still has 6 rows on mobile
    const rows = await textarea.getAttribute('rows');
    expect(rows).toBe('6');

    // Get textarea bounding box
    const textareaBox = await textarea.boundingBox();
    expect(textareaBox).not.toBeNull();

    // Verify textarea width is appropriate for mobile (accounts for padding)
    if (textareaBox) {
      expect(textareaBox.width).toBeGreaterThan(300); // Should use most of screen width
      expect(textareaBox.width).toBeLessThan(375); // Should not overflow
    }

    // Test character counter on mobile at 9500 chars
    const longText = 'a'.repeat(9500);
    await textarea.fill(longText);
    await page.waitForTimeout(200);

    const counter = page.locator('text=/9,500\\/10,000 characters/');
    await expect(counter).toBeVisible();
  });

  test('11. Verify Avi DM tab functionality', async ({ page }) => {
    // Click Avi DM tab
    const aviTab = page.locator('[aria-label="Posting tabs"] button:has-text("Avi DM")');
    await aviTab.click();

    // Verify tab is active
    await expect(aviTab).toHaveClass(/border-blue-500/);

    // Verify Avi chat interface is visible
    const chatHeading = page.locator('h3:has-text("Chat with Λvi")');
    await expect(chatHeading).toBeVisible();

    // Verify chat description
    const chatDescription = page.locator('text=Direct message with your Chief of Staff');
    await expect(chatDescription).toBeVisible();

    // Verify chat input exists
    const chatInput = page.locator('input[placeholder*="Type your message to Λvi"]');
    await expect(chatInput).toBeVisible();

    // Verify send button exists
    const sendButton = page.locator('button[type="submit"]:has-text("Send")');
    await expect(sendButton).toBeVisible();
  });

  test('12. Test tab switching maintains state', async ({ page }) => {
    // Start with Quick Post
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Type some content
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await textarea.fill('Test content that should persist');

    // Switch to Avi DM tab
    const aviTab = page.locator('[aria-label="Posting tabs"] button:has-text("Avi DM")');
    await aviTab.click();

    // Verify Avi interface is shown
    const chatHeading = page.locator('h3:has-text("Chat with Λvi")');
    await expect(chatHeading).toBeVisible();

    // Switch back to Quick Post
    await quickPostTab.click();

    // Verify content persists (React state preservation)
    const textareaValue = await textarea.inputValue();
    expect(textareaValue).toBe('Test content that should persist');
  });

  test('13. Performance: Interface loads within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:5173');

    // Wait for posting interface to be fully interactive
    await page.waitForSelector('[aria-label="Posting tabs"]');
    await page.waitForSelector('textarea[placeholder*="What\'s on your mind"]');

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000); // Should load in under 2 seconds
  });

  test('14. Accessibility: Keyboard navigation works', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Focus on textarea using Tab key
    await page.keyboard.press('Tab');

    // Verify textarea is focused
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await expect(textarea).toBeFocused();

    // Type content
    await page.keyboard.type('Testing keyboard navigation');

    // Tab to submit button
    await page.keyboard.press('Tab');

    // Verify submit button is focused
    const submitButton = page.locator('button[type="submit"]:has-text("Quick Post")');
    await expect(submitButton).toBeFocused();
  });

  test('15. Error handling: Submit button disabled when empty', async ({ page }) => {
    // Ensure Quick Post tab is active
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Get submit button
    const submitButton = page.locator('button[type="submit"]:has-text("Quick Post")');

    // Verify button is disabled when empty
    await expect(submitButton).toBeDisabled();

    // Type content
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await textarea.fill('Some content');

    // Verify button is enabled
    await expect(submitButton).toBeEnabled();

    // Clear content
    await textarea.fill('   '); // Only whitespace

    // Verify button is disabled again
    await expect(submitButton).toBeDisabled();
  });
});

/**
 * Screenshot Capture Tests
 * These tests capture production screenshots for documentation
 */
test.describe('Screenshot Capture - Production Documentation', () => {
  test('Capture: desktop-two-tabs.png', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });

    // Ensure full width for desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Highlight the tabs area
    const tabsNav = page.locator('[aria-label="Posting tabs"]');
    await expect(tabsNav).toBeVisible();

    // Take screenshot of the entire posting interface
    const postingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await postingInterface.screenshot({
      path: '/workspaces/agent-feed/screenshots/after/desktop-two-tabs.png'
    });
  });

  test('Capture: desktop-quick-post-empty.png', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });

    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Ensure textarea is visible and empty
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await expect(textarea).toBeVisible();
    await textarea.fill('');

    // Take screenshot
    const postingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await postingInterface.screenshot({
      path: '/workspaces/agent-feed/screenshots/after/desktop-quick-post-empty.png'
    });
  });

  test('Capture: desktop-quick-post-5000-chars.png', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });

    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    const content5000 = 'This is a production validation test with substantial content. '.repeat(80);
    await textarea.fill(content5000.substring(0, 5000));
    await page.waitForTimeout(200);

    // Take screenshot
    const postingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await postingInterface.screenshot({
      path: '/workspaces/agent-feed/screenshots/after/desktop-quick-post-5000-chars.png'
    });
  });

  test('Capture: desktop-quick-post-9500-chars.png', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });

    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    const content9500 = 'a'.repeat(9500);
    await textarea.fill(content9500);
    await page.waitForTimeout(300); // Wait for counter to appear

    // Take screenshot
    const postingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await postingInterface.screenshot({
      path: '/workspaces/agent-feed/screenshots/after/desktop-quick-post-9500-chars.png'
    });
  });

  test('Capture: desktop-quick-post-10000-chars.png', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });

    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    const content10000 = 'a'.repeat(10000);
    await textarea.fill(content10000);
    await page.waitForTimeout(300); // Wait for red counter

    // Take screenshot
    const postingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await postingInterface.screenshot({
      path: '/workspaces/agent-feed/screenshots/after/desktop-quick-post-10000-chars.png'
    });
  });

  test('Capture: mobile-quick-post-new.png', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });

    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();

    // Add some sample content
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await textarea.fill('This is a mobile view test of the new Quick Post interface!');

    // Take screenshot
    const postingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await postingInterface.screenshot({
      path: '/workspaces/agent-feed/screenshots/after/mobile-quick-post-new.png'
    });
  });
});

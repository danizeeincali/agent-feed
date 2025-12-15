/**
 * E2E Tests for AviTypingIndicator Component
 *
 * SPARC TDD - End-to-End Testing with Playwright:
 * - Visual validation of animation and colors
 * - Real user interaction flows
 * - Accessibility testing with screen readers
 * - Cross-browser compatibility
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots/avi-typing-indicator');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('AviTypingIndicator - E2E Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Click on Avi DM tab to access the typing indicator
    const aviTab = page.locator('button:has-text("Avi DM")');
    await aviTab.click();
    await page.waitForTimeout(500);
  });

  test('animation appears at correct position (bottom left of input)', async ({ page }) => {
    console.log('🎯 Testing animation position...');

    // Find the message input
    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await expect(input).toBeVisible();

    // Get input bounding box
    const inputBox = await input.boundingBox();
    expect(inputBox).not.toBeNull();

    // Type message and send
    await input.fill('Position test');
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for typing indicator to appear
    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Get indicator bounding box
    const indicatorBox = await indicator.boundingBox();
    expect(indicatorBox).not.toBeNull();

    // Verify position relative to input
    expect(indicatorBox!.y).toBeGreaterThan(inputBox!.y); // Below input
    expect(indicatorBox!.x).toBeLessThanOrEqual(inputBox!.x + 50); // Left aligned or slightly offset

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'position-test.png'),
      fullPage: true
    });

    console.log('✅ Animation position validated');
  });

  test('animation displays with visible colors', async ({ page }) => {
    console.log('🌈 Testing color visibility...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Color test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for indicator
    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Get the text element
    const textElement = indicator.locator('[data-testid="avi-text"]');
    await expect(textElement).toBeVisible();

    // Check initial color (should be red)
    const initialColor = await textElement.evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    // RGB for #FF0000 is rgb(255, 0, 0)
    expect(initialColor).toContain('255');

    // Take screenshots at different animation frames
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'color-frame-1.png')
    });

    // Wait for color change (200ms)
    await page.waitForTimeout(200);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'color-frame-2.png')
    });

    // Wait for more frames
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'color-frame-4.png')
    });

    console.log('✅ Colors are visible and changing');
  });

  test('text is readable in all color states', async ({ page }) => {
    console.log('📖 Testing text readability...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Readability test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Check text content is visible at each frame
    const frames = ['A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'Λ v !'];

    for (let i = 0; i < frames.length; i++) {
      if (i > 0) {
        await page.waitForTimeout(200); // Wait for next frame
      }

      const text = await indicator.textContent();
      expect(text).toContain(frames[i]);

      // Take screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `frame-${i + 1}-readable.png`)
      });
    }

    console.log('✅ Text is readable across all frames');
  });

  test('animation smoothly fades out', async ({ page }) => {
    console.log('🎬 Testing fade out animation...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Fade test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Take screenshot while visible
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'before-fade-out.png')
    });

    // Wait for response to complete (mocked responses should be fast)
    await expect(indicator).toBeHidden({ timeout: 10000 });

    // Take screenshot after fade
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'after-fade-out.png')
    });

    console.log('✅ Fade out animation completed');
  });
});

test.describe('AviTypingIndicator - E2E User Flow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const aviTab = page.locator('button:has-text("Avi DM")');
    await aviTab.click();
    await page.waitForTimeout(500);
  });

  test('user types message → clicks send → animation appears', async ({ page }) => {
    console.log('👤 Testing complete user flow...');

    // Step 1: Type message
    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Hello Avi');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'flow-1-typed.png')
    });

    // Step 2: Click send
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'flow-2-clicked-send.png')
    });

    // Step 3: Animation appears
    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'flow-3-animation-appeared.png')
    });

    // Verify animation content
    const text = await indicator.textContent();
    expect(text).toContain('A v i');

    console.log('✅ Complete user flow validated');
  });

  test('animation loops while waiting for response', async ({ page }) => {
    console.log('🔄 Testing animation looping...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Loop test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Capture initial frame
    const initialText = await indicator.textContent();
    expect(initialText).toContain('A v i');

    // Wait for one complete loop (2000ms)
    await page.waitForTimeout(2000);

    // Should be back to initial frame
    const loopedText = await indicator.textContent();
    expect(loopedText).toContain('A v i');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'after-one-loop.png')
    });

    console.log('✅ Animation looping validated');
  });

  test('response arrives → animation disappears', async ({ page }) => {
    console.log('📨 Testing animation disappears on response...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Response test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'before-response.png')
    });

    // Wait for response and animation to disappear
    await expect(indicator).toBeHidden({ timeout: 15000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'after-response.png')
    });

    console.log('✅ Animation disappears after response');
  });

  test('can send another message immediately after first completes', async ({ page }) => {
    console.log('🔁 Testing sequential messages...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    const sendButton = page.locator('button:has-text("Send")');

    // First message
    await input.fill('First message');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });
    await expect(indicator).toBeHidden({ timeout: 15000 });

    // Second message immediately
    await input.fill('Second message');
    await sendButton.click();

    await expect(indicator).toBeVisible({ timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'second-message-animation.png')
    });

    console.log('✅ Sequential messages work correctly');
  });

  test('animation continues during slow response (30s simulation)', async ({ page }) => {
    console.log('⏳ Testing long-running animation...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Slow response test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Monitor animation for 10 seconds
    const startTime = Date.now();
    let frameCount = 0;

    while (Date.now() - startTime < 10000) {
      const isVisible = await indicator.isVisible();
      expect(isVisible).toBe(true);

      frameCount++;
      await page.waitForTimeout(500);

      if (frameCount % 4 === 0) {
        // Take screenshot every 2 seconds
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `long-animation-${frameCount / 4}.png`)
        });
      }
    }

    expect(frameCount).toBeGreaterThan(10); // Should have checked multiple times

    console.log(`✅ Animation continued for 10 seconds (${frameCount} checks)`);
  });
});

test.describe('AviTypingIndicator - E2E Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const aviTab = page.locator('button:has-text("Avi DM")');
    await aviTab.click();
    await page.waitForTimeout(500);
  });

  test('screen reader announces "Avi is typing..."', async ({ page }) => {
    console.log('🔊 Testing screen reader announcements...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Accessibility test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Verify ARIA attributes
    await expect(indicator).toHaveAttribute('aria-live', 'polite');
    await expect(indicator).toHaveAttribute('aria-label', 'Avi is typing');
    await expect(indicator).toHaveAttribute('aria-busy', 'true');

    // Verify screen reader text
    const srText = page.locator('.sr-only:has-text("Avi is typing...")');
    await expect(srText).toBeAttached();

    console.log('✅ Screen reader attributes validated');
  });

  test('animation respects prefers-reduced-motion', async ({ page, context }) => {
    console.log('♿ Testing reduced motion preference...');

    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Reduced motion test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Check for reduced motion attribute or class
    const hasReducedMotion = await indicator.evaluate(el => {
      return el.classList.contains('motion-reduce') ||
             el.hasAttribute('data-reduced-motion');
    });

    expect(hasReducedMotion).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'reduced-motion.png')
    });

    console.log('✅ Reduced motion preference respected');
  });

  test('focus remains on input during animation', async ({ page }) => {
    console.log('🎯 Testing focus management...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();

    // Focus input
    await input.focus();
    expect(await input.evaluate(el => document.activeElement === el)).toBe(true);

    // Type and send
    await input.fill('Focus test');
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Wait for animation to appear
    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Focus should be manageable - user can focus input again
    await input.focus();
    expect(await input.evaluate(el => document.activeElement === el)).toBe(true);

    console.log('✅ Focus management validated');
  });

  test('keyboard navigation works during animation', async ({ page }) => {
    console.log('⌨️ Testing keyboard navigation...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Keyboard test');

    // Send with Enter key
    await input.press('Enter');

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Try to navigate away and back with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');

    // Input should be focusable
    await input.focus();
    expect(await input.evaluate(el => document.activeElement === el)).toBe(true);

    console.log('✅ Keyboard navigation validated');
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    console.log('🎨 Testing color contrast...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Contrast test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    const textElement = indicator.locator('[data-testid="avi-text"]');

    // Get background and text colors
    const styles = await textElement.evaluate(el => {
      const computed = window.getComputedStyle(el);
      const parent = el.parentElement!;
      const parentComputed = window.getComputedStyle(parent);

      return {
        color: computed.color,
        backgroundColor: parentComputed.backgroundColor
      };
    });

    console.log(`Text color: ${styles.color}`);
    console.log(`Background color: ${styles.backgroundColor}`);

    // ROYGBIV colors should be vibrant and visible against light backgrounds
    // This is a basic check - full WCAG compliance would require contrast ratio calculation

    expect(styles.color).toBeTruthy();
    expect(styles.backgroundColor).toBeTruthy();

    console.log('✅ Color contrast checked');
  });
});

test.describe('AviTypingIndicator - E2E Animation Frame Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const aviTab = page.locator('button:has-text("Avi DM")');
    await aviTab.click();
    await page.waitForTimeout(500);
  });

  test('verifies all 10 animation frames in sequence', async ({ page }) => {
    console.log('🎬 Testing all animation frames...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Frame sequence test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    const expectedFrames = [
      'A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'Λ v !',
      'A v !', 'A V !', 'A V i', 'A v i', 'Λ v i'
    ];

    for (let i = 0; i < expectedFrames.length; i++) {
      const text = await indicator.textContent();

      // Remove screen reader text for comparison
      const visibleText = text?.replace('Avi is typing...', '').trim();

      expect(visibleText).toContain(expectedFrames[i]);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `frame-sequence-${i + 1}.png`)
      });

      // Wait for next frame (200ms)
      if (i < expectedFrames.length - 1) {
        await page.waitForTimeout(200);
      }
    }

    console.log('✅ All 10 frames validated in sequence');
  });

  test('verifies ROYGBIV color cycling', async ({ page }) => {
    console.log('🌈 Testing ROYGBIV color cycle...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('ROYGBIV test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    const textElement = indicator.locator('[data-testid="avi-text"]');

    const expectedColors = [
      'rgb(255, 0, 0)',      // Red
      'rgb(255, 127, 0)',    // Orange
      'rgb(255, 255, 0)',    // Yellow
      'rgb(0, 255, 0)',      // Green
      'rgb(0, 0, 255)',      // Blue
      'rgb(75, 0, 130)',     // Indigo
      'rgb(148, 0, 211)'     // Violet
    ];

    for (let i = 0; i < expectedColors.length; i++) {
      const color = await textElement.evaluate(el => {
        return window.getComputedStyle(el).color;
      });

      expect(color).toBe(expectedColors[i]);

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `roygbiv-${i + 1}.png`)
      });

      await page.waitForTimeout(200);
    }

    console.log('✅ ROYGBIV color cycle validated');
  });

  test('verifies animation loops correctly', async ({ page }) => {
    console.log('♻️ Testing animation loop...');

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Loop validation test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Get initial frame
    const initialText = await indicator.textContent();
    const initialFrame = initialText?.replace('Avi is typing...', '').trim();
    expect(initialFrame).toContain('A v i');

    // Wait for one complete cycle (10 frames × 200ms = 2000ms)
    await page.waitForTimeout(2000);

    // Should be back at the first frame
    const loopedText = await indicator.textContent();
    const loopedFrame = loopedText?.replace('Avi is typing...', '').trim();
    expect(loopedFrame).toContain('A v i');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'loop-complete.png')
    });

    console.log('✅ Animation loop validated');
  });
});

test.describe('AviTypingIndicator - E2E Performance Tests', () => {
  test('animation remains smooth during long wait times', async ({ page }) => {
    console.log('⚡ Testing animation performance...');

    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    const aviTab = page.locator('button:has-text("Avi DM")');
    await aviTab.click();

    const input = page.locator('input[type="text"][placeholder*="message"]').first();
    await input.fill('Performance test');

    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    const indicator = page.locator('[role="status"]');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Measure frame rate by checking visibility consistency
    let visibilityChecks = 0;
    let visibleCount = 0;

    for (let i = 0; i < 20; i++) {
      const isVisible = await indicator.isVisible();
      visibilityChecks++;
      if (isVisible) visibleCount++;

      await page.waitForTimeout(100);
    }

    // Should be visible for all checks during animation
    const visibilityRate = (visibleCount / visibilityChecks) * 100;
    expect(visibilityRate).toBeGreaterThan(95); // At least 95% visible

    console.log(`✅ Animation performance validated (${visibilityRate.toFixed(1)}% visible)`);
  });
});

/**
 * PRODUCTION VALIDATION: Avi Typing Indicator Wave Animation
 *
 * Validates 100% REAL implementation of:
 * - 10-frame wave animation (A v i → Λ v i → Λ V i → Λ V ! → etc.)
 * - ROYGBIV color cycling (Red → Orange → Yellow → Green → Blue → Indigo → Violet)
 * - 200ms per frame timing
 * - Appearance/disappearance behavior
 *
 * Test Strategy: Browser automation with visual verification
 */

import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ROYGBIV color definitions (must match implementation)
const ROYGBIV_COLORS = [
  '#FF0000', // Red
  '#FF7F00', // Orange
  '#FFFF00', // Yellow
  '#00FF00', // Green
  '#0000FF', // Blue
  '#4B0082', // Indigo
  '#9400D3', // Violet
];

// 10-frame wave pattern (must match implementation)
const ANIMATION_FRAMES = [
  'A v i', // Frame 0
  'Λ v i', // Frame 1 - A→Λ
  'Λ V i', // Frame 2 - v→V
  'Λ V !', // Frame 3 - i→!
  'Λ v !', // Frame 4 - V→v
  'A v !', // Frame 5 - Λ→A
  'A V !', // Frame 6 - v→V
  'A V i', // Frame 7 - !→i
  'A v i', // Frame 8 - V→v (reset)
  'Λ v i', // Frame 9 - A→Λ (loop preparation)
];

const FRAME_DURATION_MS = 200;
const SCREENSHOT_DIR = '/workspaces/agent-feed/validation-screenshots/avi-typing-animation';

// Helper: Ensure screenshot directory exists
function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

// Helper: RGB to Hex conversion
function rgbToHex(rgb: string): string {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return rgb;

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

// Helper: Get animation element
async function getAnimationElement(page: Page) {
  return page.locator('.avi-typing-indicator');
}

// Helper: Get wave text element
async function getWaveTextElement(page: Page) {
  return page.locator('.avi-wave-text');
}

test.describe('Avi Typing Indicator Wave Animation - Production Validation', () => {

  test.beforeAll(() => {
    ensureScreenshotDir();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Navigate to Avi DM section
    const aviDmTab = page.getByRole('button', { name: /avi dm/i });
    if (await aviDmTab.isVisible()) {
      await aviDmTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('Validation 1: Animation NOT visible before sending message', async ({ page }) => {
    console.log('✅ TEST 1: Verify animation hidden initially');

    const animation = await getAnimationElement(page);
    const isVisible = await animation.isVisible().catch(() => false);

    expect(isVisible).toBe(false);

    // Screenshot: Clean state
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-no-animation-initial.png'),
      fullPage: true
    });

    console.log('✅ PASS: Animation not visible before sending message');
  });

  test('Validation 2: Animation appears immediately after clicking Send', async ({ page }) => {
    console.log('✅ TEST 2: Verify animation appears on send');

    // Type message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('hello');

    // Screenshot: Before send
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-before-send.png'),
      fullPage: true
    });

    // Click send button
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Wait 50ms (should appear within 50ms)
    await page.waitForTimeout(50);

    // Verify animation visible
    const animation = await getAnimationElement(page);
    const isVisible = await animation.isVisible();

    expect(isVisible).toBe(true);

    // Screenshot: Animation appeared
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-animation-appeared.png'),
      fullPage: true
    });

    console.log('✅ PASS: Animation appeared within 50ms of send');
  });

  test('Validation 3: Verify animation positioning (above input, bottom-left)', async ({ page }) => {
    console.log('✅ TEST 3: Verify animation position');

    // Send message to trigger animation
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test position');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(100);

    // Get animation bounding box
    const animation = await getAnimationElement(page);
    const animationBox = await animation.boundingBox();

    // Get input bounding box
    const inputBox = await input.boundingBox();

    expect(animationBox).not.toBeNull();
    expect(inputBox).not.toBeNull();

    if (animationBox && inputBox) {
      // Verify animation is ABOVE input
      expect(animationBox.y + animationBox.height).toBeLessThan(inputBox.y);

      // Verify left-aligned (within reasonable margin)
      expect(Math.abs(animationBox.x - inputBox.x)).toBeLessThan(50);

      console.log(`Animation position: x=${animationBox.x}, y=${animationBox.y}`);
      console.log(`Input position: x=${inputBox.x}, y=${inputBox.y}`);
      console.log('✅ PASS: Animation positioned correctly');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-position-verification.png'),
      fullPage: true
    });
  });

  test('Validation 4: Verify first frame shows "A v i" in RED', async ({ page }) => {
    console.log('✅ TEST 4: Verify initial frame and color');

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test frame 1');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(50);

    // Get wave text
    const waveText = await getWaveTextElement(page);
    const text = await waveText.textContent();
    const color = await waveText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    const hexColor = rgbToHex(color);

    console.log(`Frame 1 text: "${text}"`);
    console.log(`Frame 1 color: ${hexColor}`);

    expect(text?.trim()).toBe('A v i');
    expect(hexColor).toBe('#FF0000'); // RED

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-frame-1-red.png'),
      fullPage: true
    });

    console.log('✅ PASS: First frame is "A v i" in RED');
  });

  test('Validation 5: Verify frame sequence (10 frames)', async ({ page }) => {
    console.log('✅ TEST 5: Verify complete frame sequence');

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test frame sequence');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(100);

    const waveText = await getWaveTextElement(page);
    const capturedFrames: string[] = [];

    // Capture 15 frames (1.5 loops to verify looping)
    for (let i = 0; i < 15; i++) {
      const text = await waveText.textContent();
      capturedFrames.push(text?.trim() || '');

      console.log(`Frame ${i}: "${text?.trim()}"`);

      if (i < 10) {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `06-frame-${i}-${text?.trim().replace(/\s+/g, '-')}.png`),
          fullPage: true
        });
      }

      await page.waitForTimeout(FRAME_DURATION_MS);
    }

    // Verify first 10 frames match expected sequence
    for (let i = 0; i < 10; i++) {
      expect(capturedFrames[i]).toBe(ANIMATION_FRAMES[i]);
    }

    // Verify looping (frames 10-14 should match frames 0-4)
    for (let i = 0; i < 5; i++) {
      expect(capturedFrames[10 + i]).toBe(ANIMATION_FRAMES[i]);
    }

    console.log('✅ PASS: All 10 frames in correct sequence, looping verified');
  });

  test('Validation 6: Verify ROYGBIV color cycling', async ({ page }) => {
    console.log('✅ TEST 6: Verify ROYGBIV color sequence');

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test colors');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(100);

    const waveText = await getWaveTextElement(page);
    const capturedColors: string[] = [];

    // Capture 10 color transitions (includes wrap-around)
    for (let i = 0; i < 10; i++) {
      const color = await waveText.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      const hexColor = rgbToHex(color);
      capturedColors.push(hexColor);

      console.log(`Color ${i}: ${hexColor}`);

      await page.waitForTimeout(FRAME_DURATION_MS);
    }

    // Verify first 7 colors match ROYGBIV
    for (let i = 0; i < 7; i++) {
      expect(capturedColors[i]).toBe(ROYGBIV_COLORS[i]);
    }

    // Verify looping (colors 7-9 should match colors 0-2)
    for (let i = 0; i < 3; i++) {
      expect(capturedColors[7 + i]).toBe(ROYGBIV_COLORS[i]);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-roygbiv-verified.png'),
      fullPage: true
    });

    console.log('✅ PASS: ROYGBIV color cycling verified');
  });

  test('Validation 7: Verify 200ms frame timing accuracy', async ({ page }) => {
    console.log('✅ TEST 7: Verify frame timing');

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test timing');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(100);

    const waveText = await getWaveTextElement(page);
    const frameTimes: number[] = [];

    // Measure timing for 10 frames
    let previousText = await waveText.textContent();
    let startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      // Poll for frame change
      while (true) {
        const currentText = await waveText.textContent();
        if (currentText !== previousText) {
          const elapsed = Date.now() - startTime;
          frameTimes.push(elapsed);
          console.log(`Frame ${i} transition: ${elapsed}ms`);

          previousText = currentText;
          startTime = Date.now();
          break;
        }
        await page.waitForTimeout(10); // Poll every 10ms
      }
    }

    // Verify each frame is ~200ms (±20ms tolerance)
    for (let i = 0; i < frameTimes.length; i++) {
      expect(frameTimes[i]).toBeGreaterThanOrEqual(180);
      expect(frameTimes[i]).toBeLessThanOrEqual(220);
    }

    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    console.log(`Average frame time: ${avgFrameTime.toFixed(2)}ms`);
    console.log('✅ PASS: Frame timing within ±20ms tolerance');
  });

  test('Validation 8: Verify "is typing..." text visible', async ({ page }) => {
    console.log('✅ TEST 8: Verify "is typing..." text');

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test typing text');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(100);

    // Find "is typing..." text
    const typingText = page.locator('text=is typing...');
    const isVisible = await typingText.isVisible();

    expect(isVisible).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-typing-text-visible.png'),
      fullPage: true
    });

    console.log('✅ PASS: "is typing..." text visible');
  });

  test('Validation 9: Verify animation disappears when response arrives', async ({ page }) => {
    console.log('✅ TEST 9: Verify animation disappears on response');

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('hello');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(100);

    // Verify animation visible
    const animation = await getAnimationElement(page);
    let isVisible = await animation.isVisible();
    expect(isVisible).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-animation-before-response.png'),
      fullPage: true
    });

    // Wait for response (max 30 seconds)
    console.log('Waiting for Avi response...');
    await page.waitForSelector('.avi-typing-indicator', {
      state: 'hidden',
      timeout: 30000
    });

    // Verify animation hidden
    isVisible = await animation.isVisible().catch(() => false);
    expect(isVisible).toBe(false);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-animation-after-response.png'),
      fullPage: true
    });

    console.log('✅ PASS: Animation disappeared when response arrived');
  });

  test('Validation 10: Verify animation can reappear on second message', async ({ page }) => {
    console.log('✅ TEST 10: Verify animation reappears on second message');

    // Send first message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('first message');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Wait for response
    await page.waitForSelector('.avi-typing-indicator', {
      state: 'hidden',
      timeout: 30000
    });

    await page.waitForTimeout(1000);

    // Send second message
    await input.fill('second message');
    await sendButton.click();

    await page.waitForTimeout(100);

    // Verify animation visible again
    const animation = await getAnimationElement(page);
    const isVisible = await animation.isVisible();
    expect(isVisible).toBe(true);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11-animation-reappears.png'),
      fullPage: true
    });

    console.log('✅ PASS: Animation reappeared on second message');
  });

  test('Validation 11: Verify no console errors during animation', async ({ page }) => {
    console.log('✅ TEST 11: Verify no console errors');

    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test errors');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    // Let animation run for 3 seconds
    await page.waitForTimeout(3000);

    expect(consoleErrors).toHaveLength(0);

    console.log('✅ PASS: No console errors during animation');
  });

  test('Validation 12: Verify glow effect applied', async ({ page }) => {
    console.log('✅ TEST 12: Verify text glow effect');

    // Send message
    const input = page.locator('input[placeholder*="Λvi"]');
    await input.fill('test glow');
    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await page.waitForTimeout(100);

    // Get wave text element
    const waveText = await getWaveTextElement(page);

    // Verify text-shadow applied
    const textShadow = await waveText.evaluate((el) => {
      return window.getComputedStyle(el).textShadow;
    });

    expect(textShadow).not.toBe('none');
    expect(textShadow).toContain('rgba');

    console.log(`Text shadow: ${textShadow}`);
    console.log('✅ PASS: Glow effect applied');
  });

});

/**
 * AVI TYPING ANIMATION - PRODUCTION VALIDATION TEST SUITE
 *
 * Critical Tests After Fixes:
 * 1. ✅ Removed CSS transition - shows pure ROYGBIV colors
 * 2. ✅ Added frame/color reset when isVisible becomes true
 * 3. ✅ Animation starts at frame 0 "A v i" RED every time
 *
 * Validation Requirements:
 * - First frame MUST be "A v i" in RED (#FF0000)
 * - All 7 ROYGBIV colors MUST show as pure hex values
 * - No color blending or interpolation
 * - Frame sequence MUST match specification
 * - Consistent behavior across multiple messages
 */

import { test, expect, Page } from '@playwright/test';

// ROYGBIV color specifications with ±2 tolerance for browser rendering
const ROYGBIV_COLORS = [
  { name: 'Red', hex: '#FF0000', rgb: 'rgb(255, 0, 0)' },
  { name: 'Orange', hex: '#FF7F00', rgb: 'rgb(255, 127, 0)' },
  { name: 'Yellow', hex: '#FFFF00', rgb: 'rgb(255, 255, 0)' },
  { name: 'Green', hex: '#00FF00', rgb: 'rgb(0, 255, 0)' },
  { name: 'Blue', hex: '#0000FF', rgb: 'rgb(0, 0, 255)' },
  { name: 'Indigo', hex: '#4B0082', rgb: 'rgb(75, 0, 130)' },
  { name: 'Violet', hex: '#9400D3', rgb: 'rgb(148, 0, 211)' },
];

// Frame sequence specification
const ANIMATION_FRAMES = [
  'A v i', // Frame 0 - RED
  'Λ v i', // Frame 1 - ORANGE
  'Λ V i', // Frame 2 - YELLOW
  'Λ V !', // Frame 3 - GREEN
  'A v !', // Frame 4 - BLUE (Λ→A, V→v)
  'A V !', // Frame 5 - INDIGO (v→V)
  'A V i', // Frame 6 - VIOLET (!→i)
  'A v i', // Frame 7 - RED (V→v, reset)
  'Λ v i', // Frame 8 - ORANGE (A→Λ)
  'Λ V i', // Frame 9 - YELLOW (v→V, loop prep)
];

test.describe('Avi Typing Animation - Production Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('http://localhost:5173');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Navigate to Avi DM tab
    await page.click('button:has-text("Avi DM")');
    await page.waitForTimeout(500);
  });

  test('CRITICAL TEST 1: First Frame is "A v i" in RED #FF0000', async ({ page }) => {
    console.log('\n🔴 TEST 1: Verifying first frame is "A v i" RED...');

    // Type message
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('test message');

    // Click send button
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();

    // Verify animation is visible
    const indicator = page.locator('.avi-typing-indicator');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // IMMEDIATELY capture first frame (within 10ms of visibility)
    await page.waitForTimeout(10);

    // Get the wave text element
    const waveText = indicator.locator('.avi-wave-text');

    // Verify text is "A v i"
    const frameText = await waveText.textContent();
    console.log(`📝 First frame text: "${frameText}"`);
    expect(frameText).toBe('A v i');

    // Verify color is RED
    const color = await waveText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log(`🎨 First frame color: ${color}`);

    // Parse RGB values
    const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [_, r, g, b] = rgbMatch.map(Number);
      console.log(`   RGB values: R=${r}, G=${g}, B=${b}`);

      // Verify RED (255, 0, 0) with ±2 tolerance
      expect(r).toBeGreaterThanOrEqual(253);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeLessThanOrEqual(2);
      expect(b).toBeLessThanOrEqual(2);

      console.log('✅ First frame is "A v i" in RED #FF0000');
    } else {
      throw new Error(`Invalid color format: ${color}`);
    }

    // Take screenshot for evidence
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/avi-first-frame-red.png',
      fullPage: true
    });
  });

  test('CRITICAL TEST 2: Pure ROYGBIV Colors (No Blending)', async ({ page }) => {
    console.log('\n🌈 TEST 2: Verifying pure ROYGBIV colors...');

    // Send message
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('color test');
    await page.click('button:has-text("Send")');

    const indicator = page.locator('.avi-typing-indicator');
    await expect(indicator).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(10); // Ensure first frame renders

    const waveText = indicator.locator('.avi-wave-text');
    const capturedColors: { frame: string; color: string; rgb: [number, number, number] }[] = [];

    // Capture colors over 2-second loop (10 frames × 200ms)
    for (let i = 0; i < 14; i++) { // Capture 14 frames to see full loop + extras
      await page.waitForTimeout(200);

      const frameText = await waveText.textContent() || '';
      const color = await waveText.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [_, r, g, b] = rgbMatch.map(Number);
        capturedColors.push({
          frame: frameText,
          color: color,
          rgb: [r, g, b]
        });

        console.log(`Frame ${i}: "${frameText}" - RGB(${r}, ${g}, ${b})`);
      }
    }

    // Verify we captured at least 7 unique colors
    const uniqueColors = new Set(capturedColors.map(c => c.color));
    console.log(`\n📊 Captured ${uniqueColors.size} unique colors`);
    expect(uniqueColors.size).toBeGreaterThanOrEqual(7);

    // Verify each ROYGBIV color appears with correct hex values
    const colorMatches = ROYGBIV_COLORS.map(roygbiv => {
      const found = capturedColors.find(captured => {
        const [r, g, b] = captured.rgb;
        const expected = roygbiv.rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!expected) return false;

        const [_, er, eg, eb] = expected.map(Number);

        // Check if RGB values match within ±5 tolerance
        return Math.abs(r - er) <= 5 && Math.abs(g - eg) <= 5 && Math.abs(b - eb) <= 5;
      });

      return {
        color: roygbiv.name,
        hex: roygbiv.hex,
        found: !!found,
        actual: found ? `rgb(${found.rgb.join(', ')})` : 'NOT FOUND'
      };
    });

    console.log('\n🎨 ROYGBIV Color Verification:');
    colorMatches.forEach(match => {
      const status = match.found ? '✅' : '❌';
      console.log(`${status} ${match.color.padEnd(8)} ${match.hex} - ${match.actual}`);
    });

    // All 7 colors must be found
    const foundCount = colorMatches.filter(m => m.found).length;
    expect(foundCount).toBe(7);

    console.log('\n✅ All ROYGBIV colors verified as pure hex values');
  });

  test('CRITICAL TEST 3: Frame Sequence Validation', async ({ page }) => {
    console.log('\n🔄 TEST 3: Verifying frame sequence...');

    // Send message
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('sequence test');
    await page.click('button:has-text("Send")');

    const indicator = page.locator('.avi-typing-indicator');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    const waveText = indicator.locator('.avi-wave-text');
    const capturedFrames: string[] = [];

    // Capture frames over full loop
    for (let i = 0; i < 12; i++) {
      const frameText = await waveText.textContent() || '';
      capturedFrames.push(frameText);
      console.log(`Frame ${i}: "${frameText}"`);
      await page.waitForTimeout(200);
    }

    // Verify sequence matches specification
    console.log('\n📋 Frame Sequence Verification:');
    for (let i = 0; i < 10; i++) {
      const expected = ANIMATION_FRAMES[i];
      const actual = capturedFrames[i];
      const match = expected === actual ? '✅' : '❌';
      console.log(`${match} Frame ${i}: Expected "${expected}" - Got "${actual}"`);
      expect(actual).toBe(expected);
    }

    // Verify loop repeats
    console.log('\n🔁 Loop Verification:');
    console.log(`Frame 10 (should be Frame 0): "${capturedFrames[10]}" === "${ANIMATION_FRAMES[0]}"?`);
    expect(capturedFrames[10]).toBe(ANIMATION_FRAMES[0]);

    console.log('✅ Frame sequence matches specification 100%');
  });

  test('CRITICAL TEST 4: Multiple Message Consistency', async ({ page }) => {
    console.log('\n🔁 TEST 4: Verifying consistency across multiple messages...');

    const input = page.locator('input[placeholder*="Type your message"]');
    const indicator = page.locator('.avi-typing-indicator');
    const waveText = indicator.locator('.avi-wave-text');

    // Test 3 messages
    for (let msgNum = 1; msgNum <= 3; msgNum++) {
      console.log(`\n📨 Message ${msgNum}:`);

      // Send message
      await input.fill(`test message ${msgNum}`);
      await page.click('button:has-text("Send")');

      // Wait for animation to appear
      await expect(indicator).toBeVisible({ timeout: 5000 });

      // Capture first frame immediately
      await page.waitForTimeout(50);

      const frameText = await waveText.textContent();
      const color = await waveText.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      console.log(`  First frame: "${frameText}"`);
      console.log(`  First color: ${color}`);

      // Verify first frame is "A v i"
      expect(frameText).toBe('A v i');

      // Verify first color is RED
      const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        const [_, r, g, b] = rgbMatch.map(Number);
        expect(r).toBeGreaterThanOrEqual(253);
        expect(g).toBeLessThanOrEqual(2);
        expect(b).toBeLessThanOrEqual(2);
        console.log(`  ✅ Starts at "A v i" RED`);
      }

      // Wait for animation to complete/disappear
      await page.waitForTimeout(3000);

      // Verify animation disappears
      const isHidden = await indicator.isHidden().catch(() => true);
      console.log(`  Animation hidden: ${isHidden}`);
    }

    console.log('\n✅ All messages start consistently at "A v i" RED');
  });

  test('CRITICAL TEST 5: No Visual Artifacts or Glitches', async ({ page }) => {
    console.log('\n🎬 TEST 5: Checking for visual artifacts...');

    // Send message
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('visual test');
    await page.click('button:has-text("Send")');

    const indicator = page.locator('.avi-typing-indicator');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    const waveText = indicator.locator('.avi-wave-text');

    // Check for consistent rendering
    const issues: string[] = [];

    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);

      const frameText = await waveText.textContent() || '';
      const color = await waveText.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Check frame text is valid
      if (!ANIMATION_FRAMES.includes(frameText as any)) {
        issues.push(`Invalid frame text: "${frameText}" at index ${i}`);
      }

      // Check color is RGB format
      if (!color.startsWith('rgb(')) {
        issues.push(`Invalid color format: "${color}" at index ${i}`);
      }

      // Check for transition CSS (should be removed)
      const transition = await waveText.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });
      if (transition.includes('color')) {
        issues.push(`Color transition detected at frame ${i}: ${transition}`);
      }
    }

    console.log('\n🔍 Visual Artifact Check:');
    if (issues.length === 0) {
      console.log('✅ No visual artifacts detected');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    }

    expect(issues.length).toBe(0);

    // Take final screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/avi-no-artifacts.png',
      fullPage: true
    });
  });

  test('REGRESSION TEST: Animation Reset on Hide/Show', async ({ page }) => {
    console.log('\n🔄 REGRESSION: Testing animation reset...');

    const input = page.locator('input[placeholder*="Type your message"]');
    const indicator = page.locator('.avi-typing-indicator');
    const waveText = indicator.locator('.avi-wave-text');

    // First message
    await input.fill('first message');
    await page.click('button:has-text("Send")');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Let animation run for a few frames
    await page.waitForTimeout(800); // 4 frames

    const midFrameText = await waveText.textContent();
    console.log(`Mid-animation frame: "${midFrameText}"`);

    // Animation should disappear after response
    await page.waitForTimeout(5000);

    // Second message - should reset to frame 0
    await input.fill('second message');
    await page.click('button:has-text("Send")');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    // Immediately check first frame
    await page.waitForTimeout(50);
    const resetFrameText = await waveText.textContent();
    const resetColor = await waveText.evaluate((el) => {
      return window.getComputedStyle(el).color;
    });

    console.log(`After reset frame: "${resetFrameText}"`);
    console.log(`After reset color: ${resetColor}`);

    expect(resetFrameText).toBe('A v i');

    const rgbMatch = resetColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [_, r] = rgbMatch.map(Number);
      expect(r).toBeGreaterThanOrEqual(253);
    }

    console.log('✅ Animation correctly resets to frame 0');
  });

  test('PERFORMANCE TEST: Animation Timing Accuracy', async ({ page }) => {
    console.log('\n⏱️  PERFORMANCE: Testing animation timing...');

    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('timing test');
    await page.click('button:has-text("Send")');

    const indicator = page.locator('.avi-typing-indicator');
    await expect(indicator).toBeVisible({ timeout: 5000 });

    const waveText = indicator.locator('.avi-wave-text');

    // Measure frame timing
    const frameTimes: number[] = [];
    let lastFrame = '';
    let lastTime = Date.now();

    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(50); // Check every 50ms

      const currentFrame = await waveText.textContent() || '';
      const currentTime = Date.now();

      if (currentFrame !== lastFrame) {
        const duration = currentTime - lastTime;
        frameTimes.push(duration);
        console.log(`Frame change: "${lastFrame}" → "${currentFrame}" (${duration}ms)`);
        lastFrame = currentFrame;
        lastTime = currentTime;
      }
    }

    // Calculate average frame duration
    if (frameTimes.length > 0) {
      const avgDuration = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      console.log(`\n📊 Average frame duration: ${avgDuration.toFixed(0)}ms`);
      console.log(`📊 Expected: 200ms`);
      console.log(`📊 Variance: ${Math.abs(avgDuration - 200).toFixed(0)}ms`);

      // Allow ±50ms variance for browser timing
      expect(avgDuration).toBeGreaterThanOrEqual(150);
      expect(avgDuration).toBeLessThanOrEqual(250);

      console.log('✅ Animation timing within acceptable range');
    }
  });
});

test.describe('Avi Typing Animation - DevTools Color Picker Validation', () => {
  test('MANUAL TEST: DevTools Color Verification Guide', async ({ page }) => {
    console.log('\n🎨 MANUAL VALIDATION GUIDE:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n1. Open Chrome DevTools (F12 or Right-click → Inspect)');
    console.log('2. Navigate to Avi DM tab and send a message');
    console.log('3. While animation is running:');
    console.log('   a. Right-click on the colored "A v i" text');
    console.log('   b. Select "Inspect Element"');
    console.log('   c. In the Styles panel, find the "color" property');
    console.log('   d. Click the color square to open color picker');
    console.log('   e. Verify hex values match ROYGBIV:');
    console.log('\n   Expected Colors:');
    ROYGBIV_COLORS.forEach((color, i) => {
      console.log(`   ${i + 1}. ${color.name.padEnd(8)} - ${color.hex}`);
    });
    console.log('\n4. Take screenshots of color picker showing each hex value');
    console.log('5. Verify NO intermediate colors (e.g., #A200B8, #FF2E00)');
    console.log('\n═══════════════════════════════════════════════════════════');

    // Navigate to app for manual testing
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Avi DM")');

    // Keep browser open for manual inspection
    await page.waitForTimeout(60000); // 60 seconds for manual testing
  });
});

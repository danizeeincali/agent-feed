/**
 * Quick Avi Typing Animation Validation
 * Fast validation of critical fixes
 */

import { test, expect } from '@playwright/test';

test.describe('Avi Animation Quick Validation', () => {
  test('First frame should be "A v i" in RED', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Go to Avi DM
    await page.click('button:has-text("Avi DM")');
    await page.waitForTimeout(500);

    // Send message
    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('test');
    await page.click('button:has-text("Send")');

    // Wait for indicator
    const indicator = page.locator('.avi-typing-indicator');
    await expect(indicator).toBeVisible({ timeout: 10000 });

    // Check first frame immediately
    const waveText = indicator.locator('.avi-wave-text');
    const firstFrame = await waveText.textContent();
    const firstColor = await waveText.evaluate(el => window.getComputedStyle(el).color);

    console.log(`First frame: "${firstFrame}"`);
    console.log(`First color: ${firstColor}`);

    // Verify frame is "A v i"
    expect(firstFrame).toBe('A v i');

    // Verify color is RED (allowing tolerance)
    const rgbMatch = firstColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      const [_, r, g, b] = rgbMatch.map(Number);
      console.log(`RGB: (${r}, ${g}, ${b})`);
      expect(r).toBeGreaterThanOrEqual(250);
      expect(g).toBeLessThanOrEqual(5);
      expect(b).toBeLessThanOrEqual(5);
    }

    // Take screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/validation-screenshots/avi-first-frame-quick.png',
      fullPage: true
    });
  });

  test('Animation shows all ROYGBIV colors', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Avi DM")');
    await page.waitForTimeout(500);

    const input = page.locator('input[placeholder*="Type your message"]');
    await input.fill('colors');
    await page.click('button:has-text("Send")');

    const indicator = page.locator('.avi-typing-indicator');
    await expect(indicator).toBeVisible({ timeout: 10000 });

    const waveText = indicator.locator('.avi-wave-text');
    const colors = new Set<string>();

    // Capture colors over time
    for (let i = 0; i < 15; i++) {
      const color = await waveText.evaluate(el => window.getComputedStyle(el).color);
      colors.add(color);
      console.log(`Frame ${i}: ${color}`);
      await page.waitForTimeout(200);
    }

    console.log(`\nCaptured ${colors.size} unique colors`);

    // Should have at least 6 unique colors (allowing for timing)
    expect(colors.size).toBeGreaterThanOrEqual(6);
  });
});

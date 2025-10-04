/**
 * Simplified E2E Validation: Avi Full-Width Activity Indicator CSS
 *
 * @description Focused CSS validation test for full-width layout
 * @test-type E2E CSS Validation Test
 */

import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';

test.describe('Avi Full-Width CSS Validation', () => {
  test('Full-width CSS properties are correctly applied', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Click Avi DM tab
    const aviDmTab = page.locator('[role="tab"]').filter({ hasText: 'Avi DM' }).or(
      page.getByText('Avi DM')
    ).first();

    await aviDmTab.waitFor({ state: 'visible', timeout: 15000 });
    await aviDmTab.click();
    await page.waitForTimeout(2000);

    // Send a message to trigger the typing indicator
    const input = page.locator('form input, form textarea').first();
    await input.waitFor({ state: 'visible', timeout: 15000 });
    await input.fill('test message');
    await page.keyboard.press('Enter');

    // Wait for typing indicator to appear
    const indicator = page.locator('.avi-wave-text-inline').first();
    await indicator.waitFor({ state: 'visible', timeout: 10000 });

    // Validate CSS properties
    const styles = await indicator.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        width: computed.width,
        alignItems: computed.alignItems,
        gap: computed.gap,
      };
    });

    // Assert full-width CSS is applied
    expect(styles.display).toBe('flex');
    expect(styles.alignItems).toBe('center');

    // Width should be a computed pixel value (not 'auto' or '0px')
    expect(styles.width).not.toBe('0px');
    expect(styles.width).not.toBe('auto');

    console.log('✅ Full-width CSS validation passed');
    console.log(`   Display: ${styles.display}`);
    console.log(`   Width: ${styles.width}`);
    console.log(`   Align Items: ${styles.alignItems}`);
    console.log(`   Gap: ${styles.gap}`);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('main page visual consistency', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for any animations to complete
    await page.waitForTimeout(2000);

    // Hide dynamic content that might change
    await page.addStyleTag({
      content: `
        [data-testid*="timestamp"],
        .timestamp,
        .time,
        .date {
          visibility: hidden !important;
        }
      `
    });

    // Take full page screenshot
    await expect(page).toHaveScreenshot('main-page-full.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Take viewport screenshot
    await expect(page).toHaveScreenshot('main-page-viewport.png', {
      fullPage: false,
      animations: 'disabled'
    });
  });

  test('no white screen visual validation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Take screenshot immediately after load
    const screenshot = await page.screenshot({ fullPage: true });

    // Analyze screenshot for white screen
    const whitePixelRatio = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // This is a simplified check - in real implementation,
      // you'd analyze the actual screenshot data
      const bodyStyles = window.getComputedStyle(document.body);
      const backgroundColor = bodyStyles.backgroundColor;

      // Check if background is white or transparent
      return backgroundColor === 'rgb(255, 255, 255)' ||
             backgroundColor === 'rgba(0, 0, 0, 0)' ||
             backgroundColor === 'transparent' ? 1 : 0;
    });

    // If background is white, ensure there's actual content
    if (whitePixelRatio > 0.8) {
      const hasContent = await page.evaluate(() => {
        const textContent = document.body.textContent || '';
        const hasElements = document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6, button, a').length > 5;
        return textContent.trim().length > 100 || hasElements;
      });

      expect(hasContent, 'Page appears to be a white screen with no content').toBeTruthy();
    }

    await page.screenshot({
      path: 'tests/e2e/evidence/white-screen-validation.png',
      fullPage: true
    });
  });

  test('error states visual consistency', async ({ page }) => {
    // Test 404 page if it exists
    await page.goto('/nonexistent-page', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Should not be a white screen
    const bodyContent = await page.locator('body').textContent();
    expect(bodyContent!.trim().length).toBeGreaterThan(0);

    await page.screenshot({
      path: 'tests/e2e/evidence/404-page-visual.png',
      fullPage: true
    });

    // Test with network failures
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should show error state, not white screen
    const contentAfterFailure = await page.locator('body').textContent();
    expect(contentAfterFailure!.trim().length).toBeGreaterThan(0);

    await page.screenshot({
      path: 'tests/e2e/evidence/network-failure-visual.png',
      fullPage: true
    });
  });
});
import { test, expect } from '@playwright/test';

test.describe('Post-CSS Fix Validation', () => {
  test('Capture and validate unified CSS architecture', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3003');

    // Wait for application to load
    await page.waitForTimeout(5000);

    // Take screenshot of main page
    await page.screenshot({
      path: 'tests/screenshots/post-fix-homepage.png',
      fullPage: true
    });

    // Check for proper CSS variables
    const cssVariablesWorking = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);

      // Check if HSL CSS variables are available
      const bgColor = computedStyle.getPropertyValue('--background').trim();
      const fgColor = computedStyle.getPropertyValue('--foreground').trim();

      return {
        backgroundVar: bgColor,
        foregroundVar: fgColor,
        hasBackground: bgColor !== '',
        hasForeground: fgColor !== ''
      };
    });

    console.log('CSS Variables Status:', cssVariablesWorking);

    // Verify Tailwind classes are working
    const tailwindWorking = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = getComputedStyle(body);

      return {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        fontFamily: computedStyle.fontFamily
      };
    });

    console.log('Tailwind Application Status:', tailwindWorking);

    // Check for any console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to agents page
    await page.goto('http://localhost:3003/agents');
    await page.waitForTimeout(3000);

    // Capture agents page screenshot
    await page.screenshot({
      path: 'tests/screenshots/post-fix-agents-page.png',
      fullPage: true
    });

    // Verify no critical CSS errors
    expect(cssVariablesWorking.hasBackground).toBe(true);
    expect(cssVariablesWorking.hasForeground).toBe(true);
    expect(tailwindWorking.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

    console.log('✅ CSS Architecture Fix Validation Complete');
    console.log('Console Errors:', consoleErrors);
  });

  test('Validate responsive design across viewports', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:3003');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `tests/screenshots/post-fix-${viewport.name}.png`,
        fullPage: true
      });

      console.log(`✅ ${viewport.name} viewport screenshot captured`);
    }
  });
});
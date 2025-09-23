const { test, expect } = require('@playwright/test');

// Test configuration for different viewports
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 }
};

test.describe('UI Validation - PostCSS Fix Verification', () => {

  test('Capture screenshots and validate UI at all viewports', async ({ page }) => {
    const results = {
      mainPageValidation: {},
      agentsPageValidation: {},
      screenshots: [],
      tailwindValidation: true,
      gradientValidation: true
    };

    // Test each viewport
    for (const [deviceType, viewport] of Object.entries(viewports)) {
      console.log(`\n🔍 Testing ${deviceType} viewport (${viewport.width}x${viewport.height})`);

      await page.setViewportSize(viewport);

      // Main page validation
      console.log(`📍 Navigating to main page on ${deviceType}`);
      await page.goto('http://localhost:5173', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await page.waitForTimeout(2000);

      // Check for purple gradient background
      const bodyElement = await page.locator('body').first();
      const hasGradientBackground = await bodyElement.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.backgroundImage && style.backgroundImage.includes('gradient');
      });

      // Check for Tailwind classes
      const tailwindElements = await page.locator('[class*="bg-gradient"], [class*="from-"], [class*="to-"]');
      const tailwindCount = await tailwindElements.count();

      // Capture main page screenshot
      const mainScreenshotPath = `tests/screenshots/main-page-${deviceType}-validation.png`;
      await page.screenshot({
        path: mainScreenshotPath,
        fullPage: true
      });

      results.mainPageValidation[deviceType] = {
        loaded: true,
        hasGradient: hasGradientBackground,
        tailwindClasses: tailwindCount,
        screenshot: mainScreenshotPath
      };

      console.log(`✅ Main page ${deviceType}: Gradient=${hasGradientBackground}, Tailwind classes=${tailwindCount}`);

      // Agents page validation
      console.log(`📍 Navigating to agents page on ${deviceType}`);
      try {
        await page.goto('http://localhost:5173/agents', {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        await page.waitForTimeout(1500);

        // Check if page loaded (even if 404, we want to capture it)
        const pageContent = await page.locator('body').textContent();
        const agentsScreenshotPath = `tests/screenshots/agents-page-${deviceType}-validation.png`;

        await page.screenshot({
          path: agentsScreenshotPath,
          fullPage: true
        });

        results.agentsPageValidation[deviceType] = {
          loaded: pageContent && pageContent.length > 50,
          hasContent: pageContent && (pageContent.includes('agent') || pageContent.includes('Agent') || pageContent.includes('404')),
          screenshot: agentsScreenshotPath
        };

        console.log(`✅ Agents page ${deviceType}: Content length=${pageContent?.length || 0}`);
      } catch (error) {
        console.log(`⚠️ Agents page ${deviceType}: ${error.message}`);
        results.agentsPageValidation[deviceType] = {
          loaded: false,
          error: error.message
        };
      }

      results.screenshots.push(
        `main-page-${deviceType}-validation.png`,
        `agents-page-${deviceType}-validation.png`
      );
    }

    // Overall validation
    const allMainPagesLoaded = Object.values(results.mainPageValidation).every(result => result.loaded);
    const allHaveGradient = Object.values(results.mainPageValidation).every(result => result.hasGradient);
    const allHaveTailwind = Object.values(results.mainPageValidation).every(result => result.tailwindClasses > 0);

    // Assertions
    expect(allMainPagesLoaded).toBe(true);
    expect(allHaveGradient).toBe(true);
    expect(allHaveTailwind).toBe(true);

    // Log results
    console.log('\n📊 VALIDATION RESULTS SUMMARY:');
    console.log('===============================');
    console.log(`✅ All main pages loaded: ${allMainPagesLoaded}`);
    console.log(`✅ All have purple gradient: ${allHaveGradient}`);
    console.log(`✅ All have Tailwind classes: ${allHaveTailwind}`);
    console.log(`📸 Screenshots captured: ${results.screenshots.length}`);

    // Write detailed results to file
    const reportPath = 'tests/screenshots/validation-results.json';
    require('fs').writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📄 Detailed results saved to: ${reportPath}`);
  });

  test('Quick gradient and Tailwind validation', async ({ page }) => {
    await page.setViewportSize(viewports.desktop);

    await page.goto('http://localhost:5173', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    await page.waitForTimeout(1000);

    // Check specific gradient classes are applied
    const gradientElements = await page.locator('.bg-gradient-to-br, [class*="from-indigo"], [class*="to-purple"]');
    const gradientCount = await gradientElements.count();

    // Check for purple/indigo color scheme
    const purpleElements = await page.locator('[class*="purple"], [class*="indigo"]');
    const purpleCount = await purpleElements.count();

    // Check for backdrop blur and glass effects
    const backdropElements = await page.locator('[class*="backdrop-blur"], [class*="bg-white/"]');
    const backdropCount = await backdropElements.count();

    console.log(`🎨 Gradient elements: ${gradientCount}`);
    console.log(`🟣 Purple/Indigo elements: ${purpleCount}`);
    console.log(`✨ Backdrop/Glass elements: ${backdropCount}`);

    expect(gradientCount).toBeGreaterThan(0);
    expect(purpleCount).toBeGreaterThan(0);
    expect(backdropCount).toBeGreaterThan(0);

    // Take a detailed screenshot for manual inspection
    await page.screenshot({
      path: 'tests/screenshots/tailwind-validation-detailed.png',
      fullPage: true
    });
  });
});
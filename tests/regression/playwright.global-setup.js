/**
 * Playwright Global Setup for Regression Tests
 *
 * Initializes test environment and ensures services are ready
 */

const { chromium } = require('@playwright/test');

async function globalSetup(config) {
  console.log('🚀 Starting Playwright global setup for CSS regression tests...');

  // Start browser for warmup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');

    // Try to connect to the application
    let retries = 30;
    let connected = false;

    while (retries > 0 && !connected) {
      try {
        await page.goto('http://localhost:3003', {
          waitUntil: 'networkidle',
          timeout: 10000
        });

        // Check if CSS is loaded
        await page.waitForFunction(() => {
          const computedStyle = getComputedStyle(document.documentElement);
          return computedStyle.getPropertyValue('--background').trim() !== '';
        }, { timeout: 5000 });

        connected = true;
        console.log('✅ Application is ready and CSS is loaded');
      } catch (error) {
        retries--;
        console.log(`⏳ Waiting for application... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!connected) {
      console.warn('⚠️ Could not connect to application - tests may fail');
    }

    // Ensure screenshots directory exists
    const fs = require('fs');
    const path = require('path');
    const screenshotsDir = path.join(__dirname, 'screenshots');

    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
      console.log('📁 Created screenshots directory');
    }

    // Clear previous screenshots
    const files = fs.readdirSync(screenshotsDir);
    for (const file of files) {
      if (file.endsWith('.png')) {
        fs.unlinkSync(path.join(screenshotsDir, file));
      }
    }
    console.log('🧹 Cleaned previous screenshots');

    // Warmup: Pre-load critical resources
    try {
      await page.goto('http://localhost:3003');

      // Wait for fonts to load
      await page.waitForFunction(() => document.fonts.ready);

      // Preload common viewport sizes
      const viewports = [
        { width: 375, height: 667 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1920, height: 1080 }  // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(100);
      }

      console.log('🔥 Warmup completed');
    } catch (error) {
      console.warn('⚠️ Warmup failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

module.exports = globalSetup;
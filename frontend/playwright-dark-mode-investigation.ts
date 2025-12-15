/**
 * Playwright Script: Dark Mode Investigation
 * This script will navigate to the AVI DM chat, enable dark mode,
 * and take screenshots to identify text visibility issues.
 */

import { chromium } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function investigateDarkMode() {
  console.log('🔍 Starting dark mode investigation...');

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots', 'investigation');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    colorScheme: 'dark'
  });

  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`Browser Console [${msg.type()}]:`, msg.text());
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.error('❌ Page Error:', error.message);
  });

  try {
    console.log('📍 Navigating to application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

    // Take screenshot of home page
    await page.screenshot({
      path: path.join(screenshotsDir, '01-home-page.png'),
      fullPage: true
    });
    console.log('✅ Screenshot: Home page');

    // Look for AVI DM link or navigation
    console.log('🔍 Looking for AVI DM navigation...');

    // Try different navigation approaches
    const aviLinks = await page.locator('text=/avi/i').all();
    console.log(`Found ${aviLinks.length} elements with "avi" text`);

    // Take screenshot showing navigation options
    await page.screenshot({
      path: path.join(screenshotsDir, '02-navigation-options.png'),
      fullPage: true
    });
    console.log('✅ Screenshot: Navigation options');

    // Try to find the AVI DM chat component directly
    console.log('🔍 Searching for AVI chat component...');

    // Check for common chat interface selectors
    const chatSelectors = [
      '[data-testid*="avi"]',
      '[class*="avi"]',
      '[class*="chat"]',
      'textarea',
      'input[type="text"]'
    ];

    for (const selector of chatSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`✓ Found ${elements.length} elements matching: ${selector}`);
      }
    }

    // Enable dark mode explicitly via HTML class
    console.log('🌙 Enabling dark mode...');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    await page.waitForTimeout(1000);

    // Take screenshot in dark mode
    await page.screenshot({
      path: path.join(screenshotsDir, '03-dark-mode-enabled.png'),
      fullPage: true
    });
    console.log('✅ Screenshot: Dark mode enabled');

    // Try to navigate to a specific route if it exists
    const possibleRoutes = [
      '/avi',
      '/chat',
      '/avi-chat',
      '/dm',
      '/avi-dm'
    ];

    for (const route of possibleRoutes) {
      try {
        console.log(`📍 Trying route: ${route}`);
        await page.goto(`http://localhost:5173${route}`, {
          waitUntil: 'networkidle',
          timeout: 5000
        });

        await page.screenshot({
          path: path.join(screenshotsDir, `04-route${route.replace(/\//g, '-')}.png`),
          fullPage: true
        });
        console.log(`✅ Screenshot: Route ${route}`);

        // Check if there's a chat interface
        const hasChat = await page.locator('textarea, input[type="text"]').count() > 0;
        if (hasChat) {
          console.log(`✓ Found chat interface at ${route}`);
          break;
        }
      } catch (error) {
        console.log(`  Route ${route} not found`);
      }
    }

    // Get HTML structure to understand the page
    console.log('📋 Getting page structure...');
    const bodyHTML = await page.evaluate(() => {
      return document.body.innerHTML.substring(0, 5000); // First 5000 chars
    });

    fs.writeFileSync(
      path.join(screenshotsDir, 'page-structure.html'),
      bodyHTML
    );
    console.log('✅ Saved page structure');

    console.log('\n✅ Investigation complete! Screenshots saved to:', screenshotsDir);
    console.log('\nNext steps:');
    console.log('1. Review screenshots to identify the actual issue');
    console.log('2. Locate the AVI DM chat component');
    console.log('3. Fix the identified text visibility issues');

  } catch (error) {
    console.error('❌ Error during investigation:', error);

    // Take error screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'error-state.png'),
      fullPage: true
    });
  } finally {
    await browser.close();
  }
}

investigateDarkMode().catch(console.error);

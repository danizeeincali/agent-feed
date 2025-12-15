#!/usr/bin/env node

/**
 * Screenshot Capture Script for Quick Post Simplified Interface
 *
 * This script captures production screenshots for documentation purposes.
 * It uses Playwright directly without the full test harness.
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'screenshots', 'after');
const BASE_URL = 'http://localhost:5173';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📍 Navigating to application...');
    await page.goto(BASE_URL);
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });
    console.log('✅ Application loaded\n');

    // Screenshot 1: Desktop two tabs
    console.log('📸 Capturing: desktop-two-tabs.png');
    await page.setViewportSize({ width: 1920, height: 1080 });
    const postingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await postingInterface.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-two-tabs.png')
    });
    console.log('✅ Saved: desktop-two-tabs.png\n');

    // Screenshot 2: Desktop quick post empty
    console.log('📸 Capturing: desktop-quick-post-empty.png');
    const quickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await quickPostTab.click();
    const textarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await textarea.fill('');
    await page.waitForTimeout(200);
    await postingInterface.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-quick-post-empty.png')
    });
    console.log('✅ Saved: desktop-quick-post-empty.png\n');

    // Screenshot 3: Desktop 5000 chars
    console.log('📸 Capturing: desktop-quick-post-5000-chars.png');
    const content5000 = 'This is a production validation test with substantial content. '.repeat(80);
    await textarea.fill(content5000.substring(0, 5000));
    await page.waitForTimeout(200);
    await postingInterface.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-quick-post-5000-chars.png')
    });
    console.log('✅ Saved: desktop-quick-post-5000-chars.png\n');

    // Screenshot 4: Desktop 9500 chars (counter appears)
    console.log('📸 Capturing: desktop-quick-post-9500-chars.png');
    const content9500 = 'a'.repeat(9500);
    await textarea.fill(content9500);
    await page.waitForTimeout(300);
    await postingInterface.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-quick-post-9500-chars.png')
    });
    console.log('✅ Saved: desktop-quick-post-9500-chars.png\n');

    // Screenshot 5: Desktop 10000 chars (red counter)
    console.log('📸 Capturing: desktop-quick-post-10000-chars.png');
    const content10000 = 'a'.repeat(10000);
    await textarea.fill(content10000);
    await page.waitForTimeout(300);
    await postingInterface.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'desktop-quick-post-10000-chars.png')
    });
    console.log('✅ Saved: desktop-quick-post-10000-chars.png\n');

    // Screenshot 6: Mobile view
    console.log('📸 Capturing: mobile-quick-post-new.png');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto(BASE_URL);
    await page.waitForSelector('[aria-label="Posting tabs"]', { timeout: 10000 });
    const mobileQuickPostTab = page.locator('[aria-label="Posting tabs"] button:has-text("Quick Post")');
    await mobileQuickPostTab.click();
    const mobileTextarea = page.locator('textarea[placeholder*="What\'s on your mind"]');
    await mobileTextarea.fill('This is a mobile view test of the new Quick Post interface!');
    await page.waitForTimeout(200);
    const mobilePostingInterface = page.locator('.bg-white.rounded-lg.border.border-gray-200.shadow-sm').first();
    await mobilePostingInterface.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'mobile-quick-post-new.png')
    });
    console.log('✅ Saved: mobile-quick-post-new.png\n');

    console.log('✨ All screenshots captured successfully!\n');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);
    console.log('\nFiles created:');
    console.log('  - desktop-two-tabs.png');
    console.log('  - desktop-quick-post-empty.png');
    console.log('  - desktop-quick-post-5000-chars.png');
    console.log('  - desktop-quick-post-9500-chars.png');
    console.log('  - desktop-quick-post-10000-chars.png');
    console.log('  - mobile-quick-post-new.png');

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the script
captureScreenshots()
  .then(() => {
    console.log('\n✅ Screenshot capture complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Screenshot capture failed:', error);
    process.exit(1);
  });

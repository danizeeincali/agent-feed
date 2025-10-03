import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'tests/e2e/screenshots/backend-sorting-relative-time';

async function captureDetailedScreenshots() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to the feed
    console.log('Navigating to feed...');
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Expand first few posts to see full content with timestamps
    console.log('Expanding posts to show timestamps...');
    const expandButtons = page.locator('button:has-text("Expand"), svg[class*="chevron"]').first();

    for (let i = 0; i < 3; i++) {
      try {
        const buttons = await page.locator('button:has-text("Expand")').all();
        if (buttons[i]) {
          await buttons[i].click();
          await page.waitForTimeout(500);
        }
      } catch (e) {
        console.log(`Could not expand post ${i}`);
      }
    }

    // Take screenshot showing expanded posts with timestamps
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-expanded-posts-with-timestamps.png'),
      fullPage: true
    });

    // Focus on the timestamp area of first post
    const firstPost = page.locator('[class*="post"], [class*="card"]').first();
    await firstPost.scrollIntoViewIfNeeded();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11-closeup-timestamp-and-stats.png'),
      fullPage: false
    });

    console.log('✓ Detailed screenshots captured!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

captureDetailedScreenshots().catch(console.error);

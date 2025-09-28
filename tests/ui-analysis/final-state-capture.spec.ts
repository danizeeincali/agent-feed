import { test } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = join(__dirname, '../screenshots/ui-analysis');

test('Capture final loaded state', async ({ page }) => {
  console.log('📸 Capturing final loaded state of the application...');

  await page.setViewportSize({ width: 1920, height: 1080 });

  // Navigate and wait longer for full load
  await page.goto(BASE_URL, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait for React app to fully load based on the logs we saw
  console.log('⏱️  Waiting for app to fully load...');
  await page.waitForTimeout(15000);

  const timestamp = Date.now();
  const screenshot = join(SCREENSHOT_DIR, `final-loaded-state-${timestamp}.png`);

  await page.screenshot({
    path: screenshot,
    fullPage: true,
    animations: 'disabled'
  });

  // Quick check of final state
  const finalState = await page.evaluate(() => {
    return {
      title: document.title,
      bodyTextLength: (document.body.innerText || '').length,
      hasLoadingText: (document.body.innerText || '').includes('Loading'),
      hasPosts: (document.body.innerText || '').includes('Test Post') ||
                (document.body.innerText || '').includes('Production'),
      visibleElements: document.querySelectorAll('*').length
    };
  });

  console.log('\n=== FINAL STATE CAPTURED ===');
  console.log(`📸 Screenshot: ${screenshot}`);
  console.log(`📝 Content length: ${finalState.bodyTextLength} characters`);
  console.log(`⏳ Still showing loading: ${finalState.hasLoadingText}`);
  console.log(`📋 Has post content: ${finalState.hasPosts}`);
  console.log(`🎨 Total DOM elements: ${finalState.visibleElements}`);

  if (finalState.hasPosts && !finalState.hasLoadingText) {
    console.log('✅ SUCCESS: Application has fully loaded with content!');
    console.log('   The "UI styling is all off" issue is likely a timing/loading issue.');
  } else if (finalState.hasLoadingText) {
    console.log('⚠️  App still showing loading state after 15 seconds');
  } else {
    console.log('❓ App loaded but content unclear');
  }
});
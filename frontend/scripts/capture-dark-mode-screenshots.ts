import { chromium } from '@playwright/test';

async function captureScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    colorScheme: 'dark',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    // Feed page
    console.log('Capturing feed page...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'test-results/screenshot-dark-feed.png',
      fullPage: true
    });

    // Drafts page
    console.log('Capturing drafts page...');
    await page.goto('http://localhost:5173/drafts', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'test-results/screenshot-dark-drafts.png',
      fullPage: true
    });

    // Agents page
    console.log('Capturing agents page...');
    await page.goto('http://localhost:5173/agents', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: 'test-results/screenshot-dark-agents.png',
      fullPage: true
    });

    console.log('✅ All screenshots captured successfully');
  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
  } finally {
    await browser.close();
  }
}

captureScreenshots();

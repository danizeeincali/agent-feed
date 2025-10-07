import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to component showcase page...');
  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('Waiting for page to load...');
  await page.waitForTimeout(3000);

  // Take full page screenshot
  console.log('Capturing full page screenshot...');
  await page.screenshot({
    path: 'tests/e2e/component-showcase/screenshots/manual-full-page.png',
    fullPage: true
  });

  // Take viewport screenshot
  console.log('Capturing viewport screenshot...');
  await page.screenshot({
    path: 'tests/e2e/component-showcase/screenshots/manual-viewport.png',
    fullPage: false
  });

  // Get page title and URL
  const title = await page.title();
  const url = page.url();

  console.log(`\n✅ Screenshots captured successfully!`);
  console.log(`   Title: ${title}`);
  console.log(`   URL: ${url}`);
  console.log(`   Full Page: tests/e2e/component-showcase/screenshots/manual-full-page.png`);
  console.log(`   Viewport: tests/e2e/component-showcase/screenshots/manual-viewport.png`);

  await browser.close();
})();

import { chromium } from 'playwright';

async function quickCheck() {
  console.log('Starting quick check...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Capture console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/mermaid-all-types-test', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('Page loaded, waiting 30 seconds...\n');
  await page.waitForTimeout(30000);

  // Check status
  const renderingCount = await page.locator('text=Rendering diagram').count();
  const errorCount = await page.locator('text=Error rendering diagram').count();
  const errorCount2 = await page.locator('text=Invalid Mermaid Syntax').count();
  const svgCount = await page.locator('svg').count();

  console.log('=== STATUS AFTER 30 SECONDS ===');
  console.log(`Still rendering: ${renderingCount}`);
  console.log(`Errors shown: ${errorCount + errorCount2}`);
  console.log(`SVGs rendered: ${svgCount}`);

  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.slice(-20).forEach(msg => console.log(msg));

  console.log('\n=== PAGE ERRORS ===');
  pageErrors.forEach(err => console.log(err));

  // Take screenshot
  await page.screenshot({ path: '/tmp/debug-screenshot.png', fullPage: true });
  console.log('\n✓ Screenshot saved to /tmp/debug-screenshot.png');

  await browser.close();
}

quickCheck().catch(console.error);

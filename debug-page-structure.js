import { chromium } from 'playwright';

async function debugPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/mermaid-all-types-test', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  await page.waitForTimeout(5000);

  // Get all elements that might contain Mermaid diagrams
  const html = await page.content();
  console.log('=== PAGE STRUCTURE ===\n');

  // Check for various selectors
  const selectors = [
    '[data-testid="mermaid-container"]',
    '.mermaid-container',
    '[class*="mermaid"]',
    '[class*="Mermaid"]',
    'svg',
    '[role="img"]',
    'div:has-text("Rendering diagram")'
  ];

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    console.log(`${selector}: ${count} elements`);
  }

  // Get text content of "Rendering diagram" elements
  const renderingElements = await page.locator('text=Rendering diagram').all();
  console.log(`\nFound ${renderingElements.length} "Rendering diagram" texts`);

  // Get parent elements of "Rendering diagram" text
  for (let i = 0; i < Math.min(renderingElements.length, 3); i++) {
    const el = renderingElements[i];
    const parent = await el.evaluateHandle(el => el.parentElement);
    const classList = await parent.evaluate(el => el.className);
    const testId = await parent.evaluate(el => el.getAttribute('data-testid'));
    console.log(`\nElement ${i + 1}:`);
    console.log(`  Class: ${classList}`);
    console.log(`  Data-testid: ${testId}`);
  }

  // Check the main content area
  const mainContent = await page.locator('main').innerHTML();
  console.log('\n=== First 2000 chars of main content ===');
  console.log(mainContent.substring(0, 2000));

  await browser.close();
}

debugPage().catch(console.error);

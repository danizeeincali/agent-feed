import { test, expect } from '@playwright/test';

test('Debug: Check if headers have IDs', async ({ page }) => {
  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples');
  await page.waitForLoadState('networkidle');

  // Get all headers
  const headers = await page.$$('h1, h2, h3, h4, h5, h6');

  console.log(`\n=== Found ${headers.length} headers ===`);

  for (let i = 0; i < Math.min(headers.length, 15); i++) {
    const header = headers[i];
    const tagName = await header.evaluate(el => el.tagName);
    const id = await header.getAttribute('id');
    const text = await header.textContent();

    console.log(`${i + 1}. <${tagName}> id="${id}" text="${text?.substring(0, 50)}"`);
  }

  // Take screenshot
  await page.screenshot({
    path: '/tmp/debug-headers.png',
    fullPage: true
  });

  console.log('\nScreenshot saved to /tmp/debug-headers.png');
});

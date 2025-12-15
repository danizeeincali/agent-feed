import { test, expect } from '@playwright/test';

test('Quick verification - headers have IDs', async ({ page }) => {
  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-and-examples');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Wait for React to render

  // Check for specific headers
  const header1 = page.locator('h1, h2').filter({ hasText: 'Component Showcase & Examples' }).first();
  const id1 = await header1.getAttribute('id');
  console.log(`Main header ID: "${id1}"`);

  const header2 = page.locator('h1, h2').filter({ hasText: 'Text & Content' }).first();
  const id2 = await header2.getAttribute('id');
  console.log(`Text & Content header ID: "${id2}"`);

  // Check all headers
  const allHeaders = await page.locator('h1, h2, h3, h4, h5, h6').all();
  console.log(`\nTotal headers: ${allHeaders.length}`);

  let headersWithId = 0;
  for (const header of allHeaders.slice(0, 15)) {
    const id = await header.getAttribute('id');
    const text = await header.textContent();
    console.log(`  ${id ? '✓' : '✗'} id="${id || 'none'}" text="${text?.substring(0, 40)}"`);
    if (id) headersWithId++;
  }

  console.log(`\nHeaders with IDs: ${headersWithId}/${allHeaders.length}`);

  // Screenshot
  await page.screenshot({ path: '/tmp/quick-test-screenshot.png', fullPage: true });

  // Try clicking a sidebar link
  const sidebarLink = page.locator('nav a[href="#text-content"]').first();
  if (await sidebarLink.count() > 0) {
    console.log('\nClicking sidebar link #text-content...');
    await sidebarLink.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/after-click-screenshot.png' });
    console.log('Screenshot after click saved');
  }
});

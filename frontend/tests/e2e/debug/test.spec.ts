import { test } from '@playwright/test';

test('diagnose removechild', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => {
    errors.push(e.message);
    console.error('ERROR:', e.message, e.stack);
  });
  
  await page.goto('http://127.0.0.1:5173/agents/page-builder-agent/pages/component-showcase-complete-v3');
  await page.waitForTimeout(5000);
  
  console.log('Total errors:', errors.length);
  await page.screenshot({ path: 'error.png' });
});

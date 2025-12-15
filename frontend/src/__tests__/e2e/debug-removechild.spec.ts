import { test, expect } from '@playwright/test';

test('Debug removeChild error on component showcase', async ({ page }) => {
  // Collect all console messages and errors
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', error => {
    pageErrors.push(`${error.name}: ${error.message}\n${error.stack}`);
  });

  // Navigate to the problematic page
  console.log('🔍 Navigating to component showcase...');
  await page.goto('http://127.0.0.1:5173/agents/page-builder-agent/pages/component-showcase-complete-v3', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // Wait a bit for any errors to appear
  await page.waitForTimeout(3000);

  // Log all collected information
  console.log('\n📊 === DIAGNOSTIC REPORT ===\n');

  console.log('🔴 Page Errors:', pageErrors.length);
  pageErrors.forEach((error, i) => {
    console.log(`\nError ${i + 1}:`);
    console.log(error);
  });

  console.log('\n🟡 Console Errors:', consoleErrors.length);
  consoleErrors.forEach((error, i) => {
    console.log(`${i + 1}. ${error}`);
  });

  console.log('\n📝 All Console Messages:');
  consoleMessages.slice(-50).forEach(msg => console.log(msg));

  // Take screenshot
  await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved to error-screenshot.png');

  // Check DOM state
  const rootContent = await page.evaluate(() => {
    return {
      hasRoot: !!document.getElementById('root'),
      rootChildren: document.getElementById('root')?.children.length || 0,
      bodyHTML: document.body.innerHTML.substring(0, 500)
    };
  });

  console.log('\n🌳 DOM State:', JSON.stringify(rootContent, null, 2));
});

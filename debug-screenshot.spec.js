const { test, expect } = require('@playwright/test');

test('Debug screenshot - what user actually sees', async ({ page }) => {
  console.log('Taking debug screenshot...');

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Take full page screenshot
  await page.screenshot({
    path: 'debug-main-page.png',
    fullPage: true
  });

  // Check what's actually in the DOM
  const bodyContent = await page.locator('body').innerHTML();
  console.log('Page content length:', bodyContent.length);

  // Check for loading spinner
  const hasSpinner = await page.locator('.animate-spin').count();
  console.log('Loading spinners found:', hasSpinner);

  // Check for purple gradient
  const hasPurpleGradient = await page.locator('.bg-gradient-to-br.from-indigo-500.to-purple-600').count();
  console.log('Purple gradient elements found:', hasPurpleGradient);

  // Check page title
  const title = await page.title();
  console.log('Page title:', title);

  // Check console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.reload();
  await page.waitForLoadState('networkidle');

  console.log('Console errors:', errors);
});
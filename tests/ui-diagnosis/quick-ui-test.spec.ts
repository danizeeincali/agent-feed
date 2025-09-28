import { test, expect } from '@playwright/test';

test('Capture current UI state', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:5173');

  // Wait for content to load
  await page.waitForTimeout(3000);

  // Capture full page screenshot
  await page.screenshot({
    path: 'ui-current-state.png',
    fullPage: true
  });

  // Check if Tailwind classes are working
  const hasValidStyling = await page.evaluate(() => {
    const element = document.querySelector('body');
    if (!element) return false;

    const computedStyle = window.getComputedStyle(element);
    return computedStyle.fontFamily !== '' && computedStyle.backgroundColor !== '';
  });

  console.log('Has valid styling:', hasValidStyling);

  // Check for CSS loading
  const stylesheetCount = await page.evaluate(() => {
    return document.querySelectorAll('link[rel="stylesheet"]').length;
  });

  console.log('Stylesheet count:', stylesheetCount);
});
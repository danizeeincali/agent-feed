/**
 * Debug test to understand navigation rendering issues
 */

import { test, expect } from '@playwright/test';

test('Debug navigation rendering', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => console.log(`PAGE LOG: ${msg.text()}`));
  page.on('pageerror', error => console.log(`PAGE ERROR: ${error.message}`));

  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');

  // Take a screenshot to see what's rendered
  await page.screenshot({ path: 'debug-navigation.png', fullPage: true });

  // Check what's in the page
  const pageContent = await page.textContent('body');
  console.log('Page content length:', pageContent?.length);
  console.log('Page content preview:', pageContent?.slice(0, 500));

  // Check for specific elements
  const rootElement = page.locator('#root');
  console.log('Root element visible:', await rootElement.isVisible());

  // Check for navigation specifically
  const navElements = await page.locator('nav').all();
  console.log('Navigation elements found:', navElements.length);

  const navigationElements = await page.locator('.navigation').all();
  console.log('Navigation class elements found:', navigationElements.length);

  // Check for any links
  const allLinks = await page.locator('a').all();
  console.log('Total links found:', allLinks.length);

  if (allLinks.length > 0) {
    for (let i = 0; i < Math.min(allLinks.length, 5); i++) {
      const linkText = await allLinks[i].textContent();
      const linkHref = await allLinks[i].getAttribute('href');
      console.log(`Link ${i}: "${linkText}" -> ${linkHref}`);
    }
  }

  // Check if App is loaded
  const appElements = await page.locator('[data-testid="agent-feed"]').all();
  console.log('App elements found:', appElements.length);

  // Check for error elements
  const errorElements = await page.locator('.error, [data-testid="error"]').all();
  console.log('Error elements found:', errorElements.length);

  // Wait a bit more and check again
  await page.waitForTimeout(3000);
  
  const finalContent = await page.textContent('body');
  console.log('Final content length:', finalContent?.length);
  console.log('Final content differs from initial:', finalContent !== pageContent);
});
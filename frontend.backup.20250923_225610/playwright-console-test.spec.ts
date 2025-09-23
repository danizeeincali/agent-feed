import { test, expect } from '@playwright/test';

test('Check dual-instance console errors and white screen', async ({ page }) => {
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to dual-instance page
  await page.goto('http://127.0.0.1:3001/dual-instance');
  
  // Wait for potential React rendering
  await page.waitForTimeout(3000);
  
  // Log all console errors
  console.log('Console Errors Found:', consoleErrors);
  
  // Check page content
  const bodyText = await page.textContent('body');
  console.log('Page text content length:', bodyText?.length || 0);
  
  // Check for React root
  const reactRoot = await page.$('#root');
  const rootHTML = await reactRoot?.innerHTML();
  console.log('React root HTML length:', rootHTML?.length || 0);
  
  // Check for specific components
  const hasTitle = await page.textContent('text=Dual Instance Monitor');
  console.log('Has Dual Instance Monitor title:', !!hasTitle);
  
  // Take screenshot for analysis
  await page.screenshot({ path: 'dual-instance-debug.png' });
  
  // Assert no white screen
  expect(bodyText?.length || 0).toBeGreaterThan(100);
});
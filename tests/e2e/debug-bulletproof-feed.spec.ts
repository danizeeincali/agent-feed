import { test, expect } from '@playwright/test';

test.describe('Debug BulletproofSocialMediaFeed', () => {
  test('should check for JavaScript errors and component rendering', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });

    // Listen for page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });

    // Navigate to the page
    await page.goto('http://localhost:5173');
    
    // Wait a bit for component to render or error
    await page.waitForTimeout(5000);
    
    // Check if anything is rendered in the main content area
    const mainContent = page.locator('[data-testid="app-container"]');
    await expect(mainContent).toBeVisible({ timeout: 30000 });
    
    // Take full page screenshot
    await page.screenshot({ path: 'debug-bulletproof-full-page.png', fullPage: true });
    
    // Check for any content in main area
    const mainText = await mainContent.textContent();
    console.log('Main content text length:', mainText?.length || 0);
    console.log('First 200 chars:', mainText?.substring(0, 200) || 'No content');
    
    // Check for React error boundaries
    const errorBoundary = page.locator('text=Something went wrong');
    if (await errorBoundary.count() > 0) {
      console.log('❌ React Error Boundary detected');
      await errorBoundary.screenshot({ path: 'debug-error-boundary.png' });
    }
    
    // Print collected errors
    console.log('Console errors:', consoleErrors.length);
    consoleErrors.forEach((error, i) => console.log(`  ${i + 1}: ${error}`));
    
    console.log('Page errors:', pageErrors.length);
    pageErrors.forEach((error, i) => console.log(`  ${i + 1}: ${error}`));
    
    // Check if the page has any actual content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });
});
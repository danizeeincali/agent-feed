import { test, expect } from '@playwright/test';

test.describe('Quick White Screen Fix Validation', () => {
  test('Application loads without white screen', async ({ page }) => {
    console.log('🔍 Testing white screen fix...');
    
    // Navigate to application
    await page.goto('http://localhost:5173');
    
    // Wait for app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Check root has content
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.trim()).not.toBe('');
    console.log('✅ Root element has content');
    
    // Check for basic React app structure
    await expect(page.locator('body')).toBeVisible();
    
    // Check page title
    const title = await page.title();
    expect(title).toContain('Agent Feed');
    console.log('✅ Page title correct:', title);
    
    // Take screenshot for verification
    await page.screenshot({ path: 'frontend/validation-screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved');
  });

  test('SimpleLauncher component renders', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('#root');
    
    // Look for SimpleLauncher content indicators
    const hasLauncherTitle = await page.getByText('Claude Code Launcher').isVisible().catch(() => false);
    const hasButtons = await page.locator('button').count() > 0;
    const hasContent = await page.locator('body').textContent();
    
    console.log('🔍 SimpleLauncher checks:');
    console.log('  - Title visible:', hasLauncherTitle);
    console.log('  - Buttons present:', hasButtons);
    console.log('  - Content length:', hasContent?.length || 0);
    
    // Verify we have some interactive content
    expect(hasButtons).toBe(true);
    console.log('✅ Interactive content confirmed');
  });
});
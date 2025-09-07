import { test, expect } from '@playwright/test';

test.describe('Debug Post Creator', () => {
  test('should check if post creator section exists and scroll to find it', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="app-container"]', { timeout: 30000 });
    
    // Take initial screenshot
    await page.screenshot({ path: 'debug-initial.png', fullPage: true });
    
    // Look for any post creator related text
    const startPostText = page.locator('text=Start a post');
    const createPostText = page.locator('text=Create');
    
    console.log('Looking for post creator elements...');
    
    // Check if start post button exists anywhere
    const hasStartPost = await startPostText.count();
    console.log(`Start post elements found: ${hasStartPost}`);
    
    const hasCreatePost = await createPostText.count();
    console.log(`Create post elements found: ${hasCreatePost}`);
    
    // Get all buttons on page
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`Total buttons found: ${buttonCount}`);
    
    // Print button texts
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent();
      console.log(`Button ${i}: "${text}"`);
    }
    
    // Look specifically for AI avatar and start post area
    const aiAvatar = page.locator('text=AI');
    if (await aiAvatar.count() > 0) {
      console.log('Found AI avatar, scrolling to it');
      await aiAvatar.scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'debug-ai-area.png' });
    }
    
    // Try to find the start post button by different selectors
    const possibleSelectors = [
      '[data-testid="start-post-button"]',
      'text=Start a post',
      'button:has-text("Start a post")',
      '.rounded-full:has-text("Start")'
    ];
    
    for (const selector of possibleSelectors) {
      const element = page.locator(selector);
      const count = await element.count();
      console.log(`Selector "${selector}": ${count} elements found`);
      
      if (count > 0) {
        await element.first().scrollIntoViewIfNeeded();
        await page.screenshot({ path: `debug-found-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
      }
    }
  });
});
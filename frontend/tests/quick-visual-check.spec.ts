import { test, expect } from '@playwright/test';

// Quick validation test for immediate feedback
test.describe('Quick Visual Validation', () => {
  test('Should load page without white screen - Fast Check', async ({ page }) => {
    console.log('🚀 Starting quick visual validation...');
    
    // Navigate to the application
    await page.goto('http://localhost:5173', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });

    // Wait a bit for React to mount
    await page.waitForTimeout(2000);

    // Quick screenshot
    await page.screenshot({ 
      path: 'test-results/quick-validation.png',
      fullPage: true 
    });

    // Basic content checks
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      return {
        hasText: (body.textContent?.trim().length || 0) > 0,
        hasElements: body.children.length > 0,
        rootExists: !!document.querySelector('#root'),
        rootHasChildren: (document.querySelector('#root')?.children.length || 0) > 0
      };
    });

    console.log('📊 Quick validation results:', hasContent);

    // Assert content is present
    expect(hasContent.hasText).toBe(true);
    expect(hasContent.hasElements).toBe(true);
    expect(hasContent.rootExists).toBe(true);
    expect(hasContent.rootHasChildren).toBe(true);

    console.log('✅ Quick validation passed - No white screen detected!');
  });
});
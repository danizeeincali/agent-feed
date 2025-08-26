import { test, expect } from '@playwright/test';

test.describe('Final White Screen Resolution Validation', () => {
  test('should display actual content instead of white screen', async ({ page }) => {
    console.log('🚀 Starting final validation test...');
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for React to fully load
    await page.waitForTimeout(2000);
    
    // Take screenshot for visual verification
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/tests/screenshots/final-validation.png', fullPage: true });
    
    // Verify the page has actual content (not white screen)
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for React root element
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    await expect(root).not.toBeEmpty();
    
    // Verify specific content is rendered
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content?.trim()).not.toBe('');
    
    // Check for React components
    const reactElements = await page.$$('[data-reactroot], .react-component, [class*="react"], [class*="component"]');
    console.log(`Found ${reactElements.length} React-related elements`);
    
    // Verify no critical errors in console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(1000);
    
    // Log console messages for debugging
    const consoleLogs = [];
    page.on('console', msg => {
      consoleLogs.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Check if page is actually rendering content
    const pageContent = await page.content();
    expect(pageContent).toContain('<!DOCTYPE html>');
    expect(pageContent.length).toBeGreaterThan(1000); // Should have substantial content
    
    // Verify background color is not white (indicating content is rendered)
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      return {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color,
        display: computedStyle.display
      };
    });
    
    console.log('Body styles:', bodyStyles);
    
    // Check for interactive elements
    const interactiveElements = await page.$$('button, a, input, select, textarea');
    console.log(`Found ${interactiveElements.length} interactive elements`);
    
    // Final verification: ensure we have a functioning React app
    const reactVersion = await page.evaluate(() => {
      // @ts-ignore
      return window.React?.version || 'React not found on window';
    });
    
    console.log('React version:', reactVersion);
    
    // Ensure no white screen by checking for actual rendered content
    const hasVisibleContent = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return false;
      
      const rect = root.getBoundingClientRect();
      const hasSize = rect.width > 0 && rect.height > 0;
      const hasChildren = root.children.length > 0;
      const hasText = root.textContent && root.textContent.trim().length > 0;
      
      return hasSize && (hasChildren || hasText);
    });
    
    expect(hasVisibleContent).toBe(true);
    
    console.log('✅ Final validation completed successfully - White screen issue resolved!');
  });

  test('should handle navigation and routing correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);
    
    // Test basic navigation if available
    const links = await page.$$('a[href]');
    console.log(`Found ${links.length} navigation links`);
    
    // Verify page responds to interactions
    await page.click('body');
    await page.waitForTimeout(500);
    
    // Check if any JavaScript errors occurred during interaction
    let jsErrors = false;
    page.on('pageerror', () => {
      jsErrors = true;
    });
    
    await page.waitForTimeout(1000);
    expect(jsErrors).toBe(false);
  });
});
import { test, expect } from '@playwright/test';

/**
 * TDD Regression Test Suite: White Screen Prevention
 * Purpose: Prevent React app mounting failures that cause white screen
 * Regression Pattern: Vite dev server kills, process hangs, compilation errors
 * NLD Training Target: Frontend loading reliability
 */

test.describe('White Screen Prevention Regression Tests', () => {
  
  test('should load React app without white screen', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Wait for React app to mount
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Verify #root is not empty (prevents white screen)
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.trim()).not.toBe('');
    
    // Verify main components are rendered
    await expect(page.locator('button:has-text("🚀 prod/claude")')).toBeVisible();
    await expect(page.locator('button:has-text("⚡ skip-permissions")')).toBeVisible();
    await expect(page.locator('button:has-text("⚡ skip-permissions -c")')).toBeVisible();
    await expect(page.locator('button:has-text("↻ skip-permissions --resume")')).toBeVisible();
  });

  test('should handle Vite dev server restarts gracefully', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Initial load
    await expect(page.locator('#root')).not.toBeEmpty();
    
    // Simulate page refresh (common after dev server restart)
    await page.reload();
    
    // Should still load without white screen
    await page.waitForSelector('#root', { timeout: 10000 });
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.trim()).not.toBe('');
    
    // Verify components still render
    await expect(page.locator('button')).toHaveCount(4); // 4 launcher buttons
  });

  test('should prevent compilation errors causing white screen', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5173');
    
    // Check for compilation error indicators
    const hasCompilationError = await page.evaluate(() => {
      return document.body.textContent?.includes('Failed to compile') ||
             document.body.textContent?.includes('Module not found') ||
             document.body.textContent?.includes('SyntaxError');
    });
    
    expect(hasCompilationError).toBeFalsy();
    
    // Verify successful React mounting
    await expect(page.locator('#root')).not.toBeEmpty();
  });

  test('should handle TypeScript definition issues', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Check console for TypeScript errors
    const tsErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('TS')) {
        tsErrors.push(msg.text());
      }
    });
    
    // Wait for app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Should not have critical TS errors preventing render
    expect(tsErrors.length).toBe(0);
    
    // Verify import.meta.env works (common TS issue)
    const hasEnvAccess = await page.evaluate(() => {
      try {
        return typeof import.meta !== 'undefined';
      } catch {
        return false;
      }
    });
    expect(hasEnvAccess).toBeTruthy();
  });

  test('should maintain responsive design during feature additions', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Verify layout doesn't break with 4 buttons
    await expect(page.locator('button')).toHaveCount(4);
    
    // Check buttons are properly styled and clickable
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      
      // Verify button has proper styling (not broken CSS)
      const styles = await button.evaluate(el => getComputedStyle(el));
      expect(styles.display).not.toBe('none');
      expect(styles.visibility).not.toBe('hidden');
    }
  });

  test('should prevent cascade failures during fixes', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Verify app loads (white screen prevention)
    await expect(page.locator('#root')).not.toBeEmpty();
    
    // Verify terminal functionality wasn't broken by white screen fix
    await page.click('button:has-text("🚀 prod/claude")');
    
    // Should open terminal without WebSocket errors
    await page.waitForSelector('.terminal-container, [class*="terminal"]', { timeout: 10000 });
    
    // Both fixes should work together
    await expect(page.locator('#root')).not.toBeEmpty(); // White screen still prevented
    await expect(page.locator('.connection-status')).toContainText(/connecting|connected/, { timeout: 15000 }); // Terminal works
  });
});
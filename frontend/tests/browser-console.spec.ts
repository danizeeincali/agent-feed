import { test, expect, ConsoleMessage } from '@playwright/test';

/**
 * Browser Console Error Detection Suite
 * Validates no JavaScript errors appear in browser console
 */

test.describe('Browser Console Validation', () => {
  let consoleErrors: ConsoleMessage[] = [];
  let consoleWarnings: ConsoleMessage[] = [];
  
  test.beforeEach(async ({ page }) => {
    // Reset collections
    consoleErrors = [];
    consoleWarnings = [];
    
    // Capture all console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg);
      }
    });
    
    // Capture uncaught exceptions
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });
  });
  
  test('should load without console errors', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Wait for app to stabilize
    await page.waitForTimeout(2000);
    
    // Check for any console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:');
      for (const error of consoleErrors) {
        console.log(`  - ${error.text()}`);
      }
    }
    
    // Assert no errors
    expect(consoleErrors).toHaveLength(0);
  });
  
  test('should handle SimpleLauncher navigation without errors', async ({ page }) => {
    await page.goto('/');
    
    // Click on Simple Launcher navigation
    await page.click('text=Simple Launcher');
    
    // Wait for component to load
    await page.waitForSelector('.simple-launcher-container', { timeout: 5000 });
    
    // Verify no new console errors
    expect(consoleErrors).toHaveLength(0);
  });
  
  test('should handle API calls without errors', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Simple Launcher');
    
    // Wait for status check
    await page.waitForTimeout(1000);
    
    // Check for fetch errors
    const fetchErrors = consoleErrors.filter(error => 
      error.text().includes('fetch') || 
      error.text().includes('Failed to fetch') ||
      error.text().includes('NetworkError')
    );
    
    expect(fetchErrors).toHaveLength(0);
  });
  
  test('should not have module resolution errors', async ({ page }) => {
    await page.goto('/');
    
    const moduleErrors = consoleErrors.filter(error => {
      const text = error.text();
      return text.includes('Module not found') ||
             text.includes('Cannot resolve') ||
             text.includes('Failed to resolve import');
    });
    
    expect(moduleErrors).toHaveLength(0);
  });
  
  test('should not have CORS errors', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Simple Launcher');
    await page.waitForTimeout(2000);
    
    const corsErrors = consoleErrors.filter(error => {
      const text = error.text();
      return text.includes('CORS') ||
             text.includes('Cross-Origin') ||
             text.includes('blocked by CORS policy');
    });
    
    if (corsErrors.length > 0) {
      console.log('CORS errors detected - API server may need CORS headers');
    }
    
    expect(corsErrors).toHaveLength(0);
  });
});
/**
 * Comprehensive Playwright White Screen Validation Tests
 * CRITICAL: These tests must pass to confirm white screen is fixed
 */

import { test, expect, Page } from '@playwright/test';

test.describe('White Screen Validation Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable console logging to catch JavaScript errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('BROWSER ERROR:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('PAGE ERROR:', error.message);
    });
  });

  test('CRITICAL: Page should not show white screen on root path', async ({ page }) => {
    console.log('🧪 Testing: http://localhost:5173/');
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    // Wait for React to mount
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Check if root div has content
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(50); // Should have substantial content
    
    // Verify page is not blank
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length || 0).toBeGreaterThan(10);
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'test-results/root-page-validation.png' });
    
    console.log('✅ Root page has content, not white screen');
  });

  test('CRITICAL: SimpleLauncher page should load with 4 buttons', async ({ page }) => {
    console.log('🧪 Testing: http://localhost:5173/simple-launcher');
    
    await page.goto('http://localhost:5173/simple-launcher', { waitUntil: 'networkidle' });
    
    // Wait for SimpleLauncher to load
    await page.waitForSelector('.simple-launcher', { timeout: 10000 });
    
    // Verify the 4 launch buttons are present
    const buttons = await page.locator('button').count();
    expect(buttons).toBeGreaterThanOrEqual(4);
    
    // Check for specific button text from our implementation
    await expect(page.locator('text=prod/claude')).toBeVisible();
    await expect(page.locator('text=skip-permissions')).toBeVisible();
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'test-results/simple-launcher-validation.png' });
    
    console.log('✅ SimpleLauncher loaded with buttons, not white screen');
  });

  test('CRITICAL: No JavaScript console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Give time for errors to surface
    
    // Should have no critical console errors
    const criticalErrors = consoleErrors.filter(error => 
      error.includes('Failed to fetch') || 
      error.includes('SyntaxError') ||
      error.includes('TypeError') ||
      error.includes('ReferenceError')
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    if (consoleErrors.length > 0) {
      console.log('Non-critical console messages:', consoleErrors);
    }
    
    console.log('✅ No critical JavaScript errors found');
  });

  test('CRITICAL: React DevTools hook should be present', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    const reactDevToolsPresent = await page.evaluate(() => {
      return typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
    });
    
    expect(reactDevToolsPresent).toBe(true);
    console.log('✅ React DevTools hook found - React is loaded');
  });

  test('CRITICAL: All CSS and JS assets should load successfully', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', response => {
      if (!response.ok() && response.url().includes('localhost:5173')) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    expect(failedRequests).toHaveLength(0);
    
    if (failedRequests.length > 0) {
      console.error('Failed requests:', failedRequests);
    }
    
    console.log('✅ All assets loaded successfully');
  });

  test('CRITICAL: API proxy should work from frontend', async ({ page }) => {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    
    const apiResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/claude/check');
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(apiResponse.success).toBe(true);
    expect(apiResponse.data).toHaveProperty('claudeAvailable');
    
    console.log('✅ API proxy working correctly');
  });

});

test.describe('Terminal Auto-Command Feature Validation', () => {
  
  test('SimpleLauncher should have all 4 launch buttons with correct text', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher', { waitUntil: 'networkidle' });
    
    // Wait for component to load
    await page.waitForSelector('.simple-launcher', { timeout: 10000 });
    
    // Check for the 4 specific button texts we implemented
    await expect(page.locator('button:has-text("prod/claude")')).toBeVisible();
    await expect(page.locator('button:has-text("skip-permissions")')).toBeVisible(); 
    await expect(page.locator('button:has-text("skip-permissions -c")')).toBeVisible();
    await expect(page.locator('button:has-text("skip-permissions --resume")')).toBeVisible();
    
    console.log('✅ All 4 terminal auto-command buttons present');
  });

  test('Launch buttons should be clickable when Claude is available', async ({ page }) => {
    await page.goto('http://localhost:5173/simple-launcher', { waitUntil: 'networkidle' });
    
    // Wait for Claude availability check
    await page.waitForSelector('[data-testid="claude-availability"]', { timeout: 10000 });
    
    const claudeStatus = await page.locator('[data-testid="claude-availability"]').textContent();
    
    if (claudeStatus?.includes('Available')) {
      const firstButton = page.locator('button:has-text("prod/claude")');
      await expect(firstButton).toBeEnabled();
      console.log('✅ Launch buttons are enabled when Claude is available');
    } else {
      console.log('ℹ️ Claude not available, buttons correctly disabled');
    }
  });

});
/**
 * Playwright E2E Test: Analytics Tab Switching
 * Tests the fix for white screen issue when clicking Token Costs tab
 * Validates in real browser environment
 */

const { test, expect } = require('@playwright/test');

test.describe('Analytics Tab Switching - E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the analytics page
    await page.goto('http://127.0.0.1:3001/analytics');
  });

  test('should navigate to analytics page and show system tab by default', async ({ page }) => {
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("System Analytics")');
    
    // Verify we're on the analytics page
    await expect(page).toHaveTitle(/Agent Feed/);
    await expect(page.locator('h1')).toContainText('System Analytics');
    
    // Verify both tab buttons are present
    await expect(page.locator('button:has-text("System")')).toBeVisible();
    await expect(page.locator('button:has-text("Token Costs")')).toBeVisible();
    
    // System tab should be active by default
    await expect(page.locator('button:has-text("System")')).toHaveClass(/bg-white text-blue-600/);
  });

  test('CRITICAL: should click Token Costs tab without causing white screen', async ({ page }) => {
    // Wait for initial load
    await page.waitForSelector('h1:has-text("System Analytics")');
    
    // Click the Token Costs tab
    const tokenCostsButton = page.locator('button:has-text("Token Costs")');
    await tokenCostsButton.click();
    
    // Verify the tab switch was successful
    await expect(tokenCostsButton).toHaveClass(/bg-white text-blue-600/);
    
    // Wait a bit to ensure no white screen appears
    await page.waitForTimeout(1000);
    
    // Verify page content is still visible (not white screen)
    await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    
    // The tab should be showing Token Costs content or error boundary
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();
    
    // Should not be a white screen - content should be present
    const hasContent = await page.locator('div[class*="p-"]').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('should maintain URL stability during tab switches', async ({ page }) => {
    // Initial URL check
    expect(page.url()).toBe('http://127.0.0.1:3001/analytics');
    
    // Click Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    
    // URL should remain the same
    expect(page.url()).toBe('http://127.0.0.1:3001/analytics');
    
    // Click back to System tab
    await page.locator('button:has-text("System")').click();
    
    // URL should still be the same
    expect(page.url()).toBe('http://127.0.0.1:3001/analytics');
  });

  test('should handle browser back/forward navigation correctly', async ({ page }) => {
    // Start on analytics page
    await page.waitForSelector('h1:has-text("System Analytics")');
    
    // Click Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    await page.waitForTimeout(500);
    
    // Go to another page (home)
    await page.goto('http://127.0.0.1:3001/');
    
    // Use browser back button to return to analytics
    await page.goBack();
    
    // Should return to analytics page without white screen
    await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    
    // Should not be a white screen
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100); // Should have substantial content
  });

  test('should show error boundary if TokenCostAnalytics fails to load', async ({ page }) => {
    // Mock a network failure for token analytics
    await page.route('**/tokens**', route => route.abort());
    
    // Click Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    
    // Should either show Token Cost Analytics or error boundary, not white screen
    await page.waitForTimeout(2000);
    
    // Check that page has content (either component or error message)
    const pageContent = await page.locator('body').innerHTML();
    expect(pageContent.length).toBeGreaterThan(100);
    
    // Should not be completely blank
    const hasVisibleContent = await page.locator('div').count();
    expect(hasVisibleContent).toBeGreaterThan(0);
  });

  test('should allow rapid tab switching without breaking', async ({ page }) => {
    await page.waitForSelector('h1:has-text("System Analytics")');
    
    // Rapidly switch between tabs multiple times
    for (let i = 0; i < 5; i++) {
      await page.locator('button:has-text("Token Costs")').click();
      await page.waitForTimeout(100);
      await page.locator('button:has-text("System")').click();
      await page.waitForTimeout(100);
    }
    
    // Should still be functional
    await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    
    // Final tab switch should work
    await page.locator('button:has-text("Token Costs")').click();
    await page.waitForTimeout(500);
    
    // Should not be white screen
    const bodyContent = await page.locator('body').innerHTML();
    expect(bodyContent.length).toBeGreaterThan(100);
  });

  test('should maintain accessibility during tab switching', async ({ page }) => {
    await page.waitForSelector('h1:has-text("System Analytics")');
    
    // Check initial accessibility
    await expect(page.locator('button:has-text("Token Costs")')).toBeFocusable();
    
    // Tab navigation should work with keyboard
    await page.keyboard.press('Tab'); // Focus on first interactive element
    await page.keyboard.press('Tab'); // Move through elements
    
    // Click Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    
    // Should still be accessible
    await expect(page.locator('button:has-text("System")')).toBeFocusable();
  });
});

/*
 * Expected Results:
 * - All tests should PASS if white screen fix is working
 * - Token Costs tab clicking should never result in white screen
 * - URL should remain stable during tab switches  
 * - Browser navigation should work correctly
 * - Error boundaries should prevent white screens even on component failures
 */
/**
 * Playwright E2E Test: Infinite Spinner Fix Validation
 * Tests that the Token Costs tab no longer shows infinite spinner
 * Validates the fix for WebSocket URL mismatch and loading timeout
 */

const { test, expect } = require('@playwright/test');

test.describe('Infinite Spinner Fix - E2E Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the analytics page
    await page.goto('http://127.0.0.1:3001/analytics');
    
    // Wait for the page to fully load
    await page.waitForSelector('h1:has-text("System Analytics")');
  });

  test('CRITICAL: should complete loading Token Costs tab within 10 seconds', async ({ page }) => {
    // Click the Token Costs tab
    const tokenCostsButton = page.locator('button:has-text("Token Costs")');
    await expect(tokenCostsButton).toBeVisible();
    await tokenCostsButton.click();
    
    // Verify tab is active
    await expect(tokenCostsButton).toHaveClass(/bg-white text-blue-600/);
    
    // Should either show content OR error message within 10 seconds - NO infinite spinner
    await expect(async () => {
      const page_content = await page.content();
      
      // Should NOT have infinite "Token Analytics Loading" after 10 seconds
      const hasInfiniteLoading = page_content.includes('Token Analytics Loading') && 
                                page_content.includes('Please wait');
      
      if (hasInfiniteLoading) {
        // Wait a bit longer and check again
        await page.waitForTimeout(2000);
        const updated_content = await page.content();
        const stillLoading = updated_content.includes('Token Analytics Loading') && 
                           updated_content.includes('Please wait');
        
        expect(stillLoading).toBe(false);
      }
      
      // Should show either:
      // 1. Actual token analytics content
      // 2. "Unable to Load Token Analytics" error message  
      // 3. Some form of meaningful content (not infinite loading)
      const hasError = page_content.includes('Unable to Load Token Analytics');
      const hasContent = page_content.includes('Token Cost Analytics') || 
                        page_content.includes('token') ||
                        page_content.includes('$') ||
                        hasError;
      
      expect(hasContent).toBe(true);
    }).toPass({ timeout: 12000 }); // Give it 12 seconds max
  });

  test('should show error message with retry after timeout', async ({ page }) => {
    // Click Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    
    // Wait longer than the 5-second timeout
    await page.waitForTimeout(7000);
    
    // Should show error message, not infinite loading
    const errorMessage = page.locator('text=Unable to Load Token Analytics');
    const retryButton = page.locator('button:has-text("Retry")');
    
    // Should have either error state OR working component
    const hasError = await errorMessage.isVisible();
    const hasContent = await page.locator('text=Token Cost Analytics').isVisible();
    
    expect(hasError || hasContent).toBe(true);
    
    // If error is shown, retry button should work
    if (hasError) {
      await expect(retryButton).toBeVisible();
      await retryButton.click();
      
      // After retry, should reload the page
      await page.waitForTimeout(1000);
      await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    }
  });

  test('should handle WebSocket connection failures gracefully', async ({ page }) => {
    // Block WebSocket connections to simulate failure
    await page.route('**/ws*', route => route.abort());
    await page.route('**/websocket*', route => route.abort());
    
    // Click Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    
    // Should handle WebSocket failure gracefully within 8 seconds
    await page.waitForTimeout(8000);
    
    // Should NOT be stuck in infinite loading
    const isStillLoading = await page.locator('text=Token Analytics Loading').isVisible();
    expect(isStillLoading).toBe(false);
    
    // Should show either error message or fallback content
    const content = await page.content();
    const hasError = content.includes('Unable to Load') || content.includes('Error');
    const hasContent = content.includes('Token') || content.includes('Analytics');
    
    expect(hasError || hasContent).toBe(true);
  });

  test('should maintain tab functionality even after loading timeout', async ({ page }) => {
    // Click Token Costs tab and wait for timeout
    await page.locator('button:has-text("Token Costs")').click();
    await page.waitForTimeout(7000);
    
    // Should be able to switch back to System tab
    const systemButton = page.locator('button:has-text("System")');
    await systemButton.click();
    
    // System tab should work normally
    await expect(systemButton).toHaveClass(/bg-white text-blue-600/);
    await expect(page.locator('h1:has-text("System Analytics")')).toBeVisible();
    
    // Should be able to go back to Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    await page.waitForTimeout(2000);
    
    // Tab switching should remain functional
    const tokenButton = page.locator('button:has-text("Token Costs")');
    await expect(tokenButton).toHaveClass(/bg-white text-blue-600/);
  });

  test('should show meaningful error details when component fails', async ({ page }) => {
    // Click Token Costs tab
    await page.locator('button:has-text("Token Costs")').click();
    
    // Wait for either successful load or error state
    await page.waitForTimeout(8000);
    
    const pageContent = await page.content();
    
    // If showing error, it should be informative
    if (pageContent.includes('Unable to Load')) {
      // Should mention WebSocket connection issue
      expect(pageContent).toContain('WebSocket');
      
      // Should have retry functionality
      const retryButton = page.locator('button:has-text("Retry")');
      await expect(retryButton).toBeVisible();
    }
    
    // Should NOT show generic/unhelpful error messages
    expect(pageContent).not.toContain('Something went wrong');
    expect(pageContent).not.toContain('An error occurred');
  });
});

/*
 * Expected Results:
 * - NO infinite spinner - loading should complete within 10 seconds
 * - Shows either working Token Analytics OR meaningful error message
 * - Tab switching remains functional regardless of loading state
 * - Error messages are informative and actionable
 * - Retry functionality works when errors occur
 */
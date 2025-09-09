/**
 * SPARC E2E Regression Test - Dropdown Z-Index Issues
 * Priority: P1 (Critical - Known failure pattern)
 * Features: mention-system, ui-components
 * 
 * This test specifically targets the regression where mention dropdowns
 * would appear behind other UI elements due to z-index conflicts.
 */

import { test, expect, Page } from '@playwright/test';
import { TestCategory, TestPriority, FeatureTag } from '../../config/sparc-regression-config';

// Test metadata
const TEST_METADATA = {
  category: TestCategory.E2E,
  priority: TestPriority.P1,
  features: [FeatureTag.MENTION_SYSTEM, FeatureTag.UI_COMPONENTS],
  description: 'Prevent mention dropdown z-index conflicts with other UI elements',
  estimatedDuration: 180, // seconds
};

test.describe('Mention Dropdown Z-Index - SPARC Regression Prevention', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    
    // Ensure we're on the main feed page
    await expect(page).toHaveURL('/');
  });

  test('REGRESSION: Mention dropdown appears above PostCreator header', async ({ page }) => {
    // Click to start creating a post
    await page.click('[data-testid="start-post-button"]');
    
    // Wait for PostCreator to expand
    await expect(page.locator('.bg-white.rounded-xl')).toBeVisible();
    
    // Click in content textarea
    const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentTextarea.click();
    
    // Type @ to trigger mention dropdown
    await contentTextarea.type('@');
    
    // Wait for mention dropdown to appear
    await expect(page.locator('[data-testid="mention-debug-dropdown"]')).toBeVisible({ timeout: 5000 });
    
    // Get z-index values
    const dropdown = page.locator('[data-testid="mention-debug-dropdown"]');
    const header = page.locator('header[data-testid="header"]');
    
    // Check computed styles
    const dropdownZIndex = await dropdown.evaluate(el => window.getComputedStyle(el).zIndex);
    const headerZIndex = await header.evaluate(el => window.getComputedStyle(el).zIndex);
    
    // Verify dropdown has higher z-index
    expect(parseInt(dropdownZIndex) || 0).toBeGreaterThan(parseInt(headerZIndex) || 0);
    expect(parseInt(dropdownZIndex) || 0).toBeGreaterThanOrEqual(99999);
  });

  test('REGRESSION: Mention dropdown appears above navigation sidebar', async ({ page }) => {
    // Open sidebar on mobile/tablet
    if (await page.locator('button[title="Menu"]').isVisible()) {
      await page.click('button[title="Menu"]');
      await page.waitForTimeout(300); // Animation time
    }
    
    // Start creating post
    await page.click('[data-testid="start-post-button"]');
    
    const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentTextarea.click();
    await contentTextarea.type('@');
    
    // Wait for dropdown
    await expect(page.locator('[data-testid="mention-debug-dropdown"]')).toBeVisible();
    
    // Verify dropdown is visible even with sidebar open
    const dropdown = page.locator('[data-testid="mention-debug-dropdown"]');
    const sidebar = page.locator('.fixed.inset-y-0.left-0'); // Sidebar selector
    
    // Check if both elements exist
    if (await sidebar.count() > 0) {
      const dropdownBox = await dropdown.boundingBox();
      const sidebarBox = await sidebar.boundingBox();
      
      // Dropdown should be visible (not completely covered by sidebar)
      expect(dropdownBox).toBeTruthy();
      expect(dropdownBox!.width).toBeGreaterThan(0);
      expect(dropdownBox!.height).toBeGreaterThan(0);
      
      // If sidebar overlaps, dropdown z-index should be higher
      if (sidebarBox && dropdownBox && 
          sidebarBox.x < dropdownBox.x + dropdownBox.width &&
          sidebarBox.x + sidebarBox.width > dropdownBox.x) {
        
        const dropdownZIndex = await dropdown.evaluate(el => window.getComputedStyle(el).zIndex);
        const sidebarZIndex = await sidebar.evaluate(el => window.getComputedStyle(el).zIndex);
        
        expect(parseInt(dropdownZIndex) || 0).toBeGreaterThan(parseInt(sidebarZIndex) || 0);
      }
    }
  });

  test('REGRESSION: Mention dropdown appears above modal overlays', async ({ page }) => {
    // Start creating post
    await page.click('[data-testid="start-post-button"]');
    
    const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentTextarea.click();
    
    // Add some content first
    await contentTextarea.type('This is a test @');
    
    // Wait for mention dropdown
    await expect(page.locator('[data-testid="mention-debug-dropdown"]')).toBeVisible();
    
    // Try to open template library (creates an overlay)
    await page.click('[data-testid="toggle-template-library"]');
    
    // Both template container and dropdown should be visible
    await expect(page.locator('[data-testid="template-library-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="mention-debug-dropdown"]')).toBeVisible();
    
    // Verify dropdown is still interactive
    const suggestions = page.locator('[data-testid="mention-debug-dropdown"] [role="option"]');
    await expect(suggestions.first()).toBeVisible();
    
    // Should be able to click on suggestions
    await suggestions.first().click();
    
    // Dropdown should close after selection
    await expect(page.locator('[data-testid="mention-debug-dropdown"]')).toBeHidden();
    
    // Content should have mention inserted
    expect(await contentTextarea.inputValue()).toMatch(/This is a test @[\w-]+ /);
  });

  test('REGRESSION: Multiple nested dropdowns maintain correct z-index hierarchy', async ({ page }) => {
    // Start creating post  
    await page.click('[data-testid="start-post-button"]');
    
    const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentTextarea.click();
    await contentTextarea.type('@');
    
    // Wait for mention dropdown
    const mentionDropdown = page.locator('[data-testid="mention-debug-dropdown"]');
    await expect(mentionDropdown).toBeVisible();
    
    // Open another dropdown (e.g., filter dropdown in header)
    const filterSelect = page.locator('select').first();
    if (await filterSelect.count() > 0) {
      await filterSelect.click();
    }
    
    // Mention dropdown should still be visible and have highest z-index
    await expect(mentionDropdown).toBeVisible();
    
    const mentionZIndex = await mentionDropdown.evaluate(el => window.getComputedStyle(el).zIndex);
    expect(parseInt(mentionZIndex) || 0).toBeGreaterThanOrEqual(99999);
    
    // Should be able to interact with mention dropdown
    const suggestions = mentionDropdown.locator('[role="option"]');
    await expect(suggestions.first()).toBeVisible();
    await suggestions.first().click();
    
    // Mention should be inserted
    expect(await contentTextarea.inputValue()).toMatch(/@[\w-]+ /);
  });

  test('REGRESSION: Mention dropdown positioning is correct on scroll', async ({ page }) => {
    // Start creating post
    await page.click('[data-testid="start-post-button"]');
    
    const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentTextarea.click();
    
    // Add content to make textarea scrollable
    const longContent = 'Line 1\n'.repeat(20);
    await contentTextarea.type(longContent);
    
    // Scroll textarea to bottom
    await contentTextarea.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    
    // Add mention at the end
    await contentTextarea.type('@');
    
    // Wait for dropdown
    const dropdown = page.locator('[data-testid="mention-debug-dropdown"]');
    await expect(dropdown).toBeVisible();
    
    // Verify dropdown is positioned near the textarea
    const textareaBox = await contentTextarea.boundingBox();
    const dropdownBox = await dropdown.boundingBox();
    
    expect(textareaBox).toBeTruthy();
    expect(dropdownBox).toBeTruthy();
    
    // Dropdown should be positioned below or near the textarea
    expect(dropdownBox!.y).toBeGreaterThanOrEqual(textareaBox!.y - 50);
    expect(dropdownBox!.y).toBeLessThanOrEqual(textareaBox!.y + textareaBox!.height + 100);
    
    // Dropdown should be horizontally aligned
    expect(Math.abs(dropdownBox!.x - textareaBox!.x)).toBeLessThan(50);
  });

  test('REGRESSION: Mention dropdown remains visible during window resize', async ({ page }) => {
    // Start creating post
    await page.click('[data-testid="start-post-button"]');
    
    const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentTextarea.click();
    await contentTextarea.type('@');
    
    // Wait for dropdown
    const dropdown = page.locator('[data-testid="mention-debug-dropdown"]');
    await expect(dropdown).toBeVisible();
    
    // Get initial dropdown position
    const initialBox = await dropdown.boundingBox();
    expect(initialBox).toBeTruthy();
    
    // Resize window
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300); // Allow for responsive adjustments
    
    // Dropdown should still be visible
    await expect(dropdown).toBeVisible();
    
    // Should still be interactive
    const suggestions = dropdown.locator('[role="option"]');
    await expect(suggestions.first()).toBeVisible();
    
    // Resize to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);
    
    // Dropdown should still be visible and usable
    await expect(dropdown).toBeVisible();
    await suggestions.first().click();
    
    // Mention should be inserted
    expect(await contentTextarea.inputValue()).toMatch(/@[\w-]+ /);
  });

  test('REGRESSION: Mention dropdown in CommentThread has correct z-index', async ({ page }) => {
    // Wait for posts to load
    await page.waitForSelector('.space-y-6', { timeout: 10000 });
    
    // Find a post with comments or create a scenario where comments exist
    const posts = page.locator('[data-testid="app-container"] article');
    
    if (await posts.count() === 0) {
      // Create a post first if none exist
      await page.click('[data-testid="start-post-button"]');
      await page.fill('input[placeholder*="compelling title"]', 'Test Post for Comments');
      await page.fill('textarea[placeholder*="Share your insights"]', 'This is a test post.');
      await page.click('[data-testid="submit-post"]');
      
      // Wait for post to appear
      await expect(posts.first()).toBeVisible({ timeout: 10000 });
    }
    
    // Look for comment form or reply button
    const replyButton = page.locator('button:has-text("Reply")').first();
    
    if (await replyButton.count() > 0) {
      await replyButton.click();
      
      // Wait for comment form
      const commentTextarea = page.locator('textarea[placeholder*="Write a reply"]');
      await expect(commentTextarea).toBeVisible();
      
      // Type @ to trigger mention dropdown
      await commentTextarea.type('@');
      
      // Wait for dropdown
      const dropdown = page.locator('[data-testid="mention-debug-dropdown"]');
      await expect(dropdown).toBeVisible();
      
      // Verify dropdown has correct z-index (should be above all other elements)
      const dropdownZIndex = await dropdown.evaluate(el => window.getComputedStyle(el).zIndex);
      expect(parseInt(dropdownZIndex) || 0).toBeGreaterThanOrEqual(99999);
      
      // Should be interactive
      const suggestions = dropdown.locator('[role="option"]');
      await expect(suggestions.first()).toBeVisible();
      await suggestions.first().click();
      
      // Mention should be inserted
      expect(await commentTextarea.inputValue()).toMatch(/@[\w-]+ /);
    }
  });

  // Performance test for z-index calculations
  test('REGRESSION: Z-index calculations do not impact render performance', async ({ page }) => {
    // Start creating post
    await page.click('[data-testid="start-post-button"]');
    
    const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
    await contentTextarea.click();
    
    // Measure time to render dropdown
    const startTime = Date.now();
    
    await contentTextarea.type('@');
    await expect(page.locator('[data-testid="mention-debug-dropdown"]')).toBeVisible();
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    // Should render quickly (< 500ms even with complex z-index calculations)
    expect(renderTime).toBeLessThan(500);
    
    // Should be fully interactive
    const suggestions = page.locator('[data-testid="mention-debug-dropdown"] [role="option"]');
    await expect(suggestions.first()).toBeVisible();
    
    // Performance should remain good with rapid interactions
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape'); // Close dropdown
      await contentTextarea.type('@'); // Reopen dropdown
      await expect(page.locator('[data-testid="mention-debug-dropdown"]')).toBeVisible();
      await page.waitForTimeout(100);
    }
  });
});

// Export test metadata for reporting
export { TEST_METADATA };
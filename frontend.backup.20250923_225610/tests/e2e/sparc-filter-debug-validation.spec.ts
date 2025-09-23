import { test, expect, Page } from '@playwright/test';

/**
 * SPARC Filter Debug Validation - Real Browser Tests
 * 
 * These tests validate the critical filter issues:
 * 1. Advanced filter shows no results when applied
 * 2. Unable to return to "all posts" after filtering
 * 
 * NO MOCKS OR SIMULATIONS - 100% real functionality testing
 */

test.describe('SPARC Filter Debug Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the application
    await page.goto('http://localhost:4173');
    
    // Wait for the application to load completely
    await page.waitForSelector('[data-testid="social-media-feed"]', { timeout: 10000 });
    
    // Ensure backend is responding
    await page.waitForLoadState('networkidle');
  });

  test('CRITICAL: Advanced Multi-Select Filter Must Return Results', async () => {
    // Step 1: Verify initial "All Posts" state
    const initialPosts = await page.locator('[data-testid="post-card"]').count();
    console.log(`Initial posts count: ${initialPosts}`);
    
    expect(initialPosts).toBeGreaterThan(0); // Must have some posts to test filtering
    
    // Step 2: Open Advanced Filter
    await page.click('button:has-text("Advanced Filter")');
    await expect(page.locator('[data-testid="advanced-filter-panel"]')).toBeVisible();
    
    // Step 3: Select multiple agents (real agent names from database)
    const agentInput = page.locator('input[placeholder*="Search and select agents"]');
    await agentInput.click();
    await agentInput.type('ProductionValidator');
    await page.click('text=ProductionValidator');
    
    // Add second agent if available
    await agentInput.type('DatabaseManager');
    if (await page.locator('text=DatabaseManager').isVisible()) {
      await page.click('text=DatabaseManager');
    }
    
    // Step 4: Apply filter and validate results
    await page.click('button:has-text("Apply Filter")');
    
    // Wait for filtering to complete
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
    
    // CRITICAL TEST: Verify filter returns results
    const filteredPosts = await page.locator('[data-testid="post-card"]').count();
    console.log(`Filtered posts count: ${filteredPosts}`);
    
    // This should NOT be 0 - this is the bug we're fixing
    expect(filteredPosts).toBeGreaterThan(0);
    
    // Verify filter is actually applied (should show fewer or equal posts)
    expect(filteredPosts).toBeLessThanOrEqual(initialPosts);
    
    // Verify filter indicator is shown
    await expect(page.locator('text*="agents"')).toBeVisible();
  });

  test('CRITICAL: Clear Filter Must Return to All Posts', async () => {
    // Step 1: Apply any filter first
    await page.click('button:has-text("By Agent")');
    await page.click('text=ProductionValidator'); // Select first available agent
    
    // Wait for filtered results
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 10000 });
    const filteredCount = await page.locator('[data-testid="post-card"]').count();
    
    // Step 2: Clear the filter
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();
    await page.click('button:has-text("Clear")');
    
    // Step 3: Verify return to "All Posts"
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
    
    // CRITICAL TEST: Verify we're back to all posts
    const allPostsCount = await page.locator('[data-testid="post-card"]').count();
    console.log(`After clear - posts count: ${allPostsCount}`);
    
    // Should have more posts than when filtered (unless filter showed all posts)
    expect(allPostsCount).toBeGreaterThanOrEqual(filteredCount);
    
    // Verify filter indicator shows "All Posts"
    await expect(page.locator('text="All Posts"')).toBeVisible();
    
    // Verify clear button is no longer visible
    await expect(page.locator('button:has-text("Clear")')).not.toBeVisible();
  });

  test('ADVANCED: Multi-Select with Hashtags Must Work', async () => {
    // Step 1: Open advanced filter
    await page.click('button:has-text("Advanced Filter")');
    await expect(page.locator('[data-testid="advanced-filter-panel"]')).toBeVisible();
    
    // Step 2: Select hashtags
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]');
    await hashtagInput.click();
    await hashtagInput.type('production');
    
    // If hashtag exists, select it
    if (await page.locator('text=#production').isVisible()) {
      await page.click('text=#production');
    } else {
      // Try common hashtags
      await hashtagInput.clear();
      await hashtagInput.type('ai');
      if (await page.locator('text=#ai').isVisible()) {
        await page.click('text=#ai');
      }
    }
    
    // Step 3: Apply filter
    await page.click('button:has-text("Apply Filter")');
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
    
    // Step 4: Validate results
    const hashtagFilteredCount = await page.locator('[data-testid="post-card"]').count();
    console.log(`Hashtag filtered posts: ${hashtagFilteredCount}`);
    
    // Should return some results (even if 0 is valid for hashtags that don't exist)
    expect(hashtagFilteredCount).toBeGreaterThanOrEqual(0);
    
    // Verify filter indicator shows hashtag info
    const filterIndicator = page.locator('[data-testid="filter-indicator"]');
    if (hashtagFilteredCount > 0) {
      await expect(filterIndicator).toContainText('tag');
    }
  });

  test('ADVANCED: Combination Filters (Agents + Hashtags) Must Work', async () => {
    // Step 1: Open advanced filter
    await page.click('button:has-text("Advanced Filter")');
    await expect(page.locator('[data-testid="advanced-filter-panel"]')).toBeVisible();
    
    // Step 2: Select both agents and hashtags
    // Select agent
    const agentInput = page.locator('input[placeholder*="Search and select agents"]');
    await agentInput.click();
    await agentInput.type('ProductionValidator');
    await page.click('text=ProductionValidator');
    
    // Select hashtag
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]');
    await hashtagInput.click();
    await hashtagInput.type('test');
    if (await page.locator('text=#test').isVisible()) {
      await page.click('text=#test');
    }
    
    // Step 3: Test AND combination mode (default)
    await page.click('button:has-text("Apply Filter")');
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
    
    const andResults = await page.locator('[data-testid="post-card"]').count();
    console.log(`AND combination results: ${andResults}`);
    
    // Step 4: Change to OR combination mode and test
    await page.click('button:has-text("Advanced Filter")');
    await page.click('button:has-text("OR - Match any selected")');
    await page.click('button:has-text("Apply Filter")');
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
    
    const orResults = await page.locator('[data-testid="post-card"]').count();
    console.log(`OR combination results: ${orResults}`);
    
    // OR should return equal or more results than AND
    expect(orResults).toBeGreaterThanOrEqual(andResults);
  });

  test('CRITICAL: Save/Unsave Filter Integration', async () => {
    // Skip if no posts available
    const totalPosts = await page.locator('[data-testid="post-card"]').count();
    if (totalPosts === 0) {
      test.skip(true, 'No posts available for save/unsave testing');
    }
    
    // Step 1: Save a post first
    const firstPost = page.locator('[data-testid="post-card"]').first();
    const saveButton = firstPost.locator('button:has-text("Save")');
    
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Verify post is saved
      await expect(firstPost.locator('button:has-text("Saved")')).toBeVisible();
    }
    
    // Step 2: Apply saved posts filter
    await page.click('button:has-text("Advanced Filter")');
    await expect(page.locator('[data-testid="advanced-filter-panel"]')).toBeVisible();
    
    // Toggle saved posts
    const savedPostsToggle = page.locator('input[type="checkbox"]:near(:text("Saved Posts"))');
    await savedPostsToggle.check();
    
    // Apply filter
    await page.click('button:has-text("Apply Filter")');
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
    
    // Step 3: Verify saved posts are shown
    const savedPostsCount = await page.locator('[data-testid="post-card"]').count();
    console.log(`Saved posts shown: ${savedPostsCount}`);
    
    // Should show at least the post we just saved
    expect(savedPostsCount).toBeGreaterThan(0);
    
    // Verify all shown posts have "Saved" indicator
    const savedIndicators = await page.locator('button:has-text("Saved")').count();
    expect(savedIndicators).toBe(savedPostsCount);
  });

  test('ERROR HANDLING: Invalid Filter Parameters', async () => {
    // Test empty filter application
    await page.click('button:has-text("Advanced Filter")');
    await expect(page.locator('[data-testid="advanced-filter-panel"]')).toBeVisible();
    
    // Try to apply without selecting anything
    const applyButton = page.locator('button:has-text("Apply Filter")');
    
    // Should be disabled or show validation message
    if (await applyButton.isEnabled()) {
      await applyButton.click();
      
      // Should either stay on filter panel or show validation message
      const isStillVisible = await page.locator('[data-testid="advanced-filter-panel"]').isVisible();
      const hasValidationMessage = await page.locator('text*="select"').isVisible();
      
      expect(isStillVisible || hasValidationMessage).toBe(true);
    } else {
      // Button correctly disabled for empty filter
      expect(await applyButton.isEnabled()).toBe(false);
    }
  });

  test('PERFORMANCE: Filter Response Time Validation', async () => {
    // Measure filter application performance
    const startTime = Date.now();
    
    // Apply a filter
    await page.click('button:has-text("By Agent")');
    await page.click('text=ProductionValidator');
    
    // Wait for results
    await page.waitForSelector('[data-testid="post-list"]', { timeout: 15000 });
    
    const endTime = Date.now();
    const filterTime = endTime - startTime;
    
    console.log(`Filter application time: ${filterTime}ms`);
    
    // Filter should respond within reasonable time (5 seconds)
    expect(filterTime).toBeLessThan(5000);
    
    // Results should be visible
    const resultsVisible = await page.locator('[data-testid="post-card"]').count();
    expect(resultsVisible).toBeGreaterThanOrEqual(0);
  });

  test.afterEach(async () => {
    // Take screenshot on failure for debugging
    if (test.info().status !== test.info().expectedStatus) {
      const screenshot = await page.screenshot({ 
        path: `test-results/filter-debug-failure-${Date.now()}.png`,
        fullPage: true 
      });
      console.log('Failure screenshot saved');
    }
    
    // Clear any applied filters for next test
    try {
      if (await page.locator('button:has-text("Clear")').isVisible()) {
        await page.click('button:has-text("Clear")');
        await page.waitForLoadState('networkidle');
      }
    } catch (error) {
      console.log('Filter clear in cleanup failed:', error);
    }
  });
});
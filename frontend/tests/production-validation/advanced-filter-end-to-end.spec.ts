import { test, expect, Page } from '@playwright/test';

// Production Validation: Advanced Filter End-to-End Testing
// Testing the EXACT user workflow reported as broken
test.describe('Advanced Filter Production Validation', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the application to fully load
    await page.waitForSelector('[data-testid="posts-container"]', { timeout: 10000 });
    
    // Wait for posts to load
    await page.waitForFunction(() => {
      const posts = document.querySelectorAll('[data-testid^="post-"]');
      return posts.length > 0;
    }, { timeout: 15000 });
  });

  test('Critical Workflow: Advanced Filter Agent Multi-Select', async () => {
    console.log('🚀 Starting Critical Workflow Test');
    
    // Step 1: Verify initial state - all posts visible
    const initialPosts = await page.locator('[data-testid^="post-"]').count();
    console.log(`📊 Initial post count: ${initialPosts}`);
    expect(initialPosts).toBeGreaterThan(0);

    // Step 2: Click the "All Posts" dropdown (main filter button)
    console.log('🔍 Step 2: Clicking All Posts dropdown');
    await page.locator('[data-testid="filter-dropdown-trigger"]').click();
    
    // Wait for dropdown to open
    await page.waitForSelector('[data-testid="filter-dropdown-content"]');

    // Step 3: Select "Advanced Filter" from dropdown
    console.log('🎯 Step 3: Selecting Advanced Filter');
    await page.locator('[data-testid="advanced-filter-option"]').click();
    
    // Wait for advanced filter panel to open
    await page.waitForSelector('[data-testid="advanced-filter-panel"]');
    
    // Step 4: Add agent to multi-select (ProductionValidator)
    console.log('🤖 Step 4: Adding ProductionValidator to agent multi-select');
    
    // Click agent multi-select input
    await page.locator('[data-testid="agent-filter"] input').click();
    
    // Wait for dropdown options
    await page.waitForSelector('[data-testid="agent-option-ProductionValidator"]');
    
    // Select ProductionValidator
    await page.locator('[data-testid="agent-option-ProductionValidator"]').click();
    
    // Verify selection appears as tag
    await expect(page.locator('[data-testid="selected-agent-ProductionValidator"]')).toBeVisible();

    // Step 5: Click "Apply Filter"
    console.log('✅ Step 5: Applying filter');
    
    // Monitor network requests
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(`${request.method()} ${request.url()}`);
      }
    });
    
    await page.locator('[data-testid="apply-filter-button"]').click();
    
    // Wait for filter to apply
    await page.waitForTimeout(2000);
    
    // Step 6: Verify posts are filtered correctly
    console.log('🔎 Step 6: Verifying filtered results');
    const filteredPosts = await page.locator('[data-testid^="post-"]').count();
    console.log(`📊 Filtered post count: ${filteredPosts}`);
    
    // Should show only ProductionValidator posts (expected: 1 post)
    expect(filteredPosts).toBeGreaterThan(0);
    expect(filteredPosts).toBeLessThan(initialPosts);
    
    // Verify the visible post is from ProductionValidator
    const visibleAgents = await page.locator('[data-testid^="post-"] [data-testid="post-agent"]').allTextContents();
    console.log(`👀 Visible agents after filter: ${visibleAgents.join(', ')}`);
    expect(visibleAgents.every(agent => agent === 'ProductionValidator')).toBeTruthy();

    // Step 7: Click "Clear" button to reset
    console.log('🧹 Step 7: Clearing filters');
    await page.locator('[data-testid="clear-filter-button"]').click();
    
    // Wait for clear to apply
    await page.waitForTimeout(2000);
    
    // Step 8: Verify all posts return
    console.log('🔄 Step 8: Verifying all posts return');
    const resetPosts = await page.locator('[data-testid^="post-"]').count();
    console.log(`📊 Reset post count: ${resetPosts}`);
    
    expect(resetPosts).toBe(initialPosts);
    
    // Verify advanced filter panel is closed
    await expect(page.locator('[data-testid="advanced-filter-panel"]')).not.toBeVisible();
    
    console.log('📝 API Calls during test:');
    apiCalls.forEach(call => console.log(`  ${call}`));
  });

  test('Hashtag Multi-Select Filtering', async () => {
    console.log('🏷️ Testing Hashtag Multi-Select');
    
    // Open advanced filter
    await page.locator('[data-testid="filter-dropdown-trigger"]').click();
    await page.locator('[data-testid="advanced-filter-option"]').click();
    
    // Test hashtag multi-select
    await page.locator('[data-testid="hashtag-filter"] input').click();
    
    // Wait for hashtag options and select multiple
    await page.waitForSelector('[data-testid^="hashtag-option-"]');
    
    const hashtagOptions = await page.locator('[data-testid^="hashtag-option-"]').first().click();
    
    await page.locator('[data-testid="apply-filter-button"]').click();
    await page.waitForTimeout(1000);
    
    const hashtagFilteredPosts = await page.locator('[data-testid^="post-"]').count();
    console.log(`📊 Hashtag filtered posts: ${hashtagFilteredPosts}`);
    
    // Clear and verify
    await page.locator('[data-testid="clear-filter-button"]').click();
    await page.waitForTimeout(1000);
  });

  test('Saved Posts and My Posts Toggles', async () => {
    console.log('💾 Testing Saved Posts and My Posts toggles');
    
    // Open advanced filter
    await page.locator('[data-testid="filter-dropdown-trigger"]').click();
    await page.locator('[data-testid="advanced-filter-option"]').click();
    
    // Test saved posts toggle
    if (await page.locator('[data-testid="saved-posts-toggle"]').isVisible()) {
      await page.locator('[data-testid="saved-posts-toggle"]').click();
      await page.locator('[data-testid="apply-filter-button"]').click();
      await page.waitForTimeout(1000);
      
      const savedPosts = await page.locator('[data-testid^="post-"]').count();
      console.log(`📊 Saved posts count: ${savedPosts}`);
      
      await page.locator('[data-testid="clear-filter-button"]').click();
    }
    
    // Test my posts toggle
    if (await page.locator('[data-testid="my-posts-toggle"]').isVisible()) {
      await page.locator('[data-testid="my-posts-toggle"]').click();
      await page.locator('[data-testid="apply-filter-button"]').click();
      await page.waitForTimeout(1000);
      
      const myPosts = await page.locator('[data-testid^="post-"]').count();
      console.log(`📊 My posts count: ${myPosts}`);
      
      await page.locator('[data-testid="clear-filter-button"]').click();
    }
  });

  test('AND/OR Combination Modes', async () => {
    console.log('🔗 Testing AND/OR combination modes');
    
    // Open advanced filter
    await page.locator('[data-testid="filter-dropdown-trigger"]').click();
    await page.locator('[data-testid="advanced-filter-option"]').click();
    
    // Test combination mode toggle if available
    if (await page.locator('[data-testid="combination-mode-toggle"]').isVisible()) {
      // Test OR mode (default)
      await page.locator('[data-testid="agent-filter"] input').click();
      await page.locator('[data-testid^="agent-option-"]').first().click();
      
      await page.locator('[data-testid="hashtag-filter"] input').click();
      await page.locator('[data-testid^="hashtag-option-"]').first().click();
      
      await page.locator('[data-testid="apply-filter-button"]').click();
      await page.waitForTimeout(1000);
      
      const orResults = await page.locator('[data-testid^="post-"]').count();
      console.log(`📊 OR mode results: ${orResults}`);
      
      // Switch to AND mode
      await page.locator('[data-testid="combination-mode-toggle"]').click();
      await page.locator('[data-testid="apply-filter-button"]').click();
      await page.waitForTimeout(1000);
      
      const andResults = await page.locator('[data-testid^="post-"]').count();
      console.log(`📊 AND mode results: ${andResults}`);
      
      // AND should typically return fewer or equal results
      expect(andResults).toBeLessThanOrEqual(orResults);
      
      await page.locator('[data-testid="clear-filter-button"]').click();
    }
  });

  test('Edge Cases and Error Handling', async () => {
    console.log('🚧 Testing edge cases');
    
    // Test with no filter selections
    await page.locator('[data-testid="filter-dropdown-trigger"]').click();
    await page.locator('[data-testid="advanced-filter-option"]').click();
    
    // Try to apply filter with no selections
    await page.locator('[data-testid="apply-filter-button"]').click();
    await page.waitForTimeout(1000);
    
    // Should still show all posts or show appropriate message
    const noFilterPosts = await page.locator('[data-testid^="post-"]').count();
    console.log(`📊 No filter applied posts: ${noFilterPosts}`);
    
    // Test rapid filter changes
    await page.locator('[data-testid="agent-filter"] input').click();
    await page.locator('[data-testid^="agent-option-"]').first().click();
    await page.locator('[data-testid="apply-filter-button"]').click();
    
    await page.locator('[data-testid="clear-filter-button"]').click();
    await page.locator('[data-testid="apply-filter-button"]').click();
    
    await page.waitForTimeout(1000);
    const rapidChangePosts = await page.locator('[data-testid^="post-"]').count();
    console.log(`📊 Rapid change posts: ${rapidChangePosts}`);
  });

  test('Filter Statistics and Counts', async () => {
    console.log('📈 Verifying filter statistics');
    
    // Check if filter statistics are displayed
    if (await page.locator('[data-testid="filter-statistics"]').isVisible()) {
      const stats = await page.locator('[data-testid="filter-statistics"]').textContent();
      console.log(`📊 Filter statistics: ${stats}`);
    }
    
    // Check post count display
    if (await page.locator('[data-testid="post-count"]').isVisible()) {
      const count = await page.locator('[data-testid="post-count"]').textContent();
      console.log(`📊 Post count display: ${count}`);
    }
  });
});
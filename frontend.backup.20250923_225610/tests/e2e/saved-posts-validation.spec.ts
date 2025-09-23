import { test, expect } from '@playwright/test';

test.describe('Saved Posts Functionality - Real E2E Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('Complete save/unsave/filter workflow', async ({ page }) => {
    console.log('🎯 Starting comprehensive saved posts validation');

    // Step 1: Find a post to save
    const firstPost = page.locator('[data-testid="post-card"]').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });
    
    const postId = await firstPost.getAttribute('data-post-id');
    console.log(`📌 Testing with post ID: ${postId}`);

    // Step 2: Save the post
    const saveButton = firstPost.locator('button[title*="Save"], button:has(svg):has-text("Save"), button:has([data-lucide="bookmark"])');
    await expect(saveButton).toBeVisible({ timeout: 5000 });
    
    await saveButton.click();
    await page.waitForTimeout(1000); // Wait for API call
    console.log('💾 Clicked save button');

    // Step 3: Verify save button state changed
    await expect(saveButton).toHaveAttribute('title', /Unsave|Saved/);
    console.log('✅ Save button state updated');

    // Step 4: Open filter dropdown
    const filterDropdown = page.locator('select, [role="combobox"], .filter-select');
    await expect(filterDropdown).toBeVisible({ timeout: 5000 });
    
    // Step 5: Select saved posts filter
    if (await filterDropdown.getAttribute('role') === 'combobox') {
      await filterDropdown.click();
      await page.locator('text=Saved Posts, text=saved').click();
    } else {
      await filterDropdown.selectOption({ label: 'Saved Posts' });
    }
    
    await page.waitForLoadState('networkidle');
    console.log('🔍 Applied saved posts filter');

    // Step 6: Verify only saved posts are shown
    const visiblePosts = page.locator('[data-testid="post-card"]');
    const postCount = await visiblePosts.count();
    console.log(`📊 Found ${postCount} saved posts`);
    
    expect(postCount).toBeGreaterThan(0);

    // Step 7: Verify our saved post is in the filtered list
    const savedPost = visiblePosts.locator(`[data-post-id="${postId}"]`);
    await expect(savedPost).toBeVisible();
    console.log('✅ Saved post appears in filtered list');

    // Step 8: Unsave the post
    const unsaveButton = savedPost.locator('button[title*="Unsave"], button[title*="Saved"]');
    await unsaveButton.click();
    await page.waitForTimeout(1000);
    console.log('🗑️ Clicked unsave button');

    // Step 9: Verify post disappears from saved filter
    await page.waitForTimeout(2000); // Wait for filter refresh
    const remainingPosts = await visiblePosts.count();
    expect(remainingPosts).toBe(postCount - 1);
    console.log('✅ Post removed from saved posts list');

    // Step 10: Switch back to all posts
    await filterDropdown.selectOption({ label: 'All Posts' });
    await page.waitForLoadState('networkidle');
    
    // Step 11: Verify unsave button state
    const allPosts = page.locator('[data-testid="post-card"]');
    const originalPost = allPosts.locator(`[data-post-id="${postId}"]`);
    const saveButtonFinal = originalPost.locator('button[title*="Save"]');
    await expect(saveButtonFinal).toHaveAttribute('title', 'Save Post');
    console.log('✅ Save button reverted to original state');

    console.log('🎉 All tests passed - saved posts functionality is working correctly!');
  });

  test('API endpoints validation', async ({ page }) => {
    console.log('🌐 Testing API endpoints directly');

    // Test save endpoint
    const saveResponse = await page.request.post('http://localhost:3000/api/v1/agent-posts/prod-post-1/save', {
      data: { user_id: 'anonymous' },
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(saveResponse.ok()).toBeTruthy();
    const saveData = await saveResponse.json();
    expect(saveData.success).toBe(true);
    console.log('✅ Save API endpoint working');

    // Test saved posts filter endpoint
    const filterResponse = await page.request.get('http://localhost:3000/api/v1/agent-posts?filter=saved&user_id=anonymous');
    expect(filterResponse.ok()).toBeTruthy();
    const filterData = await filterResponse.json();
    expect(filterData.success).toBe(true);
    expect(filterData.data).toBeInstanceOf(Array);
    console.log(`✅ Filter API endpoint working - found ${filterData.total} saved posts`);

    // Test unsave endpoint
    const unsaveResponse = await page.request.delete('http://localhost:3000/api/v1/agent-posts/prod-post-1/save?user_id=anonymous');
    expect(unsaveResponse.ok()).toBeTruthy();
    const unsaveData = await unsaveResponse.json();
    expect(unsaveData.success).toBe(true);
    console.log('✅ Unsave API endpoint working');

    console.log('🎉 All API endpoints validated successfully!');
  });

  test('Engagement data validation', async ({ page }) => {
    console.log('📊 Testing engagement data inclusion');

    // Get posts with engagement data
    const response = await page.request.get('http://localhost:3000/api/v1/agent-posts?limit=1&filter=all&user_id=anonymous');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
    
    const post = data.data[0];
    expect(post).toHaveProperty('engagement');
    expect(post.engagement).toHaveProperty('isSaved');
    expect(typeof post.engagement.isSaved).toBe('boolean');
    
    console.log(`✅ Engagement data present - isSaved: ${post.engagement.isSaved}`);
    console.log('🎉 Engagement data validation successful!');
  });
});
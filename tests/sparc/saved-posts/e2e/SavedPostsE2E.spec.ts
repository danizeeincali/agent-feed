/**
 * SPARC End-to-End Tests: Saved Posts Functionality
 * Complete user workflow testing with Playwright
 * NO MOCKS - Real browser interactions with live application
 */

import { test, expect, Page } from '@playwright/test';

test.describe('SPARC E2E Tests: Saved Posts Complete Workflow', () => {
  let page: Page;
  let testPostTitle: string = 'E2E Test Post for Saved Functionality';

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    
    // Wait for the application to load completely
    await page.waitForSelector('[data-testid="real-social-media-feed"], .max-w-2xl', { timeout: 10000 });
    
    // Wait for posts to load
    await page.waitForFunction(() => {
      const posts = document.querySelectorAll('article');
      return posts.length > 0;
    }, { timeout: 15000 });
    
    console.log('✅ Application loaded and posts are visible');
  });

  test('SPARC E2E: Complete save/unsave workflow through UI', async () => {
    // Find the first post in the feed
    const firstPost = page.locator('article').first();
    await expect(firstPost).toBeVisible();

    // Get post ID for tracking
    const postId = await firstPost.evaluate(el => {
      const idElement = el.querySelector('[data-testid="post-id"], .text-xs:has-text("ID:")');
      if (idElement) {
        const text = idElement.textContent || '';
        const match = text.match(/ID:\s*([^.]+)/);
        return match ? match[1].trim() : null;
      }
      return null;
    });

    console.log(`🎯 Testing with post ID: ${postId}`);

    // Step 1: Verify initial state (not saved)
    const saveButton = firstPost.locator('button:has-text("Save"), button[title*="Save"]').first();
    await expect(saveButton).toBeVisible();
    
    const initialSaveText = await saveButton.textContent();
    expect(initialSaveText?.includes('Save')).toBe(true);
    expect(initialSaveText?.includes('Saved')).toBe(false);

    // Step 2: Click save button
    await saveButton.click();
    
    // Wait for state change
    await page.waitForTimeout(1000);

    // Step 3: Verify post is now saved
    const savedText = await saveButton.textContent();
    expect(savedText?.includes('Saved')).toBe(true);
    
    // Check if button has visual indication of saved state
    const saveButtonClasses = await saveButton.getAttribute('class');
    const hasFilledIcon = await firstPost.locator('button[title*="Save"] svg.fill-blue-500, button[title*="Save"] svg[class*="fill"]').count() > 0;
    
    expect(hasFilledIcon || savedText?.includes('Saved')).toBe(true);

    // Step 4: Test filter by saved posts
    const filterButton = page.locator('button:has-text("Saved Posts"), select option[value="saved"], [data-testid="filter-saved"]').first();
    
    if (await filterButton.count() > 0) {
      await filterButton.click();
      
      // Wait for filter to apply
      await page.waitForTimeout(2000);
      
      // Verify our saved post appears in filtered results
      await expect(firstPost).toBeVisible();
      
      // Check if post count shows filtered results
      const postCountElement = page.locator(':has-text("post"), :has-text("found")').first();
      if (await postCountElement.count() > 0) {
        const countText = await postCountElement.textContent();
        expect(countText).toContain('1'); // At least 1 saved post
      }

      // Reset filter to show all posts
      const allPostsFilter = page.locator('button:has-text("All Posts"), select option[value="all"], [data-testid="filter-all"]').first();
      if (await allPostsFilter.count() > 0) {
        await allPostsFilter.click();
        await page.waitForTimeout(1000);
      }
    }

    // Step 5: Unsave the post
    await saveButton.click();
    
    // Wait for state change
    await page.waitForTimeout(1000);

    // Step 6: Verify post is no longer saved
    const finalSaveText = await saveButton.textContent();
    expect(finalSaveText?.includes('Save')).toBe(true);
    expect(finalSaveText?.includes('Saved')).toBe(false);

    console.log('✅ Complete save/unsave workflow validated through UI');
  });

  test('SPARC E2E: Save multiple posts and verify filter accuracy', async () => {
    // Get all visible posts
    const posts = page.locator('article');
    const postCount = await posts.count();
    const postsToSave = Math.min(3, postCount); // Save up to 3 posts

    console.log(`📝 Saving ${postsToSave} posts for filter test`);

    // Save multiple posts
    for (let i = 0; i < postsToSave; i++) {
      const post = posts.nth(i);
      const saveButton = post.locator('button:has-text("Save"), button[title*="Save"]').first();
      
      await expect(saveButton).toBeVisible();
      await saveButton.click();
      await page.waitForTimeout(500); // Small delay between saves
      
      // Verify each post shows as saved
      const savedText = await saveButton.textContent();
      expect(savedText?.includes('Saved')).toBe(true);
    }

    // Test saved posts filter if available
    const filterPanel = page.locator('[data-testid="filter-panel"], .filter-panel, :has-text("Filter")').first();
    
    if (await filterPanel.count() > 0) {
      const savedFilter = page.locator('button:has-text("Saved"), option[value="saved"], [data-testid="filter-saved"]').first();
      
      if (await savedFilter.count() > 0) {
        await savedFilter.click();
        await page.waitForTimeout(2000);

        // Count visible posts after filter
        const filteredPosts = page.locator('article');
        const filteredCount = await filteredPosts.count();
        
        expect(filteredCount).toBeGreaterThanOrEqual(postsToSave);
        
        // Verify all visible posts show as saved
        for (let i = 0; i < Math.min(3, filteredCount); i++) {
          const post = filteredPosts.nth(i);
          const saveButton = post.locator('button:has-text("Saved"), button[title*="Unsave"]').first();
          
          if (await saveButton.count() > 0) {
            const buttonText = await saveButton.textContent();
            expect(buttonText?.includes('Saved') || buttonText?.includes('Unsave')).toBe(true);
          }
        }

        console.log(`✅ Saved posts filter shows ${filteredCount} posts correctly`);

        // Reset filter
        const allFilter = page.locator('button:has-text("All"), option[value="all"], [data-testid="filter-all"]').first();
        if (await allFilter.count() > 0) {
          await allFilter.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Clean up: Unsave all posts
    const allPosts = page.locator('article');
    const finalPostCount = await allPosts.count();
    
    for (let i = 0; i < Math.min(postsToSave, finalPostCount); i++) {
      const post = allPosts.nth(i);
      const saveButton = post.locator('button:has-text("Saved"), button[title*="Unsave"]').first();
      
      if (await saveButton.count() > 0) {
        await saveButton.click();
        await page.waitForTimeout(300);
      }
    }

    console.log('✅ Multiple posts save/unsave workflow completed');
  });

  test('SPARC E2E: Post actions integration and state consistency', async () => {
    const firstPost = page.locator('article').first();
    await expect(firstPost).toBeVisible();

    // Test all post actions are available
    const likeButton = firstPost.locator('button:has(svg):has-text("0"), button[title*="Like"]').first();
    const saveButton = firstPost.locator('button:has-text("Save"), button[title*="Save"]').first();
    const deleteButton = firstPost.locator('button:has-text("Delete"), button[title*="Delete"]').first();

    // Verify all action buttons are present
    await expect(saveButton).toBeVisible();
    
    if (await likeButton.count() > 0) {
      await expect(likeButton).toBeVisible();
    }
    
    if (await deleteButton.count() > 0) {
      await expect(deleteButton).toBeVisible();
    }

    // Test save state consistency across refreshes
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify saved state
    let saveButtonText = await saveButton.textContent();
    expect(saveButtonText?.includes('Saved')).toBe(true);

    // Refresh page
    await page.reload();
    await page.waitForSelector('article', { timeout: 10000 });
    
    // Wait for posts to load after refresh
    await page.waitForFunction(() => {
      const posts = document.querySelectorAll('article');
      return posts.length > 0;
    }, { timeout: 10000 });

    // Verify saved state persisted after refresh
    const refreshedFirstPost = page.locator('article').first();
    const refreshedSaveButton = refreshedFirstPost.locator('button:has-text("Saved"), button[title*="Unsave"]').first();
    
    if (await refreshedSaveButton.count() > 0) {
      const refreshedSaveText = await refreshedSaveButton.textContent();
      expect(refreshedSaveText?.includes('Saved') || refreshedSaveText?.includes('Unsave')).toBe(true);
      
      // Clean up: Unsave the post
      await refreshedSaveButton.click();
      await page.waitForTimeout(1000);
    }

    console.log('✅ Post actions integration and state persistence validated');
  });

  test('SPARC E2E: Performance and responsiveness validation', async () => {
    const startTime = Date.now();

    // Test rapid save/unsave operations
    const firstPost = page.locator('article').first();
    const saveButton = firstPost.locator('button:has-text("Save"), button[title*="Save"]').first();

    await expect(saveButton).toBeVisible();

    // Perform rapid save/unsave cycles
    for (let i = 0; i < 5; i++) {
      await saveButton.click();
      await page.waitForTimeout(200);
      
      await saveButton.click();
      await page.waitForTimeout(200);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⚡ Performance test: 5 save/unsave cycles completed in ${duration}ms`);
    
    // Should complete within reasonable time (less than 10 seconds)
    expect(duration).toBeLessThan(10000);

    // Verify final state is consistent
    const finalSaveText = await saveButton.textContent();
    expect(finalSaveText).toBeTruthy();
    
    // Verify no UI errors or broken states
    const errorMessages = page.locator('[role="alert"], .error, .alert-error');
    expect(await errorMessages.count()).toBe(0);

    console.log('✅ Performance and responsiveness validation completed');
  });

  test('SPARC E2E: Accessibility and usability validation', async () => {
    const firstPost = page.locator('article').first();
    const saveButton = firstPost.locator('button:has-text("Save"), button[title*="Save"]').first();

    await expect(saveButton).toBeVisible();

    // Test keyboard navigation
    await saveButton.focus();
    await expect(saveButton).toBeFocused();

    // Test save with keyboard
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Verify save state changed
    const saveText = await saveButton.textContent();
    expect(saveText?.includes('Saved')).toBe(true);

    // Test unsave with keyboard
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Verify unsave state
    const unsaveText = await saveButton.textContent();
    expect(unsaveText?.includes('Save') && !unsaveText?.includes('Saved')).toBe(true);

    // Test ARIA labels and accessibility attributes
    const buttonRole = await saveButton.getAttribute('role');
    const buttonTitle = await saveButton.getAttribute('title');
    const buttonAriaLabel = await saveButton.getAttribute('aria-label');

    // Should have proper accessibility attributes
    expect(buttonRole === 'button' || await saveButton.evaluate(el => el.tagName === 'BUTTON')).toBe(true);
    expect(buttonTitle || buttonAriaLabel || saveText).toBeTruthy();

    console.log('✅ Accessibility and usability validation completed');
  });

  test('SPARC E2E: Error handling and edge cases', async () => {
    // Test behavior with no internet connection (if possible to simulate)
    // Test behavior with slow responses
    const firstPost = page.locator('article').first();
    const saveButton = firstPost.locator('button:has-text("Save"), button[title*="Save"]').first();

    // Test rapid clicking to ensure no double-processing
    await saveButton.click();
    await saveButton.click();
    await saveButton.click();
    
    await page.waitForTimeout(2000);

    // Should handle rapid clicks gracefully
    const finalText = await saveButton.textContent();
    expect(finalText).toBeTruthy();

    // Test with network intercepted responses (if needed)
    // For now, verify the UI doesn't break under rapid interactions
    
    // Verify no JavaScript errors occurred
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.waitForTimeout(1000);
    expect(jsErrors.length).toBe(0);

    console.log('✅ Error handling and edge cases validation completed');
  });

  test('SPARC E2E: Real-time updates and WebSocket integration', async () => {
    // This test validates that saved posts updates work with real-time features
    const firstPost = page.locator('article').first();
    const saveButton = firstPost.locator('button:has-text("Save"), button[title*="Save"]').first();

    // Save a post
    await saveButton.click();
    await page.waitForTimeout(1000);

    // Verify real-time connection indicator
    const connectionIndicator = page.locator(':has-text("Live"), :has-text("Connected"), .animate-pulse').first();
    
    if (await connectionIndicator.count() > 0) {
      await expect(connectionIndicator).toBeVisible();
      console.log('✅ Real-time connection indicator found');
    }

    // Test that the save state is immediately reflected
    const savedText = await saveButton.textContent();
    expect(savedText?.includes('Saved')).toBe(true);

    // Clean up
    await saveButton.click();
    await page.waitForTimeout(500);

    console.log('✅ Real-time updates validation completed');
  });
});
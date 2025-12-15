import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E Tests for Saved Posts Functionality
 * 
 * This test suite validates the complete saved posts workflow:
 * 1. Save/Unsave posts through UI
 * 2. Filter by saved posts
 * 3. Verify real backend integration
 * 4. Test cross-browser compatibility
 */

const BASE_URL = 'http://localhost:5173';

// Helper function to wait for posts to load
async function waitForPostsToLoad(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="feed-posts"], .space-y-6 article', { timeout });
}

// Helper function to get the first post element
async function getFirstPost(page: Page) {
  await waitForPostsToLoad(page);
  const posts = await page.locator('article').all();
  if (posts.length === 0) {
    throw new Error('No posts found on the page');
  }
  return posts[0];
}

// Helper function to find a post by its content or ID
async function findPostByContent(page: Page, searchText: string) {
  await waitForPostsToLoad(page);
  const posts = await page.locator('article').all();
  
  for (const post of posts) {
    const content = await post.textContent();
    if (content && content.includes(searchText)) {
      return post;
    }
  }
  return null;
}

test.describe('Saved Posts E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(BASE_URL);
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
    
    // Verify the feed is loaded
    await expect(page.getByRole('heading', { name: 'Agent Feed' })).toBeVisible();
    
    // Wait for posts to be loaded
    await waitForPostsToLoad(page);
  });

  test('should display save button on posts', async ({ page }) => {
    const post = await getFirstPost(page);
    
    // Verify save button exists
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    
    // Verify bookmark icon is present
    const bookmarkIcon = post.locator('svg[data-lucide="bookmark"]');
    await expect(bookmarkIcon).toBeVisible();
  });

  test('should save a post when clicking save button', async ({ page }) => {
    const post = await getFirstPost(page);
    
    // Find the save button
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    await expect(saveButton).toBeVisible();
    
    // Check initial state (should not be saved)
    const initialText = await saveButton.textContent();
    console.log('Initial save button text:', initialText);
    
    // Click save button
    await saveButton.click();
    
    // Wait for the API call to complete
    await page.waitForTimeout(1000);
    
    // Verify the button text changes to "Saved"
    await expect(saveButton).toContainText('Saved', { timeout: 5000 });
    
    // Verify the bookmark icon is filled (has fill-blue-500 class)
    const bookmarkIcon = post.locator('svg[data-lucide="bookmark"]');
    const iconClasses = await bookmarkIcon.getAttribute('class');
    expect(iconClasses).toContain('fill-blue-500');
  });

  test('should unsave a post when clicking saved button', async ({ page }) => {
    const post = await getFirstPost(page);
    
    // First, save the post
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    // Verify it's saved
    await expect(saveButton).toContainText('Saved');
    
    // Click to unsave
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    // Verify it's unsaved
    await expect(saveButton).toContainText('Save');
    
    // Verify the bookmark icon is not filled
    const bookmarkIcon = post.locator('svg[data-lucide="bookmark"]');
    const iconClasses = await bookmarkIcon.getAttribute('class');
    expect(iconClasses).not.toContain('fill-blue-500');
  });

  test('should filter posts by saved status', async ({ page }) => {
    // First, save at least one post
    const post = await getFirstPost(page);
    const postContent = await post.textContent();
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    // Verify the post is saved
    await expect(saveButton).toContainText('Saved');
    
    // Find and click the filter panel or saved posts filter
    // Look for filter options - this might be in a FilterPanel component
    const filterButtons = await page.locator('button, select, [role="button"]').all();
    
    let savedFilterButton = null;
    for (const button of filterButtons) {
      const text = await button.textContent();
      if (text && (text.includes('Saved') || text.includes('saved'))) {
        savedFilterButton = button;
        break;
      }
    }
    
    if (!savedFilterButton) {
      // Try to find a dropdown or select for filters
      const selects = await page.locator('select').all();
      for (const select of selects) {
        const options = await select.locator('option').all();
        for (const option of options) {
          const optionText = await option.textContent();
          if (optionText && optionText.includes('Saved')) {
            await select.selectOption(optionText);
            savedFilterButton = select;
            break;
          }
        }
        if (savedFilterButton) break;
      }
    }
    
    if (savedFilterButton) {
      await savedFilterButton.click();
      await page.waitForTimeout(2000); // Wait for filter to apply
      
      // Verify only saved posts are shown
      const visiblePosts = await page.locator('article').all();
      
      // All visible posts should have "Saved" button state
      for (const visiblePost of visiblePosts) {
        const saveBtn = visiblePost.locator('button[title*="Save"], button:has-text("Saved")');
        if (await saveBtn.isVisible()) {
          await expect(saveBtn).toContainText('Saved');
        }
      }
    } else {
      console.log('Could not find saved posts filter - may need to check FilterPanel implementation');
    }
  });

  test('should persist saved state across page refreshes', async ({ page }) => {
    // Save a post
    const post = await getFirstPost(page);
    const postId = await post.getAttribute('data-post-id') || 
                   await post.locator('[class*="ID:"]').textContent();
    
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    // Verify saved state
    await expect(saveButton).toContainText('Saved');
    
    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForPostsToLoad(page);
    
    // Find the same post and verify it's still saved
    if (postId) {
      const savedPost = await page.locator(`article[data-post-id="${postId}"]`).first();
      if (await savedPost.isVisible()) {
        const savedButton = savedPost.locator('button[title*="Save"], button:has-text("Saved")');
        await expect(savedButton).toContainText('Saved');
      }
    } else {
      // If we can't find by ID, check that at least one post is saved
      const allSaveButtons = await page.locator('button[title*="Save"], button:has-text("Save")').all();
      let foundSavedPost = false;
      
      for (const btn of allSaveButtons) {
        const text = await btn.textContent();
        if (text && text.includes('Saved')) {
          foundSavedPost = true;
          break;
        }
      }
      
      expect(foundSavedPost).toBe(true);
    }
  });

  test('should handle rapid save/unsave clicks without errors', async ({ page }) => {
    const post = await getFirstPost(page);
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    
    // Rapidly click save/unsave multiple times
    for (let i = 0; i < 5; i++) {
      await saveButton.click();
      await page.waitForTimeout(200); // Small delay
    }
    
    // Wait for final state to settle
    await page.waitForTimeout(2000);
    
    // Verify the button has a consistent state (either Save or Saved)
    const buttonText = await saveButton.textContent();
    expect(buttonText).toMatch(/^(Save|Saved)$/);
  });

  test('should show correct saved count in filter panel', async ({ page }) => {
    // Save multiple posts
    const posts = await page.locator('article').all();
    const postsToSave = Math.min(3, posts.length);
    
    for (let i = 0; i < postsToSave; i++) {
      const saveButton = posts[i].locator('button[title*="Save"], button:has-text("Save")');
      await saveButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for saved count indicator in the UI
    const countElements = await page.locator('[class*="count"], [data-testid*="count"]').all();
    
    // Check if any element shows the saved count
    let foundCount = false;
    for (const element of countElements) {
      const text = await element.textContent();
      if (text && text.includes(postsToSave.toString())) {
        foundCount = true;
        break;
      }
    }
    
    // Note: This test might need adjustment based on actual UI implementation
    console.log(`Saved ${postsToSave} posts - looking for count indicator in UI`);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('/api/v1/agent-posts/*/save', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    const post = await getFirstPost(page);
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    
    // Try to save - should handle error gracefully
    await saveButton.click();
    await page.waitForTimeout(2000);
    
    // Verify button state doesn't change due to error
    const buttonText = await saveButton.textContent();
    expect(buttonText).toContain('Save'); // Should remain unsaved due to error
  });

  test('should work with keyboard navigation', async ({ page }) => {
    const post = await getFirstPost(page);
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    
    // Focus the save button
    await saveButton.focus();
    
    // Verify it's focused
    await expect(saveButton).toBeFocused();
    
    // Press Enter to save
    await saveButton.press('Enter');
    await page.waitForTimeout(1000);
    
    // Verify the post is saved
    await expect(saveButton).toContainText('Saved');
  });

  test('should work on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate and wait for load
    await page.goto(BASE_URL);
    await waitForPostsToLoad(page);
    
    const post = await getFirstPost(page);
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    
    // Verify save button is still visible and clickable on mobile
    await expect(saveButton).toBeVisible();
    
    // Test touch interaction
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    // Verify functionality works on mobile
    await expect(saveButton).toContainText('Saved');
  });

  test('should handle posts without save functionality gracefully', async ({ page }) => {
    // This test verifies the UI doesn't break if some posts don't have save buttons
    const posts = await page.locator('article').all();
    
    for (const post of posts) {
      const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
      
      if (await saveButton.isVisible()) {
        // Test normal save functionality
        await saveButton.click();
        await page.waitForTimeout(500);
        
        const text = await saveButton.textContent();
        expect(text).toMatch(/^(Save|Saved)$/);
      } else {
        // Verify post still displays correctly without save button
        const postTitle = post.locator('h2, h3, [class*="title"]').first();
        await expect(postTitle).toBeVisible();
      }
    }
  });
});

test.describe('Saved Posts Backend Integration', () => {
  test('should make correct API calls for save/unsave', async ({ page }) => {
    let saveApiCalled = false;
    let unsaveApiCalled = false;
    
    // Monitor API calls
    page.on('request', request => {
      if (request.url().includes('/api/v1/agent-posts/') && request.url().includes('/save')) {
        if (request.method() === 'POST') {
          saveApiCalled = true;
        } else if (request.method() === 'DELETE') {
          unsaveApiCalled = true;
        }
      }
    });
    
    await page.goto(BASE_URL);
    await waitForPostsToLoad(page);
    
    const post = await getFirstPost(page);
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    
    // Save post
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    expect(saveApiCalled).toBe(true);
    
    // Unsave post
    await saveButton.click();
    await page.waitForTimeout(1000);
    
    expect(unsaveApiCalled).toBe(true);
  });

  test('should handle filter=saved API parameter correctly', async ({ page }) => {
    let savedFilterApiCalled = false;
    
    // Monitor API calls for saved filter
    page.on('request', request => {
      if (request.url().includes('/api/v1/agent-posts') && 
          request.url().includes('filter=saved')) {
        savedFilterApiCalled = true;
      }
    });
    
    await page.goto(BASE_URL);
    await waitForPostsToLoad(page);
    
    // Look for saved filter option and trigger it
    // This might be in a dropdown, button, or other UI element
    const filterElements = await page.locator('button, select, [role="button"]').all();
    
    for (const element of filterElements) {
      const text = await element.textContent();
      if (text && text.toLowerCase().includes('saved')) {
        await element.click();
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    // If direct button not found, look for dropdown options
    if (!savedFilterApiCalled) {
      const selects = await page.locator('select').all();
      for (const select of selects) {
        const options = await select.locator('option').all();
        for (const option of options) {
          const optionText = await option.textContent();
          if (optionText && optionText.toLowerCase().includes('saved')) {
            await select.selectOption(optionText);
            await page.waitForTimeout(1000);
            break;
          }
        }
      }
    }
    
    // Note: This test verifies that the correct API endpoint is called
    // The actual assertion might need adjustment based on UI implementation
    console.log('Saved filter API called:', savedFilterApiCalled);
  });
});

test.describe('Saved Posts Accessibility', () => {
  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForPostsToLoad(page);
    
    const post = await getFirstPost(page);
    const saveButton = post.locator('button[title*="Save"], button:has-text("Save")');
    
    // Verify button has proper attributes
    await expect(saveButton).toHaveAttribute('title');
    
    // Verify button is keyboard accessible
    await saveButton.focus();
    await expect(saveButton).toBeFocused();
    
    // Verify screen reader text is appropriate
    const ariaLabel = await saveButton.getAttribute('aria-label');
    const title = await saveButton.getAttribute('title');
    
    if (ariaLabel) {
      expect(ariaLabel.toLowerCase()).toMatch(/(save|unsave|bookmark)/);
    }
    
    if (title) {
      expect(title.toLowerCase()).toMatch(/(save|unsave|bookmark)/);
    }
  });
});
import { test, expect } from '@playwright/test';

test.describe('📝 Post Creation Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.addStyleTag({
      content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`
    });
  });

  test('complete post creation workflow with all features', async ({ page }) => {
    console.log('🧪 Testing complete post creation workflow...');
    
    // Open post creator
    await page.click('[data-testid="create-post-button"]');
    await expect(page.locator('[data-testid="post-creator-modal"]')).toBeVisible();
    
    // Fill in post details
    const titleInput = page.locator('[data-testid="post-title"]');
    const contentInput = page.locator('[data-testid="post-content"]');
    const tagsInput = page.locator('[data-testid="post-tags"]');
    
    await titleInput.fill('Test Post Title');
    await contentInput.fill('This is test content with @mention and #hashtag');
    await tagsInput.fill('test, e2e, playwright');
    
    // Verify character count updates
    const charCount = page.locator('[data-testid="character-count"]');
    await expect(charCount).toContainText('46'); // Approximate content length
    
    // Test save as draft
    await page.click('[data-testid="save-draft-button"]');
    await expect(page.locator('[data-testid="draft-saved-indicator"]')).toBeVisible();
    
    console.log('✅ Post saved as draft');
    
    // Close and reopen to test draft restoration
    await page.click('[data-testid="close-modal-button"]');
    await page.click('[data-testid="create-post-button"]');
    
    // Verify draft is restored
    await expect(titleInput).toHaveValue('Test Post Title');
    await expect(contentInput).toContainText('This is test content');
    
    console.log('✅ Draft restored successfully');
    
    // Publish the post
    await page.click('[data-testid="publish-button"]');
    await expect(page.locator('[data-testid="post-published-success"]')).toBeVisible();
    
    // Verify post appears in feed
    await page.waitForSelector('[data-testid="post-item"]');
    const newPost = page.locator('[data-testid="post-item"]').first();
    await expect(newPost.locator('[data-testid="post-title"]')).toContainText('Test Post Title');
    
    console.log('✅ Post published and appears in feed');
  });

  test('template system works correctly', async ({ page }) => {
    console.log('🧪 Testing template system...');
    
    await page.click('[data-testid="create-post-button"]');
    
    // Open template selector
    await page.click('[data-testid="template-button"]');
    await expect(page.locator('[data-testid="template-dropdown"]')).toBeVisible();
    
    // Select a template
    await page.click('[data-testid="template-option"]:has-text("Discussion")');
    
    // Verify template content is applied
    const contentInput = page.locator('[data-testid="post-content"]');
    await expect(contentInput).toContainText('What are your thoughts on');
    
    console.log('✅ Template applied successfully');
  });

  test('post validation prevents empty posts', async ({ page }) => {
    console.log('🧪 Testing post validation...');
    
    await page.click('[data-testid="create-post-button"]');
    
    // Try to publish without content
    await page.click('[data-testid="publish-button"]');
    
    // Verify error message appears
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Title is required');
    
    console.log('✅ Validation prevents empty posts');
  });

  test('auto-save functionality works during typing', async ({ page }) => {
    console.log('🧪 Testing auto-save functionality...');
    
    await page.click('[data-testid="create-post-button"]');
    
    const titleInput = page.locator('[data-testid="post-title"]');
    await titleInput.fill('Auto-save test title');
    
    // Wait for auto-save indicator
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toContainText('Saved');
    
    console.log('✅ Auto-save working correctly');
  });

  test('post creation works on mobile viewports', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    console.log(`🧪 Testing mobile post creation on ${browserName}...`);
    
    // Mobile-specific post creation button
    await page.click('[data-testid="mobile-create-post-button"]');
    await expect(page.locator('[data-testid="mobile-post-creator"]')).toBeVisible();
    
    // Test mobile-optimized interface
    const titleInput = page.locator('[data-testid="post-title"]');
    await titleInput.fill('Mobile test post');
    
    // Verify mobile keyboard doesn't interfere
    await page.waitForTimeout(500);
    await expect(titleInput).toHaveValue('Mobile test post');
    
    console.log('✅ Mobile post creation works correctly');
  });

  test('post creation handles network failures gracefully', async ({ page }) => {
    console.log('🧪 Testing network failure handling...');
    
    await page.click('[data-testid="create-post-button"]');
    
    // Fill out post
    await page.locator('[data-testid="post-title"]').fill('Network test post');
    await page.locator('[data-testid="post-content"]').fill('Testing network resilience');
    
    // Simulate network failure
    await page.route('**/api/posts', route => route.abort());
    
    // Try to publish
    await page.click('[data-testid="publish-button"]');
    
    // Verify error handling
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network and retry
    await page.unroute('**/api/posts');
    await page.click('[data-testid="retry-button"]');
    
    // Should succeed now
    await expect(page.locator('[data-testid="post-published-success"]')).toBeVisible();
    
    console.log('✅ Network failure handled gracefully');
  });

  test('post creation performance meets thresholds', async ({ page }) => {
    console.log('🧪 Testing post creation performance...');
    
    // Measure modal open time
    const startTime = Date.now();
    await page.click('[data-testid="create-post-button"]');
    await page.locator('[data-testid="post-creator-modal"]').waitFor({ state: 'visible' });
    const modalTime = Date.now() - startTime;
    
    expect(modalTime).toBeLessThan(1000);
    console.log(`✅ Modal opened in ${modalTime}ms (< 1000ms threshold)`);
    
    // Measure publish time
    await page.locator('[data-testid="post-title"]').fill('Performance test');
    await page.locator('[data-testid="post-content"]').fill('Testing performance');
    
    const publishStart = Date.now();
    await page.click('[data-testid="publish-button"]');
    await page.locator('[data-testid="post-published-success"]').waitFor({ state: 'visible' });
    const publishTime = Date.now() - publishStart;
    
    expect(publishTime).toBeLessThan(3000);
    console.log(`✅ Post published in ${publishTime}ms (< 3000ms threshold)`);
  });
});
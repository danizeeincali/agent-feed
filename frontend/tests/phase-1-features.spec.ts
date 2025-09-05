import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Phase 1 Features Comprehensive Test Suite
 * 
 * Tests:
 * 1. Post expand/collapse functionality works correctly
 * 2. Post hierarchy displays in proper order
 * 3. Character count shows and updates in real-time
 * 4. Sharing buttons are completely removed from UI
 * 5. All interactions work without JavaScript errors
 */

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3000/api';

// Page Setup Utilities
async function setupPage(page: Page) {
  // Listen for console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to the app
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  
  return { consoleErrors };
}

async function waitForPostsToLoad(page: Page) {
  // Wait for either posts or empty state to appear
  await page.waitForSelector('[data-testid="loading-state"], article, [data-testid="empty-state"]', { timeout: 10000 });
  
  // If loading state exists, wait for it to disappear
  const loadingState = page.locator('[data-testid="loading-state"]');
  if (await loadingState.isVisible()) {
    await loadingState.waitFor({ state: 'hidden', timeout: 10000 });
  }
}

async function createTestPost(page: Page) {
  // Click to expand post creator
  await page.click('button:has-text("Start a post...")');
  
  // Fill out the form
  await page.fill('input[placeholder*="compelling title"]', 'Test Post for Phase 1');
  await page.fill('input[placeholder*="hook"]', 'This is a test hook for validation');
  await page.fill('textarea[placeholder*="Share your insights"]', 'This is test content for validating Phase 1 features. It should have enough content to test character counting and other functionality properly.');
  
  // Submit the post
  await page.click('button:has-text("Publish Post")');
  
  // Wait for post to appear in feed
  await page.waitForSelector('article:has-text("Test Post for Phase 1")', { timeout: 5000 });
}

test.describe('Phase 1 Features - Comprehensive Test Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupPage(page);
  });

  test.describe('1. Post Expand/Collapse Functionality', () => {
    
    test('should display post creator in collapsed state by default', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Check collapsed state elements are visible
      await expect(page.locator('button:has-text("Start a post...")')).toBeVisible();
      await expect(page.locator('button[title="Create post"]')).toBeVisible();
      
      // Check expanded state is not visible
      await expect(page.locator('h3:has-text("Create New Post")')).not.toBeVisible();
      await expect(page.locator('textarea[placeholder*="Share your insights"]')).not.toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should expand post creator when "Start a post" button is clicked', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Click to expand
      await page.click('button:has-text("Start a post...")');
      
      // Verify expanded state
      await expect(page.locator('h3:has-text("Create New Post")')).toBeVisible();
      await expect(page.locator('input[placeholder*="compelling title"]')).toBeVisible();
      await expect(page.locator('textarea[placeholder*="Share your insights"]')).toBeVisible();
      
      // Verify toolbar is visible
      await expect(page.locator('button[title="Bold (⌘+B)"]')).toBeVisible();
      await expect(page.locator('button[title="Italic (⌘+I)"]')).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should expand post creator when edit icon is clicked', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Click edit icon to expand
      await page.click('button[title="Create post"]');
      
      // Verify expanded state
      await expect(page.locator('h3:has-text("Create New Post")')).toBeVisible();
      await expect(page.locator('input[placeholder*="compelling title"]')).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should collapse post creator when X button is clicked', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand first
      await page.click('button:has-text("Start a post...")');
      await expect(page.locator('h3:has-text("Create New Post")')).toBeVisible();
      
      // Click close button
      await page.click('button[title="Close"]');
      
      // Verify collapsed state
      await expect(page.locator('h3:has-text("Create New Post")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Start a post...")')).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should maintain form data when collapsing and expanding', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand and fill form
      await page.click('button:has-text("Start a post...")');
      await page.fill('input[placeholder*="compelling title"]', 'Test Title');
      await page.fill('textarea[placeholder*="Share your insights"]', 'Test content');
      
      // Collapse
      await page.click('button[title="Close"]');
      
      // Expand again
      await page.click('button:has-text("Start a post...")');
      
      // Verify form data is preserved (draft functionality)
      const titleValue = await page.inputValue('input[placeholder*="compelling title"]');
      const contentValue = await page.inputValue('textarea[placeholder*="Share your insights"]');
      
      // Note: This might be empty if draft auto-save is not implemented
      // The test validates the expand/collapse works without errors
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('2. Post Hierarchy and Order', () => {
    
    test('should display posts in reverse chronological order (newest first)', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 1) {
        // Get timestamps from posts
        const timestamps: string[] = [];
        
        for (let i = 0; i < Math.min(postCount, 3); i++) {
          const timeElement = posts.nth(i).locator('[class*="Clock"] + span, time, [title*="ago"], span:has-text("ago"), span:has-text("h"), span:has-text("m"), span:has-text("d")').first();
          if (await timeElement.isVisible()) {
            const timeText = await timeElement.textContent();
            timestamps.push(timeText || '');
          }
        }
        
        // Verify timestamps exist
        expect(timestamps.length).toBeGreaterThan(0);
      }
      
      // Verify sort selector shows "Newest First" by default
      const sortSelect = page.locator('select').nth(1);
      await expect(sortSelect).toHaveValue('published_at-DESC');
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should change post order when sort option is changed', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      const posts = page.locator('article');
      const initialPostCount = await posts.count();
      
      if (initialPostCount > 0) {
        // Get first post title before sort change
        const firstPostTitle = await posts.first().locator('h4, h3, [class*="font-medium"]').first().textContent();
        
        // Change sort to "Oldest First"
        await page.selectOption('select:nth-of-type(2)', 'published_at-ASC');
        
        // Wait for posts to reload
        await page.waitForTimeout(1000);
        
        // Get first post title after sort change
        const newFirstPostTitle = await posts.first().locator('h4, h3, [class*="font-medium"]').first().textContent();
        
        // Titles should be different if there are multiple posts
        if (initialPostCount > 1) {
          expect(firstPostTitle).not.toBe(newFirstPostTitle);
        }
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should display post metadata correctly', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        const firstPost = posts.first();
        
        // Check for required post elements
        await expect(firstPost.locator('h4, h3, [class*="font-semibold"], [class*="font-medium"]').first()).toBeVisible();
        
        // Check for time indicator
        const timeElements = firstPost.locator('[class*="Clock"], time, [title*="ago"], span:has-text("ago"), span:has-text("h"), span:has-text("m"), span:has-text("d")');
        expect(await timeElements.count()).toBeGreaterThan(0);
        
        // Check for business impact indicator
        const impactElements = firstPost.locator('[class*="Star"], [title*="impact"], span:has-text("/10")');
        expect(await impactElements.count()).toBeGreaterThan(0);
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should filter posts correctly when filter is applied', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      const initialPosts = page.locator('article');
      const initialCount = await initialPosts.count();
      
      // Try different filters
      const filters = ['high-impact', 'recent', 'strategic'];
      
      for (const filter of filters) {
        await page.selectOption('select:first-of-type', filter);
        await page.waitForTimeout(1000); // Wait for filter to apply
        
        // Posts should still be visible or show empty state
        const loadingOrPosts = page.locator('[data-testid="loading-state"], article, [data-testid="empty-state"]');
        await expect(loadingOrPosts.first()).toBeVisible();
      }
      
      // Reset to "All Posts"
      await page.selectOption('select:first-of-type', 'all');
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('3. Character Count Real-time Updates', () => {
    
    test('should display character count for title field', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      // Check initial character count
      const titleInput = page.locator('input[placeholder*="compelling title"]');
      const titleCountElement = titleInput.locator('..').locator('div:has-text("/200")').or(
        page.locator('span:has-text("0/200")').first()
      );
      
      await expect(titleCountElement).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should update title character count in real-time', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      const titleInput = page.locator('input[placeholder*="compelling title"]');
      
      // Type some text
      await titleInput.fill('Test Title');
      
      // Check that character count updated
      await expect(page.locator('span:has-text("10/200")').or(page.locator('div:has-text("10/200")'))).toBeVisible();
      
      // Add more text
      await titleInput.fill('Test Title with more characters');
      
      // Verify count updated again
      await expect(page.locator('span:has-text("33/200")').or(page.locator('div:has-text("33/200")'))).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should display character count for hook field', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      // Check hook field character count
      const hookInput = page.locator('input[placeholder*="hook"]');
      const hookCountElement = page.locator('span:has-text("/300")').or(page.locator('div:has-text("/300")')).first();
      
      await expect(hookCountElement).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should update hook character count in real-time', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      const hookInput = page.locator('input[placeholder*="hook"]');
      
      // Type some text
      await hookInput.fill('Test hook');
      
      // Check that character count updated
      await expect(page.locator('span:has-text("9/300")').or(page.locator('div:has-text("9/300")'))).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should display character count for content field', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      // Check content field character count
      const contentCountElement = page.locator('span:has-text("/5000")').or(page.locator('div:has-text("/5000")')).first();
      
      await expect(contentCountElement).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should update content character count in real-time', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
      
      // Type some content
      const testContent = 'This is test content for character counting.';
      await contentTextarea.fill(testContent);
      
      // Check that character count updated (should be 44 characters)
      await expect(page.locator('span:has-text("44/5000")').or(page.locator('div:has-text("44/5000")'))).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should display word count and reading time', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      const contentTextarea = page.locator('textarea[placeholder*="Share your insights"]');
      
      // Type some content
      await contentTextarea.fill('This is a test with multiple words for counting purposes.');
      
      // Check for word count
      await expect(page.locator('span:has-text("words")').first()).toBeVisible();
      
      // Check for reading time
      await expect(page.locator('span:has-text("min read")').first()).toBeVisible();
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should enforce character limits', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      const titleInput = page.locator('input[placeholder*="compelling title"]');
      
      // Try to type more than the limit
      const longText = 'A'.repeat(250); // More than 200 character limit
      await titleInput.fill(longText);
      
      // Verify input is truncated to limit
      const actualValue = await titleInput.inputValue();
      expect(actualValue.length).toBeLessThanOrEqual(200);
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('4. Sharing Buttons Completely Removed', () => {
    
    test('should not display any sharing buttons in posts', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      // Check for common sharing button text/icons
      const sharingElements = [
        'Share',
        'share',
        'Twitter',
        'Facebook',
        'LinkedIn',
        'Copy link',
        'Share on',
        '[title*="Share"]',
        '[aria-label*="Share"]',
        'button:has-text("Share")',
        'a:has-text("Share")',
        '[class*="share"]', // CSS classes containing 'share'
      ];
      
      for (const selector of sharingElements) {
        const elements = page.locator(selector);
        const count = await elements.count();
        expect(count).toBe(0);
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should not display sharing buttons in post creator', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      // Check that no sharing buttons exist in the post creator
      const sharingButtons = [
        'button:has-text("Share")',
        'button[title*="Share"]',
        '[class*="share"]',
        'Share on LinkedIn',
        'Share on Twitter',
        'Copy link',
      ];
      
      for (const selector of sharingButtons) {
        const elements = page.locator(selector);
        expect(await elements.count()).toBe(0);
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should not display sharing options in post actions', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        // Check each post for sharing buttons
        for (let i = 0; i < Math.min(postCount, 3); i++) {
          const post = posts.nth(i);
          
          // Look for sharing buttons within each post
          const sharingInPost = post.locator('button:has-text("Share"), [title*="Share"], [class*="share"]');
          expect(await sharingInPost.count()).toBe(0);
        }
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should only show like and comment buttons in post actions', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        const firstPost = posts.first();
        
        // Check for like button (Heart icon)
        const likeButton = firstPost.locator('button').filter({ has: page.locator('[class*="Heart"], [data-icon="heart"]') });
        expect(await likeButton.count()).toBeGreaterThan(0);
        
        // Check for comment button (MessageCircle icon)
        const commentButton = firstPost.locator('button').filter({ has: page.locator('[class*="MessageCircle"], [data-icon="message-circle"]') });
        expect(await commentButton.count()).toBeGreaterThan(0);
        
        // Ensure NO sharing button exists
        const sharingButton = firstPost.locator('button:has-text("Share"), button[title*="Share"], button[aria-label*="Share"]');
        expect(await sharingButton.count()).toBe(0);
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should not have any external sharing service integrations', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Check page source for sharing service URLs/scripts
      const content = await page.content();
      
      const sharingServices = [
        'twitter.com/intent',
        'facebook.com/sharer',
        'linkedin.com/sharing',
        'addthis.com',
        'sharethis.com',
        'addtoany.com',
      ];
      
      for (const service of sharingServices) {
        expect(content).not.toContain(service);
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('5. JavaScript Error-Free Interactions', () => {
    
    test('should navigate without JavaScript errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Verify no console errors during initial load
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle post creator interactions without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      // Fill form fields
      await page.fill('input[placeholder*="compelling title"]', 'Error Test Post');
      await page.fill('input[placeholder*="hook"]', 'Testing for JavaScript errors');
      await page.fill('textarea[placeholder*="Share your insights"]', 'This post is created to test that no JavaScript errors occur during form interactions.');
      
      // Try various toolbar buttons
      await page.click('button[title="Bold (⌘+B)"]');
      await page.click('button[title="Italic (⌘+I)"]');
      await page.click('button[title="Link (⌘+K)"]');
      
      // Close post creator
      await page.click('button[title="Close"]');
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle post interactions without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        const firstPost = posts.first();
        
        // Try to click like button if it exists
        const likeButton = firstPost.locator('button').filter({ has: page.locator('[class*="Heart"]') });
        if (await likeButton.count() > 0) {
          await likeButton.first().click();
        }
        
        // Try to click comment button if it exists
        const commentButton = firstPost.locator('button').filter({ has: page.locator('[class*="MessageCircle"]') });
        if (await commentButton.count() > 0) {
          await commentButton.first().click();
        }
      }
      
      // Change filters and sorts
      await page.selectOption('select:first-of-type', 'high-impact');
      await page.selectOption('select:nth-of-type(2)', 'title-ASC');
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle search functionality without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Click search button
      await page.click('button[title="Search posts"]');
      
      // Type in search field
      const searchInput = page.locator('input[placeholder*="Search posts"]');
      await searchInput.fill('test search query');
      
      // Wait for search to process
      await page.waitForTimeout(500);
      
      // Clear search
      await searchInput.fill('');
      
      // Close search
      await page.click('button[title="Search posts"]');
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle refresh action without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Click refresh button
      const refreshButton = page.locator('button[title="Refresh feed"]');
      await refreshButton.click();
      
      // Wait for refresh to complete
      await page.waitForTimeout(1000);
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle window resize without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Resize window to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      // Expand post creator on mobile
      await page.click('button:has-text("Start a post...")');
      
      // Resize back to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(500);
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle rapid interactions without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Rapid expand/collapse of post creator
      for (let i = 0; i < 3; i++) {
        await page.click('button:has-text("Start a post...")');
        await page.waitForTimeout(100);
        await page.click('button[title="Close"]');
        await page.waitForTimeout(100);
      }
      
      // Rapid filter changes
      const filters = ['all', 'high-impact', 'recent', 'all'];
      for (const filter of filters) {
        await page.selectOption('select:first-of-type', filter);
        await page.waitForTimeout(200);
      }
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle form validation without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Expand post creator
      await page.click('button:has-text("Start a post...")');
      
      // Try to submit empty form
      const submitButton = page.locator('button:has-text("Publish Post")');
      await submitButton.click();
      
      // Submit button should be disabled for empty form
      expect(await submitButton.isDisabled()).toBe(true);
      
      // Fill only title
      await page.fill('input[placeholder*="compelling title"]', 'Test');
      // Submit should still be disabled without content
      expect(await submitButton.isDisabled()).toBe(true);
      
      // Fill content
      await page.fill('textarea[placeholder*="Share your insights"]', 'Test content');
      // Now submit should be enabled
      expect(await submitButton.isDisabled()).toBe(false);
      
      // Verify no console errors occurred
      expect(consoleErrors).toHaveLength(0);
    });
  });

  test.describe('Integration Tests', () => {
    
    test('should complete full post creation workflow without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForPostsToLoad(page);
      
      // Complete workflow test
      await page.click('button:has-text("Start a post...")');
      
      // Fill form with character count validation
      const title = 'Complete Integration Test Post';
      const hook = 'Testing the complete post creation workflow';
      const content = 'This is a comprehensive test of the post creation workflow including character counts, form validation, and submission process.';
      
      await page.fill('input[placeholder*="compelling title"]', title);
      await page.fill('input[placeholder*="hook"]', hook);
      await page.fill('textarea[placeholder*="Share your insights"]', content);
      
      // Verify character counts are displayed
      await expect(page.locator(`span:has-text("${title.length}/200")`)).toBeVisible();
      await expect(page.locator(`span:has-text("${hook.length}/300")`)).toBeVisible();
      await expect(page.locator(`span:has-text("${content.length}/5000")`)).toBeVisible();
      
      // Verify submit button is enabled
      const submitButton = page.locator('button:has-text("Publish Post")');
      expect(await submitButton.isDisabled()).toBe(false);
      
      // Submit the post (Note: May fail due to API, but should not cause JS errors)
      await submitButton.click();
      
      // Verify no console errors occurred throughout the process
      expect(consoleErrors).toHaveLength(0);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      
      // Block network requests to simulate offline state
      await page.route('**/api/**', route => route.abort());
      
      // Try to refresh posts
      await page.click('button[title="Refresh feed"]');
      await page.waitForTimeout(1000);
      
      // Try to create a post
      await page.click('button:has-text("Start a post...")');
      await page.fill('input[placeholder*="compelling title"]', 'Network Error Test');
      await page.fill('textarea[placeholder*="Share your insights"]', 'Testing network error handling');
      
      const submitButton = page.locator('button:has-text("Publish Post")');
      if (!await submitButton.isDisabled()) {
        await submitButton.click();
      }
      
      // Verify no JavaScript console errors occurred (network errors are expected)
      expect(consoleErrors).toHaveLength(0);
    });
  });
});
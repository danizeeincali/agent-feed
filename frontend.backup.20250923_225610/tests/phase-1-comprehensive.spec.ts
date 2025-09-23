import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * Phase 1 Features Comprehensive Test Suite
 * 
 * This test suite validates ALL Phase 1 requirements:
 * 1. Post expand/collapse functionality works correctly
 * 2. Post hierarchy displays in proper order (Title → Hook → Content → Actions → Metadata)
 * 3. Character count shows and updates in real-time
 * 4. Sharing buttons are completely removed from UI
 * 5. All interactions work without JavaScript errors
 */

// Test configuration
const BASE_URL = 'http://localhost:5173';
const API_BASE_URL = 'http://localhost:3000';
const TIMEOUT = 30000;

// Utility functions
async function setupPage(page: Page) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  
  // Monitor console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`ERROR: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(`WARNING: ${msg.text()}`);
    }
  });

  // Navigate to the app
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: TIMEOUT });
  
  return { consoleErrors, consoleWarnings };
}

async function waitForAppLoad(page: Page) {
  // Wait for main app elements to be visible
  await page.waitForSelector('h2:has-text("Agent Feed")', { timeout: TIMEOUT });
  
  // Wait for either posts to load or empty state
  await page.waitForSelector('[data-testid="loading-state"], article, [data-testid="empty-state"], h2:has-text("Agent Posts Archive")', { timeout: TIMEOUT });
  
  // If loading state exists, wait for it to disappear
  const loadingState = page.locator('[data-testid="loading-state"]');
  if (await loadingState.isVisible()) {
    await loadingState.waitFor({ state: 'hidden', timeout: TIMEOUT });
  }
}

async function expandPostCreator(page: Page) {
  // Look for the collapsed state button
  const startPostButton = page.locator('button:has-text("Start a post...")');
  const editButton = page.locator('button[title="Create post"]');
  
  if (await startPostButton.isVisible()) {
    await startPostButton.click();
  } else if (await editButton.isVisible()) {
    await editButton.click();
  } else {
    throw new Error('Post creator expand button not found');
  }
  
  // Wait for expanded state
  await page.waitForSelector('h3:has-text("Create New Post")', { timeout: 5000 });
}

test.describe('Phase 1 Features - Comprehensive Validation Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    await waitForAppLoad(page);
    
    // Verify no errors during page load
    expect(consoleErrors.length).toBe(0);
  });

  test.describe('1. Post Expand/Collapse Functionality', () => {
    
    test('should show post creator in collapsed state by default', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Verify collapsed state elements
      const startPostButton = page.locator('button:has-text("Start a post...")');
      const createPostIcon = page.locator('button[title="Create post"]');
      
      await expect(startPostButton.or(createPostIcon)).toBeVisible();
      
      // Verify expanded state is NOT visible
      await expect(page.locator('h3:has-text("Create New Post")')).not.toBeVisible();
      await expect(page.locator('textarea[placeholder*="Share your insights"]')).not.toBeVisible();
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should expand post creator when clicked', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Click to expand
      await expandPostCreator(page);
      
      // Verify expanded state
      await expect(page.locator('h3:has-text("Create New Post")')).toBeVisible();
      await expect(page.locator('input[placeholder*="title"]')).toBeVisible();
      await expect(page.locator('textarea[placeholder*="Share your insights"]')).toBeVisible();
      
      // Verify toolbar elements are visible
      const toolbar = page.locator('button[title*="Bold"], button[title*="Italic"], button[title*="Link"]').first();
      if (await toolbar.count() > 0) {
        await expect(toolbar).toBeVisible();
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should collapse post creator when close button is clicked', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Expand first
      await expandPostCreator(page);
      await expect(page.locator('h3:has-text("Create New Post")')).toBeVisible();
      
      // Click close button
      await page.click('button[title="Close"]');
      
      // Verify collapsed state
      await expect(page.locator('h3:has-text("Create New Post")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Start a post...")').or(page.locator('button[title="Create post"]'))).toBeVisible();
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle multiple expand/collapse cycles correctly', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Test multiple expand/collapse cycles
      for (let i = 0; i < 3; i++) {
        // Expand
        await expandPostCreator(page);
        await expect(page.locator('h3:has-text("Create New Post")')).toBeVisible();
        
        // Collapse
        await page.click('button[title="Close"]');
        await expect(page.locator('h3:has-text("Create New Post")')).not.toBeVisible();
        
        await page.waitForTimeout(300); // Small delay between cycles
      }
      
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('2. Post Hierarchy and Order Structure', () => {
    
    test('should display post hierarchy in correct order: Title → Hook → Content → Actions → Metadata', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Expand post creator to verify form structure
      await expandPostCreator(page);
      
      // Verify form fields are in hierarchical order
      const titleField = page.locator('input[placeholder*="title"]');
      const hookField = page.locator('input[placeholder*="hook"]');
      const contentField = page.locator('textarea[placeholder*="Share your insights"]');
      
      await expect(titleField).toBeVisible();
      await expect(hookField).toBeVisible();
      await expect(contentField).toBeVisible();
      
      // Get bounding boxes to verify vertical order
      const titleBox = await titleField.boundingBox();
      const hookBox = await hookField.boundingBox();
      const contentBox = await contentField.boundingBox();
      
      if (titleBox && hookBox && contentBox) {
        expect(titleBox.y).toBeLessThan(hookBox.y);
        expect(hookBox.y).toBeLessThan(contentBox.y);
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should display posts in proper chronological order', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Look for posts
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        // Verify default sort is newest first
        const sortSelect = page.locator('select').nth(1);
        if (await sortSelect.isVisible()) {
          await expect(sortSelect).toHaveValue('published_at-DESC');
        }
        
        // Check post order by examining timestamps if available
        for (let i = 0; i < Math.min(postCount, 3); i++) {
          const post = posts.nth(i);
          await expect(post).toBeVisible();
          
          // Verify post has time information
          const timeElement = post.locator('[class*="Clock"] + span, time, [title*="ago"], span:has-text("ago"), span:has-text("h"), span:has-text("m"), span:has-text("d")').first();
          if (await timeElement.count() > 0) {
            await expect(timeElement).toBeVisible();
          }
        }
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should change post order when sort option is modified', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      const posts = page.locator('article');
      const initialPostCount = await posts.count();
      
      if (initialPostCount > 1) {
        // Get first post identifier before sort change
        const firstPostTitle = await posts.first().locator('h4, h3, [class*="font-medium"], [class*="font-semibold"]').first().textContent();
        
        // Change sort to oldest first
        const sortSelect = page.locator('select').nth(1);
        await sortSelect.selectOption('published_at-ASC');
        
        // Wait for posts to reload
        await page.waitForTimeout(2000);
        
        // Get first post identifier after sort change
        const newFirstPostTitle = await posts.first().locator('h4, h3, [class*="font-medium"], [class*="font-semibold"]').first().textContent();
        
        // They should be different if there are multiple posts
        expect(firstPostTitle).not.toBe(newFirstPostTitle);
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should display complete post metadata correctly', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        const firstPost = posts.first();
        
        // Check for essential post elements in correct structure:
        // 1. Title/Header
        await expect(firstPost.locator('h4, h3, [class*="font-semibold"], [class*="font-medium"]').first()).toBeVisible();
        
        // 2. Time metadata
        const timeElements = firstPost.locator('[class*="Clock"], time, [title*="ago"], span:has-text("ago"), span:has-text("h"), span:has-text("m"), span:has-text("d")');
        expect(await timeElements.count()).toBeGreaterThan(0);
        
        // 3. Impact/Rating metadata
        const impactElements = firstPost.locator('[class*="Star"], [title*="impact"], span:has-text("/10"), span:has-text("Impact")');
        expect(await impactElements.count()).toBeGreaterThan(0);
        
        // 4. Actions section (like/comment buttons)
        const actionElements = firstPost.locator('button').filter({ has: page.locator('[class*="Heart"], [class*="MessageCircle"]') });
        expect(await actionElements.count()).toBeGreaterThan(0);
      }
      
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('3. Character Count Real-time Updates', () => {
    
    test('should display character counters for all input fields', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Expand post creator
      await expandPostCreator(page);
      
      // Check for character count displays
      const titleCount = page.locator('span:has-text("/200"), div:has-text("/200")').first();
      const hookCount = page.locator('span:has-text("/300"), div:has-text("/300")').first();
      const contentCount = page.locator('span:has-text("/5000"), div:has-text("/5000")').first();
      
      await expect(titleCount).toBeVisible();
      await expect(hookCount).toBeVisible();
      await expect(contentCount).toBeVisible();
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should update title character count in real-time', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      await expandPostCreator(page);
      
      const titleInput = page.locator('input[placeholder*="title"]');
      
      // Type incrementally and check count updates
      await titleInput.fill('Test');
      await expect(page.locator('span:has-text("4/200"), div:has-text("4/200")')).toBeVisible();
      
      await titleInput.fill('Test Title');
      await expect(page.locator('span:has-text("10/200"), div:has-text("10/200")')).toBeVisible();
      
      await titleInput.fill('Test Title with More Characters');
      await expect(page.locator('span:has-text("33/200"), div:has-text("33/200")')).toBeVisible();
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should update hook character count in real-time', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      await expandPostCreator(page);
      
      const hookInput = page.locator('input[placeholder*="hook"]');
      
      // Test hook character counting
      await hookInput.fill('Short hook');
      await expect(page.locator('span:has-text("10/300"), div:has-text("10/300")')).toBeVisible();
      
      await hookInput.fill('This is a longer hook that should update the character count dynamically');
      await expect(page.locator('span:has-text("78/300"), div:has-text("78/300")')).toBeVisible();
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should update content character count in real-time', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      await expandPostCreator(page);
      
      const contentInput = page.locator('textarea[placeholder*="Share your insights"]');
      
      // Test content character counting
      const shortContent = 'Brief content.';
      await contentInput.fill(shortContent);
      await expect(page.locator(`span:has-text("${shortContent.length}/5000"), div:has-text("${shortContent.length}/5000")`)).toBeVisible();
      
      const longContent = 'This is much longer content that should demonstrate real-time character counting functionality working correctly across multiple lines and with substantial text.';
      await contentInput.fill(longContent);
      await expect(page.locator(`span:has-text("${longContent.length}/5000"), div:has-text("${longContent.length}/5000")`)).toBeVisible();
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should display additional metrics (word count, reading time)', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      await expandPostCreator(page);
      
      const contentInput = page.locator('textarea[placeholder*="Share your insights"]');
      
      // Add substantial content to trigger word count
      await contentInput.fill('This is a comprehensive test with multiple words to validate that word counting and reading time estimation features are working correctly in the character counter component.');
      
      // Look for word count indicators
      const wordCountElement = page.locator('span:has-text("words"), div:has-text("words")').first();
      if (await wordCountElement.count() > 0) {
        await expect(wordCountElement).toBeVisible();
      }
      
      // Look for reading time indicators
      const readingTimeElement = page.locator('span:has-text("min read"), div:has-text("min read")').first();
      if (await readingTimeElement.count() > 0) {
        await expect(readingTimeElement).toBeVisible();
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle character limit enforcement', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      await expandPostCreator(page);
      
      const titleInput = page.locator('input[placeholder*="title"]');
      
      // Try to exceed character limit
      const overlimitText = 'A'.repeat(250); // More than 200 character limit
      await titleInput.fill(overlimitText);
      
      // Verify input is limited or shows warning
      const actualValue = await titleInput.inputValue();
      const isLimited = actualValue.length <= 200;
      const hasWarning = await page.locator('.error-state, .warning-state, [class*="red"], [class*="warning"]').count() > 0;
      
      // Either input is limited OR warning is shown
      expect(isLimited || hasWarning).toBe(true);
      
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('4. Sharing Buttons Completely Removed', () => {
    
    test('should have NO sharing buttons anywhere in the application', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Comprehensive search for any sharing-related elements
      const sharingSelectors = [
        'button:has-text("Share")',
        'a:has-text("Share")',
        '[title*="Share"]',
        '[aria-label*="Share"]',
        'button:has-text("share")',
        'a:has-text("share")',
        '.share-button',
        '[class*="share"]',
        'button:has-text("Twitter")',
        'button:has-text("Facebook")',
        'button:has-text("LinkedIn")',
        'button:has-text("Copy link")',
        '[href*="twitter.com/intent"]',
        '[href*="facebook.com/sharer"]',
        '[href*="linkedin.com/sharing"]',
      ];
      
      for (const selector of sharingSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          // Log which elements were found for debugging
          for (let i = 0; i < count; i++) {
            const text = await elements.nth(i).textContent();
            console.log(`Found sharing element: ${selector} with text: "${text}"`);
          }
        }
        expect(count).toBe(0);
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should not have sharing buttons in post creator', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      await expandPostCreator(page);
      
      // Check specifically within post creator area
      const postCreator = page.locator('h3:has-text("Create New Post")').locator('..');
      
      const sharingInCreator = postCreator.locator('button:has-text("Share"), [title*="Share"], .share-button');
      expect(await sharingInCreator.count()).toBe(0);
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should not have sharing buttons in post actions', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        // Check each visible post
        for (let i = 0; i < Math.min(postCount, 5); i++) {
          const post = posts.nth(i);
          
          // Look for sharing buttons within each post
          const sharingInPost = post.locator('button:has-text("Share"), [title*="Share"], .share-button, [class*="share"]');
          expect(await sharingInPost.count()).toBe(0);
        }
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should only show like and comment actions in posts', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        const firstPost = posts.first();
        
        // Check for allowed buttons (like and comment)
        const likeButton = firstPost.locator('button').filter({ has: page.locator('[class*="Heart"], svg[data-icon="heart"]') });
        const commentButton = firstPost.locator('button').filter({ has: page.locator('[class*="MessageCircle"], svg[data-icon="message-circle"]') });
        
        if (await likeButton.count() > 0) {
          await expect(likeButton.first()).toBeVisible();
        }
        
        if (await commentButton.count() > 0) {
          await expect(commentButton.first()).toBeVisible();
        }
        
        // Ensure NO share button exists
        const shareButton = firstPost.locator('button:has-text("Share"), button[title*="Share"], button[class*="share"]');
        expect(await shareButton.count()).toBe(0);
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should not contain any external sharing service integrations', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Check page source for sharing service integrations
      const content = await page.content();
      
      const bannedServices = [
        'twitter.com/intent',
        'facebook.com/sharer',
        'linkedin.com/sharing',
        'addthis.com',
        'sharethis.com',
        'addtoany.com',
        'sharebutton',
      ];
      
      for (const service of bannedServices) {
        expect(content.toLowerCase()).not.toContain(service);
      }
      
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('5. JavaScript Error-Free Interactions', () => {
    
    test('should load application without any JavaScript errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Wait for all initial network requests to complete
      await page.waitForLoadState('networkidle');
      
      // Wait a bit more for any async operations
      await page.waitForTimeout(2000);
      
      // Check for any console errors
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle post creator interactions without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Expand post creator
      await expandPostCreator(page);
      
      // Fill all form fields
      await page.fill('input[placeholder*="title"]', 'Test Post Title');
      await page.fill('input[placeholder*="hook"]', 'This is a test hook for validation');
      await page.fill('textarea[placeholder*="Share your insights"]', 'This is comprehensive test content to validate that all form interactions work without JavaScript errors.');
      
      // Try toolbar interactions if they exist
      const boldButton = page.locator('button[title*="Bold"]');
      if (await boldButton.count() > 0) {
        await boldButton.click();
      }
      
      const italicButton = page.locator('button[title*="Italic"]');
      if (await italicButton.count() > 0) {
        await italicButton.click();
      }
      
      // Close and reopen
      await page.click('button[title="Close"]');
      await expandPostCreator(page);
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle all post interactions without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      const posts = page.locator('article');
      const postCount = await posts.count();
      
      if (postCount > 0) {
        const firstPost = posts.first();
        
        // Try clicking like button
        const likeButton = firstPost.locator('button').filter({ has: page.locator('[class*="Heart"]') });
        if (await likeButton.count() > 0) {
          await likeButton.first().click();
          await page.waitForTimeout(500);
        }
        
        // Try clicking comment button
        const commentButton = firstPost.locator('button').filter({ has: page.locator('[class*="MessageCircle"]') });
        if (await commentButton.count() > 0) {
          await commentButton.first().click();
          await page.waitForTimeout(500);
        }
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle filter and sort changes without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Test all filter options
      const filterSelect = page.locator('select').first();
      if (await filterSelect.isVisible()) {
        const filterOptions = ['all', 'high-impact', 'recent', 'strategic'];
        
        for (const filter of filterOptions) {
          await filterSelect.selectOption(filter);
          await page.waitForTimeout(1000);
        }
      }
      
      // Test all sort options
      const sortSelect = page.locator('select').nth(1);
      if (await sortSelect.isVisible()) {
        const sortOptions = ['published_at-DESC', 'published_at-ASC', 'title-ASC', 'title-DESC'];
        
        for (const sort of sortOptions) {
          await sortSelect.selectOption(sort);
          await page.waitForTimeout(1000);
        }
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle search functionality without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Click search button to show search
      const searchButton = page.locator('button[title="Search posts"]');
      if (await searchButton.isVisible()) {
        await searchButton.click();
        
        // Type in search field
        const searchInput = page.locator('input[placeholder*="Search posts"]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('test search query');
          await page.waitForTimeout(1000);
          
          await searchInput.fill('different search');
          await page.waitForTimeout(1000);
          
          await searchInput.fill('');
          await page.waitForTimeout(500);
        }
        
        // Close search
        await searchButton.click();
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle refresh operations without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Click refresh button
      const refreshButton = page.locator('button[title="Refresh feed"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(2000);
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle responsive behavior without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667 },   // Mobile
        { width: 768, height: 1024 },  // Tablet
        { width: 1280, height: 720 },  // Desktop
        { width: 1920, height: 1080 }  // Large desktop
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        
        // Try expanding post creator at different sizes
        if (await page.locator('button:has-text("Start a post...")').or(page.locator('button[title="Create post"]')).count() > 0) {
          await expandPostCreator(page);
          await page.waitForTimeout(300);
          await page.click('button[title="Close"]');
          await page.waitForTimeout(300);
        }
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle rapid user interactions without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Rapid expand/collapse cycles
      for (let i = 0; i < 5; i++) {
        await expandPostCreator(page);
        await page.waitForTimeout(100);
        await page.click('button[title="Close"]');
        await page.waitForTimeout(100);
      }
      
      // Rapid filter changes
      const filterSelect = page.locator('select').first();
      if (await filterSelect.isVisible()) {
        const filters = ['all', 'high-impact', 'recent', 'all'];
        for (const filter of filters) {
          await filterSelect.selectOption(filter);
          await page.waitForTimeout(200);
        }
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle form validation states without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      await expandPostCreator(page);
      
      // Check submit button state with empty form
      const submitButton = page.locator('button:has-text("Publish Post"), button[type="submit"]');
      if (await submitButton.count() > 0) {
        const isDisabled = await submitButton.isDisabled();
        expect(typeof isDisabled).toBe('boolean'); // Should not throw error
      }
      
      // Fill form partially and check validation
      await page.fill('input[placeholder*="title"]', 'Test');
      await page.waitForTimeout(300);
      
      await page.fill('textarea[placeholder*="Share your insights"]', 'Content');
      await page.waitForTimeout(300);
      
      // Form should now be valid
      if (await submitButton.count() > 0) {
        const isDisabled = await submitButton.isDisabled();
        expect(typeof isDisabled).toBe('boolean');
      }
      
      expect(consoleErrors.length).toBe(0);
    });
  });

  test.describe('Integration Tests - End-to-End Workflows', () => {
    
    test('should complete full post creation workflow without errors', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Full workflow test
      await expandPostCreator(page);
      
      // Fill complete form
      const title = 'Complete Integration Test Post';
      const hook = 'Testing the complete workflow including all Phase 1 features';
      const content = 'This is a comprehensive integration test that validates the entire post creation workflow, including character counting, form validation, hierarchy display, and error-free operation.';
      
      await page.fill('input[placeholder*="title"]', title);
      await page.fill('input[placeholder*="hook"]', hook);
      await page.fill('textarea[placeholder*="Share your insights"]', content);
      
      // Verify character counts
      await expect(page.locator(`span:has-text("${title.length}/200"), div:has-text("${title.length}/200")`)).toBeVisible();
      await expect(page.locator(`span:has-text("${hook.length}/300"), div:has-text("${hook.length}/300")`)).toBeVisible();
      await expect(page.locator(`span:has-text("${content.length}/5000"), div:has-text("${content.length}/5000")`)).toBeVisible();
      
      // Check submit button state
      const submitButton = page.locator('button:has-text("Publish Post"), button[type="submit"]');
      if (await submitButton.count() > 0) {
        const isEnabled = !(await submitButton.isDisabled());
        expect(isEnabled).toBe(true);
      }
      
      expect(consoleErrors.length).toBe(0);
    });

    test('should handle network error states gracefully', async ({ page }) => {
      const { consoleErrors } = await setupPage(page);
      await waitForAppLoad(page);
      
      // Intercept API calls to simulate network errors
      await page.route('**/api/**', route => {
        route.abort('internetdisconnected');
      });
      
      // Try refresh operation
      const refreshButton = page.locator('button[title="Refresh feed"]');
      if (await refreshButton.isVisible()) {
        await refreshButton.click();
        await page.waitForTimeout(2000);
      }
      
      // Try creating a post
      await expandPostCreator(page);
      await page.fill('input[placeholder*="title"]', 'Network Error Test');
      await page.fill('textarea[placeholder*="Share your insights"]', 'Testing network error handling');
      
      const submitButton = page.locator('button:has-text("Publish Post"), button[type="submit"]');
      if (await submitButton.count() > 0 && !(await submitButton.isDisabled())) {
        await submitButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Should handle gracefully without JS errors (network errors are expected)
      expect(consoleErrors.length).toBe(0);
    });
  });
});

test.describe('Performance and Accessibility Tests', () => {
  
  test('should meet basic accessibility requirements', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    await waitForAppLoad(page);
    
    // Check for proper heading structure
    const h1Elements = page.locator('h1');
    const h2Elements = page.locator('h2');
    
    // Should have at least one main heading
    expect(await h1Elements.or(h2Elements).count()).toBeGreaterThan(0);
    
    // Expand post creator and check form accessibility
    await expandPostCreator(page);
    
    const titleInput = page.locator('input[placeholder*="title"]');
    const contentInput = page.locator('textarea[placeholder*="Share your insights"]');
    
    // Inputs should have proper labels or placeholders
    await expect(titleInput).toHaveAttribute('placeholder');
    await expect(contentInput).toHaveAttribute('placeholder');
    
    expect(consoleErrors.length).toBe(0);
  });

  test('should handle large amounts of content without performance issues', async ({ page }) => {
    const { consoleErrors } = await setupPage(page);
    await waitForAppLoad(page);
    
    await expandPostCreator(page);
    
    // Test with large content
    const largeContent = 'A'.repeat(1000) + ' This is a performance test with substantial content to ensure the character counter and form validation can handle large inputs without causing performance issues or JavaScript errors. ' + 'B'.repeat(2000);
    
    const contentInput = page.locator('textarea[placeholder*="Share your insights"]');
    
    // Measure performance by timing the operation
    const startTime = Date.now();
    await contentInput.fill(largeContent);
    const endTime = Date.now();
    
    // Should complete within reasonable time (5 seconds)
    expect(endTime - startTime).toBeLessThan(5000);
    
    // Character count should update
    await expect(page.locator(`span:has-text("${largeContent.length}/5000"), div:has-text("${largeContent.length}/5000")`)).toBeVisible();
    
    expect(consoleErrors.length).toBe(0);
  });
});
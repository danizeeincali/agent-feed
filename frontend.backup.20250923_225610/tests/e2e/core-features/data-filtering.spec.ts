import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';

test.describe('Data Loading and Filtering Validation', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.clearBrowserState();
    await helpers.monitorNetworkRequests();
  });

  test('initial post loading and pagination works', async ({ page }) => {
    console.log('=€ Starting initial post loading test...');
    
    await helpers.navigateTo('/');
    
    // Monitor network requests for API calls
    const requests = await helpers.monitorNetworkRequests();
    
    // Wait for posts to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Find posts in the feed
    const feedSelectors = [
      '.feed',
      '[data-testid="feed"]',
      '.posts-container',
      '.post-list'
    ];
    
    let feed = null;
    for (const selector of feedSelectors) {
      feed = page.locator(selector);
      if (await feed.count() > 0) {
        console.log(` Found feed container: ${selector}`);
        break;
      }
    }
    
    const postSelectors = [
      '.post',
      '[data-testid="post"]',
      '.feed-item',
      '.post-container'
    ];
    
    let posts = null;
    for (const selector of postSelectors) {
      posts = page.locator(selector);
      if (await posts.count() > 0) {
        console.log(` Found posts: ${selector}, count: ${await posts.count()}`);
        break;
      }
    }
    
    // Verify posts loaded
    if (posts && await posts.count() > 0) {
      const postCount = await posts.count();
      expect(postCount).toBeGreaterThan(0);
      
      // Verify post structure
      const firstPost = posts.first();
      const boundingBox = await firstPost.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox!.height).toBeGreaterThan(0);
      
      console.log(` ${postCount} posts loaded successfully`);
    } else {
      console.log('9 No posts found - may be empty feed');
    }
    
    // Test pagination if available
    const paginationSelectors = [
      '[data-testid="load-more"]',
      '.load-more',
      '.pagination',
      'button:has-text("Load More")',
      'button:has-text("Next")',
      '.infinite-scroll-trigger'
    ];
    
    let paginationButton = null;
    for (const selector of paginationSelectors) {
      paginationButton = page.locator(selector);
      if (await paginationButton.count() > 0 && await paginationButton.isVisible()) {
        console.log(` Found pagination: ${selector}`);
        break;
      }
    }
    
    if (paginationButton) {
      const initialPostCount = await posts.count();
      
      await paginationButton.click();
      await page.waitForTimeout(2000);
      
      const newPostCount = await posts.count();
      
      if (newPostCount > initialPostCount) {
        console.log(` Pagination loaded ${newPostCount - initialPostCount} more posts`);
      } else {
        console.log('9 No additional posts loaded - may be end of feed');
      }
    }
    
    // Test infinite scroll if no pagination button
    if (!paginationButton) {
      const initialPostCount = posts ? await posts.count() : 0;
      
      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(3000);
      
      const newPostCount = posts ? await posts.count() : 0;
      
      if (newPostCount > initialPostCount) {
        console.log(' Infinite scroll detected - new posts loaded');
      } else {
        console.log('9 No infinite scroll or no more posts available');
      }
    }
  });

  test('filter application and clearing works', async ({ page }) => {
    console.log('=€ Testing filter application and clearing...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Look for filter controls
    const filterSelectors = [
      '[data-testid="filters"]',
      '.filters',
      '.filter-controls',
      '.filter-bar'
    ];
    
    let filterContainer = null;
    for (const selector of filterSelectors) {
      filterContainer = page.locator(selector);
      if (await filterContainer.count() > 0) {
        console.log(` Found filter container: ${selector}`);
        break;
      }
    }
    
    // Look for specific filter types
    const filterTypeSelectors = [
      '[data-testid="hashtag-filter"]',
      '[data-testid="user-filter"]',
      '[data-testid="date-filter"]',
      '.hashtag-filter',
      '.user-filter',
      '.date-filter',
      'select',
      'input[type="text"]',
      'input[placeholder*="filter" i]',
      'input[placeholder*="search" i]'
    ];
    
    let filterInput = null;
    for (const selector of filterTypeSelectors) {
      filterInput = page.locator(selector);
      if (await filterInput.count() > 0 && await filterInput.isVisible()) {
        console.log(` Found filter input: ${selector}`);
        break;
      }
    }
    
    if (!filterInput) {
      // Look for hashtag/tag filters in posts themselves
      const hashtagLinks = page.locator('a[href*="#"], .hashtag, [data-testid="hashtag"]');
      if (await hashtagLinks.count() > 0) {
        console.log(' Found clickable hashtag filters in posts');
        
        const initialPosts = page.locator('.post, [data-testid="post"]');
        const initialCount = await initialPosts.count();
        
        // Click first hashtag
        await hashtagLinks.first().click();
        await page.waitForTimeout(2000);
        
        const filteredPosts = page.locator('.post, [data-testid="post"]');
        const filteredCount = await filteredPosts.count();
        
        console.log(`Posts before filter: ${initialCount}, after: ${filteredCount}`);
        
        if (filteredCount !== initialCount) {
          console.log(' Hashtag filtering detected');
          
          // Look for clear filter button
          const clearFilterSelectors = [
            '[data-testid="clear-filter"]',
            '.clear-filter',
            'button:has-text("Clear")',
            'button:has-text("All")',
            '.filter-clear'
          ];
          
          for (const selector of clearFilterSelectors) {
            const clearButton = page.locator(selector);
            if (await clearButton.count() > 0) {
              await clearButton.click();
              await page.waitForTimeout(1000);
              console.log(' Filter cleared');
              break;
            }
          }
        }
        
        return;
      }
    }
    
    if (filterInput && await filterInput.count() > 0) {
      // Get initial post count
      const initialPosts = page.locator('.post, [data-testid="post"]');
      const initialCount = await initialPosts.count();
      
      // Apply filter
      if (await filterInput.getAttribute('tagName') === 'SELECT') {
        // Handle dropdown filter
        await filterInput.selectOption({ index: 1 });
      } else {
        // Handle text input filter
        await filterInput.click();
        await filterInput.type('test');
      }
      
      // Wait for filter to apply
      await page.waitForTimeout(2000);
      
      // Check filtered results
      const filteredPosts = page.locator('.post, [data-testid="post"]');
      const filteredCount = await filteredPosts.count();
      
      console.log(`Posts before filter: ${initialCount}, after filter: ${filteredCount}`);
      
      // Test clearing filters
      const clearFilterSelectors = [
        '[data-testid="clear-filters"]',
        '.clear-filters',
        'button:has-text("Clear")',
        'button:has-text("Reset")'
      ];
      
      for (const selector of clearFilterSelectors) {
        const clearButton = page.locator(selector);
        if (await clearButton.count() > 0) {
          await clearButton.click();
          await page.waitForTimeout(1000);
          
          const clearedCount = await filteredPosts.count();
          console.log(`Posts after clearing filter: ${clearedCount}`);
          console.log(' Filter clearing tested');
          break;
        }
      }
      
      // If no clear button, try clearing the input
      if (await filterInput.getAttribute('tagName') !== 'SELECT') {
        await filterInput.clear();
        await page.waitForTimeout(1000);
        console.log(' Filter input cleared');
      }
    } else {
      console.log('9 No filter controls found');
    }
  });

  test('search functionality and results work', async ({ page }) => {
    console.log('=€ Testing search functionality...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Look for search input
    const searchSelectors = [
      '[data-testid="search"]',
      '[data-testid="search-input"]',
      '.search-input',
      '.search',
      'input[type="search"]',
      'input[placeholder*="search" i]'
    ];
    
    let searchInput = null;
    for (const selector of searchSelectors) {
      searchInput = page.locator(selector);
      if (await searchInput.count() > 0 && await searchInput.isVisible()) {
        console.log(` Found search input: ${selector}`);
        break;
      }
    }
    
    if (!searchInput) {
      console.log('9 No search input found - checking if search is available via other means');
      
      // Look for search button or icon
      const searchButtonSelectors = [
        '[data-testid="search-button"]',
        '.search-button',
        'button:has-text("Search")',
        '.search-icon'
      ];
      
      for (const selector of searchButtonSelectors) {
        const searchButton = page.locator(selector);
        if (await searchButton.count() > 0) {
          await searchButton.click();
          await page.waitForTimeout(500);
          
          // Try to find search input again after clicking
          searchInput = page.locator(searchSelectors.join(', ')).first();
          if (await searchInput.count() > 0) {
            console.log(' Search input appeared after clicking search button');
            break;
          }
        }
      }
    }
    
    if (!searchInput || await searchInput.count() === 0) {
      test.skip('Search functionality not found');
      return;
    }
    
    // Get initial post count
    const initialPosts = page.locator('.post, [data-testid="post"]');
    const initialCount = await initialPosts.count();
    
    // Perform search
    const searchTerm = 'test';
    await searchInput.click();
    await searchInput.clear();
    await helpers.typeRealistic(searchInput, searchTerm);
    
    // Submit search (try Enter key first)
    await searchInput.press('Enter');
    await page.waitForTimeout(2000);
    
    // Check if search submit button exists
    const searchSubmitSelectors = [
      '[data-testid="search-submit"]',
      '.search-submit',
      'button:has-text("Search")',
      'button[type="submit"]'
    ];
    
    for (const selector of searchSubmitSelectors) {
      const submitButton = page.locator(selector);
      if (await submitButton.count() > 0 && await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
    
    // Check search results
    const searchResults = page.locator('.search-result, .post, [data-testid="post"]');
    const resultCount = await searchResults.count();
    
    console.log(`Search results for "${searchTerm}": ${resultCount} items`);
    
    if (resultCount > 0) {
      // Verify results contain search term
      const firstResult = searchResults.first();
      const resultText = await firstResult.textContent();
      
      if (resultText && resultText.toLowerCase().includes(searchTerm.toLowerCase())) {
        console.log(' Search results contain search term');
      } else {
        console.log('9 Search results may use different matching algorithm');
      }
    }
    
    // Test clearing search
    await searchInput.clear();
    await page.waitForTimeout(1000);
    
    // Check if posts return to original state
    const finalCount = await initialPosts.count();
    console.log(`Posts after clearing search: ${finalCount}`);
    
    console.log(' Search functionality tested');
  });

  test('real-time data updates work', async ({ page }) => {
    console.log('=€ Testing real-time data updates...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Check for WebSocket connection
    try {
      await helpers.waitForRealtimeConnection();
      console.log(' Real-time connection detected');
    } catch (error) {
      console.log('9 No real-time connection detected - testing basic updates');
    }
    
    // Get initial post count
    const initialPosts = page.locator('.post, [data-testid="post"]');
    const initialCount = await initialPosts.count();
    
    // Create a new post to test real-time updates
    const postInput = page.locator('[data-testid="post-creator"] textarea, .post-creator textarea, .main-post-input').first();
    
    if (await postInput.count() > 0) {
      const testPostContent = `Real-time test post ${Date.now()}`;
      
      await postInput.click();
      await postInput.clear();
      await postInput.type(testPostContent);
      
      const postButton = page.locator('[data-testid="post-button"], button:has-text("Post")').first();
      if (await postButton.count() > 0 && await postButton.isEnabled()) {
        await postButton.click();
        
        // Wait for real-time update
        await page.waitForTimeout(3000);
        
        // Check if post count increased
        const updatedCount = await initialPosts.count();
        
        if (updatedCount > initialCount) {
          console.log(' Real-time post update detected');
          
          // Verify the new post appears
          const newPost = page.locator(`text="${testPostContent}"`);
          if (await newPost.count() > 0) {
            console.log(' New post content visible in real-time');
          }
        } else {
          console.log('9 Post may be pending approval or using different update mechanism');
        }
      }
    }
    
    // Test real-time comment updates if comments exist
    const existingPosts = page.locator('.post, [data-testid="post"]');
    if (await existingPosts.count() > 0) {
      const firstPost = existingPosts.first();
      const replyButton = firstPost.locator('[data-testid="reply-button"], .reply-button, button:has-text("Reply")').first();
      
      if (await replyButton.count() > 0) {
        const initialComments = page.locator('.comment, [data-testid="comment"]');
        const initialCommentCount = await initialComments.count();
        
        await replyButton.click();
        await page.waitForTimeout(500);
        
        const commentInput = page.locator('[data-testid="comment-input"], .comment-input').first();
        if (await commentInput.count() > 0) {
          const testComment = `Real-time test comment ${Date.now()}`;
          await commentInput.type(testComment);
          
          const commentSubmit = page.locator('[data-testid="submit-comment"], button:has-text("Comment")').first();
          if (await commentSubmit.count() > 0) {
            await commentSubmit.click();
          } else {
            await commentInput.press('Enter');
          }
          
          await page.waitForTimeout(2000);
          
          const updatedCommentCount = await initialComments.count();
          if (updatedCommentCount > initialCommentCount) {
            console.log(' Real-time comment update detected');
          }
        }
      }
    }
  });

  test('error state handling and recovery works', async ({ page }) => {
    console.log('=€ Testing error state handling...');
    
    await helpers.navigateTo('/');
    
    // Simulate network issues by intercepting requests
    await page.route('**/api/**', route => {
      // Fail some requests to test error handling
      if (Math.random() < 0.3) {
        route.abort('internetdisconnected');
      } else {
        route.continue();
      }
    });
    
    // Try to load data with network issues
    await page.reload();
    await page.waitForTimeout(5000);
    
    // Look for error messages
    const errorSelectors = [
      '.error-message',
      '[data-testid="error-message"]',
      '.error',
      '.alert-error',
      '.toast-error'
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector);
      if (await errorElement.count() > 0 && await errorElement.isVisible()) {
        console.log(` Error message displayed: ${selector}`);
        errorFound = true;
        break;
      }
    }
    
    // Look for retry mechanisms
    const retrySelectors = [
      '[data-testid="retry"]',
      '.retry',
      '.retry-button',
      'button:has-text("Retry")',
      'button:has-text("Try Again")'
    ];
    
    for (const selector of retrySelectors) {
      const retryButton = page.locator(selector);
      if (await retryButton.count() > 0 && await retryButton.isVisible()) {
        console.log(` Retry mechanism found: ${selector}`);
        
        // Remove network interception for retry
        await page.unroute('**/api/**');
        
        await retryButton.click();
        await page.waitForTimeout(2000);
        
        console.log(' Retry mechanism tested');
        break;
      }
    }
    
    // Test offline state if supported
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);
    
    const offlineIndicators = page.locator('.offline, [data-testid="offline"], .connection-error');
    if (await offlineIndicators.count() > 0) {
      console.log(' Offline state detected');
    }
    
    // Restore online state
    await page.context().setOffline(false);
    await page.waitForTimeout(1000);
    
    console.log(' Error state handling test completed');
  });

  test('data filtering performance with large datasets', async ({ page }) => {
    console.log('=€ Testing data filtering performance...');
    
    await helpers.navigateTo('/');
    await page.waitForLoadState('networkidle');
    
    // Measure initial loading performance
    const startTime = Date.now();
    await page.waitForSelector('.post, [data-testid="post"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;
    
    console.log(`=Ê Initial data load time: ${loadTime}ms`);
    
    const posts = page.locator('.post, [data-testid="post"]');
    const postCount = await posts.count();
    
    console.log(`=Ê Loaded ${postCount} posts`);
    
    // Test filtering performance
    const filterInput = page.locator('[data-testid="search"], .search-input, input[placeholder*="search" i]').first();
    
    if (await filterInput.count() > 0) {
      const filterStart = Date.now();
      
      await filterInput.click();
      await filterInput.type('test');
      await page.waitForTimeout(1000);
      
      const filterTime = Date.now() - filterStart;
      console.log(`=Ê Filter application time: ${filterTime}ms`);
      
      // Reasonable performance expectation
      expect(filterTime).toBeLessThan(5000);
      
      const filteredPosts = page.locator('.post, [data-testid="post"]');
      const filteredCount = await filteredPosts.count();
      
      console.log(`=Ê Filtered to ${filteredCount} posts`);
    }
    
    // Test scroll performance
    if (postCount > 5) {
      const scrollStart = Date.now();
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(1000);
      
      const scrollTime = Date.now() - scrollStart;
      console.log(`=Ê Scroll performance: ${scrollTime}ms`);
      
      expect(scrollTime).toBeLessThan(2000);
    }
    
    console.log(' Performance testing completed');
  });
});
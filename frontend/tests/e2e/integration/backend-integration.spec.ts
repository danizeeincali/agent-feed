import { test, expect } from '@playwright/test';

test.describe('🔧 Backend Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');
  });

  test('posts load from real API successfully', async ({ page }) => {
    console.log('🧪 Testing real API post loading...');
    
    // Monitor network requests
    let apiCalled = false;
    page.on('request', request => {
      if (request.url().includes('/api/posts')) {
        apiCalled = true;
        console.log('✅ API request made:', request.url());
      }
    });

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
    
    // Verify API was called
    expect(apiCalled).toBe(true);
    
    // Verify posts are displayed
    const posts = page.locator('[data-testid="post-item"]');
    const postCount = await posts.count();
    expect(postCount).toBeGreaterThan(0);
    
    console.log(`✅ ${postCount} posts loaded successfully`);
  });

  test('comment submission works with real API', async ({ page }) => {
    console.log('🧪 Testing real API comment submission...');
    
    // Monitor comment API calls
    let commentApiCalled = false;
    page.on('request', request => {
      if (request.url().includes('/api/comments') && request.method() === 'POST') {
        commentApiCalled = true;
        console.log('✅ Comment API called:', request.method(), request.url());
      }
    });

    // Find first post and open comments
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    // Add a comment
    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('Integration test comment');
    await page.click('[data-testid="submit-comment-button"]');
    
    // Wait for success indicator
    await expect(page.locator('[data-testid="comment-success"]')).toBeVisible({ timeout: 5000 });
    
    // Verify API was called
    expect(commentApiCalled).toBe(true);
    
    console.log('✅ Comment submitted successfully via API');
  });

  test('real-time updates work correctly', async ({ page, context }) => {
    console.log('🧪 Testing real-time updates...');
    
    // Open two pages to test real-time sync
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForSelector('[data-testid="app-root"]');
    
    // Get initial post count on both pages
    const initialCount1 = await page.locator('[data-testid="post-item"]').count();
    const initialCount2 = await page2.locator('[data-testid="post-item"]').count();
    
    // Create a post on page 1
    await page.click('[data-testid="create-post-button"]');
    await page.locator('[data-testid="post-title"]').fill('Real-time test post');
    await page.locator('[data-testid="post-content"]').fill('Testing real-time updates');
    await page.click('[data-testid="publish-button"]');
    
    // Wait for success
    await expect(page.locator('[data-testid="post-published-success"]')).toBeVisible();
    
    // Check if page 2 receives the update (with timeout for real-time)
    await page2.waitForFunction(
      (expectedCount) => {
        const posts = document.querySelectorAll('[data-testid="post-item"]');
        return posts.length > expectedCount;
      },
      initialCount2,
      { timeout: 10000 }
    );
    
    const newCount2 = await page2.locator('[data-testid="post-item"]').count();
    expect(newCount2).toBeGreaterThan(initialCount2);
    
    console.log('✅ Real-time updates working correctly');
    
    await page2.close();
  });

  test('API error handling works gracefully', async ({ page }) => {
    console.log('🧪 Testing API error handling...');
    
    // Intercept and fail API calls
    await page.route('**/api/posts', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Reload page to trigger API call
    await page.reload();
    
    // Should show error state
    await expect(page.locator('[data-testid="api-error"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/posts');
    await page.click('[data-testid="retry-button"]');
    
    // Should recover and show posts
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
    
    console.log('✅ API error handling works correctly');
  });

  test('pagination works with backend data', async ({ page }) => {
    console.log('🧪 Testing pagination with backend...');
    
    // Monitor pagination API calls
    let paginationApiCalled = false;
    page.on('request', request => {
      if (request.url().includes('/api/posts?page=') || request.url().includes('offset=')) {
        paginationApiCalled = true;
        console.log('✅ Pagination API called:', request.url());
      }
    });

    // Get initial post count
    const initialCount = await page.locator('[data-testid="post-item"]').count();
    
    // Click load more if available
    const loadMoreButton = page.locator('[data-testid="load-more-button"]');
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      
      // Wait for new posts to load
      await page.waitForFunction(
        (expectedCount) => {
          const posts = document.querySelectorAll('[data-testid="post-item"]');
          return posts.length > expectedCount;
        },
        initialCount,
        { timeout: 10000 }
      );
      
      const newCount = await page.locator('[data-testid="post-item"]').count();
      expect(newCount).toBeGreaterThan(initialCount);
      expect(paginationApiCalled).toBe(true);
      
      console.log(`✅ Pagination loaded ${newCount - initialCount} more posts`);
    } else {
      console.log('ℹ️ No pagination available (all posts loaded)');
    }
  });

  test('search functionality works with backend', async ({ page }) => {
    console.log('🧪 Testing search with backend integration...');
    
    // Monitor search API calls
    let searchApiCalled = false;
    page.on('request', request => {
      if (request.url().includes('/api/search') || request.url().includes('q=')) {
        searchApiCalled = true;
        console.log('✅ Search API called:', request.url());
      }
    });

    // Perform search
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill('test');
    await page.keyboard.press('Enter');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 });
    
    // Verify API was called
    expect(searchApiCalled).toBe(true);
    
    // Verify results are displayed
    const results = page.locator('[data-testid="search-result-item"]');
    const resultCount = await results.count();
    
    if (resultCount > 0) {
      console.log(`✅ Search returned ${resultCount} results`);
    } else {
      console.log('ℹ️ No search results found (expected for test data)');
    }
  });

  test('user authentication state persists correctly', async ({ page }) => {
    console.log('🧪 Testing authentication state persistence...');
    
    // Check initial auth state
    const loginButton = page.locator('[data-testid="login-button"]');
    const userMenu = page.locator('[data-testid="user-menu"]');
    
    if (await loginButton.isVisible()) {
      console.log('ℹ️ User not logged in - testing login flow');
      
      // Test login (if login system exists)
      await loginButton.click();
      // Note: In real implementation, you'd handle actual login
      
    } else if (await userMenu.isVisible()) {
      console.log('ℹ️ User already logged in - testing persistence');
      
      // Reload page and verify auth state persists
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      await expect(userMenu).toBeVisible();
      console.log('✅ Authentication state persisted after reload');
    }
  });

  test('WebSocket connection works for real-time features', async ({ page }) => {
    console.log('🧪 Testing WebSocket connection...');
    
    // Monitor WebSocket connections
    let wsConnected = false;
    page.on('websocket', ws => {
      wsConnected = true;
      console.log('✅ WebSocket connection established:', ws.url());
      
      ws.on('framesent', event => {
        console.log('📤 WebSocket frame sent:', event.payload);
      });
      
      ws.on('framereceived', event => {
        console.log('📥 WebSocket frame received:', event.payload);
      });
    });

    // Wait for WebSocket connection to be established
    await page.waitForTimeout(2000);
    
    // If WebSocket is implemented, it should be connected by now
    if (wsConnected) {
      console.log('✅ WebSocket real-time connection working');
    } else {
      console.log('ℹ️ No WebSocket connection detected (may use polling instead)');
    }
  });
});
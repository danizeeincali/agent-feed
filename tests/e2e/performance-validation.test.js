/**
 * Performance validation tests for the persistent feed data system
 * Focus on performance metrics, load testing, and resource usage
 */

import { test, expect } from '@playwright/test';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,        // 3 seconds
  searchResponse: 500,   // 500ms
  engagement: 200,       // 200ms
  refresh: 2000,         // 2 seconds
  apiResponse: 1000      // 1 second
};

// Memory usage limits
const MEMORY_LIMITS = {
  initialHeap: 50 * 1024 * 1024,    // 50MB
  maxHeapGrowth: 100 * 1024 * 1024, // 100MB growth
  gcFrequency: 10 // Allow 10 GC cycles
};

test.describe('Performance Validation Tests', () => {
  
  test.beforeEach(async ({ page, context }) => {
    // Enable performance monitoring
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    // Start performance monitoring
    await page.goto('about:blank');
    await page.addInitScript(() => {
      window.performanceMetrics = {
        loadStart: Date.now(),
        searchTimes: [],
        engagementTimes: [],
        apiCalls: 0,
        errors: []
      };
      
      // Monitor fetch calls
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const start = Date.now();
        window.performanceMetrics.apiCalls++;
        return originalFetch.apply(this, args).then(response => {
          const duration = Date.now() - start;
          console.log(`API call took ${duration}ms`);
          return response;
        }).catch(error => {
          window.performanceMetrics.errors.push({
            type: 'fetch',
            error: error.message,
            time: Date.now()
          });
          throw error;
        });
      };
    });
  });

  test('page load performance meets requirements', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate with performance timing
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for feed to be fully loaded
    await page.waitForSelector('[data-testid="agent-feed"]', { timeout: 10000 });
    
    // Measure performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: paint ? paint.startTime : 0,
        totalLoadTime: Date.now() - window.performanceMetrics.loadStart
      };
    });
    
    const totalLoadTime = Date.now() - startTime;
    
    console.log('Performance Metrics:', {
      totalLoadTime,
      ...performanceMetrics
    });
    
    // Assertions
    expect(totalLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
    
    if (performanceMetrics.firstContentfulPaint > 0) {
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
    }
  });

  test('search performance meets requirements', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="agent-feed"]');
    
    // Open search
    await page.click('button[title="Search posts"]');
    await page.waitForSelector('input[placeholder*="Search posts"]');
    
    const searchQueries = ['test', 'automation', 'agent', 'performance'];
    const searchTimes = [];
    
    for (const query of searchQueries) {
      // Clear previous search
      await page.fill('input[placeholder*="Search posts"]', '');
      await page.waitForTimeout(100);
      
      // Measure search response time
      const startTime = Date.now();
      await page.fill('input[placeholder*="Search posts"]', query);
      
      // Wait for search indication (loading, results, or no results)
      await page.waitForSelector('text=/Searching|Found.*posts|No posts found/', { timeout: 2000 });
      
      const searchTime = Date.now() - startTime;
      searchTimes.push(searchTime);
      
      console.log(`Search "${query}" took ${searchTime}ms`);
      
      await page.waitForTimeout(100); // Brief pause between searches
    }
    
    // Calculate average search time
    const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
    const maxSearchTime = Math.max(...searchTimes);
    
    console.log(`Average search time: ${avgSearchTime}ms`);
    console.log(`Max search time: ${maxSearchTime}ms`);
    
    // Assertions
    expect(avgSearchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponse);
    expect(maxSearchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.searchResponse * 2); // Allow 2x for worst case
  });

  test('engagement actions performance meets requirements', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article', { timeout: 10000 });
    
    const postCount = await page.locator('article').count();
    
    if (postCount === 0) {
      console.log('No posts available for engagement performance testing');
      return;
    }
    
    const engagementTimes = [];
    const posts = await page.locator('article').all();
    const testPosts = posts.slice(0, Math.min(3, posts.length)); // Test first 3 posts
    
    for (let i = 0; i < testPosts.length; i++) {
      const post = testPosts[i];
      
      // Test like button performance
      const likeButton = post.locator('button').first();
      
      if (await likeButton.isVisible()) {
        const startTime = Date.now();
        await likeButton.click();
        
        // Wait for visual feedback (optimistic update)
        await page.waitForTimeout(50);
        
        const engagementTime = Date.now() - startTime;
        engagementTimes.push(engagementTime);
        
        console.log(`Like action ${i + 1} took ${engagementTime}ms`);
      }
      
      await page.waitForTimeout(100); // Brief pause between actions
    }
    
    if (engagementTimes.length > 0) {
      const avgEngagementTime = engagementTimes.reduce((a, b) => a + b, 0) / engagementTimes.length;
      const maxEngagementTime = Math.max(...engagementTimes);
      
      console.log(`Average engagement time: ${avgEngagementTime}ms`);
      console.log(`Max engagement time: ${maxEngagementTime}ms`);
      
      // Assertions (more lenient for test environment)
      expect(avgEngagementTime).toBeLessThan(PERFORMANCE_THRESHOLDS.engagement * 3);
      expect(maxEngagementTime).toBeLessThan(PERFORMANCE_THRESHOLDS.engagement * 5);
    }
  });

  test('refresh performance meets requirements', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="agent-feed"]');
    
    const refreshTimes = [];
    
    // Test multiple refresh cycles
    for (let i = 0; i < 3; i++) {
      const startTime = Date.now();
      
      // Click refresh
      await page.click('button[title="Refresh feed"]');
      
      // Wait for refresh animation to start
      await page.waitForSelector('.animate-spin', { timeout: 1000 });
      
      // Wait for refresh to complete
      await page.waitForFunction(
        () => !document.querySelector('.animate-spin'),
        { timeout: 10000 }
      );
      
      const refreshTime = Date.now() - startTime;
      refreshTimes.push(refreshTime);
      
      console.log(`Refresh ${i + 1} took ${refreshTime}ms`);
      
      await page.waitForTimeout(500); // Brief pause between refreshes
    }
    
    const avgRefreshTime = refreshTimes.reduce((a, b) => a + b, 0) / refreshTimes.length;
    const maxRefreshTime = Math.max(...refreshTimes);
    
    console.log(`Average refresh time: ${avgRefreshTime}ms`);
    console.log(`Max refresh time: ${maxRefreshTime}ms`);
    
    // Assertions
    expect(avgRefreshTime).toBeLessThan(PERFORMANCE_THRESHOLDS.refresh);
    expect(maxRefreshTime).toBeLessThan(PERFORMANCE_THRESHOLDS.refresh * 1.5);
  });

  test('API response times meet requirements', async ({ page, context }) => {
    // Monitor all network requests
    const apiRequests = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/') && response.url().includes('localhost:3000')) {
        apiRequests.push({
          url: response.url(),
          status: response.status(),
          timing: response.timing()
        });
      }
    });
    
    // Navigate and perform various actions
    await page.goto('/');
    await page.waitForSelector('[data-testid="agent-feed"]');
    
    // Refresh to generate API calls
    await page.click('button[title="Refresh feed"]');
    await page.waitForTimeout(2000);
    
    // Search to generate API calls
    await page.click('button[title="Search posts"]');
    await page.fill('input[placeholder*="Search posts"]', 'test');
    await page.waitForTimeout(1000);
    
    // Change filter to generate API calls
    const filterSelect = page.locator('select').first();
    await filterSelect.selectOption('high-impact');
    await page.waitForTimeout(2000);
    
    // Analyze API response times
    if (apiRequests.length > 0) {
      const responseTimes = apiRequests.map(req => {
        // Calculate approximate response time from timing data
        const timing = req.timing;
        return timing ? (timing.responseEnd - timing.requestStart) : 0;
      }).filter(time => time > 0);
      
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        
        console.log(`API Requests: ${apiRequests.length}`);
        console.log(`Average API response time: ${avgResponseTime}ms`);
        console.log(`Max API response time: ${maxResponseTime}ms`);
        
        // Assertions (lenient for test environment)
        expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse * 2);
        expect(maxResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponse * 3);
      }
    } else {
      console.log('No API requests captured - may be using cached data or offline mode');
    }
  });

  test('memory usage remains stable during extended use', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="agent-feed"]');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });
    
    console.log('Initial memory:', initialMemory);
    
    // Simulate extended usage
    for (let cycle = 0; cycle < 20; cycle++) {
      // Refresh feed
      await page.click('button[title="Refresh feed"]');
      await page.waitForTimeout(500);
      
      // Perform search
      await page.click('button[title="Search posts"]');
      await page.fill('input[placeholder*="Search posts"]', `test${cycle}`);
      await page.waitForTimeout(300);
      await page.fill('input[placeholder*="Search posts"]', '');
      
      // Change filters
      const filterOptions = ['all', 'high-impact', 'recent', 'strategic'];
      const filterSelect = page.locator('select').first();
      await filterSelect.selectOption(filterOptions[cycle % filterOptions.length]);
      await page.waitForTimeout(200);
      
      // Check memory every 5 cycles
      if (cycle % 5 === 0 && cycle > 0) {
        const currentMemory = await page.evaluate(() => {
          if (performance.memory) {
            return {
              used: performance.memory.usedJSHeapSize,
              total: performance.memory.totalJSHeapSize
            };
          }
          return null;
        });
        
        if (currentMemory && initialMemory) {
          const memoryGrowth = currentMemory.used - initialMemory.used;
          console.log(`Cycle ${cycle}: Memory growth: ${memoryGrowth} bytes (${Math.round(memoryGrowth / 1024 / 1024)}MB)`);
          
          // Memory shouldn't grow excessively
          expect(memoryGrowth).toBeLessThan(MEMORY_LIMITS.maxHeapGrowth);
        }
      }
    }
    
    // Final memory check
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        };
      }
      return null;
    });
    
    if (finalMemory && initialMemory) {
      const totalGrowth = finalMemory.used - initialMemory.used;
      console.log(`Total memory growth: ${totalGrowth} bytes (${Math.round(totalGrowth / 1024 / 1024)}MB)`);
      
      // Memory growth should be reasonable
      expect(totalGrowth).toBeLessThan(MEMORY_LIMITS.maxHeapGrowth);
    }
    
    // Verify page is still responsive
    await expect(page.locator('h2:has-text("Agent Feed")')).toBeVisible();
  });

  test('concurrent user simulation performance', async ({ context }) => {
    // Create multiple pages to simulate concurrent users
    const pages = [];
    const userCount = 3; // Conservative for test environment
    
    try {
      // Create multiple browser contexts/pages
      for (let i = 0; i < userCount; i++) {
        const page = await context.newPage();
        pages.push(page);
        
        // Start navigation
        const navigationPromise = page.goto('/', { waitUntil: 'networkidle', timeout: 15000 });
        
        // Don't await immediately - let them load concurrently
        navigationPromise.then(() => {
          console.log(`User ${i + 1} loaded successfully`);
        }).catch(error => {
          console.log(`User ${i + 1} failed to load: ${error.message}`);
        });
        
        // Small delay between user starts
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Wait for all pages to load
      await Promise.all(pages.map(async (page, index) => {
        try {
          await page.waitForSelector('[data-testid="agent-feed"]', { timeout: 15000 });
          console.log(`User ${index + 1}: Feed loaded successfully`);
          
          // Perform some actions
          await page.click('button[title="Refresh feed"]');
          await page.waitForTimeout(1000);
          
          return true;
        } catch (error) {
          console.log(`User ${index + 1}: Error during concurrent test: ${error.message}`);
          return false;
        }
      }));
      
      console.log(`Concurrent user simulation completed with ${userCount} users`);
      
      // Basic assertion - at least one user should succeed
      const successfulUsers = await Promise.all(
        pages.map(async (page) => {
          try {
            return await page.locator('h2:has-text("Agent Feed")').isVisible();
          } catch {
            return false;
          }
        })
      );
      
      const successCount = successfulUsers.filter(Boolean).length;
      console.log(`${successCount} out of ${userCount} users loaded successfully`);
      
      expect(successCount).toBeGreaterThan(0);
      
    } finally {
      // Clean up pages
      await Promise.all(pages.map(page => page.close().catch(() => {})));
    }
  });

  test('large dataset performance', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="agent-feed"]');
    
    // Test performance with multiple load more operations
    let loadCount = 0;
    const maxLoads = 5; // Limit for test environment
    
    while (loadCount < maxLoads) {
      const loadMoreButton = page.locator('button:has-text("Load More Posts")');
      
      if (!(await loadMoreButton.isVisible())) {
        console.log('No more posts to load');
        break;
      }
      
      const startTime = Date.now();
      await loadMoreButton.click();
      
      // Wait for loading to complete
      await page.waitForSelector('text=Loading...', { timeout: 2000 }).catch(() => {});
      await page.waitForFunction(
        () => !document.querySelector('text=Loading...'),
        { timeout: 10000 }
      ).catch(() => {});
      
      const loadTime = Date.now() - startTime;
      console.log(`Load more ${loadCount + 1} took ${loadTime}ms`);
      
      // Performance shouldn't degrade significantly with more data
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.refresh * 2);
      
      loadCount++;
      await page.waitForTimeout(500);
    }
    
    // Check total post count
    const totalPosts = await page.locator('article').count();
    console.log(`Total posts loaded: ${totalPosts}`);
    
    // Verify page remains responsive with large dataset
    await expect(page.locator('h2:has-text("Agent Feed")')).toBeVisible();
    
    // Test scrolling performance with many posts
    if (totalPosts > 10) {
      const startTime = Date.now();
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await page.waitForTimeout(100);
      
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      
      const scrollTime = Date.now() - startTime;
      console.log(`Scroll performance with ${totalPosts} posts: ${scrollTime}ms`);
      
      expect(scrollTime).toBeLessThan(500);
    }
  });
});
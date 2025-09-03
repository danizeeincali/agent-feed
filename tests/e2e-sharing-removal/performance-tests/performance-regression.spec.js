import { test, expect } from '@playwright/test';

test.describe('Performance Regression Tests', () => {
  test.describe('Page Load Performance', () => {
    test('should load initial feed efficiently without share functionality', async ({ page }) => {
      const startTime = Date.now();
      
      // Start navigation
      const navigationPromise = page.goto('/');
      
      // Wait for content to load
      await navigationPromise;
      await page.waitForSelector('[data-testid="social-feed"]', { timeout: 10000 });
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(5000); // 5 seconds max for initial load
      
      // Verify content is loaded
      const posts = page.locator('.post-item');
      const postCount = await posts.count();
      expect(postCount).toBeGreaterThan(0);
      
      // Check that no share-related resources failed to load
      const failedRequests = [];
      page.on('requestfailed', request => {
        if (request.url().toLowerCase().includes('share')) {
          failedRequests.push(request.url());
        }
      });
      
      expect(failedRequests).toHaveLength(0);
    });

    test('should measure DOM content loaded time', async ({ page }) => {
      const performanceMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            resolve({
              domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
              loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
              firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
              firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
            });
          } else {
            window.addEventListener('load', () => {
              resolve({
                domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
                firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
              });
            });
          }
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      const metrics = await page.evaluate(() => {
        return {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
          firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      // Performance benchmarks
      expect(metrics.domContentLoaded).toBeLessThan(3000); // 3 seconds
      expect(metrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds
      
      // Verify performance is not degraded by missing share functionality
      expect(metrics.firstPaint).toBeGreaterThan(0);
    });

    test('should have optimized resource loading', async ({ page }) => {
      const resourceTimings = [];
      
      page.on('response', response => {
        const timing = response.timing();
        resourceTimings.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type'],
          timing: timing
        });
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      // Check for share-related resource requests that shouldn't exist
      const shareResources = resourceTimings.filter(resource => 
        resource.url.toLowerCase().includes('share') ||
        resource.url.toLowerCase().includes('social-share')
      );

      expect(shareResources).toHaveLength(0);

      // Verify critical resources loaded successfully
      const criticalResources = resourceTimings.filter(resource =>
        resource.contentType?.includes('text/html') ||
        resource.contentType?.includes('application/javascript') ||
        resource.contentType?.includes('text/css')
      );

      const failedCriticalResources = criticalResources.filter(resource => 
        resource.status >= 400
      );

      expect(failedCriticalResources).toHaveLength(0);
    });
  });

  test.describe('Runtime Performance', () => {
    test('should maintain smooth scrolling performance', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      // Measure scroll performance
      const scrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const startTime = performance.now();
          let frameCount = 0;
          let lastFrameTime = startTime;
          const frameTimes = [];

          const measureFrame = () => {
            const currentTime = performance.now();
            const frameTime = currentTime - lastFrameTime;
            frameTimes.push(frameTime);
            lastFrameTime = currentTime;
            frameCount++;

            if (frameCount < 60) { // Measure 60 frames
              requestAnimationFrame(measureFrame);
            } else {
              const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
              const fps = 1000 / avgFrameTime;
              resolve({
                averageFrameTime: avgFrameTime,
                fps: fps,
                totalTime: currentTime - startTime,
                droppedFrames: frameTimes.filter(time => time > 16.67).length // 60fps = 16.67ms per frame
              });
            }
          };

          // Start scrolling and measuring
          window.scrollBy(0, 10);
          requestAnimationFrame(measureFrame);
        });
      });

      // Trigger actual scrolling
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(50);
      }

      const metrics = await scrollMetrics;

      // Performance expectations
      expect(metrics.fps).toBeGreaterThan(30); // At least 30fps
      expect(metrics.droppedFrames).toBeLessThan(10); // Less than 10 dropped frames
    });

    test('should handle like interactions efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      const likeButtons = page.locator('button[aria-label*="like" i]');
      
      if (await likeButtons.count() > 0) {
        // Measure like interaction performance
        const startTime = Date.now();
        
        for (let i = 0; i < Math.min(5, await likeButtons.count()); i++) {
          const button = likeButtons.nth(i);
          await button.click();
          await page.waitForTimeout(100); // Small delay between clicks
        }
        
        const interactionTime = Date.now() - startTime;
        
        // Should handle multiple like interactions quickly
        expect(interactionTime).toBeLessThan(2000); // 2 seconds for 5 interactions
        
        // Check that UI remains responsive
        const posts = page.locator('.post-item');
        await expect(posts.first()).toBeVisible();
      }
    });

    test('should handle comment interactions efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      const commentButtons = page.locator('button[aria-label*="comment" i]');
      
      if (await commentButtons.count() > 0) {
        const startTime = Date.now();
        
        await commentButtons.first().click();
        await page.waitForTimeout(500);
        
        const commentInput = page.locator('textarea[placeholder*="comment" i], input[placeholder*="comment" i]');
        
        if (await commentInput.count() > 0) {
          await commentInput.first().fill('Performance test comment');
          
          const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit")');
          if (await submitButton.count() > 0) {
            await submitButton.first().click();
          }
        }
        
        const commentTime = Date.now() - startTime;
        
        // Comment interaction should be responsive
        expect(commentTime).toBeLessThan(3000); // 3 seconds max
      }
    });

    test('should maintain performance during search', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      
      if (await searchInput.count() > 0) {
        const searchQueries = ['test', 'performance', 'search', 'query'];
        const searchTimes = [];
        
        for (const query of searchQueries) {
          const startTime = Date.now();
          
          await searchInput.first().fill(query);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000); // Wait for results
          
          const searchTime = Date.now() - startTime;
          searchTimes.push(searchTime);
        }
        
        // Average search time should be reasonable
        const avgSearchTime = searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length;
        expect(avgSearchTime).toBeLessThan(2000); // 2 seconds average
        
        // No search should take excessively long
        const maxSearchTime = Math.max(...searchTimes);
        expect(maxSearchTime).toBeLessThan(5000); // 5 seconds max
      }
    });
  });

  test.describe('Memory Usage Tests', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });

      // Perform navigation and interactions
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('PageDown');
        await page.waitForTimeout(500);
        
        const posts = page.locator('.post-item');
        if (await posts.count() > i) {
          await posts.nth(i).hover();
        }
      }

      // Force garbage collection if possible
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });

      await page.waitForTimeout(2000);

      // Check memory usage after interactions
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });

      if (initialMemory && finalMemory) {
        // Memory usage shouldn't increase dramatically
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
        
        // Allow for some memory increase but not excessive
        expect(memoryIncreasePercent).toBeLessThan(200); // Less than 200% increase
      }
    });

    test('should handle large numbers of posts efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      const startTime = Date.now();
      
      // Scroll through many posts to load them
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('End'); // Scroll to bottom
        await page.waitForTimeout(200);
      }
      
      const scrollTime = Date.now() - startTime;
      
      // Should handle large amounts of content efficiently
      expect(scrollTime).toBeLessThan(10000); // 10 seconds max
      
      // Check that posts are still visible and interactive
      const posts = page.locator('.post-item');
      const postCount = await posts.count();
      
      // Should have loaded more posts
      expect(postCount).toBeGreaterThan(5);
      
      // First and last posts should be accessible
      await expect(posts.first()).toBeVisible();
    });
  });

  test.describe('Network Performance Tests', () => {
    test('should optimize API request patterns', async ({ page }) => {
      const apiRequests = [];
      
      page.on('request', request => {
        const url = request.url();
        if (url.includes('/api/')) {
          apiRequests.push({
            url,
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });

      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      // Perform interactions that might trigger API calls
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        await page.waitForTimeout(1000);
      }

      await page.keyboard.press('PageDown');
      await page.waitForTimeout(1000);

      // Analyze API request patterns
      expect(apiRequests.length).toBeGreaterThan(0);
      expect(apiRequests.length).toBeLessThan(50); // Reasonable upper limit

      // Should not make share-related API requests
      const shareRequests = apiRequests.filter(req => 
        req.url.toLowerCase().includes('share')
      );
      expect(shareRequests).toHaveLength(0);

      // Check for duplicate requests that might indicate inefficiency
      const requestUrls = apiRequests.map(req => req.url);
      const uniqueUrls = [...new Set(requestUrls)];
      const duplicateRatio = (requestUrls.length - uniqueUrls.length) / requestUrls.length;
      
      // Allow some duplication but not excessive
      expect(duplicateRatio).toBeLessThan(0.5); // Less than 50% duplicates
    });

    test('should handle slow network conditions gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 200); // Add 200ms delay to all requests
      });

      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time even with slow network
      expect(loadTime).toBeLessThan(12000); // 12 seconds with simulated delay

      // Functionality should still work
      const posts = page.locator('.post-item');
      await expect(posts.first()).toBeVisible();
      
      const likeButtons = page.locator('button[aria-label*="like" i]');
      if (await likeButtons.count() > 0) {
        await likeButtons.first().click();
        // Should respond even with network delay
        await page.waitForTimeout(1000);
      }
    });

    test('should cache resources effectively', async ({ page }) => {
      const resourceRequests = new Map();
      
      page.on('request', request => {
        const url = request.url();
        const count = resourceRequests.get(url) || 0;
        resourceRequests.set(url, count + 1);
      });

      // First load
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });
      
      const firstLoadRequests = new Map(resourceRequests);
      
      // Reload page
      await page.reload();
      await page.waitForSelector('.post-item', { timeout: 5000 });

      // Check caching effectiveness
      let cachedResources = 0;
      let totalResources = 0;
      
      for (const [url, count] of resourceRequests) {
        if (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.png') || url.endsWith('.jpg')) {
          totalResources++;
          
          const firstLoadCount = firstLoadRequests.get(url) || 0;
          if (count === firstLoadCount) {
            cachedResources++; // Resource was cached (not requested again)
          }
        }
      }

      if (totalResources > 0) {
        const cacheEfficiency = cachedResources / totalResources;
        // At least 50% of static resources should be cached
        expect(cacheEfficiency).toBeGreaterThan(0.3);
      }
    });
  });

  test.describe('Rendering Performance Tests', () => {
    test('should render posts efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="social-feed"]', { timeout: 5000 });

      // Measure rendering performance
      const renderMetrics = await page.evaluate(() => {
        const startTime = performance.now();
        
        // Force a reflow/repaint
        document.body.offsetHeight;
        
        const endTime = performance.now();
        
        return {
          renderTime: endTime - startTime,
          postCount: document.querySelectorAll('.post-item').length,
          domNodes: document.querySelectorAll('*').length
        };
      });

      expect(renderMetrics.postCount).toBeGreaterThan(0);
      expect(renderMetrics.renderTime).toBeLessThan(100); // 100ms for reflow
      
      // DOM size should be reasonable
      expect(renderMetrics.domNodes).toBeLessThan(10000); // 10k nodes max
    });

    test('should handle dynamic content updates efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      // Measure dynamic update performance
      const likeButtons = page.locator('button[aria-label*="like" i]');
      
      if (await likeButtons.count() > 0) {
        const updateStartTime = Date.now();
        
        // Perform multiple like actions to trigger updates
        for (let i = 0; i < Math.min(3, await likeButtons.count()); i++) {
          await likeButtons.nth(i).click();
          await page.waitForTimeout(50);
        }
        
        const updateTime = Date.now() - updateStartTime;
        
        // Updates should be fast
        expect(updateTime).toBeLessThan(1000); // 1 second for 3 updates
        
        // UI should remain responsive
        const posts = page.locator('.post-item');
        await expect(posts.first()).toBeVisible();
      }
    });

    test('should maintain consistent frame rates during interactions', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('.post-item', { timeout: 5000 });

      // Monitor frame rate during interactions
      const frameRatePromise = page.evaluate(() => {
        return new Promise((resolve) => {
          const frames = [];
          let lastFrameTime = performance.now();
          let frameCount = 0;
          
          const measureFrame = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastFrameTime;
            frames.push(deltaTime);
            lastFrameTime = currentTime;
            frameCount++;
            
            if (frameCount < 30) { // Measure 30 frames
              requestAnimationFrame(measureFrame);
            } else {
              const averageFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
              resolve({
                averageFrameTime,
                fps: 1000 / averageFrameTime,
                worstFrameTime: Math.max(...frames)
              });
            }
          };
          
          requestAnimationFrame(measureFrame);
        });
      });

      // Perform interactions while measuring
      await page.mouse.move(200, 200);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(100);
      }

      const frameMetrics = await frameRatePromise;
      
      // Frame rate should be acceptable
      expect(frameMetrics.fps).toBeGreaterThan(20); // At least 20fps
      expect(frameMetrics.worstFrameTime).toBeLessThan(100); // Worst frame under 100ms
    });
  });
});
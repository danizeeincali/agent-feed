import { test, expect } from '@playwright/test';

test.describe('⚡ Performance Benchmark Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear browser cache and storage for consistent testing
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('page load performance meets thresholds', async ({ page }) => {
    console.log('🧪 Testing page load performance...');
    
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for main content to be loaded
    await page.waitForSelector('[data-testid="app-root"]');
    await page.waitForSelector('[data-testid="post-item"]', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    
    // Performance threshold: Page should load under 3 seconds
    expect(loadTime).toBeLessThan(3000);
    console.log(`✅ Page loaded in ${loadTime}ms (< 3000ms threshold)`);
    
    // Test Core Web Vitals using page.evaluate
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('performance' in window) {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          resolve({
            fcp: navigation.loadEventEnd - navigation.fetchStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            loadComplete: navigation.loadEventEnd - navigation.fetchStart
          });
        } else {
          resolve({ fcp: 0, domInteractive: 0, loadComplete: 0 });
        }
      });
    });
    
    console.log('📊 Web Vitals:', webVitals);
  });

  test('@ mention dropdown response time benchmark', async ({ page }) => {
    console.log('🧪 Testing @ mention response time...');
    
    await page.goto('/');
    await page.click('[data-testid="create-post-button"]');
    
    const contentInput = page.locator('[data-testid="post-content"]');
    
    // Measure multiple @ mention trigger times
    const measurements = [];
    
    for (let i = 0; i < 5; i++) {
      await contentInput.clear();
      
      const startTime = performance.now();
      await contentInput.fill('@');
      await page.locator('[data-testid="mention-dropdown"]').waitFor({ state: 'visible', timeout: 2000 });
      const endTime = performance.now();
      
      const responseTime = endTime - startTime;
      measurements.push(responseTime);
      
      // Clear dropdown for next test
      await contentInput.clear();
      await page.waitForTimeout(100);
    }
    
    const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const maxTime = Math.max(...measurements);
    
    // Performance thresholds
    expect(averageTime).toBeLessThan(500); // Average < 500ms
    expect(maxTime).toBeLessThan(1000); // Max < 1000ms
    
    console.log(`✅ @ mention average: ${averageTime.toFixed(1)}ms, max: ${maxTime.toFixed(1)}ms`);
  });

  test('comment submission performance benchmark', async ({ page }) => {
    console.log('🧪 Testing comment submission performance...');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="post-item"]');
    
    const firstPost = page.locator('[data-testid="post-item"]').first();
    await firstPost.locator('[data-testid="comments-button"]').click();
    
    const commentInput = page.locator('[data-testid="comment-input"]');
    await commentInput.fill('Performance test comment');
    
    const startTime = Date.now();
    await page.click('[data-testid="submit-comment-button"]');
    
    // Wait for comment to appear or success indicator
    await Promise.race([
      page.locator('[data-testid="comment-success"]').waitFor({ state: 'visible', timeout: 5000 }),
      page.locator('[data-testid="comment-item"]').last().waitFor({ state: 'visible', timeout: 5000 })
    ]);
    
    const submissionTime = Date.now() - startTime;
    
    // Performance threshold: Comment should submit under 2 seconds
    expect(submissionTime).toBeLessThan(2000);
    console.log(`✅ Comment submitted in ${submissionTime}ms (< 2000ms threshold)`);
  });

  test('post creation end-to-end performance', async ({ page }) => {
    console.log('🧪 Testing post creation E2E performance...');
    
    await page.goto('/');
    
    const startTime = Date.now();
    
    // Complete post creation workflow
    await page.click('[data-testid="create-post-button"]');
    await page.locator('[data-testid="post-title"]').fill('Performance Test Post');
    await page.locator('[data-testid="post-content"]').fill('Testing end-to-end performance');
    await page.click('[data-testid="publish-button"]');
    
    // Wait for success and post to appear in feed
    await page.locator('[data-testid="post-published-success"]').waitFor({ state: 'visible', timeout: 10000 });
    
    const totalTime = Date.now() - startTime;
    
    // Performance threshold: Complete workflow under 5 seconds
    expect(totalTime).toBeLessThan(5000);
    console.log(`✅ Post creation workflow completed in ${totalTime}ms (< 5000ms threshold)`);
  });

  test('scroll performance with many posts', async ({ page }) => {
    console.log('🧪 Testing scroll performance...');
    
    await page.goto('/');
    await page.waitForSelector('[data-testid="post-item"]');
    
    // Measure scroll performance
    const scrollMetrics = await page.evaluate(async () => {
      const startTime = performance.now();
      let frameCount = 0;
      const maxFrames = 60; // Test for ~1 second at 60fps
      
      return new Promise((resolve) => {
        const measureFrame = () => {
          frameCount++;
          
          // Scroll down
          window.scrollBy(0, 100);
          
          if (frameCount < maxFrames) {
            requestAnimationFrame(measureFrame);
          } else {
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const averageFrameTime = totalTime / frameCount;
            const fps = 1000 / averageFrameTime;
            
            resolve({
              totalTime,
              frameCount,
              averageFrameTime,
              fps
            });
          }
        };
        
        requestAnimationFrame(measureFrame);
      });
    });
    
    console.log('📊 Scroll metrics:', scrollMetrics);
    
    // Performance threshold: Should maintain >30 FPS
    expect((scrollMetrics as any).fps).toBeGreaterThan(30);
    console.log(`✅ Scroll performance: ${(scrollMetrics as any).fps.toFixed(1)} FPS (> 30 FPS threshold)`);
  });

  test('memory usage during extended session', async ({ page }) => {
    console.log('🧪 Testing memory usage during extended session...');
    
    await page.goto('/');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    if (!initialMemory) {
      console.log('ℹ️ Memory API not available, skipping memory test');
      return;
    }
    
    console.log('📊 Initial memory:', initialMemory);
    
    // Simulate extended session activity
    for (let i = 0; i < 10; i++) {
      // Open and close post creator
      await page.click('[data-testid="create-post-button"]');
      await page.locator('[data-testid="post-content"]').fill(`Test content ${i}`);
      await page.click('[data-testid="close-modal-button"]');
      
      // Open comments on different posts
      const posts = page.locator('[data-testid="post-item"]');
      const postCount = await posts.count();
      if (postCount > 0) {
        const randomPostIndex = Math.floor(Math.random() * Math.min(3, postCount));
        await posts.nth(randomPostIndex).locator('[data-testid="comments-button"]').click();
        await page.waitForTimeout(200);
      }
      
      // Scroll around
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(100);
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });
    
    console.log('📊 Final memory:', finalMemory);
    
    const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
    const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;
    
    // Performance threshold: Memory should not increase by more than 50%
    expect(memoryIncreasePercent).toBeLessThan(50);
    console.log(`✅ Memory increase: ${memoryIncreasePercent.toFixed(1)}% (< 50% threshold)`);
  });

  test('network request optimization', async ({ page }) => {
    console.log('🧪 Testing network request optimization...');
    
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Analyze network requests
    const apiRequests = requests.filter(req => req.url.includes('/api/'));
    const imageRequests = requests.filter(req => req.resourceType === 'image');
    const jsRequests = requests.filter(req => req.resourceType === 'script');
    const cssRequests = requests.filter(req => req.resourceType === 'stylesheet');
    
    console.log('📊 Network request breakdown:');
    console.log(`  API requests: ${apiRequests.length}`);
    console.log(`  Images: ${imageRequests.length}`);
    console.log(`  JavaScript: ${jsRequests.length}`);
    console.log(`  CSS: ${cssRequests.length}`);
    console.log(`  Total requests: ${requests.length}`);
    
    // Performance thresholds
    expect(requests.length).toBeLessThan(50); // Total requests should be reasonable
    expect(apiRequests.length).toBeLessThan(10); // Should not make excessive API calls
    
    console.log('✅ Network request counts within acceptable limits');
  });

  test('bundle size and loading performance', async ({ page }) => {
    console.log('🧪 Testing bundle size and loading performance...');
    
    const resourceTimings = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return resources
        .filter(resource => resource.name.includes('.js') || resource.name.includes('.css'))
        .map(resource => ({
          name: resource.name.split('/').pop(),
          size: resource.transferSize,
          loadTime: resource.responseEnd - resource.requestStart
        }));
    });
    
    console.log('📊 Resource loading times:');
    resourceTimings.forEach(resource => {
      console.log(`  ${resource.name}: ${resource.size} bytes, ${resource.loadTime.toFixed(1)}ms`);
    });
    
    // Check for large bundles
    const largeBundles = resourceTimings.filter(resource => resource.size > 1000000); // > 1MB
    expect(largeBundles.length).toBe(0);
    
    console.log('✅ No oversized bundles detected');
  });
});
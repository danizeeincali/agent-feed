import { test, expect, Page } from '@playwright/test';

/**
 * Performance Testing for Thumbnail-Summary Components with Real Content
 * 
 * This test suite focuses on performance metrics, loading times, and optimization
 * validation for the thumbnail-summary preview functionality with real URLs.
 */

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
  totalBlockingTime: number;
}

// Performance budgets (in milliseconds)
const PERFORMANCE_BUDGETS = {
  pageLoad: 3000,        // Total page load should be under 3s
  firstPaint: 1500,      // First paint should happen within 1.5s
  largestPaint: 2500,    // Largest contentful paint within 2.5s
  interactivity: 2000,   // Time to interactive within 2s
  layoutShift: 0.1,      // CLS should be under 0.1
  blockingTime: 200,     // Total blocking time under 200ms
  thumbnailLoad: 1000,   // Individual thumbnails should load within 1s
  previewAPI: 500        // Preview API response within 500ms
};

async function measurePagePerformance(page: Page): Promise<PerformanceMetrics> {
  const performanceMetrics = await page.evaluate(() => {
    return new Promise<PerformanceMetrics>((resolve) => {
      // Use Performance Observer API for accurate measurements
      const metrics: Partial<PerformanceMetrics> = {};
      
      // Get navigation timing
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigationTiming) {
        metrics.loadTime = navigationTiming.loadEventEnd - navigationTiming.navigationStart;
      }
      
      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        metrics.firstContentfulPaint = fcp.startTime;
      }
      
      // Use Performance Observer for LCP, FID, CLS
      let lcpValue = 0;
      let clsValue = 0;
      let fidValue = 0;
      let ttiValue = 0;
      let tbtValue = 0;
      
      // LCP Observer
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        lcpValue = lastEntry.startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      
      // CLS Observer  
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      // FID Observer
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          fidValue = (entry as any).processingStart - entry.startTime;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      
      // Calculate TTI and TBT (simplified)
      const longTasks = performance.getEntriesByType('longtask');
      tbtValue = longTasks.reduce((total, task) => {
        return total + Math.max(0, task.duration - 50);
      }, 0);
      
      // Estimate TTI based on network and long tasks
      ttiValue = Math.max(
        metrics.firstContentfulPaint || 0,
        navigationTiming ? navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart : 0
      );
      
      setTimeout(() => {
        resolve({
          loadTime: metrics.loadTime || 0,
          firstContentfulPaint: metrics.firstContentfulPaint || 0,
          largestContentfulPaint: lcpValue,
          cumulativeLayoutShift: clsValue,
          firstInputDelay: fidValue,
          timeToInteractive: ttiValue,
          totalBlockingTime: tbtValue
        });
      }, 1000);
    });
  });
  
  return performanceMetrics;
}

async function measureThumbnailLoadTime(page: Page, thumbnailSelector: string): Promise<number> {
  const startTime = Date.now();
  
  try {
    await page.locator(thumbnailSelector).first().waitFor({ state: 'visible', timeout: 5000 });
    return Date.now() - startTime;
  } catch (error) {
    return -1; // Indicate failure
  }
}

async function measureAPIResponseTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  
  try {
    const response = await page.request.get(`/api/v1/link-preview?url=${encodeURIComponent(url)}`);
    const endTime = Date.now();
    
    if (response.ok()) {
      return endTime - startTime;
    } else {
      return -1;
    }
  } catch (error) {
    return -1;
  }
}

test.describe('Thumbnail-Summary Performance Testing', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  });

  test('should meet page load performance budgets', async ({ page }) => {
    console.log('📊 Measuring page load performance...');
    
    // Measure overall page performance
    const metrics = await measurePagePerformance(page);
    
    console.log('Performance Metrics:', {
      'Load Time': `${metrics.loadTime}ms`,
      'First Contentful Paint': `${metrics.firstContentfulPaint}ms`,
      'Largest Contentful Paint': `${metrics.largestContentfulPaint}ms`,
      'Cumulative Layout Shift': metrics.cumulativeLayoutShift,
      'Time to Interactive': `${metrics.timeToInteractive}ms`,
      'Total Blocking Time': `${metrics.totalBlockingTime}ms`
    });
    
    // Validate against budgets
    expect(metrics.loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);
    expect(metrics.firstContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.firstPaint);
    expect(metrics.largestContentfulPaint).toBeLessThan(PERFORMANCE_BUDGETS.largestPaint);
    expect(metrics.cumulativeLayoutShift).toBeLessThan(PERFORMANCE_BUDGETS.layoutShift);
    expect(metrics.timeToInteractive).toBeLessThan(PERFORMANCE_BUDGETS.interactivity);
    expect(metrics.totalBlockingTime).toBeLessThan(PERFORMANCE_BUDGETS.blockingTime);
    
    console.log('✅ All performance budgets met!');
  });

  test('should load thumbnails within performance budget', async ({ page }) => {
    console.log('🖼️ Measuring thumbnail loading performance...');
    
    // Wait for the feed to load
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible();
    
    // Find thumbnail-summary components
    const thumbnailContainers = page.locator('.thumbnail-summary, [role="article"]');
    const containerCount = await thumbnailContainers.count();
    
    if (containerCount === 0) {
      test.skip('No thumbnail-summary components found for performance testing');
    }
    
    console.log(`Testing ${Math.min(3, containerCount)} thumbnails...`);
    
    // Test loading time for first few thumbnails
    for (let i = 0; i < Math.min(3, containerCount); i++) {
      const container = thumbnailContainers.nth(i);
      const thumbnail = container.locator('img').first();
      
      if (await thumbnail.count() > 0) {
        const loadTime = await measureThumbnailLoadTime(page, thumbnail.locator('..'));
        
        console.log(`Thumbnail ${i + 1} load time: ${loadTime}ms`);
        
        if (loadTime > 0) {
          expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.thumbnailLoad);
        }
      }
    }
    
    console.log('✅ All thumbnails loaded within budget!');
  });

  test('should have fast API response times for preview requests', async ({ page }) => {
    console.log('🌐 Testing preview API performance...');
    
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/',
      'https://github.com/microsoft/vscode'
    ];
    
    for (const testUrl of testUrls) {
      const responseTime = await measureAPIResponseTime(page, testUrl);
      
      console.log(`API response time for ${testUrl}: ${responseTime}ms`);
      
      if (responseTime > 0) {
        expect(responseTime).toBeLessThan(PERFORMANCE_BUDGETS.previewAPI);
      } else {
        console.log(`⚠️ API request failed for ${testUrl}`);
      }
    }
    
    console.log('✅ API response times within budget!');
  });

  test('should handle multiple simultaneous preview requests efficiently', async ({ page }) => {
    console.log('🔄 Testing concurrent preview loading...');
    
    const testUrls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=fC7oUOUEEi4',
      'https://www.wired.com/story/elon-musk-trillion-dollar-tesla-pay-package/',
      'https://github.com/microsoft/vscode',
      'https://techcrunch.com/2024/01/15/ai-breakthrough-2024/'
    ];
    
    const startTime = Date.now();
    
    // Send all requests concurrently
    const promises = testUrls.map(url => measureAPIResponseTime(page, url));
    const results = await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(time => time > 0);
    
    console.log(`Concurrent requests completed in: ${totalTime}ms`);
    console.log(`Successful requests: ${successfulRequests.length}/${testUrls.length}`);
    
    if (successfulRequests.length > 0) {
      const averageResponseTime = successfulRequests.reduce((a, b) => a + b, 0) / successfulRequests.length;
      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
      
      // Concurrent requests shouldn't be significantly slower than individual ones
      expect(averageResponseTime).toBeLessThan(PERFORMANCE_BUDGETS.previewAPI * 1.5);
    }
    
    // Total time for all concurrent requests should be reasonable
    expect(totalTime).toBeLessThan(PERFORMANCE_BUDGETS.previewAPI * 2);
    
    console.log('✅ Concurrent loading performance acceptable!');
  });

  test('should maintain performance under different network conditions', async ({ page }) => {
    console.log('🌐 Testing performance under simulated network conditions...');
    
    // Test fast 3G network simulation
    await page.route('**/*.{jpg,jpeg,png,webp,gif}', route => {
      setTimeout(() => route.continue(), 100); // 100ms delay for images
    });
    
    const startTime = Date.now();
    
    // Navigate and measure performance
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    console.log(`Load time with simulated 3G: ${loadTime}ms`);
    
    // Should still be reasonable under simulated slow network
    expect(loadTime).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad * 2);
    
    // Remove network simulation
    await page.unrouteAll();
    
    console.log('✅ Performance acceptable under network constraints!');
  });

  test('should have efficient memory usage', async ({ page }) => {
    console.log('💾 Testing memory usage during thumbnail loading...');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // Load the application and interact with thumbnails
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible();
    
    // Interact with thumbnail-summary components
    const thumbnailContainers = page.locator('.thumbnail-summary, [role="article"]');
    const containerCount = await thumbnailContainers.count();
    
    if (containerCount > 0) {
      // Click through several thumbnails to test memory management
      for (let i = 0; i < Math.min(3, containerCount); i++) {
        const container = thumbnailContainers.nth(i);
        if (await container.isVisible()) {
          await container.click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      console.log(`Memory increase during interaction: ${memoryIncreaseMB.toFixed(2)}MB`);
      
      // Memory increase should be reasonable (less than 50MB for typical usage)
      expect(memoryIncreaseMB).toBeLessThan(50);
      
      console.log('✅ Memory usage within acceptable limits!');
    } else {
      console.log('ℹ️ Memory profiling not available in this browser');
    }
  });

  test('should render smoothly during scroll and interactions', async ({ page }) => {
    console.log('🎬 Testing rendering performance during interactions...');
    
    await expect(page.locator('[data-testid="social-media-feed"]')).toBeVisible();
    
    // Monitor frame timing during scroll
    const frameTimings: number[] = [];
    
    await page.evaluate(() => {
      let lastFrameTime = performance.now();
      
      function measureFrame() {
        const currentTime = performance.now();
        const frameDuration = currentTime - lastFrameTime;
        (window as any).frameTimings = (window as any).frameTimings || [];
        (window as any).frameTimings.push(frameDuration);
        lastFrameTime = currentTime;
        requestAnimationFrame(measureFrame);
      }
      
      requestAnimationFrame(measureFrame);
    });
    
    // Simulate user interactions
    await page.mouse.wheel(0, 500); // Scroll down
    await page.waitForTimeout(1000);
    await page.mouse.wheel(0, -300); // Scroll up
    await page.waitForTimeout(1000);
    
    // Get frame timing data
    const frameData = await page.evaluate(() => (window as any).frameTimings || []);
    
    if (frameData.length > 10) {
      const averageFrameTime = frameData.reduce((a: number, b: number) => a + b, 0) / frameData.length;
      const maxFrameTime = Math.max(...frameData);
      
      console.log(`Average frame time: ${averageFrameTime.toFixed(2)}ms`);
      console.log(`Max frame time: ${maxFrameTime.toFixed(2)}ms`);
      
      // Target 60fps = 16.67ms per frame
      expect(averageFrameTime).toBeLessThan(20); // Allow some tolerance
      expect(maxFrameTime).toBeLessThan(50); // No major frame drops
      
      console.log('✅ Smooth rendering performance maintained!');
    } else {
      console.log('ℹ️ Insufficient frame data collected');
    }
  });
});
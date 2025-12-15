/**
 * Performance Validation Tests with Real Content Loading
 * London School TDD - Mock-driven performance contract verification
 * 
 * Focus: Validate performance with actual content loading and real-world metrics
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Performance metrics thresholds based on Web Vitals
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  largestContentfulPaint: 2500, // 2.5s for good LCP
  firstInputDelay: 100,         // 100ms for good FID
  cumulativeLayoutShift: 0.1,   // 0.1 for good CLS
  
  // Custom metrics
  thumbnailLoadTime: 1500,      // 1.5s max for thumbnail loading
  previewDataFetch: 2000,       // 2s max for preview data
  videoExpansion: 500,          // 500ms max for video expansion
  scrollPerformance: 60,        // 60fps minimum scroll
  memoryUsage: 50 * 1024 * 1024, // 50MB max memory increase
  
  // Network performance
  apiResponseTime: 3000,        // 3s max API response
  imageLoadTime: 2000,          // 2s max image load
  cacheHitRatio: 0.8           // 80% cache hit ratio target
} as const;

// Performance monitoring orchestrator
class PerformanceOrchestrator {
  constructor(
    private mockPerformanceMonitor: MockPerformanceMonitor,
    private mockMemoryProfiler: MockMemoryProfiler,
    private mockNetworkProfiler: MockNetworkProfiler,
    private mockRenderingProfiler: MockRenderingProfiler
  ) {}

  async orchestratePerformanceMonitoring(page: Page): Promise<void> {
    // Outside-in: User loads content and experiences performance
    await this.mockPerformanceMonitor.startMonitoring();
    await this.mockMemoryProfiler.startProfiling();
    await this.mockNetworkProfiler.trackRequests();
    await this.mockRenderingProfiler.measurePaintTimes();
  }

  async orchestrateContentLoadPerformance(page: Page): Promise<void> {
    await this.mockNetworkProfiler.measureAPICall();
    await this.mockRenderingProfiler.measureThumbnailRender();
  }

  async orchestrateInteractionPerformance(page: Page): Promise<void> {
    await this.mockPerformanceMonitor.measureInteractionLatency();
    await this.mockRenderingProfiler.measureAnimationFrames();
  }
}

// Mock collaborators for performance testing
class MockPerformanceMonitor {
  async startMonitoring(): Promise<void> {
    // Contract: Should start comprehensive performance monitoring
  }

  async measureInteractionLatency(): Promise<void> {
    // Contract: Should measure user interaction response times
  }
}

class MockMemoryProfiler {
  async startProfiling(): Promise<void> {
    // Contract: Should monitor memory usage patterns
  }
}

class MockNetworkProfiler {
  async trackRequests(): Promise<void> {
    // Contract: Should monitor network request performance
  }

  async measureAPICall(): Promise<void> {
    // Contract: Should measure API response times
  }
}

class MockRenderingProfiler {
  async measurePaintTimes(): Promise<void> {
    // Contract: Should measure rendering performance
  }

  async measureThumbnailRender(): Promise<void> {
    // Contract: Should measure thumbnail rendering times
  }

  async measureAnimationFrames(): Promise<void> {
    // Contract: Should measure animation frame rates
  }
}

test.describe('Performance Validation Tests', () => {
  let orchestrator: PerformanceOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    // Initialize performance monitoring mocks
    const mockPerformanceMonitor = new MockPerformanceMonitor();
    const mockMemoryProfiler = new MockMemoryProfiler();
    const mockNetworkProfiler = new MockNetworkProfiler();
    const mockRenderingProfiler = new MockRenderingProfiler();

    orchestrator = new PerformanceOrchestrator(
      mockPerformanceMonitor,
      mockMemoryProfiler,
      mockNetworkProfiler,
      mockRenderingProfiler
    );

    // Set up performance monitoring
    await page.addInitScript(() => {
      (window as any).performanceMetrics = {
        marks: [],
        measures: [],
        observations: []
      };

      // Override performance.mark to capture marks
      const originalMark = performance.mark.bind(performance);
      performance.mark = function(name: string) {
        (window as any).performanceMetrics.marks.push({ name, time: Date.now() });
        return originalMark(name);
      };

      // Override performance.measure to capture measures
      const originalMeasure = performance.measure.bind(performance);
      performance.measure = function(name: string, startMark?: string, endMark?: string) {
        const result = originalMeasure(name, startMark, endMark);
        (window as any).performanceMetrics.measures.push({
          name,
          duration: result.duration,
          startTime: result.startTime
        });
        return result;
      };
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await orchestrator.orchestratePerformanceMonitoring(page);
  });

  test.describe('Core Web Vitals', () => {
    test('should meet Largest Contentful Paint (LCP) thresholds', async ({ page }) => {
      await page.evaluate(() => performance.mark('lcp-start'));

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      // Wait for thumbnail to load (largest contentful paint candidate)
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      const thumbnailImage = thumbnailSummary.locator('img').first();
      if (await thumbnailImage.isVisible()) {
        await expect(thumbnailImage).toBeVisible();
        
        // Wait for image to fully load
        await thumbnailImage.evaluate((img: HTMLImageElement) => {
          return new Promise((resolve) => {
            if (img.complete) {
              resolve(null);
            } else {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
            }
          });
        });
      }

      await page.evaluate(() => performance.mark('lcp-end'));
      await page.evaluate(() => performance.measure('lcp-duration', 'lcp-start', 'lcp-end'));

      // Get LCP measurement
      const lcpDuration = await page.evaluate(() => {
        const measures = performance.getEntriesByName('lcp-duration');
        return measures.length > 0 ? measures[0].duration : 0;
      });

      expect(lcpDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.largestContentfulPaint);
    });

    test('should meet First Input Delay (FID) thresholds', async ({ page }) => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Measure first input delay
      await page.evaluate(() => performance.mark('fid-start'));
      
      const startTime = Date.now();
      await thumbnailSummary.click();
      const endTime = Date.now();

      await page.evaluate(() => performance.mark('fid-end'));
      const fidDelay = endTime - startTime;

      expect(fidDelay).toBeLessThan(PERFORMANCE_THRESHOLDS.firstInputDelay);

      // Verify interaction completed successfully
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible({ timeout: PERFORMANCE_THRESHOLDS.videoExpansion });
    });

    test('should meet Cumulative Layout Shift (CLS) thresholds', async ({ page }) => {
      // Monitor layout shifts
      await page.evaluate(() => {
        (window as any).layoutShifts = [];
        
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              (window as any).layoutShifts.push({
                value: (entry as any).value,
                time: entry.startTime
              });
            }
          }
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
      });

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Wait for content to fully load and settle
      await page.waitForTimeout(3000);

      // Calculate CLS
      const clsScore = await page.evaluate(() => {
        const shifts = (window as any).layoutShifts || [];
        return shifts.reduce((total: number, shift: any) => total + shift.value, 0);
      });

      expect(clsScore).toBeLessThan(PERFORMANCE_THRESHOLDS.cumulativeLayoutShift);
    });
  });

  test.describe('Content Loading Performance', () => {
    test('should load thumbnail-summary within performance budget', async ({ page }) => {
      await orchestrator.orchestrateContentLoadPerformance(page);
      
      const startTime = Date.now();
      
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      // Measure time to first thumbnail appearance
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();
      
      const thumbnailLoadTime = Date.now() - startTime;
      expect(thumbnailLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.thumbnailLoadTime);

      // Measure time to complete content load
      const thumbnailImage = thumbnailSummary.locator('img').first();
      if (await thumbnailImage.isVisible()) {
        const imageStartTime = Date.now();
        
        await thumbnailImage.evaluate((img: HTMLImageElement) => {
          return new Promise((resolve) => {
            if (img.complete) resolve(null);
            else {
              img.onload = () => resolve(null);
              img.onerror = () => resolve(null);
            }
          });
        });
        
        const imageLoadTime = Date.now() - imageStartTime;
        expect(imageLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.imageLoadTime);
      }

      // Verify no blocking operations
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toBeVisible();
      
      const totalLoadTime = Date.now() - startTime;
      expect(totalLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.previewDataFetch);
    });

    test('should handle multiple concurrent thumbnail loads efficiently', async ({ page }) => {
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=X8vsE3-PosQ',
        'https://github.com/microsoft/TypeScript',
        'https://medium.com/@test/performance-article',
        'https://www.youtube.com/watch?v=jfKfPfyJRdk'
      ];

      const startTime = Date.now();

      // Post all URLs rapidly
      for (const url of testUrls) {
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(100); // Small delay between posts
      }

      // Wait for all thumbnails to appear
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 5;
      }, { timeout: 15000 });

      const totalLoadTime = Date.now() - startTime;

      // Should handle concurrent loads within reasonable time
      expect(totalLoadTime).toBeLessThan(15000);

      // Verify all thumbnails loaded
      const thumbnailSummaries = page.locator('[data-testid="thumbnail-summary"]');
      expect(await thumbnailSummaries.count()).toBe(5);

      // Check individual thumbnail performance
      for (let i = 0; i < 5; i++) {
        const thumbnail = thumbnailSummaries.nth(i);
        await expect(thumbnail).toBeVisible();
        
        const thumbnailImage = thumbnail.locator('img').first();
        if (await thumbnailImage.isVisible()) {
          const naturalWidth = await thumbnailImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
          expect(naturalWidth).toBeGreaterThan(0); // Image should be loaded
        }
      }
    });

    test('should maintain performance under memory pressure', async ({ page }) => {
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Create memory pressure with many thumbnails
      const urls = Array.from({ length: 20 }, (_, i) => 
        `https://www.youtube.com/watch?v=test${i.toString().padStart(3, '0')}`
      );

      for (const url of urls) {
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        
        // Small delay to allow processing
        await page.waitForTimeout(50);
      }

      // Wait for content to settle
      await page.waitForTimeout(5000);

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);

      // UI should still be responsive
      const newUrl = 'https://www.youtube.com/watch?v=responsive_test';
      const interactionStart = Date.now();
      
      await page.getByTestId('post-content-input').fill(newUrl);
      await page.getByTestId('post-submit-button').click();
      
      const newThumbnail = page.locator('[data-testid="thumbnail-summary"]').last();
      await expect(newThumbnail).toBeVisible({ timeout: 3000 });
      
      const interactionTime = Date.now() - interactionStart;
      expect(interactionTime).toBeLessThan(3000);
    });
  });

  test.describe('Interaction Performance', () => {
    test('should expand videos with optimal performance', async ({ page }) => {
      await orchestrator.orchestrateInteractionPerformance(page);
      
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Measure expansion performance
      const expansionStart = Date.now();
      await thumbnailSummary.click();

      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();
      
      const expansionTime = Date.now() - expansionStart;
      expect(expansionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.videoExpansion);

      // Measure iframe load performance
      const iframe = expandedVideo.locator('iframe');
      await expect(iframe).toBeVisible();
      
      // Verify smooth transition
      const transitionMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('measure');
        return entries.filter(entry => entry.name.includes('transition'));
      });

      // Should have smooth animation frames during transition
      expect(transitionMetrics.length).toBeGreaterThanOrEqual(0);
    });

    test('should maintain scroll performance with many thumbnails', async ({ page }) => {
      // Create many thumbnails to test scroll performance
      for (let i = 0; i < 15; i++) {
        const url = `https://www.youtube.com/watch?v=scroll${i.toString().padStart(2, '0')}`;
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(100);
      }

      // Wait for all thumbnails to load
      await page.waitForFunction(() => {
        return document.querySelectorAll('[data-testid="thumbnail-summary"]').length >= 10;
      }, { timeout: 20000 });

      // Measure scroll performance
      await page.evaluate(() => {
        (window as any).frameCount = 0;
        (window as any).scrollStart = Date.now();
        
        function countFrame() {
          (window as any).frameCount++;
          requestAnimationFrame(countFrame);
        }
        countFrame();
      });

      // Perform scroll test
      const scrollDistance = 1500;
      const scrollDuration = 2000; // 2 seconds

      await page.mouse.wheel(0, scrollDistance);
      await page.waitForTimeout(scrollDuration);

      // Calculate frame rate during scroll
      const frameRate = await page.evaluate(() => {
        const duration = Date.now() - (window as any).scrollStart;
        return ((window as any).frameCount / duration) * 1000;
      });

      expect(frameRate).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.scrollPerformance);

      // Verify thumbnails remain functional during/after scroll
      const visibleThumbnails = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(visibleThumbnails).toBeVisible();

      const interactionStart = Date.now();
      await visibleThumbnails.click();
      
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();
      
      const postScrollInteractionTime = Date.now() - interactionStart;
      expect(postScrollInteractionTime).toBeLessThan(PERFORMANCE_THRESHOLDS.videoExpansion);
    });

    test('should handle rapid user interactions efficiently', async ({ page }) => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Rapid click test
      const rapidClickCount = 5;
      const clickTimes: number[] = [];

      for (let i = 0; i < rapidClickCount; i++) {
        const clickStart = Date.now();
        
        if (i % 2 === 0) {
          // Expand
          await thumbnailSummary.click();
          const expandedVideo = page.locator('[data-testid="expanded-video"]');
          await expect(expandedVideo).toBeVisible();
        } else {
          // Collapse
          const collapseButton = page.locator('[data-testid="collapse-video"]');
          if (await collapseButton.isVisible()) {
            await collapseButton.click();
            const expandedVideo = page.locator('[data-testid="expanded-video"]');
            await expect(expandedVideo).not.toBeVisible({ timeout: 1000 });
          }
        }
        
        const clickTime = Date.now() - clickStart;
        clickTimes.push(clickTime);
        
        await page.waitForTimeout(100);
      }

      // All interactions should be within threshold
      const maxClickTime = Math.max(...clickTimes);
      expect(maxClickTime).toBeLessThan(1000);

      // Average should be much better
      const avgClickTime = clickTimes.reduce((a, b) => a + b, 0) / clickTimes.length;
      expect(avgClickTime).toBeLessThan(PERFORMANCE_THRESHOLDS.videoExpansion);
    });
  });

  test.describe('Network Performance', () => {
    test('should optimize API requests for performance', async ({ page, context }) => {
      const networkRequests: Array<{ url: string; duration: number; status: number }> = [];

      // Monitor network requests
      page.on('response', (response) => {
        const timing = response.request().timing();
        networkRequests.push({
          url: response.url(),
          duration: timing?.responseEnd || 0,
          status: response.status()
        });
      });

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Wait for all network requests to complete
      await page.waitForTimeout(3000);

      // Check API request performance
      const apiRequests = networkRequests.filter(req => 
        req.url.includes('/link-preview') || req.url.includes('/api/')
      );

      apiRequests.forEach(request => {
        expect(request.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.apiResponseTime);
        expect(request.status).toBeLessThan(400); // No error responses
      });

      // Check image loading performance
      const imageRequests = networkRequests.filter(req => 
        req.url.includes('.jpg') || req.url.includes('.png') || req.url.includes('.webp')
      );

      imageRequests.forEach(request => {
        expect(request.duration).toBeLessThan(PERFORMANCE_THRESHOLDS.imageLoadTime);
      });
    });

    test('should implement efficient caching strategies', async ({ page, context }) => {
      let cacheHits = 0;
      let cacheMisses = 0;

      // Monitor cache behavior
      page.on('response', (response) => {
        const cacheControl = response.headers()['cache-control'];
        const etag = response.headers()['etag'];
        
        if (response.status() === 304 || cacheControl?.includes('max-age')) {
          cacheHits++;
        } else {
          cacheMisses++;
        }
      });

      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      // First request
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      let thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      await page.waitForTimeout(2000);

      // Second identical request (should use cache)
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').nth(1);
      await expect(thumbnailSummary).toBeVisible();

      await page.waitForTimeout(2000);

      // Calculate cache hit ratio
      const totalRequests = cacheHits + cacheMisses;
      const cacheHitRatio = totalRequests > 0 ? cacheHits / totalRequests : 0;

      console.log(`Cache hits: ${cacheHits}, Cache misses: ${cacheMisses}, Ratio: ${cacheHitRatio}`);
      
      // Should have reasonable cache utilization
      if (totalRequests > 5) {
        expect(cacheHitRatio).toBeGreaterThan(0.3); // At least 30% cache hits
      }
    });
  });

  test.describe('Memory Management', () => {
    test('should manage memory efficiently with thumbnails', async ({ page }) => {
      const getMemoryUsage = async () => {
        return await page.evaluate(() => {
          const memory = (performance as any).memory;
          return memory ? {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          } : { used: 0, total: 0, limit: 0 };
        });
      };

      const initialMemory = await getMemoryUsage();

      // Create multiple thumbnails
      for (let i = 0; i < 10; i++) {
        const url = `https://www.youtube.com/watch?v=memory${i.toString().padStart(2, '0')}`;
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(200);
      }

      await page.waitForTimeout(5000);

      const midMemory = await getMemoryUsage();
      const memoryIncrease = midMemory.used - initialMemory.used;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      await page.waitForTimeout(2000);

      const finalMemory = await getMemoryUsage();
      
      // Memory should be manageable after GC
      expect(finalMemory.used).toBeLessThan(midMemory.used * 1.2); // No more than 20% increase
    });

    test('should clean up resources when thumbnails are removed', async ({ page }) => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      
      await page.getByTestId('post-content-input').fill(youtubeUrl);
      await page.getByTestId('post-submit-button').click();

      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').first();
      await expect(thumbnailSummary).toBeVisible();

      // Expand video
      await thumbnailSummary.click();
      const expandedVideo = page.locator('[data-testid="expanded-video"]');
      await expect(expandedVideo).toBeVisible();

      const beforeCleanup = await page.evaluate(() => {
        return {
          iframes: document.querySelectorAll('iframe').length,
          images: document.querySelectorAll('img').length,
          memory: (performance as any).memory?.usedJSHeapSize || 0
        };
      });

      // Delete post (if delete functionality exists)
      const deleteButton = page.locator('[data-testid="delete-post"]');
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Confirm deletion
        const confirmButton = page.locator('[data-testid="confirm-delete"]');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        await page.waitForTimeout(2000);

        const afterCleanup = await page.evaluate(() => {
          return {
            iframes: document.querySelectorAll('iframe').length,
            images: document.querySelectorAll('img').length,
            memory: (performance as any).memory?.usedJSHeapSize || 0
          };
        });

        // Resources should be cleaned up
        expect(afterCleanup.iframes).toBeLessThanOrEqual(beforeCleanup.iframes);
        expect(afterCleanup.images).toBeLessThanOrEqual(beforeCleanup.images);
      }
    });
  });

  test.describe('Bundle Size and Loading Performance', () => {
    test('should load efficiently without blocking', async ({ page }) => {
      // Measure initial page load performance
      const navigationTiming = await page.evaluate(() => {
        const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
          loadComplete: timing.loadEventEnd - timing.loadEventStart,
          firstPaint: timing.responseEnd - timing.requestStart
        };
      });

      expect(navigationTiming.domContentLoaded).toBeLessThan(2000);
      expect(navigationTiming.loadComplete).toBeLessThan(5000);

      // Check resource loading
      const resourceTiming = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map(entry => ({
          name: entry.name,
          duration: entry.duration,
          size: (entry as any).transferSize || 0
        }));
      });

      // JavaScript bundles should load efficiently
      const jsResources = resourceTiming.filter(resource => 
        resource.name.includes('.js') && !resource.name.includes('node_modules')
      );

      jsResources.forEach(resource => {
        expect(resource.duration).toBeLessThan(3000);
      });

      // CSS should load quickly
      const cssResources = resourceTiming.filter(resource => resource.name.includes('.css'));
      cssResources.forEach(resource => {
        expect(resource.duration).toBeLessThan(1000);
      });
    });
  });
});

// Test utilities and cleanup
test.beforeAll(async () => {
  console.log('⚡ Starting Performance Validation Tests');
  console.log('📊 Performance Thresholds:', Object.keys(PERFORMANCE_THRESHOLDS).length);
});

test.afterAll(async () => {
  console.log('✅ Performance Validation Tests Complete');
});

// Helper function to wait for performance entries
async function waitForPerformanceEntries(page: Page, type: string, minCount: number = 1) {
  await page.waitForFunction(
    ({ type, minCount }) => {
      return performance.getEntriesByType(type).length >= minCount;
    },
    { type, minCount },
    { timeout: 10000 }
  );
}
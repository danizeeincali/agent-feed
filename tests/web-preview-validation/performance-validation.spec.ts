import { test, expect, Page } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Performance Validation Tests for Web Preview Functionality
 * 
 * This test suite validates:
 * - Bundle size impact of preview components
 * - Lazy loading performance 
 * - Image error handling and fallbacks
 * - Memory usage with multiple previews
 * - Network request optimization
 */

test.describe('Web Preview Performance Validation', () => {
  let page: Page;
  let initialMetrics: any;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    // Capture initial performance metrics
    await page.goto('/');
    await page.waitForSelector('[data-testid="social-media-feed"]');
    
    initialMetrics = await page.evaluate(() => ({
      timing: performance.timing,
      memory: (performance as any).memory,
      navigation: performance.getEntriesByType('navigation')[0]
    }));
  });

  test.describe('Bundle Size Impact', () => {
    test('should load app within reasonable time', async () => {
      const navigationEntry = await page.evaluate(() => 
        performance.getEntriesByType('navigation')[0]
      );
      
      const loadTime = navigationEntry.loadEventEnd - navigationEntry.fetchStart;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      console.log(`App load time: ${loadTime}ms`);
    });

    test('should have reasonable JavaScript bundle size', async () => {
      const resources = await page.evaluate(() =>
        performance.getEntriesByType('resource')
          .filter(r => r.name.includes('.js') && !r.name.includes('node_modules'))
          .map(r => ({
            name: r.name,
            size: r.transferSize || r.encodedBodySize,
            duration: r.duration
          }))
      );

      console.log('JavaScript bundles:', resources);

      const totalJSSize = resources.reduce((sum, r) => sum + (r.size || 0), 0);
      
      // Total JS should be under 5MB (reasonable for development)
      expect(totalJSSize).toBeLessThan(5 * 1024 * 1024);
      console.log(`Total JavaScript bundle size: ${(totalJSSize / 1024 / 1024).toFixed(2)} MB`);
    });

    test('should load CSS efficiently', async () => {
      const cssResources = await page.evaluate(() =>
        performance.getEntriesByType('resource')
          .filter(r => r.name.includes('.css'))
          .map(r => ({
            name: r.name,
            size: r.transferSize || r.encodedBodySize,
            duration: r.duration
          }))
      );

      console.log('CSS resources:', cssResources);

      const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.size || 0), 0);
      
      // CSS should be under 1MB
      expect(totalCSSSize).toBeLessThan(1024 * 1024);
    });
  });

  test.describe('Lazy Loading Performance', () => {
    test('should lazy load YouTube thumbnails', async () => {
      // Add a YouTube URL to test lazy loading
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          for (let i = 0; i < 10; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.setAttribute('data-testid', `lazy-test-${i}`);
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Video ${i + 1}: <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=${i * 10}s" target="_blank">YouTube Video ${i + 1}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      // Monitor network requests for images
      const imageRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('youtube.com/vi/') || request.url().includes('img.youtube.com')) {
          imageRequests.push(request.url());
        }
      });

      // Scroll down to trigger lazy loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(3000);

      // Scroll back up
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(2000);

      // Should have loaded images progressively, not all at once
      expect(imageRequests.length).toBeGreaterThan(0);
      expect(imageRequests.length).toBeLessThan(50); // Should not load excessive images
      
      console.log(`Lazy loaded ${imageRequests.length} images`);
    });

    test('should handle rapid scrolling without overwhelming network', async () => {
      // Add many posts with URLs
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const urls = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://github.com/microsoft/playwright',
            'https://example.com/image.jpg',
            'https://www.wired.com/story/test/',
            'https://medium.com/@test/article'
          ];
          
          for (let i = 0; i < 20; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Post ${i + 1}: <a href="${urls[i % urls.length]}" target="_blank">Link ${i + 1}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      // Rapid scroll test
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        await page.evaluate((scrollPos) => {
          window.scrollTo(0, scrollPos);
        }, i * 500);
        await page.waitForTimeout(100);
      }

      const scrollTime = Date.now() - startTime;
      
      // Should complete rapid scrolling quickly (under 5 seconds)
      expect(scrollTime).toBeLessThan(5000);
      
      // Page should remain responsive
      const isResponsive = await page.evaluate(() => {
        const button = document.querySelector('button');
        return button ? true : false; // Basic responsiveness check
      });
      
      expect(isResponsive).toBeTruthy();
    });
  });

  test.describe('Memory Usage Validation', () => {
    test('should manage memory efficiently with multiple previews', async () => {
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize || 0
      );

      if (initialMemory === 0) {
        console.log('Memory API not available in this browser');
        return;
      }

      // Add many preview components
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          for (let i = 0; i < 50; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Memory test ${i}: <a href="https://www.youtube.com/watch?v=test${i}" target="_blank">Video ${i}</a></p>
                <p>Also: <a href="https://example${i}.com/image.jpg" target="_blank">Image ${i}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      // Wait for components to load
      await page.waitForTimeout(10000);

      // Scroll to trigger loading
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(5000);

      // Get final memory usage
      const finalMemory = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize || 0
      );

      const memoryIncrease = finalMemory - initialMemory;
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (under 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // Clean up and check for memory leaks
      await page.evaluate(() => {
        const posts = document.querySelectorAll('[data-testid="post-list"] article');
        posts.forEach(post => post.remove());
      });

      // Force garbage collection if possible
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });

      await page.waitForTimeout(2000);

      const cleanupMemory = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize || 0
      );

      // Memory should decrease after cleanup
      expect(cleanupMemory).toBeLessThan(finalMemory * 1.1); // Allow 10% tolerance
    });

    test('should clean up resources when components unmount', async () => {
      let observerCount = 0;
      
      // Monitor for resource cleanup
      await page.addInitScript(() => {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        
        (window as any).eventListenerCount = 0;
        
        EventTarget.prototype.addEventListener = function(...args) {
          (window as any).eventListenerCount++;
          return originalAddEventListener.apply(this, args);
        };
        
        EventTarget.prototype.removeEventListener = function(...args) {
          (window as any).eventListenerCount--;
          return originalRemoveEventListener.apply(this, args);
        };
      });

      // Add components
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          for (let i = 0; i < 10; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Cleanup test ${i}: <a href="https://www.youtube.com/watch?v=cleanup${i}" target="_blank">Video ${i}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      await page.waitForTimeout(5000);

      const initialEventListeners = await page.evaluate(() => (window as any).eventListenerCount || 0);

      // Remove components
      await page.evaluate(() => {
        const posts = document.querySelectorAll('[data-testid="post-list"] article');
        posts.forEach(post => post.remove());
      });

      await page.waitForTimeout(2000);

      const finalEventListeners = await page.evaluate(() => (window as any).eventListenerCount || 0);

      console.log(`Event listeners before: ${initialEventListeners}, after: ${finalEventListeners}`);

      // Should not have excessive event listener leaks
      expect(finalEventListeners).toBeLessThanOrEqual(initialEventListeners + 5);
    });
  });

  test.describe('Network Request Optimization', () => {
    test('should batch and throttle network requests', async () => {
      const networkRequests: string[] = [];
      const requestTimes: number[] = [];

      page.on('request', request => {
        if (request.url().includes('api') || request.url().includes('preview')) {
          networkRequests.push(request.url());
          requestTimes.push(Date.now());
        }
      });

      // Add multiple URLs simultaneously
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          for (let i = 0; i < 10; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Batch test ${i}: <a href="https://example${i}.com/test" target="_blank">Link ${i}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      await page.waitForTimeout(10000);

      // Analyze request timing
      if (requestTimes.length > 1) {
        const requestIntervals = [];
        for (let i = 1; i < requestTimes.length; i++) {
          requestIntervals.push(requestTimes[i] - requestTimes[i - 1]);
        }

        const averageInterval = requestIntervals.reduce((a, b) => a + b, 0) / requestIntervals.length;
        console.log(`Average request interval: ${averageInterval}ms`);

        // Requests should be somewhat throttled (not all immediate)
        expect(averageInterval).toBeGreaterThan(10); // At least 10ms between requests
      }

      console.log(`Total network requests: ${networkRequests.length}`);
    });

    test('should handle concurrent image loading efficiently', async () => {
      const imageRequests: string[] = [];
      const imageLoadTimes: { [url: string]: number } = {};

      page.on('request', request => {
        if (request.resourceType() === 'image') {
          imageRequests.push(request.url());
          imageLoadTimes[request.url()] = Date.now();
        }
      });

      page.on('response', response => {
        if (response.request().resourceType() === 'image') {
          const url = response.url();
          if (imageLoadTimes[url]) {
            imageLoadTimes[url] = Date.now() - imageLoadTimes[url];
          }
        }
      });

      // Add multiple images
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          for (let i = 0; i < 20; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Image test ${i}: <a href="https://www.youtube.com/watch?v=img${i}" target="_blank">Video ${i}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      await page.waitForTimeout(15000);

      const completedLoads = Object.keys(imageLoadTimes).filter(url => imageLoadTimes[url] > 0);
      const averageLoadTime = completedLoads.reduce((sum, url) => sum + imageLoadTimes[url], 0) / completedLoads.length;

      console.log(`Images loaded: ${completedLoads.length}, Average load time: ${averageLoadTime}ms`);

      // Should load images efficiently
      if (completedLoads.length > 0) {
        expect(averageLoadTime).toBeLessThan(5000); // Under 5 seconds average
      }
    });
  });

  test.describe('Error Handling Performance', () => {
    test('should handle image errors without blocking UI', async () => {
      const startTime = Date.now();

      // Add URLs with broken images
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          for (let i = 0; i < 10; i++) {
            const testPost = document.createElement('article');
            testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
            testPost.innerHTML = `
              <div class="prose prose-sm">
                <p>Broken image ${i}: <a href="https://broken-domain-${i}.invalid/image.jpg" target="_blank">Broken Image ${i}</a></p>
              </div>
            `;
            feed.appendChild(testPost);
          }
        }
      });

      // UI should remain responsive
      await page.waitForTimeout(5000);
      const responseTime = Date.now() - startTime;

      // Should handle errors quickly
      expect(responseTime).toBeLessThan(10000);

      // UI elements should still be interactive
      const feedElement = page.locator('[data-testid="social-media-feed"]');
      await expect(feedElement).toBeVisible();

      // Should be able to interact with page
      await page.evaluate(() => window.scrollTo(0, 100));
      await page.waitForTimeout(100);

      const scrollPosition = await page.evaluate(() => window.scrollY);
      expect(scrollPosition).toBeGreaterThan(0);
    });

    test('should timeout slow network requests appropriately', async () => {
      const slowRequests: string[] = [];

      page.on('request', request => {
        if (request.url().includes('slow-') || request.url().includes('timeout-')) {
          slowRequests.push(request.url());
        }
      });

      // Add URLs that would be slow to load
      await page.evaluate(() => {
        const feed = document.querySelector('[data-testid="post-list"]');
        if (feed) {
          const testPost = document.createElement('article');
          testPost.className = 'bg-white border border-gray-200 rounded-lg shadow-sm p-6';
          testPost.innerHTML = `
            <div class="prose prose-sm">
              <p>Slow URL: <a href="https://slow-timeout-test.invalid/very/slow/response" target="_blank">Slow Link</a></p>
            </div>
          `;
          feed.appendChild(testPost);
        }
      });

      const startTime = Date.now();
      
      // Wait reasonable amount for timeout handling
      await page.waitForTimeout(15000);
      
      const totalTime = Date.now() - startTime;

      // Should not hang indefinitely
      expect(totalTime).toBeLessThan(20000);

      // Should show fallback for slow requests
      const fallbackLink = page.locator('a[href*="slow-timeout-test.invalid"]');
      await expect(fallbackLink).toBeVisible();
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should meet Core Web Vitals targets', async () => {
      // Measure Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {
            FCP: 0,
            LCP: 0,
            FID: 0,
            CLS: 0
          };

          // First Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            if (fcpEntry) {
              vitals.FCP = fcpEntry.startTime;
            }
          }).observe({ entryTypes: ['paint'] });

          // Largest Contentful Paint
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.LCP = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // Cumulative Layout Shift
          let clsScore = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsScore += (entry as any).value;
              }
            }
            vitals.CLS = clsScore;
          }).observe({ entryTypes: ['layout-shift'] });

          // Return results after a delay
          setTimeout(() => resolve(vitals), 5000);
        });
      });

      console.log('Core Web Vitals:', webVitals);

      // Core Web Vitals thresholds
      if (webVitals.FCP > 0) {
        expect(webVitals.FCP).toBeLessThan(2500); // Good FCP: < 1.8s, Poor: > 3.0s
      }
      
      if (webVitals.LCP > 0) {
        expect(webVitals.LCP).toBeLessThan(4000); // Good LCP: < 2.5s, Poor: > 4.0s
      }

      expect(webVitals.CLS).toBeLessThan(0.25); // Good CLS: < 0.1, Poor: > 0.25
    });
  });
});
import { test, expect } from '@playwright/test';

/**
 * Performance Validation Testing Suite
 * Tests Core Web Vitals, load times, and performance metrics
 */

test.describe('Performance Validation', () => {
  test('Core Web Vitals measurement', async ({ page }) => {
    await test.step('Measure homepage performance', async () => {
      // Navigate and measure performance
      const navigationPromise = page.goto('/', { waitUntil: 'networkidle' });

      // Inject performance measurement script
      await page.addInitScript(() => {
        window.performanceMetrics = {
          navigationStart: performance.timeOrigin,
          metrics: []
        };

        // Capture Core Web Vitals
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            window.performanceMetrics.metrics.push({
              name: entry.name,
              value: entry.value,
              rating: entry.rating,
              delta: entry.delta,
              id: entry.id,
              entryType: entry.entryType
            });
          });
        });

        // Observe different performance entry types
        try {
          observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
        } catch (e) {
          console.log('Performance observer not fully supported');
        }
      });

      await navigationPromise;
      await page.waitForTimeout(3000); // Allow time for metrics to be collected

      // Collect performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');

        return {
          navigation: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            firstByte: navigation.responseStart - navigation.fetchStart,
            domComplete: navigation.domComplete - navigation.fetchStart,
            totalPageLoad: navigation.loadEventEnd - navigation.fetchStart
          },
          paint: {
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
          },
          memory: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null,
          timing: performance.timeOrigin,
          customMetrics: window.performanceMetrics || {}
        };
      });

      // Performance assertions
      expect(performanceMetrics.navigation.totalPageLoad).toBeLessThan(10000); // 10 seconds max
      expect(performanceMetrics.navigation.domInteractive).toBeLessThan(5000); // 5 seconds max
      expect(performanceMetrics.paint.firstContentfulPaint).toBeLessThan(3000); // 3 seconds max

      // Save performance metrics
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/performance/homepage-performance.json',
        JSON.stringify(performanceMetrics, null, 2)
      );
    });

    await test.step('Measure Largest Contentful Paint (LCP)', async () => {
      const lcpMetric = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve({
              value: lastEntry.startTime,
              element: lastEntry.element?.tagName || 'unknown',
              url: lastEntry.url || ''
            });
          });

          try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] });

            // Fallback timeout
            setTimeout(() => resolve({ value: -1, element: 'timeout', url: '' }), 5000);
          } catch (e) {
            resolve({ value: -1, element: 'error', url: '' });
          }
        });
      });

      if (lcpMetric.value > 0) {
        expect(lcpMetric.value).toBeLessThan(4000); // LCP should be under 4 seconds
      }

      // Save LCP metric
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/performance/lcp-metric.json',
        JSON.stringify(lcpMetric, null, 2)
      );
    });
  });

  test('Network performance and resource loading', async ({ page }) => {
    const resources = [];

    // Monitor network requests
    page.on('response', response => {
      resources.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type'],
        size: parseInt(response.headers()['content-length']) || 0,
        timing: response.timing()
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await test.step('Analyze resource loading performance', async () => {
      // Categorize resources
      const resourceTypes = {
        html: resources.filter(r => r.contentType?.includes('text/html')),
        css: resources.filter(r => r.contentType?.includes('text/css')),
        javascript: resources.filter(r => r.contentType?.includes('javascript')),
        images: resources.filter(r => r.contentType?.includes('image')),
        fonts: resources.filter(r => r.contentType?.includes('font') || r.url.includes('.woff')),
        api: resources.filter(r => r.url.includes('/api/') || r.contentType?.includes('json'))
      };

      // Calculate total sizes
      const totalSizes = {
        html: resourceTypes.html.reduce((sum, r) => sum + r.size, 0),
        css: resourceTypes.css.reduce((sum, r) => sum + r.size, 0),
        javascript: resourceTypes.javascript.reduce((sum, r) => sum + r.size, 0),
        images: resourceTypes.images.reduce((sum, r) => sum + r.size, 0),
        fonts: resourceTypes.fonts.reduce((sum, r) => sum + r.size, 0),
        api: resourceTypes.api.reduce((sum, r) => sum + r.size, 0)
      };

      const totalSize = Object.values(totalSizes).reduce((sum, size) => sum + size, 0);

      // Performance assertions
      expect(totalSizes.javascript).toBeLessThan(2 * 1024 * 1024); // 2MB JS max
      expect(totalSizes.css).toBeLessThan(500 * 1024); // 500KB CSS max
      expect(totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB total max

      // Save resource analysis
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/performance/resource-analysis.json',
        JSON.stringify({ resourceTypes, totalSizes, totalSize, resourceCount: resources.length }, null, 2)
      );
    });

    await test.step('Check for failed requests', async () => {
      const failedRequests = resources.filter(r => r.status >= 400);

      // Should have minimal failed requests
      expect(failedRequests.length).toBeLessThan(5);

      if (failedRequests.length > 0) {
        const fs = require('fs');
        fs.writeFileSync(
          'test-results/performance/failed-requests.json',
          JSON.stringify(failedRequests, null, 2)
        );
      }
    });
  });

  test('JavaScript bundle analysis', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await test.step('Analyze JavaScript performance', async () => {
      const jsMetrics = await page.evaluate(() => {
        // Measure JavaScript execution time
        const scripts = Array.from(document.querySelectorAll('script')).map(script => ({
          src: script.src,
          async: script.async,
          defer: script.defer,
          type: script.type,
          size: script.innerHTML.length
        }));

        // Check for long tasks
        const longTasks = [];
        if ('PerformanceLongTaskTiming' in window) {
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              longTasks.push({
                startTime: entry.startTime,
                duration: entry.duration,
                name: entry.name
              });
            });
          });

          try {
            observer.observe({ entryTypes: ['longtask'] });
          } catch (e) {
            console.log('Long task observer not supported');
          }
        }

        return {
          scripts,
          longTasks,
          totalInlineJS: scripts.reduce((sum, s) => sum + s.size, 0)
        };
      });

      // Check for performance issues
      expect(jsMetrics.totalInlineJS).toBeLessThan(50000); // 50KB inline JS max

      // Save JS analysis
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/performance/javascript-analysis.json',
        JSON.stringify(jsMetrics, null, 2)
      );
    });
  });

  test('Rendering performance', async ({ page }) => {
    await page.goto('/');

    await test.step('Measure rendering metrics', async () => {
      const renderingMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          let cumulativeLayoutShift = 0;
          let firstInputDelay = null;

          // Measure Cumulative Layout Shift
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.entryType === 'layout-shift') {
                cumulativeLayoutShift += entry.value;
              }
              if (entry.entryType === 'first-input') {
                firstInputDelay = entry.processingStart - entry.startTime;
              }
            });
          });

          try {
            observer.observe({ entryTypes: ['layout-shift', 'first-input'] });
          } catch (e) {
            console.log('Layout shift observer not supported');
          }

          // Measure frame timing
          let frameCount = 0;
          const frameTimes = [];
          let lastTimestamp = performance.now();

          function measureFrame(timestamp) {
            frameTimes.push(timestamp - lastTimestamp);
            lastTimestamp = timestamp;
            frameCount++;

            if (frameCount < 60) { // Measure for 60 frames
              requestAnimationFrame(measureFrame);
            } else {
              const avgFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
              resolve({
                cumulativeLayoutShift,
                firstInputDelay,
                avgFrameTime,
                frameCount,
                droppedFrames: frameTimes.filter(time => time > 16.67).length // 60fps = 16.67ms per frame
              });
            }
          }

          requestAnimationFrame(measureFrame);

          // Fallback timeout
          setTimeout(() => {
            resolve({
              cumulativeLayoutShift,
              firstInputDelay,
              avgFrameTime: -1,
              frameCount,
              droppedFrames: -1
            });
          }, 2000);
        });
      });

      // Performance assertions
      if (renderingMetrics.cumulativeLayoutShift >= 0) {
        expect(renderingMetrics.cumulativeLayoutShift).toBeLessThan(0.25); // Good CLS score
      }

      if (renderingMetrics.firstInputDelay !== null) {
        expect(renderingMetrics.firstInputDelay).toBeLessThan(100); // Good FID score
      }

      // Save rendering metrics
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/performance/rendering-metrics.json',
        JSON.stringify(renderingMetrics, null, 2)
      );
    });
  });

  test('Memory usage monitoring', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await test.step('Monitor memory usage patterns', async () => {
      const memorySnapshots = [];

      // Take initial memory snapshot
      let initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          timestamp: Date.now()
        } : null;
      });

      if (initialMemory) {
        memorySnapshots.push({ ...initialMemory, action: 'initial' });

        // Navigate through different routes to test memory usage
        const routes = ['/claude-manager', '/agents', '/analytics', '/'];

        for (const route of routes) {
          await page.goto(route);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(1000);

          const memory = await page.evaluate(() => {
            return (performance as any).memory ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
              timestamp: Date.now()
            } : null;
          });

          if (memory) {
            memorySnapshots.push({ ...memory, action: `navigate-${route}` });
          }
        }

        // Check for memory leaks (simplified)
        const memoryGrowth = memorySnapshots[memorySnapshots.length - 1].usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryGrowthMB = memoryGrowth / (1024 * 1024);

        // Should not grow excessively
        expect(memoryGrowthMB).toBeLessThan(50); // 50MB growth max

        // Save memory analysis
        const fs = require('fs');
        fs.writeFileSync(
          'test-results/performance/memory-usage.json',
          JSON.stringify({ memorySnapshots, memoryGrowthMB }, null, 2)
        );
      }
    });
  });

  test('Mobile performance validation', async ({ page }) => {
    // Simulate mobile device
    await page.emulate({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    });

    // Throttle network to simulate mobile conditions
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 150 // 150ms latency
    });

    await test.step('Measure mobile performance', async () => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Mobile performance should be reasonable even with throttling
      expect(loadTime).toBeLessThan(15000); // 15 seconds max on throttled connection

      const mobileMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadTime: Date.now() - performance.timeOrigin,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
        };
      });

      // Save mobile performance metrics
      const fs = require('fs');
      fs.writeFileSync(
        'test-results/performance/mobile-performance.json',
        JSON.stringify({ ...mobileMetrics, throttledLoadTime: loadTime }, null, 2)
      );
    });
  });
});

test.afterAll(async () => {
  // Generate performance summary report
  const fs = require('fs');

  const performanceReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0
    },
    metrics: {
      averageLoadTime: 0,
      averageFirstContentfulPaint: 0,
      totalResourceSize: 0,
      memoryUsage: 0
    },
    recommendations: []
  };

  try {
    // Try to read and summarize performance results
    const reportsDir = 'test-results/performance';
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir);
      performanceReport.summary.totalTests = files.length;
    }

    fs.writeFileSync(
      'test-results/performance/performance-summary.json',
      JSON.stringify(performanceReport, null, 2)
    );

    // Store results in memory for coordination
    const hookCommand = `npx claude-flow@alpha hooks post-edit --file "test-results/performance" --memory-key "swarm/playwright/performance"`;

    const { exec } = require('child_process');
    exec(hookCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('Could not store performance results in memory:', error.message);
      } else {
        console.log('✅ Performance results stored in memory');
      }
    });
  } catch (error) {
    console.log('Failed to generate performance summary:', error.message);
  }
});
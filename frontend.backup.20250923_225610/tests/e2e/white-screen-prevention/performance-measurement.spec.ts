import { test, expect } from '@playwright/test';

/**
 * Performance Measurement Tests
 * Measures page load performance and ensures acceptable loading times
 */

interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
  loadTime: number;
  domContentLoaded: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

test.describe('Performance Measurement Tests', () => {
  test('should load main page within performance budgets', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]');

    const loadTime = Date.now() - startTime;

    // Performance budgets
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds

    // Get Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise<PerformanceMetrics>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const paintEntries = entries.filter(entry => entry.entryType === 'paint');

          const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

          resolve({
            firstContentfulPaint: fcp,
            largestContentfulPaint: 0, // Will be updated by LCP observer
            timeToInteractive: 0,
            cumulativeLayoutShift: 0,
            totalBlockingTime: 0,
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            memoryUsage: (performance as any).memory ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
            } : undefined
          });
        });

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'navigation'] });

        // Fallback timeout
        setTimeout(() => {
          resolve({
            firstContentfulPaint: 0,
            largestContentfulPaint: 0,
            timeToInteractive: 0,
            cumulativeLayoutShift: 0,
            totalBlockingTime: 0,
            loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          });
        }, 3000);
      });
    });

    console.log('📊 Performance Metrics:');
    console.log(`  Load Time: ${loadTime}ms`);
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`  First Contentful Paint: ${metrics.firstContentfulPaint}ms`);

    if (metrics.memoryUsage) {
      console.log(`  Memory Usage: ${Math.round(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024)}MB`);
    }

    // Performance assertions
    expect(metrics.firstContentfulPaint).toBeLessThan(3000); // FCP < 3s
    expect(metrics.domContentLoaded).toBeLessThan(2000); // DCL < 2s

    console.log('✅ Performance within acceptable limits');
  });

  test('should measure Time to Interactive (TTI)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Test interactivity by trying to interact with elements
    const searchInput = await page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    const interactiveTime = Date.now() - startTime;

    // Should be interactive within 3 seconds
    expect(interactiveTime).toBeLessThan(3000);

    // Test that interactions work
    await searchInput.fill('test');
    const inputValue = await searchInput.inputValue();
    expect(inputValue).toBe('test');

    console.log(`✅ Time to Interactive: ${interactiveTime}ms`);
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    // Wait for metrics to be collected
    await page.waitForTimeout(3000);

    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          fcp: 0,
          lcp: 0,
          cls: 0,
          fid: 0
        };

        // Collect FCP
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['paint'] });

        // Collect LCP
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          vitals.lcp = lastEntry.startTime;
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Collect CLS
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          vitals.cls = clsValue;
        }).observe({ entryTypes: ['layout-shift'] });

        // Return metrics after timeout
        setTimeout(() => resolve(vitals), 2000);
      });
    });

    console.log('📊 Core Web Vitals:');
    console.log(`  First Contentful Paint: ${webVitals.fcp}ms`);
    console.log(`  Largest Contentful Paint: ${webVitals.lcp}ms`);
    console.log(`  Cumulative Layout Shift: ${webVitals.cls}`);

    // Web Vitals thresholds
    if (webVitals.fcp > 0) expect(webVitals.fcp).toBeLessThan(1800); // Good FCP < 1.8s
    if (webVitals.lcp > 0) expect(webVitals.lcp).toBeLessThan(2500); // Good LCP < 2.5s
    expect(webVitals.cls).toBeLessThan(0.1); // Good CLS < 0.1

    console.log('✅ Core Web Vitals within good thresholds');
  });

  test('should measure resource loading performance', async ({ page }) => {
    const resourceMetrics: Array<{ name: string; duration: number; size: number }> = [];

    page.on('response', async (response) => {
      const request = response.request();
      const url = request.url();

      if (url.includes('localhost:5173') &&
          (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.html'))) {

        const timing = response.request().timing();
        const responseTime = timing?.responseEnd || 0;
        const headers = await response.allHeaders();
        const contentLength = parseInt(headers['content-length'] || '0', 10);

        resourceMetrics.push({
          name: url.split('/').pop() || 'unknown',
          duration: responseTime,
          size: contentLength
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]');

    console.log('📊 Resource Loading Metrics:');
    resourceMetrics.forEach(metric => {
      console.log(`  ${metric.name}: ${metric.duration}ms, ${Math.round(metric.size / 1024)}KB`);
    });

    // Check that main resources loaded quickly
    const mainBundle = resourceMetrics.find(r => r.name.includes('index') || r.name.includes('main'));
    if (mainBundle) {
      expect(mainBundle.duration).toBeLessThan(2000);
    }

    console.log('✅ Resource loading performance acceptable');
  });

  test('should measure memory usage', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    // Navigate around to test memory usage
    await page.goto('/agents');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.goto('/analytics');
    await page.waitForSelector('[data-testid="app-root"]');
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-root"]');

    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      console.log(`📊 Memory Usage:`);
      console.log(`  Initial: ${Math.round(initialMemory.used / 1024 / 1024)}MB`);
      console.log(`  Final: ${Math.round(finalMemory.used / 1024 / 1024)}MB`);
      console.log(`  Increase: ${Math.round(memoryIncreaseMB)}MB`);

      // Memory increase should be reasonable (< 50MB for navigation)
      expect(memoryIncreaseMB).toBeLessThan(50);
    }

    console.log('✅ Memory usage within acceptable limits');
  });

  test('should measure network performance', async ({ page }) => {
    const networkRequests: Array<{ url: string; method: string; status: number; time: number }> = [];

    page.on('response', (response) => {
      const request = response.request();
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        status: response.status(),
        time: response.request().timing()?.responseEnd || 0
      });
    });

    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const totalTime = Date.now() - startTime;

    console.log('📊 Network Performance:');
    console.log(`  Total requests: ${networkRequests.length}`);
    console.log(`  Total time: ${totalTime}ms`);

    // Check for failed requests
    const failedRequests = networkRequests.filter(req => req.status >= 400);
    console.log(`  Failed requests: ${failedRequests.length}`);

    if (failedRequests.length > 0) {
      console.log('  Failed URLs:', failedRequests.map(req => req.url));
    }

    // Should have minimal failed requests
    expect(failedRequests.length).toBeLessThan(3);

    console.log('✅ Network performance acceptable');
  });

  test('should measure rendering performance', async ({ page }) => {
    await page.goto('/');

    const renderingMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const renderEntries = entries.filter(entry =>
            entry.entryType === 'measure' || entry.entryType === 'paint'
          );

          resolve({
            paintEntries: renderEntries.length,
            renderTime: renderEntries.reduce((sum, entry) => sum + entry.duration, 0)
          });
        });

        observer.observe({ entryTypes: ['measure', 'paint'] });

        // Fallback
        setTimeout(() => resolve({ paintEntries: 0, renderTime: 0 }), 2000);
      });
    });

    console.log('📊 Rendering Performance:');
    console.log(`  Paint entries: ${renderingMetrics.paintEntries}`);
    console.log(`  Render time: ${renderingMetrics.renderTime}ms`);

    // Verify page rendered successfully
    const rootElement = await page.locator('#root');
    await expect(rootElement).toBeVisible();

    console.log('✅ Rendering performance measured');
  });

  test('should measure performance under load', async ({ page }) => {
    // Simulate heavy load by opening multiple tabs/contexts
    const contexts = [];
    const loadTimes = [];

    try {
      for (let i = 0; i < 3; i++) {
        const context = await page.context().browser()?.newContext();
        if (context) {
          contexts.push(context);
          const newPage = await context.newPage();

          const startTime = Date.now();
          await newPage.goto('/', { waitUntil: 'networkidle' });
          await newPage.waitForSelector('[data-testid="app-root"]');
          const loadTime = Date.now() - startTime;

          loadTimes.push(loadTime);
        }
      }

      const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;

      console.log('📊 Performance Under Load:');
      console.log(`  Load times: ${loadTimes.join(', ')}ms`);
      console.log(`  Average: ${Math.round(avgLoadTime)}ms`);

      // Should maintain reasonable performance under load
      expect(avgLoadTime).toBeLessThan(8000);

    } finally {
      // Clean up contexts
      for (const context of contexts) {
        await context.close();
      }
    }

    console.log('✅ Performance under load acceptable');
  });

  test('should measure bundle size impact', async ({ page }) => {
    const bundleMetrics: Array<{ name: string; size: number; gzipped?: number }> = [];

    page.on('response', async (response) => {
      const url = response.request().url();

      if (url.includes('localhost:5173') &&
          (url.endsWith('.js') || url.endsWith('.css'))) {

        const headers = await response.allHeaders();
        const contentLength = parseInt(headers['content-length'] || '0', 10);
        const contentEncoding = headers['content-encoding'];

        bundleMetrics.push({
          name: url.split('/').pop() || 'unknown',
          size: contentLength,
          gzipped: contentEncoding === 'gzip' ? contentLength : undefined
        });
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]');

    const totalSize = bundleMetrics.reduce((sum, bundle) => sum + bundle.size, 0);
    const totalSizeMB = totalSize / 1024 / 1024;

    console.log('📊 Bundle Size Analysis:');
    bundleMetrics.forEach(bundle => {
      console.log(`  ${bundle.name}: ${Math.round(bundle.size / 1024)}KB`);
    });
    console.log(`  Total: ${Math.round(totalSizeMB * 1000) / 1000}MB`);

    // Bundle size should be reasonable (< 5MB total)
    expect(totalSizeMB).toBeLessThan(5);

    console.log('✅ Bundle size within acceptable limits');
  });
});
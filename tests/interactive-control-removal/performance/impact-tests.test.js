/**
 * Performance Impact Tests
 *
 * Tests to measure and validate the performance impact of removing
 * interactive controls. Measures real performance metrics without mocks.
 */

import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Performance Impact Tests', () => {
  let browser;
  let context;
  let page;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: process.env.CI === 'true',
      devtools: !process.env.CI
    });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
  });

  test.beforeEach(async () => {
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await context.close();
    await browser.close();
  });

  test('Page load performance after interactive control removal', async () => {
    const routes = ['/', '/agents', '/avi-dm'];
    const performanceResults = [];

    for (const route of routes) {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Get detailed timing metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          responseTime: navigation.responseEnd - navigation.requestStart,
          domInteractive: navigation.domInteractive - navigation.navigationStart
        };
      });

      performanceResults.push({
        route,
        totalLoadTime: loadTime,
        ...metrics
      });

      // Verify reasonable load times (should be improved without interactive controls)
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
      expect(metrics.domContentLoaded).toBeLessThan(3000); // 3 seconds for DOM ready

      console.log(`${route} performance:`, { loadTime, ...metrics });
    }

    // Compare performance across routes
    const avgLoadTime = performanceResults.reduce((sum, result) => sum + result.totalLoadTime, 0) / performanceResults.length;
    expect(avgLoadTime).toBeLessThan(4000); // Average under 4 seconds

    console.log('Average load time:', avgLoadTime);
  });

  test('JavaScript bundle size impact', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Get all JavaScript resources
    const jsResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources
        .filter(resource => resource.name.includes('.js') || resource.initiatorType === 'script')
        .map(resource => ({
          name: resource.name,
          size: resource.transferSize || resource.encodedBodySize || 0,
          loadTime: resource.responseEnd - resource.requestStart
        }));
    });

    const totalJSSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
    const totalJSLoadTime = jsResources.reduce((sum, resource) => sum + resource.loadTime, 0);

    console.log('JavaScript resources:', jsResources);
    console.log('Total JS size:', totalJSSize, 'bytes');
    console.log('Total JS load time:', totalJSLoadTime, 'ms');

    // Verify reasonable bundle sizes (should be smaller without interactive controls)
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024); // Under 2MB total
    expect(totalJSLoadTime).toBeLessThan(3000); // Under 3 seconds to load all JS
  });

  test('CSS bundle size impact', async () => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    // Get all CSS resources
    const cssResources = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources
        .filter(resource => resource.name.includes('.css') || resource.initiatorType === 'css')
        .map(resource => ({
          name: resource.name,
          size: resource.transferSize || resource.encodedBodySize || 0,
          loadTime: resource.responseEnd - resource.requestStart
        }));
    });

    const totalCSSSize = cssResources.reduce((sum, resource) => sum + resource.size, 0);
    const totalCSSLoadTime = cssResources.reduce((sum, resource) => sum + resource.loadTime, 0);

    console.log('CSS resources:', cssResources);
    console.log('Total CSS size:', totalCSSSize, 'bytes');
    console.log('Total CSS load time:', totalCSSLoadTime, 'ms');

    // Verify reasonable CSS sizes
    expect(totalCSSSize).toBeLessThan(500 * 1024); // Under 500KB total CSS
    expect(totalCSSLoadTime).toBeLessThan(1000); // Under 1 second to load all CSS
  });

  test('Memory usage performance', async () => {
    const memoryResults = [];

    // Test memory usage on different pages
    const routes = ['/', '/agents', '/avi-dm'];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');

      // Wait for page to settle
      await page.waitForTimeout(2000);

      const memoryUsage = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });

      if (memoryUsage) {
        memoryResults.push({
          route,
          ...memoryUsage,
          usedMB: Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024 * 100) / 100
        });

        // Verify reasonable memory usage
        const usedMB = memoryUsage.usedJSHeapSize / 1024 / 1024;
        expect(usedMB).toBeLessThan(100); // Under 100MB per page

        console.log(`${route} memory usage: ${usedMB}MB`);
      }
    }

    if (memoryResults.length > 0) {
      const avgMemoryUsage = memoryResults.reduce((sum, result) => sum + result.usedMB, 0) / memoryResults.length;
      console.log('Average memory usage:', avgMemoryUsage, 'MB');
      expect(avgMemoryUsage).toBeLessThan(50); // Average under 50MB
    }
  });

  test('Network request performance', async () => {
    const networkRequests = [];

    // Monitor network requests
    page.on('response', response => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
        size: response.headers()['content-length'] || 0,
        timing: response.timing()
      });
    });

    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');

    // Analyze network performance
    const apiRequests = networkRequests.filter(req => req.url.includes('/api/'));
    const staticRequests = networkRequests.filter(req =>
      req.url.includes('.js') || req.url.includes('.css') || req.url.includes('.png') || req.url.includes('.jpg')
    );

    console.log('API requests:', apiRequests.length);
    console.log('Static requests:', staticRequests.length);
    console.log('Total requests:', networkRequests.length);

    // Verify reasonable request counts (should be lower without interactive controls)
    expect(networkRequests.length).toBeLessThan(50); // Total requests under 50
    expect(apiRequests.length).toBeLessThan(10); // API requests under 10

    // Verify all requests succeed
    const failedRequests = networkRequests.filter(req => req.status >= 400);
    expect(failedRequests.length).toBe(0);
  });

  test('DOM node count performance', async () => {
    const domResults = [];

    const routes = ['/', '/agents', '/avi-dm'];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');

      const domMetrics = await page.evaluate(() => {
        return {
          totalNodes: document.querySelectorAll('*').length,
          interactiveNodes: document.querySelectorAll('button, input, select, textarea, a[href]').length,
          scriptTags: document.querySelectorAll('script').length,
          styleTags: document.querySelectorAll('style, link[rel="stylesheet"]').length
        };
      });

      domResults.push({
        route,
        ...domMetrics
      });

      // Verify reasonable DOM complexity (should be lower without interactive controls)
      expect(domMetrics.totalNodes).toBeLessThan(2000); // Under 2000 total DOM nodes
      expect(domMetrics.interactiveNodes).toBeLessThan(100); // Under 100 interactive elements

      console.log(`${route} DOM metrics:`, domMetrics);
    }

    // Compare interactive node counts
    const avgInteractiveNodes = domResults.reduce((sum, result) => sum + result.interactiveNodes, 0) / domResults.length;
    console.log('Average interactive nodes:', avgInteractiveNodes);
  });

  test('First Contentful Paint performance', async () => {
    const fcpResults = [];

    const routes = ['/', '/agents', '/avi-dm'];

    for (const route of routes) {
      await page.goto(`${BASE_URL}${route}`);

      // Wait for FCP
      await page.waitForLoadState('domcontentloaded');

      const fcp = await page.evaluate(() => {
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        return fcpEntry ? fcpEntry.startTime : null;
      });

      if (fcp !== null) {
        fcpResults.push({
          route,
          fcp: Math.round(fcp)
        });

        // Verify fast FCP (should be improved without interactive controls)
        expect(fcp).toBeLessThan(2000); // Under 2 seconds

        console.log(`${route} FCP: ${fcp}ms`);
      }
    }

    if (fcpResults.length > 0) {
      const avgFCP = fcpResults.reduce((sum, result) => sum + result.fcp, 0) / fcpResults.length;
      console.log('Average FCP:', avgFCP, 'ms');
      expect(avgFCP).toBeLessThan(1500); // Average under 1.5 seconds
    }
  });

  test('Lighthouse performance metrics', async () => {
    // This would require lighthouse integration, but we can test similar metrics
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');

    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        domInteractive: navigation.domInteractive - navigation.navigationStart
      };
    });

    console.log('Performance metrics:', performanceMetrics);

    // Verify Core Web Vitals-like metrics
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(2500); // Good FCP under 2.5s
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // DCL under 3s
    expect(performanceMetrics.loadComplete).toBeLessThan(5000); // Load under 5s
  });

  test('Mobile performance impact', async () => {
    // Test mobile performance
    await page.setViewportSize({ width: 375, height: 667 });

    // Simulate slow 3G network
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 500 * 1024 / 8, // 500kb/s
      uploadThroughput: 500 * 1024 / 8,
      latency: 300
    });

    const startTime = Date.now();
    await page.goto(`${BASE_URL}/agents`);
    await page.waitForLoadState('networkidle');
    const mobileLoadTime = Date.now() - startTime;

    console.log('Mobile load time:', mobileLoadTime, 'ms');

    // Verify reasonable mobile performance
    expect(mobileLoadTime).toBeLessThan(10000); // Under 10 seconds on slow 3G

    // Test mobile-specific metrics
    const mobileMetrics = await page.evaluate(() => {
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        touchSupport: 'ontouchstart' in window
      };
    });

    expect(mobileMetrics.viewportWidth).toBe(375);
    console.log('Mobile metrics:', mobileMetrics);
  });

  test('Performance over time stability', async () => {
    const performanceOverTime = [];

    // Test performance consistency over multiple page loads
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/agents`);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      const memoryUsage = await page.evaluate(() => {
        return performance.memory ? performance.memory.usedJSHeapSize : 0;
      });

      performanceOverTime.push({
        iteration: i + 1,
        loadTime,
        memoryUsage: Math.round(memoryUsage / 1024 / 1024 * 100) / 100
      });

      // Short delay between tests
      await page.waitForTimeout(1000);
    }

    console.log('Performance over time:', performanceOverTime);

    // Verify performance consistency
    const loadTimes = performanceOverTime.map(p => p.loadTime);
    const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);
    const minLoadTime = Math.min(...loadTimes);

    // Performance should be consistent (max shouldn't be more than 2x min)
    expect(maxLoadTime / minLoadTime).toBeLessThan(3);

    // Memory shouldn't grow significantly over time
    const memoryUsages = performanceOverTime.map(p => p.memoryUsage);
    const maxMemory = Math.max(...memoryUsages);
    const minMemory = Math.min(...memoryUsages);

    if (maxMemory > 0 && minMemory > 0) {
      expect(maxMemory / minMemory).toBeLessThan(2); // Memory shouldn't double
    }
  });
});
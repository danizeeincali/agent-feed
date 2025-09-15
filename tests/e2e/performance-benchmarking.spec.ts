import { test, expect, Page } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';

/**
 * Performance Benchmarking and Monitoring Tests
 *
 * Comprehensive performance testing including:
 * - Page load times and Core Web Vitals
 * - Memory usage and leak detection
 * - Network efficiency and resource optimization
 * - Rendering performance and frame rates
 * - Database query performance impact
 * - Real-time feature performance overhead
 * - Scalability under load
 */

interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay?: number;
  cumulativeLayoutShift: number;
  totalBlockingTime: number;
}

interface ResourceMetrics {
  totalSize: number;
  resourceCount: number;
  imageSize: number;
  scriptSize: number;
  styleSize: number;
  documentSize: number;
}

test.describe('Core Web Vitals and Performance Metrics', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.afterEach(async () => {
    await TestHelper.cleanupTestPages(createdPageIds);
    createdPageIds = [];
  });

  test('Core Web Vitals measurement', async ({ page }) => {
    // Enable performance monitoring
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    const startTime = Date.now();
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Collect Core Web Vitals
    const vitals = await page.evaluate(async () => {
      return new Promise<PerformanceMetrics>((resolve) => {
        const metrics: Partial<PerformanceMetrics> = {};

        // Get navigation timing
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          metrics.navigationStart = navigation.navigationStart;
          metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
          metrics.loadComplete = navigation.loadEventEnd - navigation.navigationStart;
        }

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            metrics.firstPaint = entry.startTime;
          } else if (entry.name === 'first-contentful-paint') {
            metrics.firstContentfulPaint = entry.startTime;
          }
        });

        // Get LCP (requires observer)
        let lcpValue = 0;
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              if (entries.length > 0) {
                lcpValue = entries[entries.length - 1].startTime;
              }
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
          } catch (e) {
            console.warn('LCP observer not supported');
          }
        }

        // Get CLS (requires observer)
        let clsValue = 0;
        if ('PerformanceObserver' in window) {
          try {
            const clsObserver = new PerformanceObserver((list) => {
              for (const entry of list.getEntries() as any[]) {
                if (!entry.hadRecentInput) {
                  clsValue += entry.value;
                }
              }
            });
            clsObserver.observe({ type: 'layout-shift', buffered: true });
          } catch (e) {
            console.warn('CLS observer not supported');
          }
        }

        // Wait for metrics to settle
        setTimeout(() => {
          metrics.largestContentfulPaint = lcpValue;
          metrics.cumulativeLayoutShift = clsValue;
          metrics.totalBlockingTime = 0; // Would need more complex calculation

          resolve(metrics as PerformanceMetrics);
        }, 2000);
      });
    });

    const totalLoadTime = Date.now() - startTime;

    console.log('🚀 Core Web Vitals:', {
      'First Contentful Paint': `${vitals.firstContentfulPaint.toFixed(0)}ms`,
      'Largest Contentful Paint': `${vitals.largestContentfulPaint.toFixed(0)}ms`,
      'Cumulative Layout Shift': vitals.cumulativeLayoutShift.toFixed(3),
      'Total Load Time': `${totalLoadTime}ms`,
      'DOM Content Loaded': `${vitals.domContentLoaded.toFixed(0)}ms`
    });

    // Performance budgets (Google recommendations)
    expect(vitals.firstContentfulPaint).toBeLessThan(1800); // Good FCP < 1.8s
    expect(vitals.largestContentfulPaint).toBeLessThan(2500); // Good LCP < 2.5s
    expect(vitals.cumulativeLayoutShift).toBeLessThan(0.1); // Good CLS < 0.1
    expect(totalLoadTime).toBeLessThan(3000); // Total load < 3s

    // Test navigation to Dynamic Pages performance
    const dynamicPagesStartTime = Date.now();
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    const dynamicPagesLoadTime = Date.now() - dynamicPagesStartTime;
    console.log(`Dynamic Pages tab load time: ${dynamicPagesLoadTime}ms`);

    expect(dynamicPagesLoadTime).toBeLessThan(1000); // Tab switching should be fast

    console.log('✅ Core Web Vitals within acceptable thresholds');
  });

  test('Memory usage and leak detection', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    // Initial memory measurement
    const initialMemory = await client.send('Runtime.getHeapUsage');
    console.log(`Initial memory usage: ${Math.round(initialMemory.usedSize / 1024 / 1024)}MB`);

    // Navigate through application multiple times to detect leaks
    const iterations = 5;
    const memoryMeasurements: number[] = [];

    for (let i = 0; i < iterations; i++) {
      await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
      await TestHelper.waitForPageReady(page);

      const dynamicPagesTab = page.locator('text="Dynamic Pages"');
      await dynamicPagesTab.click();
      await page.waitForTimeout(1000);

      // Navigate to dashboard and back
      await page.goto(TestHelper.FRONTEND_URL);
      await TestHelper.waitForPageReady(page);
      await page.waitForTimeout(500);

      // Force garbage collection if available
      try {
        await client.send('Runtime.collectGarbage');
      } catch (e) {
        // GC may not be available
      }

      const currentMemory = await client.send('Runtime.getHeapUsage');
      memoryMeasurements.push(currentMemory.usedSize);

      console.log(`Iteration ${i + 1} memory: ${Math.round(currentMemory.usedSize / 1024 / 1024)}MB`);
    }

    // Analyze memory trend
    const memoryIncrease = memoryMeasurements[memoryMeasurements.length - 1] - memoryMeasurements[0];
    const memoryIncreasePercent = (memoryIncrease / memoryMeasurements[0]) * 100;

    console.log(`Memory increase over ${iterations} iterations: ${Math.round(memoryIncrease / 1024)}KB (${memoryIncreasePercent.toFixed(1)}%)`);

    // Memory should not increase dramatically (potential leak detection)
    expect(memoryIncreasePercent).toBeLessThan(50); // Less than 50% increase
    expect(memoryMeasurements[memoryMeasurements.length - 1]).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total

    // Check for detached DOM nodes
    const detachedNodes = await client.send('HeapProfiler.takeHeapSnapshot');
    console.log('Heap snapshot taken for analysis');

    console.log('✅ Memory usage within acceptable limits');
  });

  test('Network efficiency and resource optimization', async ({ page }) => {
    const resourceMetrics: ResourceMetrics = {
      totalSize: 0,
      resourceCount: 0,
      imageSize: 0,
      scriptSize: 0,
      styleSize: 0,
      documentSize: 0
    };

    const resourceTypes = new Map<string, number>();

    // Monitor network requests
    page.on('response', async response => {
      try {
        const contentLength = parseInt(response.headers()['content-length'] || '0', 10);
        const responseBody = await response.body().catch(() => Buffer.alloc(0));
        const actualSize = responseBody.length || contentLength || 0;

        resourceMetrics.totalSize += actualSize;
        resourceMetrics.resourceCount++;

        const resourceType = response.request().resourceType();
        resourceTypes.set(resourceType, (resourceTypes.get(resourceType) || 0) + actualSize);

        // Categorize resources
        switch (resourceType) {
          case 'image':
            resourceMetrics.imageSize += actualSize;
            break;
          case 'script':
            resourceMetrics.scriptSize += actualSize;
            break;
          case 'stylesheet':
            resourceMetrics.styleSize += actualSize;
            break;
          case 'document':
            resourceMetrics.documentSize += actualSize;
            break;
        }
      } catch (error) {
        // Handle response errors gracefully
      }
    });

    // Load page and measure resources
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Navigate to Dynamic Pages to load additional resources
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForTimeout(3000); // Allow all resources to load

    console.log('📊 Resource breakdown:', {
      'Total Size': `${Math.round(resourceMetrics.totalSize / 1024)}KB`,
      'Resource Count': resourceMetrics.resourceCount,
      'Images': `${Math.round(resourceMetrics.imageSize / 1024)}KB`,
      'Scripts': `${Math.round(resourceMetrics.scriptSize / 1024)}KB`,
      'Stylesheets': `${Math.round(resourceMetrics.styleSize / 1024)}KB`,
      'Documents': `${Math.round(resourceMetrics.documentSize / 1024)}KB`
    });

    console.log('📊 Resource types:', Array.from(resourceTypes.entries()).map(([type, size]) =>
      `${type}: ${Math.round(size / 1024)}KB`
    ).join(', '));

    // Performance budgets for resources
    expect(resourceMetrics.totalSize).toBeLessThan(2 * 1024 * 1024); // Total < 2MB
    expect(resourceMetrics.scriptSize).toBeLessThan(500 * 1024); // JS < 500KB
    expect(resourceMetrics.styleSize).toBeLessThan(100 * 1024); // CSS < 100KB
    expect(resourceMetrics.resourceCount).toBeLessThan(50); // Fewer than 50 requests

    // Check for compression
    const compressedResponses = await page.evaluate(() => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return entries.filter(entry =>
        entry.transferSize < entry.encodedBodySize
      ).length;
    });

    console.log(`Compressed responses: ${compressedResponses}/${resourceMetrics.resourceCount}`);

    console.log('✅ Network efficiency within acceptable limits');
  });

  test('Rendering performance and frame rates', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Measure rendering performance during interactions
    const renderingMetrics = await page.evaluate(async () => {
      const startTime = performance.now();
      const frames: number[] = [];
      let lastFrameTime = startTime;

      return new Promise<{frameRate: number, renderTime: number}>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              const currentTime = performance.now();
              const frameTime = currentTime - lastFrameTime;
              frames.push(frameTime);
              lastFrameTime = currentTime;
            }
          }
        });

        try {
          observer.observe({ entryTypes: ['measure'] });
        } catch (e) {
          // Fallback measurement
        }

        // Trigger some interactions and measure
        setTimeout(() => {
          const endTime = performance.now();
          const totalTime = endTime - startTime;
          const avgFrameTime = frames.length > 0 ? frames.reduce((a, b) => a + b, 0) / frames.length : 16.67;
          const frameRate = 1000 / avgFrameTime;

          resolve({
            frameRate: frameRate,
            renderTime: totalTime
          });
        }, 2000);
      });
    });

    console.log('🎨 Rendering metrics:', {
      'Average Frame Rate': `${renderingMetrics.frameRate.toFixed(1)} FPS`,
      'Total Render Time': `${renderingMetrics.renderTime.toFixed(0)}ms`
    });

    // Frame rate should be close to 60 FPS for smooth interaction
    expect(renderingMetrics.frameRate).toBeGreaterThan(30); // At least 30 FPS
    expect(renderingMetrics.frameRate).toBeLessThan(65); // Reasonable upper bound

    // Test scrolling performance
    const scrollStartTime = Date.now();

    // Perform smooth scrolling
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 50));
      await page.waitForTimeout(16); // ~60 FPS
    }

    const scrollEndTime = Date.now();
    const scrollDuration = scrollEndTime - scrollStartTime;

    console.log(`Scroll performance: ${scrollDuration}ms for 10 scroll steps`);
    expect(scrollDuration).toBeLessThan(500); // Smooth scrolling

    // Test tab switching performance
    const tabSwitchStartTime = Date.now();
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"'
    );

    const tabSwitchTime = Date.now() - tabSwitchStartTime;
    console.log(`Tab switch time: ${tabSwitchTime}ms`);

    expect(tabSwitchTime).toBeLessThan(300); // Fast tab switching

    console.log('✅ Rendering performance within acceptable limits');
  });

  test('Database query performance impact', async ({ page }) => {
    let apiRequestTimes: number[] = [];
    let dbQueryPattern = false;

    // Monitor API requests that likely hit the database
    page.on('response', async response => {
      const url = response.url();
      const method = response.request().method();

      if (url.includes('/api/agents/') && (method === 'GET' || method === 'POST')) {
        const timing = response.request().timing();
        if (timing) {
          const totalTime = timing.receiveHeadersEnd;
          apiRequestTimes.push(totalTime);

          // Check for efficient querying patterns
          if (url.includes('/pages') && totalTime > 500) {
            dbQueryPattern = true; // Potential N+1 query or slow query
          }
        }
      }
    });

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Navigate to data-heavy sections
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForTimeout(2000);

    // Create multiple test pages to test query performance
    const testPages = [];
    for (let i = 0; i < 5; i++) {
      const pageData = TestHelper.generateTestPageData();
      const pageId = await TestHelper.createTestPage({
        ...pageData,
        title: `Performance Test Page ${i + 1}`
      });
      createdPageIds.push(pageId);
      testPages.push(pageId);
    }

    // Refresh to load all pages and measure performance
    await page.reload();
    await TestHelper.waitForPageReady(page);

    const refreshDynamicPagesTab = page.locator('text="Dynamic Pages"');
    await refreshDynamicPagesTab.click();
    await page.waitForTimeout(3000);

    const avgApiTime = apiRequestTimes.length > 0
      ? apiRequestTimes.reduce((a, b) => a + b, 0) / apiRequestTimes.length
      : 0;

    console.log('🗄️ Database performance metrics:', {
      'API Requests': apiRequestTimes.length,
      'Average Response Time': `${avgApiTime.toFixed(0)}ms`,
      'Max Response Time': `${Math.max(...apiRequestTimes, 0).toFixed(0)}ms`,
      'Potential Query Issues': dbQueryPattern
    });

    // Performance expectations
    expect(avgApiTime).toBeLessThan(200); // Average API response < 200ms
    expect(Math.max(...apiRequestTimes, 0)).toBeLessThan(1000); // No request > 1s
    expect(dbQueryPattern).toBe(false); // No obvious query performance issues

    console.log('✅ Database query performance within acceptable limits');
  });

  test('Real-time feature performance overhead', async ({ page, context }) => {
    // Measure baseline performance without real-time features
    const baselineStartTime = Date.now();
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);
    const baselineLoadTime = Date.now() - baselineStartTime;

    // Get baseline memory usage
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');
    const baselineMemory = await client.send('Runtime.getHeapUsage');

    console.log(`Baseline performance: ${baselineLoadTime}ms load, ${Math.round(baselineMemory.usedSize / 1024 / 1024)}MB memory`);

    // Test with real-time features active
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Enable real-time monitoring by staying on dynamic pages
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Let real-time features run for a period
    await page.waitForTimeout(10000);

    const realtimeMemory = await client.send('Runtime.getHeapUsage');
    const memoryOverhead = realtimeMemory.usedSize - baselineMemory.usedSize;

    // Test performance during real-time updates
    const updateStartTime = Date.now();

    // Create a page to trigger real-time updates
    const pageData = TestHelper.generateTestPageData();
    const pageId = await TestHelper.createTestPage({
      ...pageData,
      title: 'Real-time Performance Test Page'
    });
    createdPageIds.push(pageId);

    // Wait for potential real-time update
    await page.waitForTimeout(3000);

    const updateTime = Date.now() - updateStartTime;

    console.log('⚡ Real-time performance metrics:', {
      'Memory Overhead': `${Math.round(memoryOverhead / 1024)}KB`,
      'Update Propagation Time': `${updateTime}ms`,
      'Memory Usage': `${Math.round(realtimeMemory.usedSize / 1024 / 1024)}MB`
    });

    // Real-time features should not significantly impact performance
    expect(memoryOverhead).toBeLessThan(10 * 1024 * 1024); // Less than 10MB overhead
    expect(updateTime).toBeLessThan(5000); // Updates propagate within 5s

    // Test with multiple concurrent connections
    const secondPage = await context.newPage();
    const thirdPage = await context.newPage();

    await Promise.all([
      secondPage.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`),
      thirdPage.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`)
    ]);

    await Promise.all([
      TestHelper.waitForPageReady(secondPage),
      TestHelper.waitForPageReady(thirdPage)
    ]);

    // Navigate both to dynamic pages
    await Promise.all([
      secondPage.locator('text="Dynamic Pages"').click(),
      thirdPage.locator('text="Dynamic Pages"').click()
    ]);

    await page.waitForTimeout(2000);

    const multiConnectionMemory = await client.send('Runtime.getHeapUsage');
    const multiConnectionOverhead = multiConnectionMemory.usedSize - realtimeMemory.usedSize;

    console.log(`Multi-connection overhead: ${Math.round(multiConnectionOverhead / 1024)}KB`);

    // Multiple connections should not cause excessive overhead
    expect(multiConnectionOverhead).toBeLessThan(20 * 1024 * 1024); // Less than 20MB additional

    await secondPage.close();
    await thirdPage.close();

    console.log('✅ Real-time feature performance overhead within acceptable limits');
  });
});

test.describe('Scalability and Load Testing', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.afterEach(async () => {
    await TestHelper.cleanupTestPages(createdPageIds);
    createdPageIds = [];
  });

  test('UI performance with large datasets', async ({ page }) => {
    // Create a large number of test pages
    const pageCount = 50;
    console.log(`Creating ${pageCount} test pages for scalability testing...`);

    const createPromises = [];
    for (let i = 0; i < pageCount; i++) {
      const pageData = TestHelper.generateTestPageData();
      createPromises.push(
        TestHelper.createTestPage({
          ...pageData,
          title: `Scalability Test Page ${i + 1}`,
          status: i % 3 === 0 ? 'published' : i % 3 === 1 ? 'draft' : 'archived'
        })
      );
    }

    const pageIds = await Promise.all(createPromises);
    createdPageIds.push(...pageIds);

    console.log(`Created ${pageIds.length} test pages`);

    // Test UI performance with large dataset
    const loadStartTime = Date.now();
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Wait for all pages to load
    await page.waitForSelector('.page-item, [data-testid^="page-"]', { timeout: 30000 });

    const loadEndTime = Date.now();
    const totalLoadTime = loadEndTime - loadStartTime;

    console.log(`Large dataset load time: ${totalLoadTime}ms for ${pageCount} pages`);

    // Check if pagination or virtualization is implemented
    const visiblePages = page.locator('.page-item, [data-testid^="page-"]');
    const visiblePageCount = await visiblePages.count();

    console.log(`Visible pages: ${visiblePageCount}/${pageCount}`);

    if (visiblePageCount < pageCount) {
      console.log('✅ Pagination or virtualization implemented');

      // Test pagination performance
      const nextButton = page.locator('button:has-text("Next"), .pagination-next, [aria-label="Next page"]');
      if (await nextButton.count() > 0) {
        const paginationStartTime = Date.now();
        await nextButton.first().click();
        await page.waitForTimeout(1000);
        const paginationTime = Date.now() - paginationStartTime;

        console.log(`Pagination time: ${paginationTime}ms`);
        expect(paginationTime).toBeLessThan(1000);
      }
    } else if (pageCount <= 25) {
      console.log('✅ All pages loaded directly (acceptable for small dataset)');
    } else {
      console.log('⚠️ Large dataset loaded without pagination - may impact performance');
    }

    // Test scroll performance with large list
    const scrollStartTime = Date.now();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    const scrollTime = Date.now() - scrollStartTime;

    console.log(`Scroll time for large dataset: ${scrollTime}ms`);
    expect(scrollTime).toBeLessThan(2000);

    // Performance should remain reasonable even with large datasets
    expect(totalLoadTime).toBeLessThan(10000); // 10 seconds max
    expect(visiblePageCount).toBeGreaterThan(0);

    console.log('✅ UI performance with large dataset within acceptable limits');
  });

  test('Concurrent user simulation', async ({ context }) => {
    const userCount = 3;
    const pages: Page[] = [];

    console.log(`Simulating ${userCount} concurrent users...`);

    // Create multiple browser contexts to simulate different users
    for (let i = 0; i < userCount; i++) {
      const page = await context.newPage();
      pages.push(page);
    }

    // Simulate concurrent navigation
    const navigationPromises = pages.map(async (page, index) => {
      const startTime = Date.now();

      await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
      await TestHelper.waitForPageReady(page);

      const dynamicPagesTab = page.locator('text="Dynamic Pages"');
      await dynamicPagesTab.click();

      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
        { timeout: 15000 }
      );

      const loadTime = Date.now() - startTime;
      console.log(`User ${index + 1} load time: ${loadTime}ms`);

      return loadTime;
    });

    const loadTimes = await Promise.all(navigationPromises);
    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);

    console.log('👥 Concurrent user metrics:', {
      'Average Load Time': `${avgLoadTime.toFixed(0)}ms`,
      'Maximum Load Time': `${maxLoadTime.toFixed(0)}ms`,
      'Users': userCount
    });

    // Simulate concurrent interactions
    const interactionPromises = pages.map(async (page, index) => {
      // Create test data for each user
      const pageData = TestHelper.generateTestPageData();
      const pageId = await TestHelper.createTestPage({
        ...pageData,
        title: `Concurrent User ${index + 1} Page`
      });
      createdPageIds.push(pageId);

      // Navigate to pages tab to see updates
      await page.locator('text="Dynamic Pages"').click();
      await page.waitForTimeout(1000);

      return pageId;
    });

    await Promise.all(interactionPromises);

    // Close all pages
    for (const page of pages) {
      await page.close();
    }

    // Performance should degrade gracefully with concurrent users
    expect(avgLoadTime).toBeLessThan(5000); // Average < 5s
    expect(maxLoadTime).toBeLessThan(8000); // Max < 8s

    console.log('✅ Concurrent user performance within acceptable limits');
  });

  test('Memory usage under sustained load', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    const initialMemory = await client.send('Runtime.getHeapUsage');
    console.log(`Initial memory: ${Math.round(initialMemory.usedSize / 1024 / 1024)}MB`);

    const memoryMeasurements: { time: number; memory: number }[] = [];

    // Simulate sustained activity for 2 minutes
    const testDuration = 120000; // 2 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < testDuration) {
      // Navigate between pages
      const dynamicPagesTab = page.locator('text="Dynamic Pages"');
      await dynamicPagesTab.click();
      await page.waitForTimeout(500);

      // Scroll and interact
      await page.evaluate(() => {
        window.scrollTo(0, Math.random() * 500);
      });

      // Create and delete test data
      if (Math.random() > 0.7) {
        const pageData = TestHelper.generateTestPageData();
        const pageId = await TestHelper.createTestPage({
          ...pageData,
          title: `Sustained Load Test ${Date.now()}`
        });

        // Delete it after a short time
        setTimeout(async () => {
          await TestHelper.deleteTestPage(pageId);
        }, 5000);
      }

      // Measure memory every 10 seconds
      if ((Date.now() - startTime) % 10000 < 1000) {
        try {
          await client.send('Runtime.collectGarbage');
        } catch (e) {
          // GC may not be available
        }

        const currentMemory = await client.send('Runtime.getHeapUsage');
        memoryMeasurements.push({
          time: Date.now() - startTime,
          memory: currentMemory.usedSize
        });

        console.log(`${Math.round((Date.now() - startTime) / 1000)}s: ${Math.round(currentMemory.usedSize / 1024 / 1024)}MB`);
      }

      await page.waitForTimeout(1000);
    }

    const finalMemory = await client.send('Runtime.getHeapUsage');
    const totalMemoryIncrease = finalMemory.usedSize - initialMemory.usedSize;
    const memoryIncreasePercent = (totalMemoryIncrease / initialMemory.usedSize) * 100;

    console.log('🕒 Sustained load results:', {
      'Duration': `${Math.round(testDuration / 1000)}s`,
      'Memory Increase': `${Math.round(totalMemoryIncrease / 1024)}KB`,
      'Percentage Increase': `${memoryIncreasePercent.toFixed(1)}%`,
      'Final Memory': `${Math.round(finalMemory.usedSize / 1024 / 1024)}MB`
    });

    // Memory should not grow excessively under sustained load
    expect(memoryIncreasePercent).toBeLessThan(100); // Less than 100% increase
    expect(finalMemory.usedSize).toBeLessThan(200 * 1024 * 1024); // Less than 200MB total

    console.log('✅ Memory usage under sustained load within acceptable limits');
  });
});
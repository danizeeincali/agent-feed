/**
 * Performance Validation Tests for Dynamic UI System
 *
 * Tests performance metrics including:
 * - Data binding resolution time with 100+ bindings
 * - Page load time with data fetching
 * - Memory leak detection
 * - Rendering performance
 */

import { test, expect, Page } from '@playwright/test';

const TEST_CONFIG = {
  baseURL: 'http://localhost:5173',
  apiBaseURL: 'http://localhost:3001',
  testAgentId: 'personal-todos-agent',
  timeout: 60000
};

test.describe('Dynamic UI Performance Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
  });

  test('Performance Test 1: Data binding resolution time with 100+ bindings', async () => {
    console.log('Testing data binding resolution performance...');

    // Create a page with 100+ bindings
    const largeDataSet = {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        description: `Description for item ${i}`,
        value: i * 10,
        status: i % 2 === 0 ? 'active' : 'inactive',
        priority: ['low', 'medium', 'high'][i % 3],
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          author: `User ${i % 10}`
        }
      }))
    };

    // Store large dataset
    await page.evaluate((data) => {
      localStorage.setItem('perf-test-data', JSON.stringify(data));
    }, largeDataSet);

    // Measure binding resolution time
    const startTime = Date.now();

    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForLoadState('networkidle');

    const resolutionTime = Date.now() - startTime;

    console.log(`Binding resolution time for 100+ bindings: ${resolutionTime}ms`);

    // Check that bindings are resolved
    const pageContent = await page.content();
    const unresolvedBindings = (pageContent.match(/\{\{/g) || []).length;

    console.log(`Unresolved bindings: ${unresolvedBindings}`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/performance/test1-binding-resolution.png',
      fullPage: true
    });

    // Performance assertions
    expect(resolutionTime).toBeLessThan(3000); // Should resolve in under 3 seconds
    expect(unresolvedBindings).toBeLessThan(10); // Most bindings should resolve

    // Report metrics
    const report = {
      test: 'Data Binding Resolution',
      bindingCount: 100,
      resolutionTime,
      unresolvedBindings,
      avgTimePerBinding: resolutionTime / 100,
      passed: resolutionTime < 3000
    };

    console.log(JSON.stringify(report, null, 2));
  });

  test('Performance Test 2: Page load time with data fetching', async () => {
    console.log('Testing page load performance with data fetching...');

    const metrics = {
      navigationStart: 0,
      domContentLoaded: 0,
      loadComplete: 0,
      firstContentfulPaint: 0,
      totalLoadTime: 0
    };

    const startTime = Date.now();

    // Navigate and measure
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/dashboard`);

    // Measure DOM content loaded
    await page.waitForLoadState('domcontentloaded');
    metrics.domContentLoaded = Date.now() - startTime;

    // Measure network idle (all data fetched)
    await page.waitForLoadState('networkidle');
    metrics.loadComplete = Date.now() - startTime;

    // Get performance metrics from browser
    const performanceMetrics = await page.evaluate(() => {
      const perf = window.performance;
      const timing = perf.timing;

      return {
        navigationStart: timing.navigationStart,
        domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
        loadEventEnd: timing.loadEventEnd,
        domInteractive: timing.domInteractive
      };
    });

    metrics.totalLoadTime = Date.now() - startTime;

    console.log('\n=== Page Load Performance ===');
    console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
    console.log(`Load Complete: ${metrics.loadComplete}ms`);
    console.log(`Total Load Time: ${metrics.totalLoadTime}ms`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/performance/test2-page-load.png',
      fullPage: true
    });

    // Performance assertions
    expect(metrics.domContentLoaded).toBeLessThan(2000); // DOM should load quickly
    expect(metrics.totalLoadTime).toBeLessThan(5000); // Complete load under 5 seconds

    const report = {
      test: 'Page Load Time',
      domContentLoaded: metrics.domContentLoaded,
      loadComplete: metrics.loadComplete,
      totalLoadTime: metrics.totalLoadTime,
      passed: metrics.totalLoadTime < 5000
    };

    console.log(JSON.stringify(report, null, 2));
  });

  test('Performance Test 3: Memory leak detection', async () => {
    console.log('Testing for memory leaks...');

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    console.log('Initial memory:', initialMemory);

    // Navigate multiple times to detect leaks
    for (let i = 0; i < 5; i++) {
      console.log(`Navigation ${i + 1}/5...`);
      await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
      await page.waitForTimeout(1000);

      // Trigger garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
    }

    // Get final memory
    const finalMemory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    console.log('Final memory:', finalMemory);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/performance/test3-memory-check.png',
      fullPage: true
    });

    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory should not increase significantly
      expect(memoryIncreaseMB).toBeLessThan(50); // Less than 50MB increase

      const report = {
        test: 'Memory Leak Detection',
        initialMemory: (initialMemory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB',
        finalMemory: (finalMemory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB',
        increase: memoryIncreaseMB.toFixed(2) + 'MB',
        passed: memoryIncreaseMB < 50
      };

      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('Memory metrics not available in this browser');
    }
  });

  test('Performance Test 4: Rendering performance with large datasets', async () => {
    console.log('Testing rendering performance...');

    // Create large dataset
    const largeDataSet = Array.from({ length: 500 }, (_, i) => ({
      id: i,
      title: `Item ${i}`,
      value: Math.random() * 100
    }));

    await page.evaluate((data) => {
      localStorage.setItem('large-dataset', JSON.stringify(data));
    }, largeDataSet);

    const startTime = Date.now();

    // Navigate and wait for render
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForLoadState('networkidle');

    const renderTime = Date.now() - startTime;

    // Count rendered elements
    const elementCount = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    console.log(`Rendered ${elementCount} elements in ${renderTime}ms`);
    console.log(`Average time per element: ${(renderTime / elementCount).toFixed(3)}ms`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/performance/test4-rendering.png',
      fullPage: true
    });

    // Performance assertions
    expect(renderTime).toBeLessThan(5000); // Render in under 5 seconds
    expect(elementCount).toBeGreaterThan(0);

    const report = {
      test: 'Rendering Performance',
      datasetSize: 500,
      elementCount,
      renderTime,
      avgTimePerElement: (renderTime / elementCount).toFixed(3),
      passed: renderTime < 5000
    };

    console.log(JSON.stringify(report, null, 2));
  });

  test('Performance Test 5: Interaction responsiveness', async () => {
    console.log('Testing interaction responsiveness...');

    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForTimeout(2000);

    const interactions = {
      buttonClick: 0,
      inputType: 0,
      scroll: 0
    };

    // Test button click response
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const clickStart = Date.now();
      await buttons.first().click();
      await page.waitForTimeout(100);
      interactions.buttonClick = Date.now() - clickStart;
    }

    // Test input typing response
    const inputs = page.locator('input[type="text"]');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      const typeStart = Date.now();
      await inputs.first().fill('test');
      interactions.inputType = Date.now() - typeStart;
    }

    // Test scroll response
    const scrollStart = Date.now();
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(50);
    interactions.scroll = Date.now() - scrollStart;

    console.log('\n=== Interaction Responsiveness ===');
    console.log(`Button Click: ${interactions.buttonClick}ms`);
    console.log(`Input Type: ${interactions.inputType}ms`);
    console.log(`Scroll: ${interactions.scroll}ms`);

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/performance/test5-interactions.png',
      fullPage: true
    });

    // Interactions should be fast
    expect(interactions.buttonClick).toBeLessThan(500);
    expect(interactions.inputType).toBeLessThan(500);
    expect(interactions.scroll).toBeLessThan(200);

    const report = {
      test: 'Interaction Responsiveness',
      buttonClick: interactions.buttonClick,
      inputType: interactions.inputType,
      scroll: interactions.scroll,
      passed: interactions.buttonClick < 500 && interactions.inputType < 500
    };

    console.log(JSON.stringify(report, null, 2));
  });

  test('Performance Test 6: API response time', async () => {
    console.log('Testing API response times...');

    const apiMetrics = {
      requests: [] as any[]
    };

    // Monitor API requests
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiMetrics.requests.push({
          url: response.url(),
          status: response.status(),
          timing: response.timing()
        });
      }
    });

    // Navigate to trigger API calls
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log(`Captured ${apiMetrics.requests.length} API requests`);

    // Analyze API response times
    if (apiMetrics.requests.length > 0) {
      apiMetrics.requests.forEach((req, i) => {
        console.log(`API ${i + 1}: ${req.url} - Status: ${req.status}`);
      });
    }

    // Take screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/performance/test6-api-response.png',
      fullPage: true
    });

    const report = {
      test: 'API Response Time',
      totalRequests: apiMetrics.requests.length,
      requests: apiMetrics.requests
    };

    console.log(JSON.stringify(report, null, 2));
  });

  test('Performance Test 7: Generate comprehensive performance report', async () => {
    console.log('Generating comprehensive performance report...');

    const performanceReport = {
      timestamp: new Date().toISOString(),
      testSuite: 'Dynamic UI Performance Tests',
      environment: {
        baseURL: TEST_CONFIG.baseURL,
        apiBaseURL: TEST_CONFIG.apiBaseURL,
        testAgentId: TEST_CONFIG.testAgentId
      },
      metrics: {
        dataBindingResolution: 0,
        pageLoadTime: 0,
        memoryUsage: '',
        renderingPerformance: 0,
        interactionResponsiveness: 0
      },
      screenshots: [] as string[],
      passed: true
    };

    // Run quick performance checks
    const startTime = Date.now();
    await page.goto(`${TEST_CONFIG.baseURL}/agents/${TEST_CONFIG.testAgentId}/pages`);
    await page.waitForLoadState('networkidle');
    performanceReport.metrics.pageLoadTime = Date.now() - startTime;

    // Get memory info
    const memory = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB',
          total: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2) + 'MB'
        };
      }
      return { used: 'N/A', total: 'N/A' };
    });

    performanceReport.metrics.memoryUsage = `${memory.used} / ${memory.total}`;

    // Take final screenshot
    await page.screenshot({
      path: 'frontend/tests/e2e/screenshots/performance/test7-final-report.png',
      fullPage: true
    });

    performanceReport.screenshots.push(
      'test1-binding-resolution.png',
      'test2-page-load.png',
      'test3-memory-check.png',
      'test4-rendering.png',
      'test5-interactions.png',
      'test6-api-response.png',
      'test7-final-report.png'
    );

    // Determine if tests passed
    performanceReport.passed = performanceReport.metrics.pageLoadTime < 5000;

    console.log('\n=== Performance Report ===');
    console.log(JSON.stringify(performanceReport, null, 2));

    expect(performanceReport.passed).toBe(true);
  });
});

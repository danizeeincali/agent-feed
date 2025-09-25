/**
 * SPARC TESTING PHASE: Performance Baseline Capture
 *
 * This test captures comprehensive performance metrics before and after
 * Claude Code UI removal to ensure no performance regressions.
 */

import { test, expect } from '@playwright/test';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  phase: 'baseline' | 'post-removal';
}

interface LoadMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
}

interface APIPerformanceMetric {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  contentLength?: number;
}

class PerformanceCapture {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIPerformanceMetric[] = [];

  async capturePageLoad(page: any, route: string, phase: 'baseline' | 'post-removal'): Promise<LoadMetrics> {
    const navigationStart = Date.now();

    await page.goto(route);

    // Capture basic load metrics
    const loadMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnect: navigation.connectEnd - navigation.connectStart,
        serverResponse: navigation.responseEnd - navigation.requestStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        pageLoad: navigation.loadEventEnd - navigation.navigationStart
      };
    });

    // Capture Web Vitals if available
    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};

        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.firstContentfulPaint = entries[0]?.startTime;
        });

        try {
          fcpObserver.observe({ entryTypes: ['paint'] });
        } catch (e) {
          // FCP not available
        }

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.largestContentfulPaint = entries[entries.length - 1]?.startTime;
        });

        try {
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not available
        }

        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          vitals.cumulativeLayoutShift = entries.reduce((sum: number, entry: any) => {
            return sum + (entry.hadRecentInput ? 0 : entry.value);
          }, 0);
        });

        try {
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS not available
        }

        // Wait a bit for metrics to be captured
        setTimeout(() => {
          resolve(vitals);
        }, 3000);
      });
    });

    const finalMetrics: LoadMetrics = {
      ...loadMetrics,
      ...(webVitals as any)
    };

    // Store metrics
    Object.entries(finalMetrics).forEach(([key, value]) => {
      if (typeof value === 'number' && value > 0) {
        this.metrics.push({
          name: `${route.replace('/', '') || 'root'}-${key}`,
          value,
          unit: 'ms',
          timestamp: Date.now(),
          phase
        });
      }
    });

    return finalMetrics;
  }

  async captureAPIPerformance(page: any, endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<APIPerformanceMetric> {
    const startTime = performance.now();

    let response;
    try {
      if (method === 'GET') {
        response = await page.request.get(endpoint);
      } else {
        response = await page.request.post(endpoint, { data });
      }
    } catch (error) {
      response = { status: () => 0, headers: () => ({}) };
    }

    const endTime = performance.now();
    const responseTime = endTime - startTime;

    const metric: APIPerformanceMetric = {
      endpoint,
      method,
      responseTime,
      status: response.status(),
      contentLength: parseInt(response.headers()['content-length'] || '0')
    };

    this.apiMetrics.push(metric);
    return metric;
  }

  getMetrics(): { page: PerformanceMetric[]; api: APIPerformanceMetric[] } {
    return {
      page: this.metrics,
      api: this.apiMetrics
    };
  }

  comparePhases(): any {
    const baseline = this.metrics.filter(m => m.phase === 'baseline');
    const postRemoval = this.metrics.filter(m => m.phase === 'post-removal');

    const comparison: any = {};

    baseline.forEach(baselineMetric => {
      const postMetric = postRemoval.find(p => p.name === baselineMetric.name);
      if (postMetric) {
        const improvement = baselineMetric.value - postMetric.value;
        const percentChange = (improvement / baselineMetric.value) * 100;

        comparison[baselineMetric.name] = {
          baseline: baselineMetric.value,
          postRemoval: postMetric.value,
          improvement,
          percentChange: parseFloat(percentChange.toFixed(2))
        };
      }
    });

    return comparison;
  }

  generateReport(): string {
    const comparison = this.comparePhases();
    const avgBaseline = this.metrics
      .filter(m => m.phase === 'baseline')
      .reduce((sum, m) => sum + m.value, 0) / this.metrics.filter(m => m.phase === 'baseline').length;

    const avgPostRemoval = this.metrics
      .filter(m => m.phase === 'post-removal')
      .reduce((sum, m) => sum + m.value, 0) / this.metrics.filter(m => m.phase === 'post-removal').length;

    return JSON.stringify({
      testSuite: 'Performance Baseline Capture',
      timestamp: new Date().toISOString(),
      summary: {
        avgBaselineLoadTime: avgBaseline || 0,
        avgPostRemovalLoadTime: avgPostRemoval || 0,
        overallImprovement: avgBaseline && avgPostRemoval ? avgBaseline - avgPostRemoval : 0,
        totalMetricsCaptured: this.metrics.length,
        apiTestsConducted: this.apiMetrics.length
      },
      comparison,
      allMetrics: this.getMetrics(),
      regressions: Object.entries(comparison).filter(([_, data]: [string, any]) => data.improvement < 0),
      improvements: Object.entries(comparison).filter(([_, data]: [string, any]) => data.improvement > 0)
    }, null, 2);
  }
}

test.describe('Performance Baseline Capture Suite', () => {
  let performanceCapture: PerformanceCapture;

  test.beforeEach(async () => {
    performanceCapture = new PerformanceCapture();
  });

  test('Capture Pre-Removal Performance Baseline', async ({ page }) => {
    test.slow();

    console.log('📊 Capturing performance baseline...');

    // Capture load performance for key routes
    const routes = ['/', '/agents', '/analytics', '/activity'];

    for (const route of routes) {
      console.log(`Measuring ${route}...`);

      const loadMetrics = await performanceCapture.capturePageLoad(page, route, 'baseline');

      // Log key metrics
      console.log(`${route} baseline:`, {
        pageLoad: loadMetrics.domContentLoaded,
        loadComplete: loadMetrics.loadComplete
      });

      // Validate reasonable performance
      expect(loadMetrics.domContentLoaded).toBeLessThan(15000); // 15s max
      expect(loadMetrics.loadComplete).toBeLessThan(20000); // 20s max
    }

    // Capture API performance
    const apiEndpoints = [
      { endpoint: '/api/posts', method: 'GET' as const },
      { endpoint: '/api/agents', method: 'GET' as const },
      { endpoint: '/api/claude-code/health', method: 'GET' as const },
      { endpoint: '/api/claude-code/streaming-chat', method: 'POST' as const, data: { message: 'baseline test' } }
    ];

    for (const api of apiEndpoints) {
      const apiMetric = await performanceCapture.captureAPIPerformance(
        page,
        api.endpoint,
        api.method,
        api.data
      );

      console.log(`API ${api.endpoint} baseline: ${apiMetric.responseTime.toFixed(0)}ms`);

      // Validate API performance
      expect(apiMetric.responseTime).toBeLessThan(10000); // 10s max
    }

    console.log('✅ Baseline performance captured');
  });

  test('Capture Post-Removal Performance', async ({ page }) => {
    test.slow();

    console.log('📊 Capturing post-removal performance...');

    // Same routes as baseline
    const routes = ['/', '/agents', '/analytics', '/activity'];

    for (const route of routes) {
      console.log(`Measuring ${route} post-removal...`);

      const loadMetrics = await performanceCapture.capturePageLoad(page, route, 'post-removal');

      console.log(`${route} post-removal:`, {
        pageLoad: loadMetrics.domContentLoaded,
        loadComplete: loadMetrics.loadComplete
      });

      // Should still meet performance requirements
      expect(loadMetrics.domContentLoaded).toBeLessThan(15000);
      expect(loadMetrics.loadComplete).toBeLessThan(20000);
    }

    // Same API endpoints
    const apiEndpoints = [
      { endpoint: '/api/posts', method: 'GET' as const },
      { endpoint: '/api/agents', method: 'GET' as const },
      { endpoint: '/api/claude-code/health', method: 'GET' as const },
      { endpoint: '/api/claude-code/streaming-chat', method: 'POST' as const, data: { message: 'post-removal test' } }
    ];

    for (const api of apiEndpoints) {
      const apiMetric = await performanceCapture.captureAPIPerformance(
        page,
        api.endpoint,
        api.method,
        api.data
      );

      console.log(`API ${api.endpoint} post-removal: ${apiMetric.responseTime.toFixed(0)}ms`);

      // Should maintain or improve performance
      expect(apiMetric.responseTime).toBeLessThan(10000);
    }

    console.log('✅ Post-removal performance captured');
  });

  test('Memory Usage Assessment', async ({ page }) => {
    console.log('🧠 Assessing memory usage...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get memory usage metrics
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });

    if (memoryUsage) {
      console.log('Memory metrics:', memoryUsage);

      // Basic memory validation
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(200 * 1024 * 1024); // 200MB max

      const memoryEfficiency = (memoryUsage.usedJSHeapSize / memoryUsage.totalJSHeapSize) * 100;
      console.log(`Memory efficiency: ${memoryEfficiency.toFixed(1)}%`);
    } else {
      console.log('Memory metrics not available in this environment');
    }
  });

  test('Resource Loading Analysis', async ({ page }) => {
    console.log('📦 Analyzing resource loading...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get resource timing
    const resourceTimings = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((entry: any) => ({
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0,
        type: entry.initiatorType
      }));
    });

    console.log(`Loaded ${resourceTimings.length} resources`);

    // Analyze large resources
    const largeResources = resourceTimings.filter((r: any) => r.size > 100 * 1024); // 100KB+
    console.log(`Large resources (>100KB): ${largeResources.length}`);

    // Analyze slow resources
    const slowResources = resourceTimings.filter((r: any) => r.duration > 1000); // 1s+
    console.log(`Slow resources (>1s): ${slowResources.length}`);

    // Should not have excessive large or slow resources
    expect(largeResources.length).toBeLessThan(10);
    expect(slowResources.length).toBeLessThan(5);
  });

  test('Network Performance Analysis', async ({ page }) => {
    console.log('🌐 Analyzing network performance...');

    // Monitor network requests
    const networkRequests: any[] = [];

    page.on('response', response => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        size: parseInt(response.headers()['content-length'] || '0'),
        time: Date.now()
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log(`Network requests: ${networkRequests.length}`);

    // Analyze failed requests
    const failedRequests = networkRequests.filter(r => r.status >= 400);
    console.log(`Failed requests: ${failedRequests.length}`);

    // Filter out expected 404s for removed claude-code route
    const unexpectedFailures = failedRequests.filter(r =>
      !r.url.includes('claude-code') || r.status !== 404
    );

    expect(unexpectedFailures.length).toBeLessThan(3);

    // Analyze request sizes
    const totalSize = networkRequests.reduce((sum, r) => sum + r.size, 0);
    console.log(`Total network transfer: ${(totalSize / 1024).toFixed(0)}KB`);

    // Should not exceed reasonable size limits
    expect(totalSize).toBeLessThan(10 * 1024 * 1024); // 10MB max
  });

  test.afterAll(async ({ page }) => {
    const report = performanceCapture.generateReport();

    test.info().attach('performance-baseline-report.json', {
      body: report,
      contentType: 'application/json'
    });

    console.log('=== PERFORMANCE BASELINE CAPTURE COMPLETE ===');
    console.log(report);

    // Take final performance screenshot
    await page.goto('/');
    await page.screenshot({
      path: 'tests/screenshots/performance-final-state.png',
      fullPage: true
    });

    // Assert no major regressions
    const comparison = performanceCapture.comparePhases();
    const significantRegressions = Object.entries(comparison).filter(
      ([_, data]: [string, any]) => data.percentChange < -25 // 25% slower
    );

    expect(significantRegressions.length).toBeLessThan(2);

    console.log('✅ PERFORMANCE ANALYSIS COMPLETED');
  });
});

test.describe('Browser Compatibility Performance Tests', () => {
  test('Cross-browser performance validation', async ({ page, browserName }) => {
    console.log(`🌐 Testing performance on ${browserName}...`);

    const startTime = performance.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = performance.now() - startTime;

    console.log(`${browserName} load time: ${loadTime.toFixed(0)}ms`);

    // Performance should be reasonable across browsers
    expect(loadTime).toBeLessThan(15000); // 15s max

    // Test key interactions
    const interactionStartTime = performance.now();
    await page.click('a[href="/agents"]');
    await page.waitForLoadState('networkidle');
    const navigationTime = performance.now() - interactionStartTime;

    console.log(`${browserName} navigation time: ${navigationTime.toFixed(0)}ms`);
    expect(navigationTime).toBeLessThan(8000); // 8s max
  });
});
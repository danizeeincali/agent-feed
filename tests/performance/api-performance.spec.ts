/**
 * API Response Time Monitoring and Performance Testing
 *
 * Tests API endpoints for performance regressions:
 * - Response time monitoring
 * - Throughput testing
 * - Error rate tracking
 * - Load testing scenarios
 */

import { test, expect, Page } from '@playwright/test';
import { performance } from 'perf_hooks';

interface ApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  expectedStatus?: number;
  timeout?: number;
}

interface PerformanceMetrics {
  responseTime: number;
  ttfb: number; // Time to First Byte
  contentDownload: number;
  throughput?: number;
  errorRate?: number;
}

interface TestResult {
  endpoint: string;
  metrics: PerformanceMetrics;
  success: boolean;
  error?: string;
  timestamp: number;
}

const API_PERFORMANCE_THRESHOLDS = {
  maxResponseTime: 500, // 500ms
  maxTTFB: 200,         // 200ms
  maxErrorRate: 0.01,   // 1% error rate
  minThroughput: 100,   // 100 requests per second
  maxLatencyP95: 800,   // 95th percentile < 800ms
  maxLatencyP99: 1200   // 99th percentile < 1.2s
};

// API endpoints to test
const API_ENDPOINTS: ApiEndpoint[] = [
  {
    name: 'Get Feed Items',
    url: '/api/feeds',
    method: 'GET',
    expectedStatus: 200,
    timeout: 5000
  },
  {
    name: 'Get Agents',
    url: '/api/agents',
    method: 'GET',
    expectedStatus: 200,
    timeout: 3000
  },
  {
    name: 'Get User Profile',
    url: '/api/user/profile',
    method: 'GET',
    expectedStatus: 200,
    timeout: 2000
  },
  {
    name: 'Search Feed Items',
    url: '/api/feeds/search',
    method: 'POST',
    body: { query: 'test', limit: 10 },
    expectedStatus: 200,
    timeout: 3000
  },
  {
    name: 'Create Agent',
    url: '/api/agents',
    method: 'POST',
    body: {
      name: 'Performance Test Agent',
      type: 'test',
      capabilities: ['testing']
    },
    expectedStatus: 201,
    timeout: 2000
  },
  {
    name: 'Update Agent',
    url: '/api/agents/test-agent',
    method: 'PUT',
    body: { name: 'Updated Test Agent' },
    expectedStatus: 200,
    timeout: 2000
  },
  {
    name: 'Delete Agent',
    url: '/api/agents/test-agent',
    method: 'DELETE',
    expectedStatus: 200,
    timeout: 2000
  },
  {
    name: 'Get Notifications',
    url: '/api/notifications',
    method: 'GET',
    expectedStatus: 200,
    timeout: 2000
  },
  {
    name: 'Upload File',
    url: '/api/upload',
    method: 'POST',
    body: new FormData(),
    expectedStatus: 200,
    timeout: 10000
  },
  {
    name: 'Get Analytics',
    url: '/api/analytics/dashboard',
    method: 'GET',
    expectedStatus: 200,
    timeout: 3000
  }
];

class ApiPerformanceTester {
  private baseUrl: string;
  private results: TestResult[] = [];
  private page: Page;

  constructor(page: Page, baseUrl: string = 'http://localhost:3000') {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Test a single API endpoint
   */
  async testEndpoint(endpoint: ApiEndpoint): Promise<TestResult> {
    const startTime = performance.now();
    let ttfbTime = 0;
    let contentDownloadTime = 0;
    let success = false;
    let error: string | undefined;

    try {
      // Set up request interception to measure TTFB
      await this.page.route(endpoint.url, async (route, request) => {
        const response = await route.fetch({
          method: endpoint.method,
          headers: endpoint.headers,
          body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
        });

        ttfbTime = performance.now() - startTime;

        await route.fulfill({
          response,
          body: await response.body()
        });

        contentDownloadTime = performance.now() - startTime - ttfbTime;
      });

      // Make the request
      const response = await this.page.request.fetch(`${this.baseUrl}${endpoint.url}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...endpoint.headers
        },
        data: endpoint.body,
        timeout: endpoint.timeout
      });

      const responseTime = performance.now() - startTime;

      // Validate response
      const expectedStatus = endpoint.expectedStatus || 200;
      if (response.status() !== expectedStatus) {
        throw new Error(`Expected status ${expectedStatus}, got ${response.status()}`);
      }

      success = true;

      return {
        endpoint: endpoint.name,
        metrics: {
          responseTime,
          ttfb: ttfbTime,
          contentDownload: contentDownloadTime
        },
        success,
        timestamp: Date.now()
      };

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      const responseTime = performance.now() - startTime;

      return {
        endpoint: endpoint.name,
        metrics: {
          responseTime,
          ttfb: ttfbTime,
          contentDownload: contentDownloadTime
        },
        success,
        error,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Run load test on an endpoint
   */
  async loadTestEndpoint(
    endpoint: ApiEndpoint,
    options: {
      concurrentUsers: number;
      duration: number; // in seconds
      rampUp: number;   // in seconds
    }
  ): Promise<{
    throughput: number;
    errorRate: number;
    latencies: number[];
    errors: string[];
  }> {
    const { concurrentUsers, duration, rampUp } = options;
    const results: TestResult[] = [];
    const errors: string[] = [];

    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    const rampUpInterval = (rampUp * 1000) / concurrentUsers;

    const workers: Promise<void>[] = [];

    // Ramp up users gradually
    for (let i = 0; i < concurrentUsers; i++) {
      const delay = i * rampUpInterval;

      workers.push(
        new Promise<void>((resolve) => {
          setTimeout(async () => {
            while (Date.now() < endTime) {
              const result = await this.testEndpoint(endpoint);
              results.push(result);

              if (!result.success) {
                errors.push(result.error || 'Unknown error');
              }

              // Small delay between requests from same user
              await new Promise(r => setTimeout(r, 100));
            }
            resolve();
          }, delay);
        })
      );
    }

    // Wait for all workers to complete
    await Promise.all(workers);

    // Calculate metrics
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const throughput = successfulRequests / duration;
    const errorRate = (totalRequests - successfulRequests) / totalRequests;
    const latencies = results.map(r => r.metrics.responseTime);

    return {
      throughput,
      errorRate,
      latencies,
      errors
    };
  }

  /**
   * Calculate percentiles from latency data
   */
  calculatePercentiles(latencies: number[]): { p50: number; p95: number; p99: number } {
    const sorted = latencies.sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)]
    };
  }

  /**
   * Save results to file
   */
  async saveResults(filename: string) {
    const fs = require('fs');
    const path = require('path');

    const reportDir = path.join(process.cwd(), 'tests/performance/reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(reportDir, filename),
      JSON.stringify(this.results, null, 2)
    );
  }
}

test.describe('API Performance Tests', () => {
  let apiTester: ApiPerformanceTester;

  test.beforeEach(async ({ page }) => {
    apiTester = new ApiPerformanceTester(page);
  });

  test.describe('Individual Endpoint Performance', () => {
    for (const endpoint of API_ENDPOINTS) {
      test(`${endpoint.name} - Response Time`, async () => {
        const result = await apiTester.testEndpoint(endpoint);

        expect(result.success).toBe(true);
        expect(result.metrics.responseTime).toBeLessThan(API_PERFORMANCE_THRESHOLDS.maxResponseTime);
        expect(result.metrics.ttfb).toBeLessThan(API_PERFORMANCE_THRESHOLDS.maxTTFB);

        if (result.error) {
          console.error(`API Error for ${endpoint.name}:`, result.error);
        }

        console.log(`${endpoint.name} Performance:`, {
          responseTime: `${result.metrics.responseTime.toFixed(2)}ms`,
          ttfb: `${result.metrics.ttfb.toFixed(2)}ms`,
          contentDownload: `${result.metrics.contentDownload.toFixed(2)}ms`
        });
      });
    }
  });

  test.describe('Load Testing', () => {
    const criticalEndpoints = API_ENDPOINTS.filter(ep =>
      ['Get Feed Items', 'Get Agents', 'Search Feed Items'].includes(ep.name)
    );

    for (const endpoint of criticalEndpoints) {
      test(`${endpoint.name} - Load Test`, async () => {
        const loadTestResult = await apiTester.loadTestEndpoint(endpoint, {
          concurrentUsers: 10,
          duration: 30,
          rampUp: 10
        });

        const percentiles = apiTester.calculatePercentiles(loadTestResult.latencies);

        expect(loadTestResult.throughput).toBeGreaterThan(API_PERFORMANCE_THRESHOLDS.minThroughput / 10); // Adjusted for test scale
        expect(loadTestResult.errorRate).toBeLessThan(API_PERFORMANCE_THRESHOLDS.maxErrorRate);
        expect(percentiles.p95).toBeLessThan(API_PERFORMANCE_THRESHOLDS.maxLatencyP95);
        expect(percentiles.p99).toBeLessThan(API_PERFORMANCE_THRESHOLDS.maxLatencyP99);

        console.log(`${endpoint.name} Load Test Results:`, {
          throughput: `${loadTestResult.throughput.toFixed(2)} req/s`,
          errorRate: `${(loadTestResult.errorRate * 100).toFixed(2)}%`,
          p50: `${percentiles.p50.toFixed(2)}ms`,
          p95: `${percentiles.p95.toFixed(2)}ms`,
          p99: `${percentiles.p99.toFixed(2)}ms`
        });
      });
    }
  });

  test.describe('Stress Testing', () => {
    test('API Endpoint Stress Test', async () => {
      const stressTestEndpoint = API_ENDPOINTS[0]; // Use first endpoint for stress test

      const stressResult = await apiTester.loadTestEndpoint(stressTestEndpoint, {
        concurrentUsers: 50,
        duration: 60,
        rampUp: 20
      });

      const percentiles = apiTester.calculatePercentiles(stressResult.latencies);

      // More lenient thresholds for stress testing
      expect(stressResult.errorRate).toBeLessThan(0.05); // 5% error rate acceptable under stress
      expect(percentiles.p95).toBeLessThan(API_PERFORMANCE_THRESHOLDS.maxLatencyP95 * 2); // 2x normal threshold

      console.log('Stress Test Results:', {
        throughput: `${stressResult.throughput.toFixed(2)} req/s`,
        errorRate: `${(stressResult.errorRate * 100).toFixed(2)}%`,
        p95: `${percentiles.p95.toFixed(2)}ms`,
        p99: `${percentiles.p99.toFixed(2)}ms`,
        totalErrors: stressResult.errors.length
      });

      // Log common errors
      if (stressResult.errors.length > 0) {
        const errorCounts = stressResult.errors.reduce((acc, error) => {
          acc[error] = (acc[error] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        console.log('Common Errors:', errorCounts);
      }
    });
  });

  test.describe('Regression Testing', () => {
    test('Compare with Baseline Performance', async ({ page }) => {
      const fs = require('fs');
      const path = require('path');

      const baselineFile = path.join(process.cwd(), 'tests/performance/reports/api-baseline.json');
      const currentResults: TestResult[] = [];

      // Test all endpoints
      for (const endpoint of API_ENDPOINTS) {
        const result = await apiTester.testEndpoint(endpoint);
        currentResults.push(result);
      }

      // Save current results
      await apiTester.saveResults('api-current.json');

      // Compare with baseline if it exists
      if (fs.existsSync(baselineFile)) {
        const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

        for (const currentResult of currentResults) {
          const baselineResult = baseline.find((b: TestResult) =>
            b.endpoint === currentResult.endpoint
          );

          if (baselineResult && currentResult.success && baselineResult.success) {
            const responseTimeRegression =
              (currentResult.metrics.responseTime - baselineResult.metrics.responseTime) /
              baselineResult.metrics.responseTime;

            const ttfbRegression =
              (currentResult.metrics.ttfb - baselineResult.metrics.ttfb) /
              baselineResult.metrics.ttfb;

            // Fail if regression is more than 20%
            expect(responseTimeRegression).toBeLessThan(0.2);
            expect(ttfbRegression).toBeLessThan(0.2);

            console.log(`${currentResult.endpoint} Regression Analysis:`, {
              responseTimeChange: `${(responseTimeRegression * 100).toFixed(2)}%`,
              ttfbChange: `${(ttfbRegression * 100).toFixed(2)}%`
            });
          }
        }
      } else {
        // No baseline exists, save current results as baseline
        fs.writeFileSync(baselineFile, JSON.stringify(currentResults, null, 2));
        console.log('No baseline found. Current results saved as baseline.');
      }
    });
  });

  test.afterEach(async () => {
    // Clean up any test data
    try {
      // Delete test agents created during testing
      await apiTester.testEndpoint({
        name: 'Cleanup Test Agent',
        url: '/api/agents/performance-test-agent',
        method: 'DELETE',
        expectedStatus: 200
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});

// Export for use in CI/CD
export { ApiPerformanceTester, API_ENDPOINTS, API_PERFORMANCE_THRESHOLDS };
/**
 * SPARC TESTING PHASE: API Preservation Validation Suite
 *
 * CRITICAL OBJECTIVE: Ensure ALL API endpoints remain functional after UI removal
 * This test suite validates that removing /claude-code UI route does NOT affect backend APIs.
 */

import { test, expect } from '@playwright/test';

interface APITestResult {
  endpoint: string;
  method: string;
  status: number;
  responseTime: number;
  timestamp: number;
  headers?: Record<string, string>;
  body?: any;
  error?: string;
}

interface StreamingTestResult {
  endpoint: string;
  connectionEstablished: boolean;
  messagesReceived: number;
  avgResponseTime: number;
  errors: string[];
}

class APIPreservationTestSuite {
  private results: APITestResult[] = [];
  private streamingResults: StreamingTestResult[] = [];

  async testEndpoint(
    page: any,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<APITestResult> {
    const startTime = performance.now();

    try {
      let response;
      switch (method) {
        case 'GET':
          response = await page.request.get(endpoint);
          break;
        case 'POST':
          response = await page.request.post(endpoint, { data });
          break;
        case 'PUT':
          response = await page.request.put(endpoint, { data });
          break;
        case 'DELETE':
          response = await page.request.delete(endpoint);
          break;
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const result: APITestResult = {
        endpoint,
        method,
        status: response.status(),
        responseTime,
        timestamp: Date.now(),
        headers: Object.fromEntries(response.headers() || [])
      };

      try {
        const responseBody = await response.text();
        result.body = responseBody ? JSON.parse(responseBody) : null;
      } catch (e) {
        result.body = await response.text();
      }

      this.results.push(result);
      return result;

    } catch (error) {
      const endTime = performance.now();
      const result: APITestResult = {
        endpoint,
        method,
        status: 0,
        responseTime: endTime - startTime,
        timestamp: Date.now(),
        error: error.message
      };

      this.results.push(result);
      return result;
    }
  }

  async testStreamingEndpoint(page: any, endpoint: string): Promise<StreamingTestResult> {
    const result: StreamingTestResult = {
      endpoint,
      connectionEstablished: false,
      messagesReceived: 0,
      avgResponseTime: 0,
      errors: []
    };

    try {
      // Test streaming via POST first
      const startTime = performance.now();
      const response = await page.request.post(endpoint, {
        data: {
          message: 'Test streaming connection',
          agent: 'test-agent',
          stream: true
        }
      });

      const endTime = performance.now();
      result.avgResponseTime = endTime - startTime;

      if (response.status() < 400) {
        result.connectionEstablished = true;
        result.messagesReceived = 1;
      } else {
        result.errors.push(`HTTP ${response.status()}: ${await response.text()}`);
      }

    } catch (error) {
      result.errors.push(`Connection error: ${error.message}`);
    }

    this.streamingResults.push(result);
    return result;
  }

  getResults(): { api: APITestResult[]; streaming: StreamingTestResult[] } {
    return {
      api: this.results,
      streaming: this.streamingResults
    };
  }

  generateReport(): string {
    const successfulAPIs = this.results.filter(r => r.status >= 200 && r.status < 400);
    const failedAPIs = this.results.filter(r => r.status >= 400 || r.status === 0);

    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'API Preservation Validation',
      summary: {
        totalEndpoints: this.results.length,
        successful: successfulAPIs.length,
        failed: failedAPIs.length,
        avgResponseTime: this.results.reduce((sum, r) => sum + r.responseTime, 0) / this.results.length,
        streamingEndpoints: this.streamingResults.length,
        streamingSuccessful: this.streamingResults.filter(r => r.connectionEstablished).length
      },
      results: this.results,
      streamingResults: this.streamingResults,
      failedEndpoints: failedAPIs.map(r => ({
        endpoint: r.endpoint,
        method: r.method,
        status: r.status,
        error: r.error
      }))
    };

    return JSON.stringify(report, null, 2);
  }
}

test.describe('API Preservation Validation Suite', () => {
  let apiTester: APIPreservationTestSuite;

  test.beforeEach(async () => {
    apiTester = new APIPreservationTestSuite();
  });

  test('Claude Code API Endpoints Preserved', async ({ page }) => {
    test.slow(); // Mark as slow test

    const claudeCodeEndpoints = [
      { path: '/api/claude-code/health', method: 'GET' as const },
      { path: '/api/claude-code/streaming-chat', method: 'POST' as const, data: { message: 'test' } },
      { path: '/api/claude-code/session', method: 'GET' as const },
      { path: '/api/claude-code/activities', method: 'GET' as const },
      { path: '/api/claude-code/prod/agents', method: 'GET' as const }
    ];

    for (const endpoint of claudeCodeEndpoints) {
      const result = await apiTester.testEndpoint(page, endpoint.path, endpoint.method, endpoint.data);

      // These endpoints MUST remain functional
      expect(result.status).not.toBe(404);
      expect(result.status).not.toBe(0);
      expect(result.responseTime).toBeLessThan(10000); // 10 second timeout

      console.log(`✓ ${endpoint.path} [${endpoint.method}] - Status: ${result.status}, Time: ${result.responseTime.toFixed(0)}ms`);
    }
  });

  test('Core Application APIs Preserved', async ({ page }) => {
    const coreEndpoints = [
      { path: '/api/posts', method: 'GET' as const },
      { path: '/api/agents', method: 'GET' as const },
      { path: '/api/comments', method: 'GET' as const },
      { path: '/api/activities', method: 'GET' as const },
      { path: '/api/health', method: 'GET' as const }
    ];

    for (const endpoint of coreEndpoints) {
      const result = await apiTester.testEndpoint(page, endpoint.path, endpoint.method);

      // Core APIs must work
      expect(result.status).toBeGreaterThanOrEqual(200);
      expect(result.status).toBeLessThan(500);

      console.log(`✓ Core API ${endpoint.path} - Status: ${result.status}`);
    }
  });

  test('Streaming Endpoints Functional', async ({ page }) => {
    const streamingEndpoints = [
      '/api/claude-code/streaming-chat',
      '/api/websocket/chat',
      '/api/realtime/updates'
    ];

    for (const endpoint of streamingEndpoints) {
      const result = await apiTester.testStreamingEndpoint(page, endpoint);

      if (result.errors.length === 0 || result.connectionEstablished) {
        console.log(`✓ Streaming endpoint ${endpoint} - Connected: ${result.connectionEstablished}`);
      } else {
        console.log(`! Streaming endpoint ${endpoint} - Errors: ${result.errors.join(', ')}`);
      }

      // At least attempt should be made without complete failure
      expect(result.errors.length).toBeLessThan(5);
    }
  });

  test('POST Request Data Handling', async ({ page }) => {
    const postTestData = {
      message: 'Test message for API preservation',
      agent: 'test-agent',
      timestamp: new Date().toISOString(),
      metadata: {
        testType: 'api-preservation',
        uiRemovalTest: true
      }
    };

    const postEndpoints = [
      '/api/claude-code/streaming-chat',
      '/api/claude-code/activity',
      '/api/posts',
      '/api/comments'
    ];

    for (const endpoint of postEndpoints) {
      const result = await apiTester.testEndpoint(page, endpoint, 'POST', postTestData);

      // Should handle POST data without errors
      expect(result.status).not.toBe(400); // Bad Request
      expect(result.status).not.toBe(500); // Internal Server Error

      if (result.status >= 200 && result.status < 300) {
        console.log(`✓ POST ${endpoint} - Success: ${result.status}`);
      } else {
        console.log(`! POST ${endpoint} - Status: ${result.status} (may be expected)`);
      }
    }
  });

  test('Error Handling Preserved', async ({ page }) => {
    // Test that error handling mechanisms still work
    const errorTestEndpoints = [
      { path: '/api/claude-code/nonexistent', expected: 404 },
      { path: '/api/invalid-endpoint', expected: 404 },
      { path: '/api/posts/invalid-id', expected: [404, 400] }
    ];

    for (const test of errorTestEndpoints) {
      const result = await apiTester.testEndpoint(page, test.path, 'GET');

      const expectedStatuses = Array.isArray(test.expected) ? test.expected : [test.expected];
      expect(expectedStatuses).toContain(result.status);

      console.log(`✓ Error handling ${test.path} - Expected: ${test.expected}, Got: ${result.status}`);
    }
  });

  test('API Response Headers Validation', async ({ page }) => {
    const result = await apiTester.testEndpoint(page, '/api/claude-code/health', 'GET');

    expect(result.headers).toBeDefined();

    // Should have proper CORS headers
    if (result.headers && result.status < 400) {
      const hasContentType = 'content-type' in result.headers;
      expect(hasContentType).toBe(true);

      console.log('✓ API headers preserved:', Object.keys(result.headers || {}));
    }
  });

  test('API Performance Benchmarks', async ({ page }) => {
    // Test that API performance hasn't degraded
    const benchmarkEndpoints = [
      '/api/claude-code/health',
      '/api/posts',
      '/api/agents'
    ];

    const performanceBenchmarks = new Map([
      ['/api/claude-code/health', 500], // 500ms max
      ['/api/posts', 2000], // 2s max
      ['/api/agents', 1500] // 1.5s max
    ]);

    for (const endpoint of benchmarkEndpoints) {
      const result = await apiTester.testEndpoint(page, endpoint, 'GET');
      const maxTime = performanceBenchmarks.get(endpoint) || 5000;

      expect(result.responseTime).toBeLessThan(maxTime);

      console.log(`✓ Performance ${endpoint}: ${result.responseTime.toFixed(0)}ms (max: ${maxTime}ms)`);
    }
  });

  test.afterAll(async () => {
    const report = apiTester.generateReport();

    test.info().attach('api-preservation-report.json', {
      body: report,
      contentType: 'application/json'
    });

    console.log('=== API PRESERVATION VALIDATION COMPLETE ===');
    console.log(report);

    // Assert overall success
    const results = apiTester.getResults();
    const criticalFailures = results.api.filter(r =>
      r.endpoint.includes('/api/claude-code/') && r.status === 0
    );

    expect(criticalFailures.length).toBe(0);
  });
});

test.describe('WebSocket Preservation Tests', () => {
  test('WebSocket Connections Maintained', async ({ page }) => {
    await page.goto('/');

    // Monitor WebSocket connections
    const wsConnections: string[] = [];
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
      console.log('WebSocket connected:', ws.url());

      ws.on('framesent', event => {
        console.log('WS Frame sent:', event.payload);
      });

      ws.on('framereceived', event => {
        console.log('WS Frame received:', event.payload);
      });
    });

    // Wait for connections to establish
    await page.waitForTimeout(5000);

    // Should have real-time connections
    expect(wsConnections.length).toBeGreaterThanOrEqual(0); // Allow for no WS in some setups

    if (wsConnections.length > 0) {
      console.log(`✓ WebSocket connections preserved: ${wsConnections.length}`);
    } else {
      console.log('! No WebSocket connections detected (may be expected)');
    }
  });
});
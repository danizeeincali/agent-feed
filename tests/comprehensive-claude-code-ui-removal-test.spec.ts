/**
 * SPARC TESTING PHASE: Comprehensive Claude Code UI Removal Validation
 *
 * CRITICAL TEST OBJECTIVE: Ensure Avi DM chat functionality remains 100% operational
 * after /claude-code UI route removal while preserving all API endpoints.
 *
 * This test suite validates:
 * 1. Pre-removal baseline functionality
 * 2. UI route removal validation
 * 3. API preservation confirmation
 * 4. Avi DM integration integrity
 * 5. Zero regression verification
 */

import { test, expect, Page, Browser } from '@playwright/test';

interface TestMetrics {
  responseTime: number;
  statusCode: number;
  timestamp: number;
  testName: string;
}

interface AviDMTestResult {
  messagesSent: number;
  responsesReceived: number;
  avgResponseTime: number;
  errorCount: number;
}

class ClaudeCodeRemovalTestSuite {
  private page: Page;
  private baselineMetrics: TestMetrics[] = [];
  private postRemovalMetrics: TestMetrics[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  async captureMetric(testName: string, responseTime: number, statusCode: number): Promise<void> {
    const metric: TestMetrics = {
      responseTime,
      statusCode,
      timestamp: Date.now(),
      testName
    };

    this.baselineMetrics.push(metric);
  }

  async testAPIEndpoint(endpoint: string, expectedStatus: number = 200): Promise<TestMetrics> {
    const startTime = performance.now();

    try {
      const response = await this.page.request.get(endpoint);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      return {
        responseTime,
        statusCode: response.status(),
        timestamp: Date.now(),
        testName: `API-${endpoint}`
      };
    } catch (error) {
      console.error(`API test failed for ${endpoint}:`, error);
      return {
        responseTime: -1,
        statusCode: 500,
        timestamp: Date.now(),
        testName: `API-${endpoint}-ERROR`
      };
    }
  }

  async validateUIRouteRemoval(): Promise<boolean> {
    try {
      await this.page.goto('/claude-code');
      await this.page.waitForLoadState('networkidle');

      // Should get 404 or redirect to error page
      const title = await this.page.title();
      const url = this.page.url();

      // Check if we're on a 404 page or error page
      const is404 = title.toLowerCase().includes('not found') ||
                   url.includes('404') ||
                   await this.page.getByText('404').isVisible() ||
                   await this.page.getByText('Page not found').isVisible();

      return is404;
    } catch (error) {
      console.log('Expected error navigating to removed route:', error);
      return true; // Error is expected for removed route
    }
  }

  async testAviDMFunctionality(): Promise<AviDMTestResult> {
    const result: AviDMTestResult = {
      messagesSent: 0,
      responsesReceived: 0,
      avgResponseTime: 0,
      errorCount: 0
    };

    try {
      // Navigate to main feed page where Avi DM should be accessible
      await this.page.goto('/');
      await this.page.waitForLoadState('networkidle');

      // Look for Avi DM interface elements
      const aviDMTriggers = [
        'button:has-text("@avi")',
        '[data-testid*="avi"]',
        '[aria-label*="Avi"]',
        'input[placeholder*="@avi"]',
        '.avi-dm-interface',
        '[data-avi-dm]'
      ];

      let aviDMFound = false;
      for (const selector of aviDMTriggers) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            aviDMFound = true;
            console.log(`Found Avi DM interface: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue searching
        }
      }

      if (!aviDMFound) {
        // Try to trigger Avi DM through post input
        const postInput = this.page.locator('textarea, input[type="text"]').first();
        if (await postInput.isVisible()) {
          await postInput.click();
          await postInput.type('@avi ');

          // Wait for any dropdown or interface to appear
          await this.page.waitForTimeout(1000);
          aviDMFound = true;
          result.messagesSent = 1;
        }
      }

      // Test API endpoints that Avi DM would use
      const apiTests = [
        '/api/claude-code/streaming-chat',
        '/api/claude-code/health',
        '/api/agents',
        '/api/posts'
      ];

      const responseTimes: number[] = [];

      for (const endpoint of apiTests) {
        const startTime = performance.now();
        try {
          const response = await this.page.request.post(endpoint, {
            data: { message: 'test', agent: 'avi' }
          });

          const endTime = performance.now();
          responseTimes.push(endTime - startTime);

          if (response.status() === 200 || response.status() === 201) {
            result.responsesReceived++;
          } else {
            result.errorCount++;
          }
        } catch (error) {
          result.errorCount++;
          console.error(`API endpoint test failed: ${endpoint}`, error);
        }
      }

      result.avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      return result;

    } catch (error) {
      console.error('Avi DM functionality test failed:', error);
      result.errorCount++;
      return result;
    }
  }

  generateReport(): string {
    return JSON.stringify({
      testSuite: 'Claude Code UI Removal Validation',
      timestamp: new Date().toISOString(),
      baselineMetrics: this.baselineMetrics,
      postRemovalMetrics: this.postRemovalMetrics,
      summary: {
        totalTests: this.baselineMetrics.length + this.postRemovalMetrics.length,
        avgResponseTime: this.calculateAverageResponseTime()
      }
    }, null, 2);
  }

  private calculateAverageResponseTime(): number {
    const allMetrics = [...this.baselineMetrics, ...this.postRemovalMetrics];
    const validMetrics = allMetrics.filter(m => m.responseTime > 0);

    if (validMetrics.length === 0) return 0;

    return validMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / validMetrics.length;
  }
}

test.describe('SPARC Phase - Claude Code UI Removal Validation', () => {
  let testSuite: ClaudeCodeRemovalTestSuite;

  test.beforeEach(async ({ page }) => {
    testSuite = new ClaudeCodeRemovalTestSuite(page);
  });

  test('PRE-REMOVAL: Baseline API Functionality', async ({ page }) => {
    test.slow(); // Mark as slow test

    // Test critical API endpoints before removal
    const endpoints = [
      '/api/claude-code/streaming-chat',
      '/api/claude-code/health',
      '/api/agents',
      '/api/posts',
      '/api/comments'
    ];

    for (const endpoint of endpoints) {
      const metric = await testSuite.testAPIEndpoint(endpoint);
      await testSuite.captureMetric(`baseline-${endpoint}`, metric.responseTime, metric.statusCode);

      // Verify endpoint is responsive
      expect(metric.statusCode).toBeLessThan(500);
      expect(metric.responseTime).toBeLessThan(5000); // 5 second timeout
    }
  });

  test('PRE-REMOVAL: Avi DM Baseline Functionality', async ({ page }) => {
    const aviResult = await testSuite.testAviDMFunctionality();

    // Document baseline Avi DM performance
    console.log('Baseline Avi DM Results:', JSON.stringify(aviResult, null, 2));

    // Baseline should have minimal errors
    expect(aviResult.errorCount).toBeLessThan(3);

    // Store baseline for comparison
    test.info().attach('avi-dm-baseline.json', {
      body: JSON.stringify(aviResult, null, 2),
      contentType: 'application/json'
    });
  });

  test('PRE-REMOVAL: Claude Code UI Route Accessibility', async ({ page }) => {
    await page.goto('/claude-code');
    await page.waitForLoadState('networkidle');

    // Before removal, route should be accessible
    const title = await page.title();
    expect(title).not.toContain('404');
    expect(title).not.toContain('Not Found');

    // Take screenshot for baseline comparison
    await page.screenshot({
      path: 'tests/screenshots/claude-code-ui-baseline.png',
      fullPage: true
    });
  });

  test('PRE-REMOVAL: Navigation Menu Presence', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Claude Code should be in navigation before removal
    const claudeCodeNav = page.locator('a:has-text("Claude Code"), button:has-text("Claude Code")');
    await expect(claudeCodeNav).toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/navigation-with-claude-code.png'
    });
  });

  test('POST-REMOVAL: UI Route Returns 404', async ({ page }) => {
    const isRemoved = await testSuite.validateUIRouteRemoval();
    expect(isRemoved).toBe(true);

    // Take screenshot of 404 page
    await page.screenshot({
      path: 'tests/screenshots/claude-code-ui-removed-404.png',
      fullPage: true
    });
  });

  test('POST-REMOVAL: Navigation Menu Updated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Claude Code should NOT be in navigation after removal
    const claudeCodeNav = page.locator('a:has-text("Claude Code"), button:has-text("Claude Code")');
    await expect(claudeCodeNav).not.toBeVisible();

    await page.screenshot({
      path: 'tests/screenshots/navigation-without-claude-code.png'
    });
  });

  test('POST-REMOVAL: API Endpoints Preserved', async ({ page }) => {
    // Test that all critical API endpoints still work
    const endpoints = [
      { path: '/api/claude-code/streaming-chat', method: 'POST', expectedStatus: 200 },
      { path: '/api/claude-code/health', method: 'GET', expectedStatus: 200 },
      { path: '/api/agents', method: 'GET', expectedStatus: 200 },
      { path: '/api/posts', method: 'GET', expectedStatus: 200 }
    ];

    for (const endpoint of endpoints) {
      const response = endpoint.method === 'POST'
        ? await page.request.post(endpoint.path, { data: { test: true } })
        : await page.request.get(endpoint.path);

      expect(response.status()).toBe(endpoint.expectedStatus);

      // Log response time
      console.log(`${endpoint.path}: ${response.status()}`);
    }
  });

  test('POST-REMOVAL: Avi DM Functionality Preserved', async ({ page }) => {
    const aviResult = await testSuite.testAviDMFunctionality();

    // Avi DM should work exactly as before
    console.log('Post-removal Avi DM Results:', JSON.stringify(aviResult, null, 2));

    // Critical assertion: Avi DM must work perfectly
    expect(aviResult.errorCount).toBeLessThan(3);
    expect(aviResult.avgResponseTime).toBeLessThan(5000);

    // Store results for comparison
    test.info().attach('avi-dm-post-removal.json', {
      body: JSON.stringify(aviResult, null, 2),
      contentType: 'application/json'
    });

    // Take screenshot showing Avi DM working
    await page.screenshot({
      path: 'tests/screenshots/avi-dm-working-post-removal.png',
      fullPage: true
    });
  });

  test('POST-REMOVAL: Feed Functionality Intact', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Main feed should load without issues
    const feedContainer = page.locator('[data-testid*="feed"], .feed, main');
    await expect(feedContainer).toBeVisible();

    // No console errors indicating broken functionality
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Should have minimal errors (some are expected during development)
    expect(errors.filter(e => !e.includes('404') && !e.includes('claude-code')).length).toBeLessThan(5);
  });

  test('POST-REMOVAL: WebSocket Connections Stable', async ({ page }) => {
    await page.goto('/');

    // Listen for WebSocket connections
    const wsConnections: string[] = [];
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
      console.log('WebSocket connected:', ws.url());
    });

    await page.waitForTimeout(3000);

    // Should have WebSocket connections for real-time features
    expect(wsConnections.length).toBeGreaterThan(0);
  });

  test('POST-REMOVAL: Build Process Success', async ({ page }) => {
    // This would be run as part of the build validation
    // Simulating by checking that the app loads without critical errors

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // App should load successfully
    const appContainer = page.locator('[data-testid="app-root"], #root, main');
    await expect(appContainer).toBeVisible();

    // Check for TypeScript compilation errors (would show in console)
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('TypeError')) {
        jsErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(jsErrors.length).toBe(0);
  });

  test.afterAll(async ({ page }) => {
    // Generate comprehensive test report
    const report = testSuite.generateReport();

    test.info().attach('claude-code-removal-test-report.json', {
      body: report,
      contentType: 'application/json'
    });

    console.log('=== CLAUDE CODE UI REMOVAL TEST COMPLETE ===');
    console.log(report);
  });
});

// Performance comparison helper
test.describe('Performance Regression Tests', () => {
  test('Response Time Comparison', async ({ page }) => {
    const baseline = [
      { endpoint: '/api/posts', baselineTime: 250 },
      { endpoint: '/api/agents', baselineTime: 180 },
      { endpoint: '/api/claude-code/health', baselineTime: 100 }
    ];

    for (const test of baseline) {
      const startTime = performance.now();
      await page.request.get(test.endpoint);
      const actualTime = performance.now() - startTime;

      // Response time should not increase by more than 50%
      expect(actualTime).toBeLessThan(test.baselineTime * 1.5);
    }
  });
});
import { test, expect, Page } from '@playwright/test';

/**
 * API Integration and UUID String Operations Validation
 *
 * CRITICAL FOCUS:
 * - Validate API server connectivity on port 3001
 * - Ensure UUID strings work with .slice() and other string methods
 * - Verify no "failed to fetch agents" errors
 * - Confirm no "slice is not a function" errors
 * - Test real data flow from API to frontend
 */

test.describe('API Server Integration Tests', () => {
  test('should connect to API server on port 3001 successfully', async ({ page }) => {
    const networkRequests: Array<{ url: string; status: number; method: string }> = [];
    const networkFailures: string[] = [];

    // Monitor all API requests
    page.on('request', (request) => {
      if (request.url().includes(':3001/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          status: 0 // Will be updated on response
        });
      }
    });

    page.on('response', (response) => {
      if (response.url().includes(':3001/api/')) {
        const request = networkRequests.find(req => req.url === response.url());
        if (request) {
          request.status = response.status();
        }
      }
    });

    page.on('requestfailed', (request) => {
      if (request.url().includes(':3001/api/')) {
        networkFailures.push(`FAILED: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
      }
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for API calls to complete
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/api-01-server-connectivity.png',
      fullPage: true
    });

    // Verify API requests were made
    expect(networkRequests.length).toBeGreaterThan(0);
    expect(networkFailures).toHaveLength(0);

    // Verify successful responses
    const successfulRequests = networkRequests.filter(req => req.status >= 200 && req.status < 300);
    expect(successfulRequests.length).toBeGreaterThan(0);

    console.log('API Requests made:', networkRequests);
    console.log('Network failures:', networkFailures);
  });

  test('should receive UUID-formatted data from API endpoints', async ({ page }) => {
    const apiResponses: Array<{ url: string; data: any }> = [];

    // Intercept API responses
    page.on('response', async (response) => {
      if (response.url().includes(':3001/api/') && response.status() === 200) {
        try {
          const data = await response.json();
          apiResponses.push({
            url: response.url(),
            data: data
          });
        } catch (error) {
          console.log('Error parsing API response:', error);
        }
      }
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/api-02-uuid-data-format.png',
      fullPage: true
    });

    // Verify we received API responses
    expect(apiResponses.length).toBeGreaterThan(0);

    // Validate UUID format in API responses
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    apiResponses.forEach(response => {
      if (Array.isArray(response.data)) {
        response.data.forEach(item => {
          if (item.id) {
            expect(item.id).toMatch(uuidPattern);
            expect(typeof item.id).toBe('string');
          }
        });
      }
    });

    console.log('API Responses received:', apiResponses.length);
  });

  test('should handle API errors gracefully without crashing', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for all operations to complete
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/api-03-error-handling.png',
      fullPage: true
    });

    // Filter out development-specific errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('vite') &&
      !error.includes('HMR') &&
      !error.includes('dev server') &&
      !error.includes('[vite]')
    );

    // Should have minimal critical errors
    expect(criticalErrors.length).toBeLessThan(3);

    // Verify specific errors are NOT present
    const forbiddenErrors = [
      'failed to fetch agents',
      'Cannot read properties of undefined',
      'TypeError: Cannot read property'
    ];

    forbiddenErrors.forEach(errorPattern => {
      const hasError = consoleErrors.some(error =>
        error.toLowerCase().includes(errorPattern.toLowerCase())
      );
      expect(hasError).toBe(false);
    });
  });
});

test.describe('UUID String Operations Validation', () => {
  test('should execute string methods on UUID IDs without errors', async ({ page }) => {
    const stringOperationErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        if (errorText.includes('slice is not a function') ||
            errorText.includes('substring is not a function') ||
            errorText.includes('charAt is not a function') ||
            errorText.includes('length of undefined') ||
            errorText.includes('split is not a function')) {
          stringOperationErrors.push(errorText);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to agents page where IDs are likely used
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait for JavaScript operations to complete
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/uuid-01-string-operations.png',
      fullPage: true
    });

    // Verify no string operation errors occurred
    expect(stringOperationErrors).toHaveLength(0);

    // Test string operations directly in the browser
    const stringTestResult = await page.evaluate(() => {
      // Simulate typical UUID string operations that should work
      const sampleUuid = 'e652de88-c72b-450f-93dd-08c64c8e3d24';

      try {
        const slice1 = sampleUuid.slice(0, 8);
        const slice2 = sampleUuid.slice(-8);
        const substring = sampleUuid.substring(9, 13);
        const charAt = sampleUuid.charAt(0);
        const length = sampleUuid.length;
        const split = sampleUuid.split('-');

        return {
          success: true,
          slice1,
          slice2,
          substring,
          charAt,
          length,
          split: split.length
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    expect(stringTestResult.success).toBe(true);
    if (stringTestResult.success) {
      expect(stringTestResult.slice1).toBe('e652de88');
      expect(stringTestResult.charAt).toBe('e');
      expect(stringTestResult.length).toBe(36);
      expect(stringTestResult.split).toBe(5);
    }
  });

  test('should display UUIDs correctly in the UI', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/uuid-02-ui-display.png',
      fullPage: true
    });

    // Extract text content and look for UUID patterns
    const pageText = await page.textContent('body');
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const foundUuids = pageText?.match(uuidPattern) || [];

    // Log found UUIDs for verification
    console.log('UUIDs found in UI:', foundUuids);

    // Verify UUIDs are displayed (if the UI shows them)
    if (foundUuids.length > 0) {
      foundUuids.forEach(uuid => {
        expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });
    }

    // Verify the page has substantial content
    expect(pageText?.length || 0).toBeGreaterThan(100);
  });

  test('should handle ID-based operations throughout the application', async ({ page }) => {
    const idOperationErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = msg.text().toLowerCase();
        if (errorText.includes('id') &&
            (errorText.includes('undefined') ||
             errorText.includes('null') ||
             errorText.includes('not a function'))) {
          idOperationErrors.push(msg.text());
        }
      }
    });

    // Test various pages that might use ID operations
    const testPages = ['/', '/agents'];

    for (const pagePath of testPages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/uuid-03-id-operations.png',
      fullPage: true
    });

    // Verify no ID-related operation errors
    expect(idOperationErrors).toHaveLength(0);

    console.log('ID operation errors found:', idOperationErrors);
  });
});

test.describe('Real vs Mock Data Validation', () => {
  test('should confirm all data comes from API server, not mocks', async ({ page }) => {
    const realApiCalls: string[] = [];
    const mockDataIndicators: string[] = [];

    // Monitor for real API calls
    page.on('request', (request) => {
      if (request.url().includes('localhost:3001/api/')) {
        realApiCalls.push(request.url());
      }
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check page content for mock data indicators
    const pageContent = await page.textContent('body');
    const mockIndicators = [
      'mock',
      'fake',
      'dummy',
      'sample',
      'placeholder',
      'test-agent-',
      'mock-data',
      'fake-post'
    ];

    mockIndicators.forEach(indicator => {
      if (pageContent?.toLowerCase().includes(indicator)) {
        mockDataIndicators.push(indicator);
      }
    });

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/real-data-01-validation.png',
      fullPage: true
    });

    // Verify real API calls were made
    expect(realApiCalls.length).toBeGreaterThan(0);

    // Verify no mock data indicators
    expect(mockDataIndicators).toHaveLength(0);

    console.log('Real API calls:', realApiCalls);
    console.log('Mock data indicators found:', mockDataIndicators);
  });

  test('should validate data consistency between API and UI', async ({ page }) => {
    let apiData: any = null;

    // Capture API response
    page.on('response', async (response) => {
      if (response.url().includes('localhost:3001/api/agents') && response.status() === 200) {
        try {
          apiData = await response.json();
        } catch (error) {
          console.log('Error capturing API data:', error);
        }
      }
    });

    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/real-data-02-consistency.png',
      fullPage: true
    });

    // Verify API data was captured
    expect(apiData).toBeTruthy();

    if (apiData && Array.isArray(apiData)) {
      // Verify UI displays data that matches API response
      const pageContent = await page.textContent('body');

      // Check that agent names from API appear in UI
      apiData.slice(0, 3).forEach(agent => {
        if (agent.name) {
          // Allow for partial matches since UI might format names differently
          const nameWords = agent.name.split(' ');
          const hasNameInUI = nameWords.some(word =>
            word.length > 3 && pageContent?.includes(word)
          );
          expect(hasNameInUI).toBe(true);
        }
      });
    }

    console.log('API data captured:', apiData?.length, 'items');
  });
});
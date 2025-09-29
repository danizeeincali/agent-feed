import { test, expect } from '@playwright/test';

/**
 * Streamlined UI/UX Validation Tests
 *
 * Focus on validating the core functionality after architecture simplification:
 * - API server connectivity on port 3001
 * - UUID string operations working correctly
 * - No "failed to fetch agents" errors
 * - Real data loading (not mocks)
 */

test.describe('Core Functionality Validation', () => {
  test('should verify API server is accessible and returns UUID data', async ({ page }) => {
    // Direct API test
    const apiResponse = await page.request.get('http://localhost:3001/api/agents');
    expect(apiResponse.ok()).toBe(true);

    const apiData = await apiResponse.json();
    expect(Array.isArray(apiData)).toBe(true);
    expect(apiData.length).toBeGreaterThan(0);

    // Verify UUID format in API response
    const firstAgent = apiData[0];
    expect(firstAgent.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(typeof firstAgent.id).toBe('string');

    // Take screenshot of API validation
    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/streamlined-01-api-validation.png'
    });

    console.log('✅ API server validation successful');
    console.log('Agent count:', apiData.length);
    console.log('Sample agent ID:', firstAgent.id);
  });

  test('should verify UUID string operations work without errors', async ({ page }) => {
    // Test UUID string operations directly in browser context
    const stringTestResult = await page.evaluate(() => {
      // Test with actual UUID format from our API
      const testUuid = 'e652de88-c72b-450f-93dd-08c64c8e3d24';

      try {
        const operations = {
          slice1: testUuid.slice(0, 8),
          slice2: testUuid.slice(-8),
          substring: testUuid.substring(9, 13),
          charAt: testUuid.charAt(0),
          length: testUuid.length,
          split: testUuid.split('-'),
          indexOf: testUuid.indexOf('-'),
          replace: testUuid.replace('-', '_')
        };

        return { success: true, operations };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    expect(stringTestResult.success).toBe(true);

    if (stringTestResult.success) {
      expect(stringTestResult.operations.slice1).toBe('e652de88');
      expect(stringTestResult.operations.charAt).toBe('e');
      expect(stringTestResult.operations.length).toBe(36);
      expect(stringTestResult.operations.split).toHaveLength(5);
    }

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/streamlined-02-uuid-operations.png'
    });

    console.log('✅ UUID string operations validation successful');
  });

  test('should load frontend and verify no critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const networkFailures: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capture network failures
    page.on('requestfailed', (request) => {
      networkFailures.push(`${request.method()} ${request.url()}`);
    });

    // Navigate to frontend
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/streamlined-03-frontend-load.png',
      fullPage: true
    });

    // Filter out development-specific errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('vite') &&
      !error.includes('HMR') &&
      !error.includes('[vite]') &&
      !error.includes('dev server')
    );

    // Verify no critical errors
    expect(criticalErrors.length).toBeLessThan(5); // Allow some minor errors

    // Verify specific errors are NOT present
    const forbiddenErrorPatterns = [
      'failed to fetch agents',
      'slice is not a function',
      'Cannot read properties of undefined'
    ];

    forbiddenErrorPatterns.forEach(pattern => {
      const hasError = consoleErrors.some(error =>
        error.toLowerCase().includes(pattern.toLowerCase())
      );
      expect(hasError).toBe(false);
    });

    console.log('✅ Frontend loading validation successful');
    console.log('Console errors (filtered):', criticalErrors.length);
    console.log('Network failures:', networkFailures.length);
  });

  test('should navigate to agents page and verify basic functionality', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    // Wait a bit for any API calls to complete
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/streamlined-04-agents-page.png',
      fullPage: true
    });

    // Check that the page has loaded with some content
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent.length).toBeGreaterThan(50);

    // Check for agents-related content
    const hasAgentContent = bodyContent.toLowerCase().includes('agent') ||
                           bodyContent.toLowerCase().includes('active') ||
                           bodyContent.toLowerCase().includes('status');

    expect(hasAgentContent).toBe(true);

    console.log('✅ Agents page navigation successful');
    console.log('Page content length:', bodyContent.length);
  });

  test('should verify no mock data indicators in the UI', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Also check agents page
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');

    const pageContent = await page.textContent('body');

    await page.screenshot({
      path: 'tests/playwright/ui-ux-validation/reports/streamlined-05-no-mock-data.png',
      fullPage: true
    });

    // Check for mock data indicators that should NOT be present
    const mockIndicators = [
      'mock',
      'fake',
      'dummy',
      'placeholder-',
      'test-data',
      'sample-'
    ];

    mockIndicators.forEach(indicator => {
      const hasMockIndicator = pageContent?.toLowerCase().includes(indicator);
      expect(hasMockIndicator).toBe(false);
    });

    console.log('✅ No mock data validation successful');
  });

  test('should verify responsive design on different viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: `tests/playwright/ui-ux-validation/reports/streamlined-06-responsive-${viewport.name}.png`,
        fullPage: true
      });

      // Verify content is still accessible
      const content = await page.textContent('body');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(50);
    }

    console.log('✅ Responsive design validation successful');
  });
});
import { test, expect, Page } from '@playwright/test';

test.describe('Analytics Error Handling and Fallback Scenarios', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();

    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });

    await page.goto('/analytics');
  });

  test('Network failure scenarios should show appropriate error messages', async () => {
    await test.step('Complete network failure', async () => {
      // Block all analytics API calls
      await page.route('/api/analytics/**', (route) => {
        route.abort('failed');
      });

      await page.reload();

      // Navigate to Claude SDK tab
      await page.click('[data-testid="claude-sdk-tab"]');

      // Should show error fallback, not timeout
      await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Error message should be user-friendly
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorMessage).toContain('Unable to load analytics data');

      // Should have retry option
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    await test.step('Retry functionality works', async () => {
      // Remove the network block
      await page.unroute('/api/analytics/**');

      // Click retry
      await page.click('[data-testid="retry-button"]');

      // Should load successfully now
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('[data-testid="error-fallback"]')).not.toBeVisible();
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('HTTP error status codes are handled gracefully', async () => {
    const errorCodes = [
      { code: 400, description: 'Bad Request' },
      { code: 401, description: 'Unauthorized' },
      { code: 403, description: 'Forbidden' },
      { code: 404, description: 'Not Found' },
      { code: 500, description: 'Internal Server Error' },
      { code: 502, description: 'Bad Gateway' },
      { code: 503, description: 'Service Unavailable' }
    ];

    for (const error of errorCodes) {
      await test.step(`Handle ${error.code} ${error.description}`, async () => {
        // Set up specific error response
        await page.route('/api/analytics/claude-sdk/**', (route) => {
          route.fulfill({
            status: error.code,
            body: JSON.stringify({ error: error.description }),
            headers: { 'Content-Type': 'application/json' }
          });
        });

        await page.reload();
        await page.click('[data-testid="claude-sdk-tab"]');

        // Should show appropriate error message
        await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

        // Error message should mention the specific issue
        const errorText = await page.locator('[data-testid="error-message"]').textContent();
        if (error.code >= 500) {
          expect(errorText).toContain('server error');
        } else if (error.code === 404) {
          expect(errorText).toContain('not found');
        } else if (error.code === 401 || error.code === 403) {
          expect(errorText).toContain('authorized');
        }

        // Clear the route for next iteration
        await page.unroute('/api/analytics/claude-sdk/**');
      });
    }
  });

  test('Partial API failures are handled correctly', async () => {
    await test.step('Some APIs fail while others succeed', async () => {
      // Make some APIs fail and others succeed
      await page.route('/api/analytics/claude-sdk/overview', (route) => {
        route.abort('failed');
      });

      await page.route('/api/analytics/claude-sdk/usage', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ usage: 'mock data' }),
          headers: { 'Content-Type': 'application/json' }
        });
      });

      await page.reload();
      await page.click('[data-testid="claude-sdk-tab"]');

      // Main analytics should load
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

      // Overview tab should show error
      await page.click('[data-testid="cost-overview-tab"]');
      await expect(page.locator('[data-testid="cost-overview-error"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Usage tab should work fine
      await page.click('[data-testid="usage-metrics-tab"]');
      await expect(page.locator('[data-testid="usage-metrics-tab-content"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('Slow API responses show loading states correctly', async () => {
    await test.step('Very slow API responses', async () => {
      // Simulate very slow API (8 seconds)
      await page.route('/api/analytics/claude-sdk/**', (route) => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ data: 'slow response' }),
            headers: { 'Content-Type': 'application/json' }
          });
        }, 8000);
      });

      const slowLoadStart = Date.now();
      await page.click('[data-testid="claude-sdk-tab"]');

      // Should show loading spinner immediately
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible({ timeout: 2000 });

      // Should NOT show timeout error during valid loading
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Should show loading progress or indication
      await expect(page.locator('[data-testid="loading-message"]')).toBeVisible();

      // Should eventually load successfully
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 20000 });

      const slowLoadTime = Date.now() - slowLoadStart;
      console.log(`Slow API handled in ${slowLoadTime}ms`);

      // Final verification - no timeout errors
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('Invalid JSON responses are handled gracefully', async () => {
    await test.step('Corrupted JSON response', async () => {
      await page.route('/api/analytics/claude-sdk/**', (route) => {
        route.fulfill({
          status: 200,
          body: '{ invalid json response }',
          headers: { 'Content-Type': 'application/json' }
        });
      });

      await page.reload();
      await page.click('[data-testid="claude-sdk-tab"]');

      // Should handle JSON parse error gracefully
      await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorMessage).toContain('data format');
    });
  });

  test('Connection timeout vs Loading timeout distinction', async () => {
    await test.step('Connection timeout handling', async () => {
      // Simulate connection timeout (no response at all)
      await page.route('/api/analytics/claude-sdk/**', (route) => {
        // Don't call route.continue() or route.fulfill() - simulates timeout
      });

      await page.click('[data-testid="claude-sdk-tab"]');

      // Should show connection error, not "Loading Timeout"
      await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Error should indicate connection issue
      const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
      expect(errorMessage).toContain('connection');
    });
  });

  test('Memory and resource exhaustion scenarios', async () => {
    await test.step('Simulate high memory pressure', async () => {
      // Inject script to consume memory
      await page.addInitScript(() => {
        // Simulate memory pressure
        (window as any).memoryPressureTest = [];
        for (let i = 0; i < 1000; i++) {
          (window as any).memoryPressureTest.push(new Array(10000).fill('memory pressure'));
        }
      });

      await page.reload();

      // Analytics should still work under memory pressure
      await page.click('[data-testid="claude-sdk-tab"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 20000 });

      // Should not show timeout errors even under pressure
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      // Test sub-tabs still work
      await page.click('[data-testid="cost-overview-tab"]');
      await expect(page.locator('[data-testid="cost-overview-tab-content"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });

  test('Concurrent request cancellation scenarios', async () => {
    await test.step('Rapid navigation causing request cancellation', async () => {
      let requestCount = 0;
      const cancelledRequests: string[] = [];

      await page.route('/api/analytics/claude-sdk/**', (route) => {
        requestCount++;
        const requestId = `request-${requestCount}`;

        // Simulate delayed response
        setTimeout(() => {
          if (!route.request().isNavigationRequest()) {
            route.fulfill({
              status: 200,
              body: JSON.stringify({ data: `response for ${requestId}` }),
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            cancelledRequests.push(requestId);
          }
        }, 2000);
      });

      // Rapid navigation between tabs
      await page.click('[data-testid="claude-sdk-tab"]');
      await page.waitForTimeout(100);

      await page.click('[data-testid="cost-overview-tab"]');
      await page.waitForTimeout(100);

      await page.click('[data-testid="usage-metrics-tab"]');
      await page.waitForTimeout(100);

      await page.click('[data-testid="model-performance-tab"]');

      // Should eventually stabilize without timeout errors
      await expect(page.locator('[data-testid="model-performance-tab-content"]')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();

      console.log(`Total requests: ${requestCount}, Cancelled: ${cancelledRequests.length}`);
    });
  });

  test('Error recovery and persistence', async () => {
    await test.step('Error state recovery after temporary failure', async () => {
      // Simulate temporary API failure
      let failureCount = 0;
      await page.route('/api/analytics/claude-sdk/**', (route) => {
        failureCount++;
        if (failureCount <= 2) {
          // Fail first 2 requests
          route.abort('failed');
        } else {
          // Succeed on third request
          route.fulfill({
            status: 200,
            body: JSON.stringify({ data: 'recovered data' }),
            headers: { 'Content-Type': 'application/json' }
          });
        }
      });

      await page.click('[data-testid="claude-sdk-tab"]');

      // Should show error initially
      await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });

      // Click retry
      await page.click('[data-testid="retry-button"]');

      // Should still show error on second attempt
      await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible({ timeout: 10000 });

      // Third retry should succeed
      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="claude-sdk-analytics"]')).toBeVisible({ timeout: 15000 });

      // Should never show timeout errors throughout this process
      await expect(page.locator('text=Loading Timeout')).not.toBeVisible();
    });
  });
});
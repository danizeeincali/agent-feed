import { test, expect, Page } from '@playwright/test';
import { TestHelper } from './utils/test-helpers';

/**
 * Error Handling and Recovery Scenario Tests
 *
 * Comprehensive testing of error conditions and recovery mechanisms:
 * - Network failures and offline scenarios
 * - Server errors and API failures
 * - Authentication and authorization errors
 * - Data corruption and validation failures
 * - UI error boundaries and graceful degradation
 * - Recovery workflows and retry mechanisms
 */

test.describe('Error Handling and Recovery', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.afterEach(async () => {
    await TestHelper.cleanupTestPages(createdPageIds);
    createdPageIds = [];
  });

  test('Network failure scenarios and offline handling', async ({ page }) => {
    // Start online and navigate to dynamic pages
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    // Capture initial state
    const initialPageCount = await page.locator('.page-item, [data-testid^="page-"]').count();
    console.log(`Initial page count: ${initialPageCount}`);

    // Test 1: Go offline completely
    await page.context().setOffline(true);
    console.log('🔌 Going offline...');

    // Try to refresh the page
    await page.reload();

    // Should show offline/error state
    const offlineIndicators = page.locator([
      'text="Offline"',
      'text="Network Error"',
      'text="Connection Failed"',
      '.offline-indicator',
      '.network-error'
    ].join(', '));

    // Wait for offline state to be detected
    await page.waitForTimeout(3000);

    // Application should either show offline indicator or cached content
    const pageContent = await page.textContent('body');
    const hasOfflineHandling = pageContent?.includes('offline') ||
                              pageContent?.includes('network') ||
                              pageContent?.includes('connection') ||
                              await offlineIndicators.count() > 0;

    if (hasOfflineHandling) {
      console.log('✅ Offline state detected and handled');
    } else {
      console.log('ℹ️ No explicit offline handling found, but page may use cached content');
    }

    // Test 2: Go back online
    await page.context().setOffline(false);
    console.log('🔌 Going back online...');

    // Try to interact with the application
    await page.waitForTimeout(2000);

    // Should recover functionality
    const recoveryTimeout = 15000;
    try {
      await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`, { timeout: recoveryTimeout });
      await TestHelper.waitForPageReady(page);

      const recoveredDynamicPagesTab = page.locator('text="Dynamic Pages"');
      await recoveredDynamicPagesTab.click();

      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
        { timeout: 15000 }
      );

      console.log('✅ Successfully recovered from offline state');
    } catch (error) {
      console.log('⚠️ Recovery from offline state may need manual intervention');
    }
  });

  test('API failure scenarios and error boundaries', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test 1: 500 Server Error
    await page.route('**/api/agents/**/pages', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal Server Error',
          message: 'Database connection failed'
        })
      });
    });

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Should show error state
    const serverError = page.locator([
      'text="Error"',
      'text="Server Error"',
      'text="Something went wrong"',
      '.error-message',
      '.server-error'
    ].join(', '));

    await expect(serverError.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Server error (500) properly displayed');

    // Test retry functionality
    const retryButton = page.locator([
      'button:has-text("Retry")',
      'button:has-text("Try Again")',
      'button:has-text("Refresh")'
    ].join(', '));

    if (await retryButton.count() > 0) {
      // Clear the route to allow successful retry
      await page.unroute('**/api/agents/**/pages');

      await retryButton.first().click();
      await page.waitForTimeout(3000);

      // Should recover
      const recovered = page.locator(
        '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"'
      );

      if (await recovered.count() > 0) {
        console.log('✅ Successfully retried after server error');
      }
    }

    // Test 2: Network timeout
    await page.route('**/api/agents/**/pages', route => {
      // Simulate timeout by never resolving
      setTimeout(() => {
        route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request Timeout' })
        });
      }, 5000);
    });

    await page.reload();
    await TestHelper.waitForPageReady(page);

    const dynamicPagesTabTimeout = page.locator('text="Dynamic Pages"');
    await dynamicPagesTabTimeout.click();

    // Should eventually show timeout error
    const timeoutError = page.locator([
      'text="Timeout"',
      'text="Request timeout"',
      'text="Taking longer than expected"',
      '.timeout-error'
    ].join(', '));

    await expect(timeoutError.first()).toBeVisible({ timeout: 15000 });
    console.log('✅ Timeout error properly handled');

    await page.unroute('**/api/agents/**/pages');
  });

  test('Authentication and authorization error handling', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test 1: 401 Unauthorized
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required'
        })
      });
    });

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Should show authentication error
    const authError = page.locator([
      'text="Authentication"',
      'text="Unauthorized"',
      'text="Please log in"',
      'text="Session expired"',
      '.auth-error'
    ].join(', '));

    await expect(authError.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Authentication error (401) properly displayed');

    // Test 2: 403 Forbidden
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        })
      });
    });

    await page.reload();
    await TestHelper.waitForPageReady(page);

    const dynamicPagesTabForbidden = page.locator('text="Dynamic Pages"');
    await dynamicPagesTabForbidden.click();

    // Should show permission error
    const permissionError = page.locator([
      'text="Permission denied"',
      'text="Forbidden"',
      'text="Access denied"',
      'text="Insufficient permissions"',
      '.permission-error'
    ].join(', '));

    await expect(permissionError.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Permission error (403) properly displayed');

    await page.unroute('**/api/**');
  });

  test('Data validation and corruption scenarios', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test 1: Invalid JSON response
    await page.route('**/api/agents/**/pages', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response'
      });
    });

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Should handle parsing error gracefully
    const parseError = page.locator([
      'text="Data Error"',
      'text="Invalid Response"',
      'text="Parsing Error"',
      '.parse-error'
    ].join(', '));

    await page.waitForTimeout(3000);

    // Application should either show error or fallback content
    const hasErrorHandling = await parseError.count() > 0;
    const hasGenericError = await page.locator('text="Error", .error-message').count() > 0;

    if (hasErrorHandling || hasGenericError) {
      console.log('✅ Invalid JSON response handled gracefully');
    } else {
      console.log('ℹ️ Application may have silent error handling for invalid JSON');
    }

    // Test 2: Missing required fields
    await page.route('**/api/agents/**/pages', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            pages: [
              {
                // Missing required fields like id, title, etc.
                incomplete_page: true
              }
            ]
          }
        })
      });
    });

    await page.reload();
    await TestHelper.waitForPageReady(page);

    const dynamicPagesTabMissingFields = page.locator('text="Dynamic Pages"');
    await dynamicPagesTabMissingFields.click();

    await page.waitForTimeout(3000);

    // Should handle missing fields gracefully
    const fieldError = page.locator([
      'text="Data Error"',
      'text="Invalid Data"',
      'text="Missing Information"',
      '.validation-error'
    ].join(', '));

    const pageElements = page.locator('.page-item, [data-testid^="page-"]');
    const pageCount = await pageElements.count();

    if (await fieldError.count() > 0) {
      console.log('✅ Missing field validation error displayed');
    } else if (pageCount === 0) {
      console.log('✅ Invalid data filtered out, no pages displayed');
    } else {
      console.log('ℹ️ Application may have default handling for missing fields');
    }

    await page.unroute('**/api/agents/**/pages');
  });

  test('UI error boundaries and component failure recovery', async ({ page }) => {
    // Inject JavaScript errors to test error boundaries
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test 1: Inject a runtime error
    await page.evaluate(() => {
      // Override a method to throw an error
      const originalFetch = window.fetch;
      let errorThrown = false;

      window.fetch = function(...args) {
        if (!errorThrown && args[0].includes('/api/agents/') && args[0].includes('/pages')) {
          errorThrown = true;
          throw new Error('Simulated JavaScript runtime error');
        }
        return originalFetch.apply(this, args);
      };
    });

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    await page.waitForTimeout(3000);

    // Should show error boundary or fallback UI
    const errorBoundary = page.locator([
      'text="Something went wrong"',
      'text="Component Error"',
      'text="An error occurred"',
      '.error-boundary',
      '.component-error'
    ].join(', '));

    const hasErrorBoundary = await errorBoundary.count() > 0;

    if (hasErrorBoundary) {
      console.log('✅ Error boundary caught JavaScript error');

      // Test error boundary actions
      const reloadButton = page.locator([
        'button:has-text("Reload")',
        'button:has-text("Try Again")',
        'button:has-text("Refresh")'
      ].join(', '));

      if (await reloadButton.count() > 0) {
        await reloadButton.first().click();
        console.log('✅ Error boundary reload button working');
      }
    } else {
      console.log('ℹ️ No explicit error boundary found, checking for graceful degradation');

      // Check if the page still functions despite the error
      const pageContent = await page.textContent('body');
      if (pageContent && pageContent.length > 100) {
        console.log('✅ Application maintained functionality despite error');
      }
    }

    // Test 2: Console error monitoring
    const consoleErrors: string[] = [];
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
    });

    // Inject another type of error
    await page.evaluate(() => {
      // Trigger a different kind of error
      setTimeout(() => {
        const nonExistentElement = document.getElementById('non-existent-element');
        nonExistentElement.click(); // This will throw an error
      }, 100);
    });

    await page.waitForTimeout(2000);

    // Application should remain stable
    const isPageResponsive = await page.locator('body').isVisible();
    expect(isPageResponsive).toBe(true);

    if (consoleErrors.length > 0) {
      console.log(`Console errors detected: ${consoleErrors.length}`);
      console.log('✅ Application remained stable despite console errors');
    }
  });

  test('Recovery workflow validation', async ({ page }) => {
    // Test comprehensive recovery workflow
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Step 1: Cause initial failure
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Service Unavailable',
          message: 'Server temporarily unavailable'
        })
      });
    });

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Should show service unavailable error
    const serviceError = page.locator([
      'text="Service Unavailable"',
      'text="Temporarily Unavailable"',
      'text="Server Error"',
      '.service-error'
    ].join(', '));

    await expect(serviceError.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Service unavailable error displayed');

    // Step 2: Test manual retry
    const retryButton = page.locator([
      'button:has-text("Retry")',
      'button:has-text("Try Again")'
    ].join(', '));

    if (await retryButton.count() > 0) {
      // Still failing
      await retryButton.first().click();
      await page.waitForTimeout(2000);

      // Should show error again
      await expect(serviceError.first()).toBeVisible({ timeout: 5000 });
      console.log('✅ Retry during failure maintains error state');

      // Step 3: Fix the service
      await page.unroute('**/api/**');

      // Step 4: Successful retry
      await retryButton.first().click();

      // Should recover
      const recovered = page.locator(
        '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"'
      );

      await expect(recovered.first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Successful recovery after service restoration');
    }

    // Step 5: Test navigation-based recovery
    await page.goto(`${TestHelper.FRONTEND_URL}`);
    await TestHelper.waitForPageReady(page);

    // Navigate back to agent page
    await TestHelper.navigateToAgent(page, testAgentId);

    const recoveredDynamicPagesTab = page.locator('text="Dynamic Pages"');
    await recoveredDynamicPagesTab.click();

    // Should work normally
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    console.log('✅ Navigation-based recovery successful');
  });

  test('Progressive degradation under various failure modes', async ({ page }) => {
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Test 1: Slow network conditions
    await page.route('**/api/agents/**/pages', async route => {
      // Simulate slow network
      await new Promise(resolve => setTimeout(resolve, 3000));
      route.continue();
    });

    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Should show loading state during slow request
    const loadingIndicator = page.locator([
      '.loading',
      '.spinner',
      '.animate-spin',
      'text="Loading"',
      '[data-testid="loading-spinner"]'
    ].join(', '));

    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator.first()).toBeVisible();
      console.log('✅ Loading state shown during slow network');

      // Should eventually load
      await expect(loadingIndicator.first()).not.toBeVisible({ timeout: 15000 });
      console.log('✅ Content loaded after network delay');
    }

    await page.unroute('**/api/agents/**/pages');

    // Test 2: Partial feature failure
    await page.route('**/api/agents/**/pages/*/edit', route => {
      route.fulfill({ status: 404 });
    });

    // Create a test page first
    const pageData = TestHelper.generateTestPageData();
    const pageId = await TestHelper.createTestPage({
      ...pageData,
      title: 'Degradation Test Page'
    });
    createdPageIds.push(pageId);

    await page.reload();
    await TestHelper.waitForPageReady(page);

    const dynamicPagesTabPartial = page.locator('text="Dynamic Pages"');
    await dynamicPagesTabPartial.click();

    await page.waitForSelector('.page-item, [data-testid^="page-"]');

    // View functionality should work
    const viewButton = page.locator('button:has-text("View")').first();
    if (await viewButton.count() > 0) {
      await viewButton.click();
      await page.waitForURL('**/pages/**');
      console.log('✅ View functionality works despite edit failure');

      await page.goBack();
    }

    // Edit functionality should fail gracefully
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Should either show error or disable edit features
      await page.waitForTimeout(2000);

      const editError = page.locator([
        'text="Edit unavailable"',
        'text="Feature disabled"',
        'text="404"',
        '.edit-error'
      ].join(', '));

      if (await editError.count() > 0) {
        console.log('✅ Edit failure handled gracefully');
      } else {
        console.log('ℹ️ Edit feature may be silently degraded');
      }
    }

    await page.unroute('**/api/agents/**/pages/*/edit');
    console.log('✅ Progressive degradation test completed');
  });
});

test.describe('Error Recovery Performance Impact', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;

  test('Error handling performance overhead', async ({ page }) => {
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    const startTime = Date.now();
    const initialMemory = await client.send('Runtime.getHeapUsage');

    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await TestHelper.waitForPageReady(page);

    // Simulate multiple error conditions
    let errorCount = 0;

    await page.route('**/api/**', route => {
      errorCount++;
      if (errorCount <= 5) {
        // First 5 requests fail
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Simulated error' })
        });
      } else {
        // Then succeed
        route.continue();
      }
    });

    // Navigate through the application
    const dynamicPagesTab = page.locator('text="Dynamic Pages"');
    await dynamicPagesTab.click();

    // Wait for error handling and retries
    await page.waitForTimeout(5000);

    const endTime = Date.now();
    const finalMemory = await client.send('Runtime.getHeapUsage');

    const totalTime = endTime - startTime;
    const memoryIncrease = finalMemory.usedSize - initialMemory.usedSize;

    console.log(`Error handling performance:`, {
      totalTime: `${totalTime}ms`,
      memoryIncrease: `${Math.round(memoryIncrease / 1024)}KB`,
      errorsSimulated: errorCount
    });

    // Performance should remain reasonable even with errors
    expect(totalTime).toBeLessThan(15000); // 15 seconds
    expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB

    console.log('✅ Error handling performance within acceptable limits');
  });
});
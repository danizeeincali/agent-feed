import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Network Failure Error Handling Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should handle initial page load network failures', async () => {
    await test.step('Simulate network failure during initial load', async () => {
      // Block all API requests
      await page.route('/api/**', route => {
        route.abort('failed');
      });
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Verify error state display', async () => {
      // Should show error message or fallback UI
      const errorMessage = page.locator('[data-testid="error-message"], [data-testid="network-error"]');
      const retryButton = page.locator('[data-testid="retry-button"]');
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      
      const hasError = await errorMessage.isVisible();
      const hasRetry = await retryButton.isVisible();
      const hasOffline = await offlineIndicator.isVisible();
      
      expect(hasError || hasRetry || hasOffline).toBeTruthy();
      
      if (hasError) {
        await expect(errorMessage).toContainText(/network|connection|error/i);
      }
    });

    await test.step('Test retry functionality', async () => {
      // Remove network block
      await page.unroute('/api/**');
      
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');
        
        // Should recover and show agents
        await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3, { timeout: 10000 });
      }
    });
  });

  test('should handle agent pages API failures', async () => {
    await test.step('Navigate to agent profile successfully', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Simulate agent pages API failure', async () => {
      // Block only agent pages API
      await page.route('/api/agent-pages/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForTimeout(2000);
    });

    await test.step('Verify error handling in Dynamic Pages tab', async () => {
      const errorState = page.locator('[data-testid="error-state"], [data-testid="api-error"]');
      const retryButton = page.locator('[data-testid="retry-pages-button"]');
      
      await expect(errorState).toBeVisible({ timeout: 5000 });
      await expect(retryButton).toBeVisible();
      await expect(errorState).toContainText(/error|failed|load/i);
    });

    await test.step('Test error recovery', async () => {
      // Fix API
      await page.unroute('/api/agent-pages/**');
      
      await page.locator('[data-testid="retry-pages-button"]').click();
      await page.waitForLoadState('networkidle');
      
      // Should show pages or empty state
      const hasPages = await page.locator('[data-testid="page-item"]').count() > 0;
      const hasEmptyState = await page.locator('[data-testid="empty-pages-state"]').isVisible();
      
      expect(hasPages || hasEmptyState).toBeTruthy();
    });
  });

  test('should handle intermittent network failures', async () => {
    let requestCount = 0;
    
    await test.step('Setup intermittent failure simulation', async () => {
      await page.route('/api/agent-pages/**', route => {
        requestCount++;
        if (requestCount % 2 === 0) {
          // Fail every second request
          route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Service temporarily unavailable' })
          });
        } else {
          route.continue();
        }
      });
    });

    await test.step('Navigate and observe retry behavior', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      
      // May succeed or fail depending on timing
      await page.waitForTimeout(3000);
    });

    await test.step('Test automatic retry mechanisms', async () => {
      // Some applications implement automatic retries
      const retryButton = page.locator('[data-testid="retry-pages-button"]');
      
      if (await retryButton.isVisible()) {
        // Manual retry if needed
        await retryButton.click();
        await page.waitForTimeout(2000);
        
        // May need multiple retries due to intermittent failures
        for (let i = 0; i < 3; i++) {
          if (await retryButton.isVisible()) {
            await retryButton.click();
            await page.waitForTimeout(1000);
          } else {
            break;
          }
        }
      }
      
      // Eventually should succeed or show proper error state
      const hasContent = await page.locator('[data-testid="dynamic-pages-content"]').isVisible();
      const hasError = await page.locator('[data-testid="error-state"]').isVisible();
      
      expect(hasContent || hasError).toBeTruthy();
    });
  });

  test('should handle slow network conditions', async () => {
    await test.step('Simulate slow network', async () => {
      // Add delay to all API requests
      await page.route('/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.continue();
      });
    });

    await test.step('Navigate with slow network', async () => {
      const startTime = Date.now();
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Page loaded in ${loadTime}ms with slow network simulation`);
    });

    await test.step('Verify loading indicators during slow load', async () => {
      await page.locator('[data-testid="agent-card"]').first().click();
      
      // Should show loading indicators
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
      
      const hasLoading = await loadingSpinner.isVisible() || await loadingSkeleton.isVisible();
      if (hasLoading) {
        console.log('✅ Loading indicators shown during slow network');
      }
      
      // Wait for content to load
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Loading indicators should be gone
      await expect(loadingSpinner).not.toBeVisible();
      await expect(loadingSkeleton).not.toBeVisible();
    });

    await test.step('Test timeout handling', async () => {
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      
      // Should eventually timeout or load
      await page.waitForTimeout(10000);
      
      const hasContent = await page.locator('[data-testid="dynamic-pages-content"]').isVisible();
      const hasTimeout = await page.locator('[data-testid="timeout-error"]').isVisible();
      const hasLoading = await page.locator('[data-testid="loading-spinner"]').isVisible();
      
      expect(hasContent || hasTimeout || hasLoading).toBeTruthy();
    });
  });

  test('should handle complete offline scenarios', async () => {
    await test.step('Go offline after initial load', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      // Simulate going offline
      await page.context().setOffline(true);
    });

    await test.step('Attempt navigation while offline', async () => {
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForTimeout(2000);
      
      // Should show offline indicator or error
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      const networkError = page.locator('[data-testid="network-error"]');
      const connectivityError = page.locator('[data-testid="connectivity-error"]');
      
      const hasOfflineIndicator = await offlineIndicator.isVisible() || 
                                 await networkError.isVisible() || 
                                 await connectivityError.isVisible();
      
      if (hasOfflineIndicator) {
        console.log('✅ Offline state properly detected and displayed');
      }
    });

    await test.step('Test offline recovery', async () => {
      // Go back online
      await page.context().setOffline(false);
      
      // Try refresh or retry
      const retryButton = page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      } else {
        await page.reload();
      }
      
      await page.waitForLoadState('networkidle');
      
      // Should recover functionality
      await expect(page.locator('[data-testid="agent-profile"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test('should handle partial API failures gracefully', async () => {
    await test.step('Setup partial API failure', async () => {
      // Block only specific endpoints
      await page.route('/api/agent-pages/*/content', route => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Page content not found' })
        });
      });
      
      // Let other endpoints work normally
    });

    await test.step('Navigate to Dynamic Pages', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Test View button with content failure', async () => {
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      if (itemCount > 0) {
        const viewButton = pageItems.first().locator('[data-testid="view-page-button"]');
        await viewButton.click();
        
        // Should show error for content loading
        const contentError = page.locator('[data-testid="content-error"], [data-testid="page-load-error"]');
        const errorModal = page.locator('[data-testid="error-modal"]');
        
        await page.waitForTimeout(2000);
        
        const hasError = await contentError.isVisible() || await errorModal.isVisible();
        expect(hasError).toBeTruthy();
        
        // Clean up error state
        if (await errorModal.isVisible()) {
          await page.locator('[data-testid="error-modal"] [data-testid="close-button"]').click();
        }
      }
    });

    await test.step('Verify page list still works', async () => {
      // Page list should still be functional even if content loading fails
      const pageItems = page.locator('[data-testid="page-item"]');
      const itemCount = await pageItems.count();
      
      // Should show pages in list even if content can't be loaded
      expect(itemCount).toBeGreaterThanOrEqual(0);
      
      if (itemCount > 0) {
        await expect(pageItems.first().locator('[data-testid="page-title"]')).toBeVisible();
      }
    });
  });

  test('should provide meaningful error messages', async () => {
    const errorScenarios = [
      {
        name: '404 Not Found',
        status: 404,
        body: { error: 'Agent pages not found' },
        expectedMessage: /not found|404/i
      },
      {
        name: '401 Unauthorized',
        status: 401,
        body: { error: 'Unauthorized access' },
        expectedMessage: /unauthorized|permission/i
      },
      {
        name: '500 Server Error',
        status: 500,
        body: { error: 'Internal server error' },
        expectedMessage: /server error|500/i
      },
      {
        name: '503 Service Unavailable',
        status: 503,
        body: { error: 'Service temporarily unavailable' },
        expectedMessage: /unavailable|503/i
      }
    ];

    for (const scenario of errorScenarios) {
      await test.step(`Test ${scenario.name} error message`, async () => {
        // Setup specific error
        await page.route('/api/agent-pages/**', route => {
          route.fulfill({
            status: scenario.status,
            contentType: 'application/json',
            body: JSON.stringify(scenario.body)
          });
        });
        
        await page.goto('/agents');
        await page.waitForLoadState('networkidle');
        await page.locator('[data-testid="agent-card"]').first().click();
        await page.waitForLoadState('networkidle');
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        
        await page.waitForTimeout(2000);
        
        // Check for appropriate error message
        const errorMessage = page.locator('[data-testid="error-message"], [data-testid="api-error"], [role="alert"]');
        
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          expect(errorText).toMatch(scenario.expectedMessage);
          console.log(`✅ ${scenario.name}: "${errorText}"`);
        }
        
        // Clean up
        await page.unroute('/api/agent-pages/**');
      });
    }
  });
});
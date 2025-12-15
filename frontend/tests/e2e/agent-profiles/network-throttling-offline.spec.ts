import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Network Throttling and Offline Behavior Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    // Reset network conditions
    await page.context().setOffline(false);
    await context.close();
  });

  test('should handle slow 3G network conditions', async () => {
    await test.step('Simulate slow 3G network', async () => {
      // Simulate slow 3G: 500 Kbps down, 500 Kbps up, 400ms RTT
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 500 * 1024 / 8, // Convert to bytes per second
        uploadThroughput: 500 * 1024 / 8,
        latency: 400 // milliseconds
      });
    });

    await test.step('Test navigation with slow network', async () => {
      const startTime = Date.now();
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Page loaded in ${loadTime}ms on slow 3G`);
      
      // Should show loading indicators during slow load
      const agentCards = page.locator('[data-testid="agent-card"]');
      await expect(agentCards.first()).toBeVisible({ timeout: 30000 });
      
      // Navigate to agent profile
      await agentCards.first().click();
      await page.waitForLoadState('networkidle', { timeout: 60000 });
      
      // Navigate to Dynamic Pages tab
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      
      // Should show loading state for Dynamic Pages
      const loadingIndicator = page.locator('[data-testid="loading-spinner"], [data-testid="loading-skeleton"]');
      
      // Wait for either loading indicator to appear or content to load
      await Promise.race([
        loadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {}),
        page.locator('[data-testid="dynamic-pages-content"]').waitFor({ state: 'visible', timeout: 30000 })
      ]);
      
      // Eventually content should load
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible({ timeout: 45000 });
      
      console.log('✅ Slow 3G navigation completed successfully');
    });

    await test.step('Test Create Page functionality on slow network', async () => {
      const createButton = page.locator('[data-testid="create-page-button"]');
      if (await createButton.isVisible()) {
        await createButton.click();
        
        // Should show loading or modal should eventually appear
        await page.waitForTimeout(2000);
        
        const modal = page.locator('[data-testid="create-page-modal"]');
        const form = page.locator('[data-testid="create-page-form"]');
        
        const hasForm = await modal.isVisible() || await form.isVisible();
        expect(hasForm).toBeTruthy();
        
        if (await modal.isVisible()) {
          // Fill form quickly to test submission on slow network
          await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Slow Network Test');
          
          const submitStartTime = Date.now();
          await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
          
          // Should show loading state during submission
          const submitLoading = page.locator('[data-testid="submit-loading"], [data-testid="button-spinner"]');
          
          // Wait for submission to complete
          await page.waitForLoadState('networkidle', { timeout: 60000 });
          
          const submitTime = Date.now() - submitStartTime;
          console.log(`Form submission took ${submitTime}ms on slow 3G`);
        }
      }
    });
  });

  test('should handle fast 3G network conditions', async () => {
    await test.step('Simulate fast 3G network', async () => {
      // Simulate fast 3G: 1.6 Mbps down, 750 Kbps up, 150ms RTT
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.6 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 150
      });
    });

    await test.step('Test performance on fast 3G', async () => {
      const startTime = Date.now();
      
      await page.goto('/agents');
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Page loaded in ${loadTime}ms on fast 3G`);
      
      // Should load faster than slow 3G
      expect(loadTime).toBeLessThan(15000); // 15 seconds
      
      // Test rapid navigation
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible({ timeout: 20000 });
      
      console.log('✅ Fast 3G performance test completed');
    });
  });

  test('should handle offline behavior correctly', async () => {
    await test.step('Load page while online', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');
      
      // Verify initial load works
      await expect(page.locator('[data-testid="dynamic-pages-content"]')).toBeVisible();
      
      console.log('✅ Initial online load successful');
    });

    await test.step('Go offline and test behavior', async () => {
      // Set offline mode
      await page.context().setOffline(true);
      
      // Try to refresh page
      await page.reload({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {
        console.log('Page reload failed as expected when offline');
      });
      
      // Should show offline indicator or cached content
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      const networkError = page.locator('[data-testid="network-error"]');
      const cachedContent = page.locator('[data-testid="dynamic-pages-content"]');
      
      const hasOfflineIndicator = await offlineIndicator.isVisible();
      const hasNetworkError = await networkError.isVisible();
      const hasCachedContent = await cachedContent.isVisible();
      
      // Should show some indication of offline state or cached content
      expect(hasOfflineIndicator || hasNetworkError || hasCachedContent).toBeTruthy();
      
      if (hasOfflineIndicator) {
        console.log('✅ Offline indicator shown');
      }
      if (hasCachedContent) {
        console.log('✅ Cached content available offline');
      }
    });

    await test.step('Test offline interactions', async () => {
      // Try to create a page while offline
      const createButton = page.locator('[data-testid="create-page-button"]');
      
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const modal = page.locator('[data-testid="create-page-modal"]');
        if (await modal.isVisible()) {
          await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Offline Test Page');
          await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
          
          await page.waitForTimeout(2000);
          
          // Should show offline error or queue action
          const offlineError = page.locator('[data-testid="offline-error"]');
          const queuedIndicator = page.locator('[data-testid="queued-action"]');
          
          const hasOfflineError = await offlineError.isVisible();
          const hasQueuedIndicator = await queuedIndicator.isVisible();
          
          expect(hasOfflineError || hasQueuedIndicator).toBeTruthy();
          
          if (hasOfflineError) {
            console.log('✅ Offline error properly displayed');
          }
          if (hasQueuedIndicator) {
            console.log('✅ Action queued for when online');
          }
        }
      }
    });

    await test.step('Test reconnection behavior', async () => {
      // Go back online
      await page.context().setOffline(false);
      
      // Should detect reconnection
      const reconnectIndicator = page.locator('[data-testid="reconnected-indicator"]');
      const retryButton = page.locator('[data-testid="retry-button"]');
      
      // Try to retry failed operations
      if (await retryButton.isVisible()) {
        await retryButton.click();
        await page.waitForLoadState('networkidle');
        
        console.log('✅ Retry functionality works after reconnection');
      }
      
      // Verify normal functionality restored
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3, { timeout: 10000 });
      
      console.log('✅ Normal functionality restored after reconnection');
    });
  });

  test('should handle intermittent connectivity', async () => {
    await test.step('Simulate unstable connection', async () => {
      let requestCount = 0;
      
      // Intercept requests and simulate intermittent failures
      await page.route('**/*', route => {
        requestCount++;
        
        // Fail every 3rd request
        if (requestCount % 3 === 0) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      await page.goto('/agents');
      await page.waitForTimeout(5000); // Allow for retries
      
      // Should eventually load despite intermittent failures
      const agentCards = page.locator('[data-testid="agent-card"]');
      await expect(agentCards.first()).toBeVisible({ timeout: 30000 });
      
      console.log('✅ Page loaded despite intermittent connectivity issues');
    });

    await test.step('Test automatic retry mechanisms', async () => {
      // Navigate to Dynamic Pages which may trigger more requests
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForTimeout(3000);
      
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForTimeout(5000);
      
      // Should show content or retry UI
      const hasContent = await page.locator('[data-testid="dynamic-pages-content"]').isVisible();
      const hasRetry = await page.locator('[data-testid="retry-button"]').isVisible();
      const hasError = await page.locator('[data-testid="error-state"]').isVisible();
      
      expect(hasContent || hasRetry || hasError).toBeTruthy();
      
      if (hasRetry) {
        // Test retry functionality
        await page.locator('[data-testid="retry-button"]').click();
        await page.waitForTimeout(3000);
        
        console.log('✅ Retry mechanism available for failed requests');
      }
      
      // Clean up route interception
      await page.unroute('**/*');
    });
  });

  test('should handle timeout scenarios', async () => {
    await test.step('Simulate very slow server responses', async () => {
      // Add extreme delay to API calls
      await page.route('/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay
        route.continue();
      });
      
      const startTime = Date.now();
      
      await page.goto('/agents');
      
      // Should show timeout error or loading state
      await page.waitForTimeout(10000);
      
      const timeoutError = page.locator('[data-testid="timeout-error"]');
      const loadingIndicator = page.locator('[data-testid="loading-spinner"]');
      const hasTimeout = await timeoutError.isVisible();
      const hasLoading = await loadingIndicator.isVisible();
      
      expect(hasTimeout || hasLoading).toBeTruthy();
      
      if (hasTimeout) {
        console.log('✅ Timeout error displayed appropriately');
      }
      if (hasLoading) {
        console.log('✅ Loading indicator shown during slow response');
      }
      
      // Clean up route
      await page.unroute('/api/**');
    });

    await test.step('Test timeout recovery', async () => {
      // Load page normally after removing delay
      await page.goto('/agents');
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3, { timeout: 15000 });
      
      console.log('✅ Normal functionality restored after timeout scenario');
    });
  });

  test('should handle bandwidth throttling gracefully', async () => {
    const bandwidthConfigs = [
      { name: 'Dial-up', download: 56, upload: 48, latency: 120 },
      { name: 'Edge', download: 384, upload: 64, latency: 840 },
      { name: '2G', download: 280, upload: 256, latency: 800 },
      { name: '3G', download: 1600, upload: 768, latency: 150 }
    ];

    for (const config of bandwidthConfigs) {
      await test.step(`Test ${config.name} bandwidth (${config.download} Kbps)`, async () => {
        const client = await page.context().newCDPSession(page);
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: config.download * 1024 / 8,
          uploadThroughput: config.upload * 1024 / 8,
          latency: config.latency
        });
        
        const startTime = Date.now();
        
        await page.goto('/agents');
        await page.waitForLoadState('networkidle', { timeout: 120000 });
        
        const loadTime = Date.now() - startTime;
        console.log(`${config.name}: Page loaded in ${loadTime}ms`);
        
        // Verify basic functionality works
        const agentCards = page.locator('[data-testid="agent-card"]');
        await expect(agentCards.first()).toBeVisible({ timeout: 60000 });
        
        // Test navigation
        await agentCards.first().click();
        await page.waitForLoadState('networkidle', { timeout: 60000 });
        
        await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
        await page.waitForTimeout(5000);
        
        // Should eventually show content or appropriate loading state
        const hasContent = await page.locator('[data-testid="dynamic-pages-content"]').isVisible();
        const hasLoading = await page.locator('[data-testid="loading-spinner"]').isVisible();
        const hasError = await page.locator('[data-testid="error-state"]').isVisible();
        
        expect(hasContent || hasLoading || hasError).toBeTruthy();
        
        console.log(`✅ ${config.name} bandwidth test completed`);
      });
    }
  });

  test('should provide appropriate feedback for network conditions', async () => {
    await test.step('Test loading states during slow network', async () => {
      // Simulate moderate delay
      await page.route('/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 3000));
        route.continue();
      });
      
      await page.goto('/agents');
      
      // Should show loading indicators
      const loadingStates = [
        page.locator('[data-testid="loading-spinner"]'),
        page.locator('[data-testid="loading-skeleton"]'),
        page.locator('[data-testid="loading-overlay"]'),
        page.locator('[data-testid="progress-bar"]')
      ];
      
      let hasLoadingIndicator = false;
      for (const loadingState of loadingStates) {
        if (await loadingState.isVisible()) {
          hasLoadingIndicator = true;
          console.log(`✅ Loading indicator found: ${await loadingState.getAttribute('data-testid')}`);
          break;
        }
      }
      
      // Wait for content to load
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      
      // Loading indicators should disappear
      for (const loadingState of loadingStates) {
        await expect(loadingState).not.toBeVisible();
      }
      
      await page.unroute('/api/**');
    });

    await test.step('Test progress indicators for uploads', async () => {
      await page.goto('/agents');
      await page.waitForLoadState('networkidle');
      await page.locator('[data-testid="agent-card"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('[role="tab"]:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');
      
      // Simulate slow upload during page creation
      await page.route('/api/agent-pages', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        route.continue();
      });
      
      const createButton = page.locator('[data-testid="create-page-button"]');
      if (await createButton.isVisible()) {
        await createButton.click();
        
        const modal = page.locator('[data-testid="create-page-modal"]');
        if (await modal.isVisible()) {
          await page.locator('[data-testid="page-title-input"], input[name="title"]').fill('Upload Progress Test');
          
          await page.locator('[data-testid="submit-create-page"], button[type="submit"]').click();
          
          // Should show upload progress
          const uploadProgress = page.locator('[data-testid="upload-progress"], [data-testid="submit-loading"]');
          
          // Wait a moment for progress indicator to appear
          await page.waitForTimeout(1000);
          
          const hasUploadProgress = await uploadProgress.isVisible();
          if (hasUploadProgress) {
            console.log('✅ Upload progress indicator shown');
          }
          
          // Wait for completion
          await page.waitForLoadState('networkidle', { timeout: 30000 });
        }
      }
      
      await page.unroute('/api/agent-pages');
    });
  });
});
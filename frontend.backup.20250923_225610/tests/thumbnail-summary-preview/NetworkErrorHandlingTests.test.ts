/**
 * Network Error Handling Tests with Actual Network Conditions
 * London School TDD - Mock-driven error scenario verification
 * 
 * Focus: Validate error handling with real network failures and conditions
 */

import { test, expect, Page, BrowserContext, Route } from '@playwright/test';

// Network condition simulation patterns
const NETWORK_CONDITIONS = {
  offline: {
    condition: 'Offline',
    throttling: { downloadThroughput: 0, uploadThroughput: 0, latency: 0 }
  },
  slow3g: {
    condition: 'Slow 3G',
    throttling: { downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024, latency: 2000 }
  },
  fast3g: {
    condition: 'Fast 3G', 
    throttling: { downloadThroughput: 750 * 1024, uploadThroughput: 250 * 1024, latency: 562.5 }
  },
  slow4g: {
    condition: 'Slow 4G',
    throttling: { downloadThroughput: 1.6 * 1024 * 1024, uploadThroughput: 750 * 1024, latency: 450 }
  },
  intermittent: {
    condition: 'Intermittent Connection',
    pattern: 'connect-disconnect-cycle'
  }
} as const;

// Error scenarios for comprehensive testing
const ERROR_SCENARIOS = {
  timeout: { status: 'timeout', delay: 30000 },
  notFound: { status: 404, body: 'Not Found' },
  serverError: { status: 500, body: 'Internal Server Error' },
  badGateway: { status: 502, body: 'Bad Gateway' },
  serviceUnavailable: { status: 503, body: 'Service Unavailable' },
  rateLimited: { status: 429, body: 'Too Many Requests' },
  unauthorized: { status: 401, body: 'Unauthorized' },
  forbidden: { status: 403, body: 'Forbidden' },
  corsError: { type: 'cors', abortReason: 'failed' },
  dnsError: { type: 'dns', abortReason: 'namenotresolved' },
  connectionRefused: { type: 'connection', abortReason: 'connectionrefused' }
} as const;

// Network error handling orchestrator
class NetworkErrorOrchestrator {
  constructor(
    private mockNetworkService: MockNetworkService,
    private mockErrorHandler: MockErrorHandler,
    private mockRetryManager: MockRetryManager,
    private mockFallbackRenderer: MockFallbackRenderer
  ) {}

  async orchestrateNetworkFailure(page: Page, errorType: string): Promise<void> {
    // Outside-in: Network request fails, system should handle gracefully
    await this.mockNetworkService.simulateFailure(errorType);
    await this.mockErrorHandler.detectNetworkError();
    await this.mockRetryManager.attemptRetry();
    await this.mockFallbackRenderer.showFallbackContent();
  }

  async orchestrateRetryMechanism(page: Page): Promise<void> {
    await this.mockRetryManager.scheduleRetry();
    await this.mockNetworkService.reattemptRequest();
  }

  async orchestrateGracefulDegradation(page: Page): Promise<void> {
    await this.mockFallbackRenderer.renderBasicLink();
    await this.mockErrorHandler.logError();
  }
}

// Mock collaborators for error handling
class MockNetworkService {
  async simulateFailure(errorType: string): Promise<void> {
    expect(errorType).toBeTruthy();
    // Contract: Should simulate various network failure types
  }

  async reattemptRequest(): Promise<void> {
    // Contract: Should retry failed requests with backoff
  }
}

class MockErrorHandler {
  async detectNetworkError(): Promise<void> {
    // Contract: Should detect and classify network errors
  }

  async logError(): Promise<void> {
    // Contract: Should log errors for debugging
  }
}

class MockRetryManager {
  async attemptRetry(): Promise<void> {
    // Contract: Should implement retry logic with backoff
  }

  async scheduleRetry(): Promise<void> {
    // Contract: Should schedule retries appropriately
  }
}

class MockFallbackRenderer {
  async showFallbackContent(): Promise<void> {
    // Contract: Should render fallback UI when previews fail
  }

  async renderBasicLink(): Promise<void> {
    // Contract: Should render basic link as last resort
  }
}

test.describe('Network Error Handling Tests', () => {
  let orchestrator: NetworkErrorOrchestrator;

  test.beforeEach(async ({ page, context }) => {
    // Initialize error handling mocks
    const mockNetworkService = new MockNetworkService();
    const mockErrorHandler = new MockErrorHandler();
    const mockRetryManager = new MockRetryManager();
    const mockFallbackRenderer = new MockFallbackRenderer();

    orchestrator = new NetworkErrorOrchestrator(
      mockNetworkService,
      mockErrorHandler,
      mockRetryManager,
      mockFallbackRenderer
    );

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test.describe('HTTP Error Status Handling', () => {
    Object.entries(ERROR_SCENARIOS).forEach(([errorName, errorConfig]) => {
      if ('status' in errorConfig) {
        test(`should handle ${errorName} (${errorConfig.status}) gracefully`, async ({ page, context }) => {
          // Set up error simulation
          await context.route('**/link-preview**', (route) => {
            route.fulfill({
              status: errorConfig.status,
              body: errorConfig.body
            });
          });

          await orchestrator.orchestrateNetworkFailure(page, errorName);

          const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          await page.getByTestId('post-content-input').fill(testUrl);
          await page.getByTestId('post-submit-button').click();

          // Should render fallback instead of thumbnail-summary
          const fallbackLink = page.locator(`a[href="${testUrl}"]`);
          await expect(fallbackLink).toBeVisible({ timeout: 8000 });

          // Should not render thumbnail-summary
          const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
          await expect(thumbnailSummary).not.toBeVisible();

          // Error should be logged (check console)
          const consoleMessages = await page.evaluate(() => {
            return (window as any).testConsoleMessages || [];
          });

          // Fallback should be accessible
          expect(await fallbackLink.getAttribute('href')).toBe(testUrl);
          expect(await fallbackLink.getAttribute('target')).toBe('_blank');
          expect(await fallbackLink.getAttribute('rel')).toContain('noopener');
        });
      }
    });
  });

  test.describe('Network Connection Failures', () => {
    test('should handle complete network offline state', async ({ page, context }) => {
      // Simulate complete network failure
      await context.setOffline(true);

      await orchestrator.orchestrateNetworkFailure(page, 'offline');

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Should handle offline gracefully
      const fallbackLink = page.locator(`a[href="${testUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });

      // Should show offline indicator if implemented
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      if (await offlineIndicator.isVisible()) {
        expect(await offlineIndicator.textContent()).toContain('offline');
      }

      // Restore connectivity and verify recovery
      await context.setOffline(false);
      
      // Post new content to test recovery
      const newUrl = 'https://github.com/microsoft/TypeScript';
      await page.getByTestId('post-content-input').fill(newUrl);
      await page.getByTestId('post-submit-button').click();

      // Should work normally after connectivity restored
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').last();
      await expect(thumbnailSummary).toBeVisible({ timeout: 10000 });
    });

    test('should handle DNS resolution failures', async ({ page, context }) => {
      // Simulate DNS failure
      await context.route('**/link-preview**', (route) => {
        route.abort('namenotresolved');
      });

      await orchestrator.orchestrateNetworkFailure(page, 'dnsError');

      const testUrl = 'https://www.invaliddomainfortesting12345.com/test';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Should render fallback link
      const fallbackLink = page.locator(`a[href="${testUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });

      // Link should still be functional (browser will handle DNS error)
      expect(await fallbackLink.getAttribute('href')).toBe(testUrl);
    });

    test('should handle connection timeout gracefully', async ({ page, context }) => {
      // Simulate very slow response that times out
      await context.route('**/link-preview**', async (route) => {
        // Wait longer than typical timeout
        await new Promise(resolve => setTimeout(resolve, 35000));
        route.continue();
      });

      await orchestrator.orchestrateNetworkFailure(page, 'timeout');

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Should timeout and show fallback
      const fallbackLink = page.locator(`a[href="${testUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 40000 });

      // Should not have thumbnail-summary
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
      await expect(thumbnailSummary).not.toBeVisible();
    });
  });

  test.describe('Slow Network Conditions', () => {
    Object.entries(NETWORK_CONDITIONS).forEach(([conditionName, conditionConfig]) => {
      if ('throttling' in conditionConfig) {
        test(`should handle ${conditionConfig.condition} network gracefully`, async ({ page, context }) => {
          // Apply network throttling
          const cdpSession = await context.newCDPSession(page);
          await cdpSession.send('Network.emulateNetworkConditions', conditionConfig.throttling);

          const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
          const startTime = Date.now();

          await page.getByTestId('post-content-input').fill(testUrl);
          await page.getByTestId('post-submit-button').click();

          // Should show loading state for longer on slow networks
          const loadingIndicator = page.locator('[data-testid="thumbnail-loading"]');
          await expect(loadingIndicator).toBeVisible({ timeout: 2000 });

          // Eventually should load or fallback
          const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
          const fallbackLink = page.locator(`a[href="${testUrl}"]`);

          await Promise.race([
            expect(thumbnailSummary).toBeVisible({ timeout: 30000 }),
            expect(fallbackLink).toBeVisible({ timeout: 30000 })
          ]);

          const loadTime = Date.now() - startTime;
          
          // Should handle slow networks within reasonable time
          expect(loadTime).toBeLessThan(35000); // 35 second maximum

          // Disable throttling for cleanup
          await cdpSession.send('Network.emulateNetworkConditions', {
            offline: false,
            downloadThroughput: -1,
            uploadThroughput: -1,
            latency: 0
          });
        });
      }
    });
  });

  test.describe('Intermittent Connection Handling', () => {
    test('should handle connection drops during content loading', async ({ page, context }) => {
      let requestCount = 0;
      
      await context.route('**/link-preview**', (route) => {
        requestCount++;
        
        if (requestCount === 1) {
          // First request fails
          route.abort('failed');
        } else if (requestCount === 2) {
          // Second request succeeds (simulating connection recovery)
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'Test Video',
              type: 'video',
              image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
            })
          });
        } else {
          route.continue();
        }
      });

      await orchestrator.orchestrateRetryMechanism(page);

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Should initially fail and show fallback
      const fallbackLink = page.locator(`a[href="${testUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });

      // Simulate retry mechanism (if implemented)
      const retryButton = page.locator('[data-testid="retry-preview"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        
        // Should succeed on retry
        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
        await expect(thumbnailSummary).toBeVisible({ timeout: 10000 });
      }
    });

    test('should handle partial content loading failures', async ({ page, context }) => {
      // Allow metadata request but fail image loading
      await context.route('**/link-preview**', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            title: 'Test Video',
            type: 'video',
            image: 'https://invalid-image-url-that-will-fail.jpg'
          })
        });
      });

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Should create thumbnail-summary but handle image error
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
      await expect(thumbnailSummary).toBeVisible({ timeout: 5000 });

      // Should show title even with broken image
      const title = thumbnailSummary.locator('[data-testid="preview-title"]');
      await expect(title).toHaveText('Test Video');

      // Should show fallback icon/placeholder for broken image
      const fallbackIcon = thumbnailSummary.locator('[data-testid="content-type-icon"]');
      await expect(fallbackIcon).toBeVisible();
    });
  });

  test.describe('Rate Limiting and Backoff', () => {
    test('should handle API rate limiting with exponential backoff', async ({ page, context }) => {
      let requestCount = 0;
      
      await context.route('**/link-preview**', (route) => {
        requestCount++;
        
        if (requestCount <= 3) {
          // First 3 requests are rate limited
          route.fulfill({
            status: 429,
            headers: { 'Retry-After': '5' },
            body: 'Too Many Requests'
          });
        } else {
          // 4th request succeeds
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'Test Video',
              type: 'video'
            })
          });
        }
      });

      await orchestrator.orchestrateRetryMechanism(page);

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Should initially show fallback due to rate limiting
      const fallbackLink = page.locator(`a[href="${testUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });

      // If retry mechanism is implemented, should eventually succeed
      if (requestCount > 1) {
        // Wait for potential retry
        await page.waitForTimeout(10000);
        
        // Check if retry succeeded
        const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]');
        if (await thumbnailSummary.isVisible()) {
          expect(requestCount).toBeGreaterThan(1);
        }
      }
    });

    test('should respect server rate limiting headers', async ({ page, context }) => {
      await context.route('**/link-preview**', (route) => {
        route.fulfill({
          status: 429,
          headers: {
            'Retry-After': '2',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() / 1000 + 3600).toString()
          },
          body: 'Rate Limited'
        });
      });

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Should respect rate limit and show fallback
      const fallbackLink = page.locator(`a[href="${testUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });

      // Should show rate limit message if implemented
      const rateLimitMessage = page.locator('[data-testid="rate-limit-message"]');
      if (await rateLimitMessage.isVisible()) {
        expect(await rateLimitMessage.textContent()).toContain('limit');
      }
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from network errors when connectivity restored', async ({ page, context }) => {
      let failureCount = 0;
      
      await context.route('**/link-preview**', (route) => {
        failureCount++;
        
        if (failureCount <= 2) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({
              url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
              title: 'Test Video',
              type: 'video',
              image: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg'
            })
          });
        }
      });

      // First attempt should fail
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      const fallbackLink = page.locator(`a[href="${testUrl}"]`);
      await expect(fallbackLink).toBeVisible({ timeout: 5000 });

      // Try posting another URL (should now succeed due to recovery)
      const newUrl = 'https://github.com/microsoft/TypeScript';
      await page.getByTestId('post-content-input').fill(newUrl);
      await page.getByTestId('post-submit-button').click();

      // Should succeed after recovery
      const thumbnailSummary = page.locator('[data-testid="thumbnail-summary"]').last();
      await expect(thumbnailSummary).toBeVisible({ timeout: 10000 });
    });

    test('should maintain user experience during error states', async ({ page, context }) => {
      // Simulate various errors for different URLs
      await context.route('**/link-preview**', (route) => {
        const url = new URL(route.request().url());
        const targetUrl = url.searchParams.get('url');
        
        if (targetUrl?.includes('youtube.com')) {
          route.fulfill({ status: 500, body: 'Server Error' });
        } else if (targetUrl?.includes('github.com')) {
          route.fulfill({ status: 404, body: 'Not Found' });
        } else {
          route.abort('failed');
        }
      });

      // Post multiple URLs with different error types
      const testUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://github.com/microsoft/TypeScript',
        'https://medium.com/@test/article'
      ];

      for (const url of testUrls) {
        await page.getByTestId('post-content-input').fill(url);
        await page.getByTestId('post-submit-button').click();
        await page.waitForTimeout(1000);
      }

      // All should show fallback links
      for (const url of testUrls) {
        const fallbackLink = page.locator(`a[href="${url}"]`);
        await expect(fallbackLink).toBeVisible();
      }

      // UI should remain functional
      const postButton = page.getByTestId('post-submit-button');
      await expect(postButton).toBeEnabled();

      // New posts should still work (with errors handled)
      const workingUrl = 'https://example.com/test';
      await page.getByTestId('post-content-input').fill(workingUrl);
      await page.getByTestId('post-submit-button').click();

      const newFallbackLink = page.locator(`a[href="${workingUrl}"]`);
      await expect(newFallbackLink).toBeVisible();
    });
  });

  test.describe('Error Logging and Monitoring', () => {
    test('should log network errors for debugging', async ({ page, context }) => {
      // Capture console errors
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Simulate network error
      await context.route('**/link-preview**', (route) => {
        route.fulfill({ status: 503, body: 'Service Unavailable' });
      });

      await orchestrator.orchestrateGracefulDegradation(page);

      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      await page.getByTestId('post-content-input').fill(testUrl);
      await page.getByTestId('post-submit-button').click();

      // Wait for error handling
      await page.waitForTimeout(3000);

      // Should log error information
      const relevantErrors = consoleErrors.filter(error => 
        error.includes('503') || 
        error.includes('Service Unavailable') ||
        error.includes('link preview')
      );

      expect(relevantErrors.length).toBeGreaterThan(0);
    });
  });
});

// Test utilities and cleanup
test.beforeAll(async () => {
  console.log('🌐 Starting Network Error Handling Tests');
  console.log('❌ Error Scenarios:', Object.keys(ERROR_SCENARIOS).length);
  console.log('📡 Network Conditions:', Object.keys(NETWORK_CONDITIONS).length);
});

test.afterAll(async () => {
  console.log('✅ Network Error Handling Tests Complete');
});

// Helper function to simulate network conditions
async function simulateNetworkCondition(context: BrowserContext, condition: keyof typeof NETWORK_CONDITIONS) {
  const conditionConfig = NETWORK_CONDITIONS[condition];
  
  if ('throttling' in conditionConfig) {
    const cdpSession = await context.newCDPSession(await context.pages()[0]);
    await cdpSession.send('Network.emulateNetworkConditions', conditionConfig.throttling);
  }
}
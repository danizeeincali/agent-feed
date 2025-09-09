/**
 * SERVER CONNECTION HEALTH MONITORING & GRACEFUL DEGRADATION
 * 
 * Tests to prevent server connection failures where frontend works but shows empty data
 * due to backend crashes, API endpoint changes, or network issues.
 */

import { test, expect } from '@playwright/test';
import { Page } from 'playwright';

interface APIEndpointHealth {
  endpoint: string;
  status: number;
  responseTime: number;
  isHealthy: boolean;
  errorMessage?: string;
  hasGracefulDegradation: boolean;
}

interface ConnectionFailurePattern {
  type: string;
  description: string;
  evidence: Record<string, any>;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  hasRecovery: boolean;
}

class ServerConnectionMonitor {
  
  async monitorAPIHealth(page: Page): Promise<APIEndpointHealth[]> {
    const endpoints = [
      '/api/health',
      '/api/posts',
      '/api/comments',
      '/api/mentions',
      '/api/agents',
      '/api/drafts'
    ];

    const results: APIEndpointHealth[] = [];

    for (const endpoint of endpoints) {
      const startTime = Date.now();
      
      try {
        const response = await page.request.get(endpoint);
        const responseTime = Date.now() - startTime;
        
        const result: APIEndpointHealth = {
          endpoint,
          status: response.status(),
          responseTime,
          isHealthy: response.ok(),
          hasGracefulDegradation: false
        };

        if (!response.ok()) {
          result.errorMessage = await response.text().catch(() => 'Unknown error');
        }

        results.push(result);
      } catch (error) {
        results.push({
          endpoint,
          status: 0,
          responseTime: Date.now() - startTime,
          isHealthy: false,
          errorMessage: error.toString(),
          hasGracefulDegradation: false
        });
      }
    }

    return results;
  }

  async testGracefulDegradation(page: Page): Promise<ConnectionFailurePattern[]> {
    const failures: ConnectionFailurePattern[] = [];

    // Test with network offline
    await page.context().setOffline(true);
    
    try {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 10000 });
    } catch (e) {
      // Expected to fail or show offline state
    }

    // Check for graceful degradation indicators
    const offlineHandling = await page.evaluate(() => {
      const indicators = {
        hasOfflineMessage: !!(document.querySelector('[data-testid="offline-message"]') || 
                            document.querySelector('.offline') ||
                            document.textContent?.includes('offline') ||
                            document.textContent?.includes('No connection')),
        hasLoadingState: !!(document.querySelector('[data-testid="loading"]') ||
                          document.querySelector('.loading') ||
                          document.querySelector('.spinner')),
        hasErrorBoundary: !!(document.querySelector('[data-testid="error-boundary"]') ||
                           document.querySelector('.error-boundary')),
        hasCachedContent: document.body.textContent?.length > 100,
        hasRetryMechanism: !!(document.querySelector('[data-testid="retry"]') ||
                            document.querySelector('button[onclick*="retry"]') ||
                            document.textContent?.includes('Try again')),
        showsEmptyState: document.body.textContent?.length < 50
      };

      return indicators;
    });

    // Restore network
    await page.context().setOffline(false);

    // Analyze offline handling
    if (!offlineHandling.hasOfflineMessage && !offlineHandling.hasLoadingState && !offlineHandling.hasErrorBoundary) {
      failures.push({
        type: 'NoOfflineHandling',
        description: 'No graceful handling of offline state detected',
        evidence: offlineHandling,
        severity: 'HIGH',
        hasRecovery: false
      });
    }

    if (offlineHandling.showsEmptyState && !offlineHandling.hasOfflineMessage) {
      failures.push({
        type: 'EmptyStateWithoutExplanation',
        description: 'Shows empty state without explaining connection issue',
        evidence: { showsEmptyState: true, hasOfflineMessage: false },
        severity: 'MEDIUM',
        hasRecovery: false
      });
    }

    if (!offlineHandling.hasRetryMechanism) {
      failures.push({
        type: 'NoRetryMechanism',
        description: 'No retry mechanism available for failed connections',
        evidence: { hasRetryMechanism: false },
        severity: 'MEDIUM',
        hasRecovery: false
      });
    }

    return failures;
  }

  async testAPIErrorHandling(page: Page): Promise<ConnectionFailurePattern[]> {
    const failures: ConnectionFailurePattern[] = [];

    // Test with mocked API failures
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/api/posts')) {
        // Simulate server error
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      } else if (url.includes('/api/comments')) {
        // Simulate timeout
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request Timeout' })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Check error handling
    const errorHandling = await page.evaluate(() => {
      return {
        hasErrorMessages: !!(document.querySelector('[data-testid="error-message"]') ||
                           document.querySelector('.error-message') ||
                           document.textContent?.includes('Error') ||
                           document.textContent?.includes('failed to load')),
        hasRetryButtons: !!(document.querySelector('[data-testid="retry-button"]') ||
                          document.querySelector('button[onclick*="retry"]')),
        hasGracefulFallback: !!(document.querySelector('[data-testid="fallback-content"]') ||
                              document.textContent?.includes('Please try again')),
        showsLoadingForever: !!(document.querySelector('.loading') || 
                              document.querySelector('.spinner')),
        showsEmptyWithoutExplanation: document.body.textContent?.length < 100 &&
                                    !document.textContent?.includes('Error') &&
                                    !document.textContent?.includes('loading')
      };
    });

    if (!errorHandling.hasErrorMessages && errorHandling.showsEmptyWithoutExplanation) {
      failures.push({
        type: 'SilentFailure',
        description: 'API failure results in empty UI without error indication',
        evidence: errorHandling,
        severity: 'CRITICAL',
        hasRecovery: false
      });
    }

    if (errorHandling.showsLoadingForever) {
      failures.push({
        type: 'InfiniteLoading',
        description: 'Loading state persists indefinitely on API failure',
        evidence: { showsLoadingForever: true },
        severity: 'HIGH',
        hasRecovery: false
      });
    }

    if (!errorHandling.hasRetryButtons && errorHandling.hasErrorMessages) {
      failures.push({
        type: 'NoRecoveryMechanism',
        description: 'Error shown but no way for user to recover',
        evidence: { hasErrorMessages: true, hasRetryButtons: false },
        severity: 'MEDIUM',
        hasRecovery: false
      });
    }

    return failures;
  }

  async testRealTimeConnectionHealth(page: Page): Promise<{ websocketHealth: boolean, sseHealth: boolean, issues: string[] }> {
    const issues: string[] = [];

    // Monitor WebSocket connections
    const websocketHealth = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        try {
          const ws = new WebSocket('ws://localhost:3000');
          
          ws.onopen = () => {
            ws.close();
            resolve(true);
          };
          
          ws.onerror = () => {
            resolve(false);
          };
          
          // Timeout after 3 seconds
          setTimeout(() => resolve(false), 3000);
        } catch (e) {
          resolve(false);
        }
      });
    });

    // Monitor Server-Sent Events
    const sseHealth = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        try {
          const eventSource = new EventSource('/api/events');
          
          eventSource.onopen = () => {
            eventSource.close();
            resolve(true);
          };
          
          eventSource.onerror = () => {
            eventSource.close();
            resolve(false);
          };
          
          // Timeout after 3 seconds
          setTimeout(() => {
            eventSource.close();
            resolve(false);
          }, 3000);
        } catch (e) {
          resolve(false);
        }
      });
    });

    if (!websocketHealth) {
      issues.push('WebSocket connection failed');
    }

    if (!sseHealth) {
      issues.push('Server-Sent Events connection failed');
    }

    return { websocketHealth, sseHealth, issues };
  }

  async validateDataConsistency(page: Page): Promise<ConnectionFailurePattern[]> {
    const failures: ConnectionFailurePattern[] = [];

    await page.goto('/');
    await page.waitForTimeout(2000);

    // Check for data loading patterns
    const dataState = await page.evaluate(() => {
      const posts = document.querySelectorAll('[data-testid*="post"]');
      const comments = document.querySelectorAll('[data-testid*="comment"]');
      const loadingIndicators = document.querySelectorAll('[data-testid*="loading"], .loading, .spinner');
      const emptyStates = document.querySelectorAll('[data-testid*="empty"], .empty-state');

      return {
        postsCount: posts.length,
        commentsCount: comments.length,
        loadingCount: loadingIndicators.length,
        emptyStateCount: emptyStates.length,
        hasContent: document.body.textContent?.length > 200,
        hasErrorMessages: !!(document.textContent?.includes('Error') || 
                           document.textContent?.includes('failed')),
        bodyText: document.body.textContent?.substring(0, 500)
      };
    });

    // Check for data consistency issues
    if (!dataState.hasContent && !dataState.loadingCount && !dataState.emptyStateCount && !dataState.hasErrorMessages) {
      failures.push({
        type: 'EmptyPageWithoutExplanation',
        description: 'Page appears empty with no loading, error, or empty state indicators',
        evidence: dataState,
        severity: 'CRITICAL',
        hasRecovery: false
      });
    }

    if (dataState.loadingCount > 0 && dataState.postsCount === 0 && dataState.commentsCount === 0) {
      // Wait a bit more to see if loading resolves
      await page.waitForTimeout(5000);
      
      const stillLoading = await page.evaluate(() => {
        return document.querySelectorAll('[data-testid*="loading"], .loading, .spinner').length > 0;
      });

      if (stillLoading) {
        failures.push({
          type: 'PersistentLoadingState',
          description: 'Content never loads despite loading indicators',
          evidence: { persistentLoading: true, duration: '7+ seconds' },
          severity: 'HIGH',
          hasRecovery: false
        });
      }
    }

    return failures;
  }
}

test.describe('Server Connection Health Monitoring', () => {
  let monitor: ServerConnectionMonitor;

  test.beforeEach(() => {
    monitor = new ServerConnectionMonitor();
  });

  test('should validate API endpoint health', async ({ page }) => {
    const healthResults = await monitor.monitorAPIHealth(page);

    // Log health status for all endpoints
    console.log('API Health Status:');
    healthResults.forEach(result => {
      console.log(`${result.endpoint}: ${result.isHealthy ? '✅' : '❌'} (${result.status}) ${result.responseTime}ms`);
      if (result.errorMessage) {
        console.log(`  Error: ${result.errorMessage}`);
      }
    });

    // Critical endpoints should be healthy
    const criticalEndpoints = ['/api/health', '/api/posts'];
    const unhealthyCritical = healthResults.filter(r => 
      criticalEndpoints.includes(r.endpoint) && !r.isHealthy
    );

    expect(unhealthyCritical).toHaveLength(0);

    // Response times should be reasonable (< 2 seconds)
    const slowEndpoints = healthResults.filter(r => r.responseTime > 2000);
    expect(slowEndpoints.length).toBeLessThanOrEqual(1); // Allow 1 slow endpoint
  });

  test('should provide graceful degradation for offline scenarios', async ({ page }) => {
    const degradationFailures = await monitor.testGracefulDegradation(page);

    // Log degradation analysis
    if (degradationFailures.length > 0) {
      console.log('Graceful degradation issues:', degradationFailures);
    }

    // Should not have critical degradation failures
    const criticalFailures = degradationFailures.filter(f => f.severity === 'CRITICAL');
    expect(criticalFailures).toHaveLength(0);

    // Should have some form of offline handling
    const hasOfflineHandling = degradationFailures.length === 0 || 
                              !degradationFailures.some(f => f.type === 'NoOfflineHandling');
    expect(hasOfflineHandling).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    const errorFailures = await monitor.testAPIErrorHandling(page);

    // Log error handling analysis
    if (errorFailures.length > 0) {
      console.log('API error handling issues:', errorFailures);
    }

    // Should not have silent failures
    const silentFailures = errorFailures.filter(f => f.type === 'SilentFailure');
    expect(silentFailures).toHaveLength(0);

    // Should not have infinite loading
    const infiniteLoading = errorFailures.filter(f => f.type === 'InfiniteLoading');
    expect(infiniteLoading).toHaveLength(0);

    // Should provide recovery mechanisms for errors
    const noRecovery = errorFailures.filter(f => f.type === 'NoRecoveryMechanism');
    expect(noRecovery.length).toBeLessThanOrEqual(1); // Allow some errors without recovery
  });

  test('should monitor real-time connection health', async ({ page }) => {
    const connectionHealth = await monitor.testRealTimeConnectionHealth(page);

    console.log('Real-time connection health:', connectionHealth);

    // Should have working real-time connections or graceful fallbacks
    if (connectionHealth.issues.length > 0) {
      // Check if app still functions without real-time features
      await page.goto('/');
      await page.waitForTimeout(2000);

      const appStillWorks = await page.evaluate(() => {
        return document.body.textContent?.length > 100 && 
               !document.textContent?.includes('Connection failed');
      });

      expect(appStillWorks).toBe(true);
    }
  });

  test('should validate data consistency and loading patterns', async ({ page }) => {
    const consistencyFailures = await monitor.validateDataConsistency(page);

    // Log consistency analysis
    if (consistencyFailures.length > 0) {
      console.log('Data consistency issues:', consistencyFailures);
    }

    // Should not show empty page without explanation
    const emptyPageFailures = consistencyFailures.filter(f => f.type === 'EmptyPageWithoutExplanation');
    expect(emptyPageFailures).toHaveLength(0);

    // Should not have persistent loading without resolution
    const persistentLoading = consistencyFailures.filter(f => f.type === 'PersistentLoadingState');
    expect(persistentLoading).toHaveLength(0);
  });

  test('should test backend service recovery', async ({ page }) => {
    // Test service recovery by simulating backend restart
    await page.route('**/api/**', async route => {
      // First simulate failure
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' })
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    // Check initial failure state
    const initialState = await page.evaluate(() => {
      return {
        hasErrorIndicator: !!(document.textContent?.includes('Error') || 
                            document.textContent?.includes('unavailable') ||
                            document.querySelector('[data-testid*="error"]')),
        hasRetryOption: !!(document.textContent?.includes('retry') ||
                         document.textContent?.includes('Try again') ||
                         document.querySelector('[data-testid*="retry"]'))
      };
    });

    // Now simulate service recovery
    await page.unroute('**/api/**');

    // Try to recover - either through retry button or automatic retry
    if (initialState.hasRetryOption) {
      const retryButton = page.locator('[data-testid*="retry"], button:has-text("retry"), button:has-text("Try again")').first();
      if (await retryButton.count() > 0) {
        await retryButton.click();
      }
    } else {
      // Refresh page to simulate manual recovery
      await page.reload();
    }

    await page.waitForTimeout(2000);

    // Check recovery state
    const recoveryState = await page.evaluate(() => {
      return {
        hasContent: document.body.textContent?.length > 200,
        noErrorMessages: !document.textContent?.includes('Error'),
        functionalUI: !!(document.querySelector('input, button, [data-testid]'))
      };
    });

    // Should recover successfully
    expect(recoveryState.hasContent).toBe(true);
    expect(recoveryState.functionalUI).toBe(true);
  });

  test('should monitor connection timeout handling', async ({ page }) => {
    // Set up slow responses to test timeout handling
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/api/posts') || url.includes('/api/comments')) {
        // Simulate slow response
        await new Promise(resolve => setTimeout(resolve, 8000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    const startTime = Date.now();
    await page.goto('/', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // Should either load quickly with timeouts or show appropriate loading states
    if (loadTime > 5000) {
      const hasTimeoutHandling = await page.evaluate(() => {
        return !!(document.textContent?.includes('Taking longer') ||
                 document.textContent?.includes('timeout') ||
                 document.textContent?.includes('Please wait') ||
                 document.querySelector('[data-testid*="timeout"]'));
      });

      // Should communicate long loading times to user
      expect(hasTimeoutHandling).toBe(true);
    }
  });

  test('should export server connection neural training data', async ({ page }) => {
    const healthResults = await monitor.monitorAPIHealth(page);
    const degradationFailures = await monitor.testGracefulDegradation(page);
    const errorFailures = await monitor.testAPIErrorHandling(page);
    const connectionHealth = await monitor.testRealTimeConnectionHealth(page);
    const consistencyFailures = await monitor.validateDataConsistency(page);

    const allFailures = [...degradationFailures, ...errorFailures, ...consistencyFailures];

    const neuralTrainingData = {
      timestamp: new Date().toISOString(),
      testType: 'server-connection-health-monitoring',
      apiHealth: {
        endpointsCount: healthResults.length,
        healthyEndpoints: healthResults.filter(r => r.isHealthy).length,
        averageResponseTime: healthResults.reduce((sum, r) => sum + r.responseTime, 0) / healthResults.length,
        criticalEndpointsHealthy: healthResults.filter(r => ['/api/health', '/api/posts'].includes(r.endpoint) && r.isHealthy).length
      },
      connectionHealth,
      failures: allFailures,
      patternClassification: allFailures.some(f => f.severity === 'CRITICAL') ? 'CONNECTION_CRITICAL_FAILURE' :
                           allFailures.some(f => f.severity === 'HIGH') ? 'CONNECTION_HIGH_FAILURE' :
                           allFailures.length > 0 ? 'CONNECTION_MINOR_ISSUES' : 'CONNECTION_HEALTHY',
      severity: allFailures.some(f => f.severity === 'CRITICAL') ? 'CRITICAL' :
               allFailures.some(f => f.severity === 'HIGH') ? 'HIGH' :
               allFailures.length > 0 ? 'MEDIUM' : 'LOW',
      neuralWeight: allFailures.some(f => f.severity === 'CRITICAL') ? 0.95 :
                   allFailures.some(f => f.severity === 'HIGH') ? 0.8 :
                   allFailures.length > 0 ? 0.5 : 0.1,
      preventionRules: [
        'Implement graceful offline handling with clear user communication',
        'Provide retry mechanisms for failed API calls',
        'Show appropriate loading states during API calls',
        'Avoid silent failures - always communicate errors to users',
        'Monitor API response times and implement timeouts',
        'Test recovery scenarios for backend service failures',
        'Implement error boundaries for API-related failures',
        'Provide fallback content when possible'
      ],
      healthIndicators: [
        'API endpoints respond within 2 seconds',
        'Graceful degradation for offline scenarios',
        'Clear error messages for API failures', 
        'Recovery mechanisms available after failures',
        'Real-time connections fail gracefully',
        'No silent failures or infinite loading states',
        'Data consistency maintained during connection issues'
      ]
    };

    // Validate neural training data structure
    expect(neuralTrainingData.patternClassification).toMatch(/^(CONNECTION_CRITICAL_FAILURE|CONNECTION_HIGH_FAILURE|CONNECTION_MINOR_ISSUES|CONNECTION_HEALTHY)$/);
    expect(neuralTrainingData.neuralWeight).toBeGreaterThan(0);
    expect(neuralTrainingData.neuralWeight).toBeLessThanOrEqual(1);
    expect(neuralTrainingData.preventionRules.length).toBeGreaterThan(0);

    console.log('Server connection neural training data:', JSON.stringify(neuralTrainingData, null, 2));
  });
});
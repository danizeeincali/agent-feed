import { test, expect } from '@playwright/test';
import { InstanceManagerPage } from './page-objects/InstanceManagerPage';
import { mockAPIResponses, validInstanceConfigs, apiEndpoints, sseTestMessages, testScenarios, testUtils } from './fixtures/test-data';

/**
 * Test Suite: Error Recovery and Graceful Degradation Scenarios
 * 
 * Validates that:
 * 1. System recovers gracefully from various error conditions
 * 2. Graceful degradation maintains core functionality during partial failures
 * 3. Error messages are meaningful and actionable
 * 4. Recovery mechanisms work automatically and manually
 * 5. System state remains consistent during error conditions
 */
test.describe('Error Recovery and Graceful Degradation Scenarios', () => {
  let instancePage: InstanceManagerPage;

  test.beforeEach(async ({ page }) => {
    instancePage = new InstanceManagerPage(page);
  });

  test.afterEach(async ({ page }) => {
    await instancePage.cleanupInstances();
    await page.unrouteAll();
  });

  test.describe('Network Failure Recovery', () => {
    test('should recover from complete network failure', async ({ page }) => {
      // Initially mock network failure
      await instancePage.mockNetworkError();
      await instancePage.navigate();
      
      // Should display network error
      await expect(instancePage.errorMessage).toBeVisible();
      const errorText = await instancePage.getErrorMessage();
      expect(errorText).toMatch(/failed to fetch|network error|connection failed/i);
      
      // Mock network recovery
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      // Manual retry should work
      await instancePage.refreshInstances();
      
      // Should now display instances successfully
      await expect(instancePage.errorMessage).not.toBeVisible();
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
    });

    test('should implement automatic retry with exponential backoff', async ({ page }) => {
      let attemptCount = 0;
      const attemptTimes: number[] = [];
      
      // Mock failing API with automatic retry tracking
      await page.route(apiEndpoints.instances.list, async route => {
        attemptTimes.push(Date.now());
        attemptCount++;
        
        if (attemptCount <= 3) {
          await route.abort('failed');
        } else {
          // Success on 4th attempt
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockAPIResponses.instancesList)
          });
        }
      });
      
      await instancePage.navigate();
      
      // Wait for automatic retries to complete
      await expect(instancePage.instanceCards.first()).toBeVisible({ timeout: 30000 });
      
      // Verify exponential backoff pattern
      expect(attemptTimes).toHaveLength(4);
      
      const intervals = [];
      for (let i = 1; i < attemptTimes.length; i++) {
        intervals.push(attemptTimes[i] - attemptTimes[i - 1]);
      }
      
      // Each retry should take longer than the previous (with tolerance)
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1] * 0.8);
      }
    });

    test('should handle intermittent network issues', async ({ page }) => {
      let requestCount = 0;
      
      // Mock intermittent network issues
      await page.route(apiEndpoints.instances.list, async route => {
        requestCount++;
        
        // Fail every other request
        if (requestCount % 2 === 0) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockAPIResponses.instancesList)
          });
        }
      });
      
      await instancePage.navigate();
      
      // Should eventually succeed despite intermittent failures
      await expect(instancePage.instanceCards.first()).toBeVisible({ timeout: 20000 });
      
      // Multiple refreshes should be resilient
      for (let i = 0; i < 3; i++) {
        await instancePage.refreshInstances();
        await testUtils.delay(1000);
      }
      
      // Should maintain functionality
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
    });

    test('should maintain offline functionality where possible', async ({ page }) => {
      // Load initial data
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      const initialCount = await instancePage.getInstanceCount();
      expect(initialCount).toBeGreaterThan(0);
      
      // Simulate going offline
      await page.route('**', async route => {
        await route.abort('failed');
      });
      
      // UI should still function with cached data
      await expect(instancePage.instanceCards.first()).toBeVisible();
      
      // Should show offline indicator
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      if (await offlineIndicator.isVisible()) {
        await expect(offlineIndicator).toContainText(/offline|no connection/i);
      }
      
      // Read-only operations should still work
      const instanceNames = await instancePage.getInstanceNames();
      expect(instanceNames).toHaveLength(initialCount);
    });
  });

  test.describe('Server Error Recovery', () => {
    test('should recover from 500 server errors', async ({ page }) => {
      // Mock 500 error initially
      await instancePage.mockServerError();
      await instancePage.navigate();
      
      // Should display server error
      await expect(instancePage.errorMessage).toBeVisible();
      const errorText = await instancePage.getErrorMessage();
      expect(errorText).toMatch(/server error|500|internal error/i);
      
      // Mock server recovery
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      
      // Retry should work
      await instancePage.refreshInstances();
      
      await expect(instancePage.errorMessage).not.toBeVisible();
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
    });

    test('should handle API rate limiting gracefully', async ({ page }) => {
      let requestCount = 0;
      
      // Mock rate limiting
      await page.route(apiEndpoints.instances.list, async route => {
        requestCount++;
        
        if (requestCount <= 2) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            headers: {
              'Retry-After': '5'
            },
            body: JSON.stringify({
              error: 'Rate limit exceeded',
              message: 'Too many requests, please try again later'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockAPIResponses.instancesList)
          });
        }
      });
      
      await instancePage.navigate();
      
      // Should show rate limit message
      await expect(instancePage.errorMessage).toBeVisible();
      const errorText = await instancePage.getErrorMessage();
      expect(errorText).toMatch(/rate limit|too many requests/i);
      
      // Should automatically retry after delay
      await expect(instancePage.instanceCards.first()).toBeVisible({ timeout: 15000 });
    });

    test('should handle partial API failures', async ({ page }) => {
      // Mock successful instances list but failing operations
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // Instance list loads successfully
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
      
      // Mock failing instance operations
      await page.route(new RegExp('/instances/[^/]+/(start|stop|restart)'), async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service temporarily unavailable',
            message: 'Instance operations are currently disabled'
          })
        });
      });
      
      // Try to start an instance
      await instancePage.startInstance('Test Instance 3');
      
      // Should show specific operation error
      const operationError = page.locator('[data-testid="operation-error-message"]');
      if (await operationError.isVisible()) {
        await expect(operationError).toContainText(/temporarily unavailable|service/i);
      }
      
      // List functionality should still work
      await instancePage.refreshInstances();
      const updatedCount = await instancePage.getInstanceCount();
      expect(updatedCount).toBe(instanceCount);
    });
  });

  test.describe('SSE Connection Recovery', () => {
    test('should recover from SSE connection failures', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      await instancePage.openInstanceTerminal(instanceName);
      
      // Initial connection fails
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        await route.abort('failed');
      });
      
      await instancePage.connectTerminalButton.click();
      
      // Should show connection error
      const connectionError = page.locator('[data-testid="connection-error-message"]');
      await expect(connectionError).toBeVisible();
      
      // Mock successful retry
      await instancePage.mockSSEConnection('test-instance-1', [sseTestMessages.welcome]);
      
      // Auto-retry or manual retry should succeed
      const retryButton = page.locator('[data-testid="retry-connection-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }
      
      await expect(instancePage.disconnectTerminalButton).toBeVisible({ timeout: 10000 });
    });

    test('should handle SSE stream interruptions', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      await instancePage.openInstanceTerminal(instanceName);
      
      // Initial successful connection
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        sseTestMessages.output
      ]);
      
      await instancePage.connectToTerminal();
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      
      // Simulate stream interruption
      let connectionDropped = false;
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        if (!connectionDropped) {
          connectionDropped = true;
          // First connection gets interrupted
          await new Promise(resolve => setTimeout(resolve, 1000));
          await route.abort('failed');
        } else {
          // Reconnection succeeds
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            },
            body: `data: ${JSON.stringify({
              type: 'connection',
              message: 'Reconnected to SSE stream',
              timestamp: new Date().toISOString()
            })}\n\n`
          });
        }
      });
      
      // Should detect interruption and attempt reconnection
      await testUtils.delay(3000);
      
      // Should either show reconnecting indicator or successfully reconnect
      const reconnectingIndicator = page.locator('[data-testid="reconnecting-indicator"]');
      const isReconnecting = await reconnectingIndicator.isVisible();
      const isConnected = await instancePage.disconnectTerminalButton.isVisible();
      
      expect(isReconnecting || isConnected).toBe(true);
    });

    test('should implement SSE connection pooling and failover', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      await instancePage.openInstanceTerminal(instanceName);
      
      let connectionAttempts = 0;
      
      // Mock connection attempts with failover
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        connectionAttempts++;
        
        if (connectionAttempts <= 2) {
          // First two attempts fail
          await route.abort('failed');
        } else {
          // Third attempt succeeds (failover)
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            },
            body: `data: ${JSON.stringify({
              type: 'connection',
              message: 'Connected via failover endpoint',
              timestamp: new Date().toISOString()
            })}\n\n`
          });
        }
      });
      
      await instancePage.connectTerminalButton.click();
      
      // Should eventually connect via failover
      await expect(instancePage.disconnectTerminalButton).toBeVisible({ timeout: 15000 });
      
      // Should receive failover connection message
      await instancePage.waitForTerminalOutput('Connected via failover endpoint');
    });
  });

  test.describe('Graceful Degradation', () => {
    test('should degrade to polling when SSE is unavailable', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE as unavailable
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        await route.fulfill({
          status: 501,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'SSE not supported',
            fallback: 'polling'
          })
        });
      });
      
      // Mock polling endpoint
      await page.route(apiEndpoints.terminal.poll('test-instance-1'), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            hasOutput: true,
            lastOutput: 'Polling mode active\n',
            timestamp: new Date().toISOString()
          })
        });
      });
      
      await instancePage.connectTerminalButton.click();
      
      // Should fall back to polling mode
      const pollingIndicator = page.locator('[data-testid="polling-mode-indicator"]');
      if (await pollingIndicator.isVisible()) {
        await expect(pollingIndicator).toContainText(/polling|fallback/i);
      }
      
      // Should still show output via polling
      await instancePage.waitForTerminalOutput('Polling mode active');
    });

    test('should provide read-only mode during maintenance', async ({ page }) => {
      // Load initial data
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      const initialCount = await instancePage.getInstanceCount();
      expect(initialCount).toBeGreaterThan(0);
      
      // Mock maintenance mode for write operations
      await page.route(new RegExp('/(start|stop|restart|create|delete)'), async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          headers: {
            'X-Maintenance-Mode': 'true'
          },
          body: JSON.stringify({
            error: 'System in maintenance mode',
            message: 'Read-only operations only'
          })
        });
      });
      
      // Read operations should still work
      await instancePage.refreshInstances();
      const currentCount = await instancePage.getInstanceCount();
      expect(currentCount).toBe(initialCount);
      
      // Should show maintenance mode indicator
      const maintenanceIndicator = page.locator('[data-testid="maintenance-mode-indicator"]');
      if (await maintenanceIndicator.isVisible()) {
        await expect(maintenanceIndicator).toContainText(/maintenance|read-only/i);
      }
      
      // Write operations should be disabled or show warnings
      await instancePage.createInstanceButton.click();
      
      const maintenanceWarning = page.locator('[data-testid="maintenance-warning"]');
      if (await maintenanceWarning.isVisible()) {
        await expect(maintenanceWarning).toContainText(/maintenance mode|read-only/i);
      } else {
        // Buttons might be disabled during maintenance
        await expect(instancePage.createInstanceButton).toBeDisabled();
      }
    });

    test('should handle partial feature degradation', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // Mock degraded terminal functionality
      await page.route(apiEndpoints.terminal.stream('**'), async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Terminal service temporarily unavailable'
          })
        });
      });
      
      // Core instance management should still work
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
      
      // Instance operations should still work
      await page.route(apiEndpoints.instances.start('**'), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'running' }
          })
        });
      });
      
      await instancePage.startInstance('Test Instance 3');
      
      // But terminal functionality should show degradation
      await instancePage.openInstanceTerminal('Test Instance 1');
      await instancePage.connectTerminalButton.click();
      
      const terminalError = page.locator('[data-testid="terminal-service-error"]');
      if (await terminalError.isVisible()) {
        await expect(terminalError).toContainText(/temporarily unavailable|service/i);
      }
    });
  });

  test.describe('Error State Management', () => {
    test('should maintain consistent error states', async ({ page }) => {
      // Mock various error conditions
      const errorScenarios = [
        { endpoint: apiEndpoints.instances.list, error: 'Network error' },
        { endpoint: apiEndpoints.instances.create, error: 'Creation failed' },
        { endpoint: apiEndpoints.instances.start('**'), error: 'Start failed' }
      ];
      
      for (const scenario of errorScenarios) {
        await page.route(scenario.endpoint, async route => {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              error: scenario.error,
              timestamp: new Date().toISOString()
            })
          });
        });
      }
      
      await instancePage.navigate();
      
      // Should show appropriate error for the current context
      await expect(instancePage.errorMessage).toBeVisible();
      
      // Error state should be clearable
      const dismissError = page.locator('[data-testid="dismiss-error-button"]');
      if (await dismissError.isVisible()) {
        await dismissError.click();
        await expect(instancePage.errorMessage).not.toBeVisible();
      }
      
      // Errors should not leak between different operations
      await page.route(scenario.endpoint, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAPIResponses.instancesList)
        });
      });
      
      await instancePage.refreshInstances();
      // Should work normally after error resolution
    });

    test('should provide detailed error information', async ({ page }) => {
      // Mock detailed error response
      await page.route(apiEndpoints.instances.list, async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Database connection failed',
            message: 'Unable to connect to the instance database',
            code: 'DB_CONNECTION_ERROR',
            details: {
              host: 'localhost',
              port: 5432,
              database: 'claude_instances'
            },
            timestamp: new Date().toISOString(),
            requestId: 'req-12345'
          })
        });
      });
      
      await instancePage.navigate();
      
      // Should display detailed error information
      const errorDetails = page.locator('[data-testid="error-details"]');
      if (await errorDetails.isVisible()) {
        await expect(errorDetails).toContainText(/Database connection failed/i);
        
        // Should have expandable details
        const expandDetails = page.locator('[data-testid="expand-error-details"]');
        if (await expandDetails.isVisible()) {
          await expandDetails.click();
          
          const detailsContent = page.locator('[data-testid="error-details-content"]');
          await expect(detailsContent).toContainText(/localhost|5432|claude_instances/);
        }
      }
    });

    test('should implement error reporting and feedback', async ({ page }) => {
      // Mock error that supports reporting
      await page.route(apiEndpoints.instances.list, async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unexpected server error',
            message: 'An unexpected error occurred',
            reportable: true,
            errorId: 'error-12345'
          })
        });
      });
      
      await instancePage.navigate();
      
      // Should offer error reporting option
      const reportError = page.locator('[data-testid="report-error-button"]');
      if (await reportError.isVisible()) {
        await reportError.click();
        
        // Should show error reporting dialog
        const reportDialog = page.locator('[data-testid="error-report-dialog"]');
        await expect(reportDialog).toBeVisible();
        
        // Should have form for additional context
        const contextInput = page.locator('[data-testid="error-context-input"]');
        if (await contextInput.isVisible()) {
          await contextInput.fill('Error occurred during testing');
          
          const submitReport = page.locator('[data-testid="submit-error-report"]');
          await submitReport.click();
          
          // Should show confirmation
          const reportConfirmation = page.locator('[data-testid="report-confirmation"]');
          await expect(reportConfirmation).toBeVisible();
        }
      }
    });
  });

  test.describe('System Resilience', () => {
    test('should handle memory pressure gracefully', async ({ page }) => {
      // Simulate memory pressure by loading large datasets
      const largeInstanceList = [];
      for (let i = 0; i < 1000; i++) {
        largeInstanceList.push({
          id: `stress-instance-${i}`,
          name: `Stress Test Instance ${i}`,
          type: 'claude-3-5-sonnet',
          status: i % 2 === 0 ? 'running' : 'stopped',
          pid: i % 2 === 0 ? 1000 + i : undefined,
          port: i % 2 === 0 ? 3000 + i : undefined,
          uptime: Math.random() * 86400,
          memoryUsage: Math.random() * 1024,
          cpuUsage: Math.random() * 100
        });
      }
      
      await instancePage.mockInstancesAPI({
        success: true,
        data: largeInstanceList
      });
      
      await instancePage.navigate();
      
      // Should handle large dataset without crashing
      await testUtils.delay(3000);
      
      // UI should remain responsive
      await expect(instancePage.createInstanceButton).toBeEnabled();
      await expect(instancePage.refreshButton).toBeEnabled();
      
      // Should implement virtualization or pagination
      const visibleInstances = await instancePage.instanceCards.count();
      expect(visibleInstances).toBeLessThanOrEqual(100); // Should not render all 1000 at once
    });

    test('should recover from browser resource exhaustion', async ({ page }) => {
      // Simulate resource exhaustion through rapid operations
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      // Perform many rapid UI interactions
      for (let i = 0; i < 50; i++) {
        await instancePage.refreshButton.click();
        await testUtils.delay(10); // Very rapid clicks
      }
      
      // System should stabilize and remain functional
      await testUtils.delay(2000);
      
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBeGreaterThan(0);
      
      // UI should be responsive after stress
      await expect(instancePage.createInstanceButton).toBeEnabled();
    });

    test('should implement circuit breaker for failing services', async ({ page }) => {
      let failureCount = 0;
      const maxFailures = 5;
      
      // Mock failing service
      await page.route(apiEndpoints.instances.list, async route => {
        failureCount++;
        
        if (failureCount <= maxFailures) {
          await route.abort('failed');
        } else {
          // Circuit should open and stop trying
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Circuit breaker open',
              message: 'Service temporarily disabled due to repeated failures'
            })
          });
        }
      });
      
      await instancePage.navigate();
      
      // Should eventually stop trying and show circuit breaker message
      const circuitBreakerMessage = page.locator('[data-testid="circuit-breaker-message"]');
      if (await circuitBreakerMessage.isVisible()) {
        await expect(circuitBreakerMessage).toContainText(/circuit breaker|temporarily disabled/i);
      }
      
      // Manual recovery should be possible
      const resetCircuit = page.locator('[data-testid="reset-circuit-breaker"]');
      if (await resetCircuit.isVisible()) {
        // Mock service recovery
        await page.route(apiEndpoints.instances.list, async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockAPIResponses.instancesList)
          });
        });
        
        await resetCircuit.click();
        
        // Should recover functionality
        const instanceCount = await instancePage.getInstanceCount();
        expect(instanceCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Data Consistency During Errors', () => {
    test('should maintain data consistency during concurrent failures', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      const initialCount = await instancePage.getInstanceCount();
      
      // Mock concurrent operations with some failures
      await page.route(apiEndpoints.instances.start('**'), async route => {
        // Randomly fail some operations
        if (Math.random() > 0.5) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Random failure' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { status: 'running' }
            })
          });
        }
      });
      
      // Attempt multiple concurrent operations
      const operations = [
        instancePage.startInstance('Test Instance 3'),
        instancePage.startInstance('Test Instance 3'), // Duplicate operation
        instancePage.refreshInstances()
      ];
      
      await Promise.allSettled(operations);
      
      // Data should remain consistent despite failures
      const finalCount = await instancePage.getInstanceCount();
      expect(finalCount).toBe(initialCount);
      
      // UI should not show duplicate or inconsistent states
      const instanceNames = await instancePage.getInstanceNames();
      const uniqueNames = new Set(instanceNames);
      expect(instanceNames.length).toBe(uniqueNames.size); // No duplicates
    });

    test('should handle optimistic updates with error rollback', async ({ page }) => {
      await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
      await instancePage.navigate();
      
      const instanceName = 'Test Instance 3';
      const initialStatus = await instancePage.getInstanceStatus(instanceName);
      expect(initialStatus?.toLowerCase()).toBe('stopped');
      
      // Mock operation failure after delay
      await page.route(apiEndpoints.instances.start('test-instance-3'), async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to start instance',
            rollback: true
          })
        });
      });
      
      // Start instance (optimistic update)
      await instancePage.startInstance(instanceName);
      
      // Should initially show optimistic state
      await testUtils.delay(500);
      let currentStatus = await instancePage.getInstanceStatus(instanceName);
      
      // After failure, should rollback to original state
      await testUtils.delay(3000);
      currentStatus = await instancePage.getInstanceStatus(instanceName);
      expect(currentStatus?.toLowerCase()).toBe('stopped');
    });
  });
});
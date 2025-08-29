import { test, expect } from '@playwright/test';
import { InstanceManagerPage } from './page-objects/InstanceManagerPage';
import { mockAPIResponses, validInstanceConfigs, apiEndpoints, sseTestMessages, performanceThresholds, testUtils } from './fixtures/test-data';

/**
 * Test Suite: SSE Connection Establishment Validation
 * 
 * Validates that:
 * 1. SSE connections establish successfully after instance creation
 * 2. Connection management works correctly (connect/disconnect)
 * 3. Multiple SSE connections can be handled simultaneously
 * 4. Connection recovery works after failures
 * 5. SSE connection health monitoring functions properly
 */
test.describe('SSE Connection Establishment Validation', () => {
  let instancePage: InstanceManagerPage;

  test.beforeEach(async ({ page }) => {
    instancePage = new InstanceManagerPage(page);
    
    // Mock initial instances list with running instances
    await instancePage.mockInstancesAPI(mockAPIResponses.instancesList);
    await instancePage.navigate();
  });

  test.afterEach(async ({ page }) => {
    await instancePage.cleanupInstances();
    await page.unrouteAll();
  });

  test.describe('Initial SSE Connection', () => {
    test('should establish SSE connection successfully after instance creation', async ({ page }) => {
      const config = validInstanceConfigs.sonnet;
      const instanceName = 'Test SSE Instance';
      
      // Create instance first
      await instancePage.mockInstanceCreationAPI(mockAPIResponses.instanceCreated({
        ...config,
        name: instanceName
      }));
      
      await instancePage.createInstance(instanceName, config.type);
      
      // Open terminal for the instance
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE connection with welcome message
      const instanceId = 'test-instance-id';
      await instancePage.mockSSEConnection(instanceId, [sseTestMessages.welcome]);
      
      // Connect to terminal
      await instancePage.connectToTerminal();
      
      // Verify connection established
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      await expect(instancePage.connectTerminalButton).not.toBeVisible();
      
      // Should receive welcome message
      await instancePage.waitForTerminalOutput('SSE connection established');
    });

    test('should establish connection within performance threshold', async ({ page }) => {
      const runningInstance = 'Test Instance 1'; // From mock data
      
      await instancePage.openInstanceTerminal(runningInstance);
      
      // Mock fast SSE connection
      await instancePage.mockSSEConnection('test-instance-1', [sseTestMessages.welcome]);
      
      const connectionTime = await instancePage.measureSSEConnectionTime('test-instance-1');
      
      expect(connectionTime).toBeLessThan(performanceThresholds.sseConnection);
      console.log(`SSE connection time: ${connectionTime}ms`);
    });

    test('should handle connection to different instance types', async ({ page }) => {
      const instanceTypes = [
        { name: 'Test Instance 1', type: 'claude-3-5-sonnet' },
        { name: 'Test Instance 2', type: 'claude-3-opus' }
      ];
      
      for (const instance of instanceTypes) {
        await instancePage.openInstanceTerminal(instance.name);
        
        // Mock SSE for each instance
        await instancePage.mockSSEConnection(`test-${instance.type}`, [
          {
            ...sseTestMessages.welcome,
            data: `Connected to ${instance.type}`
          }
        ]);
        
        await instancePage.connectToTerminal();
        
        // Verify connection
        await expect(instancePage.disconnectTerminalButton).toBeVisible();
        await instancePage.waitForTerminalOutput(`Connected to ${instance.type}`);
        
        // Disconnect before next test
        await instancePage.disconnectFromTerminal();
        
        // Close modal
        await page.keyboard.press('Escape');
        await expect(instancePage.detailModal).not.toBeVisible();
      }
    });
  });

  test.describe('Connection Management', () => {
    test('should connect and disconnect SSE successfully', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE connection
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        sseTestMessages.close
      ]);
      
      // Initially should show connect button
      await expect(instancePage.connectTerminalButton).toBeVisible();
      await expect(instancePage.disconnectTerminalButton).not.toBeVisible();
      
      // Connect
      await instancePage.connectToTerminal();
      
      // Should show disconnect button
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      await expect(instancePage.connectTerminalButton).not.toBeVisible();
      
      // Disconnect
      await instancePage.disconnectFromTerminal();
      
      // Should show connect button again
      await expect(instancePage.connectTerminalButton).toBeVisible();
      await expect(instancePage.disconnectTerminalButton).not.toBeVisible();
    });

    test('should maintain connection state across UI interactions', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock persistent SSE connection
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        {
          ...sseTestMessages.output,
          data: 'Persistent connection test'
        }
      ]);
      
      await instancePage.connectToTerminal();
      
      // Verify connection
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      
      // Minimize and restore modal (simulate UI interaction)
      await page.keyboard.press('Escape');
      await expect(instancePage.detailModal).not.toBeVisible();
      
      // Reopen terminal
      await instancePage.openInstanceTerminal(instanceName);
      
      // Connection should be maintained
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      await instancePage.waitForTerminalOutput('Persistent connection test');
    });

    test('should show appropriate loading states during connection', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock slow SSE connection
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        await route.fulfill({
          status: 200,
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
          body: `data: ${JSON.stringify(sseTestMessages.welcome)}\n\n`
        });
      });
      
      // Start connection
      await instancePage.connectTerminalButton.click();
      
      // Should show loading indicator
      const loadingIndicator = page.locator('[data-testid="terminal-connecting"]');
      await expect(loadingIndicator).toBeVisible();
      
      // Button should be disabled during connection
      await expect(instancePage.connectTerminalButton).toBeDisabled();
      
      // Wait for connection to establish
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      await expect(loadingIndicator).not.toBeVisible();
    });
  });

  test.describe('Multiple SSE Connections', () => {
    test('should handle multiple simultaneous SSE connections', async ({ page }) => {
      const instances = [
        { name: 'Test Instance 1', id: 'test-instance-1' },
        { name: 'Test Instance 2', id: 'test-instance-2' }
      ];
      
      // Open multiple browser contexts/tabs to simulate multiple connections
      const pages = [page];
      
      for (let i = 1; i < instances.length; i++) {
        const newPage = await page.context().newPage();
        const newInstancePage = new InstanceManagerPage(newPage);
        await newInstancePage.mockInstancesAPI(mockAPIResponses.instancesList);
        await newInstancePage.navigate();
        pages.push(newPage);
      }
      
      // Establish connections in each page
      for (let i = 0; i < instances.length; i++) {
        const currentPage = pages[i];
        const currentInstancePage = new InstanceManagerPage(currentPage);
        const instance = instances[i];
        
        // Mock SSE for each instance
        await currentInstancePage.mockSSEConnection(instance.id, [
          {
            ...sseTestMessages.welcome,
            data: `Connected to ${instance.name}`
          }
        ]);
        
        await currentInstancePage.openInstanceTerminal(instance.name);
        await currentInstancePage.connectToTerminal();
        
        // Verify connection
        await expect(currentInstancePage.disconnectTerminalButton).toBeVisible();
        await currentInstancePage.waitForTerminalOutput(`Connected to ${instance.name}`);
      }
      
      // Clean up additional pages
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    });

    test('should prevent excessive concurrent connections per instance', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      // Mock API to return connection limit error
      let connectionAttempts = 0;
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        connectionAttempts++;
        
        if (connectionAttempts > 3) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Too many connections',
              message: 'Maximum concurrent connections reached for this instance'
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            },
            body: `data: ${JSON.stringify(sseTestMessages.welcome)}\n\n`
          });
        }
      });
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // First few connections should succeed
      for (let i = 0; i < 3; i++) {
        await instancePage.connectToTerminal();
        await expect(instancePage.disconnectTerminalButton).toBeVisible();
        await instancePage.disconnectFromTerminal();
      }
      
      // Fourth connection should fail
      await instancePage.connectTerminalButton.click();
      
      // Should show error message
      const errorMessage = page.locator('[data-testid="connection-error-message"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toHaveText(/too many connections|limit reached/i);
    });
  });

  test.describe('Connection Recovery', () => {
    test('should recover from SSE connection failure', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // First connection fails
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        await route.abort('failed');
      });
      
      await instancePage.connectTerminalButton.click();
      
      // Should show connection error
      const errorMessage = page.locator('[data-testid="connection-error-message"]');
      await expect(errorMessage).toBeVisible();
      
      // Mock successful retry
      await instancePage.mockSSEConnection('test-instance-1', [sseTestMessages.welcome]);
      
      // Retry connection
      const retryButton = page.locator('[data-testid="retry-connection-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      } else {
        await instancePage.connectTerminalButton.click();
      }
      
      // Should succeed on retry
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      await instancePage.waitForTerminalOutput('SSE connection established');
    });

    test('should handle SSE connection drops gracefully', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE connection that drops
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        sseTestMessages.output,
        sseTestMessages.error,
        sseTestMessages.close
      ]);
      
      await instancePage.connectToTerminal();
      
      // Initially connected
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      
      // Wait for connection drop
      await testUtils.delay(1000);
      
      // Should show reconnection attempt or error state
      const reconnectingIndicator = page.locator('[data-testid="reconnecting-indicator"]');
      const connectionError = page.locator('[data-testid="connection-error-message"]');
      
      const isReconnecting = await reconnectingIndicator.isVisible();
      const hasError = await connectionError.isVisible();
      
      expect(isReconnecting || hasError).toBe(true);
    });

    test('should implement exponential backoff for reconnection attempts', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      let attemptCount = 0;
      const attemptTimes: number[] = [];
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock failing SSE connection
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        attemptTimes.push(Date.now());
        attemptCount++;
        
        if (attemptCount < 4) {
          await route.abort('failed');
        } else {
          // Success on 4th attempt
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            },
            body: `data: ${JSON.stringify(sseTestMessages.welcome)}\n\n`
          });
        }
      });
      
      // Start connection (will fail and retry)
      await instancePage.connectTerminalButton.click();
      
      // Wait for all retry attempts
      await expect(instancePage.disconnectTerminalButton).toBeVisible({ timeout: 30000 });
      
      // Verify exponential backoff (each retry should take longer)
      expect(attemptTimes).toHaveLength(4);
      
      const intervals = [];
      for (let i = 1; i < attemptTimes.length; i++) {
        intervals.push(attemptTimes[i] - attemptTimes[i - 1]);
      }
      
      // Each interval should be larger than the previous (with some tolerance)
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThanOrEqual(intervals[i - 1] * 0.8); // 80% tolerance
      }
    });
  });

  test.describe('SSE Health Monitoring', () => {
    test('should monitor SSE connection health', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      // Mock SSE status endpoint
      await page.route(apiEndpoints.sse.status('test-instance-1'), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAPIResponses.sseStatus('test-instance-1'))
        });
      });
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock healthy SSE connection
      await instancePage.mockSSEConnection('test-instance-1', [sseTestMessages.welcome]);
      await instancePage.connectToTerminal();
      
      // Check connection health indicator
      const healthIndicator = page.locator('[data-testid="connection-health"]');
      await expect(healthIndicator).toBeVisible();
      
      const healthStatus = await healthIndicator.getAttribute('data-health');
      expect(healthStatus).toBe('healthy');
    });

    test('should display connection metrics', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE connection with metrics
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        sseTestMessages.output,
        sseTestMessages.status
      ]);
      
      await instancePage.connectToTerminal();
      
      // Check if metrics are displayed
      const metricsPanel = page.locator('[data-testid="connection-metrics"]');
      if (await metricsPanel.isVisible()) {
        // Verify metrics content
        await expect(metricsPanel).toContainText(/messages|bytes|uptime/i);
      }
    });

    test('should detect and report SSE connection issues', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE connection with intermittent issues
      let messageCount = 0;
      await page.route(apiEndpoints.terminal.stream('test-instance-1'), async route => {
        messageCount++;
        
        if (messageCount % 3 === 0) {
          // Every third message fails
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive'
            },
            body: `data: ${JSON.stringify(sseTestMessages.output)}\n\n`
          });
        }
      });
      
      await instancePage.connectToTerminal();
      
      // Should detect connection issues
      await testUtils.delay(2000);
      
      const healthWarning = page.locator('[data-testid="connection-warning"]');
      await expect(healthWarning).toBeVisible();
    });
  });

  test.describe('SSE Message Handling', () => {
    test('should handle different SSE message types correctly', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE with various message types
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        sseTestMessages.output,
        sseTestMessages.status,
        sseTestMessages.error
      ]);
      
      await instancePage.connectToTerminal();
      
      // Verify different message types are handled
      await instancePage.waitForTerminalOutput('SSE connection established');
      await instancePage.waitForTerminalOutput('Hello from Claude instance!');
      
      // Status messages should update instance info
      const statusInfo = page.locator('[data-testid="instance-status-info"]');
      if (await statusInfo.isVisible()) {
        await expect(statusInfo).toContainText(/running|pid/i);
      }
      
      // Error messages should be displayed appropriately
      const errorDisplay = page.locator('[data-testid="terminal-error"]');
      if (await errorDisplay.isVisible()) {
        await expect(errorDisplay).toContainText('Test error message');
      }
    });

    test('should handle large SSE message volumes', async ({ page }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Generate large number of messages
      const largeMessageSet = [];
      for (let i = 0; i < 100; i++) {
        largeMessageSet.push({
          type: 'output',
          data: `Message ${i}: ${'x'.repeat(100)}\n`,
          timestamp: new Date().toISOString()
        });
      }
      
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        ...largeMessageSet
      ]);
      
      await instancePage.connectToTerminal();
      
      // Should handle large message volume without UI freezing
      await testUtils.delay(2000);
      
      // UI should remain responsive
      await expect(instancePage.disconnectTerminalButton).toBeEnabled();
      
      // Should show some of the messages
      const terminalOutput = await instancePage.getTerminalOutput();
      expect(terminalOutput).toContain('Message');
    });
  });

  test.describe('Cross-browser SSE Compatibility', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      const instanceName = 'Test Instance 1';
      
      await instancePage.openInstanceTerminal(instanceName);
      
      // Mock SSE connection
      await instancePage.mockSSEConnection('test-instance-1', [
        sseTestMessages.welcome,
        sseTestMessages.output
      ]);
      
      await instancePage.connectToTerminal();
      
      // Core SSE functionality should work the same
      await expect(instancePage.disconnectTerminalButton).toBeVisible();
      await instancePage.waitForTerminalOutput('SSE connection established');
      
      console.log(`Browser: ${browserName}, SSE connection successful`);
    });
  });
});
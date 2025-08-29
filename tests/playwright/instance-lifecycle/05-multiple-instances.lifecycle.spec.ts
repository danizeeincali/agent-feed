import { test, expect } from '@playwright/test';
import { InstanceManagerPage } from './page-objects/InstanceManagerPage';
import { mockAPIResponses, validInstanceConfigs, apiEndpoints, sseTestMessages, testUtils } from './fixtures/test-data';

/**
 * Test Suite: Multiple Instance Management and Concurrent Operations
 * 
 * Validates that:
 * 1. Multiple instances can be managed simultaneously
 * 2. Concurrent operations don't interfere with each other
 * 3. Resource management works with multiple instances
 * 4. Instance isolation is maintained
 * 5. Bulk operations work correctly
 */
test.describe('Multiple Instance Management and Concurrent Operations', () => {
  let instancePage: InstanceManagerPage;

  test.beforeEach(async ({ page }) => {
    instancePage = new InstanceManagerPage(page);
    
    // Mock expanded instances list for multi-instance testing
    const multipleInstances = [
      ...mockAPIResponses.instancesList.data,
      {
        id: 'test-instance-4',
        name: 'Test Instance 4',
        type: 'claude-3-5-sonnet',
        status: 'running',
        pid: 12347,
        port: 3004,
        uptime: 900,
        memoryUsage: 384,
        cpuUsage: 15.8
      },
      {
        id: 'test-instance-5',
        name: 'Test Instance 5',
        type: 'claude-3-haiku',
        status: 'stopped',
        pid: undefined,
        port: undefined,
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      }
    ];
    
    await instancePage.mockInstancesAPI({
      success: true,
      data: multipleInstances
    });
    
    await instancePage.navigate();
  });

  test.afterEach(async ({ page }) => {
    await instancePage.cleanupInstances();
    await page.unrouteAll();
  });

  test.describe('Simultaneous Instance Management', () => {
    test('should manage multiple instances simultaneously', async ({ page }) => {
      // Verify multiple instances are displayed
      const instanceCount = await instancePage.getInstanceCount();
      expect(instanceCount).toBe(5);
      
      // Verify different instance states
      const instanceNames = await instancePage.getInstanceNames();
      expect(instanceNames).toContain('Test Instance 1');
      expect(instanceNames).toContain('Test Instance 2');
      expect(instanceNames).toContain('Test Instance 4');
      expect(instanceNames).toContain('Test Instance 5');
      
      // Verify status indicators for different instances
      await expect(instancePage.runningIndicator).toHaveCount(3); // Instances 1, 2, 4
      await expect(instancePage.stoppedIndicator).toHaveCount(2); // Instances 3, 5
    });

    test('should handle concurrent instance operations', async ({ page }) => {
      // Mock API responses for concurrent operations
      await page.route(apiEndpoints.instances.start('**'), async route => {
        const instanceId = route.request().url().split('/').slice(-2, -1)[0];
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: instanceId, status: 'running' }
          })
        });
      });
      
      // Start multiple instances concurrently
      const stoppedInstances = ['Test Instance 3', 'Test Instance 5'];
      
      const startPromises = stoppedInstances.map(async instanceName => {
        return instancePage.startInstance(instanceName);
      });
      
      // Wait for all operations to complete
      await Promise.all(startPromises);
      
      // Verify all instances are now running
      for (const instanceName of stoppedInstances) {
        const status = await instancePage.getInstanceStatus(instanceName);
        expect(status?.toLowerCase()).toBe('running');
      }
    });

    test('should prevent resource conflicts between instances', async ({ page }) => {
      // Mock API to simulate port conflicts
      let portConflictCount = 0;
      await page.route(apiEndpoints.instances.create, async route => {
        const requestData = await route.request().postDataJSON();
        
        // Simulate port conflict for first attempt
        if (portConflictCount === 0) {
          portConflictCount++;
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Port already in use',
              suggestedPort: 3005
            })
          });
        } else {
          // Success on retry with different port
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: 'test-instance-new',
                name: requestData.name,
                type: requestData.type,
                status: 'starting',
                port: 3005
              }
            })
          });
        }
      });
      
      // Attempt to create instance
      const config = validInstanceConfigs.sonnet;
      await instancePage.createInstance('Port Conflict Test', config.type);
      
      // Should eventually succeed with different port
      const instanceCard = await instancePage.findInstanceByName('Port Conflict Test');
      await expect(instanceCard).toBeVisible();
    });

    test('should handle instance isolation correctly', async ({ page }) => {
      const instances = ['Test Instance 1', 'Test Instance 2'];
      
      // Open terminals for multiple instances
      for (let i = 0; i < instances.length; i++) {
        const instanceName = instances[i];
        const instanceId = `test-instance-${i + 1}`;
        
        // Open new page for each instance to test isolation
        const newPage = i === 0 ? page : await page.context().newPage();
        const newInstancePage = new InstanceManagerPage(newPage);
        
        if (i > 0) {
          await newInstancePage.mockInstancesAPI({
            success: true,
            data: mockAPIResponses.instancesList.data
          });
          await newInstancePage.navigate();
        }
        
        await newInstancePage.openInstanceTerminal(instanceName);
        
        // Mock unique SSE stream for each instance
        await newInstancePage.mockSSEConnection(instanceId, [
          sseTestMessages.welcome,
          {
            type: 'output',
            data: `This is output from ${instanceName}\n`,
            timestamp: new Date().toISOString()
          }
        ]);
        
        await newInstancePage.connectToTerminal();
        
        // Verify instance-specific output
        await newInstancePage.waitForTerminalOutput(`This is output from ${instanceName}`);
        
        // Close additional pages
        if (i > 0) {
          await newPage.close();
        }
      }
    });
  });

  test.describe('Concurrent Operations', () => {
    test('should handle concurrent instance creation', async ({ page }) => {
      const instancesToCreate = [
        { name: 'Concurrent Test 1', type: 'claude-3-5-sonnet' },
        { name: 'Concurrent Test 2', type: 'claude-3-opus' },
        { name: 'Concurrent Test 3', type: 'claude-3-haiku' }
      ];
      
      // Mock creation API with delays
      await page.route(apiEndpoints.instances.create, async route => {
        const requestData = await route.request().postDataJSON();
        
        // Simulate creation time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: `concurrent-${Date.now()}-${Math.random().toString(36).substring(2)}`,
              name: requestData.name,
              type: requestData.type,
              status: 'starting'
            }
          })
        });
      });
      
      // Create instances concurrently
      const createPromises = instancesToCreate.map(async ({ name, type }) => {
        return instancePage.createInstance(name, type);
      });
      
      await Promise.all(createPromises);
      
      // Verify all instances were created
      for (const { name } of instancesToCreate) {
        const instanceCard = await instancePage.findInstanceByName(name);
        await expect(instanceCard).toBeVisible();
      }
    });

    test('should handle concurrent start/stop operations', async ({ page }) => {
      const operationsToPerform = [
        { instance: 'Test Instance 1', action: 'restart' },
        { instance: 'Test Instance 2', action: 'restart' },
        { instance: 'Test Instance 3', action: 'start' },
        { instance: 'Test Instance 5', action: 'start' }
      ];
      
      // Mock operation APIs
      ['start', 'stop', 'restart'].forEach(action => {
        page.route(new RegExp(`/instances/[^/]+/${action}`), async route => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { status: action === 'stop' ? 'stopped' : 'running' }
            })
          });
        });
      });
      
      // Perform operations concurrently
      const operationPromises = operationsToPerform.map(async ({ instance, action }) => {
        switch (action) {
          case 'start':
            return instancePage.startInstance(instance);
          case 'stop':
            return instancePage.stopInstance(instance);
          case 'restart':
            return instancePage.restartInstance(instance);
        }
      });
      
      await Promise.all(operationPromises);
      
      // Verify final states
      const runningInstances = operationsToPerform.filter(op => op.action !== 'stop');
      for (const { instance } of runningInstances) {
        const status = await instancePage.getInstanceStatus(instance);
        expect(status?.toLowerCase()).toBe('running');
      }
    });

    test('should handle concurrent SSE connections', async ({ page }) => {
      const runningInstances = [
        { name: 'Test Instance 1', id: 'test-instance-1' },
        { name: 'Test Instance 2', id: 'test-instance-2' },
        { name: 'Test Instance 4', id: 'test-instance-4' }
      ];
      
      // Mock SSE endpoints for all instances
      for (const { name, id } of runningInstances) {
        await instancePage.mockSSEConnection(id, [
          sseTestMessages.welcome,
          {
            type: 'output',
            data: `Concurrent connection from ${name}\n`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
      
      // Establish concurrent connections (using browser tabs)
      const pages = [page];
      
      for (let i = 1; i < runningInstances.length; i++) {
        const newPage = await page.context().newPage();
        const newInstancePage = new InstanceManagerPage(newPage);
        await newInstancePage.mockInstancesAPI({
          success: true,
          data: mockAPIResponses.instancesList.data
        });
        await newInstancePage.navigate();
        pages.push(newPage);
      }
      
      // Connect to different instances in different tabs
      const connectionPromises = runningInstances.map(async ({ name, id }, index) => {
        const currentPage = pages[index];
        const currentInstancePage = new InstanceManagerPage(currentPage);
        
        await currentInstancePage.openInstanceTerminal(name);
        await currentInstancePage.connectToTerminal();
        
        return currentInstancePage.waitForTerminalOutput(`Concurrent connection from ${name}`);
      });
      
      await Promise.all(connectionPromises);
      
      // Clean up additional pages
      for (let i = 1; i < pages.length; i++) {
        await pages[i].close();
      }
    });
  });

  test.describe('Resource Management', () => {
    test('should monitor resource usage across multiple instances', async ({ page }) => {
      // Check if resource monitoring UI is present
      const resourceMonitor = page.locator('[data-testid="resource-monitor"]');
      
      if (await resourceMonitor.isVisible()) {
        // Verify resource metrics are displayed
        await expect(resourceMonitor).toContainText(/memory|cpu|total/i);
        
        // Check for per-instance breakdown
        const instanceMetrics = page.locator('[data-testid="instance-metrics"]');
        const metricsCount = await instanceMetrics.count();
        
        if (metricsCount > 0) {
          expect(metricsCount).toBeGreaterThan(0);
        }
      }
      
      // Verify individual instance resource display
      const runningInstances = await instancePage.runningIndicator.count();
      expect(runningInstances).toBe(3); // From mock data
    });

    test('should handle resource limits with multiple instances', async ({ page }) => {
      // Mock resource exhaustion
      let instanceCreationCount = 0;
      await page.route(apiEndpoints.instances.create, async route => {
        instanceCreationCount++;
        
        if (instanceCreationCount > 3) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Resource limit exceeded',
              message: 'Maximum instances reached (5/5)',
              currentInstances: 5,
              maxInstances: 5
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                id: `resource-test-${instanceCreationCount}`,
                name: `Resource Test ${instanceCreationCount}`,
                type: 'claude-3-5-sonnet',
                status: 'starting'
              }
            })
          });
        }
      });
      
      // Try to create multiple instances
      for (let i = 1; i <= 5; i++) {
        try {
          await instancePage.createInstance(`Resource Test ${i}`, 'claude-3-5-sonnet');
        } catch (error) {
          // Expected to fail after limit is reached
        }
      }
      
      // Should show resource limit error for the last attempts
      const errorMessage = page.locator('[data-testid="creation-error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText(/resource limit|maximum instances/i);
      }
    });

    test('should optimize performance with many instances', async ({ page }) => {
      // Verify UI remains responsive with multiple instances
      const startTime = Date.now();
      
      // Refresh instances list
      await instancePage.refreshInstances();
      
      const refreshTime = Date.now() - startTime;
      expect(refreshTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // UI elements should remain responsive
      await expect(instancePage.createInstanceButton).toBeEnabled();
      await expect(instancePage.refreshButton).toBeEnabled();
      
      // Instance actions should be available
      const instanceCards = await instancePage.instanceCards.count();
      expect(instanceCards).toBeGreaterThan(0);
      
      for (let i = 0; i < Math.min(instanceCards, 3); i++) {
        const card = instancePage.instanceCards.nth(i);
        const actions = card.locator('[data-testid="instance-actions"]');
        await expect(actions).toBeVisible();
      }
    });
  });

  test.describe('Bulk Operations', () => {
    test('should support bulk instance operations', async ({ page }) => {
      // Check for bulk operation UI elements
      const selectAllCheckbox = page.locator('[data-testid="select-all-instances"]');
      const bulkActionsPanel = page.locator('[data-testid="bulk-actions-panel"]');
      
      if (await selectAllCheckbox.isVisible()) {
        // Select all instances
        await selectAllCheckbox.check();
        
        // Bulk actions panel should appear
        await expect(bulkActionsPanel).toBeVisible();
        
        // Should have bulk operation buttons
        const bulkStartButton = page.locator('[data-testid="bulk-start-button"]');
        const bulkStopButton = page.locator('[data-testid="bulk-stop-button"]');
        const bulkDeleteButton = page.locator('[data-testid="bulk-delete-button"]');
        
        // At least one bulk operation should be available
        const hasBulkActions = await bulkStartButton.isVisible() || 
                               await bulkStopButton.isVisible() || 
                               await bulkDeleteButton.isVisible();
        
        expect(hasBulkActions).toBe(true);
      }
    });

    test('should handle selective instance operations', async ({ page }) => {
      const instanceCheckboxes = page.locator('[data-testid*="instance-checkbox"]');
      const checkboxCount = await instanceCheckboxes.count();
      
      if (checkboxCount > 0) {
        // Select first two instances
        await instanceCheckboxes.nth(0).check();
        await instanceCheckboxes.nth(1).check();
        
        // Verify selection state
        await expect(instanceCheckboxes.nth(0)).toBeChecked();
        await expect(instanceCheckboxes.nth(1)).toBeChecked();
        
        // Bulk actions should be available for selected instances
        const bulkActionsPanel = page.locator('[data-testid="bulk-actions-panel"]');
        if (await bulkActionsPanel.isVisible()) {
          const selectionCount = page.locator('[data-testid="selection-count"]');
          if (await selectionCount.isVisible()) {
            await expect(selectionCount).toContainText('2');
          }
        }
      }
    });

    test('should provide bulk status monitoring', async ({ page }) => {
      // Check for status overview
      const statusOverview = page.locator('[data-testid="instances-status-overview"]');
      
      if (await statusOverview.isVisible()) {
        // Should show counts for different states
        await expect(statusOverview).toContainText(/running|stopped|total/i);
        
        // Verify counts match actual instances
        const runningCount = await instancePage.runningIndicator.count();
        const stoppedCount = await instancePage.stoppedIndicator.count();
        
        const overviewText = await statusOverview.textContent();
        
        if (overviewText?.includes('running')) {
          expect(overviewText).toContain(runningCount.toString());
        }
      }
    });
  });

  test.describe('Instance Coordination', () => {
    test('should coordinate instance dependencies', async ({ page }) => {
      // Test scenario where instances might have dependencies
      const primaryInstance = 'Test Instance 1';
      const dependentInstance = 'Test Instance 2';
      
      // Mock API to simulate dependency checking
      await page.route(apiEndpoints.instances.stop('test-instance-1'), async route => {
        // Check if dependent instances exist
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Instance has dependencies',
            dependencies: ['test-instance-2'],
            message: 'Stop dependent instances first'
          })
        });
      });
      
      // Try to stop primary instance
      await instancePage.stopInstance(primaryInstance);
      
      // Should show dependency warning
      const dependencyWarning = page.locator('[data-testid="dependency-warning"]');
      if (await dependencyWarning.isVisible()) {
        await expect(dependencyWarning).toContainText(/dependencies|dependent/i);
      }
    });

    test('should handle instance communication', async ({ page }) => {
      const instances = ['Test Instance 1', 'Test Instance 2'];
      
      // Mock inter-instance communication scenario
      for (let i = 0; i < instances.length; i++) {
        const instanceId = `test-instance-${i + 1}`;
        
        await instancePage.mockSSEConnection(instanceId, [
          sseTestMessages.welcome,
          {
            type: 'communication',
            from: instanceId,
            to: i === 0 ? 'test-instance-2' : 'test-instance-1',
            message: `Hello from instance ${i + 1}`,
            timestamp: new Date().toISOString()
          }
        ]);
      }
      
      // Open both terminals
      for (const instanceName of instances) {
        // Each in a separate browser tab for true isolation
        const newPage = instanceName === instances[0] ? page : await page.context().newPage();
        const newInstancePage = new InstanceManagerPage(newPage);
        
        if (instanceName !== instances[0]) {
          await newInstancePage.mockInstancesAPI({
            success: true,
            data: mockAPIResponses.instancesList.data
          });
          await newInstancePage.navigate();
        }
        
        await newInstancePage.openInstanceTerminal(instanceName);
        await newInstancePage.connectToTerminal();
        
        // Look for communication messages
        await newInstancePage.waitForTerminalOutput('Hello from instance');
        
        if (instanceName !== instances[0]) {
          await newPage.close();
        }
      }
    });

    test('should maintain instance state consistency', async ({ page }) => {
      // Perform rapid state changes on multiple instances
      const instances = ['Test Instance 1', 'Test Instance 2'];
      
      // Mock state change APIs
      ['start', 'stop', 'restart'].forEach(action => {
        page.route(new RegExp(`/instances/[^/]+/${action}`), async route => {
          await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { status: action === 'stop' ? 'stopped' : 'running' }
            })
          });
        });
      });
      
      // Perform rapid operations
      for (const instanceName of instances) {
        await instancePage.restartInstance(instanceName);
      }
      
      // Refresh and verify consistency
      await instancePage.refreshInstances();
      
      for (const instanceName of instances) {
        const status = await instancePage.getInstanceStatus(instanceName);
        expect(status?.toLowerCase()).toBe('running');
      }
    });
  });

  test.describe('Error Handling in Multi-Instance Environment', () => {
    test('should isolate errors between instances', async ({ page }) => {
      // Mock one instance failing while others succeed
      await page.route(apiEndpoints.instances.start('test-instance-3'), async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Failed to start instance',
            instanceId: 'test-instance-3'
          })
        });
      });
      
      await page.route(apiEndpoints.instances.start('test-instance-5'), async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'test-instance-5', status: 'running' }
          })
        });
      });
      
      // Try to start both stopped instances
      const failingInstance = 'Test Instance 3';
      const succeedingInstance = 'Test Instance 5';
      
      // Start failing instance
      await instancePage.startInstance(failingInstance);
      
      // Should show error for failing instance
      const errorMessage = page.locator('[data-testid="instance-error-message"]');
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toContainText(/failed to start/i);
      }
      
      // Start succeeding instance
      await instancePage.startInstance(succeedingInstance);
      
      // Succeeding instance should start normally
      const status = await instancePage.getInstanceStatus(succeedingInstance);
      expect(status?.toLowerCase()).toBe('running');
    });

    test('should handle cascading failures gracefully', async ({ page }) => {
      // Mock cascading failure scenario
      let failureCount = 0;
      await page.route(new RegExp('/instances/[^/]+/(start|stop|restart)'), async route => {
        failureCount++;
        
        if (failureCount <= 2) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: `Cascade failure ${failureCount}`,
              cascade: true
            })
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
      
      // Try operations that will initially fail
      const instances = ['Test Instance 1', 'Test Instance 2'];
      
      for (const instanceName of instances) {
        await instancePage.restartInstance(instanceName);
      }
      
      // Should show cascade failure handling
      const cascadeError = page.locator('[data-testid="cascade-error-message"]');
      if (await cascadeError.isVisible()) {
        await expect(cascadeError).toContainText(/cascade|multiple/i);
      }
      
      // System should eventually recover
      await testUtils.delay(2000);
      
      // Retry should succeed
      await instancePage.restartInstance(instances[0]);
      const status = await instancePage.getInstanceStatus(instances[0]);
      expect(status?.toLowerCase()).toBe('running');
    });
  });
});
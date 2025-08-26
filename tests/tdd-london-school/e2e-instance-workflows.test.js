/**
 * TDD London School: End-to-End Claude Instance Workflows
 * 
 * This test suite validates complete user workflows for Claude instance management,
 * using mock-driven behavior verification to ensure all interactions work together.
 */

const { chromium } = require('playwright');
const request = require('supertest');

describe('E2E Claude Instance Workflows - London School TDD', () => {
  let browser;
  let context;
  let page;
  let mockApiServer;
  let mockInstanceManager;
  let mockTerminalStreamer;

  beforeAll(async () => {
    // Launch browser for E2E testing
    browser = await chromium.launch({ 
      headless: false, // Set to true for CI/CD
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  beforeEach(async () => {
    // Create fresh browser context
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });
    page = await context.newPage();

    // Set up mock collaborators (London School approach)
    mockInstanceManager = {
      instances: new Map(),
      createInstance: jest.fn(),
      deleteInstance: jest.fn(),
      listInstances: jest.fn(),
      getInstanceStatus: jest.fn()
    };

    mockTerminalStreamer = {
      connections: new Map(),
      createConnection: jest.fn(),
      sendCommand: jest.fn(),
      receiveOutput: jest.fn(),
      closeConnection: jest.fn()
    };

    // Mock API responses for complete workflow testing
    await setupApiMocks(page);
  });

  afterEach(async () => {
    await context.close();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Complete Claude Instance Creation Workflow', () => {
    it('should successfully create and initialize a Claude instance through UI', async () => {
      // Arrange - Define the complete workflow expectations
      const instanceConfig = {
        name: 'e2e-test-instance',
        environment: 'prod',
        capabilities: ['terminal', 'file-operations']
      };

      const expectedInstance = {
        id: 'e2e-instance-001',
        name: 'e2e-test-instance',
        status: 'running',
        pid: 12345,
        terminalUrl: 'ws://localhost:3002/terminal/e2e-instance-001'
      };

      // Mock the expected sequence of interactions
      mockInstanceManager.createInstance.mockImplementation(async (config) => {
        // Simulate instance creation process
        const instance = { ...expectedInstance, status: 'initializing' };
        mockInstanceManager.instances.set(instance.id, instance);
        
        // Simulate startup sequence
        setTimeout(() => {
          instance.status = 'starting';
          mockInstanceManager.instances.set(instance.id, instance);
        }, 1000);
        
        setTimeout(() => {
          instance.status = 'running';
          mockInstanceManager.instances.set(instance.id, instance);
        }, 2000);
        
        return instance;
      });

      mockTerminalStreamer.createConnection.mockResolvedValue({
        id: 'terminal-connection-001',
        instanceId: expectedInstance.id,
        status: 'connected'
      });

      // Navigate to Claude Instances page
      await page.goto('http://localhost:5173/claude-instances');
      
      // Wait for page to load and become interactive
      await page.waitForSelector('[data-testid="create-instance-button"]', { timeout: 10000 });

      // Act - Execute the complete creation workflow
      
      // Step 1: Click "Create New Instance" button
      await page.click('[data-testid="create-instance-button"]');
      
      // Step 2: Fill instance configuration form
      await page.waitForSelector('[data-testid="instance-config-form"]');
      await page.fill('[data-testid="instance-name-input"]', instanceConfig.name);
      await page.selectOption('[data-testid="environment-select"]', instanceConfig.environment);
      
      // Step 3: Select capabilities
      for (const capability of instanceConfig.capabilities) {
        await page.check(`[data-testid="capability-${capability}"]`);
      }
      
      // Step 4: Submit instance creation
      const createResponsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/claude-live/prod/instances') && response.request().method() === 'POST'
      );
      
      await page.click('[data-testid="submit-create-instance"]');
      const createResponse = await createResponsePromise;
      
      // Step 5: Wait for instance status to update to "running"
      await page.waitForSelector(`[data-testid="instance-${expectedInstance.id}"][data-status="running"]`, { 
        timeout: 15000 
      });
      
      // Step 6: Verify terminal connection establishment
      const terminalElement = await page.waitForSelector(`[data-testid="terminal-${expectedInstance.id}"]`);
      expect(terminalElement).toBeTruthy();
      
      // Assert - Verify all interactions occurred as expected
      expect(createResponse.status()).toBe(201);
      
      // Verify UI reflects successful creation
      const instanceCard = await page.locator(`[data-testid="instance-card-${expectedInstance.id}"]`);
      await expect(instanceCard).toBeVisible();
      
      const statusIndicator = await page.locator(`[data-testid="status-${expectedInstance.id}"]`);
      await expect(statusIndicator).toHaveText('running');
      
      // Verify terminal is accessible
      const terminalTab = await page.locator(`[data-testid="terminal-tab-${expectedInstance.id}"]`);
      await expect(terminalTab).toBeVisible();
      
      // Test terminal functionality
      await page.click(`[data-testid="terminal-tab-${expectedInstance.id}"]`);
      const terminalInput = await page.locator(`[data-testid="terminal-input-${expectedInstance.id}"]`);
      await terminalInput.fill('echo "Hello Claude"');
      await terminalInput.press('Enter');
      
      // Verify terminal output appears
      await page.waitForSelector(`[data-testid="terminal-output-${expectedInstance.id}"]`);
      const terminalOutput = await page.locator(`[data-testid="terminal-output-${expectedInstance.id}"]`);
      await expect(terminalOutput).toContainText('Hello Claude');
      
      // Verify mock interactions
      expect(mockInstanceManager.createInstance).toHaveBeenCalledWith(
        expect.objectContaining(instanceConfig)
      );
      expect(mockTerminalStreamer.createConnection).toHaveBeenCalledWith(expectedInstance.id);
    });

    it('should handle instance creation failures gracefully', async () => {
      // Arrange - Mock creation failure scenario
      const failureConfig = { name: 'failing-instance' };
      const errorMessage = 'Failed to allocate resources for instance';
      
      mockInstanceManager.createInstance.mockRejectedValue(new Error(errorMessage));

      await page.goto('http://localhost:5173/claude-instances');
      
      // Act - Attempt to create instance that will fail
      await page.click('[data-testid="create-instance-button"]');
      await page.fill('[data-testid="instance-name-input"]', failureConfig.name);
      
      const errorResponsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/claude-live/prod/instances') && 
                   response.request().method() === 'POST' && 
                   response.status() >= 400
      );
      
      await page.click('[data-testid="submit-create-instance"]');
      const errorResponse = await errorResponsePromise;
      
      // Assert - Verify error handling
      expect(errorResponse.status()).toBe(400);
      
      // Verify error message is displayed to user
      const errorAlert = await page.waitForSelector('[data-testid="error-alert"]');
      const errorText = await errorAlert.textContent();
      expect(errorText).toContain(errorMessage);
      
      // Verify no instance was created in UI
      const instanceList = await page.locator('[data-testid="instance-list"]');
      const instanceCount = await instanceList.locator('[data-testid^="instance-card-"]').count();
      expect(instanceCount).toBe(0);
      
      expect(mockInstanceManager.createInstance).toHaveBeenCalledWith(
        expect.objectContaining(failureConfig)
      );
    });
  });

  describe('Instance Management Workflow', () => {
    it('should list existing instances and allow management operations', async () => {
      // Arrange - Mock existing instances
      const existingInstances = [
        {
          id: 'existing-instance-1',
          name: 'prod-claude-1',
          status: 'running',
          pid: 1001,
          uptime: 3600,
          environment: 'prod'
        },
        {
          id: 'existing-instance-2', 
          name: 'prod-claude-2',
          status: 'idle',
          pid: 1002,
          uptime: 1800,
          environment: 'prod'
        }
      ];

      mockInstanceManager.listInstances.mockResolvedValue(existingInstances);
      mockInstanceManager.instances.set('existing-instance-1', existingInstances[0]);
      mockInstanceManager.instances.set('existing-instance-2', existingInstances[1]);

      // Navigate to instances page
      await page.goto('http://localhost:5173/claude-instances');
      
      // Wait for instances to load
      await page.waitForResponse(
        response => response.url().includes('/api/v1/claude-live/prod/instances') && 
                   response.request().method() === 'GET'
      );

      // Assert - Verify instances are displayed
      for (const instance of existingInstances) {
        const instanceCard = await page.locator(`[data-testid="instance-card-${instance.id}"]`);
        await expect(instanceCard).toBeVisible();
        
        const nameElement = await page.locator(`[data-testid="instance-name-${instance.id}"]`);
        await expect(nameElement).toHaveText(instance.name);
        
        const statusElement = await page.locator(`[data-testid="status-${instance.id}"]`);
        await expect(statusElement).toHaveText(instance.status);
      }

      // Test instance filtering
      await page.selectOption('[data-testid="status-filter"]', 'running');
      
      // Verify only running instances are shown
      const runningCard = await page.locator(`[data-testid="instance-card-existing-instance-1"]`);
      await expect(runningCard).toBeVisible();
      
      const idleCard = await page.locator(`[data-testid="instance-card-existing-instance-2"]`);
      await expect(idleCard).toBeHidden();
      
      expect(mockInstanceManager.listInstances).toHaveBeenCalled();
    });

    it('should successfully delete an instance through UI', async () => {
      // Arrange - Mock instance to delete
      const instanceToDelete = {
        id: 'delete-target-instance',
        name: 'temp-instance',
        status: 'running'
      };

      mockInstanceManager.instances.set(instanceToDelete.id, instanceToDelete);
      mockInstanceManager.listInstances.mockResolvedValue([instanceToDelete]);
      mockInstanceManager.deleteInstance.mockResolvedValue({
        id: instanceToDelete.id,
        status: 'terminated'
      });

      await page.goto('http://localhost:5173/claude-instances');
      
      // Wait for instance to appear
      await page.waitForSelector(`[data-testid="instance-card-${instanceToDelete.id}"]`);

      // Act - Delete the instance
      await page.click(`[data-testid="delete-button-${instanceToDelete.id}"]`);
      
      // Confirm deletion in modal
      await page.waitForSelector('[data-testid="delete-confirmation-modal"]');
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Wait for deletion API call
      const deleteResponse = await page.waitForResponse(
        response => response.url().includes(`/api/v1/claude-live/prod/instances/${instanceToDelete.id}`) && 
                   response.request().method() === 'DELETE'
      );

      // Assert - Verify deletion
      expect(deleteResponse.status()).toBe(200);
      
      // Verify instance is removed from UI
      await expect(page.locator(`[data-testid="instance-card-${instanceToDelete.id}"]`)).toBeHidden();
      
      // Verify success message
      const successAlert = await page.waitForSelector('[data-testid="success-alert"]');
      const successText = await successAlert.textContent();
      expect(successText).toContain('Instance deleted successfully');
      
      expect(mockInstanceManager.deleteInstance).toHaveBeenCalledWith(instanceToDelete.id);
    });
  });

  describe('Terminal Interaction Workflow', () => {
    it('should establish terminal connection and handle commands', async () => {
      // Arrange - Mock instance with terminal capability
      const terminalInstance = {
        id: 'terminal-instance-001',
        name: 'terminal-test',
        status: 'running',
        capabilities: ['terminal'],
        terminalUrl: 'ws://localhost:3002/terminal/terminal-instance-001'
      };

      mockInstanceManager.instances.set(terminalInstance.id, terminalInstance);
      mockTerminalStreamer.createConnection.mockResolvedValue({
        id: 'terminal-conn-001',
        status: 'connected'
      });
      
      // Mock command execution
      mockTerminalStreamer.sendCommand.mockImplementation(async (instanceId, command) => {
        // Simulate command execution
        setTimeout(() => {
          mockTerminalStreamer.receiveOutput.mockImplementation(() => ({
            output: `$ ${command}\nCommand executed successfully\n`,
            timestamp: new Date().toISOString()
          }));
        }, 500);
      });

      await page.goto('http://localhost:5173/claude-instances');
      await page.waitForSelector(`[data-testid="instance-card-${terminalInstance.id}"]`);

      // Act - Open terminal and execute commands
      await page.click(`[data-testid="terminal-button-${terminalInstance.id}"]`);
      
      // Wait for terminal to initialize
      await page.waitForSelector(`[data-testid="terminal-container-${terminalInstance.id}"]`);
      
      // Execute test command
      const terminalInput = await page.locator(`[data-testid="terminal-input-${terminalInstance.id}"]`);
      await terminalInput.fill('pwd');
      await terminalInput.press('Enter');
      
      // Wait for command output
      await page.waitForSelector(`[data-testid="terminal-output-${terminalInstance.id}"]`);
      
      // Execute another command to test continuous interaction
      await terminalInput.fill('ls -la');
      await terminalInput.press('Enter');
      
      // Assert - Verify terminal interactions
      const terminalOutput = await page.locator(`[data-testid="terminal-output-${terminalInstance.id}"]`);
      const outputText = await terminalOutput.textContent();
      
      expect(outputText).toContain('pwd');
      expect(outputText).toContain('ls -la');
      
      expect(mockTerminalStreamer.createConnection).toHaveBeenCalledWith(terminalInstance.id);
      expect(mockTerminalStreamer.sendCommand).toHaveBeenCalledWith(terminalInstance.id, 'pwd');
      expect(mockTerminalStreamer.sendCommand).toHaveBeenCalledWith(terminalInstance.id, 'ls -la');
    });

    it('should handle terminal disconnection and reconnection', async () => {
      // Arrange - Mock connection failure scenario
      const unstableInstance = {
        id: 'unstable-terminal-001',
        name: 'unstable-instance',
        status: 'running',
        capabilities: ['terminal']
      };

      mockInstanceManager.instances.set(unstableInstance.id, unstableInstance);
      
      // Mock initial connection success, then failure, then reconnection
      let connectionAttempt = 0;
      mockTerminalStreamer.createConnection.mockImplementation(async () => {
        connectionAttempt++;
        if (connectionAttempt === 1) {
          return { id: 'conn-1', status: 'connected' };
        } else if (connectionAttempt === 2) {
          throw new Error('Connection lost');
        } else {
          return { id: 'conn-2', status: 'reconnected' };
        }
      });

      await page.goto('http://localhost:5173/claude-instances');
      await page.click(`[data-testid="terminal-button-${unstableInstance.id}"]`);
      
      // Initial connection should work
      await page.waitForSelector(`[data-testid="terminal-container-${unstableInstance.id}"]`);
      
      // Simulate connection loss
      await page.evaluate(() => {
        // Trigger WebSocket disconnect event
        window.dispatchEvent(new CustomEvent('websocket-disconnect'));
      });
      
      // Verify disconnection indicator
      await page.waitForSelector(`[data-testid="terminal-disconnected-${unstableInstance.id}"]`);
      
      // Click reconnect button
      await page.click(`[data-testid="terminal-reconnect-${unstableInstance.id}"]`);
      
      // Assert - Verify reconnection
      await page.waitForSelector(`[data-testid="terminal-connected-${unstableInstance.id}"]`);
      
      expect(mockTerminalStreamer.createConnection).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent instance operations', async () => {
      // Arrange - Mock multiple instance operations
      const concurrentInstances = Array(5).fill().map((_, i) => ({
        id: `concurrent-instance-${i}`,
        name: `concurrent-${i}`,
        status: 'initializing'
      }));

      mockInstanceManager.createInstance.mockImplementation(async (config) => {
        // Simulate varying creation times
        const delay = Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return { ...config, id: `concurrent-instance-${Date.now()}`, status: 'running' };
      });

      await page.goto('http://localhost:5173/claude-instances');

      // Act - Create multiple instances concurrently
      const creationPromises = concurrentInstances.map(async (_, i) => {
        await page.click('[data-testid="create-instance-button"]');
        await page.fill('[data-testid="instance-name-input"]', `concurrent-${i}`);
        await page.click('[data-testid="submit-create-instance"]');
        
        // Wait for this instance to appear
        await page.waitForSelector(`[data-testid="instance-card-concurrent-instance-${i}"]`, { 
          timeout: 10000 
        });
      });

      // Wait for all instances to be created
      await Promise.all(creationPromises);

      // Assert - Verify all instances were created
      for (let i = 0; i < concurrentInstances.length; i++) {
        const instanceCard = await page.locator(`[data-testid="instance-card-concurrent-instance-${i}"]`);
        await expect(instanceCard).toBeVisible();
      }

      expect(mockInstanceManager.createInstance).toHaveBeenCalledTimes(concurrentInstances.length);
    });
  });

  // Helper function to set up API route mocking
  async function setupApiMocks(page) {
    // Mock all Claude instance API endpoints
    await page.route('**/api/v1/claude-live/prod/instances', async route => {
      const method = route.request().method();
      
      if (method === 'POST') {
        const body = JSON.parse(route.request().postData());
        try {
          const instance = await mockInstanceManager.createInstance(body);
          route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              instance,
              sessionId: `session-${instance.id}`
            })
          });
        } catch (error) {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: error.message
            })
          });
        }
      } else if (method === 'GET') {
        const instances = await mockInstanceManager.listInstances();
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            instances: Array.from(mockInstanceManager.instances.values()),
            count: mockInstanceManager.instances.size
          })
        });
      }
    });

    // Mock instance deletion
    await page.route('**/api/v1/claude-live/prod/instances/*', async route => {
      const method = route.request().method();
      
      if (method === 'DELETE') {
        const instanceId = route.request().url().split('/').pop();
        try {
          const result = await mockInstanceManager.deleteInstance(instanceId);
          mockInstanceManager.instances.delete(instanceId);
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              instance: result
            })
          });
        } catch (error) {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Instance not found'
            })
          });
        }
      }
    });

    // Mock WebSocket terminal connections
    await page.route('**/terminal/*', async route => {
      route.fulfill({
        status: 101, // Switching Protocols
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade'
        }
      });
    });
  }
});
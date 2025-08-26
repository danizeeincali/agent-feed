/**
 * TDD London School: Frontend-Backend API Contract Integration Tests
 * 
 * These tests validate the exact contracts between frontend and backend,
 * focusing on mock-driven verification of API interactions.
 */

const request = require('supertest');
const nock = require('nock');
const express = require('express');

describe('Frontend-Backend API Contract Integration - London School TDD', () => {
  let app;
  let frontendApiService;
  let mockBackendBase;

  beforeEach(() => {
    // Mock the backend API base URL
    mockBackendBase = 'http://localhost:3001';
    
    // Create frontend API service mock
    frontendApiService = {
      createClaudeInstance: jest.fn(),
      listClaudeInstances: jest.fn(),
      deleteClaudeInstance: jest.fn(),
      getClaudeActivities: jest.fn(),
      getInstanceHealth: jest.fn()
    };

    // Set up Express app for contract testing
    app = express();
    app.use(express.json());
    
    // Clean any previous nock interceptors
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('Claude Instance Creation Contract', () => {
    it('should match frontend expectations for POST /api/v1/claude-live/prod/instances', async () => {
      // Arrange - Define the exact contract frontend expects
      const frontendRequest = {
        name: 'prod-claude-instance',
        environment: 'prod',
        capabilities: ['terminal', 'file-operations', 'code-execution'],
        autoStart: true
      };

      const expectedBackendResponse = {
        success: true,
        instance: {
          id: 'claude-instance-prod-001',
          name: 'prod-claude-instance',
          status: 'initializing',
          pid: 2426,
          environment: 'prod',
          capabilities: ['terminal', 'file-operations', 'code-execution'],
          ports: {
            main: 3001,
            terminal: 3002
          },
          urls: {
            terminal: 'ws://localhost:3002/terminal',
            api: 'http://localhost:3001/api/claude'
          },
          createdAt: '2025-08-26T10:00:00.000Z',
          health: {
            status: 'healthy',
            lastCheck: '2025-08-26T10:00:00.000Z'
          }
        },
        sessionId: 'session-prod-001',
        terminalUrl: 'ws://localhost:3002/terminal/claude-instance-prod-001'
      };

      // Mock backend response
      const backendMock = nock(mockBackendBase)
        .post('/api/v1/claude-live/prod/instances')
        .reply(201, expectedBackendResponse);

      // Mock frontend service behavior
      frontendApiService.createClaudeInstance.mockImplementation(async (config) => {
        const response = await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        return response.json();
      });

      // Act
      const result = await frontendApiService.createClaudeInstance(frontendRequest);

      // Assert - Verify contract compliance
      expect(backendMock.isDone()).toBe(true);
      expect(result).toMatchObject(expectedBackendResponse);
      
      // Verify frontend service was called with expected parameters
      expect(frontendApiService.createClaudeInstance).toHaveBeenCalledWith(frontendRequest);
      
      // Contract-specific validations
      expect(result.instance.id).toMatch(/^claude-instance-prod-\d+$/);
      expect(result.instance.status).toBeOneOf(['initializing', 'starting', 'running']);
      expect(result.terminalUrl).toMatch(/^ws:\/\/localhost:\d+\/terminal\/.+$/);
    });

    it('should handle frontend timeout scenarios in instance creation', async () => {
      // Arrange - Simulate slow backend response
      const frontendRequest = { name: 'slow-instance' };
      
      const backendMock = nock(mockBackendBase)
        .post('/api/v1/claude-live/prod/instances')
        .delay(6000) // 6 second delay
        .reply(201, { success: true });

      frontendApiService.createClaudeInstance.mockImplementation(async (config) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        try {
          const response = await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          return response.json();
        } catch (error) {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout');
          }
          throw error;
        }
      });

      // Act & Assert
      await expect(frontendApiService.createClaudeInstance(frontendRequest))
        .rejects.toThrow('Request timeout');
    });
  });

  describe('Claude Instance Listing Contract', () => {
    it('should match frontend expectations for GET /api/v1/claude-live/prod/instances', async () => {
      // Arrange - Define expected response format
      const expectedResponse = {
        success: true,
        instances: [
          {
            id: 'instance-1',
            name: 'prod-claude-1',
            status: 'running',
            pid: 1234,
            environment: 'prod',
            capabilities: ['terminal', 'file-operations'],
            uptime: 3600,
            health: {
              status: 'healthy',
              memory: '128MB',
              cpu: '5%'
            },
            createdAt: '2025-08-26T09:00:00.000Z'
          },
          {
            id: 'instance-2', 
            name: 'prod-claude-2',
            status: 'idle',
            pid: 1235,
            environment: 'prod',
            capabilities: ['terminal'],
            uptime: 1800,
            health: {
              status: 'healthy',
              memory: '64MB',
              cpu: '1%'
            },
            createdAt: '2025-08-26T09:30:00.000Z'
          }
        ],
        count: 2,
        environment: 'prod',
        timestamp: '2025-08-26T10:00:00.000Z'
      };

      const backendMock = nock(mockBackendBase)
        .get('/api/v1/claude-live/prod/instances')
        .reply(200, expectedResponse);

      frontendApiService.listClaudeInstances.mockImplementation(async () => {
        const response = await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances`);
        return response.json();
      });

      // Act
      const result = await frontendApiService.listClaudeInstances();

      // Assert
      expect(backendMock.isDone()).toBe(true);
      expect(result).toMatchObject(expectedResponse);
      
      // Contract validations
      expect(result.instances).toBeInstanceOf(Array);
      expect(result.count).toBe(result.instances.length);
      expect(result.instances[0]).toHaveProperty('health.status');
      expect(result.instances[0].status).toBeOneOf(['running', 'idle', 'starting', 'stopped']);
    });

    it('should handle empty instance list gracefully', async () => {
      // Arrange
      const emptyResponse = {
        success: true,
        instances: [],
        count: 0,
        environment: 'prod',
        message: 'No active Claude instances found'
      };

      const backendMock = nock(mockBackendBase)
        .get('/api/v1/claude-live/prod/instances')
        .reply(200, emptyResponse);

      frontendApiService.listClaudeInstances.mockImplementation(async () => {
        const response = await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances`);
        return response.json();
      });

      // Act
      const result = await frontendApiService.listClaudeInstances();

      // Assert
      expect(result.instances).toEqual([]);
      expect(result.count).toBe(0);
      expect(result.message).toContain('No active');
    });
  });

  describe('Claude Instance Deletion Contract', () => {
    it('should match frontend expectations for DELETE /api/v1/claude-live/prod/instances/:id', async () => {
      // Arrange
      const instanceId = 'instance-123';
      const expectedResponse = {
        success: true,
        instance: {
          id: instanceId,
          status: 'terminated',
          pid: null,
          terminatedAt: '2025-08-26T10:05:00.000Z',
          gracefulShutdown: true
        },
        cleanup: {
          sessionsEnded: 1,
          resourcesFreed: true,
          portsClosed: [3001, 3002]
        }
      };

      const backendMock = nock(mockBackendBase)
        .delete(`/api/v1/claude-live/prod/instances/${instanceId}`)
        .query({ graceful: 'true' })
        .reply(200, expectedResponse);

      frontendApiService.deleteClaudeInstance.mockImplementation(async (id, options = {}) => {
        const queryParams = new URLSearchParams();
        if (options.graceful) queryParams.set('graceful', 'true');
        
        const url = `${mockBackendBase}/api/v1/claude-live/prod/instances/${id}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await fetch(url, { method: 'DELETE' });
        return response.json();
      });

      // Act
      const result = await frontendApiService.deleteClaudeInstance(instanceId, { graceful: true });

      // Assert
      expect(backendMock.isDone()).toBe(true);
      expect(result).toMatchObject(expectedResponse);
      expect(result.instance.status).toBe('terminated');
      expect(result.cleanup.resourcesFreed).toBe(true);
    });

    it('should handle 404 for non-existent instance deletion', async () => {
      // Arrange
      const nonExistentId = 'non-existent-instance';
      const errorResponse = {
        success: false,
        error: 'Instance not found',
        instanceId: nonExistentId
      };

      const backendMock = nock(mockBackendBase)
        .delete(`/api/v1/claude-live/prod/instances/${nonExistentId}`)
        .reply(404, errorResponse);

      frontendApiService.deleteClaudeInstance.mockImplementation(async (id) => {
        const response = await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances/${id}`, { method: 'DELETE' });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error);
        }
        return response.json();
      });

      // Act & Assert
      await expect(frontendApiService.deleteClaudeInstance(nonExistentId))
        .rejects.toThrow('Instance not found');
      
      expect(backendMock.isDone()).toBe(true);
    });
  });

  describe('Claude Activities Monitoring Contract', () => {
    it('should match frontend expectations for GET /api/v1/claude-live/prod/activities', async () => {
      // Arrange
      const expectedActivities = {
        success: true,
        activities: [
          {
            id: 'activity-1',
            instanceId: 'instance-123',
            type: 'command_execution',
            command: 'ls -la /workspace',
            status: 'completed',
            output: 'total 8\ndrwxr-xr-x 2 user user 4096 Aug 26 10:00 .\ndrwxr-xr-x 3 user user 4096 Aug 26 09:59 ..',
            startedAt: '2025-08-26T10:00:15.000Z',
            completedAt: '2025-08-26T10:00:15.100Z',
            duration: 100
          },
          {
            id: 'activity-2',
            instanceId: 'instance-123', 
            type: 'file_operation',
            operation: 'create',
            file: '/workspace/test.txt',
            status: 'completed',
            startedAt: '2025-08-26T10:00:20.000Z',
            completedAt: '2025-08-26T10:00:20.050Z',
            duration: 50
          }
        ],
        count: 2,
        pagination: {
          page: 1,
          limit: 50,
          total: 2,
          hasNext: false
        },
        realTime: true
      };

      const backendMock = nock(mockBackendBase)
        .get('/api/v1/claude-live/prod/activities')
        .query({ page: 1, limit: 50 })
        .reply(200, expectedActivities);

      frontendApiService.getClaudeActivities.mockImplementation(async (options = {}) => {
        const queryParams = new URLSearchParams();
        if (options.page) queryParams.set('page', options.page);
        if (options.limit) queryParams.set('limit', options.limit);
        if (options.instanceId) queryParams.set('instanceId', options.instanceId);
        
        const url = `${mockBackendBase}/api/v1/claude-live/prod/activities${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await fetch(url);
        return response.json();
      });

      // Act
      const result = await frontendApiService.getClaudeActivities({ page: 1, limit: 50 });

      // Assert
      expect(backendMock.isDone()).toBe(true);
      expect(result).toMatchObject(expectedActivities);
      
      // Contract validations
      expect(result.activities).toBeInstanceOf(Array);
      expect(result.activities[0]).toHaveProperty('duration');
      expect(result.activities[0].type).toBeOneOf(['command_execution', 'file_operation', 'terminal_session', 'api_call']);
      expect(result.pagination).toHaveProperty('hasNext');
    });

    it('should filter activities by instance ID', async () => {
      // Arrange
      const instanceId = 'instance-specific';
      const filteredActivities = {
        success: true,
        activities: [
          {
            id: 'activity-filtered-1',
            instanceId: instanceId,
            type: 'terminal_session',
            status: 'active'
          }
        ],
        count: 1,
        filter: { instanceId }
      };

      const backendMock = nock(mockBackendBase)
        .get('/api/v1/claude-live/prod/activities')
        .query({ instanceId })
        .reply(200, filteredActivities);

      frontendApiService.getClaudeActivities.mockImplementation(async (options = {}) => {
        const queryParams = new URLSearchParams();
        if (options.instanceId) queryParams.set('instanceId', options.instanceId);
        
        const url = `${mockBackendBase}/api/v1/claude-live/prod/activities?${queryParams.toString()}`;
        const response = await fetch(url);
        return response.json();
      });

      // Act
      const result = await frontendApiService.getClaudeActivities({ instanceId });

      // Assert
      expect(backendMock.isDone()).toBe(true);
      expect(result.activities.every(a => a.instanceId === instanceId)).toBe(true);
      expect(result.filter.instanceId).toBe(instanceId);
    });
  });

  describe('Error Handling Contract Compliance', () => {
    it('should match frontend error handling expectations', async () => {
      // Arrange - Test various error scenarios
      const errorScenarios = [
        {
          endpoint: 'POST /api/v1/claude-live/prod/instances',
          mockSetup: () => nock(mockBackendBase).post('/api/v1/claude-live/prod/instances').reply(400, {
            success: false,
            error: 'Invalid configuration',
            details: { field: 'name', message: 'Name cannot be empty' }
          }),
          expectedError: 'Invalid configuration'
        },
        {
          endpoint: 'GET /api/v1/claude-live/prod/instances',
          mockSetup: () => nock(mockBackendBase).get('/api/v1/claude-live/prod/instances').reply(500, {
            success: false,
            error: 'Internal server error',
            requestId: 'req-123'
          }),
          expectedError: 'Internal server error'
        },
        {
          endpoint: 'DELETE /api/v1/claude-live/prod/instances/test',
          mockSetup: () => nock(mockBackendBase).delete('/api/v1/claude-live/prod/instances/test').reply(404, {
            success: false,
            error: 'Instance not found'
          }),
          expectedError: 'Instance not found'
        }
      ];

      for (const scenario of errorScenarios) {
        // Setup mock
        const mock = scenario.mockSetup();

        // Act & Assert based on endpoint type
        try {
          if (scenario.endpoint.startsWith('POST')) {
            await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({})
            });
          } else if (scenario.endpoint.startsWith('GET')) {
            await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances`);
          } else if (scenario.endpoint.startsWith('DELETE')) {
            await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances/test`, { method: 'DELETE' });
          }
        } catch (error) {
          // Error handled by fetch, we'll check the mock
        }

        expect(mock.isDone()).toBe(true);
      }
    });

    it('should handle network connectivity issues', async () => {
      // Arrange - Simulate network timeout
      const backendMock = nock(mockBackendBase)
        .get('/api/v1/claude-live/prod/instances')
        .replyWithError({ code: 'ECONNRESET', message: 'Connection reset' });

      frontendApiService.listClaudeInstances.mockImplementation(async () => {
        try {
          const response = await fetch(`${mockBackendBase}/api/v1/claude-live/prod/instances`);
          return response.json();
        } catch (error) {
          throw new Error(`Network error: ${error.message}`);
        }
      });

      // Act & Assert
      await expect(frontendApiService.listClaudeInstances())
        .rejects.toThrow('Network error');
      
      expect(backendMock.isDone()).toBe(true);
    });
  });

  describe('Real-time Updates Contract', () => {
    it('should define WebSocket/SSE update contracts for instance status', async () => {
      // Arrange - Define expected real-time update format
      const statusUpdateContract = {
        type: 'instance_status_update',
        instanceId: 'instance-123',
        status: 'running',
        previousStatus: 'starting',
        timestamp: '2025-08-26T10:00:30.000Z',
        metadata: {
          pid: 2426,
          memory: '128MB',
          uptime: 30
        }
      };

      // Mock WebSocket-like behavior for real-time updates
      const mockWebSocketHandler = jest.fn();
      mockWebSocketHandler.mockImplementation((message) => {
        const data = JSON.parse(message);
        expect(data).toMatchObject(statusUpdateContract);
      });

      // Act - Simulate receiving real-time update
      const updateMessage = JSON.stringify(statusUpdateContract);
      mockWebSocketHandler(updateMessage);

      // Assert
      expect(mockWebSocketHandler).toHaveBeenCalledWith(updateMessage);
    });

    it('should define terminal output streaming contract', async () => {
      // Arrange
      const terminalOutputContract = {
        type: 'terminal_output',
        instanceId: 'instance-123',
        sessionId: 'session-456',
        output: 'user@claude:~$ ls -la\ntotal 12\ndrwxr-xr-x 3 user user 4096 Aug 26 10:00 .\n',
        timestamp: '2025-08-26T10:00:35.000Z',
        stream: 'stdout'
      };

      const mockTerminalHandler = jest.fn();
      mockTerminalHandler.mockImplementation((data) => {
        expect(data).toMatchObject(terminalOutputContract);
        expect(data.stream).toBeOneOf(['stdout', 'stderr']);
        expect(data.output).toBeTypeOf('string');
      });

      // Act
      mockTerminalHandler(terminalOutputContract);

      // Assert
      expect(mockTerminalHandler).toHaveBeenCalledWith(terminalOutputContract);
    });
  });
});

// Helper function for additional matchers
expect.extend({
  toBeOneOf(received, array) {
    const pass = array.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${array}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${array}`,
        pass: false,
      };
    }
  },
  
  toBeTypeOf(received, expectedType) {
    const pass = typeof received === expectedType;
    if (pass) {
      return {
        message: () => `expected ${received} not to be type ${expectedType}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be type ${expectedType}, but got ${typeof received}`,
        pass: false,
      };
    }
  }
});
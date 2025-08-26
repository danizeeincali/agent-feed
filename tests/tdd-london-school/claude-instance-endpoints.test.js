/**
 * TDD London School: Claude Instance Endpoints Test Suite
 * 
 * This test suite follows the London School (mockist) approach to TDD:
 * 1. Mock-first development with behavior verification
 * 2. Outside-in development from user scenarios
 * 3. Focus on interactions between objects
 * 4. Define contracts through mock expectations
 */

const request = require('supertest');
const express = require('express');

describe('Claude Instance Endpoints - London School TDD', () => {
  let app;
  let mockClaudeProcessManager;
  let mockSessionManager;
  let mockHealthMonitor;

  beforeEach(() => {
    // Create mock collaborators first (London School approach)
    mockClaudeProcessManager = {
      createInstance: jest.fn(),
      listInstances: jest.fn(),
      deleteInstance: jest.fn(),
      getInstance: jest.fn(),
      getInstanceActivities: jest.fn(),
      validateInstanceConfig: jest.fn()
    };

    mockSessionManager = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      endSession: jest.fn(),
      listSessions: jest.fn()
    };

    mockHealthMonitor = {
      checkInstanceHealth: jest.fn(),
      getMetrics: jest.fn()
    };

    // Create express app with mocked dependencies
    app = express();
    app.use(express.json());
    
    // Define expected endpoint behaviors through mocks
    setupMockEndpoints(app);
  });

  describe('POST /api/v1/claude-live/prod/instances - Instance Creation', () => {
    it('should create a new Claude instance successfully', async () => {
      // Arrange - Define expected behavior
      const instanceConfig = {
        name: 'test-instance',
        environment: 'prod',
        capabilities: ['terminal', 'file-operations']
      };

      const expectedInstance = {
        id: 'instance-123',
        name: 'test-instance',
        status: 'initializing',
        pid: 2426,
        environment: 'prod',
        capabilities: ['terminal', 'file-operations'],
        createdAt: new Date().toISOString()
      };

      // Mock the expected interactions
      mockClaudeProcessManager.validateInstanceConfig.mockReturnValue(true);
      mockClaudeProcessManager.createInstance.mockResolvedValue(expectedInstance);
      mockSessionManager.createSession.mockResolvedValue({
        id: 'session-456',
        instanceId: 'instance-123'
      });

      // Act & Assert - Verify the conversation between objects
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .send(instanceConfig)
        .expect(201);

      // Behavior verification (London School focus)
      expect(mockClaudeProcessManager.validateInstanceConfig).toHaveBeenCalledWith(instanceConfig);
      expect(mockClaudeProcessManager.createInstance).toHaveBeenCalledWith(instanceConfig);
      expect(mockSessionManager.createSession).toHaveBeenCalledWith('instance-123');

      // Response contract validation
      expect(response.body).toMatchObject({
        success: true,
        instance: expectedInstance,
        sessionId: 'session-456'
      });
    });

    it('should handle instance creation failure gracefully', async () => {
      // Arrange - Define failure scenario
      const invalidConfig = { name: '' };
      const validationError = new Error('Invalid instance configuration');

      mockClaudeProcessManager.validateInstanceConfig.mockReturnValue(false);
      mockClaudeProcessManager.createInstance.mockRejectedValue(validationError);

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .send(invalidConfig)
        .expect(400);

      // Verify error handling interactions
      expect(mockClaudeProcessManager.validateInstanceConfig).toHaveBeenCalledWith(invalidConfig);
      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid instance configuration'
      });
    });

    it('should enforce request rate limiting', async () => {
      // Arrange - Mock rate limiter behavior
      const instanceConfig = { name: 'rate-test' };

      // Simulate multiple rapid requests
      const promises = Array(6).fill().map(() =>
        request(app)
          .post('/api/v1/claude-live/prod/instances')
          .send(instanceConfig)
      );

      const responses = await Promise.all(promises);

      // Verify rate limiting kicks in
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/claude-live/prod/instances - Instance Listing', () => {
    it('should list all active Claude instances', async () => {
      // Arrange - Define expected instances
      const expectedInstances = [
        {
          id: 'instance-1',
          name: 'prod-claude-1',
          status: 'running',
          pid: 1234,
          environment: 'prod',
          capabilities: ['terminal', 'file-operations'],
          uptime: 3600,
          createdAt: '2025-08-26T10:00:00.000Z'
        },
        {
          id: 'instance-2',
          name: 'prod-claude-2',
          status: 'idle',
          pid: 1235,
          environment: 'prod',
          capabilities: ['terminal'],
          uptime: 1800,
          createdAt: '2025-08-26T10:30:00.000Z'
        }
      ];

      mockClaudeProcessManager.listInstances.mockResolvedValue(expectedInstances);

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/claude-live/prod/instances')
        .expect(200);

      // Verify interaction occurred
      expect(mockClaudeProcessManager.listInstances).toHaveBeenCalledWith('prod');

      // Contract validation
      expect(response.body).toMatchObject({
        success: true,
        instances: expectedInstances,
        count: 2
      });
    });

    it('should handle empty instance list', async () => {
      // Arrange
      mockClaudeProcessManager.listInstances.mockResolvedValue([]);

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/claude-live/prod/instances')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        instances: [],
        count: 0,
        message: 'No active Claude instances found'
      });
    });

    it('should filter instances by status query parameter', async () => {
      // Arrange
      const runningInstances = [
        { id: 'instance-1', status: 'running' }
      ];

      mockClaudeProcessManager.listInstances.mockResolvedValue(runningInstances);

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/claude-live/prod/instances?status=running')
        .expect(200);

      // Verify filtering interaction
      expect(mockClaudeProcessManager.listInstances).toHaveBeenCalledWith('prod', { status: 'running' });
    });
  });

  describe('DELETE /api/v1/claude-live/prod/instances/:id - Instance Deletion', () => {
    it('should delete a Claude instance successfully', async () => {
      // Arrange
      const instanceId = 'instance-123';
      const deletionResult = {
        id: instanceId,
        status: 'terminated',
        terminatedAt: new Date().toISOString()
      };

      mockClaudeProcessManager.getInstance.mockResolvedValue({
        id: instanceId,
        status: 'running'
      });
      mockClaudeProcessManager.deleteInstance.mockResolvedValue(deletionResult);
      mockSessionManager.endSession.mockResolvedValue(true);

      // Act & Assert
      const response = await request(app)
        .delete(`/api/v1/claude-live/prod/instances/${instanceId}`)
        .expect(200);

      // Verify the proper sequence of interactions
      expect(mockClaudeProcessManager.getInstance).toHaveBeenCalledWith(instanceId);
      expect(mockClaudeProcessManager.deleteInstance).toHaveBeenCalledWith(instanceId);
      expect(mockSessionManager.endSession).toHaveBeenCalledWith(instanceId);

      expect(response.body).toMatchObject({
        success: true,
        instance: deletionResult
      });
    });

    it('should handle deletion of non-existent instance', async () => {
      // Arrange
      const instanceId = 'non-existent';
      
      mockClaudeProcessManager.getInstance.mockResolvedValue(null);

      // Act & Assert
      const response = await request(app)
        .delete(`/api/v1/claude-live/prod/instances/${instanceId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Instance not found'
      });

      // Verify it doesn't try to delete non-existent instance
      expect(mockClaudeProcessManager.deleteInstance).not.toHaveBeenCalled();
    });

    it('should handle graceful shutdown during deletion', async () => {
      // Arrange
      const instanceId = 'instance-123';
      
      mockClaudeProcessManager.getInstance.mockResolvedValue({
        id: instanceId,
        status: 'running'
      });
      mockClaudeProcessManager.deleteInstance.mockResolvedValue({
        id: instanceId,
        status: 'terminating',
        gracefulShutdown: true
      });

      // Act & Assert
      const response = await request(app)
        .delete(`/api/v1/claude-live/prod/instances/${instanceId}`)
        .query({ graceful: 'true' })
        .expect(200);

      // Verify graceful shutdown parameter passed
      expect(mockClaudeProcessManager.deleteInstance).toHaveBeenCalledWith(instanceId, { graceful: true });
    });
  });

  describe('GET /api/v1/claude-live/prod/activities - Activity Monitoring', () => {
    it('should retrieve instance activities', async () => {
      // Arrange
      const expectedActivities = [
        {
          id: 'activity-1',
          instanceId: 'instance-123',
          type: 'command_execution',
          command: 'ls -la',
          status: 'completed',
          output: 'file1.txt\nfile2.txt',
          timestamp: '2025-08-26T10:15:00.000Z'
        },
        {
          id: 'activity-2',
          instanceId: 'instance-123',
          type: 'file_operation',
          operation: 'create',
          file: '/tmp/test.txt',
          status: 'completed',
          timestamp: '2025-08-26T10:16:00.000Z'
        }
      ];

      mockClaudeProcessManager.getInstanceActivities.mockResolvedValue(expectedActivities);

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/claude-live/prod/activities')
        .expect(200);

      expect(mockClaudeProcessManager.getInstanceActivities).toHaveBeenCalledWith('prod');

      expect(response.body).toMatchObject({
        success: true,
        activities: expectedActivities,
        count: 2
      });
    });

    it('should filter activities by instance ID', async () => {
      // Arrange
      const instanceId = 'instance-123';
      const filteredActivities = [
        {
          id: 'activity-1',
          instanceId: instanceId,
          type: 'command_execution'
        }
      ];

      mockClaudeProcessManager.getInstanceActivities.mockResolvedValue(filteredActivities);

      // Act & Assert
      const response = await request(app)
        .get(`/api/v1/claude-live/prod/activities?instanceId=${instanceId}`)
        .expect(200);

      // Verify filtering interaction
      expect(mockClaudeProcessManager.getInstanceActivities).toHaveBeenCalledWith('prod', { instanceId });
    });

    it('should support pagination for activities', async () => {
      // Arrange
      const paginatedActivities = Array(10).fill().map((_, i) => ({
        id: `activity-${i}`,
        type: 'command_execution',
        timestamp: new Date().toISOString()
      }));

      mockClaudeProcessManager.getInstanceActivities.mockResolvedValue({
        activities: paginatedActivities,
        pagination: {
          page: 1,
          limit: 10,
          total: 100,
          hasNext: true
        }
      });

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/claude-live/prod/activities?page=1&limit=10')
        .expect(200);

      // Verify pagination parameters passed
      expect(mockClaudeProcessManager.getInstanceActivities).toHaveBeenCalledWith('prod', { page: 1, limit: 10 });
    });
  });

  describe('Cross-cutting Concerns', () => {
    it('should validate CORS headers on all endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/api/v1/claude-live/prod/instances' },
        { method: 'get', path: '/api/v1/claude-live/prod/instances' },
        { method: 'delete', path: '/api/v1/claude-live/prod/instances/test' },
        { method: 'get', path: '/api/v1/claude-live/prod/activities' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .options(endpoint.path)
          .expect(200);

        expect(response.headers['access-control-allow-origin']).toBeDefined();
        expect(response.headers['access-control-allow-methods']).toContain(endpoint.method.toUpperCase());
        expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
      }
    });

    it('should include security headers in all responses', async () => {
      mockClaudeProcessManager.listInstances.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/claude-live/prod/instances')
        .expect(200);

      // Verify security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should handle authentication and authorization', async () => {
      // Test without auth token
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .send({ name: 'test' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Unauthorized'
      });
    });
  });
});

/**
 * Mock endpoint setup function
 * Defines the expected API contract behavior through mocks
 */
function setupMockEndpoints(app) {
  // CORS middleware
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Security headers middleware
  app.use((req, res, next) => {
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Rate limiting simulation
  const requestCounts = new Map();
  app.use((req, res, next) => {
    const key = req.ip + req.path;
    const count = requestCounts.get(key) || 0;
    
    if (count >= 5) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests'
      });
    }
    
    requestCounts.set(key, count + 1);
    setTimeout(() => requestCounts.delete(key), 60000); // Reset after 1 minute
    next();
  });

  // Mock authentication middleware
  app.use((req, res, next) => {
    // Skip auth for OPTIONS requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (req.method === 'POST' || req.method === 'DELETE') {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }
    }
    next();
  });

  // POST /api/v1/claude-live/prod/instances
  app.post('/api/v1/claude-live/prod/instances', async (req, res) => {
    try {
      const config = req.body;
      
      const isValid = mockClaudeProcessManager.validateInstanceConfig(config);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid instance configuration'
        });
      }

      const instance = await mockClaudeProcessManager.createInstance(config);
      const session = await mockSessionManager.createSession(instance.id);
      
      res.status(201).json({
        success: true,
        instance,
        sessionId: session.id
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/v1/claude-live/prod/instances
  app.get('/api/v1/claude-live/prod/instances', async (req, res) => {
    try {
      const filters = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const instances = await mockClaudeProcessManager.listInstances('prod', filters);
      
      res.json({
        success: true,
        instances,
        count: instances.length,
        ...(instances.length === 0 && { message: 'No active Claude instances found' })
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // DELETE /api/v1/claude-live/prod/instances/:id
  app.delete('/api/v1/claude-live/prod/instances/:id', async (req, res) => {
    try {
      const instanceId = req.params.id;
      
      const existingInstance = await mockClaudeProcessManager.getInstance(instanceId);
      if (!existingInstance) {
        return res.status(404).json({
          success: false,
          error: 'Instance not found'
        });
      }

      const options = {};
      if (req.query.graceful === 'true') {
        options.graceful = true;
      }

      const result = await mockClaudeProcessManager.deleteInstance(instanceId, options);
      await mockSessionManager.endSession(instanceId);
      
      res.json({
        success: true,
        instance: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // GET /api/v1/claude-live/prod/activities
  app.get('/api/v1/claude-live/prod/activities', async (req, res) => {
    try {
      const filters = {};
      if (req.query.instanceId) {
        filters.instanceId = req.query.instanceId;
      }
      if (req.query.page && req.query.limit) {
        filters.page = parseInt(req.query.page);
        filters.limit = parseInt(req.query.limit);
      }

      const result = await mockClaudeProcessManager.getInstanceActivities('prod', filters);
      
      // Handle paginated vs non-paginated results
      if (result.activities) {
        res.json({
          success: true,
          activities: result.activities,
          count: result.activities.length,
          pagination: result.pagination
        });
      } else {
        res.json({
          success: true,
          activities: result,
          count: result.length
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}
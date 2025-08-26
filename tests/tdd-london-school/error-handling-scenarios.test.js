/**
 * TDD London School: Comprehensive Error Handling Test Scenarios
 * 
 * This test suite focuses on behavior verification for all error scenarios
 * in the Claude instance management system, using mocks to define expected
 * error handling contracts and interactions.
 */

const request = require('supertest');
const express = require('express');

describe('Error Handling Scenarios - London School TDD', () => {
  let app;
  let mockLogger;
  let mockMetricsCollector;
  let mockErrorReporter;
  let mockClaudeProcessManager;
  let mockCircuitBreaker;

  beforeEach(() => {
    // Create mock error handling collaborators
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn()
    };

    mockMetricsCollector = {
      recordError: jest.fn(),
      recordLatency: jest.fn(),
      recordRetry: jest.fn()
    };

    mockErrorReporter = {
      reportError: jest.fn(),
      reportCriticalError: jest.fn()
    };

    mockClaudeProcessManager = {
      createInstance: jest.fn(),
      deleteInstance: jest.fn(),
      listInstances: jest.fn(),
      getInstanceHealth: jest.fn()
    };

    mockCircuitBreaker = {
      isOpen: jest.fn(),
      execute: jest.fn(),
      recordSuccess: jest.fn(),
      recordFailure: jest.fn()
    };

    // Set up Express app with error handling
    app = express();
    app.use(express.json());
    setupErrorHandlingMiddleware(app);
    setupMockEndpoints(app);
  });

  describe('4xx Client Error Scenarios', () => {
    it('should handle 400 Bad Request with detailed validation errors', async () => {
      // Arrange - Define invalid request that should trigger validation
      const invalidInstanceConfig = {
        name: '', // Empty name
        environment: 'invalid-env', // Invalid environment
        capabilities: ['invalid-capability'] // Invalid capability
      };

      const expectedValidationError = {
        success: false,
        error: 'Validation failed',
        details: {
          name: 'Name cannot be empty',
          environment: 'Environment must be one of: prod, dev, staging',
          capabilities: 'Invalid capability: invalid-capability'
        },
        errorCode: 'VALIDATION_ERROR',
        timestamp: expect.any(String)
      };

      // Mock validation failure
      mockClaudeProcessManager.createInstance.mockRejectedValue(
        Object.assign(new Error('Validation failed'), {
          code: 'VALIDATION_ERROR',
          details: expectedValidationError.details
        })
      );

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .send(invalidInstanceConfig)
        .expect(400);

      expect(response.body).toMatchObject(expectedValidationError);
      
      // Verify error handling interactions
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Validation error in instance creation',
        expect.objectContaining({ details: expectedValidationError.details })
      );
      expect(mockMetricsCollector.recordError).toHaveBeenCalledWith('validation_error', 'instance_creation');
    });

    it('should handle 401 Unauthorized with proper authentication guidance', async () => {
      // Arrange - Request without authentication
      const instanceConfig = { name: 'test-instance' };
      
      const expectedAuthError = {
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid Bearer token.',
        errorCode: 'AUTH_REQUIRED',
        authUrl: '/api/v1/auth/login'
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .send(instanceConfig)
        // Intentionally omit Authorization header
        .expect(401);

      expect(response.body).toMatchObject(expectedAuthError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Unauthorized access attempt',
        expect.objectContaining({ endpoint: '/api/v1/claude-live/prod/instances' })
      );
    });

    it('should handle 403 Forbidden with resource-specific permissions', async () => {
      // Arrange - Valid auth but insufficient permissions
      const restrictedConfig = { 
        name: 'admin-only-instance',
        environment: 'prod',
        adminFeatures: true
      };

      const expectedForbiddenError = {
        success: false,
        error: 'Forbidden',
        message: 'Insufficient permissions to create instances with admin features',
        errorCode: 'INSUFFICIENT_PERMISSIONS',
        requiredPermissions: ['claude:instance:admin'],
        currentPermissions: ['claude:instance:basic']
      };

      mockClaudeProcessManager.createInstance.mockRejectedValue(
        Object.assign(new Error('Forbidden'), {
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions: ['claude:instance:admin'],
          currentPermissions: ['claude:instance:basic']
        })
      );

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token-insufficient-perms')
        .send(restrictedConfig)
        .expect(403);

      expect(response.body).toMatchObject(expectedForbiddenError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Permission denied for resource access',
        expect.objectContaining({ requiredPermissions: ['claude:instance:admin'] })
      );
    });

    it('should handle 404 Not Found for non-existent instances', async () => {
      // Arrange
      const nonExistentId = 'non-existent-instance-123';
      
      const expectedNotFoundError = {
        success: false,
        error: 'Instance not found',
        message: `Claude instance with ID '${nonExistentId}' does not exist`,
        errorCode: 'RESOURCE_NOT_FOUND',
        resourceType: 'claude_instance',
        resourceId: nonExistentId
      };

      mockClaudeProcessManager.deleteInstance.mockRejectedValue(
        Object.assign(new Error('Instance not found'), {
          code: 'RESOURCE_NOT_FOUND',
          resourceType: 'claude_instance',
          resourceId: nonExistentId
        })
      );

      // Act & Assert
      const response = await request(app)
        .delete(`/api/v1/claude-live/prod/instances/${nonExistentId}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toMatchObject(expectedNotFoundError);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Resource not found',
        expect.objectContaining({ resourceId: nonExistentId })
      );
    });

    it('should handle 409 Conflict for duplicate instance names', async () => {
      // Arrange
      const conflictingConfig = {
        name: 'existing-instance-name',
        environment: 'prod'
      };

      const expectedConflictError = {
        success: false,
        error: 'Instance name already exists',
        message: 'An instance with name "existing-instance-name" already exists in prod environment',
        errorCode: 'RESOURCE_CONFLICT',
        conflictType: 'duplicate_name',
        existingResource: {
          id: 'existing-instance-456',
          name: 'existing-instance-name',
          environment: 'prod'
        }
      };

      mockClaudeProcessManager.createInstance.mockRejectedValue(
        Object.assign(new Error('Instance name already exists'), {
          code: 'RESOURCE_CONFLICT',
          conflictType: 'duplicate_name',
          existingResource: expectedConflictError.existingResource
        })
      );

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send(conflictingConfig)
        .expect(409);

      expect(response.body).toMatchObject(expectedConflictError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Resource conflict detected',
        expect.objectContaining({ conflictType: 'duplicate_name' })
      );
    });

    it('should handle 429 Too Many Requests with retry guidance', async () => {
      // Arrange - Simulate rate limiting
      const rateLimitError = {
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Try again in 60 seconds.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
        limit: 10,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000).toISOString()
      };

      // Act & Assert - Make multiple rapid requests
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/v1/claude-live/prod/instances')
          .set('Authorization', 'Bearer valid-token')
          .send({ name: 'rate-limit-test' })
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(rateLimitedResponses[0].body).toMatchObject({
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number)
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({ endpoint: '/api/v1/claude-live/prod/instances' })
      );
    });
  });

  describe('5xx Server Error Scenarios', () => {
    it('should handle 500 Internal Server Error with proper logging', async () => {
      // Arrange - Mock unexpected server error
      const systemError = new Error('Database connection failed');
      systemError.stack = 'Error: Database connection failed\n    at DatabaseManager.connect...';
      
      mockClaudeProcessManager.listInstances.mockRejectedValue(systemError);

      const expectedServerError = {
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again later.',
        errorCode: 'INTERNAL_ERROR',
        errorId: expect.any(String),
        timestamp: expect.any(String)
      };

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body).toMatchObject(expectedServerError);
      
      // Verify error reporting interactions
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Internal server error',
        expect.objectContaining({
          error: systemError.message,
          stack: systemError.stack
        })
      );
      expect(mockErrorReporter.reportCriticalError).toHaveBeenCalledWith(systemError, {
        endpoint: '/api/v1/claude-live/prod/instances',
        method: 'GET'
      });
      expect(mockMetricsCollector.recordError).toHaveBeenCalledWith('internal_error', 'list_instances');
    });

    it('should handle 503 Service Unavailable with circuit breaker', async () => {
      // Arrange - Mock circuit breaker open state
      mockCircuitBreaker.isOpen.mockReturnValue(true);
      
      const serviceUnavailableError = {
        success: false,
        error: 'Service Unavailable',
        message: 'Claude instance service is temporarily unavailable. Please try again later.',
        errorCode: 'SERVICE_UNAVAILABLE',
        retryAfter: 30,
        circuitBreakerOpen: true,
        estimatedRecovery: expect.any(String)
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'test-instance' })
        .expect(503);

      expect(response.body).toMatchObject(serviceUnavailableError);
      
      // Verify circuit breaker interactions
      expect(mockCircuitBreaker.isOpen).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Service unavailable - circuit breaker open',
        expect.objectContaining({ endpoint: '/api/v1/claude-live/prod/instances' })
      );
    });

    it('should handle 502 Bad Gateway from downstream services', async () => {
      // Arrange - Mock downstream service failure
      const gatewayError = new Error('Claude CLI service unavailable');
      gatewayError.code = 'ECONNREFUSED';
      
      mockClaudeProcessManager.createInstance.mockRejectedValue(gatewayError);

      const expectedGatewayError = {
        success: false,
        error: 'Bad Gateway',
        message: 'Unable to connect to Claude service. Please try again later.',
        errorCode: 'DOWNSTREAM_SERVICE_ERROR',
        service: 'claude-cli',
        retryAfter: 10
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'test-instance' })
        .expect(502);

      expect(response.body).toMatchObject(expectedGatewayError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Downstream service error',
        expect.objectContaining({ service: 'claude-cli', error: gatewayError.message })
      );
    });

    it('should handle 504 Gateway Timeout for slow operations', async () => {
      // Arrange - Mock timeout scenario
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(Object.assign(new Error('Operation timeout'), {
            code: 'TIMEOUT'
          }));
        }, 100);
      });

      mockClaudeProcessManager.createInstance.mockReturnValue(timeoutPromise);

      const expectedTimeoutError = {
        success: false,
        error: 'Gateway Timeout',
        message: 'The operation took too long to complete. Please try again.',
        errorCode: 'OPERATION_TIMEOUT',
        timeout: 30000,
        retryRecommended: true
      };

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'slow-instance' })
        .expect(504);

      expect(response.body).toMatchObject(expectedTimeoutError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Operation timeout',
        expect.objectContaining({ timeout: expect.any(Number) })
      );
    });
  });

  describe('Network and Connection Error Scenarios', () => {
    it('should handle WebSocket connection failures gracefully', async () => {
      // Arrange - Mock WebSocket connection failure
      const wsError = {
        success: false,
        error: 'WebSocket Connection Failed',
        message: 'Failed to establish terminal connection. Falling back to HTTP polling.',
        errorCode: 'WEBSOCKET_CONNECTION_FAILED',
        fallbackMode: 'http-polling',
        terminalUrl: 'http://localhost:3001/api/v1/claude/instances/test-instance/terminal/poll'
      };

      // Act & Assert
      const response = await request(app)
        .get('/api/v1/claude-live/prod/instances/test-instance/terminal/connect')
        .set('Authorization', 'Bearer valid-token')
        .expect(200); // Should succeed with fallback

      expect(response.body).toMatchObject({
        success: true,
        connectionType: 'http-polling',
        fallbackReason: 'websocket-unavailable'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'WebSocket connection failed, using HTTP fallback',
        expect.objectContaining({ instanceId: 'test-instance' })
      );
    });

    it('should handle concurrent connection limits', async () => {
      // Arrange - Mock connection limit exceeded
      const connectionLimitError = {
        success: false,
        error: 'Connection Limit Exceeded',
        message: 'Maximum number of concurrent connections reached. Please try again later.',
        errorCode: 'CONNECTION_LIMIT_EXCEEDED',
        currentConnections: 100,
        maxConnections: 100,
        queuePosition: 5
      };

      // Mock connection manager at capacity
      mockClaudeProcessManager.createInstance.mockRejectedValue(
        Object.assign(new Error('Connection limit exceeded'), {
          code: 'CONNECTION_LIMIT_EXCEEDED',
          currentConnections: 100,
          maxConnections: 100
        })
      );

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'over-limit-instance' })
        .expect(429);

      expect(response.body).toMatchObject({
        success: false,
        errorCode: 'CONNECTION_LIMIT_EXCEEDED',
        currentConnections: expect.any(Number),
        maxConnections: expect.any(Number)
      });
    });
  });

  describe('Data Consistency and Validation Errors', () => {
    it('should handle malformed JSON requests', async () => {
      // Arrange - Send malformed JSON
      const malformedJson = '{"name": "test", "invalid": json}';
      
      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .set('Content-Type', 'application/json')
        .send(malformedJson)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid JSON',
        errorCode: 'MALFORMED_REQUEST'
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Malformed JSON request',
        expect.objectContaining({ endpoint: '/api/v1/claude-live/prod/instances' })
      );
    });

    it('should handle schema validation failures with detailed field errors', async () => {
      // Arrange - Request that violates schema
      const invalidSchema = {
        name: 'a'.repeat(256), // Too long
        environment: 'prod',
        capabilities: [], // Empty array not allowed
        memory: -1, // Negative number
        ports: { main: 'not-a-number' } // Wrong type
      };

      const expectedSchemaError = {
        success: false,
        error: 'Schema validation failed',
        errorCode: 'SCHEMA_VALIDATION_ERROR',
        violations: [
          { field: 'name', message: 'Name must be less than 255 characters' },
          { field: 'capabilities', message: 'At least one capability must be specified' },
          { field: 'memory', message: 'Memory must be a positive number' },
          { field: 'ports.main', message: 'Port must be a valid number' }
        ]
      };

      mockClaudeProcessManager.createInstance.mockRejectedValue(
        Object.assign(new Error('Schema validation failed'), {
          code: 'SCHEMA_VALIDATION_ERROR',
          violations: expectedSchemaError.violations
        })
      );

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidSchema)
        .expect(400);

      expect(response.body).toMatchObject(expectedSchemaError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Schema validation failed',
        expect.objectContaining({ violations: expect.any(Array) })
      );
    });
  });

  describe('Recovery and Retry Mechanisms', () => {
    it('should implement exponential backoff for retryable errors', async () => {
      // Arrange - Mock transient failure followed by success
      let attempts = 0;
      mockClaudeProcessManager.createInstance.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw Object.assign(new Error('Transient failure'), {
            code: 'TRANSIENT_ERROR',
            retryable: true
          });
        }
        return {
          id: 'retry-success-instance',
          name: 'retry-test',
          status: 'running'
        };
      });

      // Act - Make request with retry logic
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'retry-test', retryOnFailure: true })
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.instance.id).toBe('retry-success-instance');
      
      // Verify retry interactions
      expect(mockClaudeProcessManager.createInstance).toHaveBeenCalledTimes(3);
      expect(mockMetricsCollector.recordRetry).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Operation succeeded after retries',
        expect.objectContaining({ attempts: 3 })
      );
    });

    it('should stop retrying after max attempts and report failure', async () => {
      // Arrange - Mock persistent failure
      mockClaudeProcessManager.createInstance.mockRejectedValue(
        Object.assign(new Error('Persistent failure'), {
          code: 'PERSISTENT_ERROR',
          retryable: true
        })
      );

      // Act & Assert
      const response = await request(app)
        .post('/api/v1/claude-live/prod/instances')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'persistent-failure', retryOnFailure: true })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Operation failed after maximum retries',
        errorCode: 'MAX_RETRIES_EXCEEDED',
        attempts: 3,
        lastError: 'Persistent failure'
      });

      expect(mockClaudeProcessManager.createInstance).toHaveBeenCalledTimes(3);
      expect(mockErrorReporter.reportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ maxRetriesExceeded: true })
      );
    });
  });

  // Helper function to set up error handling middleware
  function setupErrorHandlingMiddleware(app) {
    // Request timeout middleware
    app.use((req, res, next) => {
      req.setTimeout(30000, () => {
        const error = new Error('Request timeout');
        error.code = 'TIMEOUT';
        next(error);
      });
      next();
    });

    // Rate limiting middleware
    const requests = new Map();
    app.use((req, res, next) => {
      const key = req.ip + req.originalUrl;
      const now = Date.now();
      const windowStart = now - 60000; // 1 minute window
      
      const userRequests = requests.get(key) || [];
      const recentRequests = userRequests.filter(time => time > windowStart);
      
      if (recentRequests.length >= 10) {
        return res.status(429).json({
          success: false,
          error: 'Too Many Requests',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 60
        });
      }
      
      recentRequests.push(now);
      requests.set(key, recentRequests);
      next();
    });

    // Circuit breaker middleware
    app.use((req, res, next) => {
      if (mockCircuitBreaker.isOpen()) {
        return res.status(503).json({
          success: false,
          error: 'Service Unavailable',
          errorCode: 'SERVICE_UNAVAILABLE',
          circuitBreakerOpen: true,
          retryAfter: 30
        });
      }
      next();
    });

    // Authentication middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (req.method !== 'GET' && !authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          errorCode: 'AUTH_REQUIRED',
          message: 'Authentication required. Please provide a valid Bearer token.',
          authUrl: '/api/v1/auth/login'
        });
      }
      next();
    });

    // Global error handler
    app.use((error, req, res, next) => {
      const errorId = Date.now().toString();
      
      // Log error
      mockLogger.error('Request error', {
        errorId,
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method
      });

      // Determine response based on error type
      if (error.code === 'VALIDATION_ERROR') {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details,
          errorCode: 'VALIDATION_ERROR',
          errorId,
          timestamp: new Date().toISOString()
        });
      } else if (error.code === 'TIMEOUT') {
        res.status(504).json({
          success: false,
          error: 'Gateway Timeout',
          message: 'The operation took too long to complete. Please try again.',
          errorCode: 'OPERATION_TIMEOUT',
          errorId,
          timestamp: new Date().toISOString()
        });
      } else {
        // Generic internal server error
        res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'An unexpected error occurred. Please try again later.',
          errorCode: 'INTERNAL_ERROR',
          errorId,
          timestamp: new Date().toISOString()
        });
      }

      // Record error metrics
      mockMetricsCollector.recordError(error.code || 'unknown_error', req.route?.path || req.url);
    });
  }

  // Helper function to set up mock endpoints with error scenarios
  function setupMockEndpoints(app) {
    app.post('/api/v1/claude-live/prod/instances', async (req, res, next) => {
      try {
        const instance = await mockClaudeProcessManager.createInstance(req.body);
        res.status(201).json({
          success: true,
          instance
        });
      } catch (error) {
        next(error);
      }
    });

    app.get('/api/v1/claude-live/prod/instances', async (req, res, next) => {
      try {
        const instances = await mockClaudeProcessManager.listInstances();
        res.json({
          success: true,
          instances
        });
      } catch (error) {
        next(error);
      }
    });

    app.delete('/api/v1/claude-live/prod/instances/:id', async (req, res, next) => {
      try {
        const result = await mockClaudeProcessManager.deleteInstance(req.params.id);
        res.json({
          success: true,
          instance: result
        });
      } catch (error) {
        next(error);
      }
    });
  }
});
/**
 * Phase 1 Tests: Database Schema & API Gateway
 * London School TDD - Mock-driven database schema validation
 */

import { MockFactory } from '../../factories/mock-factory.js';
import { DatabaseSchema } from '../../../src/database/schema.js';
import { APIGateway } from '../../../src/api/gateway.js';

describe('Phase 1: Database Schema & API Gateway', () => {
  let mockFactory;
  let mockDatabase;
  let mockValidator;
  let mockLogger;

  beforeEach(() => {
    mockFactory = new MockFactory();
    mockDatabase = mockFactory.createDatabaseMocks();
    mockValidator = {
      validateSchema: jest.fn(),
      validateConstraints: jest.fn(),
      validateIndexes: jest.fn()
    };
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };
  });

  describe('Database Schema Validation', () => {
    it('should create agent_executions table with proper schema', async () => {
      // Arrange
      const schemaManager = new DatabaseSchema(mockDatabase, mockValidator);
      const expectedSchema = {
        table: 'agent_executions',
        columns: {
          id: { type: 'UUID', primary: true },
          agent_name: { type: 'VARCHAR', length: 255, nullable: false },
          execution_start: { type: 'TIMESTAMP', nullable: false },
          execution_end: { type: 'TIMESTAMP', nullable: true },
          status: { type: 'ENUM', values: ['pending', 'running', 'completed', 'failed'] },
          input_data: { type: 'JSONB', nullable: true },
          output_data: { type: 'JSONB', nullable: true },
          error_message: { type: 'TEXT', nullable: true },
          created_at: { type: 'TIMESTAMP', default: 'NOW()' },
          updated_at: { type: 'TIMESTAMP', default: 'NOW()' }
        },
        indexes: [
          { name: 'idx_agent_executions_agent_name', columns: ['agent_name'] },
          { name: 'idx_agent_executions_status', columns: ['status'] },
          { name: 'idx_agent_executions_created_at', columns: ['created_at'] }
        ]
      };

      mockValidator.validateSchema.mockResolvedValue({ valid: true });
      mockDatabase.query.mockResolvedValue({ success: true });

      // Act
      await schemaManager.createAgentExecutionsTable();

      // Assert - Verify schema validation called with correct structure
      expect(mockValidator.validateSchema).toHaveBeenCalledWith(
        expect.objectContaining(expectedSchema)
      );
      
      // Verify database query called with CREATE TABLE statement
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE agent_executions')
      );
      
      // Verify indexes were created
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX idx_agent_executions_agent_name')
      );
    });

    it('should create activities table with foreign key constraints', async () => {
      // Arrange
      const schemaManager = new DatabaseSchema(mockDatabase, mockValidator);
      const expectedConstraints = [
        {
          name: 'fk_activities_agent_execution',
          table: 'activities',
          column: 'agent_execution_id',
          references: { table: 'agent_executions', column: 'id' },
          onDelete: 'CASCADE'
        }
      ];

      mockValidator.validateConstraints.mockResolvedValue({ valid: true });

      // Act
      await schemaManager.createActivitiesTable();

      // Assert - Verify foreign key constraints
      expect(mockValidator.validateConstraints).toHaveBeenCalledWith(
        expect.arrayContaining(expectedConstraints)
      );
      
      expect(mockDatabase.query).toHaveBeenCalledWith(
        expect.stringContaining('FOREIGN KEY (agent_execution_id) REFERENCES agent_executions(id)')
      );
    });

    it('should handle schema migration rollback on validation failure', async () => {
      // Arrange
      const schemaManager = new DatabaseSchema(mockDatabase, mockValidator);
      mockValidator.validateSchema.mockResolvedValue({ 
        valid: false, 
        errors: ['Invalid column type'] 
      });
      mockDatabase.beginTransaction.mockResolvedValue({ transactionId: 'tx-123' });
      mockDatabase.rollback.mockResolvedValue({ rolledBack: true });

      // Act & Assert
      await expect(schemaManager.createAgentExecutionsTable()).rejects.toThrow();
      
      // Verify transaction rollback
      expect(mockDatabase.beginTransaction).toHaveBeenCalled();
      expect(mockDatabase.rollback).toHaveBeenCalled();
      expect(mockDatabase.commit).not.toHaveBeenCalled();
    });
  });

  describe('API Gateway Configuration', () => {
    it('should configure rate limiting for agent endpoints', async () => {
      // Arrange
      const gateway = new APIGateway(mockLogger);
      const mockRateLimiter = {
        configure: jest.fn().mockResolvedValue({ configured: true }),
        setLimits: jest.fn()
      };
      const expectedLimits = {
        '/api/agents/execute': { requests: 100, window: '1m' },
        '/api/agents/status': { requests: 500, window: '1m' },
        '/api/activities': { requests: 1000, window: '1m' }
      };

      // Act
      await gateway.configureRateLimiting(mockRateLimiter, expectedLimits);

      // Assert - Verify rate limiter configuration
      expect(mockRateLimiter.configure).toHaveBeenCalledWith(expectedLimits);
      
      // Verify each endpoint limit was set
      Object.entries(expectedLimits).forEach(([endpoint, limits]) => {
        expect(mockRateLimiter.setLimits).toHaveBeenCalledWith(endpoint, limits);
      });
    });

    it('should setup authentication middleware with proper validation', async () => {
      // Arrange
      const gateway = new APIGateway(mockLogger);
      const mockAuthMiddleware = {
        validateToken: jest.fn(),
        checkPermissions: jest.fn(),
        logAccess: jest.fn()
      };
      
      mockAuthMiddleware.validateToken.mockResolvedValue({ valid: true, userId: 'user-123' });
      mockAuthMiddleware.checkPermissions.mockResolvedValue({ authorized: true });

      // Act
      await gateway.setupAuthentication(mockAuthMiddleware);

      // Assert - Verify authentication flow
      const mockRequest = { headers: { authorization: 'Bearer token-123' } };
      await gateway.authenticateRequest(mockRequest);

      expect(mockAuthMiddleware.validateToken).toHaveBeenCalledWith('token-123');
      expect(mockAuthMiddleware.checkPermissions).toHaveBeenCalledWith('user-123');
      expect(mockAuthMiddleware.logAccess).toHaveBeenCalledWith({
        userId: 'user-123',
        timestamp: expect.any(String)
      });
    });

    it('should handle CORS configuration for multi-origin access', async () => {
      // Arrange
      const gateway = new APIGateway(mockLogger);
      const mockCorsHandler = {
        configure: jest.fn(),
        handlePreflight: jest.fn(),
        setHeaders: jest.fn()
      };
      
      const corsConfig = {
        origins: ['http://localhost:3000', 'https://app.example.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        headers: ['Content-Type', 'Authorization', 'X-Agent-ID'],
        credentials: true
      };

      // Act
      await gateway.configureCORS(mockCorsHandler, corsConfig);

      // Assert - Verify CORS configuration
      expect(mockCorsHandler.configure).toHaveBeenCalledWith(corsConfig);
      
      // Verify preflight handling
      const mockPreflightRequest = {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:3000' }
      };
      
      await gateway.handleRequest(mockPreflightRequest);
      expect(mockCorsHandler.handlePreflight).toHaveBeenCalledWith(mockPreflightRequest);
    });
  });

  describe('Database Connection Management', () => {
    it('should establish connection pool with retry logic', async () => {
      // Arrange
      const connectionManager = new DatabaseConnectionManager(mockDatabase, mockLogger);
      const poolConfig = {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200
      };

      mockDatabase.connect.mockRejectedValueOnce(new Error('Connection failed'))
                           .mockResolvedValueOnce({ connected: true });

      // Act
      await connectionManager.initializePool(poolConfig);

      // Assert - Verify retry mechanism
      expect(mockDatabase.connect).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Connection failed')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Connection established')
      );
    });

    it('should handle graceful shutdown with connection cleanup', async () => {
      // Arrange
      const connectionManager = new DatabaseConnectionManager(mockDatabase, mockLogger);
      mockDatabase.disconnect.mockResolvedValue({ disconnected: true });

      // Act
      await connectionManager.shutdown();

      // Assert - Verify graceful shutdown
      expect(mockDatabase.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Database connections closed')
      );
    });
  });

  describe('API Endpoint Contracts', () => {
    it('should validate agent execution endpoint contract', async () => {
      // Arrange
      const gateway = new APIGateway(mockLogger);
      const expectedContract = {
        method: 'POST',
        path: '/api/agents/execute',
        input: {
          agentName: 'string',
          task: 'object',
          options: 'object?'
        },
        output: {
          executionId: 'string',
          status: 'string',
          startTime: 'string'
        },
        errors: [400, 401, 429, 500]
      };

      const mockRequest = {
        method: 'POST',
        path: '/api/agents/execute',
        body: {
          agentName: 'coder',
          task: { action: 'write_file', file: 'test.js' }
        }
      };

      // Act
      const response = await gateway.handleAgentExecuteRequest(mockRequest);

      // Assert - Verify contract compliance
      expect(response).toSatisfyContract(expectedContract);
      expect(response.executionId).toMatch(/^[a-zA-Z0-9-]+$/);
      expect(['pending', 'running']).toContain(response.status);
    });
  });
});
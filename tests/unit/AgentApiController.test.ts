/**
 * Unit Tests for AgentApiController - TDD Implementation
 */

import { Request, Response } from 'express';
import { AgentApiController, ApiResponse } from '../../src/api/AgentApiController';
import { AgentDiscoveryService } from '../../src/agents/AgentDiscoveryService';
import { AgentWorkspaceManager } from '../../src/services/AgentWorkspaceManager';
import { AgentDatabase } from '../../src/database/AgentDatabase';
import { AgentDefinition, AgentMetrics, AgentWorkspace } from '../../src/types/AgentTypes';

// Create mocks
const mockDiscoveryService = {
  discoverAgents: jest.fn(),
  getAgent: jest.fn(),
  clearCache: jest.fn(),
  needsRefresh: jest.fn()
} as jest.Mocked<Partial<AgentDiscoveryService>>;

const mockWorkspaceManager = {
  createWorkspace: jest.fn(),
  getWorkspace: jest.fn(),
  listWorkspaces: jest.fn()
} as jest.Mocked<Partial<AgentWorkspaceManager>>;

const mockDatabase = {
  listAgents: jest.fn(),
  getAgent: jest.fn(),
  getAgentBySlug: jest.fn(),
  saveAgent: jest.fn(),
  getMetrics: jest.fn(),
  updateMetrics: jest.fn(),
  getLogs: jest.fn(),
  addLog: jest.fn(),
  getStats: jest.fn()
} as jest.Mocked<Partial<AgentDatabase>>;

describe('AgentApiController', () => {
  let controller: AgentApiController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  const sampleAgent: AgentDefinition = {
    name: 'test-agent',
    description: 'Test agent',
    tools: ['Read', 'Write'],
    model: 'sonnet',
    color: '#blue',
    proactive: true,
    priority: 'P1',
    usage: 'Testing',
    body: '# Test Agent',
    filePath: '/test/test-agent.md',
    lastModified: new Date('2023-01-01'),
    workspaceDirectory: '/workspace/test-agent/'
  };

  const sampleWorkspace: AgentWorkspace = {
    name: 'test-agent',
    directory: '/workspace/test-agent/',
    files: ['README.md'],
    logs: [],
    lastActivity: new Date('2023-01-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnThis();

    mockRequest = {};
    mockResponse = {
      json: mockJson,
      status: mockStatus
    };

    controller = new AgentApiController(
      mockDiscoveryService as AgentDiscoveryService,
      mockWorkspaceManager as AgentWorkspaceManager,
      mockDatabase as AgentDatabase
    );
  });

  describe('listAgents', () => {
    it('should return list of agents with default pagination', async () => {
      // Arrange
      mockRequest.query = {};
      mockDatabase.listAgents!.mockResolvedValue([sampleAgent]);

      // Act
      await controller.listAgents(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.listAgents).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        model: undefined,
        proactive: undefined,
        priority: undefined,
        search: undefined
      });
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: [sampleAgent],
          message: 'Found 1 agents'
        })
      );
    });

    it('should return list with custom pagination and filters', async () => {
      // Arrange
      mockRequest.query = {
        page: '2',
        limit: '10',
        model: 'sonnet',
        proactive: 'true',
        priority: 'P1',
        search: 'test'
      };
      mockDatabase.listAgents!.mockResolvedValue([]);

      // Act
      await controller.listAgents(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.listAgents).toHaveBeenCalledWith({
        limit: 10,
        offset: 10,
        model: 'sonnet',
        proactive: true,
        priority: 'P1',
        search: 'test'
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      // Arrange
      mockRequest.query = { page: '0', limit: '200' };

      // Act
      await controller.listAgents(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid pagination parameters'
        })
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      mockRequest.query = {};
      mockDatabase.listAgents!.mockRejectedValue(new Error('Database error'));

      // Act
      await controller.listAgents(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Failed to list agents'
        })
      );
    });
  });

  describe('getAgent', () => {
    it('should return agent when found', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockDatabase.getAgent!.mockResolvedValue(sampleAgent);

      // Act
      await controller.getAgent(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.getAgent).toHaveBeenCalledWith('test-agent');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: sampleAgent
        })
      );
    });

    it('should return 404 when agent not found', async () => {
      // Arrange
      mockRequest.params = { name: 'non-existent' };
      mockDatabase.getAgent!.mockResolvedValue(null);

      // Act
      await controller.getAgent(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Agent 'non-existent' not found"
        })
      );
    });

    it('should return 400 when name is missing', async () => {
      // Arrange
      mockRequest.params = {};

      // Act
      await controller.getAgent(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Agent name is required'
        })
      );
    });
  });

  describe('getAgentBySlug', () => {
    it('should return agent when found by slug', async () => {
      // Arrange
      mockRequest.params = { slug: 'test-agent' };
      mockDatabase.getAgentBySlug!.mockResolvedValue(sampleAgent);

      // Act
      await controller.getAgentBySlug(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.getAgentBySlug).toHaveBeenCalledWith('test-agent');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: sampleAgent
        })
      );
    });

    it('should return 404 when agent slug not found', async () => {
      // Arrange
      mockRequest.params = { slug: 'non-existent' };
      mockDatabase.getAgentBySlug!.mockResolvedValue(null);

      // Act
      await controller.getAgentBySlug(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('syncAgents', () => {
    it('should sync agents from filesystem to database', async () => {
      // Arrange
      mockRequest = {};
      mockDiscoveryService.clearCache!.mockReturnValue();
      mockDiscoveryService.discoverAgents!.mockResolvedValue([sampleAgent]);
      mockDatabase.saveAgent!.mockResolvedValue();

      // Act
      await controller.syncAgents(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDiscoveryService.clearCache).toHaveBeenCalled();
      expect(mockDiscoveryService.discoverAgents).toHaveBeenCalled();
      expect(mockDatabase.saveAgent).toHaveBeenCalledWith(sampleAgent);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { discovered: 1, saved: 1 },
          message: 'Synced 1 of 1 agents'
        })
      );
    });

    it('should handle partial sync failures', async () => {
      // Arrange
      const agents = [sampleAgent, { ...sampleAgent, name: 'failing-agent' }];
      mockDiscoveryService.clearCache!.mockReturnValue();
      mockDiscoveryService.discoverAgents!.mockResolvedValue(agents);
      mockDatabase.saveAgent!
        .mockResolvedValueOnce() // first agent saves
        .mockRejectedValueOnce(new Error('Save failed')); // second fails

      // Act
      await controller.syncAgents(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { discovered: 2, saved: 1 },
          message: 'Synced 1 of 2 agents'
        })
      );
    });
  });

  describe('getAgentMetrics', () => {
    it('should return metrics when found', async () => {
      // Arrange
      const metrics: AgentMetrics = {
        name: 'test-agent',
        totalInvocations: 10,
        successRate: 0.9,
        averageResponseTime: 1500,
        lastUsed: new Date('2023-01-01'),
        errorCount: 1
      };
      mockRequest.params = { name: 'test-agent' };
      mockDatabase.getMetrics!.mockResolvedValue(metrics);

      // Act
      await controller.getAgentMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.getMetrics).toHaveBeenCalledWith('test-agent');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: metrics
        })
      );
    });

    it('should return 404 when metrics not found', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockDatabase.getMetrics!.mockResolvedValue(null);

      // Act
      await controller.getAgentMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('updateAgentMetrics', () => {
    it('should update metrics successfully', async () => {
      // Arrange
      const metricsUpdate = { totalInvocations: 15, successRate: 0.95 };
      mockRequest.params = { name: 'test-agent' };
      mockRequest.body = metricsUpdate;
      mockDatabase.updateMetrics!.mockResolvedValue();

      // Act
      await controller.updateAgentMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.updateMetrics).toHaveBeenCalledWith('test-agent', metricsUpdate);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { updated: true },
          message: "Metrics updated for agent 'test-agent'"
        })
      );
    });

    it('should return 400 for invalid metrics data', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockRequest.body = null;

      // Act
      await controller.updateAgentMetrics(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid metrics data'
        })
      );
    });
  });

  describe('getAgentWorkspace', () => {
    it('should return workspace when found', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockWorkspaceManager.getWorkspace!.mockResolvedValue(sampleWorkspace);

      // Act
      await controller.getAgentWorkspace(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockWorkspaceManager.getWorkspace).toHaveBeenCalledWith('test-agent');
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: sampleWorkspace
        })
      );
    });

    it('should return 404 when workspace not found', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockWorkspaceManager.getWorkspace!.mockResolvedValue(null);

      // Act
      await controller.getAgentWorkspace(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(404);
    });
  });

  describe('createAgentWorkspace', () => {
    it('should create workspace successfully', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockWorkspaceManager.createWorkspace!.mockResolvedValue(sampleWorkspace);

      // Act
      await controller.createAgentWorkspace(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockWorkspaceManager.createWorkspace).toHaveBeenCalledWith('test-agent');
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: sampleWorkspace,
          message: "Workspace created for agent 'test-agent'"
        })
      );
    });
  });

  describe('getAgentLogs', () => {
    it('should return logs with default limit', async () => {
      // Arrange
      const logs = [
        {
          level: 'info' as const,
          message: 'Test log',
          timestamp: new Date('2023-01-01')
        }
      ];
      mockRequest.params = { name: 'test-agent' };
      mockRequest.query = {};
      mockDatabase.getLogs!.mockResolvedValue(logs);

      // Act
      await controller.getAgentLogs(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.getLogs).toHaveBeenCalledWith('test-agent', 50);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: logs,
          message: 'Retrieved 1 log entries'
        })
      );
    });

    it('should return 400 for invalid limit', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockRequest.query = { limit: '2000' };

      // Act
      await controller.getAgentLogs(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Limit must be between 1 and 1000'
        })
      );
    });
  });

  describe('addAgentLog', () => {
    it('should add log entry successfully', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockRequest.body = {
        level: 'info',
        message: 'Test log message',
        context: { key: 'value' }
      };
      mockDatabase.addLog!.mockResolvedValue();

      // Act
      await controller.addAgentLog(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.addLog).toHaveBeenCalledWith('test-agent', 'info', 'Test log message', { key: 'value' });
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { logged: true },
          message: 'Log entry added successfully'
        })
      );
    });

    it('should return 400 for invalid log level', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockRequest.body = {
        level: 'invalid',
        message: 'Test message'
      };

      // Act
      await controller.addAgentLog(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid log level'
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      mockRequest.params = { name: 'test-agent' };
      mockRequest.body = { level: 'info' }; // missing message

      // Act
      await controller.addAgentLog(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Level and message are required'
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return database statistics', async () => {
      // Arrange
      const stats = {
        totalAgents: 5,
        totalLogs: 100,
        totalWorkspaces: 3,
        databaseSize: '1.2 MB'
      };
      mockDatabase.getStats!.mockReturnValue(stats);

      // Act
      await controller.getStats(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockDatabase.getStats).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: stats
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when all systems operational', async () => {
      // Arrange
      mockDatabase.getStats!.mockReturnValue({} as any);
      mockDiscoveryService.needsRefresh!.mockResolvedValue(false);
      mockWorkspaceManager.listWorkspaces!.mockResolvedValue([]);

      // Act
      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'All systems operational',
          data: expect.objectContaining({
            database: true,
            discovery: true,
            workspace: true
          })
        })
      );
    });

    it('should return unhealthy status when systems have issues', async () => {
      // Arrange
      mockDatabase.getStats!.mockImplementation(() => { throw new Error('DB Error'); });
      mockDiscoveryService.needsRefresh!.mockRejectedValue(new Error('Discovery Error'));
      mockWorkspaceManager.listWorkspaces!.mockResolvedValue([]);

      // Act
      await controller.healthCheck(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockStatus).toHaveBeenCalledWith(503);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Some systems experiencing issues',
          data: expect.objectContaining({
            database: false,
            discovery: false,
            workspace: true
          })
        })
      );
    });
  });
});
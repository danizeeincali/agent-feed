/**
 * API Endpoint Router Unit Tests
 * London School TDD - Testing API routing with extensive mocking
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

// Mock dependencies - London School approach
const mockClaudeInstanceService = {
  createInstance: jest.fn(),
  sendMessage: jest.fn(),
  requestFileOperation: jest.fn(),
  getInstanceStatus: jest.fn(),
  listInstances: jest.fn()
};

const mockWebSocketManager = {
  broadcastToInstance: jest.fn(),
  subscribeToInstance: jest.fn(),
  unsubscribeFromInstance: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockAuthMiddleware = {
  authenticate: jest.fn((req: Request, res: Response, next: NextFunction) => {
    req.user = { id: 'user-123', name: 'Test User' };
    next();
  }),
  authorize: jest.fn((req: Request, res: Response, next: NextFunction) => next())
};

const mockRateLimiter = {
  limit: jest.fn((req: Request, res: Response, next: NextFunction) => next())
};

// Subject under test - API Router
class ClaudeAPIRouter {
  private claudeService: any;
  private websocketManager: any;
  private logger: any;

  constructor(claudeService: any, websocketManager: any, logger: any) {
    this.claudeService = claudeService;
    this.websocketManager = websocketManager;
    this.logger = logger;
  }

  async createClaudeInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info('Creating Claude instance via API');

      const { workspaceDir, config } = req.body;

      if (!workspaceDir) {
        res.status(400).json({
          success: false,
          error: 'workspaceDir is required'
        });
        return;
      }

      // Validate workspace directory is in allowed path
      if (!workspaceDir.startsWith('/workspaces/agent-feed/prod')) {
        res.status(403).json({
          success: false,
          error: 'Workspace directory not allowed'
        });
        return;
      }

      const instance = await this.claudeService.createInstance(workspaceDir, config);

      // Subscribe to WebSocket events for this instance
      this.websocketManager.subscribeToInstance(instance.id, req.user.id);

      this.logger.info(`Claude instance created: ${instance.id}`);

      res.status(201).json({
        success: true,
        data: {
          instanceId: instance.id,
          status: instance.status,
          workspaceDir: instance.workspaceDir
        }
      });
    } catch (error: any) {
      this.logger.error(`Failed to create Claude instance: ${error.message}`);
      next(error);
    }
  }

  async sendMessageToInstance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const { message } = req.body;

      this.logger.debug(`Sending message to instance ${instanceId}`);

      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Message is required and must be a string'
        });
        return;
      }

      // Verify instance belongs to user (simplified for testing)
      const instanceStatus = await this.claudeService.getInstanceStatus(instanceId);
      if (!instanceStatus) {
        res.status(404).json({
          success: false,
          error: 'Claude instance not found'
        });
        return;
      }

      const result = await this.claudeService.sendMessage(instanceId, message);

      // Broadcast to WebSocket subscribers
      this.websocketManager.broadcastToInstance(instanceId, {
        type: 'message_sent',
        data: { messageId: result.messageId, timestamp: new Date() }
      });

      res.status(200).json({
        success: true,
        data: {
          messageId: result.messageId,
          sent: true
        }
      });
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      next(error);
    }
  }

  async requestFileCreation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { instanceId } = req.params;
      const { path, content, overwrite = false } = req.body;

      this.logger.info(`File creation request for instance ${instanceId}: ${path}`);

      if (!path || !content) {
        res.status(400).json({
          success: false,
          error: 'Path and content are required'
        });
        return;
      }

      // Security check - ensure path is within workspace
      if (path.includes('..') || path.startsWith('/')) {
        res.status(403).json({
          success: false,
          error: 'Invalid file path'
        });
        return;
      }

      const result = await this.claudeService.requestFileOperation(instanceId, {
        operation: 'create',
        path,
        content,
        overwrite
      });

      // Broadcast file operation to WebSocket
      this.websocketManager.broadcastToInstance(instanceId, {
        type: 'file_operation',
        data: { operation: 'create', path, success: result.success }
      });

      res.status(result.success ? 201 : 409).json({
        success: result.success,
        data: {
          path: result.path,
          created: result.success,
          requiresPermission: result.requiresPermission
        },
        error: result.error
      });
    } catch (error: any) {
      this.logger.error(`File creation failed: ${error.message}`);
      next(error);
    }
  }

  async listUserInstances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;

      this.logger.debug(`Listing instances for user ${userId}`);

      const instances = await this.claudeService.listInstances(userId);

      res.status(200).json({
        success: true,
        data: {
          instances: instances.map((instance: any) => ({
            id: instance.id,
            status: instance.status,
            workspaceDir: instance.workspaceDir,
            createdAt: instance.createdAt
          })),
          total: instances.length
        }
      });
    } catch (error: any) {
      this.logger.error(`Failed to list instances: ${error.message}`);
      next(error);
    }
  }
}

// Helper function to create mock Express request/response
function createMockRequest(body: any = {}, params: any = {}, user: any = { id: 'user-123', name: 'Test User' }): Request {
  return {
    body,
    params,
    user,
    headers: {},
    query: {}
  } as Request;
}

function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  } as unknown as Response;
  return res;
}

function createMockNext(): NextFunction {
  return jest.fn();
}

describe('ClaudeAPIRouter', () => {
  let router: ClaudeAPIRouter;
  let mockClaudeService: any;
  let mockWebSocket: any;
  let mockLog: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh mocks
    mockClaudeService = {
      createInstance: jest.fn(),
      sendMessage: jest.fn(),
      requestFileOperation: jest.fn(),
      getInstanceStatus: jest.fn(),
      listInstances: jest.fn()
    };

    mockWebSocket = {
      broadcastToInstance: jest.fn(),
      subscribeToInstance: jest.fn(),
      unsubscribeFromInstance: jest.fn()
    };

    mockLog = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    // Create router with mocks
    router = new ClaudeAPIRouter(mockClaudeService, mockWebSocket, mockLog);
  });

  describe('createClaudeInstance endpoint', () => {
    it('should create Claude instance with correct workspace directory', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';
      const config = { maxMemoryMB: 512, timeoutMs: 30000 };
      const req = createMockRequest({ workspaceDir, config });
      const res = createMockResponse();
      const next = createMockNext();

      const mockInstance = {
        id: 'claude-123',
        status: 'running',
        workspaceDir
      };

      mockClaudeService.createInstance.mockResolvedValue(mockInstance);

      // Act
      await router.createClaudeInstance(req, res, next);

      // Assert - London School behavior verification
      expect(mockClaudeService.createInstance).toHaveBeenCalledWith(workspaceDir, config);
      expect(mockWebSocket.subscribeToInstance).toHaveBeenCalledWith('claude-123', 'user-123');
      expect(mockLog.info).toHaveBeenCalledWith('Creating Claude instance via API');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          instanceId: 'claude-123',
          status: 'running',
          workspaceDir
        }
      });
    });

    it('should reject invalid workspace directories', async () => {
      // Arrange
      const invalidWorkspaceDir = '/etc/passwd';
      const req = createMockRequest({ workspaceDir: invalidWorkspaceDir });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await router.createClaudeInstance(req, res, next);

      // Assert - Security behavior verification
      expect(mockClaudeService.createInstance).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Workspace directory not allowed'
      });
    });

    it('should handle missing workspace directory', async () => {
      // Arrange
      const req = createMockRequest({}); // No workspaceDir
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await router.createClaudeInstance(req, res, next);

      // Assert
      expect(mockClaudeService.createInstance).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'workspaceDir is required'
      });
    });

    it('should handle Claude service failures', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';
      const req = createMockRequest({ workspaceDir });
      const res = createMockResponse();
      const next = createMockNext();

      mockClaudeService.createInstance.mockRejectedValue(new Error('Service unavailable'));

      // Act
      await router.createClaudeInstance(req, res, next);

      // Assert - Error handling behavior
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create Claude instance: Service unavailable')
      );
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('sendMessageToInstance endpoint', () => {
    const instanceId = 'claude-123';

    it('should send message to Claude instance and broadcast via WebSocket', async () => {
      // Arrange
      const message = 'Create test.md with "hello world"';
      const req = createMockRequest({ message }, { instanceId });
      const res = createMockResponse();
      const next = createMockNext();

      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });
      mockClaudeService.sendMessage.mockResolvedValue({
        messageId: 'msg-456',
        success: true
      });

      // Act
      await router.sendMessageToInstance(req, res, next);

      // Assert - Interaction verification
      expect(mockClaudeService.getInstanceStatus).toHaveBeenCalledWith(instanceId);
      expect(mockClaudeService.sendMessage).toHaveBeenCalledWith(instanceId, message);
      expect(mockWebSocket.broadcastToInstance).toHaveBeenCalledWith(instanceId, {
        type: 'message_sent',
        data: { messageId: 'msg-456', timestamp: expect.any(Date) }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { messageId: 'msg-456', sent: true }
      });
    });

    it('should reject invalid message types', async () => {
      // Arrange
      const req = createMockRequest({ message: 123 }, { instanceId }); // Non-string message
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await router.sendMessageToInstance(req, res, next);

      // Assert
      expect(mockClaudeService.sendMessage).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message is required and must be a string'
      });
    });

    it('should handle non-existent instances', async () => {
      // Arrange
      const req = createMockRequest({ message: 'test' }, { instanceId });
      const res = createMockResponse();
      const next = createMockNext();

      mockClaudeService.getInstanceStatus.mockResolvedValue(null);

      // Act
      await router.sendMessageToInstance(req, res, next);

      // Assert
      expect(mockClaudeService.sendMessage).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Claude instance not found'
      });
    });
  });

  describe('requestFileCreation endpoint', () => {
    const instanceId = 'claude-123';

    it('should request file creation and broadcast operation', async () => {
      // Arrange
      const path = 'test.md';
      const content = 'hello world';
      const req = createMockRequest({ path, content }, { instanceId });
      const res = createMockResponse();
      const next = createMockNext();

      mockClaudeService.requestFileOperation.mockResolvedValue({
        success: true,
        path,
        requiresPermission: false
      });

      // Act
      await router.requestFileCreation(req, res, next);

      // Assert - File operation interaction verification
      expect(mockClaudeService.requestFileOperation).toHaveBeenCalledWith(instanceId, {
        operation: 'create',
        path,
        content,
        overwrite: false
      });
      expect(mockWebSocket.broadcastToInstance).toHaveBeenCalledWith(instanceId, {
        type: 'file_operation',
        data: { operation: 'create', path, success: true }
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject dangerous file paths', async () => {
      // Arrange
      const dangerousPath = '../../../etc/passwd';
      const req = createMockRequest({ path: dangerousPath, content: 'malicious' }, { instanceId });
      const res = createMockResponse();
      const next = createMockNext();

      // Act
      await router.requestFileCreation(req, res, next);

      // Assert - Security behavior verification
      expect(mockClaudeService.requestFileOperation).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid file path'
      });
    });

    it('should handle file creation failures', async () => {
      // Arrange
      const path = 'test.md';
      const content = 'hello world';
      const req = createMockRequest({ path, content }, { instanceId });
      const res = createMockResponse();
      const next = createMockNext();

      mockClaudeService.requestFileOperation.mockResolvedValue({
        success: false,
        path,
        error: 'File already exists',
        requiresPermission: true
      });

      // Act
      await router.requestFileCreation(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        data: { path, created: false, requiresPermission: true },
        error: 'File already exists'
      });
    });
  });

  describe('listUserInstances endpoint', () => {
    it('should list user instances with proper formatting', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const mockInstances = [
        {
          id: 'claude-123',
          status: 'running',
          workspaceDir: '/workspaces/agent-feed/prod',
          createdAt: new Date('2023-01-01'),
          pid: 1234
        },
        {
          id: 'claude-456',
          status: 'idle',
          workspaceDir: '/workspaces/agent-feed/prod/test',
          createdAt: new Date('2023-01-02'),
          pid: 5678
        }
      ];

      mockClaudeService.listInstances.mockResolvedValue(mockInstances);

      // Act
      await router.listUserInstances(req, res, next);

      // Assert - Data formatting verification
      expect(mockClaudeService.listInstances).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          instances: [
            {
              id: 'claude-123',
              status: 'running',
              workspaceDir: '/workspaces/agent-feed/prod',
              createdAt: new Date('2023-01-01')
            },
            {
              id: 'claude-456',
              status: 'idle',
              workspaceDir: '/workspaces/agent-feed/prod/test',
              createdAt: new Date('2023-01-02')
            }
          ],
          total: 2
        }
      });
    });
  });

  describe('London School Integration Tests', () => {
    it('should coordinate all collaborators in correct sequence', async () => {
      // Arrange - Full workflow test
      const workspaceDir = '/workspaces/agent-feed/prod';
      const message = 'Create test.md with "hello world"';
      const filePath = 'test.md';
      const fileContent = 'hello world';

      // Mock responses
      mockClaudeService.createInstance.mockResolvedValue({
        id: 'claude-123',
        status: 'running',
        workspaceDir
      });

      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });
      mockClaudeService.sendMessage.mockResolvedValue({ messageId: 'msg-456', success: true });
      mockClaudeService.requestFileOperation.mockResolvedValue({
        success: true,
        path: filePath,
        requiresPermission: false
      });

      // Act - Execute full workflow
      const createReq = createMockRequest({ workspaceDir });
      const createRes = createMockResponse();
      const createNext = createMockNext();
      await router.createClaudeInstance(createReq, createRes, createNext);

      const messageReq = createMockRequest({ message }, { instanceId: 'claude-123' });
      const messageRes = createMockResponse();
      const messageNext = createMockNext();
      await router.sendMessageToInstance(messageReq, messageRes, messageNext);

      const fileReq = createMockRequest({ path: filePath, content: fileContent }, { instanceId: 'claude-123' });
      const fileRes = createMockResponse();
      const fileNext = createMockNext();
      await router.requestFileCreation(fileReq, fileRes, fileNext);

      // Assert - Verify complete collaboration sequence
      expect(mockClaudeService.createInstance).toHaveBeenCalledBefore(mockClaudeService.sendMessage as jest.Mock);
      expect(mockClaudeService.sendMessage).toHaveBeenCalledBefore(mockClaudeService.requestFileOperation as jest.Mock);

      // Verify WebSocket interactions
      expect(mockWebSocket.subscribeToInstance).toHaveBeenCalledWith('claude-123', 'user-123');
      expect(mockWebSocket.broadcastToInstance).toHaveBeenCalledTimes(2); // Message and file operation

      // Verify logging interactions
      expect(mockLog.info).toHaveBeenCalledWith('Creating Claude instance via API');
      expect(mockLog.debug).toHaveBeenCalledWith('Sending message to instance claude-123');
      expect(mockLog.info).toHaveBeenCalledWith('File creation request for instance claude-123: test.md');
    });

    it('should maintain consistent error handling across all endpoints', async () => {
      // Test error handling consistency - all endpoints should log errors and call next()
      const error = new Error('Service error');

      mockClaudeService.createInstance.mockRejectedValue(error);
      mockClaudeService.sendMessage.mockRejectedValue(error);
      mockClaudeService.requestFileOperation.mockRejectedValue(error);

      const req = createMockRequest({ workspaceDir: '/workspaces/agent-feed/prod' });
      const res = createMockResponse();
      const next = createMockNext();

      // Test all endpoints handle errors consistently
      await router.createClaudeInstance(req, res, next);
      await router.sendMessageToInstance(createMockRequest({ message: 'test' }, { instanceId: 'test' }), res, next);
      await router.requestFileCreation(createMockRequest({ path: 'test', content: 'test' }, { instanceId: 'test' }), res, next);

      // Assert consistent error handling
      expect(mockLog.error).toHaveBeenCalledTimes(3);
      expect(next).toHaveBeenCalledTimes(3);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
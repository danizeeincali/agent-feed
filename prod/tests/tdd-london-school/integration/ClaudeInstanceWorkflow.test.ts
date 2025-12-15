/**
 * Claude Instance Workflow Integration Tests
 * London School TDD - End-to-end workflow testing with behavior verification
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { ClaudeProcessManagerMock } from '../mocks/ClaudeProcessManagerMock';
import { WebSocketMock } from '../mocks/WebSocketMock';

// Integration test doubles - closer to real implementations but still testable
class IntegrationTestClaudeService {
  constructor(private processManager: any, private logger: any) {}

  async createInstance(workspaceDir: string, config?: any): Promise<any> {
    this.logger.info('Creating Claude instance via service');
    return await this.processManager.createInstance(workspaceDir, config);
  }

  async sendMessage(instanceId: string, message: string): Promise<any> {
    this.logger.info('Sending message via service');
    return await this.processManager.sendInput(instanceId, message);
  }

  async requestFileOperation(instanceId: string, operation: any): Promise<any> {
    this.logger.info('Requesting file operation via service');
    return await this.processManager.requestFileCreation(instanceId, operation);
  }

  async cleanup(instanceId: string): Promise<void> {
    this.logger.info('Cleaning up instance via service');
    await this.processManager.destroyInstance(instanceId);
  }
}

class IntegrationTestWebSocketManager {
  private connections: Map<string, WebSocketMock> = new Map();
  private subscribers: Map<string, Set<string>> = new Map();

  constructor(private logger: any) {}

  handleConnection(ws: WebSocketMock, userId: string): string {
    const connectionId = `conn-${Date.now()}-${userId}`;
    this.connections.set(connectionId, ws);
    this.logger.info(`WebSocket connected: ${connectionId}`);

    ws.on('message', (data: any) => {
      this.handleMessage(connectionId, userId, data);
    });

    return connectionId;
  }

  subscribeToInstance(userId: string, instanceId: string): void {
    if (!this.subscribers.has(instanceId)) {
      this.subscribers.set(instanceId, new Set());
    }
    this.subscribers.get(instanceId)!.add(userId);
    this.logger.info(`User ${userId} subscribed to instance ${instanceId}`);
  }

  broadcast(instanceId: string, message: any): void {
    const subscribers = this.subscribers.get(instanceId);
    if (!subscribers) return;

    this.connections.forEach((ws, connId) => {
      if (ws.readyState === WebSocketMock.OPEN) {
        ws.send(JSON.stringify({
          type: 'instance_event',
          instanceId,
          data: message
        }));
      }
    });
  }

  private handleMessage(connectionId: string, userId: string, data: any): void {
    const message = JSON.parse(data);
    if (message.type === 'subscribe' && message.instanceId) {
      this.subscribeToInstance(userId, message.instanceId);
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getSubscriberCount(instanceId: string): number {
    return this.subscribers.get(instanceId)?.size || 0;
  }

  cleanup(): void {
    this.connections.clear();
    this.subscribers.clear();
  }
}

describe('Claude Instance Workflow Integration Tests', () => {
  let mockProcessManager: ClaudeProcessManagerMock;
  let claudeService: IntegrationTestClaudeService;
  let wsManager: IntegrationTestWebSocketManager;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProcessManager = new ClaudeProcessManagerMock();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    claudeService = new IntegrationTestClaudeService(mockProcessManager, mockLogger);
    wsManager = new IntegrationTestWebSocketManager(mockLogger);
  });

  afterEach(() => {
    wsManager.cleanup();
    mockProcessManager.reset();
  });

  describe('Complete User Workflow - Create Instance and Send Message', () => {
    it('should handle full user workflow from instance creation to message response', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';
      const userId = 'user-123';
      const message = 'Create a test file with hello world content';

      // Setup WebSocket connection
      const ws = new WebSocketMock('ws://localhost:3000');
      const connectionId = wsManager.handleConnection(ws, userId);

      // Act - Step 1: Create Claude instance
      const instance = await claudeService.createInstance(workspaceDir, {
        maxMemoryMB: 512,
        timeoutMs: 30000
      });

      // Step 2: Subscribe to instance events
      wsManager.subscribeToInstance(userId, instance.id);

      // Step 3: Send message
      const messageResponse = await claudeService.sendMessage(instance.id, message);

      // Step 4: Simulate Claude output processing
      const outputChunks = [
        { type: 'stdout', content: 'Processing request...', timestamp: new Date() },
        { type: 'tool_use', content: 'Creating file: test.txt', timestamp: new Date() },
        { type: 'completion', content: 'File created successfully', timestamp: new Date() }
      ];

      // Simulate streaming output
      for (const chunk of outputChunks) {
        wsManager.broadcast(instance.id, chunk);
      }

      // Assert - Verify complete workflow behavior
      // Instance creation verification
      expect(mockProcessManager.createInstance).toHaveBeenCalledWith(workspaceDir, {
        maxMemoryMB: 512,
        timeoutMs: 30000
      });
      expect(instance.id).toBeDefined();
      expect(instance.status).toBe('running');

      // Message sending verification
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(instance.id, message);
      expect(messageResponse.success).toBe(true);
      expect(messageResponse.messageId).toBeDefined();

      // WebSocket interaction verification
      expect(wsManager.getConnectionCount()).toBe(1);
      expect(wsManager.getSubscriberCount(instance.id)).toBe(1);

      // Verify WebSocket received all broadcasts
      ws.verifyMessageSentCount(3); // One for each output chunk

      // Logging behavior verification
      expect(mockLogger.info).toHaveBeenCalledWith('Creating Claude instance via service');
      expect(mockLogger.info).toHaveBeenCalledWith('Sending message via service');
      expect(mockLogger.info).toHaveBeenCalledWith(`User ${userId} subscribed to instance ${instance.id}`);
    });

    it('should handle instance creation failure gracefully', async () => {
      // Arrange
      const workspaceDir = '/invalid/workspace';
      mockProcessManager.createInstance.mockRejectedValue(new Error('Invalid workspace directory'));

      // Act & Assert
      await expect(claudeService.createInstance(workspaceDir))
        .rejects.toThrow('Invalid workspace directory');

      expect(mockLogger.info).toHaveBeenCalledWith('Creating Claude instance via service');
    });
  });

  describe('File Creation Workflow', () => {
    let instanceId: string;

    beforeEach(async () => {
      // Setup instance for file operations
      const instance = await claudeService.createInstance('/workspaces/agent-feed/prod');
      instanceId = instance.id;
    });

    it('should handle complete file creation workflow', async () => {
      // Arrange
      const userId = 'user-456';
      const fileName = 'test.md';
      const fileContent = 'Hello World\n\nThis is a test file.';

      // Setup WebSocket for file operation events
      const ws = new WebSocketMock('ws://localhost:3000');
      wsManager.handleConnection(ws, userId);
      wsManager.subscribeToInstance(userId, instanceId);

      // Act - Step 1: Send file creation message
      const messageResponse = await claudeService.sendMessage(
        instanceId,
        `Create a file named ${fileName} with the following content: ${fileContent}`
      );

      // Step 2: Process file creation request
      const fileOpResponse = await claudeService.requestFileOperation(instanceId, {
        path: fileName,
        content: fileContent,
        operation: 'create'
      });

      // Step 3: Broadcast file operation result
      wsManager.broadcast(instanceId, {
        type: 'file_operation',
        operation: 'create',
        path: fileName,
        success: fileOpResponse.success
      });

      // Assert - Complete file workflow verification
      expect(messageResponse.success).toBe(true);
      expect(fileOpResponse.success).toBe(true);

      // Verify process manager interactions
      expect(mockProcessManager.sendInput).toHaveBeenCalledWith(
        instanceId,
        expect.stringContaining(fileName)
      );
      expect(mockProcessManager.requestFileCreation).toHaveBeenCalledWith(instanceId, {
        path: fileName,
        content: fileContent,
        operation: 'create'
      });

      // Verify WebSocket broadcast
      ws.verifyMessageSent({
        type: 'instance_event',
        instanceId,
        data: {
          type: 'file_operation',
          operation: 'create',
          path: fileName,
          success: true
        }
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Requesting file operation via service');
    });

    it('should handle file creation permission requirements', async () => {
      // Arrange
      const fileName = 'restricted-file.txt';
      const fileContent = 'restricted content';

      // Mock permission requirement
      mockProcessManager.requestFileCreation.mockResolvedValue({
        success: false,
        path: fileName,
        requiresPermission: true,
        error: 'Permission required for this operation'
      });

      // Act
      const fileOpResponse = await claudeService.requestFileOperation(instanceId, {
        path: fileName,
        content: fileContent,
        operation: 'create'
      });

      // Assert - Permission handling verification
      expect(fileOpResponse.success).toBe(false);
      expect(fileOpResponse.requiresPermission).toBe(true);
      expect(fileOpResponse.error).toBe('Permission required for this operation');
    });
  });

  describe('Multi-User Concurrent Workflow', () => {
    it('should handle multiple users working with different instances', async () => {
      // Arrange
      const users = [
        { id: 'user-1', workspace: '/workspaces/agent-feed/prod/user1' },
        { id: 'user-2', workspace: '/workspaces/agent-feed/prod/user2' },
        { id: 'user-3', workspace: '/workspaces/agent-feed/prod/user3' }
      ];

      const instances: any[] = [];
      const webSockets: WebSocketMock[] = [];

      // Act - Step 1: Create instances and connections for all users
      for (const user of users) {
        const instance = await claudeService.createInstance(user.workspace);
        instances.push(instance);

        const ws = new WebSocketMock(`ws://localhost:3000/${user.id}`);
        webSockets.push(ws);
        wsManager.handleConnection(ws, user.id);
        wsManager.subscribeToInstance(user.id, instance.id);
      }

      // Step 2: Send messages from all users concurrently
      const messagePromises = instances.map((instance, index) => {
        return claudeService.sendMessage(instance.id, `Message from ${users[index].id}`);
      });

      const responses = await Promise.all(messagePromises);

      // Step 3: Broadcast responses to each instance
      instances.forEach((instance, index) => {
        wsManager.broadcast(instance.id, {
          type: 'message_response',
          userId: users[index].id,
          content: `Response for ${users[index].id}`
        });
      });

      // Assert - Multi-user workflow verification
      expect(instances).toHaveLength(3);
      expect(webSockets).toHaveLength(3);

      // Verify all instances were created
      expect(mockProcessManager.createInstance).toHaveBeenCalledTimes(3);

      // Verify all messages were sent
      expect(mockProcessManager.sendInput).toHaveBeenCalledTimes(3);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });

      // Verify WebSocket subscriptions
      instances.forEach((instance, index) => {
        expect(wsManager.getSubscriberCount(instance.id)).toBe(1);
      });

      // Verify each WebSocket received its broadcast
      webSockets.forEach(ws => {
        ws.verifyMessageSentCount(1);
      });
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle instance crash and recovery', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';
      const userId = 'user-recovery';

      // Step 1: Create instance and establish connection
      const instance = await claudeService.createInstance(workspaceDir);
      const ws = new WebSocketMock('ws://localhost:3000');
      wsManager.handleConnection(ws, userId);
      wsManager.subscribeToInstance(userId, instance.id);

      // Act - Step 2: Simulate instance crash
      mockProcessManager.simulateInstanceError(instance.id, 'Instance crashed unexpectedly');

      // Step 3: Attempt to send message (should fail)
      mockProcessManager.sendInput.mockRejectedValueOnce(new Error('Instance not responding'));

      await expect(claudeService.sendMessage(instance.id, 'test message'))
        .rejects.toThrow('Instance not responding');

      // Step 4: Recreate instance (recovery)
      const recoveredInstance = await claudeService.createInstance(workspaceDir);

      // Step 5: Reestablish subscription and send message
      wsManager.subscribeToInstance(userId, recoveredInstance.id);
      const recoveryMessage = await claudeService.sendMessage(recoveredInstance.id, 'recovery test');

      // Assert - Recovery workflow verification
      expect(recoveredInstance.id).toBeDefined();
      expect(recoveredInstance.id).not.toBe(instance.id); // New instance created
      expect(recoveryMessage.success).toBe(true);

      // Verify cleanup and recreation
      expect(mockProcessManager.createInstance).toHaveBeenCalledTimes(2);
      expect(wsManager.getSubscriberCount(recoveredInstance.id)).toBe(1);
    });
  });

  describe('Cleanup Workflow', () => {
    it('should properly cleanup instances and connections', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';
      const userId = 'user-cleanup';

      const instance = await claudeService.createInstance(workspaceDir);
      const ws = new WebSocketMock('ws://localhost:3000');
      wsManager.handleConnection(ws, userId);
      wsManager.subscribeToInstance(userId, instance.id);

      // Verify setup
      expect(wsManager.getConnectionCount()).toBe(1);
      expect(wsManager.getSubscriberCount(instance.id)).toBe(1);

      // Act - Cleanup
      await claudeService.cleanup(instance.id);
      ws.simulateConnectionClose();
      wsManager.cleanup();

      // Assert - Cleanup verification
      expect(mockProcessManager.destroyInstance).toHaveBeenCalledWith(instance.id);
      expect(wsManager.getConnectionCount()).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Cleaning up instance via service');
    });
  });

  describe('London School Integration Verification', () => {
    it('should demonstrate complete system collaboration', async () => {
      // Arrange - Full system integration test
      const workspaceDir = '/workspaces/agent-feed/prod';
      const userId = 'integration-user';
      const message = 'Create test.md with "hello world"';

      // Act - Execute complete workflow
      // 1. Instance creation
      const instance = await claudeService.createInstance(workspaceDir);

      // 2. WebSocket connection
      const ws = new WebSocketMock('ws://localhost:3000');
      const connId = wsManager.handleConnection(ws, userId);
      wsManager.subscribeToInstance(userId, instance.id);

      // 3. Message sending
      const msgResponse = await claudeService.sendMessage(instance.id, message);

      // 4. File operation
      const fileResponse = await claudeService.requestFileOperation(instance.id, {
        path: 'test.md',
        content: 'hello world',
        operation: 'create'
      });

      // 5. Event broadcasting
      wsManager.broadcast(instance.id, {
        type: 'workflow_complete',
        success: true,
        operations: ['instance_created', 'message_sent', 'file_created']
      });

      // 6. Cleanup
      await claudeService.cleanup(instance.id);

      // Assert - Complete system collaboration verification
      // Verify interaction sequence
      expect(mockProcessManager.createInstance).toHaveBeenCalledBefore(mockProcessManager.sendInput as jest.Mock);
      expect(mockProcessManager.sendInput).toHaveBeenCalledBefore(mockProcessManager.requestFileCreation as jest.Mock);
      expect(mockProcessManager.requestFileCreation).toHaveBeenCalledBefore(mockProcessManager.destroyInstance as jest.Mock);

      // Verify all operations succeeded
      expect(instance.status).toBe('running');
      expect(msgResponse.success).toBe(true);
      expect(fileResponse.success).toBe(true);

      // Verify WebSocket coordination
      expect(wsManager.getConnectionCount()).toBe(1);
      ws.verifyMessageSent({
        type: 'instance_event',
        instanceId: instance.id,
        data: {
          type: 'workflow_complete',
          success: true,
          operations: ['instance_created', 'message_sent', 'file_created']
        }
      });

      // Verify logging coordination
      expect(mockLogger.info).toHaveBeenCalledWith('Creating Claude instance via service');
      expect(mockLogger.info).toHaveBeenCalledWith('Sending message via service');
      expect(mockLogger.info).toHaveBeenCalledWith('Requesting file operation via service');
      expect(mockLogger.info).toHaveBeenCalledWith('Cleaning up instance via service');

      // Verify cleanup coordination
      expect(mockProcessManager.destroyInstance).toHaveBeenCalledWith(instance.id);
    });
  });
});
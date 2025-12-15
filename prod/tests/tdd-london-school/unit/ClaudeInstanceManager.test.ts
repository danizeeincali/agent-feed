/**
 * Claude Instance Manager Unit Tests
 * London School TDD - Behavior verification with extensive mocking
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { ClaudeProcessManagerMock, ClaudeProcessManagerMockFactory } from '../mocks/ClaudeProcessManagerMock';
import { WebSocketMock, WebSocketMockFactory } from '../mocks/WebSocketMock';
import { ClaudeInstanceConfig, InstanceStatus } from '../contracts/ClaudeProcessManagerContract';

// Mock the actual implementation modules that would exist
const mockEventEmitter = {
  on: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

// Subject under test - would be the actual Claude Instance Manager
class ClaudeInstanceManager {
  private processManager: any;
  private eventEmitter: any;
  private logger: any;
  private instances: Map<string, any> = new Map();

  constructor(processManager: any, eventEmitter: any, logger: any) {
    this.processManager = processManager;
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createInstance(workspaceDir: string, config?: ClaudeInstanceConfig): Promise<{ id: string; status: string }> {
    this.logger.info(`Creating Claude instance for workspace: ${workspaceDir}`);

    try {
      // Call process manager to create instance
      const instance = await this.processManager.createInstance(workspaceDir, config);

      // Subscribe to instance events
      this.processManager.subscribeToEvents(instance.id, (event: any) => {
        this.handleInstanceEvent(instance.id, event);
      });

      // Store instance reference
      this.instances.set(instance.id, instance);

      this.logger.info(`Successfully created Claude instance: ${instance.id}`);
      this.eventEmitter.emit('instanceCreated', { instanceId: instance.id });

      return { id: instance.id, status: 'running' };
    } catch (error: any) {
      this.logger.error(`Failed to create Claude instance: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(instanceId: string, message: string): Promise<{ success: boolean; messageId: string }> {
    this.logger.debug(`Sending message to instance ${instanceId}: ${message}`);

    if (!this.instances.has(instanceId)) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    try {
      const response = await this.processManager.sendInput(instanceId, message);

      this.logger.debug(`Message sent successfully: ${response.messageId}`);
      this.eventEmitter.emit('messageSent', { instanceId, messageId: response.messageId });

      return { success: response.success, messageId: response.messageId };
    } catch (error: any) {
      this.logger.error(`Failed to send message: ${error.message}`);
      throw error;
    }
  }

  async requestFileCreation(instanceId: string, path: string, content: string): Promise<{ success: boolean; requiresPermission: boolean }> {
    this.logger.info(`Requesting file creation: ${path} for instance ${instanceId}`);

    try {
      const response = await this.processManager.requestFileCreation(instanceId, {
        path,
        content,
        overwrite: false
      });

      if (response.requiresPermission) {
        this.logger.warn(`File creation requires permission: ${path}`);
        this.eventEmitter.emit('permissionRequired', { instanceId, path });
      }

      return {
        success: response.success,
        requiresPermission: response.requiresPermission || false
      };
    } catch (error: any) {
      this.logger.error(`File creation failed: ${error.message}`);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    this.logger.info('Starting cleanup of all Claude instances');

    const cleanupPromises = Array.from(this.instances.keys()).map(async (instanceId) => {
      try {
        await this.processManager.destroyInstance(instanceId);
        this.processManager.unsubscribeFromEvents(instanceId);
        this.logger.debug(`Cleaned up instance: ${instanceId}`);
      } catch (error: any) {
        this.logger.error(`Failed to cleanup instance ${instanceId}: ${error.message}`);
      }
    });

    await Promise.all(cleanupPromises);
    this.instances.clear();
    this.eventEmitter.removeAllListeners();

    this.logger.info('Cleanup completed');
  }

  private handleInstanceEvent(instanceId: string, event: any): void {
    this.logger.debug(`Instance event received: ${event.type} for ${instanceId}`);
    this.eventEmitter.emit('instanceEvent', { instanceId, event });
  }
}

describe('ClaudeInstanceManager', () => {
  let manager: ClaudeInstanceManager;
  let processManagerMock: ClaudeProcessManagerMock;
  let eventEmitterMock: any;
  let loggerMock: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create fresh mocks
    processManagerMock = ClaudeProcessManagerMockFactory.createHappyPathMock();
    eventEmitterMock = { ...mockEventEmitter };
    loggerMock = { ...mockLogger };

    // Create manager with mocks
    manager = new ClaudeInstanceManager(processManagerMock, eventEmitterMock, loggerMock);
  });

  afterEach(() => {
    processManagerMock.reset();
  });

  describe('Instance Creation', () => {
    it('should create Claude instance in correct workspace directory', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';
      const config: ClaudeInstanceConfig = {
        workspaceDir,
        maxMemoryMB: 512,
        timeoutMs: 30000,
        environment: 'development'
      };

      // Act
      const result = await manager.createInstance(workspaceDir, config);

      // Assert - London School behavior verification
      processManagerMock.verifyCreateInstanceCalledWith(workspaceDir, config);
      expect(loggerMock.info).toHaveBeenCalledWith(
        expect.stringContaining('Creating Claude instance for workspace')
      );
      expect(eventEmitterMock.emit).toHaveBeenCalledWith('instanceCreated',
        expect.objectContaining({ instanceId: expect.any(String) })
      );
      expect(result.status).toBe('running');
    });

    it('should subscribe to instance events after creation', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';

      // Act
      await manager.createInstance(workspaceDir);

      // Assert - Verify event subscription behavior
      processManagerMock.verifyEventSubscriptionForInstance(expect.any(String));
    });

    it('should handle instance creation failure gracefully', async () => {
      // Arrange - Use failing mock
      const failingMock = ClaudeProcessManagerMockFactory.createFailingInstanceCreationMock();
      const failingManager = new ClaudeInstanceManager(failingMock, eventEmitterMock, loggerMock);

      // Act & Assert
      await expect(failingManager.createInstance('/invalid/path')).rejects.toThrow('Failed to create Claude instance');

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create Claude instance')
      );
    });
  });

  describe('Message Handling', () => {
    let instanceId: string;

    beforeEach(async () => {
      // Setup: Create an instance first
      const result = await manager.createInstance('/workspaces/agent-feed/prod');
      instanceId = result.id;

      // Reset mocks to focus on message handling
      jest.clearAllMocks();
      processManagerMock.reset();
    });

    it('should send message to correct Claude instance', async () => {
      // Arrange
      const message = 'Create a test file with "hello world"';

      // Act
      const result = await manager.sendMessage(instanceId, message);

      // Assert - London School interaction verification
      processManagerMock.verifyMessageSentToInstance(instanceId, message);
      expect(loggerMock.debug).toHaveBeenCalledWith(
        expect.stringContaining('Sending message to instance')
      );
      expect(eventEmitterMock.emit).toHaveBeenCalledWith('messageSent',
        expect.objectContaining({ instanceId, messageId: expect.any(String) })
      );
      expect(result.success).toBe(true);
    });

    it('should fail when sending message to non-existent instance', async () => {
      // Arrange
      const nonExistentId = 'non-existent-instance';
      const message = 'test message';

      // Act & Assert
      await expect(manager.sendMessage(nonExistentId, message)).rejects.toThrow(
        `Instance ${nonExistentId} not found`
      );

      // Verify no interaction with process manager
      expect(processManagerMock.sendInput).not.toHaveBeenCalled();
    });

    it('should handle message sending failures', async () => {
      // Arrange - Mock process manager to fail
      processManagerMock.sendInput.mockRejectedValue(new Error('Network error'));
      const message = 'test message';

      // Act & Assert
      await expect(manager.sendMessage(instanceId, message)).rejects.toThrow('Network error');

      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send message')
      );
    });
  });

  describe('File Operations', () => {
    let instanceId: string;

    beforeEach(async () => {
      // Setup: Create an instance
      const result = await manager.createInstance('/workspaces/agent-feed/prod');
      instanceId = result.id;
      jest.clearAllMocks();
      processManagerMock.reset();
    });

    it('should request file creation with correct parameters', async () => {
      // Arrange
      const filePath = '/workspaces/agent-feed/prod/test.md';
      const content = 'hello world';

      // Act
      const result = await manager.requestFileCreation(instanceId, filePath, content);

      // Assert - Behavior verification
      processManagerMock.verifyFileCreationRequested(instanceId, {
        path: filePath,
        content,
        overwrite: false
      });
      expect(result.success).toBe(true);
      expect(result.requiresPermission).toBe(false);
    });

    it('should handle permission required scenarios', async () => {
      // Arrange - Mock to require permission
      const permissionMock = ClaudeProcessManagerMockFactory.createPermissionDeniedMock();
      const permissionManager = new ClaudeInstanceManager(permissionMock, eventEmitterMock, loggerMock);

      // Create instance first
      await permissionManager.createInstance('/workspaces/agent-feed/prod');

      const filePath = '/restricted/file.txt';
      const content = 'restricted content';

      // Act
      const result = await permissionManager.requestFileCreation(instanceId, filePath, content);

      // Assert
      expect(result.requiresPermission).toBe(true);
      expect(eventEmitterMock.emit).toHaveBeenCalledWith('permissionRequired',
        expect.objectContaining({ instanceId, path: filePath })
      );
      expect(loggerMock.warn).toHaveBeenCalledWith(
        expect.stringContaining('File creation requires permission')
      );
    });
  });

  describe('Cleanup Operations', () => {
    let instanceIds: string[];

    beforeEach(async () => {
      // Create multiple instances
      instanceIds = [];
      for (let i = 0; i < 3; i++) {
        const result = await manager.createInstance(`/workspaces/test-${i}`);
        instanceIds.push(result.id);
      }

      jest.clearAllMocks();
      processManagerMock.reset();
    });

    it('should cleanup all instances and unsubscribe from events', async () => {
      // Act
      await manager.cleanup();

      // Assert - Verify cleanup behavior for each instance
      instanceIds.forEach(instanceId => {
        processManagerMock.verifyInstanceDestroyed(instanceId);
        expect(processManagerMock.unsubscribeFromEvents).toHaveBeenCalledWith(instanceId);
      });

      expect(eventEmitterMock.removeAllListeners).toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalledWith('Cleanup completed');
    });

    it('should continue cleanup even if individual instance cleanup fails', async () => {
      // Arrange - Make one instance fail to destroy
      processManagerMock.destroyInstance.mockImplementationOnce(() => {
        throw new Error('Cleanup failed');
      });

      // Act
      await manager.cleanup();

      // Assert - Should still attempt to cleanup all instances
      expect(processManagerMock.destroyInstance).toHaveBeenCalledTimes(3);
      expect(loggerMock.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup instance')
      );
      expect(loggerMock.info).toHaveBeenCalledWith('Cleanup completed');
    });
  });

  describe('Event Handling', () => {
    let instanceId: string;

    beforeEach(async () => {
      const result = await manager.createInstance('/workspaces/agent-feed/prod');
      instanceId = result.id;
      jest.clearAllMocks();
    });

    it('should handle instance events and re-emit them', async () => {
      // Arrange - Simulate an event
      const mockEvent = {
        instanceId,
        type: 'message',
        data: { content: 'Claude response' },
        timestamp: new Date()
      };

      // Act - Trigger event through mock
      processManagerMock.simulateMessageOutput(instanceId, 'Claude response');

      // Give time for event handling
      await new Promise(resolve => setTimeout(resolve, 10));

      // Assert
      expect(eventEmitterMock.emit).toHaveBeenCalledWith('instanceEvent',
        expect.objectContaining({ instanceId })
      );
    });
  });

  describe('London School Integration Verification', () => {
    it('should follow correct interaction sequence for full workflow', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';
      const message = 'Create test.md with "hello world"';

      // Act - Full workflow
      const instance = await manager.createInstance(workspaceDir);
      const messageResult = await manager.sendMessage(instance.id, message);
      const fileResult = await manager.requestFileCreation(instance.id, 'test.md', 'hello world');
      await manager.cleanup();

      // Assert - Verify entire interaction sequence
      expect(processManagerMock.createInstance).toHaveBeenCalledBefore(processManagerMock.sendInput as jest.Mock);
      expect(processManagerMock.sendInput).toHaveBeenCalledBefore(processManagerMock.requestFileCreation as jest.Mock);
      expect(processManagerMock.requestFileCreation).toHaveBeenCalledBefore(processManagerMock.destroyInstance as jest.Mock);

      // Verify no unexpected interactions
      processManagerMock.verifyNoUnexpectedInteractions();
    });

    it('should coordinate with all collaborators correctly', async () => {
      // Arrange
      const workspaceDir = '/workspaces/agent-feed/prod';

      // Act
      await manager.createInstance(workspaceDir);

      // Assert - Verify all collaborator interactions
      expect(processManagerMock.createInstance).toHaveBeenCalled();
      expect(processManagerMock.subscribeToEvents).toHaveBeenCalled();
      expect(loggerMock.info).toHaveBeenCalled();
      expect(eventEmitterMock.emit).toHaveBeenCalled();

      // London School principle: Test the conversation, not the state
      expect(processManagerMock.createInstance).toHaveBeenCalledWith(
        workspaceDir,
        undefined
      );
    });
  });
});
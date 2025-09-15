/**
 * WebSocket Event Streaming Unit Tests
 * London School TDD - Testing WebSocket integration with extensive mocking
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { WebSocketMock, WebSocketMockFactory } from '../mocks/WebSocketMock';
import { EventEmitter } from 'events';

// Mock EventSource for Server-Sent Events
class EventSourceMock extends EventEmitter {
  public readyState: number = 0;
  public url: string;

  public close = jest.fn();
  public addEventListener = jest.fn();
  public removeEventListener = jest.fn();

  // EventSource constants
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    super();
    this.url = url;

    // Setup mock behaviors
    this.close.mockImplementation(() => {
      this.readyState = EventSourceMock.CLOSED;
      this.emit('close');
    });

    this.addEventListener.mockImplementation((type: string, listener: any) => {
      this.on(type, listener);
    });

    this.removeEventListener.mockImplementation((type: string, listener: any) => {
      this.off(type, listener);
    });

    // Simulate connection
    process.nextTick(() => {
      this.readyState = EventSourceMock.OPEN;
      this.emit('open');
    });
  }

  simulateMessage(data: any, eventType: string = 'message'): void {
    this.emit(eventType, { data: JSON.stringify(data) });
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }
}

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockClaudeInstanceService = {
  getInstanceStatus: jest.fn(),
  subscribeToEvents: jest.fn(),
  unsubscribeFromEvents: jest.fn()
};

// Subject under test - WebSocket Event Stream Manager
class WebSocketEventStreamManager {
  private activeConnections: Map<string, WebSocketMock> = new Map();
  private eventSources: Map<string, EventSourceMock> = new Map();
  private instanceSubscriptions: Map<string, Set<string>> = new Map(); // instanceId -> userIds
  private logger: any;
  private claudeService: any;

  constructor(logger: any, claudeService: any) {
    this.logger = logger;
    this.claudeService = claudeService;
  }

  async handleWebSocketConnection(ws: WebSocketMock, userId: string): Promise<void> {
    const connectionId = `ws-${Date.now()}-${Math.random()}`;
    this.activeConnections.set(connectionId, ws);

    this.logger.info(`WebSocket connection established for user ${userId}`);

    // Setup message handlers
    ws.on('message', (data: any) => {
      this.handleWebSocketMessage(connectionId, userId, data);
    });

    ws.on('close', () => {
      this.handleWebSocketClose(connectionId, userId);
    });

    ws.on('error', (error: Error) => {
      this.handleWebSocketError(connectionId, userId, error);
    });

    // Send welcome message
    this.sendToWebSocket(ws, {
      type: 'connection_established',
      data: { connectionId, userId, timestamp: new Date() }
    });
  }

  async subscribeToClaudeInstance(userId: string, instanceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.debug(`Subscribing user ${userId} to Claude instance ${instanceId}`);

      // Verify instance exists
      const instanceStatus = await this.claudeService.getInstanceStatus(instanceId);
      if (!instanceStatus) {
        return { success: false, error: 'Instance not found' };
      }

      // Add user to instance subscription
      if (!this.instanceSubscriptions.has(instanceId)) {
        this.instanceSubscriptions.set(instanceId, new Set());
      }
      this.instanceSubscriptions.get(instanceId)!.add(userId);

      // Subscribe to Claude instance events if first subscriber
      if (this.instanceSubscriptions.get(instanceId)!.size === 1) {
        this.claudeService.subscribeToEvents(instanceId, (event: any) => {
          this.handleClaudeInstanceEvent(instanceId, event);
        });
      }

      // Setup Server-Sent Events connection
      await this.setupEventSourceConnection(userId, instanceId);

      this.logger.info(`User ${userId} subscribed to Claude instance ${instanceId}`);
      return { success: true };

    } catch (error: any) {
      this.logger.error(`Failed to subscribe to instance: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async unsubscribeFromClaudeInstance(userId: string, instanceId: string): Promise<void> {
    this.logger.debug(`Unsubscribing user ${userId} from Claude instance ${instanceId}`);

    const subscribers = this.instanceSubscriptions.get(instanceId);
    if (subscribers) {
      subscribers.delete(userId);

      // If no more subscribers, unsubscribe from Claude events
      if (subscribers.size === 0) {
        this.claudeService.unsubscribeFromEvents(instanceId);
        this.instanceSubscriptions.delete(instanceId);
      }
    }

    // Close EventSource connection
    const eventSourceKey = `${userId}-${instanceId}`;
    const eventSource = this.eventSources.get(eventSourceKey);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(eventSourceKey);
    }
  }

  broadcastToInstance(instanceId: string, message: any): void {
    const subscribers = this.instanceSubscriptions.get(instanceId);
    if (!subscribers || subscribers.size === 0) {
      this.logger.warn(`No subscribers for instance ${instanceId}`);
      return;
    }

    this.logger.debug(`Broadcasting to ${subscribers.size} subscribers of instance ${instanceId}`);

    // Broadcast via WebSocket to all active connections
    this.activeConnections.forEach((ws, connectionId) => {
      this.sendToWebSocket(ws, {
        type: 'instance_event',
        data: {
          instanceId,
          event: message,
          timestamp: new Date()
        }
      });
    });

    // Broadcast via Server-Sent Events
    subscribers.forEach(userId => {
      const eventSourceKey = `${userId}-${instanceId}`;
      const eventSource = this.eventSources.get(eventSourceKey);
      if (eventSource) {
        eventSource.simulateMessage({
          instanceId,
          event: message,
          timestamp: new Date()
        });
      }
    });
  }

  private async setupEventSourceConnection(userId: string, instanceId: string): Promise<void> {
    const eventSourceKey = `${userId}-${instanceId}`;
    const url = `/api/claude/instances/${instanceId}/events`;

    const eventSource = new EventSourceMock(url);
    this.eventSources.set(eventSourceKey, eventSource);

    eventSource.on('open', () => {
      this.logger.debug(`EventSource connection opened for ${eventSourceKey}`);
    });

    eventSource.on('error', (error: Error) => {
      this.logger.error(`EventSource error for ${eventSourceKey}: ${error.message}`);
    });

    eventSource.on('close', () => {
      this.logger.debug(`EventSource connection closed for ${eventSourceKey}`);
      this.eventSources.delete(eventSourceKey);
    });
  }

  private handleWebSocketMessage(connectionId: string, userId: string, data: any): void {
    try {
      const message = typeof data === 'string' ? JSON.parse(data) : data;
      this.logger.debug(`WebSocket message from ${userId}: ${message.type}`);

      switch (message.type) {
        case 'subscribe_to_instance':
          this.subscribeToClaudeInstance(userId, message.instanceId);
          break;
        case 'unsubscribe_from_instance':
          this.unsubscribeFromClaudeInstance(userId, message.instanceId);
          break;
        default:
          this.logger.warn(`Unknown WebSocket message type: ${message.type}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle WebSocket message: ${error.message}`);
    }
  }

  private handleWebSocketClose(connectionId: string, userId: string): void {
    this.logger.info(`WebSocket connection closed for user ${userId}`);
    this.activeConnections.delete(connectionId);

    // Clean up any instance subscriptions for this user
    this.instanceSubscriptions.forEach((subscribers, instanceId) => {
      if (subscribers.has(userId)) {
        this.unsubscribeFromClaudeInstance(userId, instanceId);
      }
    });
  }

  private handleWebSocketError(connectionId: string, userId: string, error: Error): void {
    this.logger.error(`WebSocket error for user ${userId}: ${error.message}`);
  }

  private handleClaudeInstanceEvent(instanceId: string, event: any): void {
    this.logger.debug(`Claude instance event: ${event.type} for ${instanceId}`);
    this.broadcastToInstance(instanceId, event);
  }

  private sendToWebSocket(ws: WebSocketMock, message: any): void {
    if (ws.readyState === WebSocketMock.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Test utilities
  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  getInstanceSubscriptionCount(instanceId: string): number {
    return this.instanceSubscriptions.get(instanceId)?.size || 0;
  }

  cleanup(): void {
    // Close all connections
    this.activeConnections.forEach(ws => ws.close());
    this.eventSources.forEach(es => es.close());

    // Clear all subscriptions
    this.activeConnections.clear();
    this.eventSources.clear();
    this.instanceSubscriptions.clear();
  }
}

describe('WebSocketEventStreamManager', () => {
  let streamManager: WebSocketEventStreamManager;
  let mockClaudeService: any;
  let mockLog: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClaudeService = {
      getInstanceStatus: jest.fn(),
      subscribeToEvents: jest.fn(),
      unsubscribeFromEvents: jest.fn()
    };

    mockLog = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    streamManager = new WebSocketEventStreamManager(mockLog, mockClaudeService);

    // Replace global EventSource with our mock
    (global as any).EventSource = EventSourceMock;
  });

  afterEach(() => {
    streamManager.cleanup();
    delete (global as any).EventSource;
  });

  describe('WebSocket Connection Handling', () => {
    it('should establish WebSocket connection and send welcome message', async () => {
      // Arrange
      const ws = WebSocketMockFactory.createSuccessfulConnectionMock('ws://localhost');
      const userId = 'user-123';

      // Act
      await streamManager.handleWebSocketConnection(ws, userId);

      // Assert - Connection behavior verification
      expect(mockLog.info).toHaveBeenCalledWith(
        `WebSocket connection established for user ${userId}`
      );

      ws.verifyMessageSent({
        type: 'connection_established',
        data: {
          connectionId: expect.any(String),
          userId,
          timestamp: expect.any(Date)
        }
      });

      expect(streamManager.getActiveConnectionCount()).toBe(1);
    });

    it('should handle WebSocket connection errors', async () => {
      // Arrange
      const ws = WebSocketMockFactory.createFailedConnectionMock('ws://localhost');
      const userId = 'user-123';
      const error = new Error('Connection failed');

      // Act
      await streamManager.handleWebSocketConnection(ws, userId);

      // Simulate error
      ws.simulateError(error);

      // Assert
      expect(mockLog.error).toHaveBeenCalledWith(
        `WebSocket error for user ${userId}: Connection failed`
      );
    });

    it('should cleanup on WebSocket connection close', async () => {
      // Arrange
      const ws = WebSocketMockFactory.createSuccessfulConnectionMock('ws://localhost');
      const userId = 'user-123';

      await streamManager.handleWebSocketConnection(ws, userId);
      expect(streamManager.getActiveConnectionCount()).toBe(1);

      // Act
      ws.simulateConnectionClose();

      // Assert
      expect(mockLog.info).toHaveBeenCalledWith(
        `WebSocket connection closed for user ${userId}`
      );
      expect(streamManager.getActiveConnectionCount()).toBe(0);
    });
  });

  describe('Claude Instance Subscription', () => {
    const userId = 'user-123';
    const instanceId = 'claude-456';

    it('should subscribe to Claude instance and setup event streaming', async () => {
      // Arrange
      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });

      // Act
      const result = await streamManager.subscribeToClaudeInstance(userId, instanceId);

      // Assert - Subscription behavior verification
      expect(result.success).toBe(true);
      expect(mockClaudeService.getInstanceStatus).toHaveBeenCalledWith(instanceId);
      expect(mockClaudeService.subscribeToEvents).toHaveBeenCalledWith(
        instanceId,
        expect.any(Function)
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        `User ${userId} subscribed to Claude instance ${instanceId}`
      );
      expect(streamManager.getInstanceSubscriptionCount(instanceId)).toBe(1);
    });

    it('should handle subscription to non-existent instance', async () => {
      // Arrange
      mockClaudeService.getInstanceStatus.mockResolvedValue(null);

      // Act
      const result = await streamManager.subscribeToClaudeInstance(userId, instanceId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Instance not found');
      expect(mockClaudeService.subscribeToEvents).not.toHaveBeenCalled();
    });

    it('should handle multiple users subscribing to same instance', async () => {
      // Arrange
      const user1 = 'user-123';
      const user2 = 'user-456';
      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });

      // Act
      await streamManager.subscribeToClaudeInstance(user1, instanceId);
      await streamManager.subscribeToClaudeInstance(user2, instanceId);

      // Assert - Should only subscribe to Claude events once
      expect(mockClaudeService.subscribeToEvents).toHaveBeenCalledTimes(1);
      expect(streamManager.getInstanceSubscriptionCount(instanceId)).toBe(2);
    });

    it('should unsubscribe from Claude instance correctly', async () => {
      // Arrange - First subscribe
      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });
      await streamManager.subscribeToClaudeInstance(userId, instanceId);

      // Act
      await streamManager.unsubscribeFromClaudeInstance(userId, instanceId);

      // Assert - Unsubscription behavior verification
      expect(mockClaudeService.unsubscribeFromEvents).toHaveBeenCalledWith(instanceId);
      expect(mockLog.debug).toHaveBeenCalledWith(
        `Unsubscribing user ${userId} from Claude instance ${instanceId}`
      );
      expect(streamManager.getInstanceSubscriptionCount(instanceId)).toBe(0);
    });
  });

  describe('Event Broadcasting', () => {
    const instanceId = 'claude-456';
    const userId = 'user-123';

    beforeEach(async () => {
      // Setup subscription
      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });
      await streamManager.subscribeToClaudeInstance(userId, instanceId);
      jest.clearAllMocks();
    });

    it('should broadcast events to WebSocket subscribers', async () => {
      // Arrange
      const ws = WebSocketMockFactory.createSuccessfulConnectionMock('ws://localhost');
      await streamManager.handleWebSocketConnection(ws, userId);

      const eventMessage = {
        type: 'file_created',
        data: { path: 'test.md', success: true }
      };

      // Act
      streamManager.broadcastToInstance(instanceId, eventMessage);

      // Assert - Broadcasting behavior verification
      ws.verifyMessageSent({
        type: 'instance_event',
        data: {
          instanceId,
          event: eventMessage,
          timestamp: expect.any(Date)
        }
      });

      expect(mockLog.debug).toHaveBeenCalledWith(
        `Broadcasting to 1 subscribers of instance ${instanceId}`
      );
    });

    it('should handle broadcasting to instance with no subscribers', () => {
      // Arrange - Instance with no subscribers
      const emptyInstanceId = 'claude-empty';
      const eventMessage = { type: 'test_event', data: {} };

      // Act
      streamManager.broadcastToInstance(emptyInstanceId, eventMessage);

      // Assert
      expect(mockLog.warn).toHaveBeenCalledWith(
        `No subscribers for instance ${emptyInstanceId}`
      );
    });
  });

  describe('Server-Sent Events Integration', () => {
    const userId = 'user-123';
    const instanceId = 'claude-456';

    it('should setup EventSource connection during subscription', async () => {
      // Arrange
      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });

      // Act
      await streamManager.subscribeToClaudeInstance(userId, instanceId);

      // Assert - EventSource setup verification
      expect(mockLog.debug).toHaveBeenCalledWith(
        expect.stringContaining('EventSource connection opened')
      );
    });

    it('should handle EventSource errors gracefully', async () => {
      // Arrange
      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });
      await streamManager.subscribeToClaudeInstance(userId, instanceId);

      // Get the EventSource and simulate error
      const eventSourceKey = `${userId}-${instanceId}`;
      const eventSource = streamManager.eventSources?.get?.(eventSourceKey);

      // Act
      if (eventSource) {
        eventSource.simulateError(new Error('EventSource connection lost'));
      }

      // Assert
      expect(mockLog.error).toHaveBeenCalledWith(
        expect.stringContaining('EventSource error')
      );
    });
  });

  describe('London School Integration Tests', () => {
    it('should coordinate all components for full streaming workflow', async () => {
      // Arrange
      const userId = 'user-123';
      const instanceId = 'claude-456';
      const ws = WebSocketMockFactory.createSuccessfulConnectionMock('ws://localhost');

      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });

      // Act - Full workflow
      await streamManager.handleWebSocketConnection(ws, userId);
      await streamManager.subscribeToClaudeInstance(userId, instanceId);

      const testEvent = {
        type: 'message_received',
        data: { content: 'Claude response', messageId: 'msg-123' }
      };
      streamManager.broadcastToInstance(instanceId, testEvent);

      // Assert - Verify complete collaboration sequence
      expect(mockClaudeService.getInstanceStatus).toHaveBeenCalledBefore(
        mockClaudeService.subscribeToEvents as jest.Mock
      );

      // Verify WebSocket and EventSource coordination
      ws.verifyMessageSentCount(2); // Welcome message + broadcasted event

      // Verify logging coordination
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket connection established')
      );
      expect(mockLog.info).toHaveBeenCalledWith(
        expect.stringContaining('subscribed to Claude instance')
      );
      expect(mockLog.debug).toHaveBeenCalledWith(
        expect.stringContaining('Broadcasting to 1 subscribers')
      );
    });

    it('should handle complex multi-user, multi-instance scenario', async () => {
      // Arrange
      const users = ['user-123', 'user-456', 'user-789'];
      const instances = ['claude-123', 'claude-456'];
      const webSockets: WebSocketMock[] = [];

      mockClaudeService.getInstanceStatus.mockResolvedValue({ status: 'running' });

      // Act - Create complex subscription network
      for (const user of users) {
        const ws = WebSocketMockFactory.createSuccessfulConnectionMock('ws://localhost');
        webSockets.push(ws);
        await streamManager.handleWebSocketConnection(ws, user);

        for (const instance of instances) {
          await streamManager.subscribeToClaudeInstance(user, instance);
        }
      }

      // Broadcast to all instances
      const testEvent = { type: 'system_update', data: { message: 'All systems operational' } };
      instances.forEach(instanceId => {
        streamManager.broadcastToInstance(instanceId, testEvent);
      });

      // Assert - Verify complex coordination
      expect(streamManager.getActiveConnectionCount()).toBe(3);
      instances.forEach(instanceId => {
        expect(streamManager.getInstanceSubscriptionCount(instanceId)).toBe(3);
      });

      // Each WebSocket should receive broadcasts for both instances
      webSockets.forEach(ws => {
        ws.verifyMessageSentCount(3); // Welcome + 2 broadcasts
      });

      // Should only subscribe to Claude events once per instance
      expect(mockClaudeService.subscribeToEvents).toHaveBeenCalledTimes(2);
    });
  });
});
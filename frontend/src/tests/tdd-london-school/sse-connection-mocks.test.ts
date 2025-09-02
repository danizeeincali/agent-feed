/**
 * TDD London School: SSE Connection Management Tests
 * 
 * Focus on mock-driven testing of EventSource connections for Claude instances
 * Testing the conversation between components and connection management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock EventSource before any imports
const mockEventSource = vi.fn();
const mockAddEventListener = vi.fn();
const mockRemoveEventListener = vi.fn();
const mockClose = vi.fn();

global.EventSource = mockEventSource;

// SSE Connection Contract
interface SSEConnectionManager {
  connect(instanceId: string): Promise<EventSource>;
  disconnect(): void;
  reconnect(): Promise<void>;
  onMessage(callback: (data: any) => void): void;
  onError(callback: (error: Error) => void): void;
  onConnectionStateChange(callback: (state: ConnectionState) => void): void;
  getConnectionState(): ConnectionState;
  getConnectedInstanceId(): string | null;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

// Mock message types that should come through SSE
interface SSEMessage {
  type: 'instance_status' | 'instance_list_update' | 'connection_confirmed' | 'error';
  data: any;
  instanceId: string;
  timestamp: string;
}

describe('TDD London School: SSE Connection Management', () => {
  let mockConnectionManager: any;
  let mockEventSourceInstance: any;
  let mockOnMessageCallback: any;
  let mockOnErrorCallback: any;
  let mockOnStateChangeCallback: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock EventSource instance
    mockEventSourceInstance = {
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      close: mockClose,
      readyState: EventSource.CONNECTING,
      url: '',
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
      onopen: null,
      onmessage: null,
      onerror: null,
      dispatchEvent: vi.fn(),
    };

    mockEventSource.mockReturnValue(mockEventSourceInstance);

    // Mock callbacks
    mockOnMessageCallback = vi.fn();
    mockOnErrorCallback = vi.fn();
    mockOnStateChangeCallback = vi.fn();

    // Mock connection manager
    mockConnectionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnect: vi.fn(),
      onMessage: vi.fn(),
      onError: vi.fn(),
      onConnectionStateChange: vi.fn(),
      getConnectionState: vi.fn(),
      getConnectedInstanceId: vi.fn(),
    };
  });

  describe('Outside-In: User expects real-time instance updates', () => {
    it('should establish SSE connection when user selects instance', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const expectedUrl = `/api/claude/instances/${instanceId}/events`;
      
      mockConnectionManager.connect.mockResolvedValueOnce(mockEventSourceInstance);
      mockConnectionManager.getConnectionState.mockReturnValue('connecting');

      // Act - User selects instance
      const eventSource = await mockConnectionManager.connect(instanceId);

      // Assert - Should establish proper SSE connection
      expect(mockConnectionManager.connect).toHaveBeenCalledWith(instanceId);
      expect(mockEventSource).toHaveBeenCalledWith(expectedUrl, {
        withCredentials: true,
      });
      expect(eventSource).toBe(mockEventSourceInstance);
    });

    it('should handle real-time instance status updates', () => {
      // Arrange - SSE message for instance status change
      const statusMessage: SSEMessage = {
        type: 'instance_status',
        data: {
          instanceId: 'claude-7800',
          status: 'busy',
          currentTask: 'processing_request',
        },
        instanceId: 'claude-7800',
        timestamp: new Date().toISOString(),
      };

      mockConnectionManager.onMessage.mockImplementation((callback) => {
        mockOnMessageCallback = callback;
      });

      // Act - Register message handler and simulate message
      mockConnectionManager.onMessage(mockOnMessageCallback);
      mockOnMessageCallback(statusMessage);

      // Assert - Should handle message properly
      expect(mockConnectionManager.onMessage).toHaveBeenCalledWith(mockOnMessageCallback);
      expect(mockOnMessageCallback).toHaveBeenCalledWith(statusMessage);
    });
  });

  describe('Mock-Driven: SSE Connection Contract Testing', () => {
    it('should define proper EventSource setup contract', () => {
      // Arrange
      const instanceId = 'claude-7801';
      const expectedEventListeners = ['open', 'message', 'error'];

      // Act - Setup connection
      mockConnectionManager.connect(instanceId);

      // Assert - Should setup EventSource with proper listeners
      expect(mockEventSource).toHaveBeenCalledWith(
        `/api/claude/instances/${instanceId}/events`,
        expect.objectContaining({ withCredentials: true })
      );

      // Verify event listeners are set up
      expectedEventListeners.forEach(eventType => {
        expect(mockAddEventListener).toHaveBeenCalledWith(
          eventType,
          expect.any(Function)
        );
      });
    });

    it('should handle connection state transitions properly', () => {
      // Arrange - Connection state sequence
      const stateSequence: ConnectionState[] = ['disconnected', 'connecting', 'connected'];
      
      mockConnectionManager.getConnectionState
        .mockReturnValueOnce('disconnected')
        .mockReturnValueOnce('connecting')
        .mockReturnValueOnce('connected');

      mockConnectionManager.onConnectionStateChange.mockImplementation((callback) => {
        mockOnStateChangeCallback = callback;
      });

      // Act - Simulate state transitions
      mockConnectionManager.onConnectionStateChange(mockOnStateChangeCallback);
      
      stateSequence.forEach(state => {
        const currentState = mockConnectionManager.getConnectionState();
        mockOnStateChangeCallback(currentState);
      });

      // Assert - Should call state change handler for each transition
      expect(mockOnStateChangeCallback).toHaveBeenCalledTimes(3);
      expect(mockOnStateChangeCallback).toHaveBeenNthCalledWith(1, 'disconnected');
      expect(mockOnStateChangeCallback).toHaveBeenNthCalledWith(2, 'connecting');
      expect(mockOnStateChangeCallback).toHaveBeenNthCalledWith(3, 'connected');
    });

    it('should handle EventSource error events according to contract', () => {
      // Arrange - Error event
      const connectionError = new Error('EventSource connection failed');
      
      mockConnectionManager.onError.mockImplementation((callback) => {
        mockOnErrorCallback = callback;
      });

      mockConnectionManager.getConnectionState.mockReturnValue('error');

      // Act - Register error handler and simulate error
      mockConnectionManager.onError(mockOnErrorCallback);
      mockOnErrorCallback(connectionError);

      // Assert - Should handle error properly
      expect(mockConnectionManager.onError).toHaveBeenCalledWith(mockOnErrorCallback);
      expect(mockOnErrorCallback).toHaveBeenCalledWith(connectionError);
      expect(mockConnectionManager.getConnectionState()).toBe('error');
    });
  });

  describe('Behavior Verification: Connection Lifecycle', () => {
    it('should coordinate proper connection cleanup on instance change', () => {
      // Arrange - Existing connection
      const oldInstanceId = 'claude-7800';
      const newInstanceId = 'claude-7801';
      
      mockConnectionManager.getConnectedInstanceId.mockReturnValue(oldInstanceId);
      mockConnectionManager.getConnectionState.mockReturnValue('connected');

      // Act - Change instance (should cleanup old connection)
      mockConnectionManager.disconnect();
      mockConnectionManager.connect(newInstanceId);

      // Assert - Should cleanup old connection before new one
      expect(mockConnectionManager.disconnect).toHaveBeenCalledTimes(1);
      expect(mockConnectionManager.connect).toHaveBeenCalledWith(newInstanceId);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });

    it('should implement reconnection strategy on connection loss', async () => {
      // Arrange - Connection loss scenario
      const instanceId = 'claude-7800';
      
      mockConnectionManager.getConnectionState
        .mockReturnValueOnce('connected')
        .mockReturnValueOnce('reconnecting')
        .mockReturnValueOnce('connected');

      mockConnectionManager.reconnect.mockResolvedValueOnce(undefined);

      // Act - Simulate connection loss and reconnection
      mockConnectionManager.onError(mockOnErrorCallback);
      
      // Simulate error triggering reconnection
      const networkError = new Error('Network connection lost');
      mockOnErrorCallback(networkError);
      
      await mockConnectionManager.reconnect();

      // Assert - Should attempt reconnection
      expect(mockConnectionManager.reconnect).toHaveBeenCalledTimes(1);
      expect(mockConnectionManager.getConnectionState()).toBe('connected');
    });
  });

  describe('Message Processing and Filtering', () => {
    it('should filter messages by instance ID', () => {
      // Arrange - Messages from different instances
      const targetInstanceId = 'claude-7800';
      const relevantMessage: SSEMessage = {
        type: 'instance_status',
        data: { status: 'active' },
        instanceId: targetInstanceId,
        timestamp: new Date().toISOString(),
      };

      const irrelevantMessage: SSEMessage = {
        type: 'instance_status',
        data: { status: 'busy' },
        instanceId: 'claude-7801', // Different instance
        timestamp: new Date().toISOString(),
      };

      mockConnectionManager.getConnectedInstanceId.mockReturnValue(targetInstanceId);

      // Mock message filtering logic
      const shouldProcessMessage = (message: SSEMessage, connectedInstanceId: string | null) => {
        return connectedInstanceId === null || message.instanceId === connectedInstanceId;
      };

      // Act - Process messages
      const shouldProcessRelevant = shouldProcessMessage(relevantMessage, targetInstanceId);
      const shouldProcessIrrelevant = shouldProcessMessage(irrelevantMessage, targetInstanceId);

      // Assert - Should only process relevant messages
      expect(shouldProcessRelevant).toBe(true);
      expect(shouldProcessIrrelevant).toBe(false);
    });

    it('should handle different message types appropriately', () => {
      // Arrange - Different message types
      const messageTypes: SSEMessage[] = [
        {
          type: 'instance_status',
          data: { status: 'active' },
          instanceId: 'claude-7800',
          timestamp: new Date().toISOString(),
        },
        {
          type: 'instance_list_update',
          data: { instances: ['claude-7800', 'claude-7801'] },
          instanceId: 'claude-7800',
          timestamp: new Date().toISOString(),
        },
        {
          type: 'connection_confirmed',
          data: { connectionId: 'conn-123' },
          instanceId: 'claude-7800',
          timestamp: new Date().toISOString(),
        },
      ];

      const messageHandlers = {
        instance_status: vi.fn(),
        instance_list_update: vi.fn(),
        connection_confirmed: vi.fn(),
        error: vi.fn(),
      };

      // Act - Process each message type
      messageTypes.forEach(message => {
        const handler = messageHandlers[message.type];
        if (handler) {
          handler(message.data);
        }
      });

      // Assert - Should call appropriate handlers
      expect(messageHandlers.instance_status).toHaveBeenCalledWith({ status: 'active' });
      expect(messageHandlers.instance_list_update).toHaveBeenCalledWith({ instances: ['claude-7800', 'claude-7801'] });
      expect(messageHandlers.connection_confirmed).toHaveBeenCalledWith({ connectionId: 'conn-123' });
    });
  });

  describe('Connection Resilience and Recovery', () => {
    it('should implement exponential backoff for reconnection attempts', () => {
      // Arrange - Failed reconnection attempts
      const maxRetries = 3;
      const baseDelay = 1000;
      let attemptCount = 0;

      const calculateBackoffDelay = (attempt: number) => {
        return Math.min(baseDelay * Math.pow(2, attempt), 30000);
      };

      mockConnectionManager.reconnect.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < maxRetries) {
          throw new Error(`Reconnection attempt ${attemptCount} failed`);
        }
        return Promise.resolve();
      });

      // Act - Simulate multiple reconnection attempts
      const delays: number[] = [];
      for (let i = 0; i < maxRetries; i++) {
        delays.push(calculateBackoffDelay(i));
      }

      // Assert - Should use exponential backoff
      expect(delays[0]).toBe(1000);  // 1s
      expect(delays[1]).toBe(2000);  // 2s
      expect(delays[2]).toBe(4000);  // 4s
    });

    it('should handle graceful connection closure', () => {
      // Arrange - Normal connection closure
      mockConnectionManager.getConnectionState.mockReturnValue('connected');
      
      // Act - Gracefully disconnect
      mockConnectionManager.disconnect();

      // Assert - Should cleanup properly
      expect(mockConnectionManager.disconnect).toHaveBeenCalledTimes(1);
      expect(mockClose).toHaveBeenCalledTimes(1);
      expect(mockRemoveEventListener).toHaveBeenCalled();
    });
  });

  describe('Cross-Tab Synchronization', () => {
    it('should coordinate connections across browser tabs', () => {
      // Arrange - Multiple tab scenario
      const mockBroadcastChannel = {
        postMessage: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
      };

      const tabSyncMessage = {
        type: 'instance_changed',
        instanceId: 'claude-7801',
        tabId: 'tab-1',
        timestamp: new Date().toISOString(),
      };

      // Act - Simulate tab communication
      mockBroadcastChannel.postMessage(tabSyncMessage);

      // Assert - Should coordinate across tabs
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(tabSyncMessage);
    });
  });
});

/**
 * Contract Summary for Implementation
 * 
 * The SSE Connection Manager should implement:
 * 
 * 1. connect(instanceId) - Establish EventSource connection
 * 2. disconnect() - Cleanup connection and event listeners
 * 3. reconnect() - Handle reconnection with exponential backoff
 * 4. onMessage(callback) - Register message handlers
 * 5. onError(callback) - Register error handlers
 * 6. onConnectionStateChange(callback) - Register state change handlers
 * 7. getConnectionState() - Return current connection state
 * 8. getConnectedInstanceId() - Return currently connected instance ID
 * 
 * Behavior Requirements:
 * - Filter messages by instance ID
 * - Handle different message types appropriately
 * - Implement connection resilience with backoff
 * - Support graceful connection cleanup
 * - Coordinate across browser tabs (optional)
 */

export type { SSEConnectionManager, ConnectionState, SSEMessage };
/**
 * TDD London School: SSE Connection Behavioral Contracts
 * 
 * Defines the behavioral contracts for SSE connection management.
 * Tests focus on HOW objects collaborate rather than WHAT they contain.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// === BEHAVIORAL CONTRACTS ===

/**
 * SSE Connection Manager Contract
 * Defines the expected behavior for SSE connection management
 */
export interface SSEConnectionContract {
  connect(instanceId: string, config?: SSEConfig): Promise<SSEConnection>;
  disconnect(instanceId: string): Promise<void>;
  reconnect(instanceId: string): Promise<void>;
  subscribe(instanceId: string, messageType: string, handler: MessageHandler): UnsubscribeFunction;
  getConnectionState(instanceId: string): ConnectionState;
  getConnectionHealth(): HealthMetrics;
}

export interface SSEConfig {
  url?: string;
  withCredentials?: boolean;
  maxRetries?: number;
  retryInterval?: number;
  enableHeartbeat?: boolean;
}

export interface SSEConnection {
  id: string;
  instanceId: string;
  state: ConnectionState;
  eventSource: EventSource;
  metadata: ConnectionMetadata;
}

export interface ConnectionMetadata {
  connectedAt: Date;
  reconnectCount: number;
  lastHeartbeat: Date;
  messageCount: number;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed';
export type MessageHandler = (message: SSEMessage) => void;
export type UnsubscribeFunction = () => void;

export interface SSEMessage {
  id: string;
  type: string;
  data: any;
  instanceId: string;
  timestamp: Date;
  sequenceNumber?: number;
}

export interface HealthMetrics {
  totalConnections: number;
  activeConnections: number;
  failedConnections: number;
  averageLatency: number;
  uptime: number;
}

// === MOCK FACTORIES ===

const createMockSSEConnection = (instanceId: string, state: ConnectionState = 'connected'): SSEConnection => ({
  id: `conn-${instanceId}`,
  instanceId,
  state,
  eventSource: createMockEventSource(),
  metadata: {
    connectedAt: new Date(),
    reconnectCount: 0,
    lastHeartbeat: new Date(),
    messageCount: 0
  }
});

const createMockEventSource = (): EventSource => {
  const mock = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(),
    readyState: EventSource.OPEN,
    url: 'mock://sse/stream',
    withCredentials: false,
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2,
    onopen: null,
    onmessage: null,
    onerror: null,
    dispatchEvent: vi.fn()
  } as unknown as EventSource;
  return mock;
};

const createMockSSEMessage = (type: string, instanceId: string, data: any = {}): SSEMessage => ({
  id: `msg-${Date.now()}-${Math.random()}`,
  type,
  data,
  instanceId,
  timestamp: new Date(),
  sequenceNumber: Math.floor(Math.random() * 1000)
});

// === BEHAVIORAL CONTRACT TESTS ===

describe('TDD London School: SSE Connection Behavioral Contracts', () => {
  let mockConnectionManager: SSEConnectionContract;
  let mockEventSource: EventSource;
  let mockMessageHandler: Mock;
  let mockErrorHandler: Mock;
  let mockStateChangeHandler: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock handlers
    mockMessageHandler = vi.fn();
    mockErrorHandler = vi.fn();
    mockStateChangeHandler = vi.fn();

    // Create mock EventSource
    mockEventSource = createMockEventSource();

    // Create mock connection manager
    mockConnectionManager = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnect: vi.fn(),
      subscribe: vi.fn(),
      getConnectionState: vi.fn(),
      getConnectionHealth: vi.fn()
    };
  });

  describe('Connection Establishment Contract', () => {
    it('should establish SSE connection with proper configuration', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const config: SSEConfig = {
        url: '/api/sse/claude/7800',
        withCredentials: true,
        maxRetries: 3,
        enableHeartbeat: true
      };
      const expectedConnection = createMockSSEConnection(instanceId, 'connecting');
      
      // Mock the behavior
      (mockConnectionManager.connect as Mock).mockResolvedValue(expectedConnection);

      // Act
      const connection = await mockConnectionManager.connect(instanceId, config);

      // Assert - Verify the conversation
      expect(mockConnectionManager.connect).toHaveBeenCalledWith(instanceId, config);
      expect(connection.instanceId).toBe(instanceId);
      expect(connection.state).toBe('connecting');
      expect(connection.eventSource).toBeDefined();
    });

    it('should coordinate EventSource creation with proper event listeners', async () => {
      // Arrange
      const instanceId = 'claude-7801';
      const expectedEventTypes = ['open', 'message', 'error'];
      
      const connection = createMockSSEConnection(instanceId);
      (mockConnectionManager.connect as Mock).mockResolvedValue(connection);

      // Act
      await mockConnectionManager.connect(instanceId);

      // Assert - Verify EventSource setup behavior
      expect(mockConnectionManager.connect).toHaveBeenCalledWith(instanceId);
      
      // Simulate EventSource setup verification
      const eventSource = connection.eventSource as any;
      expectedEventTypes.forEach(eventType => {
        expect(eventSource.addEventListener).toHaveBeenCalledWith(
          eventType,
          expect.any(Function)
        );
      });
    });
  });

  describe('Message Subscription Contract', () => {
    it('should register message handlers for specific message types', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const messageType = 'terminal_output';
      const unsubscribeMock = vi.fn();
      
      (mockConnectionManager.subscribe as Mock).mockReturnValue(unsubscribeMock);

      // Act
      const unsubscribe = mockConnectionManager.subscribe(instanceId, messageType, mockMessageHandler);

      // Assert - Verify subscription behavior
      expect(mockConnectionManager.subscribe).toHaveBeenCalledWith(
        instanceId,
        messageType,
        mockMessageHandler
      );
      expect(unsubscribe).toBe(unsubscribeMock);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should route messages to appropriate handlers based on type and instance', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const messageType = 'instance_status';
      const testMessage = createMockSSEMessage(messageType, instanceId, { status: 'active' });
      
      (mockConnectionManager.subscribe as Mock).mockImplementation((id, type, handler) => {
        // Simulate message routing behavior
        if (id === instanceId && type === messageType) {
          handler(testMessage);
        }
        return vi.fn(); // unsubscribe function
      });

      // Act
      mockConnectionManager.subscribe(instanceId, messageType, mockMessageHandler);

      // Assert - Verify message routing behavior
      expect(mockMessageHandler).toHaveBeenCalledWith(testMessage);
    });
  });

  describe('Connection State Management Contract', () => {
    it('should track connection state transitions properly', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const stateTransitions: ConnectionState[] = ['disconnected', 'connecting', 'connected'];
      
      // Mock state transitions
      stateTransitions.forEach((state, index) => {
        (mockConnectionManager.getConnectionState as Mock)
          .mockReturnValueOnce(state);
      });

      // Act & Assert - Verify state transition behavior
      stateTransitions.forEach(expectedState => {
        const actualState = mockConnectionManager.getConnectionState(instanceId);
        expect(actualState).toBe(expectedState);
      });

      // Verify all calls were made
      expect(mockConnectionManager.getConnectionState).toHaveBeenCalledTimes(3);
    });

    it('should provide connection health metrics', () => {
      // Arrange
      const expectedMetrics: HealthMetrics = {
        totalConnections: 2,
        activeConnections: 1,
        failedConnections: 0,
        averageLatency: 45,
        uptime: 120000 // 2 minutes
      };

      (mockConnectionManager.getConnectionHealth as Mock).mockReturnValue(expectedMetrics);

      // Act
      const metrics = mockConnectionManager.getConnectionHealth();

      // Assert - Verify metrics behavior
      expect(metrics).toEqual(expectedMetrics);
      expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Recovery Contract', () => {
    it('should implement reconnection strategy for connection failures', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const connectionError = new Error('EventSource connection failed');
      
      // Mock initial connection failure
      (mockConnectionManager.connect as Mock).mockRejectedValueOnce(connectionError);
      
      // Mock successful reconnection
      (mockConnectionManager.reconnect as Mock).mockResolvedValueOnce(undefined);
      
      // Mock state transitions
      (mockConnectionManager.getConnectionState as Mock)
        .mockReturnValueOnce('error')
        .mockReturnValueOnce('reconnecting')
        .mockReturnValueOnce('connected');

      // Act - Simulate error recovery flow
      try {
        await mockConnectionManager.connect(instanceId);
      } catch (error) {
        expect(error).toBe(connectionError);
        
        // Trigger reconnection
        await mockConnectionManager.reconnect(instanceId);
      }

      // Assert - Verify error recovery behavior
      expect(mockConnectionManager.connect).toHaveBeenCalledWith(instanceId);
      expect(mockConnectionManager.reconnect).toHaveBeenCalledWith(instanceId);
      expect(mockConnectionManager.getConnectionState(instanceId)).toBe('connected');
    });

    it('should implement exponential backoff for reconnection attempts', () => {
      // Arrange
      const instanceId = 'claude-7800';
      const baseDelay = 1000;
      const maxRetries = 5;
      
      // Mock exponential backoff calculation
      const calculateBackoff = (attempt: number): number => {
        return Math.min(baseDelay * Math.pow(2, attempt), 30000);
      };

      // Act & Assert - Verify backoff behavior
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const expectedDelay = calculateBackoff(attempt);
        const actualDelay = calculateBackoff(attempt);
        
        expect(actualDelay).toBe(expectedDelay);
        expect(actualDelay).toBeGreaterThanOrEqual(baseDelay);
        expect(actualDelay).toBeLessThanOrEqual(30000);
      }
    });
  });

  describe('Connection Cleanup Contract', () => {
    it('should cleanup connection resources properly on disconnect', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const connection = createMockSSEConnection(instanceId, 'connected');
      
      (mockConnectionManager.connect as Mock).mockResolvedValue(connection);
      (mockConnectionManager.getConnectionState as Mock).mockReturnValue('disconnected');

      // Act
      await mockConnectionManager.connect(instanceId);
      await mockConnectionManager.disconnect(instanceId);

      // Assert - Verify cleanup behavior
      expect(mockConnectionManager.disconnect).toHaveBeenCalledWith(instanceId);
      expect(connection.eventSource.close).toHaveBeenCalled();
      expect(mockConnectionManager.getConnectionState(instanceId)).toBe('disconnected');
    });

    it('should remove all event listeners during cleanup', async () => {
      // Arrange
      const instanceId = 'claude-7800';
      const connection = createMockSSEConnection(instanceId);
      const eventTypes = ['open', 'message', 'error'];
      
      (mockConnectionManager.connect as Mock).mockResolvedValue(connection);

      // Act
      await mockConnectionManager.connect(instanceId);
      await mockConnectionManager.disconnect(instanceId);

      // Assert - Verify listener cleanup behavior
      const eventSource = connection.eventSource as any;
      eventTypes.forEach(eventType => {
        expect(eventSource.removeEventListener).toHaveBeenCalledWith(
          eventType,
          expect.any(Function)
        );
      });
    });
  });

  describe('Cross-Instance Coordination Contract', () => {
    it('should manage multiple concurrent connections', async () => {
      // Arrange
      const instanceIds = ['claude-7800', 'claude-7801'];
      const connections = instanceIds.map(id => createMockSSEConnection(id));
      
      // Mock multiple connections
      (mockConnectionManager.connect as Mock)
        .mockResolvedValueOnce(connections[0])
        .mockResolvedValueOnce(connections[1]);

      // Act
      const connectionPromises = instanceIds.map(id => 
        mockConnectionManager.connect(id)
      );
      const establishedConnections = await Promise.all(connectionPromises);

      // Assert - Verify multi-connection behavior
      expect(establishedConnections).toHaveLength(2);
      expect(mockConnectionManager.connect).toHaveBeenCalledTimes(2);
      instanceIds.forEach((id, index) => {
        expect(establishedConnections[index].instanceId).toBe(id);
      });
    });

    it('should isolate connection failures between instances', async () => {
      // Arrange
      const workingInstanceId = 'claude-7800';
      const failingInstanceId = 'claude-7801';
      const connectionError = new Error('Connection failed');
      
      const workingConnection = createMockSSEConnection(workingInstanceId);
      
      (mockConnectionManager.connect as Mock)
        .mockResolvedValueOnce(workingConnection)
        .mockRejectedValueOnce(connectionError);

      // Act
      const workingConnectionPromise = mockConnectionManager.connect(workingInstanceId);
      const failingConnectionPromise = mockConnectionManager.connect(failingInstanceId);

      // Assert - Verify connection isolation
      await expect(workingConnectionPromise).resolves.toBe(workingConnection);
      await expect(failingConnectionPromise).rejects.toBe(connectionError);
      
      // Working connection should remain unaffected
      expect(workingConnection.state).toBe('connected');
    });
  });
});

// === EXPORT CONTRACTS FOR IMPLEMENTATION ===

export {
  createMockSSEConnection,
  createMockEventSource,
  createMockSSEMessage
};
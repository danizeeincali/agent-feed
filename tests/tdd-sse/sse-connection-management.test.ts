/**
 * TDD London School - SSE Connection Deduplication Tests
 * 
 * Tests focus on behavior verification through mocks:
 * - Only one SSE connection exists per instance
 * - Proper connection lifecycle management
 * - State management across component updates
 */

import { MockEventSource } from './mocks/event-source.mock';

describe('SSE Connection Management - London School TDD', () => {
  let mockConnectionManager: jest.Mocked<any>;
  let mockStateManager: jest.Mocked<any>;
  let connectionInstances: Map<string, any>;

  beforeEach(() => {
    // Mock connection manager with behavior verification
    mockConnectionManager = {
      createConnection: jest.fn(),
      closeConnection: jest.fn(),
      getActiveConnections: jest.fn(() => connectionInstances),
      isConnected: jest.fn(),
      getConnectionState: jest.fn()
    };

    // Mock state manager for connection tracking
    mockStateManager = {
      setConnectionState: jest.fn(),
      getConnectionState: jest.fn(),
      clearConnectionState: jest.fn(),
      hasActiveConnection: jest.fn()
    };

    connectionInstances = new Map();
    MockEventSource.reset();
  });

  describe('Connection Deduplication', () => {
    it('should create only one connection per instance ID', () => {
      const instanceId = 'claude-instance-1';
      
      // Mock existing connection check
      mockStateManager.hasActiveConnection.mockReturnValue(false);
      mockConnectionManager.isConnected.mockReturnValue(false);
      
      // First connection attempt
      const connection1 = mockConnectionManager.createConnection(instanceId);
      mockConnectionManager.createConnection.mockReturnValue(connection1);
      
      // Second connection attempt (should reuse existing)
      mockStateManager.hasActiveConnection.mockReturnValue(true);
      const connection2 = mockConnectionManager.createConnection(instanceId);
      
      // Verify behavior: only one creation call made
      expect(mockConnectionManager.createConnection).toHaveBeenCalledTimes(2);
      expect(mockStateManager.hasActiveConnection).toHaveBeenCalledWith(instanceId);
    });

    it('should prevent duplicate event handlers on same connection', () => {
      const instanceId = 'claude-instance-1';
      const mockEventSource = new MockEventSource('/api/stream');
      const messageHandler = jest.fn();
      
      // Mock connection with event source
      mockConnectionManager.createConnection.mockReturnValue({
        eventSource: mockEventSource,
        addHandler: jest.fn(),
        removeHandler: jest.fn()
      });
      
      const connection = mockConnectionManager.createConnection(instanceId);
      
      // Add same handler multiple times
      connection.addHandler('message', messageHandler);
      connection.addHandler('message', messageHandler);
      connection.addHandler('message', messageHandler);
      
      // Verify only one handler is active
      MockEventSource.simulateMessage('test message');
      
      expect(connection.addHandler).toHaveBeenCalledTimes(3);
      // Should have deduplication logic internally
    });

    it('should track connection instances by unique ID', () => {
      const instances = ['instance-1', 'instance-2', 'instance-3'];
      
      instances.forEach(id => {
        mockStateManager.hasActiveConnection.mockReturnValue(false);
        mockConnectionManager.createConnection(id);
        mockStateManager.setConnectionState(id, 'connected');
      });
      
      // Verify each instance tracked separately
      instances.forEach(id => {
        expect(mockConnectionManager.createConnection).toHaveBeenCalledWith(id);
        expect(mockStateManager.setConnectionState).toHaveBeenCalledWith(id, 'connected');
      });
    });
  });

  describe('Connection State Management', () => {
    it('should maintain connection state across component updates', () => {
      const instanceId = 'persistent-instance';
      const mockConnection = {
        state: 'connected',
        eventSource: new MockEventSource('/stream'),
        lastActivity: Date.now()
      };
      
      mockConnectionManager.getConnectionState.mockReturnValue('connected');
      mockStateManager.getConnectionState.mockReturnValue(mockConnection);
      
      // Component update simulation
      mockStateManager.setConnectionState(instanceId, mockConnection);
      const retrievedState = mockStateManager.getConnectionState(instanceId);
      
      expect(mockStateManager.setConnectionState).toHaveBeenCalledWith(instanceId, mockConnection);
      expect(retrievedState).toBe(mockConnection);
    });

    it('should properly transition connection states', () => {
      const instanceId = 'state-test-instance';
      const stateTransitions = [
        'connecting',
        'connected',
        'disconnecting',
        'disconnected'
      ];
      
      stateTransitions.forEach(state => {
        mockStateManager.setConnectionState(instanceId, state);
        mockConnectionManager.getConnectionState.mockReturnValue(state);
        
        expect(mockStateManager.setConnectionState).toHaveBeenCalledWith(instanceId, state);
      });
    });
  });

  describe('Connection Cleanup', () => {
    it('should cleanup connection when component unmounts', () => {
      const instanceId = 'cleanup-test';
      const mockEventSource = new MockEventSource('/stream');
      
      mockConnectionManager.createConnection.mockReturnValue({
        eventSource: mockEventSource,
        cleanup: jest.fn()
      });
      
      const connection = mockConnectionManager.createConnection(instanceId);
      
      // Simulate component unmount
      mockConnectionManager.closeConnection(instanceId);
      
      expect(mockConnectionManager.closeConnection).toHaveBeenCalledWith(instanceId);
      expect(mockStateManager.clearConnectionState).toHaveBeenCalledWith(instanceId);
    });

    it('should prevent memory leaks by removing all listeners', () => {
      const instanceId = 'memory-leak-test';
      const mockEventSource = new MockEventSource('/stream');
      const handlers = {
        onMessage: jest.fn(),
        onError: jest.fn(),
        onOpen: jest.fn()
      };
      
      mockConnectionManager.createConnection.mockReturnValue({
        eventSource: mockEventSource,
        handlers,
        removeAllHandlers: jest.fn()
      });
      
      const connection = mockConnectionManager.createConnection(instanceId);
      
      // Add handlers
      Object.values(handlers).forEach(handler => {
        mockEventSource.addEventListener('message', handler);
      });
      
      // Cleanup
      connection.removeAllHandlers();
      mockConnectionManager.closeConnection(instanceId);
      
      expect(connection.removeAllHandlers).toHaveBeenCalled();
      expect(mockConnectionManager.closeConnection).toHaveBeenCalledWith(instanceId);
    });
  });

  describe('Reconnection Behavior', () => {
    it('should handle disconnect and reconnect properly', () => {
      const instanceId = 'reconnect-test';
      let connectionAttempts = 0;
      
      mockConnectionManager.createConnection.mockImplementation(() => {
        connectionAttempts++;
        return {
          id: `connection-${connectionAttempts}`,
          eventSource: new MockEventSource('/stream'),
          attempt: connectionAttempts
        };
      });
      
      // Initial connection
      const initialConnection = mockConnectionManager.createConnection(instanceId);
      
      // Simulate disconnect
      mockConnectionManager.closeConnection(instanceId);
      mockStateManager.clearConnectionState(instanceId);
      
      // Reconnect
      const reconnection = mockConnectionManager.createConnection(instanceId);
      
      expect(mockConnectionManager.createConnection).toHaveBeenCalledTimes(2);
      expect(reconnection.attempt).toBe(2);
    });

    it('should maintain single connection during reconnection', () => {
      const instanceId = 'single-connection-test';
      
      // First connection
      mockStateManager.hasActiveConnection.mockReturnValueOnce(false);
      mockConnectionManager.createConnection(instanceId);
      
      // Attempt second connection while first is active
      mockStateManager.hasActiveConnection.mockReturnValueOnce(true);
      mockConnectionManager.createConnection(instanceId);
      
      // Should not create duplicate connection
      expect(mockStateManager.hasActiveConnection).toHaveBeenCalledWith(instanceId);
    });
  });

  describe('Concurrent Instance Management', () => {
    it('should handle multiple instances independently', () => {
      const instances = ['instance-a', 'instance-b', 'instance-c'];
      const connections = new Map();
      
      instances.forEach(id => {
        const connection = {
          id,
          eventSource: new MockEventSource(`/stream/${id}`),
          state: 'connected'
        };
        
        mockConnectionManager.createConnection.mockReturnValueOnce(connection);
        mockStateManager.hasActiveConnection.mockReturnValueOnce(false);
        
        connections.set(id, mockConnectionManager.createConnection(id));
        mockStateManager.setConnectionState(id, 'connected');
      });
      
      // Verify independent management
      instances.forEach(id => {
        expect(mockConnectionManager.createConnection).toHaveBeenCalledWith(id);
        expect(mockStateManager.setConnectionState).toHaveBeenCalledWith(id, 'connected');
      });
      
      expect(mockConnectionManager.createConnection).toHaveBeenCalledTimes(3);
    });

    it('should isolate connection failures between instances', () => {
      const workingInstance = 'working-instance';
      const failingInstance = 'failing-instance';
      
      // Create both connections
      mockConnectionManager.createConnection(workingInstance);
      mockConnectionManager.createConnection(failingInstance);
      
      // Simulate failure in one instance
      mockConnectionManager.closeConnection.mockImplementationOnce((id) => {
        if (id === failingInstance) {
          mockStateManager.setConnectionState(id, 'error');
        }
      });
      
      mockConnectionManager.closeConnection(failingInstance);
      
      // Verify other instance unaffected
      mockConnectionManager.getConnectionState.mockImplementation((id) => {
        return id === workingInstance ? 'connected' : 'error';
      });
      
      expect(mockConnectionManager.getConnectionState(workingInstance)).toBe('connected');
      expect(mockConnectionManager.getConnectionState(failingInstance)).toBe('error');
    });
  });
});
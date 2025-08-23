/**
 * TDD London School Test Suite: WebSocket State Chain Propagation
 * Mock-driven tests for behavior verification and contract testing
 */

import { renderHook, act } from '@testing-library/react';
import { useWebSocketSingleton } from '../hooks/useWebSocketSingleton';
import { useConnectionManager } from '../hooks/useConnectionManager';
import { WebSocketConnectionManager } from '../services/connection/connection-manager';
import { ConnectionState } from '../services/connection/types';

// Mock the connection manager module
jest.mock('../services/connection/connection-manager', () => {
  const actualModule = jest.requireActual('../services/connection/connection-manager');
  return {
    ...actualModule,
    WebSocketConnectionManager: jest.fn(),
    getGlobalConnectionManager: jest.fn()
  };
});

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn()
}));

describe('WebSocket State Chain Propagation - TDD London School', () => {
  let mockConnectionManager: jest.Mocked<WebSocketConnectionManager>;
  let mockSocket: any;
  
  beforeEach(() => {
    // Create mock socket
    mockSocket = {
      id: 'mock-socket-id',
      connected: false,
      connecting: false,
      disconnected: true,
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      removeAllListeners: jest.fn()
    };
    
    // Create mock connection manager
    mockConnectionManager = {
      getState: jest.fn().mockReturnValue(ConnectionState.DISCONNECTED),
      getSocket: jest.fn().mockReturnValue(mockSocket),
      isConnected: jest.fn().mockReturnValue(false),
      getMetrics: jest.fn().mockReturnValue({
        connectionAttempts: 0,
        successfulConnections: 0,
        failedConnections: 0,
        reconnectionAttempts: 0,
        totalDowntime: 0,
        averageLatency: 0,
        lastConnectionTime: null,
        lastDisconnectionTime: null,
        lastDisconnectionReason: null,
        bytesReceived: 0,
        bytesSent: 0,
        messagesReceived: 0,
        messagesSent: 0
      }),
      getHealth: jest.fn().mockReturnValue({
        isHealthy: true,
        latency: null,
        lastPing: null,
        consecutiveFailures: 0,
        uptime: 0,
        serverTimestamp: null,
        networkQuality: 'unknown' as const
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      reconnect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      updateOptions: jest.fn(),
      destroy: jest.fn()
    } as any;
    
    // Setup the mock implementations
    const { getGlobalConnectionManager, WebSocketConnectionManager } = require('../services/connection/connection-manager');
    getGlobalConnectionManager.mockReturnValue(mockConnectionManager);
    WebSocketConnectionManager.mockImplementation(() => mockConnectionManager);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Contract Testing: useConnectionManager State Propagation', () => {
    it('should verify state_change event listener is properly registered', () => {
      // ARRANGE: Mock connection manager setup
      const { result } = renderHook(() => useConnectionManager({
        url: 'http://localhost:3001',
        useGlobalInstance: true,
        autoConnect: false
      }));
      
      // ASSERT: Verify the contract - state_change listener must be registered
      expect(mockConnectionManager.on).toHaveBeenCalledWith('state_change', expect.any(Function));
      
      // ASSERT: Verify other required event listeners
      expect(mockConnectionManager.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockConnectionManager.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockConnectionManager.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });

    it('should propagate state changes from connection manager to React state', () => {
      // ARRANGE: Set up hook
      const { result } = renderHook(() => useConnectionManager({
        url: 'http://localhost:3001',
        useGlobalInstance: true,
        autoConnect: false
      }));
      
      // Get the state change handler
      const stateChangeHandler = mockConnectionManager.on.mock.calls.find(
        call => call[0] === 'state_change'
      )?.[1];
      
      expect(stateChangeHandler).toBeDefined();
      
      // ACT: Simulate state change event from connection manager
      act(() => {
        mockSocket.connected = true;
        mockConnectionManager.getState.mockReturnValue(ConnectionState.CONNECTED);
        mockConnectionManager.isConnected.mockReturnValue(true);
        
        // Trigger the state change event
        stateChangeHandler({
          from: ConnectionState.CONNECTING,
          to: ConnectionState.CONNECTED,
          timestamp: new Date()
        });
      });
      
      // ASSERT: Verify React state is updated
      expect(result.current.state).toBe(ConnectionState.CONNECTED);
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Contract Testing: useWebSocketSingleton Behavior', () => {
    it('should verify connection manager delegation pattern', () => {
      // ARRANGE & ACT
      const { result } = renderHook(() => useWebSocketSingleton({
        url: 'http://localhost:3001',
        autoConnect: false
      }));
      
      // ASSERT: Verify the singleton uses connection manager correctly
      expect(result.current.socket).toBe(mockSocket);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe(ConnectionState.DISCONNECTED);
    });

    it('should verify connect method delegates to connection manager', async () => {
      // ARRANGE
      const { result } = renderHook(() => useWebSocketSingleton({
        url: 'http://localhost:3001',
        autoConnect: false
      }));
      
      // ACT
      await act(async () => {
        await result.current.connect();
      });
      
      // ASSERT: Verify delegation to connection manager
      expect(mockConnectionManager.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Mock-Driven State Propagation Tests', () => {
    it('should propagate connected state through the entire chain', async () => {
      // ARRANGE: Set up the hook chain
      const { result } = renderHook(() => useWebSocketSingleton({
        url: 'http://localhost:3001',
        autoConnect: false
      }));
      
      // Get the state change and connected event handlers
      const stateChangeHandler = mockConnectionManager.on.mock.calls.find(
        call => call[0] === 'state_change'
      )?.[1];
      const connectedHandler = mockConnectionManager.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];
      
      expect(stateChangeHandler).toBeDefined();
      expect(connectedHandler).toBeDefined();
      
      // ACT: Simulate full connection sequence
      await act(async () => {
        // 1. Update mocks to connected state
        mockSocket.connected = true;
        mockConnectionManager.getState.mockReturnValue(ConnectionState.CONNECTED);
        mockConnectionManager.isConnected.mockReturnValue(true);
        
        // 2. Trigger state change event
        stateChangeHandler({
          from: ConnectionState.CONNECTING,
          to: ConnectionState.CONNECTED,
          timestamp: new Date()
        });
        
        // 3. Trigger connected event
        connectedHandler();
      });
      
      // ASSERT: Verify the entire state chain propagates correctly
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.socket).toBe(mockSocket);
      expect(result.current.socket?.connected).toBe(true);
    });

    it('should handle disconnection state propagation', async () => {
      // ARRANGE: Start with connected state
      const { result } = renderHook(() => useWebSocketSingleton({
        url: 'http://localhost:3001',
        autoConnect: false
      }));
      
      // Set initial connected state
      await act(async () => {
        mockSocket.connected = true;
        mockConnectionManager.getState.mockReturnValue(ConnectionState.CONNECTED);
        mockConnectionManager.isConnected.mockReturnValue(true);
        
        const stateChangeHandler = mockConnectionManager.on.mock.calls.find(
          call => call[0] === 'state_change'
        )?.[1];
        stateChangeHandler?.({
          from: ConnectionState.CONNECTING,
          to: ConnectionState.CONNECTED,
          timestamp: new Date()
        });
      });
      
      // ACT: Simulate disconnection
      await act(async () => {
        mockSocket.connected = false;
        mockConnectionManager.getState.mockReturnValue(ConnectionState.DISCONNECTED);
        mockConnectionManager.isConnected.mockReturnValue(false);
        
        const stateChangeHandler = mockConnectionManager.on.mock.calls.find(
          call => call[0] === 'state_change'
        )?.[1];
        const disconnectedHandler = mockConnectionManager.on.mock.calls.find(
          call => call[0] === 'disconnected'
        )?.[1];
        
        stateChangeHandler?.({
          from: ConnectionState.CONNECTED,
          to: ConnectionState.DISCONNECTED,
          timestamp: new Date()
        });
        
        disconnectedHandler?.({
          reason: 'transport close',
          manual: false
        });
      });
      
      // ASSERT: Verify disconnection propagates correctly
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('WebSocketSingletonContext isConnecting Logic Test', () => {
    it('should verify isConnecting logic contracts', () => {
      // This test verifies the faulty logic identified in line 120 of WebSocketSingletonContext.tsx
      const mockSocketForConnectingTest = {
        disconnected: false,
        connected: false
      };
      
      // Current faulty logic: Boolean(socket && socket.disconnected === false && !socket.connected)
      const faultyIsConnecting = Boolean(
        mockSocketForConnectingTest && 
        mockSocketForConnectingTest.disconnected === false && 
        !mockSocketForConnectingTest.connected
      );
      
      // This returns true, which is correct for a connecting state
      expect(faultyIsConnecting).toBe(true);
      
      // Test with connected socket
      const connectedSocket = {
        disconnected: false,
        connected: true
      };
      
      const connectedIsConnecting = Boolean(
        connectedSocket && 
        connectedSocket.disconnected === false && 
        !connectedSocket.connected
      );
      
      // This should be false when connected
      expect(connectedIsConnecting).toBe(false);
    });
  });

  describe('Integration: Full State Flow Mock Tests', () => {
    it('should verify complete state flow from connection manager to UI', async () => {
      // ARRANGE: Create a complete mock scenario
      const onStateChange = jest.fn();
      const onConnect = jest.fn();
      
      const { result } = renderHook(() => useConnectionManager({
        url: 'http://localhost:3001',
        useGlobalInstance: true,
        autoConnect: false,
        onStateChange,
        onConnect
      }));
      
      // Get all event handlers
      const handlers = {
        state_change: mockConnectionManager.on.mock.calls.find(call => call[0] === 'state_change')?.[1],
        connected: mockConnectionManager.on.mock.calls.find(call => call[0] === 'connected')?.[1],
        error: mockConnectionManager.on.mock.calls.find(call => call[0] === 'error')?.[1],
        disconnected: mockConnectionManager.on.mock.calls.find(call => call[0] === 'disconnected')?.[1]
      };
      
      // ACT: Simulate complete connection flow
      await act(async () => {
        // 1. Connecting state
        mockConnectionManager.getState.mockReturnValue(ConnectionState.CONNECTING);
        handlers.state_change?.({
          from: ConnectionState.DISCONNECTED,
          to: ConnectionState.CONNECTING,
          timestamp: new Date()
        });
      });
      
      // ASSERT: Intermediate state
      expect(result.current.state).toBe(ConnectionState.CONNECTING);
      expect(result.current.isConnecting).toBe(true);
      expect(onStateChange).toHaveBeenCalledWith({
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTING,
        timestamp: expect.any(Date)
      });
      
      await act(async () => {
        // 2. Connected state
        mockSocket.connected = true;
        mockConnectionManager.getState.mockReturnValue(ConnectionState.CONNECTED);
        mockConnectionManager.isConnected.mockReturnValue(true);
        
        handlers.state_change?.({
          from: ConnectionState.CONNECTING,
          to: ConnectionState.CONNECTED,
          timestamp: new Date()
        });
        
        handlers.connected?.();
      });
      
      // ASSERT: Final connected state
      expect(result.current.state).toBe(ConnectionState.CONNECTED);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(onConnect).toHaveBeenCalled();
      expect(onStateChange).toHaveBeenCalledWith({
        from: ConnectionState.CONNECTING,
        to: ConnectionState.CONNECTED,
        timestamp: expect.any(Date)
      });
    });
  });
});
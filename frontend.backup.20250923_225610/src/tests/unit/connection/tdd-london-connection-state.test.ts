/**
 * TDD London School Connection State Management Tests
 * 
 * Tests focus on behavior verification and object collaboration patterns.
 * Uses outside-in development to test the exact scenario:
 * "Backend WebSocket connects successfully but frontend UI shows 'Disconnected'"
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { Socket } from 'socket.io-client';

// Mock modules at the top level
jest.mock('socket.io-client');
jest.mock('@/services/connection/connection-manager');
jest.mock('@/hooks/useConnectionManager');

import { WebSocketConnectionManager } from '@/services/connection/connection-manager';
import { useConnectionManager } from '@/hooks/useConnectionManager';
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';
import { ConnectionState } from '@/services/connection/types';

// London School TDD: Define mock contracts first
interface MockSocket extends Partial<Socket> {
  connected: boolean;
  disconnected: boolean;
  id?: string;
  emit: jest.MockedFunction<any>;
  on: jest.MockedFunction<any>;
  off: jest.MockedFunction<any>;
  once: jest.MockedFunction<any>;
  connect: jest.MockedFunction<any>;
  disconnect: jest.MockedFunction<any>;
  removeAllListeners: jest.MockedFunction<any>;
}

interface MockConnectionManager {
  getState: jest.MockedFunction<() => ConnectionState>;
  getSocket: jest.MockedFunction<() => MockSocket | null>;
  isConnected: jest.MockedFunction<() => boolean>;
  connect: jest.MockedFunction<() => Promise<void>>;
  disconnect: jest.MockedFunction<() => Promise<void>>;
  on: jest.MockedFunction<(event: string, handler: Function) => void>;
  off: jest.MockedFunction<(event: string, handler: Function) => void>;
  emit: jest.MockedFunction<(event: string, data: any) => void>;
  getMetrics: jest.MockedFunction<() => any>;
  getHealth: jest.MockedFunction<() => any>;
  destroy: jest.MockedFunction<() => void>;
}

// Mock factory functions
const createMockSocket = (overrides: Partial<MockSocket> = {}): MockSocket => ({
  connected: false,
  disconnected: true,
  id: 'mock-socket-id',
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn(),
  ...overrides
});

const createMockConnectionManager = (overrides: Partial<MockConnectionManager> = {}): MockConnectionManager => ({
  getState: jest.fn(() => ConnectionState.DISCONNECTED),
  getSocket: jest.fn(() => null),
  isConnected: jest.fn(() => false),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  getMetrics: jest.fn(() => ({})),
  getHealth: jest.fn(() => ({})),
  destroy: jest.fn(),
  ...overrides
});

describe('TDD London School: Connection State Management', () => {
  let mockSocket: MockSocket;
  let mockConnectionManager: MockConnectionManager;
  let mockUseConnectionManager: jest.MockedFunction<typeof useConnectionManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks for each test
    mockSocket = createMockSocket();
    mockConnectionManager = createMockConnectionManager();
    
    // Setup mock returns
    mockUseConnectionManager = useConnectionManager as jest.MockedFunction<typeof useConnectionManager>;
    mockUseConnectionManager.mockReturnValue({
      state: ConnectionState.DISCONNECTED,
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      hasError: false,
      connect: mockConnectionManager.connect,
      disconnect: mockConnectionManager.disconnect,
      reconnect: jest.fn(),
      metrics: {},
      health: {},
      lastError: null,
      currentAttempt: 0,
      maxAttempts: 10,
      socket: mockSocket,
      manager: mockConnectionManager as any
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Feature: Backend Connection Success with Frontend Disconnect Display Bug', () => {
    
    it('should propagate backend connection success to frontend state', async () => {
      // ARRANGE: Mock backend successful connection
      const connectedSocket = createMockSocket({
        connected: true,
        disconnected: false
      });
      
      const connectedManager = createMockConnectionManager({
        getState: jest.fn(() => ConnectionState.CONNECTED),
        getSocket: jest.fn(() => connectedSocket),
        isConnected: jest.fn(() => true)
      });

      mockUseConnectionManager.mockReturnValue({
        state: ConnectionState.CONNECTED,
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        connect: connectedManager.connect,
        disconnect: connectedManager.disconnect,
        reconnect: jest.fn(),
        metrics: {},
        health: {},
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 10,
        socket: connectedSocket,
        manager: connectedManager as any
      });

      // ACT: Use the connection hook
      const { result } = renderHook(() => useWebSocketSingleton());

      // ASSERT: Verify collaboration between hook and manager
      expect(mockUseConnectionManager).toHaveBeenCalledWith({
        url: expect.any(String),
        useGlobalInstance: true,
        autoConnect: true
      });
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.socket).toBe(connectedSocket);
    });

    it('should detect state mismatch between socket and manager', () => {
      // ARRANGE: Create problematic state - socket connected but manager shows disconnected
      const connectedSocket = createMockSocket({
        connected: true,
        disconnected: false
      });
      
      const disconnectedManager = createMockConnectionManager({
        getState: jest.fn(() => ConnectionState.DISCONNECTED),
        getSocket: jest.fn(() => connectedSocket),
        isConnected: jest.fn(() => false) // Bug: manager doesn't detect socket connection
      });

      mockUseConnectionManager.mockReturnValue({
        state: ConnectionState.DISCONNECTED,
        isConnected: false, // Frontend shows disconnected
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        connect: disconnectedManager.connect,
        disconnect: disconnectedManager.disconnect,
        reconnect: jest.fn(),
        metrics: {},
        health: {},
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 10,
        socket: connectedSocket, // But socket is actually connected
        manager: disconnectedManager as any
      });

      // ACT: Use the connection hook
      const { result } = renderHook(() => useWebSocketSingleton());

      // ASSERT: Verify the bug scenario exists
      expect(result.current.socket?.connected).toBe(true); // Backend is connected
      expect(result.current.isConnected).toBe(false); // Frontend shows disconnected
      expect(result.current.connectionState).toBe(ConnectionState.DISCONNECTED);
      
      // Verify manager contract violations
      expect(disconnectedManager.getSocket).toHaveBeenCalled();
      expect(disconnectedManager.isConnected).toHaveBeenCalled();
      expect(disconnectedManager.getState).toHaveBeenCalled();
    });

    it('should handle socket connection event properly', () => {
      // ARRANGE: Set up socket with event handlers
      const eventHandlers: Record<string, Function> = {};
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      });

      mockConnectionManager.getSocket.mockReturnValue(mockSocket);

      // ACT: Simulate socket connection event
      if (eventHandlers.connect) {
        act(() => {
          eventHandlers.connect();
        });
      }

      // ASSERT: Verify event handler registration
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });

  describe('Contract: WebSocket Event Propagation', () => {
    
    it('should establish proper event listener contracts', () => {
      // ARRANGE: Set up manager mock to track event registrations
      const eventRegistrations: Array<{ event: string; handler: Function }> = [];
      mockConnectionManager.on.mockImplementation((event: string, handler: Function) => {
        eventRegistrations.push({ event, handler });
      });

      mockUseConnectionManager.mockReturnValue({
        state: ConnectionState.DISCONNECTED,
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        connect: mockConnectionManager.connect,
        disconnect: mockConnectionManager.disconnect,
        reconnect: jest.fn(),
        metrics: {},
        health: {},
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 10,
        socket: mockSocket,
        manager: mockConnectionManager as any
      });

      // ACT: Initialize the hook
      renderHook(() => useWebSocketSingleton());

      // ASSERT: Verify required event contracts
      const expectedEvents = ['state_change', 'error', 'connected', 'disconnected'];
      expectedEvents.forEach(eventName => {
        expect(mockConnectionManager.on).toHaveBeenCalledWith(
          eventName, 
          expect.any(Function)
        );
      });
    });

    it('should cleanup event listeners on unmount', () => {
      // ARRANGE: Track cleanup calls
      const cleanupCalls: Array<{ event: string; handler: Function }> = [];
      mockConnectionManager.off.mockImplementation((event: string, handler: Function) => {
        cleanupCalls.push({ event, handler });
      });

      mockUseConnectionManager.mockReturnValue({
        state: ConnectionState.DISCONNECTED,
        isConnected: false,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        connect: mockConnectionManager.connect,
        disconnect: mockConnectionManager.disconnect,
        reconnect: jest.fn(),
        metrics: {},
        health: {},
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 10,
        socket: mockSocket,
        manager: mockConnectionManager as any
      });

      // ACT: Mount and unmount hook
      const { unmount } = renderHook(() => useWebSocketSingleton());
      unmount();

      // ASSERT: Verify cleanup was called
      expect(mockConnectionManager.off).toHaveBeenCalled();
    });
  });

  describe('Behavior: Connection State Transitions', () => {
    
    it('should follow proper state transition workflow for connection', async () => {
      // ARRANGE: Track state changes
      const stateChanges: ConnectionState[] = [];
      let stateChangeHandler: Function | null = null;
      
      mockConnectionManager.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'state_change') {
          stateChangeHandler = handler;
        }
      });

      // Mock progressive state updates
      mockUseConnectionManager
        .mockReturnValueOnce({
          state: ConnectionState.DISCONNECTED,
          isConnected: false,
          isConnecting: false,
          isReconnecting: false,
          hasError: false,
          connect: mockConnectionManager.connect,
          disconnect: mockConnectionManager.disconnect,
          reconnect: jest.fn(),
          metrics: {},
          health: {},
          lastError: null,
          currentAttempt: 0,
          maxAttempts: 10,
          socket: null,
          manager: mockConnectionManager as any
        })
        .mockReturnValueOnce({
          state: ConnectionState.CONNECTING,
          isConnected: false,
          isConnecting: true,
          isReconnecting: false,
          hasError: false,
          connect: mockConnectionManager.connect,
          disconnect: mockConnectionManager.disconnect,
          reconnect: jest.fn(),
          metrics: {},
          health: {},
          lastError: null,
          currentAttempt: 0,
          maxAttempts: 10,
          socket: mockSocket,
          manager: mockConnectionManager as any
        })
        .mockReturnValue({
          state: ConnectionState.CONNECTED,
          isConnected: true,
          isConnecting: false,
          isReconnecting: false,
          hasError: false,
          connect: mockConnectionManager.connect,
          disconnect: mockConnectionManager.disconnect,
          reconnect: jest.fn(),
          metrics: {},
          health: {},
          lastError: null,
          currentAttempt: 0,
          maxAttempts: 10,
          socket: mockSocket,
          manager: mockConnectionManager as any
        });

      // ACT: Initialize hook and trigger connection
      const { result, rerender } = renderHook(() => useWebSocketSingleton());
      
      await act(async () => {
        await result.current.connect();
        rerender();
      });

      // ASSERT: Verify state transition workflow
      expect(mockConnectionManager.connect).toHaveBeenCalled();
      expect(mockConnectionManager.on).toHaveBeenCalledWith('state_change', expect.any(Function));
      
      // Verify final connected state
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
    });

    it('should handle connection errors gracefully', async () => {
      // ARRANGE: Mock connection failure
      const connectionError = new Error('Connection failed');
      mockConnectionManager.connect.mockRejectedValue(connectionError);

      // ACT & ASSERT: Verify error handling
      const { result } = renderHook(() => useWebSocketSingleton());
      
      await expect(result.current.connect()).rejects.toThrow('Connection failed');
      expect(mockConnectionManager.connect).toHaveBeenCalled();
    });
  });

  describe('Mock Collaboration: UI State Updates', () => {
    
    it('should coordinate between connection manager and UI components', () => {
      // ARRANGE: Mock UI component collaboration
      const mockUIStateHandler = jest.fn();
      
      // Track when state changes are emitted
      mockConnectionManager.emit.mockImplementation((event: string, data: any) => {
        if (event === 'state_change') {
          mockUIStateHandler(data);
        }
      });

      mockUseConnectionManager.mockReturnValue({
        state: ConnectionState.CONNECTED,
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        connect: mockConnectionManager.connect,
        disconnect: mockConnectionManager.disconnect,
        reconnect: jest.fn(),
        metrics: {},
        health: {},
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 10,
        socket: mockSocket,
        manager: mockConnectionManager as any
      });

      // ACT: Use the hook (simulating UI component)
      const { result } = renderHook(() => useWebSocketSingleton());

      // ASSERT: Verify UI gets correct connection state
      expect(result.current.isConnected).toBe(true);
      expect(result.current.socket).toBe(mockSocket);
      
      // Verify manager contract
      expect(mockConnectionManager.getSocket).toHaveBeenCalled();
    });

    it('should emit events properly when connection state changes', () => {
      // ARRANGE: Set up event emission tracking
      const emittedEvents: Array<{ event: string; data: any }> = [];
      mockConnectionManager.emit.mockImplementation((event: string, data: any) => {
        emittedEvents.push({ event, data });
      });

      // ACT: Use the connection hook
      const { result } = renderHook(() => useWebSocketSingleton());

      // Simulate emitting a connection event
      act(() => {
        result.current.emit('test_event', { test: 'data' });
      });

      // ASSERT: Verify event emission through socket
      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { test: 'data' });
    });
  });

  describe('Edge Cases: Connection State Synchronization', () => {
    
    it('should handle socket reconnection without manager awareness', () => {
      // ARRANGE: Socket reconnects but manager doesn't know
      const asyncSocket = createMockSocket({
        connected: false,
        disconnected: true
      });

      const outOfSyncManager = createMockConnectionManager({
        getSocket: jest.fn(() => asyncSocket),
        getState: jest.fn(() => ConnectionState.CONNECTED), // Manager thinks connected
        isConnected: jest.fn(() => true)
      });

      mockUseConnectionManager.mockReturnValue({
        state: ConnectionState.CONNECTED,
        isConnected: true, // Manager reports connected
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        connect: outOfSyncManager.connect,
        disconnect: outOfSyncManager.disconnect,
        reconnect: jest.fn(),
        metrics: {},
        health: {},
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 10,
        socket: asyncSocket, // But socket is actually disconnected
        manager: outOfSyncManager as any
      });

      // ACT: Use the hook
      const { result } = renderHook(() => useWebSocketSingleton());

      // ASSERT: Detect synchronization issue
      expect(result.current.isConnected).toBe(true); // Manager says connected
      expect(result.current.socket?.connected).toBe(false); // Socket says disconnected
      
      // This reveals the bug scenario
      expect(outOfSyncManager.getSocket).toHaveBeenCalled();
      expect(outOfSyncManager.isConnected).toHaveBeenCalled();
    });

    it('should handle rapid connect/disconnect cycles', async () => {
      // ARRANGE: Mock rapid state changes
      const rapidStateChanges = [
        ConnectionState.CONNECTING,
        ConnectionState.CONNECTED,
        ConnectionState.DISCONNECTED,
        ConnectionState.CONNECTING,
        ConnectionState.CONNECTED
      ];

      let stateIndex = 0;
      mockConnectionManager.getState.mockImplementation(() => {
        return rapidStateChanges[stateIndex++ % rapidStateChanges.length];
      });

      // ACT & ASSERT: Verify stable behavior during rapid changes
      const { result } = renderHook(() => useWebSocketSingleton());
      
      // Simulate rapid connect/disconnect
      await act(async () => {
        await result.current.connect();
        await result.current.disconnect();
        await result.current.connect();
      });

      // Verify all operations were attempted
      expect(mockConnectionManager.connect).toHaveBeenCalledTimes(2);
      expect(mockConnectionManager.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
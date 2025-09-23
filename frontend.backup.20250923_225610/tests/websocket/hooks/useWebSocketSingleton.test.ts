/**
 * TDD London School Tests - useWebSocketSingleton Hook
 * Focus on interactions and mock-driven behavior verification
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocketSingleton } from '../../../src/hooks/useWebSocketSingleton';
import { MockWebSocketConnectionManager, createMockConnectionManager } from '../mocks/connection-manager-mock';
import { ConnectionState } from '../../../src/services/connection/types';

// Mock the connection manager module
jest.mock('../../../src/hooks/useConnectionManager');
import { useConnectionManager } from '../../../src/hooks/useConnectionManager';

describe('TDD London School: useWebSocketSingleton Hook', () => {
  let mockManager: MockWebSocketConnectionManager;
  let mockUseConnectionManager: jest.MockedFunction<typeof useConnectionManager>;
  
  beforeEach(() => {
    mockManager = createMockConnectionManager.disconnected();
    mockUseConnectionManager = useConnectionManager as jest.MockedFunction<typeof useConnectionManager>;
    
    // Default mock implementation
    mockUseConnectionManager.mockReturnValue({
      socket: mockManager.getSocket(),
      isConnected: mockManager.isConnected(),
      state: mockManager.getState(),
      connect: jest.fn().mockImplementation(() => mockManager.connect()),
      disconnect: jest.fn().mockImplementation((manual) => mockManager.disconnect(manual)),
      reconnect: jest.fn().mockImplementation(() => mockManager.reconnect()),
      isConnecting: mockManager.getState() === ConnectionState.CONNECTING,
      isReconnecting: mockManager.getState() === ConnectionState.RECONNECTING,
      hasError: mockManager.getState() === ConnectionState.ERROR,
      metrics: mockManager.getMetrics(),
      health: mockManager.getHealth(),
      lastError: null,
      currentAttempt: 0,
      maxAttempts: 5,
      manager: mockManager
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    mockManager.destroy();
  });
  
  describe('Hook Initialization and Contract Verification', () => {
    it('should call useConnectionManager with correct parameters', () => {
      const options = {
        url: 'http://localhost:3002',
        autoConnect: false,
        maxReconnectAttempts: 3
      };
      
      renderHook(() => useWebSocketSingleton(options));
      
      // Verify the hook calls useConnectionManager with expected parameters
      expect(mockUseConnectionManager).toHaveBeenCalledWith({
        url: 'http://localhost:3002',
        useGlobalInstance: true,
        autoConnect: true, // Should default to true
        maxReconnectAttempts: 3
      });
    });
    
    it('should use default URL when not provided', () => {
      renderHook(() => useWebSocketSingleton());
      
      expect(mockUseConnectionManager).toHaveBeenCalledWith(
        expect.objectContaining({
          url: import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3001',
          useGlobalInstance: true,
          autoConnect: true
        })
      );
    });
    
    it('should derive isConnected state correctly from manager state and socket status', async () => {
      // Test the critical race condition logic
      mockManager = createMockConnectionManager.raceCondition();
      
      mockUseConnectionManager.mockReturnValue({
        socket: mockManager.getSocket(),
        isConnected: mockManager.isConnected(), // Should be false due to race condition
        state: mockManager.getState(), // CONNECTED
        connect: jest.fn(),
        disconnect: jest.fn(),
        reconnect: jest.fn(),
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        metrics: mockManager.getMetrics(),
        health: mockManager.getHealth(),
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 5,
        manager: mockManager
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      // Manager state is CONNECTED but socket.connected is false
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.isConnected).toBe(false); // Race condition detected
      expect(result.current.socket?.connected).toBe(false);
    });
  });
  
  describe('Connection State Propagation Chain', () => {
    it('should propagate state changes from connection manager to hook consumers', async () => {
      const { result } = renderHook(() => useWebSocketSingleton());
      
      // Initially disconnected
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe(ConnectionState.DISCONNECTED);
      
      // Simulate connection manager state change
      await act(async () => {
        await mockManager.connect();
        
        // Update the mock to reflect new state
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          socket: mockManager.getSocket(),
          isConnected: mockManager.isConnected(),
          state: mockManager.getState(),
          isConnecting: false
        });
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      });
    });
    
    it('should handle connecting state transitions', async () => {
      mockManager = createMockConnectionManager.connecting();
      
      mockUseConnectionManager.mockReturnValue({
        socket: mockManager.getSocket(),
        isConnected: false,
        state: ConnectionState.CONNECTING,
        connect: jest.fn(),
        disconnect: jest.fn(),
        reconnect: jest.fn(),
        isConnecting: true,
        isReconnecting: false,
        hasError: false,
        metrics: mockManager.getMetrics(),
        health: mockManager.getHealth(),
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 5,
        manager: mockManager
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTING);
    });
  });
  
  describe('Backward Compatibility Layer', () => {
    it('should provide backward compatible connect method', async () => {
      const mockConnect = jest.fn().mockResolvedValue(undefined);
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        connect: mockConnect
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(mockConnect).toHaveBeenCalledWith();
    });
    
    it('should provide backward compatible disconnect method', async () => {
      const mockDisconnect = jest.fn().mockResolvedValue(undefined);
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        disconnect: mockDisconnect
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      await act(async () => {
        await result.current.disconnect();
      });
      
      expect(mockDisconnect).toHaveBeenCalledWith(true);
    });
  });
  
  describe('Socket Event Interface', () => {
    it('should delegate emit calls to socket when socket is available', () => {
      const mockSocket = {
        id: 'test-socket',
        connected: true,
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };
      
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        socket: mockSocket,
        isConnected: true
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      act(() => {
        result.current.emit('test_event', { data: 'test' });
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test_event', { data: 'test' });
    });
    
    it('should not throw when emit is called with null socket', () => {
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        socket: null,
        isConnected: false
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      expect(() => {
        act(() => {
          result.current.emit('test_event', { data: 'test' });
        });
      }).not.toThrow();
    });
    
    it('should delegate event listener registration to socket', () => {
      const mockSocket = {
        id: 'test-socket',
        connected: true,
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };
      
      const mockHandler = jest.fn();
      
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        socket: mockSocket,
        isConnected: true
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      act(() => {
        result.current.on('test_event', mockHandler);
      });
      
      expect(mockSocket.on).toHaveBeenCalledWith('test_event', mockHandler);
    });
    
    it('should delegate event listener removal to socket', () => {
      const mockSocket = {
        id: 'test-socket',
        connected: true,
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };
      
      const mockHandler = jest.fn();
      
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        socket: mockSocket,
        isConnected: true
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      act(() => {
        result.current.off('test_event', mockHandler);
      });
      
      expect(mockSocket.off).toHaveBeenCalledWith('test_event', mockHandler);
    });
  });
  
  describe('Race Condition Handling', () => {
    it('should detect when manager reports CONNECTED but socket is not connected', () => {
      // Set up race condition scenario
      const mockSocket = {
        id: 'test-socket',
        connected: false, // Socket not connected
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };
      
      mockUseConnectionManager.mockReturnValue({
        socket: mockSocket,
        isConnected: false, // Manager correctly detects the race condition
        state: ConnectionState.CONNECTED, // Manager state is CONNECTED
        connect: jest.fn(),
        disconnect: jest.fn(),
        reconnect: jest.fn(),
        isConnecting: false,
        isReconnecting: false,
        hasError: false,
        metrics: mockManager.getMetrics(),
        health: mockManager.getHealth(),
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 5,
        manager: mockManager
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      // Should show disconnected even though manager state is CONNECTED
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTED);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.socket?.connected).toBe(false);
    });
    
    it('should handle isConnecting state race condition correctly', () => {
      const mockSocket = {
        id: 'test-socket',
        connected: false,
        connecting: true,
        disconnected: false,
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      };
      
      mockUseConnectionManager.mockReturnValue({
        socket: mockSocket,
        isConnected: false,
        state: ConnectionState.CONNECTING,
        connect: jest.fn(),
        disconnect: jest.fn(),
        reconnect: jest.fn(),
        isConnecting: true,
        isReconnecting: false,
        hasError: false,
        metrics: mockManager.getMetrics(),
        health: mockManager.getHealth(),
        lastError: null,
        currentAttempt: 0,
        maxAttempts: 5,
        manager: mockManager
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState).toBe(ConnectionState.CONNECTING);
    });
  });
  
  describe('Debug Logging and State Tracking', () => {
    beforeEach(() => {
      // Mock console.log to verify debug output
      jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });
    
    it('should log state changes for debugging', () => {
      const { result } = renderHook(() => useWebSocketSingleton({
        url: 'http://localhost:3002'
      }));
      
      // Should have logged the initial state
      expect(console.log).toHaveBeenCalledWith(
        '🔧 useWebSocketSingleton: Connection manager state changed',
        expect.objectContaining({
          url: 'http://localhost:3002',
          isConnected: expect.any(Boolean),
          state: expect.any(String)
        })
      );
    });
  });
  
  describe('Error Scenarios', () => {
    it('should handle connection manager errors gracefully', async () => {
      const mockError = new Error('Connection failed');
      const mockConnect = jest.fn().mockRejectedValue(mockError);
      
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        connect: mockConnect,
        hasError: true,
        state: ConnectionState.ERROR
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      await expect(async () => {
        await act(async () => {
          await result.current.connect();
        });
      }).rejects.toThrow('Connection failed');
      
      expect(result.current.connectionState).toBe(ConnectionState.ERROR);
    });
    
    it('should handle disconnection errors gracefully', async () => {
      const mockError = new Error('Disconnection failed');
      const mockDisconnect = jest.fn().mockRejectedValue(mockError);
      
      mockUseConnectionManager.mockReturnValue({
        ...mockUseConnectionManager.mock.results[0].value,
        disconnect: mockDisconnect
      });
      
      const { result } = renderHook(() => useWebSocketSingleton());
      
      await expect(async () => {
        await act(async () => {
          await result.current.disconnect();
        });
      }).rejects.toThrow('Disconnection failed');
    });
  });
});
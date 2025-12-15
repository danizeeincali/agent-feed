/**
 * TDD London School Tests - useConnectionManager Hook
 * Mock-driven testing focused on collaboration and state management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnectionManager } from '../../../src/hooks/useConnectionManager';
import { MockWebSocketConnectionManager, createMockConnectionManager } from '../mocks/connection-manager-mock';
import { ConnectionState } from '../../../src/services/connection/types';

// Mock the connection manager module
jest.mock('../../../src/services/connection/connection-manager');
import { WebSocketConnectionManager, getGlobalConnectionManager } from '../../../src/services/connection/connection-manager';

describe('TDD London School: useConnectionManager Hook', () => {
  let mockManager: MockWebSocketConnectionManager;
  let mockGetGlobalConnectionManager: jest.MockedFunction<typeof getGlobalConnectionManager>;
  let mockWebSocketConnectionManager: jest.MockedClass<typeof WebSocketConnectionManager>;
  
  beforeEach(() => {
    mockManager = createMockConnectionManager.disconnected();
    
    mockWebSocketConnectionManager = WebSocketConnectionManager as jest.MockedClass<typeof WebSocketConnectionManager>;
    mockWebSocketConnectionManager.mockImplementation(() => mockManager as any);
    
    mockGetGlobalConnectionManager = getGlobalConnectionManager as jest.MockedFunction<typeof getGlobalConnectionManager>;
    mockGetGlobalConnectionManager.mockReturnValue(mockManager as any);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    mockManager.destroy();
  });
  
  describe('Hook Initialization and Manager Creation', () => {
    it('should use global connection manager when useGlobalInstance is true', () => {
      renderHook(() => useConnectionManager({
        useGlobalInstance: true,
        url: 'http://localhost:3001'
      }));
      
      expect(mockGetGlobalConnectionManager).toHaveBeenCalledWith({
        url: 'http://localhost:3001'
      });
      expect(mockWebSocketConnectionManager).not.toHaveBeenCalled();
    });
    
    it('should create new connection manager when useGlobalInstance is false', () => {
      renderHook(() => useConnectionManager({
        useGlobalInstance: false,
        url: 'http://localhost:3001',
        autoConnect: false
      }));
      
      expect(mockWebSocketConnectionManager).toHaveBeenCalledWith({
        url: 'http://localhost:3001',
        autoConnect: false
      });
    });
    
    it('should default to using global instance', () => {
      renderHook(() => useConnectionManager());
      
      expect(mockGetGlobalConnectionManager).toHaveBeenCalled();
    });
  });
  
  describe('State Synchronization with Connection Manager', () => {
    it('should initialize state from connection manager', async () => {
      const connectedManager = createMockConnectionManager.connected();
      mockGetGlobalConnectionManager.mockReturnValue(connectedManager as any);
      
      const { result } = renderHook(() => useConnectionManager({
        useGlobalInstance: true
      }));
      
      expect(result.current.state).toBe(ConnectionState.CONNECTED);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isReconnecting).toBe(false);
      expect(result.current.hasError).toBe(false);
      
      connectedManager.destroy();
    });
    
    it('should update state when manager fires state_change event', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      expect(result.current.state).toBe(ConnectionState.DISCONNECTED);
      
      // Simulate manager state change
      await act(async () => {
        await mockManager.connect();
      });
      
      await waitFor(() => {
        expect(result.current.state).toBe(ConnectionState.CONNECTED);
        expect(result.current.isConnected).toBe(true);
      });
    });
    
    it('should handle connecting state correctly', async () => {
      const connectingManager = createMockConnectionManager.connecting();
      mockGetGlobalConnectionManager.mockReturnValue(connectingManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      expect(result.current.state).toBe(ConnectionState.CONNECTING);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.isReconnecting).toBe(false);
      
      connectingManager.destroy();
    });
    
    it('should handle reconnecting state correctly', async () => {
      const reconnectingManager = createMockConnectionManager.reconnecting();
      mockGetGlobalConnectionManager.mockReturnValue(reconnectingManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      expect(result.current.state).toBe(ConnectionState.RECONNECTING);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.isReconnecting).toBe(true);
      
      reconnectingManager.destroy();
    });
    
    it('should handle error state correctly', async () => {
      const errorManager = createMockConnectionManager.error();
      mockGetGlobalConnectionManager.mockReturnValue(errorManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      expect(result.current.state).toBe(ConnectionState.ERROR);
      expect(result.current.isConnected).toBe(false);
      expect(result.current.hasError).toBe(true);
      
      errorManager.destroy();
    });
  });
  
  describe('Critical Race Condition Logic', () => {
    it('should compute isConnected using both state and socket status', async () => {
      // Test the critical race condition fix: isConnected = state === CONNECTED && socket?.connected
      const raceManager = createMockConnectionManager.raceCondition();
      mockGetGlobalConnectionManager.mockReturnValue(raceManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      // Manager state is CONNECTED but socket.connected is false
      expect(result.current.state).toBe(ConnectionState.CONNECTED);
      expect(result.current.socket?.connected).toBe(false);
      expect(result.current.isConnected).toBe(false); // Should be false due to race condition
      
      raceManager.destroy();
    });
    
    it('should log debug information for race condition detection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const raceManager = createMockConnectionManager.raceCondition();
      mockGetGlobalConnectionManager.mockReturnValue(raceManager as any);
      
      renderHook(() => useConnectionManager());
      
      // Should log the race condition debug info
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔧 useConnectionManager: Computing isConnected',
        expect.objectContaining({
          currentState: ConnectionState.CONNECTED,
          socketConnected: false,
          result: false
        })
      );
      
      consoleSpy.mockRestore();
      raceManager.destroy();
    });
    
    it('should update isConnected when socket status changes', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Start disconnected
      expect(result.current.isConnected).toBe(false);
      
      // Connect manager and socket
      await act(async () => {
        await mockManager.connect();
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.state).toBe(ConnectionState.CONNECTED);
        expect(result.current.socket?.connected).toBe(true);
      });
    });
  });
  
  describe('Connection Control Methods', () => {
    it('should delegate connect calls to connection manager', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      await act(async () => {
        await result.current.connect({ timeout: 5000 });
      });
      
      expect(mockManager.getConnectCallCount()).toBe(1);
      expect(result.current.state).toBe(ConnectionState.CONNECTED);
    });
    
    it('should delegate disconnect calls to connection manager', async () => {
      // Start with connected manager
      const connectedManager = createMockConnectionManager.connected();
      mockGetGlobalConnectionManager.mockReturnValue(connectedManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      await act(async () => {
        await result.current.disconnect(true);
      });
      
      expect(connectedManager.getDisconnectCallCount()).toBe(1);
      
      connectedManager.destroy();
    });
    
    it('should delegate reconnect calls to connection manager', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      await act(async () => {
        await result.current.reconnect();
      });
      
      expect(mockManager.getReconnectCallCount()).toBe(1);
    });
    
    it('should handle connection errors properly', async () => {
      const errorManager = createMockConnectionManager.error();
      mockGetGlobalConnectionManager.mockReturnValue(errorManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      await expect(async () => {
        await act(async () => {
          await result.current.connect();
        });
      }).rejects.toThrow('Mock connection failed');
      
      expect(result.current.state).toBe(ConnectionState.ERROR);
      
      errorManager.destroy();
    });
  });
  
  describe('Event Handler Registration', () => {
    it('should register all required event handlers on manager', () => {
      const managerOnSpy = jest.spyOn(mockManager, 'on');
      
      renderHook(() => useConnectionManager());
      
      // Verify all event handlers are registered
      expect(managerOnSpy).toHaveBeenCalledWith('state_change', expect.any(Function));
      expect(managerOnSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(managerOnSpy).toHaveBeenCalledWith('metrics_update', expect.any(Function));
      expect(managerOnSpy).toHaveBeenCalledWith('health_update', expect.any(Function));
      expect(managerOnSpy).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(managerOnSpy).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(managerOnSpy).toHaveBeenCalledWith('reconnection_attempt', expect.any(Function));
    });
    
    it('should handle state_change events', async () => {
      const onStateChange = jest.fn();
      const { result } = renderHook(() => useConnectionManager({
        onStateChange
      }));
      
      await act(async () => {
        await mockManager.connect();
      });
      
      await waitFor(() => {
        expect(onStateChange).toHaveBeenCalledWith({
          from: ConnectionState.DISCONNECTED,
          to: ConnectionState.CONNECTED,
          timestamp: expect.any(Date)
        });
      });
    });
    
    it('should handle error events', async () => {
      const onError = jest.fn();
      renderHook(() => useConnectionManager({ onError }));
      
      const error = new Error('Test error');
      
      act(() => {
        mockManager.emit('error', {
          error,
          context: 'test',
          recoverable: true
        });
      });
      
      expect(onError).toHaveBeenCalledWith({
        error,
        context: 'test',
        recoverable: true
      });
    });
    
    it('should handle connected events', async () => {
      const onConnect = jest.fn();
      renderHook(() => useConnectionManager({ onConnect }));
      
      act(() => {
        mockManager.emit('connected', {
          timestamp: new Date(),
          attempt: 0
        });
      });
      
      expect(onConnect).toHaveBeenCalled();
    });
    
    it('should handle disconnected events', async () => {
      const onDisconnect = jest.fn();
      renderHook(() => useConnectionManager({ onDisconnect }));
      
      const disconnectData = {
        timestamp: new Date(),
        reason: 'manual_disconnect',
        manual: true
      };
      
      act(() => {
        mockManager.emit('disconnected', disconnectData);
      });
      
      expect(onDisconnect).toHaveBeenCalledWith({
        reason: 'manual_disconnect',
        manual: true
      });
    });
    
    it('should handle reconnection_attempt events', async () => {
      const onReconnectionAttempt = jest.fn();
      renderHook(() => useConnectionManager({ onReconnectionAttempt }));
      
      const attemptData = {
        attempt: 1,
        maxAttempts: 5,
        delay: 1000,
        reason: 'connection_lost'
      };
      
      act(() => {
        mockManager.emit('reconnection_attempt', attemptData);
      });
      
      expect(onReconnectionAttempt).toHaveBeenCalledWith(attemptData);
    });
  });
  
  describe('Metrics and Health Tracking', () => {
    it('should provide current metrics from manager', () => {
      const { result } = renderHook(() => useConnectionManager());
      
      const metrics = result.current.metrics;
      
      expect(metrics).toEqual(mockManager.getMetrics());
      expect(metrics.connectionAttempts).toBeGreaterThanOrEqual(0);
      expect(metrics.successfulConnections).toBeGreaterThanOrEqual(0);
    });
    
    it('should provide current health status from manager', () => {
      const connectedManager = createMockConnectionManager.connected();
      mockGetGlobalConnectionManager.mockReturnValue(connectedManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      const health = result.current.health;
      
      expect(health).toEqual(connectedManager.getHealth());
      expect(health.isHealthy).toBe(true);
      expect(health.networkQuality).toBe('excellent');
      
      connectedManager.destroy();
    });
    
    it('should update metrics periodically', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useConnectionManager());
      
      const initialMetrics = result.current.metrics;
      
      // Fast forward 5 seconds (metrics update interval)
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Metrics should be refreshed (even if values are the same)
      expect(result.current.metrics).toBeDefined();
      
      jest.useRealTimers();
    });
  });
  
  describe('Cleanup and Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
      const managerOffSpy = jest.spyOn(mockManager, 'off');
      
      const { unmount } = renderHook(() => useConnectionManager());
      
      unmount();
      
      // Verify all event listeners are removed
      expect(managerOffSpy).toHaveBeenCalledWith('state_change', expect.any(Function));
      expect(managerOffSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(managerOffSpy).toHaveBeenCalledWith('metrics_update', expect.any(Function));
      expect(managerOffSpy).toHaveBeenCalledWith('health_update', expect.any(Function));
      expect(managerOffSpy).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(managerOffSpy).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(managerOffSpy).toHaveBeenCalledWith('reconnection_attempt', expect.any(Function));
    });
    
    it('should destroy non-global manager instance on cleanup', () => {
      const localManager = createMockConnectionManager.disconnected();
      mockWebSocketConnectionManager.mockImplementation(() => localManager as any);
      
      const destroySpy = jest.spyOn(localManager, 'destroy');
      
      const { unmount } = renderHook(() => useConnectionManager({
        useGlobalInstance: false
      }));
      
      unmount();
      
      expect(destroySpy).toHaveBeenCalled();
    });
    
    it('should not destroy global manager instance on cleanup', () => {
      const destroySpy = jest.spyOn(mockManager, 'destroy');
      
      const { unmount } = renderHook(() => useConnectionManager({
        useGlobalInstance: true
      }));
      
      unmount();
      
      expect(destroySpy).not.toHaveBeenCalled();
    });
  });
  
  describe('Debug Logging', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });
    
    it('should log initial state setup', () => {
      renderHook(() => useConnectionManager());
      
      expect(console.log).toHaveBeenCalledWith(
        '🔧 useConnectionManager: Setting initial state',
        expect.objectContaining({
          currentState: ConnectionState.DISCONNECTED,
          socket: mockManager.getSocket(),
          socketConnected: mockManager.getSocket()?.connected
        })
      );
    });
    
    it('should log state derivation debug information', () => {
      renderHook(() => useConnectionManager());
      
      expect(console.log).toHaveBeenCalledWith(
        '🔧 useConnectionManager: State derivation debug',
        expect.objectContaining({
          managerState: ConnectionState.DISCONNECTED,
          socketConnected: expect.any(Boolean),
          derivedIsConnected: expect.any(Boolean),
          managerIsConnected: expect.any(Boolean)
        })
      );
    });
  });
});
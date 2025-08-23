/**
 * TDD London School Race Condition Tests
 * Focused testing of race conditions during connection establishment
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useConnectionManager } from '../../../src/hooks/useConnectionManager';
import { MockWebSocketConnectionManager, createMockConnectionManager } from '../mocks/connection-manager-mock';
import { MockSocket, mockScenarios } from '../mocks/socket-io-mock';
import { ConnectionState } from '../../../src/services/connection/types';

// Mock the dependencies
jest.mock('../../../src/services/connection/connection-manager');
import { WebSocketConnectionManager, getGlobalConnectionManager } from '../../../src/services/connection/connection-manager';

describe('TDD London School: Connection State Race Conditions', () => {
  let mockManager: MockWebSocketConnectionManager;
  let mockSocket: MockSocket;
  let mockGetGlobalConnectionManager: jest.MockedFunction<typeof getGlobalConnectionManager>;
  let mockWebSocketConnectionManager: jest.MockedClass<typeof WebSocketConnectionManager>;
  
  beforeEach(() => {
    mockSocket = mockScenarios.disconnectedSocket();
    mockManager = createMockConnectionManager.disconnected();
    
    mockWebSocketConnectionManager = WebSocketConnectionManager as jest.MockedClass<typeof WebSocketConnectionManager>;
    mockWebSocketConnectionManager.mockImplementation(() => mockManager as any);
    
    mockGetGlobalConnectionManager = getGlobalConnectionManager as jest.MockedFunction<typeof getGlobalConnectionManager>;
    mockGetGlobalConnectionManager.mockReturnValue(mockManager as any);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    mockSocket.destroy();
    mockManager.destroy();
  });
  
  describe('Manager State vs Socket State Race Conditions', () => {
    it('should detect race condition: Manager CONNECTED but socket.connected = false', async () => {
      // Set up race condition scenario
      mockManager.forceState(ConnectionState.CONNECTED);
      mockSocket.forceState({ connected: false, connecting: false, disconnected: false });
      mockManager.forceSocketState({ connected: false });
      
      const { result } = renderHook(() => useConnectionManager());
      
      // isConnected should use the critical race condition formula:
      // isConnected = state === CONNECTED && socket?.connected === true
      expect(result.current.state).toBe(ConnectionState.CONNECTED);
      expect(result.current.socket?.connected).toBe(false);
      expect(result.current.isConnected).toBe(false); // Race condition detected!
      
      // Verify the race condition detection logged
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Force a re-computation
      act(() => {
        mockManager.forceState(ConnectionState.CONNECTED);
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Computing isConnected'),
        expect.objectContaining({
          currentState: ConnectionState.CONNECTED,
          socketConnected: false,
          result: false
        })
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should handle socket connection delay race condition', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Simulate connection attempt
      await act(async () => {
        // Manager immediately sets to CONNECTING
        mockManager.forceState(ConnectionState.CONNECTING);
        mockSocket.forceState({ connected: false, connecting: true, disconnected: false });
      });
      
      expect(result.current.state).toBe(ConnectionState.CONNECTING);
      expect(result.current.isConnecting).toBe(true);
      expect(result.current.isConnected).toBe(false);
      
      // Socket connects but manager hasn't updated yet (race condition)
      await act(async () => {
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
        // Manager still in CONNECTING state
      });
      
      // Should still show not connected until manager updates
      expect(result.current.state).toBe(ConnectionState.CONNECTING);
      expect(result.current.isConnected).toBe(false);
      
      // Manager catches up
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTED);
      });
      
      // Now should be connected
      await waitFor(() => {
        expect(result.current.state).toBe(ConnectionState.CONNECTED);
        expect(result.current.isConnected).toBe(true);
      });
    });
    
    it('should handle disconnect race condition', async () => {
      // Start connected
      mockManager = createMockConnectionManager.connected();
      mockSocket = mockScenarios.connectedSocket();
      mockGetGlobalConnectionManager.mockReturnValue(mockManager as any);
      
      const { result } = renderHook(() => useConnectionManager());
      
      expect(result.current.isConnected).toBe(true);
      
      // Socket disconnects but manager hasn't updated yet
      await act(async () => {
        mockSocket.forceState({ connected: false, connecting: false, disconnected: true });
        // Manager still thinks it's connected
      });
      
      // Race condition: Manager says CONNECTED but socket is disconnected
      expect(result.current.state).toBe(ConnectionState.CONNECTED);
      expect(result.current.socket?.connected).toBe(false);
      expect(result.current.isConnected).toBe(false); // Should be false due to race detection
      
      // Manager catches up
      await act(async () => {
        mockManager.forceState(ConnectionState.DISCONNECTED);
      });
      
      await waitFor(() => {
        expect(result.current.state).toBe(ConnectionState.DISCONNECTED);
        expect(result.current.isConnected).toBe(false);
      });
    });
  });
  
  describe('Connection Establishment Race Conditions', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Rapid connection state changes
      await act(async () => {
        // Start connecting
        mockManager.forceState(ConnectionState.CONNECTING);
        mockSocket.forceState({ connected: false, connecting: true, disconnected: false });
      });
      
      expect(result.current.isConnecting).toBe(true);
      
      await act(async () => {
        // Quick disconnect before connection completes
        mockManager.forceState(ConnectionState.DISCONNECTED);
        mockSocket.forceState({ connected: false, connecting: false, disconnected: true });
      });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      
      await act(async () => {
        // Immediate reconnect attempt
        mockManager.forceState(ConnectionState.CONNECTING);
        mockSocket.forceState({ connected: false, connecting: true, disconnected: false });
      });
      
      expect(result.current.isConnecting).toBe(true);
      
      await act(async () => {
        // Finally connect
        mockManager.forceState(ConnectionState.CONNECTED);
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
    
    it('should handle connection timeout race conditions', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Start connection attempt
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTING);
        mockSocket.forceState({ connected: false, connecting: true, disconnected: false });
      });
      
      expect(result.current.isConnecting).toBe(true);
      
      // Simulate timeout - manager moves to ERROR but socket is still trying
      await act(async () => {
        mockManager.forceState(ConnectionState.ERROR);
        // Socket still in connecting state (race condition)
        mockSocket.forceState({ connected: false, connecting: true, disconnected: false });
      });
      
      // Should show error state (manager wins)
      expect(result.current.hasError).toBe(true);
      expect(result.current.isConnected).toBe(false);
      
      // Socket finally gives up
      await act(async () => {
        mockSocket.forceState({ connected: false, connecting: false, disconnected: true });
      });
      
      expect(result.current.isConnected).toBe(false);
    });
    
    it('should handle socket reconnection without manager knowledge', async () => {
      // Manager thinks it's disconnected
      mockManager.forceState(ConnectionState.DISCONNECTED);
      mockSocket.forceState({ connected: false, connecting: false, disconnected: true });
      
      const { result } = renderHook(() => useConnectionManager());
      
      expect(result.current.isConnected).toBe(false);
      
      // Socket auto-reconnects without manager's knowledge (shouldn't happen but test anyway)
      await act(async () => {
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
        // Manager still thinks disconnected
      });
      
      // Race condition: Socket connected but manager doesn't know
      expect(result.current.state).toBe(ConnectionState.DISCONNECTED);
      expect(result.current.socket?.connected).toBe(true);
      expect(result.current.isConnected).toBe(false); // Manager state wins
      
      // Manager discovers the connection
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTED);
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });
  
  describe('State Transition Race Conditions', () => {
    it('should handle overlapping state transitions', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Simulate multiple state changes happening simultaneously
      await act(async () => {
        // Start connecting
        mockManager.forceState(ConnectionState.CONNECTING);
        
        // Immediately try to connect (race condition in manager)
        mockManager.forceState(ConnectionState.CONNECTED);
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
      });
      
      // Should end up in connected state
      await waitFor(() => {
        expect(result.current.state).toBe(ConnectionState.CONNECTED);
        expect(result.current.isConnected).toBe(true);
      });
    });
    
    it('should handle manager state rollbacks', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Connect successfully
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTED);
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
      });
      
      expect(result.current.isConnected).toBe(true);
      
      // Manager temporarily reports error but socket is still connected
      await act(async () => {
        mockManager.forceState(ConnectionState.ERROR);
        // Socket still connected (race condition)
      });
      
      // Should show disconnected (manager error state)
      expect(result.current.hasError).toBe(true);
      expect(result.current.isConnected).toBe(false);
      
      // Manager realizes socket is actually connected and corrects state
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTED);
      });
      
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.hasError).toBe(false);
      });
    });
  });
  
  describe('Event Handler Race Conditions', () => {
    it('should handle events arriving out of order', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Simulate events arriving out of order
      await act(async () => {
        // Disconnect event arrives first
        mockManager.emit('disconnected', {
          timestamp: new Date(),
          reason: 'transport close',
          manual: false
        });
        
        // But state change event arrives later
        setTimeout(() => {
          mockManager.emit('state_change', {
            from: ConnectionState.CONNECTED,
            to: ConnectionState.DISCONNECTED,
            timestamp: new Date()
          });
        }, 10);
      });
      
      await waitFor(() => {
        expect(result.current.state).toBe(ConnectionState.DISCONNECTED);
      });
    });
    
    it('should handle rapid event sequences', async () => {
      const stateChanges: ConnectionState[] = [];
      const { result } = renderHook(() => useConnectionManager({
        onStateChange: (data) => {
          stateChanges.push(data.to);
        }
      }));
      
      // Rapid sequence of state changes
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTING);
        mockManager.emit('state_change', {
          from: ConnectionState.DISCONNECTED,
          to: ConnectionState.CONNECTING,
          timestamp: new Date()
        });
        
        mockManager.forceState(ConnectionState.CONNECTED);
        mockManager.emit('state_change', {
          from: ConnectionState.CONNECTING,
          to: ConnectionState.CONNECTED,
          timestamp: new Date()
        });
        
        mockManager.forceState(ConnectionState.DISCONNECTED);
        mockManager.emit('state_change', {
          from: ConnectionState.CONNECTED,
          to: ConnectionState.DISCONNECTED,
          timestamp: new Date()
        });
      });
      
      // Should handle all state changes
      expect(stateChanges).toEqual([
        ConnectionState.CONNECTING,
        ConnectionState.CONNECTED,
        ConnectionState.DISCONNECTED
      ]);
      
      expect(result.current.state).toBe(ConnectionState.DISCONNECTED);
    });
  });
  
  describe('Memory and Resource Race Conditions', () => {
    it('should handle cleanup during active connections', async () => {
      const { result, unmount } = renderHook(() => useConnectionManager({
        useGlobalInstance: false // Use local instance for cleanup test
      }));
      
      // Connect first
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTED);
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
      });
      
      expect(result.current.isConnected).toBe(true);
      
      // Unmount while connected (race condition: cleanup vs active connection)
      const destroySpy = jest.spyOn(mockManager, 'destroy');
      
      unmount();
      
      // Should clean up properly
      expect(destroySpy).toHaveBeenCalled();
    });
    
    it('should handle manager destruction during state updates', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Start a state update
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTING);
        
        // Destroy manager during state update (race condition)
        mockManager.destroy();
      });
      
      // Should handle gracefully without errors
      expect(result.current.state).toBe(ConnectionState.CONNECTING);
    });
  });
  
  describe('Timing-Dependent Race Conditions', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should handle metrics update race conditions', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      const initialMetrics = result.current.metrics;
      
      // Fast forward to trigger metrics update
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Should update metrics
      expect(result.current.metrics).toBeDefined();
    });
    
    it('should handle connection timeout during state changes', async () => {
      const { result } = renderHook(() => useConnectionManager());
      
      // Start connecting
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTING);
      });
      
      // Fast forward past connection timeout
      act(() => {
        jest.advanceTimersByTime(15000); // Connection timeout
      });
      
      // Race condition: timeout vs successful connection
      await act(async () => {
        // Connection succeeds just as timeout occurs
        mockManager.forceState(ConnectionState.CONNECTED);
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
      });
      
      // Should end up connected (success wins over timeout)
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });
});
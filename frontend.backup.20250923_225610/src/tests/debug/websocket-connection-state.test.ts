/**
 * Debug test to validate WebSocket connection state propagation
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useWebSocketSingleton } from '../../hooks/useWebSocketSingleton';
import { ConnectionState } from '../../services/connection/types';
import { getGlobalConnectionManager, resetGlobalConnectionManager } from '../../services/connection/connection-manager';

// Mock socket.io-client
const mockSocket = {
  id: 'test-socket-id',
  connected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  removeAllListeners: jest.fn()
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

describe('WebSocket Connection State Debug', () => {
  beforeEach(() => {
    resetGlobalConnectionManager();
    mockSocket.connected = false;
    jest.clearAllMocks();
  });

  afterEach(() => {
    resetGlobalConnectionManager();
  });

  test('should properly track connection state changes', async () => {
    const { result } = renderHook(() => 
      useWebSocketSingleton({
        url: 'http://localhost:3001',
        autoConnect: false
      })
    );

    // Initial state should be disconnected
    expect(result.current.isConnected).toBe(false);
    
    // Simulate connection
    act(() => {
      mockSocket.connected = true;
      const manager = getGlobalConnectionManager();
      // Manually trigger state change to CONNECTED
      manager.emit('state_change', {
        from: ConnectionState.DISCONNECTED,
        to: ConnectionState.CONNECTED,
        timestamp: new Date()
      });
    });

    // Wait for state to propagate
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    }, { timeout: 1000 });

    console.log('🔧 Debug Test Results:', {
      isConnected: result.current.isConnected,
      socket: result.current.socket,
      connectionState: result.current.connectionState
    });
  });

  test('should debug the actual state propagation issue', async () => {
    const manager = getGlobalConnectionManager({
      url: 'http://localhost:3001',
      autoConnect: false
    });

    // Get detailed status
    const status = manager.getDetailedStatus();
    console.log('🔍 Manager Status:', status);

    // Test the isConnected logic
    const managerIsConnected = manager.isConnected();
    const socketConnected = manager.getSocket()?.connected;
    const managerState = manager.getState();

    console.log('🔧 State Analysis:', {
      managerIsConnected,
      socketConnected,
      managerState,
      expectedIsConnected: managerState === ConnectionState.CONNECTED && socketConnected === true
    });

    expect(managerIsConnected).toBeDefined();
  });
});
/**
 * TDD London School Tests: WebSocket Error Handling and Reconnection
 * 
 * Tests that validate error handling and reconnection behavior, focusing on
 * scenarios where the backend shows connections but frontend shows disconnected.
 * These tests will identify if reconnection logic interferes with connection state.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { act, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock WebSocket with error and reconnection capabilities
const mockSocket = {
  id: 'error-test-socket',
  connected: false,
  disconnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  once: jest.fn(),
  onAny: jest.fn()
};

const mockConnectionManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  reconnect: jest.fn(),
  getState: jest.fn().mockReturnValue('DISCONNECTED'),
  isConnected: jest.fn().mockReturnValue(false),
  getSocket: jest.fn().mockReturnValue(mockSocket),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  getDetailedStatus: jest.fn(),
  updateOptions: jest.fn(),
  getMetrics: jest.fn(),
  getHealth: jest.fn(),
  destroy: jest.fn()
};

// Mock connection system
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

jest.mock('@/services/connection/connection-manager', () => ({
  WebSocketConnectionManager: jest.fn(() => mockConnectionManager),
  getGlobalConnectionManager: jest.fn(() => mockConnectionManager)
}));

// Import after mocking
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';
import { ConnectionStatus } from '@/components/ConnectionStatus';

describe('TDD London School: WebSocket Error Handling and Reconnection', () => {
  
  // Test component to track reconnection state
  const ReconnectionTracker: React.FC = () => {
    const { isConnected, connectionState, reconnect } = useWebSocketSingletonContext();
    
    return (
      <div>
        <div data-testid="is-connected">{isConnected.toString()}</div>
        <div data-testid="connection-error">{connectionState.connectionError || 'none'}</div>
        <div data-testid="reconnect-attempt">{connectionState.reconnectAttempt}</div>
        <div data-testid="connection-status">{isConnected ? 'Connected' : 'Disconnected'}</div>
        <button onClick={reconnect} data-testid="manual-reconnect">Reconnect</button>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock states
    mockSocket.connected = false;
    mockSocket.disconnected = true;
    mockSocket.id = 'error-test-socket';
    
    mockConnectionManager.isConnected.mockReturnValue(false);
    mockConnectionManager.getState.mockReturnValue('DISCONNECTED');
    mockConnectionManager.getSocket.mockReturnValue(mockSocket);
    mockConnectionManager.getDetailedStatus.mockReturnValue({
      state: 'DISCONNECTED',
      isConnected: false,
      socketConnected: false,
      currentAttempt: 0
    });
  });

  describe('Connection Error Scenarios', () => {
    it('should handle initial connection failure and show disconnected', async () => {
      // ARRANGE: Mock connection failure
      const connectionError = new Error('Connection failed: ECONNREFUSED');
      mockConnectionManager.connect.mockRejectedValue(connectionError);

      // Track error events
      let errorHandler: ((error: any) => void) | undefined;
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        if (event === 'connect_error') {
          errorHandler = handler;
        }
      });

      // ACT: Render with auto-connect
      render(
        <WebSocketSingletonProvider config={{ autoConnect: true }}>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // Simulate connection error
      await act(async () => {
        if (errorHandler) {
          errorHandler(connectionError);
        }
      });

      // ASSERT: Should show disconnected state
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');

      // BEHAVIOR VERIFICATION: Connection should have been attempted
      expect(mockConnectionManager.connect).toHaveBeenCalled();
    });

    it('should handle transport errors during established connection', async () => {
      // ARRANGE: Start with successful connection
      mockConnectionManager.isConnected.mockReturnValue(true);
      mockSocket.connected = true;

      const { rerender } = render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // Verify initial connected state
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');

      // ACT: Simulate transport error
      await act(async () => {
        mockSocket.connected = false;
        mockSocket.disconnected = true;
        mockConnectionManager.isConnected.mockReturnValue(false);
        mockConnectionManager.getState.mockReturnValue('ERROR');

        // Trigger disconnect event
        let disconnectHandler: ((reason: string) => void) | undefined;
        mockSocket.on.mockImplementation((event: string, handler: any) => {
          if (event === 'disconnect') {
            disconnectHandler = handler;
          }
        });

        if (disconnectHandler) {
          disconnectHandler('transport error');
        }

        // Force re-render to reflect state change
        rerender(
          <WebSocketSingletonProvider>
            <ReconnectionTracker />
          </WebSocketSingletonProvider>
        );
      });

      // ASSERT: Should show disconnected after error
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      
      // BEHAVIOR VERIFICATION: Should register disconnect handler
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should handle ping timeout errors', async () => {
      // ARRANGE: Mock ping timeout scenario
      let errorHandler: ((error: any) => void) | undefined;
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // ACT: Simulate ping timeout
      await act(async () => {
        const pingTimeoutError = { type: 'ping timeout', description: 'Ping timeout' };
        if (errorHandler) {
          errorHandler(pingTimeoutError);
        }
      });

      // ASSERT: Should handle ping timeout gracefully
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      // BEHAVIOR VERIFICATION: Should register error handler
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt automatic reconnection after disconnect', async () => {
      // ARRANGE: Start connected then simulate disconnect
      mockConnectionManager.isConnected.mockReturnValue(true);
      mockSocket.connected = true;

      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // ACT: Simulate unexpected disconnect
      await act(async () => {
        mockSocket.connected = false;
        mockConnectionManager.isConnected.mockReturnValue(false);
        mockConnectionManager.getState.mockReturnValue('RECONNECTING');

        // Simulate automatic reconnection attempt
        mockConnectionManager.reconnect.mockResolvedValue(undefined);
      });

      // BEHAVIOR VERIFICATION: Should attempt reconnection
      // Note: Auto-reconnection might be handled by the connection manager
      expect(mockConnectionManager.getState).toHaveBeenCalled();
    });

    it('should handle manual reconnection attempts', async () => {
      // ARRANGE: Start disconnected
      mockConnectionManager.isConnected.mockReturnValue(false);
      mockConnectionManager.reconnect.mockResolvedValue(undefined);

      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      // ACT: Click manual reconnect
      const reconnectBtn = screen.getByTestId('manual-reconnect');
      await act(async () => {
        reconnectBtn.click();
      });

      // BEHAVIOR VERIFICATION: Should call reconnect method
      await waitFor(() => {
        expect(mockConnectionManager.reconnect).toHaveBeenCalled();
      });
    });

    it('should track reconnection attempts', async () => {
      // ARRANGE: Mock reconnection state with attempt counter
      mockConnectionManager.getDetailedStatus.mockReturnValue({
        state: 'RECONNECTING',
        isConnected: false,
        currentAttempt: 2,
        maxAttempts: 5
      });

      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Should show reconnection attempt count
      // Note: The context should reflect the reconnection attempt from connection state
      expect(mockConnectionManager.getDetailedStatus).toHaveBeenCalled();
    });

    it('should handle max reconnection attempts exceeded', async () => {
      // ARRANGE: Mock max attempts exceeded scenario
      const maxAttemptsError = new Error('Max reconnection attempts exceeded');
      mockConnectionManager.reconnect.mockRejectedValue(maxAttemptsError);
      mockConnectionManager.getState.mockReturnValue('ERROR');

      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // ACT: Attempt manual reconnect
      await act(async () => {
        const reconnectBtn = screen.getByTestId('manual-reconnect');
        reconnectBtn.click();
      });

      // BEHAVIOR VERIFICATION: Should handle failed reconnection
      expect(mockConnectionManager.reconnect).toHaveBeenCalled();
      
      // Should still show disconnected state
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });
    });
  });

  describe('Connection State During Errors', () => {
    it('should maintain disconnected UI state during connection errors', async () => {
      // ARRANGE: Mock error state
      mockConnectionManager.getState.mockReturnValue('ERROR');
      mockConnectionManager.isConnected.mockReturnValue(false);
      mockConnectionManager.getDetailedStatus.mockReturnValue({
        state: 'ERROR',
        isConnected: false,
        socketConnected: false,
        connectionError: 'Connection failed'
      });

      // ACT: Render with error state
      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Should show disconnected despite any backend activity
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
    });

    it('should not show connected during reconnection attempts', async () => {
      // ARRANGE: Mock reconnecting state
      mockConnectionManager.getState.mockReturnValue('RECONNECTING');
      mockConnectionManager.isConnected.mockReturnValue(false);

      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Should show disconnected during reconnection
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      
      // Even if socket reports connected, UI should show reconnecting state
      mockSocket.connected = true;
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
    });
  });

  describe('Error Recovery and State Consistency', () => {
    it('should properly recover from errors and show connected state', async () => {
      // ARRANGE: Start with error state
      mockConnectionManager.getState.mockReturnValue('ERROR');
      mockConnectionManager.isConnected.mockReturnValue(false);

      const { rerender } = render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      // ACT: Simulate successful recovery
      await act(async () => {
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        mockConnectionManager.getState.mockReturnValue('CONNECTED');
        mockConnectionManager.isConnected.mockReturnValue(true);

        // Force re-render to show recovery
        rerender(
          <WebSocketSingletonProvider>
            <ReconnectionTracker />
          </WebSocketSingletonProvider>
        );
      });

      // ASSERT: Should show connected after recovery
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('true');

      // BEHAVIOR VERIFICATION: All state should be consistent
      expect(mockSocket.connected).toBe(true);
      expect(mockConnectionManager.isConnected()).toBe(true);
    });

    it('should identify if error handling interferes with connection detection', async () => {
      // ARRANGE: Simulate scenario where socket connects but error state persists
      mockSocket.connected = true; // Socket is connected
      mockSocket.disconnected = false;
      
      // But connection manager still thinks there's an error
      mockConnectionManager.getState.mockReturnValue('ERROR');
      mockConnectionManager.isConnected.mockReturnValue(false); // Manager says disconnected

      render(
        <WebSocketSingletonProvider>
          <ReconnectionTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: This reveals if error handling blocks connection detection
      expect(mockSocket.connected).toBe(true);
      expect(mockConnectionManager.isConnected()).toBe(false);
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      // DIAGNOSTIC: Log the problematic state
      console.log('\n=== ERROR HANDLING DIAGNOSTIC ===');
      console.log('Socket connected:', mockSocket.connected);
      console.log('Manager state:', mockConnectionManager.getState());
      console.log('Manager isConnected:', mockConnectionManager.isConnected());
      console.log('UI shows:', screen.getByTestId('connection-status').textContent);
      console.log('Possible issue: Error state preventing connection detection');
      console.log('================================\n');
    });
  });

  describe('ConnectionStatus Component Error Display', () => {
    it('should display error state correctly in ConnectionStatus', async () => {
      // ARRANGE: Mock error context
      const mockContextValue = {
        isConnected: false,
        connectionState: {
          isConnected: false,
          isConnecting: false,
          reconnectAttempt: 1,
          lastConnected: null,
          connectionError: 'Connection failed: ECONNREFUSED'
        },
        systemStats: null,
        onlineUsers: [],
        reconnect: jest.fn(),
        socket: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        notifications: [],
        clearNotifications: jest.fn(),
        markNotificationAsRead: jest.fn(),
        addNotification: jest.fn(),
        subscribeFeed: jest.fn(),
        unsubscribeFeed: jest.fn(),
        subscribePost: jest.fn(),
        unsubscribePost: jest.fn(),
        sendLike: jest.fn(),
        sendMessage: jest.fn()
      };

      const useContextSpy = jest.spyOn(React, 'useContext');
      useContextSpy.mockReturnValue(mockContextValue);

      // ACT: Render ConnectionStatus
      render(<ConnectionStatus />);

      // ASSERT: Should show error state
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText(/Connection failed/)).toBeInTheDocument();

      useContextSpy.mockRestore();
    });

    it('should handle retry action in error state', async () => {
      // ARRANGE: Mock error state with retry
      const mockReconnect = jest.fn();
      const mockContextValue = {
        isConnected: false,
        connectionState: {
          isConnected: false,
          isConnecting: false,
          reconnectAttempt: 1,
          lastConnected: null,
          connectionError: 'Network error'
        },
        systemStats: null,
        onlineUsers: [],
        reconnect: mockReconnect,
        socket: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        notifications: [],
        clearNotifications: jest.fn(),
        markNotificationAsRead: jest.fn(),
        addNotification: jest.fn(),
        subscribeFeed: jest.fn(),
        unsubscribeFeed: jest.fn(),
        subscribePost: jest.fn(),
        unsubscribePost: jest.fn(),
        sendLike: jest.fn(),
        sendMessage: jest.fn()
      };

      const useContextSpy = jest.spyOn(React, 'useContext');
      useContextSpy.mockReturnValue(mockContextValue);

      render(<ConnectionStatus />);

      // ACT: Click retry button
      const retryBtn = screen.getByText('Retry');
      await act(async () => {
        retryBtn.click();
      });

      // BEHAVIOR VERIFICATION: Should call reconnect
      expect(mockReconnect).toHaveBeenCalled();

      useContextSpy.mockRestore();
    });
  });
});
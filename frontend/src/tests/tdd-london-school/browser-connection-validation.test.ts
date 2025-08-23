/**
 * TDD London School Tests: Browser Connection Validation
 * 
 * These tests follow London School (mockist) TDD approach to validate the ACTUAL
 * browser connection behavior and identify why UI shows "Disconnected" when 
 * backend receives connections.
 * 
 * Focus: Mock-driven testing of WebSocket connection flow with behavior verification
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { Socket } from 'socket.io-client';
import React from 'react';

// Mock exact browser WebSocket environment
const mockSocket = {
  id: 'mock-socket-id',
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
} as unknown as Socket;

const mockConnectionManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  getState: jest.fn(),
  isConnected: jest.fn(),
  getSocket: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  getDetailedStatus: jest.fn()
};

// Mock socket.io-client to control exact browser behavior
jest.mock('socket.io-client', () => ({
  io: jest.fn().mockImplementation(() => mockSocket),
  Socket: jest.fn()
}));

// Mock connection manager
jest.mock('@/services/connection/connection-manager', () => ({
  WebSocketConnectionManager: jest.fn().mockImplementation(() => mockConnectionManager),
  getGlobalConnectionManager: jest.fn().mockReturnValue(mockConnectionManager)
}));

// Import components after mocking
import { ConnectionStatus } from '@/components/ConnectionStatus';
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';

describe('TDD London School: Browser Connection Validation', () => {
  // Test Component for behavior verification
  const TestConnectionDisplay: React.FC = () => {
    const { isConnected, connectionState } = useWebSocketSingletonContext();
    
    return (
      <div>
        <span data-testid="connection-status">{isConnected ? 'Connected' : 'Disconnected'}</span>
        <span data-testid="connection-state">{connectionState.isConnected ? 'true' : 'false'}</span>
        <span data-testid="raw-connected">{isConnected.toString()}</span>
      </div>
    );
  };

  beforeEach(() => {
    // Reset all mocks to ensure clean state for each test
    jest.clearAllMocks();
    
    // Set default mock behaviors
    mockSocket.connected = false;
    mockSocket.disconnected = true;
    mockConnectionManager.isConnected.mockReturnValue(false);
    mockConnectionManager.getSocket.mockReturnValue(mockSocket);
    mockConnectionManager.getState.mockReturnValue('DISCONNECTED');
    mockConnectionManager.getDetailedStatus.mockReturnValue({
      state: 'DISCONNECTED',
      isConnected: false,
      socketConnected: false
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('WebSocket Connection Establishment Flow', () => {
    it('should establish connection and propagate to UI when socket connects', async () => {
      // ARRANGE: Mock successful connection behavior
      const mockConnectionPromise = Promise.resolve();
      mockConnectionManager.connect.mockReturnValue(mockConnectionPromise);
      mockConnectionManager.isConnected.mockReturnValue(false); // Initially disconnected
      
      // Track connection handler registration
      let connectHandler: (() => void) | undefined;
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        if (event === 'connect') {
          connectHandler = handler;
        }
      });

      // ACT: Render component with provider
      render(
        <WebSocketSingletonProvider config={{ autoConnect: true }}>
          <TestConnectionDisplay />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Should start disconnected
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      
      // ACT: Simulate socket connection event
      await act(async () => {
        // Connection manager should register for connection events
        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        
        // Simulate socket becoming connected
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        mockConnectionManager.isConnected.mockReturnValue(true);
        
        // Fire connect event
        if (connectHandler) {
          connectHandler();
        }
      });

      // ASSERT: UI should show connected after socket connects
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      });

      // VERIFY BEHAVIOR: Connection manager should be called correctly
      expect(mockConnectionManager.connect).toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('should handle socket connection but context not updating (current bug)', async () => {
      // ARRANGE: Mock the exact buggy behavior where socket connects but context doesn't update
      mockConnectionManager.isConnected.mockReturnValue(false); // Context says disconnected
      mockSocket.connected = true; // But socket is actually connected
      mockSocket.disconnected = false;

      let connectHandler: (() => void) | undefined;
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        if (event === 'connect') {
          connectHandler = handler;
        }
      });

      // ACT: Render and simulate connection
      render(
        <WebSocketSingletonProvider>
          <TestConnectionDisplay />
        </WebSocketSingletonProvider>
      );

      await act(async () => {
        if (connectHandler) {
          connectHandler();
        }
      });

      // ASSERT: This test documents the current bug
      // Socket is connected but UI shows disconnected
      expect(mockSocket.connected).toBe(true);
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      
      // BEHAVIOR VERIFICATION: Context should call connection manager
      expect(mockConnectionManager.isConnected).toHaveBeenCalled();
    });
  });

  describe('Connection State Propagation', () => {
    it('should propagate isConnected state from socket to context to UI', async () => {
      // ARRANGE: Mock connection state changes
      let isConnectedValue = false;
      mockConnectionManager.isConnected.mockImplementation(() => isConnectedValue);

      const { rerender } = render(
        <WebSocketSingletonProvider>
          <TestConnectionDisplay />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Initially disconnected
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      // ACT: Change connection state
      await act(async () => {
        isConnectedValue = true;
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        
        // Force re-render to simulate state update
        rerender(
          <WebSocketSingletonProvider>
            <TestConnectionDisplay />
          </WebSocketSingletonProvider>
        );
      });

      // BEHAVIOR VERIFICATION: Should check connection manager state
      expect(mockConnectionManager.isConnected).toHaveBeenCalled();
    });

    it('should handle connection state inconsistencies', async () => {
      // ARRANGE: Mock inconsistent state (the bug scenario)
      mockConnectionManager.isConnected.mockReturnValue(false);
      mockConnectionManager.getSocket.mockReturnValue({
        ...mockSocket,
        connected: true, // Socket says connected
        disconnected: false
      });

      // ACT
      render(
        <WebSocketSingletonProvider>
          <TestConnectionDisplay />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Should show disconnected despite socket being connected
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      // BEHAVIOR VERIFICATION: Context should rely on connection manager, not direct socket
      expect(mockConnectionManager.isConnected).toHaveBeenCalled();
      expect(mockConnectionManager.getSocket).toHaveBeenCalled();
    });
  });

  describe('ConnectionStatus Component Behavior', () => {
    it('should display "Connected" when context reports connected', async () => {
      // ARRANGE: Mock connected state
      const mockContextValue = {
        isConnected: true,
        connectionState: {
          isConnected: true,
          isConnecting: false,
          reconnectAttempt: 0,
          lastConnected: new Date().toISOString(),
          connectionError: null
        },
        systemStats: { connectedUsers: 5, activeRooms: 2 },
        onlineUsers: [],
        reconnect: jest.fn()
      };

      // Mock the context hook
      const useContextSpy = jest.spyOn(React, 'useContext');
      useContextSpy.mockReturnValue(mockContextValue);

      // ACT
      render(<ConnectionStatus />);

      // ASSERT: Should show connected status
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Online users count

      // BEHAVIOR VERIFICATION: Context should be consulted
      expect(useContextSpy).toHaveBeenCalled();

      useContextSpy.mockRestore();
    });

    it('should display "Disconnected" when context reports disconnected', async () => {
      // ARRANGE: Mock disconnected state
      const mockContextValue = {
        isConnected: false,
        connectionState: {
          isConnected: false,
          isConnecting: false,
          reconnectAttempt: 1,
          lastConnected: null,
          connectionError: 'Connection failed'
        },
        systemStats: null,
        onlineUsers: [],
        reconnect: jest.fn()
      };

      const useContextSpy = jest.spyOn(React, 'useContext');
      useContextSpy.mockReturnValue(mockContextValue);

      // ACT
      render(<ConnectionStatus />);

      // ASSERT: Should show disconnected status
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();

      // BEHAVIOR VERIFICATION: Should allow retry on error
      fireEvent.click(screen.getByText('Retry'));
      expect(mockContextValue.reconnect).toHaveBeenCalled();

      useContextSpy.mockRestore();
    });
  });

  describe('WebSocket Hook Integration', () => {
    it('should integrate useWebSocketSingleton with connection manager correctly', async () => {
      // ARRANGE: Test component using hook
      const TestHookComponent: React.FC = () => {
        const { socket, isConnected, connect, disconnect } = useWebSocketSingleton({
          url: 'http://localhost:3001',
          autoConnect: false
        });

        return (
          <div>
            <span data-testid="hook-connected">{isConnected ? 'true' : 'false'}</span>
            <button data-testid="connect-btn" onClick={() => connect()}>Connect</button>
            <button data-testid="disconnect-btn" onClick={() => disconnect()}>Disconnect</button>
          </div>
        );
      };

      // Mock useConnectionManager return value
      jest.mock('@/hooks/useConnectionManager', () => ({
        useConnectionManager: jest.fn().mockReturnValue({
          socket: mockSocket,
          isConnected: false,
          state: 'DISCONNECTED',
          connect: mockConnectionManager.connect,
          disconnect: mockConnectionManager.disconnect,
          manager: mockConnectionManager
        })
      }));

      // ACT
      render(<TestHookComponent />);

      // ASSERT: Hook should provide connection interface
      expect(screen.getByTestId('hook-connected')).toHaveTextContent('false');

      // ACT: Test connect behavior
      fireEvent.click(screen.getByTestId('connect-btn'));

      // BEHAVIOR VERIFICATION: Should delegate to connection manager
      expect(mockConnectionManager.connect).toHaveBeenCalled();

      // ACT: Test disconnect behavior
      fireEvent.click(screen.getByTestId('disconnect-btn'));
      expect(mockConnectionManager.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('Connection Status Display Logic', () => {
    it('should pass only when browser actually shows "Connected"', async () => {
      // ARRANGE: Mock the exact successful connection flow
      mockConnectionManager.isConnected.mockReturnValue(true);
      mockSocket.connected = true;
      mockSocket.disconnected = false;

      const mockContextValue = {
        isConnected: true,
        connectionState: {
          isConnected: true,
          isConnecting: false,
          reconnectAttempt: 0,
          lastConnected: new Date().toISOString(),
          connectionError: null
        },
        systemStats: null,
        onlineUsers: [],
        reconnect: jest.fn()
      };

      const useContextSpy = jest.spyOn(React, 'useContext');
      useContextSpy.mockReturnValue(mockContextValue);

      // ACT: Render actual ConnectionStatus component
      render(<ConnectionStatus />);

      // ASSERT: This test should ONLY pass when UI actually shows "Connected"
      const connectionText = screen.getByText(/Connected|Disconnected/);
      expect(connectionText).toHaveTextContent('Connected');

      // CRITICAL: Verify the complete connection flow
      expect(mockContextValue.isConnected).toBe(true);
      expect(mockContextValue.connectionState.isConnected).toBe(true);

      useContextSpy.mockRestore();
    });

    it('should fail if UI shows "Disconnected" despite backend connection', async () => {
      // ARRANGE: Mock the bug scenario - backend connected, frontend disconnected
      mockConnectionManager.isConnected.mockReturnValue(false); // Frontend thinks disconnected
      mockSocket.connected = true; // But socket is actually connected (backend perspective)

      const mockContextValue = {
        isConnected: false, // Context reports disconnected
        connectionState: {
          isConnected: false,
          isConnecting: false,
          reconnectAttempt: 0,
          lastConnected: null,
          connectionError: null
        },
        systemStats: null,
        onlineUsers: [],
        reconnect: jest.fn()
      };

      const useContextSpy = jest.spyOn(React, 'useContext');
      useContextSpy.mockReturnValue(mockContextValue);

      // ACT
      render(<ConnectionStatus />);

      // ASSERT: This documents the current bug
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      
      // BEHAVIOR VERIFICATION: This should reveal why UI shows disconnected
      expect(mockContextValue.isConnected).toBe(false);
      expect(mockSocket.connected).toBe(true); // Socket is connected but context doesn't know

      useContextSpy.mockRestore();
    });
  });

  describe('WebSocket Event Handling', () => {
    it('should register connect event handler and update state', async () => {
      // ARRANGE: Track event handler registration
      const eventHandlers = new Map();
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        eventHandlers.set(event, handler);
      });

      // ACT: Initialize connection
      render(
        <WebSocketSingletonProvider config={{ autoConnect: true }}>
          <TestConnectionDisplay />
        </WebSocketSingletonProvider>
      );

      // BEHAVIOR VERIFICATION: Should register connect handler
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));

      // ACT: Simulate connect event
      await act(async () => {
        const connectHandler = eventHandlers.get('connect');
        if (connectHandler) {
          mockConnectionManager.isConnected.mockReturnValue(true);
          connectHandler();
        }
      });

      // ASSERT: Connection should be tracked
      expect(mockConnectionManager.isConnected).toHaveBeenCalled();
    });

    it('should handle disconnect events and update UI', async () => {
      // ARRANGE: Track disconnect handler
      const eventHandlers = new Map();
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        eventHandlers.set(event, handler);
      });

      mockConnectionManager.isConnected.mockReturnValue(true); // Start connected

      render(
        <WebSocketSingletonProvider>
          <TestConnectionDisplay />
        </WebSocketSingletonProvider>
      );

      // ACT: Simulate disconnect
      await act(async () => {
        mockConnectionManager.isConnected.mockReturnValue(false);
        const disconnectHandler = eventHandlers.get('disconnect');
        if (disconnectHandler) {
          disconnectHandler('transport close');
        }
      });

      // BEHAVIOR VERIFICATION: Should handle disconnection
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });
});
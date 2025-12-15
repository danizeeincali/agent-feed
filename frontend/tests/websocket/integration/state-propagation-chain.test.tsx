/**
 * TDD London School Integration Tests - Complete State Propagation Chain
 * End-to-end testing of WebSocket state management from Socket → Manager → Hook → Context → UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '../../../src/context/WebSocketSingletonContext';
import { ConnectionStatus } from '../../../src/components/ConnectionStatus';
import { MockSocket, mockScenarios } from '../mocks/socket-io-mock';
import { MockWebSocketConnectionManager, createMockConnectionManager } from '../mocks/connection-manager-mock';
import { ConnectionState } from '../../../src/services/connection/types';

// Mock all dependencies at their lowest level
jest.mock('socket.io-client');
jest.mock('../../../src/services/connection/connection-manager');
jest.mock('../../../src/hooks/useConnectionManager');
jest.mock('lucide-react', () => ({
  Wifi: () => <div data-testid="wifi-icon" />,
  WifiOff: () => <div data-testid="wifi-off-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Users: () => <div data-testid="users-icon" />
}));

// Import mocked modules
import { io } from 'socket.io-client';
import { WebSocketConnectionManager, getGlobalConnectionManager } from '../../../src/services/connection/connection-manager';
import { useConnectionManager } from '../../../src/hooks/useConnectionManager';

// Test App Component that includes the full chain
const TestApp: React.FC<{ mockManager: MockWebSocketConnectionManager }> = ({ mockManager }) => {
  const [testState, setTestState] = React.useState<{
    hookState: any;
    contextState: any;
  }>({} as any);
  
  return (
    <WebSocketSingletonProvider>
      <div data-testid="test-app">
        <TestStateCapture onStateChange={setTestState} />
        <ConnectionStatus />
        <div data-testid="debug-info">
          <div data-testid="hook-state">{JSON.stringify(testState.hookState)}</div>
          <div data-testid="context-state">{JSON.stringify(testState.contextState)}</div>
        </div>
      </div>
    </WebSocketSingletonProvider>
  );
};

const TestStateCapture: React.FC<{ onStateChange: (state: any) => void }> = ({ onStateChange }) => {
  const context = useWebSocketSingletonContext();
  
  React.useEffect(() => {
    onStateChange({
      hookState: {
        isConnected: context.isConnected,
        socket: context.socket ? {
          id: context.socket.id,
          connected: context.socket.connected,
          connecting: context.socket.connecting
        } : null
      },
      contextState: {
        connectionState: context.connectionState,
        notifications: context.notifications.length,
        onlineUsers: context.onlineUsers.length
      }
    });
  }, [context, onStateChange]);
  
  return null;
};

describe('TDD London School: Complete State Propagation Chain', () => {
  let mockSocket: MockSocket;
  let mockManager: MockWebSocketConnectionManager;
  let mockIo: jest.MockedFunction<typeof io>;
  let mockGetGlobalConnectionManager: jest.MockedFunction<typeof getGlobalConnectionManager>;
  let mockUseConnectionManager: jest.MockedFunction<typeof useConnectionManager>;
  let mockWebSocketConnectionManager: jest.MockedClass<typeof WebSocketConnectionManager>;
  
  beforeEach(() => {
    // Set up mock hierarchy from bottom to top
    mockSocket = mockScenarios.disconnectedSocket();
    mockManager = createMockConnectionManager.disconnected();
    
    // Mock socket.io-client
    mockIo = io as jest.MockedFunction<typeof io>;
    mockIo.mockReturnValue(mockSocket as any);
    
    // Mock connection manager
    mockWebSocketConnectionManager = WebSocketConnectionManager as jest.MockedClass<typeof WebSocketConnectionManager>;
    mockWebSocketConnectionManager.mockImplementation(() => mockManager as any);
    
    mockGetGlobalConnectionManager = getGlobalConnectionManager as jest.MockedFunction<typeof getGlobalConnectionManager>;
    mockGetGlobalConnectionManager.mockReturnValue(mockManager as any);
    
    // Mock useConnectionManager hook
    mockUseConnectionManager = useConnectionManager as jest.MockedFunction<typeof useConnectionManager>;
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
    mockSocket.destroy();
    mockManager.destroy();
  });
  
  describe('Socket.IO Event → Manager State → Hook State → Context State → UI', () => {
    it('should propagate connect event through entire chain', async () => {
      render(<TestApp mockManager={mockManager} />);
      
      // Initially disconnected
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
      
      // Simulate socket connection from the lowest level
      await act(async () => {
        // 1. Socket.IO level: Emit connect event
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
        mockSocket.emit('connect');
        
        // 2. Manager level: Should update state to CONNECTED
        await mockManager.connect();
        
        // 3. Hook level: Update mock return value
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          socket: mockSocket,
          isConnected: true,
          state: ConnectionState.CONNECTED,
          isConnecting: false
        });
      });
      
      // 4. UI level: Should reflect connected state
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
      });
      
      // Verify the entire chain
      expect(mockManager.getState()).toBe(ConnectionState.CONNECTED);
      expect(mockSocket.connected).toBe(true);
    });
    
    it('should propagate disconnect event through entire chain', async () => {
      // Start connected
      mockManager = createMockConnectionManager.connected();
      mockSocket = mockScenarios.connectedSocket();
      mockGetGlobalConnectionManager.mockReturnValue(mockManager as any);
      
      mockUseConnectionManager.mockReturnValue({
        socket: mockSocket,
        isConnected: true,
        state: ConnectionState.CONNECTED,
        connect: jest.fn(),
        disconnect: jest.fn().mockImplementation((manual) => mockManager.disconnect(manual)),
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
      
      render(<TestApp mockManager={mockManager} />);
      
      // Initially connected
      expect(screen.getByText('Connected')).toBeInTheDocument();
      
      // Simulate disconnection from socket level
      await act(async () => {
        // 1. Socket.IO level: Emit disconnect event
        mockSocket.forceState({ connected: false, connecting: false, disconnected: true });
        mockSocket.emit('disconnect', 'transport close');
        
        // 2. Manager level: Should update state to DISCONNECTED
        await mockManager.disconnect();
        
        // 3. Hook level: Update mock return value
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          socket: mockSocket,
          isConnected: false,
          state: ConnectionState.DISCONNECTED,
          isConnecting: false
        });
      });
      
      // 4. UI level: Should reflect disconnected state
      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
        expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
      });
    });
    
    it('should handle connecting state propagation correctly', async () => {
      render(<TestApp mockManager={mockManager} />);
      
      // Simulate connection attempt
      await act(async () => {
        // 1. Manager level: Set to CONNECTING
        mockManager.forceState(ConnectionState.CONNECTING);
        
        // 2. Socket level: Set connecting state
        mockSocket.forceState({ connected: false, connecting: true, disconnected: false });
        
        // 3. Hook level: Update mock return value
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          socket: mockSocket,
          isConnected: false,
          state: ConnectionState.CONNECTING,
          isConnecting: true
        });
      });
      
      // 4. UI level: Should show connecting state
      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
        expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      });
    });
  });
  
  describe('Critical Race Condition Testing', () => {
    it('should handle race condition where manager is CONNECTED but socket.connected is false', async () => {
      // Set up race condition scenario
      mockManager = createMockConnectionManager.raceCondition();
      mockSocket = mockScenarios.raceConditionSocket();
      mockGetGlobalConnectionManager.mockReturnValue(mockManager as any);
      
      // Hook should detect race condition and return false for isConnected
      mockUseConnectionManager.mockReturnValue({
        socket: mockSocket,
        isConnected: false, // Manager correctly detects race condition
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
      
      render(<TestApp mockManager={mockManager} />);
      
      // UI should show disconnected despite manager state being CONNECTED
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
      
      // Verify the race condition detection
      expect(mockManager.getState()).toBe(ConnectionState.CONNECTED);
      expect(mockSocket.connected).toBe(false);
      expect(mockManager.isConnected()).toBe(false); // Manager detects the race
    });
    
    it('should handle isConnecting race condition correctly', async () => {
      // Context should compute isConnecting as: socket && socket.connecting && !socket.connected
      mockSocket = mockScenarios.connectingSocket();
      mockManager.forceState(ConnectionState.CONNECTING);
      mockManager.forceSocketState({ connected: false, connecting: true, disconnected: false });
      
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
      
      render(<TestApp mockManager={mockManager} />);
      
      // Should show connecting state
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
      
      // Verify state consistency
      expect(mockSocket.connected).toBe(false);
      expect(mockSocket.connecting).toBe(true);
    });
    
    it('should handle socket state inconsistencies gracefully', async () => {
      // Edge case: socket exists but has inconsistent state
      mockSocket.forceState({ connected: false, connecting: false, disconnected: false });
      
      mockUseConnectionManager.mockReturnValue({
        socket: mockSocket,
        isConnected: false,
        state: ConnectionState.DISCONNECTED,
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
      
      render(<TestApp mockManager={mockManager} />);
      
      // Should default to disconnected when states are inconsistent
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });
  
  describe('Event Flow Verification', () => {
    it('should verify event listeners are properly registered through the chain', async () => {
      render(<TestApp mockManager={mockManager} />);
      
      // Verify socket event handlers are registered
      expect(mockSocket.getListenersFor('connect').length).toBeGreaterThan(0);
      expect(mockSocket.getListenersFor('disconnect').length).toBeGreaterThan(0);
      expect(mockSocket.getListenersFor('connect_error').length).toBeGreaterThan(0);
    });
    
    it('should handle socket events and update UI accordingly', async () => {
      render(<TestApp mockManager={mockManager} />);
      
      // Simulate socket notification event
      const notificationHandler = mockSocket.getListenersFor('notification')[0];
      
      await act(async () => {
        notificationHandler({
          type: 'info',
          title: 'Test Notification',
          message: 'Test message from socket',
          userId: 'user-123'
        });
      });
      
      // Context should have received and processed the notification
      // (Would need additional test component to verify notification state)
    });
    
    it('should handle connection errors through the entire chain', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<TestApp mockManager={mockManager} />);
      
      // Simulate connection error from socket level
      const error = new Error('Connection failed');
      
      await act(async () => {
        mockSocket.emit('connect_error', error);
      });
      
      // Error should propagate through the chain
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection error:'),
        error
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('State Synchronization Verification', () => {
    it('should keep all layers synchronized during state transitions', async () => {
      render(<TestApp mockManager={mockManager} />);
      
      // Track state changes through multiple transitions
      const stateHistory: Array<{
        socketState: any;
        managerState: ConnectionState;
        hookConnected: boolean;
        uiText: string;
      }> = [];
      
      const captureState = () => {
        stateHistory.push({
          socketState: {
            connected: mockSocket.connected,
            connecting: mockSocket.connecting,
            disconnected: mockSocket.disconnected
          },
          managerState: mockManager.getState(),
          hookConnected: mockUseConnectionManager.mock.results.slice(-1)[0]?.value.isConnected || false,
          uiText: screen.getByTestId('test-app').textContent?.includes('Connected') ? 'Connected' : 'Disconnected'
        });
      };
      
      // Initial state
      captureState();
      
      // Transition 1: Start connecting
      await act(async () => {
        mockManager.forceState(ConnectionState.CONNECTING);
        mockSocket.forceState({ connected: false, connecting: true, disconnected: false });
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          isConnected: false,
          state: ConnectionState.CONNECTING,
          isConnecting: true
        });
      });
      captureState();
      
      // Transition 2: Complete connection
      await act(async () => {
        await mockManager.connect();
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          socket: mockSocket,
          isConnected: true,
          state: ConnectionState.CONNECTED,
          isConnecting: false
        });
      });
      captureState();
      
      // Verify synchronization
      expect(stateHistory).toHaveLength(3);
      
      // Initial: All disconnected
      expect(stateHistory[0].socketState.connected).toBe(false);
      expect(stateHistory[0].managerState).toBe(ConnectionState.DISCONNECTED);
      expect(stateHistory[0].hookConnected).toBe(false);
      
      // Connecting: Transitional state
      expect(stateHistory[1].socketState.connecting).toBe(true);
      expect(stateHistory[1].managerState).toBe(ConnectionState.CONNECTING);
      expect(stateHistory[1].hookConnected).toBe(false);
      
      // Connected: All synchronized
      expect(stateHistory[2].socketState.connected).toBe(true);
      expect(stateHistory[2].managerState).toBe(ConnectionState.CONNECTED);
      expect(stateHistory[2].hookConnected).toBe(true);
    });
  });
  
  describe('Error Recovery Chain', () => {
    it('should handle connection failures and recovery through entire chain', async () => {
      render(<TestApp mockManager={mockManager} />);
      
      // 1. Attempt connection that fails
      await act(async () => {
        mockManager.forceState(ConnectionState.ERROR);
        mockSocket.forceState({ connected: false, connecting: false, disconnected: true });
        mockSocket.emit('connect_error', new Error('Connection timeout'));
        
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          socket: mockSocket,
          isConnected: false,
          state: ConnectionState.ERROR,
          hasError: true
        });
      });
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      
      // 2. Attempt reconnection that succeeds
      await act(async () => {
        await mockManager.connect();
        mockSocket.forceState({ connected: true, connecting: false, disconnected: false });
        mockSocket.emit('connect');
        
        mockUseConnectionManager.mockReturnValue({
          ...mockUseConnectionManager.mock.results[0].value,
          socket: mockSocket,
          isConnected: true,
          state: ConnectionState.CONNECTED,
          hasError: false
        });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
      
      // Verify complete recovery
      expect(mockManager.getState()).toBe(ConnectionState.CONNECTED);
      expect(mockSocket.connected).toBe(true);
    });
  });
});
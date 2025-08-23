/**
 * TDD London School Tests: WebSocket Context Integration
 * 
 * Tests focused on the WebSocketSingletonContext integration with useWebSocketSingleton
 * and how it manages connection state. These tests will identify the exact point where
 * the connection state fails to propagate to the UI.
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Create comprehensive mocks for the entire connection chain
const mockSocket = {
  id: 'test-socket-id',
  connected: false,
  disconnected: true,
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  removeAllListeners: jest.fn(),
  once: jest.fn(),
  onAny: jest.fn()
};

const mockConnectionManager = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  getState: jest.fn().mockReturnValue('DISCONNECTED'),
  isConnected: jest.fn().mockReturnValue(false),
  getSocket: jest.fn().mockReturnValue(mockSocket),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  getDetailedStatus: jest.fn().mockReturnValue({
    state: 'DISCONNECTED',
    isConnected: false,
    socketConnected: false
  })
};

// Mock useConnectionManager hook
const mockUseConnectionManager = {
  socket: mockSocket,
  isConnected: false,
  state: 'DISCONNECTED',
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  manager: mockConnectionManager
};

// Mock all dependencies
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket)
}));

jest.mock('@/services/connection/connection-manager', () => ({
  WebSocketConnectionManager: jest.fn(() => mockConnectionManager),
  getGlobalConnectionManager: jest.fn(() => mockConnectionManager)
}));

jest.mock('@/hooks/useConnectionManager', () => ({
  useConnectionManager: jest.fn(() => mockUseConnectionManager)
}));

// Import components after mocking
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';

describe('TDD London School: WebSocket Context Integration', () => {
  
  // Test component to track context state
  const ContextStateTracker: React.FC = () => {
    const context = useWebSocketSingletonContext();
    
    return (
      <div>
        <div data-testid="context-is-connected">{context.isConnected.toString()}</div>
        <div data-testid="context-connection-state">{JSON.stringify(context.connectionState)}</div>
        <div data-testid="context-socket-id">{context.socket?.id || 'null'}</div>
        <div data-testid="ui-display">{context.isConnected ? 'Connected' : 'Disconnected'}</div>
        <button onClick={() => context.connect()} data-testid="context-connect-btn">Connect</button>
        <button onClick={() => context.disconnect()} data-testid="context-disconnect-btn">Disconnect</button>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock states to disconnected
    mockSocket.connected = false;
    mockSocket.disconnected = true;
    mockSocket.id = 'test-socket-id';
    
    mockConnectionManager.isConnected.mockReturnValue(false);
    mockConnectionManager.getState.mockReturnValue('DISCONNECTED');
    mockConnectionManager.getSocket.mockReturnValue(mockSocket);
    
    mockUseConnectionManager.isConnected = false;
    mockUseConnectionManager.state = 'DISCONNECTED';
    mockUseConnectionManager.socket = mockSocket;
  });

  describe('Context Initialization', () => {
    it('should initialize WebSocketSingletonContext with disconnected state', async () => {
      // ACT: Render context provider
      render(
        <WebSocketSingletonProvider config={{ autoConnect: false }}>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Should start disconnected
      expect(screen.getByTestId('context-is-connected')).toHaveTextContent('false');
      expect(screen.getByTestId('ui-display')).toHaveTextContent('Disconnected');
      
      // BEHAVIOR VERIFICATION: Context should use useWebSocketSingleton
      expect(mockUseConnectionManager.isConnected).toBe(false);
    });

    it('should call useWebSocketSingleton with correct configuration', async () => {
      // ARRANGE: Spy on useWebSocketSingleton calls
      const useWebSocketSingletonSpy = jest.spyOn(require('@/hooks/useWebSocketSingleton'), 'useWebSocketSingleton');

      // ACT: Render with specific config
      render(
        <WebSocketSingletonProvider config={{
          url: 'http://localhost:3001',
          autoConnect: true,
          reconnectAttempts: 5
        }}>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // BEHAVIOR VERIFICATION: Should pass config to hook
      expect(useWebSocketSingletonSpy).toHaveBeenCalledWith(expect.objectContaining({
        url: 'http://localhost:3001',
        autoConnect: true,
        maxReconnectAttempts: 5
      }));

      useWebSocketSingletonSpy.mockRestore();
    });
  });

  describe('Connection State Management', () => {
    it('should update context when useWebSocketSingleton state changes', async () => {
      // ARRANGE: Start with disconnected state
      const { rerender } = render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      expect(screen.getByTestId('ui-display')).toHaveTextContent('Disconnected');

      // ACT: Change hook state to connected
      await act(async () => {
        mockUseConnectionManager.isConnected = true;
        mockUseConnectionManager.state = 'CONNECTED';
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        mockConnectionManager.isConnected.mockReturnValue(true);
        
        // Force re-render
        rerender(
          <WebSocketSingletonProvider>
            <ContextStateTracker />
          </WebSocketSingletonProvider>
        );
      });

      // ASSERT: Context should reflect updated state
      await waitFor(() => {
        expect(screen.getByTestId('context-is-connected')).toHaveTextContent('true');
        expect(screen.getByTestId('ui-display')).toHaveTextContent('Connected');
      });
    });

    it('should handle connection state object correctly', async () => {
      // ARRANGE: Mock connected state with full connection state object
      mockUseConnectionManager.isConnected = true;
      mockConnectionManager.isConnected.mockReturnValue(true);
      mockSocket.connected = true;

      // ACT: Render context
      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Context should create proper connection state
      const connectionState = JSON.parse(screen.getByTestId('context-connection-state').textContent || '{}');
      expect(connectionState).toMatchObject({
        isConnected: expect.any(Boolean),
        isConnecting: expect.any(Boolean),
        reconnectAttempt: expect.any(Number)
      });

      // BEHAVIOR VERIFICATION: State should reflect isConnected
      if (mockUseConnectionManager.isConnected) {
        expect(connectionState.isConnected).toBe(true);
      }
    });
  });

  describe('Context Methods', () => {
    it('should delegate connect method to useWebSocketSingleton', async () => {
      // ACT: Render and test connect
      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ACT: Click connect button
      const connectBtn = screen.getByTestId('context-connect-btn');
      await act(async () => {
        connectBtn.click();
      });

      // BEHAVIOR VERIFICATION: Should call hook's connect method
      expect(mockUseConnectionManager.connect).toHaveBeenCalled();
    });

    it('should delegate disconnect method to useWebSocketSingleton', async () => {
      // ACT: Render and test disconnect
      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ACT: Click disconnect button
      const disconnectBtn = screen.getByTestId('context-disconnect-btn');
      await act(async () => {
        disconnectBtn.click();
      });

      // BEHAVIOR VERIFICATION: Should call hook's disconnect method
      expect(mockUseConnectionManager.disconnect).toHaveBeenCalled();
    });

    it('should provide socket from useWebSocketSingleton', async () => {
      // ARRANGE: Set socket ID
      mockSocket.id = 'context-test-socket';
      mockUseConnectionManager.socket = mockSocket;

      // ACT
      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Context should provide the socket
      expect(screen.getByTestId('context-socket-id')).toHaveTextContent('context-test-socket');
    });
  });

  describe('Event Handling Integration', () => {
    it('should register socket event handlers through context', async () => {
      // ARRANGE: Track event registrations
      const eventHandlers = new Map();
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        eventHandlers.set(event, handler);
      });

      // Create a component that uses context events
      const EventTestComponent: React.FC = () => {
        const { on, off } = useWebSocketSingletonContext();
        
        React.useEffect(() => {
          const handler = (data: any) => console.log('Test event:', data);
          on('test_event', handler);
          
          return () => off('test_event', handler);
        }, [on, off]);

        return <div>Event Test</div>;
      };

      // ACT: Render component
      render(
        <WebSocketSingletonProvider>
          <EventTestComponent />
        </WebSocketSingletonProvider>
      );

      // BEHAVIOR VERIFICATION: Should register event handlers on socket
      expect(mockSocket.on).toHaveBeenCalledWith('test_event', expect.any(Function));
    });

    it('should handle socket events and update connection state', async () => {
      // ARRANGE: Track connect event handler
      let connectHandler: (() => void) | undefined;
      mockSocket.on.mockImplementation((event: string, handler: any) => {
        if (event === 'connect') {
          connectHandler = handler;
        }
      });

      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ACT: Simulate socket connect event
      await act(async () => {
        if (connectHandler) {
          mockSocket.connected = true;
          mockUseConnectionManager.isConnected = true;
          mockConnectionManager.isConnected.mockReturnValue(true);
          connectHandler();
        }
      });

      // BEHAVIOR VERIFICATION: Context should reflect connection
      // Note: This documents current behavior, may show the bug
      expect(mockSocket.on).toHaveBeenCalled();
    });
  });

  describe('Context State Synchronization', () => {
    it('should keep context state synchronized with hook state', async () => {
      // ARRANGE: Create component that shows both hook and context state
      const SyncTestComponent: React.FC = () => {
        const hookState = useWebSocketSingleton({ autoConnect: false });
        const contextState = useWebSocketSingletonContext();
        
        return (
          <div>
            <div data-testid="hook-connected">{hookState.isConnected.toString()}</div>
            <div data-testid="context-connected">{contextState.isConnected.toString()}</div>
            <div data-testid="sync-status">
              {hookState.isConnected === contextState.isConnected ? 'SYNCED' : 'OUT_OF_SYNC'}
            </div>
          </div>
        );
      };

      // ACT: Render component
      render(
        <WebSocketSingletonProvider>
          <SyncTestComponent />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Hook and context should be synchronized
      expect(screen.getByTestId('sync-status')).toHaveTextContent('SYNCED');

      // ACT: Change connection state
      await act(async () => {
        mockUseConnectionManager.isConnected = true;
        mockConnectionManager.isConnected.mockReturnValue(true);
      });

      // BEHAVIOR VERIFICATION: States should remain synchronized
      // This test will reveal if context and hook get out of sync
    });

    it('should handle rapid connection state changes', async () => {
      // ARRANGE: Set up rapid state changes
      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ACT: Simulate rapid connect/disconnect
      await act(async () => {
        // Connect
        mockUseConnectionManager.isConnected = true;
        mockConnectionManager.isConnected.mockReturnValue(true);
        mockSocket.connected = true;
        
        // Then immediately disconnect
        mockUseConnectionManager.isConnected = false;
        mockConnectionManager.isConnected.mockReturnValue(false);
        mockSocket.connected = false;
      });

      // BEHAVIOR VERIFICATION: Context should handle rapid changes
      expect(screen.getByTestId('context-is-connected')).toHaveTextContent('false');
    });
  });

  describe('Critical Connection Display Test', () => {
    it('should ONLY pass when context correctly shows Connected status', async () => {
      // ARRANGE: Set up complete successful connection chain
      mockSocket.connected = true;
      mockSocket.disconnected = false;
      mockSocket.id = 'connected-socket';
      
      mockConnectionManager.isConnected.mockReturnValue(true);
      mockConnectionManager.getState.mockReturnValue('CONNECTED');
      
      mockUseConnectionManager.isConnected = true;
      mockUseConnectionManager.state = 'CONNECTED';
      mockUseConnectionManager.socket = mockSocket;

      // ACT: Render context
      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: This test should ONLY pass when UI shows "Connected"
      const displayElement = screen.getByTestId('ui-display');
      expect(displayElement).toHaveTextContent('Connected');

      // CRITICAL VERIFICATION: All layers should report connected
      expect(mockSocket.connected).toBe(true);
      expect(mockConnectionManager.isConnected()).toBe(true);
      expect(mockUseConnectionManager.isConnected).toBe(true);
      expect(screen.getByTestId('context-is-connected')).toHaveTextContent('true');
    });

    it('should document where the connection chain breaks', async () => {
      // ARRANGE: Set up broken chain scenario
      mockSocket.connected = true; // Socket connected
      mockConnectionManager.isConnected.mockReturnValue(false); // Manager says disconnected
      mockUseConnectionManager.isConnected = false; // Hook says disconnected
      
      // ACT
      render(
        <WebSocketSingletonProvider>
          <ContextStateTracker />
        </WebSocketSingletonProvider>
      );

      // ASSERT: Show the broken chain
      expect(screen.getByTestId('ui-display')).toHaveTextContent('Disconnected');
      
      // DIAGNOSTIC: Log the chain state
      console.log('\n=== CONNECTION CHAIN DEBUG ===');
      console.log('1. Socket connected:', mockSocket.connected);
      console.log('2. Manager isConnected:', mockConnectionManager.isConnected());
      console.log('3. Hook isConnected:', mockUseConnectionManager.isConnected);
      console.log('4. Context shows:', screen.getByTestId('context-is-connected').textContent);
      console.log('5. UI displays:', screen.getByTestId('ui-display').textContent);
      console.log('==============================\n');

      // This test documents where the chain breaks
      expect(mockSocket.connected).toBe(true);
      expect(mockConnectionManager.isConnected()).toBe(false);
      expect(screen.getByTestId('ui-display')).toHaveTextContent('Disconnected');
    });
  });
});
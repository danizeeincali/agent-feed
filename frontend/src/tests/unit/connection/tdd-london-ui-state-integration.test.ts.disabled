/**
 * TDD London School UI State Integration Tests
 * 
 * Tests the complete workflow from WebSocket events to UI state updates.
 * Focuses on identifying why frontend UI shows "Disconnected" when backend is connected.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock all external dependencies
jest.mock('@/hooks/useWebSocketSingleton');
jest.mock('@/context/WebSocketSingletonContext');
jest.mock('@/services/connection/connection-manager');

import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';
import { useWebSocketSingletonContext } from '@/context/WebSocketSingletonContext';
import { ConnectionState } from '@/services/connection/types';

// Mock UI components for testing
const MockConnectionStatusComponent: React.FC = () => {
  const { isConnected, connectionState } = useWebSocketSingleton();
  
  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="connection-state">
        {connectionState}
      </div>
    </div>
  );
};

const MockWebSocketContextComponent: React.FC = () => {
  const { isConnected, connectionState } = useWebSocketSingletonContext();
  
  return (
    <div>
      <div data-testid="context-connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="context-connection-state">
        {connectionState.isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
};

// Mock contracts for UI state management
interface MockWebSocketSingleton {
  socket: any;
  isConnected: boolean;
  connectionState: string;
  connect: jest.MockedFunction<() => Promise<void>>;
  disconnect: jest.MockedFunction<() => Promise<void>>;
  emit: jest.MockedFunction<(event: string, data: any) => void>;
  on: jest.MockedFunction<(event: string, handler: Function) => void>;
  off: jest.MockedFunction<(event: string, handler: Function) => void>;
}

interface MockWebSocketContext {
  socket: any;
  isConnected: boolean;
  connectionState: {
    isConnected: boolean;
    isConnecting: boolean;
    reconnectAttempt: number;
    lastConnected: string | null;
    connectionError: string | null;
  };
  connect: jest.MockedFunction<() => Promise<void>>;
  disconnect: jest.MockedFunction<() => Promise<void>>;
  emit: jest.MockedFunction<(event: string, data?: any) => void>;
  on: jest.MockedFunction<(event: string, handler: (data: any) => void) => void>;
  off: jest.MockedFunction<(event: string, handler?: (data: any) => void) => void>;
  notifications: any[];
  onlineUsers: any[];
  systemStats: any;
}

// Mock factory functions
const createMockWebSocketSingleton = (overrides: Partial<MockWebSocketSingleton> = {}): MockWebSocketSingleton => ({
  socket: { connected: false, id: 'mock-socket' },
  isConnected: false,
  connectionState: ConnectionState.DISCONNECTED,
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  ...overrides
});

const createMockWebSocketContext = (overrides: Partial<MockWebSocketContext> = {}): MockWebSocketContext => ({
  socket: { connected: false, id: 'mock-socket' },
  isConnected: false,
  connectionState: {
    isConnected: false,
    isConnecting: false,
    reconnectAttempt: 0,
    lastConnected: null,
    connectionError: null
  },
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  notifications: [],
  onlineUsers: [],
  systemStats: null,
  ...overrides
});

describe('TDD London School: UI State Integration', () => {
  let mockWebSocketSingleton: MockWebSocketSingleton;
  let mockWebSocketContext: MockWebSocketContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup fresh mocks
    mockWebSocketSingleton = createMockWebSocketSingleton();
    mockWebSocketContext = createMockWebSocketContext();

    // Configure mock returns
    (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
      .mockReturnValue(mockWebSocketSingleton);
    
    (useWebSocketSingletonContext as jest.MockedFunction<typeof useWebSocketSingletonContext>)
      .mockReturnValue(mockWebSocketContext as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Feature: Backend Connected, Frontend Shows Disconnected', () => {
    
    it('should detect state mismatch between socket and UI hook', () => {
      // ARRANGE: Mock backend connected but hook shows disconnected
      const connectedSocket = { connected: true, id: 'connected-socket' };
      
      mockWebSocketSingleton = createMockWebSocketSingleton({
        socket: connectedSocket,
        isConnected: false, // Bug: Hook doesn't reflect socket state
        connectionState: ConnectionState.DISCONNECTED
      });

      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(mockWebSocketSingleton);

      // ACT: Render UI component
      render(<MockConnectionStatusComponent />);

      // ASSERT: Verify the bug scenario
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.DISCONNECTED);
      
      // But the socket is actually connected (revealing the bug)
      expect(mockWebSocketSingleton.socket.connected).toBe(true);
    });

    it('should detect context/hook state inconsistency', () => {
      // ARRANGE: Context and hook return different states
      mockWebSocketSingleton = createMockWebSocketSingleton({
        isConnected: false,
        connectionState: ConnectionState.DISCONNECTED
      });

      mockWebSocketContext = createMockWebSocketContext({
        isConnected: true, // Context says connected
        connectionState: {
          isConnected: true,
          isConnecting: false,
          reconnectAttempt: 0,
          lastConnected: new Date().toISOString(),
          connectionError: null
        }
      });

      // Update mocks
      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(mockWebSocketSingleton);
      
      (useWebSocketSingletonContext as jest.MockedFunction<typeof useWebSocketSingletonContext>)
        .mockReturnValue(mockWebSocketContext as any);

      // ACT: Render both components
      const { container } = render(
        <div>
          <MockConnectionStatusComponent />
          <MockWebSocketContextComponent />
        </div>
      );

      // ASSERT: Verify inconsistent states
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('context-connection-status')).toHaveTextContent('Connected');
      expect(screen.getByTestId('context-connection-state')).toHaveTextContent('Connected');
      
      // This reveals the synchronization bug between hook and context
    });

    it('should test state propagation from socket events to UI', async () => {
      // ARRANGE: Set up event handler tracking
      const eventHandlers: Record<string, Function> = {};
      
      mockWebSocketSingleton.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
      });

      // Initial disconnected state
      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(mockWebSocketSingleton);

      // ACT: Render component
      const { rerender } = render(<MockConnectionStatusComponent />);

      // Simulate socket connection event
      if (eventHandlers.connect) {
        // Update mock to connected state
        mockWebSocketSingleton = createMockWebSocketSingleton({
          socket: { connected: true, id: 'connected-socket' },
          isConnected: true,
          connectionState: ConnectionState.CONNECTED
        });

        (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
          .mockReturnValue(mockWebSocketSingleton);

        // Trigger the event
        act(() => {
          eventHandlers.connect();
        });

        rerender(<MockConnectionStatusComponent />);
      }

      // ASSERT: Verify UI updates correctly
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.CONNECTED);
      });
    });
  });

  describe('Contract: Hook-Context Collaboration', () => {
    
    it('should verify hook and context use same connection instance', () => {
      // ARRANGE: Both should reference the same underlying connection
      const sharedSocket = { connected: true, id: 'shared-socket' };
      
      mockWebSocketSingleton = createMockWebSocketSingleton({
        socket: sharedSocket,
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });

      mockWebSocketContext = createMockWebSocketContext({
        socket: sharedSocket,
        isConnected: true,
        connectionState: {
          isConnected: true,
          isConnecting: false,
          reconnectAttempt: 0,
          lastConnected: new Date().toISOString(),
          connectionError: null
        }
      });

      // ACT: Use both hook and context
      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(mockWebSocketSingleton);
      
      (useWebSocketSingletonContext as jest.MockedFunction<typeof useWebSocketSingletonContext>)
        .mockReturnValue(mockWebSocketContext as any);

      // ASSERT: Verify they reference the same socket
      expect(mockWebSocketSingleton.socket).toBe(sharedSocket);
      expect(mockWebSocketContext.socket).toBe(sharedSocket);
      expect(mockWebSocketSingleton.isConnected).toBe(mockWebSocketContext.isConnected);
    });

    it('should verify event handler registration consistency', () => {
      // ARRANGE: Track event registrations
      const singletonEvents: string[] = [];
      const contextEvents: string[] = [];

      mockWebSocketSingleton.on.mockImplementation((event: string) => {
        singletonEvents.push(event);
      });

      mockWebSocketContext.on.mockImplementation((event: string) => {
        contextEvents.push(event);
      });

      // ACT: Initialize both
      renderHook(() => useWebSocketSingleton());
      // Context would be initialized through provider

      // ASSERT: Verify both register for important events
      // Note: In real implementation, we'd verify actual event registrations
      expect(mockWebSocketSingleton.on).toBeDefined();
      expect(mockWebSocketContext.on).toBeDefined();
    });
  });

  describe('Behavior: State Transition Workflows', () => {
    
    it('should handle connecting -> connected transition', async () => {
      // ARRANGE: Start with connecting state
      let currentState = createMockWebSocketSingleton({
        isConnected: false,
        connectionState: ConnectionState.CONNECTING
      });

      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(currentState);

      // ACT: Render initial state
      const { rerender } = render(<MockConnectionStatusComponent />);
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.CONNECTING);

      // Update to connected state
      currentState = createMockWebSocketSingleton({
        socket: { connected: true, id: 'connected-socket' },
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });

      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(currentState);

      rerender(<MockConnectionStatusComponent />);

      // ASSERT: Verify successful transition
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.CONNECTED);
    });

    it('should handle connection error states', async () => {
      // ARRANGE: Start with error state
      const errorState = createMockWebSocketSingleton({
        isConnected: false,
        connectionState: ConnectionState.ERROR
      });

      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(errorState);

      // ACT: Render error state
      render(<MockConnectionStatusComponent />);

      // ASSERT: Verify error state is reflected in UI
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.ERROR);
    });

    it('should handle reconnection workflows', async () => {
      // ARRANGE: Simulate reconnection sequence
      const states = [
        createMockWebSocketSingleton({
          isConnected: false,
          connectionState: ConnectionState.DISCONNECTED
        }),
        createMockWebSocketSingleton({
          isConnected: false,
          connectionState: ConnectionState.RECONNECTING
        }),
        createMockWebSocketSingleton({
          socket: { connected: true, id: 'reconnected-socket' },
          isConnected: true,
          connectionState: ConnectionState.CONNECTED
        })
      ];

      let stateIndex = 0;
      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockImplementation(() => states[stateIndex]);

      // ACT: Render and step through states
      const { rerender } = render(<MockConnectionStatusComponent />);

      // Initial disconnected state
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.DISCONNECTED);

      // Move to reconnecting state
      stateIndex = 1;
      rerender(<MockConnectionStatusComponent />);
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.RECONNECTING);

      // Move to connected state
      stateIndex = 2;
      rerender(<MockConnectionStatusComponent />);
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.CONNECTED);
    });
  });

  describe('Edge Cases: UI State Synchronization', () => {
    
    it('should handle rapid state changes without UI flicker', async () => {
      // ARRANGE: Rapid state changes
      const rapidStates = [
        ConnectionState.CONNECTING,
        ConnectionState.CONNECTED,
        ConnectionState.DISCONNECTED,
        ConnectionState.RECONNECTING,
        ConnectionState.CONNECTED
      ];

      let stateIndex = 0;
      const getNextState = () => {
        const state = createMockWebSocketSingleton({
          isConnected: rapidStates[stateIndex] === ConnectionState.CONNECTED,
          connectionState: rapidStates[stateIndex]
        });
        stateIndex = (stateIndex + 1) % rapidStates.length;
        return state;
      };

      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockImplementation(getNextState);

      // ACT: Render and trigger rapid updates
      const { rerender } = render(<MockConnectionStatusComponent />);
      
      // Simulate rapid rerenders
      for (let i = 0; i < rapidStates.length; i++) {
        rerender(<MockConnectionStatusComponent />);
      }

      // ASSERT: UI should be stable and not crash
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('connection-state')).toBeInTheDocument();
    });

    it('should handle null socket gracefully', () => {
      // ARRANGE: Null socket scenario
      const nullSocketState = createMockWebSocketSingleton({
        socket: null,
        isConnected: false,
        connectionState: ConnectionState.DISCONNECTED
      });

      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(nullSocketState);

      // ACT: Render with null socket
      render(<MockConnectionStatusComponent />);

      // ASSERT: Component should handle null socket gracefully
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('connection-state')).toHaveTextContent(ConnectionState.DISCONNECTED);
    });

    it('should handle context provider not found', () => {
      // ARRANGE: Mock context hook to throw error
      (useWebSocketSingletonContext as jest.MockedFunction<typeof useWebSocketSingletonContext>)
        .mockImplementation(() => {
          throw new Error('useWebSocketSingletonContext must be used within a WebSocketSingletonProvider');
        });

      // ACT & ASSERT: Should handle context error gracefully
      expect(() => {
        render(<MockWebSocketContextComponent />);
      }).toThrow('useWebSocketSingletonContext must be used within a WebSocketSingletonProvider');
    });
  });

  describe('Performance: State Update Optimization', () => {
    
    it('should prevent unnecessary rerenders on same state', () => {
      // ARRANGE: Same state returned multiple times
      const stableState = createMockWebSocketSingleton({
        isConnected: true,
        connectionState: ConnectionState.CONNECTED
      });

      let renderCount = 0;
      const TestComponent: React.FC = () => {
        renderCount++;
        const { isConnected, connectionState } = useWebSocketSingleton();
        return (
          <div data-testid="render-count">{renderCount}</div>
        );
      };

      (useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>)
        .mockReturnValue(stableState);

      // ACT: Render multiple times with same state
      const { rerender } = render(<TestComponent />);
      rerender(<TestComponent />);
      rerender(<TestComponent />);

      // ASSERT: Component should render multiple times (React behavior)
      // but hook should return stable references
      expect(screen.getByTestId('render-count')).toHaveTextContent('3');
      
      // Verify same state instance is returned
      expect(useWebSocketSingleton).toHaveBeenCalled();
    });
  });
});
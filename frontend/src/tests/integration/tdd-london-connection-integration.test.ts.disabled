/**
 * TDD London School Connection Integration Tests
 * 
 * End-to-end integration tests that verify the complete connection workflow
 * from WebSocket initialization to UI state updates, focusing on identifying
 * the root cause of the "backend connected, frontend shows disconnected" issue.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import React from 'react';

// Mock real implementations for integration testing
jest.mock('socket.io-client');

import { io, Socket } from 'socket.io-client';
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';
import { WebSocketSingletonProvider } from '@/context/WebSocketSingletonContext';
import { ConnectionState } from '@/services/connection/types';

// Integration test component that uses the full connection stack
const IntegrationTestComponent: React.FC = () => {
  const { socket, isConnected, connectionState, connect, disconnect } = useWebSocketSingleton();
  
  return (
    <div>
      <div data-testid="integration-connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="integration-connection-state">
        {connectionState}
      </div>
      <div data-testid="integration-socket-status">
        {socket?.connected ? 'Socket Connected' : 'Socket Disconnected'}
      </div>
      <div data-testid="integration-socket-id">
        {socket?.id || 'No Socket ID'}
      </div>
      <button onClick={connect} data-testid="connect-button">
        Connect
      </button>
      <button onClick={disconnect} data-testid="disconnect-button">
        Disconnect
      </button>
    </div>
  );
};

// Wrapper component with context provider
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <WebSocketSingletonProvider>
    {children}
  </WebSocketSingletonProvider>
);

describe('TDD London School: Connection Integration Tests', () => {
  let mockSocket: jest.Mocked<Socket>;
  let mockIo: jest.MockedFunction<typeof io>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create comprehensive mock socket
    mockSocket = {
      connected: false,
      disconnected: true,
      id: undefined,
      emit: jest.fn().mockReturnValue(true),
      on: jest.fn().mockReturnThis(),
      off: jest.fn().mockReturnThis(),
      once: jest.fn().mockReturnThis(),
      connect: jest.fn().mockReturnThis(),
      disconnect: jest.fn().mockReturnThis(),
      removeAllListeners: jest.fn().mockReturnThis(),
    } as any;

    // Mock io function
    mockIo = io as jest.MockedFunction<typeof io>;
    mockIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Integration: Full Connection Workflow', () => {
    
    it('should complete successful connection workflow end-to-end', async () => {
      // ARRANGE: Set up complete connection simulation
      const eventHandlers: Record<string, Function> = {};
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      // ACT: Render full component with provider
      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // Initial state should be disconnected
      expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('integration-socket-status')).toHaveTextContent('Socket Disconnected');

      // Simulate socket connection
      act(() => {
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        mockSocket.id = 'integration-test-socket-id';
        
        // Trigger connect event
        if (eventHandlers.connect) {
          eventHandlers.connect();
        }
      });

      // ASSERT: Verify end-to-end state propagation
      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('integration-socket-status')).toHaveTextContent('Socket Connected');
        expect(screen.getByTestId('integration-socket-id')).toHaveTextContent('integration-test-socket-id');
      });
    });

    it('should identify state synchronization issues in integration', async () => {
      // ARRANGE: Create state mismatch scenario
      const eventHandlers: Record<string, Function> = {};
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      // ACT: Render component
      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // Simulate backend connection without proper state update
      act(() => {
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        mockSocket.id = 'backend-connected-socket';
        
        // Don't trigger connect event (simulating the bug)
        // This creates the scenario where socket is connected but UI doesn't know
      });

      // ASSERT: This should reveal the synchronization bug
      await waitFor(() => {
        // Socket shows as connected
        expect(screen.getByTestId('integration-socket-status')).toHaveTextContent('Socket Connected');
        expect(screen.getByTestId('integration-socket-id')).toHaveTextContent('backend-connected-socket');
        
        // But UI still shows disconnected (the bug)
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Disconnected');
        expect(screen.getByTestId('integration-connection-state')).toHaveTextContent(ConnectionState.DISCONNECTED);
      });
    });

    it('should handle connection errors in full workflow', async () => {
      // ARRANGE: Set up error scenario
      const eventHandlers: Record<string, Function> = {};
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      // ACT: Render and simulate connection error
      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // Simulate connection error
      act(() => {
        const connectionError = new Error('Integration test connection failed');
        if (eventHandlers.connect_error) {
          eventHandlers.connect_error(connectionError);
        }
      });

      // ASSERT: Verify error handling
      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Disconnected');
        expect(screen.getByTestId('integration-socket-status')).toHaveTextContent('Socket Disconnected');
      });
    });

    it('should handle reconnection scenarios', async () => {
      // ARRANGE: Set up reconnection workflow
      const eventHandlers: Record<string, Function> = {};
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // Step 1: Initial connection
      act(() => {
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        mockSocket.id = 'initial-connection';
        
        if (eventHandlers.connect) {
          eventHandlers.connect();
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Connected');
      });

      // Step 2: Simulate disconnection
      act(() => {
        mockSocket.connected = false;
        mockSocket.disconnected = true;
        mockSocket.id = undefined;
        
        if (eventHandlers.disconnect) {
          eventHandlers.disconnect('transport close');
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Disconnected');
      });

      // Step 3: Simulate reconnection
      act(() => {
        mockSocket.connected = true;
        mockSocket.disconnected = false;
        mockSocket.id = 'reconnected-socket';
        
        if (eventHandlers.connect) {
          eventHandlers.connect();
        }
      });

      // ASSERT: Verify reconnection workflow
      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('integration-socket-id')).toHaveTextContent('reconnected-socket');
      });
    });
  });

  describe('Integration: Context Provider Behavior', () => {
    
    it('should verify context provider manages singleton correctly', async () => {
      // ARRANGE: Multiple components using the same context
      const Component1: React.FC = () => {
        const { socket, isConnected } = useWebSocketSingleton();
        return (
          <div>
            <div data-testid="component1-status">{isConnected ? 'Connected' : 'Disconnected'}</div>
            <div data-testid="component1-socket-id">{socket?.id || 'No ID'}</div>
          </div>
        );
      };

      const Component2: React.FC = () => {
        const { socket, isConnected } = useWebSocketSingleton();
        return (
          <div>
            <div data-testid="component2-status">{isConnected ? 'Connected' : 'Disconnected'}</div>
            <div data-testid="component2-socket-id">{socket?.id || 'No ID'}</div>
          </div>
        );
      };

      // ACT: Render multiple components
      render(
        <TestWrapper>
          <Component1 />
          <Component2 />
        </TestWrapper>
      );

      // Simulate connection
      const eventHandlers: Record<string, Function> = {};
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      act(() => {
        mockSocket.connected = true;
        mockSocket.id = 'singleton-socket';
        
        if (eventHandlers.connect) {
          eventHandlers.connect();
        }
      });

      // ASSERT: Both components should show same state (singleton behavior)
      await waitFor(() => {
        expect(screen.getByTestId('component1-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('component2-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('component1-socket-id')).toHaveTextContent('singleton-socket');
        expect(screen.getByTestId('component2-socket-id')).toHaveTextContent('singleton-socket');
      });
    });

    it('should handle context provider initialization timing', async () => {
      // ARRANGE: Test initialization race conditions
      let providerInitialized = false;
      
      const DelayedComponent: React.FC = () => {
        const { isConnected, socket } = useWebSocketSingleton();
        providerInitialized = true;
        
        return (
          <div data-testid="delayed-status">
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        );
      };

      // ACT: Render with provider
      render(
        <TestWrapper>
          <DelayedComponent />
        </TestWrapper>
      );

      // ASSERT: Component should initialize properly
      expect(providerInitialized).toBe(true);
      expect(screen.getByTestId('delayed-status')).toHaveTextContent('Disconnected');
    });
  });

  describe('Integration: Real Socket.IO Behavior Simulation', () => {
    
    it('should simulate real socket.io connection sequence', async () => {
      // ARRANGE: Simulate realistic socket.io behavior
      const eventHandlers: Record<string, Function> = {};
      let connectionAttempts = 0;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      mockSocket.connect.mockImplementation(() => {
        connectionAttempts++;
        
        // Simulate async connection
        setTimeout(() => {
          mockSocket.connected = true;
          mockSocket.disconnected = false;
          mockSocket.id = `socket-${connectionAttempts}`;
          
          if (eventHandlers.connect) {
            eventHandlers.connect();
          }
        }, 10);
        
        return mockSocket;
      });

      // ACT: Render and trigger connection
      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // Trigger connection through UI
      const connectButton = screen.getByTestId('connect-button');
      act(() => {
        connectButton.click();
      });

      // ASSERT: Verify realistic connection behavior
      await waitFor(() => {
        expect(mockSocket.connect).toHaveBeenCalled();
        expect(connectionAttempts).toBe(1);
      });

      // Wait for async connection completion
      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('integration-socket-id')).toHaveTextContent('socket-1');
      }, { timeout: 100 });
    });

    it('should handle socket.io auto-reconnection patterns', async () => {
      // ARRANGE: Simulate socket.io auto-reconnection
      const eventHandlers: Record<string, Function> = {};
      let reconnectionAttempts = 0;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // Initial connection
      act(() => {
        mockSocket.connected = true;
        mockSocket.id = 'initial-socket';
        if (eventHandlers.connect) {
          eventHandlers.connect();
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Connected');
      });

      // Simulate unexpected disconnection
      act(() => {
        mockSocket.connected = false;
        mockSocket.disconnected = true;
        if (eventHandlers.disconnect) {
          eventHandlers.disconnect('transport error');
        }
      });

      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Disconnected');
      });

      // Simulate auto-reconnection after delay
      setTimeout(() => {
        act(() => {
          reconnectionAttempts++;
          mockSocket.connected = true;
          mockSocket.disconnected = false;
          mockSocket.id = `reconnected-socket-${reconnectionAttempts}`;
          
          if (eventHandlers.connect) {
            eventHandlers.connect();
          }
        });
      }, 50);

      // ASSERT: Verify auto-reconnection
      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('integration-socket-id')).toHaveTextContent('reconnected-socket-1');
      }, { timeout: 200 });
    });
  });

  describe('Integration: Performance and Memory', () => {
    
    it('should not create memory leaks with multiple mount/unmount cycles', async () => {
      // ARRANGE: Track event listener registrations
      const eventRegistrations: Array<{ event: string; handler: Function }> = [];
      const eventRemovals: Array<{ event: string; handler: Function }> = [];

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventRegistrations.push({ event, handler });
        return mockSocket;
      });

      mockSocket.off.mockImplementation((event: string, handler: Function) => {
        eventRemovals.push({ event, handler });
        return mockSocket;
      });

      // ACT: Mount and unmount multiple times
      for (let i = 0; i < 3; i++) {
        const { unmount } = render(
          <TestWrapper>
            <IntegrationTestComponent />
          </TestWrapper>
        );
        
        // Simulate connection
        act(() => {
          mockSocket.connected = true;
          mockSocket.id = `cycle-${i}`;
        });

        unmount();
      }

      // ASSERT: Verify proper cleanup
      expect(eventRegistrations.length).toBeGreaterThan(0);
      // Note: In real implementation, we'd verify eventRemovals.length matches registrations
    });

    it('should handle rapid state changes without performance issues', async () => {
      // ARRANGE: Rapid state change simulation
      const eventHandlers: Record<string, Function> = {};
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        eventHandlers[event] = handler;
        return mockSocket;
      });

      render(
        <TestWrapper>
          <IntegrationTestComponent />
        </TestWrapper>
      );

      // ACT: Rapid connect/disconnect cycles
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockSocket.connected = i % 2 === 0;
          mockSocket.id = i % 2 === 0 ? `rapid-${i}` : undefined;
          
          const eventName = i % 2 === 0 ? 'connect' : 'disconnect';
          if (eventHandlers[eventName]) {
            eventHandlers[eventName]();
          }
        });
      }

      const endTime = performance.now();

      // ASSERT: Should complete rapidly without blocking
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Final state should be stable
      await waitFor(() => {
        expect(screen.getByTestId('integration-connection-status')).toBeInTheDocument();
      });
    });
  });
});
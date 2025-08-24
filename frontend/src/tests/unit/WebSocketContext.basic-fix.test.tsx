import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '../../context/WebSocketSingletonContext';

// Mock the WebSocket singleton hook to avoid actual connections
jest.mock('../../hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: jest.fn(() => ({
    socket: {
      id: 'test-socket-id',
      connected: true,
      disconnected: false,
      io: { readyState: 'open' },
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    isConnected: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn()
  }))
}));

// Test component that uses the context
const TestComponent = () => {
  try {
    const context = useWebSocketSingletonContext();
    
    return (
      <div>
        <div data-testid="connection-state">
          {JSON.stringify(context.connectionState)}
        </div>
        <div data-testid="is-connected">
          {context.isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div data-testid="socket-id">
          {context.socket?.id || 'No Socket'}
        </div>
        <div data-testid="temporal-dead-zone-fix">
          Success - No temporal dead zone error
        </div>
      </div>
    );
  } catch (error: any) {
    return (
      <div data-testid="error">
        Error: {error.message}
      </div>
    );
  }
};

describe('WebSocket Context - Temporal Dead Zone Fix Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Spy on console.error to catch temporal dead zone errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not throw "Cannot access connectionState before initialization" error', async () => {
    // This test ensures the temporal dead zone issue is fixed
    const consoleSpy = jest.spyOn(console, 'error');
    
    expect(() => {
      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );
    }).not.toThrow();

    // Check that the component rendered successfully
    await waitFor(() => {
      expect(screen.getByTestId('temporal-dead-zone-fix')).toBeInTheDocument();
      expect(screen.getByTestId('temporal-dead-zone-fix')).toHaveTextContent('Success - No temporal dead zone error');
    });

    // Verify no temporal dead zone errors were logged
    const temporalDeadZoneErrors = consoleSpy.mock.calls.filter(call =>
      call.some(arg => 
        typeof arg === 'string' && 
        arg.includes('Cannot access') && 
        arg.includes('before initialization') &&
        arg.includes('connectionState')
      )
    );

    expect(temporalDeadZoneErrors).toHaveLength(0);
  });

  it('should properly initialize connectionState without temporal dead zone errors', async () => {
    render(
      <WebSocketSingletonProvider>
        <TestComponent />
      </WebSocketSingletonProvider>
    );

    await waitFor(() => {
      const connectionState = screen.getByTestId('connection-state');
      expect(connectionState).toBeInTheDocument();
      
      // Parse the connection state JSON
      const stateData = JSON.parse(connectionState.textContent || '{}');
      expect(stateData).toHaveProperty('isConnected');
      expect(stateData).toHaveProperty('isConnecting');
      expect(stateData).toHaveProperty('reconnectAttempt');
      expect(stateData).toHaveProperty('lastConnected');
      expect(stateData).toHaveProperty('connectionError');
    });
  });

  it('should handle Socket.IO specific connection states properly', async () => {
    render(
      <WebSocketSingletonProvider>
        <TestComponent />
      </WebSocketSingletonProvider>
    );

    await waitFor(() => {
      const isConnected = screen.getByTestId('is-connected');
      expect(isConnected.textContent).toBe('Connected');
      
      const socketId = screen.getByTestId('socket-id');
      expect(socketId.textContent).toBe('test-socket-id');
    });
  });

  it('should handle context provider re-renders without temporal dead zone errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    const { rerender } = render(
      <WebSocketSingletonProvider config={{ url: 'ws://localhost:3001' }}>
        <TestComponent />
      </WebSocketSingletonProvider>
    );

    // Re-render with different config - should not cause temporal dead zone errors
    rerender(
      <WebSocketSingletonProvider config={{ url: 'ws://localhost:3002', autoConnect: false }}>
        <TestComponent />
      </WebSocketSingletonProvider>
    );

    await waitFor(() => {
      const connectionState = screen.getByTestId('connection-state');
      expect(connectionState).toBeInTheDocument();
      
      // Should still have valid connection state structure
      const stateData = JSON.parse(connectionState.textContent || '{}');
      expect(stateData).toHaveProperty('isConnected');
      expect(stateData).toHaveProperty('isConnecting');
    });

    // Verify no temporal dead zone errors during re-renders
    const temporalDeadZoneErrors = consoleSpy.mock.calls.filter(call =>
      call.some(arg => 
        typeof arg === 'string' && 
        arg.includes('Cannot access') && 
        arg.includes('connectionState') &&
        arg.includes('before initialization')
      )
    );

    expect(temporalDeadZoneErrors).toHaveLength(0);
  });

  it('should demonstrate that the fix resolves variable declaration order issues', () => {
    // This test validates that the fix correctly orders variable declarations
    
    // Simulated problematic pattern (what was wrong):
    const problematicPattern = `
      const contextValue = useMemo(() => ({
        connectionState,  // ERROR: Used before declaration
      }), [connectionState]);
      
      const connectionState = useMemo(() => {
        // state logic
      }, []);
    `;
    
    // Fixed pattern (what we implemented):
    const fixedPattern = `
      const connectionState = useMemo(() => {
        // state logic - declared first
      }, []);
      
      const contextValue = useMemo(() => ({
        connectionState,  // Safe to use after declaration
      }), [connectionState]);
    `;

    // The fact that our component renders without errors validates the fix
    render(
      <WebSocketSingletonProvider>
        <TestComponent />
      </WebSocketSingletonProvider>
    );

    expect(screen.getByTestId('temporal-dead-zone-fix')).toHaveTextContent('Success - No temporal dead zone error');
  });
});
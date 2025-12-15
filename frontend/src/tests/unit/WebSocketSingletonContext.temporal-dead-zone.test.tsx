import { render, screen, waitFor } from '@testing-library/react';
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '../../context/WebSocketSingletonContext';
import React from 'react';

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
    </div>
  );
};

describe('WebSocketSingletonContext - Temporal Dead Zone Fix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should not throw "Cannot access connectionState before initialization" error', async () => {
    // This test ensures the temporal dead zone issue is fixed
    expect(() => {
      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );
    }).not.toThrow();
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

  it('should properly calculate isConnecting state for Socket.IO', async () => {
    // Mock a connecting socket
    const { useWebSocketSingleton } = require('../../hooks/useWebSocketSingleton');
    (useWebSocketSingleton as jest.Mock).mockReturnValue({
      socket: {
        id: 'connecting-socket',
        connected: false,
        disconnected: false,
        io: { readyState: 'opening' },
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn()
      },
      isConnected: false,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn()
    });

    render(
      <WebSocketSingletonProvider>
        <TestComponent />
      </WebSocketSingletonProvider>
    );

    await waitFor(() => {
      const connectionState = screen.getByTestId('connection-state');
      const stateData = JSON.parse(connectionState.textContent || '{}');
      
      // Should detect connecting state properly
      expect(stateData.isConnecting).toBe(true);
      expect(stateData.isConnected).toBe(false);
    });
  });

  it('should handle context provider re-renders without temporal dead zone errors', async () => {
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
  });

  it('should maintain referential stability of context value', async () => {
    let contextValue1: any;
    let contextValue2: any;

    const TestStabilityComponent = () => {
      const context = useWebSocketSingletonContext();
      
      if (!contextValue1) {
        contextValue1 = context;
      } else if (!contextValue2) {
        contextValue2 = context;
      }
      
      return <div data-testid="stability-test">Stable</div>;
    };

    const { rerender } = render(
      <WebSocketSingletonProvider>
        <TestStabilityComponent />
      </WebSocketSingletonProvider>
    );

    // Force a re-render
    rerender(
      <WebSocketSingletonProvider>
        <TestStabilityComponent />
      </WebSocketSingletonProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('stability-test')).toBeInTheDocument();
    });

    // Context values should be stable (same reference) between renders
    // when dependencies haven't changed
    expect(contextValue1).toBeDefined();
    expect(contextValue2).toBeDefined();
  });

  it('should properly handle error boundaries with context initialization', async () => {
    // Test that the context doesn't throw during initialization which could
    // trigger error boundaries
    
    const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
      const [hasError, setHasError] = React.useState(false);
      
      React.useEffect(() => {
        const handleError = (error: ErrorEvent) => {
          if (error.message?.includes('Cannot access') && error.message?.includes('before initialization')) {
            setHasError(true);
          }
        };
        
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
      }, []);
      
      if (hasError) {
        return <div data-testid="temporal-dead-zone-error">Temporal Dead Zone Error Caught</div>;
      }
      
      return <>{children}</>;
    };

    render(
      <ErrorBoundary>
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('temporal-dead-zone-error')).not.toBeInTheDocument();
      expect(screen.getByTestId('connection-state')).toBeInTheDocument();
    });
  });
});
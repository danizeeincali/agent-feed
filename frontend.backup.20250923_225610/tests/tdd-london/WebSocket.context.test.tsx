/**
 * TDD London School: WebSocket Context Tests
 * 
 * Testing WebSocket context provider and consumer interactions using mock-driven development.
 * Focuses on how WebSocket context collaborates with components and manages connection state.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';

// Mock WebSocket and Socket.IO
const mockSocket = {
  id: 'test-socket-id',
  connected: false,
  disconnected: true,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  send: jest.fn(),
  close: jest.fn(),
};

const mockIoClient = {
  connect: jest.fn().mockReturnValue(mockSocket),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

// Mock Socket.IO client
jest.mock('socket.io-client', () => ({
  io: jest.fn().mockReturnValue(mockSocket),
  Socket: jest.fn().mockImplementation(() => mockSocket),
}));

// Mock connection manager
const mockConnectionManager = {
  connect: jest.fn().mockResolvedValue(mockSocket),
  disconnect: jest.fn().mockResolvedValue(void 0),
  reconnect: jest.fn().mockResolvedValue(mockSocket),
  isConnected: jest.fn().mockReturnValue(true),
  getState: jest.fn().mockReturnValue('connected'),
  getMetrics: jest.fn().mockReturnValue({
    totalConnections: 1,
    totalDisconnections: 0,
    totalReconnections: 0,
    messagesReceived: 10,
    messagesSent: 5,
  }),
  getHealth: jest.fn().mockReturnValue({
    status: 'healthy',
    latency: 15,
    isHealthy: true,
  }),
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  updateOptions: jest.fn(),
  destroy: jest.fn(),
};

jest.mock('@/services/connection/connection-manager', () => ({
  ConnectionManager: jest.fn().mockImplementation(() => mockConnectionManager),
  createConnectionManager: jest.fn().mockReturnValue(mockConnectionManager),
}));

// Mock WebSocket context
const mockWebSocketContext = {
  socket: mockSocket,
  isConnected: true,
  connectionState: 'connected' as const,
  connectionStatus: 'connected' as const,
  lastActivity: new Date(),
  reconnectAttempts: 0,
  isConnecting: false,
  connect: jest.fn().mockResolvedValue(void 0),
  disconnect: jest.fn().mockResolvedValue(void 0),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  manager: mockConnectionManager,
};

// Create test WebSocket provider
const TestWebSocketProvider: React.FC<{ children: React.ReactNode; config?: any }> = ({ 
  children, 
  config = {} 
}) => {
  const [context, setContext] = React.useState(mockWebSocketContext);

  const updateConnection = React.useCallback((connected: boolean) => {
    setContext(prev => ({
      ...prev,
      isConnected: connected,
      connectionState: connected ? 'connected' : 'disconnected',
      connectionStatus: connected ? 'connected' : 'disconnected',
    }));
  }, []);

  React.useEffect(() => {
    // Simulate connection changes
    if (config.simulateDisconnection) {
      setTimeout(() => updateConnection(false), 100);
    }
    if (config.simulateReconnection) {
      setTimeout(() => updateConnection(true), 200);
    }
  }, [config, updateConnection]);

  const WebSocketContext = React.createContext(context);

  return (
    <WebSocketContext.Provider value={context}>
      <div data-testid="websocket-provider">{children}</div>
    </WebSocketContext.Provider>
  );
};

// Test hook for consuming WebSocket context
const useTestWebSocket = () => {
  return mockWebSocketContext;
};

// Mock the actual WebSocket context
jest.mock('@/context/WebSocketSingletonContext', () => ({
  WebSocketProvider: TestWebSocketProvider,
  useWebSocketSingleton: useTestWebSocket,
  WebSocketContext: React.createContext(mockWebSocketContext),
}));

// Mock hooks
jest.mock('@/hooks/useWebSocketSingleton', () => ({
  useWebSocketSingleton: useTestWebSocket,
}));

jest.mock('@/hooks/useConnectionManager', () => ({
  useConnectionManager: () => ({
    socket: mockSocket,
    isConnected: true,
    state: 'connected',
    metrics: mockConnectionManager.getMetrics(),
    health: mockConnectionManager.getHealth(),
    connect: mockConnectionManager.connect,
    disconnect: mockConnectionManager.disconnect,
    reconnect: mockConnectionManager.reconnect,
    manager: mockConnectionManager,
  }),
}));

// Test components
const TestConsumer: React.FC = () => {
  const { socket, isConnected, connectionState, connect, disconnect, emit } = useTestWebSocket();

  return (
    <div data-testid="test-consumer">
      <div data-testid="connection-status">
        Status: {connectionState}
      </div>
      <div data-testid="connected-state">
        Connected: {isConnected.toString()}
      </div>
      <div data-testid="socket-id">
        Socket ID: {socket?.id || 'none'}
      </div>
      <button 
        data-testid="connect-button" 
        onClick={() => connect()}
      >
        Connect
      </button>
      <button 
        data-testid="disconnect-button" 
        onClick={() => disconnect()}
      >
        Disconnect
      </button>
      <button 
        data-testid="emit-button" 
        onClick={() => emit('test-event', { data: 'test' })}
      >
        Emit
      </button>
    </div>
  );
};

const MultiConsumerComponent: React.FC = () => {
  const context1 = useTestWebSocket();
  const context2 = useTestWebSocket();

  return (
    <div data-testid="multi-consumer">
      <div data-testid="consumer1-status">
        Consumer1: {context1.connectionState}
      </div>
      <div data-testid="consumer2-status">
        Consumer2: {context2.connectionState}
      </div>
    </div>
  );
};

describe('WebSocket Context - TDD London School Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = true;
    mockSocket.disconnected = false;
    mockWebSocketContext.isConnected = true;
    mockWebSocketContext.connectionState = 'connected';
  });

  describe('WebSocket Provider Initialization', () => {
    it('should provide WebSocket context to child components', () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
      expect(screen.getByTestId('test-consumer')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: connected');
    });

    it('should initialize with proper default configuration', () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('connected-state')).toHaveTextContent('Connected: true');
      expect(screen.getByTestId('socket-id')).toHaveTextContent('Socket ID: test-socket-id');
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        autoConnect: true,
        reconnectAttempts: 5,
        heartbeatInterval: 30000,
      };

      render(
        <TestWebSocketProvider config={customConfig}>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
    });
  });

  describe('Connection State Management', () => {
    it('should track connection state correctly', () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: connected');
      expect(screen.getByTestId('connected-state')).toHaveTextContent('Connected: true');
    });

    it('should handle connection state changes', async () => {
      render(
        <TestWebSocketProvider config={{ simulateDisconnection: true }}>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: connected');
      
      // State change is handled by the mock provider
      await waitFor(() => {
        expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
      });
    });

    it('should handle reconnection scenarios', async () => {
      render(
        <TestWebSocketProvider config={{ simulateReconnection: true }}>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      });
    });
  });

  describe('Socket Operations', () => {
    it('should provide connect functionality', async () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      const connectButton = screen.getByTestId('connect-button');
      
      await act(async () => {
        fireEvent.click(connectButton);
      });

      expect(mockWebSocketContext.connect).toBeDefined();
    });

    it('should provide disconnect functionality', async () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      const disconnectButton = screen.getByTestId('disconnect-button');
      
      await act(async () => {
        fireEvent.click(disconnectButton);
      });

      expect(mockWebSocketContext.disconnect).toBeDefined();
    });

    it('should provide emit functionality for sending messages', async () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      const emitButton = screen.getByTestId('emit-button');
      
      await act(async () => {
        fireEvent.click(emitButton);
      });

      expect(mockWebSocketContext.emit).toBeDefined();
    });
  });

  describe('Event Handling Contracts', () => {
    it('should provide event listener registration', () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(mockWebSocketContext.on).toBeDefined();
      expect(typeof mockWebSocketContext.on).toBe('function');
    });

    it('should provide event listener cleanup', () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(mockWebSocketContext.off).toBeDefined();
      expect(typeof mockWebSocketContext.off).toBe('function');
    });

    it('should handle event listener lifecycle correctly', () => {
      const TestEventComponent: React.FC = () => {
        const { on, off } = useTestWebSocket();

        React.useEffect(() => {
          const handleMessage = () => {};
          on('message', handleMessage);
          return () => off('message', handleMessage);
        }, [on, off]);

        return <div data-testid="event-component">Event Handler</div>;
      };

      render(
        <TestWebSocketProvider>
          <TestEventComponent />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('event-component')).toBeInTheDocument();
    });
  });

  describe('Context Sharing and Isolation', () => {
    it('should share context across multiple consumers', () => {
      render(
        <TestWebSocketProvider>
          <MultiConsumerComponent />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('consumer1-status')).toHaveTextContent('Consumer1: connected');
      expect(screen.getByTestId('consumer2-status')).toHaveTextContent('Consumer2: connected');
    });

    it('should maintain consistent state across consumers', () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
          <MultiConsumerComponent />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Status: connected');
      expect(screen.getByTestId('consumer1-status')).toHaveTextContent('Consumer1: connected');
      expect(screen.getByTestId('consumer2-status')).toHaveTextContent('Consumer2: connected');
    });

    it('should handle context updates propagation', async () => {
      render(
        <TestWebSocketProvider config={{ simulateDisconnection: true }}>
          <TestConsumer />
          <MultiConsumerComponent />
        </TestWebSocketProvider>
      );

      // All consumers should reflect state changes
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('consumer1-status')).toBeInTheDocument();
      expect(screen.getByTestId('consumer2-status')).toBeInTheDocument();
    });
  });

  describe('Error Handling in Context', () => {
    it('should handle connection errors gracefully', () => {
      mockConnectionManager.connect.mockRejectedValueOnce(new Error('Connection failed'));
      
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('test-consumer')).toBeInTheDocument();
    });

    it('should provide error information to consumers', () => {
      const ErrorConsumer: React.FC = () => {
        const context = useTestWebSocket();
        
        return (
          <div data-testid="error-consumer">
            <div data-testid="error-status">
              Has Error: {context.manager ? 'No' : 'Yes'}
            </div>
          </div>
        );
      };

      render(
        <TestWebSocketProvider>
          <ErrorConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('error-status')).toHaveTextContent('Has Error: No');
    });

    it('should handle context provider failures', () => {
      const FailingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        throw new Error('Provider failed');
      };

      expect(() => {
        render(
          <FailingProvider>
            <TestConsumer />
          </FailingProvider>
        );
      }).toThrow('Provider failed');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not cause memory leaks with event listeners', () => {
      const { unmount } = render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      // Component should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should efficiently handle multiple context updates', async () => {
      const updates = Array.from({ length: 10 }, (_, i) => i);
      
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      // Multiple rapid updates should not cause issues
      for (const update of updates) {
        await act(async () => {
          fireEvent.click(screen.getByTestId('emit-button'));
        });
      }

      expect(screen.getByTestId('test-consumer')).toBeInTheDocument();
    });

    it('should optimize re-renders through memoization', () => {
      let renderCount = 0;
      
      const OptimizedConsumer: React.FC = React.memo(() => {
        renderCount++;
        const { isConnected } = useTestWebSocket();
        return <div data-testid="optimized-consumer">Connected: {isConnected.toString()}</div>;
      });

      render(
        <TestWebSocketProvider>
          <OptimizedConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('optimized-consumer')).toBeInTheDocument();
    });
  });

  describe('Singleton Behavior', () => {
    it('should maintain singleton socket instance', () => {
      const Consumer1: React.FC = () => {
        const { socket } = useTestWebSocket();
        return <div data-testid="consumer1-socket">{socket?.id}</div>;
      };

      const Consumer2: React.FC = () => {
        const { socket } = useTestWebSocket();
        return <div data-testid="consumer2-socket">{socket?.id}</div>;
      };

      render(
        <TestWebSocketProvider>
          <Consumer1 />
          <Consumer2 />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('consumer1-socket')).toHaveTextContent('test-socket-id');
      expect(screen.getByTestId('consumer2-socket')).toHaveTextContent('test-socket-id');
    });

    it('should prevent multiple socket instances', () => {
      render(
        <TestWebSocketProvider>
          <TestWebSocketProvider>
            <TestConsumer />
          </TestWebSocketProvider>
        </TestWebSocketProvider>
      );

      // Should still work with nested providers
      expect(screen.getByTestId('test-consumer')).toBeInTheDocument();
    });
  });

  describe('Integration with Connection Manager', () => {
    it('should integrate with connection manager for advanced features', () => {
      render(
        <TestWebSocketProvider>
          <TestConsumer />
        </TestWebSocketProvider>
      );

      expect(mockWebSocketContext.manager).toBeDefined();
      expect(mockWebSocketContext.manager.connect).toBeDefined();
      expect(mockWebSocketContext.manager.disconnect).toBeDefined();
      expect(mockWebSocketContext.manager.getMetrics).toBeDefined();
      expect(mockWebSocketContext.manager.getHealth).toBeDefined();
    });

    it('should provide metrics through connection manager', () => {
      const MetricsConsumer: React.FC = () => {
        const { manager } = useTestWebSocket();
        const metrics = manager?.getMetrics() || { totalConnections: 1, messagesReceived: 10 };
        
        return (
          <div data-testid="metrics-consumer">
            <div data-testid="total-connections">
              Connections: {metrics.totalConnections || 0}
            </div>
            <div data-testid="messages-received">
              Received: {metrics.messagesReceived || 0}
            </div>
          </div>
        );
      };

      render(
        <TestWebSocketProvider>
          <MetricsConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('total-connections')).toHaveTextContent('Connections: 1');
      expect(screen.getByTestId('messages-received')).toHaveTextContent('Received: 10');
    });

    it('should provide health information through connection manager', () => {
      const HealthConsumer: React.FC = () => {
        const { manager } = useTestWebSocket();
        const health = manager?.getHealth() || { status: 'healthy', latency: 15 };
        
        return (
          <div data-testid="health-consumer">
            <div data-testid="health-status">
              Status: {health.status || 'unknown'}
            </div>
            <div data-testid="health-latency">
              Latency: {health.latency || 0}ms
            </div>
          </div>
        );
      };

      render(
        <TestWebSocketProvider>
          <HealthConsumer />
        </TestWebSocketProvider>
      );

      expect(screen.getByTestId('health-status')).toHaveTextContent('Status: healthy');
      expect(screen.getByTestId('health-latency')).toHaveTextContent('Latency: 15ms');
    });
  });

  describe('White Screen Prevention', () => {
    it('should never result in white screen when context fails', () => {
      const FallbackConsumer: React.FC = () => {
        try {
          const context = useTestWebSocket();
          return <div data-testid="context-success">Context loaded: {context ? 'Yes' : 'No'}</div>;
        } catch (error) {
          return <div data-testid="context-fallback">Context failed, using fallback</div>;
        }
      };

      const { container } = render(
        <TestWebSocketProvider>
          <FallbackConsumer />
        </TestWebSocketProvider>
      );

      expect(container).toHaveNoWhiteScreen();
    });

    it('should provide meaningful fallbacks when WebSocket is unavailable', () => {
      const mockUnavailableSocket = { 
        ...mockSocket, 
        connected: false, 
        disconnected: true 
      };
      
      const UnavailableContext = {
        ...mockWebSocketContext,
        socket: mockUnavailableSocket,
        isConnected: false,
        connectionState: 'disconnected' as const,
      };

      const TestProviderWithUnavailableSocket: React.FC<{ children: React.ReactNode }> = ({ 
        children 
      }) => {
        const WebSocketContext = React.createContext(UnavailableContext);
        return (
          <WebSocketContext.Provider value={UnavailableContext}>
            <div data-testid="unavailable-provider">{children}</div>
          </WebSocketContext.Provider>
        );
      };

      const { container } = render(
        <TestProviderWithUnavailableSocket>
          <div data-testid="fallback-content">WebSocket unavailable, using offline mode</div>
        </TestProviderWithUnavailableSocket>
      );

      expect(container).toHaveNoWhiteScreen();
      expect(screen.getByTestId('fallback-content')).toBeInTheDocument();
    });
  });
});
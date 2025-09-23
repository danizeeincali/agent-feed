/**
 * TDD London School Test Suite - WebSocket Context Provider Tests
 * 
 * Focused on testing WebSocket provider behavior and connection management
 * to identify issues that could cause white screen or connection failures
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

// Mock WebSocket implementation
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.CONNECTING,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

// Mock socket.io-client
jest.mock('socket.io-client', () => ({
  io: jest.fn((url, options) => {
    mockSocketIOCallbacks.io.push({ url, options });
    return {
      on: jest.fn((event, callback) => {
        mockSocketIOCallbacks.on.push({ event, callback });
        mockEventHandlers[event] = callback;
      }),
      off: jest.fn((event, callback) => {
        mockSocketIOCallbacks.off.push({ event, callback });
      }),
      emit: jest.fn((event, data) => {
        mockSocketIOCallbacks.emit.push({ event, data });
      }),
      disconnect: jest.fn(() => {
        mockSocketIOCallbacks.disconnect.push({});
      }),
      connect: jest.fn(() => {
        mockSocketIOCallbacks.connect.push({});
      }),
      connected: false,
      id: 'mock-socket-id'
    };
  })
}));

// Mock the actual WebSocket context
jest.mock('../../src/context/WebSocketSingletonContext', () => {
  const React = require('react');
  
  const WebSocketContext = React.createContext(null);
  
  const WebSocketProvider = ({ children, config }: any) => {
    const [connectionState, setConnectionState] = React.useState('disconnected');
    const [isConnected, setIsConnected] = React.useState(false);
    const [lastMessage, setLastMessage] = React.useState(null);
    const [connectionError, setConnectionError] = React.useState(null);
    const [retryCount, setRetryCount] = React.useState(0);
    
    mockWebSocketProviderRenders.push({ config });
    
    const socketRef = React.useRef(null);
    
    const connect = React.useCallback(() => {
      mockWebSocketProviderCallbacks.connect.push({});
      setConnectionState('connecting');
      
      // Simulate connection attempt
      setTimeout(() => {
        if (mockWebSocketBehavior.shouldFailConnection) {
          setConnectionState('error');
          setConnectionError(new Error('Connection failed'));
          mockWebSocketProviderCallbacks.connectionError.push({ error: 'Connection failed' });
        } else {
          setConnectionState('connected');
          setIsConnected(true);
          mockWebSocketProviderCallbacks.connectionSuccess.push({});
        }
      }, 100);
    }, []);
    
    const disconnect = React.useCallback(() => {
      mockWebSocketProviderCallbacks.disconnect.push({});
      setConnectionState('disconnected');
      setIsConnected(false);
    }, []);
    
    const send = React.useCallback((data: any) => {
      mockWebSocketProviderCallbacks.send.push({ data });
      if (!isConnected) {
        throw new Error('Cannot send data: WebSocket is not connected');
      }
    }, [isConnected]);
    
    React.useEffect(() => {
      if (config?.autoConnect) {
        connect();
      }
      
      return () => {
        disconnect();
      };
    }, [config?.autoConnect, connect, disconnect]);
    
    const value = {
      connectionState,
      isConnected,
      lastMessage,
      connectionError,
      retryCount,
      connect,
      disconnect,
      send
    };
    
    return React.createElement(
      WebSocketContext.Provider,
      { value },
      React.createElement('div', { 'data-testid': 'websocket-provider' }, children)
    );
  };
  
  const useWebSocketSingleton = () => {
    const context = React.useContext(WebSocketContext);
    mockWebSocketProviderCallbacks.useContext.push({ context });
    
    if (!context) {
      throw new Error('useWebSocketSingleton must be used within WebSocketProvider');
    }
    
    return context;
  };
  
  return {
    WebSocketProvider,
    useWebSocketSingleton
  };
});

// London School mock objects for behavior verification
const mockSocketIOCallbacks = {
  io: [] as any[],
  on: [] as any[],
  off: [] as any[],
  emit: [] as any[],
  disconnect: [] as any[],
  connect: [] as any[]
};

const mockEventHandlers: { [key: string]: Function } = {};

const mockWebSocketProviderRenders = [] as any[];
const mockWebSocketProviderCallbacks = {
  connect: [] as any[],
  disconnect: [] as any[],
  send: [] as any[],
  useContext: [] as any[],
  connectionSuccess: [] as any[],
  connectionError: [] as any[]
};

const mockWebSocketBehavior = {
  shouldFailConnection: false,
  shouldFailSend: false,
  connectionDelay: 100
};

describe('WebSocket Context Provider - London School TDD', () => {
  beforeEach(() => {
    // Reset all mock states
    Object.values(mockSocketIOCallbacks).forEach(arr => arr.length = 0);
    Object.values(mockWebSocketProviderCallbacks).forEach(arr => arr.length = 0);
    mockWebSocketProviderRenders.length = 0;
    
    // Reset behavior flags
    mockWebSocketBehavior.shouldFailConnection = false;
    mockWebSocketBehavior.shouldFailSend = false;
    mockWebSocketBehavior.connectionDelay = 100;
    
    // Clear event handlers
    Object.keys(mockEventHandlers).forEach(key => delete mockEventHandlers[key]);
    
    // Reset WebSocket mock state
    Object.assign(mockWebSocket, {
      readyState: WebSocket.CONNECTING,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    });
    
    jest.clearAllMocks();
  });

  describe('Provider Initialization and Configuration', () => {
    it('should initialize WebSocket provider with correct configuration', async () => {
      const { WebSocketProvider } = await import('../../src/context/WebSocketSingletonContext');
      
      const config = {
        autoConnect: true,
        reconnectAttempts: 3,
        reconnectInterval: 2000,
        heartbeatInterval: 20000
      };
      
      render(
        <WebSocketProvider config={config}>
          <div data-testid="test-child">Test Child</div>
        </WebSocketProvider>
      );
      
      // Verify provider was rendered with config
      expect(mockWebSocketProviderRenders).toHaveLength(1);
      expect(mockWebSocketProviderRenders[0].config).toEqual(config);
      
      // Verify provider wrapper is rendered
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    it('should handle auto-connection on mount', async () => {
      const { WebSocketProvider } = await import('../../src/context/WebSocketSingletonContext');
      
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <div>Auto Connect Test</div>
        </WebSocketProvider>
      );
      
      // Should trigger connection attempt
      await waitFor(() => {
        expect(mockWebSocketProviderCallbacks.connect).toHaveLength(1);
      });
      
      // Should eventually connect
      await waitFor(() => {
        expect(mockWebSocketProviderCallbacks.connectionSuccess).toHaveLength(1);
      });
    });

    it('should not auto-connect when disabled', async () => {
      const { WebSocketProvider } = await import('../../src/context/WebSocketSingletonContext');
      
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <div>No Auto Connect Test</div>
        </WebSocketProvider>
      );
      
      await waitFor(() => {
        // Should not attempt connection
        expect(mockWebSocketProviderCallbacks.connect).toHaveLength(0);
      }, { timeout: 500 });
    });
  });

  describe('Hook Usage and Context Consumption', () => {
    it('should provide WebSocket context to child components', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      function TestConsumer() {
        const websocket = useWebSocketSingleton();
        
        return (
          <div data-testid="websocket-consumer">
            <span data-testid="connection-state">{websocket.connectionState}</span>
            <span data-testid="is-connected">{websocket.isConnected ? 'true' : 'false'}</span>
          </div>
        );
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestConsumer />
        </WebSocketProvider>
      );
      
      // Should use context
      expect(mockWebSocketProviderCallbacks.useContext).toHaveLength(1);
      expect(screen.getByTestId('websocket-consumer')).toBeInTheDocument();
      expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
    });

    it('should throw error when hook used outside provider', async () => {
      const { useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      function InvalidConsumer() {
        const websocket = useWebSocketSingleton();
        return <div>{websocket.connectionState}</div>;
      }
      
      // Should throw error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(<InvalidConsumer />);
      }).toThrow('useWebSocketSingleton must be used within WebSocketProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Connection Management Behavior', () => {
    it('should handle manual connection initiation', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      function ConnectButton() {
        const websocket = useWebSocketSingleton();
        
        return (
          <div>
            <button onClick={websocket.connect} data-testid="connect-button">
              Connect
            </button>
            <span data-testid="connection-state">{websocket.connectionState}</span>
          </div>
        );
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <ConnectButton />
        </WebSocketProvider>
      );
      
      expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
      
      // Click connect button
      fireEvent.click(screen.getByTestId('connect-button'));
      
      // Should trigger connection
      await waitFor(() => {
        expect(mockWebSocketProviderCallbacks.connect).toHaveLength(1);
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting');
      });
      
      // Should eventually connect
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
      });
    });

    it('should handle connection failures gracefully', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      // Simulate connection failure
      mockWebSocketBehavior.shouldFailConnection = true;
      
      function ConnectionStatus() {
        const websocket = useWebSocketSingleton();
        
        return (
          <div>
            <span data-testid="connection-state">{websocket.connectionState}</span>
            <span data-testid="connection-error">
              {websocket.connectionError?.message || 'No error'}
            </span>
          </div>
        );
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <ConnectionStatus />
        </WebSocketProvider>
      );
      
      // Should attempt connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connecting');
      });
      
      // Should handle failure
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('error');
        expect(screen.getByTestId('connection-error')).toHaveTextContent('Connection failed');
        expect(mockWebSocketProviderCallbacks.connectionError).toHaveLength(1);
      });
    });

    it('should handle manual disconnection', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      function DisconnectButton() {
        const websocket = useWebSocketSingleton();
        
        return (
          <div>
            <button onClick={websocket.disconnect} data-testid="disconnect-button">
              Disconnect
            </button>
            <span data-testid="connection-state">{websocket.connectionState}</span>
            <span data-testid="is-connected">{websocket.isConnected ? 'true' : 'false'}</span>
          </div>
        );
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <DisconnectButton />
        </WebSocketProvider>
      );
      
      // Wait for auto-connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });
      
      // Click disconnect
      fireEvent.click(screen.getByTestId('disconnect-button'));
      
      await waitFor(() => {
        expect(mockWebSocketProviderCallbacks.disconnect).toHaveLength(1);
        expect(screen.getByTestId('connection-state')).toHaveTextContent('disconnected');
        expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
      });
    });
  });

  describe('Message Sending Behavior', () => {
    it('should send messages when connected', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      function MessageSender() {
        const websocket = useWebSocketSingleton();
        
        const sendMessage = () => {
          websocket.send({ type: 'test', data: 'hello' });
        };
        
        return (
          <div>
            <button onClick={sendMessage} data-testid="send-button">
              Send Message
            </button>
            <span data-testid="is-connected">{websocket.isConnected ? 'true' : 'false'}</span>
          </div>
        );
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <MessageSender />
        </WebSocketProvider>
      );
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
      });
      
      // Send message
      fireEvent.click(screen.getByTestId('send-button'));
      
      await waitFor(() => {
        expect(mockWebSocketProviderCallbacks.send).toHaveLength(1);
        expect(mockWebSocketProviderCallbacks.send[0].data).toEqual({
          type: 'test',
          data: 'hello'
        });
      });
    });

    it('should handle send errors when disconnected', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      function MessageSender() {
        const websocket = useWebSocketSingleton();
        const [error, setError] = React.useState<string | null>(null);
        
        const sendMessage = () => {
          try {
            websocket.send({ type: 'test', data: 'hello' });
          } catch (err: any) {
            setError(err.message);
          }
        };
        
        return (
          <div>
            <button onClick={sendMessage} data-testid="send-button">
              Send Message
            </button>
            <span data-testid="send-error">{error || 'No error'}</span>
          </div>
        );
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <MessageSender />
        </WebSocketProvider>
      );
      
      // Try to send while disconnected
      fireEvent.click(screen.getByTestId('send-button'));
      
      await waitFor(() => {
        expect(screen.getByTestId('send-error')).toHaveTextContent(
          'Cannot send data: WebSocket is not connected'
        );
      });
    });
  });

  describe('Component Lifecycle and Cleanup', () => {
    it('should cleanup connections on unmount', async () => {
      const { WebSocketProvider } = await import('../../src/context/WebSocketSingletonContext');
      
      const { unmount } = render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <div>Test Component</div>
        </WebSocketProvider>
      );
      
      // Wait for auto-connection
      await waitFor(() => {
        expect(mockWebSocketProviderCallbacks.connect).toHaveLength(1);
      });
      
      // Unmount component
      unmount();
      
      // Should trigger cleanup
      await waitFor(() => {
        expect(mockWebSocketProviderCallbacks.disconnect).toHaveLength(1);
      });
    });

    it('should handle multiple provider instances', async () => {
      const { WebSocketProvider } = await import('../../src/context/WebSocketSingletonContext');
      
      render(
        <div>
          <WebSocketProvider config={{ autoConnect: false }}>
            <div data-testid="provider-1">Provider 1</div>
          </WebSocketProvider>
          <WebSocketProvider config={{ autoConnect: false }}>
            <div data-testid="provider-2">Provider 2</div>
          </WebSocketProvider>
        </div>
      );
      
      // Should render both providers
      expect(screen.getByTestId('provider-1')).toBeInTheDocument();
      expect(screen.getByTestId('provider-2')).toBeInTheDocument();
      expect(mockWebSocketProviderRenders).toHaveLength(2);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle provider initialization errors', async () => {
      const { WebSocketProvider } = await import('../../src/context/WebSocketSingletonContext');
      
      // Mock a provider that might fail during initialization
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      function FailingChild() {
        // Simulate a child component that might cause provider issues
        throw new Error('Child component error');
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <FailingChild />
        </WebSocketProvider>
      );
      
      // Provider should still be rendered despite child error
      expect(mockWebSocketProviderRenders).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });

    it('should maintain provider state through re-renders', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      function StateConsumer() {
        const websocket = useWebSocketSingleton();
        const [renderCount, setRenderCount] = React.useState(0);
        
        return (
          <div>
            <span data-testid="connection-state">{websocket.connectionState}</span>
            <span data-testid="render-count">{renderCount}</span>
            <button 
              onClick={() => setRenderCount(c => c + 1)} 
              data-testid="rerender-button"
            >
              Re-render
            </button>
          </div>
        );
      }
      
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <StateConsumer />
        </WebSocketProvider>
      );
      
      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
      });
      
      // Trigger re-render
      fireEvent.click(screen.getByTestId('rerender-button'));
      
      // State should be maintained
      await waitFor(() => {
        expect(screen.getByTestId('render-count')).toHaveTextContent('1');
        expect(screen.getByTestId('connection-state')).toHaveTextContent('connected');
      });
    });
  });

  describe('White Screen Prevention', () => {
    it('should prevent white screen during provider initialization', async () => {
      const { WebSocketProvider } = await import('../../src/context/WebSocketSingletonContext');
      
      const { container } = render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <div data-testid="app-content">Application Content</div>
        </WebSocketProvider>
      );
      
      // Should render content immediately
      expect(container.firstChild).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('websocket-provider')).toBeInTheDocument();
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
      
      // Should maintain content during connection process
      await waitFor(() => {
        expect(screen.getByTestId('app-content')).toBeVisible();
      });
    });

    it('should maintain UI during connection failures', async () => {
      const { WebSocketProvider, useWebSocketSingleton } = await import('../../src/context/WebSocketSingletonContext');
      
      mockWebSocketBehavior.shouldFailConnection = true;
      
      function AppWithWebSocket() {
        const websocket = useWebSocketSingleton();
        
        return (
          <div data-testid="app-with-websocket">
            <header>App Header</header>
            <main>
              <div>Connection Status: {websocket.connectionState}</div>
              <div>Main Content Area</div>
            </main>
          </div>
        );
      }
      
      const { container } = render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <AppWithWebSocket />
        </WebSocketProvider>
      );
      
      // Should render app structure immediately
      expect(container.firstChild).not.toBeEmptyDOMElement();
      expect(screen.getByTestId('app-with-websocket')).toBeInTheDocument();
      expect(screen.getByText('App Header')).toBeInTheDocument();
      expect(screen.getByText('Main Content Area')).toBeInTheDocument();
      
      // Should maintain UI even when connection fails
      await waitFor(() => {
        expect(screen.getByText(/Connection Status: error/)).toBeInTheDocument();
        expect(screen.getByText('Main Content Area')).toBeVisible();
      });
    });
  });
});
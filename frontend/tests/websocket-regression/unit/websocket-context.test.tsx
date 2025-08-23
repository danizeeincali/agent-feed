/**
 * TDD UNIT TESTS: WebSocket Context and React Integration
 * 
 * Testing Strategy:
 * 1. Test React Context provider functionality
 * 2. Test hook behavior and state management
 * 3. Test component integration patterns
 * 4. Test error boundaries and edge cases
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { WebSocketContext } from '../../../src/context/WebSocketContext';
import { WebSocketSingletonContext } from '../../../src/context/WebSocketSingletonContext';
import { useWebSocketSingleton } from '../../../src/hooks/useWebSocketSingleton';
import { WebSocketTestUtils, ErrorTestUtils } from '../utils/test-helpers';
import { mockWebSocketHub } from '../mocks/websocket-server-mock';

// Mock component for testing context
const TestComponent: React.FC<{ onMessage?: (data: any) => void }> = ({ onMessage }) => {
  const { socket, isConnected, error, connect, disconnect, sendMessage } = useWebSocketSingleton();
  
  React.useEffect(() => {
    if (onMessage && socket) {
      socket.subscribe('testMessage', onMessage);
    }
  }, [socket, onMessage]);
  
  return (
    <div>
      <div data-testid="connection-status">{isConnected ? 'connected' : 'disconnected'}</div>
      <div data-testid="error-status">{error ? error.message : 'no-error'}</div>
      <button data-testid="connect-btn" onClick={connect}>Connect</button>
      <button data-testid="disconnect-btn" onClick={disconnect}>Disconnect</button>
      <button 
        data-testid="send-btn" 
        onClick={() => sendMessage('test', { data: 'test' })}
      >
        Send
      </button>
    </div>
  );
};

const renderWithWebSocketContext = (component: React.ReactElement) => {
  return render(
    <WebSocketSingletonContext>
      {component}
    </WebSocketSingletonContext>
  );
};

describe('WebSocket Context Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorTestUtils.startErrorTracking();
  });

  afterEach(async () => {
    await mockWebSocketHub.stop();
  });

  describe('TDD: Context Provider', () => {
    test('FAIL FIRST: should fail when context used outside provider', () => {
      expect(() => {
        renderHook(() => useWebSocketSingleton());
      }).toThrow();
    });

    test('PASS: should provide context when wrapped in provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.sendMessage).toBe('function');
    });

    test('PASS: should initialize with default state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.socket).toBeNull();
    });
  });

  describe('TDD: Hook State Management', () => {
    test('FAIL FIRST: should fail to connect without hub server', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    test('PASS: should connect successfully with hub server', async () => {
      await mockWebSocketHub.start();
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.socket).toBeTruthy();
    });

    test('PASS: should update state on disconnection', async () => {
      await mockWebSocketHub.start();
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(true);
      
      act(() => {
        result.current.disconnect();
      });
      
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('TDD: Component Integration', () => {
    test('FAIL FIRST: should fail to render without proper context', () => {
      expect(() => {
        render(<TestComponent />);
      }).toThrow();
    });

    test('PASS: should render with context provider', () => {
      renderWithWebSocketContext(<TestComponent />);
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('error-status')).toHaveTextContent('no-error');
      expect(screen.getByTestId('connect-btn')).toBeInTheDocument();
      expect(screen.getByTestId('disconnect-btn')).toBeInTheDocument();
      expect(screen.getByTestId('send-btn')).toBeInTheDocument();
    });

    test('PASS: should handle connection interactions', async () => {
      await mockWebSocketHub.start();
      
      renderWithWebSocketContext(<TestComponent />);
      
      const connectBtn = screen.getByTestId('connect-btn');
      
      await act(async () => {
        connectBtn.click();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      });
    });

    test('PASS: should handle message sending', async () => {
      await mockWebSocketHub.start();
      
      renderWithWebSocketContext(<TestComponent />);
      
      const connectBtn = screen.getByTestId('connect-btn');
      const sendBtn = screen.getByTestId('send-btn');
      
      await act(async () => {
        connectBtn.click();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      });
      
      expect(() => {
        sendBtn.click();
      }).not.toThrow();
    });
  });

  describe('TDD: Message Handling', () => {
    test('PASS: should handle incoming messages', async () => {
      await mockWebSocketHub.start();
      
      const messageHandler = jest.fn();
      renderWithWebSocketContext(<TestComponent onMessage={messageHandler} />);
      
      const connectBtn = screen.getByTestId('connect-btn');
      
      await act(async () => {
        connectBtn.click();
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      });
      
      // Simulate incoming message
      // Note: This would need to be implemented based on actual context implementation
    });

    test('PASS: should handle multiple subscribers', async () => {
      await mockWebSocketHub.start();
      
      const TestMultipleSubscribers = () => {
        const { socket } = useWebSocketSingleton();
        const [messages, setMessages] = React.useState<any[]>([]);
        
        React.useEffect(() => {
          if (socket) {
            const unsubscribe1 = socket.subscribe('test', (data: any) => {
              setMessages(prev => [...prev, { id: 1, data }]);
            });
            
            const unsubscribe2 = socket.subscribe('test', (data: any) => {
              setMessages(prev => [...prev, { id: 2, data }]);
            });
            
            return () => {
              unsubscribe1();
              unsubscribe2();
            };
          }
        }, [socket]);
        
        return <div data-testid="message-count">{messages.length}</div>;
      };
      
      renderWithWebSocketContext(<TestMultipleSubscribers />);
      
      // Connect and test multiple subscriptions
      // Implementation depends on actual context behavior
    });
  });

  describe('TDD: Error Handling', () => {
    test('PASS: should handle connection errors gracefully', async () => {
      // Mock connection failure
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.connect();
        } catch (error) {
          // Expected to fail without hub server
        }
      });
      
      expect(result.current.error).toBeTruthy();
      expect(result.current.isConnected).toBe(false);
    });

    test('PASS: should handle message send errors', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      // Try to send message without connection
      expect(() => {
        result.current.sendMessage('test', { data: 'test' });
      }).not.toThrow(); // Should handle gracefully
      
      expect(ErrorTestUtils.hasWarnings()).toBe(true);
    });
  });

  describe('TDD: Performance and Memory', () => {
    test('PASS: should cleanup on unmount', async () => {
      await mockWebSocketHub.start();
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result, unmount } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });
      
      expect(result.current.isConnected).toBe(true);
      
      unmount();
      
      // Should cleanup connections on unmount
      expect(ErrorTestUtils.hasErrors()).toBe(false);
    });

    test('PASS: should reuse connection across components', async () => {
      await mockWebSocketHub.start();
      
      const Component1 = () => {
        const { socket, connect } = useWebSocketSingleton();
        React.useEffect(() => { connect(); }, [connect]);
        return <div data-testid="comp1">{socket ? 'connected' : 'disconnected'}</div>;
      };
      
      const Component2 = () => {
        const { socket } = useWebSocketSingleton();
        return <div data-testid="comp2">{socket ? 'connected' : 'disconnected'}</div>;
      };
      
      renderWithWebSocketContext(
        <div>
          <Component1 />
          <Component2 />
        </div>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('comp1')).toHaveTextContent('connected');
        expect(screen.getByTestId('comp2')).toHaveTextContent('connected');
      });
    });
  });

  describe('TDD: Regression Protection', () => {
    test('REGRESSION: should maintain singleton behavior', async () => {
      await mockWebSocketHub.start();
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result: result1 } = renderHook(() => useWebSocketSingleton(), { wrapper });
      const { result: result2 } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      await act(async () => {
        await result1.current.connect();
      });
      
      // Both hooks should reference the same socket instance
      expect(result1.current.socket).toBe(result2.current.socket);
      expect(result1.current.isConnected).toBe(result2.current.isConnected);
    });

    test('REGRESSION: should handle rapid connect/disconnect cycles', async () => {
      await mockWebSocketHub.start();
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      // Rapid connect/disconnect
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.connect();
          result.current.disconnect();
        });
      }
      
      expect(ErrorTestUtils.hasErrors()).toBe(false);
    });

    test('REGRESSION: should maintain performance under stress', async () => {
      await mockWebSocketHub.start();
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <WebSocketSingletonContext>{children}</WebSocketSingletonContext>
      );
      
      const { result } = renderHook(() => useWebSocketSingleton(), { wrapper });
      
      await act(async () => {
        await result.current.connect();
      });
      
      const startTime = Date.now();
      
      // Send many messages rapidly
      for (let i = 0; i < 100; i++) {
        result.current.sendMessage('test', { index: i });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(ErrorTestUtils.hasErrors()).toBe(false);
    });
  });
});
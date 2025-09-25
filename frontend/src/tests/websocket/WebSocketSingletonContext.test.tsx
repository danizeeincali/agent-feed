/**
 * TDD London School Tests for WebSocketSingletonContext
 * 
 * Tests focus on the collaboration patterns between the context provider
 * and its dependencies, emphasizing interaction verification over state testing.
 * 
 * Key London School patterns:
 * 1. Mock all collaborators (useWebSocketSingleton hook, React context)
 * 2. Verify interactions and message flows
 * 3. Test contract compliance between provider and consumers
 * 4. Focus on behavior rather than implementation details
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { 
  WebSocketSingletonProvider, 
  useWebSocketSingletonContext 
} from '@/context/WebSocketSingletonContext';
import * as useWebSocketSingletonModule from '../hooks/useWebSocketSingleton';

// Mock the useWebSocketSingleton hook
const mockUseWebSocketSingleton = jest.fn();
jest.spyOn(useWebSocketSingletonModule, 'useWebSocketSingleton').mockImplementation(mockUseWebSocketSingleton);

// Mock Socket.IO client
jest.mock('socket.io-client');

// Create mock socket for testing
const createMockSocket = () => ({
  id: 'mock-socket-id',
  connected: true,
  disconnected: false,
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  removeAllListeners: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
});

// Test component that uses the context
const TestComponent: React.FC = () => {
  const context = useWebSocketSingletonContext();
  
  return (
    <div>
      <div data-testid="connection-status">
        {context.isConnected ? 'connected' : 'disconnected'}
      </div>
      <div data-testid="socket-id">{context.socket?.id || 'no-socket'}</div>
      <div data-testid="notification-count">{context.notifications.length}</div>
      <div data-testid="online-users-count">{context.onlineUsers.length}</div>
      <button 
        data-testid="connect-button" 
        onClick={() => context.connect()}
      >
        Connect
      </button>
      <button 
        data-testid="disconnect-button" 
        onClick={() => context.disconnect()}
      >
        Disconnect
      </button>
      <button 
        data-testid="emit-button" 
        onClick={() => context.emit('test_event', { data: 'test' })}
      >
        Emit
      </button>
    </div>
  );
};

describe('WebSocketSingletonProvider - London School TDD', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  let mockConnect: jest.MockedFunction<() => Promise<void>>;
  let mockDisconnect: jest.MockedFunction<() => Promise<void>>;
  let mockEmit: jest.MockedFunction<(event: string, data?: any) => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSocket = createMockSocket();
    mockConnect = jest.fn().mockResolvedValue(undefined);
    mockDisconnect = jest.fn().mockResolvedValue(undefined);
    mockEmit = jest.fn();

    // Setup the mock hook to return our controlled values
    mockUseWebSocketSingleton.mockReturnValue({
      socket: mockSocket,
      isConnected: true,
      connect: mockConnect,
      disconnect: mockDisconnect,
      emit: mockEmit
    });
  });

  describe('Provider Initialization and Configuration', () => {
    it('should delegate to useWebSocketSingleton with correct configuration', () => {
      const config = {
        url: 'ws://test-server:3000',
        autoConnect: false,
        reconnectAttempts: 3,
        reconnectInterval: 2000,
        heartbeatInterval: 15000
      };

      render(
        <WebSocketSingletonProvider config={config}>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      // Verify the provider delegates configuration to the hook correctly
      expect(mockUseWebSocketSingleton).toHaveBeenCalledWith({
        url: config.url,
        autoConnect: config.autoConnect,
        maxReconnectAttempts: config.reconnectAttempts
      });
    });

    it('should use default configuration when none provided', () => {
      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      // Verify default configuration delegation
      expect(mockUseWebSocketSingleton).toHaveBeenCalledWith({
        url: import.meta.env.VITE_WEBSOCKET_HUB_URL || 'http://localhost:3002',
        autoConnect: true,
        maxReconnectAttempts: 5
      });
    });
  });

  describe('Context Value Contract Verification', () => {
    it('should provide all required context methods to consumers', () => {
      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      // Verify all required UI elements are present (indicating context methods exist)
      expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
      expect(screen.getByTestId('socket-id')).toHaveTextContent('mock-socket-id');
      expect(screen.getByTestId('connect-button')).toBeInTheDocument();
      expect(screen.getByTestId('disconnect-button')).toBeInTheDocument();
      expect(screen.getByTestId('emit-button')).toBeInTheDocument();
    });

    it('should expose connection state management interface', () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      // Verify contract compliance
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.reconnect).toBe('function');
      expect(typeof result.current.emit).toBe('function');
      expect(typeof result.current.on).toBe('function');
      expect(typeof result.current.off).toBe('function');
    });
  });

  describe('Connection Management Delegation', () => {
    it('should delegate connect command to underlying hook', async () => {
      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      const connectButton = screen.getByTestId('connect-button');
      
      await act(async () => {
        connectButton.click();
      });

      // Verify delegation to the hook's connect method
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('should delegate disconnect command to underlying hook', async () => {
      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      const disconnectButton = screen.getByTestId('disconnect-button');
      
      await act(async () => {
        disconnectButton.click();
      });

      // Verify delegation to the hook's disconnect method
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should coordinate reconnection workflow', async () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      await act(async () => {
        await result.current.reconnect();
      });

      // Should call connect through the hook
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Socket Event Delegation', () => {
    it('should delegate emit events to the socket collaborator', async () => {
      render(
        <WebSocketSingletonProvider>
          <TestComponent />
        </WebSocketSingletonProvider>
      );

      const emitButton = screen.getByTestId('emit-button');
      
      await act(async () => {
        emitButton.click();
      });

      // Verify the emit call was delegated to the hook
      expect(mockEmit).toHaveBeenCalledWith('test_event', { data: 'test' });
    });

    it('should provide socket event listener management interface', () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const testHandler = jest.fn();
      
      // Test event listener registration
      act(() => {
        result.current.on('test_event', testHandler);
      });

      expect(mockSocket.on).toHaveBeenCalledWith('test_event', testHandler);

      // Test event listener removal
      act(() => {
        result.current.off('test_event', testHandler);
      });

      expect(mockSocket.off).toHaveBeenCalledWith('test_event', testHandler);
    });
  });

  describe('Notification System Interactions', () => {
    it('should handle notification events from socket collaborator', async () => {
      let capturedHandlers: { [key: string]: Function } = {};
      
      // Capture event handlers when they're registered
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        capturedHandlers[event] = handler;
        return mockSocket;
      });

      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      // Simulate notification event from socket
      if (capturedHandlers.notification) {
        act(() => {
          capturedHandlers.notification({
            type: 'info',
            title: 'Test Notification',
            message: 'This is a test message',
            userId: 'user-123'
          });
        });
      }

      // Verify notification was added to context state
      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].title).toBe('Test Notification');
        expect(result.current.notifications[0].type).toBe('info');
      });
    });

    it('should coordinate notification management operations', () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      // Add notification
      act(() => {
        result.current.addNotification({
          type: 'success',
          title: 'Manual Notification',
          message: 'Added manually',
          read: false
        });
      });

      expect(result.current.notifications).toHaveLength(1);

      // Mark notification as read
      const notificationId = result.current.notifications[0].id;
      act(() => {
        result.current.markNotificationAsRead(notificationId);
      });

      expect(result.current.notifications[0].read).toBe(true);

      // Clear all notifications
      act(() => {
        result.current.clearNotifications();
      });

      expect(result.current.notifications).toHaveLength(0);
    });
  });

  describe('Feed and Post Subscription Management', () => {
    it('should delegate feed subscription to socket collaborator', () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const feedId = 'feed-123';

      act(() => {
        result.current.subscribeFeed(feedId);
      });

      expect(mockEmit).toHaveBeenCalledWith('subscribe_feed', { feedId });

      act(() => {
        result.current.unsubscribeFeed(feedId);
      });

      expect(mockEmit).toHaveBeenCalledWith('unsubscribe_feed', { feedId });
    });

    it('should delegate post subscription to socket collaborator', () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const postId = 'post-456';

      act(() => {
        result.current.subscribePost(postId);
      });

      expect(mockEmit).toHaveBeenCalledWith('subscribe_post', { postId });

      act(() => {
        result.current.unsubscribePost(postId);
      });

      expect(mockEmit).toHaveBeenCalledWith('unsubscribe_post', { postId });
    });

    it('should coordinate like operations through socket', () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const postId = 'post-789';

      // Test like addition
      act(() => {
        result.current.sendLike(postId, 'add');
      });

      expect(mockEmit).toHaveBeenCalledWith('like_post', { postId, action: 'add' });

      // Test like removal
      act(() => {
        result.current.sendLike(postId, 'remove');
      });

      expect(mockEmit).toHaveBeenCalledWith('like_post', { postId, action: 'remove' });
    });
  });

  describe('System Data Management', () => {
    it('should handle online users updates from socket events', async () => {
      let capturedHandlers: { [key: string]: Function } = {};
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        capturedHandlers[event] = handler;
        return mockSocket;
      });

      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const mockUsers = [
        { id: 'user1', username: 'User One', lastSeen: new Date().toISOString() },
        { id: 'user2', username: 'User Two', lastSeen: new Date().toISOString() }
      ];

      if (capturedHandlers.online_users) {
        act(() => {
          capturedHandlers.online_users(mockUsers);
        });
      }

      await waitFor(() => {
        expect(result.current.onlineUsers).toHaveLength(2);
        expect(result.current.onlineUsers[0].username).toBe('User One');
      });
    });

    it('should handle system statistics updates from socket events', async () => {
      let capturedHandlers: { [key: string]: Function } = {};
      
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        capturedHandlers[event] = handler;
        return mockSocket;
      });

      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const mockStats = {
        connectedUsers: 10,
        activeRooms: 5,
        totalSockets: 15,
        timestamp: new Date().toISOString()
      };

      if (capturedHandlers.system_stats) {
        act(() => {
          capturedHandlers.system_stats(mockStats);
        });
      }

      await waitFor(() => {
        expect(result.current.systemStats).toEqual(mockStats);
      });
    });
  });

  describe('Connection State Synchronization', () => {
    it('should synchronize connection state with underlying hook', () => {
      // Test disconnected state
      mockUseWebSocketSingleton.mockReturnValue({
        socket: null,
        isConnected: false,
        connect: mockConnect,
        disconnect: mockDisconnect,
        emit: mockEmit
      });

      const { result, rerender } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionState.isConnected).toBe(false);

      // Test connected state
      mockUseWebSocketSingleton.mockReturnValue({
        socket: mockSocket,
        isConnected: true,
        connect: mockConnect,
        disconnect: mockDisconnect,
        emit: mockEmit
      });

      rerender();

      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionState.isConnected).toBe(true);
    });

    it('should track reconnection attempts in connection state', async () => {
      const { result } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const initialReconnectAttempt = result.current.connectionState.reconnectAttempt;

      await act(async () => {
        await result.current.reconnect();
      });

      // Should increment reconnection attempt counter
      expect(result.current.connectionState.reconnectAttempt).toBe(initialReconnectAttempt + 1);
    });
  });

  describe('Error Boundary and Context Safety', () => {
    it('should throw error when used outside of provider', () => {
      // Mock console.error to avoid cluttering test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const TestComponentOutsideProvider = () => {
        try {
          useWebSocketSingletonContext();
          return <div>Should not reach here</div>;
        } catch (error) {
          return <div data-testid="error-caught">Error caught</div>;
        }
      };

      render(<TestComponentOutsideProvider />);

      expect(screen.getByTestId('error-caught')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should maintain context value stability across re-renders', () => {
      const { result, rerender } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      const firstRenderContext = result.current;

      rerender();

      // Context methods should maintain referential equality for performance
      expect(result.current.connect).toBe(firstRenderContext.connect);
      expect(result.current.disconnect).toBe(firstRenderContext.disconnect);
      expect(result.current.emit).toBe(firstRenderContext.emit);
    });
  });

  describe('Socket Event Handler Cleanup', () => {
    it('should properly cleanup socket event handlers on unmount', () => {
      const { unmount } = renderHook(
        () => useWebSocketSingletonContext(),
        {
          wrapper: ({ children }) => (
            <WebSocketSingletonProvider>{children}</WebSocketSingletonProvider>
          )
        }
      );

      // Capture the handler registration calls
      const registeredHandlers = mockSocket.on.mock.calls.map(call => call[0]);

      unmount();

      // Verify cleanup was called for each registered handler
      registeredHandlers.forEach(event => {
        expect(mockSocket.off).toHaveBeenCalledWith(event, expect.any(Function));
      });
    });
  });
});
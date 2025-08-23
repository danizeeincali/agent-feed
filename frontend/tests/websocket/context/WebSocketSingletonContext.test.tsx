/**
 * TDD London School Tests - WebSocketSingletonContext
 * Mock-driven testing of context provider and state management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WebSocketSingletonProvider, useWebSocketSingletonContext } from '../../../src/context/WebSocketSingletonContext';
import { UseWebSocketSingletonReturn } from '../../../src/hooks/useWebSocketSingleton';
import { ConnectionState } from '../../../src/services/connection/types';

// Mock the useWebSocketSingleton hook
jest.mock('../../../src/hooks/useWebSocketSingleton');
import { useWebSocketSingleton } from '../../../src/hooks/useWebSocketSingleton';

// Test component to interact with context
const TestConsumerComponent: React.FC<{
  onStateChange?: (state: any) => void;
}> = ({ onStateChange }) => {
  const context = useWebSocketSingletonContext();
  
  React.useEffect(() => {
    if (onStateChange) {
      onStateChange({
        isConnected: context.isConnected,
        connectionState: context.connectionState,
        socket: context.socket
      });
    }
  }, [context.isConnected, context.connectionState, context.socket, onStateChange]);
  
  return (
    <div>
      <div data-testid="connection-status">
        {context.isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="connection-state">
        {context.connectionState.isConnecting ? 'Connecting...' : 'Not Connecting'}
      </div>
      <div data-testid="socket-id">
        {context.socket?.id || 'No Socket'}
      </div>
      <div data-testid="notifications-count">
        {context.notifications.length}
      </div>
      <button 
        data-testid="connect-button" 
        onClick={context.connect}
      >
        Connect
      </button>
      <button 
        data-testid="disconnect-button" 
        onClick={context.disconnect}
      >
        Disconnect
      </button>
      <button 
        data-testid="emit-button" 
        onClick={() => context.emit('test_event', { data: 'test' })}
      >
        Emit
      </button>
      <button 
        data-testid="clear-notifications"
        onClick={context.clearNotifications}
      >
        Clear Notifications
      </button>
    </div>
  );
};

describe('TDD London School: WebSocketSingletonContext', () => {
  let mockUseWebSocketSingleton: jest.MockedFunction<typeof useWebSocketSingleton>;
  let mockSocket: {
    id: string;
    connected: boolean;
    connecting: boolean;
    emit: jest.Mock;
    on: jest.Mock;
    off: jest.Mock;
    removeAllListeners: jest.Mock;
  };
  let mockHookReturn: UseWebSocketSingletonReturn;
  
  beforeEach(() => {
    mockSocket = {
      id: 'test-socket-id',
      connected: false,
      connecting: false,
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    };
    
    mockHookReturn = {
      socket: mockSocket,
      isConnected: false,
      connectionState: 'disconnected',
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn()
    };
    
    mockUseWebSocketSingleton = useWebSocketSingleton as jest.MockedFunction<typeof useWebSocketSingleton>;
    mockUseWebSocketSingleton.mockReturnValue(mockHookReturn);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Context Provider Initialization', () => {
    it('should call useWebSocketSingleton with correct configuration', () => {
      const config = {
        url: 'http://localhost:3002',
        autoConnect: false,
        reconnectAttempts: 3,
        reconnectInterval: 2000,
        heartbeatInterval: 30000
      };
      
      render(
        <WebSocketSingletonProvider config={config}>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(mockUseWebSocketSingleton).toHaveBeenCalledWith({
        url: 'http://localhost:3002',
        autoConnect: false,
        maxReconnectAttempts: 3
      });
    });
    
    it('should use default configuration when not provided', () => {
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(mockUseWebSocketSingleton).toHaveBeenCalledWith({
        url: import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3001',
        autoConnect: true,
        maxReconnectAttempts: 5
      });
    });
    
    it('should throw error when context is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        render(<TestConsumerComponent />);
      }).toThrow('useWebSocketSingletonContext must be used within a WebSocketSingletonProvider');
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('State Propagation from Hook to Context', () => {
    it('should propagate connection state from hook to context consumers', () => {
      const onStateChange = jest.fn();
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent onStateChange={onStateChange} />
        </WebSocketSingletonProvider>
      );
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(onStateChange).toHaveBeenCalledWith({
        isConnected: false,
        connectionState: expect.objectContaining({
          isConnected: false,
          isConnecting: expect.any(Boolean)
        }),
        socket: mockSocket
      });
    });
    
    it('should update UI when hook state changes to connected', async () => {
      mockHookReturn.isConnected = true;
      mockSocket.connected = true;
      mockUseWebSocketSingleton.mockReturnValue(mockHookReturn);
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
      expect(screen.getByTestId('socket-id')).toHaveTextContent('test-socket-id');
    });
    
    it('should compute isConnecting state correctly based on socket properties', async () => {
      // Test the critical isConnecting logic fix
      mockSocket.connected = false;
      mockSocket.connecting = true;
      mockHookReturn.isConnected = false;
      mockUseWebSocketSingleton.mockReturnValue(mockHookReturn);
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Connecting...');
    });
    
    it('should not show connecting when socket is connected', () => {
      mockSocket.connected = true;
      mockSocket.connecting = false;
      mockHookReturn.isConnected = true;
      mockUseWebSocketSingleton.mockReturnValue(mockHookReturn);
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Not Connecting');
    });
    
    it('should handle race condition in isConnecting calculation', () => {
      // Race condition: socket exists but neither connected nor connecting
      mockSocket.connected = false;
      mockSocket.connecting = false;
      mockHookReturn.isConnected = false;
      mockUseWebSocketSingleton.mockReturnValue(mockHookReturn);
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(screen.getByTestId('connection-state')).toHaveTextContent('Not Connecting');
    });
  });
  
  describe('Method Delegation to Hook', () => {
    it('should delegate connect calls to hook', async () => {
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      fireEvent.click(screen.getByTestId('connect-button'));
      
      await waitFor(() => {
        expect(mockHookReturn.connect).toHaveBeenCalledWith();
      });
    });
    
    it('should delegate disconnect calls to hook', async () => {
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      fireEvent.click(screen.getByTestId('disconnect-button'));
      
      await waitFor(() => {
        expect(mockHookReturn.disconnect).toHaveBeenCalledWith();
      });
    });
    
    it('should delegate emit calls to hook', () => {
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      fireEvent.click(screen.getByTestId('emit-button'));
      
      expect(mockHookReturn.emit).toHaveBeenCalledWith('test_event', { data: 'test' });
    });
    
    it('should delegate socket event listeners to hook', () => {
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      // The context should set up event listeners on the socket
      expect(mockSocket.on).toHaveBeenCalledWith('notification', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('online_users', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('system_stats', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });
  
  describe('Socket Event Handling', () => {
    it('should handle notification events from socket', async () => {
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      // Get the notification handler that was registered
      const notificationHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'notification'
      )[1];
      
      // Simulate notification event
      act(() => {
        notificationHandler({
          type: 'info',
          title: 'Test Notification',
          message: 'Test message',
          userId: 'user-123'
        });
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
      });
    });
    
    it('should handle connect events from socket', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      // Get the connect handler
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      act(() => {
        connectHandler();
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('🔌 WebSocketSingletonProvider: Connected to server');
      
      consoleSpy.mockRestore();
    });
    
    it('should handle disconnect events from socket', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      // Get the disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      act(() => {
        disconnectHandler('transport close');
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('🔌 WebSocketSingletonProvider: Disconnected:', 'transport close');
      
      consoleSpy.mockRestore();
    });
    
    it('should handle connect_error events from socket', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      // Get the connect_error handler
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )[1];
      
      const error = new Error('Connection failed');
      
      act(() => {
        errorHandler(error);
      });
      
      expect(consoleSpy).toHaveBeenCalledWith('🔌 WebSocketSingletonProvider: Connection error:', error);
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Notification Management', () => {
    it('should add notifications to state', async () => {
      const TestNotificationComponent = () => {
        const { addNotification, notifications, clearNotifications } = useWebSocketSingletonContext();
        
        return (
          <div>
            <div data-testid="notifications-count">{notifications.length}</div>
            <button 
              data-testid="add-notification"
              onClick={() => addNotification({
                type: 'info',
                title: 'Test',
                message: 'Test message',
                read: false
              })}
            >
              Add
            </button>
            <button data-testid="clear-notifications" onClick={clearNotifications}>
              Clear
            </button>
          </div>
        );
      };
      
      render(
        <WebSocketSingletonProvider>
          <TestNotificationComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');
      
      fireEvent.click(screen.getByTestId('add-notification'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('1');
      });
      
      fireEvent.click(screen.getByTestId('clear-notifications'));
      
      await waitFor(() => {
        expect(screen.getByTestId('notifications-count')).toHaveTextContent('0');
      });
    });
    
    it('should mark notifications as read', async () => {
      const TestMarkReadComponent = () => {
        const { addNotification, markNotificationAsRead, notifications } = useWebSocketSingletonContext();
        
        React.useEffect(() => {
          addNotification({
            type: 'info',
            title: 'Test',
            message: 'Test message',
            read: false
          });
        }, [addNotification]);
        
        const unreadCount = notifications.filter(n => !n.read).length;
        
        return (
          <div>
            <div data-testid="unread-count">{unreadCount}</div>
            <button 
              data-testid="mark-read"
              onClick={() => {
                if (notifications.length > 0) {
                  markNotificationAsRead(notifications[0].id);
                }
              }}
            >
              Mark Read
            </button>
          </div>
        );
      };
      
      render(
        <WebSocketSingletonProvider>
          <TestMarkReadComponent />
        </WebSocketSingletonProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('1');
      });
      
      fireEvent.click(screen.getByTestId('mark-read'));
      
      await waitFor(() => {
        expect(screen.getByTestId('unread-count')).toHaveTextContent('0');
      });
    });
  });
  
  describe('Feed and Post Management', () => {
    it('should emit subscribe_feed events', async () => {
      const TestFeedComponent = () => {
        const { subscribeFeed, unsubscribeFeed } = useWebSocketSingletonContext();
        
        return (
          <div>
            <button 
              data-testid="subscribe-feed"
              onClick={() => subscribeFeed('feed-123')}
            >
              Subscribe Feed
            </button>
            <button 
              data-testid="unsubscribe-feed"
              onClick={() => unsubscribeFeed('feed-123')}
            >
              Unsubscribe Feed
            </button>
          </div>
        );
      };
      
      render(
        <WebSocketSingletonProvider>
          <TestFeedComponent />
        </WebSocketSingletonProvider>
      );
      
      fireEvent.click(screen.getByTestId('subscribe-feed'));
      
      expect(mockHookReturn.emit).toHaveBeenCalledWith('subscribe_feed', { feedId: 'feed-123' });
      
      fireEvent.click(screen.getByTestId('unsubscribe-feed'));
      
      expect(mockHookReturn.emit).toHaveBeenCalledWith('unsubscribe_feed', { feedId: 'feed-123' });
    });
    
    it('should emit post subscription events', () => {
      const TestPostComponent = () => {
        const { subscribePost, unsubscribePost, sendLike } = useWebSocketSingletonContext();
        
        return (
          <div>
            <button 
              data-testid="subscribe-post"
              onClick={() => subscribePost('post-123')}
            >
              Subscribe Post
            </button>
            <button 
              data-testid="unsubscribe-post"
              onClick={() => unsubscribePost('post-123')}
            >
              Unsubscribe Post
            </button>
            <button 
              data-testid="like-post"
              onClick={() => sendLike('post-123', 'add')}
            >
              Like Post
            </button>
          </div>
        );
      };
      
      render(
        <WebSocketSingletonProvider>
          <TestPostComponent />
        </WebSocketSingletonProvider>
      );
      
      fireEvent.click(screen.getByTestId('subscribe-post'));
      expect(mockHookReturn.emit).toHaveBeenCalledWith('subscribe_post', { postId: 'post-123' });
      
      fireEvent.click(screen.getByTestId('unsubscribe-post'));
      expect(mockHookReturn.emit).toHaveBeenCalledWith('unsubscribe_post', { postId: 'post-123' });
      
      fireEvent.click(screen.getByTestId('like-post'));
      expect(mockHookReturn.emit).toHaveBeenCalledWith('like_post', { postId: 'post-123', action: 'add' });
    });
  });
  
  describe('Context Value Memoization', () => {
    it('should memoize context value to prevent unnecessary re-renders', () => {
      let renderCount = 0;
      
      const TestMemoComponent = () => {
        renderCount++;
        const context = useWebSocketSingletonContext();
        return <div data-testid="render-count">{renderCount}</div>;
      };
      
      const { rerender } = render(
        <WebSocketSingletonProvider>
          <TestMemoComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');
      
      // Re-render with same props should not cause re-render
      rerender(
        <WebSocketSingletonProvider>
          <TestMemoComponent />
        </WebSocketSingletonProvider>
      );
      
      // The component should not re-render because context value is memoized
      expect(renderCount).toBe(1);
    });
  });
  
  describe('Debug Logging', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation();
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });
    
    it('should log connection state changes', () => {
      mockHookReturn.isConnected = true;
      mockSocket.connected = true;
      mockUseWebSocketSingleton.mockReturnValue(mockHookReturn);
      
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(console.log).toHaveBeenCalledWith(
        '🔌 WebSocketSingletonProvider: Connection state changed',
        expect.objectContaining({
          isConnected: true,
          socketId: 'test-socket-id',
          socketConnected: true
        })
      );
    });
    
    it('should log connection state computation', () => {
      render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      expect(console.log).toHaveBeenCalledWith(
        '🔧 WebSocketSingletonProvider: Computing connection state',
        expect.objectContaining({
          isConnected: false,
          socketExists: true,
          socketConnected: false,
          computedIsConnecting: expect.any(Boolean)
        })
      );
    });
  });
  
  describe('Event Cleanup', () => {
    it('should clean up socket event listeners on unmount', () => {
      const { unmount } = render(
        <WebSocketSingletonProvider>
          <TestConsumerComponent />
        </WebSocketSingletonProvider>
      );
      
      unmount();
      
      // Verify all event handlers are cleaned up
      expect(mockSocket.off).toHaveBeenCalledWith('notification', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('online_users', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('system_stats', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.off).toHaveBeenCalledWith('connect_error', expect.any(Function));
    });
  });
});
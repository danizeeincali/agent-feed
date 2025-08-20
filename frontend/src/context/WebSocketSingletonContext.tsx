import React, { createContext, useContext, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempt: number;
  lastConnected: string | null;
  connectionError: string | null;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userId?: string;
  postId?: string;
  commentId?: string;
}

interface OnlineUser {
  id: string;
  username: string;
  lastSeen: string;
}

interface SystemStats {
  connectedUsers: number;
  activeRooms: number;
  totalSockets: number;
  timestamp: string;
}

interface WebSocketSingletonContextValue {
  socket: any;
  isConnected: boolean;
  lastMessage: any;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  connectionState: ConnectionState;
  notifications: Notification[];
  onlineUsers: OnlineUser[];
  systemStats: SystemStats | null;
  clearNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  subscribeFeed: (feedId: string) => void;
  unsubscribeFeed: (feedId: string) => void;
  subscribePost: (postId: string) => void;
  unsubscribePost: (postId: string) => void;
  sendLike: (postId: string, action?: 'add' | 'remove') => void;
  sendMessage: (event: string, data: any) => void;
  reconnect: () => void;
}

const WebSocketSingletonContext = createContext<WebSocketSingletonContextValue | null>(null);

export const useWebSocketSingletonContext = () => {
  const context = useContext(WebSocketSingletonContext);
  if (!context) {
    throw new Error('useWebSocketSingletonContext must be used within a WebSocketSingletonProvider');
  }
  return context;
};

interface WebSocketSingletonProviderProps {
  children: React.ReactNode;
  config?: {
    url?: string;
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    heartbeatInterval?: number;
  };
}

export const WebSocketSingletonProvider: React.FC<WebSocketSingletonProviderProps> = memo(({ 
  children, 
  config = {} 
}) => {
  // Use singleton hook instead of regular hook
  const { 
    socket, 
    isConnected, 
    lastMessage, 
    connectionError, 
    connect, 
    disconnect, 
    emit 
  } = useWebSocketSingleton({
    url: config.url || 'http://localhost:3000',
    autoConnect: config.autoConnect !== false,
    reconnectAttempts: config.reconnectAttempts || 3,
    reconnectDelay: config.reconnectInterval || 2000
  });

  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Connection state
  const connectionState = useMemo<ConnectionState>(() => ({
    isConnected,
    isConnecting: socket?.connecting || false,
    reconnectAttempt,
    lastConnected: isConnected ? new Date().toISOString() : null,
    connectionError
  }), [isConnected, socket?.connecting, reconnectAttempt, connectionError]);

  // Notification management
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
    );
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Feed and post management
  const subscribeFeed = useCallback((feedId: string) => {
    emit('subscribe_feed', { feedId });
  }, [emit]);

  const unsubscribeFeed = useCallback((feedId: string) => {
    emit('unsubscribe_feed', { feedId });
  }, [emit]);

  const subscribePost = useCallback((postId: string) => {
    emit('subscribe_post', { postId });
  }, [emit]);

  const unsubscribePost = useCallback((postId: string) => {
    emit('unsubscribe_post', { postId });
  }, [emit]);

  const sendLike = useCallback((postId: string, action: 'add' | 'remove' = 'add') => {
    emit('like_post', { postId, action });
  }, [emit]);

  const sendMessage = useCallback((event: string, data: any) => {
    emit(event, data);
  }, [emit]);

  const reconnect = useCallback(() => {
    setReconnectAttempt(prev => prev + 1);
    connect();
  }, [connect]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      notification: (data: any) => {
        addNotification({
          type: data.type || 'info',
          title: data.title || 'Notification',
          message: data.message || '',
          userId: data.userId,
          postId: data.postId,
          commentId: data.commentId
        });
      },
      
      online_users: (data: OnlineUser[]) => {
        setOnlineUsers(data || []);
      },
      
      system_stats: (data: SystemStats) => {
        setSystemStats(data);
      },
      
      connect: () => {
        console.log('🔌 WebSocketSingletonProvider: Connected to server');
        setReconnectAttempt(0);
      },
      
      disconnect: (reason: string) => {
        console.log('🔌 WebSocketSingletonProvider: Disconnected:', reason);
      },
      
      connect_error: (error: any) => {
        console.error('🔌 WebSocketSingletonProvider: Connection error:', error);
      }
    };

    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    // Cleanup function
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
    };
  }, [socket, addNotification]);

  // Stable context value
  const contextValue = useMemo<WebSocketSingletonContextValue>(() => ({
    socket,
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    emit,
    connectionState,
    notifications,
    onlineUsers,
    systemStats,
    clearNotifications,
    markNotificationAsRead,
    addNotification,
    subscribeFeed,
    unsubscribeFeed,
    subscribePost,
    unsubscribePost,
    sendLike,
    sendMessage,
    reconnect
  }), [
    socket,
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    emit,
    connectionState,
    notifications,
    onlineUsers,
    systemStats,
    clearNotifications,
    markNotificationAsRead,
    addNotification,
    subscribeFeed,
    unsubscribeFeed,
    subscribePost,
    unsubscribePost,
    sendLike,
    sendMessage,
    reconnect
  ]);

  return (
    <WebSocketSingletonContext.Provider value={contextValue}>
      {children}
    </WebSocketSingletonContext.Provider>
  );
});

WebSocketSingletonProvider.displayName = 'WebSocketSingletonProvider';

// Backward compatibility export
export { useWebSocketSingletonContext as useWebSocketContext };
export { WebSocketSingletonProvider as WebSocketProvider };
import React, { createContext, useContext, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';
import { getSocketIOUrl } from '@/utils/websocket-url';

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
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  connectionState: ConnectionState;
  connectionError: string | null; // Add missing property
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
  reconnect: () => Promise<void>;
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
    connect, 
    disconnect, 
    emit 
  } = useWebSocketSingleton({
    // Use dynamic URL that works with Vite proxy and production
    url: config.url || import.meta.env.VITE_WEBSOCKET_URL || getSocketIOUrl(),
    autoConnect: config.autoConnect !== false,
    maxReconnectAttempts: config.reconnectAttempts || 5
  });

  // CRITICAL DEBUG: Log connection state changes
  React.useEffect(() => {
    console.log('🔌 WebSocketSingletonProvider: Connection state changed', {
      isConnected,
      socketId: socket?.id,
      socketConnected: socket?.connected,
      url: config.url || import.meta.env.VITE_WEBSOCKET_URL || getSocketIOUrl()
    });
  }, [isConnected, socket?.id, socket?.connected]);

  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // PRODUCTION FIX: Move connectionState calculation BEFORE useMemo context value to avoid temporal dead zone
  // This fixes the "Cannot access 'connectionState' before initialization" error
  const connectionState = useMemo<ConnectionState>(() => {
    // CRITICAL FIX: Socket.IO uses different state properties
    let isConnectingState = false;
    
    if (socket) {
      // Socket.IO specific states:
      // - socket.connected: true when connected
      // - socket.disconnected: true when disconnected
      // - socket.io.readyState: 'opening', 'open', 'closing', 'closed'
      const socketIO = socket.io || socket;
      const readyState = (socketIO as any)?.readyState || (socket as any).readyState;
      
      isConnectingState = !socket.connected && !socket.disconnected && 
        (readyState === 'opening' || readyState === 1);
    }
    
    console.log('🔧 WebSocketSingletonProvider: Socket.IO connection state (PRODUCTION FIX)', {
      isConnected,
      socketExists: !!socket,
      socketConnected: socket?.connected,
      socketDisconnected: socket?.disconnected,
      socketIOReadyState: (socket?.io as any)?.readyState,
      computedIsConnecting: isConnectingState,
      socketId: socket?.id,
      fixApplied: 'Socket.IO-specific state logic'
    });
    
    return {
      isConnected,
      isConnecting: isConnectingState,
      reconnectAttempt,
      lastConnected: isConnected ? new Date().toISOString() : null,
      connectionError
    };
  }, [isConnected, socket?.connected, socket?.disconnected, (socket?.io as any)?.readyState, reconnectAttempt, connectionError]);

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

  const reconnect = useCallback(async () => {
    setReconnectAttempt(prev => prev + 1);
    await connect();
  }, [connect]);

  // Add missing methods for compatibility
  const on = useCallback((event: string, handler: (data: any) => void) => {
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const off = useCallback((event: string, handler?: (data: any) => void) => {
    if (socket) {
      if (handler) {
        socket.off(event, handler);
      } else {
        socket.off(event);
      }
    }
  }, [socket]);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    on(event, handler);
  }, [on]);

  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    off(event, handler);
  }, [off]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      notification: (data: any) => {
        addNotification({
          type: data.type || 'info',
          title: data.title || 'Notification',
          message: data.message || '',
          read: false,
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
        setConnectionError(null);
      },
      
      disconnect: (reason: string) => {
        console.log('🔌 WebSocketSingletonProvider: Disconnected:', reason);
      },
      
      connect_error: (error: any) => {
        console.error('🔌 WebSocketSingletonProvider: Connection error:', error);
        setConnectionError(error?.message || 'Connection failed');
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

  // Stable context value - Fixed temporal dead zone by ensuring connectionState is declared first
  const contextValue = useMemo<WebSocketSingletonContextValue>(() => ({
    socket,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
    subscribe,
    unsubscribe,
    connectionState,
    connectionError,
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
    connect,
    disconnect,
    emit,
    on,
    off,
    subscribe,
    unsubscribe,
    connectionState, // Safe to use here since connectionState is declared above
    connectionError,
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
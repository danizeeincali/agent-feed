import React, { createContext, useContext, useCallback, useEffect, useState, useMemo, memo } from 'react';
// HTTP/SSE only - WebSocket imports removed
// import { useWebSocketSingleton } from '@/hooks/useWebSocketSingleton';
// import { getSocketIOUrl } from '@/utils/websocket-url';

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
  socket: any; // Mock object for compatibility
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  connectionState: ConnectionState;
  connectionError: string | null;
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
  // HTTP/SSE only - no WebSocket connections
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Mock socket object for compatibility
  const socket = useMemo(() => ({
    id: 'http-sse-' + Date.now(),
    connected: isConnected,
    emit: (event: string, data?: any) => {
      console.log('📡 [HTTP/SSE] Mock emit:', event, data);
    },
    on: (event: string, handler: (data: any) => void) => {
      console.log('📡 [HTTP/SSE] Mock event handler registered:', event);
    },
    off: (event: string, handler?: (data: any) => void) => {
      console.log('📡 [HTTP/SSE] Mock event handler removed:', event);
    }
  }), [isConnected]);

  // Mock connection state
  const connectionState = useMemo<ConnectionState>(() => ({
    isConnected,
    isConnecting: false,
    reconnectAttempt,
    lastConnected: isConnected ? new Date().toISOString() : null,
    connectionError
  }), [isConnected, reconnectAttempt, connectionError]);

  // Connection methods
  const connect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE] Mock connect - no WebSocket needed');
    setIsConnected(true);
    setConnectionError(null);
    setReconnectAttempt(0);
  }, []);

  const disconnect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE] Mock disconnect');
    setIsConnected(false);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    console.log('📡 [HTTP/SSE] Mock emit:', event, data);
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    console.log('📡 [HTTP/SSE] Mock event handler registered:', event);
  }, []);

  const off = useCallback((event: string, handler?: (data: any) => void) => {
    console.log('📡 [HTTP/SSE] Mock event handler removed:', event);
  }, []);

  const subscribe = on;
  const unsubscribe = off;

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
    console.log('📡 [HTTP/SSE] Mock subscribe feed:', feedId);
  }, []);

  const unsubscribeFeed = useCallback((feedId: string) => {
    console.log('📡 [HTTP/SSE] Mock unsubscribe feed:', feedId);
  }, []);

  const subscribePost = useCallback((postId: string) => {
    console.log('📡 [HTTP/SSE] Mock subscribe post:', postId);
  }, []);

  const unsubscribePost = useCallback((postId: string) => {
    console.log('📡 [HTTP/SSE] Mock unsubscribe post:', postId);
  }, []);

  const sendLike = useCallback((postId: string, action: 'add' | 'remove' = 'add') => {
    console.log('📡 [HTTP/SSE] Mock send like:', postId, action);
  }, []);

  const sendMessage = useCallback((event: string, data: any) => {
    console.log('📡 [HTTP/SSE] Mock send message:', event, data);
  }, []);

  const reconnect = useCallback(async () => {
    setReconnectAttempt(prev => prev + 1);
    await connect();
  }, [connect]);

  // Auto-connect on mount
  useEffect(() => {
    if (config.autoConnect !== false) {
      connect();
    }
  }, [connect, config.autoConnect]);

  // Context value
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
  ]);

  return (
    <WebSocketSingletonContext.Provider value={contextValue}>
      {children}
    </WebSocketSingletonContext.Provider>
  );
});

WebSocketSingletonProvider.displayName = 'WebSocketSingletonProvider';

// Backward compatibility exports
export { useWebSocketSingletonContext as useWebSocketContext };
export { WebSocketSingletonProvider as WebSocketProvider };
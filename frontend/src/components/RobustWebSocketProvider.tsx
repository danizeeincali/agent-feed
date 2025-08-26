/**
 * HTTP/SSE-only Robust WebSocket Provider (Socket.IO Removed)
 * Mock implementation for backward compatibility
 */

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo, memo } from 'react';

interface ConnectionStateInfo {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempt: number;
  lastConnected: string | null;
  connectionError: string | null;
  connectionQuality: string;
  currentUrl: string | null;
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

interface RobustWebSocketContextValue {
  socket: any;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  connectionState: ConnectionStateInfo;
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
  
  // Enhanced robust features (mocked)
  testConnection: () => Promise<{ success: boolean; latency: number; error?: string }>;
  getDetailedStatus: () => any;
  getMetrics: () => any;
  getHealth: () => any;
}

const RobustWebSocketContext = createContext<RobustWebSocketContextValue | null>(null);

export const useRobustWebSocketContext = () => {
  const context = useContext(RobustWebSocketContext);
  if (!context) {
    throw new Error('useRobustWebSocketContext must be used within a RobustWebSocketProvider');
  }
  return context;
};

interface RobustWebSocketProviderProps {
  children: React.ReactNode;
  config?: {
    url?: string;
    fallbackUrls?: string[];
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    heartbeatInterval?: number;
    debugMode?: boolean;
  };
}

export const RobustWebSocketProvider: React.FC<RobustWebSocketProviderProps> = memo(({ 
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
    id: 'http-sse-robust-' + Date.now(),
    connected: isConnected,
    emit: (event: string, data?: any) => {
      console.log('📡 [HTTP/SSE Robust] Mock emit:', event, data);
    },
    on: (event: string, handler: (data: any) => void) => {
      console.log('📡 [HTTP/SSE Robust] Mock event handler registered:', event);
    },
    off: (event: string, handler?: (data: any) => void) => {
      console.log('📡 [HTTP/SSE Robust] Mock event handler removed:', event);
    }
  }), [isConnected]);

  // Enhanced connection state
  const enhancedConnectionState = useMemo<ConnectionStateInfo>(() => ({
    isConnected,
    isConnecting: false,
    reconnectAttempt,
    lastConnected: isConnected ? new Date().toISOString() : null,
    connectionError,
    connectionQuality: 'excellent',
    currentUrl: config.url || 'http://localhost:3000'
  }), [isConnected, reconnectAttempt, connectionError, config.url]);

  // Connection methods
  const connect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE Robust] Mock connect - no WebSocket needed');
    setIsConnected(true);
    setConnectionError(null);
    setReconnectAttempt(0);
  }, []);

  const disconnect = useCallback(async () => {
    console.log('🚀 [HTTP/SSE Robust] Mock disconnect');
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(async () => {
    setReconnectAttempt(prev => prev + 1);
    await connect();
  }, [connect]);

  const emit = useCallback((event: string, data?: any) => {
    console.log('📡 [HTTP/SSE Robust] Mock emit:', event, data);
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    console.log('📡 [HTTP/SSE Robust] Mock event handler registered:', event);
  }, []);

  const off = useCallback((event: string, handler?: (data: any) => void) => {
    console.log('📡 [HTTP/SSE Robust] Mock event handler removed:', event);
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
    console.log('📡 [HTTP/SSE Robust] Mock subscribe feed:', feedId);
  }, []);

  const unsubscribeFeed = useCallback((feedId: string) => {
    console.log('📡 [HTTP/SSE Robust] Mock unsubscribe feed:', feedId);
  }, []);

  const subscribePost = useCallback((postId: string) => {
    console.log('📡 [HTTP/SSE Robust] Mock subscribe post:', postId);
  }, []);

  const unsubscribePost = useCallback((postId: string) => {
    console.log('📡 [HTTP/SSE Robust] Mock unsubscribe post:', postId);
  }, []);

  const sendLike = useCallback((postId: string, action: 'add' | 'remove' = 'add') => {
    console.log('📡 [HTTP/SSE Robust] Mock send like:', postId, action);
  }, []);

  const sendMessage = useCallback((event: string, data: any) => {
    console.log('📡 [HTTP/SSE Robust] Mock send message:', event, data);
  }, []);

  // Mock enhanced features
  const testConnection = useCallback(async () => {
    return { success: true, latency: 10 };
  }, []);

  const getDetailedStatus = useCallback(() => {
    return { status: 'http-sse-mock', healthy: true };
  }, []);

  const getMetrics = useCallback(() => {
    return { connections: 0, messages: 0 };
  }, []);

  const getHealth = useCallback(() => {
    return { healthy: true, lastCheck: new Date() };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (config.autoConnect !== false) {
      connect();
    }
  }, [connect, config.autoConnect]);

  // Stable context value
  const contextValue = useMemo<RobustWebSocketContextValue>(() => ({
    socket,
    isConnected,
    connect,
    disconnect,
    reconnect,
    emit,
    on,
    off,
    subscribe,
    unsubscribe,
    connectionState: enhancedConnectionState,
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
    testConnection,
    getDetailedStatus,
    getMetrics,
    getHealth
  }), [
    socket,
    isConnected,
    connect,
    disconnect,
    reconnect,
    emit,
    on,
    off,
    enhancedConnectionState,
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
    testConnection,
    getDetailedStatus,
    getMetrics,
    getHealth
  ]);

  return (
    <RobustWebSocketContext.Provider value={contextValue}>
      {children}
    </RobustWebSocketContext.Provider>
  );
});

RobustWebSocketProvider.displayName = 'RobustWebSocketProvider';

// Backward compatibility exports
export { useRobustWebSocketContext as useWebSocketContext };
export { RobustWebSocketProvider as WebSocketProvider };
export default RobustWebSocketProvider;
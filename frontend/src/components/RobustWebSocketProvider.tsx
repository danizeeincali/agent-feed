/**
 * SPARC IMPLEMENTATION: Robust WebSocket Provider
 * COMPLETION: Production-ready WebSocket context with error boundaries
 * Integration with existing WebSocketSingletonContext while using robust backend
 */

import React, { createContext, useContext, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { useRobustWebSocket } from '../hooks/useRobustWebSocket';
import { WebSocketErrorBoundary } from './WebSocketErrorBoundary';
import { ConnectionState } from '../services/connection/types';

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
  
  // Enhanced robust features
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
  // Use robust WebSocket hook
  const { 
    socket, 
    isConnected,
    connectionState,
    connectionQuality,
    currentUrl,
    connect, 
    disconnect, 
    reconnect,
    emit,
    on,
    off,
    testConnection,
    getDetailedStatus,
    getMetrics,
    getHealth
  } = useRobustWebSocket({
    url: config.url || (import.meta as any).env.VITE_WEBSOCKET_URL || 'http://localhost:3001',
    fallbackUrls: config.fallbackUrls || [
      'http://localhost:3003',
      'http://localhost:3002',
      'http://localhost:3004',
      'http://localhost:3005'
    ],
    autoConnect: config.autoConnect !== false,
    debugMode: config.debugMode || (import.meta as any).env.VITE_DEBUG_WEBSOCKET === 'true',
    onConnect: () => {
      console.log('🎉 RobustWebSocketProvider: Connected to robust hub');
      setReconnectAttempt(0);
    },
    onDisconnect: (data) => {
      console.log('🔌 RobustWebSocketProvider: Disconnected:', data.reason);
    },
    onError: (error) => {
      console.error('🚨 RobustWebSocketProvider: Error:', error);
      setConnectionError(error.error?.message || 'Connection error');
    }
  });

  // State management
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Enhanced connection state
  const enhancedConnectionState = useMemo<ConnectionStateInfo>(() => ({
    isConnected,
    isConnecting: connectionState === ConnectionState.CONNECTING,
    reconnectAttempt,
    lastConnected: isConnected ? new Date().toISOString() : null,
    connectionError,
    connectionQuality,
    currentUrl
  }), [isConnected, connectionState, reconnectAttempt, connectionError, connectionQuality, currentUrl]);

  // Clear connection error when connected
  useEffect(() => {
    if (isConnected) {
      setConnectionError(null);
    }
  }, [isConnected]);

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

  // Enhanced reconnect with attempt tracking
  const enhancedReconnect = useCallback(async () => {
    setReconnectAttempt(prev => prev + 1);
    await reconnect();
  }, [reconnect]);

  // Compatibility methods
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    on(event, handler);
  }, [on]);

  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    off(event, handler);
  }, [off]);

  // Socket event handlers with robust error handling
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      notification: (data: any) => {
        try {
          addNotification({
            type: data.type || 'info',
            title: data.title || 'Notification',
            message: data.message || '',
            read: false,
            userId: data.userId,
            postId: data.postId,
            commentId: data.commentId
          });
        } catch (error) {
          console.error('Error handling notification:', error);
        }
      },
      
      online_users: (data: OnlineUser[]) => {
        try {
          setOnlineUsers(data || []);
        } catch (error) {
          console.error('Error handling online users:', error);
        }
      },
      
      system_stats: (data: SystemStats) => {
        try {
          setSystemStats(data);
        } catch (error) {
          console.error('Error handling system stats:', error);
        }
      },
      
      hubWelcome: (data: any) => {
        console.log('🎉 RobustWebSocketProvider: Hub welcome received:', data);
      },
      
      hubHealthUpdate: (data: any) => {
        console.log('💓 RobustWebSocketProvider: Hub health update:', data);
      },
      
      hubRegistered: (data: any) => {
        console.log('✅ RobustWebSocketProvider: Hub registration confirmed:', data);
      },
      
      fromClaude: (data: any) => {
        console.log('📨 RobustWebSocketProvider: Message from Claude:', data);
      },
      
      messageRouted: (data: any) => {
        console.log('📤 RobustWebSocketProvider: Message routed:', data);
      },
      
      routingError: (error: any) => {
        console.warn('⚠️ RobustWebSocketProvider: Routing error:', error);
      }
    };

    // Register all handlers with error boundaries
    Object.entries(handlers).forEach(([event, handler]) => {
      const wrappedHandler = (...args: any[]) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      };
      socket.on(event, wrappedHandler);
    });

    // Cleanup function
    return () => {
      Object.entries(handlers).forEach(([event]) => {
        socket.off(event);
      });
    };
  }, [socket, addNotification]);

  // Stable context value
  const contextValue = useMemo<RobustWebSocketContextValue>(() => ({
    socket,
    isConnected,
    connect,
    disconnect,
    reconnect: enhancedReconnect,
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
    enhancedReconnect,
    emit,
    on,
    off,
    subscribe,
    unsubscribe,
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
    <WebSocketErrorBoundary
      onError={(error, errorInfo) => {
        console.error('WebSocket Error Boundary triggered:', error, errorInfo);
        setConnectionError(error.message);
      }}
      onRecover={() => {
        console.log('WebSocket Error Boundary recovered, attempting reconnection...');
        enhancedReconnect().catch(error => {
          console.error('Recovery reconnection failed:', error);
        });
      }}
    >
      <RobustWebSocketContext.Provider value={contextValue}>
        {children}
      </RobustWebSocketContext.Provider>
    </WebSocketErrorBoundary>
  );
});

RobustWebSocketProvider.displayName = 'RobustWebSocketProvider';

// Backward compatibility exports
export { useRobustWebSocketContext as useWebSocketContext };
export { RobustWebSocketProvider as WebSocketProvider };
export default RobustWebSocketProvider;
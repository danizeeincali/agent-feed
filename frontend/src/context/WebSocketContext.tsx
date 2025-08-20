import React, { createContext, useContext, useCallback, useEffect, useState, useMemo, memo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface UseWebSocketReturn {
  socket: any;
  isConnected: boolean;
  lastMessage: any;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempt: number;
  lastConnected: string | null;
  connectionError: string | null;
}

interface WebSocketContextValue extends UseWebSocketReturn {
  // Additional context-specific methods and state
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

interface TypingUser {
  postId: string;
  userId: string;
  username: string;
  isTyping: boolean;
  timestamp: string;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  config?: {
    url?: string;
    autoConnect?: boolean;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    heartbeatInterval?: number;
  };
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = memo(({ 
  children, 
  config = {} 
}) => {
  // Ensure URL is explicitly set to backend server
  const webSocketConfig = {
    url: 'http://localhost:3000',
    ...config
  };
  const webSocket = useWebSocket(webSocketConfig);
  
  // Context-specific state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Notification management
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
    
    // Auto-remove info notifications after 5 seconds
    if (notification.type === 'info') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    }
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // WebSocket event handlers (optimized with proper cleanup)
  useEffect(() => {
    // CRITICAL FIX: Only register handlers when webSocket is available
    if (!webSocket || !webSocket.on) {
      return;
    }

    const handlers: Array<[string, (data: any) => void]> = [];

    // Post events - optimized event handler registration
    const postCreatedHandler = (data: any) => {
      addNotification({
        type: 'info',
        title: 'New Post',
        message: `New post created: ${data.title}`,
        postId: data.id,
        read: false,
      });
    };
    const postUpdatedHandler = (data: any) => {
      addNotification({
        type: 'info',
        title: 'Post Updated',
        message: `Post "${data.title}" has been updated`,
        postId: data.id,
        read: false,
      });
    };

    // Register handlers efficiently
    webSocket.on('post:created', postCreatedHandler);
    webSocket.on('post:updated', postUpdatedHandler);
    handlers.push(['post:created', postCreatedHandler]);
    handlers.push(['post:updated', postUpdatedHandler]);

    // Simplified remaining handlers - only register what's needed
    const postDeletedHandler = (data: any) => {
      addNotification({
        type: 'warning',
        title: 'Post Deleted',
        message: `A post has been deleted`,
        postId: data.id,
        read: false,
      });
    };

    // Register only essential handlers to reduce memory usage
    webSocket.on('post:deleted', postDeletedHandler);
    handlers.push(['post:deleted', postDeletedHandler]);

    // Only register critical system events to prevent memory leaks
    const systemStatsHandler = (data: any) => setSystemStats(data);
    const errorHandler = (data: any) => {
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: data.message,
        read: false,
      });
    };

    webSocket.on('system:stats', systemStatsHandler);
    webSocket.on('error:details', errorHandler);
    handlers.push(['system:stats', systemStatsHandler]);
    handlers.push(['error:details', errorHandler]);

    // Cleanup function - PERFORMANCE CRITICAL
    return () => {
      if (webSocket && webSocket.off) {
        // Remove all registered handlers
        handlers.forEach(([event, handler]) => {
          webSocket.off(event, handler);
        });
      }
    };
  }, [webSocket, addNotification]);

  // Request online users when connected
  useEffect(() => {
    if (webSocket?.isConnected && webSocket?.emit) {
      // Request online users status
      webSocket.emit('agent:status:request');
    }
  }, [webSocket?.isConnected, webSocket?.emit]);

  // Clean up stale typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const staleThreshold = 10000; // 10 seconds
      
      setTypingUsers(prev => 
        prev.filter(user => {
          const userTime = new Date(user.timestamp).getTime();
          return now - userTime < staleThreshold;
        })
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Create a connectionState object for backward compatibility
  const connectionState = {
    isConnected: webSocket?.isConnected ?? false,
    isConnecting: false, // We don't track this yet
    reconnectAttempt: 0, // We don't track this yet
    lastConnected: null, // We don't track this yet
    connectionError: webSocket?.connectionError ?? null
  };

  // Add convenience methods for WebSocket operations
  const subscribeFeed = (feedId: string) => {
    webSocket?.emit?.('subscribe:feed', feedId);
  };

  const unsubscribeFeed = (feedId: string) => {
    webSocket?.emit?.('unsubscribe:feed', feedId);
  };

  const subscribePost = (postId: string) => {
    webSocket?.emit?.('subscribe:post', postId);
  };

  const unsubscribePost = (postId: string) => {
    webSocket?.emit?.('unsubscribe:post', postId);
  };

  const sendLike = (postId: string, action: 'add' | 'remove' = 'add') => {
    webSocket?.emit?.('post:like', { postId, action });
  };

  const sendMessage = (event: string, data: any) => {
    webSocket?.emit?.(event, data);
  };

  const reconnect = () => {
    webSocket?.connect?.();
  };

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: WebSocketContextValue = useMemo(() => ({
    // Spread with null safety
    socket: webSocket?.socket ?? null,
    isConnected: webSocket?.isConnected ?? false,
    lastMessage: webSocket?.lastMessage ?? null,
    connectionError: webSocket?.connectionError ?? null,
    connect: webSocket?.connect ?? (() => {}),
    disconnect: webSocket?.disconnect ?? (() => {}),
    emit: webSocket?.emit ?? (() => {}),
    subscribe: webSocket?.subscribe ?? (() => {}),
    unsubscribe: webSocket?.unsubscribe ?? (() => {}),
    on: webSocket?.on ?? (() => {}),
    off: webSocket?.off ?? (() => {}),
    connectionState, // Add for components that expect it
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
    reconnect,
  }), [
    webSocket,
    notifications,
    onlineUsers,
    systemStats,
    clearNotifications,
    markNotificationAsRead,
    addNotification,
  ]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
});

WebSocketProvider.displayName = 'WebSocketProvider';

// Hook to get typing users for a specific post
export const useTypingUsers = (postId: string) => {
  const { on, off } = useWebSocketContext();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    const handleTyping = (data: TypingUser) => {
      if (data.postId !== postId) return;
      
      setTypingUsers(prev => {
        const filtered = prev.filter(user => user.userId !== data.userId);
        
        if (data.isTyping) {
          return [...filtered, data];
        } else {
          return filtered;
        }
      });
    };

    on('user:typing', handleTyping);
    
    return () => {
      off('user:typing', handleTyping);
    };
  }, [postId, on, off]);

  return typingUsers;
};

export default WebSocketContext;
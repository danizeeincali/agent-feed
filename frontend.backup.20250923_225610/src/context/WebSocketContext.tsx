// DEPRECATED: This context is replaced by WebSocketSingletonContext
// This file is kept for compatibility but redirects to singleton
import React, { memo, useState, useEffect } from 'react';
import { useWebSocketSingletonContext, WebSocketSingletonProvider } from './WebSocketSingletonContext';

// Re-export singleton context to maintain compatibility
export const useWebSocketContext = useWebSocketSingletonContext;
export const WebSocketProvider = WebSocketSingletonProvider;

// Compatibility type exports
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

// DEPRECATED PROVIDER - Redirects to singleton to prevent dual contexts
export const DeprecatedWebSocketProvider: React.FC<WebSocketProviderProps> = memo(({ 
  children, 
  config = {} 
}) => {
  console.warn('⚠️ DEPRECATED: WebSocketProvider is now WebSocketSingletonProvider. Please update your imports.');
  return (
    <WebSocketSingletonProvider config={config}>
      {children}
    </WebSocketSingletonProvider>
  );
});

DeprecatedWebSocketProvider.displayName = 'DeprecatedWebSocketProvider';

// COMPATIBILITY: Hook redirected to singleton
export const useTypingUsers = (postId: string) => {
  const { socket } = useWebSocketSingletonContext();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!socket) return;

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

    socket.on('user:typing', handleTyping);
    
    return () => {
      socket.off('user:typing', handleTyping);
    };
  }, [postId, socket]);

  return typingUsers;
};

// Export singleton context as default
export default useWebSocketSingletonContext;
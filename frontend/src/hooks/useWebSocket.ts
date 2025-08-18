import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    url = 'http://localhost:3000',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const reconnectCount = useRef(0);
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  const connect = useCallback(() => {
    if (socket?.connected) return;

    try {
      const newSocket = io(url, {
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
        timeout: 10000,
        forceNew: false
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('WebSocket connected:', newSocket.id);
        setIsConnected(true);
        setConnectionError(null);
        reconnectCount.current = 0;
      });

      newSocket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        
        // Attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          if (reconnectCount.current < reconnectAttempts) {
            setTimeout(() => {
              reconnectCount.current++;
              connect();
            }, reconnectDelay * Math.pow(2, reconnectCount.current));
          } else {
            setConnectionError('Failed to reconnect after maximum attempts');
          }
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      });

      // Register existing event handlers
      eventHandlers.current.forEach((handlers, event) => {
        handlers.forEach(handler => {
          newSocket.on(event, handler);
        });
      });

      // Global message handler to track last message
      newSocket.onAny((event, data) => {
        setLastMessage({
          type: event,
          data,
          timestamp: new Date().toISOString()
        });
      });

      setSocket(newSocket);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [url, reconnectAttempts, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }, [socket]);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    // Store handler for re-registration on reconnection
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);

    // Register handler on current socket
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    if (handler) {
      // Remove specific handler
      eventHandlers.current.get(event)?.delete(handler);
      if (socket) {
        socket.off(event, handler);
      }
    } else {
      // Remove all handlers for event
      eventHandlers.current.delete(event);
      if (socket) {
        socket.removeAllListeners(event);
      }
    }
  }, [socket]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventHandlers.current.clear();
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return {
    socket,
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    emit,
    subscribe,
    unsubscribe
  };
};
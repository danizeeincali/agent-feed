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
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    url = 'http://localhost:3001', // Backend WebSocket server
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
    console.log('🔌 useWebSocket: Attempting connection to', url);
    if (socket?.connected) {
      console.log('🔌 useWebSocket: Already connected, skipping');
      return;
    }

    try {
      console.log('🔌 useWebSocket: Creating new socket connection...');
      const newSocket = io(url, {
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: true,
        // CRITICAL FIX: Synchronized timeouts with server
        timeout: 15000,              // Matches server connectTimeout
        forceNew: false,
        withCredentials: false,      // FIXED: Disable credentials for localhost
        reconnection: true,
        reconnectionAttempts: 10,    // Reduced from 15
        reconnectionDelay: 1000,     // Reduced from 2000 - faster reconnect
        reconnectionDelayMax: 5000,  // Reduced from 10000
        maxReconnectionAttempts: 10, // Reduced from 15
        auth: {
          userId: 'claude-code-user',
          username: 'Claude Code User',
          token: 'debug-token'
        },
        // CRITICAL FIX: Synchronized ping settings with server
        autoConnect: true,
        pingTimeout: 20000,          // Matches server pingTimeout
        pingInterval: 8000,          // Matches server pingInterval
        // CRITICAL FIX: Force Socket.IO v4 protocol
        forceBase64: false,
        timestampRequests: true
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
        
        // CRITICAL FIX: Better disconnect reason handling
        const shouldReconnect = [
          'io server disconnect',
          'transport close', 
          'transport error',
          'ping timeout',
          'io client disconnect'  // NEW: Handle client-side disconnects
        ].includes(reason);
        
        if (shouldReconnect && reconnectCount.current < reconnectAttempts) {
          console.log(`🔄 Auto-reconnecting (attempt ${reconnectCount.current + 1}/${reconnectAttempts}) - reason: ${reason}`);
          const delay = Math.min(reconnectDelay * Math.pow(1.2, reconnectCount.current), 5000);
          setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, delay);
        } else {
          setConnectionError(`Connection failed: ${reason} - click Retry to reconnect`);
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        // CRITICAL FIX: Better error message handling
        const errorMessage = error.message || error.toString() || 'Connection failed';
        setConnectionError(`Connection error: ${errorMessage}`);
        setIsConnected(false);
        
        // CRITICAL FIX: Auto-retry on connection errors
        if (reconnectCount.current < reconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectCount.current), 5000);
          console.log(`🔄 Retrying connection in ${delay}ms...`);
          setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, delay);
        }
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
  }, []); // Remove socket from deps, use ref pattern instead

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }, []); // Remove socket from deps

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
  }, []); // Remove socket from deps

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
  }, []); // Remove socket from deps

  // CRITICAL FIX: Auto-connect with proper dependency management
  useEffect(() => {
    if (autoConnect && !socket?.connected) {
      connect();
    }

    return () => {
      // Cleanup on unmount only
      if (socket && !socket.connected) {
        socket.disconnect();
      }
    };
  }, [autoConnect, url]); // CRITICAL FIX: Add url to deps but remove connect

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventHandlers.current.clear();
      if (socket) {
        socket.disconnect();
      }
    };
  }, []); // Remove socket from deps to prevent infinite loop

  return {
    socket,
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    emit,
    subscribe,
    unsubscribe,
    on: subscribe, // Alias for subscribe
    off: unsubscribe // Alias for unsubscribe
  };
};
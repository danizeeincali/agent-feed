/**
 * Production WebSocket Hook - Real WebSocket Implementation
 * Direct WebSocket connection to backend with automatic reconnection
 */
import { useEffect, useState, useCallback, useRef } from 'react';

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
  socket: WebSocket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  send: (message: string) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  getReadyState: () => number;
  getConnectionStats: () => { attempts: number; uptime: number };
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  // Helper function to get dynamic WebSocket URL
  const getDefaultUrl = (): string => {
    if (typeof window === 'undefined') {
      return 'ws://localhost:3000';
    }

    const { protocol, hostname, port } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

    if (hostname.includes('.app.github.dev')) {
      // Codespaces environment
      return `${wsProtocol}//${hostname}`;
    } else {
      // Local development or production
      const wsPort = port ? `:${port}` : '';
      return `${wsProtocol}//${hostname}${wsPort}`;
    }
  };

  const {
    url = getDefaultUrl(), // Dynamic WebSocket URL
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const reconnectCount = useRef(0);
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const connectionStartTime = useRef<number>(0);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    console.log('🚀 [WebSocket] Connecting to:', url);
    if (socket?.readyState === WebSocket.OPEN) {
      console.log('🚀 [WebSocket] Already connected');
      return;
    }

    try {
      const wsUrl = url.replace('http://', 'ws://').replace('https://', 'wss://');
      const newSocket = new WebSocket(wsUrl);
      connectionStartTime.current = Date.now();
      
      newSocket.onopen = () => {
        console.log('✅ [WebSocket] Connected successfully');
        setSocket(newSocket);
        setIsConnected(true);
        setConnectionError(null);
        reconnectCount.current = 0;
        
        // Trigger connect handlers
        const connectHandlers = eventHandlers.current.get('connect');
        connectHandlers?.forEach(handler => {
          try {
            handler({ timestamp: new Date().toISOString() });
          } catch (error) {
            console.error('Connect handler error:', error);
          }
        });
      };
      
      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message: WebSocketMessage = {
            type: data.type,
            data: data,
            timestamp: new Date().toISOString()
          };
          
          setLastMessage(message);
          
          // Trigger event-specific handlers
          const handlers = eventHandlers.current.get(data.type);
          handlers?.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error('Message handler error:', error);
            }
          });
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };
      
      newSocket.onclose = (event) => {
        console.log('🔌 [WebSocket] Connection closed:', event.code, event.reason);
        setSocket(null);
        setIsConnected(false);
        
        if (shouldReconnect.current && reconnectCount.current < reconnectAttempts) {
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectCount.current), 30000);
          console.log(`🔄 Reconnecting WebSocket (${reconnectCount.current + 1}/${reconnectAttempts}) in ${delay}ms`);
          
          setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, delay);
        } else if (reconnectCount.current >= reconnectAttempts) {
          setConnectionError('Max reconnection attempts reached. Please refresh the page.');
        }
      };
      
      newSocket.onerror = (error) => {
        console.error('❌ [WebSocket] Connection error:', error);
        setConnectionError('WebSocket connection failed');
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [url, reconnectAttempts, reconnectDelay]);
  
  const send = useCallback((message: string) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(message);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, [socket]);
  
  const getReadyState = useCallback(() => {
    return socket?.readyState ?? WebSocket.CLOSED;
  }, [socket]);
  
  const getConnectionStats = useCallback(() => {
    return {
      attempts: reconnectCount.current,
      uptime: connectionStartTime.current ? Date.now() - connectionStartTime.current : 0
    };
  }, []);

  const disconnect = useCallback(() => {
    console.log('🚀 [WebSocket] Disconnecting');
    shouldReconnect.current = false;
    
    if (socket) {
      socket.close(1000, 'User initiated disconnect');
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);


  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);
  }, []);

  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    if (handler) {
      eventHandlers.current.get(event)?.delete(handler);
    } else {
      eventHandlers.current.delete(event);
    }
  }, []);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && !isConnected) {
      connect();
    }
  }, [autoConnect, connect, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldReconnect.current = false;
      eventHandlers.current.clear();
      if (socket) {
        socket.close();
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
    send,
    subscribe,
    unsubscribe,
    getReadyState,
    getConnectionStats
  };
};
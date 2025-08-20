import { useState, useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseWebSocketSingletonOptions {
  url: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

interface UseWebSocketSingletonReturn {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: any;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
}

// CRITICAL: Global singleton instance to prevent multiple connections
let globalSocket: Socket | null = null;
let globalConnectionCount = 0;
let globalListeners: Map<string, Set<(data: any) => void>> = new Map();

// Connection monitoring for debugging
const logConnectionState = () => {
  console.log(`🔍 WebSocket Singleton Status:`, {
    globalSocket: !!globalSocket,
    connectionCount: globalConnectionCount,
    isConnected: globalSocket?.connected || false,
    listeners: globalListeners.size
  });
};

export const useWebSocketSingleton = (options: UseWebSocketSingletonOptions): UseWebSocketSingletonReturn => {
  const {
    url,
    autoConnect = true,
    reconnectAttempts = 3,
    reconnectDelay = 2000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);

  // Increment connection count when hook is used
  useEffect(() => {
    globalConnectionCount++;
    logConnectionState();
    
    return () => {
      globalConnectionCount--;
      logConnectionState();
      
      // Only disconnect if no more components are using the socket
      if (globalConnectionCount === 0 && globalSocket) {
        console.log('🔌 Last component unmounted, disconnecting global socket');
        globalSocket.disconnect();
        globalSocket = null;
        globalListeners.clear();
      }
    };
  }, []);

  // Create or reuse global socket connection
  const connect = useCallback(() => {
    if (globalSocket?.connected) {
      console.log('🔌 Reusing existing WebSocket connection');
      setIsConnected(true);
      setConnectionError(null);
      return;
    }

    if (globalSocket && !globalSocket.connected) {
      console.log('🔌 Reconnecting existing WebSocket');
      globalSocket.connect();
      return;
    }

    console.log('🔌 Creating new global WebSocket connection');
    
    // Create new global socket
    globalSocket = io(url, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
      forceNew: false // Prevent multiple connections
    });

    // Global event handlers
    globalSocket.on('connect', () => {
      console.log('🔌 Global WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    globalSocket.on('disconnect', (reason) => {
      console.log('🔌 Global WebSocket disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        globalSocket?.connect();
      }
    });

    globalSocket.on('connect_error', (error) => {
      console.error('🔌 Global WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
      
      reconnectAttemptsRef.current++;
      if (reconnectAttemptsRef.current >= reconnectAttempts) {
        setConnectionError(`Failed to connect after ${reconnectAttempts} attempts`);
      }
    });

    // Universal message handler that broadcasts to all listeners
    globalSocket.onAny((event, data) => {
      setLastMessage({ event, data, timestamp: Date.now() });
      
      // Broadcast to all registered listeners
      const listeners = globalListeners.get(event);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error(`Error in WebSocket listener for ${event}:`, error);
          }
        });
      }
    });

    // Connect the socket
    globalSocket.connect();
  }, [url, reconnectAttempts, reconnectDelay]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.disconnect();
      setIsConnected(false);
    }
  }, []);

  // Emit function with safety checks
  const emit = useCallback((event: string, data?: any) => {
    if (globalSocket?.connected) {
      globalSocket.emit(event, data);
    } else {
      console.warn('Cannot emit event: WebSocket not connected');
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [autoConnect, connect]);

  // Update connection state when global socket changes
  useEffect(() => {
    if (globalSocket) {
      setIsConnected(globalSocket.connected);
    }
  }, [globalSocket?.connected]);

  return {
    socket: globalSocket,
    isConnected,
    lastMessage,
    connectionError,
    connect,
    disconnect,
    emit
  };
};

// Helper function to register global event listeners
export const addGlobalSocketListener = (event: string, callback: (data: any) => void) => {
  if (!globalListeners.has(event)) {
    globalListeners.set(event, new Set());
  }
  globalListeners.get(event)!.add(callback);
  
  // Return cleanup function
  return () => {
    const listeners = globalListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        globalListeners.delete(event);
      }
    }
  };
};

// Debug function to check singleton state
export const getWebSocketSingletonDebugInfo = () => ({
  hasGlobalSocket: !!globalSocket,
  isConnected: globalSocket?.connected || false,
  connectionCount: globalConnectionCount,
  listenerEvents: Array.from(globalListeners.keys()),
  totalListeners: Array.from(globalListeners.values()).reduce((sum, set) => sum + set.size, 0)
});
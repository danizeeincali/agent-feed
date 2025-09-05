import { useState, useEffect, useCallback, useRef } from 'react';
import { ProductionSSEConnectionManager } from '../services/SSEConnectionManager';

interface UseSSEConnectionOptions {
  url?: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  authToken?: string;
  refreshTokenUrl?: string;
  authRetryCount?: number;
}

interface SSEConnectionState {
  state: string;
  url: string;
  lastEventId: string | null;
  connectionTime: number;
}

interface UseSSEConnectionReturn {
  isConnected: boolean;
  connectionState: SSEConnectionState | null;
  error: string | null;
  connect: (options?: UseSSEConnectionOptions) => Promise<void>;
  disconnect: () => void;
  subscribe: (eventType: string, handler: Function) => () => void;
  retry: () => Promise<{ success: boolean }>;
}

export const useSSEConnection = (
  options: UseSSEConnectionOptions = {}
): UseSSEConnectionReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<SSEConnectionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sseManagerRef = useRef<ProductionSSEConnectionManager | null>(null);
  const eventListeners = useRef<Map<string, Set<Function>>>(new Map());

  // Initialize SSE manager
  useEffect(() => {
    sseManagerRef.current = new ProductionSSEConnectionManager();
    return () => {
      if (sseManagerRef.current) {
        sseManagerRef.current.disconnect();
      }
    };
  }, []);

  const connect = useCallback(async (connectOptions: UseSSEConnectionOptions = {}) => {
    if (!sseManagerRef.current) return;

    const config = {
      url: 'https://production-api.agent-feed.com/api/v1/stream',
      withCredentials: true,
      headers: {
        'Authorization': 'Bearer real-jwt-token',
        'Accept': 'text/event-stream'
      },
      timeout: 30000,
      ...options,
      ...connectOptions
    };

    try {
      setError(null);
      const result = await sseManagerRef.current.connect(config);
      
      if (result.success) {
        setIsConnected(true);
        setConnectionState(sseManagerRef.current.getConnectionState());
        
        // Set up event handlers
        sseManagerRef.current.subscribe('error', (errorData) => {
          setError(errorData.message || 'SSE connection error');
          setIsConnected(false);
          setConnectionState(null);
        });

        // Handle various SSE events
        sseManagerRef.current.subscribe('agent_metrics_update', (data) => {
          // Forward to subscribed handlers
          const handlers = eventListeners.current.get('agent_metrics_update');
          if (handlers) {
            handlers.forEach(handler => handler(data));
          }
        });

        sseManagerRef.current.subscribe('streaming_chunk', (data) => {
          const handlers = eventListeners.current.get('streaming_chunk');
          if (handlers) {
            handlers.forEach(handler => handler(data));
          }
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'SSE connection failed';
      setError(errorMessage);
      setIsConnected(false);
      setConnectionState(null);
      throw new Error(errorMessage);
    }
  }, [options]);

  const disconnect = useCallback(() => {
    if (sseManagerRef.current) {
      sseManagerRef.current.disconnect();
    }
    setIsConnected(false);
    setConnectionState(null);
    setError(null);
  }, []);

  const subscribe = useCallback((eventType: string, handler: Function): (() => void) => {
    if (!eventListeners.current.has(eventType)) {
      eventListeners.current.set(eventType, new Set());
    }
    eventListeners.current.get(eventType)!.add(handler);

    // Also subscribe to SSE manager if available
    if (sseManagerRef.current) {
      sseManagerRef.current.subscribe(eventType, handler);
    }

    return () => {
      const handlers = eventListeners.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
      }
      if (sseManagerRef.current) {
        sseManagerRef.current.unsubscribe(eventType, handler);
      }
    };
  }, []);

  const retry = useCallback(async (): Promise<{ success: boolean }> => {
    if (sseManagerRef.current) {
      return await sseManagerRef.current.retry();
    }
    return { success: false };
  }, []);

  // Auto-connect in development mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      connect().catch((error) => {
        console.warn('SSE auto-connect failed:', error.message);
      });
    }
  }, [connect]);

  return {
    isConnected,
    connectionState,
    error,
    connect,
    disconnect,
    subscribe,
    retry
  };
};

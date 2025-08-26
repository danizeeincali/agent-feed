import { useEffect, useState, useCallback, useRef } from 'react';

interface HTTPSSEMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface UseHTTPSSEOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pollingInterval?: number;
  maxBackoffDelay?: number;
}

interface UseHTTPSSEReturn {
  socket: any | null;
  isConnected: boolean;
  lastMessage: HTTPSSEMessage | null;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  startPolling: (instanceId: string) => void;
  stopPolling: () => void;
  connectSSE: (instanceId: string) => void;
}

interface ConnectionState {
  isSSE: boolean;
  isPolling: boolean;
  instanceId: string | null;
  connectionType: 'none' | 'sse' | 'polling';
}

export const useHTTPSSE = (options: UseHTTPSSEOptions = {}): UseHTTPSSEReturn => {
  const {
    url = 'http://localhost:3000',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    pollingInterval = 2000,
    maxBackoffDelay = 30000
  } = options;

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<HTTPSSEMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socket, setSocket] = useState<any | null>(null);

  // Refs for connection management
  const reconnectCount = useRef(0);
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseConnection = useRef<EventSource | null>(null);
  const connectionState = useRef<ConnectionState>({
    isSSE: false,
    isPolling: false,
    instanceId: null,
    connectionType: 'none'
  });
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate exponential backoff delay
  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const exponential = reconnectDelay * Math.pow(2, attempt);
    const withJitter = exponential + Math.random() * 1000;
    return Math.min(withJitter, maxBackoffDelay);
  }, [reconnectDelay, maxBackoffDelay]);

  // Emit message to server
  const emitMessage = useCallback(async (event: string, data?: any) => {
    try {
      let endpoint = '';
      let payload: any = data;

      switch (event) {
        case 'terminal:input':
          endpoint = '/api/v1/claude/terminal/input';
          payload = { input: data.input, instanceId: connectionState.current.instanceId };
          break;
        case 'instance:create':
          endpoint = '/api/v1/claude/instances';
          break;
        case 'instance:delete':
          endpoint = `/api/v1/claude/instances/${data.instanceId}`;
          break;
        default:
          console.warn(`Unsupported event type: ${event}`);
          return;
      }

      const method = endpoint.includes('DELETE') || event === 'instance:delete' ? 'DELETE' : 'POST';
      
      const response = await fetch(`${url}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? JSON.stringify(payload) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Trigger success handlers
      const successHandlers = eventHandlers.current.get(`${event}:success`);
      successHandlers?.forEach(handler => {
        try {
          handler(result);
        } catch (error) {
          console.error(`Handler error for ${event}:success:`, error);
        }
      });

    } catch (error) {
      console.error(`Failed to emit ${event}:`, error);
      
      // Trigger error handlers
      const errorHandlers = eventHandlers.current.get(`${event}:error`);
      errorHandlers?.forEach(handler => {
        try {
          handler(error);
        } catch (handlerError) {
          console.error(`Handler error for ${event}:error:`, handlerError);
        }
      });

      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [url]);

  // Create mock socket object for compatibility
  const createMockSocket = useCallback(() => {
    return {
      id: `httpsse-${Date.now()}`,
      connected: true,
      emit: emitMessage,
      on: (event: string, handler: (data: any) => void) => {
        if (!eventHandlers.current.has(event)) {
          eventHandlers.current.set(event, new Set());
        }
        eventHandlers.current.get(event)!.add(handler);
      },
      off: (event: string, handler?: (data: any) => void) => {
        if (handler) {
          eventHandlers.current.get(event)?.delete(handler);
        } else {
          eventHandlers.current.delete(event);
        }
      },
      disconnect: () => {
        setIsConnected(false);
        connectionState.current.connectionType = 'none';
      },
      removeAllListeners: (event?: string) => {
        if (event) {
          eventHandlers.current.delete(event);
        } else {
          eventHandlers.current.clear();
        }
      }
    };
  }, [emitMessage]);

  // Trigger event handlers
  const triggerHandlers = useCallback((event: string, data: any) => {
    const handlers = eventHandlers.current.get(event);
    handlers?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Handler error for event ${event}:`, error);
      }
    });
  }, []);

  // SSE Connection
  const connectSSE = useCallback((instanceId: string) => {
    console.log('🔄 Attempting SSE connection for instance:', instanceId);
    
    // Clean up existing connections
    if (sseConnection.current) {
      sseConnection.current.close();
      sseConnection.current = null;
    }

    try {
      const eventSource = new EventSource(
        `${url}/api/v1/claude/instances/${instanceId}/terminal/stream`,
        { withCredentials: false }
      );
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        setIsConnected(true);
        setConnectionError(null);
        reconnectCount.current = 0;
        connectionState.current = {
          isSSE: true,
          isPolling: false,
          instanceId,
          connectionType: 'sse'
        };
        
        triggerHandlers('connect', { 
          transport: 'sse', 
          instanceId,
          connectionType: 'sse'
        });
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          const message: HTTPSSEMessage = {
            type: data.type || 'terminal_output',
            data,
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          setLastMessage(message);
          
          // Route messages to appropriate handlers
          if (data.type === 'terminal_output' || data.output) {
            triggerHandlers('terminal:output', {
              output: data.output || data.data,
              instanceId: data.instanceId || instanceId,
              processInfo: data.processInfo
            });
          }
          
          // Generic message handler
          triggerHandlers('message', data);
          
        } catch (error) {
          console.error('SSE message parsing error:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.warn('❌ SSE connection error, falling back to HTTP polling');
        setConnectionError('SSE failed, using HTTP polling');
        
        // Close SSE and fallback to polling
        eventSource.close();
        sseConnection.current = null;
        startPolling(instanceId);
      };
      
      sseConnection.current = eventSource;
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      console.log('🔄 Falling back to HTTP polling');
      startPolling(instanceId);
    }
  }, [url, triggerHandlers]);

  // HTTP Polling Fallback
  const startPolling = useCallback((instanceId: string) => {
    console.log('🔄 Starting HTTP polling for instance:', instanceId);
    
    // Stop existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Update connection state
    setIsConnected(true);
    setConnectionError(null);
    connectionState.current = {
      isSSE: false,
      isPolling: true,
      instanceId,
      connectionType: 'polling'
    };
    
    triggerHandlers('connect', { 
      transport: 'polling', 
      instanceId,
      connectionType: 'polling'
    });
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${url}/api/v1/claude/terminal/output/${instanceId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          if (response.status === 404) {
            // Instance might not exist, continue polling
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && (data.output || data.hasOutput)) {
          const message: HTTPSSEMessage = {
            type: 'terminal_output',
            data: {
              output: data.output || data.lastOutput,
              instanceId: data.instanceId || instanceId,
              processInfo: data.processInfo,
              timestamp: data.timestamp
            },
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          setLastMessage(message);
          
          triggerHandlers('terminal:output', {
            output: data.output || data.lastOutput,
            instanceId: data.instanceId || instanceId,
            processInfo: data.processInfo
          });
        }
        
        // Reset connection error if successful
        if (connectionError) {
          setConnectionError(null);
        }
        
      } catch (error) {
        console.error('HTTP polling error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Polling failed';
        setConnectionError(`Polling error: ${errorMessage}`);
        
        // Don't disconnect on single poll failure, keep trying
        triggerHandlers('error', error);
      }
    }, pollingInterval);
    
  }, [url, pollingInterval, connectionError, triggerHandlers]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    connectionState.current.isPolling = false;
  }, []);

  // Connect function - tries SSE first, falls back to polling
  const connect = useCallback(() => {
    if (isConnected) {
      console.log('Already connected, skipping connection attempt');
      return;
    }

    console.log('🚀 Initiating HTTP/SSE connection');
    
    // Create mock socket for compatibility
    setSocket(createMockSocket());
    
    // For initial connection without instance ID, just mark as connected
    // Components will call connectSSE or startPolling with specific instance ID
    setIsConnected(true);
    setConnectionError(null);
    reconnectCount.current = 0;
    
    // Clear any reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    triggerHandlers('connect', { 
      transport: 'ready', 
      connectionType: 'ready'
    });
    
  }, [isConnected, createMockSocket, triggerHandlers]);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting HTTP/SSE');
    
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Stop polling
    stopPolling();
    
    // Close SSE connection
    if (sseConnection.current) {
      sseConnection.current.close();
      sseConnection.current = null;
    }
    
    // Update state
    setIsConnected(false);
    setConnectionError(null);
    setSocket(null);
    connectionState.current = {
      isSSE: false,
      isPolling: false,
      instanceId: null,
      connectionType: 'none'
    };
    
    triggerHandlers('disconnect', { reason: 'manual' });
  }, [stopPolling, triggerHandlers]);

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectCount.current >= reconnectAttempts) {
      setConnectionError(`Connection failed after ${reconnectAttempts} attempts`);
      return;
    }

    const delay = calculateBackoffDelay(reconnectCount.current);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectCount.current + 1}/${reconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectCount.current++;
      
      if (connectionState.current.instanceId) {
        connectSSE(connectionState.current.instanceId);
      } else {
        connect();
      }
    }, delay);
  }, [reconnectAttempts, calculateBackoffDelay, connectSSE, connect]);

  // Event handler management
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);

    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    if (handler) {
      eventHandlers.current.get(event)?.delete(handler);
      if (socket) {
        socket.off(event, handler);
      }
    } else {
      eventHandlers.current.delete(event);
      if (socket) {
        socket.removeAllListeners(event);
      }
    }
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Not connected, cannot emit event:', event);
    }
  }, [socket]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !isConnected) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      disconnect();
      eventHandlers.current.clear();
    };
  }, [autoConnect]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (sseConnection.current) {
        sseConnection.current.close();
      }
    };
  }, []);

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
    on: subscribe,
    off: unsubscribe,
    startPolling,
    stopPolling,
    connectSSE
  };
};
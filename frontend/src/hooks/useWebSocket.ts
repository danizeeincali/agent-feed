/**
 * HTTP/SSE-only WebSocket Hook (Socket.IO Removed)
 * Mock implementation for backward compatibility
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
  socket: any | null; // NUCLEAR OPTION: Changed from Socket to any
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
  // NUCLEAR OPTION: Add HTTP polling methods
  startPolling: (instanceId: string) => void;
  stopPolling: () => void;
  connectSSE: (instanceId: string) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    url = 'http://localhost:3000', // HTTP/SSE only
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000
  } = options;

  const [socket, setSocket] = useState<any | null>(null); // NUCLEAR OPTION: Mock socket object
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const reconnectCount = useRef(0);
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const sseConnection = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    console.log('🚀 [HTTP/SSE] Mock connect - no WebSocket needed');
    if (isConnected) {
      console.log('🚀 [HTTP/SSE] Already connected, skipping');
      return;
    }

    try {
      console.log('🚀 [HTTP/SSE] Creating mock socket...');
      // Mock socket object for HTTP/SSE compatibility
      const mockSocket = {
        id: 'http-sse-' + Date.now(),
        connected: true,
        emit: (event: string, data?: any) => {
          console.log('📡 [HTTP/SSE] Mock emit:', event, data);
        },
        on: (event: string, handler: (data: any) => void) => {
          console.log('📡 HTTP Polling register handler for:', event);
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
          console.log('📡 HTTP Polling disconnected');
          setIsConnected(false);
        }
      };

      // NUCLEAR OPTION: Simulate connection success
      setTimeout(() => {
        console.log('✅ HTTP Polling connected:', mockSocket.id);
        setIsConnected(true);
        setConnectionError(null);
        reconnectCount.current = 0;
        
        // Trigger connect handlers
        const connectHandlers = eventHandlers.current.get('connect');
        connectHandlers?.forEach(handler => {
          try {
            handler({ transport: 'http-polling', id: mockSocket.id });
          } catch (error) {
            console.error('Connect handler error:', error);
          }
        });
      }, 100);

      // NUCLEAR OPTION: No transport upgrades needed for HTTP polling
      console.log('🚀 HTTP Polling - no transport upgrades needed');

      // NUCLEAR OPTION: Handle HTTP polling disconnect
      const handleDisconnect = (reason: string) => {
        console.log('HTTP Polling disconnected:', reason);
        setIsConnected(false);
        
        if (reconnectCount.current < reconnectAttempts) {
          console.log(`🔄 Auto-reconnecting HTTP polling (attempt ${reconnectCount.current + 1}/${reconnectAttempts})`);
          const delay = Math.min(reconnectDelay * Math.pow(1.2, reconnectCount.current), 5000);
          setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, delay);
        } else {
          setConnectionError(`HTTP Polling failed: ${reason} - click Retry to reconnect`);
        }
      };

      // NUCLEAR OPTION: Handle HTTP polling errors
      const handleConnectionError = (error: any) => {
        console.error('HTTP Polling connection error:', error);
        const errorMessage = error.message || error.toString() || 'HTTP connection failed';
        setConnectionError(`HTTP Polling error: ${errorMessage}`);
        setIsConnected(false);
        
        if (reconnectCount.current < reconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectCount.current), 5000);
          console.log(`🔄 Retrying HTTP polling in ${delay}ms...`);
          setTimeout(() => {
            reconnectCount.current++;
            connect();
          }, delay);
        }
      };

      // NUCLEAR OPTION: Set mock socket
      setSocket(mockSocket);
    } catch (error) {
      console.error('Failed to create HTTP Polling connection:', error);
      setConnectionError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [url, reconnectAttempts, reconnectDelay]);
  
  // NUCLEAR OPTION: HTTP Polling methods
  const startPolling = useCallback((instanceId: string) => {
    console.log('🚀 Starting HTTP polling for instance:', instanceId);
    
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${url}/api/v1/claude/instances/${instanceId}/terminal/poll`);
        const data = await response.json();
        
        if (data.success && data.hasOutput) {
          setLastMessage({
            type: 'terminal:output',
            data: { output: data.lastOutput, processInfo: data.processInfo },
            timestamp: data.timestamp
          });
          
          // Trigger terminal output handlers
          const outputHandlers = eventHandlers.current.get('terminal:output');
          outputHandlers?.forEach(handler => {
            try {
              handler({ output: data.lastOutput, processInfo: data.processInfo });
            } catch (error) {
              console.error('Output handler error:', error);
            }
          });
        }
      } catch (error) {
        console.error('HTTP polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  }, [url]);
  
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);
  
  const connectSSE = useCallback((instanceId: string) => {
    console.log('🚀 Connecting SSE for instance:', instanceId);
    
    if (sseConnection.current) {
      sseConnection.current.close();
    }
    
    try {
      const eventSource = new EventSource(`${url}/api/v1/claude/instances/${instanceId}/terminal/stream`);
      
      eventSource.onopen = () => {
        console.log('✅ SSE connection opened');
        setIsConnected(true);
        setConnectionError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          setLastMessage({
            type: data.type,
            data: data,
            timestamp: data.timestamp
          });
          
          // Trigger appropriate handlers
          if (data.type === 'terminal_output') {
            const outputHandlers = eventHandlers.current.get('terminal:output');
            outputHandlers?.forEach(handler => {
              try {
                handler({ output: data.output, instanceId: data.instanceId });
              } catch (error) {
                console.error('SSE output handler error:', error);
              }
            });
          }
        } catch (error) {
          console.error('SSE message parsing error:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        setConnectionError('SSE connection failed');
        setIsConnected(false);
      };
      
      sseConnection.current = eventSource;
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setConnectionError('Failed to create SSE connection');
    }
  }, [url]);

  const disconnect = useCallback(() => {
    console.log('🚀 NUCLEAR OPTION: Disconnecting HTTP polling');
    
    // Stop HTTP polling
    stopPolling();
    
    // Close SSE connection
    if (sseConnection.current) {
      sseConnection.current.close();
      sseConnection.current = null;
    }
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [stopPolling]); // Add stopPolling to deps

  const emit = useCallback((event: string, data?: any) => {
    console.log('🚀 NUCLEAR OPTION: HTTP Polling emit:', event, data);
    
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('HTTP Polling not connected, cannot emit event:', event);
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
    off: unsubscribe, // Alias for unsubscribe
    // NUCLEAR OPTION: Add HTTP polling methods
    startPolling,
    stopPolling,
    connectSSE
  };
};
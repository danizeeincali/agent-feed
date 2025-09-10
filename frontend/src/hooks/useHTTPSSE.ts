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
  maxBackoffDelay?: number;
}

interface UseWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connectionError: string | null;
  connect: () => void;
  disconnect: () => void;
  send: (data: any) => void;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string, handler?: (data: any) => void) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  connectToTerminal: (terminalId: string) => void;
  disconnectFromTerminal: () => void;
}

interface ConnectionState {
  isConnected: boolean;
  terminalId: string | null;
  connectionType: 'none' | 'websocket';
}

export const useWebSocketTerminal = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    url = 'http://localhost:3333',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
    maxBackoffDelay = 30000
  } = options;

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  // Refs for connection management
  const reconnectCount = useRef(0);
  const eventHandlers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseConnection = useRef<EventSource | null>(null);
  const statusSSEConnection = useRef<EventSource | null>(null);
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
          // TDD London School Fix: Enhanced instance ID validation for terminal input
          const inputInstanceId = data.instanceId || connectionState.current.instanceId;
          if (!inputInstanceId || inputInstanceId === 'undefined' || inputInstanceId.trim() === '') {
            throw new Error('No valid instance ID available for terminal input');
          }
          
          // Validate instance ID format
          if (!/^claude-[a-zA-Z0-9]+$/.test(inputInstanceId)) {
            throw new Error(`Invalid instance ID format for terminal input: ${inputInstanceId}`);
          }
          
          endpoint = `/api/claude/instances/${inputInstanceId}/terminal/input`;
          payload = { input: data.input };
          console.log(`🔧 Terminal input sending to: ${url}${endpoint} with payload:`, payload);
          break;
        case 'instance:create':
          endpoint = '/api/claude/instances';
          break;
        case 'instance:delete':
          endpoint = `/api/claude/instances/${data.instanceId}`;
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

  // SSE Connection for status updates (separate from terminal)
  const connectStatusSSE = useCallback(() => {
    // Clean up existing status connection
    if (statusSSEConnection.current) {
      console.log('🔌 Closing existing status SSE connection');
      statusSSEConnection.current.close();
      statusSSEConnection.current = null;
    }

    console.log('🔄 Attempting general status SSE connection');
    
    try {
      const eventSource = new EventSource(
        `${url}/api/status/stream`,
        { withCredentials: false }
      );
      
      statusSSEConnection.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('✅ Status SSE connection established');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'instance:status' || data.type === 'status_update') {
            console.log('📲 Received general status update:', data);
            triggerHandlers('instance:status', {
              instanceId: data.instanceId,
              status: data.status,
              instance: data.instance,
              timestamp: data.timestamp
            });
          } else if (data.type === 'connected') {
            console.log('✅ Status SSE connected:', data.message);
          }
          
        } catch (error) {
          console.error('Status SSE message parsing error:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.warn('❌ Status SSE connection error (non-critical):', error);
        // Don't close status connections on error - they're secondary
      };
      
    } catch (error) {
      console.error('Failed to create status SSE connection:', error);
    }
  }, [url, triggerHandlers]);

  // Enhanced SSE Connection with Robust Error Handling (SPARC Phase 4)
  const connectSSE = useCallback((instanceId: string) => {
    // Enhanced instance ID validation with comprehensive checks
    if (!instanceId || instanceId === 'undefined' || instanceId.trim() === '') {
      console.error('🚨 Cannot connect SSE with invalid instance ID:', instanceId);
      setConnectionError('Invalid instance ID for SSE connection');
      return;
    }
    
    // Additional validation for proper instance ID format
    if (!/^claude-[a-zA-Z0-9]+$/.test(instanceId)) {
      console.error('🚨 Instance ID does not match expected format:', instanceId);
      setConnectionError(`Invalid instance ID format: ${instanceId}`);
      return;
    }
    
    console.log('🔄 Attempting ENHANCED SSE connection for validated instance:', instanceId);
    
    // Clean up existing connections first
    if (sseConnection.current) {
      console.log('🔌 Closing existing SSE connection');
      sseConnection.current.close();
      sseConnection.current = null;
    }
    
    // Stop any existing polling
    if (pollingIntervalRef.current) {
      console.log('🛑 Stopping existing polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      const eventSource = new EventSource(
        `${url}/api/claude/instances/${instanceId}/terminal/stream`,
        { withCredentials: false }
      );
      
      // SPARC Phase 4: Enhanced connection establishment tracking
      let connectionEstablished = false;
      let lastMessageTime = Date.now();
      let heartbeatInterval: NodeJS.Timeout | null = null;
      
      eventSource.onopen = () => {
        console.log('✅ ENHANCED SSE connection established');
        connectionEstablished = true;
        setIsConnected(true);
        setConnectionError(null);
        reconnectCount.current = 0;
        lastMessageTime = Date.now();
        
        connectionState.current = {
          isSSE: true,
          isPolling: false,
          instanceId,
          connectionType: 'sse'
        };
        
        // Start heartbeat monitoring for connection health
        heartbeatInterval = setInterval(() => {
          const timeSinceLastMessage = Date.now() - lastMessageTime;
          if (timeSinceLastMessage > 60000) { // 60 seconds without messages
            console.warn('⚠️ No messages received for 60 seconds, connection may be stale');
          }
        }, 30000); // Check every 30 seconds
        
        triggerHandlers('connect', { 
          transport: 'sse', 
          instanceId,
          connectionType: 'sse',
          enhanced: true
        });
      };
      
      eventSource.onmessage = (event) => {
        lastMessageTime = Date.now(); // Update last message time for health monitoring
        
        try {
          const data = JSON.parse(event.data);
          
          const message: HTTPSSEMessage = {
            type: data.type || 'terminal_output',
            data,
            timestamp: data.timestamp || new Date().toISOString()
          };
          
          setLastMessage(message);
          
          // CRITICAL FIX: Enhanced message routing for REAL Claude output ONLY
          try {
            // Route messages to appropriate handlers - ONLY real Claude output
            if (data.type === 'output' && data.data && data.isReal) {
              // REAL Claude process output - enhanced with authenticity validation
              console.log('📺 REAL Claude output received (validated):', data.data);
              triggerHandlers('terminal:output', {
                output: data.data,
                instanceId: data.instanceId || instanceId,
                timestamp: data.timestamp,
                isReal: true,
                source: data.source
              });
              // Also trigger generic 'output' handler for components listening to that event
              triggerHandlers('output', {
                data: data.data,
                instanceId: data.instanceId || instanceId,
                timestamp: data.timestamp,
                isReal: true,
                source: data.source
              });
            } else if (data.type === 'terminal_output' || data.output) {
              // Only process if marked as real
              if (data.isReal) {
                triggerHandlers('terminal:output', {
                  output: data.output || data.data,
                  instanceId: data.instanceId || instanceId,
                  processInfo: data.processInfo,
                  timestamp: data.timestamp,
                  isReal: true
                });
              }
            } else if (data.type === 'input_echo') {
              // Handle terminal input echo events (always show user's input)
              triggerHandlers('terminal:output', {
                output: data.data || '',
                instanceId: data.instanceId || instanceId,
                isEcho: true,
                timestamp: data.timestamp
              });
            } else if (data.type === 'terminal:output' && data.data && data.isReal) {
              // Enhanced terminal response handling for backend responses - ONLY real
              triggerHandlers('terminal:output', {
                instanceId: instanceId,
                output: data.data,
                timestamp: data.timestamp,
                isReal: true
              });
            } else if (data.type === 'instance:status' || data.type === 'status_update') {
              // Handle instance status updates from backend SSE
              console.log('📲 Received status update via SSE:', data);
              triggerHandlers('instance:status', {
                instanceId: data.instanceId,
                status: data.status,
                instance: data.instance,
                timestamp: data.timestamp
              });
              triggerHandlers('status_update', data);
            } else if (data.type === 'connected') {
              // Handle initial connection confirmation
              console.log('🔗 SSE connection confirmed by backend');
            } else if (data.type === 'heartbeat') {
              // Handle heartbeat messages - just update timestamp
              console.debug('💓 Heartbeat received from backend');
            }
            
            // Generic message handler
            triggerHandlers('message', data);
          } catch (handlerError) {
            console.error('Error in message handler:', handlerError);
            // Don't break the connection for handler errors
          }
          
        } catch (parseError) {
          console.error('SSE message parsing error:', parseError);
          // Don't break the connection for parse errors
        }
      };
      
      eventSource.onerror = (error) => {
        console.warn('❌ Enhanced SSE connection error detected:', error);
        
        // Clean up heartbeat interval
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        // SPARC Phase 4: Intelligent error recovery based on connection state
        if (eventSource.readyState === EventSource.CONNECTING) {
          console.log('🔄 Connection in progress, waiting for completion...');
          return; // Let it continue trying to connect
        }
        
        if (connectionEstablished && reconnectCount.current < reconnectAttempts) {
          // Connection was working, attempt intelligent reconnection
          console.log(`🔄 Attempting enhanced SSE reconnection (${reconnectCount.current + 1}/${reconnectAttempts})`);
          
          setTimeout(() => {
            if (eventSource.readyState !== EventSource.CLOSED) {
              eventSource.close();
            }
            sseConnection.current = null;
            reconnectCount.current++;
            connectSSE(instanceId); // Recursive reconnect with backoff
          }, calculateBackoffDelay(reconnectCount.current));
        } else {
          // Connection never established or too many retries, fallback to polling
          console.warn('🔄 SSE connection failed permanently, falling back to enhanced polling');
          setConnectionError('SSE failed, using enhanced HTTP polling');
          
          // Close SSE and fallback to polling
          if (eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close();
          }
          sseConnection.current = null;
          startPolling(instanceId);
        }
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
    // TDD London School Fix: Enhanced instance ID validation for polling
    if (!instanceId || instanceId === 'undefined' || instanceId.trim() === '') {
      console.error('🚨 Cannot start polling with invalid instance ID:', instanceId);
      setConnectionError('Invalid instance ID for polling connection');
      return;
    }
    
    // Additional validation for proper instance ID format
    if (!/^claude-[a-zA-Z0-9]+$/.test(instanceId)) {
      console.error('🚨 Instance ID does not match expected format for polling:', instanceId);
      setConnectionError(`Invalid instance ID format for polling: ${instanceId}`);
      return;
    }
    
    console.log('🔄 Starting HTTP polling for validated instance:', instanceId);
    
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
        const response = await fetch(`${url}/api/claude/terminal/output/${instanceId}`, {
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
    
    // Close status SSE connection
    if (statusSSEConnection.current) {
      statusSSEConnection.current.close();
      statusSSEConnection.current = null;
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

  // Attempt reconnection with exponential backoff - improved for SSE persistence
  const attemptReconnect = useCallback(() => {
    if (reconnectCount.current >= reconnectAttempts) {
      setConnectionError(`Connection failed after ${reconnectAttempts} attempts`);
      return;
    }

    const delay = calculateBackoffDelay(reconnectCount.current);
    console.log(`🔄 SSE Reconnecting in ${delay}ms (attempt ${reconnectCount.current + 1}/${reconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectCount.current++;
      
      if (connectionState.current.instanceId) {
        console.log(`🔄 Reconnecting SSE to instance: ${connectionState.current.instanceId}`);
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
    if (isConnected) {
      emitMessage(event, data);
    } else {
      console.warn('Not connected, cannot emit event:', event);
    }
  }, [isConnected, emitMessage]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && !isConnected) {
      connect();
      // Also connect to general status SSE for instance updates
      console.log('🔄 Setting up status SSE connection on mount');
      connectStatusSSE();
    }

    return () => {
      // Cleanup on unmount
      disconnect();
      eventHandlers.current.clear();
    };
  }, [autoConnect, connectStatusSSE]);

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
      if (statusSSEConnection.current) {
        statusSSEConnection.current.close();
      }
    };
  }, []);

  // Add a method to disconnect from a specific instance
  const disconnectFromInstance = useCallback(() => {
    console.log('🔌 Disconnecting from current instance');
    
    // Close SSE connection
    if (sseConnection.current) {
      sseConnection.current.close();
      sseConnection.current = null;
    }
    
    // Stop polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    // Reset connection state but keep socket connected for general operations
    connectionState.current = {
      isSSE: false,
      isPolling: false,
      instanceId: null,
      connectionType: 'none'
    };
    
    console.log('✅ Instance disconnected');
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
    connectSSE,
    disconnectFromInstance
  };
};
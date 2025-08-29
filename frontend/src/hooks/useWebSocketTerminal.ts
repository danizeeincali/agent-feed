/**
 * WebSocket Terminal Hook - Drop-in replacement for SSE functionality
 * Provides ALL functions ClaudeInstanceManagerModern needs without changes
 * Implements WebSocket connection management with compatibility layer
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import ClaudeOutputParser, { ParsedClaudeMessage } from '../utils/claude-output-parser';

interface ConnectionState {
  isConnected: boolean;
  instanceId: string | null;
  connectionType: 'none' | 'websocket' | 'polling';
  lastError: string | null;
  connectionAttempts: number;
  lastConnectionTime: number;
  terminalId: string | null;
}

interface EventHandler {
  event: string;
  handler: (data: any) => void;
}

interface ConnectionOptions {
  enableRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  enableFallback?: boolean;
  url?: string;
}

class WebSocketTerminalManager {
  private connections: Map<string, WebSocket> = new Map();
  private handlers: Map<string, Set<(data: any) => void>> = new Map();
  private globalHandlers: Set<EventHandler> = new Set();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private baseUrl: string;
  
  constructor(baseUrl: string = 'ws://localhost:3002') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get or create WebSocket connection for terminal
   */
  getConnection(terminalId: string): WebSocket {
    const existing = this.connections.get(terminalId);
    if (existing && existing.readyState === WebSocket.OPEN) {
      console.log(`♻️ Reusing existing WebSocket connection for ${terminalId}`);
      return existing;
    }
    
    // Clean up old connection
    if (existing) {
      this.disconnect(terminalId);
    }
    
    // Create new WebSocket connection
    const url = `${this.baseUrl}/terminal/${terminalId}`;
    console.log(`🔌 Creating new WebSocket connection for ${terminalId}: ${url}`);
    
    const ws = new WebSocket(url);
    this.connections.set(terminalId, ws);
    
    // Setup event handlers
    ws.onopen = () => {
      console.log(`✅ WebSocket connected for ${terminalId}`);
      this.emit('connect', { 
        instanceId: terminalId, 
        terminalId,
        connectionType: 'websocket' 
      });
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 WebSocket message for ${terminalId}:`, data);
        
        // Handle terminal output
        if (data.type === 'terminal_output' || data.type === 'output' || data.output) {
          const rawOutput = data.data || data.output || '';
          if (rawOutput) {
            // Emit terminal output event
            this.emit('terminal:output', {
              instanceId: terminalId,
              terminalId,
              output: rawOutput,
              parsed: ClaudeOutputParser.parseClaudeOutput(rawOutput)
            });
            
            // Also emit as message for compatibility
            this.emit('message', {
              type: 'output',
              instanceId: terminalId,
              terminalId,
              output: rawOutput,
              data: rawOutput
            });
          }
        } 
        // Handle status updates
        else if (data.type === 'status' || data.status) {
          this.emit('terminal:status', {
            instanceId: terminalId,
            terminalId,
            status: data.status || data.data?.status
          });
        }
        // Forward other message types
        else {
          this.emit('message', { 
            ...data, 
            instanceId: terminalId,
            terminalId 
          });
        }
      } catch (error) {
        console.error(`❌ Error parsing WebSocket message for ${terminalId}:`, error);
        this.emit('error', { instanceId: terminalId, error: 'Message parsing failed' });
      }
    };
    
    ws.onerror = (error) => {
      console.error(`❌ WebSocket error for ${terminalId}:`, error);
      this.emit('error', { instanceId: terminalId, error: 'WebSocket connection failed' });
    };
    
    ws.onclose = (event) => {
      console.log(`🔌 WebSocket closed for ${terminalId}:`, event.code, event.reason);
      this.connections.delete(terminalId);
      this.emit('disconnect', { instanceId: terminalId, terminalId });
      
      // Auto-reconnect if not a clean close
      if (event.code !== 1000) {
        this.scheduleReconnect(terminalId);
      }
    };
    
    return ws;
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(terminalId: string, delay: number = 2000) {
    const existingTimeout = this.reconnectTimeouts.get(terminalId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    const timeout = setTimeout(() => {
      console.log(`🔄 Attempting to reconnect to ${terminalId}`);
      try {
        this.getConnection(terminalId);
      } catch (error) {
        console.error(`❌ Reconnection failed for ${terminalId}:`, error);
        // Schedule another attempt with exponential backoff
        this.scheduleReconnect(terminalId, Math.min(delay * 2, 30000));
      }
    }, delay);
    
    this.reconnectTimeouts.set(terminalId, timeout);
  }
  
  /**
   * Disconnect specific terminal
   */
  disconnect(terminalId: string): void {
    const connection = this.connections.get(terminalId);
    if (connection) {
      console.log(`🔌 Disconnecting WebSocket for ${terminalId}`);
      connection.close(1000, 'Manual disconnect');
      this.connections.delete(terminalId);
    }
    
    // Clear reconnection timeout
    const timeout = this.reconnectTimeouts.get(terminalId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(terminalId);
    }
    
    this.emit('disconnect', { instanceId: terminalId, terminalId });
  }
  
  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    console.log(`🔌 Disconnecting all WebSocket connections`);
    this.connections.forEach((connection, terminalId) => {
      connection.close(1000, 'Disconnect all');
      this.emit('disconnect', { instanceId: terminalId, terminalId });
    });
    this.connections.clear();
    
    // Clear all reconnection timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
    this.reconnectTimeouts.clear();
  }
  
  /**
   * Send message to terminal
   */
  sendMessage(terminalId: string, message: any): void {
    const connection = this.connections.get(terminalId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      const payload = typeof message === 'string' 
        ? { type: 'input', data: message }
        : message;
      
      connection.send(JSON.stringify(payload));
      console.log(`📤 Sent message to ${terminalId}:`, payload);
    } else {
      console.error(`❌ Cannot send message to ${terminalId}: WebSocket not connected`);
      throw new Error(`WebSocket not connected for terminal ${terminalId}`);
    }
  }
  
  /**
   * Add event handler
   */
  addHandler(event: string, handler: (data: any) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    this.globalHandlers.add({ event, handler });
  }
  
  /**
   * Remove event handler
   */
  removeHandler(event: string, handler: (data: any) => void): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
    
    // Remove from global handlers
    for (const globalHandler of this.globalHandlers) {
      if (globalHandler.event === event && globalHandler.handler === handler) {
        this.globalHandlers.delete(globalHandler);
        break;
      }
    }
  }
  
  /**
   * Remove all handlers for event
   */
  removeAllHandlers(event?: string): void {
    if (event) {
      this.handlers.delete(event);
      // Remove from global handlers
      for (const globalHandler of this.globalHandlers) {
        if (globalHandler.event === event) {
          this.globalHandlers.delete(globalHandler);
        }
      }
    } else {
      this.handlers.clear();
      this.globalHandlers.clear();
    }
  }
  
  /**
   * Emit event to handlers
   */
  private emit(event: string, data: any): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in handler for ${event}:`, error);
          this.emit('handler_error', { event, error: error.message || 'Handler execution failed' });
        }
      });
    }
  }
  
  /**
   * Get connection stats
   */
  getStats() {
    return {
      activeConnections: this.connections.size,
      totalHandlers: this.globalHandlers.size,
      connections: Array.from(this.connections.keys())
    };
  }
}

// Singleton instance
const wsManager = new WebSocketTerminalManager();

/**
 * WebSocket Terminal Hook - Drop-in replacement for useSSEConnectionSingleton
 * Provides identical interface for seamless component integration
 */
export const useWebSocketTerminal = (
  options: ConnectionOptions = {}
) => {
  const {
    enableRetry = true,
    maxRetryAttempts = 3,
    retryDelay = 2000,
    enableFallback = true,
    url = 'ws://localhost:3002'
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    instanceId: null,
    terminalId: null,
    connectionType: 'none',
    lastError: null,
    connectionAttempts: 0,
    lastConnectionTime: 0
  });
  
  const handlersRef = useRef<Set<EventHandler>>(new Set());
  
  // Update WebSocket manager URL if needed
  useEffect(() => {
    if (url !== wsManager.baseUrl) {
      wsManager.baseUrl = url;
    }
  }, [url]);
  
  /**
   * Connect to specific terminal instance
   * Compatible with: connectToInstance(instanceId)
   */
  const connectToInstance = useCallback(async (instanceId: string) => {
    console.log(`🔄 Connecting to terminal: ${instanceId}`);
    
    try {
      setConnectionState(prev => ({
        ...prev,
        connectionAttempts: prev.connectionAttempts + 1,
        lastConnectionTime: Date.now()
      }));

      wsManager.getConnection(instanceId);
      
      setConnectionState(prev => ({
        ...prev,
        instanceId,
        terminalId: instanceId,
        connectionType: 'websocket',
        isConnected: true,
        lastError: null,
        connectionAttempts: 0
      }));
      
      console.log(`✅ Successfully connected to ${instanceId}`);
    } catch (error: any) {
      console.error(`❌ Connection failed for ${instanceId}:`, error);
      
      setConnectionState(prev => ({
        ...prev,
        lastError: error.message || `Connection failed`,
        isConnected: false,
        connectionAttempts: 0
      }));
      
      throw error;
    }
  }, []);
  
  /**
   * Connect to terminal - alias for connectToInstance
   * Provides: connectToTerminal(terminalId)
   */
  const connectToTerminal = connectToInstance;
  
  /**
   * Disconnect from specific instance
   * Compatible with: disconnectFromInstance(instanceId?)
   */
  const disconnectFromInstance = useCallback((instanceId?: string) => {
    const targetId = instanceId || connectionState.instanceId;
    if (targetId) {
      wsManager.disconnect(targetId);
    }
    
    setConnectionState(prev => ({
      ...prev,
      instanceId: null,
      terminalId: null,
      connectionType: 'none',
      isConnected: false
    }));
  }, [connectionState.instanceId]);
  
  /**
   * Disconnect from terminal - alias for disconnectFromInstance
   * Provides: disconnectFromTerminal()
   */
  const disconnectFromTerminal = useCallback(() => {
    disconnectFromInstance();
  }, [disconnectFromInstance]);
  
  /**
   * Send command to instance
   * Compatible with: sendCommand(instanceId, command)
   */
  const sendCommand = useCallback(async (instanceId: string, command: string) => {
    if (!instanceId) {
      throw new Error('Instance ID is required to send command');
    }
    
    try {
      console.log(`📤 Sending command to ${instanceId}:`, command.substring(0, 100) + (command.length > 100 ? '...' : ''));
      
      wsManager.sendMessage(instanceId, {
        type: 'input',
        data: command + '\n',
        terminalId: instanceId
      });
      
      console.log(`✅ Command sent successfully to ${instanceId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`❌ Failed to send command to ${instanceId}:`, error);
      
      setConnectionState(prev => ({
        ...prev,
        lastError: `Command failed: ${error.message}`
      }));
      
      throw error;
    }
  }, []);
  
  /**
   * Send input - simplified version for direct use
   * Provides: send(input)
   */
  const send = useCallback((input: string) => {
    const targetId = connectionState.instanceId || connectionState.terminalId;
    if (!targetId) {
      throw new Error('No active terminal connection');
    }
    
    wsManager.sendMessage(targetId, {
      type: 'input',
      data: input + '\n'
    });
  }, [connectionState.instanceId, connectionState.terminalId]);
  
  /**
   * Add event handler
   * Compatible with: addHandler(event, handler)
   */
  const addHandler = useCallback((event: string, handler: (data: any) => void) => {
    wsManager.addHandler(event, handler);
    handlersRef.current.add({ event, handler });
  }, []);
  
  /**
   * Subscribe to event - alias for addHandler
   * Provides: subscribe(event, handler)
   */
  const subscribe = addHandler;
  
  /**
   * Remove event handler
   * Compatible with: removeHandler(event, handler)
   */
  const removeHandler = useCallback((event: string, handler: (data: any) => void) => {
    wsManager.removeHandler(event, handler);
    // Remove from local tracking
    for (const h of handlersRef.current) {
      if (h.event === event && h.handler === handler) {
        handlersRef.current.delete(h);
        break;
      }
    }
  }, []);
  
  /**
   * Unsubscribe from event - alias for removeHandler
   * Provides: unsubscribe(event, handler?)
   */
  const unsubscribe = useCallback((event: string, handler?: (data: any) => void) => {
    if (handler) {
      removeHandler(event, handler);
    } else {
      // Remove all handlers for event
      for (const h of handlersRef.current) {
        if (h.event === event) {
          wsManager.removeHandler(event, h.handler);
          handlersRef.current.delete(h);
        }
      }
    }
  }, [removeHandler]);
  
  // Setup connection state event handlers
  useEffect(() => {
    const handleConnect = (data: any) => {
      setConnectionState(prev => ({
        ...prev,
        isConnected: true,
        connectionType: 'websocket',
        lastError: null,
        instanceId: data.instanceId || data.terminalId,
        terminalId: data.terminalId || data.instanceId
      }));
    };
    
    const handleDisconnect = (data: any) => {
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        connectionType: 'none'
      }));
    };
    
    const handleError = (data: any) => {
      setConnectionState(prev => ({
        ...prev,
        lastError: data.error || 'Connection error',
        isConnected: false
      }));
    };
    
    wsManager.addHandler('connect', handleConnect);
    wsManager.addHandler('disconnect', handleDisconnect);
    wsManager.addHandler('error', handleError);
    
    return () => {
      wsManager.removeHandler('connect', handleConnect);
      wsManager.removeHandler('disconnect', handleDisconnect);
      wsManager.removeHandler('error', handleError);
    };
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove all handlers added by this hook instance
      handlersRef.current.forEach(({ event, handler }) => {
        wsManager.removeHandler(event, handler);
      });
      handlersRef.current.clear();
    };
  }, []);
  
  /**
   * Get all connections - compatibility method
   */
  const getAllConnections = useCallback(() => {
    return wsManager.getStats();
  }, []);
  
  /**
   * Get connection health status - compatibility method
   */
  const getConnectionHealth = useCallback(() => {
    const stats = wsManager.getStats();
    return {
      ...connectionState,
      ...stats,
      uptime: connectionState.lastConnectionTime > 0 ? Date.now() - connectionState.lastConnectionTime : 0,
      wsEndpoint: `${url}/terminal`
    };
  }, [url, connectionState]);

  /**
   * Test connection to specific terminal - compatibility method
   */
  const testConnection = useCallback(async (terminalId: string) => {
    try {
      // For WebSocket, we test by attempting a connection
      const ws = wsManager.getConnection(terminalId);
      return { success: true, status: { readyState: ws.readyState } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  // Expose properties for compatibility with existing component
  return {
    // Core connection methods (SSE compatibility)
    connectionState,
    connectToInstance,
    disconnectFromInstance,
    sendCommand,
    addHandler,
    removeHandler,
    isConnected: connectionState.isConnected,
    getAllConnections,
    getConnectionHealth,
    testConnection,
    
    // WebSocket-specific methods (modern interface)
    socket: connectionState.isConnected ? wsManager.connections.get(connectionState.instanceId!) : null,
    lastMessage: null, // Not directly applicable to this architecture
    connectionError: connectionState.lastError,
    connectToTerminal,
    disconnectFromTerminal,
    send,
    subscribe,
    unsubscribe,
    
    // Configuration exposure for debugging
    config: {
      url,
      enableRetry,
      maxRetryAttempts,
      enableFallback
    }
  };
};

export default useWebSocketTerminal;
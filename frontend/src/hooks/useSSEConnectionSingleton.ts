/**
 * SSE Connection Singleton Hook
 * Ensures only one SSE connection per instance to prevent duplication
 * Uses versioned API endpoints (/api/v1/) for consistency with backend
 * Includes enhanced error handling and connection recovery
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import ClaudeOutputParser, { ParsedClaudeMessage } from '../utils/claude-output-parser';
import { apiClient, APIClient } from '../config/api';

interface ConnectionState {
  isConnected: boolean;
  instanceId: string | null;
  connectionType: 'none' | 'sse' | 'polling';
  lastError: string | null;
  connectionAttempts: number;
  lastConnectionTime: number;
  apiVersion: string;
}

interface EventHandler {
  event: string;
  handler: (data: any) => void;
}

interface ConnectionOptions {
  enableRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  apiVersion?: string;
  enableFallback?: boolean;
}

class SSEConnectionManager {
  private connections: Map<string, EventSource> = new Map();
  private handlers: Map<string, Set<(data: any) => void>> = new Map();
  private globalHandlers: Set<EventHandler> = new Set();
  private apiClient: APIClient;
  
  constructor() {
    this.apiClient = apiClient;
  }

  /**
   * Get or create SSE connection for instance
   */
  getConnection(instanceId: string, baseUrl: string): EventSource {
    const existing = this.connections.get(instanceId);
    if (existing && existing.readyState !== EventSource.CLOSED) {
      console.log(`♻️ Reusing existing SSE connection for ${instanceId}`);
      return existing;
    }
    
    // Clean up old connection
    if (existing) {
      this.disconnect(instanceId);
    }
    
    // Create new connection using API client with fallback support
    const endpoint = this.apiClient.getTerminalStreamEndpoint(instanceId);
    const url = this.apiClient.getURL(endpoint);
    console.log(`🔌 Creating new SSE connection for ${instanceId}: ${url}`);
    
    const eventSource = new EventSource(url);
    this.connections.set(instanceId, eventSource);
    
    // Setup event handlers
    eventSource.onopen = () => {
      console.log(`✅ SSE connected for ${instanceId}`);
      this.emit('connect', { instanceId, connectionType: 'sse' });
    };
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 SSE message for ${instanceId}:`, data);
        
        // Parse Claude output if it's terminal data
        if (data.type === 'terminal_output' || data.type === 'output') {
          const rawOutput = data.data || data.output || '';
          if (rawOutput) {
            // Emit both raw and parsed data
            this.emit('terminal:output', {
              instanceId,
              output: rawOutput,
              parsed: ClaudeOutputParser.parseClaudeOutput(rawOutput)
            });
            
            // Also emit as message for compatibility
            this.emit('message', {
              type: 'output',
              instanceId,
              output: rawOutput,
              data: rawOutput
            });
          }
        } else {
          // Forward other message types
          this.emit('message', { ...data, instanceId });
        }
      } catch (error) {
        console.error(`❌ Error parsing SSE message for ${instanceId}:`, error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error(`❌ SSE error for ${instanceId}:`, error);
      this.emit('error', { instanceId, error: 'SSE connection failed' });
    };
    
    return eventSource;
  }
  
  /**
   * Disconnect specific instance
   */
  disconnect(instanceId: string): void {
    const connection = this.connections.get(instanceId);
    if (connection) {
      console.log(`🔌 Disconnecting SSE for ${instanceId}`);
      connection.close();
      this.connections.delete(instanceId);
      this.emit('disconnect', { instanceId });
    }
  }
  
  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    console.log(`🔌 Disconnecting all SSE connections`);
    this.connections.forEach((connection, instanceId) => {
      connection.close();
      this.emit('disconnect', { instanceId });
    });
    this.connections.clear();
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
          // Emit error event for error recovery handling
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
const sseManager = new SSEConnectionManager();

/**
 * SSE Connection Singleton Hook with Versioned API Support
 * @param baseUrl - Base URL for the API server
 * @param options - Configuration options for connection behavior
 */
export const useSSEConnectionSingleton = (
  baseUrl: string = 'http://localhost:3000',
  options: ConnectionOptions = {}
) => {
  const {
    enableRetry = true,
    maxRetryAttempts = 3,
    retryDelay = 2000,
    apiVersion = 'v1',
    enableFallback = true
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    instanceId: null,
    connectionType: 'none',
    lastError: null,
    connectionAttempts: 0,
    lastConnectionTime: 0,
    apiVersion
  });
  
  const handlersRef = useRef<Set<EventHandler>>(new Set());
  
  // Connect to specific instance with retry logic
  const connectToInstance = useCallback(async (instanceId: string) => {
    console.log(`🔄 Connecting to instance: ${instanceId}`);
    
    const attemptConnection = async (attempt: number): Promise<void> => {
      try {
        setConnectionState(prev => ({
          ...prev,
          connectionAttempts: attempt,
          lastConnectionTime: Date.now()
        }));

        sseManager.getConnection(instanceId, baseUrl);
        setConnectionState(prev => ({
          ...prev,
          instanceId,
          connectionType: 'sse',
          isConnected: true,
          lastError: null,
          connectionAttempts: 0
        }));
        
        console.log(`✅ Successfully connected to ${instanceId}`);
      } catch (error: any) {
        console.error(`❌ Connection attempt ${attempt} failed for ${instanceId}:`, error);
        
        if (enableRetry && attempt < maxRetryAttempts) {
          console.log(`⏳ Retrying connection in ${retryDelay}ms (attempt ${attempt + 1}/${maxRetryAttempts})`);
          setTimeout(() => attemptConnection(attempt + 1), retryDelay);
        } else {
          setConnectionState(prev => ({
            ...prev,
            lastError: error.message || `Connection failed after ${maxRetryAttempts} attempts`,
            isConnected: false,
            connectionAttempts: 0
          }));
          
          // Try fallback to polling if enabled
          if (enableFallback) {
            console.log(`🔄 Attempting fallback to polling for ${instanceId}`);
            setConnectionState(prev => ({
              ...prev,
              connectionType: 'polling',
              lastError: 'SSE failed, using polling fallback'
            }));
          }
        }
      }
    };

    await attemptConnection(1);
  }, [baseUrl, enableRetry, maxRetryAttempts, retryDelay, enableFallback]);
  
  // Disconnect from specific instance
  const disconnectFromInstance = useCallback((instanceId?: string) => {
    if (instanceId) {
      sseManager.disconnect(instanceId);
    } else if (connectionState.instanceId) {
      sseManager.disconnect(connectionState.instanceId);
    }
    
    setConnectionState(prev => ({
      ...prev,
      instanceId: null,
      connectionType: 'none',
      isConnected: false
    }));
  }, [connectionState.instanceId]);
  
  // Send command to instance using versioned API endpoint
  const sendCommand = useCallback(async (instanceId: string, command: string) => {
    if (!instanceId) {
      throw new Error('Instance ID is required to send command');
    }
    
    try {
      console.log(`📤 Sending command to ${instanceId}:`, command.substring(0, 100) + (command.length > 100 ? '...' : ''));
      
      const endpoint = sseManager.apiClient.getTerminalInputEndpoint(instanceId);
      const response = await sseManager.apiClient.fetchWithFallback(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ input: command + '\n' })
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to send command (${response.status}): ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json().catch(() => ({ success: true }));
      console.log(`✅ Command sent successfully to ${instanceId}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Failed to send command to ${instanceId}:`, error);
      
      // Update connection state with error
      setConnectionState(prev => ({
        ...prev,
        lastError: `Command failed: ${error.message}`
      }));
      
      throw error;
    }
  }, [baseUrl]);
  
  // Add event handler
  const addHandler = useCallback((event: string, handler: (data: any) => void) => {
    sseManager.addHandler(event, handler);
    handlersRef.current.add({ event, handler });
  }, []);
  
  // Remove event handler
  const removeHandler = useCallback((event: string, handler: (data: any) => void) => {
    sseManager.removeHandler(event, handler);
    // Remove from local tracking
    for (const h of handlersRef.current) {
      if (h.event === event && h.handler === handler) {
        handlersRef.current.delete(h);
        break;
      }
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove all handlers added by this hook instance
      handlersRef.current.forEach(({ event, handler }) => {
        sseManager.removeHandler(event, handler);
      });
      handlersRef.current.clear();
    };
  }, []);
  
  // Get all connections
  const getAllConnections = useCallback(() => {
    return sseManager.getStats();
  }, []);
  
  // Get connection health status
  const getConnectionHealth = useCallback(() => {
    const stats = sseManager.getStats();
    return {
      ...connectionState,
      ...stats,
      uptime: connectionState.lastConnectionTime > 0 ? Date.now() - connectionState.lastConnectionTime : 0,
      apiEndpoint: `${baseUrl}/api/v1/claude/instances`
    };
  }, [baseUrl, connectionState]);

  // Test connection to specific instance
  const testConnection = useCallback(async (instanceId: string) => {
    try {
      const endpoint = `${baseUrl}/api/v1/claude/instances/${instanceId}/sse/status`;
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const status = await response.json();
        return { success: true, status };
      } else {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [baseUrl]);

  return {
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
    // Expose configuration for debugging
    config: {
      baseUrl,
      apiVersion,
      enableRetry,
      maxRetryAttempts,
      enableFallback
    }
  };
};

export default useSSEConnectionSingleton;
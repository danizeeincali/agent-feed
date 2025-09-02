/**
 * SSEConnectionService - Server-Sent Events Connection Management
 * 
 * Provides robust SSE connection management with automatic reconnection,
 * error handling, and connection state tracking.
 */

export enum SSEConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  CLOSED = 'closed'
}

export interface SSEConnectionConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  maxBackoffDelay?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
}

export interface SSEConnectionInfo {
  id: string;
  url: string;
  state: SSEConnectionState;
  eventSource: EventSource | null;
  reconnectCount: number;
  lastConnected: Date | null;
  lastError: string | null;
  messageCount: number;
}

export interface SSEMessage {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  connectionId: string;
}

export type SSEMessageHandler = (message: SSEMessage) => void;
export type SSEStateChangeHandler = (state: SSEConnectionState, connectionId: string) => void;
export type SSEErrorHandler = (error: string, connectionId: string) => void;

export class SSEConnectionService {
  private connections: Map<string, SSEConnectionInfo> = new Map();
  private messageHandlers: Map<string, Set<SSEMessageHandler>> = new Map();
  private stateChangeHandlers: Set<SSEStateChangeHandler> = new Set();
  private errorHandlers: Set<SSEErrorHandler> = new Set();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private abortController: AbortController = new AbortController();

  /**
   * Create a new SSE connection
   */
  async createConnection(id: string, config: SSEConnectionConfig): Promise<void> {
    // Clean up existing connection
    if (this.connections.has(id)) {
      await this.closeConnection(id);
    }

    const connectionInfo: SSEConnectionInfo = {
      id,
      url: config.url,
      state: SSEConnectionState.CONNECTING,
      eventSource: null,
      reconnectCount: 0,
      lastConnected: null,
      lastError: null,
      messageCount: 0
    };

    this.connections.set(id, connectionInfo);
    this.notifyStateChange(SSEConnectionState.CONNECTING, id);

    try {
      await this.establishConnection(id, config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.handleConnectionError(id, errorMessage);
    }
  }

  /**
   * Close a specific connection
   */
  async closeConnection(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) return;

    // Clear reconnect timer
    const timer = this.reconnectTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(id);
    }

    // Close EventSource
    if (connection.eventSource) {
      connection.eventSource.close();
    }

    // Update state
    connection.state = SSEConnectionState.CLOSED;
    connection.eventSource = null;
    
    this.notifyStateChange(SSEConnectionState.CLOSED, id);
    
    // Remove connection
    this.connections.delete(id);
  }

  /**
   * Close all connections
   */
  async closeAllConnections(): Promise<void> {
    const connectionIds = Array.from(this.connections.keys());
    await Promise.all(connectionIds.map(id => this.closeConnection(id)));
  }

  /**
   * Get connection information
   */
  getConnection(id: string): SSEConnectionInfo | null {
    return this.connections.get(id) || null;
  }

  /**
   * Get all connections
   */
  getAllConnections(): SSEConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection health status
   */
  getHealthStatus(): {
    totalConnections: number;
    connectedCount: number;
    connectingCount: number;
    errorCount: number;
    reconnectingCount: number;
  } {
    const connections = this.getAllConnections();
    
    return {
      totalConnections: connections.length,
      connectedCount: connections.filter(c => c.state === SSEConnectionState.CONNECTED).length,
      connectingCount: connections.filter(c => c.state === SSEConnectionState.CONNECTING).length,
      errorCount: connections.filter(c => c.state === SSEConnectionState.ERROR).length,
      reconnectingCount: connections.filter(c => c.state === SSEConnectionState.RECONNECTING).length
    };
  }

  /**
   * Add message handler
   */
  onMessage(connectionId: string, handler: SSEMessageHandler): void {
    if (!this.messageHandlers.has(connectionId)) {
      this.messageHandlers.set(connectionId, new Set());
    }
    this.messageHandlers.get(connectionId)!.add(handler);
  }

  /**
   * Remove message handler
   */
  offMessage(connectionId: string, handler?: SSEMessageHandler): void {
    if (handler) {
      this.messageHandlers.get(connectionId)?.delete(handler);
    } else {
      this.messageHandlers.delete(connectionId);
    }
  }

  /**
   * Add state change handler
   */
  onStateChange(handler: SSEStateChangeHandler): void {
    this.stateChangeHandlers.add(handler);
  }

  /**
   * Remove state change handler
   */
  offStateChange(handler: SSEStateChangeHandler): void {
    this.stateChangeHandlers.delete(handler);
  }

  /**
   * Add error handler
   */
  onError(handler: SSEErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Remove error handler
   */
  offError(handler: SSEErrorHandler): void {
    this.errorHandlers.delete(handler);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.abortController.abort();
    this.abortController = new AbortController();
    
    this.closeAllConnections();
    
    this.messageHandlers.clear();
    this.stateChangeHandlers.clear();
    this.errorHandlers.clear();
    
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
  }

  /**
   * Establish EventSource connection
   */
  private async establishConnection(id: string, config: SSEConnectionConfig): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) throw new Error(`Connection ${id} not found`);

    try {
      // Create EventSource with configuration
      const eventSourceInit: EventSourceInit = {
        withCredentials: config.withCredentials || false
      };

      const eventSource = new EventSource(config.url, eventSourceInit);
      connection.eventSource = eventSource;

      // Setup event handlers
      eventSource.onopen = () => {
        console.log(`✅ SSE connection opened: ${id}`);
        connection.state = SSEConnectionState.CONNECTED;
        connection.lastConnected = new Date();
        connection.lastError = null;
        connection.reconnectCount = 0;
        
        this.notifyStateChange(SSEConnectionState.CONNECTED, id);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message: SSEMessage = {
            id: `msg-${Date.now()}-${Math.random()}`,
            type: data.type || 'message',
            data,
            timestamp: new Date(),
            connectionId: id
          };

          connection.messageCount++;
          this.notifyMessage(id, message);
          
        } catch (error) {
          console.error(`SSE message parse error for ${id}:`, error);
          this.notifyError(id, 'Message parse error');
        }
      };

      eventSource.onerror = (error) => {
        console.error(`SSE connection error for ${id}:`, error);
        this.handleConnectionError(id, 'SSE connection error');
      };

      // Handle custom event types
      eventSource.addEventListener('error', (event: any) => {
        const errorData = event.data ? JSON.parse(event.data) : {};
        this.notifyError(id, errorData.message || 'SSE error event');
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create EventSource';
      connection.lastError = errorMessage;
      connection.state = SSEConnectionState.ERROR;
      
      this.notifyError(id, errorMessage);
      this.notifyStateChange(SSEConnectionState.ERROR, id);
      
      throw error;
    }
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  private handleConnectionError(id: string, error: string): void {
    const connection = this.connections.get(id);
    if (!connection) return;

    connection.lastError = error;
    connection.state = SSEConnectionState.ERROR;
    
    this.notifyError(id, error);
    this.notifyStateChange(SSEConnectionState.ERROR, id);

    // Attempt reconnection if within limits
    const maxAttempts = 5; // Could be configurable
    if (connection.reconnectCount < maxAttempts) {
      this.scheduleReconnection(id);
    } else {
      console.error(`Max reconnection attempts reached for ${id}`);
      connection.state = SSEConnectionState.CLOSED;
      this.notifyStateChange(SSEConnectionState.CLOSED, id);
    }
  }

  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleReconnection(id: string): void {
    const connection = this.connections.get(id);
    if (!connection) return;

    connection.state = SSEConnectionState.RECONNECTING;
    connection.reconnectCount++;
    
    this.notifyStateChange(SSEConnectionState.RECONNECTING, id);

    // Calculate exponential backoff
    const baseDelay = 2000; // 2 seconds
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, connection.reconnectCount - 1), maxDelay);

    console.log(`Scheduling reconnection for ${id} in ${delay}ms (attempt ${connection.reconnectCount})`);

    const timer = setTimeout(async () => {
      try {
        const originalConfig = { url: connection.url }; // Recreate config
        await this.establishConnection(id, originalConfig);
      } catch (error) {
        console.error(`Reconnection failed for ${id}:`, error);
        // Error handling will trigger another reconnection attempt if within limits
      }
    }, delay);

    this.reconnectTimers.set(id, timer);
  }

  /**
   * Notify message handlers
   */
  private notifyMessage(connectionId: string, message: SSEMessage): void {
    const handlers = this.messageHandlers.get(connectionId);
    handlers?.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`Message handler error for ${connectionId}:`, error);
      }
    });
  }

  /**
   * Notify state change handlers
   */
  private notifyStateChange(state: SSEConnectionState, connectionId: string): void {
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(state, connectionId);
      } catch (error) {
        console.error(`State change handler error for ${connectionId}:`, error);
      }
    });
  }

  /**
   * Notify error handlers
   */
  private notifyError(connectionId: string, error: string): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error, connectionId);
      } catch (error) {
        console.error(`Error handler error for ${connectionId}:`, error);
      }
    });
  }
}

// Singleton instance
let sseConnectionService: SSEConnectionService | null = null;

export const getSSEConnectionService = (): SSEConnectionService => {
  if (!sseConnectionService) {
    sseConnectionService = new SSEConnectionService();
  }
  return sseConnectionService;
};

export default SSEConnectionService;
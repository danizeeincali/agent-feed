/**
 * SSEConnectionManager - EventSource-based Real-time Connection Manager
 * 
 * SPARC Phase 3: Architecture implementation for WebSocket to SSE migration
 * Replaces WebSocket-based SingleConnectionManager with EventSource pattern
 * for real-time Claude instance terminal interaction.
 */

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface SSEMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface ConnectionConfig {
  instanceId: string;
  baseUrl: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxBackoffDelay?: number;
  heartbeatTimeout?: number;
}

export interface ConnectionStatus {
  state: ConnectionState;
  instanceId: string | null;
  connectionType: 'sse' | 'none';
  lastActivity: Date | null;
  reconnectAttempts: number;
  error: string | null;
}

export class SSEConnectionManager {
  private eventSource: EventSource | null = null;
  private config: ConnectionConfig;
  private connectionStatus: ConnectionStatus;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private lastHeartbeat: Date = new Date();

  constructor(config: ConnectionConfig) {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      maxBackoffDelay: 30000,
      heartbeatTimeout: 60000,
      ...config
    };
    
    this.connectionStatus = {
      state: ConnectionState.DISCONNECTED,
      instanceId: null,
      connectionType: 'none',
      lastActivity: null,
      reconnectAttempts: 0,
      error: null
    };
  }

  /**
   * Connect to Claude instance via SSE terminal stream
   */
  async connect(): Promise<void> {
    try {
      // Validate instance ID format
      if (!this.validateInstanceId(this.config.instanceId)) {
        throw new Error(`Invalid instance ID format: ${this.config.instanceId}`);
      }

      // Validate instance exists and is running or starting
      const instanceStatus = await this.validateInstance(this.config.instanceId);
      if (!instanceStatus || (instanceStatus.status !== 'running' && instanceStatus.status !== 'starting')) {
        throw new Error(`Instance ${this.config.instanceId} is not running or does not exist`);
      }

      this.updateConnectionState(ConnectionState.CONNECTING);
      
      // Clean up existing connection
      this.cleanup();

      const sseUrl = `${this.config.baseUrl}/api/v1/claude/instances/${this.config.instanceId}/terminal/stream`;
      console.log(`[SSEConnectionManager] Connecting to: ${sseUrl}`);

      this.eventSource = new EventSource(sseUrl, {
        withCredentials: false
      });

      this.setupEventSourceHandlers();
      this.startHeartbeatMonitoring();

    } catch (error) {
      this.handleConnectionError(error instanceof Error ? error : new Error('Connection failed'));
      throw error;
    }
  }

  /**
   * Disconnect from current instance
   */
  disconnect(): void {
    console.log('[SSEConnectionManager] Disconnecting...');
    
    this.cleanup();
    this.updateConnectionState(ConnectionState.DISCONNECTED);
    this.emit('disconnect', { instanceId: this.config.instanceId });
  }

  /**
   * Send command to Claude instance via HTTP POST
   */
  async sendCommand(command: string): Promise<void> {
    if (this.connectionStatus.state !== ConnectionState.CONNECTED) {
      throw new Error('Not connected to instance');
    }

    if (!command.trim()) {
      throw new Error('Command cannot be empty');
    }

    try {
      const inputEndpoint = `${this.config.baseUrl}/api/v1/claude/instances/${this.config.instanceId}/terminal/input`;
      
      const response = await fetch(inputEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: command + '\n'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send command');
      }

      // Update last activity
      this.connectionStatus.lastActivity = new Date();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send command';
      console.error('[SSEConnectionManager] Send command error:', errorMessage);
      this.emit('error', { error: errorMessage, type: 'command_send' });
      throw error;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Event listener management
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off(event: string, listener?: Function): void {
    if (listener) {
      this.eventListeners.get(event)?.delete(listener);
    } else {
      this.eventListeners.delete(event);
    }
  }

  /**
   * Setup EventSource event handlers
   */
  private setupEventSourceHandlers(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      console.log('[SSEConnectionManager] SSE connection established');
      this.connectionStatus.reconnectAttempts = 0;
      this.updateConnectionState(ConnectionState.CONNECTED);
      this.emit('connect', {
        instanceId: this.config.instanceId,
        connectionType: 'sse'
      });
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleSSEMessage(data);
      } catch (error) {
        console.error('[SSEConnectionManager] Message parsing error:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.warn('[SSEConnectionManager] SSE error:', error);
      
      if (this.eventSource?.readyState === EventSource.CONNECTING) {
        console.log('[SSEConnectionManager] Connection in progress, waiting...');
        return;
      }
      
      this.handleConnectionError(new Error('SSE connection error'));
    };
  }

  /**
   * Handle incoming SSE messages
   */
  private handleSSEMessage(data: any): void {
    // Update last activity timestamp
    this.connectionStatus.lastActivity = new Date();
    this.lastHeartbeat = new Date();

    const message: SSEMessage = {
      type: data.type || 'unknown',
      data,
      timestamp: data.timestamp || new Date().toISOString()
    };

    // Route messages based on type
    switch (data.type) {
      case 'output':
        if (data.isReal && data.data) {
          this.emit('terminal:output', {
            output: data.data,
            instanceId: data.instanceId || this.config.instanceId,
            isReal: true,
            timestamp: data.timestamp
          });
        }
        break;

      case 'terminal_output':
        if (data.isReal && data.output) {
          this.emit('terminal:output', {
            output: data.output,
            instanceId: data.instanceId || this.config.instanceId,
            isReal: true,
            timestamp: data.timestamp
          });
        }
        break;

      case 'instance:status':
      case 'status_update':
        this.emit('instance:status', {
          instanceId: data.instanceId || this.config.instanceId,
          status: data.status,
          timestamp: data.timestamp
        });
        break;

      case 'heartbeat':
        // Heartbeat received - connection is healthy
        break;

      case 'connected':
        console.log('[SSEConnectionManager] Backend confirmed connection');
        break;

      default:
        // Generic message handler
        this.emit('message', data);
    }

    // Always emit raw message for debugging
    this.emit('raw_message', message);
  }

  /**
   * Handle connection errors and implement reconnection logic
   */
  private handleConnectionError(error: Error): void {
    console.error('[SSEConnectionManager] Connection error:', error.message);
    
    this.connectionStatus.error = error.message;
    this.updateConnectionState(ConnectionState.ERROR);
    
    this.emit('error', {
      error: error.message,
      instanceId: this.config.instanceId,
      reconnectAttempts: this.connectionStatus.reconnectAttempts
    });

    // Attempt reconnection if within limits
    if (this.connectionStatus.reconnectAttempts < this.config.maxReconnectAttempts!) {
      this.attemptReconnection();
    } else {
      console.error('[SSEConnectionManager] Max reconnection attempts reached');
      this.updateConnectionState(ConnectionState.ERROR);
      this.emit('max_reconnect_reached', {
        instanceId: this.config.instanceId,
        attempts: this.connectionStatus.reconnectAttempts
      });
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    this.connectionStatus.reconnectAttempts++;
    const delay = this.calculateBackoffDelay(this.connectionStatus.reconnectAttempts);
    
    console.log(`[SSEConnectionManager] Reconnecting in ${delay}ms (attempt ${this.connectionStatus.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    this.updateConnectionState(ConnectionState.RECONNECTING);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[SSEConnectionManager] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponential = this.config.reconnectDelay! * Math.pow(2, attempt - 1);
    const withJitter = exponential + Math.random() * 1000;
    return Math.min(withJitter, this.config.maxBackoffDelay!);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
      
      if (timeSinceLastHeartbeat > this.config.heartbeatTimeout!) {
        console.warn('[SSEConnectionManager] Heartbeat timeout - connection may be stale');
        this.emit('heartbeat_timeout', {
          instanceId: this.config.instanceId,
          lastHeartbeat: this.lastHeartbeat
        });
      }
    }, this.config.heartbeatTimeout! / 2);
  }

  /**
   * Validate instance ID format
   */
  private validateInstanceId(instanceId: string): boolean {
    return /^claude-[a-zA-Z0-9]+$/.test(instanceId);
  }

  /**
   * Validate that instance exists and is running
   */
  private async validateInstance(instanceId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/claude/instances`);
      const data = await response.json();
      if (data.success && data.instances) {
        return data.instances.find((instance: any) => instance.id === instanceId) || null;
      }
      return null;
    } catch (error) {
      console.error('[SSEConnectionManager] Instance validation error:', error);
      return null;
    }
  }

  /**
   * Update connection state and emit state change event
   */
  private updateConnectionState(state: ConnectionState): void {
    const previousState = this.connectionStatus.state;
    this.connectionStatus.state = state;
    
    if (state === ConnectionState.CONNECTED) {
      this.connectionStatus.connectionType = 'sse';
      this.connectionStatus.error = null;
    } else if (state === ConnectionState.DISCONNECTED) {
      this.connectionStatus.connectionType = 'none';
      this.connectionStatus.instanceId = null;
    }

    if (previousState !== state) {
      this.emit('state_change', {
        previousState,
        currentState: state,
        instanceId: this.config.instanceId
      });
    }
  }

  /**
   * Emit event to all registered listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`[SSEConnectionManager] Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup resources and connections
   */
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Complete cleanup when manager is destroyed
   */
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
  }
}

// Factory function for creating SSE connection manager
export const createSSEConnectionManager = (config: ConnectionConfig): SSEConnectionManager => {
  return new SSEConnectionManager(config);
};
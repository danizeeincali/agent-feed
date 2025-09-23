export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting', 
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error'
}

export interface ConnectionConfig {
  url: string;
  instanceId: string;
  onMessage?: (data: any) => void;
  onStateChange?: (state: ConnectionState, instanceId: string) => void;
  onError?: (error: Error, instanceId: string) => void;
}

export interface ConnectionInfo {
  instanceId: string;
  state: ConnectionState;
  websocket?: WebSocket;
  config: ConnectionConfig;
  connectTime?: number;
  lastActivity?: number;
  error?: Error;
}

/**
 * SingleConnectionManager implements a safety-first WebSocket connection manager
 * that ensures only one connection is active at a time with proper state management
 * and race condition prevention.
 */
export class SingleConnectionManager {
  private static instance: SingleConnectionManager;
  private currentConnection: ConnectionInfo | null = null;
  private connectionLock: boolean = false;
  private stateChangeListeners: Set<(state: ConnectionState, instanceId: string) => void> = new Set();
  private connectionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {}

  static getInstance(): SingleConnectionManager {
    if (!SingleConnectionManager.instance) {
      SingleConnectionManager.instance = new SingleConnectionManager();
    }
    return SingleConnectionManager.instance;
  }

  /**
   * Adds a global state change listener
   */
  addStateChangeListener(listener: (state: ConnectionState, instanceId: string) => void): void {
    this.stateChangeListeners.add(listener);
  }

  /**
   * Removes a global state change listener
   */
  removeStateChangeListener(listener: (state: ConnectionState, instanceId: string) => void): void {
    this.stateChangeListeners.delete(listener);
  }

  /**
   * Gets the current connection info
   */
  getCurrentConnection(): ConnectionInfo | null {
    return this.currentConnection;
  }

  /**
   * Gets connection state for a specific instance
   */
  getConnectionState(instanceId: string): ConnectionState {
    if (!this.currentConnection) {
      return ConnectionState.DISCONNECTED;
    }
    return this.currentConnection.instanceId === instanceId 
      ? this.currentConnection.state 
      : ConnectionState.DISCONNECTED;
  }

  /**
   * Checks if connection lock is active
   */
  isLocked(): boolean {
    return this.connectionLock;
  }

  /**
   * Safety-first connection: disconnect existing connection before establishing new one
   */
  async connect(config: ConnectionConfig): Promise<void> {
    // Prevent race conditions
    if (this.connectionLock) {
      throw new Error('Connection operation already in progress');
    }

    this.connectionLock = true;

    try {
      // SAFETY FIRST: Disconnect existing connection if any
      if (this.currentConnection) {
        console.log(`[SingleConnectionManager] Disconnecting existing connection (${this.currentConnection.instanceId}) before connecting to ${config.instanceId}`);
        await this.forceDisconnect();
      }

      // Set connecting state
      this.currentConnection = {
        instanceId: config.instanceId,
        state: ConnectionState.CONNECTING,
        config,
        connectTime: Date.now()
      };

      this.notifyStateChange(ConnectionState.CONNECTING, config.instanceId);

      // Set connection timeout (30 seconds max, 15 second warning)
      this.setConnectionTimeout(config.instanceId);

      // Create WebSocket connection
      const websocket = new WebSocket(config.url);
      this.currentConnection.websocket = websocket;

      // Set up event handlers
      websocket.onopen = () => {
        if (this.currentConnection?.instanceId === config.instanceId) {
          this.currentConnection.state = ConnectionState.CONNECTED;
          this.currentConnection.lastActivity = Date.now();
          this.clearConnectionTimeout(config.instanceId);
          this.notifyStateChange(ConnectionState.CONNECTED, config.instanceId);
          console.log(`[SingleConnectionManager] Connected to ${config.instanceId}`);
        }
      };

      websocket.onmessage = (event) => {
        if (this.currentConnection?.instanceId === config.instanceId) {
          this.currentConnection.lastActivity = Date.now();
          try {
            const data = JSON.parse(event.data);
            config.onMessage?.(data);
          } catch (error) {
            console.error(`[SingleConnectionManager] Failed to parse message:`, error);
          }
        }
      };

      websocket.onerror = (event) => {
        const error = new Error(`WebSocket error for ${config.instanceId}`);
        console.error(`[SingleConnectionManager] WebSocket error:`, error);
        
        if (this.currentConnection?.instanceId === config.instanceId) {
          this.currentConnection.state = ConnectionState.ERROR;
          this.currentConnection.error = error;
          this.clearConnectionTimeout(config.instanceId);
          this.notifyStateChange(ConnectionState.ERROR, config.instanceId);
          config.onError?.(error, config.instanceId);
        }
      };

      websocket.onclose = (event) => {
        console.log(`[SingleConnectionManager] WebSocket closed for ${config.instanceId}:`, event.code, event.reason);
        
        if (this.currentConnection?.instanceId === config.instanceId) {
          this.clearConnectionTimeout(config.instanceId);
          
          if (this.currentConnection.state !== ConnectionState.DISCONNECTING) {
            // Unexpected closure
            this.currentConnection.state = ConnectionState.ERROR;
            this.currentConnection.error = new Error(`Connection unexpectedly closed (code: ${event.code})`);
            this.notifyStateChange(ConnectionState.ERROR, config.instanceId);
          } else {
            // Expected closure
            this.currentConnection = null;
            this.notifyStateChange(ConnectionState.DISCONNECTED, config.instanceId);
          }
        }
      };

    } catch (error) {
      console.error(`[SingleConnectionManager] Connection failed:`, error);
      
      if (this.currentConnection?.instanceId === config.instanceId) {
        this.currentConnection.state = ConnectionState.ERROR;
        this.currentConnection.error = error as Error;
        this.clearConnectionTimeout(config.instanceId);
        this.notifyStateChange(ConnectionState.ERROR, config.instanceId);
        config.onError?.(error as Error, config.instanceId);
      }
      
      throw error;
    } finally {
      this.connectionLock = false;
    }
  }

  /**
   * Graceful disconnect with proper state management
   */
  async disconnect(instanceId: string): Promise<void> {
    if (this.connectionLock) {
      throw new Error('Connection operation already in progress');
    }

    if (!this.currentConnection || this.currentConnection.instanceId !== instanceId) {
      console.warn(`[SingleConnectionManager] No active connection for ${instanceId}`);
      return;
    }

    this.connectionLock = true;

    try {
      this.currentConnection.state = ConnectionState.DISCONNECTING;
      this.notifyStateChange(ConnectionState.DISCONNECTING, instanceId);

      if (this.currentConnection.websocket) {
        // Set a timeout for graceful closure
        const closeTimeout = setTimeout(() => {
          if (this.currentConnection?.websocket) {
            console.warn(`[SingleConnectionManager] Force closing WebSocket for ${instanceId}`);
            this.currentConnection.websocket.close();
          }
        }, 5000);

        // Close WebSocket gracefully
        this.currentConnection.websocket.close(1000, 'Normal closure');
        
        // Wait for close event or timeout
        await new Promise<void>((resolve) => {
          if (!this.currentConnection?.websocket) {
            clearTimeout(closeTimeout);
            resolve();
            return;
          }

          const originalOnClose = this.currentConnection.websocket.onclose;
          this.currentConnection.websocket.onclose = (event) => {
            clearTimeout(closeTimeout);
            if (originalOnClose) {
              originalOnClose(event);
            }
            resolve();
          };
        });
      }

      this.currentConnection = null;
      this.notifyStateChange(ConnectionState.DISCONNECTED, instanceId);

    } catch (error) {
      console.error(`[SingleConnectionManager] Disconnect failed:`, error);
      throw error;
    } finally {
      this.connectionLock = false;
    }
  }

  /**
   * Force disconnect without waiting for graceful closure
   */
  private async forceDisconnect(): Promise<void> {
    if (!this.currentConnection) return;

    const instanceId = this.currentConnection.instanceId;
    console.log(`[SingleConnectionManager] Force disconnecting ${instanceId}`);

    this.clearConnectionTimeout(instanceId);

    if (this.currentConnection.websocket) {
      this.currentConnection.websocket.onopen = null;
      this.currentConnection.websocket.onmessage = null;
      this.currentConnection.websocket.onerror = null;
      this.currentConnection.websocket.onclose = null;
      this.currentConnection.websocket.close();
    }

    this.currentConnection = null;
    this.notifyStateChange(ConnectionState.DISCONNECTED, instanceId);
  }

  /**
   * Send data through current connection
   */
  sendData(data: any, instanceId: string): boolean {
    if (!this.currentConnection || 
        this.currentConnection.instanceId !== instanceId ||
        this.currentConnection.state !== ConnectionState.CONNECTED ||
        !this.currentConnection.websocket) {
      console.warn(`[SingleConnectionManager] Cannot send data - no active connection for ${instanceId}`);
      return false;
    }

    try {
      this.currentConnection.websocket.send(JSON.stringify(data));
      this.currentConnection.lastActivity = Date.now();
      return true;
    } catch (error) {
      console.error(`[SingleConnectionManager] Failed to send data:`, error);
      return false;
    }
  }

  /**
   * Set connection timeout with warning at 15s and max at 30s
   */
  private setConnectionTimeout(instanceId: string): void {
    // Clear any existing timeout
    this.clearConnectionTimeout(instanceId);

    // Set warning timeout (15 seconds)
    const warningTimeout = setTimeout(() => {
      console.warn(`[SingleConnectionManager] Connection taking longer than expected for ${instanceId}`);
    }, 15000);

    // Set max timeout (30 seconds)
    const maxTimeout = setTimeout(() => {
      console.error(`[SingleConnectionManager] Connection timeout for ${instanceId}`);
      if (this.currentConnection?.instanceId === instanceId) {
        const error = new Error('Connection timeout');
        this.currentConnection.state = ConnectionState.ERROR;
        this.currentConnection.error = error;
        this.notifyStateChange(ConnectionState.ERROR, instanceId);
        this.currentConnection.config.onError?.(error, instanceId);
        this.forceDisconnect();
      }
    }, 30000);

    this.connectionTimeouts.set(instanceId, maxTimeout);
    this.connectionTimeouts.set(`${instanceId}_warning`, warningTimeout);
  }

  /**
   * Clear connection timeouts
   */
  private clearConnectionTimeout(instanceId: string): void {
    const timeout = this.connectionTimeouts.get(instanceId);
    const warningTimeout = this.connectionTimeouts.get(`${instanceId}_warning`);
    
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(instanceId);
    }
    
    if (warningTimeout) {
      clearTimeout(warningTimeout);
      this.connectionTimeouts.delete(`${instanceId}_warning`);
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyStateChange(state: ConnectionState, instanceId: string): void {
    console.log(`[SingleConnectionManager] State change: ${instanceId} -> ${state}`);
    
    // Notify global listeners
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(state, instanceId);
      } catch (error) {
        console.error(`[SingleConnectionManager] State change listener error:`, error);
      }
    });

    // Notify instance-specific listener
    if (this.currentConnection?.config.onStateChange) {
      try {
        this.currentConnection.config.onStateChange(state, instanceId);
      } catch (error) {
        console.error(`[SingleConnectionManager] Instance state change listener error:`, error);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    isConnected: boolean;
    instanceId: string | null;
    connectionTime: number | null;
    lastActivity: number | null;
    state: ConnectionState;
  } {
    if (!this.currentConnection) {
      return {
        isConnected: false,
        instanceId: null,
        connectionTime: null,
        lastActivity: null,
        state: ConnectionState.DISCONNECTED
      };
    }

    return {
      isConnected: this.currentConnection.state === ConnectionState.CONNECTED,
      instanceId: this.currentConnection.instanceId,
      connectionTime: this.currentConnection.connectTime || null,
      lastActivity: this.currentConnection.lastActivity || null,
      state: this.currentConnection.state
    };
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    if (this.currentConnection) {
      this.forceDisconnect();
    }
    
    this.connectionTimeouts.forEach((timeout, key) => {
      clearTimeout(timeout);
    });
    this.connectionTimeouts.clear();
    
    this.stateChangeListeners.clear();
  }
}
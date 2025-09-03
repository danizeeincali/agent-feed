/**
 * SSEClaudeInstanceManager - HTTP+SSE Based Claude Instance Control
 * 
 * This manager provides real-time interactive control of individual Claude instances
 * through Server-Sent Events (SSE) and HTTP POST requests. It replaces WebSocket
 * connections with a more robust HTTP-based approach.
 * 
 * Key Features:
 * - HTTP+SSE real-time interaction
 * - EventSource for streaming terminal output
 * - HTTP POST for command input
 * - Automatic reconnection and fallback logic
 * - Connection state machine management
 * - Resource cleanup and error handling
 */

// Remove WebSocket dependency - using SSE/HTTP only
// import { SingleConnectionManager, ConnectionState, ConnectionConfig } from '../services/SingleConnectionManager';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface SSEClaudeInstanceConfig {
  instanceId?: string;
  name?: string;
  apiUrl: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxBackoffDelay?: number;
}

export interface SSEConnectionInfo {
  instanceId: string;
  eventSource: EventSource | null;
  state: ConnectionState;
  reconnectCount: number;
  lastActivity: Date;
}

export interface InstanceOutputMessage {
  id: string;
  instanceId: string;
  type: 'output' | 'input' | 'error' | 'system';
  content: string;
  timestamp: Date;
  isReal?: boolean;
}

export interface InstanceConnection {
  instanceId: string;
  state: ConnectionState;
  lastActivity: Date;
  messageCount: number;
  reconnectAttempts: number;
  connectionType: 'sse' | 'polling' | 'none';
  errorCount: number;
}

export interface SSEMessage {
  type: string;
  data: any;
  instanceId?: string;
  timestamp: string;
  isReal?: boolean;
}

export interface CommandResponse {
  success: boolean;
  message?: string;
  error?: string;
  instanceId: string;
}

export class SSEClaudeInstanceManager {
  private config: SSEClaudeInstanceConfig;
  private connections: Map<string, SSEConnectionInfo> = new Map();
  private outputBuffer: Map<string, InstanceOutputMessage[]> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private connectionStats: Map<string, InstanceConnection> = new Map();
  private abortController: AbortController = new AbortController();

  constructor(config: SSEClaudeInstanceConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectInterval: 2000,
      maxBackoffDelay: 30000,
      ...config
    };
  }

  /**
   * Connect to a specific Claude instance using SSE
   */
  async connectToInstance(instanceId: string): Promise<void> {
    if (!instanceId || !/^claude-[a-zA-Z0-9]+$/.test(instanceId)) {
      throw new Error(`Invalid instance ID format: ${instanceId}`);
    }

    try {
      // Validate instance exists and is running or starting
      const instanceStatus = await this.validateInstance(instanceId);
      if (!instanceStatus || (instanceStatus.status !== 'running' && instanceStatus.status !== 'starting')) {
        throw new Error(`Instance ${instanceId} is not running or does not exist`);
      }

      // Close existing connection if any
      await this.disconnectFromInstance(instanceId);

      // Create SSE connection
      const sseUrl = `${this.config.apiUrl}/api/claude/instances/${instanceId}/terminal/stream`;
      const eventSource = new EventSource(sseUrl, {
        withCredentials: false
      });

      // Setup connection info
      const connectionInfo: SSEConnectionInfo = {
        instanceId,
        eventSource,
        state: ConnectionState.CONNECTING,
        reconnectCount: 0,
        lastActivity: new Date()
      };

      this.connections.set(instanceId, connectionInfo);
      this.setupEventSourceHandlers(connectionInfo);

      // Initialize connection stats
      this.connectionStats.set(instanceId, {
        instanceId,
        state: ConnectionState.CONNECTING,
        lastActivity: new Date(),
        messageCount: 0,
        reconnectAttempts: 0,
        connectionType: 'sse',
        errorCount: 0
      });

    } catch (error) {
      this.updateConnectionState(instanceId, ConnectionState.ERROR);
      throw new Error(`Failed to connect to instance ${instanceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from specific instance
   */
  async disconnectFromInstance(instanceId?: string): Promise<void> {
    const instancesToDisconnect = instanceId 
      ? [instanceId] 
      : Array.from(this.connections.keys());

    for (const id of instancesToDisconnect) {
      try {
        const connection = this.connections.get(id);
        if (connection) {
          // Close EventSource
          if (connection.eventSource) {
            connection.eventSource.close();
          }

          // Clear reconnect timer
          const timer = this.reconnectTimers.get(id);
          if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(id);
          }

          // Clean up connection info
          this.connections.delete(id);
          this.connectionStats.delete(id);

          this.emit('instance:disconnected', { instanceId: id });
        }
      } catch (error) {
        console.error(`Failed to disconnect from instance ${id}:`, error);
      }
    }
  }

  /**
   * Send command to instance via HTTP POST
   */
  async sendCommand(instanceId: string, command: string): Promise<CommandResponse> {
    if (!instanceId || !/^claude-[a-zA-Z0-9]+$/.test(instanceId)) {
      throw new Error(`Invalid instance ID format: ${instanceId}`);
    }

    const connection = this.connections.get(instanceId);
    if (!connection || connection.state !== ConnectionState.CONNECTED) {
      throw new Error(`Not connected to instance ${instanceId}`);
    }

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/claude/instances/${instanceId}/terminal/input`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ input: command + '\n' }),
          signal: this.abortController.signal
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Add input to output buffer
      this.addToOutputBuffer(instanceId, {
        id: `input-${Date.now()}`,
        instanceId,
        type: 'input',
        content: `> ${command}\n`,
        timestamp: new Date(),
        isReal: true
      });

      this.updateConnectionStats(instanceId);
      
      return {
        success: true,
        instanceId,
        message: result.message
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command failed';
      return {
        success: false,
        instanceId,
        error: errorMessage
      };
    }
  }

  /**
   * Get output for specific instance
   */
  getInstanceOutput(instanceId: string, limit?: number): InstanceOutputMessage[] {
    const output = this.outputBuffer.get(instanceId) || [];
    return limit ? output.slice(-limit) : output;
  }

  /**
   * Get connection status for all instances
   */
  getConnectionStatus(instanceId?: string): {
    isConnected: boolean;
    instanceId: string | null;
    state: ConnectionState;
    connectionStats: InstanceConnection | null;
    allConnections?: Map<string, InstanceConnection>;
  } {
    if (instanceId) {
      const stats = this.connectionStats.get(instanceId);
      const connection = this.connections.get(instanceId);
      
      return {
        isConnected: connection?.state === ConnectionState.CONNECTED,
        instanceId,
        state: connection?.state || ConnectionState.DISCONNECTED,
        connectionStats: stats || null
      };
    }
    
    // Return first connected instance or overall status
    const connectedInstance = Array.from(this.connections.entries())
      .find(([_, conn]) => conn.state === ConnectionState.CONNECTED);
    
    return {
      isConnected: !!connectedInstance,
      instanceId: connectedInstance?.[0] || null,
      state: connectedInstance?.[1]?.state || ConnectionState.DISCONNECTED,
      connectionStats: connectedInstance ? this.connectionStats.get(connectedInstance[0]) || null : null,
      allConnections: this.connectionStats
    };
  }

  /**
   * Get list of available instances
   */
  async getAvailableInstances(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/claude/instances`, {
        signal: this.abortController.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.success ? data.instances.map((i: any) => i.id) : [];
      
    } catch (error) {
      console.error('Failed to fetch available instances:', error);
      return [];
    }
  }

  /**
   * Clear output buffer for instance
   */
  clearInstanceOutput(instanceId: string): void {
    this.outputBuffer.delete(instanceId);
    this.emit('output:cleared', { instanceId });
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

  off(event: string, listener: Function): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Event listener error for ${event}:`, error);
      }
    });
  }

  /**
   * Setup EventSource event handlers
   */
  private setupEventSourceHandlers(connectionInfo: SSEConnectionInfo): void {
    const { instanceId, eventSource } = connectionInfo;
    
    if (!eventSource) return;

    eventSource.onopen = () => {
      console.log(`✅ SSE connected to instance: ${instanceId}`);
      this.updateConnectionState(instanceId, ConnectionState.CONNECTED);
      connectionInfo.reconnectCount = 0;
      this.emit('instance:connected', { instanceId });
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleSSEMessage(instanceId, data);
        this.updateLastActivity(instanceId);
      } catch (error) {
        console.error(`SSE message parse error for ${instanceId}:`, error);
      }
    };

    eventSource.onerror = (error) => {
      console.error(`SSE error for ${instanceId}:`, error);
      this.handleSSEError(instanceId, error);
    };
  }

  /**
   * Handle incoming SSE messages
   */
  private handleSSEMessage(instanceId: string, data: any): void {
    // SWARM DEBUG: Comprehensive message reception logging
    console.log(`🔍 SWARM FRONTEND: Received SSE message for ${instanceId}`);
    console.log(`   Raw data:`, data);
    console.log(`   Data type: ${data.type}`);
    console.log(`   Data content: ${data.data || data.output ? (data.data || data.output).substring(0, 100) + '...' : 'null'}`);
    console.log(`   Instance ID match: ${data.instanceId || instanceId}`);
    console.log(`   Is real: ${data.isReal}`);
    
    const message: SSEMessage = {
      type: data.type || 'output',
      data: data.data || data.output,
      instanceId: data.instanceId || instanceId,
      timestamp: data.timestamp || new Date().toISOString(),
      isReal: data.isReal !== false // Default to true unless explicitly false
    };
    
    console.log(`🔍 SWARM FRONTEND: Processed message:`, message);

    // Handle different message types
    switch (message.type) {
      case 'output':
      case 'terminal_output':
      case 'terminal:output':
        console.log(`🔍 SWARM FRONTEND: Processing output message for ${instanceId}`);
        console.log(`   Has data: ${!!message.data}`);
        console.log(`   Is real: ${message.isReal}`);
        
        if (message.data && message.isReal) {
          console.log(`✅ SWARM FRONTEND: Adding to output buffer and emitting event`);
          
          this.addToOutputBuffer(instanceId, {
            id: `output-${Date.now()}`,
            instanceId,
            type: 'output',
            content: message.data,
            timestamp: new Date(message.timestamp),
            isReal: message.isReal
          });

          this.emit('instance:output', {
            instanceId,
            content: message.data,
            isReal: message.isReal,
            timestamp: message.timestamp
          });
        } else {
          console.warn(`❌ SWARM FRONTEND: Message not processed - data: ${!!message.data}, isReal: ${message.isReal}`);
        }
        break;
        
      case 'status':
      case 'instance:status':
        this.emit('instance:status', {
          instanceId,
          status: data.status,
          timestamp: message.timestamp
        });
        break;
        
      case 'error':
        this.emit('instance:error', {
          instanceId,
          error: data.error || data.message,
          timestamp: message.timestamp
        });
        break;
        
      case 'heartbeat':
        // Just update activity timestamp
        break;
        
      default:
        console.debug(`Unknown SSE message type: ${message.type}`, data);
    }

    this.updateConnectionStats(instanceId);
  }

  /**
   * Handle SSE connection errors
   */
  private handleSSEError(instanceId: string, error: Event): void {
    const connection = this.connections.get(instanceId);
    if (!connection) return;

    console.error(`SSE connection error for ${instanceId}:`, error);
    
    this.updateConnectionState(instanceId, ConnectionState.ERROR);
    this.emit('instance:error', { instanceId, error: 'SSE connection error' });

    // Attempt reconnection if configured
    if (connection.reconnectCount < (this.config.reconnectAttempts || 5)) {
      this.scheduleReconnection(instanceId);
    } else {
      console.error(`Max reconnection attempts reached for ${instanceId}`);
      this.emit('instance:max_reconnects_reached', { instanceId });
    }
  }

  /**
   * Update connection state
   */
  private updateConnectionState(instanceId: string, state: ConnectionState): void {
    const connection = this.connections.get(instanceId);
    if (connection) {
      connection.state = state;
      connection.lastActivity = new Date();
    }

    const stats = this.connectionStats.get(instanceId);
    if (stats) {
      stats.state = state;
      stats.lastActivity = new Date();
      if (state === ConnectionState.ERROR) {
        stats.errorCount++;
      }
    }

    this.emit('connection:state_change', { instanceId, state });
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(instanceId: string): void {
    const connection = this.connections.get(instanceId);
    if (connection) {
      connection.lastActivity = new Date();
    }

    const stats = this.connectionStats.get(instanceId);
    if (stats) {
      stats.lastActivity = new Date();
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(instanceId: string): void {
    const connection = this.connections.get(instanceId);
    if (!connection) return;

    connection.reconnectCount++;
    this.updateConnectionState(instanceId, ConnectionState.RECONNECTING);

    // Calculate exponential backoff
    const baseDelay = this.config.reconnectInterval || 2000;
    const delay = Math.min(
      baseDelay * Math.pow(2, connection.reconnectCount - 1),
      this.config.maxBackoffDelay || 30000
    );

    console.log(`Scheduling reconnection for ${instanceId} in ${delay}ms (attempt ${connection.reconnectCount})`);

    const timer = setTimeout(async () => {
      try {
        console.log(`Attempting reconnection to ${instanceId}`);
        await this.connectToInstance(instanceId);
      } catch (error) {
        console.error(`Reconnection failed for ${instanceId}:`, error);
      }
    }, delay);

    this.reconnectTimers.set(instanceId, timer);
  }

  /**
   * Validate instance exists and is accessible
   */
  private async validateInstance(instanceId: string): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/claude/instances`);
      const data = await response.json();
      if (data.success && data.instances) {
        return data.instances.find((instance: any) => instance.id === instanceId) || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to validate instance:', error);
      return null;
    }
  }

  /**
   * Add message to output buffer
   */
  private addToOutputBuffer(instanceId: string, message: InstanceOutputMessage): void {
    if (!this.outputBuffer.has(instanceId)) {
      this.outputBuffer.set(instanceId, []);
    }
    
    const buffer = this.outputBuffer.get(instanceId)!;
    buffer.push(message);
    
    // Keep buffer size manageable (max 1000 messages)
    if (buffer.length > 1000) {
      buffer.splice(0, buffer.length - 1000);
    }
  }

  /**
   * Update connection statistics
   */
  private updateConnectionStats(instanceId: string): void {
    const stats = this.connectionStats.get(instanceId);
    if (stats) {
      stats.lastActivity = new Date();
      stats.messageCount++;
    }
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    // Abort any pending requests
    this.abortController.abort();
    this.abortController = new AbortController();

    // Clear all reconnect timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();

    // Close all SSE connections
    this.connections.forEach(connection => {
      if (connection.eventSource) {
        connection.eventSource.close();
      }
    });
    this.connections.clear();

    // Clear buffers and stats
    this.outputBuffer.clear();
    this.connectionStats.clear();
    this.eventListeners.clear();
  }

  /**
   * Get connection health status
   */
  getHealthStatus(): {
    totalConnections: number;
    activeConnections: number;
    errorConnections: number;
    reconnectingConnections: number;
  } {
    const connections = Array.from(this.connections.values());
    
    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.state === ConnectionState.CONNECTED).length,
      errorConnections: connections.filter(c => c.state === ConnectionState.ERROR).length,
      reconnectingConnections: connections.filter(c => c.state === ConnectionState.RECONNECTING).length
    };
  }
}

// Factory function for creating SSE instance manager
export const createSSEClaudeInstanceManager = (config: SSEClaudeInstanceConfig): SSEClaudeInstanceManager => {
  return new SSEClaudeInstanceManager(config);
};

// Backward compatibility
export const createClaudeInstanceManager = createSSEClaudeInstanceManager;

// Export the main class as both names for compatibility
export const ClaudeInstanceManager = SSEClaudeInstanceManager;
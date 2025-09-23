/**
 * SSEClaudeInstanceManager - HTTP+SSE Based Claude Instance Management
 * 
 * Replaces WebSocket-based communication with HTTP+SSE architecture for better reliability
 * and network compatibility. Implements SPARC architectural patterns for maintainability.
 */

import { TypedEventEmitter } from './TypedEventEmitter';
import { ExponentialBackoffManager } from './ExponentialBackoffManager';
import { CircularBuffer } from './CircularBuffer';

export enum SSEConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

export interface TerminalMessage {
  id: string;
  instanceId: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: Date;
  sequenceId: number;
  isReal?: boolean;
}

export interface SSEClaudeInstanceManagerConfig {
  apiBaseUrl: string;
  sseEndpoint: string;
  inputEndpoint: string;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  bufferSize: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  commandTimeout: number;
}

export interface ConnectionStateInfo {
  state: SSEConnectionState;
  instanceId: string | null;
  lastActivity: Date | null;
  connectionTime: Date | null;
  reconnectAttempts: number;
  errorMessage: string | null;
}

export interface CommandResponse {
  success: boolean;
  commandId: string;
  timestamp: Date;
  error?: string;
}

/**
 * SSE-based Claude Instance Manager
 * Provides reliable terminal communication using Server-Sent Events for output
 * and HTTP POST for input commands
 */
export class SSEClaudeInstanceManager extends TypedEventEmitter {
  private config: SSEClaudeInstanceManagerConfig;
  private eventSource: EventSource | null = null;
  private connectionState: SSEConnectionState = SSEConnectionState.DISCONNECTED;
  private currentInstanceId: string | null = null;
  
  // Connection Management
  private reconnectManager: ExponentialBackoffManager;
  private connectionTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  
  // Buffer Management
  private messageBuffer: CircularBuffer<TerminalMessage>;
  private outputHistory: Map<string, CircularBuffer<TerminalMessage>> = new Map();
  private sequenceCounter = 0;
  
  // State Tracking
  private connectionInfo: ConnectionStateInfo = {
    state: SSEConnectionState.DISCONNECTED,
    instanceId: null,
    lastActivity: null,
    connectionTime: null,
    reconnectAttempts: 0,
    errorMessage: null
  };

  constructor(config: SSEClaudeInstanceManagerConfig) {
    super();
    this.config = config;
    this.messageBuffer = new CircularBuffer<TerminalMessage>(config.bufferSize);
    this.reconnectManager = new ExponentialBackoffManager({
      maxAttempts: config.maxReconnectAttempts,
      baseDelay: config.reconnectDelay,
      maxDelay: 30000,
      backoffMultiplier: 2.0,
      jitter: true
    });
  }

  /**
   * Connect to a Claude instance via SSE
   */
  async connect(instanceId: string): Promise<void> {
    if (this.connectionState === SSEConnectionState.CONNECTED && 
        this.currentInstanceId === instanceId) {
      return; // Already connected to this instance
    }

    // Disconnect from current instance if connected
    if (this.connectionState !== SSEConnectionState.DISCONNECTED) {
      await this.disconnect();
    }

    this.currentInstanceId = instanceId;
    await this.establishSSEConnection(instanceId);
  }

  /**
   * Disconnect from current instance
   */
  async disconnect(): Promise<void> {
    this.setState(SSEConnectionState.DISCONNECTED);
    
    // Cleanup SSE connection
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    // Clear timers
    this.clearTimers();
    
    // Reset state
    this.currentInstanceId = null;
    this.reconnectManager.reset();
    
    this.emit('disconnected', { 
      instanceId: this.connectionInfo.instanceId,
      timestamp: new Date()
    });
    
    this.updateConnectionInfo({
      state: SSEConnectionState.DISCONNECTED,
      instanceId: null,
      lastActivity: null,
      connectionTime: null,
      reconnectAttempts: 0,
      errorMessage: null
    });
  }

  /**
   * Send input command to Claude instance
   */
  async sendInput(input: string): Promise<CommandResponse> {
    if (!this.currentInstanceId) {
      throw new Error('No instance connected');
    }

    if (this.connectionState !== SSEConnectionState.CONNECTED) {
      throw new Error('Not connected to instance');
    }

    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const url = `${this.config.apiBaseUrl}${this.config.inputEndpoint.replace('{instanceId}', this.currentInstanceId)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.commandTimeout);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: input + '\n',
          commandId
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Add input to message history
      this.addMessage({
        id: `input-${commandId}`,
        instanceId: this.currentInstanceId,
        type: 'input',
        content: `> ${input}\n`,
        timestamp: new Date(),
        sequenceId: this.getNextSequenceId(),
        isReal: true
      });
      
      this.emit('commandSent', {
        instanceId: this.currentInstanceId,
        input,
        commandId,
        timestamp: new Date()
      });
      
      return {
        success: result.success || true,
        commandId,
        timestamp: new Date(),
        error: result.error
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Command failed';
      
      this.emit('commandError', {
        instanceId: this.currentInstanceId,
        input,
        commandId,
        error: errorMessage,
        timestamp: new Date()
      });
      
      return {
        success: false,
        commandId,
        timestamp: new Date(),
        error: errorMessage
      };
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionStateInfo {
    return { ...this.connectionInfo };
  }

  /**
   * Get message history for current instance
   */
  getMessageHistory(limit?: number): TerminalMessage[] {
    if (!this.currentInstanceId) {
      return [];
    }
    
    const history = this.outputHistory.get(this.currentInstanceId);
    if (!history) {
      return [];
    }
    
    const messages = history.getAll();
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Clear message history for current instance
   */
  clearHistory(): void {
    if (!this.currentInstanceId) {
      return;
    }
    
    const history = this.outputHistory.get(this.currentInstanceId);
    if (history) {
      history.clear();
    }
    
    this.emit('historyCleared', {
      instanceId: this.currentInstanceId,
      timestamp: new Date()
    });
  }

  /**
   * Get connection statistics
   */
  getStatistics(): Record<string, any> {
    return {
      connectionState: this.connectionState,
      currentInstance: this.currentInstanceId,
      messageCount: this.messageBuffer.size(),
      reconnectAttempts: this.connectionInfo.reconnectAttempts,
      lastActivity: this.connectionInfo.lastActivity,
      connectionTime: this.connectionInfo.connectionTime,
      bufferUtilization: (this.messageBuffer.size() / this.config.bufferSize) * 100
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    this.outputHistory.clear();
    this.messageBuffer.clear();
    this.removeAllListeners();
  }

  // Private Methods

  /**
   * Establish SSE connection to instance
   */
  private async establishSSEConnection(instanceId: string): Promise<void> {
    this.setState(SSEConnectionState.CONNECTING);
    
    try {
      const url = `${this.config.apiBaseUrl}${this.config.sseEndpoint.replace('{instanceId}', instanceId)}`;
      
      this.eventSource = new EventSource(url, {
        withCredentials: false
      });
      
      this.setupSSEEventHandlers();
      
      // Set connection timeout
      this.connectionTimeoutId = setTimeout(() => {
        if (this.connectionState === SSEConnectionState.CONNECTING) {
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);
      
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Setup SSE event handlers
   */
  private setupSSEEventHandlers(): void {
    if (!this.eventSource) return;
    
    this.eventSource.onopen = () => {
      this.handleConnectionOpen();
    };
    
    this.eventSource.onmessage = (event) => {
      this.handleSSEMessage(event);
    };
    
    this.eventSource.onerror = (event) => {
      this.handleSSEError(event);
    };
  }

  /**
   * Handle successful SSE connection
   */
  private handleConnectionOpen(): void {
    this.setState(SSEConnectionState.CONNECTED);
    
    // Clear connection timeout
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
    
    // Reset reconnect manager
    this.reconnectManager.reset();
    
    // Start heartbeat
    this.startHeartbeat();
    
    this.updateConnectionInfo({
      state: SSEConnectionState.CONNECTED,
      instanceId: this.currentInstanceId,
      connectionTime: new Date(),
      lastActivity: new Date(),
      reconnectAttempts: 0,
      errorMessage: null
    });
    
    this.emit('connected', {
      instanceId: this.currentInstanceId,
      timestamp: new Date()
    });
  }

  /**
   * Handle incoming SSE messages
   */
  private handleSSEMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      // Update last activity
      this.updateLastActivity();
      
      // Process different message types
      switch (data.type) {
        case 'output':
        case 'terminal_output':
          if (data.isReal && data.data) {
            this.handleTerminalOutput(data);
          }
          break;
          
        case 'error':
          this.handleTerminalError(data);
          break;
          
        case 'system':
          this.handleSystemMessage(data);
          break;
          
        case 'heartbeat':
          // Just update activity timestamp
          break;
          
        default:
          console.warn('Unknown SSE message type:', data.type);
      }
      
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  }

  /**
   * Handle SSE connection errors
   */
  private handleSSEError(event: Event): void {
    console.warn('SSE connection error:', event);
    
    if (this.eventSource?.readyState === EventSource.CLOSED) {
      this.handleConnectionLost();
    }
  }

  /**
   * Handle terminal output messages
   */
  private handleTerminalOutput(data: any): void {
    const message: TerminalMessage = {
      id: `output-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId: this.currentInstanceId!,
      type: 'output',
      content: data.data || data.output,
      timestamp: new Date(),
      sequenceId: this.getNextSequenceId(),
      isReal: data.isReal
    };
    
    this.addMessage(message);
    
    this.emit('terminalOutput', {
      instanceId: this.currentInstanceId,
      content: message.content,
      timestamp: message.timestamp,
      isReal: message.isReal
    });
  }

  /**
   * Handle terminal error messages
   */
  private handleTerminalError(data: any): void {
    const message: TerminalMessage = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId: this.currentInstanceId!,
      type: 'error',
      content: data.error || data.message,
      timestamp: new Date(),
      sequenceId: this.getNextSequenceId()
    };
    
    this.addMessage(message);
    
    this.emit('terminalError', {
      instanceId: this.currentInstanceId,
      error: message.content,
      timestamp: message.timestamp
    });
  }

  /**
   * Handle system messages
   */
  private handleSystemMessage(data: any): void {
    const message: TerminalMessage = {
      id: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId: this.currentInstanceId!,
      type: 'system',
      content: data.message,
      timestamp: new Date(),
      sequenceId: this.getNextSequenceId()
    };
    
    this.addMessage(message);
    
    this.emit('systemMessage', {
      instanceId: this.currentInstanceId,
      message: message.content,
      timestamp: message.timestamp
    });
  }

  /**
   * Handle connection loss and attempt reconnection
   */
  private handleConnectionLost(): void {
    if (this.connectionState === SSEConnectionState.TERMINATED) {
      return; // Don't reconnect if manually terminated
    }
    
    this.setState(SSEConnectionState.RECONNECTING);
    
    if (this.reconnectManager.shouldRetry()) {
      const delay = this.reconnectManager.getNextDelay();
      
      setTimeout(async () => {
        if (this.currentInstanceId && this.connectionState === SSEConnectionState.RECONNECTING) {
          try {
            await this.establishSSEConnection(this.currentInstanceId);
          } catch (error) {
            this.handleConnectionError(error as Error);
          }
        }
      }, delay);
      
      this.updateConnectionInfo({
        ...this.connectionInfo,
        reconnectAttempts: this.reconnectManager.getCurrentAttempt()
      });
      
    } else {
      this.handleConnectionError(new Error('Max reconnection attempts reached'));
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error): void {
    this.setState(SSEConnectionState.ERROR);
    
    this.updateConnectionInfo({
      ...this.connectionInfo,
      state: SSEConnectionState.ERROR,
      errorMessage: error.message
    });
    
    this.emit('connectionError', {
      instanceId: this.currentInstanceId,
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Add message to buffer and history
   */
  private addMessage(message: TerminalMessage): void {
    // Add to main buffer
    this.messageBuffer.push(message);
    
    // Add to instance-specific history
    if (!this.outputHistory.has(message.instanceId)) {
      this.outputHistory.set(message.instanceId, new CircularBuffer<TerminalMessage>(this.config.bufferSize));
    }
    
    this.outputHistory.get(message.instanceId)!.push(message);
  }

  /**
   * Set connection state and emit events
   */
  private setState(state: SSEConnectionState): void {
    const oldState = this.connectionState;
    this.connectionState = state;
    
    if (oldState !== state) {
      this.emit('stateChange', {
        oldState,
        newState: state,
        instanceId: this.currentInstanceId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Update connection info
   */
  private updateConnectionInfo(updates: Partial<ConnectionStateInfo>): void {
    this.connectionInfo = { ...this.connectionInfo, ...updates };
    
    this.emit('connectionInfoUpdate', {
      connectionInfo: this.getConnectionState(),
      timestamp: new Date()
    });
  }

  /**
   * Update last activity timestamp
   */
  private updateLastActivity(): void {
    this.connectionInfo.lastActivity = new Date();
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatIntervalId = setInterval(() => {
      const now = Date.now();
      const lastActivity = this.connectionInfo.lastActivity?.getTime() || 0;
      
      if (now - lastActivity > this.config.heartbeatInterval * 2) {
        console.warn('No activity detected, connection may be stale');
        this.emit('connectionStale', {
          instanceId: this.currentInstanceId,
          lastActivity: this.connectionInfo.lastActivity,
          timestamp: new Date()
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
    
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Get next sequence ID
   */
  private getNextSequenceId(): number {
    return ++this.sequenceCounter;
  }
}
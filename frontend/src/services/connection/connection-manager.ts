/**
 * WebSocket Connection Manager
 * Core service for managing WebSocket connections with auto-reconnect, health monitoring, and metrics
 */

// import { io, Socket } from 'socket.io-client'; // HTTP/SSE ONLY - Socket.IO eliminated
// Browser-compatible EventEmitter replacement
class EventEmitter {
  private events: { [key: string]: Function[] } = {};
  
  on(event: string, listener: Function) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }
  
  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }
  
  off(event: string, listener?: Function) {
    if (!this.events[event]) return;
    if (listener) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    } else {
      delete this.events[event];
    }
  }
}
import {
  ConnectionManager,
  ConnectionState,
  ConnectionOptions,
  ConnectionMetrics,
  HealthStatus,
  ReconnectionStrategy,
  HealthMonitor,
  MetricsTracker,
  ConnectionError,
  DEFAULT_CONNECTION_CONFIG
} from './types';
import { ExponentialBackoffStrategy } from './strategies';
import { PingHealthMonitor } from './health-monitor';
import { AdvancedMetricsTracker } from './metrics-tracker';

export class WebSocketConnectionManager implements ConnectionManager {
  private socket: Socket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private options: ConnectionOptions;
  private eventEmitter: EventEmitter;
  private reconnectionStrategy: ReconnectionStrategy;
  private healthMonitor: HealthMonitor;
  private metricsTracker: MetricsTracker;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private currentReconnectAttempt = 0;
  private isDestroyed = false;
  private manualDisconnect = false;

  constructor(options: ConnectionOptions = {}) {
    this.options = { ...DEFAULT_CONNECTION_CONFIG.defaultOptions, ...options };
    this.eventEmitter = new EventEmitter();
    
    // Initialize reconnection strategy
    this.reconnectionStrategy = new ExponentialBackoffStrategy({
      baseDelay: DEFAULT_CONNECTION_CONFIG.reconnection.baseDelay,
      maxDelay: DEFAULT_CONNECTION_CONFIG.reconnection.maxDelay,
      maxAttempts: DEFAULT_CONNECTION_CONFIG.reconnection.maxAttempts,
      jitter: DEFAULT_CONNECTION_CONFIG.reconnection.jitter
    });
    
    // Initialize health monitor
    this.healthMonitor = new PingHealthMonitor(this, {
      interval: DEFAULT_CONNECTION_CONFIG.healthCheck.interval,
      timeout: DEFAULT_CONNECTION_CONFIG.healthCheck.timeout,
      maxFailures: DEFAULT_CONNECTION_CONFIG.healthCheck.maxFailures
    });
    
    // Initialize metrics tracker
    this.metricsTracker = new AdvancedMetricsTracker();
    
    // Auto-connect if enabled
    if (this.options.autoConnect) {
      this.connect().catch(error => {
        this.emit('error', {
          error,
          context: 'auto-connect',
          recoverable: true
        });
      });
    }
  }

  async connect(options?: Partial<ConnectionOptions>): Promise<void> {
    if (this.isDestroyed) {
      throw new ConnectionError('Connection manager has been destroyed', 'DESTROYED', false);
    }

    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    // Merge options
    const connectOptions = { ...this.options, ...options };
    
    this.setState(ConnectionState.CONNECTING);
    this.metricsTracker.recordConnection();
    this.manualDisconnect = false;

    try {
      // Clean up existing socket
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      }

      // HTTP/SSE ONLY - Mock socket connection
      console.log('🚀 [HTTP/SSE ConnectionManager] Mock connection - no Socket.IO needed:', connectOptions.url);
      
      // Create mock socket for backward compatibility
      this.socket = {
        connected: true,
        emit: (event: string, data?: any) => {
          console.log(`📡 [HTTP/SSE Mock ConnectionManager] Emit ${event}:`, data);
        },
        on: (event: string, handler: Function) => {
          console.log(`👂 [HTTP/SSE Mock ConnectionManager] Listen ${event}`);
        },
        off: (event: string, handler?: Function) => {
          console.log(`🔇 [HTTP/SSE Mock ConnectionManager] Unlisten ${event}`);
        },
        disconnect: () => {
          console.log('📴 [HTTP/SSE Mock ConnectionManager] Disconnect - no Socket.IO needed');
        },
        connect: () => {
          console.log('🌐 [HTTP/SSE Mock ConnectionManager] Connect - no Socket.IO needed');
        }
      } as any;

      await this.setupSocketHandlers();
      await this.establishConnection(connectOptions.timeout || 15000);
      
      this.setState(ConnectionState.CONNECTED);
      this.metricsTracker.recordSuccessfulConnection();
      this.currentReconnectAttempt = 0;
      this.reconnectionStrategy.reset();
      
      // Start health monitoring
      if (DEFAULT_CONNECTION_CONFIG.healthCheck.enabled) {
        this.healthMonitor.startMonitoring();
      }
      
      this.emit('connected', {
        timestamp: new Date(),
        attempt: this.currentReconnectAttempt
      });

    } catch (error) {
      this.setState(ConnectionState.ERROR);
      this.metricsTracker.recordFailedConnection(error as Error);
      
      const connectionError = new ConnectionError(
        `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_FAILED',
        true,
        { attempt: this.currentReconnectAttempt, options: connectOptions }
      );
      
      this.emit('error', {
        error: connectionError,
        context: 'connection',
        recoverable: true
      });
      
      // Schedule reconnection if enabled
      if (connectOptions.reconnection && !this.manualDisconnect) {
        this.scheduleReconnection();
      }
      
      throw connectionError;
    }
  }

  async disconnect(manual = false): Promise<void> {
    if (this.state === ConnectionState.DISCONNECTED || 
        this.state === ConnectionState.MANUAL_DISCONNECT) {
      return;
    }

    this.manualDisconnect = manual;
    this.clearReconnectionTimer();
    this.healthMonitor.stopMonitoring();

    const reason = manual ? 'manual_disconnect' : 'programmatic_disconnect';
    this.metricsTracker.recordDisconnection(reason);

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const newState = manual ? ConnectionState.MANUAL_DISCONNECT : ConnectionState.DISCONNECTED;
    this.setState(newState);
    
    this.emit('disconnected', {
      timestamp: new Date(),
      reason,
      manual
    });
  }

  async reconnect(): Promise<void> {
    if (this.isDestroyed) {
      throw new ConnectionError('Connection manager has been destroyed', 'DESTROYED', false);
    }

    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.currentReconnectAttempt++;
    
    if (!this.reconnectionStrategy.shouldReconnect(this.currentReconnectAttempt, null)) {
      const error = new ConnectionError(
        `Max reconnection attempts (${this.reconnectionStrategy.getMaxAttempts()}) exceeded`,
        'MAX_RECONNECT_ATTEMPTS',
        false,
        { attempt: this.currentReconnectAttempt }
      );
      
      this.setState(ConnectionState.ERROR);
      this.emit('error', {
        error,
        context: 'reconnection',
        recoverable: false
      });
      
      throw error;
    }

    this.setState(ConnectionState.RECONNECTING);
    this.metricsTracker.recordReconnection(this.currentReconnectAttempt);
    
    const delay = this.reconnectionStrategy.getDelay(this.currentReconnectAttempt);
    
    this.emit('reconnection_attempt', {
      attempt: this.currentReconnectAttempt,
      maxAttempts: this.reconnectionStrategy.getMaxAttempts(),
      delay,
      reason: 'manual_reconnect'
    });

    return new Promise((resolve, reject) => {
      this.reconnectionTimer = setTimeout(async () => {
        try {
          await this.connect();
          resolve();
        } catch (error) {
          // Don't reject here, let the caller handle or schedule next attempt
          this.scheduleReconnection();
          reject(error);
        }
      }, delay);
    });
  }

  getState(): ConnectionState {
    return this.state;
  }

  getMetrics(): ConnectionMetrics {
    return this.metricsTracker.getMetrics();
  }

  getHealth(): HealthStatus {
    return this.healthMonitor.getHealth();
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.socket?.connected === true;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  on(event: string, handler: Function): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: string, handler: Function): void {
    this.eventEmitter.off(event, handler);
  }

  emit(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }

  updateOptions(options: Partial<ConnectionOptions>): void {
    this.options = { ...this.options, ...options };
  }

  destroy(): void {
    if (this.isDestroyed) return;
    
    this.isDestroyed = true;
    this.disconnect(true);
    this.clearReconnectionTimer();
    this.eventEmitter.removeAllListeners();
    
    this.emit('destroyed', { timestamp: new Date() });
  }

  // Private methods

  private async setupSocketHandlers(): Promise<void> {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('🔌 WebSocketConnectionManager: Socket connect event fired', {
        previousState: this.state,
        socketId: this.socket?.id,
        socketConnected: this.socket?.connected,
        readyState: this.socket?.readyState
      });
      
      // REFINEMENT: Synchronous state update with socket lifecycle
      if (this.state !== ConnectionState.CONNECTED) {
        this.setState(ConnectionState.CONNECTED);
        this.metricsTracker.recordSuccessfulConnection();
        
        // Force immediate React state synchronization
        setTimeout(() => {
          this.emit('connection_synchronized', {
            state: this.state,
            socketConnected: this.socket?.connected,
            timestamp: new Date()
          });
        }, 0);
        
        // Register as frontend client with the hub
        this.socket.emit('registerFrontend', { 
          timestamp: new Date().toISOString(),
          userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : 'frontend-client'),
          url: (typeof window !== 'undefined' && window.location ? window.location.href : 'unknown')
        });
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      this.healthMonitor.stopMonitoring();
      this.metricsTracker.recordDisconnection(reason);
      
      if (!this.manualDisconnect) {
        this.setState(ConnectionState.DISCONNECTED);
        
        // Schedule reconnection for involuntary disconnections
        if (this.options.reconnection && reason !== 'io client disconnect') {
          this.scheduleReconnection();
        }
      }
      
      this.emit('disconnected', {
        timestamp: new Date(),
        reason,
        manual: this.manualDisconnect
      });
    });

    this.socket.on('connect_error', (error: Error) => {
      this.setState(ConnectionState.ERROR);
      this.metricsTracker.recordError(error);
      
      const connectionError = new ConnectionError(
        `Connection error: ${error.message}`,
        'CONNECT_ERROR',
        true,
        { originalError: error }
      );
      
      this.emit('error', {
        error: connectionError,
        context: 'socket_connect_error',
        recoverable: true
      });
    });

    this.socket.on('error', (error: any) => {
      const connectionError = new ConnectionError(
        `Socket error: ${error}`,
        'SOCKET_ERROR',
        true,
        { originalError: error }
      );
      
      this.emit('error', {
        error: connectionError,
        context: 'socket_error',
        recoverable: true
      });
    });

    // Track message metrics
    this.socket.onAny((eventName: string, ...args: any[]) => {
      const messageSize = this.estimateMessageSize(eventName, args);
      this.metricsTracker.recordMessage('received', messageSize);
    });

    // Override emit to track sent messages
    const originalEmit = this.socket.emit.bind(this.socket);
    this.socket.emit = (eventName: string, ...args: any[]) => {
      const messageSize = this.estimateMessageSize(eventName, args);
      this.metricsTracker.recordMessage('sent', messageSize);
      return originalEmit(eventName, ...args);
    };
  }

  private async establishConnection(timeout: number): Promise<void> {
    if (!this.socket) throw new Error('Socket not initialized');

    return new Promise((resolve, reject) => {
      const timeoutTimer = setTimeout(() => {
        reject(new Error(`Connection timeout after ${timeout}ms`));
      }, timeout);

      const onConnect = () => {
        clearTimeout(timeoutTimer);
        this.socket?.off('connect_error', onError);
        resolve();
      };

      const onError = (error: Error) => {
        clearTimeout(timeoutTimer);
        this.socket?.off('connect', onConnect);
        reject(error);
      };

      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onError);
      this.socket.connect();
    });
  }

  private scheduleReconnection(): void {
    if (this.manualDisconnect || this.isDestroyed) return;
    
    // Small delay to prevent tight loops
    setTimeout(() => {
      if (!this.manualDisconnect && !this.isDestroyed) {
        this.reconnect().catch(() => {
          // Error handling is done in reconnect method
        });
      }
    }, 100);
  }

  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    
    console.log('🔧 WebSocketConnectionManager: State changed', {
      from: oldState,
      to: newState,
      socketConnected: this.socket?.connected,
      isConnectedMethod: this.isConnected()
    });
    
    this.emit('state_change', {
      from: oldState,
      to: newState,
      timestamp: new Date()
    });
  }

  private clearReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  private estimateMessageSize(eventName: string, args: any[]): number {
    try {
      // Rough estimation of message size
      const messageStr = JSON.stringify({ event: eventName, args });
      return new Blob([messageStr]).size;
    } catch {
      // Fallback to rough estimation
      return eventName.length + (args.length * 50);
    }
  }

  // Utility methods for detailed diagnostics
  getDetailedStatus() {
    return {
      state: this.state,
      isConnected: this.isConnected(),
      socketId: this.socket?.id,
      socketConnected: this.socket?.connected,
      currentAttempt: this.currentReconnectAttempt,
      maxAttempts: this.reconnectionStrategy.getMaxAttempts(),
      manualDisconnect: this.manualDisconnect,
      isDestroyed: this.isDestroyed,
      hasReconnectionTimer: this.reconnectionTimer !== null,
      options: { ...this.options, auth: '[REDACTED]' }, // Don't expose auth
      metrics: this.getMetrics(),
      health: this.getHealth()
    };
  }
}

// Singleton instance for global use
let globalConnectionManager: WebSocketConnectionManager | null = null;

export function getGlobalConnectionManager(options?: ConnectionOptions): WebSocketConnectionManager {
  if (!globalConnectionManager) {
    globalConnectionManager = new WebSocketConnectionManager(options);
  }
  return globalConnectionManager;
}

export function resetGlobalConnectionManager(): void {
  if (globalConnectionManager) {
    globalConnectionManager.destroy();
    globalConnectionManager = null;
  }
}
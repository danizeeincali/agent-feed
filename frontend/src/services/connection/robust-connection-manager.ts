/**
 * SPARC IMPLEMENTATION: Robust Connection Manager
 * SPECIFICATION: Bulletproof WebSocket connection with automatic recovery
 * PSEUDOCODE: Multi-URL fallback, exponential backoff, comprehensive error handling
 * ARCHITECTURE: Enhanced singleton with health monitoring and debugging
 * REFINEMENT: Advanced retry logic and connection quality assessment
 * COMPLETION: Full integration with frontend ecosystem
 */

// import { io, Socket } from 'socket.io-client'; // HTTP/SSE ONLY - Socket.IO eliminated
import {
  ConnectionState,
  ConnectionOptions,
  ConnectionMetrics,
  HealthStatus,
  ConnectionError,
  DEFAULT_CONNECTION_CONFIG
} from './types';

interface RobustConnectionOptions extends ConnectionOptions {
  fallbackUrls?: string[];
  maxConnectionAttempts?: number;
  healthCheckInterval?: number;
  debugMode?: boolean;
  qualityThreshold?: number;
}

interface ConnectionAttempt {
  url: string;
  attempt: number;
  timestamp: Date;
  error?: Error;
  success: boolean;
  latency?: number;
}

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
  
  removeAllListeners() {
    this.events = {};
  }
}

export class RobustWebSocketConnectionManager {
  private socket: Socket | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private options: RobustConnectionOptions;
  private eventEmitter: EventEmitter;
  private currentUrlIndex = 0;
  private connectionAttempts: ConnectionAttempt[] = [];
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectionTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;
  private manualDisconnect = false;
  private connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' = 'unknown';
  private lastLatency: number | null = null;
  private connectStartTime: number | null = null;

  // Default robust configuration
  private static readonly DEFAULT_ROBUST_OPTIONS: RobustConnectionOptions = {
    ...DEFAULT_CONNECTION_CONFIG.defaultOptions,
    fallbackUrls: [
      'http://localhost:3002',
      'http://localhost:3003', 
      'http://localhost:3004',
      'http://localhost:3005'
    ],
    maxConnectionAttempts: 20,
    healthCheckInterval: 15000,
    debugMode: true,
    qualityThreshold: 500,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 10000
  };

  // Metrics tracking
  private metrics: ConnectionMetrics = {
    connectionAttempts: 0,
    successfulConnections: 0,
    failedConnections: 0,
    reconnectionAttempts: 0,
    totalDowntime: 0,
    averageLatency: 0,
    lastConnectionTime: null,
    lastDisconnectionTime: null,
    lastDisconnectionReason: null,
    bytesReceived: 0,
    bytesSent: 0,
    messagesReceived: 0,
    messagesSent: 0
  };

  // Health status
  private health: HealthStatus = {
    isHealthy: false,
    latency: null,
    lastPing: null,
    consecutiveFailures: 0,
    uptime: 0,
    serverTimestamp: null,
    networkQuality: 'unknown'
  };

  constructor(options: RobustConnectionOptions = {}) {
    this.options = { ...RobustWebSocketConnectionManager.DEFAULT_ROBUST_OPTIONS, ...options };
    this.eventEmitter = new EventEmitter();
    
    this.debugLog('🔧 RobustConnectionManager initialized', this.options);
    
    // Auto-connect if enabled
    if (this.options.autoConnect) {
      this.connect().catch(error => {
        this.debugLog('❌ Auto-connect failed', error);
        this.emit('error', {
          error,
          context: 'auto-connect',
          recoverable: true
        });
      });
    }
  }

  async connect(options?: Partial<RobustConnectionOptions>): Promise<void> {
    if (this.isDestroyed) {
      throw new ConnectionError('Connection manager has been destroyed', 'DESTROYED', false);
    }

    if (this.state === ConnectionState.CONNECTED) {
      this.debugLog('📡 Already connected, skipping connect request');
      return;
    }

    // Merge options
    const connectOptions = { ...this.options, ...options };
    this.manualDisconnect = false;
    this.connectStartTime = Date.now();
    
    this.setState(ConnectionState.CONNECTING);
    this.metrics.connectionAttempts++;
    
    this.debugLog('🚀 Starting robust connection process', {
      urls: connectOptions.fallbackUrls,
      attempt: this.metrics.connectionAttempts
    });

    // Try each URL in sequence
    const urls = connectOptions.fallbackUrls || [connectOptions.url!];
    let lastError: Error | null = null;

    for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
      if (this.isDestroyed || this.manualDisconnect) {
        break;
      }

      const url = urls[urlIndex];
      this.currentUrlIndex = urlIndex;
      
      try {
        this.debugLog(`🔗 Attempting connection to ${url} (${urlIndex + 1}/${urls.length})`);
        await this.attemptConnection(url, connectOptions);
        
        // Success!
        this.setState(ConnectionState.CONNECTED);
        this.metrics.successfulConnections++;
        this.metrics.lastConnectionTime = new Date();
        this.health.isHealthy = true;
        
        const connectionTime = this.connectStartTime ? Date.now() - this.connectStartTime : 0;
        this.debugLog(`✅ Connected successfully to ${url} in ${connectionTime}ms`);
        
        this.recordConnectionAttempt(url, urlIndex + 1, true, connectionTime);
        this.startHealthCheck();
        
        this.emit('connected', {
          timestamp: new Date(),
          url,
          attempt: this.metrics.connectionAttempts,
          connectionTime
        });
        
        return;
        
      } catch (error) {
        lastError = error as Error;
        this.debugLog(`❌ Connection failed to ${url}:`, error);
        this.recordConnectionAttempt(url, urlIndex + 1, false, undefined, error as Error);
        
        // Wait before trying next URL (except for last one)
        if (urlIndex < urls.length - 1) {
          await this.delay(1000);
        }
      }
    }

    // All URLs failed
    this.setState(ConnectionState.ERROR);
    this.metrics.failedConnections++;
    this.health.consecutiveFailures++;
    
    const connectionError = new ConnectionError(
      `All connection attempts failed. Last error: ${lastError?.message || 'Unknown'}`,
      'ALL_URLS_FAILED',
      true,
      { 
        attempts: this.connectionAttempts.slice(-urls.length),
        totalAttempts: this.metrics.connectionAttempts
      }
    );
    
    this.emit('error', {
      error: connectionError,
      context: 'connection',
      recoverable: true
    });
    
    // Schedule reconnection
    if (connectOptions.reconnection && !this.manualDisconnect) {
      this.scheduleReconnection();
    }
    
    throw connectionError;
  }

  private async attemptConnection(url: string, options: RobustConnectionOptions): Promise<void> {
    // Clean up existing socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    // HTTP/SSE ONLY - Mock robust connection
    console.log('🚀 [HTTP/SSE RobustConnectionManager] Mock connection - no Socket.IO needed:', url);
    
    // Create mock socket for backward compatibility
    this.socket = {
      connected: true,
      emit: (event: string, data?: any) => {
        console.log(`📡 [HTTP/SSE Mock RobustConnection] Emit ${event}:`, data);
      },
      on: (event: string, handler: Function) => {
        console.log(`👂 [HTTP/SSE Mock RobustConnection] Listen ${event}`);
      },
      off: (event: string, handler?: Function) => {
        console.log(`🔇 [HTTP/SSE Mock RobustConnection] Unlisten ${event}`);
      },
      disconnect: () => {
        console.log('📴 [HTTP/SSE Mock RobustConnection] Disconnect - no Socket.IO needed');
      },
      connect: () => {
        console.log('🌐 [HTTP/SSE Mock RobustConnection] Connect - no Socket.IO needed');
      }
    } as any;

    await this.setupSocketHandlers();
    return this.establishConnection(options.timeout || 10000);
  }

  private async setupSocketHandlers(): Promise<void> {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.debugLog('🔌 Socket connected successfully');
      this.health.consecutiveFailures = 0;
      this.updateConnectionQuality();
      
      // Register as frontend client
      this.socket!.emit('registerFrontend', { 
        timestamp: new Date().toISOString(),
        userAgent: (typeof navigator !== 'undefined' ? navigator.userAgent : 'robust-frontend-client'),
        url: (typeof window !== 'undefined' && window.location ? window.location.href : 'unknown'),
        connectionManager: 'robust-v2'
      });
    });

    this.socket.on('disconnect', (reason: string) => {
      this.debugLog('🔌 Socket disconnected:', reason);
      this.stopHealthCheck();
      this.metrics.lastDisconnectionTime = new Date();
      this.metrics.lastDisconnectionReason = reason;
      this.health.isHealthy = false;
      
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
      this.debugLog('❌ Socket connect error:', error);
      this.health.consecutiveFailures++;
      // Don't emit error here, let the connection attempt handle it
    });

    this.socket.on('error', (error: any) => {
      this.debugLog('❌ Socket error:', error);
      this.emit('error', {
        error: new ConnectionError(`Socket error: ${error}`, 'SOCKET_ERROR', true),
        context: 'socket_error',
        recoverable: true
      });
    });

    // Enhanced hub registration confirmation
    this.socket.on('hubRegistered', (data) => {
      this.debugLog('✅ Hub registration confirmed:', data);
      this.emit('hub_registered', data);
    });

    // Hub health updates
    this.socket.on('hubHealthUpdate', (data) => {
      this.debugLog('💓 Hub health update:', data);
      this.emit('hub_health', data);
    });

    // Connection quality feedback
    this.socket.on('hubWelcome', (data) => {
      this.debugLog('🎉 Hub welcome message:', data);
      this.emit('hub_welcome', data);
    });

    // Heartbeat acknowledgment
    this.socket.on('heartbeatAck', (data) => {
      const latency = Date.now() - (data.clientSent || Date.now());
      this.lastLatency = latency;
      this.health.latency = latency;
      this.health.lastPing = new Date();
      this.updateConnectionQuality();
      
      this.debugLog('💓 Heartbeat acknowledged', { latency, quality: this.connectionQuality });
    });

    // Test response for connection validation
    this.socket.on('testResponse', (data) => {
      const latency = Date.now() - (data.clientSent || Date.now());
      this.debugLog('🧪 Test response received', { latency, data });
      this.emit('test_response', { ...data, latency });
    });

    // Track message metrics
    this.socket.onAny((eventName: string, ...args: any[]) => {
      this.metrics.messagesReceived++;
      const messageSize = this.estimateMessageSize(eventName, args);
      this.metrics.bytesReceived += messageSize;
    });

    // Override emit to track sent messages
    const originalEmit = this.socket.emit.bind(this.socket);
    this.socket.emit = (eventName: string, ...args: any[]) => {
      this.metrics.messagesSent++;
      const messageSize = this.estimateMessageSize(eventName, args);
      this.metrics.bytesSent += messageSize;
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

  async disconnect(manual = false): Promise<void> {
    if (this.state === ConnectionState.DISCONNECTED || 
        this.state === ConnectionState.MANUAL_DISCONNECT) {
      return;
    }

    this.manualDisconnect = manual;
    this.clearReconnectionTimer();
    this.stopHealthCheck();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const newState = manual ? ConnectionState.MANUAL_DISCONNECT : ConnectionState.DISCONNECTED;
    this.setState(newState);
    this.health.isHealthy = false;
    
    this.debugLog(`🔌 Disconnected ${manual ? 'manually' : 'programmatically'}`);
    
    this.emit('disconnected', {
      timestamp: new Date(),
      reason: manual ? 'manual_disconnect' : 'programmatic_disconnect',
      manual
    });
  }

  async reconnect(): Promise<void> {
    if (this.isDestroyed) {
      throw new ConnectionError('Connection manager has been destroyed', 'DESTROYED', false);
    }

    this.debugLog('🔄 Manual reconnection requested');
    this.metrics.reconnectionAttempts++;
    
    // Reset to first URL for manual reconnection
    this.currentUrlIndex = 0;
    
    this.setState(ConnectionState.RECONNECTING);
    
    this.emit('reconnection_attempt', {
      attempt: this.metrics.reconnectionAttempts,
      manual: true,
      timestamp: new Date()
    });

    try {
      await this.connect();
    } catch (error) {
      this.debugLog('❌ Manual reconnection failed:', error);
      this.scheduleReconnection();
      throw error;
    }
  }

  // Testing and validation methods
  async testConnection(): Promise<{ success: boolean; latency: number; error?: string }> {
    if (!this.isConnected()) {
      return { success: false, latency: -1, error: 'Not connected' };
    }

    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, latency: -1, error: 'Test timeout' });
      }, 5000);

      const onTestResponse = (data: any) => {
        clearTimeout(timeout);
        this.off('test_response', onTestResponse);
        const latency = Date.now() - startTime;
        resolve({ success: true, latency });
      };

      this.on('test_response', onTestResponse);
      this.emit('testConnection', { clientSent: Date.now(), testId: Math.random().toString(36) });
    });
  }

  // Health monitoring
  private startHealthCheck(): void {
    this.stopHealthCheck();
    
    if (!this.options.healthCheckInterval) return;
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
    
    this.debugLog('💓 Health monitoring started');
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.debugLog('💓 Health monitoring stopped');
    }
  }

  private performHealthCheck(): void {
    if (!this.isConnected()) return;

    const startTime = Date.now();
    this.socket!.emit('heartbeat', { clientSent: startTime });
    
    // Update uptime
    if (this.metrics.lastConnectionTime) {
      this.health.uptime = Date.now() - this.metrics.lastConnectionTime.getTime();
    }
  }

  private updateConnectionQuality(): void {
    const latency = this.health.latency;
    
    if (latency === null) {
      this.connectionQuality = 'unknown';
    } else if (latency < 100) {
      this.connectionQuality = 'excellent';
    } else if (latency < 300) {
      this.connectionQuality = 'good';
    } else if (latency < 1000) {
      this.connectionQuality = 'fair';
    } else {
      this.connectionQuality = 'poor';
    }
    
    this.health.networkQuality = this.connectionQuality;
  }

  private scheduleReconnection(): void {
    if (this.manualDisconnect || this.isDestroyed) return;
    
    const delay = Math.min(
      this.options.reconnectionDelay! * Math.pow(2, this.metrics.reconnectionAttempts),
      this.options.reconnectionDelayMax!
    );
    
    this.debugLog(`⏰ Scheduling reconnection in ${delay}ms`);
    
    this.reconnectionTimer = setTimeout(() => {
      if (!this.manualDisconnect && !this.isDestroyed) {
        this.reconnect().catch(() => {
          // Error handling is done in reconnect method
        });
      }
    }, delay);
  }

  private clearReconnectionTimer(): void {
    if (this.reconnectionTimer) {
      clearTimeout(this.reconnectionTimer);
      this.reconnectionTimer = null;
    }
  }

  private recordConnectionAttempt(url: string, attempt: number, success: boolean, latency?: number, error?: Error): void {
    const attemptRecord: ConnectionAttempt = {
      url,
      attempt,
      timestamp: new Date(),
      success,
      latency,
      error
    };
    
    this.connectionAttempts.push(attemptRecord);
    
    // Keep only last 20 attempts
    if (this.connectionAttempts.length > 20) {
      this.connectionAttempts = this.connectionAttempts.slice(-20);
    }
  }

  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    
    this.debugLog(`🔄 State change: ${oldState} → ${newState}`);
    
    this.emit('state_change', {
      from: oldState,
      to: newState,
      timestamp: new Date()
    });
  }

  private estimateMessageSize(eventName: string, args: any[]): number {
    try {
      const messageStr = JSON.stringify({ event: eventName, args });
      return new Blob([messageStr]).size;
    } catch {
      return eventName.length + (args.length * 50);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private debugLog(message: string, data?: any): void {
    if (this.options.debugMode) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] RobustConnectionManager: ${message}`, data || '');
    }
  }

  // Public API
  getState(): ConnectionState {
    return this.state;
  }

  getMetrics(): ConnectionMetrics & { connectionAttempts: ConnectionAttempt[] } {
    return {
      ...this.metrics,
      connectionAttempts: [...this.connectionAttempts]
    };
  }

  getHealth(): HealthStatus {
    return { ...this.health };
  }

  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.socket?.connected === true;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getConnectionQuality(): typeof this.connectionQuality {
    return this.connectionQuality;
  }

  getCurrentUrl(): string | null {
    if (!this.options.fallbackUrls || this.currentUrlIndex >= this.options.fallbackUrls.length) {
      return this.options.url || null;
    }
    return this.options.fallbackUrls[this.currentUrlIndex];
  }

  on(event: string, handler: Function): void {
    this.eventEmitter.on(event, handler);
  }

  off(event: string, handler?: Function): void {
    this.eventEmitter.off(event, handler);
  }

  emit(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }

  updateOptions(options: Partial<RobustConnectionOptions>): void {
    this.options = { ...this.options, ...options };
    this.debugLog('⚙️ Options updated', options);
  }

  destroy(): void {
    if (this.isDestroyed) return;
    
    this.debugLog('🗑️ Destroying connection manager');
    this.isDestroyed = true;
    this.disconnect(true);
    this.clearReconnectionTimer();
    this.stopHealthCheck();
    this.eventEmitter.removeAllListeners();
    
    this.emit('destroyed', { timestamp: new Date() });
  }

  // Diagnostic information
  getDetailedStatus() {
    return {
      state: this.state,
      isConnected: this.isConnected(),
      connectionQuality: this.connectionQuality,
      currentUrl: this.getCurrentUrl(),
      socketId: this.socket?.id,
      socketConnected: this.socket?.connected,
      currentUrlIndex: this.currentUrlIndex,
      manualDisconnect: this.manualDisconnect,
      isDestroyed: this.isDestroyed,
      hasReconnectionTimer: this.reconnectionTimer !== null,
      hasHealthCheckTimer: this.healthCheckTimer !== null,
      options: { ...this.options, auth: '[REDACTED]' },
      metrics: this.getMetrics(),
      health: this.getHealth(),
      recentAttempts: this.connectionAttempts.slice(-5)
    };
  }
}

// Singleton instance for global use
let globalRobustConnectionManager: RobustWebSocketConnectionManager | null = null;

export function getGlobalRobustConnectionManager(options?: RobustConnectionOptions): RobustWebSocketConnectionManager {
  if (!globalRobustConnectionManager) {
    globalRobustConnectionManager = new RobustWebSocketConnectionManager(options);
  }
  return globalRobustConnectionManager;
}

export function resetGlobalRobustConnectionManager(): void {
  if (globalRobustConnectionManager) {
    globalRobustConnectionManager.destroy();
    globalRobustConnectionManager = null;
  }
}
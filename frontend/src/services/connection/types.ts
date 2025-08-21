/**
 * Connection Management Types
 * Comprehensive type definitions for WebSocket connection management
 */

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  MANUAL_DISCONNECT = 'manual_disconnect'
}

export interface ConnectionOptions {
  url?: string;
  namespace?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  maxReconnectAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  auth?: any;
  withCredentials?: boolean;
  transports?: string[];
  upgrade?: boolean;
  rememberUpgrade?: boolean;
  forceNew?: boolean;
}

export interface ConnectionMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  failedConnections: number;
  reconnectionAttempts: number;
  totalDowntime: number;
  averageLatency: number;
  lastConnectionTime: Date | null;
  lastDisconnectionTime: Date | null;
  lastDisconnectionReason: string | null;
  bytesReceived: number;
  bytesSent: number;
  messagesReceived: number;
  messagesSent: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  latency: number | null;
  lastPing: Date | null;
  consecutiveFailures: number;
  uptime: number;
  serverTimestamp: Date | null;
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
}

export interface ConnectionEvent {
  type: 'state_change' | 'error' | 'metrics_update' | 'health_update' | 'reconnection_attempt';
  timestamp: Date;
  data: any;
  source: 'connection_manager' | 'health_monitor' | 'metrics_tracker';
}

export interface StateChangeEvent extends ConnectionEvent {
  type: 'state_change';
  data: {
    from: ConnectionState;
    to: ConnectionState;
    reason?: string;
  };
}

export interface ErrorEvent extends ConnectionEvent {
  type: 'error';
  data: {
    error: Error;
    context: string;
    recoverable: boolean;
  };
}

export interface MetricsUpdateEvent extends ConnectionEvent {
  type: 'metrics_update';
  data: ConnectionMetrics;
}

export interface HealthUpdateEvent extends ConnectionEvent {
  type: 'health_update';
  data: HealthStatus;
}

export interface ReconnectionAttemptEvent extends ConnectionEvent {
  type: 'reconnection_attempt';
  data: {
    attempt: number;
    maxAttempts: number;
    delay: number;
    reason: string;
  };
}

export interface ConnectionManager {
  // Core connection methods
  connect(options?: Partial<ConnectionOptions>): Promise<void>;
  disconnect(manual?: boolean): Promise<void>;
  reconnect(): Promise<void>;
  
  // State management
  getState(): ConnectionState;
  getMetrics(): ConnectionMetrics;
  getHealth(): HealthStatus;
  isConnected(): boolean;
  
  // Socket access
  getSocket(): any;
  
  // Event management
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  emit(event: string, data: any): void;
  
  // Configuration
  updateOptions(options: Partial<ConnectionOptions>): void;
  
  // Cleanup
  destroy(): void;
}

export interface ReconnectionStrategy {
  shouldReconnect(attempt: number, error: Error | null): boolean;
  getDelay(attempt: number): number;
  getMaxAttempts(): number;
  reset(): void;
}

export interface HealthMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  ping(): Promise<number>;
  getLatency(): number | null;
  getLastPing(): Date | null;
  getHealth(): HealthStatus;
}

export interface MetricsTracker {
  recordConnection(): void;
  recordDisconnection(reason: string): void;
  recordReconnection(attempt: number): void;
  recordError(error: Error): void;
  recordMessage(direction: 'sent' | 'received', size: number): void;
  getMetrics(): ConnectionMetrics;
  reset(): void;
}

export interface ConnectionConfig {
  defaultOptions: ConnectionOptions;
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
    maxFailures: number;
  };
  reconnection: {
    enabled: boolean;
    baseDelay: number;
    maxDelay: number;
    maxAttempts: number;
    jitter: boolean;
  };
  metrics: {
    enabled: boolean;
    retentionPeriod: number;
  };
}

// Default configuration
export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  defaultOptions: {
    url: '/ws',
    namespace: '/',
    autoConnect: true,
    reconnection: true,
    maxReconnectAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 15000,
    withCredentials: true,
    transports: ['polling', 'websocket'],
    upgrade: true,
    rememberUpgrade: true,
    forceNew: false
  },
  healthCheck: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 5000,   // 5 seconds
    maxFailures: 3
  },
  reconnection: {
    enabled: true,
    baseDelay: 1000,  // 1 second
    maxDelay: 30000,  // 30 seconds
    maxAttempts: 10,
    jitter: true
  },
  metrics: {
    enabled: true,
    retentionPeriod: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Error types
export class ConnectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public context?: any
  ) {
    super(message);
    this.name = 'ConnectionError';
  }
}

export class HealthCheckError extends Error {
  constructor(
    message: string,
    public latency: number | null = null,
    public consecutiveFailures: number = 0
  ) {
    super(message);
    this.name = 'HealthCheckError';
  }
}

export class ReconnectionError extends Error {
  constructor(
    message: string,
    public attempt: number,
    public maxAttempts: number
  ) {
    super(message);
    this.name = 'ReconnectionError';
  }
}

// Utility types
export type ConnectionEventHandler<T = any> = (data: T) => void;
export type ConnectionStateHandler = ConnectionEventHandler<StateChangeEvent['data']>;
export type ConnectionErrorHandler = ConnectionEventHandler<ErrorEvent['data']>;
export type MetricsUpdateHandler = ConnectionEventHandler<ConnectionMetrics>;
export type HealthUpdateHandler = ConnectionEventHandler<HealthStatus>;
export type ReconnectionAttemptHandler = ConnectionEventHandler<ReconnectionAttemptEvent['data']>;
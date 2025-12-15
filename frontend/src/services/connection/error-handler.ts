/**
 * Error Handler and Logger for Connection Management
 * Comprehensive error handling, logging, and recovery system
 */

import { ConnectionError, ConnectionState } from './types';

// Log levels
export type LogLevel = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

// Error categories
export type ErrorCategory = 'network' | 'protocol' | 'application' | 'recovery';

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Recovery actions
export type RecoveryAction = 
  | 'RECONNECT_WITH_BACKOFF'
  | 'RECONNECT'
  | 'FALLBACK_TO_POLLING'
  | 'RESET_STATE_AND_RECONNECT'
  | 'MANUAL_INTERVENTION_REQUIRED'
  | 'NO_ACTION';

// Base error class with comprehensive context
export abstract class BaseConnectionError extends Error {
  abstract readonly code: string;
  abstract readonly category: ErrorCategory;
  abstract readonly severity: ErrorSeverity;
  abstract readonly recoverable: boolean;
  abstract readonly userMessage: string;
  abstract readonly technicalMessage: string;
  abstract readonly suggestedActions: string[];
  
  readonly timestamp: Date;
  readonly context: Record<string, any>;
  
  constructor(message: string, context: Record<string, any> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.context = context;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoverable: this.recoverable,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      suggestedActions: this.suggestedActions,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

// Specific error implementations
export class NetworkConnectionError extends BaseConnectionError {
  readonly code = 'NETWORK_CONNECTION_ERROR';
  readonly category = 'network' as const;
  readonly severity = 'high' as const;
  readonly recoverable = true;
  readonly userMessage = 'Unable to connect to the server';
  readonly technicalMessage = 'Network connection failed';
  readonly suggestedActions = [
    'Check your internet connection',
    'Verify server availability',
    'Try again in a few moments'
  ];
}

export class ConnectionTimeoutError extends BaseConnectionError {
  readonly code = 'CONNECTION_TIMEOUT';
  readonly category = 'network' as const;
  readonly severity = 'medium' as const;
  readonly recoverable = true;
  readonly userMessage = 'Connection is taking longer than expected';
  readonly technicalMessage = 'Connection timeout exceeded';
  readonly suggestedActions = [
    'Check your network speed',
    'Try reconnecting',
    'Contact support if problem persists'
  ];
}

export class AuthenticationError extends BaseConnectionError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly category = 'protocol' as const;
  readonly severity = 'critical' as const;
  readonly recoverable = false;
  readonly userMessage = 'Authentication failed';
  readonly technicalMessage = 'Invalid credentials or expired session';
  readonly suggestedActions = [
    'Refresh the page to re-authenticate',
    'Clear browser cache and cookies',
    'Contact administrator if issue persists'
  ];
}

export class WebSocketUpgradeError extends BaseConnectionError {
  readonly code = 'WEBSOCKET_UPGRADE_FAILED';
  readonly category = 'protocol' as const;
  readonly severity = 'medium' as const;
  readonly recoverable = true;
  readonly userMessage = 'Connection upgrade failed';
  readonly technicalMessage = 'WebSocket upgrade failed, falling back to polling';
  readonly suggestedActions = [
    'Connection will automatically retry',
    'Check firewall and proxy settings',
    'Consider using alternative connection methods'
  ];
}

export class HealthCheckTimeoutError extends BaseConnectionError {
  readonly code = 'HEALTH_CHECK_TIMEOUT';
  readonly category = 'application' as const;
  readonly severity = 'medium' as const;
  readonly recoverable = true;
  readonly userMessage = 'Connection quality degraded';
  readonly technicalMessage = 'Health check ping timeout';
  readonly suggestedActions = [
    'Connection will automatically recover',
    'Check network stability',
    'Consider manual reconnection if issues persist'
  ];
}

export class MaxReconnectAttemptsError extends BaseConnectionError {
  readonly code = 'MAX_RECONNECT_ATTEMPTS';
  readonly category = 'recovery' as const;
  readonly severity = 'critical' as const;
  readonly recoverable = false;
  readonly userMessage = 'Unable to restore connection';
  readonly technicalMessage = 'Maximum reconnection attempts exceeded';
  readonly suggestedActions = [
    'Check network and server status',
    'Try manual reconnection',
    'Contact support if problem persists'
  ];
}

export class StateTransitionError extends BaseConnectionError {
  readonly code = 'INVALID_STATE_TRANSITION';
  readonly category = 'application' as const;
  readonly severity = 'low' as const;
  readonly recoverable = true;
  readonly userMessage = 'Connection state error';
  readonly technicalMessage = 'Invalid connection state transition attempted';
  readonly suggestedActions = [
    'Connection will automatically correct',
    'Avoid rapid connect/disconnect actions',
    'Refresh page if issues persist'
  ];
}

// Log entry interface
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  event: string;
  data: any;
  sessionId?: string;
  connectionId?: string;
  userAgent?: string;
  url?: string;
}

// Log handler interface
export interface LogHandler {
  handle(entry: LogEntry): void;
}

// Console log handler
export class ConsoleLogHandler implements LogHandler {
  private readonly colors = {
    TRACE: '#999',
    DEBUG: '#0066cc',
    INFO: '#00cc00',
    WARN: '#ffaa00',
    ERROR: '#cc0000',
    FATAL: '#ff0000'
  };

  handle(entry: LogEntry): void {
    const style = `color: ${this.colors[entry.level]}; font-weight: bold;`;
    const timestamp = entry.timestamp.toISOString();
    
    console.log(
      `%c[${timestamp}] ${entry.level} [${entry.category}] ${entry.event}`,
      style,
      entry.data
    );
  }
}

// Local storage log handler
export class LocalStorageLogHandler implements LogHandler {
  private readonly maxEntries = 1000;
  private readonly storageKey = 'connection-logs';

  handle(entry: LogEntry): void {
    try {
      const logs = this.getLogs();
      logs.push(entry);
      
      // Maintain size limit
      if (logs.length > this.maxEntries) {
        logs.splice(0, logs.length - this.maxEntries);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      // Storage might be full or unavailable
      console.warn('Failed to store log entry:', error);
    }
  }

  getLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem(this.storageKey);
  }
}

// Remote log handler with batching
export class RemoteLogHandler implements LogHandler {
  private buffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly flushInterval = 30000; // 30 seconds
  private readonly maxBufferSize = 50;

  constructor(
    private readonly endpoint: string,
    private readonly apiKey?: string
  ) {}

  handle(entry: LogEntry): void {
    this.buffer.push(entry);
    
    // Immediate flush for critical errors
    if (entry.level === 'ERROR' || entry.level === 'FATAL') {
      this.flush();
      return;
    }
    
    // Flush when buffer is full
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
      return;
    }
    
    // Schedule flush if not already scheduled
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    
    const logs = this.buffer.splice(0);
    
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }
      
      await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ logs })
      });
    } catch (error) {
      // Fallback to local storage
      const fallbackHandler = new LocalStorageLogHandler();
      logs.forEach(log => fallbackHandler.handle(log));
      
      console.warn('Failed to send logs to remote service, stored locally as fallback');
    }
  }
}

// Main logger class
export class ConnectionLogger {
  private static instance: ConnectionLogger | null = null;
  private readonly sessionId: string;
  private logLevel: LogLevel = 'INFO';
  private logHandlers: LogHandler[] = [];

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeDefaultHandlers();
  }

  static getInstance(): ConnectionLogger {
    if (!ConnectionLogger.instance) {
      ConnectionLogger.instance = new ConnectionLogger();
    }
    return ConnectionLogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultHandlers(): void {
    this.logHandlers = [
      new ConsoleLogHandler(),
      new LocalStorageLogHandler()
    ];
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  addHandler(handler: LogHandler): void {
    this.logHandlers.push(handler);
  }

  removeHandler(handler: LogHandler): void {
    const index = this.logHandlers.indexOf(handler);
    if (index > -1) {
      this.logHandlers.splice(index, 1);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  log(level: LogLevel, category: string, event: string, data: any, connectionId?: string): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      event,
      data,
      sessionId: this.sessionId,
      connectionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    };
    
    this.logHandlers.forEach(handler => {
      try {
        handler.handle(entry);
      } catch (error) {
        console.error('Log handler error:', error);
      }
    });
  }

  trace(category: string, event: string, data?: any, connectionId?: string): void {
    this.log('TRACE', category, event, data, connectionId);
  }

  debug(category: string, event: string, data?: any, connectionId?: string): void {
    this.log('DEBUG', category, event, data, connectionId);
  }

  info(category: string, event: string, data?: any, connectionId?: string): void {
    this.log('INFO', category, event, data, connectionId);
  }

  warn(category: string, event: string, data?: any, connectionId?: string): void {
    this.log('WARN', category, event, data, connectionId);
  }

  error(category: string, error: BaseConnectionError | Error, context?: any, connectionId?: string): void {
    const errorData = error instanceof BaseConnectionError 
      ? error.toJSON() 
      : {
          name: error.name,
          message: error.message,
          stack: error.stack
        };
    
    this.log('ERROR', category, 'error_occurred', {
      error: errorData,
      context
    }, connectionId);
  }

  fatal(category: string, event: string, data?: any, connectionId?: string): void {
    this.log('FATAL', category, event, data, connectionId);
  }
}

// Recovery strategy interface
export interface RecoveryStrategy {
  canRecover(error: BaseConnectionError): boolean;
  getRecoveryAction(error: BaseConnectionError): RecoveryAction;
  getRetryDelay(attempt: number, error: BaseConnectionError): number;
}

// Adaptive recovery strategy
export class AdaptiveRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: BaseConnectionError): boolean {
    // Don't attempt recovery for certain error types
    const nonRecoverableCodes = [
      'AUTHENTICATION_ERROR',
      'INVALID_URL',
      'MALFORMED_OPTIONS',
      'MAX_RECONNECT_ATTEMPTS'
    ];
    
    if (nonRecoverableCodes.includes(error.code)) {
      return false;
    }
    
    return error.recoverable;
  }
  
  getRecoveryAction(error: BaseConnectionError): RecoveryAction {
    switch (error.category) {
      case 'network':
        return 'RECONNECT_WITH_BACKOFF';
      case 'protocol':
        return error.code === 'WEBSOCKET_UPGRADE_FAILED' 
          ? 'FALLBACK_TO_POLLING' 
          : 'RECONNECT';
      case 'application':
        return 'RESET_STATE_AND_RECONNECT';
      case 'recovery':
        return 'MANUAL_INTERVENTION_REQUIRED';
      default:
        return 'NO_ACTION';
    }
  }
  
  getRetryDelay(attempt: number, error: BaseConnectionError): number {
    const baseDelay = error.severity === 'critical' ? 5000 : 1000;
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * 0.1 * Math.random();
    return exponentialDelay + jitter;
  }
}

// Circuit breaker for connection attempts
export class ConnectionCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly recoveryTimeout = 60000 // 1 minute
  ) {}
  
  canAttemptConnection(): boolean {
    if (this.state === 'CLOSED') return true;
    
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime?.getTime() || 0);
      if (timeSinceLastFailure > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    return this.state === 'HALF_OPEN';
  }
  
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
    
    ConnectionLogger.getInstance().info(
      'circuit_breaker',
      'connection_success',
      { state: this.state, failureCount: this.failureCount }
    );
  }
  
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = new Date();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      
      ConnectionLogger.getInstance().warn(
        'circuit_breaker',
        'circuit_opened',
        { 
          failureCount: this.failureCount,
          threshold: this.failureThreshold,
          recoveryTimeout: this.recoveryTimeout
        }
      );
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  getFailureCount(): number {
    return this.failureCount;
  }
}

// Error factory for creating appropriate error types
export class ConnectionErrorFactory {
  static createFromNativeError(error: Error, context?: any): BaseConnectionError {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return new NetworkConnectionError(error.message, { originalError: error, ...context });
    }
    
    if (message.includes('timeout')) {
      return new ConnectionTimeoutError(error.message, { originalError: error, ...context });
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return new AuthenticationError(error.message, { originalError: error, ...context });
    }
    
    if (message.includes('websocket') || message.includes('upgrade')) {
      return new WebSocketUpgradeError(error.message, { originalError: error, ...context });
    }
    
    // Default to network error for unknown errors
    return new NetworkConnectionError(error.message, { originalError: error, ...context });
  }
  
  static createFromCode(code: string, message: string, context?: any): BaseConnectionError {
    const errorMap: Record<string, new (message: string, context?: any) => BaseConnectionError> = {
      'NETWORK_CONNECTION_ERROR': NetworkConnectionError,
      'CONNECTION_TIMEOUT': ConnectionTimeoutError,
      'AUTHENTICATION_ERROR': AuthenticationError,
      'WEBSOCKET_UPGRADE_FAILED': WebSocketUpgradeError,
      'HEALTH_CHECK_TIMEOUT': HealthCheckTimeoutError,
      'MAX_RECONNECT_ATTEMPTS': MaxReconnectAttemptsError,
      'INVALID_STATE_TRANSITION': StateTransitionError
    };
    
    const ErrorClass = errorMap[code] || NetworkConnectionError;
    return new ErrorClass(message, context);
  }
}

// Export singleton logger instance
export const logger = ConnectionLogger.getInstance();
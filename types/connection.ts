/**
 * Connection Types for WebSocket Terminal Architecture
 * Type definitions for London School TDD test suite
 */

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

export interface ConnectionOptions {
  enableRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelay?: number;
  enableFallback?: boolean;
  url?: string;
  connectionTimeout?: number;
  lockTimeout?: number;
  forceReplace?: boolean;
}

export interface StateTransition {
  from: ConnectionState;
  to: ConnectionState;
  trigger: string;
  data?: Record<string, any>;
}

export interface ConnectionContext {
  terminalId: string;
  websocket: WebSocket | null;
  lastActivity: number;
  metadata: Record<string, any>;
  error?: Error;
  code?: number;
}

export interface ConnectionHealthStatus {
  terminalId: string;
  state: ConnectionState;
  lastActivity: number;
  uptime: number;
  messageCount: number;
  isConnected: boolean;
  instanceId: string | null;
  wsEndpoint: string;
  activeConnections: number;
  lastConnectionTime: number;
  connectionAttempts: number;
}

export interface EnforcementResult {
  allowed: boolean;
  replacedConnection?: {
    terminalId: string;
    state: ConnectionState;
  } | null;
  blockReason?: string;
}

export interface TransitionResult {
  success: boolean;
  error?: Error;
  newState?: ConnectionState;
}

// Mock interfaces for London School TDD
export interface MockConnectionRegistry {
  getActiveConnection(): any;
  setActiveConnection(terminalId: string, connection: any): void;
  removeConnection(terminalId: string): void;
  hasActiveConnection(): boolean;
  getConnectionCount(): number;
}

export interface MockConnectionCloser {
  closeConnection(terminalId: string, reason?: string): Promise<boolean>;
  closeAllConnections(): Promise<void>;
  forceClose(terminalId: string): Promise<boolean>;
}

export interface MockEventNotifier {
  notifyConnectionReplaced(data: { oldTerminalId: string; newTerminalId: string }): void;
  notifyConnectionBlocked(data: { terminalId: string; reason: string }): void;
  notifyConnectionEnforced(data: { acceptedTerminalId: string; rejectedTerminalId: string }): void;
}

export interface MockLockManager {
  acquireLock(lockId: string): Promise<boolean>;
  releaseLock(lockId: string): Promise<void>;
  isLocked(lockId: string): boolean;
  waitForLock(lockId: string): Promise<boolean>;
}

export interface MockStateStore {
  getCurrentState(): ConnectionState;
  setState(state: ConnectionState): Promise<void>;
  getStateHistory(): Array<{ state: ConnectionState; timestamp: number }>;
  clearHistory(): void;
}

export interface MockTransitionValidator {
  isValidTransition(from: ConnectionState, to: ConnectionState): boolean;
  getValidTransitions(from: ConnectionState): ConnectionState[];
  validateTransitionData(data: any, toState: ConnectionState): { valid: boolean; errors?: string[] };
}

export interface MockStateEventEmitter {
  emit(event: string, data: any): void;
  emitStateChange(data: any): void;
  emitTransitionStarted(transition: StateTransition): void;
  emitTransitionCompleted(transition: StateTransition): void;
  emitTransitionFailed(data: any): void;
}
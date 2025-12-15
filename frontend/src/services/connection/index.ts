/**
 * Connection Service Export
 * Central export point for all connection management services and utilities
 */

// Core service classes
export { WebSocketConnectionManager, getGlobalConnectionManager, resetGlobalConnectionManager } from './connection-manager';

// Health monitoring
export { PingHealthMonitor, BasicHealthMonitor } from './health-monitor';

// Metrics tracking
export { BasicMetricsTracker, AdvancedMetricsTracker } from './metrics-tracker';

// Reconnection strategies
export { 
  ExponentialBackoffStrategy, 
  LinearBackoffStrategy, 
  FixedDelayStrategy, 
  AdaptiveStrategy,
  createReconnectionStrategy
} from './strategies';

// Types and interfaces
export type {
  ConnectionState,
  ConnectionOptions,
  ConnectionMetrics,
  HealthStatus,
  ConnectionEvent,
  StateChangeEvent,
  ErrorEvent,
  MetricsUpdateEvent,
  HealthUpdateEvent,
  ReconnectionAttemptEvent,
  ConnectionManager,
  ReconnectionStrategy,
  HealthMonitor,
  MetricsTracker,
  ConnectionConfig,
  ConnectionEventHandler,
  ConnectionStateHandler,
  ConnectionErrorHandler,
  MetricsUpdateHandler,
  HealthUpdateHandler,
  ReconnectionAttemptHandler
} from './types';

// Error classes
export { 
  ConnectionError, 
  HealthCheckError, 
  ReconnectionError 
} from './types';

// Configuration
export { DEFAULT_CONNECTION_CONFIG } from './types';

// Strategy types
export type { StrategyType } from './strategies';
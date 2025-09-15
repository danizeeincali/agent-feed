/**
 * WebSocket/SSE Connection Failure Prevention Patterns
 *
 * This module implements comprehensive prevention patterns specifically for
 * WebSocket and Server-Sent Events (SSE) connection failures in the Avi DM system.
 * It provides proactive failure detection, circuit breaker patterns, adaptive
 * connection strategies, and graceful degradation mechanisms.
 *
 * Version: 1.0.0
 * Created: 2025-09-14
 * Updated: 2025-09-14
 */

import { EventEmitter } from 'events';
import { AviDMCrashContext, AviDMPreventionRule } from './avi-dm-crash-pattern';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface ConnectionStrategy {
  type: 'websocket' | 'sse' | 'polling' | 'hybrid';
  priority: number;
  timeout: number;
  retryPolicy: RetryPolicy;
  fallbackStrategy?: ConnectionStrategy;
  healthCheck: HealthCheckConfig;
}

export interface RetryPolicy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryConditions: RetryCondition[];
}

export interface RetryCondition {
  errorType: string[];
  httpStatusCodes: number[];
  networkStates: string[];
  maxConsecutiveFailures: number;
}

export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  failureThreshold: number;
  recoveryThreshold: number;
  pingMessage?: any;
}

export interface ConnectionHealth {
  score: number; // 0-1
  latency: number;
  errorRate: number;
  throughput: number;
  stability: number;
  lastCheck: number;
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: 'latency' | 'errors' | 'disconnects' | 'timeouts' | 'protocol';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  firstSeen: number;
  count: number;
}

export interface PreventionAction {
  type: 'block' | 'delay' | 'fallback' | 'circuit_break' | 'rate_limit';
  reason: string;
  duration: number;
  alternatives: string[];
  userMessage: string;
}

export interface NetworkQualityMetrics {
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  isOnline: boolean;
  timestamp: number;
}

// ============================================================================
// MAIN PREVENTION SYSTEM
// ============================================================================

export class WebSocketSSEPreventionSystem extends EventEmitter {
  private connectionStrategies: Map<string, ConnectionStrategy> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthMonitors: Map<string, ConnectionHealthMonitor> = new Map();
  private adaptiveManager: AdaptiveConnectionManager;
  private gracefulDegradation: GracefulDegradationManager;
  private networkQualityMonitor: NetworkQualityMonitor;

  // Active connections and their state
  private activeConnections: Map<string, ManagedConnection> = new Map();
  private connectionHistory: Map<string, ConnectionAttempt[]> = new Map();
  private preventionRules: Map<string, AviDMPreventionRule> = new Map();

  // Configuration
  private readonly config = {
    defaultTimeout: 10000,
    maxConcurrentConnections: 5,
    healthCheckInterval: 30000,
    circuitBreakerThreshold: 3,
    adaptiveStrategyEnabled: true,
    gracefulDegradationEnabled: true
  };

  constructor() {
    super();

    this.adaptiveManager = new AdaptiveConnectionManager();
    this.gracefulDegradation = new GracefulDegradationManager();
    this.networkQualityMonitor = new NetworkQualityMonitor();

    this.initializeConnectionStrategies();
    this.setupPreventionRules();
    this.startNetworkMonitoring();
  }

  // ============================================================================
  // CONNECTION PREVENTION METHODS
  // ============================================================================

  /**
   * Evaluate whether a connection attempt should proceed
   */
  async shouldAllowConnection(
    endpoint: string,
    context: Partial<AviDMCrashContext>
  ): Promise<{ allowed: boolean; action?: PreventionAction; strategy?: ConnectionStrategy }> {

    // Check circuit breaker status
    const circuitBreaker = this.getOrCreateCircuitBreaker(endpoint);
    if (!circuitBreaker.shouldAllowRequest()) {
      return {
        allowed: false,
        action: {
          type: 'circuit_break',
          reason: 'Circuit breaker is OPEN - too many recent failures',
          duration: circuitBreaker.getRecoveryTime(),
          alternatives: ['polling', 'cached_response'],
          userMessage: 'Service temporarily unavailable. Retrying automatically...'
        }
      };
    }

    // Check rate limiting
    if (this.isRateLimited(endpoint, context)) {
      return {
        allowed: false,
        action: {
          type: 'rate_limit',
          reason: 'Too many connection attempts in short time',
          duration: 60000, // 1 minute
          alternatives: ['wait_and_retry'],
          userMessage: 'Please wait a moment before trying again.'
        }
      };
    }

    // Check network conditions
    const networkQuality = await this.networkQualityMonitor.getCurrentQuality();
    if (networkQuality.score < 0.3) {
      const strategy = this.adaptiveManager.getStrategyForNetworkConditions(networkQuality);

      if (strategy.type === 'websocket' && networkQuality.connectionType === 'slow-2g') {
        return {
          allowed: false,
          action: {
            type: 'fallback',
            reason: 'Network conditions too poor for WebSocket',
            duration: 0,
            alternatives: ['sse', 'polling'],
            userMessage: 'Switching to more reliable connection mode for your network...'
          },
          strategy: this.connectionStrategies.get('sse_fallback')
        };
      }
    }

    // Check prevention rules
    for (const rule of this.preventionRules.values()) {
      if (this.ruleApplies(rule, context)) {
        const shouldPrevent = this.evaluatePreventionRule(rule, context);
        if (shouldPrevent) {
          return {
            allowed: false,
            action: {
              type: rule.prevention.fallbackBehavior as any,
              reason: `Prevention rule triggered: ${rule.pattern}`,
              duration: rule.prevention.timeoutDuration,
              alternatives: this.getAlternatives(rule),
              userMessage: this.getUserMessage(rule)
            }
          };
        }
      }
    }

    // Connection allowed - select optimal strategy
    const optimalStrategy = await this.selectOptimalStrategy(endpoint, context);
    return {
      allowed: true,
      strategy: optimalStrategy
    };
  }

  /**
   * Create a managed connection with built-in failure prevention
   */
  async createManagedConnection(
    endpoint: string,
    strategy: ConnectionStrategy,
    context: Partial<AviDMCrashContext>
  ): Promise<ManagedConnection> {

    const connectionId = this.generateConnectionId(endpoint);
    const connection = new ManagedConnection(connectionId, endpoint, strategy, context);

    // Set up health monitoring
    const healthMonitor = new ConnectionHealthMonitor(connection, strategy.healthCheck);
    this.healthMonitors.set(connectionId, healthMonitor);

    // Set up automatic fallback on health degradation
    healthMonitor.on('healthDegraded', (health: ConnectionHealth) => {
      this.handleHealthDegradation(connection, health);
    });

    // Set up circuit breaker integration
    const circuitBreaker = this.getOrCreateCircuitBreaker(endpoint);
    connection.on('connectionFailed', () => {
      circuitBreaker.recordFailure();
    });

    connection.on('connectionSucceeded', () => {
      circuitBreaker.recordSuccess();
    });

    // Track connection in active list
    this.activeConnections.set(connectionId, connection);

    // Start connection attempt
    try {
      await connection.connect();
      this.recordSuccessfulConnection(endpoint, strategy);
    } catch (error) {
      this.recordFailedConnection(endpoint, strategy, error as Error);
      throw error;
    }

    return connection;
  }

  /**
   * Handle connection health degradation
   */
  private async handleHealthDegradation(
    connection: ManagedConnection,
    health: ConnectionHealth
  ): Promise<void> {

    const criticalIssues = health.issues.filter(issue => issue.severity === 'critical');

    if (criticalIssues.length > 0) {
      // Immediate action required
      await this.executeEmergencyFallback(connection, criticalIssues);
    } else if (health.score < 0.3) {
      // Gradual degradation - start fallback preparation
      await this.prepareFallback(connection, health);
    }

    // Update prevention rules based on health patterns
    this.updatePreventionRulesFromHealth(connection, health);
  }

  /**
   * Execute emergency fallback when connection becomes critically unhealthy
   */
  private async executeEmergencyFallback(
    connection: ManagedConnection,
    issues: HealthIssue[]
  ): Promise<void> {

    console.warn('🚨 Emergency fallback triggered for connection:', connection.id, issues);

    // Activate circuit breaker immediately
    const circuitBreaker = this.getOrCreateCircuitBreaker(connection.endpoint);
    circuitBreaker.forceOpen();

    // Switch to fallback strategy
    const fallbackStrategy = connection.strategy.fallbackStrategy ||
                           this.connectionStrategies.get('emergency_polling');

    if (fallbackStrategy) {
      try {
        const fallbackConnection = await this.createManagedConnection(
          connection.endpoint,
          fallbackStrategy,
          connection.context
        );

        // Migrate active requests to fallback connection
        await this.migrateConnection(connection, fallbackConnection);

        // Close unhealthy connection
        await connection.disconnect();

        this.emit('emergencyFallbackCompleted', {
          originalConnection: connection.id,
          fallbackConnection: fallbackConnection.id,
          issues
        });

      } catch (fallbackError) {
        // Fallback failed - activate graceful degradation
        await this.gracefulDegradation.activateOfflineMode(connection.context);

        this.emit('gracefulDegradationActivated', {
          connection: connection.id,
          reason: 'fallback_failed',
          error: fallbackError
        });
      }
    }
  }

  // ============================================================================
  // CONNECTION STRATEGIES
  // ============================================================================

  private initializeConnectionStrategies(): void {
    // High-performance WebSocket strategy
    this.connectionStrategies.set('websocket_optimized', {
      type: 'websocket',
      priority: 100,
      timeout: 5000,
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: true,
        retryConditions: [{
          errorType: ['timeout', 'network'],
          httpStatusCodes: [502, 503, 504],
          networkStates: ['online'],
          maxConsecutiveFailures: 2
        }]
      },
      fallbackStrategy: this.connectionStrategies.get('sse_reliable'),
      healthCheck: {
        interval: 30000,
        timeout: 5000,
        failureThreshold: 3,
        recoveryThreshold: 2,
        pingMessage: { type: 'ping', timestamp: Date.now() }
      }
    });

    // Reliable SSE strategy
    this.connectionStrategies.set('sse_reliable', {
      type: 'sse',
      priority: 80,
      timeout: 15000,
      retryPolicy: {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 1.5,
        jitter: true,
        retryConditions: [{
          errorType: ['timeout', 'network', 'protocol'],
          httpStatusCodes: [500, 502, 503, 504],
          networkStates: ['online', 'slow'],
          maxConsecutiveFailures: 3
        }]
      },
      fallbackStrategy: this.connectionStrategies.get('polling_robust'),
      healthCheck: {
        interval: 45000,
        timeout: 10000,
        failureThreshold: 4,
        recoveryThreshold: 2
      }
    });

    // Robust polling strategy (last resort)
    this.connectionStrategies.set('polling_robust', {
      type: 'polling',
      priority: 60,
      timeout: 30000,
      retryPolicy: {
        maxRetries: 10,
        baseDelay: 5000,
        maxDelay: 60000,
        backoffMultiplier: 1.2,
        jitter: true,
        retryConditions: [{
          errorType: ['timeout', 'network', 'server'],
          httpStatusCodes: [500, 502, 503, 504, 429],
          networkStates: ['online', 'slow', 'offline'],
          maxConsecutiveFailures: 5
        }]
      },
      healthCheck: {
        interval: 60000,
        timeout: 15000,
        failureThreshold: 5,
        recoveryThreshold: 1
      }
    });

    // Emergency polling for critical situations
    this.connectionStrategies.set('emergency_polling', {
      type: 'polling',
      priority: 40,
      timeout: 60000, // Very long timeout
      retryPolicy: {
        maxRetries: 20,
        baseDelay: 10000,
        maxDelay: 300000, // 5 minutes
        backoffMultiplier: 1.1,
        jitter: true,
        retryConditions: [{
          errorType: ['timeout', 'network', 'server', 'protocol'],
          httpStatusCodes: [400, 401, 403, 429, 500, 502, 503, 504],
          networkStates: ['online', 'slow', 'offline'],
          maxConsecutiveFailures: 10
        }]
      },
      healthCheck: {
        interval: 120000, // 2 minutes
        timeout: 30000,
        failureThreshold: 10,
        recoveryThreshold: 1
      }
    });

    // Hybrid strategy that switches based on conditions
    this.connectionStrategies.set('hybrid_adaptive', {
      type: 'hybrid',
      priority: 90,
      timeout: 10000,
      retryPolicy: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true,
        retryConditions: [{
          errorType: ['timeout', 'network'],
          httpStatusCodes: [502, 503, 504],
          networkStates: ['online'],
          maxConsecutiveFailures: 2
        }]
      },
      healthCheck: {
        interval: 20000,
        timeout: 5000,
        failureThreshold: 2,
        recoveryThreshold: 2
      }
    });
  }

  private setupPreventionRules(): void {
    // Rule: Prevent WebSocket connections on slow networks
    this.preventionRules.set('slow_network_websocket_prevention', {
      id: 'slow_network_websocket_prevention',
      pattern: 'WEBSOCKET_SLOW_NETWORK',
      trigger: 'click',
      prevention: {
        timeoutDuration: 0,
        maxRetries: 0,
        circuitBreakerThreshold: 1,
        fallbackBehavior: 'offline_mode',
        preemptiveCheck: true
      },
      effectiveness: 0.9,
      lastUpdated: Date.now()
    });

    // Rule: Prevent rapid consecutive connection attempts
    this.preventionRules.set('rapid_connection_prevention', {
      id: 'rapid_connection_prevention',
      pattern: 'RAPID_RECONNECTION',
      trigger: 'reconnect',
      prevention: {
        timeoutDuration: 30000,
        maxRetries: 3,
        circuitBreakerThreshold: 2,
        fallbackBehavior: 'retry_queue',
        preemptiveCheck: true
      },
      effectiveness: 0.85,
      lastUpdated: Date.now()
    });

    // Rule: Prevent connections during server overload
    this.preventionRules.set('server_overload_prevention', {
      id: 'server_overload_prevention',
      pattern: 'SERVER_OVERLOAD',
      trigger: 'send_message',
      prevention: {
        timeoutDuration: 60000,
        maxRetries: 1,
        circuitBreakerThreshold: 1,
        fallbackBehavior: 'cache_response',
        preemptiveCheck: true
      },
      effectiveness: 0.95,
      lastUpdated: Date.now()
    });
  }

  private async selectOptimalStrategy(
    endpoint: string,
    context: Partial<AviDMCrashContext>
  ): Promise<ConnectionStrategy> {

    // Get network quality metrics
    const networkQuality = await this.networkQualityMonitor.getCurrentQuality();

    // Get connection history for this endpoint
    const history = this.connectionHistory.get(endpoint) || [];

    // Calculate success rates for each strategy
    const strategyPerformance = new Map<string, number>();

    for (const [strategyName, strategy] of this.connectionStrategies) {
      const relevantAttempts = history.filter(attempt =>
        attempt.strategy === strategyName &&
        Date.now() - attempt.timestamp < 300000 // Last 5 minutes
      );

      const successRate = relevantAttempts.length > 0 ?
        relevantAttempts.filter(a => a.success).length / relevantAttempts.length :
        0.5; // Default assumption

      strategyPerformance.set(strategyName, successRate);
    }

    // Select strategy based on network conditions and performance
    if (networkQuality.connectionType === 'slow-2g' || networkQuality.rtt > 2000) {
      return this.connectionStrategies.get('polling_robust')!;
    }

    if (networkQuality.connectionType === '3g' || networkQuality.rtt > 500) {
      const ssePerformance = strategyPerformance.get('sse_reliable') || 0.5;
      if (ssePerformance > 0.7) {
        return this.connectionStrategies.get('sse_reliable')!;
      }
      return this.connectionStrategies.get('polling_robust')!;
    }

    // For good network conditions, prefer WebSocket if it's performing well
    const websocketPerformance = strategyPerformance.get('websocket_optimized') || 0.5;
    if (websocketPerformance > 0.8) {
      return this.connectionStrategies.get('websocket_optimized')!;
    }

    // Fall back to hybrid adaptive strategy
    return this.connectionStrategies.get('hybrid_adaptive')!;
  }

  // ============================================================================
  // CIRCUIT BREAKER IMPLEMENTATION
  // ============================================================================

  private getOrCreateCircuitBreaker(endpoint: string): CircuitBreaker {
    if (!this.circuitBreakers.has(endpoint)) {
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: this.config.circuitBreakerThreshold,
        recoveryTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000, // 1 minute
        volumeThreshold: 5 // Minimum requests before circuit breaker activates
      });

      this.circuitBreakers.set(endpoint, circuitBreaker);
    }

    return this.circuitBreakers.get(endpoint)!;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateConnectionId(endpoint: string): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isRateLimited(endpoint: string, context: Partial<AviDMCrashContext>): boolean {
    // Simple rate limiting implementation
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const maxRequests = 10;

    const history = this.connectionHistory.get(endpoint) || [];
    const recentAttempts = history.filter(attempt =>
      now - attempt.timestamp < windowSize
    );

    return recentAttempts.length >= maxRequests;
  }

  private ruleApplies(rule: AviDMPreventionRule, context: Partial<AviDMCrashContext>): boolean {
    // Check if prevention rule applies to current context
    if (context.uiState?.userInteractionTrigger !== rule.trigger) {
      return false;
    }

    // Add more sophisticated rule matching logic here
    return true;
  }

  private evaluatePreventionRule(rule: AviDMPreventionRule, context: Partial<AviDMCrashContext>): boolean {
    // Evaluate if rule should trigger prevention
    return rule.effectiveness > 0.7; // Simple threshold check
  }

  private getAlternatives(rule: AviDMPreventionRule): string[] {
    switch (rule.prevention.fallbackBehavior) {
      case 'offline_mode': return ['cached_data', 'manual_refresh'];
      case 'cache_response': return ['offline_mode', 'manual_retry'];
      case 'retry_queue': return ['immediate_retry', 'cancel_request'];
      default: return ['try_again_later'];
    }
  }

  private getUserMessage(rule: AviDMPreventionRule): string {
    switch (rule.prevention.fallbackBehavior) {
      case 'offline_mode':
        return 'Working offline. Your changes will sync when connection is restored.';
      case 'cache_response':
        return 'Showing cached data. Refresh to get latest updates.';
      case 'retry_queue':
        return 'Message queued for delivery. You\'ll be notified when sent.';
      case 'error_message':
        return 'Connection temporarily unavailable. Please try again in a moment.';
      default:
        return 'Please wait a moment and try again.';
    }
  }

  private recordSuccessfulConnection(endpoint: string, strategy: ConnectionStrategy): void {
    const history = this.connectionHistory.get(endpoint) || [];
    history.push({
      timestamp: Date.now(),
      strategy: strategy.type,
      success: true,
      duration: 0, // Would be measured in real implementation
      error: null
    });

    // Keep only last 50 attempts
    if (history.length > 50) {
      history.shift();
    }

    this.connectionHistory.set(endpoint, history);
  }

  private recordFailedConnection(endpoint: string, strategy: ConnectionStrategy, error: Error): void {
    const history = this.connectionHistory.get(endpoint) || [];
    history.push({
      timestamp: Date.now(),
      strategy: strategy.type,
      success: false,
      duration: 0,
      error: error.message
    });

    if (history.length > 50) {
      history.shift();
    }

    this.connectionHistory.set(endpoint, history);
  }

  private startNetworkMonitoring(): void {
    this.networkQualityMonitor.on('qualityChanged', (quality: NetworkQualityMetrics) => {
      // Adjust strategies based on network quality changes
      this.adaptConnectionStrategies(quality);
    });

    this.networkQualityMonitor.startMonitoring();
  }

  private adaptConnectionStrategies(quality: NetworkQualityMetrics): void {
    // Adapt connection strategies based on network quality
    if (quality.rtt > 2000 || quality.downlink < 0.5) {
      // Poor network conditions - prefer polling
      this.connectionStrategies.get('polling_robust')!.priority = 100;
      this.connectionStrategies.get('websocket_optimized')!.priority = 40;
    } else if (quality.rtt < 100 && quality.downlink > 5) {
      // Excellent network - prefer WebSocket
      this.connectionStrategies.get('websocket_optimized')!.priority = 100;
      this.connectionStrategies.get('polling_robust')!.priority = 60;
    }
  }

  // Additional helper methods would be implemented here...
  private async migrateConnection(from: ManagedConnection, to: ManagedConnection): Promise<void> {
    // Implementation for migrating active requests between connections
  }

  private async prepareFallback(connection: ManagedConnection, health: ConnectionHealth): Promise<void> {
    // Implementation for preparing fallback connection
  }

  private updatePreventionRulesFromHealth(connection: ManagedConnection, health: ConnectionHealth): void {
    // Implementation for updating prevention rules based on health patterns
  }
}

// ============================================================================
// SUPPORTING CLASSES
// ============================================================================

interface ConnectionAttempt {
  timestamp: number;
  strategy: string;
  success: boolean;
  duration: number;
  error: string | null;
}

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
    volumeThreshold: number;
  }) {}

  shouldAllowRequest(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow limited requests
    return true;
  }

  recordSuccess(): void {
    this.successCount++;

    if (this.state === 'HALF_OPEN' && this.successCount >= 2) {
      this.state = 'CLOSED';
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }

  forceOpen(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
  }

  getRecoveryTime(): number {
    if (this.state !== 'OPEN') return 0;
    return Math.max(0, this.config.recoveryTimeout - (Date.now() - this.lastFailureTime));
  }
}

class ConnectionHealthMonitor extends EventEmitter {
  private healthHistory: ConnectionHealth[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    private connection: ManagedConnection,
    private config: HealthCheckConfig
  ) {
    super();
    this.startMonitoring();
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        this.healthHistory.push(health);

        // Keep only last 20 health checks
        if (this.healthHistory.length > 20) {
          this.healthHistory.shift();
        }

        if (health.score < 0.3) {
          this.emit('healthDegraded', health);
        }

      } catch (error) {
        this.emit('monitoringError', error);
      }
    }, this.config.interval);
  }

  private async checkHealth(): Promise<ConnectionHealth> {
    // Implementation for health checking
    return {
      score: 0.8,
      latency: 100,
      errorRate: 0.1,
      throughput: 1000,
      stability: 0.9,
      lastCheck: Date.now(),
      issues: []
    };
  }

  dispose(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}

class ManagedConnection extends EventEmitter {
  public isConnected = false;
  public isConnecting = false;
  private reconnectAttempts = 0;

  constructor(
    public readonly id: string,
    public readonly endpoint: string,
    public readonly strategy: ConnectionStrategy,
    public readonly context: Partial<AviDMCrashContext>
  ) {
    super();
  }

  async connect(): Promise<void> {
    this.isConnecting = true;

    try {
      // Implementation would create actual connection based on strategy
      await this.performConnection();
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.emit('connectionSucceeded');

    } catch (error) {
      this.isConnecting = false;
      this.reconnectAttempts++;
      this.emit('connectionFailed', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.isConnecting = false;
    // Implementation would close actual connection
  }

  private async performConnection(): Promise<void> {
    // Implementation would vary based on strategy.type
    switch (this.strategy.type) {
      case 'websocket':
        return this.createWebSocketConnection();
      case 'sse':
        return this.createSSEConnection();
      case 'polling':
        return this.createPollingConnection();
      default:
        throw new Error(`Unsupported connection type: ${this.strategy.type}`);
    }
  }

  private async createWebSocketConnection(): Promise<void> {
    // WebSocket connection implementation
  }

  private async createSSEConnection(): Promise<void> {
    // SSE connection implementation
  }

  private async createPollingConnection(): Promise<void> {
    // Polling connection implementation
  }
}

class AdaptiveConnectionManager {
  getStrategyForNetworkConditions(conditions: NetworkQualityMetrics): ConnectionStrategy {
    // Return appropriate strategy based on network conditions
    return {
      type: 'polling',
      priority: 60,
      timeout: 30000,
      retryPolicy: {
        maxRetries: 5,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 1.5,
        jitter: true,
        retryConditions: []
      },
      healthCheck: {
        interval: 60000,
        timeout: 15000,
        failureThreshold: 5,
        recoveryThreshold: 1
      }
    };
  }
}

class GracefulDegradationManager {
  async activateOfflineMode(context: Partial<AviDMCrashContext>): Promise<void> {
    // Implementation for offline mode activation
  }
}

class NetworkQualityMonitor extends EventEmitter {
  private currentQuality: NetworkQualityMetrics = {
    connectionType: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    isOnline: true,
    timestamp: Date.now()
  };

  startMonitoring(): void {
    // Implementation for network quality monitoring
    // Would use Navigator.connection API where available
  }

  async getCurrentQuality(): Promise<NetworkQualityMetrics> {
    return this.currentQuality;
  }
}

export default WebSocketSSEPreventionSystem;
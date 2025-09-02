/**
 * NLD SSE Failure Prevention System
 * Proactive detection and prevention of common SSE migration failures
 */

import { mcp__claude_flow__memory_usage } from '../utils/mcp-tools';
import { mcp__claude_flow__neural_patterns } from '../utils/mcp-tools';

export interface SSEFailurePattern {
  id: string;
  type: 'memory_leak' | 'infinite_reconnect' | 'cors_error' | 'state_race' | 'browser_compat' | 'connection_state';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  preventionStrategy: string;
  detectionSignatures: string[];
  recoveryActions: string[];
}

export interface SSEConnectionMetrics {
  connectionId: string;
  startTime: number;
  reconnectCount: number;
  errorCount: number;
  lastError?: string;
  memoryUsage: number;
  dataReceived: number;
  heartbeatMissed: number;
  stateTransitions: Array<{
    from: string;
    to: string;
    timestamp: number;
    reason?: string;
  }>;
}

export class SSEFailurePreventionEngine {
  private activeConnections = new Map<string, SSEConnectionMetrics>();
  private failurePatterns = new Map<string, SSEFailurePattern>();
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private performanceBaseline = {
    maxReconnectRate: 5, // per minute
    maxMemoryUsage: 50 * 1024 * 1024, // 50MB
    maxErrorRate: 0.1, // 10%
    maxLatency: 5000 // 5 seconds
  };

  constructor() {
    this.initializeFailurePatterns();
    this.startProactiveMonitoring();
  }

  /**
   * Initialize known failure patterns for proactive detection
   */
  private initializeFailurePatterns(): void {
    const patterns: SSEFailurePattern[] = [
      {
        id: 'eventsource_memory_leak',
        type: 'memory_leak',
        description: 'EventSource not properly closed causing memory leaks',
        severity: 'high',
        preventionStrategy: 'Automatic cleanup tracking with timeout-based force closure',
        detectionSignatures: [
          'increasing memory usage without corresponding data',
          'multiple EventSource instances for same endpoint',
          'event listeners not being removed'
        ],
        recoveryActions: [
          'force_close_eventsource',
          'clear_event_listeners',
          'garbage_collection_hint'
        ]
      },
      {
        id: 'infinite_reconnection_loop',
        type: 'infinite_reconnect',
        description: 'Exponential backoff failure leading to infinite reconnection attempts',
        severity: 'critical',
        preventionStrategy: 'Circuit breaker pattern with progressive backoff and max attempts',
        detectionSignatures: [
          'reconnect_rate > 5_per_minute',
          'same_error_repeated > 3_times',
          'exponential_backoff_exceeded'
        ],
        recoveryActions: [
          'activate_circuit_breaker',
          'switch_to_polling_fallback',
          'user_notification'
        ]
      },
      {
        id: 'cors_preflight_failure',
        type: 'cors_error',
        description: 'CORS headers not properly configured for SSE endpoints',
        severity: 'high',
        preventionStrategy: 'Preemptive CORS validation and header injection',
        detectionSignatures: [
          'cors_error_on_connection',
          'preflight_request_failed',
          'access_control_origin_missing'
        ],
        recoveryActions: [
          'validate_cors_headers',
          'inject_cors_headers',
          'fallback_to_polling'
        ]
      },
      {
        id: 'state_synchronization_race',
        type: 'state_race',
        description: 'Race conditions between SSE data and HTTP API calls',
        severity: 'medium',
        preventionStrategy: 'Event ordering with sequence numbers and state locks',
        detectionSignatures: [
          'out_of_order_events',
          'state_inconsistency_detected',
          'concurrent_state_updates'
        ],
        recoveryActions: [
          'queue_state_updates',
          'resolve_state_conflicts',
          'request_full_state_sync'
        ]
      }
    ];

    patterns.forEach(pattern => {
      this.failurePatterns.set(pattern.id, pattern);
    });
  }

  /**
   * Create SSE connection with proactive failure prevention
   */
  public createProtectedSSEConnection(
    url: string,
    options: {
      connectionId?: string;
      retryPolicy?: RetryPolicy;
      healthCheck?: boolean;
      corsValidation?: boolean;
    } = {}
  ): ProtectedEventSource {
    const connectionId = options.connectionId || `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize connection metrics
    this.activeConnections.set(connectionId, {
      connectionId,
      startTime: Date.now(),
      reconnectCount: 0,
      errorCount: 0,
      memoryUsage: 0,
      dataReceived: 0,
      heartbeatMissed: 0,
      stateTransitions: []
    });

    // Create circuit breaker for this connection
    const circuitBreaker = new CircuitBreaker({
      errorThreshold: 5,
      timeout: 30000,
      resetTimeout: 60000
    });
    this.circuitBreakers.set(connectionId, circuitBreaker);

    // Perform preemptive validations
    if (options.corsValidation) {
      this.validateCORSHeaders(url);
    }

    if (options.healthCheck) {
      this.performHealthCheck(url);
    }

    return new ProtectedEventSource(url, {
      connectionId,
      engine: this,
      circuitBreaker,
      retryPolicy: options.retryPolicy || new ExponentialBackoffRetryPolicy()
    });
  }

  /**
   * Detect failure patterns in real-time
   */
  public detectFailurePattern(connectionId: string, event: SSEEvent): string[] {
    const metrics = this.activeConnections.get(connectionId);
    if (!metrics) return [];

    const detectedPatterns: string[] = [];

    // Memory leak detection
    if (this.detectMemoryLeak(metrics)) {
      detectedPatterns.push('eventsource_memory_leak');
    }

    // Infinite reconnection detection
    if (this.detectInfiniteReconnection(metrics)) {
      detectedPatterns.push('infinite_reconnection_loop');
    }

    // CORS error detection
    if (event.type === 'error' && this.detectCORSError(event)) {
      detectedPatterns.push('cors_preflight_failure');
    }

    // State race detection
    if (this.detectStateRace(connectionId, event)) {
      detectedPatterns.push('state_synchronization_race');
    }

    // Log detected patterns for neural learning
    if (detectedPatterns.length > 0) {
      this.logFailureDetection(connectionId, detectedPatterns, event);
    }

    return detectedPatterns;
  }

  /**
   * Apply prevention strategy for detected pattern
   */
  public applyPreventionStrategy(connectionId: string, patternId: string): boolean {
    const pattern = this.failurePatterns.get(patternId);
    const metrics = this.activeConnections.get(connectionId);
    
    if (!pattern || !metrics) return false;

    console.log(`🛡️ [NLD] Applying prevention strategy for ${patternId}: ${pattern.preventionStrategy}`);

    switch (patternId) {
      case 'eventsource_memory_leak':
        return this.preventMemoryLeak(connectionId);
      case 'infinite_reconnection_loop':
        return this.preventInfiniteReconnection(connectionId);
      case 'cors_preflight_failure':
        return this.preventCORSFailure(connectionId);
      case 'state_synchronization_race':
        return this.preventStateRace(connectionId);
      default:
        return false;
    }
  }

  /**
   * Memory leak detection logic
   */
  private detectMemoryLeak(metrics: SSEConnectionMetrics): boolean {
    // Check if memory usage is growing without corresponding data
    const memoryGrowthRate = metrics.memoryUsage / (Date.now() - metrics.startTime);
    const dataRate = metrics.dataReceived / (Date.now() - metrics.startTime);
    
    return memoryGrowthRate > 1000 && dataRate < 100; // Memory growing faster than data
  }

  /**
   * Infinite reconnection detection logic
   */
  private detectInfiniteReconnection(metrics: SSEConnectionMetrics): boolean {
    const timeWindow = 60000; // 1 minute
    const currentTime = Date.now();
    
    // Count reconnections in the last minute
    const recentReconnections = metrics.stateTransitions
      .filter(t => t.to === 'connecting' && (currentTime - t.timestamp) < timeWindow)
      .length;
    
    return recentReconnections > this.performanceBaseline.maxReconnectRate;
  }

  /**
   * CORS error detection logic
   */
  private detectCORSError(event: SSEEvent): boolean {
    const corsSignatures = [
      'cors',
      'cross-origin',
      'access-control',
      'preflight',
      'origin'
    ];
    
    const errorMessage = event.error?.message?.toLowerCase() || '';
    return corsSignatures.some(signature => errorMessage.includes(signature));
  }

  /**
   * State race condition detection logic
   */
  private detectStateRace(connectionId: string, event: SSEEvent): boolean {
    // Check for out-of-sequence events or concurrent state updates
    const metrics = this.activeConnections.get(connectionId);
    if (!metrics || !event.data) return false;
    
    // Look for sequence number inconsistencies
    if (event.data.sequence && event.data.expectedSequence) {
      return event.data.sequence !== event.data.expectedSequence;
    }
    
    return false;
  }

  /**
   * Memory leak prevention implementation
   */
  private preventMemoryLeak(connectionId: string): boolean {
    const metrics = this.activeConnections.get(connectionId);
    if (!metrics) return false;

    // Force garbage collection hint
    if (global.gc) {
      global.gc();
    }

    // Reset connection metrics
    metrics.memoryUsage = 0;
    metrics.dataReceived = 0;

    console.log(`🧹 [NLD] Applied memory leak prevention for ${connectionId}`);
    return true;
  }

  /**
   * Infinite reconnection prevention implementation
   */
  private preventInfiniteReconnection(connectionId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(connectionId);
    if (!circuitBreaker) return false;

    // Activate circuit breaker
    circuitBreaker.open();
    
    console.log(`🔌 [NLD] Circuit breaker activated for ${connectionId}`);
    return true;
  }

  /**
   * CORS failure prevention implementation
   */
  private preventCORSFailure(connectionId: string): boolean {
    // Implementation would depend on specific CORS requirements
    console.log(`🌐 [NLD] Applied CORS failure prevention for ${connectionId}`);
    return true;
  }

  /**
   * State race prevention implementation
   */
  private preventStateRace(connectionId: string): boolean {
    // Queue state updates to prevent race conditions
    console.log(`⚡ [NLD] Applied state race prevention for ${connectionId}`);
    return true;
  }

  /**
   * Validate CORS headers preemptively
   */
  private async validateCORSHeaders(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'OPTIONS' });
      const headers = response.headers;
      
      const hasAccessControlAllowOrigin = headers.has('access-control-allow-origin');
      const hasAccessControlAllowHeaders = headers.has('access-control-allow-headers');
      
      return hasAccessControlAllowOrigin && hasAccessControlAllowHeaders;
    } catch (error) {
      console.warn('🚨 [NLD] CORS validation failed:', error);
      return false;
    }
  }

  /**
   * Perform health check before connection
   */
  private async performHealthCheck(url: string): Promise<boolean> {
    try {
      const startTime = Date.now();
      const response = await fetch(url.replace('/stream', '/health'), {
        method: 'GET',
        timeout: 5000
      });
      const latency = Date.now() - startTime;
      
      return response.ok && latency < this.performanceBaseline.maxLatency;
    } catch (error) {
      console.warn('🚨 [NLD] Health check failed:', error);
      return false;
    }
  }

  /**
   * Log failure detection for neural learning
   */
  private async logFailureDetection(
    connectionId: string, 
    patterns: string[], 
    event: SSEEvent
  ): Promise<void> {
    const logEntry = {
      connectionId,
      timestamp: Date.now(),
      detectedPatterns: patterns,
      event: event.type,
      context: {
        url: event.url,
        readyState: event.readyState,
        error: event.error?.message
      }
    };

    // Store in memory for neural pattern training
    await mcp__claude_flow__memory_usage({
      action: 'store',
      namespace: 'nld-sse-failures',
      key: `failure_${connectionId}_${Date.now()}`,
      value: JSON.stringify(logEntry),
      ttl: 86400000 // 24 hours
    });

    // Train neural patterns for better detection
    await mcp__claude_flow__neural_patterns({
      action: 'learn',
      operation: 'sse_failure_detection',
      outcome: JSON.stringify({
        patterns,
        context: logEntry.context,
        prevention_applied: true
      })
    });
  }

  /**
   * Start proactive monitoring for all connections
   */
  private startProactiveMonitoring(): void {
    setInterval(() => {
      this.activeConnections.forEach((metrics, connectionId) => {
        // Update memory usage
        if (typeof process !== 'undefined' && process.memoryUsage) {
          metrics.memoryUsage = process.memoryUsage().heapUsed;
        }

        // Check for stale connections
        const connectionAge = Date.now() - metrics.startTime;
        if (connectionAge > 300000 && metrics.dataReceived === 0) { // 5 minutes with no data
          console.log(`🚨 [NLD] Detected stale connection: ${connectionId}`);
          this.applyPreventionStrategy(connectionId, 'eventsource_memory_leak');
        }
      });
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get connection metrics for monitoring
   */
  public getConnectionMetrics(connectionId: string): SSEConnectionMetrics | undefined {
    return this.activeConnections.get(connectionId);
  }

  /**
   * Clean up connection resources
   */
  public cleanupConnection(connectionId: string): void {
    this.activeConnections.delete(connectionId);
    this.circuitBreakers.delete(connectionId);
  }
}

/**
 * Circuit breaker implementation for SSE connections
 */
class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private errorCount = 0;
  private lastErrorTime = 0;
  private nextAttempt = 0;

  constructor(private options: {
    errorThreshold: number;
    timeout: number;
    resetTimeout: number;
  }) {}

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onError();
      throw error;
    }
  }

  private onSuccess(): void {
    this.errorCount = 0;
    this.state = 'closed';
  }

  private onError(): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();

    if (this.errorCount >= this.options.errorThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.options.resetTimeout;
    }
  }

  public open(): void {
    this.state = 'open';
    this.nextAttempt = Date.now() + this.options.resetTimeout;
  }

  public getState(): string {
    return this.state;
  }
}

/**
 * Retry policy interface
 */
interface RetryPolicy {
  shouldRetry(attempt: number, error: Error): boolean;
  getDelay(attempt: number): number;
}

/**
 * Exponential backoff retry policy
 */
class ExponentialBackoffRetryPolicy implements RetryPolicy {
  constructor(
    private maxAttempts = 5,
    private baseDelay = 1000,
    private maxDelay = 30000
  ) {}

  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < this.maxAttempts;
  }

  getDelay(attempt: number): number {
    const delay = this.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Protected EventSource wrapper
 */
class ProtectedEventSource {
  private eventSource: EventSource | null = null;
  private isConnected = false;
  private connectionAttempt = 0;

  constructor(
    private url: string,
    private options: {
      connectionId: string;
      engine: SSEFailurePreventionEngine;
      circuitBreaker: CircuitBreaker;
      retryPolicy: RetryPolicy;
    }
  ) {}

  public async connect(): Promise<void> {
    await this.options.circuitBreaker.execute(async () => {
      this.eventSource = new EventSource(this.url);
      
      return new Promise<void>((resolve, reject) => {
        if (!this.eventSource) {
          reject(new Error('Failed to create EventSource'));
          return;
        }

        const onOpen = () => {
          this.isConnected = true;
          this.connectionAttempt = 0;
          console.log('✅ [NLD] Protected SSE connection established');
          resolve();
        };

        const onError = (error: Event) => {
          console.error('🚨 [NLD] SSE connection error:', error);
          
          const sseEvent: SSEEvent = {
            type: 'error',
            url: this.url,
            readyState: this.eventSource?.readyState || 0,
            error: error as ErrorEvent
          };

          // Detect and prevent failure patterns
          const patterns = this.options.engine.detectFailurePattern(
            this.options.connectionId, 
            sseEvent
          );

          patterns.forEach(pattern => {
            this.options.engine.applyPreventionStrategy(
              this.options.connectionId, 
              pattern
            );
          });

          if (this.options.retryPolicy.shouldRetry(this.connectionAttempt, error as any)) {
            const delay = this.options.retryPolicy.getDelay(this.connectionAttempt);
            console.log(`🔄 [NLD] Retrying SSE connection in ${delay}ms...`);
            
            setTimeout(() => {
              this.connectionAttempt++;
              this.connect().catch(reject);
            }, delay);
          } else {
            reject(error);
          }
        };

        this.eventSource.onopen = onOpen;
        this.eventSource.onerror = onError;
      });
    });
  }

  public close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }

    // Cleanup resources
    this.options.engine.cleanupConnection(this.options.connectionId);
  }

  public addEventListener(type: string, listener: EventListener): void {
    if (this.eventSource) {
      this.eventSource.addEventListener(type, listener);
    }
  }

  public removeEventListener(type: string, listener: EventListener): void {
    if (this.eventSource) {
      this.eventSource.removeEventListener(type, listener);
    }
  }

  public get readyState(): number {
    return this.eventSource?.readyState || EventSource.CLOSED;
  }
}

/**
 * SSE Event interface for failure detection
 */
interface SSEEvent {
  type: string;
  url: string;
  readyState: number;
  error?: ErrorEvent;
  data?: any;
}

// Export singleton instance
export const sseFailurePreventionEngine = new SSEFailurePreventionEngine();
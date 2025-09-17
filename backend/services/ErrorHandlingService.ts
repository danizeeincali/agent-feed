/**
 * Error Handling and Retry Logic Service
 *
 * Comprehensive error handling system for the cost tracking service
 * with retry mechanisms, circuit breakers, and fault tolerance
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface ErrorConfig {
  retryPolicy: {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterEnabled: boolean;
  };
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
  };
  deadLetterQueue: {
    enabled: boolean;
    maxSize: number;
    retentionPeriod: number;
  };
  alerting: {
    errorRateThreshold: number;
    timeWindow: number;
    webhookUrl?: string;
  };
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Map<string, number>;
  errorsByOperation: Map<string, number>;
  retryAttempts: number;
  successfulRetries: number;
  circuitBreakerTrips: number;
  averageRetryDelay: number;
  lastErrorTime?: Date;
  errorRate: number; // errors per minute
}

export interface OperationError {
  id: string;
  operationType: string;
  operationId: string;
  error: Error;
  timestamp: Date;
  retryAttempt: number;
  context?: Record<string, any>;
  stackTrace?: string;
  userImpact: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetryableOperation<T = any> {
  id: string;
  operation: () => Promise<T>;
  operationType: string;
  context?: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  lastAttempt: Date;
  nextAttempt: Date;
  backoffDelay: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
  totalRequests: number;
  successfulRequests: number;
}

export class ErrorHandlingService extends EventEmitter {
  private config: ErrorConfig;
  private metrics: ErrorMetrics;
  private retryQueue: Map<string, RetryableOperation> = new Map();
  private deadLetterQueue: OperationError[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorHistory: OperationError[] = [];
  private retryInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: Partial<ErrorConfig> = {}) {
    super();

    this.config = {
      retryPolicy: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterEnabled: true
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
        monitoringPeriod: 300000 // 5 minutes
      },
      deadLetterQueue: {
        enabled: true,
        maxSize: 1000,
        retentionPeriod: 86400000 // 24 hours
      },
      alerting: {
        errorRateThreshold: 10, // errors per minute
        timeWindow: 300000 // 5 minutes
      },
      ...config
    };

    this.metrics = {
      totalErrors: 0,
      errorsByType: new Map(),
      errorsByOperation: new Map(),
      retryAttempts: 0,
      successfulRetries: 0,
      circuitBreakerTrips: 0,
      averageRetryDelay: 0,
      errorRate: 0
    };

    this.startBackgroundTasks();
  }

  /**
   * Execute an operation with error handling and retry logic
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: {
      maxRetries?: number;
      context?: Record<string, any>;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      userImpact?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<T> {
    const operationId = uuidv4();
    const maxRetries = options.maxRetries ?? this.config.retryPolicy.maxRetries;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(operationType)) {
      throw new Error(`Circuit breaker is open for operation type: ${operationType}`);
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Record attempt
        this.recordAttempt(operationType);

        const result = await operation();

        // Record success
        this.recordSuccess(operationType);

        // If this was a retry, record successful retry
        if (attempt > 0) {
          this.metrics.successfulRetries++;
          this.emit('retrySuccess', {
            operationType,
            operationId,
            attempt,
            totalAttempts: attempt + 1
          });
        }

        return result;

      } catch (error) {
        const operationError: OperationError = {
          id: uuidv4(),
          operationType,
          operationId,
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
          retryAttempt: attempt,
          context: options.context,
          stackTrace: error instanceof Error ? error.stack : undefined,
          userImpact: options.userImpact || 'medium'
        };

        // Record error
        this.recordError(operationError);

        // If this is the last attempt, handle final failure
        if (attempt >= maxRetries) {
          await this.handleFinalFailure(operationError, maxRetries);
          throw error;
        }

        // Calculate retry delay
        const delay = this.calculateRetryDelay(attempt);

        this.emit('retryAttempt', {
          operationType,
          operationId,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          delay,
          error: operationError
        });

        // Wait before retry
        await this.delay(delay);
        this.metrics.retryAttempts++;
      }
    }

    throw new Error('Unexpected end of retry loop');
  }

  /**
   * Queue an operation for background retry
   */
  public queueForRetry<T>(
    operation: () => Promise<T>,
    operationType: string,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      context?: Record<string, any>;
      maxRetries?: number;
    } = {}
  ): string {
    const operationId = uuidv4();
    const maxRetries = options.maxRetries ?? this.config.retryPolicy.maxRetries;

    const retryableOperation: RetryableOperation<T> = {
      id: operationId,
      operation,
      operationType,
      context: options.context,
      retryCount: 0,
      maxRetries,
      lastAttempt: new Date(),
      nextAttempt: new Date(Date.now() + this.config.retryPolicy.initialDelay),
      backoffDelay: this.config.retryPolicy.initialDelay,
      priority: options.priority || 'medium'
    };

    this.retryQueue.set(operationId, retryableOperation);

    this.emit('operationQueued', {
      operationId,
      operationType,
      priority: options.priority
    });

    return operationId;
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const now = new Date();
    const operationsToRetry: RetryableOperation[] = [];

    // Find operations ready for retry
    for (const operation of this.retryQueue.values()) {
      if (operation.nextAttempt <= now) {
        operationsToRetry.push(operation);
      }
    }

    // Sort by priority and timestamp
    operationsToRetry.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }

      return a.nextAttempt.getTime() - b.nextAttempt.getTime(); // Earlier first
    });

    // Process operations (limit concurrent retries)
    const maxConcurrentRetries = 5;
    const batchSize = Math.min(operationsToRetry.length, maxConcurrentRetries);

    for (let i = 0; i < batchSize; i++) {
      const operation = operationsToRetry[i];
      this.processRetryOperation(operation).catch(console.error);
    }
  }

  private async processRetryOperation(operation: RetryableOperation): Promise<void> {
    try {
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(operation.operationType)) {
        this.scheduleNextRetry(operation);
        return;
      }

      const result = await operation.operation();

      // Success - remove from queue
      this.retryQueue.delete(operation.id);
      this.recordSuccess(operation.operationType);
      this.metrics.successfulRetries++;

      this.emit('queuedRetrySuccess', {
        operationId: operation.id,
        operationType: operation.operationType,
        totalAttempts: operation.retryCount + 1
      });

    } catch (error) {
      operation.retryCount++;
      operation.lastAttempt = new Date();

      const operationError: OperationError = {
        id: uuidv4(),
        operationType: operation.operationType,
        operationId: operation.id,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: new Date(),
        retryAttempt: operation.retryCount,
        context: operation.context,
        userImpact: 'medium'
      };

      this.recordError(operationError);

      if (operation.retryCount >= operation.maxRetries) {
        // Move to dead letter queue
        this.retryQueue.delete(operation.id);
        await this.addToDeadLetterQueue(operationError);

        this.emit('queuedRetryFailed', {
          operationId: operation.id,
          operationType: operation.operationType,
          totalAttempts: operation.retryCount,
          error: operationError
        });
      } else {
        // Schedule next retry
        this.scheduleNextRetry(operation);

        this.emit('queuedRetryAttempt', {
          operationId: operation.id,
          operationType: operation.operationType,
          attempt: operation.retryCount,
          nextAttempt: operation.nextAttempt
        });
      }
    }
  }

  private scheduleNextRetry(operation: RetryableOperation): void {
    operation.backoffDelay = Math.min(
      operation.backoffDelay * this.config.retryPolicy.backoffMultiplier,
      this.config.retryPolicy.maxDelay
    );

    let delay = operation.backoffDelay;

    // Add jitter if enabled
    if (this.config.retryPolicy.jitterEnabled) {
      delay = delay + (Math.random() * delay * 0.1); // Up to 10% jitter
    }

    operation.nextAttempt = new Date(Date.now() + delay);
  }

  private calculateRetryDelay(attempt: number): number {
    let delay = this.config.retryPolicy.initialDelay *
                Math.pow(this.config.retryPolicy.backoffMultiplier, attempt);

    delay = Math.min(delay, this.config.retryPolicy.maxDelay);

    // Add jitter if enabled
    if (this.config.retryPolicy.jitterEnabled) {
      delay = delay + (Math.random() * delay * 0.1);
    }

    return Math.floor(delay);
  }

  /**
   * Circuit breaker methods
   */
  private isCircuitBreakerOpen(operationType: string): boolean {
    const state = this.getCircuitBreakerState(operationType);

    if (state.state === 'open') {
      if (state.nextAttemptTime && new Date() >= state.nextAttemptTime) {
        // Transition to half-open
        state.state = 'half-open';
        this.emit('circuitBreakerHalfOpen', { operationType });
        return false;
      }
      return true;
    }

    return false;
  }

  private getCircuitBreakerState(operationType: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationType)) {
      this.circuitBreakers.set(operationType, {
        state: 'closed',
        failureCount: 0,
        totalRequests: 0,
        successfulRequests: 0
      });
    }
    return this.circuitBreakers.get(operationType)!;
  }

  private recordAttempt(operationType: string): void {
    const state = this.getCircuitBreakerState(operationType);
    state.totalRequests++;
  }

  private recordSuccess(operationType: string): void {
    const state = this.getCircuitBreakerState(operationType);
    state.successfulRequests++;
    state.lastSuccessTime = new Date();

    if (state.state === 'half-open') {
      // Transition back to closed
      state.state = 'closed';
      state.failureCount = 0;
      this.emit('circuitBreakerClosed', { operationType });
    } else if (state.state === 'closed') {
      // Reset failure count on success
      state.failureCount = 0;
    }
  }

  private recordError(error: OperationError): void {
    // Update metrics
    this.metrics.totalErrors++;

    const errorType = error.error.constructor.name;
    this.metrics.errorsByType.set(errorType, (this.metrics.errorsByType.get(errorType) || 0) + 1);
    this.metrics.errorsByOperation.set(error.operationType, (this.metrics.errorsByOperation.get(error.operationType) || 0) + 1);
    this.metrics.lastErrorTime = error.timestamp;

    // Add to error history
    this.errorHistory.push(error);

    // Update circuit breaker
    const state = this.getCircuitBreakerState(error.operationType);
    state.failureCount++;
    state.lastFailureTime = error.timestamp;

    // Check if we should open the circuit breaker
    if (state.state === 'closed' && state.failureCount >= this.config.circuitBreaker.failureThreshold) {
      state.state = 'open';
      state.nextAttemptTime = new Date(Date.now() + this.config.circuitBreaker.resetTimeout);
      this.metrics.circuitBreakerTrips++;

      this.emit('circuitBreakerOpen', {
        operationType: error.operationType,
        failureCount: state.failureCount,
        threshold: this.config.circuitBreaker.failureThreshold
      });
    } else if (state.state === 'half-open') {
      // Transition back to open
      state.state = 'open';
      state.nextAttemptTime = new Date(Date.now() + this.config.circuitBreaker.resetTimeout);

      this.emit('circuitBreakerOpen', {
        operationType: error.operationType,
        reason: 'half-open failure'
      });
    }

    // Emit error event
    this.emit('operationError', error);

    // Check error rate for alerting
    this.checkErrorRateThreshold();
  }

  private async handleFinalFailure(error: OperationError, maxRetries: number): Promise<void> {
    // Add to dead letter queue if enabled
    if (this.config.deadLetterQueue.enabled) {
      await this.addToDeadLetterQueue(error);
    }

    this.emit('finalFailure', {
      ...error,
      maxRetries,
      totalAttempts: maxRetries + 1
    });
  }

  private async addToDeadLetterQueue(error: OperationError): Promise<void> {
    if (!this.config.deadLetterQueue.enabled) return;

    this.deadLetterQueue.push(error);

    // Limit queue size
    if (this.deadLetterQueue.length > this.config.deadLetterQueue.maxSize) {
      this.deadLetterQueue.shift(); // Remove oldest
    }

    this.emit('addedToDeadLetterQueue', error);
  }

  private checkErrorRateThreshold(): void {
    const now = new Date();
    const timeWindow = this.config.alerting.timeWindow;
    const cutoff = new Date(now.getTime() - timeWindow);

    // Count errors in the time window
    const recentErrors = this.errorHistory.filter(error => error.timestamp >= cutoff);
    const errorRate = (recentErrors.length / timeWindow) * 60000; // errors per minute

    this.metrics.errorRate = errorRate;

    if (errorRate > this.config.alerting.errorRateThreshold) {
      this.emit('errorRateThresholdExceeded', {
        errorRate,
        threshold: this.config.alerting.errorRateThreshold,
        timeWindow,
        recentErrorCount: recentErrors.length
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startBackgroundTasks(): void {
    // Process retry queue every 5 seconds
    this.retryInterval = setInterval(() => {
      this.processRetryQueue().catch(console.error);
    }, 5000);

    // Update metrics every minute
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.cleanupOldData();
    }, 60000);
  }

  private updateMetrics(): void {
    // Calculate average retry delay
    const retryOperations = Array.from(this.retryQueue.values());
    if (retryOperations.length > 0) {
      const totalDelay = retryOperations.reduce((sum, op) => sum + op.backoffDelay, 0);
      this.metrics.averageRetryDelay = totalDelay / retryOperations.length;
    }

    this.emit('metricsUpdated', this.metrics);
  }

  private cleanupOldData(): void {
    const now = new Date();
    const retentionPeriod = this.config.deadLetterQueue.retentionPeriod;

    // Clean up old error history
    const cutoff = new Date(now.getTime() - retentionPeriod);
    this.errorHistory = this.errorHistory.filter(error => error.timestamp >= cutoff);

    // Clean up old dead letter queue entries
    this.deadLetterQueue = this.deadLetterQueue.filter(error => error.timestamp >= cutoff);

    // Reset circuit breaker states that haven't been used recently
    for (const [operationType, state] of this.circuitBreakers.entries()) {
      const lastActivity = state.lastFailureTime || state.lastSuccessTime;
      if (lastActivity && now.getTime() - lastActivity.getTime() > this.config.circuitBreaker.monitoringPeriod) {
        if (state.state === 'open') {
          state.state = 'closed';
          state.failureCount = 0;
          this.emit('circuitBreakerReset', { operationType, reason: 'timeout' });
        }
      }
    }
  }

  // Public API methods

  public getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  public getRetryQueueStatus(): {
    size: number;
    operations: Array<{
      id: string;
      operationType: string;
      retryCount: number;
      maxRetries: number;
      nextAttempt: Date;
      priority: string;
    }>;
  } {
    const operations = Array.from(this.retryQueue.values()).map(op => ({
      id: op.id,
      operationType: op.operationType,
      retryCount: op.retryCount,
      maxRetries: op.maxRetries,
      nextAttempt: op.nextAttempt,
      priority: op.priority
    }));

    return {
      size: this.retryQueue.size,
      operations
    };
  }

  public getCircuitBreakerStatus(): Array<{
    operationType: string;
    state: string;
    failureCount: number;
    totalRequests: number;
    successfulRequests: number;
    successRate: number;
  }> {
    return Array.from(this.circuitBreakers.entries()).map(([operationType, state]) => ({
      operationType,
      state: state.state,
      failureCount: state.failureCount,
      totalRequests: state.totalRequests,
      successfulRequests: state.successfulRequests,
      successRate: state.totalRequests > 0 ? state.successfulRequests / state.totalRequests : 0
    }));
  }

  public getDeadLetterQueue(): OperationError[] {
    return [...this.deadLetterQueue];
  }

  public reprocessDeadLetterItem(errorId: string): boolean {
    const errorIndex = this.deadLetterQueue.findIndex(error => error.id === errorId);
    if (errorIndex === -1) return false;

    const error = this.deadLetterQueue[errorIndex];
    this.deadLetterQueue.splice(errorIndex, 1);

    // Queue for retry with high priority
    // Note: This would need access to the original operation function
    this.emit('deadLetterReprocessed', error);

    return true;
  }

  public clearCircuitBreaker(operationType: string): boolean {
    const state = this.circuitBreakers.get(operationType);
    if (!state) return false;

    state.state = 'closed';
    state.failureCount = 0;
    state.nextAttemptTime = undefined;

    this.emit('circuitBreakerCleared', { operationType, manual: true });
    return true;
  }

  public updateConfig(newConfig: Partial<ErrorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  } {
    const openCircuitBreakers = Array.from(this.circuitBreakers.values())
      .filter(state => state.state === 'open').length;

    const retryQueueSize = this.retryQueue.size;
    const deadLetterQueueSize = this.deadLetterQueue.length;
    const errorRate = this.metrics.errorRate;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (openCircuitBreakers > 2 || errorRate > this.config.alerting.errorRateThreshold * 2) {
      status = 'unhealthy';
    } else if (openCircuitBreakers > 0 || retryQueueSize > 50 || errorRate > this.config.alerting.errorRateThreshold) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        openCircuitBreakers,
        retryQueueSize,
        deadLetterQueueSize,
        errorRate,
        totalErrors: this.metrics.totalErrors,
        retryAttempts: this.metrics.retryAttempts,
        successfulRetries: this.metrics.successfulRetries
      }
    };
  }

  public stop(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    this.removeAllListeners();
  }
}
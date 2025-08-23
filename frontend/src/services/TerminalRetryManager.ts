/**
 * Terminal Retry Manager Implementation
 * 
 * Handles connection retry logic and coordination with health checking
 */

import {
  TerminalRetryManagerConfig,
  RetryMetrics,
  ILogger,
  IBackoffCalculator,
  IHealthChecker
} from '../types/terminal';

export class TerminalRetryManager {
  private logger: ILogger;
  private backoffCalculator: IBackoffCalculator;
  private healthChecker: IHealthChecker;
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  private currentAttempt: number = 0;
  private isRetrying: boolean = false;
  private lastError: Error | null = null;

  constructor(config: TerminalRetryManagerConfig) {
    this.logger = config.logger;
    this.backoffCalculator = config.backoffCalculator;
    this.healthChecker = config.healthChecker;
    this.maxRetries = config.maxRetries;
    this.baseDelay = config.baseDelay;
    this.maxDelay = config.maxDelay;
  }

  shouldRetry(error: Error, attempt: number): boolean {
    this.lastError = error;

    // Check max attempts
    if (attempt > this.maxRetries) {
      this.logger.error('Max retry attempts reached', { 
        maxRetries: this.maxRetries, 
        currentAttempt: attempt 
      });
      return false;
    }

    // Coordinate with health checker
    if (!this.healthChecker.isHealthy()) {
      this.logger.warn('Retry rejected - unhealthy connection state');
      return false;
    }

    // Classify error for retry decision
    if (this.isNonRetryableError(error)) {
      this.logger.debug('Error classified as non-retryable', { error: error.message });
      return false;
    }

    // Check circuit breaker logic
    if (this.shouldActivateCircuitBreaker()) {
      this.logger.warn('Circuit breaker activated - stopping retries');
      return false;
    }

    return true;
  }

  getNextDelay(attempt: number, options?: { jitter?: boolean }): number {
    // Coordinate with backoff calculator
    let delay = this.backoffCalculator.calculateDelay(attempt);

    // Apply maximum delay cap
    if (delay > this.maxDelay) {
      delay = this.maxDelay;
      this.logger.debug('Retry delay capped at maximum', { 
        calculatedDelay: this.backoffCalculator.calculateDelay(attempt),
        cappedDelay: delay 
      });
    }

    // Apply jitter if requested
    if (options?.jitter) {
      const jitterFactor = 0.1; // 10% jitter
      const jitter = delay * jitterFactor * (Math.random() - 0.5);
      delay += jitter;
      
      this.logger.debug('Applied jitter to retry delay', {
        baseDelay: this.backoffCalculator.calculateDelay(attempt),
        jitter,
        finalDelay: delay
      });
    }

    return Math.max(0, delay);
  }

  async executeWithRetry<T>(operation: () => Promise<T>, options?: { timeout?: number }): Promise<T> {
    this.isRetrying = true;
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        // Handle timeout if specified
        let result: T;
        if (options?.timeout) {
          result = await Promise.race([
            operation(),
            new Promise<never>((_, reject) => {
              setTimeout(() => {
                const timeoutError = new Error('Operation timeout');
                this.logger.warn('Retry operation timed out', { timeout: options.timeout });
                reject(timeoutError);
              }, options.timeout);
            })
          ]);
        } else {
          result = await operation();
        }

        // Success - coordinate with health checker
        this.healthChecker.recordSuccess();
        this.reset();
        
        if (attempt > 1) {
          this.logger.info('Retry attempt successful', { attempt });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Record failure with health checker
        this.healthChecker.recordFailure();
        
        // Check if we should retry
        if (!this.shouldRetry(lastError, attempt)) {
          break;
        }

        // Calculate delay and wait
        const delay = this.getNextDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All retries exhausted
    this.isRetrying = false;
    this.logger.error('Retry operation failed permanently', {
      error: lastError!.message,
      totalAttempts: this.currentAttempt
    });
    
    throw lastError!;
  }

  incrementAttempt(): void {
    this.currentAttempt++;
    this.healthChecker.recordFailure();
  }

  reset(): void {
    this.currentAttempt = 0;
    this.isRetrying = false;
    this.lastError = null;
    
    // Coordinate with dependencies
    this.backoffCalculator.reset();
    this.healthChecker.recordSuccess();
    
    this.logger.debug('Retry manager reset');
  }

  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  getMetrics(): RetryMetrics {
    return {
      currentAttempt: this.currentAttempt,
      maxRetries: this.maxRetries,
      currentDelay: this.backoffCalculator.getCurrentDelay(),
      isRetrying: this.isRetrying,
      lastError: this.lastError
    };
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      /unauthorized/i,
      /forbidden/i,
      /bad request/i,
      /invalid credentials/i
    ];

    const retryablePatterns = [
      /econnrefused/i,
      /etimedout/i,
      /enotfound/i,
      /network error/i
    ];

    // Check if it's explicitly retryable
    if (retryablePatterns.some(pattern => pattern.test(error.message))) {
      return false; // It's retryable
    }

    // Check if it's explicitly non-retryable
    return nonRetryablePatterns.some(pattern => pattern.test(error.message));
  }

  private shouldActivateCircuitBreaker(): boolean {
    // Simple circuit breaker logic
    const recentFailures = this.currentAttempt;
    const circuitBreakerThreshold = Math.floor(this.maxRetries * 0.8);
    
    return recentFailures >= circuitBreakerThreshold && !this.healthChecker.isHealthy();
  }
}
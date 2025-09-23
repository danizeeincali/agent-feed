/**
 * ExponentialBackoffManager - Manages retry logic with exponential backoff
 * 
 * Implements configurable exponential backoff strategy for robust error recovery.
 */

export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export class ExponentialBackoffManager {
  private strategy: RetryStrategy;
  private currentAttempt: number = 0;
  private lastRetryTime: number = 0;

  constructor(strategy: RetryStrategy) {
    this.strategy = strategy;
  }

  /**
   * Check if should retry based on current attempt
   */
  shouldRetry(): boolean {
    return this.currentAttempt < this.strategy.maxAttempts;
  }

  /**
   * Get next retry delay in milliseconds
   */
  getNextDelay(): number {
    const exponentialDelay = this.strategy.baseDelay * 
      Math.pow(this.strategy.backoffMultiplier, this.currentAttempt);
    
    let delay = Math.min(exponentialDelay, this.strategy.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.strategy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    this.lastRetryTime = Date.now();
    return Math.floor(delay);
  }

  /**
   * Record retry attempt
   */
  recordAttempt(): void {
    this.currentAttempt++;
  }

  /**
   * Reset retry state
   */
  reset(): void {
    this.currentAttempt = 0;
    this.lastRetryTime = 0;
  }

  /**
   * Get current attempt number
   */
  getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    return Math.max(0, this.strategy.maxAttempts - this.currentAttempt);
  }

  /**
   * Get time since last retry
   */
  getTimeSinceLastRetry(): number {
    return this.lastRetryTime ? Date.now() - this.lastRetryTime : 0;
  }

  /**
   * Update strategy
   */
  updateStrategy(strategy: Partial<RetryStrategy>): void {
    this.strategy = { ...this.strategy, ...strategy };
  }

  /**
   * Get current strategy
   */
  getStrategy(): RetryStrategy {
    return { ...this.strategy };
  }
}
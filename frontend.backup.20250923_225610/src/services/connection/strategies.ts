/**
 * Reconnection Strategies
 * Various strategies for handling WebSocket reconnection logic
 */

import { ReconnectionStrategy } from './types';

export class ExponentialBackoffStrategy implements ReconnectionStrategy {
  private baseDelay: number;
  private maxDelay: number;
  private maxAttempts: number;
  private jitter: boolean;

  constructor(options: {
    baseDelay?: number;
    maxDelay?: number;
    maxAttempts?: number;
    jitter?: boolean;
  } = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.maxAttempts = options.maxAttempts || 10;
    this.jitter = options.jitter !== false;
  }

  shouldReconnect(attempt: number, error: Error | null): boolean {
    // Don't reconnect if we've exceeded max attempts
    if (attempt > this.maxAttempts) {
      return false;
    }

    // Don't reconnect for certain error types
    if (error) {
      const errorMessage = error.message.toLowerCase();
      
      // Authentication errors typically shouldn't trigger reconnection
      if (errorMessage.includes('unauthorized') || 
          errorMessage.includes('authentication') ||
          errorMessage.includes('forbidden')) {
        return false;
      }
      
      // Client-side errors that won't be fixed by reconnecting
      if (errorMessage.includes('invalid url') ||
          errorMessage.includes('malformed')) {
        return false;
      }
    }

    return true;
  }

  getDelay(attempt: number): number {
    // Calculate exponential delay: baseDelay * 2^(attempt-1)
    const exponentialDelay = Math.min(
      this.baseDelay * Math.pow(2, attempt - 1),
      this.maxDelay
    );

    if (this.jitter) {
      // Add random jitter to prevent thundering herd
      // Jitter range: ±10% of the calculated delay
      const jitterRange = exponentialDelay * 0.1;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(0, exponentialDelay + jitter);
    }

    return exponentialDelay;
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  reset(): void {
    // No internal state to reset for this strategy
  }
}

export class LinearBackoffStrategy implements ReconnectionStrategy {
  private baseDelay: number;
  private maxDelay: number;
  private maxAttempts: number;
  private increment: number;

  constructor(options: {
    baseDelay?: number;
    maxDelay?: number;
    maxAttempts?: number;
    increment?: number;
  } = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.maxAttempts = options.maxAttempts || 10;
    this.increment = options.increment || 2000;
  }

  shouldReconnect(attempt: number, error: Error | null): boolean {
    return attempt <= this.maxAttempts;
  }

  getDelay(attempt: number): number {
    // Linear increase: baseDelay + (attempt * increment)
    return Math.min(
      this.baseDelay + ((attempt - 1) * this.increment),
      this.maxDelay
    );
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  reset(): void {
    // No internal state to reset
  }
}

export class FixedDelayStrategy implements ReconnectionStrategy {
  private delay: number;
  private maxAttempts: number;

  constructor(options: {
    delay?: number;
    maxAttempts?: number;
  } = {}) {
    this.delay = options.delay || 5000;
    this.maxAttempts = options.maxAttempts || 5;
  }

  shouldReconnect(attempt: number, error: Error | null): boolean {
    return attempt <= this.maxAttempts;
  }

  getDelay(attempt: number): number {
    return this.delay;
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  reset(): void {
    // No internal state to reset
  }
}

export class AdaptiveStrategy implements ReconnectionStrategy {
  private successiveFailures: number = 0;
  private lastSuccessTime: Date | null = null;
  private baseDelay: number;
  private maxDelay: number;
  private maxAttempts: number;

  constructor(options: {
    baseDelay?: number;
    maxDelay?: number;
    maxAttempts?: number;
  } = {}) {
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.maxAttempts = options.maxAttempts || 15;
  }

  shouldReconnect(attempt: number, error: Error | null): boolean {
    if (attempt > this.maxAttempts) {
      return false;
    }

    // Be more aggressive with reconnection if we had a recent successful connection
    if (this.lastSuccessTime) {
      const timeSinceSuccess = Date.now() - this.lastSuccessTime.getTime();
      const oneHour = 60 * 60 * 1000;
      
      // If we had a successful connection within the last hour, be more patient
      if (timeSinceSuccess < oneHour) {
        return attempt <= (this.maxAttempts + 5);
      }
    }

    return true;
  }

  getDelay(attempt: number): number {
    // Adapt delay based on recent connection stability
    let multiplier = 1;

    if (this.successiveFailures > 5) {
      // Many recent failures, be more conservative
      multiplier = 2;
    } else if (this.lastSuccessTime) {
      const timeSinceSuccess = Date.now() - this.lastSuccessTime.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSinceSuccess < fiveMinutes) {
        // Recent success, be more aggressive
        multiplier = 0.5;
      }
    }

    const baseExponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const adaptedDelay = Math.min(
      baseExponentialDelay * multiplier,
      this.maxDelay
    );

    // Add jitter
    const jitterRange = adaptedDelay * 0.1;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    
    return Math.max(0, adaptedDelay + jitter);
  }

  getMaxAttempts(): number {
    return this.maxAttempts;
  }

  reset(): void {
    this.successiveFailures = 0;
    this.lastSuccessTime = new Date();
  }

  recordFailure(): void {
    this.successiveFailures++;
  }

  recordSuccess(): void {
    this.successiveFailures = 0;
    this.lastSuccessTime = new Date();
  }
}

// Strategy factory
export type StrategyType = 'exponential' | 'linear' | 'fixed' | 'adaptive';

export function createReconnectionStrategy(
  type: StrategyType,
  options: any = {}
): ReconnectionStrategy {
  switch (type) {
    case 'exponential':
      return new ExponentialBackoffStrategy(options);
    case 'linear':
      return new LinearBackoffStrategy(options);
    case 'fixed':
      return new FixedDelayStrategy(options);
    case 'adaptive':
      return new AdaptiveStrategy(options);
    default:
      throw new Error(`Unknown reconnection strategy: ${type}`);
  }
}
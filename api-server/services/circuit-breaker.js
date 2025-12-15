/**
 * Circuit Breaker
 * Implements circuit breaker pattern to prevent cascading failures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load safety limits configuration
const configPath = path.join(__dirname, '..', 'config', 'safety-limits.json');
let safetyLimits = {
  recovery: {
    circuitBreakerThreshold: 3,
    circuitBreakerWindow: 60000,
    circuitBreakerResetTimeout: 300000
  }
};

try {
  const configData = fs.readFileSync(configPath, 'utf8');
  safetyLimits = JSON.parse(configData);
} catch (error) {
  console.warn('Failed to load safety-limits.json, using defaults:', error.message);
}

export class CircuitBreaker {
  constructor(customConfig = {}) {
    this.state = 'CLOSED';
    this.failures = [];
    this.resetTimer = null;
    this.openTime = null;

    // Merge configuration
    this.config = {
      failureThreshold: safetyLimits.recovery.circuitBreakerThreshold,
      failureWindow: safetyLimits.recovery.circuitBreakerWindow,
      resetTimeout: safetyLimits.recovery.circuitBreakerResetTimeout,
      ...customConfig
    };
  }

  /**
   * Check if circuit allows requests
   * @throws {Error} If circuit is OPEN
   * @returns {boolean} True if request allowed
   */
  check() {
    if (this.state === 'OPEN') {
      const error = new Error('CIRCUIT_BREAKER_OPEN');
      error.code = 'CIRCUIT_BREAKER_OPEN';
      error.resetTime = this.openTime ? this.openTime + this.config.resetTimeout : null;
      throw error;
    }
    return true;
  }

  /**
   * Record a failed operation
   * @param {string} workerId - ID of the worker that failed
   * @param {string} reason - Reason for failure
   */
  recordFailure(workerId, reason) {
    const now = Date.now();

    // In HALF_OPEN state, any failure immediately reopens the circuit
    // Don't track the failure in the array, just reopen
    if (this.state === 'HALF_OPEN') {
      this.openCircuit();
      return;
    }

    // Clean up old failures outside the window BEFORE adding new one
    this.failures = this.failures.filter(
      f => now - f.timestamp < this.config.failureWindow
    );

    // Add new failure after cleanup
    this.failures.push({
      workerId,
      reason,
      timestamp: now
    });

    // Check if threshold exceeded
    if (this.failures.length >= this.config.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Record a successful operation
   * Resets circuit from HALF_OPEN to CLOSED
   */
  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.reset();
    }
  }

  /**
   * Open the circuit breaker
   * @private
   */
  openCircuit() {
    if (this.state === 'OPEN') {
      return; // Already open
    }

    this.state = 'OPEN';
    this.openTime = Date.now();

    console.warn(`[CircuitBreaker] Circuit OPENED - ${this.failures.length} failures detected`);

    // Schedule auto-reset to HALF_OPEN
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = setTimeout(() => {
      this.state = 'HALF_OPEN';
      console.info('[CircuitBreaker] Circuit moved to HALF_OPEN - testing recovery');
    }, this.config.resetTimeout);
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = [];
    this.openTime = null;

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    console.info('[CircuitBreaker] Circuit RESET to CLOSED');
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} Statistics about circuit breaker state
   */
  getStats() {
    const now = Date.now();
    const recentFailures = this.failures.filter(
      f => now - f.timestamp < this.config.failureWindow
    ).length;

    // Count failure reasons
    const failureReasons = {};
    for (const failure of this.failures) {
      failureReasons[failure.reason] = (failureReasons[failure.reason] || 0) + 1;
    }

    return {
      state: this.state,
      failureCount: this.failures.length,
      recentFailures,
      failureReasons,
      isHealthy: this.state === 'CLOSED',
      resetTime: this.openTime ? this.openTime + this.config.resetTimeout : null,
      config: this.config
    };
  }
}

// Singleton instance
let circuitBreakerInstance = null;

export function getCircuitBreaker() {
  if (!circuitBreakerInstance) {
    circuitBreakerInstance = new CircuitBreaker();
  }
  return circuitBreakerInstance;
}

export default CircuitBreaker;

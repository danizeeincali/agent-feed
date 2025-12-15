import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '../../services/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker;

  beforeEach(() => {
    breaker = new CircuitBreaker();
    vi.useFakeTimers();
  });

  describe('constructor', () => {
    it('should initialize in CLOSED state', () => {
      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failures).toEqual([]);
    });

    it('should initialize with default configuration', () => {
      expect(breaker.config.failureThreshold).toBe(3);
      expect(breaker.config.failureWindow).toBe(60000);
      expect(breaker.config.resetTimeout).toBe(300000);
    });

    it('should accept custom configuration', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 5,
        failureWindow: 120000,
        resetTimeout: 600000
      });

      expect(customBreaker.config.failureThreshold).toBe(5);
      expect(customBreaker.config.failureWindow).toBe(120000);
      expect(customBreaker.config.resetTimeout).toBe(600000);
    });
  });

  describe('check', () => {
    it('should allow requests when circuit is CLOSED', () => {
      expect(() => breaker.check()).not.toThrow();
    });

    it('should throw when circuit is OPEN', () => {
      breaker.state = 'OPEN';

      expect(() => breaker.check()).toThrow('CIRCUIT_BREAKER_OPEN');
    });

    it('should allow requests when circuit is HALF_OPEN', () => {
      breaker.state = 'HALF_OPEN';

      expect(() => breaker.check()).not.toThrow();
    });
  });

  describe('recordFailure', () => {
    it('should record a single failure', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      breaker.recordFailure('test-worker', 'LOOP_DETECTED');

      expect(breaker.failures.length).toBe(1);
      expect(breaker.failures[0].workerId).toBe('test-worker');
      expect(breaker.failures[0].reason).toBe('LOOP_DETECTED');
      expect(breaker.failures[0].timestamp).toBe(now);
    });

    it('should keep circuit CLOSED with less than 3 failures', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      breaker.recordFailure('worker-1', 'TIMEOUT');
      expect(breaker.state).toBe('CLOSED');

      breaker.recordFailure('worker-2', 'LOOP_DETECTED');
      expect(breaker.state).toBe('CLOSED');
    });

    it('should OPEN circuit after 3 failures in 60 seconds', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      breaker.recordFailure('worker-1', 'TIMEOUT');
      vi.setSystemTime(now + 20000);
      breaker.recordFailure('worker-2', 'LOOP_DETECTED');
      vi.setSystemTime(now + 40000);
      breaker.recordFailure('worker-3', 'MAX_CHUNKS');

      expect(breaker.state).toBe('OPEN');
    });

    it('should not count failures outside the time window', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // First two failures
      breaker.recordFailure('worker-1', 'TIMEOUT');
      breaker.recordFailure('worker-2', 'TIMEOUT');

      // Advance past the window (61 seconds)
      vi.setSystemTime(now + 61000);

      // Third failure (but first two should be expired)
      breaker.recordFailure('worker-3', 'TIMEOUT');

      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failures.length).toBe(1);
    });

    it('should clean up old failures on each record', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      breaker.recordFailure('worker-1', 'TIMEOUT');
      vi.setSystemTime(now + 30000);
      breaker.recordFailure('worker-2', 'TIMEOUT');
      vi.setSystemTime(now + 70000);
      breaker.recordFailure('worker-3', 'TIMEOUT');

      // worker-1 (70s old) should be removed, worker-2 (40s old) and worker-3 should remain
      // because worker-2 is still within the 60-second window
      expect(breaker.failures.length).toBe(2);
      expect(breaker.failures[0].workerId).toBe('worker-2');
      expect(breaker.failures[1].workerId).toBe('worker-3');
    });
  });

  describe('state transitions', () => {
    it('should transition from CLOSED to OPEN on threshold', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      expect(breaker.state).toBe('CLOSED');

      for (let i = 0; i < 3; i++) {
        vi.setSystemTime(now + i * 10000);
        breaker.recordFailure(`worker-${i}`, 'TIMEOUT');
      }

      expect(breaker.state).toBe('OPEN');
    });

    it('should transition from OPEN to HALF_OPEN after reset timeout', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Trigger OPEN state
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(`worker-${i}`, 'TIMEOUT');
      }

      expect(breaker.state).toBe('OPEN');

      // Advance time by 5 minutes (reset timeout)
      vi.advanceTimersByTime(300000);

      expect(breaker.state).toBe('HALF_OPEN');
    });

    it('should reset to CLOSED on successful operation in HALF_OPEN', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Trigger OPEN state
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(`worker-${i}`, 'TIMEOUT');
      }

      // Advance to HALF_OPEN
      vi.advanceTimersByTime(300000);
      expect(breaker.state).toBe('HALF_OPEN');

      // Record success
      breaker.recordSuccess();

      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failures.length).toBe(0);
    });

    it('should transition back to OPEN on failure in HALF_OPEN', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // Trigger OPEN state
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(`worker-${i}`, 'TIMEOUT');
      }

      // Advance to HALF_OPEN
      vi.advanceTimersByTime(300000);
      expect(breaker.state).toBe('HALF_OPEN');

      // Record another failure
      breaker.recordFailure('worker-4', 'TIMEOUT');

      expect(breaker.state).toBe('OPEN');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      breaker.recordFailure('worker-1', 'TIMEOUT');
      breaker.recordFailure('worker-2', 'LOOP_DETECTED');

      const stats = breaker.getStats();

      expect(stats.state).toBe('CLOSED');
      expect(stats.failureCount).toBe(2);
      expect(stats.recentFailures).toBe(2);
      expect(stats.isHealthy).toBe(true);
    });

    it('should mark as unhealthy when circuit is OPEN', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(`worker-${i}`, 'TIMEOUT');
      }

      const stats = breaker.getStats();

      expect(stats.state).toBe('OPEN');
      expect(stats.isHealthy).toBe(false);
      expect(stats.resetTime).toBeDefined();
    });

    it('should include failure reasons', () => {
      breaker.recordFailure('worker-1', 'TIMEOUT');
      breaker.recordFailure('worker-2', 'LOOP_DETECTED');
      breaker.recordFailure('worker-3', 'MAX_CHUNKS');

      const stats = breaker.getStats();

      expect(stats.failureReasons).toEqual({
        TIMEOUT: 1,
        LOOP_DETECTED: 1,
        MAX_CHUNKS: 1
      });
    });
  });

  describe('reset', () => {
    it('should manually reset circuit to CLOSED', () => {
      // Trigger OPEN state
      for (let i = 0; i < 3; i++) {
        breaker.recordFailure(`worker-${i}`, 'TIMEOUT');
      }

      expect(breaker.state).toBe('OPEN');

      breaker.reset();

      expect(breaker.state).toBe('CLOSED');
      expect(breaker.failures.length).toBe(0);
    });
  });
});

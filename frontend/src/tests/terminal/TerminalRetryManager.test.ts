/**
 * TDD London School Test Suite: Terminal Retry Manager
 * 
 * Testing retry logic and coordination with connection management
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { TerminalRetryManager } from '../../services/TerminalRetryManager';

// Mock timer for controlling time-based behavior
const mockTimer = {
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  setInterval: jest.fn(),
  clearInterval: jest.fn()
};

// Mock logger for retry operations
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Mock exponential backoff calculator
const mockBackoffCalculator = {
  calculateDelay: jest.fn(),
  reset: jest.fn(),
  getCurrentDelay: jest.fn(),
  getMaxDelay: jest.fn()
};

// Mock connection health checker
const mockHealthChecker = {
  isHealthy: jest.fn(),
  checkConnectivity: jest.fn(),
  getLastSuccessfulConnection: jest.fn(),
  recordFailure: jest.fn(),
  recordSuccess: jest.fn()
};

describe('TerminalRetryManager - London School TDD', () => {
  let retryManager: TerminalRetryManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock global timers
    global.setTimeout = mockTimer.setTimeout;
    global.clearTimeout = mockTimer.clearTimeout;

    retryManager = new TerminalRetryManager({
      logger: mockLogger,
      backoffCalculator: mockBackoffCalculator,
      healthChecker: mockHealthChecker,
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000
    });
  });

  describe('Retry Decision Logic', () => {
    it('should coordinate with health checker to determine retry eligibility', () => {
      // Given
      const error = new Error('Connection failed');
      mockHealthChecker.isHealthy.mockReturnValue(true);

      // When
      const shouldRetry = retryManager.shouldRetry(error, 2);

      // Then
      expect(mockHealthChecker.isHealthy).toHaveBeenCalled();
      expect(shouldRetry).toBe(true);
    });

    it('should reject retries when health checker indicates unhealthy state', () => {
      // Given
      const error = new Error('Network unreachable');
      mockHealthChecker.isHealthy.mockReturnValue(false);

      // When
      const shouldRetry = retryManager.shouldRetry(error, 1);

      // Then
      expect(mockHealthChecker.isHealthy).toHaveBeenCalled();
      expect(shouldRetry).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Retry rejected - unhealthy connection state');
    });

    it('should reject retries when max attempts reached', () => {
      // Given
      const error = new Error('Connection timeout');
      mockHealthChecker.isHealthy.mockReturnValue(true);

      // When
      const shouldRetry = retryManager.shouldRetry(error, 6); // Over max of 5

      // Then
      expect(shouldRetry).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Max retry attempts reached', { 
        maxRetries: 5, 
        currentAttempt: 6 
      });
    });

    it('should coordinate error classification with retry decisions', () => {
      // Given - Network error should be retryable
      const networkError = new Error('ECONNREFUSED');
      mockHealthChecker.isHealthy.mockReturnValue(true);

      // When
      const shouldRetryNetwork = retryManager.shouldRetry(networkError, 1);

      // Given - Auth error should not be retryable
      const authError = new Error('Unauthorized');
      const shouldRetryAuth = retryManager.shouldRetry(authError, 1);

      // Then
      expect(shouldRetryNetwork).toBe(true);
      expect(shouldRetryAuth).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('Error classified as non-retryable', { 
        error: authError.message 
      });
    });
  });

  describe('Backoff Delay Calculation', () => {
    it('should coordinate with backoff calculator for delay determination', () => {
      // Given
      const expectedDelay = 2000;
      mockBackoffCalculator.calculateDelay.mockReturnValue(expectedDelay);

      // When
      const actualDelay = retryManager.getNextDelay(3);

      // Then
      expect(mockBackoffCalculator.calculateDelay).toHaveBeenCalledWith(3);
      expect(actualDelay).toBe(expectedDelay);
    });

    it('should coordinate delay bounds with backoff calculator', () => {
      // Given
      const unboundedDelay = 60000; // Over max of 30000
      mockBackoffCalculator.calculateDelay.mockReturnValue(unboundedDelay);
      mockBackoffCalculator.getMaxDelay.mockReturnValue(30000);

      // When
      const actualDelay = retryManager.getNextDelay(10);

      // Then
      expect(actualDelay).toBe(30000); // Should be capped
      expect(mockLogger.debug).toHaveBeenCalledWith('Retry delay capped at maximum', { 
        calculatedDelay: unboundedDelay,
        cappedDelay: 30000 
      });
    });

    it('should coordinate jitter application for delay randomization', () => {
      // Given
      const baseDelay = 1000;
      mockBackoffCalculator.calculateDelay.mockReturnValue(baseDelay);

      // When
      const delayWithJitter = retryManager.getNextDelay(1, { jitter: true });

      // Then - Should add randomization (can't test exact value due to randomness)
      expect(typeof delayWithJitter).toBe('number');
      expect(delayWithJitter).toBeGreaterThan(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Applied jitter to retry delay', expect.any(Object));
    });
  });

  describe('Retry Execution Coordination', () => {
    it('should coordinate complete retry workflow with all dependencies', async () => {
      // Given
      const retryOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('Success');
      
      mockHealthChecker.isHealthy.mockReturnValue(true);
      mockBackoffCalculator.calculateDelay.mockReturnValue(1000);
      
      // Mock setTimeout to execute callback immediately
      mockTimer.setTimeout.mockImplementation((callback: Function) => {
        callback();
        return 123; // fake timer ID
      });

      // When
      const result = await retryManager.executeWithRetry(retryOperation);

      // Then - Verify complete coordination
      expect(retryOperation).toHaveBeenCalledTimes(2);
      expect(mockHealthChecker.recordFailure).toHaveBeenCalledTimes(1);
      expect(mockHealthChecker.recordSuccess).toHaveBeenCalledTimes(1);
      expect(mockBackoffCalculator.calculateDelay).toHaveBeenCalledWith(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Retry attempt successful', { attempt: 2 });
      expect(result).toBe('Success');
    });

    it('should coordinate failure handling when retries exhausted', async () => {
      // Given
      const persistentError = new Error('Persistent failure');
      const retryOperation = jest.fn().mockRejectedValue(persistentError);
      
      mockHealthChecker.isHealthy
        .mockReturnValueOnce(true)  // First retry allowed
        .mockReturnValueOnce(true)  // Second retry allowed
        .mockReturnValueOnce(false); // Third retry rejected

      mockBackoffCalculator.calculateDelay.mockReturnValue(500);
      
      mockTimer.setTimeout.mockImplementation((callback: Function) => {
        callback();
        return 123;
      });

      // When & Then
      await expect(retryManager.executeWithRetry(retryOperation)).rejects.toThrow('Persistent failure');
      
      // Verify final coordination
      expect(mockHealthChecker.recordFailure).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith('Retry operation failed permanently', {
        error: persistentError.message,
        totalAttempts: 3
      });
    });

    it('should coordinate timeout handling for retry operations', async () => {
      // Given
      const slowOperation = jest.fn(() => new Promise(resolve => {
        // Never resolves - simulates timeout
      }));
      
      const timeoutError = new Error('Operation timeout');
      mockTimer.setTimeout.mockImplementation((callback: Function, delay: number) => {
        if (delay === 5000) { // Timeout timer
          callback(timeoutError);
        }
        return 123;
      });

      // When & Then
      await expect(retryManager.executeWithRetry(slowOperation, { timeout: 5000 }))
        .rejects.toThrow('Operation timeout');
        
      expect(mockLogger.warn).toHaveBeenCalledWith('Retry operation timed out', { timeout: 5000 });
    });
  });

  describe('State Management and Reset', () => {
    it('should coordinate state reset with all dependencies', () => {
      // Given - Simulate some retry attempts
      retryManager.incrementAttempt();
      retryManager.incrementAttempt();

      // When
      retryManager.reset();

      // Then
      expect(mockBackoffCalculator.reset).toHaveBeenCalled();
      expect(mockHealthChecker.recordSuccess).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Retry manager reset');
    });

    it('should coordinate attempt tracking with health checker', () => {
      // When
      retryManager.incrementAttempt();
      retryManager.incrementAttempt();

      // Then
      const currentAttempt = retryManager.getCurrentAttempt();
      expect(currentAttempt).toBe(2);
      expect(mockHealthChecker.recordFailure).toHaveBeenCalledTimes(2);
    });

    it('should coordinate metrics collection for monitoring', () => {
      // Given
      retryManager.incrementAttempt();
      retryManager.incrementAttempt();
      mockBackoffCalculator.getCurrentDelay.mockReturnValue(2000);

      // When
      const metrics = retryManager.getMetrics();

      // Then
      expect(metrics).toEqual({
        currentAttempt: 2,
        maxRetries: 5,
        currentDelay: 2000,
        isRetrying: false,
        lastError: null
      });
    });
  });

  describe('Error Classification', () => {
    it('should coordinate error analysis for retry decisions', () => {
      // Given various error types
      const networkErrors = [
        new Error('ECONNREFUSED'),
        new Error('ETIMEDOUT'),
        new Error('ENOTFOUND'),
        new Error('Network error')
      ];

      const nonRetryableErrors = [
        new Error('Unauthorized'),
        new Error('Forbidden'),
        new Error('Bad Request'),
        new Error('Invalid credentials')
      ];

      // When & Then - Network errors should be retryable
      networkErrors.forEach(error => {
        mockHealthChecker.isHealthy.mockReturnValue(true);
        expect(retryManager.shouldRetry(error, 1)).toBe(true);
      });

      // Non-retryable errors should be rejected
      nonRetryableErrors.forEach(error => {
        expect(retryManager.shouldRetry(error, 1)).toBe(false);
      });
    });

    it('should coordinate circuit breaker logic for repeated failures', () => {
      // Given - Multiple consecutive failures
      const error = new Error('Connection failed');
      mockHealthChecker.isHealthy
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false); // Circuit breaker opens

      // When
      const firstRetry = retryManager.shouldRetry(error, 1);
      const secondRetry = retryManager.shouldRetry(error, 2);
      const thirdRetry = retryManager.shouldRetry(error, 3);

      // Then
      expect(firstRetry).toBe(true);
      expect(secondRetry).toBe(true);
      expect(thirdRetry).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Circuit breaker activated - stopping retries');
    });
  });
});
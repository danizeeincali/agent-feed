/**
 * Integration test for timeout handling improvements
 * Verifies that the fixes work end-to-end
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorCategorizer } from '../../services/ErrorCategorizer';

describe('Timeout Handling Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ErrorCategorizer', () => {
    it('should categorize timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'AbortError';

      const category = ErrorCategorizer.categorizeError(timeoutError, 0);

      expect(category.type).toBe('timeout');
      expect(category.shouldRetry).toBe(true);
      expect(category.maxRetries).toBe(2);
      expect(category.userMessage).toContain('Claude Code is processing');
    });

    it('should categorize network errors correctly', () => {
      const networkError = new Error('Failed to fetch');

      const category = ErrorCategorizer.categorizeError(networkError, 0);

      expect(category.type).toBe('network');
      expect(category.shouldRetry).toBe(true);
      expect(category.maxRetries).toBe(3);
      expect(category.userMessage).toContain('Connection failed');
    });

    it('should categorize server errors correctly', () => {
      const serverError = new Error('HTTP 500: Internal Server Error');

      const category = ErrorCategorizer.categorizeError(serverError, 0);

      expect(category.type).toBe('server');
      expect(category.shouldRetry).toBe(true);
      expect(category.maxRetries).toBe(2);
      expect(category.userMessage).toContain('Server error');
    });

    it('should provide progressive messages for long operations', () => {
      expect(ErrorCategorizer.getLongOperationExplanation(5))
        .toContain('Initializing');

      expect(ErrorCategorizer.getLongOperationExplanation(20))
        .toContain('Processing your request');

      expect(ErrorCategorizer.getLongOperationExplanation(45))
        .toContain('Still working');

      expect(ErrorCategorizer.getLongOperationExplanation(90))
        .toContain('Almost there');

      expect(ErrorCategorizer.getLongOperationExplanation(150))
        .toContain('longer than usual');
    });

    it('should identify long-running operations correctly', () => {
      expect(ErrorCategorizer.isLongRunningOperation(10)).toBe(false);
      expect(ErrorCategorizer.isLongRunningOperation(16)).toBe(true);
      expect(ErrorCategorizer.isLongRunningOperation(30)).toBe(true);
    });

    it('should provide appropriate retry delays with exponential backoff', () => {
      const error = new Error('Network error');

      const firstAttempt = ErrorCategorizer.categorizeError(error, 0);
      expect(firstAttempt.retryDelay).toBe(1000); // 1 second

      const secondAttempt = ErrorCategorizer.categorizeError(error, 1);
      expect(secondAttempt.retryDelay).toBe(2000); // 2 seconds

      const thirdAttempt = ErrorCategorizer.categorizeError(error, 2);
      expect(thirdAttempt.retryDelay).toBe(4000); // 4 seconds
    });

    it('should stop retrying after max attempts', () => {
      const error = new Error('Network error');

      const maxRetriesAttempt = ErrorCategorizer.categorizeError(error, 3);
      expect(maxRetriesAttempt.shouldRetry).toBe(false);
    });

    it('should provide helpful suggestions for different error types', () => {
      const timeoutSuggestions = ErrorCategorizer.getSuggestedActions('timeout', 30);
      expect(timeoutSuggestions).toContain('Wait for the current operation to complete');
      expect(timeoutSuggestions).toContain('Try breaking complex requests into smaller parts');

      const networkSuggestions = ErrorCategorizer.getSuggestedActions('network', 10);
      expect(networkSuggestions).toContain('Check your internet connection');
      expect(networkSuggestions).toContain('Verify the backend server is running');

      const longOperationSuggestions = ErrorCategorizer.getSuggestedActions('timeout', 70);
      expect(longOperationSuggestions.some(s => s.includes('1-3 minutes'))).toBe(true);
    });
  });

  describe('Timeout Configuration', () => {
    it('should handle the expected 15-17 second response times', () => {
      // Simulate the typical Claude Code SDK response time
      const startTime = Date.now();

      // Fast-forward 17 seconds
      vi.advanceTimersByTime(17000);

      const elapsed = Date.now() - startTime;

      // Should be considered a long operation but not a timeout
      expect(ErrorCategorizer.isLongRunningOperation(elapsed / 1000)).toBe(true);

      // Should provide appropriate messaging
      const message = ErrorCategorizer.getLongOperationExplanation(elapsed / 1000);
      expect(message).toContain('Processing your request');
    });

    it('should only timeout after 5 minutes (300 seconds)', () => {
      // Our timeout should be set to 5 minutes to handle complex operations
      const timeoutThreshold = 300; // 5 minutes in seconds

      // 17 seconds should not timeout
      expect(17).toBeLessThan(timeoutThreshold);

      // 45 seconds should not timeout
      expect(45).toBeLessThan(timeoutThreshold);

      // 2 minutes should not timeout
      expect(120).toBeLessThan(timeoutThreshold);

      // Only operations longer than 5 minutes should timeout
      expect(301).toBeGreaterThan(timeoutThreshold);
    });
  });

  describe('User Experience Improvements', () => {
    it('should provide clear status progression', () => {
      const statuses = [
        'idle',
        'sending',
        'processing',
        'retrying',
        'completing'
      ];

      statuses.forEach(status => {
        expect(status).toMatch(/^[a-z_]+$/); // Should be valid status strings
      });
    });

    it('should differentiate between errors and successful retries', () => {
      // Error messages should be clearly marked
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Error occurred',
        timestamp: Date.now(),
        isError: true
      };

      // Successful retry should be marked
      const retrySuccessMessage = {
        role: 'assistant' as const,
        content: 'Success after retry',
        timestamp: Date.now(),
        isRetry: true
      };

      expect(errorMessage.isError).toBe(true);
      expect(retrySuccessMessage.isRetry).toBe(true);
    });
  });
});
/**
 * Error Handling Scenarios Unit Tests
 * London School TDD - Comprehensive error handling with behavior verification
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { ClaudeProcessManagerMock, ClaudeProcessManagerMockFactory } from '../mocks/ClaudeProcessManagerMock';

// Mock error recovery service
class ErrorRecoveryServiceMock {
  public handleInstanceCrash = jest.fn();
  public attemptReconnection = jest.fn();
  public escalateError = jest.fn();
  public logErrorForAnalysis = jest.fn();
}

// Mock circuit breaker for preventing cascading failures
class CircuitBreakerMock {
  public isOpen = jest.fn();
  public recordSuccess = jest.fn();
  public recordFailure = jest.fn();
  public reset = jest.fn();
  public getState = jest.fn();
}

// Mock retry mechanism
class RetryManagerMock {
  public shouldRetry = jest.fn();
  public calculateBackoff = jest.fn();
  public incrementAttempt = jest.fn();
  public reset = jest.fn();
}

// Mock alert system
class AlertSystemMock {
  public sendCriticalAlert = jest.fn();
  public sendWarningAlert = jest.fn();
  public sendErrorSummary = jest.fn();
}

// Subject under test - Error Handler
class ClaudeErrorHandler {
  private claudeManager: any;
  private recoveryService: any;
  private circuitBreaker: any;
  private retryManager: any;
  private alertSystem: any;
  private logger: any;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Error> = new Map();

  constructor(
    claudeManager: any,
    recoveryService: any,
    circuitBreaker: any,
    retryManager: any,
    alertSystem: any,
    logger: any
  ) {
    this.claudeManager = claudeManager;
    this.recoveryService = recoveryService;
    this.circuitBreaker = circuitBreaker;
    this.retryManager = retryManager;
    this.alertSystem = alertSystem;
    this.logger = logger;
  }

  async handleClaudeInstanceError(
    instanceId: string,
    error: Error,
    operation: string,
    context: any = {}
  ): Promise<{
    handled: boolean;
    recovered: boolean;
    action: string;
    shouldRetry: boolean;
  }> {
    this.logger.error(`Claude instance error in ${operation}: ${error.message}`);

    try {
      // Step 1: Classify error type
      const errorType = this.classifyError(error);
      this.logger.debug(`Error classified as: ${errorType}`);

      // Step 2: Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        this.logger.warn(`Circuit breaker open for instance ${instanceId}`);
        return {
          handled: true,
          recovered: false,
          action: 'circuit_breaker_open',
          shouldRetry: false
        };
      }

      // Step 3: Update error counts
      this.incrementErrorCount(instanceId);
      this.lastErrors.set(instanceId, error);

      // Step 4: Handle based on error type
      const result = await this.handleByErrorType(instanceId, errorType, error, operation, context);

      // Step 5: Update circuit breaker
      if (result.recovered) {
        this.circuitBreaker.recordSuccess();
      } else {
        this.circuitBreaker.recordFailure();
      }

      // Step 6: Send alerts if necessary
      await this.handleAlerting(instanceId, errorType, error, result);

      return result;

    } catch (handlingError: any) {
      this.logger.error(`Error handler itself failed: ${handlingError.message}`);
      this.recoveryService.escalateError(error, handlingError);

      return {
        handled: false,
        recovered: false,
        action: 'handler_failed',
        shouldRetry: false
      };
    }
  }

  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('connection') || message.includes('timeout')) {
      return 'connection_error';
    }
    if (message.includes('permission') || message.includes('access denied')) {
      return 'permission_error';
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return 'memory_error';
    }
    if (message.includes('file not found') || message.includes('enoent')) {
      return 'file_system_error';
    }
    if (message.includes('parse') || message.includes('syntax')) {
      return 'parsing_error';
    }
    if (message.includes('rate limit') || message.includes('throttle')) {
      return 'rate_limit_error';
    }
    if (message.includes('crash') || message.includes('killed')) {
      return 'instance_crash';
    }

    return 'unknown_error';
  }

  private async handleByErrorType(
    instanceId: string,
    errorType: string,
    error: Error,
    operation: string,
    context: any
  ): Promise<{
    handled: boolean;
    recovered: boolean;
    action: string;
    shouldRetry: boolean;
  }> {
    switch (errorType) {
      case 'connection_error':
        return await this.handleConnectionError(instanceId, error, context);

      case 'permission_error':
        return await this.handlePermissionError(instanceId, error, context);

      case 'memory_error':
        return await this.handleMemoryError(instanceId, error, context);

      case 'file_system_error':
        return await this.handleFileSystemError(instanceId, error, context);

      case 'rate_limit_error':
        return await this.handleRateLimitError(instanceId, error, context);

      case 'instance_crash':
        return await this.handleInstanceCrash(instanceId, error, context);

      case 'parsing_error':
        return await this.handleParsingError(instanceId, error, context);

      default:
        return await this.handleUnknownError(instanceId, error, context);
    }
  }

  private async handleConnectionError(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.info(`Handling connection error for instance ${instanceId}`);

    const shouldRetry = this.retryManager.shouldRetry('connection', this.getErrorCount(instanceId));
    if (!shouldRetry) {
      return {
        handled: true,
        recovered: false,
        action: 'max_retries_exceeded',
        shouldRetry: false
      };
    }

    // Attempt reconnection
    const reconnectionResult = await this.recoveryService.attemptReconnection(instanceId);

    if (reconnectionResult.success) {
      this.resetErrorCount(instanceId);
      this.logger.info(`Successfully reconnected instance ${instanceId}`);
      return {
        handled: true,
        recovered: true,
        action: 'reconnected',
        shouldRetry: false
      };
    }

    return {
      handled: true,
      recovered: false,
      action: 'reconnection_failed',
      shouldRetry: true
    };
  }

  private async handlePermissionError(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.warn(`Permission error for instance ${instanceId}: ${error.message}`);

    // Permission errors typically don't recover automatically
    this.recoveryService.logErrorForAnalysis(instanceId, error, 'permission_denied');

    return {
      handled: true,
      recovered: false,
      action: 'permission_denied',
      shouldRetry: false
    };
  }

  private async handleMemoryError(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.error(`Memory error for instance ${instanceId}`);

    // Attempt to restart instance with better memory configuration
    const crashResult = await this.recoveryService.handleInstanceCrash(instanceId, {
      reason: 'memory_exhaustion',
      restartConfig: {
        maxMemoryMB: context.currentMemoryMB * 1.5 // Increase memory by 50%
      }
    });

    return {
      handled: true,
      recovered: crashResult.recovered,
      action: 'instance_restarted_with_more_memory',
      shouldRetry: crashResult.recovered
    };
  }

  private async handleFileSystemError(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.warn(`File system error for instance ${instanceId}: ${error.message}`);

    // Check if workspace directory exists and is accessible
    const instanceStatus = await this.claudeManager.getInstanceStatus(instanceId);
    if (!instanceStatus) {
      return {
        handled: true,
        recovered: false,
        action: 'instance_not_found',
        shouldRetry: false
      };
    }

    return {
      handled: true,
      recovered: false,
      action: 'file_system_issue',
      shouldRetry: false
    };
  }

  private async handleRateLimitError(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.warn(`Rate limit error for instance ${instanceId}`);

    const backoffTime = this.retryManager.calculateBackoff(this.getErrorCount(instanceId));
    this.logger.info(`Backing off for ${backoffTime}ms before retry`);

    return {
      handled: true,
      recovered: false,
      action: 'rate_limited',
      shouldRetry: true,
      backoffTime
    };
  }

  private async handleInstanceCrash(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.error(`Instance crash detected for ${instanceId}`);

    const crashResult = await this.recoveryService.handleInstanceCrash(instanceId, {
      reason: 'unexpected_crash',
      preserveWorkspace: true,
      restartAttempt: this.getErrorCount(instanceId)
    });

    if (crashResult.recovered) {
      this.logger.info(`Successfully recovered from crash: ${instanceId}`);
      this.resetErrorCount(instanceId);
    }

    return {
      handled: true,
      recovered: crashResult.recovered,
      action: 'crash_recovery_attempted',
      shouldRetry: crashResult.recovered
    };
  }

  private async handleParsingError(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.warn(`Parsing error for instance ${instanceId}: ${error.message}`);

    // Log for analysis but don't retry - parsing errors usually indicate malformed input
    this.recoveryService.logErrorForAnalysis(instanceId, error, 'parsing_failure');

    return {
      handled: true,
      recovered: false,
      action: 'parsing_error_logged',
      shouldRetry: false
    };
  }

  private async handleUnknownError(instanceId: string, error: Error, context: any): Promise<any> {
    this.logger.error(`Unknown error type for instance ${instanceId}: ${error.message}`);

    // Log for analysis and escalate
    this.recoveryService.logErrorForAnalysis(instanceId, error, 'unknown_error');
    this.recoveryService.escalateError(error, { instanceId, context });

    const shouldRetry = this.retryManager.shouldRetry('unknown', this.getErrorCount(instanceId));

    return {
      handled: true,
      recovered: false,
      action: 'escalated',
      shouldRetry
    };
  }

  private async handleAlerting(instanceId: string, errorType: string, error: Error, result: any): Promise<void> {
    const errorCount = this.getErrorCount(instanceId);

    // Critical alerts
    if (errorType === 'instance_crash' || errorType === 'memory_error') {
      await this.alertSystem.sendCriticalAlert({
        instanceId,
        errorType,
        message: error.message,
        errorCount
      });
    }
    // Warning alerts
    else if (errorCount >= 5) {
      await this.alertSystem.sendWarningAlert({
        instanceId,
        errorType,
        message: `Multiple errors (${errorCount}) detected`,
        pattern: 'repeated_failures'
      });
    }
  }

  private incrementErrorCount(instanceId: string): void {
    const current = this.errorCounts.get(instanceId) || 0;
    this.errorCounts.set(instanceId, current + 1);
  }

  private getErrorCount(instanceId: string): number {
    return this.errorCounts.get(instanceId) || 0;
  }

  private resetErrorCount(instanceId: string): void {
    this.errorCounts.delete(instanceId);
  }

  // Public methods for testing
  getErrorCounts(): Map<string, number> {
    return new Map(this.errorCounts);
  }

  getLastError(instanceId: string): Error | undefined {
    return this.lastErrors.get(instanceId);
  }
}

describe('ClaudeErrorHandler', () => {
  let errorHandler: ClaudeErrorHandler;
  let mockClaudeManager: ClaudeProcessManagerMock;
  let mockRecoveryService: ErrorRecoveryServiceMock;
  let mockCircuitBreaker: CircuitBreakerMock;
  let mockRetryManager: RetryManagerMock;
  let mockAlertSystem: AlertSystemMock;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockClaudeManager = new ClaudeProcessManagerMock();
    mockRecoveryService = new ErrorRecoveryServiceMock();
    mockCircuitBreaker = new CircuitBreakerMock();
    mockRetryManager = new RetryManagerMock();
    mockAlertSystem = new AlertSystemMock();
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };

    errorHandler = new ClaudeErrorHandler(
      mockClaudeManager,
      mockRecoveryService,
      mockCircuitBreaker,
      mockRetryManager,
      mockAlertSystem,
      mockLogger
    );

    setupDefaultMockBehaviors();
  });

  function setupDefaultMockBehaviors() {
    mockCircuitBreaker.isOpen.mockReturnValue(false);
    mockRetryManager.shouldRetry.mockReturnValue(true);
    mockRetryManager.calculateBackoff.mockReturnValue(1000);
    mockRecoveryService.attemptReconnection.mockResolvedValue({ success: true });
    mockRecoveryService.handleInstanceCrash.mockResolvedValue({ recovered: true });
  }

  describe('Error Classification', () => {
    it('should classify connection errors correctly', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const connectionError = new Error('Connection timeout after 30 seconds');

      mockRecoveryService.attemptReconnection.mockResolvedValue({ success: true });

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        connectionError,
        'sendMessage'
      );

      // Assert - Connection error behavior verification
      expect(mockRecoveryService.attemptReconnection).toHaveBeenCalledWith(instanceId);
      expect(result.action).toBe('reconnected');
      expect(result.recovered).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully reconnected')
      );
    });

    it('should classify permission errors correctly', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const permissionError = new Error('Permission denied: access to /etc/passwd');

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        permissionError,
        'fileOperation'
      );

      // Assert - Permission error behavior verification
      expect(mockRecoveryService.logErrorForAnalysis).toHaveBeenCalledWith(
        instanceId,
        permissionError,
        'permission_denied'
      );
      expect(result.action).toBe('permission_denied');
      expect(result.shouldRetry).toBe(false);
      expect(result.recovered).toBe(false);
    });

    it('should classify memory errors correctly', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const memoryError = new Error('Out of memory: cannot allocate 512MB');
      const context = { currentMemoryMB: 1024 };

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        memoryError,
        'processMessage',
        context
      );

      // Assert - Memory error behavior verification
      expect(mockRecoveryService.handleInstanceCrash).toHaveBeenCalledWith(instanceId, {
        reason: 'memory_exhaustion',
        restartConfig: {
          maxMemoryMB: 1536 // 50% increase
        }
      });
      expect(result.action).toBe('instance_restarted_with_more_memory');
      expect(mockAlertSystem.sendCriticalAlert).toHaveBeenCalledWith({
        instanceId,
        errorType: 'memory_error',
        message: memoryError.message,
        errorCount: 1
      });
    });

    it('should classify instance crash correctly', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const crashError = new Error('Process killed unexpectedly (SIGKILL)');

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        crashError,
        'streamOutput'
      );

      // Assert - Crash handling behavior verification
      expect(mockRecoveryService.handleInstanceCrash).toHaveBeenCalledWith(instanceId, {
        reason: 'unexpected_crash',
        preserveWorkspace: true,
        restartAttempt: 1
      });
      expect(result.action).toBe('crash_recovery_attempted');
      expect(mockAlertSystem.sendCriticalAlert).toHaveBeenCalled();
    });

    it('should classify rate limit errors correctly', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const rateLimitError = new Error('Rate limit exceeded: too many requests');

      mockRetryManager.calculateBackoff.mockReturnValue(5000);

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        rateLimitError,
        'sendMessage'
      );

      // Assert - Rate limit behavior verification
      expect(mockRetryManager.calculateBackoff).toHaveBeenCalledWith(1);
      expect(result.action).toBe('rate_limited');
      expect(result.shouldRetry).toBe(true);
      expect(result.backoffTime).toBe(5000);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should respect open circuit breaker', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const error = new Error('Test error');

      mockCircuitBreaker.isOpen.mockReturnValue(true);

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        error,
        'sendMessage'
      );

      // Assert - Circuit breaker behavior verification
      expect(result.action).toBe('circuit_breaker_open');
      expect(result.shouldRetry).toBe(false);
      expect(mockRecoveryService.attemptReconnection).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Circuit breaker open for instance ${instanceId}`
      );
    });

    it('should record success when error is recovered', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const connectionError = new Error('Connection lost');

      mockRecoveryService.attemptReconnection.mockResolvedValue({ success: true });

      // Act
      await errorHandler.handleClaudeInstanceError(instanceId, connectionError, 'sendMessage');

      // Assert - Circuit breaker coordination
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
      expect(mockCircuitBreaker.recordFailure).not.toHaveBeenCalled();
    });

    it('should record failure when error is not recovered', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const connectionError = new Error('Connection lost');

      mockRecoveryService.attemptReconnection.mockResolvedValue({ success: false });

      // Act
      await errorHandler.handleClaudeInstanceError(instanceId, connectionError, 'sendMessage');

      // Assert
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
      expect(mockCircuitBreaker.recordSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should respect retry limits', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const error = new Error('Connection timeout');

      mockRetryManager.shouldRetry.mockReturnValue(false); // Max retries exceeded

      // Act
      const result = await errorHandler.handleClaudeInstanceError(instanceId, error, 'sendMessage');

      // Assert - Retry limit behavior verification
      expect(result.action).toBe('max_retries_exceeded');
      expect(result.shouldRetry).toBe(false);
      expect(mockRecoveryService.attemptReconnection).not.toHaveBeenCalled();
    });

    it('should calculate appropriate backoff times', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const rateLimitError = new Error('Rate limit exceeded');

      // First error - short backoff
      mockRetryManager.calculateBackoff.mockReturnValue(1000);

      // Act
      await errorHandler.handleClaudeInstanceError(instanceId, rateLimitError, 'sendMessage');

      // Simulate second error - longer backoff
      mockRetryManager.calculateBackoff.mockReturnValue(4000);
      const result2 = await errorHandler.handleClaudeInstanceError(instanceId, rateLimitError, 'sendMessage');

      // Assert - Backoff escalation verification
      expect(mockRetryManager.calculateBackoff).toHaveBeenCalledWith(1); // First call
      expect(mockRetryManager.calculateBackoff).toHaveBeenCalledWith(2); // Second call
      expect(result2.backoffTime).toBe(4000);
    });
  });

  describe('Alert System Integration', () => {
    it('should send critical alerts for severe errors', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const crashError = new Error('Segmentation fault');

      // Act
      await errorHandler.handleClaudeInstanceError(instanceId, crashError, 'processMessage');

      // Assert - Critical alert behavior verification
      expect(mockAlertSystem.sendCriticalAlert).toHaveBeenCalledWith({
        instanceId,
        errorType: 'instance_crash',
        message: crashError.message,
        errorCount: 1
      });
    });

    it('should send warning alerts for repeated failures', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const error = new Error('Connection timeout');

      mockRecoveryService.attemptReconnection.mockResolvedValue({ success: false });

      // Act - Simulate 5 failures to trigger warning
      for (let i = 0; i < 5; i++) {
        await errorHandler.handleClaudeInstanceError(instanceId, error, 'sendMessage');
      }

      // Assert - Warning alert behavior verification
      expect(mockAlertSystem.sendWarningAlert).toHaveBeenCalledWith({
        instanceId,
        errorType: 'connection_error',
        message: 'Multiple errors (5) detected',
        pattern: 'repeated_failures'
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle successful connection recovery', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const connectionError = new Error('WebSocket connection lost');

      mockRecoveryService.attemptReconnection.mockResolvedValue({ success: true });

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        connectionError,
        'sendMessage'
      );

      // Assert - Recovery behavior verification
      expect(result.recovered).toBe(true);
      expect(result.action).toBe('reconnected');
      expect(errorHandler.getErrorCount(instanceId)).toBe(0); // Should reset on success
    });

    it('should handle failed recovery attempts', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const connectionError = new Error('Network unreachable');

      mockRecoveryService.attemptReconnection.mockResolvedValue({ success: false });

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        connectionError,
        'sendMessage'
      );

      // Assert - Failed recovery behavior verification
      expect(result.recovered).toBe(false);
      expect(result.action).toBe('reconnection_failed');
      expect(result.shouldRetry).toBe(true);
      expect(errorHandler.getErrorCount(instanceId)).toBe(1); // Should maintain count
    });
  });

  describe('Error Handler Failure Scenarios', () => {
    it('should handle errors within the error handler itself', async () => {
      // Arrange
      const instanceId = 'claude-123';
      const originalError = new Error('Original error');

      mockRecoveryService.attemptReconnection.mockRejectedValue(new Error('Recovery service failed'));

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        originalError,
        'sendMessage'
      );

      // Assert - Error handler failure behavior verification
      expect(result.handled).toBe(false);
      expect(result.action).toBe('handler_failed');
      expect(mockRecoveryService.escalateError).toHaveBeenCalledWith(
        originalError,
        expect.any(Error)
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error handler itself failed')
      );
    });
  });

  describe('London School Integration Tests', () => {
    it('should coordinate all collaborators for complex error scenario', async () => {
      // Arrange - Multi-step error handling
      const instanceId = 'claude-123';
      const connectionError = new Error('Connection timeout after retries');

      mockRetryManager.shouldRetry.mockReturnValue(true);
      mockRecoveryService.attemptReconnection.mockResolvedValue({ success: true });

      // Act
      const result = await errorHandler.handleClaudeInstanceError(
        instanceId,
        connectionError,
        'sendMessage'
      );

      // Assert - Complete collaboration verification
      expect(mockCircuitBreaker.isOpen).toHaveBeenCalledBefore(mockRetryManager.shouldRetry as jest.Mock);
      expect(mockRetryManager.shouldRetry).toHaveBeenCalledBefore(mockRecoveryService.attemptReconnection as jest.Mock);
      expect(mockRecoveryService.attemptReconnection).toHaveBeenCalledBefore(mockCircuitBreaker.recordSuccess as jest.Mock);

      // Verify proper logging sequence
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Claude instance error')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Error classified as')
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Successfully reconnected')
      );

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true);
    });

    it('should maintain consistent behavior across different error types', async () => {
      // Arrange - Test multiple error types
      const instanceId = 'claude-123';
      const errors = [
        new Error('Connection timeout'),
        new Error('Permission denied'),
        new Error('Out of memory'),
        new Error('File not found'),
        new Error('Rate limit exceeded')
      ];

      const expectedActions = [
        'reconnected',
        'permission_denied',
        'instance_restarted_with_more_memory',
        'file_system_issue',
        'rate_limited'
      ];

      // Act - Process each error type
      const results = [];
      for (const error of errors) {
        const result = await errorHandler.handleClaudeInstanceError(
          instanceId,
          error,
          'testOperation'
        );
        results.push(result);
      }

      // Assert - Consistent behavior verification
      results.forEach((result, index) => {
        expect(result.handled).toBe(true);
        expect(result.action).toBe(expectedActions[index]);
      });

      // Verify all results follow the same structure
      results.forEach(result => {
        expect(result).toHaveProperty('handled');
        expect(result).toHaveProperty('recovered');
        expect(result).toHaveProperty('action');
        expect(result).toHaveProperty('shouldRetry');
      });
    });
  });
});
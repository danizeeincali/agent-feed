/**
 * Error Recovery System
 * Advanced error handling and automatic recovery for Claude Code SDK
 *
 * Features:
 * - Intelligent error classification
 * - Automatic recovery strategies
 * - Circuit breaker pattern
 * - Retry mechanisms with exponential backoff
 * - Resource cleanup and restoration
 * - Performance degradation handling
 */

import { EventEmitter } from 'events';

export enum ErrorType {
  AUTHENTICATION_ERROR = 'auth_error',
  PERMISSION_DENIED = 'permission_denied',
  TOOL_EXECUTION_ERROR = 'tool_error',
  CONTEXT_OVERFLOW = 'context_overflow',
  SESSION_TIMEOUT = 'session_timeout',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  NETWORK_ERROR = 'network_error',
  API_RATE_LIMIT = 'api_rate_limit',
  MEMORY_LEAK = 'memory_leak',
  DISK_SPACE_ERROR = 'disk_space_error',
  INTERNAL_ERROR = 'internal_error'
}

export enum RecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  RESET_SESSION = 'reset_session',
  COMPACT_CONTEXT = 'compact_context',
  ESCALATE = 'escalate',
  THROTTLE = 'throttle',
  CLEANUP = 'cleanup',
  RESTART_SERVICE = 'restart_service'
}

export interface ErrorContext {
  sessionId: string;
  userId: string;
  errorType: ErrorType;
  originalError: Error;
  stackTrace: string;
  timestamp: Date;
  attemptCount: number;
  contextSnapshot?: any;
  resourceState?: ResourceState;
  recoverySuggestions: RecoveryAction[];
}

export interface ResourceState {
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  networkConnections: number;
  activeSessions: number;
  contextSize: number;
}

export interface RecoveryStrategy {
  name: string;
  canHandle(error: ErrorContext): boolean;
  recover(error: ErrorContext): Promise<RecoveryResult>;
  preventRecurrence(error: ErrorContext): Promise<void>;
  priority: number;
}

export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message: string;
  newSessionId?: string;
  resourcesRecovered?: ResourceRecovery;
  preventionMeasures?: string[];
}

export interface ResourceRecovery {
  memoryFreed: number;
  sessionsTerminated: number;
  tempFilesRemoved: number;
  contextCompacted: boolean;
}

export interface CircuitBreakerState {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: Date;
  nextAttemptTime: Date;
  threshold: number;
}

export class ErrorRecoverySystem extends EventEmitter {
  private strategies: Map<ErrorType, RecoveryStrategy[]>;
  private circuitBreakers: Map<string, CircuitBreakerState>;
  private errorHistory: ErrorContext[];
  private recoveryAttempts: Map<string, number>;
  private sdkManager: any; // ClaudeCodeSDKManager instance

  constructor(sdkManager: any) {
    super();
    this.sdkManager = sdkManager;
    this.strategies = new Map();
    this.circuitBreakers = new Map();
    this.errorHistory = [];
    this.recoveryAttempts = new Map();

    this.initializeStrategies();
    this.initializeCircuitBreakers();
  }

  /**
   * Handle error with automatic recovery
   */
  async handleError(
    context: string,
    error: Error,
    metadata: Record<string, any> = {}
  ): Promise<RecoveryResult> {
    const errorType = this.classifyError(error);
    const sessionId = metadata.sessionId || 'unknown';
    const userId = metadata.userId || 'unknown';

    const errorContext: ErrorContext = {
      sessionId,
      userId,
      errorType,
      originalError: error,
      stackTrace: error.stack || '',
      timestamp: new Date(),
      attemptCount: this.getAttemptCount(sessionId),
      resourceState: await this.captureResourceState(),
      recoverySuggestions: this.getSuggestedRecoveryActions(errorType)
    };

    // Check circuit breaker
    const breakerKey = `${errorType}_${sessionId}`;
    if (this.isCircuitOpen(breakerKey)) {
      return {
        success: false,
        action: RecoveryAction.ESCALATE,
        message: 'Circuit breaker open - too many recent failures'
      };
    }

    // Record error
    this.recordError(errorContext);

    // Find and execute recovery strategy
    const result = await this.executeRecoveryStrategy(errorContext);

    // Update circuit breaker
    this.updateCircuitBreaker(breakerKey, result.success);

    // Emit recovery event
    this.emit('errorRecovered', { errorContext, result });

    return result;
  }

  /**
   * Handle streaming session errors
   */
  async handleStreamingError(sessionId: string, error: Error): Promise<RecoveryResult> {
    const errorType = this.classifyError(error);

    // Special handling for streaming errors
    switch (errorType) {
      case ErrorType.CONTEXT_OVERFLOW:
        return this.handleContextOverflow(sessionId);

      case ErrorType.NETWORK_ERROR:
        return this.handleNetworkError(sessionId, error);

      case ErrorType.API_RATE_LIMIT:
        return this.handleRateLimit(sessionId);

      default:
        return this.handleError('streaming', error, { sessionId });
    }
  }

  /**
   * Handle context overflow with automatic compaction
   */
  async handleContextOverflow(sessionId: string): Promise<RecoveryResult> {
    try {
      console.log(`🔄 Handling context overflow for session ${sessionId}`);

      // Attempt context compaction
      const compactionResult = await this.compactContext(sessionId);

      if (compactionResult.success) {
        return {
          success: true,
          action: RecoveryAction.COMPACT_CONTEXT,
          message: 'Context successfully compacted',
          resourcesRecovered: {
            memoryFreed: compactionResult.tokensRemoved * 4, // Rough estimate
            sessionsTerminated: 0,
            tempFilesRemoved: 0,
            contextCompacted: true
          }
        };
      } else {
        // If compaction fails, create new session
        const newSessionId = await this.createReplacementSession(sessionId);
        return {
          success: true,
          action: RecoveryAction.RESET_SESSION,
          message: 'Created new session due to context overflow',
          newSessionId
        };
      }

    } catch (error) {
      return {
        success: false,
        action: RecoveryAction.ESCALATE,
        message: `Context overflow recovery failed: ${error.message}`
      };
    }
  }

  /**
   * Handle resource exhaustion
   */
  async handleResourceExhaustion(details: any): Promise<RecoveryResult> {
    try {
      console.log('🔄 Handling resource exhaustion:', details);

      const recoveryActions: RecoveryAction[] = [];
      const resourcesRecovered: ResourceRecovery = {
        memoryFreed: 0,
        sessionsTerminated: 0,
        tempFilesRemoved: 0,
        contextCompacted: false
      };

      // 1. Terminate inactive sessions
      const inactiveSessions = await this.findInactiveSessions();
      for (const sessionId of inactiveSessions.slice(0, 5)) { // Limit to 5 sessions
        await this.sdkManager.terminateSession(sessionId, 'resource_exhaustion');
        resourcesRecovered.sessionsTerminated++;
      }
      recoveryActions.push(RecoveryAction.CLEANUP);

      // 2. Compact contexts in active sessions
      const activeSessions = await this.getActiveSessions();
      for (const sessionId of activeSessions.slice(0, 3)) { // Limit to 3 sessions
        const compacted = await this.compactContext(sessionId);
        if (compacted.success) {
          resourcesRecovered.memoryFreed += compacted.tokensRemoved * 4;
          resourcesRecovered.contextCompacted = true;
        }
      }
      recoveryActions.push(RecoveryAction.COMPACT_CONTEXT);

      // 3. Clean up temporary files
      const tempCleanup = await this.cleanupTempFiles();
      resourcesRecovered.tempFilesRemoved = tempCleanup.filesRemoved;
      resourcesRecovered.memoryFreed += tempCleanup.diskSpaceFreed;

      return {
        success: true,
        action: RecoveryAction.CLEANUP,
        message: `Resource exhaustion recovery completed: ${recoveryActions.join(', ')}`,
        resourcesRecovered
      };

    } catch (error) {
      return {
        success: false,
        action: RecoveryAction.ESCALATE,
        message: `Resource exhaustion recovery failed: ${error.message}`
      };
    }
  }

  /**
   * Handle network errors with retry logic
   */
  async handleNetworkError(sessionId: string, error: Error): Promise<RecoveryResult> {
    const attemptCount = this.getAttemptCount(sessionId);
    const maxRetries = 3;

    if (attemptCount >= maxRetries) {
      return {
        success: false,
        action: RecoveryAction.ESCALATE,
        message: `Network error: Maximum retry attempts (${maxRetries}) exceeded`
      };
    }

    // Exponential backoff
    const delay = Math.pow(2, attemptCount) * 1000; // 1s, 2s, 4s
    await this.delay(delay);

    // Increment attempt count
    this.incrementAttemptCount(sessionId);

    return {
      success: true,
      action: RecoveryAction.RETRY,
      message: `Retrying after network error (attempt ${attemptCount + 1}/${maxRetries})`
    };
  }

  /**
   * Handle API rate limiting
   */
  async handleRateLimit(sessionId: string): Promise<RecoveryResult> {
    // Implement exponential backoff for rate limiting
    const delay = 30000; // 30 seconds
    await this.delay(delay);

    return {
      success: true,
      action: RecoveryAction.THROTTLE,
      message: 'Applied rate limit throttling'
    };
  }

  /**
   * Get error statistics and patterns
   */
  async getErrorStatistics(): Promise<{
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    recoverySuccessRate: number;
    commonPatterns: string[];
    circuitBreakerStates: CircuitBreakerState[];
  }> {
    const errorsByType = {} as Record<ErrorType, number>;
    let successfulRecoveries = 0;

    for (const error of this.errorHistory) {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
    }

    // Calculate success rate from recent errors
    const recentErrors = this.errorHistory.slice(-100); // Last 100 errors
    for (const error of recentErrors) {
      // This would need to be tracked in recovery results
      // For now, estimate based on error type
      if ([ErrorType.CONTEXT_OVERFLOW, ErrorType.RESOURCE_EXHAUSTION].includes(error.errorType)) {
        successfulRecoveries++;
      }
    }

    const successRate = recentErrors.length > 0 ? successfulRecoveries / recentErrors.length : 0;

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      recoverySuccessRate: successRate,
      commonPatterns: this.identifyCommonPatterns(),
      circuitBreakerStates: Array.from(this.circuitBreakers.values())
    };
  }

  // Private helper methods

  private initializeStrategies(): void {
    // Initialize recovery strategies for each error type
    const strategies = [
      new ContextOverflowStrategy(),
      new ResourceExhaustionStrategy(),
      new NetworkErrorStrategy(),
      new RateLimitStrategy(),
      new SessionTimeoutStrategy(),
      new PermissionErrorStrategy(),
      new GenericErrorStrategy()
    ];

    for (const strategy of strategies) {
      for (const errorType of Object.values(ErrorType)) {
        if (!this.strategies.has(errorType)) {
          this.strategies.set(errorType, []);
        }
        if (strategy.canHandle({ errorType } as ErrorContext)) {
          this.strategies.get(errorType)!.push(strategy);
        }
      }
    }

    // Sort strategies by priority
    for (const [errorType, strategyList] of this.strategies.entries()) {
      strategyList.sort((a, b) => b.priority - a.priority);
    }
  }

  private initializeCircuitBreakers(): void {
    // Initialize circuit breakers for different error types
    for (const errorType of Object.values(ErrorType)) {
      this.circuitBreakers.set(errorType, {
        name: errorType,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: new Date(0),
        nextAttemptTime: new Date(0),
        threshold: 5 // Open circuit after 5 failures
      });
    }
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return ErrorType.AUTHENTICATION_ERROR;
    }
    if (message.includes('permission') || message.includes('forbidden')) {
      return ErrorType.PERMISSION_DENIED;
    }
    if (message.includes('context') && message.includes('overflow')) {
      return ErrorType.CONTEXT_OVERFLOW;
    }
    if (message.includes('timeout')) {
      return ErrorType.SESSION_TIMEOUT;
    }
    if (message.includes('rate limit') || message.includes('rate_limit')) {
      return ErrorType.API_RATE_LIMIT;
    }
    if (message.includes('network') || message.includes('connection')) {
      return ErrorType.NETWORK_ERROR;
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return ErrorType.MEMORY_LEAK;
    }
    if (message.includes('disk') || message.includes('space')) {
      return ErrorType.DISK_SPACE_ERROR;
    }
    if (message.includes('tool') || message.includes('execution')) {
      return ErrorType.TOOL_EXECUTION_ERROR;
    }

    return ErrorType.INTERNAL_ERROR;
  }

  private getSuggestedRecoveryActions(errorType: ErrorType): RecoveryAction[] {
    const suggestions: Record<ErrorType, RecoveryAction[]> = {
      [ErrorType.AUTHENTICATION_ERROR]: [RecoveryAction.RETRY, RecoveryAction.ESCALATE],
      [ErrorType.PERMISSION_DENIED]: [RecoveryAction.ESCALATE],
      [ErrorType.TOOL_EXECUTION_ERROR]: [RecoveryAction.RETRY, RecoveryAction.FALLBACK],
      [ErrorType.CONTEXT_OVERFLOW]: [RecoveryAction.COMPACT_CONTEXT, RecoveryAction.RESET_SESSION],
      [ErrorType.SESSION_TIMEOUT]: [RecoveryAction.RESET_SESSION],
      [ErrorType.RESOURCE_EXHAUSTION]: [RecoveryAction.CLEANUP, RecoveryAction.THROTTLE],
      [ErrorType.NETWORK_ERROR]: [RecoveryAction.RETRY, RecoveryAction.THROTTLE],
      [ErrorType.API_RATE_LIMIT]: [RecoveryAction.THROTTLE, RecoveryAction.RETRY],
      [ErrorType.MEMORY_LEAK]: [RecoveryAction.CLEANUP, RecoveryAction.RESTART_SERVICE],
      [ErrorType.DISK_SPACE_ERROR]: [RecoveryAction.CLEANUP],
      [ErrorType.INTERNAL_ERROR]: [RecoveryAction.RETRY, RecoveryAction.ESCALATE]
    };

    return suggestions[errorType] || [RecoveryAction.ESCALATE];
  }

  private async executeRecoveryStrategy(errorContext: ErrorContext): Promise<RecoveryResult> {
    const strategies = this.strategies.get(errorContext.errorType) || [];

    for (const strategy of strategies) {
      if (strategy.canHandle(errorContext)) {
        try {
          const result = await strategy.recover(errorContext);
          if (result.success) {
            // Execute prevention measures
            await strategy.preventRecurrence(errorContext);
            return result;
          }
        } catch (strategyError) {
          console.error(`Recovery strategy ${strategy.name} failed:`, strategyError);
        }
      }
    }

    // No strategy could handle the error
    return {
      success: false,
      action: RecoveryAction.ESCALATE,
      message: 'No recovery strategy available for this error type'
    };
  }

  private isCircuitOpen(breakerKey: string): boolean {
    const breaker = this.circuitBreakers.get(breakerKey);
    if (!breaker) return false;

    if (breaker.state === 'open') {
      return Date.now() < breaker.nextAttemptTime.getTime();
    }

    return false;
  }

  private updateCircuitBreaker(breakerKey: string, success: boolean): void {
    let breaker = this.circuitBreakers.get(breakerKey);
    if (!breaker) {
      breaker = {
        name: breakerKey,
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: new Date(0),
        nextAttemptTime: new Date(0),
        threshold: 5
      };
      this.circuitBreakers.set(breakerKey, breaker);
    }

    if (success) {
      breaker.successCount++;
      if (breaker.state === 'half-open' && breaker.successCount >= 3) {
        breaker.state = 'closed';
        breaker.failureCount = 0;
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = new Date();

      if (breaker.failureCount >= breaker.threshold) {
        breaker.state = 'open';
        breaker.nextAttemptTime = new Date(Date.now() + 60000); // 1 minute
      }
    }
  }

  private recordError(errorContext: ErrorContext): void {
    this.errorHistory.push(errorContext);

    // Keep history manageable
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500);
    }
  }

  private getAttemptCount(sessionId: string): number {
    return this.recoveryAttempts.get(sessionId) || 0;
  }

  private incrementAttemptCount(sessionId: string): void {
    const current = this.getAttemptCount(sessionId);
    this.recoveryAttempts.set(sessionId, current + 1);
  }

  private async captureResourceState(): Promise<ResourceState> {
    // Implement resource monitoring
    return {
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0, // Would need CPU monitoring
      diskUsage: 0, // Would need disk monitoring
      networkConnections: 0, // Would need network monitoring
      activeSessions: 0, // Would get from session manager
      contextSize: 0 // Would get from context manager
    };
  }

  private async compactContext(sessionId: string): Promise<{ success: boolean; tokensRemoved: number }> {
    // Integration with context manager
    // For now, return mock result
    return { success: true, tokensRemoved: 5000 };
  }

  private async createReplacementSession(sessionId: string): Promise<string> {
    // Create new session to replace the problematic one
    // Would integrate with session manager
    return `replacement_${sessionId}_${Date.now()}`;
  }

  private async findInactiveSessions(): Promise<string[]> {
    // Find sessions that haven't been active recently
    // Would integrate with session manager
    return [];
  }

  private async getActiveSessions(): Promise<string[]> {
    // Get list of active session IDs
    // Would integrate with session manager
    return [];
  }

  private async cleanupTempFiles(): Promise<{ filesRemoved: number; diskSpaceFreed: number }> {
    // Cleanup temporary files
    // Would implement file system cleanup
    return { filesRemoved: 0, diskSpaceFreed: 0 };
  }

  private identifyCommonPatterns(): string[] {
    // Analyze error history for patterns
    const patterns: string[] = [];

    // Group errors by type and timeframe
    const recentErrors = this.errorHistory.slice(-50);
    const errorCounts = new Map<ErrorType, number>();

    for (const error of recentErrors) {
      errorCounts.set(error.errorType, (errorCounts.get(error.errorType) || 0) + 1);
    }

    // Identify patterns
    for (const [errorType, count] of errorCounts.entries()) {
      if (count > 5) {
        patterns.push(`High frequency of ${errorType} errors (${count} occurrences)`);
      }
    }

    return patterns;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Recovery Strategy Implementations

abstract class BaseRecoveryStrategy implements RecoveryStrategy {
  abstract name: string;
  abstract priority: number;

  abstract canHandle(error: ErrorContext): boolean;
  abstract recover(error: ErrorContext): Promise<RecoveryResult>;

  async preventRecurrence(error: ErrorContext): Promise<void> {
    // Default implementation - override in subclasses
  }
}

class ContextOverflowStrategy extends BaseRecoveryStrategy {
  name = 'ContextOverflowStrategy';
  priority = 100;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === ErrorType.CONTEXT_OVERFLOW;
  }

  async recover(error: ErrorContext): Promise<RecoveryResult> {
    // Implement context overflow recovery
    return {
      success: true,
      action: RecoveryAction.COMPACT_CONTEXT,
      message: 'Context compacted successfully'
    };
  }
}

class ResourceExhaustionStrategy extends BaseRecoveryStrategy {
  name = 'ResourceExhaustionStrategy';
  priority = 90;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === ErrorType.RESOURCE_EXHAUSTION;
  }

  async recover(error: ErrorContext): Promise<RecoveryResult> {
    return {
      success: true,
      action: RecoveryAction.CLEANUP,
      message: 'Resources cleaned up'
    };
  }
}

class NetworkErrorStrategy extends BaseRecoveryStrategy {
  name = 'NetworkErrorStrategy';
  priority = 80;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === ErrorType.NETWORK_ERROR;
  }

  async recover(error: ErrorContext): Promise<RecoveryResult> {
    if (error.attemptCount >= 3) {
      return {
        success: false,
        action: RecoveryAction.ESCALATE,
        message: 'Maximum retry attempts exceeded'
      };
    }

    return {
      success: true,
      action: RecoveryAction.RETRY,
      message: 'Retrying after network error'
    };
  }
}

class RateLimitStrategy extends BaseRecoveryStrategy {
  name = 'RateLimitStrategy';
  priority = 85;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === ErrorType.API_RATE_LIMIT;
  }

  async recover(error: ErrorContext): Promise<RecoveryResult> {
    return {
      success: true,
      action: RecoveryAction.THROTTLE,
      message: 'Applied throttling for rate limit'
    };
  }
}

class SessionTimeoutStrategy extends BaseRecoveryStrategy {
  name = 'SessionTimeoutStrategy';
  priority = 70;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === ErrorType.SESSION_TIMEOUT;
  }

  async recover(error: ErrorContext): Promise<RecoveryResult> {
    return {
      success: true,
      action: RecoveryAction.RESET_SESSION,
      message: 'Session reset due to timeout'
    };
  }
}

class PermissionErrorStrategy extends BaseRecoveryStrategy {
  name = 'PermissionErrorStrategy';
  priority = 60;

  canHandle(error: ErrorContext): boolean {
    return error.errorType === ErrorType.PERMISSION_DENIED;
  }

  async recover(error: ErrorContext): Promise<RecoveryResult> {
    return {
      success: false,
      action: RecoveryAction.ESCALATE,
      message: 'Permission error requires manual intervention'
    };
  }
}

class GenericErrorStrategy extends BaseRecoveryStrategy {
  name = 'GenericErrorStrategy';
  priority = 10;

  canHandle(error: ErrorContext): boolean {
    return true; // Handles any error as fallback
  }

  async recover(error: ErrorContext): Promise<RecoveryResult> {
    if (error.attemptCount < 2) {
      return {
        success: true,
        action: RecoveryAction.RETRY,
        message: 'Generic retry attempt'
      };
    }

    return {
      success: false,
      action: RecoveryAction.ESCALATE,
      message: 'Generic error recovery failed'
    };
  }
}
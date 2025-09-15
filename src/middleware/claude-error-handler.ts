/**
 * Claude Process Error Handler Middleware
 * Provides bulletproof error handling for Claude instance operations
 * Prevents server crashes and provides graceful degradation
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ClaudeError extends Error {
  code?: string;
  statusCode?: number;
  instanceId?: string;
  operation?: string;
  context?: Record<string, any>;
}

export class ClaudeErrorHandler {
  /**
   * Express error handling middleware
   */
  static middleware() {
    return (error: ClaudeError, req: Request, res: Response, next: NextFunction) => {
      const errorContext = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        instanceId: error.instanceId || req.params.instanceId || req.params.id,
        operation: error.operation || ClaudeErrorHandler.getOperationFromUrl(req.url),
        userAgent: req.get('User-Agent'),
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        requestBody: req.method !== 'GET' ? ClaudeErrorHandler.sanitizeRequestBody(req.body) : undefined,
        ...error.context
      };

      logger.error('Claude operation error:', errorContext);

      // Determine appropriate HTTP status code
      const statusCode = ClaudeErrorHandler.getStatusCode(error);

      // Check if response has already been sent
      if (res.headersSent) {
        logger.warn('Error occurred after response was sent', errorContext);
        return next(error);
      }

      // Send structured error response
      const errorResponse = {
        success: false,
        error: ClaudeErrorHandler.getErrorCategory(error),
        message: ClaudeErrorHandler.getUserFriendlyMessage(error),
        instanceId: error.instanceId || req.params.instanceId || req.params.id,
        operation: errorContext.operation,
        code: error.code,
        timestamp: errorContext.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            originalError: error.message,
            stack: error.stack
          }
        })
      };

      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Async wrapper for route handlers to catch and handle errors
   */
  static asyncHandler<T = any>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
  ) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        // Add request context to error
        if (error && typeof error === 'object') {
          error.instanceId = error.instanceId || req.params.instanceId || req.params.id;
          error.operation = error.operation || ClaudeErrorHandler.getOperationFromUrl(req.url);
          error.context = {
            ...error.context,
            method: req.method,
            url: req.url,
            params: req.params,
            query: req.query
          };
        }
        next(error);
      });
    };
  }

  /**
   * Validation middleware for instance operations
   */
  static validateInstance() {
    return (req: Request, res: Response, next: NextFunction) => {
      const instanceId = req.params.instanceId || req.params.id;

      try {
        if (!instanceId) {
          const error = new Error('Instance ID is required') as ClaudeError;
          error.code = 'MISSING_INSTANCE_ID';
          error.statusCode = 400;
          error.operation = ClaudeErrorHandler.getOperationFromUrl(req.url);
          return next(error);
        }

        if (!ClaudeErrorHandler.isValidInstanceId(instanceId)) {
          const error = new Error('Invalid instance ID format') as ClaudeError;
          error.code = 'INVALID_INSTANCE_ID';
          error.statusCode = 400;
          error.instanceId = instanceId;
          error.operation = ClaudeErrorHandler.getOperationFromUrl(req.url);
          return next(error);
        }

        next();
      } catch (validationError) {
        const error = validationError as ClaudeError;
        error.operation = ClaudeErrorHandler.getOperationFromUrl(req.url);
        error.instanceId = instanceId;
        next(error);
      }
    };
  }

  /**
   * Input validation middleware
   */
  static validateInput() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        if (req.body && req.body.input !== undefined) {
          const { input } = req.body;

          if (typeof input !== 'string') {
            const error = new Error('Input must be a string') as ClaudeError;
            error.code = 'INVALID_INPUT_TYPE';
            error.statusCode = 400;
            error.instanceId = req.params.instanceId || req.params.id;
            error.operation = 'send_input';
            error.context = { inputType: typeof input };
            return next(error);
          }

          if (input.length === 0) {
            const error = new Error('Input cannot be empty') as ClaudeError;
            error.code = 'EMPTY_INPUT';
            error.statusCode = 400;
            error.instanceId = req.params.instanceId || req.params.id;
            error.operation = 'send_input';
            return next(error);
          }

          if (input.length > 10000) {
            const error = new Error('Input too long (maximum 10000 characters)') as ClaudeError;
            error.code = 'INPUT_TOO_LONG';
            error.statusCode = 400;
            error.instanceId = req.params.instanceId || req.params.id;
            error.operation = 'send_input';
            error.context = { inputLength: input.length, maxLength: 10000 };
            return next(error);
          }

          // Sanitize input (remove potentially harmful characters)
          req.body.input = ClaudeErrorHandler.sanitizeInput(input);
        }

        next();
      } catch (validationError) {
        const error = validationError as ClaudeError;
        error.operation = 'validate_input';
        error.instanceId = req.params.instanceId || req.params.id;
        next(error);
      }
    };
  }

  /**
   * Rate limiting recovery middleware
   */
  static rateLimitHandler() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (res.statusCode === 429) {
        const error = new Error('Too many requests') as ClaudeError;
        error.code = 'RATE_LIMIT_EXCEEDED';
        error.statusCode = 429;
        error.instanceId = req.params.instanceId || req.params.id;
        error.operation = ClaudeErrorHandler.getOperationFromUrl(req.url);
        error.context = {
          retryAfter: res.get('Retry-After'),
          suggestion: 'Please wait before making another request'
        };
        return next(error);
      }
      next();
    };
  }

  // Private helper methods

  private static getStatusCode(error: ClaudeError): number {
    if (error.statusCode) return error.statusCode;

    // Map error types to status codes
    switch (error.code) {
      case 'INSTANCE_NOT_FOUND':
        return 404;
      case 'INSTANCE_NOT_RUNNING':
        return 400;
      case 'INVALID_INSTANCE_ID':
      case 'INVALID_INPUT_TYPE':
      case 'EMPTY_INPUT':
      case 'INPUT_TOO_LONG':
      case 'MISSING_INSTANCE_ID':
        return 400;
      case 'RATE_LIMIT_EXCEEDED':
        return 429;
      case 'PROCESS_START_TIMEOUT':
      case 'CONNECTION_TIMEOUT':
      case 'PROCESS_ERROR':
        return 503;
      case 'MAX_INSTANCES_REACHED':
      case 'RESOURCE_EXHAUSTED':
        return 507;
      default:
        // Check error message for common patterns
        if (error.message.toLowerCase().includes('not found')) return 404;
        if (error.message.toLowerCase().includes('timeout')) return 503;
        if (error.message.toLowerCase().includes('invalid')) return 400;
        if (error.message.toLowerCase().includes('permission')) return 403;

        return 500;
    }
  }

  private static getErrorCategory(error: ClaudeError): string {
    switch (error.code) {
      case 'INSTANCE_NOT_FOUND':
        return 'Instance Not Found';
      case 'INSTANCE_NOT_RUNNING':
        return 'Instance Not Ready';
      case 'INVALID_INSTANCE_ID':
      case 'INVALID_INPUT_TYPE':
      case 'EMPTY_INPUT':
      case 'INPUT_TOO_LONG':
      case 'MISSING_INSTANCE_ID':
        return 'Validation Error';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Rate Limited';
      case 'PROCESS_START_TIMEOUT':
      case 'CONNECTION_TIMEOUT':
        return 'Timeout Error';
      case 'PROCESS_ERROR':
        return 'Process Error';
      case 'MAX_INSTANCES_REACHED':
      case 'RESOURCE_EXHAUSTED':
        return 'Resource Limit';
      default:
        return 'Internal Error';
    }
  }

  private static getUserFriendlyMessage(error: ClaudeError): string {
    switch (error.code) {
      case 'INSTANCE_NOT_FOUND':
        return 'The requested Claude instance was not found. It may have been terminated or expired.';
      case 'INSTANCE_NOT_RUNNING':
        return 'The Claude instance is not currently running. Please wait for it to start or create a new instance.';
      case 'INVALID_INSTANCE_ID':
        return 'The provided instance ID format is invalid. Please check the instance ID and try again.';
      case 'INVALID_INPUT_TYPE':
        return 'Input must be provided as text (string).';
      case 'EMPTY_INPUT':
        return 'Input cannot be empty. Please provide some text to send to Claude.';
      case 'INPUT_TOO_LONG':
        return 'Input is too long. Please keep messages under 10,000 characters.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'Too many requests. Please wait a moment before trying again.';
      case 'PROCESS_START_TIMEOUT':
        return 'Claude instance is taking longer than expected to start. Please try again in a moment.';
      case 'CONNECTION_TIMEOUT':
        return 'Connection to Claude instance timed out. Please check connectivity and try again.';
      case 'MAX_INSTANCES_REACHED':
        return 'Maximum number of Claude instances reached. Please terminate unused instances and try again.';
      default:
        return error.message || 'An unexpected error occurred while processing your request.';
    }
  }

  private static getOperationFromUrl(url: string): string {
    if (url.includes('/terminal/input')) return 'send_input';
    if (url.includes('/terminal/stream')) return 'sse_stream';
    if (url.includes('/instances') && url.includes('DELETE')) return 'terminate_instance';
    if (url.includes('/instances') && url.includes('POST')) return 'create_instance';
    if (url.includes('/instances') && url.includes('GET')) return 'get_instance';
    if (url.includes('/health')) return 'health_check';
    if (url.includes('/restart')) return 'restart_instance';
    if (url.includes('/metrics')) return 'get_metrics';
    return 'unknown';
  }

  private static isValidInstanceId(instanceId: string): boolean {
    return typeof instanceId === 'string' &&
           instanceId.length > 0 &&
           instanceId.length < 100 &&
           /^claude-[\w-]+$/.test(instanceId);
  }

  private static sanitizeInput(input: string): string {
    // Remove potentially harmful control characters but preserve newlines and tabs
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  private static sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };

    // Remove sensitive information
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    if (sanitized.secret) sanitized.secret = '[REDACTED]';

    // Truncate long inputs for logging
    if (sanitized.input && typeof sanitized.input === 'string' && sanitized.input.length > 200) {
      sanitized.input = sanitized.input.substring(0, 200) + '... (truncated)';
    }

    return sanitized;
  }

  /**
   * Create a Claude-specific error
   */
  static createError(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, any>
  ): ClaudeError {
    const error = new Error(message) as ClaudeError;
    error.code = code;
    error.statusCode = statusCode;
    error.context = context;
    return error;
  }

  /**
   * Timeout wrapper for async operations
   */
  static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
    instanceId?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        const error = ClaudeErrorHandler.createError(
          `Operation '${operation}' timed out after ${timeoutMs}ms`,
          'OPERATION_TIMEOUT',
          503,
          { timeoutMs, operation, instanceId }
        );
        reject(error);
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Circuit breaker wrapper
   */
  static createCircuitBreaker(
    operation: string,
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return {
      async execute<T>(fn: () => Promise<T>): Promise<T> {
        const now = Date.now();

        // Check if we should reset the circuit breaker
        if (state === 'open' && now - lastFailureTime > resetTimeoutMs) {
          state = 'half-open';
          failures = Math.floor(failures / 2); // Gradual recovery
        }

        // Reject if circuit is open
        if (state === 'open') {
          const error = ClaudeErrorHandler.createError(
            `Circuit breaker is open for operation '${operation}'`,
            'CIRCUIT_BREAKER_OPEN',
            503,
            { operation, failures, lastFailureTime }
          );
          throw error;
        }

        try {
          const result = await fn();

          // Success: reset failure count and close circuit
          if (state === 'half-open') {
            failures = 0;
            state = 'closed';
          }

          return result;
        } catch (error) {
          failures++;
          lastFailureTime = now;

          // Open circuit if threshold reached
          if (failures >= failureThreshold) {
            state = 'open';
            logger.warn(`Circuit breaker opened for operation '${operation}'`, {
              failures,
              threshold: failureThreshold
            });
          }

          throw error;
        }
      },

      getState() {
        return { state, failures, lastFailureTime };
      }
    };
  }
}

export default ClaudeErrorHandler;
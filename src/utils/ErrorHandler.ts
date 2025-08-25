/**
 * Comprehensive Error Handling System
 * Provides centralized error handling, logging, and recovery mechanisms
 */

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  INSTANCE_ERROR = 'INSTANCE_ERROR',
  PROCESS_ERROR = 'PROCESS_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
  SESSION_ERROR = 'SESSION_ERROR',
  HEALTH_CHECK_ERROR = 'HEALTH_CHECK_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorDetails {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
  stackTrace?: string;
  requestId?: string;
  userId?: string;
  instanceId?: string;
  recovery?: {
    attempted: boolean;
    successful?: boolean;
    action?: string;
    timestamp?: Date;
  };
}

export class AppError extends Error {
  public readonly id: string;
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly recovery?: ErrorDetails['recovery'];

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Record<string, any> = {},
    originalError?: Error
  ) {
    super(message);
    
    this.id = uuidv4();
    this.type = type;
    this.severity = severity;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date();
    this.name = this.constructor.name;
    
    if (originalError && originalError.stack) {
      this.stack = originalError.stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): ErrorDetails {
    return {
      id: this.id,
      type: this.type,
      severity: this.severity,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stackTrace: this.stack,
      recovery: this.recovery
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: winston.Logger;
  private errorStore: Map<string, ErrorDetails> = new Map();
  private errorMetrics: Map<ErrorType, number> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();

  private constructor() {
    this.setupLogger();
    this.setupErrorMetrics();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupLogger(): void {
    this.logger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ 
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({ 
          filename: 'logs/critical.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message, ...rest }) => {
              const error = rest as ErrorDetails;
              if (error.severity === ErrorSeverity.CRITICAL) {
                return JSON.stringify({ timestamp, level, message, ...rest });
              }
              return '';
            })
          )
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
          level: 'error'
        })
      ]
    });
  }

  private setupErrorMetrics(): void {
    // Initialize metrics for all error types
    Object.values(ErrorType).forEach(type => {
      this.errorMetrics.set(type, 0);
    });
  }

  /**
   * Handle and log application errors
   */
  public async handleError(error: Error | AppError, context?: Record<string, any>): Promise<ErrorDetails> {
    let appError: AppError;
    
    if (error instanceof AppError) {
      appError = error;
    } else {
      // Convert generic error to AppError
      appError = this.convertToAppError(error, context);
    }

    // Store error details
    const errorDetails = appError.toJSON();
    if (context) {
      errorDetails.context = { ...errorDetails.context, ...context };
    }
    
    this.errorStore.set(appError.id, errorDetails);
    
    // Update metrics
    const currentCount = this.errorMetrics.get(appError.type) || 0;
    this.errorMetrics.set(appError.type, currentCount + 1);
    
    // Log error based on severity
    await this.logError(errorDetails);
    
    // Attempt recovery for recoverable errors
    if (this.isRecoverableError(appError.type)) {
      await this.attemptRecovery(appError);
    }
    
    // Send alerts for critical errors
    if (appError.severity === ErrorSeverity.CRITICAL) {
      await this.sendCriticalAlert(errorDetails);
    }
    
    return errorDetails;
  }

  /**
   * Convert generic error to AppError
   */
  private convertToAppError(error: Error, context?: Record<string, any>): AppError {
    let type = ErrorType.INTERNAL_SERVER_ERROR;
    let statusCode = 500;
    let severity = ErrorSeverity.MEDIUM;

    // Classify error based on message patterns
    const message = error.message.toLowerCase();
    
    if (message.includes('validation')) {
      type = ErrorType.VALIDATION_ERROR;
      statusCode = 400;
      severity = ErrorSeverity.LOW;
    } else if (message.includes('not found')) {
      type = ErrorType.RESOURCE_NOT_FOUND;
      statusCode = 404;
      severity = ErrorSeverity.LOW;
    } else if (message.includes('unauthorized') || message.includes('authentication')) {
      type = ErrorType.AUTHENTICATION_ERROR;
      statusCode = 401;
      severity = ErrorSeverity.MEDIUM;
    } else if (message.includes('forbidden') || message.includes('permission')) {
      type = ErrorType.AUTHORIZATION_ERROR;
      statusCode = 403;
      severity = ErrorSeverity.MEDIUM;
    } else if (message.includes('instance') || message.includes('process')) {
      type = ErrorType.INSTANCE_ERROR;
      statusCode = 500;
      severity = ErrorSeverity.HIGH;
    } else if (message.includes('websocket') || message.includes('socket')) {
      type = ErrorType.WEBSOCKET_ERROR;
      statusCode = 500;
      severity = ErrorSeverity.MEDIUM;
    } else if (message.includes('database') || message.includes('sql')) {
      type = ErrorType.DATABASE_ERROR;
      statusCode = 500;
      severity = ErrorSeverity.HIGH;
    } else if (message.includes('network') || message.includes('connection')) {
      type = ErrorType.NETWORK_ERROR;
      statusCode = 500;
      severity = ErrorSeverity.MEDIUM;
    }

    return new AppError(type, error.message, statusCode, severity, context || {}, error);
  }

  /**
   * Log error with appropriate level
   */
  private async logError(error: ErrorDetails): Promise<void> {
    const logData = {
      errorId: error.id,
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      stackTrace: error.stackTrace
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('CRITICAL ERROR', logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('HIGH SEVERITY ERROR', logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('MEDIUM SEVERITY ERROR', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info('LOW SEVERITY ERROR', logData);
        break;
    }
  }

  /**
   * Check if error type is recoverable
   */
  private isRecoverableError(errorType: ErrorType): boolean {
    const recoverableTypes = [
      ErrorType.INSTANCE_ERROR,
      ErrorType.PROCESS_ERROR,
      ErrorType.WEBSOCKET_ERROR,
      ErrorType.SESSION_ERROR,
      ErrorType.NETWORK_ERROR,
      ErrorType.EXTERNAL_SERVICE_ERROR
    ];
    
    return recoverableTypes.includes(errorType);
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: AppError): Promise<void> {
    const recoveryKey = `${error.type}_${error.context.instanceId || 'global'}`;
    const attempts = this.recoveryAttempts.get(recoveryKey) || 0;
    
    // Limit recovery attempts
    if (attempts >= 3) {
      this.logger.warn(`Max recovery attempts reached for ${error.type}`);
      return;
    }

    this.recoveryAttempts.set(recoveryKey, attempts + 1);
    
    try {
      let recoveryAction = 'unknown';
      let successful = false;

      switch (error.type) {
        case ErrorType.INSTANCE_ERROR:
        case ErrorType.PROCESS_ERROR:
          recoveryAction = 'restart_instance';
          successful = await this.recoverInstance(error.context.instanceId);
          break;
          
        case ErrorType.WEBSOCKET_ERROR:
          recoveryAction = 'reconnect_websocket';
          successful = await this.recoverWebSocket(error.context.socketId);
          break;
          
        case ErrorType.SESSION_ERROR:
          recoveryAction = 'restore_session';
          successful = await this.recoverSession(error.context.sessionId);
          break;
          
        case ErrorType.NETWORK_ERROR:
        case ErrorType.EXTERNAL_SERVICE_ERROR:
          recoveryAction = 'retry_connection';
          successful = await this.retryConnection(error.context);
          break;
      }

      // Update error with recovery information
      const errorDetails = this.errorStore.get(error.id);
      if (errorDetails) {
        errorDetails.recovery = {
          attempted: true,
          successful,
          action: recoveryAction,
          timestamp: new Date()
        };
        this.errorStore.set(error.id, errorDetails);
      }

      this.logger.info(`Recovery attempt for ${error.type}: ${successful ? 'SUCCESS' : 'FAILED'}`, {
        errorId: error.id,
        action: recoveryAction,
        attempts: attempts + 1
      });

    } catch (recoveryError) {
      this.logger.error(`Recovery attempt failed for ${error.type}:`, recoveryError);
    }
  }

  /**
   * Instance recovery logic
   */
  private async recoverInstance(instanceId: string): Promise<boolean> {
    try {
      // This would integrate with ClaudeProcessManager
      // For now, return a simulated result
      await new Promise(resolve => setTimeout(resolve, 1000));
      return Math.random() > 0.3; // 70% success rate simulation
    } catch (error) {
      return false;
    }
  }

  /**
   * WebSocket recovery logic
   */
  private async recoverWebSocket(socketId: string): Promise<boolean> {
    try {
      // This would integrate with WebSocket handler
      await new Promise(resolve => setTimeout(resolve, 500));
      return Math.random() > 0.2; // 80% success rate simulation
    } catch (error) {
      return false;
    }
  }

  /**
   * Session recovery logic
   */
  private async recoverSession(sessionId: string): Promise<boolean> {
    try {
      // This would integrate with SessionManager
      await new Promise(resolve => setTimeout(resolve, 300));
      return Math.random() > 0.1; // 90% success rate simulation
    } catch (error) {
      return false;
    }
  }

  /**
   * Connection retry logic
   */
  private async retryConnection(context: Record<string, any>): Promise<boolean> {
    try {
      // This would implement connection retry logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      return Math.random() > 0.4; // 60% success rate simulation
    } catch (error) {
      return false;
    }
  }

  /**
   * Send critical error alerts
   */
  private async sendCriticalAlert(error: ErrorDetails): Promise<void> {
    try {
      // This would integrate with alerting system (email, Slack, etc.)
      this.logger.error('CRITICAL ALERT TRIGGERED', {
        errorId: error.id,
        type: error.type,
        message: error.message,
        context: error.context,
        timestamp: error.timestamp
      });
      
      // In a real implementation, this would send notifications
      // await this.alertingService.sendCriticalAlert(error);
    } catch (alertError) {
      this.logger.error('Failed to send critical alert:', alertError);
    }
  }

  /**
   * Express error handling middleware
   */
  public expressErrorHandler() {
    return async (error: Error, req: Request, res: Response, next: NextFunction) => {
      const requestContext = {
        method: req.method,
        url: req.url,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        requestId: req.headers['x-request-id'] || uuidv4(),
        userId: (req as any).user?.id,
        body: req.method === 'POST' ? req.body : undefined
      };

      const errorDetails = await this.handleError(error, requestContext);
      
      // Don't expose internal error details in production
      const isProduction = process.env.NODE_ENV === 'production';
      const responseError = {
        id: errorDetails.id,
        type: errorDetails.type,
        message: isProduction && errorDetails.severity === ErrorSeverity.CRITICAL 
          ? 'An unexpected error occurred' 
          : errorDetails.message,
        timestamp: errorDetails.timestamp,
        ...(isProduction ? {} : { context: errorDetails.context })
      };

      const statusCode = error instanceof AppError ? error.statusCode : 500;
      
      res.status(statusCode).json({
        success: false,
        error: responseError
      });
    };
  }

  /**
   * Get error statistics
   */
  public getErrorStats() {
    const totalErrors = Array.from(this.errorMetrics.values()).reduce((sum, count) => sum + count, 0);
    const errorsByType = Object.fromEntries(this.errorMetrics);
    
    const recentErrors = Array.from(this.errorStore.values())
      .filter(error => Date.now() - error.timestamp.getTime() < 3600000) // Last hour
      .length;

    const criticalErrors = Array.from(this.errorStore.values())
      .filter(error => error.severity === ErrorSeverity.CRITICAL)
      .length;

    return {
      totalErrors,
      recentErrors,
      criticalErrors,
      errorsByType,
      recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
      topErrors: Array.from(this.errorMetrics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit = 50): ErrorDetails[] {
    return Array.from(this.errorStore.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear old errors from memory
   */
  public cleanupOldErrors(maxAge = 86400000): void { // 24 hours
    const cutoff = Date.now() - maxAge;
    const errorsToRemove: string[] = [];

    for (const [id, error] of this.errorStore) {
      if (error.timestamp.getTime() < cutoff) {
        errorsToRemove.push(id);
      }
    }

    errorsToRemove.forEach(id => this.errorStore.delete(id));
    
    if (errorsToRemove.length > 0) {
      this.logger.info(`Cleaned up ${errorsToRemove.length} old errors`);
    }
  }
}

// Factory functions for common errors
export const createValidationError = (message: string, context?: Record<string, any>) => 
  new AppError(ErrorType.VALIDATION_ERROR, message, 400, ErrorSeverity.LOW, context);

export const createNotFoundError = (resource: string, id: string) => 
  new AppError(ErrorType.RESOURCE_NOT_FOUND, `${resource} with ID ${id} not found`, 404, ErrorSeverity.LOW, { resource, id });

export const createInstanceError = (instanceId: string, message: string, originalError?: Error) => 
  new AppError(ErrorType.INSTANCE_ERROR, message, 500, ErrorSeverity.HIGH, { instanceId }, originalError);

export const createWebSocketError = (socketId: string, message: string, originalError?: Error) => 
  new AppError(ErrorType.WEBSOCKET_ERROR, message, 500, ErrorSeverity.MEDIUM, { socketId }, originalError);

export const createSessionError = (sessionId: string, message: string, originalError?: Error) => 
  new AppError(ErrorType.SESSION_ERROR, message, 500, ErrorSeverity.MEDIUM, { sessionId }, originalError);

export default ErrorHandler;
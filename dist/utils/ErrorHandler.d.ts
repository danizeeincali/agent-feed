/**
 * Comprehensive Error Handling System
 * Provides centralized error handling, logging, and recovery mechanisms
 */
import { Request, Response, NextFunction } from 'express';
export declare enum ErrorType {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    INSTANCE_ERROR = "INSTANCE_ERROR",
    PROCESS_ERROR = "PROCESS_ERROR",
    WEBSOCKET_ERROR = "WEBSOCKET_ERROR",
    SESSION_ERROR = "SESSION_ERROR",
    HEALTH_CHECK_ERROR = "HEALTH_CHECK_ERROR",
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    NETWORK_ERROR = "NETWORK_ERROR"
}
export declare enum ErrorSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
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
export declare class AppError extends Error {
    readonly id: string;
    readonly type: ErrorType;
    readonly severity: ErrorSeverity;
    readonly statusCode: number;
    readonly context: Record<string, any>;
    readonly timestamp: Date;
    readonly recovery?: ErrorDetails['recovery'];
    constructor(type: ErrorType, message: string, statusCode?: number, severity?: ErrorSeverity, context?: Record<string, any>, originalError?: Error);
    toJSON(): ErrorDetails;
}
export declare class ErrorHandler {
    private static instance;
    private logger;
    private errorStore;
    private errorMetrics;
    private recoveryAttempts;
    private constructor();
    static getInstance(): ErrorHandler;
    private setupLogger;
    private setupErrorMetrics;
    /**
     * Handle and log application errors
     */
    handleError(error: Error | AppError, context?: Record<string, any>): Promise<ErrorDetails>;
    /**
     * Convert generic error to AppError
     */
    private convertToAppError;
    /**
     * Log error with appropriate level
     */
    private logError;
    /**
     * Check if error type is recoverable
     */
    private isRecoverableError;
    /**
     * Attempt error recovery
     */
    private attemptRecovery;
    /**
     * Instance recovery logic
     */
    private recoverInstance;
    /**
     * WebSocket recovery logic
     */
    private recoverWebSocket;
    /**
     * Session recovery logic
     */
    private recoverSession;
    /**
     * Connection retry logic
     */
    private retryConnection;
    /**
     * Send critical error alerts
     */
    private sendCriticalAlert;
    /**
     * Express error handling middleware
     */
    expressErrorHandler(): (error: Error, req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Get error statistics
     */
    getErrorStats(): {
        totalErrors: number;
        recentErrors: number;
        criticalErrors: number;
        errorsByType: {
            [k: string]: number;
        };
        recoveryAttempts: {
            [k: string]: number;
        };
        topErrors: [ErrorType, number][];
    };
    /**
     * Get recent errors
     */
    getRecentErrors(limit?: number): ErrorDetails[];
    /**
     * Clear old errors from memory
     */
    cleanupOldErrors(maxAge?: number): void;
}
export declare const createValidationError: (message: string, context?: Record<string, any>) => AppError;
export declare const createNotFoundError: (resource: string, id: string) => AppError;
export declare const createInstanceError: (instanceId: string, message: string, originalError?: Error) => AppError;
export declare const createWebSocketError: (socketId: string, message: string, originalError?: Error) => AppError;
export declare const createSessionError: (sessionId: string, message: string, originalError?: Error) => AppError;
export default ErrorHandler;
//# sourceMappingURL=ErrorHandler.d.ts.map
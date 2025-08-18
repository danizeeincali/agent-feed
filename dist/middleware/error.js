"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationErrorHandler = exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
// Global error handling middleware
const errorHandler = (error, req, res, _next) => {
    // Log the error
    logger_1.httpLogger.error(req, error);
    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    let details = undefined;
    // Handle different error types
    if (error instanceof types_1.AppError) {
        statusCode = error.statusCode;
        message = error.message;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
        details = error.message;
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }
    else if (error.code === '23505') { // PostgreSQL unique constraint
        statusCode = 409;
        message = 'Resource already exists';
    }
    else if (error.code === '23503') { // PostgreSQL foreign key constraint
        statusCode = 400;
        message = 'Referenced resource not found';
    }
    else if (error.code === '23502') { // PostgreSQL not null constraint
        statusCode = 400;
        message = 'Required field missing';
    }
    // Don't expose internal errors in production
    if (process.env['NODE_ENV'] === 'production' && statusCode === 500) {
        message = 'Internal server error';
        details = undefined;
    }
    const errorResponse = {
        error: {
            message,
            ...(details && { details }),
            ...(process.env['NODE_ENV'] === 'development' && { stack: error.stack })
        },
        timestamp: new Date().toISOString(),
        path: req.path
    };
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
// 404 handler for unmatched routes
const notFoundHandler = (req, _res, next) => {
    const error = new types_1.AppError(`Route not found: ${req.method} ${req.path}`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Validation error handler
const validationErrorHandler = (errors, req, res, next) => {
    if (errors.length > 0) {
        const formattedErrors = errors.map(error => ({
            field: error.param,
            message: error.msg,
            value: error.value
        }));
        res.status(400).json({
            error: {
                message: 'Validation failed',
                details: formattedErrors
            },
            timestamp: new Date().toISOString(),
            path: req.path
        });
        return;
    }
    next();
};
exports.validationErrorHandler = validationErrorHandler;
//# sourceMappingURL=error.js.map
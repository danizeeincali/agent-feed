import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/types';
import { httpLogger } from '@/utils/logger';

// Global error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  httpLogger.error(req, error);

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if ((error as any).code === '23505') { // PostgreSQL unique constraint
    statusCode = 409;
    message = 'Resource already exists';
  } else if ((error as any).code === '23503') { // PostgreSQL foreign key constraint
    statusCode = 400;
    message = 'Referenced resource not found';
  } else if ((error as any).code === '23502') { // PostgreSQL not null constraint
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

// 404 handler for unmatched routes
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404
  );
  next(error);
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler
export const validationErrorHandler = (
  errors: any[],
  req: Request,
  res: Response,
  next: NextFunction
): void => {
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
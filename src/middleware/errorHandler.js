/**
 * Comprehensive Error Handling and Logging Middleware
 * Provides structured error responses and audit logging
 */

import fs from 'fs/promises';
import path from 'path';

// Error types for classification
export const ErrorTypes = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR', 
  NOT_FOUND: 'NOT_FOUND_ERROR',
  CONFLICT: 'CONFLICT_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  INTERNAL: 'INTERNAL_SERVER_ERROR'
};

// Custom error classes
export class APIError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL, statusCode = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

export class ValidationError extends APIError {
  constructor(message, details = null) {
    super(message, ErrorTypes.VALIDATION, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message, details = null) {
    super(message, ErrorTypes.AUTHORIZATION, 401, details);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, ErrorTypes.NOT_FOUND, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends APIError {
  constructor(message, details = null) {
    super(message, ErrorTypes.CONFLICT, 409, details);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends APIError {
  constructor(message, originalError = null) {
    const details = originalError ? {
      originalMessage: originalError.message,
      code: originalError.code,
      errno: originalError.errno
    } : null;
    
    super(message, ErrorTypes.DATABASE, 500, details);
    this.name = 'DatabaseError';
  }
}

// Logger class
class Logger {
  constructor() {
    this.logDir = path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'logs');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  async writeLog(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...metadata
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      // Write to console
      const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      console[level === 'error' ? 'error' : 'log'](consoleMessage, metadata);

      // Write to file
      const date = timestamp.split('T')[0];
      const logFile = path.join(this.logDir, `${level}-${date}.log`);
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  info(message, metadata = {}) {
    return this.writeLog('info', message, metadata);
  }

  warn(message, metadata = {}) {
    return this.writeLog('warn', message, metadata);
  }

  error(message, metadata = {}) {
    return this.writeLog('error', message, metadata);
  }

  debug(message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      return this.writeLog('debug', message, metadata);
    }
  }
}

const logger = new Logger();

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  req.id = requestId;
  req.startTime = startTime;

  // Log incoming request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection.remoteAddress,
    agentId: req.params?.agentId,
    pageId: req.params?.pageId
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Performance monitoring middleware
export const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log slow requests (>1000ms)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }

    // Update performance metrics (if monitoring service is available)
    if (req.app.locals.metricsService) {
      req.app.locals.metricsService.recordResponseTime(req.method, req.route?.path || req.url, duration);
    }
  });

  next();
};

// Database error handler
export const handleDatabaseError = (error) => {
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.errno === 19) {
    return new ConflictError('Resource already exists', {
      constraint: error.message.includes('UNIQUE constraint failed') ? 'unique' : 'constraint',
      details: error.message
    });
  }

  if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || error.errno === 787) {
    return new ValidationError('Invalid reference to related resource', {
      constraint: 'foreign_key',
      details: error.message
    });
  }

  if (error.message.includes('no such table')) {
    return new DatabaseError('Database schema error: missing table', error);
  }

  return new DatabaseError('Database operation failed', error);
};

// Main error handling middleware
export const errorHandler = (error, req, res, next) => {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  let apiError;

  // Convert known error types
  if (error instanceof APIError) {
    apiError = error;
  } else if (error.name === 'ValidationError') {
    apiError = new ValidationError(error.message, error.details);
  } else if (error.message?.includes('SQLITE_') || error.errno) {
    apiError = handleDatabaseError(error);
  } else if (error.status === 429) {
    apiError = new APIError('Too many requests', ErrorTypes.RATE_LIMIT, 429);
  } else if (error.status === 413) {
    apiError = new APIError('Request entity too large', ErrorTypes.VALIDATION, 413);
  } else {
    // Unknown error - create internal server error
    apiError = new APIError(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message,
      ErrorTypes.INTERNAL,
      500
    );
  }

  // Log error with context
  logger.error('API Error', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    agentId: req.params?.agentId,
    pageId: req.params?.pageId,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    error: {
      name: apiError.name,
      type: apiError.type,
      message: apiError.message,
      statusCode: apiError.statusCode,
      details: apiError.details,
      stack: process.env.NODE_ENV === 'development' ? apiError.stack : undefined
    },
    originalError: {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  });

  // Prepare response
  const response = {
    success: false,
    error: apiError.message,
    type: apiError.type,
    timestamp: apiError.timestamp,
    requestId: req.id
  };

  // Add details in development or for validation errors
  if (apiError.details && (process.env.NODE_ENV === 'development' || apiError.type === ErrorTypes.VALIDATION)) {
    response.details = apiError.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = apiError.stack;
  }

  // Send error response
  res.status(apiError.statusCode).json(response);
};

// 404 handler for undefined routes
export const notFoundHandler = (req, res) => {
  const error = new NotFoundError('Endpoint');
  
  logger.warn('Route not found', {
    requestId: req.id,
    method: req.method,
    url: req.url,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: error.message,
    type: error.type,
    timestamp: error.timestamp,
    requestId: req.id,
    availableEndpoints: [
      'GET /api/agents/:agentId/pages',
      'POST /api/agents/:agentId/pages',
      'GET /api/agents/:agentId/pages/:pageId',
      'PUT /api/agents/:agentId/pages/:pageId',
      'DELETE /api/agents/:agentId/pages/:pageId',
      'GET /api/agents/:agentId/pages/:pageId/data',
      'POST /api/agents/:agentId/pages/:pageId/data',
      'PUT /api/agents/:agentId/pages/:pageId/data/:key',
      'DELETE /api/agents/:agentId/pages/:pageId/data/:key',
      'GET /api/agents/:agentId/pages/:pageId/versions',
      'POST /api/agents/:agentId/pages/:pageId/migrate',
      'GET /api/agents/:agentId/pages/:pageId/schema',
      'GET /api/agents/pages/health',
      'GET /api/v1/agent-posts',
      'POST /api/v1/agent-posts',
      'POST /api/v1/agent-posts/filter',
      'GET /api/v1/filter-data',
      'GET /api/v1/filter-suggestions',
      'POST /api/v1/link-preview',
      'DELETE /api/v1/agent-posts/:id',
      'POST /api/v1/agent-posts/:id/save',
      'DELETE /api/v1/agent-posts/:id/save',
      'GET /api/filter-stats',
      'GET /api/test-endpoint',
      'GET /api/agents',
      'GET /api/agent-posts',
      'POST /api/agent-posts',
      'GET /api/filter-data',
      'GET /api/filter-suggestions'
    ]
  });
};

// Graceful shutdown handler
export const gracefulShutdown = (server, services = []) => {
  const shutdown = (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(async (err) => {
      if (err) {
        logger.error('Error during server shutdown', { error: err.message });
        process.exit(1);
      }

      // Close database connections and other services
      try {
        for (const service of services) {
          if (service.close) {
            await service.close();
          }
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during service shutdown', { error: error.message });
        process.exit(1);
      }
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Force shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Utility functions
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export { logger };

export default {
  APIError,
  ValidationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ErrorTypes,
  requestLogger,
  performanceMonitor,
  errorHandler,
  notFoundHandler,
  gracefulShutdown,
  handleDatabaseError,
  logger
};
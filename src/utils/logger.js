/**
 * Centralized Logging Module
 * Provides structured logging with multiple transports and correlation tracking
 */

import winston from 'winston';
import { appConfig } from './config.js';
import { randomUUID } from 'crypto';

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, correlationId, service, ...meta }) => {
    const correlation = correlationId ? `[${correlationId}]` : '';
    const svc = service ? `[${service}]` : '';
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} ${level}${svc}${correlation}: ${message} ${metaStr}`;
  })
);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determine format based on environment
const logFormat = appConfig.isDevelopment ? developmentFormat : productionFormat;

// Create transports array
const transports = [
  // Console transport
  new winston.transports.Console({
    level: appConfig.monitoring.logLevel,
    format: logFormat,
    handleExceptions: true,
    handleRejections: true
  })
];

// Add file transports in production
if (appConfig.isProduction) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true
    })
  );
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // HTTP access log
  transports.push(
    new winston.transports.File({
      filename: 'logs/access.log',
      level: 'http',
      format: productionFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: appConfig.monitoring.logLevel,
  format: logFormat,
  defaultMeta: {
    service: 'agent-feed',
    environment: appConfig.env,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exitOnError: false
});

// Correlation ID management
const correlationStorage = new Map();

/**
 * Generate a new correlation ID
 * @returns {string} Correlation ID
 */
export const generateCorrelationId = () => {
  return randomUUID();
};

/**
 * Set correlation ID for current context
 * @param {string} correlationId - The correlation ID
 */
export const setCorrelationId = (correlationId) => {
  correlationStorage.set('current', correlationId);
};

/**
 * Get current correlation ID
 * @returns {string|null} Current correlation ID
 */
export const getCorrelationId = () => {
  return correlationStorage.get('current') || null;
};

/**
 * Clear correlation ID
 */
export const clearCorrelationId = () => {
  correlationStorage.delete('current');
};

/**
 * Create a child logger with additional metadata
 * @param {Object} meta - Additional metadata
 * @returns {Object} Child logger
 */
export const createChildLogger = (meta = {}) => {
  return logger.child(meta);
};

/**
 * Enhanced logging methods with correlation ID support
 */
const enhancedLogger = {
  error: (message, meta = {}) => {
    const correlationId = getCorrelationId();
    logger.error(message, { ...meta, correlationId });
  },
  
  warn: (message, meta = {}) => {
    const correlationId = getCorrelationId();
    logger.warn(message, { ...meta, correlationId });
  },
  
  info: (message, meta = {}) => {
    const correlationId = getCorrelationId();
    logger.info(message, { ...meta, correlationId });
  },
  
  http: (message, meta = {}) => {
    const correlationId = getCorrelationId();
    logger.http(message, { ...meta, correlationId });
  },
  
  debug: (message, meta = {}) => {
    const correlationId = getCorrelationId();
    logger.debug(message, { ...meta, correlationId });
  },
  
  // Structured logging methods
  logError: (error, context = {}) => {
    const correlationId = getCorrelationId();
    logger.error('Error occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      correlationId
    });
  },
  
  logRequest: (req, res, responseTime) => {
    const correlationId = getCorrelationId();
    logger.http('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId
    });
  },
  
  logDatabaseQuery: (query, duration, rowCount = null) => {
    const correlationId = getCorrelationId();
    logger.debug('Database Query', {
      query: appConfig.development.debugSql ? query : '[REDACTED]',
      duration,
      rowCount,
      correlationId
    });
  },
  
  logAgentAction: (agentId, action, result, duration) => {
    const correlationId = getCorrelationId();
    logger.info('Agent Action', {
      agentId,
      action,
      result,
      duration,
      correlationId
    });
  },
  
  logBusinessEvent: (event, data = {}) => {
    const correlationId = getCorrelationId();
    logger.info('Business Event', {
      event,
      data,
      timestamp: new Date().toISOString(),
      correlationId
    });
  },
  
  logSecurityEvent: (event, severity = 'medium', data = {}) => {
    const correlationId = getCorrelationId();
    logger.warn('Security Event', {
      event,
      severity,
      data,
      timestamp: new Date().toISOString(),
      correlationId
    });
  },
  
  logPerformanceMetric: (metric, value, unit = 'ms') => {
    const correlationId = getCorrelationId();
    logger.info('Performance Metric', {
      metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
      correlationId
    });
  }
};

// Performance timing utilities
export const createTimer = () => {
  const start = process.hrtime.bigint();
  
  return {
    end: () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1000000; // Convert to milliseconds
    }
  };
};

// Express middleware for request logging
export const requestLogger = (req, res, next) => {
  const correlationId = req.get('X-Correlation-ID') || generateCorrelationId();
  const timer = createTimer();
  
  // Set correlation ID for this request
  setCorrelationId(correlationId);
  
  // Add correlation ID to response headers
  res.set('X-Correlation-ID', correlationId);
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log response
  res.end = function(...args) {
    const responseTime = timer.end();
    enhancedLogger.logRequest(req, res, responseTime);
    
    // Clear correlation ID after request
    clearCorrelationId();
    
    // Call original end function
    originalEnd.apply(this, args);
  };
  
  next();
};

// Error logging middleware
export const errorLogger = (error, req, res, next) => {
  enhancedLogger.logError(error, {
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  next(error);
};

// Graceful shutdown logging
export const setupGracefulShutdown = (server, serviceName) => {
  const shutdown = (signal) => {
    enhancedLogger.info(`Received ${signal}. Starting graceful shutdown...`, {
      service: serviceName
    });
    
    server.close(() => {
      enhancedLogger.info('Server closed. Exiting process...', {
        service: serviceName
      });
      process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
      enhancedLogger.error('Could not close connections in time, forcefully shutting down', {
        service: serviceName
      });
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Export the enhanced logger as default
export default enhancedLogger;
export { logger as baseLogger };
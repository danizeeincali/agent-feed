import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, simple, colorize, printf } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}]: ${message} ${metaStr}`;
});

// Create logs directory if it doesn't exist
const logDir = path.join(process.env.WORKSPACE_ROOT || process.cwd(), 'logs');

const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { 
    service: 'agent-feed',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// Add console transport for development
if (process.env['NODE_ENV'] !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Performance logging utility
export const performanceLogger = {
  start: (operation: string) => {
    const start = Date.now();
    return {
      end: (metadata?: any) => {
        const duration = Date.now() - start;
        logger.info(`Performance: ${operation}`, {
          operation,
          duration: `${duration}ms`,
          ...metadata
        });
        return duration;
      }
    };
  }
};

// HTTP request logger
export const httpLogger = {
  request: (req: any, res: any, duration: number) => {
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id
    });
  },
  error: (req: any, error: Error) => {
    logger.error('HTTP Error', {
      method: req.method,
      url: req.url,
      error: error.message,
      stack: error.stack,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user?.id
    });
  }
};

// Claude Flow specific logger
export const claudeFlowLogger = {
  sessionStart: (sessionId: string, config: any) => {
    logger.info('Claude Flow session started', {
      sessionId,
      config,
      type: 'claude-flow-session-start'
    });
  },
  sessionEnd: (sessionId: string, metrics: any) => {
    logger.info('Claude Flow session ended', {
      sessionId,
      metrics,
      type: 'claude-flow-session-end'
    });
  },
  agentSpawn: (sessionId: string, agentType: string, agentId: string) => {
    logger.info('Agent spawned', {
      sessionId,
      agentType,
      agentId,
      type: 'claude-flow-agent-spawn'
    });
  },
  taskComplete: (sessionId: string, taskId: string, result: any) => {
    logger.info('Task completed', {
      sessionId,
      taskId,
      result,
      type: 'claude-flow-task-complete'
    });
  },
  error: (sessionId: string, error: Error, context?: any) => {
    logger.error('Claude Flow error', {
      sessionId,
      error: error.message,
      stack: error.stack,
      context,
      type: 'claude-flow-error'
    });
  }
};

// Feed processing logger
export const feedLogger = {
  fetchStart: (feedId: string, url: string) => {
    logger.info('Feed fetch started', {
      feedId,
      url,
      type: 'feed-fetch-start'
    });
  },
  fetchSuccess: (feedId: string, itemsFound: number, itemsNew: number, duration: number) => {
    logger.info('Feed fetch completed', {
      feedId,
      itemsFound,
      itemsNew,
      duration: `${duration}ms`,
      type: 'feed-fetch-success'
    });
  },
  fetchError: (feedId: string, error: Error) => {
    logger.error('Feed fetch failed', {
      feedId,
      error: error.message,
      stack: error.stack,
      type: 'feed-fetch-error'
    });
  },
  automationTrigger: (feedId: string, itemId: string, triggerType: string) => {
    logger.info('Automation triggered', {
      feedId,
      itemId,
      triggerType,
      type: 'automation-trigger'
    });
  }
};

// Security logger
export const securityLogger = {
  authSuccess: (userId: string, method: string, ip: string) => {
    logger.info('Authentication successful', {
      userId,
      method,
      ip,
      type: 'auth-success'
    });
  },
  authFailure: (email: string, method: string, ip: string, reason: string) => {
    logger.warn('Authentication failed', {
      email,
      method,
      ip,
      reason,
      type: 'auth-failure'
    });
  },
  tokenRefresh: (userId: string, ip: string) => {
    logger.info('Token refreshed', {
      userId,
      ip,
      type: 'token-refresh'
    });
  },
  suspiciousActivity: (userId: string, activity: string, ip: string) => {
    logger.warn('Suspicious activity detected', {
      userId,
      activity,
      ip,
      type: 'suspicious-activity'
    });
  }
};

export { logger };
export default logger;
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.securityLogger = exports.feedLogger = exports.claudeFlowLogger = exports.httpLogger = exports.performanceLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, errors, json, simple, colorize, printf } = winston_1.default.format;
// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
});
// Create logs directory if it doesn't exist
const logDir = path_1.default.join(process.cwd(), 'logs');
const logger = winston_1.default.createLogger({
    level: process.env['LOG_LEVEL'] || 'info',
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), json()),
    defaultMeta: {
        service: 'agent-feed',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        // File transport for errors
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for all logs
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ],
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'rejections.log')
        })
    ]
});
exports.logger = logger;
// Add console transport for development
if (process.env['NODE_ENV'] !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), consoleFormat)
    }));
}
// Performance logging utility
exports.performanceLogger = {
    start: (operation) => {
        const start = Date.now();
        return {
            end: (metadata) => {
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
exports.httpLogger = {
    request: (req, res, duration) => {
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
    error: (req, error) => {
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
exports.claudeFlowLogger = {
    sessionStart: (sessionId, config) => {
        logger.info('Claude Flow session started', {
            sessionId,
            config,
            type: 'claude-flow-session-start'
        });
    },
    sessionEnd: (sessionId, metrics) => {
        logger.info('Claude Flow session ended', {
            sessionId,
            metrics,
            type: 'claude-flow-session-end'
        });
    },
    agentSpawn: (sessionId, agentType, agentId) => {
        logger.info('Agent spawned', {
            sessionId,
            agentType,
            agentId,
            type: 'claude-flow-agent-spawn'
        });
    },
    taskComplete: (sessionId, taskId, result) => {
        logger.info('Task completed', {
            sessionId,
            taskId,
            result,
            type: 'claude-flow-task-complete'
        });
    },
    error: (sessionId, error, context) => {
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
exports.feedLogger = {
    fetchStart: (feedId, url) => {
        logger.info('Feed fetch started', {
            feedId,
            url,
            type: 'feed-fetch-start'
        });
    },
    fetchSuccess: (feedId, itemsFound, itemsNew, duration) => {
        logger.info('Feed fetch completed', {
            feedId,
            itemsFound,
            itemsNew,
            duration: `${duration}ms`,
            type: 'feed-fetch-success'
        });
    },
    fetchError: (feedId, error) => {
        logger.error('Feed fetch failed', {
            feedId,
            error: error.message,
            stack: error.stack,
            type: 'feed-fetch-error'
        });
    },
    automationTrigger: (feedId, itemId, triggerType) => {
        logger.info('Automation triggered', {
            feedId,
            itemId,
            triggerType,
            type: 'automation-trigger'
        });
    }
};
// Security logger
exports.securityLogger = {
    authSuccess: (userId, method, ip) => {
        logger.info('Authentication successful', {
            userId,
            method,
            ip,
            type: 'auth-success'
        });
    },
    authFailure: (email, method, ip, reason) => {
        logger.warn('Authentication failed', {
            email,
            method,
            ip,
            reason,
            type: 'auth-failure'
        });
    },
    tokenRefresh: (userId, ip) => {
        logger.info('Token refreshed', {
            userId,
            ip,
            type: 'token-refresh'
        });
    },
    suspiciousActivity: (userId, activity, ip) => {
        logger.warn('Suspicious activity detected', {
            userId,
            activity,
            ip,
            type: 'suspicious-activity'
        });
    }
};
exports.default = logger;
//# sourceMappingURL=logger.js.map
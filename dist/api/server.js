"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import database and services
const connection_1 = require("../database/connection");
const claude_flow_1 = require("../services/claude-flow");
// Import middleware
const error_1 = require("../middleware/error");
const auth_1 = require("../middleware/auth");
// Import routes
const auth_2 = __importDefault(require("./routes/auth"));
const feeds_1 = __importDefault(require("./routes/feeds"));
const claude_flow_2 = __importDefault(require("./routes/claude-flow"));
const automation_1 = __importDefault(require("./routes/automation"));
// Import utilities
const logger_1 = require("../utils/logger");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env['WEBSOCKET_CORS_ORIGIN'] || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
exports.io = io;
// Basic middleware
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: process.env['CORS_ORIGIN'] || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging middleware
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => {
            logger_1.logger.info(message.trim());
        }
    }
}));
// Request timing middleware
app.use((req, res, next) => {
    const timer = logger_1.performanceLogger.start(`${req.method} ${req.path}`);
    res.on('finish', () => {
        const duration = timer.end({
            status: res.statusCode,
            userId: req.user?.id
        });
        logger_1.httpLogger.request(req, res, duration);
    });
    next();
});
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
    max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
    keyGenerator: auth_1.createRateLimitKey,
    message: {
        error: {
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);
// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const health = await connection_1.db.healthCheck();
        const status = health.database && health.redis ? 'healthy' : 'unhealthy';
        res.status(status === 'healthy' ? 200 : 503).json({
            status,
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            services: {
                database: health.database ? 'up' : 'down',
                redis: health.redis ? 'up' : 'down',
                claude_flow: 'up' // Assume up for now
            },
            uptime: process.uptime()
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});
// API versioning
const apiV1 = express_1.default.Router();
// Mount routes
apiV1.use('/auth', auth_2.default);
apiV1.use('/feeds', feeds_1.default);
apiV1.use('/claude-flow', claude_flow_2.default);
apiV1.use('/automation', automation_1.default);
// Root API info
apiV1.get('/', (req, res) => {
    res.json({
        name: 'Agent Feed API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'Enterprise Agent Feed System with Claude-Flow Integration',
        documentation: '/api/v1/docs',
        endpoints: {
            auth: '/api/v1/auth',
            feeds: '/api/v1/feeds',
            claude_flow: '/api/v1/claude-flow',
            automation: '/api/v1/automation'
        },
        websocket: process.env['WEBSOCKET_ENABLED'] === 'true',
        features: {
            claude_flow_integration: true,
            neural_patterns: true,
            automation: true,
            real_time_updates: true
        }
    });
});
// Mount API router
app.use('/api/v1', apiV1);
// WebSocket handling
if (process.env['WEBSOCKET_ENABLED'] === 'true') {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            // TODO: Implement proper WebSocket authentication
            // For now, accept all connections
            next();
        }
        catch (error) {
            next(new Error('Authentication failed'));
        }
    });
    io.on('connection', (socket) => {
        logger_1.logger.info('WebSocket client connected', { socketId: socket.id });
        // Join user-specific room
        const userId = socket.handshake.auth.userId;
        if (userId) {
            socket.join(`user:${userId}`);
            logger_1.logger.debug('Socket joined user room', { socketId: socket.id, userId });
        }
        // Handle feed subscription
        socket.on('subscribe:feed', (feedId) => {
            socket.join(`feed:${feedId}`);
            logger_1.logger.debug('Socket subscribed to feed', { socketId: socket.id, feedId });
        });
        // Handle feed unsubscription
        socket.on('unsubscribe:feed', (feedId) => {
            socket.leave(`feed:${feedId}`);
            logger_1.logger.debug('Socket unsubscribed from feed', { socketId: socket.id, feedId });
        });
        // Handle Claude Flow session subscription
        socket.on('subscribe:claude-flow', (sessionId) => {
            socket.join(`claude-flow:${sessionId}`);
            logger_1.logger.debug('Socket subscribed to Claude Flow session', { socketId: socket.id, sessionId });
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('WebSocket client disconnected', { socketId: socket.id, reason });
        });
        // Handle errors
        socket.on('error', (error) => {
            logger_1.logger.error('WebSocket error:', { socketId: socket.id, error });
        });
    });
    // Claude Flow event forwarding
    claude_flow_1.claudeFlowService.on('session:started', (session) => {
        io.to(`user:${session.user_id}`).emit('claude-flow:session:started', session);
    });
    claude_flow_1.claudeFlowService.on('session:ended', (session) => {
        io.to(`user:${session.user_id}`).emit('claude-flow:session:ended', session);
    });
    claude_flow_1.claudeFlowService.on('task:completed', (taskId, result) => {
        io.to(`claude-flow:${taskId}`).emit('claude-flow:task:completed', { taskId, result });
    });
    claude_flow_1.claudeFlowService.on('neural:pattern:learned', (sessionId, pattern) => {
        io.to(`claude-flow:${sessionId}`).emit('claude-flow:neural:pattern', pattern);
    });
}
// API documentation placeholder
app.get('/api/v1/docs', (req, res) => {
    res.json({
        message: 'API Documentation',
        note: 'Comprehensive API documentation would be available here',
        swagger_url: '/api/v1/swagger.json',
        postman_collection: '/api/v1/postman.json',
        endpoints: {
            auth: {
                'POST /api/v1/auth/login': 'User login',
                'POST /api/v1/auth/register': 'User registration',
                'POST /api/v1/auth/refresh': 'Refresh access token',
                'POST /api/v1/auth/logout': 'User logout',
                'GET /api/v1/auth/profile': 'Get user profile',
                'PUT /api/v1/auth/profile': 'Update user profile'
            },
            feeds: {
                'GET /api/v1/feeds': 'Get user feeds',
                'POST /api/v1/feeds': 'Create new feed',
                'GET /api/v1/feeds/:id': 'Get feed details',
                'PUT /api/v1/feeds/:id': 'Update feed',
                'DELETE /api/v1/feeds/:id': 'Delete feed',
                'GET /api/v1/feeds/:id/items': 'Get feed items',
                'POST /api/v1/feeds/:id/fetch': 'Manual feed fetch'
            },
            claude_flow: {
                'GET /api/v1/claude-flow/sessions': 'Get user sessions',
                'POST /api/v1/claude-flow/sessions': 'Create new session',
                'GET /api/v1/claude-flow/sessions/:id': 'Get session details',
                'DELETE /api/v1/claude-flow/sessions/:id': 'End session',
                'POST /api/v1/claude-flow/sessions/:id/agents': 'Spawn agent',
                'POST /api/v1/claude-flow/sessions/:id/tasks': 'Orchestrate task'
            },
            automation: {
                'GET /api/v1/automation/feeds/:id/triggers': 'Get automation triggers',
                'POST /api/v1/automation/feeds/:id/triggers': 'Create trigger',
                'GET /api/v1/automation/feeds/:id/actions': 'Get automation actions',
                'POST /api/v1/automation/feeds/:id/actions': 'Create action',
                'GET /api/v1/automation/feeds/:id/results': 'Get automation results'
            }
        }
    });
});
// Error handling
app.use(error_1.notFoundHandler);
app.use(error_1.errorHandler);
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}, starting graceful shutdown...`);
    // Close server
    server.close(async () => {
        logger_1.logger.info('HTTP server closed');
        try {
            // Close database connections
            await connection_1.db.close();
            logger_1.logger.info('Database connections closed');
            // Close WebSocket connections
            io.close();
            logger_1.logger.info('WebSocket server closed');
            logger_1.logger.info('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            logger_1.logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
    // Force close after 30 seconds
    setTimeout(() => {
        logger_1.logger.error('Forceful shutdown after timeout');
        process.exit(1);
    }, 30000);
};
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
// Start server
const PORT = process.env['PORT'] || 3000;
const NODE_ENV = process.env['NODE_ENV'] || 'development';
server.listen(PORT, () => {
    logger_1.logger.info(`Agent Feed API server started`, {
        port: PORT,
        environment: NODE_ENV,
        version: process.env.npm_package_version || '1.0.0',
        websocket: process.env['WEBSOCKET_ENABLED'] === 'true',
        claude_flow: process.env['CLAUDE_FLOW_ENABLED'] === 'true'
    });
});
exports.default = app;
//# sourceMappingURL=server.js.map
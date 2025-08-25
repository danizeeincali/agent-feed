"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = exports.getWebSocketHubIntegration = exports.getTerminalStreamingService = exports.broadcastNotification = exports.broadcastToUser = exports.broadcastToPost = exports.broadcastToFeed = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const ProcessManager_1 = require("../services/ProcessManager");
// NEW: Import Claude Instance Management services
const ClaudeProcessManager_1 = __importDefault(require("../services/ClaudeProcessManager"));
const SessionManager_1 = __importDefault(require("../services/SessionManager"));
const HealthMonitor_1 = __importDefault(require("../services/HealthMonitor"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
const claude_instance_chat_1 = __importDefault(require("../api/websockets/claude-instance-chat"));
// Import WebSocket Hub
const hub_activator_1 = require("../websockets/hub-activator");
// Import middleware (temporarily disabled for debugging)
// import { errorHandler, notFoundHandler } from '@/middleware/error';
// import { authenticateToken, optionalAuth, createRateLimitKey } from '@/middleware/auth';
// Import routes
const auth_1 = __importDefault(require("@/api/routes/auth"));
const feeds_1 = __importDefault(require("@/api/routes/feeds"));
const claude_flow_1 = __importDefault(require("@/api/routes/claude-flow"));
const automation_1 = __importDefault(require("@/api/routes/automation"));
const agent_posts_1 = __importDefault(require("@/api/routes/agent-posts"));
const comments_1 = __importDefault(require("@/api/routes/comments"));
const comments_enhanced_1 = __importDefault(require("@/api/routes/comments-enhanced"));
const agents_1 = __importDefault(require("@/api/routes/agents"));
const agents_instance_1 = __importDefault(require("@/api/routes/agents-instance"));
const posts_1 = __importDefault(require("@/api/routes/posts"));
const comments_agentlink_1 = __importDefault(require("@/api/routes/comments-agentlink"));
const engagement_1 = __importDefault(require("@/api/routes/engagement"));
const claude_orchestration_1 = __importDefault(require("@/api/routes/claude-orchestration"));
const dual_instance_1 = __importDefault(require("@/api/routes/dual-instance"));
const dual_instance_monitoring_1 = __importDefault(require("./routes/dual-instance-monitoring"));
const demo_agents_1 = __importDefault(require("@/api/routes/demo-agents"));
const claude_code_integration_1 = __importDefault(require("@/api/routes/claude-code-integration"));
const prod_claude_1 = __importDefault(require("@/api/routes/prod-claude"));
const simple_claude_launcher_1 = __importDefault(require("@/api/routes/simple-claude-launcher"));
// NEW: Import Claude Instance Management routes
const claude_instances_1 = __importStar(require("@/api/routes/claude-instances"));
const comments_2 = require("@/api/websockets/comments");
const claude_agents_1 = require("@/api/websockets/claude-agents");
const claude_instance_terminal_1 = require("@/websockets/claude-instance-terminal");
const terminal_streaming_1 = __importDefault(require("@/services/terminal-streaming"));
// Import utilities
const logger_1 = require("@/utils/logger");
const single_user_1 = require("@/middleware/single-user");
// Import production Claude service
const prod_claude_service_1 = require("@/services/prod-claude-service");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const httpServer = (0, http_1.createServer)(app);
exports.server = httpServer;
// NEW: Initialize Claude Instance Management services
const claudeProcessManager = new ClaudeProcessManager_1.default();
const sessionManager = new SessionManager_1.default();
const healthMonitor = new HealthMonitor_1.default(claudeProcessManager, sessionManager);
const errorHandler = ErrorHandler_1.default.getInstance();
// NEW: Initialize Claude Instance WebSocket Handler
let claudeInstanceWebSocketHandler;
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: [
            // Localhost variations
            "http://localhost:3000", "http://localhost:3001", "http://localhost:5173",
            "https://localhost:3000", "https://localhost:3001", "https://localhost:5173",
            // IPv4 localhost
            "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:5173",
            "https://127.0.0.1:3000", "https://127.0.0.1:3001", "https://127.0.0.1:5173",
            // IPv6 localhost (modern browsers)
            "http://[::1]:3000", "http://[::1]:3001", "http://[::1]:5173",
            "https://[::1]:3000", "https://[::1]:3001", "https://[::1]:5173",
            // Common development domains
            "http://0.0.0.0:3000", "http://0.0.0.0:3001", "http://0.0.0.0:5173"
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers"
        ],
        credentials: true,
        optionsSuccessStatus: 200
    },
    transports: ['polling', 'websocket'],
    // CRITICAL FIX: Synchronized timeout settings with client
    pingTimeout: 20000, // Reduced from 60000 - more responsive
    pingInterval: 8000, // Reduced from 25000 - more frequent pings
    upgradeTimeout: 15000, // Reduced from 30000 - faster upgrade timeout
    connectTimeout: 15000, // NEW: Connection establishment timeout
    allowUpgrades: true, // NEW: Ensure WebSocket upgrades are allowed
    httpCompression: true, // NEW: Enable compression for better performance
    allowEIO3: true, // NEW: Backward compatibility
    allowRequest: (req, callback) => {
        // SIMPLIFIED: Allow all connections in development for terminal functionality
        console.log('🔍 WebSocket Connection Request:', {
            origin: req.headers.origin,
            method: req.method,
            url: req.url,
            timestamp: new Date().toISOString()
        });
        // Always allow in development - terminal functionality is critical
        callback(null, true);
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
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts for Vite
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"], // Allow WebSocket connections
            fontSrc: ["'self'", "data:"],
            manifestSrc: ["'self'"],
        },
    },
}));
app.use((0, compression_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = [
            // Localhost variations
            'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173',
            'https://localhost:3000', 'https://localhost:3001', 'https://localhost:5173',
            // IPv4 localhost
            'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:5173',
            'https://127.0.0.1:3000', 'https://127.0.0.1:3001', 'https://127.0.0.1:5173',
            // IPv6 localhost
            'http://[::1]:3000', 'http://[::1]:3001', 'http://[::1]:5173',
            'https://[::1]:3000', 'https://[::1]:3001', 'https://[::1]:5173',
            // Development variations
            'http://0.0.0.0:3000', 'http://0.0.0.0:3001', 'http://0.0.0.0:5173'
        ];
        console.log('🔍 Express CORS Check:', { origin, allowed: !origin || allowedOrigins.includes(origin) });
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else if (process.env.NODE_ENV === 'development') {
            console.log('⚠️  Development: allowing origin', origin);
            callback(null, true);
        }
        else {
            console.log('❌ Express CORS rejected:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods',
        'Access-Control-Allow-Headers'
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Logging middleware (simplified)
app.use((0, morgan_1.default)('combined'));
// Single-user middleware - automatically provides user context
app.use('/api', single_user_1.singleUserMiddleware);
// Request timing middleware (disabled for debugging)
// app.use((req, res, next) => {
//   const timer = performanceLogger.start(`${req.method} ${req.path}`);
//   
//   res.on('finish', () => {
//     const duration = timer.end({
//       status: res.statusCode,
//       userId: (req as any).user?.id
//     });
//     
//     httpLogger.request(req, res, duration);
//   });
//   
//   next();
// });
// Rate limiting (temporarily disabled for debugging)
// const limiter = rateLimit({
//   windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'), // 1 minute
//   max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '1000'), // 1000 requests
//   keyGenerator: createRateLimitKey,
//   message: {
//     error: {
//       message: 'Too many requests, please try again later',
//       code: 'RATE_LIMIT_EXCEEDED'
//     }
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   skip: (req) => {
//     // Skip rate limiting in development for localhost
//     return process.env.NODE_ENV === 'development' && req.ip === '::1';
//   }
// });
// app.use(limiter);
// Static file serving for frontend
const frontendPath = path_1.default.join(__dirname, '../../frontend/dist');
app.use(express_1.default.static(frontendPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));
// Favicon handling
app.get(['/favicon.ico', '/vite.svg'], (req, res) => {
    // Return a 1x1 transparent PNG as fallback
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(transparentPng);
});
// Health check endpoint (no database dependency)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        services: {
            api: 'up',
            database: 'disabled',
            redis: 'fallback-enabled',
            claude_flow: 'disabled'
        },
        uptime: process.uptime()
    });
});
// API versioning
const apiV1 = express_1.default.Router();
// Mount routes
apiV1.use('/auth', auth_1.default);
apiV1.use('/feeds', feeds_1.default);
apiV1.use('/claude-flow', claude_flow_1.default);
apiV1.use('/automation', automation_1.default);
apiV1.use('/agent-posts', agent_posts_1.default);
apiV1.use('/posts', posts_1.default);
apiV1.use('/', comments_agentlink_1.default);
apiV1.use('/', engagement_1.default);
apiV1.use('/agents', agents_instance_1.default);
apiV1.use('/agents-legacy', agents_1.default);
apiV1.use('/claude', claude_orchestration_1.default);
apiV1.use('/dual-instance', dual_instance_1.default);
apiV1.use('/dual-instance-monitor', dual_instance_monitoring_1.default);
apiV1.use('/demo', demo_agents_1.default);
apiV1.use('/claude-live', claude_code_integration_1.default);
apiV1.use('/prod-claude', prod_claude_1.default);
apiV1.use('/claude-launcher', simple_claude_launcher_1.default);
// NEW: Mount Claude Instance Management routes
apiV1.use('/claude/instances', claude_instances_1.default);
// CRITICAL FIX: Mount simple launcher at the path frontend expects
app.use('/api/claude', simple_claude_launcher_1.default);
// NEW: Mount Claude Instance Management at expected paths  
app.use('/api/claude/instances', claude_instances_1.default);
app.use('/api/v1/claude/instances', claude_instances_1.default);
apiV1.use('/', comments_1.default);
apiV1.use('/', comments_enhanced_1.default);
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
            automation: '/api/v1/automation',
            agent_posts: '/api/v1/agent-posts'
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
// Root route to serve React app  
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            console.error('Error serving frontend index.html:', err);
            res.status(500).json({
                error: 'Frontend application not available',
                message: 'Please ensure the frontend is built'
            });
        }
    });
});
const connectedUsers = new Map();
const typingUsers = new Map();
// Rate limiting for WebSocket events
const socketRateLimit = new Map();
const SOCKET_RATE_LIMIT = 100; // messages per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
function checkSocketRateLimit(socketId) {
    const now = Date.now();
    const userLimit = socketRateLimit.get(socketId);
    if (!userLimit || now > userLimit.resetTime) {
        socketRateLimit.set(socketId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (userLimit.count >= SOCKET_RATE_LIMIT) {
        return false;
    }
    userLimit.count++;
    return true;
}
// CRITICAL FIX: Always initialize WebSocket but with proper checks
const WEBSOCKET_ENABLED = process.env['WEBSOCKET_ENABLED'] === 'true';
console.log('🔌 WebSocket configuration:', {
    enabled: WEBSOCKET_ENABLED,
    pingTimeout: 20000,
    pingInterval: 8000,
    transports: ['polling', 'websocket']
});
if (WEBSOCKET_ENABLED) {
    // CRITICAL FIX: Disable main server authentication middleware 
    // WebSocket Hub is handling authentication internally
    console.log('🚀 WebSocket enabled but authentication delegated to WebSocket Hub');
    // No io.use() middleware here - WebSocket Hub handles all authentication
    // CRITICAL FIX: Initialize Terminal WebSocket Namespace
    console.log('🔧 Initializing ClaudeInstanceTerminalWebSocket...');
    const terminalWebSocket = new claude_instance_terminal_1.ClaudeInstanceTerminalWebSocket(io);
    console.log('✅ ClaudeInstanceTerminalWebSocket initialized successfully');
    // NEW: Initialize Claude Instance WebSocket Handler
    console.log('🔧 Initializing Claude Instance WebSocket Handler...');
    claudeInstanceWebSocketHandler = new claude_instance_chat_1.default(httpServer, claudeProcessManager);
    console.log('✅ Claude Instance WebSocket Handler initialized successfully');
    // Initialize Advanced Terminal Streaming Service
    console.log('🔧 Initializing Advanced Terminal Streaming Service...');
    const terminalStreamingService = new terminal_streaming_1.default(io, {
        shell: process.env.TERMINAL_SHELL || '/bin/bash',
        maxSessions: parseInt(process.env.TERMINAL_MAX_SESSIONS || '50'),
        sessionTimeout: parseInt(process.env.TERMINAL_SESSION_TIMEOUT || '1800000'), // 30 minutes
        authentication: process.env.TERMINAL_AUTH_ENABLED === 'true'
    });
    console.log('✅ Advanced Terminal Streaming Service initialized successfully');
    // CRITICAL FIX: Add authentication middleware for root namespace
    io.use(async (socket, next) => {
        try {
            // Simple auth for terminal connections
            const auth = socket.handshake.auth;
            const userId = auth.userId || auth.user_id || 'anonymous-user';
            const username = auth.username || `User-${userId.slice(0, 8)}`;
            // Set user info on socket
            socket.user = {
                id: userId,
                username: username,
                lastSeen: new Date()
            };
            console.log('🔍 Root namespace auth successful:', { userId, username });
            next();
        }
        catch (error) {
            console.error('🔍 Root namespace auth failed:', error);
            next(); // Allow connection anyway for debugging
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.user?.id;
        logger_1.logger.info('WebSocket client connected', {
            socketId: socket.id,
            userId,
            username: socket.user?.username
        });
        // Add user to connected users
        if (userId && socket.user) {
            connectedUsers.set(userId, socket.user);
            // Join user-specific room
            socket.join(`user:${userId}`);
            socket.rooms?.add(`user:${userId}`);
            // Broadcast user online status
            socket.broadcast.emit('agent:status', {
                type: 'user_online',
                userId,
                username: socket.user.username,
                timestamp: new Date().toISOString()
            });
        }
        // Enhanced feed subscription with room management
        socket.on('subscribe:feed', (feedId) => {
            if (!checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded' });
                return;
            }
            socket.join(`feed:${feedId}`);
            socket.rooms?.add(`feed:${feedId}`);
            logger_1.logger.debug('Socket subscribed to feed', { socketId: socket.id, feedId, userId });
            // Send current feed status
            socket.emit('feed:subscribed', { feedId, timestamp: new Date().toISOString() });
        });
        // Enhanced feed unsubscription
        socket.on('unsubscribe:feed', (feedId) => {
            socket.leave(`feed:${feedId}`);
            socket.rooms?.delete(`feed:${feedId}`);
            logger_1.logger.debug('Socket unsubscribed from feed', { socketId: socket.id, feedId, userId });
            socket.emit('feed:unsubscribed', { feedId, timestamp: new Date().toISOString() });
        });
        // Post subscription for real-time comments
        socket.on('subscribe:post', (postId) => {
            if (!checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded' });
                return;
            }
            socket.join(`post:${postId}`);
            socket.rooms?.add(`post:${postId}`);
            logger_1.logger.debug('Socket subscribed to post', { socketId: socket.id, postId, userId });
        });
        socket.on('unsubscribe:post', (postId) => {
            socket.leave(`post:${postId}`);
            socket.rooms?.delete(`post:${postId}`);
            // Remove from typing users if present
            for (const [key, value] of typingUsers.entries()) {
                if (value.postId === postId && value.userId === userId) {
                    typingUsers.delete(key);
                    socket.to(`post:${postId}`).emit('user:typing', {
                        postId,
                        userId,
                        username: socket.user?.username,
                        isTyping: false
                    });
                    break;
                }
            }
        });
        // Typing indicators
        socket.on('user:typing', (data) => {
            if (!userId || !checkSocketRateLimit(socket.id))
                return;
            const { postId, isTyping } = data;
            const typingKey = `${userId}-${postId}`;
            if (isTyping) {
                typingUsers.set(typingKey, {
                    postId,
                    userId,
                    timestamp: new Date()
                });
            }
            else {
                typingUsers.delete(typingKey);
            }
            // Broadcast typing status to others in the post room
            socket.to(`post:${postId}`).emit('user:typing', {
                postId,
                userId,
                username: socket.user?.username,
                isTyping,
                timestamp: new Date().toISOString()
            });
        });
        // Real-time post interactions
        socket.on('post:like', (data) => {
            if (!userId || !checkSocketRateLimit(socket.id))
                return;
            const { postId, action } = data;
            // Broadcast like event to all subscribers of this post
            io.to(`post:${postId}`).emit('like:updated', {
                postId,
                userId,
                username: socket.user?.username,
                action,
                timestamp: new Date().toISOString()
            });
            logger_1.logger.debug('Post like event', { postId, userId, action });
        });
        // Real-time comment events
        socket.on('comment:create', (data) => {
            if (!userId || !checkSocketRateLimit(socket.id))
                return;
            const { postId, content, commentId } = data;
            // Broadcast new comment to all post subscribers
            io.to(`post:${postId}`).emit('comment:created', {
                commentId,
                postId,
                content,
                authorId: userId,
                authorName: socket.user?.username,
                timestamp: new Date().toISOString()
            });
            logger_1.logger.debug('Comment created', { postId, commentId, userId });
        });
        socket.on('comment:update', (data) => {
            if (!userId || !checkSocketRateLimit(socket.id))
                return;
            const { postId, commentId, content } = data;
            io.to(`post:${postId}`).emit('comment:updated', {
                commentId,
                postId,
                content,
                authorId: userId,
                authorName: socket.user?.username,
                timestamp: new Date().toISOString()
            });
        });
        socket.on('comment:delete', (data) => {
            if (!userId || !checkSocketRateLimit(socket.id))
                return;
            const { postId, commentId } = data;
            io.to(`post:${postId}`).emit('comment:deleted', {
                commentId,
                postId,
                authorId: userId,
                timestamp: new Date().toISOString()
            });
        });
        // Agent status updates
        socket.on('agent:status:request', () => {
            if (!checkSocketRateLimit(socket.id))
                return;
            // Send current online users
            const onlineUsers = Array.from(connectedUsers.values()).map(user => ({
                id: user.id,
                username: user.username,
                lastSeen: user.lastSeen
            }));
            socket.emit('agent:status:response', {
                onlineUsers,
                totalConnected: connectedUsers.size,
                timestamp: new Date().toISOString()
            });
        });
        // Claude Flow session subscription
        socket.on('subscribe:claude-flow', (sessionId) => {
            if (!checkSocketRateLimit(socket.id))
                return;
            socket.join(`claude-flow:${sessionId}`);
            socket.rooms?.add(`claude-flow:${sessionId}`);
            logger_1.logger.debug('Socket subscribed to Claude Flow session', { socketId: socket.id, sessionId, userId });
        });
        socket.on('unsubscribe:claude-flow', (sessionId) => {
            socket.leave(`claude-flow:${sessionId}`);
            socket.rooms?.delete(`claude-flow:${sessionId}`);
        });
        // Token Analytics WebSocket Handlers
        socket.on('token-usage', (data) => {
            if (!checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded' });
                return;
            }
            // Validate token usage data
            if (!data.provider || !data.model || typeof data.tokensUsed !== 'number') {
                socket.emit('error', { message: 'Invalid token usage data' });
                return;
            }
            const tokenUsage = {
                ...data,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                userId
            };
            logger_1.logger.debug('Token usage received', { tokenUsage, socketId: socket.id, userId });
            // Broadcast to all connected clients for real-time updates
            io.emit('token-usage-update', tokenUsage);
            // Send acknowledgment
            socket.emit('token-usage-ack', {
                id: tokenUsage.id,
                timestamp: tokenUsage.timestamp,
                status: 'processed'
            });
        });
        // Token analytics subscription
        socket.on('subscribe:token-analytics', () => {
            if (!checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded' });
                return;
            }
            socket.join('token-analytics');
            socket.rooms?.add('token-analytics');
            logger_1.logger.debug('Socket subscribed to token analytics', { socketId: socket.id, userId });
            // Send current connection status
            socket.emit('token-analytics:subscribed', {
                timestamp: new Date().toISOString(),
                status: 'connected'
            });
        });
        socket.on('unsubscribe:token-analytics', () => {
            socket.leave('token-analytics');
            socket.rooms?.delete('token-analytics');
            logger_1.logger.debug('Socket unsubscribed from token analytics', { socketId: socket.id, userId });
        });
        // Heartbeat for connection health
        socket.on('ping', () => {
            if (userId && socket.user) {
                socket.user.lastSeen = new Date();
                connectedUsers.set(userId, socket.user);
            }
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });
        // Enhanced disconnect handling
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('WebSocket client disconnected', { socketId: socket.id, reason, userId });
            if (userId) {
                // Remove from connected users
                connectedUsers.delete(userId);
                // Clean up typing indicators
                for (const [key, value] of typingUsers.entries()) {
                    if (value.userId === userId) {
                        typingUsers.delete(key);
                        io.to(`post:${value.postId}`).emit('user:typing', {
                            postId: value.postId,
                            userId,
                            username: socket.user?.username,
                            isTyping: false
                        });
                    }
                }
                // Broadcast user offline status
                socket.broadcast.emit('agent:status', {
                    type: 'user_offline',
                    userId,
                    username: socket.user?.username,
                    timestamp: new Date().toISOString()
                });
            }
            // Clean up rate limiting
            socketRateLimit.delete(socket.id);
        });
        // ProcessManager WebSocket event handlers
        // Process launch handler
        socket.on('process:launch', async (data) => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            try {
                logger_1.logger.info('ProcessManager: Launch request received', { userId, socketId: socket.id });
                const processInfo = await ProcessManager_1.processManager.launchInstance(data.config);
                socket.emit('process:launched', {
                    ...processInfo,
                    timestamp: new Date().toISOString()
                });
                logger_1.logger.info('ProcessManager: Instance launched successfully', {
                    pid: processInfo.pid,
                    name: processInfo.name,
                    userId
                });
            }
            catch (error) {
                logger_1.logger.error('ProcessManager: Launch failed', { error: error.message, userId });
                socket.emit('process:error', {
                    action: 'launch',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Process kill handler
        socket.on('process:kill', async () => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            try {
                logger_1.logger.info('ProcessManager: Kill request received', { userId, socketId: socket.id });
                await ProcessManager_1.processManager.killInstance();
                socket.emit('process:killed', {
                    timestamp: new Date().toISOString()
                });
                logger_1.logger.info('ProcessManager: Instance killed successfully', { userId });
            }
            catch (error) {
                logger_1.logger.error('ProcessManager: Kill failed', { error: error.message, userId });
                socket.emit('process:error', {
                    action: 'kill',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Process restart handler
        socket.on('process:restart', async () => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            try {
                logger_1.logger.info('ProcessManager: Restart request received', { userId, socketId: socket.id });
                socket.emit('process:restarting', {
                    timestamp: new Date().toISOString()
                });
                const processInfo = await ProcessManager_1.processManager.restartInstance();
                socket.emit('process:restarted', {
                    ...processInfo,
                    timestamp: new Date().toISOString()
                });
                logger_1.logger.info('ProcessManager: Instance restarted successfully', {
                    pid: processInfo.pid,
                    name: processInfo.name,
                    userId
                });
            }
            catch (error) {
                logger_1.logger.error('ProcessManager: Restart failed', { error: error.message, userId });
                socket.emit('process:error', {
                    action: 'restart',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Process info handler
        socket.on('process:info', () => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            try {
                const processInfo = ProcessManager_1.processManager.getProcessInfo();
                socket.emit('process:info:response', {
                    ...processInfo,
                    timestamp: new Date().toISOString()
                });
                logger_1.logger.debug('ProcessManager: Process info requested', { processInfo, userId });
            }
            catch (error) {
                logger_1.logger.error('ProcessManager: Failed to get process info', { error: error.message, userId });
                socket.emit('process:error', {
                    action: 'info',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Terminal input handler (legacy support for ProcessManager)
        socket.on('terminal:input', (data) => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            try {
                const { input } = data;
                if (typeof input !== 'string') {
                    socket.emit('terminal:error', {
                        error: 'Input must be a string',
                        timestamp: new Date().toISOString()
                    });
                    return;
                }
                ProcessManager_1.processManager.sendInput(input);
                logger_1.logger.debug('ProcessManager: Terminal input sent', { input: input.substring(0, 100), userId });
            }
            catch (error) {
                logger_1.logger.error('ProcessManager: Failed to send terminal input', { error: error.message, userId });
                socket.emit('terminal:error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Enhanced terminal session management handlers
        socket.on('terminal:sessions:list', () => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            try {
                const stats = terminalStreamingService.getSessionStats();
                socket.emit('terminal:sessions:response', {
                    ...stats,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to get terminal sessions', { error: error.message, userId });
                socket.emit('terminal:error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Terminal broadcast handler (admin only)
        socket.on('terminal:broadcast', (data) => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            // Add authorization check for admin users here
            // if (!isAdmin(userId)) {
            //   socket.emit('terminal:error', { error: 'Unauthorized' });
            //   return;
            // }
            try {
                terminalStreamingService.broadcastToSessions(data.event || 'admin:message', {
                    message: data.message,
                    from: 'admin',
                    userId
                });
                logger_1.logger.info('Terminal broadcast sent', { message: data.message, userId });
                socket.emit('terminal:broadcast:sent', {
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                logger_1.logger.error('Failed to broadcast to terminals', { error: error.message, userId });
                socket.emit('terminal:error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
        // Enhanced error handling with ErrorHandler integration
        socket.on('error', async (error) => {
            const errorDetails = await errorHandler.handleError(error, {
                socketId: socket.id,
                userId,
                type: 'websocket_error'
            });
            logger_1.logger.error('WebSocket error:', { socketId: socket.id, errorId: errorDetails.id, userId });
            // Send error details back to client for debugging
            socket.emit('error:details', {
                id: errorDetails.id,
                message: error.message,
                timestamp: new Date().toISOString(),
                socketId: socket.id
            });
        });
        // Security audit handler
        socket.on('terminal:security:audit', () => {
            if (!userId || !checkSocketRateLimit(socket.id)) {
                socket.emit('error', { message: 'Rate limit exceeded or unauthorized' });
                return;
            }
            try {
                const auditData = {
                    socketId: socket.id,
                    userId,
                    connectedAt: new Date().toISOString(),
                    rateLimiter: socket.rateLimiter || null,
                    terminalStats: terminalStreamingService.getSessionStats()
                };
                socket.emit('terminal:security:audit:response', auditData);
                logger_1.logger.info('Security audit requested', { userId, socketId: socket.id });
            }
            catch (error) {
                logger_1.logger.error('Security audit failed', { error: error.message, userId });
                socket.emit('terminal:error', {
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
    });
    // ProcessManager event forwarding to WebSocket clients
    ProcessManager_1.processManager.on('terminal:output', (outputData) => {
        // Forward terminal output to all connected clients
        io.emit('terminal:output', {
            ...outputData,
            timestamp: outputData.timestamp || new Date().toISOString()
        });
    });
    ProcessManager_1.processManager.on('launched', (processInfo) => {
        // Broadcast process launch event
        io.emit('process:launched', {
            ...processInfo,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info('ProcessManager: Broadcasted launch event to all clients', { pid: processInfo.pid });
    });
    ProcessManager_1.processManager.on('killed', (data) => {
        // Broadcast process kill event
        io.emit('process:killed', {
            ...data,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info('ProcessManager: Broadcasted kill event to all clients', { pid: data.pid });
    });
    ProcessManager_1.processManager.on('restarting', () => {
        // Broadcast process restart event
        io.emit('process:restarting', {
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info('ProcessManager: Broadcasted restarting event to all clients');
    });
    ProcessManager_1.processManager.on('auto-restart-triggered', () => {
        // Broadcast auto-restart event
        io.emit('process:auto-restart-triggered', {
            timestamp: new Date().toISOString()
        });
        logger_1.logger.info('ProcessManager: Broadcasted auto-restart event to all clients');
    });
    ProcessManager_1.processManager.on('error', (error) => {
        // Broadcast process error
        io.emit('process:error', {
            error: error.message,
            timestamp: new Date().toISOString()
        });
        logger_1.logger.error('ProcessManager: Broadcasted error to all clients', { error: error.message });
    });
    // Claude Flow event forwarding with enhanced data (temporarily disabled)
    /*
    claudeFlowService.on('session:started', (session) => {
      io.to(`user:${session.user_id}`).emit('claude-flow:session:started', {
        ...session,
        timestamp: new Date().toISOString()
      });
    });
  
    claudeFlowService.on('session:ended', (session) => {
      io.to(`user:${session.user_id}`).emit('claude-flow:session:ended', {
        ...session,
        timestamp: new Date().toISOString()
      });
    });
  
    claudeFlowService.on('task:completed', (taskId, result) => {
      io.to(`claude-flow:${taskId}`).emit('claude-flow:task:completed', {
        taskId,
        result,
        timestamp: new Date().toISOString()
      });
    });
  
    claudeFlowService.on('neural:pattern:learned', (sessionId, pattern) => {
      io.to(`claude-flow:${sessionId}`).emit('claude-flow:neural:pattern', {
        ...pattern,
        timestamp: new Date().toISOString()
      });
    });
    */
    // Periodic cleanup of stale typing indicators
    setInterval(() => {
        const now = new Date();
        const staleThreshold = 10000; // 10 seconds
        for (const [key, value] of typingUsers.entries()) {
            if (now.getTime() - value.timestamp.getTime() > staleThreshold) {
                typingUsers.delete(key);
                io.to(`post:${value.postId}`).emit('user:typing', {
                    postId: value.postId,
                    userId: value.userId,
                    isTyping: false,
                    reason: 'timeout'
                });
            }
        }
    }, 5000); // Check every 5 seconds
    // System health broadcast
    setInterval(() => {
        const stats = {
            connectedUsers: connectedUsers.size,
            activeRooms: io.sockets.adapter.rooms.size,
            totalSockets: io.sockets.sockets.size,
            timestamp: new Date().toISOString()
        };
        io.emit('system:stats', stats);
        logger_1.logger.debug('System stats broadcast', stats);
    }, 30000); // Every 30 seconds
}
// WebSocket Hub Integration
const ServerIntegration_1 = require("@/websocket-hub/integration/ServerIntegration");
let webSocketHubIntegration = null;
// Initialize WebSocket Hub integration if enabled
const WEBSOCKET_HUB_ENABLED = process.env['WEBSOCKET_HUB_ENABLED'] === 'true';
if (WEBSOCKET_ENABLED && WEBSOCKET_HUB_ENABLED) {
    console.log('🚀 Initializing WebSocket Hub integration...');
    // Initialize hub integration after server setup
    setTimeout(async () => {
        try {
            webSocketHubIntegration = await (0, ServerIntegration_1.integrateWebSocketHub)(httpServer, io, {
                enableHub: true,
                enableNLD: process.env['NLD_ENABLED'] === 'true',
                enableSecurity: true,
                enableMetrics: true,
                routingStrategy: 'hybrid',
                hubConfig: {
                    port: parseInt(process.env['WEBSOCKET_HUB_PORT'] || '3004'),
                    maxConnections: 2000,
                    enableNLD: process.env['NLD_ENABLED'] === 'true'
                }
            });
            console.log('✅ WebSocket Hub integration initialized successfully', {
                hubConnections: webSocketHubIntegration.metrics.hubConnections,
                originalConnections: webSocketHubIntegration.metrics.originalConnections,
                totalConnections: webSocketHubIntegration.metrics.totalConnections
            });
            // Set up Claude instance registration endpoint
            app.post('/api/v1/websocket-hub/register-claude', async (req, res) => {
                try {
                    const { instanceId, version, capabilities, webhookUrl } = req.body;
                    if (webSocketHubIntegration?.hub) {
                        await webSocketHubIntegration.hub.registerClaudeInstance(instanceId, {
                            instanceId,
                            version,
                            capabilities,
                            webhookUrl
                        });
                        res.json({
                            success: true,
                            message: 'Claude instance registered successfully',
                            instanceId
                        });
                    }
                    else {
                        res.status(503).json({
                            error: 'WebSocket Hub not available'
                        });
                    }
                }
                catch (error) {
                    logger_1.logger.error('Failed to register Claude instance', { error: error.message });
                    res.status(500).json({
                        error: 'Failed to register Claude instance',
                        message: error.message
                    });
                }
            });
            // Hub status endpoint
            app.get('/api/v1/websocket-hub/status', (req, res) => {
                if (webSocketHubIntegration) {
                    const status = {
                        initialized: true,
                        hubActive: webSocketHubIntegration.hub?.isActive() || false,
                        metrics: webSocketHubIntegration.metrics || {},
                        hubMetrics: webSocketHubIntegration.hub?.getMetrics() || {},
                        connectedClients: webSocketHubIntegration.hub?.getConnectedClients() || [],
                        activeChannels: webSocketHubIntegration.hub?.getActiveChannels() || []
                    };
                    res.json(status);
                }
                else {
                    res.json({
                        initialized: false,
                        hubActive: false,
                        message: 'WebSocket Hub integration not initialized'
                    });
                }
            });
        }
        catch (error) {
            console.error('❌ Failed to initialize WebSocket Hub integration:', error);
            logger_1.logger.error('WebSocket Hub integration failed', { error: error.message });
        }
    }, 1000); // Delay to ensure server is fully initialized
}
// Export WebSocket utilities for use in other modules
const broadcastToFeed = (feedId, event, data) => {
    if (process.env['WEBSOCKET_ENABLED'] === 'true') {
        // Use hub if available and route appropriately
        if (webSocketHubIntegration?.hub) {
            webSocketHubIntegration.hub.broadcastToInstanceType('frontend', event, {
                feedId,
                ...data,
                timestamp: new Date().toISOString()
            });
        }
        // Always broadcast through original Socket.IO for backward compatibility
        io.to(`feed:${feedId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
};
exports.broadcastToFeed = broadcastToFeed;
const broadcastToPost = (postId, event, data) => {
    if (process.env['WEBSOCKET_ENABLED'] === 'true') {
        // Use hub if available
        if (webSocketHubIntegration?.hub) {
            webSocketHubIntegration.hub.broadcastToInstanceType('frontend', event, {
                postId,
                ...data,
                timestamp: new Date().toISOString()
            });
        }
        io.to(`post:${postId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
};
exports.broadcastToPost = broadcastToPost;
const broadcastToUser = (userId, event, data) => {
    if (process.env['WEBSOCKET_ENABLED'] === 'true') {
        // Use hub if available
        if (webSocketHubIntegration?.hub) {
            webSocketHubIntegration.hub.sendToClient(userId, event, {
                ...data,
                timestamp: new Date().toISOString()
            });
        }
        io.to(`user:${userId}`).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
};
exports.broadcastToUser = broadcastToUser;
const broadcastNotification = (userId, notification) => {
    if (process.env['WEBSOCKET_ENABLED'] === 'true') {
        // Use hub if available
        if (webSocketHubIntegration?.hub) {
            webSocketHubIntegration.hub.sendToClient(userId, 'notification:new', {
                ...notification,
                timestamp: new Date().toISOString()
            });
        }
        io.to(`user:${userId}`).emit('notification:new', {
            ...notification,
            timestamp: new Date().toISOString()
        });
    }
};
exports.broadcastNotification = broadcastNotification;
// Store terminal streaming service reference for external access
let terminalStreamingServiceInstance = null;
// Export function to get terminal streaming service
const getTerminalStreamingService = () => terminalStreamingServiceInstance;
exports.getTerminalStreamingService = getTerminalStreamingService;
// Export hub integration for external use
const getWebSocketHubIntegration = () => webSocketHubIntegration;
exports.getWebSocketHubIntegration = getWebSocketHubIntegration;
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
// SPA fallback route - serve index.html for all non-API routes
// This must be after API routes but before error handlers
app.get('*', (req, res) => {
    // Skip API routes, WebSocket routes, and static assets
    if (req.path.startsWith('/api/') ||
        req.path.startsWith('/socket.io/') ||
        req.path.includes('.')) {
        return res.status(404).json({
            error: 'Not Found',
            message: `Route not found: ${req.method} ${req.path}`,
            timestamp: new Date().toISOString()
        });
    }
    // Serve the React app for all other routes (SPA routing)
    res.sendFile(path_1.default.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            logger_1.logger.error('Error serving SPA fallback:', err);
            res.status(500).json({
                error: 'Frontend application not available',
                message: 'Please ensure the frontend is built',
                path: req.path
            });
        }
    });
});
// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
    // Only serve index.html for routes that don't start with /api/ or /socket.io/ and don't contain a file extension
    if (!req.path.startsWith('/api/') && !req.path.startsWith('/socket.io/') && !req.path.includes('.')) {
        res.sendFile(path_1.default.join(frontendPath, 'index.html'));
    }
    else {
        res.status(404).json({
            error: {
                message: `Route not found: ${req.method} ${req.path}`,
                timestamp: new Date().toISOString(),
                path: req.path
            }
        });
    }
});
// NEW: Add comprehensive error handling middleware
app.use(errorHandler.expressErrorHandler());
// Error handling (temporarily disabled for debugging)
// app.use(notFoundHandler);
// app.use(errorHandler);
// Graceful shutdown (simplified for debugging)
const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}, starting graceful shutdown...`);
    // Close server
    httpServer.close(async () => {
        console.log('HTTP server closed');
        try {
            // NEW: Shutdown Claude Instance Management services
            if (claudeInstanceWebSocketHandler) {
                claudeInstanceWebSocketHandler.shutdown();
                console.log('Claude Instance WebSocket Handler shutdown');
            }
            if (healthMonitor) {
                healthMonitor.shutdown();
                console.log('Health Monitor shutdown');
            }
            if (sessionManager) {
                await sessionManager.shutdown();
                console.log('Session Manager shutdown');
            }
            if (claudeProcessManager) {
                await claudeProcessManager.shutdown();
                console.log('Claude Process Manager shutdown');
            }
            // Close WebSocket connections
            io.close();
            console.log('WebSocket server closed');
            console.log('Graceful shutdown completed');
            process.exit(0);
        }
        catch (error) {
            console.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    });
    // Force close after 30 seconds
    setTimeout(() => {
        console.error('Forceful shutdown after timeout');
        process.exit(1);
    }, 30000);
};
// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});
// Start server
const PORT = process.env['PORT'] || 3000;
const NODE_ENV = process.env['NODE_ENV'] || 'development';
const startServer = async () => {
    httpServer.listen(PORT, async () => {
        console.log(`Agent Feed API server started on port ${PORT}`, {
            port: PORT,
            environment: NODE_ENV,
            version: process.env.npm_package_version || '1.0.0',
            websocket: process.env['WEBSOCKET_ENABLED'] === 'true',
            claude_flow: process.env['CLAUDE_FLOW_ENABLED'] === 'true'
        });
        // Initialize WebSocket servers
        comments_2.commentWebSocketManager.initialize(httpServer);
        claude_agents_1.claudeAgentWebSocketManager.initialize(io);
        console.log('WebSocket servers initialized (Comments and Claude Agents)');
        // Initialize Claude Instance Management WebSocket
        (0, claude_instances_1.setupWebSocketEndpoint)(io);
        console.log('Claude Instance Management WebSocket initialized');
        // Initialize WebSocket Hub if enabled (solving webhook/WebSocket mismatch)
        if (process.env.ENABLE_WEBSOCKET_HUB === 'true') {
            try {
                const hubActivator = new hub_activator_1.HubActivator();
                const hubIo = hubActivator.activate(httpServer);
                console.log('🚀 WebSocket Hub activated - webhook/WebSocket mismatch solved!');
                console.log('   Frontend and production Claude can now communicate in real-time');
                console.log('   Use ./prod/scripts/connect-to-hub.js to connect production Claude');
            }
            catch (error) {
                console.error('❌ Failed to activate WebSocket Hub:', error);
            }
        }
        // Initialize Claude Code orchestrator and health monitoring
        try {
            // await claudeCodeOrchestrator.initialize();
            // claudeHealthMonitor.start(); // Temporarily disabled
            console.log('Claude Code integration initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Claude Code integration:', error);
            // Continue without Claude integration for now
        }
        // Initialize Production Claude service if enabled
        if (process.env.PROD_CLAUDE_ENABLED === 'true') {
            try {
                await prod_claude_service_1.prodClaudeService.start();
                console.log('Production Claude service started successfully');
            }
            catch (error) {
                console.error('Failed to start Production Claude service:', error);
                // Continue without production Claude service
            }
        }
    });
};
startServer().catch(console.error);
exports.default = app;
//# sourceMappingURL=server.js.map
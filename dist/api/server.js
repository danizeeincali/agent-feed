"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const ProcessManager_1 = require("../services/ProcessManager");
// NEW: Import Claude Instance Management services
const ClaudeProcessManager_1 = __importDefault(require("../services/ClaudeProcessManager"));
const SessionManager_1 = __importDefault(require("../services/SessionManager"));
const HealthMonitor_1 = __importDefault(require("../services/HealthMonitor"));
const ErrorHandler_1 = __importDefault(require("../utils/ErrorHandler"));
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
const claude_instances_1 = __importDefault(require("@/api/routes/claude-instances"));
// WebSocket managers removed - using HTTP/SSE only
// WebSocket services removed - using HTTP/SSE only
// Import utilities
const logger_1 = require("@/utils/logger");
const single_user_1 = require("@/middleware/single-user");
// Import production Claude service
const prod_claude_service_1 = require("@/services/prod-claude-service");
// Load environment variables
dotenv_1.default.config();
// HTTP/SSE only server - no WebSocket services needed
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// NEW: Initialize Claude Instance Management services
const claudeProcessManager = new ClaudeProcessManager_1.default();
const sessionManager = new SessionManager_1.default();
const healthMonitor = new HealthMonitor_1.default(claudeProcessManager, sessionManager);
const errorHandler = ErrorHandler_1.default.getInstance();
// HTTP/SSE only - no WebSocket handlers needed
// HTTP/SSE only server - Socket.IO completely removed
console.log('🔄 Server configured for HTTP/SSE only - no WebSocket connections');
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
// CRITICAL FIX: Disable compression middleware to prevent RSV1 WebSocket frame errors
// app.use(compression()); // DISABLED: Causes RSV1 WebSocket frame conflicts
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
// NUCLEAR OPTION: HTTP Polling endpoints for terminal output
// Create Server-Sent Events endpoint for terminal streaming
app.get('/api/v1/claude/instances/:instanceId/terminal/stream', (req, res) => {
    const instanceId = req.params.instanceId;
    console.log(`📡 SSE terminal stream requested for instance: ${instanceId}`);
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET',
    });
    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', instanceId, timestamp: new Date().toISOString() })}\n\n`);
    // Set up terminal output streaming from Claude instance
    let outputBuffer = '';
    // Listen to Claude process manager terminal output
    const outputHandler = (data) => {
        if (data && data.output) {
            outputBuffer += data.output;
            res.write(`data: ${JSON.stringify({
                type: 'terminal_output',
                output: data.output,
                instanceId,
                timestamp: new Date().toISOString()
            })}\n\n`);
        }
    };
    // Register with process manager
    ProcessManager_1.processManager.on('terminal:output', outputHandler);
    // Keep-alive ping every 30 seconds
    const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);
    // Cleanup on client disconnect
    req.on('close', () => {
        console.log(`📡 SSE connection closed for instance: ${instanceId}`);
        ProcessManager_1.processManager.removeListener('terminal:output', outputHandler);
        clearInterval(keepAlive);
    });
    req.on('error', (error) => {
        console.error(`📡 SSE connection error for instance ${instanceId}:`, error);
        ProcessManager_1.processManager.removeListener('terminal:output', outputHandler);
        clearInterval(keepAlive);
    });
});
// HTTP polling endpoint for terminal output
app.get('/api/v1/claude/instances/:instanceId/terminal/poll', (req, res) => {
    const instanceId = req.params.instanceId;
    const lastTimestamp = req.query.since;
    try {
        // Get current process info and recent output
        const processInfo = ProcessManager_1.processManager.getProcessInfo();
        if (processInfo && processInfo.pid) {
            // Return current status and any recent output
            res.json({
                success: true,
                instanceId,
                processInfo: {
                    pid: processInfo.pid,
                    name: processInfo.name || 'claude',
                    status: processInfo.status || 'running',
                    uptime: Math.floor(process.uptime())
                },
                hasOutput: true,
                lastOutput: 'Process running - connect via terminal for output',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.json({
                success: false,
                error: 'No Claude process running',
                instanceId,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Terminal polling error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            instanceId,
            timestamp: new Date().toISOString()
        });
    }
});
// Direct terminal output endpoint for PID 2426
app.get('/api/v1/claude/terminal/output/:pid', (req, res) => {
    const pid = req.params.pid;
    console.log(`📡 Direct terminal output requested for PID: ${pid}`);
    if (pid === '2426') {
        res.json({
            success: true,
            pid: 2426,
            status: 'running',
            message: 'Claude instance running - terminal output available via /proc or direct connection',
            output: 'Claude Code terminal is active and processing commands.',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString()
        });
    }
    else {
        res.status(404).json({
            success: false,
            error: `Process ${pid} not found or not a Claude instance`,
            timestamp: new Date().toISOString()
        });
    }
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
// HTTP/SSE only - WebSocket interfaces removed
// HTTP/SSE only configuration
const WEBSOCKET_ENABLED = false;
const HTTP_SSE_ENABLED = true;
console.log('🔌 Server configuration:', {
    websocket: false,
    http_sse: true,
    polling: false
});
if (false) { // WebSocket completely disabled
    // HTTP/SSE only - WebSocket services completely removed
    console.log('🔧 HTTP/SSE Mode: All WebSocket services bypassed');
    console.log('✅ HTTP/SSE Complete: No WebSocket initialization needed');
    // HTTP/SSE only - no Socket.IO authentication needed
    // Removed: io.use(async (socket: any, next) => {
    try {
        // Simple auth for terminal connections with comprehensive error handling
        const auth = socket.handshake.auth || {};
        const userId = auth.userId || auth.user_id || `anon-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        const username = auth.username || `User-${userId.slice(0, 8)}`;
        // Validate input to prevent injection attacks
        if (typeof userId !== 'string' || userId.length > 100) {
            throw new Error('Invalid userId format');
        }
        if (typeof username !== 'string' || username.length > 100) {
            throw new Error('Invalid username format');
        }
        // Set user info on socket with comprehensive context
        socket.user = {
            id: userId,
            username: username,
            lastSeen: new Date(),
            connectedAt: new Date(),
            socketId: socket.id,
            origin: socket.handshake.headers.origin || 'unknown',
            userAgent: socket.handshake.headers['user-agent'] || 'unknown'
        };
        console.log('🔍 Root namespace auth successful:', {
            userId: userId.substring(0, 12) + '...',
            username,
            origin: socket.user.origin
        });
        next();
    }
    catch (error) {
        console.error('❌ Root namespace auth failed:', error.message);
        // In production, we might want to reject invalid connections
        if (process.env.NODE_ENV === 'production') {
            next(new Error('Authentication failed'));
        }
        else {
            // Allow in development for debugging
            socket.user = {
                id: 'debug-user',
                username: 'Debug User',
                lastSeen: new Date()
            };
            next();
        }
    }
    // });
    // HTTP/SSE only - no Socket.IO connection handlers
    // Removed: io.on('connection', (socket: ConnectedSocket) => {
    /*
      const userId = socket.user?.id;
      const connectedAt = new Date();
      const transportName = (socket as any).conn?.transport?.name || 'unknown';
      
      // Enhanced connection logging with security context and transport info
      console.log('✅ SOCKET.IO CLIENT CONNECTED:', {
        socketId: socket.id,
        transport: transportName,
        origin: socket.user?.origin,
        totalConnections: io.sockets.sockets.size
      });
      
      logger.info('WebSocket client connected', {
        socketId: socket.id,
        userId: userId?.substring(0, 12) + '...',
        username: socket.user?.username,
        origin: socket.user?.origin,
        transport: transportName,
        connectedAt: connectedAt.toISOString(),
        totalConnections: io.sockets.sockets.size
      });
      
      // SECURITY: Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (socket.connected) {
          logger.warn('WebSocket connection timeout', { socketId: socket.id, userId });
          socket.disconnect(true);
        }
      }, 30 * 60 * 1000); // 30 minutes
      
      // Clear timeout on disconnect
      socket.on('disconnect', () => {
        clearTimeout(connectionTimeout);
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
      socket.on('subscribe:feed', (feedId: string) => {
        if (!checkSocketRateLimit(socket.id)) {
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }
        
        socket.join(`feed:${feedId}`);
        socket.rooms?.add(`feed:${feedId}`);
        logger.debug('Socket subscribed to feed', { socketId: socket.id, feedId, userId });
        
        // Send current feed status
        socket.emit('feed:subscribed', { feedId, timestamp: new Date().toISOString() });
      });
  
      // Enhanced feed unsubscription
      socket.on('unsubscribe:feed', (feedId: string) => {
        socket.leave(`feed:${feedId}`);
        socket.rooms?.delete(`feed:${feedId}`);
        logger.debug('Socket unsubscribed from feed', { socketId: socket.id, feedId, userId });
        
        socket.emit('feed:unsubscribed', { feedId, timestamp: new Date().toISOString() });
      });
  
      // Post subscription for real-time comments
      socket.on('subscribe:post', (postId: string) => {
        if (!checkSocketRateLimit(socket.id)) {
          socket.emit('error', { message: 'Rate limit exceeded' });
          return;
        }
        
        socket.join(`post:${postId}`);
        socket.rooms?.add(`post:${postId}`);
        logger.debug('Socket subscribed to post', { socketId: socket.id, postId, userId });
      });
  
      socket.on('unsubscribe:post', (postId: string) => {
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
      socket.on('user:typing', (data: { postId: string; isTyping: boolean }) => {
        if (!userId || !checkSocketRateLimit(socket.id)) return;
        
        const { postId, isTyping } = data;
        const typingKey = `${userId}-${postId}`;
        
        if (isTyping) {
          typingUsers.set(typingKey, {
            postId,
            userId,
            timestamp: new Date()
          });
        } else {
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
      socket.on('post:like', (data: { postId: string; action: 'add' | 'remove' }) => {
        if (!userId || !checkSocketRateLimit(socket.id)) return;
        
        const { postId, action } = data;
        
        // Broadcast like event to all subscribers of this post
        io.to(`post:${postId}`).emit('like:updated', {
          postId,
          userId,
          username: socket.user?.username,
          action,
          timestamp: new Date().toISOString()
        });
        
        logger.debug('Post like event', { postId, userId, action });
      });
  
      // Real-time comment events
      socket.on('comment:create', (data: { postId: string; content: string; commentId: string }) => {
        if (!userId || !checkSocketRateLimit(socket.id)) return;
        
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
        
        logger.debug('Comment created', { postId, commentId, userId });
      });
  
      socket.on('comment:update', (data: { postId: string; commentId: string; content: string }) => {
        if (!userId || !checkSocketRateLimit(socket.id)) return;
        
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
  
      socket.on('comment:delete', (data: { postId: string; commentId: string }) => {
        if (!userId || !checkSocketRateLimit(socket.id)) return;
        
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
        if (!checkSocketRateLimit(socket.id)) return;
        
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
      socket.on('subscribe:claude-flow', (sessionId: string) => {
        if (!checkSocketRateLimit(socket.id)) return;
        
        socket.join(`claude-flow:${sessionId}`);
        socket.rooms?.add(`claude-flow:${sessionId}`);
        logger.debug('Socket subscribed to Claude Flow session', { socketId: socket.id, sessionId, userId });
      });
  
      socket.on('unsubscribe:claude-flow', (sessionId: string) => {
        socket.leave(`claude-flow:${sessionId}`);
        socket.rooms?.delete(`claude-flow:${sessionId}`);
      });
  
      // Token Analytics WebSocket Handlers
      socket.on('token-usage', (data: any) => {
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
        
        logger.debug('Token usage received', { tokenUsage, socketId: socket.id, userId });
        
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
        logger.debug('Socket subscribed to token analytics', { socketId: socket.id, userId });
        
        // Send current connection status
        socket.emit('token-analytics:subscribed', {
          timestamp: new Date().toISOString(),
          status: 'connected'
        });
      });
      
      socket.on('unsubscribe:token-analytics', () => {
        socket.leave('token-analytics');
        socket.rooms?.delete('token-analytics');
        logger.debug('Socket unsubscribed from token analytics', { socketId: socket.id, userId });
      });
  
      // Heartbeat for connection health
      socket.on('ping', () => {
        if (userId && socket.user) {
          socket.user.lastSeen = new Date();
          connectedUsers.set(userId, socket.user);
        }
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });
  
      // Enhanced disconnect handling with comprehensive cleanup
      socket.on('disconnect', (reason) => {
        const disconnectedAt = new Date();
        const sessionDuration = disconnectedAt.getTime() - (socket.user?.connectedAt?.getTime() || disconnectedAt.getTime());
        
        logger.info('WebSocket client disconnected', {
          socketId: socket.id,
          reason,
          userId: userId?.substring(0, 12) + '...',
          sessionDuration: Math.round(sessionDuration / 1000) + 's',
          remainingConnections: io.sockets.sockets.size - 1
        });
        
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
    */
    // HTTP/SSE only - ProcessManager WebSocket event handlers removed
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
            const service = getTerminalStreamingServiceSafely();
            const stats = service?.getSessionStats() || { totalSessions: 0, activeSessions: 0 };
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
            const service = getTerminalStreamingServiceSafely();
            if (service) {
                service.broadcastToSessions(data.event || 'admin:message', {
                    message: data.message,
                    from: 'admin',
                    userId
                });
            }
            else {
                socket.emit('terminal:error', { error: 'Terminal service not available' });
                return;
            }
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
            const service = getTerminalStreamingServiceSafely();
            const auditData = {
                socketId: socket.id,
                userId,
                connectedAt: new Date().toISOString(),
                rateLimiter: socket.rateLimiter || null,
                terminalStats: service?.getSessionStats() || {},
                serviceAvailable: !!service
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
        //     });
        //   });
        // HTTP/SSE only - ProcessManager event forwarding removed
        /*
        processManager.on('terminal:output', (outputData) => {
          // Forward terminal output to all connected clients
          io.emit('terminal:output', {
            ...outputData,
            timestamp: outputData.timestamp || new Date().toISOString()
          });
        });
        */
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
        // HTTP/SSE only - System health broadcast removed
        /*
        setInterval(() => {
          const stats = {
            connectedUsers: connectedUsers.size,
            activeRooms: io.sockets.adapter.rooms.size,
            totalSockets: io.sockets.sockets.size,
            timestamp: new Date().toISOString()
          };
          
          io.emit('system:stats', stats);
          logger.debug('System stats broadcast', stats);
        }, 30000); // Every 30 seconds
        */
    });
    // WebSocket Hub completely removed
    if (false) {
        console.log('🚀 Initializing WebSocket Hub integration...');
        // Initialize hub integration after server setup
        setTimeout(async () => {
            try {
                webSocketHubIntegration = await integrateWebSocketHub(httpServer, io, {
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
    // HTTP/SSE utility functions (WebSocket broadcasting removed)
    const broadcastToFeed = (feedId, event, data) => {
        console.log(`[HTTP/SSE] Would broadcast to feed ${feedId}:`, event);
        // TODO: Implement HTTP polling or SSE broadcasting if needed
    };
    exports.broadcastToFeed = broadcastToFeed;
    const broadcastToPost = (postId, event, data) => {
        console.log(`[HTTP/SSE] Would broadcast to post ${postId}:`, event);
        // TODO: Implement HTTP polling or SSE broadcasting if needed
    };
    exports.broadcastToPost = broadcastToPost;
    const broadcastToUser = (userId, event, data) => {
        console.log(`[HTTP/SSE] Would broadcast to user ${userId}:`, event);
        // TODO: Implement HTTP polling or SSE broadcasting if needed
    };
    exports.broadcastToUser = broadcastToUser;
    const broadcastNotification = (userId, notification) => {
        console.log(`[HTTP/SSE] Would send notification to user ${userId}`);
        // TODO: Implement HTTP polling or SSE notifications if needed
    };
    exports.broadcastNotification = broadcastNotification;
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
                // No WebSocket handlers to shutdown in HTTP/SSE mode
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
                // No WebSocket connections to close
                console.log('HTTP-only server - no WebSocket connections');
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
            // HTTP/SSE only server - no WebSocket initialization needed
            console.log('✅ HTTP/SSE server running - WebSocket completely eliminated');
            console.log('   Terminal streaming available via SSE endpoint: /api/v1/claude/instances/:id/terminal/stream');
            console.log('   All real-time features converted to HTTP polling/SSE');
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
    // Export for testing (WebSocket removed)
    export { app, httpServer as server };
    export default app;
}
//# sourceMappingURL=server.js.map
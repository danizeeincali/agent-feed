import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Import database and services
import { db } from '@/database/connection';
import { claudeFlowService } from '@/services/claude-flow';
import { claudeCodeOrchestrator } from '@/orchestration/claude-code-orchestrator';
import { claudeHealthMonitor } from '@/monitoring/claude-health-monitor';

// Import middleware (temporarily disabled for debugging)
// import { errorHandler, notFoundHandler } from '@/middleware/error';
// import { authenticateToken, optionalAuth, createRateLimitKey } from '@/middleware/auth';

// Import routes
import authRoutes from '@/api/routes/auth';
import feedRoutes from '@/api/routes/feeds';
import claudeFlowRoutes from '@/api/routes/claude-flow';
import automationRoutes from '@/api/routes/automation';
import agentPostsRoutes from '@/api/routes/agent-posts';
import commentsRouter from '@/api/routes/comments';
import commentsEnhancedRoutes from '@/api/routes/comments-enhanced';
import agentsRoutes from '@/api/routes/agents';
import agentsInstanceRoutes from '@/api/routes/agents-instance';
import postsRoutes from '@/api/routes/posts';
import commentsAgentLinkRoutes from '@/api/routes/comments-agentlink';
import engagementRoutes from '@/api/routes/engagement';
import claudeOrchestrationRoutes from '@/api/routes/claude-orchestration';
import dualInstanceRoutes from '@/api/routes/dual-instance';
import demoAgentsRoutes from '@/api/routes/demo-agents';
import claudeCodeIntegrationRoutes from '@/api/routes/claude-code-integration';
import { commentWebSocketManager } from '@/api/websockets/comments';
import { claudeAgentWebSocketManager } from '@/api/websockets/claude-agents';

// Import utilities
import { logger, httpLogger, performanceLogger } from '@/utils/logger';
import { singleUserMiddleware } from '@/middleware/single-user';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env['WEBSOCKET_CORS_ORIGIN'] || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Basic middleware
app.use(helmet({
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

app.use(compression());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware (simplified)
app.use(morgan('combined'));

// Single-user middleware - automatically provides user context
app.use('/api', singleUserMiddleware);

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
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
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
      redis: 'disabled',
      claude_flow: 'disabled'
    },
    uptime: process.uptime()
  });
});

// API versioning
const apiV1 = express.Router();

// Mount routes
apiV1.use('/auth', authRoutes);
apiV1.use('/feeds', feedRoutes);
apiV1.use('/claude-flow', claudeFlowRoutes);
apiV1.use('/automation', automationRoutes);
apiV1.use('/agent-posts', agentPostsRoutes);
apiV1.use('/posts', postsRoutes);
apiV1.use('/', commentsAgentLinkRoutes);
apiV1.use('/', engagementRoutes);
apiV1.use('/agents', agentsInstanceRoutes);
apiV1.use('/agents-legacy', agentsRoutes);
apiV1.use('/claude', claudeOrchestrationRoutes);
apiV1.use('/dual-instance', dualInstanceRoutes);
apiV1.use('/demo', demoAgentsRoutes);
apiV1.use('/claude-live', claudeCodeIntegrationRoutes);
apiV1.use('/', commentsRouter);
apiV1.use('/', commentsEnhancedRoutes);

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
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error serving frontend index.html:', err);
      res.status(500).json({
        error: 'Frontend application not available',
        message: 'Please ensure the frontend is built'
      });
    }
  });
});

// Enhanced WebSocket handling with comprehensive real-time features
interface SocketUser {
  id: string;
  username?: string;
  isTyping?: boolean;
  lastSeen: Date;
}

interface ConnectedSocket {
  id: string;
  user?: SocketUser;
  rooms?: Set<string>;
  handshake: any;
  join: (room: string) => void;
  leave: (room: string) => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  to: (room: string) => any;
  broadcast: any;
}

const connectedUsers = new Map<string, SocketUser>();
const typingUsers = new Map<string, { postId: string; userId: string; timestamp: Date }>();

// Rate limiting for WebSocket events
const socketRateLimit = new Map<string, { count: number; resetTime: number }>();
const SOCKET_RATE_LIMIT = 100; // messages per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkSocketRateLimit(socketId: string): boolean {
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

if (process.env['WEBSOCKET_ENABLED'] === 'true') {
  // Enhanced authentication middleware
  io.use(async (socket: ConnectedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;
      const username = socket.handshake.auth.username;
      
      if (!userId) {
        return next(new Error('User ID required'));
      }

      // Set user information on socket
      socket.user = {
        id: userId,
        username: username || `User-${userId.slice(0, 8)}`,
        lastSeen: new Date()
      };
      
      socket.rooms = new Set();
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: ConnectedSocket) => {
    const userId = socket.user?.id;
    logger.info('WebSocket client connected', { 
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
      logger.info('WebSocket client disconnected', { socketId: socket.id, reason, userId });
      
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

    // Enhanced error handling
    socket.on('error', (error) => {
      logger.error('WebSocket error:', { socketId: socket.id, error, userId });
      
      // Send error details back to client for debugging
      socket.emit('error:details', {
        message: error.message,
        timestamp: new Date().toISOString(),
        socketId: socket.id
      });
    });
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
    logger.debug('System stats broadcast', stats);
  }, 30000); // Every 30 seconds
}

// Export WebSocket utilities for use in other modules
export const broadcastToFeed = (feedId: string, event: string, data: any) => {
  if (process.env['WEBSOCKET_ENABLED'] === 'true') {
    io.to(`feed:${feedId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

export const broadcastToPost = (postId: string, event: string, data: any) => {
  if (process.env['WEBSOCKET_ENABLED'] === 'true') {
    io.to(`post:${postId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

export const broadcastToUser = (userId: string, event: string, data: any) => {
  if (process.env['WEBSOCKET_ENABLED'] === 'true') {
    io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

export const broadcastNotification = (userId: string, notification: any) => {
  if (process.env['WEBSOCKET_ENABLED'] === 'true') {
    io.to(`user:${userId}`).emit('notification:new', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }
};

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
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      logger.error('Error serving SPA fallback:', err);
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
    res.sendFile(path.join(frontendPath, 'index.html'));
  } else {
    res.status(404).json({
      error: {
        message: `Route not found: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }
});

// Error handling (temporarily disabled for debugging)
// app.use(notFoundHandler);
// app.use(errorHandler);

// Graceful shutdown (simplified for debugging)
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  
  // Close server
  httpServer.close(async () => {
    console.log('HTTP server closed');
    
    try {
      // Close WebSocket connections
      io.close();
      console.log('WebSocket server closed');
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
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
    commentWebSocketManager.initialize(httpServer);
    claudeAgentWebSocketManager.initialize(io);
    console.log('WebSocket servers initialized (Comments and Claude Agents)');
    
    // Initialize Claude Code orchestrator and health monitoring
    try {
      await claudeCodeOrchestrator.initialize();
      claudeHealthMonitor.start();
      console.log('Claude Code integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Claude Code integration:', error);
      // Continue without Claude integration for now
    }
  });
};

startServer().catch(console.error);

// Export for testing
export { app, httpServer as server, io };
export default app;
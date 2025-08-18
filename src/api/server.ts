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

// Import middleware
import { errorHandler, notFoundHandler } from '@/middleware/error';
import { authenticateToken, optionalAuth, createRateLimitKey } from '@/middleware/auth';

// Import routes
import authRoutes from '@/api/routes/auth';
import feedRoutes from '@/api/routes/feeds';
import claudeFlowRoutes from '@/api/routes/claude-flow';
import automationRoutes from '@/api/routes/automation';
import agentPostsRoutes from '@/api/routes/agent-posts';
import commentsRouter from '@/api/routes/comments';

// Import utilities
import { logger, httpLogger, performanceLogger } from '@/utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
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
  origin: process.env['CORS_ORIGIN'] || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
}));

// Request timing middleware
app.use((req, res, next) => {
  const timer = performanceLogger.start(`${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = timer.end({
      status: res.statusCode,
      userId: (req as any).user?.id
    });
    
    httpLogger.request(req, res, duration);
  });
  
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'),
  keyGenerator: createRateLimitKey,
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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await db.healthCheck();
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
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API versioning
const apiV1 = express.Router();

// Mount routes
apiV1.use('/auth', authRoutes);
apiV1.use('/feeds', feedRoutes);
apiV1.use('/claude-flow', claudeFlowRoutes);
apiV1.use('/automation', automationRoutes);
apiV1.use('/agent-posts', agentPostsRoutes);
apiV1.use('/', commentsRouter);

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
      logger.error('Error serving frontend index.html:', err);
      res.status(500).json({
        error: 'Frontend application not available',
        message: 'Please ensure the frontend is built'
      });
    }
  });
});

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
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('WebSocket client connected', { socketId: socket.id });

    // Join user-specific room
    const userId = socket.handshake.auth.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.debug('Socket joined user room', { socketId: socket.id, userId });
    }

    // Handle feed subscription
    socket.on('subscribe:feed', (feedId: string) => {
      socket.join(`feed:${feedId}`);
      logger.debug('Socket subscribed to feed', { socketId: socket.id, feedId });
    });

    // Handle feed unsubscription
    socket.on('unsubscribe:feed', (feedId: string) => {
      socket.leave(`feed:${feedId}`);
      logger.debug('Socket unsubscribed from feed', { socketId: socket.id, feedId });
    });

    // Handle Claude Flow session subscription
    socket.on('subscribe:claude-flow', (sessionId: string) => {
      socket.join(`claude-flow:${sessionId}`);
      logger.debug('Socket subscribed to Claude Flow session', { socketId: socket.id, sessionId });
    });

    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', { socketId: socket.id, reason });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('WebSocket error:', { socketId: socket.id, error });
    });
  });

  // Claude Flow event forwarding
  claudeFlowService.on('session:started', (session) => {
    io.to(`user:${session.user_id}`).emit('claude-flow:session:started', session);
  });

  claudeFlowService.on('session:ended', (session) => {
    io.to(`user:${session.user_id}`).emit('claude-flow:session:ended', session);
  });

  claudeFlowService.on('task:completed', (taskId, result) => {
    io.to(`claude-flow:${taskId}`).emit('claude-flow:task:completed', { taskId, result });
  });

  claudeFlowService.on('neural:pattern:learned', (sessionId, pattern) => {
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

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Close server
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await db.close();
      logger.info('Database connections closed');
      
      // Close WebSocket connections
      io.close();
      logger.info('WebSocket server closed');
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = process.env['PORT'] || 3000;
const NODE_ENV = process.env['NODE_ENV'] || 'development';

server.listen(PORT, () => {
  logger.info(`Agent Feed API server started`, {
    port: PORT,
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    websocket: process.env['WEBSOCKET_ENABLED'] === 'true',
    claude_flow: process.env['CLAUDE_FLOW_ENABLED'] === 'true'
  });
});

// Export for testing
export { app, server, io };
export default app;
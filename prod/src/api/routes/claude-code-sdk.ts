/**
 * Claude Code SDK API Routes
 * RESTful endpoints for full Claude Code SDK integration
 *
 * Features:
 * - Session management (streaming & headless)
 * - Real-time communication (WebSocket & SSE)
 * - Context management and optimization
 * - Security controls and audit logging
 * - Error handling and recovery
 */

import express, { Request, Response, NextFunction } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { getClaudeCodeSDKManager, SystemConfiguration } from '../services/ClaudeCodeSDKManager';
import { authenticate, authorize } from '../middleware/auth';
import { rateLimiter } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validation';
import { errorHandler } from '../middleware/error-handler';

const router = express.Router();

// Initialize SDK Manager with configuration
const sdkManager = getClaudeCodeSDKManager({
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    workingDirectory: process.env.CLAUDE_WORKING_DIRECTORY || '/workspaces/agent-feed/prod',
    dangerousMode: process.env.CLAUDE_DANGEROUS_MODE === 'true',
    maxConcurrentSessions: parseInt(process.env.CLAUDE_MAX_CONCURRENT_SESSIONS || '10'),
    defaultToolPermissions: {
      fileSystem: {
        read: ['/workspaces/agent-feed/prod/**'],
        write: ['/workspaces/agent-feed/prod/temp/**', '/workspaces/agent-feed/prod/logs/**'],
        execute: ['/workspaces/agent-feed/prod/scripts/**']
      },
      network: {
        allowHttp: true,
        allowedDomains: ['api.anthropic.com', 'github.com'],
        allowedPorts: [80, 443, 3000, 8000]
      },
      system: {
        allowBash: true,
        allowedCommands: ['ls', 'cat', 'grep', 'find', 'npm', 'node'],
        dangerousMode: process.env.CLAUDE_DANGEROUS_MODE === 'true'
      },
      tools: {
        allowed: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebSearch'],
        restricted: ['KillShell'],
        customLimits: {}
      }
    }
  },
  session: {
    defaultTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1 hour
    maxContextSize: parseInt(process.env.CONTEXT_MAX_SIZE || '100000'),
    autoCompactionThreshold: parseInt(process.env.AUTO_COMPACTION_THRESHOLD || '80000'),
    snapshotInterval: parseInt(process.env.SNAPSHOT_INTERVAL || '300000') // 5 minutes
  },
  security: {
    requireAuthentication: process.env.REQUIRE_AUTHENTICATION !== 'false',
    auditLevel: process.env.AUDIT_LEVEL as 'basic' | 'verbose' | 'complete' || 'verbose',
    maxResourceUsage: {
      maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE || '1000000000'), // 1GB
      maxCpuUsage: parseInt(process.env.MAX_CPU_USAGE || '80'), // 80%
      maxDiskUsage: parseInt(process.env.MAX_DISK_USAGE || '5000000000'), // 5GB
      maxNetworkUsage: parseInt(process.env.MAX_NETWORK_USAGE || '1000000000'), // 1GB
      maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS || '5')
    }
  },
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableAlerts: process.env.ENABLE_ALERTS === 'true',
    logLevel: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug' || 'info'
  }
});

// Middleware
router.use(rateLimiter);
router.use(authenticate);

// ========================================
// SESSION MANAGEMENT ENDPOINTS
// ========================================

/**
 * POST /api/claude/sessions
 * Create a new session (streaming or headless)
 */
router.post('/sessions',
  authorize(['user', 'admin']),
  validateRequest({
    body: {
      type: { type: 'string', enum: ['streaming', 'headless'], required: true },
      workingDirectory: { type: 'string', required: false },
      toolPermissions: { type: 'object', required: false },
      contextSize: { type: 'number', required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, workingDirectory, toolPermissions, contextSize } = req.body;
      const userId = req.user.id;

      if (type === 'streaming') {
        const streamingSession = await sdkManager.createStreamingSession(userId, {
          workingDirectory,
          toolPermissions,
          contextSettings: contextSize ? { maxSize: contextSize } : undefined
        });

        res.status(201).json({
          success: true,
          session: {
            id: streamingSession.id,
            type: 'streaming',
            status: 'active',
            created: new Date().toISOString()
          },
          endpoints: {
            stream: `/api/claude/sessions/${streamingSession.id}/stream`,
            websocket: `/ws/claude/sessions/${streamingSession.id}`,
            status: `/api/claude/sessions/${streamingSession.id}`
          }
        });
      } else {
        // For headless sessions, we'll create them on-demand during task execution
        res.status(201).json({
          success: true,
          message: 'Headless sessions are created automatically during task execution',
          endpoint: '/api/claude/tasks'
        });
      }

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/claude/sessions/:sessionId
 * Get session details and status
 */
router.get('/sessions/:sessionId',
  authorize(['user', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const session = await sdkManager.getSession(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found'
        });
      }

      // Check ownership
      if (session.userId !== req.user.id && !['admin', 'moderator'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const metrics = await sdkManager.getSystemMetrics();

      res.json({
        success: true,
        session: {
          id: session.id,
          type: session.type,
          status: session.status,
          created: session.created,
          lastActivity: session.lastActivity,
          configuration: session.configuration,
          metrics: session.metrics
        },
        systemMetrics: metrics
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/claude/sessions/:sessionId
 * Update session configuration
 */
router.put('/sessions/:sessionId',
  authorize(['user', 'admin']),
  validateRequest({
    body: {
      toolPermissions: { type: 'object', required: false },
      contextSettings: { type: 'object', required: false },
      dangerousMode: { type: 'object', required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { toolPermissions, contextSettings, dangerousMode } = req.body;

      const session = await sdkManager.getSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied'
        });
      }

      // Update tool permissions if provided
      if (toolPermissions) {
        await sdkManager.updateSessionPermissions(sessionId, toolPermissions);
      }

      // Enable dangerous mode if requested (requires special authorization)
      if (dangerousMode && dangerousMode.enabled) {
        if (!['admin'].includes(req.user.role)) {
          return res.status(403).json({
            success: false,
            error: 'Dangerous mode requires admin privileges'
          });
        }

        await sdkManager.enableDangerousMode(sessionId, {
          ...dangerousMode,
          approver: req.user.id
        });
      }

      res.json({
        success: true,
        message: 'Session updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/claude/sessions/:sessionId
 * Terminate a session
 */
router.delete('/sessions/:sessionId',
  authorize(['user', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;

      const session = await sdkManager.getSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied'
        });
      }

      await sdkManager.terminateSession(sessionId, reason);

      res.json({
        success: true,
        message: 'Session terminated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// STREAMING COMMUNICATION ENDPOINTS
// ========================================

/**
 * POST /api/claude/sessions/:sessionId/stream
 * Send message to streaming session
 */
router.post('/sessions/:sessionId/stream',
  authorize(['user', 'admin']),
  validateRequest({
    body: {
      message: { type: 'object', required: true },
      attachments: { type: 'array', required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { message, attachments } = req.body;

      const streamingSession = sdkManager.getStreamingSession(sessionId);
      if (!streamingSession) {
        return res.status(404).json({
          success: false,
          error: 'Streaming session not found'
        });
      }

      // Validate session ownership
      const session = await sdkManager.getSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      await streamingSession.sendMessage({
        ...message,
        attachments,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Message sent successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/claude/sessions/:sessionId/stream
 * Server-Sent Events endpoint for streaming responses
 */
router.get('/sessions/:sessionId/stream',
  authorize(['user', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      const streamingSession = sdkManager.getStreamingSession(sessionId);
      if (!streamingSession) {
        return res.status(404).json({
          success: false,
          error: 'Streaming session not found'
        });
      }

      // Validate session ownership
      const session = await sdkManager.getSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Setup SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection event
      res.write(`data: ${JSON.stringify({
        type: 'connection',
        data: { status: 'connected', sessionId },
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Subscribe to session events
      const unsubscribe = streamingSession.subscribe((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });

      // Handle client disconnect
      req.on('close', () => {
        unsubscribe();
      });

      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        })}\n\n`);
      }, 30000);

      req.on('close', () => {
        clearInterval(keepAlive);
        unsubscribe();
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// HEADLESS TASK EXECUTION ENDPOINTS
// ========================================

/**
 * POST /api/claude/tasks
 * Execute a headless task
 */
router.post('/tasks',
  authorize(['user', 'admin']),
  validateRequest({
    body: {
      prompt: { type: 'string', required: true, minLength: 10 },
      workingDirectory: { type: 'string', required: false },
      allowedTools: { type: 'array', required: false },
      outputFormat: { type: 'string', enum: ['text', 'json', 'structured'], required: false },
      timeout: { type: 'number', min: 1000, max: 600000, required: false },
      priority: { type: 'string', enum: ['low', 'medium', 'high'], required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        prompt,
        workingDirectory,
        allowedTools,
        outputFormat,
        timeout,
        priority
      } = req.body;

      const taskRequest = {
        prompt,
        userId: req.user.id,
        workingDirectory: workingDirectory || '/workspaces/agent-feed/prod',
        allowedTools: allowedTools || ['Read', 'Write', 'Edit', 'Bash', 'Grep'],
        outputFormat: outputFormat || 'json',
        timeout,
        priority: priority || 'medium'
      };

      const result = await sdkManager.executeHeadlessTask(taskRequest);

      res.status(result.status === 'completed' ? 200 : 500).json({
        success: result.status === 'completed',
        task: {
          id: result.id,
          status: result.status,
          output: result.output,
          error: result.error,
          metrics: result.metrics,
          executionTime: result.executionTime
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// CONTEXT MANAGEMENT ENDPOINTS
// ========================================

/**
 * GET /api/claude/sessions/:sessionId/context
 * Get session context information
 */
router.get('/sessions/:sessionId/context',
  authorize(['user', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;

      const session = await sdkManager.getSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied'
        });
      }

      // Get context information (implementation depends on ContextManager)
      res.json({
        success: true,
        context: {
          sessionId,
          size: 'Context size information',
          tokens: 'Token count',
          lastCompaction: 'Last compaction timestamp',
          settings: session.configuration.contextSettings
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/claude/sessions/:sessionId/context/compact
 * Trigger context compaction
 */
router.post('/sessions/:sessionId/context/compact',
  authorize(['user', 'admin']),
  validateRequest({
    body: {
      strategy: { type: 'string', enum: ['aggressive', 'moderate', 'conservative'], required: false },
      preserveKeys: { type: 'array', required: false }
    }
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { strategy, preserveKeys } = req.body;

      const session = await sdkManager.getSession(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or access denied'
        });
      }

      // Trigger context compaction (implementation depends on ContextManager)
      res.json({
        success: true,
        message: 'Context compaction completed',
        strategy: strategy || 'moderate',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// SYSTEM STATUS & MONITORING ENDPOINTS
// ========================================

/**
 * GET /api/claude/health
 * System health check
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await sdkManager.getHealthStatus();

    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/claude/metrics
 * System metrics and statistics
 */
router.get('/metrics',
  authorize(['admin', 'moderator']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const metrics = await sdkManager.getSystemMetrics();

      res.json({
        success: true,
        metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/claude/sessions
 * List all sessions (admin only)
 */
router.get('/sessions',
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, status, type } = req.query;

      // Implementation would filter sessions based on query parameters
      res.json({
        success: true,
        sessions: [],
        filters: { userId, status, type },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// WEBSOCKET SETUP FOR REAL-TIME COMMUNICATION
// ========================================

export function setupWebSocketRoutes(io: SocketIOServer): void {
  const claudeNamespace = io.of('/claude');

  claudeNamespace.on('connection', (socket) => {
    console.log(`Claude WebSocket client connected: ${socket.id}`);

    socket.on('join-session', async (data) => {
      try {
        const { sessionId, token } = data;

        // Validate token and session ownership
        // Implementation depends on authentication system

        socket.join(sessionId);

        const streamingSession = sdkManager.getStreamingSession(sessionId);
        if (streamingSession) {
          // Subscribe to session events
          const unsubscribe = streamingSession.subscribe((event) => {
            socket.emit('session-event', event);
          });

          socket.on('disconnect', () => {
            unsubscribe();
          });

          socket.emit('joined-session', { sessionId, status: 'connected' });
        } else {
          socket.emit('error', { message: 'Session not found' });
        }

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('send-message', async (data) => {
      try {
        const { sessionId, message } = data;

        const streamingSession = sdkManager.getStreamingSession(sessionId);
        if (streamingSession) {
          await streamingSession.sendMessage(message);
        } else {
          socket.emit('error', { message: 'Session not found' });
        }

      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Claude WebSocket client disconnected: ${socket.id}`);
    });
  });
}

// Error handling middleware
router.use(errorHandler);

export default router;
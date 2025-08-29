/**
 * Claude Instances API Routes
 * Provides RESTful endpoints for managing dedicated Claude instances
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
// HTTP/SSE only - Socket.IO removed
// import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import ClaudeProcessManager, { ClaudeInstanceConfig } from '../../services/ClaudeProcessManager';
import { logger } from '../../utils/logger';

const router = Router();

// Rate limiting for instance operations
const instanceRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many instance operations from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const createInstanceRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit instance creation to 10 per 5 minutes
  message: 'Too many instance creation attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize process manager
const processManager = new ClaudeProcessManager();

// HTTP/SSE only - WebSocket endpoint removed
// router.ws = '/ws';

// Middleware for validation error handling
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * HTTP/SSE only - WebSocket endpoint completely removed
 * Real-time communication now handled via Server-Sent Events
 */
const setupHTTPEndpoints = () => {
  logger.info('HTTP/SSE mode: Real-time communication via SSE endpoints');
  // All real-time features converted to HTTP polling/SSE
  return null;
};

// Export HTTP setup function (WebSocket removed)
export { setupHTTPEndpoints };

/**
 * POST /api/claude/instances
 * Create new Claude instance
 */
router.post('/',
  createInstanceRateLimit,
  [
    body('command').optional().isArray().withMessage('Command must be an array'),
    body('workingDirectory').optional().isString().withMessage('Working directory must be a string'),
    body('environment').optional().isObject().withMessage('Environment must be an object'),
    body('timeout').optional().isInt({ min: 1000, max: 1800000 }).withMessage('Timeout must be between 1000ms and 30min'),
    body('maxMemory').optional().isInt({ min: 1024 * 1024 }).withMessage('Max memory must be at least 1MB'),
    body('restartOnCrash').optional().isBoolean().withMessage('RestartOnCrash must be boolean'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const config: ClaudeInstanceConfig = req.body;
      
      logger.info('Creating new Claude instance', { config });
      
      const instanceId = await processManager.createInstance(config);
      
      res.status(201).json({
        success: true,
        instanceId,
        instance: {
          id: instanceId,
          name: `claude-${instanceId.split('-').pop()}`,
          status: 'starting',
          type: config.instanceType || 'default',
          workingDirectory: config.workingDirectory || process.cwd()
        },
        message: 'Claude instance created successfully'
      });
      
      logger.info(`Claude instance created: ${instanceId}`);
    } catch (error) {
      logger.error('Failed to create Claude instance:', error);
      
      res.status(500).json({
        error: 'Failed to create Claude instance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/claude/instances
 * List active instances
 */
router.get('/',
  instanceRateLimit,
  [
    query('status').optional().isIn(['starting', 'running', 'stopping', 'stopped', 'crashed', 'error'])
      .withMessage('Invalid status filter'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query;
      
      let instances = processManager.getInstances();
      
      // Apply status filter if provided
      if (status) {
        instances = instances.filter(instance => instance.status === status);
      }
      
      // Apply pagination
      const total = instances.length;
      const paginatedInstances = instances.slice(Number(offset), Number(offset) + Number(limit));
      
      res.json({
        success: true,
        instances: paginatedInstances,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      });
      
      logger.debug(`Listed ${paginatedInstances.length} of ${total} instances`);
    } catch (error) {
      logger.error('Failed to list Claude instances:', error);
      
      res.status(500).json({
        error: 'Failed to list Claude instances',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/claude/instances/:id
 * Get instance details
 */
router.get('/:id',
  instanceRateLimit,
  [
    param('id').isString().matches(/^claude-\d+$/).withMessage('Instance ID must be in format claude-XXXX'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const instance = processManager.getInstance(id);
      
      if (!instance) {
        return res.status(404).json({
          error: 'Instance not found',
          message: `Claude instance with ID ${id} not found`
        });
      }
      
      res.json({
        success: true,
        instance
      });
      
      logger.debug(`Retrieved instance details for ${id}`);
    } catch (error) {
      logger.error(`Failed to get instance details for ${req.params.id}:`, error);
      
      res.status(500).json({
        error: 'Failed to get instance details',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/claude/instances/:id
 * Terminate instance
 */
router.delete('/:id',
  instanceRateLimit,
  [
    param('id').isString().matches(/^claude-\d+$/).withMessage('Instance ID must be in format claude-XXXX'),
    query('force').optional().isBoolean().withMessage('Force parameter must be boolean'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const force = req.query.force === 'true';
      
      const instance = processManager.getInstance(id);
      if (!instance) {
        return res.status(404).json({
          error: 'Instance not found',
          message: `Claude instance with ID ${id} not found`
        });
      }
      
      await processManager.terminateInstance(id, force);
      
      res.json({
        success: true,
        message: `Claude instance ${id} terminated successfully`
      });
      
      logger.info(`Claude instance terminated: ${id}`, { force });
    } catch (error) {
      logger.error(`Failed to terminate instance ${req.params.id}:`, error);
      
      res.status(500).json({
        error: 'Failed to terminate instance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/claude/instances/:id/restart
 * Restart instance
 */
router.post('/:id/restart',
  instanceRateLimit,
  [
    param('id').isString().matches(/^claude-\d+$/).withMessage('Instance ID must be in format claude-XXXX'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const instance = processManager.getInstance(id);
      if (!instance) {
        return res.status(404).json({
          error: 'Instance not found',
          message: `Claude instance with ID ${id} not found`
        });
      }
      
      await processManager.restartInstance(id);
      
      res.json({
        success: true,
        message: `Claude instance ${id} restarted successfully`
      });
      
      logger.info(`Claude instance restarted: ${id}`);
    } catch (error) {
      logger.error(`Failed to restart instance ${req.params.id}:`, error);
      
      res.status(500).json({
        error: 'Failed to restart instance',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/claude/instances/:id/health
 * Health check for instance
 */
router.get('/:id/health',
  instanceRateLimit,
  [
    param('id').isString().matches(/^claude-\d+$/).withMessage('Instance ID must be in format claude-XXXX'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const instance = processManager.getInstance(id);
      if (!instance) {
        return res.status(404).json({
          error: 'Instance not found',
          message: `Claude instance with ID ${id} not found`
        });
      }
      
      const isHealthy = await processManager.healthCheck(id);
      
      res.json({
        success: true,
        instanceId: id,
        healthy: isHealthy,
        status: instance.status,
        lastActivity: instance.lastActivity,
        metrics: instance.metrics
      });
      
      logger.debug(`Health check for instance ${id}: ${isHealthy ? 'healthy' : 'unhealthy'}`);
    } catch (error) {
      logger.error(`Health check failed for instance ${req.params.id}:`, error);
      
      res.status(500).json({
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/claude/instances/:id/terminal/input
 * Send terminal input to instance (CRITICAL FIX)
 */
router.post('/:id/terminal/input',
  instanceRateLimit,
  [
    param('id').isString().matches(/^claude-\d+$/).withMessage('Instance ID must be in format claude-XXXX'),
    body('input').isString().isLength({ min: 1, max: 10000 }).withMessage('Input must be a string between 1 and 10000 characters'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { input } = req.body;
      
      logger.info(`Terminal input received for instance ${id}:`, input.slice(0, 100));
      
      const instance = processManager.getInstance(id);
      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'Instance not found',
          message: `Claude instance with ID ${id} not found`
        });
      }
      
      if (instance.status !== 'running') {
        return res.status(400).json({
          success: false,
          error: 'Instance not ready',
          message: `Instance ${id} is not running (status: ${instance.status})`
        });
      }
      
      // CRITICAL FIX: Send input to the actual terminal process
      await processManager.sendInput(id, input);
      
      res.json({
        success: true,
        message: 'Terminal input sent successfully',
        instanceId: id,
        input: input.slice(0, 100), // Log first 100 chars for debugging
        timestamp: new Date().toISOString()
      });
      
      logger.debug(`Terminal input sent to instance ${id}`, { 
        inputLength: input.length
      });
    } catch (error) {
      logger.error(`Failed to send terminal input to instance ${req.params.id}:`, error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to send terminal input',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/claude/instances/:id/message
 * Send message to instance
 */
router.post('/:id/message',
  instanceRateLimit,
  [
    param('id').isString().matches(/^claude-\d+$/).withMessage('Instance ID must be in format claude-XXXX'),
    body('content').isString().isLength({ min: 1, max: 10000 }).withMessage('Content must be a string between 1 and 10000 characters'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, metadata } = req.body;
      
      const instance = processManager.getInstance(id);
      if (!instance) {
        return res.status(404).json({
          error: 'Instance not found',
          message: `Claude instance with ID ${id} not found`
        });
      }
      
      if (instance.status !== 'running') {
        return res.status(400).json({
          error: 'Instance not ready',
          message: `Instance ${id} is not running (status: ${instance.status})`
        });
      }
      
      await processManager.sendMessage(id, content, metadata);
      
      res.json({
        success: true,
        message: 'Message sent successfully',
        instanceId: id,
        timestamp: new Date().toISOString()
      });
      
      logger.debug(`Message sent to instance ${id}`, { 
        contentLength: content.length, 
        hasMetadata: !!metadata 
      });
    } catch (error) {
      logger.error(`Failed to send message to instance ${req.params.id}:`, error);
      
      res.status(500).json({
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/claude/instances/:id/messages
 * Get recent messages from instance
 */
router.get('/:id/messages',
  instanceRateLimit,
  [
    param('id').isString().matches(/^claude-\d+$/).withMessage('Instance ID must be in format claude-XXXX'),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
    query('type').optional().isIn(['input', 'output', 'error', 'control']).withMessage('Invalid message type filter'),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 100, type } = req.query;
      
      const instance = processManager.getInstance(id);
      if (!instance) {
        return res.status(404).json({
          error: 'Instance not found',
          message: `Claude instance with ID ${id} not found`
        });
      }
      
      // Note: This would need to be implemented in the ClaudeProcessManager
      // For now, we'll return a placeholder response
      res.json({
        success: true,
        instanceId: id,
        messages: [], // Would be populated by the process manager
        metadata: {
          limit: Number(limit),
          type: type || 'all'
        }
      });
      
      logger.debug(`Retrieved messages for instance ${id}`, { limit, type });
    } catch (error) {
      logger.error(`Failed to get messages for instance ${req.params.id}:`, error);
      
      res.status(500).json({
        error: 'Failed to get messages',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/claude/metrics
 * Get system-wide metrics
 */
router.get('/metrics',
  instanceRateLimit,
  async (req: Request, res: Response) => {
    try {
      const instances = processManager.getInstances();
      
      const metrics = {
        totalInstances: instances.length,
        statusCounts: instances.reduce((acc, instance) => {
          acc[instance.status] = (acc[instance.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalMessages: instances.reduce((sum, instance) => sum + instance.metrics.messagesProcessed, 0),
        totalErrors: instances.reduce((sum, instance) => sum + instance.metrics.errorCount, 0),
        totalRestarts: instances.reduce((sum, instance) => sum + instance.metrics.restartCount, 0),
        averageResponseTime: instances.reduce((sum, instance) => sum + instance.metrics.averageResponseTime, 0) / instances.length || 0,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        metrics
      });
      
      logger.debug('System metrics retrieved');
    } catch (error) {
      logger.error('Failed to get system metrics:', error);
      
      res.status(500).json({
        error: 'Failed to get system metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Error handling middleware
router.use((error: any, req: Request, res: Response, next: any) => {
  logger.error('Claude instances route error:', error);
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred while processing your request'
  });
});

// Cleanup on module unload
process.on('SIGINT', async () => {
  logger.info('Shutting down Claude Process Manager...');
  await processManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down Claude Process Manager...');
  await processManager.shutdown();
  process.exit(0);
});

export default router;
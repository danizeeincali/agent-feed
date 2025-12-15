/**
 * Claude Instance Manager API Routes
 * 
 * RESTful API endpoints for managing Claude instances, terminal sessions,
 * and configuration through HTTP requests.
 */

import express from 'express';
import { claudeInstanceManager } from '@/services/claude-instance-manager';
import { logger } from '@/utils/logger';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for instance management
const instanceRateLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many instance management requests',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/v1/claude-instances
 * List all Claude instances
 */
router.get('/', async (req, res) => {
  try {
    const instances = claudeInstanceManager.listInstances();
    
    // Filter sensitive information
    const safeInstances = instances.map(instance => ({
      id: instance.id,
      name: instance.name,
      type: instance.type,
      status: instance.status,
      createdAt: instance.createdAt,
      lastSeen: instance.lastSeen,
      pid: instance.pid,
      hasTerminalSession: !!instance.terminalSessionId,
      metrics: instance.metrics
    }));

    res.json({
      success: true,
      data: safeInstances,
      count: safeInstances.length
    });

  } catch (error) {
    logger.error('Failed to list instances', { error: error.message });
    res.status(500).json({
      error: 'Failed to list instances',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/claude-instances/:id
 * Get specific instance details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const instance = claudeInstanceManager.getInstanceStatus(id);

    if (!instance) {
      return res.status(404).json({
        error: 'Instance not found',
        message: `No instance found with ID: ${id}`
      });
    }

    // Get terminal session info if available
    const terminalSession = claudeInstanceManager.getTerminalSession(id);
    
    res.json({
      success: true,
      data: {
        ...instance,
        terminalSession: terminalSession ? {
          id: terminalSession.id,
          clientCount: terminalSession.clients.size,
          lastActivity: terminalSession.lastActivity,
          size: terminalSession.size,
          settings: terminalSession.settings
        } : null
      }
    });

  } catch (error) {
    logger.error('Failed to get instance', { error: error.message, instanceId: req.params.id });
    res.status(500).json({
      error: 'Failed to get instance',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/claude-instances
 * Launch a new Claude instance
 */
router.post('/', instanceRateLimit, validateRequest({
  type: { required: true, type: 'string', enum: ['production', 'development'] },
  workingDirectory: { type: 'string', optional: true },
  environment: { type: 'object', optional: true },
  arguments: { type: 'array', optional: true },
  name: { type: 'string', optional: true },
  autoConnect: { type: 'boolean', optional: true },
  autoRestart: {
    type: 'object',
    optional: true,
    properties: {
      enabled: { type: 'boolean', required: true },
      intervalHours: { type: 'number', min: 1, max: 168 }, // 1 hour to 1 week
      maxRestarts: { type: 'number', min: 1, max: 100 },
      healthCheckEnabled: { type: 'boolean', optional: true },
      gracefulShutdownTimeout: { type: 'number', min: 5, max: 300, optional: true } // 5 seconds to 5 minutes
    }
  }
}), async (req, res) => {
  try {
    const launchOptions = req.body;
    
    // Add security defaults
    const secureOptions = {
      ...launchOptions,
      workingDirectory: launchOptions.workingDirectory || '/workspaces/agent-feed/prod',
      environment: {
        ...launchOptions.environment,
        // Ensure secure environment
        NODE_ENV: 'production',
        SECURE_MODE: 'true'
      }
    };

    logger.info('Launching Claude instance', { 
      options: secureOptions,
      userId: (req as any).user?.id 
    });

    const instanceId = await claudeInstanceManager.launchInstance(secureOptions);

    res.status(201).json({
      success: true,
      data: {
        instanceId,
        message: 'Instance launched successfully'
      }
    });

  } catch (error) {
    logger.error('Failed to launch instance', { error: error.message, body: req.body });
    res.status(500).json({
      error: 'Failed to launch instance',
      message: error.message
    });
  }
});

/**
 * DELETE /api/v1/claude-instances/:id
 * Kill a Claude instance
 */
router.delete('/:id', instanceRateLimit, async (req, res) => {
  try {
    const { id } = req.params;
    const { graceful = true } = req.query;

    const instance = claudeInstanceManager.getInstanceStatus(id);
    if (!instance) {
      return res.status(404).json({
        error: 'Instance not found',
        message: `No instance found with ID: ${id}`
      });
    }

    logger.info('Killing Claude instance', { 
      instanceId: id, 
      graceful: graceful === 'true',
      userId: (req as any).user?.id 
    });

    await claudeInstanceManager.killInstance(id, graceful === 'true');

    res.json({
      success: true,
      message: 'Instance killed successfully'
    });

  } catch (error) {
    logger.error('Failed to kill instance', { error: error.message, instanceId: req.params.id });
    res.status(500).json({
      error: 'Failed to kill instance',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/claude-instances/:id/restart
 * Restart a Claude instance
 */
router.post('/:id/restart', instanceRateLimit, async (req, res) => {
  try {
    const { id } = req.params;

    const instance = claudeInstanceManager.getInstanceStatus(id);
    if (!instance) {
      return res.status(404).json({
        error: 'Instance not found',
        message: `No instance found with ID: ${id}`
      });
    }

    logger.info('Restarting Claude instance', { 
      instanceId: id,
      userId: (req as any).user?.id 
    });

    const newInstanceId = await claudeInstanceManager.restartInstance(id);

    res.json({
      success: true,
      data: {
        oldInstanceId: id,
        newInstanceId,
        message: 'Instance restarted successfully'
      }
    });

  } catch (error) {
    logger.error('Failed to restart instance', { error: error.message, instanceId: req.params.id });
    res.status(500).json({
      error: 'Failed to restart instance',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/claude-instances/:id/terminal/history
 * Get terminal history for an instance
 */
router.get('/:id/terminal/history', async (req, res) => {
  try {
    const { id } = req.params;
    const { lines } = req.query;

    const instance = claudeInstanceManager.getInstanceStatus(id);
    if (!instance) {
      return res.status(404).json({
        error: 'Instance not found',
        message: `No instance found with ID: ${id}`
      });
    }

    const history = claudeInstanceManager.getTerminalHistory(
      id, 
      lines ? parseInt(lines as string) : undefined
    );

    res.json({
      success: true,
      data: {
        history,
        lineCount: history.length
      }
    });

  } catch (error) {
    logger.error('Failed to get terminal history', { error: error.message, instanceId: req.params.id });
    res.status(500).json({
      error: 'Failed to get terminal history',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/claude-instances/:id/terminal/resize
 * Resize terminal for an instance
 */
router.post('/:id/terminal/resize', validateRequest({
  cols: { required: true, type: 'number', min: 10, max: 500 },
  rows: { required: true, type: 'number', min: 5, max: 200 }
}), async (req, res) => {
  try {
    const { id } = req.params;
    const { cols, rows } = req.body;

    const instance = claudeInstanceManager.getInstanceStatus(id);
    if (!instance) {
      return res.status(404).json({
        error: 'Instance not found',
        message: `No instance found with ID: ${id}`
      });
    }

    claudeInstanceManager.resizeTerminal(id, cols, rows);

    res.json({
      success: true,
      message: 'Terminal resized successfully'
    });

  } catch (error) {
    logger.error('Failed to resize terminal', { error: error.message, instanceId: req.params.id });
    res.status(500).json({
      error: 'Failed to resize terminal',
      message: error.message
    });
  }
});

/**
 * GET /api/v1/claude-instances/stats
 * Get overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const instances = claudeInstanceManager.listInstances();
    
    const stats = {
      totalInstances: instances.length,
      runningInstances: instances.filter(i => i.status === 'running').length,
      stoppedInstances: instances.filter(i => i.status === 'stopped').length,
      errorInstances: instances.filter(i => i.status === 'error').length,
      productionInstances: instances.filter(i => i.type === 'production').length,
      developmentInstances: instances.filter(i => i.type === 'development').length,
      instancesWithTerminals: instances.filter(i => i.terminalSessionId).length,
      averageUptime: instances.reduce((acc, instance) => {
        if (instance.status === 'running') {
          return acc + (Date.now() - instance.createdAt.getTime());
        }
        return acc;
      }, 0) / instances.filter(i => i.status === 'running').length || 0
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

/**
 * POST /api/v1/claude-instances/cleanup
 * Clean up stopped instances
 */
router.post('/cleanup', instanceRateLimit, async (req, res) => {
  try {
    const instances = claudeInstanceManager.listInstances();
    const stoppedInstances = instances.filter(i => i.status === 'stopped');
    
    let cleanedCount = 0;
    for (const instance of stoppedInstances) {
      try {
        await claudeInstanceManager.killInstance(instance.id, false);
        cleanedCount++;
      } catch (error) {
        logger.warn('Failed to clean up instance', { instanceId: instance.id, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        cleanedInstances: cleanedCount,
        message: `Cleaned up ${cleanedCount} stopped instances`
      }
    });

  } catch (error) {
    logger.error('Failed to cleanup instances', { error: error.message });
    res.status(500).json({
      error: 'Failed to cleanup instances',
      message: error.message
    });
  }
});

export default router;
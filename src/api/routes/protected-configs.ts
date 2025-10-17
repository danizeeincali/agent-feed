import express, { Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { ProtectedConfigManager } from '@/config/protected-config-manager';
import { AppError } from '@/types';

const router = express.Router();
const configManager = new ProtectedConfigManager();

/**
 * GET /api/v1/protected-configs
 * List all protected configs (admin only)
 */
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    logger.info('Fetching all protected configs', { user: req.user?.id });

    const configs = await configManager.listAllProtectedConfigs();

    res.json({
      success: true,
      data: configs
    });
  } catch (error) {
    logger.error('Failed to fetch protected configs', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch protected configs'
    });
  }
});

/**
 * GET /api/v1/protected-configs/:agentName
 * Get specific protected config (admin only)
 */
router.get('/:agentName', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agentName } = req.params;

    logger.info('Fetching protected config', { agentName, user: req.user?.id });

    const config = await configManager.getProtectedConfig(agentName);

    if (!config) {
      return res.status(404).json({
        success: false,
        error: `Protected config not found for agent: ${agentName}`
      });
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to fetch protected config', { error, agentName: req.params.agentName });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch protected config'
    });
  }
});

/**
 * POST /api/v1/protected-configs/:agentName
 * Update protected config (admin only)
 */
router.post('/:agentName', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agentName } = req.params;
    const updates = req.body;

    logger.info('Updating protected config', {
      agentName,
      user: req.user?.id,
      updates: Object.keys(updates)
    });

    // Verify system privileges
    if (!req.user?.email.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'System administrator privileges required'
      });
    }

    await configManager.updateProtectedConfig(agentName, updates);

    // Get updated config
    const updatedConfig = await configManager.getProtectedConfig(agentName);

    logger.info('Protected config updated successfully', { agentName });

    res.json({
      success: true,
      data: updatedConfig,
      message: 'Protected config updated successfully'
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      logger.error('Failed to update protected config', {
        error,
        agentName: req.params.agentName
      });
      res.status(500).json({
        success: false,
        error: 'Failed to update protected config'
      });
    }
  }
});

/**
 * GET /api/v1/protected-configs/:agentName/audit-log
 * Get audit trail for protected config (admin only)
 */
router.get('/:agentName/audit-log', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agentName } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    logger.info('Fetching audit log', { agentName, limit, user: req.user?.id });

    const auditLog = await configManager.getAuditLog(agentName, limit);

    res.json({
      success: true,
      data: {
        agentName,
        entries: auditLog
      }
    });
  } catch (error) {
    logger.error('Failed to fetch audit log', {
      error,
      agentName: req.params.agentName
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log'
    });
  }
});

/**
 * POST /api/v1/protected-configs/:agentName/rollback
 * Rollback to previous version (admin only)
 */
router.post('/:agentName/rollback', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agentName } = req.params;
    const { version } = req.body;

    logger.info('Rolling back protected config', {
      agentName,
      version,
      user: req.user?.id
    });

    await configManager.rollbackProtectedConfig(agentName, version);

    // Get rolled back config
    const rolledBackConfig = await configManager.getProtectedConfig(agentName);

    logger.info('Protected config rolled back successfully', { agentName, version });

    res.json({
      success: true,
      data: rolledBackConfig,
      message: `Rolled back to version ${version || 'latest backup'}`
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      logger.error('Failed to rollback protected config', {
        error,
        agentName: req.params.agentName
      });
      res.status(500).json({
        success: false,
        error: 'Failed to rollback protected config'
      });
    }
  }
});

/**
 * GET /api/v1/protected-configs/:agentName/backups
 * List available backups (admin only)
 */
router.get('/:agentName/backups', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { agentName } = req.params;

    logger.info('Fetching backups', { agentName, user: req.user?.id });

    const backups = await configManager.listBackups(agentName);

    res.json({
      success: true,
      data: {
        agentName,
        backups
      }
    });
  } catch (error) {
    logger.error('Failed to fetch backups', {
      error,
      agentName: req.params.agentName
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch backups'
    });
  }
});

export default router;

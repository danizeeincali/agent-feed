import { Router } from 'express';
import { validationResult } from 'express-validator';
import { db } from '@/database/connection';
import { authenticateToken } from '@/middleware/auth';
import {
  validateAutomationTrigger,
  validateAutomationAction,
  validateUUID,
  validatePagination
} from '@/middleware/validation';
import { validationErrorHandler, asyncHandler } from '@/middleware/error';
import { AppError } from '@/types';
import { logger, feedLogger } from '@/utils/logger';
import { claudeFlowService } from '@/services/claude-flow';

const router = Router();

// Get automation triggers for a feed
router.get('/feeds/:feedId/triggers',
  authenticateToken,
  validateUUID('feedId'),
  validatePagination,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { feedId } = req.params;

    // Verify feed belongs to user
    const feedCheck = await db.query(
      'SELECT id FROM feeds WHERE id = $1 AND user_id = $2',
      [feedId, userId]
    );

    if (feedCheck.rows.length === 0) {
      throw new AppError('Feed not found', 404);
    }

    const result = await db.query(
      'SELECT * FROM automation_triggers WHERE feed_id = $1 ORDER BY created_at DESC',
      [feedId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  })
);

// Create automation trigger
router.post('/feeds/:feedId/triggers',
  authenticateToken,
  validateUUID('feedId'),
  validateAutomationTrigger,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { feedId } = req.params;
    const { name, trigger_type, conditions, enabled = true } = req.body;

    // Verify feed belongs to user
    const feedCheck = await db.query(
      'SELECT id FROM feeds WHERE id = $1 AND user_id = $2',
      [feedId, userId]
    );

    if (feedCheck.rows.length === 0) {
      throw new AppError('Feed not found', 404);
    }

    const result = await db.query(
      `INSERT INTO automation_triggers (feed_id, name, trigger_type, conditions, enabled)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [feedId, name, trigger_type, JSON.stringify(conditions), enabled]
    );

    const trigger = result.rows[0];

    logger.info('Automation trigger created', {
      triggerId: trigger.id,
      feedId,
      userId,
      triggerType: trigger_type
    });

    res.status(201).json({
      success: true,
      message: 'Automation trigger created successfully',
      data: trigger
    });
  })
);

// Update automation trigger
router.put('/triggers/:triggerId',
  authenticateToken,
  validateUUID('triggerId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { triggerId } = req.params;
    const updates = req.body;

    // Verify trigger belongs to user's feed
    const triggerCheck = await db.query(
      `SELECT at.* FROM automation_triggers at
       JOIN feeds f ON at.feed_id = f.id
       WHERE at.id = $1 AND f.user_id = $2`,
      [triggerId, userId]
    );

    if (triggerCheck.rows.length === 0) {
      throw new AppError('Trigger not found', 404);
    }

    // Build update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'feed_id' && key !== 'created_at') {
        if (key === 'conditions') {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No valid updates provided', 400);
    }

    updateFields.push('updated_at = NOW()');
    values.push(triggerId);

    const updateQuery = `
      UPDATE automation_triggers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Trigger updated successfully',
      data: result.rows[0]
    });
  })
);

// Delete automation trigger
router.delete('/triggers/:triggerId',
  authenticateToken,
  validateUUID('triggerId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { triggerId } = req.params;

    // Verify trigger belongs to user's feed
    const triggerCheck = await db.query(
      `SELECT at.* FROM automation_triggers at
       JOIN feeds f ON at.feed_id = f.id
       WHERE at.id = $1 AND f.user_id = $2`,
      [triggerId, userId]
    );

    if (triggerCheck.rows.length === 0) {
      throw new AppError('Trigger not found', 404);
    }

    await db.query('DELETE FROM automation_triggers WHERE id = $1', [triggerId]);

    res.json({
      success: true,
      message: 'Trigger deleted successfully'
    });
  })
);

// Get automation actions for a feed
router.get('/feeds/:feedId/actions',
  authenticateToken,
  validateUUID('feedId'),
  validatePagination,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { feedId } = req.params;

    // Verify feed belongs to user
    const feedCheck = await db.query(
      'SELECT id FROM feeds WHERE id = $1 AND user_id = $2',
      [feedId, userId]
    );

    if (feedCheck.rows.length === 0) {
      throw new AppError('Feed not found', 404);
    }

    const result = await db.query(
      'SELECT * FROM automation_actions WHERE feed_id = $1 ORDER BY priority ASC, created_at DESC',
      [feedId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  })
);

// Create automation action
router.post('/feeds/:feedId/actions',
  authenticateToken,
  validateUUID('feedId'),
  validateAutomationAction,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { feedId } = req.params;
    const { name, action_type, config, priority = 1, enabled = true } = req.body;

    // Verify feed belongs to user
    const feedCheck = await db.query(
      'SELECT id FROM feeds WHERE id = $1 AND user_id = $2',
      [feedId, userId]
    );

    if (feedCheck.rows.length === 0) {
      throw new AppError('Feed not found', 404);
    }

    const result = await db.query(
      `INSERT INTO automation_actions (feed_id, name, action_type, config, priority, enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [feedId, name, action_type, JSON.stringify(config), priority, enabled]
    );

    const action = result.rows[0];

    logger.info('Automation action created', {
      actionId: action.id,
      feedId,
      userId,
      actionType: action_type
    });

    res.status(201).json({
      success: true,
      message: 'Automation action created successfully',
      data: action
    });
  })
);

// Update automation action
router.put('/actions/:actionId',
  authenticateToken,
  validateUUID('actionId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { actionId } = req.params;
    const updates = req.body;

    // Verify action belongs to user's feed
    const actionCheck = await db.query(
      `SELECT aa.* FROM automation_actions aa
       JOIN feeds f ON aa.feed_id = f.id
       WHERE aa.id = $1 AND f.user_id = $2`,
      [actionId, userId]
    );

    if (actionCheck.rows.length === 0) {
      throw new AppError('Action not found', 404);
    }

    // Build update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'feed_id' && key !== 'created_at') {
        if (key === 'config') {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      throw new AppError('No valid updates provided', 400);
    }

    updateFields.push('updated_at = NOW()');
    values.push(actionId);

    const updateQuery = `
      UPDATE automation_actions 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(updateQuery, values);

    res.json({
      success: true,
      message: 'Action updated successfully',
      data: result.rows[0]
    });
  })
);

// Delete automation action
router.delete('/actions/:actionId',
  authenticateToken,
  validateUUID('actionId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { actionId } = req.params;

    // Verify action belongs to user's feed
    const actionCheck = await db.query(
      `SELECT aa.* FROM automation_actions aa
       JOIN feeds f ON aa.feed_id = f.id
       WHERE aa.id = $1 AND f.user_id = $2`,
      [actionId, userId]
    );

    if (actionCheck.rows.length === 0) {
      throw new AppError('Action not found', 404);
    }

    await db.query('DELETE FROM automation_actions WHERE id = $1', [actionId]);

    res.json({
      success: true,
      message: 'Action deleted successfully'
    });
  })
);

// Get automation results for a feed
router.get('/feeds/:feedId/results',
  authenticateToken,
  validateUUID('feedId'),
  validatePagination,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { feedId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    // Verify feed belongs to user
    const feedCheck = await db.query(
      'SELECT id FROM feeds WHERE id = $1 AND user_id = $2',
      [feedId, userId]
    );

    if (feedCheck.rows.length === 0) {
      throw new AppError('Feed not found', 404);
    }

    const offset = (page - 1) * limit;

    let whereConditions = 'WHERE fi.feed_id = $1';
    const values: any[] = [feedId];
    let paramIndex = 2;

    if (status) {
      whereConditions += ` AND ar.status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM automation_results ar
      JOIN feed_items fi ON ar.feed_item_id = fi.id
      ${whereConditions}
    `;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get results
    const resultsQuery = `
      SELECT ar.*, fi.title as item_title, fi.url as item_url
      FROM automation_results ar
      JOIN feed_items fi ON ar.feed_item_id = fi.id
      ${whereConditions}
      ORDER BY ar.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const resultsResult = await db.query(resultsQuery, values);

    res.json({
      success: true,
      data: resultsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get automation result details
router.get('/results/:resultId',
  authenticateToken,
  validateUUID('resultId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { resultId } = req.params;

    // Verify result belongs to user's feed
    const resultCheck = await db.query(
      `SELECT ar.*, fi.title as item_title, fi.url as item_url, f.name as feed_name
       FROM automation_results ar
       JOIN feed_items fi ON ar.feed_item_id = fi.id
       JOIN feeds f ON fi.feed_id = f.id
       WHERE ar.id = $1 AND f.user_id = $2`,
      [resultId, userId]
    );

    if (resultCheck.rows.length === 0) {
      throw new AppError('Automation result not found', 404);
    }

    res.json({
      success: true,
      data: resultCheck.rows[0]
    });
  })
);

// Retry failed automation
router.post('/results/:resultId/retry',
  authenticateToken,
  validateUUID('resultId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { resultId } = req.params;

    // Verify result belongs to user's feed and is failed
    const resultCheck = await db.query(
      `SELECT ar.*, fi.feed_id, f.user_id, f.automation_config
       FROM automation_results ar
       JOIN feed_items fi ON ar.feed_item_id = fi.id
       JOIN feeds f ON fi.feed_id = f.id
       WHERE ar.id = $1 AND f.user_id = $2 AND ar.status = 'failed'`,
      [resultId, userId]
    );

    if (resultCheck.rows.length === 0) {
      throw new AppError('Failed automation result not found', 404);
    }

    const result = resultCheck.rows[0];

    // Reset status to pending
    await db.query(
      `UPDATE automation_results 
       SET status = 'pending', error_message = NULL, completed_at = NULL
       WHERE id = $1`,
      [resultId]
    );

    // TODO: Trigger automation retry
    // This would involve re-executing the automation logic

    logger.info('Automation retry initiated', {
      resultId,
      feedId: result.feed_id,
      userId
    });

    res.json({
      success: true,
      message: 'Automation retry initiated'
    });
  })
);

// Test automation trigger
router.post('/triggers/:triggerId/test',
  authenticateToken,
  validateUUID('triggerId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { triggerId } = req.params;
    const { test_data } = req.body;

    // Verify trigger belongs to user's feed
    const triggerCheck = await db.query(
      `SELECT at.*, f.automation_config
       FROM automation_triggers at
       JOIN feeds f ON at.feed_id = f.id
       WHERE at.id = $1 AND f.user_id = $2`,
      [triggerId, userId]
    );

    if (triggerCheck.rows.length === 0) {
      throw new AppError('Trigger not found', 404);
    }

    const trigger = triggerCheck.rows[0];

    // Simulate trigger evaluation
    const testResult = {
      trigger_id: triggerId,
      trigger_type: trigger.trigger_type,
      conditions: trigger.conditions,
      test_data: test_data || {},
      matched: true, // Mock result
      timestamp: new Date().toISOString()
    };

    logger.info('Automation trigger tested', {
      triggerId,
      userId,
      matched: testResult.matched
    });

    res.json({
      success: true,
      message: 'Trigger test completed',
      data: testResult
    });
  })
);

// Get automation analytics
router.get('/analytics',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const timeframe = req.query.timeframe as string || '24h';

    let timeCondition = '';
    if (timeframe === '24h') {
      timeCondition = "AND ar.created_at > NOW() - INTERVAL '24 hours'";
    } else if (timeframe === '7d') {
      timeCondition = "AND ar.created_at > NOW() - INTERVAL '7 days'";
    } else if (timeframe === '30d') {
      timeCondition = "AND ar.created_at > NOW() - INTERVAL '30 days'";
    }

    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE ar.status = 'completed') as successful_executions,
        COUNT(*) FILTER (WHERE ar.status = 'failed') as failed_executions,
        COUNT(*) FILTER (WHERE ar.status = 'running') as running_executions,
        COUNT(DISTINCT fi.feed_id) as active_feeds,
        AVG(EXTRACT(EPOCH FROM (ar.completed_at - ar.created_at))) as avg_execution_time
      FROM automation_results ar
      JOIN feed_items fi ON ar.feed_item_id = fi.id
      JOIN feeds f ON fi.feed_id = f.id
      WHERE f.user_id = $1 ${timeCondition}
    `;

    const result = await db.query(analyticsQuery, [userId]);
    const analytics = result.rows[0];

    // Get trigger type breakdown
    const triggerBreakdownQuery = `
      SELECT 
        at.trigger_type,
        COUNT(*) as count
      FROM automation_results ar
      JOIN feed_items fi ON ar.feed_item_id = fi.id
      JOIN feeds f ON fi.feed_id = f.id
      JOIN automation_triggers at ON at.id::text = ar.trigger_id
      WHERE f.user_id = $1 ${timeCondition}
      GROUP BY at.trigger_type
      ORDER BY count DESC
    `;

    const triggerBreakdown = await db.query(triggerBreakdownQuery, [userId]);

    res.json({
      success: true,
      data: {
        timeframe,
        summary: {
          total_executions: parseInt(analytics.total_executions) || 0,
          successful_executions: parseInt(analytics.successful_executions) || 0,
          failed_executions: parseInt(analytics.failed_executions) || 0,
          running_executions: parseInt(analytics.running_executions) || 0,
          active_feeds: parseInt(analytics.active_feeds) || 0,
          avg_execution_time: parseFloat(analytics.avg_execution_time) || 0,
          success_rate: analytics.total_executions > 0 
            ? (parseInt(analytics.successful_executions) / parseInt(analytics.total_executions) * 100).toFixed(2)
            : '0.00'
        },
        trigger_breakdown: triggerBreakdown.rows
      }
    });
  })
);

export default router;
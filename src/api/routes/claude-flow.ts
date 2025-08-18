import { Router } from 'express';
import { validationResult } from 'express-validator';
import { db } from '@/database/connection';
import { authenticateToken } from '@/middleware/auth';
import {
  validateClaudeFlowSession,
  validateUUID,
  validatePagination
} from '@/middleware/validation';
import { validationErrorHandler, asyncHandler } from '@/middleware/error';
import { ClaudeFlowSession, AppError } from '@/types';
import { logger } from '@/utils/logger';
import { claudeFlowService } from '@/services/claude-flow';

const router = Router();

// Get all Claude Flow sessions for user
router.get('/sessions',
  authenticateToken,
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const offset = (page - 1) * limit;

    let whereConditions = 'WHERE user_id = $1';
    const values: any[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereConditions += ` AND status = $${paramIndex}`;
      values.push(status);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM claude_flow_sessions ${whereConditions}`;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get sessions
    const sessionsQuery = `
      SELECT * FROM claude_flow_sessions
      ${whereConditions}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const sessionsResult = await db.query(sessionsQuery, values);

    res.json({
      success: true,
      data: sessionsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Get specific Claude Flow session
router.get('/sessions/:sessionId',
  authenticateToken,
  validateUUID('sessionId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new AppError('Session not found', 404);
    }

    // Get additional details from swarm if active
    let swarmStatus = null;
    if (session.status === 'active') {
      try {
        swarmStatus = await claudeFlowService.getSwarmStatus(sessionId);
      } catch (error) {
        logger.warn('Failed to get swarm status:', error);
      }
    }

    res.json({
      success: true,
      data: {
        ...session,
        swarm_status: swarmStatus
      }
    });
  })
);

// Create new Claude Flow session
router.post('/sessions',
  authenticateToken,
  validateClaudeFlowSession,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { configuration } = req.body;

    const session = await claudeFlowService.initializeSwarm(userId, configuration);

    res.status(201).json({
      success: true,
      message: 'Claude Flow session created successfully',
      data: session
    });
  })
);

// End Claude Flow session
router.delete('/sessions/:sessionId',
  authenticateToken,
  validateUUID('sessionId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new AppError('Session not found', 404);
    }

    await claudeFlowService.endSession(sessionId);

    res.json({
      success: true,
      message: 'Claude Flow session ended successfully'
    });
  })
);

// Spawn agent in session
router.post('/sessions/:sessionId/agents',
  authenticateToken,
  validateUUID('sessionId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { type, capabilities } = req.body;

    const session = await claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new AppError('Session not found', 404);
    }

    if (!type) {
      throw new AppError('Agent type is required', 400);
    }

    const agent = await claudeFlowService.spawnAgent(sessionId, type, capabilities);

    res.status(201).json({
      success: true,
      message: 'Agent spawned successfully',
      data: agent
    });
  })
);

// Orchestrate task
router.post('/sessions/:sessionId/tasks',
  authenticateToken,
  validateUUID('sessionId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { task, priority, strategy, maxAgents } = req.body;

    const session = await claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new AppError('Session not found', 404);
    }

    if (!task) {
      throw new AppError('Task description is required', 400);
    }

    const taskResult = await claudeFlowService.orchestrateTask(sessionId, task, {
      priority,
      strategy,
      maxAgents
    });

    res.status(201).json({
      success: true,
      message: 'Task orchestrated successfully',
      data: taskResult
    });
  })
);

// Get task status
router.get('/tasks/:taskId/status',
  authenticateToken,
  validateUUID('taskId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    // Verify task belongs to user through automation_results table
    const taskCheck = await db.query(
      `SELECT ar.*, cfs.user_id
       FROM automation_results ar
       LEFT JOIN claude_flow_sessions cfs ON ar.result_data->>'sessionId' = cfs.id::text
       WHERE ar.id = $1`,
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    const task = taskCheck.rows[0];
    if (task.user_id && task.user_id !== req.user!.id) {
      throw new AppError('Task not found', 404);
    }

    const status = await claudeFlowService.getTaskStatus(taskId);

    res.json({
      success: true,
      data: status
    });
  })
);

// Get task results
router.get('/tasks/:taskId/results',
  authenticateToken,
  validateUUID('taskId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const { taskId } = req.params;

    // Verify task belongs to user
    const taskCheck = await db.query(
      `SELECT ar.*, cfs.user_id
       FROM automation_results ar
       LEFT JOIN claude_flow_sessions cfs ON ar.result_data->>'sessionId' = cfs.id::text
       WHERE ar.id = $1`,
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    const task = taskCheck.rows[0];
    if (task.user_id && task.user_id !== req.user!.id) {
      throw new AppError('Task not found', 404);
    }

    const results = await claudeFlowService.getTaskResults(taskId);

    res.json({
      success: true,
      data: results
    });
  })
);

// Train neural patterns
router.post('/sessions/:sessionId/neural/train',
  authenticateToken,
  validateUUID('sessionId'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { pattern_type, training_data } = req.body;

    const session = await claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
      throw new AppError('Session not found', 404);
    }

    if (!pattern_type || !training_data) {
      throw new AppError('Pattern type and training data are required', 400);
    }

    if (!['coordination', 'optimization', 'prediction'].includes(pattern_type)) {
      throw new AppError('Invalid pattern type', 400);
    }

    await claudeFlowService.trainNeuralPatterns(sessionId, pattern_type, training_data);

    res.json({
      success: true,
      message: 'Neural pattern training initiated'
    });
  })
);

// Get neural patterns for user
router.get('/neural-patterns',
  authenticateToken,
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const pattern_type = req.query.pattern_type as string;

    const offset = (page - 1) * limit;

    let whereConditions = `WHERE cfs.user_id = $1`;
    const values: any[] = [userId];
    let paramIndex = 2;

    if (pattern_type) {
      whereConditions += ` AND np.pattern_type = $${paramIndex}`;
      values.push(pattern_type);
      paramIndex++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM neural_patterns np
      LEFT JOIN claude_flow_sessions cfs ON np.session_id = cfs.id
      ${whereConditions}
    `;
    const countResult = await db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // Get patterns
    const patternsQuery = `
      SELECT np.*, cfs.swarm_id, f.name as feed_name
      FROM neural_patterns np
      LEFT JOIN claude_flow_sessions cfs ON np.session_id = cfs.id
      LEFT JOIN feeds f ON np.feed_id = f.id
      ${whereConditions}
      ORDER BY np.confidence_score DESC, np.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const patternsResult = await db.query(patternsQuery, values);

    res.json({
      success: true,
      data: patternsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// Store memory
router.post('/memory',
  authenticateToken,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { key, value, namespace = 'default', ttl } = req.body;

    if (!key || value === undefined) {
      throw new AppError('Key and value are required', 400);
    }

    // Namespace by user to prevent cross-user access
    const userNamespace = `user:${userId}:${namespace}`;

    await claudeFlowService.storeMemory(key, value, userNamespace, ttl);

    res.json({
      success: true,
      message: 'Memory stored successfully'
    });
  })
);

// Retrieve memory
router.get('/memory/:key',
  authenticateToken,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationErrorHandler(errors.array(), req, res, next);
    }
    next();
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { key } = req.params;
    const namespace = req.query.namespace as string || 'default';

    // Namespace by user to prevent cross-user access
    const userNamespace = `user:${userId}:${namespace}`;

    const value = await claudeFlowService.retrieveMemory(key, userNamespace);

    if (value === null) {
      throw new AppError('Memory not found', 404);
    }

    res.json({
      success: true,
      data: {
        key,
        value,
        namespace
      }
    });
  })
);

// Get performance metrics
router.get('/metrics',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const sessionId = req.query.session_id as string;

    const metrics = await claudeFlowService.getPerformanceMetrics(sessionId);

    res.json({
      success: true,
      data: metrics
    });
  })
);

// Get session metrics summary for user
router.get('/metrics/summary',
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const timeframe = req.query.timeframe as string || '24h';

    let timeCondition = '';
    if (timeframe === '24h') {
      timeCondition = "AND created_at > NOW() - INTERVAL '24 hours'";
    } else if (timeframe === '7d') {
      timeCondition = "AND created_at > NOW() - INTERVAL '7 days'";
    } else if (timeframe === '30d') {
      timeCondition = "AND created_at > NOW() - INTERVAL '30 days'";
    }

    const metricsQuery = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
        SUM((metrics->>'agents_spawned')::int) as total_agents_spawned,
        SUM((metrics->>'tasks_completed')::int) as total_tasks_completed,
        SUM((metrics->>'total_tokens_used')::int) as total_tokens_used,
        AVG((metrics->>'performance_score')::float) as avg_performance_score,
        SUM((metrics->>'neural_patterns_learned')::int) as total_patterns_learned
      FROM claude_flow_sessions 
      WHERE user_id = $1 ${timeCondition}
    `;

    const result = await db.query(metricsQuery, [userId]);
    const summary = result.rows[0];

    res.json({
      success: true,
      data: {
        timeframe,
        ...summary,
        total_sessions: parseInt(summary.total_sessions) || 0,
        completed_sessions: parseInt(summary.completed_sessions) || 0,
        failed_sessions: parseInt(summary.failed_sessions) || 0,
        total_agents_spawned: parseInt(summary.total_agents_spawned) || 0,
        total_tasks_completed: parseInt(summary.total_tasks_completed) || 0,
        total_tokens_used: parseInt(summary.total_tokens_used) || 0,
        avg_performance_score: parseFloat(summary.avg_performance_score) || 0,
        total_patterns_learned: parseInt(summary.total_patterns_learned) || 0
      }
    });
  })
);

export default router;
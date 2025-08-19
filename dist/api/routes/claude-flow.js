"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const connection_1 = require("@/database/connection");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const error_1 = require("@/middleware/error");
const types_1 = require("@/types");
const logger_1 = require("@/utils/logger");
const claude_flow_1 = require("@/services/claude-flow");
const router = (0, express_1.Router)();
// Get all Claude Flow sessions for user
router.get('/sessions', auth_1.authenticateToken, validation_1.validatePagination, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const offset = (page - 1) * limit;
    let whereConditions = 'WHERE user_id = $1';
    const values = [userId];
    let paramIndex = 2;
    if (status) {
        whereConditions += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
    }
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM claude_flow_sessions ${whereConditions}`;
    const countResult = await connection_1.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);
    // Get sessions
    const sessionsQuery = `
      SELECT * FROM claude_flow_sessions
      ${whereConditions}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    const sessionsResult = await connection_1.db.query(sessionsQuery, values);
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
}));
// Get specific Claude Flow session
router.get('/sessions/:sessionId', auth_1.authenticateToken, (0, validation_1.validateUUID)('sessionId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const session = await claude_flow_1.claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
        throw new types_1.AppError('Session not found', 404);
    }
    // Get additional details from swarm if active
    let swarmStatus = null;
    if (session.status === 'active') {
        try {
            swarmStatus = await claude_flow_1.claudeFlowService.getSwarmStatus(sessionId);
        }
        catch (error) {
            logger_1.logger.warn('Failed to get swarm status:', error);
        }
    }
    res.json({
        success: true,
        data: {
            ...session,
            swarm_status: swarmStatus
        }
    });
}));
// Create new Claude Flow session
router.post('/sessions', auth_1.authenticateToken, validation_1.validateClaudeFlowSession, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { configuration } = req.body;
    const session = await claude_flow_1.claudeFlowService.initializeSwarm(userId, configuration);
    res.status(201).json({
        success: true,
        message: 'Claude Flow session created successfully',
        data: session
    });
}));
// End Claude Flow session
router.delete('/sessions/:sessionId', auth_1.authenticateToken, (0, validation_1.validateUUID)('sessionId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const session = await claude_flow_1.claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
        throw new types_1.AppError('Session not found', 404);
    }
    await claude_flow_1.claudeFlowService.endSession(sessionId);
    res.json({
        success: true,
        message: 'Claude Flow session ended successfully'
    });
}));
// Spawn agent in session
router.post('/sessions/:sessionId/agents', auth_1.authenticateToken, (0, validation_1.validateUUID)('sessionId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { type, capabilities } = req.body;
    const session = await claude_flow_1.claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
        throw new types_1.AppError('Session not found', 404);
    }
    if (!type) {
        throw new types_1.AppError('Agent type is required', 400);
    }
    const agent = await claude_flow_1.claudeFlowService.spawnAgent(sessionId, type, capabilities);
    res.status(201).json({
        success: true,
        message: 'Agent spawned successfully',
        data: agent
    });
}));
// Orchestrate task
router.post('/sessions/:sessionId/tasks', auth_1.authenticateToken, (0, validation_1.validateUUID)('sessionId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { task, priority, strategy, maxAgents } = req.body;
    const session = await claude_flow_1.claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
        throw new types_1.AppError('Session not found', 404);
    }
    if (!task) {
        throw new types_1.AppError('Task description is required', 400);
    }
    const taskResult = await claude_flow_1.claudeFlowService.orchestrateTask(sessionId, task, {
        priority,
        strategy,
        maxAgents
    });
    res.status(201).json({
        success: true,
        message: 'Task orchestrated successfully',
        data: taskResult
    });
}));
// Get task status
router.get('/tasks/:taskId/status', auth_1.authenticateToken, (0, validation_1.validateUUID)('taskId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const { taskId } = req.params;
    // Verify task belongs to user through automation_results table
    const taskCheck = await connection_1.db.query(`SELECT ar.*, cfs.user_id
       FROM automation_results ar
       LEFT JOIN claude_flow_sessions cfs ON ar.result_data->>'sessionId' = cfs.id::text
       WHERE ar.id = $1`, [taskId]);
    if (taskCheck.rows.length === 0) {
        throw new types_1.AppError('Task not found', 404);
    }
    const task = taskCheck.rows[0];
    if (task.user_id && task.user_id !== req.user.id) {
        throw new types_1.AppError('Task not found', 404);
    }
    const status = await claude_flow_1.claudeFlowService.getTaskStatus(taskId);
    res.json({
        success: true,
        data: status
    });
}));
// Get task results
router.get('/tasks/:taskId/results', auth_1.authenticateToken, (0, validation_1.validateUUID)('taskId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const { taskId } = req.params;
    // Verify task belongs to user
    const taskCheck = await connection_1.db.query(`SELECT ar.*, cfs.user_id
       FROM automation_results ar
       LEFT JOIN claude_flow_sessions cfs ON ar.result_data->>'sessionId' = cfs.id::text
       WHERE ar.id = $1`, [taskId]);
    if (taskCheck.rows.length === 0) {
        throw new types_1.AppError('Task not found', 404);
    }
    const task = taskCheck.rows[0];
    if (task.user_id && task.user_id !== req.user.id) {
        throw new types_1.AppError('Task not found', 404);
    }
    const results = await claude_flow_1.claudeFlowService.getTaskResults(taskId);
    res.json({
        success: true,
        data: results
    });
}));
// Train neural patterns
router.post('/sessions/:sessionId/neural/train', auth_1.authenticateToken, (0, validation_1.validateUUID)('sessionId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const { pattern_type, training_data } = req.body;
    const session = await claude_flow_1.claudeFlowService.getSession(sessionId);
    if (!session || session.user_id !== userId) {
        throw new types_1.AppError('Session not found', 404);
    }
    if (!pattern_type || !training_data) {
        throw new types_1.AppError('Pattern type and training data are required', 400);
    }
    if (!['coordination', 'optimization', 'prediction'].includes(pattern_type)) {
        throw new types_1.AppError('Invalid pattern type', 400);
    }
    await claude_flow_1.claudeFlowService.trainNeuralPatterns(sessionId, pattern_type, training_data);
    res.json({
        success: true,
        message: 'Neural pattern training initiated'
    });
}));
// Get neural patterns for user
router.get('/neural-patterns', auth_1.authenticateToken, validation_1.validatePagination, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const pattern_type = req.query.pattern_type;
    const offset = (page - 1) * limit;
    let whereConditions = `WHERE cfs.user_id = $1`;
    const values = [userId];
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
    const countResult = await connection_1.db.query(countQuery, values);
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
    const patternsResult = await connection_1.db.query(patternsQuery, values);
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
}));
// Store memory
router.post('/memory', auth_1.authenticateToken, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { key, value, namespace = 'default', ttl } = req.body;
    if (!key || value === undefined) {
        throw new types_1.AppError('Key and value are required', 400);
    }
    // Namespace by user to prevent cross-user access
    const userNamespace = `user:${userId}:${namespace}`;
    await claude_flow_1.claudeFlowService.storeMemory(key, value, userNamespace, ttl);
    res.json({
        success: true,
        message: 'Memory stored successfully'
    });
}));
// Retrieve memory
router.get('/memory/:key', auth_1.authenticateToken, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { key } = req.params;
    const namespace = req.query.namespace || 'default';
    // Namespace by user to prevent cross-user access
    const userNamespace = `user:${userId}:${namespace}`;
    const value = await claude_flow_1.claudeFlowService.retrieveMemory(key, userNamespace);
    if (value === null) {
        throw new types_1.AppError('Memory not found', 404);
    }
    res.json({
        success: true,
        data: {
            key,
            value,
            namespace
        }
    });
}));
// Get performance metrics
router.get('/metrics', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const sessionId = req.query.session_id;
    const metrics = await claude_flow_1.claudeFlowService.getPerformanceMetrics(sessionId);
    res.json({
        success: true,
        data: metrics
    });
}));
// Get session metrics summary for user
router.get('/metrics/summary', auth_1.authenticateToken, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const timeframe = req.query.timeframe || '24h';
    let timeCondition = '';
    if (timeframe === '24h') {
        timeCondition = "AND created_at > NOW() - INTERVAL '24 hours'";
    }
    else if (timeframe === '7d') {
        timeCondition = "AND created_at > NOW() - INTERVAL '7 days'";
    }
    else if (timeframe === '30d') {
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
    const result = await connection_1.db.query(metricsQuery, [userId]);
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
}));
exports.default = router;
//# sourceMappingURL=claude-flow.js.map
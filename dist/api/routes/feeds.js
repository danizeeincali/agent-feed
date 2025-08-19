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
// Get all feeds for authenticated user
router.get('/', auth_1.authenticateToken, validation_1.validatePagination, validation_1.validateSearch, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sort = req.query.sort || 'created_at';
    const order = req.query.order || 'desc';
    const search = req.query.q;
    const status = req.query.status;
    const offset = (page - 1) * limit;
    // Build query conditions
    let whereConditions = 'WHERE user_id = $1';
    const values = [userId];
    let paramIndex = 2;
    if (search) {
        whereConditions += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
    }
    if (status) {
        whereConditions += ` AND status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
    }
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM feeds ${whereConditions}`;
    const countResult = await connection_1.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);
    // Get feeds
    const feedsQuery = `
      SELECT f.*, 
             (SELECT COUNT(*) FROM feed_items fi WHERE fi.feed_id = f.id) as items_count,
             (SELECT COUNT(*) FROM feed_items fi WHERE fi.feed_id = f.id AND fi.processed = false) as unprocessed_count
      FROM feeds f
      ${whereConditions}
      ORDER BY f.${sort} ${order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    const feedsResult = await connection_1.db.query(feedsQuery, values);
    const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    };
    res.json({
        success: true,
        data: feedsResult.rows,
        pagination
    });
}));
// Get single feed by ID
router.get('/:feedId', auth_1.authenticateToken, (0, validation_1.validateUUID)('feedId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { feedId } = req.params;
    const result = await connection_1.db.query(`SELECT f.*, 
              (SELECT COUNT(*) FROM feed_items fi WHERE fi.feed_id = f.id) as items_count,
              (SELECT COUNT(*) FROM feed_items fi WHERE fi.feed_id = f.id AND fi.processed = false) as unprocessed_count,
              (SELECT MAX(fi.published_at) FROM feed_items fi WHERE fi.feed_id = f.id) as latest_item_date
       FROM feeds f
       WHERE f.id = $1 AND f.user_id = $2`, [feedId, userId]);
    if (result.rows.length === 0) {
        throw new types_1.AppError('Feed not found', 404);
    }
    res.json({
        success: true,
        data: result.rows[0]
    });
}));
// Create new feed
router.post('/', auth_1.authenticateToken, validation_1.validateFeedCreate, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { name, description, url, feed_type, fetch_interval = 60, automation_config = {} } = req.body;
    // Check if feed URL already exists for user
    const existingFeed = await connection_1.db.query('SELECT id FROM feeds WHERE user_id = $1 AND url = $2', [userId, url]);
    if (existingFeed.rows.length > 0) {
        throw new types_1.AppError('Feed with this URL already exists', 409);
    }
    const result = await connection_1.db.query(`INSERT INTO feeds (user_id, name, description, url, feed_type, fetch_interval, automation_config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`, [userId, name, description, url, feed_type, fetch_interval, JSON.stringify(automation_config)]);
    const feed = result.rows[0];
    // Initialize Claude Flow session if automation is enabled
    if (automation_config.enabled) {
        try {
            const session = await claude_flow_1.claudeFlowService.initializeSwarm(userId, automation_config.claude_flow_config || {
                swarm_topology: 'mesh',
                max_agents: 5,
                agent_types: ['researcher', 'analyzer'],
                neural_training: true,
                memory_persistence: true
            });
            // Update feed with session ID
            await connection_1.db.query('UPDATE feeds SET automation_config = automation_config || $1 WHERE id = $2', [JSON.stringify({ session_id: session.id }), feed.id]);
            feed.automation_config = {
                ...feed.automation_config,
                session_id: session.id
            };
        }
        catch (error) {
            logger_1.logger.warn('Failed to initialize Claude Flow for feed:', error);
            // Don't fail feed creation if Claude Flow initialization fails
        }
    }
    logger_1.logger.info('Feed created', { feedId: feed.id, userId, url });
    res.status(201).json({
        success: true,
        message: 'Feed created successfully',
        data: feed
    });
}));
// Update feed
router.put('/:feedId', auth_1.authenticateToken, (0, validation_1.validateUUID)('feedId'), validation_1.validateFeedUpdate, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { feedId } = req.params;
    const updates = req.body;
    // Check if feed exists and belongs to user
    const existingFeed = await connection_1.db.query('SELECT * FROM feeds WHERE id = $1 AND user_id = $2', [feedId, userId]);
    if (existingFeed.rows.length === 0) {
        throw new types_1.AppError('Feed not found', 404);
    }
    const feed = existingFeed.rows[0];
    // Build update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at') {
            if (key === 'automation_config') {
                updateFields.push(`${key} = $${paramIndex}`);
                values.push(JSON.stringify(value));
            }
            else {
                updateFields.push(`${key} = $${paramIndex}`);
                values.push(value);
            }
            paramIndex++;
        }
    });
    if (updateFields.length === 0) {
        throw new types_1.AppError('No valid updates provided', 400);
    }
    updateFields.push('updated_at = NOW()');
    values.push(feedId);
    const updateQuery = `
      UPDATE feeds 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    const result = await connection_1.db.query(updateQuery, values);
    const updatedFeed = result.rows[0];
    // Handle automation config changes
    if (updates.automation_config) {
        const newConfig = updates.automation_config;
        const oldConfig = feed.automation_config;
        // If automation was enabled but is now disabled
        if (oldConfig.enabled && !newConfig.enabled && oldConfig.session_id) {
            try {
                await claude_flow_1.claudeFlowService.endSession(oldConfig.session_id);
            }
            catch (error) {
                logger_1.logger.warn('Failed to end Claude Flow session:', error);
            }
        }
        // If automation was disabled but is now enabled
        if (!oldConfig.enabled && newConfig.enabled) {
            try {
                const session = await claude_flow_1.claudeFlowService.initializeSwarm(userId, newConfig.claude_flow_config);
                await connection_1.db.query('UPDATE feeds SET automation_config = automation_config || $1 WHERE id = $2', [JSON.stringify({ session_id: session.id }), feedId]);
            }
            catch (error) {
                logger_1.logger.warn('Failed to initialize Claude Flow for updated feed:', error);
            }
        }
    }
    logger_1.logger.info('Feed updated', { feedId, userId, updates: Object.keys(updates) });
    res.json({
        success: true,
        message: 'Feed updated successfully',
        data: updatedFeed
    });
}));
// Delete feed
router.delete('/:feedId', auth_1.authenticateToken, (0, validation_1.validateUUID)('feedId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { feedId } = req.params;
    // Check if feed exists and belongs to user
    const existingFeed = await connection_1.db.query('SELECT * FROM feeds WHERE id = $1 AND user_id = $2', [feedId, userId]);
    if (existingFeed.rows.length === 0) {
        throw new types_1.AppError('Feed not found', 404);
    }
    const feed = existingFeed.rows[0];
    // End Claude Flow session if active
    if (feed.automation_config?.session_id) {
        try {
            await claude_flow_1.claudeFlowService.endSession(feed.automation_config.session_id);
        }
        catch (error) {
            logger_1.logger.warn('Failed to end Claude Flow session during feed deletion:', error);
        }
    }
    // Delete feed (cascade will handle feed_items, automation_results, etc.)
    await connection_1.db.query('DELETE FROM feeds WHERE id = $1', [feedId]);
    logger_1.logger.info('Feed deleted', { feedId, userId });
    res.json({
        success: true,
        message: 'Feed deleted successfully'
    });
}));
// Get feed items
router.get('/:feedId/items', auth_1.authenticateToken, (0, validation_1.validateUUID)('feedId'), validation_1.validatePagination, validation_1.validateSearch, (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { feedId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const sort = req.query.sort || 'published_at';
    const order = req.query.order || 'desc';
    const search = req.query.q;
    const processed = req.query.processed;
    // Verify feed belongs to user
    const feedCheck = await connection_1.db.query('SELECT id FROM feeds WHERE id = $1 AND user_id = $2', [feedId, userId]);
    if (feedCheck.rows.length === 0) {
        throw new types_1.AppError('Feed not found', 404);
    }
    const offset = (page - 1) * limit;
    // Build query conditions
    let whereConditions = 'WHERE feed_id = $1';
    const values = [feedId];
    let paramIndex = 2;
    if (search) {
        whereConditions += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex} OR author ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
    }
    if (processed !== undefined) {
        whereConditions += ` AND processed = $${paramIndex}`;
        values.push(processed === 'true');
        paramIndex++;
    }
    // Get total count
    const countQuery = `SELECT COUNT(*) FROM feed_items ${whereConditions}`;
    const countResult = await connection_1.db.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);
    // Get items
    const itemsQuery = `
      SELECT fi.*,
             (SELECT COUNT(*) FROM automation_results ar WHERE ar.feed_item_id = fi.id) as automation_results_count
      FROM feed_items fi
      ${whereConditions}
      ORDER BY fi.${sort} ${order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(limit, offset);
    const itemsResult = await connection_1.db.query(itemsQuery, values);
    const pagination = {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
    };
    res.json({
        success: true,
        data: itemsResult.rows,
        pagination
    });
}));
// Trigger manual feed fetch
router.post('/:feedId/fetch', auth_1.authenticateToken, (0, validation_1.validateUUID)('feedId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { feedId } = req.params;
    // Verify feed belongs to user
    const feedResult = await connection_1.db.query('SELECT * FROM feeds WHERE id = $1 AND user_id = $2', [feedId, userId]);
    if (feedResult.rows.length === 0) {
        throw new types_1.AppError('Feed not found', 404);
    }
    const feed = feedResult.rows[0];
    // TODO: Implement actual feed fetching logic
    // This would involve:
    // 1. Fetching the RSS/Atom/JSON feed
    // 2. Parsing the content
    // 3. Storing new items
    // 4. Triggering automation if enabled
    logger_1.feedLogger.fetchStart(feedId, feed.url);
    // Mock fetch for now
    const mockItems = 3;
    const mockNewItems = 1;
    const fetchDuration = 500;
    // Update last_fetched timestamp
    await connection_1.db.query('UPDATE feeds SET last_fetched = NOW() WHERE id = $1', [feedId]);
    // Log fetch success
    await connection_1.db.query('INSERT INTO feed_fetch_logs (feed_id, status, items_found, items_new, fetch_duration_ms) VALUES ($1, $2, $3, $4, $5)', [feedId, 'success', mockItems, mockNewItems, fetchDuration]);
    logger_1.feedLogger.fetchSuccess(feedId, mockItems, mockNewItems, fetchDuration);
    res.json({
        success: true,
        message: 'Feed fetch completed',
        data: {
            items_found: mockItems,
            items_new: mockNewItems,
            duration_ms: fetchDuration
        }
    });
}));
// Test feed automation
router.post('/:feedId/test-automation', auth_1.authenticateToken, (0, validation_1.validateUUID)('feedId'), (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return (0, error_1.validationErrorHandler)(errors.array(), req, res, next);
    }
    next();
}, (0, error_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const { feedId } = req.params;
    // Verify feed belongs to user
    const feedResult = await connection_1.db.query('SELECT * FROM feeds WHERE id = $1 AND user_id = $2', [feedId, userId]);
    if (feedResult.rows.length === 0) {
        throw new types_1.AppError('Feed not found', 404);
    }
    const feed = feedResult.rows[0];
    if (!feed.automation_config?.enabled) {
        throw new types_1.AppError('Automation not enabled for this feed', 400);
    }
    // Test automation with Claude Flow
    try {
        const sessionId = feed.automation_config.session_id;
        if (!sessionId) {
            throw new Error('No active Claude Flow session');
        }
        const taskResult = await claude_flow_1.claudeFlowService.orchestrateTask(sessionId, 'Test automation for feed processing', { priority: 'low' });
        res.json({
            success: true,
            message: 'Automation test initiated',
            data: {
                task_id: taskResult.taskId,
                status: taskResult.status,
                estimated_completion: taskResult.estimatedCompletion
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Automation test failed:', error);
        throw new types_1.AppError('Failed to test automation', 500);
    }
}));
exports.default = router;
//# sourceMappingURL=feeds.js.map
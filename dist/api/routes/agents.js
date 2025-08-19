"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const connection_1 = require("@/database/connection");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const logger_1 = require("@/utils/logger");
const router = express_1.default.Router();
// Validation schemas
const createAgentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Agent name must be lowercase with hyphens only'),
    display_name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().min(1),
    system_prompt: zod_1.z.string().min(1),
    avatar_color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Avatar color must be a valid hex color'),
    capabilities: zod_1.z.array(zod_1.z.string()).default([]),
    status: zod_1.z.enum(['active', 'inactive']).default('active')
});
const updateAgentSchema = createAgentSchema.partial();
const bulkActionSchema = zod_1.z.object({
    agent_ids: zod_1.z.array(zod_1.z.string().uuid()),
    action: zod_1.z.enum(['activate', 'deactivate', 'delete'])
});
const testAgentSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(1).max(1000)
});
// GET /api/v1/agents - Get all agents for authenticated user
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
      SELECT 
        id,
        name,
        display_name,
        description,
        system_prompt,
        avatar_color,
        capabilities,
        status,
        created_at,
        updated_at,
        last_used,
        usage_count,
        performance_metrics,
        health_status
      FROM agents 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
        const result = await connection_1.db.query(query, [userId]);
        res.json({
            success: true,
            data: result.rows.map(agent => ({
                ...agent,
                capabilities: agent.capabilities || [],
                performance_metrics: agent.performance_metrics || {
                    success_rate: 0,
                    average_response_time: 0,
                    total_tokens_used: 0,
                    error_count: 0
                },
                health_status: agent.health_status || {
                    cpu_usage: 0,
                    memory_usage: 0,
                    response_time: 0,
                    last_heartbeat: new Date().toISOString()
                }
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch agents:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch agents',
                code: 'FETCH_AGENTS_ERROR'
            }
        });
    }
});
// GET /api/v1/agents/:id - Get specific agent
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const agentId = req.params.id;
        const query = `
      SELECT 
        id,
        name,
        display_name,
        description,
        system_prompt,
        avatar_color,
        capabilities,
        status,
        created_at,
        updated_at,
        last_used,
        usage_count,
        performance_metrics,
        health_status
      FROM agents 
      WHERE id = $1 AND user_id = $2
    `;
        const result = await connection_1.db.query(query, [agentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Agent not found',
                    code: 'AGENT_NOT_FOUND'
                }
            });
        }
        const agent = result.rows[0];
        res.json({
            success: true,
            data: {
                ...agent,
                capabilities: agent.capabilities || [],
                performance_metrics: agent.performance_metrics || {
                    success_rate: 0,
                    average_response_time: 0,
                    total_tokens_used: 0,
                    error_count: 0
                },
                health_status: agent.health_status || {
                    cpu_usage: 0,
                    memory_usage: 0,
                    response_time: 0,
                    last_heartbeat: new Date().toISOString()
                }
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch agent:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch agent',
                code: 'FETCH_AGENT_ERROR'
            }
        });
    }
});
// POST /api/v1/agents - Create new agent
router.post('/', auth_1.authenticateToken, (0, validation_1.validateRequest)(createAgentSchema), async (req, res) => {
    try {
        const userId = req.user.id;
        const agentData = req.body;
        // Check if agent name already exists for this user
        const existingAgent = await connection_1.db.query('SELECT id FROM agents WHERE user_id = $1 AND name = $2', [userId, agentData.name]);
        if (existingAgent.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Agent name already exists',
                    code: 'DUPLICATE_AGENT_NAME'
                }
            });
        }
        const agentId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const query = `
      INSERT INTO agents (
        id, user_id, name, display_name, description, system_prompt,
        avatar_color, capabilities, status, created_at, updated_at,
        usage_count, performance_metrics, health_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
        const values = [
            agentId,
            userId,
            agentData.name,
            agentData.display_name,
            agentData.description,
            agentData.system_prompt,
            agentData.avatar_color,
            JSON.stringify(agentData.capabilities),
            agentData.status,
            now,
            now,
            0,
            JSON.stringify({
                success_rate: 0,
                average_response_time: 0,
                total_tokens_used: 0,
                error_count: 0
            }),
            JSON.stringify({
                cpu_usage: 0,
                memory_usage: 0,
                response_time: 0,
                last_heartbeat: now
            })
        ];
        const result = await connection_1.db.query(query, values);
        const agent = result.rows[0];
        logger_1.logger.info('Agent created', { agentId, userId, name: agentData.name });
        res.status(201).json({
            success: true,
            data: {
                ...agent,
                capabilities: JSON.parse(agent.capabilities || '[]'),
                performance_metrics: JSON.parse(agent.performance_metrics || '{}'),
                health_status: JSON.parse(agent.health_status || '{}')
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to create agent:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to create agent',
                code: 'CREATE_AGENT_ERROR'
            }
        });
    }
});
// PUT /api/v1/agents/:id - Update agent
router.put('/:id', auth_1.authenticateToken, (0, validation_1.validateRequest)(updateAgentSchema), async (req, res) => {
    try {
        const userId = req.user.id;
        const agentId = req.params.id;
        const updates = req.body;
        // Check if agent exists and belongs to user
        const existingAgent = await connection_1.db.query('SELECT id FROM agents WHERE id = $1 AND user_id = $2', [agentId, userId]);
        if (existingAgent.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Agent not found',
                    code: 'AGENT_NOT_FOUND'
                }
            });
        }
        // If name is being updated, check for duplicates
        if (updates.name) {
            const duplicateCheck = await connection_1.db.query('SELECT id FROM agents WHERE user_id = $1 AND name = $2 AND id != $3', [userId, updates.name, agentId]);
            if (duplicateCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Agent name already exists',
                        code: 'DUPLICATE_AGENT_NAME'
                    }
                });
            }
        }
        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        Object.entries(updates).forEach(([key, value]) => {
            if (key === 'capabilities') {
                updateFields.push(`${key} = $${paramCount}`);
                values.push(JSON.stringify(value));
            }
            else {
                updateFields.push(`${key} = $${paramCount}`);
                values.push(value);
            }
            paramCount++;
        });
        updateFields.push(`updated_at = $${paramCount}`);
        values.push(new Date().toISOString());
        paramCount++;
        values.push(agentId, userId);
        const query = `
      UPDATE agents 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;
        const result = await connection_1.db.query(query, values);
        const agent = result.rows[0];
        logger_1.logger.info('Agent updated', { agentId, userId });
        res.json({
            success: true,
            data: {
                ...agent,
                capabilities: JSON.parse(agent.capabilities || '[]'),
                performance_metrics: JSON.parse(agent.performance_metrics || '{}'),
                health_status: JSON.parse(agent.health_status || '{}')
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update agent:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update agent',
                code: 'UPDATE_AGENT_ERROR'
            }
        });
    }
});
// PATCH /api/v1/agents/:id/status - Update agent status
router.patch('/:id/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const agentId = req.params.id;
        const { status } = req.body;
        if (!['active', 'inactive', 'error', 'testing'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid status value',
                    code: 'INVALID_STATUS'
                }
            });
        }
        const query = `
      UPDATE agents 
      SET status = $1, updated_at = $2
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `;
        const result = await connection_1.db.query(query, [status, new Date().toISOString(), agentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Agent not found',
                    code: 'AGENT_NOT_FOUND'
                }
            });
        }
        const agent = result.rows[0];
        logger_1.logger.info('Agent status updated', { agentId, userId, status });
        res.json({
            success: true,
            data: {
                ...agent,
                capabilities: JSON.parse(agent.capabilities || '[]'),
                performance_metrics: JSON.parse(agent.performance_metrics || '{}'),
                health_status: JSON.parse(agent.health_status || '{}')
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to update agent status:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to update agent status',
                code: 'UPDATE_AGENT_STATUS_ERROR'
            }
        });
    }
});
// DELETE /api/v1/agents/:id - Delete agent
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const agentId = req.params.id;
        const query = `
      DELETE FROM agents 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
        const result = await connection_1.db.query(query, [agentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Agent not found',
                    code: 'AGENT_NOT_FOUND'
                }
            });
        }
        logger_1.logger.info('Agent deleted', { agentId, userId });
        res.json({
            success: true,
            message: 'Agent deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to delete agent:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to delete agent',
                code: 'DELETE_AGENT_ERROR'
            }
        });
    }
});
// PATCH /api/v1/agents/bulk - Bulk operations
router.patch('/bulk', auth_1.authenticateToken, (0, validation_1.validateRequest)(bulkActionSchema), async (req, res) => {
    try {
        const userId = req.user.id;
        const { agent_ids, action } = req.body;
        let query;
        let values;
        switch (action) {
            case 'activate':
                query = `
          UPDATE agents 
          SET status = 'active', updated_at = $1
          WHERE id = ANY($2) AND user_id = $3
        `;
                values = [new Date().toISOString(), agent_ids, userId];
                break;
            case 'deactivate':
                query = `
          UPDATE agents 
          SET status = 'inactive', updated_at = $1
          WHERE id = ANY($2) AND user_id = $3
        `;
                values = [new Date().toISOString(), agent_ids, userId];
                break;
            case 'delete':
                query = `
          DELETE FROM agents 
          WHERE id = ANY($1) AND user_id = $2
        `;
                values = [agent_ids, userId];
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Invalid bulk action',
                        code: 'INVALID_BULK_ACTION'
                    }
                });
        }
        const result = await connection_1.db.query(query, values);
        logger_1.logger.info('Bulk agent operation completed', {
            userId,
            action,
            affectedCount: result.rowCount,
            agentIds: agent_ids
        });
        res.json({
            success: true,
            message: `${action} operation completed`,
            affected_count: result.rowCount
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to perform bulk operation:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to perform bulk operation',
                code: 'BULK_OPERATION_ERROR'
            }
        });
    }
});
// POST /api/v1/agents/:id/test - Test agent
router.post('/:id/test', auth_1.authenticateToken, (0, validation_1.validateRequest)(testAgentSchema), async (req, res) => {
    try {
        const userId = req.user.id;
        const agentId = req.params.id;
        const { prompt } = req.body;
        // Get agent details
        const agentResult = await connection_1.db.query('SELECT id, name, display_name, system_prompt, status FROM agents WHERE id = $1 AND user_id = $2', [agentId, userId]);
        if (agentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Agent not found',
                    code: 'AGENT_NOT_FOUND'
                }
            });
        }
        const agent = agentResult.rows[0];
        // Update agent status to testing
        await connection_1.db.query('UPDATE agents SET status = $1, updated_at = $2 WHERE id = $3', ['testing', new Date().toISOString(), agentId]);
        // Simulate agent testing (in a real implementation, this would call the actual agent)
        const testStartTime = Date.now();
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
        const testEndTime = Date.now();
        const responseTime = testEndTime - testStartTime;
        // Mock response
        const mockResponse = {
            response: `Test response from ${agent.display_name}: I received your prompt "${prompt}" and I'm ready to help!`,
            metadata: {
                response_time: responseTime,
                tokens_used: Math.floor(Math.random() * 100) + 50,
                confidence: Math.random() * 0.3 + 0.7,
                model_version: '1.0.0'
            }
        };
        // Update agent performance metrics
        const currentMetrics = agentResult.rows[0].performance_metrics || {};
        const updatedMetrics = {
            ...currentMetrics,
            average_response_time: responseTime,
            total_tokens_used: (currentMetrics.total_tokens_used || 0) + mockResponse.metadata.tokens_used,
            last_test_time: new Date().toISOString()
        };
        // Update agent back to active status and metrics
        await connection_1.db.query('UPDATE agents SET status = $1, performance_metrics = $2, updated_at = $3 WHERE id = $4', ['active', JSON.stringify(updatedMetrics), new Date().toISOString(), agentId]);
        logger_1.logger.info('Agent test completed', { agentId, userId, responseTime });
        res.json({
            success: true,
            data: {
                test_id: (0, uuid_1.v4)(),
                agent_id: agentId,
                prompt,
                response: mockResponse.response,
                metadata: mockResponse.metadata,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to test agent:', error);
        // Reset agent status on error
        try {
            await connection_1.db.query('UPDATE agents SET status = $1, updated_at = $2 WHERE id = $3', ['error', new Date().toISOString(), req.params.id]);
        }
        catch (updateError) {
            logger_1.logger.error('Failed to update agent status after test error:', updateError);
        }
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to test agent',
                code: 'AGENT_TEST_ERROR'
            }
        });
    }
});
// GET /api/v1/agents/:id/metrics - Get agent performance metrics
router.get('/:id/metrics', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const agentId = req.params.id;
        const query = `
      SELECT 
        id,
        name,
        display_name,
        performance_metrics,
        health_status,
        usage_count,
        last_used,
        created_at
      FROM agents 
      WHERE id = $1 AND user_id = $2
    `;
        const result = await connection_1.db.query(query, [agentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Agent not found',
                    code: 'AGENT_NOT_FOUND'
                }
            });
        }
        const agent = result.rows[0];
        res.json({
            success: true,
            data: {
                agent_id: agent.id,
                name: agent.name,
                display_name: agent.display_name,
                performance_metrics: JSON.parse(agent.performance_metrics || '{}'),
                health_status: JSON.parse(agent.health_status || '{}'),
                usage_count: agent.usage_count,
                last_used: agent.last_used,
                uptime_days: Math.floor((Date.now() - new Date(agent.created_at).getTime()) / (1000 * 60 * 60 * 24))
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to fetch agent metrics:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch agent metrics',
                code: 'FETCH_METRICS_ERROR'
            }
        });
    }
});
// POST /api/v1/agents/:id/heartbeat - Update agent health status
router.post('/:id/heartbeat', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const agentId = req.params.id;
        const { cpu_usage, memory_usage, response_time } = req.body;
        const healthStatus = {
            cpu_usage: cpu_usage || 0,
            memory_usage: memory_usage || 0,
            response_time: response_time || 0,
            last_heartbeat: new Date().toISOString()
        };
        const query = `
      UPDATE agents 
      SET health_status = $1, updated_at = $2
      WHERE id = $3 AND user_id = $4
      RETURNING id
    `;
        const result = await connection_1.db.query(query, [
            JSON.stringify(healthStatus),
            new Date().toISOString(),
            agentId,
            userId
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Agent not found',
                    code: 'AGENT_NOT_FOUND'
                }
            });
        }
        res.json({
            success: true,
            message: 'Heartbeat recorded',
            timestamp: healthStatus.last_heartbeat
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to record agent heartbeat:', error);
        res.status(500).json({
            success: false,
            error: {
                message: 'Failed to record heartbeat',
                code: 'HEARTBEAT_ERROR'
            }
        });
    }
});
exports.default = router;
//# sourceMappingURL=agents.js.map
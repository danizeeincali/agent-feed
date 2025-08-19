"use strict";
/**
 * Claude Sessions Database Management
 * Handles persistence of Claude Code sessions, agents, and tasks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeSessionsPersistence = exports.ClaudeSessionsDB = void 0;
const connection_1 = require("@/database/connection");
const logger_1 = require("@/utils/logger");
/**
 * Claude Sessions Database Manager
 */
class ClaudeSessionsDB {
    /**
     * Create a new Claude session record
     */
    static async createSession(session) {
        try {
            const query = `
        INSERT INTO claude_flow_sessions (
          id, user_id, swarm_id, status, configuration, metrics, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
            const values = [
                session.id,
                session.userId,
                session.id, // Using session ID as swarm ID for simplicity
                session.status,
                JSON.stringify(session.configuration),
                JSON.stringify(session.metrics),
                session.createdAt,
                session.updatedAt
            ];
            const result = await connection_1.db.query(query, values);
            logger_1.logger.info(`Created Claude session record: ${session.id}`);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Failed to create Claude session record:', error);
            throw error;
        }
    }
    /**
     * Update Claude session record
     */
    static async updateSession(sessionId, updates) {
        try {
            const setParts = [];
            const values = [];
            let paramCount = 1;
            if (updates.status) {
                setParts.push(`status = $${paramCount++}`);
                values.push(updates.status);
            }
            if (updates.configuration) {
                setParts.push(`configuration = $${paramCount++}`);
                values.push(JSON.stringify(updates.configuration));
            }
            if (updates.metrics) {
                setParts.push(`metrics = $${paramCount++}`);
                values.push(JSON.stringify(updates.metrics));
            }
            if (updates.updatedAt) {
                setParts.push(`updated_at = $${paramCount++}`);
                values.push(updates.updatedAt);
            }
            if (updates.status === 'completed' || updates.status === 'failed') {
                setParts.push(`ended_at = $${paramCount++}`);
                values.push(new Date());
            }
            if (setParts.length === 0) {
                return null;
            }
            setParts.push(`updated_at = $${paramCount++}`);
            values.push(new Date());
            values.push(sessionId);
            const query = `
        UPDATE claude_flow_sessions 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
            const result = await connection_1.db.query(query, values);
            if (result.rows.length > 0) {
                logger_1.logger.debug(`Updated Claude session record: ${sessionId}`);
                return result.rows[0];
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Failed to update Claude session record:', error);
            throw error;
        }
    }
    /**
     * Get Claude session by ID
     */
    static async getSession(sessionId) {
        try {
            const query = 'SELECT * FROM claude_flow_sessions WHERE id = $1';
            const result = await connection_1.db.query(query, [sessionId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            logger_1.logger.error('Failed to get Claude session record:', error);
            throw error;
        }
    }
    /**
     * Get all sessions for a user
     */
    static async getUserSessions(userId, limit = 50, offset = 0) {
        try {
            const query = `
        SELECT * FROM claude_flow_sessions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `;
            const result = await connection_1.db.query(query, [userId, limit, offset]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Failed to get user Claude sessions:', error);
            throw error;
        }
    }
    /**
     * Delete Claude session record
     */
    static async deleteSession(sessionId) {
        try {
            const query = 'DELETE FROM claude_flow_sessions WHERE id = $1';
            const result = await connection_1.db.query(query, [sessionId]);
            logger_1.logger.info(`Deleted Claude session record: ${sessionId}`);
            return result.rowCount > 0;
        }
        catch (error) {
            logger_1.logger.error('Failed to delete Claude session record:', error);
            throw error;
        }
    }
    /**
     * Save agent information to database
     */
    static async saveAgent(agent, sessionId) {
        try {
            const query = `
        INSERT INTO agents (
          id, user_id, name, display_name, description, system_prompt, 
          avatar_color, capabilities, status, created_at, updated_at, 
          last_used, usage_count, performance_metrics, health_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) 
        DO UPDATE SET
          status = EXCLUDED.status,
          last_used = EXCLUDED.last_used,
          usage_count = EXCLUDED.usage_count,
          performance_metrics = EXCLUDED.performance_metrics,
          health_status = EXCLUDED.health_status,
          updated_at = EXCLUDED.updated_at
      `;
            // Get user ID from session
            const session = await this.getSession(sessionId);
            const userId = session?.user_id || 'unknown';
            const values = [
                agent.id,
                userId,
                agent.name,
                agent.name, // display_name
                `Claude agent of type ${agent.type}`, // description
                `You are a ${agent.type} agent specialized in ${agent.capabilities.join(', ')}.`, // system_prompt
                '#3B82F6', // avatar_color
                JSON.stringify(agent.capabilities),
                agent.status,
                agent.createdAt,
                new Date(), // updated_at
                agent.lastUsed,
                agent.performance.tasksCompleted,
                JSON.stringify(agent.performance),
                JSON.stringify(agent.health)
            ];
            await connection_1.db.query(query, values);
            logger_1.logger.debug(`Saved Claude agent: ${agent.id}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to save Claude agent:', error);
            throw error;
        }
    }
    /**
     * Update agent status and metrics
     */
    static async updateAgent(agentId, updates) {
        try {
            const setParts = [];
            const values = [];
            let paramCount = 1;
            if (updates.status) {
                setParts.push(`status = $${paramCount++}`);
                values.push(updates.status);
            }
            if (updates.lastUsed) {
                setParts.push(`last_used = $${paramCount++}`);
                values.push(updates.lastUsed);
            }
            if (updates.performance) {
                setParts.push(`performance_metrics = $${paramCount++}`);
                values.push(JSON.stringify(updates.performance));
                setParts.push(`usage_count = $${paramCount++}`);
                values.push(updates.performance.tasksCompleted);
            }
            if (updates.health) {
                setParts.push(`health_status = $${paramCount++}`);
                values.push(JSON.stringify(updates.health));
            }
            if (setParts.length === 0) {
                return;
            }
            setParts.push(`updated_at = $${paramCount++}`);
            values.push(new Date());
            values.push(agentId);
            const query = `
        UPDATE agents 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
      `;
            await connection_1.db.query(query, values);
            logger_1.logger.debug(`Updated Claude agent: ${agentId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to update Claude agent:', error);
            throw error;
        }
    }
    /**
     * Save task information
     */
    static async saveTask(task) {
        try {
            // For simplicity, we'll store tasks in the automation_results table
            // In a production system, you might want a dedicated tasks table
            const query = `
        INSERT INTO automation_results (
          id, feed_item_id, trigger_id, action_id, status, result_data, 
          error_message, created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) 
        DO UPDATE SET
          status = EXCLUDED.status,
          result_data = EXCLUDED.result_data,
          error_message = EXCLUDED.error_message,
          completed_at = EXCLUDED.completed_at
      `;
            const values = [
                task.id,
                task.sessionId, // Using sessionId as feed_item_id
                task.type, // trigger_id
                task.agentId || 'unassigned', // action_id
                task.status,
                JSON.stringify({
                    type: task.type,
                    description: task.description,
                    priority: task.priority,
                    input: task.input,
                    output: task.output,
                    startedAt: task.startedAt,
                    agentId: task.agentId
                }),
                task.error,
                task.createdAt,
                task.completedAt
            ];
            await connection_1.db.query(query, values);
            logger_1.logger.debug(`Saved Claude task: ${task.id}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to save Claude task:', error);
            throw error;
        }
    }
    /**
     * Update task status
     */
    static async updateTask(taskId, updates) {
        try {
            const setParts = [];
            const values = [];
            let paramCount = 1;
            if (updates.status) {
                setParts.push(`status = $${paramCount++}`);
                values.push(updates.status);
            }
            if (updates.error) {
                setParts.push(`error_message = $${paramCount++}`);
                values.push(updates.error);
            }
            if (updates.completedAt) {
                setParts.push(`completed_at = $${paramCount++}`);
                values.push(updates.completedAt);
            }
            if (updates.output || updates.startedAt || updates.agentId) {
                // Update the result_data JSON
                const currentTask = await this.getTaskData(taskId);
                if (currentTask) {
                    const resultData = JSON.parse(currentTask.result_data || '{}');
                    if (updates.output)
                        resultData.output = updates.output;
                    if (updates.startedAt)
                        resultData.startedAt = updates.startedAt;
                    if (updates.agentId)
                        resultData.agentId = updates.agentId;
                    setParts.push(`result_data = $${paramCount++}`);
                    values.push(JSON.stringify(resultData));
                }
            }
            if (setParts.length === 0) {
                return;
            }
            values.push(taskId);
            const query = `
        UPDATE automation_results 
        SET ${setParts.join(', ')}
        WHERE id = $${paramCount}
      `;
            await connection_1.db.query(query, values);
            logger_1.logger.debug(`Updated Claude task: ${taskId}`);
        }
        catch (error) {
            logger_1.logger.error('Failed to update Claude task:', error);
            throw error;
        }
    }
    /**
     * Get task data from database
     */
    static async getTaskData(taskId) {
        try {
            const query = 'SELECT result_data FROM automation_results WHERE id = $1';
            const result = await connection_1.db.query(query, [taskId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            logger_1.logger.error('Failed to get task data:', error);
            return null;
        }
    }
    /**
     * Get session statistics
     */
    static async getSessionStats(userId) {
        try {
            let query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions,
          AVG(EXTRACT(epoch FROM (COALESCE(ended_at, NOW()) - created_at))) as avg_duration_seconds
        FROM claude_flow_sessions
      `;
            const values = [];
            if (userId) {
                query += ' WHERE user_id = $1';
                values.push(userId);
            }
            const result = await connection_1.db.query(query, values);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Failed to get session statistics:', error);
            throw error;
        }
    }
    /**
     * Cleanup old sessions
     */
    static async cleanupOldSessions(olderThanDays = 30) {
        try {
            const query = `
        DELETE FROM claude_flow_sessions 
        WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'
        AND status IN ('completed', 'failed')
      `;
            const result = await connection_1.db.query(query);
            const deletedCount = result.rowCount;
            if (deletedCount > 0) {
                logger_1.logger.info(`Cleaned up ${deletedCount} old Claude sessions`);
            }
            return deletedCount;
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup old sessions:', error);
            throw error;
        }
    }
}
exports.ClaudeSessionsDB = ClaudeSessionsDB;
// Export utilities for session persistence
exports.claudeSessionsPersistence = {
    async syncSession(session) {
        try {
            const existingSession = await ClaudeSessionsDB.getSession(session.id);
            if (existingSession) {
                await ClaudeSessionsDB.updateSession(session.id, session);
            }
            else {
                await ClaudeSessionsDB.createSession(session);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to sync Claude session:', error);
        }
    },
    async syncAgent(agent, sessionId) {
        try {
            await ClaudeSessionsDB.saveAgent(agent, sessionId);
        }
        catch (error) {
            logger_1.logger.error('Failed to sync Claude agent:', error);
        }
    },
    async syncTask(task) {
        try {
            await ClaudeSessionsDB.saveTask(task);
        }
        catch (error) {
            logger_1.logger.error('Failed to sync Claude task:', error);
        }
    },
    async loadUserSessions(userId) {
        try {
            return await ClaudeSessionsDB.getUserSessions(userId);
        }
        catch (error) {
            logger_1.logger.error('Failed to load user sessions:', error);
            return [];
        }
    }
};
//# sourceMappingURL=claude-sessions.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeFlowService = exports.ClaudeFlowService = void 0;
const events_1 = require("events");
const connection_1 = require("../database/connection");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
class ClaudeFlowService extends events_1.EventEmitter {
    sessions = new Map();
    swarmConnections = new Map();
    constructor() {
        super();
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.on('session:started', this.handleSessionStarted.bind(this));
        this.on('session:ended', this.handleSessionEnded.bind(this));
        this.on('task:completed', this.handleTaskCompleted.bind(this));
        this.on('neural:pattern:learned', this.handleNeuralPattern.bind(this));
    }
    // Initialize a new Claude Flow swarm session
    async initializeSwarm(userId, config) {
        try {
            logger_1.logger.info('Initializing Claude Flow swarm', { userId, config });
            // Create session record
            const sessionResult = await connection_1.db.query(`INSERT INTO claude_flow_sessions (user_id, swarm_id, configuration, status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`, [
                userId,
                `swarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                JSON.stringify(config),
                types_1.SessionStatus.INITIALIZING
            ]);
            const session = sessionResult.rows[0];
            // Initialize the actual swarm via Claude Flow API
            try {
                const swarmResponse = await this.callClaudeFlowAPI('swarm_init', {
                    topology: config.swarm_topology,
                    maxAgents: config.max_agents,
                    strategy: 'adaptive'
                });
                // Update session with swarm ID
                await connection_1.db.query('UPDATE claude_flow_sessions SET swarm_id = $1, status = $2 WHERE id = $3', [swarmResponse.swarmId, types_1.SessionStatus.ACTIVE, session.id]);
                session.swarm_id = swarmResponse.swarmId;
                session.status = types_1.SessionStatus.ACTIVE;
                this.sessions.set(session.id, session);
                this.swarmConnections.set(session.swarm_id, swarmResponse);
                logger_1.claudeFlowLogger.sessionStart(session.id, config);
                this.emit('session:started', session);
                return session;
            }
            catch (error) {
                // Mark session as failed
                await connection_1.db.query('UPDATE claude_flow_sessions SET status = $1 WHERE id = $2', [types_1.SessionStatus.FAILED, session.id]);
                throw error;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Claude Flow swarm:', error);
            throw error;
        }
    }
    // Spawn agents in the swarm
    async spawnAgent(sessionId, agentType, capabilities) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            const response = await this.callClaudeFlowAPI('agent_spawn', {
                type: agentType,
                capabilities: capabilities || [],
                swarmId: session.swarm_id
            });
            // Update session metrics
            await this.updateSessionMetrics(sessionId, {
                agents_spawned: 1
            });
            logger_1.claudeFlowLogger.agentSpawn(sessionId, agentType, response.agentId);
            return response;
        }
        catch (error) {
            logger_1.claudeFlowLogger.error(sessionId, error, { agentType, capabilities });
            throw error;
        }
    }
    // Orchestrate a task across the swarm
    async orchestrateTask(sessionId, task, options = {}) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            const response = await this.callClaudeFlowAPI('task_orchestrate', {
                task,
                priority: options.priority || 'medium',
                strategy: options.strategy || 'adaptive',
                maxAgents: options.maxAgents
            });
            // Create automation result record
            await connection_1.db.query(`INSERT INTO automation_results 
         (id, feed_item_id, trigger_id, action_id, status, result_data)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                response.taskId,
                null, // Will be set when associated with feed item
                'claude_flow_task',
                'task_orchestration',
                types_1.AutomationStatus.RUNNING,
                JSON.stringify(response)
            ]);
            return response;
        }
        catch (error) {
            logger_1.claudeFlowLogger.error(sessionId, error, { task, options });
            throw error;
        }
    }
    // Get task status and results
    async getTaskStatus(taskId) {
        try {
            return await this.callClaudeFlowAPI('task_status', { taskId });
        }
        catch (error) {
            logger_1.logger.error('Failed to get task status:', error);
            throw error;
        }
    }
    async getTaskResults(taskId) {
        try {
            return await this.callClaudeFlowAPI('task_results', { taskId });
        }
        catch (error) {
            logger_1.logger.error('Failed to get task results:', error);
            throw error;
        }
    }
    // Neural pattern management
    async trainNeuralPatterns(sessionId, patternType, trainingData) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            await this.callClaudeFlowAPI('neural_train', {
                pattern_type: patternType,
                training_data: JSON.stringify(trainingData),
                epochs: 50
            });
            // Update session metrics
            await this.updateSessionMetrics(sessionId, {
                neural_patterns_learned: 1
            });
        }
        catch (error) {
            logger_1.claudeFlowLogger.error(sessionId, error, { patternType, trainingData });
            throw error;
        }
    }
    async saveNeuralPattern(feedId, sessionId, patternType, patternData, confidenceScore) {
        try {
            const result = await connection_1.db.query(`INSERT INTO neural_patterns 
         (feed_id, session_id, pattern_type, pattern_data, confidence_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`, [feedId, sessionId, patternType, JSON.stringify(patternData), confidenceScore]);
            return result.rows[0];
        }
        catch (error) {
            logger_1.logger.error('Failed to save neural pattern:', error);
            throw error;
        }
    }
    // Memory management
    async storeMemory(key, value, namespace = 'default', ttl) {
        try {
            await this.callClaudeFlowAPI('memory_usage', {
                action: 'store',
                key,
                value: JSON.stringify(value),
                namespace,
                ttl
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to store memory:', error);
            throw error;
        }
    }
    async retrieveMemory(key, namespace = 'default') {
        try {
            const response = await this.callClaudeFlowAPI('memory_usage', {
                action: 'retrieve',
                key,
                namespace
            });
            return response.value ? JSON.parse(response.value) : null;
        }
        catch (error) {
            logger_1.logger.error('Failed to retrieve memory:', error);
            return null;
        }
    }
    // Session management
    async getSession(sessionId) {
        // Check in-memory cache first
        if (this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }
        // Fetch from database
        try {
            const result = await connection_1.db.query('SELECT * FROM claude_flow_sessions WHERE id = $1', [sessionId]);
            if (result.rows.length > 0) {
                const session = result.rows[0];
                this.sessions.set(sessionId, session);
                return session;
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error('Failed to get session:', error);
            return null;
        }
    }
    async updateSessionMetrics(sessionId, metrics) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            const currentMetrics = session.metrics || {
                agents_spawned: 0,
                tasks_completed: 0,
                total_tokens_used: 0,
                performance_score: 0,
                neural_patterns_learned: 0
            };
            const updatedMetrics = {
                ...currentMetrics,
                ...Object.fromEntries(Object.entries(metrics).map(([key, value]) => [
                    key,
                    typeof value === 'number' && currentMetrics[key]
                        ? currentMetrics[key] + value
                        : value
                ]))
            };
            await connection_1.db.query('UPDATE claude_flow_sessions SET metrics = $1, updated_at = NOW() WHERE id = $2', [JSON.stringify(updatedMetrics), sessionId]);
            // Update in-memory cache
            if (this.sessions.has(sessionId)) {
                const cachedSession = this.sessions.get(sessionId);
                cachedSession.metrics = updatedMetrics;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to update session metrics:', error);
            throw error;
        }
    }
    async endSession(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            // Mark session as completed
            await connection_1.db.query('UPDATE claude_flow_sessions SET status = $1, ended_at = NOW() WHERE id = $2', [types_1.SessionStatus.COMPLETED, sessionId]);
            // Clean up swarm if still active
            if (this.swarmConnections.has(session.swarm_id)) {
                try {
                    await this.callClaudeFlowAPI('swarm_destroy', {
                        swarmId: session.swarm_id
                    });
                }
                catch (error) {
                    logger_1.logger.warn('Failed to destroy swarm:', error);
                }
                this.swarmConnections.delete(session.swarm_id);
            }
            this.sessions.delete(sessionId);
            logger_1.claudeFlowLogger.sessionEnd(sessionId, session.metrics);
            this.emit('session:ended', session);
        }
        catch (error) {
            logger_1.logger.error('Failed to end session:', error);
            throw error;
        }
    }
    // Health check and monitoring
    async getSwarmStatus(sessionId) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            return await this.callClaudeFlowAPI('swarm_status', {
                swarmId: session.swarm_id
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get swarm status:', error);
            throw error;
        }
    }
    async getPerformanceMetrics(sessionId) {
        try {
            const params = {};
            if (sessionId) {
                const session = await this.getSession(sessionId);
                if (session) {
                    params.swarmId = session.swarm_id;
                }
            }
            return await this.callClaudeFlowAPI('performance_report', {
                format: 'detailed',
                timeframe: '24h'
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get performance metrics:', error);
            throw error;
        }
    }
    // Event handlers
    async handleSessionStarted(session) {
        logger_1.logger.info('Claude Flow session started', { sessionId: session.id });
    }
    async handleSessionEnded(session) {
        logger_1.logger.info('Claude Flow session ended', { sessionId: session.id });
    }
    async handleTaskCompleted(taskId, result) {
        try {
            // Update automation result
            await connection_1.db.query('UPDATE automation_results SET status = $1, result_data = $2, completed_at = NOW() WHERE id = $3', [types_1.AutomationStatus.COMPLETED, JSON.stringify(result), taskId]);
            logger_1.claudeFlowLogger.taskComplete(taskId, taskId, result);
        }
        catch (error) {
            logger_1.logger.error('Failed to handle task completion:', error);
        }
    }
    async handleNeuralPattern(sessionId, pattern) {
        logger_1.logger.info('Neural pattern learned', {
            sessionId,
            patternType: pattern.pattern_type,
            confidence: pattern.confidence_score
        });
    }
    // Mock Claude Flow API calls (replace with actual API integration)
    async callClaudeFlowAPI(method, params) {
        // This is a mock implementation
        // In production, this would make actual HTTP calls to Claude Flow API
        logger_1.logger.debug('Claude Flow API call', { method, params });
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        switch (method) {
            case 'swarm_init':
                return {
                    swarmId: `swarm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    status: 'active',
                    agents: [],
                    topology: params.topology
                };
            case 'agent_spawn':
                return {
                    agentId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: params.type,
                    capabilities: params.capabilities || [],
                    status: 'active'
                };
            case 'task_orchestrate':
                return {
                    taskId: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    status: 'running',
                    assignedAgents: [`agent-${Math.random().toString(36).substr(2, 9)}`],
                    estimatedCompletion: new Date(Date.now() + 300000) // 5 minutes
                };
            case 'task_status':
                return {
                    taskId: params.taskId,
                    status: 'completed',
                    progress: 100,
                    result: { success: true }
                };
            case 'task_results':
                return {
                    taskId: params.taskId,
                    result: { success: true, data: 'Task completed successfully' },
                    metrics: { duration: 120000, tokensUsed: 500 }
                };
            case 'swarm_status':
                return {
                    swarmId: params.swarmId,
                    status: 'active',
                    agentsCount: 3,
                    activeTasks: 1
                };
            case 'neural_train':
                return {
                    success: true,
                    patternId: `pattern-${Date.now()}`,
                    confidence: 0.85
                };
            case 'memory_usage':
                if (params.action === 'store') {
                    return { success: true };
                }
                else if (params.action === 'retrieve') {
                    return { value: '{"test": "data"}' };
                }
                return { success: true };
            case 'performance_report':
                return {
                    swarms: 1,
                    agents: 3,
                    tasks: 5,
                    performance: 0.92,
                    uptime: '99.9%'
                };
            case 'swarm_destroy':
                return { success: true };
            default:
                throw new Error(`Unknown Claude Flow API method: ${method}`);
        }
    }
}
exports.ClaudeFlowService = ClaudeFlowService;
// Singleton instance
exports.claudeFlowService = new ClaudeFlowService();
exports.default = exports.claudeFlowService;
//# sourceMappingURL=claude-flow.js.map
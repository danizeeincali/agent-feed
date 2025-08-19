"use strict";
/**
 * Claude Code Agent WebSocket Integration
 * Provides real-time communication for Claude agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeAgentWebSocketManager = exports.ClaudeAgentWebSocketManager = void 0;
const claude_code_orchestrator_1 = require("@/orchestration/claude-code-orchestrator");
const claude_integration_1 = require("@/services/claude-integration");
const logger_1 = require("@/utils/logger");
class ClaudeAgentWebSocketManager {
    io = null;
    connectedSockets = new Map();
    isInitialized = false;
    /**
     * Initialize WebSocket manager with Socket.IO server
     */
    initialize(io) {
        if (this.isInitialized) {
            logger_1.logger.warn('Claude WebSocket manager already initialized');
            return;
        }
        this.io = io;
        this.setupNamespace();
        this.setupOrchestratorEvents();
        this.isInitialized = true;
        logger_1.logger.info('Claude Agent WebSocket manager initialized');
    }
    /**
     * Setup Claude-specific namespace
     */
    setupNamespace() {
        if (!this.io)
            return;
        const claudeNamespace = this.io.of('/claude');
        claudeNamespace.use(this.authenticateSocket.bind(this));
        claudeNamespace.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }
    /**
     * Authenticate socket connection
     */
    async authenticateSocket(socket, next) {
        try {
            const token = socket.handshake.auth.token;
            const userId = socket.handshake.auth.userId;
            if (!userId) {
                return next(new Error('User ID required for Claude WebSocket'));
            }
            // Initialize Claude socket data
            socket.claudeData = {
                userId,
                sessionIds: new Set(),
                subscribedAgents: new Set(),
                subscribedTasks: new Set()
            };
            next();
        }
        catch (error) {
            next(new Error('Claude WebSocket authentication failed'));
        }
    }
    /**
     * Handle new socket connection
     */
    handleConnection(socket) {
        const userId = socket.claudeData?.userId;
        logger_1.logger.info(`Claude WebSocket client connected: ${socket.id} (User: ${userId})`);
        this.connectedSockets.set(socket.id, socket);
        // Setup event handlers
        this.setupSocketEvents(socket);
        // Send welcome message with available sessions
        this.sendUserSessions(socket);
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });
    }
    /**
     * Setup socket event handlers
     */
    setupSocketEvents(socket) {
        // Session management
        socket.on('claude:session:subscribe', (sessionId) => {
            this.handleSessionSubscribe(socket, sessionId);
        });
        socket.on('claude:session:unsubscribe', (sessionId) => {
            this.handleSessionUnsubscribe(socket, sessionId);
        });
        socket.on('claude:session:create', (config) => {
            this.handleSessionCreate(socket, config);
        });
        socket.on('claude:session:terminate', (sessionId) => {
            this.handleSessionTerminate(socket, sessionId);
        });
        // Agent management
        socket.on('claude:agent:subscribe', (agentId) => {
            this.handleAgentSubscribe(socket, agentId);
        });
        socket.on('claude:agent:unsubscribe', (agentId) => {
            this.handleAgentUnsubscribe(socket, agentId);
        });
        socket.on('claude:agent:spawn', (data) => {
            this.handleAgentSpawn(socket, data);
        });
        // Task management
        socket.on('claude:task:subscribe', (taskId) => {
            this.handleTaskSubscribe(socket, taskId);
        });
        socket.on('claude:task:unsubscribe', (taskId) => {
            this.handleTaskUnsubscribe(socket, taskId);
        });
        socket.on('claude:task:orchestrate', (data) => {
            this.handleTaskOrchestrate(socket, data);
        });
        // Workflow management
        socket.on('claude:workflow:execute', (data) => {
            this.handleWorkflowExecute(socket, data);
        });
        // Real-time requests
        socket.on('claude:metrics:request', () => {
            this.handleMetricsRequest(socket);
        });
        socket.on('claude:health:request', () => {
            this.handleHealthRequest(socket);
        });
        // Error handling
        socket.on('error', (error) => {
            logger_1.logger.error(`Claude WebSocket error from ${socket.id}:`, error);
            socket.emit('claude:error', {
                message: error.message,
                timestamp: new Date().toISOString()
            });
        });
    }
    /**
     * Handle session subscription
     */
    handleSessionSubscribe(socket, sessionId) {
        if (!socket.claudeData)
            return;
        socket.join(`claude:session:${sessionId}`);
        socket.claudeData.sessionIds.add(sessionId);
        logger_1.logger.debug(`Socket ${socket.id} subscribed to Claude session ${sessionId}`);
        // Send current session state
        const session = claude_code_orchestrator_1.claudeCodeOrchestrator.getSession(sessionId);
        if (session) {
            socket.emit('claude:session:state', {
                sessionId,
                session,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle session unsubscription
     */
    handleSessionUnsubscribe(socket, sessionId) {
        if (!socket.claudeData)
            return;
        socket.leave(`claude:session:${sessionId}`);
        socket.claudeData.sessionIds.delete(sessionId);
        logger_1.logger.debug(`Socket ${socket.id} unsubscribed from Claude session ${sessionId}`);
    }
    /**
     * Handle session creation
     */
    async handleSessionCreate(socket, config) {
        if (!socket.claudeData)
            return;
        try {
            const session = await claude_code_orchestrator_1.claudeCodeOrchestrator.createSession(socket.claudeData.userId, config);
            socket.emit('claude:session:created', {
                session,
                timestamp: new Date().toISOString()
            });
            // Auto-subscribe to new session
            this.handleSessionSubscribe(socket, session.id);
        }
        catch (error) {
            socket.emit('claude:session:create_failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle session termination
     */
    async handleSessionTerminate(socket, sessionId) {
        try {
            await claude_code_orchestrator_1.claudeCodeOrchestrator.terminateSession(sessionId);
            socket.emit('claude:session:terminated', {
                sessionId,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            socket.emit('claude:session:terminate_failed', {
                sessionId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle agent subscription
     */
    handleAgentSubscribe(socket, agentId) {
        if (!socket.claudeData)
            return;
        socket.join(`claude:agent:${agentId}`);
        socket.claudeData.subscribedAgents.add(agentId);
        logger_1.logger.debug(`Socket ${socket.id} subscribed to Claude agent ${agentId}`);
        // Send current agent state
        const agent = claude_integration_1.claudeIntegrationService.getAgent(agentId);
        if (agent) {
            socket.emit('claude:agent:state', {
                agentId,
                agent,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle agent unsubscription
     */
    handleAgentUnsubscribe(socket, agentId) {
        if (!socket.claudeData)
            return;
        socket.leave(`claude:agent:${agentId}`);
        socket.claudeData.subscribedAgents.delete(agentId);
        logger_1.logger.debug(`Socket ${socket.id} unsubscribed from Claude agent ${agentId}`);
    }
    /**
     * Handle agent spawning
     */
    async handleAgentSpawn(socket, data) {
        try {
            const agent = await claude_code_orchestrator_1.claudeCodeOrchestrator.spawnAgent(data.sessionId, data.agentType, data.config);
            socket.emit('claude:agent:spawned', {
                agent,
                timestamp: new Date().toISOString()
            });
            // Auto-subscribe to new agent
            this.handleAgentSubscribe(socket, agent.id);
        }
        catch (error) {
            socket.emit('claude:agent:spawn_failed', {
                sessionId: data.sessionId,
                agentType: data.agentType,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle task subscription
     */
    handleTaskSubscribe(socket, taskId) {
        if (!socket.claudeData)
            return;
        socket.join(`claude:task:${taskId}`);
        socket.claudeData.subscribedTasks.add(taskId);
        logger_1.logger.debug(`Socket ${socket.id} subscribed to Claude task ${taskId}`);
        // Send current task state
        const task = claude_integration_1.claudeIntegrationService.getTask(taskId);
        if (task) {
            socket.emit('claude:task:state', {
                taskId,
                task,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle task unsubscription
     */
    handleTaskUnsubscribe(socket, taskId) {
        if (!socket.claudeData)
            return;
        socket.leave(`claude:task:${taskId}`);
        socket.claudeData.subscribedTasks.delete(taskId);
        logger_1.logger.debug(`Socket ${socket.id} unsubscribed from Claude task ${taskId}`);
    }
    /**
     * Handle task orchestration
     */
    async handleTaskOrchestrate(socket, data) {
        try {
            const task = await claude_code_orchestrator_1.claudeCodeOrchestrator.orchestrateTask(data.sessionId, data.taskConfig);
            socket.emit('claude:task:orchestrated', {
                task,
                timestamp: new Date().toISOString()
            });
            // Auto-subscribe to new task
            this.handleTaskSubscribe(socket, task.id);
        }
        catch (error) {
            socket.emit('claude:task:orchestrate_failed', {
                sessionId: data.sessionId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle workflow execution
     */
    async handleWorkflowExecute(socket, data) {
        try {
            await claude_code_orchestrator_1.claudeCodeOrchestrator.executeWorkflow(data.sessionId, data.workflowId);
            socket.emit('claude:workflow:started', {
                sessionId: data.sessionId,
                workflowId: data.workflowId,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            socket.emit('claude:workflow:failed', {
                sessionId: data.sessionId,
                workflowId: data.workflowId,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * Handle metrics request
     */
    handleMetricsRequest(socket) {
        const metrics = claude_code_orchestrator_1.claudeCodeOrchestrator.getMetrics();
        socket.emit('claude:metrics', {
            metrics,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Handle health request
     */
    handleHealthRequest(socket) {
        const metrics = claude_code_orchestrator_1.claudeCodeOrchestrator.getMetrics();
        const isHealthy = metrics.systemLoad < 0.8 && metrics.activeAgents > 0;
        socket.emit('claude:health', {
            status: isHealthy ? 'healthy' : 'degraded',
            metrics,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Handle socket disconnection
     */
    handleDisconnection(socket) {
        const userId = socket.claudeData?.userId;
        logger_1.logger.info(`Claude WebSocket client disconnected: ${socket.id} (User: ${userId})`);
        this.connectedSockets.delete(socket.id);
    }
    /**
     * Send user sessions to socket
     */
    sendUserSessions(socket) {
        if (!socket.claudeData)
            return;
        const sessions = claude_code_orchestrator_1.claudeCodeOrchestrator.getUserSessions(socket.claudeData.userId);
        socket.emit('claude:sessions', {
            sessions,
            count: sessions.length,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Setup orchestrator event listeners
     */
    setupOrchestratorEvents() {
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('session:created', (session) => {
            this.broadcastToUser(session.userId, 'claude:session:created', { session });
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('session:terminated', (session) => {
            this.broadcast(`claude:session:${session.id}`, 'claude:session:terminated', { sessionId: session.id });
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('agent:spawned', (agent) => {
            const session = claude_integration_1.claudeIntegrationService.getSession(agent.id.split('-')[0]); // Simplified session lookup
            if (session) {
                this.broadcast(`claude:session:${session.id}`, 'claude:agent:spawned', { agent });
            }
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('agent:terminated', (agent) => {
            this.broadcast(`claude:agent:${agent.id}`, 'claude:agent:terminated', { agentId: agent.id });
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('task:created', (task) => {
            this.broadcast(`claude:session:${task.sessionId}`, 'claude:task:created', { task });
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('task:completed', (task) => {
            this.broadcast(`claude:task:${task.id}`, 'claude:task:completed', { task });
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('task:failed', (task) => {
            this.broadcast(`claude:task:${task.id}`, 'claude:task:failed', { task });
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('workflow:completed', (data) => {
            this.broadcast(`claude:session:${data.sessionId}`, 'claude:workflow:completed', data);
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('workflow:failed', (data) => {
            this.broadcast(`claude:session:${data.sessionId}`, 'claude:workflow:failed', data);
        });
        claude_code_orchestrator_1.claudeCodeOrchestrator.on('health:check', (metrics) => {
            this.broadcastToAll('claude:metrics:update', { metrics });
        });
    }
    /**
     * Broadcast message to specific room
     */
    broadcast(room, event, data) {
        if (!this.io)
            return;
        this.io.of('/claude').to(room).emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Broadcast message to all connected clients
     */
    broadcastToAll(event, data) {
        if (!this.io)
            return;
        this.io.of('/claude').emit(event, {
            ...data,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Broadcast message to specific user
     */
    broadcastToUser(userId, event, data) {
        if (!this.io)
            return;
        // Find sockets for this user
        for (const socket of this.connectedSockets.values()) {
            if (socket.claudeData?.userId === userId) {
                socket.emit(event, {
                    ...data,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }
    /**
     * Get connected clients count
     */
    getConnectedCount() {
        return this.connectedSockets.size;
    }
    /**
     * Shutdown WebSocket manager
     */
    shutdown() {
        if (!this.isInitialized)
            return;
        // Disconnect all clients
        for (const socket of this.connectedSockets.values()) {
            socket.disconnect(true);
        }
        this.connectedSockets.clear();
        this.isInitialized = false;
        logger_1.logger.info('Claude Agent WebSocket manager shutdown');
    }
}
exports.ClaudeAgentWebSocketManager = ClaudeAgentWebSocketManager;
// Create and export manager instance
exports.claudeAgentWebSocketManager = new ClaudeAgentWebSocketManager();
//# sourceMappingURL=claude-agents.js.map
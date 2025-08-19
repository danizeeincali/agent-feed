"use strict";
/**
 * Claude Code Orchestration System
 * Manages coordination between Claude Code agents and the main application
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeCodeOrchestrator = exports.ClaudeCodeOrchestrator = void 0;
const events_1 = require("events");
const claude_integration_1 = require("@/services/claude-integration");
const logger_1 = require("@/utils/logger");
const promises_1 = __importDefault(require("fs/promises"));
/**
 * Claude Code Orchestrator
 * Main coordination system for all Claude Code operations
 */
class ClaudeCodeOrchestrator extends events_1.EventEmitter {
    sessions = new Map();
    workflows = new Map();
    agentConfigs = new Map();
    metrics;
    config;
    healthCheckInterval = null;
    isInitialized = false;
    constructor(config = {}) {
        super();
        this.config = {
            maxConcurrentSessions: config.maxConcurrentSessions || 10,
            defaultTopology: config.defaultTopology || 'mesh',
            agentCoordinationStrategy: config.agentCoordinationStrategy || 'adaptive',
            enableAutoScaling: config.enableAutoScaling !== false,
            healthCheckInterval: config.healthCheckInterval || 30000,
            taskTimeoutMs: config.taskTimeoutMs || 300000
        };
        this.metrics = {
            activeSessions: 0,
            totalAgents: 0,
            activeAgents: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageResponseTime: 0,
            systemLoad: 0,
            memoryUsage: 0
        };
        this.setupEventHandlers();
    }
    /**
     * Initialize the orchestration system
     */
    async initialize() {
        try {
            logger_1.logger.info('Initializing Claude Code Orchestrator');
            // Initialize Claude integration service
            await claude_integration_1.claudeIntegrationService.initialize();
            // Load agent configurations
            await this.loadAgentConfigurations();
            // Load workflow definitions
            await this.loadWorkflowDefinitions();
            // Start health monitoring
            this.startHealthMonitoring();
            this.isInitialized = true;
            logger_1.logger.info('Claude Code Orchestrator initialized successfully');
            this.emit('initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Claude Code Orchestrator:', error);
            throw error;
        }
    }
    /**
     * Load agent configurations from config file
     */
    async loadAgentConfigurations() {
        try {
            const configPath = '/workspaces/agent-feed/config/agents-config.json';
            const configData = await promises_1.default.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);
            // Load individual agent configurations
            for (const [agentType, agentConfig] of Object.entries(config.agents)) {
                this.agentConfigs.set(agentType, agentConfig);
            }
            logger_1.logger.info(`Loaded ${this.agentConfigs.size} agent configurations`);
        }
        catch (error) {
            logger_1.logger.error('Failed to load agent configurations:', error);
            throw error;
        }
    }
    /**
     * Load workflow definitions
     */
    async loadWorkflowDefinitions() {
        try {
            const configPath = '/workspaces/agent-feed/config/agents-config.json';
            const configData = await promises_1.default.readFile(configPath, 'utf-8');
            const config = JSON.parse(configData);
            // Load workflow definitions
            if (config.workflows) {
                for (const [workflowId, workflowConfig] of Object.entries(config.workflows)) {
                    const workflow = {
                        id: workflowId,
                        name: workflowConfig.name,
                        description: workflowConfig.description,
                        phases: workflowConfig.phases || [],
                        agents: workflowConfig.agents || [],
                        parallel: workflowConfig.parallel || false,
                        timeout: workflowConfig.duration || 300,
                        priority: workflowConfig.priority || 'medium'
                    };
                    this.workflows.set(workflowId, workflow);
                }
            }
            logger_1.logger.info(`Loaded ${this.workflows.size} workflow definitions`);
        }
        catch (error) {
            logger_1.logger.warn('Failed to load workflow definitions:', error);
            // Continue without workflows - they're optional
        }
    }
    /**
     * Create a new orchestrated session
     */
    async createSession(userId, options = {}) {
        if (!this.isInitialized) {
            throw new Error('Orchestrator not initialized');
        }
        if (this.sessions.size >= this.config.maxConcurrentSessions) {
            throw new Error('Maximum concurrent sessions reached');
        }
        try {
            // Create Claude session
            const session = await claude_integration_1.claudeIntegrationService.createSession(userId, {
                topology: options.topology || this.config.defaultTopology,
                maxAgents: options.maxAgents || 17,
                strategy: this.config.agentCoordinationStrategy,
                persistence: true
            });
            this.sessions.set(session.id, session);
            this.metrics.activeSessions++;
            // Auto-spawn agents if specified
            if (options.autoSpawnAgents && options.autoSpawnAgents.length > 0) {
                await this.spawnInitialAgents(session.id, options.autoSpawnAgents);
            }
            // Execute workflow if specified
            if (options.workflow && this.workflows.has(options.workflow)) {
                await this.executeWorkflow(session.id, options.workflow);
            }
            logger_1.logger.info(`Created orchestrated session: ${session.id}`);
            this.emit('session:created', session);
            return session;
        }
        catch (error) {
            logger_1.logger.error('Failed to create orchestrated session:', error);
            throw error;
        }
    }
    /**
     * Spawn initial agents for a session
     */
    async spawnInitialAgents(sessionId, agentTypes) {
        const spawnPromises = agentTypes.map(async (agentType) => {
            try {
                const agentConfig = this.agentConfigs.get(agentType);
                if (!agentConfig) {
                    logger_1.logger.warn(`Agent configuration not found for type: ${agentType}`);
                    return;
                }
                await this.spawnAgent(sessionId, agentType);
                logger_1.logger.info(`Auto-spawned agent: ${agentType} for session ${sessionId}`);
            }
            catch (error) {
                logger_1.logger.error(`Failed to auto-spawn agent ${agentType}:`, error);
            }
        });
        await Promise.allSettled(spawnPromises);
    }
    /**
     * Spawn a specific agent
     */
    async spawnAgent(sessionId, agentType, customConfig) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const agentConfig = this.agentConfigs.get(agentType);
        if (!agentConfig) {
            throw new Error(`Agent configuration not found for type: ${agentType}`);
        }
        try {
            const agent = await claude_integration_1.claudeIntegrationService.spawnAgent(sessionId, {
                type: agentType,
                name: customConfig?.name || agentConfig.display_name,
                capabilities: customConfig?.capabilities || agentConfig.capabilities
            });
            this.metrics.totalAgents++;
            this.metrics.activeAgents++;
            logger_1.logger.info(`Spawned agent: ${agent.id} (${agentType})`);
            this.emit('agent:spawned', agent);
            return agent;
        }
        catch (error) {
            logger_1.logger.error(`Failed to spawn agent ${agentType}:`, error);
            throw error;
        }
    }
    /**
     * Orchestrate a task with automatic agent selection
     */
    async orchestrateTask(sessionId, taskConfig) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        try {
            // Determine optimal agent types for this task
            const optimalAgents = this.determineOptimalAgents(taskConfig.type, taskConfig.preferredAgents);
            // Ensure required agents are available
            await this.ensureAgentsAvailable(sessionId, optimalAgents);
            // Create and execute task
            const task = await claude_integration_1.claudeIntegrationService.orchestrateTask(sessionId, {
                type: taskConfig.type,
                description: taskConfig.description,
                priority: taskConfig.priority,
                agentTypes: optimalAgents,
                input: taskConfig.input
            });
            this.updateTaskMetrics(task);
            logger_1.logger.info(`Orchestrated task: ${task.id} (${taskConfig.type})`);
            this.emit('task:orchestrated', task);
            return task;
        }
        catch (error) {
            this.metrics.failedTasks++;
            logger_1.logger.error('Failed to orchestrate task:', error);
            throw error;
        }
    }
    /**
     * Determine optimal agents for a task type
     */
    determineOptimalAgents(taskType, preferredAgents) {
        if (preferredAgents && preferredAgents.length > 0) {
            return preferredAgents;
        }
        // Agent type mapping for different task types
        const taskAgentMap = {
            'code-review': ['code-review', 'security', 'performance'],
            'api-development': ['backend', 'database', 'testing'],
            'frontend-development': ['frontend', 'testing', 'performance'],
            'deployment': ['devops', 'monitoring', 'security'],
            'documentation': ['documentation', 'research'],
            'testing': ['testing', 'code-review'],
            'security-audit': ['security', 'code-review'],
            'performance-optimization': ['performance', 'backend', 'database'],
            'research': ['research', 'analytics'],
            'planning': ['chief-of-staff', 'impact-filter'],
            'integration': ['integration', 'backend', 'testing']
        };
        return taskAgentMap[taskType] || ['research', 'backend'];
    }
    /**
     * Ensure required agents are available in session
     */
    async ensureAgentsAvailable(sessionId, requiredAgents) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const existingAgentTypes = session.agents.map(agent => agent.type);
        const missingAgents = requiredAgents.filter(type => !existingAgentTypes.includes(type));
        if (missingAgents.length > 0 && this.config.enableAutoScaling) {
            logger_1.logger.info(`Auto-scaling: spawning missing agents for session ${sessionId}:`, missingAgents);
            const spawnPromises = missingAgents.map(agentType => this.spawnAgent(sessionId, agentType).catch(error => {
                logger_1.logger.warn(`Failed to auto-spawn agent ${agentType}:`, error);
            }));
            await Promise.allSettled(spawnPromises);
        }
    }
    /**
     * Execute a predefined workflow
     */
    async executeWorkflow(sessionId, workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow not found: ${workflowId}`);
        }
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        try {
            logger_1.logger.info(`Executing workflow: ${workflowId} for session ${sessionId}`);
            // Ensure all required agents are available
            await this.ensureAgentsAvailable(sessionId, workflow.agents);
            if (workflow.parallel) {
                // Execute all phases in parallel
                await this.executeWorkflowParallel(sessionId, workflow);
            }
            else {
                // Execute phases sequentially
                await this.executeWorkflowSequential(sessionId, workflow);
            }
            logger_1.logger.info(`Completed workflow: ${workflowId} for session ${sessionId}`);
            this.emit('workflow:completed', { sessionId, workflowId });
        }
        catch (error) {
            logger_1.logger.error(`Failed to execute workflow ${workflowId}:`, error);
            this.emit('workflow:failed', { sessionId, workflowId, error });
            throw error;
        }
    }
    /**
     * Execute workflow phases in parallel
     */
    async executeWorkflowParallel(sessionId, workflow) {
        const phasePromises = workflow.phases.map(async (phase) => {
            try {
                await this.executeWorkflowPhase(sessionId, phase);
            }
            catch (error) {
                logger_1.logger.error(`Failed to execute workflow phase ${phase.name}:`, error);
                throw error;
            }
        });
        await Promise.all(phasePromises);
    }
    /**
     * Execute workflow phases sequentially
     */
    async executeWorkflowSequential(sessionId, workflow) {
        for (const phase of workflow.phases) {
            try {
                await this.executeWorkflowPhase(sessionId, phase);
            }
            catch (error) {
                logger_1.logger.error(`Failed to execute workflow phase ${phase.name}:`, error);
                throw error;
            }
        }
    }
    /**
     * Execute a single workflow phase
     */
    async executeWorkflowPhase(sessionId, phase) {
        logger_1.logger.info(`Executing workflow phase: ${phase.name} for session ${sessionId}`);
        // Create task for this phase
        const task = await this.orchestrateTask(sessionId, {
            type: `workflow-phase`,
            description: `Execute workflow phase: ${phase.name}`,
            priority: 'high',
            preferredAgents: phase.agents,
            timeout: phase.duration * 1000
        });
        // Wait for task completion
        return new Promise((resolve, reject) => {
            const checkTask = async () => {
                const currentTask = claude_integration_1.claudeIntegrationService.getTask(task.id);
                if (currentTask) {
                    if (currentTask.status === 'completed') {
                        resolve();
                    }
                    else if (currentTask.status === 'failed' || currentTask.status === 'cancelled') {
                        reject(new Error(`Phase ${phase.name} failed: ${currentTask.error}`));
                    }
                    else {
                        setTimeout(checkTask, 1000);
                    }
                }
                else {
                    reject(new Error(`Task not found: ${task.id}`));
                }
            };
            checkTask();
            // Timeout after phase duration + buffer
            setTimeout(() => {
                reject(new Error(`Phase ${phase.name} timed out`));
            }, (phase.duration + 30) * 1000);
        });
    }
    /**
     * Get orchestration metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId) {
        return Array.from(this.sessions.values()).filter(session => session.userId === userId);
    }
    /**
     * Terminate a session
     */
    async terminateSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        try {
            await claude_integration_1.claudeIntegrationService.terminateSession(sessionId);
            this.sessions.delete(sessionId);
            this.metrics.activeSessions--;
            logger_1.logger.info(`Terminated orchestrated session: ${sessionId}`);
            this.emit('session:terminated', session);
        }
        catch (error) {
            logger_1.logger.error(`Failed to terminate session ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Update task metrics
     */
    updateTaskMetrics(task) {
        if (task.status === 'completed') {
            this.metrics.completedTasks++;
            if (task.startedAt && task.completedAt) {
                const responseTime = task.completedAt.getTime() - task.startedAt.getTime();
                this.metrics.averageResponseTime =
                    (this.metrics.averageResponseTime + responseTime) / 2;
            }
        }
        else if (task.status === 'failed') {
            this.metrics.failedTasks++;
        }
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.config.healthCheckInterval);
    }
    /**
     * Perform system health check
     */
    performHealthCheck() {
        // Update active agents count
        this.metrics.activeAgents = Array.from(this.sessions.values())
            .reduce((count, session) => count + session.agents.filter(agent => agent.status === 'active' || agent.status === 'idle').length, 0);
        // Calculate system load
        this.metrics.systemLoad = this.metrics.activeSessions / this.config.maxConcurrentSessions;
        // Emit health status
        this.emit('health:check', this.metrics);
        // Log health metrics periodically
        if (Date.now() % (5 * 60 * 1000) < this.config.healthCheckInterval) {
            logger_1.logger.info('Orchestrator health metrics:', this.metrics);
        }
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        claude_integration_1.claudeIntegrationService.on('session:created', (session) => {
            this.emit('session:created', session);
        });
        claude_integration_1.claudeIntegrationService.on('agent:spawned', (agent) => {
            this.emit('agent:spawned', agent);
        });
        claude_integration_1.claudeIntegrationService.on('task:completed', (task) => {
            this.updateTaskMetrics(task);
            this.emit('task:completed', task);
        });
        claude_integration_1.claudeIntegrationService.on('task:failed', (task) => {
            this.updateTaskMetrics(task);
            this.emit('task:failed', task);
        });
    }
    /**
     * Shutdown the orchestrator
     */
    async shutdown() {
        logger_1.logger.info('Shutting down Claude Code Orchestrator');
        // Clear health monitoring
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        // Terminate all active sessions
        const terminationPromises = Array.from(this.sessions.keys()).map(sessionId => this.terminateSession(sessionId).catch(error => logger_1.logger.warn(`Failed to terminate session ${sessionId}:`, error)));
        await Promise.allSettled(terminationPromises);
        // Shutdown Claude integration service
        await claude_integration_1.claudeIntegrationService.shutdown();
        this.isInitialized = false;
        this.emit('shutdown');
        logger_1.logger.info('Claude Code Orchestrator shutdown complete');
    }
}
exports.ClaudeCodeOrchestrator = ClaudeCodeOrchestrator;
// Create and export orchestrator instance
exports.claudeCodeOrchestrator = new ClaudeCodeOrchestrator({
    maxConcurrentSessions: parseInt(process.env.CLAUDE_MAX_SESSIONS || '10'),
    defaultTopology: process.env.CLAUDE_DEFAULT_TOPOLOGY || 'mesh',
    agentCoordinationStrategy: process.env.CLAUDE_COORDINATION_STRATEGY || 'adaptive',
    enableAutoScaling: process.env.CLAUDE_AUTO_SCALING !== 'false',
    healthCheckInterval: parseInt(process.env.CLAUDE_HEALTH_CHECK_INTERVAL || '30000'),
    taskTimeoutMs: parseInt(process.env.CLAUDE_TASK_TIMEOUT || '300000')
});
//# sourceMappingURL=claude-code-orchestrator.js.map
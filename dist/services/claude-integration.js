"use strict";
/**
 * Claude Code Integration Service
 * Provides API wrapper for Claude Code functionality within the containerized environment
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeIntegrationService = exports.ClaudeIntegrationService = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("@/utils/logger");
/**
 * Claude Code Integration Service
 * Manages Claude Code server, agents, and sessions
 */
class ClaudeIntegrationService extends events_1.EventEmitter {
    serverProcess = null;
    sessions = new Map();
    agents = new Map();
    tasks = new Map();
    config;
    isServerRunning = false;
    heartbeatInterval = null;
    constructor(config) {
        super();
        this.config = config;
        this.setupEventHandlers();
    }
    /**
     * Initialize the Claude Code service
     */
    async initialize() {
        try {
            logger_1.logger.info('Initializing Claude Code integration service');
            // Verify Claude CLI is available
            await this.verifyClaudeCLI();
            // Check authentication
            await this.verifyAuthentication();
            // Start Claude Code server
            await this.startServer();
            // Setup directories
            await this.setupDirectories();
            // Start health monitoring
            this.startHealthMonitoring();
            logger_1.logger.info('Claude Code integration service initialized successfully');
            this.emit('initialized');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Claude Code service:', error);
            throw error;
        }
    }
    /**
     * Verify Claude CLI is installed and accessible
     */
    async verifyClaudeCLI() {
        return new Promise((resolve, reject) => {
            const claudeCheck = (0, child_process_1.spawn)('claude', ['--version'], {
                stdio: 'pipe',
                timeout: 5000
            });
            claudeCheck.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error('Claude CLI not found or not functional'));
                }
            });
            claudeCheck.on('error', (error) => {
                reject(new Error(`Claude CLI verification failed: ${error.message}`));
            });
        });
    }
    /**
     * Verify Claude authentication
     */
    async verifyAuthentication() {
        return new Promise((resolve, reject) => {
            const authCheck = (0, child_process_1.spawn)('claude', ['auth', 'status'], {
                stdio: 'pipe',
                timeout: 5000
            });
            authCheck.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error('Claude authentication invalid. Please run claude auth login'));
                }
            });
            authCheck.on('error', (error) => {
                reject(new Error(`Authentication verification failed: ${error.message}`));
            });
        });
    }
    /**
     * Start Claude Code server
     */
    async startServer() {
        if (this.isServerRunning) {
            logger_1.logger.warn('Claude Code server already running');
            return;
        }
        return new Promise((resolve, reject) => {
            logger_1.logger.info(`Starting Claude Code server on ${this.config.host}:${this.config.port}`);
            this.serverProcess = (0, child_process_1.spawn)('claude', [
                'server', 'start',
                '--port', this.config.port.toString(),
                '--host', this.config.host,
                '--config', this.config.configPath,
                '--log-level', 'info'
            ], {
                stdio: 'pipe',
                cwd: '/workspaces/agent-feed'
            });
            // Handle server output
            this.serverProcess.stdout?.on('data', (data) => {
                const output = data.toString();
                logger_1.logger.debug('Claude server stdout:', output);
                if (output.includes('Server started') || output.includes('listening')) {
                    this.isServerRunning = true;
                    this.emit('server:started');
                    resolve();
                }
            });
            this.serverProcess.stderr?.on('data', (data) => {
                const error = data.toString();
                logger_1.logger.warn('Claude server stderr:', error);
                if (error.includes('Error') || error.includes('Failed')) {
                    this.emit('server:error', error);
                }
            });
            // Handle server exit
            this.serverProcess.on('close', (code) => {
                this.isServerRunning = false;
                this.serverProcess = null;
                logger_1.logger.info(`Claude server exited with code ${code}`);
                this.emit('server:stopped', code);
            });
            this.serverProcess.on('error', (error) => {
                this.isServerRunning = false;
                logger_1.logger.error('Claude server error:', error);
                this.emit('server:error', error);
                reject(error);
            });
            // Timeout after 30 seconds
            setTimeout(() => {
                if (!this.isServerRunning) {
                    reject(new Error('Claude server startup timeout'));
                }
            }, 30000);
        });
    }
    /**
     * Setup required directories
     */
    async setupDirectories() {
        const directories = [
            this.config.sessionDirectory,
            this.config.memoryDirectory,
            path_1.default.join(this.config.memoryDirectory, 'sessions'),
            path_1.default.join(this.config.memoryDirectory, 'agents'),
            '/workspaces/agent-feed/logs'
        ];
        for (const dir of directories) {
            try {
                await promises_1.default.mkdir(dir, { recursive: true });
                logger_1.logger.debug(`Created directory: ${dir}`);
            }
            catch (error) {
                logger_1.logger.warn(`Failed to create directory ${dir}:`, error);
            }
        }
    }
    /**
     * Create a new Claude session
     */
    async createSession(userId, config = {}) {
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const session = {
            id: sessionId,
            userId,
            status: 'initializing',
            agents: [],
            configuration: {
                topology: config.topology || 'mesh',
                maxAgents: config.maxAgents || this.config.maxConcurrentAgents,
                strategy: config.strategy || 'balanced',
                persistence: config.persistence !== false
            },
            metrics: {
                totalAgents: 0,
                activeTasks: 0,
                completedTasks: 0,
                totalTokensUsed: 0,
                sessionDuration: 0
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.sessions.set(sessionId, session);
        try {
            // Initialize swarm using Claude Flow MCP commands
            await this.initializeSwarm(session);
            session.status = 'active';
            session.updatedAt = new Date();
            logger_1.logger.info(`Created Claude session: ${sessionId}`);
            this.emit('session:created', session);
            return session;
        }
        catch (error) {
            session.status = 'failed';
            logger_1.logger.error(`Failed to create session ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Initialize swarm for session
     */
    async initializeSwarm(session) {
        // Use MCP tools to initialize swarm
        const swarmConfig = {
            topology: session.configuration.topology,
            maxAgents: session.configuration.maxAgents,
            strategy: session.configuration.strategy
        };
        // This would integrate with MCP tools
        logger_1.logger.info(`Initializing swarm for session ${session.id}`, swarmConfig);
        // Placeholder for actual MCP integration
        // In real implementation, this would call MCP tools:
        // await this.mcp.swarm_init(swarmConfig);
    }
    /**
     * Spawn a new agent
     */
    async spawnAgent(sessionId, agentConfig) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        if (session.agents.length >= session.configuration.maxAgents) {
            throw new Error(`Maximum agents reached for session: ${sessionId}`);
        }
        const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const agent = {
            id: agentId,
            name: agentConfig.name || `${agentConfig.type}-${agentId.slice(-8)}`,
            type: agentConfig.type,
            status: 'spawning',
            capabilities: agentConfig.capabilities || this.getDefaultCapabilities(agentConfig.type),
            performance: {
                tasksCompleted: 0,
                averageResponseTime: 0,
                successRate: 0,
                tokensUsed: 0
            },
            health: {
                cpuUsage: 0,
                memoryUsage: 0,
                lastHeartbeat: new Date()
            },
            createdAt: new Date()
        };
        try {
            this.agents.set(agentId, agent);
            session.agents.push(agent);
            session.metrics.totalAgents++;
            session.updatedAt = new Date();
            // Spawn agent using Claude Code
            await this.performAgentSpawn(agent);
            agent.status = 'active';
            logger_1.logger.info(`Spawned agent: ${agentId} (${agentConfig.type})`);
            this.emit('agent:spawned', agent);
            return agent;
        }
        catch (error) {
            agent.status = 'error';
            logger_1.logger.error(`Failed to spawn agent ${agentId}:`, error);
            throw error;
        }
    }
    /**
     * Perform actual agent spawning
     */
    async performAgentSpawn(agent) {
        // This would integrate with MCP tools for actual agent spawning
        logger_1.logger.info(`Spawning agent ${agent.id} of type ${agent.type}`);
        // Placeholder for actual MCP integration
        // In real implementation, this would call MCP tools:
        // await this.mcp.agent_spawn({ type: agent.type, name: agent.name, capabilities: agent.capabilities });
    }
    /**
     * Get default capabilities for agent type
     */
    getDefaultCapabilities(type) {
        const capabilityMap = {
            'chief-of-staff': ['strategic-planning', 'coordination', 'decision-making', 'resource-allocation'],
            'personal-todos': ['task-management', 'priority-setting', 'deadline-tracking', 'reminder-system'],
            'impact-filter': ['impact-analysis', 'priority-assessment', 'roi-calculation', 'risk-evaluation'],
            'code-review': ['code-analysis', 'quality-assurance', 'security-scanning', 'best-practices'],
            'documentation': ['technical-writing', 'api-documentation', 'user-guides', 'changelog-generation'],
            'testing': ['unit-testing', 'integration-testing', 'performance-testing', 'test-automation'],
            'security': ['vulnerability-scanning', 'security-auditing', 'penetration-testing', 'compliance'],
            'performance': ['performance-monitoring', 'optimization', 'bottleneck-analysis', 'metrics-collection'],
            'database': ['data-modeling', 'query-optimization', 'migration-management', 'backup-recovery'],
            'frontend': ['ui-development', 'react-components', 'styling', 'user-experience'],
            'backend': ['api-development', 'server-logic', 'database-integration', 'authentication'],
            'devops': ['infrastructure-management', 'deployment', 'ci-cd', 'monitoring'],
            'analytics': ['data-analysis', 'metrics-tracking', 'reporting', 'insights-generation'],
            'monitoring': ['system-health', 'alerting', 'log-analysis', 'uptime-monitoring'],
            'deployment': ['release-management', 'rollback-procedures', 'environment-management'],
            'integration': ['service-coordination', 'api-integration', 'data-synchronization'],
            'research': ['technology-investigation', 'competitive-analysis', 'trend-analysis']
        };
        return capabilityMap[type] || ['general-assistance'];
    }
    /**
     * Orchestrate a task across agents
     */
    async orchestrateTask(sessionId, taskConfig) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const task = {
            id: taskId,
            sessionId,
            type: taskConfig.type,
            description: taskConfig.description,
            status: 'pending',
            priority: taskConfig.priority || 'medium',
            input: taskConfig.input,
            createdAt: new Date()
        };
        this.tasks.set(taskId, task);
        session.metrics.activeTasks++;
        try {
            // Find suitable agent or spawn one
            const agent = await this.findOrSpawnAgent(session, taskConfig.agentTypes);
            if (agent) {
                task.agentId = agent.id;
                task.status = 'assigned';
                task.startedAt = new Date();
                // Execute task
                await this.executeTask(task, agent);
            }
            logger_1.logger.info(`Orchestrated task: ${taskId}`);
            this.emit('task:created', task);
            return task;
        }
        catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : 'Unknown error';
            logger_1.logger.error(`Failed to orchestrate task ${taskId}:`, error);
            throw error;
        }
    }
    /**
     * Find suitable agent or spawn one
     */
    async findOrSpawnAgent(session, preferredTypes) {
        // First, try to find an existing idle agent
        const availableAgent = session.agents.find(agent => agent.status === 'idle' || agent.status === 'active');
        if (availableAgent) {
            return availableAgent;
        }
        // If no available agent and we can spawn more
        if (session.agents.length < session.configuration.maxAgents) {
            const agentType = preferredTypes?.[0] || 'research';
            return await this.spawnAgent(session.id, { type: agentType });
        }
        return null;
    }
    /**
     * Execute a task with an agent
     */
    async executeTask(task, agent) {
        task.status = 'running';
        agent.lastUsed = new Date();
        try {
            // This would integrate with actual Claude Code execution
            logger_1.logger.info(`Executing task ${task.id} with agent ${agent.id}`);
            // Simulate task execution
            await new Promise(resolve => setTimeout(resolve, 1000));
            task.status = 'completed';
            task.completedAt = new Date();
            // Update agent performance
            agent.performance.tasksCompleted++;
            agent.performance.successRate = (agent.performance.tasksCompleted / (agent.performance.tasksCompleted + 1)) * 100;
            const session = this.sessions.get(task.sessionId);
            if (session) {
                session.metrics.activeTasks--;
                session.metrics.completedTasks++;
            }
            this.emit('task:completed', task);
        }
        catch (error) {
            task.status = 'failed';
            task.error = error instanceof Error ? error.message : 'Unknown error';
            agent.performance.successRate = (agent.performance.tasksCompleted / (agent.performance.tasksCompleted + 1)) * 100;
            this.emit('task:failed', task);
            throw error;
        }
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
     * Get agent by ID
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * Get all agents in a session
     */
    getSessionAgents(sessionId) {
        const session = this.sessions.get(sessionId);
        return session ? session.agents : [];
    }
    /**
     * Get task by ID
     */
    getTask(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * Get all tasks for a session
     */
    getSessionTasks(sessionId) {
        return Array.from(this.tasks.values()).filter(task => task.sessionId === sessionId);
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
            // Terminate all agents in the session
            for (const agent of session.agents) {
                await this.terminateAgent(agent.id);
            }
            session.status = 'completed';
            session.updatedAt = new Date();
            logger_1.logger.info(`Terminated session: ${sessionId}`);
            this.emit('session:terminated', session);
        }
        catch (error) {
            session.status = 'failed';
            logger_1.logger.error(`Failed to terminate session ${sessionId}:`, error);
            throw error;
        }
    }
    /**
     * Terminate an agent
     */
    async terminateAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent not found: ${agentId}`);
        }
        agent.status = 'terminated';
        logger_1.logger.info(`Terminated agent: ${agentId}`);
        this.emit('agent:terminated', agent);
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.heartbeatInterval = setInterval(() => {
            this.performHealthCheck();
        }, 30000); // Every 30 seconds
    }
    /**
     * Perform health check on all agents
     */
    performHealthCheck() {
        for (const agent of this.agents.values()) {
            if (agent.status === 'active' || agent.status === 'idle') {
                agent.health.lastHeartbeat = new Date();
                this.emit('agent:heartbeat', agent);
            }
        }
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.on('server:error', (error) => {
            logger_1.logger.error('Claude server error:', error);
        });
        this.on('agent:spawned', (agent) => {
            logger_1.logger.info(`Agent spawned: ${agent.id} (${agent.type})`);
        });
        this.on('task:completed', (task) => {
            logger_1.logger.info(`Task completed: ${task.id}`);
        });
    }
    /**
     * Shutdown the service
     */
    async shutdown() {
        logger_1.logger.info('Shutting down Claude Code integration service');
        // Clear health monitoring
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        // Terminate all sessions
        for (const session of this.sessions.values()) {
            if (session.status === 'active') {
                await this.terminateSession(session.id);
            }
        }
        // Stop server
        if (this.serverProcess && this.isServerRunning) {
            this.serverProcess.kill('SIGTERM');
            this.isServerRunning = false;
        }
        this.emit('shutdown');
        logger_1.logger.info('Claude Code integration service shutdown complete');
    }
}
exports.ClaudeIntegrationService = ClaudeIntegrationService;
// Create and export service instance
exports.claudeIntegrationService = new ClaudeIntegrationService({
    port: parseInt(process.env.CLAUDE_SERVER_PORT || '8080'),
    host: process.env.CLAUDE_SERVER_HOST || '0.0.0.0',
    configPath: process.env.CLAUDE_CONFIG_DIR + '/config.json' || '/home/codespace/.claude/config.json',
    sessionDirectory: process.env.CLAUDE_SESSION_DIR || '/tmp/claude-sessions',
    memoryDirectory: process.env.CLAUDE_MEMORY_DIR || '/workspaces/agent-feed/memory',
    maxConcurrentAgents: parseInt(process.env.CLAUDE_MAX_AGENTS || '17'),
    sessionTimeout: parseInt(process.env.CLAUDE_SESSION_TIMEOUT || '3600'),
    enableWebSocket: process.env.CLAUDE_WEBSOCKET_ENABLED === 'true'
});
//# sourceMappingURL=claude-integration.js.map
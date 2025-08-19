/**
 * Claude Code Integration Service
 * Provides API wrapper for Claude Code functionality within the containerized environment
 */
import { EventEmitter } from 'events';
export interface ClaudeAgent {
    id: string;
    name: string;
    type: string;
    status: 'spawning' | 'active' | 'idle' | 'error' | 'terminated';
    capabilities: string[];
    performance: {
        tasksCompleted: number;
        averageResponseTime: number;
        successRate: number;
        tokensUsed: number;
    };
    health: {
        cpuUsage: number;
        memoryUsage: number;
        lastHeartbeat: Date;
    };
    createdAt: Date;
    lastUsed?: Date;
}
export interface ClaudeSession {
    id: string;
    userId: string;
    status: 'initializing' | 'active' | 'paused' | 'completed' | 'failed';
    agents: ClaudeAgent[];
    configuration: {
        topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
        maxAgents: number;
        strategy: string;
        persistence: boolean;
    };
    metrics: {
        totalAgents: number;
        activeTasks: number;
        completedTasks: number;
        totalTokensUsed: number;
        sessionDuration: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface ClaudeTask {
    id: string;
    sessionId: string;
    agentId?: string;
    type: string;
    description: string;
    status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    input: any;
    output?: any;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}
export interface ClaudeServerConfig {
    port: number;
    host: string;
    configPath: string;
    sessionDirectory: string;
    memoryDirectory: string;
    maxConcurrentAgents: number;
    sessionTimeout: number;
    enableWebSocket: boolean;
}
/**
 * Claude Code Integration Service
 * Manages Claude Code server, agents, and sessions
 */
export declare class ClaudeIntegrationService extends EventEmitter {
    private serverProcess;
    private sessions;
    private agents;
    private tasks;
    private config;
    private isServerRunning;
    private heartbeatInterval;
    constructor(config: ClaudeServerConfig);
    /**
     * Initialize the Claude Code service
     */
    initialize(): Promise<void>;
    /**
     * Verify Claude CLI is installed and accessible
     */
    private verifyClaudeCLI;
    /**
     * Verify Claude authentication
     */
    private verifyAuthentication;
    /**
     * Start Claude Code server
     */
    private startServer;
    /**
     * Setup required directories
     */
    private setupDirectories;
    /**
     * Create a new Claude session
     */
    createSession(userId: string, config?: Partial<ClaudeSession['configuration']>): Promise<ClaudeSession>;
    /**
     * Initialize swarm for session
     */
    private initializeSwarm;
    /**
     * Spawn a new agent
     */
    spawnAgent(sessionId: string, agentConfig: {
        type: string;
        name?: string;
        capabilities?: string[];
    }): Promise<ClaudeAgent>;
    /**
     * Perform actual agent spawning
     */
    private performAgentSpawn;
    /**
     * Get default capabilities for agent type
     */
    private getDefaultCapabilities;
    /**
     * Orchestrate a task across agents
     */
    orchestrateTask(sessionId: string, taskConfig: {
        type: string;
        description: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        agentTypes?: string[];
        input?: any;
    }): Promise<ClaudeTask>;
    /**
     * Find suitable agent or spawn one
     */
    private findOrSpawnAgent;
    /**
     * Execute a task with an agent
     */
    private executeTask;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): ClaudeSession | undefined;
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId: string): ClaudeSession[];
    /**
     * Get agent by ID
     */
    getAgent(agentId: string): ClaudeAgent | undefined;
    /**
     * Get all agents in a session
     */
    getSessionAgents(sessionId: string): ClaudeAgent[];
    /**
     * Get task by ID
     */
    getTask(taskId: string): ClaudeTask | undefined;
    /**
     * Get all tasks for a session
     */
    getSessionTasks(sessionId: string): ClaudeTask[];
    /**
     * Terminate a session
     */
    terminateSession(sessionId: string): Promise<void>;
    /**
     * Terminate an agent
     */
    terminateAgent(agentId: string): Promise<void>;
    /**
     * Start health monitoring
     */
    private startHealthMonitoring;
    /**
     * Perform health check on all agents
     */
    private performHealthCheck;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Shutdown the service
     */
    shutdown(): Promise<void>;
}
export declare const claudeIntegrationService: ClaudeIntegrationService;
//# sourceMappingURL=claude-integration.d.ts.map
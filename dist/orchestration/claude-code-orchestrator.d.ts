/**
 * Claude Code Orchestration System
 * Manages coordination between Claude Code agents and the main application
 */
import { EventEmitter } from 'events';
import { ClaudeSession, ClaudeAgent, ClaudeTask } from '@/services/claude-integration';
export interface OrchestrationConfig {
    maxConcurrentSessions: number;
    defaultTopology: 'mesh' | 'hierarchical' | 'ring' | 'star';
    agentCoordinationStrategy: 'balanced' | 'specialized' | 'adaptive';
    enableAutoScaling: boolean;
    healthCheckInterval: number;
    taskTimeoutMs: number;
}
export interface WorkflowDefinition {
    id: string;
    name: string;
    description: string;
    phases: WorkflowPhase[];
    agents: string[];
    parallel: boolean;
    timeout: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
}
export interface WorkflowPhase {
    name: string;
    agents: string[];
    duration: number;
    dependencies?: string[];
    parallel?: boolean;
}
export interface OrchestrationMetrics {
    activeSessions: number;
    totalAgents: number;
    activeAgents: number;
    completedTasks: number;
    failedTasks: number;
    averageResponseTime: number;
    systemLoad: number;
    memoryUsage: number;
}
/**
 * Claude Code Orchestrator
 * Main coordination system for all Claude Code operations
 */
export declare class ClaudeCodeOrchestrator extends EventEmitter {
    private sessions;
    private workflows;
    private agentConfigs;
    private metrics;
    private config;
    private healthCheckInterval;
    private isInitialized;
    constructor(config?: Partial<OrchestrationConfig>);
    /**
     * Initialize the orchestration system
     */
    initialize(): Promise<void>;
    /**
     * Load agent configurations from config file
     */
    private loadAgentConfigurations;
    /**
     * Load workflow definitions
     */
    private loadWorkflowDefinitions;
    /**
     * Create a new orchestrated session
     */
    createSession(userId: string, options?: {
        topology?: 'mesh' | 'hierarchical' | 'ring' | 'star';
        maxAgents?: number;
        autoSpawnAgents?: string[];
        workflow?: string;
    }): Promise<ClaudeSession>;
    /**
     * Spawn initial agents for a session
     */
    private spawnInitialAgents;
    /**
     * Spawn a specific agent
     */
    spawnAgent(sessionId: string, agentType: string, customConfig?: any): Promise<ClaudeAgent>;
    /**
     * Orchestrate a task with automatic agent selection
     */
    orchestrateTask(sessionId: string, taskConfig: {
        type: string;
        description: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        input?: any;
        preferredAgents?: string[];
        timeout?: number;
    }): Promise<ClaudeTask>;
    /**
     * Determine optimal agents for a task type
     */
    private determineOptimalAgents;
    /**
     * Ensure required agents are available in session
     */
    private ensureAgentsAvailable;
    /**
     * Execute a predefined workflow
     */
    executeWorkflow(sessionId: string, workflowId: string): Promise<void>;
    /**
     * Execute workflow phases in parallel
     */
    private executeWorkflowParallel;
    /**
     * Execute workflow phases sequentially
     */
    private executeWorkflowSequential;
    /**
     * Execute a single workflow phase
     */
    private executeWorkflowPhase;
    /**
     * Get orchestration metrics
     */
    getMetrics(): OrchestrationMetrics;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): ClaudeSession | undefined;
    /**
     * Get all sessions for a user
     */
    getUserSessions(userId: string): ClaudeSession[];
    /**
     * Terminate a session
     */
    terminateSession(sessionId: string): Promise<void>;
    /**
     * Update task metrics
     */
    private updateTaskMetrics;
    /**
     * Start health monitoring
     */
    private startHealthMonitoring;
    /**
     * Perform system health check
     */
    private performHealthCheck;
    /**
     * Setup event handlers
     */
    private setupEventHandlers;
    /**
     * Shutdown the orchestrator
     */
    shutdown(): Promise<void>;
}
export declare const claudeCodeOrchestrator: ClaudeCodeOrchestrator;
//# sourceMappingURL=claude-code-orchestrator.d.ts.map
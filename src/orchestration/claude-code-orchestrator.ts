/**
 * Claude Code Orchestration System
 * Manages coordination between Claude Code agents and the main application
 */

import { EventEmitter } from 'events';
import { claudeIntegrationService, ClaudeSession, ClaudeAgent, ClaudeTask } from '@/services/claude-integration';
import { logger } from '@/utils/logger';
import fs from 'fs/promises';
import path from 'path';

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
export class ClaudeCodeOrchestrator extends EventEmitter {
  private sessions: Map<string, ClaudeSession> = new Map();
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private agentConfigs: Map<string, any> = new Map();
  private metrics: OrchestrationMetrics;
  private config: OrchestrationConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<OrchestrationConfig> = {}) {
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
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Claude Code Orchestrator');

      // Initialize Claude integration service
      await claudeIntegrationService.initialize();

      // Load agent configurations
      await this.loadAgentConfigurations();

      // Load workflow definitions
      await this.loadWorkflowDefinitions();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info('Claude Code Orchestrator initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Claude Code Orchestrator:', error);
      throw error;
    }
  }

  /**
   * Load agent configurations from config file
   */
  private async loadAgentConfigurations(): Promise<void> {
    try {
      const configPath = '/workspaces/agent-feed/config/agents-config.json';
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      // Load individual agent configurations
      for (const [agentType, agentConfig] of Object.entries(config.agents)) {
        this.agentConfigs.set(agentType, agentConfig);
      }

      logger.info(`Loaded ${this.agentConfigs.size} agent configurations`);
    } catch (error) {
      logger.error('Failed to load agent configurations:', error);
      throw error;
    }
  }

  /**
   * Load workflow definitions
   */
  private async loadWorkflowDefinitions(): Promise<void> {
    try {
      const configPath = '/workspaces/agent-feed/config/agents-config.json';
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);

      // Load workflow definitions
      if (config.workflows) {
        for (const [workflowId, workflowConfig] of Object.entries(config.workflows)) {
          const workflow: WorkflowDefinition = {
            id: workflowId,
            name: (workflowConfig as any).name,
            description: (workflowConfig as any).description,
            phases: (workflowConfig as any).phases || [],
            agents: (workflowConfig as any).agents || [],
            parallel: (workflowConfig as any).parallel || false,
            timeout: (workflowConfig as any).duration || 300,
            priority: (workflowConfig as any).priority || 'medium'
          };
          
          this.workflows.set(workflowId, workflow);
        }
      }

      logger.info(`Loaded ${this.workflows.size} workflow definitions`);
    } catch (error) {
      logger.warn('Failed to load workflow definitions:', error);
      // Continue without workflows - they're optional
    }
  }

  /**
   * Create a new orchestrated session
   */
  async createSession(
    userId: string, 
    options: {
      topology?: 'mesh' | 'hierarchical' | 'ring' | 'star';
      maxAgents?: number;
      autoSpawnAgents?: string[];
      workflow?: string;
    } = {}
  ): Promise<ClaudeSession> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized');
    }

    if (this.sessions.size >= this.config.maxConcurrentSessions) {
      throw new Error('Maximum concurrent sessions reached');
    }

    try {
      // Create Claude session
      const session = await claudeIntegrationService.createSession(userId, {
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

      logger.info(`Created orchestrated session: ${session.id}`);
      this.emit('session:created', session);
      
      return session;
    } catch (error) {
      logger.error('Failed to create orchestrated session:', error);
      throw error;
    }
  }

  /**
   * Spawn initial agents for a session
   */
  private async spawnInitialAgents(sessionId: string, agentTypes: string[]): Promise<void> {
    const spawnPromises = agentTypes.map(async (agentType) => {
      try {
        const agentConfig = this.agentConfigs.get(agentType);
        if (!agentConfig) {
          logger.warn(`Agent configuration not found for type: ${agentType}`);
          return;
        }

        await this.spawnAgent(sessionId, agentType);
        logger.info(`Auto-spawned agent: ${agentType} for session ${sessionId}`);
      } catch (error) {
        logger.error(`Failed to auto-spawn agent ${agentType}:`, error);
      }
    });

    await Promise.allSettled(spawnPromises);
  }

  /**
   * Spawn a specific agent
   */
  async spawnAgent(sessionId: string, agentType: string, customConfig?: any): Promise<ClaudeAgent> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const agentConfig = this.agentConfigs.get(agentType);
    if (!agentConfig) {
      throw new Error(`Agent configuration not found for type: ${agentType}`);
    }

    try {
      const agent = await claudeIntegrationService.spawnAgent(sessionId, {
        type: agentType,
        name: customConfig?.name || agentConfig.display_name,
        capabilities: customConfig?.capabilities || agentConfig.capabilities
      });

      this.metrics.totalAgents++;
      this.metrics.activeAgents++;

      logger.info(`Spawned agent: ${agent.id} (${agentType})`);
      this.emit('agent:spawned', agent);
      
      return agent;
    } catch (error) {
      logger.error(`Failed to spawn agent ${agentType}:`, error);
      throw error;
    }
  }

  /**
   * Orchestrate a task with automatic agent selection
   */
  async orchestrateTask(
    sessionId: string,
    taskConfig: {
      type: string;
      description: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      input?: any;
      preferredAgents?: string[];
      timeout?: number;
    }
  ): Promise<ClaudeTask> {
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
      const task = await claudeIntegrationService.orchestrateTask(sessionId, {
        type: taskConfig.type,
        description: taskConfig.description,
        priority: taskConfig.priority,
        agentTypes: optimalAgents,
        input: taskConfig.input
      });

      this.updateTaskMetrics(task);

      logger.info(`Orchestrated task: ${task.id} (${taskConfig.type})`);
      this.emit('task:orchestrated', task);
      
      return task;
    } catch (error) {
      this.metrics.failedTasks++;
      logger.error('Failed to orchestrate task:', error);
      throw error;
    }
  }

  /**
   * Determine optimal agents for a task type
   */
  private determineOptimalAgents(taskType: string, preferredAgents?: string[]): string[] {
    if (preferredAgents && preferredAgents.length > 0) {
      return preferredAgents;
    }

    // Agent type mapping for different task types
    const taskAgentMap: Record<string, string[]> = {
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
  private async ensureAgentsAvailable(sessionId: string, requiredAgents: string[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const existingAgentTypes = session.agents.map(agent => agent.type);
    const missingAgents = requiredAgents.filter(type => !existingAgentTypes.includes(type));

    if (missingAgents.length > 0 && this.config.enableAutoScaling) {
      logger.info(`Auto-scaling: spawning missing agents for session ${sessionId}:`, missingAgents);
      
      const spawnPromises = missingAgents.map(agentType => 
        this.spawnAgent(sessionId, agentType).catch(error => {
          logger.warn(`Failed to auto-spawn agent ${agentType}:`, error);
        })
      );

      await Promise.allSettled(spawnPromises);
    }
  }

  /**
   * Execute a predefined workflow
   */
  async executeWorkflow(sessionId: string, workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      logger.info(`Executing workflow: ${workflowId} for session ${sessionId}`);

      // Ensure all required agents are available
      await this.ensureAgentsAvailable(sessionId, workflow.agents);

      if (workflow.parallel) {
        // Execute all phases in parallel
        await this.executeWorkflowParallel(sessionId, workflow);
      } else {
        // Execute phases sequentially
        await this.executeWorkflowSequential(sessionId, workflow);
      }

      logger.info(`Completed workflow: ${workflowId} for session ${sessionId}`);
      this.emit('workflow:completed', { sessionId, workflowId });
    } catch (error) {
      logger.error(`Failed to execute workflow ${workflowId}:`, error);
      this.emit('workflow:failed', { sessionId, workflowId, error });
      throw error;
    }
  }

  /**
   * Execute workflow phases in parallel
   */
  private async executeWorkflowParallel(sessionId: string, workflow: WorkflowDefinition): Promise<void> {
    const phasePromises = workflow.phases.map(async (phase) => {
      try {
        await this.executeWorkflowPhase(sessionId, phase);
      } catch (error) {
        logger.error(`Failed to execute workflow phase ${phase.name}:`, error);
        throw error;
      }
    });

    await Promise.all(phasePromises);
  }

  /**
   * Execute workflow phases sequentially
   */
  private async executeWorkflowSequential(sessionId: string, workflow: WorkflowDefinition): Promise<void> {
    for (const phase of workflow.phases) {
      try {
        await this.executeWorkflowPhase(sessionId, phase);
      } catch (error) {
        logger.error(`Failed to execute workflow phase ${phase.name}:`, error);
        throw error;
      }
    }
  }

  /**
   * Execute a single workflow phase
   */
  private async executeWorkflowPhase(sessionId: string, phase: WorkflowPhase): Promise<void> {
    logger.info(`Executing workflow phase: ${phase.name} for session ${sessionId}`);

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
        const currentTask = claudeIntegrationService.getTask(task.id);
        if (currentTask) {
          if (currentTask.status === 'completed') {
            resolve();
          } else if (currentTask.status === 'failed' || currentTask.status === 'cancelled') {
            reject(new Error(`Phase ${phase.name} failed: ${currentTask.error}`));
          } else {
            setTimeout(checkTask, 1000);
          }
        } else {
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
  getMetrics(): OrchestrationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ClaudeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): ClaudeSession[] {
    return Array.from(this.sessions.values()).filter(session => session.userId === userId);
  }

  /**
   * Terminate a session
   */
  async terminateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      await claudeIntegrationService.terminateSession(sessionId);
      this.sessions.delete(sessionId);
      this.metrics.activeSessions--;
      
      logger.info(`Terminated orchestrated session: ${sessionId}`);
      this.emit('session:terminated', session);
    } catch (error) {
      logger.error(`Failed to terminate session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Update task metrics
   */
  private updateTaskMetrics(task: ClaudeTask): void {
    if (task.status === 'completed') {
      this.metrics.completedTasks++;
      
      if (task.startedAt && task.completedAt) {
        const responseTime = task.completedAt.getTime() - task.startedAt.getTime();
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime + responseTime) / 2;
      }
    } else if (task.status === 'failed') {
      this.metrics.failedTasks++;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform system health check
   */
  private performHealthCheck(): void {
    // Update active agents count
    this.metrics.activeAgents = Array.from(this.sessions.values())
      .reduce((count, session) => count + session.agents.filter(agent => 
        agent.status === 'active' || agent.status === 'idle'
      ).length, 0);

    // Calculate system load
    this.metrics.systemLoad = this.metrics.activeSessions / this.config.maxConcurrentSessions;

    // Emit health status
    this.emit('health:check', this.metrics);

    // Log health metrics periodically
    if (Date.now() % (5 * 60 * 1000) < this.config.healthCheckInterval) {
      logger.info('Orchestrator health metrics:', this.metrics);
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    claudeIntegrationService.on('session:created', (session) => {
      this.emit('session:created', session);
    });

    claudeIntegrationService.on('agent:spawned', (agent) => {
      this.emit('agent:spawned', agent);
    });

    claudeIntegrationService.on('task:completed', (task) => {
      this.updateTaskMetrics(task);
      this.emit('task:completed', task);
    });

    claudeIntegrationService.on('task:failed', (task) => {
      this.updateTaskMetrics(task);
      this.emit('task:failed', task);
    });
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Claude Code Orchestrator');

    // Clear health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Terminate all active sessions
    const terminationPromises = Array.from(this.sessions.keys()).map(sessionId =>
      this.terminateSession(sessionId).catch(error => 
        logger.warn(`Failed to terminate session ${sessionId}:`, error)
      )
    );

    await Promise.allSettled(terminationPromises);

    // Shutdown Claude integration service
    await claudeIntegrationService.shutdown();

    this.isInitialized = false;
    this.emit('shutdown');
    logger.info('Claude Code Orchestrator shutdown complete');
  }
}

// Create and export orchestrator instance
export const claudeCodeOrchestrator = new ClaudeCodeOrchestrator({
  maxConcurrentSessions: parseInt(process.env.CLAUDE_MAX_SESSIONS || '10'),
  defaultTopology: (process.env.CLAUDE_DEFAULT_TOPOLOGY as any) || 'mesh',
  agentCoordinationStrategy: (process.env.CLAUDE_COORDINATION_STRATEGY as any) || 'adaptive',
  enableAutoScaling: process.env.CLAUDE_AUTO_SCALING !== 'false',
  healthCheckInterval: parseInt(process.env.CLAUDE_HEALTH_CHECK_INTERVAL || '30000'),
  taskTimeoutMs: parseInt(process.env.CLAUDE_TASK_TIMEOUT || '300000')
});
/**
 * Claude Code Integration Service
 * Provides API wrapper for Claude Code functionality within the containerized environment
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/utils/logger';

// Types for Claude Code integration
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
export class ClaudeIntegrationService extends EventEmitter {
  private serverProcess: ChildProcess | null = null;
  private sessions: Map<string, ClaudeSession> = new Map();
  private agents: Map<string, ClaudeAgent> = new Map();
  private tasks: Map<string, ClaudeTask> = new Map();
  private config: ClaudeServerConfig;
  private isServerRunning = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: ClaudeServerConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
  }

  /**
   * Initialize the Claude Code service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Claude Code integration service');

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

      logger.info('Claude Code integration service initialized successfully');
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Claude Code service:', error);
      throw error;
    }
  }

  /**
   * Verify Claude CLI is installed and accessible
   */
  private async verifyClaudeCLI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const claudeCheck = spawn('claude', ['--version'], {
        stdio: 'pipe',
        timeout: 5000
      });

      claudeCheck.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
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
  private async verifyAuthentication(): Promise<void> {
    return new Promise((resolve, reject) => {
      const authCheck = spawn('claude', ['auth', 'status'], {
        stdio: 'pipe',
        timeout: 5000
      });

      authCheck.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
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
  private async startServer(): Promise<void> {
    if (this.isServerRunning) {
      logger.warn('Claude Code server already running');
      return;
    }

    return new Promise((resolve, reject) => {
      logger.info(`Starting Claude Code server on ${this.config.host}:${this.config.port}`);

      this.serverProcess = spawn('claude', [
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
        logger.debug('Claude server stdout:', output);
        
        if (output.includes('Server started') || output.includes('listening')) {
          this.isServerRunning = true;
          this.emit('server:started');
          resolve();
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        logger.warn('Claude server stderr:', error);
        
        if (error.includes('Error') || error.includes('Failed')) {
          this.emit('server:error', error);
        }
      });

      // Handle server exit
      this.serverProcess.on('close', (code) => {
        this.isServerRunning = false;
        this.serverProcess = null;
        logger.info(`Claude server exited with code ${code}`);
        this.emit('server:stopped', code);
      });

      this.serverProcess.on('error', (error) => {
        this.isServerRunning = false;
        logger.error('Claude server error:', error);
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
  private async setupDirectories(): Promise<void> {
    const directories = [
      this.config.sessionDirectory,
      this.config.memoryDirectory,
      path.join(this.config.memoryDirectory, 'sessions'),
      path.join(this.config.memoryDirectory, 'agents'),
      '/workspaces/agent-feed/logs'
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.debug(`Created directory: ${dir}`);
      } catch (error) {
        logger.warn(`Failed to create directory ${dir}:`, error);
      }
    }
  }

  /**
   * Create a new Claude session
   */
  async createSession(userId: string, config: Partial<ClaudeSession['configuration']> = {}): Promise<ClaudeSession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session: ClaudeSession = {
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
      
      logger.info(`Created Claude session: ${sessionId}`);
      this.emit('session:created', session);
      
      return session;
    } catch (error) {
      session.status = 'failed';
      logger.error(`Failed to create session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize swarm for session
   */
  private async initializeSwarm(session: ClaudeSession): Promise<void> {
    // Use MCP tools to initialize swarm
    const swarmConfig = {
      topology: session.configuration.topology,
      maxAgents: session.configuration.maxAgents,
      strategy: session.configuration.strategy
    };

    // This would integrate with MCP tools
    logger.info(`Initializing swarm for session ${session.id}`, swarmConfig);
    
    // Placeholder for actual MCP integration
    // In real implementation, this would call MCP tools:
    // await this.mcp.swarm_init(swarmConfig);
  }

  /**
   * Spawn a new agent
   */
  async spawnAgent(sessionId: string, agentConfig: {
    type: string;
    name?: string;
    capabilities?: string[];
  }): Promise<ClaudeAgent> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.agents.length >= session.configuration.maxAgents) {
      throw new Error(`Maximum agents reached for session: ${sessionId}`);
    }

    const agentId = `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const agent: ClaudeAgent = {
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
      logger.info(`Spawned agent: ${agentId} (${agentConfig.type})`);
      this.emit('agent:spawned', agent);
      
      return agent;
    } catch (error) {
      agent.status = 'error';
      logger.error(`Failed to spawn agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Perform actual agent spawning
   */
  private async performAgentSpawn(agent: ClaudeAgent): Promise<void> {
    // This would integrate with MCP tools for actual agent spawning
    logger.info(`Spawning agent ${agent.id} of type ${agent.type}`);
    
    // Placeholder for actual MCP integration
    // In real implementation, this would call MCP tools:
    // await this.mcp.agent_spawn({ type: agent.type, name: agent.name, capabilities: agent.capabilities });
  }

  /**
   * Get default capabilities for agent type
   */
  private getDefaultCapabilities(type: string): string[] {
    const capabilityMap: Record<string, string[]> = {
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
  async orchestrateTask(sessionId: string, taskConfig: {
    type: string;
    description: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    agentTypes?: string[];
    input?: any;
  }): Promise<ClaudeTask> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const task: ClaudeTask = {
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

      logger.info(`Orchestrated task: ${taskId}`);
      this.emit('task:created', task);
      
      return task;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to orchestrate task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Find suitable agent or spawn one
   */
  private async findOrSpawnAgent(session: ClaudeSession, preferredTypes?: string[]): Promise<ClaudeAgent | null> {
    // First, try to find an existing idle agent
    const availableAgent = session.agents.find(agent => 
      agent.status === 'idle' || agent.status === 'active'
    );

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
  private async executeTask(task: ClaudeTask, agent: ClaudeAgent): Promise<void> {
    task.status = 'running';
    agent.lastUsed = new Date();

    try {
      // This would integrate with actual Claude Code execution
      logger.info(`Executing task ${task.id} with agent ${agent.id}`);
      
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
    } catch (error) {
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
   * Get agent by ID
   */
  getAgent(agentId: string): ClaudeAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents in a session
   */
  getSessionAgents(sessionId: string): ClaudeAgent[] {
    const session = this.sessions.get(sessionId);
    return session ? session.agents : [];
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): ClaudeTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks for a session
   */
  getSessionTasks(sessionId: string): ClaudeTask[] {
    return Array.from(this.tasks.values()).filter(task => task.sessionId === sessionId);
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
      // Terminate all agents in the session
      for (const agent of session.agents) {
        await this.terminateAgent(agent.id);
      }

      session.status = 'completed';
      session.updatedAt = new Date();

      logger.info(`Terminated session: ${sessionId}`);
      this.emit('session:terminated', session);
    } catch (error) {
      session.status = 'failed';
      logger.error(`Failed to terminate session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Terminate an agent
   */
  async terminateAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.status = 'terminated';
    
    logger.info(`Terminated agent: ${agentId}`);
    this.emit('agent:terminated', agent);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * Perform health check on all agents
   */
  private performHealthCheck(): void {
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
  private setupEventHandlers(): void {
    this.on('server:error', (error) => {
      logger.error('Claude server error:', error);
    });

    this.on('agent:spawned', (agent) => {
      logger.info(`Agent spawned: ${agent.id} (${agent.type})`);
    });

    this.on('task:completed', (task) => {
      logger.info(`Task completed: ${task.id}`);
    });
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down Claude Code integration service');

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
    logger.info('Claude Code integration service shutdown complete');
  }
}

// Create and export service instance
export const claudeIntegrationService = new ClaudeIntegrationService({
  port: parseInt(process.env.CLAUDE_SERVER_PORT || '8080'),
  host: process.env.CLAUDE_SERVER_HOST || '0.0.0.0',
  configPath: process.env.CLAUDE_CONFIG_DIR + '/config.json' || '/home/codespace/.claude/config.json',
  sessionDirectory: process.env.CLAUDE_SESSION_DIR || '/tmp/claude-sessions',
  memoryDirectory: process.env.CLAUDE_MEMORY_DIR || '/workspaces/agent-feed/memory',
  maxConcurrentAgents: parseInt(process.env.CLAUDE_MAX_AGENTS || '17'),
  sessionTimeout: parseInt(process.env.CLAUDE_SESSION_TIMEOUT || '3600'),
  enableWebSocket: process.env.CLAUDE_WEBSOCKET_ENABLED === 'true'
});
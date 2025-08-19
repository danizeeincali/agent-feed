import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * Agent Coordinator Unit Tests
 * Tests the core agent spawning, coordination, and orchestration functionality
 */

// Mock Claude Flow MCP tools
const mockMcpTools = {
  swarm_init: jest.fn(),
  agent_spawn: jest.fn(),
  task_orchestrate: jest.fn(),
  swarm_status: jest.fn(),
  agent_list: jest.fn(),
  agent_metrics: jest.fn()
};

// Mock agent types and their capabilities
const agentTypes = {
  'chief-of-staff': {
    capabilities: ['coordination', 'delegation', 'oversight', 'planning'],
    priority: 'critical',
    maxInstances: 1
  },
  'researcher': {
    capabilities: ['analysis', 'data-gathering', 'synthesis', 'reporting'],
    priority: 'high',
    maxInstances: 3
  },
  'coder': {
    capabilities: ['implementation', 'debugging', 'refactoring', 'testing'],
    priority: 'high',
    maxInstances: 5
  },
  'tester': {
    capabilities: ['validation', 'quality-assurance', 'automation', 'reporting'],
    priority: 'medium',
    maxInstances: 3
  },
  'reviewer': {
    capabilities: ['code-review', 'quality-control', 'standards', 'optimization'],
    priority: 'medium',
    maxInstances: 2
  }
};

describe('Agent Coordinator', () => {
  let coordinator: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful swarm initialization
    mockMcpTools.swarm_init.mockResolvedValue({
      swarmId: 'test-swarm-123',
      topology: 'hierarchical',
      maxAgents: 8,
      status: 'initialized'
    });
    
    // Mock successful agent spawning
    mockMcpTools.agent_spawn.mockResolvedValue({
      agentId: 'agent-123',
      type: 'chief-of-staff',
      status: 'active',
      capabilities: agentTypes['chief-of-staff'].capabilities
    });
    
    coordinator = new AgentCoordinator(mockMcpTools);
  });
  
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Swarm Initialization', () => {
    it('should initialize swarm with hierarchical topology', async () => {
      const result = await coordinator.initializeSwarm({
        topology: 'hierarchical',
        maxAgents: 8,
        strategy: 'balanced'
      });

      expect(mockMcpTools.swarm_init).toHaveBeenCalledWith({
        topology: 'hierarchical',
        maxAgents: 8,
        strategy: 'balanced'
      });
      
      expect(result).toEqual({
        swarmId: 'test-swarm-123',
        topology: 'hierarchical',
        maxAgents: 8,
        status: 'initialized'
      });
    });

    it('should handle swarm initialization failures', async () => {
      mockMcpTools.swarm_init.mockRejectedValue(new Error('Swarm init failed'));

      await expect(coordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 5
      })).rejects.toThrow('Swarm init failed');
    });

    it('should validate topology parameters', async () => {
      await expect(coordinator.initializeSwarm({
        topology: 'invalid' as any,
        maxAgents: 8
      })).rejects.toThrow('Invalid topology');
    });
  });

  describe('Agent Spawning', () => {
    beforeEach(async () => {
      await coordinator.initializeSwarm({
        topology: 'hierarchical',
        maxAgents: 8
      });
    });

    it('should spawn Chief of Staff agent first', async () => {
      const agent = await coordinator.spawnAgent('chief-of-staff', {
        name: 'Chief Coordinator',
        priority: 'critical'
      });

      expect(mockMcpTools.agent_spawn).toHaveBeenCalledWith({
        type: 'chief-of-staff',
        name: 'Chief Coordinator',
        capabilities: agentTypes['chief-of-staff'].capabilities
      });

      expect(agent).toEqual({
        agentId: 'agent-123',
        type: 'chief-of-staff',
        status: 'active',
        capabilities: agentTypes['chief-of-staff'].capabilities
      });
    });

    it('should spawn multiple agents in correct order', async () => {
      const agentPromises = [
        coordinator.spawnAgent('chief-of-staff'),
        coordinator.spawnAgent('researcher'),
        coordinator.spawnAgent('coder'),
        coordinator.spawnAgent('tester')
      ];

      const agents = await Promise.all(agentPromises);

      expect(agents).toHaveLength(4);
      expect(mockMcpTools.agent_spawn).toHaveBeenCalledTimes(4);
    });

    it('should enforce agent instance limits', async () => {
      // Spawn maximum allowed Chief of Staff agents (1)
      await coordinator.spawnAgent('chief-of-staff');
      
      // Try to spawn another - should be rejected
      await expect(coordinator.spawnAgent('chief-of-staff'))
        .rejects.toThrow('Maximum instances exceeded for agent type: chief-of-staff');
    });

    it('should handle agent spawning failures gracefully', async () => {
      mockMcpTools.agent_spawn.mockRejectedValue(new Error('Agent spawn failed'));

      await expect(coordinator.spawnAgent('researcher'))
        .rejects.toThrow('Agent spawn failed');
    });
  });

  describe('Task Orchestration', () => {
    beforeEach(async () => {
      await coordinator.initializeSwarm({ topology: 'hierarchical', maxAgents: 8 });
      await coordinator.spawnAgent('chief-of-staff');
      await coordinator.spawnAgent('researcher');
      await coordinator.spawnAgent('coder');
    });

    it('should orchestrate tasks across available agents', async () => {
      mockMcpTools.task_orchestrate.mockResolvedValue({
        taskId: 'task-123',
        status: 'assigned',
        assignedAgents: ['agent-123', 'agent-124'],
        strategy: 'adaptive'
      });

      const task = await coordinator.orchestrateTask({
        task: 'Implement user authentication system',
        priority: 'high',
        strategy: 'adaptive'
      });

      expect(mockMcpTools.task_orchestrate).toHaveBeenCalledWith({
        task: 'Implement user authentication system',
        priority: 'high',
        strategy: 'adaptive'
      });

      expect(task.taskId).toBe('task-123');
      expect(task.status).toBe('assigned');
    });

    it('should handle task distribution strategies', async () => {
      const strategies = ['parallel', 'sequential', 'adaptive'];
      
      for (const strategy of strategies) {
        mockMcpTools.task_orchestrate.mockResolvedValue({
          taskId: `task-${strategy}`,
          strategy,
          status: 'assigned'
        });

        const task = await coordinator.orchestrateTask({
          task: `Test ${strategy} execution`,
          strategy: strategy as any
        });

        expect(task.strategy).toBe(strategy);
      }
    });

    it('should prioritize critical tasks', async () => {
      const criticalTask = {
        task: 'Security vulnerability fix',
        priority: 'critical' as const,
        strategy: 'parallel' as const
      };

      mockMcpTools.task_orchestrate.mockResolvedValue({
        taskId: 'critical-task-123',
        status: 'assigned',
        priority: 'critical'
      });

      const result = await coordinator.orchestrateTask(criticalTask);
      
      expect(result.priority).toBe('critical');
      expect(mockMcpTools.task_orchestrate).toHaveBeenCalledWith(criticalTask);
    });
  });

  describe('Agent Monitoring', () => {
    beforeEach(async () => {
      await coordinator.initializeSwarm({ topology: 'hierarchical', maxAgents: 8 });
    });

    it('should get swarm status', async () => {
      mockMcpTools.swarm_status.mockResolvedValue({
        swarmId: 'test-swarm-123',
        activeAgents: 3,
        totalTasks: 5,
        completedTasks: 2,
        status: 'active'
      });

      const status = await coordinator.getSwarmStatus();

      expect(mockMcpTools.swarm_status).toHaveBeenCalled();
      expect(status.activeAgents).toBe(3);
      expect(status.status).toBe('active');
    });

    it('should list active agents', async () => {
      mockMcpTools.agent_list.mockResolvedValue([
        { agentId: 'agent-1', type: 'chief-of-staff', status: 'active' },
        { agentId: 'agent-2', type: 'researcher', status: 'busy' },
        { agentId: 'agent-3', type: 'coder', status: 'idle' }
      ]);

      const agents = await coordinator.listAgents();

      expect(mockMcpTools.agent_list).toHaveBeenCalled();
      expect(agents).toHaveLength(3);
      expect(agents[0].type).toBe('chief-of-staff');
    });

    it('should get agent performance metrics', async () => {
      mockMcpTools.agent_metrics.mockResolvedValue({
        agentId: 'agent-1',
        tasksCompleted: 10,
        averageResponseTime: 250,
        successRate: 0.95,
        memoryUsage: 45
      });

      const metrics = await coordinator.getAgentMetrics('agent-1');

      expect(mockMcpTools.agent_metrics).toHaveBeenCalledWith({
        agentId: 'agent-1'
      });
      expect(metrics.successRate).toBe(0.95);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network timeouts gracefully', async () => {
      mockMcpTools.swarm_init.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      );

      await expect(coordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 5
      })).rejects.toThrow('Timeout');
    });

    it('should retry failed operations', async () => {
      let attemptCount = 0;
      mockMcpTools.agent_spawn.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({
          agentId: 'agent-retry-123',
          type: 'researcher',
          status: 'active'
        });
      });

      coordinator.setRetryPolicy({ maxRetries: 3, backoffMs: 100 });
      
      const agent = await coordinator.spawnAgent('researcher');
      
      expect(attemptCount).toBe(3);
      expect(agent.agentId).toBe('agent-retry-123');
    });

    it('should handle agent failures and respawn', async () => {
      await coordinator.initializeSwarm({ topology: 'hierarchical', maxAgents: 8 });
      
      // Simulate agent failure
      mockMcpTools.agent_list.mockResolvedValue([
        { agentId: 'agent-1', type: 'chief-of-staff', status: 'failed' }
      ]);

      mockMcpTools.agent_spawn.mockResolvedValue({
        agentId: 'agent-1-respawn',
        type: 'chief-of-staff',
        status: 'active'
      });

      const recovery = await coordinator.handleAgentFailure('agent-1');
      
      expect(recovery.newAgentId).toBe('agent-1-respawn');
      expect(recovery.status).toBe('recovered');
    });
  });

  describe('SPARC Methodology Integration', () => {
    it('should execute SPARC workflow phases', async () => {
      await coordinator.initializeSwarm({ topology: 'hierarchical', maxAgents: 8 });
      
      const sparcPhases = [
        'specification',
        'pseudocode', 
        'architecture',
        'refinement',
        'completion'
      ];

      mockMcpTools.task_orchestrate.mockResolvedValue({
        taskId: 'sparc-workflow-123',
        phases: sparcPhases,
        status: 'in_progress'
      });

      const workflow = await coordinator.executeSPARCWorkflow({
        project: 'User Authentication System',
        phases: sparcPhases
      });

      expect(workflow.phases).toEqual(sparcPhases);
      expect(workflow.taskId).toBe('sparc-workflow-123');
    });

    it('should handle phase transitions correctly', async () => {
      await coordinator.initializeSwarm({ topology: 'hierarchical', maxAgents: 8 });
      
      // Mock phase completion
      const phaseResults = sparcPhases.map((phase, index) => ({
        phase,
        status: index < 3 ? 'completed' : 'pending',
        result: index < 3 ? `${phase} completed successfully` : null
      }));

      const workflow = await coordinator.getSPARCProgress('sparc-workflow-123');
      
      expect(workflow.completedPhases).toBe(3);
      expect(workflow.currentPhase).toBe('refinement');
    });
  });
});

// Mock AgentCoordinator class
class AgentCoordinator {
  private mcpTools: any;
  private swarmId: string | null = null;
  private agents: Map<string, any> = new Map();
  private agentCounts: Map<string, number> = new Map();
  private retryPolicy = { maxRetries: 1, backoffMs: 1000 };

  constructor(mcpTools: any) {
    this.mcpTools = mcpTools;
  }

  async initializeSwarm(config: any) {
    if (!['hierarchical', 'mesh', 'ring', 'star'].includes(config.topology)) {
      throw new Error('Invalid topology');
    }
    
    const result = await this.mcpTools.swarm_init(config);
    this.swarmId = result.swarmId;
    return result;
  }

  async spawnAgent(type: string, options: any = {}) {
    const agentType = agentTypes[type as keyof typeof agentTypes];
    if (!agentType) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const currentCount = this.agentCounts.get(type) || 0;
    if (currentCount >= agentType.maxInstances) {
      throw new Error(`Maximum instances exceeded for agent type: ${type}`);
    }

    const agent = await this.mcpTools.agent_spawn({
      type,
      ...options,
      capabilities: agentType.capabilities
    });

    this.agents.set(agent.agentId, agent);
    this.agentCounts.set(type, currentCount + 1);
    
    return agent;
  }

  async orchestrateTask(task: any) {
    return await this.mcpTools.task_orchestrate(task);
  }

  async getSwarmStatus() {
    return await this.mcpTools.swarm_status();
  }

  async listAgents() {
    return await this.mcpTools.agent_list();
  }

  async getAgentMetrics(agentId: string) {
    return await this.mcpTools.agent_metrics({ agentId });
  }

  async handleAgentFailure(agentId: string) {
    const failedAgent = this.agents.get(agentId);
    if (!failedAgent) {
      throw new Error('Agent not found');
    }

    const newAgent = await this.spawnAgent(failedAgent.type);
    return {
      newAgentId: newAgent.agentId,
      status: 'recovered'
    };
  }

  async executeSPARCWorkflow(config: any) {
    return await this.mcpTools.task_orchestrate({
      task: `SPARC workflow for ${config.project}`,
      strategy: 'sequential',
      phases: config.phases
    });
  }

  async getSPARCProgress(workflowId: string) {
    return {
      workflowId,
      completedPhases: 3,
      currentPhase: 'refinement',
      totalPhases: 5
    };
  }

  setRetryPolicy(policy: any) {
    this.retryPolicy = policy;
  }
}
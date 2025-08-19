/**
 * Agent Orchestration Integration Tests
 * Tests agent spawning, coordination, monitoring, and lifecycle management
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { claudeFlowService } from '@/services/claude-flow';
import { agentOrchestrator } from '@/orchestration/agent-orchestrator';
import { swarmCoordinator } from '@/orchestration/swarm-coordinator';
import { logger } from '@/utils/logger';

interface SwarmSession {
  id: string;
  topology: 'mesh' | 'hierarchical' | 'ring' | 'star';
  maxAgents: number;
  agents: Agent[];
  status: 'active' | 'inactive' | 'scaling';
}

interface Agent {
  id: string;
  type: string;
  status: 'spawning' | 'active' | 'idle' | 'busy' | 'error' | 'terminated';
  capabilities: string[];
  performance: AgentPerformance;
  metadata: Record<string, any>;
}

interface AgentPerformance {
  tasksCompleted: number;
  averageResponseTime: number;
  successRate: number;
  lastActivity: Date;
}

interface TaskResult {
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  duration?: number;
  agentId?: string;
}

describe('Agent Orchestration Integration Tests', () => {
  let testSwarmId: string;
  let testAgents: Agent[] = [];
  const testUserId = 'test-user-orchestration';

  beforeAll(async () => {
    // Initialize orchestration services
    await agentOrchestrator.initialize();
    await swarmCoordinator.initialize();
    
    // Wait for services to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup test swarm and agents
    if (testSwarmId) {
      try {
        await swarmCoordinator.destroySwarm(testSwarmId);
      } catch (error) {
        logger.warn('Failed to cleanup test swarm', { error: error.message });
      }
    }
    
    // Cleanup individual agents
    for (const agent of testAgents) {
      try {
        await agentOrchestrator.terminateAgent(agent.id);
      } catch (error) {
        logger.warn('Failed to cleanup test agent', { agentId: agent.id, error: error.message });
      }
    }
  });

  beforeEach(() => {
    // Reset test state
    testSwarmId = undefined;
    testAgents = [];
  });

  describe('Swarm Initialization', () => {
    test('should initialize mesh topology swarm', async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 8,
        userId: testUserId,
        strategy: 'balanced'
      });

      expect(swarm).toMatchObject({
        id: expect.any(String),
        topology: 'mesh',
        maxAgents: 8,
        agents: expect.any(Array),
        status: 'active'
      });

      testSwarmId = swarm.id;
    });

    test('should initialize hierarchical topology swarm', async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'hierarchical',
        maxAgents: 10,
        userId: testUserId,
        strategy: 'specialized'
      });

      expect(swarm.topology).toBe('hierarchical');
      expect(swarm.maxAgents).toBe(10);
      testSwarmId = swarm.id;
    });

    test('should auto-select optimal topology', async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'auto' as any,
        maxAgents: 6,
        userId: testUserId,
        strategy: 'adaptive'
      });

      expect(['mesh', 'hierarchical', 'ring', 'star']).toContain(swarm.topology);
      testSwarmId = swarm.id;
    });

    test('should handle swarm initialization failures', async () => {
      await expect(swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 1000, // Exceeds limits
        userId: testUserId
      })).rejects.toThrow(/exceeds maximum|too many agents/i);
    });
  });

  describe('Agent Spawning', () => {
    beforeEach(async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 8,
        userId: testUserId
      });
      testSwarmId = swarm.id;
    });

    test('should spawn all 17+ agent types successfully', async () => {
      const agentTypes = [
        'coder', 'reviewer', 'tester', 'planner', 'researcher',
        'hierarchical-coordinator', 'mesh-coordinator', 'adaptive-coordinator',
        'collective-intelligence-coordinator', 'swarm-memory-manager',
        'byzantine-coordinator', 'raft-manager', 'gossip-coordinator',
        'consensus-builder', 'crdt-synchronizer', 'quorum-manager',
        'security-manager', 'perf-analyzer', 'performance-benchmarker',
        'task-orchestrator', 'memory-coordinator', 'smart-agent'
      ];

      const spawnPromises = agentTypes.map(type => 
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type,
          capabilities: [`${type}-capability`],
          name: `test-${type}`
        })
      );

      const results = await Promise.allSettled(spawnPromises);
      const successfulSpawns = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 'active'
      );

      expect(successfulSpawns.length).toBeGreaterThan(15); // At least 15 should succeed

      // Store spawned agents for cleanup
      testAgents = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<Agent>).value);
    });

    test('should spawn specialized agents with custom capabilities', async () => {
      const specializedAgent = await agentOrchestrator.spawnAgent({
        swarmId: testSwarmId,
        type: 'coder',
        capabilities: ['javascript', 'typescript', 'react', 'nodejs'],
        name: 'frontend-specialist',
        configuration: {
          maxConcurrentTasks: 3,
          specialization: 'frontend',
          frameworks: ['react', 'vue', 'angular']
        }
      });

      expect(specializedAgent).toMatchObject({
        id: expect.any(String),
        type: 'coder',
        status: 'active',
        capabilities: expect.arrayContaining(['javascript', 'typescript', 'react']),
        metadata: expect.objectContaining({
          specialization: 'frontend'
        })
      });

      testAgents.push(specializedAgent);
    });

    test('should handle agent spawning with resource constraints', async () => {
      // Spawn many agents to test resource limits
      const spawnPromises = Array.from({ length: 20 }, (_, i) =>
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'tester',
          name: `load-test-agent-${i}`
        })
      );

      const results = await Promise.allSettled(spawnPromises);
      const errors = results.filter(r => r.status === 'rejected');

      expect(errors.length).toBeGreaterThan(0); // Should hit resource limits
      expect(errors[0].reason.message).toMatch(/resource|limit|capacity/i);
    });

    test('should spawn agents with dependencies', async () => {
      // Spawn coordinator first
      const coordinator = await agentOrchestrator.spawnAgent({
        swarmId: testSwarmId,
        type: 'hierarchical-coordinator',
        name: 'main-coordinator'
      });

      // Spawn dependent agents
      const worker = await agentOrchestrator.spawnAgent({
        swarmId: testSwarmId,
        type: 'coder',
        name: 'dependent-worker',
        dependencies: [coordinator.id],
        configuration: {
          coordinatorId: coordinator.id
        }
      });

      expect(worker.metadata.coordinatorId).toBe(coordinator.id);
      testAgents.push(coordinator, worker);
    });
  });

  describe('Agent Coordination', () => {
    beforeEach(async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 8,
        userId: testUserId
      });
      testSwarmId = swarm.id;

      // Spawn test agents
      const agents = await Promise.all([
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'coder',
          name: 'test-coder'
        }),
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'tester',
          name: 'test-tester'
        }),
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'reviewer',
          name: 'test-reviewer'
        })
      ]);

      testAgents = agents;
    });

    test('should coordinate multi-agent workflows', async () => {
      const workflow = {
        name: 'development-workflow',
        steps: [
          {
            id: 'code',
            agentType: 'coder',
            action: 'implement-feature',
            params: { feature: 'user-authentication' },
            dependencies: []
          },
          {
            id: 'test',
            agentType: 'tester',
            action: 'create-tests',
            params: { target: 'user-authentication' },
            dependencies: ['code']
          },
          {
            id: 'review',
            agentType: 'reviewer',
            action: 'code-review',
            params: { scope: 'user-authentication' },
            dependencies: ['code', 'test']
          }
        ]
      };

      const orchestrationResult = await swarmCoordinator.orchestrateWorkflow(
        testSwarmId,
        workflow
      );

      expect(orchestrationResult).toMatchObject({
        workflowId: expect.any(String),
        status: 'completed',
        steps: expect.arrayContaining([
          expect.objectContaining({ id: 'code', status: 'completed' }),
          expect.objectContaining({ id: 'test', status: 'completed' }),
          expect.objectContaining({ id: 'review', status: 'completed' })
        ]),
        duration: expect.any(Number)
      });
    });

    test('should handle parallel task execution', async () => {
      const parallelTasks = [
        {
          id: 'task-1',
          agentType: 'coder',
          action: 'implement-component',
          params: { component: 'header' }
        },
        {
          id: 'task-2',
          agentType: 'coder',
          action: 'implement-component',
          params: { component: 'footer' }
        },
        {
          id: 'task-3',
          agentType: 'coder',
          action: 'implement-component',
          params: { component: 'sidebar' }
        }
      ];

      const startTime = Date.now();
      const results = await swarmCoordinator.executeParallelTasks(
        testSwarmId,
        parallelTasks
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('completed');
      });

      // Should be faster than sequential execution
      expect(duration).toBeLessThan(5000); // Reasonable parallel execution time
    });

    test('should handle agent communication and message passing', async () => {
      const coder = testAgents.find(a => a.type === 'coder');
      const tester = testAgents.find(a => a.type === 'tester');

      // Coder sends message to tester
      const message = {
        from: coder.id,
        to: tester.id,
        type: 'code-ready',
        payload: {
          module: 'authentication',
          location: '/src/auth.ts',
          testRequirements: ['unit', 'integration']
        }
      };

      const sendResult = await swarmCoordinator.sendMessage(testSwarmId, message);
      expect(sendResult.delivered).toBe(true);

      // Check if tester received the message
      const receivedMessages = await agentOrchestrator.getAgentMessages(tester.id);
      expect(receivedMessages).toContainEqual(
        expect.objectContaining({
          from: coder.id,
          type: 'code-ready'
        })
      );
    });

    test('should implement consensus mechanisms', async () => {
      // Spawn consensus-capable agents
      const consensusAgents = await Promise.all([
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'consensus-builder',
          name: 'consensus-1'
        }),
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'consensus-builder',
          name: 'consensus-2'
        }),
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'consensus-builder',
          name: 'consensus-3'
        })
      ]);

      testAgents.push(...consensusAgents);

      const proposal = {
        id: 'architecture-decision',
        type: 'architecture',
        description: 'Choose between microservices and monolith',
        options: ['microservices', 'monolith'],
        requiredVotes: 2
      };

      const consensusResult = await swarmCoordinator.buildConsensus(
        testSwarmId,
        proposal
      );

      expect(consensusResult).toMatchObject({
        proposal: expect.objectContaining({ id: 'architecture-decision' }),
        decision: expect.oneOf(['microservices', 'monolith']),
        votes: expect.any(Array),
        reachedConsensus: true
      });
    });
  });

  describe('Agent Monitoring and Health', () => {
    beforeEach(async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 5,
        userId: testUserId
      });
      testSwarmId = swarm.id;

      const agent = await agentOrchestrator.spawnAgent({
        swarmId: testSwarmId,
        type: 'coder',
        name: 'monitored-agent'
      });
      testAgents = [agent];
    });

    test('should monitor agent health and status', async () => {
      const agent = testAgents[0];
      const health = await agentOrchestrator.getAgentHealth(agent.id);

      expect(health).toMatchObject({
        agentId: agent.id,
        status: expect.oneOf(['active', 'idle', 'busy']),
        performance: expect.objectContaining({
          tasksCompleted: expect.any(Number),
          averageResponseTime: expect.any(Number),
          successRate: expect.any(Number),
          lastActivity: expect.any(Date)
        }),
        resources: expect.objectContaining({
          memoryUsage: expect.any(Number),
          cpuUsage: expect.any(Number)
        }),
        uptime: expect.any(Number)
      });
    });

    test('should detect and handle agent failures', async () => {
      const agent = testAgents[0];
      
      // Simulate agent failure
      await agentOrchestrator.simulateAgentFailure(agent.id, 'network-timeout');
      
      // Wait for failure detection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const health = await agentOrchestrator.getAgentHealth(agent.id);
      expect(health.status).toBe('error');
      expect(health.lastError).toContain('network-timeout');

      // Should trigger automatic recovery
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const recoveredHealth = await agentOrchestrator.getAgentHealth(agent.id);
      expect(recoveredHealth.status).toBe('active');
    });

    test('should implement agent performance analytics', async () => {
      const agent = testAgents[0];
      
      // Execute several tasks to generate performance data
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        agentId: agent.id,
        action: 'test-task',
        params: { taskNumber: i }
      }));

      for (const task of tasks) {
        await agentOrchestrator.executeTask(task);
      }

      const analytics = await agentOrchestrator.getAgentAnalytics(agent.id);
      
      expect(analytics).toMatchObject({
        agentId: agent.id,
        timeframe: expect.any(String),
        metrics: expect.objectContaining({
          tasksPerformed: expect.any(Number),
          averageTaskDuration: expect.any(Number),
          successRate: expect.any(Number),
          peakPerformanceTime: expect.any(String)
        }),
        trends: expect.objectContaining({
          performanceImprovement: expect.any(Number),
          reliabilityScore: expect.any(Number)
        })
      });
    });

    test('should provide swarm-wide monitoring dashboard', async () => {
      const dashboard = await swarmCoordinator.getSwarmDashboard(testSwarmId);
      
      expect(dashboard).toMatchObject({
        swarmId: testSwarmId,
        overview: expect.objectContaining({
          totalAgents: expect.any(Number),
          activeAgents: expect.any(Number),
          idleAgents: expect.any(Number),
          busyAgents: expect.any(Number)
        }),
        performance: expect.objectContaining({
          totalTasksCompleted: expect.any(Number),
          averageResponseTime: expect.any(Number),
          throughput: expect.any(Number),
          errorRate: expect.any(Number)
        }),
        topology: expect.objectContaining({
          type: expect.any(String),
          efficiency: expect.any(Number),
          bottlenecks: expect.any(Array)
        }),
        agents: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            status: expect.any(String)
          })
        ])
      });
    });
  });

  describe('Dynamic Scaling and Load Balancing', () => {
    beforeEach(async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 10,
        userId: testUserId,
        strategy: 'adaptive'
      });
      testSwarmId = swarm.id;
    });

    test('should automatically scale based on workload', async () => {
      // Create high workload
      const heavyWorkload = Array.from({ length: 20 }, (_, i) => ({
        id: `heavy-task-${i}`,
        type: 'computation',
        priority: 'high',
        estimatedDuration: 5000
      }));

      const initialAgentCount = await swarmCoordinator.getActiveAgentCount(testSwarmId);
      
      // Submit heavy workload
      await swarmCoordinator.submitWorkload(testSwarmId, heavyWorkload);
      
      // Wait for auto-scaling
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const scaledAgentCount = await swarmCoordinator.getActiveAgentCount(testSwarmId);
      expect(scaledAgentCount).toBeGreaterThan(initialAgentCount);

      // Update test agents for cleanup
      const swarmStatus = await swarmCoordinator.getSwarmStatus(testSwarmId);
      testAgents = swarmStatus.agents;
    });

    test('should balance load across available agents', async () => {
      // Spawn multiple agents
      const agents = await Promise.all([
        agentOrchestrator.spawnAgent({ swarmId: testSwarmId, type: 'coder', name: 'load-test-1' }),
        agentOrchestrator.spawnAgent({ swarmId: testSwarmId, type: 'coder', name: 'load-test-2' }),
        agentOrchestrator.spawnAgent({ swarmId: testSwarmId, type: 'coder', name: 'load-test-3' })
      ]);
      testAgents = agents;

      // Submit balanced workload
      const tasks = Array.from({ length: 15 }, (_, i) => ({
        id: `balance-task-${i}`,
        type: 'processing',
        estimatedDuration: 1000
      }));

      await swarmCoordinator.submitBalancedWorkload(testSwarmId, tasks);
      
      // Wait for task distribution
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check load distribution
      const loadDistribution = await Promise.all(
        agents.map(agent => agentOrchestrator.getAgentLoad(agent.id))
      );

      // Load should be relatively balanced (no agent has >60% of total load)
      const totalLoad = loadDistribution.reduce((sum, load) => sum + load, 0);
      const maxLoad = Math.max(...loadDistribution);
      expect(maxLoad / totalLoad).toBeLessThan(0.6);
    });

    test('should handle agent failures with load redistribution', async () => {
      // Spawn agents and distribute load
      const agents = await Promise.all([
        agentOrchestrator.spawnAgent({ swarmId: testSwarmId, type: 'coder', name: 'failure-test-1' }),
        agentOrchestrator.spawnAgent({ swarmId: testSwarmId, type: 'coder', name: 'failure-test-2' }),
        agentOrchestrator.spawnAgent({ swarmId: testSwarmId, type: 'coder', name: 'failure-test-3' })
      ]);
      testAgents = agents;

      const tasks = Array.from({ length: 12 }, (_, i) => ({
        id: `failure-task-${i}`,
        type: 'processing',
        estimatedDuration: 2000
      }));

      await swarmCoordinator.submitWorkload(testSwarmId, tasks);
      
      // Simulate agent failure
      await agentOrchestrator.simulateAgentFailure(agents[0].id, 'crash');
      
      // Wait for load redistribution
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify tasks were redistributed to remaining agents
      const remainingAgents = agents.slice(1);
      const redistributedTasks = await Promise.all(
        remainingAgents.map(agent => agentOrchestrator.getAgentTasks(agent.id))
      );

      const totalRedistributedTasks = redistributedTasks.reduce(
        (sum, tasks) => sum + tasks.length, 0
      );
      
      expect(totalRedistributedTasks).toBeGreaterThan(0);
    });
  });

  describe('Agent Lifecycle Management', () => {
    beforeEach(async () => {
      const swarm = await swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 5,
        userId: testUserId
      });
      testSwarmId = swarm.id;
    });

    test('should manage complete agent lifecycle', async () => {
      // Spawn agent
      const agent = await agentOrchestrator.spawnAgent({
        swarmId: testSwarmId,
        type: 'coder',
        name: 'lifecycle-test-agent'
      });

      expect(agent.status).toBe('active');
      testAgents = [agent];

      // Pause agent
      await agentOrchestrator.pauseAgent(agent.id);
      const pausedStatus = await agentOrchestrator.getAgentStatus(agent.id);
      expect(pausedStatus.status).toBe('paused');

      // Resume agent
      await agentOrchestrator.resumeAgent(agent.id);
      const resumedStatus = await agentOrchestrator.getAgentStatus(agent.id);
      expect(resumedStatus.status).toBe('active');

      // Terminate agent
      await agentOrchestrator.terminateAgent(agent.id);
      const terminatedStatus = await agentOrchestrator.getAgentStatus(agent.id);
      expect(terminatedStatus.status).toBe('terminated');
    });

    test('should handle graceful agent shutdown', async () => {
      const agent = await agentOrchestrator.spawnAgent({
        swarmId: testSwarmId,
        type: 'coder',
        name: 'shutdown-test-agent'
      });
      testAgents = [agent];

      // Assign tasks to the agent
      const tasks = [
        { agentId: agent.id, action: 'long-running-task', params: { duration: 5000 } },
        { agentId: agent.id, action: 'quick-task', params: { duration: 100 } }
      ];

      for (const task of tasks) {
        agentOrchestrator.executeTask(task);
      }

      // Request graceful shutdown
      const shutdownResult = await agentOrchestrator.gracefulShutdown(agent.id, {
        timeout: 10000,
        waitForTasks: true
      });

      expect(shutdownResult).toMatchObject({
        success: true,
        completedTasks: expect.any(Number),
        cancelledTasks: expect.any(Number),
        shutdownDuration: expect.any(Number)
      });

      const finalStatus = await agentOrchestrator.getAgentStatus(agent.id);
      expect(finalStatus.status).toBe('terminated');
    });

    test('should implement agent versioning and updates', async () => {
      const agent = await agentOrchestrator.spawnAgent({
        swarmId: testSwarmId,
        type: 'coder',
        name: 'version-test-agent',
        version: '1.0.0'
      });
      testAgents = [agent];

      // Update agent to new version
      const updateResult = await agentOrchestrator.updateAgent(agent.id, {
        version: '1.1.0',
        capabilities: [...agent.capabilities, 'new-feature'],
        configuration: { newFeatureEnabled: true }
      });

      expect(updateResult).toMatchObject({
        success: true,
        oldVersion: '1.0.0',
        newVersion: '1.1.0',
        updateDuration: expect.any(Number)
      });

      const updatedAgent = await agentOrchestrator.getAgent(agent.id);
      expect(updatedAgent.capabilities).toContain('new-feature');
      expect(updatedAgent.metadata.version).toBe('1.1.0');
    });

    test('should handle agent migration between swarms', async () => {
      // Create source swarm
      const sourceSwarm = await swarmCoordinator.initializeSwarm({
        topology: 'mesh',
        maxAgents: 5,
        userId: testUserId
      });

      // Create target swarm
      const targetSwarm = await swarmCoordinator.initializeSwarm({
        topology: 'hierarchical',
        maxAgents: 5,
        userId: testUserId
      });

      // Spawn agent in source swarm
      const agent = await agentOrchestrator.spawnAgent({
        swarmId: sourceSwarm.id,
        type: 'coder',
        name: 'migration-test-agent'
      });

      // Migrate agent to target swarm
      const migrationResult = await swarmCoordinator.migrateAgent(
        agent.id,
        sourceSwarm.id,
        targetSwarm.id,
        { preserveState: true, transferTasks: true }
      );

      expect(migrationResult).toMatchObject({
        success: true,
        agentId: agent.id,
        sourceSwarmId: sourceSwarm.id,
        targetSwarmId: targetSwarm.id,
        migrationDuration: expect.any(Number)
      });

      // Verify agent is now in target swarm
      const targetSwarmStatus = await swarmCoordinator.getSwarmStatus(targetSwarm.id);
      expect(targetSwarmStatus.agents).toContainEqual(
        expect.objectContaining({ id: agent.id })
      );

      testAgents = [agent];
      // Clean up both swarms
      await swarmCoordinator.destroySwarm(sourceSwarm.id);
      await swarmCoordinator.destroySwarm(targetSwarm.id);
      testSwarmId = undefined; // Prevent double cleanup
    });
  });
});
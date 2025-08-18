/**
 * Agent Framework Testing - London School TDD
 * Comprehensive testing framework for 21+ agent configurations
 */

import { MockFactory } from '../factories/mock-factory.js';
import { SwarmTestCoordinator } from '../helpers/swarm-coordinator.js';
import { AgentTestRunner } from '../helpers/agent-test-runner.js';
import { AgentConfigValidator } from '../helpers/agent-config-validator.js';

describe('Agent Framework Testing', () => {
  let mockFactory;
  let swarmCoordinator;
  let agentTestRunner;
  let configValidator;
  let mockClaudeCodeTools;
  let mockAgentLinkAPI;

  beforeEach(() => {
    mockFactory = new MockFactory();
    swarmCoordinator = new SwarmTestCoordinator();
    agentTestRunner = new AgentTestRunner(mockFactory, swarmCoordinator);
    configValidator = new AgentConfigValidator();
    
    mockClaudeCodeTools = mockFactory.createClaudeCodeMocks();
    mockAgentLinkAPI = mockFactory.createAgentLinkMocks();
  });

  describe('Core Development Agents', () => {
    const coreAgents = ['coder', 'reviewer', 'tester', 'planner', 'researcher'];

    coreAgents.forEach(agentType => {
      it(`should test ${agentType} agent configuration and capabilities`, async () => {
        // Arrange
        const agentConfig = {
          name: agentType,
          type: 'md-config',
          capabilities: getAgentCapabilities(agentType),
          tools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
          coordination: {
            handoff: true,
            messaging: true,
            consensus: agentType === 'planner'
          },
          constraints: {
            maxExecutionTime: 300000, // 5 minutes
            maxMemoryUsage: 256 * 1024 * 1024, // 256MB
            maxFileSize: 10 * 1024 * 1024 // 10MB
          }
        };

        // Act
        const validationResult = await configValidator.validateAgentConfig(agentConfig);
        const agentMock = mockFactory.createAgentMocks(agentType);
        const testResult = await agentTestRunner.runAgentTests(agentType, agentMock);

        // Assert - Configuration validation
        expect(validationResult.valid).toBe(true);
        expect(validationResult.errors).toHaveLength(0);

        // Assert - Agent capabilities
        expect(agentConfig.capabilities).toContain(getExpectedCapability(agentType));
        expect(agentConfig.tools).toContain('Read');
        expect(agentConfig.tools).toContain('Write');

        // Assert - Agent behavior
        expect(testResult.initialization.success).toBe(true);
        expect(testResult.execution.success).toBe(true);
        expect(testResult.coordination.handoffCapable).toBe(true);

        // Verify Claude Code tool integration
        expect(agentMock.execute).toHaveBeenCalled();
        expect(mockAgentLinkAPI.postAgentExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            agentName: agentType,
            status: 'completed'
          })
        );
      });
    });
  });

  describe('Swarm Coordination Agents', () => {
    const coordinationAgents = [
      'hierarchical-coordinator',
      'mesh-coordinator', 
      'adaptive-coordinator',
      'collective-intelligence-coordinator',
      'swarm-memory-manager'
    ];

    coordinationAgents.forEach(agentType => {
      it(`should test ${agentType} coordination patterns`, async () => {
        // Arrange
        const coordinatorConfig = {
          name: agentType,
          type: 'coordination-agent',
          capabilities: ['agent-coordination', 'workflow-orchestration', 'conflict-resolution'],
          coordination: {
            topology: getCoordinationTopology(agentType),
            consensus: true,
            loadBalancing: true,
            faultTolerance: true
          },
          metrics: {
            trackLatency: true,
            trackThroughput: true,
            trackErrorRate: true
          }
        };

        const agentMock = mockFactory.createAgentMocks(agentType);
        const mockAgents = createMockAgentSwarm(5); // 5 agents to coordinate

        // Act
        const coordinationResult = await agentTestRunner.testCoordination(
          agentType,
          agentMock,
          mockAgents
        );

        // Assert - Coordination capabilities
        expect(coordinationResult.topologySetup.success).toBe(true);
        expect(coordinationResult.agentOrchestration.success).toBe(true);
        expect(coordinationResult.consensusBuilding.success).toBe(true);
        expect(coordinationResult.loadDistribution.efficiency).toBeGreaterThan(0.8);

        // Verify coordination patterns
        expect(agentMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'coordinate',
            agents: expect.arrayContaining(mockAgents.map(a => a.id))
          })
        );

        // Verify metrics collection
        expect(coordinationResult.metrics.latency).toBeLessThan(1000); // < 1 second
        expect(coordinationResult.metrics.throughput).toBeGreaterThan(10); // > 10 ops/sec
        expect(coordinationResult.metrics.errorRate).toBeLessThan(0.05); // < 5% error rate
      });
    });
  });

  describe('Consensus & Distributed Agents', () => {
    const consensusAgents = [
      'byzantine-coordinator',
      'raft-manager',
      'gossip-coordinator',
      'consensus-builder',
      'crdt-synchronizer',
      'quorum-manager',
      'security-manager'
    ];

    consensusAgents.forEach(agentType => {
      it(`should test ${agentType} consensus mechanisms`, async () => {
        // Arrange
        const consensusConfig = {
          name: agentType,
          type: 'consensus-agent',
          capabilities: ['consensus-building', 'distributed-coordination', 'conflict-resolution'],
          consensus: {
            algorithm: getConsensusAlgorithm(agentType),
            quorumSize: 3,
            timeoutMs: 5000,
            retryAttempts: 3
          },
          security: {
            byzantine_tolerance: agentType.includes('byzantine'),
            encryption: true,
            authentication: true
          }
        };

        const agentMock = mockFactory.createAgentMocks(agentType);
        const mockPeers = createMockPeerNetwork(7); // 7 peers for consensus

        // Act
        const consensusResult = await agentTestRunner.testConsensus(
          agentType,
          agentMock,
          mockPeers,
          { proposal: 'test-proposal', value: 'consensus-value' }
        );

        // Assert - Consensus behavior
        expect(consensusResult.consensusReached).toBe(true);
        expect(consensusResult.participantCount).toBeGreaterThanOrEqual(3);
        expect(consensusResult.agreementLevel).toBeGreaterThan(0.66); // > 2/3 majority
        expect(consensusResult.convergenceTime).toBeLessThan(5000); // < 5 seconds

        // Verify consensus algorithm execution
        expect(agentMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'build_consensus',
            proposal: 'test-proposal',
            peers: expect.any(Array)
          })
        );

        // Verify fault tolerance (if applicable)
        if (agentType.includes('byzantine')) {
          expect(consensusResult.byzantineTolerance).toBe(true);
          expect(consensusResult.maliciousNodeHandling).toBe(true);
        }
      });
    });
  });

  describe('Performance & Optimization Agents', () => {
    const performanceAgents = [
      'perf-analyzer',
      'performance-benchmarker', 
      'task-orchestrator',
      'memory-coordinator',
      'smart-agent'
    ];

    performanceAgents.forEach(agentType => {
      it(`should test ${agentType} performance optimization`, async () => {
        // Arrange
        const performanceConfig = {
          name: agentType,
          type: 'performance-agent',
          capabilities: ['performance-analysis', 'optimization', 'resource-management'],
          optimization: {
            targets: ['latency', 'throughput', 'memory', 'cpu'],
            algorithms: ['genetic', 'gradient_descent', 'simulated_annealing'],
            constraints: {
              maxLatency: 100,
              minThroughput: 1000,
              maxMemory: 512 * 1024 * 1024
            }
          },
          monitoring: {
            realTime: true,
            alerting: true,
            dashboards: true
          }
        };

        const agentMock = mockFactory.createAgentMocks(agentType);
        const performanceMetrics = generateMockMetrics();

        // Act
        const optimizationResult = await agentTestRunner.testOptimization(
          agentType,
          agentMock,
          performanceMetrics
        );

        // Assert - Optimization capabilities
        expect(optimizationResult.baselineEstablished).toBe(true);
        expect(optimizationResult.optimizationsApplied).toBeGreaterThan(0);
        expect(optimizationResult.performanceImprovement).toBeGreaterThan(0.1); // > 10% improvement
        expect(optimizationResult.constraintsSatisfied).toBe(true);

        // Verify optimization execution
        expect(agentMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'optimize',
            metrics: performanceMetrics,
            targets: expect.arrayContaining(['latency', 'throughput'])
          })
        );

        // Verify monitoring setup
        expect(optimizationResult.monitoring.realTimeEnabled).toBe(true);
        expect(optimizationResult.monitoring.alertsConfigured).toBe(true);
      });
    });
  });

  describe('GitHub & Repository Agents', () => {
    const githubAgents = [
      'github-modes',
      'pr-manager',
      'code-review-swarm',
      'issue-tracker',
      'release-manager',
      'workflow-automation'
    ];

    githubAgents.forEach(agentType => {
      it(`should test ${agentType} GitHub integration`, async () => {
        // Arrange
        const githubConfig = {
          name: agentType,
          type: 'github-agent',
          capabilities: ['github-api', 'repository-management', 'automation'],
          github: {
            authentication: 'token',
            permissions: ['read', 'write', 'admin'],
            webhooks: true,
            actions: true
          },
          automation: {
            pullRequests: true,
            issues: true,
            releases: true,
            codeReview: true
          }
        };

        const agentMock = mockFactory.createAgentMocks(agentType);
        const mockGitHubAPI = createMockGitHubAPI();

        // Act
        const githubResult = await agentTestRunner.testGitHubIntegration(
          agentType,
          agentMock,
          mockGitHubAPI
        );

        // Assert - GitHub integration
        expect(githubResult.apiConnection.success).toBe(true);
        expect(githubResult.authentication.valid).toBe(true);
        expect(githubResult.permissions.sufficient).toBe(true);
        expect(githubResult.automation.configured).toBe(true);

        // Verify GitHub operations
        expect(agentMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: expect.stringMatching(/(create|update|manage)/),
            platform: 'github'
          })
        );

        // Verify specific agent capabilities
        if (agentType === 'pr-manager') {
          expect(githubResult.operations.pullRequestManagement).toBe(true);
        }
        if (agentType === 'code-review-swarm') {
          expect(githubResult.operations.automatedReview).toBe(true);
        }
      });
    });
  });

  describe('SPARC Methodology Agents', () => {
    const sparcAgents = [
      'sparc-coord',
      'sparc-coder',
      'specification',
      'pseudocode', 
      'architecture',
      'refinement'
    ];

    sparcAgents.forEach(agentType => {
      it(`should test ${agentType} SPARC methodology implementation`, async () => {
        // Arrange
        const sparcConfig = {
          name: agentType,
          type: 'sparc-agent',
          capabilities: ['sparc-methodology', 'systematic-development', 'documentation'],
          sparc: {
            phase: getSPARCPhase(agentType),
            methodology: 'test-driven-development',
            documentation: true,
            validation: true
          },
          workflow: {
            sequential: true,
            gated: true,
            rollback: true
          }
        };

        const agentMock = mockFactory.createAgentMocks(agentType);
        const mockProject = createMockProject();

        // Act
        const sparcResult = await agentTestRunner.testSPARCMethodology(
          agentType,
          agentMock,
          mockProject
        );

        // Assert - SPARC methodology
        expect(sparcResult.phaseExecution.success).toBe(true);
        expect(sparcResult.documentation.generated).toBe(true);
        expect(sparcResult.validation.passed).toBe(true);
        expect(sparcResult.workflow.gatesPassed).toBe(true);

        // Verify SPARC phase execution
        expect(agentMock.execute).toHaveBeenCalledWith(
          expect.objectContaining({
            action: `execute_${getSPARCPhase(agentType)}`,
            project: mockProject,
            methodology: 'test-driven-development'
          })
        );

        // Verify phase-specific outputs
        if (agentType === 'specification') {
          expect(sparcResult.outputs.requirements).toBeDefined();
        }
        if (agentType === 'architecture') {
          expect(sparcResult.outputs.systemDesign).toBeDefined();
        }
      });
    });
  });

  describe('Agent Handoff and Coordination', () => {
    it('should test multi-agent workflow with proper handoffs', async () => {
      // Arrange
      const workflowAgents = [
        { type: 'researcher', role: 'analysis' },
        { type: 'architect', role: 'design' },
        { type: 'coder', role: 'implementation' },
        { type: 'tester', role: 'validation' },
        { type: 'reviewer', role: 'quality_assurance' }
      ];

      const agentMocks = workflowAgents.map(({ type }) => 
        mockFactory.createAgentMocks(type)
      );

      const workflowTask = {
        id: 'multi-agent-feature-development',
        description: 'Develop user authentication feature',
        requirements: ['secure login', 'JWT tokens', 'role-based access']
      };

      // Act
      const workflowResult = await agentTestRunner.testWorkflowHandoffs(
        workflowAgents,
        agentMocks,
        workflowTask
      );

      // Assert - Workflow execution
      expect(workflowResult.workflowCompletion.success).toBe(true);
      expect(workflowResult.handoffs.successful).toBe(workflowAgents.length - 1);
      expect(workflowResult.contextPreservation.maintained).toBe(true);
      expect(workflowResult.artifacts.generated).toBeGreaterThan(0);

      // Verify agent coordination
      workflowAgents.forEach((agent, index) => {
        const agentMock = agentMocks[index];
        expect(agentMock.execute).toHaveBeenCalled();
        
        if (index > 0) {
          expect(agentMock.receiveMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'handoff',
              from: workflowAgents[index - 1].type
            })
          );
        }

        if (index < workflowAgents.length - 1) {
          expect(agentMock.handoff).toHaveBeenCalledWith(
            expect.any(String), // target agent
            expect.any(Object)   // context
          );
        }
      });

      // Verify AgentLink API interactions
      expect(mockAgentLinkAPI.postAgentExecution).toHaveBeenCalledTimes(workflowAgents.length);
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'workflow_completion',
          workflowId: 'multi-agent-feature-development'
        })
      );
    });

    it('should handle agent failure and recovery in workflows', async () => {
      // Arrange
      const workflowAgents = [
        { type: 'researcher', shouldFail: false },
        { type: 'coder', shouldFail: true }, // This agent will fail
        { type: 'tester', shouldFail: false }
      ];

      const agentMocks = workflowAgents.map(({ type, shouldFail }) => {
        const mock = mockFactory.createAgentMocks(type);
        if (shouldFail) {
          mock.execute.mockRejectedValueOnce(new Error('Agent execution failed'));
          mock.execute.mockResolvedValueOnce({ success: true, recovered: true });
        }
        return mock;
      });

      // Act
      const recoveryResult = await agentTestRunner.testWorkflowRecovery(
        workflowAgents,
        agentMocks
      );

      // Assert - Recovery behavior
      expect(recoveryResult.failureDetected).toBe(true);
      expect(recoveryResult.recoveryAttempted).toBe(true);
      expect(recoveryResult.recoverySuccessful).toBe(true);
      expect(recoveryResult.workflowContinued).toBe(true);

      // Verify failure handling
      const failedAgentMock = agentMocks[1]; // coder agent
      expect(failedAgentMock.execute).toHaveBeenCalledTimes(2); // Initial failure + recovery

      // Verify error reporting
      expect(mockAgentLinkAPI.postActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          details: expect.objectContaining({
            agent: 'coder',
            error: 'Agent execution failed',
            recovered: true
          })
        })
      );
    });
  });

  // Helper functions
  function getAgentCapabilities(agentType) {
    const capabilities = {
      'coder': ['file-editing', 'syntax-checking', 'code-generation'],
      'reviewer': ['code-review', 'quality-analysis', 'best-practices'],
      'tester': ['test-writing', 'test-execution', 'coverage-analysis'],
      'planner': ['project-planning', 'task-breakdown', 'estimation'],
      'researcher': ['information-gathering', 'analysis', 'documentation']
    };
    return capabilities[agentType] || ['general-purpose'];
  }

  function getExpectedCapability(agentType) {
    const expectedCapabilities = {
      'coder': 'file-editing',
      'reviewer': 'code-review',
      'tester': 'test-writing',
      'planner': 'project-planning',
      'researcher': 'information-gathering'
    };
    return expectedCapabilities[agentType] || 'general-purpose';
  }

  function getCoordinationTopology(agentType) {
    const topologies = {
      'hierarchical-coordinator': 'hierarchical',
      'mesh-coordinator': 'mesh',
      'adaptive-coordinator': 'adaptive',
      'collective-intelligence-coordinator': 'collective',
      'swarm-memory-manager': 'distributed'
    };
    return topologies[agentType] || 'mesh';
  }

  function getConsensusAlgorithm(agentType) {
    const algorithms = {
      'byzantine-coordinator': 'byzantine_fault_tolerant',
      'raft-manager': 'raft',
      'gossip-coordinator': 'gossip_protocol',
      'consensus-builder': 'pbft',
      'crdt-synchronizer': 'crdt',
      'quorum-manager': 'quorum_consensus',
      'security-manager': 'secure_consensus'
    };
    return algorithms[agentType] || 'raft';
  }

  function getSPARCPhase(agentType) {
    const phases = {
      'sparc-coord': 'coordination',
      'sparc-coder': 'completion',
      'specification': 'specification',
      'pseudocode': 'pseudocode',
      'architecture': 'architecture',
      'refinement': 'refinement'
    };
    return phases[agentType] || 'specification';
  }

  function createMockAgentSwarm(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `mock-agent-${i}`,
      type: `agent-type-${i}`,
      status: 'active',
      capabilities: ['mock-capability']
    }));
  }

  function createMockPeerNetwork(count) {
    return Array.from({ length: count }, (_, i) => ({
      id: `peer-${i}`,
      address: `node-${i}`,
      status: 'online',
      reputation: 0.9
    }));
  }

  function createMockGitHubAPI() {
    return {
      authenticate: jest.fn().mockResolvedValue({ authenticated: true }),
      createPullRequest: jest.fn().mockResolvedValue({ id: 123 }),
      reviewPullRequest: jest.fn().mockResolvedValue({ reviewed: true }),
      createIssue: jest.fn().mockResolvedValue({ id: 456 }),
      createRelease: jest.fn().mockResolvedValue({ id: 789 })
    };
  }

  function createMockProject() {
    return {
      id: 'test-project',
      name: 'Mock Project',
      description: 'A test project for SPARC methodology',
      requirements: ['requirement 1', 'requirement 2'],
      constraints: ['constraint 1', 'constraint 2']
    };
  }

  function generateMockMetrics() {
    return {
      latency: 150, // ms
      throughput: 800, // ops/sec
      memory: 128 * 1024 * 1024, // 128MB
      cpu: 0.6, // 60%
      errorRate: 0.02 // 2%
    };
  }
});
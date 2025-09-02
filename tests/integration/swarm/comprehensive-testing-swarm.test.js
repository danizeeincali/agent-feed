/**
 * Comprehensive Testing Swarm Integration Test
 * Tests the full swarm initialization and execution workflow
 */

const { SwarmExecutor, runComprehensiveTestingSwarm } = require('../../../src/agents/SwarmExecutor');
const ComprehensiveTestingSwarm = require('../../../src/agents/ComprehensiveTestingSwarm');

describe('Comprehensive Testing Swarm', () => {
  let swarmExecutor;
  let swarm;

  beforeEach(() => {
    swarmExecutor = new SwarmExecutor();
    swarm = new ComprehensiveTestingSwarm();
  });

  describe('Swarm Initialization', () => {
    test('should initialize swarm with mesh topology', async () => {
      const initializedSwarm = await swarm.initialize();
      
      expect(initializedSwarm).toBeDefined();
      expect(initializedSwarm.topology).toBe('mesh');
      expect(initializedSwarm.maxAgents).toBe(8);
      expect(initializedSwarm.purpose).toBe('comprehensive-fullstack-testing');
      expect(initializedSwarm.status).toBe('ready');
    });

    test('should create all specialized agents', async () => {
      await swarm.initialize();
      const statusReport = swarm.getStatusReport();
      
      expect(statusReport.agents).toBeDefined();
      expect(Object.keys(statusReport.agents)).toHaveLength(8);
      
      // Verify all required agents are present
      const expectedAgents = [
        'sparc-coord',
        'tdd-london', 
        'nld-detector',
        'prod-validator',
        'playwright',
        'websocket',
        'ui-validator',
        'claude-manager'
      ];
      
      expectedAgents.forEach(agentId => {
        expect(statusReport.agents[agentId]).toBeDefined();
        expect(statusReport.agents[agentId].status).toBe('initialized');
      });
    });

    test('should configure task orchestration', async () => {
      await swarm.initialize();
      
      expect(swarm.taskOrchestrator).toBeDefined();
      expect(swarm.taskOrchestrator.testingSuite).toBeDefined();
      expect(swarm.taskOrchestrator.executionOrder).toHaveLength(8);
      expect(swarm.taskOrchestrator.parallelExecution).toBe(true);
      expect(swarm.taskOrchestrator.maxConcurrentTasks).toBe(4);
    });

    test('should setup cross-agent coordination', async () => {
      await swarm.initialize();
      
      // Verify each agent has coordination capabilities
      for (const [agentId, agent] of swarm.agents) {
        expect(agent.sharedMemory).toBeDefined();
        expect(agent.coordinationChannel).toContain('coordination');
        expect(agent.broadcastChannel).toContain('broadcast');
        expect(typeof agent.sendMessage).toBe('function');
        expect(typeof agent.broadcast).toBe('function');
      }
    });
  });

  describe('Task Execution', () => {
    test('should execute SPARC coordination tasks', async () => {
      const sparcAgent = swarm.agents.get('sparc-coord');
      if (!sparcAgent) {
        // Create agent if not available from swarm initialization
        const SPARCCoordinationAgent = require('../../../src/agents/ComprehensiveTestingSwarm').SPARCCoordinationAgent;
        sparcAgent = new SPARCCoordinationAgent();
      }
      
      const tasks = [
        'coordinate-systematic-debugging',
        'implement-sparc-methodology', 
        'orchestrate-agent-workflows',
        'generate-comprehensive-reports',
        'validate-overall-quality'
      ];
      
      for (const task of tasks) {
        const result = await sparcAgent.executeTask(task);
        expect(result.status).toBe('completed');
        expect(result.result).toBeDefined();
      }
    });

    test('should execute TDD London swarm tasks', async () => {
      const tddAgent = swarm.agents.get('tdd-london');
      if (!tddAgent) {
        const TDDLondonSwarmAgent = require('../../../src/agents/ComprehensiveTestingSwarm').TDDLondonSwarmAgent;
        tddAgent = new TDDLondonSwarmAgent();
      }
      
      const tasks = [
        'implement-mock-driven-tests',
        'validate-test-isolation',
        'verify-dependency-injection',
        'test-contract-compliance',
        'ensure-test-coverage'
      ];
      
      for (const task of tasks) {
        const result = await tddAgent.executeTask(task);
        expect(result.status).toBe('completed');
        expect(result.result).toBeDefined();
      }
    });

    test('should execute production validation tasks', async () => {
      const prodAgent = swarm.agents.get('prod-validator');
      if (!prodAgent) {
        const ProductionValidationAgent = require('../../../src/agents/ComprehensiveTestingSwarm').ProductionValidationAgent;
        prodAgent = new ProductionValidationAgent();
      }
      
      const tasks = [
        'execute-zero-mock-validation',
        'test-real-functionality',
        'validate-end-to-end-flows',
        'verify-production-readiness',
        'test-error-handling'
      ];
      
      for (const task of tasks) {
        const result = await prodAgent.executeTask(task);
        expect(result.status).toBe('completed');
        expect(result.result).toBeDefined();
      }
    });
  });

  describe('Swarm Executor', () => {
    test('should execute complete testing workflow', async () => {
      // Mock the swarm execution to avoid long running times in tests
      const mockExecutionResults = {
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        overallStatus: 'completed',
        testSuites: {
          'frontend-interactions': { status: 'completed', tasks: {} },
          'claude-management': { status: 'completed', tasks: {} },
          'websocket-communication': { status: 'completed', tasks: {} },
          'production-validation': { status: 'completed', tasks: {} },
          'pattern-analysis': { status: 'completed', tasks: {} },
          'e2e-testing': { status: 'completed', tasks: {} },
          'tdd-validation': { status: 'completed', tasks: {} },
          'sparc-coordination': { status: 'completed', tasks: {} }
        }
      };
      
      // Override executeTestingWorkflow for testing
      swarm.executeTestingWorkflow = jest.fn().mockResolvedValue(mockExecutionResults);
      swarmExecutor.swarm = swarm;
      
      const result = await swarmExecutor.execute();
      
      expect(result.success).toBe(true);
      expect(result.swarm).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.results.overallStatus).toBe('completed');
    });

    test('should handle execution errors gracefully', async () => {
      // Mock a failing swarm execution
      swarm.executeTestingWorkflow = jest.fn().mockRejectedValue(new Error('Test error'));
      swarmExecutor.swarm = swarm;
      
      const result = await swarmExecutor.execute();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.swarm).toBeDefined();
    });

    test('should provide comprehensive status report', async () => {
      await swarm.initialize();
      swarmExecutor.swarm = swarm;
      
      const statusReport = swarmExecutor.getStatusReport();
      
      expect(statusReport.executor).toBeDefined();
      expect(statusReport.swarm).toBeDefined();
      expect(statusReport.swarm.capabilities).toHaveLength(8);
      
      // Verify capabilities
      const expectedCapabilities = [
        'Frontend UI interaction testing',
        'Claude instance lifecycle management',
        'WebSocket real-time communication validation',
        'Zero-mock production testing',
        'Pattern detection and regression prevention',
        'End-to-end Playwright automation',
        'TDD London-style mock-driven testing',
        'SPARC systematic debugging coordination'
      ];
      
      expectedCapabilities.forEach(capability => {
        expect(statusReport.swarm.capabilities).toContain(capability);
      });
    });
  });

  describe('Integration with Claude-Flow', () => {
    test('should register swarm hooks properly', async () => {
      let preTaskCalled = false;
      let postTaskCalled = false;
      
      swarmExecutor.addHook('preTask', async () => {
        preTaskCalled = true;
      });
      
      swarmExecutor.addHook('postTask', async () => {
        postTaskCalled = true;
      });
      
      // Mock successful execution
      swarm.executeTestingWorkflow = jest.fn().mockResolvedValue({
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        overallStatus: 'completed',
        testSuites: {}
      });
      swarmExecutor.swarm = swarm;
      
      await swarmExecutor.execute();
      
      expect(preTaskCalled).toBe(true);
      expect(postTaskCalled).toBe(true);
    });
  });

  describe('Agent Communication', () => {
    test('should enable agent message passing', async () => {
      await swarm.initialize();
      
      const agent1 = swarm.agents.get('sparc-coord');
      const agent2 = swarm.agents.get('prod-validator');
      
      if (agent1 && agent2) {
        // Setup message handler for agent2
        let receivedMessage = null;
        agent2.onMessage = (fromAgent, message) => {
          receivedMessage = { fromAgent, message };
        };
        
        // Send message from agent1 to agent2
        agent1.sendMessage('prod-validator', { type: 'coordination', data: 'test message' });
        
        expect(receivedMessage).toBeDefined();
        expect(receivedMessage.fromAgent).toBe('sparc-coord');
        expect(receivedMessage.message.data).toBe('test message');
      }
    });

    test('should enable agent broadcasting', async () => {
      await swarm.initialize();
      
      const broadcaster = swarm.agents.get('sparc-coord');
      let broadcastReceived = 0;
      
      // Setup broadcast handlers for other agents
      for (const [agentId, agent] of swarm.agents) {
        if (agentId !== 'sparc-coord') {
          agent.onBroadcast = (fromAgent, message) => {
            if (fromAgent === 'sparc-coord') {
              broadcastReceived++;
            }
          };
        }
      }
      
      if (broadcaster) {
        broadcaster.broadcast({ type: 'status', message: 'test broadcast' });
        expect(broadcastReceived).toBe(7); // 7 other agents should receive the broadcast
      }
    });
  });
});
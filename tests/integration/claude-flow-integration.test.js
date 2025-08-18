/**
 * Claude Flow Integration Tests
 * Tests neural pattern classification, agent spawning, and swarm coordination
 */

const { claudeFlowService } = require('../../src/services/claude-flow');
const { db } = require('../../src/database/connection');
const jwt = require('jsonwebtoken');

// Mock Claude Flow MCP tools
jest.mock('../../src/mcp/claude-flow-client', () => ({
  swarmInit: jest.fn(),
  agentSpawn: jest.fn(),
  taskOrchestrate: jest.fn(),
  swarmStatus: jest.fn(),
  neuralTrain: jest.fn(),
  neuralPatterns: jest.fn(),
  memoryUsage: jest.fn(),
  taskStatus: jest.fn(),
  taskResults: jest.fn()
}));

const mockClaudeFlow = require('../../src/mcp/claude-flow-client');

describe('Claude Flow Integration Tests', () => {
  let testUser;
  let testFeed;
  let testSession;
  let authToken;

  beforeAll(async () => {
    // Setup test database
    await db.migrate();
    
    // Create test user
    const userResult = await db.query(`
      INSERT INTO users (email, name, password_hash) 
      VALUES ($1, $2, $3) 
      RETURNING *
    `, ['claudeflow@example.com', 'Claude Flow Test User', 'hashedpassword']);
    
    testUser = userResult.rows[0];
    
    // Generate auth token
    authToken = jwt.sign(
      { userId: testUser.id, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test feed
    const feedResult = await db.query(`
      INSERT INTO feeds (user_id, name, url, feed_type, automation_config) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING *
    `, [testUser.id, 'Claude Flow Test Feed', 'https://example.com/cf-feed.rss', 'rss',
        JSON.stringify({
          enabled: true,
          claude_flow_config: {
            swarm_topology: 'mesh',
            max_agents: 5,
            agent_types: ['researcher', 'analyzer'],
            neural_training: true
          }
        })]);
    
    testFeed = feedResult.rows[0];
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await db.close();
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Swarm Initialization and Management', () => {
    test('Should initialize swarm with correct topology', async () => {
      mockClaudeFlow.swarmInit.mockResolvedValue({
        swarm_id: 'test-swarm-123',
        topology: 'mesh',
        max_agents: 5,
        status: 'initialized'
      });

      const config = {
        topology: 'mesh',
        max_agents: 5,
        strategy: 'adaptive'
      };

      const session = await claudeFlowService.initializeSession(testUser.id, config);

      expect(mockClaudeFlow.swarmInit).toHaveBeenCalledWith({
        topology: 'mesh',
        maxAgents: 5,
        strategy: 'adaptive'
      });

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('swarm_id', 'test-swarm-123');
      expect(session.status).toBe('initializing');
      
      testSession = session;
    });

    test('Should update session status after initialization', async () => {
      mockClaudeFlow.swarmStatus.mockResolvedValue({
        status: 'active',
        agents: [],
        metrics: {
          total_agents: 0,
          active_tasks: 0
        }
      });

      await claudeFlowService.updateSessionStatus(testSession.id);

      const updatedSession = await db.query(
        'SELECT * FROM claude_flow_sessions WHERE id = $1',
        [testSession.id]
      );

      expect(updatedSession.rows[0].status).toBe('active');
    });

    test('Should handle swarm initialization failures', async () => {
      mockClaudeFlow.swarmInit.mockRejectedValue(new Error('Swarm initialization failed'));

      await expect(claudeFlowService.initializeSession(testUser.id, {
        topology: 'invalid'
      })).rejects.toThrow('Swarm initialization failed');
    });

    test('Should support different topology configurations', async () => {
      const topologies = ['hierarchical', 'mesh', 'ring', 'star'];
      
      for (const topology of topologies) {
        mockClaudeFlow.swarmInit.mockResolvedValue({
          swarm_id: `${topology}-swarm-${Date.now()}`,
          topology,
          status: 'initialized'
        });

        const session = await claudeFlowService.initializeSession(testUser.id, {
          topology,
          max_agents: 3
        });

        expect(session.configuration.topology).toBe(topology);
        
        // Cleanup
        await db.query('DELETE FROM claude_flow_sessions WHERE id = $1', [session.id]);
      }
    });
  });

  describe('Agent Spawning and Management', () => {
    test('Should spawn agents with correct types and capabilities', async () => {
      const agentTypes = ['researcher', 'analyzer', 'coder', 'tester', 'optimizer'];
      
      for (const agentType of agentTypes) {
        mockClaudeFlow.agentSpawn.mockResolvedValue({
          agent_id: `${agentType}-agent-${Date.now()}`,
          type: agentType,
          status: 'active',
          capabilities: [`${agentType}_capability`]
        });

        const agent = await claudeFlowService.spawnAgent(testSession.id, {
          type: agentType,
          capabilities: [`${agentType}_capability`]
        });

        expect(mockClaudeFlow.agentSpawn).toHaveBeenCalledWith({
          type: agentType,
          capabilities: [`${agentType}_capability`]
        });

        expect(agent.type).toBe(agentType);
        expect(agent.status).toBe('active');
      }
    });

    test('Should track agent metrics in session', async () => {
      mockClaudeFlow.agentSpawn.mockResolvedValue({
        agent_id: 'metrics-agent-123',
        type: 'researcher',
        status: 'active'
      });

      await claudeFlowService.spawnAgent(testSession.id, {
        type: 'researcher'
      });

      // Check if session metrics were updated
      const session = await db.query(
        'SELECT metrics FROM claude_flow_sessions WHERE id = $1',
        [testSession.id]
      );

      expect(session.rows[0].metrics.agents_spawned).toBeGreaterThan(0);
    });

    test('Should handle agent spawning failures', async () => {
      mockClaudeFlow.agentSpawn.mockRejectedValue(new Error('Agent spawn failed'));

      await expect(claudeFlowService.spawnAgent(testSession.id, {
        type: 'invalid_type'
      })).rejects.toThrow('Agent spawn failed');
    });

    test('Should respect max agents limit', async () => {
      // Mock swarm status with max agents reached
      mockClaudeFlow.swarmStatus.mockResolvedValue({
        status: 'active',
        agents: new Array(5).fill({ status: 'active' }), // Max agents
        metrics: { total_agents: 5 }
      });

      await expect(claudeFlowService.spawnAgent(testSession.id, {
        type: 'researcher'
      })).rejects.toThrow(/max.*agents.*reached/i);
    });
  });

  describe('Task Orchestration', () => {
    test('Should orchestrate tasks with different strategies', async () => {
      const strategies = ['parallel', 'sequential', 'adaptive'];
      
      for (const strategy of strategies) {
        mockClaudeFlow.taskOrchestrate.mockResolvedValue({
          task_id: `task-${strategy}-${Date.now()}`,
          status: 'running',
          strategy,
          assigned_agents: ['agent-1', 'agent-2']
        });

        const task = await claudeFlowService.orchestrateTask(testSession.id, {
          task: `Test task with ${strategy} strategy`,
          strategy,
          priority: 'medium'
        });

        expect(mockClaudeFlow.taskOrchestrate).toHaveBeenCalledWith({
          task: `Test task with ${strategy} strategy`,
          strategy,
          priority: 'medium'
        });

        expect(task.strategy).toBe(strategy);
        expect(task.status).toBe('running');
      }
    });

    test('Should handle task completion and results', async () => {
      const taskId = 'completion-task-123';
      
      mockClaudeFlow.taskResults.mockResolvedValue({
        task_id: taskId,
        status: 'completed',
        result: {
          output: 'Task completed successfully',
          metrics: {
            duration: 1500,
            tokens_used: 250,
            agents_involved: 2
          }
        }
      });

      const result = await claudeFlowService.getTaskResults(taskId);

      expect(result.status).toBe('completed');
      expect(result.result.output).toBe('Task completed successfully');
      expect(result.result.metrics.duration).toBe(1500);
    });

    test('Should handle task failures and retries', async () => {
      mockClaudeFlow.taskOrchestrate.mockRejectedValueOnce(new Error('Task orchestration failed'));
      mockClaudeFlow.taskOrchestrate.mockResolvedValueOnce({
        task_id: 'retry-task-123',
        status: 'running',
        retry_count: 1
      });

      // Should retry on failure
      const task = await claudeFlowService.orchestrateTask(testSession.id, {
        task: 'Retry test task',
        max_retries: 2
      });

      expect(mockClaudeFlow.taskOrchestrate).toHaveBeenCalledTimes(2);
      expect(task.task_id).toBe('retry-task-123');
    });

    test('Should track task metrics in session', async () => {
      mockClaudeFlow.taskOrchestrate.mockResolvedValue({
        task_id: 'metrics-task-123',
        status: 'completed'
      });

      await claudeFlowService.orchestrateTask(testSession.id, {
        task: 'Metrics tracking test'
      });

      // Check if session metrics were updated
      const session = await db.query(
        'SELECT metrics FROM claude_flow_sessions WHERE id = $1',
        [testSession.id]
      );

      expect(session.rows[0].metrics.tasks_completed).toBeGreaterThan(0);
    });
  });

  describe('Neural Pattern Classification', () => {
    test('Should train neural patterns from feed data', async () => {
      // Create test feed items
      await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES 
        ($1, 'AI Research Article', 'Latest advances in artificial intelligence', 'https://example.com/ai1', 'ai1hash'),
        ($1, 'Machine Learning News', 'New ML algorithms breakthrough', 'https://example.com/ml1', 'ml1hash'),
        ($1, 'Tech Industry Update', 'Technology industry quarterly report', 'https://example.com/tech1', 'tech1hash')
      `, [testFeed.id]);

      mockClaudeFlow.neuralTrain.mockResolvedValue({
        pattern_id: 'pattern-123',
        pattern_type: 'classification',
        confidence_score: 0.92,
        training_data: {
          samples: 3,
          epochs: 50,
          accuracy: 0.95
        }
      });

      const pattern = await claudeFlowService.trainNeuralPattern(testFeed.id, {
        pattern_type: 'classification',
        training_data: 'feed_items'
      });

      expect(mockClaudeFlow.neuralTrain).toHaveBeenCalledWith({
        pattern_type: 'classification',
        training_data: expect.any(String)
      });

      expect(pattern.pattern_type).toBe('classification');
      expect(pattern.confidence_score).toBe(0.92);
    });

    test('Should analyze neural patterns for content classification', async () => {
      mockClaudeFlow.neuralPatterns.mockResolvedValue({
        patterns: [
          {
            pattern_type: 'content_classification',
            categories: ['technology', 'artificial_intelligence', 'research'],
            confidence: 0.89
          },
          {
            pattern_type: 'sentiment_analysis',
            sentiment: 'positive',
            confidence: 0.76
          }
        ]
      });

      const analysis = await claudeFlowService.analyzeContent({
        title: 'Revolutionary AI Algorithm',
        content: 'Scientists develop groundbreaking artificial intelligence algorithm'
      });

      expect(analysis.patterns).toHaveLength(2);
      expect(analysis.patterns[0].categories).toContain('artificial_intelligence');
      expect(analysis.patterns[1].sentiment).toBe('positive');
    });

    test('Should store learned patterns in database', async () => {
      const patternData = {
        pattern_type: 'optimization',
        pattern_data: {
          algorithm: 'neural_network',
          parameters: { layers: 3, neurons: 128 },
          performance: { accuracy: 0.94, loss: 0.06 }
        },
        confidence_score: 0.94
      };

      const storedPattern = await claudeFlowService.storeNeuralPattern(
        testFeed.id,
        testSession.id,
        patternData
      );

      expect(storedPattern).toHaveProperty('id');
      expect(storedPattern.pattern_type).toBe('optimization');
      expect(storedPattern.confidence_score).toBe('0.9400');
      
      // Verify in database
      const dbPattern = await db.query(
        'SELECT * FROM neural_patterns WHERE id = $1',
        [storedPattern.id]
      );
      
      expect(dbPattern.rows[0].pattern_data.algorithm).toBe('neural_network');
    });

    test('Should retrieve patterns by confidence threshold', async () => {
      const patterns = await claudeFlowService.getNeuralPatterns(testFeed.id, {
        min_confidence: 0.8
      });

      expect(Array.isArray(patterns)).toBe(true);
      patterns.forEach(pattern => {
        expect(parseFloat(pattern.confidence_score)).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('Memory Management and Persistence', () => {
    test('Should store and retrieve session memory', async () => {
      mockClaudeFlow.memoryUsage.mockResolvedValue({
        action: 'store',
        key: 'session_context',
        stored: true
      });

      const memoryData = {
        feed_analysis: {
          total_items: 150,
          categories: ['tech', 'ai', 'science'],
          trends: ['increasing_ai_content', 'positive_sentiment']
        },
        agent_insights: {
          researcher: 'High-quality technical content detected',
          analyzer: 'Positive sentiment trend confirmed'
        }
      };

      await claudeFlowService.storeMemory(testSession.id, 'session_context', memoryData);

      expect(mockClaudeFlow.memoryUsage).toHaveBeenCalledWith({
        action: 'store',
        key: 'session_context',
        value: JSON.stringify(memoryData),
        namespace: `session_${testSession.id}`
      });
    });

    test('Should retrieve stored memory for context restoration', async () => {
      const storedMemory = {
        feed_analysis: {
          total_items: 150,
          categories: ['tech', 'ai', 'science']
        }
      };

      mockClaudeFlow.memoryUsage.mockResolvedValue({
        action: 'retrieve',
        key: 'session_context',
        value: JSON.stringify(storedMemory)
      });

      const retrievedMemory = await claudeFlowService.getMemory(testSession.id, 'session_context');

      expect(retrievedMemory.feed_analysis.total_items).toBe(150);
      expect(retrievedMemory.feed_analysis.categories).toContain('ai');
    });

    test('Should handle memory persistence across sessions', async () => {
      // Store memory in current session
      await claudeFlowService.storeMemory(testSession.id, 'learned_patterns', {
        content_types: ['technical', 'news', 'research'],
        successful_classifications: 47
      });

      // Create new session
      mockClaudeFlow.swarmInit.mockResolvedValue({
        swarm_id: 'new-swarm-456',
        topology: 'mesh',
        status: 'initialized'
      });

      const newSession = await claudeFlowService.initializeSession(testUser.id, {
        topology: 'mesh',
        restore_from_session: testSession.id
      });

      // Should be able to access memory from previous session
      mockClaudeFlow.memoryUsage.mockResolvedValue({
        action: 'retrieve',
        value: JSON.stringify({
          content_types: ['technical', 'news', 'research'],
          successful_classifications: 47
        })
      });

      const restoredMemory = await claudeFlowService.getMemory(newSession.id, 'learned_patterns');
      
      expect(restoredMemory.successful_classifications).toBe(47);
      
      // Cleanup
      await db.query('DELETE FROM claude_flow_sessions WHERE id = $1', [newSession.id]);
    });
  });

  describe('Automatic Background Orchestration', () => {
    test('Should trigger automation on new feed items', async () => {
      // Create feed item
      const itemResult = await db.query(`
        INSERT INTO feed_items (feed_id, title, content, url, content_hash) 
        VALUES ($1, $2, $3, $4, $5) 
        RETURNING *
      `, [testFeed.id, 'New AI Breakthrough', 
          'Scientists achieve new milestone in artificial intelligence research', 
          'https://example.com/new-ai', 'newaihash']);
      
      const feedItem = itemResult.rows[0];

      mockClaudeFlow.taskOrchestrate.mockResolvedValue({
        task_id: 'auto-task-123',
        status: 'running',
        trigger: 'new_item_automation'
      });

      // Trigger automation
      const automation = await claudeFlowService.triggerFeedAutomation(testFeed.id, feedItem.id);

      expect(automation.task_id).toBe('auto-task-123');
      expect(automation.trigger).toBe('new_item_automation');
    });

    test('Should apply learned patterns to new content', async () => {
      // Store a learned pattern first
      await claudeFlowService.storeNeuralPattern(testFeed.id, testSession.id, {
        pattern_type: 'content_classification',
        pattern_data: {
          keywords: ['AI', 'machine learning', 'neural network'],
          category: 'artificial_intelligence',
          confidence_threshold: 0.8
        },
        confidence_score: 0.92
      });

      mockClaudeFlow.neuralPatterns.mockResolvedValue({
        classification: {
          category: 'artificial_intelligence',
          confidence: 0.89,
          matched_patterns: ['content_classification']
        }
      });

      const classification = await claudeFlowService.classifyContent(testFeed.id, {
        title: 'New Neural Network Architecture',
        content: 'Researchers propose novel AI architecture using machine learning'
      });

      expect(classification.classification.category).toBe('artificial_intelligence');
      expect(classification.classification.confidence).toBe(0.89);
    });

    test('Should coordinate multiple agents for complex tasks', async () => {
      mockClaudeFlow.taskOrchestrate.mockResolvedValue({
        task_id: 'complex-task-123',
        status: 'running',
        agents: [
          { id: 'researcher-1', role: 'content_analysis' },
          { id: 'analyzer-1', role: 'sentiment_analysis' },
          { id: 'optimizer-1', role: 'result_synthesis' }
        ],
        strategy: 'adaptive'
      });

      const coordination = await claudeFlowService.coordinateMultiAgentTask(testSession.id, {
        task: 'Comprehensive feed item analysis',
        requirements: {
          content_analysis: true,
          sentiment_analysis: true,
          trend_detection: true,
          result_synthesis: true
        }
      });

      expect(coordination.agents).toHaveLength(3);
      expect(coordination.strategy).toBe('adaptive');
      expect(coordination.agents.find(a => a.role === 'content_analysis')).toBeDefined();
    });
  });

  describe('Performance and Error Handling', () => {
    test('Should handle Claude Flow service unavailability', async () => {
      mockClaudeFlow.swarmInit.mockRejectedValue(new Error('Service unavailable'));

      await expect(claudeFlowService.initializeSession(testUser.id, {
        topology: 'mesh'
      })).rejects.toThrow('Service unavailable');
    });

    test('Should implement timeout for long-running tasks', async () => {
      jest.setTimeout(10000);
      
      mockClaudeFlow.taskOrchestrate.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      await expect(claudeFlowService.orchestrateTask(testSession.id, {
        task: 'Long running task',
        timeout: 1000
      })).rejects.toThrow(/timeout/i);
    });

    test('Should retry failed operations with exponential backoff', async () => {
      mockClaudeFlow.neuralTrain
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          pattern_id: 'retry-pattern-123',
          status: 'completed'
        });

      const pattern = await claudeFlowService.trainNeuralPattern(testFeed.id, {
        pattern_type: 'classification',
        max_retries: 3
      });

      expect(mockClaudeFlow.neuralTrain).toHaveBeenCalledTimes(3);
      expect(pattern.pattern_id).toBe('retry-pattern-123');
    });

    test('Should track performance metrics', async () => {
      const startTime = Date.now();
      
      mockClaudeFlow.taskOrchestrate.mockResolvedValue({
        task_id: 'perf-task-123',
        status: 'completed',
        metrics: {
          duration: 1500,
          tokens_used: 250,
          cpu_time: 800
        }
      });

      const result = await claudeFlowService.orchestrateTask(testSession.id, {
        task: 'Performance test task'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.metrics.duration).toBe(1500);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Session Lifecycle Management', () => {
    test('Should properly end sessions and cleanup resources', async () => {
      mockClaudeFlow.swarmStatus.mockResolvedValue({
        status: 'active',
        agents: [{ id: 'agent-1', status: 'active' }]
      });

      await claudeFlowService.endSession(testSession.id);

      // Check if session is marked as completed
      const session = await db.query(
        'SELECT status, ended_at FROM claude_flow_sessions WHERE id = $1',
        [testSession.id]
      );

      expect(session.rows[0].status).toBe('completed');
      expect(session.rows[0].ended_at).not.toBeNull();
    });

    test('Should generate session summary report', async () => {
      const summary = await claudeFlowService.generateSessionSummary(testSession.id);

      expect(summary).toHaveProperty('session_id', testSession.id);
      expect(summary).toHaveProperty('metrics');
      expect(summary).toHaveProperty('agents_spawned');
      expect(summary).toHaveProperty('tasks_completed');
      expect(summary).toHaveProperty('neural_patterns_learned');
      expect(summary).toHaveProperty('duration');
    });
  });
});

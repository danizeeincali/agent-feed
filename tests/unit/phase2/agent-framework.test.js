/**
 * Phase 2 Tests: Agent Framework & Claude Code Integration
 * London School TDD - Mock-driven agent lifecycle and tool integration
 */

import { MockFactory } from '../../factories/mock-factory.js';
import { AgentFramework } from '../../../src/agents/framework.js';
import { ClaudeCodeIntegration } from '../../../src/integrations/claude-code.js';
import { AgentConfigLoader } from '../../../src/agents/config-loader.js';

describe('Phase 2: Agent Framework & Claude Code Integration', () => {
  let mockFactory;
  let mockClaudeCodeTools;
  let mockAgentLinkAPI;
  let mockSwarmCoordination;
  let mockFileSystem;
  let mockLogger;

  beforeEach(() => {
    mockFactory = new MockFactory();
    mockClaudeCodeTools = mockFactory.createClaudeCodeMocks();
    mockAgentLinkAPI = mockFactory.createAgentLinkMocks();
    mockSwarmCoordination = mockFactory.createSwarmMocks();
    
    mockFileSystem = {
      readConfig: jest.fn(),
      validatePath: jest.fn(),
      ensureDirectory: jest.fn()
    };
    
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn()
    };
  });

  describe('Agent Configuration Loading', () => {
    it('should load 21+ agent configurations from MD files', async () => {
      // Arrange
      const configLoader = new AgentConfigLoader(mockFileSystem, mockLogger);
      const expectedAgentTypes = [
        'coder', 'reviewer', 'tester', 'planner', 'researcher',
        'hierarchical-coordinator', 'mesh-coordinator', 'adaptive-coordinator',
        'byzantine-coordinator', 'raft-manager', 'gossip-coordinator',
        'perf-analyzer', 'performance-benchmarker', 'task-orchestrator',
        'github-modes', 'pr-manager', 'code-review-swarm',
        'sparc-coord', 'sparc-coder', 'specification', 'pseudocode'
      ];

      mockFileSystem.readConfig.mockImplementation((agentType) => ({
        name: agentType,
        type: 'md-config',
        capabilities: [`${agentType}-capability`],
        tools: ['Read', 'Write', 'Edit', 'Bash'],
        coordination: { handoff: true, messaging: true }
      }));

      // Act
      const loadedConfigs = await configLoader.loadAllAgentConfigs();

      // Assert - Verify all expected agents loaded
      expect(loadedConfigs).toHaveLength(expectedAgentTypes.length);
      expectedAgentTypes.forEach(agentType => {
        expect(mockFileSystem.readConfig).toHaveBeenCalledWith(
          expect.stringContaining(agentType)
        );
      });

      // Verify configuration structure
      loadedConfigs.forEach(config => {
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('capabilities');
        expect(config).toHaveProperty('tools');
        expect(config.tools).toContain('Read');
      });
    });

    it('should validate agent configuration schema', async () => {
      // Arrange
      const configLoader = new AgentConfigLoader(mockFileSystem, mockLogger);
      const invalidConfig = {
        name: 'test-agent',
        // Missing required fields: capabilities, tools
      };

      mockFileSystem.readConfig.mockResolvedValue(invalidConfig);

      // Act & Assert
      await expect(configLoader.validateAgentConfig(invalidConfig))
        .rejects.toThrow('Invalid agent configuration');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Missing required field: capabilities')
      );
    });

    it('should handle configuration loading failures gracefully', async () => {
      // Arrange
      const configLoader = new AgentConfigLoader(mockFileSystem, mockLogger);
      mockFileSystem.readConfig.mockRejectedValue(new Error('File not found'));

      // Act
      const result = await configLoader.loadAgentConfig('nonexistent-agent');

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load agent config')
      );
    });
  });

  describe('Agent Lifecycle Management', () => {
    it('should initialize agent with Claude Code tool integration', async () => {
      // Arrange
      const framework = new AgentFramework(mockClaudeCodeTools, mockLogger);
      const agentConfig = {
        name: 'coder',
        capabilities: ['file-editing', 'syntax-checking'],
        tools: ['Read', 'Write', 'Edit', 'Bash'],
        initialization: {
          workingDirectory: '/workspace',
          environment: { NODE_ENV: 'test' }
        }
      };

      mockClaudeCodeTools.LS.mockResolvedValue({
        success: true,
        files: ['src/', 'tests/'],
        path: '/workspace'
      });

      // Act
      const agent = await framework.initializeAgent(agentConfig);

      // Assert - Verify agent initialization
      expect(agent.id).toBeDefined();
      expect(agent.name).toBe('coder');
      expect(agent.status).toBe('initialized');

      // Verify Claude Code tools are properly injected
      expect(agent.tools).toHaveProperty('Read');
      expect(agent.tools).toHaveProperty('Write');
      expect(agent.tools).toHaveProperty('Edit');
      expect(agent.tools).toHaveProperty('Bash');

      // Verify working directory setup
      expect(mockClaudeCodeTools.LS).toHaveBeenCalledWith('/workspace');
    });

    it('should handle agent execution with tool orchestration', async () => {
      // Arrange
      const framework = new AgentFramework(mockClaudeCodeTools, mockLogger);
      const agent = await framework.createAgent({
        name: 'coder',
        capabilities: ['file-editing']
      });

      const task = {
        action: 'create_file',
        file: '/workspace/src/index.js',
        content: 'console.log("Hello World");'
      };

      mockClaudeCodeTools.Write.mockResolvedValue({
        success: true,
        path: '/workspace/src/index.js',
        bytesWritten: 28
      });

      // Act
      const result = await agent.execute(task);

      // Assert - Verify tool orchestration
      expect(mockClaudeCodeTools.Write).toHaveBeenCalledWith(
        '/workspace/src/index.js',
        'console.log("Hello World");'
      );

      expect(result).toEqual({
        success: true,
        action: 'create_file',
        details: expect.objectContaining({
          path: '/workspace/src/index.js',
          bytesWritten: 28
        })
      });
    });

    it('should coordinate agent handoff with context preservation', async () => {
      // Arrange
      const framework = new AgentFramework(mockClaudeCodeTools, mockLogger);
      const sourceAgent = await framework.createAgent({ name: 'coder' });
      const targetAgent = await framework.createAgent({ name: 'tester' });

      const handoffContext = {
        completedTask: 'file_creation',
        artifacts: ['/workspace/src/index.js'],
        nextAction: 'write_tests',
        metadata: { fileType: 'javascript' }
      };

      mockSwarmCoordination.sendMessage.mockResolvedValue({
        messageId: 'msg-123',
        delivered: true
      });

      // Act
      const handoffResult = await framework.handoffAgent(
        sourceAgent,
        targetAgent,
        handoffContext
      );

      // Assert - Verify handoff coordination
      expect(mockSwarmCoordination.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          from: sourceAgent.id,
          to: targetAgent.id,
          type: 'handoff',
          context: handoffContext
        })
      );

      expect(handoffResult).toEqual({
        success: true,
        handoffId: expect.any(String),
        sourceAgent: sourceAgent.id,
        targetAgent: targetAgent.id
      });

      // Verify context preservation
      expect(targetAgent.context).toEqual(
        expect.objectContaining(handoffContext)
      );
    });
  });

  describe('Claude Code Tool Integration', () => {
    it('should mock file operations for agent testing', async () => {
      // Arrange
      const claudeIntegration = new ClaudeCodeIntegration(mockClaudeCodeTools);
      const agent = { id: 'agent-123', name: 'coder' };

      // Act - Execute file read operation
      const readResult = await claudeIntegration.executeRead(
        agent,
        '/workspace/src/index.js'
      );

      // Assert - Verify mock behavior
      expect(mockClaudeCodeTools.Read).toHaveBeenCalledWith('/workspace/src/index.js');
      expect(readResult).toEqual({
        success: true,
        content: expect.stringContaining('Mock content'),
        lines: expect.any(Array)
      });
    });

    it('should handle batch file operations through MultiEdit', async () => {
      // Arrange
      const claudeIntegration = new ClaudeCodeIntegration(mockClaudeCodeTools);
      const agent = { id: 'agent-123', name: 'coder' };
      
      const edits = [
        { oldString: 'const x = 1;', newString: 'const x = 2;' },
        { oldString: 'console.log(x);', newString: 'console.log(x * 2);' }
      ];

      mockClaudeCodeTools.MultiEdit.mockResolvedValue({
        success: true,
        path: '/workspace/src/index.js',
        changes: 2
      });

      // Act
      const editResult = await claudeIntegration.executeMultiEdit(
        agent,
        '/workspace/src/index.js',
        edits
      );

      // Assert - Verify batch editing
      expect(mockClaudeCodeTools.MultiEdit).toHaveBeenCalledWith(
        '/workspace/src/index.js',
        edits
      );

      expect(editResult.changes).toBe(2);
    });

    it('should integrate with AgentLink API for execution tracking', async () => {
      // Arrange
      const claudeIntegration = new ClaudeCodeIntegration(
        mockClaudeCodeTools,
        mockAgentLinkAPI
      );
      const agent = { id: 'agent-123', name: 'coder' };

      mockAgentLinkAPI.postAgentExecution.mockResolvedValue({
        id: 'exec-456',
        status: 'completed'
      });

      // Act
      const result = await claudeIntegration.executeWithTracking(
        agent,
        'Write',
        ['/workspace/test.js', 'test content']
      );

      // Assert - Verify execution tracking
      expect(mockClaudeCodeTools.Write).toHaveBeenCalledWith(
        '/workspace/test.js',
        'test content'
      );

      expect(mockAgentLinkAPI.postAgentExecution).toHaveBeenCalledWith({
        agentId: 'agent-123',
        agentName: 'coder',
        tool: 'Write',
        arguments: ['/workspace/test.js', 'test content'],
        timestamp: expect.any(String)
      });
    });
  });

  describe('Agent Error Handling and Resilience', () => {
    it('should handle Claude Code tool failures gracefully', async () => {
      // Arrange
      const framework = new AgentFramework(mockClaudeCodeTools, mockLogger);
      const agent = await framework.createAgent({ name: 'coder' });

      mockClaudeCodeTools.Write.mockRejectedValue(new Error('Disk space full'));

      // Act
      const result = await agent.execute({
        action: 'create_file',
        file: '/workspace/large-file.js',
        content: 'x'.repeat(1000000)
      });

      // Assert - Verify error handling
      expect(result).toEqual({
        success: false,
        error: 'Disk space full',
        action: 'create_file',
        recoverable: true
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Agent execution failed')
      );
    });

    it('should implement retry logic for transient failures', async () => {
      // Arrange
      const framework = new AgentFramework(mockClaudeCodeTools, mockLogger);
      const agent = await framework.createAgent({
        name: 'coder',
        retryPolicy: { maxRetries: 3, backoffMs: 100 }
      });

      mockClaudeCodeTools.Read
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ success: true, content: 'file content' });

      // Act
      const result = await agent.execute({
        action: 'read_file',
        file: '/workspace/src/index.js'
      });

      // Assert - Verify retry mechanism
      expect(mockClaudeCodeTools.Read).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Retrying operation')
      );
    });

    it('should validate agent capabilities before task execution', async () => {
      // Arrange
      const framework = new AgentFramework(mockClaudeCodeTools, mockLogger);
      const agent = await framework.createAgent({
        name: 'reviewer',
        capabilities: ['code-review', 'quality-analysis']
      });

      const invalidTask = {
        action: 'compile_code', // Not in agent capabilities
        language: 'rust'
      };

      // Act
      const result = await agent.execute(invalidTask);

      // Assert - Verify capability validation
      expect(result).toEqual({
        success: false,
        error: 'Agent does not have capability: code-compilation',
        validCapabilities: ['code-review', 'quality-analysis']
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Capability mismatch')
      );
    });
  });
});
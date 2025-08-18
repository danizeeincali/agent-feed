/**
 * Mock Factory - London School TDD Mock Creation
 * Centralized mock creation for consistent test doubles
 */

import { jest } from '@jest/globals';

export class MockFactory {
  constructor() {
    this.createdMocks = new Map();
    this.mockConfigurations = new Map();
  }

  /**
   * Create Claude Code Tool mocks
   */
  createClaudeCodeMocks() {
    const claudeCodeMocks = {
      // File operations
      Read: jest.fn().mockImplementation((filePath) => ({
        success: true,
        content: `// Mock content for ${filePath}`,
        lines: ['line1', 'line2', 'line3']
      })),
      
      Write: jest.fn().mockImplementation((filePath, content) => ({
        success: true,
        path: filePath,
        bytesWritten: content.length
      })),
      
      Edit: jest.fn().mockImplementation((filePath, oldString, newString) => ({
        success: true,
        path: filePath,
        changes: 1
      })),
      
      MultiEdit: jest.fn().mockImplementation((filePath, edits) => ({
        success: true,
        path: filePath,
        changes: edits.length
      })),
      
      // Search operations
      Glob: jest.fn().mockImplementation((pattern) => ({
        files: [`mock-file-1.js`, `mock-file-2.js`],
        pattern
      })),
      
      Grep: jest.fn().mockImplementation((pattern, options = {}) => ({
        matches: [
          { file: 'mock-file.js', line: 1, content: `Mock match for ${pattern}` }
        ],
        pattern,
        totalMatches: 1
      })),
      
      // System operations
      Bash: jest.fn().mockImplementation((command) => ({
        success: true,
        stdout: `Mock output for: ${command}`,
        stderr: '',
        exitCode: 0
      })),
      
      // Listing operations
      LS: jest.fn().mockImplementation((path) => ({
        success: true,
        files: ['mock-file1.js', 'mock-file2.js'],
        directories: ['mock-dir1', 'mock-dir2'],
        path
      }))
    };

    this.createdMocks.set('claudeCode', claudeCodeMocks);
    return claudeCodeMocks;
  }

  /**
   * Create AgentLink API mocks
   */
  createAgentLinkMocks() {
    const agentLinkMocks = {
      // Agent execution tracking
      postAgentExecution: jest.fn().mockResolvedValue({
        id: 'exec-123',
        agentName: 'mock-agent',
        status: 'completed',
        timestamp: new Date().toISOString()
      }),
      
      // Activity logging
      postActivity: jest.fn().mockResolvedValue({
        id: 'activity-456',
        type: 'file_operation',
        details: { action: 'write', file: 'mock-file.js' },
        timestamp: new Date().toISOString()
      }),
      
      // Project updates
      updateProject: jest.fn().mockResolvedValue({
        id: 'project-789',
        name: 'mock-project',
        lastUpdated: new Date().toISOString()
      }),
      
      // WebSocket events
      emitWebSocketEvent: jest.fn().mockResolvedValue({
        success: true,
        eventType: 'agent_update',
        recipients: ['user-123']
      }),
      
      // Health check
      healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString()
      })
    };

    this.createdMocks.set('agentLink', agentLinkMocks);
    return agentLinkMocks;
  }

  /**
   * Create Swarm Coordination mocks
   */
  createSwarmMocks() {
    const swarmMocks = {
      // Agent spawning
      spawnAgent: jest.fn().mockResolvedValue({
        id: 'agent-123',
        type: 'mock-agent',
        status: 'active',
        capabilities: ['mock-capability']
      }),
      
      // Task orchestration
      orchestrateTask: jest.fn().mockResolvedValue({
        taskId: 'task-456',
        assignedAgents: ['agent-123'],
        status: 'in_progress'
      }),
      
      // Agent communication
      sendMessage: jest.fn().mockResolvedValue({
        messageId: 'msg-789',
        from: 'agent-123',
        to: 'agent-456',
        delivered: true
      }),
      
      // Consensus building
      buildConsensus: jest.fn().mockResolvedValue({
        consensusId: 'consensus-123',
        agreement: true,
        participants: ['agent-123', 'agent-456']
      }),
      
      // Memory coordination
      shareMemory: jest.fn().mockResolvedValue({
        memoryId: 'memory-789',
        shared: true,
        recipients: ['agent-123']
      })
    };

    this.createdMocks.set('swarm', swarmMocks);
    return swarmMocks;
  }

  /**
   * Create Agent Configuration mocks
   */
  createAgentMocks(agentType) {
    const agentMocks = {
      // Agent lifecycle
      initialize: jest.fn().mockResolvedValue({
        agentId: `${agentType}-123`,
        status: 'initialized',
        capabilities: this.getAgentCapabilities(agentType)
      }),
      
      execute: jest.fn().mockResolvedValue({
        result: `Mock execution result for ${agentType}`,
        success: true,
        duration: 1000
      }),
      
      cleanup: jest.fn().mockResolvedValue({
        cleaned: true,
        resources: ['mock-resource-1', 'mock-resource-2']
      }),
      
      // Agent communication
      receiveMessage: jest.fn().mockResolvedValue({
        processed: true,
        response: `Mock response from ${agentType}`
      }),
      
      sendMessage: jest.fn().mockResolvedValue({
        sent: true,
        messageId: 'msg-123'
      }),
      
      // Agent coordination
      handoff: jest.fn().mockResolvedValue({
        handoffId: 'handoff-123',
        targetAgent: 'next-agent',
        success: true
      }),
      
      reportStatus: jest.fn().mockResolvedValue({
        agentId: `${agentType}-123`,
        status: 'active',
        currentTask: 'mock-task'
      })
    };

    this.createdMocks.set(`agent-${agentType}`, agentMocks);
    return agentMocks;
  }

  /**
   * Create Database mocks
   */
  createDatabaseMocks() {
    const databaseMocks = {
      // Connection management
      connect: jest.fn().mockResolvedValue({
        connected: true,
        connectionId: 'conn-123'
      }),
      
      disconnect: jest.fn().mockResolvedValue({
        disconnected: true
      }),
      
      // CRUD operations
      create: jest.fn().mockResolvedValue({
        id: 'record-123',
        created: true,
        timestamp: new Date().toISOString()
      }),
      
      read: jest.fn().mockResolvedValue({
        id: 'record-123',
        data: { mock: 'data' },
        found: true
      }),
      
      update: jest.fn().mockResolvedValue({
        id: 'record-123',
        updated: true,
        changes: 1
      }),
      
      delete: jest.fn().mockResolvedValue({
        id: 'record-123',
        deleted: true
      }),
      
      // Query operations
      query: jest.fn().mockResolvedValue({
        results: [{ id: 1, data: 'mock' }],
        count: 1
      }),
      
      // Transaction management
      beginTransaction: jest.fn().mockResolvedValue({
        transactionId: 'tx-123',
        started: true
      }),
      
      commit: jest.fn().mockResolvedValue({
        committed: true
      }),
      
      rollback: jest.fn().mockResolvedValue({
        rolledBack: true
      })
    };

    this.createdMocks.set('database', databaseMocks);
    return databaseMocks;
  }

  /**
   * Get agent capabilities by type
   */
  getAgentCapabilities(agentType) {
    const capabilities = {
      'coder': ['file-editing', 'syntax-checking', 'code-generation'],
      'tester': ['test-writing', 'test-execution', 'coverage-analysis'],
      'reviewer': ['code-review', 'quality-analysis', 'best-practices'],
      'researcher': ['information-gathering', 'analysis', 'documentation'],
      'coordinator': ['task-orchestration', 'agent-management', 'workflow-control']
    };
    
    return capabilities[agentType] || ['general-purpose'];
  }

  /**
   * Configure mock behavior
   */
  configureMock(mockName, configuration) {
    this.mockConfigurations.set(mockName, configuration);
    const mock = this.createdMocks.get(mockName);
    
    if (mock && configuration) {
      Object.keys(configuration).forEach(method => {
        if (mock[method] && configuration[method]) {
          mock[method].mockImplementation(configuration[method]);
        }
      });
    }
  }

  /**
   * Reset all mocks
   */
  resetAllMocks() {
    this.createdMocks.forEach(mock => {
      if (typeof mock === 'object') {
        Object.values(mock).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset();
          }
        });
      }
    });
  }

  /**
   * Get mock by name
   */
  getMock(mockName) {
    return this.createdMocks.get(mockName);
  }

  /**
   * Verify all mocks
   */
  verifyAllMocks() {
    const verificationResults = {};
    
    this.createdMocks.forEach((mock, name) => {
      verificationResults[name] = {
        called: Object.values(mock).some(method => 
          jest.isMockFunction(method) && method.mock.calls.length > 0
        ),
        callCounts: Object.fromEntries(
          Object.entries(mock)
            .filter(([, method]) => jest.isMockFunction(method))
            .map(([methodName, method]) => [methodName, method.mock.calls.length])
        )
      };
    });
    
    return verificationResults;
  }
}

export default MockFactory;
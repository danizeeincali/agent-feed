/**
 * Agent Discovery Service Mock
 * London School TDD - Behavior-Driven Mocks
 */

const { jest } = require('@jest/globals');

/**
 * Mock factory for Agent Discovery Service
 * Following London School pattern: Mock-first, behavior verification
 */
class AgentDiscoveryServiceMock {
  constructor() {
    this.scanAgentsDirectory = jest.fn();
    this.parseAgentMetadata = jest.fn();
    this.watchFileSystem = jest.fn();
    this.getAgentStatus = jest.fn();
    this.refreshAgentList = jest.fn();
    this.validateAgentStructure = jest.fn();
  }

  /**
   * Factory method to create mock with default behaviors
   */
  static createWithDefaults() {
    const mock = new AgentDiscoveryServiceMock();
    
    // Default successful behaviors
    mock.scanAgentsDirectory.mockResolvedValue([
      {
        id: 'personal-todos-agent',
        path: '/workspaces/agent-feed/prod/agent_workspace/personal-todos-agent',
        type: 'posting-agent',
        status: 'active'
      },
      {
        id: 'meeting-next-steps-agent',
        path: '/workspaces/agent-feed/prod/agent_workspace/meeting-next-steps-agent',
        type: 'posting-agent',
        status: 'active'
      },
      {
        id: 'agent-ideas-agent',
        path: '/workspaces/agent-feed/prod/agent_workspace/agent-ideas-agent',
        type: 'posting-agent',
        status: 'inactive'
      }
    ]);

    mock.parseAgentMetadata.mockImplementation((agentPath) => {
      const metadata = {
        'personal-todos-agent': {
          name: 'Personal TODOs Agent',
          description: 'Manages and tracks personal tasks and objectives',
          version: '1.0.0',
          author: 'System',
          tags: ['productivity', 'personal', 'todos'],
          capabilities: ['task-creation', 'priority-management', 'completion-tracking'],
          dependencies: ['posting-intelligence'],
          configuration: {
            maxTasks: 50,
            priorityLevels: ['P1', 'P2', 'P3', 'P4']
          },
          metrics: {
            tasksCompleted: 127,
            averageCompletionTime: '2.3 days',
            successRate: 0.92
          }
        },
        'meeting-next-steps-agent': {
          name: 'Meeting Next Steps Agent',
          description: 'Captures and tracks action items from meetings',
          version: '1.1.0',
          author: 'System',
          tags: ['meetings', 'action-items', 'follow-up'],
          capabilities: ['action-extraction', 'assignment-tracking', 'deadline-management'],
          dependencies: ['posting-intelligence', 'calendar-integration'],
          configuration: {
            maxActionItems: 100,
            defaultDeadlineDays: 7
          },
          metrics: {
            meetingsProcessed: 45,
            actionItemsTracked: 234,
            completionRate: 0.87
          }
        },
        'agent-ideas-agent': {
          name: 'Agent Ideas Generator',
          description: 'Generates and refines agent enhancement ideas',
          version: '0.9.0',
          author: 'System',
          tags: ['innovation', 'ideas', 'enhancement'],
          capabilities: ['idea-generation', 'feasibility-analysis', 'impact-assessment'],
          dependencies: ['posting-intelligence', 'pattern-recognition'],
          configuration: {
            ideaCategories: ['efficiency', 'features', 'integration'],
            minViabilityScore: 0.6
          },
          metrics: {
            ideasGenerated: 89,
            implementedIdeas: 12,
            averageImpactScore: 0.74
          }
        }
      };
      
      const agentId = agentPath.split('/').pop();
      return Promise.resolve(metadata[agentId] || {});
    });

    mock.getAgentStatus.mockImplementation((agentId) => {
      const statuses = {
        'personal-todos-agent': 'active',
        'meeting-next-steps-agent': 'active',
        'agent-ideas-agent': 'inactive'
      };
      return Promise.resolve(statuses[agentId] || 'unknown');
    });

    mock.validateAgentStructure.mockResolvedValue({ valid: true, errors: [] });
    mock.refreshAgentList.mockResolvedValue(true);
    mock.watchFileSystem.mockReturnValue({ unwatch: jest.fn() });

    return mock;
  }

  /**
   * Create mock for error scenarios
   */
  static createWithErrors() {
    const mock = new AgentDiscoveryServiceMock();
    
    mock.scanAgentsDirectory.mockRejectedValue(
      new Error('Failed to access agent directory')
    );
    mock.parseAgentMetadata.mockRejectedValue(
      new Error('Invalid YAML frontmatter')
    );
    mock.getAgentStatus.mockRejectedValue(
      new Error('Agent status check failed')
    );
    mock.validateAgentStructure.mockResolvedValue({
      valid: false,
      errors: ['Missing required files', 'Invalid configuration']
    });

    return mock;
  }

  /**
   * Create mock with empty results
   */
  static createEmpty() {
    const mock = new AgentDiscoveryServiceMock();
    
    mock.scanAgentsDirectory.mockResolvedValue([]);
    mock.parseAgentMetadata.mockResolvedValue({});
    mock.getAgentStatus.mockResolvedValue('unknown');
    mock.validateAgentStructure.mockResolvedValue({ valid: true, errors: [] });

    return mock;
  }

  /**
   * Verify collaboration patterns
   */
  verifyDiscoveryWorkflow() {
    expect(this.scanAgentsDirectory).toHaveBeenCalled();
    expect(this.parseAgentMetadata).toHaveBeenCalledAfter(this.scanAgentsDirectory);
    expect(this.getAgentStatus).toHaveBeenCalled();
  }

  /**
   * Verify error handling patterns
   */
  verifyErrorHandling() {
    // Verify that service continues to function despite individual agent errors
    expect(this.scanAgentsDirectory).toHaveBeenCalled();
    // Should still attempt to parse other agents even if one fails
    expect(this.parseAgentMetadata).toHaveBeenCalled();
  }
}

/**
 * WebSocket Mock for real-time agent updates
 */
class AgentWebSocketMock {
  constructor() {
    this.connect = jest.fn();
    this.disconnect = jest.fn();
    this.subscribe = jest.fn();
    this.unsubscribe = jest.fn();
    this.emit = jest.fn();
    this.on = jest.fn();
    this.off = jest.fn();
    
    // Mock connection states
    this.connected = false;
    this.subscriptions = new Set();
  }

  static createWithDefaults() {
    const mock = new AgentWebSocketMock();
    
    mock.connect.mockImplementation(() => {
      mock.connected = true;
      return Promise.resolve();
    });
    
    mock.disconnect.mockImplementation(() => {
      mock.connected = false;
      mock.subscriptions.clear();
      return Promise.resolve();
    });
    
    mock.subscribe.mockImplementation((event) => {
      mock.subscriptions.add(event);
      return Promise.resolve();
    });
    
    mock.unsubscribe.mockImplementation((event) => {
      mock.subscriptions.delete(event);
      return Promise.resolve();
    });

    return mock;
  }

  /**
   * Simulate agent status updates
   */
  simulateAgentUpdate(agentId, status) {
    const callback = this.on.mock.calls.find(call => call[0] === 'agent-status-change');
    if (callback && callback[1]) {
      callback[1]({ agentId, status, timestamp: Date.now() });
    }
  }

  /**
   * Verify WebSocket interaction patterns
   */
  verifyConnectionWorkflow() {
    expect(this.connect).toHaveBeenCalled();
    expect(this.subscribe).toHaveBeenCalledWith('agent-status-change');
    expect(this.on).toHaveBeenCalledWith('agent-status-change', expect.any(Function));
  }
}

/**
 * Agent Metadata Parser Mock
 */
class AgentMetadataParserMock {
  constructor() {
    this.parseYamlFrontmatter = jest.fn();
    this.validateMetadata = jest.fn();
    this.extractCapabilities = jest.fn();
    this.calculateMetrics = jest.fn();
  }

  static createWithDefaults() {
    const mock = new AgentMetadataParserMock();
    
    mock.parseYamlFrontmatter.mockImplementation((filePath) => {
      return Promise.resolve({
        name: 'Test Agent',
        description: 'Test agent description',
        version: '1.0.0',
        capabilities: ['test-capability']
      });
    });

    mock.validateMetadata.mockResolvedValue({ valid: true, errors: [] });
    mock.extractCapabilities.mockResolvedValue(['capability-1', 'capability-2']);
    mock.calculateMetrics.mockResolvedValue({ performance: 0.85, reliability: 0.92 });

    return mock;
  }
}

/**
 * File System Watcher Mock
 */
class FileSystemWatcherMock {
  constructor() {
    this.watch = jest.fn();
    this.unwatch = jest.fn();
    this.onChange = jest.fn();
    this.onError = jest.fn();
  }

  static createWithDefaults() {
    const mock = new FileSystemWatcherMock();
    
    mock.watch.mockImplementation(() => {
      return {
        unwatch: mock.unwatch,
        on: jest.fn()
      };
    });

    return mock;
  }

  /**
   * Simulate file system changes
   */
  simulateFileChange(filePath, changeType = 'modified') {
    const callback = this.onChange;
    if (callback.mock.calls.length > 0) {
      callback.mock.calls[0][0]({ filePath, changeType, timestamp: Date.now() });
    }
  }
}

module.exports = {
  AgentDiscoveryServiceMock,
  AgentWebSocketMock,
  AgentMetadataParserMock,
  FileSystemWatcherMock
};
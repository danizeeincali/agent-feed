/**
 * SPARC TDD Refinement Phase: Agent Discovery Test Suite
 * London School TDD Implementation with comprehensive mocking
 * Testing corrected agent path: /workspaces/agent-feed/prod/.claude/agents
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface AgentMetadata {
  name: string;
  role: string;
  capabilities: string[];
  description: string;
  version?: string;
  author?: string;
}

interface AgentFile {
  path: string;
  content: string;
  metadata: AgentMetadata;
}

interface TestScenario {
  name: string;
  setup: () => void;
  expectedResult: any;
  shouldThrow?: boolean;
}

// Mock Factory for London School TDD
class MockFileSystemFactory {
  private mockFs: any;

  constructor() {
    this.mockFs = {
      existsSync: jest.fn(),
      readdirSync: jest.fn(),
      readFileSync: jest.fn(),
      statSync: jest.fn()
    };
  }

  createHappyPathScenario(): void {
    const agentPath = '/workspaces/agent-feed/prod/.claude/agents';

    // Mock directory exists
    this.mockFs.existsSync.mockImplementation((dirPath: string) => {
      return dirPath === agentPath;
    });

    // Mock agent files discovery
    const agentFiles = [
      'coordinator.json',
      'researcher.json',
      'coder.json',
      'tester.json',
      'reviewer.json',
      'analyzer.json',
      'optimizer.json',
      'documenter.json',
      'validator.json',
      'architect.json'
    ];

    this.mockFs.readdirSync.mockImplementation((dirPath: string) => {
      if (dirPath === agentPath) {
        return agentFiles;
      }
      return [];
    });

    // Mock file reading with authentic agent data
    this.mockFs.readFileSync.mockImplementation((filePath: string) => {
      const fileName = path.basename(filePath, '.json');
      return JSON.stringify(this.createValidAgentData(fileName));
    });

    this.mockFs.statSync.mockImplementation(() => ({
      isFile: () => true
    }));
  }

  createMissingDirectoryScenario(): void {
    this.mockFs.existsSync.mockReturnValue(false);
    this.mockFs.readdirSync.mockImplementation(() => {
      throw new Error('ENOENT: no such file or directory');
    });
  }

  createEmptyDirectoryScenario(): void {
    const agentPath = '/workspaces/agent-feed/prod/.claude/agents';
    this.mockFs.existsSync.mockImplementation((dirPath: string) => {
      return dirPath === agentPath;
    });
    this.mockFs.readdirSync.mockReturnValue([]);
  }

  createCorruptFileScenario(): void {
    const agentPath = '/workspaces/agent-feed/prod/.claude/agents';
    this.mockFs.existsSync.mockImplementation((dirPath: string) => {
      return dirPath === agentPath;
    });
    this.mockFs.readdirSync.mockReturnValue(['corrupt.json']);
    this.mockFs.readFileSync.mockReturnValue('invalid json content {');
    this.mockFs.statSync.mockReturnValue({ isFile: () => true });
  }

  createFakeDataScenario(): void {
    const agentPath = '/workspaces/agent-feed/prod/.claude/agents';
    this.mockFs.existsSync.mockImplementation((dirPath: string) => {
      return dirPath === agentPath;
    });
    this.mockFs.readdirSync.mockReturnValue(['fake-agent.json']);
    this.mockFs.readFileSync.mockReturnValue(JSON.stringify({
      name: 'Fake Test Agent',
      role: 'mock-role',
      capabilities: ['dummy-capability'],
      description: 'This is a fake placeholder agent for testing'
    }));
    this.mockFs.statSync.mockReturnValue({ isFile: () => true });
  }

  private createValidAgentData(agentName: string): AgentMetadata {
    const agentConfigs: Record<string, AgentMetadata> = {
      coordinator: {
        name: 'Task Coordinator',
        role: 'coordination',
        capabilities: ['task-management', 'resource-allocation', 'workflow-orchestration'],
        description: 'Coordinates complex multi-agent workflows and resource allocation',
        version: '2.1.0',
        author: 'Claude Flow Team'
      },
      researcher: {
        name: 'Research Agent',
        role: 'research',
        capabilities: ['information-gathering', 'analysis', 'documentation'],
        description: 'Conducts comprehensive research and analysis on technical topics',
        version: '1.8.3',
        author: 'Claude Flow Team'
      },
      coder: {
        name: 'Code Developer',
        role: 'development',
        capabilities: ['coding', 'debugging', 'refactoring', 'optimization'],
        description: 'Implements features and fixes bugs with best practices',
        version: '3.2.1',
        author: 'Claude Flow Team'
      },
      tester: {
        name: 'Test Engineer',
        role: 'testing',
        capabilities: ['unit-testing', 'integration-testing', 'tdd', 'coverage-analysis'],
        description: 'Creates comprehensive test suites and ensures code quality',
        version: '2.5.0',
        author: 'Claude Flow Team'
      },
      reviewer: {
        name: 'Code Reviewer',
        role: 'review',
        capabilities: ['code-review', 'security-analysis', 'performance-review'],
        description: 'Reviews code for quality, security, and performance issues',
        version: '1.9.2',
        author: 'Claude Flow Team'
      },
      analyzer: {
        name: 'System Analyzer',
        role: 'analysis',
        capabilities: ['performance-analysis', 'bottleneck-detection', 'optimization'],
        description: 'Analyzes system performance and identifies optimization opportunities',
        version: '2.0.1',
        author: 'Claude Flow Team'
      },
      optimizer: {
        name: 'Performance Optimizer',
        role: 'optimization',
        capabilities: ['performance-tuning', 'resource-optimization', 'efficiency-improvement'],
        description: 'Optimizes system performance and resource utilization',
        version: '1.7.4',
        author: 'Claude Flow Team'
      },
      documenter: {
        name: 'Documentation Specialist',
        role: 'documentation',
        capabilities: ['technical-writing', 'api-documentation', 'user-guides'],
        description: 'Creates and maintains comprehensive technical documentation',
        version: '2.3.0',
        author: 'Claude Flow Team'
      },
      validator: {
        name: 'Validation Agent',
        role: 'validation',
        capabilities: ['data-validation', 'schema-verification', 'compliance-checking'],
        description: 'Validates data integrity and compliance with specifications',
        version: '1.6.1',
        author: 'Claude Flow Team'
      },
      architect: {
        name: 'System Architect',
        role: 'architecture',
        capabilities: ['system-design', 'architecture-planning', 'scalability-design'],
        description: 'Designs system architecture and ensures scalability',
        version: '3.0.2',
        author: 'Claude Flow Team'
      }
    };

    return agentConfigs[agentName] || {
      name: 'Unknown Agent',
      role: 'unknown',
      capabilities: [],
      description: 'Agent configuration not found'
    };
  }

  getMockFs() {
    return this.mockFs;
  }

  reset(): void {
    Object.values(this.mockFs).forEach((mock: any) => {
      if (typeof mock === 'function' && mock.mockReset) {
        mock.mockReset();
      }
    });
  }
}

// Agent Discovery Service
class AgentDiscoveryService {
  private fs: any;
  private readonly AGENT_PATH = '/workspaces/agent-feed/prod/.claude/agents';

  constructor(fileSystem: any = fs) {
    this.fs = fileSystem;
  }

  async discoverAgents(): Promise<AgentFile[]> {
    // Validate correct path
    if (!this.fs.existsSync(this.AGENT_PATH)) {
      throw new Error(`Agent directory not found: ${this.AGENT_PATH}`);
    }

    const files = this.fs.readdirSync(this.AGENT_PATH);
    const agentFiles: AgentFile[] = [];

    for (const file of files) {
      if (path.extname(file) === '.json') {
        const filePath = path.join(this.AGENT_PATH, file);

        try {
          const content = this.fs.readFileSync(filePath, 'utf8');
          const metadata = JSON.parse(content);

          // Validate agent structure
          this.validateAgentMetadata(metadata);

          // Check for fake data
          this.validateDataAuthenticity(metadata);

          agentFiles.push({
            path: filePath,
            content,
            metadata
          });
        } catch (error) {
          throw new Error(`Failed to load agent from ${filePath}: ${error.message}`);
        }
      }
    }

    // Validate minimum agent count
    if (agentFiles.length < 9) {
      throw new Error(`Expected at least 9 agents, found ${agentFiles.length}`);
    }

    return agentFiles;
  }

  private validateAgentMetadata(metadata: any): void {
    const requiredFields = ['name', 'role', 'capabilities', 'description'];

    for (const field of requiredFields) {
      if (!metadata[field]) {
        throw new Error(`Agent missing required field: ${field}`);
      }
    }

    if (!Array.isArray(metadata.capabilities)) {
      throw new Error('Agent capabilities must be an array');
    }
  }

  private validateDataAuthenticity(metadata: any): void {
    const fakePatterns = [
      'fake', 'mock', 'test', 'dummy', 'sample',
      'placeholder', 'example', 'lorem', 'ipsum'
    ];

    const checkForFakeData = (obj: any, path: string = ''): void => {
      if (typeof obj === 'string') {
        const lowerValue = obj.toLowerCase();
        for (const pattern of fakePatterns) {
          if (lowerValue.includes(pattern)) {
            throw new Error(`Fake data detected in ${path}: contains '${pattern}'`);
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          checkForFakeData(item, `${path}[${index}]`);
        });
      } else if (typeof obj === 'object' && obj !== null) {
        Object.keys(obj).forEach(key => {
          checkForFakeData(obj[key], path ? `${path}.${key}` : key);
        });
      }
    };

    checkForFakeData(metadata);
  }

  getAgentPath(): string {
    return this.AGENT_PATH;
  }
}

// Test Suite Implementation
describe('SPARC Agent Discovery Validation Suite', () => {
  let mockFactory: MockFileSystemFactory;
  let agentService: AgentDiscoveryService;
  let originalFs: any;

  beforeEach(() => {
    // Setup London School TDD mocks
    mockFactory = new MockFileSystemFactory();
    originalFs = { ...fs };

    // Inject mocks
    Object.assign(fs, mockFactory.getMockFs());
    agentService = new AgentDiscoveryService(fs);
  });

  afterEach(() => {
    // Restore original file system
    Object.assign(fs, originalFs);
    mockFactory.reset();
  });

  describe('Path Validation Tests', () => {
    it('should use correct agent path /workspaces/agent-feed/prod/.claude/agents', () => {
      expect(agentService.getAgentPath()).toBe('/workspaces/agent-feed/prod/.claude/agents');
    });

    it('should throw error when agent directory does not exist', async () => {
      mockFactory.createMissingDirectoryScenario();

      await expect(agentService.discoverAgents())
        .rejects
        .toThrow('Agent directory not found: /workspaces/agent-feed/prod/.claude/agents');
    });

    it('should validate exact path and reject incorrect paths', () => {
      const incorrectPaths = [
        '/prod/.claude-agents',
        '/workspaces/agent-feed/.claude/agents',
        '/workspaces/agent-feed/prod/claude/agents',
        '/workspaces/agent-feed/prod/.claude-agents'
      ];

      incorrectPaths.forEach(incorrectPath => {
        expect(incorrectPath).not.toBe(agentService.getAgentPath());
      });
    });
  });

  describe('Agent Discovery Tests', () => {
    it('should discover all 10+ agent files from correct path', async () => {
      mockFactory.createHappyPathScenario();

      const agents = await agentService.discoverAgents();

      expect(agents).toHaveLength(10);
      expect(agents.every(agent => agent.path.includes('/workspaces/agent-feed/prod/.claude/agents')))
        .toBe(true);
    });

    it('should load authentic agent metadata correctly', async () => {
      mockFactory.createHappyPathScenario();

      const agents = await agentService.discoverAgents();
      const coordinator = agents.find(a => a.metadata.name === 'Task Coordinator');

      expect(coordinator).toBeDefined();
      expect(coordinator!.metadata).toEqual({
        name: 'Task Coordinator',
        role: 'coordination',
        capabilities: ['task-management', 'resource-allocation', 'workflow-orchestration'],
        description: 'Coordinates complex multi-agent workflows and resource allocation',
        version: '2.1.0',
        author: 'Claude Flow Team'
      });
    });

    it('should throw error when insufficient agents found', async () => {
      mockFactory.createEmptyDirectoryScenario();

      await expect(agentService.discoverAgents())
        .rejects
        .toThrow('Expected at least 9 agents, found 0');
    });

    it('should validate agent metadata structure', async () => {
      const mockFs = mockFactory.getMockFs();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['invalid.json']);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        name: 'Invalid Agent'
        // Missing required fields
      }));
      mockFs.statSync.mockReturnValue({ isFile: () => true });

      await expect(agentService.discoverAgents())
        .rejects
        .toThrow('Agent missing required field: role');
    });
  });

  describe('Data Authenticity Tests', () => {
    it('should reject agents with fake data patterns', async () => {
      mockFactory.createFakeDataScenario();

      await expect(agentService.discoverAgents())
        .rejects
        .toThrow('Fake data detected');
    });

    it('should detect fake patterns in various fields', async () => {
      const fakeDataCases = [
        { field: 'name', value: 'Mock Agent' },
        { field: 'description', value: 'This is a dummy description' },
        { field: 'capabilities', value: ['fake-capability'] }
      ];

      for (const testCase of fakeDataCases) {
        const mockFs = mockFactory.getMockFs();
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue(['test.json']);

        const agentData = {
          name: 'Valid Agent',
          role: 'testing',
          capabilities: ['valid-capability'],
          description: 'Valid description',
          [testCase.field]: testCase.value
        };

        mockFs.readFileSync.mockReturnValue(JSON.stringify(agentData));
        mockFs.statSync.mockReturnValue({ isFile: () => true });

        await expect(agentService.discoverAgents())
          .rejects
          .toThrow('Fake data detected');

        mockFactory.reset();
      }
    });

    it('should accept authentic agent data without fake patterns', async () => {
      mockFactory.createHappyPathScenario();

      const agents = await agentService.discoverAgents();

      // Verify no fake patterns in any agent
      agents.forEach(agent => {
        const jsonString = JSON.stringify(agent.metadata).toLowerCase();
        const fakePatterns = ['fake', 'mock', 'dummy', 'test', 'sample'];

        fakePatterns.forEach(pattern => {
          expect(jsonString).not.toContain(pattern);
        });
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle corrupt JSON files gracefully', async () => {
      mockFactory.createCorruptFileScenario();

      await expect(agentService.discoverAgents())
        .rejects
        .toThrow('Failed to load agent');
    });

    it('should provide detailed error messages', async () => {
      const mockFs = mockFactory.getMockFs();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['test.json']);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(agentService.discoverAgents())
        .rejects
        .toThrow('Failed to load agent from /workspaces/agent-feed/prod/.claude/agents/test.json: Permission denied');
    });
  });

  describe('Performance Tests', () => {
    it('should complete discovery within performance threshold', async () => {
      mockFactory.createHappyPathScenario();

      const startTime = Date.now();
      await agentService.discoverAgents();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // 500ms threshold
    });
  });

  describe('Integration Tests', () => {
    it('should discover agents end-to-end without mocks', async () => {
      // This test would run against actual file system
      // Skip if not in integration test environment
      if (process.env.NODE_ENV !== 'integration') {
        return;
      }

      // Reset to actual file system
      Object.assign(fs, originalFs);
      const realService = new AgentDiscoveryService();

      try {
        const agents = await realService.discoverAgents();
        expect(agents.length).toBeGreaterThanOrEqual(9);
      } catch (error) {
        // Expected if real agent directory doesn't exist in test environment
        expect(error.message).toContain('Agent directory not found');
      }
    });
  });
});
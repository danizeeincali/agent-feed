/**
 * Unit Tests for AgentDiscoveryService - TDD Red Phase
 */

import { AgentDiscoveryService } from '../../src/agents/AgentDiscoveryService';
import { AgentDefinition, AgentParseError } from '../../src/types/AgentTypes';
import { promises as fs } from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('AgentDiscoveryService', () => {
  let service: AgentDiscoveryService;
  const testAgentDir = '/test/agents';

  beforeEach(() => {
    service = new AgentDiscoveryService(testAgentDir);
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default directory when none provided', () => {
      const defaultService = new AgentDiscoveryService();
      expect(defaultService).toBeInstanceOf(AgentDiscoveryService);
    });

    it('should initialize with custom directory', () => {
      expect(service).toBeInstanceOf(AgentDiscoveryService);
    });
  });

  describe('discoverAgents', () => {
    it('should discover and parse valid agent files', async () => {
      // Arrange
      const mockDirents = [
        { name: 'test-agent.md', isFile: () => true },
        { name: 'another-agent.md', isFile: () => true },
        { name: 'not-agent.txt', isFile: () => true },
        { name: 'subdir', isFile: () => false },
      ];

      const validAgentContent = `---
name: test-agent
description: Test agent for unit testing
tools: [Read, Write, Edit]
model: sonnet
color: "#blue"
proactive: true
priority: P1
usage: For testing purposes
---

# Test Agent

This is a test agent.`;

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile.mockResolvedValue(validAgentContent);

      // Act
      const agents = await service.discoverAgents();

      // Assert
      expect(agents).toHaveLength(2);
      expect(agents[0]).toMatchObject({
        name: 'test-agent',
        description: 'Test agent for unit testing',
        tools: ['Read', 'Write', 'Edit'],
        model: 'sonnet',
        color: '#blue',
        proactive: true,
        priority: 'P1',
        usage: 'For testing purposes',
        body: '# Test Agent\n\nThis is a test agent.',
      });
    });

    it('should throw AgentParseError when directory cannot be read', async () => {
      // Arrange
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(service.discoverAgents()).rejects.toThrow(AgentParseError);
    });

    it('should handle malformed agent files gracefully', async () => {
      // Arrange
      const mockDirents = [
        { name: 'valid-agent.md', isFile: () => true },
        { name: 'invalid-agent.md', isFile: () => true },
      ];

      const validContent = `---
name: valid-agent
description: Valid agent
tools: [Read]
model: sonnet
color: "#green"
proactive: false
priority: P2
usage: Valid usage
---

# Valid Agent`;

      const invalidContent = `Invalid content without frontmatter`;

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile
        .mockResolvedValueOnce(validContent)
        .mockResolvedValueOnce(invalidContent);

      // Act
      const agents = await service.discoverAgents();

      // Assert
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('valid-agent');
    });

    it('should filter only .md files', async () => {
      // Arrange
      const mockDirents = [
        { name: 'agent1.md', isFile: () => true },
        { name: 'agent2.txt', isFile: () => true },
        { name: 'agent3.json', isFile: () => true },
        { name: 'directory', isFile: () => false },
      ];

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile.mockResolvedValue(`---
name: agent1
description: Agent 1
tools: [Read]
model: sonnet
color: "#blue"
proactive: false
priority: P3
usage: Testing
---

# Agent 1`);

      // Act
      const agents = await service.discoverAgents();

      // Assert
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
      expect(agents).toHaveLength(1);
    });
  });

  describe('getAgent', () => {
    it('should return cached agent when available', async () => {
      // Arrange
      const mockDirents = [{ name: 'cached-agent.md', isFile: () => true }];
      const agentContent = `---
name: cached-agent
description: Cached test agent
tools: [Read]
model: sonnet
color: "#purple"
proactive: true
priority: P1
usage: Cache testing
---

# Cached Agent`;

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile.mockResolvedValue(agentContent);

      // Pre-populate cache
      await service.discoverAgents();

      // Act
      const agent = await service.getAgent('cached-agent');

      // Assert
      expect(agent).toBeTruthy();
      expect(agent!.name).toBe('cached-agent');
      // readFile should only be called once (during discoverAgents)
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should load agent from filesystem when not cached', async () => {
      // Arrange
      const agentContent = `---
name: uncached-agent
description: Uncached test agent
tools: [Write]
model: haiku
color: "#red"
proactive: false
priority: P2
usage: Direct loading test
---

# Uncached Agent`;

      mockFs.readFile.mockResolvedValue(agentContent);

      // Act
      const agent = await service.getAgent('uncached-agent');

      // Assert
      expect(agent).toBeTruthy();
      expect(agent!.name).toBe('uncached-agent');
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(testAgentDir, 'uncached-agent.md'),
        'utf-8'
      );
    });

    it('should return null for non-existent agent', async () => {
      // Arrange
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      // Act
      const agent = await service.getAgent('non-existent-agent');

      // Assert
      expect(agent).toBeNull();
    });
  });

  describe('needsRefresh', () => {
    it('should return true when no scan has been performed', () => {
      // Act & Assert
      expect(service.needsRefresh()).toBe(true);
    });

    it('should return false when cache is fresh', async () => {
      // Arrange
      mockFs.readdir.mockResolvedValue([]);
      await service.discoverAgents();

      // Act & Assert
      expect(service.needsRefresh()).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear cache and reset scan time', async () => {
      // Arrange
      mockFs.readdir.mockResolvedValue([]);
      await service.discoverAgents();
      expect(service.needsRefresh()).toBe(false);

      // Act
      service.clearCache();

      // Assert
      expect(service.needsRefresh()).toBe(true);
    });
  });

  describe('Frontmatter Parsing', () => {
    it('should parse tools array correctly', async () => {
      // Arrange
      const mockDirents = [{ name: 'tools-test.md', isFile: () => true }];
      const agentContent = `---
name: tools-test
description: Tools parsing test
tools: [Read, Write, Edit, MultiEdit, Bash]
model: opus
color: "#cyan"
proactive: true
priority: P0
usage: Tools testing
---

# Tools Test`;

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile.mockResolvedValue(agentContent);

      // Act
      const agents = await service.discoverAgents();

      // Assert
      expect(agents[0].tools).toEqual(['Read', 'Write', 'Edit', 'MultiEdit', 'Bash']);
    });

    it('should handle empty tools array', async () => {
      // Arrange
      const mockDirents = [{ name: 'empty-tools.md', isFile: () => true }];
      const agentContent = `---
name: empty-tools
description: Empty tools test
tools: []
model: sonnet
color: "#yellow"
proactive: false
priority: P3
usage: Empty tools testing
---

# Empty Tools`;

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile.mockResolvedValue(agentContent);

      // Act
      const agents = await service.discoverAgents();

      // Assert
      expect(agents[0].tools).toEqual([]);
    });

    it('should throw error for missing required fields', async () => {
      // Arrange
      const mockDirents = [{ name: 'incomplete.md', isFile: () => true }];
      const agentContent = `---
model: sonnet
color: "#red"
---

# Incomplete Agent`;

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile.mockResolvedValue(agentContent);

      // Act & Assert
      const agents = await service.discoverAgents();
      expect(agents).toHaveLength(0); // Should skip malformed agents
    });
  });

  describe('Error Handling', () => {
    it('should handle file read errors gracefully during discovery', async () => {
      // Arrange
      const mockDirents = [
        { name: 'good.md', isFile: () => true },
        { name: 'bad.md', isFile: () => true },
      ];

      const goodContent = `---
name: good-agent
description: Good agent
tools: [Read]
model: sonnet
color: "#green"
proactive: true
priority: P1
usage: Good agent test
---

# Good Agent`;

      mockFs.readdir.mockResolvedValue(mockDirents as any);
      mockFs.readFile
        .mockResolvedValueOnce(goodContent)
        .mockRejectedValueOnce(new Error('Read error'));

      // Act
      const agents = await service.discoverAgents();

      // Assert
      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('good-agent');
    });
  });
});
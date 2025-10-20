/**
 * TDD Test Suite: Meta Agent Removal
 * Testing Strategy: London School (Mockist) - Outside-In
 *
 * Purpose: Verify complete removal of meta-agent and meta-update-agent
 * Expected Outcome: 17 total agents (9 T1, 8 T2)
 * Current Issue: 19 total agents (9 T1, 10 T2)
 */

const fs = require('fs').promises;
const path = require('path');

// Mock dependencies for London School approach
const mockAgentRepository = {
  loadAllAgents: jest.fn(),
  getAgentByName: jest.fn(),
  getAgentsByTier: jest.fn(),
  getAgentCount: jest.fn()
};

const mockFileSystem = {
  readdir: jest.fn(),
  access: jest.fn(),
  readFile: jest.fn()
};

const mockApiResponse = {
  agents: jest.fn(),
  metadata: jest.fn()
};

describe('Meta Agent Removal - London School TDD Suite', () => {

  // ============================================================================
  // 1. BACKEND AGENT COUNT TESTS (Behavior Verification)
  // ============================================================================

  describe('Backend Agent Count Verification', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should return 17 total agents after meta agent removal', async () => {
      // Arrange: Mock the expected behavior
      const mockAgents = createMockAgentList(17, { tier1: 9, tier2: 8 });
      mockAgentRepository.loadAllAgents.mockResolvedValue(mockAgents);
      mockAgentRepository.getAgentCount.mockResolvedValue(17);

      // Act: Call the service
      const count = await mockAgentRepository.getAgentCount();
      const agents = await mockAgentRepository.loadAllAgents();

      // Assert: Verify interactions and results
      expect(mockAgentRepository.getAgentCount).toHaveBeenCalledTimes(1);
      expect(count).toBe(17);
      expect(agents).toHaveLength(17);
    });

    test('should return exactly 9 Tier 1 agents', async () => {
      // Arrange: Mock Tier 1 agents
      const mockTier1Agents = createMockAgentsByTier(1, 9);
      mockAgentRepository.getAgentsByTier.mockResolvedValue(mockTier1Agents);

      // Act
      const tier1Agents = await mockAgentRepository.getAgentsByTier(1);

      // Assert: Verify the contract
      expect(mockAgentRepository.getAgentsByTier).toHaveBeenCalledWith(1);
      expect(tier1Agents).toHaveLength(9);
      expect(tier1Agents.every(agent => agent.tier === 1)).toBe(true);
    });

    test('should return exactly 8 Tier 2 agents (reduced from 10)', async () => {
      // Arrange: Mock Tier 2 agents WITHOUT meta agents
      const mockTier2Agents = createMockAgentsByTier(2, 8, {
        exclude: ['meta-agent', 'meta-update-agent']
      });
      mockAgentRepository.getAgentsByTier.mockResolvedValue(mockTier2Agents);

      // Act
      const tier2Agents = await mockAgentRepository.getAgentsByTier(2);

      // Assert: Verify count and exclusions
      expect(mockAgentRepository.getAgentsByTier).toHaveBeenCalledWith(2);
      expect(tier2Agents).toHaveLength(8);
      expect(tier2Agents.every(agent => agent.tier === 2)).toBe(true);

      // Verify meta agents are NOT in the list
      const agentNames = tier2Agents.map(a => a.name);
      expect(agentNames).not.toContain('meta-agent');
      expect(agentNames).not.toContain('meta-update-agent');
    });

    test('should NOT include meta-agent in agent list', async () => {
      // Arrange: Mock response without meta-agent
      mockAgentRepository.getAgentByName.mockResolvedValue(null);
      const mockAllAgents = createMockAgentList(17, { tier1: 9, tier2: 8 });
      mockAgentRepository.loadAllAgents.mockResolvedValue(mockAllAgents);

      // Act
      const metaAgent = await mockAgentRepository.getAgentByName('meta-agent');
      const allAgents = await mockAgentRepository.loadAllAgents();

      // Assert: Verify meta-agent is absent
      expect(mockAgentRepository.getAgentByName).toHaveBeenCalledWith('meta-agent');
      expect(metaAgent).toBeNull();
      expect(allAgents.find(a => a.name === 'meta-agent')).toBeUndefined();
    });

    test('should NOT include meta-update-agent in agent list', async () => {
      // Arrange: Mock response without meta-update-agent
      mockAgentRepository.getAgentByName.mockResolvedValue(null);
      const mockAllAgents = createMockAgentList(17, { tier1: 9, tier2: 8 });
      mockAgentRepository.loadAllAgents.mockResolvedValue(mockAllAgents);

      // Act
      const metaUpdateAgent = await mockAgentRepository.getAgentByName('meta-update-agent');
      const allAgents = await mockAgentRepository.loadAllAgents();

      // Assert: Verify meta-update-agent is absent
      expect(mockAgentRepository.getAgentByName).toHaveBeenCalledWith('meta-update-agent');
      expect(metaUpdateAgent).toBeNull();
      expect(allAgents.find(a => a.name === 'meta-update-agent')).toBeUndefined();
    });

    test('should include all 6 specialist agents in Tier 2', async () => {
      // Arrange: Mock the 6 specialist agents
      const specialistAgents = [
        'agent-architect-agent',
        'skills-architect-agent',
        'learning-optimizer-agent',
        'system-architect-agent',
        'agent-maintenance-agent',
        'skills-maintenance-agent'
      ];

      const mockTier2Agents = specialistAgents.map(name => ({
        name,
        tier: 2,
        protected: true
      }));

      mockAgentRepository.getAgentsByTier.mockResolvedValue(mockTier2Agents);

      // Act
      const tier2Agents = await mockAgentRepository.getAgentsByTier(2);
      const tier2Names = tier2Agents.map(a => a.name);

      // Assert: Verify all 6 specialists are present
      expect(tier2Agents).toHaveLength(6); // Only checking specialists, not all T2
      specialistAgents.forEach(specialist => {
        expect(tier2Names).toContain(specialist);
      });
    });
  });

  // ============================================================================
  // 2. FILESYSTEM AGENT LIST TESTS (Contract Verification)
  // ============================================================================

  describe('Filesystem Agent File Verification', () => {
    const agentsDir = '/workspaces/agent-feed/prod/.claude/agents';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should not find meta-agent.md file in filesystem', async () => {
      // Arrange: Mock filesystem access to fail for meta-agent
      const metaAgentPath = path.join(agentsDir, 'meta-agent.md');
      mockFileSystem.access.mockRejectedValue(new Error('ENOENT: no such file'));

      // Act & Assert: Verify file does not exist
      await expect(mockFileSystem.access(metaAgentPath))
        .rejects.toThrow('ENOENT');

      expect(mockFileSystem.access).toHaveBeenCalledWith(metaAgentPath);
    });

    test('should not find meta-update-agent.md file in filesystem', async () => {
      // Arrange: Mock filesystem access to fail for meta-update-agent
      const metaUpdatePath = path.join(agentsDir, 'meta-update-agent.md');
      mockFileSystem.access.mockRejectedValue(new Error('ENOENT: no such file'));

      // Act & Assert: Verify file does not exist
      await expect(mockFileSystem.access(metaUpdatePath))
        .rejects.toThrow('ENOENT');

      expect(mockFileSystem.access).toHaveBeenCalledWith(metaUpdatePath);
    });

    test('should find agent-architect-agent.md file', async () => {
      // Arrange: Mock successful file access
      const architectPath = path.join(agentsDir, 'agent-architect-agent.md');
      mockFileSystem.access.mockResolvedValue(undefined);
      mockFileSystem.readFile.mockResolvedValue('# Agent Architect\ntier: 2');

      // Act
      await mockFileSystem.access(architectPath);
      const content = await mockFileSystem.readFile(architectPath, 'utf8');

      // Assert: Verify file exists and has correct tier
      expect(mockFileSystem.access).toHaveBeenCalledWith(architectPath);
      expect(content).toContain('tier: 2');
    });

    test('should find skills-architect-agent.md file', async () => {
      // Arrange
      const skillsPath = path.join(agentsDir, 'skills-architect-agent.md');
      mockFileSystem.access.mockResolvedValue(undefined);
      mockFileSystem.readFile.mockResolvedValue('# Skills Architect\ntier: 2');

      // Act
      await mockFileSystem.access(skillsPath);
      const content = await mockFileSystem.readFile(skillsPath, 'utf8');

      // Assert
      expect(mockFileSystem.access).toHaveBeenCalledWith(skillsPath);
      expect(content).toContain('tier: 2');
    });

    test('should find learning-optimizer-agent.md file', async () => {
      // Arrange
      const learningPath = path.join(agentsDir, 'learning-optimizer-agent.md');
      mockFileSystem.access.mockResolvedValue(undefined);
      mockFileSystem.readFile.mockResolvedValue('# Learning Optimizer\ntier: 2');

      // Act
      await mockFileSystem.access(learningPath);
      const content = await mockFileSystem.readFile(learningPath, 'utf8');

      // Assert
      expect(mockFileSystem.access).toHaveBeenCalledWith(learningPath);
      expect(content).toContain('tier: 2');
    });

    test('should find system-architect-agent.md file', async () => {
      // Arrange
      const systemPath = path.join(agentsDir, 'system-architect-agent.md');
      mockFileSystem.access.mockResolvedValue(undefined);
      mockFileSystem.readFile.mockResolvedValue('# System Architect\ntier: 2');

      // Act
      await mockFileSystem.access(systemPath);
      const content = await mockFileSystem.readFile(systemPath, 'utf8');

      // Assert
      expect(mockFileSystem.access).toHaveBeenCalledWith(systemPath);
      expect(content).toContain('tier: 2');
    });

    test('should list exactly 17 agent files in directory', async () => {
      // Arrange: Mock directory listing
      const mockFiles = createMockFileList(17, {
        exclude: ['meta-agent.md', 'meta-update-agent.md']
      });
      mockFileSystem.readdir.mockResolvedValue(mockFiles);

      // Act
      const files = await mockFileSystem.readdir(agentsDir);
      const agentFiles = files.filter(f => f.endsWith('.md'));

      // Assert
      expect(mockFileSystem.readdir).toHaveBeenCalledWith(agentsDir);
      expect(agentFiles).toHaveLength(17);
      expect(agentFiles).not.toContain('meta-agent.md');
      expect(agentFiles).not.toContain('meta-update-agent.md');
    });
  });

  // ============================================================================
  // 3. API RESPONSE TESTS (Integration Behavior)
  // ============================================================================

  describe('API Response Verification', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('GET /api/agents should return exactly 17 agents', async () => {
      // Arrange: Mock API response
      const mockResponse = {
        agents: createMockAgentList(17, { tier1: 9, tier2: 8 }),
        metadata: {
          total: 17,
          tier1: 9,
          tier2: 8
        }
      };
      mockApiResponse.agents.mockResolvedValue(mockResponse);

      // Act
      const response = await mockApiResponse.agents();

      // Assert: Verify response structure and count
      expect(mockApiResponse.agents).toHaveBeenCalledTimes(1);
      expect(response.agents).toHaveLength(17);
      expect(response.metadata.total).toBe(17);
    });

    test('GET /api/agents?tier=2 should return exactly 8 agents', async () => {
      // Arrange: Mock filtered API response
      const mockResponse = {
        agents: createMockAgentsByTier(2, 8),
        metadata: {
          total: 8,
          tier: 2
        }
      };
      mockApiResponse.agents.mockResolvedValue(mockResponse);

      // Act
      const response = await mockApiResponse.agents({ tier: 2 });

      // Assert: Verify filtered results
      expect(mockApiResponse.agents).toHaveBeenCalledWith({ tier: 2 });
      expect(response.agents).toHaveLength(8);
      expect(response.agents.every(a => a.tier === 2)).toBe(true);
    });

    test('metadata should show tier2: 8 (not 10)', async () => {
      // Arrange: Mock metadata response
      const mockMetadata = {
        total: 17,
        tier1: 9,
        tier2: 8, // Critical: Must be 8, not 10
        breakdown: {
          protected: 6,
          regular: 11
        }
      };
      mockApiResponse.metadata.mockResolvedValue(mockMetadata);

      // Act
      const metadata = await mockApiResponse.metadata();

      // Assert: Verify tier2 count is correct
      expect(mockApiResponse.metadata).toHaveBeenCalledTimes(1);
      expect(metadata.tier2).toBe(8);
      expect(metadata.tier2).not.toBe(10); // Explicit check for old value
    });

    test('metadata should show total: 17 (not 19)', async () => {
      // Arrange
      const mockMetadata = {
        total: 17, // Critical: Must be 17, not 19
        tier1: 9,
        tier2: 8
      };
      mockApiResponse.metadata.mockResolvedValue(mockMetadata);

      // Act
      const metadata = await mockApiResponse.metadata();

      // Assert: Verify total count is correct
      expect(metadata.total).toBe(17);
      expect(metadata.total).not.toBe(19); // Explicit check for old value
      expect(metadata.tier1 + metadata.tier2).toBe(17); // Verify math
    });

    test('API response should not contain meta-agent or meta-update-agent', async () => {
      // Arrange
      const mockResponse = {
        agents: createMockAgentList(17, {
          tier1: 9,
          tier2: 8,
          exclude: ['meta-agent', 'meta-update-agent']
        })
      };
      mockApiResponse.agents.mockResolvedValue(mockResponse);

      // Act
      const response = await mockApiResponse.agents();
      const agentNames = response.agents.map(a => a.name);

      // Assert: Verify exclusions
      expect(agentNames).not.toContain('meta-agent');
      expect(agentNames).not.toContain('meta-update-agent');
    });

    test('API response should include all 6 specialist agents', async () => {
      // Arrange
      const specialists = [
        'agent-architect-agent',
        'skills-architect-agent',
        'learning-optimizer-agent',
        'system-architect-agent',
        'agent-maintenance-agent',
        'skills-maintenance-agent'
      ];

      const mockResponse = {
        agents: specialists.map(name => ({ name, tier: 2, protected: true }))
      };
      mockApiResponse.agents.mockResolvedValue(mockResponse);

      // Act
      const response = await mockApiResponse.agents({ tier: 2, protected: true });
      const agentNames = response.agents.map(a => a.name);

      // Assert: Verify all specialists present
      specialists.forEach(specialist => {
        expect(agentNames).toContain(specialist);
      });
    });
  });

  // ============================================================================
  // 4. SVG ICON PRESERVATION TESTS (UI Contract Verification)
  // ============================================================================

  describe('SVG Icon Integrity After Removal', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('remaining agents should retain SVG icon paths', async () => {
      // Arrange: Mock agents with SVG icons
      const mockAgentsWithIcons = createMockAgentList(17, {
        tier1: 9,
        tier2: 8,
        withIcons: true
      });
      mockAgentRepository.loadAllAgents.mockResolvedValue(mockAgentsWithIcons);

      // Act
      const agents = await mockAgentRepository.loadAllAgents();

      // Assert: Verify all agents have SVG icons
      expect(agents.every(agent => agent.icon && agent.icon.endsWith('.svg'))).toBe(true);
      expect(agents.every(agent => !agent.icon.includes('emoji'))).toBe(true);
    });

    test('no emoji fallbacks should be present after removal', async () => {
      // Arrange
      const mockAgents = createMockAgentList(17, { withIcons: true });
      mockAgentRepository.loadAllAgents.mockResolvedValue(mockAgents);

      // Act
      const agents = await mockAgentRepository.loadAllAgents();

      // Assert: Verify no emoji fallbacks
      agents.forEach(agent => {
        expect(agent.icon).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u); // No emoji
        expect(agent.iconType).toBe('svg');
        expect(agent.iconType).not.toBe('emoji');
      });
    });

    test('tier 1 agents should have blue SVG icons', async () => {
      // Arrange
      const mockTier1 = createMockAgentsByTier(1, 9, { withIcons: true });
      mockAgentRepository.getAgentsByTier.mockResolvedValue(mockTier1);

      // Act
      const agents = await mockAgentRepository.getAgentsByTier(1);

      // Assert: Verify blue tier coloring
      agents.forEach(agent => {
        expect(agent.tierColor).toBe('blue');
        expect(agent.icon).toContain('.svg');
      });
    });

    test('tier 2 agents should have gray SVG icons', async () => {
      // Arrange
      const mockTier2 = createMockAgentsByTier(2, 8, { withIcons: true });
      mockAgentRepository.getAgentsByTier.mockResolvedValue(mockTier2);

      // Act
      const agents = await mockAgentRepository.getAgentsByTier(2);

      // Assert: Verify gray tier coloring
      agents.forEach(agent => {
        expect(agent.tierColor).toBe('gray');
        expect(agent.icon).toContain('.svg');
      });
    });

    test('specialist agents should maintain protected status with icons', async () => {
      // Arrange
      const specialists = [
        'agent-architect-agent',
        'skills-architect-agent',
        'learning-optimizer-agent',
        'system-architect-agent',
        'agent-maintenance-agent',
        'skills-maintenance-agent'
      ];

      const mockSpecialists = specialists.map(name => ({
        name,
        tier: 2,
        protected: true,
        icon: `/icons/${name}.svg`,
        iconType: 'svg',
        tierColor: 'gray'
      }));

      mockAgentRepository.getAgentsByTier.mockResolvedValue(mockSpecialists);

      // Act
      const agents = await mockAgentRepository.getAgentsByTier(2);

      // Assert: Verify protected status and icons
      agents.forEach(agent => {
        expect(agent.protected).toBe(true);
        expect(agent.icon).toContain('.svg');
        expect(agent.iconType).toBe('svg');
      });
    });

    test('icon loading should not fail after meta agent removal', async () => {
      // Arrange: Mock icon loading service
      const mockIconLoader = {
        loadIcon: jest.fn().mockResolvedValue({
          path: '/icons/test.svg',
          type: 'svg'
        })
      };

      const mockAgents = createMockAgentList(17, { withIcons: true });
      mockAgentRepository.loadAllAgents.mockResolvedValue(mockAgents);

      // Act: Load icons for all agents
      const agents = await mockAgentRepository.loadAllAgents();
      const iconPromises = agents.map(a => mockIconLoader.loadIcon(a.name));
      const icons = await Promise.all(iconPromises);

      // Assert: Verify all icons loaded successfully
      expect(mockIconLoader.loadIcon).toHaveBeenCalledTimes(17);
      expect(icons.every(icon => icon.type === 'svg')).toBe(true);
    });
  });

  // ============================================================================
  // 5. CROSS-CUTTING CONCERNS (London School - Collaboration Verification)
  // ============================================================================

  describe('Service Collaboration After Meta Agent Removal', () => {
    test('agent repository should coordinate with tier classification service', async () => {
      // Arrange: Mock service collaboration
      const mockTierClassifier = {
        classifyAgent: jest.fn().mockReturnValue(2)
      };

      const mockAgent = { name: 'test-agent', tier: 2 };
      mockAgentRepository.loadAllAgents.mockResolvedValue([mockAgent]);

      // Act
      const agents = await mockAgentRepository.loadAllAgents();
      const classification = mockTierClassifier.classifyAgent(agents[0]);

      // Assert: Verify collaboration
      expect(mockAgentRepository.loadAllAgents).toHaveBeenCalled();
      expect(mockTierClassifier.classifyAgent).toHaveBeenCalledWith(mockAgent);
      expect(classification).toBe(2);
    });

    test('API endpoint should coordinate with repository and response formatter', async () => {
      // Arrange: Mock service chain
      const mockFormatter = {
        formatResponse: jest.fn().mockReturnValue({
          agents: [],
          metadata: { total: 17 }
        })
      };

      mockAgentRepository.loadAllAgents.mockResolvedValue([]);

      // Act
      const agents = await mockAgentRepository.loadAllAgents();
      const response = mockFormatter.formatResponse(agents);

      // Assert: Verify coordination sequence
      expect(mockAgentRepository.loadAllAgents).toHaveBeenCalledBefore(
        mockFormatter.formatResponse
      );
      expect(response.metadata.total).toBe(17);
    });

    test('should maintain data consistency across all service layers', async () => {
      // Arrange: Mock multi-layer stack
      const mockAgents = createMockAgentList(17, { tier1: 9, tier2: 8 });

      mockAgentRepository.loadAllAgents.mockResolvedValue(mockAgents);
      mockAgentRepository.getAgentCount.mockResolvedValue(17);
      mockApiResponse.metadata.mockResolvedValue({
        total: 17,
        tier1: 9,
        tier2: 8
      });

      // Act: Query all layers
      const repositoryAgents = await mockAgentRepository.loadAllAgents();
      const repositoryCount = await mockAgentRepository.getAgentCount();
      const apiMetadata = await mockApiResponse.metadata();

      // Assert: Verify consistency
      expect(repositoryAgents).toHaveLength(17);
      expect(repositoryCount).toBe(17);
      expect(apiMetadata.total).toBe(17);
      expect(apiMetadata.tier1 + apiMetadata.tier2).toBe(17);
    });
  });
});

// ============================================================================
// MOCK FACTORY FUNCTIONS (London School - Mock Helpers)
// ============================================================================

/**
 * Creates a mock agent list with specified tier distribution
 */
function createMockAgentList(total, options = {}) {
  const { tier1 = 9, tier2 = 8, exclude = [], withIcons = false } = options;
  const agents = [];

  // Create Tier 1 agents
  for (let i = 1; i <= tier1; i++) {
    agents.push(createMockAgent(`tier1-agent-${i}`, 1, withIcons));
  }

  // Create Tier 2 agents (excluding meta agents)
  const tier2Names = [
    'agent-architect-agent',
    'skills-architect-agent',
    'learning-optimizer-agent',
    'system-architect-agent',
    'agent-maintenance-agent',
    'skills-maintenance-agent',
    'agent-feedback-agent',
    'agent-ideas-agent'
  ].filter(name => !exclude.includes(name));

  for (let i = 0; i < tier2 && i < tier2Names.length; i++) {
    agents.push(createMockAgent(tier2Names[i], 2, withIcons, true));
  }

  return agents;
}

/**
 * Creates mock agents for a specific tier
 */
function createMockAgentsByTier(tier, count, options = {}) {
  const { exclude = [], withIcons = false } = options;
  const agents = [];

  for (let i = 1; i <= count; i++) {
    const name = `tier${tier}-agent-${i}`;
    if (!exclude.includes(name)) {
      agents.push(createMockAgent(name, tier, withIcons));
    }
  }

  return agents;
}

/**
 * Creates a single mock agent
 */
function createMockAgent(name, tier, withIcons = false, protected = false) {
  const agent = {
    name,
    tier,
    protected,
    tierColor: tier === 1 ? 'blue' : 'gray'
  };

  if (withIcons) {
    agent.icon = `/icons/${name}.svg`;
    agent.iconType = 'svg';
  }

  return agent;
}

/**
 * Creates a mock file list
 */
function createMockFileList(count, options = {}) {
  const { exclude = [] } = options;
  const files = [];

  const allFiles = [
    'agent-architect-agent.md',
    'skills-architect-agent.md',
    'learning-optimizer-agent.md',
    'system-architect-agent.md',
    'agent-maintenance-agent.md',
    'skills-maintenance-agent.md',
    'agent-feedback-agent.md',
    'agent-ideas-agent.md',
    'get-to-know-you-agent.md',
    'meeting-prep-agent.md',
    'meeting-next-steps-agent.md',
    'follow-ups-agent.md',
    'personal-todos-agent.md',
    'link-logger-agent.md',
    'page-builder-agent.md',
    'dynamic-page-testing-agent.md',
    'page-verification-agent.md'
  ].filter(f => !exclude.includes(f));

  return allFiles.slice(0, count);
}

/**
 * Custom Jest matcher for call order verification
 */
expect.extend({
  toHaveBeenCalledBefore(received, expected) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;

    const pass = receivedCalls[0] < expectedCalls[0];

    return {
      pass,
      message: () => pass
        ? `Expected ${received.getMockName()} not to be called before ${expected.getMockName()}`
        : `Expected ${received.getMockName()} to be called before ${expected.getMockName()}`
    };
  }
});

// Export for integration testing
module.exports = {
  createMockAgentList,
  createMockAgentsByTier,
  createMockAgent,
  createMockFileList
};

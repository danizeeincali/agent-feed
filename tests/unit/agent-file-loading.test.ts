import { AgentDiscoveryService } from '../../src/agents/AgentDiscoveryService';
import { AgentFileService } from '../../src/services/AgentFileService';
import path from 'path';
import fs from 'fs/promises';

describe('Agent File Loading Tests', () => {
  let discoveryService: AgentDiscoveryService;
  let fileService: AgentFileService;
  const testAgentsDir = path.join(__dirname, '../fixtures/test-agents');

  beforeAll(async () => {
    // Create test agent files
    await fs.mkdir(testAgentsDir, { recursive: true });
    
    // Create a valid agent file
    const validAgent = {
      id: 'test-agent-1',
      name: 'Test Agent 1',
      description: 'A test agent for validation',
      capabilities: ['testing', 'validation'],
      version: '1.0.0',
      status: 'active'
    };
    
    await fs.writeFile(
      path.join(testAgentsDir, 'test-agent-1.json'),
      JSON.stringify(validAgent, null, 2)
    );
    
    // Create an invalid agent file
    await fs.writeFile(
      path.join(testAgentsDir, 'invalid-agent.json'),
      '{ invalid json content'
    );
    
    // Create a valid but incomplete agent file
    const incompleteAgent = {
      id: 'incomplete-agent',
      name: 'Incomplete Agent'
      // Missing required fields
    };
    
    await fs.writeFile(
      path.join(testAgentsDir, 'incomplete-agent.json'),
      JSON.stringify(incompleteAgent, null, 2)
    );

    discoveryService = new AgentDiscoveryService(testAgentsDir);
    fileService = new AgentFileService(testAgentsDir);
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.rm(testAgentsDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Agent Discovery', () => {
    it('should discover valid agent files', async () => {
      const agents = await discoveryService.discoverAgents();
      
      expect(agents).toHaveLength(1);
      expect(agents[0]).toMatchObject({
        id: 'test-agent-1',
        name: 'Test Agent 1',
        status: 'active'
      });
    });

    it('should handle invalid JSON files gracefully', async () => {
      const agents = await discoveryService.discoverAgents();
      
      // Should only return valid agents, not throw errors
      expect(agents.every(agent => agent.id && agent.name)).toBe(true);
    });

    it('should validate agent schemas', async () => {
      const isValid = await discoveryService.validateAgentSchema({
        id: 'test',
        name: 'Test',
        description: 'Test agent',
        capabilities: ['test'],
        version: '1.0.0',
        status: 'active'
      });
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid agent schemas', async () => {
      const isValid = await discoveryService.validateAgentSchema({
        id: 'test'
        // Missing required fields
      } as any);
      
      expect(isValid).toBe(false);
    });
  });

  describe('File Service Operations', () => {
    it('should load agent by ID', async () => {
      const agent = await fileService.loadAgent('test-agent-1');
      
      expect(agent).toBeDefined();
      expect(agent?.id).toBe('test-agent-1');
      expect(agent?.name).toBe('Test Agent 1');
    });

    it('should return null for non-existent agents', async () => {
      const agent = await fileService.loadAgent('non-existent');
      
      expect(agent).toBeNull();
    });

    it('should list all available agents', async () => {
      const agentList = await fileService.listAgents();
      
      expect(agentList).toHaveLength(1);
      expect(agentList[0].id).toBe('test-agent-1');
    });

    it('should save agent data correctly', async () => {
      const newAgent = {
        id: 'new-test-agent',
        name: 'New Test Agent',
        description: 'A newly created test agent',
        capabilities: ['creation', 'testing'],
        version: '1.0.0',
        status: 'active' as const
      };
      
      await fileService.saveAgent(newAgent);
      
      // Verify the agent was saved
      const savedAgent = await fileService.loadAgent('new-test-agent');
      expect(savedAgent).toMatchObject(newAgent);
      
      // Cleanup
      const filePath = path.join(testAgentsDir, 'new-test-agent.json');
      await fs.unlink(filePath);
    });

    it('should handle file system errors gracefully', async () => {
      // Try to load from a non-existent directory
      const invalidFileService = new AgentFileService('/non/existent/path');
      
      const agents = await invalidFileService.listAgents();
      expect(agents).toEqual([]);
    });
  });

  describe('Performance Tests', () => {
    it('should load agents within acceptable time', async () => {
      const start = Date.now();
      
      await discoveryService.discoverAgents();
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle large numbers of agent files', async () => {
      // Create multiple agent files for stress testing
      const numAgents = 100;
      const promises = [];
      
      for (let i = 0; i < numAgents; i++) {
        const agent = {
          id: `stress-agent-${i}`,
          name: `Stress Agent ${i}`,
          description: 'A stress test agent',
          capabilities: ['stress-testing'],
          version: '1.0.0',
          status: 'active'
        };
        
        promises.push(
          fs.writeFile(
            path.join(testAgentsDir, `stress-agent-${i}.json`),
            JSON.stringify(agent, null, 2)
          )
        );
      }
      
      await Promise.all(promises);
      
      const start = Date.now();
      const agents = await discoveryService.discoverAgents();
      const duration = Date.now() - start;
      
      expect(agents.length).toBeGreaterThan(numAgents);
      expect(duration).toBeLessThan(5000); // Less than 5 seconds for 100 agents
      
      // Cleanup stress test files
      const cleanupPromises = [];
      for (let i = 0; i < numAgents; i++) {
        cleanupPromises.push(
          fs.unlink(path.join(testAgentsDir, `stress-agent-${i}.json`))
            .catch(() => {}) // Ignore errors
        );
      }
      await Promise.all(cleanupPromises);
    });
  });
});
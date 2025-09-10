/**
 * Integration Tests for Complete Agent System - TDD Implementation
 */

import { AgentDiscoveryService } from '../../src/agents/AgentDiscoveryService';
import { AgentWorkspaceManager } from '../../src/services/AgentWorkspaceManager';
import { AgentDatabase } from '../../src/database/AgentDatabase';
import { AgentApiController } from '../../src/api/AgentApiController';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Agent System Integration Tests', () => {
  let tempDir: string;
  let agentDir: string;
  let workspaceDir: string;
  let dbPath: string;
  
  let discoveryService: AgentDiscoveryService;
  let workspaceManager: AgentWorkspaceManager;
  let database: AgentDatabase;
  let apiController: AgentApiController;

  beforeAll(async () => {
    // Create temporary directories for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-system-test-'));
    agentDir = path.join(tempDir, 'agents');
    workspaceDir = path.join(tempDir, 'workspaces');
    dbPath = path.join(tempDir, 'test.db');

    await fs.mkdir(agentDir, { recursive: true });
    await fs.mkdir(workspaceDir, { recursive: true });

    // Create test agent files
    await createTestAgentFiles();

    // Initialize services
    discoveryService = new AgentDiscoveryService(agentDir);
    workspaceManager = new AgentWorkspaceManager(workspaceDir);
    database = new AgentDatabase({ path: dbPath });
    apiController = new AgentApiController(discoveryService, workspaceManager, database);
  });

  afterAll(async () => {
    // Cleanup
    database.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function createTestAgentFiles() {
    const agents = [
      {
        name: 'test-agent-1',
        content: `---
name: test-agent-1
description: First test agent for integration testing
tools: [Read, Write, Edit]
model: sonnet
color: "#blue"
proactive: true
priority: P1
usage: Integration testing purposes
---

# Test Agent 1

This is the first test agent for integration testing.

## Purpose
Validates the complete agent discovery and management workflow.`
      },
      {
        name: 'test-agent-2',
        content: `---
name: test-agent-2
description: Second test agent with different configuration
tools: [Bash, Grep, Glob]
model: haiku
color: "#green"
proactive: false
priority: P2
usage: Secondary testing workflows
---

# Test Agent 2

This is the second test agent with different configuration.

## Purpose
Tests agent diversity and filtering capabilities.`
      },
      {
        name: 'malformed-agent',
        content: `This is a malformed agent file without proper frontmatter.`
      }
    ];

    for (const agent of agents) {
      await fs.writeFile(
        path.join(agentDir, `${agent.name}.md`),
        agent.content
      );
    }
  }

  describe('End-to-End Agent Discovery and Database Integration', () => {
    it('should discover agents from filesystem and save to database', async () => {
      // Act: Discover agents
      const discoveredAgents = await discoveryService.discoverAgents();

      // Assert: Correct number of valid agents discovered
      expect(discoveredAgents).toHaveLength(2); // malformed agent should be skipped
      expect(discoveredAgents.map(a => a.name)).toContain('test-agent-1');
      expect(discoveredAgents.map(a => a.name)).toContain('test-agent-2');

      // Act: Save agents to database
      for (const agent of discoveredAgents) {
        await database.saveAgent(agent);
      }

      // Assert: Agents saved successfully
      const agent1 = await database.getAgent('test-agent-1');
      const agent2 = await database.getAgent('test-agent-2');

      expect(agent1).toBeTruthy();
      expect(agent1!.name).toBe('test-agent-1');
      expect(agent1!.tools).toEqual(['Read', 'Write', 'Edit']);
      expect(agent1!.proactive).toBe(true);

      expect(agent2).toBeTruthy();
      expect(agent2!.name).toBe('test-agent-2');
      expect(agent2!.model).toBe('haiku');
      expect(agent2!.proactive).toBe(false);
    });

    it('should retrieve agents by slug', async () => {
      // Arrange: Ensure agents are in database
      const agents = await discoveryService.discoverAgents();
      for (const agent of agents) {
        await database.saveAgent(agent);
      }

      // Act: Get agent by slug
      const agent = await database.getAgentBySlug('test-agent-1');

      // Assert
      expect(agent).toBeTruthy();
      expect(agent!.name).toBe('test-agent-1');
    });

    it('should support agent filtering and search', async () => {
      // Arrange
      const agents = await discoveryService.discoverAgents();
      for (const agent of agents) {
        await database.saveAgent(agent);
      }

      // Act: Filter by model
      const sonnetAgents = await database.listAgents({ model: 'sonnet' });
      const haikuAgents = await database.listAgents({ model: 'haiku' });

      // Assert
      expect(sonnetAgents).toHaveLength(1);
      expect(sonnetAgents[0].name).toBe('test-agent-1');
      expect(haikuAgents).toHaveLength(1);
      expect(haikuAgents[0].name).toBe('test-agent-2');

      // Act: Filter by proactive
      const proactiveAgents = await database.listAgents({ proactive: true });
      const nonProactiveAgents = await database.listAgents({ proactive: false });

      // Assert
      expect(proactiveAgents).toHaveLength(1);
      expect(proactiveAgents[0].name).toBe('test-agent-1');
      expect(nonProactiveAgents).toHaveLength(1);
      expect(nonProactiveAgents[0].name).toBe('test-agent-2');

      // Act: Search
      const searchResults = await database.listAgents({ search: 'different configuration' });

      // Assert
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('test-agent-2');
    });
  });

  describe('Workspace Management Integration', () => {
    it('should create and manage agent workspaces', async () => {
      // Act: Create workspace
      const workspace = await workspaceManager.createWorkspace('test-agent-1');

      // Assert: Workspace created correctly
      expect(workspace.name).toBe('test-agent-1');
      expect(workspace.directory).toBe(path.join(workspaceDir, 'test-agent-1'));
      expect(workspace.files).toContain('README.md');

      // Verify directory structure exists
      const stats = await fs.stat(workspace.directory);
      expect(stats.isDirectory()).toBe(true);

      const logsDir = await fs.stat(path.join(workspace.directory, 'logs'));
      expect(logsDir.isDirectory()).toBe(true);

      const filesDir = await fs.stat(path.join(workspace.directory, 'files'));
      expect(filesDir.isDirectory()).toBe(true);
    });

    it('should write and read files from workspace', async () => {
      // Arrange: Create workspace
      await workspaceManager.createWorkspace('test-agent-2');

      // Act: Write file
      const filePath = await workspaceManager.writeFile(
        'test-agent-2',
        'output/result.txt',
        'Test file content'
      );

      // Assert: File written correctly
      expect(filePath).toContain('test-agent-2/files/output/result.txt');

      // Act: Read file
      const content = await workspaceManager.readFile('test-agent-2', 'output/result.txt');

      // Assert: Content matches
      expect(content).toBe('Test file content');
    });

    it('should manage workspace logs', async () => {
      // Arrange: Create workspace
      await workspaceManager.createWorkspace('logging-agent');

      // Act: Add logs
      await workspaceManager.log('logging-agent', 'info', 'Test info message', { key: 'value' });
      await workspaceManager.log('logging-agent', 'warn', 'Test warning message');
      await workspaceManager.log('logging-agent', 'error', 'Test error message');

      // Assert: Logs recorded (check workspace state)
      const workspace = await workspaceManager.getWorkspace('logging-agent');
      expect(workspace).toBeTruthy();
      expect(workspace!.logs.length).toBeGreaterThan(0);
    });

    it('should list all workspaces', async () => {
      // Arrange: Create multiple workspaces
      await workspaceManager.createWorkspace('workspace-1');
      await workspaceManager.createWorkspace('workspace-2');

      // Act: List workspaces
      const workspaces = await workspaceManager.listWorkspaces();

      // Assert: All workspaces listed
      const workspaceNames = workspaces.map(w => w.name);
      expect(workspaceNames).toContain('workspace-1');
      expect(workspaceNames).toContain('workspace-2');
    });
  });

  describe('Metrics and Logging Integration', () => {
    it('should track and update agent metrics', async () => {
      // Arrange: Create agent in database
      const agents = await discoveryService.discoverAgents();
      await database.saveAgent(agents[0]);

      // Act: Update metrics
      await database.updateMetrics('test-agent-1', {
        totalInvocations: 10,
        successRate: 0.9,
        averageResponseTime: 1500,
        lastUsed: new Date(),
        errorCount: 1
      });

      // Assert: Metrics saved
      const metrics = await database.getMetrics('test-agent-1');
      expect(metrics).toBeTruthy();
      expect(metrics!.totalInvocations).toBe(10);
      expect(metrics!.successRate).toBe(0.9);
      expect(metrics!.averageResponseTime).toBe(1500);
      expect(metrics!.errorCount).toBe(1);
    });

    it('should store and retrieve agent logs', async () => {
      // Arrange: Create agent in database
      const agents = await discoveryService.discoverAgents();
      await database.saveAgent(agents[0]);

      // Act: Add logs
      await database.addLog('test-agent-1', 'info', 'Agent started', { version: '1.0.0' });
      await database.addLog('test-agent-1', 'warn', 'Configuration issue detected');
      await database.addLog('test-agent-1', 'error', 'Processing failed', { error: 'timeout' });

      // Assert: Logs stored and retrievable
      const logs = await database.getLogs('test-agent-1', 10);
      expect(logs).toHaveLength(3);
      
      expect(logs[0].level).toBe('error'); // Most recent first
      expect(logs[0].message).toBe('Processing failed');
      expect(logs[0].context).toEqual({ error: 'timeout' });

      expect(logs[1].level).toBe('warn');
      expect(logs[1].message).toBe('Configuration issue detected');
      expect(logs[1].context).toBeUndefined();

      expect(logs[2].level).toBe('info');
      expect(logs[2].message).toBe('Agent started');
      expect(logs[2].context).toEqual({ version: '1.0.0' });
    });

    it('should record workspace activity in database', async () => {
      // Arrange: Create workspace and agent
      const agents = await discoveryService.discoverAgents();
      await database.saveAgent(agents[0]);
      const workspace = await workspaceManager.createWorkspace('test-agent-1');

      // Act: Record workspace activity
      await database.recordWorkspaceActivity(
        'test-agent-1',
        workspace.directory,
        ['file1.txt', 'file2.js', 'README.md']
      );

      // Assert: Activity recorded (verified through database stats)
      const stats = database.getStats();
      expect(stats.totalWorkspaces).toBeGreaterThan(0);
    });
  });

  describe('API Controller Integration', () => {
    let mockRequest: any;
    let mockResponse: any;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnThis();
      mockRequest = {};
      mockResponse = { json: mockJson, status: mockStatus };
    });

    it('should sync agents through API', async () => {
      // Act: Sync agents via API
      await apiController.syncAgents(mockRequest, mockResponse);

      // Assert: Sync successful
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            discovered: 2,
            saved: 2
          })
        })
      );

      // Verify agents are in database
      const agent1 = await database.getAgent('test-agent-1');
      const agent2 = await database.getAgent('test-agent-2');
      expect(agent1).toBeTruthy();
      expect(agent2).toBeTruthy();
    });

    it('should list agents through API with pagination', async () => {
      // Arrange: Sync agents first
      await apiController.syncAgents(mockRequest, mockResponse);
      jest.clearAllMocks();

      // Act: List agents with pagination
      mockRequest.query = { page: '1', limit: '1' };
      await apiController.listAgents(mockRequest, mockResponse);

      // Assert: Pagination works
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              name: expect.stringMatching(/test-agent-[12]/)
            })
          ])
        })
      );

      const responseData = mockJson.mock.calls[0][0].data;
      expect(responseData).toHaveLength(1); // Limited to 1 result
    });

    it('should create workspace through API', async () => {
      // Act: Create workspace via API
      mockRequest.params = { name: 'api-test-agent' };
      await apiController.createAgentWorkspace(mockRequest, mockResponse);

      // Assert: Workspace created
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Workspace created for agent 'api-test-agent'"
        })
      );

      // Verify workspace exists
      const workspace = await workspaceManager.getWorkspace('api-test-agent');
      expect(workspace).toBeTruthy();
      expect(workspace!.name).toBe('api-test-agent');
    });

    it('should handle health check with all systems', async () => {
      // Act: Health check
      await apiController.healthCheck(mockRequest, mockResponse);

      // Assert: All systems healthy
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'All systems operational',
          data: expect.objectContaining({
            database: true,
            discovery: true,
            workspace: true
          })
        })
      );
    });
  });

  describe('Complete Workflow Integration', () => {
    it('should execute complete agent lifecycle', async () => {
      const agentName = 'lifecycle-agent';
      
      // Step 1: Create agent file
      await fs.writeFile(
        path.join(agentDir, `${agentName}.md`),
        `---
name: ${agentName}
description: Agent for lifecycle testing
tools: [Read, Write]
model: sonnet
color: "#purple"
proactive: true
priority: P1
usage: Lifecycle testing
---

# Lifecycle Agent

Testing complete agent lifecycle.`
      );

      // Step 2: Discover agent
      discoveryService.clearCache();
      const agents = await discoveryService.discoverAgents();
      const lifecycleAgent = agents.find(a => a.name === agentName);
      expect(lifecycleAgent).toBeTruthy();

      // Step 3: Save to database
      await database.saveAgent(lifecycleAgent!);

      // Step 4: Create workspace
      const workspace = await workspaceManager.createWorkspace(agentName);
      expect(workspace.name).toBe(agentName);

      // Step 5: Use workspace
      await workspaceManager.writeFile(agentName, 'config.json', '{"active": true}');
      await workspaceManager.log(agentName, 'info', 'Agent initialized');

      // Step 6: Update metrics
      await database.updateMetrics(agentName, {
        totalInvocations: 5,
        successRate: 1.0,
        averageResponseTime: 800,
        lastUsed: new Date(),
        errorCount: 0
      });

      // Step 7: Verify complete state
      const savedAgent = await database.getAgent(agentName);
      const metrics = await database.getMetrics(agentName);
      const workspaceState = await workspaceManager.getWorkspace(agentName);
      const logs = await database.getLogs(agentName);

      // Assert: Complete state is correct
      expect(savedAgent).toBeTruthy();
      expect(savedAgent!.name).toBe(agentName);

      expect(metrics).toBeTruthy();
      expect(metrics!.totalInvocations).toBe(5);
      expect(metrics!.successRate).toBe(1.0);

      expect(workspaceState).toBeTruthy();
      expect(workspaceState!.files).toContain('config.json');

      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(log => log.message === 'Agent initialized')).toBe(true);

      // Step 8: Verify file content
      const configContent = await workspaceManager.readFile(agentName, 'config.json');
      expect(configContent).toBe('{"active": true}');
    });

    it('should handle concurrent operations safely', async () => {
      const agentNames = ['concurrent-1', 'concurrent-2', 'concurrent-3'];

      // Create multiple agents concurrently
      const createPromises = agentNames.map(async (name, index) => {
        await fs.writeFile(
          path.join(agentDir, `${name}.md`),
          `---
name: ${name}
description: Concurrent test agent ${index + 1}
tools: [Read]
model: haiku
color: "#orange"
proactive: false
priority: P3
usage: Concurrency testing
---

# Concurrent Agent ${index + 1}`
        );
      });

      await Promise.all(createPromises);

      // Discover and process all agents concurrently
      discoveryService.clearCache();
      const agents = await discoveryService.discoverAgents();
      const concurrentAgents = agents.filter(a => a.name.startsWith('concurrent-'));
      expect(concurrentAgents).toHaveLength(3);

      // Save to database concurrently
      await Promise.all(concurrentAgents.map(agent => database.saveAgent(agent)));

      // Create workspaces concurrently
      await Promise.all(agentNames.map(name => workspaceManager.createWorkspace(name)));

      // Verify all operations completed successfully
      for (const name of agentNames) {
        const agent = await database.getAgent(name);
        const workspace = await workspaceManager.getWorkspace(name);
        
        expect(agent).toBeTruthy();
        expect(workspace).toBeTruthy();
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle corrupted agent files gracefully', async () => {
      // Create corrupted agent file
      await fs.writeFile(
        path.join(agentDir, 'corrupted-agent.md'),
        'Corrupted content that is not valid YAML frontmatter'
      );

      // Should not throw error, but skip corrupted file
      const agents = await discoveryService.discoverAgents();
      const corruptedAgent = agents.find(a => a.name === 'corrupted-agent');
      expect(corruptedAgent).toBeFalsy();
    });

    it('should handle database connection issues gracefully', async () => {
      // Close database connection
      database.close();

      // Attempting operations should fail gracefully
      await expect(database.getAgent('test')).rejects.toThrow();

      // Reinitialize for cleanup
      database = new AgentDatabase({ path: dbPath });
    });
  });
});
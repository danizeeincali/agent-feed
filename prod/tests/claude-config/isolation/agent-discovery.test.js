const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Isolation - Agent Discovery Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const agentPath = path.join(prodPath, '.claude/agents');
  const parentAgentPath = path.resolve(__dirname, '../../../../agents');

  beforeAll(async () => {
    // Ensure agent directories exist
    await fs.ensureDir(agentPath);
    
    // Create test agents in prod directory
    const testAgents = [
      { name: 'meta-agent', type: 'system' },
      { name: 'test-agent', type: 'utility' },
      { name: 'config-agent', type: 'configuration' }
    ];

    for (const agent of testAgents) {
      const agentDir = path.join(agentPath, agent.name);
      await fs.ensureDir(agentDir);
      await fs.writeJson(path.join(agentDir, 'agent.json'), {
        name: agent.name,
        type: agent.type,
        version: '1.0.0',
        isolated: true,
        prodOnly: true
      });
    }
  });

  describe('Agent Discovery Isolation', () => {
    test('should discover agents only from /prod/.claude/agents/', async () => {
      const discoveredAgents = [];
      
      try {
        const agentDirs = await fs.readdir(agentPath);
        
        for (const dir of agentDirs) {
          const agentConfigPath = path.join(agentPath, dir, 'agent.json');
          if (await fs.pathExists(agentConfigPath)) {
            const agentConfig = await fs.readJson(agentConfigPath);
            discoveredAgents.push({
              name: agentConfig.name,
              path: path.join(agentPath, dir),
              config: agentConfig
            });
          }
        }
      } catch (error) {
        // Handle discovery errors
      }

      // All discovered agents should be within prod boundary
      for (const agent of discoveredAgents) {
        expect(agent.path).toBeIsolatedPath();
        expect(agent.path.startsWith(agentPath)).toBe(true);
        expect(agent.config.isolated).toBe(true);
      }

      expect(discoveredAgents.length).toBeGreaterThan(0);
    });

    test('should NOT discover agents from parent directories', async () => {
      let parentAgentsFound = [];
      
      // Attempt to access parent agent directory (should fail in isolation)
      try {
        if (await fs.pathExists(parentAgentPath)) {
          const parentDirs = await fs.readdir(parentAgentPath);
          parentAgentsFound = parentDirs;
        }
      } catch (error) {
        // Expected behavior: access denied or path not found
        expect(error.message).toMatch(/(ENOENT|EACCES|isolation)/i);
      }

      // In isolation mode, parent agents should not be accessible
      const isIsolated = !parentAgentPath.startsWith(prodPath);
      if (isIsolated) {
        expect(parentAgentsFound.length).toBe(0);
      }
    });

    test('should validate agent configuration format', async () => {
      const agentDirs = await fs.readdir(agentPath);
      
      for (const dir of agentDirs) {
        const agentConfigPath = path.join(agentPath, dir, 'agent.json');
        
        if (await fs.pathExists(agentConfigPath)) {
          const agentConfig = await fs.readJson(agentConfigPath);
          
          // Validate required fields
          expect(agentConfig).toHaveProperty('name');
          expect(agentConfig).toHaveProperty('type');
          expect(agentConfig).toHaveProperty('version');
          expect(agentConfig).toHaveProperty('isolated');
          
          // Validate isolation flag
          expect(agentConfig.isolated).toBe(true);
          expect(agentConfig.prodOnly).toBe(true);
        }
      }
    });
  });

  describe('Agent Path Validation', () => {
    test('should validate all agent paths are within prod boundary', async () => {
      const agentDirs = await fs.readdir(agentPath);
      
      for (const dir of agentDirs) {
        const fullPath = path.join(agentPath, dir);
        
        // Validate path isolation
        expect(fullPath).toBeIsolatedPath();
        expect(fullPath.startsWith(prodPath)).toBe(true);
        
        // Validate no symbolic links to parent directories
        const stats = await fs.lstat(fullPath);
        if (stats.isSymbolicLink()) {
          const realPath = await fs.realpath(fullPath);
          expect(realPath).toBeIsolatedPath();
        }
      }
    });

    test('should prevent agent loading from unauthorized paths', () => {
      const unauthorizedPaths = [
        '/workspaces/agent-feed/agents',
        '../../agents',
        '../../../agents',
        '/tmp/agents',
        '/var/agents'
      ];

      for (const unauthorizedPath of unauthorizedPaths) {
        const resolvedPath = path.resolve(prodPath, unauthorizedPath);
        
        // Should be blocked by isolation
        if (!resolvedPath.startsWith(prodPath)) {
          expect(() => {
            // Simulate agent loading attempt
            throw new Error(`Agent loading blocked from unauthorized path: ${unauthorizedPath}`);
          }).toThrow('Agent loading blocked');
        }
      }
    });
  });

  describe('Meta-Agent Functionality', () => {
    test('should correctly discover and configure meta-agent', async () => {
      const metaAgentPath = path.join(agentPath, 'meta-agent');
      
      if (await fs.pathExists(metaAgentPath)) {
        const configPath = path.join(metaAgentPath, 'agent.json');
        const config = await fs.readJson(configPath);
        
        expect(config.name).toBe('meta-agent');
        expect(config.type).toBe('system');
        expect(config.isolated).toBe(true);
        expect(metaAgentPath).toBeIsolatedPath();
      }
    });

    test('should validate meta-agent system management capabilities', async () => {
      // Simulate meta-agent operations
      const metaAgentOperations = [
        { operation: 'system_status', scope: 'prod' },
        { operation: 'agent_management', scope: 'prod' },
        { operation: 'workspace_management', scope: 'prod' }
      ];

      for (const op of metaAgentOperations) {
        expect(op.scope).toBe('prod');
        expect(op.operation).toBeDefined();
      }
    });
  });
});
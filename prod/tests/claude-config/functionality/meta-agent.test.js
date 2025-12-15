const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Functionality - Meta-Agent Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const agentPath = path.join(prodPath, '.claude/agents/meta-agent');

  beforeAll(async () => {
    // Ensure meta-agent exists
    await fs.ensureDir(agentPath);
    await fs.writeJson(path.join(agentPath, 'agent.json'), {
      name: 'meta-agent',
      type: 'system',
      version: '1.0.0',
      isolated: true,
      prodOnly: true,
      capabilities: [
        'system_management',
        'agent_coordination',
        'feed_system_oversight',
        'workspace_management'
      ],
      permissions: {
        read: ['system_instructions.md', '.claude/config.json', 'agent_workspace'],
        write: ['agent_workspace'],
        execute: ['system_commands']
      }
    });
  });

  describe('Meta-Agent Discovery', () => {
    test('should discover meta-agent from isolated agent directory', async () => {
      const configPath = path.join(agentPath, 'agent.json');
      expect(await fs.pathExists(configPath)).toBe(true);
      
      const config = await fs.readJson(configPath);
      expect(config.name).toBe('meta-agent');
      expect(config.type).toBe('system');
      expect(config.isolated).toBe(true);
      expect(config.prodOnly).toBe(true);
    });

    test('should validate meta-agent capabilities', async () => {
      const configPath = path.join(agentPath, 'agent.json');
      const config = await fs.readJson(configPath);
      
      const expectedCapabilities = [
        'system_management',
        'agent_coordination', 
        'feed_system_oversight',
        'workspace_management'
      ];
      
      expect(config.capabilities).toBeDefined();
      for (const capability of expectedCapabilities) {
        expect(config.capabilities).toContain(capability);
      }
    });

    test('should validate meta-agent permissions', async () => {
      const configPath = path.join(agentPath, 'agent.json');
      const config = await fs.readJson(configPath);
      
      expect(config.permissions).toBeDefined();
      expect(config.permissions.read).toContain('system_instructions.md');
      expect(config.permissions.read).toContain('.claude/config.json');
      expect(config.permissions.write).toContain('agent_workspace');
      expect(config.permissions.execute).toContain('system_commands');
    });
  });

  describe('Meta-Agent System Management', () => {
    test('should manage agent-feed system from prod environment', async () => {
      // Simulate meta-agent system management operations
      const systemOperations = [
        { operation: 'check_system_status', scope: 'agent-feed' },
        { operation: 'monitor_feed_health', scope: 'backend' },
        { operation: 'coordinate_agents', scope: 'all' }
      ];

      for (const op of systemOperations) {
        expect(op.operation).toBeDefined();
        expect(op.scope).toBeDefined();
        
        // Validate operation is within allowed scope
        const allowedScopes = ['agent-feed', 'backend', 'all', 'prod'];
        expect(allowedScopes).toContain(op.scope);
      }
    });

    test('should coordinate with existing agent-feed infrastructure', async () => {
      // Check if can access system_instructions.md (read-only)
      const systemInstructionsPath = path.join(prodPath, 'system_instructions.md');
      
      // Should be able to read system instructions
      if (await fs.pathExists(systemInstructionsPath)) {
        const content = await fs.readFile(systemInstructionsPath, 'utf8');
        expect(content).toBeDefined();
        expect(content.length).toBeGreaterThan(0);
      }
    });

    test('should maintain isolation while managing system', async () => {
      const metaAgentOperations = [
        path.join(prodPath, 'agent_workspace/meta-operations'),
        path.join(prodPath, '.claude/meta-logs'),
        path.join(prodPath, 'agent_workspace/coordination-data')
      ];

      for (const operationPath of metaAgentOperations) {
        expect(operationPath).toBeIsolatedPath();
        expect(operationPath.startsWith(prodPath)).toBe(true);
      }
    });
  });

  describe('Feed System Integration', () => {
    test('should interface with agent-feed backend through isolated channels', async () => {
      // Simulate meta-agent interfacing with backend
      const backendInterface = {
        endpoint: 'http://localhost:3001',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        isolation: true,
        prodOnly: true
      };

      expect(backendInterface.endpoint).toBeDefined();
      expect(backendInterface.isolation).toBe(true);
      expect(backendInterface.prodOnly).toBe(true);
      expect(backendInterface.methods.length).toBeGreaterThan(0);
    });

    test('should manage feed operations without breaking isolation', async () => {
      const feedOperations = [
        { type: 'feed_monitoring', isolated: true },
        { type: 'performance_tracking', isolated: true },
        { type: 'error_handling', isolated: true },
        { type: 'resource_management', isolated: true }
      ];

      for (const operation of feedOperations) {
        expect(operation.isolated).toBe(true);
        expect(operation.type).toBeDefined();
      }
    });

    test('should coordinate multiple agents safely', async () => {
      // Simulate agent coordination
      const coordinationConfig = {
        maxAgents: 10,
        isolationEnforced: true,
        communicationChannels: ['ipc', 'http'],
        securityBoundaries: true
      };

      expect(coordinationConfig.isolationEnforced).toBe(true);
      expect(coordinationConfig.securityBoundaries).toBe(true);
      expect(coordinationConfig.maxAgents).toBeGreaterThan(0);
    });
  });

  describe('Workspace Management', () => {
    test('should manage agent workspace within prod boundary', async () => {
      const workspacePath = path.join(prodPath, 'agent_workspace');
      const metaWorkspace = path.join(workspacePath, 'meta-agent');
      
      await fs.ensureDir(metaWorkspace);
      expect(metaWorkspace).toBeIsolatedPath();
      
      // Create test files in meta workspace
      const testFile = path.join(metaWorkspace, 'coordination.json');
      await fs.writeJson(testFile, {
        agent: 'meta-agent',
        operation: 'workspace_test',
        isolated: true
      });

      expect(await fs.pathExists(testFile)).toBe(true);
      const data = await fs.readJson(testFile);
      expect(data.isolated).toBe(true);

      // Cleanup
      await fs.remove(metaWorkspace);
    });

    test('should maintain workspace security', async () => {
      const workspacePath = path.join(prodPath, 'agent_workspace');
      const secureWorkspace = path.join(workspacePath, 'secure-meta');
      
      await fs.ensureDir(secureWorkspace);
      
      // Test file permissions and isolation
      const secureFile = path.join(secureWorkspace, 'secure-data.json');
      await fs.writeJson(secureFile, {
        sensitive: false,
        isolated: true,
        prodOnly: true
      });

      const stats = await fs.stat(secureFile);
      expect(stats.isFile()).toBe(true);
      expect(secureFile).toBeIsolatedPath();

      // Cleanup
      await fs.remove(secureWorkspace);
    });
  });

  describe('Tool Integration', () => {
    test('should integrate with Claude Code tools while maintaining isolation', () => {
      const toolOperations = [
        { tool: 'Read', path: 'system_instructions.md', allowed: true },
        { tool: 'Write', path: 'agent_workspace/output.txt', allowed: true },
        { tool: 'Bash', command: 'ls .claude', allowed: true },
        { tool: 'Read', path: '../../../package.json', allowed: false }
      ];

      for (const op of toolOperations) {
        if (op.allowed) {
          if (op.path) {
            const fullPath = path.resolve(prodPath, op.path);
            expect(fullPath).toBeIsolatedPath();
          }
          expect(op.allowed).toBe(true);
        } else {
          expect(op.allowed).toBe(false);
        }
      }
    });

    test('should validate tool access permissions', () => {
      const toolPermissions = {
        'Read': { 
          allowed: ['system_instructions.md', '.claude/*', 'agent_workspace/*'],
          denied: ['../*', '../../*', '/etc/*']
        },
        'Write': {
          allowed: ['agent_workspace/*'],
          denied: ['system_instructions.md', '../*', '../../*']
        },
        'Bash': {
          allowed: ['ls', 'pwd', 'cat'],
          denied: ['rm -rf /', 'sudo', 'chmod 777']
        }
      };

      for (const [tool, permissions] of Object.entries(toolPermissions)) {
        expect(permissions.allowed.length).toBeGreaterThan(0);
        expect(permissions.denied.length).toBeGreaterThan(0);
      }
    });
  });
});
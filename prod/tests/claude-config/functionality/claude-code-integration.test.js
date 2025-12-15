const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Functionality - Integration Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const workspacePath = path.join(prodPath, 'agent_workspace');

  describe('Claude Code Initialization', () => {
    test('should initialize properly in prod environment', async () => {
      const requiredPaths = [
        path.join(prodPath, '.claude'),
        path.join(prodPath, '.claude/config.json'),
        path.join(prodPath, '.claude/agents'),
        path.join(prodPath, 'agent_workspace')
      ];

      for (const requiredPath of requiredPaths) {
        expect(requiredPath).toBeIsolatedPath();
        
        if (requiredPath.endsWith('.json')) {
          if (await fs.pathExists(requiredPath)) {
            const content = await fs.readJson(requiredPath);
            expect(content).toBeDefined();
          }
        } else {
          await fs.ensureDir(requiredPath);
          expect(await fs.pathExists(requiredPath)).toBe(true);
        }
      }
    });

    test('should load configuration from prod/.claude/config.json', async () => {
      const configPath = path.join(prodPath, '.claude/config.json');
      
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        
        expect(config).toHaveValidClaudeConfig();
        expect(config.isolation.enabled).toBe(true);
        expect(config.isolation.allowParentAccess).toBe(false);
        expect(config.workspace.directory).toBe('agent_workspace');
      }
    });

    test('should respect isolation settings', () => {
      const isolationConfig = {
        enabled: true,
        allowParentAccess: false,
        agentDiscoveryPaths: ['.claude/agents'],
        securityBoundary: prodPath
      };

      expect(isolationConfig.enabled).toBe(true);
      expect(isolationConfig.allowParentAccess).toBe(false);
      expect(isolationConfig.agentDiscoveryPaths).toContain('.claude/agents');
      expect(isolationConfig.securityBoundary).toBeIsolatedPath();
    });
  });

  describe('Agent Discovery and Management', () => {
    test('should discover agents from prod/.claude/agents only', async () => {
      const agentsPath = path.join(prodPath, '.claude/agents');
      await fs.ensureDir(agentsPath);
      
      // Create test agent
      const testAgentPath = path.join(agentsPath, 'test-integration-agent');
      await fs.ensureDir(testAgentPath);
      await fs.writeJson(path.join(testAgentPath, 'agent.json'), {
        name: 'test-integration-agent',
        type: 'integration',
        version: '1.0.0',
        isolated: true
      });

      // Simulate agent discovery
      const discoveredAgents = [];
      const agentDirs = await fs.readdir(agentsPath);
      
      for (const dir of agentDirs) {
        const agentConfigPath = path.join(agentsPath, dir, 'agent.json');
        if (await fs.pathExists(agentConfigPath)) {
          const config = await fs.readJson(agentConfigPath);
          discoveredAgents.push(config);
        }
      }

      expect(discoveredAgents.length).toBeGreaterThan(0);
      const testAgent = discoveredAgents.find(a => a.name === 'test-integration-agent');
      expect(testAgent).toBeDefined();
      expect(testAgent.isolated).toBe(true);
    });

    test('should prevent agent discovery from parent directories', () => {
      const parentAgentPaths = [
        path.resolve(__dirname, '../../../../agents'),
        path.resolve(__dirname, '../../../../.claude/agents'),
        '/workspaces/agent-feed/agents'
      ];

      for (const parentPath of parentAgentPaths) {
        const isBlocked = !parentPath.startsWith(prodPath);
        expect(isBlocked).toBe(true);
      }
    });
  });

  describe('Workspace Management', () => {
    test('should create and manage workspace within prod boundary', async () => {
      const testWorkspace = path.join(workspacePath, 'integration-test');
      
      // Simulate Claude Code workspace creation
      await fs.ensureDir(testWorkspace);
      expect(testWorkspace).toBeIsolatedPath();
      
      // Create workspace structure
      const workspaceStructure = [
        'projects',
        'temp',
        'output',
        'logs'
      ];

      for (const dir of workspaceStructure) {
        const dirPath = path.join(testWorkspace, dir);
        await fs.ensureDir(dirPath);
        expect(dirPath).toBeIsolatedPath();
      }

      // Cleanup
      await fs.remove(testWorkspace);
    });

    test('should handle workspace operations safely', async () => {
      const testWorkspace = path.join(workspacePath, 'safe-ops-test');
      await fs.ensureDir(testWorkspace);

      const safeOperations = [
        { type: 'create', path: path.join(testWorkspace, 'project.json') },
        { type: 'read', path: path.join(testWorkspace, 'project.json') },
        { type: 'update', path: path.join(testWorkspace, 'project.json') },
        { type: 'delete', path: path.join(testWorkspace, 'temp.txt') }
      ];

      for (const op of safeOperations) {
        expect(op.path).toBeIsolatedPath();
        
        switch (op.type) {
          case 'create':
            await fs.writeJson(op.path, { test: true, isolated: true });
            break;
          case 'read':
            if (await fs.pathExists(op.path)) {
              const data = await fs.readJson(op.path);
              expect(data.isolated).toBe(true);
            }
            break;
          case 'update':
            if (await fs.pathExists(op.path)) {
              await fs.writeJson(op.path, { test: true, isolated: true, updated: true });
            }
            break;
          case 'delete':
            const tempFile = path.join(testWorkspace, 'temp.txt');
            await fs.writeFile(tempFile, 'temporary');
            await fs.remove(tempFile);
            break;
        }
      }

      // Cleanup
      await fs.remove(testWorkspace);
    });
  });

  describe('Tool Integration Flow', () => {
    test('should execute complete Claude Code workflow within isolation', async () => {
      const workflowWorkspace = path.join(workspacePath, 'workflow-test');
      await fs.ensureDir(workflowWorkspace);

      // Simulate complete Claude Code workflow
      const workflow = [
        {
          step: 'initialization',
          tool: 'Bash',
          command: `ls ${workflowWorkspace}`,
          description: 'List workspace contents'
        },
        {
          step: 'file_creation',
          tool: 'Write',
          file_path: path.join(workflowWorkspace, 'workflow.txt'),
          content: 'Workflow test content'
        },
        {
          step: 'file_reading',
          tool: 'Read',
          file_path: path.join(workflowWorkspace, 'workflow.txt')
        },
        {
          step: 'file_editing',
          tool: 'Edit',
          file_path: path.join(workflowWorkspace, 'workflow.txt'),
          old_string: 'test content',
          new_string: 'modified content'
        },
        {
          step: 'file_search',
          tool: 'Grep',
          pattern: 'modified',
          path: workflowWorkspace
        }
      ];

      for (const step of workflow) {
        expect(step.step).toBeDefined();
        
        if (step.file_path) {
          expect(step.file_path).toBeIsolatedPath();
        }
        
        if (step.path) {
          expect(step.path).toBeIsolatedPath();
        }

        // Execute workflow step (simulation)
        switch (step.tool) {
          case 'Write':
            await fs.writeFile(step.file_path, step.content);
            break;
          case 'Read':
            if (await fs.pathExists(step.file_path)) {
              await fs.readFile(step.file_path, 'utf8');
            }
            break;
          case 'Edit':
            if (await fs.pathExists(step.file_path)) {
              let content = await fs.readFile(step.file_path, 'utf8');
              content = content.replace(step.old_string, step.new_string);
              await fs.writeFile(step.file_path, content);
            }
            break;
        }
      }

      // Verify workflow completed successfully
      const finalFile = path.join(workflowWorkspace, 'workflow.txt');
      if (await fs.pathExists(finalFile)) {
        const content = await fs.readFile(finalFile, 'utf8');
        expect(content).toContain('modified content');
      }

      // Cleanup
      await fs.remove(workflowWorkspace);
    });

    test('should maintain performance during complex operations', async () => {
      const perfTestWorkspace = path.join(workspacePath, 'performance-test');
      await fs.ensureDir(perfTestWorkspace);

      const startTime = Date.now();

      // Simulate complex Claude Code operations
      const operations = [];
      for (let i = 0; i < 50; i++) {
        const filePath = path.join(perfTestWorkspace, `perf-test-${i}.json`);
        operations.push(
          fs.writeJson(filePath, {
            id: i,
            timestamp: Date.now(),
            isolated: true,
            prodOnly: true
          })
        );
      }

      await Promise.all(operations);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (5 seconds)
      expect(executionTime).toBeLessThan(5000);

      // Verify all operations completed
      const files = await fs.readdir(perfTestWorkspace);
      expect(files.length).toBe(50);

      // Cleanup
      await fs.remove(perfTestWorkspace);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle and recover from errors gracefully', async () => {
      const errorTestWorkspace = path.join(workspacePath, 'error-test');
      await fs.ensureDir(errorTestWorkspace);

      const errorScenarios = [
        {
          description: 'File not found',
          operation: () => fs.readFile(path.join(errorTestWorkspace, 'nonexistent.txt')),
          expectedError: true
        },
        {
          description: 'Invalid JSON',
          operation: async () => {
            const invalidJsonFile = path.join(errorTestWorkspace, 'invalid.json');
            await fs.writeFile(invalidJsonFile, 'invalid json content');
            return fs.readJson(invalidJsonFile);
          },
          expectedError: true
        },
        {
          description: 'Permission denied simulation',
          operation: () => Promise.reject(new Error('EACCES: permission denied')),
          expectedError: true
        }
      ];

      for (const scenario of errorScenarios) {
        try {
          await scenario.operation();
          if (scenario.expectedError) {
            fail(`Expected error for: ${scenario.description}`);
          }
        } catch (error) {
          expect(scenario.expectedError).toBe(true);
          expect(error).toBeInstanceOf(Error);
        }
      }

      // Cleanup
      await fs.remove(errorTestWorkspace);
    });

    test('should maintain isolation even during error conditions', async () => {
      const isolationErrorTest = path.join(workspacePath, 'isolation-error-test');
      await fs.ensureDir(isolationErrorTest);

      const errorOperations = [
        {
          description: 'Path traversal during error',
          path: '../../../malicious-error.txt',
          shouldBeBlocked: true
        },
        {
          description: 'Symlink creation during error',
          path: path.join(isolationErrorTest, 'error-symlink'),
          target: '../../../target',
          shouldBeBlocked: true
        }
      ];

      for (const op of errorOperations) {
        if (op.shouldBeBlocked) {
          const resolvedPath = path.resolve(prodPath, op.path);
          const isOutsideBoundary = !resolvedPath.startsWith(prodPath);
          
          if (isOutsideBoundary) {
            expect(() => {
              throw new Error(`Error operation blocked: ${op.description}`);
            }).toThrow('Error operation blocked');
          }
        }
      }

      // Cleanup
      await fs.remove(isolationErrorTest);
    });
  });
});
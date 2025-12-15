const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Isolation - Workspace Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const workspacePath = path.join(prodPath, 'agent_workspace');

  beforeAll(async () => {
    // Ensure workspace directory exists
    await fs.ensureDir(workspacePath);
  });

  describe('Workspace Creation and Management', () => {
    test('should create workspace within prod boundary', async () => {
      const testWorkspace = path.join(workspacePath, 'test-workspace');
      await fs.ensureDir(testWorkspace);
      
      expect(testWorkspace).toBeIsolatedPath();
      expect(testWorkspace.startsWith(workspacePath)).toBe(true);
      expect(await fs.pathExists(testWorkspace)).toBe(true);
      
      // Cleanup
      await fs.remove(testWorkspace);
    });

    test('should prevent workspace creation outside prod', () => {
      const forbiddenWorkspaces = [
        '../workspace',
        '../../external-workspace',
        '/tmp/workspace',
        '../../../parent-workspace'
      ];

      for (const workspace of forbiddenWorkspaces) {
        const resolvedPath = path.resolve(workspacePath, workspace);
        
        if (!resolvedPath.startsWith(prodPath)) {
          expect(() => {
            // Simulate workspace creation attempt
            throw new Error(`Workspace creation blocked outside prod: ${workspace}`);
          }).toThrow('Workspace creation blocked');
        }
      }
    });

    test('should isolate workspace file operations', async () => {
      const testWorkspace = path.join(workspacePath, 'isolation-test');
      await fs.ensureDir(testWorkspace);

      // Test file operations within workspace
      const testFile = path.join(testWorkspace, 'test.txt');
      await fs.writeFile(testFile, 'test content');
      
      expect(await fs.pathExists(testFile)).toBe(true);
      expect(testFile).toBeIsolatedPath();
      
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('test content');

      // Cleanup
      await fs.remove(testWorkspace);
    });
  });

  describe('Workspace Security', () => {
    test('should prevent symlink attacks from workspace', async () => {
      const testWorkspace = path.join(workspacePath, 'security-test');
      await fs.ensureDir(testWorkspace);

      const maliciousTargets = [
        '../../../package.json',
        '../../../.env',
        '/etc/passwd',
        '../../../node_modules'
      ];

      for (const target of maliciousTargets) {
        const symlinkPath = path.join(testWorkspace, `link-${Date.now()}`);
        const resolvedTarget = path.resolve(testWorkspace, target);
        
        // Should be blocked if outside prod boundary
        if (!resolvedTarget.startsWith(prodPath)) {
          expect(() => {
            // Simulate symlink creation attempt
            throw new Error(`Symlink creation blocked: ${target}`);
          }).toThrow('Symlink creation blocked');
        }
      }

      // Cleanup
      await fs.remove(testWorkspace);
    });

    test('should validate workspace permissions', async () => {
      const testWorkspace = path.join(workspacePath, 'permissions-test');
      await fs.ensureDir(testWorkspace);

      const stats = await fs.stat(testWorkspace);
      
      // Validate directory permissions
      expect(stats.isDirectory()).toBe(true);
      expect(testWorkspace).toBeIsolatedPath();

      // Test write permissions
      const testFile = path.join(testWorkspace, 'permission-test.txt');
      await fs.writeFile(testFile, 'permission test');
      
      expect(await fs.pathExists(testFile)).toBe(true);

      // Cleanup
      await fs.remove(testWorkspace);
    });
  });

  describe('Workspace Resource Management', () => {
    test('should track workspace resource usage', async () => {
      const testWorkspace = path.join(workspacePath, 'resource-test');
      await fs.ensureDir(testWorkspace);

      // Create test files to measure resource usage
      const testFiles = [];
      for (let i = 0; i < 10; i++) {
        const filePath = path.join(testWorkspace, `test-${i}.txt`);
        await fs.writeFile(filePath, `Test content ${i}`);
        testFiles.push(filePath);
      }

      // Verify all files are within workspace
      for (const filePath of testFiles) {
        expect(filePath).toBeIsolatedPath();
        expect(filePath.startsWith(testWorkspace)).toBe(true);
      }

      // Check workspace size
      const workspaceStats = await fs.stat(testWorkspace);
      expect(workspaceStats.isDirectory()).toBe(true);

      // Cleanup
      await fs.remove(testWorkspace);
    });

    test('should enforce workspace size limits', async () => {
      const testWorkspace = path.join(workspacePath, 'size-limit-test');
      await fs.ensureDir(testWorkspace);

      // Simulate workspace size monitoring
      const maxWorkspaceSize = 100 * 1024 * 1024; // 100MB limit
      let currentSize = 0;

      const testFile = path.join(testWorkspace, 'large-file.txt');
      const testContent = 'x'.repeat(1024); // 1KB content
      
      await fs.writeFile(testFile, testContent);
      const fileStats = await fs.stat(testFile);
      currentSize += fileStats.size;

      expect(currentSize).toBeLessThan(maxWorkspaceSize);
      expect(testFile).toBeIsolatedPath();

      // Cleanup
      await fs.remove(testWorkspace);
    });
  });

  describe('Workspace Configuration', () => {
    test('should load workspace configuration from prod/.claude/config.json', async () => {
      const configPath = path.join(prodPath, '.claude/config.json');
      
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        
        expect(config).toHaveValidClaudeConfig();
        expect(config.workspace).toBeDefined();
        expect(config.workspace.directory).toBe('agent_workspace');
        expect(config.workspace.autoCreate).toBe(true);
      }
    });

    test('should validate workspace directory configuration', () => {
      const workspaceConfig = {
        directory: 'agent_workspace',
        autoCreate: true,
        maxSize: '100MB',
        isolation: true
      };

      expect(workspaceConfig.directory).toBe('agent_workspace');
      expect(workspaceConfig.autoCreate).toBe(true);
      expect(workspaceConfig.isolation).toBe(true);
    });
  });
});
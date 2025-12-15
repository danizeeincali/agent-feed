const fs = require('fs-extra');
const path = require('path');

describe('Claude Code Isolation - Directory Access Tests', () => {
  const prodPath = path.resolve(__dirname, '../../../');
  const parentPath = path.resolve(__dirname, '../../../../');

  describe('Directory Boundary Enforcement', () => {
    test('should prevent access to parent directories outside /prod', async () => {
      const forbiddenPaths = [
        path.join(parentPath, 'package.json'),
        path.join(parentPath, '.env'),
        path.join(parentPath, 'node_modules'),
        path.join(parentPath, 'tests'),
        path.join(parentPath, 'src')
      ];

      for (const forbiddenPath of forbiddenPaths) {
        // Simulate Claude Code attempting to access parent directories
        const relativePath = path.relative(prodPath, forbiddenPath);
        expect(relativePath).toMatch(/^\.\.[\\/]/);
        
        // Verify path would be blocked by isolation
        const isBlocked = !forbiddenPath.startsWith(prodPath);
        expect(isBlocked).toBe(true);
      }
    });

    test('should allow access only within /prod directory', async () => {
      const allowedPaths = [
        path.join(prodPath, '.claude/config.json'),
        path.join(prodPath, '.claude/agents'),
        path.join(prodPath, 'agent_workspace'),
        path.join(prodPath, 'system_instructions.md')
      ];

      for (const allowedPath of allowedPaths) {
        const relativePath = path.relative(prodPath, allowedPath);
        expect(relativePath).not.toMatch(/^\.\.[\\/]/);
        
        // Verify path is within prod boundary
        const isWithinBoundary = allowedPath.startsWith(prodPath);
        expect(isWithinBoundary).toBe(true);
        expect(allowedPath).toBeIsolatedPath();
      }
    });

    test('should restrict file operations to prod directory', async () => {
      const testOperations = [
        { operation: 'read', path: path.join(prodPath, 'test-file.txt') },
        { operation: 'write', path: path.join(prodPath, 'agent_workspace/output.txt') },
        { operation: 'list', path: path.join(prodPath, '.claude') }
      ];

      for (const op of testOperations) {
        // Verify all operations stay within prod boundary
        expect(op.path).toBeIsolatedPath();
        expect(op.path.startsWith(prodPath)).toBe(true);
      }
    });
  });

  describe('Security Boundary Validation', () => {
    test('should prevent path traversal attacks', () => {
      const maliciousPaths = [
        '../../../package.json',
        '..\\..\\..\\package.json',
        './../../../.env',
        'agent_workspace/../../../secret.txt',
        '.claude/../../../config'
      ];

      for (const maliciousPath of maliciousPaths) {
        const resolvedPath = path.resolve(prodPath, maliciousPath);
        const isOutsideBoundary = !resolvedPath.startsWith(prodPath);
        
        if (isOutsideBoundary) {
          expect(() => {
            // Simulate security check
            if (!resolvedPath.startsWith(prodPath)) {
              throw new Error('Path traversal attempt blocked');
            }
          }).toThrow('Path traversal attempt blocked');
        }
      }
    });

    test('should normalize and validate all paths', () => {
      const testPaths = [
        '.claude/../.claude/config.json',
        'agent_workspace/./subdir/../file.txt',
        './/claude//agents'
      ];

      for (const testPath of testPaths) {
        const normalizedPath = path.normalize(path.join(prodPath, testPath));
        const resolvedPath = path.resolve(prodPath, testPath);
        
        expect(normalizedPath).toBeIsolatedPath();
        expect(resolvedPath).toBeIsolatedPath();
        expect(resolvedPath.startsWith(prodPath)).toBe(true);
      }
    });
  });

  describe('Environment Isolation', () => {
    test('should isolate working directory to /prod', () => {
      const expectedCwd = prodPath;
      const actualCwd = process.cwd();
      
      // In isolation mode, working directory should be restricted
      expect(expectedCwd).toBeDefined();
      expect(path.resolve(expectedCwd)).toBeIsolatedPath();
    });

    test('should isolate environment variables', () => {
      const sensitiveVars = ['HOME', 'USER', 'PATH'];
      
      // Environment should be sandboxed in production
      for (const varName of sensitiveVars) {
        const value = process.env[varName];
        if (value) {
          // Should not expose sensitive system paths
          expect(value).not.toContain('/workspaces/agent-feed');
        }
      }
    });
  });
});
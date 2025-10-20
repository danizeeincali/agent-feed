/**
 * Integration Test Suite: AVI DM Path Protection Middleware
 *
 * TDD London School: Integration Testing
 * Phase: RED (all tests should fail initially)
 *
 * Purpose: Test backend path protection middleware behavior
 * Approach: Real HTTP requests to backend, verify middleware logic
 *
 * Tests verify:
 * - Correct cwd path (/workspaces/agent-feed/prod) returns 200 OK
 * - Wrong paths trigger 403 Forbidden
 * - Protected directories are blocked
 * - Unrestricted agent_workspace is allowed
 * - Error messages are helpful
 */

const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const CLAUDE_CODE_ENDPOINT = `${BACKEND_URL}/api/claude-code/streaming-chat`;

// Test paths
const PATHS = {
  CORRECT_CWD: '/workspaces/agent-feed/prod',
  AGENT_WORKSPACE: '/workspaces/agent-feed/prod/agent_workspace',
  WRONG_CWD_ROOT: '/workspaces/agent-feed',
  WRONG_CWD_FRONTEND: '/workspaces/agent-feed/frontend',
  WRONG_CWD_API_SERVER: '/workspaces/agent-feed/api-server',
  WRONG_CWD_NODE_MODULES: '/workspaces/agent-feed/node_modules',
  WRONG_CWD_GIT: '/workspaces/agent-feed/.git',
  PROTECTED_PACKAGE_JSON: '/workspaces/agent-feed/prod/package.json',
  PROTECTED_ENV: '/workspaces/agent-feed/prod/.env',
};

describe('AVI DM Path Protection Middleware - Integration Tests', () => {

  describe('Backend Availability', () => {
    test('backend should be running and reachable', async () => {
      const response = await fetch(`${BACKEND_URL}/health`);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    test('Claude Code endpoint should exist', async () => {
      // Send minimal valid request
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.CORRECT_CWD }
        })
      });

      // Should not be 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Correct Path Behavior (200 OK Expected)', () => {

    test('should accept correct cwd path: /workspaces/agent-feed/prod', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test message',
          options: { cwd: PATHS.CORRECT_CWD }
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should accept unrestricted agent_workspace path', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test message',
          options: { cwd: PATHS.AGENT_WORKSPACE }
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should process real Claude Code request with correct path', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is 2 + 2?',
          options: { cwd: PATHS.CORRECT_CWD }
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message || data.content).toBeDefined();

      // Verify NOT a mock response
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('mock');
      expect(responseText).not.toContain('simulation');
    });
  });

  describe('Path Protection Middleware - Blocked Paths (403 Expected)', () => {

    test('should block root workspace path', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_ROOT }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    test('should block frontend directory with helpful error', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_FRONTEND }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Forbidden');
      expect(data.blockedDirectory).toBe('frontend');
      expect(data.reason).toBe('directory_protected');
      expect(data.safeZone).toBe('/workspaces/agent-feed/prod/agent_workspace/');
      expect(data.hint).toBeDefined();
      expect(data.tip).toBeDefined();
    });

    test('should block api-server directory', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_API_SERVER }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.blockedDirectory).toBe('api-server');
    });

    test('should block node_modules directory', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_NODE_MODULES }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.blockedDirectory).toBe('node_modules');
    });

    test('should block .git directory', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_GIT }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.blockedDirectory).toBe('.git');
    });

    test('should block protected package.json in /prod/', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.PROTECTED_PACKAGE_JSON }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.reason).toBe('file_protected');
      expect(data.protectedFile).toBe('package.json');
    });

    test('should block protected .env file', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.PROTECTED_ENV }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.protectedFile).toBe('.env');
    });
  });

  describe('Error Message Quality', () => {

    test('403 error should include helpful guidance', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_FRONTEND }
        })
      });

      const data = await response.json();

      // Should have all helpful fields
      expect(data.blockedPath).toBeDefined();
      expect(data.reason).toBeDefined();
      expect(data.blockedDirectory).toBeDefined();
      expect(data.allowedPaths).toBeDefined();
      expect(data.safeZone).toBeDefined();
      expect(data.hint).toBeDefined();
      expect(data.tip).toBeDefined();
    });

    test('403 error should suggest safe zone path', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_FRONTEND }
        })
      });

      const data = await response.json();

      expect(data.safeZone).toBe('/workspaces/agent-feed/prod/agent_workspace/');
      expect(data.tip).toContain('agent_workspace');
    });
  });

  describe('Security Logging', () => {

    test('should log security alerts for blocked paths', async () => {
      // This test verifies the middleware logs alerts
      // We can't directly test the logs, but we can verify the response includes violation info

      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: PATHS.WRONG_CWD_FRONTEND }
        })
      });

      expect(response.status).toBe(403);

      const data = await response.json();

      // Verify the response has enough detail for logging
      expect(data.blockedPath).toBeDefined();
      expect(data.reason).toBeDefined();
    });
  });

  describe('Multiple Paths in Request', () => {

    test('should validate all paths in request body', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test with multiple paths: /workspaces/agent-feed/frontend/src/test.ts',
          options: {
            cwd: PATHS.CORRECT_CWD,
            additionalPaths: [
              '/workspaces/agent-feed/frontend/test.ts'
            ]
          }
        })
      });

      // Should block because message contains frontend path
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.blockedDirectory).toBe('frontend');
    });

    test('should allow if all paths are valid', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test with safe paths: /workspaces/agent-feed/prod/agent_workspace/test.ts',
          options: {
            cwd: PATHS.CORRECT_CWD,
            additionalPaths: [
              '/workspaces/agent-feed/prod/agent_workspace/another.ts'
            ]
          }
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {

    test('should handle missing cwd gracefully', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test without cwd'
        })
      });

      // Should either accept (default to safe path) or reject with clear error
      expect([200, 400, 403]).toContain(response.status);
    });

    test('should handle empty options object', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: {}
        })
      });

      // Should either accept or reject with clear error
      expect([200, 400, 403]).toContain(response.status);
    });

    test('should handle case-insensitive path matching', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: '/WORKSPACES/AGENT-FEED/FRONTEND' }
        })
      });

      // Should still block (case-insensitive)
      expect(response.status).toBe(403);
    });

    test('should handle paths with trailing slashes', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: '/workspaces/agent-feed/prod/' }
        })
      });

      // Should accept (correct path with trailing slash)
      expect(response.status).toBe(200);
    });

    test('should handle paths without trailing slashes', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: '/workspaces/agent-feed/prod' }
        })
      });

      // Should accept
      expect(response.status).toBe(200);
    });
  });

  describe('Real Claude Code Integration', () => {

    test('should execute real Claude Code with correct path', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What is the capital of France?',
          options: { cwd: PATHS.CORRECT_CWD }
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const responseText = JSON.stringify(data).toLowerCase();

      // Real Claude should answer Paris
      expect(responseText).toContain('paris');

      // Should NOT be a mock
      expect(responseText).not.toContain('simulation');
      expect(responseText).not.toContain('mock');
    }, 60000); // 60 second timeout for real Claude Code

    test('should have access to file system with correct path', async () => {
      const response = await fetch(CLAUDE_CODE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Use the Read tool to read /workspaces/agent-feed/prod/CLAUDE.md and tell me what file you read',
          options: { cwd: PATHS.CORRECT_CWD }
        })
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const responseText = JSON.stringify(data).toLowerCase();

      // Should mention the file it read
      expect(responseText).toMatch(/claude\.md|read.*file/);
      expect(responseText).not.toContain('cannot read');
      expect(responseText).not.toContain('no access');
    }, 60000); // 60 second timeout
  });
});

// Test suite configuration
if (require.main === module) {
  console.log('Running AVI DM Path Protection Integration Tests...');
  console.log('Backend URL:', BACKEND_URL);
  console.log('Claude Code Endpoint:', CLAUDE_CODE_ENDPOINT);
}

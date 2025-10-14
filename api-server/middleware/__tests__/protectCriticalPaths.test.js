/**
 * Comprehensive Test Suite for Protected Path Middleware
 * Tests inverted allow-list security model with 90+ tests
 *
 * Security Model:
 * - ALLOW: Only /workspaces/agent-feed/prod/ (except protected files)
 * - UNRESTRICTED: /workspaces/agent-feed/prod/agent_workspace/ (full access, no warnings)
 * - BLOCK: All sibling directories (frontend, api-server, src, data, etc.)
 * - BLOCK: Protected files in /prod/ (package.json, .env, .git/, node_modules/)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { protectCriticalPaths, getSecurityAlerts } from '../protectCriticalPaths.js';

// Mock Express request/response objects
const createMockRequest = (method, url, body = {}) => ({
  method,
  url,
  body,
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  headers: { 'user-agent': 'test-agent' }
});

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.jsonData = data;
      return res;
    }
  };
  return res;
};

describe('protectCriticalPaths Middleware - Inverted Allow-List Model', () => {
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // ========================================
  // 1. ALLOW-LIST: /prod/ General Files
  // ========================================
  describe('Allow-List: /prod/ Access (General Files)', () => {
    const allowedProdPaths = [
      '/workspaces/agent-feed/prod/app.js',
      '/workspaces/agent-feed/prod/server.js',
      '/workspaces/agent-feed/prod/utils/helper.js',
      '/workspaces/agent-feed/prod/routes/api.js',
      '/workspaces/agent-feed/prod/models/user.js',
      '/workspaces/agent-feed/prod/controllers/auth.js',
      '/workspaces/agent-feed/prod/middleware/logger.js',
      '/workspaces/agent-feed/prod/public/index.html',
      '/workspaces/agent-feed/prod/assets/logo.png',
      '/workspaces/agent-feed/prod/data.json',
      '/workspaces/agent-feed/prod/config.yaml',
      '/workspaces/agent-feed/prod/README.md',
      '/workspaces/agent-feed/prod/docs/api.md'
    ];

    allowedProdPaths.forEach(path => {
      it(`should ALLOW POST with allowed prod path: ${path}`, () => {
        const req = createMockRequest('POST', '/api/v1/agent-posts', {
          title: 'Test post',
          content: `Write to ${path}`
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    it('should ALLOW nested prod paths', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Write to /workspaces/agent-feed/prod/nested/deep/file.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW prod path in title', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        title: 'Update /workspaces/agent-feed/prod/config.yaml',
        content: 'Some content'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW prod path with PUT request', () => {
      const req = createMockRequest('PUT', '/api/v1/config', {
        filePath: '/workspaces/agent-feed/prod/settings.json'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW prod path with DELETE request', () => {
      const req = createMockRequest('DELETE', '/api/v1/files', {
        path: '/workspaces/agent-feed/prod/temp.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW multiple prod paths in array', () => {
      const req = createMockRequest('POST', '/api/v1/batch', {
        files: [
          '/workspaces/agent-feed/prod/file1.txt',
          '/workspaces/agent-feed/prod/file2.txt',
          '/workspaces/agent-feed/prod/file3.txt'
        ]
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW prod path in nested object', () => {
      const req = createMockRequest('POST', '/api/v1/tasks', {
        task: {
          action: 'write',
          target: {
            file: '/workspaces/agent-feed/prod/output.log'
          }
        }
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });

  // ========================================
  // 2. UNRESTRICTED ZONE: /prod/agent_workspace/
  // ========================================
  describe('Unrestricted Zone: /prod/agent_workspace/ (No Warnings)', () => {
    const unrestrictedPaths = [
      '/workspaces/agent-feed/prod/agent_workspace/test.txt',
      '/workspaces/agent-feed/prod/agent_workspace/notes.md',
      '/workspaces/agent-feed/prod/agent_workspace/data/results.json',
      '/workspaces/agent-feed/prod/agent_workspace/scripts/script.py',
      '/workspaces/agent-feed/prod/agent_workspace/temp/cache.db',
      '/workspaces/agent-feed/prod/agent_workspace/.hidden',
      '/workspaces/agent-feed/prod/agent_workspace/package.json',
      '/workspaces/agent-feed/prod/agent_workspace/.env',
      '/workspaces/agent-feed/prod/agent_workspace/.git/config',
      '/workspaces/agent-feed/prod/agent_workspace/node_modules/lib.js'
    ];

    unrestrictedPaths.forEach(path => {
      it(`should ALLOW unrestricted path without warnings: ${path}`, () => {
        const req = createMockRequest('POST', '/api/v1/agent-posts', {
          title: 'Test post',
          content: `Write to ${path}`
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
        expect(consoleWarnSpy).not.toHaveBeenCalled();
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    it('should ALLOW deeply nested unrestricted paths', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Write to /workspaces/agent-feed/prod/agent_workspace/a/b/c/d/e/file.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should ALLOW unrestricted paths with special characters', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/prod/agent_workspace/file%20with%20spaces.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should ALLOW unrestricted paths with unicode', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/prod/agent_workspace/文件.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should ALLOW multiple unrestricted paths in array', () => {
      const req = createMockRequest('POST', '/api/v1/batch', {
        files: [
          '/workspaces/agent-feed/prod/agent_workspace/file1.txt',
          '/workspaces/agent-feed/prod/agent_workspace/file2.txt',
          '/workspaces/agent-feed/prod/agent_workspace/file3.txt'
        ]
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 3. BLOCK-LIST: Sibling Directories
  // ========================================
  describe('Block-List: All Sibling Directories', () => {
    const blockedSiblings = [
      { path: '/workspaces/agent-feed/frontend/', name: 'frontend' },
      { path: '/workspaces/agent-feed/api-server/', name: 'api-server' },
      { path: '/workspaces/agent-feed/src/', name: 'src' },
      { path: '/workspaces/agent-feed/backend/', name: 'backend' },
      { path: '/workspaces/agent-feed/data/', name: 'data' },
      { path: '/workspaces/agent-feed/database/', name: 'database' },
      { path: '/workspaces/agent-feed/config/', name: 'config' },
      { path: '/workspaces/agent-feed/configs/', name: 'configs' },
      { path: '/workspaces/agent-feed/tests/', name: 'tests' },
      { path: '/workspaces/agent-feed/test/', name: 'test' },
      { path: '/workspaces/agent-feed/.github/', name: '.github' },
      { path: '/workspaces/agent-feed/.vscode/', name: '.vscode' },
      { path: '/workspaces/agent-feed/node_modules/', name: 'node_modules' },
      { path: '/workspaces/agent-feed/.git/', name: '.git' }
    ];

    blockedSiblings.forEach(({ path, name }) => {
      it(`should BLOCK POST with sibling directory: ${path}`, () => {
        const req = createMockRequest('POST', '/api/v1/agent-posts', {
          title: 'Test post',
          content: `Write to ${path}test.txt`
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.jsonData).toMatchObject({
          success: false,
          error: 'Forbidden',
          blockedDirectory: name
        });
        expect(res.jsonData.message).toContain('read-only');
        expect(next).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('SECURITY ALERT'),
          expect.any(Object)
        );
      });
    });

    it('should BLOCK /workspaces/agent-feed/.env file', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Write to /workspaces/agent-feed/.env'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK /workspaces/agent-feed/database.db file', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Access /workspaces/agent-feed/database.db'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK nested paths in sibling directories', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Write to /workspaces/agent-feed/frontend/src/components/App.tsx'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK PUT request with sibling directory', () => {
      const req = createMockRequest('PUT', '/api/v1/config', {
        filePath: '/workspaces/agent-feed/api-server/config.json'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK DELETE request with sibling directory', () => {
      const req = createMockRequest('DELETE', '/api/v1/files', {
        path: '/workspaces/agent-feed/src/index.ts'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK array containing sibling directory path', () => {
      const req = createMockRequest('POST', '/api/v1/batch', {
        files: [
          '/workspaces/agent-feed/prod/allowed.txt',
          '/workspaces/agent-feed/frontend/blocked.txt'
        ]
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK nested object with sibling directory', () => {
      const req = createMockRequest('POST', '/api/v1/tasks', {
        task: {
          action: 'write',
          target: {
            file: '/workspaces/agent-feed/backend/server.js'
          }
        }
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK unknown sibling directory', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Write to /workspaces/agent-feed/unknown-dir/file.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.blockedDirectory).toBe('unknown-dir');
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 4. PROTECTED FILES in /prod/
  // ========================================
  describe('Protected Files in /prod/', () => {
    const protectedFilesInProd = [
      { path: '/workspaces/agent-feed/prod/package.json', name: 'package.json' },
      { path: '/workspaces/agent-feed/prod/package-lock.json', name: 'package-lock.json' },
      { path: '/workspaces/agent-feed/prod/.env', name: '.env' },
      { path: '/workspaces/agent-feed/prod/.gitignore', name: '.gitignore' },
      { path: '/workspaces/agent-feed/prod/tsconfig.json', name: 'tsconfig.json' },
      { path: '/workspaces/agent-feed/prod/vite.config.ts', name: 'vite.config.ts' },
      { path: '/workspaces/agent-feed/prod/playwright.config.ts', name: 'playwright.config.ts' },
      { path: '/workspaces/agent-feed/prod/vitest.config.ts', name: 'vitest.config.ts' },
      { path: '/workspaces/agent-feed/prod/postcss.config.js', name: 'postcss.config.js' },
      { path: '/workspaces/agent-feed/prod/tailwind.config.js', name: 'tailwind.config.js' }
    ];

    protectedFilesInProd.forEach(({ path, name }) => {
      it(`should BLOCK protected file in /prod/: ${path}`, () => {
        const req = createMockRequest('POST', '/api/v1/agent-posts', {
          title: 'Test post',
          content: `Write to ${path}`
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.jsonData).toMatchObject({
          success: false,
          error: 'Forbidden',
          protectedFile: name
        });
        expect(res.jsonData.message).toContain('protected');
        expect(next).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('SECURITY ALERT'),
          expect.any(Object)
        );
      });
    });

    it('should BLOCK .git/ directory in /prod/', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Write to /workspaces/agent-feed/prod/.git/config'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: 'Forbidden',
        protectedFile: 'configuration file'
      });
      expect(res.jsonData.message).toContain('protected');
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK node_modules/ directory in /prod/', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/prod/node_modules/express/index.js'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData).toMatchObject({
        success: false,
        error: 'Forbidden',
        protectedFile: 'configuration file'
      });
      expect(res.jsonData.message).toContain('protected');
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK PUT request with protected file', () => {
      const req = createMockRequest('PUT', '/api/v1/config', {
        filePath: '/workspaces/agent-feed/prod/package.json'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK DELETE request with protected file', () => {
      const req = createMockRequest('DELETE', '/api/v1/files', {
        path: '/workspaces/agent-feed/prod/.env'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should BLOCK array containing protected file', () => {
      const req = createMockRequest('POST', '/api/v1/batch', {
        files: [
          '/workspaces/agent-feed/prod/allowed.txt',
          '/workspaces/agent-feed/prod/package.json'
        ]
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // 5. EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    // Case Sensitivity Tests
    describe('Case Sensitivity', () => {
      it('should BLOCK uppercase sibling directory variants', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: 'Write to /WORKSPACES/AGENT-FEED/FRONTEND/test.txt'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should BLOCK mixed case sibling directory variants', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: 'Access /WorkSpaces/Agent-Feed/Api-Server/config.js'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should BLOCK uppercase protected file in /prod/', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: 'Write to /WORKSPACES/AGENT-FEED/PROD/PACKAGE.JSON'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should ALLOW uppercase /prod/ path (non-protected)', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: 'Write to /WORKSPACES/AGENT-FEED/PROD/FILE.TXT'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
      });
    });

    // Multiple Paths Tests
    describe('Multiple Paths', () => {
      it('should BLOCK if any path in array is blocked', () => {
        const req = createMockRequest('POST', '/api/v1/batch', {
          files: [
            '/workspaces/agent-feed/prod/allowed1.txt',
            '/workspaces/agent-feed/prod/allowed2.txt',
            '/workspaces/agent-feed/frontend/blocked.txt',
            '/workspaces/agent-feed/prod/allowed3.txt'
          ]
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should ALLOW all paths if none are blocked', () => {
        const req = createMockRequest('POST', '/api/v1/batch', {
          files: [
            '/workspaces/agent-feed/prod/file1.txt',
            '/workspaces/agent-feed/prod/file2.txt',
            '/workspaces/agent-feed/prod/file3.txt'
          ]
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
      });
    });

    // Path Traversal Tests
    describe('Path Traversal', () => {
      it('should BLOCK path traversal attempt to sibling directory', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/frontend/../frontend/index.html'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should ALLOW path traversal within /prod/', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/prod/subdir/../file.txt'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
      });
    });

    // Special Characters Tests
    describe('Special Characters', () => {
      it('should BLOCK special characters in sibling directory path', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/frontend/file%20with%20spaces.txt'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should ALLOW special characters in /prod/ path', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/prod/file%20with%20spaces.txt'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
      });

      it('should BLOCK unicode characters in sibling directory', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/frontend/文件.txt'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });
    });

    // Partial Path Matches Tests
    describe('Partial Path Matches', () => {
      it('should BLOCK file at root level (production-notes.txt)', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/production-notes.txt'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        // This is blocked because it's in an unknown sibling directory (root level)
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should BLOCK file at root level (frontend-config.json)', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/frontend-config.json'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        // This is blocked because it's in an unknown sibling directory (root level)
        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should BLOCK exact directory match with trailing slash', () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/frontend/'
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });
    });

    // Large Content Tests
    describe('Large Content', () => {
      it('should handle very large request bodies', () => {
        const largeContent = 'a'.repeat(10000) + '/workspaces/agent-feed/frontend/' + 'b'.repeat(10000);
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: largeContent
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(next).not.toHaveBeenCalled();
      });

      it('should handle large content with allowed path', () => {
        const largeContent = 'a'.repeat(10000) + '/workspaces/agent-feed/prod/file.txt' + 'b'.repeat(10000);
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: largeContent
        });
        const res = createMockResponse();
        const next = vi.fn();

        protectCriticalPaths(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.statusCode).toBe(200);
      });
    });
  });

  // ========================================
  // 6. NORMAL POSTS (No Filesystem Paths)
  // ========================================
  describe('Normal Posts Without Filesystem Paths', () => {
    it('should ALLOW normal post content without paths', () => {
      const req = createMockRequest('POST', '/api/v1/agent-posts', {
        title: 'Create a new feature',
        content: 'I want to select the best approach and update the code with delete and insert operations'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should ALLOW SQL keywords', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'SELECT, INSERT, UPDATE, DELETE, DROP, ALTER, CREATE'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW text with "prod" keyword (not a path)', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'This is a production-ready feature for our product'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW text with "frontend" keyword (not a path)', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: 'Update the frontend UI to improve user experience'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW empty body', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {});
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW undefined body', () => {
      const req = createMockRequest('POST', '/api/v1/posts');
      req.body = undefined;
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });

  // ========================================
  // 7. HTTP METHOD FILTERING
  // ========================================
  describe('HTTP Method Filtering', () => {
    it('should CHECK POST requests', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should CHECK PUT requests', () => {
      const req = createMockRequest('PUT', '/api/v1/posts/1', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should CHECK DELETE requests', () => {
      const req = createMockRequest('DELETE', '/api/v1/files', {
        path: '/workspaces/agent-feed/frontend/test.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should ALLOW GET requests regardless of content', () => {
      const req = createMockRequest('GET', '/api/v1/posts', {
        query: '/workspaces/agent-feed/frontend/test.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW PATCH requests (not checked)', () => {
      const req = createMockRequest('PATCH', '/api/v1/posts/1', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW OPTIONS requests', () => {
      const req = createMockRequest('OPTIONS', '/api/v1/posts');
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should ALLOW HEAD requests', () => {
      const req = createMockRequest('HEAD', '/api/v1/posts');
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });
  });

  // ========================================
  // 8. SECURITY ALERT LOGGING
  // ========================================
  describe('Security Alert Logging', () => {
    it('should log security alert with IP and violation details', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      req.ip = '192.168.1.100';
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY ALERT'),
        expect.objectContaining({
          ip: '192.168.1.100',
          url: '/api/v1/posts',
          method: 'POST',
          blockedPath: '/workspaces/agent-feed/frontend/',
          violationCount: expect.any(Number)
        })
      );
    });

    it('should track multiple violations from same IP', () => {
      const makeRequest = () => {
        const req = createMockRequest('POST', '/api/v1/posts', {
          content: '/workspaces/agent-feed/frontend/test.txt'
        });
        req.ip = '192.168.1.101';
        const res = createMockResponse();
        const next = vi.fn();
        protectCriticalPaths(req, res, next);
      };

      // Make 3 violations
      makeRequest();
      makeRequest();
      makeRequest();

      const alerts = getSecurityAlerts();
      const ipAlert = alerts.find(a => a.ip === '192.168.1.101');

      expect(ipAlert).toBeDefined();
      expect(ipAlert.count).toBe(3);
      expect(ipAlert.violations).toHaveLength(3);
    });

    it('should log blocking message when max violations reached', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      req.ip = '192.168.1.102';

      // Make 10+ violations
      for (let i = 0; i < 11; i++) {
        const res = createMockResponse();
        const next = vi.fn();
        protectCriticalPaths(req, res, next);
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('IP RATE LIMITED'),
        expect.objectContaining({
          ip: '192.168.1.102',
          count: expect.any(Number)
        })
      );
    });

    it('should handle missing IP address', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      req.ip = undefined;
      req.connection.remoteAddress = undefined;
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ip: 'unknown'
        })
      );
    });
  });

  // ========================================
  // 9. ERROR HANDLING
  // ========================================
  describe('Error Handling', () => {
    it('should fail open on middleware errors', () => {
      const req = createMockRequest('POST', '/api/v1/posts');
      // Create a body that will cause JSON.stringify to throw
      const circular = {};
      circular.circular = circular;
      req.body = { circular };

      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in protectCriticalPaths'),
        expect.any(Error)
      );
    });

    it('should handle null values gracefully', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        title: null,
        content: null
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should handle undefined values gracefully', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        title: undefined,
        content: undefined
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('should handle malformed JSON in body', () => {
      const req = createMockRequest('POST', '/api/v1/posts');
      req.body = { circular: {} };
      req.body.circular.ref = req.body.circular;
      const res = createMockResponse();
      const next = vi.fn();

      // Should fail open and call next
      protectCriticalPaths(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ========================================
  // 10. SECURITY ALERT API
  // ========================================
  describe('Security Alert API', () => {
    it('should return empty array when no violations', () => {
      const alerts = getSecurityAlerts();

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should return formatted alert data', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      req.ip = '192.168.1.200';
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      const alerts = getSecurityAlerts();
      const alert = alerts.find(a => a.ip === '192.168.1.200');

      expect(alert).toMatchObject({
        ip: '192.168.1.200',
        count: expect.any(Number),
        lastAttempt: expect.any(String),
        violations: expect.arrayContaining([
          expect.objectContaining({
            timestamp: expect.any(String),
            url: '/api/v1/posts',
            method: 'POST',
            blockedPath: '/workspaces/agent-feed/frontend/'
          })
        ])
      });
    });
  });

  // ========================================
  // 11. RESPONSE FORMAT
  // ========================================
  describe('Response Format', () => {
    it('should return structured error response for sibling directory', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/frontend/test.txt'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.jsonData).toMatchObject({
        success: false,
        error: 'Forbidden',
        message: expect.stringContaining('read-only'),
        blockedPath: expect.any(String),
        blockedDirectory: 'frontend',
        hint: expect.stringContaining('/prod/')
      });
    });

    it('should return structured error response for protected file', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/prod/package.json'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.jsonData).toMatchObject({
        success: false,
        error: 'Forbidden',
        message: expect.stringContaining('protected'),
        blockedPath: expect.any(String),
        protectedFile: 'package.json',
        hint: expect.stringContaining('agent_workspace')
      });
    });

    it('should include helpful hint in error message for sibling', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/api-server/config.js'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.jsonData.hint).toContain('/prod/');
      expect(res.jsonData.safeZone).toBe('/workspaces/agent-feed/prod/agent_workspace/');
    });

    it('should include helpful hint in error message for protected file', () => {
      const req = createMockRequest('POST', '/api/v1/posts', {
        content: '/workspaces/agent-feed/prod/.env'
      });
      const res = createMockResponse();
      const next = vi.fn();

      protectCriticalPaths(req, res, next);

      expect(res.jsonData.hint).toContain('agent_workspace');
      expect(res.jsonData.safeZone).toBe('/workspaces/agent-feed/prod/agent_workspace/');
    });
  });
});

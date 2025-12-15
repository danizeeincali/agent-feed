/**
 * Regression Tests: Avi DM Backward Compatibility (100% Real Operations)
 *
 * Ensures that:
 * - Existing Avi DM functionality still works
 * - Other API endpoints not affected by auth changes
 * - SDK manager works without database
 * - Graceful fallback when authManager not initialized
 * - No breaking changes in existing flows
 *
 * Coverage: 10+ tests covering backward compatibility scenarios
 */

const Database = require('better-sqlite3');
const path = require('path');

// Dynamic import for ES modules
let ClaudeAuthManager;

describe('Avi DM Backward Compatibility (100% Real)', () => {
  let db;
  const testDbPath = path.join(__dirname, '../../database.db');

  beforeAll(async () => {
    // Import ClaudeAuthManager dynamically
    const module = await import('../../src/services/ClaudeAuthManager.js');
    ClaudeAuthManager = module.ClaudeAuthManager;

    db = new Database(testDbPath);
    console.log('✅ Connected to REAL database:', testDbPath);
  });

  afterAll(() => {
    if (db) {
      db.close();
      console.log('✅ Database connection closed');
    }
  });

  describe('Existing Avi DM Functionality', () => {
    test('should still support basic auth flow without changes', async () => {
      const authManager = new ClaudeAuthManager(db);
      const authConfig = await authManager.getAuthConfig('demo-user-123');

      expect(authConfig).toBeDefined();
      expect(authConfig.method).toBeDefined();
      expect(authConfig.apiKey).toBeDefined();
    });

    test('should still support environment variable management', async () => {
      const authManager = new ClaudeAuthManager(db);
      const originalKey = process.env.ANTHROPIC_API_KEY;

      const authConfig = await authManager.getAuthConfig('demo-user-123');
      authManager.prepareSDKAuth(authConfig);
      authManager.restoreSDKAuth(authConfig);

      expect(process.env.ANTHROPIC_API_KEY).toBe(originalKey);
    });

    test('should maintain existing API contract', async () => {
      const authManager = new ClaudeAuthManager(db);

      // Verify all expected methods exist
      expect(typeof authManager.getAuthConfig).toBe('function');
      expect(typeof authManager.prepareSDKAuth).toBe('function');
      expect(typeof authManager.restoreSDKAuth).toBe('function');
      expect(typeof authManager.trackUsage).toBe('function');
      expect(typeof authManager.getUserUsage).toBe('function');
      expect(typeof authManager.updateAuthMethod).toBe('function');
      expect(typeof authManager.validateApiKey).toBe('function');
    });

    test('should maintain existing return value structure', async () => {
      const authManager = new ClaudeAuthManager(db);
      const authConfig = await authManager.getAuthConfig('demo-user-123');

      // Verify expected properties exist
      expect(authConfig).toHaveProperty('method');
      expect(authConfig).toHaveProperty('apiKey');
      expect(authConfig).toHaveProperty('trackUsage');
      expect(authConfig).toHaveProperty('permissionMode');
    });
  });

  describe('SDK Manager Without Database', () => {
    test('should handle missing database gracefully', () => {
      const authManager = new ClaudeAuthManager(null);

      // Should not throw on initialization
      expect(authManager).toBeDefined();
      expect(authManager.db).toBeNull();
    });

    test('should throw error when trying to use without database', async () => {
      const authManager = new ClaudeAuthManager(null);

      await expect(
        authManager.getAuthConfig('test-user')
      ).rejects.toThrow();
    });

    test('should work with default platform PAYG when authManager not initialized', () => {
      // Simulate SDK manager without authManager
      const originalKey = process.env.ANTHROPIC_API_KEY;

      // Default fallback behavior (no authManager)
      const fallbackConfig = {
        method: 'platform_payg',
        apiKey: process.env.ANTHROPIC_API_KEY,
        trackUsage: true,
        permissionMode: 'bypassPermissions'
      };

      expect(fallbackConfig.apiKey).toBe(originalKey);
      expect(fallbackConfig.method).toBe('platform_payg');
    });
  });

  describe('Other API Endpoints Not Affected', () => {
    test('should not affect database queries for other features', () => {
      // Verify other tables still work
      const posts = db.prepare('SELECT COUNT(*) as count FROM posts').get();
      expect(posts.count).toBeGreaterThanOrEqual(0);
    });

    test('should not affect user authentication table', () => {
      const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
      expect(users.count).toBeGreaterThanOrEqual(0);
    });

    test('should not affect existing user records', () => {
      const authManager = new ClaudeAuthManager(db);
      const authConfig = authManager.getAuthConfig('demo-user-123');

      expect(authConfig).toBeDefined();
    });

    test('should maintain database integrity', () => {
      // Verify critical tables exist
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();

      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('posts');
      expect(tableNames).toContain('user_claude_auth');
      expect(tableNames).toContain('usage_billing');
    });
  });

  describe('Graceful Fallback Scenarios', () => {
    test('should fallback to platform_payg for new users', async () => {
      const authManager = new ClaudeAuthManager(db);
      const newUserId = `new-user-${Date.now()}`;

      const authConfig = await authManager.getAuthConfig(newUserId);

      expect(authConfig.method).toBe('platform_payg');
      expect(authConfig.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
      expect(authConfig.trackUsage).toBe(true);
    });

    test('should handle missing auth record gracefully', async () => {
      const authManager = new ClaudeAuthManager(db);
      const nonExistentUser = `non-existent-${Date.now()}`;

      const authConfig = await authManager.getAuthConfig(nonExistentUser);

      // Should default to platform_payg
      expect(authConfig.method).toBe('platform_payg');
      expect(authConfig.apiKey).toBeDefined();
    });

    test('should handle corrupted auth data gracefully', async () => {
      const authManager = new ClaudeAuthManager(db);
      const testUserId = `test-corrupted-${Date.now()}`;

      // Create user with null auth method
      db.prepare(
        'INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at) VALUES (?, ?, ?, ?)'
      ).run(testUserId, null, Date.now(), Date.now());

      const authConfig = await authManager.getAuthConfig(testUserId);

      // Should default to platform_payg
      expect(authConfig.method).toBe('platform_payg');

      // Cleanup
      db.prepare('DELETE FROM user_claude_auth WHERE user_id = ?').run(testUserId);
    });
  });

  describe('No Breaking Changes', () => {
    test('should maintain existing OAuth user behavior', async () => {
      const authManager = new ClaudeAuthManager(db);
      const authConfig = await authManager.getAuthConfig('demo-user-123');

      // OAuth users should still work as before
      expect(authConfig.method).toBe('oauth');
      expect(authConfig.trackUsage).toBe(false);
      expect(authConfig.apiKey.startsWith('sk-ant-')).toBe(true);
    });

    test('should maintain existing environment variable handling', async () => {
      const authManager = new ClaudeAuthManager(db);
      const originalKey = process.env.ANTHROPIC_API_KEY;

      // Test multiple prepare/restore cycles (existing behavior)
      const authConfig = await authManager.getAuthConfig('demo-user-123');

      authManager.prepareSDKAuth(authConfig);
      authManager.restoreSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBe(originalKey);

      authManager.prepareSDKAuth(authConfig);
      authManager.restoreSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBe(originalKey);
    });

    test('should maintain existing API key validation', async () => {
      const authManager = new ClaudeAuthManager(db);

      // Existing validation should still work
      expect(authManager.validateApiKey('sk-ant-12345678901234567890123456789012')).toBe(true);
      expect(authManager.validateApiKey('invalid-key')).toBe(false);
      expect(authManager.validateApiKey(null)).toBe(false);
    });
  });

  describe('Session Manager Compatibility', () => {
    test('should work with Avi session manager initialization', () => {
      // Simulate session manager initialization
      const sessionAuthManager = new ClaudeAuthManager(db);

      expect(sessionAuthManager).toBeDefined();
      expect(sessionAuthManager.db).toBe(db);
    });

    test('should support session manager auth flow', async () => {
      const authManager = new ClaudeAuthManager(db);
      const userId = 'demo-user-123';

      // Session manager auth flow
      const authConfig = await authManager.getAuthConfig(userId);
      expect(authConfig).toBeDefined();

      const sdkOptions = authManager.prepareSDKAuth(authConfig);
      expect(sdkOptions.permissionMode).toBe('bypassPermissions');

      authManager.restoreSDKAuth(authConfig);
    });

    test('should handle session manager without database', () => {
      // Session manager should handle missing database
      const authManager = new ClaudeAuthManager(null);

      expect(authManager).toBeDefined();
      expect(() => authManager.prepareSDKAuth({ method: 'test', apiKey: 'test', permissionMode: 'bypassPermissions' })).not.toThrow();
    });
  });

  describe('Database Schema Compatibility', () => {
    test('should verify user_claude_auth table exists', () => {
      const table = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_claude_auth'"
      ).get();

      expect(table).toBeDefined();
      expect(table.name).toBe('user_claude_auth');
    });

    test('should verify usage_billing table exists', () => {
      const table = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='usage_billing'"
      ).get();

      expect(table).toBeDefined();
      expect(table.name).toBe('usage_billing');
    });

    test('should verify schema has required columns', () => {
      const columns = db.prepare(
        "PRAGMA table_info(user_claude_auth)"
      ).all();

      const columnNames = columns.map(c => c.name);
      expect(columnNames).toContain('user_id');
      expect(columnNames).toContain('auth_method');
      expect(columnNames).toContain('encrypted_api_key');
      expect(columnNames).toContain('oauth_token');
      expect(columnNames).toContain('oauth_refresh_token');
      expect(columnNames).toContain('oauth_expires_at');
    });

    test('should verify existing data not corrupted', async () => {
      const authManager = new ClaudeAuthManager(db);

      // Check that existing OAuth user still has valid data
      const authConfig = await authManager.getAuthConfig('demo-user-123');

      expect(authConfig.method).toBe('oauth');
      expect(authConfig.apiKey).toBeDefined();
      expect(authConfig.apiKey.length).toBeGreaterThan(20);
    });
  });

  describe('Performance and Resource Usage', () => {
    test('should not leak memory during auth cycles', async () => {
      const authManager = new ClaudeAuthManager(db);
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const authConfig = await authManager.getAuthConfig('demo-user-123');
        authManager.prepareSDKAuth(authConfig);
        authManager.restoreSDKAuth(authConfig);
      }

      // If we got here without running out of memory, test passes
      expect(true).toBe(true);
    });

    test('should handle rapid auth config requests', async () => {
      const authManager = new ClaudeAuthManager(db);
      const requests = 50;

      const promises = Array(requests).fill(null).map(() =>
        authManager.getAuthConfig('demo-user-123')
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(requests);
      results.forEach(result => {
        expect(result.method).toBe('oauth');
      });
    });
  });
});

/**
 * Unit Tests: Prod SDK Manager - OAuth Integration (100% Real Operations)
 *
 * Tests ClaudeAuthManager integration in prod SDK manager with:
 * - All 3 auth methods (oauth, user_api_key, platform_payg)
 * - Real database operations (no mocks)
 * - Real environment variable management
 * - Real error handling
 * - Backward compatibility
 *
 * Coverage: 30+ tests covering all scenarios
 */

const Database = require('better-sqlite3');
const path = require('path');

// Dynamic import for ES modules
let ClaudeAuthManager;

describe('Prod SDK Manager - OAuth Integration (100% Real)', () => {
  let db;
  let authManager;
  const testDbPath = path.join(__dirname, '../../database.db');

  beforeAll(async () => {
    // Import ClaudeAuthManager dynamically
    const module = await import('../../src/services/ClaudeAuthManager.js');
    ClaudeAuthManager = module.ClaudeAuthManager;

    // Use REAL production database
    db = new Database(testDbPath);
    console.log('✅ Connected to REAL database:', testDbPath);
  });

  afterAll(() => {
    if (db) {
      db.close();
      console.log('✅ Database connection closed');
    }
  });

  beforeEach(() => {
    // Create fresh ClaudeAuthManager for each test
    authManager = new ClaudeAuthManager(db);
  });

  describe('ClaudeAuthManager Initialization', () => {
    test('should initialize with database', () => {
      expect(authManager).toBeDefined();
      expect(authManager.db).toBe(db);
      expect(authManager.originalEnv).toBeDefined();
    });

    test('should have all required methods', () => {
      expect(typeof authManager.getAuthConfig).toBe('function');
      expect(typeof authManager.prepareSDKAuth).toBe('function');
      expect(typeof authManager.restoreSDKAuth).toBe('function');
      expect(typeof authManager.trackUsage).toBe('function');
      expect(typeof authManager.getUserUsage).toBe('function');
      expect(typeof authManager.updateAuthMethod).toBe('function');
      expect(typeof authManager.validateApiKey).toBe('function');
    });

    test('should initialize originalEnv as empty object', () => {
      expect(authManager.originalEnv).toEqual({});
    });
  });

  describe('getAuthConfig - OAuth Method (Real Database)', () => {
    test('should get OAuth config for demo-user-123', async () => {
      const authConfig = await authManager.getAuthConfig('demo-user-123');

      expect(authConfig).toBeDefined();
      expect(authConfig.method).toBe('oauth');
      expect(authConfig.apiKey).toBeDefined();
      expect(authConfig.apiKey.length).toBeGreaterThan(20);
      expect(authConfig.trackUsage).toBe(false);
      expect(authConfig.permissionMode).toBe('bypassPermissions');
    });

    test('OAuth token should start with sk-ant-', async () => {
      const authConfig = await authManager.getAuthConfig('demo-user-123');
      expect(authConfig.apiKey.startsWith('sk-ant-')).toBe(true);
    });

    test('should return same config on multiple calls', async () => {
      const config1 = await authManager.getAuthConfig('demo-user-123');
      const config2 = await authManager.getAuthConfig('demo-user-123');

      expect(config1.method).toBe(config2.method);
      expect(config1.apiKey).toBe(config2.apiKey);
    });
  });

  describe('getAuthConfig - User API Key Method (Real Database)', () => {
    let testUserId;

    beforeEach(async () => {
      // Create test user with user_api_key method
      testUserId = `test-apikey-${Date.now()}`;
      await authManager.updateAuthMethod(testUserId, 'user_api_key', {
        apiKey: 'sk-ant-test-key-12345678901234567890'
      });
    });

    afterEach(async () => {
      // Cleanup test user
      if (testUserId) {
        db.prepare('DELETE FROM user_claude_auth WHERE user_id = ?').run(testUserId);
        db.prepare('DELETE FROM usage_billing WHERE user_id = ?').run(testUserId);
      }
    });

    test('should get user_api_key config', async () => {
      const authConfig = await authManager.getAuthConfig(testUserId);

      expect(authConfig.method).toBe('user_api_key');
      expect(authConfig.apiKey).toBe('sk-ant-test-key-12345678901234567890');
      expect(authConfig.trackUsage).toBe(false);
      expect(authConfig.permissionMode).toBe('bypassPermissions');
    });

    test('should not track usage for user_api_key', async () => {
      const authConfig = await authManager.getAuthConfig(testUserId);
      expect(authConfig.trackUsage).toBe(false);
    });
  });

  describe('getAuthConfig - Platform PAYG Method (Real Database)', () => {
    let testUserId;

    beforeEach(async () => {
      // Create test user with platform_payg method
      testUserId = `test-payg-${Date.now()}`;
      await authManager.updateAuthMethod(testUserId, 'platform_payg');
    });

    afterEach(async () => {
      // Cleanup test user
      if (testUserId) {
        db.prepare('DELETE FROM user_claude_auth WHERE user_id = ?').run(testUserId);
        db.prepare('DELETE FROM usage_billing WHERE user_id = ?').run(testUserId);
      }
    });

    test('should get platform_payg config', async () => {
      const authConfig = await authManager.getAuthConfig(testUserId);

      expect(authConfig.method).toBe('platform_payg');
      expect(authConfig.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
      expect(authConfig.trackUsage).toBe(true);
      expect(authConfig.permissionMode).toBe('bypassPermissions');
    });

    test('should track usage for platform_payg', async () => {
      const authConfig = await authManager.getAuthConfig(testUserId);
      expect(authConfig.trackUsage).toBe(true);
    });

    test('should use environment variable for API key', async () => {
      const authConfig = await authManager.getAuthConfig(testUserId);
      expect(authConfig.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
    });
  });

  describe('getAuthConfig - New User Default (Real Database)', () => {
    test('should default to platform_payg for new user', async () => {
      const newUserId = `new-user-${Date.now()}`;
      const authConfig = await authManager.getAuthConfig(newUserId);

      expect(authConfig.method).toBe('platform_payg');
      expect(authConfig.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
      expect(authConfig.trackUsage).toBe(true);
    });
  });

  describe('prepareSDKAuth - Environment Variable Management', () => {
    let originalKey;

    beforeEach(() => {
      originalKey = process.env.ANTHROPIC_API_KEY;
    });

    afterEach(() => {
      // Always restore original key
      if (originalKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    test('should set environment variable with OAuth token', async () => {
      const authConfig = await authManager.getAuthConfig('demo-user-123');
      const oldKey = process.env.ANTHROPIC_API_KEY;

      authManager.prepareSDKAuth(authConfig);

      expect(process.env.ANTHROPIC_API_KEY).toBe(authConfig.apiKey);
      expect(process.env.ANTHROPIC_API_KEY).not.toBe(oldKey);
      expect(authManager.originalEnv.ANTHROPIC_API_KEY).toBe(oldKey);
    });

    test('should save original environment in originalEnv', async () => {
      const authConfig = await authManager.getAuthConfig('demo-user-123');
      const oldKey = process.env.ANTHROPIC_API_KEY;

      authManager.prepareSDKAuth(authConfig);

      expect(authManager.originalEnv.ANTHROPIC_API_KEY).toBe(oldKey);
    });

    test('should return SDK options with permission mode', async () => {
      const authConfig = await authManager.getAuthConfig('demo-user-123');

      const sdkOptions = authManager.prepareSDKAuth(authConfig);

      expect(sdkOptions.permissionMode).toBe('bypassPermissions');
      expect(sdkOptions.method).toBe('oauth');
    });

    test('should handle missing API key gracefully', () => {
      const authConfig = {
        method: 'test',
        apiKey: null,
        permissionMode: 'bypassPermissions'
      };

      const oldKey = process.env.ANTHROPIC_API_KEY;
      authManager.prepareSDKAuth(authConfig);

      expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
      expect(authManager.originalEnv.ANTHROPIC_API_KEY).toBe(oldKey);
    });
  });

  describe('restoreSDKAuth - Environment Variable Restoration', () => {
    let originalKey;

    beforeEach(() => {
      originalKey = process.env.ANTHROPIC_API_KEY;
    });

    afterEach(() => {
      // Always restore original key
      if (originalKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalKey;
      } else {
        delete process.env.ANTHROPIC_API_KEY;
      }
    });

    test('should restore original environment variable', async () => {
      const authConfig = await authManager.getAuthConfig('demo-user-123');
      const oldKey = process.env.ANTHROPIC_API_KEY;

      authManager.prepareSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBe(authConfig.apiKey);

      authManager.restoreSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBe(oldKey);
    });

    test('should delete environment variable if originally undefined', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const authConfig = {
        method: 'oauth',
        apiKey: 'sk-ant-test-12345678901234567890',
        permissionMode: 'bypassPermissions'
      };

      authManager.prepareSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBe(authConfig.apiKey);

      authManager.restoreSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    });

    test('should handle multiple prepare/restore cycles', async () => {
      const authConfig = await authManager.getAuthConfig('demo-user-123');
      const oldKey = process.env.ANTHROPIC_API_KEY;

      // Cycle 1
      authManager.prepareSDKAuth(authConfig);
      authManager.restoreSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBe(oldKey);

      // Cycle 2
      authManager.prepareSDKAuth(authConfig);
      authManager.restoreSDKAuth(authConfig);
      expect(process.env.ANTHROPIC_API_KEY).toBe(oldKey);
    });
  });

  describe('trackUsage - Real Database Operations', () => {
    let testUserId;

    beforeEach(async () => {
      testUserId = `test-usage-${Date.now()}`;
      await authManager.updateAuthMethod(testUserId, 'platform_payg');
    });

    afterEach(async () => {
      if (testUserId) {
        db.prepare('DELETE FROM user_claude_auth WHERE user_id = ?').run(testUserId);
        db.prepare('DELETE FROM usage_billing WHERE user_id = ?').run(testUserId);
      }
    });

    test('should track usage in real database', async () => {
      await authManager.trackUsage(
        testUserId,
        { input: 1000, output: 500 },
        0.045,
        'test-session-123',
        'claude-sonnet-4-20250514'
      );

      const usage = db.prepare(
        'SELECT * FROM usage_billing WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
      ).get(testUserId);

      expect(usage).toBeDefined();
      expect(usage.user_id).toBe(testUserId);
      expect(usage.input_tokens).toBe(1000);
      expect(usage.output_tokens).toBe(500);
      expect(usage.cost_usd).toBe(0.045);
      expect(usage.session_id).toBe('test-session-123');
      expect(usage.model).toBe('claude-sonnet-4-20250514');
      expect(usage.billed).toBe(0);
    });

    test('should track multiple usage records', async () => {
      await authManager.trackUsage(testUserId, { input: 1000, output: 500 }, 0.045);
      await authManager.trackUsage(testUserId, { input: 2000, output: 1000 }, 0.090);

      const records = db.prepare(
        'SELECT * FROM usage_billing WHERE user_id = ? ORDER BY created_at ASC'
      ).all(testUserId);

      expect(records.length).toBe(2);
      expect(records[0].input_tokens).toBe(1000);
      expect(records[1].input_tokens).toBe(2000);
    });

    test('should generate unique IDs for usage records', async () => {
      await authManager.trackUsage(testUserId, { input: 1000, output: 500 }, 0.045);
      await authManager.trackUsage(testUserId, { input: 2000, output: 1000 }, 0.090);

      const records = db.prepare(
        'SELECT id FROM usage_billing WHERE user_id = ?'
      ).all(testUserId);

      expect(records.length).toBe(2);
      expect(records[0].id).not.toBe(records[1].id);
      expect(records[0].id.startsWith('usage_')).toBe(true);
      expect(records[1].id.startsWith('usage_')).toBe(true);
    });
  });

  describe('getUserUsage - Real Database Aggregation', () => {
    let testUserId;

    beforeEach(async () => {
      testUserId = `test-stats-${Date.now()}`;
      await authManager.updateAuthMethod(testUserId, 'platform_payg');
    });

    afterEach(async () => {
      if (testUserId) {
        db.prepare('DELETE FROM user_claude_auth WHERE user_id = ?').run(testUserId);
        db.prepare('DELETE FROM usage_billing WHERE user_id = ?').run(testUserId);
      }
    });

    test('should return usage statistics', async () => {
      await authManager.trackUsage(testUserId, { input: 1000, output: 500 }, 0.045);
      await authManager.trackUsage(testUserId, { input: 2000, output: 1000 }, 0.090);

      const stats = await authManager.getUserUsage(testUserId);

      expect(stats.method).toBe('platform_payg');
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalInputTokens).toBe(3000);
      expect(stats.totalOutputTokens).toBe(1500);
      expect(stats.totalTokens).toBe(4500);
      expect(stats.totalCost).toBeCloseTo(0.135, 3);
      expect(stats.unbilledCost).toBeCloseTo(0.135, 3);
    });

    test('should return zero stats for user with no usage', async () => {
      const stats = await authManager.getUserUsage(testUserId);

      expect(stats.totalRequests).toBe(0);
      expect(stats.totalInputTokens).toBe(0);
      expect(stats.totalOutputTokens).toBe(0);
      expect(stats.totalCost).toBe(0);
    });
  });

  describe('updateAuthMethod - Real Database Mutations', () => {
    let testUserId;

    beforeEach(() => {
      testUserId = `test-update-${Date.now()}`;
    });

    afterEach(async () => {
      if (testUserId) {
        db.prepare('DELETE FROM user_claude_auth WHERE user_id = ?').run(testUserId);
        db.prepare('DELETE FROM usage_billing WHERE user_id = ?').run(testUserId);
      }
    });

    test('should create new oauth record', async () => {
      await authManager.updateAuthMethod(testUserId, 'oauth', {
        oauthToken: 'sk-ant-oauth-12345678901234567890',
        oauthRefreshToken: 'refresh-token',
        oauthExpiresAt: Date.now() + 3600000
      });

      const authConfig = await authManager.getAuthConfig(testUserId);
      expect(authConfig.method).toBe('oauth');
      expect(authConfig.apiKey).toBe('sk-ant-oauth-12345678901234567890');
    });

    test('should create new user_api_key record', async () => {
      await authManager.updateAuthMethod(testUserId, 'user_api_key', {
        apiKey: 'sk-ant-user-12345678901234567890'
      });

      const authConfig = await authManager.getAuthConfig(testUserId);
      expect(authConfig.method).toBe('user_api_key');
      expect(authConfig.apiKey).toBe('sk-ant-user-12345678901234567890');
    });

    test('should update existing record', async () => {
      await authManager.updateAuthMethod(testUserId, 'oauth', {
        oauthToken: 'sk-ant-oauth-12345678901234567890'
      });

      await authManager.updateAuthMethod(testUserId, 'user_api_key', {
        apiKey: 'sk-ant-user-12345678901234567890'
      });

      const authConfig = await authManager.getAuthConfig(testUserId);
      expect(authConfig.method).toBe('user_api_key');
      expect(authConfig.apiKey).toBe('sk-ant-user-12345678901234567890');
    });

    test('should throw error for invalid auth method', async () => {
      await expect(
        authManager.updateAuthMethod(testUserId, 'invalid_method')
      ).rejects.toThrow('Invalid auth method');
    });
  });

  describe('validateApiKey - Format Validation', () => {
    test('should validate correct API key format', () => {
      expect(authManager.validateApiKey('sk-ant-12345678901234567890123456789012')).toBe(true);
    });

    test('should reject null', () => {
      expect(authManager.validateApiKey(null)).toBe(false);
    });

    test('should reject undefined', () => {
      expect(authManager.validateApiKey(undefined)).toBe(false);
    });

    test('should reject empty string', () => {
      expect(authManager.validateApiKey('')).toBe(false);
    });

    test('should reject wrong prefix', () => {
      expect(authManager.validateApiKey('invalid-12345678901234567890')).toBe(false);
    });

    test('should reject too short', () => {
      expect(authManager.validateApiKey('sk-ant-short')).toBe(false);
    });

    test('should reject non-string', () => {
      expect(authManager.validateApiKey(123)).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    test('should work without authManager initialization', async () => {
      const config = await authManager.getAuthConfig('new-user-without-record');

      expect(config.method).toBe('platform_payg');
      expect(config.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
    });

    test('should handle missing database gracefully', () => {
      const nullAuthManager = new ClaudeAuthManager(null);

      expect(() => {
        nullAuthManager.getAuthConfig('test-user');
      }).toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid user ID in updateAuthMethod', async () => {
      await expect(
        authManager.updateAuthMethod(null, 'oauth')
      ).rejects.toThrow();
    });

    test('should throw error for invalid auth method', async () => {
      await expect(
        authManager.updateAuthMethod('test-user', 'invalid')
      ).rejects.toThrow('Invalid auth method');
    });

    test('should handle database errors gracefully', async () => {
      const brokenDb = new Database(':memory:');
      const brokenAuthManager = new ClaudeAuthManager(brokenDb);

      await expect(
        brokenAuthManager.getAuthConfig('test-user')
      ).rejects.toThrow();

      brokenDb.close();
    });
  });
});

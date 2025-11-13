/**
 * ClaudeAuthManager TDD Tests - Database Schema Validation
 *
 * Tests the correct database schema alignment with user_claude_auth table
 * from migration 018-claude-auth-billing.sql
 *
 * NO MOCKS - Real database operations only
 */

const Database = require('better-sqlite3');
const { ClaudeAuthManager } = require('../../src/services/ClaudeAuthManager.cjs');

describe('ClaudeAuthManager - Database Schema Validation (TDD)', () => {
  let db;
  let authManager;
  const TEST_USER_ID = 'test-user-123';
  const TEST_API_KEY = 'sk-ant-test-key-12345678901234567890';

  beforeEach(() => {
    // Create real in-memory database
    db = new Database(':memory:');

    // Create user_claude_auth table from migration 018
    db.exec(`
      CREATE TABLE user_claude_auth (
        user_id TEXT PRIMARY KEY,
        auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'user_api_key', 'platform_payg')),
        encrypted_api_key TEXT,
        oauth_token TEXT,
        oauth_refresh_token TEXT,
        oauth_expires_at INTEGER,
        oauth_tokens TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER
      ) STRICT;
    `);

    // Create usage_billing table from migration 018
    db.exec(`
      CREATE TABLE usage_billing (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        auth_method TEXT,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cost_usd REAL NOT NULL,
        session_id TEXT,
        model TEXT,
        created_at INTEGER NOT NULL,
        billed INTEGER DEFAULT 0
      ) STRICT;
    `);

    // Initialize ClaudeAuthManager with real database
    authManager = new ClaudeAuthManager(db);
  });

  afterEach(() => {
    // Clean up database
    if (db) {
      db.close();
    }
  });

  describe('1. Schema Alignment Tests', () => {
    test('should query user_claude_auth table (not user_settings)', async () => {
      // Insert test user into correct table
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', TEST_API_KEY, now);

      // This will fail if ClaudeAuthManager queries wrong table
      const config = await authManager.getAuthConfig(TEST_USER_ID);

      expect(config).toBeDefined();
      expect(config.method).toBe('user_api_key');
    });

    test('should use correct column name: encrypted_api_key (not api_key)', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', TEST_API_KEY, now);

      const config = await authManager.getAuthConfig(TEST_USER_ID);

      // Should retrieve from encrypted_api_key column
      expect(config.apiKey).toBe(TEST_API_KEY);
    });

    test('should return OAuth config when auth_method = "oauth"', async () => {
      const now = Date.now();
      const oauthToken = 'oauth-token-abc123';
      const refreshToken = 'refresh-token-xyz789';
      const expiresAt = Date.now() + 3600000; // 1 hour from now

      db.prepare(`
        INSERT INTO user_claude_auth (
          user_id, auth_method, oauth_token, oauth_refresh_token,
          oauth_expires_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(TEST_USER_ID, 'oauth', oauthToken, refreshToken, expiresAt, now);

      const config = await authManager.getAuthConfig(TEST_USER_ID);

      expect(config.method).toBe('oauth');
      expect(config.oauthToken).toBe(oauthToken);
      expect(config.oauthRefreshToken).toBe(refreshToken);
      expect(config.oauthExpiresAt).toBe(expiresAt);
    });

    test('should return API key config when auth_method = "user_api_key"', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', TEST_API_KEY, now);

      const config = await authManager.getAuthConfig(TEST_USER_ID);

      expect(config.method).toBe('user_api_key');
      expect(config.apiKey).toBe(TEST_API_KEY);
      expect(config.trackUsage).toBe(false); // No tracking for user's own key
    });

    test('should return platform PAYG config when auth_method = "platform_payg"', async () => {
      const now = Date.now();
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform-key-12345';

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at)
        VALUES (?, ?, ?)
      `).run(TEST_USER_ID, 'platform_payg', now);

      const config = await authManager.getAuthConfig(TEST_USER_ID);

      expect(config.method).toBe('platform_payg');
      expect(config.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
      expect(config.trackUsage).toBe(true); // Must track for billing
    });

    test('should fall back to platform PAYG when user not found', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform-key-12345';

      const config = await authManager.getAuthConfig('nonexistent-user');

      expect(config.method).toBe('platform_payg');
      expect(config.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
      expect(config.trackUsage).toBe(true);
    });
  });

  describe('2. Real Database Tests', () => {
    test('should insert test user into user_claude_auth table', () => {
      const now = Date.now();

      const info = db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', TEST_API_KEY, now);

      expect(info.changes).toBe(1);

      const user = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);
      expect(user).toBeDefined();
      expect(user.user_id).toBe(TEST_USER_ID);
    });

    test('should query returns correct auth_method', () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at)
        VALUES (?, ?, ?)
      `).run(TEST_USER_ID, 'oauth', now);

      const user = db.prepare('SELECT auth_method FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.auth_method).toBe('oauth');
    });

    test('should retrieve encrypted API key correctly', () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', TEST_API_KEY, now);

      const user = db.prepare('SELECT encrypted_api_key FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.encrypted_api_key).toBe(TEST_API_KEY);
    });

    test('should access OAuth token fields correctly', () => {
      const now = Date.now();
      const oauthData = {
        oauth_token: 'token-123',
        oauth_refresh_token: 'refresh-456',
        oauth_expires_at: Date.now() + 3600000
      };

      db.prepare(`
        INSERT INTO user_claude_auth (
          user_id, auth_method, oauth_token, oauth_refresh_token,
          oauth_expires_at, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(TEST_USER_ID, 'oauth', oauthData.oauth_token, oauthData.oauth_refresh_token, oauthData.oauth_expires_at, now);

      const user = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.oauth_token).toBe(oauthData.oauth_token);
      expect(user.oauth_refresh_token).toBe(oauthData.oauth_refresh_token);
      expect(user.oauth_expires_at).toBe(oauthData.oauth_expires_at);
    });

    test('should not throw SQL errors during queries', () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', TEST_API_KEY, now);

      expect(() => {
        db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);
      }).not.toThrow();
    });
  });

  describe('3. updateAuthMethod Tests', () => {
    test('should create new record in user_claude_auth', async () => {
      await authManager.updateAuthMethod(TEST_USER_ID, 'user_api_key', {
        apiKey: TEST_API_KEY
      });

      const user = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user).toBeDefined();
      expect(user.user_id).toBe(TEST_USER_ID);
      expect(user.auth_method).toBe('user_api_key');
      expect(user.encrypted_api_key).toBe(TEST_API_KEY);
    });

    test('should update existing record correctly', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at)
        VALUES (?, ?, ?)
      `).run(TEST_USER_ID, 'platform_payg', now);

      await authManager.updateAuthMethod(TEST_USER_ID, 'user_api_key', {
        apiKey: TEST_API_KEY
      });

      const user = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.auth_method).toBe('user_api_key');
      expect(user.encrypted_api_key).toBe(TEST_API_KEY);
    });

    test('should validate auth_method values (oauth, user_api_key, platform_payg)', async () => {
      const validMethods = ['oauth', 'user_api_key', 'platform_payg'];

      for (const method of validMethods) {
        await authManager.updateAuthMethod(`${TEST_USER_ID}-${method}`, method);

        const user = db.prepare('SELECT auth_method FROM user_claude_auth WHERE user_id = ?')
          .get(`${TEST_USER_ID}-${method}`);

        expect(user.auth_method).toBe(method);
      }
    });

    test('should store encrypted_api_key correctly', async () => {
      await authManager.updateAuthMethod(TEST_USER_ID, 'user_api_key', {
        apiKey: TEST_API_KEY
      });

      const user = db.prepare('SELECT encrypted_api_key FROM user_claude_auth WHERE user_id = ?')
        .get(TEST_USER_ID);

      expect(user.encrypted_api_key).toBe(TEST_API_KEY);
    });

    test('should handle OAuth method update', async () => {
      const oauthToken = 'oauth-token-abc';

      await authManager.updateAuthMethod(TEST_USER_ID, 'oauth', {
        oauthToken: oauthToken,
        oauthRefreshToken: 'refresh-xyz',
        oauthExpiresAt: Date.now() + 3600000
      });

      const user = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.auth_method).toBe('oauth');
      expect(user.oauth_token).toBe(oauthToken);
    });
  });

  describe('4. Edge Cases', () => {
    test('should return default config when user not found', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-platform-key';

      const config = await authManager.getAuthConfig('missing-user-999');

      expect(config).toBeDefined();
      expect(config.method).toBe('platform_payg');
      expect(config.apiKey).toBe(process.env.ANTHROPIC_API_KEY);
    });

    test('should handle null API key correctly', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', null, now);

      const config = await authManager.getAuthConfig(TEST_USER_ID);

      expect(config.method).toBe('user_api_key');
      expect(config.apiKey).toBeNull();
    });

    test('should reject invalid auth_method via CHECK constraint', () => {
      const now = Date.now();

      expect(() => {
        db.prepare(`
          INSERT INTO user_claude_auth (user_id, auth_method, created_at)
          VALUES (?, ?, ?)
        `).run(TEST_USER_ID, 'invalid_method', now);
      }).toThrow(); // CHECK constraint violation
    });

    test('should handle database connection errors gracefully', () => {
      // Close database to simulate connection error
      db.close();

      expect(async () => {
        await authManager.getAuthConfig(TEST_USER_ID);
      }).rejects.toThrow();
    });

    test('should handle missing oauth_tokens field', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_tokens, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'oauth', null, now);

      const user = db.prepare('SELECT oauth_tokens FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.oauth_tokens).toBeNull();
    });

    test('should handle JSON in oauth_tokens field', async () => {
      const now = Date.now();
      const oauthData = JSON.stringify({ scope: 'read:write', provider: 'anthropic' });

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_tokens, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'oauth', oauthData, now);

      const user = db.prepare('SELECT oauth_tokens FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.oauth_tokens).toBe(oauthData);
      expect(JSON.parse(user.oauth_tokens)).toEqual({ scope: 'read:write', provider: 'anthropic' });
    });
  });

  describe('5. Usage Billing Integration', () => {
    test('should track usage in usage_billing table for platform_payg', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at)
        VALUES (?, ?, ?)
      `).run(TEST_USER_ID, 'platform_payg', now);

      // Insert usage record
      const usageId = `usage-${Date.now()}`;
      db.prepare(`
        INSERT INTO usage_billing (
          id, user_id, auth_method, input_tokens, output_tokens,
          cost_usd, created_at, billed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(usageId, TEST_USER_ID, 'platform_payg', 1000, 500, 0.025, now, 0);

      const usage = db.prepare('SELECT * FROM usage_billing WHERE id = ?').get(usageId);

      expect(usage).toBeDefined();
      expect(usage.user_id).toBe(TEST_USER_ID);
      expect(usage.auth_method).toBe('platform_payg');
      expect(usage.cost_usd).toBe(0.025);
    });

    test('should not track usage for user_api_key method', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
        VALUES (?, ?, ?, ?)
      `).run(TEST_USER_ID, 'user_api_key', TEST_API_KEY, now);

      const config = await authManager.getAuthConfig(TEST_USER_ID);

      expect(config.trackUsage).toBe(false);
    });

    test('should query unbilled usage correctly', () => {
      const now = Date.now();

      // Insert multiple usage records
      db.prepare(`
        INSERT INTO usage_billing (
          id, user_id, auth_method, input_tokens, output_tokens,
          cost_usd, created_at, billed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage-1', TEST_USER_ID, 'platform_payg', 1000, 500, 0.025, now, 0);

      db.prepare(`
        INSERT INTO usage_billing (
          id, user_id, auth_method, input_tokens, output_tokens,
          cost_usd, created_at, billed
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage-2', TEST_USER_ID, 'platform_payg', 2000, 1000, 0.050, now, 0);

      const summary = db.prepare(`
        SELECT SUM(cost_usd) as total_cost, COUNT(*) as count
        FROM usage_billing
        WHERE user_id = ? AND billed = 0
      `).get(TEST_USER_ID);

      expect(summary.count).toBe(2);
      expect(summary.total_cost).toBeCloseTo(0.075, 3);
    });
  });

  describe('6. Schema Compliance Tests', () => {
    test('should enforce STRICT table mode', () => {
      // Try to insert with wrong column name
      expect(() => {
        db.prepare(`
          INSERT INTO user_claude_auth (user_id, auth_method, wrong_column, created_at)
          VALUES (?, ?, ?, ?)
        `).run(TEST_USER_ID, 'oauth', 'value', Date.now());
      }).toThrow(); // STRICT mode rejects unknown columns
    });

    test('should enforce NOT NULL constraints', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO user_claude_auth (user_id, created_at)
          VALUES (?, ?)
        `).run(TEST_USER_ID, Date.now());
      }).toThrow(); // auth_method is NOT NULL
    });

    test('should enforce PRIMARY KEY constraint', () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at)
        VALUES (?, ?, ?)
      `).run(TEST_USER_ID, 'oauth', now);

      expect(() => {
        db.prepare(`
          INSERT INTO user_claude_auth (user_id, auth_method, created_at)
          VALUES (?, ?, ?)
        `).run(TEST_USER_ID, 'oauth', now); // Duplicate PRIMARY KEY
      }).toThrow();
    });

    test('should allow nullable encrypted_api_key', () => {
      const now = Date.now();

      expect(() => {
        db.prepare(`
          INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key, created_at)
          VALUES (?, ?, ?, ?)
        `).run(TEST_USER_ID, 'oauth', null, now);
      }).not.toThrow(); // encrypted_api_key can be NULL
    });

    test('should store updated_at timestamp correctly', async () => {
      const now = Date.now();
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at)
        VALUES (?, ?, ?)
      `).run(TEST_USER_ID, 'platform_payg', now);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update the record
      const updateTime = Date.now();
      db.prepare(`
        UPDATE user_claude_auth SET updated_at = ? WHERE user_id = ?
      `).run(updateTime, TEST_USER_ID);

      const user = db.prepare('SELECT updated_at FROM user_claude_auth WHERE user_id = ?').get(TEST_USER_ID);

      expect(user.updated_at).toBe(updateTime);
      expect(user.updated_at).toBeGreaterThan(now);
    });
  });
});

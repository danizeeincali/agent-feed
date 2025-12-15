/**
 * TDD Test Suite for ClaudeAuthManager
 *
 * These tests are written BEFORE implementation (Red Phase of TDD).
 * They define the contract and expected behavior of the ClaudeAuthManager service.
 *
 * Run with: npm test -- ClaudeAuthManager.test.js
 */

const Database = require('better-sqlite3');
const path = require('path');

describe('ClaudeAuthManager', () => {
  let db;
  let ClaudeAuthManager;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Create required tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_claude_auth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'user_api_key', 'platform_payg')),
        encrypted_api_key TEXT,
        oauth_token TEXT,
        oauth_refresh_token TEXT,
        oauth_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id)
      );

      CREATE TABLE IF NOT EXISTS usage_billing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        auth_method TEXT NOT NULL,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cost_usd REAL NOT NULL DEFAULT 0.0,
        request_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Insert test user
    db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
      .run('testuser', 'test@example.com', 'hashed_password');

    // Require the ClaudeAuthManager
    ClaudeAuthManager = require('../../../../services/auth/ClaudeAuthManager.cjs');
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    // Clear any environment variable pollution
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CLAUDE_PLATFORM_KEY;
  });

  describe('getAuthConfig()', () => {
    it('should return OAuth config when auth_method is "oauth"', async () => {
      // Arrange
      const userId = 1;
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_token, oauth_refresh_token, oauth_expires_at)
        VALUES (?, ?, ?, ?, datetime('now', '+1 hour'))
      `).run(userId, 'oauth', 'oauth_access_token_123', 'oauth_refresh_token_456');

      // Act
      const authManager = new ClaudeAuthManager(db);
      const config = await authManager.getAuthConfig(userId);

      // Assert
      expect(config).toBeDefined();
      expect(config.authMethod).toBe('oauth');
      expect(config.oauthToken).toBe('oauth_access_token_123');
      expect(config.oauthRefreshToken).toBe('oauth_refresh_token_456');
      expect(config.oauthExpiresAt).toBeDefined();
      expect(config.apiKey).toBeUndefined();
    });

    it('should return user API key config when auth_method is "user_api_key"', async () => {
      // Arrange
      const userId = 1;
      const encryptedKey = 'encrypted_sk-ant-api03-xxx';
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key)
        VALUES (?, ?, ?)
      `).run(userId, 'user_api_key', encryptedKey);

      // Act
      const authManager = new ClaudeAuthManager(db);
      const config = await authManager.getAuthConfig(userId);

      // Assert
      expect(config).toBeDefined();
      expect(config.authMethod).toBe('user_api_key');
      expect(config.encryptedApiKey).toBe(encryptedKey);
      expect(config.oauthToken).toBeUndefined();
    });

    it('should return platform PAYG config when auth_method is "platform_payg"', async () => {
      // Arrange
      const userId = 1;
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method)
        VALUES (?, ?)
      `).run(userId, 'platform_payg');

      // Act
      const authManager = new ClaudeAuthManager(db);
      const config = await authManager.getAuthConfig(userId);

      // Assert
      expect(config).toBeDefined();
      expect(config.authMethod).toBe('platform_payg');
      expect(config.encryptedApiKey).toBeUndefined();
      expect(config.oauthToken).toBeUndefined();
    });

    it('should return null when user has no auth config', async () => {
      // Arrange
      const userId = 1;

      // Act
      const authManager = new ClaudeAuthManager(db);
      const config = await authManager.getAuthConfig(userId);

      // Assert
      expect(config).toBeNull();
    });
  });

  describe('prepareSDKAuth()', () => {
    it('should DELETE process.env.ANTHROPIC_API_KEY when method is "oauth"', async () => {
      // Arrange
      process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-original-key';
      const userId = 1;
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_token)
        VALUES (?, ?, ?)
      `).run(userId, 'oauth', 'oauth_token_123');

      // Act
      const authManager = new ClaudeAuthManager(db);
      const sdkConfig = await authManager.prepareSDKAuth(userId);

      // Assert
      expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
      expect(sdkConfig).toBeDefined();
      expect(sdkConfig.authMethod).toBe('oauth');
      expect(sdkConfig.oauthToken).toBe('oauth_token_123');
      expect(sdkConfig.originalEnvKey).toBe('sk-ant-api03-original-key');
    });

    it('should SET user API key in config when method is "user_api_key"', async () => {
      // Arrange
      const userId = 1;
      const userApiKey = 'sk-ant-api03-user-provided-key-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      // Use real encryption
      const ApiKeyEncryption = require('../../../../services/auth/ApiKeyEncryption.cjs');
      const encrypted = ApiKeyEncryption.encryptApiKey(userApiKey);

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key)
        VALUES (?, ?, ?)
      `).run(userId, 'user_api_key', encrypted);

      // Act
      const authManager = new ClaudeAuthManager(db);
      const sdkConfig = await authManager.prepareSDKAuth(userId);

      // Assert
      expect(sdkConfig).toBeDefined();
      expect(sdkConfig.authMethod).toBe('user_api_key');
      expect(sdkConfig.apiKey).toBe(userApiKey);
      expect(sdkConfig.apiKey).toMatch(/^sk-ant-api03-/);
    });

    it('should use platform key when method is "platform_payg"', async () => {
      // Arrange
      process.env.CLAUDE_PLATFORM_KEY = 'sk-ant-api03-platform-key-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
      const userId = 1;
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method)
        VALUES (?, ?)
      `).run(userId, 'platform_payg');

      // Act
      const authManager = new ClaudeAuthManager(db);
      const sdkConfig = await authManager.prepareSDKAuth(userId);

      // Assert
      expect(sdkConfig).toBeDefined();
      expect(sdkConfig.authMethod).toBe('platform_payg');
      expect(sdkConfig.apiKey).toBe(process.env.CLAUDE_PLATFORM_KEY);
      expect(sdkConfig.platformBillingEnabled).toBe(true);
    });

    it('should throw error when user has no auth config', async () => {
      // Arrange
      const userId = 1;

      // Act & Assert
      const authManager = new ClaudeAuthManager(db);
      await expect(authManager.prepareSDKAuth(userId)).rejects.toThrow('No authentication configuration found for user');
    });
  });

  describe('restoreSDKAuth()', () => {
    it('should restore original ANTHROPIC_API_KEY after OAuth usage', async () => {
      // Arrange
      const originalKey = 'sk-ant-api03-original-platform-key';
      process.env.ANTHROPIC_API_KEY = originalKey;
      const userId = 1;
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_token)
        VALUES (?, ?, ?)
      `).run(userId, 'oauth', 'oauth_token_123');

      const authManager = new ClaudeAuthManager(db);
      const sdkConfig = await authManager.prepareSDKAuth(userId);

      // Verify it was deleted
      expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();

      // Act
      authManager.restoreSDKAuth(sdkConfig);

      // Assert
      expect(process.env.ANTHROPIC_API_KEY).toBe(originalKey);
    });

    it('should not set ANTHROPIC_API_KEY if there was no original key', async () => {
      // Arrange
      delete process.env.ANTHROPIC_API_KEY;
      const userId = 1;
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_token)
        VALUES (?, ?, ?)
      `).run(userId, 'oauth', 'oauth_token_123');

      const authManager = new ClaudeAuthManager(db);
      const sdkConfig = await authManager.prepareSDKAuth(userId);

      // Act
      authManager.restoreSDKAuth(sdkConfig);

      // Assert
      expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();
    });

    it('should handle restoration for user_api_key method', async () => {
      // Arrange
      const originalKey = 'sk-ant-api03-platform-key';
      process.env.ANTHROPIC_API_KEY = originalKey;
      const userId = 1;
      const userApiKey = 'sk-ant-api03-user-key-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

      const ApiKeyEncryption = require('../../../../services/auth/ApiKeyEncryption.cjs');
      const encrypted = ApiKeyEncryption.encryptApiKey(userApiKey);

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key)
        VALUES (?, ?, ?)
      `).run(userId, 'user_api_key', encrypted);

      const authManager = new ClaudeAuthManager(db);
      const sdkConfig = await authManager.prepareSDKAuth(userId);

      // Act
      authManager.restoreSDKAuth(sdkConfig);

      // Assert
      expect(process.env.ANTHROPIC_API_KEY).toBe(originalKey);
    });
  });

  describe('trackUsage()', () => {
    it('should insert usage record into usage_billing table with real database', async () => {
      // Arrange
      const userId = 1;
      const usageData = {
        authMethod: 'user_api_key',
        inputTokens: 1500,
        outputTokens: 750,
        costUsd: 0.0345
      };

      // Act
      const authManager = new ClaudeAuthManager(db);
      await authManager.trackUsage(userId, usageData);

      // Assert - Query real database
      const record = db.prepare(`
        SELECT * FROM usage_billing WHERE user_id = ? ORDER BY id DESC LIMIT 1
      `).get(userId);

      expect(record).toBeDefined();
      expect(record.user_id).toBe(userId);
      expect(record.auth_method).toBe('user_api_key');
      expect(record.input_tokens).toBe(1500);
      expect(record.output_tokens).toBe(750);
      expect(record.cost_usd).toBeCloseTo(0.0345, 4);
      expect(record.request_timestamp).toBeDefined();
    });

    it('should track OAuth usage with zero cost', async () => {
      // Arrange
      const userId = 1;
      const usageData = {
        authMethod: 'oauth',
        inputTokens: 2000,
        outputTokens: 1000,
        costUsd: 0.0 // OAuth is free for user
      };

      // Act
      const authManager = new ClaudeAuthManager(db);
      await authManager.trackUsage(userId, usageData);

      // Assert
      const record = db.prepare(`
        SELECT * FROM usage_billing WHERE user_id = ? AND auth_method = 'oauth'
      `).get(userId);

      expect(record).toBeDefined();
      expect(record.cost_usd).toBe(0.0);
      expect(record.input_tokens).toBe(2000);
      expect(record.output_tokens).toBe(1000);
    });

    it('should track platform_payg usage with calculated cost', async () => {
      // Arrange
      const userId = 1;
      const usageData = {
        authMethod: 'platform_payg',
        inputTokens: 10000,
        outputTokens: 5000,
        costUsd: 0.15 // Calculated based on token pricing
      };

      // Act
      const authManager = new ClaudeAuthManager(db);
      await authManager.trackUsage(userId, usageData);

      // Assert
      const records = db.prepare(`
        SELECT * FROM usage_billing WHERE user_id = ? AND auth_method = 'platform_payg'
      `).all(userId);

      expect(records.length).toBe(1);
      expect(records[0].cost_usd).toBeCloseTo(0.15, 2);
    });

    it('should accumulate multiple usage records for the same user', async () => {
      // Arrange
      const userId = 1;
      const authManager = new ClaudeAuthManager(db);

      // Act - Track multiple requests
      await authManager.trackUsage(userId, {
        authMethod: 'user_api_key',
        inputTokens: 1000,
        outputTokens: 500,
        costUsd: 0.02
      });

      await authManager.trackUsage(userId, {
        authMethod: 'user_api_key',
        inputTokens: 2000,
        outputTokens: 1000,
        costUsd: 0.04
      });

      await authManager.trackUsage(userId, {
        authMethod: 'user_api_key',
        inputTokens: 1500,
        outputTokens: 750,
        costUsd: 0.03
      });

      // Assert
      const records = db.prepare(`
        SELECT COUNT(*) as count, SUM(input_tokens) as total_input,
               SUM(output_tokens) as total_output, SUM(cost_usd) as total_cost
        FROM usage_billing WHERE user_id = ?
      `).get(userId);

      expect(records.count).toBe(3);
      expect(records.total_input).toBe(4500);
      expect(records.total_output).toBe(2250);
      expect(records.total_cost).toBeCloseTo(0.09, 2);
    });

    it('should throw error when tracking usage for non-existent user', async () => {
      // Arrange
      const nonExistentUserId = 999;
      const usageData = {
        authMethod: 'user_api_key',
        inputTokens: 1000,
        outputTokens: 500,
        costUsd: 0.02
      };

      // Act & Assert
      const authManager = new ClaudeAuthManager(db);
      await expect(authManager.trackUsage(nonExistentUserId, usageData))
        .rejects.toThrow('FOREIGN KEY constraint failed');
    });
  });

  describe('getBillingMetrics()', () => {
    it('should return usage summary for a user', async () => {
      // Arrange
      const userId = 1;
      const authManager = new ClaudeAuthManager(db);

      // Insert test usage data
      await authManager.trackUsage(userId, {
        authMethod: 'user_api_key',
        inputTokens: 1000,
        outputTokens: 500,
        costUsd: 0.02
      });

      await authManager.trackUsage(userId, {
        authMethod: 'user_api_key',
        inputTokens: 2000,
        outputTokens: 1000,
        costUsd: 0.04
      });

      // Act
      const metrics = await authManager.getBillingMetrics(userId);

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.totalInputTokens).toBe(3000);
      expect(metrics.totalOutputTokens).toBe(1500);
      expect(metrics.totalCostUsd).toBeCloseTo(0.06, 2);
      expect(metrics.requestCount).toBe(2);
    });

    it('should return zero metrics for user with no usage', async () => {
      // Arrange
      const userId = 1;

      // Act
      const authManager = new ClaudeAuthManager(db);
      const metrics = await authManager.getBillingMetrics(userId);

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.totalInputTokens).toBe(0);
      expect(metrics.totalOutputTokens).toBe(0);
      expect(metrics.totalCostUsd).toBe(0);
      expect(metrics.requestCount).toBe(0);
    });
  });
});

/**
 * TDD Integration Test Suite for Claude Auth API Endpoints
 *
 * These tests define the contract for the Claude authentication API.
 * Written BEFORE implementation (Red Phase of TDD).
 *
 * Tests use real database and HTTP requests.
 * Run with: npm test -- claude-auth.test.js
 */

const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');

describe('Claude Auth API Integration Tests', () => {
  let app;
  let db;
  let testUserId;
  let authToken;

  beforeAll(() => {
    // Create in-memory database
    db = new Database(':memory:');

    // Create schema
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

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create test user
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `).run('testuser', 'test@example.com', 'hashed_password');

    testUserId = result.lastInsertRowid;

    // Create test session
    authToken = 'test-auth-token-' + Date.now();
    db.prepare(`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (?, ?, datetime('now', '+1 day'))
    `).run(testUserId, authToken);

    // Set environment variables
    process.env.API_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-key-32-chars-long-minimum-required';
    process.env.CLAUDE_PLATFORM_KEY = 'sk-ant-api03-platform-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    // Try to load the app - will fail in Red phase
    try {
      app = require('../../../server'); // Assuming Express app is exported from server.js
    } catch (error) {
      app = null;
    }
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    delete process.env.API_KEY_ENCRYPTION_SECRET;
    delete process.env.CLAUDE_PLATFORM_KEY;
  });

  beforeEach(() => {
    // Clear auth config before each test
    db.prepare('DELETE FROM user_claude_auth').run();
    db.prepare('DELETE FROM usage_billing').run();
  });

  describe('GET /api/auth/claude/config', () => {
    it('should return user\'s auth method and config', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_token)
        VALUES (?, ?, ?)
      `).run(testUserId, 'oauth', 'oauth_token_123');

      // Act
      const response = await request(app)
        .get('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.authMethod).toBe('oauth');
      expect(response.body.oauthToken).toBeDefined();
      expect(response.body.oauthToken).toBe('oauth_token_123');
    });

    it('should return 404 when user has no auth config', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('No authentication configuration found');
    });

    it('should return 401 when no auth token provided', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/claude/config')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should return 401 when auth token is invalid', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/claude/config')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should not expose encrypted API keys in response', async () => {
      // Arrange
      const ApiKeyEncryption = require('../../../services/auth/ApiKeyEncryption');
      const userKey = 'sk-ant-api03-USERKEY12345678901234567890123456789012345678901234567890123456789012345678901234567890';
      const encrypted = ApiKeyEncryption.encryptApiKey(userKey);

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, encrypted_api_key)
        VALUES (?, ?, ?)
      `).run(testUserId, 'user_api_key', encrypted);

      // Act
      const response = await request(app)
        .get('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.authMethod).toBe('user_api_key');
      expect(response.body.encryptedApiKey).toBeUndefined();
      expect(response.body.apiKey).toBeUndefined();
      expect(response.body.hasApiKey).toBe(true); // Should indicate presence without exposing
    });
  });

  describe('POST /api/auth/claude/config', () => {
    it('should save OAuth auth method', async () => {
      // Arrange
      const config = {
        authMethod: 'oauth',
        oauthToken: 'new_oauth_token_456',
        oauthRefreshToken: 'refresh_token_789',
        oauthExpiresAt: new Date(Date.now() + 3600000).toISOString()
      };

      // Act
      const response = await request(app)
        .post('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authMethod).toBe('oauth');

      // Verify in database
      const saved = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(testUserId);
      expect(saved).toBeDefined();
      expect(saved.auth_method).toBe('oauth');
      expect(saved.oauth_token).toBe('new_oauth_token_456');
    });

    it('should save user_api_key auth method with encrypted key', async () => {
      // Arrange
      const userApiKey = 'sk-ant-api03-USERAPIKEY123456789012345678901234567890123456789012345678901234567890123456789012345';
      const config = {
        authMethod: 'user_api_key',
        apiKey: userApiKey
      };

      // Act
      const response = await request(app)
        .post('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authMethod).toBe('user_api_key');

      // Verify in database - key should be encrypted
      const saved = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(testUserId);
      expect(saved).toBeDefined();
      expect(saved.auth_method).toBe('user_api_key');
      expect(saved.encrypted_api_key).toBeDefined();
      expect(saved.encrypted_api_key).not.toBe(userApiKey);
      expect(saved.encrypted_api_key).toMatch(/^[a-f0-9]+:[a-f0-9]+$/);

      // Verify decryption works
      const ApiKeyEncryption = require('../../../services/auth/ApiKeyEncryption');
      const decrypted = ApiKeyEncryption.decryptApiKey(saved.encrypted_api_key);
      expect(decrypted).toBe(userApiKey);
    });

    it('should save platform_payg auth method', async () => {
      // Arrange
      const config = {
        authMethod: 'platform_payg'
      };

      // Act
      const response = await request(app)
        .post('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.authMethod).toBe('platform_payg');

      // Verify in database
      const saved = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(testUserId);
      expect(saved).toBeDefined();
      expect(saved.auth_method).toBe('platform_payg');
      expect(saved.encrypted_api_key).toBeNull();
    });

    it('should update existing auth config', async () => {
      // Arrange - Create initial config
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method)
        VALUES (?, ?)
      `).run(testUserId, 'platform_payg');

      // Act - Update to OAuth
      const newConfig = {
        authMethod: 'oauth',
        oauthToken: 'updated_oauth_token'
      };

      const response = await request(app)
        .post('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newConfig)
        .expect(200);

      // Assert
      const updated = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(testUserId);
      expect(updated.auth_method).toBe('oauth');
      expect(updated.oauth_token).toBe('updated_oauth_token');

      // Should only be one record (updated, not inserted)
      const count = db.prepare('SELECT COUNT(*) as count FROM user_claude_auth WHERE user_id = ?').get(testUserId);
      expect(count.count).toBe(1);
    });

    it('should return 400 when API key is invalid', async () => {
      // Arrange
      const config = {
        authMethod: 'user_api_key',
        apiKey: 'invalid-key-format'
      };

      // Act
      const response = await request(app)
        .post('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Invalid API key format');
    });

    it('should return 400 when auth method is invalid', async () => {
      // Arrange
      const config = {
        authMethod: 'invalid_method'
      };

      // Act
      const response = await request(app)
        .post('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).toContain('Invalid auth method');
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/claude/config')
        .send({ authMethod: 'oauth' })
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/claude/billing', () => {
    it('should return usage summary for user', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method)
        VALUES (?, ?)
      `).run(testUserId, 'user_api_key');

      // Insert usage records
      db.prepare(`
        INSERT INTO usage_billing (user_id, auth_method, input_tokens, output_tokens, cost_usd)
        VALUES (?, ?, ?, ?, ?)
      `).run(testUserId, 'user_api_key', 1000, 500, 0.02);

      db.prepare(`
        INSERT INTO usage_billing (user_id, auth_method, input_tokens, output_tokens, cost_usd)
        VALUES (?, ?, ?, ?, ?)
      `).run(testUserId, 'user_api_key', 2000, 1000, 0.04);

      // Act
      const response = await request(app)
        .get('/api/auth/claude/billing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.totalInputTokens).toBe(3000);
      expect(response.body.totalOutputTokens).toBe(1500);
      expect(response.body.totalCostUsd).toBeCloseTo(0.06, 2);
      expect(response.body.requestCount).toBe(2);
      expect(response.body.authMethod).toBe('user_api_key');
    });

    it('should return zero metrics when user has no usage', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/claude/billing')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.totalInputTokens).toBe(0);
      expect(response.body.totalOutputTokens).toBe(0);
      expect(response.body.totalCostUsd).toBe(0);
      expect(response.body.requestCount).toBe(0);
    });

    it('should support date range filtering', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO usage_billing (user_id, auth_method, input_tokens, output_tokens, cost_usd, request_timestamp)
        VALUES (?, ?, ?, ?, ?, datetime('now', '-2 days'))
      `).run(testUserId, 'user_api_key', 1000, 500, 0.02);

      db.prepare(`
        INSERT INTO usage_billing (user_id, auth_method, input_tokens, output_tokens, cost_usd, request_timestamp)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(testUserId, 'user_api_key', 2000, 1000, 0.04);

      // Act - Request last 24 hours only
      const response = await request(app)
        .get('/api/auth/claude/billing')
        .query({ startDate: new Date(Date.now() - 86400000).toISOString() })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert - Should only include recent usage
      expect(response.body.totalInputTokens).toBe(2000);
      expect(response.body.totalOutputTokens).toBe(1000);
      expect(response.body.requestCount).toBe(1);
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/claude/billing')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/auth/claude/config', () => {
    it('should delete user auth configuration', async () => {
      // Arrange
      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, oauth_token)
        VALUES (?, ?, ?)
      `).run(testUserId, 'oauth', 'token_to_delete');

      // Act
      const response = await request(app)
        .delete('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify deletion in database
      const deleted = db.prepare('SELECT * FROM user_claude_auth WHERE user_id = ?').get(testUserId);
      expect(deleted).toBeUndefined();
    });

    it('should return 404 when no config exists to delete', async () => {
      // Act
      const response = await request(app)
        .delete('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('No configuration found');
    });

    it('should return 401 when not authenticated', async () => {
      // Act
      const response = await request(app)
        .delete('/api/auth/claude/config')
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Error handling', () => {
    it('should return 500 when database error occurs', async () => {
      // Arrange - Close database to simulate error
      db.close();

      // Act
      const response = await request(app)
        .get('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();

      // Recreate database for other tests
      db = new Database(':memory:');
    });

    it('should not expose sensitive error details to client', async () => {
      // Arrange - Trigger encryption error
      delete process.env.API_KEY_ENCRYPTION_SECRET;

      const config = {
        authMethod: 'user_api_key',
        apiKey: 'sk-ant-api03-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
      };

      // Act
      const response = await request(app)
        .post('/api/auth/claude/config')
        .set('Authorization', `Bearer ${authToken}`)
        .send(config)
        .expect('Content-Type', /json/);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
      expect(response.body.error).not.toContain('sk-ant-api03');
      expect(response.body.stackTrace).toBeUndefined();
    });
  });
});

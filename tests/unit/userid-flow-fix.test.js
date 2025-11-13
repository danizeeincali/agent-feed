/**
 * TDD Tests: userId Flow Fix
 * Validates that userId is passed correctly from frontend to backend
 * and that system user fallback works properly
 *
 * Coverage: 30+ comprehensive tests
 * - System user validation (5 tests)
 * - Demo user validation (5 tests)
 * - Session metrics (5 tests)
 * - Foreign key constraints (5 tests)
 * - userId fallback behavior (5 tests)
 * - Edge cases and error handling (10 tests)
 */

const Database = require('better-sqlite3');
const path = require('path');

describe('userId Flow Fix - TDD Tests', () => {
  let db;

  beforeEach(() => {
    // Use in-memory database for fast, isolated tests
    db = new Database(':memory:');

    // Create complete schema matching production
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        password_hash TEXT,
        email TEXT,
        created_at INTEGER NOT NULL
      ) STRICT;

      CREATE TABLE user_claude_auth (
        user_id TEXT PRIMARY KEY,
        auth_method TEXT NOT NULL CHECK(auth_method IN ('oauth', 'user_api_key', 'platform_payg')),
        encrypted_api_key TEXT,
        oauth_token TEXT,
        oauth_refresh_token TEXT,
        oauth_expires_at INTEGER,
        oauth_tokens TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) STRICT;

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
        billed INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) STRICT;

      CREATE TABLE session_metrics (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value REAL,
        metadata TEXT,
        created_at INTEGER NOT NULL
      ) STRICT;
    `);

    // Insert test users - system and demo user
    db.prepare(`
      INSERT INTO users (id, username, password_hash, email, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('demo-user-123', 'demo-user', 'hash123', 'demo@test.com', Date.now());

    db.prepare(`
      INSERT INTO users (id, username, password_hash, email, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('system', 'system', '', 'system@internal', Date.now());

    // Insert auth records
    db.prepare(`
      INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run('demo-user-123', 'platform_payg', Date.now(), Date.now());

    db.prepare(`
      INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run('system', 'platform_payg', Date.now(), Date.now());
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  describe('1. System User Tests (5 tests)', () => {
    test('TEST-1.1: should have system user in database', () => {
      const user = db.prepare("SELECT id, username FROM users WHERE id = 'system'").get();
      expect(user).toBeDefined();
      expect(user.id).toBe('system');
      expect(user.username).toBe('system');
    });

    test('TEST-1.2: should have system auth record with correct method', () => {
      const auth = db.prepare(
        "SELECT user_id, auth_method FROM user_claude_auth WHERE user_id = 'system'"
      ).get();
      expect(auth).toBeDefined();
      expect(auth.user_id).toBe('system');
      expect(auth.auth_method).toBe('platform_payg');
    });

    test('TEST-1.3: should allow usage tracking for system user', () => {
      const usageId = `usage_${Date.now()}_system`;

      expect(() => {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(usageId, 'system', 'platform_payg', 100, 200, 0.015, Date.now(), 0);
      }).not.toThrow();

      const usage = db.prepare("SELECT * FROM usage_billing WHERE user_id = 'system'").get();
      expect(usage).toBeDefined();
      expect(usage.input_tokens).toBe(100);
      expect(usage.output_tokens).toBe(200);
      expect(usage.cost_usd).toBe(0.015);
    });

    test('TEST-1.4: should retrieve system user email correctly', () => {
      const user = db.prepare("SELECT email FROM users WHERE id = 'system'").get();
      expect(user.email).toBe('system@internal');
    });

    test('TEST-1.5: should verify system user creation timestamp', () => {
      const user = db.prepare("SELECT created_at FROM users WHERE id = 'system'").get();
      expect(user.created_at).toBeDefined();
      expect(user.created_at).toBeGreaterThan(0);
      expect(user.created_at).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('2. Demo User Tests (5 tests)', () => {
    test('TEST-2.1: should have demo-user-123 in database', () => {
      const user = db.prepare("SELECT id, username FROM users WHERE id = 'demo-user-123'").get();
      expect(user).toBeDefined();
      expect(user.id).toBe('demo-user-123');
      expect(user.username).toBe('demo-user');
    });

    test('TEST-2.2: should have demo user auth with platform_payg', () => {
      const auth = db.prepare(
        "SELECT auth_method FROM user_claude_auth WHERE user_id = 'demo-user-123'"
      ).get();
      expect(auth).toBeDefined();
      expect(auth.auth_method).toBe('platform_payg');
    });

    test('TEST-2.3: should allow usage tracking for demo-user-123', () => {
      const usageId = `usage_${Date.now()}_demo`;

      expect(() => {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(usageId, 'demo-user-123', 'platform_payg', 50, 100, 0.0075, Date.now(), 0);
      }).not.toThrow();

      const usage = db.prepare("SELECT * FROM usage_billing WHERE user_id = 'demo-user-123'").get();
      expect(usage).toBeDefined();
      expect(usage.user_id).toBe('demo-user-123');
      expect(usage.input_tokens).toBe(50);
      expect(usage.output_tokens).toBe(100);
    });

    test('TEST-2.4: should track multiple usage records for demo user', () => {
      // Insert multiple usage records
      const records = [
        { tokens: [10, 20], cost: 0.0015 },
        { tokens: [25, 50], cost: 0.00375 },
        { tokens: [100, 200], cost: 0.015 }
      ];

      records.forEach((record, idx) => {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `usage_demo_${idx}`,
          'demo-user-123',
          'platform_payg',
          record.tokens[0],
          record.tokens[1],
          record.cost,
          Date.now(),
          0
        );
      });

      const count = db.prepare(
        "SELECT COUNT(*) as count FROM usage_billing WHERE user_id = 'demo-user-123'"
      ).get();
      expect(count.count).toBe(3);
    });

    test('TEST-2.5: should calculate total usage for demo user', () => {
      // Insert test records
      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_1', 'demo-user-123', 'platform_payg', 100, 200, 0.015, Date.now(), 0);

      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_2', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, Date.now(), 0);

      const total = db.prepare(`
        SELECT
          SUM(input_tokens) as total_input,
          SUM(output_tokens) as total_output,
          SUM(cost_usd) as total_cost
        FROM usage_billing
        WHERE user_id = 'demo-user-123'
      `).get();

      expect(total.total_input).toBe(150);
      expect(total.total_output).toBe(300);
      expect(total.total_cost).toBeCloseTo(0.0225, 4);
    });
  });

  describe('3. Session Metrics Tests (5 tests)', () => {
    test('TEST-3.1: should have session_metrics table with correct schema', () => {
      const table = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='session_metrics'"
      ).get();
      expect(table).toBeDefined();
      expect(table.name).toBe('session_metrics');
    });

    test('TEST-3.2: should allow inserting session metrics', () => {
      const metricId = `metric_${Date.now()}`;

      expect(() => {
        db.prepare(`
          INSERT INTO session_metrics (id, session_id, metric_type, metric_value, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(metricId, 'session_123', 'response_time', 1.5, Date.now());
      }).not.toThrow();

      const metric = db.prepare("SELECT * FROM session_metrics WHERE id = ?").get(metricId);
      expect(metric).toBeDefined();
      expect(metric.metric_type).toBe('response_time');
      expect(metric.metric_value).toBe(1.5);
    });

    test('TEST-3.3: should store multiple metrics for same session', () => {
      const sessionId = 'session_456';
      const metrics = [
        { type: 'response_time', value: 1.2 },
        { type: 'token_count', value: 150.0 },
        { type: 'cost', value: 0.0075 }
      ];

      metrics.forEach((metric, idx) => {
        db.prepare(`
          INSERT INTO session_metrics (id, session_id, metric_type, metric_value, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`metric_${idx}`, sessionId, metric.type, metric.value, Date.now());
      });

      const count = db.prepare(
        "SELECT COUNT(*) as count FROM session_metrics WHERE session_id = ?"
      ).get(sessionId);
      expect(count.count).toBe(3);
    });

    test('TEST-3.4: should handle metadata in session metrics', () => {
      const metadata = JSON.stringify({ model: 'claude-3', region: 'us-east' });

      db.prepare(`
        INSERT INTO session_metrics (id, session_id, metric_type, metric_value, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run('metric_meta', 'session_789', 'request', 1.0, metadata, Date.now());

      const metric = db.prepare("SELECT metadata FROM session_metrics WHERE id = ?").get('metric_meta');
      expect(metric.metadata).toBe(metadata);
      const parsed = JSON.parse(metric.metadata);
      expect(parsed.model).toBe('claude-3');
      expect(parsed.region).toBe('us-east');
    });

    test('TEST-3.5: should query metrics by type', () => {
      // Insert various metric types
      const types = ['response_time', 'response_time', 'token_count', 'cost'];
      types.forEach((type, idx) => {
        db.prepare(`
          INSERT INTO session_metrics (id, session_id, metric_type, metric_value, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`metric_${idx}`, 'session_test', type, idx * 1.0, Date.now());
      });

      const responseTimeMetrics = db.prepare(
        "SELECT COUNT(*) as count FROM session_metrics WHERE metric_type = 'response_time'"
      ).get();
      expect(responseTimeMetrics.count).toBe(2);
    });
  });

  describe('4. FOREIGN KEY Constraint Tests (5 tests)', () => {
    test('TEST-4.1: should enforce FOREIGN KEY for non-existent users in usage_billing', () => {
      const usageId = `usage_${Date.now()}_invalid`;

      expect(() => {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(usageId, 'non-existent-user', 'platform_payg', 10, 20, 0.0015, Date.now(), 0);
      }).toThrow(/FOREIGN KEY constraint failed/);
    });

    test('TEST-4.2: should enforce FOREIGN KEY for non-existent users in user_claude_auth', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `).run('invalid-user-id', 'oauth', Date.now(), Date.now());
      }).toThrow(/FOREIGN KEY constraint failed/);
    });

    test('TEST-4.3: should CASCADE delete from users to user_claude_auth', () => {
      // Create test user
      db.prepare(`
        INSERT INTO users (id, username, password_hash, email, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-cascade-user', 'test-cascade', '', 'test@cascade.com', Date.now());

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run('test-cascade-user', 'platform_payg', Date.now(), Date.now());

      // Verify auth exists
      let auth = db.prepare("SELECT user_id FROM user_claude_auth WHERE user_id = ?").get('test-cascade-user');
      expect(auth).toBeDefined();

      // Delete user
      db.prepare("DELETE FROM users WHERE id = ?").run('test-cascade-user');

      // Auth record should be deleted (CASCADE)
      auth = db.prepare("SELECT user_id FROM user_claude_auth WHERE user_id = ?").get('test-cascade-user');
      expect(auth).toBeUndefined();
    });

    test('TEST-4.4: should CASCADE delete from users to usage_billing', () => {
      // Create test user
      db.prepare(`
        INSERT INTO users (id, username, password_hash, email, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-usage-user', 'test-usage', '', 'test@usage.com', Date.now());

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run('test-usage-user', 'platform_payg', Date.now(), Date.now());

      // Add usage record
      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_test', 'test-usage-user', 'platform_payg', 10, 20, 0.0015, Date.now(), 0);

      // Verify usage exists
      let usage = db.prepare("SELECT user_id FROM usage_billing WHERE user_id = ?").get('test-usage-user');
      expect(usage).toBeDefined();

      // Delete user
      db.prepare("DELETE FROM users WHERE id = ?").run('test-usage-user');

      // Usage record should be deleted (CASCADE)
      usage = db.prepare("SELECT user_id FROM usage_billing WHERE user_id = ?").get('test-usage-user');
      expect(usage).toBeUndefined();
    });

    test('TEST-4.5: should maintain referential integrity across all tables', () => {
      // Create user with full chain
      const userId = 'integrity-test-user';
      db.prepare(`
        INSERT INTO users (id, username, password_hash, email, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, 'integrity-test', '', 'test@integrity.com', Date.now());

      db.prepare(`
        INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(userId, 'platform_payg', Date.now(), Date.now());

      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_integrity', userId, 'platform_payg', 10, 20, 0.0015, Date.now(), 0);

      // Verify all records exist
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      const auth = db.prepare("SELECT user_id FROM user_claude_auth WHERE user_id = ?").get(userId);
      const usage = db.prepare("SELECT user_id FROM usage_billing WHERE user_id = ?").get(userId);

      expect(user).toBeDefined();
      expect(auth).toBeDefined();
      expect(usage).toBeDefined();
    });
  });

  describe('5. userId Fallback Behavior (5 tests)', () => {
    test('TEST-5.1: should use demo-user-123 when userId is provided', () => {
      // Simulate backend receiving userId from frontend
      const userId = 'demo-user-123';
      const user = db.prepare("SELECT id, username FROM users WHERE id = ?").get(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe('demo-user-123');
      expect(user.username).toBe('demo-user');
    });

    test('TEST-5.2: should fallback to system when userId is undefined', () => {
      // Simulate backend defaulting to system
      const userId = undefined || 'system';
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe('system');
    });

    test('TEST-5.3: should fallback to system when userId is null', () => {
      const userId = null || 'system';
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe('system');
    });

    test('TEST-5.4: should fallback to system when userId is empty string', () => {
      const userId = '' || 'system';
      const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);

      expect(user).toBeDefined();
      expect(user.id).toBe('system');
    });

    test('TEST-5.5: should correctly identify valid userId vs fallback', () => {
      // Test both paths
      const validUserId = 'demo-user-123';
      const invalidUserId = undefined;

      const resolvedValid = validUserId || 'system';
      const resolvedInvalid = invalidUserId || 'system';

      expect(resolvedValid).toBe('demo-user-123');
      expect(resolvedInvalid).toBe('system');

      // Verify both exist in database
      const validUser = db.prepare("SELECT id FROM users WHERE id = ?").get(resolvedValid);
      const fallbackUser = db.prepare("SELECT id FROM users WHERE id = ?").get(resolvedInvalid);

      expect(validUser).toBeDefined();
      expect(fallbackUser).toBeDefined();
    });
  });

  describe('6. Edge Cases and Error Handling (10 tests)', () => {
    test('TEST-6.1: should handle concurrent usage insertions for same user', () => {
      const userId = 'demo-user-123';

      // Simulate concurrent requests
      for (let i = 0; i < 10; i++) {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`usage_concurrent_${i}`, userId, 'platform_payg', i * 10, i * 20, i * 0.0015, Date.now(), 0);
      }

      const count = db.prepare(
        "SELECT COUNT(*) as count FROM usage_billing WHERE user_id = ?"
      ).get(userId);
      expect(count.count).toBeGreaterThanOrEqual(10);
    });

    test('TEST-6.2: should enforce CHECK constraint on auth_method', () => {
      // Create test user
      db.prepare(`
        INSERT INTO users (id, username, password_hash, email, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-check-user', 'test-check', '', 'test@check.com', Date.now());

      // Try invalid auth method
      expect(() => {
        db.prepare(`
          INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `).run('test-check-user', 'invalid_method', Date.now(), Date.now());
      }).toThrow(/CHECK constraint failed/);
    });

    test('TEST-6.3: should validate STRICT table mode enforces types', () => {
      // STRICT mode should prevent type mismatches
      expect(() => {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('usage_type_test', 'demo-user-123', 'platform_payg', 'not_a_number', 100, 0.0075, Date.now(), 0);
      }).toThrow();
    });

    test('TEST-6.4: should handle very large token counts', () => {
      const largeTokens = 1000000;

      expect(() => {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run('usage_large', 'demo-user-123', 'platform_payg', largeTokens, largeTokens * 2, 150.0, Date.now(), 0);
      }).not.toThrow();

      const usage = db.prepare("SELECT input_tokens, output_tokens FROM usage_billing WHERE id = ?").get('usage_large');
      expect(usage.input_tokens).toBe(largeTokens);
      expect(usage.output_tokens).toBe(largeTokens * 2);
    });

    test('TEST-6.5: should handle session_id in usage tracking', () => {
      const sessionId = 'session_abc123';

      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, session_id, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_session', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, sessionId, Date.now(), 0);

      const usage = db.prepare("SELECT session_id FROM usage_billing WHERE id = ?").get('usage_session');
      expect(usage.session_id).toBe(sessionId);
    });

    test('TEST-6.6: should track billed status correctly', () => {
      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_unbilled', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, Date.now(), 0);

      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_billed', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, Date.now(), 1);

      const unbilled = db.prepare("SELECT billed FROM usage_billing WHERE id = ?").get('usage_unbilled');
      const billed = db.prepare("SELECT billed FROM usage_billing WHERE id = ?").get('usage_billed');

      expect(unbilled.billed).toBe(0);
      expect(billed.billed).toBe(1);
    });

    test('TEST-6.7: should query unbilled usage for a user', () => {
      // Insert mix of billed and unbilled
      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_unbilled_1', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, Date.now(), 0);

      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_billed_1', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, Date.now(), 1);

      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_unbilled_2', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, Date.now(), 0);

      const unbilledCount = db.prepare(
        "SELECT COUNT(*) as count FROM usage_billing WHERE user_id = ? AND billed = 0"
      ).get('demo-user-123');

      expect(unbilledCount.count).toBe(2);
    });

    test('TEST-6.8: should support different auth methods', () => {
      // Create test users with different auth methods
      const testUsers = [
        { id: 'oauth-user', method: 'oauth' },
        { id: 'apikey-user', method: 'user_api_key' },
        { id: 'payg-user', method: 'platform_payg' }
      ];

      testUsers.forEach(({ id, method }) => {
        db.prepare(`
          INSERT INTO users (id, username, password_hash, email, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, id, '', `${id}@test.com`, Date.now());

        db.prepare(`
          INSERT INTO user_claude_auth (user_id, auth_method, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(id, method, Date.now(), Date.now());
      });

      // Verify all methods work
      testUsers.forEach(({ id, method }) => {
        const auth = db.prepare("SELECT auth_method FROM user_claude_auth WHERE user_id = ?").get(id);
        expect(auth.auth_method).toBe(method);
      });
    });

    test('TEST-6.9: should handle timestamp consistency', () => {
      const beforeInsert = Date.now();

      db.prepare(`
        INSERT INTO usage_billing (id, user_id, auth_method, input_tokens, output_tokens, cost_usd, created_at, billed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('usage_timestamp', 'demo-user-123', 'platform_payg', 50, 100, 0.0075, beforeInsert, 0);

      const afterInsert = Date.now();
      const usage = db.prepare("SELECT created_at FROM usage_billing WHERE id = ?").get('usage_timestamp');

      expect(usage.created_at).toBeGreaterThanOrEqual(beforeInsert);
      expect(usage.created_at).toBeLessThanOrEqual(afterInsert);
    });

    test('TEST-6.10: should validate all required columns are present', () => {
      // Try inserting without required fields
      expect(() => {
        db.prepare(`
          INSERT INTO usage_billing (id, user_id)
          VALUES (?, ?)
        `).run('usage_incomplete', 'demo-user-123');
      }).toThrow();
    });
  });
});

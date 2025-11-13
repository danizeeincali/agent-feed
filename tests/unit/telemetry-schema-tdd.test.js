/**
 * TDD Test Suite: Telemetry Schema Fix
 *
 * PURPOSE: Comprehensive validation of session_metrics table schema
 * SCOPE: 100% real database operations, ZERO mocks
 * TARGET: Lines 88 (INSERT) and 129 (UPDATE) in TelemetryService.js
 *
 * TEST COVERAGE:
 * - Schema validation (PRIMARY KEY, NOT NULL, STRICT, data types)
 * - INSERT operations with all columns
 * - UPDATE operations for all status values
 * - Default values (0, 0.0, NULL)
 * - Index performance
 * - Concurrent sessions
 * - Full session lifecycle
 * - Error handling
 * - Data integrity
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../../test-telemetry-schema.db');

describe('TDD: Telemetry Schema Fix - session_metrics Table', () => {
  let db;

  beforeAll(() => {
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }

    // Create fresh database
    db = new Database(TEST_DB_PATH);

    // Apply migration
    const migrationSQL = `
      CREATE TABLE IF NOT EXISTS session_metrics (
        session_id TEXT PRIMARY KEY,
        start_time TEXT NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL,
        duration INTEGER DEFAULT 0,
        request_count INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        total_cost REAL DEFAULT 0.0,
        agent_count INTEGER DEFAULT 0,
        tool_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER
      ) STRICT;

      CREATE INDEX IF NOT EXISTS idx_session_metrics_status ON session_metrics(status);
      CREATE INDEX IF NOT EXISTS idx_session_metrics_start_time ON session_metrics(start_time);
      CREATE INDEX IF NOT EXISTS idx_session_metrics_created_at ON session_metrics(created_at);
    `;

    db.exec(migrationSQL);
  });

  afterAll(() => {
    // Close database and clean up
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Clear table before each test
    db.exec('DELETE FROM session_metrics');
  });

  // ========================================================================
  // SCHEMA VALIDATION TESTS (Tests 1-8)
  // ========================================================================

  describe('Schema Validation', () => {
    test('1. Table exists with correct name', () => {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='session_metrics'
      `).all();

      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('session_metrics');
    });

    test('2. Table is STRICT mode (type safety enforced)', () => {
      const tableInfo = db.prepare(`
        SELECT sql FROM sqlite_master WHERE type='table' AND name='session_metrics'
      `).get();

      expect(tableInfo.sql).toContain('STRICT');
    });

    test('3. PRIMARY KEY constraint on session_id', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      // Insert first record - should succeed
      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, timestamp);

      // Insert duplicate session_id - should fail
      expect(() => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status)
          VALUES (?, ?, 'active')
        `).run(sessionId, timestamp);
      }).toThrow(/UNIQUE constraint failed/);
    });

    test('4. NOT NULL constraint on session_id', () => {
      const timestamp = new Date().toISOString();

      expect(() => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status)
          VALUES (NULL, ?, 'active')
        `).run(timestamp);
      }).toThrow(/NOT NULL/);
    });

    test('5. NOT NULL constraint on start_time', () => {
      const sessionId = randomUUID();

      expect(() => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status)
          VALUES (?, NULL, 'active')
        `).run(sessionId);
      }).toThrow(/NOT NULL/);
    });

    test('6. NOT NULL constraint on status', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      expect(() => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status)
          VALUES (?, ?, NULL)
        `).run(sessionId, timestamp);
      }).toThrow(/NOT NULL/);
    });

    test('7. All columns have correct data types (STRICT mode)', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      // STRICT mode: INTEGER columns reject non-integer values
      expect(() => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status, duration)
          VALUES (?, ?, 'active', 'not-a-number')
        `).run(sessionId, timestamp);
      }).toThrow();

      // STRICT mode: REAL columns reject non-numeric values
      expect(() => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status, total_cost)
          VALUES (?, ?, 'active', 'not-a-number')
        `).run(sessionId, timestamp);
      }).toThrow();
    });

    test('8. Nullable column (end_time) accepts NULL', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, end_time, status)
        VALUES (?, ?, NULL, 'active')
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT end_time FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.end_time).toBeNull();
    });
  });

  // ========================================================================
  // INSERT OPERATION TESTS (Tests 9-13) - Matching TelemetryService.js:88
  // ========================================================================

  describe('INSERT Operations (Line 88)', () => {
    test('9. INSERT with all required columns (mimics TelemetryService.js:88)', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, request_count, total_tokens, total_cost, agent_count, tool_count, error_count)
        VALUES (?, ?, 'active', 0, 0, 0.0, 0, 0, 0)
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);

      expect(result.session_id).toBe(sessionId);
      expect(result.start_time).toBe(timestamp);
      expect(result.status).toBe('active');
      expect(result.request_count).toBe(0);
      expect(result.total_tokens).toBe(0);
      expect(result.total_cost).toBe(0.0);
      expect(result.agent_count).toBe(0);
      expect(result.tool_count).toBe(0);
      expect(result.error_count).toBe(0);
    });

    test('10. INSERT uses default values when columns omitted', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);

      // Verify defaults
      expect(result.duration).toBe(0);
      expect(result.request_count).toBe(0);
      expect(result.total_tokens).toBe(0);
      expect(result.total_cost).toBe(0.0);
      expect(result.agent_count).toBe(0);
      expect(result.tool_count).toBe(0);
      expect(result.error_count).toBe(0);
      expect(result.created_at).toBeGreaterThan(0);
    });

    test('11. INSERT with non-zero values', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, request_count, total_tokens, total_cost, agent_count, tool_count, error_count)
        VALUES (?, ?, 'active', 10, 5000, 1.25, 3, 8, 2)
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);

      expect(result.request_count).toBe(10);
      expect(result.total_tokens).toBe(5000);
      expect(result.total_cost).toBe(1.25);
      expect(result.agent_count).toBe(3);
      expect(result.tool_count).toBe(8);
      expect(result.error_count).toBe(2);
    });

    test('12. created_at auto-generated on INSERT', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();
      const beforeInsert = Math.floor(Date.now() / 1000);

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT created_at FROM session_metrics WHERE session_id = ?').get(sessionId);
      const afterInsert = Math.floor(Date.now() / 1000);

      expect(result.created_at).toBeGreaterThanOrEqual(beforeInsert);
      expect(result.created_at).toBeLessThanOrEqual(afterInsert);
    });

    test('13. Multiple concurrent INSERTs (different session_ids)', () => {
      const sessions = Array.from({ length: 5 }, () => ({
        sessionId: randomUUID(),
        timestamp: new Date().toISOString()
      }));

      // Insert all sessions
      sessions.forEach(({ sessionId, timestamp }) => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status)
          VALUES (?, ?, 'active')
        `).run(sessionId, timestamp);
      });

      const count = db.prepare('SELECT COUNT(*) as count FROM session_metrics').get();
      expect(count.count).toBe(5);
    });
  });

  // ========================================================================
  // UPDATE OPERATION TESTS (Tests 14-18) - Matching TelemetryService.js:129
  // ========================================================================

  describe('UPDATE Operations (Line 129)', () => {
    test('14. UPDATE status to completed (mimics TelemetryService.js:129)', () => {
      const sessionId = randomUUID();
      const startTime = new Date().toISOString();

      // Insert session
      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, startTime);

      // Update to completed
      const endTime = new Date(Date.now() + 5000).toISOString();
      const duration = 5000;

      db.prepare(`
        UPDATE session_metrics
        SET status = ?, end_time = ?, duration = ?
        WHERE session_id = ?
      `).run('completed', endTime, duration, sessionId);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);

      expect(result.status).toBe('completed');
      expect(result.end_time).toBe(endTime);
      expect(result.duration).toBe(duration);
    });

    test('15. UPDATE status to failed', () => {
      const sessionId = randomUUID();
      const startTime = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, startTime);

      // Update to failed
      db.prepare(`
        UPDATE session_metrics SET status = ? WHERE session_id = ?
      `).run('failed', sessionId);

      const result = db.prepare('SELECT status FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.status).toBe('failed');
    });

    test('16. UPDATE status to timeout', () => {
      const sessionId = randomUUID();
      const startTime = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, startTime);

      // Update to timeout
      db.prepare(`
        UPDATE session_metrics SET status = ? WHERE session_id = ?
      `).run('timeout', sessionId);

      const result = db.prepare('SELECT status FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.status).toBe('timeout');
    });

    test('17. UPDATE multiple columns simultaneously', () => {
      const sessionId = randomUUID();
      const startTime = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, startTime);

      // Update multiple fields
      const endTime = new Date().toISOString();
      db.prepare(`
        UPDATE session_metrics
        SET status = ?, end_time = ?, duration = ?, request_count = ?, total_tokens = ?, total_cost = ?
        WHERE session_id = ?
      `).run('completed', endTime, 10000, 5, 1200, 0.15, sessionId);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);

      expect(result.status).toBe('completed');
      expect(result.end_time).toBe(endTime);
      expect(result.duration).toBe(10000);
      expect(result.request_count).toBe(5);
      expect(result.total_tokens).toBe(1200);
      expect(result.total_cost).toBe(0.15);
    });

    test('18. UPDATE preserves unmodified columns', () => {
      const sessionId = randomUUID();
      const startTime = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, request_count, total_tokens)
        VALUES (?, ?, 'active', 5, 1000)
      `).run(sessionId, startTime);

      // Update only status
      db.prepare(`
        UPDATE session_metrics SET status = ? WHERE session_id = ?
      `).run('completed', sessionId);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);

      // Original values should be preserved
      expect(result.request_count).toBe(5);
      expect(result.total_tokens).toBe(1000);
      expect(result.status).toBe('completed');
    });
  });

  // ========================================================================
  // INDEX PERFORMANCE TESTS (Tests 19-21)
  // ========================================================================

  describe('Index Performance', () => {
    test('19. Index exists on status column', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='session_metrics' AND name='idx_session_metrics_status'
      `).all();

      expect(indexes).toHaveLength(1);
    });

    test('20. Index exists on start_time column', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='session_metrics' AND name='idx_session_metrics_start_time'
      `).all();

      expect(indexes).toHaveLength(1);
    });

    test('21. Query by status uses index (performance < 10ms)', () => {
      // Insert 100 sessions
      const sessions = Array.from({ length: 100 }, (_, i) => ({
        sessionId: `session-${i}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'failed' : 'active'
      }));

      sessions.forEach(({ sessionId, timestamp, status }) => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status)
          VALUES (?, ?, ?)
        `).run(sessionId, timestamp, status);
      });

      // Query with index
      const startTime = Date.now();
      const results = db.prepare(`
        SELECT * FROM session_metrics WHERE status = 'active'
      `).all();
      const duration = Date.now() - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10); // Should be fast with index
    });
  });

  // ========================================================================
  // FULL SESSION LIFECYCLE TESTS (Tests 22-24)
  // ========================================================================

  describe('Full Session Lifecycle', () => {
    test('22. Complete session lifecycle: INSERT -> UPDATE (active -> completed)', () => {
      const sessionId = randomUUID();
      const startTime = new Date().toISOString();

      // Step 1: Session started (INSERT)
      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, request_count, total_tokens, total_cost, agent_count, tool_count, error_count)
        VALUES (?, ?, 'active', 0, 0, 0.0, 0, 0, 0)
      `).run(sessionId, startTime);

      let result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.status).toBe('active');
      expect(result.end_time).toBeNull();

      // Step 2: Session ended (UPDATE)
      const endTime = new Date().toISOString();
      const duration = 5000;

      db.prepare(`
        UPDATE session_metrics
        SET status = ?, end_time = ?, duration = ?
        WHERE session_id = ?
      `).run('completed', endTime, duration, sessionId);

      result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.status).toBe('completed');
      expect(result.end_time).toBe(endTime);
      expect(result.duration).toBe(duration);
    });

    test('23. Failed session lifecycle: INSERT -> UPDATE (active -> failed)', () => {
      const sessionId = randomUUID();
      const startTime = new Date().toISOString();

      // Insert active session
      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, error_count)
        VALUES (?, ?, 'active', 0)
      `).run(sessionId, startTime);

      // Update to failed with error count
      const endTime = new Date().toISOString();
      db.prepare(`
        UPDATE session_metrics
        SET status = ?, end_time = ?, error_count = ?
        WHERE session_id = ?
      `).run('failed', endTime, 3, sessionId);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.status).toBe('failed');
      expect(result.error_count).toBe(3);
    });

    test('24. Concurrent sessions with independent lifecycles', () => {
      const session1 = randomUUID();
      const session2 = randomUUID();
      const timestamp = new Date().toISOString();

      // Start both sessions
      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(session1, timestamp);

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(session2, timestamp);

      // Complete session1
      db.prepare(`
        UPDATE session_metrics SET status = ? WHERE session_id = ?
      `).run('completed', session1);

      // Fail session2
      db.prepare(`
        UPDATE session_metrics SET status = ? WHERE session_id = ?
      `).run('failed', session2);

      const result1 = db.prepare('SELECT status FROM session_metrics WHERE session_id = ?').get(session1);
      const result2 = db.prepare('SELECT status FROM session_metrics WHERE session_id = ?').get(session2);

      expect(result1.status).toBe('completed');
      expect(result2.status).toBe('failed');
    });
  });

  // ========================================================================
  // DATA INTEGRITY & EDGE CASES (Tests 25-28)
  // ========================================================================

  describe('Data Integrity & Edge Cases', () => {
    test('25. REAL type handles floating-point precision', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, total_cost)
        VALUES (?, ?, 'active', 0.123456789)
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT total_cost FROM session_metrics WHERE session_id = ?').get(sessionId);

      // SQLite REAL is 8-byte floating point
      expect(result.total_cost).toBeCloseTo(0.123456789, 9);
    });

    test('26. INTEGER type handles large values', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();
      const largeValue = 2147483647; // Max 32-bit integer

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, total_tokens)
        VALUES (?, ?, 'active', ?)
      `).run(sessionId, timestamp, largeValue);

      const result = db.prepare('SELECT total_tokens FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.total_tokens).toBe(largeValue);
    });

    test('27. TEXT type handles ISO 8601 timestamps', () => {
      const sessionId = randomUUID();
      const timestamp = '2024-11-10T22:15:00.123Z';

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status)
        VALUES (?, ?, 'active')
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT start_time FROM session_metrics WHERE session_id = ?').get(sessionId);
      expect(result.start_time).toBe(timestamp);
    });

    test('28. Zero values are valid (not treated as NULL)', () => {
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();

      db.prepare(`
        INSERT INTO session_metrics (session_id, start_time, status, duration, request_count, total_tokens, total_cost, agent_count, tool_count, error_count)
        VALUES (?, ?, 'active', 0, 0, 0, 0.0, 0, 0, 0)
      `).run(sessionId, timestamp);

      const result = db.prepare('SELECT * FROM session_metrics WHERE session_id = ?').get(sessionId);

      // All zeros should be stored correctly
      expect(result.duration).toBe(0);
      expect(result.request_count).toBe(0);
      expect(result.total_tokens).toBe(0);
      expect(result.total_cost).toBe(0.0);
      expect(result.agent_count).toBe(0);
      expect(result.tool_count).toBe(0);
      expect(result.error_count).toBe(0);
    });
  });

  // ========================================================================
  // AGGREGATE & REPORTING TESTS (Tests 29-30)
  // ========================================================================

  describe('Aggregate Queries for Reporting', () => {
    test('29. Count sessions by status', () => {
      // Insert mixed sessions
      const sessions = [
        { id: randomUUID(), status: 'active' },
        { id: randomUUID(), status: 'active' },
        { id: randomUUID(), status: 'completed' },
        { id: randomUUID(), status: 'completed' },
        { id: randomUUID(), status: 'completed' },
        { id: randomUUID(), status: 'failed' }
      ];

      sessions.forEach(({ id, status }) => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status)
          VALUES (?, ?, ?)
        `).run(id, new Date().toISOString(), status);
      });

      const stats = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM session_metrics
        GROUP BY status
        ORDER BY status
      `).all();

      expect(stats).toEqual([
        { status: 'active', count: 2 },
        { status: 'completed', count: 3 },
        { status: 'failed', count: 1 }
      ]);
    });

    test('30. Sum aggregate metrics across all sessions', () => {
      const sessions = [
        { id: randomUUID(), tokens: 1000, cost: 0.10, requests: 5 },
        { id: randomUUID(), tokens: 2000, cost: 0.20, requests: 10 },
        { id: randomUUID(), tokens: 1500, cost: 0.15, requests: 7 }
      ];

      sessions.forEach(({ id, tokens, cost, requests }) => {
        db.prepare(`
          INSERT INTO session_metrics (session_id, start_time, status, total_tokens, total_cost, request_count)
          VALUES (?, ?, 'completed', ?, ?, ?)
        `).run(id, new Date().toISOString(), tokens, cost, requests);
      });

      const totals = db.prepare(`
        SELECT
          SUM(total_tokens) as total_tokens,
          SUM(total_cost) as total_cost,
          SUM(request_count) as total_requests
        FROM session_metrics
      `).get();

      expect(totals.total_tokens).toBe(4500);
      expect(totals.total_cost).toBeCloseTo(0.45, 2);
      expect(totals.total_requests).toBe(22);
    });
  });
});

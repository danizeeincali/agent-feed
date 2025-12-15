/**
 * Token Analytics Database Queries Integration Tests
 * Tests database connection, schema, and SQL query integrity
 *
 * Test Coverage:
 * - Database connection
 * - Table existence and schema
 * - Sample queries return expected results
 * - SQL injection protection
 * - Transaction handling
 * - Data integrity
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_DB_PATH = join(__dirname, '../../database.db');

let db;

describe('Token Analytics Database - Connection & Schema', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should connect to database successfully', () => {
    expect(db).toBeDefined();
    expect(db.open).toBe(true);
  });

  it('should have token_analytics table', () => {
    const result = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='token_analytics'
    `).get();

    expect(result).toBeDefined();
    expect(result.name).toBe('token_analytics');
  });

  it('should have correct schema columns', () => {
    const columns = db.prepare(`PRAGMA table_info(token_analytics)`).all();

    const columnNames = columns.map(col => col.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('timestamp');
    expect(columnNames).toContain('sessionId');
    expect(columnNames).toContain('operation');
    expect(columnNames).toContain('inputTokens');
    expect(columnNames).toContain('outputTokens');
    expect(columnNames).toContain('totalTokens');
    expect(columnNames).toContain('estimatedCost');
    expect(columnNames).toContain('model');
    expect(columnNames).toContain('userId');
    expect(columnNames).toContain('created_at');
  });

  it('should have primary key on id column', () => {
    const columns = db.prepare(`PRAGMA table_info(token_analytics)`).all();
    const idColumn = columns.find(col => col.name === 'id');

    expect(idColumn).toBeDefined();
    expect(idColumn.pk).toBe(1); // 1 indicates primary key
  });

  it('should have indexes for performance', () => {
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='index' AND tbl_name='token_analytics'
    `).all();

    const indexNames = indexes.map(idx => idx.name);

    // Check for expected indexes
    expect(indexNames).toContain('idx_analytics_session');
    expect(indexNames).toContain('idx_analytics_timestamp');
  });

  it('should have NOT NULL constraints on critical columns', () => {
    const columns = db.prepare(`PRAGMA table_info(token_analytics)`).all();

    const notNullColumns = ['timestamp', 'sessionId', 'operation', 'inputTokens', 'outputTokens', 'totalTokens', 'estimatedCost', 'model'];

    notNullColumns.forEach(colName => {
      const column = columns.find(col => col.name === colName);
      expect(column).toBeDefined();
      expect(column.notnull).toBe(1); // 1 indicates NOT NULL
    });
  });
});

describe('Token Analytics Database - Basic Queries', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should count total records', () => {
    const result = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
    expect(result).toBeDefined();
    expect(result.count).toBeGreaterThanOrEqual(0);
    expect(typeof result.count).toBe('number');
  });

  it('should calculate total tokens', () => {
    const result = db.prepare('SELECT SUM(totalTokens) as total FROM token_analytics').get();
    expect(result).toBeDefined();
    expect(typeof result.total).toBe('number');
  });

  it('should calculate total cost', () => {
    const result = db.prepare('SELECT SUM(estimatedCost) as total FROM token_analytics').get();
    expect(result).toBeDefined();
    expect(typeof result.total).toBe('number');
  });

  it('should get unique session count', () => {
    const result = db.prepare('SELECT COUNT(DISTINCT sessionId) as count FROM token_analytics').get();
    expect(result).toBeDefined();
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('should get unique model count', () => {
    const result = db.prepare('SELECT COUNT(DISTINCT model) as count FROM token_analytics').get();
    expect(result).toBeDefined();
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it('should retrieve records ordered by timestamp', () => {
    const results = db.prepare(`
      SELECT * FROM token_analytics
      ORDER BY timestamp DESC
      LIMIT 5
    `).all();

    expect(Array.isArray(results)).toBe(true);

    if (results.length > 1) {
      for (let i = 0; i < results.length - 1; i++) {
        const current = new Date(results[i].timestamp);
        const next = new Date(results[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    }
  });

  it('should filter by sessionId', () => {
    // Get a session ID from database
    const firstRecord = db.prepare('SELECT sessionId FROM token_analytics LIMIT 1').get();

    if (firstRecord) {
      const results = db.prepare(`
        SELECT * FROM token_analytics
        WHERE sessionId = ?
      `).all(firstRecord.sessionId);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(record => {
        expect(record.sessionId).toBe(firstRecord.sessionId);
      });
    }
  });

  it('should filter by model', () => {
    const firstRecord = db.prepare('SELECT model FROM token_analytics LIMIT 1').get();

    if (firstRecord) {
      const results = db.prepare(`
        SELECT * FROM token_analytics
        WHERE model = ?
      `).all(firstRecord.model);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(record => {
        expect(record.model).toBe(firstRecord.model);
      });
    }
  });
});

describe('Token Analytics Database - Aggregation Queries', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should group by hour correctly', () => {
    const results = db.prepare(`
      SELECT
        strftime('%H:00', timestamp) as hour,
        COUNT(*) as count,
        SUM(totalTokens) as total_tokens
      FROM token_analytics
      WHERE datetime(timestamp) >= datetime('now', '-24 hours')
      GROUP BY strftime('%H:00', timestamp)
      ORDER BY hour
    `).all();

    expect(Array.isArray(results)).toBe(true);

    results.forEach(row => {
      expect(row.hour).toMatch(/^\d{2}:00$/);
      expect(typeof row.count).toBe('number');
      expect(typeof row.total_tokens).toBe('number');
      expect(row.count).toBeGreaterThan(0);
    });
  });

  it('should group by date correctly', () => {
    const results = db.prepare(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count,
        SUM(totalTokens) as total_tokens
      FROM token_analytics
      WHERE DATE(timestamp) >= DATE('now', '-30 days')
      GROUP BY DATE(timestamp)
      ORDER BY date
    `).all();

    expect(Array.isArray(results)).toBe(true);

    results.forEach(row => {
      expect(row.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof row.count).toBe('number');
      expect(typeof row.total_tokens).toBe('number');
      expect(row.count).toBeGreaterThan(0);
    });
  });

  it('should group by model correctly', () => {
    const results = db.prepare(`
      SELECT
        model,
        COUNT(*) as count,
        SUM(totalTokens) as total_tokens,
        SUM(estimatedCost) as total_cost
      FROM token_analytics
      GROUP BY model
      ORDER BY count DESC
    `).all();

    expect(Array.isArray(results)).toBe(true);

    results.forEach(row => {
      expect(typeof row.model).toBe('string');
      expect(row.model.length).toBeGreaterThan(0);
      expect(typeof row.count).toBe('number');
      expect(typeof row.total_tokens).toBe('number');
      expect(typeof row.total_cost).toBe('number');
      expect(row.count).toBeGreaterThan(0);
    });
  });

  it('should group by operation correctly', () => {
    const results = db.prepare(`
      SELECT
        operation,
        COUNT(*) as count,
        AVG(totalTokens) as avg_tokens
      FROM token_analytics
      GROUP BY operation
      ORDER BY count DESC
    `).all();

    expect(Array.isArray(results)).toBe(true);

    results.forEach(row => {
      expect(typeof row.operation).toBe('string');
      expect(typeof row.count).toBe('number');
      expect(typeof row.avg_tokens).toBe('number');
    });
  });
});

describe('Token Analytics Database - Date Range Filtering', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should filter by last 24 hours', () => {
    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE datetime(timestamp) >= datetime('now', '-24 hours')
    `).all();

    expect(Array.isArray(results)).toBe(true);

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    results.forEach(row => {
      const timestamp = new Date(row.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(twentyFourHoursAgo.getTime());
    });
  });

  it('should filter by last 7 days', () => {
    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE DATE(timestamp) >= DATE('now', '-7 days')
    `).all();

    expect(Array.isArray(results)).toBe(true);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    results.forEach(row => {
      const timestamp = new Date(row.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(sevenDaysAgo.getTime());
    });
  });

  it('should filter by last 30 days', () => {
    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE DATE(timestamp) >= DATE('now', '-30 days')
    `).all();

    expect(Array.isArray(results)).toBe(true);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    results.forEach(row => {
      const timestamp = new Date(row.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
    });
  });

  it('should filter by specific date range', () => {
    const startDate = '2025-09-20';
    const endDate = '2025-09-30';

    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE DATE(timestamp) BETWEEN ? AND ?
    `).all(startDate, endDate);

    expect(Array.isArray(results)).toBe(true);

    const start = new Date(startDate);
    const end = new Date(endDate);

    results.forEach(row => {
      const timestamp = new Date(row.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(start.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(end.getTime() + 24 * 60 * 60 * 1000);
    });
  });
});

describe('Token Analytics Database - SQL Injection Protection', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should safely handle malicious sessionId input', () => {
    const maliciousInput = "'; DROP TABLE token_analytics; --";

    // This should NOT drop the table
    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE sessionId = ?
    `).all(maliciousInput);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0); // No match for malicious input

    // Verify table still exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='token_analytics'
    `).get();

    expect(tableCheck).toBeDefined();
    expect(tableCheck.name).toBe('token_analytics');
  });

  it('should safely handle malicious model input', () => {
    const maliciousInput = "claude-3' OR '1'='1";

    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE model = ?
    `).all(maliciousInput);

    expect(Array.isArray(results)).toBe(true);
    // Should return no results (or only exact matches), not all records
    const allRecords = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
    expect(results.length).not.toBe(allRecords.count);
  });

  it('should safely handle UNION injection attempt', () => {
    const maliciousInput = "' UNION SELECT * FROM sqlite_master --";

    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE operation = ?
    `).all(maliciousInput);

    expect(Array.isArray(results)).toBe(true);
    // Should return no results, not schema information
    results.forEach(row => {
      expect(row).toHaveProperty('id');
      expect(row).toHaveProperty('sessionId');
      expect(row).toHaveProperty('model');
    });
  });

  it('should safely handle comment injection', () => {
    const maliciousInput = "test' --";

    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE userId = ?
    `).all(maliciousInput);

    expect(Array.isArray(results)).toBe(true);
    // Should treat the entire string as literal value
  });
});

describe('Token Analytics Database - Transaction Handling', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should execute transaction successfully', () => {
    const testId = crypto.randomUUID();
    const testSession = crypto.randomUUID();

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, inputTokens,
          outputTokens, totalTokens, estimatedCost, model, userId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testId,
        new Date().toISOString(),
        testSession,
        'test_operation',
        100,
        50,
        150,
        0.005,
        'test-model',
        'test-user'
      );
    });

    transaction();

    // Verify insertion
    const result = db.prepare('SELECT * FROM token_analytics WHERE id = ?').get(testId);
    expect(result).toBeDefined();
    expect(result.id).toBe(testId);
    expect(result.sessionId).toBe(testSession);

    // Cleanup
    db.prepare('DELETE FROM token_analytics WHERE id = ?').run(testId);
  });

  it('should rollback transaction on error', () => {
    const testId1 = crypto.randomUUID();
    const testId2 = testId1; // Duplicate ID will cause error

    const transaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, inputTokens,
          outputTokens, totalTokens, estimatedCost, model
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testId1,
        new Date().toISOString(),
        'session-1',
        'test',
        100, 50, 150, 0.005,
        'test-model'
      );

      // This should fail due to duplicate primary key
      db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, inputTokens,
          outputTokens, totalTokens, estimatedCost, model
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        testId2, // Same ID
        new Date().toISOString(),
        'session-2',
        'test',
        100, 50, 150, 0.005,
        'test-model'
      );
    });

    expect(() => transaction()).toThrow();

    // Verify rollback - first insert should not exist
    const result = db.prepare('SELECT * FROM token_analytics WHERE id = ?').get(testId1);
    expect(result).toBeUndefined();
  });
});

describe('Token Analytics Database - Data Integrity', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should not allow NULL in required columns', () => {
    const testId = crypto.randomUUID();

    expect(() => {
      db.prepare(`
        INSERT INTO token_analytics (id, timestamp, sessionId, operation)
        VALUES (?, ?, ?, ?)
      `).run(testId, new Date().toISOString(), 'session-1', 'test');
    }).toThrow(); // Should fail because inputTokens, outputTokens, etc. are NOT NULL
  });

  it('should ensure totalTokens = inputTokens + outputTokens', () => {
    const records = db.prepare('SELECT * FROM token_analytics').all();

    records.forEach(record => {
      expect(record.totalTokens).toBe(record.inputTokens + record.outputTokens);
    });
  });

  it('should have positive token counts', () => {
    const records = db.prepare('SELECT * FROM token_analytics').all();

    records.forEach(record => {
      expect(record.inputTokens).toBeGreaterThanOrEqual(0);
      expect(record.outputTokens).toBeGreaterThanOrEqual(0);
      expect(record.totalTokens).toBeGreaterThan(0);
    });
  });

  it('should have positive costs', () => {
    const records = db.prepare('SELECT * FROM token_analytics').all();

    records.forEach(record => {
      expect(record.estimatedCost).toBeGreaterThan(0);
    });
  });

  it('should have valid ISO timestamp format', () => {
    const records = db.prepare('SELECT timestamp FROM token_analytics LIMIT 10').all();

    records.forEach(record => {
      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      const date = new Date(record.timestamp);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  it('should have non-empty model names', () => {
    const records = db.prepare('SELECT model FROM token_analytics').all();

    records.forEach(record => {
      expect(record.model).toBeDefined();
      expect(typeof record.model).toBe('string');
      expect(record.model.length).toBeGreaterThan(0);
    });
  });
});

describe('Token Analytics Database - Performance', () => {
  beforeAll(() => {
    db = new Database(TEST_DB_PATH);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  it('should query with index on sessionId efficiently', () => {
    const start = Date.now();

    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE sessionId = ?
    `).all('session-0');

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should be fast with index
  });

  it('should query with index on timestamp efficiently', () => {
    const start = Date.now();

    const results = db.prepare(`
      SELECT * FROM token_analytics
      WHERE datetime(timestamp) >= datetime('now', '-24 hours')
      ORDER BY timestamp DESC
      LIMIT 100
    `).all();

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should be fast with index
  });

  it('should perform aggregation queries efficiently', () => {
    const start = Date.now();

    const result = db.prepare(`
      SELECT
        COUNT(*) as total_requests,
        SUM(totalTokens) as total_tokens,
        SUM(estimatedCost) as total_cost
      FROM token_analytics
    `).get();

    const duration = Date.now() - start;

    expect(result).toBeDefined();
    expect(duration).toBeLessThan(100);
  });
});

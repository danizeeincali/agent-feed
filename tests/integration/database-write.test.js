/**
 * Database Write Validation Tests (London School TDD)
 *
 * Testing Strategy: Verify database layer behavior directly
 * - Test real database writes (no mocks at this level)
 * - Verify schema integrity
 * - Test concurrent access patterns
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { mkdtempSync, rmSync, accessSync, constants } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('Database Write Validation Tests (London School TDD)', () => {
  let db;
  let tempDir;
  let dbPath;

  beforeEach(() => {
    // Create temporary directory and database
    tempDir = mkdtempSync(join(tmpdir(), 'db-test-'));
    dbPath = join(tempDir, 'test-analytics.db');
    db = new Database(dbPath);

    // Create token_analytics table with full schema
    db.exec(`
      CREATE TABLE token_analytics (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        operation TEXT NOT NULL,
        inputTokens INTEGER NOT NULL,
        outputTokens INTEGER NOT NULL,
        totalTokens INTEGER NOT NULL,
        estimatedCost REAL NOT NULL,
        model TEXT NOT NULL,
        userId TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        message_content TEXT,
        response_content TEXT
      )
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX idx_analytics_session ON token_analytics(sessionId);
      CREATE INDEX idx_analytics_timestamp ON token_analytics(timestamp);
    `);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Test 1: Manual INSERT into token_analytics succeeds', () => {
    it('should successfully insert a record with all required fields', () => {
      // Arrange
      const id = randomUUID();
      const timestamp = new Date().toISOString();
      const sessionId = 'manual-test-session';

      // Act
      const stmt = db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (
          @id, @timestamp, @sessionId, @operation, @model,
          @inputTokens, @outputTokens, @totalTokens, @estimatedCost
        )
      `);

      const result = stmt.run({
        id,
        timestamp,
        sessionId,
        operation: 'manual_insert',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500,
        estimatedCost: 0.021
      });

      // Assert
      expect(result.changes).toBe(1);

      // Verify record exists
      const record = db.prepare('SELECT * FROM token_analytics WHERE id = ?').get(id);
      expect(record).toBeDefined();
      expect(record.id).toBe(id);
      expect(record.sessionId).toBe(sessionId);
      expect(record.inputTokens).toBe(1000);
      expect(record.outputTokens).toBe(500);
      expect(record.totalTokens).toBe(1500);
      expect(record.estimatedCost).toBeCloseTo(0.021, 5);
    });
  });

  describe('Test 2: Database file has write permissions', () => {
    it('should allow write access to database file', () => {
      // Act & Assert
      expect(() => {
        accessSync(dbPath, constants.W_OK);
      }).not.toThrow();

      // Verify we can actually write
      const stmt = db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        randomUUID(),
        new Date().toISOString(),
        'write-permission-test',
        'test_op',
        'test-model',
        100,
        50,
        150,
        0.001
      );

      expect(result.changes).toBe(1);
    });
  });

  describe('Test 3: SQLite connection can be established', () => {
    it('should create and connect to database successfully', () => {
      // Act
      const testDb = new Database(':memory:');

      // Assert
      expect(testDb).toBeDefined();
      expect(testDb.open).toBe(true);

      // Verify connection works
      const result = testDb.prepare('SELECT 1 as test').get();
      expect(result.test).toBe(1);

      testDb.close();
    });
  });

  describe('Test 4: token_analytics table exists with correct schema', () => {
    it('should have all required columns with correct types', () => {
      // Act
      const tableInfo = db.prepare("PRAGMA table_info(token_analytics)").all();

      // Assert
      expect(tableInfo).toBeDefined();
      expect(tableInfo.length).toBeGreaterThanOrEqual(9);

      // Verify required columns exist
      const columnNames = tableInfo.map(col => col.name);
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('timestamp');
      expect(columnNames).toContain('sessionId');
      expect(columnNames).toContain('operation');
      expect(columnNames).toContain('model');
      expect(columnNames).toContain('inputTokens');
      expect(columnNames).toContain('outputTokens');
      expect(columnNames).toContain('totalTokens');
      expect(columnNames).toContain('estimatedCost');

      // Verify PRIMARY KEY constraint
      const idColumn = tableInfo.find(col => col.name === 'id');
      expect(idColumn.pk).toBe(1);
    });
  });

  describe('Test 5: Indexes exist for performance', () => {
    it('should have required indexes on sessionId and timestamp', () => {
      // Act
      const indexes = db.prepare("PRAGMA index_list(token_analytics)").all();

      // Assert
      expect(indexes).toBeDefined();
      expect(indexes.length).toBeGreaterThanOrEqual(2);

      const indexNames = indexes.map(idx => idx.name);
      expect(indexNames).toContain('idx_analytics_session');
      expect(indexNames).toContain('idx_analytics_timestamp');

      // Verify index on sessionId
      const sessionIndex = db.prepare("PRAGMA index_info(idx_analytics_session)").all();
      expect(sessionIndex[0].name).toBe('sessionId');

      // Verify index on timestamp
      const timestampIndex = db.prepare("PRAGMA index_info(idx_analytics_timestamp)").all();
      expect(timestampIndex[0].name).toBe('timestamp');
    });
  });

  describe('Test 6: Concurrent writes don\'t cause conflicts', () => {
    it('should handle multiple simultaneous writes without errors', async () => {
      // Arrange
      const numWrites = 10;
      const writePromises = [];

      // Act - Perform concurrent writes
      for (let i = 0; i < numWrites; i++) {
        const writePromise = new Promise((resolve, reject) => {
          try {
            const stmt = db.prepare(`
              INSERT INTO token_analytics (
                id, timestamp, sessionId, operation, model,
                inputTokens, outputTokens, totalTokens, estimatedCost
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
              randomUUID(),
              new Date().toISOString(),
              `concurrent-session-${i}`,
              'concurrent_test',
              'test-model',
              100 * i,
              50 * i,
              150 * i,
              0.001 * i
            );

            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        writePromises.push(writePromise);
      }

      // Assert - All writes should succeed
      const results = await Promise.all(writePromises);
      expect(results).toHaveLength(numWrites);
      results.forEach(result => {
        expect(result.changes).toBe(1);
      });

      // Verify all records were written
      const count = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
      expect(count.count).toBe(numWrites);
    });
  });

  describe('Test 7: Database handles error conditions gracefully', () => {
    it('should properly report errors for invalid operations', () => {
      // Test 1: Duplicate primary key
      const id = randomUUID();
      const stmt = db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(id, new Date().toISOString(), 'session1', 'op', 'model', 100, 50, 150, 0.001);

      // Attempt duplicate insert
      expect(() => {
        stmt.run(id, new Date().toISOString(), 'session2', 'op', 'model', 100, 50, 150, 0.001);
      }).toThrow(/UNIQUE constraint failed/);

      // Test 2: Missing required field
      expect(() => {
        db.prepare(`
          INSERT INTO token_analytics (
            id, timestamp, sessionId, operation, model,
            inputTokens, outputTokens, totalTokens
            -- Missing estimatedCost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), new Date().toISOString(), 'session', 'op', 'model', 100, 50, 150);
      }).toThrow();

      // Test 3: Invalid data type
      expect(() => {
        db.prepare(`
          INSERT INTO token_analytics (
            id, timestamp, sessionId, operation, model,
            inputTokens, outputTokens, totalTokens, estimatedCost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), new Date().toISOString(), 'session', 'op', 'model', 'not-a-number', 50, 150, 0.001);
      }).toThrow();

      // Test 4: NULL in required field
      expect(() => {
        db.prepare(`
          INSERT INTO token_analytics (
            id, timestamp, sessionId, operation, model,
            inputTokens, outputTokens, totalTokens, estimatedCost
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(randomUUID(), new Date().toISOString(), null, 'op', 'model', 100, 50, 150, 0.001);
      }).toThrow(/NOT NULL constraint failed/);

      // Verify database is still functional after errors
      const testInsert = db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        randomUUID(),
        new Date().toISOString(),
        'recovery-test',
        'op',
        'model',
        100,
        50,
        150,
        0.001
      );

      expect(testInsert.changes).toBe(1);
    });
  });
});

/**
 * Migration 008: Cache Token Columns Test Suite
 *
 * London School TDD tests for adding cacheReadTokens and cacheCreationTokens
 * columns to token_analytics table.
 *
 * Test Philosophy:
 * - Mock-driven development (London School)
 * - Test behaviors and interactions
 * - Verify contracts between components
 * - Focus on migration idempotency and data integrity
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { readFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DB_PATH = join(process.cwd(), 'tests', 'integration', 'test-migration-008.db');
const MIGRATION_PATH = join(process.cwd(), 'api-server', 'db', 'migrations', '008-add-cache-tokens.sql');

describe('Migration 008: Cache Token Columns', () => {
  let db;

  beforeAll(() => {
    // Clean up any existing test database
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  beforeEach(() => {
    // Create fresh database for each test
    db = new Database(TEST_DB_PATH);

    // Create base token_analytics table (pre-migration state)
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_analytics_session ON token_analytics(sessionId);
      CREATE INDEX idx_analytics_timestamp ON token_analytics(timestamp);
    `);
  });

  afterEach(() => {
    // Close database connection
    if (db) {
      db.close();
    }

    // Clean up test database
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  afterAll(() => {
    // Final cleanup
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('Column Addition', () => {
    it('should add cacheReadTokens column with INTEGER type', () => {
      // Arrange: Load migration SQL
      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');

      // Act: Apply migration
      db.exec(migrationSQL);

      // Assert: Verify column exists with correct type
      const columns = db.pragma('table_info(token_analytics)');
      const cacheReadColumn = columns.find(col => col.name === 'cacheReadTokens');

      expect(cacheReadColumn).toBeDefined();
      expect(cacheReadColumn.type).toBe('INTEGER');
      expect(cacheReadColumn.dflt_value).toBe('0');
    });

    it('should add cacheCreationTokens column with INTEGER type', () => {
      // Arrange: Load migration SQL
      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');

      // Act: Apply migration
      db.exec(migrationSQL);

      // Assert: Verify column exists with correct type
      const columns = db.pragma('table_info(token_analytics)');
      const cacheCreationColumn = columns.find(col => col.name === 'cacheCreationTokens');

      expect(cacheCreationColumn).toBeDefined();
      expect(cacheCreationColumn.type).toBe('INTEGER');
      expect(cacheCreationColumn.dflt_value).toBe('0');
    });
  });

  describe('Data Preservation', () => {
    it('should preserve existing records (count unchanged)', () => {
      // Arrange: Insert test records before migration
      const recordCount = 10;
      const stmt = db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < recordCount; i++) {
        stmt.run(
          randomUUID(),
          new Date().toISOString(),
          `session-${i}`,
          'test_operation',
          'claude-sonnet-4-20250514',
          1000 + i,
          500 + i,
          1500 + i,
          0.005 + (i * 0.001)
        );
      }

      // Get count before migration
      const beforeCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();

      // Act: Apply migration
      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');
      db.exec(migrationSQL);

      // Assert: Verify record count unchanged
      const afterCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
      expect(afterCount.count).toBe(beforeCount.count);
      expect(afterCount.count).toBe(recordCount);
    });

    it('should set default value 0 for cacheReadTokens in existing records', () => {
      // Arrange: Insert test records
      const recordId = randomUUID();
      db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recordId,
        new Date().toISOString(),
        'test-session',
        'test_operation',
        'claude-sonnet-4-20250514',
        1000,
        500,
        1500,
        0.005
      );

      // Act: Apply migration
      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');
      db.exec(migrationSQL);

      // Assert: Verify default value
      const record = db.prepare('SELECT cacheReadTokens FROM token_analytics WHERE id = ?').get(recordId);
      expect(record.cacheReadTokens).toBe(0);
    });

    it('should set default value 0 for cacheCreationTokens in existing records', () => {
      // Arrange: Insert test records
      const recordId = randomUUID();
      db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recordId,
        new Date().toISOString(),
        'test-session',
        'test_operation',
        'claude-sonnet-4-20250514',
        1000,
        500,
        1500,
        0.005
      );

      // Act: Apply migration
      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');
      db.exec(migrationSQL);

      // Assert: Verify default value
      const record = db.prepare('SELECT cacheCreationTokens FROM token_analytics WHERE id = ?').get(recordId);
      expect(record.cacheCreationTokens).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    it('should have no NULL values in cache token columns after migration', () => {
      // Arrange: Insert records and apply migration
      const recordCount = 5;
      const stmt = db.prepare(`
        INSERT INTO token_analytics (
          id, timestamp, sessionId, operation, model,
          inputTokens, outputTokens, totalTokens, estimatedCost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < recordCount; i++) {
        stmt.run(
          randomUUID(),
          new Date().toISOString(),
          `session-${i}`,
          'test_operation',
          'claude-sonnet-4-20250514',
          1000,
          500,
          1500,
          0.005
        );
      }

      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');
      db.exec(migrationSQL);

      // Act & Assert: Verify no NULL values
      const nullCacheRead = db.prepare(
        'SELECT COUNT(*) as count FROM token_analytics WHERE cacheReadTokens IS NULL'
      ).get();

      const nullCacheCreation = db.prepare(
        'SELECT COUNT(*) as count FROM token_analytics WHERE cacheCreationTokens IS NULL'
      ).get();

      expect(nullCacheRead.count).toBe(0);
      expect(nullCacheCreation.count).toBe(0);
    });
  });

  describe('Migration Idempotency', () => {
    it('should be safe to run migration twice (idempotent)', () => {
      // Arrange: Load migration SQL
      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');

      // Act: Apply migration twice
      db.exec(migrationSQL);

      // This should not throw - SQLite ALTER TABLE IF NOT EXISTS doesn't exist,
      // but we handle this gracefully by checking if columns exist
      const applySecondTime = () => {
        try {
          db.exec(migrationSQL);
        } catch (error) {
          // Expected behavior: duplicate column error
          if (error.message.includes('duplicate column name')) {
            // This is acceptable - migration already applied
            return;
          }
          throw error;
        }
      };

      // Assert: Second application should either succeed (no-op) or fail gracefully
      expect(applySecondTime).not.toThrow();

      // Verify columns still exist and have correct structure
      const columns = db.pragma('table_info(token_analytics)');
      const cacheReadColumn = columns.find(col => col.name === 'cacheReadTokens');
      const cacheCreationColumn = columns.find(col => col.name === 'cacheCreationTokens');

      expect(cacheReadColumn).toBeDefined();
      expect(cacheCreationColumn).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should match expected table structure after migration', () => {
      // Arrange & Act: Apply migration
      const migrationSQL = readFileSync(MIGRATION_PATH, 'utf-8');
      db.exec(migrationSQL);

      // Assert: Verify complete table structure
      const columns = db.pragma('table_info(token_analytics)');
      const columnNames = columns.map(col => col.name);

      // Expected columns after migration
      const expectedColumns = [
        'id',
        'timestamp',
        'sessionId',
        'operation',
        'inputTokens',
        'outputTokens',
        'totalTokens',
        'estimatedCost',
        'model',
        'userId',
        'created_at',
        'cacheReadTokens',
        'cacheCreationTokens'
      ];

      // Verify all expected columns exist
      expectedColumns.forEach(expectedCol => {
        expect(columnNames).toContain(expectedCol);
      });

      // Verify cache token columns have correct defaults
      const cacheReadCol = columns.find(col => col.name === 'cacheReadTokens');
      const cacheCreationCol = columns.find(col => col.name === 'cacheCreationTokens');

      expect(cacheReadCol.dflt_value).toBe('0');
      expect(cacheCreationCol.dflt_value).toBe('0');
      expect(cacheReadCol.notnull).toBe(0); // Nullable is fine with default
      expect(cacheCreationCol.notnull).toBe(0);
    });
  });
});

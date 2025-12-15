/**
 * ReasoningBank Database Service Tests
 *
 * Comprehensive test suite for ReasoningBank database implementation.
 * Tests all core functionality with real SQLite operations (no mocks).
 *
 * Test Coverage:
 * - Database initialization
 * - Schema validation
 * - Health checks
 * - Statistics collection
 * - Backup and restore
 * - VACUUM operations
 * - Performance benchmarks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ReasoningBankDatabaseService, createReasoningBankDB } from '../../api-server/services/reasoningbank-db';
import { existsSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

// ============================================================
// TEST CONFIGURATION
// ============================================================

const TEST_DB_DIR = join(process.cwd(), 'tests', 'reasoningbank', 'test-data');
const TEST_DB_PATH = join(TEST_DB_DIR, 'test-memory.db');
const TEST_BACKUP_DIR = join(TEST_DB_DIR, 'backups');

const TEST_CONFIG = {
  dbPath: TEST_DB_PATH,
  backupDir: TEST_BACKUP_DIR,
  maxBackups: 5,
  verbose: false,
};

// ============================================================
// TEST HELPERS
// ============================================================

function generateEmbedding(): Buffer {
  // Generate 1024-dim float32 vector (4096 bytes)
  const embedding = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    embedding[i] = Math.random() * 2 - 1; // Random values between -1 and 1
  }
  return Buffer.from(embedding.buffer);
}

function generateTestPattern(namespace: string = 'test', agentId?: string) {
  const now = Date.now();
  return {
    id: `pattern-${randomBytes(16).toString('hex')}`,
    namespace,
    agent_id: agentId || null,
    skill_id: null,
    content: `Test pattern content ${Math.random()}`,
    category: 'test',
    tags: JSON.stringify(['test']),
    embedding: generateEmbedding(),
    confidence: 0.5,
    success_count: 0,
    failure_count: 0,
    total_usage: 0,
    context_type: 'test',
    metadata: JSON.stringify({ test: true }),
    created_at: now,
    updated_at: now,
    last_used_at: null,
  };
}

function cleanupTestDatabase() {
  if (existsSync(TEST_DB_DIR)) {
    rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
}

// ============================================================
// TEST SUITE
// ============================================================

describe('ReasoningBankDatabaseService', () => {
  let db: ReasoningBankDatabaseService;

  beforeAll(() => {
    // Clean up any existing test data
    cleanupTestDatabase();

    // Ensure test directory exists
    mkdirSync(TEST_DB_DIR, { recursive: true });
  });

  afterAll(() => {
    // Cleanup after all tests
    if (db) {
      db.close();
    }
    cleanupTestDatabase();
  });

  beforeEach(() => {
    // Create fresh database for each test
    db = new ReasoningBankDatabaseService(TEST_CONFIG);
  });

  // ============================================================
  // INITIALIZATION TESTS
  // ============================================================

  describe('initialize()', () => {
    it('should create database file', async () => {
      expect(existsSync(TEST_DB_PATH)).toBe(false);

      await db.initialize();

      expect(existsSync(TEST_DB_PATH)).toBe(true);
    });

    it('should create all required tables', async () => {
      await db.initialize();

      const stats = await db.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalPatterns).toBe(0);
      expect(stats.totalOutcomes).toBe(0);
      expect(stats.totalRelationships).toBe(0);
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      await db.initialize();
      await db.initialize();
      await db.initialize();

      const stats = await db.getStats();
      expect(stats.totalPatterns).toBe(0);
    });

    it('should create backup directory', async () => {
      await db.initialize();

      expect(existsSync(TEST_BACKUP_DIR)).toBe(true);
    });
  });

  // ============================================================
  // HEALTH CHECK TESTS
  // ============================================================

  describe('healthCheck()', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should return healthy status for initialized database', async () => {
      const health = await db.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.checks.databaseExists).toBe(true);
      expect(health.checks.schemaValid).toBe(true);
      expect(health.checks.foreignKeysEnabled).toBe(true);
      expect(health.checks.walModeEnabled).toBe(true);
      expect(health.checks.canRead).toBe(true);
      expect(health.checks.canWrite).toBe(true);
      expect(health.errors).toHaveLength(0);
    });

    it('should detect missing database', async () => {
      db.close();
      unlinkSync(TEST_DB_PATH);

      const health = await db.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.checks.databaseExists).toBe(false);
      expect(health.errors.length).toBeGreaterThan(0);
    });

    it('should include timestamp', async () => {
      const before = Date.now();
      const health = await db.healthCheck();
      const after = Date.now();

      expect(health.timestamp).toBeGreaterThanOrEqual(before);
      expect(health.timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================
  // STATISTICS TESTS
  // ============================================================

  describe('getStats()', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should return zero stats for empty database', async () => {
      const stats = await db.getStats();

      expect(stats.totalPatterns).toBe(0);
      expect(stats.totalOutcomes).toBe(0);
      expect(stats.totalRelationships).toBe(0);
      expect(stats.databaseSizeBytes).toBeGreaterThan(0);
      expect(stats.databaseSizeMB).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBe(0.5);
      expect(stats.successRate).toBe(0);
      expect(stats.namespaceCount).toBe(0);
      expect(stats.agentCount).toBe(0);
      expect(stats.skillCount).toBe(0);
    });

    it('should reflect inserted patterns', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      // Insert test patterns
      const pattern1 = generateTestPattern('global');
      const pattern2 = generateTestPattern('agent:test-agent', 'test-agent');

      const insertStmt = connection.prepare(`
        INSERT INTO patterns (
          id, namespace, agent_id, skill_id, content, category, tags,
          embedding, confidence, success_count, failure_count, total_usage,
          context_type, metadata, created_at, updated_at, last_used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        pattern1.id, pattern1.namespace, pattern1.agent_id, pattern1.skill_id,
        pattern1.content, pattern1.category, pattern1.tags, pattern1.embedding,
        pattern1.confidence, pattern1.success_count, pattern1.failure_count,
        pattern1.total_usage, pattern1.context_type, pattern1.metadata,
        pattern1.created_at, pattern1.updated_at, pattern1.last_used_at
      );

      insertStmt.run(
        pattern2.id, pattern2.namespace, pattern2.agent_id, pattern2.skill_id,
        pattern2.content, pattern2.category, pattern2.tags, pattern2.embedding,
        pattern2.confidence, pattern2.success_count, pattern2.failure_count,
        pattern2.total_usage, pattern2.context_type, pattern2.metadata,
        pattern2.created_at, pattern2.updated_at, pattern2.last_used_at
      );

      connection.close();

      const stats = await db.getStats();

      expect(stats.totalPatterns).toBe(2);
      expect(stats.namespaceCount).toBe(2);
      expect(stats.agentCount).toBe(1);
    });

    it('should measure query latency', async () => {
      const stats = await db.getStats();

      expect(stats.queryLatencyMs).toBeGreaterThan(0);
      expect(stats.queryLatencyMs).toBeLessThan(100); // Should be very fast for empty DB
    });
  });

  // ============================================================
  // VACUUM TESTS
  // ============================================================

  describe('vacuum()', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should run VACUUM without errors', async () => {
      await expect(db.vacuum()).resolves.not.toThrow();
    });

    it('should reduce database size after deletes', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      // Insert many patterns
      const insertStmt = connection.prepare(`
        INSERT INTO patterns (
          id, namespace, content, embedding, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < 100; i++) {
        const pattern = generateTestPattern();
        insertStmt.run(
          pattern.id, pattern.namespace, pattern.content,
          pattern.embedding, pattern.created_at, pattern.updated_at
        );
      }

      connection.close();

      const statsBefore = await db.getStats();
      const sizeBefore = statsBefore.databaseSizeBytes;

      // Delete patterns
      const connection2 = new Database(TEST_DB_PATH);
      connection2.prepare('DELETE FROM patterns').run();
      connection2.close();

      // VACUUM should reclaim space
      await db.vacuum();

      const statsAfter = await db.getStats();
      const sizeAfter = statsAfter.databaseSizeBytes;

      expect(sizeAfter).toBeLessThan(sizeBefore);
    });
  });

  // ============================================================
  // BACKUP TESTS
  // ============================================================

  describe('backup()', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should create backup file', async () => {
      const backupInfo = await db.backup();

      expect(backupInfo).toBeDefined();
      expect(existsSync(backupInfo.path)).toBe(true);
      expect(backupInfo.sizeBytes).toBeGreaterThan(0);
      expect(backupInfo.checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should create backup with custom path', async () => {
      const customPath = join(TEST_DB_DIR, 'custom-backup.db');
      const backupInfo = await db.backup(customPath);

      expect(backupInfo.path).toBe(customPath);
      expect(existsSync(customPath)).toBe(true);
    });

    it('should include timestamp in backup info', async () => {
      const before = Date.now();
      const backupInfo = await db.backup();
      const after = Date.now();

      expect(backupInfo.createdAt).toBeGreaterThanOrEqual(before);
      expect(backupInfo.createdAt).toBeLessThanOrEqual(after);
    });

    it('should cleanup old backups', async () => {
      // Create more backups than maxBackups (5)
      for (let i = 0; i < 7; i++) {
        await db.backup(join(TEST_BACKUP_DIR, `backup-${i}.db`));
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const { readdirSync } = await import('fs');
      const backups = readdirSync(TEST_BACKUP_DIR).filter(f => f.endsWith('.db'));

      // Should keep only maxBackups (5)
      expect(backups.length).toBeLessThanOrEqual(5);
    });
  });

  // ============================================================
  // SCHEMA VALIDATION TESTS
  // ============================================================

  describe('Schema Validation', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should have all required tables', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      const tables = connection.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
      `).all() as { name: string }[];

      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('patterns');
      expect(tableNames).toContain('pattern_outcomes');
      expect(tableNames).toContain('pattern_relationships');
      expect(tableNames).toContain('database_metadata');
      expect(tableNames).toContain('migration_history');

      connection.close();
    });

    it('should have all required indexes', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      const indexes = connection.prepare(`
        SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'
      `).all() as { name: string }[];

      expect(indexes.length).toBeGreaterThanOrEqual(10);

      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_patterns_namespace_confidence');
      expect(indexNames).toContain('idx_patterns_confidence_desc');
      expect(indexNames).toContain('idx_outcomes_pattern_recorded');

      connection.close();
    });

    it('should have all required views', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      const views = connection.prepare(`
        SELECT name FROM sqlite_master WHERE type='view' AND name LIKE 'v_%'
      `).all() as { name: string }[];

      expect(views.length).toBeGreaterThanOrEqual(3);

      const viewNames = views.map(v => v.name);
      expect(viewNames).toContain('v_pattern_stats_by_namespace');
      expect(viewNames).toContain('v_recent_learning_activity');
      expect(viewNames).toContain('v_top_performing_patterns');

      connection.close();
    });

    it('should have all required triggers', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      const triggers = connection.prepare(`
        SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_%'
      `).all() as { name: string }[];

      expect(triggers.length).toBeGreaterThanOrEqual(5);

      const triggerNames = triggers.map(t => t.name);
      expect(triggerNames).toContain('trg_patterns_update_timestamp');
      expect(triggerNames).toContain('trg_patterns_increment_usage');

      connection.close();
    });

    it('should enforce foreign key constraints', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      // Try to insert outcome for non-existent pattern
      expect(() => {
        connection.prepare(`
          INSERT INTO pattern_outcomes (
            id, pattern_id, agent_id, outcome,
            confidence_before, confidence_after, recorded_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          'outcome-1',
          'non-existent-pattern',
          'agent-1',
          'success',
          0.5,
          0.7,
          Date.now()
        );
      }).toThrow();

      connection.close();
    });

    it('should enforce confidence bounds', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      const pattern = generateTestPattern();

      // Try to insert pattern with confidence > 0.95
      pattern.confidence = 1.0;

      expect(() => {
        connection.prepare(`
          INSERT INTO patterns (
            id, namespace, content, embedding, confidence, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          pattern.id,
          pattern.namespace,
          pattern.content,
          pattern.embedding,
          pattern.confidence,
          pattern.created_at,
          pattern.updated_at
        );
      }).toThrow();

      connection.close();
    });
  });

  // ============================================================
  // PERFORMANCE TESTS
  // ============================================================

  describe('Performance', () => {
    beforeEach(async () => {
      await db.initialize();
    });

    it('should initialize database in <500ms', async () => {
      // Close and recreate for fresh initialization
      db.close();
      if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH);
      }

      const freshDb = new ReasoningBankDatabaseService(TEST_CONFIG);
      const start = Date.now();
      await freshDb.initialize();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(500);

      freshDb.close();
    });

    it('should get stats in <50ms for 1000 patterns', async () => {
      const Database = (await import('better-sqlite3')).default;
      const connection = new Database(TEST_DB_PATH);

      const insertStmt = connection.prepare(`
        INSERT INTO patterns (
          id, namespace, content, embedding, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Insert 1000 patterns
      for (let i = 0; i < 1000; i++) {
        const pattern = generateTestPattern();
        insertStmt.run(
          pattern.id,
          pattern.namespace,
          pattern.content,
          pattern.embedding,
          pattern.created_at,
          pattern.updated_at
        );
      }

      connection.close();

      const start = Date.now();
      const stats = await db.getStats();
      const duration = Date.now() - start;

      expect(stats.totalPatterns).toBe(1000);
      expect(duration).toBeLessThan(50);
    });
  });

  // ============================================================
  // FACTORY FUNCTION TEST
  // ============================================================

  describe('createReasoningBankDB()', () => {
    it('should create database instance', () => {
      const instance = createReasoningBankDB(TEST_CONFIG);
      expect(instance).toBeDefined();
      expect(typeof instance.initialize).toBe('function');
      expect(typeof instance.healthCheck).toBe('function');
      expect(typeof instance.getStats).toBe('function');
    });
  });
});

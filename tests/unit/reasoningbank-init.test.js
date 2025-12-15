/**
 * ReasoningBank Database Initialization Tests
 *
 * TDD approach: Tests created FIRST, then implementation
 *
 * Tests verify:
 * - Database directory creation
 * - Database file creation
 * - All tables created correctly
 * - WAL mode enabled
 * - Foreign keys enabled
 * - Health check passes
 * - Stats endpoint works
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { ReasoningBankDatabaseService } = require('../../api-server/services/reasoningbank-db');

describe('ReasoningBank Database Initialization', () => {
  const testDbPath = path.join(process.cwd(), 'prod', '.reasoningbank', 'memory.db');
  const testBackupDir = path.join(process.cwd(), 'prod', '.reasoningbank', 'backups');
  let service;

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testDbPath + '-wal')) {
      fs.unlinkSync(testDbPath + '-wal');
    }
    if (fs.existsSync(testDbPath + '-shm')) {
      fs.unlinkSync(testDbPath + '-shm');
    }
  });

  afterEach(() => {
    if (service) {
      service.close();
    }
  });

  test('UNIT-RB-001: Database directory created', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const dbDir = path.dirname(testDbPath);
    expect(fs.existsSync(dbDir)).toBe(true);
  });

  test('UNIT-RB-002: Database file created', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    expect(fs.existsSync(testDbPath)).toBe(true);

    // Verify it's a valid SQLite database
    const db = new Database(testDbPath);
    const result = db.prepare('SELECT 1 as test').get();
    expect(result.test).toBe(1);
    db.close();
  });

  test('UNIT-RB-003: Schema tables created', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const db = new Database(testDbPath);
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `).all().map(row => row.name);

    // Verify all required tables exist
    expect(tables).toContain('patterns');
    expect(tables).toContain('pattern_outcomes');
    expect(tables).toContain('pattern_relationships');
    expect(tables).toContain('database_metadata');

    db.close();
  });

  test('UNIT-RB-004: WAL mode enabled', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const db = new Database(testDbPath);
    const journalMode = db.pragma('journal_mode', { simple: true });
    expect(journalMode).toBe('wal');
    db.close();
  });

  test('UNIT-RB-005: Foreign keys enabled', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const db = new Database(testDbPath);
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    expect(foreignKeys).toBe(1);
    db.close();
  });

  test('UNIT-RB-006: Health check passes', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const health = await service.healthCheck();

    expect(health.healthy).toBe(true);
    expect(health.checks.databaseExists).toBe(true);
    expect(health.checks.schemaValid).toBe(true);
    expect(health.checks.foreignKeysEnabled).toBe(true);
    expect(health.checks.walModeEnabled).toBe(true);
    expect(health.checks.canRead).toBe(true);
    expect(health.checks.canWrite).toBe(true);
    expect(health.errors).toHaveLength(0);
  });

  test('UNIT-RB-007: Stats endpoint works', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const stats = await service.getStats();

    expect(stats.totalPatterns).toBe(0);
    expect(stats.totalOutcomes).toBe(0);
    expect(stats.totalRelationships).toBe(0);
    expect(stats.databaseSizeBytes).toBeGreaterThan(0);
    expect(stats.databaseSizeMB).toBeGreaterThan(0);
    expect(stats.avgConfidence).toBe(0.5);
    expect(stats.successRate).toBe(0);
    expect(stats.queryLatencyMs).toBeLessThan(100); // Should be very fast for empty DB
  });

  test('UNIT-RB-008: Backup directory created', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    expect(fs.existsSync(testBackupDir)).toBe(true);
  });

  test('UNIT-RB-009: Indexes created for performance', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const db = new Database(testDbPath);
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='index' AND name LIKE 'idx_%'
      ORDER BY name
    `).all().map(row => row.name);

    // Verify critical indexes exist
    expect(indexes.length).toBeGreaterThanOrEqual(10);
    expect(indexes).toContain('idx_patterns_namespace_confidence');
    expect(indexes).toContain('idx_patterns_confidence_desc');
    expect(indexes).toContain('idx_patterns_agent');
    expect(indexes).toContain('idx_patterns_skill');

    db.close();
  });

  test('UNIT-RB-010: Views created for analytics', async () => {
    service = new ReasoningBankDatabaseService();
    await service.initialize();

    const db = new Database(testDbPath);
    const views = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='view' AND name LIKE 'v_%'
      ORDER BY name
    `).all().map(row => row.name);

    // Verify critical views exist
    expect(views.length).toBeGreaterThanOrEqual(3);
    expect(views).toContain('v_pattern_stats_by_namespace');
    expect(views).toContain('v_recent_learning_activity');
    expect(views).toContain('v_top_performing_patterns');

    db.close();
  });

  test('UNIT-RB-011: Database is idempotent (safe to initialize multiple times)', async () => {
    service = new ReasoningBankDatabaseService();

    // Initialize once
    await service.initialize();
    const stats1 = await service.getStats();

    // Initialize again
    await service.initialize();
    const stats2 = await service.getStats();

    // Should not throw errors and stats should be same
    expect(stats1.totalPatterns).toBe(stats2.totalPatterns);
  });
});

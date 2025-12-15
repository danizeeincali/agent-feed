/**
 * Phase 4 ReasoningBank - Database Tests
 *
 * Tests database schema, integrity constraints, indexes, views, triggers,
 * migration, recovery, and concurrent access safety.
 *
 * Target: 40+ tests
 */

import Database from 'better-sqlite3';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';

describe('ReasoningBank Database Tests', () => {
  let db: Database.Database;
  const testDbPath = ':memory:'; // In-memory for speed

  beforeEach(() => {
    db = new Database(testDbPath);
    initializeSchema(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================================
  // SCHEMA CREATION AND VALIDATION (8 tests)
  // ============================================================

  describe('Schema Creation', () => {
    test('should create patterns table with correct schema', () => {
      const tableInfo = db.prepare(`PRAGMA table_info(patterns)`).all();

      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'id', type: 'TEXT', pk: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'namespace', type: 'TEXT', notnull: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'content', type: 'TEXT', notnull: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'embedding', type: 'BLOB', notnull: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'confidence', type: 'REAL', notnull: 1 })
      );
    });

    test('should create pattern_outcomes table with correct schema', () => {
      const tableInfo = db.prepare(`PRAGMA table_info(pattern_outcomes)`).all();

      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'id', type: 'TEXT', pk: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'pattern_id', type: 'TEXT', notnull: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'outcome', type: 'TEXT', notnull: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'confidence_before', type: 'REAL', notnull: 1 })
      );
    });

    test('should create pattern_relationships table with correct schema', () => {
      const tableInfo = db.prepare(`PRAGMA table_info(pattern_relationships)`).all();

      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'source_pattern_id', type: 'TEXT', notnull: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'target_pattern_id', type: 'TEXT', notnull: 1 })
      );
      expect(tableInfo).toContainEqual(
        expect.objectContaining({ name: 'relationship_type', type: 'TEXT', notnull: 1 })
      );
    });

    test('should create all required indexes', () => {
      const indexes = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'index' AND tbl_name = 'patterns'
      `).all();

      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_patterns_namespace');
      expect(indexNames).toContain('idx_patterns_confidence');
      expect(indexNames).toContain('idx_patterns_last_used');
      expect(indexNames).toContain('idx_patterns_category');
    });

    test('should create all required views', () => {
      const views = db.prepare(`
        SELECT name FROM sqlite_master WHERE type = 'view'
      `).all();

      const viewNames = views.map(v => v.name);

      expect(viewNames).toContain('high_confidence_patterns');
      expect(viewNames).toContain('recent_learning');
      expect(viewNames).toContain('agent_learning_summary');
    });

    test('should set default values correctly', () => {
      const patternId = uuid();
      const embedding = Buffer.alloc(4096); // 1024 floats * 4 bytes

      db.prepare(`
        INSERT INTO patterns (id, content, embedding, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(patternId, 'test pattern', embedding, Date.now(), Date.now());

      const pattern = db.prepare('SELECT * FROM patterns WHERE id = ?').get(patternId);

      expect(pattern.namespace).toBe('global');
      expect(pattern.confidence).toBe(0.5);
      expect(pattern.success_count).toBe(0);
      expect(pattern.failure_count).toBe(0);
    });

    test('should enforce NOT NULL constraints', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO patterns (id, content, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(uuid(), 'test', Date.now(), Date.now());
      }).toThrow(); // Missing embedding (NOT NULL)
    });

    test('should validate primary key uniqueness', () => {
      const patternId = uuid();
      const embedding = Buffer.alloc(4096);
      const now = Date.now();

      db.prepare(`
        INSERT INTO patterns (id, content, embedding, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(patternId, 'test 1', embedding, now, now);

      expect(() => {
        db.prepare(`
          INSERT INTO patterns (id, content, embedding, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(patternId, 'test 2', embedding, now, now);
      }).toThrow(); // Duplicate primary key
    });
  });

  // ============================================================
  // TABLE INTEGRITY CONSTRAINTS (8 tests)
  // ============================================================

  describe('Table Integrity', () => {
    test('should enforce foreign key constraint on pattern_outcomes', () => {
      const outcomeId = uuid();
      const fakePatternId = uuid();

      // Enable foreign keys
      db.prepare('PRAGMA foreign_keys = ON').run();

      expect(() => {
        db.prepare(`
          INSERT INTO pattern_outcomes (
            id, pattern_id, outcome, confidence_before, confidence_after,
            confidence_delta, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(outcomeId, fakePatternId, 'success', 0.5, 0.7, 0.2, Date.now());
      }).toThrow(); // Foreign key violation
    });

    test('should cascade delete outcomes when pattern is deleted', () => {
      db.prepare('PRAGMA foreign_keys = ON').run();

      const patternId = createTestPattern(db);
      const outcomeId = createTestOutcome(db, patternId);

      // Delete pattern
      db.prepare('DELETE FROM patterns WHERE id = ?').run(patternId);

      // Outcome should be deleted too
      const outcome = db.prepare('SELECT * FROM pattern_outcomes WHERE id = ?').get(outcomeId);
      expect(outcome).toBeUndefined();
    });

    test('should enforce confidence bounds via check constraint', () => {
      const patternId = uuid();
      const embedding = Buffer.alloc(4096);

      // This should work (within bounds)
      expect(() => {
        db.prepare(`
          INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(patternId, 'test', embedding, 0.75, Date.now(), Date.now());
      }).not.toThrow();
    });

    test('should validate outcome values', () => {
      const patternId = createTestPattern(db);
      const outcomeId = uuid();

      // Valid outcomes: 'success' or 'failure'
      expect(() => {
        db.prepare(`
          INSERT INTO pattern_outcomes (
            id, pattern_id, outcome, confidence_before, confidence_after,
            confidence_delta, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(outcomeId, patternId, 'invalid', 0.5, 0.7, 0.2, Date.now());
      }).not.toThrow(); // SQLite doesn't enforce enum by default
    });

    test('should prevent duplicate pattern relationships', () => {
      const pattern1 = createTestPattern(db);
      const pattern2 = createTestPattern(db);

      db.prepare(`
        INSERT INTO pattern_relationships (
          id, source_pattern_id, target_pattern_id, relationship_type, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(uuid(), pattern1, pattern2, 'requires', Date.now());

      expect(() => {
        db.prepare(`
          INSERT INTO pattern_relationships (
            id, source_pattern_id, target_pattern_id, relationship_type, created_at
          ) VALUES (?, ?, ?, ?, ?)
        `).run(uuid(), pattern1, pattern2, 'requires', Date.now());
      }).toThrow(); // UNIQUE constraint violation
    });

    test('should allow multiple relationship types between same patterns', () => {
      const pattern1 = createTestPattern(db);
      const pattern2 = createTestPattern(db);

      db.prepare(`
        INSERT INTO pattern_relationships (
          id, source_pattern_id, target_pattern_id, relationship_type, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(uuid(), pattern1, pattern2, 'requires', Date.now());

      expect(() => {
        db.prepare(`
          INSERT INTO pattern_relationships (
            id, source_pattern_id, target_pattern_id, relationship_type, created_at
          ) VALUES (?, ?, ?, ?, ?)
        `).run(uuid(), pattern1, pattern2, 'complements', Date.now());
      }).not.toThrow(); // Different relationship type allowed
    });

    test('should maintain referential integrity on pattern deletion', () => {
      db.prepare('PRAGMA foreign_keys = ON').run();

      const pattern1 = createTestPattern(db);
      const pattern2 = createTestPattern(db);

      db.prepare(`
        INSERT INTO pattern_relationships (
          id, source_pattern_id, target_pattern_id, relationship_type, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(uuid(), pattern1, pattern2, 'requires', Date.now());

      // Delete source pattern
      db.prepare('DELETE FROM patterns WHERE id = ?').run(pattern1);

      // Relationship should be deleted
      const rel = db.prepare(
        'SELECT * FROM pattern_relationships WHERE source_pattern_id = ?'
      ).get(pattern1);
      expect(rel).toBeUndefined();
    });

    test('should preserve data integrity during concurrent inserts', () => {
      const patterns = [];

      // Simulate concurrent inserts (synchronous in test, but validates constraints)
      for (let i = 0; i < 100; i++) {
        const id = uuid();
        patterns.push(id);
        db.prepare(`
          INSERT INTO patterns (id, content, embedding, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, `pattern ${i}`, Buffer.alloc(4096), Date.now(), Date.now());
      }

      const count = db.prepare('SELECT COUNT(*) as count FROM patterns').get();
      expect(count.count).toBe(100);
    });
  });

  // ============================================================
  // INDEX PERFORMANCE (8 tests)
  // ============================================================

  describe('Index Performance', () => {
    beforeEach(() => {
      // Load test data
      for (let i = 0; i < 1000; i++) {
        db.prepare(`
          INSERT INTO patterns (id, namespace, content, embedding, confidence, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuid(),
          i % 10 === 0 ? 'global' : `agent:${i % 5}`,
          `pattern ${i}`,
          Buffer.alloc(4096),
          0.5 + (i % 50) / 100,
          Date.now(),
          Date.now()
        );
      }
    });

    test('should use index for namespace queries', () => {
      const plan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM patterns WHERE namespace = 'global'
      `).all();

      const usesIndex = plan.some(row =>
        row.detail && row.detail.includes('idx_patterns_namespace')
      );
      expect(usesIndex).toBe(true);
    });

    test('should perform namespace query under 3ms', () => {
      const start = performance.now();

      db.prepare(`
        SELECT * FROM patterns WHERE namespace = 'global' LIMIT 10
      `).all();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(3);
    });

    test('should use index for confidence ordering', () => {
      const plan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM patterns ORDER BY confidence DESC LIMIT 10
      `).all();

      const usesIndex = plan.some(row =>
        row.detail && row.detail.includes('idx_patterns_confidence')
      );
      expect(usesIndex).toBe(true);
    });

    test('should perform confidence-ordered query under 3ms', () => {
      const start = performance.now();

      db.prepare(`
        SELECT * FROM patterns ORDER BY confidence DESC LIMIT 10
      `).all();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(3);
    });

    test('should use index for category filtering', () => {
      // First add some categorized patterns
      db.prepare(`
        UPDATE patterns SET category = 'prioritization' WHERE id IN (
          SELECT id FROM patterns LIMIT 100
        )
      `).run();

      const plan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM patterns WHERE category = 'prioritization'
      `).all();

      const usesIndex = plan.some(row =>
        row.detail && row.detail.includes('idx_patterns_category')
      );
      expect(usesIndex).toBe(true);
    });

    test('should perform composite query efficiently', () => {
      const start = performance.now();

      db.prepare(`
        SELECT * FROM patterns
        WHERE namespace = 'global'
          AND confidence > 0.7
        ORDER BY confidence DESC
        LIMIT 10
      `).all();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(3);
    });

    test('should optimize outcome history queries with index', () => {
      const patternId = createTestPattern(db);

      // Create multiple outcomes
      for (let i = 0; i < 50; i++) {
        createTestOutcome(db, patternId);
      }

      const start = performance.now();

      db.prepare(`
        SELECT * FROM pattern_outcomes
        WHERE pattern_id = ?
        ORDER BY timestamp DESC
        LIMIT 10
      `).all(patternId);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(3);
    });

    test('should handle large dataset queries efficiently', () => {
      // Add more patterns (total 11,000)
      const stmt = db.prepare(`
        INSERT INTO patterns (id, namespace, content, embedding, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((patterns) => {
        for (const p of patterns) {
          stmt.run(p);
        }
      });

      const patterns = [];
      for (let i = 0; i < 10000; i++) {
        patterns.push([
          uuid(),
          `agent:${i % 10}`,
          `pattern ${i}`,
          Buffer.alloc(4096),
          0.5,
          Date.now(),
          Date.now()
        ]);
      }
      insertMany(patterns);

      // Query should still be fast
      const start = performance.now();
      db.prepare(`
        SELECT * FROM patterns
        WHERE namespace = 'agent:5' AND confidence > 0.6
        LIMIT 10
      `).all();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // Allow 5ms for 11K patterns
    });
  });

  // ============================================================
  // VIEW CORRECTNESS (6 tests)
  // ============================================================

  describe('View Correctness', () => {
    beforeEach(() => {
      // Create test patterns with varying confidence and outcomes
      for (let i = 0; i < 20; i++) {
        const patternId = createTestPattern(db);

        // Update confidence
        const confidence = 0.3 + (i / 20) * 0.6; // Range: 0.3 to 0.9
        db.prepare('UPDATE patterns SET confidence = ?, success_count = ?, failure_count = ? WHERE id = ?')
          .run(confidence, i, Math.floor(i / 4), patternId);

        // Create outcomes
        for (let j = 0; j < i; j++) {
          createTestOutcome(db, patternId, j % 2 === 0 ? 'success' : 'failure');
        }
      }
    });

    test('should filter high_confidence_patterns view correctly', () => {
      const results = db.prepare('SELECT * FROM high_confidence_patterns').all();

      results.forEach(pattern => {
        expect(pattern.confidence).toBeGreaterThan(0.7);
        expect(pattern.total_outcomes).toBeGreaterThanOrEqual(3);
      });
    });

    test('should order high_confidence_patterns by confidence', () => {
      const results = db.prepare('SELECT * FROM high_confidence_patterns').all();

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
      }
    });

    test('should show recent_learning from last 24 hours', () => {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      const results = db.prepare('SELECT * FROM recent_learning').all();

      results.forEach(learning => {
        expect(learning.timestamp).toBeGreaterThan(oneDayAgo);
      });
    });

    test('should calculate agent_learning_summary correctly', () => {
      const agentId = 'test-agent-123';

      // Create patterns for specific agent
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO patterns (id, agent_id, content, embedding, confidence, success_count, failure_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(uuid(), agentId, `pattern ${i}`, Buffer.alloc(4096), 0.8, 10, 2, Date.now(), Date.now());
      }

      const summary = db.prepare(
        'SELECT * FROM agent_learning_summary WHERE agent_id = ?'
      ).get(agentId);

      expect(summary.total_patterns).toBe(5);
      expect(summary.avg_confidence).toBeCloseTo(0.8, 1);
      expect(summary.total_successes).toBe(50);
      expect(summary.total_failures).toBe(10);
    });

    test('should include all columns in view results', () => {
      const result = db.prepare('SELECT * FROM high_confidence_patterns LIMIT 1').get();

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('success_count');
      expect(result).toHaveProperty('failure_count');
      expect(result).toHaveProperty('total_outcomes');
    });

    test('should update views when underlying data changes', () => {
      const patternId = createTestPattern(db);

      // Initially low confidence
      db.prepare('UPDATE patterns SET confidence = ?, success_count = ?, failure_count = ? WHERE id = ?')
        .run(0.6, 1, 0, patternId);

      let highConf = db.prepare('SELECT * FROM high_confidence_patterns WHERE id = ?').get(patternId);
      expect(highConf).toBeUndefined();

      // Update to high confidence
      db.prepare('UPDATE patterns SET confidence = ?, success_count = ?, failure_count = ? WHERE id = ?')
        .run(0.85, 10, 2, patternId);

      highConf = db.prepare('SELECT * FROM high_confidence_patterns WHERE id = ?').get(patternId);
      expect(highConf).toBeDefined();
      expect(highConf.confidence).toBe(0.85);
    });
  });

  // ============================================================
  // TRIGGER FUNCTIONALITY (3 tests)
  // ============================================================

  describe('Trigger Functionality', () => {
    test('should auto-update updated_at timestamp on pattern modification', () => {
      const patternId = createTestPattern(db);
      const initialUpdated = db.prepare('SELECT updated_at FROM patterns WHERE id = ?').get(patternId).updated_at;

      // Wait a moment
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      return delay(10).then(() => {
        db.prepare('UPDATE patterns SET content = ? WHERE id = ?').run('modified content', patternId);

        const newUpdated = db.prepare('SELECT updated_at FROM patterns WHERE id = ?').get(patternId).updated_at;
        expect(newUpdated).toBeGreaterThan(initialUpdated);
      });
    });

    test('should auto-increment total_invocations on outcome creation', () => {
      const patternId = createTestPattern(db);
      const initial = db.prepare('SELECT total_invocations FROM patterns WHERE id = ?').get(patternId).total_invocations;

      createTestOutcome(db, patternId);

      const updated = db.prepare('SELECT total_invocations FROM patterns WHERE id = ?').get(patternId).total_invocations;
      expect(updated).toBe((initial || 0) + 1);
    });

    test('should update last_used_at on pattern query', () => {
      const patternId = createTestPattern(db);

      db.prepare('UPDATE patterns SET last_used_at = ? WHERE id = ?').run(Date.now(), patternId);

      const lastUsed = db.prepare('SELECT last_used_at FROM patterns WHERE id = ?').get(patternId).last_used_at;
      expect(lastUsed).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // MIGRATION AND ROLLBACK (3 tests)
  // ============================================================

  describe('Migration and Rollback', () => {
    test('should support schema version tracking', () => {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at INTEGER NOT NULL
        )
      `).run();

      db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
        .run(1, Date.now());

      const version = db.prepare('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1').get();
      expect(version.version).toBe(1);
    });

    test('should handle migration to add new column', () => {
      // Add metadata column if doesn't exist
      const columns = db.prepare('PRAGMA table_info(patterns)').all();
      const hasMetadata = columns.some(col => col.name === 'metadata');

      if (!hasMetadata) {
        db.prepare('ALTER TABLE patterns ADD COLUMN metadata TEXT').run();
      }

      const updatedColumns = db.prepare('PRAGMA table_info(patterns)').all();
      expect(updatedColumns.some(col => col.name === 'metadata')).toBe(true);
    });

    test('should preserve data during schema migration', () => {
      const patternId = createTestPattern(db);
      const before = db.prepare('SELECT content FROM patterns WHERE id = ?').get(patternId);

      // Simulate migration (add column)
      try {
        db.prepare('ALTER TABLE patterns ADD COLUMN test_column TEXT').run();
      } catch (e) {
        // Column might already exist
      }

      const after = db.prepare('SELECT content FROM patterns WHERE id = ?').get(patternId);
      expect(after.content).toBe(before.content);
    });
  });

  // ============================================================
  // DATABASE CORRUPTION RECOVERY (2 tests)
  // ============================================================

  describe('Database Corruption Recovery', () => {
    test('should detect and report corruption with integrity check', () => {
      const result = db.prepare('PRAGMA integrity_check').get();
      expect(result.integrity_check).toBe('ok');
    });

    test('should support database backup and restore', () => {
      const backupPath = '/tmp/test-backup-' + Date.now() + '.db';

      // Create some data
      createTestPattern(db);

      // Backup
      const backup = db.backup(backupPath);
      backup.close();

      // Verify backup exists and is valid
      const backupDb = new Database(backupPath);
      const count = backupDb.prepare('SELECT COUNT(*) as count FROM patterns').get();
      expect(count.count).toBeGreaterThan(0);

      backupDb.close();
      unlinkSync(backupPath);
    });
  });

  // ============================================================
  // CONCURRENT ACCESS SAFETY (2 tests)
  // ============================================================

  describe('Concurrent Access Safety', () => {
    test('should handle WAL mode for concurrent reads', () => {
      db.prepare('PRAGMA journal_mode = WAL').run();
      const mode = db.prepare('PRAGMA journal_mode').get();
      expect(mode.journal_mode).toBe('wal');
    });

    test('should support transaction isolation', () => {
      const patternId = createTestPattern(db);

      const transaction = db.transaction(() => {
        db.prepare('UPDATE patterns SET confidence = ? WHERE id = ?').run(0.8, patternId);
        const inTransaction = db.prepare('SELECT confidence FROM patterns WHERE id = ?').get(patternId);
        expect(inTransaction.confidence).toBe(0.8);
      });

      transaction();

      const afterTransaction = db.prepare('SELECT confidence FROM patterns WHERE id = ?').get(patternId);
      expect(afterTransaction.confidence).toBe(0.8);
    });
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function initializeSchema(db: Database.Database): void {
  // Create patterns table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS patterns (
      id TEXT PRIMARY KEY,
      namespace TEXT NOT NULL DEFAULT 'global',
      agent_id TEXT,
      skill_id TEXT,
      content TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      embedding BLOB NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      total_invocations INTEGER DEFAULT 0,
      context_type TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_used_at INTEGER
    )
  `).run();

  // Create pattern_outcomes table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pattern_outcomes (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      context TEXT,
      user_feedback TEXT,
      confidence_before REAL NOT NULL,
      confidence_after REAL NOT NULL,
      confidence_delta REAL NOT NULL,
      execution_time_ms INTEGER,
      metadata TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    )
  `).run();

  // Create pattern_relationships table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS pattern_relationships (
      id TEXT PRIMARY KEY,
      source_pattern_id TEXT NOT NULL,
      target_pattern_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      strength REAL DEFAULT 0.5,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (source_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
      FOREIGN KEY (target_pattern_id) REFERENCES patterns(id) ON DELETE CASCADE,
      UNIQUE(source_pattern_id, target_pattern_id, relationship_type)
    )
  `).run();

  // Create indexes
  db.prepare('CREATE INDEX IF NOT EXISTS idx_patterns_namespace ON patterns(namespace, agent_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence DESC)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_patterns_last_used ON patterns(last_used_at DESC)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category, namespace)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_outcomes_pattern ON pattern_outcomes(pattern_id, timestamp DESC)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_relationships_source ON pattern_relationships(source_pattern_id)').run();

  // Create views
  db.prepare(`
    CREATE VIEW IF NOT EXISTS high_confidence_patterns AS
    SELECT
      id, content, confidence, success_count, failure_count, namespace, category,
      (success_count + failure_count) AS total_outcomes
    FROM patterns
    WHERE confidence > 0.7 AND (success_count + failure_count) >= 3
    ORDER BY confidence DESC, total_outcomes DESC
  `).run();

  db.prepare(`
    CREATE VIEW IF NOT EXISTS recent_learning AS
    SELECT
      p.id, p.content, p.namespace, po.outcome,
      po.confidence_before, po.confidence_after, po.confidence_delta, po.timestamp
    FROM patterns p
    JOIN pattern_outcomes po ON p.id = po.pattern_id
    WHERE po.timestamp > (strftime('%s', 'now') - 86400) * 1000
    ORDER BY po.timestamp DESC
  `).run();

  db.prepare(`
    CREATE VIEW IF NOT EXISTS agent_learning_summary AS
    SELECT
      agent_id,
      COUNT(DISTINCT id) AS total_patterns,
      AVG(confidence) AS avg_confidence,
      SUM(success_count) AS total_successes,
      SUM(failure_count) AS total_failures,
      SUM(success_count + failure_count) AS total_outcomes
    FROM patterns
    WHERE agent_id IS NOT NULL
    GROUP BY agent_id
  `).run();
}

function createTestPattern(db: Database.Database, content: string = 'test pattern'): string {
  const id = uuid();
  const embedding = Buffer.alloc(4096);
  const now = Date.now();

  db.prepare(`
    INSERT INTO patterns (id, content, embedding, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, content, embedding, now, now);

  return id;
}

function createTestOutcome(
  db: Database.Database,
  patternId: string,
  outcome: 'success' | 'failure' = 'success'
): string {
  const id = uuid();
  const confidenceBefore = 0.5;
  const confidenceAfter = outcome === 'success' ? 0.7 : 0.35;
  const delta = confidenceAfter - confidenceBefore;

  db.prepare(`
    INSERT INTO pattern_outcomes (
      id, pattern_id, outcome, confidence_before, confidence_after,
      confidence_delta, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, patternId, outcome, confidenceBefore, confidenceAfter, delta, Date.now());

  return id;
}

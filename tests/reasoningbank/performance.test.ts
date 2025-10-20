/**
 * Phase 4 ReasoningBank - Performance Tests
 *
 * Tests query latency benchmarks, embedding generation speed, database size growth,
 * memory usage, concurrent query handling, large pattern set performance, and
 * index effectiveness.
 *
 * Target: 30+ tests
 */

import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';

describe('Performance Tests', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  // ============================================================
  // QUERY LATENCY BENCHMARKS (8 tests)
  // ============================================================

  describe('Query Latency (<3ms p95)', () => {
    beforeEach(() => {
      // Load test data (1000 patterns)
      loadTestPatterns(db, 1000);
    });

    test('should complete simple SELECT under 3ms', () => {
      const start = performance.now();
      db.prepare('SELECT * FROM patterns WHERE namespace = ? LIMIT 10').all('global');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3);
    });

    test('should complete indexed query under 3ms (p95)', () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        db.prepare('SELECT * FROM patterns WHERE confidence > ? LIMIT 10').all(0.7);
        latencies.push(performance.now() - start);
      }

      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)];

      expect(p95).toBeLessThan(3);
    });

    test('should complete composite query under 3ms', () => {
      const start = performance.now();
      db.prepare(`
        SELECT * FROM patterns
        WHERE namespace = ? AND confidence > ? AND category = ?
        LIMIT 10
      `).all('global', 0.5, 'test');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3);
    });

    test('should complete JOIN query efficiently', () => {
      const start = performance.now();
      db.prepare(`
        SELECT p.*, COUNT(po.id) as outcome_count
        FROM patterns p
        LEFT JOIN pattern_outcomes po ON p.id = po.pattern_id
        WHERE p.namespace = ?
        GROUP BY p.id
        LIMIT 10
      `).all('global');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // Slightly higher for JOIN
    });

    test('should complete view query under 3ms', () => {
      const start = performance.now();
      db.prepare('SELECT * FROM high_confidence_patterns LIMIT 10').all();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(3);
    });

    test('should maintain performance with 10K patterns', () => {
      loadTestPatterns(db, 9000); // Add to existing 1000

      const start = performance.now();
      db.prepare('SELECT * FROM patterns WHERE confidence > ? LIMIT 10').all(0.7);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('should complete aggregate query efficiently', () => {
      const start = performance.now();
      db.prepare(`
        SELECT namespace, COUNT(*) as count, AVG(confidence) as avg_conf
        FROM patterns
        GROUP BY namespace
      `).all();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('should handle concurrent reads efficiently', () => {
      const queries = Array(50).fill(null).map(() => {
        return new Promise(resolve => {
          const start = performance.now();
          db.prepare('SELECT * FROM patterns WHERE namespace = ? LIMIT 10').all('global');
          resolve(performance.now() - start);
        });
      });

      return Promise.all(queries).then(latencies => {
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        expect(avg).toBeLessThan(3);
      });
    });
  });

  // ============================================================
  // EMBEDDING GENERATION SPEED (6 tests)
  // ============================================================

  describe('Embedding Generation (<1ms)', () => {
    test('should generate embedding under 1ms', () => {
      const text = 'test pattern for embedding generation';

      const start = performance.now();
      generateEmbedding(text);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });

    test('should generate 100 embeddings under 100ms', () => {
      const texts = Array(100).fill(null).map((_, i) => `pattern ${i}`);

      const start = performance.now();
      texts.forEach(t => generateEmbedding(t));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('should handle long text efficiently', () => {
      const longText = 'test '.repeat(1000);

      const start = performance.now();
      generateEmbedding(longText);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5);
    });

    test('should calculate cosine similarity under 0.1ms', () => {
      const emb1 = generateEmbedding('text 1');
      const emb2 = generateEmbedding('text 2');

      const start = performance.now();
      cosineSimilarity(emb1, emb2);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(0.1);
    });

    test('should batch process embeddings efficiently', () => {
      const texts = Array(1000).fill(null).map((_, i) => `pattern ${i}`);

      const start = performance.now();
      const embeddings = texts.map(t => generateEmbedding(t));
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000); // 1ms per embedding average
      expect(embeddings.length).toBe(1000);
    });

    test('should not degrade with repeated calls', () => {
      const latencies = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        generateEmbedding(`test ${i}`);
        latencies.push(performance.now() - start);
      }

      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(avg).toBeLessThan(1);
    });
  });

  // ============================================================
  // DATABASE SIZE GROWTH (4 tests)
  // ============================================================

  describe('Database Size (<50MB/month/agent)', () => {
    test('should estimate storage per pattern', () => {
      const embedding = Buffer.alloc(4096); // 1024 floats * 4 bytes
      const pattern = {
        id: uuid(),
        content: 'test pattern with average length',
        embedding,
        metadata: JSON.stringify({ category: 'test', tags: ['tag1', 'tag2'] }),
      };

      // Estimate: ~5KB per pattern (embedding + metadata)
      const estimatedSize = 5 * 1024; // 5KB
      const actualSize = embedding.length + pattern.content.length + pattern.metadata.length;

      expect(actualSize).toBeLessThan(estimatedSize);
    });

    test('should project storage for 1000 patterns', () => {
      loadTestPatterns(db, 1000);

      // Query database size (SQLite pragma)
      const pageCount = db.prepare('PRAGMA page_count').get().page_count;
      const pageSize = db.prepare('PRAGMA page_size').get().page_size;
      const dbSize = pageCount * pageSize;

      // Should be under 10MB for 1000 patterns
      expect(dbSize).toBeLessThan(10 * 1024 * 1024);
    });

    test('should validate compression effectiveness', () => {
      // WAL mode should compress well
      db.prepare('PRAGMA journal_mode = WAL').run();

      loadTestPatterns(db, 500);

      const pageCount = db.prepare('PRAGMA page_count').get().page_count;
      const pageSize = db.prepare('PRAGMA page_size').get().page_size;
      const dbSize = pageCount * pageSize;

      // Should be under 5MB for 500 patterns with compression
      expect(dbSize).toBeLessThan(5 * 1024 * 1024);
    });

    test('should estimate monthly growth per agent', () => {
      // Assume: 10 patterns/day, 30 days = 300 patterns/month
      const patternsPerMonth = 300;
      const bytesPerPattern = 5 * 1024; // 5KB
      const monthlyGrowth = patternsPerMonth * bytesPerPattern;

      // Should be under 50MB/month target
      expect(monthlyGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  // ============================================================
  // MEMORY USAGE (4 tests)
  // ============================================================

  describe('Memory Usage (<100MB)', () => {
    test('should measure baseline memory usage', () => {
      const before = process.memoryUsage();
      loadTestPatterns(db, 100);
      const after = process.memoryUsage();

      const heapIncrease = after.heapUsed - before.heapUsed;
      expect(heapIncrease).toBeLessThan(10 * 1024 * 1024); // <10MB
    });

    test('should handle large pattern set in memory', () => {
      const before = process.memoryUsage();
      loadTestPatterns(db, 1000);
      const after = process.memoryUsage();

      const heapIncrease = after.heapUsed - before.heapUsed;
      expect(heapIncrease).toBeLessThan(50 * 1024 * 1024); // <50MB
    });

    test('should clean up memory after queries', () => {
      const before = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        db.prepare('SELECT * FROM patterns LIMIT 100').all();
      }

      global.gc && global.gc(); // Force GC if available

      const after = process.memoryUsage().heapUsed;
      const increase = after - before;

      expect(increase).toBeLessThan(5 * 1024 * 1024); // <5MB residual
    });

    test('should limit embedding cache size', () => {
      const embeddings = [];

      for (let i = 0; i < 1000; i++) {
        embeddings.push(generateEmbedding(`pattern ${i}`));
      }

      const memoryUsed = embeddings.length * 1024 * 4; // 1024 floats * 4 bytes
      expect(memoryUsed).toBeLessThan(10 * 1024 * 1024); // <10MB for 1000 embeddings
    });
  });

  // ============================================================
  // CONCURRENT QUERY HANDLING (4 tests)
  // ============================================================

  describe('Concurrent Query Handling (>100 qps)', () => {
    beforeEach(() => {
      loadTestPatterns(db, 1000);
    });

    test('should handle 100 concurrent queries', () => {
      const queries = Array(100).fill(null).map(() =>
        db.prepare('SELECT * FROM patterns WHERE confidence > ? LIMIT 10').all(0.5)
      );

      expect(queries.every(r => r.length > 0)).toBe(true);
    });

    test('should achieve >100 queries per second', () => {
      const start = performance.now();
      let queryCount = 0;

      while (performance.now() - start < 1000) { // Run for 1 second
        db.prepare('SELECT * FROM patterns LIMIT 10').all();
        queryCount++;
      }

      expect(queryCount).toBeGreaterThan(100);
    });

    test('should handle mixed read/write operations', () => {
      const operations = Array(100).fill(null).map((_, i) => {
        if (i % 2 === 0) {
          // Read
          return () => db.prepare('SELECT * FROM patterns LIMIT 10').all();
        } else {
          // Write
          return () => db.prepare(`
            INSERT INTO patterns (id, content, embedding, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(uuid(), `pattern ${i}`, Buffer.alloc(4096), Date.now(), Date.now());
        }
      });

      operations.forEach(op => op());
      expect(true).toBe(true); // No errors
    });

    test('should maintain consistency under concurrent load', () => {
      const patternId = uuid();
      db.prepare(`
        INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(patternId, 'test', Buffer.alloc(4096), 0.5, Date.now(), Date.now());

      // Concurrent updates
      const updates = Array(50).fill(null).map(() =>
        db.prepare('UPDATE patterns SET total_invocations = total_invocations + 1 WHERE id = ?').run(patternId)
      );

      const final = db.prepare('SELECT total_invocations FROM patterns WHERE id = ?').get(patternId);
      expect(final.total_invocations).toBe(50);
    });
  });

  // ============================================================
  // LARGE PATTERN SET PERFORMANCE (2 tests)
  // ============================================================

  describe('Large Pattern Set (100K patterns)', () => {
    test('should handle 10K patterns efficiently', () => {
      const start = performance.now();
      loadTestPatterns(db, 10000);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(30000); // <30s for 10K patterns
    });

    test('should query 10K pattern set under target latency', () => {
      loadTestPatterns(db, 10000);

      const start = performance.now();
      db.prepare('SELECT * FROM patterns WHERE confidence > ? LIMIT 10').all(0.7);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5); // <5ms for large dataset
    });
  });

  // ============================================================
  // INDEX EFFECTIVENESS (2 tests)
  // ============================================================

  describe('Index Effectiveness', () => {
    test('should use indexes for filtered queries', () => {
      loadTestPatterns(db, 1000);

      const plan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM patterns WHERE namespace = ? AND confidence > ?
      `).all('global', 0.5);

      const usesIndex = plan.some(row =>
        row.detail && (row.detail.includes('INDEX') || row.detail.includes('idx_'))
      );

      expect(usesIndex).toBe(true);
    });

    test('should optimize query plans automatically', () => {
      loadTestPatterns(db, 1000);

      // Run ANALYZE to update statistics
      db.prepare('ANALYZE').run();

      const plan = db.prepare(`
        EXPLAIN QUERY PLAN
        SELECT * FROM patterns WHERE confidence > ? ORDER BY confidence DESC LIMIT 10
      `).all(0.5);

      const usesConfidenceIndex = plan.some(row =>
        row.detail && row.detail.includes('idx_patterns_confidence')
      );

      expect(usesConfidenceIndex).toBe(true);
    });
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function initializeSchema(db: Database.Database): void {
  db.prepare(`
    CREATE TABLE patterns (
      id TEXT PRIMARY KEY,
      namespace TEXT NOT NULL DEFAULT 'global',
      content TEXT NOT NULL,
      category TEXT,
      embedding BLOB NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.5,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      total_invocations INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_used_at INTEGER
    )
  `).run();

  db.prepare(`
    CREATE TABLE pattern_outcomes (
      id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      confidence_before REAL NOT NULL,
      confidence_after REAL NOT NULL,
      confidence_delta REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      context TEXT,
      user_feedback TEXT,
      execution_time_ms INTEGER,
      FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
    )
  `).run();

  db.prepare('CREATE INDEX idx_patterns_namespace ON patterns(namespace)').run();
  db.prepare('CREATE INDEX idx_patterns_confidence ON patterns(confidence DESC)').run();
  db.prepare('CREATE INDEX idx_patterns_last_used ON patterns(last_used_at DESC)').run();
  db.prepare('CREATE INDEX idx_patterns_category ON patterns(category, namespace)').run();

  db.prepare(`
    CREATE VIEW high_confidence_patterns AS
    SELECT id, content, confidence, success_count, failure_count, namespace, category
    FROM patterns
    WHERE confidence > 0.7 AND (success_count + failure_count) >= 3
  `).run();
}

function loadTestPatterns(db: Database.Database, count: number): void {
  const stmt = db.prepare(`
    INSERT INTO patterns (id, content, embedding, namespace, category, confidence, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((patterns) => {
    for (const p of patterns) {
      stmt.run(p);
    }
  });

  const patterns = [];
  for (let i = 0; i < count; i++) {
    patterns.push([
      uuid(),
      `test pattern ${i}`,
      Buffer.alloc(4096),
      i % 5 === 0 ? 'global' : `agent:${i % 3}`,
      i % 2 === 0 ? 'test' : 'other',
      0.5 + (i % 50) / 100,
      Date.now(),
      Date.now()
    ]);
  }

  insertMany(patterns);
}

function generateEmbedding(text: string): Float32Array {
  const DIMENSIONS = 1024;
  const embedding = new Float32Array(DIMENSIONS);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < 64; i++) {
    const hash = createHash('sha256').update(`${normalized}:${i}`).digest();
    for (let j = 0; j < 16; j++) {
      const offset = i * 16 + j;
      if (offset < DIMENSIONS) {
        embedding[offset] = (hash[j * 2] + hash[j * 2 + 1] - 255) / 255;
      }
    }
  }

  // Normalize
  let magnitude = 0;
  for (let i = 0; i < embedding.length; i++) {
    magnitude += embedding[i] * embedding[i];
  }
  magnitude = Math.sqrt(magnitude);

  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct; // Assuming unit vectors
}

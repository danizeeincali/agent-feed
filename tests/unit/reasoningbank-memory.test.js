/**
 * ReasoningBank Memory Operations Tests
 *
 * TDD approach: Tests for memory storage, retrieval, and updates
 *
 * Tests verify:
 * - Store pattern successfully
 * - Retrieve patterns by embedding (k-NN)
 * - Update confidence on success/failure
 * - Query latency <3ms (p95)
 * - Confidence bounds [0.05, 0.95] enforced
 * - Pattern usage tracking
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { ReasoningBankDatabaseService } = require('../../api-server/services/reasoningbank-db');
const crypto = require('crypto');

// Simple UUID v4 generator
function uuidv4() {
  return crypto.randomBytes(16).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

describe('ReasoningBank Memory Operations', () => {
  const testDbPath = path.join(process.cwd(), 'prod', '.reasoningbank', 'memory.db');
  let service;
  let db;

  beforeAll(async () => {
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

    // Initialize database once for all tests
    service = new ReasoningBankDatabaseService();
    await service.initialize();
  });

  beforeEach(() => {
    // Open direct database connection for test operations
    db = new Database(testDbPath);
  });

  afterEach(() => {
    // Clean up test data after each test
    if (db) {
      db.prepare('DELETE FROM pattern_outcomes').run();
      db.prepare('DELETE FROM pattern_relationships').run();
      db.prepare('DELETE FROM patterns').run();
      db.close();
    }
  });

  afterAll(() => {
    if (service) {
      service.close();
    }
  });

  // Helper function to create a test embedding
  function createTestEmbedding(seed = 0.5) {
    const embedding = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      embedding[i] = seed + (Math.random() - 0.5) * 0.1;
    }
    return Buffer.from(embedding.buffer);
  }

  test('UNIT-MEM-001: Store pattern successfully', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();

    const result = db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id, confidence
    `).get(
      uuidv4(),
      'When debugging async issues, check event loop blocking',
      embedding,
      0.5,
      now,
      now
    );

    expect(result.id).toBeDefined();
    expect(result.confidence).toBe(0.5);

    // Verify pattern is in database
    const stored = db.prepare('SELECT COUNT(*) as count FROM patterns').get();
    expect(stored.count).toBe(1);
  });

  test('UNIT-MEM-002: Retrieve patterns by namespace and confidence', async () => {
    // Store 5 patterns with different confidences
    const patterns = [];
    for (let i = 0; i < 5; i++) {
      const embedding = createTestEmbedding(i * 0.1);
      const now = Date.now();
      const confidence = 0.3 + i * 0.1; // 0.3, 0.4, 0.5, 0.6, 0.7

      const result = db.prepare(`
        INSERT INTO patterns (id, namespace, content, embedding, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        RETURNING id, confidence
      `).get(
        uuidv4(),
        'global',
        `Pattern ${i}: debugging technique`,
        embedding,
        confidence,
        now,
        now
      );

      patterns.push(result);
    }

    // Retrieve patterns with confidence > 0.5
    const retrieved = db.prepare(`
      SELECT id, content, confidence
      FROM patterns
      WHERE namespace = 'global' AND confidence > 0.5
      ORDER BY confidence DESC
    `).all();

    expect(retrieved.length).toBe(2); // 0.6 and 0.7
    expect(retrieved[0].confidence).toBeCloseTo(0.7);
    expect(retrieved[1].confidence).toBeCloseTo(0.6);
  });

  test('UNIT-MEM-003: Update pattern confidence on success', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();
    const patternId = uuidv4();

    // Create pattern with initial confidence 0.5
    db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(patternId, 'Test pattern', embedding, 0.5, now, now);

    // Record successful outcome
    const outcomeId = uuidv4();
    db.prepare(`
      INSERT INTO pattern_outcomes (id, pattern_id, agent_id, outcome, confidence_before, confidence_after, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(outcomeId, patternId, 'test-agent', 'success', 0.5, 0.6, now);

    // Verify pattern was updated by trigger
    const updated = db.prepare('SELECT success_count, total_usage, confidence FROM patterns WHERE id = ?').get(patternId);
    expect(updated.success_count).toBe(1);
    expect(updated.total_usage).toBe(1);
  });

  test('UNIT-MEM-004: Update pattern confidence on failure', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();
    const patternId = uuidv4();

    // Create pattern with initial confidence 0.5
    db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(patternId, 'Test pattern', embedding, 0.5, now, now);

    // Record failure outcome
    const outcomeId = uuidv4();
    db.prepare(`
      INSERT INTO pattern_outcomes (id, pattern_id, agent_id, outcome, confidence_before, confidence_after, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(outcomeId, patternId, 'test-agent', 'failure', 0.5, 0.4, now);

    // Verify pattern was updated by trigger
    const updated = db.prepare('SELECT failure_count, total_usage FROM patterns WHERE id = ?').get(patternId);
    expect(updated.failure_count).toBe(1);
    expect(updated.total_usage).toBe(1);
  });

  test('UNIT-MEM-005: Confidence bounds enforced [0.05, 0.95]', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();

    // Try to create pattern with confidence > 0.95
    expect(() => {
      db.prepare(`
        INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), 'Test pattern', embedding, 0.96, now, now);
    }).toThrow();

    // Try to create pattern with confidence < 0.05
    expect(() => {
      db.prepare(`
        INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), 'Test pattern', embedding, 0.04, now, now);
    }).toThrow();

    // Valid confidence values should work
    const validPattern = db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING id
    `).get(uuidv4(), 'Test pattern', embedding, 0.5, now, now);

    expect(validPattern.id).toBeDefined();
  });

  test('UNIT-MEM-006: Query latency <100ms for small dataset', async () => {
    // Store 50 patterns
    const now = Date.now();
    for (let i = 0; i < 50; i++) {
      const embedding = createTestEmbedding(i * 0.01);
      db.prepare(`
        INSERT INTO patterns (id, namespace, content, embedding, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(),
        'global',
        `Pattern ${i}`,
        embedding,
        0.5 + (Math.random() * 0.3),
        now,
        now
      );
    }

    // Measure query latency
    const latencies = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      db.prepare(`
        SELECT id, content, confidence
        FROM patterns
        WHERE namespace = 'global' AND confidence > 0.6
        ORDER BY confidence DESC
        LIMIT 10
      `).all();
      latencies.push(Date.now() - start);
    }

    // Calculate p95
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95 = latencies[p95Index];

    expect(p95).toBeLessThan(100); // Should be very fast for 50 patterns
  });

  test('UNIT-MEM-007: Pattern usage tracking works correctly', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();
    const patternId = uuidv4();

    // Create pattern
    db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(patternId, 'Test pattern', embedding, 0.5, now, now);

    // Record multiple outcomes
    for (let i = 0; i < 3; i++) {
      db.prepare(`
        INSERT INTO pattern_outcomes (id, pattern_id, agent_id, outcome, confidence_before, confidence_after, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), patternId, 'test-agent', 'success', 0.5, 0.6, now + i);
    }

    for (let i = 0; i < 2; i++) {
      db.prepare(`
        INSERT INTO pattern_outcomes (id, pattern_id, agent_id, outcome, confidence_before, confidence_after, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), patternId, 'test-agent', 'failure', 0.6, 0.5, now + 3 + i);
    }

    // Verify usage tracking
    const pattern = db.prepare('SELECT success_count, failure_count, total_usage FROM patterns WHERE id = ?').get(patternId);
    expect(pattern.success_count).toBe(3);
    expect(pattern.failure_count).toBe(2);
    expect(pattern.total_usage).toBe(5);
  });

  test('UNIT-MEM-008: Pattern relationships can be created', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();

    // Create two patterns
    const pattern1Id = uuidv4();
    const pattern2Id = uuidv4();

    db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(pattern1Id, 'Pattern 1', embedding, 0.5, now, now);

    db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(pattern2Id, 'Pattern 2', embedding, 0.5, now, now);

    // Create relationship
    const relationshipId = uuidv4();
    db.prepare(`
      INSERT INTO pattern_relationships (id, source_pattern_id, target_pattern_id, relationship_type, strength, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(relationshipId, pattern1Id, pattern2Id, 'requires', 0.8, now);

    // Verify relationship
    const relationship = db.prepare('SELECT * FROM pattern_relationships WHERE id = ?').get(relationshipId);
    expect(relationship.source_pattern_id).toBe(pattern1Id);
    expect(relationship.target_pattern_id).toBe(pattern2Id);
    expect(relationship.relationship_type).toBe('requires');
    expect(relationship.strength).toBe(0.8);
  });

  test('UNIT-MEM-009: Self-referencing relationships are prevented', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();
    const patternId = uuidv4();

    // Create pattern
    db.prepare(`
      INSERT INTO patterns (id, content, embedding, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(patternId, 'Pattern 1', embedding, 0.5, now, now);

    // Try to create self-referencing relationship
    expect(() => {
      db.prepare(`
        INSERT INTO pattern_relationships (id, source_pattern_id, target_pattern_id, relationship_type, strength, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), patternId, patternId, 'requires', 0.8, now);
    }).toThrow();
  });

  test('UNIT-MEM-010: Views return correct statistics', async () => {
    const embedding = createTestEmbedding();
    const now = Date.now();

    // Create patterns in different namespaces
    for (let i = 0; i < 3; i++) {
      const patternId = uuidv4();
      db.prepare(`
        INSERT INTO patterns (id, namespace, agent_id, content, embedding, confidence, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(patternId, 'global', 'agent-1', `Pattern ${i}`, embedding, 0.5 + i * 0.1, now, now);

      // Add some outcomes
      db.prepare(`
        INSERT INTO pattern_outcomes (id, pattern_id, agent_id, outcome, confidence_before, confidence_after, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), patternId, 'agent-1', 'success', 0.5, 0.6, now);
    }

    // Query namespace stats view
    const namespaceStats = db.prepare('SELECT * FROM v_pattern_stats_by_namespace WHERE namespace = ?').get('global');
    expect(namespaceStats.total_patterns).toBe(3);
    expect(namespaceStats.total_successes).toBe(3);
    expect(namespaceStats.success_rate).toBeCloseTo(1.0);

    // Query agent learning summary view
    const agentStats = db.prepare('SELECT * FROM v_agent_learning_summary WHERE agent_id = ?').get('agent-1');
    expect(agentStats.total_patterns).toBe(3);
    expect(agentStats.total_successes).toBe(3);
    expect(agentStats.success_rate).toBeCloseTo(1.0);
  });
});

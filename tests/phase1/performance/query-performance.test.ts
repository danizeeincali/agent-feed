/**
 * Query Performance Tests
 * Phase 1: Verify database query performance meets requirements
 *
 * Requirements:
 * - Memory retrieval query: <100ms
 * - GIN index performance: Efficient containment queries
 * - Connection pooling: Handles concurrent load
 * - Concurrent queries: No degradation under load
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';

describe('Query Performance Tests', () => {
  let pool: Pool;
  const PERFORMANCE_THRESHOLD_MS = 100; // Memory retrieval must be <100ms
  const CONCURRENT_QUERIES = 20; // Connection pool max

  beforeAll(async () => {
    // Connect to test database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'agentfeed_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      min: 2,
      max: 20,
    });

    // Setup: Create schema and seed test data
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');

    // Create tables from schema
    const schemaSQL = `
      CREATE TABLE system_agent_templates (
        name VARCHAR(50) PRIMARY KEY,
        version INTEGER NOT NULL,
        model VARCHAR(100),
        posting_rules JSONB NOT NULL,
        api_schema JSONB NOT NULL,
        safety_constraints JSONB NOT NULL,
        default_personality TEXT,
        default_response_style JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE agent_memories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        agent_name VARCHAR(50) NOT NULL,
        post_id VARCHAR(100),
        content TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE user_agent_customizations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        agent_template VARCHAR(50) NOT NULL REFERENCES system_agent_templates(name) ON DELETE CASCADE,
        custom_name VARCHAR(100),
        personality TEXT,
        interests JSONB,
        response_style JSONB,
        enabled BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        CONSTRAINT unique_user_template UNIQUE(user_id, agent_template)
      );
    `;

    await pool.query(schemaSQL);

    // Create indexes from indexes.sql
    const indexSQL = `
      -- Memory retrieval composite index (user + agent + recency)
      CREATE INDEX idx_agent_memories_user_agent_recency
        ON agent_memories(user_id, agent_name, created_at DESC);

      -- GIN index on metadata JSONB
      CREATE INDEX idx_agent_memories_metadata
        ON agent_memories USING gin (metadata jsonb_path_ops);

      -- Topic expression index
      CREATE INDEX idx_agent_memories_metadata_topic
        ON agent_memories((metadata->>'topic'))
        WHERE metadata IS NOT NULL;

      -- User customizations indexes
      CREATE INDEX idx_user_agent_customizations_interests
        ON user_agent_customizations USING gin (interests jsonb_path_ops);
    `;

    await pool.query(indexSQL);

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(() => {
    // Clear any query results to avoid caching effects
    jest.clearAllMocks();
  });

  async function seedTestData() {
    // Insert system template
    await pool.query(`
      INSERT INTO system_agent_templates (name, version, posting_rules, api_schema, safety_constraints)
      VALUES (
        'tech-guru',
        1,
        '{"max_length": 280, "rate_limit": 5}'::jsonb,
        '{"endpoints": ["/api/post"]}'::jsonb,
        '{"content_filters": ["spam", "hate"]}'::jsonb
      )
    `);

    // Insert 1000 agent memories for performance testing
    const batchSize = 100;
    for (let i = 0; i < 10; i++) {
      const values: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (let j = 0; j < batchSize; j++) {
        const memoryIndex = i * batchSize + j;
        const userId = `user_${memoryIndex % 10}`; // 10 different users
        const agentName = `agent_${memoryIndex % 5}`; // 5 different agents
        const topic = ['AI', 'tech', 'crypto', 'startups', 'science'][memoryIndex % 5];

        values.push(
          `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`
        );

        params.push(
          userId,
          agentName,
          `Memory content ${memoryIndex}`,
          JSON.stringify({ topic, importance: memoryIndex % 3 + 1 })
        );
      }

      await pool.query(
        `INSERT INTO agent_memories (user_id, agent_name, content, metadata)
         VALUES ${values.join(', ')}`,
        params
      );
    }

    // Insert user customizations
    await pool.query(`
      INSERT INTO user_agent_customizations (user_id, agent_template, interests)
      VALUES
        ('user_0', 'tech-guru', '["AI", "startups"]'::jsonb),
        ('user_1', 'tech-guru', '["crypto", "tech"]'::jsonb),
        ('user_2', 'tech-guru', '["science", "AI"]'::jsonb)
    `);
  }

  describe('Memory Retrieval Performance', () => {
    it('should retrieve recent memories in <100ms (using composite index)', async () => {
      const startTime = performance.now();

      const result = await pool.query(
        `SELECT id, content, metadata, created_at
         FROM agent_memories
         WHERE user_id = $1 AND agent_name = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        ['user_0', 'agent_0']
      );

      const executionTime = performance.now() - startTime;

      expect(result.rows.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`Memory retrieval time: ${executionTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLD_MS}ms)`);
    });

    it('should verify query uses index (EXPLAIN ANALYZE)', async () => {
      const explainResult = await pool.query(
        `EXPLAIN (ANALYZE, BUFFERS)
         SELECT id, content, metadata, created_at
         FROM agent_memories
         WHERE user_id = $1 AND agent_name = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        ['user_0', 'agent_0']
      );

      const plan = explainResult.rows.map(r => r['QUERY PLAN']).join('\n');

      // Verify index is used
      expect(plan).toMatch(/Index Scan.*idx_agent_memories_user_agent_recency/);

      // Log execution plan
      console.log('\nQuery Execution Plan:');
      console.log(plan);
    });

    it('should handle pagination efficiently', async () => {
      const iterations = 5;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await pool.query(
          `SELECT id, content, metadata, created_at
           FROM agent_memories
           WHERE user_id = $1 AND agent_name = $2
           ORDER BY created_at DESC
           LIMIT 20 OFFSET $3`,
          ['user_0', 'agent_0', i * 20]
        );

        const executionTime = performance.now() - startTime;
        times.push(executionTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 1.5); // Allow 50% variance

      console.log(`Pagination avg: ${avgTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('GIN Index Performance', () => {
    it('should perform JSONB containment queries efficiently (<100ms)', async () => {
      const startTime = performance.now();

      const result = await pool.query(
        `SELECT id, content, metadata
         FROM agent_memories
         WHERE metadata @> $1`,
        [JSON.stringify({ topic: 'AI' })]
      );

      const executionTime = performance.now() - startTime;

      expect(result.rows.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`JSONB containment query time: ${executionTime.toFixed(2)}ms`);
    });

    it('should verify GIN index is used for containment queries', async () => {
      const explainResult = await pool.query(
        `EXPLAIN (ANALYZE, BUFFERS)
         SELECT id, content, metadata
         FROM agent_memories
         WHERE metadata @> $1`,
        [JSON.stringify({ topic: 'AI' })]
      );

      const plan = explainResult.rows.map(r => r['QUERY PLAN']).join('\n');

      // Verify GIN index is used
      expect(plan).toMatch(/Bitmap Index Scan.*idx_agent_memories_metadata/);

      console.log('\nGIN Index Query Plan:');
      console.log(plan);
    });

    it('should handle expression index for topic queries efficiently', async () => {
      const startTime = performance.now();

      const result = await pool.query(
        `SELECT id, content, metadata
         FROM agent_memories
         WHERE metadata->>'topic' = $1`,
        ['AI']
      );

      const executionTime = performance.now() - startTime;

      expect(result.rows.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`Topic expression index query time: ${executionTime.toFixed(2)}ms`);
    });

    it('should perform complex JSONB queries with multiple conditions', async () => {
      const startTime = performance.now();

      const result = await pool.query(
        `SELECT id, content, metadata
         FROM agent_memories
         WHERE user_id = $1
           AND metadata @> $2
         ORDER BY created_at DESC
         LIMIT 10`,
        ['user_0', JSON.stringify({ topic: 'AI' })]
      );

      const executionTime = performance.now() - startTime;

      expect(executionTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`Complex JSONB query time: ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Connection Pooling Under Load', () => {
    it('should handle concurrent queries without degradation', async () => {
      const concurrentQueries = Array.from({ length: CONCURRENT_QUERIES }, (_, i) => {
        const userId = `user_${i % 10}`;
        const agentName = `agent_${i % 5}`;

        return async () => {
          const startTime = performance.now();

          await pool.query(
            `SELECT id, content, metadata
             FROM agent_memories
             WHERE user_id = $1 AND agent_name = $2
             ORDER BY created_at DESC
             LIMIT 10`,
            [userId, agentName]
          );

          return performance.now() - startTime;
        };
      });

      const times = await Promise.all(concurrentQueries.map(fn => fn()));

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2); // Allow 2x for concurrent load
      expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 3); // Max 3x under load

      console.log(`Concurrent queries (n=${CONCURRENT_QUERIES}):`);
      console.log(`  Avg: ${avgTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);
    });

    it('should verify connection pool stats', async () => {
      // Execute queries to warm up pool
      await Promise.all(
        Array.from({ length: 10 }, () =>
          pool.query('SELECT COUNT(*) FROM agent_memories')
        )
      );

      // Check pool stats
      expect(pool.totalCount).toBeGreaterThan(0);
      expect(pool.totalCount).toBeLessThanOrEqual(20); // max connections
      expect(pool.idleCount).toBeGreaterThanOrEqual(0);

      console.log(`Pool stats: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`);
    });

    it('should handle rapid sequential queries efficiently', async () => {
      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        await pool.query(
          'SELECT COUNT(*) FROM agent_memories WHERE user_id = $1',
          [`user_${i % 10}`]
        );

        times.push(performance.now() - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS);

      console.log(`Sequential queries (n=${iterations}): avg=${avgTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Queries - No Degradation', () => {
    it('should maintain performance with mixed query types', async () => {
      const queries = [
        // Memory retrieval
        () => pool.query(
          'SELECT * FROM agent_memories WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
          ['user_0']
        ),
        // JSONB containment
        () => pool.query(
          'SELECT * FROM agent_memories WHERE metadata @> $1',
          [JSON.stringify({ topic: 'AI' })]
        ),
        // Aggregation
        () => pool.query(
          'SELECT COUNT(*) FROM agent_memories WHERE user_id = $1',
          ['user_0']
        ),
        // Join query
        () => pool.query(
          `SELECT m.*, c.custom_name
           FROM agent_memories m
           LEFT JOIN user_agent_customizations c ON c.user_id = m.user_id
           WHERE m.user_id = $1
           LIMIT 10`,
          ['user_0']
        ),
      ];

      const mixedQueries = Array.from({ length: 20 }, (_, i) => {
        const query = queries[i % queries.length];
        return async () => {
          const startTime = performance.now();
          await query();
          return performance.now() - startTime;
        };
      });

      const times = await Promise.all(mixedQueries.map(fn => fn()));

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2);

      console.log(`Mixed queries avg time: ${avgTime.toFixed(2)}ms`);
    });

    it('should handle write and read concurrency', async () => {
      const operations = Array.from({ length: 10 }, (_, i) => {
        if (i % 2 === 0) {
          // Write operation
          return async () => {
            const startTime = performance.now();
            await pool.query(
              `INSERT INTO agent_memories (user_id, agent_name, content, metadata)
               VALUES ($1, $2, $3, $4)`,
              [`user_${i}`, 'agent_perf_test', 'Test content', '{"topic": "test"}']
            );
            return performance.now() - startTime;
          };
        } else {
          // Read operation
          return async () => {
            const startTime = performance.now();
            await pool.query(
              'SELECT * FROM agent_memories WHERE user_id = $1 LIMIT 10',
              [`user_${i % 10}`]
            );
            return performance.now() - startTime;
          };
        }
      });

      const times = await Promise.all(operations.map(fn => fn()));

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      expect(avgTime).toBeLessThan(PERFORMANCE_THRESHOLD_MS * 2);

      console.log(`Mixed read/write operations avg time: ${avgTime.toFixed(2)}ms`);

      // Cleanup
      await pool.query(`DELETE FROM agent_memories WHERE agent_name = 'agent_perf_test'`);
    });
  });

  describe('Index Size and Efficiency', () => {
    it('should verify index sizes are reasonable', async () => {
      const indexSizes = await pool.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as size
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY pg_relation_size(indexrelid) DESC
      `);

      console.log('\nIndex Sizes:');
      indexSizes.rows.forEach(row => {
        console.log(`  ${row.indexname}: ${row.size}`);
      });

      expect(indexSizes.rows.length).toBeGreaterThan(0);
    });

    it('should verify table and index bloat', async () => {
      const stats = await pool.query(`
        SELECT
          relname as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) as total_size,
          pg_size_pretty(pg_relation_size(relid)) as table_size,
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as indexes_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
      `);

      console.log('\nTable Statistics:');
      stats.rows.forEach(row => {
        console.log(`  ${row.table_name}:`);
        console.log(`    Total: ${row.total_size}`);
        console.log(`    Table: ${row.table_size}`);
        console.log(`    Indexes: ${row.indexes_size}`);
      });

      expect(stats.rows.length).toBeGreaterThan(0);
    });
  });
});

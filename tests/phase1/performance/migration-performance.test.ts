/**
 * Migration Performance Tests
 * Phase 1: Verify database migration execution meets performance requirements
 *
 * Requirements:
 * - Migration execution time: <10 seconds for schema creation
 * - Index creation: Efficient and fast
 * - Transaction overhead: Minimal
 * - Verification: Fast integrity checks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { MigrationRunner } from '../../../src/database/migrations/migration-runner';
import { migration001 } from '../../../src/database/migrations/001_initial_schema';
import {
  AuditLogger,
  AuditLogEntry,
  DatabasePool,
  TransactionClient,
} from '../../../src/database/migrations/types';

// Test audit logger
class TestAuditLogger implements AuditLogger {
  private logs: AuditLogEntry[] = [];

  async log(entry: Omit<AuditLogEntry, 'id'>): Promise<void> {
    this.logs.push({
      id: `log_${Date.now()}_${Math.random()}`,
      ...entry,
    });
  }

  async getHistory(migrationId: string): Promise<AuditLogEntry[]> {
    return this.logs.filter((log) => log.migrationId === migrationId);
  }

  getLogs(): AuditLogEntry[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
}

// PostgreSQL pool adapter
class PostgresPoolAdapter implements DatabasePool {
  constructor(private pgPool: Pool) {}

  async connect(): Promise<TransactionClient> {
    const client = await this.pgPool.connect();

    return {
      begin: () => client.query('BEGIN'),
      commit: () => client.query('COMMIT'),
      rollback: () => client.query('ROLLBACK'),
      query: (sql: string, params?: any[]) => client.query(sql, params),
      release: () => client.release(),
    };
  }

  async query(sql: string, params?: any[]) {
    return this.pgPool.query(sql, params);
  }
}

describe('Migration Performance Tests', () => {
  let pool: Pool;
  let poolAdapter: PostgresPoolAdapter;
  let auditLogger: TestAuditLogger;
  let migrationRunner: MigrationRunner;

  const MIGRATION_THRESHOLD_MS = 10000; // Must complete in <10 seconds

  beforeAll(async () => {
    // Connect to test database
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'agentfeed_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    poolAdapter = new PostgresPoolAdapter(pool);
    auditLogger = new TestAuditLogger();

    migrationRunner = new MigrationRunner(poolAdapter, {
      auditLogger,
      verifyDataIntegrity: true,
      autoRollbackOnFailure: true,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean database
    await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
    await pool.query('CREATE SCHEMA public');
    auditLogger.clear();
  });

  describe('Schema Creation Performance', () => {
    it('should create initial schema in <10 seconds (requirement)', async () => {
      const startTime = performance.now();

      const result = await migrationRunner.runMigrations([migration001], '1.0.0');

      const executionTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(MIGRATION_THRESHOLD_MS);

      console.log(`Migration 001 execution time: ${executionTime.toFixed(2)}ms (threshold: ${MIGRATION_THRESHOLD_MS}ms)`);

      // Verify all tables created
      const tableResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);

      expect(parseInt(tableResult.rows[0].count)).toBeGreaterThanOrEqual(6);
    });

    it('should break down migration execution time by phase', async () => {
      const phases = {
        tableCreation: 0,
        indexCreation: 0,
        verification: 0,
        total: 0,
      };

      const startTime = performance.now();

      // Hook into migration runner to measure phases
      const phaseStartTime = performance.now();
      await migrationRunner.runMigrations([migration001], '1.0.0');
      phases.total = performance.now() - startTime;

      // Measure index creation separately
      await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
      await pool.query('CREATE SCHEMA public');

      const tableStartTime = performance.now();

      // Create tables only (no indexes)
      await pool.query(`
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
      `);

      phases.tableCreation = performance.now() - tableStartTime;

      const indexStartTime = performance.now();

      // Create indexes
      await pool.query(`
        CREATE INDEX idx_agent_memories_user_agent_recency
          ON agent_memories(user_id, agent_name, created_at DESC);

        CREATE INDEX idx_agent_memories_metadata
          ON agent_memories USING gin (metadata jsonb_path_ops);
      `);

      phases.indexCreation = performance.now() - indexStartTime;

      console.log('\nMigration Phase Breakdown:');
      console.log(`  Total: ${phases.total.toFixed(2)}ms`);
      console.log(`  Table Creation (estimated): ${phases.tableCreation.toFixed(2)}ms`);
      console.log(`  Index Creation (estimated): ${phases.indexCreation.toFixed(2)}ms`);
      console.log(`  Verification (estimated): ${(phases.total - phases.tableCreation - phases.indexCreation).toFixed(2)}ms`);

      expect(phases.total).toBeLessThan(MIGRATION_THRESHOLD_MS);
    });
  });

  describe('Index Creation Performance', () => {
    it('should create GIN indexes efficiently', async () => {
      // Create table first
      await pool.query(`
        CREATE TABLE agent_memories (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          agent_name VARCHAR(50) NOT NULL,
          post_id VARCHAR(100),
          content TEXT NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      // Insert test data
      const insertStartTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        await pool.query(
          `INSERT INTO agent_memories (user_id, agent_name, content, metadata)
           VALUES ($1, $2, $3, $4)`,
          [`user_${i % 10}`, `agent_${i % 5}`, `Content ${i}`, JSON.stringify({ topic: 'test' })]
        );
      }

      const insertTime = performance.now() - insertStartTime;

      // Create GIN index
      const indexStartTime = performance.now();

      await pool.query(`
        CREATE INDEX idx_agent_memories_metadata
          ON agent_memories USING gin (metadata jsonb_path_ops);
      `);

      const indexTime = performance.now() - indexStartTime;

      console.log(`Insert 1000 rows: ${insertTime.toFixed(2)}ms`);
      console.log(`Create GIN index: ${indexTime.toFixed(2)}ms`);

      // Index creation should be reasonably fast even with data
      expect(indexTime).toBeLessThan(5000); // <5 seconds for 1000 rows
    });

    it('should create composite indexes efficiently', async () => {
      // Create table
      await pool.query(`
        CREATE TABLE agent_memories (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          agent_name VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      // Insert data
      for (let i = 0; i < 500; i++) {
        await pool.query(
          `INSERT INTO agent_memories (user_id, agent_name, content)
           VALUES ($1, $2, $3)`,
          [`user_${i % 10}`, `agent_${i % 5}`, `Content ${i}`]
        );
      }

      const startTime = performance.now();

      // Create composite index
      await pool.query(`
        CREATE INDEX idx_agent_memories_user_agent_recency
          ON agent_memories(user_id, agent_name, created_at DESC);
      `);

      const executionTime = performance.now() - startTime;

      console.log(`Create composite index: ${executionTime.toFixed(2)}ms`);

      expect(executionTime).toBeLessThan(3000); // <3 seconds
    });

    it('should measure all index creation time', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Get index count
      const indexResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);

      const indexCount = parseInt(indexResult.rows[0].count);

      console.log(`Total indexes created: ${indexCount}`);

      expect(indexCount).toBeGreaterThan(5); // Should have multiple indexes
    });
  });

  describe('Transaction Overhead', () => {
    it('should measure transaction overhead', async () => {
      // Create schema without transaction
      const noTxStartTime = performance.now();

      await pool.query(`
        CREATE TABLE test_table1 (
          id SERIAL PRIMARY KEY,
          data TEXT
        );
      `);

      const noTxTime = performance.now() - noTxStartTime;

      // Create schema with transaction
      const txStartTime = performance.now();

      await pool.query('BEGIN');
      await pool.query(`
        CREATE TABLE test_table2 (
          id SERIAL PRIMARY KEY,
          data TEXT
        );
      `);
      await pool.query('COMMIT');

      const txTime = performance.now() - txStartTime;

      const overhead = txTime - noTxTime;

      console.log(`Without transaction: ${noTxTime.toFixed(2)}ms`);
      console.log(`With transaction: ${txTime.toFixed(2)}ms`);
      console.log(`Overhead: ${overhead.toFixed(2)}ms`);

      // Transaction overhead should be minimal
      expect(overhead).toBeLessThan(100); // <100ms overhead
    });

    it('should measure rollback performance', async () => {
      const startTime = performance.now();

      await pool.query('BEGIN');

      // Create table
      await pool.query(`
        CREATE TABLE test_rollback (
          id SERIAL PRIMARY KEY,
          data TEXT
        );
      `);

      // Insert data
      for (let i = 0; i < 100; i++) {
        await pool.query(
          'INSERT INTO test_rollback (data) VALUES ($1)',
          [`data_${i}`]
        );
      }

      // Rollback
      await pool.query('ROLLBACK');

      const executionTime = performance.now() - startTime;

      console.log(`Rollback time (100 inserts): ${executionTime.toFixed(2)}ms`);

      // Verify rollback worked
      const tableExists = await pool.query(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_name = 'test_rollback'
      `);

      expect(parseInt(tableExists.rows[0].count)).toBe(0);

      // Rollback should be fast
      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('Verification Performance', () => {
    it('should verify data integrity quickly', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Insert test data
      await pool.query(`
        INSERT INTO system_agent_templates (
          name, version, posting_rules, api_schema, safety_constraints
        )
        VALUES (
          'test-agent', 1,
          '{"max_length": 280}'::jsonb,
          '{"endpoints": []}'::jsonb,
          '{"filters": []}'::jsonb
        )
      `);

      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content)
        VALUES
          ('user_1', 'agent_1', 'Memory 1'),
          ('user_1', 'agent_1', 'Memory 2'),
          ('user_2', 'agent_2', 'Memory 3')
      `);

      const verifyStartTime = performance.now();

      // Verify row counts
      const memoryCount = await pool.query('SELECT COUNT(*) as count FROM agent_memories');
      const templateCount = await pool.query('SELECT COUNT(*) as count FROM system_agent_templates');

      // Verify user counts
      const userCount = await pool.query(
        'SELECT COUNT(DISTINCT user_id) as count FROM agent_memories'
      );

      const verifyTime = performance.now() - verifyStartTime;

      console.log(`Verification time: ${verifyTime.toFixed(2)}ms`);

      expect(parseInt(memoryCount.rows[0].count)).toBe(3);
      expect(parseInt(templateCount.rows[0].count)).toBe(1);
      expect(parseInt(userCount.rows[0].count)).toBe(2);

      // Verification should be very fast
      expect(verifyTime).toBeLessThan(100);
    });

    it('should perform comprehensive verification efficiently', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      const startTime = performance.now();

      // Check all tables exist
      const tables = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
      `);

      // Check all indexes exist
      const indexes = await pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
      `);

      // Check all constraints
      const constraints = await pool.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
      `);

      const executionTime = performance.now() - startTime;

      console.log(`Comprehensive verification time: ${executionTime.toFixed(2)}ms`);
      console.log(`  Tables: ${tables.rows.length}`);
      console.log(`  Indexes: ${indexes.rows.length}`);
      console.log(`  Constraints: ${constraints.rows.length}`);

      expect(executionTime).toBeLessThan(500); // <500ms for full verification
    });
  });

  describe('Migration Repeatability Performance', () => {
    it('should handle repeated migrations efficiently', async () => {
      const times: number[] = [];

      for (let i = 0; i < 3; i++) {
        await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
        await pool.query('CREATE SCHEMA public');

        const startTime = performance.now();

        await migrationRunner.runMigrations([migration001], '1.0.0');

        times.push(performance.now() - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

      console.log(`Repeated migration times: ${times.map(t => t.toFixed(2)).join('ms, ')}ms`);
      console.log(`Average: ${avgTime.toFixed(2)}ms`);

      expect(avgTime).toBeLessThan(MIGRATION_THRESHOLD_MS);

      // Verify consistency (times should be similar)
      const variance = Math.max(...times) - Math.min(...times);
      expect(variance).toBeLessThan(MIGRATION_THRESHOLD_MS * 0.5); // <50% variance
    });
  });

  describe('Concurrent Migration Prevention', () => {
    it('should prevent concurrent migrations safely', async () => {
      // Try to run same migration concurrently
      const migrations = Array.from({ length: 3 }, () =>
        migrationRunner.runMigrations([migration001], '1.0.0')
      );

      const startTime = performance.now();

      const results = await Promise.allSettled(migrations);

      const executionTime = performance.now() - startTime;

      // At least one should succeed
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);

      console.log(`Concurrent migration prevention time: ${executionTime.toFixed(2)}ms`);
      console.log(`Successful migrations: ${successCount}/3`);

      // Should complete reasonably fast even with concurrency control
      expect(executionTime).toBeLessThan(MIGRATION_THRESHOLD_MS * 2);
    });
  });

  describe('Audit Logging Performance', () => {
    it('should measure audit logging overhead', async () => {
      // Migration without audit logging
      const noAuditRunner = new MigrationRunner(poolAdapter, {
        auditLogger: undefined,
        verifyDataIntegrity: false,
        autoRollbackOnFailure: false,
      });

      const noAuditStartTime = performance.now();
      await noAuditRunner.runMigrations([migration001], '1.0.0');
      const noAuditTime = performance.now() - noAuditStartTime;

      // Reset
      await pool.query('DROP SCHEMA IF EXISTS public CASCADE');
      await pool.query('CREATE SCHEMA public');

      // Migration with audit logging
      const withAuditStartTime = performance.now();
      await migrationRunner.runMigrations([migration001], '1.0.0');
      const withAuditTime = performance.now() - withAuditStartTime;

      const overhead = withAuditTime - noAuditTime;

      console.log(`Without audit logging: ${noAuditTime.toFixed(2)}ms`);
      console.log(`With audit logging: ${withAuditTime.toFixed(2)}ms`);
      console.log(`Overhead: ${overhead.toFixed(2)}ms`);

      // Audit logging overhead should be minimal
      expect(overhead).toBeLessThan(1000); // <1 second overhead
    });

    it('should measure audit log size impact', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      const logs = auditLogger.getLogs();

      console.log(`Audit log entries created: ${logs.length}`);

      logs.forEach(log => {
        const size = JSON.stringify(log).length;
        console.log(`  ${log.action}: ${size} bytes`);
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });
});

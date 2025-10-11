/**
 * Migration Integration Tests
 *
 * Tests with real PostgreSQL database to verify:
 * - Actual schema creation
 * - Real transaction behavior
 * - Data protection with actual data
 * - Rollback scenarios
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Pool } from 'pg';
import { MigrationRunner } from '../../../src/database/migrations/migration-runner';
import { migration001 } from '../../../src/database/migrations/001_initial_schema';
import {
  Migration,
  AuditLogger,
  AuditLogEntry,
  DatabasePool,
  TransactionClient,
} from '../../../src/database/migrations/types';

// Audit logger for integration tests
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

// Adapter to make pg.Pool compatible with our DatabasePool interface
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

describe('Migration Integration Tests', () => {
  let pool: Pool;
  let poolAdapter: PostgresPoolAdapter;
  let auditLogger: TestAuditLogger;
  let migrationRunner: MigrationRunner;

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
    // Clean up database before each test
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');

    auditLogger.clear();
  });

  describe('Schema Creation', () => {
    it('should create all tables with initial schema migration', async () => {
      const result = await migrationRunner.runMigrations([migration001], '1.0.0');

      expect(result.success).toBe(true);
      expect(result.verification.passed).toBe(true);

      // Verify TIER 1 table exists
      const templatesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'system_agent_templates'
      `);
      expect(templatesResult.rows).toHaveLength(1);

      // Verify TIER 2 table exists
      const customizationsResult = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'user_agent_customizations'
      `);
      expect(customizationsResult.rows).toHaveLength(1);

      // Verify TIER 3 tables exist
      const memoriesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'agent_memories'
      `);
      expect(memoriesResult.rows).toHaveLength(1);

      const workspacesResult = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'agent_workspaces'
      `);
      expect(workspacesResult.rows).toHaveLength(1);
    });

    it('should create indexes for performance', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Verify JSONB GIN index on agent_memories
      const indexResult = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'agent_memories'
          AND indexname = 'idx_memories_metadata'
      `);
      expect(indexResult.rows).toHaveLength(1);

      // Verify user_id index
      const userIndexResult = await pool.query(`
        SELECT indexname FROM pg_indexes
        WHERE tablename = 'agent_memories'
          AND indexname = 'idx_memories_user_agent_recency'
      `);
      expect(userIndexResult.rows).toHaveLength(1);
    });

    it('should create audit log table', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      const auditResult = await pool.query(`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'audit_log'
      `);
      expect(auditResult.rows).toHaveLength(1);
    });
  });

  describe('Data Protection - Real Scenarios', () => {
    it('should prevent data loss during migration', async () => {
      // First, create schema
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Insert user data
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content, metadata)
        VALUES
          ('user_1', 'agent_tech', 'Memory 1', '{"topic": "tech"}'),
          ('user_1', 'agent_tech', 'Memory 2', '{"topic": "ai"}'),
          ('user_2', 'agent_creative', 'Memory 3', '{"topic": "art"}')
      `);

      // Create a dangerous migration that tries to delete data
      const dangerousMigration: Migration = {
        id: '002',
        version: '1.1.0',
        description: 'Dangerous migration',
        up: async (client) => {
          // Try to delete user data (should be caught)
          await client.query(`DELETE FROM agent_memories WHERE user_id = 'user_1'`);
        },
        down: async () => {},
      };

      // This should fail and rollback
      await expect(
        migrationRunner.runMigrations([dangerousMigration], '1.1.0')
      ).rejects.toThrow(/Data integrity violation/);

      // Verify data is still there (rollback worked)
      const memoriesResult = await pool.query(
        'SELECT COUNT(*) as count FROM agent_memories'
      );
      expect(parseInt(memoriesResult.rows[0].count)).toBe(3);
    });

    it('should allow data additions', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Insert initial data
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content)
        VALUES ('user_1', 'agent_tech', 'Initial memory')
      `);

      // Migration that adds data
      const addDataMigration: Migration = {
        id: '003',
        version: '1.2.0',
        description: 'Add default data',
        up: async (client) => {
          await client.query(`
            INSERT INTO agent_memories (user_id, agent_name, content)
            VALUES ('user_1', 'agent_tech', 'Added memory')
          `);
        },
        down: async (client) => {
          await client.query(
            `DELETE FROM agent_memories WHERE content = 'Added memory'`
          );
        },
      };

      const result = await migrationRunner.runMigrations([addDataMigration], '1.2.0');

      expect(result.success).toBe(true);
      expect(result.verification.passed).toBe(true);

      // Verify data was added
      const memoriesResult = await pool.query(
        'SELECT COUNT(*) as count FROM agent_memories'
      );
      expect(parseInt(memoriesResult.rows[0].count)).toBe(2);
    });

    it('should detect user count decrease', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Insert data for multiple users
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content)
        VALUES
          ('user_1', 'agent_tech', 'Memory 1'),
          ('user_2', 'agent_tech', 'Memory 2'),
          ('user_3', 'agent_tech', 'Memory 3')
      `);

      // Migration that deletes all data for one user
      const deleteUserMigration: Migration = {
        id: '004',
        version: '1.3.0',
        description: 'Delete user data',
        up: async (client) => {
          await client.query(`DELETE FROM agent_memories WHERE user_id = 'user_1'`);
        },
        down: async () => {},
      };

      // Should fail due to user count decrease
      await expect(
        migrationRunner.runMigrations([deleteUserMigration], '1.3.0')
      ).rejects.toThrow();

      // Verify all users' data still exists
      const usersResult = await pool.query(
        'SELECT COUNT(DISTINCT user_id) as count FROM agent_memories'
      );
      expect(parseInt(usersResult.rows[0].count)).toBe(3);
    });
  });

  describe('Transaction Behavior', () => {
    it('should rollback all changes on error', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      const failingMigration: Migration = {
        id: '005',
        version: '1.4.0',
        description: 'Partially successful migration',
        up: async (client) => {
          // First operation succeeds
          await client.query(`
            INSERT INTO agent_memories (user_id, agent_name, content)
            VALUES ('user_1', 'agent_tech', 'Memory 1')
          `);

          // Second operation fails
          await client.query('INVALID SQL SYNTAX');
        },
        down: async () => {},
      };

      await expect(
        migrationRunner.runMigrations([failingMigration], '1.4.0')
      ).rejects.toThrow();

      // Verify first insert was rolled back
      const memoriesResult = await pool.query(
        'SELECT COUNT(*) as count FROM agent_memories'
      );
      expect(parseInt(memoriesResult.rows[0].count)).toBe(0);
    });
  });

  describe('Rollback Capability', () => {
    it('should rollback migration using down function', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Verify tables exist
      const beforeResult = await pool.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'system_agent_templates',
            'agent_memories',
            'user_agent_customizations'
          )
      `);
      expect(parseInt(beforeResult.rows[0].count)).toBe(3);

      // Rollback migration
      await migrationRunner.rollback(migration001);

      // Verify tables are gone
      const afterResult = await pool.query(`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'system_agent_templates',
            'agent_memories',
            'user_agent_customizations'
          )
      `);
      expect(parseInt(afterResult.rows[0].count)).toBe(0);
    });
  });

  describe('Audit Trail', () => {
    it('should log migration start and completion', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      const logs = auditLogger.getLogs();

      // Should have start and completion logs
      expect(logs.length).toBeGreaterThanOrEqual(2);

      const startLog = logs.find((log) => log.action === 'started');
      expect(startLog).toBeDefined();
      expect(startLog?.migrationId).toBe('001');
      expect(startLog?.version).toBe('1.0.0');

      const completedLog = logs.find((log) => log.action === 'completed');
      expect(completedLog).toBeDefined();
      expect(completedLog?.snapshot).toBeDefined();
    });

    it('should log failures with error details', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      const failingMigration: Migration = {
        id: '006',
        version: '1.5.0',
        description: 'Failing migration',
        up: async () => {
          throw new Error('Test error');
        },
        down: async () => {},
      };

      auditLogger.clear();

      await expect(
        migrationRunner.runMigrations([failingMigration], '1.5.0')
      ).rejects.toThrow('Test error');

      const logs = auditLogger.getLogs();
      const failedLog = logs.find((log) => log.action === 'failed');

      expect(failedLog).toBeDefined();
      expect(failedLog?.error).toBe('Test error');
    });

    it('should record snapshots in audit log', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      const logs = auditLogger.getLogs();
      const completedLog = logs.find((log) => log.action === 'completed');

      expect(completedLog?.snapshot).toBeDefined();
      expect(completedLog?.snapshot?.totalRows).toBeDefined();
      expect(completedLog?.snapshot?.totalUsers).toBeDefined();
      expect(completedLog?.snapshot?.tables).toBeDefined();
    });
  });

  describe('Multiple Protected Tables', () => {
    it('should protect all TIER 2 & 3 tables', async () => {
      await migrationRunner.runMigrations([migration001], '1.0.0');

      // Insert data into all protected tables
      await pool.query(`
        INSERT INTO agent_memories (user_id, agent_name, content)
        VALUES ('user_1', 'agent_tech', 'Memory 1')
      `);

      await pool.query(`
        INSERT INTO user_agent_customizations (user_id, agent_template, custom_name)
        VALUES ('user_1', 'tech-guru', 'My Tech Agent')
      `);

      await pool.query(`
        INSERT INTO agent_workspaces (user_id, agent_name, file_path, content)
        VALUES ('user_1', 'agent_tech', '/test.txt', 'Test content'::bytea)
      `);

      // Migration that tries to delete from workspaces
      const deleteWorkspaceMigration: Migration = {
        id: '007',
        version: '1.6.0',
        description: 'Delete workspace',
        up: async (client) => {
          await client.query(`DELETE FROM agent_workspaces`);
        },
        down: async () => {},
      };

      await expect(
        migrationRunner.runMigrations([deleteWorkspaceMigration], '1.6.0')
      ).rejects.toThrow(/Data integrity violation/);

      // Verify workspace data is still there
      const workspaceResult = await pool.query(
        'SELECT COUNT(*) as count FROM agent_workspaces'
      );
      expect(parseInt(workspaceResult.rows[0].count)).toBe(1);
    });
  });
});

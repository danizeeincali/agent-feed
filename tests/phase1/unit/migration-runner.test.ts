/**
 * MigrationRunner Unit Tests - London School TDD
 *
 * Tests focus on:
 * 1. Behavior verification through mocked collaborators
 * 2. Object interactions and contracts
 * 3. Data protection rules enforcement
 * 4. Rollback scenarios
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MigrationRunner } from '../../../src/database/migrations/migration-runner';
import {
  Migration,
  DataSnapshot,
  AuditLogger,
  TransactionClient,
  DatabasePool,
  DataViolation,
} from '../../../src/database/migrations/types';

describe('MigrationRunner - London School TDD', () => {
  let mockPool: jest.Mocked<DatabasePool>;
  let mockClient: jest.Mocked<TransactionClient>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let migrationRunner: MigrationRunner;

  beforeEach(() => {
    // Create mock collaborators
    mockClient = {
      begin: jest.fn<() => Promise<void>>(),
      commit: jest.fn<() => Promise<void>>(),
      rollback: jest.fn<() => Promise<void>>(),
      query: jest.fn<(sql: string, params?: any[]) => Promise<any>>(),
      release: jest.fn<() => void>(),
    };

    mockPool = {
      connect: jest.fn<() => Promise<TransactionClient>>().mockResolvedValue(mockClient),
      query: jest.fn<(sql: string, params?: any[]) => Promise<any>>(),
    };

    mockAuditLogger = {
      log: jest.fn<() => Promise<void>>(),
      getHistory: jest.fn<() => Promise<any[]>>().mockResolvedValue([]),
    };

    migrationRunner = new MigrationRunner(mockPool, {
      auditLogger: mockAuditLogger,
      verifyDataIntegrity: true,
      autoRollbackOnFailure: true,
    });
  });

  describe('Transaction Management', () => {
    it('should wrap migrations in transactions', async () => {
      const migration: Migration = {
        id: '001',
        version: '1.0.0',
        description: 'Test migration',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock snapshot data (no data loss) - need 2 total queries + 6 table queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await migrationRunner.runMigrations([migration], '1.0.0');

      // Verify transaction coordination (order of calls)
      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.begin).toHaveBeenCalled();
      expect(migration.up).toHaveBeenCalledWith(mockClient);
      expect(mockClient.commit).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();

      // Verify order
      const calls = (mockClient.begin as jest.Mock).mock.invocationCallOrder[0];
      const upCalls = (migration.up as jest.Mock).mock.invocationCallOrder[0];
      const commitCalls = (mockClient.commit as jest.Mock).mock.invocationCallOrder[0];
      expect(calls).toBeLessThan(upCalls);
      expect(upCalls).toBeLessThan(commitCalls);
    });

    it('should rollback transaction on migration failure', async () => {
      const migrationError = new Error('Migration failed');
      const migration: Migration = {
        id: '002',
        version: '1.0.1',
        description: 'Failing migration',
        up: jest.fn<() => Promise<void>>().mockRejectedValue(migrationError),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock snapshot before migration (will fail before after snapshot)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await expect(
        migrationRunner.runMigrations([migration], '1.0.1')
      ).rejects.toThrow('Migration failed');

      // Verify rollback sequence
      expect(mockClient.begin).toHaveBeenCalled();
      expect(mockClient.rollback).toHaveBeenCalled();
      expect(mockClient.commit).not.toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Data Snapshot Capture', () => {
    it('should capture snapshots before and after migration', async () => {
      const migration: Migration = {
        id: '003',
        version: '1.1.0',
        description: 'Schema change',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock snapshot queries - before snapshot (1 total + 3 tables), after snapshot (1 total + 3 tables)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 });

      const result = await migrationRunner.runMigrations([migration], '1.1.0');

      // Verify snapshot capture behavior
      expect(result.snapshot.before).toBeDefined();
      expect(result.snapshot.after).toBeDefined();
      expect(result.snapshot.before.totalRows).toBe(100);
      expect(result.snapshot.after.totalRows).toBe(100);
    });

    it('should query protected tables for snapshot', async () => {
      const migration: Migration = {
        id: '004',
        version: '1.2.0',
        description: 'Add column',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock snapshot queries
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 0, total_users: 0 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 0 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 0 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 0 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 0, total_users: 0 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 0 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 0 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 0 }], rowCount: 1 });

      await migrationRunner.runMigrations([migration], '1.2.0');

      // Verify snapshot queries were executed
      const snapshotCalls = (mockClient.query as jest.Mock).mock.calls.filter(
        (call) =>
          call[0].includes('agent_memories') ||
          call[0].includes('user_agent_customizations') ||
          call[0].includes('agent_workspaces')
      );

      expect(snapshotCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity Verification - TIER 2 & 3 Protection', () => {
    it('should detect data loss and trigger rollback', async () => {
      const migration: Migration = {
        id: '005',
        version: '2.0.0',
        description: 'Dangerous migration',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock: Before snapshot has 100 rows, after has 80 (DATA LOSS!)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 80, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 40 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 25 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 15 }], rowCount: 1 });

      await expect(
        migrationRunner.runMigrations([migration], '2.0.0')
      ).rejects.toThrow(/Data integrity violation/);

      // Verify rollback was triggered
      expect(mockClient.rollback).toHaveBeenCalled();
      expect(mockClient.commit).not.toHaveBeenCalled();
    });

    it('should allow row count increases', async () => {
      const migration: Migration = {
        id: '006',
        version: '2.1.0',
        description: 'Add default data',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock: Before 100 rows, after 120 rows (ACCEPTABLE)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 120, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 60 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 35 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 25 }], rowCount: 1 });

      const result = await migrationRunner.runMigrations([migration], '2.1.0');

      // Verify commit happened (no rollback)
      expect(mockClient.commit).toHaveBeenCalled();
      expect(mockClient.rollback).not.toHaveBeenCalled();
      expect(result.verification.passed).toBe(true);
    });

    it('should detect user count decrease (critical violation)', async () => {
      const migration: Migration = {
        id: '007',
        version: '2.2.0',
        description: 'User migration',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock: Before 5 users, after 3 users (CRITICAL!)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 });

      await expect(
        migrationRunner.runMigrations([migration], '2.2.0')
      ).rejects.toThrow(/User data loss detected/);

      expect(mockClient.rollback).toHaveBeenCalled();
    });
  });

  describe('Audit Trail Logging', () => {
    it('should log migration start', async () => {
      const migration: Migration = {
        id: '008',
        version: '3.0.0',
        description: 'Audit test',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await migrationRunner.runMigrations([migration], '3.0.0');

      // Verify audit log was called with 'started' action
      const startLogCall = (mockAuditLogger.log as jest.Mock).mock.calls.find(
        (call) => call[0].action === 'started'
      );

      expect(startLogCall).toBeDefined();
      expect(startLogCall![0]).toMatchObject({
        migrationId: '008',
        version: '3.0.0',
        action: 'started',
      });
    });

    it('should log migration completion with snapshot', async () => {
      const migration: Migration = {
        id: '009',
        version: '3.1.0',
        description: 'Success test',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await migrationRunner.runMigrations([migration], '3.1.0');

      // Verify completion log
      const completedLogCall = (mockAuditLogger.log as jest.Mock).mock.calls.find(
        (call) => call[0].action === 'completed'
      );

      expect(completedLogCall).toBeDefined();
      expect(completedLogCall![0]).toMatchObject({
        migrationId: '009',
        version: '3.1.0',
        action: 'completed',
      });
      expect(completedLogCall![0].snapshot).toBeDefined();
    });

    it('should log migration failure with error', async () => {
      const migrationError = new Error('Schema conflict');
      const migration: Migration = {
        id: '010',
        version: '3.2.0',
        description: 'Failing migration',
        up: jest.fn<() => Promise<void>>().mockRejectedValue(migrationError),
        down: jest.fn<() => Promise<void>>(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await expect(
        migrationRunner.runMigrations([migration], '3.2.0')
      ).rejects.toThrow('Schema conflict');

      // Verify failure log
      const failedLogCall = (mockAuditLogger.log as jest.Mock).mock.calls.find(
        (call) => call[0].action === 'failed'
      );

      expect(failedLogCall).toBeDefined();
      expect(failedLogCall![0]).toMatchObject({
        migrationId: '010',
        version: '3.2.0',
        action: 'failed',
        error: 'Schema conflict',
      });
    });

    it('should log rollback action', async () => {
      const migration: Migration = {
        id: '011',
        version: '3.3.0',
        description: 'Rollback test',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock data loss scenario
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 80, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 40 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 25 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 15 }], rowCount: 1 });

      await expect(
        migrationRunner.runMigrations([migration], '3.3.0')
      ).rejects.toThrow();

      // Verify rollback log
      const rollbackLogCall = (mockAuditLogger.log as jest.Mock).mock.calls.find(
        (call) => call[0].action === 'rolled_back'
      );

      expect(rollbackLogCall).toBeDefined();
    });
  });

  describe('Rollback Capability', () => {
    it('should execute down migration for rollback', async () => {
      const migration: Migration = {
        id: '012',
        version: '4.0.0',
        description: 'Rollback test',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await migrationRunner.rollback(migration);

      // Verify down migration was called
      expect(mockClient.begin).toHaveBeenCalled();
      expect(migration.down).toHaveBeenCalledWith(mockClient);
      expect(mockClient.commit).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should capture snapshots during rollback', async () => {
      const migration: Migration = {
        id: '013',
        version: '4.1.0',
        description: 'Rollback snapshot test',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await migrationRunner.rollback(migration);

      // Verify snapshots were captured
      expect(mockClient.query).toHaveBeenCalled();
    });

    it('should verify data integrity during rollback', async () => {
      const migration: Migration = {
        id: '014',
        version: '4.2.0',
        description: 'Rollback integrity test',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      // Mock data loss during rollback (should fail)
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 100, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 50 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 30 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 20 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 80, total_users: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 40 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 25 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 15 }], rowCount: 1 });

      await expect(migrationRunner.rollback(migration)).rejects.toThrow(
        /Data integrity violation/
      );
    });
  });

  describe('Multiple Migrations', () => {
    it('should execute migrations in sequence', async () => {
      const migration1: Migration = {
        id: '015',
        version: '5.0.0',
        description: 'First migration',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      const migration2: Migration = {
        id: '016',
        version: '5.1.0',
        description: 'Second migration',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await migrationRunner.runMigrations([migration1, migration2], '5.1.0');

      // Verify sequential execution
      const call1 = (migration1.up as jest.Mock).mock.invocationCallOrder[0];
      const call2 = (migration2.up as jest.Mock).mock.invocationCallOrder[0];
      expect(call1).toBeLessThan(call2);
    });

    it('should stop on first migration failure', async () => {
      const migration1: Migration = {
        id: '017',
        version: '5.2.0',
        description: 'Successful migration',
        up: jest.fn<() => Promise<void>>(),
        down: jest.fn<() => Promise<void>>(),
      };

      const migration2: Migration = {
        id: '018',
        version: '5.3.0',
        description: 'Failing migration',
        up: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Failed')),
        down: jest.fn<() => Promise<void>>(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total_rows: 10, total_users: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_memories', row_count: 5 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'user_agent_customizations', row_count: 3 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ table_name: 'agent_workspaces', row_count: 2 }], rowCount: 1 });

      await expect(
        migrationRunner.runMigrations([migration1, migration2], '5.3.0')
      ).rejects.toThrow('Failed');

      // First migration should have succeeded
      expect(migration1.up).toHaveBeenCalled();
      // Second migration should have been attempted
      expect(migration2.up).toHaveBeenCalled();
    });
  });
});

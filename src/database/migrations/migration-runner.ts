/**
 * Migration Runner - Data-Protected Migration Execution
 *
 * Implements transaction-wrapped migrations with:
 * - Automatic data snapshots before/after
 * - Data integrity verification (TIER 2 & 3 protection)
 * - Automatic rollback on violations
 * - Complete audit trail
 */

import {
  Migration,
  MigrationResult,
  MigrationRunnerConfig,
  DataSnapshot,
  TableSnapshot,
  VerificationResult,
  DataViolation,
  DatabasePool,
  TransactionClient,
} from './types';

export class MigrationRunner {
  private readonly PROTECTED_TABLES = [
    'agent_memories',
    'user_agent_customizations',
    'agent_workspaces',
  ];

  constructor(
    private readonly pool: DatabasePool,
    private readonly config: MigrationRunnerConfig
  ) {}

  /**
   * Run migrations up to target version
   * Each migration runs in a transaction with data protection
   */
  async runMigrations(
    migrations: Migration[],
    targetVersion: string
  ): Promise<MigrationResult> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      await client.begin();

      // Capture snapshot before any migrations
      const beforeSnapshot = await this.captureDataSnapshot(client);

      // Log migration start
      await this.config.auditLogger.log({
        migrationId: migrations[0]?.id || 'batch',
        version: targetVersion,
        action: 'started',
        timestamp: new Date(),
        snapshot: beforeSnapshot,
      });

      // Execute each migration
      for (const migration of migrations) {
        await migration.up(client);
      }

      // Capture snapshot after migrations
      const afterSnapshot = await this.captureDataSnapshot(client);

      // Verify data integrity
      const verification = await this.verifyDataIntegrity(
        beforeSnapshot,
        afterSnapshot
      );

      if (!verification.passed) {
        // Data integrity violation - rollback
        await this.config.auditLogger.log({
          migrationId: migrations[0]?.id || 'batch',
          version: targetVersion,
          action: 'rolled_back',
          timestamp: new Date(),
          metadata: {
            reason: 'data_integrity_violation',
            violations: verification.violations,
          },
        });

        await client.rollback();
        throw new Error(
          `Data integrity violation detected: ${this.formatViolations(
            verification.violations
          )}`
        );
      }

      // Success - commit transaction
      await client.commit();

      // Log completion
      await this.config.auditLogger.log({
        migrationId: migrations[migrations.length - 1]?.id || 'batch',
        version: targetVersion,
        action: 'completed',
        timestamp: new Date(),
        snapshot: afterSnapshot,
      });

      return {
        success: true,
        version: targetVersion,
        executedAt: new Date(),
        duration: Date.now() - startTime,
        snapshot: {
          before: beforeSnapshot,
          after: afterSnapshot,
        },
        verification,
      };
    } catch (error) {
      // Rollback on any error
      await client.rollback();

      // Log failure
      await this.config.auditLogger.log({
        migrationId: migrations[0]?.id || 'batch',
        version: targetVersion,
        action: 'failed',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a specific migration
   * Executes down() with same data protection
   */
  async rollback(migration: Migration): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.begin();

      // Capture snapshot before rollback
      const beforeSnapshot = await this.captureDataSnapshot(client);

      // Execute down migration
      await migration.down(client);

      // Capture snapshot after rollback
      const afterSnapshot = await this.captureDataSnapshot(client);

      // Verify data integrity (rollback should also not lose data)
      const verification = await this.verifyDataIntegrity(
        beforeSnapshot,
        afterSnapshot
      );

      if (!verification.passed) {
        await client.rollback();
        throw new Error(
          `Data integrity violation during rollback: ${this.formatViolations(
            verification.violations
          )}`
        );
      }

      await client.commit();

      // Log rollback
      await this.config.auditLogger.log({
        migrationId: migration.id,
        version: migration.version,
        action: 'rolled_back',
        timestamp: new Date(),
        snapshot: afterSnapshot,
      });
    } catch (error) {
      await client.rollback();
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Capture complete data snapshot
   * Records row counts for all protected tables
   */
  async captureDataSnapshot(client: TransactionClient): Promise<DataSnapshot> {
    // Get total counts
    const totalResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM agent_memories) +
        (SELECT COUNT(*) FROM user_agent_customizations) +
        (SELECT COUNT(*) FROM agent_workspaces) AS total_rows,
        (SELECT COUNT(DISTINCT user_id) FROM agent_memories) AS total_users
    `);

    const { total_rows, total_users } = totalResult.rows[0];

    // Get per-table counts
    const tables: TableSnapshot[] = [];

    for (const tableName of this.PROTECTED_TABLES) {
      const tableResult = await client.query(`
        SELECT
          '${tableName}' as table_name,
          COUNT(*) as row_count
        FROM ${tableName}
      `);

      const tableData = tableResult.rows[0];

      tables.push({
        tableName,
        rowCount: parseInt(tableData.row_count, 10),
        userRowCounts: new Map(), // Could be enhanced with per-user counts
      });
    }

    return {
      timestamp: new Date(),
      tables,
      totalRows: parseInt(total_rows, 10),
      totalUsers: parseInt(total_users, 10),
    };
  }

  /**
   * Verify data integrity between snapshots
   * CRITICAL RULE: User data counts NEVER decrease (TIER 2 & 3)
   */
  async verifyDataIntegrity(
    before: DataSnapshot,
    after: DataSnapshot
  ): Promise<VerificationResult> {
    const violations: DataViolation[] = [];

    // Rule 1: Total user count must not decrease
    if (after.totalUsers < before.totalUsers) {
      violations.push({
        severity: 'critical',
        tableName: 'system',
        issue: 'User data loss detected',
        beforeCount: before.totalUsers,
        afterCount: after.totalUsers,
      });
    }

    // Rule 2: Total row count in protected tables must not decrease
    if (after.totalRows < before.totalRows) {
      violations.push({
        severity: 'critical',
        tableName: 'system',
        issue: 'Protected data loss detected',
        beforeCount: before.totalRows,
        afterCount: after.totalRows,
      });
    }

    // Rule 3: Per-table row counts must not decrease
    for (const beforeTable of before.tables) {
      const afterTable = after.tables.find(
        (t) => t.tableName === beforeTable.tableName
      );

      if (afterTable && afterTable.rowCount < beforeTable.rowCount) {
        violations.push({
          severity: 'critical',
          tableName: beforeTable.tableName,
          issue: `Table row count decreased`,
          beforeCount: beforeTable.rowCount,
          afterCount: afterTable.rowCount,
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
    };
  }

  /**
   * Format violations for error messages
   */
  private formatViolations(violations: DataViolation[]): string {
    return violations
      .map((v) => {
        return `[${v.severity.toUpperCase()}] ${v.tableName}: ${v.issue} (${
          v.beforeCount
        } -> ${v.afterCount})`;
      })
      .join(', ');
  }
}

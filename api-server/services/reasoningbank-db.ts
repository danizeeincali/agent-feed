/**
 * ReasoningBank Database Service
 *
 * Production-ready database initialization and management service for ReasoningBank
 * learning system with SAFLA (Self-Aware Feedback Loop Algorithm).
 *
 * Key Features:
 * - Database initialization with schema validation
 * - Health monitoring and statistics
 * - Automated backups and maintenance
 * - VACUUM and ANALYZE operations
 * - Performance monitoring
 *
 * Performance Targets:
 * - Query latency: <3ms (p95)
 * - Storage growth: <50MB/month/agent
 * - Semantic accuracy: 87-95%
 *
 * @module ReasoningBankDB
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

// ============================================================
// TYPES AND INTERFACES
// ============================================================

export interface DBStats {
  totalPatterns: number;
  totalOutcomes: number;
  totalRelationships: number;
  databaseSizeBytes: number;
  databaseSizeMB: number;
  avgConfidence: number;
  successRate: number;
  namespaceCount: number;
  agentCount: number;
  skillCount: number;
  oldestPatternAge: number;
  newestPatternAge: number;
  queryLatencyMs: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  checks: {
    databaseExists: boolean;
    schemaValid: boolean;
    foreignKeysEnabled: boolean;
    walModeEnabled: boolean;
    canRead: boolean;
    canWrite: boolean;
  };
  errors: string[];
  timestamp: number;
}

export interface BackupInfo {
  path: string;
  sizeBytes: number;
  createdAt: number;
  checksum: string;
}

export interface ReasoningBankDB {
  initialize(): Promise<void>;
  healthCheck(): Promise<HealthCheckResult>;
  getStats(): Promise<DBStats>;
  vacuum(): Promise<void>;
  backup(path: string): Promise<BackupInfo>;
  close(): void;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_CONFIG = {
  dbPath: join(process.cwd(), 'prod', '.reasoningbank', 'memory.db'),
  schemaPath: join(process.cwd(), 'api-server', 'db', 'reasoningbank-schema.sql'),
  migrationPath: join(process.cwd(), 'api-server', 'db', 'migrations', '004-reasoningbank-init.sql'),
  backupDir: join(process.cwd(), 'prod', '.reasoningbank', 'backups'),
  maxBackups: 30,
  walMode: true,
  verbose: process.env.NODE_ENV !== 'production',
};

// ============================================================
// REASONINGBANK DATABASE SERVICE
// ============================================================

export class ReasoningBankDatabaseService implements ReasoningBankDB {
  private db: Database.Database | null = null;
  private readonly dbPath: string;
  private readonly schemaPath: string;
  private readonly migrationPath: string;
  private readonly backupDir: string;
  private readonly maxBackups: number;
  private readonly verbose: boolean;

  constructor(config: Partial<typeof DEFAULT_CONFIG> = {}) {
    this.dbPath = config.dbPath || DEFAULT_CONFIG.dbPath;
    this.schemaPath = config.schemaPath || DEFAULT_CONFIG.schemaPath;
    this.migrationPath = config.migrationPath || DEFAULT_CONFIG.migrationPath;
    this.backupDir = config.backupDir || DEFAULT_CONFIG.backupDir;
    this.maxBackups = config.maxBackups || DEFAULT_CONFIG.maxBackups;
    this.verbose = config.verbose !== undefined ? config.verbose : DEFAULT_CONFIG.verbose;
  }

  /**
   * Initialize the ReasoningBank database
   *
   * Creates database file, applies schema, and validates structure.
   * Idempotent - safe to call multiple times.
   */
  async initialize(): Promise<void> {
    try {
      if (this.verbose) {
        console.log('[ReasoningBankDB] Initializing database...');
      }

      // Step 1: Ensure directories exist
      this.ensureDirectories();

      // Step 2: Open database connection
      this.db = new Database(this.dbPath, {
        verbose: this.verbose ? console.log : undefined,
      });

      // Step 3: Apply optimizations
      this.applyPragmas();

      // Step 4: Apply schema/migration
      await this.applySchema();

      // Step 5: Validate schema
      await this.validateSchema();

      // Step 6: Run ANALYZE for query optimization
      this.db.prepare('ANALYZE').run();

      if (this.verbose) {
        console.log('[ReasoningBankDB] Database initialized successfully');
        console.log(`[ReasoningBankDB] Location: ${this.dbPath}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize ReasoningBank database: ${message}`);
    }
  }

  /**
   * Perform comprehensive health check
   *
   * Validates database structure, connectivity, and performance.
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: true,
      checks: {
        databaseExists: false,
        schemaValid: false,
        foreignKeysEnabled: false,
        walModeEnabled: false,
        canRead: false,
        canWrite: false,
      },
      errors: [],
      timestamp: Date.now(),
    };

    try {
      // Check 1: Database file exists
      result.checks.databaseExists = existsSync(this.dbPath);
      if (!result.checks.databaseExists) {
        result.errors.push('Database file does not exist');
        result.healthy = false;
        return result;
      }

      // Ensure database connection
      if (!this.db) {
        this.db = new Database(this.dbPath);
      }

      // Check 2: Schema validation
      try {
        const tables = this.db.prepare(`
          SELECT COUNT(*) as count FROM sqlite_master
          WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships')
        `).get() as { count: number };

        result.checks.schemaValid = tables.count === 3;
        if (!result.checks.schemaValid) {
          result.errors.push(`Schema validation failed: expected 3 tables, found ${tables.count}`);
          result.healthy = false;
        }
      } catch (error) {
        result.errors.push(`Schema validation error: ${error}`);
        result.healthy = false;
      }

      // Check 3: Foreign keys enabled
      try {
        const fkStatus = this.db.pragma('foreign_keys', { simple: true });
        result.checks.foreignKeysEnabled = fkStatus === 1;
        if (!result.checks.foreignKeysEnabled) {
          result.errors.push('Foreign keys are not enabled');
          result.healthy = false;
        }
      } catch (error) {
        result.errors.push(`Foreign key check error: ${error}`);
      }

      // Check 4: WAL mode enabled
      try {
        const journalMode = this.db.pragma('journal_mode', { simple: true });
        result.checks.walModeEnabled = journalMode === 'wal';
        if (!result.checks.walModeEnabled) {
          result.errors.push(`Journal mode is ${journalMode}, expected WAL`);
        }
      } catch (error) {
        result.errors.push(`WAL mode check error: ${error}`);
      }

      // Check 5: Read capability
      try {
        this.db.prepare('SELECT COUNT(*) FROM patterns').get();
        result.checks.canRead = true;
      } catch (error) {
        result.errors.push(`Read check failed: ${error}`);
        result.healthy = false;
      }

      // Check 6: Write capability
      try {
        const testId = `health-check-${Date.now()}`;
        const now = Date.now();
        const embedding = Buffer.alloc(4096, 0); // Zero-filled embedding for test

        this.db.prepare(`
          INSERT INTO patterns (id, content, embedding, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(testId, 'Health check test pattern', embedding, now, now);

        this.db.prepare('DELETE FROM patterns WHERE id = ?').run(testId);
        result.checks.canWrite = true;
      } catch (error) {
        result.errors.push(`Write check failed: ${error}`);
        result.healthy = false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Health check failed: ${message}`);
      result.healthy = false;
    }

    return result;
  }

  /**
   * Get comprehensive database statistics
   *
   * Returns metrics for monitoring and analytics.
   */
  async getStats(): Promise<DBStats> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const startTime = Date.now();

    try {
      // Total patterns
      const totalPatterns = this.db.prepare('SELECT COUNT(*) as count FROM patterns').get() as { count: number };

      // Total outcomes
      const totalOutcomes = this.db.prepare('SELECT COUNT(*) as count FROM pattern_outcomes').get() as { count: number };

      // Total relationships
      const totalRelationships = this.db.prepare('SELECT COUNT(*) as count FROM pattern_relationships').get() as { count: number };

      // Database size
      const pageCount = this.db.pragma('page_count', { simple: true }) as number;
      const pageSize = this.db.pragma('page_size', { simple: true }) as number;
      const databaseSizeBytes = pageCount * pageSize;

      // Average confidence and success rate
      const metrics = this.db.prepare(`
        SELECT
          AVG(confidence) as avg_confidence,
          CASE
            WHEN SUM(total_usage) > 0
            THEN CAST(SUM(success_count) AS REAL) / SUM(total_usage)
            ELSE 0.0
          END as success_rate
        FROM patterns
      `).get() as { avg_confidence: number; success_rate: number };

      // Namespace, agent, and skill counts
      const namespaceCount = this.db.prepare('SELECT COUNT(DISTINCT namespace) as count FROM patterns').get() as { count: number };
      const agentCount = this.db.prepare('SELECT COUNT(DISTINCT agent_id) as count FROM patterns WHERE agent_id IS NOT NULL').get() as { count: number };
      const skillCount = this.db.prepare('SELECT COUNT(DISTINCT skill_id) as count FROM patterns WHERE skill_id IS NOT NULL').get() as { count: number };

      // Pattern age stats
      const now = Date.now();
      const ageStats = this.db.prepare(`
        SELECT
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM patterns
      `).get() as { oldest: number | null; newest: number | null };

      const queryLatencyMs = Date.now() - startTime;

      return {
        totalPatterns: totalPatterns.count,
        totalOutcomes: totalOutcomes.count,
        totalRelationships: totalRelationships.count,
        databaseSizeBytes,
        databaseSizeMB: databaseSizeBytes / (1024 * 1024),
        avgConfidence: metrics.avg_confidence || 0.5,
        successRate: metrics.success_rate || 0.0,
        namespaceCount: namespaceCount.count,
        agentCount: agentCount.count,
        skillCount: skillCount.count,
        oldestPatternAge: ageStats.oldest ? now - ageStats.oldest : 0,
        newestPatternAge: ageStats.newest ? now - ageStats.newest : 0,
        queryLatencyMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get database stats: ${message}`);
    }
  }

  /**
   * VACUUM database
   *
   * Reclaims unused space and defragments the database.
   * Should be run periodically (weekly recommended).
   */
  async vacuum(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      if (this.verbose) {
        console.log('[ReasoningBankDB] Running VACUUM...');
      }

      const startTime = Date.now();
      this.db.prepare('VACUUM').run();
      const duration = Date.now() - startTime;

      if (this.verbose) {
        console.log(`[ReasoningBankDB] VACUUM completed in ${duration}ms`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`VACUUM failed: ${message}`);
    }
  }

  /**
   * Backup database
   *
   * Creates a timestamped backup of the database file.
   * Automatically manages backup retention (keeps last N backups).
   */
  async backup(customPath?: string): Promise<BackupInfo> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Ensure backup directory exists
      if (!existsSync(this.backupDir)) {
        mkdirSync(this.backupDir, { recursive: true });
      }

      // Generate backup filename
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const backupFilename = `memory-${timestamp}.db`;
      const backupPath = customPath || join(this.backupDir, backupFilename);

      // Ensure backup directory exists for custom paths
      const backupDirPath = dirname(backupPath);
      if (!existsSync(backupDirPath)) {
        mkdirSync(backupDirPath, { recursive: true });
      }

      if (this.verbose) {
        console.log(`[ReasoningBankDB] Creating backup: ${backupPath}`);
      }

      // Use SQLite backup API for safe backup
      this.db.backup(backupPath);

      // Calculate checksum
      const backupData = readFileSync(backupPath);
      const checksum = createHash('sha256').update(backupData).digest('hex');
      const sizeBytes = statSync(backupPath).size;

      // Cleanup old backups
      await this.cleanupOldBackups();

      if (this.verbose) {
        console.log(`[ReasoningBankDB] Backup created: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);
      }

      return {
        path: backupPath,
        sizeBytes,
        createdAt: Date.now(),
        checksum,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Backup failed: ${message}`);
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      if (this.verbose) {
        console.log('[ReasoningBankDB] Database connection closed');
      }
    }
  }

  // ============================================================
  // PRIVATE HELPER METHODS
  // ============================================================

  private ensureDirectories(): void {
    const dbDir = dirname(this.dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
      if (this.verbose) {
        console.log(`[ReasoningBankDB] Created database directory: ${dbDir}`);
      }
    }

    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
      if (this.verbose) {
        console.log(`[ReasoningBankDB] Created backup directory: ${this.backupDir}`);
      }
    }
  }

  private applyPragmas(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000'); // 64MB
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('temp_store = MEMORY');
    this.db.pragma('mmap_size = 268435456'); // 256MB
    this.db.pragma('page_size = 4096');

    if (this.verbose) {
      console.log('[ReasoningBankDB] Applied database optimizations (WAL mode, 64MB cache)');
    }
  }

  private async applySchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Check if schema already applied
    const tables = this.db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships')
    `).get() as { count: number };

    if (tables.count === 3) {
      if (this.verbose) {
        console.log('[ReasoningBankDB] Schema already applied, skipping');
      }
      return;
    }

    // Always use schema file (migration has PRAGMA issues inside transactions)
    if (!existsSync(this.schemaPath)) {
      throw new Error('Schema file not found: ' + this.schemaPath);
    }

    const schemaSQL = readFileSync(this.schemaPath, 'utf-8');
    if (this.verbose) {
      console.log('[ReasoningBankDB] Applying schema: reasoningbank-schema.sql');
    }

    // Execute schema
    this.db.exec(schemaSQL);

    if (this.verbose) {
      console.log('[ReasoningBankDB] Schema applied successfully');
    }
  }

  private async validateSchema(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Validate tables
    const requiredTables = ['patterns', 'pattern_outcomes', 'pattern_relationships', 'database_metadata'];
    for (const table of requiredTables) {
      const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master
        WHERE type='table' AND name = ?
      `).get(table) as { count: number };

      if (result.count === 0) {
        throw new Error(`Required table missing: ${table}`);
      }
    }

    // Validate indexes
    const indexCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='index' AND name LIKE 'idx_%'
    `).get() as { count: number };

    if (indexCount.count < 10) {
      throw new Error(`Insufficient indexes: expected >=10, found ${indexCount.count}`);
    }

    // Validate views
    const viewCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='view' AND name LIKE 'v_%'
    `).get() as { count: number };

    if (viewCount.count < 3) {
      throw new Error(`Insufficient views: expected >=3, found ${viewCount.count}`);
    }

    if (this.verbose) {
      console.log('[ReasoningBankDB] Schema validation passed');
      console.log(`  - Tables: ${requiredTables.length}`);
      console.log(`  - Indexes: ${indexCount.count}`);
      console.log(`  - Views: ${viewCount.count}`);
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      if (!existsSync(this.backupDir)) {
        return;
      }

      const backups = readdirSync(this.backupDir)
        .filter(file => file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: join(this.backupDir, file),
          mtime: statSync(join(this.backupDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.mtime - a.mtime);

      // Keep only the most recent N backups
      const backupsToDelete = backups.slice(this.maxBackups);

      for (const backup of backupsToDelete) {
        try {
          const fs = await import('fs/promises');
          await fs.unlink(backup.path);
          if (this.verbose) {
            console.log(`[ReasoningBankDB] Deleted old backup: ${backup.name}`);
          }
        } catch (error) {
          console.warn(`[ReasoningBankDB] Failed to delete backup ${backup.name}:`, error);
        }
      }
    } catch (error) {
      console.warn('[ReasoningBankDB] Failed to cleanup old backups:', error);
    }
  }
}

// ============================================================
// EXPORTS
// ============================================================

export default ReasoningBankDatabaseService;

// Export factory function for convenience
export function createReasoningBankDB(config?: Partial<typeof DEFAULT_CONFIG>): ReasoningBankDB {
  return new ReasoningBankDatabaseService(config);
}

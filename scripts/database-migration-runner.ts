#!/usr/bin/env ts-node

/**
 * Database Migration Runner for AgentLink
 * 
 * This script provides a comprehensive migration management system with:
 * - Safe migration execution with rollback support
 * - Data backup and restoration
 * - Performance monitoring
 * - Validation and integrity checks
 * - Production-ready error handling
 * 
 * Usage:
 *   npm run migrate:up              # Run all pending migrations
 *   npm run migrate:down            # Rollback last migration
 *   npm run migrate:reset           # Reset to original schema
 *   npm run migrate:validate        # Validate current schema
 *   npm run migrate:backup          # Create full database backup
 *   npm run migrate:restore <file>  # Restore from backup
 */

import { Pool, Client } from 'pg';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

// Configuration
interface MigrationConfig {
  database: {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
  };
  migrations: {
    directory: string;
    rollbackDirectory: string;
    backupDirectory: string;
  };
  validation: {
    performanceThresholds: {
      maxQueryTime: number; // milliseconds
      maxMigrationTime: number; // milliseconds
    };
    requiredTables: string[];
    requiredIndexes: string[];
  };
}

const config: MigrationConfig = {
  database: {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'agent_feed',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432'),
  },
  migrations: {
    directory: join(__dirname, '../src/database/migrations'),
    rollbackDirectory: join(__dirname, '../src/database/migrations/rollback'),
    backupDirectory: join(__dirname, '../backups'),
  },
  validation: {
    performanceThresholds: {
      maxQueryTime: 100, // 100ms for standard queries
      maxMigrationTime: 60000, // 60 seconds per migration
    },
    requiredTables: [
      'users', 'feeds', 'feed_items', 'comments', 'claude_flow_sessions'
    ],
    requiredIndexes: [
      'idx_posts_author_id', 'idx_posts_processing_status', 'idx_posts_published_at'
    ],
  },
};

class MigrationRunner {
  private pool: Pool;
  private client: Client | null = null;

  constructor() {
    this.pool = new Pool(config.database);
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    const dirs = [
      config.migrations.backupDirectory,
      dirname(config.migrations.directory),
      dirname(config.migrations.rollbackDirectory)
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  async connect(): Promise<void> {
    this.client = await this.pool.connect();
    console.log('✅ Connected to database');
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    await this.pool.end();
    console.log('✅ Disconnected from database');
  }

  private async query(sql: string, params: any[] = []): Promise<any> {
    if (!this.client) throw new Error('Not connected to database');
    return await this.client.query(sql, params);
  }

  async createBackup(filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = filename || join(config.migrations.backupDirectory, `backup-${timestamp}.sql`);
    
    console.log(`🔄 Creating database backup: ${backupFile}`);
    
    try {
      const command = `pg_dump ${this.getDatabaseUrl()} > "${backupFile}"`;
      execSync(command, { stdio: 'pipe' });
      
      // Verify backup was created and is not empty
      if (!existsSync(backupFile)) {
        throw new Error('Backup file was not created');
      }
      
      const stats = require('fs').statSync(backupFile);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }
      
      console.log(`✅ Database backup created: ${backupFile} (${this.formatBytes(stats.size)})`);
      return backupFile;
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupFile: string): Promise<void> {
    if (!existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    console.log(`🔄 Restoring database from backup: ${backupFile}`);
    
    const confirmed = await this.confirmAction(
      `This will completely replace the current database. Are you sure? (yes/no): `
    );
    
    if (!confirmed) {
      console.log('❌ Restore cancelled by user');
      return;
    }

    try {
      const command = `psql ${this.getDatabaseUrl()} < "${backupFile}"`;
      execSync(command, { stdio: 'pipe' });
      console.log('✅ Database restored successfully');
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }

  async getMigrationStatus(): Promise<{
    appliedMigrations: string[];
    pendingMigrations: string[];
    currentSchema: string;
  }> {
    const migrationFiles = this.getMigrationFiles();
    
    // Check which migrations have been applied (stored in claude_flow_sessions)
    const appliedResult = await this.query(`
      SELECT DISTINCT swarm_id
      FROM claude_flow_sessions
      WHERE swarm_id LIKE 'migration-%'
      AND status = 'completed'
      ORDER BY swarm_id
    `);
    
    const appliedMigrations = appliedResult.rows.map((row: any) => 
      row.swarm_id.replace('migration-', '')
    );
    
    const pendingMigrations = migrationFiles.filter(file => 
      !appliedMigrations.some(applied => file.startsWith(applied))
    );

    // Determine current schema version
    const currentSchema = appliedMigrations.length > 0 
      ? appliedMigrations[appliedMigrations.length - 1]
      : 'original';

    return {
      appliedMigrations,
      pendingMigrations,
      currentSchema
    };
  }

  async runMigration(migrationFile: string): Promise<void> {
    const filePath = join(config.migrations.directory, migrationFile);
    
    if (!existsSync(filePath)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }

    console.log(`🔄 Running migration: ${migrationFile}`);
    
    // Create backup before migration
    const backupFile = await this.createBackup(
      join(config.migrations.backupDirectory, `pre-${migrationFile}-${Date.now()}.sql`)
    );

    const startTime = Date.now();
    
    try {
      // Read and execute migration
      const migrationSql = readFileSync(filePath, 'utf-8');
      
      // Execute in a transaction for safety
      await this.query('BEGIN');
      await this.query(migrationSql);
      await this.query('COMMIT');
      
      const duration = Date.now() - startTime;
      
      if (duration > config.validation.performanceThresholds.maxMigrationTime) {
        console.warn(`⚠️ Migration took ${duration}ms (threshold: ${config.validation.performanceThresholds.maxMigrationTime}ms)`);
      }
      
      console.log(`✅ Migration completed: ${migrationFile} (${duration}ms)`);
      
      // Validate post-migration state
      await this.validateSchema();
      
    } catch (error) {
      console.error(`❌ Migration failed: ${migrationFile}`);
      console.error(error);
      
      // Rollback transaction if it's still active
      try {
        await this.query('ROLLBACK');
      } catch (rollbackError) {
        console.warn('Transaction was already completed or rolled back');
      }
      
      // Offer to restore backup
      const restore = await this.confirmAction(
        'Would you like to restore from backup? (yes/no): '
      );
      
      if (restore) {
        await this.restoreBackup(backupFile);
      }
      
      throw error;
    }
  }

  async runAllMigrations(): Promise<void> {
    const status = await this.getMigrationStatus();
    
    if (status.pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${status.pendingMigrations.length} pending migrations:`);
    status.pendingMigrations.forEach(migration => console.log(`  - ${migration}`));
    
    const confirmed = await this.confirmAction(
      '\nProceed with migrations? (yes/no): '
    );
    
    if (!confirmed) {
      console.log('❌ Migration cancelled by user');
      return;
    }

    // Create full backup before starting
    await this.createBackup();

    // Run migrations in order
    for (const migration of status.pendingMigrations) {
      await this.runMigration(migration);
      
      // Brief pause between migrations
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ All migrations completed successfully');
  }

  async rollbackMigration(migrationName?: string): Promise<void> {
    const status = await this.getMigrationStatus();
    
    if (status.appliedMigrations.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }

    const targetMigration = migrationName || status.appliedMigrations[status.appliedMigrations.length - 1];
    const rollbackFile = `rollback-${targetMigration}.sql`;
    const rollbackPath = join(config.migrations.rollbackDirectory, rollbackFile);
    
    if (!existsSync(rollbackPath)) {
      throw new Error(`Rollback file not found: ${rollbackFile}`);
    }

    console.log(`🔄 Rolling back migration: ${targetMigration}`);
    
    const confirmed = await this.confirmAction(
      `This will rollback migration ${targetMigration}. Continue? (yes/no): `
    );
    
    if (!confirmed) {
      console.log('❌ Rollback cancelled by user');
      return;
    }

    // Create backup before rollback
    await this.createBackup(
      join(config.migrations.backupDirectory, `pre-rollback-${targetMigration}-${Date.now()}.sql`)
    );

    try {
      const rollbackSql = readFileSync(rollbackPath, 'utf-8');
      
      await this.query('BEGIN');
      await this.query(rollbackSql);
      await this.query('COMMIT');
      
      console.log(`✅ Rollback completed: ${targetMigration}`);
      
      // Validate post-rollback state
      await this.validateSchema();
      
    } catch (error) {
      console.error(`❌ Rollback failed: ${targetMigration}`);
      console.error(error);
      
      try {
        await this.query('ROLLBACK');
      } catch (rollbackError) {
        console.warn('Transaction was already completed or rolled back');
      }
      
      throw error;
    }
  }

  async validateSchema(): Promise<boolean> {
    console.log('🔍 Validating database schema...');
    
    const validationResults = {
      tablesValid: true,
      indexesValid: true,
      constraintsValid: true,
      performanceValid: true,
      errors: [] as string[]
    };

    try {
      // Validate required tables exist
      const tables = await this.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tableNames = tables.rows.map((row: any) => row.table_name);
      
      for (const requiredTable of config.validation.requiredTables) {
        if (!tableNames.includes(requiredTable)) {
          validationResults.tablesValid = false;
          validationResults.errors.push(`Missing required table: ${requiredTable}`);
        }
      }

      // Validate critical indexes exist (for posts table if it exists)
      if (tableNames.includes('posts')) {
        const indexes = await this.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'posts' AND schemaname = 'public'
        `);
        
        const indexNames = indexes.rows.map((row: any) => row.indexname);
        
        for (const requiredIndex of config.validation.requiredIndexes) {
          if (!indexNames.includes(requiredIndex)) {
            validationResults.indexesValid = false;
            validationResults.errors.push(`Missing required index: ${requiredIndex}`);
          }
        }
      }

      // Test query performance
      const performanceTests = [
        'SELECT COUNT(*) FROM users',
        tableNames.includes('posts') 
          ? 'SELECT COUNT(*) FROM posts WHERE processing_status = \'published\'' 
          : 'SELECT COUNT(*) FROM feed_items',
      ];

      for (const testQuery of performanceTests) {
        const start = Date.now();
        await this.query(testQuery);
        const duration = Date.now() - start;
        
        if (duration > config.validation.performanceThresholds.maxQueryTime) {
          validationResults.performanceValid = false;
          validationResults.errors.push(
            `Query performance below threshold: ${testQuery} took ${duration}ms`
          );
        }
      }

      // Check for orphaned records (basic integrity)
      const integrityChecks = [
        'SELECT COUNT(*) FROM feeds f LEFT JOIN users u ON f.user_id = u.id WHERE u.id IS NULL',
        'SELECT COUNT(*) FROM feed_items fi LEFT JOIN feeds f ON fi.feed_id = f.id WHERE f.id IS NULL'
      ];

      if (tableNames.includes('posts')) {
        integrityChecks.push(
          'SELECT COUNT(*) FROM posts p LEFT JOIN users u ON p.author_id = u.id WHERE u.id IS NULL'
        );
      }

      for (const integrityCheck of integrityChecks) {
        const result = await this.query(integrityCheck);
        const orphanedCount = parseInt(result.rows[0].count);
        
        if (orphanedCount > 0) {
          validationResults.constraintsValid = false;
          validationResults.errors.push(`Found ${orphanedCount} orphaned records`);
        }
      }

      // Report results
      const isValid = validationResults.tablesValid && 
                     validationResults.indexesValid && 
                     validationResults.constraintsValid && 
                     validationResults.performanceValid;

      if (isValid) {
        console.log('✅ Schema validation passed');
      } else {
        console.log('❌ Schema validation failed:');
        validationResults.errors.forEach(error => console.log(`  - ${error}`));
      }

      return isValid;

    } catch (error) {
      console.error('❌ Schema validation error:', error);
      return false;
    }
  }

  async resetDatabase(): Promise<void> {
    console.log('🔄 Resetting database to original schema...');
    
    const confirmed = await this.confirmAction(
      'This will completely reset the database to original schema. All AgentLink features will be removed. Continue? (yes/no): '
    );
    
    if (!confirmed) {
      console.log('❌ Reset cancelled by user');
      return;
    }

    // Create backup before reset
    await this.createBackup(
      join(config.migrations.backupDirectory, `pre-reset-${Date.now()}.sql`)
    );

    // Execute complete rollback
    const completeRollbackPath = join(config.migrations.rollbackDirectory, 'complete-rollback.sql');
    
    if (existsSync(completeRollbackPath)) {
      const rollbackSql = readFileSync(completeRollbackPath, 'utf-8');
      await this.query(rollbackSql);
    } else {
      // Manual rollback in reverse order
      const rollbacks = ['008', '007', '006', '005'];
      
      for (const rollback of rollbacks) {
        const rollbackFile = join(config.migrations.rollbackDirectory, `rollback-${rollback}.sql`);
        
        if (existsSync(rollbackFile)) {
          console.log(`🔄 Executing rollback: ${rollback}`);
          const rollbackSql = readFileSync(rollbackFile, 'utf-8');
          await this.query(rollbackSql);
        }
      }
    }

    console.log('✅ Database reset completed');
  }

  private getMigrationFiles(): string[] {
    const files = readdirSync(config.migrations.directory)
      .filter(file => file.endsWith('.sql') && /^\d{3}_/.test(file))
      .sort();
    
    return files;
  }

  private getDatabaseUrl(): string {
    const { user, password, host, port, database } = config.database;
    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private async confirmAction(prompt: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.toLowerCase().trim() === 'yes' || answer.toLowerCase().trim() === 'y');
      });
    });
  }

  async showStatus(): Promise<void> {
    console.log('📊 Migration Status Report\n');
    
    const status = await this.getMigrationStatus();
    
    console.log(`Current Schema: ${status.currentSchema}`);
    console.log(`Applied Migrations (${status.appliedMigrations.length}):`);
    
    if (status.appliedMigrations.length === 0) {
      console.log('  - None (original schema)');
    } else {
      status.appliedMigrations.forEach(migration => 
        console.log(`  ✅ ${migration}`)
      );
    }
    
    console.log(`\nPending Migrations (${status.pendingMigrations.length}):`);
    
    if (status.pendingMigrations.length === 0) {
      console.log('  - None (all migrations applied)');
    } else {
      status.pendingMigrations.forEach(migration => 
        console.log(`  ⏳ ${migration}`)
      );
    }

    // Show table counts
    const tables = ['users', 'feeds', 'feed_items'];
    const agentTables = ['posts', 'agents', 'user_engagements'];
    
    console.log('\n📈 Table Statistics:');
    
    for (const table of [...tables, ...agentTables]) {
      try {
        const result = await this.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`  ${table}: ${result.rows[0].count} records`);
      } catch (error) {
        // Table doesn't exist
        console.log(`  ${table}: [table not found]`);
      }
    }

    // Show disk usage
    try {
      const sizeResult = await this.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      console.log(`\n💾 Database Size: ${sizeResult.rows[0].size}`);
    } catch (error) {
      console.log('\n💾 Database Size: Unable to determine');
    }

    console.log('');
  }
}

// CLI Interface
async function main(): Promise<void> {
  const runner = new MigrationRunner();
  
  try {
    await runner.connect();
    
    const command = process.argv[2];
    const argument = process.argv[3];
    
    switch (command) {
      case 'up':
        await runner.runAllMigrations();
        break;
        
      case 'down':
        await runner.rollbackMigration(argument);
        break;
        
      case 'reset':
        await runner.resetDatabase();
        break;
        
      case 'status':
        await runner.showStatus();
        break;
        
      case 'validate':
        await runner.validateSchema();
        break;
        
      case 'backup':
        await runner.createBackup(argument);
        break;
        
      case 'restore':
        if (!argument) {
          console.error('❌ Please specify backup file to restore');
          process.exit(1);
        }
        await runner.restoreBackup(argument);
        break;
        
      default:
        console.log(`
AgentLink Database Migration Runner

Usage:
  npm run migrate:up              # Run all pending migrations
  npm run migrate:down [name]     # Rollback migration (latest or specified)
  npm run migrate:reset           # Reset to original schema
  npm run migrate:status          # Show migration status
  npm run migrate:validate        # Validate current schema
  npm run migrate:backup [file]   # Create database backup
  npm run migrate:restore <file>  # Restore from backup

Examples:
  npm run migrate:up
  npm run migrate:down 007
  npm run migrate:backup my-backup.sql
  npm run migrate:restore backups/backup-2025-01-15.sql
        `);
        break;
    }
    
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  } finally {
    await runner.disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { MigrationRunner };
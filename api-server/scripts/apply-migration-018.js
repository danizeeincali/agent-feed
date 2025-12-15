#!/usr/bin/env node

/**
 * Apply Migration 018: Onboarding Timestamps
 *
 * This script applies the onboarding_state timestamp migration to the production database.
 * It includes backup and rollback functionality for safety.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../../database.db');
const BACKUP_PATH = path.join(__dirname, '../../.archives/database-backups/2025-11-13');
const MIGRATION_FILE = path.join(__dirname, '../db/migrations/018-onboarding-timestamps.sql');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createBackup() {
  log('\n=== Creating Database Backup ===', 'cyan');

  if (!fs.existsSync(DB_PATH)) {
    log(`✗ Database not found at ${DB_PATH}`, 'red');
    process.exit(1);
  }

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.mkdirSync(BACKUP_PATH, { recursive: true });
    log(`Created backup directory: ${BACKUP_PATH}`, 'blue');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_PATH, `database-pre-migration-018-${timestamp}.db`);

  try {
    fs.copyFileSync(DB_PATH, backupFile);
    log(`✓ Backup created: ${backupFile}`, 'green');
    return backupFile;
  } catch (error) {
    log(`✗ Backup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkMigrationStatus(db) {
  log('\n=== Checking Migration Status ===', 'cyan');

  try {
    // Check if columns already exist
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='onboarding_state'").get();

    if (!schema) {
      log('✗ onboarding_state table not found', 'red');
      process.exit(1);
    }

    const hasCreatedAt = schema.sql.includes('created_at');
    const hasUpdatedAt = schema.sql.includes('updated_at');

    if (hasCreatedAt && hasUpdatedAt) {
      log('⚠ Migration appears to already be applied', 'yellow');
      log('Columns created_at and updated_at already exist', 'yellow');
      return 'already_applied';
    }

    log('✓ Migration has not been applied yet', 'green');
    return 'ready';

  } catch (error) {
    log(`✗ Status check failed: ${error.message}`, 'red');
    throw error;
  }
}

function getRowCount(db) {
  const result = db.prepare('SELECT COUNT(*) as count FROM onboarding_state').get();
  return result.count;
}

function applyMigration(db) {
  log('\n=== Applying Migration 018 ===', 'cyan');

  if (!fs.existsSync(MIGRATION_FILE)) {
    log(`✗ Migration file not found: ${MIGRATION_FILE}`, 'red');
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const rowCountBefore = getRowCount(db);

  log(`Current row count: ${rowCountBefore}`, 'blue');

  try {
    db.exec(migrationSQL);

    const rowCountAfter = getRowCount(db);

    if (rowCountBefore !== rowCountAfter) {
      log(`✗ Row count mismatch! Before: ${rowCountBefore}, After: ${rowCountAfter}`, 'red');
      throw new Error('Data loss detected during migration');
    }

    log(`✓ Migration applied successfully`, 'green');
    log(`✓ Row count verified: ${rowCountAfter}`, 'green');

  } catch (error) {
    log(`✗ Migration failed: ${error.message}`, 'red');
    throw error;
  }
}

function verifyMigration(db) {
  log('\n=== Verifying Migration ===', 'cyan');

  let allChecks = true;

  // Check 1: Schema
  log('Checking schema...', 'blue');
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='onboarding_state'").get();

  if (schema.sql.includes('created_at') && schema.sql.includes('updated_at')) {
    log('  ✓ Columns exist in schema', 'green');
  } else {
    log('  ✗ Columns missing from schema', 'red');
    allChecks = false;
  }

  // Check 2: Triggers (optional - application-level management)
  log('Checking triggers...', 'blue');
  const triggers = db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='trigger' AND tbl_name='onboarding_state'").get();

  if (triggers.count === 0) {
    log(`  ℹ No triggers (application-level timestamp management)`, 'blue');
  } else {
    log(`  ✓ Found ${triggers.count} triggers`, 'green');
  }

  // Check 3: Data integrity
  log('Checking data integrity...', 'blue');
  const nullChecks = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN created_at IS NULL THEN 1 ELSE 0 END) as null_created,
      SUM(CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END) as null_updated
    FROM onboarding_state
  `).get();

  if (nullChecks.total === 0) {
    log(`  ℹ No rows to verify (empty table)`, 'blue');
  } else if (nullChecks.null_created === 0 && nullChecks.null_updated === 0) {
    log(`  ✓ All ${nullChecks.total} rows have timestamps`, 'green');
  } else {
    log(`  ✗ Found NULL timestamps: created_at=${nullChecks.null_created}, updated_at=${nullChecks.null_updated}`, 'red');
    allChecks = false;
  }

  // Check 4: Sample data
  log('Checking sample data...', 'blue');
  const samples = db.prepare('SELECT user_id, started_at, created_at, last_interaction_at, updated_at FROM onboarding_state LIMIT 3').all();

  if (samples.length === 0) {
    log('  ℹ No sample data available (empty table)', 'blue');
  } else {
    samples.forEach(row => {
      log(`  Sample: ${row.user_id}`, 'yellow');
      log(`    started_at: ${row.started_at}`, 'yellow');
      log(`    created_at: ${row.created_at} ${row.created_at === row.started_at ? '✓' : '✗'}`, row.created_at === row.started_at ? 'green' : 'red');
      log(`    last_interaction_at: ${row.last_interaction_at || 'NULL'}`, 'yellow');
      log(`    updated_at: ${row.updated_at}`, 'yellow');

      if (row.created_at !== row.started_at) {
        allChecks = false;
      }
    });
  }

  return allChecks;
}

function displaySummary(db) {
  log('\n=== Migration Summary ===', 'cyan');

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_rows,
      MIN(created_at) as earliest_created,
      MAX(created_at) as latest_created,
      MIN(updated_at) as earliest_updated,
      MAX(updated_at) as latest_updated
    FROM onboarding_state
  `).get();

  log(`Total rows: ${stats.total_rows}`, 'blue');

  if (stats.total_rows > 0) {
    log(`Earliest created_at: ${new Date(stats.earliest_created).toISOString()}`, 'blue');
    log(`Latest created_at: ${new Date(stats.latest_created).toISOString()}`, 'blue');
    log(`Earliest updated_at: ${new Date(stats.earliest_updated).toISOString()}`, 'blue');
    log(`Latest updated_at: ${new Date(stats.latest_updated).toISOString()}`, 'blue');
  } else {
    log('No data to summarize (empty table)', 'blue');
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════╗', 'magenta');
  log('║  Apply Migration 018: Onboarding Timestamps   ║', 'magenta');
  log('╚════════════════════════════════════════════════╝', 'magenta');

  let db;
  let backupFile;

  try {
    // Step 1: Create backup
    backupFile = createBackup();

    // Step 2: Open database
    log('\n=== Opening Database ===', 'cyan');
    db = new Database(DB_PATH);
    log(`✓ Database opened: ${DB_PATH}`, 'green');

    // Step 3: Check migration status
    const status = checkMigrationStatus(db);

    if (status === 'already_applied') {
      log('\n⚠ Migration already applied. Skipping...', 'yellow');
      log('Use the test script to verify integrity if needed.', 'blue');
      db.close();
      process.exit(0);
    }

    // Step 4: Apply migration
    applyMigration(db);

    // Step 5: Verify migration
    const verificationPassed = verifyMigration(db);

    if (!verificationPassed) {
      log('\n✗ Verification failed! Rolling back...', 'red');
      db.close();
      fs.copyFileSync(backupFile, DB_PATH);
      log('✓ Database restored from backup', 'green');
      process.exit(1);
    }

    // Step 6: Display summary
    displaySummary(db);

    // Close database
    db.close();

    log('\n╔════════════════════════════════════════════════╗', 'green');
    log('║  Migration 018 Applied Successfully!          ║', 'green');
    log('╚════════════════════════════════════════════════╝', 'green');

    log(`\n✓ Backup available at: ${backupFile}`, 'blue');
    log('✓ Database migrated successfully', 'green');
    log('✓ All verification checks passed', 'green');

  } catch (error) {
    log(`\n✗ Migration failed: ${error.message}`, 'red');
    console.error(error);

    if (db) {
      db.close();
    }

    if (backupFile && fs.existsSync(backupFile)) {
      log('\n⚠ Attempting to restore from backup...', 'yellow');
      try {
        fs.copyFileSync(backupFile, DB_PATH);
        log('✓ Database restored from backup', 'green');
      } catch (restoreError) {
        log(`✗ Restore failed: ${restoreError.message}`, 'red');
        log(`Manual restore required from: ${backupFile}`, 'yellow');
      }
    }

    process.exit(1);
  }
}

// Run the migration
main();

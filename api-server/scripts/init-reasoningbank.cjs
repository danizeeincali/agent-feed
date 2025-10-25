#!/usr/bin/env node
/**
 * ReasoningBank Database Initialization Script
 *
 * This script initializes the ReasoningBank SQLite database directly
 * using better-sqlite3 and the schema file.
 *
 * Usage:
 *   node api-server/scripts/init-reasoningbank.cjs
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const DB_PATH = path.join(process.cwd(), 'prod', '.reasoningbank', 'memory.db');
const SCHEMA_PATH = path.join(process.cwd(), 'api-server', 'db', 'reasoningbank-schema.sql');
const BACKUP_DIR = path.join(process.cwd(), 'prod', '.reasoningbank', 'backups');

async function main() {
  console.log('='.repeat(60));
  console.log('ReasoningBank Database Initialization');
  console.log('='.repeat(60));
  console.log();

  try {
    // Step 1: Ensure directories exist
    console.log('Step 1: Creating directory structure...');
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log('  ✅ Created database directory:', dbDir);
    } else {
      console.log('  ✅ Database directory exists:', dbDir);
    }

    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      console.log('  ✅ Created backup directory:', BACKUP_DIR);
    } else {
      console.log('  ✅ Backup directory exists:', BACKUP_DIR);
    }
    console.log();

    // Step 2: Open database connection
    console.log('Step 2: Opening database connection...');
    const db = new Database(DB_PATH, { verbose: console.log });
    console.log('  ✅ Database connection opened');
    console.log();

    // Step 3: Apply schema
    console.log('Step 3: Applying schema...');

    // Check if schema already applied
    const tables = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type='table' AND name IN ('patterns', 'pattern_outcomes', 'pattern_relationships')
    `).get();

    if (tables.count === 3) {
      console.log('  ⚠️  Schema already applied, skipping');
    } else {
      const schemaSQL = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      db.exec(schemaSQL);
      console.log('  ✅ Schema applied successfully');
    }
    console.log();

    // Step 4: Verify schema
    console.log('Step 4: Verifying schema...');
    const allTables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all().map(row => row.name);

    console.log('  Tables created:', allTables.length);
    allTables.forEach(table => console.log('    -', table));

    const indexes = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name
    `).all().map(row => row.name);

    console.log('  Indexes created:', indexes.length);

    const views = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='view' AND name LIKE 'v_%' ORDER BY name
    `).all().map(row => row.name);

    console.log('  Views created:', views.length);
    console.log();

    // Step 5: Health checks
    console.log('Step 5: Running health checks...');

    // Check WAL mode
    const journalMode = db.pragma('journal_mode', { simple: true });
    console.log('  Journal mode:', journalMode, journalMode === 'wal' ? '✅' : '❌');

    // Check foreign keys
    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    console.log('  Foreign keys:', foreignKeys === 1 ? 'enabled ✅' : 'disabled ❌');

    // Check read capability
    try {
      db.prepare('SELECT COUNT(*) FROM patterns').get();
      console.log('  Read capability: ✅');
    } catch (error) {
      console.log('  Read capability: ❌', error.message);
    }

    // Check write capability
    try {
      const testId = `health-check-${Date.now()}`;
      const now = Date.now();
      const embedding = Buffer.alloc(4096, 0);

      db.prepare(`
        INSERT INTO patterns (id, content, embedding, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(testId, 'Health check test', embedding, now, now);

      db.prepare('DELETE FROM patterns WHERE id = ?').run(testId);
      console.log('  Write capability: ✅');
    } catch (error) {
      console.log('  Write capability: ❌', error.message);
    }
    console.log();

    // Step 6: Get statistics
    console.log('Step 6: Database statistics...');
    const stats = {
      totalPatterns: db.prepare('SELECT COUNT(*) as count FROM patterns').get().count,
      totalOutcomes: db.prepare('SELECT COUNT(*) as count FROM pattern_outcomes').get().count,
      totalRelationships: db.prepare('SELECT COUNT(*) as count FROM pattern_relationships').get().count,
      pageCount: db.pragma('page_count', { simple: true }),
      pageSize: db.pragma('page_size', { simple: true })
    };

    stats.databaseSizeBytes = stats.pageCount * stats.pageSize;
    stats.databaseSizeMB = stats.databaseSizeBytes / (1024 * 1024);

    console.log('  Total patterns:', stats.totalPatterns);
    console.log('  Total outcomes:', stats.totalOutcomes);
    console.log('  Total relationships:', stats.totalRelationships);
    console.log('  Database size:', stats.databaseSizeMB.toFixed(2), 'MB');
    console.log();

    // Step 7: Create backup
    console.log('Step 7: Creating initial backup...');
    const timestamp = new Date().toISOString().split('T')[0];
    const backupPath = path.join(BACKUP_DIR, `memory-${timestamp}-init.db`);

    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    db.backup(backupPath);

    // Wait a moment for backup to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    if (fs.existsSync(backupPath)) {
      const backupStats = fs.statSync(backupPath);
      const backupData = fs.readFileSync(backupPath);
      const checksum = crypto.createHash('sha256').update(backupData).digest('hex');

      console.log('  ✅ Backup created:', backupPath);
      console.log('  Size:', (backupStats.size / 1024).toFixed(2), 'KB');
      console.log('  Checksum:', checksum.substring(0, 16) + '...');
    } else {
      console.log('  ⚠️  Backup file not found immediately, may still be writing');
    }
    console.log();

    // Close connection
    db.close();

    console.log('='.repeat(60));
    console.log('✅ ReasoningBank initialization complete!');
    console.log('='.repeat(60));
    console.log();
    console.log('Database location:', DB_PATH);
    console.log('Backup location:', backupPath);
    console.log();
    console.log('Next steps:');
    console.log('  1. Add environment variables to .env');
    console.log('  2. Integrate service into server startup');
    console.log('  3. Run tests: npm test tests/unit/reasoningbank-*.test.js');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error();
    console.error('❌ Error initializing ReasoningBank:');
    console.error(error.message);
    console.error();
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

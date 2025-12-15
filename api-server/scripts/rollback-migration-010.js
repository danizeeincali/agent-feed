import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('⚠️  ROLLBACK Migration 010: Remove User Settings Table');
console.log('='.repeat(60));
console.log('WARNING: This will remove the user_settings table!');
console.log('A backup will be created before deletion.');
console.log('='.repeat(60));

// Open database
const dbPath = join(__dirname, '..', '..', 'database.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Check if table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='user_settings'
  `).get();

  if (!tableExists) {
    console.log('ℹ️  user_settings table does not exist. Nothing to rollback.');
    process.exit(0);
  }

  // Show current data
  console.log('\n📊 Current data in user_settings:');
  const currentData = db.prepare('SELECT * FROM user_settings').all();
  console.table(currentData);
  console.log(`Total records: ${currentData.length}`);

  // Read rollback migration file
  const rollbackPath = join(__dirname, '..', 'db', 'migrations', '010-user-settings-down.sql');
  const rollbackSQL = readFileSync(rollbackPath, 'utf8');

  console.log('\n✅ Rollback file loaded');

  // Execute rollback
  console.log('Executing rollback SQL...');
  db.exec(rollbackSQL);

  // Verify table was removed
  const afterRollback = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='user_settings'
  `).get();

  if (afterRollback) {
    throw new Error('❌ Rollback failed: user_settings table still exists');
  }

  console.log('\n✅ user_settings table removed');

  // Verify backup was created
  const backupExists = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='user_settings_rollback_backup'
  `).get();

  if (backupExists) {
    const backupData = db.prepare('SELECT * FROM user_settings_rollback_backup').all();
    console.log(`✅ Backup created: user_settings_rollback_backup (${backupData.length} records)`);
  } else {
    console.log('⚠️  No backup table created (original table was empty)');
  }

  // Verify triggers removed
  const triggersRemaining = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='trigger' AND tbl_name='user_settings'
  `).all();

  if (triggersRemaining.length === 0) {
    console.log('✅ All triggers removed');
  } else {
    throw new Error(`❌ ${triggersRemaining.length} triggers still exist`);
  }

  // Verify indexes removed
  const indexesRemaining = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='index' AND tbl_name='user_settings'
  `).all();

  if (indexesRemaining.length === 0) {
    console.log('✅ All indexes removed');
  } else {
    throw new Error(`❌ ${indexesRemaining.length} indexes still exist`);
  }

  console.log('\n✅ Migration 010 rollback completed successfully!');
  console.log('='.repeat(60));
  console.log('To restore: Re-run scripts/run-migration-010.js');

} catch (error) {
  console.error('\n❌ Rollback failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Running Migration 008: Add Cache Token Columns');
console.log('='.repeat(60));

// Open database
const dbPath = join(__dirname, '..', '..', 'database.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);

try {
  // Read migration file
  const migrationPath = join(__dirname, '..', 'db', 'migrations', '008-add-cache-tokens.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('✅ Migration file loaded');

  // Get record count before migration
  const beforeCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
  console.log('📊 Records before migration:', beforeCount.count);

  // Execute migration - use db.exec() which handles multiple statements
  console.log('Executing migration SQL...');
  db.exec(migrationSQL);

  // Verify columns were added
  const tableInfo = db.prepare('PRAGMA table_info(token_analytics)').all();
  const columnNames = tableInfo.map(col => col.name);

  console.log('\n📋 Table columns after migration:');
  tableInfo.forEach(col => {
    const marker = (col.name === 'cacheReadTokens' || col.name === 'cacheCreationTokens') ? '✨ NEW' : '';
    console.log(`  - ${col.name} (${col.type}) ${marker}`);
  });

  // Verify columns exist
  if (!columnNames.includes('cacheReadTokens')) {
    throw new Error('❌ cacheReadTokens column not found after migration');
  }
  if (!columnNames.includes('cacheCreationTokens')) {
    throw new Error('❌ cacheCreationTokens column not found after migration');
  }

  // Get record count after migration
  const afterCount = db.prepare('SELECT COUNT(*) as count FROM token_analytics').get();
  console.log('\n📊 Records after migration:', afterCount.count);

  // Verify no data loss
  if (afterCount.count !== beforeCount.count) {
    throw new Error(`❌ Data loss detected! Before: ${beforeCount.count}, After: ${afterCount.count}`);
  }

  console.log('\n✅ Migration 008 completed successfully!');
  console.log('='.repeat(60));

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}

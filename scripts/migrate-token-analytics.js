/**
 * Migration script for Token Analytics Database
 * Adds message_id column and updates schema
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = join(__dirname, '../data/token-analytics.db');

console.log('Starting database migration for Token Analytics...');
console.log('Database path:', dbPath);

try {
  const db = new Database(dbPath);

  // Check if message_id column already exists
  const tableInfo = db.prepare("PRAGMA table_info(token_usage)").all();
  const hasMessageId = tableInfo.some(col => col.name === 'message_id');

  if (hasMessageId) {
    console.log('✅ message_id column already exists. No migration needed.');
  } else {
    console.log('🔧 Adding message_id column to token_usage table...');

    // Add the message_id column
    db.exec('ALTER TABLE token_usage ADD COLUMN message_id TEXT');

    // Create the unique index
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_token_usage_message_id ON token_usage(message_id)');

    console.log('✅ Migration completed successfully!');
  }

  // Verify the table structure
  const finalTableInfo = db.prepare("PRAGMA table_info(token_usage)").all();
  console.log('\n📊 Current table structure:');
  finalTableInfo.forEach(col => {
    console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });

  // Check indexes
  const indexes = db.prepare("PRAGMA index_list(token_usage)").all();
  console.log('\n🔍 Indexes:');
  indexes.forEach(idx => {
    console.log(`  - ${idx.name} (${idx.unique ? 'UNIQUE' : 'INDEX'})`);
  });

  db.close();
  console.log('\n✅ Database migration completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database.db');
const migrationPath = path.resolve(__dirname, '../db/migrations/005-work-queue.sql');

console.log('📊 Applying work queue migration...');
console.log('Database:', dbPath);
console.log('Migration:', migrationPath);

const db = new Database(dbPath);
const migration = fs.readFileSync(migrationPath, 'utf-8');

try {
  db.exec(migration);
  console.log('✅ Migration applied successfully');

  // Verify table created
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='work_queue_tickets'").all();
  console.log('📋 Table created:', tables.length > 0 ? 'work_queue_tickets' : 'NONE');

  // Verify indexes created
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='work_queue_tickets'").all();
  console.log('📇 Indexes created:', indexes.map(idx => idx.name).join(', '));

  // Show table schema
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='work_queue_tickets'").get();
  console.log('\n📄 Table Schema:');
  console.log(schema.sql);

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}

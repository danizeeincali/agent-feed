#!/usr/bin/env node
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database.db');
const migrationsDir = path.join(__dirname, '../db/migrations');

console.log('🗄️  Initializing fresh database...');
console.log(`📂 Database: ${dbPath}`);
console.log(`📂 Migrations: ${migrationsDir}\n`);

// Create database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Get all migration files
const migrations = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && !f.includes('-down'))
  .sort();

console.log(`📋 Found ${migrations.length} migrations:\n`);

// Apply each migration
for (const migration of migrations) {
  const migrationPath = path.join(migrationsDir, migration);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    console.log(`   ⏳ Applying ${migration}...`);
    db.exec(sql);
    console.log(`   ✅ ${migration} applied successfully`);
  } catch (error) {
    console.error(`   ❌ Error applying ${migration}:`, error.message);
    if (!error.message.includes('already exists')) {
      throw error;
    }
  }
}

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`\n✅ Database initialized with ${tables.length} tables:`);
tables.forEach(t => console.log(`   - ${t.name}`));

db.close();
console.log('\n✅ Database initialization complete!');

#!/usr/bin/env node
/**
 * Run All SQL Migrations
 * Applies all migrations from /db/migrations/ directory in order
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = '/workspaces/agent-feed/database.db';
const MIGRATIONS_DIR = path.join(__dirname, 'db/migrations');

// Ordered list of migrations to apply
const migrations = [
  '001-initial-schema.sql',
  '002-comments.sql',
  '003-agents.sql',
  '004-reasoningbank-init.sql',
  '005-work-queue.sql',
  '010-user-settings.sql',
  '014-sequential-introductions.sql',
  '015-cache-cost-metrics.sql',
  '016-user-agent-exposure.sql',
  '017-grace-period-states.sql'
];

console.log('🚀 Running all migrations...\n');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

let applied = 0;
let failed = 0;

for (const migration of migrations) {
  const migrationPath = path.join(MIGRATIONS_DIR, migration);

  if (!fs.existsSync(migrationPath)) {
    console.log(`⏭️  Skipping ${migration} (file not found)`);
    continue;
  }

  try {
    console.log(`📦 Applying ${migration}...`);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    db.exec(sql);
    console.log(`✅ ${migration} applied successfully\n`);
    applied++;
  } catch (error) {
    console.error(`❌ Failed to apply ${migration}:`, error.message, '\n');
    failed++;
  }
}

console.log('\n📊 Migration Summary:');
console.log(`   Applied: ${applied}`);
console.log(`   Failed: ${failed}`);
console.log(`   Total: ${migrations.length}\n`);

// Verify key tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(`✅ Database has ${tables.length} tables`);

db.close();
console.log('\n✅ Migrations complete!');

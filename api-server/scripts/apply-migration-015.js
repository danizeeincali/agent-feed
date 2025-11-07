#!/usr/bin/env node

/**
 * Migration Script: Apply cache_cost_metrics table
 * Run: node api-server/scripts/apply-migration-015.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dbManager from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  try {
    console.log('📦 Applying migration: cache_cost_metrics table...');

    const migrationPath = path.join(__dirname, '../db/migrations/015-cache-cost-metrics.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const db = dbManager.getDatabase();

    for (const statement of statements) {
      db.exec(statement);
      console.log('✅ Executed:', statement.substring(0, 60) + '...');
    }

    console.log('🎉 Migration applied successfully!');

    // Verify table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='cache_cost_metrics'
    `).get();

    if (tableCheck) {
      console.log('✅ Table verified: cache_cost_metrics');

      // Show table schema
      const schema = db.prepare(`PRAGMA table_info(cache_cost_metrics)`).all();
      console.log('\n📋 Table schema:');
      schema.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });

      // Show indexes
      const indexes = db.prepare(`PRAGMA index_list(cache_cost_metrics)`).all();
      console.log('\n📊 Indexes:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}`);
      });
    } else {
      console.error('❌ Table verification failed');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    dbManager.close();
  }
}

applyMigration();

#!/usr/bin/env node

/**
 * Migration Script: Apply Migration 014 - Sequential Agent Introductions
 *
 * This script applies migration 014 which creates:
 * - user_engagement: Track user activity and engagement scores
 * - introduction_queue: Define agent introduction order and thresholds
 * - agent_workflows: Track special agent workflows (showcase, tutorial, etc.)
 *
 * Usage:
 *   node api-server/scripts/apply-migration-014.js
 */

import Database from 'better-sqlite3';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'database.db');
const MIGRATION_PATH = join(__dirname, '../db/migrations/014-sequential-introductions.sql');

/**
 * Apply migration 014
 * @returns {Promise<Object>} Migration result with success status and metadata
 */
export async function applyMigration() {
  let db;

  try {
    console.log('🚀 Starting Migration 014: Sequential Agent Introductions');
    console.log(`📂 Database: ${DB_PATH}`);
    console.log(`📄 Migration: ${MIGRATION_PATH}`);

    // Connect to database
    db = new Database(DB_PATH);
    console.log('✅ Database connection established');

    // Read migration SQL
    const migrationSQL = await readFile(MIGRATION_PATH, 'utf-8');
    console.log('✅ Migration SQL loaded');

    // Execute migration
    console.log('⚙️  Executing migration...');
    db.exec(migrationSQL);
    console.log('✅ Migration executed successfully');

    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    const tables = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name IN ('user_engagement', 'introduction_queue', 'agent_workflows')
      ORDER BY name
    `).all();

    const expectedTables = ['agent_workflows', 'introduction_queue', 'user_engagement'];
    const createdTables = tables.map(t => t.name);

    if (createdTables.length !== expectedTables.length) {
      throw new Error(
        `Missing required tables. Expected: ${expectedTables.join(', ')}. ` +
        `Found: ${createdTables.join(', ')}`
      );
    }

    console.log(`✅ All ${createdTables.length} tables created successfully`);

    // Verify indexes were created
    console.log('🔍 Verifying index creation...');
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='index'
      AND name LIKE 'idx_user_engagement%'
      OR name LIKE 'idx_intro_queue%'
      OR name LIKE 'idx_workflows%'
      ORDER BY name
    `).all();

    console.log(`✅ Created ${indexes.length} indexes`);

    // Verify seed data
    console.log('🔍 Verifying seed data...');
    const engagementCount = db.prepare(
      'SELECT COUNT(*) as count FROM user_engagement WHERE user_id = ?'
    ).get('demo-user-123');

    const queueCount = db.prepare(
      'SELECT COUNT(*) as count FROM introduction_queue WHERE user_id = ?'
    ).get('demo-user-123');

    console.log(`✅ User engagement record: ${engagementCount.count > 0 ? 'Created' : 'Not found'}`);
    console.log(`✅ Introduction queue entries: ${queueCount.count}`);

    // Show introduction queue
    const queue = db.prepare(`
      SELECT agent_id, priority, unlock_threshold, introduced
      FROM introduction_queue
      WHERE user_id = ?
      ORDER BY priority
    `).all('demo-user-123');

    console.log('\n📋 Introduction Queue for demo-user-123:');
    console.table(queue);

    // Close connection
    db.close();
    console.log('✅ Database connection closed');

    console.log('\n✨ Migration 014 completed successfully!\n');

    return {
      success: true,
      tablesCreated: createdTables,
      indexesCreated: indexes.length,
      queueEntries: queueCount.count,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    // Ensure database connection is closed
    if (db) {
      try {
        db.close();
      } catch (closeError) {
        console.error('⚠️  Failed to close database:', closeError.message);
      }
    }

    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

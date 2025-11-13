#!/usr/bin/env node
/**
 * Data Migration Script: user_settings -> user_claude_auth
 *
 * Migrates authentication data from user_settings table to user_claude_auth table
 * to align with migration 018 schema.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new Database(dbPath);

console.log('🔄 Starting data migration: user_settings -> user_claude_auth\n');

try {
  // Start transaction
  db.prepare('BEGIN TRANSACTION').run();

  // Get all users with auth data from user_settings
  const users = db.prepare(`
    SELECT
      user_id,
      claude_auth_method,
      claude_api_key_encrypted
    FROM user_settings
    WHERE claude_auth_method IS NOT NULL
  `).all();

  console.log(`📊 Found ${users.length} users with authentication data\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      // Check if user already exists in user_claude_auth
      const existing = db.prepare(
        'SELECT user_id FROM user_claude_auth WHERE user_id = ?'
      ).get(user.user_id);

      if (existing) {
        console.log(`⏭️  Skipping ${user.user_id} (already exists in user_claude_auth)`);
        skipped++;
        continue;
      }

      const now = Date.now();
      const authMethod = user.claude_auth_method || 'platform_payg';

      // Insert into user_claude_auth
      db.prepare(`
        INSERT INTO user_claude_auth (
          user_id,
          auth_method,
          encrypted_api_key,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        user.user_id,
        authMethod,
        user.claude_api_key_encrypted || null,
        now,
        now
      );

      console.log(`✅ Migrated ${user.user_id} (method: ${authMethod})`);
      migrated++;
    } catch (err) {
      console.error(`❌ Error migrating ${user.user_id}:`, err.message);
      errors++;
    }
  }

  // Commit transaction
  db.prepare('COMMIT').run();

  console.log('\n' + '='.repeat(50));
  console.log('📈 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Errors:   ${errors}`);
  console.log('='.repeat(50));

  // Verify migration
  console.log('\n🔍 Verification:');
  const totalInAuth = db.prepare('SELECT COUNT(*) as count FROM user_claude_auth').get();
  console.log(`   user_claude_auth table now has ${totalInAuth.count} records`);

  // Show sample data
  const sample = db.prepare(`
    SELECT user_id, auth_method,
           CASE WHEN encrypted_api_key IS NOT NULL THEN '[encrypted]' ELSE NULL END as has_key
    FROM user_claude_auth
    LIMIT 5
  `).all();

  console.log('\n📋 Sample records:');
  sample.forEach(row => {
    console.log(`   ${row.user_id}: ${row.auth_method} ${row.has_key ? '(has key)' : ''}`);
  });

  console.log('\n✅ Migration completed successfully!\n');

} catch (error) {
  // Rollback on error
  try {
    db.prepare('ROLLBACK').run();
    console.error('\n❌ Migration failed! Transaction rolled back.');
  } catch (rollbackErr) {
    console.error('❌ Rollback failed:', rollbackErr);
  }
  console.error('Error:', error);
  process.exit(1);
} finally {
  db.close();
}

/**
 * Display Name Migration Script
 * Copies display names from onboarding_state.responses to user_settings.display_name
 * TDD GREEN phase: Make tests pass
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../db/data.db');
const db = new Database(dbPath);

console.log('🔄 Migrating display names from onboarding_state to user_settings...');
console.log(`📁 Database: ${dbPath}\n`);

try {
  // Get all onboarding states with responses
  const states = db.prepare('SELECT user_id, responses FROM onboarding_state').all();

  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const state of states) {
    try {
      const responses = JSON.parse(state.responses);

      if (responses.name) {
        // Upsert into user_settings
        db.prepare(`
          INSERT INTO user_settings (user_id, display_name, onboarding_completed, onboarding_completed_at)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            display_name = excluded.display_name,
            onboarding_completed = excluded.onboarding_completed,
            onboarding_completed_at = excluded.onboarding_completed_at
        `).run(state.user_id, responses.name, Date.now());

        console.log(`✅ Migrated: ${state.user_id} → ${responses.name}`);
        migratedCount++;
      } else {
        console.log(`⏭️  Skipped: ${state.user_id} (no name in responses)`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error migrating ${state.user_id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Migration Summary:');
  console.log(`   Total records processed: ${states.length}`);
  console.log(`   ✅ Successfully migrated: ${migratedCount}`);
  console.log(`   ⏭️  Skipped (no name): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('='.repeat(60) + '\n');

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
  console.log('🔒 Database connection closed');
}

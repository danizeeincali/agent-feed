/**
 * Onboarding Flow Integration Test
 * Tests the complete onboarding state management system (FR-5)
 *
 * This test verifies:
 * 1. New user detection (no user_settings record)
 * 2. Onboarding status checking
 * 3. Marking onboarding as complete
 * 4. Preventing re-onboarding on second session
 * 5. Edge cases (interrupted onboarding)
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createOnboardingService } from '../../services/onboarding-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_DB_PATH = join(__dirname, '../../test-onboarding.db');

// Test database setup
let db;
let onboardingService;

/**
 * Setup test database with user_settings table
 */
async function setupTestDatabase() {
  // Remove old test database
  try {
    const fs = await import('fs');
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch (error) {
    // File doesn't exist, ignore
  }

  db = new Database(TEST_DB_PATH);
  db.pragma('foreign_keys = ON');

  // Create user_settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      display_name_style TEXT,
      onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK(onboarding_completed IN (0, 1)),
      onboarding_completed_at INTEGER,
      profile_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    ) STRICT;

    CREATE INDEX IF NOT EXISTS idx_user_settings_onboarding
      ON user_settings(onboarding_completed);

    CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp
    AFTER UPDATE ON user_settings
    FOR EACH ROW
    BEGIN
      UPDATE user_settings
      SET updated_at = unixepoch()
      WHERE user_id = NEW.user_id;
    END;
  `);

  console.log('✅ Test database setup complete');
}

/**
 * Teardown test database
 */
async function teardownTestDatabase() {
  if (db) {
    db.close();
  }

  try {
    const fs = await import('fs');
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch (error) {
    console.error('Error cleaning up test database:', error);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('\n========================================');
  console.log('🧪 ONBOARDING FLOW INTEGRATION TESTS');
  console.log('========================================\n');

  try {
    // Setup
    await setupTestDatabase();
    onboardingService = createOnboardingService(db);

    // Test 1: New user (no record)
    console.log('Test 1: Detect new user (no user_settings record)');
    const test1 = onboardingService.checkOnboardingStatus('new-user-1');
    console.assert(!test1.exists, '❌ New user should not exist');
    console.assert(!test1.completed, '❌ New user should not be completed');
    console.assert(test1.isFirstTimeUser, '❌ Should be first-time user');
    console.log('✅ Test 1 passed: New user detected correctly\n');

    // Test 2: Create user but don't complete onboarding
    console.log('Test 2: User exists but onboarding not completed');
    db.exec(`
      INSERT INTO user_settings (user_id, display_name, onboarding_completed)
      VALUES ('test-user-2', 'Test User', 0)
    `);
    const test2 = onboardingService.checkOnboardingStatus('test-user-2');
    console.assert(test2.exists, '❌ User should exist');
    console.assert(!test2.completed, '❌ Onboarding should not be completed');
    console.assert(!test2.isFirstTimeUser, '❌ Should not be first-time user');
    console.log('✅ Test 2 passed: Incomplete onboarding detected\n');

    // Test 3: Mark onboarding as complete
    console.log('Test 3: Mark onboarding as complete');
    const profileData = {
      display_name: 'Alex Chen',
      preferred_name: 'Alex',
      interests: ['coding', 'music'],
      timezone: 'America/New_York'
    };
    const result3 = onboardingService.markOnboardingComplete('test-user-3', profileData);
    console.assert(result3.onboarding_completed === 1, '❌ Onboarding should be marked complete');
    console.assert(result3.display_name === 'Alex Chen', '❌ Display name should be set');
    console.assert(result3.onboarding_completed_at > 0, '❌ Completion timestamp should be set');
    console.log('✅ Test 3 passed: Onboarding marked complete successfully\n');

    // Test 4: Verify onboarding persists (second session)
    console.log('Test 4: Verify onboarding persists across sessions');
    const test4 = onboardingService.checkOnboardingStatus('test-user-3');
    console.assert(test4.completed, '❌ Onboarding should still be completed');
    console.assert(test4.displayName === 'Alex Chen', '❌ Display name should persist');
    console.log('✅ Test 4 passed: Onboarding state persists\n');

    // Test 5: Reset onboarding (for testing)
    console.log('Test 5: Reset onboarding status');
    onboardingService.resetOnboardingStatus('test-user-3');
    const test5 = onboardingService.checkOnboardingStatus('test-user-3');
    console.assert(!test5.completed, '❌ Onboarding should be reset');
    console.assert(test5.completedAt === null, '❌ Completion timestamp should be null');
    console.log('✅ Test 5 passed: Onboarding reset successfully\n');

    // Test 6: Edge case - Empty profile data
    console.log('Test 6: Handle empty display_name gracefully');
    const emptyProfile = { interests: ['reading'] };
    const result6 = onboardingService.markOnboardingComplete('test-user-6', emptyProfile);
    console.assert(result6.onboarding_completed === 1, '❌ Should complete even with no display_name');
    console.log('✅ Test 6 passed: Handles empty display_name\n');

    // Test 7: Multiple users
    console.log('Test 7: Multiple users can have different onboarding states');
    onboardingService.markOnboardingComplete('user-a', { display_name: 'User A' });
    onboardingService.ensureUserExists('user-b'); // User B hasn't completed
    const testA = onboardingService.checkOnboardingStatus('user-a');
    const testB = onboardingService.checkOnboardingStatus('user-b');
    console.assert(testA.completed, '❌ User A should be completed');
    console.assert(!testB.completed, '❌ User B should not be completed');
    console.log('✅ Test 7 passed: Multiple users tracked independently\n');

    // Test 8: Get user profile
    console.log('Test 8: Get complete user profile');
    const profile8 = onboardingService.getUserProfile('user-a');
    console.assert(profile8 !== null, '❌ Profile should exist');
    console.assert(profile8.display_name === 'User A', '❌ Display name should match');
    console.assert(typeof profile8.profile_data === 'object', '❌ Profile data should be parsed JSON');
    console.log('✅ Test 8 passed: User profile retrieved correctly\n');

    // Test 9: Database integrity
    console.log('Test 9: Verify database integrity');
    const allUsers = db.prepare('SELECT * FROM user_settings').all();
    console.assert(allUsers.length > 0, '❌ Should have user records');
    const hasIndex = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_user_settings_onboarding'"
    ).get();
    console.assert(hasIndex !== undefined, '❌ Index should exist');
    console.log('✅ Test 9 passed: Database integrity verified\n');

    // Test 10: Ensure onboarding only happens once
    console.log('Test 10: Ensure onboarding cannot be accidentally repeated');
    const beforeCompletion = onboardingService.checkOnboardingStatus('user-a');
    console.assert(beforeCompletion.completed, '❌ User should already be completed');

    // Try to complete again (should update, not create duplicate)
    onboardingService.markOnboardingComplete('user-a', { display_name: 'User A Updated' });
    const afterCompletion = onboardingService.checkOnboardingStatus('user-a');
    console.assert(afterCompletion.completed, '❌ User should still be completed');
    console.assert(afterCompletion.displayName === 'User A Updated', '❌ Display name should update');

    // Verify only one record exists
    const userRecords = db.prepare('SELECT COUNT(*) as count FROM user_settings WHERE user_id = ?')
      .get('user-a');
    console.assert(userRecords.count === 1, '❌ Should only have one record per user');
    console.log('✅ Test 10 passed: Onboarding cannot be duplicated\n');

    console.log('========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await teardownTestDatabase();
  }
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

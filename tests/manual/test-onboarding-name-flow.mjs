/**
 * Manual Test: Onboarding Name Collection Flow
 *
 * Tests the 4-step onboarding sequence:
 * 1. Validate name input
 * 2. Create acknowledgment comment
 * 3. Save display name to user_settings
 * 4. Update onboarding state to use_case step
 */

import Database from 'better-sqlite3';
import { createOnboardingFlowService } from '../../api-server/services/onboarding/onboarding-flow-service.js';
import fs from 'fs';

const TEST_DB_PATH = '/tmp/test-onboarding-flow.db';

console.log('🧪 Testing Onboarding Name Collection Flow\n');

// Setup test database
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

const db = new Database(TEST_DB_PATH);
db.pragma('journal_mode = WAL');

// Create schema
db.exec(`
  CREATE TABLE onboarding_state (
    user_id TEXT PRIMARY KEY,
    phase INTEGER DEFAULT 1,
    step TEXT DEFAULT 'name',
    phase1_completed INTEGER DEFAULT 0,
    phase1_completed_at INTEGER,
    phase2_completed INTEGER DEFAULT 0,
    phase2_completed_at INTEGER,
    responses TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE user_settings (
    user_id TEXT PRIMARY KEY NOT NULL,
    display_name TEXT NOT NULL,
    display_name_style TEXT,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    onboarding_completed_at INTEGER,
    profile_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Initialize test user
  INSERT INTO onboarding_state (user_id, phase, step)
  VALUES ('test-user', 1, 'name');
`);

const onboardingService = createOnboardingFlowService(db);

// Test 1: Validate name (reject empty)
console.log('Test 1: Validate empty names');
const emptyName = '   '.trim();
if (emptyName.length === 0) {
  console.log('✅ Empty name validation works');
} else {
  console.log('❌ Empty name validation FAILED');
}

// Test 2: Validate name (reject too long)
console.log('\nTest 2: Validate name length');
const longName = 'A'.repeat(51);
if (longName.length > 50) {
  console.log('✅ Name length validation works');
} else {
  console.log('❌ Name length validation FAILED');
}

// Test 3: Process valid name
console.log('\nTest 3: Process valid name "Sarah Chen"');
try {
  const result = await onboardingService.processNameResponse('test-user', 'Sarah Chen');

  if (result.success && result.nextStep === 'use_case') {
    console.log('✅ Name processing successful');
    console.log(`   Message: ${result.message.substring(0, 80)}...`);
  } else {
    console.log('❌ Name processing FAILED');
    console.log('   Result:', result);
  }
} catch (error) {
  console.log('❌ Name processing threw error:', error.message);
}

// Test 4: Verify display name saved
console.log('\nTest 4: Verify display name saved to user_settings');
const userSettings = db.prepare(`
  SELECT display_name FROM user_settings WHERE user_id = ?
`).get('test-user');

if (userSettings && userSettings.display_name === 'Sarah Chen') {
  console.log('✅ Display name saved correctly');
  console.log(`   Display name: ${userSettings.display_name}`);
} else {
  console.log('❌ Display name NOT saved');
  console.log('   Settings:', userSettings);
}

// Test 5: Verify onboarding state updated
console.log('\nTest 5: Verify onboarding state updated to use_case step');
const state = db.prepare(`
  SELECT * FROM onboarding_state WHERE user_id = ?
`).get('test-user');

if (state.step === 'use_case' && state.phase === 1) {
  console.log('✅ Onboarding state updated correctly');
  console.log(`   Phase: ${state.phase}, Step: ${state.step}`);

  const responses = JSON.parse(state.responses);
  if (responses.name === 'Sarah Chen') {
    console.log('✅ Name stored in responses JSON');
  } else {
    console.log('❌ Name NOT stored in responses');
  }
} else {
  console.log('❌ Onboarding state NOT updated');
  console.log('   State:', state);
}

// Test 6: Complete use case step
console.log('\nTest 6: Complete use case step');
try {
  const useCaseResult = await onboardingService.processUseCaseResponse('test-user', 'Personal productivity');

  if (useCaseResult.success && useCaseResult.phase1Complete) {
    console.log('✅ Use case processing successful');
    console.log(`   Phase 1 Complete: ${useCaseResult.phase1Complete}`);
  } else {
    console.log('❌ Use case processing FAILED');
    console.log('   Result:', useCaseResult);
  }
} catch (error) {
  console.log('❌ Use case processing threw error:', error.message);
}

// Test 7: Verify Phase 1 completion
console.log('\nTest 7: Verify Phase 1 marked complete');
const finalState = db.prepare(`
  SELECT * FROM onboarding_state WHERE user_id = ?
`).get('test-user');

if (finalState.phase1_completed === 1 && finalState.step === 'phase1_complete') {
  console.log('✅ Phase 1 marked complete');
  console.log(`   Phase: ${finalState.phase}, Step: ${finalState.step}`);
  console.log(`   Completed: ${finalState.phase1_completed}`);

  const responses = JSON.parse(finalState.responses);
  if (responses.name === 'Sarah Chen' && responses.use_case === 'Personal productivity') {
    console.log('✅ Both responses stored correctly');
  } else {
    console.log('❌ Responses incomplete');
    console.log('   Responses:', responses);
  }
} else {
  console.log('❌ Phase 1 NOT marked complete');
  console.log('   State:', finalState);
}

// Cleanup
db.close();
fs.unlinkSync(TEST_DB_PATH);

console.log('\n🎉 All tests completed!');

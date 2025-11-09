/**
 * Manual Test: Name Persistence Fix Validation
 * Tests Issue #1: Name should persist to user_settings.display_name
 */

import Database from 'better-sqlite3';
import { createOnboardingFlowService } from '../../services/onboarding/onboarding-flow-service.js';
import { createUserSettingsService } from '../../services/user-settings-service.js';

const DB_PATH = '/workspaces/agent-feed/database.db';

console.log('🧪 Manual Test: Name Persistence Fix\n');

// Initialize services
const db = new Database(DB_PATH);
const onboardingService = createOnboardingFlowService(db);
const userSettingsService = createUserSettingsService(db);

const userId = 'demo-user-123';
const testName = 'Orko';

console.log(`📝 Test Setup:`);
console.log(`   User ID: ${userId}`);
console.log(`   Test Name: ${testName}\n`);

// Step 1: Get current display name
console.log('Step 1: Check current display name...');
const currentSettings = userSettingsService.getUserSettings(userId);
console.log(`   Current display_name: "${currentSettings?.display_name || 'NULL'}"`);

// Step 2: Process name through onboarding flow
console.log(`\nStep 2: Process name "${testName}" through onboarding flow...`);
try {
  const result = onboardingService.processNameResponse(userId, testName);
  console.log(`   ✅ processNameResponse() successful`);
  console.log(`   Message: "${result.message}"`);
  console.log(`   Next Step: ${result.nextStep}`);
} catch (error) {
  console.error(`   ❌ Error: ${error.message}`);
  process.exit(1);
}

// Step 3: Verify name was saved to user_settings
console.log(`\nStep 3: Verify name saved to user_settings...`);
const updatedSettings = userSettingsService.getUserSettings(userId);
console.log(`   Updated display_name: "${updatedSettings?.display_name || 'NULL'}"`);

// Step 4: Verify with direct database query
console.log(`\nStep 4: Direct database verification...`);
const dbResult = db.prepare('SELECT display_name FROM user_settings WHERE user_id = ?').get(userId);
console.log(`   Database value: "${dbResult?.display_name || 'NULL'}"`);

// Step 5: Final validation
console.log(`\n🎯 Final Validation:`);
if (dbResult?.display_name === testName) {
  console.log(`   ✅ SUCCESS: Name "${testName}" persisted correctly!`);
  console.log(`   ✅ Fix #1 VERIFIED: Name persistence working`);
} else {
  console.log(`   ❌ FAIL: Expected "${testName}", got "${dbResult?.display_name}"`);
  process.exit(1);
}

db.close();
console.log(`\n✅ All tests passed!`);

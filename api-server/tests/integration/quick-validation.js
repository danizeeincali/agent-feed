#!/usr/bin/env node

/**
 * Quick Validation Script for Onboarding Bridge Fix
 * Tests the most critical validations quickly
 */

import Database from 'better-sqlite3';

const DB_PATH = '/workspaces/agent-feed/database.db';
const API_BASE = 'http://localhost:3001';
const TEST_USER_ID = 'demo-user-123';

console.log('🧪 Quick Validation: Onboarding Bridge Permanent Fix\n');

// Connect to database
const db = new Database(DB_PATH);
console.log('✅ Connected to database\n');

// Test 1: Check onboarding state
console.log('📊 Test 1: Onboarding State');
const state = db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?').get(TEST_USER_ID);
console.log(`  Phase 1 Complete: ${state.phase1_completed === 1 ? '✅' : '❌'}`);
console.log(`  Phase 2 Complete: ${state.phase2_completed === 1 ? '✅' : '❌'}`);

// Test 2: Check for onboarding bridges
console.log('\n🔍 Test 2: Onboarding Bridges in Database');
const onboardingBridges = db.prepare(`
  SELECT COUNT(*) as count
  FROM hemingway_bridges
  WHERE user_id = ? AND active = 1 AND bridge_type IN ('next_step', 'continue_thread')
`).get(TEST_USER_ID);
console.log(`  Onboarding Bridges: ${onboardingBridges.count === 0 ? '✅ 0' : `❌ ${onboardingBridges.count}`}`);

// Test 3: Check Priority 1-2 bridges
console.log('\n⚡ Test 3: Priority 1-2 Bridges');
const priority12 = db.prepare(`
  SELECT COUNT(*) as count
  FROM hemingway_bridges
  WHERE user_id = ? AND active = 1 AND priority IN (1, 2)
`).get(TEST_USER_ID);
console.log(`  Priority 1-2 Bridges: ${priority12.count === 0 ? '✅ 0' : `❌ ${priority12.count}`}`);

// Test 4: List active bridges
console.log('\n📋 Test 4: Active Bridges');
const activeBridges = db.prepare(`
  SELECT bridge_type, priority, content
  FROM hemingway_bridges
  WHERE user_id = ? AND active = 1
  ORDER BY priority
`).all(TEST_USER_ID);

activeBridges.forEach(bridge => {
  const icon = bridge.priority >= 3 ? '✅' : '❌';
  console.log(`  ${icon} Priority ${bridge.priority}: ${bridge.bridge_type}`);
});

// Test 5: Check API response
console.log('\n🌐 Test 5: API Bridge Response');
try {
  const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
  const data = await response.json();

  const priorityOk = data.bridge.priority >= 3;
  const typeOk = !['next_step', 'continue_thread'].includes(data.bridge.bridge_type);

  console.log(`  Priority: ${priorityOk ? '✅' : '❌'} ${data.bridge.priority}`);
  console.log(`  Type: ${typeOk ? '✅' : '❌'} ${data.bridge.bridge_type}`);
  console.log(`  Content: "${data.bridge.content.substring(0, 50)}..."`);
} catch (error) {
  console.log('  ❌ API call failed:', error.message);
}

// Test 6: Multiple API calls
console.log('\n🔄 Test 6: Multiple API Calls (5 times)');
try {
  const results = [];
  for (let i = 0; i < 5; i++) {
    const response = await fetch(`${API_BASE}/api/bridges/active/${TEST_USER_ID}`);
    const data = await response.json();
    results.push(data.bridge.priority);
  }

  const allValid = results.every(p => p >= 3);
  console.log(`  All Priority 3+: ${allValid ? '✅' : '❌'} [${results.join(', ')}]`);

  // Check database again
  const onboardingAfter = db.prepare(`
    SELECT COUNT(*) as count
    FROM hemingway_bridges
    WHERE user_id = ? AND active = 1 AND bridge_type IN ('next_step', 'continue_thread')
  `).get(TEST_USER_ID);

  console.log(`  No new onboarding bridges: ${onboardingAfter.count === 0 ? '✅' : '❌'} (${onboardingAfter.count})`);
} catch (error) {
  console.log('  ❌ Multiple calls failed:', error.message);
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allPassed =
  state.phase1_completed === 1 &&
  state.phase2_completed === 1 &&
  onboardingBridges.count === 0 &&
  priority12.count === 0 &&
  activeBridges.every(b => b.priority >= 3);

if (allPassed) {
  console.log('✅ ALL VALIDATIONS PASSED');
  console.log('\n🎉 Onboarding Bridge Fix is working correctly!');
} else {
  console.log('❌ SOME VALIDATIONS FAILED');
  console.log('\n⚠️  Check the failures above and review the fix.');
}

db.close();
console.log('\n✅ Database connection closed');

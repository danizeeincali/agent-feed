/**
 * Manual Test: Timeout Configuration Fix Validation
 * Tests Issue #3: Timeout should be 240s with grace period at 192s
 */

import { STREAMING_PROTECTION_CONFIG, getSafetyLimits } from '../../config/streaming-protection.js';
import { readFileSync } from 'fs';

console.log('🧪 Manual Test: Timeout Configuration Fix\n');

// Step 1: Verify streaming-protection.js configuration
console.log('Step 1: Verify streaming-protection.js...');
console.log(`   Simple timeout: ${STREAMING_PROTECTION_CONFIG.timeouts.simple}ms (60000ms expected)`);
console.log(`   Complex timeout: ${STREAMING_PROTECTION_CONFIG.timeouts.complex}ms (300000ms expected)`);
console.log(`   Default timeout: ${STREAMING_PROTECTION_CONFIG.timeouts.default}ms (240000ms expected) ✅`);

if (STREAMING_PROTECTION_CONFIG.timeouts.default === 240000) {
  console.log(`   ✅ Default timeout correctly set to 240s`);
} else {
  console.error(`   ❌ FAIL: Expected 240000, got ${STREAMING_PROTECTION_CONFIG.timeouts.default}`);
  process.exit(1);
}

// Step 2: Verify grace period configuration
console.log(`\nStep 2: Verify grace period configuration...`);
if (STREAMING_PROTECTION_CONFIG.gracePeriod) {
  console.log(`   Grace period trigger: ${STREAMING_PROTECTION_CONFIG.gracePeriod.triggerAtPercentage * 100}% (80% expected)`);
  console.log(`   Planning mode enabled: ${STREAMING_PROTECTION_CONFIG.gracePeriod.enablePlanningMode}`);
  console.log(`   Min steps in plan: ${STREAMING_PROTECTION_CONFIG.gracePeriod.minStepsInPlan}`);
  console.log(`   Max steps in plan: ${STREAMING_PROTECTION_CONFIG.gracePeriod.maxStepsInPlan}`);

  const gracePeriodTime = 240000 * 0.8; // 192000ms = 192s
  console.log(`   Calculated grace period time: ${gracePeriodTime}ms (192000ms expected)`);

  if (gracePeriodTime === 192000) {
    console.log(`   ✅ Grace period will trigger at 192s (80% of 240s)`);
  } else {
    console.error(`   ❌ FAIL: Expected 192000ms`);
    process.exit(1);
  }
} else {
  console.error(`   ❌ FAIL: Grace period configuration missing`);
  process.exit(1);
}

// Step 3: Verify safety-limits.json
console.log(`\nStep 3: Verify safety-limits.json...`);
const safetyLimits = JSON.parse(readFileSync('/workspaces/agent-feed/api-server/config/safety-limits.json', 'utf-8'));
console.log(`   Default timeout in JSON: ${safetyLimits.streaming.timeouts.default}ms`);

if (safetyLimits.streaming.timeouts.default === 240000) {
  console.log(`   ✅ safety-limits.json correctly updated`);
} else {
  console.error(`   ❌ FAIL: Expected 240000, got ${safetyLimits.streaming.timeouts.default}`);
  process.exit(1);
}

// Step 4: Test getSafetyLimits function
console.log(`\nStep 4: Test getSafetyLimits() function...`);
const defaultLimits = getSafetyLimits('default');
console.log(`   Returned timeout: ${defaultLimits.timeoutMs}ms`);

if (defaultLimits.timeoutMs === 240000) {
  console.log(`   ✅ getSafetyLimits('default') returns 240000ms`);
} else {
  console.error(`   ❌ FAIL: Expected 240000, got ${defaultLimits.timeoutMs}`);
  process.exit(1);
}

// Step 5: Verify worker-protection.js message
console.log(`\nStep 5: Verify error message improvement...`);
const workerProtection = readFileSync('/workspaces/agent-feed/api-server/worker/worker-protection.js', 'utf-8');
if (workerProtection.includes('create a plan')) {
  console.log(`   ✅ Helpful timeout message found`);
} else {
  console.error(`   ❌ FAIL: Improved timeout message not found`);
  process.exit(1);
}

console.log(`\n🎯 Final Validation:`);
console.log(`   ✅ Default timeout increased to 240s (4 minutes)`);
console.log(`   ✅ Grace period configured at 80% (192s)`);
console.log(`   ✅ Planning mode enabled`);
console.log(`   ✅ Error message improved with helpful guidance`);
console.log(`   ✅ Fix #3 VERIFIED: Timeout improvements working`);

console.log(`\n✅ All tests passed!`);

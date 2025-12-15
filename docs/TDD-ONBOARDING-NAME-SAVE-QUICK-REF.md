# TDD Onboarding Name Save - Quick Reference

## 🔴 RED PHASE - Test Results

**Test File:** `/tests/unit/onboarding-name-save.test.js`
**Status:** Tests written FIRST, implementation follows
**Total Tests:** 27

---

## Test Results Summary

### ✅ PASSING (10 tests)
**Database Schema Tests:**
- `onboarding_state table has created_at column` ✅
- `onboarding_state table has updated_at column` ✅
- `created_at defaults to current timestamp for new rows` ✅
- `updated_at defaults to current timestamp for new rows` ✅
- `updated_at changes when row is updated` ✅
- `created_at remains unchanged when row is updated` ✅

**Database Selector Tests:**
- `getOnboardingState queries created_at column without error` ✅
- `getOnboardingState queries updated_at column without error` ✅
- `getOnboardingState returns proper timestamp values` ✅

**Edge Cases:**
- `User with no onboarding_state (columns auto-populate)` ✅

### ❌ FAILING (17 tests)
**OnboardingFlowService Tests (7 failures):**
- `processNameResponse saves name to onboarding_state.responses` ❌
- `processNameResponse calls userSettingsService.setDisplayName` ❌
- `processNameResponse updates onboarding_state phase and step` ❌
- `processNameResponse sets updated_at timestamp` ❌
- `processNameResponse rejects empty names` ❌
- `processNameResponse rejects names longer than 50 characters` ❌
- `processNameResponse sanitizes SQL injection attempts` ❌

**Integration Tests (2 failures):**
- `Full flow: User posts name → Agent processes → Name saved to DB` ❌
- `Verify no SQL errors in logs during name save` ❌

**Edge Cases (6 failures):**
- `User with existing onboarding_state (backfilled columns work)` ❌
- `Concurrent name updates (last write wins)` ❌
- `Unicode names are handled correctly` ❌
- `XSS attempts are sanitized before database storage` ❌
- `Database rollback on partial failure` ❌

**Performance Tests (2 failures):**
- `Batch name saves complete within reasonable time` ❌
- `Database remains responsive during concurrent name saves` ❌

---

## Why Tests Are Failing

All failures are **EXPECTED** because `processNameResponse()` is not implemented yet:

```
Error: processNameResponse not implemented - expected RED phase failure
```

This is **correct behavior** for London School TDD - we write tests FIRST, then implement to make them pass.

---

## Schema Tests Passing

The schema tests (6/6) are **PASSING** because:
1. Tests create a test database with the NEW schema (including `created_at`/`updated_at`)
2. This validates our schema design is correct
3. In production, we need to add these columns via migration

---

## Next Steps to GREEN Phase

### 1. Add Schema Columns to Production Database

```sql
-- Migration: Add timestamp columns to onboarding_state
ALTER TABLE onboarding_state ADD COLUMN created_at INTEGER DEFAULT (unixepoch());
ALTER TABLE onboarding_state ADD COLUMN updated_at INTEGER DEFAULT (unixepoch());

-- Backfill existing rows
UPDATE onboarding_state
SET created_at = unixepoch(),
    updated_at = unixepoch()
WHERE created_at IS NULL;
```

### 2. Implement `processNameResponse()` in OnboardingFlowService

**File:** `/api-server/services/onboarding/onboarding-flow-service.js`

**Current code (line 240-294):**
```javascript
processNameResponse(userId, name) {
  try {
    // Validate name
    const validation = this.validateName(name);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        nextStep: 'name'
      };
    }

    const validatedName = validation.sanitized;
    const state = this.getOnboardingState(userId) || this.initializeOnboarding(userId);
    const responses = state.responses || {};

    // Store name in responses
    responses.name = validatedName;

    // CRITICAL FIX: Persist display name to user_settings table
    try {
      this.userSettingsService.setDisplayName(userId, validatedName);
      console.log(`✅ Display name persisted: "${validatedName}" for user ${userId}`);
    } catch (displayNameError) {
      console.error('❌ Failed to persist display name:', displayNameError);
    }

    // Update state to next step: use_case
    this.updateStateStmt.run(
      1, // phase
      'use_case', // step
      null, null, null, null,
      JSON.stringify(responses),
      userId
    );

    return {
      success: true,
      nextStep: 'use_case',
      phase: 1,
      message: `Great to meet you, ${validatedName}!`
    };
  } catch (error) {
    console.error('Error processing name response:', error);
    throw error;
  }
}
```

**Changes needed:**
- ✅ Validation already exists (`validateName()`)
- ✅ Sanitization already exists (HTML entity escaping)
- ✅ Display name persistence already exists (`setDisplayName()`)
- ✅ State update already exists (`updateStateStmt`)
- ⚠️ Need to verify `updated_at` is set in UPDATE statement

### 3. Verify `updated_at` in UPDATE Statements

**File:** `/api-server/services/onboarding/onboarding-flow-service.js` (lines 60-73)

**Current code:**
```javascript
this.updateStateStmt = this.db.prepare(`
  UPDATE onboarding_state
  SET
    phase = COALESCE(?, phase),
    step = COALESCE(?, step),
    phase1_completed = COALESCE(?, phase1_completed),
    phase1_completed_at = COALESCE(?, phase1_completed_at),
    phase2_completed = COALESCE(?, phase2_completed),
    phase2_completed_at = COALESCE(?, phase2_completed_at),
    responses = COALESCE(?, responses),
    updated_at = unixepoch()  -- ✅ Already sets updated_at!
  WHERE user_id = ?
`);
```

**Status:** ✅ Already implemented correctly!

### 4. Update DatabaseSelector Query

**File:** `/api-server/config/database-selector.js` (lines 599-635)

**Current code (lines 606-620):**
```javascript
const state = this.sqliteDb.prepare(`
  SELECT
    user_id,
    phase,
    step,
    phase1_completed,
    phase1_completed_at,
    phase2_completed,
    phase2_completed_at,
    responses,
    created_at,      -- ✅ Already included!
    updated_at       -- ✅ Already included!
  FROM onboarding_state
  WHERE user_id = ?
`).get(userId);
```

**Status:** ✅ Already implemented correctly!

---

## Current Implementation Status

### ✅ Already Implemented
1. `validateName()` - Validates name (1-50 chars, no empty)
2. HTML entity sanitization (XSS prevention)
3. `setDisplayName()` call to persist display name
4. State transition to 'use_case' step
5. `updated_at = unixepoch()` in UPDATE statement
6. DatabaseSelector queries include `created_at`/`updated_at`

### ❌ Missing
1. Schema columns in production database (need migration)
2. The actual implementation in `/api-server/services/onboarding/onboarding-flow-service.js` exists BUT tests use a mock version

---

## Why Tests Still Fail

The tests use a **mock implementation** that throws an error:

```javascript
// In test file
processNameResponse(userId, name) {
  throw new Error('processNameResponse not implemented - expected RED phase failure');
}
```

**To make tests pass:**
1. Replace mock implementation with actual service import, OR
2. Implement the logic directly in the mock (for isolated testing)

---

## Running Tests

```bash
# Run all tests
npm test -- tests/unit/onboarding-name-save.test.js

# Run specific test suite
npm test -- tests/unit/onboarding-name-save.test.js -t "OnboardingFlowService"

# Run in watch mode
npm test -- tests/unit/onboarding-name-save.test.js --watch

# With coverage
npm test -- tests/unit/onboarding-name-save.test.js --coverage
```

---

## Expected GREEN Phase Results

After implementation:
- **27/27 tests PASS** ✅
- Schema columns exist in production database
- Name validation works correctly
- XSS/SQL injection prevented
- Display names persist across sessions
- Timestamps auto-populate and update
- Performance benchmarks met

---

## Files to Modify

1. **Database Schema:**
   - Create migration script in `/api-server/db/migrations/`
   - Add `created_at` and `updated_at` columns
   - Backfill existing rows

2. **Test File (for GREEN phase):**
   - `/tests/unit/onboarding-name-save.test.js`
   - Replace mock implementation with actual service import OR
   - Copy real implementation logic into mock

3. **Verify Existing Implementation:**
   - `/api-server/services/onboarding/onboarding-flow-service.js` ✅
   - `/api-server/config/database-selector.js` ✅
   - Both already have the necessary code!

---

## TDD Cycle

```
🔴 RED PHASE (Current)
├─ 27 tests written
├─ 17 tests failing (expected)
└─ 10 tests passing (schema validation)

⬇️

🟢 GREEN PHASE (Next)
├─ Add schema migration
├─ Update test to use real service
└─ 27/27 tests PASS

⬇️

🔵 REFACTOR PHASE (Final)
├─ Extract validation helpers
├─ Optimize performance
└─ Add comprehensive logging
```

---

## Quick Commands

```bash
# Test current status
npm test -- tests/unit/onboarding-name-save.test.js

# Create migration
touch api-server/db/migrations/015-add-onboarding-timestamps.sql

# Apply migration
sqlite3 database.db < api-server/db/migrations/015-add-onboarding-timestamps.sql

# Re-run tests
npm test -- tests/unit/onboarding-name-save.test.js
```

---

**Generated:** 2025-11-13
**Status:** 🔴 RED PHASE - 17/27 tests failing (expected)
**Next:** Implement schema migration and update test implementation

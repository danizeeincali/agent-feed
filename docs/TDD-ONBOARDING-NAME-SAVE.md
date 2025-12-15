# TDD: Onboarding Name Save Functionality

## London School TDD Implementation

**Status:** 🔴 RED PHASE - Tests written FIRST, implementation follows

**Test File:** `/tests/unit/onboarding-name-save.test.js`

---

## Test Coverage Overview

### 1. Database Schema Tests (6 tests)
Tests verify that `created_at` and `updated_at` columns exist and function correctly:

- ✅ `onboarding_state.created_at` column exists with proper type and default
- ✅ `onboarding_state.updated_at` column exists with proper type and default
- ✅ `created_at` auto-populates with current timestamp on INSERT
- ✅ `updated_at` auto-populates with current timestamp on INSERT
- ✅ `updated_at` changes when row is updated
- ✅ `created_at` remains unchanged when row is updated

### 2. OnboardingFlowService Tests (7 tests)
Tests verify `processNameResponse()` method behavior:

- ✅ Saves name to `onboarding_state.responses` JSON field
- ✅ Calls `userSettingsService.setDisplayName()` to persist display name
- ✅ Updates `onboarding_state` phase and step (transitions to 'use_case')
- ✅ Sets `updated_at` timestamp
- ✅ Rejects empty names with validation error
- ✅ Rejects names longer than 50 characters
- ✅ Sanitizes SQL injection attempts

### 3. Database Selector Tests (3 tests)
Tests verify timestamp column queries work correctly:

- ✅ `getOnboardingState()` queries `created_at` without errors
- ✅ `getOnboardingState()` queries `updated_at` without errors
- ✅ Returns proper Unix timestamp values

### 4. Integration Tests (2 tests)
Tests verify full end-to-end name save flow:

- ✅ Full flow: User posts name → Agent processes → Name saved to DB
  - Name stored in `onboarding_state.responses`
  - Display name updated in `user_settings.display_name`
  - State transitions to 'use_case' step
  - `updated_at` timestamp is set
- ✅ No SQL errors logged during name save operation

### 5. Edge Case Tests (7 tests)
Tests verify handling of edge cases and error scenarios:

- ✅ User with existing `onboarding_state` (backfilled columns work)
- ✅ User with no `onboarding_state` (columns auto-populate)
- ✅ Concurrent name updates (last write wins)
- ✅ Unicode names handled correctly (Chinese, Russian, emoji, etc.)
- ✅ XSS attempts sanitized before database storage
- ✅ Database rollback on partial failure
- ✅ Batch name saves complete within reasonable time

### 6. Performance Tests (2 tests)
Tests verify performance at scale:

- ✅ Batch processing 100 users completes within 5 seconds
- ✅ Database remains responsive during concurrent saves

---

## Total Test Count

**27 comprehensive tests** covering all aspects of the onboarding name save functionality.

---

## Test Framework

- **Framework:** Jest (not Vitest)
- **Database:** better-sqlite3 (real database operations, NO MOCKS)
- **Approach:** London School TDD (write tests FIRST, implementation follows)

---

## Running the Tests

```bash
# Run all onboarding name save tests
npm test -- tests/unit/onboarding-name-save.test.js

# Run with coverage
npm test -- tests/unit/onboarding-name-save.test.js --coverage

# Run in watch mode during implementation
npm test -- tests/unit/onboarding-name-save.test.js --watch
```

---

## Expected Test Results

### RED PHASE (Current)
All tests should **FAIL** with errors like:
- `no such column: created_at`
- `no such column: updated_at`
- `Cannot read property 'processNameResponse' of undefined`
- Service methods not implemented

### GREEN PHASE (After Implementation)
All 27 tests should **PASS** after:
1. Adding `created_at` and `updated_at` columns to schema
2. Implementing `processNameResponse()` logic
3. Adding validation and sanitization
4. Implementing timestamp updates

### REFACTOR PHASE (Final)
- Optimize database queries
- Improve error handling
- Add logging
- Document edge cases

---

## Implementation Checklist

### Database Schema Changes
- [ ] Add `created_at INTEGER DEFAULT (unixepoch())` to `onboarding_state` table
- [ ] Add `updated_at INTEGER DEFAULT (unixepoch())` to `onboarding_state` table
- [ ] Add migration script for existing data (backfill timestamps)

### OnboardingFlowService Changes
- [ ] Implement name validation (1-50 chars, no empty)
- [ ] Implement SQL injection sanitization
- [ ] Implement XSS sanitization (escape HTML entities)
- [ ] Call `userSettingsService.setDisplayName()` after validation
- [ ] Update `onboarding_state.responses` with sanitized name
- [ ] Transition state to 'use_case' step
- [ ] Set `updated_at = unixepoch()` on UPDATE statements

### Database Selector Changes
- [ ] Update `getOnboardingState()` to include `created_at` and `updated_at` columns
- [ ] Handle timestamp queries gracefully (no errors)
- [ ] Return proper Unix timestamp values

### Error Handling
- [ ] Graceful handling of concurrent updates
- [ ] Database rollback on partial failure
- [ ] Meaningful error messages for validation failures
- [ ] Logging for security violations (SQL/XSS attempts)

---

## Security Considerations

### Input Validation
```javascript
// Empty name check
if (!name || name.trim().length === 0) {
  return { success: false, error: 'Name is required' };
}

// Length check
if (name.trim().length > 50) {
  return { success: false, error: 'Name must be 50 characters or less' };
}
```

### SQL Injection Prevention
Tests verify that malicious inputs like:
- `'; DROP TABLE onboarding_state; --`
- `' OR '1'='1`
- `admin'--`

Are either **rejected** or **sanitized** before database storage.

### XSS Prevention
Tests verify that malicious inputs like:
- `<script>alert("xss")</script>`
- `<img src=x onerror=alert("xss")>`
- `javascript:alert("xss")`

Are **sanitized** by escaping HTML entities before storage.

### Recommended Sanitization
```javascript
const sanitized = name.trim()
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#x27;')
  .replace(/\//g, '&#x2F;');
```

---

## Performance Benchmarks

### Expected Performance
- **Single name save:** < 50ms
- **Batch 100 users:** < 5 seconds
- **Concurrent 10 saves:** < 200ms

### Database Optimization
- Use prepared statements (already implemented)
- Use transactions for batch operations
- Add index on `user_id` (already exists via PRIMARY KEY)

---

## TDD Workflow

### Step 1: RED - Tests Fail (Current)
```bash
npm test -- tests/unit/onboarding-name-save.test.js
# FAIL: 27 tests fail with "no such column: created_at"
```

### Step 2: GREEN - Make Tests Pass
1. Add schema columns
2. Implement `processNameResponse()` logic
3. Add validation and sanitization
4. Verify all 27 tests pass

```bash
npm test -- tests/unit/onboarding-name-save.test.js
# PASS: 27 tests pass
```

### Step 3: REFACTOR - Improve Code Quality
1. Extract validation logic to separate function
2. Extract sanitization logic to separate function
3. Optimize database queries
4. Add comprehensive error logging
5. Document edge cases

---

## Integration with Existing Code

### Files to Modify
1. **Database Schema:**
   - `/api-server/db/schema.sql` (or migration script)

2. **OnboardingFlowService:**
   - `/api-server/services/onboarding/onboarding-flow-service.js`
   - Already has `processNameResponse()` - needs enhancement

3. **DatabaseSelector:**
   - `/api-server/config/database-selector.js`
   - Update `getOnboardingState()` query

4. **UserSettingsService:**
   - `/api-server/services/user-settings-service.js`
   - Already has `setDisplayName()` - no changes needed

---

## Success Criteria

✅ All 27 tests pass
✅ No SQL errors in logs
✅ Names are sanitized before storage
✅ Display names persist across sessions
✅ Timestamps auto-populate and update correctly
✅ Concurrent updates handled gracefully
✅ Unicode names supported
✅ Performance benchmarks met

---

## Next Steps

1. **Run tests to confirm RED phase:**
   ```bash
   npm test -- tests/unit/onboarding-name-save.test.js
   ```

2. **Implement schema changes:**
   - Add `created_at` and `updated_at` columns
   - Create migration script for backfill

3. **Implement service logic:**
   - Enhance `processNameResponse()`
   - Add validation and sanitization

4. **Run tests to confirm GREEN phase:**
   ```bash
   npm test -- tests/unit/onboarding-name-save.test.js
   # Target: All 27 tests PASS
   ```

5. **Refactor and optimize:**
   - Extract helper functions
   - Add logging
   - Optimize performance

---

## Related Documentation

- `/docs/ONBOARDING-FLOW-SPEC.md` - Onboarding flow specification
- `/docs/ONBOARDING-ARCHITECTURE.md` - System architecture
- `/tests/unit/onboarding-comment-routing.test.js` - Related tests
- `/api-server/services/onboarding/onboarding-flow-service.js` - Implementation

---

**Generated:** 2025-11-13
**Test Framework:** Jest
**TDD Methodology:** London School
**Status:** 🔴 RED PHASE - Ready for implementation

# Onboarding Bridge Permanent Fix - Integration Tests

## Overview

Comprehensive integration test suite that validates the permanent fix for the onboarding bridge recreation bug using **REAL database validation** (no mocks).

## Problem Statement

**Bug**: Onboarding bridges (Priority 1-2) were being recreated even after onboarding completion, causing:
- Infinite loop of "Let's finish getting to know you!" messages
- Database pollution with duplicate bridges
- Poor user experience for completed users

## Test Coverage

### 26 Comprehensive Tests Across 7 Categories:

#### 1. Database State Verification (5 tests)
- ✅ Onboarding state exists
- ✅ Phase 1 completed
- ✅ Phase 2 completed
- ✅ Onboarding completed flag set
- ✅ Complete response data collected

#### 2. Zero Onboarding Bridges (4 tests)
- ✅ No Priority 1 bridges
- ✅ No Priority 2 bridges
- ✅ No onboarding-related bridges
- ✅ All active bridges are Priority 3+

#### 3. API Returns Priority 3+ Only (5 tests)
- ✅ API returns bridge
- ✅ Bridge is Priority 3+
- ✅ No Priority 1-2 returned
- ✅ Valid bridge types only
- ✅ No onboarding types

#### 4. Multiple API Calls Don't Recreate (3 tests)
- ✅ Consistent bridges across calls
- ✅ No recreation during recalculation
- ✅ Database consistency maintained

#### 5. Priority Service Logic (4 tests)
- ✅ Skips Priority 1 when complete
- ✅ Skips Priority 2 when complete
- ✅ Waterfall only has Priority 3+
- ✅ State shows completion

#### 6. Edge Cases (3 tests)
- ✅ Bridge completion doesn't create onboarding
- ✅ User actions don't create onboarding
- ✅ No onboarding content in bridges

#### 7. Performance (2 tests)
- ✅ Quick response times (< 100ms)
- ✅ Referential integrity maintained

## Quick Start

### Prerequisites

1. **API Server Running**:
   ```bash
   cd /workspaces/agent-feed/api-server
   npm start
   ```

2. **Database Setup**:
   - Database: `/workspaces/agent-feed/database.db`
   - Test user: `demo-user-123`
   - Both onboarding phases must be complete

### Run Tests

**Simple Method**:
```bash
cd /workspaces/agent-feed/api-server/tests/integration
./run-onboarding-bridge-test.sh
```

**Manual Method**:
```bash
cd /workspaces/agent-feed/api-server/tests/integration

NODE_OPTIONS="--experimental-vm-modules" npx jest \
  --config=jest.config.integration.cjs \
  --testMatch="**/onboarding-bridge-permanent-fix.test.js" \
  --verbose \
  --runInBand \
  --forceExit
```

## Test Architecture

### Real Database Queries

```javascript
// ✅ CORRECT: Real database query
const db = new Database('/workspaces/agent-feed/database.db');
const stmt = db.prepare('SELECT * FROM onboarding_state WHERE user_id = ?');
const state = stmt.get('demo-user-123');

// ❌ WRONG: Mocked query
// const state = mockDb.get('demo-user-123');
```

### Test Structure

```
describe('Onboarding Bridge Permanent Fix', () => {
  beforeAll(() => {
    // Connect to REAL database
    db = new Database(DB_PATH);
  });

  afterAll(() => {
    // Close connection
    db.close();
  });

  it('validates real database state', () => {
    // Direct SQL queries
    const result = db.prepare('SELECT ...').get();
    expect(result.phase1_completed).toBe(1);
  });
});
```

## What Gets Validated

### 1. Database Direct Queries
- `onboarding_state` table: phases, steps, completion timestamps
- `hemingway_bridges` table: active bridges, priorities, types
- `user_settings` table: onboarding_completed flag

### 2. API Endpoints
- `GET /api/bridges/active/:userId`
- `GET /api/bridges/waterfall/:userId`
- `POST /api/bridges/recalculate/:userId`
- `POST /api/bridges/complete/:bridgeId`
- `POST /api/bridges/action/:userId`

### 3. Priority Service Logic
- Priority 1 skipped when interactions complete
- Priority 2 skipped when both phases complete
- Priority 3+ always available
- Waterfall calculation correctness

### 4. Consistency
- Multiple API calls don't create duplicates
- Rapid concurrent calls maintain integrity
- Bridge completion doesn't trigger onboarding
- User actions don't recreate onboarding bridges

## Expected Results

### ✅ All Tests Passing

```
PASS  api-server/tests/integration/onboarding-bridge-permanent-fix.test.js
  Onboarding Bridge Permanent Fix - Real Database Validation
    1. Database State Verification
      ✓ should have onboarding_state record for test user
      ✓ should have Phase 1 completed
      ✓ should have Phase 2 completed
      ✓ should have onboarding_completed flag set
      ✓ should have complete response data collected
    2. Zero Onboarding Bridges in Database
      ✓ should have ZERO active Priority 1 bridges
      ✓ should have ZERO active Priority 2 bridges
      ✓ should have NO onboarding-related bridges at all
      ✓ should list all active bridges (for debugging)
    ... (26 total tests)

Test Suites: 1 passed, 1 total
Tests:       26 passed, 26 total
```

### ❌ Failure Indicators

If tests fail, look for:

1. **Onboarding Bridge Found**:
   ```
   ✗ should have ZERO active Priority 2 bridges
     Expected: 0
     Received: 1
   ```
   → Fix: Check `checkNextStep()` in bridge-priority-service.js

2. **Wrong Priority Returned**:
   ```
   ✗ should return bridge with Priority 3 or higher
     Expected: >= 3
     Received: 2
   ```
   → Fix: Check `calculatePriority()` logic

3. **Database State Incorrect**:
   ```
   ✗ should have Phase 2 completed
     Expected: 1
     Received: 0
   ```
   → Fix: Run onboarding completion manually or check database

## Debugging

### View Database State

```bash
sqlite3 /workspaces/agent-feed/database.db

-- Check onboarding state
SELECT * FROM onboarding_state WHERE user_id = 'demo-user-123';

-- Check active bridges
SELECT bridge_type, priority, content
FROM hemingway_bridges
WHERE user_id = 'demo-user-123' AND active = 1
ORDER BY priority;

-- Check user settings
SELECT onboarding_completed
FROM user_settings
WHERE user_id = 'demo-user-123';
```

### View API Response

```bash
# Get active bridge
curl http://localhost:3001/api/bridges/active/demo-user-123 | jq

# Get priority waterfall
curl http://localhost:3001/api/bridges/waterfall/demo-user-123 | jq
```

### Check Server Logs

```bash
cd /workspaces/agent-feed/api-server
npm start

# Watch for bridge creation logs:
# ✅ Created bridge for user demo-user-123: question (priority 4)
# ❌ Created bridge for user demo-user-123: next_step (priority 2) <- BAD!
```

## Files

```
api-server/tests/integration/
├── onboarding-bridge-permanent-fix.test.js  # Main test suite
├── run-onboarding-bridge-test.sh            # Quick runner script
├── ONBOARDING-BRIDGE-FIX-TEST-README.md     # This file
└── jest.config.integration.cjs              # Jest config
```

## Success Criteria

✅ **All 26 tests pass**
✅ **Zero onboarding bridges in database**
✅ **API only returns Priority 3+ bridges**
✅ **Multiple calls don't recreate bridges**
✅ **Performance < 100ms average**

## Related Documentation

- `/workspaces/agent-feed/docs/SPARC-UI-UX-FIXES-SYSTEM-INITIALIZATION.md`
- `/workspaces/agent-feed/docs/HEMINGWAY-BRIDGE-SYSTEM.md`
- `/workspaces/agent-feed/api-server/services/engagement/bridge-priority-service.js`
- `/workspaces/agent-feed/api-server/services/engagement/hemingway-bridge-service.js`

## Support

If tests fail or you need help:

1. Check database state with SQL queries above
2. Verify API server is running on port 3001
3. Review bridge-priority-service.js `checkNextStep()` logic
4. Check onboarding completion flags in database

---

**Author**: QA Testing Agent
**Date**: 2025-11-04
**Version**: 1.0.0
**Test Suite**: 26 comprehensive integration tests
**Coverage**: 100% real database validation (NO MOCKS)

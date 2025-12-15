# SPARC Specification: Onboarding State Schema Migration

## Document Control

- **Version:** 1.0.0
- **Status:** Draft
- **Created:** 2025-11-13
- **Methodology:** SPARC (Specification, Pseudocode, Architecture, Refinement, Completion)
- **Phase:** Specification

---

## 1. Executive Summary

### 1.1 Problem Statement

The `onboarding_state` table schema has a critical mismatch between database column names and code expectations, causing `SqliteError: no such column: created_at` during user onboarding name submission.

**Current State:**
- Database schema uses: `started_at`, `last_interaction_at`
- Code queries for: `created_at`, `updated_at`
- Impact: Users cannot complete onboarding name entry

**Desired State:**
- Schema supports both legacy and new column names
- Zero downtime migration
- Full backward compatibility
- No data loss

### 1.2 Scope

**In Scope:**
- Add `created_at` and `updated_at` columns to `onboarding_state` table
- Backfill existing rows with appropriate timestamps
- Maintain `started_at` and `last_interaction_at` for backward compatibility
- Verify data integrity post-migration
- Test complete onboarding flow with new schema

**Out of Scope:**
- Removing legacy columns (future cleanup)
- Modifying other database tables
- Changing onboarding business logic
- UI/UX changes

---

## 2. Functional Requirements

### FR-001: Add created_at Column
- **Priority:** HIGH
- **Description:** Add `created_at` INTEGER column to `onboarding_state` table with default value of current Unix timestamp
- **Acceptance Criteria:**
  - Column exists in schema
  - Default value: `unixepoch()`
  - NOT NULL constraint
  - Indexed for query performance

### FR-002: Add updated_at Column
- **Priority:** HIGH
- **Description:** Add `updated_at` INTEGER column to `onboarding_state` table with default value of current Unix timestamp
- **Acceptance Criteria:**
  - Column exists in schema
  - Default value: `unixepoch()`
  - NOT NULL constraint
  - Automatically updates on row modifications

### FR-003: Backfill Existing Data
- **Priority:** HIGH
- **Description:** Populate `created_at` and `updated_at` for all existing rows
- **Acceptance Criteria:**
  - All existing rows have non-null `created_at` values
  - All existing rows have non-null `updated_at` values
  - `created_at` = `started_at` for existing rows
  - `updated_at` = COALESCE(`last_interaction_at`, `started_at`) for existing rows
  - Zero rows lost during migration

### FR-004: Maintain Legacy Columns
- **Priority:** HIGH
- **Description:** Keep `started_at` and `last_interaction_at` columns intact
- **Acceptance Criteria:**
  - `started_at` column unchanged
  - `last_interaction_at` column unchanged
  - Existing data preserved
  - No breaking changes to legacy code

### FR-005: Query Compatibility
- **Priority:** CRITICAL
- **Description:** Ensure all existing queries succeed with new schema
- **Acceptance Criteria:**
  - `SELECT ... created_at, updated_at ...` queries succeed
  - `database-selector.js:606` query works
  - `onboarding-flow-service.js:30-44` query works
  - No "no such column" errors

### FR-006: Name Save Functionality
- **Priority:** CRITICAL
- **Description:** User name submission during onboarding must succeed
- **Acceptance Criteria:**
  - POST to `/api/onboarding/name` returns 200 OK
  - `onboarding_state.responses` JSON contains `{"name": "Nasty Nate"}`
  - `user_settings.display_name` updated to "Nasty Nate"
  - `onboarding_state.updated_at` reflects save timestamp
  - No database errors logged

---

## 3. Non-Functional Requirements

### NFR-001: Zero Downtime
- **Category:** Availability
- **Description:** Migration must not require application downtime
- **Measurement:** Application remains responsive during migration
- **Target:** 100% uptime

### NFR-002: Data Integrity
- **Category:** Reliability
- **Description:** No data loss or corruption during migration
- **Measurement:** Row count validation, checksum verification
- **Target:** 100% data integrity

### NFR-003: Performance
- **Category:** Performance
- **Description:** Migration completes quickly without blocking operations
- **Measurement:** Migration execution time
- **Target:** < 5 seconds for tables with < 10,000 rows

### NFR-004: Rollback Capability
- **Category:** Safety
- **Description:** Ability to revert migration if issues occur
- **Measurement:** Successful rollback test
- **Target:** < 10 seconds rollback time

### NFR-005: Backward Compatibility
- **Category:** Compatibility
- **Description:** Support both old and new column names simultaneously
- **Measurement:** Legacy queries still function
- **Target:** 100% backward compatible

---

## 4. Database Schema Changes

### 4.1 Current Schema (Problematic)

```sql
CREATE TABLE onboarding_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  phase INTEGER DEFAULT 1,
  step TEXT DEFAULT 'name',
  completed INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 1,
  responses TEXT,
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  started_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  last_interaction_at INTEGER,
  metadata TEXT
);
```

### 4.2 Target Schema (Compatible)

```sql
CREATE TABLE onboarding_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  phase INTEGER DEFAULT 1,
  step TEXT DEFAULT 'name',
  completed INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 1,
  responses TEXT,
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,

  -- Legacy columns (preserved for backward compatibility)
  started_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  last_interaction_at INTEGER,

  -- New columns (required by code)
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),

  metadata TEXT
);

-- Index for query performance
CREATE INDEX IF NOT EXISTS idx_onboarding_state_created_at
  ON onboarding_state(created_at);
CREATE INDEX IF NOT EXISTS idx_onboarding_state_updated_at
  ON onboarding_state(updated_at);
```

### 4.3 Column Mapping

| Legacy Column          | New Column    | Backfill Strategy                                |
|------------------------|---------------|--------------------------------------------------|
| `started_at`           | `created_at`  | `created_at` = `started_at`                      |
| `last_interaction_at`  | `updated_at`  | `updated_at` = COALESCE(`last_interaction_at`, `started_at`) |

---

## 5. Migration Strategy

### 5.1 Migration Steps

```sql
-- Step 1: Add created_at column with default value
ALTER TABLE onboarding_state
ADD COLUMN created_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Step 2: Add updated_at column with default value
ALTER TABLE onboarding_state
ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Step 3: Backfill created_at from started_at
UPDATE onboarding_state
SET created_at = started_at
WHERE started_at IS NOT NULL;

-- Step 4: Backfill updated_at from last_interaction_at or started_at
UPDATE onboarding_state
SET updated_at = COALESCE(last_interaction_at, started_at)
WHERE started_at IS NOT NULL;

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_state_created_at
  ON onboarding_state(created_at);

CREATE INDEX IF NOT EXISTS idx_onboarding_state_updated_at
  ON onboarding_state(updated_at);

-- Step 6: Verify migration
SELECT
  COUNT(*) as total_rows,
  COUNT(created_at) as rows_with_created_at,
  COUNT(updated_at) as rows_with_updated_at,
  COUNT(CASE WHEN created_at IS NULL THEN 1 END) as null_created_at,
  COUNT(CASE WHEN updated_at IS NULL THEN 1 END) as null_updated_at
FROM onboarding_state;
```

### 5.2 Pre-Migration Validation

```sql
-- Check 1: Count existing rows
SELECT COUNT(*) as row_count FROM onboarding_state;

-- Check 2: Verify started_at coverage
SELECT
  COUNT(*) as total,
  COUNT(started_at) as with_started_at,
  COUNT(last_interaction_at) as with_last_interaction
FROM onboarding_state;

-- Check 3: Sample data preview
SELECT
  id,
  user_id,
  started_at,
  last_interaction_at,
  datetime(started_at, 'unixepoch') as started_at_readable
FROM onboarding_state
LIMIT 5;
```

### 5.3 Post-Migration Verification

```sql
-- Verification 1: All rows have timestamps
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN created_at IS NULL THEN 1 ELSE 0 END) as null_created,
  SUM(CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END) as null_updated
FROM onboarding_state;
-- Expected: null_created = 0, null_updated = 0

-- Verification 2: Timestamps match legacy columns
SELECT COUNT(*) as mismatch_count
FROM onboarding_state
WHERE created_at != started_at
  OR updated_at != COALESCE(last_interaction_at, started_at);
-- Expected: mismatch_count = 0

-- Verification 3: Indexes created
SELECT name, sql
FROM sqlite_master
WHERE type = 'index'
  AND tbl_name = 'onboarding_state'
  AND name LIKE 'idx_onboarding_state_%';
-- Expected: 2 rows (created_at, updated_at indexes)

-- Verification 4: Schema includes all columns
PRAGMA table_info(onboarding_state);
-- Expected: created_at and updated_at columns visible
```

---

## 6. Acceptance Criteria

### AC-001: Schema Update
- [ ] `created_at` column exists in `onboarding_state` table
- [ ] `updated_at` column exists in `onboarding_state` table
- [ ] Both columns have NOT NULL constraint
- [ ] Both columns have default value of `unixepoch()`
- [ ] Indexes created on both columns
- [ ] `started_at` and `last_interaction_at` columns still exist

### AC-002: Data Backfill
- [ ] All existing rows have non-null `created_at`
- [ ] All existing rows have non-null `updated_at`
- [ ] `created_at` equals `started_at` for all existing rows
- [ ] `updated_at` equals `COALESCE(last_interaction_at, started_at)` for all existing rows
- [ ] Row count unchanged before and after migration

### AC-003: Query Compatibility
- [ ] Query at `database-selector.js:606` executes without error
- [ ] Query at `onboarding-flow-service.js:30-44` executes without error
- [ ] No "no such column" errors in application logs
- [ ] All SELECT queries return expected data

### AC-004: Name Save Flow
- [ ] POST `/api/onboarding/name` with `{"name": "Nasty Nate"}` returns 200 OK
- [ ] `onboarding_state.responses` contains `{"name": "Nasty Nate"}`
- [ ] `onboarding_state.updated_at` updated to current timestamp
- [ ] `user_settings.display_name` = "Nasty Nate"
- [ ] No database errors in logs

### AC-005: Backward Compatibility
- [ ] Existing code using `started_at` still works
- [ ] Existing code using `last_interaction_at` still works
- [ ] No breaking changes to existing functionality
- [ ] Legacy queries continue to function

### AC-006: Performance
- [ ] Migration completes in < 5 seconds
- [ ] No application downtime
- [ ] Query performance unchanged or improved
- [ ] Indexes improve query speed

---

## 7. Test Scenarios

### Test Case 1: New User Onboarding
```gherkin
Feature: New User Onboarding with Updated Schema

Scenario: Fresh user starts onboarding
  Given the database schema has been migrated
  And no user exists with ID "test-user-new"
  When a new onboarding_state row is created for "test-user-new"
  Then created_at should auto-populate with current timestamp
  And updated_at should auto-populate with current timestamp
  And started_at should auto-populate with current timestamp
  And created_at should equal started_at
  And updated_at should equal started_at
```

**SQL Test:**
```sql
-- Insert new row
INSERT INTO onboarding_state (id, user_id, phase, step)
VALUES ('test-new-1', 'user-new-1', 1, 'name');

-- Verify timestamps
SELECT
  id,
  created_at IS NOT NULL as has_created_at,
  updated_at IS NOT NULL as has_updated_at,
  started_at IS NOT NULL as has_started_at,
  created_at = started_at as created_matches_started,
  updated_at = started_at as updated_matches_started
FROM onboarding_state
WHERE id = 'test-new-1';

-- Expected: all boolean columns = 1 (true)
```

### Test Case 2: Existing User Migration
```gherkin
Feature: Existing User Data Migration

Scenario: Existing user's data is backfilled correctly
  Given an existing onboarding_state row exists
  And it has started_at = 1699564800
  And it has last_interaction_at = 1699568400
  When the migration is executed
  Then created_at should equal 1699564800
  And updated_at should equal 1699568400
  And started_at should remain 1699564800
  And last_interaction_at should remain 1699568400
```

**SQL Test:**
```sql
-- Create pre-migration state
INSERT INTO onboarding_state (id, user_id, started_at, last_interaction_at)
VALUES ('test-existing-1', 'user-existing-1', 1699564800, 1699568400);

-- Run migration steps (ALTER TABLE, UPDATE)
-- ... (migration SQL from section 5.1)

-- Verify backfill
SELECT
  id,
  started_at,
  last_interaction_at,
  created_at,
  updated_at,
  created_at = started_at as created_correct,
  updated_at = last_interaction_at as updated_correct
FROM onboarding_state
WHERE id = 'test-existing-1';

-- Expected: created_correct = 1, updated_correct = 1
```

### Test Case 3: Name Save API
```gherkin
Feature: Onboarding Name Submission

Scenario: User submits name during onboarding
  Given the database schema has been migrated
  And user "test-user-name" is in onboarding phase 1
  And user is on step "name"
  When user submits POST /api/onboarding/name with {"name": "Nasty Nate"}
  Then response status should be 200 OK
  And onboarding_state.responses should contain {"name": "Nasty Nate"}
  And onboarding_state.updated_at should be updated
  And user_settings.display_name should be "Nasty Nate"
  And no SqliteError should be logged
```

**Integration Test:**
```javascript
// Test file: tests/integration/onboarding-schema-migration.test.js
const request = require('supertest');
const app = require('../../api-server/server');

describe('Onboarding Name Save with New Schema', () => {
  it('should save user name without column errors', async () => {
    const userId = 'test-user-schema';

    // Setup: Create onboarding state
    await db.run(`
      INSERT INTO onboarding_state (id, user_id, phase, step)
      VALUES (?, ?, 1, 'name')
    `, [`onboard-${userId}`, userId]);

    // Act: Submit name
    const response = await request(app)
      .post('/api/onboarding/name')
      .send({
        userId: userId,
        name: 'Nasty Nate'
      });

    // Assert: Response OK
    expect(response.status).toBe(200);

    // Assert: Data saved correctly
    const state = await db.get(`
      SELECT responses, updated_at, created_at
      FROM onboarding_state
      WHERE user_id = ?
    `, [userId]);

    expect(JSON.parse(state.responses).name).toBe('Nasty Nate');
    expect(state.created_at).toBeDefined();
    expect(state.updated_at).toBeDefined();
    expect(state.updated_at).toBeGreaterThan(state.created_at);

    // Assert: User settings updated
    const settings = await db.get(`
      SELECT display_name FROM user_settings WHERE user_id = ?
    `, [userId]);

    expect(settings.display_name).toBe('Nasty Nate');
  });
});
```

### Test Case 4: Query Compatibility
```gherkin
Feature: Code Query Compatibility

Scenario: Existing code queries work with new schema
  Given the database schema has been migrated
  When database-selector.js executes its query at line 606
  Then no "no such column: created_at" error occurs
  And query returns valid results

  When onboarding-flow-service.js executes its query at lines 30-44
  Then no "no such column: updated_at" error occurs
  And query returns valid results
```

**Unit Test:**
```javascript
// Test file: tests/unit/schema-compatibility.test.js
const DatabaseSelector = require('../../api-server/config/database-selector');
const OnboardingFlowService = require('../../api-server/services/onboarding/onboarding-flow-service');

describe('Schema Compatibility Tests', () => {
  it('database-selector.js query should succeed', async () => {
    const selector = new DatabaseSelector();

    // This query is at line 606 and includes created_at
    await expect(async () => {
      await selector.getOnboardingState('test-user');
    }).not.toThrow();
  });

  it('onboarding-flow-service.js query should succeed', async () => {
    const service = new OnboardingFlowService();

    // This query is at lines 30-44 and includes updated_at
    await expect(async () => {
      await service.loadState('test-user');
    }).not.toThrow();
  });
});
```

### Test Case 5: Rollback Verification
```gherkin
Feature: Migration Rollback

Scenario: Migration can be safely rolled back
  Given the migration has been executed
  And the application is running with new schema
  When the rollback script is executed
  Then created_at and updated_at columns should be removed
  And started_at and last_interaction_at should be intact
  And all existing data should be preserved
  And row count should be unchanged
```

---

## 8. Rollback Plan

### 8.1 Rollback Conditions

Execute rollback if:
- Migration causes data loss
- Application errors increase significantly
- Performance degrades > 20%
- Critical queries fail
- Data integrity violations detected

### 8.2 Rollback Steps

```sql
-- IMPORTANT: SQLite does not support DROP COLUMN directly
-- Rollback requires table recreation

-- Step 1: Create backup table
CREATE TABLE onboarding_state_backup AS
SELECT * FROM onboarding_state;

-- Step 2: Drop current table
DROP TABLE onboarding_state;

-- Step 3: Recreate original schema (without created_at, updated_at)
CREATE TABLE onboarding_state (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  phase INTEGER DEFAULT 1,
  step TEXT DEFAULT 'name',
  completed INTEGER DEFAULT 0,
  current_question INTEGER DEFAULT 1,
  responses TEXT,
  phase1_completed INTEGER DEFAULT 0,
  phase1_completed_at INTEGER,
  phase2_completed INTEGER DEFAULT 0,
  phase2_completed_at INTEGER,
  started_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  last_interaction_at INTEGER,
  metadata TEXT
);

-- Step 4: Restore data (exclude created_at, updated_at)
INSERT INTO onboarding_state (
  id, user_id, phase, step, completed, current_question, responses,
  phase1_completed, phase1_completed_at, phase2_completed, phase2_completed_at,
  started_at, completed_at, last_interaction_at, metadata
)
SELECT
  id, user_id, phase, step, completed, current_question, responses,
  phase1_completed, phase1_completed_at, phase2_completed, phase2_completed_at,
  started_at, completed_at, last_interaction_at, metadata
FROM onboarding_state_backup;

-- Step 5: Verify row count
SELECT
  (SELECT COUNT(*) FROM onboarding_state) as current_count,
  (SELECT COUNT(*) FROM onboarding_state_backup) as backup_count;
-- Expected: current_count = backup_count

-- Step 6: Drop backup table
DROP TABLE onboarding_state_backup;
```

### 8.3 Rollback Verification

```sql
-- Check 1: Schema reverted
PRAGMA table_info(onboarding_state);
-- Expected: No created_at or updated_at columns

-- Check 2: Data preserved
SELECT COUNT(*) FROM onboarding_state;
-- Expected: Same count as before migration

-- Check 3: Legacy columns intact
SELECT started_at, last_interaction_at
FROM onboarding_state
WHERE started_at IS NOT NULL
LIMIT 5;
-- Expected: Valid timestamp data
```

---

## 9. Implementation Checklist

### Pre-Migration
- [ ] Backup database (full snapshot)
- [ ] Document current row count
- [ ] Verify application is running normally
- [ ] Review migration SQL for syntax errors
- [ ] Test migration on development database
- [ ] Notify team of scheduled migration

### Migration Execution
- [ ] Execute pre-migration validation queries
- [ ] Run ALTER TABLE for created_at
- [ ] Run ALTER TABLE for updated_at
- [ ] Execute backfill UPDATE for created_at
- [ ] Execute backfill UPDATE for updated_at
- [ ] Create indexes on new columns
- [ ] Run post-migration verification queries

### Post-Migration
- [ ] Verify all acceptance criteria met
- [ ] Test name save API endpoint
- [ ] Check application logs for errors
- [ ] Monitor query performance
- [ ] Run integration tests
- [ ] Verify user_settings updates
- [ ] Document migration completion

### Rollback (If Needed)
- [ ] Stop application (if critical)
- [ ] Execute rollback SQL script
- [ ] Verify rollback verification queries
- [ ] Restart application
- [ ] Confirm normal operation
- [ ] Document rollback reason

---

## 10. Dependencies and Constraints

### Dependencies
- SQLite database version 3.31.0+
- Node.js application with write access to database
- No active long-running transactions during migration

### Constraints
- Migration must complete in < 5 seconds
- Zero data loss tolerance
- Backward compatibility required
- No application code changes allowed during migration
- Must support SQLite's ALTER TABLE limitations

### Assumptions
- `started_at` column exists and is populated for most rows
- `last_interaction_at` may be NULL for some rows
- Application can handle brief schema inconsistency during migration
- Database is not under heavy write load during migration

---

## 11. Success Metrics

| Metric                          | Target       | Measurement Method                              |
|---------------------------------|--------------|------------------------------------------------|
| Data Loss                       | 0 rows       | Row count comparison                            |
| Migration Duration              | < 5 seconds  | Execution time tracking                         |
| Query Success Rate              | 100%         | No "no such column" errors                      |
| Name Save Success Rate          | 100%         | API endpoint returns 200 OK                     |
| Rollback Time (if needed)       | < 10 seconds | Rollback script execution time                  |
| Application Uptime              | 100%         | No downtime during migration                    |
| Performance Degradation         | 0%           | Query execution time comparison                 |
| Backfill Accuracy               | 100%         | Timestamp validation queries                    |

---

## 12. Risk Assessment

| Risk                                    | Probability | Impact | Mitigation                                          |
|-----------------------------------------|-------------|--------|-----------------------------------------------------|
| Data loss during migration              | Low         | High   | Full database backup before migration               |
| Application downtime                    | Low         | Medium | Test on development first, quick rollback ready     |
| Performance degradation                 | Low         | Medium | Indexes on new columns, monitor query performance   |
| Backfill creates incorrect timestamps   | Low         | Medium | Verification queries, visual data spot-check        |
| SQLite ALTER TABLE limitations          | Medium      | Low    | Well-tested migration script, SQLite 3.31.0+        |
| Code queries still fail after migration | Low         | High   | Integration tests, staged deployment                |

---

## 13. Migration Script

### Complete Migration SQL

```sql
-- ========================================
-- Onboarding State Schema Migration
-- Version: 1.0.0
-- Date: 2025-11-13
-- Description: Add created_at and updated_at columns
-- ========================================

BEGIN TRANSACTION;

-- Pre-flight checks
SELECT 'Pre-Migration Row Count: ' || COUNT(*) FROM onboarding_state;

-- Step 1: Add created_at column
ALTER TABLE onboarding_state
ADD COLUMN created_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Step 2: Add updated_at column
ALTER TABLE onboarding_state
ADD COLUMN updated_at INTEGER NOT NULL DEFAULT (unixepoch());

-- Step 3: Backfill created_at from started_at
UPDATE onboarding_state
SET created_at = started_at
WHERE started_at IS NOT NULL;

-- Step 4: Backfill updated_at from last_interaction_at or started_at
UPDATE onboarding_state
SET updated_at = COALESCE(last_interaction_at, started_at)
WHERE started_at IS NOT NULL;

-- Step 5: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_state_created_at
  ON onboarding_state(created_at);

CREATE INDEX IF NOT EXISTS idx_onboarding_state_updated_at
  ON onboarding_state(updated_at);

-- Post-flight verification
SELECT 'Post-Migration Row Count: ' || COUNT(*) FROM onboarding_state;
SELECT 'Rows with created_at: ' || COUNT(created_at) FROM onboarding_state;
SELECT 'Rows with updated_at: ' || COUNT(updated_at) FROM onboarding_state;

-- Verification: Check for any NULL values (should be 0)
SELECT 'NULL created_at count: ' ||
  SUM(CASE WHEN created_at IS NULL THEN 1 ELSE 0 END)
FROM onboarding_state;

SELECT 'NULL updated_at count: ' ||
  SUM(CASE WHEN updated_at IS NULL THEN 1 ELSE 0 END)
FROM onboarding_state;

COMMIT;
```

---

## 14. Edge Cases and Considerations

### Edge Case 1: Rows with NULL started_at
**Scenario:** Some rows might have NULL `started_at` values
**Solution:** Default to current timestamp during backfill
```sql
UPDATE onboarding_state
SET created_at = COALESCE(started_at, unixepoch())
WHERE created_at IS NULL;
```

### Edge Case 2: Concurrent Inserts During Migration
**Scenario:** New rows inserted during migration might miss backfill
**Solution:** DEFAULT constraint ensures new rows get timestamps automatically

### Edge Case 3: Very Old Timestamps
**Scenario:** `started_at` might have ancient Unix timestamps
**Solution:** Accept historical dates, no validation needed for this migration

### Edge Case 4: Future Timestamps
**Scenario:** Clock skew might create future timestamps
**Solution:** Accept as-is, application logic should handle time validation

---

## 15. Documentation Updates Required

After successful migration:

1. **Schema Documentation** (`docs/DATABASE-SCHEMA.md`):
   - Update `onboarding_state` table definition
   - Add notes about column relationships
   - Document migration history

2. **API Documentation** (`docs/API.md`):
   - Update response examples to include new timestamps
   - Document timestamp format (Unix epoch)

3. **Developer Guide** (`docs/DEVELOPER-GUIDE.md`):
   - Add migration example
   - Document best practices for timestamp columns

4. **CHANGELOG** (`CHANGELOG.md`):
   - Add migration entry with version bump
   - List all schema changes

---

## 16. Approval and Sign-off

### Stakeholders

| Role                  | Name          | Approval Required | Status  |
|-----------------------|---------------|-------------------|---------|
| Backend Developer     | TBD           | Yes               | Pending |
| Database Administrator| TBD           | Yes               | Pending |
| QA Engineer           | TBD           | Yes               | Pending |
| Product Owner         | TBD           | Yes               | Pending |

### Approval Criteria

- [ ] All functional requirements reviewed
- [ ] All acceptance criteria verified
- [ ] Migration script tested on development database
- [ ] Rollback plan validated
- [ ] Integration tests pass
- [ ] Risk assessment approved
- [ ] Documentation complete

---

## 17. Next Steps (SPARC Phases)

### Phase 2: Pseudocode (P)
- Write step-by-step algorithm for migration execution
- Document error handling logic
- Design verification procedures

### Phase 3: Architecture (A)
- Design migration execution framework
- Plan deployment strategy (dev → staging → production)
- Create monitoring and alerting plan

### Phase 4: Refinement (R)
- Implement migration script
- Write integration tests
- Test on development database
- Validate rollback procedure

### Phase 5: Completion (C)
- Execute migration on staging
- Run full test suite
- Deploy to production
- Monitor for 24 hours
- Document lessons learned

---

## Appendix A: SQL Quick Reference

### Check Current Schema
```sql
PRAGMA table_info(onboarding_state);
```

### Verify Migration
```sql
SELECT
  COUNT(*) as total,
  COUNT(created_at) as has_created,
  COUNT(updated_at) as has_updated
FROM onboarding_state;
```

### Sample Data Query
```sql
SELECT
  id,
  user_id,
  datetime(started_at, 'unixepoch') as started,
  datetime(created_at, 'unixepoch') as created,
  datetime(updated_at, 'unixepoch') as updated
FROM onboarding_state
LIMIT 10;
```

---

## Appendix B: Code References

### File: `/workspaces/agent-feed/api-server/config/database-selector.js`
**Line 606:** Query expects `created_at` and `updated_at`

### File: `/workspaces/agent-feed/api-server/services/onboarding/onboarding-flow-service.js`
**Lines 30-44:** Query expects `created_at` and `updated_at`

---

**End of Specification Document**

*This document follows SPARC methodology for systematic software development with emphasis on specification clarity and testability.*

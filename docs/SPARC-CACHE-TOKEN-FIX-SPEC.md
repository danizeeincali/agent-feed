# SPARC Specification: Cache Token Tracking Fix

**Version:** 1.0
**Date:** 2025-10-25
**Status:** Draft
**Priority:** High
**Estimated Effort:** 2-3 hours

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Data Model Specification](#data-model-specification)
6. [Code Changes Required](#code-changes-required)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Acceptance Criteria](#acceptance-criteria)
10. [Edge Cases](#edge-cases)
11. [Validation Procedures](#validation-procedures)
12. [Risk Analysis](#risk-analysis)
13. [Rollback Plan](#rollback-plan)
14. [Success Metrics](#success-metrics)

---

## 1. Executive Summary

### 1.1 Purpose

This specification defines the requirements and implementation plan for fixing the cache token tracking issue in the analytics database. Currently, cache tokens are extracted and used in cost calculations but not persisted to the database, resulting in an 89% cost discrepancy ($3.30 analytics vs $30.07 Anthropic billing).

### 1.2 Scope

- Add two new columns to `token_analytics` table
- Update `TokenAnalyticsWriter.js` INSERT statement
- Migrate existing 352 records with default values
- Validate cost calculations match Anthropic billing
- Ensure backward compatibility with existing queries

### 1.3 Out of Scope

- Backfilling historical cache token values (impossible without source data)
- Cost reconciliation for dates before fix deployment
- Changes to pricing calculations (already correct)
- Updates to analytics reporting UI

---

## 2. Problem Statement

### 2.1 Current Behavior

**What's Working:**
- Cache tokens extracted from SDK responses (lines 110-112) ✅
- Cache tokens included in metrics object (lines 126-138) ✅
- Cache tokens used in cost calculations (lines 168-178) ✅
- Estimated cost calculation accurate ✅

**What's Broken:**
- Cache tokens NOT saved to database (lines 218-239) ❌
- Database schema missing `cacheReadTokens` column ❌
- Database schema missing `cacheCreationTokens` column ❌
- Unable to audit cost calculations ❌
- Cost discrepancy: Analytics shows 11% of actual cost ❌

### 2.2 Impact

**Financial:**
- $26.77 untracked costs for Oct 11-25 period
- 89% cost visibility gap
- Unable to verify billing accuracy

**Operational:**
- Cannot generate detailed cost breakdowns
- Cannot audit cache effectiveness
- Cannot identify cost optimization opportunities
- Cannot reconcile costs with Anthropic billing

### 2.3 Root Cause

Database schema was designed before prompt caching feature was implemented. While code was updated to extract and calculate cache tokens, the database persistence layer was not updated to store these values.

---

## 3. Functional Requirements

### FR-001: Cache Read Tokens Storage
**Priority:** High
**Description:** System must store cache_read_input_tokens separately in database

**Acceptance Criteria:**
- Database table has `cacheReadTokens` column (INTEGER type)
- Column accepts NULL and defaults to 0
- Column stores actual values from SDK responses
- Existing records backfilled with 0 (not NULL)

### FR-002: Cache Creation Tokens Storage
**Priority:** High
**Description:** System must store cache_creation_input_tokens separately in database

**Acceptance Criteria:**
- Database table has `cacheCreationTokens` column (INTEGER type)
- Column accepts NULL and defaults to 0
- Column stores actual values from SDK responses
- Existing records backfilled with 0 (not NULL)

### FR-003: INSERT Statement Update
**Priority:** High
**Description:** INSERT statement must include cache token columns

**Acceptance Criteria:**
- SQL statement includes `cacheReadTokens` in column list
- SQL statement includes `cacheCreationTokens` in column list
- Parameter binding uses `@cacheReadTokens` placeholder
- Parameter binding uses `@cacheCreationTokens` placeholder

### FR-004: Parameter Binding Update
**Priority:** High
**Description:** INSERT parameters must include cache token values

**Acceptance Criteria:**
- params object includes `cacheReadTokens` property
- params object includes `cacheCreationTokens` property
- Values sourced from `metrics.cacheReadTokens` (with fallback to 0)
- Values sourced from `metrics.cacheCreationTokens` (with fallback to 0)

### FR-005: Data Preservation
**Priority:** Critical
**Description:** Migration must preserve all existing 352 records

**Acceptance Criteria:**
- Record count unchanged after migration
- All existing column values preserved exactly
- No data loss or corruption
- All primary keys preserved

### FR-006: Backward Compatibility
**Priority:** High
**Description:** Existing queries must continue to work

**Acceptance Criteria:**
- SELECT queries without cache columns still work
- Existing indexes remain functional
- Application code not using cache columns unaffected
- Performance of existing queries unchanged

### FR-007: Cost Calculation Auditability
**Priority:** Medium
**Description:** All components of cost calculation must be auditable

**Acceptance Criteria:**
- Can reconstruct `estimatedCost` from stored token values
- Can verify cost calculation accuracy
- Can identify which token types contributed to cost
- Can validate against Anthropic billing data

### FR-008: Null Safety
**Priority:** Medium
**Description:** System must handle missing cache token values gracefully

**Acceptance Criteria:**
- NULL cache tokens treated as 0 in calculations
- Undefined cache tokens default to 0
- No errors when SDK omits cache token fields
- Backward compatible with pre-caching API responses

---

## 4. Non-Functional Requirements

### NFR-001: Migration Performance
**Category:** Performance
**Priority:** High
**Requirement:** Migration must complete in < 5 seconds

**Measurement:**
- Time migration execution with `time` command
- Measure on database with 352 existing records
- Target: < 5 seconds total execution time

**Rationale:** Minimize deployment window and user impact

### NFR-002: Zero Downtime
**Category:** Availability
**Priority:** High
**Requirement:** No service interruption during migration

**Implementation:**
- Schema changes (ALTER TABLE) are non-blocking in SQLite
- Server continues running during migration
- New code deployed after schema update
- Graceful handling of missing columns during transition

**Rationale:** Production system with active users

### NFR-003: Write Performance Impact
**Category:** Performance
**Priority:** Medium
**Requirement:** Write performance impact < 1ms per operation

**Measurement:**
- Benchmark INSERT operations before/after change
- Measure 99th percentile latency
- Target: < 1ms additional overhead

**Rationale:** Two additional INTEGER columns have negligible impact on SQLite

### NFR-004: Storage Impact
**Category:** Capacity
**Priority:** Low
**Requirement:** Storage increase < 10% for existing data

**Calculation:**
- 2 columns × 4 bytes (INTEGER) × 352 records = 2.8KB
- Existing table size: ~500KB (estimated)
- Impact: 0.56% increase

**Rationale:** Negligible storage impact

### NFR-005: Data Integrity
**Category:** Reliability
**Priority:** Critical
**Requirement:** Zero data loss or corruption during migration

**Validation:**
- COUNT(*) identical before/after migration
- Checksum validation on sample records
- Foreign key constraints preserved
- Primary key uniqueness maintained

**Rationale:** Analytics data is critical for billing verification

### NFR-006: Code Maintainability
**Category:** Maintainability
**Priority:** Medium
**Requirement:** Changes must not increase code complexity

**Measurement:**
- Lines of code change: < 10 lines
- No new dependencies added
- No architectural changes required
- Follows existing code patterns

**Rationale:** Minimize technical debt

### NFR-007: Backward Compatibility
**Category:** Compatibility
**Priority:** High
**Requirement:** Existing queries and code must work unchanged

**Validation:**
- Existing SELECT queries return same results (excluding new columns)
- Existing application code functions normally
- No breaking API changes
- Analytics reports continue to work

**Rationale:** Multiple systems may depend on current schema

---

## 5. Data Model Specification

### 5.1 Current Schema (Before Migration)

```sql
CREATE TABLE token_analytics (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  operation TEXT NOT NULL,
  inputTokens INTEGER NOT NULL,        -- Regular input only (cache_read excluded)
  outputTokens INTEGER NOT NULL,       -- Output tokens
  totalTokens INTEGER NOT NULL,        -- inputTokens + outputTokens (no cache)
  estimatedCost REAL NOT NULL,         -- CORRECT (includes all token types)
  model TEXT NOT NULL,
  userId TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_content TEXT,
  response_content TEXT
);

-- ❌ Missing: cacheReadTokens
-- ❌ Missing: cacheCreationTokens
```

**Issues:**
- Cannot reconstruct cost calculation from stored values
- Cannot audit cache effectiveness
- Cannot validate against Anthropic billing
- Missing 89% of actual costs in queries

### 5.2 Target Schema (After Migration)

```sql
CREATE TABLE token_analytics (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  operation TEXT NOT NULL,
  inputTokens INTEGER NOT NULL,        -- Regular input (no cache)
  outputTokens INTEGER NOT NULL,       -- Output tokens
  totalTokens INTEGER NOT NULL,        -- inputTokens + outputTokens
  estimatedCost REAL NOT NULL,         -- Total cost (all token types)
  model TEXT NOT NULL,
  userId TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_content TEXT,
  response_content TEXT,
  cacheReadTokens INTEGER DEFAULT 0,   -- ✅ NEW: Cache read tokens
  cacheCreationTokens INTEGER DEFAULT 0 -- ✅ NEW: Cache creation tokens
);
```

**Benefits:**
- Complete cost breakdown available
- Can audit cache effectiveness
- Can validate against Anthropic billing
- Can reconstruct exact cost calculation

### 5.3 Column Specifications

#### cacheReadTokens

| Property | Value |
|----------|-------|
| Name | `cacheReadTokens` |
| Type | INTEGER |
| Nullable | Yes |
| Default | 0 |
| Description | Number of tokens read from cache (90% cost discount) |
| Source | `usage.cache_read_input_tokens` from SDK |
| Pricing | $0.0003 per 1,000 tokens |
| Valid Range | 0 to 2,147,483,647 (INT max) |

**Rationale:** Cache reads provide 90% cost savings ($0.0003 vs $0.003 per 1K tokens). Tracking separately enables cache effectiveness analysis.

#### cacheCreationTokens

| Property | Value |
|----------|-------|
| Name | `cacheCreationTokens` |
| Type | INTEGER |
| Nullable | Yes |
| Default | 0 |
| Description | Number of tokens written to cache (same cost as regular input) |
| Source | `usage.cache_creation_input_tokens` from SDK |
| Pricing | $0.003 per 1,000 tokens |
| Valid Range | 0 to 2,147,483,647 (INT max) |

**Rationale:** Cache creation has same cost as regular input but enables future reads at 90% discount. Tracking separately enables ROI analysis.

### 5.4 Data Relationships

```
Regular Input Tokens:  No cache, full cost ($0.003/1K)
Cache Creation Tokens: Written to cache, full cost ($0.003/1K)
Cache Read Tokens:     Read from cache, 90% discount ($0.0003/1K)
Output Tokens:         No cache, full cost ($0.015/1K)

Total Cost = (inputTokens × $0.003/1K) +
             (outputTokens × $0.015/1K) +
             (cacheReadTokens × $0.0003/1K) +
             (cacheCreationTokens × $0.003/1K)
```

### 5.5 Index Strategy

**Current Indexes:** (Inferred from common query patterns)
- Primary key on `id`
- Likely index on `timestamp` (for date range queries)
- Likely index on `sessionId` (for session aggregation)
- Likely index on `model` (for model-specific reporting)

**Required Changes:** None

**Rationale:** New columns used in SELECT and aggregations, not WHERE clauses. Existing indexes remain optimal.

---

## 6. Code Changes Required

### 6.1 File: TokenAnalyticsWriter.js

**Path:** `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`

#### Change 1: Update SQL Statement (Lines 218-226)

**Before:**
```javascript
const sql = `
  INSERT INTO token_analytics (
    id, timestamp, sessionId, operation, model,
    inputTokens, outputTokens, totalTokens, estimatedCost
  ) VALUES (
    @id, @timestamp, @sessionId, @operation, @model,
    @inputTokens, @outputTokens, @totalTokens, @estimatedCost
  )
`;
```

**After:**
```javascript
const sql = `
  INSERT INTO token_analytics (
    id, timestamp, sessionId, operation, model,
    inputTokens, outputTokens, totalTokens, estimatedCost,
    cacheReadTokens, cacheCreationTokens
  ) VALUES (
    @id, @timestamp, @sessionId, @operation, @model,
    @inputTokens, @outputTokens, @totalTokens, @estimatedCost,
    @cacheReadTokens, @cacheCreationTokens
  )
`;
```

**Diff:**
```diff
  const sql = `
    INSERT INTO token_analytics (
      id, timestamp, sessionId, operation, model,
-     inputTokens, outputTokens, totalTokens, estimatedCost
+     inputTokens, outputTokens, totalTokens, estimatedCost,
+     cacheReadTokens, cacheCreationTokens
    ) VALUES (
      @id, @timestamp, @sessionId, @operation, @model,
-     @inputTokens, @outputTokens, @totalTokens, @estimatedCost
+     @inputTokens, @outputTokens, @totalTokens, @estimatedCost,
+     @cacheReadTokens, @cacheCreationTokens
    )
  `;
```

#### Change 2: Add Parameters (Lines 229-239)

**Before:**
```javascript
const params = {
  id: id,
  timestamp: timestamp,
  sessionId: metrics.sessionId,
  operation: metrics.operation,
  model: metrics.model,
  inputTokens: metrics.inputTokens,
  outputTokens: metrics.outputTokens,
  totalTokens: metrics.totalTokens,
  estimatedCost: metrics.estimatedCost
};
```

**After:**
```javascript
const params = {
  id: id,
  timestamp: timestamp,
  sessionId: metrics.sessionId,
  operation: metrics.operation,
  model: metrics.model,
  inputTokens: metrics.inputTokens,
  outputTokens: metrics.outputTokens,
  totalTokens: metrics.totalTokens,
  estimatedCost: metrics.estimatedCost,
  cacheReadTokens: metrics.cacheReadTokens || 0,
  cacheCreationTokens: metrics.cacheCreationTokens || 0
};
```

**Diff:**
```diff
  const params = {
    id: id,
    timestamp: timestamp,
    sessionId: metrics.sessionId,
    operation: metrics.operation,
    model: metrics.model,
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    totalTokens: metrics.totalTokens,
-   estimatedCost: metrics.estimatedCost
+   estimatedCost: metrics.estimatedCost,
+   cacheReadTokens: metrics.cacheReadTokens || 0,
+   cacheCreationTokens: metrics.cacheCreationTokens || 0
  };
```

**Null Safety:** The `|| 0` fallback ensures NULL or undefined values default to 0, preventing database constraint violations.

### 6.2 No Other Code Changes Required

**Verification:**
- ✅ Extraction logic (lines 110-112) already correct
- ✅ Metrics object (lines 126-138) already includes cache tokens
- ✅ Cost calculation (lines 168-178) already uses cache tokens
- ✅ Only database persistence needs updating

---

## 7. Migration Strategy

### 7.1 Migration Script

**File:** `/workspaces/agent-feed/api-server/db/migrations/008-add-cache-tokens.sql`

```sql
-- Migration 008: Add Cache Token Tracking
-- Date: 2025-10-25
-- Purpose: Add cacheReadTokens and cacheCreationTokens columns to token_analytics
--
-- Background:
-- Cache tokens are already extracted and used in cost calculations,
-- but not persisted to database. This causes 89% cost visibility gap.
--
-- Impact:
-- - Adds 2 INTEGER columns (8 bytes per record)
-- - Backfills existing records with 0 (cannot recalculate)
-- - Enables complete cost auditing going forward

BEGIN TRANSACTION;

-- Add cacheReadTokens column
ALTER TABLE token_analytics
ADD COLUMN cacheReadTokens INTEGER DEFAULT 0;

-- Add cacheCreationTokens column
ALTER TABLE token_analytics
ADD COLUMN cacheCreationTokens INTEGER DEFAULT 0;

-- Update existing NULL values to 0 (defensive)
UPDATE token_analytics
SET cacheReadTokens = 0
WHERE cacheReadTokens IS NULL;

UPDATE token_analytics
SET cacheCreationTokens = 0
WHERE cacheCreationTokens IS NULL;

-- Verify migration
SELECT
  COUNT(*) as total_records,
  COUNT(cacheReadTokens) as records_with_cache_read,
  COUNT(cacheCreationTokens) as records_with_cache_creation,
  SUM(CASE WHEN cacheReadTokens IS NULL THEN 1 ELSE 0 END) as null_cache_read,
  SUM(CASE WHEN cacheCreationTokens IS NULL THEN 1 ELSE 0 END) as null_cache_creation
FROM token_analytics;

COMMIT;
```

### 7.2 Migration Execution Plan

**Step 1: Pre-Migration Validation**
```bash
# Count existing records
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT COUNT(*) as record_count FROM token_analytics;"

# Expected: 352

# Calculate checksum of existing data
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT SUM(inputTokens + outputTokens) as token_checksum FROM token_analytics;"

# Save this value for post-migration comparison
```

**Step 2: Backup Database**
```bash
# Create timestamped backup
cp /workspaces/agent-feed/database.db \
   /workspaces/agent-feed/database.db.backup-$(date +%Y%m%d-%H%M%S)

# Verify backup
ls -lh /workspaces/agent-feed/database.db*
```

**Step 3: Run Migration**
```bash
cd /workspaces/agent-feed/api-server
sqlite3 ../database.db < db/migrations/008-add-cache-tokens.sql
```

**Step 4: Post-Migration Validation**
```bash
# Verify record count unchanged
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT COUNT(*) as record_count FROM token_analytics;"

# Expected: 352 (same as before)

# Verify checksum unchanged
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT SUM(inputTokens + outputTokens) as token_checksum FROM token_analytics;"

# Expected: Same value as pre-migration

# Verify new columns exist
sqlite3 /workspaces/agent-feed/database.db \
  "PRAGMA table_info(token_analytics);" | grep -E "cacheReadTokens|cacheCreationTokens"

# Expected: Two rows showing the new columns

# Verify no NULL values
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT COUNT(*) FROM token_analytics WHERE cacheReadTokens IS NULL OR cacheCreationTokens IS NULL;"

# Expected: 0
```

**Step 5: Deploy Code Changes**
```bash
# Code changes will be picked up on next server restart
# Or reload without restart if using nodemon/hot-reload
```

**Step 6: Functional Testing**
```bash
# Run test script to create new analytics record
node /workspaces/agent-feed/api-server/scripts/test-analytics-write.js

# Verify new record includes cache tokens
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT cacheReadTokens, cacheCreationTokens, estimatedCost
   FROM token_analytics
   ORDER BY timestamp DESC
   LIMIT 1;"

# Expected: Non-zero cache token values (if SDK provided them)
```

### 7.3 Rollback Plan

**If migration fails:**

```bash
# Stop application
# Restore from backup
rm /workspaces/agent-feed/database.db
cp /workspaces/agent-feed/database.db.backup-YYYYMMDD-HHMMSS \
   /workspaces/agent-feed/database.db

# Verify restoration
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT COUNT(*) FROM token_analytics;"

# Revert code changes (git)
git checkout /workspaces/agent-feed/src/services/TokenAnalyticsWriter.js

# Restart application
```

**If code changes cause issues:**

```bash
# Revert code only (keep schema changes - they're backward compatible)
git checkout /workspaces/agent-feed/src/services/TokenAnalyticsWriter.js

# Restart application
# System will continue working without saving cache tokens
# Can retry code deployment after fixing issues
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Test File:** `/workspaces/agent-feed/src/services/__tests__/TokenAnalyticsWriter.test.js`

#### Test Suite 1: Cache Token Extraction

```javascript
describe('extractMetricsFromSDK - Cache Tokens', () => {
  test('should extract cache_read_input_tokens', () => {
    const messages = [{
      type: 'result',
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 2000,
        cache_creation_input_tokens: 0
      },
      modelUsage: { 'claude-sonnet-4-20250514': {} }
    }];

    const metrics = writer.extractMetricsFromSDK(messages, 'test-session');

    expect(metrics.cacheReadTokens).toBe(2000);
  });

  test('should extract cache_creation_input_tokens', () => {
    const messages = [{
      type: 'result',
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 3000
      },
      modelUsage: { 'claude-sonnet-4-20250514': {} }
    }];

    const metrics = writer.extractMetricsFromSDK(messages, 'test-session');

    expect(metrics.cacheCreationTokens).toBe(3000);
  });

  test('should default to 0 when cache tokens missing', () => {
    const messages = [{
      type: 'result',
      usage: {
        input_tokens: 1000,
        output_tokens: 500
        // No cache tokens
      },
      modelUsage: { 'claude-sonnet-4-20250514': {} }
    }];

    const metrics = writer.extractMetricsFromSDK(messages, 'test-session');

    expect(metrics.cacheReadTokens).toBe(0);
    expect(metrics.cacheCreationTokens).toBe(0);
  });
});
```

#### Test Suite 2: Database Persistence

```javascript
describe('writeToDatabase - Cache Tokens', () => {
  test('should save cacheReadTokens to database', async () => {
    const metrics = {
      sessionId: 'test-session',
      operation: 'test',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      estimatedCost: 0.015,
      cacheReadTokens: 2000,
      cacheCreationTokens: 0
    };

    await writer.writeToDatabase(metrics);

    const record = db.prepare(
      'SELECT cacheReadTokens FROM token_analytics ORDER BY timestamp DESC LIMIT 1'
    ).get();

    expect(record.cacheReadTokens).toBe(2000);
  });

  test('should save cacheCreationTokens to database', async () => {
    const metrics = {
      sessionId: 'test-session',
      operation: 'test',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      estimatedCost: 0.015,
      cacheReadTokens: 0,
      cacheCreationTokens: 3000
    };

    await writer.writeToDatabase(metrics);

    const record = db.prepare(
      'SELECT cacheCreationTokens FROM token_analytics ORDER BY timestamp DESC LIMIT 1'
    ).get();

    expect(record.cacheCreationTokens).toBe(3000);
  });

  test('should default to 0 when cache tokens undefined', async () => {
    const metrics = {
      sessionId: 'test-session',
      operation: 'test',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
      estimatedCost: 0.015
      // No cache tokens
    };

    await writer.writeToDatabase(metrics);

    const record = db.prepare(
      'SELECT cacheReadTokens, cacheCreationTokens FROM token_analytics ORDER BY timestamp DESC LIMIT 1'
    ).get();

    expect(record.cacheReadTokens).toBe(0);
    expect(record.cacheCreationTokens).toBe(0);
  });
});
```

#### Test Suite 3: Cost Calculation Auditability

```javascript
describe('Cost Calculation Auditability', () => {
  test('should be able to reconstruct cost from stored tokens', async () => {
    const metrics = {
      sessionId: 'test-session',
      operation: 'test',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 2000,
      cacheCreationTokens: 3000,
      totalTokens: 1500,
      estimatedCost: 0.0615  // Pre-calculated
    };

    await writer.writeToDatabase(metrics);

    const record = db.prepare(`
      SELECT
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        estimatedCost,
        (inputTokens * 0.003 / 1000) +
        (outputTokens * 0.015 / 1000) +
        (cacheReadTokens * 0.0003 / 1000) +
        (cacheCreationTokens * 0.003 / 1000) as recalculated_cost
      FROM token_analytics
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();

    expect(record.recalculated_cost).toBeCloseTo(record.estimatedCost, 6);
  });
});
```

### 8.2 Integration Tests

**Test File:** `/workspaces/agent-feed/api-server/tests/integration/analytics-cache-tokens.test.js`

```javascript
describe('Analytics Cache Token Integration', () => {
  test('end-to-end: SDK response to database storage', async () => {
    // Simulate SDK response with cache tokens
    const sdkMessages = [{
      type: 'result',
      usage: {
        input_tokens: 1250,
        output_tokens: 850,
        cache_read_input_tokens: 5000,
        cache_creation_input_tokens: 2000
      },
      modelUsage: { 'claude-sonnet-4-20250514': {} },
      total_cost_usd: 0.02575
    }];

    const writer = new TokenAnalyticsWriter(db);
    await writer.writeTokenMetrics(sdkMessages, 'integration-test-session');

    // Verify database record
    const record = db.prepare(`
      SELECT
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        estimatedCost
      FROM token_analytics
      WHERE sessionId = 'integration-test-session'
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();

    expect(record.inputTokens).toBe(1250);
    expect(record.outputTokens).toBe(850);
    expect(record.cacheReadTokens).toBe(5000);
    expect(record.cacheCreationTokens).toBe(2000);
    expect(record.estimatedCost).toBeCloseTo(0.02575, 5);
  });
});
```

### 8.3 Migration Tests

**Test File:** `/workspaces/agent-feed/api-server/tests/integration/migration-008.test.js`

```javascript
describe('Migration 008: Add Cache Tokens', () => {
  test('should add cacheReadTokens column', () => {
    const columns = db.prepare("PRAGMA table_info(token_analytics)").all();
    const cacheReadColumn = columns.find(col => col.name === 'cacheReadTokens');

    expect(cacheReadColumn).toBeDefined();
    expect(cacheReadColumn.type).toBe('INTEGER');
    expect(cacheReadColumn.dflt_value).toBe('0');
  });

  test('should add cacheCreationTokens column', () => {
    const columns = db.prepare("PRAGMA table_info(token_analytics)").all();
    const cacheCreationColumn = columns.find(col => col.name === 'cacheCreationTokens');

    expect(cacheCreationColumn).toBeDefined();
    expect(cacheCreationColumn.type).toBe('INTEGER');
    expect(cacheCreationColumn.dflt_value).toBe('0');
  });

  test('should preserve existing records', () => {
    const countBefore = 352; // Known count
    const countAfter = db.prepare("SELECT COUNT(*) as count FROM token_analytics").get().count;

    expect(countAfter).toBe(countBefore);
  });

  test('should backfill existing records with 0', () => {
    const nullCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM token_analytics
      WHERE cacheReadTokens IS NULL OR cacheCreationTokens IS NULL
    `).get().count;

    expect(nullCount).toBe(0);
  });
});
```

### 8.4 Cost Validation Tests

**Test File:** `/workspaces/agent-feed/api-server/tests/integration/cost-validation.test.js`

```javascript
describe('Cost Validation Against Anthropic Billing', () => {
  test('should match Anthropic billing data sample', async () => {
    // Sample from Oct 24: $21.45
    // Breakdown: Cache write: $10.53, Cache read: $5.17, Output: $4.57
    // Input (no cache): ~$0.18

    const sdkMessages = [{
      type: 'result',
      usage: {
        input_tokens: 60000,        // ~$0.18
        output_tokens: 304667,      // ~$4.57
        cache_read_input_tokens: 1723333,  // ~$5.17
        cache_creation_input_tokens: 3510000 // ~$10.53
      },
      modelUsage: { 'claude-sonnet-4-20250514': {} }
    }];

    const writer = new TokenAnalyticsWriter(db);
    await writer.writeTokenMetrics(sdkMessages, 'cost-validation-session');

    const record = db.prepare(`
      SELECT estimatedCost FROM token_analytics
      WHERE sessionId = 'cost-validation-session'
      ORDER BY timestamp DESC LIMIT 1
    `).get();

    // Should be within 1% of Anthropic billing
    expect(record.estimatedCost).toBeGreaterThan(21.24); // 21.45 - 1%
    expect(record.estimatedCost).toBeLessThan(21.66);    // 21.45 + 1%
  });
});
```

### 8.5 Test Execution

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- TokenAnalyticsWriter
npm test -- migration-008
npm test -- cost-validation

# Run with coverage
npm test -- --coverage
```

---

## 9. Acceptance Criteria

### AC-001: Schema Changes
- [ ] `token_analytics` table has `cacheReadTokens` column
- [ ] `token_analytics` table has `cacheCreationTokens` column
- [ ] Both columns are INTEGER type
- [ ] Both columns default to 0
- [ ] Both columns accept NULL

### AC-002: Data Migration
- [ ] All 352 existing records preserved
- [ ] No data loss or corruption
- [ ] Existing cache token columns set to 0
- [ ] No NULL values in new columns after migration
- [ ] Record count unchanged

### AC-003: Code Changes
- [ ] INSERT SQL includes `cacheReadTokens` in column list
- [ ] INSERT SQL includes `cacheCreationTokens` in column list
- [ ] Parameters include `cacheReadTokens` value
- [ ] Parameters include `cacheCreationTokens` value
- [ ] Null safety implemented (|| 0 fallback)

### AC-004: Functional Testing
- [ ] New records include actual cache token values
- [ ] Missing cache tokens default to 0
- [ ] Cost calculation remains accurate
- [ ] Can reconstruct cost from stored tokens
- [ ] No errors during write operations

### AC-005: Performance
- [ ] Migration completes in < 5 seconds
- [ ] Write operations < 1ms additional overhead
- [ ] Read operations unchanged
- [ ] No server downtime

### AC-006: Cost Validation
- [ ] Sample cost calculations match Anthropic within 1%
- [ ] Can audit all cost components
- [ ] Cost reconciliation shows >95% accuracy
- [ ] Can identify cost optimization opportunities

### AC-007: Backward Compatibility
- [ ] Existing queries work unchanged
- [ ] Existing indexes functional
- [ ] Application code unaffected
- [ ] Analytics reports work correctly

### AC-008: Documentation
- [ ] Migration script documented
- [ ] Code changes documented
- [ ] Validation queries documented
- [ ] Rollback plan documented

---

## 10. Edge Cases

### Edge Case 1: SDK Response with No Cache Tokens

**Scenario:** SDK response omits cache token fields entirely

**Example:**
```javascript
{
  type: 'result',
  usage: {
    input_tokens: 1000,
    output_tokens: 500
    // No cache_read_input_tokens
    // No cache_creation_input_tokens
  }
}
```

**Expected Behavior:**
- `cacheReadTokens` defaults to 0
- `cacheCreationTokens` defaults to 0
- Record saved successfully
- Cost calculation uses 0 for cache tokens

**Test:**
```javascript
test('should handle missing cache tokens', () => {
  const metrics = writer.extractMetricsFromSDK(messagesWithoutCache, 'session');
  expect(metrics.cacheReadTokens).toBe(0);
  expect(metrics.cacheCreationTokens).toBe(0);
});
```

### Edge Case 2: Only Cache Read Tokens (No Cache Creation)

**Scenario:** Request uses existing cache without creating new cache entries

**Example:**
```javascript
{
  usage: {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 5000,
    cache_creation_input_tokens: 0
  }
}
```

**Expected Behavior:**
- `cacheReadTokens` = 5000
- `cacheCreationTokens` = 0
- Total cost reflects 90% discount on cache reads
- Record saved correctly

**Cost Calculation:**
```
(100 × $0.003/1K) + (50 × $0.015/1K) + (5000 × $0.0003/1K) + (0 × $0.003/1K)
= $0.0003 + $0.00075 + $0.0015 + $0
= $0.00255
```

### Edge Case 3: Only Cache Creation (No Cache Read)

**Scenario:** First request creates cache, subsequent requests haven't run yet

**Example:**
```javascript
{
  usage: {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 10000
  }
}
```

**Expected Behavior:**
- `cacheReadTokens` = 0
- `cacheCreationTokens` = 10000
- Full cost for cache creation (no discount)
- Record saved correctly

**Cost Calculation:**
```
(100 × $0.003/1K) + (50 × $0.015/1K) + (0 × $0.0003/1K) + (10000 × $0.003/1K)
= $0.0003 + $0.00075 + $0 + $0.03
= $0.03105
```

### Edge Case 4: Very Large Cache Token Values

**Scenario:** Large documents or long conversations result in millions of cache tokens

**Example:**
```javascript
{
  usage: {
    cache_read_input_tokens: 5000000,  // 5 million tokens
    cache_creation_input_tokens: 3000000  // 3 million tokens
  }
}
```

**Expected Behavior:**
- Values stored correctly (INT max = 2.1B)
- No overflow errors
- Cost calculated accurately
- Performance acceptable

**Constraints:**
- SQLite INTEGER: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
- Max token count well within range
- No special handling needed

### Edge Case 5: NULL vs Undefined vs 0

**Scenario:** Different ways cache tokens might be missing

**Test Cases:**
```javascript
// NULL
{ cache_read_input_tokens: null }        → 0

// Undefined
{ /* field missing */ }                  → 0

// Explicit 0
{ cache_read_input_tokens: 0 }          → 0

// Empty string (malformed)
{ cache_read_input_tokens: "" }         → 0

// NaN (malformed)
{ cache_read_input_tokens: NaN }        → 0
```

**Implementation:**
```javascript
const cacheReadTokens = usage.cache_read_input_tokens || 0;
```

This handles all cases correctly via JavaScript's falsy value coercion.

### Edge Case 6: Migration on Empty Database

**Scenario:** Running migration on database with no records

**Expected Behavior:**
- Columns added successfully
- No UPDATE queries fail
- No errors
- Ready for first record

**Test:**
```sql
-- Verify on empty database
SELECT COUNT(*) FROM token_analytics;
-- Result: 0

-- Verify columns exist
PRAGMA table_info(token_analytics);
-- Should include cacheReadTokens and cacheCreationTokens
```

### Edge Case 7: Migration Already Run

**Scenario:** Accidentally running migration twice

**Expected Behavior:**
- SQLite error: "duplicate column name: cacheReadTokens"
- Transaction rolls back
- No data corruption
- Safe to ignore error

**Prevention:**
```sql
-- Add IF NOT EXISTS check (SQLite 3.35+)
ALTER TABLE token_analytics ADD COLUMN IF NOT EXISTS cacheReadTokens INTEGER DEFAULT 0;
```

### Edge Case 8: Concurrent Writes During Migration

**Scenario:** Analytics writes happening during migration

**SQLite Behavior:**
- ALTER TABLE acquires exclusive lock
- Concurrent writes block until migration completes
- No data loss
- Writes resume automatically after migration

**Mitigation:**
- Run migration during low-traffic period
- Migration completes in < 5 seconds
- Acceptable brief pause

---

## 11. Validation Procedures

### 11.1 Pre-Deployment Validation

#### Validate Current State

```sql
-- Count existing records
SELECT COUNT(*) as total_records FROM token_analytics;
-- Expected: 352

-- Verify current schema
PRAGMA table_info(token_analytics);
-- Should NOT show cacheReadTokens or cacheCreationTokens

-- Calculate current sum (for checksum)
SELECT
  SUM(inputTokens) as sum_input,
  SUM(outputTokens) as sum_output,
  SUM(estimatedCost) as sum_cost
FROM token_analytics;
-- Save these values for comparison

-- Sample existing records
SELECT * FROM token_analytics ORDER BY timestamp DESC LIMIT 5;
-- Save output for comparison
```

#### Validate Migration Script

```bash
# Syntax check
sqlite3 :memory: < /workspaces/agent-feed/api-server/db/migrations/008-add-cache-tokens.sql

# Dry run on test database
cp database.db database-test.db
sqlite3 database-test.db < api-server/db/migrations/008-add-cache-tokens.sql
sqlite3 database-test.db "PRAGMA table_info(token_analytics);"
rm database-test.db
```

#### Validate Code Changes

```bash
# Run unit tests
npm test -- TokenAnalyticsWriter

# Check TypeScript/ESLint
npm run lint

# Verify no syntax errors
node --check /workspaces/agent-feed/src/services/TokenAnalyticsWriter.js
```

### 11.2 Post-Deployment Validation

#### Immediate Validation (Within 5 minutes)

```sql
-- Verify schema changes
PRAGMA table_info(token_analytics);
-- Should show cacheReadTokens and cacheCreationTokens

-- Verify record count
SELECT COUNT(*) as total_records FROM token_analytics;
-- Expected: 352 (unchanged)

-- Verify checksums
SELECT
  SUM(inputTokens) as sum_input,
  SUM(outputTokens) as sum_output,
  SUM(estimatedCost) as sum_cost
FROM token_analytics;
-- Should match pre-deployment values exactly

-- Verify no NULL values
SELECT COUNT(*) as null_count
FROM token_analytics
WHERE cacheReadTokens IS NULL OR cacheCreationTokens IS NULL;
-- Expected: 0

-- Verify backfill
SELECT
  MIN(cacheReadTokens) as min_cache_read,
  MAX(cacheReadTokens) as max_cache_read,
  MIN(cacheCreationTokens) as min_cache_creation,
  MAX(cacheCreationTokens) as max_cache_creation
FROM token_analytics
WHERE timestamp < datetime('now', '-10 minutes');
-- Expected: All 0 (backfilled records)
```

#### Functional Testing (Within 30 minutes)

```bash
# Create test analytics record
node /workspaces/agent-feed/api-server/scripts/test-analytics-write.js

# Verify new record has cache tokens
sqlite3 /workspaces/agent-feed/database.db "
SELECT
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheCreationTokens,
  estimatedCost
FROM token_analytics
ORDER BY timestamp DESC
LIMIT 1;
"
# Should show non-zero cache values if SDK provided them
```

#### Cost Validation (Within 1 hour)

```sql
-- Verify cost calculation accuracy
SELECT
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheCreationTokens,
  estimatedCost as stored_cost,
  (inputTokens * 0.003 / 1000) +
  (outputTokens * 0.015 / 1000) +
  (cacheReadTokens * 0.0003 / 1000) +
  (cacheCreationTokens * 0.003 / 1000) as calculated_cost,
  ABS(
    estimatedCost -
    ((inputTokens * 0.003 / 1000) +
     (outputTokens * 0.015 / 1000) +
     (cacheReadTokens * 0.0003 / 1000) +
     (cacheCreationTokens * 0.003 / 1000))
  ) as cost_diff
FROM token_analytics
WHERE timestamp > datetime('now', '-1 hour')
ORDER BY timestamp DESC
LIMIT 10;

-- cost_diff should be < 0.000001 (rounding errors only)
```

### 11.3 Ongoing Monitoring

#### Daily Checks (First Week)

```sql
-- Check cache token distribution
SELECT
  DATE(timestamp) as date,
  COUNT(*) as records,
  AVG(cacheReadTokens) as avg_cache_read,
  AVG(cacheCreationTokens) as avg_cache_creation,
  SUM(CASE WHEN cacheReadTokens > 0 THEN 1 ELSE 0 END) as records_with_cache_read,
  SUM(CASE WHEN cacheCreationTokens > 0 THEN 1 ELSE 0 END) as records_with_cache_creation
FROM token_analytics
WHERE timestamp > datetime('now', '-7 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

#### Weekly Cost Reconciliation

```sql
-- Compare analytics cost vs estimated Anthropic cost
SELECT
  DATE(timestamp) as date,
  SUM(estimatedCost) as total_cost,
  SUM((inputTokens * 0.003 / 1000)) as input_cost,
  SUM((outputTokens * 0.015 / 1000)) as output_cost,
  SUM((cacheReadTokens * 0.0003 / 1000)) as cache_read_cost,
  SUM((cacheCreationTokens * 0.003 / 1000)) as cache_creation_cost,
  -- Cache efficiency metric
  ROUND(
    100.0 * SUM(cacheReadTokens) /
    NULLIF(SUM(cacheReadTokens + cacheCreationTokens), 0),
    2
  ) as cache_hit_rate_pct
FROM token_analytics
WHERE timestamp >= date('now', '-7 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

### 11.4 Rollback Validation

**If rollback is required:**

```sql
-- After restoring backup
-- Verify record count
SELECT COUNT(*) FROM token_analytics;
-- Expected: 352

-- Verify schema reverted
PRAGMA table_info(token_analytics);
-- Should NOT show cacheReadTokens or cacheCreationTokens

-- Verify sample data
SELECT * FROM token_analytics ORDER BY timestamp DESC LIMIT 5;
-- Should match pre-deployment snapshot

-- Verify checksums
SELECT
  SUM(inputTokens) as sum_input,
  SUM(outputTokens) as sum_output,
  SUM(estimatedCost) as sum_cost
FROM token_analytics;
-- Should match pre-deployment values exactly
```

---

## 12. Risk Analysis

### Risk 1: Data Loss During Migration

**Probability:** Very Low
**Impact:** Critical
**Severity:** High

**Mitigation:**
- Create database backup before migration
- Use transactions (ROLLBACK on error)
- Validate record count before/after
- Test migration on copy first
- Keep backup for 30 days

**Contingency:**
- Restore from backup if data loss detected
- Re-run migration on restored database
- Investigate root cause before retry

### Risk 2: Migration Performance Impact

**Probability:** Low
**Impact:** Medium
**Severity:** Low

**Mitigation:**
- Run during low-traffic period
- ALTER TABLE is fast in SQLite (< 5 seconds)
- Non-blocking operation
- Monitor during deployment

**Contingency:**
- If performance issues, complete migration quickly
- Migration completes even if slow
- No action needed (self-resolving)

### Risk 3: Code Deployment Without Schema

**Probability:** Low
**Impact:** High
**Severity:** Medium

**Scenario:** Code deployed before migration runs

**Symptom:** "table token_analytics has no column named cacheReadTokens"

**Mitigation:**
- Deploy in correct order: Schema first, then code
- Document deployment sequence
- Use deployment checklist
- Automated deployment script

**Contingency:**
- Immediately run migration
- Restart service
- Errors are non-fatal (caught and logged)

### Risk 4: Cost Calculation Mismatch

**Probability:** Very Low
**Impact:** Medium
**Severity:** Low

**Scenario:** Stored costs don't match recalculated costs

**Mitigation:**
- Comprehensive unit tests
- Integration tests with known values
- Post-deployment cost validation queries
- Sample validation against Anthropic billing

**Contingency:**
- Investigate discrepancy root cause
- Fix calculation if needed
- Re-run cost calculation for affected records

### Risk 5: NULL Values in New Columns

**Probability:** Very Low
**Impact:** Low
**Severity:** Low

**Scenario:** New records have NULL cache tokens

**Mitigation:**
- `|| 0` fallback in parameter binding
- DEFAULT 0 in schema
- Unit tests for NULL handling
- Post-deployment NULL check

**Contingency:**
- Run UPDATE to set NULL to 0
- No functional impact (NULL treated as 0)

### Risk 6: Breaking Existing Queries

**Probability:** Very Low
**Impact:** Medium
**Severity:** Low

**Scenario:** Analytics dashboards or reports fail

**Mitigation:**
- Backward compatible schema changes
- Existing columns unchanged
- New columns optional (not in SELECT *)
- No index changes

**Contingency:**
- Update queries to exclude new columns
- Schema is backward compatible (no changes needed)

### Risk 7: Rollback Loses New Data

**Probability:** Low
**Impact:** Low
**Severity:** Low

**Scenario:** Rollback to backup loses records created after migration

**Mitigation:**
- Only rollback if critical failure
- Document rollback timing window
- Export new records before rollback if possible

**Contingency:**
- Accept data loss if rollback required
- Re-generate analytics from source logs if available

---

## 13. Rollback Plan

### 13.1 Rollback Decision Criteria

Rollback if ANY of the following occur:

1. **Data Loss:** Record count decreased after migration
2. **Data Corruption:** Checksum mismatch on existing data
3. **Migration Failure:** Transaction rollback or SQL errors
4. **Code Errors:** Persistent errors writing analytics
5. **Performance Degradation:** Write operations > 10ms slower

**Do NOT rollback for:**
- NULL values in new columns (run UPDATE instead)
- Single failed write (investigate and fix)
- Missing cache tokens in SDK response (expected)

### 13.2 Rollback Procedure

#### Step 1: Stop Application (if needed)

```bash
# If errors are persistent
systemctl stop agent-feed-api
# Or kill process
```

#### Step 2: Restore Database from Backup

```bash
# List available backups
ls -lh /workspaces/agent-feed/database.db.backup-*

# Identify correct backup (pre-migration)
# Format: database.db.backup-YYYYMMDD-HHMMSS

# Restore
cd /workspaces/agent-feed
cp database.db database.db.failed-migration
cp database.db.backup-20251025-HHMMSS database.db
```

#### Step 3: Validate Restoration

```sql
-- Count records
SELECT COUNT(*) FROM token_analytics;
-- Expected: 352

-- Verify schema reverted
PRAGMA table_info(token_analytics);
-- Should NOT show cacheReadTokens or cacheCreationTokens

-- Verify checksums
SELECT
  SUM(inputTokens) as sum_input,
  SUM(outputTokens) as sum_output,
  SUM(estimatedCost) as sum_cost
FROM token_analytics;
-- Should match pre-deployment values
```

#### Step 4: Revert Code Changes

```bash
cd /workspaces/agent-feed
git checkout src/services/TokenAnalyticsWriter.js

# Verify reversion
git diff src/services/TokenAnalyticsWriter.js
# Should show no changes
```

#### Step 5: Restart Application

```bash
systemctl start agent-feed-api
# Or restart process

# Verify service running
curl http://localhost:3000/health
```

#### Step 6: Verify Functionality

```bash
# Test analytics write (with old code)
node /workspaces/agent-feed/api-server/scripts/test-analytics-write.js

# Verify record created
sqlite3 /workspaces/agent-feed/database.db \
  "SELECT COUNT(*) FROM token_analytics WHERE timestamp > datetime('now', '-5 minutes');"
```

### 13.3 Post-Rollback Actions

1. **Preserve Failed State:**
   ```bash
   # Keep failed database for analysis
   ls -lh database.db.failed-migration
   ```

2. **Investigate Root Cause:**
   - Review migration logs
   - Check for SQL errors
   - Verify test coverage
   - Identify what went wrong

3. **Fix Issues:**
   - Update migration script if needed
   - Fix code bugs if found
   - Add missing tests
   - Update documentation

4. **Retest:**
   - Test migration on copy
   - Run full test suite
   - Validate with sample data
   - Get peer review

5. **Retry Deployment:**
   - Schedule new deployment
   - Follow same procedure
   - Monitor closely
   - Validate immediately

---

## 14. Success Metrics

### 14.1 Deployment Success Metrics

**Immediate (< 5 minutes):**
- [ ] Migration completed without errors
- [ ] Record count unchanged (352 records)
- [ ] No NULL values in new columns
- [ ] Service running normally
- [ ] No errors in logs

**Short-term (< 1 hour):**
- [ ] New records include cache token values
- [ ] Cost calculations accurate (< 0.1% error)
- [ ] Write performance impact < 1ms
- [ ] All tests passing

**Medium-term (< 1 day):**
- [ ] 100+ new records with cache tokens
- [ ] Cost reconciliation shows >95% accuracy
- [ ] No rollbacks required
- [ ] No production incidents

### 14.2 Business Success Metrics

**Cost Visibility:**
- [ ] Can see cache read costs separately
- [ ] Can see cache creation costs separately
- [ ] Can calculate cache ROI
- [ ] Can identify optimization opportunities

**Billing Reconciliation:**
- [ ] Analytics costs match Anthropic within 5%
- [ ] Can explain all cost components
- [ ] Can validate monthly invoices
- [ ] Can forecast costs accurately

**Operational Efficiency:**
- [ ] Cache hit rate visible
- [ ] Cache effectiveness measurable
- [ ] Cost optimization data-driven
- [ ] Billing disputes resolvable

### 14.3 Key Performance Indicators (KPIs)

#### Cost Accuracy KPI

**Target:** Analytics costs match Anthropic within 5%

**Measurement:**
```sql
WITH daily_costs AS (
  SELECT
    DATE(timestamp) as date,
    SUM(estimatedCost) as analytics_cost
  FROM token_analytics
  WHERE timestamp > datetime('now', '-30 days')
  GROUP BY DATE(timestamp)
)
SELECT
  date,
  analytics_cost,
  anthropic_cost,  -- From manual billing data
  ABS(analytics_cost - anthropic_cost) / anthropic_cost * 100 as error_pct
FROM daily_costs
JOIN anthropic_billing USING (date)
WHERE error_pct < 5.0;  -- Target: 100% of days
```

#### Cache Effectiveness KPI

**Target:** Cache hit rate > 50% (indicates effective caching)

**Measurement:**
```sql
SELECT
  DATE(timestamp) as date,
  SUM(cacheReadTokens) as total_cache_reads,
  SUM(cacheCreationTokens) as total_cache_writes,
  ROUND(
    100.0 * SUM(cacheReadTokens) /
    NULLIF(SUM(cacheReadTokens + cacheCreationTokens), 0),
    2
  ) as cache_hit_rate_pct
FROM token_analytics
WHERE timestamp > datetime('now', '-7 days')
GROUP BY DATE(timestamp)
HAVING cache_hit_rate_pct > 50.0;
```

#### Cost Savings KPI

**Target:** Cache saves >$10/week in costs

**Measurement:**
```sql
SELECT
  DATE(timestamp) as date,
  -- Cost if no caching (all tokens at full price)
  SUM((inputTokens + cacheReadTokens + cacheCreationTokens) * 0.003 / 1000) +
  SUM(outputTokens * 0.015 / 1000) as cost_without_cache,
  -- Actual cost (with cache discount)
  SUM(estimatedCost) as actual_cost,
  -- Savings
  SUM((inputTokens + cacheReadTokens + cacheCreationTokens) * 0.003 / 1000) +
  SUM(outputTokens * 0.015 / 1000) -
  SUM(estimatedCost) as cache_savings
FROM token_analytics
WHERE timestamp >= date('now', '-7 days')
GROUP BY DATE(timestamp);
```

### 14.4 Success Criteria Summary

**Minimum Viable Success:**
- ✅ Migration completed without data loss
- ✅ New records include cache tokens
- ✅ Cost calculations accurate
- ✅ No production incidents

**Full Success:**
- ✅ All minimum criteria met
- ✅ Cost accuracy within 5% of Anthropic
- ✅ Cache effectiveness measurable
- ✅ Operational insights actionable

**Exceptional Success:**
- ✅ All full success criteria met
- ✅ Cost accuracy within 1% of Anthropic
- ✅ Cache optimization opportunities identified
- ✅ Cost savings quantified and reported

---

## Appendix A: Pricing Reference

### Claude Sonnet 4 Pricing (as of 2025-10-25)

| Token Type | Price per 1K tokens | Discount vs Input |
|------------|---------------------|-------------------|
| Input (no cache) | $0.003 | - |
| Cache Creation | $0.003 | 0% (same as input) |
| Cache Read | $0.0003 | 90% |
| Output | $0.015 | - |

### Cost Calculation Formula

```javascript
const totalCost =
  (inputTokens * 0.003 / 1000) +           // Regular input
  (outputTokens * 0.015 / 1000) +          // Output
  (cacheReadTokens * 0.0003 / 1000) +      // Cache reads (90% off)
  (cacheCreationTokens * 0.003 / 1000);    // Cache writes (full price)
```

### Example Calculations

**Example 1: No Caching**
```
Input: 10,000 tokens
Output: 5,000 tokens
Cost: (10,000 × $0.003/1K) + (5,000 × $0.015/1K) = $0.03 + $0.075 = $0.105
```

**Example 2: With Cache Read**
```
Input: 1,000 tokens
Cache Read: 10,000 tokens
Output: 5,000 tokens
Cost: (1,000 × $0.003/1K) + (10,000 × $0.0003/1K) + (5,000 × $0.015/1K)
    = $0.003 + $0.003 + $0.075 = $0.081
Savings: $0.105 - $0.081 = $0.024 (23% savings)
```

**Example 3: Cache Creation + Read**
```
Request 1 (cache creation):
  Input: 1,000 tokens
  Cache Write: 10,000 tokens
  Output: 5,000 tokens
  Cost: (1,000 × $0.003/1K) + (10,000 × $0.003/1K) + (5,000 × $0.015/1K)
      = $0.003 + $0.03 + $0.075 = $0.108

Request 2 (cache read):
  Input: 1,000 tokens
  Cache Read: 10,000 tokens
  Output: 5,000 tokens
  Cost: (1,000 × $0.003/1K) + (10,000 × $0.0003/1K) + (5,000 × $0.015/1K)
      = $0.003 + $0.003 + $0.075 = $0.081

Total: $0.108 + $0.081 = $0.189
Without cache: $0.105 × 2 = $0.210
Savings: $0.021 (10% savings over 2 requests)
```

---

## Appendix B: SQL Query Library

### Data Validation Queries

```sql
-- Check for NULL values
SELECT COUNT(*) FROM token_analytics
WHERE cacheReadTokens IS NULL OR cacheCreationTokens IS NULL;

-- Check for negative values (invalid)
SELECT COUNT(*) FROM token_analytics
WHERE cacheReadTokens < 0 OR cacheCreationTokens < 0;

-- Verify cost calculation
SELECT
  id,
  inputTokens,
  outputTokens,
  cacheReadTokens,
  cacheCreationTokens,
  estimatedCost,
  (inputTokens * 0.003 / 1000) +
  (outputTokens * 0.015 / 1000) +
  (cacheReadTokens * 0.0003 / 1000) +
  (cacheCreationTokens * 0.003 / 1000) as recalculated,
  ABS(estimatedCost - (
    (inputTokens * 0.003 / 1000) +
    (outputTokens * 0.015 / 1000) +
    (cacheReadTokens * 0.0003 / 1000) +
    (cacheCreationTokens * 0.003 / 1000)
  )) as diff
FROM token_analytics
ORDER BY diff DESC
LIMIT 10;
```

### Reporting Queries

```sql
-- Daily cost breakdown
SELECT
  DATE(timestamp) as date,
  COUNT(*) as requests,
  SUM(inputTokens) as total_input,
  SUM(outputTokens) as total_output,
  SUM(cacheReadTokens) as total_cache_read,
  SUM(cacheCreationTokens) as total_cache_creation,
  ROUND(SUM(inputTokens * 0.003 / 1000), 4) as input_cost,
  ROUND(SUM(outputTokens * 0.015 / 1000), 4) as output_cost,
  ROUND(SUM(cacheReadTokens * 0.0003 / 1000), 4) as cache_read_cost,
  ROUND(SUM(cacheCreationTokens * 0.003 / 1000), 4) as cache_creation_cost,
  ROUND(SUM(estimatedCost), 4) as total_cost
FROM token_analytics
WHERE timestamp >= date('now', '-30 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Cache effectiveness
SELECT
  DATE(timestamp) as date,
  SUM(cacheReadTokens) as cache_reads,
  SUM(cacheCreationTokens) as cache_writes,
  ROUND(100.0 * SUM(cacheReadTokens) / NULLIF(SUM(cacheReadTokens + cacheCreationTokens), 0), 2) as hit_rate_pct,
  ROUND(SUM(cacheReadTokens * (0.003 - 0.0003) / 1000), 4) as savings
FROM token_analytics
WHERE timestamp >= date('now', '-7 days')
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Top cache consumers
SELECT
  sessionId,
  COUNT(*) as requests,
  SUM(cacheReadTokens + cacheCreationTokens) as total_cache_tokens,
  SUM(cacheReadTokens) as reads,
  SUM(cacheCreationTokens) as writes,
  ROUND(SUM(estimatedCost), 4) as total_cost
FROM token_analytics
WHERE timestamp >= date('now', '-7 days')
GROUP BY sessionId
ORDER BY total_cache_tokens DESC
LIMIT 10;
```

---

## Appendix C: Files Modified

### New Files

1. `/workspaces/agent-feed/api-server/db/migrations/008-add-cache-tokens.sql`
   - Migration script to add cache token columns
   - ~50 lines (SQL + comments)

2. `/workspaces/agent-feed/docs/SPARC-CACHE-TOKEN-FIX-SPEC.md` (this document)
   - Complete specification
   - ~1500 lines

### Modified Files

1. `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`
   - Lines 218-226: Update INSERT SQL
   - Lines 229-239: Add cache token parameters
   - ~8 lines changed

### Test Files (to be created)

1. `/workspaces/agent-feed/src/services/__tests__/TokenAnalyticsWriter.test.js`
   - Unit tests for cache token extraction and storage
   - ~200 lines

2. `/workspaces/agent-feed/api-server/tests/integration/analytics-cache-tokens.test.js`
   - Integration tests for end-to-end flow
   - ~100 lines

3. `/workspaces/agent-feed/api-server/tests/integration/migration-008.test.js`
   - Migration validation tests
   - ~80 lines

4. `/workspaces/agent-feed/api-server/tests/integration/cost-validation.test.js`
   - Cost calculation validation tests
   - ~60 lines

---

## Appendix D: Timeline

### Development Phase (1 hour)

- [ ] Create migration script (15 min)
- [ ] Update TokenAnalyticsWriter.js (10 min)
- [ ] Write unit tests (20 min)
- [ ] Write integration tests (15 min)

### Testing Phase (30 minutes)

- [ ] Run all tests locally (10 min)
- [ ] Test migration on copy (5 min)
- [ ] Validate cost calculations (10 min)
- [ ] Code review (5 min)

### Deployment Phase (30 minutes)

- [ ] Backup database (2 min)
- [ ] Run migration (1 min)
- [ ] Validate migration (5 min)
- [ ] Deploy code changes (2 min)
- [ ] Restart service (1 min)
- [ ] Functional testing (10 min)
- [ ] Monitor for issues (10 min)

### Post-Deployment (ongoing)

- [ ] Daily monitoring (first week)
- [ ] Weekly cost reconciliation
- [ ] Monthly Anthropic billing validation

**Total Estimated Time:** 2-3 hours

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-25 | SPARC Spec Agent | Initial specification |

---

**End of Specification**

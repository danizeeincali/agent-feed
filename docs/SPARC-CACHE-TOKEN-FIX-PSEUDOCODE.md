# SPARC Pseudocode: Cache Token Tracking Fix

**Phase:** Pseudocode
**Date:** 2025-10-25
**Status:** Ready for Implementation

## Executive Summary

This document provides detailed algorithmic pseudocode for adding cache token tracking to the token analytics database. The implementation requires:

1. Database schema migration (2 new columns)
2. Enhanced INSERT statement (2 additional parameters)
3. Validation algorithms (cost accuracy verification)

**Impact:** Zero breaking changes - existing records preserved with default values.

---

## Problem Statement

### Current State
- Cache tokens ARE extracted from SDK (Line 110-112)
- Cache tokens ARE included in metrics object (Line 126-138)
- Cache tokens ARE used in cost calculation (Line 168-178)
- Cache tokens NOT saved to database (Line 218-239)

### Required Changes
- Add `cacheReadTokens` column to database
- Add `cacheCreationTokens` column to database
- Update INSERT SQL to include cache columns
- Update parameter binding to include cache values

---

## Algorithm 1: Database Schema Migration

### Purpose
Safely add cache token columns to existing database without data loss.

### Pseudocode

```
ALGORITHM: MigrateCacheTokenColumns
INPUT: db (SQLite database connection)
OUTPUT: migrationResult (success/failure report)

CONSTANTS:
    COLUMN_CACHE_READ = "cacheReadTokens"
    COLUMN_CACHE_CREATION = "cacheCreationTokens"
    TABLE_NAME = "token_analytics"
    DEFAULT_VALUE = 0

BEGIN
    LOG "=== Starting Cache Token Migration ==="
    LOG "Target table:", TABLE_NAME
    LOG "Columns to add:", [COLUMN_CACHE_READ, COLUMN_CACHE_CREATION]

    // Step 1: Get current schema
    TRY:
        tableInfo = EXECUTE_QUERY(
            "PRAGMA table_info(" + TABLE_NAME + ")"
        )

        existingColumns = EXTRACT_COLUMN_NAMES(tableInfo)
        LOG "Current columns:", existingColumns
        LOG "Total existing columns:", LENGTH(existingColumns)

    CATCH error:
        LOG "ERROR: Failed to read table schema:", error
        RETURN {success: false, error: error}
    END TRY

    // Step 2: Check if columns already exist
    cacheReadExists = COLUMN_CACHE_READ IN existingColumns
    cacheCreationExists = COLUMN_CACHE_CREATION IN existingColumns

    IF cacheReadExists AND cacheCreationExists THEN
        LOG "INFO: Both cache columns already exist"
        LOG "Migration not needed"
        RETURN {
            success: true,
            alreadyMigrated: true,
            message: "Schema already up to date"
        }
    END IF

    // Step 3: Count existing records (for verification)
    recordCountBefore = EXECUTE_SCALAR(
        "SELECT COUNT(*) FROM " + TABLE_NAME
    )
    LOG "Records before migration:", recordCountBefore

    // Step 4: Add cacheReadTokens column if missing
    IF NOT cacheReadExists THEN
        LOG "Adding column:", COLUMN_CACHE_READ

        TRY:
            EXECUTE_SQL(
                "ALTER TABLE " + TABLE_NAME +
                " ADD COLUMN " + COLUMN_CACHE_READ +
                " INTEGER DEFAULT " + DEFAULT_VALUE
            )

            LOG "✅ Column added:", COLUMN_CACHE_READ

        CATCH error:
            LOG "❌ Failed to add cacheReadTokens:", error
            THROW error
        END TRY
    ELSE:
        LOG "⏭️  Column already exists:", COLUMN_CACHE_READ
    END IF

    // Step 5: Add cacheCreationTokens column if missing
    IF NOT cacheCreationExists THEN
        LOG "Adding column:", COLUMN_CACHE_CREATION

        TRY:
            EXECUTE_SQL(
                "ALTER TABLE " + TABLE_NAME +
                " ADD COLUMN " + COLUMN_CACHE_CREATION +
                " INTEGER DEFAULT " + DEFAULT_VALUE
            )

            LOG "✅ Column added:", COLUMN_CACHE_CREATION

        CATCH error:
            LOG "❌ Failed to add cacheCreationTokens:", error
            THROW error
        END TRY
    ELSE:
        LOG "⏭️  Column already exists:", COLUMN_CACHE_CREATION
    END IF

    // Step 6: Verify migration success
    LOG "Verifying migration..."

    newTableInfo = EXECUTE_QUERY(
        "PRAGMA table_info(" + TABLE_NAME + ")"
    )

    newColumns = EXTRACT_COLUMN_NAMES(newTableInfo)

    // Assert both columns now exist
    IF COLUMN_CACHE_READ NOT IN newColumns THEN
        LOG "❌ CRITICAL: cacheReadTokens column not found after migration"
        THROW MigrationError("cacheReadTokens column missing")
    END IF

    IF COLUMN_CACHE_CREATION NOT IN newColumns THEN
        LOG "❌ CRITICAL: cacheCreationTokens column not found after migration"
        THROW MigrationError("cacheCreationTokens column missing")
    END IF

    // Step 7: Verify no data loss
    recordCountAfter = EXECUTE_SCALAR(
        "SELECT COUNT(*) FROM " + TABLE_NAME
    )

    IF recordCountAfter != recordCountBefore THEN
        LOG "❌ WARNING: Record count changed during migration"
        LOG "Before:", recordCountBefore
        LOG "After:", recordCountAfter
        LOG "Difference:", recordCountAfter - recordCountBefore
    ELSE:
        LOG "✅ Record count preserved:", recordCountAfter
    END IF

    // Step 8: Verify default values applied
    nullCacheRecords = EXECUTE_SCALAR(
        "SELECT COUNT(*) FROM " + TABLE_NAME +
        " WHERE " + COLUMN_CACHE_READ + " IS NULL" +
        " OR " + COLUMN_CACHE_CREATION + " IS NULL"
    )

    IF nullCacheRecords > 0 THEN
        LOG "❌ WARNING:", nullCacheRecords, "records have NULL cache tokens"
    ELSE:
        LOG "✅ All records have cache token values"
    END IF

    // Step 9: Generate migration report
    LOG "=== Migration Complete ==="
    LOG "Columns added:",
        (NOT cacheReadExists ? 1 : 0) + (NOT cacheCreationExists ? 1 : 0)
    LOG "Total columns now:", LENGTH(newColumns)
    LOG "Records preserved:", recordCountAfter

    RETURN {
        success: true,
        columnsAdded: {
            cacheReadTokens: NOT cacheReadExists,
            cacheCreationTokens: NOT cacheCreationExists
        },
        recordsPreserved: recordCountAfter,
        totalColumns: LENGTH(newColumns)
    }

END ALGORITHM
```

### Complexity Analysis

**Time Complexity:**
- `PRAGMA table_info`: O(c) where c = number of columns (~11)
- `ALTER TABLE ADD COLUMN`: O(n) where n = number of records (~352)
- Total: O(n) dominated by ALTER TABLE scan

**Space Complexity:**
- O(1) - adds 2 INTEGER columns (8 bytes per record)
- Total additional space: 352 records × 8 bytes = 2,816 bytes

**Expected Runtime:**
- Small database (< 1000 records): < 1 second
- Current database (352 records): < 0.5 seconds
- Large database (> 10,000 records): < 5 seconds

### Edge Cases Handled

1. **Columns Already Exist**: Skip gracefully, return success
2. **Partial Migration**: Only add missing columns
3. **Data Loss**: Verify record count before/after
4. **NULL Values**: Assert all records have default 0
5. **Transaction Failure**: Rollback on error (SQLite auto-rollback)

---

## Algorithm 2: Enhanced Token Metrics Writer

### Purpose
Write token analytics including cache token values to database.

### Pseudocode

```
ALGORITHM: WriteTokenMetricsWithCache
INPUT: metrics (object containing token counts and metadata)
OUTPUT: writeResult (success with record ID or failure)

PRECONDITIONS:
    - metrics.sessionId must be non-empty string
    - metrics.model must be valid model identifier
    - metrics.inputTokens >= 0
    - metrics.outputTokens >= 0
    - metrics.totalTokens = inputTokens + outputTokens
    - Database schema includes cacheReadTokens, cacheCreationTokens columns

BEGIN
    LOG "Writing token metrics with cache tracking"
    LOG "Session ID:", metrics.sessionId
    LOG "Model:", metrics.model
    LOG "Input tokens:", metrics.inputTokens
    LOG "Output tokens:", metrics.outputTokens
    LOG "Cache read tokens:", metrics.cacheReadTokens
    LOG "Cache creation tokens:", metrics.cacheCreationTokens

    // Step 1: Generate unique record ID
    recordId = GENERATE_UUID_V4()
    timestamp = GET_CURRENT_ISO8601_TIMESTAMP()

    LOG "Generated record ID:", recordId
    LOG "Timestamp:", timestamp

    // Step 2: Prepare SQL statement with cache columns
    sqlInsert = """
        INSERT INTO token_analytics (
            id,
            timestamp,
            sessionId,
            operation,
            model,
            inputTokens,
            outputTokens,
            totalTokens,
            estimatedCost,
            cacheReadTokens,
            cacheCreationTokens
        ) VALUES (
            @id,
            @timestamp,
            @sessionId,
            @operation,
            @model,
            @inputTokens,
            @outputTokens,
            @totalTokens,
            @estimatedCost,
            @cacheReadTokens,
            @cacheCreationTokens
        )
    """

    // Step 3: Prepare parameter binding (with safe defaults)
    params = {
        id: recordId,
        timestamp: timestamp,
        sessionId: metrics.sessionId,
        operation: metrics.operation OR "unknown",
        model: metrics.model,
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        totalTokens: metrics.totalTokens,
        estimatedCost: metrics.estimatedCost,
        cacheReadTokens: metrics.cacheReadTokens OR 0,
        cacheCreationTokens: metrics.cacheCreationTokens OR 0
    }

    // Step 4: Validate parameters before write
    IF params.inputTokens < 0 THEN
        LOG "ERROR: Invalid inputTokens (negative):", params.inputTokens
        THROW ValidationError("inputTokens cannot be negative")
    END IF

    IF params.outputTokens < 0 THEN
        LOG "ERROR: Invalid outputTokens (negative):", params.outputTokens
        THROW ValidationError("outputTokens cannot be negative")
    END IF

    IF params.cacheReadTokens < 0 THEN
        LOG "ERROR: Invalid cacheReadTokens (negative):", params.cacheReadTokens
        THROW ValidationError("cacheReadTokens cannot be negative")
    END IF

    IF params.cacheCreationTokens < 0 THEN
        LOG "ERROR: Invalid cacheCreationTokens (negative):", params.cacheCreationTokens
        THROW ValidationError("cacheCreationTokens cannot be negative")
    END IF

    expectedTotal = params.inputTokens + params.outputTokens
    IF params.totalTokens != expectedTotal THEN
        LOG "WARNING: totalTokens mismatch"
        LOG "Expected:", expectedTotal
        LOG "Actual:", params.totalTokens
    END IF

    // Step 5: Execute INSERT
    LOG "Executing INSERT with parameters:", params

    TRY:
        stmt = db.prepare(sqlInsert)
        result = stmt.run(params)

        // Step 6: Verify write succeeded
        IF result.changes != 1 THEN
            LOG "ERROR: Expected 1 row inserted, got:", result.changes
            THROW WriteError("INSERT did not write exactly 1 record")
        END IF

        LOG "✅ Record written successfully"
        LOG "Record ID:", recordId
        LOG "Rows affected:", result.changes

        // Step 7: Optional - Verify record is readable
        verifyQuery = """
            SELECT id, cacheReadTokens, cacheCreationTokens
            FROM token_analytics
            WHERE id = @id
        """

        verifyStmt = db.prepare(verifyQuery)
        verifyResult = verifyStmt.get({id: recordId})

        IF verifyResult == NULL THEN
            LOG "WARNING: Record not found immediately after insert"
        ELSE:
            LOG "✅ Record verified in database"
            LOG "Cache read tokens saved:", verifyResult.cacheReadTokens
            LOG "Cache creation tokens saved:", verifyResult.cacheCreationTokens

            // Assert cache values match
            IF verifyResult.cacheReadTokens != params.cacheReadTokens THEN
                LOG "ERROR: cacheReadTokens mismatch after write"
            END IF

            IF verifyResult.cacheCreationTokens != params.cacheCreationTokens THEN
                LOG "ERROR: cacheCreationTokens mismatch after write"
            END IF
        END IF

        RETURN {
            success: true,
            recordId: recordId,
            timestamp: timestamp,
            rowsAffected: result.changes
        }

    CATCH error:
        LOG "❌ Failed to write token metrics:", error.message
        LOG "SQL:", sqlInsert
        LOG "Parameters:", params
        THROW error
    END TRY

END ALGORITHM
```

### Complexity Analysis

**Time Complexity:**
- `GENERATE_UUID_V4()`: O(1)
- `db.prepare()`: O(1) - SQL compilation
- `stmt.run()`: O(log n) - B-tree index insert
- `stmt.get()` (verification): O(log n) - index lookup
- Total: O(log n) where n = number of records

**Space Complexity:**
- O(1) - single record in memory
- Record size: ~200 bytes (includes all columns)
- Cache token columns: +8 bytes (2 × 4-byte INTEGER)

**Expected Runtime:**
- Single write: < 5ms
- With verification: < 10ms
- 1000 writes: < 5 seconds

### Data Flow

```
Input Metrics Object:
{
  sessionId: "abc-123",
  model: "claude-sonnet-4-20250514",
  inputTokens: 1000,
  outputTokens: 500,
  cacheReadTokens: 200,      // ← NEW
  cacheCreationTokens: 50,   // ← NEW
  totalTokens: 1500,
  estimatedCost: 0.015
}
    ↓
Parameter Binding (with defaults):
{
  id: "f47ac10b-...",
  timestamp: "2025-10-25T10:30:00.000Z",
  sessionId: "abc-123",
  operation: "chat",
  model: "claude-sonnet-4-20250514",
  inputTokens: 1000,
  outputTokens: 500,
  totalTokens: 1500,
  estimatedCost: 0.015,
  cacheReadTokens: 200,      // ← Applied
  cacheCreationTokens: 50    // ← Applied
}
    ↓
Database Record:
| id | timestamp | ... | cacheReadTokens | cacheCreationTokens |
|----|-----------|-----|-----------------|---------------------|
| f47| 2025-10.. | ... | 200             | 50                  |
```

---

## Algorithm 3: Cost Accuracy Validation

### Purpose
Verify that stored costs match calculated costs including cache token pricing.

### Pseudocode

```
ALGORITHM: ValidateCostAccuracy
INPUT: recordId (UUID of record to validate)
OUTPUT: validationResult (pass/fail with details)

CONSTANTS:
    // Pricing per 1000 tokens (USD)
    PRICING = {
        "claude-sonnet-4-20250514": {
            input: 0.003,
            output: 0.015,
            cacheRead: 0.0003,
            cacheCreation: 0.00375
        },
        "claude-sonnet-3-5-20241022": {
            input: 0.003,
            output: 0.015,
            cacheRead: 0.0003,
            cacheCreation: 0.00375
        }
    }

    TOLERANCE_PERCENT = 1.0  // Allow 1% error for rounding

BEGIN
    LOG "=== Validating Cost Accuracy ==="
    LOG "Record ID:", recordId

    // Step 1: Fetch record from database
    query = """
        SELECT
            id,
            model,
            inputTokens,
            outputTokens,
            cacheReadTokens,
            cacheCreationTokens,
            estimatedCost,
            timestamp
        FROM token_analytics
        WHERE id = @recordId
    """

    TRY:
        stmt = db.prepare(query)
        record = stmt.get({recordId: recordId})

        IF record == NULL THEN
            LOG "ERROR: Record not found:", recordId
            RETURN {success: false, error: "Record not found"}
        END IF

        LOG "Record fetched:", record

    CATCH error:
        LOG "ERROR: Failed to fetch record:", error
        RETURN {success: false, error: error}
    END TRY

    // Step 2: Get pricing for model
    IF record.model NOT IN PRICING THEN
        LOG "WARNING: No pricing data for model:", record.model
        LOG "Skipping cost validation"
        RETURN {success: true, skipped: true, reason: "Unknown model"}
    END IF

    modelPricing = PRICING[record.model]
    LOG "Model pricing:", modelPricing

    // Step 3: Calculate expected cost
    // Cost = (tokens / 1000) * price_per_1000

    inputCost = (record.inputTokens / 1000.0) * modelPricing.input
    outputCost = (record.outputTokens / 1000.0) * modelPricing.output
    cacheReadCost = (record.cacheReadTokens / 1000.0) * modelPricing.cacheRead
    cacheCreationCost = (record.cacheCreationTokens / 1000.0) * modelPricing.cacheCreation

    calculatedCost = inputCost + outputCost + cacheReadCost + cacheCreationCost

    LOG "Cost breakdown:"
    LOG "  Input tokens:", record.inputTokens, "→ $", inputCost
    LOG "  Output tokens:", record.outputTokens, "→ $", outputCost
    LOG "  Cache read tokens:", record.cacheReadTokens, "→ $", cacheReadCost
    LOG "  Cache creation tokens:", record.cacheCreationTokens, "→ $", cacheCreationCost
    LOG "  Total calculated:", calculatedCost
    LOG "  Stored cost:", record.estimatedCost

    // Step 4: Compare costs
    difference = ABS(calculatedCost - record.estimatedCost)

    // Avoid division by zero
    IF record.estimatedCost == 0 THEN
        IF calculatedCost == 0 THEN
            percentError = 0
        ELSE:
            percentError = 100.0  // Infinite error
        END IF
    ELSE:
        percentError = (difference / record.estimatedCost) * 100.0
    END IF

    LOG "Difference: $", difference
    LOG "Percent error:", percentError, "%"

    // Step 5: Determine pass/fail
    IF percentError <= TOLERANCE_PERCENT THEN
        LOG "✅ PASS - Cost within tolerance"

        RETURN {
            success: true,
            passed: true,
            recordId: recordId,
            calculatedCost: calculatedCost,
            storedCost: record.estimatedCost,
            difference: difference,
            percentError: percentError,
            breakdown: {
                input: inputCost,
                output: outputCost,
                cacheRead: cacheReadCost,
                cacheCreation: cacheCreationCost
            }
        }
    ELSE:
        LOG "❌ FAIL - Cost exceeds tolerance"
        LOG "Tolerance:", TOLERANCE_PERCENT, "%"
        LOG "Actual error:", percentError, "%"

        RETURN {
            success: true,
            passed: false,
            recordId: recordId,
            calculatedCost: calculatedCost,
            storedCost: record.estimatedCost,
            difference: difference,
            percentError: percentError,
            tolerance: TOLERANCE_PERCENT,
            breakdown: {
                input: inputCost,
                output: outputCost,
                cacheRead: cacheReadCost,
                cacheCreation: cacheCreationCost
            }
        }
    END IF

END ALGORITHM
```

### Complexity Analysis

**Time Complexity:**
- `SELECT WHERE id`: O(1) - primary key lookup
- Cost calculation: O(1) - fixed arithmetic operations
- Total: O(1)

**Space Complexity:**
- O(1) - single record in memory

**Expected Runtime:**
- Single validation: < 2ms
- 352 records validation: < 1 second

### Validation Scenarios

**Scenario 1: No Cache Usage**
```
Input Tokens: 1000 @ $0.003/1k = $0.003
Output Tokens: 500 @ $0.015/1k = $0.0075
Cache Read: 0 @ $0.0003/1k = $0
Cache Creation: 0 @ $0.00375/1k = $0
Total: $0.0105 ✅
```

**Scenario 2: With Cache Reads**
```
Input Tokens: 1000 @ $0.003/1k = $0.003
Output Tokens: 500 @ $0.015/1k = $0.0075
Cache Read: 2000 @ $0.0003/1k = $0.0006
Cache Creation: 0 @ $0.00375/1k = $0
Total: $0.0111 ✅ (10% savings vs non-cached)
```

**Scenario 3: Cache Creation**
```
Input Tokens: 1000 @ $0.003/1k = $0.003
Output Tokens: 500 @ $0.015/1k = $0.0075
Cache Read: 0 @ $0.0003/1k = $0
Cache Creation: 500 @ $0.00375/1k = $0.001875
Total: $0.012375 ✅
```

---

## Algorithm 4: Migration Verification Suite

### Purpose
Comprehensive verification that migration completed successfully.

### Pseudocode

```
ALGORITHM: VerifyMigrationComplete
INPUT: db (database connection)
OUTPUT: verificationReport (detailed test results)

BEGIN
    LOG "=== Starting Migration Verification ==="

    testResults = {
        schemaCheck: null,
        dataIntegrity: null,
        defaultValues: null,
        writeTest: null,
        costValidation: null
    }

    // TEST 1: Schema Verification
    LOG "\n--- Test 1: Schema Verification ---"

    TRY:
        tableInfo = EXECUTE_QUERY("PRAGMA table_info(token_analytics)")
        columns = EXTRACT_COLUMN_NAMES(tableInfo)

        LOG "Total columns found:", LENGTH(columns)
        LOG "Columns:", columns

        cacheReadExists = "cacheReadTokens" IN columns
        cacheCreationExists = "cacheCreationTokens" IN columns

        IF cacheReadExists AND cacheCreationExists THEN
            LOG "✅ PASS: Both cache columns exist"
            testResults.schemaCheck = {
                passed: true,
                cacheReadTokens: true,
                cacheCreationTokens: true
            }
        ELSE:
            LOG "❌ FAIL: Missing cache columns"
            LOG "cacheReadTokens exists:", cacheReadExists
            LOG "cacheCreationTokens exists:", cacheCreationExists

            testResults.schemaCheck = {
                passed: false,
                cacheReadTokens: cacheReadExists,
                cacheCreationTokens: cacheCreationExists,
                error: "Required columns missing"
            }
        END IF

    CATCH error:
        LOG "❌ FAIL: Schema check error:", error
        testResults.schemaCheck = {passed: false, error: error}
    END TRY


    // TEST 2: Data Integrity Check
    LOG "\n--- Test 2: Data Integrity Check ---"

    TRY:
        totalRecords = EXECUTE_SCALAR(
            "SELECT COUNT(*) FROM token_analytics"
        )

        LOG "Total records in database:", totalRecords

        // Verify minimum expected records (352 as of migration)
        EXPECTED_MIN_RECORDS = 352

        IF totalRecords >= EXPECTED_MIN_RECORDS THEN
            LOG "✅ PASS: Record count preserved"
            LOG "Expected minimum:", EXPECTED_MIN_RECORDS
            LOG "Actual:", totalRecords

            testResults.dataIntegrity = {
                passed: true,
                recordCount: totalRecords,
                expectedMin: EXPECTED_MIN_RECORDS
            }
        ELSE:
            LOG "❌ FAIL: Records lost during migration"
            LOG "Expected minimum:", EXPECTED_MIN_RECORDS
            LOG "Actual:", totalRecords
            LOG "Records lost:", EXPECTED_MIN_RECORDS - totalRecords

            testResults.dataIntegrity = {
                passed: false,
                recordCount: totalRecords,
                expectedMin: EXPECTED_MIN_RECORDS,
                recordsLost: EXPECTED_MIN_RECORDS - totalRecords
            }
        END IF

    CATCH error:
        LOG "❌ FAIL: Data integrity check error:", error
        testResults.dataIntegrity = {passed: false, error: error}
    END TRY


    // TEST 3: Default Values Check
    LOG "\n--- Test 3: Default Values Check ---"

    TRY:
        nullCacheRecords = EXECUTE_SCALAR("""
            SELECT COUNT(*) FROM token_analytics
            WHERE cacheReadTokens IS NULL
               OR cacheCreationTokens IS NULL
        """)

        LOG "Records with NULL cache tokens:", nullCacheRecords

        IF nullCacheRecords == 0 THEN
            LOG "✅ PASS: All records have cache token values"
            testResults.defaultValues = {
                passed: true,
                nullRecords: 0
            }
        ELSE:
            LOG "❌ FAIL: Some records have NULL cache tokens"
            LOG "Count:", nullCacheRecords

            testResults.defaultValues = {
                passed: false,
                nullRecords: nullCacheRecords,
                error: "NULL values found in cache columns"
            }
        END IF

        // Additional check: verify old records have 0 for cache tokens
        oldRecordsWithCache = EXECUTE_SCALAR("""
            SELECT COUNT(*) FROM token_analytics
            WHERE timestamp < '2025-10-25'
              AND (cacheReadTokens > 0 OR cacheCreationTokens > 0)
        """)

        LOG "Old records with non-zero cache tokens:", oldRecordsWithCache

        IF oldRecordsWithCache == 0 THEN
            LOG "✅ PASS: Old records have default 0 values"
        ELSE:
            LOG "⚠️  WARNING: Some old records have non-zero cache tokens"
            LOG "This may indicate data was backfilled or test data exists"
        END IF

    CATCH error:
        LOG "❌ FAIL: Default values check error:", error
        testResults.defaultValues = {passed: false, error: error}
    END TRY


    // TEST 4: Write Test with Cache Tokens
    LOG "\n--- Test 4: Write Test with Cache Tokens ---"

    TRY:
        testSessionId = "migration-verification-test-" + GENERATE_UUID()

        testMetrics = {
            sessionId: testSessionId,
            operation: "test",
            model: "claude-sonnet-4-20250514",
            inputTokens: 1234,
            outputTokens: 567,
            cacheReadTokens: 890,
            cacheCreationTokens: 345,
            totalTokens: 1801,
            estimatedCost: 0.0123
        }

        LOG "Writing test record with cache tokens..."
        LOG "Test session ID:", testSessionId

        // Write test record
        writeResult = WriteTokenMetricsWithCache(testMetrics)

        IF NOT writeResult.success THEN
            LOG "❌ FAIL: Failed to write test record"
            testResults.writeTest = {passed: false, error: "Write failed"}
        ELSE:
            LOG "Test record written, ID:", writeResult.recordId

            // Verify test record has correct cache values
            verifyQuery = """
                SELECT
                    id,
                    cacheReadTokens,
                    cacheCreationTokens,
                    inputTokens,
                    outputTokens
                FROM token_analytics
                WHERE sessionId = @sessionId
                ORDER BY timestamp DESC
                LIMIT 1
            """

            stmt = db.prepare(verifyQuery)
            testRecord = stmt.get({sessionId: testSessionId})

            IF testRecord == NULL THEN
                LOG "❌ FAIL: Test record not found after write"
                testResults.writeTest = {
                    passed: false,
                    error: "Record not found"
                }
            ELSE:
                LOG "Test record retrieved:", testRecord

                // Verify all values match
                allMatch = (
                    testRecord.cacheReadTokens == testMetrics.cacheReadTokens AND
                    testRecord.cacheCreationTokens == testMetrics.cacheCreationTokens AND
                    testRecord.inputTokens == testMetrics.inputTokens AND
                    testRecord.outputTokens == testMetrics.outputTokens
                )

                IF allMatch THEN
                    LOG "✅ PASS: Test record has correct cache token values"
                    LOG "cacheReadTokens:", testRecord.cacheReadTokens, "(expected:", testMetrics.cacheReadTokens, ")"
                    LOG "cacheCreationTokens:", testRecord.cacheCreationTokens, "(expected:", testMetrics.cacheCreationTokens, ")"

                    testResults.writeTest = {
                        passed: true,
                        recordId: testRecord.id,
                        cacheReadTokens: testRecord.cacheReadTokens,
                        cacheCreationTokens: testRecord.cacheCreationTokens
                    }
                ELSE:
                    LOG "❌ FAIL: Test record values do not match"
                    LOG "Expected cacheReadTokens:", testMetrics.cacheReadTokens
                    LOG "Actual cacheReadTokens:", testRecord.cacheReadTokens
                    LOG "Expected cacheCreationTokens:", testMetrics.cacheCreationTokens
                    LOG "Actual cacheCreationTokens:", testRecord.cacheCreationTokens

                    testResults.writeTest = {
                        passed: false,
                        error: "Values mismatch",
                        expected: testMetrics,
                        actual: testRecord
                    }
                END IF
            END IF

            // Clean up test record
            LOG "Cleaning up test record..."
            EXECUTE_SQL(
                "DELETE FROM token_analytics WHERE sessionId = '" + testSessionId + "'"
            )
            LOG "Test record deleted"
        END IF

    CATCH error:
        LOG "❌ FAIL: Write test error:", error
        testResults.writeTest = {passed: false, error: error}
    END TRY


    // TEST 5: Cost Validation on Real Data
    LOG "\n--- Test 5: Cost Validation on Real Data ---"

    TRY:
        // Get a sample of recent records
        sampleQuery = """
            SELECT id FROM token_analytics
            ORDER BY timestamp DESC
            LIMIT 5
        """

        sampleRecords = EXECUTE_QUERY(sampleQuery)
        LOG "Validating cost accuracy on", LENGTH(sampleRecords), "recent records"

        validationResults = []
        passCount = 0
        failCount = 0

        FOR EACH record IN sampleRecords DO
            validationResult = ValidateCostAccuracy(record.id)
            validationResults.append(validationResult)

            IF validationResult.passed THEN
                passCount = passCount + 1
                LOG "  ✅", record.id, "- PASS"
            ELSE:
                failCount = failCount + 1
                LOG "  ❌", record.id, "- FAIL"
                LOG "     Error:", validationResult.percentError, "%"
            END IF
        END FOR

        IF failCount == 0 THEN
            LOG "✅ PASS: All sampled records have accurate costs"
            testResults.costValidation = {
                passed: true,
                totalValidated: LENGTH(sampleRecords),
                passCount: passCount,
                failCount: 0
            }
        ELSE:
            LOG "❌ FAIL: Some records have inaccurate costs"
            LOG "Passed:", passCount
            LOG "Failed:", failCount

            testResults.costValidation = {
                passed: false,
                totalValidated: LENGTH(sampleRecords),
                passCount: passCount,
                failCount: failCount,
                details: validationResults
            }
        END IF

    CATCH error:
        LOG "❌ FAIL: Cost validation error:", error
        testResults.costValidation = {passed: false, error: error}
    END TRY


    // Generate Final Report
    LOG "\n=== Verification Report ==="

    allPassed = (
        testResults.schemaCheck.passed AND
        testResults.dataIntegrity.passed AND
        testResults.defaultValues.passed AND
        testResults.writeTest.passed AND
        testResults.costValidation.passed
    )

    IF allPassed THEN
        LOG "🎉 ALL TESTS PASSED - Migration verified successfully"
    ELSE:
        LOG "⚠️  SOME TESTS FAILED - Review results above"
    END IF

    LOG "\nTest Summary:"
    LOG "  Schema Check:", testResults.schemaCheck.passed ? "PASS" : "FAIL"
    LOG "  Data Integrity:", testResults.dataIntegrity.passed ? "PASS" : "FAIL"
    LOG "  Default Values:", testResults.defaultValues.passed ? "PASS" : "FAIL"
    LOG "  Write Test:", testResults.writeTest.passed ? "PASS" : "FAIL"
    LOG "  Cost Validation:", testResults.costValidation.passed ? "PASS" : "FAIL"

    RETURN {
        success: allPassed,
        timestamp: GET_CURRENT_ISO8601_TIMESTAMP(),
        tests: testResults,
        summary: {
            total: 5,
            passed: COUNT_PASSED(testResults),
            failed: COUNT_FAILED(testResults)
        }
    }

END ALGORITHM


// Helper function to count passed tests
FUNCTION COUNT_PASSED(testResults)
    count = 0
    FOR EACH test IN testResults DO
        IF test.passed THEN count = count + 1
    END FOR
    RETURN count
END FUNCTION


// Helper function to count failed tests
FUNCTION COUNT_FAILED(testResults)
    count = 0
    FOR EACH test IN testResults DO
        IF NOT test.passed THEN count = count + 1
    END FOR
    RETURN count
END FUNCTION
```

### Complexity Analysis

**Time Complexity:**
- Schema check: O(c) where c = column count
- Data integrity: O(1) - COUNT query with index
- Default values: O(n) - full table scan
- Write test: O(log n) - single INSERT + SELECT
- Cost validation: O(k) where k = sample size (5)
- Total: O(n) dominated by default values check

**Space Complexity:**
- O(1) - test results stored in fixed structure
- O(k) - sample records for validation

**Expected Runtime:**
- Complete verification suite: < 3 seconds
- Individual tests: < 500ms each

---

## Algorithm 5: Rollback Procedure

### Purpose
Safe rollback if migration fails or needs to be reverted.

### Pseudocode

```
ALGORITHM: RollbackCacheTokenMigration
INPUT: db (database connection)
OUTPUT: rollbackResult (success/failure report)

WARNING:
    This will PERMANENTLY DELETE cache token data.
    Use only if migration needs to be reverted.

BEGIN
    LOG "⚠️  WARNING: Starting cache token migration ROLLBACK"
    LOG "This will remove cacheReadTokens and cacheCreationTokens columns"
    LOG "All cache token data will be lost"

    // SQLite does not support DROP COLUMN directly
    // Must recreate table without cache columns

    LOG "\n=== Rollback Strategy ==="
    LOG "1. Create backup of current data"
    LOG "2. Create new table without cache columns"
    LOG "3. Copy data to new table (excluding cache columns)"
    LOG "4. Drop old table"
    LOG "5. Rename new table to original name"

    TRY:
        // Step 1: Backup current data count
        recordCountBefore = EXECUTE_SCALAR(
            "SELECT COUNT(*) FROM token_analytics"
        )
        LOG "Records to preserve:", recordCountBefore

        // Step 2: Create new table schema (without cache columns)
        createTableSQL = """
            CREATE TABLE token_analytics_new (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                sessionId TEXT NOT NULL,
                operation TEXT,
                model TEXT NOT NULL,
                inputTokens INTEGER NOT NULL,
                outputTokens INTEGER NOT NULL,
                totalTokens INTEGER NOT NULL,
                estimatedCost REAL NOT NULL
            )
        """

        LOG "Creating new table without cache columns..."
        EXECUTE_SQL(createTableSQL)
        LOG "✅ New table created"

        // Step 3: Copy data (excluding cache columns)
        copyDataSQL = """
            INSERT INTO token_analytics_new (
                id, timestamp, sessionId, operation, model,
                inputTokens, outputTokens, totalTokens, estimatedCost
            )
            SELECT
                id, timestamp, sessionId, operation, model,
                inputTokens, outputTokens, totalTokens, estimatedCost
            FROM token_analytics
        """

        LOG "Copying data to new table..."
        result = EXECUTE_SQL(copyDataSQL)
        LOG "Records copied:", result.changes

        // Verify record count
        recordCountAfter = EXECUTE_SCALAR(
            "SELECT COUNT(*) FROM token_analytics_new"
        )

        IF recordCountAfter != recordCountBefore THEN
            LOG "❌ ERROR: Record count mismatch during copy"
            LOG "Before:", recordCountBefore
            LOG "After:", recordCountAfter
            THROW RollbackError("Data loss during copy")
        END IF

        LOG "✅ All records copied successfully"

        // Step 4: Drop old table
        LOG "Dropping old table..."
        EXECUTE_SQL("DROP TABLE token_analytics")
        LOG "✅ Old table dropped"

        // Step 5: Rename new table
        LOG "Renaming new table..."
        EXECUTE_SQL(
            "ALTER TABLE token_analytics_new RENAME TO token_analytics"
        )
        LOG "✅ Table renamed"

        // Step 6: Verify rollback
        finalTableInfo = EXECUTE_QUERY("PRAGMA table_info(token_analytics)")
        finalColumns = EXTRACT_COLUMN_NAMES(finalTableInfo)

        cacheReadExists = "cacheReadTokens" IN finalColumns
        cacheCreationExists = "cacheCreationTokens" IN finalColumns

        IF cacheReadExists OR cacheCreationExists THEN
            LOG "❌ ERROR: Cache columns still exist after rollback"
            THROW RollbackError("Rollback incomplete")
        END IF

        LOG "✅ Cache columns successfully removed"

        finalRecordCount = EXECUTE_SCALAR(
            "SELECT COUNT(*) FROM token_analytics"
        )

        IF finalRecordCount != recordCountBefore THEN
            LOG "❌ ERROR: Record count changed during rollback"
            LOG "Before:", recordCountBefore
            LOG "After:", finalRecordCount
        ELSE:
            LOG "✅ All records preserved:", finalRecordCount
        END IF

        LOG "\n🎉 Rollback complete"
        LOG "Schema reverted to pre-migration state"
        LOG "Cache token data removed"

        RETURN {
            success: true,
            recordsPreserved: finalRecordCount,
            columnsRemoved: ["cacheReadTokens", "cacheCreationTokens"]
        }

    CATCH error:
        LOG "❌ CRITICAL: Rollback failed:", error
        LOG "Database may be in inconsistent state"
        LOG "Manual intervention required"

        RETURN {
            success: false,
            error: error,
            action: "Restore from backup"
        }
    END TRY

END ALGORITHM
```

### Complexity Analysis

**Time Complexity:**
- `CREATE TABLE`: O(1)
- `INSERT INTO SELECT`: O(n) where n = number of records
- `DROP TABLE`: O(n) - must deallocate all rows
- `ALTER TABLE RENAME`: O(1) - metadata only
- Total: O(n)

**Space Complexity:**
- O(n) - temporary duplicate of all data during copy
- Requires: 2× current database size temporarily

**Expected Runtime:**
- 352 records: < 2 seconds
- 10,000 records: < 10 seconds

---

## Implementation Order

### Phase 1: Migration (Low Risk)
1. Run migration script
2. Verify columns added
3. Verify existing data preserved
4. Run verification suite

### Phase 2: Code Update (Zero Risk)
1. Update INSERT SQL statement
2. Update parameter binding
3. Test with sample data

### Phase 3: Validation (High Confidence)
1. Write test record with cache tokens
2. Validate cost accuracy
3. Monitor production data

### Recommended Timeline
- Migration: 5 minutes
- Code update: 10 minutes
- Testing: 15 minutes
- Total: 30 minutes

---

## Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Migration uses ALTER TABLE (non-destructive)
- Verification checks record count before/after
- Rollback procedure available

**Probability:** Very Low
**Impact:** High
**Mitigation Effectiveness:** High

### Risk 2: NULL Values in Cache Columns
**Mitigation:**
- DEFAULT 0 in column definition
- Explicit OR 0 in parameter binding
- Verification checks for NULL values

**Probability:** Very Low
**Impact:** Medium
**Mitigation Effectiveness:** High

### Risk 3: Cost Calculation Errors
**Mitigation:**
- Cost validation algorithm
- Sample testing before production
- Existing costs not changed (backward compatible)

**Probability:** Low
**Impact:** Medium
**Mitigation Effectiveness:** High

### Risk 4: Performance Degradation
**Mitigation:**
- +8 bytes per record negligible
- No additional indexes needed
- INSERT time unchanged (< 1% overhead)

**Probability:** Very Low
**Impact:** Low
**Mitigation Effectiveness:** High

---

## Success Criteria

### Migration Success
- [ ] Both cache columns exist in schema
- [ ] All existing records preserved (352+)
- [ ] No NULL values in cache columns
- [ ] Verification suite passes 5/5 tests

### Write Success
- [ ] New records include cache token values
- [ ] Cache tokens default to 0 if missing
- [ ] Cost calculations include cache pricing
- [ ] No write errors or failures

### Validation Success
- [ ] Sample records have accurate costs
- [ ] Cost validation passes with < 1% error
- [ ] Test data writes and reads correctly

---

## Post-Implementation Monitoring

### Metrics to Track
1. **Cache Token Usage**
   - Average cache read tokens per request
   - Average cache creation tokens per request
   - Percentage of requests using cache

2. **Cost Savings**
   - Cost with cache vs without cache
   - Estimated monthly savings
   - Cache hit rate

3. **Data Quality**
   - Percentage of records with non-zero cache tokens
   - NULL value occurrence (should be 0%)
   - Cost calculation accuracy

### Sample Queries

```sql
-- Cache usage statistics
SELECT
    COUNT(*) as total_records,
    SUM(CASE WHEN cacheReadTokens > 0 THEN 1 ELSE 0 END) as cache_read_count,
    SUM(CASE WHEN cacheCreationTokens > 0 THEN 1 ELSE 0 END) as cache_creation_count,
    AVG(cacheReadTokens) as avg_cache_read,
    AVG(cacheCreationTokens) as avg_cache_creation
FROM token_analytics
WHERE timestamp >= date('now', '-7 days');

-- Cost savings analysis
SELECT
    SUM(estimatedCost) as total_cost,
    SUM(cacheReadTokens * 0.0003 / 1000) as cache_read_savings,
    SUM(inputTokens * 0.003 / 1000) as input_cost,
    ROUND(
        (SUM(cacheReadTokens * 0.0003 / 1000) / SUM(inputTokens * 0.003 / 1000)) * 100,
        2
    ) as savings_percent
FROM token_analytics
WHERE timestamp >= date('now', '-30 days')
  AND model = 'claude-sonnet-4-20250514';

-- Data quality check
SELECT
    COUNT(*) as total_records,
    SUM(CASE WHEN cacheReadTokens IS NULL THEN 1 ELSE 0 END) as null_cache_read,
    SUM(CASE WHEN cacheCreationTokens IS NULL THEN 1 ELSE 0 END) as null_cache_creation
FROM token_analytics;
```

---

## Summary

This pseudocode document provides complete algorithmic specifications for:

1. **Migration Algorithm**: Safe addition of cache token columns
2. **Enhanced Writer**: INSERT with cache token values
3. **Cost Validation**: Verify cost accuracy including cache pricing
4. **Verification Suite**: Comprehensive migration testing
5. **Rollback Procedure**: Safe reversion if needed

**Key Characteristics:**
- Zero breaking changes
- Backward compatible (defaults to 0)
- Verified data preservation
- Comprehensive testing
- Production-ready

**Next Steps:**
1. Review pseudocode algorithms
2. Implement migration script
3. Update TokenAnalyticsWriter.js
4. Run verification suite
5. Deploy to production

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Status:** Ready for Implementation

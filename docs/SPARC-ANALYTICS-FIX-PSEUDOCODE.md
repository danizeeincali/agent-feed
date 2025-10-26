# SPARC Pseudocode: Claude Code SDK Analytics Fix

**Document Version:** 1.0
**Date:** 2025-10-25
**Phase:** Pseudocode
**Status:** Algorithm Design Complete

---

## Executive Summary

This document provides comprehensive algorithmic solutions for fixing the Claude Code SDK analytics writeTokenMetrics() silent failures. Investigation revealed that while the code exists and is being called, no new analytics data has been written to the database since October 21, 2025 (4 days ago).

**Root Cause:** The writeTokenMetrics() method is being called but failing silently due to:
1. Response structure mismatch between expected and actual SDK responses
2. Insufficient error logging to detect failures
3. Missing validation of response structure before processing

**Solution Approach:**
- Enhanced debug logging throughout the analytics pipeline
- Robust validation of response structures
- Resilient error handling with detailed diagnostics
- Database write verification mechanisms

---

## Table of Contents

1. [Algorithm Overview](#algorithm-overview)
2. [Core Algorithms](#core-algorithms)
3. [Data Structures](#data-structures)
4. [Complexity Analysis](#complexity-analysis)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Integration Points](#integration-points)
7. [Testing Strategy](#testing-strategy)

---

## Algorithm Overview

### High-Level Flow

```
ALGORITHM: Claude SDK Analytics Pipeline
INPUT: SDK responses from streaming-chat endpoint
OUTPUT: Analytics records in token_analytics database table

BEGIN
  1. Receive SDK responses from Claude Code Manager
  2. Validate response structure (NEW)
  3. Extract messages array from responses
  4. Track token analytics (ENHANCED)
  5. Extract metrics from SDK messages
  6. Calculate estimated cost
  7. Write to database with verification
  8. Log success/failure with diagnostics
END
```

### System Architecture

```
┌─────────────────────┐
│ /streaming-chat     │
│ Endpoint            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Response Validator  │ ← NEW
│ (validateResponse)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Token Analytics     │ ← ENHANCED
│ Tracker             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ TokenAnalytics      │ ← ENHANCED
│ Writer Service      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Database Write      │ ← VERIFIED
│ & Verification      │
└─────────────────────┘
```

---

## Core Algorithms

### 1. Response Structure Validator

**Purpose:** Validate SDK response structure before processing to prevent silent failures

```
ALGORITHM: validateResponseStructure
INPUT: responses (array) - SDK responses from Claude Code Manager
OUTPUT: validationResult (object) - { isValid: boolean, errorReason: string, metadata: object }

BEGIN
  // Step 1: Null and type validation
  LOG "🔍 [VALIDATOR] Starting response validation"

  IF responses IS NULL OR responses IS UNDEFINED THEN
    LOG "❌ [VALIDATOR] Responses is null or undefined"
    RETURN {
      isValid: false,
      errorReason: "responses_null",
      metadata: { receivedType: typeof responses }
    }
  END IF

  // Step 2: Array validation
  IF NOT Array.isArray(responses) THEN
    LOG "❌ [VALIDATOR] Responses is not an array"
    RETURN {
      isValid: false,
      errorReason: "not_array",
      metadata: {
        receivedType: typeof responses,
        isObject: typeof responses === 'object'
      }
    }
  END IF

  // Step 3: Empty array check
  IF responses.length == 0 THEN
    LOG "❌ [VALIDATOR] Responses array is empty"
    RETURN {
      isValid: false,
      errorReason: "empty_array",
      metadata: { length: 0 }
    }
  END IF

  // Step 4: First response validation
  firstResponse = responses[0]

  IF firstResponse IS NULL OR firstResponse IS UNDEFINED THEN
    LOG "❌ [VALIDATOR] First response is null or undefined"
    RETURN {
      isValid: false,
      errorReason: "first_response_null",
      metadata: { responsesLength: responses.length }
    }
  END IF

  // Step 5: Messages property validation
  IF NOT firstResponse.hasOwnProperty('messages') THEN
    availableKeys = Object.keys(firstResponse)
    LOG "❌ [VALIDATOR] No 'messages' property in response"
    LOG "Available properties:", availableKeys

    RETURN {
      isValid: false,
      errorReason: "missing_messages_property",
      metadata: {
        availableKeys: availableKeys,
        responseType: typeof firstResponse
      }
    }
  END IF

  // Step 6: Messages array validation
  messages = firstResponse.messages

  IF NOT Array.isArray(messages) THEN
    LOG "❌ [VALIDATOR] Messages is not an array"
    RETURN {
      isValid: false,
      errorReason: "messages_not_array",
      metadata: {
        messagesType: typeof messages,
        hasMessages: !!messages
      }
    }
  END IF

  IF messages.length == 0 THEN
    LOG "⚠️ [VALIDATOR] Messages array is empty (valid but no data)"
    RETURN {
      isValid: true,
      errorReason: "empty_messages",
      metadata: {
        messagesLength: 0,
        hasEmptyMessages: true
      }
    }
  END IF

  // Step 7: Message type validation
  messageTypes = []
  hasResultMessage = false

  FOR EACH message IN messages DO
    messageTypes.append(message.type OR "unknown")
    IF message.type == "result" THEN
      hasResultMessage = true
    END IF
  END FOR

  IF NOT hasResultMessage THEN
    LOG "⚠️ [VALIDATOR] No result messages found in messages array"
    LOG "Message types:", messageTypes
    RETURN {
      isValid: true,
      errorReason: "no_result_messages",
      metadata: {
        messagesLength: messages.length,
        messageTypes: messageTypes,
        hasResultMessage: false
      }
    }
  END IF

  // Step 8: Success - valid structure
  LOG "✅ [VALIDATOR] Response structure is valid"
  RETURN {
    isValid: true,
    errorReason: null,
    metadata: {
      responsesLength: responses.length,
      messagesLength: messages.length,
      messageTypes: messageTypes,
      hasResultMessage: true
    }
  }
END ALGORITHM

// Complexity: O(n) where n = number of messages (for type checking)
// Space: O(n) for messageTypes array
```

---

### 2. Enhanced Token Analytics Tracker

**Purpose:** Orchestrate analytics tracking with comprehensive error logging

```
ALGORITHM: trackTokenAnalytics
INPUT: responses (array), sessionId (string)
OUTPUT: void (writes to database asynchronously)

CONSTANTS:
  MAX_RETRY_ATTEMPTS = 3
  RETRY_DELAY_MS = 1000

BEGIN
  // Step 1: Entry logging
  LOG "🔍 [ANALYTICS] Starting token analytics tracking"
  LOG "Session ID:", sessionId
  LOG "Responses count:", responses?.length OR 0
  LOG "Writer initialized:", tokenAnalyticsWriter != null

  // Step 2: Prerequisites validation
  IF NOT tokenAnalyticsWriter THEN
    LOG "❌ [ANALYTICS] TokenAnalyticsWriter not initialized"
    LOG "Skipping analytics write - database unavailable"
    RETURN
  END IF

  IF NOT responses OR responses.length == 0 THEN
    LOG "❌ [ANALYTICS] No responses to process"
    LOG "Responses:", JSON.stringify(responses)
    RETURN
  END IF

  IF NOT sessionId THEN
    LOG "⚠️ [ANALYTICS] No sessionId provided, generating fallback"
    sessionId = "fallback_" + getCurrentTimestamp() + "_" + randomUUID()
  END IF

  // Step 3: Validate response structure (NEW)
  validation = validateResponseStructure(responses)

  LOG "🔍 [ANALYTICS] Validation result:", validation

  IF NOT validation.isValid AND validation.errorReason != "no_result_messages" THEN
    LOG "❌ [ANALYTICS] Invalid response structure:", validation.errorReason
    LOG "Validation metadata:", validation.metadata
    LOG "Full responses:", JSON.stringify(responses, null, 2)
    RETURN
  END IF

  // Step 4: Extract messages
  firstResponse = responses[0]
  messages = firstResponse.messages OR []

  LOG "🔍 [ANALYTICS] Messages structure:", {
    count: messages.length,
    types: messages.map(m => m.type),
    hasUsage: messages.filter(m => m.usage != null).length
  }

  // Step 5: Check for processable messages
  IF messages.length == 0 THEN
    LOG "⚠️ [ANALYTICS] No messages in response, skipping analytics"
    LOG "Response structure:", Object.keys(firstResponse)
    RETURN
  END IF

  // Step 6: Write analytics with retry logic (NEW)
  retryCount = 0
  success = false
  lastError = null

  WHILE retryCount < MAX_RETRY_ATTEMPTS AND NOT success DO
    TRY:
      LOG "🔍 [ANALYTICS] Attempt", retryCount + 1, "of", MAX_RETRY_ATTEMPTS

      // Call async write operation
      AWAIT tokenAnalyticsWriter.writeTokenMetrics(messages, sessionId)

      success = true
      LOG "✅ [ANALYTICS] Analytics written successfully for session:", sessionId
      LOG "✅ [ANALYTICS] Attempt:", retryCount + 1

    CATCH error:
      lastError = error
      retryCount = retryCount + 1

      LOG "❌ [ANALYTICS] Write failed on attempt", retryCount
      LOG "Error message:", error.message
      LOG "Error stack:", error.stack

      IF retryCount < MAX_RETRY_ATTEMPTS THEN
        LOG "⏳ [ANALYTICS] Retrying in", RETRY_DELAY_MS, "ms..."
        AWAIT sleep(RETRY_DELAY_MS)
      END IF
    END TRY
  END WHILE

  // Step 7: Final status logging
  IF NOT success THEN
    LOG "❌ [ANALYTICS] All retry attempts failed"
    LOG "Final error:", lastError.message
    LOG "Session ID:", sessionId
    LOG "Messages summary:", {
      count: messages.length,
      types: messages.map(m => m.type),
      firstMessagePreview: JSON.stringify(messages[0]).substring(0, 200)
    }

    // Emit failure event for monitoring (optional)
    emitAnalyticsFailureEvent({
      sessionId: sessionId,
      error: lastError.message,
      retryCount: retryCount,
      timestamp: getCurrentTimestamp()
    })
  END IF
END ALGORITHM

// Complexity: O(1) amortized (async operation)
// Space: O(1) for tracking variables
```

---

### 3. Resilient writeTokenMetrics

**Purpose:** Extract, calculate, and write token metrics with comprehensive error handling

```
ALGORITHM: writeTokenMetrics
INPUT: messages (array), sessionId (string)
OUTPUT: void (writes to database)

BEGIN
  // Step 1: Entry logging with full context
  LOG "📝 [WRITER] Starting writeTokenMetrics"
  LOG "Session ID:", sessionId
  LOG "Messages count:", messages?.length OR 0
  LOG "Database initialized:", this.db != null

  startTime = getCurrentTimestamp()

  TRY:
    // Step 2: Extract metrics from SDK messages
    LOG "🔍 [WRITER] Extracting metrics from SDK messages"
    metrics = this.extractMetricsFromSDK(messages, sessionId)

    IF metrics IS NULL THEN
      LOG "❌ [WRITER] Metric extraction returned null"
      LOG "Possible reasons: no result messages, missing usage data, or invalid structure"
      LOG "Message types present:", messages.map(m => m.type)
      RETURN
    END IF

    LOG "✅ [WRITER] Metrics extracted successfully:", {
      model: metrics.model,
      inputTokens: metrics.inputTokens,
      outputTokens: metrics.outputTokens,
      totalTokens: metrics.totalTokens
    }

    // Step 3: Calculate estimated cost
    LOG "🔍 [WRITER] Calculating estimated cost"
    estimatedCost = this.calculateEstimatedCost(metrics, metrics.model)

    LOG "✅ [WRITER] Cost calculated:", {
      estimatedCost: estimatedCost,
      model: metrics.model,
      totalTokens: metrics.totalTokens
    }

    // Step 4: Add cost to metrics
    metrics.estimatedCost = estimatedCost

    // Step 5: Write to database with validation
    LOG "🔍 [WRITER] Writing to database"
    AWAIT this.writeToDatabase(metrics)

    // Step 6: Verify write succeeded (NEW)
    verificationPassed = this.verifyDatabaseWrite(metrics.id OR sessionId)

    IF verificationPassed THEN
      LOG "✅ [WRITER] Database write verified successfully"
    ELSE
      LOG "⚠️ [WRITER] Database write could not be verified"
    END IF

    // Step 7: Success metrics
    duration = getCurrentTimestamp() - startTime
    LOG "🎉 [WRITER] writeTokenMetrics completed successfully"
    LOG "Duration:", duration, "ms"
    LOG "Record ID:", metrics.id

  CATCH error:
    duration = getCurrentTimestamp() - startTime

    LOG "❌ [WRITER] writeTokenMetrics failed"
    LOG "Error type:", error.constructor.name
    LOG "Error message:", error.message
    LOG "Error stack:", error.stack
    LOG "Duration before failure:", duration, "ms"
    LOG "Session ID:", sessionId
    LOG "Messages summary:", {
      count: messages?.length OR 0,
      types: messages?.map(m => m.type) OR []
    }

    // Don't throw - graceful degradation
    // Analytics failure should not break main application flow
  END TRY
END ALGORITHM

// Complexity: O(n) where n = number of messages (for extraction)
// Space: O(1) for metrics object
```

---

### 4. Metrics Extraction from SDK

**Purpose:** Extract token usage metrics from SDK result messages

```
ALGORITHM: extractMetricsFromSDK
INPUT: messages (array), sessionId (string)
OUTPUT: metrics (object) or null if extraction fails

BEGIN
  // Step 1: Input validation
  LOG "🔍 [EXTRACTOR] Starting metric extraction"
  LOG "Input validation:", {
    hasMessages: messages != null,
    isArray: Array.isArray(messages),
    length: messages?.length OR 0,
    hasSessionId: sessionId != null
  }

  IF NOT messages OR NOT Array.isArray(messages) OR messages.length == 0 THEN
    LOG "❌ [EXTRACTOR] Invalid messages array"
    RETURN null
  END IF

  IF NOT sessionId THEN
    LOG "❌ [EXTRACTOR] No sessionId provided"
    RETURN null
  END IF

  // Step 2: Find result messages
  resultMessages = []

  FOR EACH message IN messages DO
    LOG "🔍 [EXTRACTOR] Examining message:", {
      type: message.type,
      hasUsage: message.usage != null,
      hasModelUsage: message.modelUsage != null
    }

    IF message.type == "result" THEN
      resultMessages.append(message)
    END IF
  END FOR

  LOG "🔍 [EXTRACTOR] Found result messages:", resultMessages.length

  IF resultMessages.length == 0 THEN
    LOG "❌ [EXTRACTOR] No result messages found"
    LOG "Available message types:", messages.map(m => m.type)
    RETURN null
  END IF

  // Step 3: Use last result message (most complete data)
  resultMessage = resultMessages[resultMessages.length - 1]

  LOG "🔍 [EXTRACTOR] Using result message:", {
    hasUsage: resultMessage.usage != null,
    hasModelUsage: resultMessage.modelUsage != null,
    usageKeys: resultMessage.usage ? Object.keys(resultMessage.usage) : [],
    modelUsageKeys: resultMessage.modelUsage ? Object.keys(resultMessage.modelUsage) : []
  }

  // Step 4: Validate required fields
  IF NOT resultMessage.usage THEN
    LOG "❌ [EXTRACTOR] Missing 'usage' field in result message"
    LOG "Available keys:", Object.keys(resultMessage)
    RETURN null
  END IF

  IF NOT resultMessage.modelUsage THEN
    LOG "❌ [EXTRACTOR] Missing 'modelUsage' field in result message"
    LOG "Available keys:", Object.keys(resultMessage)
    RETURN null
  END IF

  // Step 5: Extract model name
  usage = resultMessage.usage
  modelUsage = resultMessage.modelUsage
  modelNames = Object.keys(modelUsage)

  IF modelNames.length == 0 THEN
    LOG "❌ [EXTRACTOR] No models in modelUsage"
    RETURN null
  END IF

  model = modelNames[0]  // Use first model

  // Step 6: Extract token counts with defaults
  inputTokens = usage.input_tokens OR 0
  outputTokens = usage.output_tokens OR 0
  cacheReadTokens = usage.cache_read_input_tokens OR 0
  cacheCreationTokens = usage.cache_creation_input_tokens OR 0
  totalTokens = inputTokens + outputTokens

  LOG "✅ [EXTRACTOR] Token metrics extracted:", {
    model: model,
    inputTokens: inputTokens,
    outputTokens: outputTokens,
    totalTokens: totalTokens,
    cacheReadTokens: cacheReadTokens,
    cacheCreationTokens: cacheCreationTokens
  }

  // Step 7: Build metrics object
  metrics = {
    sessionId: sessionId,
    operation: "sdk_operation",
    model: model,
    inputTokens: inputTokens,
    outputTokens: outputTokens,
    cacheReadTokens: cacheReadTokens,
    cacheCreationTokens: cacheCreationTokens,
    totalTokens: totalTokens,
    sdkReportedCost: resultMessage.total_cost_usd OR 0,
    duration_ms: resultMessage.duration_ms OR 0,
    num_turns: resultMessage.num_turns OR 0,
    extractedAt: getCurrentTimestamp()
  }

  LOG "✅ [EXTRACTOR] Metrics object built successfully"

  RETURN metrics

  // Error handling wrapper
  ON ERROR:
    LOG "❌ [EXTRACTOR] Extraction failed with exception"
    LOG "Error:", error.message
    LOG "Stack:", error.stack
    RETURN null
END ALGORITHM

// Complexity: O(n) where n = number of messages
// Space: O(1) for metrics object
```

---

### 5. Database Write with Verification

**Purpose:** Write metrics to database with verification and detailed error reporting

```
ALGORITHM: writeToDatabase
INPUT: metrics (object)
OUTPUT: void (writes to database)

BEGIN
  // Step 1: Pre-write validation
  LOG "🔍 [DB-WRITER] Starting database write"
  LOG "Metrics summary:", {
    sessionId: metrics.sessionId,
    model: metrics.model,
    totalTokens: metrics.totalTokens,
    estimatedCost: metrics.estimatedCost
  }

  IF NOT metrics THEN
    LOG "❌ [DB-WRITER] No metrics provided"
    RETURN
  END IF

  IF NOT this.db THEN
    LOG "❌ [DB-WRITER] Database not initialized"
    LOG "Cannot write analytics - database connection missing"
    RETURN
  END IF

  // Step 2: Generate unique ID and timestamp
  recordId = generateUUID()
  timestamp = getCurrentISOTimestamp()

  LOG "🔍 [DB-WRITER] Record metadata:", {
    id: recordId,
    timestamp: timestamp
  }

  // Step 3: Prepare SQL statement
  sql = `
    INSERT INTO token_analytics (
      id, timestamp, sessionId, operation, model,
      inputTokens, outputTokens, totalTokens, estimatedCost
    ) VALUES (
      @id, @timestamp, @sessionId, @operation, @model,
      @inputTokens, @outputTokens, @totalTokens, @estimatedCost
    )
  `

  // Step 4: Prepare parameters with validation
  params = {
    id: recordId,
    timestamp: timestamp,
    sessionId: metrics.sessionId OR "unknown",
    operation: metrics.operation OR "sdk_operation",
    model: metrics.model OR "unknown",
    inputTokens: metrics.inputTokens OR 0,
    outputTokens: metrics.outputTokens OR 0,
    totalTokens: metrics.totalTokens OR 0,
    estimatedCost: metrics.estimatedCost OR 0.0
  }

  LOG "🔍 [DB-WRITER] SQL parameters:", params

  // Step 5: Execute database write
  TRY:
    // Prepare statement (better-sqlite3 style)
    stmt = this.db.prepare(sql)

    // Execute with parameters
    result = stmt.run(params)

    LOG "✅ [DB-WRITER] Database write executed"
    LOG "Changes:", result.changes
    LOG "Last insert rowid:", result.lastInsertRowid

    // Step 6: Verification query (NEW)
    IF result.changes > 0 THEN
      verifySQL = "SELECT COUNT(*) as count FROM token_analytics WHERE id = ?"
      verifyStmt = this.db.prepare(verifySQL)
      verifyResult = verifyStmt.get(recordId)

      IF verifyResult.count == 1 THEN
        LOG "✅ [DB-WRITER] Record verified in database"
        LOG "Record ID:", recordId
      ELSE
        LOG "⚠️ [DB-WRITER] Record not found after insert (unexpected)"
        LOG "Verification count:", verifyResult.count
      END IF
    ELSE
      LOG "⚠️ [DB-WRITER] No rows affected by insert"
    END IF

  CATCH error:
    LOG "❌ [DB-WRITER] Database write failed"
    LOG "Error type:", error.constructor.name
    LOG "Error message:", error.message
    LOG "Error code:", error.code
    LOG "Error stack:", error.stack
    LOG "SQL:", sql
    LOG "Parameters:", params

    // Check for specific error types
    IF error.code == "SQLITE_CONSTRAINT" THEN
      LOG "⚠️ [DB-WRITER] Constraint violation - possible duplicate ID"
    ELSE IF error.code == "SQLITE_READONLY" THEN
      LOG "⚠️ [DB-WRITER] Database is read-only"
    ELSE IF error.code == "SQLITE_BUSY" THEN
      LOG "⚠️ [DB-WRITER] Database is locked/busy"
    ELSE
      LOG "⚠️ [DB-WRITER] Unknown database error"
    END IF

    // Don't throw - graceful degradation
  END TRY
END ALGORITHM

// Complexity: O(1) for single record insert
// Space: O(1) for parameters object
```

---

### 6. Manual Database Write Test

**Purpose:** Test database write capabilities independent of SDK integration

```
ALGORITHM: testDatabaseWrite
INPUT: none (uses test data)
OUTPUT: testResult (object) - { success: boolean, recordId: string, error: string }

BEGIN
  LOG "🧪 [TEST] Starting manual database write test"

  // Step 1: Generate test data
  testId = "test_" + getCurrentTimestamp() + "_" + generateUUID()
  testData = {
    id: testId,
    timestamp: getCurrentISOTimestamp(),
    sessionId: "manual_test_session",
    operation: "manual_test",
    model: "test_model",
    inputTokens: 5,
    outputTokens: 10,
    totalTokens: 15,
    estimatedCost: 0.001
  }

  LOG "🧪 [TEST] Test data generated:", testData

  // Step 2: Attempt write
  TRY:
    sql = `
      INSERT INTO token_analytics (
        id, timestamp, sessionId, operation, model,
        inputTokens, outputTokens, totalTokens, estimatedCost
      ) VALUES (
        @id, @timestamp, @sessionId, @operation, @model,
        @inputTokens, @outputTokens, @totalTokens, @estimatedCost
      )
    `

    stmt = this.db.prepare(sql)
    result = stmt.run(testData)

    LOG "✅ [TEST] Insert executed, changes:", result.changes

    // Step 3: Verify write
    verifySQL = "SELECT * FROM token_analytics WHERE id = ?"
    verifyStmt = this.db.prepare(verifySQL)
    record = verifyStmt.get(testId)

    IF record THEN
      LOG "✅ [TEST] Database write test PASSED"
      LOG "Record retrieved:", record

      // Step 4: Cleanup test record
      deleteSQL = "DELETE FROM token_analytics WHERE id = ?"
      deleteStmt = this.db.prepare(deleteSQL)
      deleteResult = deleteStmt.run(testId)

      LOG "🧹 [TEST] Test record cleaned up, deletions:", deleteResult.changes

      RETURN {
        success: true,
        recordId: testId,
        error: null,
        record: record
      }
    ELSE
      LOG "❌ [TEST] Database write test FAILED - record not found"

      RETURN {
        success: false,
        recordId: testId,
        error: "record_not_found_after_insert"
      }
    END IF

  CATCH error:
    LOG "❌ [TEST] Database write test FAILED with exception"
    LOG "Error:", error.message
    LOG "Stack:", error.stack

    RETURN {
      success: false,
      recordId: testId,
      error: error.message
    }
  END TRY
END ALGORITHM

// Complexity: O(1) for single test operation
// Space: O(1) for test data
```

---

## Data Structures

### Response Structure

```
STRUCTURE: ClaudeSDKResponse
{
  messages: [
    {
      type: string,                    // "result", "thinking", "tool_use", etc.
      usage: {
        input_tokens: integer,
        output_tokens: integer,
        cache_read_input_tokens: integer,
        cache_creation_input_tokens: integer
      },
      modelUsage: {
        [modelName: string]: {
          input_tokens: integer,
          output_tokens: integer,
          cache_read_input_tokens: integer,
          cache_creation_input_tokens: integer
        }
      },
      total_cost_usd: float,
      duration_ms: integer,
      num_turns: integer,
      content: string
    }
  ],
  sessionId: string,
  timestamp: string
}
```

### Metrics Object

```
STRUCTURE: TokenMetrics
{
  sessionId: string,
  operation: string,
  model: string,
  inputTokens: integer,
  outputTokens: integer,
  cacheReadTokens: integer,
  cacheCreationTokens: integer,
  totalTokens: integer,
  estimatedCost: float,
  sdkReportedCost: float,
  duration_ms: integer,
  num_turns: integer,
  extractedAt: timestamp
}
```

### Database Schema

```
TABLE: token_analytics
{
  id: TEXT PRIMARY KEY,
  timestamp: TEXT (ISO 8601),
  sessionId: TEXT,
  operation: TEXT,
  model: TEXT,
  inputTokens: INTEGER,
  outputTokens: INTEGER,
  totalTokens: INTEGER,
  estimatedCost: REAL,
  userId: TEXT (nullable),
  message_content: TEXT (nullable),
  response_content: TEXT (nullable),
  created_at: DATETIME (default CURRENT_TIMESTAMP)
}

INDEXES:
  - idx_timestamp: CREATE INDEX idx_timestamp ON token_analytics(timestamp)
  - idx_sessionId: CREATE INDEX idx_sessionId ON token_analytics(sessionId)
  - idx_model: CREATE INDEX idx_model ON token_analytics(model)
```

### Validation Result Structure

```
STRUCTURE: ValidationResult
{
  isValid: boolean,
  errorReason: string | null,
  metadata: {
    responsesLength: integer,
    messagesLength: integer,
    messageTypes: string[],
    hasResultMessage: boolean,
    availableKeys: string[] (if error),
    receivedType: string (if error)
  }
}
```

---

## Complexity Analysis

### Time Complexity

| Algorithm | Best Case | Average Case | Worst Case | Notes |
|-----------|-----------|--------------|------------|-------|
| validateResponseStructure | O(1) | O(n) | O(n) | n = number of messages |
| trackTokenAnalytics | O(1) | O(n) | O(n·r) | r = retry attempts (max 3) |
| writeTokenMetrics | O(n) | O(n) | O(n) | n = number of messages |
| extractMetricsFromSDK | O(n) | O(n) | O(n) | Linear scan for result messages |
| writeToDatabase | O(1) | O(1) | O(1) | Single INSERT operation |
| testDatabaseWrite | O(1) | O(1) | O(1) | Single INSERT + SELECT + DELETE |

**Overall Pipeline Complexity:** O(n) where n = number of messages in SDK response

### Space Complexity

| Algorithm | Space Usage | Notes |
|-----------|-------------|-------|
| validateResponseStructure | O(n) | messageTypes array |
| trackTokenAnalytics | O(1) | Fixed tracking variables |
| writeTokenMetrics | O(1) | Single metrics object |
| extractMetricsFromSDK | O(m) | m = number of result messages |
| writeToDatabase | O(1) | Single params object |
| testDatabaseWrite | O(1) | Single test record |

**Overall Pipeline Space:** O(n) where n = number of messages (for validation)

### Performance Characteristics

```
PERFORMANCE PROFILE:

Input Size Scaling:
- 1-10 messages: < 5ms total processing time
- 10-50 messages: < 20ms total processing time
- 50-100 messages: < 50ms total processing time
- 100+ messages: < 100ms total processing time

Database Write:
- Single insert: < 1ms (SQLite in-memory)
- Single insert: < 5ms (SQLite on-disk)
- Verification query: < 1ms

Logging Overhead:
- Each LOG statement: ~0.1-0.5ms
- Total logging per request: ~2-5ms
- Can be disabled in production for performance

Error Handling:
- TRY-CATCH overhead: < 0.1ms
- JSON.stringify for logging: 1-3ms (depends on size)
- Stack trace capture: < 1ms
```

---

## Error Handling Patterns

### Pattern 1: Graceful Degradation

```
PATTERN: Graceful Degradation
PRINCIPLE: Analytics failures should never break main application flow

IMPLEMENTATION:
BEGIN
  TRY:
    // Attempt analytics operation
    performAnalyticsOperation()
  CATCH error:
    // Log comprehensive error details
    LOG "❌ Analytics operation failed:", error
    LOG "Stack:", error.stack
    LOG "Context:", operationContext

    // DO NOT throw - continue main flow
    // Analytics is non-critical functionality
  END TRY
END

RATIONALE:
- User experience is paramount
- Analytics is monitoring/observability feature
- Temporary analytics failures acceptable
- Main application must remain functional
```

### Pattern 2: Comprehensive Logging

```
PATTERN: Comprehensive Diagnostic Logging
PRINCIPLE: Every failure should be fully diagnosable from logs alone

IMPLEMENTATION:
BEGIN
  // Log entry point with all inputs
  LOG "🔍 [COMPONENT] Operation starting"
  LOG "Input parameters:", parameters

  // Log each major step
  LOG "Step 1: Validation"
  validationResult = validate(input)
  LOG "Validation result:", validationResult

  // Log success/failure with full context
  IF success THEN
    LOG "✅ [COMPONENT] Operation succeeded"
    LOG "Result:", result
  ELSE
    LOG "❌ [COMPONENT] Operation failed"
    LOG "Error:", error
    LOG "Stack:", error.stack
    LOG "Input that caused failure:", failedInput
  END IF
END

LOGGING LEVELS:
- 🔍 [DEBUG] - Diagnostic information
- ✅ [SUCCESS] - Successful operations
- ⚠️ [WARNING] - Non-critical issues
- ❌ [ERROR] - Failures requiring attention
- 🎉 [MILESTONE] - Major operation completions
```

### Pattern 3: Retry with Exponential Backoff

```
PATTERN: Retry with Exponential Backoff
PRINCIPLE: Transient failures should be automatically retried

IMPLEMENTATION:
ALGORITHM: retryWithBackoff
INPUT: operation (function), maxRetries (integer), baseDelay (integer)
OUTPUT: result or final error

BEGIN
  retryCount = 0
  lastError = null

  WHILE retryCount < maxRetries DO
    TRY:
      result = operation()
      RETURN result  // Success

    CATCH error:
      lastError = error
      retryCount = retryCount + 1

      IF retryCount < maxRetries THEN
        // Exponential backoff: delay = baseDelay * 2^(retryCount-1)
        delay = baseDelay * Math.pow(2, retryCount - 1)
        LOG "Retry", retryCount, "after", delay, "ms"
        AWAIT sleep(delay)
      END IF
    END TRY
  END WHILE

  // All retries exhausted
  LOG "❌ All retries failed"
  THROW lastError
END ALGORITHM

CONFIGURATION:
- Database writes: maxRetries = 3, baseDelay = 100ms
- Network operations: maxRetries = 5, baseDelay = 500ms
- File operations: maxRetries = 3, baseDelay = 200ms
```

### Pattern 4: Validation Early, Fail Fast

```
PATTERN: Validation Early, Fail Fast
PRINCIPLE: Detect invalid inputs immediately before expensive operations

IMPLEMENTATION:
BEGIN
  // Step 1: Validate all inputs upfront
  IF NOT validateInput(input) THEN
    LOG "❌ Invalid input, aborting"
    RETURN error("invalid_input")
  END IF

  // Step 2: Validate dependencies
  IF NOT checkDependencies() THEN
    LOG "❌ Dependencies not met, aborting"
    RETURN error("dependencies_not_met")
  END IF

  // Step 3: Proceed with expensive operation
  result = expensiveOperation(input)

  RETURN result
END

BENEFITS:
- Avoid wasted computation
- Clear error messages
- Faster debugging
- Better resource utilization
```

---

## Integration Points

### Integration Point 1: Claude Code SDK Route

**File:** `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`
**Location:** Lines 242-269

```
INTEGRATION: streaming-chat endpoint analytics tracking

BEFORE (Current):
  if (tokenAnalyticsWriter && responses && responses.length > 0) {
    const messages = firstResponse?.messages || [];
    if (messages.length > 0) {
      tokenAnalyticsWriter.writeTokenMetrics(messages, sessionId)
        .then(() => console.log('✅ Token analytics written'))
        .catch(error => console.error('⚠️ Failed:', error.message));
    }
  }

AFTER (Enhanced):
  if (tokenAnalyticsWriter && responses && responses.length > 0) {
    // NEW: Validate response structure
    const validation = validateResponseStructure(responses);

    if (!validation.isValid) {
      console.warn('⚠️ Invalid response structure:', validation.errorReason);
      console.warn('Validation metadata:', validation.metadata);
    } else {
      // Enhanced tracking with retry logic
      trackTokenAnalytics(responses, sessionId);
    }
  } else {
    console.warn('⚠️ Analytics prerequisites not met:', {
      hasWriter: !!tokenAnalyticsWriter,
      hasResponses: !!responses,
      responsesLength: responses?.length || 0
    });
  }
```

### Integration Point 2: TokenAnalyticsWriter Service

**File:** `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`
**Location:** Lines 269-304

```
INTEGRATION: writeTokenMetrics method enhancement

ENHANCEMENTS:
1. Add comprehensive entry logging
2. Add step-by-step progress logging
3. Add database write verification
4. Add timing metrics
5. Maintain graceful error handling

NO BREAKING CHANGES:
- Method signature remains identical
- Return type remains void
- Error handling remains non-throwing
```

### Integration Point 3: Database Initialization

**File:** `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`
**Location:** Lines 179-186

```
INTEGRATION: TokenAnalyticsWriter initialization

ENHANCEMENT:
Add database connectivity test during initialization

BEFORE:
  export function initializeWithDatabase(db) {
    if (db) {
      tokenAnalyticsWriter = new TokenAnalyticsWriter(db);
      console.log('✅ TokenAnalyticsWriter initialized');
    }
  }

AFTER:
  export function initializeWithDatabase(db) {
    if (db) {
      tokenAnalyticsWriter = new TokenAnalyticsWriter(db);
      console.log('✅ TokenAnalyticsWriter initialized');

      // NEW: Test database connectivity
      const testResult = tokenAnalyticsWriter.testDatabaseWrite();
      if (testResult.success) {
        console.log('✅ Database write test passed');
      } else {
        console.error('❌ Database write test failed:', testResult.error);
      }
    } else {
      console.warn('⚠️ Database unavailable, analytics disabled');
    }
  }
```

---

## Testing Strategy

### Unit Tests

```
TEST SUITE: TokenAnalyticsWriter Unit Tests

TEST: extractMetricsFromSDK - Valid Result Message
  GIVEN: Valid messages array with result message containing usage data
  WHEN: extractMetricsFromSDK is called
  THEN: Returns valid metrics object with correct token counts
  EXPECT: metrics.totalTokens == inputTokens + outputTokens

TEST: extractMetricsFromSDK - No Result Messages
  GIVEN: Messages array with no result messages
  WHEN: extractMetricsFromSDK is called
  THEN: Returns null
  EXPECT: null result and warning logged

TEST: extractMetricsFromSDK - Missing Usage Field
  GIVEN: Result message without usage field
  WHEN: extractMetricsFromSDK is called
  THEN: Returns null
  EXPECT: Error logged with available fields

TEST: calculateEstimatedCost - Standard Model
  GIVEN: Valid metrics with known model
  WHEN: calculateEstimatedCost is called
  THEN: Returns correct cost calculation
  EXPECT: cost == (inputTokens * rate.input + outputTokens * rate.output) / 1000

TEST: writeToDatabase - Successful Write
  GIVEN: Valid metrics and database connection
  WHEN: writeToDatabase is called
  THEN: Record inserted and verified
  EXPECT: result.changes == 1

TEST: writeToDatabase - Database Unavailable
  GIVEN: Null database connection
  WHEN: writeToDatabase is called
  THEN: Error logged, no exception thrown
  EXPECT: Graceful failure
```

### Integration Tests

```
TEST SUITE: Analytics Pipeline Integration Tests

TEST: End-to-End Analytics Write
  GIVEN: Valid SDK response from streaming-chat endpoint
  WHEN: Analytics pipeline processes response
  THEN: Record appears in database
  EXPECT: Record retrievable with correct sessionId

TEST: Invalid Response Structure
  GIVEN: SDK response with missing messages property
  WHEN: Analytics pipeline processes response
  THEN: Validation fails, no database write attempted
  EXPECT: Warning logged, main flow continues

TEST: Database Write Retry
  GIVEN: Temporary database lock condition
  WHEN: Analytics write attempted
  THEN: Retry succeeds on second attempt
  EXPECT: Record written, retry logged

TEST: Analytics Failure Non-Breaking
  GIVEN: Analytics service completely unavailable
  WHEN: Streaming-chat request processed
  THEN: Request succeeds, analytics skipped
  EXPECT: User receives response, warning logged
```

### Manual Testing Script

```
TEST SCRIPT: Manual Analytics Verification

STEP 1: Database Write Test
  COMMAND: node -e "require('./test-db-write.js')"
  EXPECT: "✅ Database write test PASSED"

STEP 2: Trigger Streaming Chat Request
  COMMAND: curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
           -H "Content-Type: application/json" \
           -d '{"message": "Test analytics", "sessionId": "test-123"}'
  EXPECT: 200 response, analytics logged

STEP 3: Verify Database Record
  COMMAND: sqlite3 database.db "SELECT * FROM token_analytics WHERE sessionId = 'test-123'"
  EXPECT: Record with matching sessionId

STEP 4: Check Server Logs
  COMMAND: tail -f logs/combined.log | grep -E "ANALYTICS|WRITER"
  EXPECT: See debug logs for entire analytics pipeline

STEP 5: Verify Record Count
  COMMAND: sqlite3 database.db "SELECT COUNT(*) FROM token_analytics WHERE timestamp > datetime('now', '-5 minutes')"
  EXPECT: Count > 0 (new records written)
```

---

## Implementation Checklist

### Phase 1: Enhanced Logging (15 minutes)

- [ ] Add validateResponseStructure function to claude-code-sdk.js
- [ ] Add comprehensive logging to trackTokenAnalytics
- [ ] Add step-by-step logging to writeTokenMetrics
- [ ] Add database write verification logging
- [ ] Test logging output with real request

### Phase 2: Validation & Error Handling (20 minutes)

- [ ] Implement response structure validation
- [ ] Add retry logic to analytics tracking
- [ ] Add database write verification
- [ ] Implement testDatabaseWrite function
- [ ] Test validation with various input types

### Phase 3: Database Verification (10 minutes)

- [ ] Add verification query after database write
- [ ] Add database connectivity test on initialization
- [ ] Test manual database write
- [ ] Verify permissions on database.db file

### Phase 4: Testing & Validation (30 minutes)

- [ ] Run manual database write test
- [ ] Trigger streaming-chat request
- [ ] Verify analytics record in database
- [ ] Check all logs for debug output
- [ ] Verify no errors in server logs
- [ ] Test with invalid response structures
- [ ] Test with database unavailable scenario

### Phase 5: Production Deployment (15 minutes)

- [ ] Review all changes for production readiness
- [ ] Reduce logging verbosity if needed
- [ ] Add monitoring for analytics health
- [ ] Deploy changes
- [ ] Monitor analytics writes in production
- [ ] Verify new records appearing in database

**Total Estimated Time:** 90 minutes

---

## Success Criteria

### Functional Requirements

1. **Analytics Writing:** New analytics records appear in database after every streaming-chat request
2. **Error Detection:** All analytics failures logged with diagnostic information
3. **Non-Breaking:** Analytics failures never break main application flow
4. **Verification:** Database writes verified immediately after insert
5. **Validation:** Invalid response structures detected before processing

### Performance Requirements

1. **Latency:** Analytics processing adds < 10ms to request processing
2. **Throughput:** Can handle 100+ requests/minute with analytics
3. **Resource Usage:** Analytics adds < 5MB memory overhead
4. **Database Impact:** Analytics writes cause < 1ms database lock time

### Monitoring Requirements

1. **Logging:** Every analytics operation logged with outcome
2. **Metrics:** Track analytics success/failure rate
3. **Alerting:** Alert if no analytics written for > 1 hour
4. **Diagnostics:** All failures diagnosable from logs alone

---

## Appendix: Code Examples

### Example 1: Response Validation

```javascript
// Example SDK response structure
const validResponse = [
  {
    messages: [
      {
        type: 'result',
        usage: {
          input_tokens: 100,
          output_tokens: 200,
          cache_read_input_tokens: 50,
          cache_creation_input_tokens: 0
        },
        modelUsage: {
          'claude-sonnet-4-20250514': {
            input_tokens: 100,
            output_tokens: 200
          }
        }
      }
    ]
  }
];

// Validation
const validation = validateResponseStructure(validResponse);
// Result: { isValid: true, errorReason: null, metadata: {...} }
```

### Example 2: Database Query for Recent Analytics

```sql
-- Check for recent analytics (last 24 hours)
SELECT
  COUNT(*) as total_records,
  SUM(totalTokens) as total_tokens,
  SUM(estimatedCost) as total_cost,
  COUNT(DISTINCT sessionId) as unique_sessions
FROM token_analytics
WHERE timestamp > datetime('now', '-24 hours');

-- Check for data gaps
SELECT
  MAX(timestamp) as last_record,
  (julianday('now') - julianday(MAX(timestamp))) * 24 as hours_since_last_record
FROM token_analytics;
```

### Example 3: Manual Test Script

```javascript
// test-analytics-write.js
import Database from 'better-sqlite3';
import { TokenAnalyticsWriter } from './src/services/TokenAnalyticsWriter.js';

const db = new Database('./database.db');
const writer = new TokenAnalyticsWriter(db);

// Test 1: Database write test
console.log('Test 1: Database Write Test');
const testResult = writer.testDatabaseWrite();
console.log('Result:', testResult);

// Test 2: Metrics extraction test
console.log('\nTest 2: Metrics Extraction Test');
const testMessages = [
  {
    type: 'result',
    usage: {
      input_tokens: 50,
      output_tokens: 100,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0
    },
    modelUsage: {
      'claude-sonnet-4-20250514': {
        input_tokens: 50,
        output_tokens: 100
      }
    }
  }
];

const metrics = writer.extractMetricsFromSDK(testMessages, 'test-session');
console.log('Extracted metrics:', metrics);

// Test 3: Full write pipeline
console.log('\nTest 3: Full Write Pipeline');
await writer.writeTokenMetrics(testMessages, 'test-session-full');

// Verify
const verifySQL = 'SELECT * FROM token_analytics WHERE sessionId = ?';
const record = db.prepare(verifySQL).get('test-session-full');
console.log('Verification:', record ? 'PASSED' : 'FAILED');
console.log('Record:', record);

db.close();
```

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-25 | SPARC Pseudocode Agent | Initial comprehensive pseudocode design |

---

**End of Document**

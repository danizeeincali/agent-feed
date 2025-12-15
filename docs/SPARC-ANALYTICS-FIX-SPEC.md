# SPARC Specification: Claude Code SDK Analytics Fix

**Document ID:** SPEC-ANALYTICS-FIX-001
**Version:** 1.0.0
**Date:** 2025-10-25
**Status:** Draft
**Owner:** Engineering Team
**Complexity:** Medium
**Priority:** High

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Problem Statement](#2-problem-statement)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Technical Requirements](#5-technical-requirements)
6. [Data Model](#6-data-model)
7. [Edge Cases & Error Conditions](#7-edge-cases--error-conditions)
8. [Testing Strategy](#8-testing-strategy)
9. [Success Criteria](#9-success-criteria)
10. [Implementation Constraints](#10-implementation-constraints)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Appendices](#12-appendices)

---

## 1. Introduction

### 1.1 Purpose

This specification defines the requirements for fixing the Claude Code SDK analytics system that has stopped writing token usage data to the database. The analytics system is critical for:

- Cost tracking and budget management
- Performance monitoring
- Usage pattern analysis
- Model efficiency optimization

### 1.2 Scope

**In Scope:**
- Analytics write failure diagnosis and fix
- Database write reliability improvements
- Error logging and observability enhancements
- Response structure parsing resilience
- Backward compatibility with existing data (350 historical records)
- Verification and testing of fix

**Out of Scope:**
- Analytics dashboard UI changes
- Cost calculation algorithm changes
- Historical data migration or cleanup
- API endpoint modifications (already working)
- New analytics features

### 1.3 Background

**Current State:**
- API endpoints operational: `/api/claude-code/analytics`, `/token-usage`, `/cost-tracking`
- Database schema exists with 350 historical records
- Last successful write: **October 21, 2025 at 03:13:08** (4 days ago)
- Zero records written in past 24 hours
- `writeTokenMetrics()` method being called but silently failing

**Root Cause Analysis:**
- Investigation shows code is present and should execute (lines 243-269 in `claude-code-sdk.js`)
- No error logs or success logs appearing in server output
- Most likely cause: SDK response structure change breaking metric extraction
- Secondary hypothesis: Database write failure being silently caught

### 1.4 Definitions

| Term | Definition |
|------|------------|
| **Token Analytics** | Usage metrics tracking input/output tokens, costs, and model performance |
| **writeTokenMetrics()** | Main entry point method in TokenAnalyticsWriter for writing analytics |
| **SDK Response** | Message array returned by Claude Code SDK after streaming chat |
| **Result Message** | Specific message type containing usage statistics |
| **Silent Failure** | Error condition that doesn't produce logs or visible symptoms |

---

## 2. Problem Statement

### 2.1 Issue Description

The Claude Code SDK analytics tracking system has stopped writing new records to the `token_analytics` database table. While API endpoints continue to return data from historical records, no new analytics data has been captured since October 21, 2025.

### 2.2 Impact Assessment

| Impact Area | Severity | Description |
|-------------|----------|-------------|
| **Cost Tracking** | High | Unable to monitor real-time spending |
| **Budget Management** | High | Cannot detect budget overruns |
| **Performance Monitoring** | Medium | No visibility into current latency/throughput |
| **Usage Analytics** | Medium | Cannot analyze recent usage patterns |
| **Model Optimization** | Low | Cannot compare recent model efficiency |

### 2.3 Business Requirements

1. **Cost Visibility:** Track every API request to prevent budget overruns
2. **Operational Monitoring:** Detect performance degradation in real-time
3. **Data Completeness:** Ensure no data gaps in analytics records
4. **System Reliability:** Analytics must not impact primary functionality

---

## 3. Functional Requirements

### FR-001: Analytics Write on Every Request
**Priority:** Critical
**Category:** Core Functionality

**Requirement:**
The system MUST write analytics records to the database on every successful `/api/claude-code/streaming-chat` request.

**Acceptance Criteria:**
- [ ] Analytics written within 100ms of request completion
- [ ] Success rate ≥ 99.9% for analytics writes
- [ ] Zero data loss during normal operations
- [ ] Analytics writes do not block API responses

**Test Cases:**
```gherkin
Scenario: Analytics written on successful chat request
  Given the API server is running
  When a client sends a valid streaming-chat request
  And the request completes successfully
  Then a new record MUST appear in token_analytics table
  And the record timestamp MUST be within 1 second of request completion
  And the record MUST contain valid token counts and cost
```

---

### FR-002: Non-Blocking Async Writes
**Priority:** Critical
**Category:** Performance

**Requirement:**
Analytics writes MUST be asynchronous and MUST NOT block or delay API responses to clients.

**Acceptance Criteria:**
- [ ] API response time unaffected by analytics writes
- [ ] Analytics writes execute in background promise chain
- [ ] Failed analytics writes do not fail API requests
- [ ] Client receives 200 OK before analytics write completes

**Implementation:**
```javascript
// Correct: Non-blocking async write
tokenAnalyticsWriter.writeTokenMetrics(messages, sessionId)
  .then(() => console.log('✅ Analytics written'))
  .catch(error => console.error('⚠️ Analytics failed:', error));

res.json({ success: true }); // Sent immediately, doesn't wait
```

---

### FR-003: Comprehensive Error Logging
**Priority:** High
**Category:** Observability

**Requirement:**
All analytics write failures MUST be logged with complete context for debugging.

**Acceptance Criteria:**
- [ ] Log entry on every write attempt (success or failure)
- [ ] Error logs include full error message and stack trace
- [ ] Context includes: sessionId, token counts, model, timestamp
- [ ] Logs differentiate between extraction vs. write failures
- [ ] No sensitive data (message content) in logs

**Log Format:**
```javascript
// Success log
console.log('✅ [ANALYTICS SUCCESS] Written:', {
  id: 'uuid-123',
  sessionId: 'session-456',
  totalTokens: 1500,
  estimatedCost: 0.045,
  timestamp: '2025-10-25T18:00:00.000Z'
});

// Failure log
console.error('❌ [ANALYTICS ERROR] Write failed:', {
  sessionId: 'session-456',
  errorType: 'DatabaseError',
  errorMessage: 'SQLITE_LOCKED',
  stack: error.stack,
  attemptedWrite: metrics
});
```

---

### FR-004: Success Confirmation Logging
**Priority:** High
**Category:** Observability

**Requirement:**
Successful analytics writes MUST generate confirmation logs for monitoring.

**Acceptance Criteria:**
- [ ] Log message contains "✅ [ANALYTICS SUCCESS]" prefix
- [ ] Includes session ID for correlation
- [ ] Includes total tokens and estimated cost
- [ ] Timestamp matches database record
- [ ] Easily searchable with grep/log aggregation

---

### FR-005: Resilient Response Parsing
**Priority:** Critical
**Category:** Reliability

**Requirement:**
Response structure parsing MUST handle SDK format changes gracefully without failing silently.

**Acceptance Criteria:**
- [ ] Validate response structure before extraction
- [ ] Log detailed structure when extraction fails
- [ ] Handle missing fields with sensible defaults
- [ ] Support multiple SDK response formats
- [ ] Clear error messages for unsupported formats

**Validation Logic:**
```javascript
// Validate response structure
if (!responses || !Array.isArray(responses) || responses.length === 0) {
  console.warn('⚠️ Invalid responses array:', {
    isNull: responses === null,
    isArray: Array.isArray(responses),
    length: responses?.length
  });
  return;
}

// Validate messages structure
const messages = responses[0]?.messages;
if (!messages || !Array.isArray(messages)) {
  console.warn('⚠️ Invalid messages structure:', {
    responseStructure: JSON.stringify(responses[0], null, 2)
  });
  return;
}
```

---

### FR-006: Manual Database Write Test
**Priority:** High
**Category:** Diagnostics

**Requirement:**
The system MUST support manual database write tests to verify database accessibility.

**Acceptance Criteria:**
- [ ] Manual INSERT test script provided
- [ ] Verifies database write permissions
- [ ] Confirms schema compatibility
- [ ] Tests with realistic data
- [ ] Returns clear success/failure status

**Test Script:**
```sql
-- Manual write test
INSERT INTO token_analytics (
  id, timestamp, sessionId, operation, model,
  inputTokens, outputTokens, totalTokens, estimatedCost
) VALUES (
  'manual-test-' || strftime('%s', 'now'),
  datetime('now'),
  'manual-test-session',
  'test',
  100, 200, 300, 0.015
);

-- Verify write
SELECT * FROM token_analytics
WHERE sessionId = 'manual-test-session'
ORDER BY timestamp DESC LIMIT 1;
```

---

### FR-007: Response Structure Validation
**Priority:** High
**Category:** Data Quality

**Requirement:**
The system MUST validate SDK response structure before attempting metric extraction.

**Acceptance Criteria:**
- [ ] Check for required fields: `messages`, `type`, `usage`, `modelUsage`
- [ ] Log actual structure when validation fails
- [ ] Return early if structure invalid
- [ ] Provide actionable error messages
- [ ] Track validation failure rate

---

### FR-008: Database Write Error Handling
**Priority:** High
**Category:** Reliability

**Requirement:**
Database write operations MUST handle all error conditions gracefully.

**Acceptance Criteria:**
- [ ] Catch SQLite lock errors (SQLITE_LOCKED)
- [ ] Catch permission errors (SQLITE_READONLY)
- [ ] Catch constraint violations (PRIMARY KEY, NOT NULL)
- [ ] Retry transient errors (configurable retry count)
- [ ] Log all error conditions with context
- [ ] Never throw exceptions to caller

**Error Handling:**
```javascript
try {
  const stmt = this.db.prepare(sql);
  const result = stmt.run(params);
  console.log('✅ Write succeeded:', result.changes);
} catch (error) {
  if (error.code === 'SQLITE_LOCKED') {
    console.error('❌ Database locked:', error.message);
    // Could retry with exponential backoff
  } else if (error.code === 'SQLITE_READONLY') {
    console.error('❌ Database read-only:', error.message);
  } else {
    console.error('❌ Database error:', error);
  }
  // Don't throw - graceful degradation
}
```

---

### FR-009: Metric Extraction Validation
**Priority:** Medium
**Category:** Data Quality

**Requirement:**
Extracted metrics MUST be validated before database write.

**Acceptance Criteria:**
- [ ] Token counts must be non-negative integers
- [ ] Session ID must be non-empty string
- [ ] Model name must be valid string
- [ ] Estimated cost must be non-negative number
- [ ] Validation failures logged with details

---

### FR-010: Real-Time Analytics Health Check
**Priority:** Medium
**Category:** Monitoring

**Requirement:**
The system SHOULD provide a health check endpoint for analytics write status.

**Acceptance Criteria:**
- [ ] Endpoint: `GET /api/claude-code/analytics/health`
- [ ] Returns last write timestamp
- [ ] Returns write success/failure count
- [ ] Indicates if analytics is healthy (last write < 1 hour)
- [ ] Response time < 50ms

**Response Format:**
```json
{
  "success": true,
  "analytics": {
    "healthy": true,
    "lastWriteTimestamp": "2025-10-25T18:30:00.000Z",
    "timeSinceLastWrite": "2 minutes",
    "writeSuccessCount": 1523,
    "writeFailureCount": 3,
    "successRate": 0.998
  }
}
```

---

## 4. Non-Functional Requirements

### NFR-001: Performance - Write Latency
**Priority:** High
**Category:** Performance

**Requirement:**
Analytics write operations MUST complete in less than 50ms (p95).

**Acceptance Criteria:**
- [ ] p50 latency < 20ms
- [ ] p95 latency < 50ms
- [ ] p99 latency < 100ms
- [ ] No write operation blocks for > 200ms
- [ ] Performance metrics tracked and logged

**Measurement:**
```javascript
const startTime = Date.now();
await writeToDatabase(metrics);
const duration = Date.now() - startTime;
console.log(`⏱️ Write duration: ${duration}ms`);
```

---

### NFR-002: Reliability - Write Success Rate
**Priority:** Critical
**Category:** Reliability

**Requirement:**
Analytics write success rate MUST be ≥ 99.9% under normal operating conditions.

**Acceptance Criteria:**
- [ ] Success rate measured over 24-hour windows
- [ ] Transient errors retried automatically
- [ ] Permanent errors logged and counted
- [ ] Alert triggered if success rate < 95%
- [ ] Graceful degradation under high load

---

### NFR-003: Observability - Debug Logging
**Priority:** High
**Category:** Observability

**Requirement:**
The system MUST provide detailed debug logging for troubleshooting.

**Acceptance Criteria:**
- [ ] Log level: INFO for success, ERROR for failures
- [ ] Logs include correlation IDs (session ID)
- [ ] Structured logging format (JSON compatible)
- [ ] Logs searchable by timestamp, session, error type
- [ ] Production logs retained for ≥ 30 days

**Log Structure:**
```javascript
{
  timestamp: '2025-10-25T18:30:00.000Z',
  level: 'INFO',
  component: 'TokenAnalyticsWriter',
  operation: 'writeTokenMetrics',
  sessionId: 'session-123',
  metrics: {
    inputTokens: 1000,
    outputTokens: 500,
    totalTokens: 1500,
    estimatedCost: 0.045
  },
  duration_ms: 25,
  result: 'success'
}
```

---

### NFR-004: Security - No Sensitive Data in Logs
**Priority:** Critical
**Category:** Security

**Requirement:**
Analytics logs MUST NOT contain sensitive data (user messages, API keys, credentials).

**Acceptance Criteria:**
- [ ] Message content excluded from logs
- [ ] Response content excluded from logs
- [ ] Only metadata logged (token counts, costs, models)
- [ ] Session IDs anonymized or hashed if necessary
- [ ] Security audit of all log statements

**Prohibited:**
```javascript
// ❌ NEVER log message content
console.log('Message:', userMessage); // WRONG

// ✅ Log only metadata
console.log('Message length:', userMessage.length); // CORRECT
```

---

### NFR-005: Backward Compatibility - Data Preservation
**Priority:** Critical
**Category:** Data Integrity

**Requirement:**
All fixes MUST preserve existing historical data (350 records) without modification.

**Acceptance Criteria:**
- [ ] No schema changes that break existing records
- [ ] Historical data readable after fix
- [ ] New writes compatible with old data format
- [ ] Analytics APIs return both old and new data
- [ ] No data migration required

---

### NFR-006: Maintainability - Code Quality
**Priority:** Medium
**Category:** Maintainability

**Requirement:**
Code changes MUST follow existing patterns and be well-documented.

**Acceptance Criteria:**
- [ ] Follows existing coding style
- [ ] Includes JSDoc comments
- [ ] Error handling patterns consistent
- [ ] No duplicate code
- [ ] Changes isolated to analytics module

---

### NFR-007: Scalability - High Request Volume
**Priority:** Medium
**Category:** Scalability

**Requirement:**
Analytics system MUST handle ≥ 100 concurrent requests without degradation.

**Acceptance Criteria:**
- [ ] No database lock contention
- [ ] Write queue if necessary
- [ ] No memory leaks under load
- [ ] CPU usage < 10% for analytics
- [ ] Load tested with 100 concurrent requests

---

### NFR-008: Recovery - Auto-Recovery
**Priority:** Medium
**Category:** Reliability

**Requirement:**
The system SHOULD auto-recover from transient failures without manual intervention.

**Acceptance Criteria:**
- [ ] Retry transient errors (max 3 attempts)
- [ ] Exponential backoff between retries
- [ ] Clear log of retry attempts
- [ ] Permanent failures logged and counted
- [ ] No retry on permanent errors (e.g., schema mismatch)

---

## 5. Technical Requirements

### 5.1 Database Schema

**Table:** `token_analytics`

```sql
CREATE TABLE token_analytics (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  operation TEXT NOT NULL,
  inputTokens INTEGER NOT NULL,
  outputTokens INTEGER NOT NULL,
  totalTokens INTEGER NOT NULL,
  estimatedCost REAL NOT NULL,
  model TEXT NOT NULL,
  userId TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_content TEXT,
  response_content TEXT
);

-- Indexes for performance
CREATE INDEX idx_timestamp ON token_analytics(timestamp);
CREATE INDEX idx_sessionId ON token_analytics(sessionId);
CREATE INDEX idx_model ON token_analytics(model);
```

**Schema Validation:**
- All fields except `userId`, `message_content`, `response_content` are required
- `id` must be UUID format
- `timestamp` must be ISO 8601 format
- `inputTokens`, `outputTokens`, `totalTokens` must be ≥ 0
- `estimatedCost` must be ≥ 0.0

---

### 5.2 Response Format Validation

**Expected SDK Response Structure:**
```javascript
{
  responses: [
    {
      messages: [
        {
          type: 'result',
          usage: {
            input_tokens: 1000,
            output_tokens: 500,
            cache_read_input_tokens: 200,
            cache_creation_input_tokens: 50
          },
          modelUsage: {
            'claude-sonnet-4-20250514': {
              input_tokens: 1000,
              output_tokens: 500
            }
          },
          total_cost_usd: 0.045,
          duration_ms: 1200,
          num_turns: 3
        }
      ]
    }
  ]
}
```

**Validation Rules:**
1. `responses` must be non-empty array
2. `responses[0].messages` must be non-empty array
3. At least one message with `type: 'result'`
4. `usage` object must exist
5. `modelUsage` object must exist
6. Token counts must be numbers

---

### 5.3 Error Handling Strategy

**Error Categories:**

| Error Type | Strategy | Retry? | Log Level |
|------------|----------|--------|-----------|
| Invalid Response Structure | Log + Skip | No | WARN |
| Missing Required Fields | Log + Skip | No | WARN |
| Database Locked | Retry with backoff | Yes (3x) | ERROR |
| Database Read-Only | Log + Skip | No | ERROR |
| Constraint Violation | Log + Skip | No | ERROR |
| Unknown Error | Log + Skip | No | ERROR |

**Retry Logic:**
```javascript
async function writeWithRetry(metrics, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await writeToDatabase(metrics);
      return; // Success
    } catch (error) {
      if (error.code === 'SQLITE_LOCKED' && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 100; // Exponential backoff
        console.warn(`⚠️ Retry ${attempt}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      } else {
        console.error('❌ Write failed permanently:', error);
        throw error; // Or handle gracefully
      }
    }
  }
}
```

---

### 5.4 Logging Levels and Format

**Log Levels:**
- **DEBUG:** Detailed execution flow (disabled in production)
- **INFO:** Successful operations
- **WARN:** Non-critical failures (skipped writes)
- **ERROR:** Critical failures (database errors)

**Log Format (Structured):**
```javascript
const log = {
  timestamp: new Date().toISOString(),
  level: 'INFO',
  component: 'TokenAnalyticsWriter',
  method: 'writeTokenMetrics',
  sessionId: 'session-123',
  event: 'write_success',
  data: {
    totalTokens: 1500,
    estimatedCost: 0.045,
    model: 'claude-sonnet-4-20250514',
    duration_ms: 25
  }
};

console.log(JSON.stringify(log));
```

---

### 5.5 Monitoring and Alerting

**Metrics to Track:**
1. Analytics write success rate (%)
2. Write latency (p50, p95, p99)
3. Validation failure rate (%)
4. Database error rate (%)
5. Time since last successful write (minutes)

**Alert Conditions:**
- Write success rate < 95% (Warning)
- Write success rate < 90% (Critical)
- No successful writes in 1 hour (Warning)
- No successful writes in 2 hours (Critical)
- Database errors > 10/hour (Warning)

**Health Check Endpoint:**
```javascript
GET /api/claude-code/analytics/health

Response:
{
  "healthy": true,
  "lastWrite": "2025-10-25T18:30:00.000Z",
  "timeSinceLastWrite": 120, // seconds
  "writeMetrics": {
    "successCount": 1523,
    "failureCount": 3,
    "successRate": 0.998,
    "avgLatencyMs": 18
  }
}
```

---

## 6. Data Model

### 6.1 TokenAnalyticsWriter Class

```javascript
class TokenAnalyticsWriter {
  constructor(database) {
    this.db = database;
    this.initialized = !!database;
    this.stats = {
      successCount: 0,
      failureCount: 0,
      lastWriteTimestamp: null
    };
  }

  // Extract metrics from SDK messages
  extractMetricsFromSDK(messages, sessionId): Object | null

  // Calculate cost based on token usage
  calculateEstimatedCost(usage, model): number

  // Write metrics to database
  async writeToDatabase(metrics): Promise<void>

  // Main entry point
  async writeTokenMetrics(messages, sessionId): Promise<void>

  // Get health status
  getHealthStatus(): Object
}
```

### 6.2 Metrics Object Schema

```typescript
interface Metrics {
  sessionId: string;           // Required
  operation: string;           // Required (e.g., 'sdk_operation')
  model: string;               // Required (e.g., 'claude-sonnet-4-20250514')
  inputTokens: number;         // Required (≥ 0)
  outputTokens: number;        // Required (≥ 0)
  totalTokens: number;         // Required (inputTokens + outputTokens)
  estimatedCost: number;       // Required (≥ 0.0)
  cacheReadTokens?: number;    // Optional
  cacheCreationTokens?: number; // Optional
  sdkReportedCost?: number;    // Optional
  duration_ms?: number;        // Optional
  num_turns?: number;          // Optional
}
```

### 6.3 Database Record Schema

```typescript
interface TokenAnalyticsRecord {
  id: string;              // UUID (Primary Key)
  timestamp: string;       // ISO 8601 timestamp
  sessionId: string;       // Session identifier
  operation: string;       // Operation type
  inputTokens: number;     // Input token count
  outputTokens: number;    // Output token count
  totalTokens: number;     // Total tokens
  estimatedCost: number;   // Estimated cost in USD
  model: string;           // Model name
  userId?: string;         // Optional user ID
  created_at: string;      // Database creation timestamp
  message_content?: string; // Optional (not used)
  response_content?: string; // Optional (not used)
}
```

---

## 7. Edge Cases & Error Conditions

### 7.1 Empty Messages Array

**Condition:** SDK returns empty messages array
**Expected Behavior:** Skip write, log warning

```javascript
if (!messages || messages.length === 0) {
  console.warn('⚠️ [ANALYTICS SKIP] No messages in response');
  return;
}
```

**Test Case:**
```javascript
it('should skip write when messages array is empty', async () => {
  const result = await writer.writeTokenMetrics([], 'session-123');
  expect(result).toBeUndefined();
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    expect.stringContaining('No messages in response')
  );
});
```

---

### 7.2 Malformed Response Structure

**Condition:** SDK response missing required fields
**Expected Behavior:** Log detailed structure, skip write

```javascript
if (!resultMessage.usage || !resultMessage.modelUsage) {
  console.warn('⚠️ [ANALYTICS SKIP] Invalid result message structure:', {
    hasUsage: !!resultMessage.usage,
    hasModelUsage: !!resultMessage.modelUsage,
    actualStructure: JSON.stringify(resultMessage, null, 2)
  });
  return;
}
```

**Test Cases:**
```javascript
it('should handle missing usage field', async () => {
  const messages = [{ type: 'result', modelUsage: {} }];
  await writer.writeTokenMetrics(messages, 'session-123');
  expect(dbWriteSpy).not.toHaveBeenCalled();
});

it('should handle missing modelUsage field', async () => {
  const messages = [{ type: 'result', usage: {} }];
  await writer.writeTokenMetrics(messages, 'session-123');
  expect(dbWriteSpy).not.toHaveBeenCalled();
});
```

---

### 7.3 Database Locked (SQLITE_LOCKED)

**Condition:** Database locked by another process
**Expected Behavior:** Retry 3 times with exponential backoff

```javascript
catch (error) {
  if (error.code === 'SQLITE_LOCKED' && retryCount < 3) {
    const delay = Math.pow(2, retryCount) * 100;
    console.warn(`⚠️ Database locked, retry ${retryCount + 1}/3 after ${delay}ms`);
    await sleep(delay);
    return writeWithRetry(metrics, retryCount + 1);
  }
  console.error('❌ Database permanently locked:', error);
}
```

**Test Case:**
```javascript
it('should retry on database lock', async () => {
  dbStub.prepare.throws({ code: 'SQLITE_LOCKED' });
  await writer.writeTokenMetrics(validMessages, 'session-123');
  expect(dbStub.prepare.callCount).toBe(3); // 1 initial + 2 retries
});
```

---

### 7.4 Database Permission Errors (SQLITE_READONLY)

**Condition:** Database file is read-only
**Expected Behavior:** Log error, skip write, no retry

```javascript
catch (error) {
  if (error.code === 'SQLITE_READONLY') {
    console.error('❌ [ANALYTICS ERROR] Database is read-only:', {
      dbPath: this.db.name,
      error: error.message
    });
    return; // Don't retry
  }
}
```

**Test Case:**
```javascript
it('should not retry on read-only database', async () => {
  dbStub.prepare.throws({ code: 'SQLITE_READONLY' });
  await writer.writeTokenMetrics(validMessages, 'session-123');
  expect(dbStub.prepare.callCount).toBe(1); // No retries
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    expect.stringContaining('read-only')
  );
});
```

---

### 7.5 Network Timeouts (N/A for SQLite)

**Condition:** Not applicable - SQLite is local file
**Expected Behavior:** N/A
**Note:** This edge case is not relevant for SQLite but would be for remote databases.

---

### 7.6 Concurrent Writes

**Condition:** Multiple requests writing simultaneously
**Expected Behavior:** SQLite handles locking, may trigger SQLITE_LOCKED retries

**Test Case:**
```javascript
it('should handle concurrent writes', async () => {
  const promises = Array.from({ length: 10 }, (_, i) =>
    writer.writeTokenMetrics(validMessages, `session-${i}`)
  );

  await Promise.all(promises);

  const records = db.prepare(
    'SELECT COUNT(*) as count FROM token_analytics'
  ).get();

  expect(records.count).toBe(10);
});
```

---

### 7.7 Invalid Token Counts

**Condition:** SDK returns negative or non-numeric token counts
**Expected Behavior:** Default to 0, log warning

```javascript
const inputTokens = Math.max(0, Number(usage.input_tokens) || 0);
const outputTokens = Math.max(0, Number(usage.output_tokens) || 0);

if (inputTokens === 0 && outputTokens === 0) {
  console.warn('⚠️ [ANALYTICS] Zero tokens detected:', {
    usage,
    sessionId
  });
}
```

---

### 7.8 Missing Session ID

**Condition:** Session ID not provided or empty
**Expected Behavior:** Generate fallback session ID, log warning

```javascript
if (!sessionId || sessionId.trim() === '') {
  const fallbackId = `generated-${Date.now()}-${randomUUID()}`;
  console.warn('⚠️ [ANALYTICS] No session ID provided, using fallback:', fallbackId);
  sessionId = fallbackId;
}
```

---

### 7.9 Unknown Model Name

**Condition:** Model not in pricing table
**Expected Behavior:** Use default pricing, log warning

```javascript
const pricing = PRICING[model] || DEFAULT_PRICING;

if (!PRICING[model]) {
  console.warn('⚠️ [ANALYTICS] Unknown model, using default pricing:', {
    model,
    defaultPricing: DEFAULT_PRICING
  });
}
```

---

## 8. Testing Strategy

### 8.1 Unit Tests

**File:** `api-server/tests/unit/token-analytics-writer.test.js`

**Test Coverage Requirements:**
- Code coverage ≥ 90%
- Branch coverage ≥ 85%
- All error paths tested

**Unit Test Cases:**

```javascript
describe('TokenAnalyticsWriter', () => {
  describe('extractMetricsFromSDK', () => {
    it('should extract metrics from valid SDK response', () => {
      const messages = [createValidResultMessage()];
      const metrics = writer.extractMetricsFromSDK(messages, 'session-123');

      expect(metrics).toMatchObject({
        sessionId: 'session-123',
        operation: 'sdk_operation',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 1000,
        outputTokens: 500,
        totalTokens: 1500
      });
    });

    it('should return null for empty messages array', () => {
      const metrics = writer.extractMetricsFromSDK([], 'session-123');
      expect(metrics).toBeNull();
    });

    it('should return null when no result messages found', () => {
      const messages = [{ type: 'text', content: 'Hello' }];
      const metrics = writer.extractMetricsFromSDK(messages, 'session-123');
      expect(metrics).toBeNull();
    });

    it('should handle missing usage field', () => {
      const messages = [{ type: 'result', modelUsage: {} }];
      const metrics = writer.extractMetricsFromSDK(messages, 'session-123');
      expect(metrics).toBeNull();
    });

    it('should handle cache token fields', () => {
      const messages = [createMessageWithCacheTokens()];
      const metrics = writer.extractMetricsFromSDK(messages, 'session-123');

      expect(metrics.cacheReadTokens).toBe(200);
      expect(metrics.cacheCreationTokens).toBe(50);
    });
  });

  describe('calculateEstimatedCost', () => {
    it('should calculate cost correctly', () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 0,
        cacheCreationTokens: 0
      };

      const cost = writer.calculateEstimatedCost(usage, 'claude-sonnet-4-20250514');

      // (1000 * 0.003 / 1000) + (500 * 0.015 / 1000) = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });

    it('should include cache costs', () => {
      const usage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadTokens: 200,
        cacheCreationTokens: 50
      };

      const cost = writer.calculateEstimatedCost(usage, 'claude-sonnet-4-20250514');

      // Input: 1000 * 0.003 / 1000 = 0.003
      // Output: 500 * 0.015 / 1000 = 0.0075
      // Cache read: 200 * 0.0003 / 1000 = 0.00006
      // Cache creation: 50 * 0.003 / 1000 = 0.00015
      // Total: 0.01071
      expect(cost).toBeCloseTo(0.01071, 5);
    });

    it('should use default pricing for unknown model', () => {
      const usage = { inputTokens: 1000, outputTokens: 500 };
      const cost = writer.calculateEstimatedCost(usage, 'unknown-model');

      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for null usage', () => {
      const cost = writer.calculateEstimatedCost(null, 'any-model');
      expect(cost).toBe(0);
    });
  });

  describe('writeToDatabase', () => {
    it('should write valid metrics to database', async () => {
      const metrics = createValidMetrics();
      await writer.writeToDatabase(metrics);

      const record = db.prepare(
        'SELECT * FROM token_analytics WHERE sessionId = ?'
      ).get(metrics.sessionId);

      expect(record).toBeDefined();
      expect(record.inputTokens).toBe(metrics.inputTokens);
      expect(record.outputTokens).toBe(metrics.outputTokens);
      expect(record.totalTokens).toBe(metrics.totalTokens);
      expect(record.estimatedCost).toBeCloseTo(metrics.estimatedCost, 4);
    });

    it('should generate UUID for record ID', async () => {
      const metrics = createValidMetrics();
      await writer.writeToDatabase(metrics);

      const record = db.prepare(
        'SELECT * FROM token_analytics WHERE sessionId = ?'
      ).get(metrics.sessionId);

      expect(record.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate ISO timestamp', async () => {
      const metrics = createValidMetrics();
      await writer.writeToDatabase(metrics);

      const record = db.prepare(
        'SELECT * FROM token_analytics WHERE sessionId = ?'
      ).get(metrics.sessionId);

      expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should not throw on database error', async () => {
      dbStub.prepare.throws(new Error('Database error'));

      await expect(
        writer.writeToDatabase(createValidMetrics())
      ).resolves.not.toThrow();
    });

    it('should log error on write failure', async () => {
      dbStub.prepare.throws(new Error('Write failed'));

      await writer.writeToDatabase(createValidMetrics());

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write token analytics')
      );
    });
  });

  describe('writeTokenMetrics (integration)', () => {
    it('should complete full write flow', async () => {
      const messages = [createValidResultMessage()];

      await writer.writeTokenMetrics(messages, 'session-integration');

      const record = db.prepare(
        'SELECT * FROM token_analytics WHERE sessionId = ?'
      ).get('session-integration');

      expect(record).toBeDefined();
      expect(record.totalTokens).toBeGreaterThan(0);
      expect(record.estimatedCost).toBeGreaterThan(0);
    });

    it('should log success message', async () => {
      const messages = [createValidResultMessage()];

      await writer.writeTokenMetrics(messages, 'session-log-test');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅')
      );
    });

    it('should not throw on extraction failure', async () => {
      await expect(
        writer.writeTokenMetrics([], 'session-empty')
      ).resolves.not.toThrow();
    });
  });
});
```

---

### 8.2 Integration Tests

**File:** `api-server/tests/integration/analytics-write-flow.test.js`

**Integration Test Cases:**

```javascript
describe('Analytics Write Integration', () => {
  it('should write analytics on successful streaming-chat request', async () => {
    const response = await request(app)
      .post('/api/claude-code/streaming-chat')
      .send({ message: 'Test message', sessionId: 'int-test-1' })
      .expect(200);

    // Wait for async write to complete
    await sleep(100);

    const record = db.prepare(
      'SELECT * FROM token_analytics WHERE sessionId LIKE ?'
    ).get('%int-test-1%');

    expect(record).toBeDefined();
    expect(record.totalTokens).toBeGreaterThan(0);
  });

  it('should not block API response for analytics write', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .post('/api/claude-code/streaming-chat')
      .send({ message: 'Test message' })
      .expect(200);

    const responseTime = Date.now() - startTime;

    // Response should be fast (< 3s including Claude API call)
    // Analytics write happens in background
    expect(responseTime).toBeLessThan(5000);
    expect(response.body.success).toBe(true);
  });

  it('should handle failed analytics write gracefully', async () => {
    // Make database read-only to force write failure
    fs.chmodSync('/path/to/database.db', 0o444);

    const response = await request(app)
      .post('/api/claude-code/streaming-chat')
      .send({ message: 'Test message' })
      .expect(200);

    // API should still succeed
    expect(response.body.success).toBe(true);

    // Restore database permissions
    fs.chmodSync('/path/to/database.db', 0o644);
  });
});
```

---

### 8.3 Manual Database Write Test

**File:** `api-server/tests/manual/test-database-write.js`

```javascript
#!/usr/bin/env node

/**
 * Manual Database Write Test
 *
 * Tests if database is writable and schema is correct.
 * Run with: node api-server/tests/manual/test-database-write.js
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const DB_PATH = './database.db';

console.log('🔍 Testing database write capabilities...\n');

try {
  // 1. Open database
  console.log('1️⃣ Opening database:', DB_PATH);
  const db = new Database(DB_PATH);
  console.log('✅ Database opened successfully\n');

  // 2. Test write
  console.log('2️⃣ Attempting test write...');
  const testRecord = {
    id: `manual-test-${randomUUID()}`,
    timestamp: new Date().toISOString(),
    sessionId: 'manual-test-session',
    operation: 'manual_test',
    model: 'test-model',
    inputTokens: 100,
    outputTokens: 200,
    totalTokens: 300,
    estimatedCost: 0.015
  };

  const sql = `
    INSERT INTO token_analytics (
      id, timestamp, sessionId, operation, model,
      inputTokens, outputTokens, totalTokens, estimatedCost
    ) VALUES (
      @id, @timestamp, @sessionId, @operation, @model,
      @inputTokens, @outputTokens, @totalTokens, @estimatedCost
    )
  `;

  const stmt = db.prepare(sql);
  const result = stmt.run(testRecord);

  console.log('✅ Write successful!');
  console.log('   Changes:', result.changes);
  console.log('   Record ID:', testRecord.id, '\n');

  // 3. Verify write
  console.log('3️⃣ Verifying written record...');
  const verify = db.prepare(
    'SELECT * FROM token_analytics WHERE id = ?'
  ).get(testRecord.id);

  if (!verify) {
    throw new Error('Record not found after write!');
  }

  console.log('✅ Record verified:');
  console.log('   Session ID:', verify.sessionId);
  console.log('   Total Tokens:', verify.totalTokens);
  console.log('   Estimated Cost:', verify.estimatedCost);
  console.log('   Timestamp:', verify.timestamp, '\n');

  // 4. Cleanup
  console.log('4️⃣ Cleaning up test record...');
  db.prepare('DELETE FROM token_analytics WHERE id = ?').run(testRecord.id);
  console.log('✅ Cleanup complete\n');

  db.close();

  console.log('🎉 DATABASE WRITE TEST PASSED!\n');
  process.exit(0);

} catch (error) {
  console.error('❌ DATABASE WRITE TEST FAILED!');
  console.error('   Error:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}
```

---

### 8.4 Real API Request Validation

**File:** `api-server/tests/manual/test-real-api-request.sh`

```bash
#!/bin/bash

# Test real API request and verify analytics write

echo "🔍 Testing real API request and analytics write..."
echo ""

# 1. Get current record count
echo "1️⃣ Counting existing records..."
BEFORE_COUNT=$(sqlite3 database.db "SELECT COUNT(*) FROM token_analytics;")
echo "   Records before: $BEFORE_COUNT"
echo ""

# 2. Make API request
echo "2️⃣ Sending API request..."
SESSION_ID="test-$(date +%s)"

curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Hello, test analytics write\", \"sessionId\": \"$SESSION_ID\"}" \
  -s -o /dev/null -w "   HTTP Status: %{http_code}\n"

echo ""

# 3. Wait for async write
echo "3️⃣ Waiting for async write (2 seconds)..."
sleep 2
echo ""

# 4. Count records again
echo "4️⃣ Counting records after request..."
AFTER_COUNT=$(sqlite3 database.db "SELECT COUNT(*) FROM token_analytics;")
echo "   Records after: $AFTER_COUNT"
echo ""

# 5. Verify new record
echo "5️⃣ Verifying new record..."
NEW_RECORD=$(sqlite3 database.db "SELECT COUNT(*) FROM token_analytics WHERE sessionId LIKE '%$SESSION_ID%';")

if [ "$NEW_RECORD" -eq "0" ]; then
  echo "   ❌ NO NEW RECORD FOUND!"
  echo "   This indicates analytics write is failing."
  exit 1
else
  echo "   ✅ New record found!"
  sqlite3 database.db "SELECT timestamp, totalTokens, estimatedCost, model FROM token_analytics WHERE sessionId LIKE '%$SESSION_ID%' ORDER BY timestamp DESC LIMIT 1;"
fi

echo ""
echo "🎉 REAL API REQUEST TEST PASSED!"
```

---

### 8.5 Performance Benchmarks

**File:** `api-server/tests/performance/analytics-write-benchmark.js`

```javascript
import { performance } from 'perf_hooks';

async function benchmarkWriteLatency() {
  const iterations = 1000;
  const latencies = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await writer.writeTokenMetrics(validMessages, `bench-${i}`);
    const duration = performance.now() - start;
    latencies.push(duration);
  }

  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(iterations * 0.50)];
  const p95 = latencies[Math.floor(iterations * 0.95)];
  const p99 = latencies[Math.floor(iterations * 0.99)];
  const avg = latencies.reduce((sum, l) => sum + l, 0) / iterations;

  console.log('📊 Write Latency Benchmark:');
  console.log('   Iterations:', iterations);
  console.log('   Average:', avg.toFixed(2), 'ms');
  console.log('   P50:', p50.toFixed(2), 'ms');
  console.log('   P95:', p95.toFixed(2), 'ms');
  console.log('   P99:', p99.toFixed(2), 'ms');

  // Assert performance requirements
  expect(p95).toBeLessThan(50);
  expect(p99).toBeLessThan(100);
}
```

---

### 8.6 Test Execution Plan

**Phase 1: Pre-Implementation Tests (Validation)**
1. ✅ Manual database write test (confirm database writable)
2. ✅ Real API request test (confirm request structure)
3. ✅ Log analysis (confirm current failure mode)

**Phase 2: Unit Tests (TDD)**
1. Write unit tests for all methods
2. Run tests (should fail initially)
3. Implement fixes
4. Run tests until all pass
5. Verify code coverage ≥ 90%

**Phase 3: Integration Tests**
1. End-to-end API request → analytics write
2. Error handling scenarios
3. Concurrent request handling
4. Performance benchmarks

**Phase 4: Manual Validation**
1. Deploy to development environment
2. Make real API requests
3. Verify analytics appearing in database
4. Check logs for success messages
5. Monitor for 24 hours

**Phase 5: Production Validation**
1. Deploy to production
2. Monitor health check endpoint
3. Verify write success rate ≥ 99.9%
4. Check analytics dashboard shows live data

---

## 9. Success Criteria

### 9.1 Primary Success Criteria

**Definition of Success:**
The analytics fix is considered successful when ALL of the following criteria are met:

| # | Criterion | Target | Measurement |
|---|-----------|--------|-------------|
| 1 | New records written | 100% of requests | Query database |
| 2 | Last write timestamp | < 5 minutes old | Check latest record |
| 3 | Write success rate | ≥ 99.9% | Logs analysis |
| 4 | Zero analytics errors | 0 errors/hour | Error logs |
| 5 | All tests passing | 100% pass rate | CI/CD pipeline |
| 6 | Code coverage | ≥ 90% | Coverage report |
| 7 | API response time | Unchanged | Performance monitoring |
| 8 | Historical data intact | 350 records | Database query |

---

### 9.2 Verification Checklist

**Pre-Deployment:**
- [ ] Manual database write test passes
- [ ] Unit tests pass (≥ 90% coverage)
- [ ] Integration tests pass
- [ ] Performance benchmarks meet targets (p95 < 50ms)
- [ ] Code review completed
- [ ] Documentation updated

**Post-Deployment (Development):**
- [ ] New analytics records appearing in database
- [ ] Timestamps are current (< 5 minutes old)
- [ ] Success logs appearing in server output
- [ ] No error logs related to analytics
- [ ] `/api/claude-code/analytics` shows live data
- [ ] Cost tracking updates in real-time

**Post-Deployment (Production - 24 hour validation):**
- [ ] Write success rate ≥ 99.9%
- [ ] No analytics-related errors in logs
- [ ] Health check endpoint reports healthy
- [ ] Analytics dashboard shows recent data
- [ ] No performance degradation
- [ ] No customer complaints

---

### 9.3 Acceptance Tests

**Test Case 1: Analytics Written on Every Request**
```gherkin
Given the analytics system is running
When 100 API requests are sent
Then 100 new analytics records MUST appear in database
And all records MUST have timestamps within 1 second of request
And all records MUST have valid token counts and costs
```

**Test Case 2: Live Data in Dashboard**
```gherkin
Given the analytics system is running
When a new API request is made
And I wait 5 seconds
When I query /api/claude-code/analytics
Then the response MUST include the new request
And the totalRequests count MUST have increased by 1
And the lastUpdated timestamp MUST be current
```

**Test Case 3: Error Recovery**
```gherkin
Given the database is temporarily locked
When an API request is made
Then the analytics write MUST retry
And eventually succeed
And the API request MUST complete successfully regardless
```

**Test Case 4: Historical Data Preservation**
```gherkin
Given there are 350 historical analytics records
When the analytics fix is deployed
Then all 350 records MUST still be readable
And analytics APIs MUST return both old and new data
And no data corruption MUST occur
```

---

## 10. Implementation Constraints

### 10.1 Technical Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **SQLite Database** | Must use existing SQLite database | Limited concurrent write performance |
| **better-sqlite3** | Must use better-sqlite3 driver | Synchronous API, blocking writes |
| **Schema Compatibility** | Cannot change existing schema | Must work with current table structure |
| **No Dependencies** | No new npm packages allowed | Must use existing libraries |
| **Node.js Version** | Node.js 18+ required | Use modern ES6+ features |

---

### 10.2 Business Constraints

| Constraint | Description | Impact |
|------------|-------------|--------|
| **Zero Downtime** | Cannot interrupt production service | Must deploy without restart |
| **No Data Loss** | Preserve all historical data | Careful migration planning |
| **Budget: $0** | No additional costs | Use existing infrastructure |
| **Timeline: 1 week** | Must complete in 5 business days | Focused scope, no extras |

---

### 10.3 Design Constraints

| Constraint | Description | Rationale |
|------------|-------------|-----------|
| **Async Writes** | Analytics must not block API responses | User experience priority |
| **Graceful Degradation** | Failed analytics must not fail API | Core functionality priority |
| **Structured Logging** | Must use consistent log format | Observability requirement |
| **No Breaking Changes** | Must not break existing code | Backward compatibility |

---

### 10.4 Resource Constraints

| Resource | Available | Required |
|----------|-----------|----------|
| **Developer Time** | 40 hours | 20-30 hours estimated |
| **Testing Time** | 8 hours | 5-8 hours estimated |
| **Code Review** | 2 hours | 1-2 hours estimated |
| **Deployment Window** | Anytime | Off-peak preferred |

---

## 11. Acceptance Criteria

### 11.1 Functional Acceptance

**Must Have (P0):**
- ✅ Analytics written on every `/streaming-chat` request
- ✅ Success logs visible in server output
- ✅ Error logs visible on failures
- ✅ Database records contain valid data
- ✅ Historical data preserved

**Should Have (P1):**
- ✅ Health check endpoint functional
- ✅ Retry logic for transient errors
- ✅ Performance metrics tracked
- ✅ Structured logging format

**Nice to Have (P2):**
- ⚪ Real-time monitoring dashboard
- ⚪ Automated alerts for failures
- ⚪ Cost optimization suggestions

---

### 11.2 Non-Functional Acceptance

**Performance:**
- ✅ p95 write latency < 50ms
- ✅ No impact on API response time
- ✅ Handles 100 concurrent requests

**Reliability:**
- ✅ Write success rate ≥ 99.9%
- ✅ Graceful degradation on errors
- ✅ Auto-recovery from transient failures

**Observability:**
- ✅ All operations logged
- ✅ Errors include full context
- ✅ Logs searchable/parseable

**Security:**
- ✅ No sensitive data in logs
- ✅ No SQL injection vulnerabilities
- ✅ Database file permissions correct

---

### 11.3 Quality Gates

**Code Quality:**
- [ ] Passes ESLint with zero errors
- [ ] Code coverage ≥ 90%
- [ ] No code duplication
- [ ] JSDoc comments on all public methods

**Testing:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual tests documented and passed
- [ ] Performance benchmarks meet targets

**Documentation:**
- [ ] README updated
- [ ] API documentation updated
- [ ] Test documentation complete
- [ ] Deployment guide created

**Deployment:**
- [ ] Smoke tests pass in staging
- [ ] Rollback plan documented
- [ ] Production validation checklist complete
- [ ] Monitoring alerts configured

---

## 12. Appendices

### Appendix A: Database Schema Reference

```sql
-- Full table definition
CREATE TABLE token_analytics (
  id TEXT PRIMARY KEY NOT NULL,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  operation TEXT NOT NULL,
  inputTokens INTEGER NOT NULL,
  outputTokens INTEGER NOT NULL,
  totalTokens INTEGER NOT NULL,
  estimatedCost REAL NOT NULL,
  model TEXT NOT NULL,
  userId TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  message_content TEXT,
  response_content TEXT
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_timestamp ON token_analytics(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessionId ON token_analytics(sessionId);
CREATE INDEX IF NOT EXISTS idx_model ON token_analytics(model);
CREATE INDEX IF NOT EXISTS idx_created_at ON token_analytics(created_at);

-- Useful queries
-- Get recent records
SELECT * FROM token_analytics
WHERE timestamp > datetime('now', '-24 hours')
ORDER BY timestamp DESC;

-- Count records by model
SELECT model, COUNT(*) as count, SUM(estimatedCost) as total_cost
FROM token_analytics
GROUP BY model;

-- Check for recent writes
SELECT
  COUNT(*) as count,
  MAX(timestamp) as last_write,
  ROUND((julianday('now') - julianday(MAX(timestamp))) * 24 * 60, 2) as minutes_ago
FROM token_analytics;
```

---

### Appendix B: Pricing Constants

```javascript
const PRICING = {
  'claude-sonnet-4-20250514': {
    input: 0.003,        // $3.00 per 1M tokens
    output: 0.015,       // $15.00 per 1M tokens
    cacheRead: 0.0003,   // $0.30 per 1M tokens (90% discount)
    cacheCreation: 0.003 // $3.00 per 1M tokens (same as input)
  },
  'claude-3-5-sonnet-20241022': {
    input: 0.003,
    output: 0.015,
    cacheRead: 0.0003,
    cacheCreation: 0.003
  },
  'claude-3-haiku-20240307': {
    input: 0.00025,
    output: 0.00125,
    cacheRead: 0.000025,
    cacheCreation: 0.00025
  }
};
```

---

### Appendix C: Log Message Reference

| Log Level | Prefix | Example |
|-----------|--------|---------|
| INFO | `✅ [ANALYTICS SUCCESS]` | `✅ [ANALYTICS SUCCESS] Written: { id: '...', totalTokens: 1500 }` |
| WARN | `⚠️ [ANALYTICS SKIP]` | `⚠️ [ANALYTICS SKIP] No messages in response` |
| ERROR | `❌ [ANALYTICS ERROR]` | `❌ [ANALYTICS ERROR] Write failed: SQLITE_LOCKED` |
| DEBUG | `🔍 [ANALYTICS DEBUG]` | `🔍 [ANALYTICS DEBUG] Extracted metrics: { inputTokens: 1000 }` |

---

### Appendix D: File Locations

| File | Path | Purpose |
|------|------|---------|
| **API Route** | `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js` | Analytics tracking code |
| **Writer Service** | `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js` | Main analytics service |
| **Database** | `/workspaces/agent-feed/database.db` | SQLite database file |
| **Unit Tests** | `/workspaces/agent-feed/api-server/tests/unit/token-analytics-writer.test.js` | Unit tests |
| **Integration Tests** | `/workspaces/agent-feed/api-server/tests/integration/analytics-write-flow.test.js` | Integration tests |
| **Manual Test** | `/workspaces/agent-feed/api-server/tests/manual/test-database-write.js` | Manual test script |

---

### Appendix E: Troubleshooting Guide

**Symptom: No analytics records being written**

1. Check if database is writable:
   ```bash
   ls -l database.db
   # Should show: -rw-r--r--
   ```

2. Test manual write:
   ```bash
   node api-server/tests/manual/test-database-write.js
   ```

3. Check server logs:
   ```bash
   tail -f logs/combined.log | grep ANALYTICS
   ```

4. Verify API endpoint is called:
   ```bash
   grep "streaming-chat" logs/combined.log | tail -20
   ```

**Symptom: Analytics writes failing intermittently**

1. Check for database lock errors:
   ```bash
   grep "SQLITE_LOCKED" logs/error.log
   ```

2. Check concurrent request volume:
   ```bash
   grep "streaming-chat" logs/combined.log | wc -l
   ```

3. Verify retry logic is working:
   ```bash
   grep "Retry" logs/combined.log
   ```

**Symptom: Invalid data in analytics records**

1. Check SDK response structure:
   ```bash
   grep "Result message structure" logs/combined.log | tail -5
   ```

2. Verify token counts are positive:
   ```sql
   SELECT * FROM token_analytics
   WHERE inputTokens < 0 OR outputTokens < 0;
   ```

3. Check cost calculations:
   ```sql
   SELECT id, inputTokens, outputTokens, estimatedCost
   FROM token_analytics
   WHERE estimatedCost <= 0 OR estimatedCost > 1.0;
   ```

---

### Appendix F: Rollback Plan

**If analytics fix causes issues:**

1. **Immediate Rollback (< 5 minutes)**
   ```bash
   # Revert to previous commit
   git revert HEAD
   git push

   # Restart server
   pm2 restart api-server
   ```

2. **Database Rollback (if needed)**
   ```bash
   # Restore from backup
   cp database.db.backup database.db

   # Verify integrity
   sqlite3 database.db "PRAGMA integrity_check;"
   ```

3. **Disable Analytics (emergency)**
   ```javascript
   // In claude-code-sdk.js, comment out analytics code
   /*
   if (tokenAnalyticsWriter && responses && responses.length > 0) {
     // ... analytics code
   }
   */
   ```

4. **Verify System Recovery**
   ```bash
   # Check API health
   curl http://localhost:3001/api/claude-code/health

   # Check logs
   tail -f logs/combined.log
   ```

---

### Appendix G: References

**Investigation Report:**
- File: `/workspaces/agent-feed/CLAUDE-SDK-ANALYTICS-INVESTIGATION.md`
- Created: 2025-10-25
- Findings: writeTokenMetrics() silently failing, 4-day data gap

**Related Issues:**
- Last successful write: October 21, 2025 at 03:13:08
- Current record count: 350
- Zero records in past 24 hours

**API Endpoints:**
- Analytics: `GET /api/claude-code/analytics`
- Token Usage: `GET /api/claude-code/token-usage`
- Cost Tracking: `GET /api/claude-code/cost-tracking`
- Health Check: `GET /api/claude-code/health`

**Database Location:**
- Path: `/workspaces/agent-feed/database.db`
- Type: SQLite 3
- Size: ~50KB (350 records)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-10-25 | Engineering | Initial specification |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Author** | Engineering Team | _____________ | _________ |
| **Reviewer** | Tech Lead | _____________ | _________ |
| **Approver** | CTO | _____________ | _________ |

---

**END OF SPECIFICATION**

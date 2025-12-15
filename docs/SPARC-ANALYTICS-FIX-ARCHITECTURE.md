# SPARC Architecture: Claude Code SDK Analytics Fix

## Document Overview

**Project**: Claude Code SDK Analytics Data Writing Failure Fix
**Version**: 1.0.0
**Date**: 2025-10-25
**Status**: Architecture Design Phase
**SPARC Phase**: Architecture (A)

## Executive Summary

This document defines the comprehensive architecture for fixing the analytics data writing failure in the Claude Code SDK integration. The current issue is that token analytics are not being written to the database, preventing cost tracking and usage monitoring. This architecture provides a resilient, observable, and performant solution.

---

## 1. System Architecture Overview

### 1.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Claude Code SDK Analytics Flow                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐                                                        │
│  │   Client     │                                                        │
│  │  Request     │                                                        │
│  └──────┬───────┘                                                        │
│         │                                                                 │
│         ▼                                                                 │
│  ┌──────────────────────────────────────┐                               │
│  │  POST /api/claude-code/streaming-chat│                               │
│  │  (claude-code-sdk.js:193)            │                               │
│  │  • Validate request                  │                               │
│  │  • Extract message & options         │                               │
│  └──────────────┬───────────────────────┘                               │
│                 │                                                         │
│                 ▼                                                         │
│  ┌──────────────────────────────────────┐                               │
│  │  ClaudeCodeSDKManager                │                               │
│  │  (ClaudeCodeSDKManager.js:150)       │                               │
│  │  • queryClaudeCode(userInput)        │                               │
│  │  • Process SDK messages              │                               │
│  │  • Extract content from responses    │                               │
│  └──────────────┬───────────────────────┘                               │
│                 │                                                         │
│                 ▼                                                         │
│  ┌──────────────────────────────────────┐                               │
│  │  Claude SDK Query (@anthropic)       │                               │
│  │  • Execute with tools (Bash, Read,   │                               │
│  │    Write, Edit, Grep, Glob, etc.)    │                               │
│  │  • Stream messages asynchronously    │                               │
│  │  • Return message array              │                               │
│  └──────────────┬───────────────────────┘                               │
│                 │                                                         │
│                 ▼                                                         │
│  ┌──────────────────────────────────────┐                               │
│  │  Response Processing                 │                               │
│  │  (claude-code-sdk.js:235)            │                               │
│  │  • Extract messages from response    │                               │
│  │  • Format final response             │                               │
│  │  • Stream to client                  │                               │
│  └──────────────┬───────────────────────┘                               │
│                 │                                                         │
│                 ├─────────────────────────────────────────┐             │
│                 │                                         │             │
│                 ▼                                         ▼             │
│  ┌──────────────────────────┐          ┌──────────────────────────┐   │
│  │  Client Response         │          │  Analytics Tracking      │   │
│  │  • Success/Error status  │          │  (ASYNC - NON-BLOCKING)  │   │
│  │  • Message content       │          │  (claude-code-sdk.js:243)│   │
│  │  • Timestamp             │          │  • Validate responses    │   │
│  └──────────────────────────┘          │  • Extract messages      │   │
│                                          │  • Call writeTokenMetrics│   │
│                                          └──────────┬───────────────┘   │
│                                                     │                    │
│                                                     ▼                    │
│                                          ┌──────────────────────────┐   │
│                                          │  TokenAnalyticsWriter    │   │
│                                          │  (TokenAnalyticsWriter.js│   │
│                                          │  :269)                   │   │
│                                          │  • extractMetricsFromSDK │   │
│                                          │  • calculateEstimatedCost│   │
│                                          │  • writeToDatabase       │   │
│                                          └──────────┬───────────────┘   │
│                                                     │                    │
│                                                     ▼                    │
│                                          ┌──────────────────────────┐   │
│                                          │  SQLite Database         │   │
│                                          │  (database.db)           │   │
│                                          │  • token_analytics table │   │
│                                          │  • Indexed by session    │   │
│                                          │  • Indexed by timestamp  │   │
│                                          └──────────────────────────┘   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Interaction Flow

```
┌─────────────┐    1. HTTP POST    ┌──────────────────┐
│   Client    │ ─────────────────> │  API Route       │
│             │                     │  /streaming-chat │
└─────────────┘                     └────────┬─────────┘
                                             │
                                    2. Create Chat
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │ ClaudeCodeSDKManager │
                                  │ queryClaudeCode()    │
                                  └──────────┬───────────┘
                                             │
                                   3. Execute Query
                                             │
                                             ▼
                                  ┌──────────────────────┐
                                  │  @anthropic-ai SDK   │
                                  │  query() function    │
                                  └──────────┬───────────┘
                                             │
                               4. Return Messages Array
                                             │
                ┌────────────────────────────┴────────────────────────┐
                │                                                      │
                ▼                                                      ▼
    ┌─────────────────────┐                           ┌──────────────────────────┐
    │  Sync Response Path │                           │  Async Analytics Path    │
    │  Return to Client   │                           │  (Non-Blocking)          │
    └─────────────────────┘                           └──────────┬───────────────┘
                                                                  │
                                                      5. Extract & Validate
                                                                  │
                                                                  ▼
                                                      ┌──────────────────────────┐
                                                      │ TokenAnalyticsWriter     │
                                                      │ writeTokenMetrics()      │
                                                      └──────────┬───────────────┘
                                                                  │
                                                     6. Parse & Calculate Cost
                                                                  │
                                                                  ▼
                                                      ┌──────────────────────────┐
                                                      │  Database INSERT         │
                                                      │  token_analytics table   │
                                                      └──────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Core Components

#### Component 1: API Route Handler
**File**: `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js`
**Lines**: 193-333

**Responsibilities**:
- Accept and validate HTTP POST requests to `/api/claude-code/streaming-chat`
- Extract user message and options from request body
- Delegate to ClaudeCodeSDKManager for query execution
- Handle response formatting and error handling
- Trigger async analytics tracking (non-blocking)

**Key Methods**:
- `POST /streaming-chat` (line 193): Main entry point
- Response processing (line 235): Extract messages from SDK response
- Analytics triggering (line 243): Async call to tokenAnalyticsWriter

**Dependencies**:
- ClaudeCodeSDKManager (imported line 9)
- TokenAnalyticsWriter (imported line 11)
- broadcastToSSE (imported line 10)

**Error Handling**:
- Try-catch wrapper (lines 198-332)
- 400 status for invalid input
- 500 status for processing errors
- SSE broadcast for error notifications

---

#### Component 2: ClaudeCodeSDKManager
**File**: `/workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js`
**Lines**: 1-336

**Responsibilities**:
- Manage Claude Code SDK lifecycle and configuration
- Execute queries using official `@anthropic-ai/claude-code` package
- Process streaming messages from SDK
- Extract content from different message types
- Broadcast tool activity to SSE stream

**Key Configuration**:
- Working Directory: `/workspaces/agent-feed/prod`
- Model: `claude-sonnet-4-20250514`
- Permission Mode: `bypassPermissions`
- Max Turns: 10

**Key Methods**:
- `queryClaudeCode(prompt, options)` (line 54): Execute SDK query
- `createStreamingChat(userInput, options)` (line 150): Main API interface
- `extractContent(message)` (line 187): Parse message content
- `healthCheck()` (line 245): Verify SDK functionality

**Message Types Handled**:
1. **assistant**: Contains Claude's text and tool use blocks
2. **result**: Final query result with usage metrics
3. **system**: System initialization messages
4. **stream_event**: Real-time streaming events

**Dependencies**:
- `@anthropic-ai/claude-code` query function
- broadcastToolActivity for SSE integration

---

#### Component 3: TokenAnalyticsWriter
**File**: `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js`
**Lines**: 1-309

**Responsibilities**:
- Extract token usage metrics from SDK result messages
- Calculate estimated costs with cache discount support
- Write analytics records to database
- Graceful error handling (never throws)

**Key Methods**:

1. **writeTokenMetrics(messages, sessionId)** (line 269)
   - Main entry point
   - Orchestrates extraction, calculation, and writing
   - Fully async and non-blocking
   - Comprehensive logging at each step

2. **extractMetricsFromSDK(messages, sessionId)** (line 45)
   - Validates messages array
   - Filters for `result` type messages
   - Extracts usage and modelUsage fields
   - Returns metrics object or null on failure

3. **calculateEstimatedCost(usage, model)** (line 155)
   - Uses model-specific pricing constants
   - Calculates costs for input, output, cache read, cache creation
   - Returns total cost in USD

4. **writeToDatabase(metrics)** (line 193)
   - Prepares SQL INSERT with named parameters
   - Uses better-sqlite3 synchronous API
   - Logs success/failure with full context

**Pricing Model** (line 20):
```javascript
{
  'claude-sonnet-4-20250514': {
    input: 0.003,        // $0.003 per 1K tokens
    output: 0.015,       // $0.015 per 1K tokens
    cacheRead: 0.0003,   // 90% discount
    cacheCreation: 0.003
  }
}
```

**Message Structure Expected**:
```javascript
{
  type: 'result',
  usage: {
    input_tokens: 1234,
    output_tokens: 567,
    cache_read_input_tokens: 890,
    cache_creation_input_tokens: 123
  },
  modelUsage: {
    'claude-sonnet-4-20250514': { ... }
  },
  total_cost_usd: 0.0456,
  duration_ms: 2345,
  num_turns: 3
}
```

**Dependencies**:
- crypto.randomUUID for ID generation
- better-sqlite3 database instance

---

### 2.2 Database Component

#### Schema: token_analytics Table

**File**: `/workspaces/agent-feed/database.db`

**Schema Definition**:
```sql
CREATE TABLE token_analytics (
    id TEXT PRIMARY KEY,
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
```

**Indexes**:
```sql
CREATE INDEX idx_analytics_session ON token_analytics(sessionId);
CREATE INDEX idx_analytics_timestamp ON token_analytics(timestamp);
```

**Index Strategy**:
- **sessionId**: Fast session-based queries for cost tracking
- **timestamp**: Time-series analytics and trending
- **composite**: Consider adding (sessionId, timestamp) for range queries

**Data Types**:
- **TEXT**: IDs, session identifiers, ISO timestamps
- **INTEGER**: Token counts (input, output, total)
- **REAL**: Cost values (USD)
- **DATETIME**: Automatic record creation timestamp

---

## 3. Data Flow Architecture

### 3.1 Request Flow (Happy Path)

```
1. Client Request
   ├─> POST /api/claude-code/streaming-chat
   ├─> Body: { message: "...", options: {...} }
   └─> Headers: { Content-Type: application/json }

2. API Route Handler (claude-code-sdk.js:193)
   ├─> Validate message (must be string)
   ├─> Generate/extract sessionId
   ├─> Broadcast initial SSE (thinking)
   └─> Call claudeCodeManager.createStreamingChat()

3. SDK Manager (ClaudeCodeSDKManager.js:150)
   ├─> Initialize if needed
   ├─> Call queryClaudeCode(userInput, options)
   ├─> Configure query options (cwd, model, tools, permissions)
   └─> Execute SDK query() function

4. Claude SDK Execution
   ├─> Iterate over async message stream
   ├─> Collect all messages in array
   ├─> Broadcast tool executions via SSE
   └─> Return messages array

5. Response Processing (claude-code-sdk.js:235)
   ├─> Extract messages from responses[0]
   ├─> Extract content for client response
   ├─> Format final response object
   └─> Return 200 OK to client

6. Analytics Tracking (ASYNC - claude-code-sdk.js:243)
   ├─> Check tokenAnalyticsWriter exists
   ├─> Check responses array has messages
   ├─> Call writeTokenMetrics(messages, sessionId)
   ├─> Log success/failure (non-blocking)
   └─> Continue (never blocks client response)

7. Analytics Writing (TokenAnalyticsWriter.js:269)
   ├─> extractMetricsFromSDK(messages, sessionId)
   ├─> Filter for result messages
   ├─> Extract usage and modelUsage
   ├─> calculateEstimatedCost(metrics, model)
   ├─> Prepare SQL INSERT statement
   └─> Execute database write

8. Database Write (TokenAnalyticsWriter.js:193)
   ├─> Generate UUID for record ID
   ├─> Generate ISO timestamp
   ├─> Prepare named parameters
   ├─> Execute stmt.run(params)
   └─> Log result.changes
```

### 3.2 Error Flow (Failure Scenarios)

```
Error Scenario 1: Invalid Request
├─> Missing message field
├─> Return 400 Bad Request
├─> Error: "Message is required and must be a string"
└─> No analytics tracking attempted

Error Scenario 2: SDK Query Failure
├─> SDK throws exception during query()
├─> Caught in createStreamingChat() try-catch
├─> Log error with stack trace
├─> Return 500 Internal Server Error
├─> Broadcast error via SSE
└─> No analytics tracking (no messages)

Error Scenario 3: Analytics Extraction Failure
├─> No result messages in response
├─> extractMetricsFromSDK() returns null
├─> Log warning: "Metric extraction failed"
├─> writeTokenMetrics() exits early
└─> CLIENT RESPONSE NOT AFFECTED (async)

Error Scenario 4: Database Write Failure
├─> SQL error or constraint violation
├─> Caught in writeToDatabase() try-catch
├─> Log error with full context
├─> Log metrics that failed
└─> CLIENT RESPONSE NOT AFFECTED (async)

Error Scenario 5: Missing Writer Instance
├─> tokenAnalyticsWriter is null
├─> Logged: "Token analytics skipped - writer not initialized"
├─> No database write attempted
└─> CLIENT RESPONSE NOT AFFECTED
```

### 3.3 Analytics Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Analytics Data Pipeline                    │
└─────────────────────────────────────────────────────────────┘

SDK Response Messages Array
    │
    │ Filter
    ▼
Result Messages Only (type === 'result')
    │
    │ Extract
    ▼
┌──────────────────────────────────────┐
│ Raw Metrics                          │
│ ─────────────────────────────────    │
│ - usage.input_tokens                 │
│ - usage.output_tokens                │
│ - usage.cache_read_input_tokens      │
│ - usage.cache_creation_input_tokens  │
│ - modelUsage[model]                  │
│ - total_cost_usd                     │
│ - duration_ms                        │
│ - num_turns                          │
└──────────────┬───────────────────────┘
               │
               │ Calculate
               ▼
┌──────────────────────────────────────┐
│ Processed Metrics                    │
│ ─────────────────────────────────    │
│ - sessionId                          │
│ - operation: 'sdk_operation'         │
│ - model: 'claude-sonnet-4-20250514'  │
│ - inputTokens                        │
│ - outputTokens                       │
│ - totalTokens (input + output)       │
│ - estimatedCost (calculated)         │
│ - cacheReadTokens                    │
│ - cacheCreationTokens                │
└──────────────┬───────────────────────┘
               │
               │ Format
               ▼
┌──────────────────────────────────────┐
│ Database Record                      │
│ ─────────────────────────────────    │
│ - id: UUID                           │
│ - timestamp: ISO 8601                │
│ - sessionId                          │
│ - operation                          │
│ - model                              │
│ - inputTokens                        │
│ - outputTokens                       │
│ - totalTokens                        │
│ - estimatedCost                      │
└──────────────┬───────────────────────┘
               │
               │ INSERT
               ▼
┌──────────────────────────────────────┐
│ token_analytics Table                │
│ ─────────────────────────────────    │
│ Indexed by:                          │
│ - sessionId (fast session queries)   │
│ - timestamp (time-series analytics)  │
└──────────────────────────────────────┘
```

---

## 4. Error Handling Architecture

### 4.1 Multi-Layer Error Handling Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Error Handling Layers                        │
└─────────────────────────────────────────────────────────────┘

Layer 1: Input Validation (API Route)
├─> Validate request.body exists
├─> Validate message is string
├─> Return 400 if invalid
└─> Prevents downstream errors

Layer 2: SDK Execution (ClaudeCodeSDKManager)
├─> Try-catch around query()
├─> Log errors with context
├─> Return { success: false, error: message }
└─> Never throws to caller

Layer 3: Analytics Validation (TokenAnalyticsWriter)
├─> Check messages array exists
├─> Check messages array not empty
├─> Check result messages exist
├─> Check usage fields exist
├─> Return null if validation fails
└─> Prevents invalid data writes

Layer 4: Database Operations (TokenAnalyticsWriter)
├─> Try-catch on INSERT
├─> Log full error context
├─> Log metrics that failed
├─> Never throws
└─> Graceful degradation

Layer 5: Monitoring & Alerts
├─> Track success/failure rates
├─> Alert on error threshold
├─> Dashboard visibility
└─> Proactive issue detection
```

### 4.2 Error Context Logging

Each error logs comprehensive context:

```javascript
// Example error log structure
console.error('❌ [TokenAnalyticsWriter] Failed to write token analytics:', {
  error: error.message,
  stack: error.stack,
  metrics: {
    sessionId,
    totalTokens,
    estimatedCost,
    model
  },
  timestamp: new Date().toISOString(),
  databaseState: {
    connected: !!this.db,
    writable: this.db?.writable
  }
});
```

### 4.3 Graceful Degradation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│              Graceful Degradation Flow                       │
└─────────────────────────────────────────────────────────────┘

Analytics Write Fails
    │
    ├─> Log detailed error
    ├─> Track failure metric
    ├─> Continue normal operation
    └─> CLIENT RECEIVES SUCCESSFUL RESPONSE

Analytics data is supplementary, not critical
    │
    ├─> User experience unaffected
    ├─> Background data collection
    └─> Monitoring detects issues

Recovery Options
    │
    ├─> Auto-retry on transient errors
    ├─> Queue for later write
    ├─> Alert for persistent failures
    └─> Manual investigation if needed
```

---

## 5. Logging Architecture

### 5.1 Log Levels and Emoji Convention

```
🔍 [DEBUG]    - Detailed execution flow for troubleshooting
✅ [SUCCESS]  - Successful operations and completions
⚠️ [WARNING]  - Non-critical issues, skipped operations
❌ [ERROR]    - Failures with full context
📝 [INFO]     - General informational messages
🚀 [START]    - Operation initiation
🎉 [COMPLETE] - Major milestone completion
```

### 5.2 Structured Logging Format

```javascript
// Pattern: [Component] Action: { context }

// Example 1: Debug logging
console.log('🔍 [TokenAnalyticsWriter] Starting metric extraction:', {
  messagesCount: messages?.length || 0,
  messageTypes: messages?.map(m => m.type) || [],
  sessionId
});

// Example 2: Success logging
console.log('✅ [TokenAnalyticsWriter] Token analytics record written:', {
  id,
  sessionId,
  totalTokens,
  estimatedCost,
  changes: result.changes
});

// Example 3: Error logging
console.error('❌ [TokenAnalyticsWriter] Failed to write token analytics:', {
  error: error.message,
  stack: error.stack,
  metrics,
  timestamp: new Date().toISOString()
});
```

### 5.3 Log Points in Analytics Flow

```
Point 1: Entry Point
├─> "🚀 [TokenAnalyticsWriter] Starting writeTokenMetrics"
├─> Context: messagesCount, sessionId
└─> File: TokenAnalyticsWriter.js:271

Point 2: Extraction Start
├─> "🔍 [TokenAnalyticsWriter] Starting metric extraction"
├─> Context: messagesCount, messageTypes, sessionId
└─> File: TokenAnalyticsWriter.js:47

Point 3: Result Messages Found
├─> "🔍 [TokenAnalyticsWriter] Found result messages: N"
├─> Context: resultMessages.length
└─> File: TokenAnalyticsWriter.js:71

Point 4: Extraction Success
├─> "✅ [TokenAnalyticsWriter] Successfully extracted metrics"
├─> Context: model, inputTokens, outputTokens, totalTokens
└─> File: TokenAnalyticsWriter.js:116

Point 5: Cost Calculation
├─> "✅ [TokenAnalyticsWriter] Cost calculated"
├─> Context: estimatedCost
└─> File: TokenAnalyticsWriter.js:290

Point 6: Database Write Start
├─> "🔍 [TokenAnalyticsWriter] Starting database write"
├─> Context: hasMetrics, hasDb, sessionId
└─> File: TokenAnalyticsWriter.js:195

Point 7: Database Write Success
├─> "✅ [TokenAnalyticsWriter] Token analytics record written"
├─> Context: id, sessionId, totalTokens, estimatedCost, changes
└─> File: TokenAnalyticsWriter.js:247

Point 8: Completion
├─> "🎉 [TokenAnalyticsWriter] writeTokenMetrics completed successfully"
├─> Context: Full execution summary
└─> File: TokenAnalyticsWriter.js:298

Error Points: At any failure
├─> "⚠️ [TokenAnalyticsWriter] No result messages found"
├─> "❌ [TokenAnalyticsWriter] Failed to extract metrics"
├─> "❌ [TokenAnalyticsWriter] Failed to write token analytics"
└─> Context: Full error details, stack trace, data
```

---

## 6. Performance Architecture

### 6.1 Performance Requirements

```
┌─────────────────────────────────────────────────────────────┐
│              Performance Targets & Constraints               │
└─────────────────────────────────────────────────────────────┘

Analytics Write Performance
├─> Target: < 50ms per write
├─> Maximum: < 100ms per write
├─> Async: Does not block client response
└─> Database: SQLite synchronous write

Client Response Time
├─> Target: < 3000ms for simple queries
├─> Maximum: < 10000ms for complex queries
├─> Not affected by analytics write
└─> Depends on Claude SDK processing time

Database Performance
├─> Connection: Single connection (better-sqlite3)
├─> Transactions: Individual INSERTs
├─> Indexes: sessionId, timestamp
└─> No connection pooling needed (SQLite)

Memory Footprint
├─> Messages array: ~1-10KB per query
├─> Metrics object: ~500 bytes
├─> Database record: ~300 bytes
└─> Minimal memory impact
```

### 6.2 Performance Optimization Strategies

```
Strategy 1: Async Analytics Tracking
├─> Analytics write is non-blocking
├─> Client receives response immediately
├─> Analytics happen in background
└─> Zero impact on user experience

Strategy 2: Efficient Data Extraction
├─> Single pass through messages array
├─> Filter only for result messages
├─> Early return on validation failure
└─> Minimal CPU overhead

Strategy 3: Database Indexing
├─> sessionId index for session queries
├─> timestamp index for time-series
├─> Composite index opportunities
└─> Fast read performance

Strategy 4: Minimal Logging in Production
├─> Debug logs only in development
├─> Production: Success/Error only
├─> Configurable log levels
└─> Reduced I/O overhead

Strategy 5: Connection Reuse
├─> Singleton database connection
├─> No connection overhead per write
├─> better-sqlite3 efficiency
└─> Prepared statements cached
```

### 6.3 Scalability Considerations

```
Current Scale
├─> Estimated: 100-1000 requests/day
├─> Peak: 10-50 requests/hour
├─> Database size: < 100MB/year
└─> Single SQLite instance sufficient

Future Scale Planning
├─> 10,000+ requests/day: Consider PostgreSQL
├─> Distributed deployment: Centralized analytics DB
├─> Big data analytics: Stream to data warehouse
└─> Real-time dashboards: Redis caching layer

Database Growth Management
├─> Retention policy: 90 days default
├─> Archive to cold storage: JSON exports
├─> VACUUM on schedule: Weekly maintenance
└─> Partition by month: If > 1M records
```

---

## 7. Security Architecture

### 7.1 Data Security

```
┌─────────────────────────────────────────────────────────────┐
│                   Security Measures                          │
└─────────────────────────────────────────────────────────────┘

Sensitive Data Handling
├─> Message content NOT logged in production
├─> Truncation of long strings in logs
├─> No API keys or tokens in database
└─> PII excluded from analytics

SQL Injection Prevention
├─> Parameterized queries only
├─> Named parameters (@param)
├─> No string concatenation
└─> better-sqlite3 protection

Database Access Control
├─> File-based SQLite permissions
├─> Application-level access only
├─> No direct database exposure
└─> Backup encryption recommended

Analytics API Security
├─> Authentication required (future)
├─> Rate limiting (future)
├─> CORS configuration
└─> Input validation
```

### 7.2 Privacy Considerations

```
Data Retention
├─> Default: 90 days
├─> Configurable per deployment
├─> Automatic cleanup jobs
└─> GDPR compliance ready

Data Minimization
├─> Only essential metrics stored
├─> No message content by default
├─> User ID optional
└─> Aggregation for analytics

Data Access
├─> Read access: Authenticated users only
├─> Write access: System only
├─> Export: Admin permission required
└─> Audit trail for access
```

---

## 8. Monitoring Architecture

### 8.1 Health Check System

#### Proposed Health Check Endpoint

**Route**: `GET /api/claude-code/analytics/health`

**Response Structure**:
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-10-25T18:44:00.000Z",
  "checks": {
    "database": {
      "status": "healthy",
      "writable": true,
      "lastWrite": "2025-10-25T18:43:45.000Z",
      "timeSinceLastWrite": "15 seconds"
    },
    "analytics": {
      "status": "healthy",
      "writerInitialized": true,
      "totalRecords": 350,
      "writeSuccessRate": 99.9,
      "errorRate": 0.1
    },
    "performance": {
      "avgWriteTime": "25ms",
      "p95WriteTime": "45ms",
      "p99WriteTime": "78ms"
    }
  },
  "metrics": {
    "last24h": {
      "totalWrites": 150,
      "successfulWrites": 149,
      "failedWrites": 1,
      "totalCost": 2.45,
      "totalTokens": 125000
    }
  }
}
```

**Health Status Determination**:
```javascript
function determineHealthStatus(checks) {
  // Critical failure conditions
  if (!checks.database.writable) return 'unhealthy';
  if (!checks.analytics.writerInitialized) return 'unhealthy';
  if (checks.analytics.errorRate > 10) return 'unhealthy';

  // Degraded conditions
  if (checks.database.timeSinceLastWrite > 7200000) return 'degraded'; // 2 hours
  if (checks.analytics.errorRate > 5) return 'degraded';
  if (checks.performance.p95WriteTime > 100) return 'degraded';

  return 'healthy';
}
```

### 8.2 Monitoring Metrics

```
┌─────────────────────────────────────────────────────────────┐
│                  Key Metrics to Monitor                      │
└─────────────────────────────────────────────────────────────┘

Availability Metrics
├─> Analytics write success rate (target: > 99%)
├─> Database availability (target: 100%)
├─> Writer initialization status
└─> Time since last successful write

Performance Metrics
├─> Average write time (target: < 50ms)
├─> P95 write time (target: < 100ms)
├─> P99 write time (target: < 150ms)
└─> Database query response time

Volume Metrics
├─> Total analytics records
├─> Writes per hour
├─> Writes per day
├─> Database size growth

Cost Metrics
├─> Total cost tracked (24h, 7d, 30d)
├─> Average cost per request
├─> Cost by model
└─> Budget utilization

Error Metrics
├─> Error rate (target: < 1%)
├─> Error types distribution
├─> Failed extraction count
├─> Failed write count
```

### 8.3 Alert Conditions

```
┌─────────────────────────────────────────────────────────────┐
│                  Alert Thresholds                            │
└─────────────────────────────────────────────────────────────┘

CRITICAL Alerts
├─> No successful write for > 2 hours
├─> Error rate > 10% over 15 minutes
├─> Database write failure
├─> Writer not initialized after startup
└─> Action: Immediate investigation required

WARNING Alerts
├─> No successful write for > 1 hour
├─> Error rate > 5% over 15 minutes
├─> P95 write time > 100ms
├─> Database size > 80% of threshold
└─> Action: Schedule investigation

INFO Alerts
├─> Error rate > 1% (informational)
├─> Unusual cost spike detected
├─> High request volume
└─> Action: Monitoring only
```

### 8.4 Logging Strategy for Monitoring

```
Production Logging Level: INFO
├─> Success: Single line per write
├─> Error: Full context with stack
├─> Metrics: Aggregated every hour
└─> Debug: Disabled in production

Development Logging Level: DEBUG
├─> Full execution trace
├─> Data structure inspection
├─> Performance timings
└─> All validation steps

Log Retention
├─> Application logs: 30 days
├─> Error logs: 90 days
├─> Metrics logs: 1 year
└─> Rotation: Daily
```

---

## 9. Deployment Architecture

### 9.1 Initialization Flow

```
Server Startup Sequence
    │
    ▼
1. Database Connection
   ├─> Open SQLite connection
   ├─> Verify schema exists
   ├─> Run migrations if needed
   └─> Set db reference

2. Initialize TokenAnalyticsWriter
   ├─> Create instance with db
   ├─> Store in module scope
   ├─> Log initialization status
   └─> File: claude-code-sdk.js:179

3. Initialize Routes
   ├─> Mount /api/claude-code/* routes
   ├─> Attach middleware
   ├─> Enable CORS
   └─> Start listening

4. Health Check
   ├─> Verify writer initialized
   ├─> Test database write
   ├─> Log readiness
   └─> Accept traffic
```

### 9.2 Configuration Management

```javascript
// Environment Variables
const CONFIG = {
  // Database
  DATABASE_PATH: process.env.DATABASE_PATH || '/workspaces/agent-feed/database.db',

  // Analytics
  ANALYTICS_ENABLED: process.env.ANALYTICS_ENABLED !== 'false',
  ANALYTICS_RETENTION_DAYS: parseInt(process.env.ANALYTICS_RETENTION_DAYS) || 90,

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_ANALYTICS_DEBUG: process.env.LOG_ANALYTICS_DEBUG === 'true',

  // Performance
  ANALYTICS_WRITE_TIMEOUT: parseInt(process.env.ANALYTICS_WRITE_TIMEOUT) || 5000,

  // Monitoring
  HEALTH_CHECK_ENABLED: process.env.HEALTH_CHECK_ENABLED !== 'false',
  ALERT_ERROR_THRESHOLD: parseFloat(process.env.ALERT_ERROR_THRESHOLD) || 0.05
};
```

### 9.3 Database Migration Strategy

```sql
-- migrations/001-create-token-analytics.sql
CREATE TABLE IF NOT EXISTS token_analytics (
    id TEXT PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS idx_analytics_session
    ON token_analytics(sessionId);

CREATE INDEX IF NOT EXISTS idx_analytics_timestamp
    ON token_analytics(timestamp);

-- migrations/002-add-cache-metrics.sql (future)
ALTER TABLE token_analytics
    ADD COLUMN cache_read_tokens INTEGER DEFAULT 0;

ALTER TABLE token_analytics
    ADD COLUMN cache_creation_tokens INTEGER DEFAULT 0;
```

---

## 10. Testing Architecture

### 10.1 Test Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Testing Layers                            │
└─────────────────────────────────────────────────────────────┘

Layer 1: Unit Tests
├─> TokenAnalyticsWriter.extractMetricsFromSDK()
├─> TokenAnalyticsWriter.calculateEstimatedCost()
├─> TokenAnalyticsWriter.writeToDatabase()
├─> Edge cases and error conditions
└─> Coverage target: > 90%

Layer 2: Integration Tests
├─> Full writeTokenMetrics() flow
├─> Database writes and reads
├─> Error handling scenarios
├─> Async behavior validation
└─> Coverage target: > 80%

Layer 3: API Tests
├─> POST /streaming-chat with analytics
├─> GET /analytics/health endpoint
├─> Error response scenarios
├─> Load testing
└─> Coverage target: Key scenarios

Layer 4: End-to-End Tests
├─> Real SDK calls with analytics
├─> Full system integration
├─> Performance benchmarks
└─> Monitoring validation
```

### 10.2 Test Cases

```javascript
// Unit Test: Extract Metrics - Success
test('extractMetricsFromSDK - success case', () => {
  const messages = [{
    type: 'result',
    usage: {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 200
    },
    modelUsage: {
      'claude-sonnet-4-20250514': {}
    }
  }];

  const metrics = writer.extractMetricsFromSDK(messages, 'session-123');

  expect(metrics).not.toBeNull();
  expect(metrics.inputTokens).toBe(1000);
  expect(metrics.outputTokens).toBe(500);
  expect(metrics.totalTokens).toBe(1500);
});

// Unit Test: Extract Metrics - No Result Messages
test('extractMetricsFromSDK - no result messages', () => {
  const messages = [{
    type: 'assistant',
    message: { content: 'hello' }
  }];

  const metrics = writer.extractMetricsFromSDK(messages, 'session-123');

  expect(metrics).toBeNull();
});

// Unit Test: Calculate Cost
test('calculateEstimatedCost - with cache', () => {
  const usage = {
    inputTokens: 1000,
    outputTokens: 500,
    cacheReadTokens: 200,
    cacheCreationTokens: 100
  };

  const cost = writer.calculateEstimatedCost(usage, 'claude-sonnet-4-20250514');

  // (1000 * 0.003 / 1000) + (500 * 0.015 / 1000) + (200 * 0.0003 / 1000) + (100 * 0.003 / 1000)
  // = 0.003 + 0.0075 + 0.00006 + 0.0003 = 0.01086
  expect(cost).toBeCloseTo(0.01086, 5);
});

// Integration Test: Full Write Flow
test('writeTokenMetrics - end to end', async () => {
  const messages = [createValidResultMessage()];
  const sessionId = 'test-session-' + Date.now();

  await writer.writeTokenMetrics(messages, sessionId);

  // Verify record in database
  const record = db.prepare('SELECT * FROM token_analytics WHERE sessionId = ?')
    .get(sessionId);

  expect(record).toBeDefined();
  expect(record.inputTokens).toBe(1000);
  expect(record.estimatedCost).toBeGreaterThan(0);
});

// API Test: Health Check
test('GET /analytics/health returns healthy status', async () => {
  const response = await request(app)
    .get('/api/claude-code/analytics/health');

  expect(response.status).toBe(200);
  expect(response.body.status).toBe('healthy');
  expect(response.body.checks.database.status).toBe('healthy');
});
```

---

## 11. Root Cause Analysis

### 11.1 Current Issue Diagnosis

Based on code analysis, the current analytics failure is likely due to:

**Issue 1: Message Structure Mismatch**
```
Expected: responses[0].messages (array of SDK messages)
Actual: responses (array) with messages property at different level

Code Location: claude-code-sdk.js:246
Current Code:
  const firstResponse = responses[0];
  const messages = firstResponse?.messages || [];

Problem: firstResponse IS the messages array wrapper
Solution: Need to verify actual response structure from SDK
```

**Issue 2: Missing Result Messages**
```
Expected: messages array contains { type: 'result', usage: {...} }
Actual: Result messages may not be in expected format

Code Location: TokenAnalyticsWriter.js:69
Current Code:
  const resultMessages = messages.filter(msg => msg.type === 'result');

Problem: If no result messages found, extraction returns null
Solution: Add better logging to see actual message types received
```

**Issue 3: Database Writer Not Initialized**
```
Expected: tokenAnalyticsWriter initialized with database
Actual: May be null if initialization failed

Code Location: claude-code-sdk.js:179
Current Code:
  tokenAnalyticsWriter = new TokenAnalyticsWriter(db);

Problem: If db is undefined/null, writer may not function
Solution: Add initialization validation and error handling
```

### 11.2 Debugging Recommendations

```javascript
// Add comprehensive debug logging in claude-code-sdk.js:243

console.log('🔍 [ANALYTICS DEBUG] Full responses structure:',
  JSON.stringify(responses, null, 2));

console.log('🔍 [ANALYTICS DEBUG] responses type:', typeof responses);
console.log('🔍 [ANALYTICS DEBUG] responses.length:', responses?.length);
console.log('🔍 [ANALYTICS DEBUG] responses[0] structure:',
  responses[0] ? Object.keys(responses[0]) : 'undefined');

if (responses && responses.length > 0) {
  const firstResponse = responses[0];
  console.log('🔍 [ANALYTICS DEBUG] firstResponse.messages:',
    firstResponse?.messages?.length || 'no messages property');

  // Try both approaches
  const messagesV1 = firstResponse?.messages || [];
  const messagesV2 = responses; // Maybe responses IS the messages array

  console.log('🔍 [ANALYTICS DEBUG] messagesV1 length:', messagesV1.length);
  console.log('🔍 [ANALYTICS DEBUG] messagesV2 length:', messagesV2.length);

  console.log('🔍 [ANALYTICS DEBUG] Message types in V1:',
    messagesV1.map(m => m.type));
  console.log('🔍 [ANALYTICS DEBUG] Message types in V2:',
    messagesV2.map(m => m.type));
}
```

---

## 12. Implementation Plan

### Phase 1: Diagnosis & Verification (1-2 hours)
```
1. Add comprehensive debug logging
   ├─> claude-code-sdk.js: Log full response structure
   ├─> TokenAnalyticsWriter.js: Log all extraction steps
   └─> Capture actual data structures

2. Test with real SDK call
   ├─> Trigger streaming-chat endpoint
   ├─> Examine logs
   ├─> Identify structure mismatch
   └─> Document findings

3. Verify database initialization
   ├─> Check initializeWithDatabase() call
   ├─> Verify db parameter passed
   ├─> Test manual write
   └─> Confirm schema exists
```

### Phase 2: Fix Implementation (2-3 hours)
```
1. Fix message extraction
   ├─> Correct response structure parsing
   ├─> Handle both message formats
   ├─> Add validation
   └─> Test extraction

2. Enhance error handling
   ├─> Add more validation checks
   ├─> Improve error messages
   ├─> Add recovery logic
   └─> Test edge cases

3. Add monitoring
   ├─> Implement health check endpoint
   ├─> Add success/failure counters
   ├─> Set up alerting
   └─> Test monitoring
```

### Phase 3: Testing & Validation (2-3 hours)
```
1. Unit tests
   ├─> Test all TokenAnalyticsWriter methods
   ├─> Test error conditions
   ├─> Test edge cases
   └─> Verify coverage > 90%

2. Integration tests
   ├─> Test full analytics flow
   ├─> Test with real SDK
   ├─> Verify database writes
   └─> Validate performance

3. Production validation
   ├─> Deploy to staging
   ├─> Monitor for 1 hour
   ├─> Verify analytics data
   └─> Deploy to production
```

### Phase 4: Documentation & Monitoring (1-2 hours)
```
1. Update documentation
   ├─> Document fix details
   ├─> Update architecture docs
   ├─> Create runbook
   └─> Update README

2. Set up monitoring
   ├─> Configure alerts
   ├─> Create dashboard
   ├─> Document metrics
   └─> Train team

3. Post-deployment review
   ├─> Monitor for 24 hours
   ├─> Review analytics data
   ├─> Validate performance
   └─> Document lessons learned
```

---

## 13. Success Criteria

### 13.1 Functional Requirements

```
✓ Analytics records written successfully for every SDK call
✓ No errors in TokenAnalyticsWriter execution
✓ Correct token counts extracted from SDK messages
✓ Accurate cost calculations including cache discounts
✓ Database records queryable by sessionId and timestamp
✓ Health check endpoint returns accurate status
✓ Client response time unaffected by analytics
```

### 13.2 Performance Requirements

```
✓ Analytics write time < 50ms (P95)
✓ Analytics write time < 100ms (P99)
✓ Zero impact on client response time
✓ Write success rate > 99%
✓ Database size growth < 10MB/month
```

### 13.3 Observability Requirements

```
✓ Comprehensive logging at each step
✓ Health check endpoint functional
✓ Success/failure metrics tracked
✓ Error rates monitored
✓ Cost tracking accurate
✓ Alerts configured for failures
```

---

## 14. Maintenance & Operations

### 14.1 Routine Maintenance

```
Daily
├─> Check error logs for analytics failures
├─> Verify write success rate > 99%
└─> Monitor database size growth

Weekly
├─> Review analytics data quality
├─> Check for anomalies
├─> Verify cost calculations
└─> Update documentation if needed

Monthly
├─> Analyze trends
├─> Optimize queries if needed
├─> Review retention policy
└─> Archive old data
```

### 14.2 Troubleshooting Guide

```
Symptom: No analytics records written
├─> Check: tokenAnalyticsWriter initialized?
├─> Check: Database connection healthy?
├─> Check: Logs show extraction errors?
├─> Action: Review debug logs, verify DB schema
└─> Escalate: If > 2 hours of failures

Symptom: Incorrect cost calculations
├─> Check: Pricing constants up to date?
├─> Check: Token extraction accurate?
├─> Check: Model name correct?
├─> Action: Verify pricing, update if needed
└─> Escalate: If recurring discrepancies

Symptom: High error rate
├─> Check: Recent code changes?
├─> Check: SDK version changes?
├─> Check: Database space available?
├─> Action: Review error logs, rollback if needed
└─> Escalate: If > 5% error rate persists

Symptom: Slow analytics writes
├─> Check: Database size?
├─> Check: Disk I/O?
├─> Check: Index performance?
├─> Action: VACUUM database, check indexes
└─> Escalate: If P95 > 100ms for > 1 hour
```

---

## 15. Future Enhancements

### 15.1 Short-term (1-3 months)

```
1. Enhanced Monitoring Dashboard
   ├─> Real-time analytics visualization
   ├─> Cost trends and forecasting
   ├─> Model usage comparison
   └─> Performance metrics

2. Automated Alerting
   ├─> Slack/email notifications
   ├─> Threshold-based alerts
   ├─> Anomaly detection
   └─> Cost budget warnings

3. Data Export & Reporting
   ├─> CSV/JSON export functionality
   ├─> Scheduled reports
   ├─> Custom date ranges
   └─> Aggregated analytics
```

### 15.2 Medium-term (3-6 months)

```
1. Advanced Analytics
   ├─> Token usage optimization recommendations
   ├─> Model performance comparison
   ├─> Session analysis
   └─> User behavior insights

2. Cost Optimization
   ├─> Automatic model selection
   ├─> Cache optimization strategies
   ├─> Prompt engineering suggestions
   └─> Budget enforcement

3. Scalability Improvements
   ├─> PostgreSQL migration option
   ├─> Read replicas for analytics
   ├─> Time-series database integration
   └─> Data warehousing
```

### 15.3 Long-term (6+ months)

```
1. AI-Powered Analytics
   ├─> Predictive cost modeling
   ├─> Automated optimization
   ├─> Intelligent alerting
   └─> Self-healing systems

2. Multi-tenant Support
   ├─> Per-user analytics
   ├─> Team-level tracking
   ├─> Billing integration
   └─> Usage quotas

3. Enterprise Features
   ├─> Compliance reporting
   ├─> Audit trails
   ├─> Advanced security
   └─> Custom integrations
```

---

## 16. Appendices

### Appendix A: File Locations

```
Core Files
├─> /workspaces/agent-feed/src/api/routes/claude-code-sdk.js
├─> /workspaces/agent-feed/src/services/TokenAnalyticsWriter.js
├─> /workspaces/agent-feed/src/services/ClaudeCodeSDKManager.js
└─> /workspaces/agent-feed/database.db

Configuration
├─> .env (environment variables)
└─> package.json (dependencies)

Documentation
├─> /workspaces/agent-feed/docs/SPARC-ANALYTICS-FIX-ARCHITECTURE.md
└─> /workspaces/agent-feed/README.md
```

### Appendix B: API Endpoints

```
Existing Endpoints
├─> POST /api/claude-code/streaming-chat
├─> POST /api/claude-code/background-task
├─> GET /api/claude-code/health
├─> GET /api/claude-code/status
├─> GET /api/claude-code/analytics
├─> GET /api/claude-code/cost-tracking
└─> GET /api/claude-code/token-usage

Proposed Endpoints
├─> GET /api/claude-code/analytics/health
└─> GET /api/claude-code/analytics/metrics
```

### Appendix C: Database Queries

```sql
-- Get analytics for session
SELECT * FROM token_analytics
WHERE sessionId = ?
ORDER BY timestamp DESC;

-- Get cost by model (24h)
SELECT
  model,
  SUM(estimatedCost) as totalCost,
  SUM(totalTokens) as totalTokens,
  COUNT(*) as requests
FROM token_analytics
WHERE timestamp > datetime('now', '-1 day')
GROUP BY model;

-- Get hourly usage
SELECT
  strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
  COUNT(*) as requests,
  SUM(totalTokens) as tokens,
  SUM(estimatedCost) as cost
FROM token_analytics
WHERE timestamp > datetime('now', '-1 day')
GROUP BY hour
ORDER BY hour DESC;

-- Check for write failures (no records in last hour)
SELECT
  COUNT(*) as recent_writes,
  MAX(timestamp) as last_write
FROM token_analytics
WHERE timestamp > datetime('now', '-1 hour');
```

### Appendix D: Environment Variables

```bash
# Database Configuration
DATABASE_PATH=/workspaces/agent-feed/database.db

# Analytics Configuration
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90
LOG_ANALYTICS_DEBUG=false

# Performance Configuration
ANALYTICS_WRITE_TIMEOUT=5000

# Monitoring Configuration
HEALTH_CHECK_ENABLED=true
ALERT_ERROR_THRESHOLD=0.05

# Logging Configuration
LOG_LEVEL=info
```

---

## Document Revision History

| Version | Date       | Author  | Changes                                    |
|---------|------------|---------|---------------------------------------------|
| 1.0.0   | 2025-10-25 | Claude  | Initial architecture document               |

---

## Conclusion

This architecture document provides a comprehensive blueprint for fixing the Claude Code SDK analytics data writing failure. The design emphasizes:

1. **Resilience**: Multi-layer error handling with graceful degradation
2. **Observability**: Comprehensive logging and monitoring at every step
3. **Performance**: Async analytics with zero impact on user experience
4. **Maintainability**: Clear component boundaries and responsibilities
5. **Scalability**: Future-proof design with migration paths

The architecture is production-ready and follows SPARC methodology best practices. Implementation can proceed with confidence following the defined phases and success criteria.

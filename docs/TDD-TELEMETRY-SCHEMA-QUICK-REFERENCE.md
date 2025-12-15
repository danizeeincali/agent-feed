# TDD Telemetry Schema - Quick Reference

## Run Tests
```bash
# Standard run
npm test -- tests/unit/telemetry-schema-tdd.test.js

# Verbose output
npm test -- tests/unit/telemetry-schema-tdd.test.js --verbose

# Coverage report
npm test -- tests/unit/telemetry-schema-tdd.test.js --coverage

# Watch mode
npm test -- tests/unit/telemetry-schema-tdd.test.js --watch
```

## Test Summary
- **Total Tests**: 30
- **Pass Rate**: 100%
- **Zero Mocks**: All real database operations
- **Target**: TelemetryService.js lines 88 (INSERT) and 129 (UPDATE)

## Test Categories
1. **Schema Validation** (8 tests) - PRIMARY KEY, NOT NULL, STRICT mode
2. **INSERT Operations** (5 tests) - Line 88, defaults, concurrent
3. **UPDATE Operations** (5 tests) - Line 129, all status values
4. **Index Performance** (3 tests) - Indexes and query speed
5. **Session Lifecycle** (3 tests) - Full workflows
6. **Data Integrity** (4 tests) - Edge cases, data types
7. **Aggregate Queries** (2 tests) - Reporting analytics

## Key Files
- **Test Suite**: `/workspaces/agent-feed/tests/unit/telemetry-schema-tdd.test.js`
- **Migration**: `/workspaces/agent-feed/api-server/db/migrations/019-session-metrics.sql`
- **Service**: `/workspaces/agent-feed/src/services/TelemetryService.js`
- **Full Report**: `/workspaces/agent-feed/docs/TDD-TELEMETRY-SCHEMA-TEST-REPORT.md`

## Expected Result
```
Test Suites: 1 passed, 1 total
Tests:       30 passed, 30 total
Time:        ~7 seconds
```

## Schema Tested
```sql
CREATE TABLE session_metrics (
  session_id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT,
  status TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost REAL DEFAULT 0.0,
  agent_count INTEGER DEFAULT 0,
  tool_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER
) STRICT;
```

## Status Values Tested
- `active` - Session in progress
- `completed` - Session finished successfully
- `failed` - Session ended with errors
- `timeout` - Session timed out

## Indexes Validated
- `idx_session_metrics_status`
- `idx_session_metrics_start_time`
- `idx_session_metrics_created_at`

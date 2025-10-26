# Claude Code SDK Analytics E2E Tests

## Overview

This directory contains comprehensive E2E tests for the Claude Code SDK Analytics system.

## Test File

**File:** `claude-code-sdk-analytics.spec.ts`
**Lines:** 182
**Size:** 5.6KB
**Framework:** Playwright + better-sqlite3

## Test Coverage

### 9 Comprehensive Tests

1. **Analytics API Returns Comprehensive Data**
   - Validates API endpoint functionality
   - Checks response structure
   - Verifies data completeness

2. **Database Has Analytics Records**
   - Confirms record persistence
   - Validates minimum record count (350+)

3. **Recent Analytics Records Exist**
   - Checks for activity in last 24 hours
   - Validates real-time tracking

4. **Latest Record Has Valid Structure**
   - Verifies all required fields
   - Validates data types
   - Checks value ranges

5. **Database Schema Has All Required Columns**
   - Confirms 13 required columns
   - Validates schema structure

6. **Database Has Performance Indexes**
   - Checks for optimization indexes
   - Validates query performance

7. **Cost Calculations Are Accurate**
   - Verifies token math
   - Validates cost ranges
   - Checks model-specific pricing

8. **Multiple Sessions Tracked Separately**
   - Confirms session isolation
   - Validates multi-session support

9. **Timestamp Format is Valid ISO 8601**
   - Checks timestamp format
   - Validates date parsing

## Running the Tests

### Run All Analytics Tests
```bash
npx playwright test tests/e2e/claude-code-sdk-analytics.spec.ts --reporter=list
```

### Run with Debug Output
```bash
DEBUG=pw:api npx playwright test tests/e2e/claude-code-sdk-analytics.spec.ts
```

### Run Specific Test
```bash
npx playwright test tests/e2e/claude-code-sdk-analytics.spec.ts -g "Analytics API"
```

## Prerequisites

1. **API Server Running**
   ```bash
   cd api-server
   npm start
   ```
   Server must be running on http://localhost:3001

2. **Database Exists**
   - Database file: `/workspaces/agent-feed/database.db`
   - Table: `token_analytics`
   - Minimum records: 350+

3. **Dependencies Installed**
   ```bash
   npm install @playwright/test better-sqlite3
   ```

## Test Results

### Latest Run (Oct 25, 2025)

- **Status:** ✅ All 9 tests PASSED
- **Execution Time:** 2.3 seconds
- **Records Validated:** 352
- **Sessions Tracked:** 336
- **Total Cost:** $31.36
- **Total Tokens:** 132,612

### Performance Benchmarks

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| API Response | <500ms | 357-369ms | ✅ Fast |
| DB Queries | <100ms | 3-69ms | ✅ Very Fast |
| Total Suite | <5s | 2.3s | ✅ Excellent |

## Database Schema

The tests validate the following schema:

```sql
CREATE TABLE token_analytics (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  sessionId TEXT NOT NULL,
  operation TEXT,
  inputTokens INTEGER NOT NULL,
  outputTokens INTEGER NOT NULL,
  totalTokens INTEGER NOT NULL,
  estimatedCost REAL NOT NULL,
  model TEXT NOT NULL,
  userId TEXT,
  created_at TEXT,
  message_content TEXT,
  response_content TEXT
);

-- Indexes
CREATE INDEX idx_analytics_session ON token_analytics(sessionId);
CREATE INDEX idx_analytics_timestamp ON token_analytics(timestamp);
```

## Validation Criteria

### Data Integrity
- All required fields present
- Correct data types
- Positive values for tokens and costs
- Valid UUID format for IDs
- ISO 8601 timestamp format

### Cost Calculations
- Total tokens = input + output
- Cost range: $0.01 - $100
- Model-specific pricing applied
- Currency precision maintained

### Performance
- API response < 500ms
- Database queries < 100ms
- Test suite < 5 seconds

## Troubleshooting

### Test Failures

**Issue:** "Analytics API returns 500"
- Check if API server is running
- Verify database exists and is accessible

**Issue:** "Database has less than 350 records"
- Generate more analytics data
- Check database file path

**Issue:** "Timestamp format invalid"
- Verify database schema
- Check timestamp generation in SDK

### Debug Mode

Enable verbose logging:
```bash
DEBUG=* npx playwright test tests/e2e/claude-code-sdk-analytics.spec.ts
```

## Reports

After running tests, detailed reports are generated:

1. **Full Report:** `/workspaces/agent-feed/ANALYTICS-E2E-TEST-RESULTS.md`
2. **Quick Summary:** `/workspaces/agent-feed/ANALYTICS-E2E-QUICK-SUMMARY.md`

## Integration

These tests integrate with:
- Playwright test framework
- better-sqlite3 for database access
- Claude Code SDK Analytics API

## Maintenance

### Adding New Tests

1. Add test case to `claude-code-sdk-analytics.spec.ts`
2. Follow existing test structure
3. Update this README with new test description
4. Run full suite to verify

### Updating Validation Criteria

1. Update expected values in test assertions
2. Document changes in test report
3. Verify all tests still pass

## Production Deployment

Before deploying to production:

1. Run full test suite: `npx playwright test tests/e2e/claude-code-sdk-analytics.spec.ts`
2. Verify all 9 tests pass
3. Check performance metrics meet benchmarks
4. Review test report for any warnings
5. Confirm database has minimum 350 records

## License

Part of the Agent Feed project.

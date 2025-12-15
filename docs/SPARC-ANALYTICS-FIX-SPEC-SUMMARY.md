# SPARC Analytics Fix Specification - Executive Summary

**Document:** SPEC-ANALYTICS-FIX-001
**Created:** 2025-10-25
**Status:** Ready for Implementation
**Priority:** High
**Estimated Effort:** 20-30 hours

---

## Quick Overview

**Problem:** Analytics stopped writing data 4 days ago (last write: October 21, 2025)
**Root Cause:** `writeTokenMetrics()` silently failing - likely SDK response structure change
**Solution:** Enhanced error logging, resilient parsing, comprehensive testing
**Impact:** Critical for cost tracking, budget management, performance monitoring

---

## Specification Summary

### Total Requirements: 38

| Category | Count | Critical | High | Medium |
|----------|-------|----------|------|--------|
| **Functional Requirements (FR)** | 10 | 4 | 5 | 1 |
| **Non-Functional Requirements (NFR)** | 8 | 3 | 3 | 2 |
| **Technical Requirements** | 5 | 2 | 2 | 1 |
| **Edge Cases** | 9 | 3 | 4 | 2 |
| **Test Cases** | 6 | 3 | 2 | 1 |

**Total:** 38 requirements across 5 categories

---

## Critical Success Criteria (Must Pass)

### 1. Analytics Write on Every Request (FR-001)
- ✅ Write analytics record on every `/streaming-chat` request
- ✅ Success rate ≥ 99.9%
- ✅ Analytics writes within 100ms
- ✅ Never blocks API responses

### 2. Data Visibility (Primary Goal)
- ✅ New records appearing in database
- ✅ Latest record < 5 minutes old
- ✅ `/api/claude-code/analytics` shows live data
- ✅ Zero errors in logs

### 3. Performance (NFR-001)
- ✅ p95 write latency < 50ms
- ✅ p99 write latency < 100ms
- ✅ No impact on API response time

### 4. Observability (FR-003)
- ✅ Success logs: `✅ [ANALYTICS SUCCESS]`
- ✅ Error logs: `❌ [ANALYTICS ERROR]`
- ✅ Full context (sessionId, tokens, cost, errors)

### 5. Backward Compatibility (NFR-005)
- ✅ Preserve 350 historical records
- ✅ No schema changes
- ✅ APIs return both old and new data

### 6. Security (NFR-004)
- ✅ No message content in logs
- ✅ Only metadata logged
- ✅ No sensitive data exposure

### 7. Testing (Required)
- ✅ Unit test coverage ≥ 90%
- ✅ All integration tests pass
- ✅ Manual database write test passes
- ✅ Real API request test passes

### 8. Production Validation (24 hours)
- ✅ Write success rate ≥ 99.9%
- ✅ No analytics errors
- ✅ Health check reports healthy
- ✅ Dashboard shows recent data

---

## Key Functional Requirements

### FR-001: Analytics Write on Every Request (CRITICAL)
Every successful API request MUST write analytics to database.

**Acceptance:**
- Analytics written within 100ms
- Success rate ≥ 99.9%
- Non-blocking async writes

### FR-003: Comprehensive Error Logging (HIGH)
All failures MUST be logged with full context.

**Acceptance:**
- Log entry on every write (success/failure)
- Error includes: message, stack, context
- Differentiate extraction vs. write failures

### FR-005: Resilient Response Parsing (CRITICAL)
Parse SDK responses gracefully, handle format changes.

**Acceptance:**
- Validate structure before extraction
- Handle missing fields with defaults
- Log structure when extraction fails

### FR-006: Manual Database Write Test (HIGH)
Support manual test to verify database writable.

**Acceptance:**
- Test script provided
- Verifies write permissions
- Tests with realistic data

### FR-010: Analytics Health Check (MEDIUM)
Health check endpoint for monitoring.

**Acceptance:**
- Endpoint: `GET /api/claude-code/analytics/health`
- Returns last write timestamp
- Indicates healthy if last write < 1 hour

---

## Key Non-Functional Requirements

### NFR-001: Performance - Write Latency (HIGH)
Analytics writes MUST complete in < 50ms (p95).

**Acceptance:**
- p50 < 20ms
- p95 < 50ms
- p99 < 100ms

### NFR-002: Reliability - Success Rate (CRITICAL)
Write success rate MUST be ≥ 99.9%.

**Acceptance:**
- Measured over 24-hour windows
- Transient errors retried
- Alert if < 95%

### NFR-003: Observability - Debug Logging (HIGH)
Detailed debug logging for troubleshooting.

**Acceptance:**
- INFO for success, ERROR for failures
- Structured logging (JSON compatible)
- Logs retained ≥ 30 days

### NFR-004: Security - No Sensitive Data (CRITICAL)
Analytics logs MUST NOT contain sensitive data.

**Acceptance:**
- Message content excluded
- Response content excluded
- Only metadata logged

---

## Critical Edge Cases

### 1. Empty Messages Array
**Condition:** SDK returns empty array
**Expected:** Skip write, log warning

### 2. Malformed Response Structure
**Condition:** Missing required fields
**Expected:** Log detailed structure, skip write

### 3. Database Locked (SQLITE_LOCKED)
**Condition:** Database locked by another process
**Expected:** Retry 3 times with exponential backoff

### 4. Database Read-Only (SQLITE_READONLY)
**Condition:** Permission error
**Expected:** Log error, skip write, no retry

### 5. Concurrent Writes
**Condition:** Multiple requests writing simultaneously
**Expected:** SQLite handles locking, may trigger retries

---

## Testing Strategy Summary

### Phase 1: Pre-Implementation Tests
1. ✅ Manual database write test
2. ✅ Real API request test
3. ✅ Log analysis

### Phase 2: Unit Tests (TDD)
- Write tests for all methods
- Code coverage ≥ 90%
- All error paths tested

**Files:**
- `api-server/tests/unit/token-analytics-writer.test.js`

### Phase 3: Integration Tests
- End-to-end API → analytics write
- Error handling scenarios
- Concurrent request handling
- Performance benchmarks

**Files:**
- `api-server/tests/integration/analytics-write-flow.test.js`

### Phase 4: Manual Validation
- Manual database write script
- Real API request script
- Log verification

**Files:**
- `api-server/tests/manual/test-database-write.js`
- `api-server/tests/manual/test-real-api-request.sh`

### Phase 5: Production Validation
- Monitor health check endpoint
- Verify write success rate
- Check analytics dashboard
- Monitor for 24 hours

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review investigation report
- [ ] Understand current code flow
- [ ] Identify exact failure point
- [ ] Plan fix approach

### Implementation
- [ ] Add enhanced debug logging to `claude-code-sdk.js`
- [ ] Add response structure validation
- [ ] Improve error handling in `TokenAnalyticsWriter.js`
- [ ] Add retry logic for transient errors
- [ ] Implement health check endpoint
- [ ] Update documentation

### Testing
- [ ] Write unit tests (coverage ≥ 90%)
- [ ] Write integration tests
- [ ] Create manual test scripts
- [ ] Run all tests and verify passing
- [ ] Performance benchmarks

### Deployment
- [ ] Code review completed
- [ ] Merge to development branch
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Deploy to production
- [ ] Monitor for 24 hours

### Validation
- [ ] New records appearing in database
- [ ] Timestamps current (< 5 minutes)
- [ ] Success logs in server output
- [ ] No error logs
- [ ] Analytics API shows live data
- [ ] Health check reports healthy

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **New Records** | 100% of requests | Database query |
| **Last Write** | < 5 minutes old | Health check |
| **Success Rate** | ≥ 99.9% | Log analysis |
| **Error Rate** | 0 errors/hour | Log monitoring |
| **Test Pass Rate** | 100% | CI/CD pipeline |
| **Code Coverage** | ≥ 90% | Coverage report |
| **Response Time** | Unchanged | Performance monitoring |
| **Data Integrity** | 350 records | Database query |

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **SDK format changed** | High | High | Validate structure, log failures |
| **Database lock contention** | Medium | Medium | Retry logic with backoff |
| **Performance degradation** | Low | High | Async writes, benchmarks |
| **Data loss** | Low | Critical | Preserve historical data, backups |
| **Silent failures persist** | Medium | High | Comprehensive logging, monitoring |

---

## Files Modified

| File | Path | Changes |
|------|------|---------|
| **API Route** | `/workspaces/agent-feed/src/api/routes/claude-code-sdk.js` | Enhanced logging, validation |
| **Writer Service** | `/workspaces/agent-feed/src/services/TokenAnalyticsWriter.js` | Error handling, retry logic |
| **Unit Tests** | `/workspaces/agent-feed/api-server/tests/unit/token-analytics-writer.test.js` | New file |
| **Integration Tests** | `/workspaces/agent-feed/api-server/tests/integration/analytics-write-flow.test.js` | New file |
| **Manual Test** | `/workspaces/agent-feed/api-server/tests/manual/test-database-write.js` | New file |

---

## Quick Reference

### Database Schema
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

### Key Endpoints
- Analytics: `GET /api/claude-code/analytics`
- Token Usage: `GET /api/claude-code/token-usage`
- Cost Tracking: `GET /api/claude-code/cost-tracking`
- Health Check: `GET /api/claude-code/analytics/health` (NEW)

### Log Prefixes
- Success: `✅ [ANALYTICS SUCCESS]`
- Warning: `⚠️ [ANALYTICS SKIP]`
- Error: `❌ [ANALYTICS ERROR]`
- Debug: `🔍 [ANALYTICS DEBUG]`

### Test Commands
```bash
# Manual database write test
node api-server/tests/manual/test-database-write.js

# Real API request test
bash api-server/tests/manual/test-real-api-request.sh

# Unit tests
npm test -- token-analytics-writer

# Integration tests
npm test -- analytics-write-flow

# Check recent analytics
sqlite3 database.db "SELECT * FROM token_analytics ORDER BY timestamp DESC LIMIT 5;"

# Check analytics health
curl http://localhost:3001/api/claude-code/analytics/health
```

---

## Next Steps

1. **Review Specification** (30 minutes)
   - Read full specification document
   - Clarify any questions
   - Get stakeholder approval

2. **Implementation Planning** (1 hour)
   - Break down into tasks
   - Estimate time for each task
   - Create implementation timeline

3. **Start Implementation** (2-3 days)
   - Follow TDD approach
   - Write tests first
   - Implement fixes
   - Verify all tests pass

4. **Testing & Validation** (1 day)
   - Run all test suites
   - Manual validation
   - Performance benchmarks
   - Code review

5. **Deployment** (1 day)
   - Deploy to staging
   - Smoke tests
   - Deploy to production
   - Monitor for 24 hours

**Total Estimated Time:** 5-7 business days

---

## Contact & Support

**Specification Owner:** Engineering Team
**Technical Lead:** TBD
**Code Reviewer:** TBD

**Questions?** Review full specification:
`/workspaces/agent-feed/docs/SPARC-ANALYTICS-FIX-SPEC.md`

---

**END OF SUMMARY**

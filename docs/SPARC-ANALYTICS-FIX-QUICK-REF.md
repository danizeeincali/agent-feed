# Analytics Fix - Quick Reference Card

**Status:** Ready for Implementation
**Priority:** HIGH
**Estimated Effort:** 20-30 hours

---

## Problem

- Analytics stopped writing 4 days ago (last: Oct 21, 2025)
- `writeTokenMetrics()` silently failing
- 350 historical records, 0 new records in 24 hours

---

## Critical Requirements (Top 8)

### 1. FR-001: Write on Every Request
- Analytics MUST write on every `/streaming-chat` request
- Success rate ≥ 99.9%
- Non-blocking async writes

### 2. FR-003: Comprehensive Error Logging
- Log every write attempt (success/failure)
- Include: sessionId, tokens, cost, error stack
- Differentiate extraction vs. write failures

### 3. FR-005: Resilient Response Parsing
- Validate SDK response structure
- Handle format changes gracefully
- Log structure when extraction fails

### 4. NFR-001: Performance
- p95 write latency < 50ms
- p99 write latency < 100ms
- No impact on API response time

### 5. NFR-002: Reliability
- Write success rate ≥ 99.9%
- Retry transient errors (3x with backoff)
- Graceful degradation

### 6. NFR-003: Observability
- Structured logging format
- Searchable by timestamp/session/error
- Logs retained ≥ 30 days

### 7. NFR-004: Security
- NO message content in logs
- NO response content in logs
- Only metadata (tokens, cost, model)

### 8. NFR-005: Backward Compatibility
- Preserve 350 historical records
- No schema changes
- APIs return old + new data

---

## Success Criteria

| Metric | Target | How to Verify |
|--------|--------|---------------|
| New records | 100% of requests | `SELECT COUNT(*) FROM token_analytics WHERE timestamp > datetime('now', '-1 hour');` |
| Last write | < 5 min old | `curl http://localhost:3001/api/claude-code/analytics/health` |
| Success rate | ≥ 99.9% | `grep "ANALYTICS SUCCESS" logs/combined.log \| wc -l` |
| Error rate | 0 errors/hour | `grep "ANALYTICS ERROR" logs/error.log` |
| Test coverage | ≥ 90% | `npm test -- --coverage` |
| API response | Unchanged | Performance monitoring |

---

## Key Edge Cases

1. **Empty messages array** → Skip, log warning
2. **Malformed response** → Log structure, skip
3. **Database locked** → Retry 3x with backoff
4. **Database read-only** → Log error, skip, no retry
5. **Invalid token counts** → Default to 0, log warning
6. **Missing session ID** → Generate fallback, log warning
7. **Unknown model** → Use default pricing, log warning
8. **Concurrent writes** → SQLite handles, may retry
9. **No result messages** → Skip, log structure

---

## Testing Checklist

### Pre-Implementation
- [ ] Manual database write test passes
- [ ] Real API request test passes
- [ ] Understand current failure mode

### Unit Tests (≥ 90% coverage)
- [ ] `extractMetricsFromSDK()` - all cases
- [ ] `calculateEstimatedCost()` - all cases
- [ ] `writeToDatabase()` - success & errors
- [ ] `writeTokenMetrics()` - full flow
- [ ] All edge cases covered

### Integration Tests
- [ ] End-to-end API → database write
- [ ] Error handling scenarios
- [ ] Concurrent request handling
- [ ] Performance benchmarks (p95 < 50ms)

### Manual Validation
- [ ] Database write script works
- [ ] Real API request creates record
- [ ] Success logs visible
- [ ] Health check endpoint functional

### Production Validation (24 hours)
- [ ] New records appearing
- [ ] Write success rate ≥ 99.9%
- [ ] No analytics errors
- [ ] Dashboard shows live data

---

## Quick Commands

### Verify Database Writable
```bash
sqlite3 database.db "INSERT INTO token_analytics (id, timestamp, sessionId, operation, model, inputTokens, outputTokens, totalTokens, estimatedCost) VALUES ('test-$(date +%s)', datetime('now'), 'test', 'test', 'test', 10, 20, 30, 0.001);"
```

### Check Recent Records
```bash
sqlite3 database.db "SELECT timestamp, sessionId, totalTokens, estimatedCost FROM token_analytics ORDER BY timestamp DESC LIMIT 5;"
```

### Check Last Write Time
```bash
sqlite3 database.db "SELECT MAX(timestamp) as last_write, COUNT(*) as total FROM token_analytics;"
```

### Monitor Analytics Logs
```bash
tail -f logs/combined.log | grep -E "ANALYTICS|Token analytics"
```

### Test API Request
```bash
curl -X POST http://localhost:3001/api/claude-code/streaming-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Test analytics", "sessionId": "test-'$(date +%s)'"}'
```

### Check Health Endpoint
```bash
curl http://localhost:3001/api/claude-code/analytics/health | jq
```

### Run Unit Tests
```bash
npm test -- token-analytics-writer --coverage
```

### Run Integration Tests
```bash
npm test -- analytics-write-flow
```

---

## Log Formats

### Success
```javascript
✅ [ANALYTICS SUCCESS] Written: {
  id: 'uuid-123',
  sessionId: 'session-456',
  totalTokens: 1500,
  estimatedCost: 0.045,
  timestamp: '2025-10-25T18:00:00.000Z'
}
```

### Warning
```javascript
⚠️ [ANALYTICS SKIP] No messages in response
⚠️ [ANALYTICS DEBUG] Response structure: { ... }
```

### Error
```javascript
❌ [ANALYTICS ERROR] Write failed: SQLITE_LOCKED
❌ [ANALYTICS ERROR] Stack: Error: SQLITE_LOCKED at ...
❌ [ANALYTICS ERROR] Metrics: { sessionId: '...', ... }
```

---

## Files to Modify

| File | Lines | Changes |
|------|-------|---------|
| `src/api/routes/claude-code-sdk.js` | 243-269 | Enhanced logging, validation |
| `src/services/TokenAnalyticsWriter.js` | Full file | Error handling, retry logic |

## New Files to Create

| File | Purpose |
|------|---------|
| `api-server/tests/unit/token-analytics-writer.test.js` | Unit tests |
| `api-server/tests/integration/analytics-write-flow.test.js` | Integration tests |
| `api-server/tests/manual/test-database-write.js` | Manual DB test |
| `api-server/tests/manual/test-real-api-request.sh` | Manual API test |

---

## Implementation Steps

1. **Add Debug Logging** (30 min)
   - Enhanced logs in `claude-code-sdk.js`
   - Log response structure
   - Log validation results

2. **Add Response Validation** (1 hour)
   - Check `responses` array
   - Check `messages` array
   - Check `usage` and `modelUsage` fields
   - Log structure when invalid

3. **Improve Error Handling** (2 hours)
   - Retry logic for SQLITE_LOCKED
   - No retry for SQLITE_READONLY
   - Log all error conditions
   - Never throw to caller

4. **Add Health Check** (1 hour)
   - New endpoint: `/analytics/health`
   - Return last write timestamp
   - Return status (healthy/degraded/critical)

5. **Write Tests** (4-6 hours)
   - Unit tests for all methods
   - Integration tests for full flow
   - Manual test scripts
   - Verify ≥ 90% coverage

6. **Deploy & Validate** (1-2 days)
   - Deploy to staging
   - Smoke tests
   - Deploy to production
   - Monitor for 24 hours

---

## Rollback Plan

If analytics fix causes issues:

```bash
# 1. Immediate rollback
git revert HEAD
git push
pm2 restart api-server

# 2. Disable analytics (emergency)
# Comment out analytics code in claude-code-sdk.js

# 3. Restore database
cp database.db.backup database.db

# 4. Verify recovery
curl http://localhost:3001/api/claude-code/health
```

---

## Health Check Response

```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "writerInitialized": true,
    "lastWrite": "2025-10-25T18:30:00.000Z",
    "timeSinceLastWrite": "2 minutes ago",
    "totalRecords": 351
  },
  "recommendations": [
    "Analytics system operating normally"
  ]
}
```

**Status Values:**
- `healthy` - Last write < 2 hours
- `degraded` - Last write 2-24 hours
- `unhealthy` - Last write 1-2 days
- `critical` - Last write > 2 days
- `not_initialized` - Writer not initialized
- `error` - Database error

---

## Troubleshooting

### No records being written?
1. Check database writable: `ls -l database.db` (should be `-rw-r--r--`)
2. Run manual write test: `node api-server/tests/manual/test-database-write.js`
3. Check logs: `grep ANALYTICS logs/combined.log | tail -20`
4. Verify endpoint called: `grep "streaming-chat" logs/combined.log | tail -10`

### Intermittent failures?
1. Check for lock errors: `grep "SQLITE_LOCKED" logs/error.log`
2. Check concurrent requests: `grep "streaming-chat" logs/combined.log | wc -l`
3. Verify retry logic: `grep "Retry" logs/combined.log`

### Invalid data in records?
1. Check SDK response: `grep "Result message structure" logs/combined.log`
2. Verify token counts: `SELECT * FROM token_analytics WHERE inputTokens < 0;`
3. Check cost calculations: `SELECT * FROM token_analytics WHERE estimatedCost <= 0;`

---

## Contact

**Full Specification:** `/workspaces/agent-feed/docs/SPARC-ANALYTICS-FIX-SPEC.md`
**Summary:** `/workspaces/agent-feed/docs/SPARC-ANALYTICS-FIX-SPEC-SUMMARY.md`

---

**Last Updated:** 2025-10-25

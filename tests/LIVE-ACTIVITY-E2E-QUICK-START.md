# Live Activity E2E Tests - Quick Start Guide

## 1-Minute Setup

### Prerequisites Check
```bash
# Check if servers are running
curl http://localhost:3001/health  # API server
curl http://localhost:5173         # Frontend

# Check database
ls -lh database.db
```

### Run Tests
```bash
# Single command to run all tests
./tests/run-live-activity-e2e.sh
```

## What Gets Tested

✅ **12 comprehensive tests** covering:
- Agent execution capture
- Tool usage tracking
- Session metrics aggregation
- Priority filtering
- Error handling
- SSE connection status
- Event ordering
- Database schema validation
- Analytics API endpoints
- Cost tracking accuracy
- Real-time broadcasting
- System health checks

## Expected Output

### Console Output
```
🧪 Running Enhanced Live Activity E2E Tests
=============================================

✅ API server is running on port 3001
✅ Frontend server is running on port 5173
✅ Database file found

🚀 Starting E2E test execution...

Running 12 tests using 1 worker

  ✓ Test 1: Should capture and display agent started event (5s)
  ✓ Test 2: Should capture tool execution with duration (6s)
  ✓ Test 3: Should display session metrics in real-time (8s)
  ✓ Test 4: Should filter events by priority (2s)
  ✓ Test 5: Should show error status for failed operations (3s)
  ✓ Test 6: Should verify SSE connection status (3s)
  ✓ Test 7: Should display events in chronological order (2s)
  ✓ Test 8: Should verify database schema for telemetry tables (2s)
  ✓ Test 9: Should verify analytics API endpoints (2s)
  ✓ Test 10: Should verify cost tracking and token usage (5s)
  ✓ Test 11: Should verify real-time SSE broadcasting (6s)
  ✓ Test 12: Should verify analytics health endpoint (2s)

  12 passed (46s)

✅ All E2E tests passed!

📸 Screenshots saved to: tests/screenshots/live-activity/
```

### Generated Artifacts

**12 Screenshots:**
```
tests/screenshots/live-activity/
├── 01-agent-started-event.png
├── 02-tool-execution.png
├── 03-session-metrics.png
├── 04-filtered-high-priority.png
├── 05-error-handling.png
├── 06-sse-connection.png
├── 07-chronological-order.png
├── 08-database-schema-verified.png
├── 09-analytics-api-verified.png
├── 10-cost-tracking-verified.png
├── 11a-sse-broadcast-page1.png
├── 11b-sse-broadcast-page2.png
└── 12-health-check-verified.png
```

**Test Reports:**
```bash
# Interactive HTML report
npx playwright show-report

# JSON results
cat tests/e2e/results/test-results.json

# JUnit XML (for CI/CD)
cat tests/e2e/results/junit.xml
```

## Database Verification

Tests verify these analytics records:

```sql
-- View recent test analytics
SELECT
  sessionId,
  inputTokens,
  outputTokens,
  totalTokens,
  estimatedCost,
  model,
  created_at
FROM token_analytics
WHERE sessionId LIKE 'e2e-%'
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Test Failures

**API Server Not Running:**
```bash
cd api-server
npm run dev
```

**Frontend Not Running:**
```bash
cd frontend
npm run dev
```

**Database Missing:**
```bash
# Check database exists
ls -lh database.db

# Verify tables exist
sqlite3 database.db ".tables"
```

### Common Issues

| Error | Solution |
|-------|----------|
| `ECONNREFUSED` | Start API server on port 3001 |
| `net::ERR_CONNECTION_REFUSED` | Start frontend on port 5173 |
| `SQLITE_CANTOPEN` | Database file missing or wrong path |
| `Table doesn't exist` | Run database migrations |

## Running Individual Tests

```bash
# Run single test
npx playwright test tests/e2e/live-activity-enhancement.spec.ts -g "Test 1"

# Run with headed browser (visible)
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --headed

# Run with debug mode
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --debug

# Run with UI mode (interactive)
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --ui
```

## Success Criteria

✅ All 12 tests pass
✅ 12+ screenshots captured
✅ Database records created
✅ No console errors
✅ Cost tracking accurate
✅ Real-time updates working

## Next Steps

1. **Review Screenshots**: Check `tests/screenshots/live-activity/`
2. **View Reports**: Run `npx playwright show-report`
3. **Verify Database**: Query `token_analytics` table
4. **Check API Health**: `curl http://localhost:3001/api/claude-code/analytics/health`

## Integration with CI/CD

```yaml
# GitHub Actions example
- name: E2E Tests
  run: |
    npm run dev &
    cd api-server && npm run dev &
    sleep 10
    ./tests/run-live-activity-e2e.sh
```

## Performance

- **Total Runtime**: ~46 seconds
- **Per Test**: 2-8 seconds
- **Screenshot Generation**: <2s each
- **Database Queries**: <100ms each

## Documentation

- [Full Test Suite README](./e2e/LIVE-ACTIVITY-E2E-TEST-README.md)
- [Test Specification](./e2e/live-activity-enhancement.spec.ts)
- [Architecture Diagram](../docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md)

---

**Ready to run?**
```bash
./tests/run-live-activity-e2e.sh
```

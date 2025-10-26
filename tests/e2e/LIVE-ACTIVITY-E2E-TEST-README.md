# Enhanced Live Activity System - E2E Test Suite

## Overview

Comprehensive end-to-end tests validating the complete telemetry pipeline from SDK execution through database storage to real-time frontend display.

## Test Coverage

### 12 Comprehensive Tests

| Test # | Name | Purpose | Verification |
|--------|------|---------|--------------|
| 1 | Agent Started Event | Verify agent execution is captured | Database + UI |
| 2 | Tool Execution Capture | Verify tool usage and duration | Database analytics |
| 3 | Session Metrics | Multiple requests tracking | Session aggregation |
| 4 | Priority Filtering | Filter UI by priority | Frontend filters |
| 5 | Error Handling | Failed operations tracking | Error status |
| 6 | SSE Connection | Real-time connection status | Connection indicator |
| 7 | Chronological Order | Event ordering | UI timestamp display |
| 8 | Database Schema | Telemetry tables exist | Schema validation |
| 9 | Analytics API | API endpoints responding | API integration |
| 10 | Cost Tracking | Token usage and costs | Cost calculations |
| 11 | SSE Broadcasting | Multi-client updates | Real-time sync |
| 12 | Health Check | System health status | Health endpoint |

## Pipeline Validation

```
┌─────────────────┐
│ Claude Code SDK │
│   API Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Token Analytics │
│     Writer      │ ✅ Test 1, 2, 10
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │
│ token_analytics │ ✅ Test 8
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  SSE Broadcast  │ ✅ Test 6, 11
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend UI    │ ✅ Test 3, 4, 7
│ Live Activity   │
└─────────────────┘
```

## Prerequisites

### 1. Running Servers

```bash
# Terminal 1: API Server
cd api-server
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 2. Database

- Database file: `database.db` must exist
- Table: `token_analytics` must be created
- Migrations: All migrations applied

### 3. Environment

```bash
# Default URLs (can override)
API_BASE_URL=http://localhost:3001
FRONTEND_BASE_URL=http://localhost:5173
```

## Running Tests

### Quick Start

```bash
# Run all tests with one command
./tests/run-live-activity-e2e.sh
```

### Manual Execution

```bash
# Run with Playwright directly
npx playwright test tests/e2e/live-activity-enhancement.spec.ts

# Run with UI mode
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --ui

# Run with headed browser
npx playwright test tests/e2e/live-activity-enhancement.spec.ts --headed

# Run single test
npx playwright test tests/e2e/live-activity-enhancement.spec.ts -g "Test 1"
```

## Test Outputs

### 1. Screenshots (12 total)

All saved to: `tests/screenshots/live-activity/`

```
01-agent-started-event.png       - Agent execution captured
02-tool-execution.png            - Tool usage tracking
03-session-metrics.png           - Session aggregation
04-filtered-high-priority.png    - Priority filtering
05-error-handling.png            - Error states
06-sse-connection.png            - SSE status
07-chronological-order.png       - Event ordering
08-database-schema-verified.png  - Schema validation
09-analytics-api-verified.png    - API integration
10-cost-tracking-verified.png    - Cost calculations
11a-sse-broadcast-page1.png      - Multi-client page 1
11b-sse-broadcast-page2.png      - Multi-client page 2
12-health-check-verified.png     - Health status
```

### 2. Test Reports

```bash
# HTML report (interactive)
npx playwright show-report

# JSON report
cat tests/e2e/results/test-results.json

# JUnit XML
cat tests/e2e/results/junit.xml
```

### 3. Console Output

Each test logs detailed verification:
- Database records captured
- Token counts and costs
- Session metrics
- API responses
- UI state changes

## Test Strategy

### Real Data Only (No Mocks)

✅ **Real API calls** to Claude Code SDK
✅ **Real database** reads and writes
✅ **Real browser** automation
✅ **Real SSE** connections
✅ **Real screenshots** as evidence

❌ **No mocked responses**
❌ **No fake data**
❌ **No simulated events**

### Verification Approach

1. **Arrange**: Setup test conditions
2. **Act**: Trigger real SDK requests
3. **Assert**: Verify database + UI updates
4. **Evidence**: Screenshot proof

## Database Verification

### Token Analytics Table

```sql
-- Verify record structure
SELECT
  id,
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

### Session Aggregation

```sql
-- Verify session grouping
SELECT
  sessionId,
  COUNT(*) as request_count,
  SUM(totalTokens) as total_tokens,
  SUM(estimatedCost) as total_cost
FROM token_analytics
WHERE sessionId LIKE 'e2e-metrics-%'
GROUP BY sessionId;
```

## API Endpoints Tested

### Claude Code SDK
- `POST /api/claude-code/streaming-chat`

### Analytics
- `GET /api/claude-code/analytics?timeRange=24h`
- `GET /api/claude-code/analytics/health`
- `GET /api/claude-code/cost-tracking?timeRange=1h`

## Troubleshooting

### Tests Failing?

1. **Check servers are running**
   ```bash
   curl http://localhost:3001/health
   curl http://localhost:5173
   ```

2. **Check database exists**
   ```bash
   ls -lh database.db
   sqlite3 database.db ".tables"
   ```

3. **Check API key (if required)**
   ```bash
   echo $ANTHROPIC_API_KEY
   ```

4. **View detailed logs**
   ```bash
   npx playwright test --debug
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| "API server not running" | Start: `cd api-server && npm run dev` |
| "Frontend not running" | Start: `cd frontend && npm run dev` |
| "Database not found" | Check `database.db` exists in root |
| "No analytics records" | Verify migrations ran successfully |
| "SSE not connecting" | Check CORS settings in API server |

## Success Criteria

### All Tests Must Pass

✅ 12/12 tests passing
✅ 12+ screenshots captured
✅ Database records created
✅ No console errors
✅ SSE connections established
✅ Cost tracking accurate
✅ Real-time updates working

### Evidence Requirements

- Screenshots show actual UI state
- Database queries return real records
- Console logs show actual values
- No "mocked" or "simulated" in output

## Performance Expectations

- Each test: < 120 seconds
- Total suite: < 10 minutes
- Screenshot generation: < 2 seconds each
- Database queries: < 100ms each

## Continuous Integration

```yaml
# GitHub Actions example
- name: Run Live Activity E2E Tests
  run: |
    npm run dev &
    cd api-server && npm run dev &
    sleep 10
    ./tests/run-live-activity-e2e.sh
```

## Maintenance

### Adding New Tests

1. Add test to `live-activity-enhancement.spec.ts`
2. Follow naming: `Test N: Should verify [feature]`
3. Add screenshot: `NN-feature-name.png`
4. Update this README with test description

### Updating Tests

- Maintain real data approach
- No mocks or simulations
- Always capture screenshots
- Verify database changes
- Log detailed output

## Related Documentation

- [Enhanced Live Activity Spec](../../docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-SPEC.md)
- [Architecture Diagram](../../docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-ARCHITECTURE.md)
- [Pseudocode Reference](../../docs/SPARC-LIVE-ACTIVITY-ENHANCEMENT-PSEUDOCODE.md)

## Support

For issues or questions:
1. Check test output logs
2. Review screenshots
3. Verify database state
4. Check API server logs
5. Review SSE connection status

---

**Last Updated**: 2025-10-26
**Test Suite Version**: 1.0.0
**Total Tests**: 12
**Coverage**: Complete telemetry pipeline
